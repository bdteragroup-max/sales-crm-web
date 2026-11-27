import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@/generated/client';
import prisma from '@/app/lib/db';
import {
  calculateCommissionFromProfit,
  resolveCostAndProfitInputs,
} from '@/app/lib/salesCommission';
import {
  acquireCommissionJobLocks,
  assertNoActiveCommissionConflictForJob,
  getCommissionActor,
  resolveCommissionMutationError,
  syncRequestSplitAllocations,
} from '@/app/lib/salesCommissionServer';

type BulkApproveItemInput = {
  id?: unknown;
  costAmount?: unknown;
  profitPct?: unknown;
  hasInlineDraft?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const actor = await getCommissionActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!actor.isSuperAdmin) {
      return NextResponse.json(
        { error: 'อนุญาตเฉพาะ SUPER_ADMIN ในการอนุมัติคำขอเท่านั้น' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawItems: BulkApproveItemInput[] = Array.isArray(body?.items) ? body.items : [];
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    const normalizedMap = new Map<
      string,
      { id: string; costAmount: unknown; profitPct: unknown; hasInlineDraft: boolean }
    >();
    for (const entry of rawItems) {
      const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
      if (!id) continue;
      normalizedMap.set(id, {
        id,
        costAmount: entry?.costAmount,
        profitPct: entry?.profitPct,
        hasInlineDraft: Boolean(entry?.hasInlineDraft),
      });
    }

    const items = Array.from(normalizedMap.values());
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการที่ต้องการอนุมัติอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    const existingRows = await prisma.salesCommissionRequest.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      include: { splits: { orderBy: { sortOrder: 'asc' } } },
    });
    const existingById = new Map(existingRows.map((r) => [r.id, r]));

    const rowsByJobId = new Map<string, typeof existingRows>();
    for (const item of items) {
      const existing = existingById.get(item.id);
      if (!existing) {
        return NextResponse.json({ error: 'ไม่พบบางคำขอค่าคอมมิชชั่นในระบบ' }, { status: 404 });
      }
      if (existing.status === 'PAID') {
        return NextResponse.json(
          { error: `คำขอ ${existing.requestNo} บันทึกจ่ายเงินแล้ว ไม่สามารถอนุมัติซ้ำได้` },
          { status: 400 }
        );
      }
      const list = rowsByJobId.get(existing.jobId) || [];
      list.push(existing);
      rowsByJobId.set(existing.jobId, list);
    }

    for (const [, dupRows] of rowsByJobId) {
      if (dupRows.length > 1) {
        const reqNos = dupRows.map((r) => r.requestNo).join(', ');
        return NextResponse.json(
          {
            error: `ไม่สามารถอนุมัติได้ เนื่องจากเลือกคำขอซ้ำสำหรับ Job ${dupRows[0].jobNumber} (${reqNos})`,
          },
          { status: 400 }
        );
      }
    }

    const updatedRequests = await prisma.$transaction(
      async (tx) => {
        await acquireCommissionJobLocks(tx, Array.from(rowsByJobId.keys()));

        const freshRows = await tx.salesCommissionRequest.findMany({
          where: { id: { in: items.map((i) => i.id) } },
          include: { splits: { orderBy: { sortOrder: 'asc' } } },
        });
        const freshById = new Map(freshRows.map((r) => [r.id, r]));

        const results = [];
        const logsToCreate: Prisma.SalesCommissionLogCreateManyInput[] = [];
        const now = new Date();

        for (const item of items) {
          const existing = freshById.get(item.id);
          if (!existing) {
            throw new Error('ไม่พบบางคำขอค่าคอมมิชชั่นในระบบ');
          }
          if (existing.status === 'PAID') {
            throw new Error(
              `คำขอ ${existing.requestNo} บันทึกจ่ายเงินแล้ว ไม่สามารถอนุมัติซ้ำได้`
            );
          }

          await assertNoActiveCommissionConflictForJob(tx, {
            requestId: existing.id,
            jobId: existing.jobId,
            jobNumber: existing.jobNumber,
            nextStatus: 'APPROVED',
            actionLabel: `อนุมัติ ${existing.requestNo}`,
          });

          let nextCostAmount = existing.costAmount;
          let nextSourceProfit = existing.sourceProfitPct;
          let nextProfitPct = existing.confirmedProfitPct;
          let nextRatePct = existing.commissionRatePct;
          let nextCommissionAmount = existing.commissionAmount;
          let nextProfitEditReason = existing.profitEditReason;

          if (item.hasInlineDraft) {
            const resolved = resolveCostAndProfitInputs(
              existing.salesAmountExVat,
              item.costAmount,
              item.profitPct
            );
            if ('error' in resolved) {
              throw new Error(`${existing.requestNo}: ${resolved.error}`);
            }
            const isRevision = existing.confirmedProfitPct !== null;
            const calc = calculateCommissionFromProfit(
              existing.salesAmountExVat,
              resolved.profitPct
            );

            nextCostAmount = resolved.costAmount;
            nextProfitPct = resolved.profitPct;
            nextSourceProfit =
              existing.sourceProfitPct !== null ? existing.sourceProfitPct : resolved.profitPct;
            nextRatePct = calc.ratePct;
            nextCommissionAmount = calc.amount;
            nextProfitEditReason = isRevision
              ? 'แก้ไขตัวเลขกำไรจากตารางตรวจสอบ'
              : 'ยืนยันกำไรโดย SUPER_ADMIN';

            logsToCreate.push({
              requestId: existing.id,
              action: isRevision ? 'PROFIT_UPDATED' : 'PROFIT_CONFIRMED',
              fromStatus: existing.status,
              toStatus: 'PENDING_APPROVAL',
              actorId: actor.id,
              actorName: actor.fullName,
              previousProfitPct: existing.confirmedProfitPct,
              newProfitPct: nextProfitPct,
              previousCost: existing.costAmount,
              newCost: nextCostAmount,
              previousCommissionRate: existing.commissionRatePct,
              newCommissionRate: nextRatePct,
              previousCommissionAmount: existing.commissionAmount,
              newCommissionAmount: nextCommissionAmount,
              reason: isRevision
                ? 'แก้ไขตัวเลขกำไรและคำนวณค่าคอมมิชชั่นระหว่างอนุมัติแบบหลายรายการ'
                : 'ยืนยันตัวเลขกำไรและคำนวณค่าคอมมิชชั่นอัตโนมัติก่อนอนุมัติ',
            });
          }

          if (
            nextProfitPct === null ||
            nextRatePct === null ||
            nextCommissionAmount === null
          ) {
            throw new Error(
              `${existing.requestNo}: กรุณากรอกต้นทุนหรือ % กำไรให้ครบถ้วนก่อนอนุมัติ`
            );
          }

          const saved = await tx.salesCommissionRequest.update({
            where: { id: existing.id },
            data: {
              costAmount: nextCostAmount,
              sourceProfitPct: nextSourceProfit,
              confirmedProfitPct: nextProfitPct,
              profitConfirmedById: item.hasInlineDraft ? actor.id : existing.profitConfirmedById,
              profitConfirmedByName: item.hasInlineDraft
                ? actor.fullName
                : existing.profitConfirmedByName,
              profitConfirmedAt: item.hasInlineDraft ? now : existing.profitConfirmedAt,
              profitEditReason: nextProfitEditReason,
              commissionRatePct: nextRatePct,
              commissionAmount: nextCommissionAmount,
              status: 'APPROVED',
              approvedById: actor.id,
              approvedByName: actor.fullName,
              approvedAt: now,
              rejectedReason: null,
            },
          });

          if (existing.splits.length > 0) {
            await syncRequestSplitAllocations(
              tx,
              existing.id,
              nextCommissionAmount,
              existing.splits
            );
          }

          logsToCreate.push({
            requestId: existing.id,
            action: 'APPROVED',
            fromStatus: item.hasInlineDraft ? 'PENDING_APPROVAL' : existing.status,
            toStatus: 'APPROVED',
            actorId: actor.id,
            actorName: actor.fullName,
            newProfitPct: nextProfitPct,
            newCommissionRate: nextRatePct,
            newCommissionAmount: nextCommissionAmount,
            reason: reason || 'อนุมัติจ่ายค่าคอมมิชชั่นแบบหลายรายการ',
          });

          results.push(saved);
        }

        if (logsToCreate.length > 0) {
          await tx.salesCommissionLog.createMany({ data: logsToCreate });
        }

        return results;
      },
      { maxWait: 15000, timeout: 60000 }
    );

    try {
      revalidatePath('/sales/commissions');
      revalidatePath('/sales/commissions/approvals');
      revalidatePath('/sales/commissions/history');
      for (const reqRow of updatedRequests) {
        revalidatePath(`/sales/commissions/${reqRow.id}`);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      approvedCount: updatedRequests.length,
      requests: updatedRequests,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/sales/commissions/bulk-approve:', error);
    const { status, message } = resolveCommissionMutationError(
      error,
      'อนุมัติหลายรายการไม่สำเร็จ'
    );
    return NextResponse.json({ error: message }, { status });
  }
}
