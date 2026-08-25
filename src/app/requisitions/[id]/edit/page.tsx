import React from 'react';
import RequisitionEditForm from './RequisitionEditForm';
import { getUser, getActiveUsers } from '@/app/lib/dal';
import { getRequisitionById } from '@/app/actions/requisitions';
import { Edit } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'แก้ไขใบเบิก/ยืมของ - TeraSales',
};

export default async function EditRequisitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUser();
  if (!session) redirect('/login');

  const [res, users] = await Promise.all([
    getRequisitionById(id),
    getActiveUsers()
  ]);

  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">ไม่พบคำขอใบเบิก/ยืมของ</div>;
  }

  // Security checks
  if (requisition.requesterId !== session.id) {
    return <div className="p-8 text-center text-red-500">คุณไม่มีสิทธิ์แก้ไขคำขอนี้</div>;
  }

  if (requisition.status !== 'PENDING_APPROVAL') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">ไม่สามารถแก้ไขคำขอที่ได้รับการอนุมัติหรือรับของแล้วได้</p>
        <Link href="/requisitions" className="text-blue-600 hover:underline">กลับไปหน้ารายการ</Link>
      </div>
    );
  }

  // Map users for the dropdown
  const formattedUsers = users.map((u: any) => ({
    id: u.id,
    fullName: u.fullName
  }));

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
            <Edit className="text-red-600" />
            แก้ไขใบเบิก/ยืมวัสดุอุปกรณ์
          </h1>
          <p className="text-gray-500 mt-1">แก้ไขข้อมูลและรายการที่ต้องการเบิก/ยืม</p>
        </div>
      </div>

      <RequisitionEditForm req={requisition} users={formattedUsers} currentUser={session} />
    </div>
  );
}
