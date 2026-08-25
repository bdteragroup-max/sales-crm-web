import React from 'react';
import Link from 'next/link';
import { Package, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getMyRequisitions } from '@/app/actions/requisitions';
import { getUser } from '@/app/lib/dal';
import RequisitionListActions from './RequisitionListActions';

export const metadata = {
  title: 'My Requisitions - TeraSales',
};

export default async function RequisitionsPage() {
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const res = await getMyRequisitions();
  const requisitions = res.success ? res.data : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold flex items-center gap-1"><Clock size={12}/> รออนุมัติ</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold flex items-center gap-1"><CheckCircle size={12}/> อนุมัติแล้ว (รอจัดของ)</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold flex items-center gap-1"><CheckCircle size={12}/> รับของแล้ว</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-semibold flex items-center gap-1"><XCircle size={12}/> ไม่อนุมัติ</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-semibold">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-red-600" />
            เบิก/ยืมวัสดุอุปกรณ์
          </h1>
          <p className="text-gray-500 mt-1">รายการขอเบิก/ยืมวัสดุและอุปกรณ์ของคุณทั้งหมด</p>
        </div>
        <Link 
          href="/requisitions/new" 
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          สร้างใบเบิก/ยืมใหม่
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-700">เลขที่ใบเบิก</th>
                <th className="px-6 py-4 font-bold text-gray-700">วันที่</th>
                <th className="px-6 py-4 font-bold text-gray-700">บริษัท</th>
                <th className="px-6 py-4 font-bold text-gray-700">สถานะ</th>
                <th className="px-6 py-4 font-bold text-gray-700">ผู้ขอเบิก</th>
                <th className="px-6 py-4 font-bold text-gray-700">ผู้อนุมัติ</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requisitions && requisitions.length > 0 ? (
                requisitions.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{req.requisitionNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(req.date).toLocaleDateString('th-TH')}</td>
                    <td className="px-6 py-4 text-gray-600">{req.company}</td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-gray-600">{req.requester?.fullName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-600">{req.approver?.fullName || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <RequisitionListActions req={req} currentUserId={session.id} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    ไม่พบข้อมูลใบเบิก/ยืม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
