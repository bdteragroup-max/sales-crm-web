import React from 'react';
import StoreFulfillForm from './StoreFulfillForm';
import { getUser } from '@/app/lib/dal';
import { getRequisitionById } from '@/app/actions/requisitions';
import { Package } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'รายละเอียดใบเบิก/ยืมของ - TeraSales',
};

export default async function StoreRequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const res = await getRequisitionById(id);
  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">ไม่พบคำขอใบเบิก/ยืมของ</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/store/requisitions"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr;
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-red-600" />
            จัดของ/ส่งมอบ วัสดุอุปกรณ์
          </h1>
          <p className="text-gray-500 mt-1">ตรวจสอบรายการและยืนยันการรับของ</p>
        </div>
      </div>

      <StoreFulfillForm requisition={requisition} />
    </div>
  );
}
