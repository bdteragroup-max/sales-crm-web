"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FileSignature, Save, ArrowLeft, Loader2, Eraser, Building2, Users, ClipboardList, Search, X } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import Link from "next/link"
import { createRepairDelivery, searchSalespeople } from "@/app/actions/repairDeliveries"

interface SalespersonResult {
  id: string
  fullName: string
  phoneNumber: string | null
  role: string
  employeeSale?: { position: string | null; nickname: string | null } | null
}

export default function NewDeliveryForm({ currentUser }: { currentUser: any }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    company: "",
    jobName: "",
    customer: "",
    customerPosition: "",
    address: "",
    siteAddress: "",
    quotationNo: "",
    sender: currentUser?.fullName || "",
    senderPhone: "",
    technician: "",
    technicianPhone: "",
    workInspect: false,
    workInstall: false,
    workRepair: false,
    workTraining: false,
    workOther: "",
    note: "",
  })

  // Salesperson search state
  const [senderSearchQuery, setSenderSearchQuery] = useState(currentUser?.fullName || "")
  const [senderResults, setSenderResults] = useState<SalespersonResult[]>([])
  const [isSenderSearching, setIsSenderSearching] = useState(false)
  const [showSenderDropdown, setShowSenderDropdown] = useState(false)
  const senderDropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search for salesperson
  useEffect(() => {
    if (!senderSearchQuery || senderSearchQuery.trim().length < 1) {
      setSenderResults([])
      setShowSenderDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSenderSearching(true)
      try {
        const res = await searchSalespeople(senderSearchQuery.trim())
        if (res.success && res.data) {
          setSenderResults(res.data as SalespersonResult[])
          setShowSenderDropdown(true)
        }
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        setIsSenderSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [senderSearchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (senderDropdownRef.current && !senderDropdownRef.current.contains(event.target as Node)) {
        setShowSenderDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectSalesperson = useCallback((person: SalespersonResult) => {
    setSenderSearchQuery(person.fullName)
    setFormData(prev => ({
      ...prev,
      sender: person.fullName,
      senderPhone: person.phoneNumber || "",
    }))
    setShowSenderDropdown(false)
    setSenderResults([])
  }, [])

  const clearSenderSelection = useCallback(() => {
    setSenderSearchQuery("")
    setFormData(prev => ({
      ...prev,
      sender: "",
      senderPhone: "",
    }))
    setSenderResults([])
    setShowSenderDropdown(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const payload = {
        ...formData,
      }

      // First create the record
      const res = await createRepairDelivery(undefined, payload)
      if (res.success) {
        router.push("/repair-deliveries")
        router.refresh()
      } else {
        alert("Error saving: " + res.error)
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden mb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-white border-b border-red-100/50 px-4 md:px-8 py-5 md:py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/repair-deliveries" className="p-2 -ml-2 text-red-400 hover:text-red-600 hover:bg-red-100/50 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d01800] text-white shadow-lg shadow-red-500/30 flex items-center justify-center">
              <FileSignature size={22} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase">สร้างใบส่งมอบงาน</h1>
              <p className="text-[10px] md:text-xs font-bold text-[#ff2301] uppercase tracking-widest">New Delivery Note</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/30">
        {/* Section 1: General Info */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
              <Building2 size={18} />
            </div>
            ข้อมูลลูกค้าและงาน (Customer &amp; Job Details)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">บริษัท (Company)</label>
              <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ลูกค้า (Customer Name)</label>
              <input type="text" name="customer" value={formData.customer} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ฐานะ/ตำแหน่งลูกค้า (Position)</label>
              <input type="text" name="customerPosition" value={formData.customerPosition} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ชื่องาน (Job Name)</label>
              <input type="text" name="jobName" value={formData.jobName} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ที่อยู่บริษัท (Company Address)</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"></textarea>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">สถานที่หน้างาน (Site Address)</label>
              <textarea name="siteAddress" value={formData.siteAddress} onChange={handleChange} rows={2} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"></textarea>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เลขที่ใบเสนอราคา / ใบสั่งซื้อ (Quotation / PO No.)</label>
              <input type="text" name="quotationNo" value={formData.quotationNo} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Persons */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
              <Users size={18} />
            </div>
            ข้อมูลผู้ติดต่อ (Contact Persons)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* Salesperson Search Autocomplete */}
            <div ref={senderDropdownRef} className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">พนักงานขายผู้รับผิดชอบ (Salesperson in Charge)</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={senderSearchQuery}
                  onChange={(e) => {
                    setSenderSearchQuery(e.target.value)
                    setFormData(prev => ({ ...prev, sender: e.target.value }))
                  }}
                  onFocus={() => {
                    if (senderResults.length > 0) setShowSenderDropdown(true)
                  }}
                  placeholder="พิมพ์ชื่อพนักงานขายเพื่อค้นหา..."
                  className="w-full pl-10 pr-10 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
                {isSenderSearching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-red-400" />
                  </div>
                )}
                {formData.sender && !isSenderSearching && (
                  <button
                    type="button"
                    onClick={clearSenderSelection}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {showSenderDropdown && senderResults.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl shadow-gray-200/50 max-h-60 overflow-y-auto">
                  {senderResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => selectSalesperson(person)}
                      className="w-full text-left px-4 py-3 hover:bg-red-50/50 transition-colors border-b border-gray-50 last:border-b-0 group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 group-hover:text-red-600 transition-colors truncate">
                            {person.fullName}
                            {person.employeeSale?.nickname && (
                              <span className="ml-1.5 text-gray-400 font-medium">({person.employeeSale.nickname})</span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {person.employeeSale?.position || person.role}
                          </p>
                        </div>
                        {person.phoneNumber && (
                          <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded-md shrink-0">
                            {person.phoneNumber}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSenderDropdown && senderResults.length === 0 && senderSearchQuery.trim().length >= 1 && !isSenderSearching && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl shadow-gray-200/50 px-4 py-3">
                  <p className="text-sm text-gray-400 text-center">ไม่พบพนักงานขาย</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เบอร์โทร พนักงานขาย (Salesperson Phone)</label>
              <input type="text" name="senderPhone" value={formData.senderPhone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ช่าง/วิศวกร (Technician / Engineer)</label>
              <input type="text" name="technician" value={formData.technician} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เบอร์โทร ช่าง/วิศวกร (Technician Phone)</label>
              <input type="text" name="technicianPhone" value={formData.technicianPhone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Section 3: Work Types */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
              <ClipboardList size={18} />
            </div>
            รายละเอียดงาน (Work Checklist)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { name: "workInspect", label: "งานตรวจเช็ค", value: formData.workInspect },
              { name: "workInstall", label: "งานติดตั้ง", value: formData.workInstall },
              { name: "workRepair", label: "งานซ่อม", value: formData.workRepair },
              { name: "workTraining", label: "งานอบรม", value: formData.workTraining },
            ].map(work => (
              <label key={work.name} className={`flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${work.value ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 hover:bg-white"}`}>
                <input type="checkbox" name={work.name} checked={work.value} onChange={handleChange} className="hidden" />
                <span className="text-sm font-bold text-center">{work.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">งานอื่นๆ (Other Work Details)</label>
              <input type="text" name="workOther" value={formData.workOther} onChange={handleChange} placeholder="ระบุรายละเอียดงานอื่นๆ" className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเหตุ (Remarks)</label>
              <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"></textarea>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-[#ff2301] to-[#d01800] hover:from-[#e01f00] hover:to-[#b01400] text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </form>
    </div>
  )
}
