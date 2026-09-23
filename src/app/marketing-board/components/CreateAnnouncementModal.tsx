'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Upload, Plus, Trash2, Calendar, Users, AlertCircle, 
  Check, Clock, FileText, Image as ImageIcon, Video, HelpCircle,
  Megaphone, Tag, ShieldAlert, Sparkles, Layers, Info, CheckCircle2,
  CalendarDays, Building2, Paperclip, ChevronDown
} from 'lucide-react';
import { 
  createAnnouncement, 
  updateAnnouncement 
} from '@/app/actions/marketingBoard';
import { createClient } from '@/utils/supabase/client';
import type { 
  AnnouncementType, 
  ProductGroupType, 
  PriorityType 
} from '@/app/lib/marketingBoardTypes';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches: Array<{ id: string; name: string }>;
  editItem?: any;
  userPermissions?: any;
}

const DOCUMENT_TYPES = [
  { value: 'Promotion Artwork', label: 'ภาพสื่อโปรโมชั่น (Artwork)' },
  { value: 'Product Brochure', label: 'โบรชัวร์สินค้า (Brochure)' },
  { value: 'Catalog', label: 'แคตตาล็อกสินค้า (Catalog)' },
  { value: 'Price List', label: 'ตารางราคา (Price List)' },
  { value: 'Promotion Terms & Conditions', label: 'เงื่อนไขโปรโมชั่น (Terms)' },
  { value: 'Sales Script', label: 'สคริปต์การขาย (Sales Script)' },
  { value: 'Telesales Script', label: 'สคริปต์เทเลเซลส์ (Telesales Script)' },
  { value: 'Product Presentation', label: 'สไลด์นำเสนอสินค้า (Presentation)' },
  { value: 'Quotation Template', label: 'ใบเสนอราคาตัวอย่าง (Quotation)' },
  { value: 'Order Form', label: 'แบบฟอร์มสั่งซื้อ (Order Form)' },
  { value: 'Product Specification', label: 'สเปกสินค้า (Specification)' },
  { value: 'Video', label: 'วิดีโอ (Video)' },
  { value: 'Social Media Artwork', label: 'สื่อโซเชียลมีเดีย (Social Media)' },
  { value: 'LINE OA Material', label: 'สื่อ LINE OA' },
  { value: 'Others', label: 'อื่นๆ (Others)' }
];

