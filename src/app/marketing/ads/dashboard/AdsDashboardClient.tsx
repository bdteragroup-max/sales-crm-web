'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Layers,
  Tv,
  Play,
  Eye,
  X,
  SlidersHorizontal,
  Building2,
  Package,
  History
} from 'lucide-react'
import SnapshotHistoryModal from '@/app/marketing/ads/performance/components/SnapshotHistoryModal'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import {
  TeraDashboardData,
  TeraDashboardFilters,
  DataFreshnessLevel
} from './types'
import { getTeraAdsDashboardData } from '@/app/actions/ads-dashboard'

interface AdsDashboardClientProps {
  campaigns: Array<{
    id: string
    campaignId: string
    name: string
    channelId: string
    budget: number
    status: string
    productCategory: string | null
  }>
  channels: Array<{
    id: string
    name: string
  }>
  initialData: TeraDashboardData | null
  currentUser?: {
    id: string
    fullName: string
    email?: string | null
    role?: string | null
  } | null
}

export default function AdsDashboardClient({
  campaigns,
  channels,
  initialData,
  currentUser
}: AdsDashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read searchParams from URL if provided
  const queryFrom = searchParams?.get('from') || ''
  const queryTo = searchParams?.get('to') || ''
  const queryChannel = searchParams?.get('channel') || ''
  const queryCampaign = searchParams?.get('campaign') || ''
  const queryStatus = searchParams?.get('status') || ''
  const queryCompareWith = searchParams?.get('compareWith') || ''
  const queryCompareFrom = searchParams?.get('compareFrom') || ''
  const queryCompareTo = searchParams?.get('compareTo') || ''
  const queryRollup = searchParams?.get('rollupSource') as any || ''

  const isQuerySeptember = queryFrom.includes('2026-09') || queryTo.includes('2026-09')

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<TeraDashboardData | null>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters State
  const [filters, setFilters] = useState<TeraDashboardFilters>(
    initialData?.filters || {
      reportingPeriod: isQuerySeptember ? '01-30 Sep 2026' : '01-31 Aug 2026',
      dateFrom: queryFrom || (isQuerySeptember ? '2026-09-01' : '2026-08-01'),
      dateTo: queryTo || (isQuerySeptember ? '2026-09-30' : '2026-08-31'),
      compareWith: queryCompareWith || 'Previous Period',
      compareDateFrom: queryCompareFrom || '2026-07-01',
      compareDateTo: queryCompareTo || '2026-07-31',
      channel: queryChannel || 'Facebook',
      productCategory: 'All',
      campaignId: queryCampaign || 'All',
      adSetId: 'All',
      adId: 'All',
      creative: 'All',
      status: queryStatus || 'Active',
      search: '',
      rollupSource: queryRollup || 'Auto'
    }
  )

  // Custom date range visibility
  const [showCustomDate, setShowCustomDate] = useState(
    Boolean((queryFrom && queryTo) && (queryFrom !== '2026-08-01' || queryTo !== '2026-08-31') && (queryFrom !== '2026-09-01' || queryTo !== '2026-09-30')) || (initialData?.filters?.reportingPeriod === 'Custom')
  )
  const [showCustomCompareDate, setShowCustomCompareDate] = useState(
    Boolean(queryCompareWith === 'Custom' || queryCompareFrom || queryCompareTo || initialData?.filters?.compareWith === 'Custom')
  )

  // Active Tab for Deep-Dive Section E
  const [activeTab, setActiveTab] = useState<'ads' | 'campaigns' | 'adsets' | 'branches' | 'productGroups' | 'channels' | 'creatives'>('ads')

  // Drilldown expanded row states for Branches & Product Groups
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [expandedProductGroups, setExpandedProductGroups] = useState<Set<string>>(new Set())
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set())

  // History modal state
  const [historyModalItem, setHistoryModalItem] = useState<{
    entityType: 'CAMPAIGN' | 'AD_SET' | 'AD'
    entityId: string
    title: string
    subtitle?: string
  } | null>(null)

  const toggleBranch = (id: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleProductGroup = (id: string) => {
    setExpandedProductGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAdSet = (id: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Show detailed Delivery/Traffic KPIs toggle
  const [showDeliveryKpis, setShowDeliveryKpis] = useState(false)

  // Lightbox Media Preview
  const [previewMedia, setPreviewMedia] = useState<string | null>(null)

  // Sync state if initialData changes from SSR without cascading renders
  const [prevInitialData, setPrevInitialData] = useState(initialData)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData)
    setDashboardData(initialData)
    if (initialData?.filters) {
      setFilters(prev => ({ ...prev, ...initialData.filters }))
    }
  }

  // Quick refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const updated = await getTeraAdsDashboardData(filters)
      setDashboardData(updated)
    } catch (err) {
      console.error('Failed to refresh dashboard data:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter change handler
  const handleFilterChange = async (key: keyof TeraDashboardFilters, value: string) => {
    const next = { ...filters, [key]: value }

    // Handle Period selection presets
    if (key === 'reportingPeriod') {
      if (value === '01-30 Sep 2026') {
        next.dateFrom = '2026-09-01'
        next.dateTo = '2026-09-30'
        setShowCustomDate(false)
      } else if (value === '01-31 Aug 2026') {
        next.dateFrom = '2026-08-01'
        next.dateTo = '2026-08-31'
        setShowCustomDate(false)
      } else if (value === 'This Month') {
        next.dateFrom = '2026-09-01'
        next.dateTo = '2026-09-30'
        setShowCustomDate(false)
      } else if (value === 'Last 30 Days') {
        next.dateFrom = '2026-08-01'
        next.dateTo = '2026-08-31'
        setShowCustomDate(false)
      } else if (value === 'Last 7 Days') {
        next.dateFrom = '2026-08-25'
        next.dateTo = '2026-08-31'
        setShowCustomDate(false)
      } else if (value === 'Custom') {
        setShowCustomDate(true)
      }
    }

    // Handle Comparison selection presets
    if (key === 'compareWith') {
      if (value === 'Custom') {
        setShowCustomCompareDate(true)
        if (!next.compareDateFrom || !next.compareDateTo) {
          next.compareDateFrom = '2026-07-01'
          next.compareDateTo = '2026-07-31'
        }
      } else {
        setShowCustomCompareDate(false)
      }
    }

    setFilters(next)
    setIsRefreshing(true)
    try {
      const updated = await getTeraAdsDashboardData(next)
      setDashboardData(updated)

      // Sync URL query params without full page reload
      const params = new URLSearchParams()
      if (next.dateFrom) params.set('from', next.dateFrom)
      if (next.dateTo) params.set('to', next.dateTo)
      if (next.channel !== 'All') params.set('channel', next.channel)
      if (next.campaignId !== 'All') params.set('campaign', next.campaignId)
      if (next.status !== 'All') params.set('status', next.status)
      if (next.compareWith !== 'Previous Period') params.set('compareWith', next.compareWith)
      if (next.compareWith === 'Custom') {
        if (next.compareDateFrom) params.set('compareFrom', next.compareDateFrom)
        if (next.compareDateTo) params.set('compareTo', next.compareDateTo)
      }
      router.replace(`/marketing/ads/dashboard?${params.toString()}`, { scroll: false })
    } catch (err) {
      console.error('Failed to apply filters:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Reset Filters handler
  const handleResetFilters = async () => {
    const isSep = queryFrom.includes('2026-09')
    const reset: TeraDashboardFilters = {
      reportingPeriod: isSep ? '01-30 Sep 2026' : '01-31 Aug 2026',
      dateFrom: isSep ? '2026-09-01' : '2026-08-01',
      dateTo: isSep ? '2026-09-30' : '2026-08-31',
      compareWith: 'Previous Period',
      compareDateFrom: '2026-07-01',
      compareDateTo: '2026-07-31',
      channel: 'Facebook',
      productCategory: 'All',
      campaignId: 'All',
      adSetId: 'All',
      adId: 'All',
      creative: 'All',
      status: 'Active',
      search: ''
    }
    setShowCustomDate(false)
    setShowCustomCompareDate(false)
    setFilters(reset)
    setIsRefreshing(true)
    try {
      const updated = await getTeraAdsDashboardData(reset)
      setDashboardData(updated)
      router.replace(isSep ? '/marketing/ads/dashboard?from=2026-09-01&to=2026-09-30' : '/marketing/ads/dashboard', { scroll: false })
    } catch (err) {
      console.error('Failed to reset filters:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Dynamic list of campaigns from props and dashboard data
  const availableCampaigns = useMemo(() => {
    const map = new Map<string, { id: string; campaignId: string; name: string }>()
    campaigns?.forEach(c => {
      const cid = c.campaignId || c.id
      map.set(cid, { id: c.id, campaignId: cid, name: c.name })
    })
    dashboardData?.campaignBreakdown?.forEach(c => {
      if (c.campaignId && !map.has(c.campaignId)) {
        map.set(c.campaignId, { id: c.campaignId, campaignId: c.campaignId, name: c.campaignName || c.campaignId })
      }
    })
    return Array.from(map.values())
  }, [campaigns, dashboardData?.campaignBreakdown])

  // Dynamic list of ad sets from dashboard data and ads breakdown
  const availableAdSets = useMemo(() => {
    const map = new Map<string, { id: string; name: string; campaignId?: string }>()
    dashboardData?.adSetBreakdown?.forEach(s => {
      if (s.adSetId && s.adSetId !== 'All') {
        map.set(s.adSetId, { id: s.adSetId, name: s.adSetName || s.adSetId, campaignId: s.campaignId })
      }
    })
    dashboardData?.adsBreakdown?.forEach(a => {
      if (a.adSetId && a.adSetId !== 'All' && !map.has(a.adSetId)) {
        map.set(a.adSetId, { id: a.adSetId, name: a.adSetName || a.adSetId, campaignId: a.campaignId })
      }
    })
    const list = Array.from(map.values())
    if (filters.campaignId && filters.campaignId !== 'All') {
      const filtered = list.filter(s => !s.campaignId || s.campaignId === filters.campaignId)
      return filtered.length > 0 ? filtered : list
    }
    return list
  }, [dashboardData?.adSetBreakdown, dashboardData?.adsBreakdown, filters.campaignId])

  // Export Dashboard as CSV
  const handleExportDashboard = () => {
    if (!dashboardData) return
    const rows: string[] = []
    rows.push('TERA ADS & CRM DASHBOARD REPORT (รายงานภาพรวมโฆษณาและ CRM)')
    rows.push(`ช่วงเวลารายงาน: ${filters.reportingPeriod} (${filters.dateFrom} ถึง ${filters.dateTo})`)
    rows.push(`ส่งออกข้อมูลเมื่อ: ${new Date().toLocaleString('th-TH')}`)
    rows.push('')

    rows.push('--- ตัวชี้วัดหลักทางธุรกิจ (PRIMARY BUSINESS KPIS) ---')
    const k = dashboardData.businessKpis
    rows.push(`งบประมาณตามแผน (Planned Budget),${k.plannedBudget.value}`)
    rows.push(`ค่าใช้จ่ายจริง (Total Spend),${k.totalSpend.value}`)
    rows.push(`งบประมาณคงเหลือ (Remaining Budget),${k.remainingBudget.value}`)
    rows.push(`ข้อความทัก (Message Inbox),${k.messageInbox.value}`)
    rows.push(`ลีดผู้สนใจ (Leads),${k.leads.value}`)
    rows.push(`ปิดการขายสำเร็จ (Closed Sales),${k.closedSales.value}`)
    rows.push(`ยอดขายรวม (Sale),${k.sale.value}`)
    rows.push(`ผลตอบแทน (ROI),${k.roi.value}%`)
    rows.push('')

    rows.push('--- ประสิทธิภาพรายแคมเปญ (CAMPAIGN BREAKDOWN) ---')
    rows.push('แคมเปญ (Campaign),ค่าใช้จ่าย (Spend),ข้อความทัก (Inbox),ลีด (Leads),ปิดการขาย (Closed),ยอดขาย (Sale),ต้นทุนต่อลีด (Cost/Lead),ROI %')
    dashboardData.campaignBreakdown.forEach(c => {
      rows.push(`"${c.campaignName}",${c.spend},${c.messageInbox},${c.leads},${c.closedSales},${c.sale},${c.costPerLead || ''},${c.roi || ''}%`)
    })
    rows.push('')

    rows.push('--- รายละเอียดโฆษณาและความสดใหม่ (ADS BREAKDOWN & DATA FRESHNESS) ---')
    rows.push('รหัสโฆษณา (Ad ID),ชื่อโฆษณา (Ad Name),แคมเปญ (Campaign),ชุดโฆษณา (Ad Set),ค่าใช้จ่าย (Spend),ข้อความทัก (Inbox),ลีด (Leads),ผ่านเกณฑ์ (Qualified),ปิดการขาย (Closed),ยอดขาย (Sale),ROI %,อัปเดตล่าสุด (Last Updated),ระดับความสดใหม่ (Freshness)')
    dashboardData.adsBreakdown.forEach(a => {
      rows.push(`"${a.adId}","${a.adName}","${a.campaignName}","${a.adSetName}",${a.spend},${a.messageInbox},${a.leads},${a.qualifiedLeads},${a.closedSales},${a.sale},${a.roi || ''}%,"${a.lastUpdated}","${a.freshness}"`)
    })

    const csvContent = '\uFEFF' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `TeraAds_Dashboard_${filters.reportingPeriod.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Format Helpers
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return `฿${Math.round(val).toLocaleString('en-US')}`
  }

  const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return Math.round(val).toLocaleString('en-US')
  }

  // Creative Thumbnail Renderer
  const renderCreativeThumbnail = (
    creativeUrl?: string,
    creativeFile?: string,
    format?: string,
    size: 'sm' | 'md' = 'sm'
  ) => {
    const isVideo = format === 'Video' || creativeFile?.toLowerCase().endsWith('.mp4')
    const dimClass = size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-14 h-14 rounded-xl'

    if (isVideo) {
      return (
        <div
          className={`${dimClass} bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 border border-slate-700/80 overflow-hidden relative shrink-0 cursor-pointer hover:border-rose-400 transition-all flex flex-col items-center justify-center shadow-xs text-white select-none group`}
          onClick={() => setPreviewMedia(creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')}
          title="คลิกเพื่อดูวิดีโอตัวอย่าง"
        >
          <div className="w-4.5 h-4.5 rounded-full bg-rose-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Play className="w-2.5 h-2.5 fill-white text-white translate-x-0.5" />
          </div>
          <span className="text-[7.5px] font-black uppercase tracking-wider text-rose-300 mt-0.5">
            VIDEO
          </span>
        </div>
      )
    }

    const isFbPreview = Boolean(creativeUrl && (creativeUrl.includes('fb.me') || creativeUrl.includes('adspreview') || creativeUrl.includes('facebook.com')))

    return (
      <div
        className={`${dimClass} bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 cursor-pointer hover:border-rose-300 transition-all flex items-center justify-center shadow-2xs group`}
        onClick={() => {
          if (isFbPreview && creativeUrl) {
            window.open(creativeUrl, '_blank')
          } else {
            setPreviewMedia(creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')
          }
        }}
        title={isFbPreview ? 'คลิกเพื่อเปิด Facebook Ad Preview ในแท็บใหม่' : 'คลิกเพื่อดูรูปขนาดเต็ม'}
      >
        <img
          src={
            creativeUrl && !isFbPreview
              ? creativeUrl
              : '/uploads/creatives/SP_WaterStrong_V1.jpg'
          }
          alt={creativeFile || 'Creative'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
          }}
        />
        {isFbPreview && (
          <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-blue-600/90 text-white rounded text-[7.5px] font-black leading-none shadow-2xs">
            FB
          </span>
        )}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Eye className="w-3.5 h-3.5" />
        </div>
      </div>
    )
  }

  // Data Freshness Badge Renderer
  const renderFreshnessBadge = (freshness: DataFreshnessLevel, hours: number) => {
    if (freshness === 'GREEN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{hours <= 1 ? 'สดใหม่ล่าสุด' : `${hours} ชม. ที่แล้ว`}</span>
        </span>
      )
    }
    if (freshness === 'YELLOW') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>{`${hours} ชม. ที่แล้ว`}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        <span>{hours >= 72 ? `${Math.round(hours / 24)} วันที่แล้ว` : `${hours} ชม.`}</span>
      </span>
    )
  }

  const kpis = dashboardData?.businessKpis
  const delivery = dashboardData?.deliveryKpis

  // Check if any filter is active
  const isFilterActive =
    filters.channel !== 'All' ||
    filters.campaignId !== 'All' ||
    filters.adSetId !== 'All' ||
    filters.status !== 'Active' ||
    filters.reportingPeriod !== '01-31 Aug 2026' ||
    Boolean(filters.search?.trim())

  const refreshedAtText = dashboardData?.lastRefreshedAt || (isQuerySeptember ? '30 ก.ย. 2026, 17:00 น.' : '31 ส.ค. 2026, 17:00 น.')

  // The 8 Primary KPI Cards arranged into Symmetrical 4x2 Layout (Financial row + Conversion row)
  const primaryKpiCards = [
    {
      id: 'plannedBudget',
      label: 'งบตามแผน (Planned)',
      value: kpis?.plannedBudget.displayValue || '฿150,000',
      subtitle: 'งบประมาณรายเดือน',
      valueColor: 'text-slate-900',
      tag: 'งบประมาณ',
      delta: kpis?.plannedBudget.delta
    },
    {
      id: 'totalSpend',
      label: 'ค่าใช้จ่ายจริง (Spend)',
      value: kpis?.totalSpend.displayValue || '฿116,730',
      subtitle: kpis?.totalSpend.subtitle || '77.8% ของงบประมาณ',
      valueColor: 'text-slate-900',
      tag: 'ใช้จ่ายจริง',
      progress: 77.8,
      delta: kpis?.totalSpend.delta
    },
    {
      id: 'remainingBudget',
      label: 'งบคงเหลือ (Remaining)',
      value: kpis?.remainingBudget.displayValue || '฿33,270',
      subtitle: kpis?.remainingBudget.subtitle || '22.2% คงเหลือ',
      valueColor: 'text-slate-900',
      tag: 'คงเหลือ',
      delta: kpis?.remainingBudget.delta
    },
    {
      id: 'sale',
      label: 'ยอดขายรวม (Sale)',
      value: kpis?.sale.displayValue || '฿1,120,000',
      subtitle: 'ยอดขายจากแคมเปญ',
      valueColor: 'text-emerald-700',
      tag: 'ยอดขาย',
      delta: kpis?.sale.delta
    },
    {
      id: 'messageInbox',
      label: 'ข้อความทัก (Inbox)',
      value: kpis?.messageInbox.displayValue || '2,387',
      subtitle: kpis?.messageInbox.subtitle || 'เฉลี่ย ฿48.90 / ข้อความ',
      valueColor: 'text-slate-900',
      tag: 'การทักแชท',
      delta: kpis?.messageInbox.delta
    },
    {
      id: 'leads',
      label: 'ลีดผู้สนใจ (Leads)',
      value: kpis?.leads.displayValue || '620',
      subtitle: kpis?.leads.subtitle || 'อัตราลีด 25.97%',
      valueColor: 'text-slate-900',
      tag: 'ผู้สนใจ',
      delta: kpis?.leads.delta
    },
    {
      id: 'closedSales',
      label: 'ปิดการขาย (Closed)',
      value: kpis?.closedSales.displayValue || '24',
      subtitle: kpis?.closedSales.subtitle || 'อัตราปิดการขาย 3.87%',
      valueColor: 'text-slate-900',
      tag: 'ชนะดีล',
      delta: kpis?.closedSales.delta
    },
    {
      id: 'roi',
      label: 'ผลตอบแทน (ROI)',
      value: kpis?.roi.displayValue || '859.4%',
      subtitle: kpis?.roi.subtitle || 'ต้นทุน/การปิด ฿4,863.75',
      valueColor: 'text-emerald-600',
      tag: 'กำไร/ROI',
      delta: kpis?.roi.delta
    }
  ]

  // Trend series last point for chart callout annotation
  const trendPoints = dashboardData?.trendSeries || []
  const lastTrendPoint = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : null

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* TOP HEADER & SYSTEM NAVIGATION BAR                                        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
            {/* Title & Subtitle */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>แดชบอร์ดภาพรวมโฆษณาและ CRM</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ประสิทธิภาพแคมเปญโฆษณาและการเชื่อมโยงยอดขาย CRM (TERA Ads &amp; CRM Dashboard)
              </p>
            </div>

            {/* Top Right Action Controls - Strictly Single Line & Symmetrically Aligned */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap">
              {/* Data Freshness Status Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs select-none whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-[11.5px]">อัปเดต: {refreshedAtText}</span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-800 cursor-pointer disabled:opacity-50 ml-0.5"
                  title="รีเฟรชข้อมูล (Sync Latest Snapshots)"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
                </button>
              </div>

              {/* Export Dashboard Button */}
              <button
                type="button"
                onClick={handleExportDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all hover:border-slate-300 active:scale-98 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>ส่งออกแดชบอร์ด</span>
              </button>

              {/* Red CTA Button to View Ads Performance */}
              <Link
                href="/marketing/ads/performance"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-xs transition-all active:scale-98 whitespace-nowrap"
              >
                <span>ดูผลการนำส่งโฆษณา</span>
              </Link>
            </div>
          </div>

          {/* Symmetrical Step Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 text-xs select-none">
            <Link
              href="/marketing/ads/campaigns"
              className="px-3 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0 flex items-center gap-1.5"
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">1</span>
              <span>ตั้งค่าแคมเปญ</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <Link
              href="/marketing/ads/performance"
              className="px-3 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0 flex items-center gap-1.5"
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">2</span>
              <span>ผลการโฆษณา</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <Link
              href="/marketing/ads/crm"
              className="px-3 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0 flex items-center gap-1.5"
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">3</span>
              <span>ผลลัพธ์ CRM</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <Link
              href="/marketing/ads/dashboard"
              className="px-3 py-1 rounded-md font-bold text-white bg-rose-600 shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <span className="w-4 h-4 rounded-full bg-white text-rose-700 text-[10px] font-bold flex items-center justify-center">4</span>
              <span>แดชบอร์ด</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* ========================================================================= */}
        {/* SECTION A: DASHBOARD FILTERS (SYMMETRICAL 6-COLUMN LAYOUT)                 */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-xl p-4.5 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  ตัวกรองข้อมูลแดชบอร์ด (Dashboard Filters)
                </h2>
                {isFilterActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    กำลังกรอง
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>ประมวลผลจากข้อมูล Snapshot ผลการโฆษณาและ CRM ล่าสุด</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>ล้างตัวกรอง</span>
              </button>
            </div>
          </div>

          {/* Symmetrical 7-Column Controls Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5 items-end">
            {/* 1. Reporting Period */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                ช่วงเวลารายงาน
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={filters.reportingPeriod}
                  onChange={e => handleFilterChange('reportingPeriod', e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
                >
                  <option value="01-30 Sep 2026">01–30 ก.ย. 2026</option>
                  <option value="01-31 Aug 2026">01–31 ส.ค. 2026</option>
                  <option value="This Month">เดือนปัจจุบัน</option>
                  <option value="Last 30 Days">30 วันล่าสุด</option>
                  <option value="Last 7 Days">7 วันล่าสุด</option>
                  <option value="Custom">กำหนดเอง</option>
                </select>
              </div>
            </div>

            {/* 2. Compare with */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                เปรียบเทียบกับ
              </label>
              <select
                value={filters.compareWith}
                onChange={e => handleFilterChange('compareWith', e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
              >
                <option value="Previous Period">ช่วงเวลาก่อนหน้า</option>
                <option value="Custom">กำหนดเอง</option>
                <option value="None">ไม่เปรียบเทียบ</option>
              </select>
            </div>

            {/* 3. Channel */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                ช่องทาง
              </label>
              <select
                value={filters.channel}
                onChange={e => handleFilterChange('channel', e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
              >
                <option value="All">ทุกช่องทาง</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="Google">Google</option>
                <option value="LINE">LINE</option>
                {channels?.filter(ch => !['Facebook', 'TikTok', 'Google', 'LINE'].includes(ch.name)).map((ch, idx) => (
                  <option key={`ch_${ch.id}_${idx}`} value={ch.name}>{ch.name}</option>
                ))}
              </select>
            </div>

            {/* 4. Campaign */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                แคมเปญ
              </label>
              <select
                value={filters.campaignId}
                onChange={e => {
                  handleFilterChange('campaignId', e.target.value)
                  handleFilterChange('adSetId', 'All')
                }}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
              >
                <option value="All">ทุกแคมเปญ</option>
                {availableCampaigns.map((c: { id: string; campaignId: string; name: string }, idx: number) => (
                  <option key={`camp_${c.id || c.campaignId}_${idx}`} value={c.campaignId}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 5. Ad Set */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                ชุดโฆษณา
              </label>
              <select
                value={filters.adSetId}
                onChange={e => handleFilterChange('adSetId', e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
              >
                <option value="All">ทุกชุดโฆษณา</option>
                {availableAdSets.map((s: { id: string; name: string }, idx: number) => (
                  <option key={`set_${s.id}_${idx}`} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 6. Ads Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                สถานะโฆษณา
              </label>
              <select
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
              >
                <option value="Active">เปิดใช้งาน</option>
                <option value="All">ทุกสถานะ</option>
                <option value="Paused">ปิดชั่วคราว</option>
              </select>
            </div>

            {/* 7. Roll-up Source */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
                แหล่งคำนวณ Roll-up
              </label>
              <select
                value={filters.rollupSource || 'Auto'}
                onChange={e => handleFilterChange('rollupSource', e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none cursor-pointer h-9 shadow-2xs truncate"
                title="เลือกแหล่งข้อมูลสำหรับการสรุปยอด Dashboard"
              >
                <option value="Auto">Auto (ตามระดับ)</option>
                <option value="Campaign">Campaign Level</option>
                <option value="AdSet">Ad Set Level</option>
                <option value="Ads">Ads Level</option>
              </select>
            </div>
          </div>

          {/* Optional Custom Date Range Row */}
          {(showCustomDate || showCustomCompareDate) && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs animate-in fade-in duration-200">
              {showCustomDate && (
                <div className="flex flex-wrap items-center gap-2 bg-rose-50/60 border border-rose-100 px-3 py-1.5 rounded-xl shadow-2xs">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    <span>ช่วงเวลารายงาน:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={e => handleFilterChange('dateFrom', e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-500 font-medium"
                    />
                    <span className="text-slate-400 font-medium">ถึง</span>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={e => handleFilterChange('dateTo', e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-500 font-medium"
                    />
                  </div>
                </div>
              )}
              {showCustomCompareDate && (
                <div className="flex flex-wrap items-center gap-2 bg-blue-50/60 border border-blue-100 px-3 py-1.5 rounded-xl shadow-2xs">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>ช่วงเวลาเปรียบเทียบ:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filters.compareDateFrom || '2026-07-01'}
                      onChange={e => handleFilterChange('compareDateFrom', e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 font-medium"
                    />
                    <span className="text-slate-400 font-medium">ถึง</span>
                    <input
                      type="date"
                      value={filters.compareDateTo || '2026-07-31'}
                      onChange={e => handleFilterChange('compareDateTo', e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION B: PERFORMANCE OVERVIEW (SYMMETRICAL 4x2 GRID)                     */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                ภาพรวมตัวชี้วัดหลัก (Performance Overview)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowDeliveryKpis(!showDeliveryKpis)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <span>{showDeliveryKpis ? 'ซ่อนตัวชี้วัดการนำส่งและทราฟฟิก' : '+ ดูตัวชี้วัดการนำส่งและทราฟฟิก (Reach, Impressions, CTR, CPC, CPM)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDeliveryKpis ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Symmetrical 4-Column x 2-Row Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
            {primaryKpiCards.map(card => (
              <div
                key={card.id}
                className={`bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[105px] hover:border-slate-300 hover:shadow-xs transition-all ${
                  card.id === 'sale' ? 'bg-gradient-to-br from-white via-white to-emerald-50/25' : ''
                } ${
                  card.id === 'roi' ? 'bg-gradient-to-br from-white via-white to-emerald-50/20' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight truncate">
                    {card.label}
                  </span>
                  {card.tag && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      card.id === 'sale'
                        ? 'bg-emerald-100 text-emerald-800'
                        : card.id === 'roi'
                        ? 'bg-emerald-100 text-emerald-800'
                        : card.id === 'totalSpend'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {card.tag}
                    </span>
                  )}
                </div>

                <div className="my-1.5 flex items-baseline justify-between gap-2">
                  <div className={`text-2xl font-black font-mono tracking-tight ${card.valueColor}`}>
                    {card.value}
                  </div>
                  {card.delta && card.delta.percent != null && filters.compareWith !== 'None' && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      card.delta.direction === 'up'
                        ? (card.delta.isPositiveGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60')
                        : card.delta.direction === 'down'
                        ? (card.delta.isPositiveGood ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60')
                        : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                    }`}>
                      <span>{card.delta.direction === 'up' ? '▲' : card.delta.direction === 'down' ? '▼' : '•'}</span>
                      <span>{Math.abs(card.delta.percent).toFixed(1)}%</span>
                    </span>
                  )}
                </div>

                <div>
                  {card.progress !== undefined ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{card.subtitle}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, card.progress)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400">
                      {card.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery & Traffic Drawer */}
          {showDeliveryKpis && (
            <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200/80 space-y-2 mt-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                ตัวชี้วัดการนำส่งและทราฟฟิกโฆษณา (Delivery &amp; Traffic Metrics)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Reach</span>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">{delivery?.reach.displayValue}</div>
                  <span className="text-[10px] text-slate-400">การเข้าถึง</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Impressions</span>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">{delivery?.impressions.displayValue}</div>
                  <span className="text-[10px] text-slate-400">จำนวนครั้งแสดง</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Clicks</span>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">{delivery?.clicks.displayValue}</div>
                  <span className="text-[10px] text-slate-400">การคลิกลิงก์</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">CTR</span>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">{delivery?.ctr.displayValue}</div>
                  <span className="text-[10px] text-slate-400">อัตราคลิก</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">CPC</span>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">{delivery?.cpc.displayValue}</div>
                  <span className="text-[10px] text-slate-400">ต้นทุนต่อคลิก</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">CPM</span>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">{delivery?.cpm.displayValue}</div>
                  <span className="text-[10px] text-slate-400">ต้นทุนต่อพันครั้ง</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* SECTION C: TRENDS & FUNNEL (SYMMETRICAL 50% : 50% SPLIT)                   */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              แนวโน้มและกรวยการขาย (Trends &amp; Conversion Funnel)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Card (6 Cols = 50%): Spend & Leads Trend */}
            <div className="lg:col-span-6 bg-white rounded-xl p-5 shadow-2xs border border-slate-200 flex flex-col justify-between min-h-[410px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      แนวโน้มค่าใช้จ่ายและจำนวนลีด (Spend &amp; Leads Trend)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ผลลัพธ์รายวัน • {filters.reportingPeriod}
                    </p>
                  </div>

                  {/* Legend & Summary Callout */}
                  <div className="flex items-center gap-3 text-xs select-none shrink-0">
                    {lastTrendPoint && (
                      <div className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono shadow-2xs">
                        <span className="font-semibold text-slate-700">{lastTrendPoint.formattedDate}:</span>
                        <span className="text-rose-600 font-bold">฿{lastTrendPoint.spend.toLocaleString()}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-900 font-bold">{lastTrendPoint.leads} ลีด</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-2xs bg-rose-600 inline-block"></span>
                      <span className="hidden sm:inline">ค่าใช้จ่าย (฿)</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                      <span className="hidden sm:inline">ลีด (Leads)</span>
                    </div>
                  </div>
                </div>

                {/* Dual-Axis Composed Chart */}
                <div className="h-[270px] w-full pt-3 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="formattedDate"
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        interval={2}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                        domain={[0, 10000]}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        domain={[0, 75]}
                        interval="preserveStartEnd"
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const spendVal = payload.find(p => p.dataKey === 'spend')?.value
                            const leadsVal = payload.find(p => p.dataKey === 'leads')?.value
                            return (
                              <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-slate-800">
                                <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                                  {label}
                                </div>
                                <div className="text-rose-400 font-mono font-semibold">
                                  ค่าใช้จ่าย: {formatCurrency(Number(spendVal))}
                                </div>
                                <div className="text-sky-300 font-mono font-semibold">
                                  ลีดผู้สนใจ: {formatNum(Number(leadsVal))}
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="spend"
                        fill="#e11d48"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={14}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="leads"
                        stroke="#0f172a"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#0f172a', strokeWidth: 1 }}
                        activeDot={{ r: 4.5, fill: '#0f172a' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                <span>แกนซ้าย: ค่าใช้จ่ายรายวัน (฿)</span>
                <span>แกนขวา: จำนวนลีดที่ได้รับ (Leads)</span>
              </div>
            </div>

            {/* Right Card (6 Cols = 50%): CRM Conversion Funnel */}
            <div className="lg:col-span-6 bg-white rounded-xl p-5 shadow-2xs border border-slate-200 flex flex-col justify-between min-h-[410px]">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    กรวยการแปลงผล CRM (CRM Conversion Funnel)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ยอดสะสมตามขั้นตอนการขายและอัตราการส่งต่อ
                  </p>
                </div>

                {/* 6 Funnel Stages */}
                <div className="space-y-3 pt-3 my-auto">
                  {dashboardData?.funnelStages.map((stage, idx) => {
                    const isInitial = idx === 0
                    const barBg = idx === 0 ? 'bg-rose-600' : idx === 1 ? 'bg-slate-900' : idx === 2 ? 'bg-slate-700' : idx === 3 ? 'bg-slate-600' : idx === 4 ? 'bg-slate-500' : 'bg-slate-500'
                    const barWidth = (stage as { visualWidth?: number }).visualWidth || Math.max(20, Math.min(100, stage.percentageFromInitial))

                    return (
                      <div key={stage.stageKey} className="flex items-center text-xs gap-3">
                        {/* Label - Plenty of width in 6 cols so no truncation */}
                        <div className="w-[180px] shrink-0 font-medium text-slate-700 text-xs truncate" title={stage.stageName}>
                          {stage.stageName}
                        </div>

                        {/* Bar */}
                        <div className="flex-1 bg-slate-100 rounded-sm h-6 overflow-hidden relative flex items-center shadow-2xs">
                          <div
                            className={`h-full ${barBg} rounded-sm flex items-center px-2.5 font-mono font-bold text-[11px] text-white transition-all duration-500 shadow-2xs`}
                            style={{ width: `${barWidth}%` }}
                          >
                            <span>{stage.count.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Percentage */}
                        <div className="w-[110px] text-right font-mono text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                          {isInitial
                            ? '100%'
                            : idx === 1
                            ? `${stage.percentageFromInitial.toFixed(2)}%`
                            : `${stage.percentageFromPrevious?.toFixed(2)}% ของก่อนหน้า`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                อัตราการส่งต่อจากข้อความทักเริ่มต้นจนถึงปิดการขายสำเร็จ
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION D: CAMPAIGN & ADS INSIGHTS (50% : 25% : 25% BALANCED SPLIT)        */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              ข้อมูลเชิงลึกและการตัดสินใจ (Campaign &amp; Ads Insights)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Col 1 (6 Cols = 50%): Campaign Performance Table - Aligned with Section C center line! */}
            <div className="lg:col-span-6 bg-white rounded-xl p-5 shadow-2xs border border-slate-200 flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    ประสิทธิภาพรายแคมเปญ (Campaign Performance)
                  </h3>
                  <span className="text-xs text-slate-400">
                    {dashboardData?.campaignBreakdown.length || 0} แคมเปญ
                  </span>
                </div>

                <div className="mt-2.5 overflow-hidden">
                  <table className="w-full text-left table-fixed">
                    <thead>
                      <tr className="text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
                        <th className="py-2 pr-1 w-[26%]">แคมเปญ</th>
                        <th className="py-2 px-1 text-right w-[14%]">ค่าใช้จ่าย</th>
                        <th className="py-2 px-1 text-right w-[10%]">ข้อความ</th>
                        <th className="py-2 px-1 text-right w-[8%]">ลีด</th>
                        <th className="py-2 px-1 text-right w-[8%]">ปิดขาย</th>
                        <th className="py-2 px-1 text-right w-[14%]">ยอดขาย</th>
                        <th className="py-2 px-1 text-right w-[10%]">ทุน/ลีด</th>
                        <th className="py-2 pl-1 text-right w-[10%]">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {dashboardData?.campaignBreakdown.map((c, idx) => (
                        <tr key={`${c.campaignId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 pr-1 font-semibold text-slate-900 truncate" title={c.campaignName}>
                            {c.campaignName}
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(c.spend)}
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono text-slate-600 whitespace-nowrap">
                            {formatNum(c.messageInbox)}
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatNum(c.leads)}
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatNum(c.closedSales)}
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                            {formatCurrency(c.sale)}
                          </td>
                          <td className="py-2.5 px-1 text-right font-mono text-slate-600 whitespace-nowrap">
                            {c.costPerLead ? `฿${Math.round(c.costPerLead)}` : '—'}
                          </td>
                          <td className="py-2.5 pl-1 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                            {c.roi ? `${c.roi.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/marketing/ads/campaigns"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 transition-colors"
                >
                  <span>ดูรายละเอียดโครงสร้างแคมเปญ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Col 2 (3 Cols = 25%): Top Ads by ROI */}
            <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-2xs border border-slate-200 flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    โฆษณาผลตอบแทนสูงสุด (Top Ads by ROI)
                  </h3>
                </div>

                <div className="space-y-4 pt-3 my-auto">
                  {dashboardData?.topAdsByRoi.slice(0, 3).map((ad, idx) => {
                    const barWidth = Math.min(100, Math.max(15, (ad.roi / 1500) * 100))
                    return (
                      <div key={`${ad.adId}_${idx}`} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]" title={ad.adName}>
                            {ad.adName}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {ad.roi.toFixed(1)}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-sm h-5 overflow-hidden relative shadow-2xs">
                          <div
                            className="h-full bg-rose-600 rounded-sm transition-all duration-500 shadow-2xs"
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Horizontal scale marker */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                    <span>0%</span>
                    <span>500%</span>
                    <span>1000%</span>
                    <span>1500%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                สูตรคำนวณ: (ยอดขาย − ค่าใช้จ่าย) ÷ ค่าใช้จ่าย × 100
              </div>
            </div>

            {/* Col 3 (3 Cols = 25%): Attention Required */}
            <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-2xs border border-slate-200 flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    รายการที่ต้องตรวจสอบ (Attention Required)
                  </h3>
                </div>

                <div className="space-y-2.5 pt-3 my-auto">
                  {/* Alert 1 */}
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate text-[11px]">
                        2 โฆษณายังไม่อัปเดตวันนี้
                      </span>
                    </div>
                    <Link
                      href="/marketing/ads/performance"
                      className="px-2.5 py-1 text-[10px] font-bold bg-white rounded border border-slate-200 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs text-slate-700"
                    >
                      ตรวจสอบ
                    </Link>
                  </div>

                  {/* Alert 2 */}
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate text-[11px]">
                        1 ยอดขายรอยืนยันรหัสโฆษณา
                      </span>
                    </div>
                    <Link
                      href="/marketing/ads/crm"
                      className="px-2.5 py-1 text-[10px] font-bold bg-white rounded border border-slate-200 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs text-slate-700"
                    >
                      ระบุโฆษณา
                    </Link>
                  </div>

                  {/* Alert 3 */}
                  <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate text-[11px]">
                        ใช้งบประมาณเกิน 75%
                      </span>
                    </div>
                    <Link
                      href="/marketing/ads/campaigns"
                      className="px-2.5 py-1 text-[10px] font-bold bg-white rounded border border-slate-200 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs text-slate-700"
                    >
                      ดูงบ
                    </Link>
                  </div>

                  {/* Alert 4 */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate text-[11px]">
                        กระทบยอดตัวเลขถูกต้อง 100%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/marketing/ads/performance"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 transition-colors"
                >
                  <span>ดูการแจ้งเตือนทั้งหมด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Section D Footer Footnote */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 text-[11px] text-slate-400 gap-2">
            <span>ที่มาข้อมูล: ข้อมูล Snapshot ล่าสุดจากการตั้งค่าแคมเปญ, ผลโฆษณา และผลลัพธ์ CRM</span>
            <span>อัปเดตล่าสุดโดย {currentUser?.fullName || 'นรินทร์ ส.'} • {refreshedAtText}</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION E: DETAILED PERFORMANCE BREAKDOWNS (TABBED MULTI-DIMENSIONAL)     */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden mt-6">
          {/* Tab Navigation Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <Tv className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">
                  การวิเคราะห์เจาะลึกตามมิติข้อมูล (Detailed Performance Breakdowns)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  เลือกมุมมองที่ต้องการวิเคราะห์ ทั้งรายโฆษณา, แคมเปญ, ชุดโฆษณา, ช่องทาง และชิ้นงานสื่อ
                </p>
              </div>
            </div>

            {/* Tab Pill Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto bg-slate-200/70 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('ads')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'ads'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                โฆษณา &amp; ความสดใหม่ ({dashboardData?.adsBreakdown.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'campaigns'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แคมเปญ (Campaigns)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('adsets')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'adsets'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ชุดโฆษณา (Ad Sets)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('branches')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'branches'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                สาขา (Branches) ({dashboardData?.branchBreakdown?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('productGroups')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'productGroups'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                กลุ่มสินค้า ({dashboardData?.productGroupBreakdown?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('channels')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'channels'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ช่องทาง (Channels)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('creatives')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'creatives'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ชิ้นงานสื่อ (Creatives)
              </button>
            </div>
          </div>

          {/* TAB 1: ADS BREAKDOWN WITH DATA FRESHNESS */}
          {activeTab === 'ads' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-4 py-2.5 min-w-[170px]">ชิ้นงานสื่อ (Creative)</th>
                    <th className="px-4 py-2.5 min-w-[160px]">ชื่อโฆษณา / รหัส Ads</th>
                    <th className="px-4 py-2.5 min-w-[160px]">แคมเปญ / ชุดโฆษณา</th>
                    <th className="px-3 py-2.5 text-right bg-rose-50/40 text-rose-900 min-w-[100px]">ค่าใช้จ่าย (฿)</th>
                    <th className="px-3 py-2.5 text-right bg-rose-50/40 text-rose-900 min-w-[90px]">ข้อความทัก</th>
                    <th className="px-3 py-2.5 text-right min-w-[85px]">ลีด</th>
                    <th className="px-3 py-2.5 text-right min-w-[85px]">ผ่านเกณฑ์</th>
                    <th className="px-3 py-2.5 text-right min-w-[90px] bg-emerald-50/30 text-emerald-900">ปิดการขาย</th>
                    <th className="px-3 py-2.5 text-right min-w-[110px] bg-emerald-50/50 text-emerald-900 font-bold">ยอดขาย (Sale ฿)</th>
                    <th className="px-3 py-2.5 text-right min-w-[85px] font-bold text-emerald-700">ROI (%)</th>
                    <th className="px-4 py-2.5 text-center min-w-[120px]">เวลาอัปเดตล่าสุด</th>
                    <th className="px-4 py-2.5 text-center min-w-[130px]">ความสดใหม่ (Freshness)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData?.adsBreakdown.map((ad, idx) => (
                    <tr key={`${ad.campaignId}_${ad.adSetId}_${ad.adId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Creative Thumbnail */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {renderCreativeThumbnail(ad.creativeUrl, ad.creativeFile, ad.format, 'sm')}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate max-w-[130px]" title={ad.creativeFile}>
                              {ad.creativeFile}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-700 rounded border border-rose-200">
                                เวอร์ชัน {ad.creativeVersion}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ad Name & ID */}
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900">{ad.adName}</div>
                        <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">{ad.adId}</div>
                      </td>

                      {/* Campaign & Ad Set */}
                      <td className="px-4 py-2.5">
                        <div className="text-slate-900 font-medium truncate max-w-[160px]" title={ad.campaignName}>
                          {ad.campaignName}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate max-w-[160px]" title={ad.adSetName}>
                          {ad.adSetName}
                        </div>
                      </td>

                      {/* Spend */}
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 bg-rose-50/20">
                        {formatCurrency(ad.spend)}
                      </td>

                      {/* Inbox */}
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 bg-rose-50/20">
                        {formatNum(ad.messageInbox)}
                      </td>

                      {/* Leads */}
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        {formatNum(ad.leads)}
                      </td>

                      {/* Qualified */}
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                        {formatNum(ad.qualifiedLeads)}
                      </td>

                      {/* Closed Sales */}
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20">
                        {formatNum(ad.closedSales)}
                      </td>

                      {/* Sale */}
                      <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/30">
                        {formatCurrency(ad.sale)}
                      </td>

                      {/* ROI */}
                      <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-600">
                        {ad.roi !== null ? `${ad.roi.toFixed(1)}%` : '—'}
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-2.5 text-center font-mono text-[10.5px] text-slate-500">
                        {ad.lastUpdated ? new Date(ad.lastUpdated).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>

                      {/* Freshness Badge */}
                      <td className="px-4 py-2.5 text-center">
                        {renderFreshnessBadge(ad.freshness, ad.hoursSinceUpdate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CAMPAIGN BREAKDOWN */}
          {activeTab === 'campaigns' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">ชื่อแคมเปญ (Campaign)</th>
                    <th className="px-4 py-2.5 text-center">จำนวน Ads</th>
                    <th className="px-4 py-2.5 text-right">ค่าใช้จ่าย (฿)</th>
                    <th className="px-4 py-2.5 text-right">ข้อความทัก</th>
                    <th className="px-4 py-2.5 text-right">ลีด</th>
                    <th className="px-4 py-2.5 text-right">ปิดการขาย</th>
                    <th className="px-4 py-2.5 text-right">ยอดขาย (Sale ฿)</th>
                    <th className="px-4 py-2.5 text-right">ต้นทุน/ลีด</th>
                    <th className="px-4 py-2.5 text-right">ROI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData?.campaignBreakdown.map((c, idx) => (
                    <tr key={`${c.campaignId}_${idx}`} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{c.campaignName}</span>
                          {c.budgetStrategy === 'CBO' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              CBO
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ABO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{c.adCount}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(c.spend)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(c.messageInbox)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNum(c.leads)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatNum(c.closedSales)}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{formatCurrency(c.sale)}</td>
                      <td className="px-4 py-3 text-right font-mono">{c.costPerLead ? `฿${c.costPerLead.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{c.roi ? `${c.roi.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: AD SETS BREAKDOWN */}
          {activeTab === 'adsets' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">ชุดโฆษณา (Ad Set)</th>
                    <th className="px-4 py-2.5 text-center">จำนวน Ads</th>
                    <th className="px-4 py-2.5 text-right">งบประมาณ (Budget)</th>
                    <th className="px-4 py-2.5 text-right">ค่าใช้จ่าย (฿)</th>
                    <th className="px-4 py-2.5 text-right">สัดส่วนการใช้งบ (%)</th>
                    <th className="px-4 py-2.5 text-right">ข้อความทัก</th>
                    <th className="px-4 py-2.5 text-right">ลีด</th>
                    <th className="px-4 py-2.5 text-right">ปิดการขาย</th>
                    <th className="px-4 py-2.5 text-right">ยอดขาย (Sale ฿)</th>
                    <th className="px-4 py-2.5 text-right">ROI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData?.adSetBreakdown.map((s, idx) => (
                    <tr key={`${s.campaignId || ''}_${s.adSetId}_${idx}`} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{s.adSetName}</td>
                      <td className="px-4 py-3 text-center font-mono">{s.adCount}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {s.budgetStrategy === 'CBO' || s.allocatedBudget === null || s.allocatedBudget === undefined ? (
                          <span className="text-[10.5px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            จัดสรรอัตโนมัติ (Facebook CBO)
                          </span>
                        ) : (
                          formatCurrency(s.allocatedBudget)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(s.spend)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">
                        {s.spendShare !== undefined ? `${s.spendShare.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(s.messageInbox)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNum(s.leads)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatNum(s.closedSales)}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{formatCurrency(s.sale)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{s.roi ? `${s.roi.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: BRANCHES BREAKDOWN (4-LEVEL DRILLDOWN) */}
          {activeTab === 'branches' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-4 py-2.5 min-w-[260px]">สาขา / แคมเปญ / ชุดโฆษณา / โฆษณา</th>
                    <th className="px-4 py-2.5 text-right">ค่าใช้จ่าย (฿)</th>
                    <th className="px-4 py-2.5 text-right">ข้อความทัก</th>
                    <th className="px-4 py-2.5 text-right">การเข้าถึง (Reach)</th>
                    <th className="px-4 py-2.5 text-right">อิมเพรสชัน</th>
                    <th className="px-4 py-2.5 text-right">คลิก</th>
                    <th className="px-4 py-2.5 text-right">CTR (%)</th>
                    <th className="px-4 py-2.5 text-right">CPC (฿)</th>
                    <th className="px-4 py-2.5 text-right">ต้นทุน/ผลลัพธ์ (฿)</th>
                    <th className="px-4 py-2.5 text-right">ลีด</th>
                    <th className="px-4 py-2.5 text-right">ปิดการขาย</th>
                    <th className="px-4 py-2.5 text-right">ยอดขาย (Sale ฿)</th>
                    <th className="px-4 py-2.5 text-right">ROI (%)</th>
                    <th className="px-4 py-2.5 text-center">ประวัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!dashboardData?.branchBreakdown || dashboardData.branchBreakdown.length === 0) ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                        ไม่พบข้อมูลประสิทธิภาพรายสาขาตามเงื่อนไขตัวกรอง
                      </td>
                    </tr>
                  ) : (
                    dashboardData.branchBreakdown.map((b) => {
                      const isBranchExpanded = expandedBranches.has(b.branchId)
                      return (
                        <React.Fragment key={b.branchId}>
                          {/* LEVEL 1: BRANCH */}
                          <tr
                            className="bg-slate-50/80 hover:bg-slate-100/90 font-semibold cursor-pointer border-t border-slate-200 transition-colors"
                            onClick={() => toggleBranch(b.branchId)}
                          >
                            <td className="px-4 py-3 text-slate-900">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleBranch(b.branchId)
                                  }}
                                >
                                  {isBranchExpanded ? <ChevronDown className="w-4 h-4 text-rose-600" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <div className="w-6 h-6 rounded bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-bold text-slate-900 text-xs">{b.branchName}</span>
                                {b.branchCode && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-mono font-medium">
                                    {b.branchCode}
                                  </span>
                                )}
                                <span className="text-[10.5px] text-slate-500 font-normal">
                                  ({b.campaignCount} แคมเปญ, {b.adsCount} Ads)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(b.spend)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatNum(b.messageInbox)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-400 text-[11px]" title="ไม่สามารถบวกทบ Reach ข้ามโฆษณาได้ (Non-additive)">
                              {b.adsCount <= 1 ? formatNum(b.reach) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{formatNum(b.impressions)}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatNum(b.clicks)}</td>
                            <td className="px-4 py-3 text-right font-mono">{b.ctr ? `${b.ctr.toFixed(2)}%` : '—'}</td>
                            <td className="px-4 py-3 text-right font-mono">{b.cpc ? `฿${b.cpc.toFixed(2)}` : '—'}</td>
                            <td className="px-4 py-3 text-right font-mono">{b.costPerResult ? `฿${b.costPerResult.toFixed(2)}` : '—'}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNum(b.leads)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatNum(b.closedSales)}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{formatCurrency(b.sale)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{b.roi ? `${b.roi.toFixed(1)}%` : '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-bold text-rose-600">
                                {isBranchExpanded ? 'ย่อ' : 'ขยาย'}
                              </span>
                            </td>
                          </tr>

                          {/* LEVEL 2: CAMPAIGNS */}
                          {isBranchExpanded && b.campaigns.map((c) => {
                            const isCampaignExpanded = expandedCampaigns.has(c.campaignId)
                            return (
                              <React.Fragment key={c.campaignId}>
                                <tr className="bg-rose-50/25 hover:bg-rose-50/45 text-slate-800 transition-colors">
                                  <td className="px-4 py-2.5 pl-8">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleCampaign(c.campaignId)}
                                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                      >
                                        {isCampaignExpanded ? <ChevronDown className="w-3.5 h-3.5 text-rose-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      </button>
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-800 rounded">แคมเปญ</span>
                                      <span className="font-semibold text-slate-900">{c.campaignName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({c.adSets.length} ชุดโฆษณา)</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatCurrency(c.spend)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{formatNum(c.messageInbox)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono text-slate-400 text-[11px]" title="ไม่สามารถบวกทบ Reach ข้ามโฆษณาได้ (Non-additive)">
                                    {c.adSets.reduce((sum, s) => sum + s.ads.length, 0) <= 1 ? formatNum(c.reach) : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono">{formatNum(c.impressions)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{formatNum(c.clicks)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{c.ctr ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{c.cpc ? `฿${c.cpc.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{c.costPerResult ? `฿${c.costPerResult.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{formatNum(c.leads)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-800">{formatNum(c.closedSales)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700">{formatCurrency(c.sale)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">{c.roi ? `${c.roi.toFixed(1)}%` : '—'}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setHistoryModalItem({
                                        entityType: 'CAMPAIGN',
                                        entityId: c.campaignId,
                                        title: c.campaignName,
                                        subtitle: `สาขา: ${b.branchName}`
                                      })}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95"
                                      title="ดูประวัติการบันทึกข้อมูล"
                                    >
                                      <History className="w-3 h-3 text-slate-500" />
                                      <span>ประวัติ</span>
                                    </button>
                                  </td>
                                </tr>

                                {/* LEVEL 3: AD SETS */}
                                {isCampaignExpanded && c.adSets.map((s) => {
                                  const isAdSetExpanded = expandedAdSets.has(s.adSetId)
                                  return (
                                    <React.Fragment key={s.adSetId}>
                                      <tr className="bg-slate-50/50 hover:bg-slate-50/80 text-slate-700 transition-colors">
                                        <td className="px-4 py-2 pl-14">
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleAdSet(s.adSetId)}
                                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                            >
                                              {isAdSetExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </button>
                                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">ชุดโฆษณา</span>
                                            <span className="font-medium text-slate-800">{s.adSetName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">({s.ads.length} Ads)</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(s.spend)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatNum(s.messageInbox)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-400 text-[11px]" title="ไม่สามารถบวกทบ Reach ข้ามโฆษณาได้ (Non-additive)">
                                          {s.ads.length <= 1 ? formatNum(s.reach) : '—'}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">{formatNum(s.impressions)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatNum(s.clicks)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{s.ctr ? `${s.ctr.toFixed(2)}%` : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{s.cpc ? `฿${s.cpc.toFixed(2)}` : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{s.costPerResult ? `฿${s.costPerResult.toFixed(2)}` : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatNum(s.leads)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-800">{formatNum(s.closedSales)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">{formatCurrency(s.sale)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{s.roi ? `${s.roi.toFixed(1)}%` : '—'}</td>
                                        <td className="px-4 py-2 text-center">
                                          <button
                                            type="button"
                                            onClick={() => setHistoryModalItem({
                                              entityType: 'AD_SET',
                                              entityId: s.adSetId,
                                              title: s.adSetName,
                                              subtitle: `แคมเปญ: ${c.campaignName}`
                                            })}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95"
                                            title="ดูประวัติการบันทึกข้อมูล"
                                          >
                                            <History className="w-3 h-3 text-slate-500" />
                                            <span>ประวัติ</span>
                                          </button>
                                        </td>
                                      </tr>

                                      {/* LEVEL 4: ADS */}
                                      {isAdSetExpanded && s.ads.map((ad) => (
                                        <tr key={ad.adId} className="bg-white hover:bg-slate-50/90 text-slate-700 transition-colors">
                                          <td className="px-4 py-2 pl-20">
                                            <div className="flex items-center gap-2">
                                              {renderCreativeThumbnail(ad.creativeUrl, ad.creativeFile, ad.format, 'sm')}
                                              <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-semibold text-slate-900">{ad.adName}</span>
                                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    v{ad.version || 1}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">ID: {ad.adId}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(ad.spend)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{formatNum(ad.messageInbox)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-semibold text-blue-700">{formatNum(ad.reach)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{formatNum(ad.impressions)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{formatNum(ad.clicks)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{ad.ctr ? `${ad.ctr.toFixed(2)}%` : '—'}</td>
                                          <td className="px-4 py-2 text-right font-mono">{ad.cpc ? `฿${ad.cpc.toFixed(2)}` : '—'}</td>
                                          <td className="px-4 py-2 text-right font-mono">{ad.costPerResult ? `฿${ad.costPerResult.toFixed(2)}` : '—'}</td>
                                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatNum(ad.leads)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-800">{formatNum(ad.closedSales)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">{formatCurrency(ad.sale)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{ad.roi ? `${ad.roi.toFixed(1)}%` : '—'}</td>
                                          <td className="px-4 py-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => setHistoryModalItem({
                                                entityType: 'AD',
                                                entityId: ad.adId,
                                                title: ad.adName,
                                                subtitle: `ID: ${ad.adId}`
                                              })}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95"
                                              title="ดูประวัติการบันทึกข้อมูล"
                                            >
                                              <History className="w-3 h-3 text-slate-500" />
                                              <span>ประวัติ</span>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: PRODUCT GROUPS BREAKDOWN (4-LEVEL DRILLDOWN) */}
          {activeTab === 'productGroups' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-4 py-2.5 min-w-[260px]">กลุ่มสินค้า / แคมเปญ / ชุดโฆษณา / โฆษณา</th>
                    <th className="px-4 py-2.5 text-right">ค่าใช้จ่าย (฿)</th>
                    <th className="px-4 py-2.5 text-right">ข้อความทัก</th>
                    <th className="px-4 py-2.5 text-right">การเข้าถึง (Reach)</th>
                    <th className="px-4 py-2.5 text-right">อิมเพรสชัน</th>
                    <th className="px-4 py-2.5 text-right">คลิก</th>
                    <th className="px-4 py-2.5 text-right">CTR (%)</th>
                    <th className="px-4 py-2.5 text-right">CPC (฿)</th>
                    <th className="px-4 py-2.5 text-right">ต้นทุน/ผลลัพธ์ (฿)</th>
                    <th className="px-4 py-2.5 text-right">ลีด</th>
                    <th className="px-4 py-2.5 text-right">ปิดการขาย</th>
                    <th className="px-4 py-2.5 text-right">ยอดขาย (Sale ฿)</th>
                    <th className="px-4 py-2.5 text-right">ROI (%)</th>
                    <th className="px-4 py-2.5 text-center">ประวัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!dashboardData?.productGroupBreakdown || dashboardData.productGroupBreakdown.length === 0) ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                        ไม่พบข้อมูลประสิทธิภาพรายกลุ่มสินค้าตามเงื่อนไขตัวกรอง
                      </td>
                    </tr>
                  ) : (
                    dashboardData.productGroupBreakdown.map((pg) => {
                      const isPgExpanded = expandedProductGroups.has(pg.productGroupId)
                      return (
                        <React.Fragment key={pg.productGroupId}>
                          {/* LEVEL 1: PRODUCT GROUP */}
                          <tr
                            className="bg-slate-50/80 hover:bg-slate-100/90 font-semibold cursor-pointer border-t border-slate-200 transition-colors"
                            onClick={() => toggleProductGroup(pg.productGroupId)}
                          >
                            <td className="px-4 py-3 text-slate-900">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleProductGroup(pg.productGroupId)
                                  }}
                                >
                                  {isPgExpanded ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                  <Package className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-bold text-slate-900 text-xs">{pg.productGroupName}</span>
                                <span className="text-[10.5px] text-slate-500 font-normal">
                                  ({pg.campaignCount} แคมเปญ, {pg.adsCount} Ads)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(pg.spend)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatNum(pg.messageInbox)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-400 text-[11px]" title="ไม่สามารถบวกทบ Reach ข้ามโฆษณาได้ (Non-additive)">
                              {pg.adsCount <= 1 ? formatNum(pg.reach) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{formatNum(pg.impressions)}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatNum(pg.clicks)}</td>
                            <td className="px-4 py-3 text-right font-mono">{pg.ctr ? `${pg.ctr.toFixed(2)}%` : '—'}</td>
                            <td className="px-4 py-3 text-right font-mono">{pg.cpc ? `฿${pg.cpc.toFixed(2)}` : '—'}</td>
                            <td className="px-4 py-3 text-right font-mono">{pg.costPerResult ? `฿${pg.costPerResult.toFixed(2)}` : '—'}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNum(pg.leads)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatNum(pg.closedSales)}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{formatCurrency(pg.sale)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{pg.roi ? `${pg.roi.toFixed(1)}%` : '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-bold text-emerald-700">
                                {isPgExpanded ? 'ย่อ' : 'ขยาย'}
                              </span>
                            </td>
                          </tr>

                          {/* LEVEL 2: CAMPAIGNS */}
                          {isPgExpanded && pg.campaigns.map((c) => {
                            const isCampaignExpanded = expandedCampaigns.has(c.campaignId)
                            return (
                              <React.Fragment key={c.campaignId}>
                                <tr className="bg-emerald-50/25 hover:bg-emerald-50/45 text-slate-800 transition-colors">
                                  <td className="px-4 py-2.5 pl-8">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleCampaign(c.campaignId)}
                                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                      >
                                        {isCampaignExpanded ? <ChevronDown className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      </button>
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">แคมเปญ</span>
                                      <span className="font-semibold text-slate-900">{c.campaignName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">({c.adSets.length} ชุดโฆษณา)</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatCurrency(c.spend)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{formatNum(c.messageInbox)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono text-slate-400 text-[11px]" title="ไม่สามารถบวกทบ Reach ข้ามโฆษณาได้ (Non-additive)">
                                    {c.adSets.reduce((sum, s) => sum + s.ads.length, 0) <= 1 ? formatNum(c.reach) : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono">{formatNum(c.impressions)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{formatNum(c.clicks)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{c.ctr ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{c.cpc ? `฿${c.cpc.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{c.costPerResult ? `฿${c.costPerResult.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{formatNum(c.leads)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-800">{formatNum(c.closedSales)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700">{formatCurrency(c.sale)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">{c.roi ? `${c.roi.toFixed(1)}%` : '—'}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setHistoryModalItem({
                                        entityType: 'CAMPAIGN',
                                        entityId: c.campaignId,
                                        title: c.campaignName,
                                        subtitle: `กลุ่มสินค้า: ${pg.productGroupName}`
                                      })}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95"
                                      title="ดูประวัติการบันทึกข้อมูล"
                                    >
                                      <History className="w-3 h-3 text-slate-500" />
                                      <span>ประวัติ</span>
                                    </button>
                                  </td>
                                </tr>

                                {/* LEVEL 3: AD SETS */}
                                {isCampaignExpanded && c.adSets.map((s) => {
                                  const isAdSetExpanded = expandedAdSets.has(s.adSetId)
                                  return (
                                    <React.Fragment key={s.adSetId}>
                                      <tr className="bg-slate-50/50 hover:bg-slate-50/80 text-slate-700 transition-colors">
                                        <td className="px-4 py-2 pl-14">
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleAdSet(s.adSetId)}
                                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                            >
                                              {isAdSetExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </button>
                                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">ชุดโฆษณา</span>
                                            <span className="font-medium text-slate-800">{s.adSetName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">({s.ads.length} Ads)</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(s.spend)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatNum(s.messageInbox)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-400 text-[11px]" title="ไม่สามารถบวกทบ Reach ข้ามโฆษณาได้ (Non-additive)">
                                          {s.ads.length <= 1 ? formatNum(s.reach) : '—'}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">{formatNum(s.impressions)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatNum(s.clicks)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{s.ctr ? `${s.ctr.toFixed(2)}%` : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{s.cpc ? `฿${s.cpc.toFixed(2)}` : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{s.costPerResult ? `฿${s.costPerResult.toFixed(2)}` : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatNum(s.leads)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-800">{formatNum(s.closedSales)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">{formatCurrency(s.sale)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{s.roi ? `${s.roi.toFixed(1)}%` : '—'}</td>
                                        <td className="px-4 py-2 text-center">
                                          <button
                                            type="button"
                                            onClick={() => setHistoryModalItem({
                                              entityType: 'AD_SET',
                                              entityId: s.adSetId,
                                              title: s.adSetName,
                                              subtitle: `แคมเปญ: ${c.campaignName}`
                                            })}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95"
                                            title="ดูประวัติการบันทึกข้อมูล"
                                          >
                                            <History className="w-3 h-3 text-slate-500" />
                                            <span>ประวัติ</span>
                                          </button>
                                        </td>
                                      </tr>

                                      {/* LEVEL 4: ADS */}
                                      {isAdSetExpanded && s.ads.map((ad) => (
                                        <tr key={ad.adId} className="bg-white hover:bg-slate-50/90 text-slate-700 transition-colors">
                                          <td className="px-4 py-2 pl-20">
                                            <div className="flex items-center gap-2">
                                              {renderCreativeThumbnail(ad.creativeUrl, ad.creativeFile, ad.format, 'sm')}
                                              <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-semibold text-slate-900">{ad.adName}</span>
                                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    v{ad.version || 1}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">ID: {ad.adId}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(ad.spend)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{formatNum(ad.messageInbox)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-semibold text-blue-700">{formatNum(ad.reach)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{formatNum(ad.impressions)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{formatNum(ad.clicks)}</td>
                                          <td className="px-4 py-2 text-right font-mono">{ad.ctr ? `${ad.ctr.toFixed(2)}%` : '—'}</td>
                                          <td className="px-4 py-2 text-right font-mono">{ad.cpc ? `฿${ad.cpc.toFixed(2)}` : '—'}</td>
                                          <td className="px-4 py-2 text-right font-mono">{ad.costPerResult ? `฿${ad.costPerResult.toFixed(2)}` : '—'}</td>
                                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{formatNum(ad.leads)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-800">{formatNum(ad.closedSales)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-700">{formatCurrency(ad.sale)}</td>
                                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{ad.roi ? `${ad.roi.toFixed(1)}%` : '—'}</td>
                                          <td className="px-4 py-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => setHistoryModalItem({
                                                entityType: 'AD',
                                                entityId: ad.adId,
                                                title: ad.adName,
                                                subtitle: `ID: ${ad.adId}`
                                              })}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer active:scale-95"
                                              title="ดูประวัติการบันทึกข้อมูล"
                                            >
                                              <History className="w-3 h-3 text-slate-500" />
                                              <span>ประวัติ</span>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: CHANNELS BREAKDOWN */}
          {activeTab === 'channels' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">ช่องทาง (Channel)</th>
                    <th className="px-4 py-2.5 text-center">จำนวนแคมเปญ</th>
                    <th className="px-4 py-2.5 text-right">ค่าใช้จ่าย (฿)</th>
                    <th className="px-4 py-2.5 text-right">ข้อความทัก</th>
                    <th className="px-4 py-2.5 text-right">ลีด</th>
                    <th className="px-4 py-2.5 text-right">ปิดการขาย</th>
                    <th className="px-4 py-2.5 text-right">ยอดขาย (Sale ฿)</th>
                    <th className="px-4 py-2.5 text-right">ROI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData?.channelBreakdown.map((ch, idx) => (
                    <tr key={`${ch.channel}_${idx}`} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{ch.channel}</td>
                      <td className="px-4 py-3 text-center font-mono">{ch.campaignCount}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(ch.spend)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(ch.messageInbox)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNum(ch.leads)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatNum(ch.closedSales)}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{formatCurrency(ch.sale)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{ch.roi ? `${ch.roi.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: CREATIVES BREAKDOWN */}
          {activeTab === 'creatives' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">ชิ้นงานสื่อ (Creative Asset)</th>
                    <th className="px-4 py-2.5 text-center">เวอร์ชัน</th>
                    <th className="px-4 py-2.5 text-center">รูปแบบสื่อ</th>
                    <th className="px-4 py-2.5 text-right">ค่าใช้จ่าย (฿)</th>
                    <th className="px-4 py-2.5 text-right">ข้อความทัก</th>
                    <th className="px-4 py-2.5 text-right">ลีด</th>
                    <th className="px-4 py-2.5 text-right">ปิดการขาย</th>
                    <th className="px-4 py-2.5 text-right">ยอดขาย (Sale ฿)</th>
                    <th className="px-4 py-2.5 text-right">ROI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData?.creativeBreakdown.map((cr, idx) => (
                    <tr key={`${cr.creativeFile}_${cr.creativeVersion}_${idx}`} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {renderCreativeThumbnail(cr.creativeUrl, cr.creativeFile, cr.format, 'sm')}
                          <span className="font-bold text-slate-900">{cr.creativeFile}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">
                          {cr.creativeVersion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">
                        {cr.format === 'Video' ? 'วิดีโอ (Video)' : 'รูปภาพ (Image)'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(cr.spend)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatNum(cr.messageInbox)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatNum(cr.leads)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatNum(cr.closedSales)}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{formatCurrency(cr.sale)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{cr.roi ? `${cr.roi.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Lightbox Media Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col items-center justify-center p-2"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewMedia(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {previewMedia.toLowerCase().endsWith('.mp4') ? (
              <video
                src={previewMedia}
                controls
                autoPlay
                className="max-h-[82vh] w-auto rounded-xl shadow-lg"
              />
            ) : (
              <img
                src={previewMedia}
                alt="Preview"
                className="max-h-[82vh] w-auto object-contain rounded-xl shadow-lg"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Snapshot History Modal */}
      {historyModalItem && (
        <SnapshotHistoryModal
          isOpen={true}
          onClose={() => setHistoryModalItem(null)}
          item={historyModalItem}
        />
      )}
    </div>
  )
}
