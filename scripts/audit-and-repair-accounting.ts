import { Prisma } from '../src/generated/client';
import prisma from '../src/app/lib/db';
import {
  evaluatePaymentTasksLinkState,
  extractAccountingDocsFromPaymentTasks,
  extractAccountingDocsFromStepLogs,
  findCompletedAccountingStepLog,
  mergeAccountingTaxDocuments,
  parseAccountingTaxDocuments,
} from '../src/app/lib/accounting-reconciliation';
import { getNextStep, getSteps } from '../src/app/lib/job-workflow';

type RepairRuleCode =
  | 'STUCK_CLOSED_TASKS_MISSING_JOB_CLOSE'
  | 'CLOSED_JOB_STUCK_STEP_OR_MISSING_ACCT_LOG'
  | 'SYNTHETIC_TEST_TASK_ON_CLOSED_PROJECT'
  | 'CONFIRMED_SETTLED_UNVERIFIED_TASK'
  | 'LEGACY_CASH_WORKFLOW_COMPLETED_CLOSE'
  | 'FALSE_PAID_STATUS_RESET'
  | 'SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE';

type WarningCode =
  | 'PROJECT_INSTALLMENT_CONFLICTS'
  | 'ACCT_STEP_DONE_UNVERIFIED_CASH'
  | 'ACCT_STEP_DONE_UNVERIFIED_CREDIT_OR_OTHER'
  | 'MISSING_PAYMENT_TASK_JB'
  | 'MISSING_PAYMENT_TASK_RO';

interface ProposedAction {
  rule: RepairRuleCode;
  jobId: string;
  jobNumber: string;
  customerName: string;
  summary: string;
  apply: () => Promise<void>;
}

interface AuditWarning {
  code: WarningCode;
  jobNumber: string;
  customerName: string;
  paymentMethod: string | null;
  detail: string;
}

function getExpectedBeforeVat(job: {
  accountingVerifiedBeforeVat: number | null;
  project: { amountBeforeVat: Prisma.Decimal | null; projectValue: Prisma.Decimal | null } | null;
  quotation: { actualClosingAmount: number | null; totalAmountBeforeVat: number | null } | null;
}): number | null {
  if (typeof job.accountingVerifiedBeforeVat === 'number' && Number.isFinite(job.accountingVerifiedBeforeVat) && job.accountingVerifiedBeforeVat > 0) {
    return job.accountingVerifiedBeforeVat;
  }
  const projAmt = Number(job.project?.amountBeforeVat ?? job.project?.projectValue ?? 0);
  if (Number.isFinite(projAmt) && projAmt > 0) return projAmt;
  const quotAmt = Number(job.quotation?.actualClosingAmount ?? job.quotation?.totalAmountBeforeVat ?? 0);
  if (Number.isFinite(quotAmt) && quotAmt > 0) return quotAmt;
  return null;
}

