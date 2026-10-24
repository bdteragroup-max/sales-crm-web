import React from 'react';
import { getMyRequisitions } from '@/app/actions/requisitions';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import RequisitionsClient from './RequisitionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'เบิก/ยืมวัสดุอุปกรณ์ - TeraSales',
};

export default async function RequisitionsPage() {
  const session = await getUser();
  if (!session) redirect('/login');

  const res = await getMyRequisitions();
  const rawRequisitions = res.success && Array.isArray(res.data) ? res.data : [];

  // Safely serialize dates to strings for Client Component
  const serializedRequisitions = rawRequisitions.map((req: any) => ({
    ...req,
    date: req.date ? new Date(req.date).toISOString() : null,
    createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null,
    updatedAt: req.updatedAt ? new Date(req.updatedAt).toISOString() : null,
    deliveryDate: req.deliveryDate ? new Date(req.deliveryDate).toISOString() : null,
    returnRequestedAt: req.returnRequestedAt ? new Date(req.returnRequestedAt).toISOString() : null,
  }));

  return (
    <RequisitionsClient
      initialRequisitions={serializedRequisitions}
      currentUserId={session.id}
      currentUserFullName={session.fullName}
    />
  );
}
