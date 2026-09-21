'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { 
  cancelPurchaseOrder, 
  restorePurchaseOrder, 
  updatePurchaseOrder,
  recordPurchaseOrderReceipt,
  revertPurchaseOrderReceipt,
  batchRecordPurchaseOrderReceipt
} from '@/app/actions/procurement';
import SearchableProjectSelect, { ProjectOption } from '../components/SearchableProjectSelect';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CalendarClock,
  DollarSign,
  CreditCard,
  FileCheck2,
  AlertCircle,
  PackageCheck,
  Truck,
  Wrench,
  Warehouse,
  RotateCcw,
  CheckSquare,
  Square,
  Package,
  X,
  Layers
} from 'lucide-react';
import { getPOPaymentStatus } from '@/app/lib/supplierPaymentUtils';

function normalizeProjectName(rawName: string | undefined | null): string {
  if (!rawName) return '';
  let n = rawName.trim();

  // Strip leading punctuation like : or - or .
  n = n.replace(/^[:\-\s.]+/, '');

  // Strip Project / Job / JB prefixes
  n = n.replace(/^Project\s*:\s*/i, '');
  n = n.replace(/^Project\s*[-]\s*/i, '');
  n = n.replace(/^Project\s+/i, '');
  n = n.replace(/^Job\s*:\s*/i, '');
  n = n.replace(/^JB\d{2}[-]?\d{5,7}\s*[-:]?\s*/i, '');

  // Strip leading "งาน" or "โครงการ"
  n = n.replace(/^งาน\s*/, '');
  n = n.replace(/^โครงการ\s*/, '');
  n = n.replace(/^[:\-\s.]+/, '');
  n = n.trim();

  const lower = n.toLowerCase();

  // Group common variations into clear project names
  if (lower.includes('water treatment') || lower.includes('egat')) return 'EGAT - Water Treatment';
  if (lower.includes('กรมการข้าว')) return 'กรมการข้าว';
  if (lower.includes('เซนิธ') || lower.includes('เซนิร') || lower.includes('zenith')) return 'บจก. เซนิธเฮลท์ (Zenith Health)';
  if (lower.includes('อินโนเวชั่น') || lower.includes('innovation')) return 'บจก. อินโนเวชั่น (Innovation)';
  if (lower.includes('ชลบุรี ไฮท์')) return 'บริษัท ชลบุรี ไฮท์ พาเลท จำกัด';
  if (lower.includes('หนองตาคง') || lower.includes('นวรรณ')) return 'โครงการอนุรักษ์ฟื้นฟูแหล่งน้ำหนองตาคง (หจก.นวรรณ)';
  if (lower.includes('พด.เลย') || lower.includes('พด เลย') || lower.includes('พัฒนาที่ดินเลย')) return 'กรมพัฒนาที่ดิน เลย';
  if (lower.includes('พด.เชียงใหม่') || lower.includes('พด เชียงใหม่') || lower.includes('พัฒนาที่ดินเชียงใหม่')) return 'กรมพัฒนาที่ดิน เชียงใหม่';
  if (lower.includes('พัฒนาที่ดิน')) return 'กรมพัฒนาที่ดิน';
  if (lower.includes('บาดาล') || lower.includes('dgr')) return 'กรมทรัพยากรน้ำบาดาล';
  if (lower.includes('ชลประทาน')) return 'กรมชลประทาน';
  if (lower.includes('solar roof') && (lower.includes('stock') || lower.includes('safety'))) return 'Safety Stock (Solar Roof)';
  if (lower.includes('safety stock') || lower.includes('งานสต็อค') || lower.includes('งานสต็อก') || lower.includes('stock')) return 'Safety Stock / สต็อก';
  if (lower.includes('นิชชินโบ') || lower.includes('nisshinbo')) return 'นิชชินโบ (Nisshinbo)';
  if (lower.includes('จำลอง')) return 'จำลองเจริญ';

  return n;
}

const getNormalizedProjectGroup = normalizeProjectName;

function parseSafeAmount(val: string): number | null {
  if (!val || !val.trim()) return null;
  let s = val.trim().replace(/,/g, '');
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    const lastDotIdx = s.lastIndexOf('.');
    const integerPart = s.substring(0, lastDotIdx).replace(/\./g, '');
    const decimalPart = s.substring(lastDotIdx + 1);
    s = integerPart + '.' + decimalPart;
  }
  const parsed = parseFloat(s);
  return isNaN(parsed) ? null : parsed;
}

function getAccountingAuditInfo(po: any) {
  const isModified = Boolean(
    (po.note && (po.note.includes('[ฝ่ายบัญชี') || po.note.includes('[การเงิน') || po.note.includes('[เลื่อนชำระ'))) ||
    po.supplierPaymentTasks?.some((t: any) => t.note && (t.note.includes('[ฝ่ายบัญชี') || t.note.includes('[เลื่อนชำระ') || t.note.includes('[การเงิน')))
  );

  if (!isModified) return { isModified: false, latestLog: '', editor: '' };

  let latestLog = '';
  if (po.note) {
    const lines = po.note.split('\n').filter((l: string) => l.includes('[ฝ่ายบัญชี') || l.includes('[การเงิน') || l.includes('[เลื่อนชำระ'));
    if (lines.length > 0) latestLog = lines[lines.length - 1];
  }
  if (!latestLog && po.supplierPaymentTasks) {
    for (const t of po.supplierPaymentTasks) {
      if (t.note) {
        const lines = t.note.split('\n').filter((l: string) => l.includes('[ฝ่ายบัญชี') || l.includes('[การเงิน') || l.includes('[เลื่อนชำระ'));
        if (lines.length > 0) {
          latestLog = lines[lines.length - 1];
          break;
        }
      }
    }
  }

  let editor = '';
  const match = latestLog.match(/โดย\s+([^:\]]+)/);
  if (match) {
    editor = match[1].trim();
  }

  return { isModified: true, latestLog, editor };
}

