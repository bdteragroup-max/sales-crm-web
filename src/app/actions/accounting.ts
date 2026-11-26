"use server";
import type { Prisma } from "@/generated/client";
import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { getNextPendingScheduleTask } from "@/app/lib/accounting-schedule";
import {
  AccountingTaxDocument,
  evaluateAccountingAmountReconciliation,
  evaluatePaymentTasksLinkState,
  extractAccountingDocsFromPaymentTasks,
  extractAccountingDocsFromStepLogs,
  findCompletedAccountingStepLog,
  mergeAccountingTaxDocuments,
  parseAccountingTaxDocuments,
} from "@/app/lib/accounting-reconciliation";
import { hasAccountingInvoiceOrPayment } from "@/app/lib/accounting-schedule";
import { getNextStep } from "@/app/lib/job-workflow";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle when called outside Next.js request context
  }
}

export type SyncFinancialAdjustmentsOptions = {
  /** Only true when Accounting explicitly adds/deletes a schedule item or reverts a task out of verified status */
  allowReopenAccounting?: boolean;
  /** Only true when Accounting explicitly adds/edits/deletes payment schedule rounds (never overwrite Project on routine receipt confirmations) */
  syncProjectSchedule?: boolean;
};

export async function syncFinancialAdjustments(
  jobId: string,
  opts?: SyncFinancialAdjustmentsOptions
) {
  try {
    // 1. Fetch all PaymentTasks for this job
    const rawTasks = await prisma.paymentTask.findMany({
      where: { jobId },
      orderBy: [
        { installmentNo: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (rawTasks.length === 0) return;

    // Sort in JS so settled/invoiced tasks without installmentNo never sort behind newly added rounds (SQL puts NULL last in ASC)
    const allTasks = [...rawTasks].sort((a, b) => {
      const aNo = a.installmentNo ?? (hasAccountingInvoiceOrPayment(a) ? 0.5 : Number.MAX_SAFE_INTEGER);
      const bNo = b.installmentNo ?? (hasAccountingInvoiceOrPayment(b) ? 0.5 : Number.MAX_SAFE_INTEGER);
      if (aNo !== bNo) return aNo - bNo;
      const aDue = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // 2. Identify deposit task vs progress tasks
    const depositTask = allTasks.find(t => t.installmentNo === 0 || t.creditType === 'DEPOSIT');
    const progressTasks = allTasks.filter(t => t.id !== depositTask?.id);

    const hasStructuredSchedule =
      Boolean(depositTask) ||
      progressTasks.length > 1 ||
      progressTasks.some(
        (t) =>
          (t.installmentAmount !== null && Number(t.installmentAmount) > 0) ||
          t.creditType === 'DELIVERY' ||
          (t.installmentNo !== null && t.installmentNo > 1)
      );

    const totalProgressCount = progressTasks.length;

    // 3. Update deposit task metadata if needed
    if (depositTask) {
      if (
        depositTask.installmentNo !== 0 ||
        depositTask.installmentTotal !== totalProgressCount ||
        !depositTask.creditType
      ) {
        await prisma.paymentTask.update({
          where: { id: depositTask.id },
          data: {
            installmentNo: 0,
            installmentTotal: totalProgressCount,
            creditType: depositTask.creditType || 'DEPOSIT',
          }
        });
      }
    }

    // 4. Re-sequence progress tasks (1..N) ONLY when explicitly managing schedule OR filling missing metadata without demoting settled tasks
    if (hasStructuredSchedule) {
      for (let i = 0; i < progressTasks.length; i++) {
        const task = progressTasks[i];
        const targetNo =
          opts?.syncProjectSchedule || task.installmentNo === null || task.installmentNo === undefined
            ? i + 1
            : task.installmentNo;
        const needsUpdate =
          task.installmentNo !== targetNo ||
          task.installmentTotal !== totalProgressCount ||
          task.creditType === null;
        if (needsUpdate) {
          await prisma.paymentTask.update({
            where: { id: task.id },
            data: {
              installmentNo: targetNo,
              installmentTotal: totalProgressCount,
              ...(task.creditType === null ? { creditType: 'PROGRESS' } : {}),
            }
          });
        }
      }
    }

    // 5. Update Job payment status, payment method, and next due date
    const updatedTasks = await prisma.paymentTask.findMany({
      where: { jobId },
      orderBy: [{ installmentNo: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }]
    });

    const allCompleted = updatedTasks.length > 0 && updatedTasks.every(t => t.status === 'ตรวจสอบและบันทึกแล้ว');
    const hasAnyPaid = updatedTasks.some(t => (t.paidAmount && t.paidAmount > 0) || t.status === 'ชำระมัดจำแล้ว' || t.status === 'ตรวจสอบและบันทึกแล้ว');
    const nextPendingTask = getNextPendingScheduleTask(updatedTasks, { requireDueDate: true });

    const existingJobMeta = await prisma.job.findUnique({
      where: { id: jobId },
      select: { accountingClosedAt: true },
    });

    const jobUpdateData: any = {
      paymentStatus: allCompleted ? 'paid' : (hasAnyPaid ? 'partial' : 'unpaid'),
    };
    if (opts?.allowReopenAccounting && !allCompleted && existingJobMeta?.accountingClosedAt) {
      jobUpdateData.accountingClosedAt = null;
      jobUpdateData.accountingClosedBy = null;
    }
    if (progressTasks.length > 1 || (depositTask && progressTasks.length > 0) || (hasStructuredSchedule && progressTasks.length === 1 && progressTasks[0]?.installmentAmount)) {
      jobUpdateData.paymentMethod = 'ผ่อนชำระ';
    }
    if (nextPendingTask?.dueDate) {
      jobUpdateData.paymentDate = nextPendingTask.dueDate;
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: jobUpdateData
    });

    // GATE AT EARNING: Award gold coins ONLY when accounting has verified all installments as 'ตรวจสอบและบันทึกแล้ว'
    if (allCompleted && job.quotationId) {
      try {
        const { awardGoldOnDealClosed } = await import('@/app/actions/coins');
        const awardResult = await awardGoldOnDealClosed(job.quotationId);
        if (awardResult.success && 'awardedGold' in awardResult && awardResult.awardedGold > 0) {
          console.log(`[Accounting] Successfully awarded ${awardResult.awardedGold} gold coins for quotation ${job.quotationId} upon full payment verification.`);
        }
      } catch (coinErr) {
        console.error("Coin award error on financial sync:", coinErr);
      }
    }

    // 6. Sync structured schedule back to linked Project ONLY when Accounting edited the schedule
    if (opts?.syncProjectSchedule && hasStructuredSchedule) {
      const linkedProject = await prisma.project.findFirst({
        where: { jobId }
      });

      if (linkedProject) {
        const installmentsData: any = {
          hasDeposit: !!depositTask,
          deposit: depositTask ? {
            amount: Number(depositTask.installmentAmount || depositTask.paidAmount || 0),
            dueDate: depositTask.dueDate ? depositTask.dueDate.toISOString() : undefined,
            title: depositTask.note || "เงินมัดจำเมื่อเซ็นสัญญา",
          } : null,
          installments: progressTasks.map((t, idx) => ({
            no: idx + 1,
            title: t.note || `งวดที่ ${idx + 1}`,
            amount: Number(t.installmentAmount || t.paidAmount || 0),
            dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
          }))
        };

        const projectUpdateData: any = {
          installmentsData,
          firstPayment: depositTask ? Number(depositTask.installmentAmount || depositTask.paidAmount || 0) : null,
          depositCollectionSchedule: depositTask?.dueDate || null,
        };

        for (let i = 1; i <= 12; i++) {
          const pTask = progressTasks[i - 1];
          projectUpdateData[`installment${i}`] = pTask ? Number(pTask.installmentAmount || pTask.paidAmount || 0) : null;
        }

        await prisma.project.update({
          where: { id: linkedProject.id },
          data: projectUpdateData
        });

        safeRevalidatePath('/projects');
        safeRevalidatePath(`/projects/${linkedProject.id}`);
        safeRevalidatePath('/projects/dashboard');
      }
    }

    safeRevalidatePath('/accounting');
    safeRevalidatePath('/accounting/dashboard');
    safeRevalidatePath('/jobs');
  } catch (err) {
    console.error("Error syncing financial adjustments:", err);
    throw err;
  }
}

export type SavePaymentScheduleItemInput = {
  id?: string;
  jobId: string;
  type: 'DEPOSIT' | 'PROGRESS' | 'DELIVERY';
  installmentNo?: number;
  installmentAmount: number;
  dueDate?: string | Date | null;
  note?: string;
  creditType?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | Date | null;
};

export async function savePaymentScheduleItem(input: SavePaymentScheduleItemInput) {
  const { id, jobId, type, installmentNo, installmentAmount, dueDate, note, creditType, invoiceNumber, invoiceDate } = input;

  let parsedDueDate = dueDate ? new Date(dueDate) : null;
  if (parsedDueDate && !isNaN(parsedDueDate.getTime()) && parsedDueDate.getFullYear() >= 2500) {
    parsedDueDate.setFullYear(parsedDueDate.getFullYear() - 543);
  }
  let parsedInvoiceDate = invoiceDate ? new Date(invoiceDate) : null;
  if (parsedInvoiceDate && !isNaN(parsedInvoiceDate.getTime()) && parsedInvoiceDate.getFullYear() >= 2500) {
    parsedInvoiceDate.setFullYear(parsedInvoiceDate.getFullYear() - 543);
  }
  const numAmount = Number(installmentAmount) || 0;

  if (id) {
    // Edit existing task
    const existing = await prisma.paymentTask.findUnique({
      where: { id }
    });
    if (!existing) throw new Error("ไม่พบงวดชำระที่ต้องการแก้ไข");

    await prisma.paymentTask.update({
      where: { id },
      data: {
        installmentAmount: numAmount,
        dueDate: parsedDueDate,
        note: note !== undefined ? note : existing.note,
        creditType: creditType !== undefined ? creditType : (type === 'DEPOSIT' ? 'DEPOSIT' : type === 'DELIVERY' ? 'DELIVERY' : existing.creditType || 'PROGRESS'),
        installmentNo: type === 'DEPOSIT' ? 0 : (installmentNo !== undefined ? Number(installmentNo) : existing.installmentNo),
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber ? invoiceNumber.trim() : null) : existing.invoiceNumber,
        invoiceDate: invoiceDate !== undefined ? parsedInvoiceDate : existing.invoiceDate,
      }
    });
  } else {
    // Check if the job currently has only 1 untouched legacy placeholder PaymentTask
    // so adding the first payment/delivery round converts it cleanly instead of leaving a ghost ฿0.00 row
    const currentTasks = await prisma.paymentTask.findMany({ where: { jobId } });
    const untouchedPlaceholder =
      currentTasks.length === 1 &&
      currentTasks[0].installmentNo === null &&
      (!currentTasks[0].installmentAmount || Number(currentTasks[0].installmentAmount) === 0) &&
      (!currentTasks[0].paidAmount || Number(currentTasks[0].paidAmount) === 0) &&
      currentTasks[0].status === 'รอดำเนินการ' &&
      !currentTasks[0].invoiceNumber &&
      !currentTasks[0].note &&
      currentTasks[0].creditType !== 'DEPOSIT' &&
      currentTasks[0].creditType !== 'DELIVERY'
        ? currentTasks[0]
        : null;

    // Add new task
    if (type === 'DEPOSIT') {
      const existingDeposit = await prisma.paymentTask.findFirst({
        where: {
          jobId,
          OR: [
            { installmentNo: 0 },
            { creditType: 'DEPOSIT' }
          ]
        }
      });

      const targetDepositId = existingDeposit?.id || untouchedPlaceholder?.id;
      if (targetDepositId) {
        await prisma.paymentTask.update({
          where: { id: targetDepositId },
          data: {
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || existingDeposit?.note || "เงินมัดจำเมื่อเซ็นสัญญา",
            creditType: creditType || 'DEPOSIT',
            installmentNo: 0,
            invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber ? invoiceNumber.trim() : null) : (existingDeposit?.invoiceNumber || null),
            invoiceDate: invoiceDate !== undefined ? parsedInvoiceDate : (existingDeposit?.invoiceDate || null),
          }
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: 'รอดำเนินการ',
            installmentNo: 0,
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || "เงินมัดจำเมื่อเซ็นสัญญา",
            creditType: creditType || 'DEPOSIT',
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            invoiceDate: parsedInvoiceDate,
          }
        });
      }
    } else if (type === 'DELIVERY') {
      let nextNo = installmentNo;
      if (!nextNo) {
        const maxTask = await prisma.paymentTask.findFirst({
          where: { jobId, installmentNo: { gt: 0 } },
          orderBy: { installmentNo: 'desc' }
        });
        nextNo = (maxTask?.installmentNo || 0) + 1;
      }

      if (untouchedPlaceholder) {
        await prisma.paymentTask.update({
          where: { id: untouchedPlaceholder.id },
          data: {
            status: 'รอดำเนินการ',
            installmentNo: Number(nextNo),
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || `ส่งมอบสินค้า รอบที่ ${nextNo}`,
            creditType: creditType || 'DELIVERY',
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            invoiceDate: parsedInvoiceDate,
          }
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: 'รอดำเนินการ',
            installmentNo: Number(nextNo),
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || `ส่งมอบสินค้า รอบที่ ${nextNo}`,
            creditType: creditType || 'DELIVERY',
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            invoiceDate: parsedInvoiceDate,
          }
        });
      }
    } else {
      let nextNo = installmentNo;
      if (!nextNo) {
        const maxTask = await prisma.paymentTask.findFirst({
          where: { jobId, installmentNo: { gt: 0 } },
          orderBy: { installmentNo: 'desc' }
        });
        nextNo = (maxTask?.installmentNo || 0) + 1;
      }

      if (untouchedPlaceholder) {
        await prisma.paymentTask.update({
          where: { id: untouchedPlaceholder.id },
          data: {
            status: 'รอดำเนินการ',
            installmentNo: Number(nextNo),
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || `งวดที่ ${nextNo}`,
            creditType: creditType || 'PROGRESS',
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            invoiceDate: parsedInvoiceDate,
          }
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: 'รอดำเนินการ',
            installmentNo: Number(nextNo),
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || `งวดที่ ${nextNo}`,
            creditType: creditType || 'PROGRESS',
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            invoiceDate: parsedInvoiceDate,
          }
        });
      }
    }
  }

  // Synchronize database across all tasks, job, and linked project
  await syncFinancialAdjustments(jobId, {
    allowReopenAccounting: true,
    syncProjectSchedule: true,
  });

  const [updatedTasks, jobMeta] = await Promise.all([
    prisma.paymentTask.findMany({
      where: { jobId },
      orderBy: [
        { installmentNo: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ]
    }),
    prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        currentStep: true,
        paymentStatus: true,
        paymentMethod: true,
        accountingClosedAt: true,
        accountingClosedBy: true,
      }
    }),
  ]);

  return { success: true, job: jobMeta, paymentTasks: updatedTasks };
}

