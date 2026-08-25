import React from 'react';
import ApproveForm from './ApproveForm';
import { getUser } from '@/app/lib/dal';
import { getRequisitionById } from '@/app/actions/requisitions';
import { Package, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'อนุมัติใบเบิก/ยืมของ - TeraSales',
};

export default async function ApproveRequisitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const res = await getRequisitionById(id);
  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">ไม่พบคำขอใบเบิก/ยืมของ หรือคุณไม่มีสิทธิ์เข้าถึง</div>;
  }

  // Ensure only the designated approver can access
  if (requisition.approverId !== session.id) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-gray-600 mb-6">เฉพาะผู้อนุมัติที่ถูกระบุไว้เท่านั้นที่สามารถดำเนินการได้</p>
        <Link href="/requisitions" className="text-red-600 font-semibold hover:underline">กลับไปหน้ารายการของฉัน</Link>
      </div>
    );
  }

  if (requisition.status !== 'PENDING_APPROVAL') {
    return (
      <div className="p-8 text-center">
         <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่สามารถดำเนินการได้</h2>
         <p className="text-gray-600 mb-6">รายการนี้ได้รับการพิจารณาไปแล้ว หรือมีสถานะ: {requisition.status}</p>
         <Link href="/requisitions" className="text-red-600 font-semibold hover:underline">กลับไปหน้ารายการของฉัน</Link>
      </div>
    );
  }

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
            อนุมัติใบเบิก/ยืมของ
          </h1>
          <p className="text-gray-500 mt-1">ตรวจสอบและลงนามอนุมัติคำขอ</p>
        </div>
      </div>

      <ApproveForm requisition={requisition} currentUser={session} />
    </div>
  );
}
