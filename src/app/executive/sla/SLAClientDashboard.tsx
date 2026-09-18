'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Layers,
  ShieldAlert,
  ArrowRight,
  Wrench,
  Flame,
  User,
  ExternalLink,
  ChevronRight,
  Building2,
  Calendar,
  RefreshCw,
  Monitor,
  Maximize2,
  DollarSign,
  AlertOctagon,
  Timer
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import ExecutiveLiveSync from '../components/ExecutiveLiveSync';

export type BreachedOrder = {
  id: string;
  orderNumber: string;
  companyName: string;
  status: string;
  department: string;
  value: number;
  daysInStatus: number;
  threshold: number;
  delayDays: number;
  severity: 'critical' | 'high' | 'warning';
  salespersonName: string;
  updatedAt: string;
  createdAt: string;
  targetDeliveryDate?: string | null;
};

export type BreachedJob = {
  id: string;
  jobNumber: string;
  customerName: string;
  jobType: string;
  currentStep: string;
  stepLabel: string;
  department: string;
  daysInStatus: number;
  threshold: number;
  delayDays: number;
  severity: 'critical' | 'high' | 'warning';
  technicianName: string;
  updatedAt: string;
  createdAt: string;
};

export type DepartmentStat = {
  department: string;
  orderCount: number;
  jobCount: number;
  totalCount: number;
  criticalCount: number;
  avgDelayDays: number;
  maxDelayDays: number;
};

export type SLADashboardProps = {
  breachedOrders: BreachedOrder[];
  breachedJobs: BreachedJob[];
  totalActiveOrders: number;
  totalActiveJobs: number;
  onTimeDeliveryRate: number;
  departmentStats: DepartmentStat[];
  totalBreachedValue?: number;
  lastUpdatedTime: string;
};

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