export default function CreateAnnouncementModal({
  isOpen,
  onClose,
  onSuccess,
  branches,
  editItem,
  userPermissions
}: CreateAnnouncementModalProps) {
  const isEditing = !!editItem;

  // Form states
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('Promotion');
  const [productGroup, setProductGroup] = useState<ProductGroupType>('Marketing Headquarters');
  const [priority, setPriority] = useState<PriorityType>('Normal');
  const [campaignName, setCampaignName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [campaignDetails, setCampaignDetails] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [branchScope, setBranchScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [assets, setAssets] = useState<Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    documentType: string;
  }>>([]);

  // Edit specific
  const [updateNotes, setUpdateNotes] = useState('');
  const [resetAcknowledgment, setResetAcknowledgment] = useState(false);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Initialize for edit or default
  useEffect(() => {
    if (editItem) {
      setAnnouncementType(editItem.announcementType || 'Promotion');
      setProductGroup(editItem.productGroup || 'Marketing Headquarters');
      setPriority(editItem.priority || 'Normal');
      setCampaignName(editItem.campaignName || '');
      setShortDescription(editItem.shortDescription || '');
      setCampaignDetails(editItem.campaignDetails || '');
      setTermsConditions(editItem.termsConditions || '');
      setStartAt(editItem.startAt ? new Date(editItem.startAt).toISOString().substring(0, 16) : '');
      setEndAt(editItem.endAt ? new Date(editItem.endAt).toISOString().substring(0, 16) : '');
      setBranchScope(editItem.branchScope || 'ALL');
      setSelectedBranches(editItem.branches?.map((b: any) => b.branchId) || []);
      setCoverImageUrl(editItem.coverImageUrl || '');
      setContactPerson(editItem.contactPerson || '');
      setAssets(editItem.assets || []);
      setUpdateNotes('');
      setResetAcknowledgment(false);
    } else {
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(now.getMonth() + 1);

      setAnnouncementType('Promotion');
      setProductGroup('Marketing Headquarters');
      setPriority('Normal');
      setCampaignName('');
      setShortDescription('');
      setCampaignDetails('');
      setTermsConditions('');
      setStartAt(now.toISOString().substring(0, 16));
      setEndAt(oneMonthLater.toISOString().substring(0, 16));
      setBranchScope('ALL');
      setSelectedBranches([]);
      setCoverImageUrl('');
      setContactPerson('ฝ่ายการตลาดส่วนกลาง (TERA Marketing HQ)');
      setAssets([]);
      setErrorMsg(null);
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  // Helper to upload a single file directly to Supabase storage or fallback safely
  const uploadSingleFile = async (file: File): Promise<string> => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      throw new Error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป (${(file.size / (1024 * 1024)).toFixed(1)}MB) กรุณาใช้ไฟล์ขนาดไม่เกิน 50MB`);
    }

    // 1. Try direct Supabase client upload (bypasses serverless & proxy size limits)
    try {
      const supabase = createClient();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `marketing/${uniqueSuffix}-${cleanName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });

      if (!uploadError && uploadData?.path) {
        const { data: { publicUrl } } = supabase.storage
          .from('uploadsService')
          .getPublicUrl(uploadData.path);
        return publicUrl;
      }

      if (uploadError) {
        console.warn('Direct Supabase upload error, trying fallback:', uploadError);
      }
    } catch (directErr) {
      console.warn('Direct Supabase upload exception, trying fallback:', directErr);
    }

    // 2. Fallback to /api/upload
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 413 || text.includes('Request Entity Too Large') || text.includes('PAYLOAD_TOO_LARGE')) {
        throw new Error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินกว่าที่ระบบรองรับ (จำกัดไม่เกิน 50MB)`);
      }
      let errJson: any = null;
      try { errJson = JSON.parse(text); } catch {}
      throw new Error(errJson?.error || `อัปโหลดไฟล์ "${file.name}" ไม่สำเร็จ (รหัสสถานะ: ${res.status})`);
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      throw new Error(`ระบบตอบกลับไม่ถูกต้องขณะอัปโหลด "${file.name}"`);
    }

    if (!json?.success || !json?.url) {
      throw new Error(json?.error || `อัปโหลดไฟล์ "${file.name}" ไม่สำเร็จ`);
    }

    return json.url;
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicUrl = await uploadSingleFile(file);

        if (isCover) {
          setCoverImageUrl(publicUrl);
          break;
        } else {
          // Detect suggested document type
          let docType = 'Promotion Artwork';
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') docType = 'Product Brochure';
          if (ext === 'xlsx' || ext === 'xls') docType = 'Price List';
          if (ext === 'pptx') docType = 'Product Presentation';
          if (ext === 'mp4' || ext === 'mov') docType = 'Video';

          setAssets(prev => [
            ...prev,
            {
              fileName: file.name,
              fileUrl: publicUrl,
              fileSize: file.size,
              documentType: docType
            }
          ]);
        }
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      let message = err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
      if (typeof message === 'string' && (message.includes('Unexpected token') || message.includes('Request Entity Too Large') || message.includes('413'))) {
        message = 'ไฟล์ที่เลือกมีขนาดใหญ่เกินกว่าที่ระบบรองรับ กรุณาใช้ไฟล์ขนาดไม่เกิน 50MB';
      }
      setErrorMsg(message);
    } finally {
      setIsUploading(false);
      // Reset input value so re-uploading the same file works
      e.target.value = '';
    }
  };

  const handleToggleBranch = (bId: string) => {
    setSelectedBranches(prev => 
      prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]
    );
  };

  const handleSelectAllBranches = () => {
    if (selectedBranches.length === branches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(branches.map(b => b.id));
    }
  };

  const handleSubmit = async (mode: 'draft' | 'pending' | 'publish_now' | 'schedule') => {
    setErrorMsg(null);

    // Validation
    if (!campaignName.trim()) {
      setErrorMsg('กรุณากรอกชื่อแคมเปญ / โปรโมชั่น');
      return;
    }
    if (!shortDescription.trim()) {
      setErrorMsg('กรุณากรอกคำอธิบายย่อ');
      return;
    }
    if (!campaignDetails.trim()) {
      setErrorMsg('กรุณากรอกรายละเอียดแคมเปญ');
      return;
    }
    if (!startAt) {
      setErrorMsg('กรุณากำหนดวันเริ่มต้นแคมเปญ');
      return;
    }
    if (branchScope === 'SPECIFIC' && selectedBranches.length === 0) {
      setErrorMsg('กรุณาเลือกสาขาอย่างน้อย 1 สาขา เมื่อเลือกขอบเขต "เฉพาะบางสาขา"');
      return;
    }

    try {
      setSubmitting(true);

      // Defensive check: If cover image was pasted as base64 data URI, upload it to storage first
      let finalCoverUrl = coverImageUrl.trim();
      if (finalCoverUrl.startsWith('data:image/')) {
        try {
          const supabase = createClient();
          const res = await fetch(finalCoverUrl);
          const blob = await res.blob();
          const ext = finalCoverUrl.split(';')[0].split('/')[1] || 'png';
          const filename = `marketing/cover_${Date.now()}.${ext}`;
          const { data: upData, error: upErr } = await supabase.storage
            .from('uploadsService')
            .upload(filename, blob, { contentType: blob.type });

          if (!upErr && upData?.path) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploadsService')
              .getPublicUrl(upData.path);
            finalCoverUrl = publicUrl;
            setCoverImageUrl(publicUrl);
          }
        } catch (base64Err) {
          console.error('Failed to convert base64 cover image:', base64Err);
        }
      }

      if (isEditing) {
        // Calculate deleted assets
        const existingAssetIds = (editItem.assets || []).map((ea: any) => ea.id);
        const currentExistingAssetIds = assets.filter((a: any) => a.id).map((a: any) => a.id);
        const deletedAssetIds = existingAssetIds.filter((eaId: string) => !currentExistingAssetIds.includes(eaId));

        await updateAnnouncement(editItem.id, {
          announcementType,
          productGroup,
          priority,
          campaignName,
          shortDescription,
          campaignDetails,
          termsConditions,
          startAt,
          endAt: endAt || undefined,
          branchScope,
          specificBranchIds: branchScope === 'SPECIFIC' ? selectedBranches : undefined,
          coverImageUrl: finalCoverUrl,
          contactPerson,
          updateNotes: updateNotes.trim() || 'อัปเดตข้อมูลประกาศโดยฝ่ายการตลาด',
          resetAcknowledgment,
          deletedAssetIds,
          newAssets: assets.filter(a => !(editItem.assets || []).some((ea: any) => ea.id === (a as any).id))
        });
      } else {
        await createAnnouncement({
          announcementType,
          productGroup,
          priority,
          campaignName,
          shortDescription,
          campaignDetails,
          termsConditions,
          startAt,
          endAt: endAt || undefined,
          branchScope,
          specificBranchIds: branchScope === 'SPECIFIC' ? selectedBranches : undefined,
          statusMode: mode,
          coverImageUrl: finalCoverUrl,
          contactPerson,
          assets
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save announcement error:', err);
      let msg = err.message || 'ไม่สามารถบันทึกประกาศได้';
      if (typeof msg === 'string' && (msg.includes('Unexpected token') || msg.includes('Request Entity Too Large') || msg.includes('PAYLOAD_TOO_LARGE') || msg.includes('413'))) {
        msg = 'ข้อมูลหรือไฟล์แนบมีขนาดใหญ่เกินกว่าที่ระบบรองรับ กรุณาตรวจสอบขนาดไฟล์แนบ';
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Accent Gradient Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shrink-0" />

        {/* Modal Symmetrical Header */}
        <div className="px-6 py-4 md:px-8 md:py-5 border-b border-slate-200/90 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Megaphone size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  {isEditing ? 'แก้ไขประกาศแคมเปญ' : 'สร้างประกาศแคมเปญใหม่'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-red-100/70 text-red-700 border border-red-200 uppercase">
                  {isEditing ? `เวอร์ชัน ${editItem?.version || 1}` : 'แบบฟอร์มการตลาด'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดข้อมูลโปรโมชั่น ขอบเขตสาขา เงื่อนไข และแนบสื่อการขายให้ทีมเทเลเซลส์และสาขาทั่วประเทศ
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-2.5 text-red-700 text-xs md:text-sm font-semibold">
            <AlertCircle size={17} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 bg-slate-50/60 text-xs md:text-sm">
          
          {/* SECTION 1: ข้อมูลพื้นฐานแคมเปญ (Symmetrical 2-Column Grid) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Tag size={16} className="text-red-600" />
                <span>1. ข้อมูลพื้นฐานแคมเปญ (General Information)</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">ช่องที่มีเครื่องหมาย * จำเป็นต้องระบุ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Campaign Name */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    ชื่อแคมเปญ / ส่วนลด / โปรโมชั่น <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="เช่น 9.9 TERA Mega Sale, โปรแถมชุดน็อตและสายไฟ..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                {/* Announcement Type */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    ประเภทประกาศ <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value as AnnouncementType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    <option value="Promotion">โปรโมชั่นส่งเสริมการขาย (Promotion)</option>
                    <option value="Marketing Update">ข่าวสารการตลาดทั่วไป (Marketing Update)</option>
                    <option value="Product Update">อัปเดตข้อมูลสินค้าและราคา (Product Update)</option>
                    <option value="Event">กิจกรรมและอีเวนต์ (Event)</option>
                    <option value="Urgent Notice">ประกาศด่วนพิเศษ (Urgent Notice)</option>
                  </select>
                </div>

                {/* Product Group */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    กลุ่มสินค้าที่เกี่ยวข้อง <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={productGroup}
                    onChange={(e) => setProductGroup(e.target.value as ProductGroupType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    <option value="Marketing Headquarters">การตลาดส่วนกลาง (Marketing HQ)</option>
                    <option value="Inverter">กลุ่มสินค้าอินเวอร์เตอร์ (Inverter)</option>
                    <option value="BLDC / Solar Pump">กลุ่มสินค้าปั๊มน้ำโซล่าเซลล์ (BLDC / Solar Pump)</option>
                    <option value="Solar Roof">กลุ่มสินค้าโซลาร์รูฟ (Solar Roof)</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Priority */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    ระดับความสำคัญ <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('Normal')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        priority === 'Normal'
                          ? 'border-slate-800 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ปกติ (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('Important')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        priority === 'Important'
                          ? 'border-slate-900 bg-slate-800 text-white shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      สำคัญ (Important)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('Urgent')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        priority === 'Urgent'
                          ? 'border-red-600 bg-red-600 text-white shadow-2xs'
                          : 'border-red-200 bg-red-50/50 text-red-700 hover:bg-red-100/50'
                      }`}
                    >
                      ด่วนมาก (Urgent)
                    </button>
                  </div>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    ผู้ประสานงาน / ช่องทางติดต่อ
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="เช่น คุณสมชาย (ทีม Inverter) โทร: 081-xxx-xxxx, LINE: @tera"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-slate-800"
                  />
                </div>

                {/* Short Description */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    คำอธิบายโดยย่อ (แสดงบนการ์ด) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="ข้อความสรุปสั้น 1-2 บรรทัด สำหรับการ์ดหน้าบอร์ด..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: รายละเอียดและเงื่อนไขโปรโมชั่น (Symmetrical 2-Column Equal Height Grid) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText size={16} className="text-red-600" />
                <span>2. รายละเอียดและเงื่อนไขแคมเปญ (Details & Terms)</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">เนื้อหาจะแสดงในหน้าดูรายละเอียด</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Campaign Details */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  รายละเอียดแคมเปญและโปรโมชั่น <span className="text-red-600">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-1">ระบุสิทธิประโยชน์ ส่วนลด ของแถม หรือรุ่นสินค้าที่เข้าร่วม</p>
                <textarea
                  rows={6}
                  value={campaignDetails}
                  onChange={(e) => setCampaignDetails(e.target.value)}
                  placeholder="เช่น ซื้อ Inverter รุ่น 5kW รับฟรีสวิตช์ตัดไฟ DC และส่งฟรีถึงสาขา..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-slate-800 leading-relaxed font-sans bg-white"
                />
              </div>

              {/* Right Column: Terms & Conditions */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  เงื่อนไขและข้อกำหนด (Terms & Conditions)
                </label>
                <p className="text-[11px] text-slate-500 mb-1">ระบุข้อกำหนดเฉพาะ เช่น จำนวนจำกัด การจัดส่ง หรือการชำระเงิน</p>
                <textarea
                  rows={6}
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  placeholder="เช่น สงวนสิทธิ์สำหรับคำสั่งซื้อที่ชำระเงินเต็มจำนวนเท่านั้น ไม่สามารถใช้ร่วมกับคูปองอื่นได้..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-slate-800 leading-relaxed font-sans bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ระยะเวลาและขอบเขตสาขา (Symmetrical 2-Column Grid) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <CalendarDays size={16} className="text-red-600" />
                <span>3. ระยะเวลาและขอบเขตสาขา (Schedule & Branch Scope)</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">ระบบจะคำนวณสถานะอัตโนมัติ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Timeline */}
              <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Clock size={14} className="text-red-600" />
                  <span>กำหนดการแคมเปญ</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 text-xs mb-1">
                      วันและเวลาเริ่มต้น <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 text-xs mb-1">
                      วันและเวลาสิ้นสุด (เว้นว่างได้หากไม่มีกำหนด)
                    </label>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                  <Info size={14} className="text-red-600 shrink-0" />
                  <span>เมื่อถึงวันสิ้นสุด ประกาศจะย้ายไปยังแท็บ "คลังเอกสารประวัติ" อัตโนมัติ</span>
                </div>
              </div>

              {/* Right Column: Branch Scope */}
              <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Building2 size={14} className="text-red-600" />
                  <span>ขอบเขตสาขาที่ร่วมรายการ <span className="text-red-600">*</span></span>
                </div>

                {/* Symmetrical Segmented Control */}
                <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBranchScope('ALL')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      branchScope === 'ALL'
                        ? 'bg-white text-red-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 size={14} className={branchScope === 'ALL' ? 'text-red-600' : 'text-slate-400'} />
                    <span>ทุกสาขาทั่วประเทศ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBranchScope('SPECIFIC')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      branchScope === 'SPECIFIC'
                        ? 'bg-white text-red-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users size={14} className={branchScope === 'SPECIFIC' ? 'text-red-600' : 'text-slate-400'} />
                    <span>เฉพาะบางสาขา</span>
                  </button>
                </div>

                {/* Branch Multi-select (if SPECIFIC) */}
                {branchScope === 'SPECIFIC' ? (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                      <span className="font-bold text-slate-700">
                        เลือกสาขา ({selectedBranches.length}/{branches.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        className="font-bold text-red-600 hover:text-red-700 text-xs"
                      >
                        {selectedBranches.length === branches.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {branches.map(b => (
                        <label key={b.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={selectedBranches.includes(b.id)}
                            onChange={() => handleToggleBranch(b.id)}
                            className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500 border-slate-300"
                          />
                          <span className="text-slate-700 font-medium truncate">
                            {b.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-7 text-center rounded-xl bg-white border border-slate-200 text-xs text-slate-500 flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 size={20} className="text-red-600" />
                    <span className="font-semibold text-slate-800">เปิดให้ใช้งานทุกสาขาและทุกทีมขาย</span>
                    <span className="text-[11px] text-slate-400">พนักงานทุกคนสามารถเข้าถึงและดาวน์โหลดเอกสารได้</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: สื่อประชาสัมพันธ์และเอกสารแนบ (Symmetrical 2-Column Grid) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ImageIcon size={16} className="text-red-600" />
                <span>4. ภาพหน้าปกและเอกสารช่วยขาย (Media & Sales Materials)</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">รองรับรูปภาพ โบรชัวร์ ตารางราคา และวิดีโอ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Cover Image */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">
                    รูปภาพหน้าปกแคมเปญ (Cover Image - 16:9)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">อัปโหลดภาพแบนเนอร์หรือใส่ URL เพื่อแสดงหัวการ์ด</p>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="วาง URL ภาพ หรือคลิกปุ่มอัปโหลด..."
                      className="flex-1 p-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-slate-800"
                    />
                    <input
                      type="file"
                      ref={coverInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploading}
                      className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors"
                    >
                      <Upload size={13} />
                      <span>{isUploading ? 'อัปโหลด...' : 'เลือกไฟล์ภาพ'}</span>
                    </button>
                  </div>
                </div>

                {/* Symmetrical 16:9 Preview */}
                <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative flex items-center justify-center">
                  {coverImageUrl ? (
                    <>
                      <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors"
                        title="ลบรูปภาพหน้าปก"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4 text-slate-400">
                      <ImageIcon size={28} className="mx-auto mb-1 text-slate-300" />
                      <span className="text-xs font-medium">ไม่มีรูปหน้าปก (ระบบจะใช้ภาพมาตรฐานตามกลุ่มสินค้า)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Sales Materials Attachments */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 text-xs">
                      เอกสารและสื่อช่วยขาย ({assets.length} รายการ)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Plus size={13} />
                      <span>{isUploading ? 'กำลังอัปโหลด...' : 'แนบไฟล์เพิ่ม'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">เช่น PDF แคตตาล็อก, สคริปต์การขาย, ตารางราคา หรือคลิปสั้น</p>
                </div>

                {/* Attachments List */}
                <div className="w-full aspect-[16/9] rounded-xl overflow-y-auto border border-slate-200 bg-white p-2 space-y-1.5">
                  {assets.length > 0 ? (
                    assets.map((asset, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Paperclip size={14} className="text-red-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate" title={asset.fileName}>
                            {asset.fileName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={asset.documentType}
                            onChange={(e) => {
                              const updated = [...assets];
                              updated[idx].documentType = e.target.value;
                              setAssets(updated);
                            }}
                            className="text-[11px] p-1 rounded-md border border-slate-200 bg-white text-slate-700 max-w-[140px]"
                          >
                            {DOCUMENT_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => setAssets(assets.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="ลบไฟล์นี้"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <FileText size={28} className="mx-auto mb-1 text-slate-300" />
                      <span className="text-xs font-medium">ยังไม่มีเอกสารแนบในประกาศนี้</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">คลิกปุ่ม "แนบไฟล์เพิ่ม" ด้านบนเพื่อเพิ่มเอกสาร</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: บันทึกการแก้ไข (Edit Mode Only) */}
          {isEditing && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                <Sparkles size={16} className="text-red-600" />
                <span>5. บันทึกการแก้ไขเวอร์ชัน (Audit Trail Notes)</span>
              </div>
              <input
                type="text"
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="ระบุสาระสำคัญที่แก้ไข เช่น ปรับตารางราคาใหม่, ขยายเวลาสิ้นสุดแคมเปญ..."
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs md:text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-slate-800"
              />

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={resetAcknowledgment}
                  onChange={(e) => setResetAcknowledgment(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-slate-300"
                />
                <span className="text-xs text-slate-700 font-semibold">
                  เป็นการแก้ไขเงื่อนไขสำคัญ: บังคับให้พนักงานทุกคนต้องกดรับทราบใหม่อีกครั้ง (Reset Acknowledgment Status)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Modal Symmetrical Footer Actions */}
        <div className="px-6 py-4 md:px-8 md:py-4.5 border-t border-slate-200/90 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit('draft')}
                  className="py-2.5 px-4.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors"
                >
                  บันทึกแบบร่าง
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit('pending')}
                  className="py-2.5 px-4.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition-colors"
                >
                  ส่งตรวจและอนุมัติ
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit('publish_now')}
                  className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md hover:shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>{submitting ? 'กำลังบันทึก...' : 'เผยแพร่ทันที'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('publish_now')}
                className="py-2.5 px-7 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md hover:shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5"
              >
                <Check size={15} />
                <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
