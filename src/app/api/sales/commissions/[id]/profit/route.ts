import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import {
  calculateCommissionFromProfit,
  resolveCostAndProfitInputs,
} from '@/app/lib/salesCommission';
import {
  getCommissionActor,
  syncRequestSplitAllocations,
} from '@/app/lib/salesCommissionServer';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCommissionActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!actor.isSuperAdmin) {
      return NextResponse.json(
        { error: 'อนุญาตเฉพาะ SUPER_ADMIN ในการตรวจสอบและแก้ไขกำไรเท่านั้น' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const rawProfitPct = body?.profitPct;
    const rawCostAmount = body?.costAmount;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const inlineQuickSave = Boolean(body?.inlineQuickSave);

    const existing = await prisma.salesCommissionRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบคำขอค่าคอมมิชชั่น' }, { status: 404 });
    }
    if (existing.status === 'PAID') {
      return NextResponse.json(
        { error: 'ไม่สามารถแก้ไขกำไรของคำขอที่บันทึกจ่ายเงินแล้วได้' },
        { status: 400 }
      );
    }

    const resolved = resolveCostAndProfitInputs(
      existing.salesAmountExVat,
      rawCostAmount,
      rawProfitPct
    );
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const { costAmount: nextCostAmount, profitPct: nextProfitPct } = resolved;

    const isAlreadyApproved = existing.status === 'APPROVED';
    const isRevision = existing.confirmedProfitPct !== null;
    if (isRevision && !reason && !inlineQuickSave) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผลในการแก้ไขตัวเลขกำไร' },
        { status: 400 }
      );
    }
    const effectiveReason =
      reason ||
      (isAlreadyApproved
        ? 'แก้ไขตัวเลขกำไรหลังอนุมัติจากตารางตรวจสอบ'
        : isRevision
        ? 'แก้ไขตัวเลขกำไรจากตารางตรวจสอบ'
        : 'ยืนยันกำไรโดย SUPER_ADMIN');

    const calc = calculateCommissionFromProfit(existing.salesAmountExVat, nextProfitPct);
    const nextStatus = isAlreadyApproved ? 'APPROVED' : 'PENDING_APPROVAL';
    const nextSourceProfit =
      existing.sourceProfitPct !== null ? existing.sourceProfitPct : nextProfitPct;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.salesCommissionRequest.update({
        where: { id },
        data: {
          costAmount: nextCostAmount,
          sourceProfitPct: nextSourceProfit,
          confirmedProfitPct: nextProfitPct,
          profitConfirmedById: actor.id,
          profitConfirmedByName: actor.fullName,
          profitConfirmedAt: new Date(),
          profitEditReason: effectiveReason,
          commissionRatePct: calc.ratePct,
          commissionAmount: calc.amount,
          status: nextStatus,
        },
      });

      await syncRequestSplitAllocations(tx, id, calc.amount);

      await tx.salesCommissionLog.create({
        data: {
          requestId: id,
          action: isAlreadyApproved
            ? 'APPROVED_PROFIT_UPDATED'
            : isRevision
            ? 'PROFIT_UPDATED'
            : 'PROFIT_CONFIRMED',
          fromStatus: existing.status,
          toStatus: nextStatus,
          actorId: actor.id,
          actorName: actor.fullName,
          previousProfitPct: existing.confirmedProfitPct,
          newProfitPct: nextProfitPct,
          previousCost: existing.costAmount,
          newCost: nextCostAmount,
          previousCommissionRate: existing.commissionRatePct,
          newCommissionRate: calc.ratePct,
          previousCommissionAmount: existing.commissionAmount,
          newCommissionAmount: calc.amount,
          reason:
            reason ||
            (isAlreadyApproved
              ? 'แก้ไขตัวเลขกำไรหลังอนุมัติและคำนวณค่าคอมมิชชั่นใหม่'
              : isRevision
              ? 'แก้ไขตัวเลขกำไรและคำนวณค่าคอมมิชชั่นใหม่จากตารางตรวจสอบ'
              : 'ยืนยันตัวเลขกำไรและคำนวณค่าคอมมิชชั่นใหม่'),
        },
      });

      return tx.salesCommissionRequest.findUnique({
        where: { id },
        include: {
          splits: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    try {
      revalidatePath('/sales/commissions');
      revalidatePath('/sales/commissions/approvals');
      revalidatePath('/sales/commissions/history');
      revalidatePath(`/sales/commissions/${id}`);
    } catch {}

    return NextResponse.json({ success: true, request: updated });
  } catch (error: unknown) {
    console.error('Error in PATCH /api/sales/commissions/[id]/profit:', error);
    const message = error instanceof Error ? error.message : 'บันทึกการยืนยันกำไรไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
