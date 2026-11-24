import React from 'react';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/app/lib/db';
import {
  fetchCommissionRecipientOptions,
  fetchCommissionRequestDetailAdmin,
  getCommissionActor,
} from '@/app/lib/salesCommissionServer';
import CommissionDetailClient from './CommissionDetailClient';

export const dynamic = 'force-dynamic';

export default async function CommissionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getCommissionActor();
  if (!actor) redirect('/login');
  if (!actor.isSuperAdmin) {
    redirect('/sales/commissions');
  }

  const { id } = await props.params;
  const [record, pendingApprovalCount, recipientOptions] = await Promise.all([
    fetchCommissionRequestDetailAdmin(id),
    prisma.salesCommissionRequest.count({
      where: { status: { in: ['SUBMITTED', 'PENDING_PROFIT_REVIEW', 'PENDING_APPROVAL'] } },
    }),
    fetchCommissionRecipientOptions(),
  ]);

  if (!record) {
    notFound();
  }

  return (
    <CommissionDetailClient
      initialRecord={JSON.parse(JSON.stringify(record))}
      pendingApprovalCount={pendingApprovalCount}
      recipientOptions={JSON.parse(JSON.stringify(recipientOptions))}
    />
  );
}
