'use client'

import React from 'react'
import { DashboardData } from '../types'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { theme } from '../theme'
import { formatMetric } from '@/lib/adsMetrics'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-md rounded-lg text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && (entry.name.toLowerCase().includes('spend') || entry.name.toLowerCase().includes('budget') || entry.name.toLowerCase().includes('cpl')) ? formatMetric(entry.value, 'thb') : formatMetric(entry.value, 'int')}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm p-4 text-center">
    {message}
  </div>
)

export default function AdsCharts({ data }: { data: DashboardData }) {
  const { spendByChannel, spendAndLeadsTrend, spendByProduct } = data.chartData

  const funnelData = [
    { name: 'ข้อความเข้า', value: data.kpiMetrics.messageInbox },
    { name: 'ผู้ติดต่อ', value: data.kpiMetrics.leads },
    { name: 'มีคุณภาพ', value: data.kpiMetrics.qualifiedLeads },
    { name: 'ปิดการขาย', value: data.kpiMetrics.closedSales }
  ]

  const maxFunnelValue = funnelData.reduce((max, item) => Math.max(max, item.value || 0), 1)
  
  // Calculate conversion rates between layers
  const funnelChartData = funnelData.map((item, index) => {
    const val = item.value || 0
    const pad = (maxFunnelValue - val) / 2
    let conversion = ''
    if (index > 0 && item.value != null && funnelData[index - 1].value != null && funnelData[index - 1].value! > 0) {
      const prevVal = funnelData[index - 1].value!
      conversion = formatMetric((val / prevVal) * 100, 'pct')
    }
    return {
      name: item.name,
      pad: pad,
      value: item.value,
      realValue: val,
      conversion
    }
  })

  // Determine empty states
  const noRows = data.tableRows.length === 0
  
  const funnelAllNull = funnelData.every(item => item.value === null)
  
  const cplData = spendByChannel.map(c => ({
    name: c.channel,
    cpl: c.leads > 0 ? c.spend / c.leads : 0,
    leads: c.leads
  }))
  const cplAllNull = cplData.every(c => c.leads === null || isNaN(c.leads))

  return (
    <div className="space-y-6 mb-8">
      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">งบประมาณและยอดใช้จ่ายแยกตามช่องทาง</h3>
          <div className="h-64 w-full relative">
            {noRows ? (
              <EmptyState message="No data in the selected range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={spendByChannel} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(val) => val.toLocaleString()} />
                  <YAxis dataKey="channel" type="category" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="budget" name="งบโฆษณา" fill="#e11d48" barSize={12}>
                    {spendByChannel.map((entry, index) => (
                      <Cell key={`budget-${index}`} fill={theme.getChannelColor(entry.channel, index)} opacity={0.6} />
                    ))}
                  </Bar>
                  <Bar dataKey="spend" name="ยอดใช้จ่าย" fill="#111827" barSize={12}>
                    {spendByChannel.map((entry, index) => (
                      <Cell key={`spend-${index}`} fill={theme.getChannelColor(entry.channel, index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">แนวโน้มยอดใช้จ่ายและผู้ติดต่อ</h3>
          <div className="h-64 w-full relative">
            {noRows ? (
              <EmptyState message="No data in the selected range" />
            ) : spendAndLeadsTrend.length === 1 ? (
              <EmptyState message="Data entered in monthly intervals. Only one point shown." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendAndLeadsTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 10}} />
                  <YAxis yAxisId="left" tickFormatter={(val) => val.toLocaleString()} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="spend" name="ยอดใช้จ่าย (฿)" stroke={theme.channels.facebook} strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line yAxisId="right" type="monotone" dataKey="leads" name="ผู้ติดต่อ" stroke={theme.channels.tiktok} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">ช่องทางผู้ติดต่อ (Lead Funnel)</h3>
          <div className="h-64 w-full relative">
            {noRows ? (
              <EmptyState message="No data in the selected range" />
            ) : funnelAllNull ? (
              <EmptyState message="Waiting for definition from the Marketing team" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={funnelChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                      if (active && payload && payload.length > 1) {
                        return (
                          <div className="bg-white p-2 border border-gray-100 shadow-sm rounded text-sm">
                            <p className="font-medium">{payload[1].payload.name}</p>
                            <p>{payload[1].payload.value === null ? 'N/A' : payload[1].payload.value.toLocaleString()}</p>
                            {payload[1].payload.conversion && <p className="text-xs text-indigo-600 mt-1">Conversion: {payload[1].payload.conversion}</p>}
                          </div>
                        )
                      }
                      return null
                    }} />
                    <Bar dataKey="pad" stackId="a" fill="transparent" />
                    <Bar dataKey="realValue" stackId="a" fill="url(#funnelGrad)" />
                  </BarChart>
                </ResponsiveContainer>
                {/* Absolute positioning for labels */}
                <div className="absolute inset-0 flex flex-col justify-around pointer-events-none pb-4 pt-1">
                  {funnelChartData.map((item, i) => (
                    <div key={i} className="flex justify-between items-center w-full px-6">
                      <span className={`text-xs font-semibold z-10 text-gray-900`}>
                        {item.name}
                        {item.conversion && <span className="ml-2 text-[10px] text-gray-500">({item.conversion})</span>}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{item.value === null ? 'N/A' : item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">ต้นทุนต่อผู้ติดต่อ (CPL) แยกตามช่องทาง</h3>
          <div className="h-64 w-full relative">
            {noRows ? (
              <EmptyState message="No data in the selected range" />
            ) : cplAllNull ? (
              <EmptyState message="Waiting for definition from the Marketing team" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cplData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: '#f3f4f6'}} content={<CustomTooltip />} />
                  <Bar dataKey="cpl" name="CPL (฿)" barSize={40}>
                    {cplData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={theme.getChannelColor(entry.name, index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">ยอดใช้จ่ายตามสินค้า (Top 5)</h3>
          <div className="h-64 w-full relative">
            {noRows ? (
              <EmptyState message="No data in the selected range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendByProduct.sort((a,b)=>b.spend-a.spend).slice(0,5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="spend"
                    nameKey="product"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {spendByProduct.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={theme.getChannelColor(entry.product, index)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
