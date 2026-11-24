import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import {
  CommissionSplitInput,
  formatCommissionSplitsSummary,
  normalizeAndValidateCommissionSplits,
} from '@/app/lib/salesCommission';
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
        { error: 'อนุญาตเฉพาะ SUPER_ADMIN ในการแก้ไขสัดส่วนแบ่งค่าคอมมิชชั่นเท่านั้น' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const rawSplits: unknown = body?.splits;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!Array.isArray(rawSplits) || rawSplits.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุสัดส่วนการแบ่งค่าคอมมิชชั่นอย่างน้อย 1 รายชื่อ' },
        { status: 400 }
      );
    }

    const existing = await prisma.salesCommissionRequest.findUnique({
      where: { id },
      include: { splits: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบคำขอค่าคอมมิชชั่น' }, { status: 404 });
    }
    if (existing.status === 'APPROVED' || existing.status === 'PAID') {
      return NextResponse.json(
        { error: 'ไม่สามารถแก้ไขสัดส่วนของคำขอที่อนุมัติหรือจ่ายเงินแล้วได้' },
        { status: 400 }
      );
    }

    const inputSplits = rawSplits as CommissionSplitInput[];
    const userIds = Array.from(
      new Set(
        inputSplits
          .map((s) => (typeof s?.userId === 'string' ? s.userId.trim() : ''))
          .filter(Boolean)
      )
    );

    const matchedUsers =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds }, isActive: true },
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
    const userById = new Map(matchedUsers.map((u) => [u.id, u]));

    const enrichedInputs: CommissionSplitInput[] = inputSplits.map((s) => {
      const uid = typeof s?.userId === 'string' ? s.userId.trim() : '';
      const u = uid ? userById.get(uid) : undefined;
      if (u) {
        return {
          ...s,
          userId: u.id,
          employeeId: u.employeeId,
          recipientName: u.fullName,
          recipientRole: u.employeeSale?.department || u.position || u.role,
        };
      }
      return s;
    });

    const validated = normalizeAndValidateCommissionSplits(
      enrichedInputs,
      existing.commissionAmount
    );
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const nextSplits = validated.splits;
    const ownerSplit = nextSplits.find((s) => s.isOwner) || nextSplits[0];
    const previousSummary =
      existing.splits.length > 0
        ? formatCommissionSplitsSummary(
            existing.splits.map((s) => ({
              id: s.id,
              userId: s.userId,
              employeeId: s.employeeId,
              recipientName: s.recipientName,
              recipientRole: s.recipientRole,
              splitPct: s.splitPct,
              allocatedAmount: s.allocatedAmount,
              isOwner: s.isOwner,
              sortOrder: s.sortOrder,
            }))
          )
        : `${existing.salespersonName} (100%)`;
    const newSummary = formatCommissionSplitsSummary(nextSplits);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.salesCommissionSplit.deleteMany({ where: { requestId: id } });
      await tx.salesCommissionSplit.createMany({
        data: nextSplits.map((s) => ({
          requestId: id,
          userId: s.userId,
          employeeId: s.employeeId,
          recipientName: s.recipientName,
          recipientRole: s.recipientRole,
          splitPct: s.splitPct,
          allocatedAmount: s.allocatedAmount,
          isOwner: s.isOwner,
          sortOrder: s.sortOrder,
        })),
      });

      const saved = await tx.salesCommissionRequest.update({
        where: { id },
        data: {
          salespersonId: ownerSplit?.userId ?? existing.salespersonId,
          salespersonName: ownerSplit?.recipientName || existing.salespersonName,
        },
        include: {
          splits: { orderBy: { sortOrder: 'asc' } },
          logs: { orderBy: { createdAt: 'desc' } },
        },
      });

      await tx.salesCommissionLog.create({
        data: {
          requestId: id,
          action: 'SPLITS_UPDATED',
          fromStatus: existing.status,
          toStatus: existing.status,
          actorId: actor.id,
          actorName: actor.fullName,
          reason:
            reason ||
            `ปรับสัดส่วนแบ่งค่าคอมฯ จาก [${previousSummary}] เป็น [${newSummary}]`,
          details: {
            previousSplits: existing.splits,
            newSplits: nextSplits,
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
    console.error('Error in PATCH /api/sales/commissions/[id]/splits:', error);
    const message =
      error instanceof Error ? error.message : 'บันทึกสัดส่วนการแบ่งค่าคอมมิชชั่นไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
