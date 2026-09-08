'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Building2,
  Search,
  ExternalLink,
  X,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  ArrowRight,
  PackageCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface StoreDashboardProps {
  pendingPOs: any[];
  receivedPOs: any[];
  pendingRequisitionsCount?: number;
}

export default function StoreDashboardClient({
  pendingPOs,
  receivedPOs,
  pendingRequisitionsCount = 0
}: StoreDashboardProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<'ALL' | 'TE' | 'TP' | 'TG'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming' | 'allPending' | 'received'>('overdue');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  // Helper to extract true PO document date (prioritize PO number pattern PO69-[EPG]MMDD)
  const extractDateFromPO = (po: any) => {
    if (po.poNumber) {
      const match = po.poNumber.toUpperCase().match(/^PO(\d{2})-[EPG](\d{2})(\d{2})/);
      if (match) {
        const yy = parseInt(match[1], 10);
        const mm = parseInt(match[2], 10);
        const dd = parseInt(match[3], 10);
        const year = yy >= 50 ? 2500 + yy - 543 : 2000 + yy;
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          return { year, month: mm - 1, day: dd };
        }
      }
    }
    const d = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : new Date());
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  };

  const getCompanyFromPO = (poNumber: string = ''): 'TE' | 'TP' | 'TG' | 'OTHER' => {
    const upper = poNumber.toUpperCase();
    if (upper.includes('-E')) return 'TE';
    if (upper.includes('-P')) return 'TP';
    if (upper.includes('-G')) return 'TG';
    return 'OTHER';
  };

  // Company styling helper
  const getCompanyBadge = (comp: string) => {
    switch (comp) {
      case 'TE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TP':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TG':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Top-level filter function
  const matchesFilter = (po: any) => {
    const { year, month } = extractDateFromPO(po);
    const company = getCompanyFromPO(po.poNumber);

    if (selectedYear !== 'ALL' && year.toString() !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && month.toString() !== selectedMonth) return false;
    if (selectedCompany !== 'ALL' && company !== selectedCompany) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const poNum = (po.poNumber || '').toLowerCase();
      const prNum = (po.prNumber || '').toLowerCase();
      const vendor = (po.vendorName || '').toLowerCase();
      const project = (po.projectName || po.jobName || '').toLowerCase();
      const items = (po.itemList || '').toLowerCase();
      if (!poNum.includes(q) && !prNum.includes(q) && !vendor.includes(q) && !project.includes(q) && !items.includes(q)) {
        return false;
      }
    }

    return true;
  };

  const filteredPendingPOs = useMemo(() => pendingPOs.filter(matchesFilter), [pendingPOs, selectedYear, selectedMonth, selectedCompany, searchQuery]);
  const filteredReceivedPOs = useMemo(() => receivedPOs.filter(matchesFilter), [receivedPOs, selectedYear, selectedMonth, selectedCompany, searchQuery]);

  const availableYears = useMemo(() => {
    const years = new Set(pendingPOs.concat(receivedPOs).map(po => extractDateFromPO(po).year.toString()));
    years.add(currentYear.toString());
    return Array.from(years).sort().reverse();
  }, [pendingPOs, receivedPOs, currentYear]);

  // Today reference (midnight UTC+7)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Overdue POs calculation
  const overduePOs = useMemo(() => {
    return filteredPendingPOs.filter(po => {
      if (!po.deliveryDate) return false;
      const deliv = new Date(po.deliveryDate);
      deliv.setHours(0, 0, 0, 0);
      return deliv < today;
    }).sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  }, [filteredPendingPOs, today]);

  // Upcoming POs (Next 7 days including today)
  const upcomingPOs = useMemo(() => {
    return filteredPendingPOs.filter(po => {
      if (!po.deliveryDate) return false;
      const deliv = new Date(po.deliveryDate);
      deliv.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((deliv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  }, [filteredPendingPOs, today]);

  // Due today POs
  const dueTodayPOs = useMemo(() => {
    return filteredPendingPOs.filter(po => {
      if (!po.deliveryDate) return false;
      const deliv = new Date(po.deliveryDate);
      deliv.setHours(0, 0, 0, 0);
      return deliv.getTime() === today.getTime();
    });
  }, [filteredPendingPOs, today]);

  // Metric sums
  const totalPendingAmount = useMemo(() => {
    return filteredPendingPOs.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
  }, [filteredPendingPOs]);

  const totalOverdueAmount = useMemo(() => {
    return overduePOs.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
  }, [overduePOs]);

  const receivedThisMonthCount = useMemo(() => {
    const curM = today.getMonth();
    const curY = today.getFullYear();
    return filteredReceivedPOs.filter(po => {
      if (!po.receivedAt) return false;
      const d = new Date(po.receivedAt);
      return d.getMonth() === curM && d.getFullYear() === curY;
    }).length;
  }, [filteredReceivedPOs, today]);

  const totalReceived30DaysAmount = useMemo(() => {
    return filteredReceivedPOs.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
  }, [filteredReceivedPOs]);

  // Current Active Table List
  const currentTabList = useMemo(() => {
    switch (activeTab) {
      case 'overdue':
        return overduePOs;
      case 'upcoming':
        return upcomingPOs;
      case 'received':
        return filteredReceivedPOs;
      case 'allPending':
      default:
        return filteredPendingPOs;
    }
  }, [activeTab, overduePOs, upcomingPOs, filteredPendingPOs, filteredReceivedPOs]);

  // Paginated List
  const totalPages = Math.ceil(currentTabList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentTabList.slice(start, start + pageSize);
  }, [currentTabList, currentPage, pageSize]);

  // Reset page when tab or filters change
  const handleTabChange = (tab: 'overdue' | 'upcoming' | 'allPending' | 'received') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const isFilterActive = selectedCompany !== 'ALL' || selectedMonth !== 'ALL' || selectedYear !== currentYear.toString() || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCompany('ALL');
    setSelectedMonth('ALL');
    setSelectedYear(currentYear.toString());
    setSearchQuery('');
    setCurrentPage(1);
  };

  // 14-Day Receiving Velocity Chart Data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateLabel = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

      let teCount = 0;
      let tpCount = 0;
      let tgCount = 0;

      filteredReceivedPOs.forEach(po => {
        if (!po.receivedAt) return;
        const rd = new Date(po.receivedAt);
        if (rd.getDate() === d.getDate() && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear()) {
          const comp = getCompanyFromPO(po.poNumber);
          if (comp === 'TE') teCount++;
          else if (comp === 'TP') tpCount++;
          else if (comp === 'TG') tgCount++;
        }
      });

      data.push({
        date: dateLabel,
        total: teCount + tpCount + tgCount,
        TE: teCount,
        TP: tpCount,
        TG: tgCount,
      });
    }
    return data;
  }, [filteredReceivedPOs]);

  // Company Distribution of Pending POs
  const companyPendingShare = useMemo(() => {
    let TE = 0;
    let TP = 0;
    let TG = 0;
    filteredPendingPOs.forEach(po => {
      const comp = getCompanyFromPO(po.poNumber);
      if (comp === 'TE') TE++;
      else if (comp === 'TP') TP++;
      else if (comp === 'TG') TG++;
    });
    const total = TE + TP + TG || 1;
    return {
      TE,
      TP,
      TG,
      tePct: Math.round((TE / total) * 100),
      tpPct: Math.round((TP / total) * 100),
      tgPct: Math.round((TG / total) * 100),
    };
  }, [filteredPendingPOs]);

  // Delivery status badge generator
  const getDeliveryStatusBadge = (deliveryDateStr: string | null) => {
    if (!deliveryDateStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <Clock className="w-3 h-3" />
          ไม่ระบุกำหนดส่ง
        </span>
      );
    }
    const deliv = new Date(deliveryDateStr);
    deliv.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deliv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          เกินกำหนด {Math.abs(diffDays)} วัน
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          กำหนดส่งวันนี้
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3" />
          ส่งพรุ่งนี้
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <Clock className="w-3 h-3" />
          อีก {diffDays} วัน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <Calendar className="w-3 h-3" />
        อีก {diffDays} วัน
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Header & Quick Action Hub */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50/40 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  แดชบอร์ดคลังสินค้า & สโตร์
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  Store Operations & Receiving Management
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 pt-1">
              ติดตามสถานะการส่งมอบสินค้า ตรวจสอบรายการเกินกำหนด และจัดการการรับของเข้าคลังอย่างมีประสิทธิภาพ
            </p>
          </div>

          {/* Quick Action Links */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/store/receive"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors duration-150"
            >
              <Truck className="w-4 h-4" />
              <span>รับสินค้าเข้าสโตร์</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Link>

            <Link
              href="/store/requisitions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold shadow-sm transition-colors duration-150"
            >
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>ใบเบิกวัสดุสโตร์</span>
              {pendingRequisitionsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {pendingRequisitionsCount}
                </span>
              )}
            </Link>

            <Link
              href="/admin/procurement/po"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-sm font-medium transition-colors duration-150"
              title="ดูรายการสั่งซื้อ PO ทั้งหมด"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">รายการ PO</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Top Filter & Search Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Company Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 px-2.5 hidden sm:inline">
              บริษัท:
            </span>
            {(['ALL', 'TE', 'TP', 'TG'] as const).map((comp) => {
              const isActive = selectedCompany === comp;
              return (
                <button
                  key={comp}
                  onClick={() => {
                    setSelectedCompany(comp);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {comp === 'ALL' ? 'ทั้งหมด (All)' : comp === 'TE' ? 'TE (Electric)' : comp === 'TP' ? 'TP (Power)' : 'TG (Group)'}
                </button>
              );
            })}
          </div>

          {/* Month, Year & Reset */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 md:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหา PO, PR, ผู้ขาย, โครงการ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">ทุกเดือน (All Months)</option>
              {monthNames.map((m, idx) => (
                <option key={idx} value={idx.toString()}>{m}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">ทุกปี (All Years)</option>
              {availableYears.map(y => (
                <option key={y} value={y}>ปี {parseInt(y, 10) > 2400 ? y : parseInt(y, 10) + 543} ({y})</option>
              ))}
            </select>

            {/* Reset Button */}
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Pending Receiving */}
        <div 
          onClick={() => handleTabChange('allPending')}
          className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeTab === 'allPending' ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                รอรับเข้าสโตร์
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  {filteredPendingPOs.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">PO</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">มูลค่าค้างรับ:</span>
            <span className="font-bold text-slate-900 font-mono">
              ฿{totalPendingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Overdue Alert */}
        <div 
          onClick={() => handleTabChange('overdue')}
          className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeTab === 'overdue' ? 'border-rose-500 ring-2 ring-rose-500/10 shadow-sm' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  เกินกำหนดส่งมอบ
                </span>
                {overduePOs.length > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-rose-600 tracking-tight font-mono">
                  {overduePOs.length}
                </span>
                <span className="text-xs text-rose-500 font-medium">รายการ</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">มูลค่าเกินกำหนด:</span>
            <span className="font-bold text-rose-600 font-mono">
              ฿{totalOverdueAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 3: Arriving in 7 Days */}
        <div 
          onClick={() => handleTabChange('upcoming')}
          className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeTab === 'upcoming' ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-sm' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                ส่งมอบใน 7 วัน
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-700 tracking-tight font-mono">
                  {upcomingPOs.length}
                </span>
                <span className="text-xs text-amber-600 font-medium">รายการ</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">กำหนดส่งวันนี้:</span>
            <span className="font-bold text-amber-800 font-mono">
              {dueTodayPOs.length} รายการ
            </span>
          </div>
        </div>

        {/* Card 4: Recently Received */}
        <div 
          onClick={() => handleTabChange('received')}
          className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeTab === 'received' ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                รับเข้าสำเร็จแล้ว
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-700 tracking-tight font-mono">
                  {receivedThisMonthCount}
                </span>
                <span className="text-xs text-emerald-600 font-medium">เดือนนี้</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">รวม 30 วันล่าสุด:</span>
            <span className="font-bold text-emerald-800 font-mono">
              ฿{totalReceived30DaysAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Operations Work Queue */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Tab Navigation Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => handleTabChange('overdue')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>เกินกำหนดส่ง (Overdue)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'}`}>
                {overduePOs.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('upcoming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>เข้าใน 7 วัน (Upcoming)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'upcoming' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {upcomingPOs.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('allPending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'allPending'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>รอรับเข้าทั้งหมด (All Pending)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'allPending' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {filteredPendingPOs.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('received')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'received'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ประวัติรับเข้าล่าสุด (Received)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'received' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {filteredReceivedPOs.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            แสดง {currentTabList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, currentTabList.length)} จากทั้งหมด {currentTabList.length} รายการ
          </div>
        </div>

        {/* Table Content */}
        {paginatedList.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">ไม่พบรายการในหมวดนี้</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? `ไม่มีข้อมูลตรงกับคำค้นหา "${searchQuery}" ลองปรับคำค้นหาใหม่` : 'ไม่มีรายการค้างรับหรือเกินกำหนดในรอบเวลาที่เลือก'}
            </p>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
              >
                ล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">เลขที่ PO / PR</th>
                  <th className="py-3 px-3">บริษัท</th>
                  <th className="py-3 px-4">ผู้ขาย (Vendor)</th>
                  <th className="py-3 px-4">โครงการ & รายการสินค้า</th>
                  <th className="py-3 px-4">กำหนดส่งมอบ</th>
                  <th className="py-3 px-4 text-right">ยอดเงิน (฿)</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.map((po) => {
                  const comp = getCompanyFromPO(po.poNumber);
                  const badgeClass = getCompanyBadge(comp);
                  const isReceived = po.receiveStatus === 'Received';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* PO / PR Numbers */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700">
                          {po.poNumber}
                        </div>
                        {po.prNumber && (
                          <div className="font-mono text-[11px] text-slate-400">
                            / {po.prNumber}
                          </div>
                        )}
                      </td>

                      {/* Company */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClass}`}>
                          {comp}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4 text-slate-800 font-medium max-w-[180px] truncate" title={po.vendorName || '-'}>
                        {po.vendorName || '-'}
                      </td>

                      {/* Project & Items */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="font-semibold text-slate-900 truncate" title={po.projectName || po.jobName || '-'}>
                          {po.projectName || po.jobName || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={po.itemList || '-'}>
                          {po.itemList || '-'}
                        </div>
                      </td>

                      {/* Delivery Date / Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isReceived ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              รับเข้าแล้ว
                            </span>
                            {po.receivedAt && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {new Date(po.receivedAt).toLocaleDateString('th-TH')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {getDeliveryStatusBadge(po.deliveryDate)}
                            {po.deliveryDate && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                {new Date(po.deliveryDate).toLocaleDateString('th-TH')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {po.totalAmount !== null && po.totalAmount !== undefined
                          ? `฿${Number(po.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isReceived ? (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {po.receivedBy ? `ผู้รับ: ${po.receivedBy}` : 'เสร็จสมบูรณ์'}
                          </span>
                        ) : (
                          <Link
                            href={`/store/receive?search=${encodeURIComponent(po.poNumber)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold transition-all text-xs"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>รับของ</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div>
              หน้า {currentPage} จากทั้งหมด {totalPages} หน้า
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics & Store Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 14-Day Receiving Velocity Bar Chart (2 Cols) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>ปริมาณการรับเข้าสินค้า (14 วันย้อนหลัง)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                สถิติจำนวนใบสั่งซื้อที่รับเข้าคลังสินค้าเรียบร้อยแล้วในแต่ละวัน
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              รวม {filteredReceivedPOs.length} ใบในรอบ 30 วัน
            </span>
          </div>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} รายการ`, 'รับเข้า']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.total > 0 ? '#2563eb' : '#cbd5e1'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Health & Company Distribution Card (1 Col) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>สัดส่วนสินค้าค้างรับตามบริษัท</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              การกระจายตัวของ PO รอรับเข้าสโตร์
            </p>
          </div>

          {/* Distribution Stacked Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${companyPendingShare.tePct}%` }} 
                className="bg-blue-600 transition-all duration-500" 
                title={`TE: ${companyPendingShare.tePct}%`}
              />
              <div 
                style={{ width: `${companyPendingShare.tpPct}%` }} 
                className="bg-emerald-500 transition-all duration-500" 
                title={`TP: ${companyPendingShare.tpPct}%`}
              />
              <div 
                style={{ width: `${companyPendingShare.tgPct}%` }} 
                className="bg-purple-600 transition-all duration-500" 
                title={`TG: ${companyPendingShare.tgPct}%`}
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="font-semibold text-slate-800">TE (Tera Electric)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">{companyPendingShare.TE} PO</span>
                  <span className="font-bold text-slate-900">{companyPendingShare.tePct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-800">TP (Tera Power)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">{companyPendingShare.TP} PO</span>
                  <span className="font-bold text-slate-900">{companyPendingShare.tpPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="font-semibold text-slate-800">TG (Tera Group)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">{companyPendingShare.TG} PO</span>
                  <span className="font-bold text-slate-900">{companyPendingShare.tgPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Health Alert */}
          <div className="pt-3 border-t border-slate-100">
            {overduePOs.length > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-rose-900">ต้องเร่งรัดการส่งมอบ</p>
                  <p className="text-rose-700">
                    มีสินค้าเกินกำหนดส่ง {overduePOs.length} รายการ แนะนำให้ฝ่ายจัดซื้อประสานผู้ขายทันที
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-emerald-900">การส่งมอบอยู่ในเกณฑ์ดี</p>
                  <p className="text-emerald-700">ไม่มีรายการเกินกำหนดส่งมอบในรอบเวลานี้</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
