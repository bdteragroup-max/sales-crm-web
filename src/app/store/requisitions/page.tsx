import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import {
  getUserLatestRequisitionSignatures,
  hydrateRequisitionExtendedList,
} from '@/app/lib/requisitionSignaturesDb';
import { isSuperUser, canViewAll } from '@/app/lib/roleHelper';
import {
  isStoreRole,
  isPurchasingRole,
  isTransportRole,
  isAccountingRequisitionRole,
} from '@/app/lib/requisitionUtils';
import StoreRequisitionsClient from './StoreRequisitionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'รายการเบิกและยืมวัสดุอุปกรณ์ - เวิร์กสเปซคลังสินค้า',
};

export default async function StoreRequisitionsPage() {
  const user = await getUser();
  if (!user) redirect('/');

  const isSuper = isSuperUser(user.role);
  const isStore = isStoreRole(user.role);
  const isPurchasing = isPurchasingRole(user.role);
  const isTransport = isTransportRole(user.role);
  const isAccounting = isAccountingRequisitionRole(user.role);
  const canAccess =
    isSuper || canViewAll(user.role) || isStore || isPurchasing || isTransport || isAccounting;

  if (!canAccess) {
    redirect('/dashboard');
  }

  const canManageStore = isSuper || isStore || isPurchasing;
  const canSignAccounting = isAccounting;
  const canSignTransport =
    !isAccounting && (isSuper || isStore || isPurchasing || isTransport);

  // Fetch material requisitions
  const rawRequisitions = await prisma.materialRequisition.findMany({
    include: {
      requester: {
        select: { fullName: true }
      },
      approver: {
        select: { fullName: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 1000
  });
  const requisitions = await hydrateRequisitionExtendedList(prisma, rawRequisitions);

  const serializedRequisitions = requisitions.map(req => ({
    ...req,
    date: req.date ? req.date.toISOString() : null,
    createdAt: req.createdAt ? req.createdAt.toISOString() : null,
    updatedAt: req.updatedAt ? req.updatedAt.toISOString() : null,
    deliveryDate: req.deliveryDate ? req.deliveryDate.toISOString() : null,
    dispensedAt: req.dispensedAt ? req.dispensedAt.toISOString() : null,
    receivedAt: req.receivedAt ? req.receivedAt.toISOString() : null,
    transportSignedAt: req.transportSignedAt ? req.transportSignedAt.toISOString() : null,
    accountingSignedAt: req.accountingSignedAt ? req.accountingSignedAt.toISOString() : null,
    returnRequestedAt: req.returnRequestedAt ? req.returnRequestedAt.toISOString() : null,
    items: Array.isArray(req.items) ? (req.items as any[]) : [],
    requesterName: req.requester?.fullName || 'ไม่ระบุ',
    approverName: req.approver?.fullName || 'ไม่ระบุ'
  }));

  const {
    fallbackSignatureUrl: savedUserSignatureUrl,
    savedAccountingSignatureUrl,
    savedTransportSignatureUrl,
  } = await getUserLatestRequisitionSignatures(prisma, user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      <StoreRequisitionsClient
        initialRequisitions={serializedRequisitions}
        userName={user.fullName || 'เจ้าหน้าที่สโตร์'}
        userRole={user.role}
        currentUserId={user.id}
        isSuperAdmin={isSuper}
        canManageStore={canManageStore}
        canSignAccounting={canSignAccounting}
        canSignTransport={canSignTransport}
        isAccountingUser={isAccounting}
        isTransportUser={isTransport}
        savedUserSignatureUrl={savedUserSignatureUrl}
        savedAccountingSignatureUrl={savedAccountingSignatureUrl}
        savedTransportSignatureUrl={savedTransportSignatureUrl}
      />
    </div>
  );
}
