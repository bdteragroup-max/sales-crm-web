'use client'

import React, { useSyncExternalStore } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  Package,
  PieChart as PieChartIcon,
  Radio,
  TrendingUp,
} from 'lucide-react'
import {
  LEAD_STATUS_META,
  type LeadStatusAnalyticsResult,
} from '@/app/marketing/constants/leadStatusAnalytics'

const PRODUCT_DOT_COLORS = [
  '#ef4444',
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
]

function getChannelPillClass(channel: string, idx: number): string {
  const normalized = channel.trim().toLowerCase()
  if (normalized.includes('facebook') || normalized === 'fb') {
    return 'bg-blue-50 border-blue-200 text-blue-700'
  }
  if (normalized.includes('line')) {
    return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  }
  if (normalized.includes('tiktok')) {
    return 'bg-pink-50 border-pink-200 text-pink-700'
  }
  if (normalized.includes('google') || normalized.includes('gg')) {
    return 'bg-amber-50 border-amber-200 text-amber-700'
  }
  if (normalized.includes('youtube') || normalized.includes('yt')) {
    return 'bg-red-50 border-red-200 text-red-700'
  }
  const fallbackPalette = [
    'bg-indigo-50 border-indigo-200 text-indigo-700',
    'bg-purple-50 border-purple-200 text-purple-700',
    'bg-cyan-50 border-cyan-200 text-cyan-700',
  ]
  return fallbackPalette[idx % fallbackPalette.length]
}

const emptySubscribe = () => () => {}

function useIsClientMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

interface LeadStatusDashboardPanelProps {
  analytics: LeadStatusAnalyticsResult
  dateSummaryLabel: string
  selectedProductGroup: string
  selectedStage: string
  isOpen: boolean
  onToggleOpen: () => void
  onSelectStage: (stage: string) => void
  onSelectProductGroup: (productGroup: string) => void
}

