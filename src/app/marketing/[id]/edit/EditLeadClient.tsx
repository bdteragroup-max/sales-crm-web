'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMarketingLead } from '@/app/actions/marketing'
import { Loader2, Save, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function EditLeadClient({ lead, salesReps = [] }: { lead: any; salesReps?: any[] }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessMsg('')

    const formData = new FormData(e.currentTarget)
    const result = await updateMarketingLead(lead.id, {
      customerName: formData.get('customerName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      productOfInterest: formData.get('productOfInterest') as string,
      productType: formData.get('productType') as string,
      conversationContent: formData.get('conversationContent') as string,
      assignedToId: (formData.get('assignedToId') as string) || null,
    })

    if (result.success) {
      setSuccessMsg('บันทึกการแก้ไขสำเร็จ! กำลังพากลับ...')
      setTimeout(() => {
        router.push(`/marketing/${lead.id}`)
        router.refresh()
      }, 1500)
    } else {
      setIsSubmitting(false)
      setError(result.error || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-black text-brand-red uppercase tracking-wider">พนักงานขายที่รับผิดชอบ (Sales Rep)</label>
          <select 
            name="assignedToId" 
            defaultValue={lead.assignedToId || ''}
            className="w-full px-4 py-3 rounded-xl border border-brand-red/30 bg-red-50/30 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-sm font-bold text-brand-red"
          >
            <option value="">-- ไม่ระบุ (รอมอบหมาย) --</option>
            {salesReps.map(rep => (
              <option key={rep.id} value={rep.id}>
                {rep.fullName} ({rep.role})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">ชื่อลูกค้า / บริษัท <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="customerName" 
            defaultValue={lead.customerName}
            required 
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-sm font-medium"
            placeholder="เช่น บจก. เอบีซี, คุณสมชาย..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">เบอร์โทรศัพท์ (ถ้ามี)</label>
          <input 
            type="tel" 
            name="phoneNumber"
            defaultValue={lead.phoneNumber || ''} 
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-sm font-medium"
            placeholder="08X-XXX-XXXX"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">สินค้า/บริการที่สนใจ <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="productOfInterest"
            defaultValue={lead.productOfInterest || ''} 
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-sm font-medium"
            placeholder="เช่น ปั๊มน้ำ, โซล่าเซลล์..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">ประเภทสินค้า (ระบุถ้าทราบ)</label>
          <select 
            name="productType" 
            defaultValue={lead.productType || ''}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-sm font-medium text-gray-700"
          >
            <option value="">-- ไม่ระบุ --</option>
            <option value="Solar Pump">Solar Pump</option>
            <option value="Solar Roof">Solar Roof</option>
            <option value="Automation">Automation</option>
            <option value="Trading/Spare Parts">Trading/Spare Parts</option>
            <option value="Service">Service / งานซ่อม</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-black text-gray-700 uppercase tracking-wider">รายละเอียดเพิ่มเติม</label>
        <textarea 
          name="conversationContent" 
          defaultValue={lead.conversationContent || ''}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none transition-all text-sm font-medium resize-none"
          placeholder="ความต้องการของลูกค้า, ข้อมูลจากแชท..."
        ></textarea>
      </div>

      <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
        <Link 
          href={`/marketing/${lead.id}`}
          className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ยกเลิก
        </Link>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-brand-red hover:bg-red-700 transition-all shadow-lg shadow-brand-red/30 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save size={20} />
              บันทึกการแก้ไข
            </>
          )}
        </button>
      </div>
    </form>
  )
}
