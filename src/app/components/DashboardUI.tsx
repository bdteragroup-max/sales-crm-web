'use client';

import React from 'react';
import {
  TrendingUp, Trophy, CalendarDays, PhoneCall,
  ArrowUpRight, Target, BarChart3, MapPin,
  Users, Briefcase, ChevronDown, Check, Calendar, Clock,
  PieChart as PieIcon, LineChart as LineIcon, AlertCircle,
  Zap, Package, DollarSign, ArrowRight,
  Lock, TrendingDown, AlertTriangle, RefreshCw
} from 'lucide-react';
import { 
  SalesOverviewChart, ProductMixPieChart, 
  RegionalBarChart, GrowthComparisonChart,
  ProductPerformanceChart, HorizontalLeaderboardChart,
  PipelineFunnelChart, LostReasonPieChart,
  ComposedActivityCorrelationChart, PipelineComposedStageChart,
  ProductPerformanceComposedChart, RegionalComposedChart,
  LostReasonSummaryChart, LostReasonByProductChart,
  ForecastAccuracyChart, TelesalesComposedChart, TelesalesFunnelChart
} from './DashboardCharts';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface DashboardUIProps {
  userFullName: string;
  userRole: string;
  metrics: {
    actualSales: { value: number, target: number, pct: number, short: number };
    revenue: { mtd: number, qtd: number, ytd: number };
    targetAch: { mtd: number, qtd: number };
    growth: { mom: number, yoy: number };
    avgTicketSize: { value: number };
    pipeline: { value: number, count: number };
    won: { value: number, count: number };
    lost: { value: number, count: number };
    conversionRate: { pct: number };
    forecast: { value: number };
    provinces: string[];
    teamGlobal?: {
      revenue: { mtd: number, qtd: number }
    } | null;
    
    // Enterprise Analytics Metrics
    teamWinRate: number;
    teamResolvedCount: number;
    funnelStages: any[];
    salesCycle: {
      avgTimeToWin: number;
      avgTimeToLose: number;
      prevAvgTimeToWin: number;
      prevAvgTimeToLose: number;
      productBreakdown: any[];
    };
    agingDeals: any[];
    pipelineFlow: {
      current: { newDeals: number, wonDeals: number, lostDeals: number, netChange: number };
      previous: { newDeals: number, wonDeals: number, lostDeals: number, netChange: number };
      mom: { newPct: number, wonPct: number, lostPct: number, netPct: number };
    };
    telesalesKPIs?: {
      weeklyCallGoal: number;
      monthlyCallGoal: number;
      appointmentGoal: number;
      connectionRateMin: number;
    };
    orderMetrics?: any[];
  };
  recentActivities: any[];
  nextMeetings: any[];
  dailyTrend: any[];
  salesReps: any[];
  salespersonIds: string[];
  filterMonth: number;
  filterYear: number;
  filterStartDate?: string;
  filterEndDate?: string;
  productMix: any[];
  productWinRates: any[];
  lostReasons: any[];
  lostReasonsAnalysis: {
    byProduct: any;
    bySalesperson: any;
  };
  regions: any[];
  customerSegments: any[];
  bizTypePipeline: any[];
  bizTypeWon: any[];
  employeePerformance: any[];
  dailyTarget: number;
  lostDealsWithoutReasonCount: number;
  forecastAccuracy: any[];
  topCustomers: any[];
  clvTiers: { platinum: { count: number; totalValue: number }; gold: { count: number; totalValue: number }; silver: { count: number; totalValue: number } };
  newVsExisting: { newRevenue: number; existingRevenue: number; newCount: number; existingCount: number; totalRevenue: number };
  atRiskCustomers: any[];
  atRiskDays: number;
  alerts: any[];
  telesalesRecords?: any[];
  telesalesBenchmark?: any[];
}

