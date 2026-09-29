'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { forwardLeadToSales } from '@/app/actions/marketing'
import {
  ArrowLeft,
  UserSquare,
  Calendar,
  Phone,
  Package,
  FileText,
  Send,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Search,
  Edit3,
  Megaphone,
  Layers,
  Copy,
  Check,
  Radio,
  Clock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck,
  XCircle
} from 'lucide-react'
import { parseLeadAttribution, getChannelBadgeStyle } from '../components/LeadSourceBadge'

export default function LeadDetailClient({ lead, salesReps }: { lead: any; salesReps: any[] }) {
  const router = useRouter()
  const [selectedRep, setSelectedRep] = useState('')
  const [isForwarding, setIsForwarding] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [copiedPhone, setCopiedPhone] = useState(false)

  // Attribution info
  const { channel, campaignName, campaignCode, adSetName, adSetCode } = parseLeadAttribution(lead)
  const channelStyle = getChannelBadgeStyle(channel)
  const formattedAdSet =
    adSetCode && adSetName && adSetCode !== adSetName
      ? `${adSetCode} • ${adSetName}`
      : adSetCode || adSetName

  // Combobox state
  const [searchRepQuery, setSearchRepQuery] = useState('')
  const [showRepDropdown, setShowRepDropdown] = useState(false)
  const repDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (repDropdownRef.current && !repDropdownRef.current.contains(event.target as Node)) {
        setShowRepDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyPhone = () => {
    if (!lead.phoneNumber) return
    navigator.clipboard.writeText(lead.phoneNumber)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  const handleForwardClick = async () => {
    if (!selectedRep) {
      setError('กรุณาเลือกฝ่ายขายที่ต้องการส่งต่อ')
      return
    }

    setError('')
    setIsForwarding(true)

    const result = await forwardLeadToSales(lead.id, selectedRep)
    setIsForwarding(false)

    if (result.success) {
      setSuccessMsg('ส่งต่อให้ฝ่ายขายเรียบร้อยแล้ว!')
      router.refresh()
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setError(result.error || 'ไม่สามารถส่งต่องานได้')
    }
  }

  // Customer Initial
  const customerInitial = lead.customerName ? lead.customerName.trim().slice(0, 1).toUpperCase() : 'L'

  // Latest telesale log
  const latestTelesale = lead.telesales && lead.telesales.length > 0 ? lead.telesales[0] : null
  const telesaleOutcome = latestTelesale?.callOutcome || latestTelesale?.result || ''
  const telesaleSummary = latestTelesale?.conversationSummary || ''
  const isTelesaleNotInterested =
    telesaleOutcome === 'ไม่สนใจ' ||
    (latestTelesale?.result === 'ไม่สนใจ') ||
    telesaleSummary.includes('ไม่สนใจ') ||
    telesaleSummary.includes('ไม่สะดวกคุย ไม่สนใจ')

  // Stage calculation for 4-Step Funnel
  const quotationStatus = lead.quotation?.status || ''
  const isLost = quotationStatus.includes('ไม่สำเร็จ') || quotationStatus.includes('ปฏิเสธ') || isTelesaleNotInterested
  const isWon = ['รอติดตั้ง', 'ปิดการขาย', 'รอส่งมอบ', 'เปิดบิลแล้ว'].includes(quotationStatus)
  const isForwarded = Boolean(lead.isForwarded)
  const isContacted = Boolean(lead.isContacted) || Boolean(latestTelesale)

  // Funnel Stage: 1 = Received, 2 = Forwarded, 3 = Contacted, 4 = Won/Quotation
  let funnelStage = 1
  if (isForwarded) funnelStage = 2
  if (isContacted) funnelStage = 3
  if (isWon || quotationStatus) funnelStage = 4

  return (
    <div className="space-y-6">
      {/* ── 1. Top Navigation & Action Ribbon (Symmetrical Header) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/marketing')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs active:scale-95"
            id="back-to-marketing-leads"
          >
            <ArrowLeft size={14} className="text-gray-500" />
            <span>กลับหน้ารวม Leads</span>
          </button>
          <span className="text-xs text-gray-400 font-medium">/</span>
          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
            ID: {lead.id.slice(-8)}
          </span>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2">
          {lead.phoneNumber && (
            <a
              href={`tel:${lead.phoneNumber}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs active:scale-95"
              title="โทรออกหาลูกค้า"
            >
              <Phone size={13} className="text-brand-red" />
              <span>โทรออก</span>
            </a>
          )}

          <Link
            href={`/marketing/${lead.id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 via-brand-red to-red-600 hover:from-red-700 hover:to-red-700 transition-all shadow-md shadow-red-500/20 active:scale-95"
            id="edit-lead-btn"
          >
            <Edit3 size={13} className="text-white" />
            <span>แก้ไขข้อมูล</span>
          </Link>
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

      {/* ── 2. Hero Customer Card (Symmetrical Centerpiece) ── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs relative overflow-hidden">
        {/* Top Red Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-brand-red to-red-600" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Row: Customer Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 text-brand-red border-2 border-red-200 shadow-md shadow-red-500/10 flex items-center justify-center font-black text-2xl shrink-0">
                {customerInitial}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {lead.customerName}
                  </h1>
                  {isForwarded ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      ส่งต่อฝ่ายขายแล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-brand-red border border-red-200 animate-pulse">
                      <Sparkles size={12} className="text-brand-red" />
                      Lead ใหม่ (รอส่งต่อ)
                    </span>
                  )}
                </div>

                {/* Phone & Meta Row */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {lead.phoneNumber ? (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-xl border border-gray-200">
                      <a
                        href={`tel:${lead.phoneNumber}`}
                        className="text-sm font-bold text-gray-800 hover:text-brand-red transition-colors flex items-center gap-1.5"
                      >
                        <Phone size={13} className="text-brand-red" />
                        <span>{lead.phoneNumber}</span>
                      </a>
                      <button
                        onClick={handleCopyPhone}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        title="คัดลอกเบอร์โทรศัพท์"
                      >
                        {copiedPhone ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                      {copiedPhone && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          คัดลอกแล้ว
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">ไม่มีข้อมูลเบอร์โทรศัพท์</span>
                  )}

                  <span className="text-xs text-gray-400 font-medium">•</span>

                  <div className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                    <Calendar size={13} className="text-gray-400" />
                    <span>บันทึกเมื่อ {new Date(lead.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Cluster */}
            <div className="flex items-center gap-2 flex-wrap sm:self-center">
              {channel && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${channelStyle.bg}`}>
                  {channelStyle.icon}
                  <span>{channelStyle.label}</span>
                </span>
              )}
              {lead.productType && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                  <Package size={12} className="text-gray-500" />
                  <span>{lead.productType}</span>
                </span>
              )}
            </div>
          </div>

          {/* Symmetrical 4-Step Funnel Progress Bar */}
          <div className="pt-6 border-t border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-brand-red" />
              <span>ลำดับขั้นตอนการดำเนินงาน (Customer Journey Pipeline)</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Step 1 */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  funnelStage >= 1
                    ? 'bg-red-50/50 border-red-200 text-gray-900'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-red">ขั้นตอนที่ 1</span>
                  <CheckCircle2 size={14} className={funnelStage >= 1 ? 'text-brand-red' : 'text-gray-300'} />
                </div>
                <p className="text-xs font-black">รับ Lead เข้าระบบ</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {new Date(lead.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              {/* Step 2 */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  funnelStage >= 2
                    ? 'bg-red-50/50 border-red-200 text-gray-900'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${funnelStage >= 2 ? 'text-brand-red' : 'text-gray-400'}`}>ขั้นตอนที่ 2</span>
                  <CheckCircle2 size={14} className={funnelStage >= 2 ? 'text-brand-red' : 'text-gray-300'} />
                </div>
                <p className="text-xs font-black">ส่งต่อให้ฝ่ายขาย</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {lead.isForwarded ? (lead.assignedTo?.fullName || 'ส่งต่อแล้ว') : 'รอพิจารณาส่งต่อ'}
                </p>
              </div>

              {/* Step 3 */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  isTelesaleNotInterested
                    ? 'bg-rose-50/60 border-rose-200 text-gray-900'
                    : funnelStage >= 3
                    ? 'bg-red-50/50 border-red-200 text-gray-900'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isTelesaleNotInterested ? 'text-rose-600' : funnelStage >= 3 ? 'text-brand-red' : 'text-gray-400'}`}>ขั้นตอนที่ 3</span>
                  {isTelesaleNotInterested ? (
                    <XCircle size={14} className="text-rose-500" />
                  ) : (
                    <CheckCircle2 size={14} className={funnelStage >= 3 ? 'text-brand-red' : 'text-gray-300'} />
                  )}
                </div>
                <p className="text-xs font-black">
                  {isTelesaleNotInterested ? 'ติดต่อแล้ว (ไม่สนใจ)' : 'ติดต่อ / นัดหมาย'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {isTelesaleNotInterested
                    ? 'ฝ่ายขายบันทึก: ไม่สนใจ'
                    : isContacted
                    ? telesaleOutcome ? `โทรแล้ว (${telesaleOutcome})` : 'โทรติดต่อเรียบร้อย'
                    : 'รอฝ่ายขายโทรติดต่อ'}
                </p>
              </div>

              {/* Step 4 */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  isTelesaleNotInterested
                    ? 'bg-gray-50 border-gray-200 text-gray-400'
                    : funnelStage >= 4
                    ? isWon
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : isLost
                      ? 'bg-gray-100 border-gray-300 text-gray-600'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${!isTelesaleNotInterested && funnelStage >= 4 ? 'text-emerald-700' : 'text-gray-400'}`}>ขั้นตอนที่ 4</span>
                  {!isTelesaleNotInterested && funnelStage >= 4 ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-gray-300" />}
                </div>
                <p className="text-xs font-black">เสนอราคา / ปิดการขาย</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {isTelesaleNotInterested
                    ? 'ยุติการติดตาม (ไม่สนใจ)'
                    : quotationStatus || 'ยังไม่เปิดใบเสนอราคา'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Symmetrical 2-Column Grid (Balanced 50% - 50% split) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT COLUMN: Marketing & Product Context ── */}
        <div className="space-y-6">
          {/* Card 1: Marketing Attribution */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Radio size={16} className="text-brand-red" />
                <span>ที่มาและการตลาด (Attribution)</span>
              </h2>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                Campaign Data
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Channel */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  ช่องทางหลัก (Channel)
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${channelStyle.bg}`}>
                  {channelStyle.icon}
                  <span>{channelStyle.label}</span>
                </span>
              </div>

              {/* Ad Set */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  ชุดโฆษณา (Ad Set)
                </span>
                {formattedAdSet ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-gray-800 border border-gray-200 text-xs font-bold shadow-xs truncate max-w-full">
                    <Layers size={12} className="text-brand-red shrink-0" />
                    <span className="truncate">{formattedAdSet}</span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">ไม่ได้ระบุชุดโฆษณา</span>
                )}
              </div>

              {/* Campaign */}
              <div className="sm:col-span-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  แคมเปญโฆษณา (Campaign)
                </span>
                {campaignName || campaignCode ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <Megaphone size={14} className="text-brand-red shrink-0" />
                    <span>
                      {campaignCode ? `[${campaignCode}] ` : ''}
                      {campaignName || '-'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">ไม่ได้ระบุชื่อแคมเปญ</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Product & Conversation Content */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-brand-red" />
                <span>สินค้าและบันทึกความต้องการ (Product & Request)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  สินค้าที่สนใจ
                </span>
                <p className="text-sm font-bold text-gray-900">
                  {lead.productOfInterest || '-'}
                </p>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  ประเภทสินค้า / โซลูชัน
                </span>
                <p className="text-sm font-bold text-gray-900">
                  {lead.productType || '-'}
                </p>
              </div>
            </div>

            {/* Conversation Content Quote Box */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-brand-red" />
                <span>บันทึกความต้องการ / ข้อมูลการสนทนา</span>
              </span>
              <div className="p-4 rounded-2xl bg-gray-50 border-l-4 border-l-brand-red border border-gray-200 text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                {lead.conversationContent || (
                  <span className="text-gray-400 italic">ไม่มีข้อมูลบันทึกการสนทนา</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Sales Assignment & Pipeline Status ── */}
        <div className="space-y-6">
          {/* Card 3: Sales Assignment Box */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={16} className="text-brand-red" />
                <span>ผู้รับผิดชอบงานขาย (Sales Representative)</span>
              </h2>
            </div>

            {lead.isForwarded ? (
              /* Already Forwarded State */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50/40 to-gray-50 border border-red-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-red text-white flex items-center justify-center font-black text-lg shadow-sm shadow-red-500/20 shrink-0">
                    {(lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'S').slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider block">
                      ฝ่ายขายผู้รับผิดชอบ
                    </span>
                    <p className="text-base font-black text-gray-900 truncate">
                      {lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'ไม่ระบุชื่อ'}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {lead.assignedTo?.role || lead.assignedTo?.position || 'ตัวแทนฝ่ายขาย'}
                    </p>
                  </div>

                  {lead.assignedTo?.phoneNumber && (
                    <a
                      href={`tel:${lead.assignedTo.phoneNumber}`}
                      className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-brand-red hover:border-red-200 transition-all shadow-xs shrink-0"
                      title="โทรหาเซลส์ผู้ดูแล"
                    >
                      <Phone size={15} />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block mb-0.5">วันและเวลาส่งต่อ</span>
                    <span className="font-bold text-gray-800">
                      {lead.forwardedAt
                        ? new Date(lead.forwardedAt).toLocaleString('th-TH', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : '-'}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block mb-0.5">สถานะการส่งมอบ</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      มอบหมายสำเร็จ
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Forward to Sales Form */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
                  <p className="text-xs font-bold text-brand-red flex items-center gap-1.5 mb-1">
                    <Sparkles size={14} />
                    <span>Lead นี้ยังไม่ได้ส่งต่อให้ฝ่ายขาย</span>
                  </p>
                  <p className="text-xs text-gray-600 font-medium">
                    กรุณาเลือกพนักงานขายเพื่อมอบหมายงานให้ติดตามลูกค้า
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    เลือกพนักงานขาย
                  </label>
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all pr-10"
                    />
                    <Search
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />

                    {showRepDropdown && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                        <div
                          onClick={() => {
                            setSelectedRep('')
                            setSearchRepQuery('')
                            setShowRepDropdown(false)
                          }}
                          className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-xs font-bold text-gray-400"
                        >
                          -- ยกเลิกการเลือก --
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
                </div>

                <button
                  onClick={handleForwardClick}
                  disabled={isForwarding || !selectedRep}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-brand-red to-red-600 hover:from-red-700 hover:to-red-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-500/25 active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                >
                  {isForwarding ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  <span>ยืนยันการส่งต่อให้ฝ่ายขาย</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 4: Pipeline Status & Activity Log */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-red" />
                <span>สถานะในท่อการขาย (Pipeline Status)</span>
              </h2>
            </div>

            <div
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                isTelesaleNotInterested
                  ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-500/10'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div>
                <span
                  className={`text-[10px] uppercase tracking-wider block mb-0.5 ${
                    isTelesaleNotInterested ? 'text-rose-600 font-extrabold' : 'text-gray-400 font-bold'
                  }`}
                >
                  สถานะปัจจุบัน
                </span>
                <span className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                  {isTelesaleNotInterested && <XCircle size={15} className="text-rose-600 shrink-0" />}
                  {isWon
                    ? quotationStatus
                    : isTelesaleNotInterested
                    ? 'ลูกค้าไม่สนใจ (เซลส์โทรแล้ว)'
                    : isLost
                    ? quotationStatus || 'ไม่สำเร็จ'
                    : quotationStatus
                    ? `เสนอราคา (${quotationStatus})`
                    : isContacted
                    ? telesaleOutcome ? `โทรติดต่อแล้ว (${telesaleOutcome})` : 'โทรติดต่อแล้ว'
                    : isForwarded
                    ? 'รอฝ่ายขายติดต่อ'
                    : 'รอพิจารณาส่งต่อ'}
                </span>
              </div>

              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-black border shadow-xs ${
                  isWon
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isTelesaleNotInterested
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : isLost
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : isContacted
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-brand-red border-red-100'
                }`}
              >
                {isWon ? 'Won' : isTelesaleNotInterested ? '❌ ไม่สนใจ (Lost)' : isLost ? 'Lost' : isContacted ? 'Contacted' : 'Pending'}
              </span>
            </div>

            {/* Rejection Reason Callout */}
            {isTelesaleNotInterested && telesaleSummary && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 via-rose-50/60 to-white border border-rose-200 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-rose-600 shrink-0" />
                    <span>เหตุผลที่ลูกค้าไม่สนใจ (จากฝ่ายขาย)</span>
                  </span>
                  {latestTelesale?.user?.fullName && (
                    <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-xs">
                      เซลส์: {latestTelesale.user.fullName}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-gray-800 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-rose-100/90 shadow-xs">
                  &ldquo;{telesaleSummary}&rdquo;
                </p>
              </div>
            )}

            {/* Telesales activity history if any */}
            {lead.telesales && lead.telesales.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-gray-700 block">
                  ประวัติการโทร (Telesales Logs)
                </span>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {lead.telesales.map((call: any) => {
                    const isCallNotInterested = call.callOutcome === 'ไม่สนใจ' || call.result === 'ไม่สนใจ' || (call.conversationSummary && call.conversationSummary.includes('ไม่สนใจ'))
                    return (
                      <div
                        key={call.id}
                        className={`p-3 rounded-xl border text-xs transition-colors ${
                          isCallNotInterested
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-800">
                            {new Date(call.createdAt).toLocaleDateString('th-TH')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isCallNotInterested
                                ? 'bg-rose-100/80 text-rose-700 border-rose-300 font-extrabold'
                                : 'bg-white text-gray-600 border-gray-200'
                            }`}
                          >
                            {isCallNotInterested ? '❌ ไม่สนใจ' : call.callOutcome || call.result || 'โทรติดต่อ'}
                          </span>
                        </div>
                        {call.conversationSummary && (
                          <p className="text-gray-600 text-[11px] mt-1 whitespace-pre-wrap">{call.conversationSummary}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Symmetrical Audit Ribbon ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-gray-500">
          <div className="flex items-center gap-2">
            <UserSquare size={15} className="text-gray-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-gray-400 block font-medium">ผู้สร้าง Lead</span>
              <span className="font-bold text-gray-800 truncate block">
                {lead.createdBy?.fullName || 'ไม่ระบุ'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400 shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block font-medium">วันที่บันทึกเข้าระบบ</span>
              <span className="font-bold text-gray-800 block">
                {new Date(lead.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit'
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={15} className="text-gray-400 shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block font-medium">อัปเดตล่าสุด</span>
              <span className="font-bold text-gray-800 block">
                {new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit'
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExternalLink size={15} className="text-gray-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-gray-400 block font-medium">รหัสอ้างอิง</span>
              <span className="font-mono font-bold text-gray-800 block truncate">
                {lead.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
