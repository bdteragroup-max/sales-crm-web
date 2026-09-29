'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Users,
  PlusCircle,
  Search,
  LayoutDashboard,
  Calendar,
  Edit3,
  FileText,
  Filter,
  RotateCcw,
  Sparkles,
  Clock,
  Send,
  Trophy,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  UploadCloud,
  Layers,
  TrendingUp,
  Grid,
  List,
  AlertCircle,
  XCircle,
  MessageSquare
} from 'lucide-react'
import DeleteLeadButton from './DeleteLeadButton'
import LeadSourceBadge, { parseLeadAttribution } from './LeadSourceBadge'

export interface MarketingLeadItem {
  id: string
  customerName: string
  phoneNumber?: string | null
  productOfInterest?: string | null
  productType?: string | null
  conversationContent?: string | null
  createdByUserId?: string
  isForwarded: boolean
  forwardedAt?: Date | string | null
  quotationId?: string | null
  createdAt: Date | string
  updatedAt?: Date | string
  assignedToId?: string | null
  isContacted?: boolean
  campaignSource?: string | null
  leadSource?: string | null
  adCampaign?: any
  assignedTo?: { fullName?: string } | null
  createdBy?: { fullName?: string } | null
  quotation?: {
    status?: string | null
    salesperson?: { fullName?: string } | null
  } | null
  latestTelesale?: {
    id?: string
    callOutcome?: string | null
    result?: string | null
    conversationSummary?: string | null
    callDate?: Date | string | null
    createdAt?: Date | string
    salesPerson?: string | null
  } | null
}

interface MarketingLeadsClientProps {
  initialLeads: MarketingLeadItem[]
  initialSearch?: string
  initialChannel?: string
  initialStage?: string
}