export default function POListClient({ 
  initialPos, 
  initialSearch = '',
  currentUser
}: { 
  initialPos: any[]; 
  initialSearch?: string;
  currentUser?: { fullName?: string | null; role?: string | null; email?: string | null };
}) {
  const router = useRouter();
  const [posList, setPosList] = useState(initialPos);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, RECEIVED, CANCELLED
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // ALL, PAID, DEFERRED, PENDING, AWAITING_GR, OVERDUE
  const [companyFilter, setCompanyFilter] = useState('all'); // all, TE, TP, TG
  const [projectFilter, setProjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<'recordedAt' | 'poNumber' | 'vendorName' | 'totalAmount'>('recordedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit Modal State
  const [editingPO, setEditingPO] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    poNumber: '',
    prNumber: '',
    vendorName: '',
    totalAmount: '',
    creditTerm: '',
    jobName: '',
    deliveryDate: '',
    note: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Store-in (Goods Receipt) Modal State for Purchasing
  const [receivingPO, setReceivingPO] = useState<any | null>(null);
  const [receiveForm, setReceiveForm] = useState<{
    receiptType: 'DIRECT_SITE' | 'LABOR_SERVICE' | 'WAREHOUSE' | 'OTHER';
    receivedBy: string;
    receivedAt: string;
    note: string;
  }>({
    receiptType: 'DIRECT_SITE',
    receivedBy: currentUser?.fullName || '',
    receivedAt: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  // Multi-select Batch Store-In State
  const [selectedPoNumbers, setSelectedPoNumbers] = useState<Set<string>>(new Set());
  const [isBatchReceiveModalOpen, setIsBatchReceiveModalOpen] = useState(false);
  const [batchReceiveForm, setBatchReceiveForm] = useState<{
    receiptType: 'DIRECT_SITE' | 'LABOR_SERVICE' | 'WAREHOUSE' | 'OTHER';
    receivedBy: string;
    receivedAt: string;
    note: string;
  }>({
    receiptType: 'DIRECT_SITE',
    receivedBy: currentUser?.fullName || '',
    receivedAt: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [isSubmittingBatchReceive, setIsSubmittingBatchReceive] = useState(false);

  const thaiMonths = [
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

  // Extract unique years from the data
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    posList.forEach(po => {
      const d = po.recordedAt || po.createdAt;
      if (d) {
        years.add(new Date(d).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [posList]);

  // Unique projects with item counts, sorted by frequency
  const projectOptions: ProjectOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    posList.forEach(po => {
      const pName = po.jobName || po.purchaseRequest?.projectName;
      const normalized = normalizeProjectName(pName);
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [posList]);

  const toggleRowExpand = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSort = (field: 'recordedAt' | 'poNumber' | 'vendorName' | 'totalAmount') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setCompanyFilter('all');
    setProjectFilter('');
    setDateFilter('');
    setMonthFilter('');
    setYearFilter('');
    setCurrentPage(1);
  };

  const isAnyFilterActive = Boolean(
    searchTerm.trim() ||
    statusFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    companyFilter !== 'all' ||
    projectFilter !== '' ||
    dateFilter !== '' ||
    monthFilter !== '' ||
    yearFilter !== ''
  );

  // Filtered List
  const filteredPos = useMemo(() => {
    return posList.filter(po => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const poNum = (po.poNumber || '').toLowerCase();
        const prNum = (po.prNumber || '').toLowerCase();
        const vendor = (po.vendorName || '').toLowerCase();
        const job = (po.jobName || po.purchaseRequest?.projectName || '').toLowerCase();
        const item = (po.itemList || '').toLowerCase();
        const matches = poNum.includes(q) || prNum.includes(q) || vendor.includes(q) || job.includes(q) || item.includes(q);
        if (!matches) return false;
      }

      // 2. Status filter
      if (statusFilter === 'RECEIVED' && po.receiveStatus !== 'Received') return false;
      if (statusFilter === 'PENDING' && (po.receiveStatus === 'Received' || po.receiveStatus === 'Cancelled')) return false;
      if (statusFilter === 'CANCELLED' && po.receiveStatus !== 'Cancelled') return false;

      // 2.1 Payment Status filter
      if (paymentFilter !== 'ALL') {
        const payStatus = getPOPaymentStatus(po);
        if (paymentFilter === 'PAID' && payStatus.type !== 'PAID') return false;
        if (paymentFilter === 'DEFERRED' && payStatus.type !== 'DEFERRED') return false;
        if (paymentFilter === 'PENDING' && payStatus.type !== 'PENDING') return false;
        if (paymentFilter === 'AWAITING_GR' && payStatus.type !== 'AWAITING_GR') return false;
        if (paymentFilter === 'OVERDUE' && payStatus.type !== 'OVERDUE') return false;
      }

      // 3. Company filter
      if (companyFilter !== 'all') {
        const poUpper = (po.poNumber || '').toUpperCase();
        if (companyFilter === 'TE' && !poUpper.includes('-E')) return false;
        if (companyFilter === 'TP' && !poUpper.includes('-P')) return false;
        if (companyFilter === 'TG' && !poUpper.includes('-G')) return false;
      }

      // 4. Project filter
      if (projectFilter !== '') {
        const pName = po.jobName || po.purchaseRequest?.projectName || '';
        const norm = normalizeProjectName(pName);
        if (norm !== projectFilter && !pName.toLowerCase().includes(projectFilter.toLowerCase())) return false;
      }

      // 5. Date filters (using recordedAt with fallback to createdAt)
      const poDate = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : null);
      if (dateFilter) {
        if (!poDate) return false;
        const yyyy = poDate.getFullYear();
        const mm = String(poDate.getMonth() + 1).padStart(2, '0');
        const dd = String(poDate.getDate()).padStart(2, '0');
        if (`${yyyy}-${mm}-${dd}` !== dateFilter) return false;
      }

      if (monthFilter) {
        if (!poDate || (poDate.getMonth() + 1).toString() !== monthFilter) return false;
      }

      if (yearFilter) {
        if (!poDate || poDate.getFullYear().toString() !== yearFilter) return false;
      }

      return true;
    });
  }, [posList, searchTerm, statusFilter, paymentFilter, companyFilter, projectFilter, dateFilter, monthFilter, yearFilter]);

  // Sorted List
  const sortedPos = useMemo(() => {
    return [...filteredPos].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'recordedAt') {
        valA = a.recordedAt ? new Date(a.recordedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        valB = b.recordedAt ? new Date(b.recordedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      } else if (sortField === 'totalAmount') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPos, sortField, sortOrder]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(sortedPos.length / pageSize));
  const paginatedPos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPos.slice(start, start + pageSize);
  }, [sortedPos, currentPage, pageSize]);

  // Quick KPI Counts (based on current non-status filters)
  const kpiStats = useMemo(() => {
    const activeItems = filteredPos.filter(p => p.receiveStatus !== 'Cancelled');
    const totalAmount = activeItems.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const pendingCount = filteredPos.filter(p => p.receiveStatus !== 'Received' && p.receiveStatus !== 'Cancelled').length;
    const receivedCount = filteredPos.filter(p => p.receiveStatus === 'Received').length;
    const cancelledCount = filteredPos.filter(p => p.receiveStatus === 'Cancelled').length;
    return {
      totalAmount,
      totalCount: filteredPos.length,
      activeCount: activeItems.length,
      pendingCount,
      receivedCount,
      cancelledCount,
    };
  }, [filteredPos]);

  // Overall counts for tabs
  const tabCounts = useMemo(() => {
    return {
      ALL: posList.length,
      PENDING: posList.filter(p => p.receiveStatus !== 'Received' && p.receiveStatus !== 'Cancelled').length,
      RECEIVED: posList.filter(p => p.receiveStatus === 'Received').length,
      CANCELLED: posList.filter(p => p.receiveStatus === 'Cancelled').length,
    };
  }, [posList]);

  const openEditModal = (po: any) => {
    setEditingPO(po);
    let dateStr = '';
    if (po.deliveryDate) {
      const d = new Date(po.deliveryDate);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
      }
    }
    setEditForm({
      poNumber: po.poNumber || '',
      prNumber: po.prNumber || '',
      vendorName: po.vendorName || '',
      totalAmount: po.totalAmount !== null && po.totalAmount !== undefined ? String(po.totalAmount) : '',
      creditTerm: po.creditTerm || '',
      jobName: po.jobName || po.purchaseRequest?.projectName || '',
      deliveryDate: dateStr,
      note: po.note || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    if (!editForm.poNumber.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกเลขที่ PO' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        poNumber: editForm.poNumber.trim(),
        prNumber: editForm.prNumber.trim(),
        vendorName: editForm.vendorName.trim(),
        totalAmount: editForm.totalAmount !== '' ? parseSafeAmount(editForm.totalAmount) : null,
        creditTerm: editForm.creditTerm.trim(),
        jobName: editForm.jobName.trim(),
        deliveryDate: editForm.deliveryDate || null,
        note: editForm.note.trim()
      };

      const res = await updatePurchaseOrder(editingPO.id, payload);
      if (res.success && res.data) {
        setPosList(prev => prev.map(p => p.id === editingPO.id ? { ...p, ...res.data } : p));
        setEditingPO(null);
        Swal.fire({
          icon: 'success',
          title: 'อัพเดตสำเร็จ',
          text: `บันทึกเขียนทับข้อมูล PO ${res.data.poNumber} เรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกได้',
          text: res.error || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล PO',
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถบันทึกได้',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancel = async (poNumber: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการยกเลิก PO',
      html: `คุณต้องการยกเลิก PO เลขที่ <b>${poNumber}</b> ใช่หรือไม่?<br/><span class="text-xs text-gray-500">เมื่อยกเลิกแล้ว รายการนี้จะไม่แสดงในรายการค้างรับของสโตร์ และไม่ถูกนำมารวมในยอดจัดซื้อจริง</span>`,
      input: 'text',
      inputLabel: 'เหตุผลการยกเลิก (ระบุได้ตามต้องการ)',
      inputValue: 'ยกเลิกใน Express',
      inputPlaceholder: 'เช่น ยกเลิกใน Express แล้ว, เปลี่ยนผู้ขาย ฯลฯ',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันยกเลิก PO',
      cancelButtonText: 'ปิด',
    });

    if (!result.isConfirmed) return;

    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await cancelPurchaseOrder(poNumber, result.value);
      if (res.success) {
        setPosList(prev => prev.map(p => p.poNumber === poNumber ? { ...p, receiveStatus: 'Cancelled' } : p));
        Swal.fire({
          icon: 'success',
          title: 'ยกเลิก PO สำเร็จ',
          text: `PO ${poNumber} ถูกยกเลิกเรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถยกเลิก PO ได้',
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถยกเลิก PO ได้',
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
    }
  };

  const handleRestore = async (poNumber: string) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันคืนสถานะ PO',
      text: `ต้องการคืนสถานะ PO ${poNumber} ให้กลับมาใช้งานตามปกติใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันคืนสถานะ',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await restorePurchaseOrder(poNumber);
      if (res.success) {
        setPosList(prev => prev.map(p => p.poNumber === poNumber ? { ...p, receiveStatus: null } : p));
        Swal.fire({
          icon: 'success',
          title: 'คืนสถานะสำเร็จ',
          text: `PO ${poNumber} กลับสู่สถานะปกติแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถคืนสถานะ PO ได้',
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถคืนสถานะ PO ได้',
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
    }
  };

  // --- Store-In (Goods Receipt) Action Handlers for Purchasing ---
  const openReceiveModal = (po: any) => {
    const isLaborOrService = 
      po.jobName?.includes('ค่าแรง') || 
      po.itemList?.includes('ค่าแรง') || 
      po.jobName?.includes('ติดตั้ง') || 
      po.itemList?.includes('ติดตั้ง') ||
      po.jobName?.includes('จ้างเหมา') ||
      po.itemList?.includes('จ้างเหมา');

    const defaultType: 'DIRECT_SITE' | 'LABOR_SERVICE' | 'WAREHOUSE' | 'OTHER' = 
      isLaborOrService ? 'LABOR_SERVICE' : 'DIRECT_SITE';

    setReceivingPO(po);
    setReceiveForm({
      receiptType: defaultType,
      receivedBy: currentUser?.fullName || '',
      receivedAt: new Date().toISOString().split('T')[0],
      note: ''
    });
  };

  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPO) return;
    if (!receiveForm.receivedBy.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อผู้ตรวจรับ',
        text: 'โปรดระบุชื่อผู้ตรวจรับสินค้า หรือผู้รับมอบงานที่หน้างาน'
      });
      return;
    }

    setIsSubmittingReceive(true);
    try {
      const res = await recordPurchaseOrderReceipt({
        poNumber: receivingPO.poNumber,
        receiptType: receiveForm.receiptType,
        receivedBy: receiveForm.receivedBy.trim(),
        receivedAt: receiveForm.receivedAt ? `${receiveForm.receivedAt}T12:00:00Z` : null,
        note: receiveForm.note.trim() || undefined
      });

      if (res.success && res.data) {
        setPosList(prev => prev.map(p => p.id === receivingPO.id ? {
          ...p,
          receiveStatus: 'Received',
          receivedBy: res.data.receivedBy,
          receivedAt: res.data.receivedAt,
          note: res.data.note
        } : p));

        Swal.fire({
          icon: 'success',
          title: 'บันทึกรับเข้าสำเร็จ',
          html: `<div class="text-sm">บันทึกรับของ PO <b>${receivingPO.poNumber}</b> เรียบร้อยแล้ว<br/><span class="text-xs text-emerald-600 font-semibold mt-1 inline-block">ปลดล็อกรายการชำระเงินในระบบบัญชี (AP) อัตโนมัติ</span></div>`,
          timer: 2500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });

        setReceivingPO(null);
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกการรับสินค้าได้'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
      });
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  const handleRevertReceive = async (poNumber: string) => {
    const confirm = await Swal.fire({
      title: `ยกเลิกการตรวจรับ PO ${poNumber}?`,
      text: 'สถานะจะถูกปรับกลับเป็น "รอรับสินค้า" และรายการชำระเงินในระบบบัญชีจะถูกปรับสถานะกลับตามเงื่อนไข',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'ระบุเหตุผลที่ยกเลิกการตรวจรับ (ถ้ามี)',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันยกเลิกรับสินค้า',
      cancelButtonText: 'ปิด'
    });

    if (!confirm.isConfirmed) return;

    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await revertPurchaseOrderReceipt(poNumber, confirm.value || undefined);
      if (res.success && res.data) {
        setPosList(prev => prev.map(p => p.poNumber === poNumber ? {
          ...p,
          receiveStatus: null,
          receivedBy: null,
          receivedAt: null,
          note: res.data.note
        } : p));

        Swal.fire({
          icon: 'success',
          title: 'ยกเลิกการตรวจรับเรียบร้อย',
          text: `PO ${poNumber} กลับสู่สถานะรอรับสินค้าแล้ว`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถยกเลิกการรับสินค้าได้'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'เกิดข้อผิดพลาด'
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
    }
  };

  // --- Multi-select Batch Handlers ---
  const handleToggleSelectPo = (poNumber: string) => {
    setSelectedPoNumbers(prev => {
      const next = new Set(prev);
      if (next.has(poNumber)) next.delete(poNumber);
      else next.add(poNumber);
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const selectableOnPage = paginatedPos.filter(p => p.receiveStatus !== 'Cancelled');
    const allSelected = selectableOnPage.length > 0 && selectableOnPage.every(p => selectedPoNumbers.has(p.poNumber));
    setSelectedPoNumbers(prev => {
      const next = new Set(prev);
      if (allSelected) {
        selectableOnPage.forEach(p => next.delete(p.poNumber));
      } else {
        selectableOnPage.forEach(p => next.add(p.poNumber));
      }
      return next;
    });
  };

  const openBatchReceiveModal = () => {
    if (selectedPoNumbers.size === 0) return;
    setBatchReceiveForm({
      receiptType: 'DIRECT_SITE',
      receivedBy: currentUser?.fullName || '',
      receivedAt: new Date().toISOString().split('T')[0],
      note: ''
    });
    setIsBatchReceiveModalOpen(true);
  };

  const handleConfirmBatchReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPoNumbers.size === 0) return;
    if (!batchReceiveForm.receivedBy.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชื่อผู้ตรวจรับ'
      });
      return;
    }

    setIsSubmittingBatchReceive(true);
    try {
      const poArray = Array.from(selectedPoNumbers);
      const res = await batchRecordPurchaseOrderReceipt({
        poNumbers: poArray,
        receiptType: batchReceiveForm.receiptType,
        receivedBy: batchReceiveForm.receivedBy.trim(),
        receivedAt: batchReceiveForm.receivedAt ? `${batchReceiveForm.receivedAt}T12:00:00Z` : null,
        note: batchReceiveForm.note.trim() || undefined
      });

      if (res.processedCount && res.processedCount > 0) {
        setPosList(prev => prev.map(p => selectedPoNumbers.has(p.poNumber) ? {
          ...p,
          receiveStatus: 'Received',
          receivedBy: `[${batchReceiveForm.receiptType}] ${batchReceiveForm.receivedBy.trim()}`,
          receivedAt: new Date()
        } : p));

        Swal.fire({
          icon: 'success',
          title: `บันทึกรับเข้าสำเร็จ ${res.processedCount} รายการ`,
          text: (res.failedCount ?? 0) > 0 ? `พบข้อผิดพลาด ${res.failedCount} รายการ` : 'ปลดล็อกรายการชำระเงินในระบบบัญชี (AP) อัตโนมัติ',
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });

        setSelectedPoNumbers(new Set());
        setIsBatchReceiveModalOpen(false);
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกรับเข้าได้',
          text: res.errors?.join('\n') || (res as any).error || 'เกิดข้อผิดพลาดในการบันทึกรับสินค้า'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'เกิดข้อผิดพลาด'
      });
    } finally {
      setIsSubmittingBatchReceive(false);
    }
  };

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const exportData = sortedPos.map(po => {
        const d = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : null);
        const dateStr = d ? d.toLocaleDateString('th-TH') : '-';
        const delivStr = po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-';
        const comp = po.poNumber?.toUpperCase().includes('-E') ? 'TE' : (po.poNumber?.toUpperCase().includes('-P') ? 'TP' : (po.poNumber?.toUpperCase().includes('-G') ? 'TG' : '-'));

        return {
          'เลขที่ PO': po.poNumber,
          'วันที่เอกสาร': dateStr,
          'บริษัท': comp,
          'อ้างอิง PR': po.prNumber || '-',
          'โปรเจกต์': po.jobName || po.purchaseRequest?.projectName || '-',
          'ผู้ขาย': po.vendorName || '-',
          'รายการ': po.itemList || '-',
          'เครดิต': po.creditTerm || '-',
          'ยอดรวม (บาท)': Number(po.totalAmount) || 0,
          'วันส่งมอบ': delivStr,
          'สถานะ': po.receiveStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : (po.receiveStatus === 'Received' ? `รับโดย ${po.receivedBy}` : 'รอรับสินค้า'),
        };
      });

      // Add summary row
      exportData.push({
        'เลขที่ PO': 'รวมทั้งหมด (ไม่รวมรายการยกเลิก)',
        'วันที่เอกสาร': '',
        'บริษัท': '',
        'อ้างอิง PR': '',
        'โปรเจกต์': '',
        'ผู้ขาย': '',
        'รายการ': '',
        'เครดิต': '',
        'ยอดรวม (บาท)': kpiStats.totalAmount,
        'วันส่งมอบ': '',
        'สถานะ': '',
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

      const fileName = `PO_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              รายการสั่งซื้อ (Purchase Orders - PO)
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200/50">
              {posList.length} รายการ
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            จัดการและตรวจสอบรายการสั่งซื้อ เชื่อมโยงข้อมูลกับระบบจัดซื้อและ Express อย่างแม่นยำ
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/procurement/dashboard"
            className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
          >
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            แดชบอร์ดจัดซื้อ
          </Link>

          <Link
            href="/admin/procurement/pr"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            รายการ PR
          </Link>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>ยอดสั่งซื้อรวม (ตัวกรอง)</span>
            <span className="p-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">Express Parity</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpiStats.totalAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {kpiStats.activeCount} รายการ (ไม่รวมยกเลิก)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>รอรับสินค้า</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpiStats.pendingCount}
          </p>
          <p className="text-xs text-amber-600 font-medium mt-1">
            รอดำเนินการรับเข้าสโตร์
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>รับสินค้าแล้ว</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpiStats.receivedCount}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            รับเข้าคลังเรียบร้อยแล้ว
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-rose-400">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>ยกเลิกแล้ว</span>
            <span className="p-1 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">ไม่คิดยอด</span>
          </div>
          <p className="text-2xl font-bold text-gray-700 mt-2">
            {kpiStats.cancelledCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ยกเลิกใน Express หรือ CRM
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filter Section */}
        <div className="p-5 border-b border-gray-100 space-y-4">
          {/* Top Bar: Search & Status Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Quick Status Tabs */}
            <div className="inline-flex p-1 bg-gray-100/80 rounded-xl gap-1 self-start">
              <button
                onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${statusFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                ทั้งหมด
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === 'ALL' ? 'bg-gray-100 text-gray-800 font-bold' : 'text-gray-500'}`}>
                  {tabCounts.ALL}
                </span>
              </button>

              <button
                onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                รอรับสินค้า
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === 'PENDING' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-100 text-amber-800'}`}>
                  {tabCounts.PENDING}
                </span>
              </button>

              <button
                onClick={() => { setStatusFilter('RECEIVED'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${statusFilter === 'RECEIVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                รับแล้ว
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === 'RECEIVED' ? 'bg-emerald-700 text-white font-bold' : 'bg-emerald-100 text-emerald-800'}`}>
                  {tabCounts.RECEIVED}
                </span>
              </button>

              <button
                onClick={() => { setStatusFilter('CANCELLED'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${statusFilter === 'CANCELLED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                ยกเลิก
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === 'CANCELLED' ? 'bg-rose-700 text-white font-bold' : 'bg-rose-100 text-rose-800'}`}>
                  {tabCounts.CANCELLED}
                </span>
              </button>
            </div>

            {/* Search Input with Clear Button */}
            <div className="relative w-full lg:w-80">
              <input
                type="text"
                placeholder="ค้นหา PO, PR, ผู้ขาย, โครงการ, สินค้า..."
                className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-1">
            {/* Company Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">บริษัท</label>
              <select
                value={companyFilter}
                onChange={(e) => { setCompanyFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทุกบริษัท</option>
                <option value="TE">TE (Electric)</option>
                <option value="TP">TP (Power)</option>
                <option value="TG">TG (Group)</option>
              </select>
            </div>

            {/* Payment Status Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">สถานะชำระเงิน (AP)</label>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">ทุกสถานะชำระ</option>
                <option value="PAID">🟢 จ่ายเงินแล้ว</option>
                <option value="DEFERRED">🟡 เลื่อนนัดชำระ</option>
                <option value="PENDING">🔵 รอจ่ายเงิน</option>
                <option value="AWAITING_GR">🟠 รอตรวจรับของ</option>
                <option value="OVERDUE">🔴 เกินกำหนดชำระ</option>
              </select>
            </div>

            {/* Project Selector (Searchable Combobox) */}
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">โครงการ / โปรเจกต์</label>
              <SearchableProjectSelect
                value={projectFilter}
                onChange={(selected) => { setProjectFilter(selected); setCurrentPage(1); }}
                options={projectOptions}
                totalCount={posList.length}
                placeholder="ทุกโปรเจกต์"
              />
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">เดือน</label>
              <select
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกเดือน</option>
                {thaiMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">ปี</label>
              <select
                value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกปี</option>
                {uniqueYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Date Picker & Reset */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">วันที่เจาะจง</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {isAnyFilterActive && (
                <button
                  onClick={resetAllFilters}
                  title="ล้างตัวกรองทั้งหมด"
                  className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors shrink-0"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Info & Page Controls Bar */}
        <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-2">
            <span>พบ <b>{sortedPos.length}</b> รายการ</span>
            {isAnyFilterActive && (
              <span className="bg-blue-100/70 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-medium">
                คัดกรองแล้ว
              </span>
            )}
            <span>• แสดงหน้า {currentPage} / {totalPages}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>แสดง:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={100}>100 รายการ</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="หน้าแรก"
                className="p-1 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              <span className="px-2 py-1 font-bold text-gray-700 text-xs">
                {currentPage}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="หน้าสุดท้าย"
                className="p-1 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky/Floating Batch Action Bar */}
        {selectedPoNumbers.size > 0 && (
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-xl shadow-md border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 m-4">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <CheckSquare className="w-4 h-4" />
              </span>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>เลือกไว้ {selectedPoNumbers.size} รายการ</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                    พร้อมทำรายการตรวจรับ
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mt-0.5">
                  บันทึกรับสินค้าเข้าสโตร์ หรือส่งมอบตรงหน้างาน/ค่าแรง พร้อมกันในครั้งเดียว
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setSelectedPoNumbers(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                ล้างที่เลือก
              </button>
              <button
                type="button"
                onClick={openBatchReceiveModal}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <PackageCheck className="w-4 h-4" />
                <span>บันทึกรับเข้าพร้อมกัน ({selectedPoNumbers.size} ใบ)</span>
              </button>
            </div>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="w-7 py-3.5 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedPos.length > 0 && paginatedPos.filter(p => p.receiveStatus !== 'Cancelled').every(p => selectedPoNumbers.has(p.poNumber))}
                    onChange={handleSelectAllOnPage}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                    title="เลือกทั้งหมดในหน้านี้เพื่อรับเข้าพร้อมกัน"
                  />
                </th>
                <th className="w-6 py-3.5 px-1 text-center"></th>
                <th
                  onClick={() => handleSort('poNumber')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>เลขที่ PO</span>
                    {sortField === 'poNumber' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recordedAt')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>วันที่เอกสาร</span>
                    {sortField === 'recordedAt' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-2">บริษัท</th>
                <th
                  onClick={() => handleSort('vendorName')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>ผู้ขาย (Vendor)</span>
                    {sortField === 'vendorName' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">โครงการ / รายการจัดซื้อ</th>
                <th className="py-3.5 px-3">เครดิต</th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ยอดรวม (บาท)</span>
                    {sortField === 'totalAmount' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center">สถานะรับของ</th>
                <th className="py-3.5 px-3 text-center">สถานะชำระเงิน (AP)</th>
                <th className="py-3.5 pr-4 pl-2 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPos.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span>ไม่พบข้อมูลรายการสั่งซื้อที่ตรงกับเงื่อนไข</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPos.map((po) => {
                  const isExpanded = Boolean(expandedRows[po.id]);
                  const accountingInfo = getAccountingAuditInfo(po);
                  const d = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : null);
                  const dateStr = d ? d.toLocaleDateString('th-TH') : '-';
                  const comp = po.poNumber?.toUpperCase().includes('-E') ? 'TE' : (po.poNumber?.toUpperCase().includes('-P') ? 'TP' : (po.poNumber?.toUpperCase().includes('-G') ? 'TG' : '-'));
                  const compBadge = comp === 'TE'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                    : (comp === 'TP'
                      ? 'bg-teal-50 text-teal-700 border-teal-200/70'
                      : 'bg-purple-50 text-purple-700 border-purple-200/70');

                  return (
                    <React.Fragment key={po.id}>
                      <tr className={`hover:bg-blue-50/30 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                        {/* Multi-select Checkbox */}
                        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {po.receiveStatus !== 'Cancelled' ? (
                            <input
                              type="checkbox"
                              checked={selectedPoNumbers.has(po.poNumber)}
                              onChange={() => handleToggleSelectPo(po.poNumber)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Expand Chevron */}
                        <td className="py-3 px-1 text-center">
                          <button
                            onClick={() => toggleRowExpand(po.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                            title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
                          >
                            <svg className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </button>
                        </td>

                        {/* PO Number & Accounting Modification Badge */}
                        <td className="py-3 px-3 font-semibold">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-blue-700 font-mono font-bold tracking-tight">
                              {po.poNumber}
                            </span>
                            {po.prNumber && (
                              <span className="text-[10px] font-mono text-gray-400 font-normal">
                                / {po.prNumber}
                              </span>
                            )}
                          </div>
                          {accountingInfo.isModified && (
                            <div className="mt-1">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 shadow-2xs cursor-help"
                                title={accountingInfo.latestLog || "มีข้อมูลที่ฝ่ายบัญชีปรับปรุงแก้ไข"}
                              >
                                <FileCheck2 className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span>แก้ไขโดยฝ่ายบัญชี</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Document Date */}
                        <td className="py-3 px-3 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                          {dateStr}
                        </td>

                        {/* Company Badge */}
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${compBadge}`}>
                            {comp}
                          </span>
                        </td>

                        {/* Vendor Name */}
                        <td className="py-3 px-3 text-gray-800 max-w-[180px] truncate font-medium" title={po.vendorName || '-'}>
                          {po.vendorName || '-'}
                        </td>

                        {/* Project & Item Snippet */}
                        <td className="py-3 px-4 max-w-[260px]">
                          <div className="font-semibold text-gray-900 truncate" title={po.jobName || po.purchaseRequest?.projectName || '-'}>
                            {po.jobName || po.purchaseRequest?.projectName || '-'}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate" title={po.itemList || '-'}>
                            {po.itemList || '-'}
                          </div>
                        </td>

                        {/* Credit Term */}
                        <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                          {po.creditTerm && !po.creditTerm.includes('ชื่องาน') && !po.creditTerm.includes('📌') ? po.creditTerm : '-'}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap font-mono text-[13px]">
                          {po.totalAmount !== null && po.totalAmount !== undefined
                            ? Number(po.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '-'}
                        </td>

                        {/* Warehouse Receive Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {po.receiveStatus === 'Cancelled' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              ยกเลิกแล้ว
                            </span>
                          ) : po.receiveStatus === 'Received' ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>รับสินค้าแล้ว</span>
                              </span>
                              {po.receivedBy && (
                                <span 
                                  className="text-[9px] font-medium text-gray-500 mt-0.5 max-w-[130px] truncate"
                                  title={`รับโดย: ${po.receivedBy}${po.receivedAt ? ` เมื่อ ${new Date(po.receivedAt).toLocaleDateString('th-TH')}` : ''}`}
                                >
                                  {po.receivedBy}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>รอรับสินค้า</span>
                            </span>
                          )}
                        </td>

                        {/* AP Financial / Payment Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {(() => {
                            const payStatus = getPOPaymentStatus(po);
                            return (
                              <div className="inline-flex flex-col items-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${payStatus.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${payStatus.dotClass}`}></span>
                                  <span>{payStatus.label}</span>
                                </span>
                                {payStatus.subLabel && (
                                  <span className="text-[10px] font-medium text-gray-500 mt-0.5 font-mono">
                                    {payStatus.subLabel}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 pr-4 pl-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Store-In / Goods Receipt Action */}
                            {po.receiveStatus !== 'Received' && po.receiveStatus !== 'Cancelled' ? (
                              <button
                                onClick={() => openReceiveModal(po)}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-300 hover:border-emerald-600 transition-all inline-flex items-center gap-1 shadow-2xs active:scale-95 group/rcv"
                                title="บันทึกรับสินค้า / ตรวจรับงาน (ส่งตรงหน้างาน, ค่าแรง, สโตร์)"
                              >
                                <PackageCheck className="w-3.5 h-3.5 text-emerald-600 group-hover/rcv:text-white" />
                                <span>รับเข้า</span>
                              </button>
                            ) : po.receiveStatus === 'Received' ? (
                              <button
                                onClick={() => handleRevertReceive(po.poNumber)}
                                disabled={loadingMap[po.poNumber]}
                                className="px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-amber-800 bg-gray-50 hover:bg-amber-50 rounded-lg border border-gray-200 hover:border-amber-300 transition-all inline-flex items-center gap-1 disabled:opacity-50"
                                title="ยกเลิกการตรวจรับ (ปรับกลับเป็นรอรับของ)"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>ยกเลิกรับ</span>
                              </button>
                            ) : null}

                            <button
                              onClick={() => openEditModal(po)}
                              className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-200 hover:border-blue-600 transition-all inline-flex items-center gap-1"
                              title="แก้ไขข้อมูล PO นี้"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                              แก้ไข
                            </button>

                            {po.receiveStatus === 'Cancelled' ? (
                              <button
                                onClick={() => handleRestore(po.poNumber)}
                                disabled={loadingMap[po.poNumber]}
                                className="px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50"
                                title="คืนสถานะกลับมาใช้งาน"
                              >
                                คืนสถานะ
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCancel(po.poNumber)}
                                disabled={loadingMap[po.poNumber]}
                                className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all disabled:opacity-50"
                                title="ยกเลิก PO ในระบบ"
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detail Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/30 border-b border-blue-100">
                          <td colSpan={12} className="px-6 py-4">
                            {/* Accounting Revision Alert Banner */}
                            {accountingInfo.isModified && (
                              <div className="mb-3.5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-200 rounded-xl flex items-start gap-3 shadow-2xs">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-amber-950 text-xs">รายการนี้ได้รับการปรับปรุงข้อมูลโดยฝ่ายบัญชีและการเงิน (Accounting Modified)</span>
                                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md">ซิงค์จากระบบการเงิน AP</span>
                                  </div>
                                  <p className="text-[11px] text-amber-900 whitespace-pre-wrap font-mono leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                                    {accountingInfo.latestLog || po.note}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                              <div>
                                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                  รายการสินค้าทั้งหมด
                                </h4>
                                <p className="text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                  {po.itemList || 'ไม่มีรายการระบุ'}
                                </p>
                              </div>

                              <div>
                                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                  การส่งมอบและบัญชี
                                </h4>
                                <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-gray-700">
                                  <div>
                                    <span className="text-gray-500 font-medium">วันส่งมอบ:</span> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-medium">การรับสินค้า:</span> {po.receiveStatus === 'Received' ? `รับโดย ${po.receivedBy || '-'}` : (po.receiveStatus === 'Cancelled' ? 'ยกเลิก' : 'ยังไม่ได้รับ')}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-medium">เลขบัญชี/เบิก:</span> {po.accountNumber || '-'}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                                  หมายเหตุ / ประวัติแก้ไข
                                </h4>
                                <p className="text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100 max-h-32 overflow-y-auto font-mono text-[11px]">
                                  {po.note || 'ไม่มีหมายเหตุ'}
                                </p>
                              </div>

                              {/* Card 4: Accounts Payable & Payment Details */}
                              <div className="md:col-span-3 border-t border-blue-100/80 pt-3 mt-1">
                                <div className="flex items-center justify-between mb-2.5">
                                  <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                    <span>สถานะการเงินและการจ่ายเงินให้คู่ค้า (Accounts Payable)</span>
                                  </h4>
                                  {(() => {
                                    const payStatus = getPOPaymentStatus(po);
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${payStatus.badgeClass}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${payStatus.dotClass}`}></span>
                                        <span>{payStatus.label}</span>
                                        {payStatus.subLabel && <span className="font-normal opacity-80">({payStatus.subLabel})</span>}
                                      </span>
                                    );
                                  })()}
                                </div>

                                {(!po.supplierPaymentTasks || po.supplierPaymentTasks.length === 0) ? (
                                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 text-center">
                                    ยังไม่มีข้อมูลการตั้งเบิกหรือรอบการจ่ายเงินในระบบบัญชี
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {po.supplierPaymentTasks.map((task: any, idx: number) => {
                                      const isDeposit = task.paymentType === 'DEPOSIT';
                                      const isPaid = task.status === 'PAID_VERIFIED';
                                      const isAwaitingGr = task.status === 'AWAITING_GR';
                                      const isDeferred = task.note && task.note.includes('[เลื่อนชำระ');
                                      const isOverdue = !isPaid && task.status !== 'CANCELLED' && task.dueDate && new Date(task.dueDate) < new Date();

                                      return (
                                        <div
                                          key={task.id || idx}
                                          className={`p-3 rounded-xl border transition-all ${
                                            isPaid
                                              ? 'bg-emerald-50/40 border-emerald-200'
                                              : isDeferred
                                              ? 'bg-amber-50/40 border-amber-200'
                                              : isOverdue
                                              ? 'bg-rose-50/40 border-rose-200'
                                              : isAwaitingGr
                                              ? 'bg-orange-50/40 border-orange-200'
                                              : 'bg-blue-50/30 border-blue-200'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5 mb-2">
                                            <span className="font-bold text-gray-800 text-xs">
                                              {isDeposit ? 'งวดที่ 1: เงินมัดจำล่วงหน้า (Deposit)' : 'งวดที่ 2: ยอดจ่ายคงเหลือ (Final Balance)'}
                                            </span>
                                            <span
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                isPaid
                                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                  : isDeferred
                                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                  : isOverdue
                                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                                  : isAwaitingGr
                                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                                              }`}
                                            >
                                              {isPaid ? 'จ่ายเงินแล้ว' : isDeferred ? 'เลื่อนนัดชำระ' : isOverdue ? 'เกินกำหนด' : isAwaitingGr ? 'รอตรวจรับของ (Hold)' : 'รอจ่ายเงิน'}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                            <div>
                                              <span className="text-gray-500">ยอดตามเอกสาร:</span>{' '}
                                              <span className="font-mono font-bold text-gray-900">
                                                ฿{Number(task.grossAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">หัก ณ ที่จ่าย ({Number(task.whtPercent || 0)}%):</span>{' '}
                                              <span className="font-mono text-gray-700">
                                                ฿{Number(task.whtAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500 font-semibold">ยอดจ่ายสุทธิ:</span>{' '}
                                              <span className="font-mono font-bold text-blue-700">
                                                ฿{Number(task.netPayableAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">วันครบกำหนด:</span>{' '}
                                              <span className="font-mono font-semibold text-gray-800">
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : '-'}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Paid Details */}
                                          {isPaid && (
                                            <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] bg-emerald-100/50 p-2 rounded-lg text-emerald-900 space-y-0.5 font-mono">
                                              <div className="font-bold flex items-center gap-1 text-emerald-800">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>จ่ายเงินเรียบร้อยเมื่อ: {task.paidDate ? new Date(task.paidDate).toLocaleDateString('th-TH') : '-'}</span>
                                              </div>
                                              <div>ยอดโอน: ฿{Number(task.paidAmount || task.netPayableAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ผ่าน {task.paidFromBankCode || 'ธนาคาร'}</div>
                                              {task.bankReferenceNumber && <div>เลขอ้างอิงสลิป: {task.bankReferenceNumber}</div>}
                                              {task.whtCertNumber && <div>หนังสือรับรอง 50 ทวิ: {task.whtCertNumber}</div>}
                                            </div>
                                          )}

                                          {/* Cheque Details if Cheque PDC */}
                                          {!isPaid && task.paymentMethod === 'CHEQUE_PDC' && (
                                            <div className="mt-2 pt-2 border-t border-blue-200/60 text-[11px] bg-blue-100/40 p-2 rounded-lg text-blue-900">
                                              <span className="font-bold">ชำระด้วยเช็ค PDC:</span> เลขที่ {task.chequeNumber || '-'} | กำหนดหน้าเช็ค {task.chequeDueDate ? new Date(task.chequeDueDate).toLocaleDateString('th-TH') : '-'}
                                            </div>
                                          )}

                                          {/* Deferral or Task Notes */}
                                          {task.note && (
                                            <div className="mt-2 pt-1.5 border-t border-gray-200/60 text-[10px] text-gray-600 font-mono whitespace-pre-line leading-relaxed">
                                              <span className="font-semibold text-gray-500 block">บันทึกจากฝ่ายการเงิน:</span>
                                              {task.note}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="block md:hidden divide-y divide-gray-100">
          {paginatedPos.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">ไม่พบข้อมูล</div>
          ) : (
            paginatedPos.map(po => {
              const isExpanded = Boolean(expandedRows[po.id]);
              const accountingInfo = getAccountingAuditInfo(po);
              const d = po.recordedAt ? new Date(po.recordedAt) : (po.createdAt ? new Date(po.createdAt) : null);
              const dateStr = d ? d.toLocaleDateString('th-TH') : '-';
              const comp = po.poNumber?.toUpperCase().includes('-E') ? 'TE' : (po.poNumber?.toUpperCase().includes('-P') ? 'TP' : (po.poNumber?.toUpperCase().includes('-G') ? 'TG' : '-'));

              return (
                <div key={po.id} className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-900 text-sm font-mono">{po.poNumber}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                        {comp}
                      </span>
                      {po.prNumber && (
                        <span className="block text-[11px] text-gray-400 font-mono">
                          PR: {po.prNumber}
                        </span>
                      )}
                      {accountingInfo.isModified && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 shadow-2xs"
                            title={accountingInfo.latestLog || "มีข้อมูลที่ฝ่ายบัญชีปรับปรุงแก้ไข"}
                          >
                            <FileCheck2 className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span>แก้ไขโดยฝ่ายบัญชี</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${po.receiveStatus === 'Cancelled'
                        ? 'bg-gray-100 text-gray-600'
                        : po.receiveStatus === 'Received'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                        {po.receiveStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : (po.receiveStatus === 'Received' ? 'รับแล้ว' : 'รอรับสินค้า')}
                      </span>
                      {(() => {
                        const payStatus = getPOPaymentStatus(po);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${payStatus.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${payStatus.dotClass}`}></span>
                            <span>{payStatus.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1">
                    <div><span className="text-gray-500 font-medium">วันที่:</span> {dateStr}</div>
                    <div><span className="text-gray-500 font-medium">ผู้ขาย:</span> {po.vendorName || '-'}</div>
                    <div><span className="text-gray-500 font-medium">โครงการ:</span> {po.jobName || po.purchaseRequest?.projectName || '-'}</div>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">ยอดรวม:</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {po.totalAmount ? Number(po.totalAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                    {po.receiveStatus !== 'Received' && po.receiveStatus !== 'Cancelled' ? (
                      <button
                        onClick={() => openReceiveModal(po)}
                        className="flex-1 text-[11px] py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>รับเข้า</span>
                      </button>
                    ) : po.receiveStatus === 'Received' ? (
                      <button
                        onClick={() => handleRevertReceive(po.poNumber)}
                        disabled={loadingMap[po.poNumber]}
                        className="flex-1 text-[11px] py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>ยกเลิกรับ</span>
                      </button>
                    ) : null}

                    <button
                      onClick={() => toggleRowExpand(po.id)}
                      className="flex-1 text-[11px] py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      {isExpanded ? 'ย่อ' : 'รายละเอียด'}
                    </button>
                    <button
                      onClick={() => openEditModal(po)}
                      className="flex-1 text-[11px] py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium transition-colors"
                    >
                      แก้ไข
                    </button>
                    {po.receiveStatus === 'Cancelled' ? (
                      <button
                        onClick={() => handleRestore(po.poNumber)}
                        disabled={loadingMap[po.poNumber]}
                        className="flex-1 text-[11px] py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium"
                      >
                        คืนสถานะ
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancel(po.poNumber)}
                        disabled={loadingMap[po.poNumber]}
                        className="flex-1 text-[11px] py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-medium"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-2 text-gray-600 mt-2 border border-gray-100">
                      {accountingInfo.isModified && (
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[11px] text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>แก้ไขโดยฝ่ายบัญชีและการเงิน</span>
                            </span>
                            <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-semibold">AP Synced</span>
                          </div>
                          <p className="text-[10px] whitespace-pre-wrap font-mono bg-white/90 p-2 rounded border border-amber-200/60 leading-relaxed">
                            {accountingInfo.latestLog || po.note}
                          </p>
                        </div>
                      )}
                      <div><span className="font-semibold text-gray-700">รายการ:</span> {po.itemList || '-'}</div>
                      <div><span className="font-semibold text-gray-700">เครดิต:</span> {po.creditTerm || '-'}</div>
                      <div><span className="font-semibold text-gray-700">วันส่งมอบ:</span> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}</div>
                      <div><span className="font-semibold text-gray-700">เลขบัญชี:</span> {po.accountNumber || '-'}</div>
                      {po.note && (
                        <div><span className="font-semibold text-gray-700">หมายเหตุ:</span> {po.note}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 bg-gray-50/40 gap-3">
          <span>
            แสดง <b>{paginatedPos.length}</b> จาก <b>{sortedPos.length}</b> รายการ (หน้า {currentPage} จาก {totalPages})
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1.5 border rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              « แรกสุด
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ‹ ก่อนหน้า
            </button>
            <span className="px-3 py-1.5 font-bold text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm">
              หน้า {currentPage}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ถัดไป ›
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1.5 border rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ท้ายสุด »
            </button>
          </div>
        </div>
      </div>

      {/* Edit PO Modal */}
      {editingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/80 sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>แก้ไขข้อมูล PO</span>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                    {editingPO.poNumber}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบบจะบันทึกเขียนทับข้อมูลเดิมในระบบทันที พร้อมบันทึกประวัติแก้ไข
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPO(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl p-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
              {/* Financial Status Alert Banner */}
              {(() => {
                const payStatus = getPOPaymentStatus(editingPO);
                if (payStatus.type === 'PAID') {
                  return (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">ฝ่ายการเงินจ่ายเงินเรียบร้อยแล้ว:</span>{' '}
                        {payStatus.subLabel || 'ชำระครบถ้วนแล้ว'}
                      </div>
                    </div>
                  );
                }
                if (payStatus.type === 'DEFERRED') {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
                      <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">ฝ่ายการเงินมีการเลื่อนนัดชำระ:</span>{' '}
                        {payStatus.subLabel || 'โปรดตรวจสอบประวัติในรายละเอียด'}
                      </div>
                    </div>
                  );
                }
                if (payStatus.type === 'PENDING') {
                  return (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold">สถานะการเงิน:</span>{' '}
                        {payStatus.label} {payStatus.subLabel ? `(${payStatus.subLabel})` : ''}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    เลขที่ PO <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.poNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, poNumber: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all font-mono"
                    placeholder="เช่น PO69-E010101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    อ้างอิง PR
                  </label>
                  <input
                    type="text"
                    value={editForm.prNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, prNumber: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all font-mono"
                    placeholder="เช่น PR69-E010101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ผู้ขาย (Vendor)
                  </label>
                  <input
                    type="text"
                    value={editForm.vendorName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vendorName: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="ชื่อผู้ขาย / บริษัท"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ยอดรวมจัดซื้อ (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.totalAmount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    เครดิตเทอม
                  </label>
                  <input
                    type="text"
                    value={editForm.creditTerm}
                    onChange={(e) => setEditForm(prev => ({ ...prev, creditTerm: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="เช่น เงินสด, 30 วัน"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    วันส่งมอบ
                  </label>
                  <input
                    type="date"
                    value={editForm.deliveryDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  โปรเจกต์ / ชื่องาน
                </label>
                <input
                  type="text"
                  value={editForm.jobName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, jobName: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="เช่น งานกรมการข้าว, งานโซลาร์ตรอน"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  rows={3}
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all font-mono"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                <span>
                  การบันทึกจะเป็นการ<b>เขียนทับข้อมูลเดิมโดยตรง</b>ในฐานข้อมูล และสร้างบันทึกประวัติการแก้ไขในหมายเหตุอัตโนมัติ
                </span>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingPO(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isSavingEdit ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกข้อมูล (เขียนทับเดิม)'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single PO Store-In (Goods Receipt) Modal */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl">
                  <PackageCheck className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-base">บันทึกรับสินค้า / ตรวจรับงาน (Store-In)</h3>
                  <p className="text-xs text-emerald-100">ฝ่ายจัดซื้อบันทึกรับเข้าคลัง หรือส่งมอบตรงหน้างาน / ค่าแรง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4">
              {/* PO Summary Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">เลขที่ PO:</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{receivingPO.poNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">ผู้ขาย:</span>
                  <span className="font-semibold text-gray-800 truncate max-w-[260px]">{receivingPO.vendorName || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">โครงการ / ชื่องาน:</span>
                  <span className="font-medium text-gray-800 truncate max-w-[260px]">{receivingPO.jobName || receivingPO.purchaseRequest?.projectName || '-'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-gray-500">ยอดรวมทั้งสิ้น:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {receivingPO.totalAmount ? Number(receivingPO.totalAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                  </span>
                </div>
                {receivingPO.itemList && (
                  <div className="pt-1 text-[11px] text-gray-500 truncate" title={receivingPO.itemList}>
                    รายการ: {receivingPO.itemList}
                  </div>
                )}
              </div>

              {/* Receipt Category Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ประเภทการรับสินค้า / ส่งมอบ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DIRECT_SITE', label: 'ส่งตรงหน้างาน', desc: 'ส่งถึงไซต์งาน ไม่ผ่านสโตร์', icon: Truck, color: 'text-purple-600' },
                    { id: 'LABOR_SERVICE', label: 'ค่าแรง / งานบริการ', desc: 'งานช่าง จ้างเหมา ติดตั้ง', icon: Wrench, color: 'text-teal-600' },
                    { id: 'WAREHOUSE', label: 'เข้าสโตร์กลาง', desc: 'เข้าคลังสินค้าบริษัท', icon: Warehouse, color: 'text-blue-600' },
                    { id: 'OTHER', label: 'อื่นๆ / พิเศษ', desc: 'ระบุในหมายเหตุ', icon: Package, color: 'text-gray-600' },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSel = receiveForm.receiptType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setReceiveForm(prev => ({ ...prev, receiptType: cat.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSel
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                          <span>{cat.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{cat.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Receiver Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ชื่อผู้ตรวจรับ / ผู้รับมอบงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={receiveForm.receivedBy}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, receivedBy: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-all font-medium"
                  placeholder="ระบุชื่อผู้ตรวจรับสินค้า หรือวิศวกรผู้คุมงานหน้างาน"
                />
                {/* Quick autofill chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-400">เลือกด่วน:</span>
                  {currentUser?.fullName && (
                    <button
                      type="button"
                      onClick={() => setReceiveForm(prev => ({ ...prev, receivedBy: currentUser.fullName! }))}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 font-medium transition-colors"
                    >
                      👤 ฉันเอง ({currentUser.fullName})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setReceiveForm(prev => ({ ...prev, receivedBy: 'วิศวกร/ผู้ควบคุมงานหน้างาน' }))}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 font-medium transition-colors"
                  >
                    👷 วิศวกรหน้างาน
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiveForm(prev => ({ ...prev, receivedBy: 'ช่างประจำโครงการ' }))}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 font-medium transition-colors"
                  >
                    🔧 ช่างประจำโครงการ
                  </button>
                </div>
              </div>

              {/* Date of Receipt */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  วันที่ตรวจรับ / ส่งมอบ
                </label>
                <input
                  type="date"
                  value={receiveForm.receivedAt}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, receivedAt: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-all"
                />
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  หมายเหตุ / เลขที่ใบส่งของหน้างาน (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={receiveForm.note}
                  onChange={(e) => setReceiveForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-all font-mono"
                  placeholder="เช่น ใบส่งของเลขที่ DO-6701, ตรวจรับงานงวดที่ 1 ผ่านเรียบร้อย"
                />
              </div>

              {/* AP Auto Unlock Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ระบบจะปลดล็อกรอบการจ่ายเงิน (AP) อัตโนมัติ:</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    รายการชำระเงินที่รอตรวจรับ (AWAITING_GR) จะถูกเปลี่ยนสถานะเป็นพร้อมจ่าย (PENDING) เพื่อให้ฝ่ายการเงินดำเนินการต่อได้ทันที
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReceivingPO(null)}
                  disabled={isSubmittingReceive}
                  className="px-4 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceive}
                  className="px-5 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isSubmittingReceive ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <PackageCheck size={15} />
                      ยืนยันตรวจรับเข้า (Store-In)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Select Batch Store-In Modal */}
      {isBatchReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">บันทึกตรวจรับเข้าพร้อมกัน ({selectedPoNumbers.size} ใบ)</h3>
                  <p className="text-xs text-blue-200">ตรวจรับ PO หลายใบเข้าสโตร์หรือส่งตรงหน้างานในครั้งเดียว</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchReceiveModalOpen(false)}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmBatchReceive} className="p-6 space-y-4">
              {/* Selected PO Chips Preview */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  รายการ PO ที่เลือก ({selectedPoNumbers.size} รายการ):
                </label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 max-h-24 overflow-y-auto flex flex-wrap gap-1.5">
                  {Array.from(selectedPoNumbers).map((poNum) => (
                    <span key={poNum} className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-blue-700">
                      {poNum}
                    </span>
                  ))}
                </div>
              </div>

              {/* Receipt Category Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ประเภทการรับสินค้า / ส่งมอบ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DIRECT_SITE', label: 'ส่งตรงหน้างาน', desc: 'ส่งถึงไซต์งาน ไม่ผ่านสโตร์', icon: Truck, color: 'text-purple-600' },
                    { id: 'LABOR_SERVICE', label: 'ค่าแรง / งานบริการ', desc: 'งานช่าง จ้างเหมา ติดตั้ง', icon: Wrench, color: 'text-teal-600' },
                    { id: 'WAREHOUSE', label: 'เข้าสโตร์กลาง', desc: 'เข้าคลังสินค้าบริษัท', icon: Warehouse, color: 'text-blue-600' },
                    { id: 'OTHER', label: 'อื่นๆ / พิเศษ', desc: 'ระบุในหมายเหตุ', icon: Package, color: 'text-gray-600' },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSel = batchReceiveForm.receiptType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setBatchReceiveForm(prev => ({ ...prev, receiptType: cat.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSel
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                          <span>{cat.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{cat.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Receiver Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ชื่อผู้ตรวจรับ / ผู้รับมอบงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={batchReceiveForm.receivedBy}
                  onChange={(e) => setBatchReceiveForm(prev => ({ ...prev, receivedBy: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-all font-medium"
                  placeholder="ระบุชื่อผู้ตรวจรับสินค้า หรือวิศวกรผู้คุมงานหน้างาน"
                />
                {/* Quick autofill chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-400">เลือกด่วน:</span>
                  {currentUser?.fullName && (
                    <button
                      type="button"
                      onClick={() => setBatchReceiveForm(prev => ({ ...prev, receivedBy: currentUser.fullName! }))}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 font-medium transition-colors"
                    >
                      👤 ฉันเอง ({currentUser.fullName})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBatchReceiveForm(prev => ({ ...prev, receivedBy: 'วิศวกร/ผู้ควบคุมงานหน้างาน' }))}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 font-medium transition-colors"
                  >
                    👷 วิศวกรหน้างาน
                  </button>
                </div>
              </div>

              {/* Date of Receipt */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  วันที่ตรวจรับ / ส่งมอบ
                </label>
                <input
                  type="date"
                  value={batchReceiveForm.receivedAt}
                  onChange={(e) => setBatchReceiveForm(prev => ({ ...prev, receivedAt: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-all"
                />
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={batchReceiveForm.note}
                  onChange={(e) => setBatchReceiveForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-all font-mono"
                  placeholder="เช่น ตรวจรับงานติดตั้งประจำงวด"
                />
              </div>

              {/* AP Auto Unlock Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ระบบจะปลดล็อกรอบการจ่ายเงิน (AP) ของทุกใบที่เลือก:</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    ทุกใบที่อยู่ในสถานะรอตรวจรับจะเปลี่ยนเป็นพร้อมจ่ายทันที
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBatchReceiveModalOpen(false)}
                  disabled={isSubmittingBatchReceive}
                  className="px-4 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatchReceive}
                  className="px-5 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isSubmittingBatchReceive ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      กำลังบันทึก {selectedPoNumbers.size} ใบ...
                    </>
                  ) : (
                    <>
                      <PackageCheck size={15} />
                      ยืนยันรับเข้า {selectedPoNumbers.size} ใบ
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
