'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { Filter, Users } from 'lucide-react'

const COLORS = ['#ff2301', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#4285F4', '#0F9D58'];

type ChartData = {
  name: string
  value: number
}

interface MarketingDashboardClientProps {
  initialData: ChartData[]
  startDate: string
  endDate: string
  totalCompanies: number
}

export default function MarketingDashboardClient({
  initialData,
  startDate,
  endDate,
  totalCompanies
}: MarketingDashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)

  const handleApplyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('startDate', dateStart)
    params.set('endDate', dateEnd)
    router.push(`/marketing/dashboard?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">วันที่เริ่มต้น</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none text-sm"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">วันที่สิ้นสุด</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none text-sm"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
        <button
          onClick={handleApplyFilter}
          className="flex items-center gap-2 bg-[#ff2301] hover:bg-[#ff2301]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          <Filter className="w-4 h-4" />
          ใช้ตัวกรอง
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-xl text-orange-600">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">ใบเสนอราคาทั้งหมด (Quotations)</p>
            <p className="text-3xl font-black text-gray-900">{totalCompanies}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
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
                  <th className="px-4 py-3 font-semibold rounded-tr-xl text-gray-900 text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialData.length > 0 ? (
                  initialData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-right">{item.value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
