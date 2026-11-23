import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import { getCommissionActor } from '@/app/lib/salesCommissionServer';

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
        { error: 'อนุญาตเฉพาะ SUPER_ADMIN ในการอนุมัติหรือปฏิเสธคำขอเท่านั้น' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const decision = body?.decision;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return NextResponse.json(
        { error: 'ระบุผลการพิจารณาไม่ถูกต้อง (APPROVE หรือ REJECT)' },
        { status: 400 }
      );
    }

    const existing = await prisma.salesCommissionRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบคำขอค่าคอมมิชชั่น' }, { status: 404 });
    }
    if (existing.status === 'PAID') {
      return NextResponse.json(
        { error: 'คำขอนี้บันทึกจ่ายเงินแล้ว ไม่สามารถเปลี่ยนสถานะได้' },
        { status: 400 }
      );
    }

    if (decision === 'APPROVE') {
      if (
        existing.confirmedProfitPct === null ||
        existing.commissionAmount === null ||
        existing.commissionRatePct === null
      ) {
        return NextResponse.json(
          { error: 'กรุณายืนยันตัวเลขกำไรใน Step 4 ก่อนอนุมัติคำขอ' },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.salesCommissionRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById: actor.id,
            approvedByName: actor.fullName,
            approvedAt: new Date(),
            rejectedReason: null,
          },
        });

        await tx.salesCommissionLog.create({
          data: {
            requestId: id,
            action: 'APPROVED',
            fromStatus: existing.status,
            toStatus: 'APPROVED',
            actorId: actor.id,
            actorName: actor.fullName,
            newProfitPct: existing.confirmedProfitPct,
            newCommissionRate: existing.commissionRatePct,
            newCommissionAmount: existing.commissionAmount,
            reason: reason || 'อนุมัติจ่ายค่าคอมมิชชั่น',
          },
        });

        return saved;
      });

      try {
        revalidatePath('/sales/commissions');
        revalidatePath('/sales/commissions/approvals');
        revalidatePath('/sales/commissions/history');
        revalidatePath(`/sales/commissions/${id}`);
      } catch {}

      return NextResponse.json({ success: true, request: updated });
    }

    // REJECT
    if (!reason) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผลกรณีไม่อนุมัติคำขอ' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.salesCommissionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: actor.id,
          approvedByName: actor.fullName,
          approvedAt: new Date(),
          rejectedReason: reason,
        },
      });

      await tx.salesCommissionLog.create({
        data: {
          requestId: id,
          action: 'REJECTED',
          fromStatus: existing.status,
          toStatus: 'REJECTED',
          actorId: actor.id,
          actorName: actor.fullName,
          reason,
        },
      });

      return saved;
    });

    try {
      revalidatePath('/sales/commissions');
      revalidatePath('/sales/commissions/approvals');
      revalidatePath('/sales/commissions/history');
      revalidatePath(`/sales/commissions/${id}`);
    } catch {}

    return NextResponse.json({ success: true, request: updated });
  } catch (error: unknown) {
    console.error('Error in PATCH /api/sales/commissions/[id]/decision:', error);
    const message = error instanceof Error ? error.message : 'บันทึกผลการอนุมัติไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
