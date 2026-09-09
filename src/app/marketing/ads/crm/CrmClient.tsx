'use client'

import React, { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ActiveAdCrmItem,
  CrmResultSnapshot,
  saveCrmSnapshot,
  saveBulkCrmSnapshots,
  getCrmAdHistory
} from '@/app/actions/ads-crm'
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
  ChevronLeft,
  ChevronRight,
  History,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Layers,
  Save,
  X,
  RefreshCw,
  Info,
  ShieldAlert,
  ArrowUpRight,
  SlidersHorizontal,
  RotateCcw,
  Radio,
  Activity,
  FileText,
  UserCheck,
  CalendarCheck,
  Award,
  Sparkles,
  Play,
  Video
} from 'lucide-react'

interface CrmClientProps {
  initialActiveAds: ActiveAdCrmItem[]
  campaigns: any[]
  channels: any[]
  products: any[]
  initialData?: any
  initialSummary?: any
  currentUser: {
    name: string
    role: string
  }
}

export default function CrmClient({
  initialActiveAds,
  campaigns,
  channels,
  currentUser
}: CrmClientProps) {
  const router = useRouter()

  // Main Ads & Snapshot state
  const [ads, setAds] = useState<ActiveAdCrmItem[]>(initialActiveAds)

  // Filters
  const [reportingPeriod, setReportingPeriod] = useState<string>('01-31 Aug 2026')
  const [dateFrom, setDateFrom] = useState<string>('2026-08-01')
  const [dateTo, setDateTo] = useState<string>('2026-08-31')
  const [filterChannel, setFilterChannel] = useState<string>('All')
  const [filterCampaign, setFilterCampaign] = useState<string>('All')
  const [filterAdSet, setFilterAdSet] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('Active')
  const [filterCrmStatus, setFilterCrmStatus] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [groupByCampaign, setGroupByCampaign] = useState<boolean>(false)

  // Expanded Ad row for inline Update Results
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null)

  // Inline Update Form state
  const [formValues, setFormValues] = useState<{
    dataAsOf: string
    leads: string
    qualifiedLeads: string
    appointments: string
    quotations: string
    closedSales: string
    sale: string
    updateType: 'Regular Update' | 'Correction'
    correctionReason: string
    notes: string
  }>({
    dataAsOf: new Date().toISOString().slice(0, 16),
    leads: '',
    qualifiedLeads: '',
    appointments: '',
    quotations: '',
    closedSales: '',
    sale: '',
    updateType: 'Regular Update',
    correctionReason: '',
    notes: ''
  })

  const [savingUpdate, setSavingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  // Modals state
  const [historyModalAd, setHistoryModalAd] = useState<ActiveAdCrmItem | null>(null)
  const [historyRecords, setHistoryRecords] = useState<CrmResultSnapshot[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkFormRows, setBulkFormRows] = useState<Record<string, {
    leads: string
    qualifiedLeads: string
    appointments: string
    quotations: string
    closedSales: string
    sale: string
  }>>({})
  const [bulkDataAsOf, setBulkDataAsOf] = useState<string>(new Date().toISOString().slice(0, 16))
  const [bulkNotes, setBulkNotes] = useState<string>('')
  const [savingBulk, setSavingBulk] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Channels list
  const channelList = useMemo(() => {
    const list = new Set<string>()
    ads.forEach(a => { if (a.channel) list.add(a.channel) })
    campaigns.forEach(c => { if (c.channel?.name) list.add(c.channel.name) })
    return Array.from(list)
  }, [ads, campaigns])

  // Ad Sets list
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
      if (filterCrmStatus !== 'All') {
        if (filterCrmStatus === 'Has Sale' && ad.sale <= 0) return false
        if (filterCrmStatus === 'No Sale' && ad.sale > 0) return false
        if (filterCrmStatus === 'Has Leads' && ad.leads <= 0) return false
      }

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
  }, [ads, filterChannel, filterCampaign, filterAdSet, filterStatus, filterCrmStatus, searchQuery, reportingPeriod, dateFrom, dateTo])

  // Check if any filter is active from default
  const isFilterActive =
    reportingPeriod !== '01-31 Aug 2026' ||
    filterChannel !== 'All' ||
    filterCampaign !== 'All' ||
    filterAdSet !== 'All' ||
    filterStatus !== 'Active' ||
    filterCrmStatus !== 'All' ||
    searchQuery.trim() !== ''

  const handlePeriodChange = (val: string) => {
    setReportingPeriod(val)
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${d}`

    if (val === '01-31 Aug 2026') {
      setDateFrom('2026-08-01')
      setDateTo('2026-08-31')
    } else if (val === '01-30 Sep 2026') {
      setDateFrom('2026-09-01')
      setDateTo('2026-09-30')
    } else if (val === 'This Month') {
      setDateFrom(`${y}-${m}-01`)
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
      setDateTo(`${y}-${m}-${String(lastDay).padStart(2, '0')}`)
    } else if (val === 'Last Month') {
      const prevM = new Date(y, now.getMonth() - 1, 1)
      const prevMStr = String(prevM.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(prevM.getFullYear(), prevM.getMonth() + 1, 0).getDate()
      setDateFrom(`${prevM.getFullYear()}-${prevMStr}-01`)
      setDateTo(`${prevM.getFullYear()}-${prevMStr}-${String(lastDay).padStart(2, '0')}`)
    } else if (val === 'Last 7 Days') {
      const prev = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      setDateFrom(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`)
      setDateTo(todayStr)
    } else if (val === 'All Time') {
      setDateFrom('')
      setDateTo('')
    } else if (val === 'Custom') {
      if (!dateFrom) setDateFrom('2026-08-01')
      if (!dateTo) setDateTo('2026-08-31')
    }
  }

  const handleResetFilters = () => {
    setReportingPeriod('01-31 Aug 2026')
    setDateFrom('2026-08-01')
    setDateTo('2026-08-31')
    setFilterChannel('All')
    setFilterCampaign('All')
    setFilterAdSet('All')
    setFilterStatus('Active')
    setFilterCrmStatus('All')
    setSearchQuery('')
  }

  // Group by Campaign if toggled
  const groupedAds = useMemo(() => {
    if (!groupByCampaign) return { 'All Ads': filteredAds }
    const map: Record<string, ActiveAdCrmItem[]> = {}
    filteredAds.forEach(ad => {
      const key = `${ad.campaignName} (${ad.campaignId})`
      if (!map[key]) map[key] = []
      map[key].push(ad)
    })
    return map
  }, [filteredAds, groupByCampaign])

  // Overall Funnel Summary Metrics
  const summary = useMemo(() => {
    let totalSpend = 0
    let totalInbox = 0
    let totalLeads = 0
    let totalQualified = 0
    let totalAppointments = 0
    let totalQuotations = 0
    let totalClosedSales = 0
    let totalSale = 0

    filteredAds.forEach(a => {
      totalSpend += a.spend || 0
      totalInbox += a.messageInbox || 0
      totalLeads += a.leads || 0
      totalQualified += a.qualifiedLeads || 0
      totalAppointments += a.appointments || 0
      totalQuotations += a.quotations || 0
      totalClosedSales += a.closedSales || 0
      totalSale += a.sale || 0
    })

    const overallRoi = totalSpend > 0 ? ((totalSale - totalSpend) / totalSpend) * 100 : null
    const leadRate = totalInbox > 0 ? (totalLeads / totalInbox) * 100 : null
    const qualifiedRate = totalLeads > 0 ? (totalQualified / totalLeads) * 100 : null
    const appointmentRate = totalQualified > 0 ? (totalAppointments / totalQualified) * 100 : null
    const quotationRate = totalAppointments > 0 ? (totalQuotations / totalAppointments) * 100 : null
    const closeRate = totalQuotations > 0 ? (totalClosedSales / totalQuotations) * 100 : null

    return {
      totalSpend,
      totalInbox,
      totalLeads,
      totalQualified,
      totalAppointments,
      totalQuotations,
      totalClosedSales,
      totalSale,
      overallRoi,
      leadRate,
      qualifiedRate,
      appointmentRate,
      quotationRate,
      closeRate
    }
  }, [filteredAds])

  // Active expanded ad item
  const activeExpandedAd = useMemo(() => {
    if (!expandedAdId) return null
    return ads.find(a => a.adId === expandedAdId) || null
  }, [expandedAdId, ads])

  // Handle open inline form
  const handleToggleExpand = (ad: ActiveAdCrmItem) => {
    if (expandedAdId === ad.adId) {
      setExpandedAdId(null)
      return
    }

    setExpandedAdId(ad.adId)
    setUpdateError(null)
    setUpdateSuccess(null)

    // Prepopulate form values from latest snapshot or existing ad figures
    setFormValues({
      dataAsOf: new Date().toISOString().slice(0, 16),
      leads: ad.leads > 0 ? String(ad.leads) : '',
      qualifiedLeads: ad.qualifiedLeads > 0 ? String(ad.qualifiedLeads) : '',
      appointments: ad.appointments > 0 ? String(ad.appointments) : '',
      quotations: ad.quotations > 0 ? String(ad.quotations) : '',
      closedSales: ad.closedSales > 0 ? String(ad.closedSales) : '',
      sale: ad.sale > 0 ? String(ad.sale) : '',
      updateType: 'Regular Update',
      correctionReason: '',
      notes: ad.notes || ''
    })
  }

  // Calculate live preview metrics for the expanded row
  const liveCalculations = useMemo(() => {
    if (!activeExpandedAd) return null

    const spend = activeExpandedAd.spend || 0
    const inbox = activeExpandedAd.messageInbox || 0

    const leads = formValues.leads !== '' ? Number(formValues.leads) : 0
    const qualified = formValues.qualifiedLeads !== '' ? Number(formValues.qualifiedLeads) : 0
    const appointments = formValues.appointments !== '' ? Number(formValues.appointments) : 0
    const quotations = formValues.quotations !== '' ? Number(formValues.quotations) : 0
    const closedSales = formValues.closedSales !== '' ? Number(formValues.closedSales) : 0
    const sale = formValues.sale !== '' ? Number(formValues.sale) : 0

    const prevLeads = activeExpandedAd.leads || 0
    const prevQualified = activeExpandedAd.qualifiedLeads || 0
    const prevAppointments = activeExpandedAd.appointments || 0
    const prevQuotations = activeExpandedAd.quotations || 0
    const prevClosedSales = activeExpandedAd.closedSales || 0
    const prevSale = activeExpandedAd.sale || 0

    // Auto calculated rates
    const leadConversionRate = inbox > 0 ? (leads / inbox) * 100 : null
    const qualifiedRate = leads > 0 ? (qualified / leads) * 100 : null
    const quotationCloseRate = quotations > 0 ? (closedSales / quotations) * 100 : null
    const costPerLead = leads > 0 ? spend / leads : null
    const costPerSale = closedSales > 0 ? spend / closedSales : null
    const roi = spend > 0 ? ((sale - spend) / spend) * 100 : null

    // Check if any value decreased (triggers Safeguard warning)
    const isDecrease =
      (formValues.leads !== '' && leads < prevLeads) ||
      (formValues.qualifiedLeads !== '' && qualified < prevQualified) ||
      (formValues.appointments !== '' && appointments < prevAppointments) ||
      (formValues.quotations !== '' && quotations < prevQuotations) ||
      (formValues.closedSales !== '' && closedSales < prevClosedSales) ||
      (formValues.sale !== '' && sale < prevSale)

    return {
      spend,
      inbox,
      leads,
      qualified,
      appointments,
      quotations,
      closedSales,
      sale,
      prevLeads,
      prevQualified,
      prevAppointments,
      prevQuotations,
      prevClosedSales,
      prevSale,
      leadConversionRate,
      qualifiedRate,
      quotationCloseRate,
      costPerLead,
      costPerSale,
      roi,
      isDecrease
    }
  }, [activeExpandedAd, formValues])

  // Save Inline CRM Snapshot
  const handleSaveUpdate = async (status: 'SAVED' | 'DRAFT' = 'SAVED') => {
    if (!activeExpandedAd) return

    setSavingUpdate(true)
    setUpdateError(null)
    setUpdateSuccess(null)

    try {
      // Validate safeguard: if decreased and not Correction, require reason
      if (liveCalculations?.isDecrease && formValues.updateType !== 'Correction') {
        setUpdateError('ตัวเลขสะสมลดลงจากค่าก่อนหน้า กรุณาเลือกประเภท "แก้ไขย้อนหลัง (Correction)" และระบุเหตุผลการแก้ไข')
        setSavingUpdate(false)
        return
      }

      if (formValues.updateType === 'Correction' && !formValues.correctionReason.trim()) {
        setUpdateError('กรุณาระบุเหตุผลการแก้ไข (Correction Reason) สำหรับการบันทึกแบบ Correction')
        setSavingUpdate(false)
        return
      }

      const res = await saveCrmSnapshot({
        adId: activeExpandedAd.adId,
        adName: activeExpandedAd.adName,
        campaignId: activeExpandedAd.campaignId,
        campaignName: activeExpandedAd.campaignName,
        adSetId: activeExpandedAd.adSetId,
        adSetName: activeExpandedAd.adSetName,
        creativeFile: activeExpandedAd.creativeFile,
        creativeVersion: activeExpandedAd.creativeVersion,
        creativeUrl: activeExpandedAd.creativeUrl,
        dataAsOf: formValues.dataAsOf,
        spend: activeExpandedAd.spend,
        messageInbox: activeExpandedAd.messageInbox,
        leads: Number(formValues.leads || 0),
        qualifiedLeads: Number(formValues.qualifiedLeads || 0),
        appointments: Number(formValues.appointments || 0),
        quotations: Number(formValues.quotations || 0),
        closedSales: Number(formValues.closedSales || 0),
        sale: Number(formValues.sale || 0),
        notes: formValues.notes,
        updateType: formValues.updateType,
        correctionReason: formValues.correctionReason,
        status
      })

      if (!res.success) {
        setUpdateError(res.error || 'Failed to save CRM snapshot')
        setSavingUpdate(false)
        return
      }

      // Optimistically update local ads array
      const snap = res.snapshot!
      setAds(prev =>
        prev.map(item => {
          if (item.adId !== activeExpandedAd.adId) return item

          const currentSpend = item.spend
          const currentInbox = item.messageInbox
          const currentLeads = snap.leads
          const currentQualified = snap.qualifiedLeads
          const currentAppointments = snap.appointments
          const currentQuotations = snap.quotations
          const currentClosedSales = snap.closedSales
          const currentSale = snap.sale

          return {
            ...item,
            leads: currentLeads,
            qualifiedLeads: currentQualified,
            appointments: currentAppointments,
            quotations: currentQuotations,
            closedSales: currentClosedSales,
            sale: currentSale,
            notes: snap.notes || '',
            lastUpdated: snap.capturedAt,
            latestSnapshot: snap,
            previousSnapshot: item.latestSnapshot,
            leadRate: currentInbox > 0 ? (currentLeads / currentInbox) * 100 : null,
            qualifiedRate: currentLeads > 0 ? (currentQualified / currentLeads) * 100 : null,
            quotationCloseRate: currentQuotations > 0 ? (currentClosedSales / currentQuotations) * 100 : null,
            costPerLead: currentLeads > 0 ? currentSpend / currentLeads : null,
            costPerSale: currentClosedSales > 0 ? currentSpend / currentClosedSales : null,
            roi: currentSpend > 0 ? ((currentSale - currentSpend) / currentSpend) * 100 : null,
            deltaLeads: currentLeads - (item.latestSnapshot?.leads || 0),
            deltaQualified: currentQualified - (item.latestSnapshot?.qualifiedLeads || 0),
            deltaAppointments: currentAppointments - (item.latestSnapshot?.appointments || 0),
            deltaQuotations: currentQuotations - (item.latestSnapshot?.quotations || 0),
            deltaClosedSales: currentClosedSales - (item.latestSnapshot?.closedSales || 0),
            deltaSale: currentSale - (item.latestSnapshot?.sale || 0)
          }
        })
      )

      setUpdateSuccess(`บันทึก Snapshot สำเร็จ: ${snap.snapshotId}`)
      setTimeout(() => {
        setExpandedAdId(null)
      }, 1500)
    } catch (err: any) {
      setUpdateError(err.message || 'An error occurred')
    } finally {
      setSavingUpdate(false)
    }
  }

  // Handle open history modal
  const handleOpenHistory = async (ad: ActiveAdCrmItem) => {
    setHistoryModalAd(ad)
    setLoadingHistory(true)
    try {
      const records = await getCrmAdHistory(ad.adId)
      setHistoryRecords(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Handle open bulk modal
  const handleOpenBulkModal = () => {
    const initialRows: Record<string, {
      leads: string
      qualifiedLeads: string
      appointments: string
      quotations: string
      closedSales: string
      sale: string
    }> = {}

    ads.forEach(ad => {
      initialRows[ad.adId] = {
        leads: ad.leads > 0 ? String(ad.leads) : '',
        qualifiedLeads: ad.qualifiedLeads > 0 ? String(ad.qualifiedLeads) : '',
        appointments: ad.appointments > 0 ? String(ad.appointments) : '',
        quotations: ad.quotations > 0 ? String(ad.quotations) : '',
        closedSales: ad.closedSales > 0 ? String(ad.closedSales) : '',
        sale: ad.sale > 0 ? String(ad.sale) : ''
      }
    })

    setBulkFormRows(initialRows)
    setBulkDataAsOf(new Date().toISOString().slice(0, 16))
    setBulkNotes('')
    setBulkError(null)
    setBulkModalOpen(true)
  }

  // Handle save bulk modal
  const handleSaveBulk = async () => {
    setSavingBulk(true)
    setBulkError(null)

    try {
      const updates = ads.map(ad => {
        const row = bulkFormRows[ad.adId] || {
          leads: '',
          qualifiedLeads: '',
          appointments: '',
          quotations: '',
          closedSales: '',
          sale: ''
        }
        return {
          adId: ad.adId,
          adName: ad.adName,
          campaignId: ad.campaignId,
          campaignName: ad.campaignName,
          adSetId: ad.adSetId,
          adSetName: ad.adSetName,
          creativeFile: ad.creativeFile,
          creativeVersion: ad.creativeVersion,
          creativeUrl: ad.creativeUrl,
          dataAsOf: bulkDataAsOf,
          spend: ad.spend,
          messageInbox: ad.messageInbox,
          leads: Number(row.leads || 0),
          qualifiedLeads: Number(row.qualifiedLeads || 0),
          appointments: Number(row.appointments || 0),
          quotations: Number(row.quotations || 0),
          closedSales: Number(row.closedSales || 0),
          sale: Number(row.sale || 0),
          notes: bulkNotes
        }
      })

      const res = await saveBulkCrmSnapshots(updates)
      if (!res.success) {
        setBulkError(res.error || 'Failed to save bulk CRM updates')
        setSavingBulk(false)
        return
      }

      // Refresh page state to fetch latest
      router.refresh()
      setBulkModalOpen(false)
    } catch (err: any) {
      setBulkError(err.message || 'Error saving bulk CRM updates')
    } finally {
      setSavingBulk(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Creative File',
      'Version',
      'Format',
      'Campaign',
      'Ad Set',
      'Ads Name',
      'Ads ID',
      'Status',
      'Spend (THB)',
      'Message Inbox',
      'Leads',
      'Qualified Leads',
      'Appointments',
      'Quotations',
      'Closed Sales',
      'Sale (THB)',
      'Lead Rate (%)',
      'Cost per Lead (THB)',
      'Cost per Sale (THB)',
      'ROI (%)',
      'Last Updated'
    ]

    const rows = filteredAds.map(ad => [
      `"${ad.creativeFile || ''}"`,
      `"${ad.creativeVersion || 'V1'}"`,
      `"${ad.format || 'Image'}"`,
      `"${ad.campaignName || ''}"`,
      `"${ad.adSetName || ''}"`,
      `"${ad.adName || ''}"`,
      `"${ad.adId}"`,
      `"${ad.status}"`,
      ad.spend || 0,
      ad.messageInbox || 0,
      ad.leads || 0,
      ad.qualifiedLeads || 0,
      ad.appointments || 0,
      ad.quotations || 0,
      ad.closedSales || 0,
      ad.sale || 0,
      ad.leadRate !== null ? ad.leadRate.toFixed(2) : '',
      ad.costPerLead !== null ? ad.costPerLead.toFixed(2) : '',
      ad.costPerSale !== null ? ad.costPerSale.toFixed(2) : '',
      ad.roi !== null ? ad.roi.toFixed(2) : '',
      `"${ad.lastUpdated || ''}"`
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `TERA_Ads_CRM_Results_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Formatters
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—'
    return `฿${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatDecimalCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—'
    return `฿${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—'
    return Number(val).toLocaleString('en-US')
  }

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—'
    return `${Number(val).toFixed(2)}%`
  }

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'ยังไม่อัปเดต'
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  // Horizontal Table Scroll Handler
  const tableRef = useRef<HTMLDivElement>(null)
  const handleScrollTable = (direction: 'left' | 'right') => {
    if (tableRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380
      tableRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Symmetrical Creative Thumbnail Renderer with Video Support & Reliable Fallback
  const renderCreativeThumbnail = (
    creativeUrl?: string,
    creativeFile?: string,
    format?: string,
    size: 'sm' | 'md' = 'sm'
  ) => {
    const isVideo = format === 'Video' || creativeFile?.toLowerCase().endsWith('.mp4')
    const dimClass = size === 'sm' ? 'w-12 h-12 rounded-xl' : 'w-16 h-16 rounded-xl'

    if (isVideo) {
      return (
        <div
          className={`${dimClass} bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 border border-slate-700/80 overflow-hidden relative shrink-0 cursor-pointer group-hover:border-rose-400 transition-all flex flex-col items-center justify-center shadow-xs text-white select-none`}
          onClick={() => setPreviewImage(creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')}
          title="คลิกเพื่อดูวิดีโอตัวอย่าง"
        >
          <div className="w-5 h-5 rounded-full bg-rose-600/90 flex items-center justify-center shadow-sm">
            <Play className="w-2.5 h-2.5 fill-white text-white translate-x-0.5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-rose-300 mt-1">
            VIDEO
          </span>
        </div>
      )
    }

    return (
      <div
        className={`${dimClass} bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 cursor-pointer group-hover:border-rose-300 transition-all flex items-center justify-center shadow-2xs`}
        onClick={() => setPreviewImage(creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg')}
        title="คลิกเพื่อดูรูปขนาดเต็ม"
      >
        <img
          src={creativeUrl || '/uploads/creatives/SP_WaterStrong_V1.jpg'}
          alt={creativeFile || 'Creative'}
          className="w-full h-full object-cover"
          onError={(e: any) => {
            e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
          }}
        />
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Eye className="w-4 h-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* ========================================================================= */}
      {/* STICKY TOP HEADER & NAVIGATION BAR                                        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
            {/* Title & Breadcrumb in Thai */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  ระบบการตลาด (Marketing)
                </span>
                <span className="text-xs text-slate-400">/</span>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  ระบบจัดการข้อมูลโฆษณา TERA
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    ส่วนที่ 3: ผลลัพธ์ CRM
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบรายงานและบันทึกผลการขายตามโฆษณา (CRM Results &amp; Sales Attribution)
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
              <Link
                href="/marketing/ads/performance"
                title="ส่วนที่ 2: ผลการโฆษณา (Ads Performance)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center text-[10px] font-medium">2</span>
                <span>ผลการโฆษณา</span>
              </Link>
              <div
                title="ส่วนที่ 3: ผลลัพธ์ CRM (CRM Results)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-600 shadow-sm border border-slate-200/60 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px] font-bold border border-rose-100">3</span>
                <span>ผลลัพธ์ CRM</span>
              </div>
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
        {/* SECTION A: CRM RESULTS FILTERS & CONTROLS                                 */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  ตัวกรองและควบคุมผลลัพธ์ CRM (CRM Results Filters &amp; Controls)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกช่วงเวลาและตัวกรองเพื่อดูรายการโฆษณาและบันทึกผลลัพธ์การติดต่อจากลูกค้า (CRM Attribution)
                </p>
              </div>
            </div>

            {/* Symmetrical Action Buttons Toolbar */}
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

              {/* Bulk Update CRM Results button */}
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all shadow-sm hover:shadow-rose-500/20 active:scale-95 shrink-0"
                title="อัปเดตผลลัพธ์ CRM หลายโฆษณาพร้อมกัน"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>อัปเดตผล CRM หลายรายการ</span>
              </button>

              {/* Export CSV button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all shrink-0"
                title="ส่งออกตารางข้อมูล CRM เป็นไฟล์ CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออกข้อมูล (Export)</span>
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
                {channelList.map(ch => (
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
                onChange={e => handlePeriodChange(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="01-31 Aug 2026">01-31 ส.ค. 2026 (01-31 Aug 2026)</option>
                <option value="01-30 Sep 2026">01-30 ก.ย. 2026 (01-30 Sep 2026)</option>
                <option value="This Month">เดือนนี้ (This Month)</option>
                <option value="Last Month">เดือนที่แล้ว (Last Month)</option>
                <option value="Last 7 Days">7 วันล่าสุด (Last 7 Days)</option>
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
                ดึงข้อมูลแคมเปญ, ชุดโฆษณา, ชิ้นงานสื่อ และผลการนำส่ง (<strong className="text-slate-800 font-semibold">Spend, Inbox</strong>) จากระบบโดยอัตโนมัติ ไม่ต้องกรอกซ้ำ
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
        {/* SECTION B: CRM FUNNEL OVERVIEW (8 CARDS & CHEVRON SALES FUNNEL)            */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  ภาพรวมกรวยการขาย (CRM Funnel Overview)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  สถิติตลอดกระบวนการตั้งแต่ข้อความทัก ลีด จนถึงปิดการขายและยอดขายรวม
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400">
              ค่าใช้จ่ายโฆษณารวม: <strong className="text-slate-800 font-mono">{formatCurrency(summary.totalSpend)}</strong>
            </span>
          </div>

          {/* 8 Overview Metric Cards - Symmetrical 4x2 Balanced Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ROW 1: การติดต่อและคัดกรองลีด (Lead Screening Funnel) */}
            {/* Card 1: Message Inbox */}
            <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">ข้อความทัก (Inbox)</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <MessageSquare className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono tracking-tight my-auto py-1">
                {formatNum(summary.totalInbox)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>ดึงจาก Ads Performance</span>
                <span className="text-slate-400 font-medium">100% เริ่มต้น</span>
              </div>
            </div>

            {/* Card 2: Leads */}
            <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">ลีดผู้สนใจ (Leads)</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Users className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-rose-600 font-mono tracking-tight my-auto py-1">
                {formatNum(summary.totalLeads)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>อัตราลีด (Lead Rate)</span>
                <span className="text-rose-600 font-bold font-mono">{formatPercent(summary.leadRate)}</span>
              </div>
            </div>

            {/* Card 3: Qualified Leads */}
            <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">ลีดผ่านเกณฑ์ (Qualified)</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-purple-700 font-mono tracking-tight my-auto py-1">
                {formatNum(summary.totalQualified)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>อัตราผ่านเกณฑ์</span>
                <span className="text-purple-700 font-bold font-mono">{formatPercent(summary.qualifiedRate)}</span>
              </div>
            </div>

            {/* Card 4: Appointments */}
            <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">นัดหมายสำรวจ (Appointments)</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-amber-700 font-mono tracking-tight my-auto py-1">
                {formatNum(summary.totalAppointments)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>อัตรานัดหมาย</span>
                <span className="text-amber-700 font-bold font-mono">{formatPercent(summary.appointmentRate)}</span>
              </div>
            </div>

            {/* ROW 2: การเสนอราคา ปิดการขาย ยอดขาย และ ROI (Deals & Revenue Funnel) */}
            {/* Card 5: Quotations */}
            <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">ใบเสนอราคา (Quotations)</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-indigo-700 font-mono tracking-tight my-auto py-1">
                {formatNum(summary.totalQuotations)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>อัตราเสนอราคา</span>
                <span className="text-indigo-700 font-bold font-mono">{formatPercent(summary.quotationRate)}</span>
              </div>
            </div>

            {/* Card 6: Closed Sales */}
            <div className="bg-emerald-50/50 hover:bg-white rounded-2xl p-4 border border-emerald-200/90 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">ปิดการขายสำเร็จ (Closed)</span>
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-emerald-700 font-mono tracking-tight my-auto py-1">
                {formatNum(summary.totalClosedSales)}
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center justify-between pt-1 border-t border-emerald-100">
                <span>อัตราปิดการขาย (Close Rate)</span>
                <span className="font-bold font-mono">{formatPercent(summary.closeRate)}</span>
              </div>
            </div>

            {/* Card 7: Total Sale */}
            <div className="bg-emerald-50/70 hover:bg-white rounded-2xl p-4 border border-emerald-300 hover:border-emerald-400 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-emerald-900 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">ยอดขายรวม (Total Revenue)</span>
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-black text-emerald-800 font-mono tracking-tight my-auto py-1 truncate" title={formatCurrency(summary.totalSale)}>
                {formatCurrency(summary.totalSale)}
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center justify-between pt-1 border-t border-emerald-200/60">
                <span>จากดีลปิดการขาย</span>
                <span className="font-semibold font-mono">{summary.totalClosedSales} ออเดอร์</span>
              </div>
            </div>

            {/* Card 8: Overall ROI */}
            <div className="bg-rose-50/70 hover:bg-white rounded-2xl p-4 border border-rose-300 hover:border-rose-400 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between text-rose-900 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">ผลตอบแทนโฆษณา (ROI)</span>
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              </div>
              <div className="text-xl font-black text-rose-700 font-mono tracking-tight my-auto py-1">
                {formatPercent(summary.overallRoi)}
              </div>
              <div className="text-[11px] text-rose-800 flex items-center justify-between pt-1 border-t border-rose-200/60">
                <span>สูตรความคุ้มค่า</span>
                <span className="font-bold text-emerald-700 text-[10px]">(Sale−Spend)÷Spend</span>
              </div>
            </div>
          </div>

          {/* Visual Sales Funnel Bar (Gradient Chevron Pipeline) */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>เส้นทางอัตราการแปลง (Conversion Pipeline Stages)</span>
              </span>
              <span className="text-[10px] text-slate-400">อัตราแปลงระหว่างขั้นตอนคำนวณอัตโนมัติ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Stage 1: Messages */}
              <div className="bg-rose-900 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-200">1. ข้อความทัก</div>
                <div className="text-base font-black font-mono my-0.5">{formatNum(summary.totalInbox)}</div>
                <div className="text-[10px] text-rose-300">100% สตาร์ท</div>
              </div>

              {/* Stage 2: Leads */}
              <div className="bg-rose-800 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-200">2. ลีด (Leads)</div>
                <div className="text-base font-black font-mono my-0.5">{formatNum(summary.totalLeads)}</div>
                <div className="text-[10px] text-rose-200 font-semibold">{formatPercent(summary.leadRate)} จากข้อความ</div>
              </div>

              {/* Stage 3: Qualified */}
              <div className="bg-rose-700 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-100">3. ลีดผ่านเกณฑ์</div>
                <div className="text-base font-black font-mono my-0.5">{formatNum(summary.totalQualified)}</div>
                <div className="text-[10px] text-rose-100 font-semibold">{formatPercent(summary.qualifiedRate)} จากลีด</div>
              </div>

              {/* Stage 4: Appointments */}
              <div className="bg-rose-600 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-100">4. นัดหมายสำรวจ</div>
                <div className="text-base font-black font-mono my-0.5">{formatNum(summary.totalAppointments)}</div>
                <div className="text-[10px] text-rose-100 font-semibold">{formatPercent(summary.appointmentRate)} จากผ่านเกณฑ์</div>
              </div>

              {/* Stage 5: Quotations */}
              <div className="bg-rose-500 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-50">5. เสนอราคา</div>
                <div className="text-base font-black font-mono my-0.5">{formatNum(summary.totalQuotations)}</div>
                <div className="text-[10px] text-rose-50 font-semibold">{formatPercent(summary.quotationRate)} จากนัดหมาย</div>
              </div>

              {/* Stage 6: Closed Sales */}
              <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">6. ปิดการขาย</div>
                <div className="text-base font-black font-mono my-0.5">{formatNum(summary.totalClosedSales)}</div>
                <div className="text-[10px] text-emerald-100 font-semibold">{formatPercent(summary.closeRate)} ชนะดีล</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION C: CRM RESULTS BY ADS TABLE                                       */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Table Header Controls */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  ผลลัพธ์ CRM และการสร้างยอดขายตามโฆษณา (CRM Results by Ads) ({filteredAds.length} รายการ)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิก <strong className="text-rose-600 font-semibold">&quot;อัปเดตผล CRM (Update CRM Results)&quot;</strong> ในแต่ละรายการเพื่อบันทึกตัวเลขสะสมล่าสุด
                </p>
              </div>
            </div>

            {/* Symmetrical Inline Controls */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* Group by Campaign Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-white px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs h-9">
                <input
                  type="checkbox"
                  checked={groupByCampaign}
                  onChange={e => setGroupByCampaign(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span>จัดกลุ่มตามแคมเปญ</span>
              </label>

              {/* CRM Status Filter */}
              <select
                value={filterCrmStatus}
                onChange={e => setFilterCrmStatus(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none shadow-2xs h-9 cursor-pointer"
              >
                <option value="All">ทุกสถานะ CRM (All Status)</option>
                <option value="Has Sale">มียอดขายแล้ว (Has Sale)</option>
                <option value="Has Leads">มีลีดติดต่อ (Has Leads)</option>
                <option value="No Sale">ยังไม่มียอดขาย (No Sale)</option>
              </select>

              {/* Quick count pill */}
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs h-9">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{filteredAds.length} โฆษณาที่ใช้งาน</span>
              </span>
            </div>
          </div>

          {/* Symmetrical Horizontal Scroll Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-medium text-slate-700">
                ตารางแสดงผลกระบวนการขาย CRM รวม 16 คอลัมน์ (ตั้งแต่สื่อโฆษณา จนถึงปิดการขายและผลตอบแทน ROI)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="text-[11px] text-slate-400 font-medium">เลื่อนดูคอลัมน์:</span>
              <button
                type="button"
                onClick={() => handleScrollTable('left')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                title="เลื่อนตารางไปทางซ้าย"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>เลื่อนซ้าย</span>
              </button>
              <button
                type="button"
                onClick={() => handleScrollTable('right')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                title="เลื่อนตารางไปทางขวา"
              >
                <span>เลื่อนขวา</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div ref={tableRef} className="overflow-x-auto scroll-smooth">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
                {/* Row 1: High-level Category Grouping */}
                <tr className="border-b border-slate-200/80 bg-slate-100/60 text-[10px] font-bold text-slate-500 tracking-wider">
                  <th colSpan={3} className="px-4 py-2 border-r border-slate-200/80 text-left">
                    1. ข้อมูลชิ้นงานและแคมเปญ (CREATIVE &amp; AD IDENTITY)
                  </th>
                  <th colSpan={2} className="px-3 py-2 border-r border-rose-200/60 bg-rose-50/50 text-rose-800 text-center">
                    2. ผลนำส่งโฆษณา (ADS DELIVERY)
                  </th>
                  <th colSpan={6} className="px-3 py-2 border-r border-blue-200/60 bg-blue-50/40 text-blue-900 text-center">
                    3. กระบวนการขาย CRM (CRM SALES PIPELINE: LEADS TO DEALS)
                  </th>
                  <th colSpan={3} className="px-3 py-2 border-r border-amber-200/60 bg-amber-50/40 text-amber-900 text-center">
                    4. อัตราผลตอบแทน (UNIT ECONOMICS &amp; ROI)
                  </th>
                  <th className="px-3 py-2 border-r border-slate-200/80 text-center">
                    5. อัปเดต
                  </th>
                  <th className="px-4 py-2 text-center sticky right-0 z-20 bg-slate-100 border-l-2 border-slate-200 shadow-[-6px_0_12px_rgba(0,0,0,0.06)]">
                    6. จัดการ
                  </th>
                </tr>

                {/* Row 2: Specific Columns */}
                <tr className="bg-slate-50 text-slate-600 font-bold">
                  <th className="px-4 py-3 min-w-[210px]">ชิ้นงานสื่อ (Creative)</th>
                  <th className="px-4 py-3 min-w-[190px]">แคมเปญ / ชุดโฆษณา</th>
                  <th className="px-4 py-3 min-w-[180px] border-r border-slate-200/80">ชื่อโฆษณา / รหัส Ads</th>

                  <th className="px-3.5 py-3 text-right bg-rose-50/40 text-rose-900 min-w-[110px]">
                    ค่าใช้จ่าย (Spend)
                  </th>
                  <th className="px-3.5 py-3 text-right bg-rose-50/40 text-rose-900 min-w-[95px] border-r border-rose-200/60">
                    ข้อความ (Inbox)
                  </th>

                  <th className="px-3 py-3 text-right min-w-[90px] bg-slate-50">ลีด (Leads)</th>
                  <th className="px-3 py-3 text-right min-w-[90px]">ผ่านเกณฑ์</th>
                  <th className="px-3 py-3 text-right min-w-[90px]">นัดหมาย</th>
                  <th className="px-3 py-3 text-right min-w-[95px]">ใบเสนอราคา</th>
                  <th className="px-3 py-3 text-right min-w-[95px] bg-emerald-50/30 text-emerald-900">
                    ปิดการขาย
                  </th>
                  <th className="px-4 py-3 text-right min-w-[125px] bg-emerald-50/50 text-emerald-900 border-r border-blue-200/60">
                    ยอดขาย (Sale)
                  </th>

                  <th className="px-3 py-3 text-right min-w-[95px]">อัตราลีด (%)</th>
                  <th className="px-3 py-3 text-right min-w-[105px]">ต้นทุน/ลีด (฿)</th>
                  <th className="px-3.5 py-3 text-right min-w-[95px] text-rose-700 bg-rose-50/20 border-r border-amber-200/60">
                    ROI (%)
                  </th>

                  <th className="px-3.5 py-3 text-center min-w-[110px]">อัปเดตล่าสุด</th>
                  <th className="px-4 py-3 text-center w-[140px] min-w-[140px] sticky right-0 z-20 bg-slate-50 border-l-2 border-slate-200 shadow-[-8px_0_16px_rgba(0,0,0,0.06)]">
                    การจัดการ
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAds.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                        <span className="font-medium text-sm">ไม่พบข้อมูลผลลัพธ์ CRM ที่ตรงตามตัวกรอง</span>
                        <span className="text-xs text-slate-400">
                          ลองปรับตัวกรอง หรือคลิก &quot;จัดการโครงสร้างแคมเปญ&quot; เพื่อตรวจสอบโฆษณา
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedAds).map(([groupTitle, groupItems]) => (
                    <React.Fragment key={groupTitle}>
                      {groupByCampaign && (
                        <tr className="bg-slate-100/80 border-y border-slate-200">
                          <td colSpan={16} className="px-4 py-2 font-bold text-slate-700 text-xs flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-rose-600" />
                            <span>{groupTitle}</span>
                            <span className="text-slate-400 font-normal">({groupItems.length} โฆษณา)</span>
                          </td>
                        </tr>
                      )}

                      {groupItems.map(ad => {
                        const isExpanded = expandedAdId === ad.adId

                        return (
                          <React.Fragment key={ad.adId}>
                            <tr
                              className={`transition-colors group ${isExpanded
                                ? 'bg-rose-50/30'
                                : 'hover:bg-slate-50/80 bg-white'
                                }`}
                            >
                              {/* 1. Creative */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {renderCreativeThumbnail(ad.creativeUrl, ad.creativeFile, ad.format, 'sm')}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate max-w-[140px]" title={ad.creativeFile}>
                                      {ad.creativeFile || 'Artwork'}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                        {ad.creativeVersion || 'V1'}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {ad.format === 'Video' || ad.creativeFile?.endsWith('.mp4') ? 'วิดีโอ' : 'รูปภาพ'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Campaign / Ad Set */}
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900 truncate max-w-[170px]" title={ad.campaignName}>
                                  {ad.campaignName}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5" title={ad.adSetName}>
                                  {ad.adSetName}
                                </div>
                              </td>

                              {/* 3. Ads Name / ID */}
                              <td className="px-4 py-3 border-r border-slate-200/80">
                                <div className="font-medium text-slate-900 truncate max-w-[170px]" title={ad.adName}>
                                  {ad.adName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  {ad.adId}
                                </div>
                              </td>

                              {/* 4. Spend */}
                              <td className="px-3.5 py-3 text-right bg-rose-50/20 font-mono font-bold text-slate-900">
                                {formatCurrency(ad.spend)}
                              </td>

                              {/* 5. Message Inbox */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-blue-600 border-r border-rose-200/60">
                                {formatNum(ad.messageInbox)}
                              </td>

                              {/* 6. Leads */}
                              <td className="px-3 py-3 text-right font-mono font-bold text-slate-800 bg-slate-50/50">
                                {formatNum(ad.leads)}
                                {ad.deltaLeads !== 0 && ad.deltaLeads !== undefined && (
                                  <span className="text-[10px] text-emerald-600 block font-normal">
                                    {ad.deltaLeads > 0 ? `+${ad.deltaLeads}` : ad.deltaLeads}
                                  </span>
                                )}
                              </td>

                              {/* 7. Qualified Leads */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatNum(ad.qualifiedLeads)}
                              </td>

                              {/* 8. Appointments */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatNum(ad.appointments)}
                              </td>

                              {/* 9. Quotations */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatNum(ad.quotations)}
                              </td>

                              {/* 10. Closed Sales */}
                              <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                                {formatNum(ad.closedSales)}
                              </td>

                              {/* 11. Sale */}
                              <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/40 border-r border-blue-200/60">
                                {formatCurrency(ad.sale)}
                              </td>

                              {/* 12. Lead Rate */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatPercent(ad.leadRate)}
                              </td>

                              {/* 13. Cost per Lead */}
                              <td className="px-3 py-3 text-right font-mono text-slate-700">
                                {formatDecimalCurrency(ad.costPerLead)}
                              </td>

                              {/* 14. ROI */}
                              <td className="px-3.5 py-3 text-right font-mono font-black text-rose-700 bg-rose-50/20 border-r border-amber-200/60">
                                {formatPercent(ad.roi)}
                              </td>

                              {/* 15. Last Updated */}
                              <td className="px-3.5 py-3 text-center text-slate-500 text-[11px]">
                                {formatRelativeTime(ad.lastUpdated)}
                              </td>

                              {/* 16. Action Button - Solid Pinned Column */}
                              <td className="px-3.5 py-3 text-center w-[140px] min-w-[140px] sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors border-l-2 border-slate-200 shadow-[-8px_0_16px_rgba(0,0,0,0.06)]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpand(ad)}
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs w-full ${isExpanded
                                    ? 'bg-rose-600 text-white shadow-rose-500/20'
                                    : 'bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400'
                                    }`}
                                >
                                  <span>อัปเดตผล CRM</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* ================================================================= */}
                            {/* INLINE EXPANDABLE WORKSPACE: UPDATE CRM RESULTS (3-PANEL LAYOUT)  */}
                            {/* ================================================================= */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-y-2 border-rose-400">
                                <td colSpan={16} className="p-5">
                                  <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 space-y-5">
                                    {/* Subheader */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                          อัปเดตผลลัพธ์ CRM — {ad.adId}: {ad.adName}
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

                                    {/* 3 Panels Layout matching mockup */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                      {/* ============================================== */}
                                      {/* PANEL 1: AD METADATA & PERFORMANCE (READ-ONLY) */}
                                      {/* ============================================== */}
                                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                            ข้อมูลโฆษณาและผลนำส่ง (Metadata)
                                          </span>
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                            <Lock className="w-2.5 h-2.5" /> อ่านอย่างเดียว (Read Only)
                                          </span>
                                        </div>

                                        {/* Creative Preview */}
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                          {renderCreativeThumbnail(ad.creativeUrl, ad.creativeFile, ad.format, 'md')}
                                          <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate" title={ad.creativeFile}>
                                              {ad.creativeFile || 'ชิ้นงานสื่อโฆษณา'}
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
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 bg-rose-50/50 px-2 rounded">
                                            <span className="text-slate-600 font-medium">ค่าใช้จ่ายสะสม (Spend):</span>
                                            <span className="font-mono font-bold text-rose-700">
                                              {formatCurrency(ad.spend)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between py-1 px-2 rounded bg-blue-50/50">
                                            <span className="text-slate-600 font-medium">ข้อความสะสม (Inbox):</span>
                                            <span className="font-mono font-bold text-blue-700">
                                              {formatNum(ad.messageInbox)}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Source Indicator */}
                                        <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                                          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                          <span>
                                            ที่มา: ดึงจาก <strong>Ads Performance Snapshot</strong> ล่าสุดโดยอัตโนมัติ
                                          </span>
                                        </div>
                                      </div>

                                      {/* ============================================== */}
                                      {/* PANEL 2: LATEST CUMULATIVE CRM VALUES (INPUT)  */}
                                      {/* ============================================== */}
                                      <div className="bg-amber-50/20 rounded-xl p-4 border border-amber-200 shadow-xs space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                            ตัวเลขสะสม CRM ล่าสุด (Cumulative CRM)
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            กรอกข้อมูลจาก CRM
                                          </span>
                                        </div>

                                        {/* Date as of */}
                                        <div>
                                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Date as of (วัน-เวลาดึงข้อมูล):
                                          </label>
                                          <input
                                            type="datetime-local"
                                            value={formValues.dataAsOf}
                                            onChange={e => setFormValues(prev => ({ ...prev, dataAsOf: e.target.value }))}
                                            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:border-rose-500 outline-none"
                                          />
                                        </div>

                                        {/* Leads */}
                                        <div>
                                          <div className="flex items-center justify-between mb-0.5">
                                            <label className="text-[11px] font-semibold text-slate-700">
                                              ลีดทั้งหมด (Leads) <span className="text-rose-500">*</span>
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevLeads)}
                                            </span>
                                          </div>
                                          <input
                                            type="number"
                                            step="1"
                                            placeholder="เช่น 320"
                                            value={formValues.leads}
                                            onChange={e => setFormValues(prev => ({ ...prev, leads: e.target.value }))}
                                            className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                          />
                                        </div>

                                        {/* Qualified Leads */}
                                        <div>
                                          <div className="flex items-center justify-between mb-0.5">
                                            <label className="text-[11px] font-semibold text-slate-700">
                                              ลีดผ่านเกณฑ์ (Qualified Leads)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevQualified)}
                                            </span>
                                          </div>
                                          <input
                                            type="number"
                                            step="1"
                                            placeholder="เช่น 176"
                                            value={formValues.qualifiedLeads}
                                            onChange={e => setFormValues(prev => ({ ...prev, qualifiedLeads: e.target.value }))}
                                            className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                          />
                                        </div>

                                        {/* Appointments & Quotations 2-col */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                          <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                              <label className="text-[11px] font-semibold text-slate-700">
                                                นัดหมาย (Appt)
                                              </label>
                                            </div>
                                            <input
                                              type="number"
                                              step="1"
                                              placeholder="เช่น 54"
                                              value={formValues.appointments}
                                              onChange={e => setFormValues(prev => ({ ...prev, appointments: e.target.value }))}
                                              className="w-full text-xs font-mono bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                            />
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevAppointments)}
                                            </div>
                                          </div>

                                          <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                              <label className="text-[11px] font-semibold text-slate-700">
                                                ใบเสนอราคา
                                              </label>
                                            </div>
                                            <input
                                              type="number"
                                              step="1"
                                              placeholder="เช่น 38"
                                              value={formValues.quotations}
                                              onChange={e => setFormValues(prev => ({ ...prev, quotations: e.target.value }))}
                                              className="w-full text-xs font-mono bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                            />
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevQuotations)}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Closed Sales & Sale (฿) 2-col */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                          <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                              <label className="text-[11px] font-semibold text-slate-700">
                                                ปิดการขาย (Closed)
                                              </label>
                                            </div>
                                            <input
                                              type="number"
                                              step="1"
                                              placeholder="เช่น 12"
                                              value={formValues.closedSales}
                                              onChange={e => setFormValues(prev => ({ ...prev, closedSales: e.target.value }))}
                                              className="w-full text-xs font-mono font-bold bg-white border border-emerald-400 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                                            />
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              ก่อนหน้า: {formatNum(liveCalculations?.prevClosedSales)}
                                            </div>
                                          </div>

                                          <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                              <label className="text-[11px] font-semibold text-slate-700">
                                                ยอดขาย (Sale ฿)
                                              </label>
                                            </div>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="เช่น 540000"
                                              value={formValues.sale}
                                              onChange={e => setFormValues(prev => ({ ...prev, sale: e.target.value }))}
                                              className="w-full text-xs font-mono font-bold bg-white border border-emerald-400 rounded-lg px-3 py-1.5 text-emerald-900 focus:border-rose-500 outline-none"
                                            />
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              ก่อนหน้า: {formatCurrency(liveCalculations?.prevSale)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* ======================================================== */}
                                      {/* PANEL 3: AUTO-CALCULATED RESULTS & FORMULA GUIDE         */}
                                      {/* ======================================================== */}
                                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            คำนวณผลลัพธ์อัตโนมัติ (Calculated)
                                          </span>
                                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            คำนวณสดทันที (Live)
                                          </span>
                                        </div>

                                        {/* Metrics list with fx Auto badges */}
                                        <div className="space-y-2 text-xs">
                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600 font-medium">Lead Conversion Rate:</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-slate-900">
                                                {formatPercent(liveCalculations?.leadConversionRate)}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-mono">
                                                fx Auto
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600 font-medium">Qualified Rate:</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-slate-900">
                                                {formatPercent(liveCalculations?.qualifiedRate)}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-mono">
                                                fx Auto
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600 font-medium">Quotation Close Rate:</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-slate-900">
                                                {formatPercent(liveCalculations?.quotationCloseRate)}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-mono">
                                                fx Auto
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600 font-medium">Cost per Lead:</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-slate-900">
                                                {formatDecimalCurrency(liveCalculations?.costPerLead)}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-mono">
                                                fx Auto
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                            <span className="text-slate-600 font-medium">Cost per Sale:</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-slate-900">
                                                {formatDecimalCurrency(liveCalculations?.costPerSale)}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-mono">
                                                fx Auto
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between py-1 border-b border-slate-200 bg-rose-50/50 px-2 rounded">
                                            <span className="text-rose-900 font-bold">ผลตอบแทน ROI (%):</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-black text-rose-700 text-sm">
                                                {formatPercent(liveCalculations?.roi)}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 bg-rose-200 text-rose-800 rounded font-mono font-bold">
                                                fx Auto
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Formula Guide */}
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 space-y-1 font-mono">
                                          <div className="font-bold text-slate-600 uppercase tracking-wider mb-1">
                                            สูตรการคำนวณ (Formula Guide):
                                          </div>
                                          <div>• Lead Rate = Leads ÷ Message Inbox</div>
                                          <div>• Quotation Close Rate = Closed Sales ÷ Quotations</div>
                                          <div>• Cost per Lead = Spend ÷ Leads</div>
                                          <div>• Cost per Sale = Spend ÷ Closed Sales</div>
                                          <div>• ROI = (Sale − Spend) ÷ Spend × 100</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Safeguard Warning Banner */}
                                    {liveCalculations?.isDecrease && (
                                      <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
                                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                          <div className="font-bold">คำเตือน: ตัวเลขสะสมล่าสุดน้อยกว่าค่าก่อนหน้า (Values Decreased)</div>
                                          <div className="text-[11px] mt-0.5 text-amber-800">
                                            ระบบ Snapshot เป็นการบันทึกตัวเลขสะสม (Cumulative) หากจำเป็นต้องลดตัวเลข กรุณาเลือกประเภทเป็น &quot;แก้ไขย้อนหลัง (Correction)&quot; และระบุเหตุผลการแก้ไข
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Bottom Notes & Action Controls */}
                                    <div className="pt-2 border-t border-slate-100 space-y-3">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                          บันทึกเพิ่มเติมของทีมขาย (CRM Notes):
                                        </label>
                                        <textarea
                                          rows={2}
                                          placeholder="เช่น 12 sales closed; follow up remaining quotations..."
                                          value={formValues.notes}
                                          onChange={e => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
                                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-rose-500 outline-none"
                                        />
                                      </div>

                                      {/* If Correction selected, show reason input */}
                                      {formValues.updateType === 'Correction' && (
                                        <div>
                                          <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                                            เหตุผลการแก้ไข (Correction Reason) <span className="text-rose-500">*</span>:
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="ระบุเหตุผล เช่น ลูกค้ายกเลิกคำสั่งซื้อ หรือนับยอดซ้ำ..."
                                            value={formValues.correctionReason}
                                            onChange={e => setFormValues(prev => ({ ...prev, correctionReason: e.target.value }))}
                                            className="w-full text-xs bg-amber-50/50 border border-amber-300 rounded-lg p-2 text-slate-900 focus:bg-white outline-none"
                                          />
                                        </div>
                                      )}

                                      {/* Feedback messages */}
                                      {updateError && (
                                        <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4 shrink-0" />
                                          <span>{updateError}</span>
                                        </div>
                                      )}
                                      {updateSuccess && (
                                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                                          <span>{updateSuccess}</span>
                                        </div>
                                      )}

                                      {/* Buttons Toolbar */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                        <div className="flex items-center gap-3 text-xs">
                                          <label className="font-semibold text-slate-600">ประเภทการบันทึก:</label>
                                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                            <input
                                              type="radio"
                                              name="updateType"
                                              value="Regular Update"
                                              checked={formValues.updateType === 'Regular Update'}
                                              onChange={() => setFormValues(prev => ({ ...prev, updateType: 'Regular Update' }))}
                                              className="text-rose-600 focus:ring-rose-500"
                                            />
                                            <span>อัปเดตสะสมปกติ (Regular)</span>
                                          </label>
                                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-amber-700">
                                            <input
                                              type="radio"
                                              name="updateType"
                                              value="Correction"
                                              checked={formValues.updateType === 'Correction'}
                                              onChange={() => setFormValues(prev => ({ ...prev, updateType: 'Correction' }))}
                                              className="text-amber-600 focus:ring-amber-500"
                                            />
                                            <span>แก้ไขย้อนหลัง (Correction)</span>
                                          </label>
                                        </div>

                                        <div className="flex items-center gap-2.5 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveUpdate('DRAFT')}
                                            disabled={savingUpdate}
                                            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                                          >
                                            บันทึกเป็นแบบร่าง (Draft)
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleSaveUpdate('SAVED')}
                                            disabled={savingUpdate}
                                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50"
                                          >
                                            {savingUpdate ? (
                                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Save className="w-3.5 h-3.5" />
                                            )}
                                            <span>บันทึกอัปเดต CRM (Save CRM Update)</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
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
        </section>
      </main>

      {/* ========================================================================= */}
      {/* AUDIT HISTORY MODAL                                                       */}
      {/* ========================================================================= */}
      {historyModalAd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-600" />
                  <span>ประวัติ Snapshot CRM — {historyModalAd.adId}: {historyModalAd.adName}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ไทม์ไลน์ประวัติการบันทึกตัวเลขสะสมทั้งหมด (Audit Trail)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalAd(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังโหลดประวัติ Snapshot...</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  ไม่พบประวัติการบันทึก Snapshot ก่อนหน้า
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {historyRecords.map((rec, index) => (
                    <div key={rec.id || index} className="relative pl-6">
                      <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 bg-white ${index === 0 ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
                        }`} />

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{rec.snapshotId}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rec.updateType === 'Correction'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-50 text-rose-700'
                              }`}>
                              {rec.updateType}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[11px]">{formatRelativeTime(rec.capturedAt)}</span>
                        </div>

                        {/* CRM metrics grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs font-mono pt-2 border-t border-slate-200/60">
                          <div>
                            <span className="text-[10px] text-slate-400 block">ลีด:</span>
                            <span className="font-bold text-slate-900">{formatNum(rec.leads)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">ผ่านเกณฑ์:</span>
                            <span className="font-bold text-slate-900">{formatNum(rec.qualifiedLeads)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">นัดหมาย:</span>
                            <span className="font-bold text-slate-900">{formatNum(rec.appointments)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">เสนอราคา:</span>
                            <span className="font-bold text-slate-900">{formatNum(rec.quotations)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">ปิดการขาย:</span>
                            <span className="font-bold text-emerald-700">{formatNum(rec.closedSales)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">ยอดขาย:</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(rec.sale)}</span>
                          </div>
                        </div>

                        {rec.notes && (
                          <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                            <strong>บันทึก:</strong> {rec.notes}
                          </div>
                        )}
                        {rec.correctionReason && (
                          <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                            <strong>เหตุผลแก้ไข:</strong> {rec.correctionReason}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          บันทึกโดย: {rec.enteredBy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setHistoryModalAd(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK UPDATE CRM RESULTS MODAL                                             */}
      {/* ========================================================================= */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-rose-600" />
                  <span>อัปเดตผลลัพธ์ CRM หลายรายการ (Bulk Update CRM Results)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  กรอกตัวเลขสะสมล่าสุดสำหรับโฆษณาทั้งหมดพร้อมกัน ระบบจะสร้าง Snapshot แยกเป็นรายโฆษณา
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date as of (วัน-เวลาดึงข้อมูลทั้งหมด):
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkDataAsOf}
                    onChange={e => setBulkDataAsOf(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    บันทึกส่วนกลาง (Batch Notes):
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อัปเดตยอดขายสิ้นวัน..."
                    value={bulkNotes}
                    onChange={e => setBulkNotes(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              {bulkError && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {bulkError}
                </div>
              )}

              {/* Spreadsheet Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">โฆษณา / รหัส</th>
                      <th className="px-3 py-2.5 text-right bg-rose-50/50">ค่าใช้จ่าย (Spend)</th>
                      <th className="px-3 py-2.5 text-right">ข้อความ (Inbox)</th>
                      <th className="px-3 py-2.5 min-w-[100px]">ลีด (Leads)</th>
                      <th className="px-3 py-2.5 min-w-[100px]">ผ่านเกณฑ์</th>
                      <th className="px-3 py-2.5 min-w-[90px]">นัดหมาย</th>
                      <th className="px-3 py-2.5 min-w-[90px]">เสนอราคา</th>
                      <th className="px-3 py-2.5 min-w-[100px]">ปิดการขาย</th>
                      <th className="px-3 py-2.5 min-w-[120px]">ยอดขาย (Sale ฿)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ads.map(ad => {
                      const row = bulkFormRows[ad.adId] || {
                        leads: '',
                        qualifiedLeads: '',
                        appointments: '',
                        quotations: '',
                        closedSales: '',
                        sale: ''
                      }
                      return (
                        <tr key={ad.adId} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900 truncate max-w-[160px]">{ad.adName}</div>
                            <div className="font-mono text-[10px] text-slate-400">{ad.adId}</div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-800 bg-rose-50/20">
                            {formatCurrency(ad.spend)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600 font-bold">
                            {formatNum(ad.messageInbox)}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={row.leads}
                              placeholder={String(ad.leads)}
                              onChange={e => {
                                const val = e.target.value
                                setBulkFormRows(prev => ({
                                  ...prev,
                                  [ad.adId]: { ...prev[ad.adId], leads: val }
                                }))
                              }}
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={row.qualifiedLeads}
                              placeholder={String(ad.qualifiedLeads)}
                              onChange={e => {
                                const val = e.target.value
                                setBulkFormRows(prev => ({
                                  ...prev,
                                  [ad.adId]: { ...prev[ad.adId], qualifiedLeads: val }
                                }))
                              }}
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={row.appointments}
                              placeholder={String(ad.appointments)}
                              onChange={e => {
                                const val = e.target.value
                                setBulkFormRows(prev => ({
                                  ...prev,
                                  [ad.adId]: { ...prev[ad.adId], appointments: val }
                                }))
                              }}
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={row.quotations}
                              placeholder={String(ad.quotations)}
                              onChange={e => {
                                const val = e.target.value
                                setBulkFormRows(prev => ({
                                  ...prev,
                                  [ad.adId]: { ...prev[ad.adId], quotations: val }
                                }))
                              }}
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={row.closedSales}
                              placeholder={String(ad.closedSales)}
                              onChange={e => {
                                const val = e.target.value
                                setBulkFormRows(prev => ({
                                  ...prev,
                                  [ad.adId]: { ...prev[ad.adId], closedSales: val }
                                }))
                              }}
                              className="w-full text-xs font-mono font-bold bg-white border border-emerald-400 rounded px-2 py-1 text-emerald-800"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="any"
                              value={row.sale}
                              placeholder={String(ad.sale)}
                              onChange={e => {
                                const val = e.target.value
                                setBulkFormRows(prev => ({
                                  ...prev,
                                  [ad.adId]: { ...prev[ad.adId], sale: val }
                                }))
                              }}
                              className="w-full text-xs font-mono font-bold bg-white border border-emerald-400 rounded px-2 py-1 text-emerald-800"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl">
              <span className="text-xs text-slate-500">
                รวมทั้งหมด {ads.length} รายการโฆษณา
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  disabled={savingBulk}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingBulk ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>บันทึกทั้งหมด (Save All Updates)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMAGE / VIDEO PREVIEW LIGHTBOX                                             */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl p-2 flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {previewImage.toLowerCase().endsWith('.mp4') ? (
              <video
                src={previewImage}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-lg"
              />
            ) : (
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
                onError={(e: any) => {
                  e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                }}
              />
            )}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/90 p-2 rounded-full transition-all border border-white/20 shadow-md cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