export default function SLAClientDashboard({
  breachedOrders = [],
  breachedJobs = [],
  totalActiveOrders = 0,
  totalActiveJobs = 0,
  onTimeDeliveryRate = 0,
  departmentStats = [],
  totalBreachedValue = 0,
  lastUpdatedTime = ''
}: SLADashboardProps) {
  // Mode: default to 'cockpit' (no-scroll single-viewport) per executive brief
  const [viewMode, setViewMode] = useState<'cockpit' | 'expanded'>('cockpit');

  // Left Bottom Tab: 'severity' | 'value'
  const [leftBottomTab, setLeftBottomTab] = useState<'severity' | 'value'>('severity');

  // Right Bottom Tab: 'orders' | 'jobs'
  const [watchlistTab, setWatchlistTab] = useState<'orders' | 'jobs'>('orders');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Summary Metrics
  const totalBreaches = breachedOrders.length + breachedJobs.length;
  const criticalOrdersCount = breachedOrders.filter((o) => o.severity === 'critical').length;
  const criticalJobsCount = breachedJobs.filter((j) => j.severity === 'critical').length;
  const totalCritical = criticalOrdersCount + criticalJobsCount;

  // High & Warning counts
  const highCount =
    breachedOrders.filter((o) => o.severity === 'high').length +
    breachedJobs.filter((j) => j.severity === 'high').length;
  const warningCount =
    breachedOrders.filter((o) => o.severity === 'warning').length +
    breachedJobs.filter((j) => j.severity === 'warning').length;

  // Top Bottleneck Department
  const topBottleneck = departmentStats.length > 0 ? departmentStats[0] : null;

  // Aging profile buckets
  const agingBuckets = useMemo(() => {
    let under3 = 0;
    let from3to7 = 0;
    let from7to14 = 0;
    let over14 = 0;

    const allDelays = [
      ...breachedOrders.map((o) => o.delayDays),
      ...breachedJobs.map((j) => j.delayDays)
    ];

    allDelays.forEach((d) => {
      if (d < 3) under3++;
      else if (d <= 7) from3to7++;
      else if (d <= 14) from7to14++;
      else over14++;
    });

    const total = allDelays.length || 1;
    return [
      { label: '< 3 วัน', count: under3, percent: (under3 / total) * 100, color: 'bg-slate-400' },
      { label: '3 - 7 วัน', count: from3to7, percent: (from3to7 / total) * 100, color: 'bg-amber-500' },
      { label: '7 - 14 วัน', count: from7to14, percent: (from7to14 / total) * 100, color: 'bg-red-500' },
      { label: '> 14 วัน', count: over14, percent: (over14 / total) * 100, color: 'bg-red-700' }
    ];
  }, [breachedOrders, breachedJobs]);

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    breachedOrders.forEach((o) => set.add(o.department));
    breachedJobs.forEach((j) => set.add(j.department));
    return Array.from(set).sort();
  }, [breachedOrders, breachedJobs]);

  // Value at risk by department
  const valueByDept = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {};
    breachedOrders.forEach((o) => {
      if (!map[o.department]) {
        map[o.department] = { value: 0, count: 0 };
      }
      map[o.department].value += o.value || 0;
      map[o.department].count += 1;
    });
    return Object.entries(map)
      .map(([dept, data]) => ({
        department: dept,
        value: data.value,
        count: data.count,
        share: totalBreachedValue > 0 ? (data.value / totalBreachedValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [breachedOrders, totalBreachedValue]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return breachedOrders.filter((order) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          order.orderNumber.toLowerCase().includes(q) ||
          order.companyName.toLowerCase().includes(q) ||
          order.salespersonName.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedDept !== 'all' && order.department !== selectedDept) return false;
      if (selectedSeverity !== 'all' && order.severity !== selectedSeverity) return false;
      return true;
    });
  }, [breachedOrders, searchQuery, selectedDept, selectedSeverity]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return breachedJobs.filter((job) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          job.jobNumber.toLowerCase().includes(q) ||
          job.customerName.toLowerCase().includes(q) ||
          job.technicianName.toLowerCase().includes(q) ||
          job.stepLabel.toLowerCase().includes(q) ||
          job.jobType.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedDept !== 'all' && job.department !== selectedDept) return false;
      if (selectedSeverity !== 'all' && job.severity !== selectedSeverity) return false;
      return true;
    });
  }, [breachedJobs, searchQuery, selectedDept, selectedSeverity]);

  const renderSeverityBadge = (severity: 'critical' | 'high' | 'warning', delayDays: number) => {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle size={9} />
          วิกฤต (+{delayDays}ว.)
        </span>
      );
    }
    if (severity === 'high') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          ล่าช้า (+{delayDays}ว.)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        เฝ้าระวัง (+{delayDays}ว.)
      </span>
    );
  };

  return (
    <div
      className={`flex-1 h-screen flex flex-col ${
        viewMode === 'cockpit' ? 'overflow-hidden' : 'overflow-y-auto'
      } bg-slate-50 font-ibm-thai relative select-none`}
    >
      {/* ── Compact Executive Top Header Bar (Matching KPI & Pipeline) ── */}
      <header className="h-13 px-4 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              Executive
            </span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Clock size={16} className="text-red-600" />
              SLA & Operational Bottleneck Monitor
            </h1>
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
            <span className="text-slate-400 font-medium">รายการค้างรวม:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{totalBreaches} รายการ</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                totalCritical > 0
                  ? 'bg-red-50 text-red-700 border border-red-200 font-black animate-pulse'
                  : totalBreaches > 0
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {totalCritical > 0
                ? `วิกฤต ${totalCritical} รายการ`
                : totalBreaches > 0
                  ? 'เฝ้าระวัง'
                  : 'ปกติ (Optimal)'}
            </span>
          </div>
        </div>

        {/* Controls & View Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Real-time Live Sync Controller */}
          <ExecutiveLiveSync initialLastUpdated={lastUpdatedTime} />

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
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

          {/* Tile 1: Orders Overdue */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                คำสั่งซื้อเกิน SLA
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                <Clock size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight">
                {breachedOrders.length}
              </span>
              <span className="text-[10px] font-bold font-mono text-red-600">
                วิกฤต {criticalOrdersCount}
              </span>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 truncate mt-0.5">
              <span>จากเปิดอยู่ {totalActiveOrders} ออเดอร์</span>
              <span className="font-mono">
                {totalActiveOrders > 0 ? ((breachedOrders.length / totalActiveOrders) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>

          {/* Tile 2: Jobs Overdue */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                คิวงานเกิน SLA
              </span>
              <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                <Wrench size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight">
                {breachedJobs.length}
              </span>
              <span className="text-[10px] font-bold font-mono text-red-600">
                วิกฤต {criticalJobsCount}
              </span>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 truncate mt-0.5">
              <span>จากคิวงาน {totalActiveJobs} งาน</span>
              <span className="font-mono">
                {totalActiveJobs > 0 ? ((breachedJobs.length / totalActiveJobs) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>

          {/* Tile 3: Total Breaches */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                ค้างเกินกำหนดรวม
              </span>
              <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                <Layers size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold font-mono tracking-tight text-slate-900">
                {totalBreaches}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                  totalCritical > 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {totalCritical > 0 ? 'เสี่ยงสูง' : 'เฝ้าระวัง'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">คำสั่งซื้อ + คิวงานบริการ</span>
          </div>

          {/* Tile 4: Critical Severity Breaches */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                วิกฤตเร่งด่วน (&gt;7 วัน)
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldAlert size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-red-600 font-mono tracking-tight">
                {totalCritical}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">รายการ</span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">
              มูลค่าค้างรวม: {formatSmart(totalBreachedValue)}
            </span>
          </div>

          {/* Tile 5: On-Time Delivery Rate (OTD) */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                ส่งมอบตรงเวลา (OTD)
              </span>
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight">
                {onTimeDeliveryRate.toFixed(1)}%
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                  onTimeDeliveryRate >= 90
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {onTimeDeliveryRate >= 90 ? 'ได้เป้า' : 'ต่ำกว่าเป้า'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  onTimeDeliveryRate >= 90 ? 'bg-emerald-600' : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, onTimeDeliveryRate))}%` }}
              />
            </div>
          </div>

          {/* Tile 6: Top Bottleneck Department */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                จุดติดขัดหลัก
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                <Flame size={12} />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-sm font-bold text-slate-900 truncate" title={topBottleneck?.department || 'ปกติ'}>
                {topBottleneck?.department || 'ไม่พบจุดติดขัด'}
              </span>
              <span className="text-[10px] font-bold text-red-600 font-mono shrink-0">
                {topBottleneck ? `${topBottleneck.totalCount} งาน` : '-'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate mt-0.5">
              เฉลี่ย {topBottleneck ? topBottleneck.avgDelayDays : 0} วัน (สูงสุด {topBottleneck ? topBottleneck.maxDelayDays : 0} วัน)
            </span>
          </div>

        </div>
      </div>

      {/* ── COCKPIT MODE: Symmetrical 50 / 50 Dual Column Grid (Zero-Scroll on Desktop) ── */}
      {viewMode === 'cockpit' ? (
        <main className="flex-1 min-h-0 px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">

          {/* ════════ LEFT COLUMN (6 Cols = 50% Symmetry): Bottleneck Distribution & Severity Impact ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">

            {/* Left Top Card: Department Bottleneck Matrix BarChart */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[48%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Layers size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    การกระจายจุดติดขัดรายแผนก (Bottleneck Distribution)
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-red-600" />
                    <span className="text-slate-600">คำสั่งซื้อ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-slate-700" />
                    <span className="text-slate-600">คิวงานบริการ</span>
                  </div>
                </div>
              </div>

              {/* BarChart */}
              <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentStats}
                    margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const ordersVal = Number(payload[0]?.value || 0);
                          const jobsVal = Number(payload[1]?.value || 0);
                          const total = ordersVal + jobsVal;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800 text-[11px] font-ibm-thai">
                              <p className="font-bold text-xs mb-1.5 text-white">{label}</p>
                              <div className="space-y-1 text-slate-300">
                                <div className="flex items-center justify-between gap-3">
                                  <span>คำสั่งซื้อ:</span>
                                  <span className="font-mono text-white font-bold">{ordersVal}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>คิวงานบริการ:</span>
                                  <span className="font-mono text-white font-bold">{jobsVal}</span>
                                </div>
                                <div className="pt-1 mt-1 border-t border-slate-700 flex items-center justify-between text-white font-bold">
                                  <span>รวมติดขัด:</span>
                                  <span className="font-mono text-red-400">{total} รายการ</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="orderCount"
                      name="คำสั่งซื้อ"
                      fill="#dc2626"
                      radius={[3, 3, 0, 0]}
                      barSize={16}
                    />
                    <Bar
                      dataKey="jobCount"
                      name="คิวงาน"
                      fill="#334155"
                      radius={[3, 3, 0, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Summary Chips */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 pt-1.5 border-t border-slate-100 shrink-0 text-center">
                {departmentStats.slice(0, 5).map((d) => (
                  <div key={d.department} className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                    <span className="text-[8px] text-slate-400 block truncate">{d.department}</span>
                    <span className="text-[10px] font-bold text-slate-900 font-mono">
                      {d.totalCount} <span className="text-[8px] font-normal text-slate-500">({d.avgDelayDays}ว.)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Left Bottom Card: Severity Tiers & Financial Value at Risk */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setLeftBottomTab('severity')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftBottomTab === 'severity'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlertTriangle size={11} />
                    <span>ระดับความรุนแรง</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab('value')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftBottomTab === 'value'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <DollarSign size={11} />
                    <span>มูลค่าที่ติดขัด</span>
                  </button>
                </div>

                <div className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                  {leftBottomTab === 'severity' ? (
                    <>วิกฤต: <span className="font-mono">{totalCritical}</span> รายการ</>
                  ) : (
                    <>มูลค่าค้างรวม: <span className="font-mono">{formatSmart(totalBreachedValue)}</span></>
                  )}
                </div>
              </div>

              {/* Tab 1: Severity Tiers */}
              {leftBottomTab === 'severity' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {/* Tier 1: Critical */}
                  <div className="p-2 rounded-xl bg-red-50/70 border border-red-200/80">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                        <span className="text-[11px] font-bold text-red-950">วิกฤตเร่งด่วน (Critical &gt;7 วัน)</span>
                      </div>
                      <span className="text-[11px] font-bold text-red-700 font-mono">{totalCritical} รายการ</span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden my-1">
                      <div
                        className="bg-red-600 h-1.5 rounded-full"
                        style={{ width: `${totalBreaches > 0 ? (totalCritical / totalBreaches) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-red-700">
                      <span>สัดส่วน: {totalBreaches > 0 ? ((totalCritical / totalBreaches) * 100).toFixed(1) : 0}%</span>
                      <span>คำสั่งซื้อ {criticalOrdersCount} | คิวงาน {criticalJobsCount}</span>
                    </div>
                  </div>

                  {/* Tier 2: High Delay */}
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-[11px] font-bold text-amber-950">ล่าช้าสูง (High 3-7 วัน)</span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 font-mono">{highCount} รายการ</span>
                    </div>
                    <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden my-1">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: `${totalBreaches > 0 ? (highCount / totalBreaches) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-amber-800">
                      <span>สัดส่วน: {totalBreaches > 0 ? ((highCount / totalBreaches) * 100).toFixed(1) : 0}%</span>
                      <span>ต้องเร่งติดตามก่อนเข้าขั้นวิกฤต</span>
                    </div>
                  </div>

                  {/* Tier 3: Warning */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-800">เฝ้าระวัง (Warning 1-2 วัน)</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 font-mono">{warningCount} รายการ</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                      <div
                        className="bg-slate-500 h-1.5 rounded-full"
                        style={{ width: `${totalBreaches > 0 ? (warningCount / totalBreaches) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>สัดส่วน: {totalBreaches > 0 ? ((warningCount / totalBreaches) * 100).toFixed(1) : 0}%</span>
                      <span>ค้างเกินเกณฑ์เริ่มต้น</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Financial Value at Risk */}
              {leftBottomTab === 'value' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {valueByDept.length > 0 ? (
                    valueByDept.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center font-mono shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">{item.department}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">({item.count} ออเดอร์)</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-900 font-mono">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className="bg-red-600 h-1.5 rounded-full"
                            style={{ width: `${Math.max(2, Math.min(100, item.share))}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>สัดส่วนมูลค่า: {item.share.toFixed(1)}%</span>
                          <span>เฉลี่ย/ออเดอร์: <span className="font-mono font-bold text-slate-800">{formatSmart(item.count > 0 ? item.value / item.count : 0)}</span></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่พบมูลค่าคำสั่งซื้อที่ค้าง
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ════════ RIGHT COLUMN (6 Cols = 50% Symmetry): OTD / Aging Profile & Watchlist ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">

            {/* Right Top Card: OTD Performance & Delay Aging Profile */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[48%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Timer size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    ประสิทธิภาพการส่งมอบและช่วงอายุความล่าช้า
                  </h2>
                </div>
                <div className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg font-medium">
                  เกณฑ์มาตรฐาน: <span className="font-bold text-slate-900">≥ 90%</span>
                </div>
              </div>

              {/* 2 Sub-blocks: OTD Gauge vs 4 Aging Tiers */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 flex-1 items-center">

                {/* Left Side: OTD Gauge Card (5 cols) */}
                <div className="sm:col-span-5 bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      อัตราส่งมอบตรงเวลา (OTD)
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-3xl font-black font-mono ${onTimeDeliveryRate >= 90 ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {onTimeDeliveryRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          onTimeDeliveryRate >= 90 ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, onTimeDeliveryRate))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                      <span>0%</span>
                      <span className="font-bold text-slate-700">เป้า ≥ 90%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: 4 Aging Tiers (7 cols) */}
                <div className="sm:col-span-7 bg-white rounded-xl p-2.5 border border-slate-200/80 flex flex-col justify-between h-full space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block border-b border-slate-100 pb-1">
                    การกระจายตามช่วงอายุที่ค้าง (Aging Profile)
                  </span>

                  <div className="space-y-1.5">
                    {agingBuckets.map((bucket, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 w-24">
                          <span className={`w-2 h-2 rounded-xs ${bucket.color} shrink-0`} />
                          <span className="font-semibold text-slate-700 truncate">{bucket.label}</span>
                        </div>
                        <div className="flex-1 mx-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${bucket.color} rounded-full`}
                            style={{ width: `${Math.min(100, bucket.percent)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-900 w-12 text-right">
                          {bucket.count} <span className="text-[9px] text-slate-400 font-normal">({bucket.percent.toFixed(0)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Alert Ribbon */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] shrink-0">
                <div className="flex items-center gap-1.5 text-red-700 font-semibold">
                  <AlertOctagon size={12} className="text-red-600 shrink-0" />
                  <span>มีคำสั่งซื้อและงานที่เกินกำหนดรวม {totalBreaches} รายการ ที่ต้องดำเนินการทันที</span>
                </div>
                <span className="text-slate-400 font-mono text-[9px]">OTD คำนวณจาก 100 รายการล่าสุด</span>
              </div>
            </div>

            {/* Right Bottom Card: Active Breaches Watchlist */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setWatchlistTab('orders')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      watchlistTab === 'orders'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock size={11} />
                    <span>คำสั่งซื้อเกิน SLA</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                        watchlistTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {breachedOrders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setWatchlistTab('jobs')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      watchlistTab === 'jobs'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Wrench size={11} />
                    <span>คิวงานเกิน SLA</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                        watchlistTab === 'jobs' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {breachedJobs.length}
                    </span>
                  </button>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-1.5">
                  <div className="relative w-28 sm:w-36">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหา..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-6 pr-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-[9px] px-1.5 py-0.5 font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">ทุกระดับ</option>
                    <option value="critical">วิกฤต (&gt;7ว.)</option>
                    <option value="high">ล่าช้า (3-7ว.)</option>
                    <option value="warning">เฝ้าระวัง (1-2ว.)</option>
                  </select>
                </div>
              </div>

              {/* Tab 1: Breached Orders Watchlist */}
              {watchlistTab === 'orders' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredOrders.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่พบคำสั่งซื้อที่เกินกำหนด SLA
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-1 px-2">คำสั่งซื้อ / ลูกค้า</th>
                          <th className="py-1 px-2">สถานะ / แผนก</th>
                          <th className="py-1 px-2 text-right">มูลค่า (฿)</th>
                          <th className="py-1 px-2 text-center">ค้าง / เกณฑ์</th>
                          <th className="py-1 px-2 text-center">ระดับ</th>
                          <th className="py-1 px-2 text-right">การดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[10px]">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-1.5 px-2">
                              <div className="font-bold text-slate-900 font-mono">{order.orderNumber}</div>
                              <div className="text-[9px] text-slate-500 truncate max-w-[130px]" title={order.companyName}>
                                {order.companyName}
                              </div>
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="font-medium text-slate-800 block truncate max-w-[100px]">{order.status}</span>
                              <span className="text-[9px] text-slate-400 block truncate max-w-[100px]">{order.department}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                              {order.value > 0 ? formatSmart(order.value) : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono">
                              <span className="font-bold text-red-600">{order.daysInStatus} วัน</span>
                              <span className="text-[9px] text-slate-400 block">(เกณฑ์ {order.threshold}ว.)</span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {renderSeverityBadge(order.severity, order.delayDays)}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <Link
                                href="/orders"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-red-600 hover:text-white text-slate-700 text-[9px] font-bold transition-all"
                              >
                                ตรวจสอบ
                                <ExternalLink size={9} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Breached Jobs Watchlist */}
              {watchlistTab === 'jobs' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredJobs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      ไม่พบคิวงานบริการที่เกินกำหนด SLA
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-1 px-2">เลขที่งาน / ลูกค้า</th>
                          <th className="py-1 px-2">ขั้นตอน / แผนก</th>
                          <th className="py-1 px-2">ผู้รับผิดชอบ</th>
                          <th className="py-1 px-2 text-center">ค้าง / เกณฑ์</th>
                          <th className="py-1 px-2 text-center">ระดับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[10px]">
                        {filteredJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-1.5 px-2">
                              <div className="font-bold text-slate-900 font-mono">{job.jobNumber}</div>
                              <div className="text-[9px] text-slate-500 truncate max-w-[130px]" title={job.customerName}>
                                {job.customerName}
                              </div>
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="font-medium text-slate-800 block truncate max-w-[110px]">{job.stepLabel}</span>
                              <span className="text-[9px] text-slate-400 block truncate max-w-[110px]">{job.department}</span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-600 truncate max-w-[90px]">
                              {job.technicianName}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono">
                              <span className="font-bold text-red-600">{job.daysInStatus} วัน</span>
                              <span className="text-[9px] text-slate-400 block">(เกณฑ์ {job.threshold}ว.)</span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {renderSeverityBadge(job.severity, job.delayDays)}
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

          {/* Section 1: Full Department Bottleneck Matrix */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers size={18} className="text-red-600" />
                  การกระจายตัวของรายการติดขัดจำแนกตามแผนก (Bottleneck Distribution)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบจำนวนคำสั่งซื้อและคิวงานบริการที่ล่าช้าในแต่ละส่วนงาน
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-red-600" />
                  <span className="text-slate-700 font-medium">คำสั่งซื้อ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-800" />
                  <span className="text-slate-700 font-medium">คิวงานบริการ</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="department" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} interval={0} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="orderCount" name="คำสั่งซื้อ" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  <Bar dataKey="jobCount" name="คิวงาน" fill="#334155" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 2: Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map((dept) => (
              <div key={dept.department} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">แผนก / หน่วยงาน</span>
                      <h4 className="text-base font-black text-slate-900 mt-0.5">{dept.department}</h4>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        dept.criticalCount > 0
                          ? 'bg-red-600 text-white'
                          : dept.totalCount > 0
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {dept.criticalCount > 0 ? `วิกฤต ${dept.criticalCount}` : dept.totalCount > 0 ? 'ล่าช้า' : 'ปกติ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">คำสั่งซื้อค้าง</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{dept.orderCount}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">คิวงานค้าง</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{dept.jobCount}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    ค้างนานเฉลี่ย: <strong className="text-slate-900 font-mono font-bold">{dept.avgDelayDays}</strong> วัน
                  </span>
                  <span className="text-red-600 font-mono text-[11px] font-bold">
                    สูงสุด {dept.maxDelayDays} วัน
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Section 3: Full Orders Overdue Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-red-600" />
              รายการคำสั่งซื้อที่เกินกำหนด SLA ทั้งหมด ({breachedOrders.length} รายการ)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">เลขที่คำสั่งซื้อ</th>
                    <th className="py-2.5 px-3">บริษัทลูกค้า</th>
                    <th className="py-2.5 px-3">แผนกรับผิดชอบ</th>
                    <th className="py-2.5 px-3 text-right">มูลค่า (฿)</th>
                    <th className="py-2.5 px-3 text-center">ค้าง (วัน)</th>
                    <th className="py-2.5 px-3 text-center">ระดับความล่าช้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breachedOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{o.companyName}</td>
                      <td className="py-2.5 px-3">{o.department} ({o.status})</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(o.value)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-red-600 font-bold">{o.daysInStatus} วัน</td>
                      <td className="py-2.5 px-3 text-center">{renderSeverityBadge(o.severity, o.delayDays)}</td>
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
