import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import { roundCurrency2 } from '@/app/lib/salesCommission';
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
        { error: 'อนุญาตเฉพาะ SUPER_ADMIN ในการบันทึกการจ่ายค่าคอมมิชชั่นเท่านั้น' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const rawDate = body?.payoutDate;
    const rawAmount = body?.payoutAmount;
    const payoutRefNo = typeof body?.payoutRefNo === 'string' ? body.payoutRefNo.trim() : '';
    const payoutNote = typeof body?.payoutNote === 'string' ? body.payoutNote.trim() : '';

    if (!rawDate) {
      return NextResponse.json({ error: 'กรุณาระบุวันที่จ่ายเงิน' }, { status: 400 });
    }
    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'วันที่จ่ายเงินไม่ถูกต้อง' }, { status: 400 });
    }

    const parsedAmount = Number(rawAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'กรุณาระบุยอดเงินที่จ่ายให้ถูกต้อง' }, { status: 400 });
    }

    if (!payoutRefNo) {
      return NextResponse.json({ error: 'กรุณาระบุเลขที่อ้างอิงการจ่าย' }, { status: 400 });
    }

    const existing = await prisma.salesCommissionRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบคำขอค่าคอมมิชชั่น' }, { status: 404 });
    }
    if (existing.status === 'PAID') {
      return NextResponse.json({ error: 'คำขอนี้บันทึกจ่ายแล้ว' }, { status: 400 });
    }
    if (existing.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'ต้องอนุมัติคำขอ (อนุมัติแล้ว) ก่อนบันทึกการจ่ายเงิน' },
        { status: 400 }
      );
    }

    const finalPayoutAmount = roundCurrency2(parsedAmount);

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.salesCommissionRequest.update({
        where: { id },
        data: {
          status: 'PAID',
          payoutDate: parsedDate,
          payoutAmount: finalPayoutAmount,
          payoutRefNo,
          payoutNote: payoutNote || null,
          payoutRecordedById: actor.id,
          payoutRecordedByName: actor.fullName,
          payoutRecordedAt: new Date(),
        },
      });

      await tx.salesCommissionLog.create({
        data: {
          requestId: id,
          action: 'PAID',
          fromStatus: existing.status,
          toStatus: 'PAID',
          actorId: actor.id,
          actorName: actor.fullName,
          newCommissionAmount: finalPayoutAmount,
          reason: `จ่ายเงินค่าคอมมิชชั่นแล้ว อ้างอิง ${payoutRefNo}`,
          details: {
            payoutDate: parsedDate.toISOString(),
            payoutAmount: finalPayoutAmount,
            payoutRefNo,
            payoutNote: payoutNote || null,
          },
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
    console.error('Error in PATCH /api/sales/commissions/[id]/payout:', error);
    const message = error instanceof Error ? error.message : 'บันทึกการจ่ายเงินไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
