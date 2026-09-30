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
  FileCheck,
  ChevronDown,
  BarChart3,
  FileSpreadsheet,
  Download,
  TrendingUp,
  PieChart,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { updateRequisitionStatus, returnMaterialRequisition } from '@/app/actions/requisitions';

export interface RequisitionItem {
  detail: string;
  quantity: number | string;
  unit: string;
  job?: string;
  remark?: string;
  returnedQuantity?: number;
  returnDate?: string;
  returnCondition?: string;
  returnRemark?: string;
  returnReceiver?: string;
  returnerName?: string;
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
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVED' | 'COMPLETED' | 'RETURNED' | 'PENDING_APPROVAL'>('APPROVED');

  // Modal State
  const [detailReq, setDetailReq] = useState<Requisition | null>(null);

  // Return Modal State
  const [returnModalReq, setReturnModalReq] = useState<Requisition | null>(null);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [returnerName, setReturnerName] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>(userName || '');
  const [returnNote, setReturnNote] = useState<string>('');
  const [returnItemsState, setReturnItemsState] = useState<Array<{
    index: number;
    isSelected: boolean;
    detail: string;
    quantity: number;
    returnedQuantity: number;
    unit: string;
    condition: string;
    remark: string;
  }>>([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Summary Report & Export States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportScope, setReportScope] = useState<'FILTERED' | 'ALL'>('FILTERED');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [reportActiveTab, setReportActiveTab] = useState<'OVERVIEW' | 'ALL_ITEMS' | 'RETURN_TRACKING'>('OVERVIEW');

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
          label: 'ส่งมอบแล้ว (รอคืน/ใช้งาน)',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600'
        };
      case 'RETURNED':
        return {
          label: 'คืนของเรียบร้อย',
          badge: 'bg-teal-50 text-teal-800 border-teal-300 font-semibold',
          icon: RotateCcw,
          iconColor: 'text-teal-600'
        };
      case 'PARTIALLY_RETURNED':
        return {
          label: 'คืนบางส่วน',
          badge: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold',
          icon: RotateCcw,
          iconColor: 'text-indigo-600'
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
    let returnedCount = 0;
    let pendingApprovalCount = 0;
    let totalItemsCount = 0;

    requisitions.forEach(req => {
      if (req.status === 'APPROVED') approvedCount++;
      if (req.status === 'COMPLETED' || req.status === 'PARTIALLY_RETURNED') completedCount++;
      if (req.status === 'RETURNED') returnedCount++;
      if (req.status === 'PENDING_APPROVAL') pendingApprovalCount++;
      if (Array.isArray(req.items)) {
        totalItemsCount += req.items.length;
      }
    });

    return {
      total: requisitions.length,
      approvedCount,
      completedCount,
      returnedCount,
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
    const counts = { ALL: requisitions.length, APPROVED: 0, COMPLETED: 0, RETURNED: 0, PENDING_APPROVAL: 0 };
    requisitions.forEach(req => {
      if (req.status === 'APPROVED') counts.APPROVED++;
      if (req.status === 'COMPLETED' || req.status === 'PARTIALLY_RETURNED') counts.COMPLETED++;
      if (req.status === 'RETURNED') counts.RETURNED++;
      if (req.status === 'PENDING_APPROVAL') counts.PENDING_APPROVAL++;
    });
    return counts;
  }, [requisitions]);

