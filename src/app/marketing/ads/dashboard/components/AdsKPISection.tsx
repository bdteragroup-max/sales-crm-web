import React from 'react'
import { DashboardData } from '../types'
import { formatMetric } from '@/lib/adsMetrics'
import { theme } from '../theme'

export default function AdsKPISection({ data }: { data: DashboardData }) {
  const m = data.kpiMetrics

  const renderCard = (label: string, value: string | null, colorClass: string, sub?: React.ReactNode, tooltip?: string) => {
    const isEmpty = value === 'N/A' || value == null
    const finalValue = isEmpty ? 'N/A' : value
    const valColor = isEmpty ? theme.metrics.empty : colorClass

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
        <p className={`text-xl font-bold ${valColor}`}>{finalValue}</p>
        {sub}
        {tooltip && (
          <p className="text-[10px] text-amber-600 mt-1" title={tooltip}>
            *ค่าประมาณ
          </p>
        )}
      </div>
    )
  }

  // Progress bar logic for Spend
  const getProgressColor = (pct: number) => {
    if (pct < 70) return 'bg-emerald-500'
    if (pct <= 90) return 'bg-amber-500'
    if (pct <= 100) return 'bg-red-500'
    return 'bg-red-700'
  }

  const renderSpendSub = () => {
    if (m.budget === 0 || m.budget == null) return null
    const pct = m.budgetUsedPct ?? 0
    const pctStr = formatMetric(pct, 'pct')
    const barWidth = Math.min(pct, 100)

    return (
      <div className="w-full mt-2 flex flex-col gap-1 items-center">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${getProgressColor(pct)}`} style={{ width: `${barWidth}%` }} />
        </div>
        <span className={`text-[10px] font-medium ${pct > 100 ? 'text-red-600' : 'text-gray-500'}`}>
          {pct > 100 ? `ใช้เกิน ${pctStr}` : `${pctStr}`}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Row 1 (8) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {renderCard('งบโฆษณา', formatMetric(m.budget, 'thb'), theme.metrics.budget)}
        {renderCard('ยอดใช้จ่าย', formatMetric(m.spend, 'thb'), theme.metrics.spend, renderSpendSub())}
        {renderCard('คงเหลือ', formatMetric(m.remainingBudget, 'thb'), theme.metrics.budget)}
        {renderCard('% การใช้งบ', m.budgetUsedPct !== null ? formatMetric(m.budgetUsedPct, 'pct') : 'N/A', theme.metrics.budget)}

        {renderCard('Reach', formatMetric(m.reach.value, 'int'), 'text-gray-900', undefined, m.reach.isCombined ? 'Reach aggregated across multiple campaigns/periods may be inaccurate' : undefined)}
        {renderCard('Impressions', formatMetric(m.impressions, 'int'), 'text-gray-900')}
        {renderCard('คลิกลิงก์', formatMetric(m.linkClicks, 'int'), 'text-gray-900')}
        {renderCard('ข้อความเข้า', formatMetric(m.messageInbox, 'int'), 'text-gray-900')}
      </div>

      {/* Row 2 (8) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {renderCard('CPM', formatMetric(m.cpm, 'thb'), 'text-gray-900')}
        {renderCard('CPC', formatMetric(m.cpc, 'thb'), 'text-gray-900')}
        {renderCard('CTR', m.ctr !== null ? formatMetric(m.ctr, 'pct') : 'N/A', 'text-gray-900')}
        {renderCard('Results', formatMetric(m.results, 'int'), 'text-gray-900')}
        {renderCard('Cost/Result', formatMetric(m.costPerResult, 'thb'), 'text-gray-900')}

        {renderCard('ผู้ติดต่อ (Leads)', formatMetric(m.leads, 'int'), theme.metrics.crm)}
        {renderCard('CPL', formatMetric(m.cpl, 'thb'), theme.metrics.crm)}
        {renderCard('มีคุณภาพ', formatMetric(m.qualifiedLeads, 'int'), theme.metrics.crm)}
      </div>

      {/* Row 3 (4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {renderCard('ปิดการขาย', formatMetric(m.closedSales, 'int'), theme.metrics.sales)}
        {renderCard('Cost/Sale', formatMetric(m.costPerSale, 'thb'), theme.metrics.sales)}
        {renderCard('ยอดขาย', formatMetric(m.sale, 'thb'), theme.metrics.sales)}
        {renderCard('ROAS', m.roas !== null ? formatMetric(m.roas, 'ratio') : 'N/A', theme.metrics.sales)}
      </div>
    </div>
  )
}
