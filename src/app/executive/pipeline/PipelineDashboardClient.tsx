'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Target,
  Award,
  Search,
  Layers,
  CheckCircle2,
  Calendar,
  Flame,
  FileText,
  User,
  MapPin,
  Building2,
  ShieldAlert,
  Sparkles,
  Maximize2,
  Monitor,
  Briefcase,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Star,
  Activity,
  BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import ExecutiveLiveSync from '../components/ExecutiveLiveSync';

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
  return (val / 1000000).toFixed(1) + 'M';
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

interface PipelineDashboardClientProps {
  data: {
    month: number;
    year: number;
    quarter?: number;
    filterPeriod?: string;
    periodComparison?: {
      label: string;
      prevClosedSales: number;
      growthPercent: number | null;
    };
    executiveSummary?: {
      target: number;
      closedSales: number;
      gapToTarget: number;
      totalPipeline: number;
      coverageRatio: number;
      weightedForecast: number;
    };
    weightedForecast?: {
      categories: Array<{
        name: string;
        probability: number;
        amount: number;
        dealCount: number;
      }>;
    };
    breakdowns?: {
      branches: Array<{
        branch: string;
        amount: number;
        dealCount: number;
        sharePercent: number;
      }>;
      productMix: Array<{
        category: string;
        amount: number;
        dealCount: number;
        sharePercent: number;
      }>;
    };
    strategicDeals?: Array<{
      id: string;
      quotationNumber: string;
      company: string;
      province: string;
      salesperson: string;
      branch: string;
      productType: string;
      status: string;
      amount: number;
      daysInPipeline: number;
      daysStalled: number;
    }>;
    momentumTrendline?: Array<{
      month: string;
      closedSales: number;
      pipelineAdded: number;
    }>;
    executiveAlerts?: {
      coverage: {
        ratio: number;
        benchmark: number;
        isRisk: boolean;
        severity: string;
        title: string;
        message: string;
      };
      unassignedLeakage: {
        count: number;
        isCritical: boolean;
        title: string;
        message: string;
      };
    };
    pipelineHealth?: {
      velocityDays: number;
      stalledDealsCount: number;
      stalledDealsList: any[];
      unassignedLeadsCount: number;
      unassignedLeadsList: any[];
    };
    conversionRates?: {
      leads: number;
      telesales: number;
      quotes: number;
      po: number;
    };
    pipelineMovement?: {
      startAmount: number;
      newAdded: number;
      won: number;
      lost: number;
      currentAmount: number;
    };
  };
}

