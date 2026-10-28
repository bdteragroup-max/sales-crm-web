/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Save, Calendar, Building2, Search, MapPin, X, ChevronDown } from 'lucide-react'
import { createSchedule } from '@/app/actions/schedule'
import { searchCompanies, getPostalInfo } from '@/app/actions/sales'
import { getRepColor } from './ScheduleCalendar'

interface NewScheduleFormProps {
  staffList: any[]
  onSuccess: (newSchedule: any) => void
  isManager: boolean
  currentUserId?: string
  businessTypes?: string[]
  initialCompanyName?: string
  initialDate?: string
}

export default function NewScheduleForm({
  staffList,
  onSuccess,
  isManager,
  currentUserId,
  businessTypes = [],
  initialCompanyName = '',
  initialDate = ''
}: NewScheduleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Salesperson Searchable State
  const defaultUser = useMemo(() => {
    if (!isManager && currentUserId) {
      return staffList.find((s) => s.id === currentUserId) || null
    }
    return null
  }, [isManager, currentUserId, staffList])

  const [selectedStaff, setSelectedStaff] = useState<any>(defaultUser)
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const staffDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false)
      }
    }
    if (showStaffDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStaffDropdown])

  const filteredStaffList = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase()
    if (!q) return staffList
    return staffList.filter((s) => {
      const nameMatch = (s.fullName || '').toLowerCase().includes(q)
      const empIdMatch = (s.employeeId || '').toLowerCase().includes(q)
      const branchMatch = (s.branchName || s.branchCode || '').toLowerCase().includes(q)
      return nameMatch || empIdMatch || branchMatch
    })
  }, [staffList, staffSearchQuery])
  
  // Company Search & Info States
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [postalResults, setPostalResults] = useState<any[]>([])
  const [showPostalDropdown, setShowPostalDropdown] = useState(false)
  
  // Custom Time State
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const [formData, setFormData] = useState<any>({
    companyName: initialCompanyName,
    businessType: '',
    taxId: '',
    address: '',
    subDistrict: '',
    district: '',
    province: '',
    postalCode: '',
  })

  // Business Type Searchable Dropdown States
  const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = useState(false)
  const businessTypeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        businessTypeDropdownRef.current &&
        !businessTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBusinessTypeDropdown(false)
      }
    }
    if (showBusinessTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showBusinessTypeDropdown])

  const filteredBusinessTypes = useMemo(() => {
    const q = (formData.businessType || '').trim().toLowerCase()
    if (!q) return businessTypes
    return businessTypes.filter((bt) => bt.toLowerCase().includes(q))
  }, [businessTypes, formData.businessType])

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

    if (isManager && !selectedStaff?.id) {
      alert('กรุณาเลือกพนักงาน (Sales)')
      return
    }

    setIsSubmitting(true)
    const fData = new FormData(e.currentTarget)
    
    // Merge manual form data with hidden inputs or local state
    const res = await createSchedule({
      userId: (fData.get('userId') as string) || selectedStaff?.id || currentUserId || '',
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
      setSelectedStaff(defaultUser)
      setStaffSearchQuery('')
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
          {/* Salesperson Selector */}
          {!isManager ? (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">
                พนักงาน (Sales)
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    getRepColor(selectedStaff?.fullName || '').dot
                  }`}
                  style={getRepColor(selectedStaff?.fullName || '').dotStyle}
                />
                <span>{selectedStaff?.fullName || 'ผู้ใช้งานปัจจุบัน'}</span>
                <input type="hidden" name="userId" value={currentUserId || ''} />
              </div>
            </div>
          ) : (
            <div className="space-y-2 relative" ref={staffDropdownRef}>
              <label className="block text-sm font-bold text-gray-700 ml-1">
                พนักงาน (Sales) <span className="text-brand-red">*</span>
              </label>

              <input
                type="hidden"
                name="userId"
                value={selectedStaff?.id || ''}
                required
              />

              {selectedStaff ? (
                /* Selected Pill Display with Clear button */
                <div className="flex items-center justify-between p-2.5 sm:p-3 border border-red-200 bg-red-50/40 rounded-xl text-sm transition-all group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        getRepColor(selectedStaff.fullName).dot
                      }`}
                      style={getRepColor(selectedStaff.fullName).dotStyle}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 truncate block">
                        {selectedStaff.fullName}
                      </span>
                      {selectedStaff.branchName && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          {selectedStaff.branchName}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaff(null)
                      setStaffSearchQuery('')
                      setShowStaffDropdown(true)
                    }}
                    className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-white transition-colors text-xs font-bold flex items-center gap-1 shrink-0 ml-2"
                    title="เปลี่ยนพนักงาน"
                  >
                    <span className="hidden sm:inline">เปลี่ยน</span>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Search Input with Autocomplete Dropdown */
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => {
                      setStaffSearchQuery(e.target.value)
                      setShowStaffDropdown(true)
                    }}
                    onFocus={() => setShowStaffDropdown(true)}
                    placeholder="พิมพ์ค้นหาชื่อพนักงาน หรือสาขา..."
                    className="w-full pl-10 pr-9 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all placeholder:text-gray-400 font-medium"
                  />
                  {staffSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStaffSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Dropdown Suggestions List */}
              {showStaffDropdown && !selectedStaff && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-64 overflow-y-auto divide-y divide-gray-50">
                  <div className="p-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
                    <span>พบ {filteredStaffList.length} คน</span>
                    <span>คลิกเพื่อเลือก</span>
                  </div>

                  {filteredStaffList.length > 0 ? (
                    filteredStaffList.map((staff) => {
                      const color = getRepColor(staff.fullName)
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff)
                            setShowStaffDropdown(false)
                            setStaffSearchQuery('')
                          }}
                          className="w-full text-left p-3 hover:bg-red-50/60 flex items-center justify-between transition-colors group text-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`}
                              style={color.dotStyle}
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 group-hover:text-[#ff2301] truncate transition-colors">
                                {staff.fullName}
                              </div>
                              {staff.role && (
                                <div className="text-[11px] text-gray-400 truncate">
                                  {staff.role}
                                </div>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 shrink-0">
                            {staff.branchName || 'สำนักงานใหญ่'}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-500">
                      ไม่พบพนักงานตรงกับ &ldquo;{staffSearchQuery}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">วันที่</label>
              <input 
                type="date" 
                name="date" 
                defaultValue={initialDate || ''}
                required 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">เวลา</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <select 
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all text-center"
                  >
                    {Array.from({length: 24}).map((_, i) => {
                      const val = i.toString().padStart(2, '0');
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
                <span className="font-bold text-gray-500">:</span>
                <div className="flex-1">
                  <select 
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all text-center"
                  >
                    {Array.from({length: 60}).map((_, i) => {
                      const val = i.toString().padStart(2, '0');
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
                <input type="hidden" name="time" value={`${selectedHour}:${selectedMinute}`} />
              </div>
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

            <div className="space-y-2 relative" ref={businessTypeDropdownRef}>
              <label className="block text-sm font-bold text-gray-700 ml-1">ประเภทธุรกิจ</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={formData.businessType}
                  onChange={(e) => {
                    setFormData((prev: any) => ({ ...prev, businessType: e.target.value }))
                    setShowBusinessTypeDropdown(true)
                  }}
                  onFocus={() => setShowBusinessTypeDropdown(true)}
                  placeholder="พิมพ์ค้นหาหรือเลือกประเภทธุรกิจ..."
                  className="w-full pl-10 pr-9 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all font-medium placeholder:text-gray-400"
                />
                {formData.businessType ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev: any) => ({ ...prev, businessType: '' }))
                      setShowBusinessTypeDropdown(true)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    title="ล้างค่า"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                )}
              </div>

              {/* Business Type Suggestions Dropdown */}
              {showBusinessTypeDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto divide-y divide-gray-50">
                  <div className="p-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
                    <span>พบ {filteredBusinessTypes.length} ประเภทธุรกิจ</span>
                    <span>คลิกเพื่อเลือก</span>
                  </div>

                  {filteredBusinessTypes.length > 0 ? (
                    filteredBusinessTypes.map((bt) => {
                      const isSelected = formData.businessType === bt
                      return (
                        <button
                          key={bt}
                          type="button"
                          onClick={() => {
                            setFormData((prev: any) => ({ ...prev, businessType: bt }))
                            setShowBusinessTypeDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-red-50/60 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                            isSelected ? 'bg-red-50 text-[#ff2301]' : 'text-gray-800'
                          }`}
                        >
                          <span>{bt}</span>
                          {isSelected && <span className="text-[10px] text-[#ff2301]">เลือกแล้ว</span>}
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-gray-500">ไม่พบประเภทธุรกิจตรงกับที่พิมพ์</p>
                      {formData.businessType && (
                        <button
                          type="button"
                          onClick={() => setShowBusinessTypeDropdown(false)}
                          className="mt-2 text-xs font-bold text-[#ff2301] hover:underline"
                        >
                          ใช้ &ldquo;{formData.businessType}&rdquo; เป็นประเภทธุรกิจ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
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
