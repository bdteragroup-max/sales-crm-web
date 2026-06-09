"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { FileSignature, Save, ArrowLeft, Loader2, Eraser, Building2, Users, ClipboardList } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import Link from "next/link"
import { updateRepairDelivery } from "@/app/actions/repairDeliveries"

export default function EditDeliveryForm({ initialData }: { initialData: any }) {
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
    sender: initialData.sender || "",
    senderPhone: initialData.senderPhone || "",
    technician: initialData.technician || "",
    technicianPhone: initialData.technicianPhone || "",
    workInspect: initialData.workInspect || false,
    workInstall: initialData.workInstall || false,
    workRepair: initialData.workRepair || false,
    workTraining: initialData.workTraining || false,
    workTrainingDetails: initialData.workTrainingDetails || "",
    workInspectDetails: initialData.workInspectDetails || "",
    workInstallDetails: initialData.workInstallDetails || "",
    workRepairDetails: initialData.workRepairDetails || "",
    workOther: initialData.workOther || "",
    note: initialData.note || "",
    status: initialData.status || "Draft",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

      // Update the record
      const res = await updateRepairDelivery(initialData.id, payload)
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
              <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase">แก้ไขใบส่งมอบงาน</h1>
              <p className="text-[10px] md:text-xs font-bold text-[#ff2301] uppercase tracking-widest">Edit Delivery Note • {initialData.deliveryNumber}</p>
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
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">สถานะใบส่งมอบ (Status)</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
              >
                <option value="Draft">ร่าง / รอส่งมอบ (Draft)</option>
                <option value="Completed">ส่งมอบแล้ว (Completed)</option>
              </select>
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
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">ผู้ส่งมอบงาน (Sender Name)</label>
              <input type="text" name="sender" value={formData.sender} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">เบอร์โทร ผู้ส่งมอบ (Sender Phone)</label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { name: "workInspect", detailsName: "workInspectDetails", label: "งานตรวจเช็ค", value: formData.workInspect, details: formData.workInspectDetails },
              { name: "workInstall", detailsName: "workInstallDetails", label: "งานติดตั้ง", value: formData.workInstall, details: formData.workInstallDetails },
              { name: "workRepair", detailsName: "workRepairDetails", label: "งานซ่อม", value: formData.workRepair, details: formData.workRepairDetails },
              { name: "workTraining", detailsName: "workTrainingDetails", label: "งานอบรม", value: formData.workTraining, details: formData.workTrainingDetails },
            ].map(work => (
              <div key={work.name} className="flex flex-col gap-2">
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${work.value ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 hover:bg-white"}`}>
                  <input type="checkbox" name={work.name} checked={work.value} onChange={handleChange} className="mr-3 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500" />
                  <span className="text-sm font-bold">{work.label}</span>
                </label>
                <input
                  type="text"
                  name={work.detailsName}
                  value={work.details || ""}
                  onChange={handleChange}
                  placeholder={`รายละเอียด${work.label} (ถ้ามี)`}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
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
