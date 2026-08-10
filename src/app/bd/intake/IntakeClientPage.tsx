"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBDWorkTypes, createBDProject, getParentBDProjects } from '@/app/actions/bd';

export default function IntakeClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParentId = searchParams.get('parentId') || '';

  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [parentProjects, setParentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    workTypeId: '',
    customWorkType: '',
    urgency: 'Normal',
    deadline: '',
    intakeDate: new Date().toISOString().split('T')[0],
    parentId: initialParentId,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const [workTypesRes, parentsRes] = await Promise.all([
        getBDWorkTypes(),
        getParentBDProjects()
      ]);

      if (workTypesRes.success && workTypesRes.data) {
        setWorkTypes(workTypesRes.data);
        if (workTypesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, workTypeId: workTypesRes.data[0].id }));
        }
      }
      
      if (parentsRes.success && parentsRes.data) {
        setParentProjects(parentsRes.data);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.objective || !formData.workTypeId) {
      setError('กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน');
      return;
    }
    setError('');
    setSubmitting(true);

    const res = await createBDProject({
      name: formData.name,
      objective: formData.objective,
      workTypeId: formData.workTypeId,
      customWorkType: formData.customWorkType,
      urgency: formData.urgency,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
      intakeDate: formData.intakeDate ? new Date(formData.intakeDate) : undefined,
      parentId: formData.parentId || undefined
    });

    setSubmitting(false);

    if (res.success) {
      router.push('/bd/dashboard?msg=brief_submitted');
    } else {
      setError(res.error || 'เกิดข้อผิดพลาดบางอย่าง');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดฟอร์ม...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">ฟอร์มแจ้งงานพัฒนาธุรกิจ (BD Intake)</h1>
          <p className="text-red-100 mt-1">ส่งข้อกำหนดการทำงานหรือคำขอให้ทีมพัฒนาธุรกิจ</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ / คำร้องขอ *</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              placeholder="เช่น ขยายสาขาเชียงใหม่"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วัตถุประสงค์ / รายละเอียด *</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all h-32"
              placeholder="อธิบายสิ่งที่ต้องทำและผลลัพธ์ที่ต้องการ..."
              value={formData.objective}
              onChange={e => setFormData({...formData, objective: e.target.value})}
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน *</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                value={formData.workTypeId}
                onChange={e => setFormData({...formData, workTypeId: e.target.value})}
              >
                {workTypes.map(wt => (
                  <option key={wt.id} value={wt.id}>{wt.name}</option>
                ))}
                <option value="OTHER">อื่นๆ (โปรดระบุ)</option>
              </select>
              {formData.workTypeId === 'OTHER' && (
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 mt-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="ระบุประเภทงาน..."
                  value={formData.customWorkType}
                  onChange={e => setFormData({...formData, customWorkType: e.target.value})}
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ความเร่งด่วน</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                value={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.value})}
              >
                <option value="Normal">ปกติ</option>
                <option value="High">ด่วน</option>
                <option value="Urgent">ด่วนมาก</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับงาน (Intake Date)</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                value={formData.intakeDate}
                onChange={e => setFormData({...formData, intakeDate: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">กำหนดส่ง (ไม่บังคับ)</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">เว้นว่างไว้หากไม่มีกำหนดส่งที่แน่นอน</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ส่วนของโครงการหลัก (ไม่บังคับ)</label>
            <select 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
              value={formData.parentId}
              onChange={e => setFormData({...formData, parentId: e.target.value})}
            >
              <option value="">-- ไม่ใช่โครงการย่อย --</option>
              {parentProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">ระบุหากงานนี้เป็นโครงการย่อย (Sub-project) ของโครงการหลัก</p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังส่ง...
                </>
              ) : 'ส่งข้อมูล (Brief)'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
