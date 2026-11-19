import React from 'react';
import { getMyRequisitions } from '@/app/actions/requisitions';
import { getUser } from '@/app/lib/dal';
import {
  isAccountingRequisitionRole,
  isTransportRole,
} from '@/app/lib/requisitionUtils';
import { redirect } from 'next/navigation';
import type { RequisitionSignatureRecord } from './components/signaturePadHelper';
import RequisitionsClient, { type Requisition } from './RequisitionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'เบิก/ยืมวัสดุอุปกรณ์ - TeraSales',
};

export default async function RequisitionsPage() {
  const session = await getUser();
  if (!session) redirect('/login');

  const res = await getMyRequisitions();
  const rawRequisitions = (
    res.success && Array.isArray(res.data) ? res.data : []
  ) as Array<RequisitionSignatureRecord & Record<string, unknown>>;

  const isAccountingUser = isAccountingRequisitionRole(session.role);
  const isTransportUser = isTransportRole(session.role);
  const canSignAccounting = isAccountingUser;

  const fallbackUserSig =
    rawRequisitions.find((r) => r.accountingId === session.id && r.accountingSignatureUrl)
      ?.accountingSignatureUrl ||
    rawRequisitions.find((r) => r.approverId === session.id && r.approverSignatureUrl)
      ?.approverSignatureUrl ||
    rawRequisitions.find((r) => r.requesterId === session.id && r.requesterSignatureUrl)
      ?.requesterSignatureUrl ||
    null;

  const savedAccountingSignatureUrl =
    rawRequisitions.find((r) => r.accountingId === session.id && r.accountingSignatureUrl)
      ?.accountingSignatureUrl || fallbackUserSig;
  const savedTransportSignatureUrl =
    rawRequisitions.find((r) => r.transportId === session.id && r.transportSignatureUrl)
      ?.transportSignatureUrl || fallbackUserSig;

  // Safely serialize dates to strings for Client Component
  const toIsoOrNull = (val: unknown): string | null =>
    val ? new Date(val as string | number | Date).toISOString() : null;

  const serializedRequisitions: Requisition[] = rawRequisitions.map((req) => ({
    ...(req as unknown as Requisition),
    date: toIsoOrNull(req.date) || new Date().toISOString(),
    createdAt: toIsoOrNull(req.createdAt) || new Date().toISOString(),
    updatedAt: toIsoOrNull(req.updatedAt) || new Date().toISOString(),
    deliveryDate: toIsoOrNull(req.deliveryDate),
    dispensedAt: toIsoOrNull(req.dispensedAt),
    receivedAt: toIsoOrNull(req.receivedAt),
    transportSignedAt: toIsoOrNull(req.transportSignedAt),
    accountingSignedAt: toIsoOrNull(req.accountingSignedAt),
    returnRequestedAt: toIsoOrNull(req.returnRequestedAt),
  }));

  return (
    <RequisitionsClient
      initialRequisitions={serializedRequisitions}
      currentUserId={session.id}
      currentUserFullName={session.fullName || ''}
      canSignAccounting={canSignAccounting}
      canSignTransport={!isAccountingUser}
      isAccountingUser={isAccountingUser}
      isTransportUser={isTransportUser}
      savedAccountingSignatureUrl={savedAccountingSignatureUrl}
      savedTransportSignatureUrl={savedTransportSignatureUrl}
    />
  );
}
