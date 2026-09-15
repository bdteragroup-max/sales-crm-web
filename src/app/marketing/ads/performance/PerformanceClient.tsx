'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ActiveAdPerformanceItem,
  PerformanceSnapshot,
  savePerformanceSnapshot,
  saveBulkPerformanceSnapshots,
  getAdPerformanceHistory,
  getActiveAdsWithPerformance
} from '@/app/actions/ads-performance'
import {
  Search,
  Filter,
  Calendar,
  Download,
  Lock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  MousePointer,
  ExternalLink,
  Layers,
  Save,
  X,
  RefreshCw,
  Info,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  RotateCcw,
  Radio,
  Activity,
  FileSpreadsheet
} from 'lucide-react'
import UpdateResultsModal from './components/UpdateResultsModal'
import MassUpdateModal from './components/MassUpdateModal'
import SnapshotHistoryModal from './components/SnapshotHistoryModal'

interface PerformanceClientProps {
  campaigns: any[]
  initialActiveAds: ActiveAdPerformanceItem[]
  initialSnapshots: PerformanceSnapshot[]
  currentUser: {
    name: string
    role: string
  }
}

export default function PerformanceClient({
  campaigns,
  initialActiveAds,
  initialSnapshots,
  currentUser
}: PerformanceClientProps) {
  const router = useRouter()

  // Main Ads & Snapshot state
  const [ads, setAds] = useState<ActiveAdPerformanceItem[]>(initialActiveAds)
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>(initialSnapshots)

  // Filters
  const [reportingPeriod, setReportingPeriod] = useState<string>('This Month')
  const [dateFrom, setDateFrom] = useState<string>('2026-08-01')
  const [dateTo, setDateTo] = useState<string>('2026-08-31')
  const [filterChannel, setFilterChannel] = useState<string>('All')
  const [filterCampaign, setFilterCampaign] = useState<string>('All')
  const [filterAdSet, setFilterAdSet] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('Active')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [groupByAdSet, setGroupByAdSet] = useState<boolean>(false)

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [updatePresetItem, setUpdatePresetItem] = useState<{
    level: 'CAMPAIGN' | 'AD_SET' | 'AD'
    entityId: string
    campaignId?: string
    adSetId?: string
  } | null>(null)

  const [isMassUpdateModalOpen, setIsMassUpdateModalOpen] = useState(false)

  const [historyModalItem, setHistoryModalItem] = useState<{
    entityType: 'CAMPAIGN' | 'AD_SET' | 'AD'
    entityId: string
    title: string
    subtitle?: string
  } | null>(null)

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Refresh data handler
  const handleRefreshData = async () => {
    try {
      const res = await getActiveAdsWithPerformance()
      if (res.success) {
        setAds(res.ads)
        setSnapshots(res.snapshots)
      }
    } catch (e) {
      console.error('Failed to refresh ads data:', e)
    }
  }

  // Available Filter Options
  const channels = useMemo(() => {
    const list = new Set<string>()
    ads.forEach(a => { if (a.channel) list.add(a.channel) })
    campaigns.forEach(c => { if (c.channel?.name) list.add(c.channel.name) })
    return Array.from(list)
  }, [ads, campaigns])

  const adSets = useMemo(() => {
    const list = new Set<string>()
    ads.forEach(a => {
      if (filterCampaign === 'All' || a.campaignId === filterCampaign) {
        if (a.adSetName) list.add(a.adSetName)
      }
    })
    return Array.from(list)
  }, [ads, filterCampaign])

  // Filtered Ads
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      if (filterChannel !== 'All' && ad.channel !== filterChannel) return false
      if (filterCampaign !== 'All' && ad.campaignId !== filterCampaign) return false
      if (filterAdSet !== 'All' && ad.adSetName !== filterAdSet) return false
      if (filterStatus !== 'All' && (ad.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false

      if (reportingPeriod === 'Custom') {
        const adDate = (ad.lastUpdated || ad.latestSnapshot?.capturedAt || '').slice(0, 10)
        const pStart = ad.latestSnapshot?.periodStart || ''
        const pEnd = ad.latestSnapshot?.periodEnd || ''
        if (dateFrom && dateTo) {
          const effectiveDate = pEnd || adDate
          if (effectiveDate && (effectiveDate < dateFrom || (pStart && pStart > dateTo))) {
            return false
          }
        } else if (dateFrom) {
          const effectiveDate = pEnd || adDate
          if (effectiveDate && effectiveDate < dateFrom) return false
        } else if (dateTo) {
          const effectiveDate = pStart || adDate
          if (effectiveDate && effectiveDate > dateTo) return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = ad.adName.toLowerCase().includes(q)
        const matchId = ad.adId.toLowerCase().includes(q)
        const matchCamp = ad.campaignName.toLowerCase().includes(q)
        const matchSet = ad.adSetName.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchCamp && !matchSet) return false
      }
      return true
    })
  }, [ads, filterChannel, filterCampaign, filterAdSet, filterStatus, searchQuery, reportingPeriod, dateFrom, dateTo])

  // Check if any filter is active from default
  const isFilterActive =
    reportingPeriod !== 'This Month' ||
    filterChannel !== 'All' ||
    filterCampaign !== 'All' ||
    filterAdSet !== 'All' ||
    filterStatus.toLowerCase() !== 'active' ||
    searchQuery.trim() !== ''

  const handlePeriodChange = (val: string) => {
    setReportingPeriod(val)
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${d}`

    if (val === 'Today') {
      setDateFrom(todayStr)
      setDateTo(todayStr)
    } else if (val === 'Yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const yStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`
      setDateFrom(yStr)
      setDateTo(yStr)
    } else if (val === 'Last 7 Days') {
      const prev = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      setDateFrom(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`)
      setDateTo(todayStr)
    } else if (val === 'Last 14 Days') {
      const prev = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      setDateFrom(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`)
      setDateTo(todayStr)
    } else if (val === 'This Month') {
      setDateFrom(`${y}-${m}-01`)
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
      setDateTo(`${y}-${m}-${String(lastDay).padStart(2, '0')}`)
    } else if (val === '01-31 Aug 2026') {
      setDateFrom('2026-08-01')
      setDateTo('2026-08-31')
    } else if (val === 'All Time') {
      setDateFrom('')
      setDateTo('')
    } else if (val === 'Custom') {
      if (!dateFrom) setDateFrom('2026-08-01')
      if (!dateTo) setDateTo('2026-08-31')
    }
  }

  const handleResetFilters = () => {
    setReportingPeriod('This Month')
    setDateFrom('2026-08-01')
    setDateTo('2026-08-31')
    setFilterChannel('All')
    setFilterCampaign('All')
    setFilterAdSet('All')
    setFilterStatus('Active')
    setSearchQuery('')
  }

  // Group by Ad Set if toggled
  const groupedAds = useMemo(() => {
    if (!groupByAdSet) return { 'All Ads': filteredAds }
    const map: Record<string, ActiveAdPerformanceItem[]> = {}
    filteredAds.forEach(ad => {
      const key = `${ad.adSetName} (${ad.adSetId})`
      if (!map[key]) map[key] = []
      map[key].push(ad)
    })
    return map
  }, [filteredAds, groupByAdSet])

  // Summary Metrics
  const summary = useMemo(() => {
    let totalPlannedBudget = 0
    const processedCampaigns = new Set<string>()
    campaigns.forEach(c => {
      if (filterCampaign === 'All' || c.campaignId === filterCampaign || c.id === filterCampaign) {
        if (!processedCampaigns.has(c.id)) {
          totalPlannedBudget += Number(c.budget || 0)
          processedCampaigns.add(c.id)
        }
      }
    })
    if (totalPlannedBudget === 0) totalPlannedBudget = 110000

    let totalSpend = 0
    let totalInbox = 0
    let latestTimestamp = ''

    filteredAds.forEach(ad => {
      totalSpend += ad.spend || 0
      totalInbox += ad.messageInbox || 0
      if (ad.lastUpdated && (!latestTimestamp || new Date(ad.lastUpdated) > new Date(latestTimestamp))) {
        latestTimestamp = ad.lastUpdated
      }
    })

    const remainingBudget = Math.max(0, totalPlannedBudget - totalSpend)
    const activeAdsCount = filteredAds.filter(a => (a.status || '').toLowerCase() === 'active').length

    let dataFreshness = 'ข้อมูลล่าสุด'
    if (latestTimestamp) {
      const diffMs = Date.now() - new Date(latestTimestamp).getTime()
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHrs < 1) dataFreshness = 'วันนี้ เพิ่งอัปเดต'
      else if (diffHrs < 24) dataFreshness = `${diffHrs} ชม. ที่แล้ว`
      else dataFreshness = new Date(latestTimestamp).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    return {
      totalPlannedBudget,
      totalSpend,
      remainingBudget,
      totalInbox,
      activeAdsCount,
      dataFreshness
    }
  }, [campaigns, filteredAds, filterCampaign])



  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ชิ้นงานสื่อ (Creative File)',
      'เวอร์ชัน (Creative Version)',
      'แคมเปญ (Campaign)',
      'ชุดโฆษณา (Ad Set)',
      'ชื่อโฆษณา (Ads Name)',
      'รหัสโฆษณา (Ads ID)',
      'สถานะ (Status)',
      'ค่าใช้จ่ายสะสม (Amount Spent THB)',
      'ข้อความทักสะสม (Message Inbox)',
      'การเข้าถึงสะสม (Reach)',
      'การมองเห็นสะสม (Impressions)',
      'จำนวนคลิกสะสม (Clicks)',
      'CTR (%)',
      'CPC (THB)',
      'CPM (THB)',
      'ต้นทุนต่อผลลัพธ์ (Cost per Result THB)',
      'อัปเดตล่าสุด (Last Updated)'
    ]

    const rows = filteredAds.map(ad => [
      `"${ad.creativeFile || ''}"`,
      `"${ad.creativeVersion || ''}"`,
      `"${ad.campaignName || ''}"`,
      `"${ad.adSetName || ''}"`,
      `"${ad.adName || ''}"`,
      `"${ad.adId || ''}"`,
      `"${ad.status || ''}"`,
      ad.spend || 0,
      ad.messageInbox || 0,
      ad.reach || 0,
      ad.impressions || 0,
      ad.clicks || 0,
      ad.ctr !== null ? ad.ctr.toFixed(2) : '',
      ad.cpc !== null ? ad.cpc.toFixed(2) : '',
      ad.cpm !== null ? ad.cpm.toFixed(2) : '',
      ad.costPerResult !== null ? ad.costPerResult.toFixed(2) : '',
      `"${ad.lastUpdated || ''}"`
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ads_Performance_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format Helpers
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return `฿${val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatDecimalCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return `฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return val.toLocaleString('th-TH')
  }

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return `${val.toFixed(2)}%`
  }

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return '—'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 5) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Header & Breadcrumb (Thai Language) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">
                  ระบบการตลาด (Marketing)
                </span>
                <span className="text-xs text-slate-400">/</span>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  ระบบจัดการข้อมูลโฆษณา TERA
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    ส่วนที่ 2: ผลการโฆษณา
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบรายงานและบันทึกผลการนำส่งโฆษณาตามโครงสร้างแคมเปญ (Active Ads Performance Tracking)
              </p>
            </div>

            {/* Step Navigation Pill Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/5 p-1 rounded-xl border border-slate-200/80 shadow-xs">
              <Link
                href="/marketing/ads/campaigns"
                title="ส่วนที่ 1: ตั้งค่าแคมเปญ (Campaign Setup)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center text-[10px] font-medium">1</span>
                <span>ตั้งค่าแคมเปญ</span>
              </Link>
              <div
                title="ส่วนที่ 2: ผลการโฆษณา (Ads Performance)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-600 shadow-sm border border-slate-200/60 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px] font-bold border border-rose-100">2</span>
                <span>ผลการโฆษณา</span>
              </div>
              <Link
                href="/marketing/ads/crm"
                title="ส่วนที่ 3: ผลลัพธ์ CRM (CRM Results)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center text-[10px] font-medium">3</span>
                <span>ผลลัพธ์ CRM</span>
              </Link>
              <Link
                href="/marketing/ads/dashboard"
                title="ส่วนที่ 4: แดชบอร์ดภาพรวม (Dashboard)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center text-[10px] font-medium">4</span>
                <span>แดชบอร์ด</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ========================================================================= */}
        {/* SECTION A: ACTIVE ADS FILTERS & CONTROLS                                  */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  ตัวกรองและควบคุมโฆษณาที่ใช้งานอยู่ (Active Ads Filters &amp; Controls)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกช่วงเวลาและตัวกรองเพื่อดูรายการโฆษณาที่กำลังทำงานอยู่ (Active Ads) และอัปเดตผลสะสมล่าสุด
                </p>
              </div>
            </div>

            {/* Symmetrical Action Buttons Toolbar - Non-wrapping and evenly balanced */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* Manage Campaign Structure button */}
              <Link
                href="/marketing/ads/campaigns"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs shrink-0"
                title="ไปยังหน้าตั้งค่าแคมเปญ เพื่อเพิ่มชุดโฆษณา โฆษณา หรือชิ้นงานสื่อ"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>จัดการโครงสร้างแคมเปญ</span>
              </Link>

              {/* Single / Multi-Level Update Results button */}
              <button
                type="button"
                onClick={() => {
                  setUpdatePresetItem(null)
                  setIsUpdateModalOpen(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all shadow-sm hover:shadow-rose-500/20 active:scale-95 shrink-0"
                title="บันทึกผลสะสมล่าสุด (ระดับแคมเปญ / ชุดโฆษณา / โฆษณา)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>อัปเดตผลลัพธ์ (Update Results)</span>
              </button>

              {/* Mass Update Results button */}
              <button
                type="button"
                onClick={() => setIsMassUpdateModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs shrink-0"
                title="อัปเดตผลลัพธ์จำนวนมากด้วยไฟล์ Excel (.xlsx 4 แท็บ) หรือ CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>อัปเดตจำนวนมาก (Mass Update)</span>
              </button>

              {/* Export CSV button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all shrink-0"
                title="ส่งออกตารางข้อมูลเป็นไฟล์ CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>

          {/* Symmetrical 3x2 Grid for Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
            {/* ROW 1: แคมเปญ (Campaign) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-rose-500" />
                <span>แคมเปญ (Campaign)</span>
              </label>
              <select
                value={filterCampaign}
                onChange={e => {
                  setFilterCampaign(e.target.value)
                  setFilterAdSet('All')
                }}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer truncate"
              >
                <option value="All">ทุกแคมเปญ (All Campaigns)</option>
                {campaigns.map((c, idx) => (
                  <option key={`perf_camp_${c.id || c.campaignId}_${idx}`} value={c.campaignId || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ROW 1: ชุดโฆษณา (Ad Set) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-rose-500" />
                <span>ชุดโฆษณา (Ad Set)</span>
              </label>
              <select
                value={filterAdSet}
                onChange={e => setFilterAdSet(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer truncate"
              >
                <option value="All">ทุกชุดโฆษณา (All Ad Sets)</option>
                {adSets.map((setName, idx) => (
                  <option key={`perf_set_${setName}_${idx}`} value={setName}>
                    {setName}
                  </option>
                ))}
              </select>
            </div>

            {/* ROW 1: ช่องทาง (Channel) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-rose-500" />
                <span>ช่องทาง (Channel)</span>
              </label>
              <select
                value={filterChannel}
                onChange={e => setFilterChannel(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="All">ทุกช่องทาง (All Channels)</option>
                {channels.map((ch, idx) => (
                  <option key={`perf_ch_${ch}_${idx}`} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            {/* ROW 2: ช่วงเวลารายงาน (Period) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>ช่วงเวลารายงาน (Period)</span>
              </label>
              <select
                value={reportingPeriod}
                onChange={e => handlePeriodChange(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="This Month">เดือนนี้ (This Month)</option>
                <option value="01-31 Aug 2026">01-31 ส.ค. 2026 (01-31 Aug 2026)</option>
                <option value="Today">วันนี้ (Today)</option>
                <option value="Yesterday">เมื่อวาน (Yesterday)</option>
                <option value="Last 7 Days">7 วันล่าสุด (Last 7 Days)</option>
                <option value="Last 14 Days">14 วันล่าสุด (Last 14 Days)</option>
                <option value="All Time">ทั้งหมด (All Time)</option>
                <option value="Custom">กำหนดเอง (Custom)</option>
              </select>
            </div>

            {/* ROW 2: สถานะโฆษณา (Status) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                <span>สถานะโฆษณา (Status)</span>
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="Active">เฉพาะที่เปิดใช้งาน (Active Only)</option>
                <option value="All">ทุกสถานะ (All Statuses)</option>
                <option value="Paused">หยุดชั่วคราว (Paused)</option>
              </select>
            </div>

            {/* ROW 2: ค้นหาชื่อโฆษณา / รหัส Ads */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-rose-500" />
                  <span>ค้นหาชื่อโฆษณา / รหัส Ads</span>
                </span>
                {searchQuery && (
                  <span className="text-[10px] text-rose-600 font-medium lowercase">กด x เพื่อล้าง</span>
                )}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหา เช่น AD-SP-001 หรือชื่อโฆษณา..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-all"
                    title="ล้างข้อความค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Range Row */}
            {reportingPeriod === 'Custom' && (
              <div className="md:col-span-2 lg:col-span-4 bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>กำหนดช่วงเวลารายงานเอง (Custom Date Range):</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <label className="text-[11px] font-semibold text-slate-600">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none shadow-2xs"
                  />
                  <span className="text-slate-400 font-medium">ถึง</span>
                  <label className="text-[11px] font-semibold text-slate-600">ถึงวันที่</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none shadow-2xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Symmetrical Helper & Filter Summary Bar */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/60">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                หน้านี้จะแสดงเฉพาะโฆษณาที่สร้างจาก <strong className="text-slate-800 font-semibold">Campaign Setup</strong> โดยอัตโนมัติ ไม่จำเป็นต้องเลือกหรืออัปโหลดรูปใหม่ (ไม่ต้องอัปโหลดสื่อในหน้านี้)
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs"
                  title="รีเซ็ตตัวกรองทั้งหมดเป็นค่าเริ่มต้น"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>แสดง {filteredAds.length} จากทั้งหมด {ads.length} รายการ</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION B: PERFORMANCE OVERVIEW CARDS                                     */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Planned Budget */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">งบที่วางแผนไว้</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <Lock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 tracking-tight my-auto py-1">
              {formatCurrency(summary.totalPlannedBudget)}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-100">
              <span>จาก Campaign Setup</span>
            </div>
          </div>

          {/* Card 2: Total Spend */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">ค่าใช้จ่ายสะสม</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-black text-rose-600 tracking-tight my-auto py-1">
              {formatCurrency(summary.totalSpend)}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              ใช้ไป {summary.totalPlannedBudget > 0 ? ((summary.totalSpend / summary.totalPlannedBudget) * 100).toFixed(1) : 0}% ของงบ
            </div>
          </div>

          {/* Card 3: Remaining Budget */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">งบคงเหลือ</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-black text-emerald-700 tracking-tight my-auto py-1">
              {formatCurrency(summary.remainingBudget)}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              งบคงเหลือสำหรับรันต่อ
            </div>
          </div>

          {/* Card 4: Message Inbox */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">ข้อความทักสะสม</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <MessageSquare className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-black text-blue-600 tracking-tight my-auto py-1">
              {formatNum(summary.totalInbox)}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              ข้อความทักสะสมทั้งหมด
            </div>
          </div>

          {/* Card 5: Active Ads */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">โฆษณาที่ทำงาน</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 tracking-tight my-auto py-1">
              {summary.activeAdsCount} <span className="text-xs font-normal text-slate-500">/ {ads.length}</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1 border-t border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>กำลังนำส่งข้อมูล</span>
            </div>
          </div>

          {/* Card 6: Data Freshness */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">ความสดใหม่</span>
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Calendar className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-800 tracking-tight truncate my-auto py-1" title={summary.dataFreshness}>
              {summary.dataFreshness}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>สถานะ: ข้อมูลล่าสุด</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION C: ACTIVE ADS PERFORMANCE TABLE                                   */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Table Header Controls */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  ผลการนำส่งโฆษณาที่ใช้งานอยู่ (Active Ads Performance) ({filteredAds.length} รายการ)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิก <strong className="text-rose-600 font-semibold">&quot;อัปเดตผลลัพธ์ (Update Results)&quot;</strong> ในแต่ละรายการเพื่อบันทึกผลการนำส่งแบบ Snapshot สะสมล่าสุด
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Group by Ad Set Toggle */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs">
                <input
                  type="checkbox"
                  checked={groupByAdSet}
                  onChange={e => setGroupByAdSet(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span>จัดกลุ่มตามชุดโฆษณา (Group by Ad Set)</span>
              </label>

              {/* Quick count */}
              <span className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                {filteredAds.length} รายการที่ใช้งาน
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 min-w-[200px]">ชิ้นงานสื่อ (Creative)</th>
                  <th className="px-4 py-3.5 min-w-[180px]">แคมเปญ / ชุดโฆษณา</th>
                  <th className="px-4 py-3.5 min-w-[180px]">ชื่อโฆษณา / รหัส Ads</th>
                  <th className="px-3 py-3.5 text-center">สถานะ</th>
                  <th className="px-4 py-3.5 text-right bg-rose-50/40 text-rose-900 min-w-[120px]">
                    ค่าใช้จ่ายสะสม (Spend)
                  </th>
                  <th className="px-4 py-3.5 text-right min-w-[110px]">ข้อความ (Inbox)</th>
                  <th className="px-4 py-3.5 text-right min-w-[100px]">การเข้าถึง (Reach)</th>
                  <th className="px-4 py-3.5 text-right min-w-[110px]">การมองเห็น (Imp)</th>
                  <th className="px-4 py-3.5 text-right min-w-[90px]">คลิก (Clicks)</th>
                  <th className="px-3 py-3.5 text-right min-w-[80px]">CTR (%)</th>
                  <th className="px-3 py-3.5 text-right min-w-[80px]">CPC (฿)</th>
                  <th className="px-3 py-3.5 text-right min-w-[80px]">CPM (฿)</th>
                  <th className="px-4 py-3.5 text-right min-w-[110px]">ต้นทุน/ผลลัพธ์ (฿)</th>
                  <th className="px-4 py-3.5 text-center min-w-[120px]">อัปเดตล่าสุด</th>
                  <th className="px-4 py-3.5 text-center min-w-[130px] sticky right-0 bg-slate-50 shadow-xs">
                    การจัดการ
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAds.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                        <span className="font-medium text-sm">ไม่พบข้อมูลโฆษณาที่ตรงตามตัวกรอง</span>
                        <span className="text-xs text-slate-400">
                          ลองปรับตัวกรอง หรือคลิก &quot;จัดการโครงสร้างแคมเปญ&quot; เพื่อเพิ่มชุดโฆษณา
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedAds).map(([groupTitle, groupItems]) => (
                    <React.Fragment key={groupTitle}>
                      {groupByAdSet && (
                        <tr className="bg-slate-100/70 border-y border-slate-200">
                          <td colSpan={15} className="px-4 py-2 font-bold text-slate-700 text-xs flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-rose-600" />
                            <span>{groupTitle}</span>
                            <span className="text-slate-400 font-normal">({groupItems.length} โฆษณา)</span>
                          </td>
                        </tr>
                      )}

                      {groupItems.map((ad, idx) => {
                        const hasDeltaSpend = ad.deltaSpend !== 0 && ad.deltaSpend !== undefined
                        const hasDeltaInbox = ad.deltaInbox !== 0 && ad.deltaInbox !== undefined

                        return (
                          <React.Fragment key={`${ad.campaignId}_${ad.adSetId}_${ad.adId}_${idx}`}>
                            <tr className="hover:bg-slate-50/80 bg-white transition-colors group">
                              {/* 1. Creative Thumbnail & Version */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const isFbPreview = Boolean(ad.creativeUrl && (ad.creativeUrl.includes('fb.me') || ad.creativeUrl.includes('adspreview') || ad.creativeUrl.includes('facebook.com')))
                                    const displaySrc = (!isFbPreview && ad.creativeUrl) ? ad.creativeUrl : (ad.thumbnailUrl && !ad.thumbnailUrl.includes('fb.me') ? ad.thumbnailUrl : '/uploads/creatives/SP_WaterStrong_V1.jpg')

                                    return (
                                      <div
                                        className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 cursor-pointer group-hover:border-rose-300 transition-all flex items-center justify-center"
                                        onClick={() => {
                                          if (isFbPreview && ad.creativeUrl) {
                                            window.open(ad.creativeUrl, '_blank')
                                          } else {
                                            setPreviewImage(ad.creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')
                                          }
                                        }}
                                        title={isFbPreview ? 'คลิกเพื่อเปิด Facebook Ad Preview ในแท็บใหม่' : 'คลิกเพื่อดูรูปขนาดเต็ม'}
                                      >
                                        <img
                                          src={displaySrc}
                                          alt={ad.creativeFile || 'Creative'}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                          onError={(e: any) => {
                                            e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                                          }}
                                        />
                                        {isFbPreview && (
                                          <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-blue-600/90 text-white rounded text-[8px] font-black leading-none shadow-xs">
                                            FB
                                          </span>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <Eye className="w-3.5 h-3.5" />
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={ad.creativeFile}>
                                      {ad.creativeFile || 'Artwork'}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                        {ad.creativeVersion || 'V1'}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {ad.format === 'Video' ? 'วิดีโอ' : 'รูปภาพ'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Campaign / Ad Set */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-slate-900 truncate max-w-[150px]" title={ad.campaignName}>
                                    {ad.campaignName}
                                  </span>
                                  {ad.budgetStrategy === 'CBO' ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      CBO
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      ABO
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5 flex items-center gap-1.5" title={ad.adSetName}>
                                  <span>{ad.adSetName}</span>
                                  {ad.adSetSpendShare !== undefined && ad.adSetSpendShare !== null && (
                                    <span className="text-[10px] font-mono text-slate-400 font-semibold" title="สัดส่วนที่ Ad Set นี้ใช้จากงบแคมเปญ">
                                      ({ad.adSetSpendShare.toFixed(1)}% spend)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Ads Name / ID */}
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900 truncate max-w-[180px]" title={ad.adName}>
                                  {ad.adName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  {ad.adId}
                                </div>
                              </td>

                              {/* 4. Status */}
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  (ad.status || '').toLowerCase() === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${(ad.status || '').toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                  {(ad.status || '').toLowerCase() === 'active' ? 'เปิดใช้งาน' : ((ad.status || '').toLowerCase() === 'paused' ? 'หยุดชั่วคราว' : ad.status)}
                                </span>
                              </td>

                              {/* 5. Amount Spent */}
                              <td className="px-4 py-3 text-right bg-rose-50/20">
                                <div className="font-bold text-slate-900 font-mono text-xs">
                                  {formatCurrency(ad.spend)}
                                </div>
                                {hasDeltaSpend && (
                                  <div className="text-[10px] font-mono text-emerald-600 mt-0.5 flex items-center justify-end gap-0.5">
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    <span>+{formatCurrency(ad.deltaSpend)}</span>
                                    {ad.changePercent !== null && (
                                      <span className="text-slate-400">({ad.changePercent.toFixed(1)}%)</span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 6. Message Inbox */}
                              <td className="px-4 py-3 text-right">
                                <div className="font-bold text-blue-700 font-mono text-xs">
                                  {formatNum(ad.messageInbox)}
                                </div>
                                {hasDeltaInbox && (
                                  <div className="text-[10px] font-mono text-blue-600 mt-0.5">
                                    +{formatNum(ad.deltaInbox)}
                                  </div>
                                )}
                              </td>

                              {/* 7. Reach */}
                              <td className="px-4 py-3 text-right font-mono text-slate-700">
                                <div>{formatNum(ad.reach)}</div>
                                {ad.deltaReach > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    +{formatNum(ad.deltaReach)}
                                  </div>
                                )}
                              </td>

                              {/* 8. Impressions */}
                              <td className="px-4 py-3 text-right font-mono text-slate-700">
                                <div>{formatNum(ad.impressions)}</div>
                                {ad.deltaImpressions > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    +{formatNum(ad.deltaImpressions)}
                                  </div>
                                )}
                              </td>

                              {/* 9. Clicks */}
                              <td className="px-4 py-3 text-right font-mono text-slate-700">
                                <div>{formatNum(ad.clicks)}</div>
                                {ad.deltaClicks > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    +{formatNum(ad.deltaClicks)}
                                  </div>
                                )}
                              </td>

                              {/* 10. CTR */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatPercent(ad.ctr)}
                              </td>

                              {/* 11. CPC */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatDecimalCurrency(ad.cpc)}
                              </td>

                              {/* 12. CPM */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatDecimalCurrency(ad.cpm)}
                              </td>

                              {/* 13. Cost per Result */}
                              <td className="px-4 py-3 text-right font-mono font-semibold text-rose-700">
                                {formatDecimalCurrency(ad.costPerResult)}
                              </td>

                              {/* 14. Last Updated */}
                              <td className="px-4 py-3 text-center text-slate-500 text-[11px]">
                                <div>{formatRelativeTime(ad.lastUpdated)}</div>
                              </td>

                              {/* 15. Action Buttons */}
                              <td className="px-4 py-3 text-center sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition-colors shadow-xs">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUpdatePresetItem({
                                        level: 'AD',
                                        entityId: ad.adId,
                                        campaignId: ad.campaignId,
                                        adSetId: ad.adSetId
                                      })
                                      setIsUpdateModalOpen(true)
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-all"
                                    title="อัปเดตผลสะสมล่าสุดของโฆษณานี้"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>อัปเดต</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHistoryModalItem({
                                        entityType: 'AD',
                                        entityId: ad.adId,
                                        title: ad.adName,
                                        subtitle: `${ad.campaignName} • ${ad.adSetName}`
                                      })
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
                                    title="ดูประวัติ Snapshot ทุกเวอร์ชัน"
                                  >
                                    <History className="w-3.5 h-3.5 text-slate-500" />
                                    <span>ประวัติ</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info size={14} className="text-amber-500 shrink-0" />
              <span>โฆษณาที่หยุดนำส่งชั่วคราว (Paused Ads) สามารถดูได้โดยเปลี่ยนตัวกรอง <strong>สถานะโฆษณา (Status)</strong> ด้านบน</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">รวมค่าใช้จ่ายสะสมที่แสดง:</span>
              <span className="font-mono font-bold text-rose-600">{formatCurrency(summary.totalSpend)}</span>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODALS: 4-STEP UPDATE, MASS UPDATE, AND VERSION HISTORY                   */}
      {/* ========================================================================= */}
      {isUpdateModalOpen && (
        <UpdateResultsModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false)
            setUpdatePresetItem(null)
          }}
          campaigns={campaigns}
          initialAds={ads}
          currentUser={currentUser}
          presetItem={updatePresetItem}
          onSuccess={() => {
            handleRefreshData()
          }}
        />
      )}

      {isMassUpdateModalOpen && (
        <MassUpdateModal
          isOpen={isMassUpdateModalOpen}
          onClose={() => setIsMassUpdateModalOpen(false)}
          campaigns={campaigns}
          initialAds={ads}
          currentUser={currentUser}
          onImportSuccess={() => {
            handleRefreshData()
          }}
        />
      )}

      {historyModalItem && (
        <SnapshotHistoryModal
          isOpen={!!historyModalItem}
          onClose={() => setHistoryModalItem(null)}
          item={historyModalItem}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMAGE PREVIEW                                                      */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-black border border-white/20 shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
              referrerPolicy="no-referrer"
              onError={(e: any) => {
                e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
