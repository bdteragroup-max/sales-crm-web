'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  PackageCheck,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  RotateCcw,
  Calendar,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  CheckSquare,
  Square,
  Eye,
  Info,
  Copy,
  ExternalLink,
  User,
  Warehouse,
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import Swal from 'sweetalert2';

interface POItem {
  id: number;
  no?: number | null;
  recordedAt?: string | Date | null;
  prNumber?: string | null;
  poNumber: string;
  vendorName?: string | null;
  accountNumber?: string | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  payment1?: number | null;
  creditTerm?: string | null;
  jobName?: string | null;
  itemList?: string | null;
  deliveryDate?: string | Date | null;
  note?: string | null;
  reportedBy?: string | null;
  receiveStatus?: string | null;
  receivedBy?: string | null;
  receivedAt?: string | Date | null;
  createdAt?: string | Date | null;
  projectName?: string | null;
  prRequestedBy?: string | null;
}

interface StoreReceiveClientProps {
  initialPos: POItem[];
  initialReceivedPos: POItem[];
  userName: string;
}

export default function StoreReceiveClient({
  initialPos,
  initialReceivedPos,
  userName
}: StoreReceiveClientProps) {
  const router = useRouter();

  // Primary Data State
  const [pos, setPos] = useState<POItem[]>(initialPos);
  const [receivedPos, setReceivedPos] = useState<POItem[]>(initialReceivedPos);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'received'>('pending');

  // Multi-select state for batch receiving
  const [selectedPoNumbers, setSelectedPoNumbers] = useState<Set<string>>(new Set());
  const [isBatchReceiving, setIsBatchReceiving] = useState(false);

  // Detail Modal State
  const [detailPo, setDetailPo] = useState<POItem | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'TE' | 'TP' | 'TG'>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Helper: Extract company from PO Number
  const getCompanyFromPO = (poNumber: string = ''): 'TE' | 'TP' | 'TG' | 'OTHER' => {
    const upper = poNumber.toUpperCase();
    if (upper.includes('-E')) return 'TE';
    if (upper.includes('-P')) return 'TP';
    if (upper.includes('-G')) return 'TG';
    return 'OTHER';
  };

  const getCompanyBadge = (comp: string) => {
    switch (comp) {
      case 'TE':
        return { label: 'TE (Tera Electric)', short: 'TE', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'TP':
        return { label: 'TP (Tera Power)', short: 'TP', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'TG':
        return { label: 'TG (Tera Group)', short: 'TG', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'ทั่วไป', short: 'OTHER', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Helper: Delivery Status & Days Overdue/Remaining
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

  // Helper: Format Currency
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper: Retroactive/Site Receipt Check
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

  // Unique Years for dropdown
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    const all = [...pos, ...receivedPos];
    all.forEach(po => {
      if (po.deliveryDate) {
        years.add(new Date(po.deliveryDate).getFullYear().toString());
      }
      if (po.receivedAt) {
        years.add(new Date(po.receivedAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [pos, receivedPos]);

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

  // Top KPI Metrics
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let dueTodayCount = 0;
    let totalPendingValue = 0;

    pos.forEach(po => {
      totalPendingValue += po.totalAmount || 0;
      const status = getDeliveryStatus(po.deliveryDate);
      if (status.status === 'overdue') overdueCount++;
      if (status.status === 'today') dueTodayCount++;
    });

    return {
      pendingCount: pos.length,
      overdueCount,
      dueTodayCount,
      totalPendingValue,
      receivedCount: receivedPos.length
    };
  }, [pos, receivedPos]);

  // Company Counts for Pending
  const companyCounts = useMemo(() => {
    const counts = { ALL: pos.length, TE: 0, TP: 0, TG: 0 };
    pos.forEach(po => {
      const c = getCompanyFromPO(po.poNumber);
      if (c === 'TE') counts.TE++;
      if (c === 'TP') counts.TP++;
      if (c === 'TG') counts.TG++;
    });
    return counts;
  }, [pos]);

  // Filter Engine for Pending POs
  const filteredPending = useMemo(() => {
    return pos.filter(po => {
      // 1. Company
      if (companyFilter !== 'ALL') {
        const comp = getCompanyFromPO(po.poNumber);
        if (comp !== companyFilter) return false;
      }

      // 2. Urgency
      if (urgencyFilter !== 'ALL') {
        const status = getDeliveryStatus(po.deliveryDate);
        if (urgencyFilter === 'OVERDUE' && status.status !== 'overdue') return false;
        if (urgencyFilter === 'TODAY' && status.status !== 'today') return false;
        if (urgencyFilter === 'UPCOMING' && status.status !== 'upcoming') return false;
      }

      // 3. Date / Month / Year
      const d = po.deliveryDate ? new Date(po.deliveryDate) : null;
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
  }, [pos, companyFilter, urgencyFilter, dateFilter, monthFilter, yearFilter, searchQuery]);

  // Filter Engine for Received POs
  const filteredReceived = useMemo(() => {
    return receivedPos.filter(po => {
      // 1. Company
      if (companyFilter !== 'ALL') {
        const comp = getCompanyFromPO(po.poNumber);
        if (comp !== companyFilter) return false;
      }

      // 2. Date / Month / Year (Filter based on receivedAt)
      const d = po.receivedAt ? new Date(po.receivedAt) : null;
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

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
  }, [receivedPos, companyFilter, dateFilter, monthFilter, yearFilter, searchQuery]);

  // Current active list & pagination
  const currentList = activeTab === 'pending' ? filteredPending : filteredReceived;
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  // Reset pagination on filter or tab change
  const handleTabChange = (tab: 'pending' | 'received') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedPoNumbers(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCompanyFilter('ALL');
    setUrgencyFilter('ALL');
    setDateFilter('');
    setMonthFilter('ALL');
    setYearFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    companyFilter !== 'ALL' ||
    urgencyFilter !== 'ALL' ||
    dateFilter !== '' ||
    monthFilter !== 'ALL' ||
    yearFilter !== 'ALL';

  // Checkbox toggle helpers
  const handleToggleSelect = (poNumber: string) => {
    setSelectedPoNumbers(prev => {
      const next = new Set(prev);
      if (next.has(poNumber)) {
        next.delete(poNumber);
      } else {
        next.add(poNumber);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPage = () => {
    if (selectedPoNumbers.size === paginatedList.length && paginatedList.length > 0) {
      setSelectedPoNumbers(new Set());
    } else {
      const next = new Set(selectedPoNumbers);
      paginatedList.forEach(po => next.add(po.poNumber));
      setSelectedPoNumbers(next);
    }
  };

  // Copy PO Number helper
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

  // Action: Single Receive into Store
  const handleReceiveStore = async (po: POItem) => {
    const result = await Swal.fire({
      title: 'ตรวจรับสินค้าเข้าสโตร์',
      html: `
        <div class="text-left text-sm space-y-2 mt-2">
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div><span class="text-gray-500">เลขที่ PO:</span> <span class="font-bold text-gray-900">${po.poNumber}</span></div>
            <div><span class="text-gray-500">ผู้ขาย:</span> <span class="font-semibold text-gray-800">${po.vendorName || '-'}</span></div>
            <div><span class="text-gray-500">โครงการ:</span> <span class="text-gray-800">${po.projectName || '-'}</span></div>
            <div class="truncate text-xs text-gray-600 mt-1">${po.itemList || '-'}</div>
          </div>
          <div class="mt-3">
            <label class="block text-xs font-semibold text-gray-700 mb-1">ชื่อผู้ตรวจรับเข้าสโตร์</label>
            <input id="swal-receiver-input" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value="${userName || 'เจ้าหน้าที่สโตร์'}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันตรวจรับเข้าสโตร์',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById('swal-receiver-input') as HTMLInputElement;
        if (!input || !input.value.trim()) {
          Swal.showValidationMessage('กรุณาระบุชื่อผู้ตรวจรับ');
          return false;
        }
        return input.value.trim();
      }
    });

    if (!result.isConfirmed || !result.value) return;

    const finalReceiver = result.value;
    setLoadingMap(prev => ({ ...prev, [po.poNumber]: true }));

    try {
      const res = await fetch(`/api/store/receive/${encodeURIComponent(po.poNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedBy: finalReceiver })
      });

      if (res.ok) {
        const nowIso = new Date().toISOString();
        const updatedItem: POItem = {
          ...po,
          receiveStatus: 'Received',
          receivedBy: finalReceiver,
          receivedAt: nowIso
        };
        setPos(prev => prev.filter(p => p.poNumber !== po.poNumber));
        setReceivedPos(prev => [updatedItem, ...prev]);
        setSelectedPoNumbers(prev => {
          const next = new Set(prev);
          next.delete(po.poNumber);
          return next;
        });

        if (detailPo?.poNumber === po.poNumber) {
          setDetailPo(null);
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `ตรวจรับ PO ${po.poNumber} เข้าสโตร์สำเร็จ`,
          showConfirmButton: false,
          timer: 2000
        });

        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire({
          icon: 'error',
          title: 'อัปเดตไม่สำเร็จ',
          text: errData.error || 'เกิดข้อผิดพลาดในการบันทึกการรับสินค้า'
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
      setLoadingMap(prev => ({ ...prev, [po.poNumber]: false }));
    }
  };

  // Action: Single Site / Retroactive Receive
  const handleReceiveSite = async (po: POItem) => {
    const result = await Swal.fire({
      title: 'บันทึกรับสินค้าที่หน้างาน (ย้อนหลัง)',
      html: `
        <div class="text-left text-sm space-y-2 mt-2">
          <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div class="text-amber-800 font-semibold mb-1">สินค้าถูกส่งมอบหรือรับที่หน้างานโดยตรง</div>
            <div class="text-xs text-amber-700">การดำเนินการนี้จะเปลี่ยนสถานะเป็น "รับสินค้าแล้ว" โดยระบุว่าเป็นรายการรับที่หน้างาน/เปิด PO ย้อนหลัง</div>
          </div>
          <div class="mt-2 text-xs text-gray-600">
            <div><span class="text-gray-500">เลขที่ PO:</span> <span class="font-bold text-gray-900">${po.poNumber}</span></div>
            <div><span class="text-gray-500">ผู้ขาย:</span> <span class="font-medium text-gray-800">${po.vendorName || '-'}</span></div>
            <div><span class="text-gray-500">โครงการ:</span> <span class="font-medium text-gray-800">${po.projectName || '-'}</span></div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันรับเข้าหน้างาน',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    const siteReceiver = 'รับเข้าหน้างานแล้ว (เปิด PO ย้อนหลัง)';
    setLoadingMap(prev => ({ ...prev, [po.poNumber]: true }));

    try {
      const res = await fetch(`/api/store/receive/${encodeURIComponent(po.poNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedBy: siteReceiver })
      });

      if (res.ok) {
        const nowIso = new Date().toISOString();
        const updatedItem: POItem = {
          ...po,
          receiveStatus: 'Received',
          receivedBy: siteReceiver,
          receivedAt: nowIso
        };
        setPos(prev => prev.filter(p => p.poNumber !== po.poNumber));
        setReceivedPos(prev => [updatedItem, ...prev]);
        setSelectedPoNumbers(prev => {
          const next = new Set(prev);
          next.delete(po.poNumber);
          return next;
        });

        if (detailPo?.poNumber === po.poNumber) {
          setDetailPo(null);
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `บันทึกรับหน้างาน PO ${po.poNumber} สำเร็จ`,
          showConfirmButton: false,
          timer: 2000
        });

        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire({
          icon: 'error',
          title: 'อัปเดตไม่สำเร็จ',
          text: errData.error || 'เกิดข้อผิดพลาดในการบันทึกการรับสินค้า'
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
      setLoadingMap(prev => ({ ...prev, [po.poNumber]: false }));
    }
  };

  // Action: Batch Receive into Store
  const handleBatchReceive = async () => {
    if (selectedPoNumbers.size === 0) return;

    const selectedList = pos.filter(po => selectedPoNumbers.has(po.poNumber));
    const totalAmount = selectedList.reduce((acc, po) => acc + (po.totalAmount || 0), 0);

    const result = await Swal.fire({
      title: `ตรวจรับสินค้าเข้าสโตร์ ${selectedPoNumbers.size} รายการ`,
      html: `
        <div class="text-left text-sm space-y-3 mt-2">
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>จำนวนที่เลือก:</span>
              <span class="font-bold text-gray-900">${selectedPoNumbers.size} รายการ</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500">
              <span>มูลค่ารวม:</span>
              <span class="font-bold text-emerald-700">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">ชื่อผู้ตรวจรับเข้าสโตร์</label>
            <input id="swal-batch-receiver" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value="${userName || 'เจ้าหน้าที่สโตร์'}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: `ยืนยันตรวจรับทั้งหมด (${selectedPoNumbers.size} รายการ)`,
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById('swal-batch-receiver') as HTMLInputElement;
        if (!input || !input.value.trim()) {
          Swal.showValidationMessage('กรุณาระบุชื่อผู้ตรวจรับ');
          return false;
        }
        return input.value.trim();
      }
    });

    if (!result.isConfirmed || !result.value) return;

    const finalReceiver = result.value;
    setIsBatchReceiving(true);

    try {
      const nowIso = new Date().toISOString();
      const poArray = Array.from(selectedPoNumbers);

      // Execute parallel updates
      await Promise.all(
        poArray.map(poNumber =>
          fetch(`/api/store/receive/${encodeURIComponent(poNumber)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receivedBy: finalReceiver })
          })
        )
      );

      // Update state locally
      const updatedReceived = selectedList.map(po => ({
        ...po,
        receiveStatus: 'Received',
        receivedBy: finalReceiver,
        receivedAt: nowIso
      }));

      setPos(prev => prev.filter(po => !selectedPoNumbers.has(po.poNumber)));
      setReceivedPos(prev => [...updatedReceived, ...prev]);
      setSelectedPoNumbers(new Set());

      Swal.fire({
        icon: 'success',
        title: 'ตรวจรับเข้าสโตร์สำเร็จ',
        text: `บันทึกรับเข้าสโตร์เรียบร้อยแล้ว ${poArray.length} รายการ`,
        timer: 2000,
        showConfirmButton: false
      });

      router.refresh();
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'บางรายการอาจยังไม่ถูกบันทึก กรุณารีเฟรชหน้าเว็บ'
      });
    } finally {
      setIsBatchReceiving(false);
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
            <span className="text-slate-800 font-semibold">ตรวจรับสินค้าเข้าสโตร์ (Goods Receiving)</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            ตรวจรับสินค้าเข้าสโตร์และคลัง
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกรับสินค้า ตรวจสอบกำหนดส่งมอบ และคัดแยกการรับเข้าคลังหรือรับตรงหน้างาน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>ผู้ตรวจรับ: <span className="font-semibold text-slate-900">{userName || 'เจ้าหน้าที่สโตร์'}</span></span>
          </div>

          <Link
            href="/store/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-sm transition-all"
          >
            <Warehouse className="w-4 h-4 text-slate-500" />
            <span>ภาพรวมสโตร์</span>
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
        {/* Card 1: Pending Total */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setUrgencyFilter('ALL');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'pending' && urgencyFilter === 'ALL'
              ? 'border-blue-400 ring-2 ring-blue-100'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รอรับเข้าสโตร์ทั้งหมด</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {metrics.pendingCount.toLocaleString()} <span className="text-sm font-normal text-slate-500">รายการ</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
              <span>มูลค่ารวม:</span>
              <span className="font-semibold text-slate-700">{formatCurrency(metrics.totalPendingValue)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Delivery */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setUrgencyFilter('OVERDUE');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'pending' && urgencyFilter === 'OVERDUE'
              ? 'border-rose-400 ring-2 ring-rose-100'
              : 'border-slate-200/80 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">เกินกำหนดส่ง (Overdue)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
              {metrics.overdueCount.toLocaleString()} <span className="text-sm font-normal text-rose-400">รายการ</span>
            </div>
            <div className="text-xs text-rose-500 mt-1 font-medium">
              คลิกเพื่อดูรายการที่ต้องเร่งติดตามผู้ขาย
            </div>
          </div>
        </div>

        {/* Card 3: Due Today */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setUrgencyFilter('TODAY');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'pending' && urgencyFilter === 'TODAY'
              ? 'border-amber-400 ring-2 ring-amber-100'
              : 'border-slate-200/80 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">กำหนดส่งวันนี้ (Due Today)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              {metrics.dueTodayCount.toLocaleString()} <span className="text-sm font-normal text-amber-400">รายการ</span>
            </div>
            <div className="text-xs text-amber-600/80 mt-1 font-medium">
              สินค้าที่คาดว่าจะเข้าคลังวันนี้
            </div>
          </div>
        </div>

        {/* Card 4: Received History */}
        <div
          onClick={() => {
            setActiveTab('received');
            setUrgencyFilter('ALL');
            setCurrentPage(1);
          }}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            activeTab === 'received'
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200/80 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">รับเข้าแล้ว (History)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              {metrics.receivedCount.toLocaleString()} <span className="text-sm font-normal text-emerald-400">รายการ</span>
            </div>
            <div className="text-xs text-emerald-600/80 mt-1 font-medium">
              ประวัติการตรวจรับเข้าคลังล่าสุด
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Company Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        {/* Row 1: Company Selector Pills */}
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

          {/* Tab Switcher Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabChange('pending')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>รอตรวจรับ ({filteredPending.length})</span>
            </button>
            <button
              onClick={() => handleTabChange('received')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'received'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>รับเข้าแล้ว ({filteredReceived.length})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search & Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา PO, PR, ชื่อผู้ขาย, โครงการ หรือรายการสินค้า..."
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

          {/* Urgency Presets (Pending only) */}
          {activeTab === 'pending' && (
            <div className="md:col-span-3">
              <select
                value={urgencyFilter}
                onChange={e => {
                  setUrgencyFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">กำหนดส่งมอบ: ทั้งหมด</option>
                <option value="OVERDUE">เกินกำหนดส่ง (Overdue)</option>
                <option value="TODAY">กำหนดส่งวันนี้ (Due Today)</option>
                <option value="UPCOMING">ภายใน 7 วัน (Next 7 Days)</option>
              </select>
            </div>
          )}

          {/* Month Filter */}
          <div className={activeTab === 'pending' ? 'md:col-span-2' : 'md:col-span-3'}>
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
          <div className={activeTab === 'pending' ? 'md:col-span-2' : 'md:col-span-2'}>
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

          {/* Exact Date Picker for received tab */}
          {activeTab === 'received' && (
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
          )}
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
              {urgencyFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                  {urgencyFilter === 'OVERDUE'
                    ? 'เกินกำหนดส่ง'
                    : urgencyFilter === 'TODAY'
                    ? 'ส่งวันนี้'
                    : 'ใน 7 วัน'}
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

      {/* 4. Batch Action Bar (When items are selected in Pending tab) */}
      {activeTab === 'pending' && selectedPoNumbers.size > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {selectedPoNumbers.size}
            </div>
            <div>
              <div className="text-sm font-bold">เลือกอยู่ {selectedPoNumbers.size} รายการ</div>
              <div className="text-xs text-slate-300">
                สามารถตรวจรับสินค้าเข้าคลังพร้อมกันในครั้งเดียว
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPoNumbers(new Set())}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              ยกเลิกการเลือก
            </button>
            <button
              onClick={handleBatchReceive}
              disabled={isBatchReceiving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{isBatchReceiving ? 'กำลังบันทึก...' : `ตรวจรับที่เลือก (${selectedPoNumbers.size} รายการ)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Content: Pending Table & Cards */}
      {activeTab === 'pending' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Table Header Controls */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all-header"
                checked={
                  paginatedList.length > 0 &&
                  paginatedList.every(po => selectedPoNumbers.has(po.poNumber))
                }
                onChange={handleSelectAllCurrentPage}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="select-all-header" className="text-xs font-semibold text-slate-700 cursor-pointer">
                เลือกทั้งหมดในหน้านี้ ({paginatedList.length})
              </label>
            </div>
            <div className="text-xs text-slate-500">
              แสดง {paginatedList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, filteredPending.length)} จาก {filteredPending.length} รายการ
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4">เลขที่ PO / PR</th>
                  <th className="py-3 px-4">กำหนดส่งมอบ</th>
                  <th className="py-3 px-4">ผู้ขาย & โครงการ</th>
                  <th className="py-3 px-4">รายการสินค้า</th>
                  <th className="py-3 px-4 text-right">ยอดรวม</th>
                  <th className="py-3 px-4 text-center">จัดการการรับสินค้า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-10 h-10 text-slate-300 stroke-1" />
                        <span className="text-sm font-medium text-slate-600">ไม่พบรายการสั่งซื้อที่รอรับสินค้า</span>
                        <span className="text-xs text-slate-400">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหาด้านบน</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map(po => {
                    const isSelected = selectedPoNumbers.has(po.poNumber);
                    const company = getCompanyFromPO(po.poNumber);
                    const compBadge = getCompanyBadge(company);
                    const delivery = getDeliveryStatus(po.deliveryDate);
                    const isLoading = !!loadingMap[po.poNumber];

                    return (
                      <tr
                        key={po.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(po.poNumber)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* PO & PR */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => setDetailPo(po)}
                                className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                              >
                                {po.poNumber}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}
                              >
                                {compBadge.short}
                              </span>
                            </div>
                            {po.prNumber ? (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <span>PR:</span>
                                <span className="font-medium text-slate-700">{po.prNumber}</span>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Delivery Status Badge */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border w-fit ${delivery.badge}`}
                            >
                              {delivery.status === 'overdue' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                              {delivery.status === 'today' && <Clock className="w-3 h-3 text-amber-600" />}
                              <span>{delivery.label}</span>
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {po.deliveryDate ? formatThaiDate(po.deliveryDate) : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Vendor & Project */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div className="flex flex-col gap-0.5">
                            <div className="font-semibold text-slate-900 truncate" title={po.vendorName || '-'}>
                              {po.vendorName || '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate" title={po.projectName || '-'}>
                              <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{po.projectName || '-'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Item List Snippet */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <div
                            onClick={() => setDetailPo(po)}
                            className="cursor-pointer group flex flex-col gap-0.5"
                          >
                            <span className="text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                              {po.itemList || '-'}
                            </span>
                            <span className="text-[10px] text-blue-500 group-hover:underline flex items-center gap-0.5">
                              <span>ดูรายละเอียดสินค้า</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(po.totalAmount)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleReceiveStore(po)}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
                              title="ตรวจรับสินค้าเข้าคลังสโตร์"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>{isLoading ? 'กำลังบันทึก...' : 'ตรวจรับเข้าสโตร์'}</span>
                            </button>

                            <button
                              onClick={() => handleReceiveSite(po)}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200 transition-all disabled:opacity-50 whitespace-nowrap"
                              title="กรณีสินค้าถูกส่งตรงหรือรับที่หน้างานแล้ว"
                            >
                              <Truck className="w-3.5 h-3.5 text-amber-600" />
                              <span>รับหน้างาน</span>
                            </button>

                            <button
                              onClick={() => setDetailPo(po)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="ดูรายละเอียดทั้งหมด"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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
                <div className="text-sm font-medium text-slate-600">ไม่พบรายการสั่งซื้อที่รอรับสินค้า</div>
              </div>
            ) : (
              paginatedList.map(po => {
                const isSelected = selectedPoNumbers.has(po.poNumber);
                const company = getCompanyFromPO(po.poNumber);
                const compBadge = getCompanyBadge(company);
                const delivery = getDeliveryStatus(po.deliveryDate);
                const isLoading = !!loadingMap[po.poNumber];

                return (
                  <div
                    key={po.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected ? 'bg-blue-50/40 border-blue-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Top Row: Checkbox, PO Number, Badge, Urgency */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(po.poNumber)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span
                            onClick={() => setDetailPo(po)}
                            className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                          >
                            {po.poNumber}
                          </span>
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}>
                            {compBadge.short}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${delivery.badge}`}
                      >
                        {delivery.status === 'overdue' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        {delivery.status === 'today' && <Clock className="w-3 h-3 text-amber-600" />}
                        <span>{delivery.label}</span>
                      </span>
                    </div>

                    {/* Middle: Vendor, Project, Items */}
                    <div className="mt-2 text-xs space-y-1 text-slate-700">
                      <div>
                        <span className="text-slate-500">ผู้ขาย:</span>{' '}
                        <span className="font-semibold text-slate-900">{po.vendorName || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-500">โครงการ:</span>{' '}
                        <span>{po.projectName || '-'}</span>
                      </div>
                      <div className="text-slate-600 line-clamp-2 mt-1 bg-slate-50 p-2 rounded-lg text-[11px]">
                        {po.itemList || '-'}
                      </div>
                    </div>

                    {/* Amount & Date */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        ส่งมอบ: {po.deliveryDate ? formatThaiDate(po.deliveryDate) : '-'}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{formatCurrency(po.totalAmount)}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleReceiveStore(po)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>{isLoading ? 'กำลังบันทึก...' : 'ตรวจรับเข้าสโตร์'}</span>
                      </button>
                      <button
                        onClick={() => handleReceiveSite(po)}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold border border-amber-200 disabled:opacity-50"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>รับหน้างาน</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {filteredPending.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                หน้า <span className="font-semibold text-slate-800">{currentPage}</span> จาก{' '}
                <span className="font-semibold text-slate-800">{totalPages}</span> (ทั้งหมด{' '}
                {filteredPending.length} รายการ)
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
      ) : (
        /* 6. Received History Tab */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ประวัติการตรวจรับสินค้าล่าสุด ({filteredReceived.length} รายการ)</span>
            </div>
            <div className="text-xs text-slate-500">
              แสดง {filteredReceived.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, filteredReceived.length)} จาก {filteredReceived.length} รายการ
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">เลขที่ PO / PR</th>
                  <th className="py-3 px-4">วันที่รับของ</th>
                  <th className="py-3 px-4">ช่องทางการรับ</th>
                  <th className="py-3 px-4">ผู้รับสินค้า</th>
                  <th className="py-3 px-4">ผู้ขาย & โครงการ</th>
                  <th className="py-3 px-4">รายการสินค้า</th>
                  <th className="py-3 px-4 text-right">ยอดรวม</th>
                  <th className="py-3 px-4 text-center">ดูข้อมูล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-slate-300 stroke-1" />
                        <span className="text-sm font-medium text-slate-600">ไม่พบประวัติการรับสินค้า</span>
                        <span className="text-xs text-slate-400">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map(po => {
                    const company = getCompanyFromPO(po.poNumber);
                    const compBadge = getCompanyBadge(company);
                    const isRetro = isSiteOrRetro(po);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* PO & PR */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => setDetailPo(po)}
                                className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                              >
                                {po.poNumber}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}
                              >
                                {compBadge.short}
                              </span>
                            </div>
                            {po.prNumber && (
                              <span className="text-[11px] text-slate-500">PR: {po.prNumber}</span>
                            )}
                          </div>
                        </td>

                        {/* Received At */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                          {po.receivedAt ? formatThaiDate(po.receivedAt, true) : '-'}
                        </td>

                        {/* Channel Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isRetro ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Truck className="w-3 h-3 text-amber-600" />
                              <span>รับที่หน้างาน</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <PackageCheck className="w-3 h-3 text-emerald-600" />
                              <span>รับเข้าสโตร์</span>
                            </span>
                          )}
                        </td>

                        {/* Receiver */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">
                            {po.receivedBy || '-'}
                          </div>
                        </td>

                        {/* Vendor & Project */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="flex flex-col gap-0.5">
                            <div className="font-semibold text-slate-900 truncate" title={po.vendorName || '-'}>
                              {po.vendorName || '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate" title={po.projectName || '-'}>
                              {po.projectName || '-'}
                            </div>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="text-slate-600 truncate" title={po.itemList || '-'}>
                            {po.itemList || '-'}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(po.totalAmount)}
                        </td>

                        {/* View Button */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setDetailPo(po)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="ดูรายละเอียดทั้งหมด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View for Received */}
          <div className="block lg:hidden divide-y divide-slate-100 p-3 space-y-3">
            {paginatedList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 stroke-1 mb-2" />
                <div className="text-sm font-medium text-slate-600">ไม่พบประวัติการรับสินค้า</div>
              </div>
            ) : (
              paginatedList.map(po => {
                const company = getCompanyFromPO(po.poNumber);
                const compBadge = getCompanyBadge(company);
                const isRetro = isSiteOrRetro(po);

                return (
                  <div key={po.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          onClick={() => setDetailPo(po)}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                        >
                          {po.poNumber}
                        </span>
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}>
                          {compBadge.short}
                        </span>
                      </div>
                      {isRetro ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Truck className="w-3 h-3 text-amber-600" />
                          <span>รับที่หน้างาน</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <PackageCheck className="w-3 h-3 text-emerald-600" />
                          <span>รับเข้าสโตร์</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs space-y-1 text-slate-700">
                      <div>
                        <span className="text-slate-500">ผู้ขาย:</span>{' '}
                        <span className="font-semibold text-slate-900">{po.vendorName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">โครงการ:</span>{' '}
                        <span>{po.projectName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">ผู้รับของ:</span>{' '}
                        <span className="font-semibold text-slate-800">{po.receivedBy || '-'}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        รับเมื่อ: {po.receivedAt ? formatThaiDate(po.receivedAt, true) : '-'}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{formatCurrency(po.totalAmount)}</span>
                      <button
                        onClick={() => setDetailPo(po)}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูข้อมูล</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {filteredReceived.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                หน้า <span className="font-semibold text-slate-800">{currentPage}</span> จาก{' '}
                <span className="font-semibold text-slate-800">{totalPages}</span> (ทั้งหมด{' '}
                {filteredReceived.length} รายการ)
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
      )}

      {/* 7. PO Detail Inspection Modal */}
      {detailPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {detailPo.poNumber}
                  </span>
                  {(() => {
                    const comp = getCompanyFromPO(detailPo.poNumber);
                    const b = getCompanyBadge(comp);
                    return (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${b.badge}`}>
                        {b.short}
                      </span>
                    );
                  })()}
                  <button
                    onClick={() => handleCopy(detailPo.poNumber, 'เลขที่ PO')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="คัดลอกเลขที่ PO"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  {detailPo.prNumber && <span>เลขที่ PR: <span className="font-semibold text-slate-700">{detailPo.prNumber}</span></span>}
                  {detailPo.receiveStatus === 'Received' ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> รับเข้าเรียบร้อยแล้ว
                    </span>
                  ) : (
                    <span className="text-blue-600 font-semibold flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" /> อยู่ระหว่างรอรับสินค้า
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setDetailPo(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Delivery Urgency Badge if pending */}
              {detailPo.receiveStatus !== 'Received' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-slate-500 text-[11px]">กำหนดส่งมอบสินค้า</div>
                      <div className="font-bold text-slate-900 text-sm">
                        {detailPo.deliveryDate ? formatThaiDate(detailPo.deliveryDate) : 'ไม่ระบุวันส่ง'}
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const d = getDeliveryStatus(detailPo.deliveryDate);
                    return (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${d.badge}`}>
                        {d.label}
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* Grid of Key Properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">ผู้ขาย (Vendor)</span>
                  <div className="font-bold text-slate-900 text-sm">{detailPo.vendorName || '-'}</div>
                  {detailPo.accountNumber && (
                    <div className="text-[11px] text-slate-500">เลขบัญชี/ติดต่อ: {detailPo.accountNumber}</div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">โครงการ / งาน</span>
                  <div className="font-bold text-slate-900 text-sm">{detailPo.projectName || '-'}</div>
                  {detailPo.prRequestedBy && (
                    <div className="text-[11px] text-slate-500">ผู้ขอซื้อ: {detailPo.prRequestedBy}</div>
                  )}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400">ยอดรวมทั้งสิ้น</span>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {formatCurrency(detailPo.totalAmount)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400">ยอดค้างชำระ</span>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">
                    {formatCurrency(detailPo.remainingAmount)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-400">เงื่อนไขชำระเงิน</span>
                  <div className="font-medium text-slate-800 text-xs mt-0.5">
                    {detailPo.creditTerm || '-'}
                  </div>
                </div>
              </div>

              {/* Full Item List */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>รายการสินค้าและรายละเอียด (Item Specifications)</span>
                </span>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed font-mono text-xs whitespace-pre-wrap">
                  {detailPo.itemList || 'ไม่มีรายละเอียดสินค้า'}
                </div>
              </div>

              {/* Note / Remarks if available */}
              {detailPo.note && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 text-amber-900 space-y-0.5">
                  <div className="font-bold text-[11px] text-amber-800">หมายเหตุ / ข้อมูลเพิ่มเติม:</div>
                  <div className="text-xs whitespace-pre-wrap">{detailPo.note}</div>
                </div>
              )}

              {/* Received Info if already received */}
              {detailPo.receiveStatus === 'Received' && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ข้อมูลการตรวจรับสินค้า</span>
                  </div>
                  <div className="text-xs text-emerald-800">
                    ผู้รับ: <span className="font-semibold">{detailPo.receivedBy || '-'}</span>
                  </div>
                  <div className="text-xs text-emerald-700">
                    วันที่รับ: {formatThaiDate(detailPo.receivedAt, true)}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setDetailPo(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                ปิดหน้าต่าง
              </button>

              {detailPo.receiveStatus !== 'Received' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReceiveSite(detailPo)}
                    disabled={!!loadingMap[detailPo.poNumber]}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>รับที่หน้างาน (ย้อนหลัง)</span>
                  </button>
                  <button
                    onClick={() => handleReceiveStore(detailPo)}
                    disabled={!!loadingMap[detailPo.poNumber]}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-50"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>ตรวจรับเข้าสโตร์</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
