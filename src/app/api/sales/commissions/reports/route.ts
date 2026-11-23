import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllCommissionRequestsAdmin,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const items = await fetchAllCommissionRequestsAdmin({
      status: searchParams.get('status') || 'ALL',
      search: searchParams.get('q') || '',
      companyCode: searchParams.get('company') || 'ALL',
      salespersonName: searchParams.get('salesperson') || 'ALL',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/sales/commissions/reports:', error);
    const message = error instanceof Error ? error.message : 'โหลดรายงานค่าคอมมิชชั่นไม่สำเร็จ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
