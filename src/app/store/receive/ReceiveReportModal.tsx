'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  Printer,
  Package,
  PackageCheck,
  AlertTriangle,
  Clock,
  Search,
  RotateCcw,
  Calendar,
  Building2,
  FileText,
  ChevronDown,
  CheckCircle2,
  Download,
  Filter,
  Layers,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { POItem, GoodsReceiptRecord } from './GoodsReceiveModal';

interface ReceiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPending: POItem[];
  initialReceived: POItem[];
  userName: string;
}

export default function ReceiveReportModal({
  isOpen,
  onClose,
  initialPending,
  initialReceived,
  userName
}: ReceiveReportModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tabs: 'received' (PO ที่รับสินค้า) | 'pending' (PO สินค้าที่ค้างรับ) | 'overview' (สรุปภาพรวม)
  const [activeTab, setActiveTab] = useState<'received' | 'pending' | 'overview'>('received');

  // Scope: 'screen' (ข้อมูลตามตัวกรองในหน้าจอ) | 'server' (ค้นหาทั้งหมดในระบบฐานข้อมูล)
  const [dataScope, setDataScope] = useState<'screen' | 'server'>('screen');
  const [isLoadingServer, setIsLoadingServer] = useState(false);

  // Server fetched data
  const [serverPending, setServerPending] = useState<POItem[]>([]);
  const [serverReceived, setServerReceived] = useState<POItem[]>([]);

  // Filter States inside Modal
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'TE' | 'TP' | 'TG'>('ALL');
  const [modalSearch, setModalSearch] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'LAST7' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [pendingUrgencyFilter, setPendingUrgencyFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
  const [receivedTypeFilter, setReceivedTypeFilter] = useState<'ALL' | 'STORE' | 'SITE'>('ALL');

  // Pagination inside modal
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Active data sources based on scope
  const activePendingSource = dataScope === 'server' ? serverPending : initialPending;
  const activeReceivedSource = dataScope === 'server' ? serverReceived : initialReceived;

  // Fetch full data from server when switching to 'server' scope or when filters change in server mode
  const fetchServerData = async () => {
    setIsLoadingServer(true);
    try {
      const params = new URLSearchParams();
      params.set('type', 'all');
      if (companyFilter !== 'ALL') params.set('company', companyFilter);
      if (modalSearch.trim()) params.set('search', modalSearch.trim());

      const today = new Date();
      if (datePreset === 'TODAY') {
        const iso = today.toISOString().split('T')[0];
        params.set('startDate', iso);
        params.set('endDate', iso);
      } else if (datePreset === 'LAST7') {
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        params.set('startDate', last7.toISOString().split('T')[0]);
        params.set('endDate', today.toISOString().split('T')[0]);
      } else if (datePreset === 'THIS_MONTH') {
        params.set('year', today.getFullYear().toString());
        params.set('month', (today.getMonth() + 1).toString());
      } else if (datePreset === 'LAST_MONTH') {
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        params.set('year', lastMonthDate.getFullYear().toString());
        params.set('month', (lastMonthDate.getMonth() + 1).toString());
      } else if (datePreset === 'THIS_YEAR') {
        params.set('year', today.getFullYear().toString());
      } else if (datePreset === 'CUSTOM') {
        if (customStartDate) params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }

      const res = await fetch(`/api/store/receive/report?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const json = await res.json();
      if (json.success && json.data) {
        setServerPending(json.data.pendingPOs || []);
        setServerReceived(json.data.receivedPOs || []);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลรายงานจากเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsLoadingServer(false);
    }
  };

  useEffect(() => {
    if (dataScope === 'server' && isOpen) {
      fetchServerData();
    }
  }, [dataScope, isOpen]);

  // Helpers
  const getCompanyFromPO = (poNumber: string = ''): 'TE' | 'TP' | 'TG' | 'OTHER' => {
    const upper = poNumber.toUpperCase();
    if (upper.includes('-E')) return 'TE';
    if (upper.includes('-P')) return 'TP';
    if (upper.includes('-G')) return 'TG';
    return 'OTHER';
  };

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

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDeliveryStatus = (deliveryDateStr: string | Date | null | undefined) => {
    if (!deliveryDateStr) {
      return {
        status: 'none',
        label: 'ไม่ระบุวันส่ง',
        days: 0,
        badge: 'text-slate-500 bg-slate-100 border-slate-200',
        urgency: 'NONE'
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deliveryDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        label: `เกินกำหนด ${Math.abs(diffDays)} วัน`,
        days: diffDays,
        badge: 'text-rose-700 bg-rose-50 border-rose-200 font-semibold',
        urgency: 'OVERDUE'
      };
    } else if (diffDays === 0) {
      return {
        status: 'today',
        label: 'กำหนดส่งวันนี้',
        days: 0,
        badge: 'text-amber-800 bg-amber-50 border-amber-300 font-semibold',
        urgency: 'TODAY'
      };
    } else if (diffDays <= 7) {
      return {
        status: 'upcoming',
        label: `อีก ${diffDays} วัน`,
        days: diffDays,
        badge: 'text-blue-700 bg-blue-50 border-blue-200',
        urgency: 'UPCOMING'
      };
    } else {
      return {
        status: 'future',
        label: `อีก ${diffDays} วัน`,
        days: diffDays,
        badge: 'text-slate-600 bg-slate-50 border-slate-200',
        urgency: 'FUTURE'
      };
    }
  };

  const isSiteOrRetro = (po: POItem) => {
    const r = (po.receivedBy || '').toLowerCase();
    const n = (po.note || '').toLowerCase();
    return (
      r.includes('หน้างาน') ||
      r.includes('ย้อนหลัง') ||
      n.includes('ย้อนหลัง') ||
      n.includes('ซื้อเองหน้างาน') ||
      n.includes('เอาของมาแล้ว')
    );
  };

  // Check date within preset
  const isDateInRange = (dateVal: string | Date | null | undefined) => {
    if (datePreset === 'ALL') return true;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (datePreset === 'TODAY') {
      const itemDate = new Date(d);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === today.getTime();
    }
    if (datePreset === 'LAST7') {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 7);
      return d >= past7 && d <= new Date();
    }
    if (datePreset === 'THIS_MONTH') {
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }
    if (datePreset === 'LAST_MONTH') {
      const lm = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const ly = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      return d.getMonth() === lm && d.getFullYear() === ly;
    }
    if (datePreset === 'THIS_YEAR') {
      return d.getFullYear() === today.getFullYear();
    }
    if (datePreset === 'CUSTOM') {
      if (customStartDate && customEndDate) {
        const s = new Date(customStartDate + 'T00:00:00');
        const e = new Date(customEndDate + 'T23:59:59');
        return d >= s && d <= e;
      }
      if (customStartDate) {
        const s = new Date(customStartDate + 'T00:00:00');
        return d >= s;
      }
      if (customEndDate) {
        const e = new Date(customEndDate + 'T23:59:59');
        return d <= e;
      }
      return true;
    }
    return true;
  };

  // Filtered Lists
  const filteredPending = useMemo(() => {
    return activePendingSource.filter(po => {
      // Company
      if (companyFilter !== 'ALL') {
        if (getCompanyFromPO(po.poNumber) !== companyFilter) return false;
      }
      // Date (deliveryDate or recordedAt)
      if (dataScope === 'screen') {
        if (!isDateInRange(po.deliveryDate || po.recordedAt)) return false;
      }
      // Urgency
      if (pendingUrgencyFilter !== 'ALL') {
        const st = getDeliveryStatus(po.deliveryDate);
        if (pendingUrgencyFilter === 'OVERDUE' && st.status !== 'overdue') return false;
        if (pendingUrgencyFilter === 'TODAY' && st.status !== 'today') return false;
        if (pendingUrgencyFilter === 'UPCOMING' && st.status !== 'upcoming') return false;
      }
      // Search
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase().trim();
        const poNum = (po.poNumber || '').toLowerCase();
        const prNum = (po.prNumber || '').toLowerCase();
        const vendor = (po.vendorName || '').toLowerCase();
        const proj = (po.projectName || po.jobName || '').toLowerCase();
        const items = (po.itemList || '').toLowerCase();
        const reqBy = (po.prRequestedBy || po.reportedBy || '').toLowerCase();
        if (
          !poNum.includes(q) &&
          !prNum.includes(q) &&
          !vendor.includes(q) &&
          !proj.includes(q) &&
          !items.includes(q) &&
          !reqBy.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activePendingSource, companyFilter, datePreset, customStartDate, customEndDate, pendingUrgencyFilter, modalSearch, dataScope]);

  const filteredReceived = useMemo(() => {
    return activeReceivedSource.filter(po => {
      // Company
      if (companyFilter !== 'ALL') {
        if (getCompanyFromPO(po.poNumber) !== companyFilter) return false;
      }
      // Date (receivedAt)
      if (dataScope === 'screen') {
        if (!isDateInRange(po.receivedAt)) return false;
      }
      // Received Type (Store vs Site)
      if (receivedTypeFilter !== 'ALL') {
        const isSite = isSiteOrRetro(po);
        if (receivedTypeFilter === 'SITE' && !isSite) return false;
        if (receivedTypeFilter === 'STORE' && isSite) return false;
      }
      // Search
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase().trim();
        const poNum = (po.poNumber || '').toLowerCase();
        const prNum = (po.prNumber || '').toLowerCase();
        const vendor = (po.vendorName || '').toLowerCase();
        const proj = (po.projectName || po.jobName || '').toLowerCase();
        const items = (po.itemList || '').toLowerCase();
        const recBy = (po.receivedBy || '').toLowerCase();
        if (
          !poNum.includes(q) &&
          !prNum.includes(q) &&
          !vendor.includes(q) &&
          !proj.includes(q) &&
          !items.includes(q) &&
          !recBy.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeReceivedSource, companyFilter, datePreset, customStartDate, customEndDate, receivedTypeFilter, modalSearch, dataScope]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let pendingAmount = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let partialCount = 0;

    filteredPending.forEach(p => {
      pendingAmount += p.totalAmount || 0;
      const st = getDeliveryStatus(p.deliveryDate);
      if (st.status === 'overdue') overdueCount++;
      if (st.status === 'today') dueTodayCount++;
      if (p.receiveStatus === 'Partial') partialCount++;
    });

    let receivedAmount = 0;
    let siteReceivedCount = 0;
    let storeReceivedCount = 0;

    filteredReceived.forEach(r => {
      receivedAmount += r.totalAmount || 0;
      if (isSiteOrRetro(r)) siteReceivedCount++;
      else storeReceivedCount++;
    });

    // Company breakdown for pending
    const compPending = { TE: 0, TP: 0, TG: 0, OTHER: 0 };
    filteredPending.forEach(p => {
      const c = getCompanyFromPO(p.poNumber);
      compPending[c] = (compPending[c] || 0) + (p.totalAmount || 0);
    });

    // Company breakdown for received
    const compReceived = { TE: 0, TP: 0, TG: 0, OTHER: 0 };
    filteredReceived.forEach(r => {
      const c = getCompanyFromPO(r.poNumber);
      compReceived[c] = (compReceived[c] || 0) + (r.totalAmount || 0);
    });

    return {
      pendingCount: filteredPending.length,
      pendingAmount,
      overdueCount,
      dueTodayCount,
      partialCount,
      receivedCount: filteredReceived.length,
      receivedAmount,
      siteReceivedCount,
      storeReceivedCount,
      compPending,
      compReceived
    };
  }, [filteredPending, filteredReceived]);

  // Current Display List & Pagination
  const currentList = activeTab === 'received' ? filteredReceived : filteredPending;
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, page]);

  // Change tab resets page
  const handleTabChange = (t: 'received' | 'pending' | 'overview') => {
    setActiveTab(t);
    setPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setCompanyFilter('ALL');
    setModalSearch('');
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setPendingUrgencyFilter('ALL');
    setReceivedTypeFilter('ALL');
    setPage(1);
    if (dataScope === 'server') {
      setTimeout(() => fetchServerData(), 100);
    }
  };

  // ==========================================
  // EXCEL EXPORT ENGINE (xlsx)
  // ==========================================
  const handleExportExcel = (exportMode: 'ALL_SHEETS' | 'ACTIVE_SHEET') => {
    try {
      const wb = XLSX.utils.book_new();
      const nowStr = new Date().toISOString().split('T')[0];

      // 1. Overview Sheet
      if (exportMode === 'ALL_SHEETS' || activeTab === 'overview') {
        const overviewAoa: any[][] = [
          ['รายงานสรุปการตรวจรับพัสดุและสินค้าคงค้าง (Goods Receiving & Backorder Report)'],
          ['บริษัท เทอรา อิเล็คทริค จำกัด และบริษัทในเครือ (Tera Group)'],
          [`วันที่สร้างรายงาน: ${formatThaiDate(new Date(), true)}`, `ผู้จัดทำรายงาน: ${userName || 'เจ้าหน้าที่สโตร์'}`],
          [`ขอบเขตข้อมูล: ${dataScope === 'server' ? 'ข้อมูลทั้งหมดในฐานข้อมูล' : 'ข้อมูลตามตัวกรองในหน้าจอ'}`],
          [],
          ['--- สรุปภาพรวมตัวเลขสำคัญ (Key Metrics) ---'],
          ['หมวดหมู่', 'จำนวนรายการ (PO)', 'มูลค่ารวม (บาท)', 'หมายเหตุ'],
          ['1. PO สินค้าที่ค้างรับ (Pending Goods)', summaryMetrics.pendingCount, summaryMetrics.pendingAmount, 'รอตรวจรับเข้าคลังหรือหน้างาน'],
          ['   - สินค้าเกินกำหนดส่งมอบ (Overdue)', summaryMetrics.overdueCount, '-', 'ต้องเร่งรัดติดตามผู้ขาย'],
          ['   - สินค้ากำหนดส่งมอบวันนี้ (Due Today)', summaryMetrics.dueTodayCount, '-', 'คาดว่าจะเข้าตรวจรับวันนี้'],
          ['   - สินค้ารับแล้วบางส่วน (Partial)', summaryMetrics.partialCount, '-', 'ยังมีสินค้าค้างส่ง'],
          ['2. PO ที่ตรวจรับสินค้าแล้ว (Goods Received)', summaryMetrics.receivedCount, summaryMetrics.receivedAmount, 'รับสินค้าเสร็จสมบูรณ์แล้ว'],
          ['   - รับเข้าคลังสโตร์', summaryMetrics.storeReceivedCount, '-', 'ตรวจรับเข้าคลังเรียบร้อย'],
          ['   - รับตรงหน้างาน (ซื้อเอง/ย้อนหลัง)', summaryMetrics.siteReceivedCount, '-', 'จัดซื้อ/ช่างรับหน้างาน'],
          [],
          ['--- สรุปมูลค่าแยกตามบริษัท ---'],
          ['บริษัท', 'มูลค่าสินค้าค้างรับ (บาท)', 'มูลค่าสินค้าที่รับแล้ว (บาท)'],
          ['TE - บริษัท เทอรา อิเล็คทริค จำกัด', summaryMetrics.compPending.TE, summaryMetrics.compReceived.TE],
          ['TP - บริษัท เทอรา พาวเวอร์ จำกัด', summaryMetrics.compPending.TP, summaryMetrics.compReceived.TP],
          ['TG - บริษัท เทอรา กรุ๊ป จำกัด', summaryMetrics.compPending.TG, summaryMetrics.compReceived.TG],
          ['ทั่วไป / อื่นๆ', summaryMetrics.compPending.OTHER, summaryMetrics.compReceived.OTHER],
        ];

        const wsOverview = XLSX.utils.aoa_to_sheet(overviewAoa);
        wsOverview['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 25 }, { wch: 35 }];
        XLSX.utils.book_append_sheet(wb, wsOverview, 'สรุปภาพรวม');
      }

      // 2. Sheet: PO ที่รับสินค้า (Goods Received)
      if (exportMode === 'ALL_SHEETS' || activeTab === 'received') {
        const receivedHeaders = [
          'ลำดับ',
          'วันที่ตรวจรับ',
          'เลขที่ PO',
          'เลขที่ PR',
          'บริษัท',
          'ผู้ขาย / ซัพพลายเออร์',
          'โครงการ / ชื่องาน',
          'รายการสินค้า',
          'ยอดเงินรวม (บาท)',
          'ผู้ตรวจรับสินค้า',
          'ประเภทการรับ',
          'เลขที่ใบส่งของ (Delivery Note)',
          'กำหนดส่งมอบเดิม',
          'หมายเหตุ'
        ];

        const receivedRows = filteredReceived.map((po, idx) => {
          const comp = getCompanyFromPO(po.poNumber);
          const isSite = isSiteOrRetro(po);
          const dnNumber = po.goodsReceipts?.map(g => g.deliveryNoteNumber).filter(Boolean).join(', ') || '-';

          return [
            idx + 1,
            formatThaiDate(po.receivedAt, true),
            po.poNumber || '-',
            po.prNumber || '-',
            comp,
            po.vendorName || '-',
            po.projectName || po.jobName || '-',
            po.itemList || '-',
            po.totalAmount || 0,
            po.receivedBy || '-',
            isSite ? 'รับหน้างาน' : 'รับเข้าสโตร์',
            dnNumber,
            formatThaiDate(po.deliveryDate),
            po.note || '-'
          ];
        });

        // Add summary footer row
        const totalReceivedSum = filteredReceived.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
        const footerRow = [
          'รวมทั้งสิ้น',
          `${filteredReceived.length} รายการ`,
          '',
          '',
          '',
          '',
          '',
          '',
          totalReceivedSum,
          '',
          '',
          '',
          '',
          ''
        ];

        const wsReceived = XLSX.utils.aoa_to_sheet([
          ['รายงาน PO ที่ตรวจรับสินค้าแล้ว (Goods Received Report)'],
          [`ข้อมูล ณ วันที่: ${formatThaiDate(new Date(), true)}`],
          [],
          receivedHeaders,
          ...receivedRows,
          footerRow
        ]);

        wsReceived['!cols'] = [
          { wch: 8 },  // ลำดับ
          { wch: 20 }, // วันที่รับ
          { wch: 16 }, // เลขที่ PO
          { wch: 16 }, // เลขที่ PR
          { wch: 8 },  // บริษัท
          { wch: 28 }, // ผู้ขาย
          { wch: 30 }, // โครงการ
          { wch: 40 }, // รายการสินค้า
          { wch: 16 }, // ยอดเงินรวม
          { wch: 22 }, // ผู้ตรวจรับ
          { wch: 14 }, // ประเภท
          { wch: 20 }, // ใบส่งของ
          { wch: 16 }, // กำหนดส่ง
          { wch: 30 }  // หมายเหตุ
        ];

        XLSX.utils.book_append_sheet(wb, wsReceived, 'PO_ที่รับสินค้าแล้ว');
      }

      // 3. Sheet: PO สินค้าค้างรับ (Pending Goods / Backorder)
      if (exportMode === 'ALL_SHEETS' || activeTab === 'pending') {
        const pendingHeaders = [
          'ลำดับ',
          'สถานะส่งมอบ / ความเร่งด่วน',
          'กำหนดส่งมอบ',
          'จำนวนวันเกิน/คงเหลือ',
          'เลขที่ PO',
          'เลขที่ PR',
          'บริษัท',
          'ผู้ขาย / ซัพพลายเออร์',
          'โครงการ / ชื่องาน',
          'รายการสินค้าที่สั่งซื้อ',
          'สถานะการรับ',
          'ยอดเงินรวม (บาท)',
          'ผู้ขอซื้อ / ผู้บันทึก',
          'วันที่ออก PO',
          'เครดิตเทอม',
          'หมายเหตุ'
        ];

        const pendingRows = filteredPending.map((po, idx) => {
          const comp = getCompanyFromPO(po.poNumber);
          const st = getDeliveryStatus(po.deliveryDate);
          const stage = po.receiveStatus === 'Partial' ? 'รับแล้วบางส่วน' : 'ยังไม่ได้รับ';

          return [
            idx + 1,
            st.label,
            formatThaiDate(po.deliveryDate),
            st.days < 0 ? `เกินกำหนด ${Math.abs(st.days)} วัน` : st.days === 0 ? 'วันนี้' : `เหลือ ${st.days} วัน`,
            po.poNumber || '-',
            po.prNumber || '-',
            comp,
            po.vendorName || '-',
            po.projectName || po.jobName || '-',
            po.itemList || '-',
            stage,
            po.totalAmount || 0,
            po.prRequestedBy || po.reportedBy || '-',
            formatThaiDate(po.recordedAt || po.createdAt),
            po.creditTerm || '-',
            po.note || '-'
          ];
        });

        // Add summary footer row
        const totalPendingSum = filteredPending.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
        const footerRow = [
          'รวมทั้งสิ้น',
          `${filteredPending.length} รายการ`,
          '',
          `เกินกำหนด ${summaryMetrics.overdueCount} รายการ`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          totalPendingSum,
          '',
          '',
          '',
          ''
        ];

        const wsPending = XLSX.utils.aoa_to_sheet([
          ['รายงาน PO สินค้าที่ค้างรับ / รอส่งมอบ (Goods Backorder & Pending Report)'],
          [`ข้อมูล ณ วันที่: ${formatThaiDate(new Date(), true)}`],
          [],
          pendingHeaders,
          ...pendingRows,
          footerRow
        ]);

        wsPending['!cols'] = [
          { wch: 8 },  // ลำดับ
          { wch: 22 }, // สถานะส่งมอบ
          { wch: 16 }, // กำหนดส่งมอบ
          { wch: 20 }, // จำนวนวัน
          { wch: 16 }, // เลขที่ PO
          { wch: 16 }, // เลขที่ PR
          { wch: 8 },  // บริษัท
          { wch: 28 }, // ผู้ขาย
          { wch: 30 }, // โครงการ
          { wch: 40 }, // รายการสินค้า
          { wch: 16 }, // สถานะการรับ
          { wch: 16 }, // ยอดเงินรวม
          { wch: 22 }, // ผู้ขอซื้อ
          { wch: 16 }, // วันที่ออก PO
          { wch: 14 }, // เครดิตเทอม
          { wch: 30 }  // หมายเหตุ
        ];

        XLSX.utils.book_append_sheet(wb, wsPending, 'PO_สินค้าค้างรับ');
      }

      // Download file
      const filename =
        exportMode === 'ALL_SHEETS'
          ? `รายงานสรุปการตรวจรับพัสดุและสินค้าค้างรับ_${nowStr}.xlsx`
          : activeTab === 'received'
          ? `รายงาน_PO_ที่รับสินค้าแล้ว_${nowStr}.xlsx`
          : activeTab === 'pending'
          ? `รายงาน_PO_สินค้าค้างรับ_${nowStr}.xlsx`
          : `รายงานสรุปภาพรวมการตรวจรับ_${nowStr}.xlsx`;

      XLSX.writeFile(wb, filename);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`,
        showConfirmButton: false,
        timer: 2500
      });
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการส่งออก Excel',
        text: e.message || 'ไม่สามารถสร้างไฟล์ Excel ได้'
      });
    }
  };

  // ==========================================
  // PRINT ENGINE
  // ==========================================
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Dialog Container */}
      <div className="bg-white w-[96vw] max-w-7xl h-[92vh] max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700/60 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 mb-0.5 truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">บริษัท เทอรา อิเล็คทริค จำกัด และกลุ่มบริษัทในเครือ (TE / TP / TG)</span>
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="truncate">รายงานการตรวจรับสินค้า &amp; สินค้าค้างรับ (PO Receive Report)</span>
            </h2>
            <p className="text-[11px] text-slate-300 truncate">
              รายงานวิเคราะห์และสรุปรายการ PO ที่รับสินค้าเข้าคลังแล้ว และรายการ PO สินค้าที่ค้างรับ/รอส่งมอบ
            </p>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Scope Toggle: Screen vs Server */}
            <div className="flex items-center bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setDataScope('screen')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs transition-all ${
                  dataScope === 'screen'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="ใช้ข้อมูลตามรายการที่โหลดอยู่ในหน้าจอ"
              >
                ตามหน้าจอ
              </button>
              <button
                onClick={() => setDataScope('server')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs transition-all ${
                  dataScope === 'server'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="ดึงข้อมูลประวัติทั้งหมดจากฐานข้อมูลเซิร์ฟเวอร์"
              >
                {isLoadingServer ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>ทั้งหมดในระบบ</span>
              </button>
            </div>

            {/* Quick Single Sheet Excel */}
            <button
              onClick={() => handleExportExcel('ACTIVE_SHEET')}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-emerald-100 rounded-xl text-[11px] sm:text-xs font-semibold border border-emerald-600 shadow-xs transition-all hover:scale-[1.02]"
              title="ส่งออกเฉพาะแท็บรายงานปัจจุบันเป็นไฟล์ Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="hidden sm:inline">ชีตนี้ (.xlsx)</span>
              <span className="sm:hidden">ชีตนี้</span>
            </button>

            {/* Export All Sheets Excel */}
            <button
              onClick={() => handleExportExcel('ALL_SHEETS')}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-[11px] sm:text-xs shadow-md transition-all hover:scale-[1.02]"
              title="ส่งออกรายงานฉบับเต็ม รวมทั้งแท็บรับแล้ว, แท็บค้างรับ และแท็บสรุปภาพรวม (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="hidden sm:inline">ส่งออกทุกชีต (.xlsx)</span>
              <span className="sm:hidden">ทุกชีต</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] sm:text-xs font-semibold border border-slate-700 transition-all hover:scale-[1.02]"
              title="พิมพ์รายงานหน้านี้"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>พิมพ์</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors ml-0.5 shrink-0"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= TOP KPI SUMMARY CARDS ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200/80 shrink-0">
          {/* Card 1: PO สินค้าที่ค้างรับ */}
          <div
            onClick={() => handleTabChange('pending')}
            className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all ${
              activeTab === 'pending'
                ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-100 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700">
              <span>PO สินค้าที่ค้างรับ</span>
              <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {summaryMetrics.pendingCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">รายการ</span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
              ยอดรวม: <span className="font-bold text-blue-700">{formatCurrency(summaryMetrics.pendingAmount)}</span>
            </div>
          </div>

          {/* Card 2: เกินกำหนดส่งมอบ (Overdue) */}
          <div
            onClick={() => {
              handleTabChange('pending');
              setPendingUrgencyFilter('OVERDUE');
            }}
            className="cursor-pointer p-2.5 sm:p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-300 transition-all hover:shadow-xs"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-rose-600">
              <span>เกินกำหนดส่ง (Overdue)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">
                {summaryMetrics.overdueCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-400">รายการ</span>
            </div>
            <div className="text-[11px] text-rose-600/90 font-medium mt-0.5 truncate">
              คลิกเพื่อดูรายการที่ต้องเร่งรัด
            </div>
          </div>

          {/* Card 3: กำหนดส่งมอบวันนี้ (Due Today) */}
          <div
            onClick={() => {
              handleTabChange('pending');
              setPendingUrgencyFilter('TODAY');
            }}
            className="cursor-pointer p-2.5 sm:p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-300 transition-all hover:shadow-xs"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700">
              <span>กำหนดส่งมอบวันนี้</span>
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-amber-600 tracking-tight">
                {summaryMetrics.dueTodayCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-500">รายการ</span>
            </div>
            <div className="text-[11px] text-amber-700/90 font-medium mt-0.5 truncate">
              สินค้าที่คาดว่าจะมาส่งวันนี้
            </div>
          </div>

          {/* Card 4: PO ที่รับสินค้าแล้ว */}
          <div
            onClick={() => handleTabChange('received')}
            className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all ${
              activeTab === 'received'
                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-100 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700">
              <span>PO ที่รับสินค้าแล้ว</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight">
                {summaryMetrics.receivedCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">รายการ</span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
              ยอดรวม: <span className="font-bold text-emerald-700">{formatCurrency(summaryMetrics.receivedAmount)}</span>
            </div>
          </div>
        </div>

        {/* ================= FILTER & SUB-TAB BAR ================= */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 space-y-2 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Main Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl shrink-0">
              <button
                onClick={() => handleTabChange('received')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'received'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>1. PO ที่รับสินค้าแล้ว ({filteredReceived.length.toLocaleString()})</span>
              </button>

              <button
                onClick={() => handleTabChange('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>2. PO สินค้าที่ค้างรับ ({filteredPending.length.toLocaleString()})</span>
              </button>

              <button
                onClick={() => handleTabChange('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>3. สรุปวิเคราะห์ภาพรวม</span>
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Company Selector */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                {(['ALL', 'TE', 'TP', 'TG'] as const).map(comp => (
                  <button
                    key={comp}
                    onClick={() => {
                      setCompanyFilter(comp);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      companyFilter === comp
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {comp === 'ALL' ? 'ทุกบริษัท' : comp}
                  </button>
                ))}
              </div>

              {/* Date Preset Selector */}
              <select
                value={datePreset}
                onChange={e => {
                  setDatePreset(e.target.value as any);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">ช่วงเวลา: ทั้งหมด</option>
                <option value="TODAY">วันนี้</option>
                <option value="LAST7">7 วันล่าสุด</option>
                <option value="THIS_MONTH">เดือนนี้</option>
                <option value="LAST_MONTH">เดือนที่แล้ว</option>
                <option value="THIS_YEAR">ปีนี้</option>
                <option value="CUSTOM">กำหนดช่วงวันที่เอง</option>
              </select>

              {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => {
                      setCustomStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs"
                  />
                  <span>-</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => {
                      setCustomEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}

              {/* Sub-Filters per Tab */}
              {activeTab === 'pending' && (
                <select
                  value={pendingUrgencyFilter}
                  onChange={e => {
                    setPendingUrgencyFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-blue-50/70 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">สถานะส่งมอบ: ทั้งหมด</option>
                  <option value="OVERDUE">เกินกำหนดส่ง (Overdue)</option>
                  <option value="TODAY">กำหนดส่งวันนี้ (Due Today)</option>
                  <option value="UPCOMING">ภายใน 7 วัน</option>
                </select>
              )}

              {activeTab === 'received' && (
                <select
                  value={receivedTypeFilter}
                  onChange={e => {
                    setReceivedTypeFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-emerald-50/70 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">ประเภทการรับ: ทั้งหมด</option>
                  <option value="STORE">รับเข้าคลังสโตร์</option>
                  <option value="SITE">รับตรงหน้างาน / ย้อนหลัง</option>
                </select>
              )}

              {/* Reset Button */}
              <button
                onClick={handleResetFilters}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {activeTab !== 'overview' && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาตามเลขที่ PO, เลขที่ PR, ผู้ขาย, โครงการ หรือรายการสินค้า..."
                value={modalSearch}
                onChange={e => {
                  setModalSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {modalSearch && (
                <button
                  onClick={() => {
                    setModalSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================= CONTENT TABLE / OVERVIEW SECTION ================= */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 px-4 sm:px-6 py-3 print:p-0 print:overflow-visible">
          
          {/* Printable Header (Visible only when printing) */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-black">บริษัท เทอรา อิเล็คทริค จำกัด และกลุ่มบริษัทในเครือ</h1>
                <h2 className="text-lg font-semibold text-slate-800 mt-1">
                  {activeTab === 'received'
                    ? 'รายงาน PO ที่รับสินค้าแล้ว (Goods Received Report)'
                    : activeTab === 'pending'
                    ? 'รายงาน PO สินค้าที่ค้างรับ (Goods Backorder & Pending Report)'
                    : 'รายงานสรุปภาพรวมการตรวจรับพัสดุและสินค้าคงค้าง'}
                </h2>
                <div className="text-xs text-slate-500 mt-1">
                  บริษัท: {companyFilter === 'ALL' ? 'ทุกบริษัท (TE / TP / TG)' : companyFilter} | ขอบเขตข้อมูล: {dataScope === 'server' ? 'ฐานข้อมูลระบบทั้งหมด' : 'ตามหน้าจอ'}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>วันที่พิมพ์: {formatThaiDate(new Date(), true)}</div>
                <div>ผู้จัดทำรายงาน: {userName || 'เจ้าหน้าที่สโตร์'}</div>
                <div>จำนวนรายการ: {currentList.length} รายการ</div>
              </div>
            </div>
          </div>

          {/* TAB 1: PO ที่รับสินค้าแล้ว */}
          {activeTab === 'received' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  แสดงผล <strong>{paginatedList.length}</strong> จากทั้งหมด <strong>{filteredReceived.length}</strong> รายการที่รับสินค้าแล้ว
                </span>
                <span className="font-semibold text-emerald-800">
                  มูลค่ารวมที่รับแล้ว: {formatCurrency(summaryMetrics.receivedAmount)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                      <th className="py-3 px-3 w-32">วันที่ตรวจรับ</th>
                      <th className="py-3 px-3 w-28">เลขที่ PO</th>
                      <th className="py-3 px-3 w-28">เลขที่ PR</th>
                      <th className="py-3 px-2 text-center w-14">บริษัท</th>
                      <th className="py-3 px-3 min-w-[160px]">ผู้ขาย / ซัพพลายเออร์</th>
                      <th className="py-3 px-3 min-w-[160px]">โครงการ / ชื่องาน</th>
                      <th className="py-3 px-3 min-w-[200px]">รายการสินค้า</th>
                      <th className="py-3 px-3 text-right w-28">ยอดเงินรวม</th>
                      <th className="py-3 px-3 w-32">ผู้ตรวจรับ</th>
                      <th className="py-3 px-3 text-center w-24">ประเภท</th>
                      <th className="py-3 px-3 w-28">เลขที่ใบส่งของ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedList.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400">
                          <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <div className="text-sm font-semibold text-slate-600">ไม่พบรายการ PO ที่รับสินค้าตามเงื่อนไข</div>
                          <div className="text-xs text-slate-400 mt-1">ลองเปลี่ยนตัวกรอง ค้นหาคำอื่น หรือคลิก &quot;ทั้งหมดในระบบ&quot;</div>
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((po, index) => {
                        const comp = getCompanyFromPO(po.poNumber);
                        const isSite = isSiteOrRetro(po);
                        const dn = po.goodsReceipts?.map(g => g.deliveryNoteNumber).filter(Boolean).join(', ') || '-';
                        const rowNo = (page - 1) * pageSize + index + 1;

                        return (
                          <tr key={po.id || po.poNumber} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-semibold text-slate-400">{rowNo}</td>
                            <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                              {formatThaiDate(po.receivedAt, true)}
                            </td>
                            <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap">
                              {po.poNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {po.prNumber || '-'}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                comp === 'TE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : comp === 'TP'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {comp}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {po.vendorName || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={po.projectName || po.jobName || ''}>
                              {po.projectName || po.jobName || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-[240px] truncate" title={po.itemList || ''}>
                              {po.itemList || '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatCurrency(po.totalAmount)}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {po.receivedBy || '-'}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isSite ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  รับหน้างาน
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  รับเข้าสโตร์
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap truncate max-w-[120px]" title={dn}>
                              {dn}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {paginatedList.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                        <td colSpan={8} className="py-3 px-4 text-right">
                          รวมมูลค่าในตาราง (หน้านี้):
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(paginatedList.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
                        </td>
                        <td colSpan={3} className="py-3 px-3 text-xs text-slate-500 font-normal">
                          (รวมทั้งสิ้น {filteredReceived.length} รายการ: {formatCurrency(summaryMetrics.receivedAmount)})
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PO สินค้าที่ค้างรับ */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  แสดงผล <strong>{paginatedList.length}</strong> จากทั้งหมด <strong>{filteredPending.length}</strong> รายการสินค้าที่ค้างรับ
                  {summaryMetrics.overdueCount > 0 && (
                    <span className="text-rose-600 font-semibold ml-2">
                      (เกินกำหนดส่ง {summaryMetrics.overdueCount} รายการ)
                    </span>
                  )}
                </span>
                <span className="font-semibold text-blue-800">
                  มูลค่าค้างรับรวม: {formatCurrency(summaryMetrics.pendingAmount)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                      <th className="py-3 px-3 w-36">สถานะส่งมอบ / กำหนด</th>
                      <th className="py-3 px-3 w-28">เลขที่ PO</th>
                      <th className="py-3 px-3 w-28">เลขที่ PR</th>
                      <th className="py-3 px-2 text-center w-14">บริษัท</th>
                      <th className="py-3 px-3 min-w-[160px]">ผู้ขาย / ซัพพลายเออร์</th>
                      <th className="py-3 px-3 min-w-[160px]">โครงการ / ชื่องาน</th>
                      <th className="py-3 px-3 min-w-[200px]">รายการสินค้า</th>
                      <th className="py-3 px-3 text-center w-24">สถานะรับ</th>
                      <th className="py-3 px-3 text-right w-28">ยอดเงินรวม</th>
                      <th className="py-3 px-3 w-32">ผู้ขอซื้อ / ผู้บันทึก</th>
                      <th className="py-3 px-3 w-28">วันที่ออก PO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedList.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                          <div className="text-sm font-semibold text-slate-700">ไม่มีรายการสินค้าค้างรับตามเงื่อนไขที่เลือก</div>
                          <div className="text-xs text-slate-400 mt-1">สินค้าตรวจรับครบถ้วน หรือลองปรับตัวกรอง</div>
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((po, index) => {
                        const comp = getCompanyFromPO(po.poNumber);
                        const st = getDeliveryStatus(po.deliveryDate);
                        const rowNo = (page - 1) * pageSize + index + 1;
                        const isPartial = po.receiveStatus === 'Partial';

                        return (
                          <tr key={po.id || po.poNumber} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-semibold text-slate-400">{rowNo}</td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${st.badge}`}>
                                  {st.status === 'overdue' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                  {st.status === 'today' && <Clock className="w-3 h-3 text-amber-600" />}
                                  <span>{st.label}</span>
                                </span>
                                <span className="text-[11px] text-slate-500 ml-0.5">
                                  {formatThaiDate(po.deliveryDate)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap">
                              {po.poNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {po.prNumber || '-'}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                comp === 'TE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : comp === 'TP'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {comp}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {po.vendorName || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={po.projectName || po.jobName || ''}>
                              {po.projectName || po.jobName || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-[240px] truncate" title={po.itemList || ''}>
                              {po.itemList || '-'}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isPartial ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  รับบางส่วน
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  ยังไม่ได้รับ
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-blue-700 whitespace-nowrap">
                              {formatCurrency(po.totalAmount)}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {po.prRequestedBy || po.reportedBy || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {formatThaiDate(po.recordedAt || po.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {paginatedList.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                        <td colSpan={9} className="py-3 px-4 text-right">
                          รวมมูลค่าในตาราง (หน้านี้):
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-blue-700 whitespace-nowrap">
                          {formatCurrency(paginatedList.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-xs text-slate-500 font-normal">
                          (รวมทั้งสิ้น {filteredPending.length} รายการ: {formatCurrency(summaryMetrics.pendingAmount)})
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: สรุปวิเคราะห์ภาพรวม (Analytics & Summary) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Row 1: KPI Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pending Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>สรุปรายการสินค้าค้างรับ (Pending Breakdown)</span>
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {summaryMetrics.pendingCount} รายการ
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-600">มูลค่าสินค้าค้างรับรวมทั้งหมด:</span>
                      <span className="font-bold text-blue-700">{formatCurrency(summaryMetrics.pendingAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-rose-50/70 rounded-xl">
                      <span className="text-rose-700 font-medium">เกินกำหนดส่งมอบ (Overdue):</span>
                      <span className="font-bold text-rose-700">{summaryMetrics.overdueCount} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50/70 rounded-xl">
                      <span className="text-amber-800 font-medium">กำหนดส่งมอบวันนี้ (Due Today):</span>
                      <span className="font-bold text-amber-800">{summaryMetrics.dueTodayCount} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-600">รับสินค้าแล้วบางส่วน (Partial):</span>
                      <span className="font-bold text-slate-800">{summaryMetrics.partialCount} รายการ</span>
                    </div>
                  </div>
                </div>

                {/* Received Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      <span>สรุปรายการตรวจรับสินค้าแล้ว (Received Breakdown)</span>
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {summaryMetrics.receivedCount} รายการ
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-600">มูลค่าสินค้าที่ตรวจรับแล้วรวม:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(summaryMetrics.receivedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-emerald-50/70 rounded-xl">
                      <span className="text-emerald-800 font-medium">ตรวจรับเข้าคลังสโตร์:</span>
                      <span className="font-bold text-emerald-800">{summaryMetrics.storeReceivedCount} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50/70 rounded-xl">
                      <span className="text-amber-800 font-medium">รับตรงหน้างาน / ย้อนหลัง:</span>
                      <span className="font-bold text-amber-800">{summaryMetrics.siteReceivedCount} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-600">สัดส่วนการตรวจรับเข้าคลัง:</span>
                      <span className="font-bold text-slate-800">
                        {summaryMetrics.receivedCount > 0
                          ? Math.round((summaryMetrics.storeReceivedCount / summaryMetrics.receivedCount) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Company Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <span>สรุปมูลค่าแยกตามกลุ่มบริษัท (TE / TP / TG)</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4">บริษัท</th>
                        <th className="py-2.5 px-4 text-right">มูลค่าสินค้าค้างรับ (บาท)</th>
                        <th className="py-2.5 px-4 text-right">มูลค่าสินค้าที่รับแล้ว (บาท)</th>
                        <th className="py-2.5 px-4 text-right">มูลค่ารวมทั้งสิ้น (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-blue-700">TE (บริษัท เทอรา อิเล็คทริค จำกัด)</td>
                        <td className="py-2.5 px-4 text-right text-slate-800">{formatCurrency(summaryMetrics.compPending.TE)}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(summaryMetrics.compReceived.TE)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(summaryMetrics.compPending.TE + summaryMetrics.compReceived.TE)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-emerald-700">TP (บริษัท เทอรา พาวเวอร์ จำกัด)</td>
                        <td className="py-2.5 px-4 text-right text-slate-800">{formatCurrency(summaryMetrics.compPending.TP)}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(summaryMetrics.compReceived.TP)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(summaryMetrics.compPending.TP + summaryMetrics.compReceived.TP)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-purple-700">TG (บริษัท เทอรา กรุ๊ป จำกัด)</td>
                        <td className="py-2.5 px-4 text-right text-slate-800">{formatCurrency(summaryMetrics.compPending.TG)}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(summaryMetrics.compReceived.TG)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(summaryMetrics.compPending.TG + summaryMetrics.compReceived.TG)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                        <td className="py-3 px-4">รวมทั้งหมด</td>
                        <td className="py-3 px-4 text-right text-blue-800">{formatCurrency(summaryMetrics.pendingAmount)}</td>
                        <td className="py-3 px-4 text-right text-emerald-800">{formatCurrency(summaryMetrics.receivedAmount)}</td>
                        <td className="py-3 px-4 text-right text-slate-950 font-extrabold">{formatCurrency(summaryMetrics.pendingAmount + summaryMetrics.receivedAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Printable Signature Block (Visible only when printing) */}
          <div className="hidden print:grid grid-cols-3 gap-6 pt-12 text-center text-xs">
            <div className="space-y-12">
              <div className="border-b border-black w-44 mx-auto" />
              <div>
                <div className="font-bold">({userName || '...........................................'})</div>
                <div className="text-slate-600">ผู้จัดทำรายงาน / เจ้าหน้าที่สโตร์</div>
                <div className="text-slate-500 text-[10px]">วันที่ ...../...../..........</div>
              </div>
            </div>
            <div className="space-y-12">
              <div className="border-b border-black w-44 mx-auto" />
              <div>
                <div className="font-bold">(..................................................)</div>
                <div className="text-slate-600">ผู้ตรวจรับพัสดุ / หัวหน้าสโตร์</div>
                <div className="text-slate-500 text-[10px]">วันที่ ...../...../..........</div>
              </div>
            </div>
            <div className="space-y-12">
              <div className="border-b border-black w-44 mx-auto" />
              <div>
                <div className="font-bold">(..................................................)</div>
                <div className="text-slate-600">ผู้จัดการฝ่ายจัดซื้อ / คลังสินค้า</div>
                <div className="text-slate-500 text-[10px]">วันที่ ...../...../..........</div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MODAL FOOTER & PAGINATION ================= */}
        {activeTab !== 'overview' && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="text-xs text-slate-500 truncate">
              หน้า <strong>{page}</strong> จาก <strong>{totalPages}</strong> (ทั้งหมด {currentList.length.toLocaleString()} รายการ)
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>ก่อนหน้า</span>
              </button>

              <div className="px-3 py-1 text-xs font-bold text-slate-800 bg-slate-200 rounded-lg">
                {page} / {totalPages}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
