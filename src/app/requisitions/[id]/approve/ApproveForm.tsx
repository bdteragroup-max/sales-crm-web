"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { approveMaterialRequisition, updateRequisitionStatus } from '@/app/actions/requisitions';
import { Save, Loader2, Eraser, XCircle, Upload } from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function ApproveForm({ requisition, currentUser }: { requisition: any, currentUser: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const sigPad = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSignature(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = () => {
    if (uploadedSignature) {
      setUploadedSignature(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      sigPad.current?.clear();
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let signatureDataUrl = '';
    
    if (uploadedSignature) {
      signatureDataUrl = uploadedSignature;
    } else {
      if (sigPad.current?.isEmpty()) {
        alert("กรุณาลงลายมือชื่อผู้อนุมัติ หรืออัปโหลดรูปลายเซ็น");
        return;
      }
      signatureDataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    }

    setLoading(true);

    const res = await approveMaterialRequisition(requisition.id, signatureDataUrl);

    if (res.success) {
      router.push('/requisitions');
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error);
      setLoading(false);
    }
  };

  const handleRejectClick = () => {
    setIsConfirmOpen(true);
  };

  const executeReject = async () => {
    setIsConfirmOpen(false);
    setRejecting(true);
    const res = await updateRequisitionStatus(requisition.id, "REJECTED");
    if (res.success) {
      router.push('/requisitions');
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error);
      setRejecting(false);
    }
  };

  return (
    <form onSubmit={handleApprove} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 mt-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">อนุมัติคำขอเบิก/ยืมของ</h2>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full">รอการอนุมัติ</span>
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
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">ผู้ขอเบิก</p>
          <p className="font-bold text-gray-900">{requisition.requester.fullName}</p>
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
          <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ลายมือชื่อผู้ขอเบิก</label>
          <div className="w-[300px] h-[120px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
             {requisition.requesterSignatureUrl ? (
               <img src={requisition.requesterSignatureUrl} alt="Requester Signature" className="max-h-[100px] object-contain" />
             ) : (
               <span className="text-gray-400">ไม่มีลายเซ็น</span>
             )}
          </div>
          <div className="mt-3 text-center">
            <p className="text-gray-900 font-medium">({requisition.requester.fullName})</p>
            <p className="text-gray-500 text-xs">ผู้ขอเบิก</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ลายมือชื่อผู้อนุมัติ</label>
          <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-gray-50 relative group flex items-center justify-center min-h-[120px] w-[300px]">
            {uploadedSignature ? (
              <img src={uploadedSignature} alt="Uploaded Signature" className="max-h-[100px] object-contain" />
            ) : (
              <SignatureCanvas 
                ref={sigPad}
                canvasProps={{
                  className: 'w-[300px] h-[120px] cursor-crosshair'
                }}
              />
            )}
            
            <div className="absolute top-2 right-2 flex gap-1">
              {!uploadedSignature && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 bg-white shadow-sm border border-gray-200 rounded-md text-gray-500 hover:text-blue-600 transition-colors"
                  title="อัปโหลดรูปลายเซ็น"
                >
                  <Upload size={14} />
                </button>
              )}
              <button 
                type="button"
                onClick={clearSignature}
                className="p-1 bg-white shadow-sm border border-gray-200 rounded-md text-gray-500 hover:text-red-600 transition-colors"
                title="ลบลายเซ็น"
              >
                <Eraser size={14} />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="mt-3 text-center">
            <p className="text-gray-900 font-medium">({currentUser.fullName})</p>
            <p className="text-gray-500 text-xs">ผู้อนุมัติ</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button 
          type="button"
          disabled={loading || rejecting}
          onClick={handleRejectClick}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-700 font-bold hover:bg-red-100 rounded-xl transition-colors mr-3"
        >
          {rejecting ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
          ไม่อนุมัติ
        </button>
        <button 
          type="submit"
          disabled={loading || rejecting}
          className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          อนุมัติรายการ
        </button>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeReject}
        title="ยืนยันการไม่อนุมัติ"
        message="คุณแน่ใจหรือไม่ว่าต้องการไม่อนุมัติคำขอเบิก/ยืมนี้?"
        confirmText="ยืนยัน"
        variant="danger"
      />
    </form>
  );
}
