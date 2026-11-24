import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import {
  CommissionSplitInput,
  CommissionSplitItem,
  CrmJobSourceInput,
  doesJobBelongToSalesUser,
  evaluateJobForCommission,
  formatCommissionSplitsSummary,
  normalizeAndValidateCommissionSplits,
} from '@/app/lib/salesCommission';
import {
  acquireCommissionJobLocks,
  CRM_JOB_COMMISSION_SELECT,
  generateCommissionRequestNoRange,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';

export async function POST(request: NextRequest) {
  try {
    const actor = await getCommissionActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!actor.canAccessCrmList) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ยื่นคำขอค่าคอมมิชชั่น' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawJobIds: unknown = body?.jobIds ?? (body?.jobId ? [body.jobId] : []);
    const rawJobSplits: unknown = body?.jobSplits;
    const rawDefaultSplits: unknown = body?.defaultSplits;
    const remarks: string | null =
      typeof body?.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null;

    const jobSplitsMap =
      rawJobSplits && typeof rawJobSplits === 'object' && !Array.isArray(rawJobSplits)
        ? (rawJobSplits as Record<string, CommissionSplitInput[]>)
        : {};
    const defaultSplits: CommissionSplitInput[] | null = Array.isArray(rawDefaultSplits)
      ? (rawDefaultSplits as CommissionSplitInput[])
      : null;

    if (!Array.isArray(rawJobIds) || rawJobIds.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการ Job อย่างน้อย 1 รายการก่อนยื่นคำขอ' },
        { status: 400 }
      );
    }

    const uniqueJobIds = Array.from(
      new Set(rawJobIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
    ).sort();

    if (uniqueJobIds.length === 0) {
      return NextResponse.json({ error: 'รหัส Job ไม่ถูกต้อง' }, { status: 400 });
    }

    const txResult = await prisma.$transaction(
      async (tx) => {
        await acquireCommissionJobLocks(tx, uniqueJobIds);

        const jobs = await tx.job.findMany({
          where: { id: { in: uniqueJobIds } },
          select: CRM_JOB_COMMISSION_SELECT,
        });
        const jobById = new Map(jobs.map((job) => [job.id, job]));

        const allRawSplitInputs: CommissionSplitInput[] = [
          ...(defaultSplits || []),
          ...Object.values(jobSplitsMap).flat(),
        ];
        const splitUserIds = Array.from(
          new Set(
            allRawSplitInputs
              .map((s) => (typeof s?.userId === 'string' ? s.userId.trim() : ''))
              .filter(Boolean)
          )
        );
        const splitUsers =
          splitUserIds.length > 0
            ? await tx.user.findMany({
                where: { id: { in: splitUserIds }, isActive: true },
                select: {
                  id: true,
                  employeeId: true,
                  fullName: true,
                  role: true,
                  position: true,
                  employeeSale: { select: { department: true } },
                },
              })
            : [];
        const splitUserById = new Map(splitUsers.map((u) => [u.id, u]));

        const resolveSplitInputs = (rawList: CommissionSplitInput[]): CommissionSplitInput[] =>
          rawList.map((s) => {
            const uid = typeof s?.userId === 'string' ? s.userId.trim() : '';
            const matched = uid ? splitUserById.get(uid) : undefined;
            if (matched) {
              return {
                ...s,
                userId: matched.id,
                employeeId: matched.employeeId,
                recipientName: matched.fullName,
                recipientRole:
                  matched.employeeSale?.department || matched.position || matched.role,
              };
            }
            return s;
          });

        const preparedJobs: Array<{
          job: (typeof jobs)[number];
          evaluated: ReturnType<typeof evaluateJobForCommission>;
          splits: CommissionSplitItem[];
        }> = [];

        for (const jobId of uniqueJobIds) {
          const job = jobById.get(jobId);
          if (!job) {
            throw new Error(`ไม่พบข้อมูล Job ในระบบ CRM (${jobId})`);
          }

          if (!actor.isSuperAdmin) {
            const ownsJob = doesJobBelongToSalesUser(job, {
              id: actor.id,
              fullName: actor.fullName,
              employeeSaleName: actor.employeeSaleName,
              teraEmployeeName: actor.teraEmployeeName,
            });
            if (!ownsJob) {
              throw new Error(`ไม่มีสิทธิ์ยื่นคำขอสำหรับงานของพนักงานขายท่านอื่น (${job.jobNumber})`);
            }
          }

          const evaluated = evaluateJobForCommission(job as unknown as CrmJobSourceInput);
          if (!evaluated.isEligibleToSubmit) {
            const reasonText =
              evaluated.ineligibleReasons.length > 0
                ? evaluated.ineligibleReasons.join(', ')
                : 'ไม่ผ่านเงื่อนไขการยื่นคำขอ';
            throw new Error(`Job ${job.jobNumber} ไม่สามารถยื่นคำขอได้: ${reasonText}`);
          }

          const perJobRawSplits = Array.isArray(jobSplitsMap[jobId])
            ? jobSplitsMap[jobId]
            : defaultSplits && defaultSplits.length > 0
            ? defaultSplits
            : null;

          let resolvedSplits: CommissionSplitItem[];
          if (perJobRawSplits && perJobRawSplits.length > 0) {
            const validated = normalizeAndValidateCommissionSplits(
              resolveSplitInputs(perJobRawSplits),
              null
            );
            if ('error' in validated) {
              throw new Error(`Job ${job.jobNumber}: ${validated.error}`);
            }
            resolvedSplits = validated.splits;
          } else {
            resolvedSplits = [
              {
                userId: evaluated.salespersonId || actor.id,
                employeeId: null,
                recipientName: evaluated.salespersonName || actor.fullName,
                recipientRole: null,
                splitPct: 100,
                allocatedAmount: null,
                isOwner: true,
                sortOrder: 0,
              },
            ];
          }

          preparedJobs.push({ job, evaluated, splits: resolvedSplits });
        }

        const requestNos = await generateCommissionRequestNoRange(tx, preparedJobs.length);
        const now = new Date();

        const createdRequests = await tx.salesCommissionRequest.createManyAndReturn({
          data: preparedJobs.map(({ job, evaluated, splits }, idx) => {
            const ownerSplit = splits.find((s) => s.isOwner) || splits[0];
            return {
              requestNo: requestNos[idx],
              jobId: job.id,
              jobNumber: evaluated.jobNumber,
              companyCode: evaluated.companyCode,
              customerName: evaluated.customerName,
              productSold: evaluated.productSold,
              jobType: evaluated.jobType,
              salespersonId: ownerSplit?.userId || evaluated.salespersonId || actor.id,
              salespersonName: ownerSplit?.recipientName || evaluated.salespersonName,
              requestedById: actor.id,
              requestedByName: actor.fullName,
              requestedAt: now,
              taxInvoiceNumbers: evaluated.taxInvoiceNumbers,
              taxInvoiceDate: evaluated.taxInvoiceDate ? new Date(evaluated.taxInvoiceDate) : null,
              receiptNumbers: evaluated.receiptNumbers,
              jobClosedStatus: evaluated.jobClosedStatus,
              isJobClosed: evaluated.isJobClosed,
              salesAmountExVat: evaluated.salesAmountExVat,
              paidAmountRecorded: evaluated.paidAmountRecorded,
              isPayment100Pct: evaluated.isPayment100Pct,
              isAccountingDone: evaluated.isAccountingDone,
              hasGoodsReturn: evaluated.hasGoodsReturn,
              crmFetchedAt: now,
              crmSnapshot: evaluated.crmSnapshot,
              // A3: start with no cost/profit confirmed until SUPER_ADMIN reviews in Step 4
              costAmount: null,
              sourceProfitPct: null,
              confirmedProfitPct: null,
              commissionRatePct: null,
              commissionAmount: null,
              status: 'PENDING_PROFIT_REVIEW',
              remarks,
            };
          }),
          select: {
            id: true,
            requestNo: true,
            jobId: true,
            jobNumber: true,
            status: true,
          },
        });

        const splitsByJobId = new Map(preparedJobs.map((p) => [p.job.id, p.splits]));

        await tx.salesCommissionSplit.createMany({
          data: createdRequests.flatMap((created) => {
            const splits = splitsByJobId.get(created.jobId) || [];
            return splits.map((s) => ({
              requestId: created.id,
              userId: s.userId,
              employeeId: s.employeeId,
              recipientName: s.recipientName,
              recipientRole: s.recipientRole,
              splitPct: s.splitPct,
              allocatedAmount: null,
              isOwner: s.isOwner,
              sortOrder: s.sortOrder,
            }));
          }),
        });

        await tx.salesCommissionLog.createMany({
          data: createdRequests.flatMap((created) => {
            const splits = splitsByJobId.get(created.jobId) || [];
            const splitNote =
              splits.length > 1
                ? ` • แบ่งค่าคอมฯ: ${formatCommissionSplitsSummary(splits)}`
                : '';
            return [
              {
                requestId: created.id,
                action: 'CREATED',
                fromStatus: null,
                toStatus: 'SUBMITTED',
                actorId: actor.id,
                actorName: actor.fullName,
                reason: `${
                  remarks || `ยื่นคำขอค่าคอมมิชชั่นจาก Job ${created.jobNumber}`
                }${splitNote}`,
                details: splits.length > 1 ? { splits } : undefined,
              },
              {
                requestId: created.id,
                action: 'STATUS_CHANGED',
                fromStatus: 'SUBMITTED',
                toStatus: 'PENDING_PROFIT_REVIEW',
                actorId: actor.id,
                actorName: 'ระบบ CRM Commission',
                reason: 'ส่งต่อให้ SUPER_ADMIN ตรวจสอบและยืนยัน % กำไร',
              },
            ];
          }),
        });

        return createdRequests;
      },
      { maxWait: 15000, timeout: 60000 }
    );

    try {
      revalidatePath('/sales/commissions');
      revalidatePath('/sales/commissions/approvals');
      revalidatePath('/sales/commissions/history');
    } catch {
      // Non-fatal revalidation
    }

    return NextResponse.json({
      success: true,
      count: txResult.length,
      requests: txResult,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/sales/commissions:', error);
    const message = error instanceof Error ? error.message : 'ยื่นคำขอค่าคอมมิชชั่นไม่สำเร็จ';
    const isBusinessRuleError =
      message.includes('ไม่สามารถยื่นคำขอได้') ||
      message.includes('ไม่มีสิทธิ์') ||
      message.includes('ไม่พบข้อมูล Job') ||
      message.includes('สัดส่วน') ||
      message.includes('ซ้ำกัน') ||
      message.includes('ผู้รับค่าคอม') ||
      message.includes('uniq_active_commission_per_job');
    return NextResponse.json(
      {
        error: message.includes('uniq_active_commission_per_job')
          ? 'รายการนี้มีคำขอค่าคอมมิชชั่นแล้ว'
          : message,
      },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
