'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  FileText, 
  ShoppingBag, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  RotateCcw, 
  Search, 
  X, 
  ArrowRight, 
  Download, 
  Award,
  ExternalLink
} from 'lucide-react';
import SearchableProjectSelect, { ProjectOption } from '../components/SearchableProjectSelect';
import { normalizeProjectName } from '../pr/PRListClient';

export default function DashboardClient({ pos, prs }: { pos: any[], prs: any[] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<'ALL' | 'TE' | 'TP' | 'TG'>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Table local filters
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // Helper to extract year, month, and day:
  // 1. Primary: Extract directly from poNumber (e.g. PO69-E090301 -> Year 2026, Month 9, Day 3)
  //    This matches Express document date strictly and prevents late sheet submissions ("ย้อนหลัง") from crossing months.
  // 2. Fallback: Use recordedAt or createdAt
  const getPODate = (po: any) => {
    if (po.poNumber) {
      const m = po.poNumber.toUpperCase().match(/^PO(\d{2})-[EPG](\d{2})(\d{2})/);
      if (m) {
        const yy = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const dd = parseInt(m[3], 10);
        const year = yy >= 50 ? 2500 + yy - 543 : 2000 + yy;
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          return {
            year,
            month: mm - 1,
            day: dd,
            dateObj: new Date(year, mm - 1, dd),
          };
        }
      }
    }
    const raw = po.recordedAt || po.createdAt;
    const d = raw ? new Date(raw) : new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      dateObj: d,
    };
  };

  // Unique Years for Filter dropdown
  const availableYears = useMemo(() => {
    const years = new Set(pos.map(po => getPODate(po).year.toString()));
    years.add(currentYear.toString());
    return Array.from(years).sort().reverse();
  }, [pos, currentYear]);

  // Unique Projects with counts for the SearchableProjectSelect
  const projectOptions: ProjectOption[] = useMemo(() => {
    const map = new Map<string, number>();
    pos.forEach(po => {
      const pName = po.jobName || po.purchaseRequest?.projectName;
      const normalized = normalizeProjectName(pName);
      if (normalized) {
        map.set(normalized, (map.get(normalized) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [pos]);

  // Filtered POs based on top-level controls (Year, Month, Day, Company, Project)
  const filteredPos = useMemo(() => {
    return pos.filter(po => {
      const { year, month, day } = getPODate(po);
      if (selectedYear !== 'ALL' && year.toString() !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && month.toString() !== selectedMonth) return false;
      if (selectedDay !== 'ALL' && day.toString() !== selectedDay) return false;

      // Global Company Filter
      if (selectedCompany !== 'ALL') {
        const poUpper = (po.poNumber || '').toUpperCase();
        if (selectedCompany === 'TE' && !poUpper.includes('-E')) return false;
        if (selectedCompany === 'TP' && !poUpper.includes('-P')) return false;
        if (selectedCompany === 'TG' && !poUpper.includes('-G')) return false;
      }

      // Global Project Filter
      if (selectedProject) {
        const pName = po.jobName || po.purchaseRequest?.projectName || '';
        const norm = normalizeProjectName(pName);
        if (norm !== selectedProject && !pName.toLowerCase().includes(selectedProject.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [pos, selectedYear, selectedMonth, selectedDay, selectedCompany, selectedProject]);

  // Financial & Operational Metrics (Express Parity: Exclude Cancelled from Totals)
  const activePOs = useMemo(() => filteredPos.filter(po => po.receiveStatus !== 'Cancelled'), [filteredPos]);
  const totalFilteredSpending = useMemo(() => activePOs.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0), [activePOs]);
  
  const pendingPOs = useMemo(() => filteredPos.filter(po => po.receiveStatus !== 'Received' && po.receiveStatus !== 'Cancelled'), [filteredPos]);
  const pendingAmount = useMemo(() => pendingPOs.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0), [pendingPOs]);

  const receivedPOs = useMemo(() => filteredPos.filter(po => po.receiveStatus === 'Received'), [filteredPos]);
  const receivedAmount = useMemo(() => receivedPOs.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0), [receivedPOs]);

  const cancelledCount = useMemo(() => filteredPos.filter(po => po.receiveStatus === 'Cancelled').length, [filteredPos]);
  const cancelledAmount = useMemo(() => filteredPos.filter(po => po.receiveStatus === 'Cancelled').reduce((s, p) => s + Number(p.totalAmount || 0), 0), [filteredPos]);

  const prsWithoutPOs = prs.filter(pr => !pr.purchaseOrders || pr.purchaseOrders.length === 0).length;

  // Spending by Company for current filter (excluding cancelled POs)
  const spendingByCompany = useMemo(() => {
    let TE = 0;
    let TP = 0;
    let TG = 0;
    let other = 0;

    activePOs.forEach(po => {
      const amt = Number(po.totalAmount || 0);
      if (po.poNumber) {
        const poUpper = po.poNumber.toUpperCase();
        if (poUpper.includes('-E')) TE += amt;
        else if (poUpper.includes('-P')) TP += amt;
        else if (poUpper.includes('-G')) TG += amt;
        else other += amt;
      } else {
        other += amt;
      }
    });

    const tePct = totalFilteredSpending > 0 ? (TE / totalFilteredSpending) * 100 : 0;
    const tpPct = totalFilteredSpending > 0 ? (TP / totalFilteredSpending) * 100 : 0;
    const tgPct = totalFilteredSpending > 0 ? (TG / totalFilteredSpending) * 100 : 0;

    return { TE, TP, TG, other, tePct, tpPct, tgPct };
  }, [activePOs, totalFilteredSpending]);

  // Top 5 Suppliers by Spend
  const topVendors = useMemo(() => {
    const map = new Map<string, { totalAmount: number; count: number }>();
    activePOs.forEach(po => {
      const vendor = (po.vendorName || '').trim() || 'ไม่ระบุผู้ขาย';
      const amt = Number(po.totalAmount || 0);
      const curr = map.get(vendor) || { totalAmount: 0, count: 0 };
      map.set(vendor, {
        totalAmount: curr.totalAmount + amt,
        count: curr.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        totalAmount: data.totalAmount,
        count: data.count,
        percentage: totalFilteredSpending > 0 ? (data.totalAmount / totalFilteredSpending) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
  }, [activePOs, totalFilteredSpending]);

  // Monthly Spending by Company (shows trend for the selected year across all 12 months)
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: monthNames[i],
      TE: 0,
      TP: 0,
      TG: 0
    }));

    pos.forEach(po => {
      if (po.receiveStatus === 'Cancelled') return;
      const { year, month } = getPODate(po);
      if (selectedYear !== 'ALL' && year.toString() !== selectedYear) return;
      
      const amt = Number(po.totalAmount || 0);
      if (po.poNumber) {
        const poUpper = po.poNumber.toUpperCase();
        if (poUpper.includes('-E')) data[month].TE += amt;
        else if (poUpper.includes('-P')) data[month].TP += amt;
        else if (poUpper.includes('-G')) data[month].TG += amt;
      }
    });

    return data;
  }, [pos, selectedYear]);

  // Chart Data: Spending by Credit Term (excluding cancelled POs)
  const creditData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    activePOs.forEach(po => {
      const amt = Number(po.totalAmount || 0);
      let term = po.creditTerm?.trim() || 'ไม่ระบุ';
      term = term.replace(/\s+/g, ' ').trim();
      
      const tLower = term.toLowerCase();

      if (tLower.includes('📌') || tLower.includes('ชื่องาน') || term.length > 30) {
        term = 'อื่นๆ (Others)';
      } else if (tLower === 'cash' || tLower === 'เงินสด') {
        term = 'เงินสด';
      } else if (tLower.includes('ตัดบัตร')) {
        term = 'ตัดบัตรเครดิต';
      } else if (tLower.includes('เงินสด pdc')) {
        term = 'เงินสด PDC';
      } else if (tLower.includes('หน้าเช็ค')) {
        term = 'เงินสด (หน้าเช็ค)';
      } else {
        const hasPdc = tLower.includes('pdc') || tLower.includes('pcd');
        const dayMatch = term.match(/(\d+)\s*วัน/i) || term.match(/^(\d+)$/);
        
        if (dayMatch) {
          const days = dayMatch[1];
          term = hasPdc ? `PDC ${days} วัน` : `${days} วัน`;
        }
      }

      if (!dataMap[term]) dataMap[term] = 0;
      dataMap[term] += amt;
    });

    const sortedData = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);

    const MAX_ITEMS = 8;
    const finalData: { name: string; value: number }[] = [];
    let otherSum = 0;

    sortedData.forEach(([name, value], idx) => {
      if (idx < MAX_ITEMS - 1 || (idx === MAX_ITEMS - 1 && sortedData.length === MAX_ITEMS)) {
        finalData.push({ name, value });
      } else {
        otherSum += value;
      }
    });

    if (otherSum > 0) {
      const existingOther = finalData.find(d => d.name === 'อื่นๆ (Others)');
      if (existingOther) {
        existingOther.value += otherSum;
      } else {
        finalData.push({ name: 'อื่นๆ (Others)', value: otherSum });
      }
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#fb923c'];
    return finalData
      .map((d, idx) => ({ ...d, fill: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value);
  }, [activePOs]);

  // Secondary filtering for the in-dashboard PO breakdown table
  const tableFilteredPos = useMemo(() => {
    return filteredPos.filter(po => {
      if (tableStatusFilter === 'RECEIVED' && po.receiveStatus !== 'Received') return false;
      if (tableStatusFilter === 'PENDING' && (po.receiveStatus === 'Received' || po.receiveStatus === 'Cancelled')) return false;
      if (tableStatusFilter === 'CANCELLED' && po.receiveStatus !== 'Cancelled') return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const poNum = (po.poNumber || '').toLowerCase();
        const prNum = (po.prNumber || '').toLowerCase();
        const vendor = (po.vendorName || '').toLowerCase();
        const job = (po.jobName || po.purchaseRequest?.projectName || '').toLowerCase();
        const item = (po.itemList || '').toLowerCase();
        return poNum.includes(q) || prNum.includes(q) || vendor.includes(q) || job.includes(q) || item.includes(q);
      }
      return true;
    });
  }, [filteredPos, tableStatusFilter, tableSearch]);

  const totalTablePages = Math.max(1, Math.ceil(tableFilteredPos.length / pageSize));
  const paginatedTablePos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableFilteredPos.slice(start, start + pageSize);
  }, [tableFilteredPos, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSelectedYear(currentYear.toString());
    setSelectedMonth('ALL');
    setSelectedDay('ALL');
    setSelectedCompany('ALL');
    setSelectedProject('');
    setTableSearch('');
    setTableStatusFilter('ALL');
    setCurrentPage(1);
  };

  const isAnyFilterActive = Boolean(
    selectedYear !== currentYear.toString() ||
    selectedMonth !== 'ALL' ||
    selectedDay !== 'ALL' ||
    selectedCompany !== 'ALL' ||
    selectedProject !== ''
  );

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const exportData = filteredPos.map(po => {
        const d = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : null);
        const dateStr = d ? d.toLocaleDateString('th-TH') : '-';
        const delivStr = po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-';
        const comp = po.poNumber?.toUpperCase().includes('-E') ? 'TE' : (po.poNumber?.toUpperCase().includes('-P') ? 'TP' : (po.poNumber?.toUpperCase().includes('-G') ? 'TG' : '-'));
        
        return {
          'เลขที่ PO': po.poNumber,
          'วันที่ PO': dateStr,
          'บริษัท': comp,
          'อ้างอิง PR': po.prNumber || '-',
          'โปรเจกต์': po.jobName || po.purchaseRequest?.projectName || '-',
          'ผู้ขาย': po.vendorName || '-',
          'รายการ': po.itemList || '-',
          'เครดิตเทอม': po.creditTerm || '-',
          'ยอดรวม (บาท)': Number(po.totalAmount) || 0,
          'วันส่งมอบ': delivStr,
          'สถานะ': po.receiveStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : (po.receiveStatus === 'Received' ? `รับแล้ว (${po.receivedBy || '-'})` : 'รอรับสินค้า'),
        };
      });

      // Add summary row
      exportData.push({
        'เลขที่ PO': 'รวมทั้งหมด (ไม่รวมที่ยกเลิก)',
        'วันที่ PO': '',
        'บริษัท': '',
        'อ้างอิง PR': '',
        'โปรเจกต์': '',
        'ผู้ขาย': '',
        'รายการ': '',
        'เครดิตเทอม': '',
        'ยอดรวม (บาท)': totalFilteredSpending,
        'วันส่งมอบ': '',
        'สถานะ': '',
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard POs');
      
      const fileName = `Procurement_Dashboard_${selectedYear}_${selectedMonth}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Layers size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  แดชบอร์ดจัดซื้อ (Procurement Dashboard)
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Express Parity
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                วิเคราะห์ภาพรวมการจัดซื้อ ติดตามงบประมาณ และแนวโน้มรายเดือน อ้างอิงวันที่บันทึก (Recorded Date) ตรงกับระบบ Express
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/procurement/po"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-colors"
          >
            <ShoppingBag size={14} />
            ใบสั่งซื้อ (PO)
          </Link>
          <Link
            href="/admin/procurement/pr"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition-colors"
          >
            <FileText size={14} />
            ใบขอซื้อ (PR)
          </Link>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
          >
            <Download size={14} />
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* Global Interactive Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 space-y-3.5">
        {/* Top Filter Row: Company Pills + Year/Month/Day Pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Company Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium mr-1 flex items-center gap-1">
              <Building2 size={13} />
              บริษัท:
            </span>
            {(['ALL', 'TE', 'TP', 'TG'] as const).map((comp) => {
              const isSelected = selectedCompany === comp;
              const label = comp === 'ALL' ? 'ทั้งหมด (All)' : comp === 'TE' ? 'TE (Electric)' : comp === 'TP' ? 'TP (Power)' : 'TG (Group)';
              return (
                <button
                  key={comp}
                  type="button"
                  onClick={() => { setSelectedCompany(comp); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all text-xs ${
                    isSelected
                      ? comp === 'TE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : comp === 'TP'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : comp === 'TG'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quick Active Filter Badges & Reset Button */}
          {isAnyFilterActive && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium">กำลังใช้งานตัวกรอง</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg border border-gray-200 hover:bg-red-50 transition-colors"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw size={12} /> ล้างตัวกรอง
              </button>
            </div>
          )}
        </div>

        {/* Bottom Filter Row: Project Searchable Combobox + Time Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Project Searchable Combobox */}
          <div className="md:col-span-5">
            <SearchableProjectSelect
              value={selectedProject}
              onChange={(p) => { setSelectedProject(p); setCurrentPage(1); }}
              options={projectOptions}
              totalCount={pos.length}
              placeholder="ทุกโครงการ / โปรเจกต์"
            />
          </div>

          {/* Year Selector */}
          <div className="md:col-span-3">
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 font-medium"
            >
              <option value="ALL">ทุกปี (All Years)</option>
              {availableYears.map(y => (
                <option key={y} value={y}>ปี {y}</option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 font-medium"
            >
              <option value="ALL">ทุกเดือน (ทั้งปี)</option>
              {monthNames.map((m, i) => (
                <option key={i} value={i.toString()}>{m}</option>
              ))}
            </select>
          </div>

          {/* Day Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedDay}
              onChange={(e) => { setSelectedDay(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 font-medium"
            >
              <option value="ALL">ทุกวัน</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d.toString()}>วันที่ {d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ยอดสั่งซื้อจริงรวม</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {activePOs.length} PO
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">
            {totalFilteredSpending.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
          </p>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
            <span>ไม่รวมยกเลิก ({cancelledCount} รายการ)</span>
            <span className="font-semibold text-gray-700">100% Express</span>
          </div>
        </div>

        {/* Pending Delivery Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Clock size={14} /> รอรับสินค้า
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {pendingPOs.length} PO
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2 tracking-tight">
            {pendingAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">
            มูลค่าสินค้าที่รอส่งมอบเข้าสโตร์
          </p>
        </div>

        {/* Received Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={14} /> รับสินค้าแล้ว
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {receivedPOs.length} PO
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-2 tracking-tight">
            {receivedAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            รับเข้าคลังเรียบร้อยแล้ว
          </p>
        </div>

        {/* Pending PRs Card */}
        <Link 
          href="/admin/procurement/pr?status=WITHOUT_PO"
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 border-l-4 border-l-rose-500 hover:border-rose-300 transition-all group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={14} /> PR รอเปิด PO
            </span>
            <span className="text-xs text-rose-600 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight size={14} />
            </span>
          </div>
          <p className="text-2xl font-bold text-rose-900 mt-2 tracking-tight">
            {prsWithoutPOs} <span className="text-xs font-normal text-rose-700">ฉบับ</span>
          </p>
          <p className="text-[11px] text-rose-600 mt-1 font-medium">
            คำขอซื้อที่ยังไม่มีการออก PO →
          </p>
        </Link>
      </div>

      {/* Company Spending Proportion & Mini-Cards */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              สัดส่วนการจัดซื้อแยกตามบริษัท (Company Proportion)
            </h3>
            <p className="text-xs text-gray-500">
              การกระจายตัวของยอดใช้จ่ายจริงประจำงวดที่เลือก
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-xl self-start sm:self-auto">
            ยอดรวม: {totalFilteredSpending.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Multi-segment Proportion Progress Bar */}
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          <div 
            style={{ width: `${spendingByCompany.tePct}%` }} 
            className="bg-blue-600 h-full transition-all duration-500" 
            title={`TE: ${spendingByCompany.tePct.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${spendingByCompany.tpPct}%` }} 
            className="bg-emerald-500 h-full transition-all duration-500" 
            title={`TP: ${spendingByCompany.tpPct.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${spendingByCompany.tgPct}%` }} 
            className="bg-purple-600 h-full transition-all duration-500" 
            title={`TG: ${spendingByCompany.tgPct.toFixed(1)}%`}
          />
        </div>

        {/* 3 Company Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* TE */}
          <div 
            onClick={() => setSelectedCompany(selectedCompany === 'TE' ? 'ALL' : 'TE')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedCompany === 'TE' 
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm' 
                : 'bg-blue-50/20 border-blue-100 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-800">TE (Tera Electric)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            </div>
            <p className="text-lg font-bold text-blue-950 mt-1.5 font-mono">
              {spendingByCompany.TE.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-blue-700/80 mt-0.5">
              สัดส่วน <strong>{spendingByCompany.tePct.toFixed(1)}%</strong> ของยอดจัดซื้อ
            </p>
          </div>

          {/* TP */}
          <div 
            onClick={() => setSelectedCompany(selectedCompany === 'TP' ? 'ALL' : 'TP')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedCompany === 'TP' 
                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' 
                : 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-800">TP (Tera Power)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-950 mt-1.5 font-mono">
              {spendingByCompany.TP.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-0.5">
              สัดส่วน <strong>{spendingByCompany.tpPct.toFixed(1)}%</strong> ของยอดจัดซื้อ
            </p>
          </div>

          {/* TG */}
          <div 
            onClick={() => setSelectedCompany(selectedCompany === 'TG' ? 'ALL' : 'TG')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedCompany === 'TG' 
                ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-sm' 
                : 'bg-purple-50/20 border-purple-100 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-800">TG (Tera Group)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-950 mt-1.5 font-mono">
              {spendingByCompany.TG.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-purple-700/80 mt-0.5">
              สัดส่วน <strong>{spendingByCompany.tgPct.toFixed(1)}%</strong> ของยอดจัดซื้อ
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Top Suppliers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                แนวโน้มยอดใช้จ่ายรายเดือน (ปี {selectedYear})
              </h3>
              <span className="text-[11px] text-gray-400">12 เดือน แยกตามบริษัท</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis 
                  tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip 
                  formatter={(value: any) => Number(value).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="TE" fill="#3b82f6" name="TE (Electric)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TP" fill="#10b981" name="TP (Power)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TG" fill="#a855f7" name="TG (Group)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-medium text-gray-600">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> TE (Electric)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> TP (Power)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span> TG (Group)</span>
          </div>
        </div>

        {/* Credit Terms Donut Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">
              สัดส่วนการใช้จ่ายตามเครดิต (Credit Terms)
            </h3>
            <p className="text-xs text-gray-500">การกระจายตัวตามเงื่อนไขการชำระเงินของงวดที่เลือก</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={creditData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {creditData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => Number(value).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">คำนวณจากยอดสั่งซื้อที่มีผลใช้งาน (ไม่รวมยกเลิก)</p>
        </div>
      </div>

      {/* Top 5 Suppliers Widget (New!) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                5 อันดับผู้ขายที่มียอดสั่งซื้อสูงสุด (Top 5 Suppliers by Spend)
              </h3>
              <p className="text-xs text-gray-500">
                ข้อมูลคู่ค้าและยอดรวมคำสั่งซื้อตามตัวกรองที่เลือก
              </p>
            </div>
          </div>
        </div>

        {topVendors.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">ไม่พบข้อมูลผู้ขายในงวดที่เลือก</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {topVendors.map((vendor, idx) => {
              const medals = ['🥇', '🥈', '🥉', '4', '5'];
              return (
                <div 
                  key={vendor.name} 
                  className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-300 transition-all flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] text-gray-500">{vendor.count} คำสั่งซื้อ</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 truncate" title={vendor.name}>
                      {vendor.name}
                    </h4>
                    <p className="text-sm font-bold text-gray-900 mt-1 font-mono">
                      ฿{vendor.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, vendor.percentage * 2)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">
                      {vendor.percentage.toFixed(1)}% ของยอดรวม
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PO Breakdown Drill-Down Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={16} className="text-blue-600" />
              รายการสั่งซื้อในงวดนี้ (PO Breakdown)
            </h3>
            <p className="text-xs text-gray-500">
              แสดง {tableFilteredPos.length} รายการ (ยอดจัดซื้อจริง ฿{tableFilteredPos.filter(p => p.receiveStatus !== 'Cancelled').reduce((s, p) => s + Number(p.totalAmount || 0), 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Table Search Input */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="ค้นหา PO, ผู้ขาย, โครงการ..."
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60 transition-all"
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => { setTableSearch(''); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Table Status Filter */}
            <select
              value={tableStatusFilter}
              onChange={(e) => { setTableStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="PENDING">รอรับสินค้า</option>
              <option value="RECEIVED">รับแล้ว</option>
              <option value="CANCELLED">ยกเลิกแล้ว</option>
            </select>

            <Link 
              href="/admin/procurement/po"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 ml-1"
            >
              จัดการในหน้า PO
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">เลขที่ PO</th>
                <th className="py-3 px-3">วันที่เอกสาร</th>
                <th className="py-3 px-3">บริษัท</th>
                <th className="py-3 px-4">ผู้ขาย (Vendor)</th>
                <th className="py-3 px-4">โครงการ / รายการ</th>
                <th className="py-3 px-3">เครดิต</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-4 text-right">ยอดรวม (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedTablePos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">
                    ไม่พบรายการสั่งซื้อที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedTablePos.map((po) => {
                  const d = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : null);
                  const dateStr = d ? d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                  const comp = po.poNumber?.toUpperCase().includes('-E') ? 'TE' : (po.poNumber?.toUpperCase().includes('-P') ? 'TP' : (po.poNumber?.toUpperCase().includes('-G') ? 'TG' : '-'));
                  const compColor = comp === 'TE' ? 'bg-blue-50 text-blue-700 border-blue-100' : (comp === 'TP' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-purple-50 text-purple-700 border-purple-100');
                  
                  return (
                    <tr key={po.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-blue-600 hover:text-blue-800">
                        <Link 
                          href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                          className="inline-flex items-center gap-1 font-mono"
                        >
                          {po.poNumber}
                          <ExternalLink size={10} className="opacity-50" />
                        </Link>
                        {po.prNumber && (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            PR: {po.prNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${compColor}`}>
                          {comp}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800 max-w-xs truncate" title={po.vendorName || '-'}>
                        {po.vendorName || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs">
                        <div className="font-medium text-gray-800 truncate" title={po.jobName || po.purchaseRequest?.projectName || '-'}>
                          {po.jobName || po.purchaseRequest?.projectName || '-'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate" title={po.itemList || '-'}>
                          {po.itemList || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {po.creditTerm || '-'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {po.receiveStatus === 'Cancelled' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                            ยกเลิก
                          </span>
                        ) : po.receiveStatus === 'Received' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            รับแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            รอรับสินค้า
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap font-mono">
                        {Number(po.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalTablePages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/30">
            <span>
              แสดงหน้า {currentPage} จาก {totalTablePages} (ทั้งหมด {tableFilteredPos.length} รายการ)
            </span>
            <div className="flex gap-1 items-center">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 border rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
              >
                ‹ ก่อนหน้า
              </button>
              {Array.from({ length: Math.min(5, totalTablePages) }, (_, i) => {
                let p = i + 1;
                if (totalTablePages > 5 && currentPage > 3) {
                  p = currentPage - 3 + i;
                  if (p > totalTablePages) p = totalTablePages - (4 - i);
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 border rounded-lg text-xs font-semibold ${currentPage === p ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'hover:bg-white text-gray-700'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalTablePages}
                onClick={() => setCurrentPage(p => Math.min(totalTablePages, p + 1))}
                className="px-2.5 py-1 border rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
              >
                ถัดไป ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
