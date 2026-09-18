'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  Award, 
  TrendingUp, 
  Users, 
  Sparkles, 
  Search, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3,
  Flame,
  Maximize2,
  Monitor,
  Building2,
  Coins,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import ExecutiveLiveSync from '../components/ExecutiveLiveSync';

// Smart currency formatter (e.g. 1.25M฿, 450k฿)
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

// Clean Thai title prefixes (นาย, นางสาว, นาง) to prevent awkward truncation
const cleanThaiName = (fullName: string) => {
  if (!fullName) return '';
  return fullName
    .replace(/^นาย\s*/, '')
    .replace(/^นางสาว\s*/, '')
    .replace(/^นาง\s*/, '')
    .trim();
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

interface KPIClientDashboardProps {
  data: {
    month: number;
    year: number;
    quarter?: number;
    companyFilter?: string;
    companyBreakdown?: Record<string, { count: number; wonCount: number; sales: number }>;
    currentMonthSales?: number;
    prevMonthSales?: number;
    targetSales?: number;
    pipelineAmount?: number;
    pipelineCount?: number;
    winRate?: number;
    prevWinRate?: number;
    funnel?: { lead: number; telesale: number; quotation: number; po: number; invoice: number };
    salesTeam?: any[];
    branches?: string[];
    staleDeals?: any[];
    topCustomers?: any[];
    wonCount?: number;
    avgDealSize?: number;
  };
}

export default function KPIClientDashboard({ data }: KPIClientDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Mode: default to 'cockpit' (no-scroll single-viewport)
  const [viewMode, setViewMode] = useState<'cockpit' | 'expanded'>('cockpit');
  
  // Right top panel view: 'salesVsTarget' or 'winRate'
  const [rightTopView, setRightTopView] = useState<'salesVsTarget' | 'winRate'>('salesVsTarget');
  
  // Left bottom sub-panel tab: default to 'branches'
  const [leftTab, setLeftTab] = useState<'branches' | 'companies' | 'topCustomers' | 'stale'>('branches');
  
  // Search & Sort for sales leaderboard
  const [repSearch, setRepSearch] = useState('');
  const [sortKey, setSortKey] = useState<'sales' | 'attainment' | 'winRate'>('sales');

  const {
    month,
    year,
    quarter = Math.floor(((data.month || 1) - 1) / 3) + 1,
    companyFilter = '',
    companyBreakdown = { TE: { count: 0, wonCount: 0, sales: 0 }, TG: { count: 0, wonCount: 0, sales: 0 }, TP: { count: 0, wonCount: 0, sales: 0 } },
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
    topCustomers = [],
    wonCount = 0,
    avgDealSize = 0
  } = data;

  const filterPeriod = searchParams.get('period') || 'รายเดือน';
  const filterScope = searchParams.get('branch') || 'ทีมทั้งหมด';
  const filterCompany = searchParams.get('company') || companyFilter || '';

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
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
      params.set('quarter', (Math.floor((newMonth - 1) / 3) + 1).toString());
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

  const handleYearStep = (direction: 'prev' | 'next') => {
    const newYear = year + (direction === 'next' ? 1 : -1);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('year', newYear.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // KPI Calculations
  const salesTrend = prevMonthSales > 0 ? ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100 : 0;
  const winRateTrend = winRate - prevWinRate;
  const targetAttainment = targetSales > 0 ? (currentMonthSales / targetSales) * 100 : 0;
  const quarterlyForecast = pipelineAmount * (winRate / 100);
  const overallConversion = funnel.lead > 0 ? ((funnel.invoice / funnel.lead) * 100).toFixed(1) : '0';
  const calculatedAvgDealSize = avgDealSize > 0 
    ? avgDealSize 
    : (wonCount > 0 ? Math.round(currentMonthSales / wonCount) : 0);

  // Filter and sort team members with accurate, real-world metrics
  const processedSalesTeam = useMemo(() => {
    return salesTeam.map((r: any) => {
      const cleaned = cleanThaiName(r.name);
      const firstName = cleaned.split(' ')[0] || cleaned;
      
      const hasTarget = (r.target || 0) > 0;
      const target = hasTarget ? r.target : 0;
      const attainment = hasTarget ? (r.sales / r.target) * 100 : null;
      const teamContribution = currentMonthSales > 0 ? (r.sales / currentMonthSales) * 100 : 0;

      // Status determination based on actual targets or sales contribution
      let statusText = 'รอเปิดดีล';
      let statusBadgeClass = 'bg-slate-100 text-slate-600 border border-slate-200';

      if (hasTarget) {
        if (attainment !== null && attainment >= 100) {
          statusText = 'เกินเป้า 🔥';
          statusBadgeClass = 'bg-red-50 text-red-700 border border-red-200 font-bold';
        } else if (attainment !== null && attainment >= 70) {
          statusText = 'ยอดเยี่ยม';
          statusBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold';
        } else if (r.sales > 0) {
          statusText = 'กำลังเร่ง';
          statusBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold';
        }
      } else {
        // When individual target is not configured in DB
        if (r.sales >= 1_000_000) {
          statusText = 'ยอดขายสูง 🔥';
          statusBadgeClass = 'bg-red-50 text-red-700 border border-red-200 font-bold';
        } else if (r.sales >= 300_000) {
          statusText = 'ผลงานดี';
          statusBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold';
        } else if (r.sales > 0) {
          statusText = 'มีผลงาน';
          statusBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold';
        }
      }

      return {
        ...r,
        cleanName: cleaned,
        firstName,
        hasTarget,
        target,
        attainment,
        teamContribution,
        statusText,
        statusBadgeClass
      };
    });
  }, [salesTeam, currentMonthSales]);

  const filteredSalesTeam = useMemo(() => {
    let list = [...processedSalesTeam];
    if (repSearch.trim()) {
      const s = repSearch.toLowerCase();
      list = list.filter((r: any) => 
        r.name?.toLowerCase().includes(s) ||
        r.cleanName?.toLowerCase().includes(s) ||
        r.branch?.toLowerCase().includes(s)
      );
    }

    list.sort((a: any, b: any) => {
      if (sortKey === 'attainment') {
        const attA = a.hasTarget ? a.attainment : a.teamContribution;
        const attB = b.hasTarget ? b.attainment : b.teamContribution;
        return (attB || 0) - (attA || 0) || b.sales - a.sales;
      }
      if (sortKey === 'winRate') {
        return b.winRate - a.winRate || b.sales - a.sales;
      }
      return b.sales - a.sales || b.winRate - a.winRate;
    });

    return list;
  }, [processedSalesTeam, repSearch, sortKey]);

  // Chart Data: Top 6 Sales Reps (Sales vs Target)
  const topRepsChartData = useMemo(() => {
    return filteredSalesTeam.slice(0, 6).map((r: any) => {
      return {
        name: r.firstName,
        fullName: r.cleanName,
        branch: r.branch,
        sales: r.sales,
        ยอดขายจริง: r.sales,
        เป้าหมาย: r.hasTarget ? r.target : null,
        hasTarget: r.hasTarget,
        winRate: r.winRate,
        attainment: r.attainment !== null ? Math.round(r.attainment) : null,
        teamContribution: r.teamContribution.toFixed(1)
      };
    });
  }, [filteredSalesTeam]);

  // Chart Data: Visual Conversion Funnel with stage-to-stage conversion rates
  const funnelStages = useMemo(() => {
    const l = funnel.lead || 0;
    const t = funnel.telesale || 0;
    const q = funnel.quotation || 0;
    const p = funnel.po || 0;
    const i = funnel.invoice || 0;

    const convLtoT = l > 0 ? (t / l) * 100 : 0;
    const convTtoQ = t > 0 ? (q / t) * 100 : 0;
    const convQtoP = q > 0 ? (p / q) * 100 : 0;
    const convPtoI = p > 0 ? (i / p) * 100 : 0;

    return [
      {
        id: 'lead',
        stepNum: '1',
        title: 'Lead',
        name: 'ลูกค้าเป้าหมาย',
        count: l,
        shareOfLead: 100,
        nextConversion: convLtoT,
        barFill: '#475569',
        barBg: 'bg-slate-100',
        badgeColor: 'bg-slate-700 text-white',
        dropLabel: 'ผ่านสู่ Telesale'
      },
      {
        id: 'telesale',
        stepNum: '2',
        title: 'Telesale',
        name: 'โทรติดตาม & คัดกรอง',
        count: t,
        shareOfLead: l > 0 ? (t / l) * 100 : 0,
        nextConversion: convTtoQ,
        barFill: '#3b82f6',
        barBg: 'bg-blue-50',
        badgeColor: 'bg-blue-600 text-white',
        dropLabel: 'ผ่านสู่ใบเสนอราคา'
      },
      {
        id: 'quote',
        stepNum: '3',
        title: 'Quote',
        name: 'ออกใบเสนอราคา',
        count: q,
        shareOfLead: l > 0 ? (q / l) * 100 : 0,
        nextConversion: convQtoP,
        barFill: '#f97316',
        barBg: 'bg-orange-50',
        badgeColor: 'bg-orange-600 text-white',
        dropLabel: 'ชนะได้อนุมัติ PO'
      },
      {
        id: 'po',
        stepNum: '4',
        title: 'PO',
        name: 'ได้รับใบสั่งซื้อ (PO)',
        count: p,
        shareOfLead: l > 0 ? (p / l) * 100 : 0,
        nextConversion: convPtoI,
        barFill: '#ef4444',
        barBg: 'bg-red-50',
        badgeColor: 'bg-red-500 text-white',
        dropLabel: 'เปิดบิลสมบูรณ์'
      },
      {
        id: 'invoice',
        stepNum: '5',
        title: 'Invoice',
        name: 'เปิดบิลส่งมอบสำเร็จ',
        count: i,
        shareOfLead: l > 0 ? (i / l) * 100 : 0,
        nextConversion: null,
        barFill: '#dc2626',
        barBg: 'bg-red-100',
        badgeColor: 'bg-red-700 text-white',
        dropLabel: 'สำเร็จสิ้นสุด'
      }
    ];
  }, [funnel]);

  // Chart Data: Branch Revenue Comparison
  const branchChartData = useMemo(() => {
    const map: Record<string, { branch: string; sales: number; count: number }> = {};
    salesTeam.forEach((rep: any) => {
      const b = rep.branch || 'อื่นๆ';
      if (!map[b]) map[b] = { branch: b, sales: 0, count: 0 };
      map[b].sales += rep.sales || 0;
      map[b].count += (rep.sales > 0 ? 1 : 0);
    });
    return Object.values(map)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6)
      .map(item => ({
        branch: item.branch.replace('สาขา', '').trim(),
        fullBranch: item.branch,
        ยอดขาย: item.sales,
        share: currentMonthSales > 0 ? ((item.sales / currentMonthSales) * 100).toFixed(1) : '0'
      }));
  }, [salesTeam, currentMonthSales]);

  return (
    <div className={`flex-1 h-screen flex flex-col ${viewMode === 'cockpit' ? 'overflow-hidden' : 'overflow-y-auto'} bg-slate-50/60 font-ibm-thai relative select-none antialiased`}>
      
      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-xs flex items-center justify-center transition-opacity">
          <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-100 font-ibm-thai">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent"></div>
            <span className="font-semibold text-slate-800 text-xs">กำลังประมวลผลข้อมูล Sales KPI...</span>
          </div>
        </div>
      )}

      {/* ── Symmetrical Executive Header & Filter Command Bar ── */}
      <header className="h-13 px-4 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 z-20 shadow-xs">
        
        {/* Left Side: Brand Badge & Symmetrical Title */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0">
            EXECUTIVE
          </span>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Target size={16} className="text-red-600 shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Sales KPI Cockpit
            </h1>
          </div>

          {/* Quick Target Attainment Pill */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs shrink-0">
            <span className="text-slate-400 font-medium">เป้าหมายรวม:</span>
            <span className="font-bold text-slate-800 font-ibm-thai tracking-tight tabular-nums">
              {formatSmart(targetSales)}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-medium">ความสำเร็จ:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] tabular-nums ${
              targetAttainment >= 100 
                ? 'bg-red-50 text-red-700 border border-red-200 font-black' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              {targetAttainment.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Right Side: Grouped Filter Controls & Utility Cluster */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* 1. Period Selector (Segmented Pill) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs shrink-0 border border-slate-200/60">
            {['รายเดือน', 'รายไตรมาส', 'รายปี'].map((period) => (
              <button
                key={period}
                onClick={() => handleFilterChange('period', period)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterPeriod === period
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period.replace('ราย', '')}
              </button>
            ))}
          </div>

          {/* 2. Unified Period Stepper */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl p-0.5 text-xs shadow-2xs">
            <button
              onClick={() => {
                if (filterPeriod === 'รายไตรมาส') handleQuarterStep('prev');
                else if (filterPeriod === 'รายปี') handleYearStep('prev');
                else handleMonthStep('prev');
              }}
              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
              title="ก่อนหน้า"
            >
              <ChevronLeft size={14} />
            </button>
            
            <span className="text-xs font-bold text-slate-800 px-2 min-w-[95px] text-center tracking-tight">
              {filterPeriod === 'รายไตรมาส' 
                ? `ไตรมาส ${quarter} / ${year + 543}` 
                : filterPeriod === 'รายปี' 
                  ? `ปี ${year + 543}` 
                  : `${THAI_MONTHS[month - 1]} ${year + 543}`}
            </span>

            <button
              onClick={() => {
                if (filterPeriod === 'รายไตรมาส') handleQuarterStep('next');
                else if (filterPeriod === 'รายปี') handleYearStep('next');
                else handleMonthStep('next');
              }}
              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
              title="ถัดไป"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* 3. Company Segmented Filter (TE / TG / TP) */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl text-xs shrink-0 border border-slate-200/70">
            {[
              { key: '', label: 'ทุกบริษัท' },
              { key: 'TE', label: 'TE' },
              { key: 'TG', label: 'TG' },
              { key: 'TP', label: 'TP' },
            ].map(({ key, label }) => {
              const isActive = filterCompany === key;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleFilterChange('company', key)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={key ? `กรองเฉพาะบริษัท ${key}` : 'แสดงข้อมูลรวมทุกบริษัท'}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 4. Branch Selector Dropdown */}
          <div className="relative">
            <select
              value={filterScope}
              onChange={(e) => handleFilterChange('branch', e.target.value)}
              className="bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer shadow-2xs max-w-[125px] truncate"
            >
              <option value="ทีมทั้งหมด">สาขาทั้งหมด</option>
              {branches?.map((b: string) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* 5. Real-time Live Sync Controller */}
          <ExecutiveLiveSync />

          {/* 6. View Mode Toggle (Cockpit Zero-Scroll vs Expanded) */}
          <div className="flex items-center border border-slate-200/90 rounded-xl p-0.5 bg-slate-50 text-xs shadow-2xs">
            <button
              onClick={() => setViewMode('cockpit')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'cockpit'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="มุมมองจอเดียว ไม่ต้องเลื่อนจอ (Executive Cockpit)"
            >
              <Monitor size={13} />
              <span className="hidden md:inline">จอเดียว</span>
            </button>
            <button
              onClick={() => setViewMode('expanded')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'expanded'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="มุมมองขยายเต็ม (Scroll View)"
            >
              <Maximize2 size={13} />
              <span className="hidden md:inline">ขยาย</span>
            </button>
          </div>

        </div>
      </header>

      {/* ── 6 Mathematically Symmetrical Executive Metric Tiles (Equal Heights & Baselines) ── */}
      <div className="shrink-0 px-4 pt-2.5 pb-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* Tile 1: Won Sales Revenue */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-red-200 transition-all flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">
                {filterPeriod === 'รายไตรมาส' ? `ยอดขายปิดได้ (Q${quarter})` : filterPeriod === 'รายปี' ? 'ยอดขายปิดได้ (ทั้งปี)' : 'ยอดขายปิดได้'}
              </span>
              <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <TrendingUp size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight tabular-nums" title={formatCurrency(currentMonthSales)}>
                {formatSmart(currentMonthSales)}
              </span>
              <span className={`inline-flex items-center text-[10px] font-bold ${salesTrend >= 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {salesTrend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {salesTrend >= 0 ? '+' : ''}{salesTrend.toFixed(0)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              vs ก่อนหน้า: <span className="font-semibold text-slate-600">{formatSmart(prevMonthSales)}</span>
            </div>
          </div>

          {/* Tile 2: Target Quota Attainment */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-red-200 transition-all flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">
                {filterPeriod === 'รายไตรมาส' ? `เทียบเป้า Q${quarter}` : filterPeriod === 'รายปี' ? 'เทียบเป้าทั้งปี' : 'เทียบเป้าหมาย'}
              </span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Target size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                {targetAttainment.toFixed(1)}%
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                targetAttainment >= 100 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {targetAttainment >= 100 ? 'เกินเป้า' : 'กำลังเร่ง'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              เป้าหมาย: <span className="font-semibold text-slate-600">{formatSmart(targetSales)}</span>
            </div>
          </div>

          {/* Tile 3: Active Pipeline Amount */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-red-200 transition-all flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">ไปป์ไลน์รอผล</span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Layers size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight tabular-nums" title={formatCurrency(pipelineAmount)}>
                {formatSmart(pipelineAmount)}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                {pipelineCount} ดีล
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              มูลค่าเสนอราคาที่รอการตัดสินใจ
            </div>
          </div>

          {/* Tile 4: Sales Win Rate */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-red-200 transition-all flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">อัตราปิดการขาย</span>
              <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Award size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl lg:text-2xl font-bold text-red-600 tracking-tight tabular-nums">
                {winRate.toFixed(1)}%
              </span>
              <span className={`inline-flex items-center text-[10px] font-bold ${winRateTrend >= 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {winRateTrend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {winRateTrend >= 0 ? '+' : ''}{winRateTrend.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              สัดส่วนใบเสนอราคาที่ชนะ (Won)
            </div>
          </div>

          {/* Tile 5: Weighted Forecast */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-red-200 transition-all flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">คาดการณ์ยอด</span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Sparkles size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight tabular-nums" title={formatCurrency(quarterlyForecast)}>
                {formatSmart(quarterlyForecast)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">ถ่วงน้ำหนัก</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              คำนวณจาก Pipeline × Win Rate
            </div>
          </div>

          {/* Tile 6: Average Deal Size */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-red-200 transition-all flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 tracking-tight">มูลค่าเฉลี่ยต่อดีล</span>
              <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Coins size={13} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight tabular-nums" title={formatCurrency(calculatedAvgDealSize)}>
                {formatSmart(calculatedAvgDealSize)}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                {wonCount || 0} ชนะ
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              Average Won Ticket Size
            </div>
          </div>

        </div>
      </div>

      {/* ── COCKPIT MODE: 50 / 50 Perfectly Symmetrical Command Center ── */}
      {viewMode === 'cockpit' ? (
        <main className="flex-1 min-h-0 px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          
          {/* ════════ LEFT COLUMN (6 Cols = 50% Symmetry): Funnel Flow & Multi-Angle Analytics ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            
            {/* Left Top Card: Sales Conversion Funnel Flow (Eliminating Dead Whitespace) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[48%] overflow-hidden">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                    <BarChart3 size={13} />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                    กระบวนการแปลงยอดขาย (Conversion Funnel Flow)
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">ความสำเร็จรวม:</span>
                  <span className="text-[11px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 tabular-nums">
                    {overallConversion}% (Lead → Won)
                  </span>
                </div>
              </div>

              {/* Stepped Conversion Visual Bars with Drop-off Analytics (Compact & No-Overlap) */}
              <div className="flex-1 min-h-0 flex flex-col justify-between py-1">
                {funnelStages.map((stage) => (
                  <div key={stage.id} className="group flex flex-col justify-center">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${stage.badgeColor}`}>
                          {stage.stepNum}
                        </span>
                        <span className="font-bold text-slate-800 text-[11px] truncate">{stage.title}</span>
                        <span className="text-slate-400 text-[10px] hidden xl:inline truncate">({stage.name})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        {stage.nextConversion !== null && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-0.5 ${
                            stage.nextConversion <= 10 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {stage.nextConversion <= 10 && <AlertTriangle size={9} className="text-red-600 shrink-0" />}
                            <span>ผ่าน {stage.nextConversion.toFixed(1)}%</span>
                            {stage.nextConversion <= 10 && <span className="font-bold text-[8px] text-red-700 ml-0.5 hidden sm:inline">(จุดตกหล่น)</span>}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 min-w-[38px] text-right">{stage.count.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-medium min-w-[36px] text-right">
                          {stage.shareOfLead.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="relative w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.max(1, stage.shareOfLead)}%`,
                          backgroundColor: stage.barFill
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Executive Diagnostic Summary Bar */}
              <div className="shrink-0 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <span className="truncate">จุดตกหล่นสูงสุด: <strong className="text-slate-800 font-semibold">Telesale → Quote</strong> (ผ่านเพียง {funnelStages[1]?.nextConversion?.toFixed(1) || '0'}%)</span>
                </div>
                <div className="text-slate-400 shrink-0 pl-2">
                  ชนะสมบูรณ์: <strong className="text-red-600 font-bold">{overallConversion}%</strong> ของ Lead
                </div>
              </div>
            </div>

            {/* Left Bottom Card: Symmetrical Multi-Angle Breakdown Cockpit */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              
              {/* Symmetrical 4-Tab Strip */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 shrink-0">
                <div className="grid grid-cols-4 gap-1 w-full bg-slate-100 p-0.5 rounded-xl text-xs">
                  <button
                    onClick={() => setLeftTab('branches')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      leftTab === 'branches'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 size={12} />
                    <span>สาขา</span>
                  </button>

                  <button
                    onClick={() => setLeftTab('companies')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      leftTab === 'companies'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Coins size={12} />
                    <span>บริษัท TE/TG/TP</span>
                  </button>

                  <button
                    onClick={() => setLeftTab('topCustomers')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      leftTab === 'topCustomers'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Flame size={12} />
                    <span>Top ลูกค้า</span>
                  </button>

                  <button
                    onClick={() => setLeftTab('stale')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      leftTab === 'stale'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    <span>ดีลค้าง ({staleDeals.length})</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Branch Breakdown */}
              {leftTab === 'branches' && (
                <div className="flex-1 min-h-0 w-full flex flex-col justify-between">
                  <div className="flex-1 min-h-0 w-full relative">
                    {branchChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        ไม่พบข้อมูลยอดขายตามสาขา
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchChartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="branch" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#475569', fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
                            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                          />
                          <RechartsTooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: '1px solid #e2e8f0', 
                              fontSize: '11px', 
                              padding: '8px 12px', 
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontFamily: "'IBM Plex Sans Thai', sans-serif" 
                            }}
                            formatter={(val: any, name: any, item: any) => [
                              `${formatCurrency(val)} (${item.payload.share}% ของยอดรวม)`, 
                              'ยอดขายจริง'
                            ]}
                            labelFormatter={(label: any, item: any) => item?.[0]?.payload?.fullBranch || label}
                          />
                          <Bar dataKey="ยอดขาย" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="shrink-0 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>ยอดขายสูงสุด: <strong className="text-slate-800 font-semibold">{branchChartData[0]?.branch || '-'}</strong></span>
                    <span>สัดส่วน: <strong className="text-red-600 font-bold">{branchChartData[0]?.share || 0}%</strong></span>
                  </div>
                </div>
              )}

              {/* Tab 2: Company Breakdown (TE, TG, TP) */}
              {leftTab === 'companies' && (
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-2.5 my-auto">
                    {[
                      { code: 'TE', name: 'Tera Energy', color: '#dc2626', bgGradient: 'from-red-500/10 to-transparent' },
                      { code: 'TG', name: 'Tera Group', color: '#2563eb', bgGradient: 'from-blue-500/10 to-transparent' },
                      { code: 'TP', name: 'Tera Power', color: '#16a34a', bgGradient: 'from-emerald-500/10 to-transparent' },
                    ].map((comp) => {
                      const stats = companyBreakdown[comp.code] || { count: 0, wonCount: 0, sales: 0 };
                      const totalBreakdownSales = Object.values(companyBreakdown).reduce((sum, c) => sum + c.sales, 0);
                      const share = totalBreakdownSales > 0 ? (stats.sales / totalBreakdownSales) * 100 : 0;
                      const isSelected = filterCompany === comp.code;

                      return (
                        <div
                          key={comp.code}
                          onClick={() => handleFilterChange('company', isSelected ? '' : comp.code)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                            isSelected
                              ? 'bg-red-50/80 border-red-500 ring-2 ring-red-200 shadow-xs'
                              : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                          }`}
                          title={`คลิกเพื่อกรองเฉพาะ ${comp.code}`}
                        >
                          <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${comp.bgGradient} rounded-bl-full pointer-events-none`} />
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-black text-base text-slate-900 font-ibm-thai tracking-tight">{comp.code}</span>
                              <span className="text-[10px] font-bold text-slate-600 tabular-nums">{share.toFixed(1)}%</span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block font-medium">{comp.name}</span>
                          </div>

                          <div className="mt-2">
                            <span className="text-sm font-bold text-slate-900 block tabular-nums">
                              {formatSmart(stats.sales)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {stats.wonCount} ชนะ / {stats.count} เสนอ
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(share, 100)}%`, backgroundColor: comp.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100 shrink-0">
                    <span>* คลิกที่การ์ดบริษัทเพื่อกรองข้อมูลทั้ง Dashboard</span>
                    {filterCompany && (
                      <button
                        onClick={() => handleFilterChange('company', '')}
                        className="text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        ล้างการกรอง (ดูทุกบริษัท)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Top Customers List */}
              {leftTab === 'topCustomers' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 pr-1 space-y-1">
                  {topCustomers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-4">
                      ยังไม่มียอดขายในช่วงเวลานี้
                    </div>
                  ) : (
                    topCustomers.map((cust: any, i: number) => {
                      const share = currentMonthSales > 0 ? (cust.sales / currentMonthSales) * 100 : 0;
                      return (
                        <div key={i} className="py-1.5 flex flex-col gap-0.5 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-4 h-4 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 ${
                                i === 0 ? 'bg-amber-400 text-slate-900 font-black' :
                                i === 1 ? 'bg-slate-300 text-slate-900' :
                                i === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {i + 1}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-900 truncate max-w-[200px]" title={cust.companyName}>
                                {cust.companyName}
                              </span>
                            </div>
                            <div className="text-right shrink-0 tabular-nums">
                              <span className="text-xs font-bold text-slate-900">
                                {formatCurrency(cust.sales)}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1 font-semibold">
                                ({share.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-red-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(share, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 4: Stale Deals List */}
              {leftTab === 'stale' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 pr-1 space-y-1">
                  {staleDeals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 py-4">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                      <span className="font-semibold text-slate-600">ไม่มีดีลค้างเกิน 30 วันในช่วงนี้</span>
                    </div>
                  ) : (
                    staleDeals.map((deal: any, i: number) => (
                      <div key={i} className="py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-900 font-ibm-thai">
                              {deal.quotationNumber || 'N/A'}
                            </span>
                            <span className="text-[11px] text-slate-600 truncate max-w-[170px]" title={deal.companyName}>
                              {deal.companyName}
                            </span>
                          </div>
                          {deal.amount > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              มูลค่า: {formatSmart(deal.amount)}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums ${
                          deal.days >= 60
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {deal.days} วัน
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

          </div>

          {/* ════════ RIGHT COLUMN (6 Cols = 50% Symmetry): Quota Performance & Leaderboard ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            
            {/* Right Top Card: Individual Quota Attainment (Dual BarChart & Non-Truncated Badges) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[48%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                    <Users size={13} />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                    ผลงานเทียบเป้าหมายรายบุคคล ({filterPeriod === 'รายไตรมาส' ? `ไตรมาส ${quarter}` : filterPeriod === 'รายปี' ? `ปี ${year + 543}` : `ประจำเดือน`})
                  </h2>
                </div>

                {/* View Switcher: Sales vs Quota / Win Rate */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs border border-slate-200/70">
                  <button
                    onClick={() => setRightTopView('salesVsTarget')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      rightTopView === 'salesVsTarget'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ยอดขาย vs เป้า
                  </button>
                  <button
                    onClick={() => setRightTopView('winRate')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      rightTopView === 'winRate'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Win Rate %
                  </button>
                </div>
              </div>

              {/* View A: Dual Bar Chart (Actual Sales vs Target Quota) */}
              {rightTopView === 'salesVsTarget' && (
                <div className="flex-1 min-h-0 w-full flex flex-col justify-between">
                  <div className="flex-1 min-h-0 w-full relative">
                    {topRepsChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        ไม่พบข้อมูลยอดขาย
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={topRepsChartData} 
                          margin={{ top: 8, right: 10, left: -15, bottom: 0 }}
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#334155', fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
                            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                          />
                          <RechartsTooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: '1px solid #e2e8f0', 
                              fontSize: '11px', 
                              padding: '8px 12px', 
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontFamily: "'IBM Plex Sans Thai', sans-serif" 
                            }}
                            formatter={(val: any, name: any) => {
                              if (name === 'เป้าหมาย' && (val === null || val === undefined)) {
                                return ['ยังไม่ได้ระบุเป้า', 'เป้าหมาย'];
                              }
                              return [formatCurrency(val), name];
                            }}
                            labelFormatter={(name: any, item: any) => {
                              const match = item?.[0]?.payload;
                              if (!match) return name;
                              if (match.hasTarget) {
                                return `${match.fullName} (${match.branch}) • สำเร็จ ${match.attainment}%`;
                              }
                              return `${match.fullName} (${match.branch}) • สัดส่วน ${match.teamContribution}% ของยอดทีม`;
                            }}
                          />
                          <Legend verticalAlign="top" height={22} wrapperStyle={{ fontSize: '10px', fontWeight: 600, fontFamily: "'IBM Plex Sans Thai', sans-serif" }} />
                          <Bar dataKey="ยอดขายจริง" fill="#dc2626" radius={[5, 5, 0, 0]} maxBarSize={22} />
                          <Bar dataKey="เป้าหมาย" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Symmetrical Rep Badges (Accurate Metrics: Attainment if target exists, else Sales & Team Share) */}
                  <div className="shrink-0 grid grid-cols-6 gap-1 pt-1.5 border-t border-slate-100">
                    {topRepsChartData.map((rep, idx) => (
                      <div key={idx} className="bg-slate-50/80 p-1 rounded-xl text-center border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-slate-900 font-black' :
                            idx === 1 ? 'bg-slate-300 text-slate-900' :
                            idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 truncate" title={rep.fullName}>
                            {rep.name}
                          </span>
                        </div>

                        {rep.hasTarget ? (
                          <span className={`text-[10px] font-bold block tabular-nums mt-0.5 ${
                            rep.attainment && rep.attainment >= 100 ? 'text-red-600 font-black' : 'text-slate-700'
                          }`}>
                            {rep.attainment}%
                          </span>
                        ) : (
                          <div className="mt-0.5 leading-tight">
                            <span className="text-[10px] font-bold text-slate-800 block tabular-nums">
                              {formatSmart(rep.ยอดขายจริง)}
                            </span>
                            <span className="text-[8px] font-medium text-slate-500 block tabular-nums">
                              {rep.teamContribution}% ทีม
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View B: Win Rate Comparison Chart */}
              {rightTopView === 'winRate' && (
                <div className="flex-1 min-h-0 w-full flex flex-col justify-between">
                  <div className="flex-1 min-h-0 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical"
                        data={topRepsChartData} 
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis 
                          type="number" 
                          domain={[0, 100]} 
                          tickFormatter={(val) => `${val}%`} 
                          tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: "'IBM Plex Sans Thai', sans-serif" }} 
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#334155', fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Sans Thai', sans-serif" }} 
                          width={60} 
                        />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            fontSize: '11px', 
                            padding: '8px 12px', 
                            fontFamily: "'IBM Plex Sans Thai', sans-serif" 
                          }}
                          formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Win Rate']}
                        />
                        <Bar dataKey="winRate" fill="#dc2626" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>

            {/* Right Bottom Card: Sales Team Performance Leaderboard */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                    <Award size={13} />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                    ตารางอันดับประสิทธิภาพทีมขาย (Leaderboard)
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search Input */}
                  <div className="relative w-28 sm:w-36">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อเซลล์..."
                      value={repSearch}
                      onChange={(e) => setRepSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-[11px] font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-red-500 transition-all font-ibm-thai"
                    />
                  </div>

                  {/* Segmented Sort Controls */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs border border-slate-200/60">
                    {[
                      { id: 'sales' as const, label: 'ยอดขาย' },
                      { id: 'attainment' as const, label: '%เป้า' },
                      { id: 'winRate' as const, label: 'WinRate' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSortKey(s.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          sortKey === s.id 
                            ? 'bg-red-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leaderboard Table with Custom Scrollbar */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-3">อันดับ / เซลล์</th>
                      <th className="py-2 px-2">สาขา</th>
                      <th className="py-2 px-2 text-right">ยอดขายจริง</th>
                      <th className="py-2 px-2 text-right">% เป้า</th>
                      <th className="py-2 px-2 text-center">โทร</th>
                      <th className="py-2 px-2 text-right">WinRate</th>
                      <th className="py-2 px-2.5 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSalesTeam.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                          ไม่พบข้อมูลพนักงานที่ค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredSalesTeam.map((rep: any, index: number) => {
                        return (
                          <tr key={rep.id} className="hover:bg-slate-50/90 transition-colors">
                            <td className="py-1.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                  index === 0 ? 'bg-amber-400 text-slate-950 font-black shadow-xs' :
                                  index === 1 ? 'bg-slate-300 text-slate-900 font-bold' :
                                  index === 2 ? 'bg-amber-600 text-white font-bold' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="font-semibold text-slate-900 text-xs truncate max-w-[120px]" title={rep.cleanName}>
                                  {rep.cleanName}
                                </span>
                              </div>
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {rep.branch || '-'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-slate-900 text-xs tabular-nums">
                              {formatCurrency(rep.sales)}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              {rep.hasTarget ? (
                                <span className={`font-bold text-xs tabular-nums ${rep.attainment !== null && rep.attainment >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
                                  {rep.attainment?.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-600 tabular-nums" title="สัดส่วนต่อยอดขายรวมของทั้งทีม (ยังไม่ได้ตั้งเป้าหมายเดี่ยว)">
                                  {rep.teamContribution.toFixed(1)}% <span className="text-[9px] text-slate-400 font-normal">ทีม</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center text-[11px] text-slate-600 tabular-nums">
                              {rep.calls}
                            </td>
                            <td className="py-1.5 px-2 text-right text-[11px] font-bold text-slate-800 tabular-nums">
                              {rep.winRate.toFixed(1)}%
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] ${rep.statusBadgeClass}`}>
                                {rep.statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </main>
      ) : (
        /* ── EXPANDED DETAILED REPORT VIEW (Traditional Scrollable Format) ── */
        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full font-ibm-thai">
          
          {/* Conversion Funnel */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-red-600" />
                กระบวนการขายและอัตราการแปลง (Conversion Funnel)
              </h2>
              <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                Overall Conversion: {overallConversion}%
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {funnelStages.map((step, idx) => (
                <div key={idx} className="p-4 rounded-2xl border bg-slate-50 border-slate-200 text-slate-900">
                  <span className="text-xs font-semibold text-slate-500 block uppercase">{step.title}</span>
                  <span className="text-2xl font-bold mt-2 block tabular-nums">{step.count.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 mt-1 block">{step.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-red-600" />
                ประสิทธิภาพทีมขายรายบุคคล ({filteredSalesTeam.length} คน)
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเซลล์ หรือสาขา..."
                  value={repSearch}
                  onChange={(e) => setRepSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-red-500 font-ibm-thai"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4">อันดับ / พนักงาน</th>
                    <th className="py-3 px-4">สาขา</th>
                    <th className="py-3 px-4 text-right">ยอดขายจริง</th>
                    <th className="py-3 px-4 text-right">เทียบเป้า</th>
                    <th className="py-3 px-4 text-center">โทร (ครั้ง)</th>
                    <th className="py-3 px-4 text-right">Win Rate</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSalesTeam.map((rep: any, i: number) => (
                    <tr key={rep.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{i + 1}. {rep.cleanName}</td>
                      <td className="py-3 px-4 text-slate-600">{rep.branch}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(rep.sales)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {rep.hasTarget ? (
                          <span className={`font-bold ${rep.attainment !== null && rep.attainment >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
                            {rep.attainment?.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-600">
                            {rep.teamContribution.toFixed(1)}% <span className="text-xs text-slate-400 font-normal">ทีม</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums">{rep.calls}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">{rep.winRate.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] ${rep.statusBadgeClass}`}>
                          {rep.statusText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
