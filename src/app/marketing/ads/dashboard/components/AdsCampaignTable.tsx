import React from 'react'
import { DashboardData } from '../types'
import { formatMetric } from '@/lib/adsMetrics'
import { theme } from '../theme'

export default function AdsCampaignTable({ data }: { data: DashboardData }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">ACTIVE</span>
      case 'PAUSED':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">PAUSED</span>
      case 'ENDED':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">ENDED</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{status || 'UNKNOWN'}</span>
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">สรุปผลโฆษณารายแคมเปญ</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">แคมเปญ</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">ช่องทาง</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">งบโฆษณา (฿)</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">ยอดใช้จ่าย (฿)</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">คงเหลือ (฿)</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">ติดต่อ (Leads)</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">มีคุณภาพ</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">ปิดการขายได้</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">CPL (฿)</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">ยอดขาย (฿)</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">ROAS</th>
              <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.tableRows.map(row => {
              const remaining = row.budget - row.spend
              // Use remaining <= budget * 0.1 instead of budgetUsedPct to be resilient against 0 budget and partial months
              const isOverBudget = row.budget > 0 && remaining <= row.budget * 0.1

              return (
                <tr key={row.internalId} className="hover:bg-gray-50 even:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.campaignName}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.channelName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.budget, 'thb')}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${isOverBudget ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700'}`}>
                    {formatMetric(row.spend, 'thb')}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${remaining < 0 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                    {formatMetric(remaining, 'thb')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.leads, 'int')}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.qualifiedLeads, 'int')}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.closedSales, 'int')}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.cpl, 'thb')}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.sale, 'thb')}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMetric(row.roas, 'ratio')}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge(row.status)}
                  </td>
                </tr>
              )
            })}
            {data.tableRows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                  ไม่พบแคมเปญสำหรับตัวกรองที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
