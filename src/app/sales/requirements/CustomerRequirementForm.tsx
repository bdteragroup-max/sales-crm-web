"use client";

import React, { useState } from 'react';
import { Save, Plus, FileText, CheckCircle2, Loader2, Upload, Trash2, Paperclip } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { saveCustomerRequirementHistory, updateCustomerRequirementHistory } from '@/app/actions/requirements';
import { searchCompanies, searchContacts } from '@/app/actions/sales';
import Card from '../components/Card';
import { LoadingButton } from '@/app/components/LoadingButton';
import { X, XCircle, MapPin, User } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CustomerRequirementForm({ currentUser, onSuccess, editingId, initialData }: { currentUser?: any, onSuccess?: () => void, editingId?: string, initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    
    try {
      const newAttachments = [...(data.attachments || [])];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('uploadsService')
          .upload(filename, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          alert(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase
          .storage
          .from('uploadsService')
          .getPublicUrl(uploadData.path);
          
        newAttachments.push({ name: file.name, url: publicUrl });
      }
      
      setData((prev: any) => ({ ...prev, attachments: newAttachments }));
    } catch (err) {
      console.error(err);
      alert('Error uploading files');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...(data.attachments || [])];
    newAttachments.splice(index, 1);
    setData((prev: any) => ({ ...prev, attachments: newAttachments }));
  };
  const [data, setData] = useState<any>(initialData || {
    "วัน/เดือน/ปี": new Date().toISOString().split('T')[0],
    "พนักงานขายที่ดูแล": currentUser?.fullName || currentUser?.name || "",
  });

  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleCompanySearch = async (query: string) => {
    setData((prev: any) => ({ ...prev, "ชื่อบริษัท": query }));
    if (query.length >= 1) {
      const results = await searchCompanies(query);
      setCompanySuggestions(results);
      setShowSuggestions(results.length > 0 || query.length >= 1);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setData((prev: any) => ({
      ...prev,
      "ชื่อบริษัท": company.companyName,
      "ที่อยู่บริษัท": company.address || prev["ที่อยู่บริษัท"]
    }));
    setShowSuggestions(false);
    setSelectedCompanyId(company.id);
  };

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);

  const handleContactSearch = async (query: string) => {
    setData((prev: any) => ({ ...prev, "ชื่อผู้ติดต่อ": query }));
    if (query.length >= 1) {
      const results = await searchContacts(query, selectedCompanyId || undefined);
      setContactSuggestions(results);
      setShowContactSuggestions(results.length > 0 || query.length >= 1);
    } else {
      setContactSuggestions([]);
      setShowContactSuggestions(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    setData((prev: any) => ({
      ...prev,
      "ชื่อผู้ติดต่อ": contact.contactName,
      "เบอร์โทร": contact.mobilePhone || prev["เบอร์โทร"],
      "อีเมล": contact.email || prev["อีเมล"]
    }));
    setShowContactSuggestions(false);
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setData((prev: any) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      // Save to Database History
      let result;
      if (editingId) {
        result = await updateCustomerRequirementHistory(editingId, data);
      } else {
        result = await saveCustomerRequirementHistory(data);
      }

      if (result.success) {
        setSuccess(true);
        window.scrollTo(0, 0);

        // Switch to history tab if callback provided
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500); // Wait 1.5s so user can see the success message
        }
      } else {
        setErrorMsg(result.error || "Something went wrong.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>







      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl p-4 border border-red-100 shadow-md shadow-red-500/5 rounded-2xl flex flex-wrap items-center gap-3 mb-6 transition-all">
          <LoadingButton
            type="submit"
            loading={loading}
            className="bg-[#ff2301] hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {!loading && <Save size={18} />}
            ส่งใบรับความต้องการ
          </LoadingButton>
          <button
            type="button"
            onClick={() => {
              if (onSuccess) onSuccess();
            }}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5"
          >
            <X size={18} />
            ยกเลิก
          </button>
          {success && (
            <div className="text-sm font-bold px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 ml-auto animate-in fade-in slide-in-from-right-4 flex items-center gap-2">
              <CheckCircle2 size={16} /> บันทึกข้อมูลสำเร็จ!
            </div>
          )}
          {errorMsg && (
            <div className="text-sm font-bold px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-100 ml-auto animate-in fade-in slide-in-from-right-4 flex items-center gap-2">
              <XCircle size={16} /> {errorMsg}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">

            {/* === 1. ข้อมูลลูกค้าทั่วไป === */}
            <Card title="1. ข้อมูลลูกค้า (Customer Info)" collapsible defaultExpanded={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">เลขที่ใบรับความต้องการ (Requirement Number)</label>
                  <input 
                    type="text" 
                    value="สร้างอัตโนมัติเมื่อบันทึก (Auto-generated on save)" 
                    readOnly 
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500 font-medium italic" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">วันที่ (Date)</label>
                  <input type="date" name="วัน/เดือน/ปี" value={data["วัน/เดือน/ปี"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">พนักงานขาย (Sale)</label>
                  <input type="text" name="พนักงานขายที่ดูแล" value={data["พนักงานขายที่ดูแล"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500 font-medium" readOnly required />
                </div>
                
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-bold text-gray-600 mb-1">ชื่อบริษัท (Company Name)</label>
                  <input 
                    type="text" 
                    name="ชื่อบริษัท" 
                    value={data["ชื่อบริษัท"] || ""} 
                    onChange={(e) => handleCompanySearch(e.target.value)} 
                    onFocus={() => { if (data["ชื่อบริษัท"]?.length > 0) handleCompanySearch(data["ชื่อบริษัท"]); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoComplete="off"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                    required 
                  />
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {companySuggestions.length > 0 ? (
                        companySuggestions.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleCompanySelect(company)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 transition-colors flex flex-col gap-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="font-bold text-slate-900">{company.companyName}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin size={12} /> {company.address || company.province || 'ไม่มีข้อมูลที่อยู่'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-xs font-bold text-gray-400">ไม่พบข้อมูลบริษัท จะถูกสร้างใหม่เมื่อบันทึก</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">ที่อยู่บริษัท (Address)</label>
                  <textarea name="ที่อยู่บริษัท" value={data["ที่อยู่บริษัท"] || ""} onChange={handleChange} rows={2} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
                </div>
                
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-600 mb-1">ชื่อผู้ติดต่อ (Contact Name)</label>
                  <input 
                    type="text" 
                    name="ชื่อผู้ติดต่อ" 
                    value={data["ชื่อผู้ติดต่อ"] || ""} 
                    onChange={(e) => handleContactSearch(e.target.value)} 
                    onFocus={() => { if (data["ชื่อผู้ติดต่อ"]?.length > 0) handleContactSearch(data["ชื่อผู้ติดต่อ"]); }}
                    onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
                    autoComplete="off"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                    required 
                  />
                  {showContactSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {contactSuggestions.length > 0 ? (
                        contactSuggestions.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => handleContactSelect(contact)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 transition-colors flex flex-col gap-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="font-bold text-slate-900">{contact.contactName}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <User size={12} /> {contact.mobilePhone || 'ไม่มีเบอร์โทรศัพท์'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-xs font-bold text-gray-400">ไม่พบข้อมูลผู้ติดต่อ จะถูกสร้างใหม่เมื่อบันทึก</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">เบอร์โทรศัพท์ (Phone)</label>
                  <input type="text" name="เบอร์โทร" value={data["เบอร์โทร"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">อีเมล (Email)</label>
                  <input type="email" name="อีเมล" value={data["อีเมล"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">ต้องการใบเสนอราคาภายใน (วันที่)</label>
                  <input type="date" name="ภายในวันที่_ใบเสนอราคา" value={data["ภายในวันที่_ใบเสนอราคา"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">งบประมาณลูกค้า (Customer Budget)</label>
                  <input type="text" name="งบประมาณลูกค้า" value={data["งบประมาณลูกค้า"] || ""} onChange={handleChange} placeholder="ระบุงบประมาณลูกค้า (ไม่จำเป็นต้องระบุ)" className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="block text-xs font-bold text-gray-600 mb-2">ประเภทลูกค้า</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ประเภทลูกค้า_การค้า/ร้านค้า" checked={!!data["ประเภทลูกค้า_การค้า/ร้านค้า"]} onChange={handleChange} /> การค้า/ร้านค้า</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ประเภทลูกค้า_ช่างติดตั้ง/ช่างรับซ่อม" checked={!!data["ประเภทลูกค้า_ช่างติดตั้ง/ช่างรับซ่อม"]} onChange={handleChange} /> ช่างติดตั้ง/ช่างรับซ่อม</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ประเภทลูกค้า_ผู้รับเหมา" checked={!!data["ประเภทลูกค้า_ผู้รับเหมา"]} onChange={handleChange} /> ผู้รับเหมา</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ประเภทลูกค้า_อื่นๆ" checked={!!data["ประเภทลูกค้า_อื่นๆ"]} onChange={handleChange} /> อื่นๆ</label>
                  </div>
                  {data["ประเภทลูกค้า_อื่นๆ"] && (
                    <input type="text" name="ประเภทลูกค้า_อื่นๆ_ระบุ" placeholder="ระบุประเภทลูกค้า..." value={data["ประเภทลูกค้า_อื่นๆ_ระบุ"] || ""} onChange={handleChange} className="mt-2 w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  )}
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="block text-xs font-bold text-gray-600 mb-2">ระยะเวลาความต้องการใช้สินค้า</label>
                  <div className="flex flex-wrap gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ต้องการใช้สินค้า_ด่วน" checked={!!data["ต้องการใช้สินค้า_ด่วน"]} onChange={handleChange} /> ด่วน ภายในวันที่</label>
                    {data["ต้องการใช้สินค้า_ด่วน"] && (
                      <input type="date" name="ภายในวันที่_ต้องการใช้สินค้า" value={data["ภายในวันที่_ต้องการใช้สินค้า"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1.5 text-sm" />
                    )}
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ต้องการใช้สินค้า_เสนอต่อลูกค้า" checked={!!data["ต้องการใช้สินค้า_เสนอต่อลูกค้า"]} onChange={handleChange} /> เสนอต่อลูกค้า</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ต้องการใช้สินค้า_ตั้งงบประมาณ" checked={!!data["ต้องการใช้สินค้า_ตั้งงบประมาณ"]} onChange={handleChange} /> ตั้งงบประมาณ</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ต้องการใช้สินค้า_เพื่อสต๊อก" checked={!!data["ต้องการใช้สินค้า_เพื่อสต๊อก"]} onChange={handleChange} /> เพื่อสต๊อก</label>
                  </div>
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="block text-xs font-bold text-gray-600 mb-2">สินค้าในสต๊อก</label>
                  <div className="flex flex-wrap gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="สต๊อก_มีสินค้า" checked={!!data["สต๊อก_มีสินค้า"]} onChange={handleChange} /> มีสินค้า</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="สต๊อก_ไม่มีสินค้า" checked={!!data["สต๊อก_ไม่มีสินค้า"]} onChange={handleChange} /> ไม่มีสินค้า</label>
                    <input type="text" name="สินค้านอกสต๊อก_ผู้ขาย" placeholder="ผู้ขาย (กรณีไม่มีในสต๊อก)..." value={data["สินค้านอกสต๊อก_ผู้ขาย"] || ""} onChange={handleChange} className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            {/* === 2. เลือกสินค้าที่ต้องการ === */}
            <Card title="2. เลือกประเภทสินค้า (Product Types)" collapsible defaultExpanded={true}>
              <div className="flex flex-wrap gap-4 p-5 bg-red-50/30 rounded-xl border border-red-100">
                {[
                  { id: 'สินค้า_INVERTER', label: 'INVERTER' },
                  { id: 'สินค้า_MOTOR', label: 'MOTOR' },
                  { id: 'สินค้า_PUMP', label: 'PUMP' },
                  { id: 'สินค้า_MDB', label: 'ตู้ MDB' },
                  { id: 'สินค้า_DB', label: 'ตู้ DB' },
                  { id: 'สินค้า_CONTROL', label: 'ตู้ CONTROL' },
                  { id: 'สินค้า_SOLAR_ROOF', label: 'SOLAR ROOF' },
                  { id: 'สินค้า_SOLAR_PUMP', label: 'SOLAR PUMP' },
                ].map(prod => (
                  <label key={prod.id} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-[#ff2301] hover:shadow-sm transition-all text-sm font-bold">
                    <input type="checkbox" name={prod.id} checked={!!data[prod.id]} onChange={handleChange} className="w-4 h-4 text-[#ff2301]" />
                    {prod.label}
                  </label>
                ))}
              </div>
            </Card>

            {/* === CONDITIONAL RENDER FOR INVERTER === */}
            {data["สินค้า_INVERTER"] && (
              <Card title="รายละเอียด INVERTER" collapsible defaultExpanded={true}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อ (Brand)</label>
                    <input type="text" name="INVERTER_ยี่ห้อ" value={data["INVERTER_ยี่ห้อ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ขนาดเครื่อง (kW)</label>
                    <input type="number" step="any" name="INVERTER_ขนาดเครื่อง_kW" value={data["INVERTER_ขนาดเครื่อง_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ขนาดเครื่อง (HP)</label>
                    <input type="number" step="any" name="INVERTER_ขนาดเครื่อง_HP" value={data["INVERTER_ขนาดเครื่อง_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-gray-600 mb-2">ไฟจ่ายเข้า (Input)</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_Input_220V_1P" checked={!!data["INVERTER_Input_220V_1P"]} onChange={handleChange} /> 220V 1 Phase</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_Input_220V_3P" checked={!!data["INVERTER_Input_220V_3P"]} onChange={handleChange} /> 220V 3 Phase</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_Input_380V_3P" checked={!!data["INVERTER_Input_380V_3P"]} onChange={handleChange} /> 380V 3 Phase</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_Input_อื่นๆ" checked={!!data["INVERTER_Input_อื่นๆ"]} onChange={handleChange} /> อื่นๆ</label>
                      {data["INVERTER_Input_อื่นๆ"] && (
                        <input type="text" name="INVERTER_Input_อื่นๆ_ระบุ" placeholder="ระบุ..." value={data["INVERTER_Input_อื่นๆ_ระบุ"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3 mt-4 border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-black text-gray-800 mb-2">ข้อมูลเครื่องเดิม</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อเดิม</label>
                        <input type="text" name="INVERTER_เครื่องเดิม_ยี่ห้อ" value={data["INVERTER_เครื่องเดิม_ยี่ห้อ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">รุ่นเดิม</label>
                        <input type="text" name="INVERTER_เครื่องเดิม_รุ่น" value={data["INVERTER_เครื่องเดิม_รุ่น"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">เนมเพลทเดิม</label>
                        <input type="text" name="INVERTER_เครื่องเดิม_เนมเพลท" value={data["INVERTER_เครื่องเดิม_เนมเพลท"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3 mt-4 border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-black text-gray-800 mb-2">ใช้งานกับมอเตอร์</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">ขนาด (kW)</label>
                        <input type="number" step="any" name="INVERTER_มอเตอร์_kW" value={data["INVERTER_มอเตอร์_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">ขนาด (HP)</label>
                        <input type="number" step="any" name="INVERTER_มอเตอร์_HP" value={data["INVERTER_มอเตอร์_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                      </div>
                      <div className="col-span-2 flex gap-4 mt-4">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_มอเตอร์_1P" checked={!!data["INVERTER_มอเตอร์_1P"]} onChange={handleChange} /> 1 Phase</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_มอเตอร์_3P" checked={!!data["INVERTER_มอเตอร์_3P"]} onChange={handleChange} /> 3 Phase</label>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">มอเตอร์ขับงานประเภท</label>
                      <input type="text" name="INVERTER_มอเตอร์ขับงานประเภท" value={data["INVERTER_มอเตอร์ขับงานประเภท"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อมอเตอร์</label>
                      <input type="text" name="INVERTER_มอเตอร์_ยี่ห้อ" value={data["INVERTER_มอเตอร์_ยี่ห้อ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">รุ่นมอเตอร์</label>
                      <input type="text" name="INVERTER_มอเตอร์_รุ่น" value={data["INVERTER_มอเตอร์_รุ่น"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                    </div>
                  </div>

                  <div className="md:col-span-3 mt-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">จุดประสงค์ของความต้องการใช้สินค้า</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_จุดประสงค์_ขึ้นงานใหม่" checked={!!data["INVERTER_จุดประสงค์_ขึ้นงานใหม่"]} onChange={handleChange} /> ขึ้นงานใหม่</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_จุดประสงค์_มีมอเตอร์แล้ว" checked={!!data["INVERTER_จุดประสงค์_มีมอเตอร์แล้ว"]} onChange={handleChange} /> มีมอเตอร์แล้ว</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_จุดประสงค์_ยังไม่มีมอเตอร์" checked={!!data["INVERTER_จุดประสงค์_ยังไม่มีมอเตอร์"]} onChange={handleChange} /> ยังไม่มีมอเตอร์</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_จุดประสงค์_อื่นๆ" checked={!!data["INVERTER_จุดประสงค์_อื่นๆ"]} onChange={handleChange} /> อื่นๆ</label>
                    </div>
                  </div>

                  <div className="md:col-span-3 mt-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">อาการที่เสีย</label>
                    <textarea name="INVERTER_อาการที่เสีย" value={data["INVERTER_อาการที่เสีย"] || ""} onChange={handleChange} rows={2} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>

                  <div className="md:col-span-3 mt-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">บริการเสริม</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_บริการเสริม_ติดตั้ง" checked={!!data["INVERTER_บริการเสริม_ติดตั้ง"]} onChange={handleChange} /> ติดตั้ง</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_บริการเสริม_R-Brake" checked={!!data["INVERTER_บริการเสริม_R-Brake"]} onChange={handleChange} /> R-Brake</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_บริการเสริม_BrakeUnit" checked={!!data["INVERTER_บริการเสริม_BrakeUnit"]} onChange={handleChange} /> Brake Unit</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_บริการเสริม_ประกอบตู้อินเวอร์เตอร์" checked={!!data["INVERTER_บริการเสริม_ประกอบตู้อินเวอร์เตอร์"]} onChange={handleChange} /> ประกอบตู้อินเวอร์เตอร์</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="INVERTER_บริการเสริม_อื่นๆ" checked={!!data["INVERTER_บริการเสริม_อื่นๆ"]} onChange={handleChange} /> อื่นๆ</label>
                      {data["INVERTER_บริการเสริม_อื่นๆ"] && (
                        <input type="text" name="INVERTER_บริการเสริม_อื่นๆ_ระบุ" placeholder="ระบุ..." value={data["INVERTER_บริการเสริม_อื่นๆ_ระบุ"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* === CONDITIONAL RENDER FOR MOTOR === */}
            {data["สินค้า_MOTOR"] && (
              <Card title="รายละเอียด MOTOR" collapsible defaultExpanded={true}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อ (Brand)</label>
                    <input type="text" name="MOTOR_ยี่ห้อ" value={data["MOTOR_ยี่ห้อ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ขนาด (kW)</label>
                    <input type="number" step="any" name="MOTOR_ขนาด_kW" value={data["MOTOR_ขนาด_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ขนาด (HP)</label>
                    <input type="number" step="any" name="MOTOR_ขนาด_HP" value={data["MOTOR_ขนาด_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-gray-600 mb-2">ขาตั้ง / หน้าแปลน</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="MOTOR_ขาตั้ง" checked={!!data["MOTOR_ขาตั้ง"]} onChange={handleChange} /> ขาตั้ง (B3)</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="MOTOR_หน้าแปลน" checked={!!data["MOTOR_หน้าแปลน"]} onChange={handleChange} /> หน้าแปลน (B5/B14)</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="MOTOR_เนมเพลทตัวเก่า" checked={!!data["MOTOR_เนมเพลทตัวเก่า"]} onChange={handleChange} /> ตามเนมเพลทตัวเก่า</label>
                    </div>
                  </div>

                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="border border-gray-200 p-4 rounded-xl bg-white">
                      <h4 className="font-bold text-sm text-[#ff2301] mb-3">Induction Motor</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">kW</label>
                          <input type="number" step="any" name="MOTOR_Induction_kW" value={data["MOTOR_Induction_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">HP</label>
                          <input type="number" step="any" name="MOTOR_Induction_HP" value={data["MOTOR_Induction_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Pole</label>
                          <input type="text" name="MOTOR_Induction_Pole" value={data["MOTOR_Induction_Pole"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Phase</label>
                          <input type="text" name="MOTOR_Induction_Phase" value={data["MOTOR_Induction_Phase"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 p-4 rounded-xl bg-white">
                      <h4 className="font-bold text-sm text-[#ff2301] mb-3">Gear Motor</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">kW</label>
                          <input type="number" step="any" name="MOTOR_Gear_kW" value={data["MOTOR_Gear_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">HP</label>
                          <input type="number" step="any" name="MOTOR_Gear_HP" value={data["MOTOR_Gear_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Pole (Ratio)</label>
                          <input type="text" name="MOTOR_Gear_Pole" value={data["MOTOR_Gear_Pole"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Phase</label>
                          <input type="text" name="MOTOR_Gear_Phase" value={data["MOTOR_Gear_Phase"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* === CONDITIONAL RENDER FOR PUMP === */}
            {data["สินค้า_PUMP"] && (
              <Card title="รายละเอียด PUMP" collapsible defaultExpanded={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อ (Brand)</label>
                    <input type="text" name="PUMP_ยี่ห้อ" value={data["PUMP_ยี่ห้อ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">รุ่น (Model)</label>
                    <input type="text" name="PUMP_รุ่น" value={data["PUMP_รุ่น"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>

                  <div className="border border-gray-200 p-4 rounded-xl bg-white">
                    <h4 className="font-bold text-sm text-[#ff2301] mb-3">Centrifugal (หอยโข่ง)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">kW</label>
                        <input type="number" step="any" name="PUMP_Centrifugal_kW" value={data["PUMP_Centrifugal_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">HP</label>
                        <input type="number" step="any" name="PUMP_Centrifugal_HP" value={data["PUMP_Centrifugal_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Flow r/min</label>
                        <input type="text" name="PUMP_Centrifugal_Flow" value={data["PUMP_Centrifugal_Flow"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Phase</label>
                        <input type="text" name="PUMP_Centrifugal_Phase" value={data["PUMP_Centrifugal_Phase"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 p-4 rounded-xl bg-white">
                    <h4 className="font-bold text-sm text-[#ff2301] mb-3">Submersible (บาดาล/จุ่ม)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">kW</label>
                        <input type="number" step="any" name="PUMP_Sub_kW" value={data["PUMP_Sub_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">HP</label>
                        <input type="number" step="any" name="PUMP_Sub_HP" value={data["PUMP_Sub_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Flow r/min</label>
                        <input type="text" name="PUMP_Sub_Flow" value={data["PUMP_Sub_Flow"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Phase</label>
                        <input type="text" name="PUMP_Sub_Phase" value={data["PUMP_Sub_Phase"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* === CONDITIONAL RENDER FOR MDB/DB/CONTROL === */}
            {(data["สินค้า_MDB"] || data["สินค้า_DB"] || data["สินค้า_CONTROL"]) && (
              <Card title="รายละเอียดตู้ MDB / DB / CONTROL" collapsible defaultExpanded={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">พื้นที่ติดตั้ง</label>
                    <div className="flex flex-wrap gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_ภายในอาคาร" checked={!!data["ตู้_ภายในอาคาร"]} onChange={handleChange} /> ภายในอาคาร</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_นอกอาคาร" checked={!!data["ตู้_นอกอาคาร"]} onChange={handleChange} /> นอกอาคาร</label>
                      {data["ตู้_นอกอาคาร"] && (
                        <input type="text" name="ตู้_IP" placeholder="ระบุ IP (เช่น IP54)..." value={data["ตู้_IP"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">อุปกรณ์หลัก</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_อุปกรณ์หลัก_ชไนเดอร์" checked={!!data["ตู้_อุปกรณ์หลัก_ชไนเดอร์"]} onChange={handleChange} /> ชไนเดอร์ (Schneider)</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_อุปกรณ์หลัก_เอบีบี" checked={!!data["ตู้_อุปกรณ์หลัก_เอบีบี"]} onChange={handleChange} /> เอบีบี (ABB)</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_อุปกรณ์หลัก_อื่นๆ" checked={!!data["ตู้_อุปกรณ์หลัก_อื่นๆ"]} onChange={handleChange} /> อื่นๆ</label>
                      {data["ตู้_อุปกรณ์หลัก_อื่นๆ"] && (
                        <input type="text" name="ตู้_อุปกรณ์หลัก_อื่นๆ_ระบุ" placeholder="ระบุ..." value={data["ตู้_อุปกรณ์หลัก_อื่นๆ_ระบุ"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ลักษณะตู้</label>
                    <input type="text" name="ตู้_ลักษณะ" value={data["ตู้_ลักษณะ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">เหล็กหนา (mm)</label>
                    <input type="text" name="ตู้_เหล็กหนา" value={data["ตู้_เหล็กหนา"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">กว้าง (mm)</label>
                      <input type="number" name="ตู้_กว้าง" value={data["ตู้_กว้าง"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ยาว (mm)</label>
                      <input type="number" name="ตู้_ยาว" value={data["ตู้_ยาว"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ลึก (mm)</label>
                      <input type="number" name="ตู้_ลึก" value={data["ตู้_ลึก"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                  </div>

                  <div className="md:col-span-2 mt-4 border-t border-gray-200 pt-4">
                    <label className="block text-xs font-bold text-gray-600 mb-2">ประเภทตู้ (ย่อย)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_มีตู้อินเวอร์เตอร์" checked={!!data["ตู้_มีตู้อินเวอร์เตอร์"]} onChange={handleChange} /> ตู้อินเวอร์เตอร์</label>
                        {data["ตู้_มีตู้อินเวอร์เตอร์"] && (
                          <div className="pl-6 grid grid-cols-3 gap-2">
                            <input type="number" step="any" name="ตู้_อินเวอร์เตอร์_kW" placeholder="kW" value={data["ตู้_อินเวอร์เตอร์_kW"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                            <input type="number" step="any" name="ตู้_อินเวอร์เตอร์_HP" placeholder="HP" value={data["ตู้_อินเวอร์เตอร์_HP"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                            <input type="number" name="ตู้_อินเวอร์เตอร์_InputV" placeholder="Input (V)" value={data["ตู้_อินเวอร์เตอร์_InputV"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_มีตู้เบรกเกอร์เตอร์" checked={!!data["ตู้_มีตู้เบรกเกอร์เตอร์"]} onChange={handleChange} /> ตู้เบรกเกอร์</label>
                        {data["ตู้_มีตู้เบรกเกอร์เตอร์"] && (
                          <div className="pl-6">
                            <input type="number" name="ตู้_MainA" placeholder="Main (A)" value={data["ตู้_MainA"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1 text-sm" />
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ตู้_สตาร์เดลต้า" checked={!!data["ตู้_สตาร์เดลต้า"]} onChange={handleChange} /> ตู้สตาร์-เดลต้า (Star-Delta)</label>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* === CONDITIONAL RENDER FOR SOLAR ROOF === */}
            {data["สินค้า_SOLAR_ROOF"] && (
              <Card title="รายละเอียด SOLAR ROOF" collapsible defaultExpanded={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">ระบบที่ต้องการ</label>
                    <div className="flex flex-wrap gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="SOLAR_ROOF_OnGrid" checked={!!data["SOLAR_ROOF_OnGrid"]} onChange={handleChange} /> On-Grid</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="SOLAR_ROOF_OffGrid" checked={!!data["SOLAR_ROOF_OffGrid"]} onChange={handleChange} /> Off-Grid</label>
                      <input type="number" step="any" name="SOLAR_ROOF_kW" placeholder="ขนาด (kW)..." value={data["SOLAR_ROOF_kW"] || ""} onChange={handleChange} className="border border-gray-200 rounded-lg p-1 text-sm" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">ลักษณะหลังคา</label>
                    <div className="flex flex-wrap gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="SOLAR_ROOF_เมทัลชีท" checked={!!data["SOLAR_ROOF_เมทัลชีท"]} onChange={handleChange} /> เมทัลชีท</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="SOLAR_ROOF_ลอนคู่" checked={!!data["SOLAR_ROOF_ลอนคู่"]} onChange={handleChange} /> ลอนคู่</label>
                      <input type="text" name="SOLAR_ROOF_อื่นๆ_ระบุ" placeholder="อื่นๆ ระบุ..." value={data["SOLAR_ROOF_อื่นๆ_ระบุ"] || ""} onChange={handleChange} className="flex-1 min-w-[150px] border border-gray-200 rounded-lg p-1 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อแผง</label>
                    <input type="text" name="SOLAR_ROOF_ยี่ห้อแผง" value={data["SOLAR_ROOF_ยี่ห้อแผง"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้ออินเวอร์เตอร์</label>
                    <input type="text" name="SOLAR_ROOF_ยี่ห้ออินเวอร์เตอร์" value={data["SOLAR_ROOF_ยี่ห้ออินเวอร์เตอร์"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                </div>
              </Card>
            )}

            {/* === CONDITIONAL RENDER FOR SOLAR PUMP === */}
            {data["สินค้า_SOLAR_PUMP"] && (
              <Card title="รายละเอียด SOLAR PUMP" collapsible defaultExpanded={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ยี่ห้อ (Brand)</label>
                    <input type="text" name="SOLAR_PUMP_ยี่ห้อ" value={data["SOLAR_PUMP_ยี่ห้อ"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">รุ่น (Model)</label>
                    <input type="text" name="SOLAR_PUMP_รุ่น" value={data["SOLAR_PUMP_รุ่น"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
                  </div>

                  <div className="md:col-span-2 border border-gray-200 p-4 rounded-xl bg-white">
                    <h4 className="font-bold text-sm text-[#ff2301] mb-3">Submersible (บาดาล)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">kW</label>
                        <input type="number" step="any" name="SOLAR_PUMP_kW" value={data["SOLAR_PUMP_kW"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">HP</label>
                        <input type="number" step="any" name="SOLAR_PUMP_HP" value={data["SOLAR_PUMP_HP"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Flow r/min</label>
                        <input type="text" name="SOLAR_PUMP_Flow" value={data["SOLAR_PUMP_Flow"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Phase</label>
                        <input type="text" name="SOLAR_PUMP_Phase" value={data["SOLAR_PUMP_Phase"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ความลึก (เมตร)</label>
                      <input type="number" step="any" name="SOLAR_PUMP_ความลึก_เมตร" value={data["SOLAR_PUMP_ความลึก_เมตร"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ต้องการน้ำ (ลบ.ม./วัน)</label>
                      <input type="number" step="any" name="SOLAR_PUMP_ต้องการน้ำ_ลบม" value={data["SOLAR_PUMP_ต้องการน้ำ_ลบม"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ระยะส่งแนวราบ (เมตร)</label>
                      <input type="number" step="any" name="SOLAR_PUMP_แนวราบ_เมตร" value={data["SOLAR_PUMP_แนวราบ_เมตร"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ระยะส่งแนวดิ่ง (เมตร)</label>
                      <input type="number" step="any" name="SOLAR_PUMP_แนวดิ่ง_เมตร" value={data["SOLAR_PUMP_แนวดิ่ง_เมตร"] || ""} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-1.5 text-sm" />
                    </div>
                  </div>
                </div>
              </Card>
            )}



            {/* === 3. แนบไฟล์ (Attachments) === */}
            <Card title="3. แนบไฟล์ (Attachments)" collapsible defaultExpanded={true}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                    {isUploading ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Upload size={16} className="text-gray-500" />}
                    {isUploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์แนบ (PDF, รูปภาพ)'}
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} accept="image/*,application/pdf" />
                  </label>
                  <span className="text-xs text-gray-400">รองรับไฟล์รูปภาพและ PDF</span>
                </div>
                
                {data.attachments && data.attachments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {data.attachments.map((file: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                            <Paperclip size={14} className="text-gray-500" />
                          </div>
                          <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                            {file.name}
                          </a>
                        </div>
                        <button type="button" onClick={() => handleRemoveAttachment(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* === 4. หมายเหตุ (บังคับ) === */}
            <Card title="4. หมายเหตุเพิ่มเติม (Notes) *" collapsible defaultExpanded={true}>
              <div className="flex flex-col gap-4">
                <textarea
                  name="หมายเหตุ"
                  value={data["หมายเหตุ"] || ""}
                  onChange={handleChange}
                  rows={3}
                  placeholder="กรอกหมายเหตุ หรือรายละเอียดอื่นๆ ที่ต้องการเน้นย้ำ (บังคับกรอก)..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301]"
                  required
                />
              </div>
            </Card>
          </div>
        </div>

      </form>
    </div>
  );
}
