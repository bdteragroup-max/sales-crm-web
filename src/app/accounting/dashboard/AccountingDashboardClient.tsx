"use client";

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  Briefcase,
  Calendar,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Building2,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  Clock,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
}

function formatNumber(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  return amount.toLocaleString('th-TH');
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

interface AccountingDashboardClientProps {
  data: {
    totalRevenue: number;
    totalAR: number;
    overdueAmount: number;
    overdueCount?: number;
    totalExpenses: number;
    netProfit?: number;
    profitMargin?: number;
    monthlyTrend: Array<{ month: string; revenue: number; expenses: number }>;
    paymentMethods: Array<{ name: string; value: number }>;
    topOverdue: any[];
    ongoingProjects: any[];
  };
}

export default function AccountingDashboardClient({ data }: AccountingDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStartDate = searchParams?.get('startDate') || '';
  const currentEndDate = searchParams?.get('endDate') || '';

  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overdue' | 'projects'>('overdue');

  // Search & Filters for Overdue
  const [overdueSearch, setOverdueSearch] = useState('');
  const [overduePage, setOverduePage] = useState(1);
  const overduePageSize = 10;

  // Search & Filters for Projects
  const [projectSearch, setProjectSearch] = useState('');
  const [projectProfitFilter, setProjectProfitFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');
  const [projectPage, setProjectPage] = useState(1);
  const projectPageSize = 10;

  // Presets
  const applyPreset = (preset: 'ALL' | 'THIS_YEAR' | 'THIS_MONTH' | 'LAST_30') => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      router.push('/accounting/dashboard');
      setShowDatePicker(false);
      return;
    }

    let start = '';
    let end = '';

    if (preset === 'THIS_YEAR') {
      start = `${yyyy}-01-01`;
      end = `${yyyy}-12-31`;
    } else if (preset === 'THIS_MONTH') {
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      start = `${yyyy}-${mm}-01`;
      end = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
    } else if (preset === 'LAST_30') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const pastYyyy = past.getFullYear();
      const pastMm = String(past.getMonth() + 1).padStart(2, '0');
      const pastDd = String(past.getDate()).padStart(2, '0');
      start = `${pastYyyy}-${pastMm}-${pastDd}`;
      end = `${yyyy}-${mm}-${String(now.getDate()).padStart(2, '0')}`;
    }

    setStartDate(start);
    setEndDate(end);
    const params = new URLSearchParams();
    params.set('startDate', start);
    params.set('endDate', end);
    router.push(`?${params.toString()}`);
    setShowDatePicker(false);
  };

  const applyCustomFilter = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    router.push(`?${params.toString()}`);
    setShowDatePicker(false);
  };

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
    router.push('/accounting/dashboard');
    setShowDatePicker(false);
  };

  // Calculated Financial Metrics
  const netProfit = data.netProfit ?? (data.totalRevenue - data.totalExpenses);
  const profitMargin = data.profitMargin ?? (data.totalRevenue > 0 ? (netProfit / data.totalRevenue) * 100 : 0);
  const totalReceivables = data.totalRevenue + data.totalAR;
  const collectionRate = totalReceivables > 0 ? (data.totalRevenue / totalReceivables) * 100 : 0;

  // Filtered Overdue Tasks
  const filteredOverdue = useMemo(() => {
    const list = data.topOverdue || [];
    if (!overdueSearch.trim()) return list;
    const q = overdueSearch.toLowerCase().trim();
    return list.filter((pt: any) => {
      const jobNum = (pt.job?.jobNumber || '').toLowerCase();
      const client = (pt.job?.project?.projectName || pt.job?.quotation?.company?.companyName || pt.job?.customerName || '').toLowerCase();
      const seller = (pt.job?.sellerName || '').toLowerCase();
      const proj = (pt.job?.project?.name || '').toLowerCase();
      return jobNum.includes(q) || client.includes(q) || seller.includes(q) || proj.includes(q);
    });
  }, [data.topOverdue, overdueSearch]);

  const totalOverduePages = Math.max(1, Math.ceil(filteredOverdue.length / overduePageSize));
  const paginatedOverdue = useMemo(() => {
    const start = (overduePage - 1) * overduePageSize;
    return filteredOverdue.slice(start, start + overduePageSize);
  }, [filteredOverdue, overduePage]);

  // Filtered Ongoing Projects
  const filteredProjects = useMemo(() => {
    let list = data.ongoingProjects || [];
    if (projectProfitFilter === 'PROFIT') {
      list = list.filter((p: any) => (p.income - p.expense) >= 0);
    } else if (projectProfitFilter === 'LOSS') {
      list = list.filter((p: any) => (p.income - p.expense) < 0);
    }

    if (!projectSearch.trim()) return list;
    const q = projectSearch.toLowerCase().trim();
    return list.filter((p: any) => {
      const num = (p.projectNumber || '').toLowerCase();
      const name = (p.projectName || '').toLowerCase();
      const client = (p.clientName || '').toLowerCase();
      const kw = (p.primaryKeyword || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      return num.includes(q) || name.includes(q) || client.includes(q) || kw.includes(q) || id.includes(q);
    });
  }, [data.ongoingProjects, projectProfitFilter, projectSearch]);

  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const paginatedProjects = useMemo(() => {
    const start = (projectPage - 1) * projectPageSize;
    return filteredProjects.slice(start, start + projectPageSize);
  }, [filteredProjects, projectPage]);

  // Format Month for Chart
  const formattedMonthlyTrend = useMemo(() => {
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return (data.monthlyTrend || []).map(item => {
      const parts = item.month.split('-');
      if (parts.length === 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const yy = (parseInt(parts[0], 10) + 543).toString().slice(-2);
        return {
          ...item,
          displayName: `${thaiMonths[mIdx] || parts[1]}'${yy}`
        };
      }
      return { ...item, displayName: item.month };
    });
  }, [data.monthlyTrend]);

  // Total Payment Tasks count
  const totalPaymentTasksCount = useMemo(() => {
    return (data.paymentMethods || []).reduce((acc, curr) => acc + curr.value, 0);
  }, [data.paymentMethods]);

  const hasFilterActive = Boolean(currentStartDate || currentEndDate);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* 1. Header & Financial Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
            <Link href="/accounting" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>การเงินและบัญชี</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">แดชบอร์ดภาพรวมการเงิน (Financial Dashboard)</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            แดชบอร์ดภาพรวมบัญชี & การเงิน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            รายงานกระแสเงินสด รายได้เรียกเก็บจริง ยอดลูกหนี้ค้างชำระ (AR) และกำไรขั้นต้นของบริษัท
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/accounting"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>จัดการวางบิล & บันทึกรับเงิน</span>
          </Link>

          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 shadow-sm transition-all"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RotateCcw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* 2. Period Filter Presets Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">ช่วงเวลา:</span>
          <button
            onClick={() => applyPreset('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!hasFilterActive
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
          >
            ทั้งหมด (All Time)
          </button>
          <button
            onClick={() => applyPreset('THIS_YEAR')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
          >
            ปีนี้ (2569)
          </button>
          <button
            onClick={() => applyPreset('THIS_MONTH')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
          >
            เดือนนี้
          </button>
          <button
            onClick={() => applyPreset('LAST_30')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
          >
            30 วันล่าสุด
          </button>
          <button
            onClick={() => setShowDatePicker(prev => !prev)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${hasFilterActive
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{hasFilterActive ? `${startDate} ถึง ${endDate}` : 'กำหนดช่วงวันที่'}</span>
          </button>
        </div>

        {hasFilterActive && (
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างตัวกรองช่วงเวลา</span>
          </button>
        )}
      </div>

      {/* Date Range Selector Dropdown */}
      {showDatePicker && (
        <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium">ตั้งแต่วันที่:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium">ถึงวันที่:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyCustomFilter}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              ค้นหา
            </button>
            <button
              onClick={() => setShowDatePicker(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* 3. Five Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Collected Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">รายได้เรียกเก็บแล้ว</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data.totalRevenue)}
            </div>
            <div className="text-xs text-emerald-700 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>อัตราเก็บเงินสำเร็จ: {collectionRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Accounts Receivable (AR) */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">ยอดค้างรับ (AR)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data.totalAR)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ลูกหนี้การค้าที่รอรับชำระ
            </div>
          </div>
        </div>

        {/* Card 3: Overdue AR */}
        <div
          onClick={() => setActiveTab('overdue')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-rose-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">หนี้เกินกำหนด (Overdue)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {formatCurrency(data.overdueAmount)}
            </div>
            <div className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{data.overdueCount || data.topOverdue?.length || 0} รายการที่ต้องเร่งติดตาม</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">รายจ่ายรวม (PO + เคลม)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(data.totalExpenses)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ต้นทุนจัดซื้อและเบิกจ่ายสาขา
            </div>
          </div>
        </div>

        {/* Card 5: Gross Operating Margin */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all hover:shadow-md ${netProfit >= 0 ? 'bg-white border-teal-200/80' : 'bg-rose-50/50 border-rose-200'
          }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${netProfit >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
              กำไรเบื้องต้นสุทธิ
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <div className={`text-xs mt-1 font-semibold ${netProfit >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
              มาร์จิ้น: {profitMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 4. Visual Financial Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Expenses Trend (12 Months) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  เปรียบเทียบรายได้และค่าใช้จ่าย (12 เดือนย้อนหลัง)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  วิเคราะห์กระแสเงินสดรับ-จ่ายตามรอบเดือน
                </p>
              </div>
            </div>

            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedMonthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', fontSize: '12px' }}
                    formatter={(value: any, name: any) => [formatCurrency(value), name]}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  <Bar dataKey="revenue" name="รายได้ (รับแล้ว)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" name="รายจ่าย (PO/เคลม)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Payment Methods Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                สัดส่วนวิธีการชำระเงิน
              </h3>
              <span className="text-xs font-semibold text-slate-500">{totalPaymentTasksCount} รายการ</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              จำแนกการชำระเต็มจำนวนกับเครดิต/ผ่อนชำระ
            </p>

            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {data.paymentMethods.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value: any, name: any) => [`${formatNumber(value)} งาน`, name]}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            {data.paymentMethods.map((pm, idx) => (
              <div key={idx} className="p-2 bg-slate-50 rounded-xl">
                <div className="text-[11px] text-slate-500 truncate">{pm.name}</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{formatNumber(pm.value)} งาน</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Detailed Work Queue & Analytics Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('overdue')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overdue'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>หนี้ค้างชำระ & เกินกำหนด ({filteredOverdue.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'projects'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>ผลประกอบการแยกโปรเจค ({filteredProjects.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'overdue' ? 'ค้นหารหัสงาน, ลูกค้า, เซลส์...' : 'ค้นหารหัสโปรเจค, ชื่อโครงการ...'}
              value={activeTab === 'overdue' ? overdueSearch : projectSearch}
              onChange={e => {
                if (activeTab === 'overdue') {
                  setOverdueSearch(e.target.value);
                  setOverduePage(1);
                } else {
                  setProjectSearch(e.target.value);
                  setProjectPage(1);
                }
              }}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {(activeTab === 'overdue' ? overdueSearch : projectSearch) && (
              <button
                onClick={() => {
                  if (activeTab === 'overdue') setOverdueSearch('');
                  else setProjectSearch('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Overdue Receivables Table */}
        {activeTab === 'overdue' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">งวดที่</th>
                    <th className="py-3 px-4">วันครบกำหนด</th>
                    <th className="py-3 px-4">ลูกค้า & โครงการ</th>
                    <th className="py-3 px-4">เซลส์ผู้รับผิดชอบ</th>
                    <th className="py-3 px-4 text-right">ยอดที่ชำระแล้ว</th>
                    <th className="py-3 px-4 text-right">ยอดค้างชำระ</th>
                    <th className="py-3 px-4 text-center">รหัสงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOverdue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 stroke-1" />
                        <div className="text-sm font-semibold text-slate-700">ไม่พบรายการหนี้ค้างชำระ</div>
                        <div className="text-xs text-slate-400">ไม่มีรายการที่ตรงกับเงื่อนไขการค้นหา</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOverdue.map((pt: any) => {
                      const totalAmount = Number(pt.installmentAmount) || Number(pt.job?.project?.projectValue) || Number(pt.job?.quotation?.actualClosingAmount) || Number(pt.job?.quotation?.totalAmountBeforeVat) || 0;
                      const paidAmount = Number(pt.paidAmount) || 0;
                      const outstandingAmount = totalAmount - paidAmount;
                      const isOverdue = pt.dueDate && new Date(pt.dueDate) < new Date();
                      const daysDiff = pt.dueDate ? Math.round((new Date().getTime() - new Date(pt.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

                      return (
                        <tr key={pt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {pt.installmentNo ? `งวดที่ ${pt.installmentNo}/${pt.installmentTotal}` : 'ยอดรวม'}
                          </td>

                          {/* Due Date & Overdue Badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                {pt.dueDate ? new Date(pt.dueDate).toLocaleDateString('th-TH') : '-'}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 w-fit">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>เกินกำหนด {daysDiff} วัน</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer & Project */}
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <div className="flex flex-col gap-0.5">
                              <div className="font-semibold text-slate-900 truncate" title={pt.job?.project?.projectName || pt.job?.quotation?.company?.companyName || pt.job?.customerName}>
                                {pt.job?.project?.projectName || pt.job?.quotation?.company?.companyName || pt.job?.customerName || '-'}
                              </div>
                              {pt.job?.project?.name && (
                                <div className="text-[11px] text-slate-500 truncate">{pt.job.project.name}</div>
                              )}
                            </div>
                          </td>

                          {/* Salesperson */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{pt.job?.sellerName || '-'}</span>
                            </div>
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                            {formatCurrency(paidAmount)}
                          </td>

                          {/* Outstanding */}
                          <td className="py-3.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                            {formatCurrency(outstandingAmount)}
                          </td>

                          {/* Job Link */}
                          <td className="py-3.5 px-4 text-center">
                            <Link
                              href="/accounting"
                              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                            >
                              <span>{pt.job?.jobNumber || 'ดูงาน'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Overdue Pagination */}
            {filteredOverdue.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                <div className="text-xs text-slate-500">
                  แสดง {filteredOverdue.length > 0 ? (overduePage - 1) * overduePageSize + 1 : 0} -{' '}
                  {Math.min(overduePage * overduePageSize, filteredOverdue.length)} จาก {filteredOverdue.length} รายการ
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOverduePage(prev => Math.max(1, prev - 1))}
                    disabled={overduePage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>ก่อนหน้า</span>
                  </button>
                  <div className="text-xs font-bold px-2 text-slate-700">
                    {overduePage} / {totalOverduePages}
                  </div>
                  <button
                    onClick={() => setOverduePage(prev => Math.min(totalOverduePages, prev + 1))}
                    disabled={overduePage === totalOverduePages}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ongoing Projects P&L Table */}
        {activeTab === 'projects' && (
          <div>
            {/* Profit Filter Pills */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
              <span className="text-xs font-semibold text-slate-500">สถานะกำไร:</span>
              {(['ALL', 'PROFIT', 'LOSS'] as const).map(pFilter => (
                <button
                  key={pFilter}
                  onClick={() => {
                    setProjectProfitFilter(pFilter);
                    setProjectPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${projectProfitFilter === pFilter
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                  {pFilter === 'ALL' ? 'ทั้งหมด' : pFilter === 'PROFIT' ? 'มีกำไร' : 'ขาดทุน'}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">รหัสโปรเจค</th>
                    <th className="py-3 px-4">ชื่อโปรเจค / โครงการ</th>
                    <th className="py-3 px-4">ชื่อลูกค้า</th>
                    <th className="py-3 px-4 text-right">งบประมาณ</th>
                    <th className="py-3 px-4 text-right">รายได้ (รับแล้ว)</th>
                    <th className="py-3 px-4 text-right">ค่าใช้จ่าย (PO)</th>
                    <th className="py-3 px-4 text-right">กำไรเบื้องต้นสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Briefcase className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                        <div className="text-sm font-semibold text-slate-700">ไม่พบโปรเจคตามเงื่อนไข</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map((proj: any) => {
                      const profit = proj.income - proj.expense;
                      const marginPercent = proj.income > 0 ? (profit / proj.income) * 100 : 0;

                      return (
                        <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Project Number */}
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/projects/${proj.id}`}
                              className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              title="เปิดดูรายละเอียดโครงการ"
                            >
                              <span>{proj.projectNumber || '-'}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                            </Link>
                          </td>

                          {/* Project Name */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[240px]" title={proj.projectName}>
                            <Link
                              href={`/projects/${proj.id}`}
                              className="hover:text-blue-600 hover:underline block truncate"
                            >
                              {proj.projectName || '-'}
                            </Link>
                            {proj.status && (
                              <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                                สถานะ: {proj.status}
                              </span>
                            )}
                          </td>

                          {/* Client Name */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={proj.clientName}>
                            {proj.clientName || '-'}
                          </td>

                          {/* Budget */}
                          <td className="py-3.5 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                            {formatCurrency(proj.budget)}
                          </td>

                          {/* Income */}
                          <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                            {formatCurrency(proj.income)}
                          </td>

                          {/* Expense (PO) with PO count badge */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-semibold text-rose-600">
                                {formatCurrency(proj.expense)}
                              </span>
                              {proj.poCount > 0 ? (
                                <Link
                                  href={`/projects/${proj.id}`}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-red bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded border border-red-200 transition-colors"
                                  title="คลิกเพื่อดูใบสั่งซื้อในโครงการ"
                                >
                                  <span>{proj.poCount} PO</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              ) : (
                                <span className="text-[10px] text-slate-400">0 PO</span>
                              )}
                            </div>
                          </td>

                          {/* Profit & Margin Pill */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`font-bold ${profit >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                                {formatCurrency(profit)}
                              </span>
                              <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold border ${profit >= 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                {marginPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Projects Pagination */}
            {filteredProjects.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                <div className="text-xs text-slate-500">
                  แสดง {filteredProjects.length > 0 ? (projectPage - 1) * projectPageSize + 1 : 0} -{' '}
                  {Math.min(projectPage * projectPageSize, filteredProjects.length)} จาก {filteredProjects.length} โปรเจค
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProjectPage(prev => Math.max(1, prev - 1))}
                    disabled={projectPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>ก่อนหน้า</span>
                  </button>
                  <div className="text-xs font-bold px-2 text-slate-700">
                    {projectPage} / {totalProjectPages}
                  </div>
                  <button
                    onClick={() => setProjectPage(prev => Math.min(totalProjectPages, prev + 1))}
                    disabled={projectPage === totalProjectPages}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
