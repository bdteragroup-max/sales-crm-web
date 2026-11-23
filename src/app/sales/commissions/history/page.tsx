import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import {
  fetchAllCommissionRequestsAdmin,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';
import CommissionHistoryClient from './CommissionHistoryClient';

export const dynamic = 'force-dynamic';

export default async function CommissionHistoryPage() {
  const actor = await getCommissionActor();
  if (!actor) redirect('/login');
  if (!actor.isSuperAdmin) {
    redirect('/sales/commissions');
  }

  const [items, pendingApprovalCount] = await Promise.all([
    fetchAllCommissionRequestsAdmin(),
    prisma.salesCommissionRequest.count({
      where: { status: { in: ['SUBMITTED', 'PENDING_PROFIT_REVIEW', 'PENDING_APPROVAL'] } },
    }),
  ]);

  return (
    <CommissionHistoryClient
      initialItems={JSON.parse(JSON.stringify(items))}
      pendingApprovalCount={pendingApprovalCount}
    />
  );
}
