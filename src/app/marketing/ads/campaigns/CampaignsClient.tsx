'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  ChevronDown,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  Film,
  FolderOpen,
  PieChart as ChartIcon,
  Eye,
  MoreVertical,
  Play,
  Pause,
  Archive,
  Upload,
  X,
  SlidersHorizontal,
  RefreshCw,
  Maximize2,
  Grid,
  List,
  Check,
  ArrowRight,
  Video,
  FileText,
  RotateCcw
} from 'lucide-react'
import { createCampaign, updateCampaign, deleteCampaign } from '@/app/actions/ads-campaigns'
import {
  getCreativesList,
  uploadCreativeToObjectStorage,
  createCreativeRecord,
  addCreativeVersion,
  toggleArchiveCreative,
  CreativeItem,
  CreativeVersionItem
} from '@/app/actions/ads-creatives'
import { PRODUCT_CATEGORIES } from '../constants'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PerformanceClient from '../performance/PerformanceClient'

export interface AdItem {
  id: string
  code?: string
  name: string
  platformAdId?: string
  adSetId?: string
  format?: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  headline?: string
  primaryText?: string
  cta?: string
  creativeName?: string
  creativeUrl?: string
  creativeVersion?: string
  dimensions?: string
  status?: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED'
  updatedAt?: string
}

export interface AdSetItem {
  id: string
  code?: string
  name: string
  platformAdSetId?: string
  campaignId?: string
  targetAudience?: string
  location?: string
  age?: string
  placement?: string
  optimization?: string
  budgetType?: 'DAILY' | 'LIFETIME'
  budget: number // Allocated Budget
  dailyBudget?: number
  startDate?: string
  endDate?: string
  status?: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED'
  ads?: AdItem[]
}

export interface CampaignData {
  budgetStrategy: 'ABO' | 'CBO'
  adSets: AdSetItem[]
}

