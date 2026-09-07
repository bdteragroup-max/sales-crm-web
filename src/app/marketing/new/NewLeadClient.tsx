'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createMarketingLead, searchCompaniesForLead, checkDuplicatePhone, forwardLeadToSales } from '@/app/actions/marketing'
import { Loader2, Save, ArrowLeft, Search, Send, CheckCircle2, Megaphone, Layers, Radio, AlertTriangle } from 'lucide-react'

export default function NewLeadClient({ 
  userId, 
  salesReps = [],
  campaigns = []
}: { 
  userId: string
  salesReps?: any[]
  campaigns?: any[]
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedRep, setSelectedRep] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<{name: string, company: string} | null>(null)

  // Attribution state
  const [selectedChannel, setSelectedChannel] = useState('Facebook')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedAdSet, setSelectedAdSet] = useState('')
  const [customAdSet, setCustomAdSet] = useState('')

  // Forwarding Combobox State
  const [searchRepQuery, setSearchRepQuery] = useState('')
  const [showRepDropdown, setShowRepDropdown] = useState(false)
  const repDropdownRef = useRef<HTMLDivElement>(null)

  // Autocomplete State
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ name: string, phone: string, type: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Available AdSets derived from selected campaign
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

  // When campaign selection changes, auto-sync channel if campaign has one
  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setSelectedAdSet('')
    setCustomAdSet('')
    if (campaignId) {
      const cmp = campaigns.find(c => c.id === campaignId)
      if (cmp?.channel?.name) {
        setSelectedChannel(cmp.channel.name)
      }
      // If only 1 adSet exists, default to it
      if (cmp?.targetAudience && cmp.targetAudience.startsWith('{')) {
        try {
          const parsed = JSON.parse(cmp.targetAudience)
          if (Array.isArray(parsed.adSets) && parsed.adSets.length === 1) {
            setSelectedAdSet(parsed.adSets[0].code || parsed.adSets[0].name)
          }
        } catch {}
      }
    }
  }

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (repDropdownRef.current && !repDropdownRef.current.contains(event.target as Node)) {
        setShowRepDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (customerName.length >= 2 && showDropdown) {
        setIsSearching(true)
        const res = await searchCompaniesForLead(customerName)
        if (res.success && res.data) {
          setSearchResults(res.data)
        }
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [customerName, showDropdown])

  // Check for duplicate phone
  useEffect(() => {
    const checkPhone = async () => {
      if (phoneNumber.length >= 9) {
        const res = await checkDuplicatePhone(phoneNumber)
        if (res.success && res.isDuplicate && res.contact) {
          setDuplicateWarning({ name: res.contact.name, company: res.contact.companyName })
        } else {
          setDuplicateWarning(null)
        }
      } else {
        setDuplicateWarning(null)
      }
    }

    const timer = setTimeout(checkPhone, 500)
    return () => clearTimeout(timer)
  }, [phoneNumber])

  const handleSelectCompany = (comp: { name: string, phone: string }) => {
    setCustomerName(comp.name)
    if (comp.phone && !phoneNumber) {
      setPhoneNumber(comp.phone)
    }
    setShowDropdown(false)
  }

  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessMsg('')

    const formData = new FormData(e.currentTarget)
    const finalCampaignSource = selectedAdSet === '__CUSTOM__' 
      ? customAdSet 
      : (selectedAdSet || customAdSet)

    const result = await createMarketingLead({
      customerName: customerName || (formData.get('customerName') as string),
      phoneNumber: formData.get('phoneNumber') as string,
      productOfInterest: formData.get('productOfInterest') as string,
      productType: formData.get('productType') as string,
      conversationContent: formData.get('conversationContent') as string,
      createdByUserId: userId,
      leadSource: selectedChannel || null,
      campaignSource: finalCampaignSource || null,
      adCampaignId: selectedCampaignId || null,
    })

    if (result.success && result.data) {
      if (selectedRep) {
        await forwardLeadToSales(result.data.id, selectedRep)
      }
      setSuccessMsg('บันทึกข้อมูลเรียบร้อยแล้ว! กำลังพากลับไปหน้าหลัก...')
      setTimeout(() => {
        router.push('/marketing')
        router.refresh()
      }, 1500)
    } else {
      setIsSubmitting(false)
      setError(result.error || 'ไม่สามารถสร้างข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
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

      {/* Lead Channel & Ad Set Attribution */}
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
          {/* Channel / Lead Source */}
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
                  value={selectedAdSet}
                  onChange={(e) => setSelectedAdSet(e.target.value)}
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
                {selectedAdSet === '__CUSTOM__' && (
                  <input
                    type="text"
                    value={customAdSet}
                    onChange={(e) => setCustomAdSet(e.target.value)}
                    placeholder="พิมพ์ชื่อหรือรหัสชุดโฆษณา..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white"
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                value={customAdSet}
                onChange={(e) => setCustomAdSet(e.target.value)}
                placeholder="เช่น AS-SP-001 หรือชื่อ Ad Set"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5 relative" ref={dropdownRef}>
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">ชื่อลูกค้า / บริษัท <span className="text-red-500">*</span></label>
          <div className="relative">
            <input 
              type="text" 
              name="customerName" 
              required 
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => {
                if (customerName.length >= 2) setShowDropdown(true)
              }}
              autoComplete="off"
              placeholder="ระบุชื่อลูกค้าหรือบริษัท..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all pr-10"
            />
            {isSearching && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            )}
            {!isSearching && (
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            )}
          </div>

          {/* Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
              <ul className="py-1">
                {searchResults.map((item, idx) => (
                  <li 
                    key={idx}
                    onClick={() => handleSelectCompany(item)}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-bold text-gray-900 break-words">{item.name}</p>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-500 whitespace-nowrap">
                        {item.type}
                      </span>
                    </div>
                    {item.phone && <p className="text-xs font-medium text-gray-500 mt-0.5">{item.phone}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">เบอร์โทรศัพท์ติดต่อ</label>
          <input 
            type="tel" 
            name="phoneNumber" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="08X-XXX-XXXX"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              duplicateWarning 
                ? 'border-amber-400 focus:ring-amber-400/20 focus:border-amber-500 bg-amber-50' 
                : 'border-gray-200 focus:ring-brand-red/20 focus:border-brand-red'
            }`}
          />
          {duplicateWarning && (
            <p className="text-xs font-bold text-amber-600 mt-1 flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0 text-amber-600" />
              เบอร์นี้เป็นของลูกค้ารายเดิมในระบบ: {duplicateWarning.name} ({duplicateWarning.company})
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">สินค้าที่สนใจ</label>
          <input 
            type="text" 
            name="productOfInterest" 
            placeholder="เช่น โครงการระบบเครือข่าย"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider">ประเภทสินค้า</label>
          <select 
            name="productType" 
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white"
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
        <label className="text-xs font-black text-gray-700 uppercase tracking-wider">เนื้อหาการสนทนา / ความต้องการเพิ่มเติม</label>
        <textarea 
          name="conversationContent" 
          rows={4}
          placeholder="ระบุรายละเอียดความต้องการของลูกค้า..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all resize-none"
        />
      </div>

      <div className="bg-red-50/50 rounded-2xl border border-red-100 p-6 my-6">
        <h3 className="text-sm font-black text-brand-red uppercase tracking-widest mb-4 flex items-center gap-2">
          <Send size={16} /> ส่งต่อให้ฝ่ายขายทันที (ตัวเลือกเสริม)
        </h3>
        
        <div className="max-w-md">
          <label className="block text-xs font-bold text-gray-600 mb-2">เลือกพนักงานขายที่ต้องการส่งต่อ</label>
          <div className="relative" ref={repDropdownRef}>
            <input
              type="text"
              value={searchRepQuery}
              onChange={(e) => {
                setSearchRepQuery(e.target.value)
                setShowRepDropdown(true)
                if (e.target.value === '') setSelectedRep('')
              }}
              onFocus={() => setShowRepDropdown(true)}
              placeholder="-- พิมพ์ชื่อพนักงานขายเพื่อค้นหา --"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white font-medium text-gray-700 pr-10"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

            {showRepDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <ul className="py-1">
                  <li
                    onClick={() => {
                      setSelectedRep('')
                      setSearchRepQuery('')
                      setShowRepDropdown(false)
                    }}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-500 italic"
                  >
                    -- ไม่ต้องการส่งต่อทันที --
                  </li>
                  {salesReps.filter(r => 
                    r.fullName.toLowerCase().includes(searchRepQuery.toLowerCase()) || 
                    (r.nickname && r.nickname.toLowerCase().includes(searchRepQuery.toLowerCase()))
                  ).map((rep) => (
                    <li
                      key={rep.id}
                      onClick={() => {
                        setSelectedRep(rep.id)
                        setSearchRepQuery(`${rep.fullName}${rep.nickname ? ` (${rep.nickname})` : ''}`)
                        setShowRepDropdown(false)
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-bold text-gray-700 border-t border-gray-50"
                    >
                      {rep.fullName}{rep.nickname ? ` (${rep.nickname})` : ''}
                    </li>
                  ))}
                  {searchRepQuery && salesReps.filter(r => 
                    r.fullName.toLowerCase().includes(searchRepQuery.toLowerCase()) || 
                    (r.nickname && r.nickname.toLowerCase().includes(searchRepQuery.toLowerCase()))
                  ).length === 0 && (
                    <li className="px-4 py-3 text-sm text-gray-400 text-center">
                      ไม่พบพนักงานขายชื่อนี้
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-bold">
            หากเลือกพนักงานขาย ระบบจะทำการสร้าง Quotation และส่งต่อ Lead นี้ให้ฝ่ายขายทันทีหลังบันทึก
          </p>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-xs font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all flex items-center gap-2 uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-brand-red hover:bg-red-700 transition-all flex items-center gap-2 shadow-md shadow-red-200 active:scale-95 disabled:opacity-70 disabled:active:scale-100 uppercase tracking-widest"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          บันทึก Lead
        </button>
      </div>
    </form>
  )
}
