import React from 'react';
import RequisitionForm from './RequisitionForm';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { Package } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'สร้างใบเบิก/ยืมของ - TeraSales',
};

export default async function NewRequisitionPage() {
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  // Fetch users for approver dropdown. Typically this might be restricted to managers,
  // but for now, we'll fetch all active users.
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: 'asc' }
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/requisitions"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr;
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-red-600" />
            สร้างใบเบิก/ยืมของ
          </h1>
          <p className="text-gray-500 mt-1">กรอกข้อมูลเพื่อส่งคำขอเบิกหรือยืมวัสดุอุปกรณ์</p>
        </div>
      </div>

      <RequisitionForm users={users} currentUser={session} />
    </div>
  );
}
