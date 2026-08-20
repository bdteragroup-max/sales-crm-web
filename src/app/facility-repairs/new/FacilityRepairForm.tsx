"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFacilityRepair } from '@/app/actions/facility-repairs';
import { Save, Loader2, Building2 } from 'lucide-react';

export default function FacilityRepairForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    equipmentName: '',
    issueDetail: '',
    location: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.equipmentName || !formData.issueDetail || !formData.location) {
        throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน (Please fill all fields)");
      }

      await createFacilityRepair({
        equipmentName: formData.equipmentName,
        issueDetail: formData.issueDetail,
        location: formData.location
      });

      setSuccess(true);
      router.refresh();
      
      setTimeout(() => {
        setSuccess(false);
        setFormData({ equipmentName: '', issueDetail: '', location: '' });
      }, 3000);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center shadow-sm max-w-4xl mx-auto mb-10">
        <Building2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">ส่งคำร้องสำเร็จ!</h2>
        <p className="text-green-600 mb-6">คำร้องแจ้งซ่อมสถานที่ของคุณได้ถูกส่งไปยังทีมช่างแล้ว</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-4xl mx-auto mb-10">
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อุปกรณ์/ปัญหา (Equipment / Issue Title) <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="equipmentName"
            value={formData.equipmentName}
            onChange={handleChange}
            placeholder="เช่น แอร์ไม่เย็น, หลอดไฟเสีย, น้ำรั่ว"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">สถานที่/ห้อง (Location / Room) <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="เช่น ห้องประชุม 1, ห้องน้ำหญิงชั้น 2, โต๊ะทำงานแผนกขาย"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียดเพิ่มเติม (Issue Detail) <span className="text-red-500">*</span></label>
          <textarea
            name="issueDetail"
            value={formData.issueDetail}
            onChange={handleChange}
            placeholder="อธิบายปัญหาที่คุณพบให้ชัดเจนที่สุด เพื่อให้ทีมช่างสามารถเตรียมอุปกรณ์ได้ถูกต้อง"
            rows={5}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors resize-none"
            required
          ></textarea>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium mr-4 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center disabled:opacity-70"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> กำลังส่งข้อมูล...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> ส่งคำร้อง</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