export async function deletePaymentScheduleItem(taskId: string) {
  const task = await prisma.paymentTask.findUnique({
    where: { id: taskId }
  });
  if (!task) throw new Error("ไม่พบงวดชำระที่ต้องการลบ");

  if ((task.paidAmount && task.paidAmount > 0) || task.status === 'ตรวจสอบและบันทึกแล้ว') {
    throw new Error("ไม่สามารถลบงวดชำระที่ได้มีการบันทึกการชำระเงินหรือตรวจสอบแล้ว");
  }

  const jobId = task.jobId;
  const remainingCount = await prisma.paymentTask.count({
    where: { jobId, id: { not: taskId } }
  });

  if (remainingCount === 0) {
    // Never leave a job with 0 PaymentTasks (otherwise the entire job vanishes from /accounting!)
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { deliveryDate: true, createdAt: true }
    });
    await prisma.paymentTask.update({
      where: { id: taskId },
      data: {
        status: 'รอดำเนินการ',
        installmentNo: null,
        installmentTotal: null,
        installmentAmount: null,
        creditType: null,
        note: null,
        invoiceNumber: null,
        invoiceDate: null,
        dueDate: job?.deliveryDate || job?.createdAt || new Date(),
      }
    });

    const linkedProject = await prisma.project.findFirst({ where: { jobId }, select: { id: true } });
    if (linkedProject) {
      const clearData: any = {
        installmentsData: { hasDeposit: false, deposit: null, installments: [] },
        firstPayment: null,
        depositCollectionSchedule: null,
      };
      for (let i = 1; i <= 12; i++) clearData[`installment${i}`] = null;
      await prisma.project.update({ where: { id: linkedProject.id }, data: clearData });
    }
  } else {
    await prisma.paymentTask.delete({
      where: { id: taskId }
    });
  }

  // Re-sync all remaining tasks, job, and project
  await syncFinancialAdjustments(jobId, {
    allowReopenAccounting: true,
    syncProjectSchedule: true,
  });

  const [updatedTasks, jobMeta] = await Promise.all([
    prisma.paymentTask.findMany({
      where: { jobId },
      orderBy: [
        { installmentNo: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ]
    }),
    prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        currentStep: true,
        paymentStatus: true,
        paymentMethod: true,
        accountingClosedAt: true,
        accountingClosedBy: true,
      }
    }),
  ]);

  return { success: true, job: jobMeta, paymentTasks: updatedTasks };
}

