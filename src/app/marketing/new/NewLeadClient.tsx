'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  createMarketingLead,
  searchCompaniesForLead,
  checkDuplicatePhone,
  forwardLeadToSales
} from '@/app/actions/marketing'
import {
  Loader2,
  Save,
  ArrowLeft,
  Search,
  CheckCircle2,
  Megaphone,
  Layers,
  Radio,
  AlertTriangle,
  Users,
  Phone,
  Package,
  MessageSquare,
  UserCheck,
  Sparkles,
  X,
  RotateCcw,
  Check,
  PlusCircle,
  Building,
  HelpCircle,
  Zap,
  ArrowRight
} from 'lucide-react'
import { getChannelBadgeStyle } from '../components/LeadSourceBadge'

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
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedRep, setSelectedRep] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; company: string } | null>(null)

  // Attribution state
  const [selectedChannel, setSelectedChannel] = useState('Facebook')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedAdSet, setSelectedAdSet] = useState('')
  const [customAdSet, setCustomAdSet] = useState('')

  // Campaign Combobox State
  const [searchCampaignQuery, setSearchCampaignQuery] = useState('')
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false)
  const campaignDropdownRef = useRef<HTMLDivElement>(null)

  // Forwarding Combobox State
  const [searchRepQuery, setSearchRepQuery] = useState('')
  const [showRepDropdown, setShowRepDropdown] = useState(false)
  const repDropdownRef = useRef<HTMLDivElement>(null)

  // Customer & Product State
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [productOfInterest, setProductOfInterest] = useState('')
  const [productType, setProductType] = useState('')
  const [conversationContent, setConversationContent] = useState('')

  // Autocomplete State for Customer Search
  const [searchResults, setSearchResults] = useState<Array<{ name: string; phone: string; type: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtered campaigns based on search query
  const filteredCampaigns = useMemo(() => {
    if (!searchCampaignQuery.trim()) return campaigns
    const q = searchCampaignQuery.toLowerCase().trim()
    return campaigns.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(q)
      const matchCode =
        c.internalCode?.toLowerCase().includes(q) || c.campaignId?.toLowerCase().includes(q)
      const matchChannel = c.channel?.name?.toLowerCase().includes(q)
      return matchName || matchCode || matchChannel
    })
  }, [campaigns, searchCampaignQuery])

  // Derived AdSets from selected campaign
  const availableAdSets = useMemo(() => {
    if (!selectedCampaignId) return []
    const cmp = campaigns.find((c) => c.id === selectedCampaignId)
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

  // Current selected campaign object
  const currentCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === selectedCampaignId) || null
  }, [selectedCampaignId, campaigns])

  // Current selected sales rep object
  const currentSalesRep = useMemo(() => {
    return salesReps.find((r) => r.id === selectedRep) || null
  }, [selectedRep, salesReps])

  // Channel style preview
  const channelBadgeStyle = useMemo(() => {
    return getChannelBadgeStyle(selectedChannel)
  }, [selectedChannel])

  // When campaign selection changes, auto-sync channel if campaign has one
  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setSelectedAdSet('')
    setCustomAdSet('')
    if (campaignId) {
      const cmp = campaigns.find((c) => c.id === campaignId)
      if (cmp) {
        setSearchCampaignQuery(cmp.name)
      }
      if (cmp?.channel?.name) {
        setSelectedChannel(cmp.channel.name)
      }
      if (cmp?.targetAudience && cmp.targetAudience.startsWith('{')) {
        try {
          const parsed = JSON.parse(cmp.targetAudience)
          if (Array.isArray(parsed.adSets) && parsed.adSets.length === 1) {
            setSelectedAdSet(parsed.adSets[0].code || parsed.adSets[0].name)
          }
        } catch {}
      }
    } else {
      setSearchCampaignQuery('')
    }
  }

  // Handle outside click for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (repDropdownRef.current && !repDropdownRef.current.contains(event.target as Node)) {
        setShowRepDropdown(false)
      }
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        setShowCampaignDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced Search for existing companies/contacts
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
    }, 350)

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

    const timer = setTimeout(checkPhone, 400)
    return () => clearTimeout(timer)
  }, [phoneNumber])

  const handleSelectCompany = (comp: { name: string; phone: string }) => {
    setCustomerName(comp.name)
    if (comp.phone && !phoneNumber) {
      setPhoneNumber(comp.phone)
    }
    setShowDropdown(false)
  }

  // Reset form
  const handleResetForm = () => {
    setCustomerName('')
    setPhoneNumber('')
    setProductOfInterest('')
    setProductType('')
    setConversationContent('')
    setSelectedChannel('Facebook')
    setSelectedCampaignId('')
    setSearchCampaignQuery('')
    setShowCampaignDropdown(false)
    setSelectedAdSet('')
    setCustomAdSet('')
    setSelectedRep('')
    setSearchRepQuery('')
    setShowRepDropdown(false)
    setError('')
    setSuccessMsg('')
    setDuplicateWarning(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!customerName.trim()) {
      setError('กรุณาระบุชื่อลูกค้าหรือชื่อบริษัท')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessMsg('')

    const finalCampaignSource =
      selectedAdSet === '__CUSTOM__' ? customAdSet.trim() : (selectedAdSet || customAdSet).trim()

    const result = await createMarketingLead({
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      productOfInterest: productOfInterest.trim() || undefined,
      productType: productType || undefined,
      conversationContent: conversationContent.trim() || undefined,
      createdByUserId: userId,
      leadSource: selectedChannel || null,
      campaignSource: finalCampaignSource || null,
      adCampaignId: selectedCampaignId || null
    })

    if (result.success && result.data) {
      if (selectedRep) {
        await forwardLeadToSales(result.data.id, selectedRep)
      }
      setSuccessMsg('บันทึกข้อมูลลูกค้าใหม่สำเร็จ! กำลังกลับสู่หน้ารวม Leads...')
      setTimeout(() => {
        router.push('/marketing')
        router.refresh()
      }, 1200)
    } else {
      setIsSubmitting(false)
      setError(result.error || 'ไม่สามารถสร้างข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── 1. Top Navigation & Breadcrumb Ribbon ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-2.5">
          <Link
            href="/marketing"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs active:scale-95"
            id="back-to-marketing-list-btn"
          >
            <ArrowLeft size={14} className="text-gray-500" />
            <span>กลับหน้ารวม Leads</span>
          </Link>
          <span className="text-xs text-gray-400 font-medium">/</span>
          <span className="text-xs font-bold text-brand-red bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
            สร้าง Lead ใหม่
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetForm}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-xs"
          title="ล้างข้อมูลในฟอร์มทั้งหมด"
        >
          <RotateCcw size={12} />
          <span>ล้างฟอร์ม</span>
        </button>
      </div>

      {/* ── 2. Hero Centerpiece Header (Symmetrical Red Accent) ── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs relative overflow-hidden">
        {/* Red Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-brand-red to-red-600" />

        <div className="p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-brand-red to-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/20 ring-4 ring-red-500/10 shrink-0">
              <PlusCircle size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-red bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                  New Lead Entry
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Sparkles size={11} className="text-brand-red shrink-0" />
                  <span>ระบบบันทึกลูกค้ามุ่งหวัง</span>
                </span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                สร้างข้อมูลลูกค้าใหม่ (New Lead)
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                บันทึกข้อมูลติดต่อ แหล่งที่มาแคมเปญโฆษณา และจัดสรรส่งต่องานฝ่ายขายทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              ฟอร์มสมมาตร 2 คอลัมน์
            </span>
          </div>
        </div>
      </div>

      {/* ── Alerts Banner ── */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-2xl border border-red-200 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-sm font-bold rounded-2xl border border-emerald-200 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 3. Balanced 2-Column Symmetrical Form Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ════════════════════════════════════════════════════════════════
            LEFT COLUMN: ข้อมูลลูกค้า & ความต้องการ (Customer & Profile)
            ════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Card 1: ข้อมูลผู้ติดต่อและองค์กร */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-brand-red" />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-brand-red" />
                <span>ข้อมูลลูกค้าและสินค้า (Customer Profile)</span>
              </h2>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                จำเป็น *
              </span>
            </div>

            {/* Customer Name Input with Autocomplete */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building size={13} className="text-gray-400" />
                  <span>ชื่อลูกค้า / บริษัท <span className="text-brand-red">*</span></span>
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">ค้นหาประวัติเดิมอัตโนมัติ</span>
              </label>
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
                  placeholder="เช่น คุณสมชาย หรือ บริษัท สยามเทค จำกัด..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs"
                  id="lead-customer-name-input"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400 pointer-events-none">
                  {isSearching ? (
                    <Loader2 size={16} className="animate-spin text-brand-red" />
                  ) : (
                    <Search size={16} />
                  )}
                </div>
              </div>

              {/* Autocomplete Results Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
                  <div className="p-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    พบข้อมูลที่มีอยู่ในระบบ:
                  </div>
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCompany(item)}
                      className="px-4 py-2.5 hover:bg-red-50/60 cursor-pointer transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                        {item.phone && (
                          <p className="text-xs text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-gray-400" />
                            <span>{item.phone}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number Input with Duplicate Checking */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" />
                  <span>เบอร์โทรศัพท์ติดต่อ</span>
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">มีระบบตรวจจับเบอร์ซ้ำ</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-xs ${
                    duplicateWarning
                      ? 'border-amber-300 focus:ring-amber-400/20 focus:border-amber-500 bg-amber-50/40 text-gray-900'
                      : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red'
                  }`}
                  id="lead-phone-input"
                />
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Duplicate Warning Pill */}
              {duplicateWarning && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>
                    เบอร์นี้มีในระบบแล้ว: <strong>{duplicateWarning.name}</strong> ({duplicateWarning.company})
                  </span>
                </div>
              )}
            </div>

            {/* Symmetrical 2-Column: Product & Product Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={13} className="text-gray-400" />
                  <span>สินค้าที่สนใจ</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="productOfInterest"
                    value={productOfInterest}
                    onChange={(e) => setProductOfInterest(e.target.value)}
                    placeholder="เช่น Solar Roof 5kW, Inverter"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs"
                    id="lead-product-interest-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-gray-400" />
                  <span>ประเภทสินค้า / โซลูชัน</span>
                </label>
                <select
                  name="productType"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs cursor-pointer"
                  id="lead-product-type-select"
                >
                  <option value="">-- เลือกประเภทสินค้า --</option>
                  <option value="Solar Roof">Solar Roof (โซล่ารูฟท็อป)</option>
                  <option value="Solar Pump">Solar Pump (ปั๊มน้ำโซล่า)</option>
                  <option value="Inverter Veichi">Inverter Veichi</option>
                  <option value="Inverter Other">Inverter Other</option>
                  <option value="Motor">Motor (มอเตอร์ไฟฟ้า)</option>
                  <option value="Pump">Pump (ปั๊มน้ำอุตสาหกรรม)</option>
                  <option value="MDB/DB">MDB/DB (ตู้ควบคุมไฟฟ้า)</option>
                  <option value="Part">Part (อะไหล่และอุปกรณ์)</option>
                  <option value="Other">Other (อื่นๆ)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: บันทึกความต้องการและการสนทนา */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-slate-500" />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-brand-red" />
                <span>บันทึกความต้องการ / ข้อมูลการสนทนา</span>
              </h2>
            </div>

            <div className="space-y-1.5">
              <textarea
                name="conversationContent"
                rows={5}
                value={conversationContent}
                onChange={(e) => setConversationContent(e.target.value)}
                placeholder="ระบุความต้องการของลูกค้า เช่น ค่าไฟต่อเดือน ปัญหาที่พบ หรือเงื่อนไขที่ลูกค้าต้องการ..."
                className="w-full p-4 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all resize-none shadow-xs leading-relaxed"
                id="lead-conversation-textarea"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <HelpCircle size={14} className="text-gray-400 shrink-0" />
              <span>ข้อมูลนี้จะถูกส่งต่อไปยังฝ่ายขายเพื่อให้ติดตามและเตรียมข้อมูลก่อนโทรหาลูกค้า</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT COLUMN: ที่มาการตลาด & การส่งต่อฝ่ายขาย (Attribution & Sales)
            ════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Card 3: ที่มาและการตลาด (Attribution) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-brand-red" />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Radio size={16} className="text-brand-red" />
                <span>ที่มาและการตลาด (Attribution)</span>
              </h2>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                Tracking Data
              </span>
            </div>

            {/* Channel Selection with Live Badge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio size={13} className="text-gray-400" />
                  <span>ช่องทางที่มา (Channel) <span className="text-brand-red">*</span></span>
                </label>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${channelBadgeStyle.bg}`}>
                  {channelBadgeStyle.icon}
                  <span>{channelBadgeStyle.label}</span>
                </span>
              </div>

              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs cursor-pointer"
                id="lead-channel-select"
              >
                <option value="Facebook">Facebook (โฆษณา / แฟนเพจ)</option>
                <option value="TikTok">TikTok (วิดีโอ / โฆษณา)</option>
                <option value="Google">Google Ads (Search / Display)</option>
                <option value="LINE">LINE Official Account</option>
                <option value="Website">Website (เว็บไซต์ทางการ)</option>
                <option value="หน้าร้าน">หน้าร้าน (Walk-in / หน้าร้านสาขา)</option>
                <option value="แนะนำ">แนะนำ (Referral / ลูกค้าบอกต่อ)</option>
                <option value="อื่นๆ">อื่นๆ (Other)</option>
              </select>
            </div>

            {/* Campaign Selection (Searchable Combobox) */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Megaphone size={13} className="text-gray-400" />
                  <span>แคมเปญโฆษณา (Campaign)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">พิมพ์ค้นหาหรือเลือกจากระบบ</span>
              </label>

              <div className="relative" ref={campaignDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchCampaignQuery}
                    onChange={(e) => {
                      setSearchCampaignQuery(e.target.value)
                      setShowCampaignDropdown(true)
                      if (e.target.value === '') {
                        handleCampaignChange('')
                      }
                    }}
                    onFocus={() => setShowCampaignDropdown(true)}
                    placeholder="-- พิมพ์ชื่อแคมเปญ, รหัส หรือช่องทางเพื่อค้นหา --"
                    className="w-full pl-4 pr-14 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs"
                    id="lead-campaign-search-input"
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {selectedCampaignId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCampaignChange('')
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                        title="ล้างค่าที่เลือก"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <Search size={16} className="text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {showCampaignDropdown && (
                  <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
                    <div
                      onClick={() => {
                        handleCampaignChange('')
                        setShowCampaignDropdown(false)
                      }}
                      className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-xs font-bold text-gray-400 transition-colors"
                    >
                      -- ไม่ได้มาจากแคมเปญโฆษณา --
                    </div>
                    {filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map((c) => {
                        const isSelected = selectedCampaignId === c.id
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              handleCampaignChange(c.id)
                              setShowCampaignDropdown(false)
                            }}
                            className={`px-4 py-2.5 hover:bg-red-50 hover:text-brand-red cursor-pointer text-xs transition-colors flex items-center justify-between gap-3 ${
                              isSelected ? 'bg-red-50/70 text-brand-red font-bold' : 'text-gray-700 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {c.channel?.name && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                  {c.channel.name}
                                </span>
                              )}
                              {c.internalCode && (
                                <span className="shrink-0 font-mono text-[11px] text-gray-500 font-bold">
                                  {c.internalCode}
                                </span>
                              )}
                              <span className="truncate">{c.name}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-brand-red shrink-0" />}
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-4 py-4 text-center text-xs text-gray-400 font-medium">
                        ไม่พบแคมเปญที่ตรงกับคำค้นหา
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Ad Set Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-gray-400" />
                  <span>ชุดโฆษณา (Ad Set / Campaign Source)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">กลุ่มเป้าหมายหรือรหัสชุดแอด</span>
              </label>
              {availableAdSets.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedAdSet}
                    onChange={(e) => setSelectedAdSet(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs cursor-pointer"
                    id="lead-adset-select"
                  >
                    <option value="">-- เลือกชุดโฆษณาจากแคมเปญ --</option>
                    {availableAdSets.map((adSet: any, idx: number) => (
                      <option key={adSet.id || idx} value={adSet.code || adSet.name}>
                        {adSet.code ? `${adSet.code} • ` : ''}
                        {adSet.name}
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
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={customAdSet}
                  onChange={(e) => setCustomAdSet(e.target.value)}
                  placeholder="เช่น AS-SOLAR-001 หรือชื่อกลุ่มเป้าหมาย"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all shadow-xs"
                  id="lead-custom-adset-input"
                />
              )}
            </div>

            {/* Symmetrical Attribution Preview Ribbon */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-50/30 to-gray-50 border border-gray-200 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                สรุปการระบุที่มา (Attribution Flow Preview)
              </span>
              <div className="flex items-center gap-1.5 flex-wrap font-bold text-gray-800">
                <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-xs text-brand-red">
                  {selectedChannel}
                </span>
                <ArrowRight size={12} className="text-gray-400 shrink-0" />
                <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-xs truncate max-w-[150px]">
                  {currentCampaign ? currentCampaign.name : 'ไม่ได้ผูกแคมเปญ'}
                </span>
                <ArrowRight size={12} className="text-gray-400 shrink-0" />
                <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-xs truncate max-w-[140px] text-gray-600">
                  {selectedAdSet === '__CUSTOM__' ? customAdSet || 'กำหนดเอง' : selectedAdSet || customAdSet || 'ไม่มี Ad Set'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: ส่งต่อให้ฝ่ายขายทันที (Sales Assignment) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-slate-500" />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={16} className="text-brand-red" />
                <span>จัดสรรส่งต่อให้ฝ่ายขาย (Sales Assignment)</span>
              </h2>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                ตัวเลือกเสริม
              </span>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={13} className="text-gray-400" />
                <span>เลือกพนักงานขายที่ต้องการส่งต่อ</span>
              </label>

              {/* Combobox Search */}
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
                  placeholder="-- ค้นหาชื่อพนักงานขาย --"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-gray-50/60 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all pr-10 shadow-xs"
                  id="lead-sales-rep-search-input"
                />
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

                {showRepDropdown && (
                  <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                    <div
                      onClick={() => {
                        setSelectedRep('')
                        setSearchRepQuery('')
                        setShowRepDropdown(false)
                      }}
                      className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-xs font-bold text-gray-400 transition-colors"
                    >
                      -- ไม่ต้องการส่งต่อทันที (รอจัดสรรภายหลัง) --
                    </div>
                    {salesReps
                      .filter(
                        (r) =>
                          r.fullName.toLowerCase().includes(searchRepQuery.toLowerCase()) ||
                          (r.nickname && r.nickname.toLowerCase().includes(searchRepQuery.toLowerCase()))
                      )
                      .map((rep) => (
                        <div
                          key={rep.id}
                          onClick={() => {
                            setSelectedRep(rep.id)
                            setSearchRepQuery(
                              `${rep.fullName}${rep.nickname ? ` (${rep.nickname})` : ''}`
                            )
                            setShowRepDropdown(false)
                          }}
                          className="px-4 py-2.5 hover:bg-red-50 hover:text-brand-red cursor-pointer text-xs font-bold text-gray-700 transition-colors flex items-center justify-between"
                        >
                          <span>{rep.fullName}{rep.nickname ? ` (${rep.nickname})` : ''}</span>
                          {selectedRep === rep.id && <Check size={14} className="text-brand-red" />}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Selected Rep Preview Badge */}
              {currentSalesRep && (
                <div className="p-3 rounded-2xl bg-red-50/60 border border-red-100 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center text-xs font-black shadow-xs">
                      {currentSalesRep.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">
                        {currentSalesRep.fullName}
                      </p>
                      {currentSalesRep.nickname && (
                        <span className="text-[10px] text-brand-red font-bold">
                          ชื่อเล่น: {currentSalesRep.nickname}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRep('')
                      setSearchRepQuery('')
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                    title="ยกเลิกการเลือก"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                <Zap size={13} className="text-amber-500 shrink-0" />
                <span>หากเลือกฝ่ายขาย ระบบจะทำการสร้าง Quotation ส่งต่องาน และส่งการแจ้งเตือน (In-App & LINE) ให้เซลส์ทันที</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Symmetrical Action Ribbon ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-500 font-medium flex items-center gap-2 text-center sm:text-left">
          <Sparkles size={15} className="text-brand-red shrink-0" />
          <span>กรุณาตรวจสอบความถูกต้องของข้อมูลลูกค้ารายใหม่ก่อนบันทึกเข้าระบบ</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2"
            id="cancel-create-lead-btn"
          >
            <ArrowLeft size={14} className="text-gray-500" />
            <span>ยกเลิก</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial px-7 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-red-600 via-brand-red to-red-600 hover:from-red-700 hover:to-red-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-500/25 ring-2 ring-red-500/20 active:scale-95 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            id="submit-create-lead-btn"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>บันทึกสร้าง Lead ใหม่</span>
          </button>
        </div>
      </div>
    </form>
  )
}
