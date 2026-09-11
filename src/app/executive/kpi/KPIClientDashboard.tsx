'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Target, 
  Award, 
  TrendingUp, 
  Users, 
  Sparkles, 
  Search, 
  Building2, 
  Layers, 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ArrowRight,
  BarChart3,
  Flame,
  FileText
} from 'lucide-react';

// Smart currency formatter
const formatSmart = (val: number) => {
  if (!val || val === 0) return '0฿';
  if (val < 1000) return `${val.toLocaleString()}฿`;
  if (val < 1000000) return (val / 1000).toFixed(1) + 'k฿';
  return (val / 1000000).toFixed(2) + 'M฿';
};

// Exact currency formatter
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('th-TH', { 
    style: 'currency', 
    currency: 'THB', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(val || 0);
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function KPIClientDashboard({ data }: { data: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [repSearch, setRepSearch] = useState('');
  const [sortKey, setSortKey] = useState<'sales' | 'attainment' | 'winRate'>('sales');

  const {
    month,
    year,
    currentMonthSales = 0,
    prevMonthSales = 0,
    targetSales = 0,
    pipelineAmount = 0,
    pipelineCount = 0,
    winRate = 0,
    prevWinRate = 0,
    funnel = { lead: 0, telesale: 0, quotation: 0, po: 0, invoice: 0 },
    salesTeam = [],
    branches = [],
    staleDeals = [],
    topCustomers = []
  } = data;

  const filterPeriod = searchParams.get('period') || 'รายเดือน';
  const filterScope = searchParams.get('branch') || 'ทีมทั้งหมด';

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleMonthStep = (direction: 'prev' | 'next') => {
    let newMonth = month + (direction === 'next' ? 1 : -1);
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('month', newMonth.toString());
      params.set('year', newYear.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Calculations
  const salesTrend = prevMonthSales > 0 ? ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100 : 0;
  const winRateTrend = winRate - prevWinRate;
  const targetAttainment = targetSales > 0 ? (currentMonthSales / targetSales) * 100 : 0;
  const quarterlyForecast = pipelineAmount * (winRate / 100);

  // Filter and sort team members
  const filteredSalesTeam = useMemo(() => {
    let list = [...salesTeam];
    if (repSearch.trim()) {
      const s = repSearch.toLowerCase();
      list = list.filter((r: any) => 
        r.name?.toLowerCase().includes(s) ||
        r.branch?.toLowerCase().includes(s)
      );
    }

    list.sort((a: any, b: any) => {
      if (sortKey === 'attainment') {
        const attA = a.target > 0 ? a.sales / a.target : 0;
        const attB = b.target > 0 ? b.sales / b.target : 0;
        return attB - attA;
      }
      if (sortKey === 'winRate') {
        return b.winRate - a.winRate;
      }
      return b.sales - a.sales;
    });

    return list;
  }, [salesTeam, repSearch, sortKey]);

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 pb-20 custom-scrollbar relative font-sans">
      
      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-gray-950/20 backdrop-blur-sm flex items-center justify-center transition-opacity">
          <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span className="font-bold text-gray-800 text-sm">กำลังคำนวณ KPI...</span>
          </div>
        </div>
      )}

      {/* ── Modern Red, White & Gray Executive Hero Header ── */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                <Target size={13} className="text-red-500" />
                Executive Sales Performance Analytics
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                KPI ประสิทธิภาพทีมขาย
              </h1>
              <p className="text-gray-400 text-sm mt-1.5 max-w-2xl font-normal">
                ติดตามยอดขายจริงเทียบเป้าหมาย การกระจายตัวของ Pipeline และวิเคราะห์ขั้นตอนการปิดการขาย (Conversion Funnel)
              </p>
            </div>

            {/* Quick Attainment Highlight */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-900/40">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">ความสำเร็จเทียบเป้า</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      {targetAttainment.toFixed(1)}%
                    </span>
                    <span className="text-xs font-medium text-gray-400">
                      (เป้า {formatSmart(targetSales)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 space-y-6">

        {/* ── Executive Filter Bar ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Period Mode Selector */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl shrink-0">
              {['รายเดือน', 'รายไตรมาส', 'รายปี'].map((period) => (
                <button
                  key={period}
                  onClick={() => handleFilterChange('period', period)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    filterPeriod === period
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Month & Year Navigator */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Stepper (Only for Monthly view) */}
              {filterPeriod === 'รายเดือน' && (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => handleMonthStep('prev')}
                    className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-all"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-gray-800 px-2 min-w-[90px] text-center">
                    {THAI_MONTHS[month - 1]}
                  </span>
                  <button
                    onClick={() => handleMonthStep('next')}
                    className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-all"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Year Dropdown */}
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>ปี {y + 543} ({y})</option>
                  ))}
                </select>
              </div>

              {/* Branch / Scope Dropdown */}
              <div className="relative">
                <select
                  value={filterScope}
                  onChange={(e) => handleFilterChange('branch', e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all cursor-pointer"
                >
                  <option value="ทีมทั้งหมด">สาขาทั้งหมด (ทีมรวม)</option>
                  {branches?.map((b: string) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        </div>

        {/* ── 5 High-Impact Executive KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Actual Sales */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ยอดขายปัจจุบัน</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight" title={formatCurrency(currentMonthSales)}>
              {formatSmart(currentMonthSales)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              <span className={`inline-flex items-center gap-0.5 ${salesTrend >= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {salesTrend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {salesTrend >= 0 ? '+' : ''}{salesTrend.toFixed(0)}%
              </span>
              <span className="text-gray-400 font-normal">vs ช่วงก่อนหน้า</span>
            </div>
          </div>

          {/* Card 2: Target Attainment */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">เทียบเป้าหมาย</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center">
                <Target size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {targetAttainment.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-red-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(targetAttainment, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1.5">เป้า {formatSmart(targetSales)}</p>
          </div>

          {/* Card 3: Active Pipeline */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pipeline รวม</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center">
                <Layers size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight" title={formatCurrency(pipelineAmount)}>
              {formatSmart(pipelineAmount)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <Clock size={13} className="text-gray-400" />
              <span>{pipelineCount} deals รอตัดสินใจ</span>
            </div>
          </div>

          {/* Card 4: Win Rate */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Win Rate (อัตราปิด)</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
                <Award size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-tight">
              {winRate.toFixed(1)}%
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              <span className={`inline-flex items-center gap-0.5 ${winRateTrend >= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {winRateTrend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {winRateTrend >= 0 ? '+' : ''}{winRateTrend.toFixed(1)}%
              </span>
              <span className="text-gray-400 font-normal">vs ช่วงก่อนหน้า</span>
            </div>
          </div>

          {/* Card 5: Weighted Forecast */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">คาดการณ์ยอดขาย</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight" title={formatCurrency(quarterlyForecast)}>
              {formatSmart(quarterlyForecast)}
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-2">
              คำนวณจาก Pipeline × Win Rate
            </p>
          </div>

        </div>

        {/* ── Redesigned Sales Conversion Funnel (Red, White & Gray) ── */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-red-600" />
                กระบวนการขายและอัตราการแปลง (Conversion Funnel)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ติดตามประสิทธิภาพการไหลของดีลจาก Lead จนถึงขั้นตอนเปิดบิลสำเร็จ
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-red-700 font-medium bg-red-50 px-3 py-1.5 rounded-xl border border-red-200/80 self-start sm:self-auto">
              <span>Overall Conversion:</span>
              <span className="font-bold text-red-700 font-mono">
                {funnel.lead > 0 ? ((funnel.invoice / funnel.lead) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Stepped Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                stage: '1. Lead',
                label: 'ลูกค้ามุ่งหวัง',
                count: funnel.lead,
                prevCount: null,
                isFinal: false
              },
              {
                stage: '2. Telesale',
                label: 'โทรติดต่อ/นัดหมาย',
                count: funnel.telesale,
                prevCount: funnel.lead,
                isFinal: false
              },
              {
                stage: '3. Quotation',
                label: 'ออกใบเสนอราคา',
                count: funnel.quotation,
                prevCount: funnel.telesale,
                isFinal: false
              },
              {
                stage: '4. PO',
                label: 'ลูกค้าอนุมัติ PO',
                count: funnel.po,
                prevCount: funnel.quotation,
                isFinal: false
              },
              {
                stage: '5. Invoice',
                label: 'เปิดบิลส่งมอบสำเร็จ',
                count: funnel.invoice,
                prevCount: funnel.po,
                isFinal: true
              },
            ].map((step, idx) => {
              const stepConversion = step.prevCount && step.prevCount > 0 
                ? ((step.count / step.prevCount) * 100).toFixed(1) 
                : null;
              const overallPercent = funnel.lead > 0 ? ((step.count / funnel.lead) * 100).toFixed(1) : '100';

              return (
                <div 
                  key={idx}
                  className={`rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between relative ${
                    step.isFinal 
                      ? 'bg-red-50/70 border-2 border-red-300 text-red-950 shadow-xs' 
                      : 'bg-gray-50/70 hover:bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        step.isFinal ? 'text-red-700' : 'text-gray-500'
                      }`}>
                        {step.stage}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono border ${
                        step.isFinal 
                          ? 'bg-red-600 text-white border-red-600' 
                          : 'bg-white text-gray-700 border-gray-200'
                      }`}>
                        {overallPercent}%
                      </span>
                    </div>

                    <p className={`text-xs font-semibold ${step.isFinal ? 'text-red-900' : 'text-gray-700'}`}>
                      {step.label}
                    </p>
                    
                    <div className={`text-2xl sm:text-3xl font-black font-mono mt-2 tracking-tight ${
                      step.isFinal ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      {step.count.toLocaleString()}
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${
                    step.isFinal ? 'border-red-200' : 'border-gray-200'
                  }`}>
                    <span className="text-gray-500 font-medium">Conversion:</span>
                    <span className={`font-bold font-mono ${step.isFinal ? 'text-red-700' : 'text-gray-900'}`}>
                      {stepConversion !== null ? `${stepConversion}%` : '100%'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Individual Sales Performance Table (Red, White & Gray) ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-200 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  ประสิทธิภาพทีมขายรายบุคคล (Sales Performance)
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {filteredSalesTeam.length} คน
                  </span>
                </h2>
                <p className="text-xs text-gray-500">ผลงานเปรียบเทียบยอดขาย ความสำเร็จเทียบเป้า และอัตราปิดการขาย</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเซลล์ หรือสาขา..."
                  value={repSearch}
                  onChange={(e) => setRepSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 placeholder-gray-400 transition-all"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                {[
                  { id: 'sales' as const, label: 'ยอดขาย' },
                  { id: 'attainment' as const, label: '% เป้า' },
                  { id: 'winRate' as const, label: 'Win Rate' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSortKey(s.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      sortKey === s.id ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar max-h-[520px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/90 backdrop-blur-sm sticky top-0 z-10">
                <tr className="text-gray-500 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100">
                  <th className="py-3.5 px-6">อันดับ / พนักงาน</th>
                  <th className="py-3.5 px-6">สาขา</th>
                  <th className="py-3.5 px-6 text-right">ยอดขายจริง</th>
                  <th className="py-3.5 px-6 text-right">ความสำเร็จเทียบเป้า</th>
                  <th className="py-3.5 px-6 text-center">โทร (ครั้ง)</th>
                  <th className="py-3.5 px-6 text-right">Win Rate</th>
                  <th className="py-3.5 px-6 text-right">รอบปิดดีล</th>
                  <th className="py-3.5 px-6 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSalesTeam.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400 text-xs">
                      ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredSalesTeam.map((rep: any, index: number) => {
                    const attainment = rep.target > 0 ? (rep.sales / rep.target) * 100 : 0;
                    
                    const isTop1 = index === 0 && sortKey === 'sales';
                    const isTop2 = index === 1 && sortKey === 'sales';
                    const isTop3 = index === 2 && sortKey === 'sales';

                    let rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-mono text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    );

                    if (isTop1) {
                      rankBadge = (
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-sm shadow-red-200" title="อันดับ 1">
                          1
                        </span>
                      );
                    } else if (isTop2) {
                      rankBadge = (
                        <span className="w-6 h-6 rounded-full bg-gray-800 text-white font-mono text-xs font-black flex items-center justify-center shadow-xs" title="อันดับ 2">
                          2
                        </span>
                      );
                    } else if (isTop3) {
                      rankBadge = (
                        <span className="w-6 h-6 rounded-full bg-gray-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-xs" title="อันดับ 3">
                          3
                        </span>
                      );
                    }

                    let statusBadge = (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        ต้องปรับปรุง
                      </span>
                    );

                    if (attainment >= 100) {
                      statusBadge = (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          เกินเป้าหมาย 🔥
                        </span>
                      );
                    } else if (attainment >= 70) {
                      statusBadge = (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-300">
                          ใกล้ถึงเป้า
                        </span>
                      );
                    }

                    return (
                      <tr key={rep.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Rank & Rep Name */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 flex items-center justify-center w-6">{rankBadge}</div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 border border-gray-200">
                              {rep.name?.slice(0, 1) || 'S'}
                            </div>
                            <span className="font-semibold text-gray-900 text-xs truncate max-w-[160px]" title={rep.name}>
                              {rep.name}
                            </span>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-3.5 px-6">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
                            {rep.branch || 'ไม่ระบุ'}
                          </span>
                        </td>

                        {/* Sales */}
                        <td className="py-3.5 px-6 text-right">
                          <div className="font-bold text-gray-900 font-mono text-xs" title={formatCurrency(rep.sales)}>
                            {formatCurrency(rep.sales)}
                          </div>
                          <span className="text-[10px] text-gray-400 font-normal">
                            เป้า {formatSmart(rep.target)}
                          </span>
                        </td>

                        {/* Attainment Progress */}
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-black font-mono text-xs ${
                              attainment >= 100 ? 'text-red-600' : 'text-gray-700'
                            }`}>
                              {attainment.toFixed(0)}%
                            </span>
                            <div className="w-24 bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  attainment >= 100 ? 'bg-red-600' : attainment >= 70 ? 'bg-gray-700' : 'bg-gray-400'
                                }`}
                                style={{ width: `${Math.min(attainment, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Calls */}
                        <td className="py-3.5 px-6 text-center font-mono text-xs text-gray-600">
                          {rep.calls}
                        </td>

                        {/* Win Rate */}
                        <td className="py-3.5 px-6 text-right font-mono text-xs font-semibold text-gray-700">
                          {rep.winRate.toFixed(1)}%
                        </td>

                        {/* Days to Close */}
                        <td className="py-3.5 px-6 text-right text-xs text-gray-500 font-mono">
                          {rep.daysToClose > 0 ? `${rep.daysToClose} วัน` : '-'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-6 text-center">
                          {statusBadge}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Strategic Insights Grid (Stale Deals & Top Customers) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Stale Deals Widget */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200/80 flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  Deals ค้างนานเกิน 30 วัน
                </h3>
                <p className="text-xs text-gray-400">ควรเร่งติดตามเพื่อไม่ให้โอกาสการขายหลุดมือ</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/60 font-mono">
                {staleDeals.length} ดีล
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100 pr-1 space-y-1">
              {staleDeals.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 size={32} className="text-gray-400" />
                  <span>ไม่มีดีลค้างนานเกิน 30 วันในช่วงนี้</span>
                </div>
              ) : (
                staleDeals.map((deal: any, i: number) => {
                  const isSevere = deal.days >= 60;
                  return (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-xl transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 font-mono">
                            {deal.quotationNumber || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-600 truncate max-w-[180px]" title={deal.companyName}>
                            {deal.companyName}
                          </span>
                        </div>
                        {deal.amount > 0 && (
                          <span className="text-[11px] text-gray-400 font-mono">
                            มูลค่า: {formatSmart(deal.amount)}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono ${
                          isSevere 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {deal.days} วัน
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top 5 Customers Widget */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200/80 flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Flame size={18} className="text-red-600" />
                  ลูกค้าสร้างยอดขายสูงสุด (Top Customers)
                </h3>
                <p className="text-xs text-gray-400">องค์กรที่มียอดปิดการขายสูงสุดในรอบนี้</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/60 font-mono">
                Top 5
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100 pr-1 space-y-2">
              {topCustomers.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  ยังไม่มียอดขายในช่วงเวลานี้
                </div>
              ) : (
                topCustomers.map((cust: any, i: number) => {
                  const share = currentMonthSales > 0 ? (cust.sales / currentMonthSales) * 100 : 0;
                  return (
                    <div key={i} className="py-2 flex flex-col gap-1 hover:bg-gray-50/80 px-2 rounded-xl transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-900 truncate max-w-[220px]" title={cust.companyName}>
                            {cust.companyName}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-gray-900 font-mono">
                            {formatCurrency(cust.sales)}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1.5 font-mono">
                            ({share.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Contribution Progress Bar */}
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