async function reconcileAndCloseJobAccountingIfAllTasksVerified(
  jobId: string,
  actorName?: string | null
) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      paymentTasks: {
        orderBy: [{ installmentNo: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
      },
      stepLogs: {
        orderBy: { completedAt: 'asc' },
      },
    },
  });

  if (!job || job.paymentTasks.length === 0) return;
  const allVerified = job.paymentTasks.every((t) => t.status === 'ตรวจสอบและบันทึกแล้ว');
  if (!allVerified) return;

  const existingDocs = parseAccountingTaxDocuments(job.accountingTaxDocuments);
  const taskDocs = extractAccountingDocsFromPaymentTasks(job.paymentTasks);
  const stepLogDocs = extractAccountingDocsFromStepLogs(job.stepLogs);
  const mergedDocs = mergeAccountingTaxDocuments(
    existingDocs,
    mergeAccountingTaxDocuments(stepLogDocs, taskDocs)
  );

  const activeAcctLog = findCompletedAccountingStepLog(job.stepLogs);
  const latestPaidDate = job.paymentTasks.reduce<Date | null>((latest, t) => {
    if (!t.paidDate) return latest;
    const d = new Date(t.paidDate);
    if (Number.isNaN(d.getTime())) return latest;
    return !latest || d > latest ? d : latest;
  }, null);
  const closedBy =
    job.accountingClosedBy ||
    activeAcctLog?.completedBy ||
    actorName ||
    'ฝ่ายบัญชี';
  const closedAt = job.accountingClosedAt || latestPaidDate || new Date();

  let nextCurrentStep = job.currentStep;
  if (job.currentStep === 'accounting') {
    if (!activeAcctLog) {
      const docSummary = mergedDocs.map((d) => d.docNumber).join(', ');
      await prisma.jobStepLog.create({
        data: {
          jobId: job.id,
          step: 'accounting',
          completedBy: closedBy,
          department: 'accounting',
          note: docSummary || 'ยืนยันรับเงินครบถ้วนจากหน้าบัญชี',
        },
      });
    }
    const nextStep = getNextStep(job.jobType, 'accounting', job.flowVariant ?? undefined);
    if (nextStep?.key) {
      nextCurrentStep = nextStep.key;
    }
  }

  const jobUpdateData: Prisma.JobUpdateInput = {
    paymentStatus: 'paid',
    accountingClosedAt: closedAt,
    accountingClosedBy: closedBy,
  };
  if (nextCurrentStep !== job.currentStep) {
    jobUpdateData.currentStep = nextCurrentStep;
  }
  if (existingDocs.length === 0 && mergedDocs.length > 0) {
    jobUpdateData.accountingTaxDocuments = mergedDocs as unknown as Prisma.InputJsonValue;
  }

  await prisma.job.update({
    where: { id: job.id },
    data: jobUpdateData,
  });
}

