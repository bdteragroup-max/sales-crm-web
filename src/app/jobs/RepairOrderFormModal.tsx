"use client";

import React, { useState, useEffect } from "react";
import { X, Printer, Save, Plus, Trash2 } from "lucide-react";

type RepairItem = {
  type: string;
  brand: string;
  model: string;
  size: string;
  serial: string;
  qty: number;
  remark: string;
};

type Props = {
  jobId: string;
  jobData: any; // Context from the job list to prepopulate some fields
  onClose: () => void;
  onPrint: (repairOrderData: any) => void;
};

export default function RepairOrderFormModal({ jobId, jobData, onClose, onPrint }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    invoiceNo: "",
    deliveryMethod: "",
    deliveryNoteNo: "",
    receiverName: "",
    senderName: jobData?.customerName || "",
    handoverRef: jobData?.sellerName || "",
    phoneNumber: "",
    workType: "ซ่อม",
    forwardedBy: "",
    symptoms: "",
    settings: "",
    receivedDate: new Date().toISOString().split('T')[0],
    sentDate: "",
    items: [] as RepairItem[],
    checklist: {
      frontPanel: false,
      topPanel: false,
      leftSide: false,
      rightSide: false,
      inside: false,
      nameplate: false,
      bottom: false,
      terminalNut: false,
      termCover: false,
      cover: false,
      video: false,
    }
  });

  useEffect(() => {
    const fetchRepairOrder = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/repair-order`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setFormData(prev => ({
              ...prev,
              ...data,
              items: data.items || [],
              checklist: data.checklist || prev.checklist,
              receivedDate: data.receivedDate ? data.receivedDate.split('T')[0] : prev.receivedDate,
              sentDate: data.sentDate ? data.sentDate.split('T')[0] : prev.sentDate,
            }));
          } else {
             // Prepopulate from job data if new
             setFormData(prev => ({
               ...prev,
               workType: jobData.jobType || "ซ่อม",
               symptoms: jobData.item || "", // Item desc might have symptoms
               senderName: prev.senderName || jobData.customerName || "",
               handoverRef: prev.handoverRef || jobData.sellerName || "",
             }));
             // Add one empty item by default
             addItem();
          }
        }
      } catch (err) {
        console.error("Error fetching repair order:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepairOrder();
  }, [jobId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleChecklistChange = (key: string) => {
    setFormData({
      ...formData,
      checklist: { ...formData.checklist, [key]: !formData.checklist[key as keyof typeof formData.checklist] }
    });
  };

  const handleItemChange = (index: number, field: keyof RepairItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSave = async (andPrint = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/repair-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const savedData = await res.json();
        if (andPrint) {
          onPrint(savedData);
        } else {
          alert("บันทึกข้อมูลเรียบร้อยแล้ว");
        }
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg">กำลังโหลดข้อมูล...</div></div>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl my-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">จัดการใบรับซ่อม (Repair Order) - {jobData?.jobNumber}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">เลขที่เอกสาร (จะใช้เลข Job ถ้าเว้นว่าง)</label>
                <input type="text" disabled value={jobData?.jobNumber} className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">เลข Invoice</label>
                <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ส่งซ่อมโดย (ขนส่ง/ตัวเอง)</label>
                <input type="text" name="deliveryMethod" value={formData.deliveryMethod} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ผู้ส่งซ่อม (ลูกค้า - ชื่อพนักงาน)</label>
                <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">เบอร์โทร</label>
                <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">รูปแบบงาน (เช่น ซ่อม)</label>
                <input type="text" name="workType" value={formData.workType} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">เลขที่ใบส่งสินค้า</label>
                <input type="text" name="deliveryNoteNo" value={formData.deliveryNoteNo} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ผู้รับซ่อม (บริษัท - ผู้รับเรื่อง)</label>
                <input type="text" name="receiverName" value={formData.receiverName} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">เลขส่งที่รับมอบซ่อม (เช่น คุณ...)</label>
                <input type="text" name="handoverRef" value={formData.handoverRef} onChange={handleChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <hr className="my-6 border-gray-100" />

          {/* Items Table */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800 text-sm">รายการสินค้า</h3>
              <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-brand-red bg-red-50 px-2 py-1 rounded">
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                  <tr>
                    <th className="p-2 w-10 text-center">ลำดับ</th>
                    <th className="p-2">ประเภทสินค้า</th>
                    <th className="p-2">ยี่ห้อ</th>
                    <th className="p-2">รุ่น/โมเดล</th>
                    <th className="p-2">ขนาด</th>
                    <th className="p-2 w-48">Serial No.</th>
                    <th className="p-2 w-16">จำนวน</th>
                    <th className="p-2">หมายเหตุ</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2 text-center text-gray-500">{index + 1}</td>
                      <td className="p-2"><input type="text" value={item.type} onChange={e => handleItemChange(index, 'type', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" /></td>
                      <td className="p-2"><input type="text" value={item.brand} onChange={e => handleItemChange(index, 'brand', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" /></td>
                      <td className="p-2"><input type="text" value={item.model} onChange={e => handleItemChange(index, 'model', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" /></td>
                      <td className="p-2"><input type="text" value={item.size} onChange={e => handleItemChange(index, 'size', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" /></td>
                      <td className="p-2"><input type="text" value={item.serial} onChange={e => handleItemChange(index, 'serial', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" /></td>
                      <td className="p-2"><input type="number" min="1" value={item.qty} onChange={e => handleItemChange(index, 'qty', parseInt(e.target.value)||1)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-center" /></td>
                      <td className="p-2"><input type="text" value={item.remark} onChange={e => handleItemChange(index, 'remark', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" /></td>
                      <td className="p-2 text-center">
                        <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {formData.items.length === 0 && (
                    <tr><td colSpan={9} className="p-4 text-center text-gray-400 text-xs">ไม่มีรายการ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">อาการเสีย</label>
              <textarea name="symptoms" value={formData.symptoms} onChange={handleChange} rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">การตั้งค่า</label>
              <textarea name="settings" value={formData.settings} onChange={handleChange} rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <hr className="my-6 border-gray-100" />

          {/* Checklist */}
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-3">รายการตรวจสอบสภาพ</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'frontPanel', label: 'ด้านหน้า' },
                { key: 'topPanel', label: 'ด้านบน' },
                { key: 'leftSide', label: 'ด้านข้าง (ซ้าย)' },
                { key: 'rightSide', label: 'ด้านข้าง (ขวา)' },
                { key: 'inside', label: 'ด้านใน' },
                { key: 'nameplate', label: 'Nameplate' },
                { key: 'bottom', label: 'ด้านล่าง' },
                { key: 'terminalNut', label: 'Terminal / Nut' },
                { key: 'termCover', label: 'Term. cover' },
                { key: 'cover', label: 'ฝาครอบ / Cover' },
                { key: 'video', label: 'Video' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.checklist[item.key as keyof typeof formData.checklist]} 
                    onChange={() => handleChecklistChange(item.key)}
                    className="w-4 h-4 text-brand-red border-gray-300 rounded focus:ring-brand-red"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={() => handleSave(false)} 
            disabled={saving}
            className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm flex items-center gap-2"
          >
            <Save size={16} /> บันทึกข้อมูล
          </button>
          <button 
            onClick={() => handleSave(true)} 
            disabled={saving}
            className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center gap-2"
          >
            <Printer size={16} /> บันทึกและพิมพ์ PDF
          </button>
        </div>
      </div>
    </div>
  );
}
