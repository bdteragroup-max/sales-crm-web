'use client'

import React, { useState, useEffect } from 'react'
import { Save, Calendar, Building2, Search, MapPin } from 'lucide-react'
import { createSchedule } from '@/app/actions/schedule'
import { searchCompanies, getPostalInfo } from '@/app/actions/sales'

interface NewScheduleFormProps {
  staffList: any[]
  onSuccess: (newSchedule: any) => void
  isManager: boolean
  currentUserId?: string
  businessTypes?: string[]
}

export default function NewScheduleForm({ staffList, onSuccess, isManager, currentUserId, businessTypes = [] }: NewScheduleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Company Search & Info States
  const [companySearch, setCompanySearch] = useState('')
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [postalResults, setPostalResults] = useState<any[]>([])
  const [showPostalDropdown, setShowPostalDropdown] = useState(false)
  
  const [formData, setFormData] = useState<any>({
    companyName: '',
    businessType: '',
    taxId: '',
    address: '',
    subDistrict: '',
    district: '',
    province: '',
    postalCode: '',
  })

  const handleCompanySearch = async (query: string) => {
    setFormData((prev: any) => ({ ...prev, companyName: query }));
    if (query.length >= 2) {
      const results = await searchCompanies(query);
      setCompanySuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setFormData((prev: any) => ({
      ...prev,
      companyName: company.companyName,
      taxId: company.taxId || '',
      businessType: company.businessType || '',
      address: company.address || '',
      subDistrict: company.subDistrict || '',
      district: company.district || '',
      province: company.province || '',
      postalCode: company.postalCode || '',
    }));
    setShowSuggestions(false);
  };

  const handlePostalCodeChange = async (postalCode: string) => {
    setFormData((prev: any) => ({ ...prev, postalCode }));
    if (postalCode.length === 5) {
      const results = await getPostalInfo(postalCode);
      if (results && results.length > 0) {
        setPostalResults(results);
        if (results.length === 1) {
          setFormData((prev: any) => ({
            ...prev,
            subDistrict: results[0].subDistrict,
            district: results[0].district,
            province: results[0].province
          }));
          setShowPostalDropdown(false);
        } else {
          setShowPostalDropdown(true);
        }
      }
    } else {
      setShowPostalDropdown(false);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const fData = new FormData(e.currentTarget)
    
    // Merge manual form data with hidden inputs or local state
    const res = await createSchedule({
      userId: (fData.get('userId') as string) || currentUserId || '',
      title: fData.get('title') as string,
      description: fData.get('description') as string,
      date: fData.get('date') as string,
      time: fData.get('time') as string,
      status: fData.get('status') as string,
      // Company info
      companyName: formData.companyName,
      businessType: formData.businessType,
      taxId: formData.taxId,
      address: formData.address,
      subDistrict: formData.subDistrict,
      district: formData.district,
      province: formData.province,
      postalCode: formData.postalCode,
    } as any)

    if (res.success && res.data) {
      const staffUser = staffList.find(s => s.id === res.data.userId)
      onSuccess({
        ...res.data,
        user: staffUser || { fullName: 'Unknown' }
      })
      setFormData({
        companyName: '',
        businessType: '',
        taxId: '',
        address: '',
        subDistrict: '',
        district: '',
        province: '',
        postalCode: '',
      })
      ;(e.target as HTMLFormElement).reset()
    } else {
      alert(res.error || 'Failed to create schedule')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
          <Calendar size={20} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">บันทึกตารางงานใหม่</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
        
        {/* Section 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 ml-1">พนักงาน (Sales)</label>
            <select 
              name="userId" 
              required 
              defaultValue={isManager ? "" : currentUserId}
              disabled={!isManager}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-gray-50 transition-all"
            >
              <option value="">- เลือกพนักงาน -</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.fullName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">วันที่</label>
              <input 
                type="date" 
                name="date" 
                required 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">เวลา</label>
              <input 
                type="time" 
                name="time" 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Task Info */}
        <div className="space-y-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 ml-1">หัวข้อ / งานที่ต้องทำ</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="เช่น เข้าพบลูกค้า A, โทรติดตามงาน..." 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all" 
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 ml-1">รายละเอียด</label>
            <textarea 
              name="description" 
              rows={3} 
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการนัดหมายหรือสิ่งที่ต้องเตรียม" 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all"
            ></textarea>
          </div>
        </div>

        {/* Section 3: Company Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-brand-red border-b border-red-100 pb-2">
            <Building2 size={18} />
            <h3 className="font-bold uppercase tracking-wider text-xs">ข้อมูลบริษัท / ลูกค้า</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name with Search */}
            <div className="space-y-2 relative">
              <label className="block text-sm font-bold text-gray-700 ml-1">ชื่อบริษัท <span className="text-brand-red">*</span></label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.companyName}
                  onChange={(e) => handleCompanySearch(e.target.value)}
                  placeholder="ค้นหาหรือระบุชื่อบริษัทใหม่..." 
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
                />
              </div>
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {companySuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCompanySelect(c)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 flex flex-col transition-colors border-b border-gray-50 last:border-0"
                    >
                      <span className="font-bold text-gray-900">{c.companyName}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">{c.businessType || 'ทั่วไป'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">ประเภทธุรกิจ</label>
              <select 
                value={formData.businessType}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, businessType: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all"
              >
                <option value="">- เลือกประเภทธุรกิจ -</option>
                {businessTypes.map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">เลขประจำตัวผู้เสียภาษี</label>
              <input 
                type="text" 
                value={formData.taxId}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, taxId: e.target.value }))}
                placeholder="ระบุเลขผู้เสียภาษี..." 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">รหัสไปรษณีย์</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  placeholder="เช่น 10110" 
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
                />
                {showPostalDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {postalResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormData((prev: any) => ({
                            ...prev,
                            subDistrict: r.subDistrict,
                            district: r.district,
                            province: r.province
                          }));
                          setShowPostalDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[11px] hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        {r.subDistrict} › {r.district} › {r.province}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">แขวง / ตำบล</label>
              <input type="text" value={formData.subDistrict} readOnly className="w-full border border-gray-100 rounded-xl p-2.5 text-xs bg-gray-50 text-gray-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">เขต / อำเภอ</label>
              <input type="text" value={formData.district} readOnly className="w-full border border-gray-100 rounded-xl p-2.5 text-xs bg-gray-50 text-gray-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด</label>
              <input type="text" value={formData.province} readOnly className="w-full border border-gray-100 rounded-xl p-2.5 text-xs bg-gray-50 text-gray-500 outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 ml-1">ที่อยู่</label>
            <input 
              type="text" 
              value={formData.address}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
              placeholder="เลขที่, อาคาร, ถนน..." 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-bold text-gray-700 ml-1 mb-2">สถานะเริ่มต้น</label>
            <select 
              name="status" 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all"
            >
              <option value="Planned">รอทำ (Planned)</option>
              <option value="Completed">เสร็จสิ้น (Completed)</option>
              <option value="Cancelled">ยกเลิก (Cancelled)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-red-200 disabled:opacity-50"
          >
            <Save size={18} />
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกตารางงาน'}
          </button>
        </div>
      </form>
    </div>
  )
}
