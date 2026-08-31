'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getDashboardData } from '@/app/actions/ads-dashboard'
import { DashboardData, DashboardFilters } from './types'
import { lastDayOfMonth } from '@/lib/adsMetrics'
import AdsKPISection from './components/AdsKPISection'
import AdsCharts from './components/AdsCharts'
import AdsCampaignTable from './components/AdsCampaignTable'

import { useRouter, useSearchParams } from 'next/navigation'

export default function AdsDashboardClient({ channels, products, branches, campaigns, objectives = [], accounts = [] }: any) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [isBannerExpanded, setIsBannerExpanded] = useState(false)
  
  // Default to current month
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  
  const initialFrom = searchParams.get('from') || `${year}-${month.toString().padStart(2, '0')}-01`
  const initialTo = searchParams.get('to') || `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth(year, month).toString().padStart(2, '0')}`

  const [filters, setFilters] = useState<DashboardFilters>({
    from: initialFrom,
    to: initialTo,
    channelId: searchParams.get('channelId') || '',
    productId: searchParams.get('productId') || '',
    branchId: searchParams.get('branchId') || '',
    objective: searchParams.get('objective') || '',
    accountId: searchParams.get('accountId') || '',
    campaignIds: searchParams.get('campaignIds')?.split(',') || []
  })

  // Avoid endless loop when sync URL
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const params = new URLSearchParams()
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.channelId) params.set('channelId', filters.channelId)
    if (filters.productId) params.set('productId', filters.productId)
    if (filters.branchId) params.set('branchId', filters.branchId)
    if (filters.objective) params.set('objective', filters.objective)
    if (filters.accountId) params.set('accountId', filters.accountId)
    
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [filters, router])

  const requestSeq = useRef(0)

  useEffect(() => {
    async function loadData() {
      const currentReq = ++requestSeq.current
      setLoading(true)
      try {
        const result = await getDashboardData(filters)
        if (currentReq === requestSeq.current) {
          setData(result)
        }
      } catch (error) {
        if (currentReq === requestSeq.current) {
          console.error("Failed to load dashboard data", error)
        }
      } finally {
        if (currentReq === requestSeq.current) {
          setLoading(false)
        }
      }
    }
    loadData()
  }, [filters])

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            name="from" 
            value={filters.from} 
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400">-</span>
          <input 
            type="date" 
            name="to" 
            value={filters.to} 
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        
        <select name="channelId" value={filters.channelId} onChange={handleFilterChange} className="border rounded-lg px-3 py-1.5 text-sm min-w-[150px]">
          <option value="">ทุกช่องทาง</option>
          {channels.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select name="accountId" value={filters.accountId} onChange={handleFilterChange} className="border rounded-lg px-3 py-1.5 text-sm min-w-[150px]">
          <option value="">ทุกบัญชีโฆษณา</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select name="productId" value={filters.productId} onChange={handleFilterChange} className="border rounded-lg px-3 py-1.5 text-sm min-w-[150px]">
          <option value="">ทุกสินค้า</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="border rounded-lg px-3 py-1.5 text-sm min-w-[150px]">
          <option value="">ทุกสาขา</option>
          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select name="objective" value={filters.objective} onChange={handleFilterChange} className="border rounded-lg px-3 py-1.5 text-sm min-w-[150px]">
          <option value="">ทุกวัตถุประสงค์</option>
          {objectives.map((o: any) => <option key={o.id} value={o.name}>{o.name}</option>)}
        </select>

        <div className="ml-auto">
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            ส่งออกรายงาน
          </button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {((data.meta?.orphanRowCount > 0) || (data.meta?.partialLifetimeCampaignCount > 0) || (data.meta?.excludedRowCount > 0)) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsBannerExpanded(!isBannerExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-yellow-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-yellow-800 font-medium text-sm">
                    ตรวจพบข้อมูลที่อาจส่งผลต่อความแม่นยำของรายงาน ({[
                      data.meta.orphanRowCount > 0 ? 'Orphan Rows' : null,
                      data.meta.partialLifetimeCampaignCount > 0 ? 'Partial Lifetime' : null,
                      data.meta.excludedRowCount > 0 ? 'Cross-month Rows' : null
                    ].filter(Boolean).join(', ')})
                  </h3>
                </div>
                <button className="text-yellow-600 hover:text-yellow-800">
                  <svg className={`w-5 h-5 transform transition-transform ${isBannerExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {isBannerExpanded && (
                <div className="mt-3 text-sm text-yellow-700 space-y-2 pl-8">
                  {data.meta.orphanRowCount > 0 && (
                    <p>• พบ <strong>{data.meta.orphanRowCount}</strong> Performance Rows ที่อยู่นอกเหนือระยะเวลาแคมเปญ (Orphan Rows) ระบบจะไม่นำมาคำนวณในรายงาน</p>
                  )}
                  {data.meta.partialLifetimeCampaignCount > 0 && (
                    <p>• พบ <strong>{data.meta.partialLifetimeCampaignCount}</strong> แคมเปญที่มีระยะเวลา (Lifetime) คร่อมกับช่วงเดือนที่เลือก ส่งผลให้ % การใช้งบประมาณรวมอาจดูน้อยกว่าความเป็นจริง (Budget เป็นของตลอดอายุแคมเปญ)</p>
                  )}
                  {data.meta.excludedRowCount > 0 && (
                    <p>• พบ <strong>{data.meta.excludedRowCount}</strong> Performance Rows ที่คร่อมช่วงวันที่เลือก ระบบจะไม่นำมาคำนวณในรายงาน</p>
                  )}
                </div>
              )}
            </div>
          )}
          <AdsKPISection data={data} />
          <AdsCharts data={data} />
          <AdsCampaignTable data={data} />
        </div>
      ) : null}
    </div>
  )
}
