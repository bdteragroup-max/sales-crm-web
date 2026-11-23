import React from 'react';
import { redirect } from 'next/navigation';
import {
  fetchAllCommissionRequestsAdmin,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';
import CommissionApprovalsClient from './CommissionApprovalsClient';

export const dynamic = 'force-dynamic';

export default async function CommissionApprovalsPage() {
  const actor = await getCommissionActor();
  if (!actor) redirect('/login');
  if (!actor.isSuperAdmin) {
    redirect('/sales/commissions');
  }

  const items = await fetchAllCommissionRequestsAdmin();

  return (
    <CommissionApprovalsClient initialItems={JSON.parse(JSON.stringify(items))} />
  );
}
