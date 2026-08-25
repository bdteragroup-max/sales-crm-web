"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRequisitionStatus } from '@/app/actions/requisitions';
import { CheckCircle, Loader2, Printer } from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';
import Link from 'next/link';

export default function StoreFulfillForm({ requisition }: { requisition: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleCompleteClick = () => {
    setIsConfirmOpen(true);
  };

  const executeComplete = async () => {
    setLoading(true);
    setIsConfirmOpen(false);
    const res = await updateRequisitionStatus(requisition.id, "COMPLETED");
    if (res.success) {
      router.push('/store/requisitions');
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 mt-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">รายละเอียดใบเบิก/ยืมของ</h2>
        <span className={`px-3 py-1 text-sm font-bold rounded-full ${requisition.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
          {requisition.status === 'COMPLETED' ? 'รับของแล้ว' : 'รอจัดของ/ส่งมอบ'}
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
              {requisition.items.map((item: any, index: number) => (
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
          <p className="text-gray-900 font-medium mt-3">({requisition.requester.fullName})</p>
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
          <p className="text-gray-900 font-medium mt-3">({requisition.approver.fullName})</p>
        </div>
      </div>

      {requisition.status === 'APPROVED' && (
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <Link
            href={`/requisitions/${requisition.id}/pdf`}
            target="_blank"
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold transition-colors"
          >
            <Printer size={20} />
            พิมพ์ PDF
          </Link>

          <button
            type="button"
            disabled={loading}
            onClick={handleCompleteClick}
            className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            รับของเรียบร้อย
          </button>
        </div>
      )}
      {requisition.status !== 'APPROVED' && (
        <div className="flex justify-end pt-6 border-t border-gray-100">
          <Link
            href={`/requisitions/${requisition.id}/pdf`}
            target="_blank"
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl font-bold transition-colors"
          >
            <Printer size={20} />
            พิมพ์ PDF
          </Link>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeComplete}
        title="ยืนยันการรับของ"
        message="ยืนยันการจัดเตรียมและส่งมอบของเรียบร้อยแล้วใช่หรือไม่?"
        confirmText="ยืนยัน"
        variant="success"
      />
    </div>
  );
}
