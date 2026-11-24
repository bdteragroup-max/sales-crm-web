import React from 'react';
import { redirect } from 'next/navigation';
import {
  fetchAllCommissionRequestsAdmin,
  fetchCommissionRecipientOptions,
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

  const [items, recipientOptions] = await Promise.all([
    fetchAllCommissionRequestsAdmin(),
    fetchCommissionRecipientOptions(),
  ]);

  return (
    <CommissionApprovalsClient
      initialItems={JSON.parse(JSON.stringify(items))}
      recipientOptions={JSON.parse(JSON.stringify(recipientOptions))}
    />
  );
}
