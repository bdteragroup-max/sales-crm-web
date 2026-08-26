import React from 'react';
import Link from 'next/link';
import { Package, Search, Filter, CheckCircle, Printer } from 'lucide-react';
import { getMaterialRequisitions } from '@/app/actions/requisitions';
import { getUser } from '@/app/lib/dal';

export const metadata = {
  title: 'รายการเบิก/ยืมวัสดุอุปกรณ์ - เวิร์กสเปซคลังสินค้า',
};

export default async function StoreRequisitionsPage() {
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  // Warehouse only sees Approved and Completed, wait, we can just fetch all or filter
  // It's probably best they see everything but focus on APPROVED.
  const res = await getMaterialRequisitions({
    status: { in: ['APPROVED', 'COMPLETED'] }
  });

  const requisitions = res.success ? res.data : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-red-600" />
            รายการเบิก/ยืมวัสดุอุปกรณ์
          </h1>
          <p className="text-gray-500 mt-1">คลังสินค้า: จัดเตรียมและส่งมอบอุปกรณ์ตามคำขอ</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-700">เลขที่ใบเบิก</th>
                <th className="px-6 py-4 font-bold text-gray-700">วันที่</th>
                <th className="px-6 py-4 font-bold text-gray-700">บริษัท</th>
                <th className="px-6 py-4 font-bold text-gray-700">ผู้ขอเบิก</th>
                <th className="px-6 py-4 font-bold text-gray-700">สถานะ</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requisitions && requisitions.length > 0 ? (
                requisitions.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{req.requisitionNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(req.date).toLocaleDateString('th-TH')}</td>
                    <td className="px-6 py-4 text-gray-600">{req.company}</td>
                    <td className="px-6 py-4 text-gray-600">{req.requester?.fullName || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      {req.status === 'APPROVED' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">รอจัดของ/รอรับ</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">รับของแล้ว</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <Link 
                        href={`/requisitions/${req.id}/pdf`}
                        target="_blank"
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="พิมพ์ PDF"
                      >
                        <Printer size={18} />
                      </Link>
                      <Link
                        href={`/store/requisitions/${req.id}`}
                        className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${req.status === 'APPROVED'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {req.status === 'APPROVED' ? 'จัดของ/ส่งมอบ' : 'ดูรายละเอียด'}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    ไม่มีรายการที่รอการจัดของ
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
