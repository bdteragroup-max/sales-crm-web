"use client";

import React, { useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import Card from '@/app/sales/components/Card';

const PRE_WORK_CHECKLIST = [
  { key: 'verify_site', label: '1. ตรวจสอบพื้นที่ทำงานตรงตามแบบติดตั้ง' },
  { key: 'photos_before', label: '2. ถ่ายรูปสถานที่ก่อนทำการติดตั้ง' },
  { key: 'ppe_check', label: '3. ตรวจสอบชุดทำงาน PPE ครบถ้วน' },
  { key: 'toolbox_talk', label: '4. ประชุม Toolbox Talk ก่อนเริ่มงาน' },
  { key: 'tools_crane', label: '5. ตรวจสอบเครื่องมือ / รถเครน / นั่งร้าน' },
];

const POST_INSTALL_PHOTOS = [
  { key: 'install_site', label: '1. รูปสถานที่ติดตั้ง' },
  { key: 'pv_panel', label: '2. แผง PV (Nameplate + มุมกว้าง)' },
  { key: 'inverter', label: '3. อินเวอร์เตอร์ (Nameplate + จุดติดตั้ง)' },
  { key: 'ac_cabinet', label: '4. ตู้ AC (เบรกเกอร์, SPD)' },
  { key: 'connection_points', label: '5. จุดเชื่อมต่อ (เบรกเกอร์, CT)' },
  { key: 'zero_export', label: '6. อุปกรณ์กันย้อน (Zero Export)' },
  { key: 'protection_devices', label: '7. อุปกรณ์กันไฟรั่ว (RCCB, RCBO, CB)' },
  { key: 'overall', label: '8. รูปภาพรวมจุดติดตั้ง (มุมกว้าง)' },
];

const HV_CHECKLIST = [
  { key: 'main_bus_bar', label: '1. จุดต่อเข้า Main Bus Bar / MDB' },
  { key: 'zero_export_hv', label: '2. กันย้อน High Voltage' },
  { key: 'transformer', label: '3. หม้อแปลง (Nameplate + kVA)' },
  { key: 'relay_breaker', label: '4. Relay + Circuit Breaker + CT/PT/UPS' },
];

interface SolarChecklistProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function SolarChecklist({ formData, setFormData }: SolarChecklistProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ key: string, index: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (section: string, key: string) => {
    setFormData((prev: any) => {
      const sectionData = prev[section] || {};
      return {
        ...prev,
        [section]: { ...sectionData, [key]: !sectionData[key] }
      };
    });
  };

  // Generic JSON string array updates for Summary/Problems
  const handleListChange = (field: string, index: number, value: string) => {
    setFormData((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addListItem = (field: string) => {
    setFormData((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      return { ...prev, [field]: [...arr, ""] };
    });
  };

  const removeListItem = (field: string, index: number) => {
    setFormData((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  };

  // Upload Images
  const triggerUpload = (key: string, index: number) => {
    setUploadTarget({ key, index });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    if (file.size > 50 * 1024 * 1024) {
      alert(`ไฟล์ขนาดใหญ่เกินไป (สูงสุด 50MB)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      // Dynamic import to avoid SSR issues
      const supabase = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('uploadsService')
        .upload(filename, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('uploadsService').getPublicUrl(uploadData.path);

      const { key, index } = uploadTarget;
      setFormData((prev: any) => {
        const newImages = { ...(prev.checklistImages || {}) };
        if (!newImages[key]) newImages[key] = [];
        while (newImages[key].length <= index) newImages[key].push("");
        newImages[key][index] = publicUrl;
        return { ...prev, checklistImages: newImages };
      });
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (key: string, index: number) => {
    setFormData((prev: any) => {
      const newImages = { ...(prev.checklistImages || {}) };
      if (newImages[key]) {
        const arr = [...newImages[key]];
        arr[index] = "";
        newImages[key] = arr;
      }
      return { ...prev, checklistImages: newImages };
    });
  };

  // (Signatures removed)

  const renderPhotoGrid = (items: typeof POST_INSTALL_PHOTOS, sectionKey: string) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        {items.map((item) => (
          <div key={item.key} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200">
            <label className="flex items-start gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={!!(formData[sectionKey] && formData[sectionKey][item.key])}
                onChange={() => handleCheckboxChange(sectionKey, item.key)}
                className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red mt-0.5"
              />
              {item.label}
            </label>

            {/* Show image upload only if checked */}
            {formData[sectionKey] && formData[sectionKey][item.key] && (
              <div className="pl-6 flex gap-2">
                {[0, 1].map(pIdx => {
                  const imgUrl = formData.checklistImages?.[item.key]?.[pIdx];
                  return (
                    <div key={pIdx} className="relative flex flex-col items-center w-[80px] group">
                      <div
                        onClick={() => triggerUpload(item.key, pIdx)}
                        className={`w-[80px] h-[80px] rounded-xl border flex items-center justify-center cursor-pointer overflow-hidden transition-all ${!imgUrl ? 'bg-slate-50 border-dashed border-slate-300 hover:border-slate-500' : 'bg-white border-solid border-slate-200'}`}
                      >
                        {imgUrl ? (
                          <img src={imgUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-slate-400">
                            {uploading && uploadTarget?.key === item.key && uploadTarget?.index === pIdx ? (
                              <span className="text-xs animate-pulse">...</span>
                            ) : (
                              <Camera size={20} />
                            )}
                          </div>
                        )}
                      </div>
                      {imgUrl && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(item.key, pIdx); }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Section 1: Check-in */}
      <Card title="Section 1: Check-in (เริ่มเข้างาน)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">เวลาเริ่มงาน (Check-in Time)</label>
            <input type="datetime-local" name="siteCheckInTime" value={formData.siteCheckInTime ? new Date(new Date(formData.siteCheckInTime).getTime() - new Date(formData.siteCheckInTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">หัวหน้าทีม (Team Leader / Supervisor)</label>
            <input type="text" name="siteSupervisor" value={formData.siteSupervisor || ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" placeholder="ปล่อยว่างเพื่อดึงชื่อ Project Manager อัตโนมัติ" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">รายชื่อทีมงาน (Team Members)</label>
            <textarea name="siteTeamMembers" rows={2} value={formData.siteTeamMembers || ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" placeholder="ปล่อยว่างเพื่อดึงรายชื่อทีมงานหลักอัตโนมัติ (นาย A, นาย B, ...)" />
          </div>
        </div>
      </Card>

      {/* Section 2: Pre-work checklist */}
      <Card title="Section 2: Pre-work Checklist (ก่อนเริ่มงาน)">
        {renderPhotoGrid(PRE_WORK_CHECKLIST, 'preChecklist')}
      </Card>

      {/* Section 3: Post-install photos */}
      <Card title="Section 3: Post-Installation Photos (ภาพถ่ายหลังติดตั้ง)">
        {renderPhotoGrid(POST_INSTALL_PHOTOS, 'photoChecklist')}
      </Card>

      {/* Section 4: High voltage */}
      <Card title="Section 4: High Voltage 22-33-115 kVA">
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-900 bg-red-50 p-3 rounded-lg border border-red-100">
            <input
              type="checkbox"
              checked={!!formData.isHighVoltage}
              onChange={() => setFormData((prev: any) => ({ ...prev, isHighVoltage: !prev.isHighVoltage }))}
              className="w-5 h-5 text-brand-red rounded border-red-300 focus:ring-brand-red"
            />
            มีระบบ High Voltage (Enable High Voltage Checklist)
          </label>

          {formData.isHighVoltage && renderPhotoGrid(HV_CHECKLIST, 'hvChecklist')}
        </div>
      </Card>

      {/* Section 5: Check-out */}
      <Card title="Section 5: Check-out & Summary (จบงาน)">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เวลาจบงาน (Check-out Time)</label>
              <input type="datetime-local" name="siteCheckOutTime" value={formData.siteCheckOutTime ? new Date(new Date(formData.siteCheckOutTime).getTime() - new Date(formData.siteCheckOutTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">งานที่เหลือ (Remaining Work)</label>
              <input type="text" name="remainingWork" value={formData.remainingWork || ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Work Summary Array */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700">สรุปงานที่ทำ (Work Summary)</label>
                <button type="button" onClick={() => addListItem('workSummary')} className="text-xs text-brand-red font-bold">+ เพิ่มรายการ</button>
              </div>
              {(Array.isArray(formData.workSummary) ? formData.workSummary : []).map((item: string, idx: number) => (
                <div key={`work-${idx}`} className="flex gap-2">
                  <input type="text" value={item} onChange={(e) => handleListChange('workSummary', idx, e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  <button type="button" onClick={() => removeListItem('workSummary', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
              {(!formData.workSummary || formData.workSummary.length === 0) && (
                <button type="button" onClick={() => addListItem('workSummary')} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:text-gray-600">เพิ่มรายการงานแรก</button>
              )}
            </div>

            {/* Site Problems Array */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700">ปัญหาอุปสรรค (Problems/Issues)</label>
                <button type="button" onClick={() => addListItem('siteProblems')} className="text-xs text-brand-red font-bold">+ เพิ่มรายการ</button>
              </div>
              {(Array.isArray(formData.siteProblems) ? formData.siteProblems : []).map((item: string, idx: number) => (
                <div key={`prob-${idx}`} className="flex gap-2">
                  <input type="text" value={item} onChange={(e) => handleListChange('siteProblems', idx, e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  <button type="button" onClick={() => removeListItem('siteProblems', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
              {(!formData.siteProblems || formData.siteProblems.length === 0) && (
                <button type="button" onClick={() => addListItem('siteProblems')} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:text-gray-600">เพิ่มรายการปัญหาแรก</button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
