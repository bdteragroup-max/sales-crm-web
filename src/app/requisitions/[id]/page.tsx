import React from 'react';
import { getUser } from '@/app/lib/dal';
import { getRequisitionById } from '@/app/actions/requisitions';
import { Package, Printer } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'รายละเอียดใบเบิก/ยืมของ - TeraSales',
};

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const res = await getRequisitionById(id);
  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">ไม่พบคำขอใบเบิก/ยืมของ</div>;
  }

  // Authorization: Only Requester or Approver can view their own, or maybe we just allow it since it's a known URL.
  // We'll let it be viewable if they have the link for now, but usually we restrict it:
  if (requisition.requesterId !== session.id && requisition.approverId !== session.id) {
    return <div className="p-8 text-center text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
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
              รายละเอียดใบเบิก/ยืมวัสดุอุปกรณ์
            </h1>
            <p className="text-gray-500 mt-1">ข้อมูลการขอเบิก/ยืมวัสดุอุปกรณ์ของคุณ</p>
          </div>
        </div>
        
        <Link 
          href={`/requisitions/${requisition.id}/pdf`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold text-sm transition-colors"
        >
          <Printer size={18} />
          พิมพ์ PDF
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 mt-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">รายละเอียดใบเบิก/ยืมของ</h2>
          <span className={`px-3 py-1 text-sm font-bold rounded-full ${
            requisition.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
            requisition.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {requisition.status === 'COMPLETED' ? 'รับของแล้ว' : 
             requisition.status === 'APPROVED' ? 'รอจัดของ/ส่งมอบ' : 'รออนุมัติ'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">เลขที่ใบเบิก</p>
            <p className="font-bold text-gray-900">{requisition.requisitionNumber}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">วันที่</p>
            <p className="font-bold text-gray-900">{new Date(requisition.date).toLocaleDateString('th-TH')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">บริษัท</p>
            <p className="font-bold text-gray-900">{requisition.company}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">รายการเบิก/ยืม</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                  <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">รายละเอียด</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">จำนวน</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">หน่วย</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">งานที่ใช้</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(requisition.items as any[] || []).map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.detail}</td>
                    <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                    <td className="px-4 py-3 text-gray-700">{item.job}</td>
                    <td className="px-4 py-3 text-gray-700">{item.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 justify-around pt-6 border-t border-gray-100">
          <div className="flex flex-col items-center">
            <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ผู้ขอเบิก</label>
            <div className="w-[200px] h-[80px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
               {requisition.requesterSignatureUrl ? (
                 <img src={requisition.requesterSignatureUrl} alt="Requester Signature" className="max-h-[70px] object-contain" />
               ) : (
                 <span className="text-gray-400">ไม่มีลายเซ็น</span>
               )}
            </div>
            <p className="text-gray-900 font-medium mt-3">({requisition.requester?.fullName || 'Unknown'})</p>
          </div>

          <div className="flex flex-col items-center">
            <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ผู้อนุมัติ</label>
            <div className="w-[200px] h-[80px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
               {requisition.approverSignatureUrl ? (
                 <img src={requisition.approverSignatureUrl} alt="Approver Signature" className="max-h-[70px] object-contain" />
               ) : (
                 <span className="text-gray-400">ไม่มีลายเซ็น</span>
               )}
            </div>
            <p className="text-gray-900 font-medium mt-3">({requisition.approver?.fullName || 'Unknown'})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
