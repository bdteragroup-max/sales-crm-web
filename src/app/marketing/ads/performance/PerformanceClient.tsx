'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { getDistinctAdSetsAndAds, bulkSavePerformanceEntries, deletePerformanceEntry } from '@/app/actions/ads-performance'
import { calculateAdsMetrics, formatMetric } from '@/lib/adsMetrics'
import { Plus, Download, Save, Trash2, Lock, MessageSquare, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Search, Info, StickyNote } from 'lucide-react'

export default function PerformanceClient({ campaigns, resultTypes, initialPerformances }: any) {
  const [draftRows, setDraftRows] = useState<any[]>(
    (initialPerformances || []).map((p: any) => ({
      ...p,
      _id: p.id,
      isSaved: true
    }))
  )

  const [page, setPage] = useState(1)
  const rowsPerPage = 25
  const [searchQuery, setSearchQuery] = useState('')

  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterChannel, setFilterChannel] = useState('All')
  const [filterProduct, setFilterProduct] = useState('All')
  const [filterCampaign, setFilterCampaign] = useState('All')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null)
  const [rowToDelete, setRowToDelete] = useState<{ id: string, isSaved: boolean } | null>(null)

  const [distinctValuesCache, setDistinctValuesCache] = useState<Record<string, { adSets: string[], ads: string[] }>>({})

  // Compute products and channels for filters
  const channels = useMemo(() => {
    const ch = new Set<string>()
    campaigns.forEach((c: any) => { if (c.channel?.name) ch.add(c.channel.name) })
    return Array.from(ch)
  }, [campaigns])

  const products = useMemo(() => {
    const pr = new Set<string>()
    campaigns.forEach((c: any) => { if (c.product?.name) pr.add(c.product.name) })
    return Array.from(pr)
  }, [campaigns])

  const fetchDistinct = async (campaignId: string) => {
    if (!campaignId || distinctValuesCache[campaignId]) return;
    try {
      const res = await getDistinctAdSetsAndAds(campaignId)
      setDistinctValuesCache(prev => ({ ...prev, [campaignId]: res }))
    } catch (e) { }
  }

  const handleAddRow = () => {
    setDraftRows([{
      _id: 'draft_' + Date.now() + Math.random(),
      isSaved: false,
      dateFrom: filterDateFrom || new Date().toISOString().split('T')[0],
      dateTo: filterDateTo || new Date().toISOString().split('T')[0],
      campaignId: filterCampaign !== 'All' ? filterCampaign : '',
      adSetId: '',
      adId: '',
      spend: null,
      impressions: null,
      reach: null,
      linkClicks: null,
      messageInbox: null,
      results: null,
      resultTypeId: '',
      note: ''
    }, ...draftRows])
    setPage(1)
  }

  const handleDeleteRow = async (id: string, isSaved: boolean) => {
    if (isSaved) {
      setRowToDelete({ id, isSaved })
    } else {
      setDraftRows(draftRows.filter(r => r._id !== id))
    }
  }

  const confirmDeleteRow = async () => {
    if (!rowToDelete) return;
    try {
      await deletePerformanceEntry(rowToDelete.id)
      setDraftRows(draftRows.filter(r => r._id !== rowToDelete.id))
      setRowToDelete(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const updateRow = (id: string, field: string, value: any) => {
    if (field === 'campaignId') {
      fetchDistinct(value)
    }
    setDraftRows(prev => prev.map(row => {
      if (row._id === id) {
        return { ...row, [field]: value, isSaved: false }
      }
      return row
    }))
  }

  const filteredRows = useMemo(() => {
    return draftRows.filter(r => {
      if (filterDateFrom && r.dateFrom && new Date(r.dateFrom) < new Date(filterDateFrom)) return false;
      if (filterDateTo && r.dateTo && new Date(r.dateTo) > new Date(filterDateTo)) return false;

      const campaign = campaigns.find((c: any) => c.campaignId === r.campaignId)
      if (filterChannel !== 'All' && campaign?.channel?.name !== filterChannel) return false;
      if (filterProduct !== 'All' && campaign?.product?.name !== filterProduct) return false;
      if (filterCampaign !== 'All' && r.campaignId !== filterCampaign) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !r.adSetId?.toLowerCase().includes(q) &&
          !r.adId?.toLowerCase().includes(q) &&
          !campaign?.name?.toLowerCase().includes(q)
        ) return false;
      }
      return true
    })
      .sort((a, b) => {
        // Nulls sort last could apply here if we sorted by a specific field, but let's sort by date desc
        const dateA = new Date(a.dateFrom || 0).getTime()
        const dateB = new Date(b.dateFrom || 0).getTime()
        return dateB - dateA
      })
  }, [draftRows, filterDateFrom, filterDateTo, filterChannel, filterProduct, filterCampaign, searchQuery, campaigns])

  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage
    return filteredRows.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredRows, page])

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage)

  const validationStatus = useMemo(() => {
    let hasErrors = false
    let readyCount = 0
    let duplicatedDraftKeys = new Set<string>()
    let seenKeys = new Set<string>()

    const unsaved = draftRows.filter(r => !r.isSaved)

    // Check for duplicates within draft
    unsaved.forEach(r => {
      if (r.campaignId && r.dateFrom && r.dateTo) {
        const key = `${r.campaignId}_${r.dateFrom}_${r.dateTo}_${r.adSetId?.trim().toLowerCase() || ''}_${r.adId?.trim().toLowerCase() || ''}`
        if (seenKeys.has(key)) duplicatedDraftKeys.add(key)
        seenKeys.add(key)
      }
    })

    const rowsWithErrors = new Set<string>()

    unsaved.forEach(r => {
      let err = false
      if (!r.campaignId || !r.dateFrom || !r.dateTo || r.spend === null || r.spend === '') err = true;
      if (r.results > 0 && !r.resultTypeId) err = true;

      const key = `${r.campaignId}_${r.dateFrom}_${r.dateTo}_${r.adSetId?.trim().toLowerCase() || ''}_${r.adId?.trim().toLowerCase() || ''}`
      if (duplicatedDraftKeys.has(key)) err = true;

      if (err) {
        hasErrors = true
        rowsWithErrors.add(r._id)
      } else {
        readyCount++
      }
    })

    return { hasErrors, readyCount, duplicatedDraftKeys, rowsWithErrors, unsavedCount: unsaved.length }
  }, [draftRows])

  const handleSaveData = async (overwrite = false) => {
    if (validationStatus.hasErrors && !overwrite) return;
    const unsaved = draftRows.filter(r => !r.isSaved)
    if (unsaved.length === 0) return;

    setSaving(true)
    setError('')
    try {
      const payload = unsaved.map(r => {
        const d = { ...r }
        // Format dates correctly for server
        d.dateFrom = new Date(r.dateFrom).toISOString()
        d.dateTo = new Date(r.dateTo).toISOString()
        // Convert input strings to numbers
        d.spend = Number(r.spend)
        d.impressions = r.impressions ? Number(r.impressions) : null
        d.reach = r.reach ? Number(r.reach) : null
        d.linkClicks = r.linkClicks ? Number(r.linkClicks) : null
        d.messageInbox = r.messageInbox ? Number(r.messageInbox) : null
        d.results = r.results ? Number(r.results) : null
        return d
      })

      const res = await bulkSavePerformanceEntries(payload, overwrite)

      if (!res.success) {
        setDuplicateWarning(res)
      } else {
        setDuplicateWarning(null)
        setDraftRows(prev => prev.map(r => ({ ...r, isSaved: true })))
        // In a real app we might reload data, but state is updated.
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Summaries
  const summaries = useMemo(() => {
    // dedupe budgets
    const processedCampaigns = new Set()
    let totalBudget = 0
    let totalSpend = 0
    let totalInbox = 0
    let totalResults = 0

    draftRows.forEach(r => {
      const camp = campaigns.find((c: any) => c.campaignId === r.campaignId)
      if (camp && !processedCampaigns.has(camp.campaignId)) {
        totalBudget += Number(camp.budget || 0)
        processedCampaigns.add(camp.campaignId)
      }
      totalSpend += Number(r.spend || 0)
      totalInbox += Number(r.messageInbox || 0)
      totalResults += Number(r.results || 0)
    })
    return { totalBudget, totalSpend, totalInbox, totalResults }
  }, [draftRows, campaigns])

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date From:</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date To:</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Channel:</label>
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
              <option value="All">ทั้งหมด</option>
              {channels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product:</label>
            <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
              <option value="All">ทั้งหมด</option>
              {products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Campaign:</label>
            <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm max-w-[150px]">
              <option value="All">ทั้งหมด</option>
              {campaigns.map((c: any) => <option key={c.campaignId} value={c.campaignId}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Click Metric:</label>
            <select disabled className="border rounded-md px-3 py-1.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed">
              <option>จำนวนคลิกลิงก์</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-400 cursor-not-allowed" title="Available in next phase">
              <Download className="w-4 h-4" /> Import CSV
            </button>
            <button onClick={handleAddRow} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm">
              <Plus className="w-4 h-4" /> Add Row
            </button>
            <button
              onClick={() => handleSaveData()}
              disabled={validationStatus.hasErrors || validationStatus.unsavedCount === 0 || saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors
                ${validationStatus.unsavedCount === 0 ? 'bg-gray-800 text-white opacity-50' :
                  validationStatus.hasErrors ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                    'bg-gray-800 text-white hover:bg-gray-900'}`}
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Data'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-yellow-50 rounded border border-yellow-100"></div> Manual Input</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gray-50 rounded border border-gray-200"></div> Auto / Read Only</div>
          <div className="flex items-center gap-1.5 text-red-500 font-medium">* Required</div>
          <div className="flex items-center gap-1.5 text-blue-500"><Info className="w-4 h-4" /> Budget is loaded from Campaign Setup.</div>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Duplicate DB Warning Dialog */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">ข้อมูลซ้ำซ้อน (Duplicate Data)</h3>
            <p className="text-gray-600 mb-6">{duplicateWarning.message} คุณต้องการอัปเดตข้อมูลทับข้อมูลเดิม หรือยกเลิกการบันทึก? (Do you want to overwrite or cancel?)</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDuplicateWarning(null)} className="px-4 py-2 border rounded-lg font-medium text-gray-700">ยกเลิก (Cancel)</button>
              <button onClick={() => handleSaveData(true)} className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium">อัปเดตทั้งหมด (Update All)</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {rowToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบ (Confirm Deletion)</h3>
            <p className="text-gray-600 mb-6">คุณต้องการลบข้อมูลนี้ออกจากระบบใช่หรือไม่? ข้อมูลที่ลบจะไม่สามารถกู้คืนได้ (Are you sure you want to delete this row? This cannot be undone.)</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRowToDelete(null)} className="px-4 py-2 border rounded-lg font-medium text-gray-700">ยกเลิก (Cancel)</button>
              <button onClick={confirmDeleteRow} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">ลบข้อมูล (Delete)</button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-gray-800">บันทึกผลโฆษณา (ADS PERFORMANCE INPUT)</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา Ad Set, Ad..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-64 focus:ring-1 focus:ring-red-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-xs text-center border-b border-gray-200">
              <tr>
                <th colSpan={7} className="py-2 border-r border-gray-200">ข้อมูลระบุตัวตน (IDENTIFICATION)</th>
                <th colSpan={7} className="py-2 border-r border-gray-200 bg-yellow-50/30">การนำส่ง — กรอกข้อมูลเอง (MANUAL INPUT)</th>
                <th colSpan={5} className="py-2 bg-gray-100/50">อัตโนมัติ / อ่านเท่านั้น (AUTO / READ ONLY)</th>
                <th rowSpan={2} className="w-10"></th>
              </tr>
              <tr className="border-b border-gray-200 divide-x divide-gray-100">
                <th className="p-3 font-semibold w-32">วันที่เริ่มต้น (Date From) <span className="text-red-500">*</span></th>
                <th className="p-3 font-semibold w-32">วันที่สิ้นสุด (Date To) <span className="text-red-500">*</span></th>
                <th className="p-3 font-semibold">ช่องทาง (Channel)</th>
                <th className="p-3 font-semibold">สินค้า (Product)</th>
                <th className="p-3 font-semibold min-w-[150px]">แคมเปญ (Campaign) <span className="text-red-500">*</span></th>
                <th className="p-3 font-semibold min-w-[150px]">รหัส Ad Set (Ad Set ID)</th>
                <th className="p-3 font-semibold min-w-[150px]">รหัส Ad / Artwork (Ad ID)</th>

                {/* MANUAL */}
                <th className="p-3 font-semibold bg-yellow-50/50">ค่าใช้จ่าย (Spend) <span className="text-red-500">*</span></th>
                <th className="p-3 font-semibold bg-yellow-50/50">ข้อความ (Inbox)</th>
                <th className="p-3 font-semibold bg-yellow-50/50">การเข้าถึง (Reach)</th>
                <th className="p-3 font-semibold bg-yellow-50/50">การมองเห็น (Impressions)</th>
                <th className="p-3 font-semibold bg-yellow-50/50">คลิก (Clicks)</th>
                <th className="p-3 font-semibold bg-yellow-50/50">ผลลัพธ์ (Results)</th>
                <th className="p-3 font-semibold bg-yellow-50/50 min-w-[120px]">ประเภทผลลัพธ์ (Result Type)</th>

                {/* AUTO */}
                <th className="p-3 font-semibold bg-gray-50 text-gray-500"><div className="flex items-center justify-center gap-1">งบประมาณ (Budget) <Lock className="w-3 h-3" /></div></th>
                <th className="p-3 font-semibold bg-gray-50 text-gray-500"><div className="flex items-center justify-center gap-1">CPC <Lock className="w-3 h-3" /></div></th>
                <th className="p-3 font-semibold bg-gray-50 text-gray-500"><div className="flex items-center justify-center gap-1">CPM <Lock className="w-3 h-3" /></div></th>
                <th className="p-3 font-semibold bg-gray-50 text-gray-500"><div className="flex items-center justify-center gap-1">CTR <Lock className="w-3 h-3" /></div></th>
                <th className="p-3 font-semibold bg-gray-50 text-gray-500"><div className="flex items-center justify-center gap-1">ต้นทุน/ผลลัพธ์ (Cost/Result) <Lock className="w-3 h-3" /></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRows.length === 0 && (
                <tr><td colSpan={20} className="text-center py-8 text-gray-500">ไม่พบข้อมูล (No data found)</td></tr>
              )}
              {paginatedRows.map((row) => {
                const campaign = campaigns.find((c: any) => c.campaignId === row.campaignId)
                const isCrossMonth = row.dateFrom && row.dateTo && (new Date(row.dateFrom).getMonth() !== new Date(row.dateTo).getMonth())
                const spendOverBudget = campaign?.budget && Number(row.spend) > Number(campaign.budget)
                const key = `${row.campaignId}_${row.dateFrom}_${row.dateTo}_${row.adSetId?.trim().toLowerCase() || ''}_${row.adId?.trim().toLowerCase() || ''}`
                const isDuplicateDraft = !row.isSaved && validationStatus.duplicatedDraftKeys.has(key)
                const isError = validationStatus.rowsWithErrors.has(row._id)

                // Live metrics
                const metrics = calculateAdsMetrics({
                  budget: Number(campaign?.budget || 0),
                  spend: Number(row.spend || 0),
                  impressions: Number(row.impressions || 0),
                  reach: Number(row.reach || 0),
                  linkClicks: Number(row.linkClicks || 0),
                  messageInbox: Number(row.messageInbox || 0),
                  results: Number(row.results || 0),
                  leads: null, qualifiedLeads: null, closedSales: null, sale: null
                })

                return (
                  <tr key={row._id} className={`${row.isSaved ? 'hover:bg-gray-50' : 'bg-yellow-50/20'} ${isError ? 'ring-1 ring-inset ring-red-200' : ''}`}>
                    <td className="p-2">
                      <input type="date" value={row.dateFrom ? new Date(row.dateFrom).toISOString().split('T')[0] : ''}
                        onChange={e => updateRow(row._id, 'dateFrom', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500 ${isCrossMonth ? 'border-orange-300 bg-orange-50 text-orange-800' : ''}`}
                        title={isCrossMonth ? 'Warning: Dates cross multiple months' : ''}
                      />
                    </td>
                    <td className="p-2">
                      <input type="date" value={row.dateTo ? new Date(row.dateTo).toISOString().split('T')[0] : ''}
                        onChange={e => updateRow(row._id, 'dateTo', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500 ${isCrossMonth ? 'border-orange-300 bg-orange-50 text-orange-800' : ''}`}
                      />
                    </td>
                    <td className="p-2 text-center text-gray-500 bg-gray-50">{campaign?.channel?.name || '-'}</td>
                    <td className="p-2 text-center text-gray-500 bg-gray-50">{campaign?.product?.product_name || '-'}</td>
                    <td className="p-2">
                      <select
                        value={row.campaignId}
                        onChange={e => updateRow(row._id, 'campaignId', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500"
                        title={campaign ? `Objective: ${campaign.objective?.name}\nStatus: ${campaign.status}` : ''}
                      >
                        <option value="">เลือก...</option>
                        {campaigns.map((c: any) => <option key={c.campaignId} value={c.campaignId}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2 relative">
                      <input
                        list={`adsets-${row.campaignId}`}
                        value={row.adSetId || ''}
                        onChange={e => updateRow(row._id, 'adSetId', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500 ${isDuplicateDraft ? 'border-red-400 bg-red-50 text-red-800' : ''}`}
                        placeholder="พิมพ์หรือเลือก..."
                      />
                      <datalist id={`adsets-${row.campaignId}`}>
                        {distinctValuesCache[row.campaignId]?.adSets.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </td>
                    <td className="p-2">
                      <input
                        list={`ads-${row.campaignId}`}
                        value={row.adId || ''}
                        onChange={e => updateRow(row._id, 'adId', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500 ${isDuplicateDraft ? 'border-red-400 bg-red-50 text-red-800' : ''}`}
                        placeholder="พิมพ์หรือเลือก..."
                      />
                      <datalist id={`ads-${row.campaignId}`}>
                        {distinctValuesCache[row.campaignId]?.ads.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </td>

                    {/* MANUAL INPUTS */}
                    <td className="p-2 bg-yellow-50/30">
                      <input type="number" step="0.01" value={row.spend === null ? '' : row.spend}
                        onChange={e => updateRow(row._id, 'spend', e.target.value === '' ? null : e.target.value)}
                        className={`w-20 text-xs text-right px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500 ${!row.spend ? 'border-red-300' : ''} ${spendOverBudget ? 'border-orange-400 bg-orange-50 text-orange-900' : ''}`}
                        title={spendOverBudget ? 'Spend exceeds Campaign Budget!' : ''}
                      />
                    </td>
                    <td className="p-2 bg-yellow-50/30">
                      <input type="number" value={row.messageInbox === null ? '' : row.messageInbox} onChange={e => updateRow(row._id, 'messageInbox', e.target.value === '' ? null : e.target.value)} className="w-16 text-xs text-right px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500" />
                    </td>
                    <td className="p-2 bg-yellow-50/30">
                      <input type="number" value={row.reach === null ? '' : row.reach} onChange={e => updateRow(row._id, 'reach', e.target.value === '' ? null : e.target.value)} className="w-20 text-xs text-right px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500" />
                    </td>
                    <td className="p-2 bg-yellow-50/30">
                      <input type="number" value={row.impressions === null ? '' : row.impressions} onChange={e => updateRow(row._id, 'impressions', e.target.value === '' ? null : e.target.value)} className="w-20 text-xs text-right px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500" />
                    </td>
                    <td className="p-2 bg-yellow-50/30">
                      <input type="number" value={row.linkClicks === null ? '' : row.linkClicks} onChange={e => updateRow(row._id, 'linkClicks', e.target.value === '' ? null : e.target.value)} className="w-20 text-xs text-right px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500" />
                    </td>
                    <td className="p-2 bg-yellow-50/30">
                      <input type="number" value={row.results === null ? '' : row.results} onChange={e => updateRow(row._id, 'results', e.target.value === '' ? null : e.target.value)} className="w-16 text-xs text-right px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500" />
                    </td>
                    <td className="p-2 bg-yellow-50/30">
                      <select
                        value={row.resultTypeId || ''}
                        onChange={e => updateRow(row._id, 'resultTypeId', e.target.value)}
                        className={`w-full text-xs px-2 py-1.5 border rounded outline-none focus:ring-1 focus:ring-red-500 ${(row.results > 0 && !row.resultTypeId) ? 'border-red-400 bg-red-50' : ''}`}
                      >
                        <option value="">-</option>
                        {resultTypes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>

                    {/* AUTO READ ONLY */}
                    <td className="p-2 text-right bg-gray-50 text-gray-700 font-medium">{formatMetric(Number(campaign?.budget || 0), 'thb')}</td>
                    <td className="p-2 text-right bg-gray-50 text-gray-700">{formatMetric(metrics.cpc, 'thb')}</td>
                    <td className="p-2 text-right bg-gray-50 text-gray-700">{formatMetric(metrics.cpm, 'thb')}</td>
                    <td className="p-2 text-right bg-gray-50 text-gray-700">{formatMetric(metrics.ctr, 'pct')}</td>
                    <td className="p-2 text-right bg-gray-50 text-gray-700">{formatMetric(metrics.costPerResult, 'thb')}</td>

                    {/* ACTIONS */}
                    <td className="p-2">
                      <div className="flex items-center gap-2 relative group">
                        <div className="relative">
                          <button className="text-gray-400 hover:text-blue-500 p-1 rounded-md hover:bg-blue-50 transition-colors" title="Notes">
                            <StickyNote className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-64 bg-white border shadow-lg rounded-lg p-3 hidden group-hover:block z-10">
                            <label className="block text-xs font-medium mb-1">หมายเหตุ</label>
                            <textarea
                              value={row.note || ''}
                              onChange={e => updateRow(row._id, 'note', e.target.value)}
                              className="w-full border rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-blue-500 h-20"
                              placeholder="เพิ่มหมายเหตุที่นี่..."
                            />
                          </div>
                        </div>
                        <button onClick={() => handleDeleteRow(row._id, row.isSaved)} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary & Status */}
      <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {validationStatus.unsavedCount === 0 ? (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="w-5 h-5" /> All rows saved
            </div>
          ) : validationStatus.hasErrors ? (
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <AlertCircle className="w-5 h-5" />
              {validationStatus.unsavedCount - validationStatus.readyCount} rows have errors or missing fields
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="w-5 h-5" /> {validationStatus.readyCount} rows ready to save
            </div>
          )}
          <div className="text-gray-400 text-xs ml-4 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> CPC, CPM, CTR and Cost per Result are calculated automatically.
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center px-6 py-2 border-r">
            <div className="text-xs text-gray-500 font-medium mb-1">งบประมาณรวม (Total Budget)</div>
            <div className="text-xl font-bold text-gray-900">{formatMetric(summaries.totalBudget, 'thb')}</div>
          </div>
          <div className="text-center px-6 py-2 border-r">
            <div className="text-xs text-gray-500 font-medium mb-1">ค่าใช้จ่ายรวม (Total Spend)</div>
            <div className="text-xl font-bold text-gray-900">{formatMetric(summaries.totalSpend, 'thb')}</div>
          </div>
          <div className="text-center px-6 py-2 border-r">
            <div className="text-xs text-gray-500 font-medium mb-1">ข้อความรวม (Total Inbox)</div>
            <div className="text-xl font-bold text-gray-900">{formatMetric(summaries.totalInbox, 'int')}</div>
          </div>
          <div className="text-center px-6 py-2 border-r">
            <div className="text-xs text-gray-500 font-medium mb-1">ผลลัพธ์รวม (Total Results)</div>
            <div className="text-xl font-bold text-gray-900">{formatMetric(summaries.totalResults, 'int')}</div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-4 pl-4">
            <div className="text-sm text-gray-600">
              Rows per page <select className="border rounded px-2 py-1 ml-1 bg-gray-50" disabled><option>25</option></select>
            </div>
            <div className="text-sm text-gray-600">
              {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredRows.length)} จาก {filteredRows.length}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
