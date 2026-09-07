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
  getAdPerformanceHistory
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
  Activity
} from 'lucide-react'

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
  const [dateTo, setDateTo] = useState<string>('2026-08-05')
  const [filterChannel, setFilterChannel] = useState<string>('All')
  const [filterCampaign, setFilterCampaign] = useState<string>('All')
  const [filterAdSet, setFilterAdSet] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('Active')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [groupByAdSet, setGroupByAdSet] = useState<boolean>(false)

  // Expanded Ad row for inline Update Results
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null)

  // Inline Update Form state
  const [formValues, setFormValues] = useState<{
    dataAsOf: string
    spend: string
    messageInbox: string
    reach: string
    impressions: string
    clicks: string
    updateType: 'Regular Update' | 'Correction'
    correctionReason: string
    notes: string
  }>({
    dataAsOf: new Date().toISOString().slice(0, 16),
    spend: '',
    messageInbox: '',
    reach: '',
    impressions: '',
    clicks: '',
    updateType: 'Regular Update',
    correctionReason: '',
    notes: ''
  })

  const [savingUpdate, setSavingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  // Modals state
  const [historyModalAd, setHistoryModalAd] = useState<ActiveAdPerformanceItem | null>(null)
  const [historyRecords, setHistoryRecords] = useState<PerformanceSnapshot[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkFormRows, setBulkFormRows] = useState<Record<string, { spend: string, messageInbox: string, reach: string, impressions: string, clicks: string }>>({})
  const [bulkDataAsOf, setBulkDataAsOf] = useState<string>(new Date().toISOString().slice(0, 16))
  const [bulkNotes, setBulkNotes] = useState<string>('')
  const [savingBulk, setSavingBulk] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

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
      if (filterStatus !== 'All' && ad.status !== filterStatus) return false

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
  }, [ads, filterChannel, filterCampaign, filterAdSet, filterStatus, searchQuery])

  // Check if any filter is active from default
  const isFilterActive =
    reportingPeriod !== 'This Month' ||
    filterChannel !== 'All' ||
    filterCampaign !== 'All' ||
    filterAdSet !== 'All' ||
    filterStatus !== 'Active' ||
    searchQuery.trim() !== ''

  const handleResetFilters = () => {
    setReportingPeriod('This Month')
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
    const activeAdsCount = filteredAds.filter(a => a.status === 'Active').length

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

  // Toggle inline expansion and pre-fill form
  const handleToggleExpand = (ad: ActiveAdPerformanceItem) => {
    if (expandedAdId === ad.adId) {
      setExpandedAdId(null)
      setUpdateError(null)
      setUpdateSuccess(null)
      return
    }

    setExpandedAdId(ad.adId)
    setUpdateError(null)
    setUpdateSuccess(null)

    // Prepopulate with latest snapshot values or current ad values
    const latest = ad.latestSnapshot
    setFormValues({
      dataAsOf: new Date().toISOString().slice(0, 16),
      spend: latest ? String(latest.spend) : (ad.spend ? String(ad.spend) : ''),
      messageInbox: latest ? String(latest.messageInbox) : (ad.messageInbox ? String(ad.messageInbox) : ''),
      reach: latest ? String(latest.reach) : (ad.reach ? String(ad.reach) : ''),
      impressions: latest ? String(latest.impressions) : (ad.impressions ? String(ad.impressions) : ''),
      clicks: latest ? String(latest.clicks) : (ad.clicks ? String(ad.clicks) : ''),
      updateType: 'Regular Update',
      correctionReason: '',
      notes: ''
    })
  }

  // Current expanded ad object
  const currentExpandedAd = useMemo(() => {
    return ads.find(a => a.adId === expandedAdId) || null
  }, [ads, expandedAdId])

  // Real-time calculation for expanded ad
  const liveCalculations = useMemo(() => {
    if (!currentExpandedAd) return null

    const prev = currentExpandedAd.latestSnapshot
    const prevSpend = prev ? prev.spend : 0
    const prevInbox = prev ? prev.messageInbox : 0
    const prevReach = prev ? prev.reach : 0
    const prevImp = prev ? prev.impressions : 0
    const prevClicks = prev ? prev.clicks : 0

    const newSpend = Number(formValues.spend || 0)
    const newInbox = Number(formValues.messageInbox || 0)
    const newReach = Number(formValues.reach || 0)
    const newImp = Number(formValues.impressions || 0)
    const newClicks = Number(formValues.clicks || 0)

    const deltaSpend = newSpend - prevSpend
    const deltaInbox = newInbox - prevInbox
    const deltaReach = newReach - prevReach
    const deltaImp = newImp - prevImp
    const deltaClicks = newClicks - prevClicks

    const ctr = newImp > 0 ? (newClicks / newImp) * 100 : null
    const cpc = newClicks > 0 ? newSpend / newClicks : null
    const cpm = newImp > 0 ? (newSpend / newImp) * 1000 : null
    const costPerResult = newInbox > 0 ? newSpend / newInbox : null

    const planned = currentExpandedAd.plannedBudget || summary.totalPlannedBudget || 110000
    const budgetUsedPercent = planned > 0 ? (newSpend / planned) * 100 : null
    const remainingBudget = planned - newSpend

    const isDecrease = deltaSpend < 0 || deltaInbox < 0 || deltaReach < 0 || deltaImp < 0 || deltaClicks < 0

    return {
      prevSpend,
      prevInbox,
      prevReach,
      prevImp,
      prevClicks,
      newSpend,
      newInbox,
      newReach,
      newImp,
      newClicks,
      deltaSpend,
      deltaInbox,
      deltaReach,
      deltaImp,
      deltaClicks,
      ctr,
      cpc,
      cpm,
      costPerResult,
      budgetUsedPercent,
      remainingBudget,
      isDecrease
    }
  }, [currentExpandedAd, formValues, summary.totalPlannedBudget])

  // Handle saving new single snapshot
  const handleSaveUpdate = async (asDraft: boolean = false) => {
    if (!currentExpandedAd) return

    setUpdateError(null)
    setUpdateSuccess(null)

    // Safeguard validation
    if (liveCalculations?.isDecrease && formValues.updateType !== 'Correction') {
      setUpdateError('ค่าผลลัพธ์สะสมน้อยกว่าค่าก่อนหน้า กรุณาเลือกประเภทเป็น "Correction" พร้อมระบุเหตุผลการแก้ไข')
      return
    }

    if (formValues.updateType === 'Correction' && !formValues.correctionReason.trim()) {
      setUpdateError('กรุณากรอกเหตุผลการแก้ไข (Correction Reason) สำหรับการแก้ไขแบบย้อนหลัง')
      return
    }

    setSavingUpdate(true)
    try {
      const res = await savePerformanceSnapshot({
        adId: currentExpandedAd.adId,
        campaignId: currentExpandedAd.campaignId,
        adSetId: currentExpandedAd.adSetId,
        creativeId: currentExpandedAd.adId,
        creativeFile: currentExpandedAd.creativeFile,
        creativeVersion: currentExpandedAd.creativeVersion,
        creativeUrl: currentExpandedAd.creativeUrl,
        capturedAt: formValues.dataAsOf ? new Date(formValues.dataAsOf).toISOString() : new Date().toISOString(),
        spend: Number(formValues.spend || 0),
        messageInbox: Number(formValues.messageInbox || 0),
        reach: Number(formValues.reach || 0),
        impressions: Number(formValues.impressions || 0),
        clicks: Number(formValues.clicks || 0),
        dataSource: 'Cumulative Ads Manager Snapshot',
        notes: formValues.notes,
        enteredBy: currentUser.name,
        updateType: formValues.updateType,
        correctionReason: formValues.updateType === 'Correction' ? formValues.correctionReason : null,
        status: asDraft ? 'DRAFT' : 'SAVED'
      })

      if (res.success && res.snapshot) {
        const newSnap = res.snapshot
        // Update local ads state
        setAds(prevAds => prevAds.map(ad => {
          if (ad.adId === currentExpandedAd.adId) {
            const previous = ad.latestSnapshot
            const newSpend = newSnap.spend
            const newInbox = newSnap.messageInbox
            const newReach = newSnap.reach
            const newImp = newSnap.impressions
            const newClicks = newSnap.clicks

            return {
              ...ad,
              latestSnapshot: newSnap,
              previousSnapshot: previous,
              spend: newSpend,
              messageInbox: newInbox,
              reach: newReach,
              impressions: newImp,
              clicks: newClicks,
              ctr: newImp > 0 ? (newClicks / newImp) * 100 : null,
              cpc: newClicks > 0 ? newSpend / newClicks : null,
              cpm: newImp > 0 ? (newSpend / newImp) * 1000 : null,
              costPerResult: newInbox > 0 ? newSpend / newInbox : null,
              lastUpdated: newSnap.capturedAt,
              deltaSpend: previous ? newSpend - previous.spend : newSpend,
              deltaInbox: previous ? newInbox - previous.messageInbox : newInbox,
              deltaReach: previous ? newReach - previous.reach : newReach,
              deltaImpressions: previous ? newImp - previous.impressions : newImp,
              deltaClicks: previous ? newClicks - previous.clicks : newClicks,
              changePercent: (previous && previous.spend > 0) ? ((newSpend - previous.spend) / previous.spend) * 100 : null
            }
          }
          return ad
        }))

        setSnapshots(prev => [newSnap, ...prev])
        setUpdateSuccess(`บันทึก Performance Snapshot สำเร็จ! รหัส Snapshot: ${newSnap.snapshotId}`)

        setTimeout(() => {
          setExpandedAdId(null)
          setUpdateSuccess(null)
        }, 1200)
      } else {
        setUpdateError(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      setUpdateError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setSavingUpdate(false)
    }
  }

  // Open History modal
  const handleOpenHistory = async (ad: ActiveAdPerformanceItem) => {
    setHistoryModalAd(ad)
    setLoadingHistory(true)
    try {
      const res = await getAdPerformanceHistory(ad.adId)
      if (res.success) {
        setHistoryRecords(res.history)
      } else {
        setHistoryRecords([])
      }
    } catch {
      setHistoryRecords([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Open Bulk Update Modal
  const handleOpenBulkModal = () => {
    const initialRows: Record<string, { spend: string, messageInbox: string, reach: string, impressions: string, clicks: string }> = {}
    filteredAds.forEach(ad => {
      initialRows[ad.adId] = {
        spend: ad.spend ? String(ad.spend) : '',
        messageInbox: ad.messageInbox ? String(ad.messageInbox) : '',
        reach: ad.reach ? String(ad.reach) : '',
        impressions: ad.impressions ? String(ad.impressions) : '',
        clicks: ad.clicks ? String(ad.clicks) : ''
      }
    })
    setBulkFormRows(initialRows)
    setBulkDataAsOf(new Date().toISOString().slice(0, 16))
    setBulkNotes('')
    setBulkError(null)
    setBulkModalOpen(true)
  }

  // Save Bulk Updates
  const handleSaveBulkUpdates = async () => {
    setBulkError(null)
    setSavingBulk(true)
    try {
      const updates = filteredAds.map(ad => {
        const row = bulkFormRows[ad.adId] || { spend: '0', messageInbox: '0', reach: '0', impressions: '0', clicks: '0' }
        return {
          adId: ad.adId,
          campaignId: ad.campaignId,
          adSetId: ad.adSetId,
          creativeId: ad.adId,
          creativeFile: ad.creativeFile,
          creativeVersion: ad.creativeVersion,
          creativeUrl: ad.creativeUrl,
          capturedAt: bulkDataAsOf ? new Date(bulkDataAsOf).toISOString() : new Date().toISOString(),
          spend: Number(row.spend || 0),
          messageInbox: Number(row.messageInbox || 0),
          reach: Number(row.reach || 0),
          impressions: Number(row.impressions || 0),
          clicks: Number(row.clicks || 0),
          dataSource: 'Bulk Snapshot Update',
          notes: bulkNotes,
          enteredBy: currentUser.name,
          updateType: 'Regular Update' as const,
          status: 'SAVED' as const
        }
      })

      const res = await saveBulkPerformanceSnapshots(updates)
      if (res.success && res.snapshots) {
        // Refresh local state with new snapshots
        const newSnapshotsMap = new Map<string, PerformanceSnapshot>(
          res.snapshots.map((s: PerformanceSnapshot) => [s.adId, s])
        )
        setAds(prev => prev.map(ad => {
          const snap = newSnapshotsMap.get(ad.adId)
          if (snap) {
            const previous = ad.latestSnapshot
            const newSpend = snap.spend
            const newInbox = snap.messageInbox
            const newReach = snap.reach
            const newImp = snap.impressions
            const newClicks = snap.clicks

            return {
              ...ad,
              latestSnapshot: snap,
              previousSnapshot: previous,
              spend: newSpend,
              messageInbox: newInbox,
              reach: newReach,
              impressions: newImp,
              clicks: newClicks,
              ctr: newImp > 0 ? (newClicks / newImp) * 100 : null,
              cpc: newClicks > 0 ? newSpend / newClicks : null,
              cpm: newImp > 0 ? (newSpend / newImp) * 1000 : null,
              costPerResult: newInbox > 0 ? newSpend / newInbox : null,
              lastUpdated: snap.capturedAt,
              deltaSpend: previous ? newSpend - previous.spend : newSpend,
              deltaInbox: previous ? newInbox - previous.messageInbox : newInbox,
              deltaReach: previous ? newReach - previous.reach : newReach,
              deltaImpressions: previous ? newImp - previous.impressions : newImp,
              deltaClicks: previous ? newClicks - previous.clicks : newClicks,
              changePercent: (previous && previous.spend > 0) ? ((newSpend - previous.spend) / previous.spend) * 100 : null
            }
          }
          return ad
        }))
        setBulkModalOpen(false)
      } else {
        setBulkError(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลพร้อมกัน')
      }
    } catch (err: any) {
      setBulkError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึกข้อมูล')
    } finally {
      setSavingBulk(false)
    }
  }

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

              {/* Bulk Update Results button */}
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all shadow-sm hover:shadow-rose-500/20 active:scale-95 shrink-0"
                title="อัปเดตผลลัพธ์หลายโฆษณาพร้อมกัน"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>อัปเดตผลหลายรายการ</span>
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
                {campaigns.map(c => (
                  <option key={c.id} value={c.campaignId || c.id}>
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
                {adSets.map(setName => (
                  <option key={setName} value={setName}>
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
                {channels.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
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
                onChange={e => setReportingPeriod(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="Today">วันนี้ (Today)</option>
                <option value="Yesterday">เมื่อวาน (Yesterday)</option>
                <option value="Last 7 Days">7 วันล่าสุด (Last 7 Days)</option>
                <option value="Last 14 Days">14 วันล่าสุด (Last 14 Days)</option>
                <option value="This Month">เดือนนี้ (This Month)</option>
                <option value="All Time">ทั้งหมด (All Time)</option>
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

                      {groupItems.map(ad => {
                        const isExpanded = expandedAdId === ad.adId
                        const hasDeltaSpend = ad.deltaSpend !== 0 && ad.deltaSpend !== undefined
                        const hasDeltaInbox = ad.deltaInbox !== 0 && ad.deltaInbox !== undefined

                        return (
                          <React.Fragment key={ad.adId}>
                            <tr
                              className={`transition-colors group ${
                                isExpanded
                                  ? 'bg-rose-50/30'
                                  : 'hover:bg-slate-50/80 bg-white'
                              }`}
                            >
                              {/* 1. Creative Thumbnail & Version */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 cursor-pointer group-hover:border-rose-300 transition-all flex items-center justify-center"
                                    onClick={() => setPreviewImage(ad.creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')}
                                    title="คลิกเพื่อดูรูปขนาดเต็ม"
                                  >
                                    <img
                                      src={ad.creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg'}
                                      alt={ad.creativeFile || 'Creative'}
                                      className="w-full h-full object-cover"
                                      onError={(e: any) => {
                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=100&auto=format&fit=crop&q=60'
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Eye className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
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
                                <div className="font-medium text-slate-900 truncate max-w-[180px]" title={ad.campaignName}>
                                  {ad.campaignName}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5" title={ad.adSetName}>
                                  {ad.adSetName}
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
                                  ad.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${ad.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                  {ad.status === 'Active' ? 'เปิดใช้งาน' : (ad.status === 'Paused' ? 'หยุดชั่วคราว' : ad.status)}
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

                              {/* 15. Action Button */}
                              <td className="px-4 py-3 text-center sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition-colors shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpand(ad)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                                    isExpanded
                                      ? 'bg-rose-600 text-white shadow-rose-500/20'
                                      : 'bg-white border border-rose-300 text-rose-600 hover:bg-rose-50'
                                  }`}
                                >
                                  <span>อัปเดตผลลัพธ์</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* ================================================================= */}
                            {/* INLINE EXPANDABLE CARD: UPDATE RESULTS (3-PANEL MOCKUP LAYOUT)    */}
                            {/* ================================================================= */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-y-2 border-rose-400">
                                <td colSpan={15} className="p-5">
                                  <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 space-y-5">
                                    {/* Subheader */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                          อัปเดตผลการนำส่งโฆษณา — {ad.adId}: {ad.adName}
                                        </h3>
                                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                                          โหมดบันทึก Snapshot สะสม
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenHistory(ad)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                        >
                                          <History className="w-3.5 h-3.5 text-slate-500" />
                                          <span>ดูประวัติ Snapshot</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedAdId(null)}
                                          className="text-slate-400 hover:text-slate-600 p-1"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* 3 Columns Layout matching mockup */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                      {/* ============================================== */}
                                      {/* PANEL 1: AD METADATA & CREATIVE (READ-ONLY)    */}
                                      {/* ============================================== */}
                                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                            ข้อมูลโฆษณาและสื่อ (Metadata)
                                          </span>
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                            <Lock className="w-2.5 h-2.5" /> อ่านอย่างเดียว (Read Only)
                                          </span>
                                        </div>

                                        {/* Creative Preview */}
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                          <div
                                            className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 cursor-pointer"
                                            onClick={() => setPreviewImage(ad.creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')}
                                          >
                                            <img
                                              src={ad.creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg'}
                                              alt={ad.creativeFile}
                                              className="w-full h-full object-cover"
                                              onError={(e: any) => {
                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=100&auto=format&fit=crop&q=60'
                                              }}
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate" title={ad.creativeFile}>
                                              {ad.creativeFile || 'รูปภาพชิ้นงานสื่อ'}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">
                                                เวอร์ชัน {ad.creativeVersion || 'V1'}
                                              </span>
                                              <span className="text-[10px] text-slate-500">
                                                {ad.format === 'Video' ? 'วิดีโอ' : 'รูปภาพ'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Read-only Attributes */}
                                        <div className="space-y-2 text-xs">
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                            <span className="text-slate-500">แคมเปญ:</span>
                                            <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={ad.campaignName}>
                                              {ad.campaignName}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                            <span className="text-slate-500">ชุดโฆษณา:</span>
                                            <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={ad.adSetName}>
                                              {ad.adSetName}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                            <span className="text-slate-500">ชื่อโฆษณา:</span>
                                            <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={ad.adName}>
                                              {ad.adName}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                            <span className="text-slate-500">รหัสโฆษณา:</span>
                                            <span className="font-mono font-semibold text-slate-700">
                                              {ad.adId}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-500">สถานะ:</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                              ● {ad.status === 'Active' ? 'เปิดใช้งาน' : (ad.status === 'Paused' ? 'หยุดชั่วคราว' : ad.status)}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Campaign Setup notice */}
                                        <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                                          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                          <span>
                                            หากต้องการเปลี่ยนชิ้นงานสื่อ หรือแก้ไขโครงสร้างโฆษณา กรุณาไปที่{' '}
                                            <Link href="/marketing/ads/campaigns" className="text-rose-600 font-semibold underline">
                                              ตั้งค่าแคมเปญ (Campaign Setup)
                                            </Link>
                                          </span>
                                        </div>
                                      </div>

                                      {/* ============================================== */}
                                      {/* PANEL 2: LATEST CUMULATIVE VALUES (INPUT)      */}
                                      {/* ============================================== */}
                                      <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs space-y-3.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                            ตัวเลขสะสมล่าสุด (Cumulative Values)
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            ข้อมูลจาก Ads Manager
                                          </span>
                                        </div>

                                        {/* Data As Of */}
                                        <div>
                                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            Data as of (วัน-เวลาที่ดึงข้อมูล):
                                          </label>
                                          <input
                                            type="datetime-local"
                                            value={formValues.dataAsOf}
                                            onChange={e => setFormValues(prev => ({ ...prev, dataAsOf: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:bg-white focus:border-rose-500 outline-none"
                                          />
                                        </div>

                                        {/* Amount Spent */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-semibold text-slate-700">
                                              ค่าใช้จ่ายสะสม (Amount Spent ฿) <span className="text-rose-500">*</span>
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ก่อนหน้า: {formatCurrency(liveCalculations?.prevSpend)}
                                            </span>
                                          </div>
                                          <input
                                            type="number"
                                            step="any"
                                            placeholder="เช่น 65350"
                                            value={formValues.spend}
                                            onChange={e => setFormValues(prev => ({ ...prev, spend: e.target.value }))}
                                            className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                          />
                                        </div>

                                        {/* Message Inbox */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-semibold text-slate-700">
                                              ข้อความทักสะสม (Message Inbox)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevInbox)}
                                            </span>
                                          </div>
                                          <input
                                            type="number"
                                            step="1"
                                            placeholder="เช่น 1204"
                                            value={formValues.messageInbox}
                                            onChange={e => setFormValues(prev => ({ ...prev, messageInbox: e.target.value }))}
                                            className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                          />
                                        </div>

                                        {/* 2-col inputs for Reach & Impressions */}
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="text-[11px] font-semibold text-slate-700">
                                                การเข้าถึงสะสม (Reach)
                                              </label>
                                            </div>
                                            <input
                                              type="number"
                                              step="1"
                                              placeholder="เช่น 148200"
                                              value={formValues.reach}
                                              onChange={e => setFormValues(prev => ({ ...prev, reach: e.target.value }))}
                                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                            />
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevReach)}
                                            </div>
                                          </div>

                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="text-[11px] font-semibold text-slate-700">
                                                การมองเห็นสะสม (Imp)
                                              </label>
                                            </div>
                                            <input
                                              type="number"
                                              step="1"
                                              placeholder="เช่น 215600"
                                              value={formValues.impressions}
                                              onChange={e => setFormValues(prev => ({ ...prev, impressions: e.target.value }))}
                                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                            />
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevImp)}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Clicks */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-semibold text-slate-700">
                                              จำนวนคลิกสะสม (Clicks)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevClicks)}
                                            </span>
                                          </div>
                                          <input
                                            type="number"
                                            step="1"
                                            placeholder="เช่น 4320"
                                            value={formValues.clicks}
                                            onChange={e => setFormValues(prev => ({ ...prev, clicks: e.target.value }))}
                                            className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                          />
                                        </div>
                                      </div>

                                      {/* ======================================================== */}
                                      {/* PANEL 3: CHANGE SINCE PREVIOUS UPDATE & AUTO METRICS     */}
                                      {/* ======================================================== */}
                                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            ส่วนต่างและคำนวณอัตโนมัติ (Metrics)
                                          </span>
                                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            คำนวณสดทันที (Live)
                                          </span>
                                        </div>

                                        {/* Delta Increments */}
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            ส่วนต่างจากการอัปเดตก่อนหน้า (Change):
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">ค่าใช้จ่าย:</span>
                                              <span className={`font-bold ${
                                                (liveCalculations?.deltaSpend ?? 0) >= 0 ? 'text-rose-600' : 'text-amber-600'
                                              }`}>
                                                {(liveCalculations?.deltaSpend ?? 0) >= 0 ? '+' : ''}
                                                {formatCurrency(liveCalculations?.deltaSpend)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">ข้อความทัก:</span>
                                              <span className={`font-bold ${
                                                (liveCalculations?.deltaInbox ?? 0) >= 0 ? 'text-blue-600' : 'text-amber-600'
                                              }`}>
                                                {(liveCalculations?.deltaInbox ?? 0) >= 0 ? '+' : ''}
                                                {formatNum(liveCalculations?.deltaInbox)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">การเข้าถึง:</span>
                                              <span className="text-slate-700">
                                                {(liveCalculations?.deltaReach ?? 0) >= 0 ? '+' : ''}
                                                {formatNum(liveCalculations?.deltaReach)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">คลิก:</span>
                                              <span className="text-slate-700">
                                                {(liveCalculations?.deltaClicks ?? 0) >= 0 ? '+' : ''}
                                                {formatNum(liveCalculations?.deltaClicks)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cumulative Auto Rates */}
                                        <div className="space-y-2 text-xs">
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600">CTR (คลิก ÷ การมองเห็น):</span>
                                            <span className="font-mono font-bold text-slate-900">
                                              {formatPercent(liveCalculations?.ctr)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600">CPC (ค่าใช้จ่าย ÷ คลิก):</span>
                                            <span className="font-mono font-bold text-slate-900">
                                              {formatDecimalCurrency(liveCalculations?.cpc)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600">CPM (ค่าใช้จ่าย ÷ การมองเห็น × 1,000):</span>
                                            <span className="font-mono font-bold text-slate-900">
                                              {formatDecimalCurrency(liveCalculations?.cpm)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600">ต้นทุนต่อผลลัพธ์ (Spend ÷ ข้อความ):</span>
                                            <span className="font-mono font-extrabold text-rose-700">
                                              {formatDecimalCurrency(liveCalculations?.costPerResult)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-600">สัดส่วนงบที่ใช้ไป (%):</span>
                                            <span className="font-mono font-bold text-slate-800">
                                              {formatPercent(liveCalculations?.budgetUsedPercent)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Safeguard Warning Banner (if decrease detected) */}
                                    {liveCalculations?.isDecrease && (
                                      <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
                                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="font-bold">คำเตือน: ข้อมูลสะสมล่าสุดน้อยกว่าค่าก่อนหน้า (Cumulative Values Decreased)</strong>
                                          <p className="mt-0.5 text-amber-800">
                                            โดยปกติค่าสะสมต้องเพิ่มขึ้นหรือเท่าเดิม หากคุณกำลังแก้ไขข้อมูลที่บันทึกผิดพลาดก่อนหน้า ระบบจะบันทึกเป็นประเภท <strong>&quot;Correction&quot;</strong> โดยอัตโนมัติ และจำเป็นต้องระบุเหตุผลการแก้ไข
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Bottom Row: Update Type, Notes & Save Actions */}
                                    <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-4 text-xs">
                                          <span className="font-semibold text-slate-700">ประเภทการบันทึก:</span>
                                          <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                              type="radio"
                                              name="updateType"
                                              value="Regular Update"
                                              checked={formValues.updateType === 'Regular Update' && !liveCalculations?.isDecrease}
                                              disabled={liveCalculations?.isDecrease}
                                              onChange={() => setFormValues(prev => ({ ...prev, updateType: 'Regular Update' }))}
                                              className="text-rose-600 focus:ring-rose-500"
                                            />
                                            <span className="text-slate-700">อัปเดตปกติ (Regular Update)</span>
                                          </label>
                                          <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                              type="radio"
                                              name="updateType"
                                              value="Correction"
                                              checked={formValues.updateType === 'Correction' || liveCalculations?.isDecrease}
                                              onChange={() => setFormValues(prev => ({ ...prev, updateType: 'Correction' }))}
                                              className="text-rose-600 focus:ring-rose-500"
                                            />
                                            <span className="text-amber-800 font-medium">แก้ไขย้อนหลัง (Correction)</span>
                                          </label>
                                        </div>

                                        {/* Correction Reason (Mandatory if Correction) */}
                                        {(formValues.updateType === 'Correction' || liveCalculations?.isDecrease) && (
                                          <div>
                                            <input
                                              type="text"
                                              placeholder="ระบุเหตุผลการแก้ไข (จำเป็นต้องระบุ) เช่น กรอกตัวเลขผิด, ปรับตัวเลขตามใบเสร็จจริง..."
                                              value={formValues.correctionReason}
                                              onChange={e => setFormValues(prev => ({ ...prev, correctionReason: e.target.value }))}
                                              className="w-full text-xs bg-amber-50/60 border border-amber-300 rounded-lg px-3 py-1.5 text-amber-900 placeholder-amber-500 outline-none focus:ring-1 focus:ring-amber-500"
                                            />
                                          </div>
                                        )}

                                        {/* Optional Notes */}
                                        <div>
                                          <input
                                            type="text"
                                            placeholder="บันทึกเพิ่มเติม (ไม่บังคับ) เช่น งบถูกปรับขึ้น 10%, โปรโมชันวันหยุด..."
                                            value={formValues.notes}
                                            onChange={e => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-rose-500"
                                          />
                                        </div>
                                      </div>

                                      {/* Save & Draft Buttons */}
                                      <div className="flex items-center gap-2.5 self-end md:self-center">
                                        <button
                                          type="button"
                                          disabled={savingUpdate}
                                          onClick={() => handleSaveUpdate(true)}
                                          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
                                        >
                                          บันทึกฉบับร่าง (Save Draft)
                                        </button>
                                        <button
                                          type="button"
                                          disabled={savingUpdate}
                                          onClick={() => handleSaveUpdate(false)}
                                          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                          {savingUpdate ? (
                                            <>
                                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                              <span>กำลังบันทึก...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Save className="w-3.5 h-3.5" />
                                              <span>บันทึก Snapshot ใหม่</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Feedback messages */}
                                    {updateError && (
                                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{updateError}</span>
                                      </div>
                                    )}
                                    {updateSuccess && (
                                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span>{updateSuccess}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
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
      {/* MODAL: VIEW HISTORY TIMELINE                                              */}
      {/* ========================================================================= */}
      {historyModalAd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    ประวัติ Snapshot ผลโฆษณา: {historyModalAd.adId}
                  </h3>
                  <p className="text-xs text-slate-500">{historyModalAd.adName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalAd(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                  <span>กำลังโหลดประวัติ Snapshot...</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  ไม่พบประวัติ Snapshot ก่อนหน้า
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords.map((snap, idx) => {
                    const isCorrection = snap.updateType === 'Correction'
                    return (
                      <div
                        key={snap.id || snap.snapshotId || idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isCorrection
                            ? 'bg-amber-50/50 border-amber-200'
                            : idx === 0
                            ? 'bg-rose-50/30 border-rose-200 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {snap.snapshotId}
                            </span>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                                ล่าสุด
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCorrection ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {snap.updateType === 'Correction' ? 'แก้ไขย้อนหลัง (Correction)' : 'อัปเดตปกติ (Regular Update)'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              บันทึกโดย: {snap.enteredBy}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            {new Date(snap.capturedAt).toLocaleString('th-TH')}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">ค่าใช้จ่าย (Spend)</span>
                            <span className="font-mono font-bold text-slate-900">{formatCurrency(snap.spend)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">ข้อความ (Inbox)</span>
                            <span className="font-mono font-bold text-blue-600">{formatNum(snap.messageInbox)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">การเข้าถึง (Reach)</span>
                            <span className="font-mono text-slate-700">{formatNum(snap.reach)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">การมองเห็น (Imp)</span>
                            <span className="font-mono text-slate-700">{formatNum(snap.impressions)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">คลิก (Clicks)</span>
                            <span className="font-mono text-slate-700">{formatNum(snap.clicks)}</span>
                          </div>
                        </div>

                        {snap.notes && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                            <strong>หมายเหตุ:</strong> {snap.notes}
                          </div>
                        )}

                        {snap.correctionReason && (
                          <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-amber-800">
                            <strong>เหตุผลการแก้ไข (Correction Reason):</strong> {snap.correctionReason}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalAd(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                ปิด (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK UPDATE RESULTS                                                */}
      {/* ========================================================================= */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <RefreshCw className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Bulk Update Results — อัปเดตผลสะสมพร้อมกันหลายรายการ
                  </h3>
                  <p className="text-xs text-slate-500">
                    กรอกตัวเลขสะสมล่าสุดของแต่ละโฆษณา ระบบจะสร้าง Snapshot แยกเป็นรายตัวให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Settings */}
            <div className="px-6 py-3 bg-rose-50/40 border-b border-rose-100 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Data as of (วัน-เวลาที่ดึงข้อมูล):</span>
                <input
                  type="datetime-local"
                  value={bulkDataAsOf}
                  onChange={e => setBulkDataAsOf(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="หมายเหตุสำหรับการอัปเดตชุดนี้ (ไม่บังคับ เช่น อัปเดตรอบเช้า)..."
                  value={bulkNotes}
                  onChange={e => setBulkNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Modal Content Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">รหัส Ads / ชื่อโฆษณา</th>
                    <th className="px-3 py-2.5 text-right">ค่าใช้จ่ายสะสม (฿)</th>
                    <th className="px-3 py-2.5 text-right">ข้อความทักสะสม</th>
                    <th className="px-3 py-2.5 text-right">การเข้าถึงสะสม</th>
                    <th className="px-3 py-2.5 text-right">การมองเห็นสะสม</th>
                    <th className="px-3 py-2.5 text-right">คลิกสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAds.map(ad => {
                    const row = bulkFormRows[ad.adId] || { spend: '', messageInbox: '', reach: '', impressions: '', clicks: '' }
                    return (
                      <tr key={ad.adId} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900 font-mono text-xs">{ad.adId}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{ad.adName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="any"
                            value={row.spend}
                            onChange={e => {
                              const val = e.target.value
                              setBulkFormRows(prev => ({
                                ...prev,
                                [ad.adId]: { ...prev[ad.adId], spend: val }
                              }))
                            }}
                            className="w-28 text-right font-mono font-bold border border-slate-300 rounded-md px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="1"
                            value={row.messageInbox}
                            onChange={e => {
                              const val = e.target.value
                              setBulkFormRows(prev => ({
                                ...prev,
                                [ad.adId]: { ...prev[ad.adId], messageInbox: val }
                              }))
                            }}
                            className="w-24 text-right font-mono border border-slate-300 rounded-md px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="1"
                            value={row.reach}
                            onChange={e => {
                              const val = e.target.value
                              setBulkFormRows(prev => ({
                                ...prev,
                                [ad.adId]: { ...prev[ad.adId], reach: val }
                              }))
                            }}
                            className="w-24 text-right font-mono border border-slate-300 rounded-md px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="1"
                            value={row.impressions}
                            onChange={e => {
                              const val = e.target.value
                              setBulkFormRows(prev => ({
                                ...prev,
                                [ad.adId]: { ...prev[ad.adId], impressions: val }
                              }))
                            }}
                            className="w-24 text-right font-mono border border-slate-300 rounded-md px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            step="1"
                            value={row.clicks}
                            onChange={e => {
                              const val = e.target.value
                              setBulkFormRows(prev => ({
                                ...prev,
                                [ad.adId]: { ...prev[ad.adId], clicks: val }
                              }))
                            }}
                            className="w-20 text-right font-mono border border-slate-300 rounded-md px-2 py-1 text-xs"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {bulkError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                พร้อมบันทึก {filteredAds.length} รายการ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="button"
                  disabled={savingBulk}
                  onClick={handleSaveBulkUpdates}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-rose-500/20 active:scale-95 disabled:opacity-50"
                >
                  {savingBulk ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึกทั้งหมด...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>บันทึกทั้งหมด (Save All Updates)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
              onError={(e: any) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