export async function updatePaymentTaskStatus(
  taskId: string,
  status: string,
  note?: string,
  invoiceNumber?: string,
  invoiceDate?: string | Date
) {
  let currentUser: { id: string; fullName: string } | null = null;
  try {
    const u = await getUser();
    if (u) currentUser = { id: u.id, fullName: u.fullName };
  } catch {}

  const existingTask = await prisma.paymentTask.findUnique({
    where: { id: taskId },
    include: {
      job: {
        include: {
          paymentTasks: true,
          stepLogs: { orderBy: { completedAt: 'asc' } },
        },
      },
    },
  });
  if (!existingTask) throw new Error("ไม่พบรายการชำระเงินที่ต้องการอัปเดต");

  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  const dataToUpdate: any = {
    status,
    note: trimmedNote !== '' ? trimmedNote : existingTask.note,
    ...(status === 'ตรวจสอบและบันทึกแล้ว'
      ? {
          paidDate: existingTask.paidDate ?? new Date(),
        }
      : {}),
  };

  const trimmedInv = typeof invoiceNumber === 'string' ? invoiceNumber.trim() : '';
  if (trimmedInv) {
    dataToUpdate.invoiceNumber = trimmedInv;
  } else if (status === 'ตรวจสอบและบันทึกแล้ว' && !existingTask.invoiceNumber) {
    const existingDocs = mergeAccountingTaxDocuments(
      parseAccountingTaxDocuments(existingTask.job.accountingTaxDocuments),
      extractAccountingDocsFromStepLogs(existingTask.job.stepLogs)
    );
    if (existingTask.job.paymentTasks.length === 1 && existingDocs.length > 0) {
      dataToUpdate.invoiceNumber = existingDocs.map((d) => d.docNumber).join(', ');
      if (!invoiceDate && !existingTask.invoiceDate && existingDocs[0].docDate) {
        dataToUpdate.invoiceDate = new Date(existingDocs[0].docDate);
      }
    }
  }

  if (invoiceDate) {
    const d = new Date(invoiceDate);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2500) {
      d.setFullYear(d.getFullYear() - 543);
    }
    dataToUpdate.invoiceDate = d;
  }

  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: dataToUpdate,
    include: { job: true }
  });

  await syncFinancialAdjustments(task.jobId, {
    allowReopenAccounting: status !== 'ตรวจสอบและบันทึกแล้ว',
    syncProjectSchedule: false,
  });

  if (status === 'ตรวจสอบและบันทึกแล้ว') {
    await reconcileAndCloseJobAccountingIfAllTasksVerified(task.jobId, currentUser?.fullName);
  }

  const { syncAccountingInvoicesToCommissionRequests } = await import('@/app/lib/salesCommissionServer');
  await syncAccountingInvoicesToCommissionRequests(task.jobId);

  const [latestJob, latestTasks, latestStepLogs] = await Promise.all([
    prisma.job.findUnique({
      where: { id: task.jobId },
      select: {
        id: true,
        currentStep: true,
        paymentStatus: true,
        paymentMethod: true,
        accountingClosedAt: true,
        accountingClosedBy: true,
        accountingTaxDocuments: true,
        accountingVerifiedBeforeVat: true,
        accountingVerificationNote: true,
      },
    }),
    prisma.paymentTask.findMany({
      where: { jobId: task.jobId },
      orderBy: [{ installmentNo: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.jobStepLog.findMany({
      where: { jobId: task.jobId },
      orderBy: { completedAt: 'asc' },
    }),
  ]);

  safeRevalidatePath('/accounting');
  safeRevalidatePath('/accounting/dashboard');
  safeRevalidatePath('/jobs');
  safeRevalidatePath('/pipeline');
  safeRevalidatePath('/sales/commissions/approvals');
  safeRevalidatePath('/sales/commissions');

  return {
    success: true,
    task,
    job: latestJob,
    paymentTasks: latestTasks,
    stepLogs: latestStepLogs,
  };
}

export async function recordPaymentDeposit(taskId: string, depositAmount: number, note?: string) {
  const existingTask = await prisma.paymentTask.findUnique({
    where: { id: taskId },
    select: { id: true, note: true, jobId: true },
  });
  if (!existingTask) throw new Error("ไม่พบรายการชำระเงิน");

  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: {
      status: 'ชำระมัดจำแล้ว',
      paidAmount: depositAmount,
      note: trimmedNote !== '' ? trimmedNote : existingTask.note,
    },
    include: { job: true }
  });

  await syncFinancialAdjustments(task.jobId, {
    allowReopenAccounting: false,
    syncProjectSchedule: false,
  });

  const latestJob = await prisma.job.findUnique({
    where: { id: task.jobId },
    select: {
      id: true,
      paymentStatus: true,
      paymentMethod: true,
      accountingClosedAt: true,
      accountingClosedBy: true,
    },
  });

  safeRevalidatePath('/accounting');
  safeRevalidatePath('/accounting/dashboard');
  safeRevalidatePath('/jobs');
  return { success: true, task, job: latestJob };
}

export async function updatePaymentTaskCreditType(taskId: string, creditType: string) {
  const normalized = creditType ? creditType.trim() : null;
  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: { creditType: normalized }
  });
  await syncFinancialAdjustments(task.jobId, {
    allowReopenAccounting: false,
    syncProjectSchedule: false,
  });
  return task;
}