function parseProjectInstallmentEntries(project: {
  installmentsData: Prisma.JsonValue | null;
  installment1: Prisma.Decimal | null;
  installment2: Prisma.Decimal | null;
  installment3: Prisma.Decimal | null;
  installment4: Prisma.Decimal | null;
  installment5: Prisma.Decimal | null;
  installment6: Prisma.Decimal | null;
  installment7: Prisma.Decimal | null;
  installment8: Prisma.Decimal | null;
  installment9: Prisma.Decimal | null;
  installment10: Prisma.Decimal | null;
  installment11: Prisma.Decimal | null;
  installment12: Prisma.Decimal | null;
} | null): Array<{ no: number; amount: number }> {
  if (!project) return [];
  const entries: Array<{ no: number; amount: number }> = [];

  if (project.installmentsData && typeof project.installmentsData === 'object' && !Array.isArray(project.installmentsData)) {
    const obj = project.installmentsData as Record<string, unknown>;
    if (obj.hasDeposit && obj.deposit && typeof obj.deposit === 'object' && !Array.isArray(obj.deposit)) {
      const depAmt = Number((obj.deposit as Record<string, unknown>).amount ?? 0);
      if (Number.isFinite(depAmt) && depAmt > 0) {
        entries.push({ no: 0, amount: depAmt });
      }
    }
    if (Array.isArray(obj.installments)) {
      obj.installments.forEach((raw, idx) => {
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const item = raw as Record<string, unknown>;
          const amt = Number(item.amount ?? item.installmentAmount ?? 0);
          const noRaw = Number(item.no ?? item.installmentNo ?? idx + 1);
          if (Number.isFinite(amt) && amt > 0) {
            entries.push({ no: Number.isFinite(noRaw) ? noRaw : idx + 1, amount: amt });
          }
        }
      });
    }
    if (entries.length > 0) return entries;
  }

  if (Array.isArray(project.installmentsData)) {
    project.installmentsData.forEach((raw, idx) => {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        const amt = Number(obj.amount ?? obj.installmentAmount ?? 0);
        const noRaw = Number(obj.installmentNo ?? obj.no ?? idx + 1);
        if (Number.isFinite(amt) && amt > 0) {
          entries.push({ no: Number.isFinite(noRaw) ? noRaw : idx + 1, amount: amt });
        }
      }
    });
    if (entries.length > 0) return entries;
  }

  const decimalFields = [
    project.installment1,
    project.installment2,
    project.installment3,
    project.installment4,
    project.installment5,
    project.installment6,
    project.installment7,
    project.installment8,
    project.installment9,
    project.installment10,
    project.installment11,
    project.installment12,
  ];
  decimalFields.forEach((val, idx) => {
    const amt = Number(val ?? 0);
    if (Number.isFinite(amt) && amt > 0) {
      entries.push({ no: idx + 1, amount: amt });
    }
  });
  return entries;
}

