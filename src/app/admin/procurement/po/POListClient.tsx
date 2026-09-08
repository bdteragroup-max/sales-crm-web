'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { cancelPurchaseOrder, restorePurchaseOrder, updatePurchaseOrder } from '@/app/actions/procurement';
import SearchableProjectSelect, { ProjectOption } from '../components/SearchableProjectSelect';

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

export default function POListClient({ initialPos, initialSearch = '' }: { initialPos: any[], initialSearch?: string }) {
  const router = useRouter();
  const [posList, setPosList] = useState(initialPos);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, RECEIVED, CANCELLED
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
  }, [posList, searchTerm, statusFilter, companyFilter, projectFilter, dateFilter, monthFilter, yearFilter]);

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
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

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="w-8 py-3.5 pl-4 pr-1 text-center"></th>
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
                <th className="py-3.5 px-3 text-center">สถานะ</th>
                <th className="py-3.5 pr-4 pl-2 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span>ไม่พบข้อมูลรายการสั่งซื้อที่ตรงกับเงื่อนไข</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPos.map((po) => {
                  const isExpanded = Boolean(expandedRows[po.id]);
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
                        {/* Expand Chevron */}
                        <td className="py-3 pl-4 pr-1 text-center">
                          <button
                            onClick={() => toggleRowExpand(po.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                            title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
                          >
                            <svg className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                          </button>
                        </td>

                        {/* PO Number */}
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

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {po.receiveStatus === 'Cancelled' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              ยกเลิกแล้ว
                            </span>
                          ) : po.receiveStatus === 'Received' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              รับสินค้าแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              รอรับสินค้า
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 pr-4 pl-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
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
                          <td colSpan={10} className="px-6 py-4">
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
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${po.receiveStatus === 'Cancelled'
                      ? 'bg-gray-100 text-gray-600'
                      : po.receiveStatus === 'Received'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                      {po.receiveStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : (po.receiveStatus === 'Received' ? 'รับแล้ว' : 'รอรับสินค้า')}
                    </span>
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

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => toggleRowExpand(po.id)}
                      className="flex-1 text-[11px] py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      {isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียด'}
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
                    <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1.5 text-gray-600 mt-2 border border-gray-100">
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
    </div>
  );
}
