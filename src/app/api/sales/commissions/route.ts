import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import {
  CrmJobSourceInput,
  doesJobBelongToSalesUser,
  evaluateJobForCommission,
  sanitizeCrmCommissionRowForRole,
} from '@/app/lib/salesCommission';
import {
  acquireCommissionJobLock,
  CRM_JOB_COMMISSION_SELECT,
  generateNextCommissionRequestNo,
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
    const remarks: string | null =
      typeof body?.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null;

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

    const createdRequests: Array<{
      id: string;
      requestNo: string;
      jobId: string;
      jobNumber: string;
      status: string;
    }> = [];

    const txResult = await prisma.$transaction(
      async (tx) => {
        for (const jobId of uniqueJobIds) {
          await acquireCommissionJobLock(tx, jobId);

          const job = await tx.job.findUnique({
            where: { id: jobId },
            select: CRM_JOB_COMMISSION_SELECT,
          });

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

          const requestNo = await generateNextCommissionRequestNo(tx);
          const now = new Date();

          const created = await tx.salesCommissionRequest.create({
            data: {
              requestNo,
              jobId: job.id,
              jobNumber: evaluated.jobNumber,
              companyCode: evaluated.companyCode,
              customerName: evaluated.customerName,
              productSold: evaluated.productSold,
              jobType: evaluated.jobType,
              salespersonId: evaluated.salespersonId || actor.id,
              salespersonName: evaluated.salespersonName,
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
            },
          });

          await tx.salesCommissionLog.createMany({
            data: [
              {
                requestId: created.id,
                action: 'CREATED',
                fromStatus: null,
                toStatus: 'SUBMITTED',
                actorId: actor.id,
                actorName: actor.fullName,
                reason: remarks || `ยื่นคำขอค่าคอมมิชชั่นจาก Job ${evaluated.jobNumber}`,
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
            ],
          });

          const safeView = sanitizeCrmCommissionRowForRole(evaluated, actor.isSuperAdmin);
          void safeView;

          createdRequests.push({
            id: created.id,
            requestNo: created.requestNo,
            jobId: created.jobId,
            jobNumber: created.jobNumber,
            status: created.status,
          });
        }

        return createdRequests;
      },
      { maxWait: 10000, timeout: 20000 }
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