export default function MarketingLeadsClient({
  initialLeads,
  initialSearch = '',
  initialChannel = '',
  initialStage = 'all'
}: MarketingLeadsClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedChannel, setSelectedChannel] = useState(initialChannel)
  const [selectedStage, setSelectedStage] = useState(initialStage)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null)

  // Copy phone helper
  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(phone)
    setCopiedPhoneId(id)
    setTimeout(() => setCopiedPhoneId(null), 2000)
  }

  // Format relative date
  const formatRelativeDate = (dateString: Date | string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'วันนี้'
    if (diffDays === 1) return 'เมื่อวาน'
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  // Customer initial helper
  const getCustomerInitial = (name: string) => {
    if (!name) return 'L'
    const trimmed = name.trim()
    return trimmed.slice(0, 1).toUpperCase()
  }

  // Lead status evaluation helper
  const evaluateLeadStatus = (lead: MarketingLeadItem) => {
    const status = lead.quotation?.status || ''
    const telesaleOutcome = lead.latestTelesale?.callOutcome || lead.latestTelesale?.result || ''
    const telesaleSummary = lead.latestTelesale?.conversationSummary || ''
    const isTelesaleNotInterested =
      telesaleOutcome === 'ไม่สนใจ' ||
      (lead.latestTelesale?.result === 'ไม่สนใจ') ||
      telesaleSummary.includes('ไม่สนใจ') ||
      telesaleSummary.includes('ไม่สะดวกคุย ไม่สนใจ')

    const isQuotationLost = status.includes('ไม่สำเร็จ') || status.includes('ปฏิเสธ')
    const isLost = isQuotationLost || isTelesaleNotInterested
    const isWon = ['รอติดตั้ง', 'ปิดการขาย', 'รอส่งมอบ', 'เปิดบิลแล้ว'].includes(status)
    const isForwarded = Boolean(lead.isForwarded)
    const isContacted = Boolean(lead.isContacted) || Boolean(lead.latestTelesale)

    let currentStage = 0 // 0: New Lead
    if (isForwarded) currentStage = 1 // 1: Forwarded
    if (status || isContacted) currentStage = 2 // 2: In progress / Quotation
    if (isWon || isLost) currentStage = 3 // 3: Finished (Won / Lost)

    return {
      isLost,
      isWon,
      isForwarded,
      isContacted,
      currentStage,
      status,
      telesaleOutcome,
      isTelesaleNotInterested,
      telesaleSummary,
      telesaleSalesPerson: lead.latestTelesale?.salesPerson || null,
      telesaleDate: lead.latestTelesale?.createdAt || null
    }
  }

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const total = initialLeads.length
    let newLeads = 0
    let forwardedLeads = 0
    let wonLeads = 0
    let contactedLeads = 0
    let notInterestedLeads = 0

    for (const l of initialLeads) {
      const { isWon, isLost, isForwarded, isContacted, isTelesaleNotInterested } = evaluateLeadStatus(l)
      if (isLost || isTelesaleNotInterested) {
        notInterestedLeads++
      }
      if (!isForwarded) {
        newLeads++
      } else if (isWon) {
        wonLeads++
        forwardedLeads++
      } else {
        forwardedLeads++
        if (isContacted) contactedLeads++
      }
    }

    const conversionRate = total > 0 ? ((wonLeads / total) * 100).toFixed(1) : '0.0'

    return { total, newLeads, forwardedLeads, wonLeads, contactedLeads, notInterestedLeads, conversionRate }
  }, [initialLeads])

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const { isWon, isLost, isForwarded, isContacted, telesaleSummary, telesaleOutcome } = evaluateLeadStatus(l)
      const { channel, adSetName, adSetCode, campaignName, campaignCode } = parseLeadAttribution(l)

      // 1. Channel Filter
      if (selectedChannel) {
        const c = selectedChannel.toLowerCase()
        if (!channel || !channel.toLowerCase().includes(c)) {
          return false
        }
      }

      // 2. Stage Filter
      if (selectedStage !== 'all') {
        if (selectedStage === 'new' && isForwarded) return false
        if (selectedStage === 'forwarded' && (!isForwarded || isWon || isLost)) return false
        if (selectedStage === 'contacted' && (!isContacted || isLost)) return false
        if (selectedStage === 'won' && !isWon) return false
        if (selectedStage === 'lost' && !isLost) return false
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase().trim()
        const matchName = l.customerName.toLowerCase().includes(s)
        const matchPhone = l.phoneNumber && l.phoneNumber.includes(s)
        const matchProduct = l.productOfInterest && l.productOfInterest.toLowerCase().includes(s)
        const matchType = l.productType && l.productType.toLowerCase().includes(s)
        const matchChannel = channel && channel.toLowerCase().includes(s)
        const matchAdSet = (adSetName && adSetName.toLowerCase().includes(s)) || (adSetCode && adSetCode.toLowerCase().includes(s))
        const matchCampaign = (campaignName && campaignName.toLowerCase().includes(s)) || (campaignCode && campaignCode.toLowerCase().includes(s))
        const matchSales = l.assignedTo?.fullName?.toLowerCase().includes(s) || l.quotation?.salesperson?.fullName?.toLowerCase().includes(s)
        const matchTelesale = (telesaleSummary && telesaleSummary.toLowerCase().includes(s)) || (telesaleOutcome && telesaleOutcome.toLowerCase().includes(s))

        if (!matchName && !matchPhone && !matchProduct && !matchType && !matchChannel && !matchAdSet && !matchCampaign && !matchSales && !matchTelesale) {
          return false
        }
      }

      return true
    })
  }, [initialLeads, searchQuery, selectedChannel, selectedStage])

  // Symmetrical Workflow Stepper
  const renderWorkflowStepper = (lead: MarketingLeadItem) => {
    const {
      isLost,
      isWon,
      isForwarded,
      isContacted,
      currentStage,
      status,
      isTelesaleNotInterested,
      telesaleOutcome,
      telesaleSummary,
      telesaleSalesPerson
    } = evaluateLeadStatus(lead)

    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Symmetrical 3-segment Stepper Bar */}
        <div className="flex items-center gap-1.5 w-full">
          {/* Step 1: New Lead */}
          <div
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isLost ? 'bg-slate-300' : 'bg-brand-red shadow-xs'
            }`}
            title="1. รับ Lead เข้าระบบแล้ว"
          />

          {/* Step 2: Forwarded */}
          <div
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isLost
                ? 'bg-slate-300'
                : currentStage >= 1
                ? 'bg-brand-red shadow-xs'
                : 'bg-gray-200'
            }`}
            title="2. ส่งต่อฝ่ายขายแล้ว"
          />

          {/* Step 3: Quotation / Won / Lost */}
          <div
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isLost
                ? 'bg-rose-500 shadow-sm ring-2 ring-rose-400/30'
                : isWon
                ? 'bg-emerald-500 shadow-xs'
                : currentStage >= 2
                ? 'bg-amber-400 shadow-xs'
                : 'bg-gray-200'
            }`}
            title={isLost ? '3. ยุติการติดตาม / ไม่สนใจ' : isWon ? '3. ปิดการขายสำเร็จ' : '3. เสนอราคา'}
          />
        </div>

        {/* Status text & Badges */}
        {isTelesaleNotInterested ? (
          <div className="space-y-1.5 w-full">
            {/* Primary Status Badge Row */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs shrink-0 tracking-tight">
                <XCircle size={13} className="text-rose-600 shrink-0" />
                <span>ไม่สนใจ (Lost)</span>
              </span>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 shrink-0 whitespace-nowrap">
                ส่งต่อแล้ว
              </span>
            </div>

            {/* Prominent Sales Feedback Card */}
            {telesaleSummary && (
              <div
                className="p-2 rounded-xl bg-gradient-to-br from-rose-50 via-rose-50/70 to-white border border-rose-200 shadow-xs transition-all hover:border-rose-300"
                title={`อัปเดตจากฝ่ายขาย (${telesaleSalesPerson || 'เซลส์'}): ${telesaleSummary}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                    <MessageSquare size={10} className="text-rose-500 shrink-0" />
                    <span>เหตุผลฝ่ายขาย</span>
                  </span>
                  {telesaleSalesPerson && (
                    <span className="text-[9px] text-gray-500 font-bold truncate max-w-[85px] bg-white/90 px-1.5 py-0.2 rounded border border-gray-200">
                      {telesaleSalesPerson}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-gray-800 leading-snug line-clamp-2">
                  &ldquo;{telesaleSummary}&rdquo;
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
            <span className={isForwarded ? 'text-gray-400 text-[10px] whitespace-nowrap' : 'text-brand-red text-[11px] flex items-center gap-1 font-black whitespace-nowrap'}>
              {!isForwarded && <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />}
              {isForwarded ? 'ส่งต่อแล้ว' : 'Lead ใหม่'}
            </span>
            <span
              className={`truncate px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                !isForwarded
                  ? 'text-gray-400 border-gray-200 bg-gray-50'
                  : isWon
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                  : isLost
                  ? 'text-gray-600 border-gray-200 bg-gray-100'
                  : 'text-amber-700 border-amber-200 bg-amber-50'
              }`}
            >
              {isWon || isLost
                ? status
                : status
                ? status
                : isContacted
                ? telesaleOutcome ? `โทรแล้ว (${telesaleOutcome})` : 'โทรติดต่อแล้ว'
                : isForwarded
                ? 'รอฝ่ายขายติดต่อ'
                : 'รอส่งต่อ'}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24">
      {/* ── 1. Top Header Bar ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 via-brand-red to-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/20 ring-4 ring-red-500/10 shrink-0">
            <LayoutDashboard size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-red bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                Marketing Operations
              </span>
              <span className="text-xs text-gray-400 font-medium">• ระบบจัดการลูกค้ามุ่งหวัง</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-0.5">
              Marketing Leads
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              ศูนย์รวมและติดตาม Lead จากทุกช่องทางโฆษณา ส่งต่องานฝ่ายขาย และวัดผลตอบรับ
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/marketing/import"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95"
            id="import-excel-btn"
          >
            <UploadCloud size={16} className="text-gray-500" />
            <span>นำเข้าไฟล์ Excel</span>
          </Link>

          <Link
            href="/marketing/new"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 via-brand-red to-red-600 hover:from-red-700 hover:to-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-500/25 ring-1 ring-red-500/30 active:scale-95"
            id="create-lead-btn"
          >
            <PlusCircle size={16} className="text-white" />
            <span>เพิ่ม Lead ใหม่</span>
          </Link>
        </div>
      </div>

      {/* ── 3. Red, White, Gray KPI Cards Ribbon (Symmetrical 4-column Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Leads */}
        <div
          onClick={() => setSelectedStage('all')}
          className={`cursor-pointer bg-white rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md flex flex-col justify-between ${
            selectedStage === 'all'
              ? 'border-brand-red ring-2 ring-red-500/10'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-brand-red" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Leads ทั้งหมด</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-brand-red border border-red-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 tracking-tight">{metrics.total}</span>
              <span className="text-xs font-bold text-gray-500">รายชื่อ</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 flex items-center gap-1 font-medium">
            <Layers size={13} className="text-gray-400" />
            <span>ข้อมูลลูกค้าติดต่อเข้าสะสมในระบบ</span>
          </p>
        </div>

        {/* Card 2: New / Pending Action */}
        <div
          onClick={() => setSelectedStage('new')}
          className={`cursor-pointer bg-white rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md flex flex-col justify-between ${
            selectedStage === 'new'
              ? 'border-brand-red ring-2 ring-red-500/10'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-red-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">รอพิจารณาส่งต่อ</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 tracking-tight">{metrics.newLeads}</span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                ต้องดำเนินการ
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 flex items-center gap-1 font-medium">
            <Sparkles size={13} className="text-amber-500" />
            <span>Lead ใหม่ที่ยังไม่ได้รับมอบหมายเซลส์</span>
          </p>
        </div>

        {/* Card 3: Forwarded / In Progress */}
        <div
          onClick={() => setSelectedStage('forwarded')}
          className={`cursor-pointer bg-white rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md flex flex-col justify-between ${
            selectedStage === 'forwarded'
              ? 'border-brand-red ring-2 ring-red-500/10'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-gray-600" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ส่งต่อฝ่ายขายแล้ว</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Send size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 tracking-tight">{metrics.forwardedLeads}</span>
              <span className="text-xs font-bold text-gray-500">กำลังติดตาม</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 flex items-center gap-1 font-medium">
            <TrendingUp size={13} className="text-gray-400" />
            <span>ติดต่อแล้ว {metrics.contactedLeads} รายการ</span>
          </p>
        </div>

        {/* Card 4: Converted / Won */}
        <div
          onClick={() => setSelectedStage('won')}
          className={`cursor-pointer bg-white rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md flex flex-col justify-between ${
            selectedStage === 'won'
              ? 'border-brand-red ring-2 ring-red-500/10'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ปิดการขายสำเร็จ (Won)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Trophy size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 tracking-tight">{metrics.wonLeads}</span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Win Rate {metrics.conversionRate}%
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 flex items-center gap-1 font-medium">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>ออกบิล/รอส่งมอบ/ปิดการขายแล้ว</span>
          </p>
        </div>
      </div>

      {/* ── 4. Symmetrical Search & Filter Console ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-4">
        {/* Row 1: Search Box, Channel Dropdown & View Mode Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, แคมเปญ, Ad Set, สินค้าที่สนใจ, เซลส์ผู้ดูแล..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              id="marketing-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="ล้างข้อความค้นหา"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {/* Symmetrical Control Controls on Right */}
          <div className="flex items-center gap-2">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 hover:bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all cursor-pointer shadow-xs"
              id="marketing-channel-select"
            >
              <option value="">ทุกช่องทาง (All Channels)</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
              <option value="Google">Google Ads</option>
              <option value="LINE">LINE</option>
              <option value="Website">Website</option>
              <option value="หน้าร้าน">หน้าร้าน (Walk-in)</option>
              <option value="แนะนำ">แนะนำ (Referral)</option>
            </select>

            {/* View Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="มุมมองตาราง (Table View)"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="มุมมองการ์ด (Card View)"
              >
                <Grid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Stage Filter Pills & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          {/* Stage Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
              <Filter size={12} />
              สถานะ:
            </span>

            <button
              onClick={() => setSelectedStage('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStage === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ทั้งหมด ({initialLeads.length})
            </button>

            <button
              onClick={() => setSelectedStage('new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStage === 'new'
                  ? 'bg-brand-red text-white shadow-xs shadow-red-500/20'
                  : 'bg-red-50 text-brand-red hover:bg-red-100 border border-red-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedStage === 'new' ? 'bg-white' : 'bg-brand-red'}`} />
              รอส่งต่อ ({metrics.newLeads})
            </button>

            <button
              onClick={() => setSelectedStage('forwarded')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStage === 'forwarded'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ส่งต่อแล้ว ({metrics.forwardedLeads})
            </button>

            <button
              onClick={() => setSelectedStage('contacted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStage === 'contacted'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ติดต่อแล้ว ({metrics.contactedLeads})
            </button>

            <button
              onClick={() => setSelectedStage('won')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStage === 'won'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              ปิดการขายสำเร็จ ({metrics.wonLeads})
            </button>

            <button
              onClick={() => setSelectedStage('lost')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStage === 'lost'
                  ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/20'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <XCircle size={12} className={selectedStage === 'lost' ? 'text-white' : 'text-rose-500'} />
              <span>ไม่สนใจ ({metrics.notInterestedLeads})</span>
            </button>

            {(searchQuery || selectedChannel || selectedStage !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedChannel('')
                  setSelectedStage('all')
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center gap-1"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw size={12} />
                <span>รีเซ็ตตัวกรอง</span>
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5 ml-auto">
            <span>แสดง</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-900 rounded-md font-black border border-gray-200">
              {filteredLeads.length}
            </span>
            <span>จากทั้งหมด {initialLeads.length} รายการ</span>
          </div>
        </div>
      </div>

      {/* ── 5. Main Content: Symmetrical 7-Column Table or Cards View ── */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm table-fixed min-w-[1050px]">
              <thead className="bg-gray-50/90 text-[11px] uppercase font-bold text-gray-500 tracking-wider border-b border-gray-200">
                <tr>
                  <th className="w-[20%] px-4 py-3.5">ลูกค้า / เบอร์ติดต่อ</th>
                  <th className="w-[17%] px-4 py-3.5">ที่มา & ชุดโฆษณา (Attribution)</th>
                  <th className="w-[13%] px-4 py-3.5">ความสนใจ / สินค้า</th>
                  <th className="w-[19%] px-4 py-3.5">สถานะดำเนินงาน (Stage)</th>
                  <th className="w-[12%] px-4 py-3.5">ฝ่ายขายผู้ดูแล</th>
                  <th className="w-[11%] px-3 py-3.5">วันที่รับเรื่อง</th>
                  <th className="w-[8%] px-4 py-3.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredLeads.map((lead) => {
                  const initial = getCustomerInitial(lead.customerName)
                  const isCopied = copiedPhoneId === lead.id
                  const { isTelesaleNotInterested } = evaluateLeadStatus(lead)

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors group cursor-default ${
                        isTelesaleNotInterested
                          ? 'bg-rose-50/20 hover:bg-rose-50/40 border-l-4 border-l-rose-400'
                          : 'hover:bg-red-50/20'
                      }`}
                    >
                      {/* 1. Customer & Phone (21%) */}
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-brand-red border border-red-200/80 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/marketing/${lead.id}`}
                              className="font-black text-gray-900 hover:text-brand-red transition-colors block truncate text-sm"
                              title={lead.customerName}
                            >
                              {lead.customerName}
                            </Link>
                            {lead.phoneNumber ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={`tel:${lead.phoneNumber}`}
                                  className="text-xs text-gray-500 hover:text-brand-red font-semibold transition-colors flex items-center gap-1"
                                  title="คลิกเพื่อโทรออก"
                                >
                                  <Phone size={11} className="text-gray-400 shrink-0" />
                                  <span className="truncate">{lead.phoneNumber}</span>
                                </a>
                                <button
                                  onClick={(e) => handleCopyPhone(lead.id, lead.phoneNumber!, e)}
                                  className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors shrink-0"
                                  title="คัดลอกเบอร์โทรศัพท์"
                                >
                                  {isCopied ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                                {isCopied && (
                                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                    คัดลอกแล้ว
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">ไม่มีเบอร์โทร</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Attribution & Campaign (18%) */}
                      <td className="px-4 py-4 align-middle">
                        <LeadSourceBadge lead={lead} />
                      </td>

                      {/* 3. Product of Interest (14%) */}
                      <td className="px-4 py-4 align-middle">
                        <p className="font-bold text-gray-800 text-xs sm:text-sm truncate" title={lead.productOfInterest || '-'}>
                          {lead.productOfInterest || '-'}
                        </p>
                        {lead.productType && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded-md font-bold uppercase border border-gray-200/80 truncate max-w-full">
                            {lead.productType}
                          </span>
                        )}
                      </td>

                      {/* 4. Workflow Stepper (16%) */}
                      <td className="px-4 py-4 align-middle">
                        {renderWorkflowStepper(lead)}
                      </td>

                      {/* 5. Separate Sales Representative Column (13%) */}
                      <td className="px-4 py-4 align-middle">
                        {lead.isForwarded ? (
                          <div className="flex items-center gap-2 min-w-0" title={lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'ไม่ระบุชื่อ'}>
                            <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold border border-gray-200 shrink-0">
                              {(lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'S').slice(0, 1)}
                            </div>
                            <span className="text-xs font-bold text-gray-800 truncate block">
                              {lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'ไม่ระบุชื่อ'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/80 font-bold inline-flex items-center gap-1">
                            <Clock size={11} />
                            รอจัดสรรเซลส์
                          </span>
                        )}
                      </td>

                      {/* 6. Separate Date Column (10%) */}
                      <td className="px-3 py-4 align-middle text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
                          <Calendar size={12} className="text-gray-400 shrink-0" />
                          <span>{formatRelativeDate(lead.createdAt)}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-0.5 pl-4">
                          {new Date(lead.createdAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* 7. Symmetrical Actions Column (8%) */}
                      <td className="px-4 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/marketing/${lead.id}`}
                            className="p-2 text-brand-red bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all border border-red-100 shadow-xs"
                            title="ดูรายละเอียดข้อมูล Lead"
                          >
                            <FileText size={14} />
                          </Link>
                          <Link
                            href={`/marketing/${lead.id}/edit`}
                            className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors border border-gray-200/80"
                            title="แก้ไขข้อมูล Lead"
                          >
                            <Edit3 size={14} />
                          </Link>
                          <DeleteLeadButton leadId={lead.id} />
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 text-brand-red border border-red-100 flex items-center justify-center mb-3">
                          <AlertCircle size={26} />
                        </div>
                        <h3 className="text-base font-black text-gray-900">
                          {searchQuery || selectedChannel || selectedStage !== 'all'
                            ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข'
                            : 'ยังไม่มีข้อมูล Marketing Lead'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 mb-4 font-medium">
                          {searchQuery || selectedChannel || selectedStage !== 'all'
                            ? 'ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูข้อมูลทั้งหมด'
                            : 'เริ่มต้นสร้าง Lead ใหม่ หรือนำเข้าไฟล์ Excel เพื่อจัดการข้อมูล'}
                        </p>
                        {(searchQuery || selectedChannel || selectedStage !== 'all') ? (
                          <button
                            onClick={() => {
                              setSearchQuery('')
                              setSelectedChannel('')
                              setSelectedStage('all')
                            }}
                            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-xs"
                          >
                            ล้างตัวกรองทั้งหมด
                          </button>
                        ) : (
                          <Link
                            href="/marketing/new"
                            className="px-4 py-2 bg-brand-red text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/20"
                          >
                            + เพิ่ม Lead รายการแรก
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Symmetrical Cards Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeads.map((lead) => {
            const initial = getCustomerInitial(lead.customerName)
            const isCopied = copiedPhoneId === lead.id
            const { isForwarded } = evaluateLeadStatus(lead)

            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-red-200 hover:shadow-md transition-all relative flex flex-col justify-between group"
              >
                {!isForwarded && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-brand-red rounded-t-2xl" />
                )}

                <div>
                  {/* Card Header: Avatar, Name & Channel */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-brand-red border border-red-200/80 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {initial}
                      </div>
                      <div>
                        <Link
                          href={`/marketing/${lead.id}`}
                          className="font-black text-gray-900 hover:text-brand-red transition-colors text-base block"
                        >
                          {lead.customerName}
                        </Link>
                        <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                          <Calendar size={11} />
                          {formatRelativeDate(lead.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 max-w-[130px]">
                      <LeadSourceBadge lead={lead} />
                    </div>
                  </div>

                  {/* Phone & Product */}
                  <div className="space-y-2 py-3 border-y border-gray-100 my-3">
                    {lead.phoneNumber ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">เบอร์โทรศัพท์:</span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${lead.phoneNumber}`}
                            className="font-bold text-gray-900 hover:text-brand-red transition-colors"
                          >
                            {lead.phoneNumber}
                          </a>
                          <button
                            onClick={(e) => handleCopyPhone(lead.id, lead.phoneNumber!, e)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            title="คัดลอกเบอร์"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">สินค้าที่สนใจ:</span>
                      <span className="font-bold text-gray-800 text-right">
                        {lead.productOfInterest || '-'}
                      </span>
                    </div>

                    {lead.productType && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">ประเภท:</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded">
                          {lead.productType}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Symmetrical Stepper */}
                  <div className="mb-4">
                    {renderWorkflowStepper(lead)}
                  </div>
                </div>

                {/* Card Footer: Salesperson & Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
                  <div className="text-xs">
                    <span className="text-[10px] text-gray-400 block font-medium">ผู้ดูแล:</span>
                    <span className="font-bold text-gray-700 truncate max-w-[130px] block">
                      {lead.isForwarded
                        ? lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'ไม่ระบุชื่อ'
                        : 'รอจัดสรร'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/marketing/${lead.id}`}
                      className="px-3 py-1.5 text-xs font-bold text-brand-red bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100"
                    >
                      ดูข้อมูล
                    </Link>
                    <Link
                      href={`/marketing/${lead.id}/edit`}
                      className="p-1.5 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      title="แก้ไข"
                    >
                      <Edit3 size={15} />
                    </Link>
                    <DeleteLeadButton leadId={lead.id} />
                  </div>
                </div>
              </div>
            )
          })}

          {filteredLeads.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-200">
              <div className="max-w-sm mx-auto flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-brand-red border border-red-100 flex items-center justify-center mb-3">
                  <AlertCircle size={26} />
                </div>
                <h3 className="text-base font-black text-gray-900">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</h3>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedChannel('')
                    setSelectedStage('all')
                  }}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
