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
  ChevronDown,
  ExternalLink,
  User,
  Building2,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  ShieldAlert,
  Wallet,
  Activity
} from 'lucide-react';
import DailyCashReceiptTab from './components/DailyCashReceiptTab';
import CorporateLoansTab from './components/CorporateLoansTab';
import MonthOverMonthTab from './components/MonthOverMonthTab';
import FinancialDrilldownModal, { DrilldownItem } from './components/FinancialDrilldownModal';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
}

interface AccountingDashboardClientProps {
  data: any;
}

export default function AccountingDashboardClient({ data }: AccountingDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStartDate = searchParams?.get('startDate') || '';
  const currentEndDate = searchParams?.get('endDate') || '';
  const currentEntity = searchParams?.get('entity') || 'ALL';

  const [selectedEntity, setSelectedEntity] = useState(currentEntity);
  const [selectedMonth, setSelectedMonth] = useState('กันยายน 2569');

  // Main Tab Navigation:
  // 'daily': Section 1: Customer Status and Daily Cash Receipt Dashboard
  // 'loans': Section 2: Corporate Loans & Customer Risk (Mockup Tab 1)
  // 'mom': Section 2: Month-over-Month Comparison (Mockup Tab 2)
  // 'projects': Legacy Ongoing Projects lifecycle
  const [activeTab, setActiveTab] = useState<'daily' | 'loans' | 'mom' | 'projects'>('daily');

  // Drilldown Modal State
  const [drilldownItem, setDrilldownItem] = useState<DrilldownItem | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const handleOpenDrilldown = (item: DrilldownItem) => {
    setDrilldownItem(item);
    setIsDrilldownOpen(true);
  };

  const handleEntityChange = (newEntity: string) => {
    setSelectedEntity(newEntity);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newEntity === 'ALL') {
      params.delete('entity');
    } else {
      params.set('entity', newEntity);
    }
    router.push(`?${params.toString()}`);
  };

  // Legacy Project search & filters
  const [projectSearch, setProjectSearch] = useState('');
  const [projectProfitFilter, setProjectProfitFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');
  const [projectPage, setProjectPage] = useState(1);
  const projectPageSize = 10;

  const ongoingProjects = data.ongoingProjects || [];
  const filteredProjects = useMemo(() => {
    return ongoingProjects.filter((p: any) => {
      const q = projectSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.projectName && p.projectName.toLowerCase().includes(q)) ||
        (p.projectNumber && p.projectNumber.toLowerCase().includes(q)) ||
        (p.clientName && p.clientName.toLowerCase().includes(q)) ||
        (p.primaryKeyword && p.primaryKeyword.toLowerCase().includes(q));

      const profit = p.income - p.expense;
      const matchProfit =
        projectProfitFilter === 'ALL'
          ? true
          : projectProfitFilter === 'PROFIT'
          ? profit >= 0
          : profit < 0;

      return matchSearch && matchProfit;
    });
  }, [ongoingProjects, projectSearch, projectProfitFilter]);

  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const paginatedProjects = filteredProjects.slice(
    (projectPage - 1) * projectPageSize,
    projectPage * projectPageSize
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Entity & Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              Dashboard การเงิน & บริหารลูกหนี้การค้า
            </h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold uppercase tracking-wider border border-blue-200 shrink-0">
              Executive & Accounting
            </span>
          </div>
          <p className="text-xs text-slate-500">
            ภาพรวมลูกหนี้การค้า การรับชำระเงิน การติดตามหนี้รายวัน และการบริหารความเสี่ยงเครดิตกลุ่มบริษัท (TG, TE, TP)
          </p>
        </div>

        {/* Right Controls Island */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Entity Selector (รวม 3 บริษัท / TG / TE / TP) */}
          <div className="relative flex items-center">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedEntity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="text-xs font-semibold pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
            >
              <option value="ALL">รวม 3 บริษัท (TG, TE, TP)</option>
              <option value="TG">TG: บริษัท เทอรา กรุ๊ป จำกัด</option>
              <option value="TE">TE: บริษัท เทอรา อิเล็คทริค จำกัด</option>
              <option value="TP">TP: บริษัท เทอรา พาวเวอร์ จำกัด</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Month/Year Selector */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
            >
              <option value="กันยายน 2569">กันยายน 2569</option>
              <option value="สิงหาคม 2569">สิงหาคม 2569</option>
              <option value="กรกฎาคม 2569">กรกฎาคม 2569</option>
              <option value="มิถุนายน 2569">มิถุนายน 2569</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Compact Live Indicator Capsule with tooltip */}
          <div 
            title={data?.dataStatus?.lastBankSyncTime ? `อัปเดตล่าสุด: ${data.dataStatus.lastBankSyncTime}` : 'ข้อมูลล่าสุดในระบบ'}
            className="text-xs font-medium px-2.5 py-2 bg-slate-50 rounded-xl text-slate-600 border border-slate-200 flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-help"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="hidden sm:inline">เรียลไทม์</span>
          </div>
        </div>
      </div>

      {/* 2. Unified Modern Segmented Tab Navigation - Balanced 4-Column Grid */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-center ${
            activeTab === 'daily'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Clock className={`w-4 h-4 shrink-0 ${activeTab === 'daily' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className="truncate">สถานะลูกหนี้ & รับเงินรายวัน (Morning)</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-center ${
            activeTab === 'loans'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'loans' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className="truncate">บริหารความเสี่ยง & วงเงิน</span>
          {data.tradeCreditSummary?.overdueCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">
              {data.tradeCreditSummary.overdueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mom')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-center ${
            activeTab === 'mom'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'mom' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="truncate">เปรียบเทียบเดือนต่อเดือน (MoM)</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-center ${
            activeTab === 'projects'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Briefcase className={`w-4 h-4 shrink-0 ${activeTab === 'projects' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="truncate">โครงการ & ประสิทธิภาพ</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold shrink-0">
            {ongoingProjects.length}
          </span>
        </button>
      </div>

      {/* 3. Tab Content Panels */}
      {activeTab === 'daily' && (
        <DailyCashReceiptTab data={data} onOpenDrilldown={handleOpenDrilldown} />
      )}

      {activeTab === 'loans' && (
        <CorporateLoansTab data={data} onOpenDrilldown={handleOpenDrilldown} />
      )}

      {activeTab === 'mom' && (
        <MonthOverMonthTab data={data} />
      )}

      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                ประสิทธิภาพโครงการและผลกำไรสะสม (Project Performance)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                ติดตามรายรับ รายจ่าย ค่าใช้จ่าย PO และกำไรขั้นต้นของแต่ละโครงการ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={projectProfitFilter}
                onChange={(e: any) => { setProjectProfitFilter(e.target.value); setProjectPage(1); }}
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50"
              >
                <option value="ALL">ทุกโครงการ ({ongoingProjects.length})</option>
                <option value="PROFIT">โครงการที่มีกำไร</option>
                <option value="LOSS">โครงการที่ขาดทุน/ยังไม่คุ้มทุน</option>
              </select>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโครงการ, ลูกค้า..."
                  value={projectSearch}
                  onChange={(e) => { setProjectSearch(e.target.value); setProjectPage(1); }}
                  className="text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                <tr>
                  <th className="py-3 px-3.5">รหัส / ชื่อโครงการ</th>
                  <th className="py-3 px-3.5">ลูกค้า</th>
                  <th className="py-3 px-3.5 text-right">งบประมาณ</th>
                  <th className="py-3 px-3.5 text-right">รายรับจริง</th>
                  <th className="py-3 px-3.5 text-right">รายจ่าย PO</th>
                  <th className="py-3 px-3.5 text-right">กำไร / ขาดทุน</th>
                  <th className="py-3 px-3.5 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      ไม่พบข้อมูลโครงการ
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((proj: any) => {
                    const profit = proj.income - proj.expense;
                    const isProfit = profit >= 0;
                    return (
                      <tr key={proj.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-gray-900">{proj.projectName}</div>
                          <div className="text-[11px] font-mono text-gray-400">{proj.projectNumber}</div>
                        </td>
                        <td className="py-3 px-3.5 text-gray-800">{proj.clientName}</td>
                        <td className="py-3 px-3.5 text-right font-medium">{formatCurrency(proj.budget)}</td>
                        <td className="py-3 px-3.5 text-right font-bold text-emerald-600">{formatCurrency(proj.income)}</td>
                        <td className="py-3 px-3.5 text-right font-medium text-rose-600">{formatCurrency(proj.expense)}</td>
                        <td className={`py-3 px-3.5 text-right font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(profit)}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {proj.status || 'Ongoing'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalProjectPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
              <span>หน้า {projectPage} จาก {totalProjectPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={projectPage <= 1}
                  onClick={() => setProjectPage(p => p - 1)}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  ก่อนหน้า
                </button>
                <button
                  disabled={projectPage >= totalProjectPages}
                  onClick={() => setProjectPage(p => p + 1)}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Financial Drilldown Modal */}
      <FinancialDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        item={drilldownItem}
      />
    </div>
  );
}