function getLatestPostAccountingTimestamp(
  stepLogs: Array<{ step: string; completedAt: Date }>,
  accountingStepIndex: number,
  steps: Array<{ key: string }>
): Date | null {
  if (accountingStepIndex < 0) return null;
  const postKeys = new Set(steps.slice(accountingStepIndex + 1).map((s) => s.key));
  let latest: Date | null = null;
  for (const log of stepLogs) {
    if (postKeys.has(log.step)) {
      if (!latest || log.completedAt > latest) {
        latest = log.completedAt;
      }
    }
  }
  return latest;
}

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const jobFlag = args.find((a) => a.startsWith('--job='));
  const jobNumberFilter = jobFlag ? jobFlag.slice('--job='.length).trim() : null;

  console.log('===================================================================');
  console.log(`Accounting Audit & Repair Script (${applyMode ? 'APPLY MODE' : 'DRY-RUN MODE'})`);
  if (jobNumberFilter) {
    console.log(`Filter JobNumber: ${jobNumberFilter}`);
  }
  console.log('===================================================================\n');

  const jobs = await prisma.job.findMany({
    where: jobNumberFilter ? { jobNumber: jobNumberFilter } : undefined,
    include: {
      paymentTasks: {
        orderBy: [{ installmentNo: 'asc' }, { createdAt: 'asc' }],
      },
      stepLogs: {
        orderBy: { completedAt: 'asc' },
      },
      project: true,
      quotation: {
        select: {
          actualClosingAmount: true,
          totalAmountBeforeVat: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Loaded ${jobs.length} jobs from database.\n`);

  const proposedActions: ProposedAction[] = [];
  const warnings: AuditWarning[] = [];

  for (const job of jobs) {
    const steps = getSteps(job.jobType, job.flowVariant);
    const accountingStepIdx = steps.findIndex((s) => s.key === 'accounting');
    const stepAfterAccountingKey =
      accountingStepIdx >= 0
        ? getNextStep(job.jobType, 'accounting', job.flowVariant)?.key ?? null
        : null;

    const tasks = job.paymentTasks;
    const stepLogs = job.stepLogs;
    const acctLog = findCompletedAccountingStepLog(stepLogs);
    const existingDocs = parseAccountingTaxDocuments(job.accountingTaxDocuments);
    const taskDocs = extractAccountingDocsFromPaymentTasks(tasks);
    const stepLogDocs = extractAccountingDocsFromStepLogs(stepLogs);
    const allKnownDocs = mergeAccountingTaxDocuments(existingDocs, taskDocs, stepLogDocs);

    if (tasks.length === 0) {
      warnings.push({
        code: job.jobNumber.startsWith('RO') ? 'MISSING_PAYMENT_TASK_RO' : 'MISSING_PAYMENT_TASK_JB',
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        paymentMethod: job.paymentMethod,
        detail: `Job has 0 PaymentTask rows (currentStep=${job.currentStep}, paymentStatus=${job.paymentStatus || 'null'})`,
      });
      continue;
    }

    // Rule C: Synthetic automated test task injected onto an already-closed job/project
    const syntheticTasks = tasks.filter((t) => t.note?.includes('งวดทดสอบระบบอัตโนมัติ'));
    const realTasks = tasks.filter((t) => !t.note?.includes('งวดทดสอบระบบอัตโนมัติ'));
    if (syntheticTasks.length > 0 && realTasks.some((t) => t.status === 'ตรวจสอบและบันทึกแล้ว')) {
      const singleReal = realTasks.length === 1 ? realTasks[0] : null;
      const shouldRestoreSingleReal =
        singleReal !== null &&
        singleReal.installmentNo === 1 &&
        singleReal.installmentTotal === 2 &&
        singleReal.status === 'ตรวจสอบและบันทึกแล้ว';
      const closedAt =
        job.accountingClosedAt ||
        singleReal?.paidDate ||
        acctLog?.completedAt ||
        new Date();
      const closedBy = job.accountingClosedBy || acctLog?.completedBy || 'ฝ่ายบัญชี';

      proposedActions.push({
        rule: 'SYNTHETIC_TEST_TASK_ON_CLOSED_PROJECT',
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        summary: `Delete ${syntheticTasks.length} synthetic task(s) (${syntheticTasks.map((t) => t.id).join(', ')})${
          shouldRestoreSingleReal ? `, restore single task ${singleReal.id} to non-installment` : ''
        }, restore job paymentStatus='paid' & accountingClosedAt=${closedAt.toISOString()}${
          job.project ? ` & clear bogus test installments on ${job.project.projectNumber}` : ''
        }`,
        apply: async () => {
          await prisma.$transaction(async (tx) => {
            await tx.paymentTask.deleteMany({
              where: { id: { in: syntheticTasks.map((t) => t.id) } },
            });
            if (shouldRestoreSingleReal && singleReal) {
              await tx.paymentTask.update({
                where: { id: singleReal.id },
                data: {
                  installmentNo: null,
                  installmentTotal: null,
                  installmentAmount: null,
                },
              });
            }
            const jobUpdate: Prisma.JobUpdateInput = {
              paymentStatus: 'paid',
              accountingClosedAt: closedAt,
              accountingClosedBy: closedBy,
            };
            if (shouldRestoreSingleReal && job.paymentMethod === 'ผ่อนชำระ') {
              jobUpdate.paymentMethod = 'เงินสด';
            }
            if (allKnownDocs.length > 0) {
              jobUpdate.accountingTaxDocuments = allKnownDocs as unknown as Prisma.InputJsonValue;
            }
            await tx.job.update({
              where: { id: job.id },
              data: jobUpdate,
            });
            if (job.project && shouldRestoreSingleReal) {
              await tx.project.update({
                where: { id: job.project.id },
                data: {
                  installmentsData: Prisma.DbNull,
                  installment1: null,
                  installment2: null,
                  installment3: null,
                  installment4: null,
                },
              });
            }
          });
        },
      });
      continue;
    }

    const allTasksVerified = tasks.every((t) => t.status === 'ตรวจสอบและบันทึกแล้ว');

    // Rule A: All PaymentTasks verified, but job.accountingClosedAt is still null
    if (allTasksVerified && !job.accountingClosedAt) {
      const latestPaidDate = tasks.reduce<Date | null>((acc, t) => {
        if (t.paidDate && (!acc || t.paidDate > acc)) return t.paidDate;
        return acc;
      }, null);
      const latestInvoiceDate = tasks.reduce<Date | null>((acc, t) => {
        if (t.invoiceDate && (!acc || t.invoiceDate > acc)) return t.invoiceDate;
        return acc;
      }, null);
      const postAcctTime = getLatestPostAccountingTimestamp(stepLogs, accountingStepIdx, steps);
      const closedAt =
        latestPaidDate ||
        acctLog?.completedAt ||
        postAcctTime ||
        latestInvoiceDate ||
        new Date();
      const closedBy = job.accountingClosedBy || acctLog?.completedBy || 'ฝ่ายบัญชี (Auto-Repair)';
      const singleTaskNeedsInv =
        tasks.length === 1 && !tasks[0].invoiceNumber?.trim() && allKnownDocs.length > 0
          ? allKnownDocs[0]
          : null;
      const tasksNeedingPaidDate = tasks.filter((t) => !t.paidDate);
      const needsStepLog = accountingStepIdx >= 0 && !acctLog;
      const needsStepAdvance =
        job.currentStep === 'accounting' &&
        stepAfterAccountingKey !== null &&
        stepAfterAccountingKey !== 'accounting';
      const docSummaryNote =
        allKnownDocs.map((d) => d.docNumber).filter(Boolean).join(', ') ||
        'ปิดจบงานบัญชี (ซ่อมข้อมูลจากรายการชำระครบ)';

      proposedActions.push({
        rule: 'STUCK_CLOSED_TASKS_MISSING_JOB_CLOSE',
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        summary: `Set accountingClosedAt=${closedAt.toISOString()}, paymentStatus='paid'${
          needsStepAdvance ? `, currentStep '${job.currentStep}' -> '${stepAfterAccountingKey}'` : ''
        }${needsStepLog ? `, create missing accounting JobStepLog` : ''}${
          singleTaskNeedsInv ? `, fill task invoiceNumber='${singleTaskNeedsInv.docNumber}'` : ''
        }`,
        apply: async () => {
          await prisma.$transaction(async (tx) => {
            if (singleTaskNeedsInv) {
              await tx.paymentTask.update({
                where: { id: tasks[0].id },
                data: {
                  invoiceNumber: singleTaskNeedsInv.docNumber,
                  invoiceDate:
                    tasks[0].invoiceDate ||
                    (singleTaskNeedsInv.docDate ? new Date(singleTaskNeedsInv.docDate) : undefined),
                },
              });
            }
            for (const pt of tasksNeedingPaidDate) {
              await tx.paymentTask.update({
                where: { id: pt.id },
                data: { paidDate: pt.invoiceDate || closedAt },
              });
            }
            if (needsStepLog) {
              await tx.jobStepLog.create({
                data: {
                  jobId: job.id,
                  step: 'accounting',
                  completedBy: closedBy,
                  department: 'บัญชี',
                  completedAt: closedAt,
                  note: docSummaryNote,
                },
              });
            }
            const jobUpdate: Prisma.JobUpdateInput = {
              paymentStatus: 'paid',
              accountingClosedAt: closedAt,
              accountingClosedBy: closedBy,
            };
            if (needsStepAdvance && stepAfterAccountingKey) {
              jobUpdate.currentStep = stepAfterAccountingKey;
            }
            if (allKnownDocs.length > existingDocs.length && allKnownDocs.length > 0) {
              jobUpdate.accountingTaxDocuments = allKnownDocs as unknown as Prisma.InputJsonValue;
            }
            await tx.job.update({
              where: { id: job.id },
              data: jobUpdate,
            });
          });
        },
      });
      continue;
    }

    // Rule B: accountingClosedAt already set & all tasks verified, yet currentStep stuck at 'accounting' (when next step exists) or missing accounting JobStepLog or paymentStatus !== 'paid'
    if (job.accountingClosedAt && allTasksVerified) {
      const needsStepLog = accountingStepIdx >= 0 && !acctLog;
      const needsStepAdvance =
        job.currentStep === 'accounting' &&
        stepAfterAccountingKey !== null &&
        stepAfterAccountingKey !== 'accounting';
      const needsPaidStatus = job.paymentStatus !== 'paid';

      if (needsStepLog || needsStepAdvance || needsPaidStatus) {
        const closedAt = job.accountingClosedAt;
        const closedBy = job.accountingClosedBy || acctLog?.completedBy || 'ฝ่ายบัญชี (Backfill)';
        const docSummaryNote =
          allKnownDocs.map((d) => d.docNumber).filter(Boolean).join(', ') ||
          'ยืนยันปิดขั้นตอนบัญชีครบถ้วน (Backfill Log)';

        proposedActions.push({
          rule: 'CLOSED_JOB_STUCK_STEP_OR_MISSING_ACCT_LOG',
          jobId: job.id,
          jobNumber: job.jobNumber,
          customerName: job.customerName,
          summary: [
            needsStepAdvance ? `currentStep '${job.currentStep}' -> '${stepAfterAccountingKey}'` : null,
            needsStepLog ? `create missing accounting JobStepLog` : null,
            needsPaidStatus ? `paymentStatus '${job.paymentStatus}' -> 'paid'` : null,
          ]
            .filter(Boolean)
            .join(', '),
          apply: async () => {
            await prisma.$transaction(async (tx) => {
              if (needsStepLog) {
                await tx.jobStepLog.create({
                  data: {
                    jobId: job.id,
                    step: 'accounting',
                    completedBy: closedBy,
                    department: 'บัญชี',
                    completedAt: closedAt,
                    note: docSummaryNote,
                  },
                });
              }
              const jobUpdate: Prisma.JobUpdateInput = {};
              if (needsStepAdvance && stepAfterAccountingKey) {
                jobUpdate.currentStep = stepAfterAccountingKey;
              }
              if (needsPaidStatus) jobUpdate.paymentStatus = 'paid';
              if (allKnownDocs.length > existingDocs.length && allKnownDocs.length > 0) {
                jobUpdate.accountingTaxDocuments = allKnownDocs as unknown as Prisma.InputJsonValue;
              }
              if (Object.keys(jobUpdate).length > 0) {
                await tx.job.update({
                  where: { id: job.id },
                  data: jobUpdate,
                });
              }
            });
          },
        });
        continue;
      }
    }

    // Rule D1: Single-task job with accounting JobStepLog + delivery/completion evidence, where paymentMethod='จ่ายแล้ว' OR 100% deposit paid
    const postAcctTime = getLatestPostAccountingTimestamp(stepLogs, accountingStepIdx, steps);
    const hasPostAcctEvidence =
      Boolean(postAcctTime) ||
      Boolean(job.deliveryDate) ||
      (accountingStepIdx >= 0 && job.currentStep === 'complete');
    const expectedAmount = getExpectedBeforeVat(job);
    const singleTask = tasks.length === 1 ? tasks[0] : null;
    const isAlreadyPrepaidMethod = job.paymentMethod?.trim() === 'จ่ายแล้ว';
    const isFullCashDepositPaid =
      singleTask !== null &&
      expectedAmount !== null &&
      expectedAmount > 0 &&
      Number(singleTask.paidAmount || 0) + 0.01 >= expectedAmount &&
      Boolean(job.paymentMethod?.includes('เงินสด')) &&
      hasPostAcctEvidence;

    if (
      singleTask &&
      singleTask.status !== 'ตรวจสอบและบันทึกแล้ว' &&
      acctLog &&
      hasPostAcctEvidence &&
      (isAlreadyPrepaidMethod || isFullCashDepositPaid)
    ) {
      const closedAt = singleTask.paidDate || acctLog.completedAt;
      const closedBy = job.accountingClosedBy || acctLog.completedBy || 'ฝ่ายบัญชี';
      const firstDoc = allKnownDocs[0] || null;
      const needsStepAdvance =
        job.currentStep === 'accounting' &&
        stepAfterAccountingKey !== null &&
        stepAfterAccountingKey !== 'accounting';

      proposedActions.push({
        rule: 'CONFIRMED_SETTLED_UNVERIFIED_TASK',
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        summary: `Verify single task ${singleTask.id} ('${singleTask.status}' -> 'ตรวจสอบและบันทึกแล้ว', method='${job.paymentMethod}')${
          firstDoc && !singleTask.invoiceNumber ? `, invoiceNumber='${firstDoc.docNumber}'` : ''
        }, set accountingClosedAt=${closedAt.toISOString()} & paymentStatus='paid'${
          needsStepAdvance ? `, currentStep -> '${stepAfterAccountingKey}'` : ''
        }`,
        apply: async () => {
          await prisma.$transaction(async (tx) => {
            await tx.paymentTask.update({
              where: { id: singleTask.id },
              data: {
                status: 'ตรวจสอบและบันทึกแล้ว',
                paidDate: singleTask.paidDate || closedAt,
                invoiceNumber: singleTask.invoiceNumber?.trim() || firstDoc?.docNumber || undefined,
                invoiceDate:
                  singleTask.invoiceDate ||
                  (firstDoc?.docDate ? new Date(firstDoc.docDate) : undefined),
              },
            });
            const jobUpdate: Prisma.JobUpdateInput = {
              paymentStatus: 'paid',
              accountingClosedAt: closedAt,
              accountingClosedBy: closedBy,
            };
            if (needsStepAdvance && stepAfterAccountingKey) {
              jobUpdate.currentStep = stepAfterAccountingKey;
            }
            if (allKnownDocs.length > 0) {
              jobUpdate.accountingTaxDocuments = allKnownDocs as unknown as Prisma.InputJsonValue;
            }
            await tx.job.update({
              where: { id: job.id },
              data: jobUpdate,
            });
          });
        },
      });
      continue;
    }

    // Rule D1-B: Legacy completed Cash ('เงินสด') jobs before 2026-11-26 that finished accounting stepLog + final workflow step (confirmed paid by Accounting)
    const legacyCashCutoff = new Date('2026-11-26T00:00:00.000Z');
    const lastStepKey = steps[steps.length - 1]?.key;
    const isWorkflowCompleted =
      job.currentStep === 'complete' ||
      (Boolean(lastStepKey) &&
        job.currentStep === lastStepKey &&
        stepLogs.some((l) => l.step === lastStepKey));

    if (
      singleTask &&
      singleTask.status !== 'ตรวจสอบและบันทึกแล้ว' &&
      acctLog &&
      acctLog.completedAt < legacyCashCutoff &&
      job.paymentMethod?.trim() === 'เงินสด' &&
      isWorkflowCompleted
    ) {
      const closedAt = singleTask.paidDate || acctLog.completedAt;
      const closedBy = job.accountingClosedBy || acctLog.completedBy || 'ฝ่ายบัญชี';
      const firstDoc = allKnownDocs[0] || null;
      const joinedInv = allKnownDocs.map((d) => d.docNumber).filter(Boolean).join(', ');

      proposedActions.push({
        rule: 'LEGACY_CASH_WORKFLOW_COMPLETED_CLOSE',
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        summary: `Close legacy completed cash task ${singleTask.id} ('${singleTask.status}' -> 'ตรวจสอบและบันทึกแล้ว'${
          joinedInv ? `, docs='${joinedInv}'` : ''
        }), set accountingClosedAt=${closedAt.toISOString()} & paymentStatus='paid'`,
        apply: async () => {
          await prisma.$transaction(async (tx) => {
            await tx.paymentTask.update({
              where: { id: singleTask.id },
              data: {
                status: 'ตรวจสอบและบันทึกแล้ว',
                paidDate: singleTask.paidDate || closedAt,
                invoiceNumber: singleTask.invoiceNumber?.trim() || joinedInv || undefined,
                invoiceDate:
                  singleTask.invoiceDate ||
                  (firstDoc?.docDate ? new Date(firstDoc.docDate) : undefined),
              },
            });
            const jobUpdate: Prisma.JobUpdateInput = {
              paymentStatus: 'paid',
              accountingClosedAt: closedAt,
              accountingClosedBy: closedBy,
            };
            if (allKnownDocs.length > existingDocs.length && allKnownDocs.length > 0) {
              jobUpdate.accountingTaxDocuments = allKnownDocs as unknown as Prisma.InputJsonValue;
            }
            await tx.job.update({
              where: { id: job.id },
              data: jobUpdate,
            });
          });
        },
      });
      continue;
    }

    // Rule D2: Job marked paymentStatus='paid' or accountingClosedAt!=null even though tasks remain unverified
    if (!allTasksVerified && (job.paymentStatus === 'paid' || job.accountingClosedAt !== null)) {
      const hasAnyDeposit = tasks.some(
        (t) => t.status === 'ชำระมัดจำแล้ว' || Number(t.paidAmount || 0) > 0
      );
      const resetPaymentStatus = hasAnyDeposit ? 'deposit_paid' : 'pending';
      proposedActions.push({
        rule: 'FALSE_PAID_STATUS_RESET',
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        summary: `Reset inconsistent job paymentStatus '${job.paymentStatus}' -> '${resetPaymentStatus}'${
          job.accountingClosedAt ? ' & clear premature accountingClosedAt' : ''
        } (tasks still unverified: ${tasks.map((t) => `${t.installmentNo ?? 'single'}:${t.status}`).join(', ')})`,
        apply: async () => {
          await prisma.$transaction(async (tx) => {
            await tx.job.update({
              where: { id: job.id },
              data: {
                paymentStatus: resetPaymentStatus,
                accountingClosedAt: null,
                accountingClosedBy: null,
              },
            });
          });
        },
      });
    }

    // Rule E: Non-destructive sync of invoice/receipt numbers from accounting JobStepLog or verified tasks into job.accountingTaxDocuments & empty single PaymentTask.invoiceNumber
    const missingDocInJob = allKnownDocs.length > existingDocs.length;
    const missingInvInSingleTask =
      tasks.length === 1 && !tasks[0].invoiceNumber?.trim() && allKnownDocs.length > 0;
    if (missingDocInJob || missingInvInSingleTask) {
      const firstDoc = allKnownDocs[0];
      const joinedInv = allKnownDocs.map((d) => d.docNumber).join(', ');
      proposedActions.push({
        rule: 'SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE',
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        summary: [
          missingDocInJob
            ? `accountingTaxDocuments (${existingDocs.length} -> ${allKnownDocs.length}: ${joinedInv})`
            : null,
          missingInvInSingleTask ? `single task invoiceNumber='${joinedInv}'` : null,
        ]
          .filter(Boolean)
          .join(' + '),
        apply: async () => {
          await prisma.$transaction(async (tx) => {
            if (missingInvInSingleTask && firstDoc) {
              await tx.paymentTask.update({
                where: { id: tasks[0].id },
                data: {
                  invoiceNumber: joinedInv,
                  invoiceDate:
                    tasks[0].invoiceDate ||
                    (firstDoc.docDate ? new Date(firstDoc.docDate) : undefined),
                },
              });
            }
            if (missingDocInJob && allKnownDocs.length > 0) {
              await tx.job.update({
                where: { id: job.id },
                data: {
                  accountingTaxDocuments: allKnownDocs as unknown as Prisma.InputJsonValue,
                },
              });
            }
          });
        },
      });
    }

    // Audit Warning 1: Project installments vs Job PaymentTasks mismatch
    if (job.project) {
      const projEntries = parseProjectInstallmentEntries(job.project);
      if (projEntries.length > 0) {
        const projTotal = projEntries.reduce((s, e) => s + e.amount, 0);
        const taskInstTotal = tasks.reduce((s, t) => s + Number(t.installmentAmount || 0), 0);
        const countMismatch = projEntries.length !== tasks.length;
        const amountMismatch = tasks.length > 1 && Math.abs(projTotal - taskInstTotal) > 1;
        if (countMismatch || amountMismatch) {
          warnings.push({
            code: 'PROJECT_INSTALLMENT_CONFLICTS',
            jobNumber: job.jobNumber,
            customerName: job.customerName,
            paymentMethod: job.paymentMethod,
            detail: `${job.project.projectNumber}: Project defines ${projEntries.length} inst(s) totaling ${projTotal.toFixed(2)}, while Job has ${tasks.length} task(s) (verified=${tasks.filter((t) => t.status === 'ตรวจสอบและบันทึกแล้ว').length}) totaling ${taskInstTotal.toFixed(2)}`,
          });
        }
      }
    }

    // Audit Warning 2: accounting JobStepLog done while PaymentTask(s) still unverified (non-D1 cases)
    if (acctLog && !allTasksVerified) {
      const linkState = evaluatePaymentTasksLinkState({
        paymentTasks: tasks,
        paymentMethod: job.paymentMethod,
        creditTerms: job.creditTerms,
      });
      const isCashLike =
        Boolean(job.paymentMethod?.includes('เงินสด')) ||
        job.paymentMethod?.trim() === 'จ่ายแล้ว' ||
        job.paymentMethod?.includes('เก็บเงินหน้างาน');

      warnings.push({
        code: isCashLike
          ? 'ACCT_STEP_DONE_UNVERIFIED_CASH'
          : 'ACCT_STEP_DONE_UNVERIFIED_CREDIT_OR_OTHER',
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        paymentMethod: job.paymentMethod,
        detail: `currentStep=${job.currentStep}, acctLog=${acctLog.completedAt.toISOString().slice(0, 10)} (${acctLog.note || '-'}), tasks=${linkState.settledTasks}/${linkState.totalTasks} settled, docs=[${allKnownDocs.map((d) => d.docNumber).join(', ') || '-'}]`,
      });
    }
  }

  // Print Summary by Repair Rule
  const countsByRule = proposedActions.reduce<Record<string, number>>((acc, act) => {
    acc[act.rule] = (acc[act.rule] || 0) + 1;
    return acc;
  }, {});

  console.log('--- PROPOSED REPAIRS SUMMARY ---');
  if (proposedActions.length === 0) {
    console.log('No deterministic repairs needed.');
  } else {
    for (const [rule, count] of Object.entries(countsByRule)) {
      console.log(`  ${rule}: ${count}`);
    }
    console.log('');
    for (const act of proposedActions) {
      if (act.rule === 'SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE' && !jobNumberFilter && !applyMode) {
        continue;
      }
      console.log(`[${act.rule}] ${act.jobNumber} (${act.customerName}): ${act.summary}`);
    }
    if ((countsByRule.SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE || 0) > 0 && !jobNumberFilter && !applyMode) {
      const sampleDocs = proposedActions
        .filter((a) => a.rule === 'SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE')
        .slice(0, 12);
      console.log(`\nSample SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE (${countsByRule.SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE} total):`);
      for (const act of sampleDocs) {
        console.log(`  [${act.rule}] ${act.jobNumber} (${act.customerName}): ${act.summary}`);
      }
    }
  }

  if (applyMode && proposedActions.length > 0) {
    console.log('\n--- APPLYING REPAIRS TO DATABASE ---');
    let applied = 0;
    let failed = 0;
    for (const act of proposedActions) {
      try {
        await act.apply();
        applied++;
        if (act.rule !== 'SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE' || jobNumberFilter) {
          console.log(`[APPLIED] ${act.jobNumber} (${act.rule})`);
        }
      } catch (err) {
        failed++;
        console.error(`[FAILED]  ${act.jobNumber} (${act.rule}):`, err);
      }
    }
    console.log(`\nRepair execution finished: ${applied} applied (${countsByRule.SYNC_TAX_DOCUMENTS_NON_DESTRUCTIVE || 0} non-destructive doc syncs), ${failed} failed.`);
  }

  // Print Warnings (Audit Only)
  const warningsByCode = warnings.reduce<Record<string, AuditWarning[]>>((acc, w) => {
    if (!acc[w.code]) acc[w.code] = [];
    acc[w.code].push(w);
    return acc;
  }, {});

  console.log('\n--- AUDIT WARNINGS (MANUAL REVIEW ONLY - NOT AUTO-MODIFIED) ---');
  for (const [code, list] of Object.entries(warningsByCode)) {
    console.log(`\n[${code}] (${list.length} cases):`);
    const previewLimit = code === 'MISSING_PAYMENT_TASK_RO' ? 10 : 50;
    list.slice(0, previewLimit).forEach((w) => {
      console.log(`  - ${w.jobNumber} | ${w.paymentMethod || 'null'} | ${w.customerName} | ${w.detail}`);
    });
    if (list.length > previewLimit) {
      console.log(`  ... and ${list.length - previewLimit} more`);
    }
  }

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Fatal error running audit script:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
