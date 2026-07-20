"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  Briefcase
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
}

export default function AccountingDashboardClient({ data }: { data: any }) {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams?.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams?.get('endDate') || '');
  const [projectSearch, setProjectSearch] = useState('');

  const applyFilter = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    router.push(`?${params.toString()}`);
  };

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
    router.push('?');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">แดชบอร์ดบัญชี & การเงิน</h1>
          <p className="text-sm text-gray-500 mt-1">ภาพรวมรายได้ ยอดค้างรับ และค่าใช้จ่ายของบริษัท</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Filter size={16} className="text-gray-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border-none focus:ring-0 bg-transparent text-gray-700" 
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border-none focus:ring-0 bg-transparent text-gray-700" 
            />
          </div>
          <div className="flex items-center gap-1 border-l border-gray-100 pl-2">
            <button 
              onClick={applyFilter}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors"
            >
              กรอง
            </button>
            {(startDate || endDate) && (
              <button 
                onClick={clearFilter}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="ล้างตัวกรอง"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={64} className="text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign size={18} />
            </div>
            <h3 className="text-sm font-bold text-gray-600">รายได้รวม (เก็บแล้ว)</h3>
          </div>
          <p className="text-2xl font-black text-emerald-700 relative z-10">{formatCurrency(data.totalRevenue)}</p>
        </div>

        {/* Pending AR */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Receipt size={64} className="text-amber-600" />
          </div>
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <ArrowUpRight size={18} />
            </div>
            <h3 className="text-sm font-bold text-gray-600">ยอดค้างรับ (AR)</h3>
          </div>
          <p className="text-2xl font-black text-amber-700 relative z-10">{formatCurrency(data.totalAR)}</p>
        </div>

        {/* Overdue */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle size={64} className="text-red-600" />
          </div>
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <AlertCircle size={18} />
            </div>
            <h3 className="text-sm font-bold text-gray-600">หนี้เกินกำหนด (Overdue)</h3>
          </div>
          <p className="text-2xl font-black text-red-700 relative z-10">{formatCurrency(data.overdueAmount)}</p>
        </div>

        {/* Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowDownRight size={64} className="text-indigo-600" />
          </div>
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <ArrowDownRight size={18} />
            </div>
            <h3 className="text-sm font-bold text-gray-600">รายจ่ายรวม (PO + ค่าใช้จ่าย)</h3>
          </div>
          <p className="text-2xl font-black text-indigo-700 relative z-10">{formatCurrency(data.totalExpenses)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-wider">เปรียบเทียบรายได้และค่าใช้จ่าย (12 เดือนย้อนหลัง)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any, name: any) => [formatCurrency(value), name]}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="revenue" name="รายได้" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-wider">สัดส่วนวิธีการชำระเงิน</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.paymentMethods.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any, name: any) => [`${value} งาน`, name]} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Overdue */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <h3 className="text-sm font-black text-red-700 mb-4 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle size={16} /> รายการค้างชำระ (ด่วน)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">งวดที่</th>
                  <th className="px-4 py-3 text-right">ยอดที่ชำระแล้ว</th>
                  <th className="px-4 py-3 text-right">ยอดค้างชำระ</th>
                  <th className="px-4 py-3">วันครบกำหนด</th>
                  <th className="px-4 py-3">ชื่อโปรเจค/ลูกค้า</th>
                  <th className="px-4 py-3">เซลส์ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">รหัสงาน</th>
                </tr>
              </thead>
              <tbody>
                {data.topOverdue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">ไม่มีรายการค้างชำระ</td>
                  </tr>
                ) : data.topOverdue.map((pt: any) => {
                  const totalAmount = Number(pt.installmentAmount) || Number(pt.job?.project?.projectValue) || Number(pt.job?.quotation?.actualClosingAmount) || Number(pt.job?.quotation?.totalAmountBeforeVat) || 0;
                  const paidAmount = Number(pt.paidAmount) || 0;
                  const outstandingAmount = totalAmount - paidAmount;
                  const isOverdue = pt.dueDate && new Date(pt.dueDate) < new Date();
                  return (
                    <tr key={pt.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {pt.installmentNo ? `งวดที่ ${pt.installmentNo}/${pt.installmentTotal}` : 'ยอดรวม'}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-600 text-right">{formatCurrency(paidAmount)}</td>
                      <td className="px-4 py-3 font-bold text-red-600 text-right">{formatCurrency(outstandingAmount)}</td>
                      <td className={`px-4 py-3 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {pt.dueDate ? new Date(pt.dueDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                        {pt.job?.project?.projectName || pt.job?.quotation?.company?.companyName || pt.job?.customerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {pt.job?.sellerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href="/accounting" className="text-blue-600 hover:underline font-mono text-xs">
                          {pt.job?.jobNumber || '-'}
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ongoing Projects Income/Expense */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2">
            <Briefcase size={16} /> รายได้และค่าใช้จ่าย (โปรเจคทั้งหมด)
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ รหัสโปรเจค..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-3 pr-10 py-1.5 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {projectSearch && (
              <button
                onClick={() => setProjectSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">รหัสโปรเจค</th>
                <th className="px-4 py-3">ชื่อลูกค้า</th>
                <th className="px-4 py-3">ชื่อโปรเจค</th>
                <th className="px-4 py-3 text-right">งบประมาณ</th>
                <th className="px-4 py-3 text-right">รายได้ (รับแล้ว)</th>
                <th className="px-4 py-3 text-right">ค่าใช้จ่าย (PO)</th>
                <th className="px-4 py-3 rounded-tr-lg text-right">กำไรเบื้องต้น</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredProjects = data.ongoingProjects?.filter((p: any) => 
                  p.projectNumber?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                  p.projectName?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                  p.clientName?.toLowerCase().includes(projectSearch.toLowerCase())
                ) || [];

                if (filteredProjects.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-500">ไม่พบโปรเจค</td>
                    </tr>
                  );
                }

                return filteredProjects.map((proj: any) => {
                const profit = proj.income - proj.expense;
                return (
                  <tr key={proj.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">
                      <a href={`/projects/${proj.id}`} className="hover:underline">{proj.projectNumber}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{proj.clientName}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{proj.projectName}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(proj.budget)}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(proj.income)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(proj.expense)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${profit >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
                      {formatCurrency(profit)}
                    </td>
                  </tr>
                );
              })
            })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
