'use client'

import React, { useState, useEffect } from 'react'
import { Save, X, Trash2, Calendar, FileText, CheckCircle2, Building2, Search, MapPin } from 'lucide-react'
import { updateSchedule, deleteSchedule } from '@/app/actions/schedule'
import { searchCompanies, getPostalInfo } from '@/app/actions/sales'

interface UpdateScheduleFormProps {
  schedule: any
  onClose: () => void
  onSuccess: (updated: any) => void
  onDelete: (id: string) => void
  businessTypes?: string[]
}

export default function UpdateScheduleForm({ schedule, onClose, onSuccess, onDelete, businessTypes = [] }: UpdateScheduleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Extract date and time
  const initialDate = new Date(schedule.date).toISOString().split('T')[0]
  const initialTime = new Date(schedule.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  // Company Search & Info States
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [postalResults, setPostalResults] = useState<any[]>([])
  const [showPostalDropdown, setShowPostalDropdown] = useState(false)

  const [formData, setFormData] = useState<any>({
    companyName: schedule.company?.companyName || '',
    businessType: schedule.company?.businessType || '',
    taxId: schedule.company?.taxId || '',
    address: schedule.company?.address || '',
    subDistrict: schedule.company?.subDistrict || '',
    district: schedule.company?.district || '',
    province: schedule.company?.province || '',
    postalCode: schedule.company?.postalCode || '',
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
    
    const res = await updateSchedule(schedule.id, {
      title: fData.get('title') as string,
      description: fData.get('description') as string,
      date: fData.get('date') as string,
      time: fData.get('time') as string,
      status: fData.get('status') as string,
      presentationStatus: fData.get('presentationStatus') as string,
      quotationNumber: fData.get('quotationNumber') as string,
      poNumber: fData.get('poNumber') as string,
      invoiceNumber: fData.get('invoiceNumber') as string,
      notes: fData.get('notes') as string,
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
      onSuccess(res.data)
      onClose()
    } else {
      alert(res.error || 'Failed to update schedule')
    }
    setIsSubmitting(false)
  }

  async function handleDelete() {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบตารางงานนี้?')) return
    setIsDeleting(true)
    const res = await deleteSchedule(schedule.id)
    if (res.success) {
      onDelete(schedule.id)
      onClose()
    } else {
      alert(res.error || 'Failed to delete schedule')
    }
    setIsDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">แก้ไขตารางงาน / รายงานผล</h2>
              <p className="text-xs text-gray-500 mt-0.5">อัปเดตข้อมูลความคืบหน้าและข้อมูลลูกค้า</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form id="update-schedule-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left Column: Task Info */}
            <div className="space-y-8">
              <div className="flex items-center gap-2 text-gray-900 border-b border-gray-100 pb-2">
                <FileText size={18} className="text-brand-red" />
                <h3 className="font-bold uppercase tracking-wider text-xs">ข้อมูลงานและการนัดหมาย</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">หัวข้อ / งาน</label>
                  <input 
                    type="text" 
                    name="title" 
                    defaultValue={schedule.title}
                    required 
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-gray-50 transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">วันที่</label>
                    <input 
                      type="date" 
                      name="date" 
                      defaultValue={initialDate}
                      required 
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">เวลา</label>
                    <input 
                      type="time" 
                      name="time" 
                      defaultValue={initialTime}
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">รายละเอียด</label>
                  <textarea 
                    name="description" 
                    defaultValue={schedule.description}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-gray-50 transition-all"
                  ></textarea>
                </div>
              </div>

              {/* Outcome Section inside left column */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 text-emerald-600 border-b border-emerald-100 pb-2">
                  <CheckCircle2 size={18} />
                  <h3 className="font-bold uppercase tracking-wider text-xs">รายงานผลลัพธ์</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">สถานะงาน</label>
                    <select 
                      name="status" 
                      defaultValue={schedule.status}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all"
                    >
                      <option value="Planned">รอทำ (Planned)</option>
                      <option value="Completed">เสร็จสิ้น (Completed)</option>
                      <option value="Cancelled">ยกเลิก (Cancelled)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">การนำเสนอ</label>
                    <select 
                      name="presentationStatus" 
                      defaultValue={schedule.presentationStatus || ''}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all"
                    >
                      <option value="">- เลือกสถานะ -</option>
                      <option value="Presented">นำเสนอแล้ว</option>
                      <option value="Follow-up Required">ต้องติดตามผล</option>
                      <option value="Rejected">ไม่ผ่าน/ไม่สนใจ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">QT No.</label>
                    <input type="text" name="quotationNumber" defaultValue={schedule.quotationNumber || ''} className="w-full border border-gray-200 rounded-lg p-2 text-[11px] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PO No.</label>
                    <input type="text" name="poNumber" defaultValue={schedule.poNumber || ''} className="w-full border border-gray-200 rounded-lg p-2 text-[11px] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IV No.</label>
                    <input type="text" name="invoiceNumber" defaultValue={schedule.invoiceNumber || ''} className="w-full border border-gray-200 rounded-lg p-2 text-[11px] outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">บันทึกเพิ่มเติม</label>
                  <textarea 
                    name="notes" 
                    defaultValue={schedule.notes || ''}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Right Column: Company Info */}
            <div className="space-y-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
              <div className="flex items-center gap-2 text-brand-red border-b border-red-100 pb-2">
                <Building2 size={18} />
                <h3 className="font-bold uppercase tracking-wider text-xs">ข้อมูลบริษัท / ลูกค้า</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-sm font-bold text-gray-700 ml-1">ชื่อบริษัท <span className="text-brand-red">*</span></label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={formData.companyName}
                      onChange={(e) => handleCompanySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red outline-none bg-white transition-all" 
                    />
                  </div>
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden overflow-y-auto max-h-48">
                      {companySuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCompanySelect(c)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 flex flex-col border-b border-gray-50 last:border-0"
                        >
                          <span className="font-bold text-gray-900">{c.companyName}</span>
                          <span className="text-[10px] text-gray-400">{c.businessType || 'ทั่วไป'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">ประเภทธุรกิจ</label>
                  <select 
                    value={formData.businessType}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, businessType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none bg-white transition-all"
                  >
                    <option value="">- เลือกประเภทธุรกิจ -</option>
                    {businessTypes.map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input 
                    type="text" 
                    value={formData.taxId}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, taxId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none bg-white transition-all" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">รหัสไปรษณีย์</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={formData.postalCode}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-white transition-all" 
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
                            className="w-full text-left px-4 py-2 text-[11px] hover:bg-gray-50"
                          >
                            {r.subDistrict} › {r.district} › {r.province}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex gap-2">
                    <input type="text" value={formData.subDistrict} readOnly className="w-1/3 border border-gray-100 rounded-lg p-2 text-[10px] bg-gray-100/50 text-gray-400" placeholder="ตำบล" />
                    <input type="text" value={formData.district} readOnly className="w-1/3 border border-gray-100 rounded-lg p-2 text-[10px] bg-gray-100/50 text-gray-400" placeholder="อำเภอ" />
                    <input type="text" value={formData.province} readOnly className="w-1/3 border border-gray-100 rounded-lg p-2 text-[10px] bg-gray-100/50 text-gray-400" placeholder="จังหวัด" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">ที่อยู่</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none bg-white transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 sticky bottom-0 bg-white">
          <button 
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto px-6 py-3 text-red-500 hover:text-red-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            {isDeleting ? 'กำลังลบ...' : 'ลบรายการ'}
          </button>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button 
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
            >
              ยกเลิก
            </button>
            <button 
              form="update-schedule-form"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-10 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
