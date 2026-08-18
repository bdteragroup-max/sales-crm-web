"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceCallLog } from "@/app/actions/service-calls";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function NewServiceCallClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    companyName: "",
    contactName: "",
    contactPhone: "",
    inverterModel: "",
    reportedIssue: "",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createServiceCallLog(formData);
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: 'สร้างรายการแจ้งปัญหาเรียบร้อยแล้ว',
        timer: 1500,
        showConfirmButton: false
      });
      router.push("/service/calls");
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/service/calls" className="text-[#ff2301] hover:underline flex items-center gap-1 w-fit">
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>
      </div>

      <div className="bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-6 border-b pb-4">บันทึกแจ้งปัญหาใหม่ (New Service Call)</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับแจ้ง *</label>
              <input
                type="date"
                name="receivedDate"
                required
                value={formData.receivedDate}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">โมเดล Inverter *</label>
              <input
                type="text"
                name="inverterModel"
                required
                placeholder="เช่น VT-xxx"
                value={formData.inverterModel}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">บริษัท / ลูกค้า *</label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ติดต่อ *</label>
              <input
                type="text"
                name="contactName"
                required
                value={formData.contactName}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ / Line ID</label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ปัญหาที่พบ (อาการ) *</label>
            <textarea
              name="reportedIssue"
              required
              rows={4}
              value={formData.reportedIssue}
              onChange={handleChange}
              className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="w-full border rounded p-2 focus:ring focus:ring-[#ff2301]/20 focus:border-[#ff2301] focus:outline-none text-gray-600"
            />
          </div>

          <div className="flex justify-end gap-4 border-t pt-6 mt-6">
            <Link href="/service/calls" className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-[#ff2301] text-white px-6 py-2 rounded shadow hover:bg-red-700 disabled:bg-red-400"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
