import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { isSuperUser, canViewAll } from '@/app/lib/roleHelper';
import StoreRequisitionsClient from './StoreRequisitionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'รายการเบิกและยืมวัสดุอุปกรณ์ - เวิร์กสเปซคลังสินค้า',
};

export default async function StoreRequisitionsPage() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isSuper = isSuperUser(user.role);
  const isStoreRole = ['store', 'สโตร์', 'คลังสินค้า', 'warehouse', 'admin', 'ซุปเปอร์แอดมิน'].some((r) => userRoleStr.includes(r));
  const isPurchasingRole = ['purchasing', 'purchase', 'procurement', 'จัดซื้อ'].some((r) => userRoleStr.includes(r));
  const canAccess = isSuper || canViewAll(user.role) || isStoreRole || isPurchasingRole;

  if (!canAccess) {
    redirect('/dashboard');
  }

  const canManageStore = isSuper || isStoreRole;

  // Fetch material requisitions
  const requisitions = await prisma.materialRequisition.findMany({
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

  const serializedRequisitions = requisitions.map(req => ({
    ...req,
    date: req.date ? req.date.toISOString() : null,
    createdAt: req.createdAt ? req.createdAt.toISOString() : null,
    updatedAt: req.updatedAt ? req.updatedAt.toISOString() : null,
    deliveryDate: req.deliveryDate ? req.deliveryDate.toISOString() : null,
    dispensedAt: req.dispensedAt ? req.dispensedAt.toISOString() : null,
    receivedAt: req.receivedAt ? req.receivedAt.toISOString() : null,
    returnRequestedAt: req.returnRequestedAt ? req.returnRequestedAt.toISOString() : null,
    items: Array.isArray(req.items) ? (req.items as any[]) : [],
    requesterName: req.requester?.fullName || 'ไม่ระบุ',
    approverName: req.approver?.fullName || 'ไม่ระบุ'
  }));

  const savedUserSignatureUrl =
    requisitions.find((r) => r.storeStaffId === user.id && r.storeStaffSignatureUrl)?.storeStaffSignatureUrl ||
    requisitions.find((r) => r.approverId === user.id && r.approverSignatureUrl)?.approverSignatureUrl ||
    requisitions.find((r) => r.requesterId === user.id && r.requesterSignatureUrl)?.requesterSignatureUrl ||
    null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      <StoreRequisitionsClient
        initialRequisitions={serializedRequisitions}
        userName={user.fullName || 'เจ้าหน้าที่สโตร์'}
        userRole={user.role}
        isSuperAdmin={isSuper}
        canManageStore={canManageStore}
        savedUserSignatureUrl={savedUserSignatureUrl}
      />
    </div>
  );
}
