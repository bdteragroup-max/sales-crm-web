import React from 'react'
import { DashboardData } from '../types'

const formatCurrency = (val: number | null) => {
  if (val === null || isNaN(val)) return '฿0.00'
  return '฿' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatNumber = (val: number | null) => {
  if (val === null || isNaN(val)) return '0'
  return val.toLocaleString('en-US')
}

export default function AdsDeliverySection({ data }: { data: DashboardData }) {
  const m = data.kpiMetrics

  const metrics = [
    { label: 'ข้อความเข้า', value: formatNumber(m.messageInbox) },
    { label: 'การเข้าถึง (Reach)', value: formatNumber(m.reach.value), combined: m.reach.isCombined },
    { label: 'การแสดงผล (Impression)', value: formatNumber(m.impressions) },
    { label: 'คลิกลิงก์', value: formatNumber(m.linkClicks) },
    { label: 'CPC', value: formatCurrency(m.cpc) },
    { label: 'CPM', value: formatCurrency(m.cpm) },
    { label: 'CTR', value: m.ctr !== null ? `${m.ctr.toFixed(2)}%` : '0.00%' },
    { label: 'ต้นทุนต่อผลลัพธ์', value: formatCurrency(m.costPerResult), sub: 'รวมทุกประเภทผลลัพธ์' }
  ]

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">ตัวชี้วัดการนำส่งโฆษณา (Delivery Metrics)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-gray-500 mb-1">{metric.label}</p>
            <p className="text-xl font-bold text-gray-900">{metric.value}</p>
            {metric.combined && (
              <p className="text-[10px] text-amber-600 mt-1" title="Reach aggregated across multiple campaigns/periods may be inaccurate">
                *ค่าประมาณ
              </p>
            )}
            {metric.sub && (
              <p className="text-[10px] text-gray-400 mt-1">{metric.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
