"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { updateMaterialRequisition } from '@/app/actions/requisitions';
import { Plus, Trash2, Save, Loader2, Eraser } from 'lucide-react';

interface UserOption {
  id: string;
  fullName: string;
}

interface RequisitionItem {
  detail: string;
  quantity: number;
  unit: string;
  job: string;
  remark: string;
}

export default function RequisitionEditForm({ req, users, currentUser }: { req: any, users: UserOption[], currentUser: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<any>(null);

  const [date, setDate] = useState(req.date ? new Date(req.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [company, setCompany] = useState(req.company || 'Group');
  const [approverId, setApproverId] = useState(req.approverId || '');

  const [approverSearch, setApproverSearch] = useState(users.find(u => u.id === req.approverId)?.fullName || '');
  const [isApproverOpen, setIsApproverOpen] = useState(false);
  const approverRef = useRef<HTMLDivElement>(null);
  
  const [showResignPad, setShowResignPad] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (approverRef.current && !approverRef.current.contains(event.target as Node)) {
        setIsApproverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredApprovers = users.filter(u => 
    u.fullName.toLowerCase().includes(approverSearch.toLowerCase())
  );

  const [items, setItems] = useState<RequisitionItem[]>(req.items && req.items.length > 0 ? req.items : [
    { detail: '', quantity: 1, unit: '', job: '', remark: '' }
  ]);

  const addItem = () => {
    setItems([...items, { detail: '', quantity: 1, unit: '', job: '', remark: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const clearSignature = () => {
    sigPad.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.detail.trim())) {
      alert("กรุณากรอกรายละเอียดให้ครบถ้วน");
      return;
    }
    if (!approverId) {
      alert("กรุณาเลือกผู้อนุมัติ");
      return;
    }
    if (showResignPad && sigPad.current?.isEmpty()) {
      alert("กรุณาลงลายมือชื่อผู้ขอเบิก");
      return;
    }

    setLoading(true);
    let signatureDataUrl = null;
    if (showResignPad) {
      signatureDataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    }

    const res = await updateMaterialRequisition(req.id, {
      date,
      company,
      items,
      approverId,
      ...(signatureDataUrl && { requesterSignatureUrl: signatureDataUrl }),
    });

    if (res.success) {
      router.push('/requisitions');
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">วันที่เบิก/ยืม</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">บริษัท</label>
          <div className="flex items-center gap-6 mt-3">
            {['Group', 'Electric', 'Power'].map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="company"
                  value={c}
                  checked={company === c}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="font-medium text-gray-700">{c}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-700">รายการเบิก/ยืม</label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
          >
            <Plus size={16} /> เพิ่มรายการ
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center">ลำดับ</th>
                <th className="px-4 py-3 font-semibold text-gray-700">รายการเบิก/รายละเอียด</th>
                <th className="px-4 py-3 font-semibold text-gray-700 w-24">จำนวน</th>
                <th className="px-4 py-3 font-semibold text-gray-700 w-32">หน่วย</th>
                <th className="px-4 py-3 font-semibold text-gray-700 w-48">งานที่ใช้</th>
                <th className="px-4 py-3 font-semibold text-gray-700 w-48">หมายเหตุ</th>
                <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.detail}
                      onChange={(e) => updateItem(index, 'detail', e.target.value)}
                      placeholder="ระบุรายละเอียด..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm text-center"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      placeholder="เช่น ชิ้น, กล่อง"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.job}
                      onChange={(e) => updateItem(index, 'job', e.target.value)}
                      placeholder="โปรเจค/แผนก..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.remark}
                      onChange={(e) => updateItem(index, 'remark', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      disabled={items.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Approver Selection */}
      <div className="max-w-md" ref={approverRef}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">ผู้อนุมัติ</label>
        <div className="relative">
          <input
            type="text"
            value={approverSearch}
            onChange={(e) => {
              setApproverSearch(e.target.value);
              setIsApproverOpen(true);
              if (approverId) setApproverId('');
            }}
            onFocus={() => setIsApproverOpen(true)}
            placeholder="พิมพ์เพื่อค้นหาผู้อนุมัติ..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
            required={!approverId}
          />
          {isApproverOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredApprovers.length > 0 ? (
                filteredApprovers.map(u => (
                  <div
                    key={u.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-50 text-gray-700"
                    onClick={() => {
                      setApproverId(u.id);
                      setApproverSearch(u.fullName);
                      setIsApproverOpen(false);
                    }}
                  >
                    {u.fullName}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-sm">ไม่พบผู้อนุมัติ</div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ระบบจะแจ้งเตือนไปยังผู้อนุมัติที่เลือกผ่านหน้าเว็บ
        </p>
      </div>

      {/* Signature Section */}
      <div className="pt-4 flex flex-col items-center">
        <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">ลายมือชื่อผู้ขอเบิก</label>
        
        {!showResignPad && req.requesterSignatureUrl ? (
          <div className="flex flex-col items-center">
            <div className="w-[400px] h-[150px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
               <img src={req.requesterSignatureUrl} alt="Requester Signature" className="max-h-[120px] object-contain" />
            </div>
            <button
              type="button"
              onClick={() => setShowResignPad(true)}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              แก้ไขลายเซ็น
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-gray-50 relative group">
            <SignatureCanvas
              ref={sigPad}
              canvasProps={{
                className: 'w-full max-w-[400px] h-[150px] cursor-crosshair'
              }}
            />
            <button
              type="button"
              onClick={clearSignature}
              className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
              title="ลบลายเซ็น"
            >
              <Eraser size={16} />
            </button>
            {req.requesterSignatureUrl && (
              <button
                type="button"
                onClick={() => setShowResignPad(false)}
                className="absolute bottom-2 right-2 px-3 py-1 bg-gray-200 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                ยกเลิกการเซ็นใหม่
              </button>
            )}
          </div>
        )}
        <div className="mt-3 text-center">
          <p className="text-gray-900 font-medium">({currentUser.fullName})</p>
          <p className="text-gray-500 text-xs">ผู้ขอเบิก</p>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors mr-3"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-8 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {loading ? 'กำลังบันทึก...' : 'บันทึกคำขอ'}
        </button>
      </div>

    </form>
  );
}
