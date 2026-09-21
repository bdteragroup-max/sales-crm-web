'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Layers,
  Save,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Eye,
  MousePointer,
  Clock,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building2,
  Package
} from 'lucide-react'
import {
  savePerformanceSnapshot,
  getLatestEntitySnapshot,
  getMasterLookupData,
  PerformanceSnapshot,
  ActiveAdPerformanceItem
} from '@/app/actions/ads-performance'

interface UpdateResultsModalProps {
  isOpen: boolean
  onClose: () => void
  campaigns: any[]
  initialAds?: ActiveAdPerformanceItem[]
  currentUser: {
    name: string
    role: string
  }
  presetItem?: {
    level: 'CAMPAIGN' | 'AD_SET' | 'AD'
    entityId: string
    campaignId?: string
    adSetId?: string
  } | null
  onSuccess: (newSnapshot: PerformanceSnapshot) => void
}

export default function UpdateResultsModal({
  isOpen,
  onClose,
  campaigns,
  initialAds = [],
  currentUser,
  presetItem,
  onSuccess
}: UpdateResultsModalProps) {
  // Step 1: Data Level
  const [level, setLevel] = useState<'CAMPAIGN' | 'AD_SET' | 'AD'>('AD')

  // Step 2: Selection
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    if (presetItem?.campaignId) return presetItem.campaignId
    if (campaigns && campaigns.length > 0) return campaigns[0].campaignId || campaigns[0].id
    return ''
  })
  const [selectedAdSetId, setSelectedAdSetId] = useState<string>('')
  const [selectedAdId, setSelectedAdId] = useState<string>('')

  // Lookup data
  const [masterLookup, setMasterLookup] = useState<{
    campaigns: any[]
    adSets: any[]
    ads: any[]
  } | null>(null)
  const [loadingLookup, setLoadingLookup] = useState(false)

  // Step 3: Cumulative Form Values
  const [dataAsOf, setDataAsOf] = useState<string>('')
  const [spend, setSpend] = useState<string>('')
  const [messageInbox, setMessageInbox] = useState<string>('')
  const [reach, setReach] = useState<string>('')
  const [impressions, setImpressions] = useState<string>('')
  const [clicks, setClicks] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Previous snapshot & live comparison
  const [previousSnapshot, setPreviousSnapshot] = useState<PerformanceSnapshot | null>(null)
  const [loadingLatest, setLoadingLatest] = useState(false)

  // Saving state
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Initialize current datetime in local time format
  const getLocalDateTimeString = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localTime = new Date(now.getTime() - offset)
    return localTime.toISOString().slice(0, 16)
  }

  // Load master lookup on mount
  useEffect(() => {
    if (!isOpen) return
    setDataAsOf(getLocalDateTimeString())
    setErrorMessage(null)
    setSuccessMessage(null)

    let isMounted = true
    setLoadingLookup(true)
    getMasterLookupData()
      .then(res => {
        if (isMounted && res.success) {
          setMasterLookup({
            campaigns: res.campaigns || [],
            adSets: res.adSets || [],
            ads: res.ads || []
          })
        }
      })
      .catch(err => {
        console.error('Error fetching master lookup:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingLookup(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Preset handling if opened with specific item
  useEffect(() => {
    if (!isOpen) return

    if (presetItem) {
      if (presetItem.level) setLevel(presetItem.level)
      if (presetItem.campaignId) setSelectedCampaignId(presetItem.campaignId)
      if (presetItem.adSetId) setSelectedAdSetId(presetItem.adSetId)

      if (presetItem.level === 'AD') setSelectedAdId(presetItem.entityId)
      else if (presetItem.level === 'AD_SET') setSelectedAdSetId(presetItem.entityId)
      else if (presetItem.level === 'CAMPAIGN') setSelectedCampaignId(presetItem.entityId)
    } else {
      // Default to first available campaign or ad
      if (campaigns.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(campaigns[0].campaignId || campaigns[0].id)
      }
    }
  }, [isOpen, presetItem, campaigns])

  // Filter Ad Sets based on selected campaign
  const availableAdSets = useMemo(() => {
    if (!selectedCampaignId) return []
    const source = masterLookup ? masterLookup.adSets : null
    let list: any[] = []
    if (source) {
      list = source.filter((as: any) => 
        as.campaignId === selectedCampaignId || 
        as.campaignDbId === selectedCampaignId ||
        (selectedCampaignId && as.campaignId && (as.campaignId.startsWith(selectedCampaignId) || selectedCampaignId.startsWith(as.campaignId)))
      )
    } else {
      const map = new Map<string, any>()
      initialAds.forEach(a => {
        const matchCamp = a.campaignId === selectedCampaignId || 
          (a as any).campaignDbId === selectedCampaignId ||
          (selectedCampaignId && a.campaignId && (a.campaignId.startsWith(selectedCampaignId) || selectedCampaignId.startsWith(a.campaignId)))
        if (matchCamp && (a.adSetId || (a as any).code)) {
          const sId = a.adSetId || (a as any).code
          map.set(sId, {
            id: sId,
            code: sId,
            adSetId: sId,
            name: a.adSetName || sId,
            campaignId: a.campaignId,
            budgetStrategy: a.budgetStrategy
          })
        }
      })
      list = Array.from(map.values())
    }
    // Deduplicate by adSetId, code or id
    const seen = new Set<string>()
    const uniqueList: any[] = []
    for (const item of list) {
      const key = item.adSetId || item.code || item.id
      if (key && !seen.has(key)) {
        seen.add(key)
        uniqueList.push(item)
      }
    }
    return uniqueList
  }, [masterLookup, selectedCampaignId, initialAds])

  // Filter Ads based on selected ad set or campaign
  const availableAds = useMemo(() => {
    if (!selectedCampaignId) return []
    const source = masterLookup ? masterLookup.ads : initialAds
    const filtered = source.filter((ad: any) => {
      const matchCamp = ad.campaignId === selectedCampaignId || 
        ad.campaignDbId === selectedCampaignId ||
        (selectedCampaignId && ad.campaignId && (ad.campaignId.startsWith(selectedCampaignId) || selectedCampaignId.startsWith(ad.campaignId)))
      if (!matchCamp) return false
      if (selectedAdSetId) {
        const matchAdSet = ad.adSetId === selectedAdSetId || 
          ad.code === selectedAdSetId || 
          ad.id === selectedAdSetId ||
          (ad.adSetId && selectedAdSetId && (ad.adSetId.startsWith(selectedAdSetId) || selectedAdSetId.startsWith(ad.adSetId)))
        if (!matchAdSet) return false
      }
      return true
    })
    // Deduplicate by adId or code or id
    const seen = new Set<string>()
    const uniqueList: any[] = []
    for (const item of filtered) {
      const key = item.adId || item.code || item.id
      if (key && !seen.has(key)) {
        seen.add(key)
        uniqueList.push(item)
      }
    }
    return uniqueList
  }, [masterLookup, selectedCampaignId, selectedAdSetId, initialAds])

  // Auto-sync selection if current selected ID is invalid or empty
  useEffect(() => {
    if (level === 'AD_SET') {
      if (availableAdSets.length > 0) {
        const exists = availableAdSets.some(s => (s.adSetId || s.code || s.id) === selectedAdSetId || s.id === selectedAdSetId)
        if (!selectedAdSetId || !exists) {
          const firstVal = availableAdSets[0].adSetId || availableAdSets[0].code || availableAdSets[0].id
          setSelectedAdSetId(firstVal)
        }
      }
    } else if (level === 'AD') {
      if (availableAds.length > 0) {
        const exists = availableAds.some(a => (a.adId || a.code || a.id) === selectedAdId || a.id === selectedAdId)
        if (!selectedAdId || !exists) {
          const firstVal = availableAds[0].adId || availableAds[0].code || availableAds[0].id
          setSelectedAdId(firstVal)
        }
      }
    }
  }, [level, availableAdSets, availableAds, selectedAdSetId, selectedAdId])

  // Identify the target entity ID
  const effectiveEntityId = useMemo(() => {
    if (level === 'CAMPAIGN') return selectedCampaignId
    if (level === 'AD_SET') return selectedAdSetId
    return selectedAdId
  }, [level, selectedCampaignId, selectedAdSetId, selectedAdId])

  // Details of current selected entity for display card
  const selectedEntityDetails = useMemo(() => {
    if (!effectiveEntityId) return null

    if (level === 'CAMPAIGN') {
      const camp = (masterLookup?.campaigns || campaigns).find(
        c => (c.campaignId || c.id) === effectiveEntityId || (c as any).campaignDbId === effectiveEntityId || c.id === effectiveEntityId
      )
      if (!camp) return null
      const isCBO = (camp.budgetStrategy || (camp as any).budget_strategy || 'CBO').toString().toUpperCase().includes('CBO')
      return {
        id: camp.campaignId || camp.id,
        name: camp.name,
        code: camp.campaignId || camp.id,
        channel: camp.channel?.name || (camp as any).channelName || 'Meta Ads',
        branch: camp.branch?.name || (camp as any).branchName || 'ทุกสาขา',
        productGroup: camp.product?.name || (camp as any).productCategory || 'ทุกกลุ่มสินค้า',
        strategy: isCBO ? 'CBO' : 'ABO',
        budget: Number(camp.budget || (camp as any).campaignBudget || 0),
        status: camp.status || 'Active'
      }
    }

    if (level === 'AD_SET') {
      const set = availableAdSets.find(
        s => (s.adSetId || s.code || s.id) === effectiveEntityId || s.id === effectiveEntityId || s.code === effectiveEntityId || s.adSetId === effectiveEntityId
      )
      const camp = (masterLookup?.campaigns || campaigns).find(
        c => (c.campaignId || c.id) === selectedCampaignId || (c as any).campaignDbId === selectedCampaignId || c.id === selectedCampaignId
      )
      if (!set) return null
      const isCBO = (set.budgetStrategy || camp?.budgetStrategy || (camp as any)?.budget_strategy || 'CBO').toString().toUpperCase().includes('CBO')
      return {
        id: set.adSetId || set.code || set.id,
        name: set.name,
        code: set.code || set.adSetId || set.id,
        channel: camp?.channel?.name || (camp as any)?.channelName || 'Meta Ads',
        branch: camp?.branch?.name || (camp as any)?.branchName || set.branchName || 'ทุกสาขา',
        productGroup: camp?.product?.name || (camp as any)?.productCategory || set.productCategory || 'ทุกกลุ่มสินค้า',
        strategy: isCBO ? 'CBO' : 'ABO',
        budget: isCBO ? Number(camp?.budget || (camp as any)?.campaignBudget || 0) : Number(set.budget || 0),
        status: set.status || 'Active'
      }
    }

    const ad = availableAds.find(
      a => (a.adId || a.code || a.id) === effectiveEntityId || a.id === effectiveEntityId || a.code === effectiveEntityId || a.adId === effectiveEntityId
    )
    if (!ad) return null
    const camp = (masterLookup?.campaigns || campaigns).find(
      c => (c.campaignId || c.id) === selectedCampaignId || (c as any).campaignDbId === selectedCampaignId || c.id === selectedCampaignId
    )
    const isCBO = (ad.budgetStrategy || camp?.budgetStrategy || (camp as any)?.budget_strategy || 'CBO').toString().toUpperCase().includes('CBO')
    return {
      id: ad.adId || ad.code || ad.id,
      name: ad.adName || ad.name,
      code: ad.adId || ad.code || ad.id,
      channel: ad.channel || camp?.channel?.name || (camp as any)?.channelName || 'Meta Ads',
      branch: ad.branch || (camp as any)?.branchName || 'ทุกสาขา',
      productGroup: ad.productCategory || (camp as any)?.productCategory || 'ทุกกลุ่มสินค้า',
      strategy: isCBO ? 'CBO' : 'ABO',
      budget: isCBO ? Number(camp?.budget || (camp as any)?.campaignBudget || 0) : Number(ad.plannedBudget || ad.budget || 0),
      creativeFile: ad.creativeFile || 'SP_WaterStrong_V1.jpg',
      creativeVersion: ad.creativeVersion || 'V1',
      creativeUrl: ad.creativeUrl || ad.thumbnailUrl,
      status: ad.status || 'Active'
    }
  }, [effectiveEntityId, level, masterLookup, campaigns, availableAdSets, availableAds, selectedCampaignId])

  // Automatically fetch & pre-fill the latest snapshot when target entity changes
  useEffect(() => {
    if (!isOpen || !effectiveEntityId) {
      setPreviousSnapshot(null)
      return
    }

    let isMounted = true
    setLoadingLatest(true)
    setErrorMessage(null)

    getLatestEntitySnapshot(level, effectiveEntityId)
      .then(res => {
        if (!isMounted) return
        const snap = res.snapshot
        setPreviousSnapshot(snap)

        if (snap) {
          // Prepopulate form with the latest cumulative numbers!
          setSpend(String(snap.spend ?? ''))
          setMessageInbox(String(snap.messageInbox ?? ''))
          setReach(String(snap.reach ?? ''))
          setImpressions(String(snap.impressions ?? ''))
          setClicks(String(snap.clicks ?? ''))
        } else {
          // If no snapshot yet, check if active ad has initial numbers
          if (level === 'AD') {
            const ad = initialAds.find(a => a.adId === effectiveEntityId)
            if (ad) {
              setSpend(ad.spend ? String(ad.spend) : '')
              setMessageInbox(ad.messageInbox ? String(ad.messageInbox) : '')
              setReach(ad.reach ? String(ad.reach) : '')
              setImpressions(ad.impressions ? String(ad.impressions) : '')
              setClicks(ad.clicks ? String(ad.clicks) : '')
              return
            }
          }
          setSpend('')
          setMessageInbox('')
          setReach('')
          setImpressions('')
          setClicks('')
        }
      })
      .catch(err => {
        console.error('Error fetching latest snapshot:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingLatest(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, level, effectiveEntityId, initialAds])

  // Real-time calculation of deltas and auto-calculated metrics
  const liveMetrics = useMemo(() => {
    const prevSpend = Number(previousSnapshot?.spend || 0)
    const prevInbox = Number(previousSnapshot?.messageInbox || 0)
    const prevReach = Number(previousSnapshot?.reach || 0)
    const prevImp = Number(previousSnapshot?.impressions || 0)
    const prevClicks = Number(previousSnapshot?.clicks || 0)

    const curSpend = Number(spend || 0)
    const curInbox = Number(messageInbox || 0)
    const curReach = Number(reach || 0)
    const curImp = Number(impressions || 0)
    const curClicks = Number(clicks || 0)

    const deltaSpend = curSpend - prevSpend
    const deltaInbox = curInbox - prevInbox
    const deltaReach = curReach - prevReach
    const deltaImp = curImp - prevImp
    const deltaClicks = curClicks - prevClicks

    // Calculated metrics (never averaged)
    const ctr = curImp > 0 ? (curClicks / curImp) * 100 : null
    const cpc = curClicks > 0 ? curSpend / curClicks : null
    const cpm = curImp > 0 ? (curSpend / curImp) * 1000 : null
    const costPerResult = curInbox > 0 ? curSpend / curInbox : null

    // Budget utilization
    const planned = selectedEntityDetails?.budget || 0
    const budgetPercent = planned > 0 ? (curSpend / planned) * 100 : null

    // Non-blocking decrease detection
    const isDecreased =
      (previousSnapshot !== null) &&
      (curSpend < prevSpend || curInbox < prevInbox || curReach < prevReach || curImp < prevImp || curClicks < prevClicks)

    return {
      prevSpend,
      prevInbox,
      prevReach,
      prevImp,
      prevClicks,
      curSpend,
      curInbox,
      curReach,
      curImp,
      curClicks,
      deltaSpend,
      deltaInbox,
      deltaReach,
      deltaImp,
      deltaClicks,
      ctr,
      cpc,
      cpm,
      costPerResult,
      budgetPercent,
      isDecreased
    }
  }, [previousSnapshot, spend, messageInbox, reach, impressions, clicks, selectedEntityDetails])

  // Handle Save
  const handleSaveLatestResults = async () => {
    if (!effectiveEntityId) {
      setErrorMessage('กรุณาเลือกรายการที่ต้องการบันทึกผลลัพธ์')
      return
    }

    if (!spend || Number(spend) < 0) {
      setErrorMessage('กรุณากรอกค่าใช้จ่ายสะสม (Amount Spent) อย่างถูกต้อง')
      return
    }

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await savePerformanceSnapshot({
        entityType: level,
        entityId: effectiveEntityId,
        campaignId: selectedCampaignId,
        adSetId: level === 'AD_SET' || level === 'AD' ? selectedAdSetId : undefined,
        adId: level === 'AD' ? effectiveEntityId : undefined,
        creativeFile: selectedEntityDetails?.creativeFile,
        creativeVersion: selectedEntityDetails?.creativeVersion,
        creativeUrl: selectedEntityDetails?.creativeUrl,
        capturedAt: dataAsOf ? new Date(dataAsOf).toISOString() : new Date().toISOString(),
        spend: Number(spend || 0),
        messageInbox: Number(messageInbox || 0),
        reach: Number(reach || 0),
        impressions: Number(impressions || 0),
        clicks: Number(clicks || 0),
        notes: notes.trim(),
        enteredBy: currentUser.name,
        source: 'Manual'
      })

      if (res.success && res.snapshot) {
        setSuccessMessage(`บันทึกผลลัพธ์สะสมล่าสุดสำเร็จ! (Snapshot: ${res.snapshot.snapshotId})`)
        onSuccess(res.snapshot)
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการบันทึกผลลัพธ์')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-500/30">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">
                  อัปเดตผลลัพธ์ล่าสุด (Update Results)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  ระบบสะสมต่อเนื่อง
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ขั้นตอนการบันทึก 4 ขั้นตอน: เลือกระดับ → เลือกรายการ → กรอกตัวเลขสะสม → บันทึกผลลัพธ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================================= */}
          {/* STEP 1: SELECT DATA LEVEL (เลือกระดับข้อมูล)                               */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                เลือกระดับข้อมูลที่ต้องการอัปเดต (Select Data Level)
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLevel('CAMPAIGN')
                }}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  level === 'CAMPAIGN'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4 text-rose-600" />
                <span>ระดับแคมเปญ (Campaign)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLevel('AD_SET')
                }}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  level === 'AD_SET'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FolderIcon className="w-4 h-4 text-rose-600" />
                <span>ระดับชุดโฆษณา (Ad Set)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLevel('AD')
                }}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  level === 'AD'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-rose-600" />
                <span>ระดับโฆษณา (Ads)</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 2: SELECT ITEM (เลือกรายการ)                                         */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  เลือกรายการ (Select Item)
                </label>
              </div>
              {loadingLookup && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" /> กำลังโหลดข้อมูลโครงสร้าง...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campaign selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  แคมเปญ (Campaign) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={e => {
                    setSelectedCampaignId(e.target.value)
                    setSelectedAdSetId('')
                    setSelectedAdId('')
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:border-rose-500 outline-none"
                >
                  <option value="">-- เลือกแคมเปญ --</option>
                  {(masterLookup?.campaigns || campaigns).map((c, idx) => {
                    const cVal = c.campaignId || c.id
                    return (
                      <option key={`opt_camp_${cVal}_${idx}`} value={cVal}>
                        {c.name} ({cVal})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Ad Set selector (if level is AD_SET or AD) */}
              {(level === 'AD_SET' || level === 'AD') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    ชุดโฆษณา (Ad Set) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedAdSetId}
                    onChange={e => {
                      setSelectedAdSetId(e.target.value)
                      setSelectedAdId('')
                    }}
                    disabled={!selectedCampaignId}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:border-rose-500 outline-none disabled:opacity-50"
                  >
                    <option value="">-- เลือกชุดโฆษณา --</option>
                    {availableAdSets.map((as, idx) => {
                      const asVal = as.adSetId || as.code || as.id
                      return (
                        <option key={`opt_set_${as.campaignId || selectedCampaignId}_${asVal}_${idx}`} value={asVal}>
                          {as.name} ({asVal})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {/* Ad selector (if level is AD) */}
              {level === 'AD' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    ชื่อโฆษณา (Ads) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedAdId}
                    onChange={e => setSelectedAdId(e.target.value)}
                    disabled={!selectedCampaignId}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:border-rose-500 outline-none disabled:opacity-50"
                  >
                    <option value="">-- เลือกโฆษณา --</option>
                    {availableAds.map((ad, idx) => {
                      const adVal = ad.adId || ad.code || ad.id
                      return (
                        <option key={`opt_ad_${ad.campaignId}_${ad.adSetId}_${adVal}_${idx}`} value={adVal}>
                          {ad.adName || ad.name} ({adVal})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Selected Entity Card Preview */}
            {selectedEntityDetails && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedEntityDetails.creativeUrl ? (
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 relative">
                      <img
                        src={
                          selectedEntityDetails.creativeUrl && !selectedEntityDetails.creativeUrl.includes('fb.me') && !selectedEntityDetails.creativeUrl.includes('adspreview')
                            ? selectedEntityDetails.creativeUrl
                            : '/uploads/creatives/SP_WaterStrong_V1.jpg'
                        }
                        alt="Creative"
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.currentTarget.src = '/uploads/creatives/SP_WaterStrong_V1.jpg'
                        }}
                      />
                      {selectedEntityDetails.creativeUrl && (selectedEntityDetails.creativeUrl.includes('fb.me') || selectedEntityDetails.creativeUrl.includes('adspreview')) && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-blue-600/90 text-white rounded text-[7px] font-black leading-none shadow-xs">
                          FB
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      {level === 'CAMPAIGN' ? <Layers className="w-5 h-5" /> : level === 'AD_SET' ? <FolderIcon className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate max-w-[280px]">
                        {selectedEntityDetails.name}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        selectedEntityDetails.strategy === 'CBO'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {selectedEntityDetails.strategy}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-mono font-semibold text-slate-700">
                        {selectedEntityDetails.code}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {selectedEntityDetails.branch}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Package className="w-3 h-3 text-slate-400" />
                        {selectedEntityDetails.productGroup}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      {selectedEntityDetails.strategy === 'CBO' ? 'งบแคมเปญ (CBO)' : 'งบที่จัดสรร (ABO)'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ฿{selectedEntityDetails.budget.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedEntityDetails.status}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STEP 3: ENTER LATEST TOTALS & REALTIME METRICS (กรอกตัวเลขสะสมล่าสุด)       */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  กรอกตัวเลขสะสมล่าสุด (Enter Latest Cumulative Figures)
                </label>
              </div>

              {loadingLatest ? (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> กำลังดึงตัวเลขล่าสุด...
                </span>
              ) : previousSnapshot ? (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ดึงตัวเลขเดิมอัตโนมัติเรียบร้อย (v{previousSnapshot.version || 1})
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  ยังไม่มีประวัติ Snapshot ก่อนหน้า (จะบันทึกเป็น v1)
                </span>
              )}
            </div>

            {/* Inputs & Calculations 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Form Inputs */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                {/* Data As Of */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Data as of (วัน-เวลาที่ดึงข้อมูล):</span>
                    </label>
                    <span className="text-[10px] text-slate-400">ระบบตั้งค่าเป็นเวลาปัจจุบันอัตโนมัติ</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={dataAsOf}
                    onChange={e => setDataAsOf(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
                  />
                </div>

                {/* Amount Spent */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800">
                      ค่าใช้จ่ายสะสม (Amount Spent ฿) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      เดิม: ฿{liveMetrics.prevSpend.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 45000"
                    value={spend}
                    onChange={e => setSpend(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>

                {/* Message Inbox */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800">
                      ข้อความทักสะสม (Message Inbox)
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      เดิม: {liveMetrics.prevInbox.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    placeholder="เช่น 520"
                    value={messageInbox}
                    onChange={e => setMessageInbox(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-blue-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>

                {/* Reach & Impressions Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">การเข้าถึง (Reach)</label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {liveMetrics.prevReach.toLocaleString('th-TH')}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      placeholder="เช่น 85000"
                      value={reach}
                      onChange={e => setReach(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">การมองเห็น (Imp)</label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {liveMetrics.prevImp.toLocaleString('th-TH')}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      placeholder="เช่น 120000"
                      value={impressions}
                      onChange={e => setImpressions(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                {/* Clicks */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      จำนวนคลิกสะสม (Clicks)
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      เดิม: {liveMetrics.prevClicks.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    placeholder="เช่น 3200"
                    value={clicks}
                    onChange={e => setClicks(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:border-rose-500 outline-none"
                  />
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    บันทึกเพิ่มเติม (Notes - ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อัปเดตยอดปิดรอบบ่าย, ปรับตัวเลขตามใบเสร็จจริง..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Live Calculated Metrics & Deltas */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      คำนวณส่วนต่างและอัตราส่วนสด (Live Metrics)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      อัตโนมัติ
                    </span>
                  </div>

                  {/* Deltas from previous */}
                  <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      ส่วนต่างจากการบันทึกก่อนหน้า (Delta):
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ค่าใช้จ่าย:</span>
                        <span className={`font-bold ${liveMetrics.deltaSpend >= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {liveMetrics.deltaSpend >= 0 ? '+' : ''}฿{liveMetrics.deltaSpend.toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ข้อความทัก:</span>
                        <span className={`font-bold ${liveMetrics.deltaInbox >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                          {liveMetrics.deltaInbox >= 0 ? '+' : ''}{liveMetrics.deltaInbox.toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">การเข้าถึง:</span>
                        <span className="text-slate-700">
                          {liveMetrics.deltaReach >= 0 ? '+' : ''}{liveMetrics.deltaReach.toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">คลิก:</span>
                        <span className="text-slate-700">
                          {liveMetrics.deltaClicks >= 0 ? '+' : ''}{liveMetrics.deltaClicks.toLocaleString('th-TH')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated KPI Rates */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600">CTR (คลิก ÷ การมองเห็น):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {liveMetrics.ctr !== null ? `${liveMetrics.ctr.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600">CPC (ค่าใช้จ่าย ÷ คลิก):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {liveMetrics.cpc !== null ? `฿${liveMetrics.cpc.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600">CPM (ค่าใช้จ่าย ÷ การมองเห็น × 1k):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {liveMetrics.cpm !== null ? `฿${liveMetrics.cpm.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-medium">ต้นทุนต่อผลลัพธ์ (Cost / Result):</span>
                      <span className="font-mono font-extrabold text-rose-700">
                        {liveMetrics.costPerResult !== null ? `฿${liveMetrics.costPerResult.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-600">สัดส่วนงบที่ใช้ไป:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {liveMetrics.budgetPercent !== null ? `${liveMetrics.budgetPercent.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Non-blocking Decrease Notice (Gentle Amber banner without blocking) */}
                {liveMetrics.isDecreased && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">ข้อสังเกต: ตัวเลขสะสมล่าสุดน้อยกว่าค่าเดิม</strong>
                      <p className="mt-0.5 text-amber-800 text-[11px]">
                        ระบบจะบันทึกตามตัวเลขที่คุณระบุและสร้าง Snapshot เวอร์ชั่นใหม่พร้อมบันทึกประวัติเปรียบเทียบให้อัตโนมัติ (ไม่บล็อกการบันทึก)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedEntityDetails ? (
              <span>กำลังบันทึกข้อมูลระดับ <strong className="text-slate-800 font-semibold">{level}</strong>: {selectedEntityDetails.code}</span>
            ) : (
              <span>กรุณาเลือกรายการที่ต้องการอัปเดต</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              ยกเลิก (Cancel)
            </button>

            {/* Step 4: Single Save Button */}
            <button
              type="button"
              disabled={saving || !effectiveEntityId}
              onClick={handleSaveLatestResults}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึกผลลัพธ์...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกผลลัพธ์ล่าสุด (Save Latest Results)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FolderIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}

function ImageIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}