export default function DashboardUI({
  userFullName,
  userRole,
  metrics,
  recentActivities,
  nextMeetings,
  dailyTrend,
  salesReps,
  salespersonIds,
  filterMonth,
  filterYear,
  filterStartDate,
  filterEndDate,
  productMix,
  productWinRates,
  lostReasons,
  lostReasonsAnalysis,
  regions,
  customerSegments,
  bizTypePipeline,
  bizTypeWon,
  employeePerformance,
  dailyTarget,
  lostDealsWithoutReasonCount,
  forecastAccuracy,
  topCustomers,
  clvTiers,
  newVsExisting,
  atRiskCustomers,
  atRiskDays,
  alerts,
  telesalesRecords = [],
  telesalesBenchmark = [],
}: DashboardUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = React.useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleSalesperson = (id: string) => {
    let newIds = [...salespersonIds];
    if (newIds.includes(id)) newIds = newIds.filter(i => i !== id);
    else newIds.push(id);
    handleFilterChange('salespersonId', newIds.join(','));
  };

  const [visibleSeries, setVisibleSeries] = React.useState({
    cumulativeSales: true,
    calls: true,
    meetings: false,
    quotes: false,
  });

  const [regionalSort, setRegionalSort] = React.useState<'sales' | 'penetration' | 'salesPerCustomer'>('sales');
  const [showMoMOverlay, setShowMoMOverlay] = React.useState(false);
  const [showAllAlerts, setShowAllAlerts] = React.useState(false);
  const [advancedTab, setAdvancedTab] = React.useState<'customer' | 'forecast'>('customer');
  const [activeDashboardTab, setActiveDashboardTab] = React.useState<'sales' | 'telesales'>('sales');

  const todayStr = new Date().toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const getAchColor = (pct: number) => {
    if (pct >= 100) return '#22c55e';
    if (pct >= 70) return '#eab308';
    return '#ef4444';
  };

  const getConversionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50/80 border-green-200';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-50/80 border-yellow-200';
    return 'text-red-600 bg-red-50/80 border-red-200';
  };

  const sortedRegions = [...regions].sort((a, b) => {
    if (regionalSort === 'sales') return b.value - a.value;
    if (regionalSort === 'penetration') return a.penetrationRate - b.penetrationRate;
    return a.salesPerCustomer - b.salesPerCustomer;
  });

  // --- Telesales Analytics Data Processing ---
  const uniqueCompaniesOutreach = new Set<string>();
  const uniqueCompaniesConnected = new Set<string>();
  const uniqueCompaniesQualified = new Set<string>();
  const uniqueCompaniesForwarded = new Set<string>();

  telesalesRecords.forEach((r: any) => {
    if (r.companyId) {
      uniqueCompaniesOutreach.add(r.companyId);
      if (r.callStatus === 'รับสาย') {
        uniqueCompaniesConnected.add(r.companyId);
      }
      if (r.callOutcome === 'สนใจ' || r.callOutcome === 'นัดหมายสำเร็จ') {
        uniqueCompaniesQualified.add(r.companyId);
      }
      if (r.forwardTo && r.forwardTo.trim()) {
        uniqueCompaniesForwarded.add(r.companyId);
      }
    }
  });

  const currentFunnel = {
    outreach: uniqueCompaniesOutreach.size,
    connected: uniqueCompaniesConnected.size,
    qualified: uniqueCompaniesQualified.size,
    forwarded: uniqueCompaniesForwarded.size,
  };

  const connectedPct = currentFunnel.outreach > 0 ? (currentFunnel.connected / currentFunnel.outreach) * 100 : 0;
  const qualifiedPct = currentFunnel.outreach > 0 ? (currentFunnel.qualified / currentFunnel.outreach) * 100 : 0;
  const forwardedPct = currentFunnel.outreach > 0 ? (currentFunnel.forwarded / currentFunnel.outreach) * 100 : 0;

  // Team Benchmark (All telesales in active period)
  const uniqueBenchmarkOutreach = new Set<string>();
  const uniqueBenchmarkConnected = new Set<string>();
  const uniqueBenchmarkQualified = new Set<string>();
  const uniqueBenchmarkForwarded = new Set<string>();

  telesalesBenchmark.forEach((r: any) => {
    if (r.companyId) {
      uniqueBenchmarkOutreach.add(r.companyId);
      if (r.callStatus === 'รับสาย') {
        uniqueBenchmarkConnected.add(r.companyId);
      }
      if (r.callOutcome === 'สนใจ' || r.callOutcome === 'นัดหมายสำเร็จ') {
        uniqueBenchmarkQualified.add(r.companyId);
      }
      if (r.forwardTo && r.forwardTo.trim()) {
        uniqueBenchmarkForwarded.add(r.companyId);
      }
    }
  });

  const benchmarkOutreachSize = uniqueBenchmarkOutreach.size;
  const teamBenchmark = {
    connectedRate: benchmarkOutreachSize > 0 ? (uniqueBenchmarkConnected.size / benchmarkOutreachSize) * 100 : 0,
    qualifiedRate: benchmarkOutreachSize > 0 ? (uniqueBenchmarkQualified.size / benchmarkOutreachSize) * 100 : 0,
    forwardedRate: benchmarkOutreachSize > 0 ? (uniqueBenchmarkForwarded.size / benchmarkOutreachSize) * 100 : 0,
  };

  // Daily composed calls & appointments data
  const telesalesDailyData = dailyTrend.map((entry: any) => {
    const dayRecords = telesalesRecords.filter((r: any) => {
      try {
        const entryDate = new Date(entry.date).toDateString();
        const rDate = new Date(r.callDate || r.createdAt).toDateString();
        return entryDate === rDate;
      } catch (e) {
        return false;
      }
    });

    const appointmentsCount = dayRecords.filter(
      (r: any) => r.callOutcome === 'สนใจ' || r.callOutcome === 'นัดหมายสำเร็จ'
    ).length;

    return {
      date: entry.date,
      calls: dayRecords.length,
      appointments: appointmentsCount,
    };
  });

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 bg-gray-50/50 animate-fade-in pb-24 md:pb-4">
      <div 
        className="md:h-full min-h-screen md:min-h-0 w-full bg-white rounded-3xl border border-gray-100 shadow-xl flex flex-col md:overflow-hidden overflow-visible" 
        onClick={() => isSalespersonDropdownOpen && setIsSalespersonDropdownOpen(false)}
      >
        
        <div className="bg-white border-b border-gray-100 shrink-0 flex flex-col">
          {/* Tier 1: Main Header Row */}
          <div className="py-4 px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 bg-white">
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Zap size={20} className="text-brand-red fill-brand-red animate-pulse" />
                สรุปภาพรวมการขาย
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{todayStr}</p>
            </div>

            <div className="flex bg-slate-100/80 p-0.5 rounded-2xl border border-slate-200 shrink-0 self-start md:self-auto">
              <button
                onClick={() => setActiveDashboardTab('sales')}
                className={`text-[11px] font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeDashboardTab === 'sales'
                    ? 'bg-white text-gray-900 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={12} strokeWidth={2.5} />
                <span>ภาพรวมยอดขาย</span>
              </button>
              <button
                onClick={() => setActiveDashboardTab('telesales')}
                className={`text-[11px] font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeDashboardTab === 'telesales'
                    ? 'bg-white text-gray-900 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <PhoneCall size={12} strokeWidth={2.5} />
                <span>ประสิทธิภาพเทเลเซลล์</span>
              </button>
            </div>
          </div>

          {/* Tier 2: Filter Toolbar Row */}
          <div className="py-3 px-6 md:px-8 bg-gray-50/40 flex flex-wrap items-center gap-3">
            {userRole === 'ผู้จัดการ' && (
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen); }}
                  className="text-[11px] font-black bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center gap-2 hover:border-brand-red transition-all shadow-sm"
                >
                  <Users size={14} className="text-gray-400" />
                  {salespersonIds.length === 0 ? 'ทีมขายทั้งหมด' : `เลือกแล้ว (${salespersonIds.length})`}
                  <ChevronDown size={14} className={`ml-1 transition-transform ${isSalespersonDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSalespersonDropdownOpen && (
                  <div 
                    className="absolute top-full mt-2 left-0 w-64 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 py-4 max-h-80 overflow-y-auto custom-scrollbar" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div 
                      className="px-4 py-2 hover:bg-gray-50 flex items-center justify-between cursor-pointer group" 
                      onClick={() => handleFilterChange('salespersonId', '')}
                    >
                      <span className={`text-[11px] font-black ${salespersonIds.length === 0 ? 'text-brand-red' : 'text-gray-600'}`}>ทีมขายทั้งหมด</span>
                      {salespersonIds.length === 0 && <Check size={14} className="text-brand-red" />}
                    </div>
                    <div className="h-px bg-gray-50 my-2 mx-4" />
                    {salesReps.map(rep => (
                      <div 
                        key={rep.id} 
                        className="px-4 py-2 hover:bg-gray-50 flex items-center justify-between cursor-pointer group" 
                        onClick={() => toggleSalesperson(rep.id)}
                      >
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-black ${salespersonIds.includes(rep.id) ? 'text-brand-red' : 'text-gray-700'}`}>{rep.fullName}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{rep.role}</span>
                        </div>
                        {salespersonIds.includes(rep.id) && <Check size={14} className="text-brand-red" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 bg-white p-0.5 rounded-2xl border border-gray-200 shadow-sm">
              <button 
                onClick={() => {
                  const today = new Date();
                  const d = today.toISOString().split('T')[0];
                  handleFilterChange('startDate', d); 
                  handleFilterChange('endDate', d);
                }} 
                className="px-3 py-1.5 text-[10px] font-black text-gray-500 hover:text-brand-red transition-all"
              >
                วันนี้
              </button>
              <button 
                onClick={() => handleFilterChange('startDate', '')} 
                className="px-3 py-1.5 text-[10px] font-black text-gray-500 hover:text-brand-red transition-all"
              >
                เดือนนี้
              </button>
            </div>

            <div className="relative">
              <select 
                className="text-[11px] font-black bg-white border border-gray-200 rounded-2xl px-4 py-2 outline-none appearance-none cursor-pointer hover:border-brand-red transition-all pr-8 shadow-sm"
                onChange={(e) => handleFilterChange('province', e.target.value)}
                value={searchParams.get('province') || ''}
              >
                <option value="">ทุกจังหวัด</option>
                {[...metrics.provinces].sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronDown size={12} />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
              <input 
                type="date" 
                className="text-[10px] font-black text-gray-700 outline-none bg-transparent" 
                value={filterStartDate || ''} 
                onChange={(e) => handleFilterChange('startDate', e.target.value)} 
              />
              <ArrowRight size={12} className="text-gray-300" />
              <input 
                type="date" 
                className="text-[10px] font-black text-gray-700 outline-none bg-transparent" 
                value={filterEndDate || ''} 
                onChange={(e) => handleFilterChange('endDate', e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-gray-50/20">
          {activeDashboardTab === 'sales' ? (
            <>
              {/* 1. HIGH-LEVEL KPI STRIP */}
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <KPICard 
              label="เป้าหมายรายเดือน (MTD)" 
              value={`${metrics.targetAch.mtd.toFixed(1)}%`}
              subValue={`฿${(metrics.revenue.mtd / 1000000).toFixed(2)}M / ฿${(metrics.actualSales.target / 1000000).toFixed(1)}M`}
              statusColor={getAchColor(metrics.targetAch.mtd)}
              icon={<Target size={18} />}
              trend={metrics.growth.mom}
              benchmark={salespersonIds.length > 0 ? `Team: ฿${((metrics.teamGlobal?.revenue?.mtd || 0) / 1000000).toFixed(2)}M` : undefined}
            />
            <KPICard 
              label="อัตราปิดการขายชนะ (Win Rate)" 
              value={`${metrics.teamWinRate.toFixed(1)}%`}
              subValue={`ชนะ ${metrics.won.count} / ทั้งหมด ${metrics.teamResolvedCount} รายการ`}
              statusColor={metrics.teamWinRate >= 80 ? '#22c55e' : metrics.teamWinRate >= 50 ? '#eab308' : '#ef4444'}
              icon={<Trophy size={18} />}
            />
            <KPICard 
              label="การเติบโตเทียบปีก่อน (YoY)" 
              value={`${metrics.growth.yoy >= 0 ? '+' : ''}${metrics.growth.yoy.toFixed(1)}%`}
              subValue="Revenue Growth Rate"
              statusColor={metrics.growth.yoy >= 0 ? '#22c55e' : '#ef4444'}
              icon={<TrendingUp size={18} />}
            />
            <KPICard 
              label="คาดการณ์ยอดปิดรวม (Method 3)" 
              value={`฿${(metrics.forecast.value / 1000000).toFixed(2)}M`}
              subValue="Pipeline-Based (Most Accurate)"
              statusColor="#3b82f6"
              icon={<TrendingUp size={18} />}
              benchmark="ยอดสะสม + (ใบเสนอราคาคงค้าง × Win Rate)"
            />
          </section>

          {/* 1.1 ORDER FULFILLMENT METRICS */}
          {metrics.orderMetrics && metrics.orderMetrics.length > 0 && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                สถานะการจัดส่งออเดอร์ (Post-Sales Order Fulfillment)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['รอยืนยัน', 'กำลังผลิต', 'กำลังจัดส่ง', 'เสร็จสิ้น'].map(status => {
                  const data = metrics.orderMetrics?.find((m: any) => m.status === status);
                  const count = data?._count?.id || 0;
                  const value = data?._sum?.value || 0;
                  return (
                    <div key={status} className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1 border border-gray-100">
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">{status}</span>
                      <span className="text-xl font-black text-gray-900">{count} ออเดอร์</span>
                      <span className="text-[10px] font-bold text-gray-400">มูลค่า ฿{(value / 1000000).toFixed(2)}M</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}


          {/* 1.5 PRIORITIZED ALERTS BANNER */}
          {alerts.length > 0 && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  การแจ้งเตือนอัตโนมัติ ({alerts.length} รายการ)
                </h3>
                {alerts.length > 5 && (
                  <button onClick={() => setShowAllAlerts(!showAllAlerts)} className="text-[10px] font-black text-brand-red hover:underline">
                    {showAllAlerts ? 'ย่อ' : `ดูทั้งหมด (${alerts.length})`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(showAllAlerts ? alerts : alerts.slice(0, 5)).map((alert: any) => (
                  <div key={alert.id} className={`rounded-2xl p-4 border-l-4 flex flex-col gap-1 ${alert.priority === 'critical' ? 'bg-red-50/50 border-red-500' : 'bg-amber-50/50 border-amber-400'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${alert.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {alert.priority === 'critical' ? 'CRITICAL' : 'WARNING'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5">
                        {alert.type === 'deal_stuck' ? (
                          <>
                            <Lock size={10} className="text-red-500 shrink-0" />
                            <span>ดีลค้าง</span>
                          </>
                        ) : alert.type === 'low_activity' ? (
                          <>
                            <TrendingDown size={10} className="text-amber-500 shrink-0" />
                            <span>กิจกรรมต่ำ</span>
                          </>
                        ) : alert.type === 'below_target' ? (
                          <>
                            <AlertTriangle size={10} className="text-red-500 shrink-0" />
                            <span>ต่ำกว่าเป้า</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={10} className="text-blue-500 shrink-0" />
                            <span>คาดการณ์เปลี่ยน</span>
                          </>
                        )}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-gray-900">{alert.title}</span>
                    <span className="text-[9px] font-bold text-gray-500">{alert.detail}</span>
                    {alert.value > 0 && <span className="text-[10px] font-black text-gray-700 italic">฿{Math.round(alert.value).toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. MAIN TREND & ACTIVITY CORRELATION */}
          <div className="flex flex-col gap-8">
            {/* Daily Trend Chart (Full Width) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[520px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">แนวโน้มการขายรายวัน (Daily Sales Trend)</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">ยอดขายสะสม vs ปริมาณงาน (Cumulative Sales vs. Workload)</p>
                </div>
                <div className="flex gap-4">
                  {Object.entries(visibleSeries).map(([key, val]) => (
                    <button 
                      key={key} 
                      onClick={() => setVisibleSeries(prev => ({ ...prev, [key]: !val }))}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${val ? 'bg-brand-red text-white border-brand-red shadow-lg shadow-red-200' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                    >
                      {key === 'cumulativeSales' ? 'ยอดสะสม' : key === 'calls' ? 'โทร' : key === 'meetings' ? 'นัดหมาย' : 'ใบเสนอราคา'}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowMoMOverlay(!showMoMOverlay)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 ${showMoMOverlay ? 'bg-gray-700 text-white border-gray-700 shadow-lg shadow-gray-300' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                  >
                    <BarChart3 size={11} strokeWidth={2.5} />
                    <span>เทียบรอบก่อน (MoM)</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <SalesOverviewChart data={dailyTrend} visibleSeries={visibleSeries} dailyTarget={dailyTarget} showMoMOverlay={showMoMOverlay} />
              </div>
            </div>

            {/* Activity Correlation Chart (Full Width, directly below daily trend graph) */}
            {userRole === 'ผู้จัดการ' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[480px]">
                <div className="mb-8">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">ความสัมพันธ์ของกิจกรรมและยอดขาย (Relationship between Activity and Revenue)</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">เปรียบเทียบจำนวนการโทร/การเข้าพบเฉลี่ยต่อสัปดาห์กับการปิดยอดขายรายบุคคล (Compare average weekly calls/visits with individual sales closes)</p>
                </div>
                <div className="flex-1 min-h-0">
                  <ComposedActivityCorrelationChart data={employeePerformance} />
                </div>
              </div>
            )}
          </div>

          {/* 3. PIPELINE FLOW & MOVEMENT RIBBON */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-red" />
                การเคลื่อนไหวของโอกาสทางการขาย (Pipeline Flow Ribbon)
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">เปรียบเทียบความเคลื่อนไหวในรอบเดือนนี้เทียบกับเดือนก่อน (MoM)</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* New Deals */}
              <div className="flex flex-col gap-2 pt-4 md:pt-0 md:pl-4 first:pl-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ดีลใหม่เข้าท่อ (New)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">{metrics.pipelineFlow.current.newDeals} ดีล</span>
                  <span className={`flex items-center gap-0.5 text-[10px] font-black ${metrics.pipelineFlow.mom.newPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.pipelineFlow.mom.newPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(metrics.pipelineFlow.mom.newPct).toFixed(1)}%
                  </span>
                </div>
                <span className="text-[9px] font-bold text-gray-400">เดือนก่อน: {metrics.pipelineFlow.previous.newDeals} ดีล</span>
              </div>

              {/* Active Pipeline */}
              <div className="flex flex-col gap-2 pt-4 md:pt-0 md:pl-6">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">กำลังเจรจา (Active)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">{metrics.pipeline.count} ดีล</span>
                  <span className="text-[9px] font-bold text-gray-400">มูลค่า ฿{(metrics.pipeline.value / 1000000).toFixed(2)}M</span>
                </div>
                <span className="text-[9px] font-bold text-gray-400">เฉลี่ย ฿{metrics.pipeline.count > 0 ? Math.round(metrics.pipeline.value / metrics.pipeline.count).toLocaleString() : 0} / ดีล</span>
              </div>

              {/* Won Deals */}
              <div className="flex flex-col gap-2 pt-4 md:pt-0 md:pl-6">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ปิดการขายสำเร็จ (Won)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-green-600">{metrics.pipelineFlow.current.wonDeals} ดีล</span>
                  <span className={`flex items-center gap-0.5 text-[10px] font-black ${metrics.pipelineFlow.mom.wonPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.pipelineFlow.mom.wonPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(metrics.pipelineFlow.mom.wonPct).toFixed(1)}%
                  </span>
                </div>
                <span className="text-[9px] font-bold text-gray-400">เดือนก่อน: {metrics.pipelineFlow.previous.wonDeals} ดีล</span>
              </div>

              {/* Lost Deals */}
              <div className="flex flex-col gap-2 pt-4 md:pt-0 md:pl-6">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ปิดไม่สำเร็จ (Lost)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-red-500">{metrics.pipelineFlow.current.lostDeals} ดีล</span>
                  <span className={`flex items-center gap-0.5 text-[10px] font-black ${metrics.pipelineFlow.mom.lostPct >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {metrics.pipelineFlow.mom.lostPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(metrics.pipelineFlow.mom.lostPct).toFixed(1)}%
                  </span>
                </div>
                <span className="text-[9px] font-bold text-gray-400">เดือนก่อน: {metrics.pipelineFlow.previous.lostDeals} ดีล</span>
              </div>

              {/* Net Change */}
              <div className="flex flex-col gap-2 pt-4 md:pt-0 md:pl-6 bg-red-50/20 border border-brand-red/10 rounded-2xl p-4">
                <span className="text-[10px] font-black text-brand-red uppercase tracking-wider">การเปลี่ยนแปลงสุทธิ</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${metrics.pipelineFlow.current.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.pipelineFlow.current.netChange >= 0 ? '+' : ''}{metrics.pipelineFlow.current.netChange} ดีล
                  </span>
                  <span className={`flex items-center gap-0.5 text-[10px] font-black ${metrics.pipelineFlow.mom.netPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.pipelineFlow.mom.netPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(metrics.pipelineFlow.mom.netPct).toFixed(1)}%
                  </span>
                </div>
                <span className="text-[9px] font-bold text-gray-400">เดือนก่อน: {metrics.pipelineFlow.previous.netChange >= 0 ? '+' : ''}{metrics.pipelineFlow.previous.netChange} ดีล</span>
              </div>
            </div>
          </section>

          {/* 4. SALES CYCLE & AGING DEALS ANALYSIS */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales Cycle */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Clock size={16} className="text-brand-red" />
                  การวิเคราะห์วงจรการขาย (Sales Cycle)
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ระยะเวลาเฉลี่ยตั้งแต่เริ่มเปิดดีลจนปิดผลลัพธ์สำเร็จ/ไม่สำเร็จ</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-green-50/20 border border-green-100 rounded-3xl p-6 flex flex-col relative overflow-hidden">
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-wider">ระยะเวลาเฉลี่ยที่ชนะ (Avg Time to Win)</span>
                  <span className="text-3xl font-black text-green-700 mt-2">
                    {metrics.salesCycle.avgTimeToWin > 0 ? `${metrics.salesCycle.avgTimeToWin.toFixed(1)} วัน` : 'ไม่มีข้อมูล'}
                  </span>
                  {metrics.salesCycle.avgTimeToWin > 0 && metrics.salesCycle.prevAvgTimeToWin > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-black ${metrics.salesCycle.avgTimeToWin <= metrics.salesCycle.prevAvgTimeToWin ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.salesCycle.avgTimeToWin <= metrics.salesCycle.prevAvgTimeToWin ? 'ดีขึ้น' : 'ช้าลง'} {Math.abs(metrics.salesCycle.avgTimeToWin - metrics.salesCycle.prevAvgTimeToWin).toFixed(1)} วัน
                      </span>
                      <span className="text-[9px] font-bold text-gray-400">เทียบเดือนก่อน ({metrics.salesCycle.prevAvgTimeToWin.toFixed(1)} วัน)</span>
                    </div>
                  )}
                </div>

                <div className="bg-red-50/20 border border-red-100 rounded-3xl p-6 flex flex-col relative overflow-hidden">
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-wider">ระยะเวลาเฉลี่ยที่แพ้ (Avg Time to Lose)</span>
                  <span className="text-3xl font-black text-red-700 mt-2">
                    {metrics.salesCycle.avgTimeToLose > 0 ? `${metrics.salesCycle.avgTimeToLose.toFixed(1)} วัน` : 'ไม่มีข้อมูล'}
                  </span>
                  {metrics.salesCycle.avgTimeToLose > 0 && metrics.salesCycle.prevAvgTimeToLose > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-black ${metrics.salesCycle.avgTimeToLose <= metrics.salesCycle.prevAvgTimeToLose ? 'text-green-600' : 'text-red-500'}`}>
                        {metrics.salesCycle.avgTimeToLose <= metrics.salesCycle.prevAvgTimeToLose ? 'ดีขึ้น' : 'ช้าลง'} {Math.abs(metrics.salesCycle.avgTimeToLose - metrics.salesCycle.prevAvgTimeToLose).toFixed(1)} วัน
                      </span>
                      <span className="text-[9px] font-bold text-gray-400">เทียบเดือนก่อน ({metrics.salesCycle.prevAvgTimeToLose.toFixed(1)} วัน)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product type breakdown sub-list */}
              <div className="mt-6 border-t border-gray-50 pt-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">จำแนกตามประเภทผลิตภัณฑ์ (Product Breakdown)</span>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                  {metrics.salesCycle.productBreakdown.map((item) => (
                    <div key={item.productType} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
                      <span className="text-[11px] font-black text-gray-800">{item.productType}</span>
                      <div className="flex gap-4">
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold text-green-600 uppercase">Avg Win</span>
                          <span className="text-[11px] font-black text-gray-900">{item.avgTimeToWin > 0 ? `${item.avgTimeToWin.toFixed(1)} วัน` : '-'}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold text-red-500 uppercase">Avg Lose</span>
                          <span className="text-[11px] font-black text-gray-900">{item.avgTimeToLose > 0 ? `${item.avgTimeToLose.toFixed(1)} วัน` : '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {metrics.salesCycle.productBreakdown.length === 0 && (
                    <span className="text-[10px] text-gray-400 font-bold block text-center py-4">ไม่มีข้อมูลจำแนกผลิตภัณฑ์</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stale Pipeline / Aging Deals Alert */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle size={16} className="text-yellow-600" />
                  ด่วน! ดีลค้างคาในท่อส่งผลกระทบสูง (High-Impact Aging Deals)
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">รายการดีลที่ล่าช้าเกินเกณฑ์มาตรฐานเฉลี่ย 1.5 เท่า แยกตามชนิดผลิตภัณฑ์</p>
              </div>

              <div className="flex-1 mt-6 overflow-y-auto custom-scrollbar max-h-[300px] space-y-3 pr-2">
                {metrics.agingDeals.map((deal) => (
                  <div key={deal.id} className="bg-red-50/10 border-l-4 border-red-500 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm hover:bg-red-50/20 transition-all duration-300">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-gray-900">{deal.companyName}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${deal.isAbsoluteAging ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : deal.isDynamic ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                          {deal.isAbsoluteAging ? 'ตกค้างสะสม > 30 วัน' : deal.isDynamic ? 'เกณฑ์ไดนามิก' : 'เกณฑ์ทั่วไป'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <span>ผลิตภัณฑ์: {deal.productType}</span>
                        <span>•</span>
                        <span>สถานะ: {deal.status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-[9px] font-black uppercase tracking-wider">
                        <span className="text-brand-red">ผู้ดูแล: {deal.salespersonName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${deal.salespersonStatus === 'ใช้งานอยู่' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {deal.salespersonStatus}
                        </span>
                        {deal.managerStatus && deal.managerStatus !== 'ไม่ระบุ' && (
                          <span className="text-gray-400">
                            • ผู้จัดการ: {deal.managerStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex md:flex-col items-baseline md:items-end justify-between md:justify-start gap-1.5 shrink-0">
                      <span className="text-xs font-black text-red-600">
                        ค้าง {deal.daysStuck} วัน (เกณฑ์: {deal.threshold} วัน)
                      </span>
                      <span className="text-sm font-black text-gray-900">
                        ฿{deal.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}

                {metrics.agingDeals.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <Check size={36} className="text-green-500 mb-2" />
                    <span className="text-[11px] font-black text-gray-800 block">ยอดเยี่ยม! ไม่มีดีลตกค้างในขั้นตอนล่าช้าเกินเกณฑ์ปกติ</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">ทุกดีลคืบหน้าอยู่ในเกณฑ์มาตรฐานความเร็วปกติ</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 5. PIPELINE & PERFORMANCE DEEP DIVE */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Sales Funnel Composed Stage Chart */}
            <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[480px]">
              <div className="mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">การกระจายตัวของท่อการขาย (Pipeline Stages Breakdown)</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">เปรียบเทียบจำนวน รายรับจริง และมูลค่าที่ถ่วงน้ำหนักความน่าจะเป็นสำเร็จ (Weighted Pipeline Value)</p>
              </div>
              <div className="flex-1 min-h-0">
                <PipelineComposedStageChart data={metrics.funnelStages} />
              </div>
            </div>

            {/* Stage to Stage Conversion Rates Badge Table */}
            <div className="xl:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between h-[480px]">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">อัตราการเปลี่ยนสถานะดีล (Conversion Rates)</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">สถิติประสิทธิภาพการผลักดันดีลผ่านแต่ละขั้นตอนของท่อส่ง (Stage-to-Stage)</p>
              </div>

              <div className="flex-1 mt-6 space-y-4">
                {metrics.funnelStages.map((stage, idx) => {
                  if (idx === 0) return null; // First stage doesn't have a transition from prev
                  const prevStage = metrics.funnelStages[idx - 1];
                  const transName = `${prevStage.name} → ${stage.name}`;
                  const rate = stage.conversionRate;
                  const colorClass = getConversionRateColor(rate);
                  
                  return (
                    <div key={idx} className="bg-gray-50/50 border border-gray-100 rounded-3xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-gray-800">{transName}</span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border shrink-0 ${colorClass}`}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-gray-400">
                        <span>รายการเปลี่ยนสถานะ: {stage.count} / {prevStage.count} ดีล</span>
                        <span>มูลค่า: ฿{(stage.value / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-50 pt-4 flex flex-col gap-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">เกณฑ์ชี้วัดมาตรฐานอัตราเปลี่ยนผ่าน (Benchmark)</span>
                <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 mt-1">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span>ดีเยี่ยม (≥80%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span>ปกติ (50-79%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>ต้องปรับปรุง (&lt;50%)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. PRODUCT PERFORMANCE & MARGIN ANALYSIS */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-8">
            {/* Composed Product Margin Chart */}
            <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[480px]">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <Package size={16} className="text-brand-red" />
                    การวิเคราะห์ยอดขายและอัตรากำไรขั้นต้น (Product Margin Analysis)
                  </h3>
                  <span className="text-[9px] font-black bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full">
                    ค่าประมาณการ (Estimated Cost)
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  ยอดขายรวมสะสม เปรียบเทียบกำไรขั้นต้น และอัตรากำไรขั้นต้น (%) รายผลิตภัณฑ์
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <ProductPerformanceComposedChart data={productMix} />
              </div>
              <div className="mt-2 text-[9px] font-bold text-gray-400 italic">
                *หมายเหตุ: ข้อมูลอัตรากำไรและกำไรขั้นต้นเป็นค่าประมาณการเบื้องต้น (Based on estimated profit margin)
                <span className="block text-[8px] text-gray-300 mt-0.5">// TODO: Change to actual data when the accounting system is ready.</span>
              </div>
            </div>

            {/* Product Win Rate Leaderboard Table */}
            <div className="xl:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[480px]">
              <div className="mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Trophy size={16} className="text-iron-gold" />
                  อัตราการชนะตามชนิดผลิตภัณฑ์ (Product Win Rates)
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  สัดส่วนดีลที่สำเร็จจากจำนวนดีลที่ปิดผลลัพธ์ทั้งหมด
                </p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {productWinRates.map((prod) => {
                  const hasData = prod.closedCount > 0;
                  const rateVal = hasData ? prod.winRate : prod.companyWinRate;
                  const winRateColor = rateVal >= 80 ? 'text-green-600' : rateVal >= 50 ? 'text-yellow-600' : 'text-red-600';
                  return (
                    <div key={prod.productType} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <span className="text-[11px] font-black text-gray-800 block">{prod.productType}</span>
                        <span className="text-[9px] font-bold text-gray-400 font-sans">
                          {hasData 
                            ? `ปิดแล้วทั้งหมด: ${prod.closedCount} ดีล` 
                            : `เฉลี่ยบริษัท: ${prod.companyWinRate.toFixed(1)}% (${prod.companyClosedCount} ดีล)`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black block ${winRateColor}`}>
                          {hasData ? `${prod.winRate.toFixed(1)}%` : '-'}
                        </span>
                        {hasData && (
                          <span className="text-[9px] font-bold text-gray-400">({prod.wonCount}/{prod.closedCount} สำเร็จ)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {productWinRates.length === 0 && (
                  <span className="text-[10px] text-gray-400 font-bold block text-center py-8">ไม่มีข้อมูลการปิดดีลรายผลิตภัณฑ์</span>
                )}
              </div>
            </div>
          </section>

          {/* 7. SALES AREA COMPARISON: PERFORMANCE VS POTENTIAL */}
          <section className="grid grid-cols-1 gap-8 pb-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[520px]">
              <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <MapPin size={16} className="text-brand-red" />
                    วิเคราะห์ศักยภาพรายพื้นที่การขาย (Sales Area: Performance vs Potential)
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    เปรียบเทียบยอดขายรวม อัตราการเข้าถึงกลุ่มเป้าหมาย (Penetration %) และยอดขายเฉลี่ยต่อลูกค้ารายจังหวัด
                  </p>
                </div>

                {/* 3-way sort toggle */}
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 self-start md:self-auto">
                  <button
                    onClick={() => setRegionalSort('sales')}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all ${regionalSort === 'sales' ? 'bg-brand-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    ยอดขายรวม
                  </button>
                  <button
                    onClick={() => setRegionalSort('penetration')}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all ${regionalSort === 'penetration' ? 'bg-brand-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    การเข้าถึงตลาด (Penetration %)
                  </button>
                  <button
                    onClick={() => setRegionalSort('salesPerCustomer')}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all ${regionalSort === 'salesPerCustomer' ? 'bg-brand-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    ยอดขายต่อรายลูกค้า
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                <div className="lg:col-span-2 min-h-0">
                  <RegionalComposedChart data={sortedRegions} />
                </div>

                <div className="lg:col-span-1 overflow-y-auto custom-scrollbar pr-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">ตารางสถิติตามการเรียงลำดับ</span>
                  <div className="space-y-3">
                    {sortedRegions.map((region) => (
                      <div key={region.name} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-gray-800">{region.name}</span>
                          <span className="text-xs font-black text-brand-red">฿{region.value.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100/50 text-[9px] font-bold text-gray-500">
                          <div>
                            <span className="block text-gray-400 uppercase">อัตราการเข้าถึง</span>
                            <span className="text-[10px] font-black text-gray-700">{region.penetrationRate.toFixed(1)}% ({region.activeCustomers}/{region.potentialCustomers} ราย)</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 uppercase">ยอดขายต่อลูกค้า</span>
                            <span className="text-[10px] font-black text-gray-700">฿{Math.round(region.salesPerCustomer).toLocaleString()} / ราย</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sortedRegions.length === 0 && (
                      <span className="text-[10px] text-gray-400 font-bold block text-center py-8">ไม่มีข้อมูลภูมิภาค</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. LOSS REASONS DEEP DIVE ANALYSIS */}
          {lostDealsWithoutReasonCount > 0 && (
            <div id="lost-deals-no-reason-banner" className="mb-6 bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-4 animate-pulse shrink-0">
              <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-amber-900">มีดีลที่ยังไม่ได้ระบุสาเหตุที่พลาด</h4>
                <p className="text-xs font-bold text-amber-700/80 mt-1">
                  ตรวจพบรายการใบเสนอราคาที่ ปฏิเสธ หรือ ยกเลิก ทั้งหมด <span className="text-amber-900 font-black underline">{lostDealsWithoutReasonCount} รายการ</span> ที่ยังไม่ได้ทำการระบุสาเหตุในระบบ ผู้จัดการและพนักงานสามารถเข้าไปกรอกรายละเอียดเพิ่มย้อนหลังเพื่อปรับปรุงข้อมูลวิเคราะห์ให้ครบถ้วนสมบูรณ์
                </p>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
            {/* Top Lost Reasons and Value */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[480px]">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle size={16} className="text-brand-red" />
                  สถิติมูลค่าและสาเหตุที่พลาด (Loss Reason Summary & Value)
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  สถิติจำนวนครั้งและมูลค่ารวมดีลที่พลาดจำแนกตามสาเหตุ
                </p>
              </div>

              <div className="flex-1 min-h-0 mt-4">
                <LostReasonSummaryChart data={lostReasons} />
              </div>

              <div className="mt-4 border-t border-gray-50 pt-4 overflow-y-auto custom-scrollbar max-h-24 space-y-1">
                {lostReasons.map((item) => (
                  <div key={item.name} className="flex justify-between text-[10px] font-bold text-gray-500">
                    <span>{item.name}</span>
                    <span className="text-gray-700 font-black">
                      {item.value} ครั้ง (฿{item.lostValue.toLocaleString()})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Loss Reasons stacked by Product Type */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[480px]">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Package size={16} className="text-gray-500" />
                  สาเหตุที่พลาดจำแนกรายผลิตภัณฑ์ (Loss Reasons by Product)
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  แผนภูมิแท่งซ้อน (Stacked Bar) แสดงสาเหตุที่ดีลไม่สำเร็จจำแนกรายกลุ่มสินค้า
                </p>
              </div>

              <div className="flex-1 min-h-0 mt-4">
                <LostReasonByProductChart data={lostReasonsAnalysis.byProduct} />
              </div>
            </div>
          </section>

          {/* 9. ADVANCED ANALYTICS — Customer Insight & Forecast Accuracy */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand-red" />
                  วิเคราะห์เชิงลึก (Advanced Analytics)
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                <button onClick={() => setAdvancedTab('customer')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all ${advancedTab === 'customer' ? 'bg-brand-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  วิเคราะห์ลูกค้า
                </button>
                <button onClick={() => setAdvancedTab('forecast')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all ${advancedTab === 'forecast' ? 'bg-brand-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  ความแม่นยำคาดการณ์
                </button>
              </div>
            </div>

            {advancedTab === 'customer' && (
              <div className="space-y-8">
                {/* CLV Tiers + New vs Existing */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* CLV Tiers */}
                  {[
                    { label: 'Platinum (≥฿500K)', ...clvTiers.platinum, color: '#6366f1', bg: 'bg-indigo-50/50', border: 'border-indigo-200' },
                    { label: 'Gold (≥฿200K)', ...clvTiers.gold, color: '#D4AF37', bg: 'bg-yellow-50/50', border: 'border-yellow-200' },
                    { label: 'Silver (<฿200K)', ...clvTiers.silver, color: '#94a3b8', bg: 'bg-gray-50/50', border: 'border-gray-200' },
                  ].map(tier => (
                    <div key={tier.label} className={`${tier.bg} border ${tier.border} rounded-2xl p-4 flex flex-col gap-1`}>
                      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: tier.color }}>{tier.label}</span>
                      <span className="text-xl font-black text-gray-900">{tier.count} <span className="text-[10px] font-bold text-gray-400">ราย</span></span>
                      <span className="text-[10px] font-bold text-gray-500">฿{Math.round(tier.totalValue).toLocaleString()}</span>
                    </div>
                  ))}
                  {/* New vs Existing */}
                  <div className="bg-green-50/30 border border-green-200 rounded-2xl p-4 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-wider">ลูกค้าใหม่ vs ปัจจุบัน</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-green-600">{newVsExisting.newCount} ใหม่</span>
                      <span className="text-[10px] font-bold text-gray-400">/ {newVsExisting.existingCount} ปัจจุบัน</span>
                    </div>
                    {newVsExisting.totalRevenue > 0 && (
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(newVsExisting.newRevenue / newVsExisting.totalRevenue) * 100}%` }} />
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-gray-400">ใหม่ ฿{Math.round(newVsExisting.newRevenue).toLocaleString()} | ปัจจุบัน ฿{Math.round(newVsExisting.existingRevenue).toLocaleString()}</span>
                  </div>
                </div>

                {/* Top Customers Table */}
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">ลูกค้ามูลค่าสูงสุด Top 10 (All-time CLV)</span>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase">#</th>
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase">บริษัท</th>
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase">จังหวัด</th>
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase text-right">มูลค่ารวม (CLV)</th>
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase text-center">จำนวนดีล</th>
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase text-right">เฉลี่ย/ดีล</th>
                          <th className="p-3 text-[9px] font-black text-gray-500 uppercase text-center">ระดับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {topCustomers.map((c, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 text-[10px] font-black text-gray-400">{idx + 1}</td>
                            <td className="p-3 text-[11px] font-black text-gray-900">{c.companyName}</td>
                            <td className="p-3 text-[10px] font-bold text-gray-500">{c.province}</td>
                            <td className="p-3 text-[11px] font-black text-gray-900 text-right italic">฿{Math.round(c.totalValue).toLocaleString()}</td>
                            <td className="p-3 text-[11px] font-black text-gray-700 text-center">{c.dealCount}</td>
                            <td className="p-3 text-[10px] font-bold text-gray-500 text-right">฿{Math.round(c.avgDealSize).toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${c.tier === 'Platinum' ? 'bg-indigo-100 text-indigo-700' : c.tier === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                {c.tier}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {topCustomers.length === 0 && <span className="text-[10px] text-gray-400 font-bold block text-center py-6">ไม่มีข้อมูลลูกค้า</span>}
                  </div>
                </div>

                {/* At-Risk Customers */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                      <AlertCircle size={12} /> ลูกค้ากลุ่มเสี่ยง (At-Risk) — ไม่ซื้อมากกว่า {atRiskDays} วัน
                    </span>
                    <select
                      className="text-[10px] font-black bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                      value={atRiskDays}
                      onChange={(e) => handleFilterChange('atRiskDays', e.target.value)}
                    >
                      <option value="30">30 วัน</option>
                      <option value="60">60 วัน</option>
                      <option value="90">90 วัน</option>
                      <option value="120">120 วัน</option>
                    </select>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-2">
                    {atRiskCustomers.map((c, idx) => (
                      <div key={idx} className="bg-red-50/20 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="text-[11px] font-black text-gray-900 truncate">{c.companyName}</span>
                          <span className="text-[9px] font-bold text-gray-400">{c.province} • ผู้ดูแล: {c.ownerName}</span>
                          <span className="text-[9px] font-bold text-red-500">ซื้อครั้งล่าสุด: {c.lastProductType} (฿{Math.round(c.lastDealValue).toLocaleString()})</span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs font-black text-red-600 italic">{c.daysSinceLastPurchase} วัน</span>
                          <span className="text-[9px] font-bold text-gray-400">CLV ฿{Math.round(c.lifetimeValue).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {atRiskCustomers.length === 0 && (
                      <div className="text-center py-8">
                        <Check size={24} className="text-green-500 mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-gray-400">ไม่มีลูกค้ากลุ่มเสี่ยงในเกณฑ์ที่เลือก</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {advancedTab === 'forecast' && (
              <div className="space-y-6">
                <div className="h-[350px]">
                  <ForecastAccuracyChart data={forecastAccuracy} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {forecastAccuracy.map((m) => (
                    <div key={m.month} className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex flex-col gap-1 text-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase">{m.month}</span>
                      <span className={`text-[10px] font-black ${m.direction === 'under' ? 'text-green-600' : m.direction === 'over' ? 'text-red-600' : 'text-blue-600'} flex items-center justify-center gap-1`}>
                        {m.direction === 'under' ? (
                          <>
                            <TrendingUp size={11} className="text-green-500 shrink-0" />
                            <span>ขายทะลุเป้า</span>
                          </>
                        ) : m.direction === 'over' ? (
                          <>
                            <TrendingDown size={11} className="text-red-500 shrink-0" />
                            <span>ต่ำกว่าเป้า</span>
                          </>
                        ) : (
                          <>
                            <Target size={11} className="text-blue-500 shrink-0" />
                            <span>แม่นยำ</span>
                          </>
                        )}
                      </span>
                      <span className="text-lg font-black text-gray-900">{m.accuracy}%</span>
                      <span className="text-[8px] font-bold text-gray-400">เป้า ฿{(m.forecast / 1000).toFixed(0)}K / จริง ฿{(m.actual / 1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-gray-400 italic">
                  *แหล่งที่มาของ Forecast = เป้าหมายรายเดือน (MonthlyTarget) • ความแม่นยำ = Min(เป้า/จริง, จริง/เป้า) × 100
                </p>
              </div>
            )}
          </section>

          {/* 7. DETAILED TEAM PERFORMANCE TABLE */}
          {userRole === 'ผู้จัดการ' && (
            <section className="grid grid-cols-1 gap-8 pb-12">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                      <Users size={16} className="text-brand-red" />
                      ตารางสรุปผลงานรายบุคคล
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">สถิติสะสม ผลสัมฤทธิ์ตามเป้าหมาย อัตราการชนะ และปริมาณงานเฉลี่ยรายสัปดาห์</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">สังกัด</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">รายชื่อ</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">ตำแหน่ง</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">ยอดขายสะสม</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-right bg-blue-50/20 text-blue-600">เป้าหมาย MTD</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-center bg-blue-50/20">เปรียบเทียบเป้า</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-center bg-red-50/30">อัตราการชนะ (Win Rate)</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-center bg-gray-50">โทรเฉลี่ย/สัปดาห์</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-center bg-gray-50">พบเฉลี่ย/สัปดาห์</th>
                        <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">วงจรปิดดีลสำเร็จ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {employeePerformance.map((emp) => {
                        const targetColor = emp.achievementPct >= 100 ? '#22c55e' : emp.achievementPct >= 70 ? '#eab308' : '#ef4444';
                        
                        return (
                          <tr 
                            key={emp.id} 
                            onClick={() => toggleSalesperson(emp.id)}
                            className={`hover:bg-gray-50/80 transition-all cursor-pointer group ${salespersonIds.includes(emp.id) ? 'bg-red-50/30' : ''}`}
                          >
                            <td className="p-4 text-[11px] font-bold text-gray-500">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${salespersonIds.includes(emp.id) ? 'bg-brand-red animate-pulse' : 'bg-transparent'}`} />
                                {emp.branch}
                              </div>
                            </td>
                            <td className="p-4 text-[11px] font-black text-gray-900 group-hover:text-brand-red transition-colors">{emp.fullName}</td>
                            <td className="p-4 text-[11px] font-bold text-gray-400 italic">{emp.position}</td>
                            <td className="p-4 text-[11px] font-black text-gray-900 text-right italic">
                              {emp.won > 0 ? `฿${emp.won.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-4 text-[11px] font-bold text-gray-400 text-right italic bg-blue-50/5">
                              {emp.target > 0 ? `฿${emp.target.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-4 text-[11px] font-black text-center bg-blue-50/5">
                              <div className="flex flex-col items-center gap-1.5">
                                <span style={{ color: targetColor }} className="font-black">
                                  {emp.achievementPct > 0 ? `${emp.achievementPct.toFixed(1)}%` : '-'}
                                </span>
                                {emp.target > 0 && (
                                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-500" 
                                      style={{ 
                                        width: `${Math.min(100, emp.achievementPct)}%`, 
                                        backgroundColor: targetColor 
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-[11px] font-black text-center bg-red-50/5">
                              <div className="flex flex-col items-center">
                                <span className={emp.winRate >= 80 ? 'text-green-600' : emp.winRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                                  {emp.winRate > 0 ? `${emp.winRate.toFixed(1)}%` : '0%'}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400">({emp.resolvedSample})</span>
                              </div>
                            </td>
                            <td className="p-4 text-[11px] font-black text-gray-900 text-center bg-gray-50/30">
                              {emp.weeklyCalls > 0 ? `${emp.weeklyCalls.toFixed(1)} ครั้ง` : '-'}
                            </td>
                            <td className="p-4 text-[11px] font-black text-gray-900 text-center bg-gray-50/30">
                              {emp.weeklyMeetings > 0 ? `${emp.weeklyMeetings.toFixed(1)} ครั้ง` : '-'}
                            </td>
                            <td className="p-4 text-[11px] font-black text-gray-900 text-center">
                              {emp.avgTimeToWin > 0 ? `${emp.avgTimeToWin.toFixed(1)} วัน` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-brand-red text-white">
                        <td colSpan={3} className="p-4 text-[10px] font-black uppercase tracking-widest">รวมเฉลี่ยทั้งทีม</td>
                        <td className="p-4 text-[11px] font-black text-right">
                          ฿{employeePerformance.reduce((acc, emp) => acc + (Number(emp.won) || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-[11px] font-black text-right bg-blue-900/20">
                          ฿{employeePerformance.reduce((acc, emp) => acc + (Number(emp.target) || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-[11px] font-black text-center bg-blue-900/20">
                          {((employeePerformance.reduce((acc, emp) => acc + (Number(emp.won) || 0), 0) / (employeePerformance.reduce((acc, emp) => acc + (Number(emp.target) || 1), 0) || 1)) * 100).toFixed(1)}%
                        </td>
                        <td className="p-4 text-[11px] font-black text-center bg-red-900/20">
                          {metrics.teamWinRate.toFixed(1)}%
                        </td>
                        <td className="p-4 text-[11px] font-black text-center bg-black/10">
                          {(employeePerformance.reduce((acc, emp) => acc + (Number(emp.weeklyCalls) || 0), 0) / Math.max(1, employeePerformance.length)).toFixed(1)} ครั้ง
                        </td>
                        <td className="p-4 text-[11px] font-black text-center bg-black/10">
                          {(employeePerformance.reduce((acc, emp) => acc + (Number(emp.weeklyMeetings) || 0), 0) / Math.max(1, employeePerformance.length)).toFixed(1)} ครั้ง
                        </td>
                        <td className="p-4 text-[11px] font-black text-center bg-red-900/20">
                          {metrics.salesCycle.avgTimeToWin > 0 ? `${metrics.salesCycle.avgTimeToWin.toFixed(1)} วัน` : '-'}
                        </td>
                        <td className="p-4 text-[11px] font-black text-center bg-black/10">
                          {employeePerformance.reduce((acc, emp) => acc + (Number(emp.callsTotal) || 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>
          )}
            </>
          ) : (
            <>
              {/* 1. TELESALES HIGH-LEVEL KPI STRIP */}
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard 
                  label="ลูกค้าที่ติดต่อทั้งหมด (Outreach)" 
                  value={`${currentFunnel.outreach.toLocaleString()} ราย`}
                  subValue={`โทรจริง: ${telesalesRecords.length.toLocaleString()} / เป้าเดือน: ${(metrics.telesalesKPIs?.monthlyCallGoal ?? 1200).toLocaleString()} สาย (เป้าสัปดาห์: ${(metrics.telesalesKPIs?.weeklyCallGoal ?? 300).toLocaleString()})`}
                  statusColor="#ff2301"
                  icon={<PhoneCall size={18} />}
                />
                <KPICard 
                  label="อัตราติดต่อได้ (Connection Rate)" 
                  value={`${connectedPct.toFixed(1)}%`}
                  subValue={`ติดต่อสำเร็จ ${currentFunnel.connected} / ทั้งหมด ${currentFunnel.outreach} ราย`}
                  statusColor="#3b82f6"
                  icon={<Zap size={18} />}
                  benchmark={`เป้าขั้นต่ำ: ${Math.round((metrics.telesalesKPIs?.connectionRateMin ?? 0.6) * 100)}% (เฉลี่ยทีม: ${teamBenchmark.connectedRate.toFixed(1)}%)`}
                />
                <KPICard 
                  label="อัตราความสนใจ (Interest Rate)" 
                  value={`${qualifiedPct.toFixed(1)}%`}
                  subValue={`นัดหมายสำเร็จ ${currentFunnel.qualified} / เป้าหมาย: ${metrics.telesalesKPIs?.appointmentGoal ?? 20} ครั้ง`}
                  statusColor="#f59e0b"
                  icon={<Trophy size={18} />}
                  benchmark={`ค่าเฉลี่ยทีม: ${teamBenchmark.qualifiedRate.toFixed(1)}%`}
                />
                <KPICard 
                  label="ส่งมอบงานต่อให้ทีมขาย (Forwarded)" 
                  value={`${forwardedPct.toFixed(1)}%`}
                  subValue={`ส่งต่อสำเร็จ ${currentFunnel.forwarded} ราย`}
                  statusColor="#d4af37"
                  icon={<TrendingUp size={18} />}
                  benchmark={`ค่าเฉลี่ยทีม: ${teamBenchmark.forwardedRate.toFixed(1)}%`}
                />
              </section>

              {/* 2. TREND & FUNNEL SPLIT GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Daily Calls Trend Composed Chart (Left 2 columns) */}
                <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[520px]">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">แนวโน้มการโทรและนัดหมายรายวัน (Daily Outreach Trend)</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">ปริมาณสายที่โทรสะสม vs จำนวนผู้ที่สนใจ/นัดหมายสำเร็จ</p>
                  </div>
                  <div className="flex-1 min-h-0 mt-6 relative">
                    <TelesalesComposedChart data={telesalesDailyData} />
                  </div>
                </div>

                {/* Conversion Funnel Widget (Right 1 column) */}
                <div className="xl:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-[520px] justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">กรวยประสิทธิภาพการสนทนา (Connection Funnel)</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">สถิติแปลงสถานะลูกค้าเทเลเซลล์เทียบกับค่าเฉลี่ยรวมของทั้งทีม</p>
                  </div>
                  <div className="flex-1 flex items-center mt-4">
                    <TelesalesFunnelChart currentFunnel={currentFunnel} teamBenchmark={teamBenchmark} />
                  </div>
                </div>
              </div>

              {/* 3. TELESALES LEAD FORWARD TABLE & DETAILS */}
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    ประวัติสายการโทรเทเลเซลล์ (Telesales Dials History)
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">รายการสนทนาล่าสุด ผลการโทร และสถานะการส่งมอบงานให้ทีมขายหน้างาน</p>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  {telesalesRecords.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400">ไม่พบประวัติสายการโทรในช่วงเวลาที่เลือก</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">วันและเวลาที่โทร</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">สถานะการรับสาย</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">ผลลัพธ์การสนทนา</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">ส่งต่อให้เจ้าหน้าที่</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">กำหนดติดต่อกลับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {telesalesRecords.slice(0, 15).map((log: any, index: number) => (
                          <tr key={log.id || index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-[11px] font-black text-slate-900">
                              {new Date(log.createdAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} น.
                            </td>
                            <td className="p-4">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${log.callStatus === 'รับสาย' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                {log.callStatus || 'ไม่ระบุ'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                log.callOutcome === 'สนใจ' || log.callOutcome === 'นัดหมายสำเร็จ' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-slate-50 text-slate-600 border border-slate-100'
                              }`}>
                                {log.callOutcome || 'ไม่มีข้อมูล'}
                              </span>
                            </td>
                            <td className="p-4 text-[11px] font-bold text-slate-900">
                              {log.forwardTo ? (
                                <div className="flex items-center gap-1 text-brand-red">
                                  <ArrowRight size={12} />
                                  <span>{log.forwardTo}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-4 text-[11px] font-bold text-slate-500">
                              {log.callbackAt ? (
                                <span>{new Date(log.callbackAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </>
          )}

        </div>
      </div>
    </main>
  );
}

function KPICard({ label, value, subValue, statusColor = '#4B5563', icon, trend, benchmark }: any) {
  return (
    <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        {React.cloneElement(icon, { size: 56, strokeWidth: 3 })}
      </div>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5 border border-gray-100 text-gray-400 group-hover:text-white group-hover:bg-brand-red transition-all duration-300" style={{ borderLeft: `4px solid ${statusColor}` }}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-3xl font-black text-gray-900 tracking-tighter number" style={{ color: statusColor === '#4B5563' ? '#111827' : statusColor }}>{value}</h4>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-black number ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      
      <div className="mt-2 flex flex-col gap-1">
        <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 number">
          <Clock size={10} className="text-gray-300" /> {subValue}
        </p>
        {benchmark && (
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter flex items-center gap-1">
            <BarChart3 size={10} strokeWidth={2.5} /> {benchmark}
          </p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-50">
        <div className="h-full opacity-40 transition-all duration-1000 group-hover:opacity-70" style={{ backgroundColor: statusColor, width: '100%' }} />
      </div>
    </div>
  );
}
