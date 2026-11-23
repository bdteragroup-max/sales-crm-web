import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import {
  fetchCrmCommissionJobs,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';
import CommissionCrmListClient from './CommissionCrmListClient';

export const dynamic = 'force-dynamic';

export default async function CommissionsCrmListPage() {
  const actor = await getCommissionActor();
  if (!actor) {
    redirect('/login');
  }
  if (!actor.canAccessCrmList) {
    redirect('/dashboard');
  }

  let initialRows: Awaited<ReturnType<typeof fetchCrmCommissionJobs>>['rows'] = [];
  let initialFetchedAt = new Date().toISOString();
  let initialError: string | null = null;
  let pendingApprovalCount = 0;

  try {
    const res = await fetchCrmCommissionJobs({ actor });
    initialRows = res.rows;
    initialFetchedAt = res.fetchedAt;

    if (actor.isSuperAdmin) {
      pendingApprovalCount = await prisma.salesCommissionRequest.count({
        where: { status: { in: ['SUBMITTED', 'PENDING_PROFIT_REVIEW', 'PENDING_APPROVAL'] } },
      });
    }
  } catch (err: unknown) {
    initialError =
      err instanceof Error
        ? `เชื่อมต่อข้อมูล CRM ไม่สำเร็จ: ${err.message}`
        : 'เชื่อมต่อข้อมูล CRM ไม่สำเร็จ';
  }

  return (
    <CommissionCrmListClient
      initialRows={JSON.parse(JSON.stringify(initialRows))}
      initialFetchedAt={initialFetchedAt}
      initialError={initialError}
      isSuperAdmin={actor.isSuperAdmin}
      pendingApprovalCount={pendingApprovalCount}
    />
  );
}
