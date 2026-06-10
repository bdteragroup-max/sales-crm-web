"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { FileSignature, Save, ArrowLeft, Loader2, Building2, Users, ClipboardList } from "lucide-react"
import Link from "next/link"
import { createInstallationOrder, updateInstallationOrder } from "@/app/actions/installationOrders"
import SearchableSelect from "@/app/components/SearchableSelect"
import SearchableMultiSelect from "@/app/components/SearchableMultiSelect"

export default function ManageInstallationForm({ initialData, isEdit, currentUser, technicians = [] }: { initialData: any, isEdit: boolean, currentUser: any, technicians?: { fullName: string, phoneNumber: string | null }[] }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    company: initialData.company || "",
    jobName: initialData.jobName || "",
    customer: initialData.customer || "",
    customerPosition: initialData.customerPosition || "",
    address: initialData.address || "",
    siteAddress: initialData.siteAddress || "",
    quotationNo: initialData.quotationNo || "",
    sender: initialData.sender || currentUser?.fullName || "",
    senderPhone: initialData.senderPhone || "",
    technician: initialData.technician || "",
    technicianPhone: initialData.technicianPhone || "",
    workInspect: initialData.checklist?.workInspect || initialData.workInspect || false,
    workInstall: initialData.checklist?.workInstall || initialData.workInstall || false,
    workRepair: initialData.checklist?.workRepair || initialData.workRepair || false,
    workTraining: initialData.checklist?.workTraining || initialData.workTraining || false,
    workOther: initialData.checklist?.workOther || initialData.workOther || "",
    note: initialData.note || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else if (name === "technician") {
      const selectedTech = technicians.find(t => t.fullName === value);
      setFormData(prev => ({ 
        ...prev, 
        technician: value,
        technicianPhone: selectedTech?.phoneNumber || prev.technicianPhone
      }))
    } else if (name === "technicianPhone") {
      const selectedTech = technicians.find(t => t.phoneNumber === value);
      setFormData(prev => ({ 
        ...prev, 
        technicianPhone: value,
        ...(selectedTech && !prev.technician ? { technician: selectedTech.fullName } : {})
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      let res;
      if (isEdit) {
        res = await updateInstallationOrder(initialData.id, formData)
      } else {
        res = await createInstallationOrder(initialData.jobId, formData)
      }
      
      if (res.success) {
        router.push(`/jobs?jobId=${initialData.jobId}`)
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
      <div className="bg-gradient-to-r from-orange-50 to-white border-b border-orange-100/50 px-4 md:px-8 py-5 md:py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 -ml-2 text-orange-400 hover:text-orange-600 hover:bg-orange-100/50 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center">
              <FileSignature size={22} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase">จัดการข้อมูลใบติดตั้ง</h1>
              <p className="text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-widest">{isEdit ? "Edit Installation Note" : "New Installation Note"}</p>
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
            ข้อมูลลูกค้าและงาน (Customer & Job Details)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">บริษัท (Company)</label>
              <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ลูกค้า (Customer Name)</label>
              <input type="text" name="customer" value={formData.customer} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ฐานะ/ตำแหน่งลูกค้า (Position)</label>
              <input type="text" name="customerPosition" value={formData.customerPosition} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ชื่องาน (Job Name)</label>
              <input type="text" name="jobName" value={formData.jobName} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ที่อยู่บริษัท (Company Address)</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"></textarea>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">สถานที่หน้างาน (Site Address)</label>
              <textarea name="siteAddress" value={formData.siteAddress} onChange={handleChange} rows={2} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"></textarea>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เลขที่ใบเสนอราคา / ใบสั่งซื้อ (Quotation / PO No.)</label>
              <input type="text" name="quotationNo" value={formData.quotationNo} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Persons */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-500 rounded-lg">
              <Users size={18} />
            </div>
            ข้อมูลผู้ติดต่อ (Contact Persons)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เซลล์ผู้รับผิดชอบ (Sales Owner)</label>
              <input type="text" name="sender" value={formData.sender} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เบอร์โทร เซลล์ (Sales Phone)</label>
              <input type="text" name="senderPhone" value={formData.senderPhone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ช่าง/วิศวกร (Technician / Engineer)</label>
              <SearchableMultiSelect 
                values={formData.technician ? formData.technician.split(",").map(t => t.trim()).filter(Boolean) : []}
                onChange={(vals) => {
                  const selectedTechs = vals.map(v => technicians.find(t => t.fullName === v)).filter(Boolean)
                  const phones = selectedTechs.map(t => t?.phoneNumber).filter(Boolean).join(", ")
                  setFormData(prev => ({
                    ...prev,
                    technician: vals.join(", "),
                    technicianPhone: phones || prev.technicianPhone
                  }))
                }}
                options={technicians.map(t => ({ label: t.fullName, value: t.fullName }))}
                placeholder="-- เลือกช่าง/วิศวกร (เลือกได้หลายคน) --"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เบอร์โทร ช่าง/วิศวกร (Technician Phone)</label>
              <input 
                type="text" 
                name="technicianPhone" 
                value={formData.technicianPhone} 
                onChange={(e) => setFormData(prev => ({ ...prev, technicianPhone: e.target.value }))} 
                className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" 
                placeholder="เบอร์โทรศัพท์"
                autoComplete="off"
              />
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
            {/* Note: the checkboxes don't map directly to the fields on InstallationOrder right now 
                because in schema.prisma we defined checklist Json, but we can store them in note or items 
                Wait, I didn't add workInspect, workInstall, etc. to InstallationOrder.
                I'll put them in checklist Json in the action.
                Ah, I should just store them in `checklist` or `items`. 
                Actually, I'll update schema or just use JSON. For now, since `createInstallationOrder` expects the fields 
                to match schema, I should structure them as JSON or modify the schema.
                Wait! Let me just pass them as JSON. */}
            {[
              { name: "workInspect", label: "งานตรวจเช็ค", value: formData.workInspect },
              { name: "workInstall", label: "งานติดตั้ง", value: formData.workInstall },
              { name: "workRepair", label: "งานซ่อม", value: formData.workRepair },
              { name: "workTraining", label: "งานอบรม", value: formData.workTraining },
            ].map(work => (
              <label key={work.name} className={`flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${work.value ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-gray-50 hover:bg-white"}`}>
                <input type="checkbox" name={work.name} checked={work.value} onChange={handleChange} className="hidden" />
                <span className="text-sm font-bold text-center">{work.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">งานอื่นๆ (Other Work Details)</label>
              <input type="text" name="workOther" value={formData.workOther} onChange={handleChange} placeholder="ระบุรายละเอียดงานอื่นๆ" className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเหตุ (Remarks)</label>
              <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"></textarea>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </form>
    </div>
  )
}
