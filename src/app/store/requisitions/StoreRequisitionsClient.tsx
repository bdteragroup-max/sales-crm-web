'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  RotateCcw,
  Calendar,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Printer,
  Eye,
  Copy,
  ExternalLink,
  User,
  Warehouse,
  PackageCheck,
  X,
  Layers,
  Check,
  FileCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import { updateRequisitionStatus } from '@/app/actions/requisitions';

export interface RequisitionItem {
  detail: string;
  quantity: number | string;
  unit: string;
  job?: string;
  remark?: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  date: string | null;
  company: string;
  items: RequisitionItem[];
  requesterId?: string | null;
  approverId?: string | null;
  requesterSignatureUrl?: string | null;
  approverSignatureUrl?: string | null;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  requesterName?: string;
  approverName?: string;
}

interface StoreRequisitionsClientProps {
  initialRequisitions: Requisition[];
  userName: string;
}

export default function StoreRequisitionsClient({
  initialRequisitions,
  userName
}: StoreRequisitionsClientProps) {
  const router = useRouter();

  const [requisitions, setRequisitions] = useState<Requisition[]>(initialRequisitions);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVED' | 'COMPLETED' | 'PENDING_APPROVAL'>('APPROVED');

  // Modal State
  const [detailReq, setDetailReq] = useState<Requisition | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'TE' | 'TP' | 'TG'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Helper: Normalize Company
  const normalizeCompany = (comp: string = ''): 'TE' | 'TP' | 'TG' | 'OTHER' => {
    const upper = comp.toUpperCase();
    if (upper.includes('TE') || upper.includes('ELECTRIC') || upper.includes('อิเลคทริค')) return 'TE';
    if (upper.includes('TP') || upper.includes('POWER') || upper.includes('เพาเวอร์') || upper.includes('พาวเวอร์')) return 'TP';
    if (upper.includes('TG') || upper.includes('GROUP') || upper.includes('กรุ๊ป')) return 'TG';
    return 'OTHER';
  };

  const getCompanyBadge = (comp: string) => {
    const normalized = normalizeCompany(comp);
    switch (normalized) {
      case 'TE':
        return { label: 'TE (Tera Electric)', short: 'TE', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'TP':
        return { label: 'TP (Tera Power)', short: 'TP', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'TG':
        return { label: 'TG (Tera Group)', short: 'TG', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: comp || 'ทั่วไป', short: comp || 'OTHER', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Helper: Status Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'รอจัดของ / รอส่งมอบ',
          badge: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
          icon: Clock,
          iconColor: 'text-amber-600'
        };
      case 'COMPLETED':
        return {
          label: 'ส่งมอบเรียบร้อย',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600'
        };
      case 'PENDING_APPROVAL':
        return {
          label: 'รอหัวหน้าอนุมัติ',
          badge: 'bg-purple-50 text-purple-800 border-purple-200 font-medium',
          icon: AlertCircle,
          iconColor: 'text-purple-600'
        };
      case 'REJECTED':
        return {
          label: 'ไม่อนุมัติ',
          badge: 'bg-rose-50 text-rose-700 border-rose-200 font-medium',
          icon: XCircle,
          iconColor: 'text-rose-600'
        };
      default:
        return {
          label: status || 'ไม่ระบุ',
          badge: 'bg-slate-50 text-slate-700 border-slate-200 font-medium',
          icon: FileText,
          iconColor: 'text-slate-500'
        };
    }
  };

  // Helper: Format Thai Date
  const formatThaiDate = (dateVal: string | Date | null | undefined, includeTime = false) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;
    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes} น.`;
    }
    return `${day} ${month} ${year}`;
  };

  // Unique Years for dropdown
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    requisitions.forEach(r => {
      if (r.date) {
        years.add(new Date(r.date).getFullYear().toString());
      } else if (r.createdAt) {
        years.add(new Date(r.createdAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [requisitions]);

  const thaiMonthOptions = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ];

  // Top Metrics
  const metrics = useMemo(() => {
    let approvedCount = 0;
    let completedCount = 0;
    let pendingApprovalCount = 0;
    let totalItemsCount = 0;

    requisitions.forEach(req => {
      if (req.status === 'APPROVED') approvedCount++;
      if (req.status === 'COMPLETED') completedCount++;
      if (req.status === 'PENDING_APPROVAL') pendingApprovalCount++;
      if (Array.isArray(req.items)) {
        totalItemsCount += req.items.length;
      }
    });

    return {
      total: requisitions.length,
      approvedCount,
      completedCount,
      pendingApprovalCount,
      totalItemsCount
    };
  }, [requisitions]);

  // Company Counts
  const companyCounts = useMemo(() => {
    const counts = { ALL: requisitions.length, TE: 0, TP: 0, TG: 0 };
    requisitions.forEach(req => {
      const c = normalizeCompany(req.company);
      if (c === 'TE') counts.TE++;
      if (c === 'TP') counts.TP++;
      if (c === 'TG') counts.TG++;
    });
    return counts;
  }, [requisitions]);

  // Tab Counts
  const tabCounts = useMemo(() => {
    const counts = { ALL: requisitions.length, APPROVED: 0, COMPLETED: 0, PENDING_APPROVAL: 0 };
    requisitions.forEach(req => {
      if (req.status === 'APPROVED') counts.APPROVED++;
      if (req.status === 'COMPLETED') counts.COMPLETED++;
      if (req.status === 'PENDING_APPROVAL') counts.PENDING_APPROVAL++;
    });
    return counts;
  }, [requisitions]);

  // Filter Engine
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      // 1. Tab Status Filter
      if (activeTab !== 'ALL' && req.status !== activeTab) {
        return false;
      }

      // 2. Company Filter
      if (companyFilter !== 'ALL') {
        const c = normalizeCompany(req.company);
        if (c !== companyFilter) return false;
      }

      // 3. Date / Month / Year
      const d = req.date ? new Date(req.date) : (req.createdAt ? new Date(req.createdAt) : null);
      if (dateFilter) {
        if (!d) return false;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        if (`${yyyy}-${mm}-${dd}` !== dateFilter) return false;
      }
      if (monthFilter !== 'ALL') {
        if (!d) return false;
        if ((d.getMonth() + 1).toString() !== monthFilter) return false;
      }
      if (yearFilter !== 'ALL') {
        if (!d) return false;
        if (d.getFullYear().toString() !== yearFilter) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const reqNum = (req.requisitionNumber || '').toLowerCase();
        const comp = (req.company || '').toLowerCase();
        const requester = (req.requesterName || '').toLowerCase();
        const approver = (req.approverName || '').toLowerCase();

        // Search in items
        const itemMatch = req.items?.some(it => {
          const detail = (it.detail || '').toLowerCase();
          const job = (it.job || '').toLowerCase();
          const remark = (it.remark || '').toLowerCase();
          return detail.includes(q) || job.includes(q) || remark.includes(q);
        });

        if (
          !reqNum.includes(q) &&
          !comp.includes(q) &&
          !requester.includes(q) &&
          !approver.includes(q) &&
          !itemMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [requisitions, activeTab, companyFilter, dateFilter, monthFilter, yearFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRequisitions.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequisitions.slice(start, start + pageSize);
  }, [filteredRequisitions, currentPage]);

  const handleTabChange = (tab: 'ALL' | 'APPROVED' | 'COMPLETED' | 'PENDING_APPROVAL') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCompanyFilter('ALL');
    setDateFilter('');
    setMonthFilter('ALL');
    setYearFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    companyFilter !== 'ALL' ||
    dateFilter !== '' ||
    monthFilter !== 'ALL' ||
    yearFilter !== 'ALL';

  // Copy Helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `คัดลอก ${label} แล้ว`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  // Action: Quick Fulfill / Complete
  const handleQuickFulfill = async (req: Requisition) => {
    const result = await Swal.fire({
      title: 'ยืนยันการส่งมอบอุปกรณ์',
      html: `
        <div class="text-left text-sm space-y-2.5 mt-2">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div><span class="text-slate-500">เลขที่ใบเบิก:</span> <span class="font-bold text-slate-900">${req.requisitionNumber}</span></div>
            <div><span class="text-slate-500">ผู้ขอเบิก:</span> <span class="font-semibold text-slate-800">${req.requesterName || '-'}</span></div>
            <div><span class="text-slate-500">บริษัท:</span> <span class="text-slate-800">${req.company || '-'}</span></div>
            <div class="text-xs text-slate-600 mt-1">จำนวนอุปกรณ์: <span class="font-bold text-slate-900">${req.items?.length || 0} รายการ</span></div>
          </div>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium">
            ยืนยันว่าคลังสินค้าได้จัดเตรียมและส่งมอบอุปกรณ์ให้ผู้ขอเบิกเรียบร้อยแล้ว
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันส่งมอบของเรียบร้อย',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    setLoadingMap(prev => ({ ...prev, [req.id]: true }));
    try {
      const res = await updateRequisitionStatus(req.id, 'COMPLETED');
      if (res.success) {
        setRequisitions(prev =>
          prev.map(r => (r.id === req.id ? { ...r, status: 'COMPLETED' } : r))
        );
        if (detailReq?.id === req.id) {
          setDetailReq(prev => (prev ? { ...prev, status: 'COMPLETED' } : null));
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `บันทึกส่งมอบใบเบิก ${req.requisitionNumber} สำเร็จ`,
          showConfirmButton: false,
          timer: 2000
        });

        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถอัปเดตสถานะได้'
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
            <Link href="/store/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5" />
              <span>คลังสินค้าและสโตร์</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">รายการเบิกและยืมวัสดุอุปกรณ์ (Requisitions)</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            รายการเบิกและยืมวัสดุอุปกรณ์
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            คลังสินค้า: ตรวจสอบรายการขอเบิกที่ผ่านการอนุมัติ จัดเตรียมอุปกรณ์ และบันทึกการส่งมอบ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>เจ้าหน้าที่: <span className="font-semibold text-slate-900">{userName || 'เจ้าหน้าที่สโตร์'}</span></span>
          </div>

          <Link
            href="/store/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-sm transition-all"
          >
            <Warehouse className="w-4 h-4 text-slate-500" />
            <span>ภาพรวมสโตร์</span>
          </Link>

          <Link
            href="/store/receive"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-sm transition-all"
          >
            <PackageCheck className="w-4 h-4 text-slate-500" />
            <span>รับสินค้าเข้าสโตร์</span>
          </Link>

          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 shadow-sm transition-all"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Approved - Waiting for Dispatch */}
        <div
          onClick={() => handleTabChange('APPROVED')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'APPROVED'
              ? 'border-amber-400 ring-2 ring-amber-100'
              : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">รอจัดของ / รอส่งมอบ</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              {metrics.approvedCount.toLocaleString()} <span className="text-sm font-normal text-amber-400">รายการ</span>
            </div>
            <div className="text-xs text-amber-700/80 mt-1 font-medium">
              อนุมัติแล้ว รอคลังจัดของและส่งมอบ
            </div>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div
          onClick={() => handleTabChange('COMPLETED')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'COMPLETED'
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">ส่งมอบเรียบร้อย</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              {metrics.completedCount.toLocaleString()} <span className="text-sm font-normal text-emerald-400">รายการ</span>
            </div>
            <div className="text-xs text-emerald-700/80 mt-1 font-medium">
              ส่งมอบของและบันทึกเสร็จสิ้น
            </div>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div
          onClick={() => handleTabChange('PENDING_APPROVAL')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'PENDING_APPROVAL'
              ? 'border-purple-400 ring-2 ring-purple-100'
              : 'border-slate-200/80 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">รอหัวหน้าอนุมัติ</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-600 tracking-tight">
              {metrics.pendingApprovalCount.toLocaleString()} <span className="text-sm font-normal text-purple-400">รายการ</span>
            </div>
            <div className="text-xs text-purple-700/80 mt-1 font-medium">
              คำขอเบิกที่อยู่ระหว่างรออนุมัติ
            </div>
          </div>
        </div>

        {/* Card 4: Total Items */}
        <div
          onClick={() => handleTabChange('ALL')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'ALL'
              ? 'border-blue-400 ring-2 ring-blue-100'
              : 'border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">รายการสิ่งของรวมทั้งหมด</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-600 tracking-tight">
              {metrics.totalItemsCount.toLocaleString()} <span className="text-sm font-normal text-blue-400">ชิ้น/รายการ</span>
            </div>
            <div className="text-xs text-blue-700/80 mt-1 font-medium">
              จากใบเบิกทั้งหมด {metrics.total} ฉบับ
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Company Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        {/* Row 1: Company Selector & Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">บริษัท:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'TE', 'TP', 'TG'] as const).map(comp => {
                const count = companyCounts[comp];
                const isSelected = companyFilter === comp;
                return (
                  <button
                    key={comp}
                    onClick={() => {
                      setCompanyFilter(comp);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{comp === 'ALL' ? 'ทุกบริษัท' : comp}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                        isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabChange('APPROVED')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'APPROVED'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>รอจัดของ ({tabCounts.APPROVED})</span>
            </button>
            <button
              onClick={() => handleTabChange('COMPLETED')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'COMPLETED'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ส่งมอบแล้ว ({tabCounts.COMPLETED})</span>
            </button>
            <button
              onClick={() => handleTabChange('ALL')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ทั้งหมด ({tabCounts.ALL})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search & Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ใบเบิก, ผู้ขอเบิก, บริษัท หรือรายการอุปกรณ์..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month Filter */}
          <div className="md:col-span-2">
            <select
              value={monthFilter}
              onChange={e => {
                setMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">ทุกเดือน</option>
              {thaiMonthOptions.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="md:col-span-2">
            <select
              value={yearFilter}
              onChange={e => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">ทุกปี</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>
                  ปี {parseInt(y, 10) + 543} ({y})
                </option>
              ))}
            </select>
          </div>

          {/* Exact Date Filter */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={dateFilter}
              onChange={e => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Active Filter Indicators & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">กำลังกรองข้อมูล:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  ค้นหา: &quot;{searchQuery}&quot;
                </span>
              )}
              {companyFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                  บริษัท: {companyFilter}
                </span>
              )}
              {monthFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                  เดือน: {thaiMonthOptions.find(m => m.value === monthFilter)?.label}
                </span>
              )}
              {yearFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-300">
                  ปี: {parseInt(yearFilter, 10) + 543}
                </span>
              )}
              {dateFilter && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  วันที่: {formatThaiDate(dateFilter)}
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Content: Table & Mobile Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            <span>รายการใบเบิกวัสดุอุปกรณ์ ({filteredRequisitions.length} รายการ)</span>
          </div>
          <div className="text-xs text-slate-500">
            แสดง {filteredRequisitions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, filteredRequisitions.length)} จาก {filteredRequisitions.length} รายการ
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">เลขที่ใบเบิก / วันที่</th>
                <th className="py-3 px-4">บริษัท</th>
                <th className="py-3 px-4">ผู้ขอเบิก / ผู้อนุมัติ</th>
                <th className="py-3 px-4">รายการอุปกรณ์ที่ขอเบิก</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-10 h-10 text-slate-300 stroke-1" />
                      <span className="text-sm font-medium text-slate-600">ไม่พบรายการเบิกอุปกรณ์</span>
                      <span className="text-xs text-slate-400">ลองปรับเปลี่ยนสถานะ ตัวกรอง หรือคำค้นหา</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map(req => {
                  const compBadge = getCompanyBadge(req.company);
                  const statusInfo = getStatusBadge(req.status);
                  const StatusIcon = statusInfo.icon;
                  const isLoading = !!loadingMap[req.id];

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Requisition Number & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => setDetailReq(req)}
                              className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                            >
                              {req.requisitionNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(req.requisitionNumber, 'เลขที่ใบเบิก')}
                              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                              title="คัดลอกเลขที่ใบเบิก"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {req.date ? formatThaiDate(req.date) : formatThaiDate(req.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${compBadge.badge}`}>
                          {compBadge.short}
                        </span>
                      </td>

                      {/* Requester & Approver */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="font-semibold text-slate-900 flex items-center gap-1 truncate" title={req.requesterName}>
                            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{req.requesterName || '-'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={`ผู้อนุมัติ: ${req.approverName || '-'}`}>
                            อนุมัติ: <span className="text-slate-700">{req.approverName || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Items Preview */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div
                          onClick={() => setDetailReq(req)}
                          className="cursor-pointer group flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                              {req.items?.length || 0} รายการ
                            </span>
                            <span className="text-[11px] text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                              {req.items?.[0] ? `${req.items[0].detail} (${req.items[0].quantity} ${req.items[0].unit})` : '-'}
                            </span>
                          </div>
                          {req.items && req.items.length > 1 && (
                            <span className="text-[10px] text-blue-500 group-hover:underline flex items-center gap-0.5">
                              <span>ดูเพิ่มอีก {req.items.length - 1} รายการ...</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${statusInfo.badge}`}>
                          <StatusIcon className={`w-3 h-3 ${statusInfo.iconColor}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === 'APPROVED' ? (
                            <>
                              <button
                                onClick={() => handleQuickFulfill(req)}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                                title="บันทึกส่งมอบอุปกรณ์ให้ผู้ขอเบิกเรียบร้อย"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isLoading ? 'กำลังบันทึก...' : 'ส่งมอบแล้ว'}</span>
                              </button>

                              <Link
                                href={`/store/requisitions/${req.id}`}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                                title="เปิดหน้าฟอร์มจัดของและตรวจสอบลายเซ็น"
                              >
                                <span>ฟอร์มจัดของ</span>
                              </Link>
                            </>
                          ) : (
                            <button
                              onClick={() => setDetailReq(req)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูรายละเอียด</span>
                            </button>
                          )}

                          <Link
                            href={`/requisitions/${req.id}/pdf`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="พิมพ์ใบเบิก PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden divide-y divide-slate-100 p-3 space-y-3">
          {paginatedList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto text-slate-300 stroke-1 mb-2" />
              <div className="text-sm font-medium text-slate-600">ไม่พบรายการเบิกอุปกรณ์</div>
            </div>
          ) : (
            paginatedList.map(req => {
              const compBadge = getCompanyBadge(req.company);
              const statusInfo = getStatusBadge(req.status);
              const StatusIcon = statusInfo.icon;
              const isLoading = !!loadingMap[req.id];

              return (
                <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  {/* Top Row: Requisition Number, Company, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        onClick={() => setDetailReq(req)}
                        className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                      >
                        {req.requisitionNumber}
                      </span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}>
                        {compBadge.short}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${statusInfo.badge}`}>
                      <StatusIcon className={`w-3 h-3 ${statusInfo.iconColor}`} />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Requester, Approver, Date */}
                  <div className="text-xs space-y-1 text-slate-700">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">ผู้ขอเบิก:</span>{' '}
                      <span className="font-semibold text-slate-900">{req.requesterName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">ผู้อนุมัติ:</span>{' '}
                      <span className="text-slate-700">{req.approverName || '-'}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      วันที่: {req.date ? formatThaiDate(req.date) : formatThaiDate(req.createdAt)}
                    </div>
                  </div>

                  {/* Items Summary Snippet */}
                  <div
                    onClick={() => setDetailReq(req)}
                    className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-700 text-[11px]">
                      <span>รายการอุปกรณ์ที่ขอเบิก</span>
                      <span className="text-blue-600 font-bold">{req.items?.length || 0} รายการ</span>
                    </div>
                    {req.items && req.items.length > 0 ? (
                      <div className="text-slate-600 truncate text-[11px]">
                        {req.items[0].detail} ({req.items[0].quantity} {req.items[0].unit})
                        {req.items.length > 1 && ` และอีก ${req.items.length - 1} รายการ...`}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">ไม่มีรายการ</div>
                    )}
                  </div>

                  {/* Mobile Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/requisitions/${req.id}/pdf`}
                      target="_blank"
                      className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์ PDF</span>
                    </Link>

                    {req.status === 'APPROVED' ? (
                      <button
                        onClick={() => handleQuickFulfill(req)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'กำลังบันทึก...' : 'ส่งมอบแล้ว'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setDetailReq(req)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูข้อมูล</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {filteredRequisitions.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              หน้า <span className="font-semibold text-slate-800">{currentPage}</span> จาก{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span> (ทั้งหมด{' '}
              {filteredRequisitions.length} รายการ)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>
              <div className="text-xs font-bold px-2 text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detailed Requisition Inspection Modal */}
      {detailReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {detailReq.requisitionNumber}
                  </span>
                  {(() => {
                    const b = getCompanyBadge(detailReq.company);
                    return (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${b.badge}`}>
                        {b.short}
                      </span>
                    );
                  })()}
                  <button
                    onClick={() => handleCopy(detailReq.requisitionNumber, 'เลขที่ใบเบิก')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="คัดลอกเลขที่ใบเบิก"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>วันที่: <span className="font-semibold text-slate-700">{detailReq.date ? formatThaiDate(detailReq.date) : '-'}</span></span>
                  {(() => {
                    const s = getStatusBadge(detailReq.status);
                    const Icon = s.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${s.badge}`}>
                        <Icon className={`w-3 h-3 ${s.iconColor}`} />
                        <span>{s.label}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              <button
                onClick={() => setDetailReq(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Requester & Approver Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>ผู้ขอเบิก (Requester)</span>
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{detailReq.requesterName || '-'}</div>
                  {detailReq.requesterSignatureUrl && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400">ลายเซ็นผู้ขอเบิก:</span>
                      <div className="h-14 flex items-center justify-start mt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detailReq.requesterSignatureUrl}
                          alt="Requester Signature"
                          className="max-h-12 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>ผู้อนุมัติ (Approver)</span>
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{detailReq.approverName || '-'}</div>
                  {detailReq.approverSignatureUrl && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400">ลายเซ็นผู้อนุมัติ:</span>
                      <div className="h-14 flex items-center justify-start mt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detailReq.approverSignatureUrl}
                          alt="Approver Signature"
                          className="max-h-12 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>รายการวัสดุอุปกรณ์ที่ขอเบิก ({detailReq.items?.length || 0} รายการ)</span>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">รายละเอียดสิ่งของ</th>
                        <th className="py-2.5 px-3 text-right">จำนวน</th>
                        <th className="py-2.5 px-3">หน่วย</th>
                        <th className="py-2.5 px-3">งานที่ใช้ / โครงการ</th>
                        <th className="py-2.5 px-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {detailReq.items && detailReq.items.length > 0 ? (
                        detailReq.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.detail}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-slate-600">{item.unit}</td>
                            <td className="py-2.5 px-3 text-slate-700">{item.job || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{item.remark || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            ไม่มีรายการสิ่งของ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setDetailReq(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                ปิดหน้าต่าง
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/requisitions/${detailReq.id}/pdf`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>พิมพ์ใบเบิก PDF</span>
                </Link>

                {detailReq.status === 'APPROVED' && (
                  <button
                    onClick={() => handleQuickFulfill(detailReq)}
                    disabled={!!loadingMap[detailReq.id]}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกส่งมอบเรียบร้อย</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