export default function PipelineDashboardClient({ data }: PipelineDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Mode: default to 'cockpit' (no-scroll single-viewport) per executive brief
  const [viewMode, setViewMode] = useState<'cockpit' | 'expanded'>('cockpit');

  // Sub-tabs for Left Top card: 'prob' (Probability) | 'branch' (Branch Leaderboard) | 'product' (Product Mix)
  const [leftTopTab, setLeftTopTab] = useState<'prob' | 'branch' | 'product'>('prob');

  // Sub-tabs for Left Bottom card: 'waterfall' | 'trend'
  const [leftBottomTab, setLeftBottomTab] = useState<'waterfall' | 'trend'>('waterfall');

  // Active tab in bottom right card: 'topDeals' (Default) | 'stalled' | 'unassigned'
  const [riskTab, setRiskTab] = useState<'topDeals' | 'stalled' | 'unassigned'>('topDeals');
  const [dealSearch, setDealSearch] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'days'>('amount');

  const {
    month,
    year,
    quarter = Math.floor(((data.month || 1) - 1) / 3) + 1,
    periodComparison = { label: 'ช่วงก่อน', prevClosedSales: 0, growthPercent: null },
    executiveSummary = {
      target: 0,
      closedSales: 0,
      gapToTarget: 0,
      totalPipeline: 0,
      coverageRatio: 0,
      weightedForecast: 0
    },
    weightedForecast = { categories: [] },
    breakdowns = { branches: [], productMix: [] },
    strategicDeals = [],
    momentumTrendline = [],
    executiveAlerts = {
      coverage: {
        ratio: 0,
        benchmark: 3.0,
        isRisk: false,
        severity: 'healthy',
        title: '',
        message: ''
      },
      unassignedLeakage: {
        count: 0,
        isCritical: false,
        title: '',
        message: ''
      }
    },
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

  const filterPeriod = searchParams.get('period') || data.filterPeriod || 'รายเดือน';

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      if (key === 'period' && value === 'รายไตรมาส') {
        params.set('quarter', quarter.toString());
        params.set('month', ((quarter - 1) * 3 + 1).toString());
      }
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

  const handleQuarterStep = (direction: 'prev' | 'next') => {
    let newQ = quarter + (direction === 'next' ? 1 : -1);
    let newYear = year;

    if (newQ > 4) {
      newQ = 1;
      newYear += 1;
    } else if (newQ < 1) {
      newQ = 4;
      newYear -= 1;
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('quarter', newQ.toString());
      params.set('month', ((newQ - 1) * 3 + 1).toString());
      params.set('year', newYear.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Recharts Waterfall Data
  const renderWaterfall = [
    { name: 'ยอดยกมา', transparent: 0, ยอดคงเหลือ: pipelineMovement.startAmount, เพิ่มขึ้น: 0, ลดลง: 0 },
    { name: 'ดีลใหม่', transparent: pipelineMovement.startAmount, ยอดคงเหลือ: 0, เพิ่มขึ้น: pipelineMovement.newAdded, ลดลง: 0 },
    { name: 'ชนะ (Won)', transparent: Math.max(0, pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won), ยอดคงเหลือ: 0, เพิ่มขึ้น: 0, ลดลง: pipelineMovement.won },
    { name: 'แพ้ (Lost)', transparent: Math.max(0, pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won - pipelineMovement.lost), ยอดคงเหลือ: 0, เพิ่มขึ้น: 0, ลดลง: pipelineMovement.lost },
    { name: 'ยอดปัจจุบัน', transparent: 0, ยอดคงเหลือ: pipelineMovement.currentAmount, เพิ่มขึ้น: 0, ลดลง: 0 }
  ];

  // Filtered Strategic Top Deals
  const filteredTopDeals = useMemo(() => {
    let list = [...(strategicDeals || [])];
    if (dealSearch.trim()) {
      const q = dealSearch.toLowerCase();
      list = list.filter((d: any) =>
        d.company?.toLowerCase().includes(q) ||
        d.salesperson?.toLowerCase().includes(q) ||
        d.quotationNumber?.toLowerCase().includes(q) ||
        d.branch?.toLowerCase().includes(q) ||
        d.productType?.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      if (sortBy === 'days') return b.daysInPipeline - a.daysInPipeline;
      return b.amount - a.amount;
    });
    return list;
  }, [strategicDeals, dealSearch, sortBy]);

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
      if (sortBy === 'days') return b.daysStalled - a.daysStalled;
      return b.amount - a.amount;
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
  const overallConversionRate = conversionRates.leads > 0
    ? ((conversionRates.po / conversionRates.leads) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={`flex-1 h-screen flex flex-col ${viewMode === 'cockpit' ? 'overflow-hidden' : 'overflow-y-auto'} bg-slate-50 font-ibm-thai relative select-none`}>

      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-xs flex items-center justify-center transition-opacity">
          <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-100">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent"></div>
            <span className="font-semibold text-slate-800 text-xs">กำลังประมวลผลข้อมูลไปป์ไลน์...</span>
          </div>
        </div>
      )}

      {/* ── Compact Executive Top Header Bar ── */}
      <header className="h-13 px-4 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              Executive
            </span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Layers size={16} className="text-red-600" />
              Pipeline & Forecast Cockpit
            </h1>
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
            <span className="text-slate-400 font-medium">Coverage สู่เป้า:</span>
            <span className={`font-bold font-mono text-sm ${executiveSummary.coverageRatio < 2 ? 'text-red-600' : 'text-slate-900'}`}>
              {executiveSummary.coverageRatio.toFixed(1)}x
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              executiveSummary.coverageRatio >= 3
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : executiveSummary.coverageRatio >= 2
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-700 border border-red-200 font-black animate-pulse'
            }`}>
              {executiveSummary.coverageRatio >= 3 ? 'ปลอดภัย (≥3.0x)' : executiveSummary.coverageRatio >= 2 ? 'เฝ้าระวัง' : 'เสี่ยงสูง (<2.0x)'}
            </span>
          </div>
        </div>

        {/* Filters & Control Area */}
        <div className="flex items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            {['รายเดือน', 'รายไตรมาส', 'รายปี'].map((p) => (
              <button
                key={p}
                onClick={() => handleFilterChange('period', p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filterPeriod === p
                    ? 'bg-red-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Stepper Navigation */}
          {filterPeriod === 'รายเดือน' && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1 py-0.5 shadow-xs">
              <button
                onClick={() => handleMonthStep('prev')}
                className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs font-bold text-slate-800 min-w-[76px] text-center">
                {THAI_MONTHS[month - 1]}
              </span>
              <button
                onClick={() => handleMonthStep('next')}
                className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {filterPeriod === 'รายไตรมาส' && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1 py-0.5 shadow-xs">
              <button
                onClick={() => handleQuarterStep('prev')}
                className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="ไตรมาสก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs font-bold text-slate-800 min-w-[70px] text-center">
                ไตรมาส {quarter}
              </span>
              <button
                onClick={() => handleQuarterStep('next')}
                className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="ไตรมาสถัดไป"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Year Select */}
          <select
            value={year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500 shadow-xs cursor-pointer"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                ปี {y + 543}
              </option>
            ))}
          </select>

          {/* Real-time Live Sync Controller */}
          <ExecutiveLiveSync />

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 ml-1">
            <button
              onClick={() => setViewMode('cockpit')}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === 'cockpit'
                  ? 'bg-white text-red-600 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="โหมดหน้าจอเดียว (Cockpit Zero-Scroll)"
            >
              <Monitor size={14} />
              <span className="hidden lg:inline text-[11px]">Cockpit</span>
            </button>
            <button
              onClick={() => setViewMode('expanded')}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === 'expanded'
                  ? 'bg-white text-red-600 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="โหมดขยายเต็มรูปแบบ (Expanded Report)"
            >
              <Maximize2 size={14} />
              <span className="hidden lg:inline text-[11px]">ขยายเต็ม</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Symmetrical 6-Card Executive Metric Strip ── */}
      <div className="px-4 pt-2.5 pb-1 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">

          {/* Tile 1: Target with Attainment */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {filterPeriod === 'รายไตรมาส' ? `เป้า Q${quarter}` : filterPeriod === 'รายปี' ? 'เป้าทั้งปี' : 'เป้าหมายยอด'}
              </span>
              <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <Target size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight" title={formatCurrency(executiveSummary.target)}>
                {formatSmart(executiveSummary.target)}
              </span>
              <span className="text-[10px] font-bold font-mono text-slate-700">
                {targetAttainment.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-red-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(targetAttainment, 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 2: Closed Won Sales with YoY / QoQ Indicator */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {filterPeriod === 'รายไตรมาส' ? `ปิดแล้ว (Q${quarter})` : filterPeriod === 'รายปี' ? 'ปิดแล้ว (ทั้งปี)' : 'ยอดปิดแล้ว (Won)'}
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                <Award size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight" title={formatCurrency(executiveSummary.closedSales)}>
                {formatSmart(executiveSummary.closedSales)}
              </span>

              {periodComparison?.growthPercent !== null && periodComparison?.growthPercent !== undefined ? (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                  periodComparison.growthPercent >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {periodComparison.growthPercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {periodComparison.growthPercent >= 0 ? '+' : ''}{periodComparison.growthPercent.toFixed(1)}% vs {periodComparison.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                  <CheckCircle2 size={10} />
                  สำเร็จ
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">เปิดบิลแล้ว / ใบสั่งซื้อ (PO)</span>
          </div>

          {/* Tile 3: Gap to Target */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ส่วนต่างสู่เป้า</span>
              <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <TrendingUp size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className={`text-lg lg:text-xl font-bold font-mono tracking-tight ${
                executiveSummary.gapToTarget > 0 ? 'text-red-600' : 'text-slate-900'
              }`} title={formatCurrency(executiveSummary.gapToTarget)}>
                {formatSmart(executiveSummary.gapToTarget)}
              </span>
              <span className={`text-[10px] font-bold ${executiveSummary.gapToTarget > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                {executiveSummary.gapToTarget > 0 ? 'ยังขาด' : 'ครบแล้ว'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">เป้าหมาย - ยอดปิด</span>
          </div>

          {/* Tile 4: Active Pipeline with 6-Month Indicator */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ไปป์ไลน์รอผล</span>
              <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <Layers size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight" title={formatCurrency(executiveSummary.totalPipeline)}>
                {formatSmart(executiveSummary.totalPipeline)}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
                <Activity size={10} className="text-slate-500" />
                Active
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">มูลค่ารวมดีลที่เจรจาอยู่</span>
          </div>

          {/* Tile 5: Weighted Forecast */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">คาดการณ์ถ่วงน้ำหนัก</span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                <Sparkles size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight" title={formatCurrency(executiveSummary.weightedForecast)}>
                {formatSmart(executiveSummary.weightedForecast)}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">ถ่วงน้ำหนัก</span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">
              รวมปิดแล้ว: {formatSmart(totalForecastedAndClosed)}
            </span>
          </div>

          {/* Tile 6: Pipeline Coverage Ratio with Benchmark Pill */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">สัดส่วนครอบคลุม</span>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                executiveSummary.coverageRatio >= 2 ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-600'
              }`}>
                <ShieldAlert size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className={`text-lg lg:text-xl font-bold font-mono tracking-tight ${
                executiveSummary.coverageRatio < 2 ? 'text-red-600' : 'text-slate-900'
              }`}>
                {executiveSummary.coverageRatio.toFixed(1)}x
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                executiveSummary.coverageRatio >= 3
                  ? 'bg-slate-100 text-slate-700'
                  : executiveSummary.coverageRatio >= 2
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-red-50 text-red-700 font-black'
              }`}>
                {executiveSummary.coverageRatio >= 3 ? 'ปลอดภัย' : executiveSummary.coverageRatio >= 2 ? 'เฝ้าระวัง' : 'เสี่ยง'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">
              เกณฑ์ปลอดภัย: ≥ 3.0x
            </span>
          </div>

        </div>
      </div>

      {/* ── COCKPIT MODE: Symmetrical 50 / 50 Dual Column Grid (Zero-Scroll on Desktop) ── */}
      {viewMode === 'cockpit' ? (
        <main className="flex-1 min-h-0 px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">

          {/* ════════ LEFT COLUMN (6 Cols = 50% Symmetry): Forecast Dimensions & Movement/Momentum ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">

            {/* Left Top Card: Multi-Tab Dimension Cockpit (Forecast Categories, Branch Leaderboard, Product Mix) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[48%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setLeftTopTab('prob')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftTopTab === 'prob'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={11} />
                    <span>โอกาสสำเร็จ</span>
                  </button>

                  <button
                    onClick={() => setLeftTopTab('branch')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftTopTab === 'branch'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 size={11} />
                    <span>สาขา / ทีม</span>
                  </button>

                  <button
                    onClick={() => setLeftTopTab('product')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftTopTab === 'product'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Package size={11} />
                    <span>หมวดสินค้า</span>
                  </button>
                </div>

                <div className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                  รวมไปป์ไลน์: <span className="font-mono">{formatSmart(executiveSummary.totalPipeline)}</span>
                </div>
              </div>

              {/* Tab 1: Probability Forecast Categories */}
              {leftTopTab === 'prob' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {weightedForecast.categories.map((cat: any, idx: number) => {
                    const prob = cat.probability;
                    const weightedVal = cat.amount * (prob / 100);
                    const shareOfPipeline = executiveSummary.totalPipeline > 0
                      ? (cat.amount / executiveSummary.totalPipeline) * 100
                      : 0;

                    const badgeStyle = prob === 100
                      ? 'bg-red-600 text-white'
                      : prob === 80
                        ? 'bg-slate-800 text-white'
                        : prob === 60
                          ? 'bg-slate-700 text-white'
                          : prob === 30
                            ? 'bg-slate-500 text-white'
                            : 'bg-slate-200 text-slate-800';

                    const barColor = prob === 100
                      ? 'bg-red-600'
                      : prob === 80
                        ? 'bg-slate-800'
                        : prob === 60
                          ? 'bg-slate-700'
                          : prob === 30
                            ? 'bg-slate-400'
                            : 'bg-slate-300';

                    return (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono shrink-0 ${badgeStyle}`}>
                              {prob}%
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">({cat.dealCount} ดีล)</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-bold text-slate-900 font-mono">{formatCurrency(cat.amount)}</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className={`h-1.5 rounded-full ${barColor} transition-all duration-300`}
                            style={{ width: `${Math.max(2, Math.min(100, shareOfPipeline))}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>สัดส่วน: {shareOfPipeline.toFixed(1)}%</span>
                          <span>
                            ถ่วงน้ำหนัก: <span className="font-mono font-bold text-slate-900">{formatSmart(weightedVal)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Branch Leaderboard */}
              {leftTopTab === 'branch' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {breakdowns.branches && breakdowns.branches.length > 0 ? (
                    breakdowns.branches.map((b, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center font-mono shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">{b.branch}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">({b.dealCount} ดีล)</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-bold text-slate-900 font-mono">{formatCurrency(b.amount)}</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className="h-1.5 rounded-full bg-red-600 transition-all duration-300"
                            style={{ width: `${Math.max(2, Math.min(100, b.sharePercent))}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>สัดส่วนไปป์ไลน์: <span className="font-bold text-slate-800">{b.sharePercent.toFixed(1)}%</span></span>
                          <span>เฉลี่ย/ดีล: <span className="font-mono font-bold text-slate-900">{formatSmart(b.dealCount > 0 ? b.amount / b.dealCount : 0)}</span></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่มีข้อมูลสาขา
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Product Mix */}
              {leftTopTab === 'product' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {breakdowns.productMix && breakdowns.productMix.length > 0 ? (
                    breakdowns.productMix.map((p, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Package size={13} className="text-red-600 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-800 truncate">{p.category}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">({p.dealCount} ดีล)</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-bold text-slate-900 font-mono">{formatCurrency(p.amount)}</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className="h-1.5 rounded-full bg-slate-800 transition-all duration-300"
                            style={{ width: `${Math.max(2, Math.min(100, p.sharePercent))}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>สัดส่วน: <span className="font-bold text-slate-800">{p.sharePercent.toFixed(1)}%</span></span>
                          <span>เฉลี่ย/ดีล: <span className="font-mono font-bold text-slate-900">{formatSmart(p.dealCount > 0 ? p.amount / p.dealCount : 0)}</span></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่มีข้อมูลสินค้า
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Left Bottom Card: Movement & Momentum (Waterfall or 6-Month Momentum Trendline) */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setLeftBottomTab('waterfall')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftBottomTab === 'waterfall'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp size={11} />
                    <span>Pipeline Waterfall</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab('trend')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftBottomTab === 'trend'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 size={11} />
                    <span>แนวโน้ม 6 เดือน</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                  {leftBottomTab === 'waterfall' ? (
                    <>ยอดปัจจุบัน: <span className="font-mono">{formatSmart(pipelineMovement.currentAmount)}</span></>
                  ) : (
                    <>ประวัติย้อนหลัง 6 เดือน</>
                  )}
                </div>
              </div>

              {/* View 1: Pipeline Movement Waterfall */}
              {leftBottomTab === 'waterfall' ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={renderWaterfall} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => formatMB(val)}
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          formatter={(value: any) => [formatCurrency(value), '']}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#0F172A',
                            fontFamily: 'inherit'
                          }}
                        />
                        <Bar dataKey="transparent" stackId="a" fill="transparent" />
                        <Bar dataKey="ยอดคงเหลือ" stackId="a" fill="#334155" radius={[4, 4, 0, 0]} barSize={22} />
                        <Bar dataKey="เพิ่มขึ้น" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} barSize={22} />
                        <Bar dataKey="ลดลง" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Waterfall Summary Pills */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-slate-100 shrink-0 mt-1">
                    <div className="bg-slate-50 p-1 rounded-lg text-center border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-medium block">ยอดยกมา</span>
                      <span className="text-[10px] font-bold text-slate-800 font-mono">{formatSmart(pipelineMovement.startAmount)}</span>
                    </div>
                    <div className="bg-slate-50 p-1 rounded-lg text-center border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-medium block">+ ดีลใหม่</span>
                      <span className="text-[10px] font-bold text-slate-800 font-mono">+{formatSmart(pipelineMovement.newAdded)}</span>
                    </div>
                    <div className="bg-slate-50 p-1 rounded-lg text-center border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-medium block">ชนะ (Won)</span>
                      <span className="text-[10px] font-bold text-slate-900 font-mono">{formatSmart(pipelineMovement.won)}</span>
                    </div>
                    <div className="bg-red-50/70 p-1 rounded-lg text-center border border-red-100">
                      <span className="text-[9px] text-red-600 font-medium block">- แพ้ (Lost)</span>
                      <span className="text-[10px] font-bold text-red-600 font-mono">-{formatSmart(pipelineMovement.lost)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* View 2: 6-Month Momentum Trendline */
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={momentumTrendline} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorPipe" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#334155" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#334155" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => formatMB(val)}
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          formatter={(value: any, name: any) => [
                            formatCurrency(value),
                            name === 'closedSales' ? 'ยอดขายปิดได้' : 'ดีลสร้างใหม่'
                          ]}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#0F172A',
                            fontFamily: 'inherit'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pipelineAdded"
                          name="pipelineAdded"
                          stroke="#334155"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPipe)"
                        />
                        <Area
                          type="monotone"
                          dataKey="closedSales"
                          name="closedSales"
                          stroke="#DC2626"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorClosed)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend & Stats */}
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 shrink-0 mt-1 text-[10px]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                        <span className="font-semibold text-slate-700">ยอดขายปิดได้ (Closed Won)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                        <span className="font-semibold text-slate-700">ดีลเข้าใหม่ (New Pipeline)</span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono">
                      ข้อมูลเปรียบเทียบย้อนหลัง 6 เดือน
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ════════ RIGHT COLUMN (6 Cols = 50% Symmetry): Conversion Funnel, Alerts & Strategic Deals ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">

            {/* Right Top Card: Conversion Funnel + Executive Action Alerts */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[48%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Target size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    อัตราการเปลี่ยนสถานะ (Stage-by-Stage Funnel)
                  </h2>
                </div>
                <div className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                  อัตราปิดรวม: <span className="font-mono">{overallConversionRate}%</span>
                </div>
              </div>

              {/* 4 Stages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 items-center">

                {/* Stage 1: Leads */}
                <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-200/80 flex flex-col justify-between h-full hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ขั้นที่ 1</span>
                      <User size={12} className="text-slate-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block truncate">ลูกค้า (Leads)</span>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {conversionRates.leads.toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-500">
                    <span>ตั้งต้น</span>
                    <span className="font-bold text-slate-700">100%</span>
                  </div>
                </div>

                {/* Stage 2: Telesales */}
                <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-200/80 flex flex-col justify-between h-full hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ขั้นที่ 2</span>
                      <Clock size={12} className="text-slate-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block truncate">โทรติดต่อ</span>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {conversionRates.telesales.toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-500">
                    <span>จาก Leads</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {conversionRates.leads > 0
                        ? ((conversionRates.telesales / conversionRates.leads) * 100).toFixed(0)
                        : '0'}%
                    </span>
                  </div>
                </div>

                {/* Stage 3: Quotations */}
                <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-200/80 flex flex-col justify-between h-full hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ขั้นที่ 3</span>
                      <FileText size={12} className="text-slate-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block truncate">เสนอราคา</span>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {conversionRates.quotes.toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-500">
                    <span>จากโทร</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {conversionRates.telesales > 0
                        ? ((conversionRates.quotes / conversionRates.telesales) * 100).toFixed(0)
                        : '0'}%
                    </span>
                  </div>
                </div>

                {/* Stage 4: PO / Won */}
                <div className="bg-red-50/60 rounded-xl p-2 border border-red-200 flex flex-col justify-between h-full hover:border-red-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">ขั้นที่ 4</span>
                      <CheckCircle2 size={12} className="text-red-600" />
                    </div>
                    <span className="text-xs font-bold text-red-950 block truncate">ชนะ (PO/Won)</span>
                    <div className="text-lg font-black text-red-600 font-mono mt-0.5">
                      {conversionRates.po.toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-red-200 flex justify-between items-center text-[10px] text-red-700">
                    <span>จากเสนอราคา</span>
                    <span className="font-bold text-red-700 font-mono">
                      {conversionRates.quotes > 0
                        ? ((conversionRates.po / conversionRates.quotes) * 100).toFixed(0)
                        : '0'}%
                    </span>
                  </div>
                </div>

              </div>

              {/* ⚠️ Executive Action Callout Banners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 shrink-0">
                {/* Alert 1: Coverage Risk */}
                <div className={`p-1.5 rounded-xl border flex items-center gap-2 ${
                  executiveSummary.coverageRatio < 2.0
                    ? 'bg-red-50/80 border-red-200 text-red-900'
                    : executiveSummary.coverageRatio < 3.0
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}>
                  <AlertTriangle size={14} className={executiveSummary.coverageRatio < 2.0 ? 'text-red-600 shrink-0' : 'text-amber-600 shrink-0'} />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold block leading-tight truncate">
                      Coverage {executiveSummary.coverageRatio.toFixed(1)}x (เกณฑ์ 3.0x)
                    </span>
                    <span className="text-[9px] opacity-80 block truncate">
                      {executiveSummary.coverageRatio < 3.0 ? 'แนะฝ่ายการตลาดเร่งสร้าง Lead ใหม่' : 'ไปป์ไลน์อยู่ในเกณฑ์ปลอดภัย'}
                    </span>
                  </div>
                </div>

                {/* Alert 2: Lead Routing Leakage */}
                <div className="p-1.5 rounded-xl border border-red-200 bg-red-50/80 text-red-900 flex items-center gap-2">
                  <Flame size={14} className="text-red-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold block leading-tight truncate">
                      รั่วไหล: {pipelineHealth.unassignedLeadsCount.toLocaleString()} ลูกค้าไร้ผู้ดูแล
                    </span>
                    <span className="text-[9px] opacity-80 block truncate">
                      ต้องตรวจสอบการจัดสรร Lead ทันที
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Bottom Card: Strategic Key Deals & Risk Intelligence */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setRiskTab('topDeals')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      riskTab === 'topDeals'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Star size={11} className="fill-current" />
                    <span>Top 10 ดีลยุทธศาสตร์</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      riskTab === 'topDeals' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {strategicDeals.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setRiskTab('stalled')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      riskTab === 'stalled'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>ดีลค้าง &gt;30 วัน</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      riskTab === 'stalled' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {pipelineHealth.stalledDealsCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setRiskTab('unassigned')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      riskTab === 'unassigned'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>ไม่มอบหมาย</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      riskTab === 'unassigned' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {pipelineHealth.unassignedLeadsCount}
                    </span>
                  </button>
                </div>

                {/* Velocity Badge + Search */}
                <div className="flex items-center gap-1.5">
                  <div className="relative w-28 sm:w-32">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหา..."
                      value={dealSearch}
                      onChange={(e) => setDealSearch(e.target.value)}
                      className="w-full pl-6 pr-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    onClick={() => setSortBy(sortBy === 'days' ? 'amount' : 'days')}
                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold flex items-center gap-0.5"
                    title={sortBy === 'days' ? 'เรียงตามอายุ' : 'เรียงตามมูลค่า'}
                  >
                    <span>{sortBy === 'days' ? 'วัน' : '฿'}</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Top Strategic Big Rock Deals */}
              {riskTab === 'topDeals' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredTopDeals.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่พบดีลยุทธศาสตร์
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-1 px-2">ดีล / บริษัท</th>
                          <th className="py-1 px-2">สินค้า / สาขา</th>
                          <th className="py-1 px-2">ผู้ดูแล</th>
                          <th className="py-1 px-2 text-right">มูลค่า (฿)</th>
                          <th className="py-1 px-2 text-center">อายุดีล</th>
                          <th className="py-1 px-2 text-right">บทบาทผู้บริหาร</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[10px]">
                        {filteredTopDeals.map((deal: any) => (
                          <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-1.5 px-2">
                              <div className="font-bold text-slate-900 truncate max-w-[140px]" title={deal.company}>
                                {deal.company}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">{deal.quotationNumber}</div>
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="font-medium text-slate-700 block truncate max-w-[100px]">{deal.productType}</span>
                              <span className="text-[9px] text-slate-400 block">{deal.branch}</span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 truncate max-w-[80px]">
                              {deal.salesperson}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(deal.amount)}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-500">
                              {deal.daysInPipeline} วัน
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold">
                                <Briefcase size={9} />
                                Sponsor
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Stalled Deals */}
              {riskTab === 'stalled' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredStalledDeals.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่พบดีลที่ค้างนานเกิน 30 วัน
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-1 px-2.5">เลขที่ / บริษัท</th>
                          <th className="py-1 px-2">ผู้ดูแล</th>
                          <th className="py-1 px-2">สถานะ</th>
                          <th className="py-1 px-2 text-right">มูลค่า (฿)</th>
                          <th className="py-1 px-2.5 text-right">ค้าง (วัน)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[10px]">
                        {filteredStalledDeals.map((deal: any) => (
                          <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-1.5 px-2.5">
                              <div className="font-bold text-slate-900 truncate max-w-[130px]" title={deal.company}>
                                {deal.company}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">{deal.quotationNumber}</div>
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 truncate max-w-[90px]">
                              {deal.salesperson}
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-slate-100 text-slate-700">
                                {deal.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(deal.amount)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-red-600">
                              {deal.daysStalled} วัน
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Unassigned Leads */}
              {riskTab === 'unassigned' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredUnassignedLeads.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่พบลูกค้าที่ยังไม่มอบหมาย
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-1 px-2.5">ชื่อบริษัท / ลูกค้า</th>
                          <th className="py-1 px-2">จังหวัด</th>
                          <th className="py-1 px-2">ประเภท</th>
                          <th className="py-1 px-2.5 text-right">สร้างเมื่อ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[10px]">
                        {filteredUnassignedLeads.map((lead: any) => (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-1.5 px-2.5">
                              <div className="font-bold text-slate-900 truncate max-w-[180px]" title={lead.company}>
                                {lead.company}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-slate-600">
                              <span className="flex items-center gap-0.5">
                                <MapPin size={10} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[70px]">{lead.province}</span>
                              </span>
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-slate-100 text-slate-700">
                                {lead.customerType}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-slate-500 font-mono text-[10px]">
                              {lead.daysSinceCreated} วันที่แล้ว
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>

          </div>

        </main>
      ) : (
        /* ── EXPANDED SCROLL VIEW (Traditional Detailed Layout) ── */
        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">

          {/* Section 1: 6-Month Momentum Trendline Full */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-red-600" />
                  แนวโน้มการเติบโต 6 เดือนย้อนหลัง (Business Momentum)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">เปรียบเทียบยอดขายปิดได้จริงกับดีลใหม่ที่เพิ่มเข้ามาในระบบ</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={momentumTrendline} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorClosedExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPipeExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#334155" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#334155" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatMB(val)} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(val: any) => [formatCurrency(val), '']} />
                  <Area type="monotone" dataKey="pipelineAdded" name="ดีลเข้าใหม่" stroke="#334155" strokeWidth={2} fillOpacity={1} fill="url(#colorPipeExp)" />
                  <Area type="monotone" dataKey="closedSales" name="ยอดขายปิดได้" stroke="#DC2626" strokeWidth={2} fillOpacity={1} fill="url(#colorClosedExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 2: Top Strategic Big Rock Deals Full */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Star size={18} className="text-red-600 fill-current" />
                  Top 10 ดีลยุทธศาสตร์สำคัญ (Big Rock Deals)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">ดีลขนาดใหญ่ที่ต้องการการสนับสนุนจากผู้บริหาร (Executive Sponsor) เพื่อเร่งปิดการขาย</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">บริษัท / ลูกค้า</th>
                    <th className="py-2.5 px-3">เลขที่ใบเสนอราคา</th>
                    <th className="py-2.5 px-3">สินค้า / สาขา</th>
                    <th className="py-2.5 px-3">ผู้ดูแล</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3 text-right">มูลค่า (฿)</th>
                    <th className="py-2.5 px-3 text-center">อายุดีล</th>
                    <th className="py-2.5 px-3 text-center">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {strategicDeals.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{d.company}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{d.quotationNumber}</td>
                      <td className="py-3 px-3">{d.productType} ({d.branch})</td>
                      <td className="py-3 px-3 text-slate-700">{d.salesperson}</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">{d.status}</span></td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(d.amount)}</td>
                      <td className="py-3 px-3 text-center font-mono">{d.daysInPipeline} วัน</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[10px]">
                          Executive Sponsor
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Waterfall Full */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-red-600" />
              การเปลี่ยนแปลงของไปป์ไลน์ (Pipeline Movement Waterfall)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={renderWaterfall} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatMB(val)} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(value: any) => [formatCurrency(value), '']} />
                  <Bar dataKey="transparent" stackId="a" fill="transparent" />
                  <Bar dataKey="ยอดคงเหลือ" stackId="a" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="เพิ่มขึ้น" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ลดลง" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
