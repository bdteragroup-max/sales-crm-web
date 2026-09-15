'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Target,
  Award,
  ArrowRight,
  Search,
  Layers,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Flame,
  FileText,
  User,
  MapPin,
  Building2,
  ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val || 0);
};

const formatSmart = (val: number) => {
  if (!val || val === 0) return '0฿';
  if (val < 1000) return `${val.toLocaleString()}฿`;
  if (val < 1000000) return (val / 1000).toFixed(1) + 'k฿';
  return (val / 1000000).toFixed(2) + 'M฿';
};

const formatMB = (val: number) => {
  return (val / 1000000).toFixed(2) + 'M';
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function PipelineDashboardClient({ data }: { data: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // State for search and active tab in risk management
  const [riskTab, setRiskTab] = useState<'stalled' | 'unassigned'>('stalled');
  const [dealSearch, setDealSearch] = useState('');
  const [sortBy, setSortBy] = useState<'days' | 'amount'>('days');

  const {
    month,
    year,
    executiveSummary = {
      target: 0,
      closedSales: 0,
      gapToTarget: 0,
      totalPipeline: 0,
      coverageRatio: 0,
      weightedForecast: 0
    },
    weightedForecast = { categories: [] },
    pipelineHealth = {
      velocityDays: 0,
      stalledDealsCount: 0,
      stalledDealsList: [],
      unassignedLeadsCount: 0,
      unassignedLeadsList: []
    },
    conversionRates = { leads: 0, telesales: 0, quotes: 0, po: 0 },
    pipelineMovement = { startAmount: 0, newAdded: 0, won: 0, lost: 0, currentAmount: 0 }
  } = data;

  const filterPeriod = searchParams.get('period') || 'รายเดือน';

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

  const handleResetPeriod = () => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('period', 'รายเดือน');
      params.set('month', (today.getMonth() + 1).toString());
      params.set('year', today.getFullYear().toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Recharts Waterfall Data formatted with strictly Red, White & Gray tones
  const renderWaterfall = [
    { name: 'ยอดยกมา', transparent: 0, ยอดคงเหลือ: pipelineMovement.startAmount, เพิ่มขึ้น: 0, ลดลง: 0 },
    { name: 'ดีลใหม่', transparent: pipelineMovement.startAmount, ยอดคงเหลือ: 0, เพิ่มขึ้น: pipelineMovement.newAdded, ลดลง: 0 },
    { name: 'ชนะ (Won)', transparent: Math.max(0, pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won), ยอดคงเหลือ: 0, เพิ่มขึ้น: 0, ลดลง: pipelineMovement.won },
    { name: 'แพ้ (Lost)', transparent: Math.max(0, pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won - pipelineMovement.lost), ยอดคงเหลือ: 0, เพิ่มขึ้น: 0, ลดลง: pipelineMovement.lost },
    { name: 'ยอดปัจจุบัน', transparent: 0, ยอดคงเหลือ: pipelineMovement.currentAmount, เพิ่มขึ้น: 0, ลดลง: 0 }
  ];

  // Filtered and Sorted Stalled Deals
  const filteredStalledDeals = useMemo(() => {
    let list = [...(pipelineHealth.stalledDealsList || [])];
    if (dealSearch.trim()) {
      const q = dealSearch.toLowerCase();
      list = list.filter((d: any) =>
        d.company?.toLowerCase().includes(q) ||
        d.salesperson?.toLowerCase().includes(q) ||
        d.quotationNumber?.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      return b.daysStalled - a.daysStalled;
    });
    return list;
  }, [pipelineHealth.stalledDealsList, dealSearch, sortBy]);

  // Filtered Unassigned Leads
  const filteredUnassignedLeads = useMemo(() => {
    let list = [...(pipelineHealth.unassignedLeadsList || [])];
    if (dealSearch.trim()) {
      const q = dealSearch.toLowerCase();
      list = list.filter((l: any) =>
        l.company?.toLowerCase().includes(q) ||
        l.province?.toLowerCase().includes(q) ||
        l.customerType?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pipelineHealth.unassignedLeadsList, dealSearch]);

  const targetAttainment = executiveSummary.target > 0
    ? (executiveSummary.closedSales / executiveSummary.target) * 100
    : 0;

  const totalForecastedAndClosed = executiveSummary.weightedForecast + executiveSummary.closedSales;

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 pb-20 custom-scrollbar relative font-sans">

      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-gray-950/20 backdrop-blur-sm flex items-center justify-center transition-opacity">
          <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span className="font-bold text-gray-800 text-sm">กำลังคำนวณการคาดการณ์ไปป์ไลน์...</span>
          </div>
        </div>
      )}

      {/* ── Modern Red, White & Gray Hero Header ── */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                <Layers size={13} className="text-red-500" />
                Executive Pipeline & Revenue Forecast
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                คาดการณ์ไปป์ไลน์และโอกาสการขาย
              </h1>
              <p className="text-gray-400 text-sm mt-1.5 max-w-2xl font-normal">
                วิเคราะห์มูลค่าไปป์ไลน์ตามความน่าจะเป็น ตรวจสอบการไหลของดีล และจัดการความเสี่ยงดีลที่ค้างในระบบ
              </p>
            </div>

            {/* Quick Hero Health Highlight */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-900/40">
                  <Flame size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">สัดส่วนครอบคลุมเป้า</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      {executiveSummary.coverageRatio.toFixed(1)}x
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${executiveSummary.coverageRatio >= 3
                      ? 'bg-gray-800 text-gray-200 border border-gray-700'
                      : executiveSummary.coverageRatio >= 2
                        ? 'bg-gray-800 text-red-300 border border-gray-700'
                        : 'bg-red-600 text-white'
                      }`}>
                      {executiveSummary.coverageRatio >= 3 ? 'ปลอดภัย (Safe)' : executiveSummary.coverageRatio >= 2 ? 'เฝ้าระวัง' : 'เสี่ยงสูง'}
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterPeriod === period
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
                  <span className="text-xs font-bold text-gray-800 px-2 min-w-[110px] text-center">
                    {THAI_MONTHS[month - 1]} {year + 543}
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

              {/* Quarter Indicator */}
              {filterPeriod === 'รายไตรมาส' && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800">
                  <Calendar size={14} className="text-red-600" />
                  <span>ไตรมาส {Math.floor((month - 1) / 3) + 1}/{year + 543}</span>
                </div>
              )}

              {/* Year Selector */}
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-9 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
                >
                  {[year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>
                      ปี {y + 543}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Reset to Current */}
              <button
                onClick={handleResetPeriod}
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-red-600 rounded-xl border border-gray-200 transition-all"
                title="กลับมางวดปัจจุบัน"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 1. Executive Summary KPI Cards (5 Cards) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 tracking-wide uppercase flex items-center gap-2">
              <Target size={16} className="text-red-600" />
              1. บทสรุปผู้บริหารและตัวชี้วัดหลัก (Executive Summary)
            </h2>
            <span className="text-xs text-gray-500">
              สถานะข้อมูล: {filterPeriod} ({THAI_MONTHS[month - 1]} {year + 543})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {/* Card 1: Target */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">เป้าหมายยอดขาย</span>
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                    <Target size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                  {formatSmart(executiveSummary.target)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatCurrency(executiveSummary.target)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-500">ปิดแล้วเทียบเป้า</span>
                  <span className="font-bold text-gray-800 font-mono">{targetAttainment.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-red-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, targetAttainment)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Closed Sales */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ยอดขายปิดแล้ว (Won)</span>
                  <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
                    <Award size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                  {formatSmart(executiveSummary.closedSales)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatCurrency(executiveSummary.closedSales)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">สถานะการปิด</span>
                <span className="font-bold text-red-600 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  เปิดบิลแล้ว / PO
                </span>
              </div>
            </div>

            {/* Card 3: Gap to Target */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ส่วนต่างสู่เป้า (Gap)</span>
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className={`text-2xl font-black tracking-tight font-mono ${executiveSummary.gapToTarget > 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {formatSmart(executiveSummary.gapToTarget)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatCurrency(executiveSummary.gapToTarget)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">สถานะเป้าหมาย</span>
                  <span className={`font-bold ${executiveSummary.gapToTarget > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {executiveSummary.gapToTarget > 0 ? 'ยังไม่ถึงเป้า' : 'บรรลุเป้าแล้ว'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Weighted Forecast */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ยอดคาดการณ์ถ่วงน้ำหนัก</span>
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-800">
                    <Layers size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                  {formatSmart(executiveSummary.weightedForecast)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatCurrency(executiveSummary.weightedForecast)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>ปิดแล้ว + คาดการณ์</span>
                  <span className="font-bold text-gray-800 font-mono">{formatSmart(totalForecastedAndClosed)}</span>
                </div>
              </div>
            </div>

            {/* Card 5: Coverage Ratio */}
            <div className={`rounded-2xl p-5 shadow-sm border flex flex-col justify-between hover:shadow-md transition-all ${executiveSummary.coverageRatio >= 3
              ? 'bg-white border-gray-200'
              : executiveSummary.coverageRatio >= 2
                ? 'bg-white border-gray-300'
                : 'bg-red-50/50 border-red-200'
              }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">สัดส่วนครอบคลุม (Coverage)</span>
                  <div className={`p-2 rounded-xl ${executiveSummary.coverageRatio >= 2 ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
                    <ShieldAlert size={16} />
                  </div>
                </div>
                <div className={`text-2xl font-black tracking-tight font-mono ${executiveSummary.coverageRatio < 2 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {executiveSummary.coverageRatio.toFixed(1)}x
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ไปป์ไลน์รวม: {formatSmart(executiveSummary.totalPipeline)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">ระดับความเสี่ยง</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${executiveSummary.coverageRatio >= 3
                  ? 'bg-gray-900 text-white'
                  : executiveSummary.coverageRatio >= 2
                    ? 'bg-gray-700 text-white'
                    : 'bg-red-600 text-white'
                  }`}>
                  {executiveSummary.coverageRatio >= 3 ? 'ปลอดภัย (Safe)' : executiveSummary.coverageRatio >= 2 ? 'เฝ้าระวัง' : 'วิกฤต (Critical)'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── 2. Forecast Categories & Pipeline Movement (2 Columns) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 2: Forecast Categories */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Layers size={18} className="text-red-600" />
                    2. มูลค่าตามความน่าจะเป็น (Forecast Categories)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">แบ่งตามโอกาสความสำเร็จเพื่อคำนวณ Weighted Revenue</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">มูลค่ารวมไปป์ไลน์</span>
                  <div className="text-sm font-black text-gray-900 font-mono">{formatCurrency(executiveSummary.totalPipeline)}</div>
                </div>
              </div>

              <div className="space-y-4 my-2">
                {weightedForecast.categories.map((cat: any, idx: number) => {
                  const prob = cat.probability;
                  const weightedVal = cat.amount * (prob / 100);
                  const shareOfPipeline = executiveSummary.totalPipeline > 0
                    ? (cat.amount / executiveSummary.totalPipeline) * 100
                    : 0;

                  // Dynamic monochromatic badge & progress styling
                  const badgeColor = prob === 100
                    ? 'bg-red-600 text-white'
                    : prob === 80
                      ? 'bg-gray-900 text-white'
                      : prob === 60
                        ? 'bg-gray-700 text-white'
                        : prob === 30
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-200 text-gray-800';

                  const barColor = prob === 100
                    ? 'bg-red-600'
                    : prob === 80
                      ? 'bg-gray-900'
                      : prob === 60
                        ? 'bg-gray-700'
                        : prob === 30
                          ? 'bg-gray-400'
                          : 'bg-gray-300';

                  return (
                    <div key={idx} className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-all">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                            {prob}%
                          </span>
                          <span className="text-sm font-bold text-gray-800">{cat.name}</span>
                          <span className="text-xs text-gray-500">({cat.dealCount} ดีล)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900 font-mono">{formatCurrency(cat.amount)}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden my-2">
                        <div
                          className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.max(2, Math.min(100, shareOfPipeline))}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>สัดส่วนในไปป์ไลน์: {shareOfPipeline.toFixed(1)}%</span>
                        <span className="font-semibold text-gray-700">
                          มูลค่าถ่วงน้ำหนัก: <span className="font-mono font-bold text-gray-900">{formatCurrency(weightedVal)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>รวมยอดที่คาดว่าจะปิดได้ตามน้ำหนัก</span>
              <span className="text-sm font-black text-red-600 font-mono">{formatCurrency(executiveSummary.weightedForecast)}</span>
            </div>
          </div>

          {/* Section 3: Pipeline Waterfall (Movement) */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={18} className="text-red-600" />
                    3. การเปลี่ยนแปลงของไปป์ไลน์ (Pipeline Movement)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">วิเคราะห์กระแสดีลเข้า-ออก ยอดยกมา และผลลัพธ์ในงวด</p>
                </div>
                <div className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-xl">
                  ยอดสุทธิ: {formatSmart(pipelineMovement.currentAmount)}
                </div>
              </div>

              {/* Waterfall Recharts Bar Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={renderWaterfall} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#4B5563', fontWeight: 600 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => formatMB(val)}
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(value), '']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E5E7EB',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#111827'
                      }}
                    />
                    <Bar dataKey="transparent" stackId="a" fill="transparent" />
                    <Bar dataKey="ยอดคงเหลือ" stackId="a" fill="#374151" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="เพิ่มขึ้น" stackId="a" fill="#6B7280" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ลดลง" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Movement Summary Cards */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100 mt-2">
              <div className="bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase">ยอดยกมา</p>
                <p className="text-xs font-black text-gray-800 font-mono mt-0.5">{formatSmart(pipelineMovement.startAmount)}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase">+ ดีลใหม่</p>
                <p className="text-xs font-black text-gray-800 font-mono mt-0.5">+{formatSmart(pipelineMovement.newAdded)}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase">ชนะ (Won)</p>
                <p className="text-xs font-black text-gray-900 font-mono mt-0.5">{formatSmart(pipelineMovement.won)}</p>
              </div>
              <div className="bg-red-50/60 p-2.5 rounded-xl text-center border border-red-100">
                <p className="text-[10px] text-red-600 font-bold uppercase">หลุด/แพ้ (Lost)</p>
                <p className="text-xs font-black text-red-600 font-mono mt-0.5">-{formatSmart(pipelineMovement.lost)}</p>
              </div>
            </div>
          </div>

        </div>

        {/* ── 4. Stage-by-Stage Conversion Funnel ── */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Target size={18} className="text-red-600" />
                4. อัตราการเปลี่ยนสถานะแต่ละขั้นตอน (Stage-by-Stage Conversion Funnel)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ติดตามประสิทธิภาพการเปลี่ยนลูกค้าเป้าหมายตั้งแต่เริ่มต้นจนถึงการสั่งซื้อจริง
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
              <span>อัตราปิดการขายรวม:</span>
              <span className="font-mono text-red-600 font-black">
                {conversionRates.leads > 0
                  ? ((conversionRates.po / conversionRates.leads) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">

            {/* Stage 1: Leads */}
            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 flex flex-col justify-between relative group hover:border-gray-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ขั้นที่ 1</span>
                  <div className="p-1.5 rounded-lg bg-gray-200/60 text-gray-700">
                    <User size={15} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-800">รายชื่อลูกค้า (Leads)</h3>
                <div className="text-3xl font-black text-gray-900 font-mono mt-2">
                  {conversionRates.leads.toLocaleString()}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60 flex justify-between items-center text-xs text-gray-500">
                <span>ฐานลูกค้าตั้งต้น</span>
                <span className="font-bold text-gray-700">100%</span>
              </div>
            </div>

            {/* Stage 2: Telesales */}
            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 flex flex-col justify-between relative group hover:border-gray-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ขั้นที่ 2</span>
                  <div className="p-1.5 rounded-lg bg-gray-200/60 text-gray-700">
                    <Clock size={15} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-800">โทรติดต่อ (Telesales)</h3>
                <div className="text-3xl font-black text-gray-900 font-mono mt-2">
                  {conversionRates.telesales.toLocaleString()}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60 flex justify-between items-center text-xs text-gray-500">
                <span>เปลี่ยนจาก Leads</span>
                <span className="font-bold text-gray-900 font-mono">
                  {conversionRates.leads > 0
                    ? ((conversionRates.telesales / conversionRates.leads) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>

            {/* Stage 3: Quotations */}
            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 flex flex-col justify-between relative group hover:border-gray-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ขั้นที่ 3</span>
                  <div className="p-1.5 rounded-lg bg-gray-200/60 text-gray-700">
                    <FileText size={15} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-800">ใบเสนอราคา (Quotes)</h3>
                <div className="text-3xl font-black text-gray-900 font-mono mt-2">
                  {conversionRates.quotes.toLocaleString()}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60 flex justify-between items-center text-xs text-gray-500">
                <span>เปลี่ยนจากโทร</span>
                <span className="font-bold text-gray-900 font-mono">
                  {conversionRates.telesales > 0
                    ? ((conversionRates.quotes / conversionRates.telesales) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>

            {/* Stage 4: PO / Won (Highlighted in Red Theme) */}
            <div className="bg-red-50/60 rounded-2xl p-5 border border-red-200 flex flex-col justify-between relative group hover:border-red-300 shadow-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">ขั้นที่ 4 (ชนะ)</span>
                  <div className="p-1.5 rounded-lg bg-red-600 text-white">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-red-950">สั่งซื้อ/ชนะ (PO / Won)</h3>
                <div className="text-3xl font-black text-red-600 font-mono mt-2">
                  {conversionRates.po.toLocaleString()}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-red-200 flex justify-between items-center text-xs text-red-700">
                <span>เปลี่ยนจากใบเสนอราคา</span>
                <span className="font-black text-red-700 font-mono">
                  {conversionRates.quotes > 0
                    ? ((conversionRates.po / conversionRates.quotes) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── 5. Pipeline Health & Actionable Risks ── */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-600" />
                5. สุขภาพไปป์ไลน์และจุดเสี่ยง (Health & Risk Intelligence)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ติดตามดีลที่ไม่มีความเคลื่อนไหวเกิน 30 วัน และรายชื่อลูกค้าเป้าหมายที่ยังไม่ได้รับมอบหมายพนักงานดูแล
              </p>
            </div>

            {/* Velocity Card Highlight */}
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-2xl shrink-0">
              <div className="p-2 rounded-xl bg-gray-900 text-white">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">ความเร็วการปิดดีล (Velocity)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-gray-900 font-mono">{pipelineHealth.velocityDays}</span>
                  <span className="text-xs text-gray-600 font-bold">วันเฉลี่ย</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Controls & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setRiskTab('stalled')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${riskTab === 'stalled'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <span>ดีลค้างเกิน 30 วัน</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskTab === 'stalled' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'
                  }`}>
                  {pipelineHealth.stalledDealsCount}
                </span>
              </button>

              <button
                onClick={() => setRiskTab('unassigned')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${riskTab === 'unassigned'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <span>ลูกค้ายังไม่มีผู้ดูแล</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskTab === 'unassigned' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'
                  }`}>
                  {pipelineHealth.unassignedLeadsCount}
                </span>
              </button>
            </div>

            {/* Search Input & Sorter */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={riskTab === 'stalled' ? 'ค้นหาดีล, บริษัท, พนักงาน...' : 'ค้นหาลูกค้า, จังหวัด...'}
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800"
                />
              </div>

              {riskTab === 'stalled' && (
                <div className="relative shrink-0">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                  >
                    <option value="days">เรียงตาม: นิ่งนานสุด</option>
                    <option value="amount">เรียงตาม: มูลค่าสูงสุด</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

          </div>

          {/* Tab 1: Stalled Deals Content */}
          {riskTab === 'stalled' && (
            <div>
              {filteredStalledDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 pl-2">เลขที่ใบเสนอราคา / บริษัท</th>
                        <th className="pb-3">ผู้ดูแล</th>
                        <th className="pb-3">สถานะปัจจุบัน</th>
                        <th className="pb-3 text-center">ระยะเวลาค้าง</th>
                        <th className="pb-3 text-right pr-2">มูลค่าดีล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStalledDeals.map((deal: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 pl-2">
                            <div className="font-bold text-gray-900 text-sm">{deal.company}</div>
                            <div className="text-gray-400 text-[11px] font-mono mt-0.5">
                              {deal.quotationNumber || 'ไม่ระบุเลขที่'}
                            </div>
                          </td>
                          <td className="py-3.5 text-gray-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <User size={13} className="text-gray-400" />
                              <span>{deal.salesperson}</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px] border border-gray-200">
                              {deal.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-bold text-[11px] border border-red-200/80">
                              <Clock size={12} />
                              นิ่งมา {deal.daysStalled} วัน
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-2">
                            <span className="font-black text-gray-900 font-mono text-sm">
                              {formatCurrency(deal.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle2 size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-600">ไม่มีดีลค้างนานเกิน 30 วันที่ตรงกับเงื่อนไข</p>
                  <p className="text-xs text-gray-400 mt-1">การเคลื่อนไหวของดีลอยู่ในเกณฑ์ปกติ</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Unassigned Leads Content */}
          {riskTab === 'unassigned' && (
            <div>
              {filteredUnassignedLeads.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredUnassignedLeads.map((lead: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 hover:border-red-300 hover:bg-white transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200/70 text-gray-700">
                            {lead.customerType}
                          </span>
                          <span className="text-[11px] font-bold text-red-600">
                            {lead.daysSinceCreated === 0 ? 'สร้างวันนี้' : `${lead.daysSinceCreated} วันที่แล้ว`}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{lead.company}</h4>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{lead.province}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center justify-between text-xs">
                        <span className="text-gray-400">รอการมอบหมาย</span>
                        <span className="font-bold text-red-600 flex items-center gap-0.5">
                          จัดสรรพนักงาน <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Building2 size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-600">ไม่มีรายชื่อลูกค้าที่รอการมอบหมาย</p>
                  <p className="text-xs text-gray-400 mt-1">ลูกค้าทั้งหมดในระบบมีผู้ดูแลรับผิดชอบแล้ว</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
