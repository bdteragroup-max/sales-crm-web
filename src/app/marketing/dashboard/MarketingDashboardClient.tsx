'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { Filter, Users, DollarSign, RotateCcw, Building2, User, Package, Layers, X, BarChart3 } from 'lucide-react'

const COLORS = ['#ff2301', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#4285F4', '#0F9D58', '#E91E63', '#9C27B0', '#00BCD4', '#795548'];

export const getThaiBranchName = (branch: string | null | undefined): string => {
  if (!branch) return 'ไม่ระบุสาขา'
  const map: Record<string, string> = {
    'BKK-HQ': 'สำนักงานใหญ่ (BKK-HQ)',
    'KK01': 'ขอนแก่น (KK01)',
    'PSNL01': 'พิษณุโลก (PSNL01)',
    'CMI01': 'เชียงใหม่ (CMI01)',
    'KRI01': 'กาญจนบุรี (KRI01)',
    'UB01': 'อุบลราชธานี (UB01)',
    'SRT01': 'สุราษฎร์ธานี (SRT01)',
    'UDN01': 'อุดรธานี (UDN01)',
    'SRN01': 'สุรินทร์ (SRN01)',
    'ROI01': 'ร้อยเอ็ด (ROI01)',
    'SN01': 'สกลนคร (SN01)',
    'NRT': 'นครราชสีมา (NRT)',
    'BKK-WH': 'Tera Warehouse 62',
    'SMK': 'สมุทรสาคร (SMK)',
    'UNSPECIFIED': 'ไม่ระบุสาขา'
  }
  return map[branch] || branch
}

type ChartData = {
  name: string
  value: number
  sales: number
}

interface MarketingDashboardClientProps {
  initialData: ChartData[]
  statusData: ChartData[]
  crossData: { channel: string; statuses: Record<string, { count: number; sales: number }> }[]
  allStatuses: string[]
  channelBranchData: {
    channel: string
    branches: Record<string, { count: number; sales: number }>
    totalCount: number
    totalSales: number
  }[]
  activeBranchCodes: string[]
  branchTotals: Record<string, { count: number; sales: number }>
  channelProductData: {
    channel: string
    productGroups: Record<string, { count: number; sales: number }>
    totalCount: number
    totalSales: number
  }[]
  activeProductGroups: string[]
  productTotals: Record<string, { count: number; sales: number }>
  availableBranches: { code: string; label: string }[]
  availableSalespeople: { id: string; name: string }[]
  availableProductGroups: string[]
  selectedBranch: string
  selectedSalespersonId: string
  selectedProductGroup: string
  startDate: string
  endDate: string
  totalCompanies: number
  totalSales: number
}

export default function MarketingDashboardClient({
  initialData,
  statusData,
  crossData,
  allStatuses,
  channelBranchData,
  activeBranchCodes,
  branchTotals,
  channelProductData,
  activeProductGroups,
  productTotals,
  availableBranches,
  availableSalespeople,
  availableProductGroups,
  selectedBranch,
  selectedSalespersonId,
  selectedProductGroup,
  startDate,
  endDate,
  totalCompanies,
  totalSales
}: MarketingDashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)
  const [branch, setBranch] = useState(selectedBranch)
  const [salespersonId, setSalespersonId] = useState(selectedSalespersonId)
  const [productGroup, setProductGroup] = useState(selectedProductGroup)

  const [activeTab, setActiveTab] = useState<'channel-branch' | 'channel-product' | 'channel-status'>('channel-branch')

  // Sync internal state with URL props
  React.useEffect(() => {
    setDateStart(startDate)
    setDateEnd(endDate)
    setBranch(selectedBranch)
    setSalespersonId(selectedSalespersonId)
    setProductGroup(selectedProductGroup)
  }, [startDate, endDate, selectedBranch, selectedSalespersonId, selectedProductGroup])

  const navigateWithFilters = (overrides?: {
    startDate?: string
    endDate?: string
    branch?: string
    salespersonId?: string
    productGroup?: string
  }) => {
    const nextStart = overrides?.startDate !== undefined ? overrides.startDate : dateStart
    const nextEnd = overrides?.endDate !== undefined ? overrides.endDate : dateEnd
    const nextBranch = overrides?.branch !== undefined ? overrides.branch : branch
    const nextSalesperson = overrides?.salespersonId !== undefined ? overrides.salespersonId : salespersonId
    const nextProductGroup = overrides?.productGroup !== undefined ? overrides.productGroup : productGroup

    const params = new URLSearchParams()
    if (nextStart) params.set('startDate', nextStart)
    if (nextEnd) params.set('endDate', nextEnd)
    if (nextBranch) params.set('branch', nextBranch)
    if (nextSalesperson) params.set('salespersonId', nextSalesperson)
    if (nextProductGroup) params.set('productGroup', nextProductGroup)

    startTransition(() => {
      router.push(`/marketing/dashboard?${params.toString()}`)
    })
  }

  const handleApplyFilter = () => {
    navigateWithFilters()
  }

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch)
    navigateWithFilters({ branch: newBranch })
  }

  const handleSalespersonChange = (newSalesperson: string) => {
    setSalespersonId(newSalesperson)
    navigateWithFilters({ salespersonId: newSalesperson })
  }

  const handleProductGroupChange = (newProductGroup: string) => {
    setProductGroup(newProductGroup)
    navigateWithFilters({ productGroup: newProductGroup })
  }

  const handleResetFilter = () => {
    setDateStart(startDate)
    setDateEnd(endDate)
    setBranch('')
    setSalespersonId('')
    setProductGroup('')
    startTransition(() => {
      router.push('/marketing/dashboard')
    })
  }

  const removeFilter = (key: 'branch' | 'salespersonId' | 'productGroup') => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    if (key === 'branch') setBranch('')
    if (key === 'salespersonId') setSalespersonId('')
    if (key === 'productGroup') setProductGroup('')
    startTransition(() => {
      router.push(`/marketing/dashboard?${params.toString()}`)
    })
  }

  const hasActiveFilters = Boolean(selectedBranch || selectedSalespersonId || selectedProductGroup)

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">วันที่เริ่มต้น</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] outline-none text-sm bg-gray-50/50"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">วันที่สิ้นสุด</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] outline-none text-sm bg-gray-50/50"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>

          {/* Branch Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-gray-400" />
              <span>สาขา (Branch)</span>
            </label>
            <select
              value={branch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] outline-none text-sm bg-gray-50/50 text-gray-800"
            >
              <option value="">ทุกสาขา (All Branches)</option>
              {availableBranches.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Salesperson Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
              <User size={13} className="text-gray-400" />
              <span>พนักงานขาย (Salesperson)</span>
            </label>
            <select
              value={salespersonId}
              onChange={(e) => handleSalespersonChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] outline-none text-sm bg-gray-50/50 text-gray-800"
            >
              <option value="">ทุกคน (All Sales)</option>
              {availableSalespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Group Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
              <Package size={13} className="text-gray-400" />
              <span>กลุ่มสินค้า (Product Group)</span>
            </label>
            <select
              value={productGroup}
              onChange={(e) => handleProductGroupChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] outline-none text-sm bg-gray-50/50 text-gray-800"
            >
              <option value="">ทุกกลุ่มสินค้า (All Products)</option>
              {availableProductGroups.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Buttons & Active Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>กำลังอัปเดตข้อมูลตามตัวกรอง...</span>
              </span>
            )}
            {!isPending && hasActiveFilters && (
              <span className="text-xs font-semibold text-gray-400 mr-1">ตัวกรองที่เลือก:</span>
            )}
            {selectedBranch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <Building2 size={12} />
                <span>{getThaiBranchName(selectedBranch)}</span>
                <button onClick={() => removeFilter('branch')} className="hover:text-red-900 ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedSalespersonId && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <User size={12} />
                <span>{availableSalespeople.find(s => s.id === selectedSalespersonId)?.name || 'พนักงานขาย'}</span>
                <button onClick={() => removeFilter('salespersonId')} className="hover:text-blue-900 ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedProductGroup && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Package size={12} />
                <span>{selectedProductGroup}</span>
                <button onClick={() => removeFilter('productGroup')} className="hover:text-emerald-900 ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={handleResetFilter}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              title="ล้างค่าตัวกรองทั้งหมด"
            >
              <RotateCcw size={15} />
              <span>ล้างตัวกรอง</span>
            </button>
            <button
              onClick={handleApplyFilter}
              disabled={isPending}
              className="flex items-center gap-2 bg-[#ff2301] hover:bg-red-600 text-white px-5 py-2 rounded-xl font-bold shadow-sm transition-all text-sm disabled:opacity-50"
            >
              <Filter size={15} />
              <span>ใช้ตัวกรอง</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content wrapper with transition opacity */}
      <div className={`space-y-6 transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-orange-50 p-4 rounded-2xl text-orange-600 flex-shrink-0">
            <Users className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-500 mb-1 truncate">ใบเสนอราคาทั้งหมด (Quotations)</p>
            <p className="text-2xl lg:text-3xl font-black text-gray-900 truncate" title={totalCompanies.toString()}>{totalCompanies}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-green-50 p-4 rounded-2xl text-green-600 flex-shrink-0">
            <DollarSign className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-500 mb-1 truncate">ยอดขายรวม (Sales Value)</p>
            <p 
              className="text-2xl lg:text-3xl font-black text-gray-900 truncate" 
              title={`฿${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            >
              ฿{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Channel Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          <h2 className="text-lg font-bold text-gray-900 mb-6">สัดส่วนช่องทาง</h2>
          {initialData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={initialData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {initialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              ไม่มีข้อมูลสำหรับช่วงเวลานี้
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">รายละเอียดช่องทาง</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-xl text-gray-900">ช่องทาง</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">จำนวน</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-xl text-gray-900 text-right">ยอดขาย (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialData.length > 0 ? (
                  initialData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span>{item.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{item.value}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{item.sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Cross-Analytics Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">การวิเคราะห์เปรียบเทียบเชิงลึก (Cross-Channel Analytics)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ใช้สำหรับ Reconcile ยอดขายตามช่องทางโฆษณา เทียบกับสาขาและกลุ่มสินค้า เพื่อประเมินผลตอบแทนงบโฆษณา
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('channel-branch')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'channel-branch'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Building2 size={14} />
              <span>ช่องทาง x สาขา</span>
            </button>
            <button
              onClick={() => setActiveTab('channel-product')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'channel-product'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Package size={14} />
              <span>ช่องทาง x กลุ่มสินค้า</span>
            </button>
            <button
              onClick={() => setActiveTab('channel-status')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'channel-status'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers size={14} />
              <span>ช่องทาง x สถานะ</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Channel vs Branch Matrix */}
        {activeTab === 'channel-branch' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                แสดงจำนวนใบเสนอราคา และยอดขาย (฿) ที่แต่ละช่องทางโฆษณาส่งต่อให้กับแต่ละสาขา
              </span>
            </div>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs text-gray-600 whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-gray-50 z-10">ช่องทางโฆษณา</th>
                    {activeBranchCodes.map((code) => (
                      <th key={code} className="px-4 py-3 font-bold text-gray-900 text-center border-l border-gray-100">
                        {getThaiBranchName(code)}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-bold text-[#ff2301] text-right border-l-2 border-gray-200 bg-red-50/50">
                      รวมทุกสาขา
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channelBranchData.length > 0 ? (
                    <>
                      {channelBranchData.map((row) => (
                        <tr key={row.channel} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10">
                            {row.channel}
                          </td>
                          {activeBranchCodes.map((bCode) => {
                            const cell = row.branches[bCode]
                            return (
                              <td key={bCode} className={`px-4 py-2.5 text-center border-l border-gray-100 ${cell && cell.count > 0 ? 'bg-amber-50/30 font-semibold' : ''}`}>
                                {cell && cell.count > 0 ? (
                                  <div>
                                    <div className="text-gray-900 font-bold">{cell.count} ใบ</div>
                                    <div className="text-[11px] text-gray-500">฿{cell.sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5 text-right font-bold border-l-2 border-gray-200 bg-red-50/30">
                            <div className="text-gray-900">{row.totalCount} ใบ</div>
                            <div className="text-[11px] text-[#ff2301]">฿{row.totalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </td>
                        </tr>
                      ))}

                      {/* Total Footer Row */}
                      <tr className="bg-gray-50/90 font-bold border-t-2 border-gray-200">
                        <td className="px-4 py-3 text-gray-900 sticky left-0 bg-gray-50 z-10">
                          ยอดรวมทุกช่องทาง
                        </td>
                        {activeBranchCodes.map((bCode) => {
                          const tot = branchTotals[bCode] || { count: 0, sales: 0 }
                          return (
                            <td key={bCode} className="px-4 py-3 text-center border-l border-gray-100">
                              <div className="text-gray-900">{tot.count} ใบ</div>
                              <div className="text-[11px] text-gray-600">฿{tot.sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right border-l-2 border-gray-200 bg-red-100/50">
                          <div className="text-gray-900">{totalCompanies} ใบ</div>
                          <div className="text-[11px] text-[#ff2301]">฿{totalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={activeBranchCodes.length + 2} className="px-4 py-8 text-center text-gray-400">
                        ไม่พบข้อมูลตามตัวกรองที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Channel vs Product Group Matrix */}
        {activeTab === 'channel-product' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                แสดงกลุ่มสินค้าที่ลูกค้าติดต่อเข้ามาผ่านแต่ละช่องทางโฆษณา (จำนวนและยอดขาย ฿)
              </span>
            </div>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs text-gray-600 whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-gray-50 z-10">ช่องทางโฆษณา</th>
                    {activeProductGroups.map((pGroup) => (
                      <th key={pGroup} className="px-4 py-3 font-bold text-gray-900 text-center border-l border-gray-100">
                        {pGroup}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-bold text-[#ff2301] text-right border-l-2 border-gray-200 bg-red-50/50">
                      รวมทุกกลุ่มสินค้า
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channelProductData.length > 0 ? (
                    <>
                      {channelProductData.map((row) => (
                        <tr key={row.channel} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10">
                            {row.channel}
                          </td>
                          {activeProductGroups.map((pGroup) => {
                            const cell = row.productGroups[pGroup]
                            return (
                              <td key={pGroup} className={`px-4 py-2.5 text-center border-l border-gray-100 ${cell && cell.count > 0 ? 'bg-emerald-50/30 font-semibold' : ''}`}>
                                {cell && cell.count > 0 ? (
                                  <div>
                                    <div className="text-gray-900 font-bold">{cell.count} ใบ</div>
                                    <div className="text-[11px] text-gray-500">฿{cell.sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5 text-right font-bold border-l-2 border-gray-200 bg-red-50/30">
                            <div className="text-gray-900">{row.totalCount} ใบ</div>
                            <div className="text-[11px] text-[#ff2301]">฿{row.totalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </td>
                        </tr>
                      ))}

                      {/* Total Footer Row */}
                      <tr className="bg-gray-50/90 font-bold border-t-2 border-gray-200">
                        <td className="px-4 py-3 text-gray-900 sticky left-0 bg-gray-50 z-10">
                          ยอดรวมทุกช่องทาง
                        </td>
                        {activeProductGroups.map((pGroup) => {
                          const tot = productTotals[pGroup] || { count: 0, sales: 0 }
                          return (
                            <td key={pGroup} className="px-4 py-3 text-center border-l border-gray-100">
                              <div className="text-gray-900">{tot.count} ใบ</div>
                              <div className="text-[11px] text-gray-600">฿{tot.sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right border-l-2 border-gray-200 bg-red-100/50">
                          <div className="text-gray-900">{totalCompanies} ใบ</div>
                          <div className="text-[11px] text-[#ff2301]">฿{totalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={activeProductGroups.length + 2} className="px-4 py-8 text-center text-gray-400">
                        ไม่พบข้อมูลตามตัวกรองที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Channel vs Status Matrix */}
        {activeTab === 'channel-status' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                แสดงสถานะขั้นตอนการขาย (Pipeline Status) ของลูกค้าที่มาจากแต่ละช่องทางโฆษณา
              </span>
            </div>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs text-gray-600 whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-gray-50 z-10">ช่องทาง</th>
                    {allStatuses?.map((status, idx) => (
                      <th key={idx} className="px-4 py-3 font-bold text-gray-900 text-center border-l border-gray-100">
                        {status}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {crossData && crossData.length > 0 ? (
                    crossData.map((row) => (
                      <tr key={row.channel} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10">
                          {row.channel}
                        </td>
                        {allStatuses?.map((status, sIdx) => {
                          const cell = row.statuses[status]
                          return (
                            <td key={sIdx} className="px-4 py-2.5 text-center border-l border-gray-100">
                              {cell && cell.count > 0 ? (
                                <div>
                                  <div className="font-bold text-gray-900">{cell.count} ใบ</div>
                                  <div className="text-[11px] text-gray-500">฿{cell.sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={(allStatuses?.length || 0) + 1} className="px-4 py-8 text-center text-gray-400">
                        ไม่พบข้อมูลตามตัวกรองที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
}

