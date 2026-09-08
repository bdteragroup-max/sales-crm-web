import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import StoreRequisitionsClient from './StoreRequisitionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'รายการเบิกและยืมวัสดุอุปกรณ์ - เวิร์กสเปซคลังสินค้า',
};

export default async function StoreRequisitionsPage() {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isStore = ['store', 'สโตร์', 'คลังสินค้า', 'warehouse', 'admin'].some((r) => userRoleStr.includes(r));
  
  if (!isStore) {
    redirect('/dashboard');
  }

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
    take: 300
  });

  const serializedRequisitions = requisitions.map(req => ({
    ...req,
    date: req.date ? req.date.toISOString() : null,
    createdAt: req.createdAt ? req.createdAt.toISOString() : null,
    updatedAt: req.updatedAt ? req.updatedAt.toISOString() : null,
    items: Array.isArray(req.items) ? (req.items as any[]) : [],
    requesterName: req.requester?.fullName || 'ไม่ระบุ',
    approverName: req.approver?.fullName || 'ไม่ระบุ'
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      <StoreRequisitionsClient
        initialRequisitions={serializedRequisitions}
        userName={user.fullName || 'เจ้าหน้าที่สโตร์'}
      />
    </div>
  );
}
