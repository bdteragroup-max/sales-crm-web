import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCrmCommissionJobs,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const actor = await getCommissionActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!actor.canAccessCrmList) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์เข้าถึงระบบขอค่าคอมมิชชั่น' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const companyFilter = searchParams.get('company') || 'ALL';
    const salespersonFilter = searchParams.get('salesperson') || 'ALL';

    const { rows, fetchedAt } = await fetchCrmCommissionJobs({
      actor,
      search,
      statusFilter,
      companyFilter,
      salespersonFilter,
    });

    return NextResponse.json({
      success: true,
      isSuperAdmin: actor.isSuperAdmin,
      fetchedAt,
      jobs: rows,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/sales/commissions/crm-jobs:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'เชื่อมต่อหรือดึงข้อมูลจาก CRM ไม่สำเร็จ';
    return NextResponse.json(
      { error: `เชื่อมต่อข้อมูล CRM ไม่สำเร็จ: ${message}` },
      { status: 500 }
    );
  }
}