export default function LeadStatusDashboardPanel({
  analytics,
  dateSummaryLabel,
  selectedProductGroup,
  selectedStage,
  isOpen,
  onToggleOpen,
  onSelectStage,
  onSelectProductGroup,
}: LeadStatusDashboardPanelProps) {
  const isMounted = useIsClientMounted()
  const {
    summary,
    statusDistribution,
    productBreakdown,
    detailedStatuses,
    channelBreakdown,
    trendData,
    trendGranularity,
  } = analytics

  const activePieData = statusDistribution.filter((item) => item.count > 0)

  return (
    <section
      aria-label="Dashboard สรุปสถานะของลูกค้า"
      className="bg-white rounded-2xl border border-gray-200 border-t-4 border-t-[#ff2301] shadow-xs overflow-hidden"
    >
      {/* Symmetrical Light Multi-Color Collapsible Dashboard Header */}
      <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff2301] via-amber-500 to-blue-600 text-white shadow-sm flex items-center justify-center shrink-0">
            <BarChart3 size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-gray-900">
                Dashboard สรุปสถานะของลูกค้า (Customer Status Overview)
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <Calendar size={11} className="text-sky-600" />
                <span>{dateSummaryLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Package size={11} className="text-emerald-600" />
                <span>{selectedProductGroup || 'ทุกกลุ่มสินค้า'}</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              คลิกที่สถานะหรือกลุ่มสินค้าเพื่อกรองรายชื่อลูกค้าด้านล่างได้ทันที • รวม {summary.total} รายชื่อ (Win Rate {summary.conversionRate}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleOpen}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 border border-gray-200 transition-colors cursor-pointer shrink-0"
        >
          <span>{isOpen ? 'ย่อ Dashboard' : 'แสดง Dashboard'}</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-5 bg-gray-50/50">
          {/* Row 1: Symmetrical 50/50 Grid — Customer Status Donut + Timeline Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            {/* Left Card: Customer Status Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <PieChartIcon size={16} className="text-[#ff2301]" />
                  <h3 className="text-sm font-black text-gray-900">
                    สัดส่วนสถานะลูกค้าปัจจุบัน
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  ทั้งหมด {summary.total} ราย
                </span>
              </div>

              {summary.total === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-gray-400">
                  ไม่พบข้อมูลลูกค้าในช่วงเวลาหรือกลุ่มสินค้าที่เลือก
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-3 flex-1">
                  <div className="sm:col-span-5 h-[220px] relative">
                    {isMounted && activePieData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                        <PieChart>
                          <Pie
                            data={activePieData}
                            dataKey="count"
                            nameKey="shortLabel"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={78}
                            paddingAngle={2}
                            onClick={(_entry, idx) => {
                              const slice = activePieData[idx]
                              if (slice?.stageFilter) {
                                onSelectStage(
                                  selectedStage === slice.stageFilter ? 'all' : slice.stageFilter
                                )
                              }
                            }}
                          >
                            {activePieData.map((entry) => (
                              <Cell
                                key={entry.key}
                                fill={entry.color}
                                className="cursor-pointer outline-none"
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value ?? 0} ราย`, 'จำนวน']}
                            contentStyle={{
                              borderRadius: '12px',
                              borderColor: '#e5e7eb',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#111827',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-gray-900 leading-none">
                        {summary.total}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 mt-1">
                        รายชื่อ
                      </span>
                    </div>
                  </div>

                  {/* Interactive 5-Bucket Breakdown List */}
                  <div className="sm:col-span-7 space-y-2">
                    {statusDistribution.map((st) => {
                      const isActive = selectedStage === st.stageFilter
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() =>
                            onSelectStage(isActive ? 'all' : st.stageFilter)
                          }
                          className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer ${
                            isActive
                              ? 'ring-1'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                          style={
                            isActive
                              ? {
                                  borderColor: st.color,
                                  backgroundColor: `${st.color}12`,
                                  boxShadow: `0 0 0 1px ${st.color}33`,
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-2 font-bold text-gray-800 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: st.color }}
                              />
                              <span className="truncate">{st.label}</span>
                            </span>
                            <span className="font-black text-gray-900 shrink-0 tabular-nums">
                              {st.count}{' '}
                              <span className="text-[10px] font-bold text-gray-400">
                                ({st.percentage}%)
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, st.percentage)}%`,
                                backgroundColor: st.color,
                              }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Card: Time Trend Bar Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <h3 className="text-sm font-black text-gray-900">
                    สถิติลูกค้าแยกตาม{trendGranularity === 'day' ? 'รายวัน' : 'รายเดือน'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {trendData.length} ช่วงเวลา
                </span>
              </div>

              {trendData.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-gray-400">
                  ไม่มีข้อมูลกราฟแนวโน้มในช่วงเวลาที่เลือก
                </div>
              ) : (
                <div className="h-[220px] pt-3 flex-1">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                      <BarChart
                        data={trendData}
                        margin={{ top: 6, right: 8, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            borderColor: '#e5e7eb',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#111827',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                        <Bar
                          dataKey="newCount"
                          name="รอส่งต่อ"
                          stackId="a"
                          fill={LEAD_STATUS_META.new.color}
                        />
                        <Bar
                          dataKey="waitingCount"
                          name="รอติดต่อ"
                          stackId="a"
                          fill={LEAD_STATUS_META.waiting_contact.color}
                        />
                        <Bar
                          dataKey="inProgressCount"
                          name="กำลังติดตาม"
                          stackId="a"
                          fill={LEAD_STATUS_META.in_progress.color}
                        />
                        <Bar
                          dataKey="wonCount"
                          name="ปิดการขาย"
                          stackId="a"
                          fill={LEAD_STATUS_META.won.color}
                        />
                        <Bar
                          dataKey="lostCount"
                          name="ไม่สนใจ"
                          stackId="a"
                          fill={LEAD_STATUS_META.lost.color}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Symmetrical 50/50 Grid — Product Matrix + Detailed Statuses & Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            {/* Left Card: Product Group × Customer Status Matrix */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-amber-600" />
                  <h3 className="text-sm font-black text-gray-900">
                    สรุปสถานะลูกค้าแยกตามกลุ่มสินค้า
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  คลิกแถวเพื่อกรองตามสินค้า
                </span>
              </div>

              {productBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs font-semibold text-gray-400">
                  ไม่พบข้อมูลกลุ่มสินค้า
                </div>
              ) : (
                <div className="overflow-x-auto pt-2 flex-1">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-200 bg-gray-50">
                        <th className="py-2 px-2.5 rounded-tl-lg">กลุ่มสินค้า</th>
                        <th className="py-2 px-1.5 text-center">รวม</th>
                        <th className="py-2 px-1.5 text-center text-[#ff2301]">รอส่งต่อ</th>
                        <th className="py-2 px-1.5 text-center text-amber-600">รอติดต่อ</th>
                        <th className="py-2 px-1.5 text-center text-blue-600">ติดตาม</th>
                        <th className="py-2 px-1.5 text-center text-emerald-600">ปิดขาย</th>
                        <th className="py-2 px-1.5 text-center text-purple-600">ไม่สนใจ</th>
                        <th className="py-2 px-2.5 text-right text-emerald-700 rounded-tr-lg">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productBreakdown.map((row, rowIdx) => {
                        const isSelectable = row.productGroup !== 'ไม่ระบุกลุ่มสินค้า'
                        const isSelected =
                          selectedProductGroup &&
                          selectedProductGroup.toLowerCase() === row.productGroup.toLowerCase()
                        const dotColor = PRODUCT_DOT_COLORS[rowIdx % PRODUCT_DOT_COLORS.length]
                        return (
                          <tr
                            key={row.productGroup}
                            onClick={() => {
                              if (!isSelectable) return
                              onSelectProductGroup(isSelected ? '' : row.productGroup)
                            }}
                            className={`transition-colors ${
                              isSelectable ? 'cursor-pointer hover:bg-blue-50/40' : ''
                            } ${isSelected ? 'bg-blue-50/70 font-bold' : ''}`}
                          >
                            <td className="py-2.5 px-2.5 font-bold text-gray-900">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dotColor }}
                                />
                                <span>{row.productGroup}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-black text-gray-900 tabular-nums">
                              {row.total}
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-bold text-[#ff2301] tabular-nums">
                              {row.newCount}
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-bold text-amber-600 tabular-nums">
                              {row.waitingCount}
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-bold text-blue-600 tabular-nums">
                              {row.inProgressCount}
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-black text-emerald-600 tabular-nums">
                              {row.wonCount}
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-bold text-purple-600 tabular-nums">
                              {row.lostCount}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-black text-emerald-700 tabular-nums">
                              {row.winRate}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Card: Detailed Customer Statuses & Channels */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-purple-600" />
                    <h3 className="text-sm font-black text-gray-900">
                      สถานะย่อยจากการติดตาม (ใบเสนอราคา / Telesale)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {detailedStatuses.length} สถานะ
                  </span>
                </div>
                {detailedStatuses.length === 0 ? (
                  <div className="py-6 text-center text-xs font-semibold text-gray-400">
                    ไม่มีรายการสถานะย่อย
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-3 max-h-[195px] overflow-y-auto pr-1">
                    {detailedStatuses.map((item) => {
                      const meta = LEAD_STATUS_META[item.bucketKey]
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 truncate">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: meta.color }}
                              />
                              <span className="truncate">{item.label}</span>
                            </span>
                            <span className="font-black text-gray-900 shrink-0 tabular-nums">
                              {item.count}{' '}
                              <span className="text-[10px] font-bold text-gray-400">
                                ({item.percentage}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                                backgroundColor: meta.color,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {channelBreakdown.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-700 mb-2">
                    <Radio size={13} className="text-emerald-600" />
                    <span>ช่องทางติดต่อเข้า (ในช่วงที่เลือก)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {channelBreakdown.slice(0, 6).map((ch, idx) => (
                      <span
                        key={ch.channel}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getChannelPillClass(
                          ch.channel,
                          idx
                        )}`}
                      >
                        <span>{ch.channel}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/90 border border-black/10 font-black">
                          {ch.total}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