export default function CampaignsClient({
  initialCampaigns,
  channels,
  objectives,
  products,
  branches,
  accounts,
  resultTypes,
  initialPerformances,
  userRole
}: any) {
  const router = useRouter()
  const isViewer = ['Viewer/Management'].includes(userRole)

  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns || [])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    message: string
    onConfirm: () => void
  }>({ isOpen: false, message: '', onConfirm: () => { } })

  // 4 ส่วนงานหลัก / Subtab Navigation
  const [mainTab, setMainTab] = useState<'setup' | 'performance' | 'crm' | 'dashboard'>('setup')
  const [subTab, setSubTab] = useState<'info' | 'adsets' | 'creative'>('info')

  // Selected Campaign for Ad Sets & Creative inspection
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')

  // Form State
  const initialFormState = {
    id: '',
    channelId: '',
    accountId: '',
    branchId: '',
    productCategory: '',
    objectiveId: '',
    name: '',
    campaignId: '', // Platform ID
    internalCode: '',
    status: 'ACTIVE',
    notes: '',
    budgetStrategy: 'ABO' as 'ABO' | 'CBO',
    budget: '',
    startDate: '',
    endDate: '',
    targetAudience: '',
    artworkUrl: ''
  }

  const [formData, setFormData] = useState(initialFormState)

  // Ad Sets Structure for the currently edited campaign
  const [formAdSets, setFormAdSets] = useState<AdSetItem[]>([])

  // Filters & Search for Campaign Master List
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Helper to parse adSets and budgetStrategy from campaign record
  const getParsedCampaignData = (c: any): CampaignData => {
    try {
      if (c.targetAudience && c.targetAudience.startsWith('{')) {
        const parsed = JSON.parse(c.targetAudience)
        return {
          budgetStrategy: parsed.budgetStrategy || 'ABO',
          adSets: Array.isArray(parsed.adSets) ? parsed.adSets : []
        }
      }
    } catch { }
    return {
      budgetStrategy: (c.targetAudience as any) || 'ABO',
      adSets: []
    }
  }

  // Prevent accidental navigation when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Auto-generate internal code when product, channel, or date changes
  const generateCampaignCode = (channelId: string, product: string, dateStr: string) => {
    const dateObj = dateStr ? new Date(dateStr) : new Date()
    const yyyy = dateObj.getFullYear()
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
    const channelObj = channels?.find((ch: any) => ch.id === channelId)
    const chCode = channelObj?.name?.substring(0, 2).toUpperCase() || 'FB'

    // Short product abbreviation
    let prodCode = 'SP'
    if (product.toLowerCase().includes('inverter') || product.toLowerCase().includes('vsd')) prodCode = 'VSD'
    else if (product.toLowerCase().includes('roof')) prodCode = 'SR'
    else if (product.toLowerCase().includes('pump')) prodCode = 'SP'
    else if (product.toLowerCase().includes('battery')) prodCode = 'BAT'
    else if (product.toLowerCase().includes('motor')) prodCode = 'MOT'

    const count = campaigns.length + 1
    const seq = String(count).padStart(3, '0')
    return `CMP-${yyyy}${mm}-${prodCode}-${seq}`
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      if (!next.internalCode && (name === 'productCategory' || name === 'startDate' || name === 'channelId')) {
        next.internalCode = generateCampaignCode(next.channelId, next.productCategory, next.startDate)
      }
      return next
    })
    setIsDirty(true)
  }

  const handleClear = () => {
    setFormData(initialFormState)
    setFormAdSets([])
    setIsDirty(false)
    setError('')
    setSuccessMsg('')
  }

  const handleEdit = (campaign: any) => {
    const parsedData = getParsedCampaignData(campaign)
    setFormData({
      id: campaign.id,
      channelId: campaign.channelId || '',
      accountId: campaign.accountId || '',
      branchId: campaign.branchId || '',
      productCategory: campaign.productCategory || '',
      objectiveId: campaign.objectiveId || '',
      name: campaign.name || '',
      campaignId: campaign.campaignId || '',
      internalCode: campaign.internalCode || '',
      status: campaign.status || 'ACTIVE',
      notes: campaign.notes || '',
      budgetStrategy: parsedData.budgetStrategy,
      budget: campaign.budget ? campaign.budget.toString() : '',
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
      targetAudience: campaign.targetAudience || '',
      artworkUrl: campaign.artworkUrl || ''
    })
    setFormAdSets(parsedData.adSets || [])
    setSelectedCampaignId(campaign.id)
    setIsDirty(false)
    setError('')
    setSubTab('info')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDuplicate = (campaign: any) => {
    const parsedData = getParsedCampaignData(campaign)
    const newCode = generateCampaignCode(campaign.channelId || '', campaign.productCategory || '', '')
    setFormData({
      id: '',
      channelId: campaign.channelId || '',
      accountId: campaign.accountId || '',
      branchId: campaign.branchId || '',
      productCategory: campaign.productCategory || '',
      objectiveId: campaign.objectiveId || '',
      name: `${campaign.name} (คัดลอก)`,
      campaignId: `${campaign.campaignId || ''}_copy`,
      internalCode: newCode,
      status: 'DRAFT',
      notes: campaign.notes || '',
      budgetStrategy: parsedData.budgetStrategy,
      budget: campaign.budget ? campaign.budget.toString() : '',
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
      targetAudience: campaign.targetAudience || '',
      artworkUrl: campaign.artworkUrl || ''
    })
    setFormAdSets(parsedData.adSets || [])
    setIsDirty(true)
    setError('')
    setSubTab('info')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (id: string) => {
    if (isViewer) return
    setConfirmModal({
      isOpen: true,
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบแคมเปญนี้? การกระทำนี้จะย้ายแคมเปญไปที่ถังขยะ',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          await deleteCampaign(id)
          setCampaigns(prev => prev.filter(c => c.id !== id))
          if (formData.id === id) handleClear()
          setSuccessMsg('ลบแคมเปญเรียบร้อยแล้ว')
        } catch (err: any) {
          setError(err.message || 'ลบแคมเปญไม่สำเร็จ')
        }
      }
    })
  }

  // Calculate allocated budget from current form ad sets
  const formAllocatedBudget = useMemo(() => {
    return formAdSets.reduce((sum, item) => sum + (Number(item.budget) || 0), 0)
  }, [formAdSets])

  const plannedBudgetNum = parseFloat(formData.budget) || 0
  const isOverBudget = plannedBudgetNum > 0 && formAllocatedBudget > plannedBudgetNum
  const budgetRatio = plannedBudgetNum > 0 ? (formAllocatedBudget / plannedBudgetNum) * 100 : 0

  // Required fields check with Thai names
  const missingFields: string[] = []
  if (!formData.channelId) missingFields.push('ช่องทาง (Channel)')
  if (!formData.accountId) missingFields.push('บัญชี/เพจ (Account)')
  if (!formData.productCategory) missingFields.push('กลุ่มสินค้า (Product)')
  if (!formData.objectiveId) missingFields.push('วัตถุประสงค์ (Objective)')
  if (!formData.name.trim()) missingFields.push('ชื่อแคมเปญ (Campaign Name)')
  if (!formData.campaignId.trim()) missingFields.push('รหัสบนแพลตฟอร์ม (Platform ID)')
  if (!formData.budget || plannedBudgetNum <= 0) missingFields.push('งบประมาณ (Planned Budget)')
  if (!formData.startDate) missingFields.push('วันที่เริ่มต้น (Start Date)')
  if (!formData.endDate) missingFields.push('วันที่สิ้นสุด (End Date)')

  const isFormComplete = missingFields.length === 0

  const handleSaveInternal = async (overrideStatus?: string, thenGoToAdSets = false) => {
    setError('')
    setSuccessMsg('')

    if (isViewer) return
    if (!formData.channelId || !formData.name || !formData.campaignId || !formData.budget) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
      return
    }

    setIsSubmitting(true)

    // Store budgetStrategy and adSets encoded in targetAudience
    const targetPayload = JSON.stringify({
      budgetStrategy: formData.budgetStrategy,
      adSets: formAdSets
    })

    const payload = {
      campaignId: formData.campaignId.trim(),
      name: formData.name.trim(),
      channelId: formData.channelId,
      productCategory: formData.productCategory || undefined,
      branchId: formData.branchId || undefined,
      objectiveId: formData.objectiveId || undefined,
      accountId: formData.accountId || undefined,
      internalCode: formData.internalCode ? formData.internalCode.trim() : undefined,
      budget: plannedBudgetNum,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: overrideStatus || formData.status || 'ACTIVE',
      notes: formData.notes ? formData.notes.trim() : undefined,
      targetAudience: targetPayload
    }

    try {
      let savedCampaign: any
      if (formData.id) {
        const res = await updateCampaign(formData.id, payload)
        savedCampaign = res.data
        setCampaigns(prev => prev.map(c => (c.id === formData.id ? savedCampaign : c)))
        setSuccessMsg('อัปเดตข้อมูลแคมเปญสำเร็จ')
      } else {
        const res = await createCampaign(payload as any)
        savedCampaign = res.data
        setCampaigns(prev => [savedCampaign, ...prev])
        setSuccessMsg('บันทึกแคมเปญใหม่สำเร็จ')
        setFormData(prev => ({ ...prev, id: savedCampaign.id }))
      }

      setIsDirty(false)
      setSelectedCampaignId(savedCampaign.id)

      if (thenGoToAdSets) {
        setSubTab('adsets')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'บันทึกข้อมูลล้มเหลว')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered campaigns for Master List
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c: any) => {
      const matchesSearch =
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.internalCode?.toLowerCase().includes(search.toLowerCase()) ||
        c.campaignId?.toLowerCase().includes(search.toLowerCase())

      const matchesChannel = !filterChannel || c.channelId === filterChannel
      const matchesProduct = !filterProduct || c.productCategory === filterProduct
      const matchesStatus = !filterStatus || c.status?.toUpperCase() === filterStatus.toUpperCase()

      return matchesSearch && matchesChannel && matchesProduct && matchesStatus
    })
  }, [campaigns, search, filterChannel, filterProduct, filterStatus])

  // Pagination slice
  const totalPages = Math.ceil(filteredCampaigns.length / pageSize) || 1
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCampaigns.slice(start, start + pageSize)
  }, [filteredCampaigns, currentPage, pageSize])

  // Calculate Overall Structure Summary stats
  const structureSummary = useMemo(() => {
    let totalAdSets = 0
    let totalAds = 0
    let totalCreatives = 0
    let totalAllocated = 0

    campaigns.forEach((c: any) => {
      const parsed = getParsedCampaignData(c)
      const sets = parsed.adSets || []
      totalAdSets += sets.length
      sets.forEach(set => {
        totalAllocated += Number(set.budget) || 0
        const ads = set.ads || []
        totalAds += ads.length
        totalCreatives += ads.filter(a => a.creativeName || a.headline).length
      })
    })

    return { totalAdSets, totalAds, totalCreatives, totalAllocated }
  }, [campaigns])

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'รหัสแคมเปญ (Code)',
      'ชื่อแคมเปญ (Name)',
      'Platform Campaign ID',
      'ช่องทาง (Channel)',
      'บัญชี (Account)',
      'สาขา (Branch)',
      'กลุ่มสินค้า (Product)',
      'วัตถุประสงค์ (Objective)',
      'กลยุทธ์งบประมาณ (Strategy)',
      'งบประมาณที่วางแผนไว้ (Planned Budget)',
      'จำนวนชุดโฆษณา (Ad Sets)',
      'จำนวนโฆษณา (Ads)',
      'งบประมาณที่จัดสรร (Allocated Budget)',
      'ระยะเวลา (Schedule)',
      'สถานะ (Status)',
      'อัปเดตล่าสุด (Last Updated)'
    ]

    const rows = filteredCampaigns.map((c: any) => {
      const parsed = getParsedCampaignData(c)
      const sets = parsed.adSets || []
      const adsCount = sets.reduce((sum, s) => sum + (s.ads?.length || 0), 0)
      const allocated = sets.reduce((sum, s) => sum + (Number(s.budget) || 0), 0)
      const scheduleStr = `${c.startDate ? new Date(c.startDate).toLocaleDateString('th-TH') : '-'} - ${c.endDate ? new Date(c.endDate).toLocaleDateString('th-TH') : '-'}`

      return [
        `"${c.internalCode || '-'}"`,
        `"${c.name || '-'}"`,
        `"${c.campaignId || '-'}"`,
        `"${c.channel?.name || '-'}"`,
        `"${c.account?.name || '-'}"`,
        `"${c.branch?.name || '-'}"`,
        `"${c.productCategory || '-'}"`,
        `"${c.objective?.name || '-'}"`,
        `"${parsed.budgetStrategy}"`,
        c.budget || 0,
        sets.length,
        adsCount,
        allocated,
        `"${scheduleStr}"`,
        `"${c.status || 'ACTIVE'}"`,
        `"${new Date(c.updatedAt || c.createdAt).toLocaleString('th-TH')}"`
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `tera-campaigns-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
          ระบบจัดการข้อมูลโฆษณา TERA
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          ตั้งค่าแคมเปญโฆษณาหลัก (Campaign Master Setup)
        </p>
      </div>

      {/* Main 4-Section Step Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {/* Section 1: Campaign Setup (Active) */}
        <button
          onClick={() => setMainTab('setup')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${mainTab === 'setup'
            ? 'text-red-600 bg-red-50/70 border-b-2 border-red-600'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          <span
            className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black ${mainTab === 'setup' ? 'bg-[#ff2301] text-white shadow-sm' : 'bg-gray-200 text-gray-600'
              }`}
          >
            1
          </span>
          <span>1. ตั้งค่าแคมเปญ (Campaign Setup)</span>
        </button>

        {/* Section 2: Ads Performance */}
        <Link
          href="/marketing/ads/performance"
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-black bg-gray-200 text-gray-600">
            2
          </span>
          <span>2. ผลการโฆษณา (Ads Performance)</span>
        </Link>

        {/* Section 3: CRM Results */}
        <Link
          href="/marketing/ads/crm"
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-black bg-gray-200 text-gray-600">
            3
          </span>
          <span>3. ผลลัพธ์ CRM (CRM Results)</span>
        </Link>

        {/* Section 4: Dashboard */}
        <Link
          href="/marketing/ads/dashboard"
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-black bg-gray-200 text-gray-600">
            4
          </span>
          <span>4. แดชบอร์ดภาพรวม (Dashboard)</span>
        </Link>
      </div>

      {mainTab === 'setup' && (
        <div className="space-y-6">
          {/* Sub-tabs under Campaign Setup */}
          <div className="flex items-center gap-6 border-b border-gray-100 pt-1 text-sm font-bold">
            <button
              onClick={() => setSubTab('info')}
              className={`pb-3 relative transition-colors ${subTab === 'info' ? 'text-red-600' : 'text-gray-400 hover:text-gray-700'
                }`}
            >
              <span>ข้อมูลแคมเปญ (Campaign Information)</span>
              {subTab === 'info' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff2301] rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setSubTab('adsets')}
              className={`pb-3 relative transition-colors ${subTab === 'adsets' ? 'text-red-600' : 'text-gray-400 hover:text-gray-700'
                }`}
            >
              <span>ชุดโฆษณาและชิ้นงาน (Ad Sets & Ads)</span>
              {subTab === 'adsets' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff2301] rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setSubTab('creative')}
              className={`pb-3 relative transition-colors ${subTab === 'creative' ? 'text-red-600' : 'text-gray-400 hover:text-gray-700'
                }`}
            >
              <span>คลังสื่อโฆษณา (Creative Library)</span>
              {subTab === 'creative' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff2301] rounded-full"></span>
              )}
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-sm flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-sm flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SUBTAB 1: Campaign Information */}
          {subTab === 'info' && (
            <div className="space-y-6">
              {/* Form Card */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-base font-black text-gray-900 tracking-wider">
                    ข้อมูลแคมเปญ (CAMPAIGN INFORMATION)
                  </h2>
                  {formData.id && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      กำลังแก้ไข: {formData.internalCode || formData.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Column A: รายละเอียดแคมเปญ */}
                  <div className="space-y-4">
                    <div className="pb-1 border-b border-gray-100">
                      <h3 className="text-xs font-black text-gray-800 tracking-wider">
                        A. รายละเอียดแคมเปญ (CAMPAIGN DETAILS)
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Row 1: Channel */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          ช่องทางโฆษณา (Channel) <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="channelId"
                          value={formData.channelId}
                          onChange={handleInputChange}
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        >
                          <option value="">เลือกช่องทางโฆษณา...</option>
                          {channels?.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Row 2: Account */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          บัญชี / เพจ / โครงการ (Account) <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="accountId"
                          value={formData.accountId}
                          onChange={handleInputChange}
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        >
                          <option value="">เลือกบัญชี / เพจ...</option>
                          {accounts?.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Row 3: Branch */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          สาขา (Branch)
                        </label>
                        <select
                          name="branchId"
                          value={formData.branchId}
                          onChange={handleInputChange}
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        >
                          <option value="">ทุกสาขา / สำนักงานใหญ่ (Head Office)</option>
                          {branches?.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Row 4: Product */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          กลุ่มสินค้า (Product) <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={PRODUCT_CATEGORIES.map(c => ({ value: c, label: c }))}
                          value={formData.productCategory}
                          onChange={handleInputChange}
                          name="productCategory"
                          placeholder="ค้นหาและเลือกกลุ่มสินค้า..."
                          disabled={isViewer}
                        />
                      </div>

                      {/* Row 5: Objective */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          วัตถุประสงค์ (Objective) <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="objectiveId"
                          value={formData.objectiveId}
                          onChange={handleInputChange}
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        >
                          <option value="">เลือกวัตถุประสงค์...</option>
                          {objectives?.map((o: any) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Column B: ข้อมูลเฉพาะแคมเปญ */}
                  <div className="space-y-4">
                    <div className="pb-1 border-b border-gray-100">
                      <h3 className="text-xs font-black text-gray-800 tracking-wider">
                        B. ข้อมูลเฉพาะแคมเปญ (CAMPAIGN IDENTITY)
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Row 1: Campaign Name */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          ชื่อแคมเปญ (Campaign Name) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="เช่น SP Aug Lead"
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        />
                      </div>

                      {/* Row 2: Platform Campaign ID */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          รหัสบนแพลตฟอร์ม (Platform Campaign ID) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="campaignId"
                          value={formData.campaignId}
                          onChange={handleInputChange}
                          placeholder="เช่น 120209834001"
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        />
                      </div>

                      {/* Row 3: Internal Code */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          รหัสแคมเปญภายใน (Internal Code)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="internalCode"
                            value={formData.internalCode}
                            onChange={handleInputChange}
                            placeholder="CMP-202608-SP-001"
                            disabled={isViewer}
                            className="w-full h-10 bg-gray-100 border border-gray-300 rounded-xl px-3 pr-28 text-sm text-gray-800 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const gen = generateCampaignCode(formData.channelId, formData.productCategory, formData.startDate)
                              setFormData(prev => ({ ...prev, internalCode: gen }))
                              setIsDirty(true)
                            }}
                            className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors"
                            title="สร้างรหัสอัตโนมัติ"
                          >
                            <Sparkles size={11} /> อัตโนมัติ
                          </button>
                        </div>
                      </div>

                      {/* Row 4: Status */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          สถานะ (Status) <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          disabled={isViewer}
                          className={`w-full h-10 border rounded-xl px-3 text-sm font-bold focus:ring-2 focus:ring-[#ff2301] outline-none transition-colors ${formData.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : formData.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : formData.status === 'PAUSED'
                                ? 'bg-gray-100 text-gray-800 border-gray-300'
                                : formData.status === 'COMPLETED'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                        >
                          <option value="ACTIVE">กำลังใช้งาน (Active)</option>
                          <option value="DRAFT">ฉบับร่าง (Draft)</option>
                          <option value="PAUSED">หยุดชั่วคราว (Paused)</option>
                          <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
                          <option value="ARCHIVED">เก็บถาวร (Archived)</option>
                        </select>
                      </div>

                      {/* Row 5: Notes */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          หมายเหตุแคมเปญ (Campaign Notes)
                        </label>
                        <input
                          type="text"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          placeholder="ระบุหมายเหตุ เช่น แคมเปญโซล่าปั๊ม..."
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 transition-all"
                        />
                      </div>

                      {/* Row 6: Legacy Artwork Link (Read Only) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-gray-700">
                            ลิงก์ Artwork เดิม (Legacy Artwork Link)
                          </label>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            กำลังย้ายข้อมูล (Read Only)
                          </span>
                        </div>
                        <input
                          type="text"
                          name="artworkUrl"
                          value={formData.artworkUrl || ''}
                          readOnly
                          disabled
                          placeholder="ย้ายไปใช้คลังสื่อโฆษณา (Creative Library) ในแท็บที่ 3"
                          className="w-full h-10 bg-gray-100/90 border border-gray-300 rounded-xl px-3 text-xs text-gray-500 font-mono cursor-not-allowed"
                        />
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <Info size={12} className="text-blue-500 shrink-0" />
                          <span>
                            ระบบเปลี่ยนมาใช้ <strong>คลังสื่อโฆษณา (Creative Library)</strong> ในแท็บที่ 3 แทนการแนบลิงก์
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Column C: งบประมาณและกำหนดการ */}
                  <div className="space-y-4">
                    <div className="pb-1 border-b border-gray-100">
                      <h3 className="text-xs font-black text-gray-800 tracking-wider">
                        C. งบประมาณและกำหนดการ (BUDGET & SCHEDULE)
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Row 1: Budget Strategy */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          กลยุทธ์งบประมาณ (Budget Strategy) <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="budgetStrategy"
                          value={formData.budgetStrategy}
                          onChange={handleInputChange}
                          disabled={isViewer}
                          className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 font-semibold transition-all"
                        >
                          <option value="ABO">ABO — กระจายงบตามชุดโฆษณา (Ad Set Budget)</option>
                          <option value="CBO">CBO — งบประมาณรวมระดับแคมเปญ (Campaign Budget)</option>
                        </select>
                      </div>

                      {/* Row 2: Planned Budget */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          งบประมาณที่วางแผนไว้ (Planned Budget) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-gray-500 font-bold text-sm">
                            ฿
                          </span>
                          <input
                            type="number"
                            step="100"
                            name="budget"
                            value={formData.budget}
                            onChange={handleInputChange}
                            placeholder="เช่น 110,000"
                            disabled={isViewer}
                            className="w-full h-10 bg-amber-50/40 border border-gray-300 rounded-xl px-3 pl-8 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ff2301] outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Row 3: Schedule (Start & End Date) */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          กำหนดการโฆษณา (Start - End Date) <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            disabled={isViewer}
                            className="w-full h-10 bg-white border border-gray-300 rounded-xl px-2.5 text-xs focus:ring-2 focus:ring-[#ff2301] outline-none"
                            title="วันที่เริ่มต้น"
                          />
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            disabled={isViewer}
                            className="w-full h-10 bg-white border border-gray-300 rounded-xl px-2.5 text-xs focus:ring-2 focus:ring-[#ff2301] outline-none"
                            title="วันที่สิ้นสุด"
                          />
                        </div>
                      </div>

                      {/* Row 4: Budget Allocated Widget */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-gray-700">
                            งบประมาณที่จัดสรร (Budget Allocated)
                          </label>
                          <span className={`text-[11px] font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
                            {budgetRatio.toFixed(0)}% ({formAdSets.length} ชุดโฆษณา)
                          </span>
                        </div>
                        <div className="h-10 bg-white border border-gray-300 rounded-xl px-3 flex items-center justify-between relative overflow-hidden">
                          <span className={`font-mono font-black text-xs ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                            ฿{formAllocatedBudget.toLocaleString()} / ฿{plannedBudgetNum.toLocaleString()}
                          </span>
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-100">
                            <div
                              className={`h-full transition-all duration-300 ${isOverBudget ? 'bg-red-600' : 'bg-emerald-500'
                                }`}
                              style={{ width: `${Math.min(budgetRatio, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 5: Budget Status / Alert */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          สถานะการจัดสรรงบประมาณ
                        </label>
                        {isOverBudget ? (
                          <div className="h-10 px-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-1.5 animate-pulse">
                            <AlertCircle size={15} className="shrink-0 text-red-600" />
                            <span className="truncate">
                              เกินงบ ฿{(formAllocatedBudget - plannedBudgetNum).toLocaleString()}! กรุณาปรับลดงบ Ad Set
                            </span>
                          </div>
                        ) : (
                          <div className="h-10 px-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-700 flex items-center gap-1.5 font-medium">
                            <Info size={14} className="shrink-0 text-blue-600" />
                            <span className="truncate">
                              {formData.budgetStrategy === 'ABO'
                                ? 'ระบบ ABO: จัดสรรงบในระดับชุดโฆษณา'
                                : 'ระบบ CBO: งบรวมจัดการระดับแคมเปญ'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Action Footer */}
                <div className="pt-6 border-t border-gray-100 space-y-3">
                  <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
                    {/* Left: Symmetrical, compact status indicator */}
                    <div className="flex items-center gap-3 w-full xl:w-auto">
                      {isFormComplete ? (
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-xs">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>ข้อมูลที่จำเป็นครบถ้วนแล้ว พร้อมบันทึก</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-amber-800 bg-amber-50/80 border border-amber-200 shadow-xs">
                          <Info size={16} className="text-amber-600 shrink-0" />
                          <span className="font-bold">กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน</span>
                          <span className="bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            ยังขาดอีก {missingFields.length} ช่อง
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Symmetrical 4 Action Buttons in a clean horizontal row */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full xl:w-auto justify-end shrink-0">
                      <button
                        type="button"
                        onClick={handleClear}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-xs active:scale-[0.98] whitespace-nowrap"
                      >
                        ล้างข้อมูล (Clear)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveInternal('DRAFT')}
                        disabled={isSubmitting || !formData.name}
                        className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                      >
                        บันทึกฉบับร่าง (Save Draft)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveInternal()}
                        disabled={isSubmitting || !isFormComplete}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#ff2301] hover:bg-red-600 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกแคมเปญ (Save Campaign)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveInternal(undefined, true)}
                        disabled={isSubmitting || !isFormComplete}
                        className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
                      >
                        <span>บันทึกและไปจัดการ Ad Sets</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-row: Missing field chips on left, guideline note on right */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-400 font-medium pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!isFormComplete && (
                        <>
                          <span className="text-gray-500 font-semibold">ช่องที่ยังขาด:</span>
                          {missingFields.map((field, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-medium border border-gray-200/60"
                            >
                              {field}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="text-right text-gray-400 sm:ml-auto">
                      สร้างแคมเปญก่อน จากนั้นจึงเพิ่มชุดโฆษณา (Ad Sets), โฆษณา (Ads) และชิ้นงาน (Creative)
                    </div>
                  </div>
                </div>
              </div>

              {/* CAMPAIGN STRUCTURE SUMMARY Section */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h2 className="text-xs font-black text-gray-800 tracking-wider">
                    สรุปโครงสร้างแคมเปญ (CAMPAIGN STRUCTURE SUMMARY)
                  </h2>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setSubTab('adsets')}
                      className="px-4 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                    >
                      จัดการชุดโฆษณา (Manage Ad Sets & Ads)
                    </button>
                    <button
                      onClick={() => setSubTab('creative')}
                      className="px-4 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                    >
                      เปิดคลังสื่อโฆษณา (Open Creative Library)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500">ชุดโฆษณา (Ad Sets)</span>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {structureSummary.totalAdSets}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500">ชิ้นงานโฆษณา (Ads)</span>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {structureSummary.totalAds}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500">ไฟล์สื่อโฆษณา (Creative Files)</span>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {structureSummary.totalCreatives}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500">งบประมาณที่จัดสรรแล้ว (Allocated)</span>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      ฿{structureSummary.totalAllocated.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-blue-600 flex items-center gap-1.5 pt-1">
                  <Info size={13} className="shrink-0" />
                  <span>ข้อมูลผลการโฆษณาจริงจะถูกอัปเดตและบันทึกแยกต่างหากในหน้า "2. ผลการโฆษณา (Ads Performance)"</span>
                </div>
              </div>

              {/* CAMPAIGN MASTER LIST (Table) */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <h2 className="text-xs font-black text-gray-800 tracking-wider">
                    รายการแคมเปญหลัก (CAMPAIGN MASTER LIST)
                  </h2>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                  >
                    <Download size={13} />
                    <span>ส่งออกข้อมูล (Export CSV)</span>
                  </button>
                </div>

                {/* Filters Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={e => {
                        setSearch(e.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="ค้นหาชื่อแคมเปญ หรือรหัสแคมเปญ..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ff2301]"
                    />
                  </div>

                  <select
                    value={filterChannel}
                    onChange={e => {
                      setFilterChannel(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl outline-none text-gray-700 font-semibold"
                  >
                    <option value="">ทุกช่องทาง (All Channels)</option>
                    {channels?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterProduct}
                    onChange={e => {
                      setFilterProduct(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl outline-none text-gray-700 font-semibold"
                  >
                    <option value="">ทุกกลุ่มสินค้า (All Products)</option>
                    {PRODUCT_CATEGORIES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={e => {
                      setFilterStatus(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl outline-none text-gray-700 font-semibold"
                  >
                    <option value="">ทุกสถานะ (All Status)</option>
                    <option value="ACTIVE">กำลังใช้งาน (Active)</option>
                    <option value="DRAFT">ฉบับร่าง (Draft)</option>
                    <option value="PAUSED">หยุดชั่วคราว (Paused)</option>
                    <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
                    <option value="ARCHIVED">เก็บถาวร (Archived)</option>
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs text-gray-600 whitespace-nowrap">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-800">
                      <tr>
                        <th className="px-3 py-3 font-bold">รหัสแคมเปญ</th>
                        <th className="px-3 py-3 font-bold">ชื่อแคมเปญ</th>
                        <th className="px-3 py-3 font-bold">ช่องทาง</th>
                        <th className="px-3 py-3 font-bold">กลุ่มสินค้า</th>
                        <th className="px-3 py-3 font-bold">วัตถุประสงค์</th>
                        <th className="px-3 py-3 font-bold">กลยุทธ์งบ</th>
                        <th className="px-3 py-3 font-bold text-right">งบที่วางแผนไว้</th>
                        <th className="px-3 py-3 font-bold text-center">ชุดโฆษณา</th>
                        <th className="px-3 py-3 font-bold text-center">ชิ้นงาน</th>
                        <th className="px-3 py-3 font-bold text-center">สื่อโฆษณา</th>
                        <th className="px-3 py-3 font-bold text-right">งบที่จัดสรร</th>
                        <th className="px-3 py-3 font-bold">ระยะเวลา</th>
                        <th className="px-3 py-3 font-bold text-center">สถานะ</th>
                        <th className="px-3 py-3 font-bold">อัปเดตล่าสุด</th>
                        <th className="px-3 py-3 font-bold text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedCampaigns.length > 0 ? (
                        paginatedCampaigns.map((c: any) => {
                          const parsed = getParsedCampaignData(c)
                          const sets = parsed.adSets || []
                          const adsCount = sets.reduce((sum, s) => sum + (s.ads?.length || 0), 0)
                          const allocated = sets.reduce((sum, s) => sum + (Number(s.budget) || 0), 0)
                          const scheduleStr = `${c.startDate ? new Date(c.startDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '-'} - ${c.endDate ? new Date(c.endDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}`
                          const statusUpper = (c.status || 'ACTIVE').toUpperCase()

                          return (
                            <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-3 py-3 font-mono font-bold text-gray-900">
                                {c.internalCode || '-'}
                              </td>
                              <td className="px-3 py-3 font-semibold text-gray-900 max-w-[200px] truncate" title={c.name}>
                                {c.name}
                              </td>
                              <td className="px-3 py-3 text-gray-700">
                                {c.channel?.name || '-'}
                              </td>
                              <td className="px-3 py-3 text-gray-700 max-w-[150px] truncate" title={c.productCategory}>
                                {c.productCategory || '-'}
                              </td>
                              <td className="px-3 py-3 text-gray-700">
                                {c.objective?.name || '-'}
                              </td>
                              <td className="px-3 py-3 font-semibold text-gray-800">
                                {parsed.budgetStrategy}
                              </td>
                              <td className="px-3 py-3 font-bold text-gray-900 text-right">
                                ฿{Number(c.budget || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-gray-800">
                                {sets.length}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-gray-800">
                                {adsCount}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-gray-800">
                                {adsCount}
                              </td>
                              <td className={`px-3 py-3 font-bold text-right ${allocated > (c.budget || 0) ? 'text-red-600' : 'text-gray-900'}`}>
                                ฿{allocated.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-gray-600">
                                {scheduleStr}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusUpper === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : statusUpper === 'DRAFT'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : statusUpper === 'PAUSED'
                                        ? 'bg-gray-100 text-gray-700 border-gray-300'
                                        : statusUpper === 'COMPLETED'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                >
                                  {statusUpper === 'ACTIVE'
                                    ? 'ใช้งาน'
                                    : statusUpper === 'DRAFT'
                                      ? 'ฉบับร่าง'
                                      : statusUpper === 'PAUSED'
                                        ? 'หยุดชั่วคราว'
                                        : statusUpper === 'COMPLETED'
                                          ? 'เสร็จสิ้น'
                                          : 'เก็บถาวร'}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-gray-500">
                                {new Date(c.updatedAt || c.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })},{' '}
                                {new Date(c.updatedAt || c.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEdit(c)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="แก้ไขแคมเปญ"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleEdit(c)
                                      setSubTab('adsets')
                                    }}
                                    className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="จัดการชุดโฆษณา (Ad Sets & Ads)"
                                  >
                                    <Layers size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDuplicate(c)}
                                    className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="คัดลอกแคมเปญ"
                                  >
                                    <Copy size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="ลบแคมเปญ"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={15} className="px-4 py-8 text-center text-gray-400 font-medium">
                            ไม่พบข้อมูลแคมเปญตามเงื่อนไขที่ค้นหา
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 pt-2">
                  <span>
                    แสดง {filteredCampaigns.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, filteredCampaigns.length)} จากทั้งหมด {filteredCampaigns.length} แคมเปญ
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                      title="หน้าก่อนหน้า"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const p = idx + 1
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg font-bold text-xs ${currentPage === p
                            ? 'bg-[#ff2301] text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                            }`}
                        >
                          {p}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                      title="หน้าถัดไป"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: Ad Sets & Ads Management */}
          {subTab === 'adsets' && (
            <AdSetsManager
              campaigns={campaigns}
              selectedCampaignId={selectedCampaignId || formData.id || campaigns[0]?.id || ''}
              onSelectCampaign={(id: string) => {
                setSelectedCampaignId(id)
                const c = campaigns.find(item => item.id === id)
                if (c) {
                  const parsed = getParsedCampaignData(c)
                  setFormAdSets(parsed.adSets || [])
                }
              }}
              onEditCampaign={(campaign: any) => {
                handleEdit(campaign)
              }}
              adSets={formAdSets}
              setAdSets={setFormAdSets}
              onSaveStructure={async (updatedSets: AdSetItem[]) => {
                const targetId = selectedCampaignId || formData.id || campaigns[0]?.id
                if (!targetId) return
                const c = campaigns.find(item => item.id === targetId)
                if (!c) return

                const parsed = getParsedCampaignData(c)
                const targetPayload = JSON.stringify({
                  budgetStrategy: parsed.budgetStrategy || 'ABO',
                  adSets: updatedSets
                })

                try {
                  const res = await updateCampaign(targetId, { targetAudience: targetPayload })
                  setCampaigns(prev => prev.map(item => (item.id === targetId ? res.data : item)))
                  setSuccessMsg('บันทึกโครงสร้าง Ad Sets & Ads สำเร็จ!')
                } catch (e: any) {
                  setError('บันทึกล้มเหลว: ' + e.message)
                }
              }}
              onBack={() => setSubTab('info')}
              onOpenCreativeLibrary={() => setSubTab('creative')}
            />
          )}

          {/* SUBTAB 3: Creative Library */}
          {subTab === 'creative' && (
            <CreativeLibraryView
              campaigns={campaigns}
              onSelectAdSet={(campId?: string, adCode?: string) => {
                if (campId) {
                  const targetCampaign = campaigns.find(c => c.id === campId || c.name === campId)
                  if (targetCampaign) {
                    setSelectedCampaignId(targetCampaign.id)
                    const parsed = getParsedCampaignData(targetCampaign)
                    setFormAdSets(parsed.adSets || [])
                  }
                }
                setSubTab('adsets')
              }}
            />
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการดำเนินการ</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-[#ff2301] text-white rounded-xl hover:bg-red-600 text-sm font-bold shadow-sm transition-colors"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * AdSetsManager Component for Subtab 2 (2.2 ชุดโฆษณาและชิ้นงาน / Ad Sets & Ads)
 */
function AdSetsManager({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onEditCampaign,
  adSets,
  setAdSets,
  onSaveStructure,
  onBack,
  onOpenCreativeLibrary
}: {
  campaigns: any[]
  selectedCampaignId: string
  onSelectCampaign: (id: string) => void
  onEditCampaign: (campaign: any) => void
  adSets: AdSetItem[]
  setAdSets: React.Dispatch<React.SetStateAction<AdSetItem[]>>
  onSaveStructure: (sets: AdSetItem[]) => Promise<void>
  onBack: () => void
  onOpenCreativeLibrary: () => void
}) {
  const router = useRouter()
  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0]
  const plannedBudget = currentCampaign ? Number(currentCampaign.budget || 0) : 0

  let campaignBudgetStrategy = 'ABO'
  try {
    if (currentCampaign?.targetAudience?.startsWith('{')) {
      const parsed = JSON.parse(currentCampaign.targetAudience)
      campaignBudgetStrategy = parsed.budgetStrategy || 'ABO'
    }
  } catch { }

  const totalAllocated = useMemo(() => {
    return adSets.reduce((sum, s) => sum + (Number(s.budget) || 0), 0)
  }, [adSets])

  const isOverBudget = plannedBudget > 0 && totalAllocated > plannedBudget
  const budgetRatio = plannedBudget > 0 ? (totalAllocated / plannedBudget) * 100 : 0

  const [activeSetId, setActiveSetId] = useState<string>(adSets[0]?.id || '')

  useEffect(() => {
    if (!adSets.some(s => s.id === activeSetId) && adSets.length > 0) {
      setActiveSetId(adSets[0].id)
    }
  }, [adSets, activeSetId])

  const activeSetIndex = adSets.findIndex(s => s.id === activeSetId)
  const activeSet: AdSetItem | null = activeSetIndex >= 0 ? adSets[activeSetIndex] : null

  const [searchSet, setSearchSet] = useState('')
  const [searchAds, setSearchAds] = useState('')
  const [filterAdsStatus, setFilterAdsStatus] = useState('All')
  const [expandedAdId, setExpandedAdId] = useState<string>('')
  const [openMenuSetId, setOpenMenuSetId] = useState<string | null>(null)
  const [adModal, setAdModal] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    adIndex?: number
    data: Partial<AdItem>
  }>({
    isOpen: false,
    mode: 'create',
    data: {}
  })

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    ad: AdItem | null
  }>({ isOpen: false, ad: null })

  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean
    adIndex?: number
    fileName: string
  }>({ isOpen: false, fileName: '' })

  const [libraryPickerModal, setLibraryPickerModal] = useState<{
    isOpen: boolean
    targetAdIndex: number | null
    isForAdModal?: boolean
  }>({ isOpen: false, targetAdIndex: null })
  const [libraryItems, setLibraryItems] = useState<CreativeItem[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerProduct, setPickerProduct] = useState('All')

  useEffect(() => {
    if (libraryPickerModal.isOpen) {
      getCreativesList().then(res => {
        if (res.success && res.creatives) setLibraryItems(res.creatives)
      })
    }
  }, [libraryPickerModal.isOpen])

  const [isSaving, setIsSaving] = useState(false)
  const [localFeedback, setLocalFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const channelDisplayName = typeof currentCampaign?.channel === 'object' && currentCampaign?.channel?.name
    ? currentCampaign.channel.name
    : (typeof currentCampaign?.channel === 'string' && currentCampaign.channel ? currentCampaign.channel : 'Facebook')

  const objectiveDisplayName = typeof currentCampaign?.objective === 'object' && currentCampaign?.objective?.name
    ? currentCampaign.objective.name
    : (typeof currentCampaign?.objective === 'string' && currentCampaign.objective ? currentCampaign.objective : 'LEAD_GENERATION')

  const productDisplayName = (typeof currentCampaign?.productCategory === 'string' && currentCampaign.productCategory)
    ? currentCampaign.productCategory
    : (typeof currentCampaign?.product === 'object' && currentCampaign?.product?.name ? currentCampaign.product.name : 'Solar')

  const getProductAbbr = () => {
    const prod = (productDisplayName || 'SP').toString()
    if (prod.toLowerCase().includes('inverter') || prod.toLowerCase().includes('vsd')) return 'VSD'
    if (prod.toLowerCase().includes('roof')) return 'SR'
    if (prod.toLowerCase().includes('battery')) return 'BAT'
    return 'SP'
  }

  const generateAdSetCode = (idx: number) => {
    const pCode = getProductAbbr()
    const seq = String(idx).padStart(3, '0')
    return `AS-${pCode}-${seq}`
  }

  const generatePlatformAdSetId = (idx: number) => {
    const campId = currentCampaign?.campaignId || '120209834001'
    const seq = String(idx).padStart(2, '0')
    return `${campId}-AS${seq}`
  }

  const generateAdCode = (idx: number) => {
    const pCode = getProductAbbr()
    const seq = String(idx).padStart(3, '0')
    return `AD-${pCode}-${seq}`
  }

  const filteredAdSets = useMemo(() => {
    if (!searchSet.trim()) return adSets
    const q = searchSet.toLowerCase()
    return adSets.filter(
      s =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.platformAdSetId?.toLowerCase().includes(q)
    )
  }, [adSets, searchSet])

  const currentAds = useMemo(() => {
    return activeSet?.ads || []
  }, [activeSet])

  useEffect(() => {
    if (currentAds.length > 0 && (!expandedAdId || !currentAds.some(a => a.id === expandedAdId))) {
      setExpandedAdId(currentAds[0].id)
    }
  }, [currentAds, expandedAdId])

  const filteredAds = useMemo(() => {
    return currentAds.filter(ad => {
      const matchSearch =
        !searchAds.trim() ||
        ad.name?.toLowerCase().includes(searchAds.toLowerCase()) ||
        ad.code?.toLowerCase().includes(searchAds.toLowerCase()) ||
        ad.headline?.toLowerCase().includes(searchAds.toLowerCase())
      const matchStatus =
        filterAdsStatus === 'All' ||
        (ad.status || 'ACTIVE').toUpperCase() === filterAdsStatus.toUpperCase()
      return matchSearch && matchStatus
    })
  }, [currentAds, searchAds, filterAdsStatus])

  const otherSetsTotal = useMemo(() => {
    if (activeSetIndex < 0) return 0
    return adSets.reduce((sum, s, idx) => {
      if (idx === activeSetIndex) return sum
      return sum + (Number(s.budget) || 0)
    }, 0)
  }, [adSets, activeSetIndex])

  const remainingForActiveSet = Math.max(plannedBudget - otherSetsTotal, 0)

  const handleAddAdSet = () => {
    const nextSeq = adSets.length + 1
    const defaultBudget = remainingForActiveSet > 0 ? Math.min(remainingForActiveSet, 30000) : 10000
    const newSetId = `set_${Date.now()}`
    const pCode = getProductAbbr()
    const startDateStr = currentCampaign?.startDate ? new Date(currentCampaign.startDate).toISOString().split('T')[0] : ''
    const endDateStr = currentCampaign?.endDate ? new Date(currentCampaign.endDate).toISOString().split('T')[0] : ''

    const newSet: AdSetItem = {
      id: newSetId,
      code: generateAdSetCode(nextSeq),
      name: `${String(nextSeq).padStart(2, '0')} ${pCode} Target Group`,
      platformAdSetId: generatePlatformAdSetId(nextSeq),
      campaignId: currentCampaign?.id || '',
      targetAudience: 'Broad • Thailand • Age 25-65+',
      location: 'ประเทศไทย (Thailand)',
      age: '25-65+',
      placement: 'Advantage+ Placements',
      optimization: 'Maximize messaging conversations',
      budgetType: 'DAILY',
      budget: defaultBudget,
      dailyBudget: Math.round(defaultBudget / 30) || 1000,
      startDate: startDateStr,
      endDate: endDateStr,
      status: 'ACTIVE',
      ads: [
        {
          id: `ad_${Date.now()}_1`,
          code: generateAdCode(1),
          name: 'ชิ้นงานโฆษณา V1',
          platformAdId: `${generatePlatformAdSetId(nextSeq)}-AD01`,
          adSetId: newSetId,
          format: 'IMAGE',
          headline: 'โปรโมชั่นพิเศษ ลดต้นทุนค่าไฟ',
          primaryText: 'เทคโนโลยีพลังงานแสงอาทิตย์ ประสิทธิภาพสูง คุ้มค่าระยะยาว พร้อมบริการติดตั้ง',
          cta: 'Send Message',
          creativeName: `${pCode}_KV_1080x1080.jpg`,
          creativeVersion: 'V1 • Current',
          dimensions: '1080x1080',
          status: 'ACTIVE',
          updatedAt: new Date().toISOString()
        }
      ]
    }

    setAdSets([...adSets, newSet])
    setActiveSetId(newSetId)
    setLocalFeedback({ text: 'เพิ่มชุดโฆษณาใหม่เรียบร้อยแล้ว', type: 'success' })
  }

  const handleUpdateActiveSet = (field: keyof AdSetItem, val: any) => {
    if (activeSetIndex < 0) return
    const updated = [...adSets]
    const current = { ...updated[activeSetIndex], [field]: val }
    if (field === 'budget') {
      const numVal = Number(val) || 0
      current.dailyBudget = Math.round(numVal / 30) || 0
    }
    updated[activeSetIndex] = current
    setAdSets(updated)
  }

  const handleDuplicateAdSet = (setToClone: AdSetItem) => {
    const nextSeq = adSets.length + 1
    const newSetId = `set_${Date.now()}`
    const clonedAds: AdItem[] = (setToClone.ads || []).map((ad, aIdx) => ({
      ...ad,
      id: `ad_${Date.now()}_${aIdx}`,
      code: generateAdCode(aIdx + 1),
      name: `${ad.name} (คัดลอก)`,
      adSetId: newSetId,
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    }))

    const clonedSet: AdSetItem = {
      ...setToClone,
      id: newSetId,
      code: generateAdSetCode(nextSeq),
      name: `${setToClone.name} (คัดลอก)`,
      platformAdSetId: `${setToClone.platformAdSetId || 'AS'}_copy`,
      status: 'DRAFT',
      ads: clonedAds
    }

    setAdSets([...adSets, clonedSet])
    setActiveSetId(newSetId)
    setOpenMenuSetId(null)
    setLocalFeedback({ text: 'คัดลอกชุดโฆษณาเรียบร้อยแล้ว', type: 'success' })
  }

  const handleTogglePauseAdSet = (index: number) => {
    const updated = [...adSets]
    const currentStatus = updated[index].status || 'ACTIVE'
    updated[index] = {
      ...updated[index],
      status: currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    }
    setAdSets(updated)
    setOpenMenuSetId(null)
  }

  const handleArchiveAdSet = (index: number) => {
    const updated = [...adSets]
    updated[index] = { ...updated[index], status: 'ARCHIVED' }
    setAdSets(updated)
    setOpenMenuSetId(null)
    setLocalFeedback({ text: 'เก็บถาวรชุดโฆษณาแล้ว', type: 'success' })
  }

  const handleDeleteAdSet = (index: number) => {
    const updated = adSets.filter((_, i) => i !== index)
    setAdSets(updated)
    setOpenMenuSetId(null)
    if (updated.length > 0) {
      setActiveSetId(updated[Math.max(0, index - 1)].id)
    } else {
      setActiveSetId('')
    }
    setLocalFeedback({ text: 'ลบชุดโฆษณาแล้ว', type: 'success' })
  }

  const handleOpenCreateAdModal = () => {
    if (!activeSet) return
    const nextAdSeq = (activeSet.ads || []).length + 1
    setAdModal({
      isOpen: true,
      mode: 'create',
      data: {
        code: generateAdCode(nextAdSeq),
        name: `ชิ้นงานโฆษณา V${nextAdSeq}`,
        platformAdId: `${activeSet.platformAdSetId || 'AS01'}-AD${String(nextAdSeq).padStart(2, '0')}`,
        format: 'IMAGE',
        headline: 'โปรโมชั่นโซล่าเซลล์ ลดต้นทุนค่าไฟ',
        primaryText: 'ติดตั้งโซล่าเซลล์มาตรฐานสากล บริการระดับมืออาชีพ',
        cta: 'Send Message',
        creativeName: `${getProductAbbr()}_Visual_V${nextAdSeq}.jpg`,
        creativeVersion: `V${nextAdSeq} • Current`,
        status: 'ACTIVE'
      }
    })
  }

  const handleOpenEditAdModal = (ad: AdItem, adIndex: number) => {
    setAdModal({
      isOpen: true,
      mode: 'edit',
      adIndex,
      data: { ...ad }
    })
  }

  const handleSaveAdModal = () => {
    if (activeSetIndex < 0) return
    const updatedSets = [...adSets]
    const targetSet = { ...updatedSets[activeSetIndex] }
    const setAds = [...(targetSet.ads || [])]

    if (adModal.mode === 'create') {
      const newAd: AdItem = {
        id: `ad_${Date.now()}`,
        code: adModal.data.code || generateAdCode(setAds.length + 1),
        name: adModal.data.name || `ชิ้นงาน #${setAds.length + 1}`,
        platformAdId: adModal.data.platformAdId || '',
        adSetId: activeSet?.id,
        format: adModal.data.format || 'IMAGE',
        headline: adModal.data.headline || '',
        primaryText: adModal.data.primaryText || '',
        cta: adModal.data.cta || 'Send Message',
        creativeName: adModal.data.creativeName || '',
        creativeVersion: adModal.data.creativeVersion || 'V1 • Current',
        status: adModal.data.status || 'ACTIVE',
        updatedAt: new Date().toISOString()
      }
      setAds.push(newAd)
      setExpandedAdId(newAd.id)
    } else if (adModal.mode === 'edit' && adModal.adIndex !== undefined) {
      setAds[adModal.adIndex] = {
        ...setAds[adModal.adIndex],
        ...adModal.data,
        updatedAt: new Date().toISOString()
      }
    }

    targetSet.ads = setAds
    updatedSets[activeSetIndex] = targetSet
    setAdSets(updatedSets)
    setAdModal({ isOpen: false, mode: 'create', data: {} })
    setLocalFeedback({ text: 'บันทึกข้อมูลโฆษณาเรียบร้อยแล้ว', type: 'success' })
  }

  const handleDuplicateAd = (adToClone: AdItem) => {
    if (activeSetIndex < 0) return
    const updatedSets = [...adSets]
    const targetSet = { ...updatedSets[activeSetIndex] }
    const setAds = [...(targetSet.ads || [])]
    const nextAdSeq = setAds.length + 1

    const newAd: AdItem = {
      ...adToClone,
      id: `ad_${Date.now()}`,
      code: generateAdCode(nextAdSeq),
      name: `${adToClone.name} (คัดลอก)`,
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    }

    setAds.push(newAd)
    targetSet.ads = setAds
    updatedSets[activeSetIndex] = targetSet
    setAdSets(updatedSets)
    setExpandedAdId(newAd.id)
    setLocalFeedback({ text: 'คัดลอกชิ้นงานโฆษณาเรียบร้อยแล้ว', type: 'success' })
  }

  const handleDeleteAd = (adIndex: number) => {
    if (activeSetIndex < 0) return
    const updatedSets = [...adSets]
    const targetSet = { ...updatedSets[activeSetIndex] }
    const setAds = (targetSet.ads || []).filter((_, i) => i !== adIndex)
    targetSet.ads = setAds
    updatedSets[activeSetIndex] = targetSet
    setAdSets(updatedSets)
    setLocalFeedback({ text: 'ลบชิ้นงานโฆษณาเรียบร้อยแล้ว', type: 'success' })
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setLocalFeedback(null)
    try {
      await onSaveStructure(adSets)
      setLocalFeedback({ text: 'บันทึกโครงสร้างชุดโฆษณาและชิ้นงานทั้งหมดเรียบร้อยแล้ว', type: 'success' })
    } catch (e: any) {
      setLocalFeedback({ text: e?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyUploadedCreative = () => {
    if (activeSetIndex < 0 || uploadModal.adIndex === undefined) return
    const updatedSets = [...adSets]
    const targetSet = { ...updatedSets[activeSetIndex] }
    const setAds = [...(targetSet.ads || [])]
    const fname = uploadModal.fileName.trim() || 'New_Creative.jpg'
    const isVideo = fname.toLowerCase().endsWith('.mp4') || fname.toLowerCase().endsWith('.mov')

    if (setAds[uploadModal.adIndex]) {
      setAds[uploadModal.adIndex] = {
        ...setAds[uploadModal.adIndex],
        creativeName: fname,
        format: isVideo ? 'VIDEO' : 'IMAGE',
        creativeVersion: 'V1 • Current',
        updatedAt: new Date().toISOString()
      }
      targetSet.ads = setAds
      updatedSets[activeSetIndex] = targetSet
      setAdSets(updatedSets)
      setLocalFeedback({ text: `อัปโหลดและผูกไฟล์ ${fname} เข้ากับชิ้นงานเรียบร้อยแล้ว`, type: 'success' })
    }
    setUploadModal({ isOpen: false, fileName: '' })
  }

  const handleSelectCreativeForAd = (creative: CreativeItem) => {
    if (libraryPickerModal.isForAdModal) {
      setAdModal(prev => ({
        ...prev,
        data: {
          ...prev.data,
          creativeName: creative.filename,
          creativeUrl: creative.fileUrl,
          creativeVersion: creative.version,
          dimensions: creative.dimensions,
          format: creative.fileType.includes('Video') ? 'VIDEO' : 'IMAGE'
        }
      }))
    } else if (libraryPickerModal.targetAdIndex !== null && activeSetIndex >= 0) {
      const updatedSets = [...adSets]
      const targetSet = { ...updatedSets[activeSetIndex] }
      const setAds = [...(targetSet.ads || [])]
      if (setAds[libraryPickerModal.targetAdIndex]) {
        setAds[libraryPickerModal.targetAdIndex] = {
          ...setAds[libraryPickerModal.targetAdIndex],
          creativeName: creative.filename,
          creativeUrl: creative.fileUrl,
          creativeVersion: creative.version,
          dimensions: creative.dimensions,
          format: creative.fileType.includes('Video') ? 'VIDEO' : 'IMAGE',
          updatedAt: new Date().toISOString()
        }
        targetSet.ads = setAds
        updatedSets[activeSetIndex] = targetSet
        setAdSets(updatedSets)
        setLocalFeedback({ text: `เชื่อมโยงสื่อ ${creative.name} (${creative.code}) เข้ากับชิ้นงานเรียบร้อยแล้ว`, type: 'success' })
      }
    }
    setLibraryPickerModal({ isOpen: false, targetAdIndex: null, isForAdModal: false })
  }

  if (!currentCampaign) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm max-w-lg mx-auto">
        <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="font-bold text-gray-800 text-lg">ยังไม่ได้เลือกแคมเปญ</h3>
        <p className="text-gray-500 text-sm mt-1 mb-6">กรุณากลับไปเลือกหรือสร้างแคมเปญในแท็บข้อมูลแคมเปญก่อน</p>
        <button
          onClick={onBack}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
        >
          กลับไปเลือกแคมเปญ
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Local feedback message */}
      {localFeedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm animate-in fade-in duration-200 ${localFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
            }`}
        >
          <div className="flex items-center gap-2">
            {localFeedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="text-red-600" />
            )}
            <span className="font-medium">{localFeedback.text}</span>
          </div>
          <button
            onClick={() => setLocalFeedback(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. TOP CAMPAIGN SUMMARY CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          {/* Left: Campaign Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              AD
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                  {currentCampaign.internalCode || currentCampaign.campaignId || 'CMP-SP-001'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  {channelDisplayName}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                  {productDisplayName}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                  {objectiveDisplayName}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  กลยุทธ์: {campaignBudgetStrategy}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 truncate" title={currentCampaign.name}>
                {currentCampaign.name}
              </h2>
            </div>
          </div>

          {/* Right: Aligned Metrics & Action Button */}
          <div className="flex items-center gap-3 self-end xl:self-center shrink-0">
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl px-4 py-2 text-right h-11 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">งบประมาณที่วางแผนไว้</div>
              <div className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                ฿{plannedBudget.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl px-4 py-2 text-right h-11 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">จัดสรรให้ชุดโฆษณาแล้ว</div>
              <div className={`text-base sm:text-lg font-black leading-tight ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                ฿{totalAllocated.toLocaleString()}
                <span className="text-xs font-normal text-gray-400 ml-1">/ ฿{plannedBudget.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => onEditCampaign(currentCampaign)}
              className="h-11 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
            >
              <Pencil size={13} />
              แก้ไขแคมเปญ (Edit Campaign)
            </button>
          </div>
        </div>

        {/* Dynamic Budget Allocation Bar */}
        <div className="space-y-1.5 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium flex items-center gap-1.5">
              <span>สัดส่วนการจัดสรรงบประมาณ:</span>
              <strong className="text-gray-800 font-bold">{budgetRatio.toFixed(1)}%</strong>
            </span>
            <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-700'}`}>
              {isOverBudget
                ? `เกินงบประมาณที่วางแผน ฿${(totalAllocated - plannedBudget).toLocaleString()}`
                : `คงเหลือจัดสรรได้อีก ฿${Math.max(plannedBudget - totalAllocated, 0).toLocaleString()}`}
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-red-500' : budgetRatio > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              style={{ width: `${Math.min(budgetRatio, 100)}%` }}
            />
          </div>
          {isOverBudget && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>
                คำเตือน: งบประมาณรวมของชุดโฆษณา (฿{totalAllocated.toLocaleString()}) เกินงบที่กำหนดไว้ในแคมเปญ (฿{plannedBudget.toLocaleString()}) กรุณาปรับลดงบประมาณชุดโฆษณา
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE SPLIT VIEW: AD SET LIST (LEFT) & AD SET DETAILS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: AD SET LIST */}
        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-gray-900 text-sm">รายการชุดโฆษณา</h3>
                <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                  {adSets.length}
                </span>
              </div>
              <button
                onClick={handleAddAdSet}
                className="h-8.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0 whitespace-nowrap"
              >
                <Plus size={13} />
                เพิ่มชุดโฆษณา
              </button>
            </div>

            {/* Search box */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={13} />
              <input
                type="text"
                value={searchSet}
                onChange={e => setSearchSet(e.target.value)}
                placeholder="ค้นหาชุดโฆษณา..."
                className="w-full h-9 pl-8.5 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>

            {/* Ad Sets Cards List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
              {filteredAdSets.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl my-2">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2.5">
                    <Plus size={18} />
                  </div>
                  <div className="text-xs font-bold text-gray-700 mb-1">ยังไม่มีชุดโฆษณาในแคมเปญนี้</div>
                  <p className="text-[11px] text-gray-500">
                    คลิก "+ เพิ่มชุดโฆษณา" ด้านบนเพื่อเริ่มกำหนดกลุ่มเป้าหมายแรก
                  </p>
                </div>
              ) : (
                filteredAdSets.map((s, idx) => {
                  const isSelected = s.id === activeSetId
                  const originalIndex = adSets.findIndex(item => item.id === s.id)
                  const adCount = (s.ads || []).length
                  const creativeCount = (s.ads || []).filter(a => a.creativeName).length

                  return (
                    <div
                      key={s.id}
                      onClick={() => setActiveSetId(s.id)}
                      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${isSelected
                        ? 'border-red-500 bg-red-50/30 shadow-sm ring-1 ring-red-400'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {String(originalIndex + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-xs leading-snug truncate">
                              {s.name || `ชุดโฆษณา #${originalIndex + 1}`}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 truncate">
                              {s.code || `AS-${originalIndex + 1}`} • {s.platformAdSetId || '-'}
                            </div>
                          </div>
                        </div>

                        {/* Status & 3-dots Menu */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : s.status === 'PAUSED'
                                ? 'bg-amber-50 text-amber-700'
                                : s.status === 'ARCHIVED'
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                          >
                            {s.status || 'ACTIVE'}
                          </span>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                setOpenMenuSetId(openMenuSetId === s.id ? null : s.id)
                              }}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {openMenuSetId === s.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-6 z-30 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-xs"
                              >
                                <button
                                  onClick={() => handleDuplicateAdSet(s)}
                                  className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Copy size={12} /> คัดลอก (Duplicate)
                                </button>
                                <button
                                  onClick={() => handleTogglePauseAdSet(originalIndex)}
                                  className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  {s.status === 'ACTIVE' ? (
                                    <>
                                      <Pause size={12} className="text-amber-600" /> พักโฆษณา (Pause)
                                    </>
                                  ) : (
                                    <>
                                      <Play size={12} className="text-emerald-600" /> เปิดโฆษณา (Resume)
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleArchiveAdSet(originalIndex)}
                                  className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Archive size={12} /> เก็บถาวร (Archive)
                                </button>
                                <div className="h-px bg-gray-100 my-1" />
                                <button
                                  onClick={() => handleDeleteAdSet(originalIndex)}
                                  className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 size={12} /> ลบชุดโฆษณา
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metadata snippet */}
                      <div className="mt-2 text-[11px] text-gray-500 truncate">
                        {s.targetAudience || 'Broad • Thailand'}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-900">
                          ฿{(Number(s.budget) || 0).toLocaleString()}
                          <span className="text-[10px] font-normal text-gray-400 ml-1">
                            (฿{(s.dailyBudget || Math.round((Number(s.budget) || 0) / 30)).toLocaleString()}/วัน)
                          </span>
                        </span>
                        <span className="text-gray-400 font-medium">
                          {adCount} ชิ้นงาน • {creativeCount} สื่อ
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>ชุดโฆษณาทั้งหมด {adSets.length} ชุด</span>
            <span className="font-bold text-gray-900">
              รวม ฿{totalAllocated.toLocaleString()}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: AD SET DETAILS FORM */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
          {activeSet ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-red-100 text-red-700 font-black text-xs flex items-center justify-center">
                    {String(activeSetIndex + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">
                      รายละเอียดชุดโฆษณา (Ad Set Details)
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      รหัสระบบ: {activeSet.code || `AS-${activeSetIndex + 1}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">สถานะ:</span>
                  <select
                    value={activeSet.status || 'ACTIVE'}
                    onChange={e => handleUpdateActiveSet('status', e.target.value)}
                    className="h-8.5 text-xs font-bold px-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-red-500 shrink-0"
                  >
                    <option value="ACTIVE">ACTIVE (เปิดใช้งาน)</option>
                    <option value="PAUSED">PAUSED (พักชั่วคราว)</option>
                    <option value="DRAFT">DRAFT (ฉบับร่าง)</option>
                    <option value="ARCHIVED">ARCHIVED (เก็บถาวร)</option>
                  </select>
                </div>
              </div>

              {/* Form Grid: 4 Balanced Rows with 3 Columns each */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ROW 1: Identity */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    ชื่อชุดโฆษณา (Ad Set Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={activeSet.name || ''}
                    onChange={e => handleUpdateActiveSet('name', e.target.value)}
                    className="w-full h-9.5 text-xs font-semibold px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    รหัสแพลตฟอร์ม (Platform Ad Set ID)
                  </label>
                  <input
                    type="text"
                    value={activeSet.platformAdSetId || ''}
                    onChange={e => handleUpdateActiveSet('platformAdSetId', e.target.value)}
                    placeholder="e.g. 120209834001-AS01"
                    className="w-full h-9.5 text-xs font-mono px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    รหัสอ้างอิงระบบ (Internal Code)
                  </label>
                  <input
                    type="text"
                    value={activeSet.code || generateAdSetCode(activeSetIndex + 1)}
                    readOnly
                    className="w-full h-9.5 text-xs font-mono font-bold px-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* ROW 2: Targeting & Location */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    กลุ่มเป้าหมาย (Target Audience)
                  </label>
                  <input
                    type="text"
                    value={activeSet.targetAudience || ''}
                    onChange={e => handleUpdateActiveSet('targetAudience', e.target.value)}
                    placeholder="เช่น เกษตรกร, เจ้าของฟาร์ม"
                    className="w-full h-9.5 text-xs px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    พื้นที่เป้าหมาย (Location)
                  </label>
                  <input
                    type="text"
                    value={activeSet.location || 'ประเทศไทย'}
                    onChange={e => handleUpdateActiveSet('location', e.target.value)}
                    placeholder="เช่น ประเทศไทย (ทุกจังหวัด)"
                    className="w-full h-9.5 text-xs px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    ช่วงอายุ (Age Range)
                  </label>
                  <input
                    type="text"
                    value={activeSet.age || '25-65+'}
                    onChange={e => handleUpdateActiveSet('age', e.target.value)}
                    placeholder="เช่น 25-65+"
                    className="w-full h-9.5 text-xs px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* ROW 3: Delivery & Optimization */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    ตำแหน่งจัดวาง (Placement)
                  </label>
                  <select
                    value={activeSet.placement || 'Advantage+ Placements'}
                    onChange={e => handleUpdateActiveSet('placement', e.target.value)}
                    className="w-full h-9.5 text-xs px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Advantage+ Placements">Advantage+ Placements (แนะนำ)</option>
                    <option value="Feeds & Stories">เฉพาะ Feeds & Stories</option>
                    <option value="Reels Only">เฉพาะ Reels / Video Feed</option>
                    <option value="Manual">กำหนดตำแหน่งเอง (Manual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    เป้าหมายการเพิ่มประสิทธิภาพ (Optimization)
                  </label>
                  <select
                    value={activeSet.optimization || 'Maximize messaging conversations'}
                    onChange={e => handleUpdateActiveSet('optimization', e.target.value)}
                    className="w-full h-9.5 text-xs px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Maximize messaging conversations">เพิ่มการสนทนาข้อความ (Messages)</option>
                    <option value="Maximize leads">เพิ่มจำนวนลีด (Leads / Form)</option>
                    <option value="Maximize link clicks">เพิ่มจำนวนการคลิก (Clicks)</option>
                    <option value="Maximize impressions">เพิ่มการมองเห็นสูงสุด (Reach/Awareness)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    ประเภทงบประมาณ (Budget Type)
                  </label>
                  <select
                    value={activeSet.budgetType || 'DAILY'}
                    onChange={e => handleUpdateActiveSet('budgetType', e.target.value)}
                    className="w-full h-9.5 text-xs font-semibold px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="DAILY">งบประมาณรายวัน (Daily Budget)</option>
                    <option value="LIFETIME">งบประมาณตลอดอายุ (Lifetime Budget)</option>
                  </select>
                </div>

                {/* ROW 4: Budget & Schedule */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-600">
                      งบประมาณจัดสรร (Allocated Budget) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                      โควตาคงเหลือ ฿{remainingForActiveSet.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">฿</span>
                    <input
                      type="number"
                      step="500"
                      value={activeSet.budget || 0}
                      onChange={e => handleUpdateActiveSet('budget', parseFloat(e.target.value) || 0)}
                      className="w-full h-9.5 text-xs font-bold pl-7 pr-3 bg-amber-50/50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    งบประมาณรายวันเฉลี่ย (Daily Budget)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">฿</span>
                    <input
                      type="number"
                      value={activeSet.dailyBudget || Math.round((Number(activeSet.budget) || 0) / 30)}
                      onChange={e => handleUpdateActiveSet('dailyBudget', parseFloat(e.target.value) || 0)}
                      className="w-full h-9.5 text-xs font-bold pl-7 pr-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    ระยะเวลาแสดงผล (Schedule)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={activeSet.startDate || ''}
                      onChange={e => handleUpdateActiveSet('startDate', e.target.value)}
                      className="w-full h-9.5 text-xs px-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white"
                      title="วันที่เริ่มต้น"
                    />
                    <input
                      type="date"
                      value={activeSet.endDate || ''}
                      onChange={e => handleUpdateActiveSet('endDate', e.target.value)}
                      className="w-full h-9.5 text-xs px-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white"
                      title="วันที่สิ้นสุด"
                    />
                  </div>
                </div>
              </div>

              {/* Action footer for Ad Set with aligned nowrap buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 min-w-0">
                  <Info size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">แก้ไขข้อมูลชุดโฆษณาแล้วคลิก "บันทึกชุดโฆษณา" หรือบันทึกรวมทั้งหมดด้านล่าง</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDuplicateAdSet(activeSet)}
                    className="h-9 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Copy size={13} />
                    คัดลอกชุดโฆษณา
                  </button>
                  <button
                    onClick={() => handleArchiveAdSet(activeSetIndex)}
                    className="h-9 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Archive size={13} />
                    เก็บถาวร
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="h-9 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกชุดโฆษณา (Save Ad Set)'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              กรุณาเลือกชุดโฆษณาจากรายการด้านซ้ายเพื่อดูและแก้ไขรายละเอียด
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM SECTION: ADS IN SELECTED AD SET */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Tier 1: Header Title & Main Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
            <h3 className="text-base font-black text-gray-900 whitespace-nowrap">
              ชิ้นงานโฆษณาในชุดโฆษณา (Ads in Selected Ad Set)
            </h3>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap truncate ${activeSet
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
            >
              {activeSet ? `${activeSet.name} (${currentAds.length} ชิ้นงาน)` : 'ไม่ได้เลือก (0 ชิ้นงาน)'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenCreateAdModal}
              disabled={!activeSet}
              className="h-9 px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              + เพิ่มโฆษณา
            </button>

            <button
              onClick={() => {
                if (currentAds.length > 0) {
                  setUploadModal({ isOpen: true, adIndex: 0, fileName: '' })
                } else {
                  handleOpenCreateAdModal()
                }
              }}
              disabled={!activeSet}
              className="h-9 px-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Upload size={13} className="text-red-500" />
              อัปโหลดสื่อใหม่
            </button>

            <button
              onClick={() => {
                setLibraryPickerModal({ isOpen: true, targetAdIndex: null })
              }}
              className="h-9 px-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FolderOpen size={13} className="text-amber-500" />
              เลือกจากคลังสื่อ (Creative Library)
            </button>
          </div>
        </div>

        {/* Tier 2: Symmetrical Guidance & Filters Toolbar */}
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 min-w-0">
            <Info size={13} className="text-blue-500 shrink-0" />
            <span className="truncate">
              ไฟล์ที่อัปโหลดใหม่จะถูกบันทึกลงในคลังสื่อโฆษณาโดยอัตโนมัติ และสามารถนำกลับมาใช้ซ้ำได้
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Status */}
            <select
              value={filterAdsStatus}
              onChange={e => setFilterAdsStatus(e.target.value)}
              className="h-8 text-xs px-2.5 bg-white border border-gray-200 rounded-lg outline-none font-medium text-gray-700 focus:ring-2 focus:ring-red-500 shrink-0"
            >
              <option value="All">ทุกสถานะ (All Status)</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>

            {/* Search Ads */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-2 text-gray-400" size={13} />
              <input
                type="text"
                value={searchAds}
                onChange={e => setSearchAds(e.target.value)}
                placeholder="ค้นหาชิ้นงาน..."
                className="h-8 pl-8 pr-3 text-xs bg-white border border-gray-200 rounded-lg outline-none w-36 sm:w-48 transition-all focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Ads Table: Balanced 6-Column Layout fitting standard screens without awkward horizontal scrollbar */}
        <div className="border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center whitespace-nowrap">#</th>
                <th className="py-3 px-3 w-48 whitespace-nowrap">สื่อโฆษณา (Media)</th>
                <th className="py-3 px-3 w-52 whitespace-nowrap">ชิ้นงาน & รหัส (Ad Name & Code)</th>
                <th className="py-3 px-3 min-w-[220px] whitespace-nowrap">หัวข้อและข้อความ (Headline & Copy)</th>
                <th className="py-3 px-3 w-24 text-center whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-3 w-28 text-right whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 font-medium">
                    {!activeSet
                      ? 'กรุณาเลือกชุดโฆษณาก่อน'
                      : 'ยังไม่มีชิ้นงานโฆษณาในชุดนี้ คลิก "+ เพิ่มโฆษณา" เพื่อสร้างชิ้นงานแรก'}
                  </td>
                </tr>
              ) : (
                filteredAds.map((ad, idx) => {
                  const isExpanded = expandedAdId === ad.id
                  const isVideo = ad.format === 'VIDEO' || ad.creativeName?.toLowerCase().endsWith('.mp4')

                  return (
                    <React.Fragment key={ad.id}>
                      <tr
                        onClick={() => setExpandedAdId(isExpanded ? '' : ad.id)}
                        className={`hover:bg-gray-50/80 transition-colors cursor-pointer ${isExpanded ? 'bg-red-50/20' : ''
                          }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-gray-400 font-bold">
                          {String(idx + 1).padStart(2, '0')}
                        </td>

                        {/* Creative Media Preview */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 text-gray-400">
                              {isVideo ? (
                                <Film size={18} className="text-purple-600" />
                              ) : (
                                <ImageIcon size={18} className="text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0 truncate max-w-[130px]">
                              <div className="font-semibold text-gray-800 text-xs truncate" title={ad.creativeName}>
                                {ad.creativeName || 'ยังไม่ได้ผูกไฟล์'}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                <span>{ad.dimensions || '1080x1080'}</span>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold">{ad.creativeVersion || 'V1'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Name, Code & Format */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900 text-xs truncate" title={ad.name}>
                            {ad.name}
                          </div>
                          <div className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
                            {ad.code || `AD-${idx + 1}`} • {ad.platformAdId || '-'}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${ad.format === 'VIDEO'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : ad.format === 'CAROUSEL'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                            >
                              {ad.format || 'IMAGE'}
                            </span>
                          </div>
                        </td>

                        {/* Headline, Primary Text & CTA */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900 truncate text-xs" title={ad.headline}>
                            {ad.headline || '-'}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate mt-0.5" title={ad.primaryText}>
                            {ad.primaryText || '-'}
                          </div>
                          <div className="mt-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                              CTA: {ad.cta || 'Send Message'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${ad.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : ad.status === 'PAUSED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : ad.status === 'ARCHIVED'
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}
                          >
                            {ad.status || 'ACTIVE'}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setPreviewModal({ isOpen: true, ad })}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="ดูตัวอย่างโฆษณา (Preview)"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEditAdModal(ad, idx)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                              title="แก้ไขข้อมูล (Edit)"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDuplicateAd(ad)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="คัดลอกชิ้นงาน (Duplicate)"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteAd(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="ลบชิ้นงาน (Delete)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Quick Action Sub-bar */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-gray-200">
                          <td colSpan={6} className="py-2.5 px-4">
                            <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700">คำสั่งด่วน:</span>
                                <span className="font-mono text-[11px] text-gray-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {ad.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    setLibraryPickerModal({ isOpen: true, targetAdIndex: idx })
                                  }}
                                  className="h-7.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                >
                                  <FolderOpen size={12} className="text-amber-500" />
                                  เลือกจากคลังสื่อ
                                </button>

                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    setUploadModal({ isOpen: true, adIndex: idx, fileName: '' })
                                  }}
                                  className="h-7.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                >
                                  <Upload size={12} className="text-blue-500" />
                                  เปลี่ยนไฟล์สื่อ
                                </button>

                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleDuplicateAd(ad)
                                  }}
                                  className="h-7.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                >
                                  <Plus size={12} className="text-emerald-500" />
                                  เพิ่มเวอร์ชั่นใหม่
                                </button>

                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    setPreviewModal({ isOpen: true, ad })
                                  }}
                                  className="h-7.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                >
                                  <Eye size={12} />
                                  ดูตัวอย่างจริง (Preview)
                                </button>

                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleOpenEditAdModal(ad, idx)
                                  }}
                                  className="h-7.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                >
                                  <Pencil size={12} />
                                  แก้ไขรายละเอียด
                                </button>

                                <Link
                                  href={`/marketing/ads/performance`}
                                  onClick={e => e.stopPropagation()}
                                  className="h-7.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                >
                                  <ChartIcon size={12} />
                                  ดูประสิทธิภาพ
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            ทั้งหมด <strong className="text-gray-900">{currentAds.length}</strong> ชิ้นงานโฆษณาในชุดนี้ •{' '}
            <strong className="text-gray-900">{currentAds.filter(a => a.creativeName).length}</strong> ไฟล์สื่อพร้อมใช้งาน
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="h-10 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all"
            >
              ย้อนกลับ (Back)
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด (Save Changes)'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT AD */}
      {adModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-base">
                {adModal.mode === 'create' ? '+ เพิ่มชิ้นงานโฆษณาใหม่ (New Ad)' : 'แก้ไขชิ้นงานโฆษณา (Edit Ad)'}
              </h3>
              <button
                onClick={() => setAdModal({ isOpen: false, mode: 'create', data: {} })}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">รหัสชิ้นงาน (Code)</label>
                  <input
                    type="text"
                    value={adModal.data.code || ''}
                    onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, code: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">รหัสบนแพลตฟอร์ม (Platform Ad ID)</label>
                  <input
                    type="text"
                    value={adModal.data.platformAdId || ''}
                    onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, platformAdId: e.target.value } })}
                    placeholder="เช่น FB-AD-001"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">ชื่อชิ้นงานโฆษณา (Ads Name) *</label>
                <input
                  type="text"
                  value={adModal.data.name || ''}
                  onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, name: e.target.value } })}
                  placeholder="เช่น Water Strong V1"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">รูปแบบสื่อ (Format)</label>
                  <select
                    value={adModal.data.format || 'IMAGE'}
                    onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, format: e.target.value as any } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="IMAGE">ภาพนิ่ง (Single Image)</option>
                    <option value="VIDEO">วิดีโอ (Video)</option>
                    <option value="CAROUSEL">รูปภาพหลายภาพ (Carousel)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">ปุ่มดำเนินการ (CTA Button)</label>
                  <select
                    value={adModal.data.cta || 'Send Message'}
                    onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, cta: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="Send Message">ส่งข้อความ (Send Message)</option>
                    <option value="Learn More">เรียนรู้เพิ่มเติม (Learn More)</option>
                    <option value="Contact Us">ติดต่อเรา (Contact Us)</option>
                    <option value="Sign Up">ลงทะเบียน (Sign Up)</option>
                    <option value="Shop Now">สั่งซื้อเลย (Shop Now)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">หัวข้อโฆษณา (Headline)</label>
                <input
                  type="text"
                  value={adModal.data.headline || ''}
                  onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, headline: e.target.value } })}
                  placeholder="เช่น ปั๊มน้ำโซล่าเซลล์ ทนทาน คุ้มค่า"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">ข้อความหลัก (Primary Text)</label>
                <textarea
                  rows={3}
                  value={adModal.data.primaryText || ''}
                  onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, primaryText: e.target.value } })}
                  placeholder="เขียนแคปชั่นโปรโมชั่น จุดเด่นสินค้า ข้อมูลติดต่อ..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-600">ชื่อไฟล์สื่อ (Creative File)</label>
                    <button
                      type="button"
                      onClick={() => setLibraryPickerModal({ isOpen: true, targetAdIndex: null, isForAdModal: true })}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <FolderOpen size={11} /> เลือกจากคลังสื่อ
                    </button>
                  </div>
                  <input
                    type="text"
                    value={adModal.data.creativeName || ''}
                    onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, creativeName: e.target.value } })}
                    placeholder="เช่น Solar_Pump_KV.jpg"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">เวอร์ชั่น (Version)</label>
                  <input
                    type="text"
                    value={adModal.data.creativeVersion || 'V1 • Current'}
                    onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, creativeVersion: e.target.value } })}
                    placeholder="เช่น V1 • Current"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">สถานะชิ้นงาน (Status)</label>
                <select
                  value={adModal.data.status || 'ACTIVE'}
                  onChange={e => setAdModal({ ...adModal, data: { ...adModal.data, status: e.target.value as any } })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (เปิดใช้งาน)</option>
                  <option value="DRAFT">DRAFT (ฉบับร่าง)</option>
                  <option value="PAUSED">PAUSED (พักชั่วคราว)</option>
                  <option value="ARCHIVED">ARCHIVED (เก็บถาวร)</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setAdModal({ isOpen: false, mode: 'create', data: {} })}
                className="px-4 py-2 border border-gray-200 hover:bg-white text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={handleSaveAdModal}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                บันทึกชิ้นงาน (Save Ad)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REALISTIC SOCIAL AD PREVIEW */}
      {previewModal.isOpen && previewModal.ad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-red-600" />
                <h3 className="font-black text-gray-900 text-sm">
                  ตัวอย่างโฆษณาจำลอง (Feed Preview)
                </h3>
              </div>
              <button
                onClick={() => setPreviewModal({ isOpen: false, ad: null })}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Page header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                    TG
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-xs">TERA Group Official</div>
                    <div className="text-[10px] text-gray-400">Sponsored • ได้รับการสนับสนุน</div>
                  </div>
                </div>
                <MoreVertical size={14} className="text-gray-400" />
              </div>

              {/* Primary text */}
              <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                {previewModal.ad.primaryText || 'เทคโนโลยีพลังงานแสงอาทิตย์สำหรับฟาร์มและการเกษตร ติดตั้งได้มาตรฐาน พร้อมรับประกัน'}
              </p>

              {/* Media box */}
              <div className="aspect-square bg-gradient-to-tr from-slate-900 to-slate-700 rounded-xl relative overflow-hidden flex flex-col items-center justify-center text-white p-4 shadow-inner">
                {previewModal.ad.format === 'VIDEO' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
                      <Play size={24} className="text-white ml-1" />
                    </div>
                    <div className="text-xs font-mono text-gray-200">
                      {previewModal.ad.creativeName || 'Sample_Video.mp4'}
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon size={48} className="text-white/40 mb-2" />
                    <div className="text-xs font-mono text-gray-200">
                      {previewModal.ad.creativeName || 'Sample_KV.jpg'}
                    </div>
                  </>
                )}
                <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-white/80">
                  {previewModal.ad.dimensions || '1080x1080'}
                </div>
              </div>

              {/* Bottom bar with headline and CTA */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase text-gray-400">TERAGROUP.CO.TH</div>
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {previewModal.ad.headline || 'โปรโมชั่นพิเศษ'}
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold whitespace-nowrap hover:bg-black transition-all">
                  {previewModal.ad.cta || 'Send Message'}
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <button
                onClick={() => setPreviewModal({ isOpen: false, ad: null })}
                className="text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                ปิดหน้าต่างตัวอย่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD CREATIVE */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-sm">
                อัปโหลดสื่อโฆษณาใหม่ (Upload Creative)
              </h3>
              <button
                onClick={() => setUploadModal({ isOpen: false, fileName: '' })}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-red-400 transition-colors bg-gray-50/50">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="font-bold text-gray-700">ลากไฟล์มาวางที่นี่ หรือพิมพ์ระบุชื่อไฟล์</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  รองรับ JPG, PNG, MP4 ขนาดแนะนำ 1080x1080 หรือ 1080x1920
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">
                  ชื่อไฟล์สื่อ (Creative File Name)
                </label>
                <input
                  type="text"
                  value={uploadModal.fileName}
                  onChange={e => setUploadModal({ ...uploadModal, fileName: e.target.value })}
                  placeholder="เช่น Solar_Agri_2026_KV.jpg หรือ Clip_Demo.mp4"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="text-[11px] text-gray-500 bg-blue-50 p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
                <Info size={14} className="text-blue-600 shrink-0" />
                <span>ไฟล์ที่ระบุจะถูกผูกเข้ากับชิ้นงานนี้ และบันทึกลงในคลังสื่อโฆษณา (Creative Library) ให้ทันที</span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setUploadModal({ isOpen: false, fileName: '' })}
                className="px-4 py-2 border border-gray-200 hover:bg-white text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApplyUploadedCreative}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                ยืนยันการบันทึกสื่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECT FROM CREATIVE LIBRARY */}
      {libraryPickerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-red-600" />
                <div>
                  <h3 className="font-black text-gray-900 text-sm">
                    เลือกสื่อจากคลังสื่อโฆษณา (Select from Creative Library)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    เลือกชิ้นงาน Creative ที่ต้องการเพื่อนำมาใช้กับโฆษณานี้ทันที
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLibraryPickerModal({ isOpen: false, targetAdIndex: null })}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row items-center gap-3 bg-white">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสื่อ, รหัส หรือชื่อไฟล์..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>

              <select
                value={pickerProduct}
                onChange={e => setPickerProduct(e.target.value)}
                className="text-xs py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none w-full sm:w-auto"
              >
                <option value="All">ทุกกลุ่มสินค้า (All Products)</option>
                <option value="Solar Pump">Solar Pump</option>
                <option value="Solar Rooftop">Solar Rooftop</option>
                <option value="Inverter / VSD">Inverter / VSD</option>
                <option value="Battery Storage">Battery Storage</option>
              </select>
            </div>

            {/* Assets Grid */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {libraryItems.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-red-500" />
                  <p className="text-xs">กำลังโหลดคลังสื่อโฆษณา...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {libraryItems
                    .filter(item => {
                      const matchSearch =
                        !pickerSearch.trim() ||
                        item.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                        item.code.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                        item.filename.toLowerCase().includes(pickerSearch.toLowerCase())
                      const matchProd = pickerProduct === 'All' || item.product === pickerProduct
                      return matchSearch && matchProd
                    })
                    .map(item => {
                      const isVid = item.fileType.includes('Video') || item.filename.endsWith('.mp4')
                      return (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-xl overflow-hidden hover:border-red-500 hover:shadow-md transition-all flex flex-col bg-white"
                        >
                          <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                            <img
                              src={item.thumbnailUrl || item.fileUrl}
                              alt={item.name}
                              className="w-full h-full object-cover opacity-85"
                              onError={(e: any) => {
                                e.target.onerror = null
                                e.target.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                              }}
                            />
                            {isVid && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow">
                                  <Play size={16} className="text-gray-900 fill-gray-900 ml-0.5" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                              {item.dimensions}
                            </div>
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-400 font-bold">{item.code}</span>
                                <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                  {item.version}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5" title={item.name}>
                                {item.name}
                              </h4>
                              <p className="text-[10px] text-gray-400 font-mono truncate" title={item.filename}>
                                {item.filename}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectCreativeForAd(item)}
                              className="w-full py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                            >
                              <Check size={12} /> เลือกใช้ชิ้นงานนี้
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                หรือไปที่หน้า <button onClick={() => { setLibraryPickerModal({ isOpen: false, targetAdIndex: null }); onOpenCreativeLibrary() }} className="text-red-600 font-bold hover:underline">Creative Library</button> เพื่ออัปโหลดไฟล์ใหม่
              </span>
              <button
                onClick={() => setLibraryPickerModal({ isOpen: false, targetAdIndex: null })}
                className="px-4 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * CreativeLibraryView Component for Subtab 3 (คลังสื่อโฆษณา)
 * Complete Creative Asset Management Suite matching mockup specifications
 */
function CreativeLibraryView({
  campaigns,
  onSelectAdSet
}: {
  campaigns: any[]
  onSelectAdSet: (campId?: string, adCode?: string) => void
}) {
  const [creatives, setCreatives] = useState<CreativeItem[]>([])
  const [adUsageMap, setAdUsageMap] = useState<Record<string, Array<{
    campaignName: string
    campaignId?: string
    adSetName: string
    adName: string
    adCode: string
    status: string
  }>>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filters & State
  const [selectedId, setSelectedId] = useState<string>('cr_001')
  const [search, setSearch] = useState('')
  const [filterProduct, setFilterProduct] = useState('All Products')
  const [filterFileType, setFilterFileType] = useState('All File Types')
  const [filterUsage, setFilterUsage] = useState('All Usage Status')
  const [filterStatus, setFilterStatus] = useState('All Creative Status')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [manageArchivedMode, setManageArchivedMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  // Modals & Popups
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState<{
    url: string
    title: string
    isVideo: boolean
    dimensions?: string
    size?: string
    version?: string
  } | null>(null)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>('')
  const [uploadName, setUploadName] = useState('')
  const [uploadProduct, setUploadProduct] = useState('Solar Pump')
  const [uploadIsPrimary, setUploadIsPrimary] = useState(true)
  const [uploadStatus, setUploadStatus] = useState<'Active' | 'Draft'>('Active')
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false)

  // Version Form State
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionPreviewUrl, setVersionPreviewUrl] = useState<string>('')
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const versionFileInputRef = useRef<HTMLInputElement>(null)

  // Load Creatives list from server
  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await getCreativesList()
      if (res.success && res.creatives) {
        setCreatives(res.creatives)
        if (res.adUsageMap) setAdUsageMap(res.adUsageMap)
        if (res.creatives.length > 0 && !selectedId) {
          setSelectedId(res.creatives[0].id)
        }
      }
    } catch (e: any) {
      console.error('Error fetching creatives:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Currently selected creative item
  const selectedCreative = useMemo(() => {
    return creatives.find(c => c.id === selectedId) || creatives[0] || null
  }, [creatives, selectedId])

  // Get usage for a creative item
  const getCreativeUsage = (cr: CreativeItem) => {
    const list =
      adUsageMap[cr.code] ||
      adUsageMap[cr.filename] ||
      adUsageMap[cr.name] ||
      []
    return list
  }

  // 5 KPI Calculations
  const kpiStats = useMemo(() => {
    const total = creatives.length
    const images = creatives.filter(c => {
      const t = (c.fileType || '').toLowerCase()
      return t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('webp')
    }).length
    const videos = creatives.filter(c => {
      const t = (c.fileType || '').toLowerCase()
      return t.includes('video') || t.includes('mp4') || t.includes('mov')
    }).length
    const inUse = creatives.filter(c => getCreativeUsage(c).length > 0).length
    const archived = creatives.filter(c => c.status === 'Archived').length

    return { total, images, videos, inUse, archived }
  }, [creatives, adUsageMap])

  // Filtered creatives list
  const filteredCreatives = useMemo(() => {
    return creatives.filter(c => {
      // Archive mode filter
      if (manageArchivedMode && c.status !== 'Archived') return false
      if (!manageArchivedMode && filterStatus === 'All Creative Status' && c.status === 'Archived') return false

      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = c.name?.toLowerCase().includes(q)
        const matchCode = c.code?.toLowerCase().includes(q)
        const matchFile = c.filename?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchFile) return false
      }

      // Product
      if (filterProduct !== 'All Products' && c.product !== filterProduct) {
        return false
      }

      // File Type
      if (filterFileType !== 'All File Types') {
        const isVid = c.fileType.toLowerCase().includes('video') || c.filename.endsWith('.mp4')
        if (filterFileType === 'Videos' && !isVid) return false
        if (filterFileType === 'Images' && isVid) return false
      }

      // Usage Status
      if (filterUsage !== 'All Usage Status') {
        const isUsed = getCreativeUsage(c).length > 0
        if (filterUsage === 'In Use' && !isUsed) return false
        if (filterUsage === 'Not Used' && isUsed) return false
      }

      // Creative Status
      if (filterStatus !== 'All Creative Status' && c.status !== filterStatus) {
        return false
      }

      return true
    })
  }, [creatives, search, filterProduct, filterFileType, filterUsage, filterStatus, manageArchivedMode, adUsageMap])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCreatives.length / pageSize))
  const paginatedCreatives = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCreatives.slice(start, start + pageSize)
  }, [filteredCreatives, currentPage, pageSize])

  // Upload handler
  const handleStartUpload = async () => {
    if (!uploadFile) {
      setToast({ text: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด', type: 'error' })
      return
    }
    setIsSubmittingUpload(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const uploadRes = await uploadCreativeToObjectStorage(formData)
      if (!uploadRes.success) throw new Error(uploadRes.error)

      const createRes = await createCreativeRecord({
        name: uploadName.trim() || uploadFile.name.replace(/\.[^/.]+$/, ''),
        filename: uploadRes.filename || uploadFile.name,
        fileType: uploadRes.fileType || 'JPG Image',
        fileSize: uploadRes.fileSize || '2.0 MB',
        fileUrl: uploadRes.fileUrl || '',
        dimensions: uploadRes.dimensions || '1080 x 1080 px',
        product: uploadProduct,
        isPrimary: uploadIsPrimary,
        status: uploadStatus
      })

      if (createRes.success && createRes.creative) {
        setCreatives(prev => [createRes.creative, ...prev])
        setSelectedId(createRes.creative.id)
        setToast({ text: `อัปโหลดชิ้นงาน ${createRes.creative.code} เรียบร้อยแล้ว`, type: 'success' })
        setUploadModalOpen(false)
        setUploadFile(null)
        setUploadPreviewUrl('')
        setUploadName('')
      }
    } catch (err: any) {
      setToast({ text: `อัปโหลดล้มเหลว: ${err.message}`, type: 'error' })
    } finally {
      setIsSubmittingUpload(false)
    }
  }

  // Add Version handler
  const handleStartAddVersion = async () => {
    if (!versionFile || !selectedCreative) {
      setToast({ text: 'กรุณาเลือกไฟล์เวอร์ชั่นใหม่', type: 'error' })
      return
    }
    setIsSubmittingVersion(true)
    try {
      const formData = new FormData()
      formData.append('file', versionFile)

      const uploadRes = await uploadCreativeToObjectStorage(formData)
      if (!uploadRes.success) throw new Error(uploadRes.error)

      const updateRes = await addCreativeVersion(selectedCreative.id, {
        filename: uploadRes.filename || versionFile.name,
        fileType: uploadRes.fileType || 'JPG Image',
        fileSize: uploadRes.fileSize || '2.0 MB',
        fileUrl: uploadRes.fileUrl || '',
        dimensions: uploadRes.dimensions || selectedCreative.dimensions
      })

      if (updateRes.success && updateRes.creative) {
        setCreatives(prev => prev.map(c => (c.id === updateRes.creative.id ? updateRes.creative : c)))
        setToast({ text: `เพิ่มเวอร์ชั่นใหม่สำหรับ ${updateRes.creative.code} สำเร็จ`, type: 'success' })
        setVersionModalOpen(false)
        setVersionFile(null)
        setVersionPreviewUrl('')
      }
    } catch (err: any) {
      setToast({ text: `เกิดข้อผิดพลาด: ${err.message}`, type: 'error' })
    } finally {
      setIsSubmittingVersion(false)
    }
  }

  // Toggle Archive handler
  const handleToggleArchive = async (cr: CreativeItem) => {
    const willArchive = cr.status !== 'Archived'
    try {
      const res = await toggleArchiveCreative(cr.id, willArchive)
      if (res.success && res.creative) {
        setCreatives(prev => prev.map(c => (c.id === res.creative.id ? res.creative : c)))
        setToast({
          text: willArchive
            ? `ย้าย ${cr.code} ไปยังคลังถาวรแล้ว`
            : `กู้คืน ${cr.code} กลับมาใช้งานแล้ว`,
          type: 'success'
        })
      }
    } catch (err: any) {
      setToast({ text: `เปลี่ยนสถานะล้มเหลว: ${err.message}`, type: 'error' })
    }
  }

  // Download handler
  const handleDownloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setToast({ text: `กำลังดาวน์โหลด ${filename}`, type: 'success' })
  }

  // Export Metadata CSV
  const handleExportMetadata = () => {
    const headers = [
      'รหัสสื่อ (Creative ID)',
      'ชื่อสื่อ (Creative Name)',
      'ชื่อไฟล์ (Filename)',
      'ประเภทไฟล์ (File Type)',
      'ขนาดไฟล์ (File Size)',
      'ขนาดภาพ (Dimensions)',
      'กลุ่มสินค้า (Product)',
      'เวอร์ชั่น (Version)',
      'สถานะ (Status)',
      'สถานะการใช้งาน (Usage Status)',
      'จำนวนโฆษณาที่ใช้ (Used In Ads Count)',
      'ผู้อัปโหลด (Uploaded By)',
      'วันที่สร้าง (Created At)',
      'วันที่อัปเดต (Updated At)',
      'URL ไฟล์ (File URL)'
    ]

    const rows = filteredCreatives.map(c => {
      const usage = getCreativeUsage(c)
      return [
        `"${c.code}"`,
        `"${c.name}"`,
        `"${c.filename}"`,
        `"${c.fileType}"`,
        `"${c.fileSize}"`,
        `"${c.dimensions}"`,
        `"${c.product}"`,
        `"${c.version}"`,
        `"${c.status === 'Active' ? 'เปิดใช้งาน' : c.status === 'Draft' ? 'ฉบับร่าง' : 'เก็บถาวร'}"`,
        `"${usage.length > 0 ? 'กำลังใช้งาน' : 'ยังไม่ได้ใช้'}"`,
        usage.length,
        `"${c.uploadedBy}"`,
        `"${new Date(c.createdAt).toLocaleDateString('th-TH')}"`,
        `"${new Date(c.updatedAt).toLocaleDateString('th-TH')}"`,
        `"${c.fileUrl}"`
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `creative-library-metadata-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ text: 'ส่งออกข้อมูล Metadata สำเร็จแล้ว', type: 'success' })
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
              }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            คลังสื่อโฆษณา (CREATIVE LIBRARY)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            อัปโหลดครั้งเดียว นำไปใช้งานซ้ำได้ในทุกแคมเปญและชิ้นงานโฆษณา
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="h-9.5 px-4 bg-[#ff2301] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} />
            + อัปโหลดสื่อใหม่
          </button>

          <button
            onClick={() => setManageArchivedMode(!manageArchivedMode)}
            className={`h-9.5 px-4 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap ${manageArchivedMode
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
          >
            <Archive size={14} className={manageArchivedMode ? 'text-white' : 'text-gray-500'} />
            {manageArchivedMode ? 'ออกจากโหมดไฟล์เก็บถาวร' : 'จัดการไฟล์ที่เก็บถาวร'}
          </button>
        </div>
      </div>

      {/* 5 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Assets */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
            <ImageIcon size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 truncate">สื่อทั้งหมด (Total Assets)</div>
            <div className="text-xl font-black text-gray-900 leading-tight">{kpiStats.total}</div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <ImageIcon size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 truncate">รูปภาพ (Images)</div>
            <div className="text-xl font-black text-gray-900 leading-tight">{kpiStats.images}</div>
          </div>
        </div>

        {/* Videos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Film size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 truncate">วิดีโอ (Videos)</div>
            <div className="text-xl font-black text-gray-900 leading-tight">{kpiStats.videos}</div>
          </div>
        </div>

        {/* In Use */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 truncate">กำลังใช้งาน (In Use)</div>
            <div className="text-xl font-black text-gray-900 leading-tight">{kpiStats.inUse}</div>
          </div>
        </div>

        {/* Archived */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <Archive size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 truncate">เก็บถาวร (Archived)</div>
            <div className="text-xl font-black text-gray-900 leading-tight">{kpiStats.archived}</div>
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสื่อ, ชื่อไฟล์ หรือรหัสสื่อ..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-gray-800"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
          {/* Products */}
          <select
            value={filterProduct}
            onChange={e => {
              setFilterProduct(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8.5 text-xs px-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-700 font-medium shrink-0"
          >
            <option value="All Products">กลุ่มสินค้าทั้งหมด (All Products)</option>
            <option value="Solar Pump">ปั๊มน้ำโซล่าเซลล์ (Solar Pump)</option>
            <option value="Solar Rooftop">โซล่ารูฟท็อป (Solar Rooftop)</option>
            <option value="Inverter / VSD">อินเวอร์เตอร์ / VSD</option>
            <option value="Battery Storage">แบตเตอรี่กักเก็บพลังงาน (Battery Storage)</option>
          </select>

          {/* File Types */}
          <select
            value={filterFileType}
            onChange={e => {
              setFilterFileType(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8.5 text-xs px-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-700 font-medium shrink-0"
          >
            <option value="All File Types">ประเภทไฟล์ทั้งหมด</option>
            <option value="Images">รูปภาพ (Images)</option>
            <option value="Videos">วิดีโอ (Videos)</option>
          </select>

          {/* Usage Status */}
          <select
            value={filterUsage}
            onChange={e => {
              setFilterUsage(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8.5 text-xs px-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-700 font-medium shrink-0"
          >
            <option value="All Usage Status">สถานะการใช้งานทั้งหมด</option>
            <option value="In Use">กำลังใช้งาน (In Use)</option>
            <option value="Not Used">ยังไม่ได้ใช้งาน (Not Used)</option>
          </select>

          {/* Creative Status */}
          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8.5 text-xs px-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-700 font-medium shrink-0"
          >
            <option value="All Creative Status">สถานะสื่อทั้งหมด</option>
            <option value="Active">เปิดใช้งาน (Active)</option>
            <option value="Draft">ฉบับร่าง (Draft)</option>
            <option value="Archived">เก็บถาวร (Archived)</option>
          </select>
        </div>

        {/* View mode toggle & Export */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#ff2301] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              title="มุมมองตารางภาพ (Grid View)"
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#ff2301] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              title="มุมมองรายการ (List View)"
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={handleExportMetadata}
            className="h-8.5 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Download size={13} />
            ส่งออกข้อมูล (Export)
          </button>
        </div>
      </div>

      {/* TWO-PANEL MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: ASSET GALLERY (col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              แกลเลอรีสื่อโฆษณา (ASSET GALLERY)
            </h3>
            {manageArchivedMode && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                กำลังแสดงเฉพาะไฟล์ที่เก็บถาวร
              </span>
            )}
          </div>

          {filteredCreatives.length === 0 ? (
            <div className="py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl space-y-2">
              <ImageIcon size={36} className="mx-auto text-gray-300" />
              <p className="text-xs font-bold">ไม่พบชิ้นงานที่ตรงกับเงื่อนไขการค้นหา</p>
              <p className="text-[11px] text-gray-400">ลองล้างตัวกรองหรืออัปโหลดชิ้นงานใหม่</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* 3-Column Grid for Assets matching screenshot */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedCreatives.map(cr => {
                const isSelected = selectedId === cr.id
                const isVid = cr.fileType.toLowerCase().includes('video') || cr.filename.endsWith('.mp4')
                const usage = getCreativeUsage(cr)

                return (
                  <div
                    key={cr.id}
                    onClick={() => setSelectedId(cr.id)}
                    className={`rounded-2xl transition-all cursor-pointer flex flex-col bg-white overflow-hidden relative group ${isSelected
                      ? 'border-2 border-[#ff2301] shadow-sm'
                      : 'border border-gray-200 hover:border-gray-300 hover:shadow-xs'
                      }`}
                  >
                    {/* Media Thumbnail Container */}
                    <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                      <img
                        src={cr.thumbnailUrl || cr.fileUrl}
                        alt={cr.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90"
                        onError={(e: any) => {
                          e.target.onerror = null
                          e.target.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                        }}
                      />

                      {/* Video Play Overlay */}
                      {isVid && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-md">
                            <Play size={16} className="fill-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* 3-Dots Menu Button */}
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === cr.id ? null : cr.id)
                          }}
                          className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Card Dropdown Menu */}
                        {activeMenuId === cr.id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 text-xs font-semibold"
                          >
                            <button
                              onClick={() => {
                                setPreviewData({
                                  url: cr.fileUrl,
                                  title: cr.name,
                                  isVideo: isVid,
                                  dimensions: cr.dimensions,
                                  size: cr.fileSize,
                                  version: cr.version
                                })
                                setPreviewModalOpen(true)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                              <Eye size={13} /> ดูตัวอย่าง (Preview)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedId(cr.id)
                                setVersionModalOpen(true)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                              <Plus size={13} /> เพิ่มเวอร์ชั่น (+ Version)
                            </button>
                            <button
                              onClick={() => {
                                handleDownloadFile(cr.fileUrl, cr.filename)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                              <Download size={13} /> ดาวน์โหลด (Download)
                            </button>
                            <button
                              onClick={() => {
                                handleToggleArchive(cr)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 border-t border-gray-100 mt-1 pt-1"
                            >
                              <Archive size={13} />
                              {cr.status === 'Archived' ? 'กู้คืน (Restore)' : 'เก็บถาวร (Archive)'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 truncate" title={cr.name}>
                          {cr.name}
                        </h4>
                        <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                          {cr.code}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 truncate mt-0.5" title={cr.filename}>
                          {cr.filename}
                        </div>

                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {/* Status */}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${cr.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cr.status === 'Draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                          >
                            {cr.status === 'Active' ? 'เปิดใช้งาน' : cr.status === 'Draft' ? 'แบบร่าง' : 'เก็บถาวร'}
                          </span>

                          {/* Usage */}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${usage.length > 0
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}
                          >
                            {usage.length > 0 ? 'กำลังใช้งาน' : 'ยังไม่ได้ใช้'}
                          </span>

                          {/* Version */}
                          <span className="text-[9px] font-mono font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                            {cr.version?.split('•')[0]?.trim() || 'V1'}
                          </span>
                        </div>
                      </div>

                      {/* Meta footer */}
                      <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5 font-sans">
                        <div>
                          {isVid ? 'วิดีโอ (Video)' : 'รูปภาพ (Image)'} • {cr.fileSize}
                        </div>
                        <div className={usage.length > 0 ? 'text-gray-700 font-semibold' : 'text-gray-400'}>
                          {usage.length > 0
                            ? `ใช้งานใน ${usage.length} ชิ้นงานโฆษณา`
                            : 'ยังไม่ถูกผูกกับโฆษณา'}
                        </div>
                        <div>
                          อัปเดตเมื่อ {new Date(cr.updatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List View */
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase">
                    <th className="py-2.5 px-3">สื่อโฆษณา (Asset)</th>
                    <th className="py-2.5 px-3">ประเภท & ขนาด (Type & Size)</th>
                    <th className="py-2.5 px-3">กลุ่มสินค้า (Product)</th>
                    <th className="py-2.5 px-3">เวอร์ชั่น (Version)</th>
                    <th className="py-2.5 px-3">การใช้งาน (Usage)</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCreatives.map(cr => {
                    const isSelected = selectedId === cr.id
                    const isVid = cr.fileType.toLowerCase().includes('video') || cr.filename.endsWith('.mp4')
                    const usage = getCreativeUsage(cr)

                    return (
                      <tr
                        key={cr.id}
                        onClick={() => setSelectedId(cr.id)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-red-50/30 font-semibold' : ''
                          }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-900 overflow-hidden shrink-0">
                              <img
                                src={cr.thumbnailUrl || cr.fileUrl}
                                alt={cr.name}
                                className="w-full h-full object-cover"
                                onError={(e: any) => {
                                  e.target.onerror = null
                                  e.target.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate">{cr.name}</div>
                              <div className="text-[10px] font-mono text-gray-400">{cr.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-600">
                          {isVid ? 'วิดีโอ (Video)' : 'รูปภาพ (Image)'} • {cr.fileSize}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-600">{cr.product}</td>
                        <td className="py-2.5 px-3 font-mono text-[10px] font-bold text-red-600">{cr.version}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${usage.length > 0 ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-500'
                              }`}
                          >
                            {usage.length > 0 ? `${usage.length} โฆษณา` : 'ยังไม่ได้ใช้'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setPreviewData({
                                url: cr.fileUrl,
                                title: cr.name,
                                isVideo: isVid,
                                dimensions: cr.dimensions,
                                size: cr.fileSize,
                                version: cr.version
                              })
                              setPreviewModalOpen(true)
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="ดูตัวอย่าง (Preview)"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Gallery Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              แสดง {filteredCreatives.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredCreatives.length)} จากทั้งหมด {filteredCreatives.length} รายการ
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold ${currentPage === p
                      ? 'bg-[#ff2301] text-white'
                      : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                      }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: CREATIVE DETAILS (col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="pb-1 border-b border-gray-100">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              รายละเอียดสื่อโฆษณา (CREATIVE DETAILS)
            </h3>
          </div>

          {selectedCreative ? (
            <div className="space-y-5">
              {/* Identity Row */}
              <div className="flex items-start gap-3.5">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900 border border-gray-200 overflow-hidden relative shrink-0 shadow-inner">
                  <img
                    src={selectedCreative.thumbnailUrl || selectedCreative.fileUrl}
                    alt={selectedCreative.name}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.onerror = null
                      e.target.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                    }}
                  />
                  {(selectedCreative.fileType.toLowerCase().includes('video') || selectedCreative.filename.endsWith('.mp4')) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={20} className="fill-white text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-gray-900 leading-snug">
                    {selectedCreative.name}
                  </h3>
                  <div className="text-xs font-mono text-gray-500 mt-0.5">
                    รหัสสื่อ: {selectedCreative.code}
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedCreative.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedCreative.status === 'Draft'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                    >
                      {selectedCreative.status === 'Active' ? 'เปิดใช้งาน' : selectedCreative.status === 'Draft' ? 'แบบร่าง' : 'เก็บถาวร'}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${getCreativeUsage(selectedCreative).length > 0
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                    >
                      {getCreativeUsage(selectedCreative).length > 0
                        ? `กำลังใช้งาน (${getCreativeUsage(selectedCreative).length} โฆษณา)`
                        : 'ยังไม่ได้ใช้'}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-white bg-gray-900 px-2 py-0.5 rounded">
                      เวอร์ชั่น {selectedCreative.version?.split('•')[0]?.trim() || 'V1'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Key-Value List */}
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">ชื่อไฟล์ (Filename)</span>
                  <span className="font-mono text-gray-900 font-semibold truncate text-right" title={selectedCreative.filename}>
                    {selectedCreative.filename}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">ประเภทไฟล์ (File Type)</span>
                  <span className="text-gray-900 font-semibold text-right">{selectedCreative.fileType}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">ขนาดไฟล์ (File Size)</span>
                  <span className="text-gray-900 font-semibold text-right">{selectedCreative.fileSize}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">ขนาดภาพ/วิดีโอ (Dimensions)</span>
                  <span className="text-gray-900 font-semibold text-right">{selectedCreative.dimensions}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">กลุ่มสินค้า (Product)</span>
                  <span className="text-gray-900 font-semibold text-right">{selectedCreative.product}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">ผู้อัปโหลด (Uploaded By)</span>
                  <span className="text-gray-900 font-semibold text-right">{selectedCreative.uploadedBy}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">วันที่สร้าง (Created At)</span>
                  <span className="text-gray-900 font-semibold text-right">
                    {new Date(selectedCreative.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500 font-medium">วันที่อัปเดต (Updated At)</span>
                  <span className="text-gray-900 font-semibold text-right">
                    {new Date(selectedCreative.updatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    const isVid = selectedCreative.fileType.toLowerCase().includes('video') || selectedCreative.filename.endsWith('.mp4')
                    setPreviewData({
                      url: selectedCreative.fileUrl,
                      title: selectedCreative.name,
                      isVideo: isVid,
                      dimensions: selectedCreative.dimensions,
                      size: selectedCreative.fileSize,
                      version: selectedCreative.version
                    })
                    setPreviewModalOpen(true)
                  }}
                  className="h-9 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
                >
                  <Eye size={13} /> ดูตัวอย่าง
                </button>

                <button
                  onClick={() => handleDownloadFile(selectedCreative.fileUrl, selectedCreative.filename)}
                  className="h-9 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
                >
                  <Download size={13} /> ดาวน์โหลด
                </button>

                <button
                  onClick={() => setVersionModalOpen(true)}
                  className="h-9 px-2 bg-[#ff2301] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
                >
                  <Plus size={13} /> + เพิ่มเวอร์ชั่น
                </button>

                <button
                  onClick={() => handleToggleArchive(selectedCreative)}
                  className="h-9 px-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
                >
                  <Archive size={13} />
                  {selectedCreative.status === 'Archived' ? 'กู้คืนไฟล์' : 'เก็บถาวร'}
                </button>
              </div>

              {/* Guidance caption */}
              <p className="text-[11px] text-blue-600 flex items-center gap-1.5 font-medium">
                <Info size={13} className="shrink-0" />
                การเพิ่มเวอร์ชั่นใหม่จะยังคงใช้รหัสสื่อเดิม ({selectedCreative.code}) และจัดเก็บไฟล์ก่อนหน้าไว้ในประวัติ
              </p>

              {/* VERSION HISTORY TABLE */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  ประวัติเวอร์ชั่น (VERSION HISTORY)
                </h4>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase">
                        <th className="py-2 px-3">เวอร์ชั่น</th>
                        <th className="py-2 px-3">วันที่อัปเดต</th>
                        <th className="py-2 px-3">ขนาดไฟล์</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-2 text-center">ตัวอย่าง</th>
                        <th className="py-2 px-2 text-center">ดาวน์โหลด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedCreative.versionHistory || []).map((ver, vIdx) => {
                        const isVid = ver.filename.endsWith('.mp4') || ver.filename.endsWith('.mov')
                        return (
                          <tr key={vIdx} className="hover:bg-gray-50/80">
                            <td className="py-2 px-3 font-mono font-bold text-gray-900 text-[11px]">
                              {ver.version}
                            </td>
                            <td className="py-2 px-3 text-gray-600 text-[11px] whitespace-nowrap">
                              {ver.updatedAt}
                            </td>
                            <td className="py-2 px-3 text-gray-600 text-[11px] whitespace-nowrap">
                              {ver.fileSize}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ver.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-100 text-gray-500'
                                  }`}
                              >
                                {ver.status === 'Active' ? 'เปิดใช้งาน' : 'เก็บถาวร'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => {
                                  setPreviewData({
                                    url: ver.fileUrl,
                                    title: `${selectedCreative.name} (${ver.version})`,
                                    isVideo: isVid,
                                    dimensions: selectedCreative.dimensions,
                                    size: ver.fileSize,
                                    version: ver.version
                                  })
                                  setPreviewModalOpen(true)
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                title="ดูตัวอย่างไฟล์เวอร์ชั่นนี้"
                              >
                                <Eye size={13} />
                              </button>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleDownloadFile(ver.fileUrl, ver.filename)}
                                className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                                title="ดาวน์โหลดไฟล์เวอร์ชั่นนี้"
                              >
                                <Download size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* USED IN ADS TABLE */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  โฆษณาที่ใช้สื่อนี้ (USED IN ADS)
                </h4>

                {getCreativeUsage(selectedCreative).length === 0 ? (
                  <div className="py-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    ชิ้นงานนี้ยังไม่ได้ถูกผูกกับโฆษณาใด (สามารถเลือกผูกได้ในแท็บ Ad Sets & Ads)
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase">
                          <th className="py-2 px-3">แคมเปญ (Campaign)</th>
                          <th className="py-2 px-3">ชุดโฆษณา (Ad Set)</th>
                          <th className="py-2 px-3">ชิ้นงาน (Ad)</th>
                          <th className="py-2 px-2 text-center">สถานะ</th>
                          <th className="py-2 px-3 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getCreativeUsage(selectedCreative).map((usage, uIdx) => (
                          <tr key={uIdx} className="hover:bg-gray-50/80">
                            <td className="py-2.5 px-3 font-semibold text-gray-900 text-[11px] truncate max-w-[100px]" title={usage.campaignName}>
                              {usage.campaignName}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 text-[11px] truncate max-w-[110px]" title={usage.adSetName}>
                              {usage.adSetName}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-800 text-[11px] truncate max-w-[130px]" title={usage.adName}>
                              {usage.adName}
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${usage.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                                  }`}
                              >
                                {usage.status === 'Active' ? 'เปิดใช้งาน' : usage.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => onSelectAdSet(usage.campaignId || usage.campaignName, usage.adCode)}
                                className="h-7 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                              >
                                เปิดดูโฆษณา
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer guidance & shortcut button */}
              <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-blue-600 flex items-center gap-1.5 font-medium">
                  <Info size={13} className="shrink-0" />
                  การผูกชิ้นงานสื่อสามารถจัดการได้ในแท็บ Ad Sets & Ads
                </p>

                <button
                  onClick={() => onSelectAdSet()}
                  className="h-8.5 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                >
                  <FolderOpen size={13} className="text-amber-500" />
                  ไปที่จัดการชุดโฆษณา (Ad Sets & Ads)
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              กรุณาเลือกชิ้นงานจากแกลเลอรีสื่อด้านซ้าย
            </div>
          )}
        </div>
      </div>

      {/* MODAL: UPLOAD NEW CREATIVE */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-[#ff2301]" />
                <h3 className="font-black text-gray-900 text-sm">
                  อัปโหลดสื่อโฆษณาใหม่เข้าคลัง (Upload New Creative)
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
              {/* Drag & Drop Box */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setUploadFile(f)
                    setUploadPreviewUrl(URL.createObjectURL(f))
                    if (!uploadName) {
                      setUploadName(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '))
                    }
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) {
                    setUploadFile(f)
                    setUploadPreviewUrl(URL.createObjectURL(f))
                    if (!uploadName) {
                      setUploadName(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '))
                    }
                  }
                }}
                className="border-2 border-dashed border-gray-300 hover:border-red-500 rounded-2xl p-6 text-center cursor-pointer bg-gray-50/60 hover:bg-red-50/10 transition-all space-y-2 group"
              >
                {uploadFile ? (
                  <div className="flex flex-col items-center">
                    {uploadFile.type.startsWith('image') ? (
                      <img src={uploadPreviewUrl} alt="preview" className="w-24 h-24 object-cover rounded-xl shadow mb-2" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                        <Film size={36} />
                      </div>
                    )}
                    <span className="font-bold text-gray-900">{uploadFile.name}</span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadFile.type || 'Media file'}
                    </span>
                    <span className="text-[10px] text-red-600 font-bold mt-1">คลิกเพื่อเปลี่ยนไฟล์</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-red-500 mx-auto transition-colors" />
                    <div className="font-bold text-gray-700 text-sm">
                      ลากและวางไฟล์ที่นี่ หรือ <span className="text-red-600 underline">คลิกเพื่อเลือกไฟล์ (Browse Files)</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      รองรับไฟล์: JPG, PNG, WEBP, MP4, MOV (สูงสุด 50MB)
                    </p>
                    <div className="flex justify-center gap-1.5 pt-1">
                      {['JPG', 'PNG', 'WEBP', 'MP4', 'MOV'].map(ext => (
                        <span key={ext} className="text-[9px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Form fields */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  ชื่อสื่อโฆษณา (Creative Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="เช่น ปั๊มน้ำโซล่าเซลล์ Water Strong V1"
                  className="w-full h-9.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">กลุ่มสินค้า (Product Category)</label>
                  <select
                    value={uploadProduct}
                    onChange={e => setUploadProduct(e.target.value)}
                    className="w-full h-9.5 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Solar Pump">ปั๊มน้ำโซล่าเซลล์ (Solar Pump)</option>
                    <option value="Solar Rooftop">โซล่ารูฟท็อป (Solar Rooftop)</option>
                    <option value="Inverter / VSD">อินเวอร์เตอร์ / VSD</option>
                    <option value="Battery Storage">แบตเตอรี่กักเก็บพลังงาน (Battery Storage)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">สถานะ (Status)</label>
                  <select
                    value={uploadStatus}
                    onChange={e => setUploadStatus(e.target.value as any)}
                    className="w-full h-9.5 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Active">เปิดใช้งาน (Active)</option>
                    <option value="Draft">ฉบับร่าง (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="font-bold text-gray-700 block">ชิ้นงานสื่อหลัก (Primary Creative)</span>
                  <span className="text-[10px] text-gray-400">กำหนดเป็นชิ้นงานหลักสำหรับแสดงผลในแคมเปญ</span>
                </div>
                <input
                  type="checkbox"
                  checked={uploadIsPrimary}
                  onChange={e => setUploadIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
              </div>

              <div className="text-[11px] text-gray-500 bg-blue-50 p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
                <Info size={14} className="text-blue-600 shrink-0" />
                <span>
                  ไฟล์จะถูกอัปโหลดไปยัง Object Storage และสร้างรหัส Creative ID (เช่น CR-SP-001) โดยอัตโนมัติ
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isSubmittingUpload || !uploadFile}
                className="px-5 py-2 bg-[#ff2301] hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingUpload ? 'กำลังอัปโหลด...' : 'อัปโหลดเข้าคลังสื่อ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW VERSION */}
      {versionModalOpen && selectedCreative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#ff2301]" />
                <div>
                  <h3 className="font-black text-gray-900 text-sm">
                    เพิ่มเวอร์ชั่นใหม่สำหรับ {selectedCreative.code}
                  </h3>
                  <p className="text-[10px] text-gray-500">{selectedCreative.name}</p>
                </div>
              </div>
              <button
                onClick={() => setVersionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                การเพิ่มเวอร์ชั่นใหม่จะบันทึกไฟล์ก่อนหน้าลงใน <strong>Version History</strong> และอัปเดตไฟล์นี้เป็นเวอร์ชั่นปัจจุบัน โดยยังคงใช้รหัส <strong>{selectedCreative.code}</strong> เดิม
              </div>

              <input
                ref={versionFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setVersionFile(f)
                    setVersionPreviewUrl(URL.createObjectURL(f))
                  }
                }}
              />

              <div
                onClick={() => versionFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-red-500 rounded-2xl p-6 text-center cursor-pointer bg-gray-50/60 hover:bg-red-50/10 transition-all space-y-2 group"
              >
                {versionFile ? (
                  <div className="flex flex-col items-center">
                    {versionFile.type.startsWith('image') ? (
                      <img src={versionPreviewUrl} alt="preview" className="w-24 h-24 object-cover rounded-xl shadow mb-2" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                        <Film size={36} />
                      </div>
                    )}
                    <span className="font-bold text-gray-900">{versionFile.name}</span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {(versionFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span className="text-[10px] text-red-600 font-bold mt-1">คลิกเพื่อเปลี่ยนไฟล์</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-red-500 mx-auto transition-colors" />
                    <div className="font-bold text-gray-700">
                      เลือกไฟล์ใหม่สำหรับ <span className="text-red-600">เวอร์ชั่นถัดไป (Next Version)</span>
                    </div>
                    <p className="text-[10px] text-gray-400">รองรับ JPG, PNG, WEBP, MP4, MOV (สูงสุด 50MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVersionModalOpen(false)}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleStartAddVersion}
                disabled={isSubmittingVersion || !versionFile}
                className="px-5 py-2 bg-[#ff2301] hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {isSubmittingVersion ? 'กำลังบันทึกเวอร์ชั่น...' : 'บันทึกเวอร์ชั่นใหม่และตั้งเป็นปัจจุบัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW LIGHTBOX */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-red-500" />
                <span className="font-bold text-sm truncate">{previewData.title}</span>
                {previewData.version && (
                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {previewData.version}
                  </span>
                )}
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex items-center justify-center flex-1 overflow-auto bg-black/50">
              {previewData.isVideo ? (
                <video
                  src={previewData.url}
                  controls
                  autoPlay
                  className="max-h-[65vh] max-w-full rounded-xl shadow-2xl"
                />
              ) : (
                <img
                  src={previewData.url}
                  alt={previewData.title}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl"
                  onError={(e: any) => {
                    e.target.onerror = null
                    e.target.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                  }}
                />
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-gray-400">
              <div className="font-mono">
                {previewData.dimensions || '1080 x 1080 px'} • {previewData.size || ''}
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
              >
                ปิดหน้าต่างตัวอย่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * SearchableSelect Component (ค้นหากลุ่มสินค้า)
 */
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  name
}: any) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o: any) => o.value === value)
  const filteredOptions = options.filter((o: any) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`w-full h-10 bg-amber-50/40 border ${isOpen ? 'border-[#ff2301] ring-2 ring-red-100' : 'border-gray-300'
          } rounded-xl px-3 text-sm flex items-center justify-between cursor-pointer transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span
          className={
            selectedOption
              ? 'text-gray-900 font-semibold'
              : 'text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis'
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={15} className="text-gray-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              autoFocus
              className="w-full text-xs outline-none bg-transparent"
              placeholder="ค้นหากลุ่มสินค้า..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-400">ไม่พบกลุ่มสินค้า</div>
            ) : (
              filteredOptions.map((o: any) => (
                <div
                  key={o.value}
                  className={`px-3 py-2 text-xs cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors ${o.value === value ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'
                    }`}
                  onClick={() => {
                    onChange({ target: { name, value: o.value } })
                    setIsOpen(false)
                    setSearch('')
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
