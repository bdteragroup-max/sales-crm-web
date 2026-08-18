"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateServiceCallLog } from "@/app/actions/service-calls";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Calendar } from "lucide-react";
import Swal from "sweetalert2";

export default function ServiceCallDetailClient({ initialData, currentUser }: { initialData: any, currentUser: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: initialData.status || "Received notification",
    analyzedCause: initialData.analyzedCause || "",
    recommendedSolution: initialData.recommendedSolution || "",
    followUpDate: initialData.followUpDate ? new Date(initialData.followUpDate).toISOString().split('T')[0] : "",
    notes: initialData.notes || ""
  });

  const canEdit = currentUser.role === "Service Engineer MGR" || 
                  currentUser.role === "Service Engineer MGR." || 
                  currentUser.role === "SUPER_ADMIN" || 
                  initialData.responsibleId === currentUser.id || 
                  initialData.createdBy === currentUser.id;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      Swal.fire({ icon: 'error', title: 'ไม่มีสิทธิ์', text: 'คุณสามารถแก้ไขได้เฉพาะรายการที่คุณรับผิดชอบหรือสร้างเองเท่านั้น' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        followUpDate: formData.followUpDate || null
      };
      await updateServiceCallLog(initialData.id, payload);
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
      router.refresh();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถบันทึกข้อมูลได้' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/service/calls" className="text-[#ff2301] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> กลับหน้ารายการ
        </Link>
        <div className="text-gray-500">Case No. <span className="font-bold text-gray-800">{initialData.caseNumber}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Read Only Case Info */}
        <div className="lg:col-span-1 bg-gray-50 p-6 rounded shadow border">
          <h2 className="text-lg font-bold border-b pb-2 mb-4">ข้อมูลการรับแจ้ง</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block">วันที่รับแจ้ง</label>
              <div className="font-medium">{new Date(initialData.receivedDate).toLocaleDateString('th-TH')}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block">บริษัท / ลูกค้า</label>
              <div className="font-medium">{initialData.companyName}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block">ชื่อผู้ติดต่อ</label>
              <div className="font-medium">{initialData.contactName}</div>
              {initialData.contactPhone && <div className="text-sm text-gray-600">โทร/Line: {initialData.contactPhone}</div>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block">โมเดล Inverter</label>
              <div className="font-medium">{initialData.inverterModel}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block">อาการที่พบ (ลูกค้าแจ้ง)</label>
              <div className="font-medium bg-white p-2 border rounded mt-1 whitespace-pre-wrap text-sm">
                {initialData.reportedIssue}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block">ผู้รับเรื่อง (สร้างเอกสาร)</label>
              <div className="font-medium text-sm">{initialData.creator?.fullName || 'ไม่ทราบ'}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block">ผู้รับผิดชอบงานซ่อม/ตรวจสอบ</label>
              <div className="font-medium text-sm text-[#ff2301]">{initialData.responsible?.fullName || initialData.responsibleName || 'ยังไม่ระบุ'}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2 bg-white rounded shadow p-6 border">
          <h2 className="text-xl font-bold mb-6 border-b pb-4">อัปเดตสถานะและข้อมูลการซ่อม</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะปัจจุบัน *</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none disabled:bg-gray-100"
                >
                  <option value="Received notification">เปิดเคส</option>
                  <option value="System running smoothly">ปิดเคส (ระบบทำงานปกติ)</option>
                  <option value="Customer has not yet made changes">รอติดตาม (ลูกค้ายังไม่แก้ไข)</option>
                  <option value="System still has issues">กำลังดำเนินการ (ระบบยังมีปัญหา)</option>
                  <option value="Machine broken">ส่งซ่อม/เปลี่ยน (เครื่องเสีย)</option>
                  <option value="Motor problem">ปัญหามอเตอร์</option>
                  <option value="Low water level in the well">ปัญหาสภาพแวดล้อม (น้ำในบ่อน้อย)</option>
                  <option value="Waiting for on-site inspection">รอนัดหมายเข้าตรวจสอบ</option>
                  {/* If the status came from an Excel import and isn't one of the standard ones above, preserve it */}
                  {!["Received notification", "System running smoothly", "Customer has not yet made changes", "System still has issues", "Machine broken", "Motor problem", "Low water level in the well", "Waiting for on-site inspection"].includes(formData.status) && (
                    <option value={formData.status}>{formData.status} (ข้อมูลเก่า)</option>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ต้องการติดตามผล (Follow-up)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full border rounded p-2 pl-9 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none disabled:bg-gray-100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">ระบบจะแจ้งเตือนเมื่อถึงกำหนด (ถ้าเคสยังไม่ปิด)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สาเหตุที่วิเคราะห์พบ</label>
              <textarea 
                name="analyzedCause"
                rows={3}
                value={formData.analyzedCause}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="อธิบายสาเหตุของปัญหา..."
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วิธีแก้ไข / ข้อเสนอแนะให้ลูกค้า</label>
              <textarea 
                name="recommendedSolution"
                rows={3}
                value={formData.recommendedSolution}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="ระบุสิ่งที่ให้ลูกค้าดำเนินการ หรือวิธีการแก้ไข..."
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุภายใน</label>
              <textarea 
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                disabled={!canEdit}
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none disabled:bg-gray-100"
              />
            </div>

            {canEdit && (
              <div className="flex justify-end pt-4 border-t">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#ff2301] text-white px-6 py-2 rounded shadow hover:bg-red-700 disabled:bg-red-300"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  บันทึกอัปเดต
                </button>
              </div>
            )}
            
            {!canEdit && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 mt-4">
                คุณสามารถเรียกดูข้อมูลนี้ได้เท่านั้น (Read-Only) เนื่องจากคุณไม่ใช่ผู้รับผิดชอบงานนี้
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