export async function getPendingPaymentTaskCount() {
  try {
    return await prisma.paymentTask.count({
      where: { status: { not: 'ตรวจสอบและบันทึกแล้ว' } }
    });
  } catch (err) {
    return 0;
  }
}

export async function syncAllAccountingTasks() {
  try {
    const { syncProjectInstallmentsToPaymentTasks } = await import('@/app/actions/projects');
    const projectsWithJobs = await prisma.project.findMany({
      where: {
        jobId: { not: null },
        job: { accountingClosedAt: null },
      },
      select: { id: true }
    });
    for (const proj of projectsWithJobs) {
      await syncProjectInstallmentsToPaymentTasks(proj.id);
    }
    safeRevalidatePath('/accounting');
    return { success: true, count: projectsWithJobs.length };
  } catch (error: any) {
    console.error("syncAllAccountingTasks error:", error);
    return { success: false, error: error.message };
  }
}

export async function saveAccountingJobVerification(payload: {
  jobId: string;
  verifiedBeforeVat: number;
  taxDocuments: AccountingTaxDocument[];
  note?: string;
  closeAccountingStep?: boolean;
}) {
  const user = await getUser();
  if (!user || !user.isActive) {
    throw new Error("Unauthorized");
  }

  const roleStr = (user.role || "").toLowerCase();
  const canEditAccounting = [
    "accounting",
    "บัญชี",
    "finance",
    "การเงิน",
    "ผู้จัดการ",
    "ผู้บริหาร",
    "executive",
    "super_admin",
    "admin",
  ].some((k) => roleStr.includes(k));
  if (!canEditAccounting) {
    throw new Error("คุณไม่มีสิทธิ์บันทึกการตรวจสอบยอดฝ่ายบัญชี");
  }

  const verifiedNum = Number(payload.verifiedBeforeVat);
  if (!Number.isFinite(verifiedNum) || verifiedNum <= 0) {
    throw new Error("กรุณาระบุยอดก่อน VAT ที่ถูกต้องในใบกำกับภาษี (มากกว่า 0 บาท)");
  }
  const roundedVerified = Math.round((verifiedNum + Number.EPSILON) * 100) / 100;
  const normalizedDocs = parseAccountingTaxDocuments(payload.taxDocuments || []);
  const shouldCloseAccounting = payload.closeAccountingStep !== false;

  const existingJob = await prisma.job.findUnique({
    where: { id: payload.jobId },
    include: {
      quotation: {
        select: {
          id: true,
          quotationNumber: true,
          totalAmountBeforeVat: true,
          actualClosingAmount: true,
          salesBeforeVat: true,
          salespersonId: true,
        },
      },
      paymentTasks: {
        orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      },
      stepLogs: {
        orderBy: { completedAt: "asc" },
      },
    },
  });

  if (!existingJob) {
    throw new Error("ไม่พบข้อมูลงานในระบบ");
  }

  const paymentLink = evaluatePaymentTasksLinkState({
    paymentTasks: existingJob.paymentTasks,
    paymentMethod: existingJob.paymentMethod,
    creditTerms: existingJob.creditTerms,
  });

  if (shouldCloseAccounting && !paymentLink.canCloseAccounting) {
    throw new Error(
      `${paymentLink.closeBlockReason || "ไม่สามารถปิดงานบัญชีได้ เนื่องจากงวดชำระเงินยังไม่ครบถ้วน"} — สามารถกด "บันทึกร่างไว้ก่อน" เพื่อเก็บยอดก่อน VAT และเลขที่เอกสารได้`
    );
  }

  const reconciliation = evaluateAccountingAmountReconciliation({
    accountingVerifiedBeforeVat: roundedVerified,
    accountingClosedAt: shouldCloseAccounting ? existingJob.accountingClosedAt ?? new Date() : existingJob.accountingClosedAt,
    quotation: existingJob.quotation,
  });

  const now = new Date();
  const nextNote = payload.note?.trim() || null;

  const { updatedJob, updatedStepLogs } = await prisma.$transaction(async (tx) => {
    let nextCurrentStep = existingJob.currentStep;

    if (shouldCloseAccounting) {
      const hasAccountingStepLog = Boolean(findCompletedAccountingStepLog(existingJob.stepLogs));
      if (existingJob.currentStep === "accounting") {
        const nextStep = getNextStep(
          existingJob.jobType,
          "accounting",
          existingJob.flowVariant ?? undefined
        );
        if (!hasAccountingStepLog) {
          const docSummary = normalizedDocs.map((d) => d.docNumber).join(", ");
          const stepNote = [docSummary, nextNote].filter(Boolean).join(" • ") || "ตรวจสอบยอดและปิดงานบัญชี";

          await tx.jobStepLog.create({
            data: {
              jobId: existingJob.id,
              step: "accounting",
              completedBy: user.fullName,
              department: "accounting",
              note: stepNote,
            },
          });
        }
        if (nextStep?.key) {
          nextCurrentStep = nextStep.key;
        }
      }
    }

    // If a single PaymentTask has no invoiceNumber yet, sync the primary entered tax doc back to it before fetching updated job
    if (
      existingJob.paymentTasks.length === 1 &&
      !existingJob.paymentTasks[0].invoiceNumber &&
      normalizedDocs.length > 0
    ) {
      const primaryDoc = normalizedDocs[0];
      await tx.paymentTask.update({
        where: { id: existingJob.paymentTasks[0].id },
        data: {
          invoiceNumber: primaryDoc.docNumber,
          ...(primaryDoc.docDate ? { invoiceDate: new Date(primaryDoc.docDate) } : {}),
        },
      });
    }

    const saved = await tx.job.update({
      where: { id: existingJob.id },
      data: {
        accountingVerifiedBeforeVat: roundedVerified,
        accountingTaxDocuments: normalizedDocs as unknown as Prisma.InputJsonValue,
        accountingVerificationNote: nextNote,
        currentStep: nextCurrentStep,
        ...(shouldCloseAccounting
          ? {
              accountingClosedAt: existingJob.accountingClosedAt ?? now,
              accountingClosedBy: user.fullName,
            }
          : {}),
      },
      include: {
        quotation: true,
        paymentTasks: {
          orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
        },
        stepLogs: { orderBy: { completedAt: "asc" } },
      },
    });

    return { updatedJob: saved, updatedStepLogs: saved.stepLogs };
  });

  if (reconciliation.hasMismatch && existingJob.quotation?.salespersonId) {
    try {
      const { sendPushToUser } = await import("@/app/lib/pushNotification");
      const fmt = (n: number) =>
        n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      await sendPushToUser(existingJob.quotation.salespersonId, {
        title: "ยอดก่อน VAT ไม่ตรงกับฝ่ายบัญชี (ต้องแก้ไข)",
        body: `งาน ${existingJob.jobNumber}: ยอดบัญชี ${fmt(roundedVerified)} บาท ≠ ใบเสนอราคา ${fmt(
          reconciliation.quotationBeforeVat ?? 0
        )} บาท — กรุณาแก้ไขยอดให้ตรงกันเพื่อปิด Job และขอค่าคอมมิชชั่น`,
        url: `/sales?editId=${existingJob.quotation.id}`,
        category: "JOB",
      });
    } catch (pushErr) {
      console.warn("[Accounting] Failed to notify salesperson on amount mismatch:", pushErr);
    }
  }

  const { syncAccountingInvoicesToCommissionRequests } = await import('@/app/lib/salesCommissionServer');
  await syncAccountingInvoicesToCommissionRequests(existingJob.id);

  safeRevalidatePath("/accounting");
  safeRevalidatePath("/accounting/dashboard");
  safeRevalidatePath("/jobs");
  safeRevalidatePath("/sales");
  safeRevalidatePath("/sales/commissions");
  safeRevalidatePath("/sales/commissions/approvals");
  safeRevalidatePath("/pipeline");

  return {
    success: true,
    job: updatedJob,
    paymentTasks: updatedJob.paymentTasks,
    stepLogs: updatedStepLogs,
    taxDocuments: normalizedDocs,
    reconciliation,
  };
}


