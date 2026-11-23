import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCommissionRequestDetailAdmin,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCommissionActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!actor.isSuperAdmin) {
      return NextResponse.json(
        { error: 'อนุญาตเฉพาะ SUPER_ADMIN เท่านั้น' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const item = await fetchCommissionRequestDetailAdmin(id);
    if (!item) {
      return NextResponse.json({ error: 'ไม่พบคำขอค่าคอมมิชชั่น' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: item });
  } catch (error: unknown) {
    console.error('Error in GET /api/sales/commissions/[id]:', error);
    const message = error instanceof Error ? error.message : 'ดึงรายละเอียดคำขอไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
