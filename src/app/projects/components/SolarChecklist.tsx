"use client";

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  PenTool,
  Plus,
  Trash2,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  HV_CHECKLIST,
  POST_INSTALL_PHOTOS,
  PRE_WORK_CHECKLIST,
  toBkkDateTimeLocalValue,
  type SolarChecklistFormState,
  type SolarChecklistItemDef,
  type SolarUserBasic,
} from '@/app/lib/solarChecklistConfig';
import SurveySignatureBox from '@/app/sales/surveys/components/SurveySignatureBox';

type ChecklistSectionKey = 'preChecklist' | 'photoChecklist' | 'hvChecklist';
type ChecklistListField = 'workSummary' | 'siteProblems';

interface SolarChecklistProps<T extends SolarChecklistFormState = SolarChecklistFormState> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  currentUser?: SolarUserBasic | null;
}

export default function SolarChecklist<T extends SolarChecklistFormState = SolarChecklistFormState>({
  formData,
  setFormData,
  currentUser,
}: SolarChecklistProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadKey, setUploadKey] = useState<{ section: ChecklistSectionKey; key: string } | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setNowTimestamp = (field: 'siteCheckInTime' | 'siteCheckOutTime') => {
    const formatted = toBkkDateTimeLocalValue(new Date());
    setFormData((prev) => ({ ...prev, [field]: formatted }));
  };

  const handleCheckboxChange = (section: ChecklistSectionKey, key: string) => {
    setFormData((prev) => {
      const sectionData = prev[section] || {};
      return {
        ...prev,
        [section]: { ...sectionData, [key]: !sectionData[key] },
      };
    });
  };

  const handleToggleAllSection = (
    section: ChecklistSectionKey,
    items: SolarChecklistItemDef[],
    markChecked: boolean
  ) => {
    setFormData((prev) => {
      const nextSection = { ...(prev[section] || {}) };
      items.forEach((item) => {
        nextSection[item.key] = markChecked;
      });
      return { ...prev, [section]: nextSection };
    });
  };

  const handleListChange = (field: ChecklistListField, index: number, value: string) => {
    setFormData((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addListItem = (field: ChecklistListField) => {
    setFormData((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      return { ...prev, [field]: [...arr, ''] };
    });
  };

  const removeListItem = (field: ChecklistListField, index: number) => {
    setFormData((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  };

  const triggerUpload = (section: ChecklistSectionKey, key: string) => {
    setUploadKey({ section, key });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const uploadSingleFile = async (file: File): Promise<string> => {
    let publicUrl = '';
    try {
      const supabase = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(filename, file, { contentType: file.type, upsert: false });

      if (!uploadError && uploadData?.path) {
        const { data: urlData } = supabase.storage
          .from('uploadsService')
          .getPublicUrl(uploadData.path);
        publicUrl = urlData.publicUrl;
      }
    } catch {
      // Fallback to /api/upload below
    }

    if (!publicUrl) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'uploadsService');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success || !json?.url) {
        throw new Error(json?.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
      }
      publicUrl = json.url;
    }

    return publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0 || !uploadKey) return;

    const oversized = files.find((f) => f.size > 50 * 1024 * 1024);
    if (oversized) {
      alert(`ไฟล์ "${oversized.name}" ขนาดใหญ่เกิน 50MB`);
      setUploadKey(null);
      return;
    }

    const { section, key } = uploadKey;
    setUploadingKey(key);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadSingleFile(file);
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => {
          const existingImages = Array.isArray(prev.checklistImages?.[key])
            ? prev.checklistImages[key].filter(Boolean)
            : [];
          return {
            ...prev,
            [section]: { ...(prev[section] || {}), [key]: true },
            checklistImages: {
              ...(prev.checklistImages || {}),
              [key]: [...existingImages, ...uploadedUrls],
            },
          };
        });
      }
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingKey(null);
      setUploadKey(null);
    }
  };

  const removeImage = (key: string, index: number) => {
    setFormData((prev) => {
      const existingImages = Array.isArray(prev.checklistImages?.[key])
        ? prev.checklistImages[key].filter(Boolean)
        : [];
      const nextArr = existingImages.filter((_: string, idx: number) => idx !== index);
      return {
        ...prev,
        checklistImages: {
          ...(prev.checklistImages || {}),
          [key]: nextArr,
        },
      };
    });
  };

  const renderChecklistSection = (
    items: SolarChecklistItemDef[],
    sectionKey: ChecklistSectionKey,
    oddFullWidth = false
  ) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
        {items.map((item, idx) => {
          const checked = Boolean(formData[sectionKey]?.[item.key]);
          const itemImages: string[] = (formData.checklistImages?.[item.key] || []).filter(
            Boolean
          );
          const isLastOdd = oddFullWidth && items.length % 2 === 1 && idx === items.length - 1;

          return (
            <div
              key={item.key}
              className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                checked
                  ? 'bg-emerald-50/35 border-emerald-200'
                  : 'bg-gray-50/60 border-gray-200'
              } ${isLastOdd ? 'md:col-span-2' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCheckboxChange(sectionKey, item.key)}
                    className="w-4 h-4 rounded border-gray-300 text-[#ff2301] focus:ring-[#ff2301] mt-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800 leading-snug">
                    {item.label}
                  </span>
                </label>
                <span className="text-[11px] font-mono font-bold text-gray-500 shrink-0">
                  {itemImages.length} รูป
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {itemImages.map((imgUrl, pIdx) => (
                  <div
                    key={`${item.key}-edit-${pIdx}`}
                    className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-white shrink-0"
                  >
                    <Image
                      src={imgUrl}
                      alt={`${item.label} #${pIdx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(item.key, pIdx)}
                      aria-label="ลบรูปภาพ"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/95 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 flex items-center justify-center shadow-xs transition cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={uploadingKey === item.key}
                  onClick={() => triggerUpload(sectionKey, item.key)}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#ff2301] bg-white hover:bg-red-50/40 text-gray-500 hover:text-[#ff2301] flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {uploadingKey === item.key ? (
                    <Loader2 size={18} className="animate-spin text-[#ff2301]" />
                  ) : (
                    <>
                      <Camera size={17} />
                      <span className="text-[10px] font-bold">+ เพิ่มรูป</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Section 1: Check-in / Check-out & Team ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center gap-2">
          <Users size={16} className="text-[#ff2301]" />
          <h3 className="font-black text-sm text-gray-900">
            1. ข้อมูลการเข้า-ออกหน้างาน และทีมงาน (Check-in & Team)
          </h3>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-gray-700">
                เวลาเริ่มงาน (Check-in Time)
              </label>
              <button
                type="button"
                onClick={() => setNowTimestamp('siteCheckInTime')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:text-red-700 cursor-pointer"
              >
                <Clock size={11} /> ใช้เวลาตอนนี้
              </button>
            </div>
            <input
              type="datetime-local"
              name="siteCheckInTime"
              value={
                typeof formData.siteCheckInTime === 'string' && formData.siteCheckInTime.includes('T') && formData.siteCheckInTime.length === 16
                  ? formData.siteCheckInTime
                  : toBkkDateTimeLocalValue(formData.siteCheckInTime)
              }
              onChange={handleInputChange}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-gray-700">
                เวลาจบงาน (Check-out Time)
              </label>
              <button
                type="button"
                onClick={() => setNowTimestamp('siteCheckOutTime')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:text-red-700 cursor-pointer"
              >
                <Clock size={11} /> ใช้เวลาตอนนี้
              </button>
            </div>
            <input
              type="datetime-local"
              name="siteCheckOutTime"
              value={
                typeof formData.siteCheckOutTime === 'string' && formData.siteCheckOutTime.includes('T') && formData.siteCheckOutTime.length === 16
                  ? formData.siteCheckOutTime
                  : toBkkDateTimeLocalValue(formData.siteCheckOutTime)
              }
              onChange={handleInputChange}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              หัวหน้าทีม (Team Leader / Supervisor)
            </label>
            <input
              type="text"
              name="siteSupervisor"
              value={formData.siteSupervisor || ''}
              onChange={handleInputChange}
              placeholder="ระบุชื่อหัวหน้าทีมคุมงาน"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              ประเภทระบบไฟฟ้า (Voltage System)
            </label>
            <label className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50/50 cursor-pointer min-h-[42px] sm:min-h-[38px]">
              <span className="flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-900">
                <Zap size={15} className="text-orange-600 shrink-0" />
                มีระบบ High Voltage (22-33-115 kVA)
              </span>
              <input
                type="checkbox"
                checked={Boolean(formData.isHighVoltage)}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    isHighVoltage: !prev.isHighVoltage,
                  }))
                }
                className="w-4 h-4 rounded border-orange-300 text-[#ff2301] focus:ring-[#ff2301] cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold text-gray-700">
              รายชื่อทีมงาน (Team Members)
            </label>
            <textarea
              name="siteTeamMembers"
              rows={2}
              value={formData.siteTeamMembers || ''}
              onChange={handleInputChange}
              placeholder="รายชื่อทีมวิศวกร / ช่างผู้ร่วมปฏิบัติงาน"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Pre-work Checklist ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-[#ff2301]" />
            <h3 className="font-black text-sm text-gray-900">
              2. รายการตรวจสอบก่อนเริ่มงาน (Pre-work Checklist)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAllSection('preChecklist', PRE_WORK_CHECKLIST, true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
            >
              <Check size={12} /> ติ๊กครบทั้งหมด
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {renderChecklistSection(PRE_WORK_CHECKLIST, 'preChecklist', true)}
        </div>
      </section>

      {/* ── Section 3: Post-Install Photos ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-[#ff2301]" />
            <h3 className="font-black text-sm text-gray-900">
              3. รูปถ่ายหลังติดตั้ง (Post-Installation Photos)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleToggleAllSection('photoChecklist', POST_INSTALL_PHOTOS, true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
          >
            <Check size={12} /> ติ๊กครบทั้งหมด
          </button>
        </div>
        <div className="p-4 sm:p-5">
          {renderChecklistSection(POST_INSTALL_PHOTOS, 'photoChecklist', false)}
        </div>
      </section>

      {/* ── Section 4: High Voltage Checklist (Conditional) ── */}
      {formData.isHighVoltage && (
        <section className="bg-white rounded-2xl border border-orange-200 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-orange-50/70 border-b border-orange-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-orange-600" />
              <h3 className="font-black text-sm text-orange-900">
                4. ตรวจสอบระบบไฟฟ้าแรงสูง (High Voltage Checklist)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleToggleAllSection('hvChecklist', HV_CHECKLIST, true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold cursor-pointer"
            >
              <CheckCircle2 size={12} /> ติ๊กครบทั้งหมด
            </button>
          </div>
          <div className="p-4 sm:p-5">
            {renderChecklistSection(HV_CHECKLIST, 'hvChecklist', false)}
          </div>
        </section>
      )}

      {/* ── Section 5: Work Summary, Problems & Remaining Work ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center gap-2">
          <Wrench size={16} className="text-emerald-600" />
          <h3 className="font-black text-sm text-gray-900">
            5. สรุปผลการปฏิบัติงาน ปัญหาหน้างาน และงานค้าง
          </h3>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2.5 bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/80">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-800">
                สรุปงานที่ทำสำเร็จ (Work Summary)
              </label>
              <button
                type="button"
                onClick={() => addListItem('workSummary')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#ff2301] hover:text-red-700 cursor-pointer"
              >
                <Plus size={13} /> เพิ่มรายการ
              </button>
            </div>
            <div className="space-y-2">
              {(Array.isArray(formData.workSummary) ? formData.workSummary : []).map(
                (item: string, idx: number) => (
                  <div key={`work-${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleListChange('workSummary', idx, e.target.value)}
                      placeholder={`รายการงานที่ ${idx + 1}`}
                      className="flex-1 px-3 py-2 bg-white text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem('workSummary', idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-gray-200 bg-white cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              )}
              {(!formData.workSummary || formData.workSummary.length === 0) && (
                <button
                  type="button"
                  onClick={() => addListItem('workSummary')}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 bg-white rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:border-gray-400 cursor-pointer"
                >
                  + เพิ่มรายการงานที่ทำเสร็จแล้ว
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5 bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/80">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-800">
                ปัญหา / อุปสรรคหน้างาน (Site Problems)
              </label>
              <button
                type="button"
                onClick={() => addListItem('siteProblems')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#ff2301] hover:text-red-700 cursor-pointer"
              >
                <Plus size={13} /> เพิ่มรายการ
              </button>
            </div>
            <div className="space-y-2">
              {(Array.isArray(formData.siteProblems) ? formData.siteProblems : []).map(
                (item: string, idx: number) => (
                  <div key={`prob-${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleListChange('siteProblems', idx, e.target.value)}
                      placeholder={`ปัญหาที่พบข้อที่ ${idx + 1}`}
                      className="flex-1 px-3 py-2 bg-white text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem('siteProblems', idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-gray-200 bg-white cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              )}
              {(!formData.siteProblems || formData.siteProblems.length === 0) && (
                <button
                  type="button"
                  onClick={() => addListItem('siteProblems')}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 bg-white rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:border-gray-400 cursor-pointer"
                >
                  + เพิ่มรายการปัญหาหน้างาน
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold text-gray-700">
              งานที่เหลือ / นัดหมายครั้งถัดไป (Remaining Work)
            </label>
            <textarea
              name="remainingWork"
              rows={2}
              value={formData.remainingWork || ''}
              onChange={handleInputChange}
              placeholder="ระบุรายละเอียดงานที่ต้องดำเนินการต่อหรือรายการตรวจสอบเพิ่มเติม"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
            />
          </div>
        </div>
      </section>

      {/* ── Section 6: Digital Signatures ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center gap-2">
          <PenTool size={16} className="text-[#ff2301]" />
          <h3 className="font-black text-sm text-gray-900">
            6. ลายเซ็นรับรองการเข้างาน / ส่งมอบงาน (Digital Signatures)
          </h3>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SurveySignatureBox
            title="ผู้ควบคุมงาน (Project Supervisor)"
            subtitle="วาดลายเซ็นหรืออัปโหลดรูปภาพลายเซ็น"
            signerName={formData.siteSupervisor || currentUser?.fullName}
            value={formData.supervisorSignUrl || null}
            savedKeyName={formData.siteSupervisor || currentUser?.fullName}
            accentColor="slate"
            onChange={(nextUrl) =>
              setFormData((prev) => ({ ...prev, supervisorSignUrl: nextUrl }))
            }
          />
          <SurveySignatureBox
            title="ตัวแทนลูกค้า / ผู้รับมอบงาน (Customer)"
            subtitle="วาดลายเซ็นหรืออัปโหลดรูปภาพลายเซ็น"
            signerName="ตัวแทนลูกค้า"
            value={formData.customerSignUrl || null}
            accentColor="red"
            onChange={(nextUrl) =>
              setFormData((prev) => ({ ...prev, customerSignUrl: nextUrl }))
            }
          />
        </div>
      </section>
    </div>
  );
}
