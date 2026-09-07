'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { updateMarketingLead } from '@/app/actions/marketing'
import { Loader2, Save, ArrowLeft, CheckCircle2, Radio, Megaphone, Layers } from 'lucide-react'
import Link from 'next/link'

export default function EditLeadClient({ 
  lead, 
  salesReps = [],
  campaigns = []
}: { 
  lead: any; 
  salesReps?: any[]; 
  campaigns?: any[];
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Attribution state
  const [selectedChannel, setSelectedChannel] = useState(
    lead.leadSource || lead.adCampaign?.channel?.name || 'Facebook'
  )
  const [selectedCampaignId, setSelectedCampaignId] = useState(lead.adCampaignId || '')
  const [selectedAdSet, setSelectedAdSet] = useState(lead.campaignSource || '')
  const [customAdSet, setCustomAdSet] = useState(lead.campaignSource || '')

  // Available AdSets from selected campaign
  const availableAdSets = useMemo(() => {
    if (!selectedCampaignId) return []
    const cmp = campaigns.find(c => c.id === selectedCampaignId)
    if (cmp?.targetAudience && cmp.targetAudience.startsWith('{')) {
      try {
        const parsed = JSON.parse(cmp.targetAudience)
        if (Array.isArray(parsed.adSets) && parsed.adSets.length > 0) {
          return parsed.adSets
        }
      } catch {}
    }
    return []
  }, [selectedCampaignId, campaigns])

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    if (campaignId) {
      const cmp = campaigns.find(c => c.id === campaignId)
      if (cmp?.channel?.name) {
        setSelectedChannel(cmp.channel.name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessMsg('')

    const formData = new FormData(e.currentTarget)
    const finalCampaignSource = selectedAdSet === '__CUSTOM__' 
      ? customAdSet 
      : (selectedAdSet || customAdSet)

    const result = await updateMarketingLead(lead.id, {
      customerName: formData.get('customerName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      productOfInterest: formData.get('productOfInterest') as string,
      productType: formData.get('productType') as string,
      conversationContent: formData.get('conversationContent') as string,
      assignedToId: (formData.get('assignedToId') as string) || null,
      leadSource: selectedChannel || null,
      campaignSource: finalCampaignSource || null,
      adCampaignId: selectedCampaignId || null,
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

      {/* Attribution Card */}
      <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-brand-red" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              ช่องทางและที่มาของ Lead (Attribution)
            </h3>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">ระบุช่องทางหรือแคมเปญโฆษณา</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Channel */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
              ช่องทางที่มา (Channel) <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white text-gray-800"
            >
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
              <option value="Google">Google Ads</option>
              <option value="LINE">LINE</option>
              <option value="Website">Website</option>
              <option value="หน้าร้าน">หน้าร้าน (Walk-in)</option>
              <option value="แนะนำ">แนะนำ (Referral)</option>
              <option value="อื่นๆ">อื่นๆ (Other)</option>
            </select>
          </div>

          {/* Campaign Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
              แคมเปญโฆษณา (Campaign)
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white text-gray-800"
            >
              <option value="">-- ไม่ได้มาจากแคมเปญ --</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.channel?.name ? `[${c.channel.name}] ` : ''}
                  {c.internalCode ? `${c.internalCode} • ` : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ad Set Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
              ชุดโฆษณา (Ad Set)
            </label>
            {availableAdSets.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={availableAdSets.some((s: any) => s.code === selectedAdSet || s.name === selectedAdSet) ? selectedAdSet : (selectedAdSet ? '__CUSTOM__' : '')}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedAdSet(val)
                    if (val !== '__CUSTOM__') {
                      setCustomAdSet(val)
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white text-gray-800"
                >
                  <option value="">-- เลือกชุดโฆษณา --</option>
                  {availableAdSets.map((adSet: any, idx: number) => (
                    <option key={adSet.id || idx} value={adSet.code || adSet.name}>
                      {adSet.code ? `${adSet.code}: ` : ''}{adSet.name}
                    </option>
                  ))}
                  <option value="__CUSTOM__">-- ระบุชุดโฆษณาเอง (Custom) --</option>
                </select>
                {(!availableAdSets.some((s: any) => s.code === selectedAdSet || s.name === selectedAdSet) || selectedAdSet === '__CUSTOM__') && (
                  <input
                    type="text"
                    value={customAdSet}
                    onChange={(e) => {
                      setCustomAdSet(e.target.value)
                      setSelectedAdSet('__CUSTOM__')
                    }}
                    placeholder="พิมพ์ชื่อหรือรหัสชุดโฆษณา..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white"
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                value={customAdSet}
                onChange={(e) => {
                  setCustomAdSet(e.target.value)
                  setSelectedAdSet(e.target.value)
                }}
                placeholder="เช่น AS-SP-001 หรือชื่อ Ad Set"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white"
              />
            )}
          </div>
        </div>
      </div>

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
            <option value="">- เลือก -</option>
            <option value="Inverter Veichi">Inverter Veichi</option>
            <option value="Inverter Other">Inverter Other</option>
            <option value="Motor">Motor</option>
            <option value="Pump">Pump</option>
            <option value="Part">Part</option>
            <option value="MDB/DB">MDB/DB</option>
            <option value="Solar Roof">Solar Roof</option>
            <option value="Solar Pump">Solar Pump</option>
            <option value="Other">Other</option>
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