  // Filter Engine
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      // 1. Tab Status Filter
      if (activeTab !== 'ALL') {
        if (activeTab === 'COMPLETED') {
          if (req.status !== 'COMPLETED' && req.status !== 'PARTIALLY_RETURNED') return false;
        } else if (req.status !== activeTab) {
          return false;
        }
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

  const handleTabChange = (tab: 'ALL' | 'APPROVED' | 'COMPLETED' | 'RETURNED' | 'PENDING_APPROVAL') => {
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

  // Active dataset for reporting
  const reportSourceData = useMemo(() => {
    return reportScope === 'FILTERED' ? filteredRequisitions : requisitions;
  }, [reportScope, filteredRequisitions, requisitions]);

  // Comprehensive Aggregate Calculations for Summary Report
  const reportStats = useMemo(() => {
    const totalReqs = reportSourceData.length;
    let approved = 0;
    let completed = 0;
    let returned = 0;
    let partiallyReturned = 0;
    let pendingApproval = 0;
    let rejected = 0;
    let totalItems = 0;
    let totalQuantity = 0;
    let totalReturnedQuantity = 0;

    const conditionCounts: Record<string, number> = {
      NORMAL: 0,
      DAMAGED: 0,
      LOST: 0
    };

    const companyBreakdown: Record<string, { count: number; itemsCount: number; quantity: number; returnedQuantity: number }> = {
      TE: { count: 0, itemsCount: 0, quantity: 0, returnedQuantity: 0 },
      TP: { count: 0, itemsCount: 0, quantity: 0, returnedQuantity: 0 },
      TG: { count: 0, itemsCount: 0, quantity: 0, returnedQuantity: 0 },
      OTHER: { count: 0, itemsCount: 0, quantity: 0, returnedQuantity: 0 },
    };

    const requesterMap: Record<string, { name: string; reqCount: number; itemsCount: number; quantity: number; returnedQuantity: number }> = {};
    const itemAggregateMap: Record<string, {
      detail: string;
      totalQty: number;
      totalReturnedQty: number;
      unit: string;
      reqCount: number;
      returnCount: number;
      jobs: Set<string>;
      companies: Set<string>;
      sampleRequesters: Set<string>;
    }> = {};

    reportSourceData.forEach(req => {
      if (req.status === 'APPROVED') approved++;
      else if (req.status === 'COMPLETED') completed++;
      else if (req.status === 'RETURNED') returned++;
      else if (req.status === 'PARTIALLY_RETURNED') partiallyReturned++;
      else if (req.status === 'PENDING_APPROVAL') pendingApproval++;
      else if (req.status === 'REJECTED') rejected++;

      const comp = normalizeCompany(req.company);
      if (companyBreakdown[comp]) {
        companyBreakdown[comp].count++;
      } else {
        companyBreakdown.OTHER.count++;
      }

      const requester = req.requesterName || 'ไม่ระบุ';
      if (!requesterMap[requester]) {
        requesterMap[requester] = { name: requester, reqCount: 0, itemsCount: 0, quantity: 0, returnedQuantity: 0 };
      }
      requesterMap[requester].reqCount++;

      if (Array.isArray(req.items)) {
        req.items.forEach(it => {
          totalItems++;
          const qty = Number(it.quantity) || 1;
          totalQuantity += qty;

          const retQty = it.returnedQuantity !== undefined 
            ? Number(it.returnedQuantity) 
            : (req.status === 'RETURNED' ? qty : 0);
          totalReturnedQuantity += retQty;

          if (it.returnCondition) {
            const cond = it.returnCondition.toUpperCase();
            if (conditionCounts[cond] !== undefined) {
              conditionCounts[cond] += (retQty > 0 ? retQty : 1);
            }
          } else if (req.status === 'RETURNED') {
            conditionCounts.NORMAL += qty;
          }

          if (companyBreakdown[comp]) {
            companyBreakdown[comp].itemsCount++;
            companyBreakdown[comp].quantity += qty;
            companyBreakdown[comp].returnedQuantity += retQty;
          }

          requesterMap[requester].itemsCount++;
          requesterMap[requester].quantity += qty;
          requesterMap[requester].returnedQuantity += retQty;

          const normName = (it.detail || '').trim();
          if (normName) {
            const key = normName.toLowerCase();
            if (!itemAggregateMap[key]) {
              itemAggregateMap[key] = {
                detail: normName,
                totalQty: 0,
                totalReturnedQty: 0,
                unit: it.unit || 'ชิ้น',
                reqCount: 0,
                returnCount: 0,
                jobs: new Set(),
                companies: new Set(),
                sampleRequesters: new Set(),
              };
            }
            itemAggregateMap[key].totalQty += qty;
            itemAggregateMap[key].totalReturnedQty += retQty;
            itemAggregateMap[key].reqCount++;
            if (retQty > 0) itemAggregateMap[key].returnCount++;
            if (it.job) itemAggregateMap[key].jobs.add(it.job);
            if (req.company) itemAggregateMap[key].companies.add(comp);
            if (req.requesterName) itemAggregateMap[key].sampleRequesters.add(req.requesterName);
          }
        });
      }
    });

    const totalPendingReturnQuantity = Math.max(0, totalQuantity - totalReturnedQuantity);
    const returnRate = totalQuantity > 0 ? Math.round((totalReturnedQuantity / totalQuantity) * 100) : 0;
    const fulfillRate = totalReqs > 0 ? Math.round(((completed + returned + partiallyReturned) / totalReqs) * 100) : 0;

    const sortedMaterials = Object.values(itemAggregateMap).sort((a, b) => b.totalQty - a.totalQty);
    const sortedRequesters = Object.values(requesterMap).sort((a, b) => b.reqCount - a.reqCount);

    return {
      totalReqs,
      approved,
      completed,
      returned,
      partiallyReturned,
      pendingApproval,
      rejected,
      totalItems,
      totalQuantity,
      totalReturnedQuantity,
      totalPendingReturnQuantity,
      returnRate,
      fulfillRate,
      conditionCounts,
      companyBreakdown,
      sortedMaterials,
      sortedRequesters
    };
  }, [reportSourceData]);

  // Filtered materials inside the summary report modal
  const filteredReportMaterials = useMemo(() => {
    let list = reportStats.sortedMaterials;
    if (reportActiveTab === 'RETURN_TRACKING') {
      list = [...reportStats.sortedMaterials].sort((a, b) => b.totalReturnedQty - a.totalReturnedQty);
    }
    if (!reportSearchQuery.trim()) return list;
    const q = reportSearchQuery.toLowerCase().trim();
    return list.filter(m =>
      m.detail.toLowerCase().includes(q) ||
      m.unit.toLowerCase().includes(q) ||
      Array.from(m.jobs).some(j => j.toLowerCase().includes(q))
    );
  }, [reportStats.sortedMaterials, reportSearchQuery, reportActiveTab]);

  // Export to Excel handler
  const handleExportExcel = (
    scope: 'FILTERED' | 'ALL' = reportScope,
    mode: 'FULL_REPORT' | 'BORROW_SUMMARY_ONLY' = 'FULL_REPORT'
  ) => {
    try {
      const dataToExport = scope === 'FILTERED' ? filteredRequisitions : requisitions;

      if (!dataToExport || dataToExport.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่มีข้อมูลสำหรับส่งออก',
          text: 'ไม่พบรายการใบเบิกที่ตรงตามเงื่อนไขที่เลือก',
          confirmButtonText: 'ตกลง'
        });
        return;
      }

      const dateNow = new Date();
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const dateStr = `${dateNow.getDate()} ${thaiMonths[dateNow.getMonth()]} ${dateNow.getFullYear() + 543}`;
      const isoDate = dateNow.toISOString().slice(0, 10);

      // Helper: Format Date in Thai Buddhist Era (e.g. 25/9/2569)
      const formatSheetDate = (d?: string | Date | null) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const day = dateObj.getDate();
        const month = dateObj.getMonth() + 1;
        const yearBe = dateObj.getFullYear() + 543;
        return `${day}/${month}/${yearBe}`;
      };

      // Helper: Smart Item Code & Detail extraction
      const getItemCodeAndDetail = (item: RequisitionItem) => {
        if ((item as any).code) return { code: (item as any).code, detail: item.detail };
        if ((item as any).itemCode) return { code: (item as any).itemCode, detail: item.detail };
        if ((item as any).sku) return { code: (item as any).sku, detail: item.detail };

        const raw = (item.detail || '').trim();
        if (!raw) return { code: '-', detail: '-' };

        // [CODE] Description
        const mBracket = raw.match(/^\[([A-Za-z0-9-_/.]+)\]\s*(.*)$/);
        if (mBracket) return { code: mBracket[1], detail: mBracket[2] || raw };

        // CODE: Description
        const mColon = raw.match(/^([A-Za-z0-9-_/.]{2,30}):\s*(.*)$/);
        if (mColon) return { code: mColon[1], detail: mColon[2] || raw };

        // Starts with uppercase alphanumeric code like INV-AC10T22R2GB or TRD
        const mToken = raw.match(/^([A-Z0-9][A-Z0-9-_/.]{1,24})\s+(.*)$/);
        if (mToken && (mToken[1].includes('-') || mToken[1].length <= 8 || mToken[1].startsWith('INV') || mToken[1].startsWith('TRD') || mToken[1].startsWith('XS'))) {
          return { code: mToken[1], detail: mToken[2] };
        }

        return { code: '-', detail: raw };
      };

      // =========================================================================
      // --- Sheet: สรุปใบยืม XS ประจำเดือน (Borrowing Summary with Signatures) ---
      // =========================================================================
      const borrowHeader = [
        'ลำดับ',
        'เลขที่ใบยืมสินค้า',
        'วันที่ออกเอกสาร',
        'ลูกค้า',
        'รหัส',
        'รายการ',
        'จำนวน',
        'หน่วยนับ',
        'ผู้ยืม',
        'วันที่คืน',
        'เลขที่ใบรับสินค้าคืน',
        'ผู้รับ',
        'หมายเหตุ'
      ];

      const borrowRows: any[][] = [];
      let borrowIdx = 1;
      let totalBorrowQty = 0;
      let totalReturnedBorrowQty = 0;

      dataToExport.forEach((req) => {
        const reqDate = formatSheetDate(req.date || req.createdAt);
        const borrower = req.requesterName || '-';

        if (Array.isArray(req.items) && req.items.length > 0) {
          req.items.forEach((item) => {
            const { code, detail } = getItemCodeAndDetail(item);
            const qty = Number(item.quantity) || 1;
            totalBorrowQty += qty;

            const retQty = item.returnedQuantity !== undefined 
              ? Number(item.returnedQuantity) 
              : (req.status === 'RETURNED' ? qty : 0);
            totalReturnedBorrowQty += retQty;

            const retDate = item.returnDate
              ? formatSheetDate(item.returnDate)
              : (req.status === 'RETURNED' && req.updatedAt ? formatSheetDate(req.updatedAt) : '');

            const returnDocNo = (item as any).returnDocNo || (item as any).returnSlipNo || (retQty > 0 ? `RET-${req.requisitionNumber.replace(/^REQ-/, '')}` : '');
            const receiver = item.returnReceiver || (retQty > 0 ? 'เจ้าหน้าที่สโตร์' : '');

            let remarks = item.returnRemark || item.remark || '';
            if (!remarks && retQty > 0) {
              remarks = retQty >= qty ? 'คืนครบถ้วน' : `คืนแล้ว ${retQty} ชิ้น (ค้าง ${qty - retQty})`;
            }

            const customer = item.job || req.company || '-';

            borrowRows.push([
              borrowIdx++,
              req.requisitionNumber,
              reqDate,
              customer,
              code,
              detail,
              qty,
              item.unit || 'EA',
              item.returnerName || borrower,
              retDate,
              returnDocNo,
              receiver,
              remarks
            ]);
          });
        } else {
          borrowRows.push([
            borrowIdx++,
            req.requisitionNumber,
            reqDate,
            req.company || '-',
            '-',
            '(ไม่มีรายการอุปกรณ์)',
            0,
            'EA',
            borrower,
            '',
            '',
            '',
            ''
          ]);
        }
      });

      const totalPendingBorrowQty = Math.max(0, totalBorrowQty - totalReturnedBorrowQty);

      // Summary Total Row
      const totalRow = [
        'รวมทั้งสิ้น',
        '',
        '',
        '',
        '',
        `รวม ${borrowRows.length} รายการ`,
        totalBorrowQty,
        'ชิ้น/หน่วย',
        '',
        '',
        '',
        '',
        `รับคืนแล้ว ${totalReturnedBorrowQty} / ค้างคืน ${totalPendingBorrowQty} ชิ้น`
      ];

      const sigRowStart = 3 + borrowRows.length + 3;

      const sheetBorrowAoa: any[][] = [
        [], // Row 1 padding
        ['สรุปใบยืม XS ประจำเดือน'], // Row 2 Header Banner
        borrowHeader, // Row 3 Table Header
        ...borrowRows, // Row 4..N Data Rows
        totalRow, // Row N+1 Total Row
        [], // Row N+2 blank
        [], // Row N+3 blank
        // Signature Block: Borrower & Receiver
        [
          '',
          'ลงชื่อ ................................................................ ผู้ส่งคืน / ผู้ยืม',
          '',
          '',
          '',
          '',
          '',
          'ลงชื่อ ................................................................ ผู้รับคืน (เจ้าหน้าที่คลังสินค้า)',
          '',
          '',
          '',
          '',
          ''
        ],
        [
          '',
          '     ( ................................................................ )',
          '',
          '',
          '',
          '',
          '',
          '     ( ................................................................ )',
          '',
          '',
          '',
          '',
          ''
        ],
        [
          '',
          'ตำแหน่ง .................................................................',
          '',
          '',
          '',
          '',
          '',
          'ตำแหน่ง .................................................................',
          '',
          '',
          '',
          '',
          ''
        ],
        [
          '',
          'วันที่ ...... / ...... / 25......',
          '',
          '',
          '',
          '',
          '',
          'วันที่ ...... / ...... / 25......',
          '',
          '',
          '',
          '',
          ''
        ],
        [], // Blank separator
        // Supervisor Signature Block
        [
          '',
          '',
          '',
          '',
          'ลงชื่อ ................................................................ ผู้ตรวจสอบ / หัวหน้าฝ่ายคลังสินค้า',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ],
        [
          '',
          '',
          '',
          '',
          '     ( ................................................................ )',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ],
        [
          '',
          '',
          '',
          '',
          'วันที่ ...... / ...... / 25......',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]
      ];

      const wsBorrow = XLSX.utils.aoa_to_sheet(sheetBorrowAoa);
      wsBorrow['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 20 }, // เลขที่ใบยืมสินค้า
        { wch: 16 }, // วันที่ออกเอกสาร
        { wch: 32 }, // ลูกค้า
        { wch: 20 }, // รหัส
        { wch: 50 }, // รายการ
        { wch: 10 }, // จำนวน
        { wch: 10 }, // หน่วยนับ
        { wch: 22 }, // ผู้ยืม
        { wch: 16 }, // วันที่คืน
        { wch: 22 }, // เลขที่ใบรับสินค้าคืน
        { wch: 22 }, // ผู้รับ
        { wch: 30 }  // หมายเหตุ
      ];

      // Merges configuration for Title, Total, and Signatures
      wsBorrow['!merges'] = [
        { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }, // Title Banner across A2:M2
        { s: { r: 3 + borrowRows.length, c: 0 }, e: { r: 3 + borrowRows.length, c: 4 } }, // Total label A..E
        // Signatures merges
        { s: { r: sigRowStart, c: 1 }, e: { r: sigRowStart, c: 5 } },
        { s: { r: sigRowStart, c: 7 }, e: { r: sigRowStart, c: 11 } },
        { s: { r: sigRowStart + 1, c: 1 }, e: { r: sigRowStart + 1, c: 5 } },
        { s: { r: sigRowStart + 1, c: 7 }, e: { r: sigRowStart + 1, c: 11 } },
        { s: { r: sigRowStart + 2, c: 1 }, e: { r: sigRowStart + 2, c: 5 } },
        { s: { r: sigRowStart + 2, c: 7 }, e: { r: sigRowStart + 2, c: 11 } },
        { s: { r: sigRowStart + 3, c: 1 }, e: { r: sigRowStart + 3, c: 5 } },
        { s: { r: sigRowStart + 3, c: 7 }, e: { r: sigRowStart + 3, c: 11 } },
        // Supervisor merges
        { s: { r: sigRowStart + 5, c: 4 }, e: { r: sigRowStart + 5, c: 8 } },
        { s: { r: sigRowStart + 6, c: 4 }, e: { r: sigRowStart + 6, c: 8 } },
        { s: { r: sigRowStart + 7, c: 4 }, e: { r: sigRowStart + 7, c: 8 } }
      ];

      // If dedicated borrow summary sheet requested
      if (mode === 'BORROW_SUMMARY_ONLY') {
        const wbSingle = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbSingle, wsBorrow, 'สรุปใบยืม XS ประจำเดือน');
        const filename = `สรุปใบยืมสินค้า_XS_ประจำเดือน_${isoDate}.xlsx`;
        XLSX.writeFile(wbSingle, filename);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'ส่งออกไฟล์สรุปใบยืม XS สำเร็จแล้ว',
          text: `ไฟล์: ${filename}`,
          showConfirmButton: false,
          timer: 3000
        });
        return;
      }

      // --- Sheet 1: สรุปภาพรวม (Summary) ---
      let approvedCount = 0;
      let completedCount = 0;
      let returnedCount = 0;
      let partiallyReturnedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;
      let totalItems = 0;
      let totalQty = 0;
      let totalReturnedQty = 0;

      const conditionStats: Record<string, number> = {
        NORMAL: 0,
        DAMAGED: 0,
        LOST: 0,
      };

      const compStats: Record<string, number> = { TE: 0, TP: 0, TG: 0, OTHER: 0 };
      const itemAggMap: Record<string, { detail: string; qty: number; returnedQty: number; unit: string; count: number; jobs: Set<string> }> = {};

      dataToExport.forEach(r => {
        if (r.status === 'APPROVED') approvedCount++;
        else if (r.status === 'COMPLETED') completedCount++;
        else if (r.status === 'RETURNED') returnedCount++;
        else if (r.status === 'PARTIALLY_RETURNED') partiallyReturnedCount++;
        else if (r.status === 'PENDING_APPROVAL') pendingCount++;
        else if (r.status === 'REJECTED') rejectedCount++;

        const c = normalizeCompany(r.company);
        compStats[c] = (compStats[c] || 0) + 1;

        if (Array.isArray(r.items)) {
          r.items.forEach(it => {
            totalItems++;
            const q = Number(it.quantity) || 1;
            totalQty += q;

            const retQ = it.returnedQuantity !== undefined 
              ? Number(it.returnedQuantity) 
              : (r.status === 'RETURNED' ? q : 0);
            totalReturnedQty += retQ;

            if (it.returnCondition) {
              const cond = it.returnCondition.toUpperCase();
              if (conditionStats[cond] !== undefined) {
                conditionStats[cond] += (retQ > 0 ? retQ : 1);
              }
            } else if (r.status === 'RETURNED') {
              conditionStats.NORMAL += q;
            }

            const key = (it.detail || '').trim().toLowerCase();
            if (key) {
              if (!itemAggMap[key]) {
                itemAggMap[key] = { detail: (it.detail || '').trim(), qty: 0, returnedQty: 0, unit: it.unit || 'ชิ้น', count: 0, jobs: new Set() };
              }
              itemAggMap[key].qty += q;
              itemAggMap[key].returnedQty += retQ;
              itemAggMap[key].count++;
              if (it.job) itemAggMap[key].jobs.add(it.job);
            }
          });
        }
      });

      const totalPendingReturnQty = Math.max(0, totalQty - totalReturnedQty);
      const returnRate = totalQty > 0 ? `${((totalReturnedQty / totalQty) * 100).toFixed(1)}%` : '0%';
      const fulfillRate = dataToExport.length > 0 ? `${(((completedCount + returnedCount + partiallyReturnedCount) / dataToExport.length) * 100).toFixed(1)}%` : '0%';

      const top15 = Object.values(itemAggMap).sort((a, b) => b.qty - a.qty).slice(0, 15);

      const summaryRows: any[][] = [
        ['รายงานสรุปการเบิกและยืม-คืนวัสดุอุปกรณ์ - คลังสินค้า Tera Group'],
        [`วันที่ส่งออกข้อมูล: ${dateStr}`, `ขอบเขตข้อมูล: ${scope === 'FILTERED' ? 'ตามตัวกรองปัจจุบัน' : 'ข้อมูลทั้งหมด'}`],
        [],
        ['1. สรุปภาพรวมสถานะใบเบิก'],
        ['สถานะใบเบิก', 'จำนวนใบเบิก (ฉบับ)', 'สัดส่วน (%)'],
        ['ส่งมอบแล้ว / รอคืน (Completed)', completedCount, dataToExport.length > 0 ? `${((completedCount / dataToExport.length) * 100).toFixed(1)}%` : '0%'],
        ['คืนของเรียบร้อย (Returned)', returnedCount, dataToExport.length > 0 ? `${((returnedCount / dataToExport.length) * 100).toFixed(1)}%` : '0%'],
        ['คืนบางส่วน (Partially Returned)', partiallyReturnedCount, dataToExport.length > 0 ? `${((partiallyReturnedCount / dataToExport.length) * 100).toFixed(1)}%` : '0%'],
        ['รอจัดของ / รอส่งมอบ (Approved)', approvedCount, dataToExport.length > 0 ? `${((approvedCount / dataToExport.length) * 100).toFixed(1)}%` : '0%'],
        ['รอหัวหน้าอนุมัติ (Pending Approval)', pendingCount, dataToExport.length > 0 ? `${((pendingCount / dataToExport.length) * 100).toFixed(1)}%` : '0%'],
        ['ไม่อนุมัติ (Rejected)', rejectedCount, dataToExport.length > 0 ? `${((rejectedCount / dataToExport.length) * 100).toFixed(1)}%` : '0%'],
        ['รวมใบเบิกทั้งหมด', dataToExport.length, '100%'],
        [],
        ['2. สถิติวัสดุอุปกรณ์และการคืนของ'],
        ['ตัวชี้วัด', 'ค่า', 'หน่วย'],
        ['จำนวนรายการวัสดุรวม (Item entries)', totalItems, 'รายการ'],
        ['ยอดจำนวนชิ้นที่เบิกทั้งหมด (Total Requisitioned Units)', totalQty, 'หน่วย/ชิ้น'],
        ['ยอดจำนวนชิ้นที่รับคืนเข้าสโตร์แล้ว (Total Returned Units)', totalReturnedQty, 'หน่วย/ชิ้น'],
        ['ยอดจำนวนชิ้นคงค้างยังไม่คืน (Pending Return Units)', totalPendingReturnQty, 'หน่วย/ชิ้น'],
        ['อัตราการรับคืนของ (Return Rate)', returnRate, '-'],
        ['อัตราการส่งมอบของ (Fulfill Rate)', fulfillRate, '-'],
        ['สภาพอุปกรณ์ที่รับคืน: สภาพปกติ (พร้อมใช้งาน)', conditionStats.NORMAL, 'หน่วย/ชิ้น'],
        ['สภาพอุปกรณ์ที่รับคืน: ชำรุด (ส่งซ่อม)', conditionStats.DAMAGED, 'หน่วย/ชิ้น'],
        ['สภาพอุปกรณ์ที่รับคืน: สูญหาย', conditionStats.LOST, 'หน่วย/ชิ้น'],
        [],
        ['3. แยกตามบริษัท'],
        ['บริษัท', 'จำนวนใบเบิก (ฉบับ)'],
        ['TE (Tera Electric)', compStats.TE || 0],
        ['TP (Tera Power)', compStats.TP || 0],
        ['TG (Tera Group)', compStats.TG || 0],
        ['อื่นๆ / ไม่ระบุ', compStats.OTHER || 0],
        [],
        ['4. รายการวัสดุ/อุปกรณ์ที่มีการเบิกมากที่สุด (Top 15 Items)'],
        ['อันดับ', 'ชื่อรายการวัสดุอุปกรณ์', 'จำนวนเบิกทั้งหมด', 'จำนวนที่คืนแล้ว', 'คงค้างคืน', 'หน่วยนับ', 'จำนวนครั้งที่เบิก', 'งาน/โครงการที่นำไปใช้'],
        ...top15.map((item, idx) => [
          idx + 1,
          item.detail,
          item.qty,
          item.returnedQty,
          Math.max(0, item.qty - item.returnedQty),
          item.unit,
          item.count,
          Array.from(item.jobs).slice(0, 3).join(', ') || '-'
        ])
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 40 }];

      // --- Sheet 2: รายการวัสดุรายชิ้น (Items Detail) ---
      const itemsHeader = [
        'ลำดับ',
        'เลขที่ใบเบิก',
        'วันที่เบิก',
        'บริษัท',
        'ผู้ขอเบิก',
        'ผู้อนุมัติ',
        'สถานะใบเบิก',
        'ลำดับรายการ',
        'ชื่อรายการวัสดุ/อุปกรณ์',
        'จำนวนที่เบิก',
        'จำนวนที่คืนแล้ว',
        'จำนวนคงค้างคืน',
        'หน่วยนับ',
        'สถานะการคืน',
        'สภาพอุปกรณ์ที่คืน',
        'วันที่รับคืน',
        'ผู้ส่งคืนอุปกรณ์',
        'เจ้าหน้าที่สโตร์ผู้รับคืน',
        'หมายเหตุการคืน',
        'งาน/Job ที่ใช้',
        'หมายเหตุการเบิก'
      ];

      const itemsRows: any[][] = [];
      let globalItemIndex = 1;

      dataToExport.forEach(req => {
        const reqDate = req.date ? formatThaiDate(req.date) : (req.createdAt ? formatThaiDate(req.createdAt) : '-');
        const comp = normalizeCompany(req.company);
        const statusLabel = getStatusBadge(req.status).label;

        if (Array.isArray(req.items) && req.items.length > 0) {
          req.items.forEach((item, itemIdx) => {
            const origQty = Number(item.quantity) || 1;
            const retQty = item.returnedQuantity !== undefined 
              ? Number(item.returnedQuantity) 
              : (req.status === 'RETURNED' ? origQty : 0);
            const pendingQty = Math.max(0, origQty - retQty);

            let returnStatusText = 'ยังไม่คืน';
            if (req.status === 'APPROVED' || req.status === 'PENDING_APPROVAL') {
              returnStatusText = 'ยังไม่ส่งมอบ';
            } else if (retQty >= origQty && origQty > 0) {
              returnStatusText = 'คืนครบถ้วน';
            } else if (retQty > 0) {
              returnStatusText = 'คืนบางส่วน';
            }

            let conditionText = '-';
            if (item.returnCondition) {
              const c = item.returnCondition.toUpperCase();
              if (c === 'NORMAL') conditionText = 'สภาพปกติ (พร้อมใช้)';
              else if (c === 'DAMAGED') conditionText = 'ชำรุด (ส่งซ่อม)';
              else if (c === 'LOST') conditionText = 'สูญหาย';
              else conditionText = item.returnCondition;
            } else if (req.status === 'RETURNED') {
              conditionText = 'สภาพปกติ (พร้อมใช้)';
            }

            const retDate = item.returnDate 
              ? formatThaiDate(item.returnDate) 
              : (req.status === 'RETURNED' && req.updatedAt ? formatThaiDate(req.updatedAt) : '-');
            const returner = item.returnerName || (retQty > 0 ? (req.requesterName || '-') : '-');
            const receiver = item.returnReceiver || (retQty > 0 ? 'เจ้าหน้าที่สโตร์' : '-');
            const retRemark = item.returnRemark || '-';

            itemsRows.push([
              globalItemIndex++,
              req.requisitionNumber,
              reqDate,
              comp,
              req.requesterName || '-',
              req.approverName || '-',
              statusLabel,
              itemIdx + 1,
              item.detail || '-',
              origQty,
              retQty,
              pendingQty,
              item.unit || '-',
              returnStatusText,
              conditionText,
              retDate,
              returner,
              receiver,
              retRemark,
              item.job || '-',
              item.remark || '-'
            ]);
          });
        } else {
          itemsRows.push([
            globalItemIndex++,
            req.requisitionNumber,
            reqDate,
            comp,
            req.requesterName || '-',
            req.approverName || '-',
            statusLabel,
            '-',
            '(ไม่มีรายการ)',
            0,
            0,
            0,
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-'
          ]);
        }
      });

      const wsItems = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsRows]);
      wsItems['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 18 }, // เลขที่ใบเบิก
        { wch: 16 }, // วันที่เบิก
        { wch: 10 }, // บริษัท
        { wch: 22 }, // ผู้ขอเบิก
        { wch: 22 }, // ผู้อนุมัติ
        { wch: 22 }, // สถานะ
        { wch: 12 }, // ลำดับรายการ
        { wch: 35 }, // ชื่อรายการวัสดุ
        { wch: 12 }, // จำนวนเบิก
        { wch: 14 }, // จำนวนคืนแล้ว
        { wch: 14 }, // คงค้างคืน
        { wch: 10 }, // หน่วยนับ
        { wch: 16 }, // สถานะการคืน
        { wch: 22 }, // สภาพอุปกรณ์
        { wch: 16 }, // วันที่รับคืน
        { wch: 20 }, // ผู้ส่งคืน
        { wch: 22 }, // เจ้าหน้าที่รับคืน
        { wch: 25 }, // หมายเหตุการคืน
        { wch: 22 }, // งานที่ใช้
        { wch: 22 }  // หมายเหตุเดิม
      ];

      // --- Sheet 3: สรุปตามใบเบิก (Requisitions List) ---
      const reqsHeader = [
        'ลำดับ',
        'เลขที่ใบเบิก',
        'วันที่ขอเบิก',
        'บริษัท',
        'ผู้ขอเบิก',
        'ผู้อนุมัติ',
        'สถานะใบเบิก',
        'จำนวนชนิดสิ่งของ (รายการ)',
        'จำนวนชิ้นเบิกรวม (หน่วย)',
        'จำนวนชิ้นคืนแล้ว (หน่วย)',
        'จำนวนชิ้นคงค้างคืน (หน่วย)',
        'สถานะการคืนภาพรวม',
        'วันที่รับคืนล่าสุด',
        'ผู้ส่งคืน',
        'เจ้าหน้าที่สโตร์ผู้รับคืน',
        'รายการอุปกรณ์ (สรุป)'
      ];

      const reqsRows = dataToExport.map((req, idx) => {
        const reqDate = req.date ? formatThaiDate(req.date) : (req.createdAt ? formatThaiDate(req.createdAt) : '-');
        const comp = normalizeCompany(req.company);
        const statusLabel = getStatusBadge(req.status).label;
        const itemCount = req.items?.length || 0;
        const totalUnits = req.items?.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) || 0;
        const returnedUnits = req.items?.reduce((sum, it) => {
          const q = Number(it.quantity) || 1;
          const rq = it.returnedQuantity !== undefined ? Number(it.returnedQuantity) : (req.status === 'RETURNED' ? q : 0);
          return sum + rq;
        }, 0) || 0;
        const pendingUnits = Math.max(0, totalUnits - returnedUnits);

        let overallReturnStatus = '-';
        if (req.status === 'RETURNED') overallReturnStatus = 'คืนของครบแล้ว';
        else if (req.status === 'PARTIALLY_RETURNED') overallReturnStatus = 'คืนบางส่วน';
        else if (req.status === 'COMPLETED') overallReturnStatus = 'ส่งมอบแล้ว / รอคืน';
        else if (req.status === 'APPROVED') overallReturnStatus = 'รอจัดของส่งมอบ';
        else if (req.status === 'PENDING_APPROVAL') overallReturnStatus = 'รออนุมัติ';

        const latestRetDateItem = req.items?.find(it => it.returnDate);
        const latestRetDate = latestRetDateItem?.returnDate 
          ? formatThaiDate(latestRetDateItem.returnDate) 
          : (req.status === 'RETURNED' && req.updatedAt ? formatThaiDate(req.updatedAt) : '-');

        const returner = latestRetDateItem?.returnerName || (req.status === 'RETURNED' ? (req.requesterName || '-') : '-');
        const receiver = latestRetDateItem?.returnReceiver || (req.status === 'RETURNED' ? 'เจ้าหน้าที่สโตร์' : '-');

        const itemsSummary = req.items?.map(it => {
          const q = it.quantity;
          const rq = it.returnedQuantity !== undefined ? ` (คืนแล้ว ${it.returnedQuantity})` : '';
          return `${it.detail} [${q} ${it.unit}]${rq}`;
        }).slice(0, 5).join('; ') || '-';

        return [
          idx + 1,
          req.requisitionNumber,
          reqDate,
          comp,
          req.requesterName || '-',
          req.approverName || '-',
          statusLabel,
          itemCount,
          totalUnits,
          returnedUnits,
          pendingUnits,
          overallReturnStatus,
          latestRetDate,
          returner,
          receiver,
          itemsSummary
        ];
      });

      const wsReqs = XLSX.utils.aoa_to_sheet([reqsHeader, ...reqsRows]);
      wsReqs['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 18 }, // เลขที่ใบเบิก
        { wch: 16 }, // วันที่
        { wch: 10 }, // บริษัท
        { wch: 22 }, // ผู้ขอเบิก
        { wch: 22 }, // ผู้อนุมัติ
        { wch: 22 }, // สถานะ
        { wch: 24 }, // จำนวนชนิด
        { wch: 18 }, // เบิกรวม
        { wch: 18 }, // คืนแล้ว
        { wch: 18 }, // คงค้างคืน
        { wch: 20 }, // สถานะการคืนภาพรวม
        { wch: 18 }, // วันที่คืนล่าสุด
        { wch: 20 }, // ผู้ส่งคืน
        { wch: 22 }, // เจ้าหน้าที่รับคืน
        { wch: 60 }  // สรุปอุปกรณ์
      ];

      // --- Sheet 4: สรุปยอดรวมตามวัสดุ (Material Aggregates) ---
      const aggHeader = [
        'ลำดับ',
        'ชื่อรายการวัสดุ/อุปกรณ์',
        'ยอดรวมจำนวนที่เบิก',
        'ยอดรวมจำนวนที่คืนแล้ว',
        'ยอดรวมคงค้างคืน',
        'หน่วยนับ',
        'อัตราการคืน (%)',
        'จำนวนใบเบิกที่ขอ',
        'งาน/โครงการที่นำไปใช้'
      ];

      const allAggregated = Object.values(itemAggMap).sort((a, b) => b.qty - a.qty);
      const aggRows = allAggregated.map((it, idx) => {
        const retRate = it.qty > 0 ? `${((it.returnedQty / it.qty) * 100).toFixed(1)}%` : '0%';
        const pending = Math.max(0, it.qty - it.returnedQty);
        return [
          idx + 1,
          it.detail,
          it.qty,
          it.returnedQty,
          pending,
          it.unit,
          retRate,
          it.count,
          Array.from(it.jobs).join(', ') || '-'
        ];
      });

      const wsAgg = XLSX.utils.aoa_to_sheet([aggHeader, ...aggRows]);
      wsAgg['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 40 }, // ชื่อรายการ
        { wch: 18 }, // ยอดเบิก
        { wch: 18 }, // ยอดคืนแล้ว
        { wch: 18 }, // คงค้างคืน
        { wch: 10 }, // หน่วยนับ
        { wch: 16 }, // อัตราการคืน
        { wch: 16 }, // จำนวนใบเบิก
        { wch: 45 }  // งานที่ใช้
      ];

      // --- Sheet 5: ประวัติการรับคืนอุปกรณ์ (Return Records) ---
      const returnHeader = [
        'ลำดับ',
        'เลขที่ใบเบิก',
        'วันที่รับคืน',
        'บริษัท',
        'ผู้ขอเบิก/ผู้ยืม',
        'ผู้ส่งคืนอุปกรณ์',
        'เจ้าหน้าที่สโตร์ผู้รับคืน',
        'ชื่อรายการวัสดุ/อุปกรณ์',
        'จำนวนที่เบิกไป',
        'จำนวนที่รับคืน',
        'จำนวนคงค้าง',
        'หน่วยนับ',
        'สภาพอุปกรณ์',
        'หมายเหตุการคืน',
        'งาน/โครงการที่นำไปใช้'
      ];

      const returnRows: any[][] = [];
      let globalReturnIndex = 1;

      dataToExport.forEach(req => {
        const comp = normalizeCompany(req.company);
        if (Array.isArray(req.items)) {
          req.items.forEach(item => {
            const origQty = Number(item.quantity) || 1;
            const retQty = item.returnedQuantity !== undefined 
              ? Number(item.returnedQuantity) 
              : (req.status === 'RETURNED' ? origQty : 0);

            if (retQty > 0 || req.status === 'RETURNED' || req.status === 'PARTIALLY_RETURNED') {
              const pendingQty = Math.max(0, origQty - retQty);
              let conditionText = 'สภาพปกติ (พร้อมใช้)';
              if (item.returnCondition) {
                const c = item.returnCondition.toUpperCase();
                if (c === 'NORMAL') conditionText = 'สภาพปกติ (พร้อมใช้)';
                else if (c === 'DAMAGED') conditionText = 'ชำรุด (ส่งซ่อม)';
                else if (c === 'LOST') conditionText = 'สูญหาย';
                else conditionText = item.returnCondition;
              }

              const retDate = item.returnDate 
                ? formatThaiDate(item.returnDate) 
                : (req.updatedAt ? formatThaiDate(req.updatedAt) : '-');

              returnRows.push([
                globalReturnIndex++,
                req.requisitionNumber,
                retDate,
                comp,
                req.requesterName || '-',
                item.returnerName || req.requesterName || '-',
                item.returnReceiver || 'เจ้าหน้าที่สโตร์',
                item.detail || '-',
                origQty,
                retQty,
                pendingQty,
                item.unit || '-',
                conditionText,
                item.returnRemark || '-',
                item.job || '-'
              ]);
            }
          });
        }
      });

      if (returnRows.length === 0) {
        returnRows.push(['-', '-', '-', '-', '-', '-', '-', 'ยังไม่มีประวัติการรับคืนอุปกรณ์ในชุดข้อมูลนี้', 0, 0, 0, '-', '-', '-', '-']);
      }

      const wsReturn = XLSX.utils.aoa_to_sheet([returnHeader, ...returnRows]);
      wsReturn['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 18 }, // เลขที่ใบเบิก
        { wch: 16 }, // วันที่รับคืน
        { wch: 10 }, // บริษัท
        { wch: 22 }, // ผู้ขอเบิก
        { wch: 22 }, // ผู้ส่งคืน
        { wch: 24 }, // เจ้าหน้าที่รับคืน
        { wch: 35 }, // รายการอุปกรณ์
        { wch: 14 }, // เบิกไป
        { wch: 14 }, // รับคืน
        { wch: 14 }, // คงค้าง
        { wch: 10 }, // หน่วยนับ
        { wch: 22 }, // สภาพอุปกรณ์
        { wch: 25 }, // หมายเหตุการคืน
        { wch: 25 }  // งานที่ใช้
      ];

      // Assemble Workbook
      const wb = XLSX.utils.book_new();
      // Primary Sheet 1: สรุปใบยืม XS ประจำเดือน พร้อมช่องลงนาม
      XLSX.utils.book_append_sheet(wb, wsBorrow, 'สรุปใบยืม XS ประจำเดือน');
      // Secondary Detailed & Analytical Sheets
      XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวม');
      XLSX.utils.book_append_sheet(wb, wsItems, 'รายการวัสดุรายชิ้น');
      XLSX.utils.book_append_sheet(wb, wsReqs, 'สรุปตามใบเบิก');
      XLSX.utils.book_append_sheet(wb, wsAgg, 'สรุปยอดรวมตามวัสดุ');
      XLSX.utils.book_append_sheet(wb, wsReturn, 'ประวัติการรับคืนอุปกรณ์');

      const filename = `รายงานการเบิกและคืนวัสดุอุปกรณ์_คลังสินค้า_${isoDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'ส่งออกไฟล์ Excel สำเร็จแล้ว',
        text: `ไฟล์: ${filename}`,
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err: any) {
      console.error('Export Excel Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการส่งออกไฟล์',
        text: err?.message || 'ไม่สามารถสร้างไฟล์ Excel ได้',
        confirmButtonText: 'ตกลง'
      });
    }
  };

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

  // Action: Open Return Modal
  const openReturnModal = (req: Requisition) => {
    setReturnModalReq(req);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setReturnerName(req.requesterName || '');
    setReceiverName(userName || 'เจ้าหน้าที่สโตร์');
    setReturnNote('');

    const items = Array.isArray(req.items) ? req.items : [];
    const initialItemsState = items.map((it, idx) => {
      const origQty = Number(it.quantity) || 1;
      const prevReturnedQty = it.returnedQuantity !== undefined ? Number(it.returnedQuantity) : origQty;
      return {
        index: idx,
        isSelected: true,
        detail: it.detail || `รายการที่ ${idx + 1}`,
        quantity: origQty,
        returnedQuantity: prevReturnedQty,
        unit: it.unit || 'ชิ้น',
        condition: it.returnCondition || 'NORMAL',
        remark: it.returnRemark || '',
      };
    });
    setReturnItemsState(initialItemsState);
  };

  // Action: Submit Return
  const handleSubmitReturn = async () => {
    if (!returnModalReq) return;

    const selectedItems = returnItemsState.filter(it => it.isSelected);
    if (selectedItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกรายการที่คืน',
        text: 'ต้องมีรายการอุปกรณ์ที่เลือกรับคืนอย่างน้อย 1 รายการ',
      });
      return;
    }

    const allItemsSelected = returnItemsState.every(it => it.isSelected && it.returnedQuantity >= it.quantity);
    const targetStatus = allItemsSelected ? 'RETURNED' : 'PARTIALLY_RETURNED';

    setIsSubmittingReturn(true);
    try {
      const res = await returnMaterialRequisition(returnModalReq.id, {
        status: targetStatus,
        returnedItems: returnItemsState.filter(it => it.isSelected).map(it => ({
          index: it.index,
          returnedQuantity: it.returnedQuantity,
          returnDate: returnDate,
          returnCondition: it.condition,
          returnRemark: it.remark,
        })),
        returnNote,
        returnerName,
        receiverName,
      });

      if (res.success) {
        setRequisitions(prev =>
          prev.map(r => {
            if (r.id === returnModalReq.id) {
              const updatedItems = (Array.isArray(r.items) ? r.items : []).map((it, idx) => {
                const retInfo = returnItemsState.find(ri => ri.index === idx && ri.isSelected);
                if (retInfo) {
                  return {
                    ...it,
                    returnedQuantity: retInfo.returnedQuantity,
                    returnDate,
                    returnCondition: retInfo.condition,
                    returnRemark: retInfo.remark,
                    returnReceiver: receiverName,
                    returnerName,
                  };
                }
                return it;
              });
              return {
                ...r,
                status: targetStatus,
                items: updatedItems,
              };
            }
            return r;
          })
        );

        if (detailReq?.id === returnModalReq.id) {
          setDetailReq(prev => prev ? { ...prev, status: targetStatus } : null);
        }

        setReturnModalReq(null);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: targetStatus === 'RETURNED'
            ? `บันทึกรับคืนครบถ้วน (ใบเบิก ${returnModalReq.requisitionNumber})`
            : `บันทึกรับคืนบางส่วน (ใบเบิก ${returnModalReq.requisitionNumber})`,
          showConfirmButton: false,
          timer: 2500,
        });

        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกรับคืนได้',
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Action: Cancel / Revert Return
  const handleCancelReturn = async (req: Requisition) => {
    const result = await Swal.fire({
      title: 'ยกเลิกสถานะการคืนของ?',
      text: `ต้องการเปลี่ยนสถานะใบเบิก ${req.requisitionNumber} กลับเป็น "ส่งมอบเรียบร้อย" (รอคืน) หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, เปลี่ยนกลับ',
      cancelButtonText: 'ยกเลิก',
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
          setDetailReq(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        }
        setReturnModalReq(null);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: `เปลี่ยนสถานะใบเบิก ${req.requisitionNumber} กลับเป็นส่งมอบแล้ว`,
          showConfirmButton: false,
          timer: 2000,
        });
        router.refresh();
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.error });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: e.message });
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
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition-all"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 shadow-sm transition-all hover:scale-[1.02]"
            title="ดูรายงานสรุปสถิติการเบิกและยืมวัสดุอุปกรณ์"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>รายงานสรุป</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
              title="ส่งออกรายงานเป็นไฟล์ Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ส่งออก Excel</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </button>

            {showExportDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowExportDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in-50 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    เลือกรูปแบบการส่งออก Excel
                  </div>
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      handleExportExcel('FILTERED', 'FULL_REPORT');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 rounded-xl flex items-center justify-between text-xs text-slate-700 hover:text-emerald-900 transition-colors"
                  >
                    <div>
                      <div className="font-semibold">รายงานรวมทุกชีต (ตามตัวกรอง)</div>
                      <div className="text-[10px] text-slate-400">รวมชีตสรุปใบยืม XS + ช่องลงนาม ({filteredRequisitions.length} ใบเบิก)</div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      handleExportExcel('ALL', 'FULL_REPORT');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 rounded-xl flex items-center justify-between text-xs text-slate-700 hover:text-emerald-900 transition-colors mt-0.5"
                  >
                    <div>
                      <div className="font-semibold">รายงานรวมทุกชีต (ทั้งหมดในระบบ)</div>
                      <div className="text-[10px] text-slate-400">รวมชีตสรุปใบยืม XS + ช่องลงนาม ({requisitions.length} ใบเบิก)</div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-600" />
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      handleExportExcel(reportScope, 'BORROW_SUMMARY_ONLY');
                    }}
                    className="w-full text-left px-3 py-2.5 bg-emerald-50/60 hover:bg-emerald-100/70 rounded-xl flex items-center justify-between text-xs text-emerald-950 transition-colors"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>สรุปใบยืม XS ประจำเดือน</span>
                      </div>
                      <div className="text-[10px] text-emerald-700/80">แบบฟอร์มสรุปการยืม-คืน พร้อมช่องลงนามผู้ยืมและผู้รับคืน</div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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

        {/* Card 2: Completed / Awaiting Return */}
        <div
          onClick={() => handleTabChange('COMPLETED')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'COMPLETED'
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">ส่งมอบแล้ว / รอคืน</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              {metrics.completedCount.toLocaleString()} <span className="text-sm font-normal text-emerald-400">รายการ</span>
            </div>
            <div className="text-xs text-emerald-700/80 mt-1 font-medium">
              ส่งมอบของแล้ว / อยู่ระหว่างใช้งาน
            </div>
          </div>
        </div>

        {/* Card 3: Returned */}
        <div
          onClick={() => handleTabChange('RETURNED')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'RETURNED'
              ? 'border-teal-400 ring-2 ring-teal-100'
              : 'border-slate-200/80 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">รับคืนของแล้ว</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-teal-600 tracking-tight">
              {metrics.returnedCount.toLocaleString()} <span className="text-sm font-normal text-teal-400">รายการ</span>
            </div>
            <div className="text-xs text-teal-700/80 mt-1 font-medium">
              รับอุปกรณ์คืนเข้าสโตร์เรียบร้อย
            </div>
          </div>
        </div>

        {/* Card 4: Pending Approval */}
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

        {/* Card 5: Total Items */}
        <div
          onClick={() => handleTabChange('ALL')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'ALL'
              ? 'border-blue-400 ring-2 ring-blue-100'
              : 'border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">รายการสิ่งของรวม</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-600 tracking-tight">
              {metrics.totalItemsCount.toLocaleString()} <span className="text-sm font-normal text-blue-400">ชิ้น</span>
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
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
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
              <span>ส่งมอบแล้ว / รอคืน ({tabCounts.COMPLETED})</span>
            </button>
            <button
              onClick={() => handleTabChange('RETURNED')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'RETURNED'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนของแล้ว ({tabCounts.RETURNED})</span>
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
                          ) : req.status === 'COMPLETED' || req.status === 'PARTIALLY_RETURNED' ? (
                            <>
                              <button
                                onClick={() => openReturnModal(req)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
                                title="บันทึกรับคืนวัสดุและอุปกรณ์เข้าสโตร์"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{req.status === 'PARTIALLY_RETURNED' ? 'คืนเพิ่ม' : 'รับคืนของ'}</span>
                              </button>

                              <button
                                onClick={() => setDetailReq(req)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                                title="ดูรายละเอียด"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : req.status === 'RETURNED' ? (
                            <>
                              <button
                                onClick={() => openReturnModal(req)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-all"
                                title="ดูหรือแก้ไขบันทึกการรับคืนของ"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                                <span>ดูการคืนของ</span>
                              </button>

                              <button
                                onClick={() => setDetailReq(req)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                                title="ดูรายละเอียด"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
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
                    ) : req.status === 'COMPLETED' || req.status === 'PARTIALLY_RETURNED' ? (
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          onClick={() => openReturnModal(req)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{req.status === 'PARTIALLY_RETURNED' ? 'คืนเพิ่ม' : 'รับคืนของ'}</span>
                        </button>
                        <button
                          onClick={() => setDetailReq(req)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : req.status === 'RETURNED' ? (
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          onClick={() => openReturnModal(req)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                          <span>ดูการคืนของ</span>
                        </button>
                        <button
                          onClick={() => setDetailReq(req)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

              {/* Return Overview Card */}
              {(detailReq.status === 'RETURNED' || detailReq.status === 'PARTIALLY_RETURNED' || detailReq.items?.some(it => it.returnedQuantity !== undefined)) && (
                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-teal-600" />
                      <span>ข้อมูลการรับคืนอุปกรณ์เข้าสโตร์</span>
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      detailReq.status === 'RETURNED'
                        ? 'bg-teal-100 text-teal-800 border-teal-300'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    }`}>
                      {detailReq.status === 'RETURNED' ? 'คืนของครบถ้วนแล้ว' : 'คืนของบางส่วน'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-500">วันที่รับคืน:</span>{' '}
                      <span className="font-semibold text-slate-900">
                        {formatThaiDate(detailReq.items?.find(it => it.returnDate)?.returnDate || detailReq.updatedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">ผู้ส่งคืน:</span>{' '}
                      <span className="font-semibold text-slate-900">
                        {detailReq.items?.find(it => it.returnerName)?.returnerName || detailReq.requesterName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">ผู้รับคืน (สโตร์):</span>{' '}
                      <span className="font-semibold text-slate-900">
                        {detailReq.items?.find(it => it.returnReceiver)?.returnReceiver || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                        <th className="py-2.5 px-3 text-right">จำนวนเบิก</th>
                        <th className="py-2.5 px-3">หน่วย</th>
                        <th className="py-2.5 px-3">งานที่ใช้ / โครงการ</th>
                        <th className="py-2.5 px-3">สถานะการคืน</th>
                        <th className="py-2.5 px-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {detailReq.items && detailReq.items.length > 0 ? (
                        detailReq.items.map((item, idx) => {
                          const origQty = Number(item.quantity) || 1;
                          const hasReturnInfo = item.returnedQuantity !== undefined;
                          const retQty = Number(item.returnedQuantity) || 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{item.detail}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.quantity}</td>
                              <td className="py-2.5 px-3 text-slate-600">{item.unit}</td>
                              <td className="py-2.5 px-3 text-slate-700">{item.job || '-'}</td>
                              <td className="py-2.5 px-3">
                                {hasReturnInfo ? (
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        retQty >= origQty
                                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                                          : retQty > 0
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      {retQty >= origQty
                                        ? `คืนครบ (${retQty}/${origQty})`
                                        : retQty > 0
                                        ? `คืนแล้ว ${retQty}/${origQty}`
                                        : 'ยังไม่คืน'}
                                    </span>
                                    {item.returnCondition && (
                                      <div className="text-[10px] text-slate-500">
                                        สภาพ:{' '}
                                        {item.returnCondition === 'NORMAL'
                                          ? 'ปกติ'
                                          : item.returnCondition === 'DAMAGED'
                                          ? 'ชำรุด'
                                          : item.returnCondition === 'LOST'
                                          ? 'สูญหาย'
                                          : item.returnCondition}
                                      </div>
                                    )}
                                  </div>
                                ) : detailReq.status === 'COMPLETED' ? (
                                  <span className="text-[11px] text-slate-400">ยังไม่บันทึกคืน</span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {item.returnRemark ? (
                                  <span className="text-teal-700 font-medium">คืน: {item.returnRemark}</span>
                                ) : (
                                  item.remark || '-'
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
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

                {(detailReq.status === 'COMPLETED' || detailReq.status === 'PARTIALLY_RETURNED') && (
                  <button
                    onClick={() => {
                      const r = detailReq;
                      setDetailReq(null);
                      openReturnModal(r);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all hover:scale-[1.02]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{detailReq.status === 'PARTIALLY_RETURNED' ? 'บันทึกคืนของเพิ่มเติม' : 'บันทึกรับคืนของ'}</span>
                  </button>
                )}

                {detailReq.status === 'RETURNED' && (
                  <button
                    onClick={() => {
                      const r = detailReq;
                      setDetailReq(null);
                      openReturnModal(r);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                  >
                    <RotateCcw className="w-4 h-4 text-teal-600" />
                    <span>ดู / แก้ไขบันทึกการคืนของ</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !isSubmittingReturn && setReturnModalReq(null)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-teal-50/60 via-slate-50 to-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-200">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      บันทึกรับคืนวัสดุและอุปกรณ์เข้าคลัง
                    </h2>
                    {(() => {
                      const s = getStatusBadge(returnModalReq.status);
                      const Icon = s.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${s.badge}`}>
                          <Icon className={`w-3 h-3 ${s.iconColor}`} />
                          <span>{s.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>เลขที่ใบเบิก: <strong className="text-slate-700">{returnModalReq.requisitionNumber}</strong></span>
                    <span>•</span>
                    <span>บริษัท: <strong className="text-slate-700">{returnModalReq.company || '-'}</strong></span>
                    <span>•</span>
                    <span>ผู้ขอเบิกเดิม: <strong className="text-slate-700">{returnModalReq.requesterName || '-'}</strong></span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => !isSubmittingReturn && setReturnModalReq(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Return Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>วันที่รับคืน *</span>
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>ผู้ส่งคืนอุปกรณ์ *</span>
                  </label>
                  <input
                    type="text"
                    value={returnerName}
                    onChange={e => setReturnerName(e.target.value)}
                    placeholder="ระบุชื่อผู้ส่งคืน"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>เจ้าหน้าที่สโตร์ผู้รับคืน *</span>
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={e => setReceiverName(e.target.value)}
                    placeholder="ระบุชื่อเจ้าหน้าที่รับคืน"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    หมายเหตุภาพรวมการรับคืน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={returnNote}
                    onChange={e => setReturnNote(e.target.value)}
                    placeholder="เช่น ส่งคืนหลังเสร็จงานติดตั้งไซต์งาน, ตรวจสอบสภาพแล้วใช้งานได้ปกติ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>รายการอุปกรณ์ที่รับคืน ({returnItemsState.length} รายการ)</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (เลือกแล้ว {returnItemsState.filter(it => it.isSelected).length} รายการ)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnItemsState(prev => prev.map(it => ({ ...it, isSelected: true })))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all"
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnItemsState(prev => prev.map(it => ({ ...it, isSelected: true, returnedQuantity: it.quantity })))}
                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-[11px] font-semibold transition-all"
                    >
                      คืนเต็มจำนวนทุกชิ้น
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnItemsState(prev => prev.map(it => ({ ...it, isSelected: false })))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-all"
                    >
                      ล้างการเลือก
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                          <th className="py-2.5 px-3 w-12 text-center">รับคืน</th>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">รายละเอียดสิ่งของ</th>
                          <th className="py-2.5 px-3 text-center w-24">เบิกไป</th>
                          <th className="py-2.5 px-3 text-center w-36">จำนวนรับคืน</th>
                          <th className="py-2.5 px-3 w-40">สภาพอุปกรณ์</th>
                          <th className="py-2.5 px-3">หมายเหตุเฉพาะรายการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {returnItemsState.map(item => {
                          return (
                            <tr
                              key={item.index}
                              className={`transition-colors ${
                                item.isSelected ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'bg-slate-50/40 opacity-60'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.isSelected}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setReturnItemsState(prev =>
                                      prev.map(it => it.index === item.index ? { ...it, isSelected: checked } : it)
                                    );
                                  }}
                                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3 text-center text-slate-400 font-mono">
                                {item.index + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{item.detail}</div>
                                <div className="text-[11px] text-slate-400">หน่วยนับ: {item.unit}</div>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.quantity}
                                    disabled={!item.isSelected}
                                    value={item.returnedQuantity}
                                    onChange={e => {
                                      const val = Math.max(0, Math.min(item.quantity, Number(e.target.value) || 0));
                                      setReturnItemsState(prev =>
                                        prev.map(it => it.index === item.index ? { ...it, returnedQuantity: val } : it)
                                      );
                                    }}
                                    className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                                  />
                                  <span className="text-[11px] text-slate-500">{item.unit}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  disabled={!item.isSelected}
                                  value={item.condition}
                                  onChange={e => {
                                    const c = e.target.value;
                                    setReturnItemsState(prev =>
                                      prev.map(it => it.index === item.index ? { ...it, condition: c } : it)
                                    );
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                >
                                  <option value="NORMAL">สภาพปกติ (พร้อมใช้)</option>
                                  <option value="DAMAGED">ชำรุด (ส่งซ่อม)</option>
                                  <option value="LOST">สูญหาย</option>
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="text"
                                  disabled={!item.isSelected}
                                  value={item.remark}
                                  onChange={e => {
                                    const r = e.target.value;
                                    setReturnItemsState(prev =>
                                      prev.map(it => it.index === item.index ? { ...it, remark: r } : it)
                                    );
                                  }}
                                  placeholder="หมายเหตุ..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Status Preview Banner */}
              {(() => {
                const selectedItems = returnItemsState.filter(it => it.isSelected);
                const allSelected = returnItemsState.length > 0 && returnItemsState.every(it => it.isSelected && it.returnedQuantity >= it.quantity);
                if (selectedItems.length === 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>กรุณาติ๊กเลือกรายการที่ต้องการรับคืนอย่างน้อย 1 รายการ</span>
                    </div>
                  );
                }
                if (allSelected) {
                  return (
                    <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>
                          <strong>คืนอุปกรณ์ครบถ้วนทุกรายการ:</strong> สถานะใบเบิกจะถูกบันทึกเป็น{' '}
                          <span className="font-bold text-teal-700 underline">"คืนของเรียบร้อย" (RETURNED)</span>
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span>
                        <strong>คืนอุปกรณ์บางรายการ / บางจำนวน:</strong> สถานะใบเบิกจะถูกบันทึกเป็น{' '}
                        <span className="font-bold text-indigo-700 underline">"คืนบางส่วน" (PARTIALLY_RETURNED)</span>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                {(returnModalReq.status === 'RETURNED' || returnModalReq.status === 'PARTIALLY_RETURNED') && (
                  <button
                    type="button"
                    disabled={isSubmittingReturn}
                    onClick={() => handleCancelReturn(returnModalReq)}
                    className="px-3.5 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    ยกเลิกสถานะการคืน (เปลี่ยนกลับเป็นส่งมอบแล้ว)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmittingReturn}
                  onClick={() => setReturnModalReq(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  disabled={isSubmittingReturn}
                  onClick={handleSubmitReturn}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {isSubmittingReturn ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>บันทึกการรับคืนของเข้าสโตร์</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Summary Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div
            className="fixed inset-0"
            onClick={() => setShowReportModal(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-6xl xl:max-w-7xl h-[90vh] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                      รายงานสรุปการเบิกและยืมวัสดุอุปกรณ์
                    </h2>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                      Summary Report
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    สถิติการขอเบิก การส่งมอบ การรับคืนของเข้าคลัง สภาพอุปกรณ์ และสรุปยอดรวมวัสดุ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                {/* Data Scope Switcher */}
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold h-9">
                  <button
                    onClick={() => setReportScope('FILTERED')}
                    className={`h-7 px-3 rounded-lg transition-all whitespace-nowrap flex items-center ${
                      reportScope === 'FILTERED'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ตามตัวกรอง ({filteredRequisitions.length})
                  </button>
                  <button
                    onClick={() => setReportScope('ALL')}
                    className={`h-7 px-3 rounded-lg transition-all whitespace-nowrap flex items-center ${
                      reportScope === 'ALL'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({requisitions.length})
                  </button>
                </div>

                {/* Export Buttons */}
                <button
                  onClick={() => handleExportExcel(reportScope, 'BORROW_SUMMARY_ONLY')}
                  className="h-9 inline-flex items-center gap-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition-all hover:scale-[1.01]"
                  title="ดาวน์โหลดเฉพาะแผ่นสรุปใบยืม XS พร้อมช่องลงนาม"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">สรุปใบยืม XS (ลงนาม)</span>
                  <span className="sm:hidden">ใบยืม XS</span>
                </button>

                <button
                  onClick={() => handleExportExcel(reportScope, 'FULL_REPORT')}
                  className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm transition-all hover:scale-[1.01]"
                  title="ดาวน์โหลดไฟล์ Excel รายงานฉบับเต็มทุกชีต"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">ส่งออกทุกชีต (.xlsx)</span>
                  <span className="sm:hidden">Excel</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors shrink-0 border border-slate-200/60"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: flex-1 min-h-0 overflow-y-auto ensures it strictly scrolls within the modal */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
              {/* Scope Notice */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-600">
                <div className="flex items-center gap-2 min-w-0">
                  <Filter className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="truncate">
                    กำลังสรุปข้อมูล:{' '}
                    <strong className="text-slate-900 font-bold">
                      {reportScope === 'FILTERED'
                        ? `รายการที่ตรงตามตัวกรองปัจจุบัน (${reportSourceData.length} ฉบับ)`
                        : `ข้อมูลทั้งหมดในระบบ (${reportSourceData.length} ฉบับ)`}
                    </strong>
                  </span>
                </div>
                {reportScope === 'FILTERED' && hasActiveFilters && (
                  <button
                    onClick={() => setReportScope('ALL')}
                    className="text-slate-800 hover:text-slate-950 font-bold underline whitespace-nowrap shrink-0"
                  >
                    สลับไปดูข้อมูลทั้งหมด
                  </button>
                )}
              </div>

              {/* 1. Metric Cards (6 cards with perfectly symmetrical heights and alignments) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
                {/* 1. All Requisitions */}
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[110px] transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
                    <span className="font-semibold text-slate-700 truncate">ใบเบิกทั้งหมด</span>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {reportStats.totalReqs.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">ใบ</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate h-4 flex items-center">
                    จาก {reportStats.totalItems.toLocaleString()} รายการวัสดุ
                  </div>
                </div>

                {/* 2. Total Quantity */}
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[110px] transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
                    <span className="font-semibold text-slate-700 truncate">ยอดเบิกรวม</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight">
                      {reportStats.totalQuantity.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">หน่วย</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate h-4 flex items-center">
                    รวมชิ้นวัสดุที่ขอเบิก
                  </div>
                </div>

                {/* 3. Completed Requisitions */}
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[110px] transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
                    <span className="font-semibold text-slate-700 truncate">ส่งมอบสำเร็จ</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                      {reportStats.completed.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">ใบ</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold truncate h-4 flex items-center">
                    อัตราส่งมอบ {reportStats.fulfillRate}%
                  </div>
                </div>

                {/* 4. Returned Items */}
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[110px] transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
                    <span className="font-semibold text-slate-700 truncate">รับคืนของแล้ว</span>
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-xl sm:text-2xl font-black text-teal-700 tracking-tight">
                      {reportStats.totalReturnedQuantity.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">หน่วย</span>
                  </div>
                  <div className="text-[11px] text-teal-700 font-semibold truncate h-4 flex items-center">
                    อัตราคืน {reportStats.returnRate}% ({reportStats.returned} คืนครบ)
                  </div>
                </div>

                {/* 5. Pending Return Items */}
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[110px] transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
                    <span className="font-semibold text-slate-700 truncate">คงค้างยังไม่คืน</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
                      {reportStats.totalPendingReturnQuantity.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">หน่วย</span>
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold truncate h-4 flex items-center">
                    {reportStats.totalPendingReturnQuantity > 0 ? 'รอส่งคืนเข้าคลัง' : 'คืนครบถ้วนสมบูรณ์'}
                  </div>
                </div>

                {/* 6. Awaiting Delivery */}
                <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[110px] transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
                    <span className="font-semibold text-slate-700 truncate">รอจัดส่งมอบ</span>
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <PackageCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
                      {reportStats.approved.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">ใบ</span>
                  </div>
                  <div className="text-[11px] text-purple-700 font-semibold truncate h-4 flex items-center">
                    อนุมัติแล้ว พร้อมจัดเตรียม
                  </div>
                </div>
              </div>

              {/* 2. Return Analytics, Company & Requester Distribution (3 columns with uniform card containers) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                {/* 2A. Return & Equipment Condition Analytics */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[320px]">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          ภาพรวมการคืนและสภาพอุปกรณ์
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 whitespace-nowrap">
                        {reportStats.returnRate}% คืนแล้ว
                      </span>
                    </div>

                    {/* Return Progress Bar */}
                    <div className="space-y-1.5 mb-3.5">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>ความคืบหน้าการส่งคืน</span>
                        <span className="font-semibold text-teal-800">
                          {reportStats.totalReturnedQuantity.toLocaleString()} / {reportStats.totalQuantity.toLocaleString()} หน่วย
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-teal-500 transition-all duration-500 rounded-l-full"
                          style={{ width: `${Math.min(100, reportStats.returnRate)}%` }}
                          title={`คืนแล้ว ${reportStats.totalReturnedQuantity} หน่วย`}
                        />
                        <div
                          className="h-full bg-amber-200 transition-all duration-500 rounded-r-full"
                          style={{ width: `${Math.max(0, 100 - reportStats.returnRate)}%` }}
                          title={`คงค้าง ${reportStats.totalPendingReturnQuantity} หน่วย`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1.5 text-teal-700">
                          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                          คืนแล้ว {reportStats.totalReturnedQuantity.toLocaleString()} หน่วย
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          คงค้าง {reportStats.totalPendingReturnQuantity.toLocaleString()} หน่วย
                        </span>
                      </div>
                    </div>

                    {/* Status Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5 text-xs">
                      <div className="p-2 rounded-xl bg-teal-50/80 border border-teal-200/80">
                        <div className="text-[11px] text-teal-700 font-medium">คืนของครบถ้วน</div>
                        <div className="text-base font-bold text-teal-900 mt-0.5">
                          {reportStats.returned} <span className="text-[10px] font-normal">ใบ</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-50/80 border border-indigo-200/80">
                        <div className="text-[11px] text-indigo-700 font-medium">คืนบางส่วน</div>
                        <div className="text-base font-bold text-indigo-900 mt-0.5">
                          {reportStats.partiallyReturned} <span className="text-[10px] font-normal">ใบ</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                        <div className="text-[11px] text-emerald-700 font-medium">ส่งมอบแล้ว/รอคืน</div>
                        <div className="text-base font-bold text-emerald-900 mt-0.5">
                          {reportStats.completed} <span className="text-[10px] font-normal">ใบ</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80">
                        <div className="text-[11px] text-amber-700 font-medium">รอจัดของส่งมอบ</div>
                        <div className="text-base font-bold text-amber-900 mt-0.5">
                          {reportStats.approved} <span className="text-[10px] font-normal">ใบ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Condition Summary */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>สภาพอุปกรณ์ที่รับคืนเข้าคลัง:</span>
                      <span className="text-slate-400 font-normal">รวม {reportStats.totalReturnedQuantity} หน่วย</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-1.5 bg-emerald-50/80 rounded-xl border border-emerald-200">
                        <div className="text-[10px] text-emerald-700 font-medium">ปกติ</div>
                        <div className="text-sm font-bold text-emerald-800">
                          {reportStats.conditionCounts.NORMAL || 0}
                        </div>
                      </div>
                      <div className="p-1.5 bg-amber-50/80 rounded-xl border border-amber-200">
                        <div className="text-[10px] text-amber-700 font-medium">ชำรุด/ซ่อม</div>
                        <div className="text-sm font-bold text-amber-800">
                          {reportStats.conditionCounts.DAMAGED || 0}
                        </div>
                      </div>
                      <div className="p-1.5 bg-rose-50/80 rounded-xl border border-rose-200">
                        <div className="text-[10px] text-rose-700 font-medium">สูญหาย</div>
                        <div className="text-sm font-bold text-rose-800">
                          {reportStats.conditionCounts.LOST || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2B. Company Breakdown */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[320px]">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/60">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          สัดส่วนการเบิก-คืนแยกตามบริษัท
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        รวม {reportStats.totalReqs} ใบ
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'TE', label: 'TE (Tera Electric)', color: 'bg-blue-600' },
                        { key: 'TP', label: 'TP (Tera Power)', color: 'bg-emerald-600' },
                        { key: 'TG', label: 'TG (Tera Group)', color: 'bg-purple-600' },
                        { key: 'OTHER', label: 'อื่นๆ / ไม่ระบุ', color: 'bg-slate-400' },
                      ].map(comp => {
                        const data = reportStats.companyBreakdown[comp.key] || { count: 0, itemsCount: 0, quantity: 0, returnedQuantity: 0 };
                        const pct = reportStats.totalReqs > 0 ? Math.round((data.count / reportStats.totalReqs) * 100) : 0;
                        const retPct = data.quantity > 0 ? Math.round((data.returnedQuantity / data.quantity) * 100) : 0;
                        return (
                          <div key={comp.key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">{comp.label}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-600 font-medium">
                                  {data.count} ใบ ({pct}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${comp.color} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>เบิก: <strong className="text-slate-700">{data.quantity.toLocaleString()}</strong> ชิ้น</span>
                              <span className="text-teal-700 font-medium">
                                คืนแล้ว: <strong>{data.returnedQuantity.toLocaleString()}</strong> ({retPct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>ยอดคืนรวมทุกบริษัท:</span>
                    <span className="font-bold text-teal-700">
                      {reportStats.totalReturnedQuantity.toLocaleString()} ชิ้น ({reportStats.returnRate}%)
                    </span>
                  </div>
                </div>

                {/* 2C. Top Requesters */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[320px]">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/60">
                          <User className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          ผู้ขอเบิกสูงสุดและสถานะคืน
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
                        {reportStats.sortedRequesters.length} ท่าน
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {reportStats.sortedRequesters.slice(0, 5).map((req, idx) => {
                        const isFullyReturned = req.quantity > 0 && req.returnedQuantity >= req.quantity;
                        const hasPartialReturn = req.returnedQuantity > 0 && req.returnedQuantity < req.quantity;
                        return (
                          <div
                            key={req.name + idx}
                            className="p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-xs transition-colors border border-slate-100"
                          >
                            <div className="flex items-center justify-between min-w-0 mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                    idx === 0
                                      ? 'bg-amber-100 text-amber-800'
                                      : idx === 1
                                      ? 'bg-slate-200 text-slate-700'
                                      : idx === 2
                                      ? 'bg-amber-700/20 text-amber-900'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-slate-800 truncate">
                                  {req.name}
                                </span>
                              </div>
                              <span className="font-bold text-slate-900 flex-shrink-0">
                                {req.reqCount} <span className="font-normal text-slate-500">ใบ</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pl-7">
                              <span>
                                เบิก {req.quantity.toLocaleString()} หน่วย
                              </span>
                              {isFullyReturned ? (
                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-semibold">
                                  คืนครบแล้ว ({req.returnedQuantity})
                                </span>
                              ) : hasPartialReturn ? (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                  คืนแล้ว {req.returnedQuantity} / {req.quantity}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                                  คงค้าง {req.quantity} หน่วย
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {reportStats.sortedRequesters.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          ไม่มีข้อมูลผู้ขอเบิก
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-right">
                    แสดง 5 ลำดับแรกจากผู้ขอเบิกทั้งหมด
                  </div>
                </div>
              </div>

              {/* 3. Material Requisition & Return Analytics */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold h-10">
                    <button
                      onClick={() => setReportActiveTab('OVERVIEW')}
                      className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        reportActiveTab === 'OVERVIEW'
                          ? 'bg-white text-slate-900 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>วัสดุยอดนิยม (Top 10)</span>
                    </button>
                    <button
                      onClick={() => setReportActiveTab('ALL_ITEMS')}
                      className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        reportActiveTab === 'ALL_ITEMS'
                          ? 'bg-white text-slate-900 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>รายการวัสดุทั้งหมด ({reportStats.sortedMaterials.length})</span>
                    </button>
                    <button
                      onClick={() => setReportActiveTab('RETURN_TRACKING')}
                      className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        reportActiveTab === 'RETURN_TRACKING'
                          ? 'bg-white text-teal-800 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                      <span>ติดตามการคืนอุปกรณ์</span>
                    </button>
                  </div>

                  {(reportActiveTab === 'ALL_ITEMS' || reportActiveTab === 'RETURN_TRACKING') && (
                    <div className="relative min-w-[260px] h-10 flex items-center">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={reportSearchQuery}
                        onChange={(e) => setReportSearchQuery(e.target.value)}
                        placeholder="ค้นหาชื่อวัสดุ หรือ โครงการ..."
                        className="w-full h-10 pl-9 pr-8 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-400 focus:outline-none transition-all shadow-2xs"
                      />
                      {reportSearchQuery && (
                        <button
                          onClick={() => setReportSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {reportActiveTab === 'RETURN_TRACKING' && (
                  <div className="px-4 py-2.5 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between text-xs text-teal-900">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                      <span>แสดงยอดการรับคืนและคงค้างของแต่ละอุปกรณ์ เรียงตามจำนวนชิ้นที่มีการส่งคืนมากที่สุด</span>
                    </div>
                    <span className="font-semibold text-teal-800">
                      ยอดคืนรวม: {reportStats.totalReturnedQuantity.toLocaleString()} / {reportStats.totalQuantity.toLocaleString()} หน่วย ({reportStats.returnRate}%)
                    </span>
                  </div>
                )}

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3.5 w-12 text-center">อันดับ</th>
                        <th className="py-2.5 px-3.5">ชื่อรายการวัสดุ / อุปกรณ์</th>
                        <th className="py-2.5 px-3.5 text-right">ยอดเบิก</th>
                        <th className="py-2.5 px-3.5 text-right text-teal-700">คืนแล้ว</th>
                        <th className="py-2.5 px-3.5 text-right text-amber-700">คงค้างคืน</th>
                        <th className="py-2.5 px-3.5 text-center w-28">อัตราการคืน</th>
                        <th className="py-2.5 px-3.5 w-20 text-center">หน่วยนับ</th>
                        <th className="py-2.5 px-3.5 text-center">จำนวนใบเบิก</th>
                        <th className="py-2.5 px-3.5">งาน/โครงการที่นำไปใช้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(reportActiveTab === 'OVERVIEW'
                        ? reportStats.sortedMaterials.slice(0, 10)
                        : filteredReportMaterials
                      ).map((item, idx) => {
                        const rank = idx + 1;
                        const pendingQty = Math.max(0, item.totalQty - item.totalReturnedQty);
                        const itemReturnRate = item.totalQty > 0 ? Math.round((item.totalReturnedQty / item.totalQty) * 100) : 0;
                        const isFullyReturned = item.totalQty > 0 && item.totalReturnedQty >= item.totalQty;
                        return (
                          <tr key={item.detail + idx} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="py-2.5 px-3.5 text-center">
                              {reportActiveTab === 'OVERVIEW' ? (
                                <span
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                                    rank === 1
                                      ? 'bg-amber-100 text-amber-800'
                                      : rank === 2
                                      ? 'bg-slate-200 text-slate-700'
                                      : rank === 3
                                      ? 'bg-amber-700/20 text-amber-900'
                                      : 'text-slate-500 font-medium'
                                  }`}
                                >
                                  {rank}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">{rank}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                              <div>{item.detail}</div>
                              {reportActiveTab === 'RETURN_TRACKING' && item.totalReturnedQty > 0 && (
                                <div className="text-[10px] text-teal-700 font-normal">
                                  รับคืนแล้ว {item.returnCount} ครั้ง
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-indigo-700">
                              {item.totalQty.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-teal-700">
                              {item.totalReturnedQty > 0 ? (
                                item.totalReturnedQty.toLocaleString()
                              ) : (
                                <span className="text-slate-300 font-normal">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-medium">
                              {isFullyReturned ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                  คืนครบ
                                </span>
                              ) : pendingQty > 0 ? (
                                <span className="text-amber-700 font-semibold">
                                  {pendingQty.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      itemReturnRate >= 100
                                        ? 'bg-emerald-500'
                                        : itemReturnRate > 0
                                        ? 'bg-teal-500'
                                        : 'bg-slate-200'
                                    }`}
                                    style={{ width: `${Math.min(100, itemReturnRate)}%` }}
                                  />
                                </div>
                                <span className={`text-[11px] font-semibold w-8 text-right ${
                                  itemReturnRate >= 100 ? 'text-emerald-700' : itemReturnRate > 0 ? 'text-teal-700' : 'text-slate-400'
                                }`}>
                                  {itemReturnRate}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {item.unit || 'ชิ้น'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-medium text-slate-600">
                              {item.reqCount} ครั้ง
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500 truncate max-w-xs">
                              {Array.from(item.jobs).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(item.jobs).slice(0, 3).map((jb, jIdx) => (
                                    <span
                                      key={jIdx}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono"
                                    >
                                      {jb}
                                    </span>
                                  ))}
                                  {Array.from(item.jobs).length > 3 && (
                                    <span className="text-[10px] text-slate-400 self-center">
                                      +{Array.from(item.jobs).length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {reportStats.sortedMaterials.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            ไม่พบรายการวัสดุในชุดข้อมูลนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer: shrink-0 keeps it permanently pinned at the bottom */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
                <span>ข้อมูลสรุปจาก {reportSourceData.length} ใบเบิก • อัปเดตล่าสุด ณ ปัจจุบัน</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => handleExportExcel(reportScope, 'BORROW_SUMMARY_ONLY')}
                  className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition-all hover:scale-[1.01]"
                  title="ดาวน์โหลดเฉพาะแผ่นสรุปใบยืม XS พร้อมช่องลงนาม"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>สรุปใบยืม XS (ลงนาม)</span>
                </button>
                <button
                  onClick={() => handleExportExcel(reportScope, 'FULL_REPORT')}
                  className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm transition-all hover:scale-[1.01]"
                  title="ดาวน์โหลดไฟล์ Excel รายงานฉบับเต็มทุกชีต"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออกทุกชีต (.xlsx)</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="h-9 inline-flex items-center justify-center px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
