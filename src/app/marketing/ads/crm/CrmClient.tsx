'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getMarketingLeads, getCrmSummaryCards, bindLeadsToCampaign, unbindLeads } from '@/app/actions/ads-crm'
import { PRODUCT_CATEGORIES } from '../constants'

const STATUS_OPTIONS = [
  'Pending', 'Price Offered', 'Invoiced', 'Paid', 'Closed Lost', 'Open Billing' // Example statuses, we'll let them filter by WITH_QUOTATION as well
]

export default function CrmClient({ initialData, initialSummary, campaigns, channels, products, userRole }: any) {
  const router = useRouter()
  const isViewer = ['Viewer/Management'].includes(userRole)

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(initialData.data)
  const [total, setTotal] = useState(initialData.total)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [summary, setSummary] = useState(initialSummary)

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    unbound: true,
    dateFrom: '',
    dateTo: '',
    campaignId: '',
    productCategory: '',
    status: ''
  })

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [bindCampaignId, setBindCampaignId] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => {} })

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, summaryRes] = await Promise.all([
        getMarketingLeads(page, 25, filters),
        getCrmSummaryCards(filters)
      ])
      setData(leadsRes.data)
      setTotal(leadsRes.total)
      setTotalPages(leadsRes.totalPages)
      setSummary(summaryRes)
      // Clear selection on page/filter change
      setSelectedLeads(new Set())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  // Don't refetch on initial mount if we just got SSR data (unless filters change)
  useEffect(() => {
    // Basic trick to avoid double fetch on mount:
    // Only fetch if page > 1 or filters aren't the initial ones
    const isInitial = page === 1 && filters.unbound === true && !filters.dateFrom && !filters.dateTo && !filters.campaignId && !filters.status;
    if (!isInitial) {
      fetchLeads()
    }
  }, [page, filters, fetchLeads])

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(data.map((d: any) => d.id)))
    } else {
      setSelectedLeads(new Set())
    }
  }

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedLeads)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedLeads(next)
  }

  const handleBind = () => {
    if (selectedLeads.size === 0) return alert('กรุณาเลือกรายการที่ต้องการผูกแคมเปญ')
    if (!bindCampaignId) return alert('กรุณาเลือกแคมเปญเป้าหมาย')
    
    const camp = campaigns.find((c: any) => c.id === bindCampaignId)
    
    setConfirmModal({
      isOpen: true,
      message: `ยืนยันการผูก ${selectedLeads.size} รายการ เข้ากับแคมเปญ: ${camp?.name || ''}?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        setLoading(true)
        try {
          await bindLeadsToCampaign(Array.from(selectedLeads), bindCampaignId)
          await fetchLeads()
        } catch (err: any) {
          alert('Error: ' + err.message)
        }
        setLoading(false)
      }
    })
  }

  const handleUnbind = () => {
    if (selectedLeads.size === 0) return alert('กรุณาเลือกรายการที่ต้องการยกเลิกผูกแคมเปญ')
    
    setConfirmModal({
      isOpen: true,
      message: `ยืนยันการยกเลิกผูกแคมเปญ จำนวน ${selectedLeads.size} รายการ?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        setLoading(true)
        try {
          await unbindLeads(Array.from(selectedLeads))
          await fetchLeads()
        } catch (err: any) {
          alert('Error: ' + err.message)
        }
        setLoading(false)
      }
    })
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 uppercase">ระบบจัดการข้อมูลโฆษณา TERA</h1>
        <p className="text-gray-500 text-sm">ผลลัพธ์ CRM และยอดขาย</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-8">
        <Link href="/marketing/ads/campaigns" className="pb-4 border-b-2 flex items-center font-bold border-transparent text-gray-400 hover:text-gray-600">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 bg-gray-200 text-gray-500">1</div>
          ตั้งค่าแคมเปญ
        </Link>
        <Link href="/marketing/ads/campaigns" className="pb-4 border-b-2 flex items-center font-bold border-transparent text-gray-400 hover:text-gray-600">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 bg-gray-200 text-gray-500">2</div>
          ผลการโฆษณา
        </Link>
        <div className="pb-4 border-b-2 flex items-center font-bold border-red-600 text-red-600">
          <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs mr-2">3</div>
          ผลลัพธ์ CRM
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">วันที่เริ่มต้น:</label>
          <input type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">วันที่สิ้นสุด:</label>
          <input type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">แคมเปญ:</label>
          <select value={filters.campaignId} onChange={e => handleFilterChange('campaignId', e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm max-w-[200px] truncate">
            <option value="">ทั้งหมด</option>
            {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.internalCode} - {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">กลุ่มสินค้า:</label>
          <select
            value={filters.productCategory}
            onChange={(e) => handleFilterChange('productCategory', e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">ทุกกลุ่มสินค้า</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">สถานะใบเสนอราคา:</label>
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">ทั้งหมด</option>
            <option value="WITH_QUOTATION">มีใบเสนอราคา</option>
            <option value="WITHOUT_QUOTATION">ไม่มีใบเสนอราคา</option>
            <optgroup label="สถานะ CRM">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="flex items-center space-x-2 pb-1.5 ml-auto">
          <input type="checkbox" id="unbound" checked={filters.unbound} onChange={e => handleFilterChange('unbound', e.target.checked)} className="rounded text-red-600" />
          <label htmlFor="unbound" className="text-sm font-semibold text-gray-700 cursor-pointer">แสดงเฉพาะรายชื่อที่ยังไม่ได้ผูกแคมเปญ</label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase">จำนวนรายชื่อ (Leads)</div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalLeads.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase">รอลูกค้า (Qualified)</div>
          <div className="text-3xl font-bold text-gray-900">{summary.qualifiedCount ?? 'N/A'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase">ใบเสนอราคา (Quotation)</div>
          <div className="text-3xl font-bold text-gray-900">{summary.quotationCount.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase">ปิดการขาย (Closed Won)*</div>
          <div className="text-3xl font-bold text-gray-900">{summary.closedWonCount ?? 'N/A'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase">ยอดขาย (Sale)*</div>
          <div className="text-3xl font-bold text-gray-900">฿{summary.saleAmount?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? 'N/A'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-6">* อ้างอิงจากสถานะ 'Open Billing', 'Invoiced', 'Paid' (รอการยืนยันเงื่อนไขจากทีมการตลาด)</div>

      {/* Grid */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-700">{selectedLeads.size} รายการที่เลือก</span>
          </div>
          <div className="flex items-center space-x-3">
            <select 
              value={bindCampaignId} 
              onChange={e => setBindCampaignId(e.target.value)} 
              disabled={isViewer}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 max-w-sm truncate focus:ring-1 focus:ring-red-500"
            >
              <option value="">-- เลือกแคมเปญที่ต้องการผูก --</option>
              {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.internalCode} | {c.name} | {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</option>)}
            </select>
            <button onClick={handleBind} disabled={isViewer || !bindCampaignId || selectedLeads.size === 0} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded shadow-sm disabled:opacity-50">ผูกแคมเปญ</button>
            <button onClick={handleUnbind} disabled={isViewer || selectedLeads.size === 0} className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded shadow-sm disabled:opacity-50">ยกเลิกผูกแคมเปญ</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th colSpan={4} className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r">ข้อมูลลูกค้า (LEAD IDENTIFICATION)</th>
                <th colSpan={3} className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r bg-blue-50">แหล่งที่มา (CAMPAIGN ATTRIBUTION)</th>
                <th colSpan={6} className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider bg-orange-50">ผลลัพธ์ CRM (CRM OUTCOME - อ่านเท่านั้น)</th>
              </tr>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 border-r text-center w-10">
                  <input type="checkbox" checked={selectedLeads.size === data.length && data.length > 0} onChange={handleSelectAll} className="rounded text-red-600" />
                </th>
                <th className="px-3 py-2 font-semibold text-gray-700">รหัส</th>
                <th className="px-3 py-2 font-semibold text-gray-700">วันที่สร้าง</th>
                <th className="px-3 py-2 font-semibold text-gray-700 border-r">ชื่อลูกค้า / บริษัท</th>
                
                <th className="px-3 py-2 font-semibold text-gray-700 bg-blue-50/50">ช่องทาง / แหล่งที่มา</th>
                <th className="px-3 py-2 font-semibold text-gray-700 bg-blue-50/50">รหัสแคมเปญ</th>
                <th className="px-3 py-2 font-semibold text-gray-700 bg-blue-50/50 border-r">ชื่อแคมเปญ</th>
                
                <th className="px-3 py-2 font-semibold text-gray-700 bg-orange-50/50">สถานะ</th>
                <th className="px-3 py-2 font-semibold text-gray-700 bg-orange-50/50 text-right">ใบเสนอราคา (Quotation) Amt</th>
                <th className="px-3 py-2 font-semibold text-gray-700 bg-orange-50/50 text-right">ยอดขาย</th>
                <th className="px-3 py-2 font-semibold text-gray-700 bg-orange-50/50">วันที่ปิดการขาย</th>
                <th className="px-3 py-2 font-semibold text-gray-700 bg-orange-50/50">เหตุผลที่แพ้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 relative">
              {loading && (
                <tr>
                  <td colSpan={12} className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 min-h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </td>
                </tr>
              )}
              {data.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-r text-center">
                    <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => handleSelectRow(lead.id)} className="rounded text-red-600" />
                  </td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs">{lead.id.slice(-8)}</td>
                  <td className="px-3 py-2 text-gray-600">{new Date(lead.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="px-3 py-2 text-gray-800 border-r">{lead.companyName || lead.customerName || '-'}</td>
                  
                  <td className="px-3 py-2 text-gray-600 bg-blue-50/10">{lead.adCampaign?.channel?.name || lead.leadSource || '-'}</td>
                  <td className="px-3 py-2 text-gray-600 bg-blue-50/10 font-mono text-xs">{lead.adCampaign?.internalCode || <span className="text-red-400 italic">ยังไม่ผูก</span>}</td>
                  <td className="px-3 py-2 text-gray-800 bg-blue-50/10 border-r">{lead.adCampaign?.name || '-'}</td>
                  
                  {lead.quotation ? (
                    <>
                      <td className="px-3 py-2 bg-orange-50/10">
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700`}>{lead.quotation.status}</span>
                      </td>
                      <td className="px-3 py-2 bg-orange-50/10 text-right text-gray-600">{lead.quotation.totalAmountBeforeVat ? `฿${Number(lead.quotation.totalAmountBeforeVat).toLocaleString()}` : '-'}</td>
                      <td className="px-3 py-2 bg-orange-50/10 text-right font-medium text-gray-900">{lead.quotation.actualClosingAmount ? `฿${Number(lead.quotation.actualClosingAmount).toLocaleString()}` : '-'}</td>
                      <td className="px-3 py-2 bg-orange-50/10 text-gray-600">{lead.quotation.billingDate || lead.quotation.statusChangedAt ? new Date(lead.quotation.billingDate || lead.quotation.statusChangedAt).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-3 py-2 bg-orange-50/10 text-gray-600 truncate max-w-[150px]">{lead.quotation.winLossReason || lead.quotation.rejectReason || '-'}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="px-3 py-2 bg-orange-50/10 text-center text-gray-400 italic border-l">
                      ไม่มีใบเสนอราคา
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-500">ไม่พบข้อมูลลูกค้าที่ค้นหา</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            แสดง <span className="font-medium">{Math.min((page - 1) * 25 + 1, total)}</span> ถึง <span className="font-medium">{Math.min(page * 25, total)}</span> จากทั้งหมด <span className="font-medium">{total}</span> รายการ
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50">ก่อนหน้า</button>
            <div className="px-3 py-1 bg-gray-100 rounded text-sm">หน้า {page} จาก {totalPages || 1}</div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50">ถัดไป</button>
          </div>
        </div>

      </div>

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการดำเนินการ</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
