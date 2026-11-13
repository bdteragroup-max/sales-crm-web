'use client';

import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Plus, 
  Search, 
  X, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Factory, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Edit3, 
  RotateCcw, 
  ArrowUpDown,
  Layers,
  ShoppingBag,
  Trash2,
  Printer,
  Paperclip,
  Link2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { 
  updatePurchaseRequest, 
  deletePurchaseRequest,
  linkPurchaseOrdersToPR,
  searchPurchaseOrdersForPR
} from '@/app/actions/procurement';
import SearchableProjectSelect, { ProjectOption } from '../components/SearchableProjectSelect';
import PrintablePurchaseRequisitionModal from './components/PrintablePurchaseRequisitionModal';

export function normalizeProjectName(name: string | null | undefined): string {
  if (!name) return '';
  let n = name.trim();

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

function getCompanyFromPR(prNumber: string | null | undefined): { name: string; badgeClass: string; key: string } {
  if (!prNumber) return { name: 'OTHER', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', key: 'OTHER' };
  const upper = prNumber.toUpperCase();
  if (upper.includes('-G') || upper.includes('TG')) {
    return { name: 'TG (Group)', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', key: 'TG' };
  }
  if (upper.includes('-E') || upper.includes('TE')) {
    return { name: 'TE (Electric)', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', key: 'TE' };
  }
  if (upper.includes('-P') || upper.includes('TP')) {
    return { name: 'TP (Power)', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', key: 'TP' };
  }
  return { name: 'OTHER', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', key: 'OTHER' };
}

export default function PRListClient({ 
  initialPrs, 
  pendingPrOrders = [],
  initialSearch = '',
  initialStatus = 'ALL',
  initialAvailablePos = []
}: { 
  initialPrs: any[]; 
  pendingPrOrders?: any[];
  initialSearch?: string;
  initialStatus?: string;
  initialAvailablePos?: any[];
}) {
  const router = useRouter();
  const [prsList, setPrsList] = useState(initialPrs);
  const [availablePos, setAvailablePos] = useState<any[]>(initialAvailablePos);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WITHOUT_PO' | 'WITH_PO' | 'PENDING_ORDERS'>(
    (initialStatus as any) || 'ALL'
  );
  const [companyFilter, setCompanyFilter] = useState<'all' | 'TE' | 'TP' | 'TG'>('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // UI States
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [showPendingOrders, setShowPendingOrders] = useState(true);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<'recordedAt' | 'prNumber' | 'projectName' | 'requestedBy' | 'poCount'>('recordedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit PR Modal State
  const [editingPR, setEditingPR] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    prNumber: '',
    projectName: '',
    itemList: '',
    requestedBy: '',
    recordedAt: '',
    note: '',
    poNumbers: [] as string[],
    newPoInput: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [printingPr, setPrintingPr] = useState<any | null>(null);

  // Link PO Modal State
  const [linkingPr, setLinkingPr] = useState<any | null>(null);
  const [linkedPoNumbers, setLinkedPoNumbers] = useState<string[]>([]);
  const [newPoInput, setNewPoInput] = useState('');
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [isSearchingPos, setIsSearchingPos] = useState(false);
  const [isSavingPoLink, setIsSavingPoLink] = useState(false);
  const [queriedPos, setQueriedPos] = useState<any[]>([]);

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

  // Unique projects with item counts, sorted by frequency
  const projectOptions: ProjectOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    prsList.forEach(pr => {
      const normalized = normalizeProjectName(pr.projectName);
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [prsList]);

  // Unique years
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    prsList.forEach(pr => {
      const d = pr.recordedAt || pr.createdAt;
      if (d) {
        years.add(new Date(d).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [prsList]);

  // KPI Metrics Calculation
  const kpiMetrics = useMemo(() => {
    const total = prsList.length;
    let withoutPoCount = 0;
    let withPoCount = 0;

    prsList.forEach(pr => {
      if (pr.purchaseOrders && pr.purchaseOrders.length > 0) {
        withPoCount++;
      } else {
        withoutPoCount++;
      }
    });

    return {
      total,
      withoutPoCount,
      withPoCount,
      pendingOrdersCount: pendingPrOrders.length
    };
  }, [prsList, pendingPrOrders]);

  const companyCounts = useMemo(() => {
    const counts = { all: prsList.length, TE: 0, TP: 0, TG: 0 };
    prsList.forEach(pr => {
      const comp = getCompanyFromPR(pr.prNumber).key;
      if (comp === 'TE') counts.TE++;
      else if (comp === 'TP') counts.TP++;
      else if (comp === 'TG') counts.TG++;
    });
    return counts;
  }, [prsList]);

  const toggleRowExpand = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetFilters = () => {
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
    searchTerm ||
    statusFilter !== 'ALL' ||
    companyFilter !== 'all' ||
    projectFilter ||
    dateFilter ||
    monthFilter ||
    yearFilter
  );

  // Filtered PR list
  const filteredPrs = useMemo(() => {
    return prsList.filter(pr => {
      // Status Filter
      if (statusFilter === 'WITHOUT_PO') {
        if (pr.purchaseOrders && pr.purchaseOrders.length > 0) return false;
      } else if (statusFilter === 'WITH_PO') {
        if (!pr.purchaseOrders || pr.purchaseOrders.length === 0) return false;
      }

      // Company Filter
      if (companyFilter !== 'all') {
        const company = getCompanyFromPR(pr.prNumber).key;
        if (company !== companyFilter) return false;
      }

      // Project Filter
      if (projectFilter) {
        const pName = normalizeProjectName(pr.projectName);
        if (pName !== projectFilter && !pr.projectName?.toLowerCase().includes(projectFilter.toLowerCase())) {
          return false;
        }
      }

      // Date / Month / Year Filters
      const prDate = pr.recordedAt ? new Date(pr.recordedAt) : (pr.createdAt ? new Date(pr.createdAt) : null);
      if (dateFilter && prDate) {
        const yyyy = prDate.getFullYear();
        const mm = String(prDate.getMonth() + 1).padStart(2, '0');
        const dd = String(prDate.getDate()).padStart(2, '0');
        if (`${yyyy}-${mm}-${dd}` !== dateFilter) return false;
      } else if (dateFilter && !prDate) {
        return false;
      }

      if (monthFilter && prDate) {
        if ((prDate.getMonth() + 1).toString() !== monthFilter) return false;
      } else if (monthFilter && !prDate) {
        return false;
      }

      if (yearFilter && prDate) {
        if (prDate.getFullYear().toString() !== yearFilter) return false;
      } else if (yearFilter && !prDate) {
        return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesPrNumber = pr.prNumber?.toLowerCase().includes(query);
        const matchesProject =
          pr.projectName?.toLowerCase().includes(query) ||
          normalizeProjectName(pr.projectName)?.toLowerCase().includes(query);
        const matchesRequester = pr.requestedBy?.toLowerCase().includes(query);
        const matchesItems = pr.itemList?.toLowerCase().includes(query);
        const matchesNote = pr.note?.toLowerCase().includes(query);
        const matchesLinkedPO = pr.purchaseOrders?.some((po: any) => 
          po.poNumber?.toLowerCase().includes(query) || po.vendorName?.toLowerCase().includes(query)
        );

        if (!matchesPrNumber && !matchesProject && !matchesRequester && !matchesItems && !matchesNote && !matchesLinkedPO) {
          return false;
        }
      }

      return true;
    });
  }, [prsList, statusFilter, companyFilter, projectFilter, dateFilter, monthFilter, yearFilter, searchTerm]);

  // Sorted PR list
  const sortedPrs = useMemo(() => {
    return [...filteredPrs].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'recordedAt') {
        valA = a.recordedAt ? new Date(a.recordedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        valB = b.recordedAt ? new Date(b.recordedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      } else if (sortField === 'prNumber') {
        valA = a.prNumber || '';
        valB = b.prNumber || '';
      } else if (sortField === 'projectName') {
        valA = a.projectName || '';
        valB = b.projectName || '';
      } else if (sortField === 'requestedBy') {
        valA = a.requestedBy || '';
        valB = b.requestedBy || '';
      } else if (sortField === 'poCount') {
        valA = a.purchaseOrders?.length || 0;
        valB = b.purchaseOrders?.length || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPrs, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedPrs.length / pageSize) || 1;
  const paginatedPrs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPrs.slice(start, start + pageSize);
  }, [sortedPrs, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const displayedPos = useMemo(() => {
    if (queriedPos && queriedPos.length > 0) {
      return queriedPos;
    }
    if (!poSearchQuery.trim()) {
      if (!linkingPr) return availablePos.slice(0, 10);
      const prProj = normalizeProjectName(linkingPr.projectName).toLowerCase();
      const matched = availablePos.filter(po => {
        if (!po.jobName) return false;
        const poProj = normalizeProjectName(po.jobName).toLowerCase();
        return prProj && poProj && (poProj.includes(prProj) || prProj.includes(poProj));
      });
      return matched.length > 0 ? matched.slice(0, 10) : availablePos.slice(0, 10);
    }
    const q = poSearchQuery.trim().toLowerCase();
    return availablePos.filter(po => 
      po.poNumber?.toLowerCase().includes(q) ||
      po.vendorName?.toLowerCase().includes(q) ||
      po.jobName?.toLowerCase().includes(q) ||
      po.itemList?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [queriedPos, availablePos, poSearchQuery, linkingPr]);

  const openLinkPoModal = (pr: any) => {
    setLinkingPr(pr);
    const currentPoNumbers = pr.purchaseOrders?.map((po: any) => po.poNumber) || [];
    setLinkedPoNumbers(currentPoNumbers);
    setNewPoInput('');
    setPoSearchQuery('');
    setQueriedPos([]);
  };

  const handleAddPoNumber = (poNum: string) => {
    const clean = poNum.trim().toUpperCase();
    if (!clean) return;
    if (!linkedPoNumbers.includes(clean)) {
      setLinkedPoNumbers(prev => [...prev, clean]);
    }
    setNewPoInput('');
  };

  const handleRemovePoNumber = (poNum: string) => {
    setLinkedPoNumbers(prev => prev.filter(p => p !== poNum));
  };

  const handleSearchPos = async (query: string) => {
    setPoSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setQueriedPos([]);
      return;
    }
    setIsSearchingPos(true);
    try {
      const res = await searchPurchaseOrdersForPR(query.trim());
      if (res.success && res.data) {
        setQueriedPos(res.data);
      }
    } catch (err) {
      console.error('Error searching POs:', err);
    } finally {
      setIsSearchingPos(false);
    }
  };

  const handleSavePoLink = async () => {
    if (!linkingPr) return;
    setIsSavingPoLink(true);
    try {
      let toSave = [...linkedPoNumbers];
      if (newPoInput.trim()) {
        const clean = newPoInput.trim().toUpperCase();
        if (!toSave.includes(clean)) {
          toSave.push(clean);
        }
      }

      const res = await linkPurchaseOrdersToPR({
        prNumber: linkingPr.prNumber,
        poNumbers: toSave
      });

      if (res.success && res.data) {
        setPrsList(prev => prev.map(p => p.id === linkingPr.id ? { ...p, ...res.data } : p));
        setLinkingPr(null);
        Swal.fire({
          icon: 'success',
          title: 'เชื่อมโยง PO สำเร็จ',
          text: res.message || `เชื่อมโยง PO กับ PR ${linkingPr.prNumber} เรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถเชื่อมโยง PO ได้'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      });
    } finally {
      setIsSavingPoLink(false);
    }
  };

  const openEditModal = (pr: any) => {
    setEditingPR(pr);
    let dateStr = '';
    if (pr.recordedAt) {
      try {
        const d = new Date(pr.recordedAt);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    const currentPoNums = pr.purchaseOrders?.map((po: any) => po.poNumber) || [];
    setEditForm({
      prNumber: pr.prNumber || '',
      projectName: pr.projectName || '',
      itemList: pr.itemList || '',
      requestedBy: pr.requestedBy || '',
      recordedAt: dateStr,
      note: pr.note || '',
      poNumbers: currentPoNums,
      newPoInput: ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPR) return;

    if (!editForm.prNumber.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกเลขที่ PR' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        prNumber: editForm.prNumber.trim(),
        projectName: editForm.projectName.trim(),
        itemList: editForm.itemList.trim(),
        requestedBy: editForm.requestedBy.trim(),
        recordedAt: editForm.recordedAt ? editForm.recordedAt : null,
        note: editForm.note.trim(),
        poNumbers: editForm.poNumbers
      };

      const res = await updatePurchaseRequest(editingPR.id, payload);
      if (res.success && res.data) {
        setPrsList(prev => prev.map(p => p.id === editingPR.id ? { ...p, ...res.data } : p));
        setEditingPR(null);
        Swal.fire({
          icon: 'success',
          title: 'อัพเดตสำเร็จ',
          text: `บันทึกข้อมูล PR ${res.data.prNumber} เรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกได้',
          text: res.error || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล PR',
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

  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const handleDeletePR = async (pr: any) => {
    const hasPO = pr.purchaseOrders && pr.purchaseOrders.length > 0;
    const result = await Swal.fire({
      title: 'ยืนยันการลบใบขอซื้อ (PR)?',
      html: `<div class="text-left text-xs text-gray-600 space-y-1.5">
        <p>คุณต้องการลบใบขอซื้อเลขที่ <b class="font-mono text-red-600">${pr.prNumber}</b> ใช่หรือไม่?</p>
        ${pr.projectName ? `<p><b>โครงการ:</b> ${pr.projectName}</p>` : ''}
        ${pr.itemList ? `<p class="truncate text-gray-500"><b>รายการ:</b> ${pr.itemList}</p>` : ''}
        ${hasPO ? `<div class="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium mt-1 flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5 text-amber-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>ใบขอซื้อนี้มีใบสั่งซื้อ (PO) ที่เกี่ยวข้อง ${pr.purchaseOrders.length} ฉบับ</span></div>` : ''}
        <p class="text-red-500 text-[11px] pt-1">เมื่อลบแล้ว รายการนี้จะถูกลบออกจากทั้งหน้ารายการจัดซื้อ และหน้ารายละเอียดโครงการที่เชื่อมโยงอยู่ทันที</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ใช่, ลบใบขอซื้อนี้',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setIsDeletingId(pr.id);
    try {
      const res = await deletePurchaseRequest(pr.id);
      if (res.success) {
        setPrsList(prev => prev.filter(p => p.id !== pr.id));
        Swal.fire({
          title: 'ลบสำเร็จ',
          text: `ลบใบขอซื้อ ${pr.prNumber} เรียบร้อยแล้ว`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถลบใบขอซื้อได้',
          icon: 'error',
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
        icon: 'error',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="text-blue-600" size={26} />
              รายการขอซื้อ (Purchase Requests)
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              PR Management
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            ระบบติดตามสถานะใบขอซื้อ เชื่อมโยงใบสั่งซื้อ (PO) และตรวจสอบความต้องการจัดซื้อจากฝ่ายผลิต
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/procurement/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition-colors"
          >
            <Layers size={14} />
            แดชบอร์ดจัดซื้อ
          </Link>
          <Link
            href="/admin/procurement/po"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
          >
            <ShoppingBag size={14} />
            ใบสั่งซื้อ (PO)
          </Link>
          <Link
            href="/admin/procurement/pr/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow rounded-xl transition-all"
          >
            <Plus size={16} />
            สร้าง PR ใหม่
          </Link>
        </div>
      </div>

      {/* Production Orders Alert Section (If orders need PR) */}
      {pendingPrOrders.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-white to-rose-50/40 rounded-2xl border border-rose-200 shadow-sm overflow-hidden transition-all">
          <div 
            onClick={() => setShowPendingOrders(!showPendingOrders)}
            className="px-5 py-3.5 bg-rose-500/10 border-b border-rose-200/80 flex items-center justify-between cursor-pointer hover:bg-rose-500/15 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-rose-600 text-white rounded-lg shadow-sm">
                <Factory size={18} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                  รอฝ่ายจัดซื้อเปิด PR จากกระบวนการผลิต
                  <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {pendingPrOrders.length} รายการ
                  </span>
                </h2>
                <p className="text-xs text-rose-700">
                  ฝ่ายผลิตได้ส่งคำขอเบิกสินค้าที่ต้องการให้จัดซื้อเปิด PR เพื่อสั่งของเข้าโครงการ
                </p>
              </div>
            </div>
            <button 
              type="button"
              className="text-rose-700 hover:text-rose-900 text-xs font-medium flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200"
            >
              {showPendingOrders ? (
                <>ซ่อนรายการ <ChevronUp size={14} /></>
              ) : (
                <>ดูรายการทั้งหมด <ChevronDown size={14} /></>
              )}
            </button>
          </div>

          {showPendingOrders && (
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-rose-50/50 text-gray-600 border-b border-rose-100 font-semibold uppercase">
                  <tr>
                    <th className="px-5 py-2.5">ออเดอร์ผลิต</th>
                    <th className="px-5 py-2.5">ลูกค้า / โครงการ</th>
                    <th className="px-5 py-2.5">กำหนดส่งสินค้า</th>
                    <th className="px-5 py-2.5">หมายเหตุถึงจัดซื้อ</th>
                    <th className="px-5 py-2.5 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/60 bg-white">
                  {pendingPrOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-5 py-3 font-bold font-mono text-rose-700">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {order.company?.name || order.customerName || '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {order.targetDeliveryDate ? new Date(order.targetDeliveryDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-5 py-3 text-rose-600 font-medium">
                        {order.prNote || '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link 
                          href={`/admin/procurement/pr/create?orderId=${order.id}&note=${encodeURIComponent(order.prNote || '')}&project=${encodeURIComponent(order.orderNumber)}`}
                          className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          <Plus size={14} /> เปิด PR ทันที
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4 Interactive Live KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total PRs */}
        <div 
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
              : 'bg-white hover:border-blue-300 text-gray-900 border-gray-200/80 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${statusFilter === 'ALL' ? 'text-blue-100' : 'text-gray-500'}`}>
              ใบขอซื้อทั้งหมด (Total PRs)
            </span>
            <span className={`p-2 rounded-xl ${statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <FileText size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {kpiMetrics.total.toLocaleString()}
            <span className={`text-xs ml-1.5 font-normal ${statusFilter === 'ALL' ? 'text-blue-100' : 'text-gray-500'}`}>
              รายการ
            </span>
          </div>
          <p className={`text-xs mt-1 ${statusFilter === 'ALL' ? 'text-blue-100' : 'text-gray-400'}`}>
            รายการขอซื้อทั้งหมดในระบบ
          </p>
        </div>

        {/* Without PO (Pending Action) */}
        <div 
          onClick={() => { setStatusFilter('WITHOUT_PO'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'WITHOUT_PO'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20 ring-2 ring-amber-500/30'
              : 'bg-white hover:border-amber-300 text-gray-900 border-gray-200/80 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${statusFilter === 'WITHOUT_PO' ? 'text-amber-100' : 'text-amber-700'}`}>
              รอดำเนินการ (ยังไม่มี PO)
            </span>
            <span className={`p-2 rounded-xl ${statusFilter === 'WITHOUT_PO' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <Clock size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {kpiMetrics.withoutPoCount.toLocaleString()}
            <span className={`text-xs ml-1.5 font-normal ${statusFilter === 'WITHOUT_PO' ? 'text-amber-100' : 'text-gray-500'}`}>
              รายการ
            </span>
          </div>
          <p className={`text-xs mt-1 ${statusFilter === 'WITHOUT_PO' ? 'text-amber-100' : 'text-amber-600'}`}>
            รอฝ่ายจัดซื้อเปิดใบสั่งซื้อ (PO)
          </p>
        </div>

        {/* With PO (Completed) */}
        <div 
          onClick={() => { setStatusFilter('WITH_PO'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'WITH_PO'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30'
              : 'bg-white hover:border-emerald-300 text-gray-900 border-gray-200/80 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${statusFilter === 'WITH_PO' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              เปิด PO แล้ว (PO Issued)
            </span>
            <span className={`p-2 rounded-xl ${statusFilter === 'WITH_PO' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {kpiMetrics.withPoCount.toLocaleString()}
            <span className={`text-xs ml-1.5 font-normal ${statusFilter === 'WITH_PO' ? 'text-emerald-100' : 'text-gray-500'}`}>
              รายการ
            </span>
          </div>
          <p className={`text-xs mt-1 ${statusFilter === 'WITH_PO' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            มีใบสั่งซื้อรองรับแล้ว
          </p>
        </div>

        {/* Pending Production Orders */}
        <div 
          onClick={() => setShowPendingOrders(true)}
          className="p-4 rounded-2xl border bg-white hover:border-rose-300 text-gray-900 border-gray-200/80 shadow-sm transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700">
              รอเปิด PR จากฝ่ายผลิต
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Factory size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600">
            {kpiMetrics.pendingOrdersCount.toLocaleString()}
            <span className="text-xs ml-1.5 font-normal text-gray-500">
              ออเดอร์
            </span>
          </div>
          <p className="text-xs mt-1 text-rose-600">
            คำสั่งผลิตที่รอจัดซื้อออก PR
          </p>
        </div>
      </div>

      {/* Main Filter & Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-5 border-b border-gray-100 space-y-4">
          {/* Segmented Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/70 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ทั้งหมด
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 font-semibold">
                  {kpiMetrics.total}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('WITHOUT_PO'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  statusFilter === 'WITHOUT_PO'
                    ? 'bg-amber-500 text-white shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                <Clock size={13} />
                ยังไม่มี PO
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  statusFilter === 'WITHOUT_PO' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {kpiMetrics.withoutPoCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('WITH_PO'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  statusFilter === 'WITH_PO'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 size={13} />
                เปิด PO แล้ว
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  statusFilter === 'WITH_PO' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {kpiMetrics.withPoCount}
                </span>
              </button>
            </div>

            {/* Quick Company Filters */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500 font-medium mr-1 hidden sm:inline">บริษัท:</span>
              {(['all', 'TE', 'TP', 'TG'] as const).map((comp) => {
                const isSelected = companyFilter === comp;
                const label = comp === 'all' ? 'ทั้งหมด' : comp;
                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => { setCompanyFilter(comp); setCurrentPage(1); }}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected 
                        ? comp === 'TE'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : comp === 'TP'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : comp === 'TG'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-gray-800 text-white border-gray-800 shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {companyCounts[comp]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar & Dropdown Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="ค้นหาด้วยเลขที่ PR, โครงการ, สินค้า, ผู้ขอซื้อ, เลขที่ PO..."
                className="w-full pl-9 pr-9 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Project Filter (Searchable Combobox) */}
            <div className="md:col-span-3">
              <SearchableProjectSelect
                value={projectFilter}
                onChange={(selected) => { setProjectFilter(selected); setCurrentPage(1); }}
                options={projectOptions}
                totalCount={prsList.length}
                placeholder="ทุกโครงการ"
              />
            </div>

            {/* Month Filter */}
            <div className="md:col-span-2">
              <select
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
              >
                <option value="">ทุกเดือน</option>
                {thaiMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="md:col-span-1">
              <select
                value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
              >
                <option value="">ทุกปี</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
              />
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="ล้างตัวกรองทั้งหมด"
                  className="shrink-0 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-1">
            <div>
              พบทั้งหมด <span className="font-semibold text-gray-900">{filteredPrs.length.toLocaleString()}</span> รายการ
              {isAnyFilterActive && <span className="text-blue-600 ml-1.5">(กรองจาก {prsList.length.toLocaleString()} รายการ)</span>}
            </div>

            <div className="flex items-center gap-2">
              <span>แสดงแถวละ:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/80 text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="w-8 px-3 py-3 text-center"></th>
                <th 
                  onClick={() => handleSort('recordedAt')}
                  className="px-4 py-3 text-left cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    วันที่ขอซื้อ
                    <ArrowUpDown size={12} className={sortField === 'recordedAt' ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('prNumber')}
                  className="px-4 py-3 text-left cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    เลขที่ PR
                    <ArrowUpDown size={12} className={sortField === 'prNumber' ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('projectName')}
                  className="px-4 py-3 text-left cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    โครงการ / วัตถุประสงค์
                    <ArrowUpDown size={12} className={sortField === 'projectName' ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">รายการสินค้า / บริการ</th>
                <th 
                  onClick={() => handleSort('requestedBy')}
                  className="px-4 py-3 text-left cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    ผู้ขอซื้อ
                    <ArrowUpDown size={12} className={sortField === 'requestedBy' ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('poCount')}
                  className="px-4 py-3 text-left cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    PO ที่เกี่ยวข้อง
                    <ArrowUpDown size={12} className={sortField === 'poCount' ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedPrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={36} className="text-gray-300 stroke-1" />
                      <p className="text-sm font-medium">ไม่พบข้อมูล PR ตามเงื่อนไขที่เลือก</p>
                      {isAnyFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-1 text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <RotateCcw size={12} /> ล้างตัวกรองทั้งหมด
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPrs.map((pr) => {
                  const isExpanded = Boolean(expandedRows[pr.id]);
                  const company = getCompanyFromPR(pr.prNumber);
                  const dateStr = pr.recordedAt 
                    ? new Date(pr.recordedAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                    : (pr.createdAt ? new Date(pr.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
                  const normalizedProject = normalizeProjectName(pr.projectName);
                  const hasPo = pr.purchaseOrders && pr.purchaseOrders.length > 0;

                  return (
                    <React.Fragment key={pr.id}>
                      <tr 
                        className={`hover:bg-blue-50/30 transition-colors group cursor-pointer ${
                          isExpanded ? 'bg-blue-50/20' : ''
                        }`}
                        onClick={() => toggleRowExpand(pr.id)}
                      >
                        {/* Expand Chevron */}
                        <td className="px-3 py-3.5 text-center text-gray-400 group-hover:text-blue-600">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {dateStr}
                        </td>

                        {/* PR Number */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {pr.prNumber}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${company.badgeClass}`}>
                              {company.key}
                            </span>
                            {pr.attachments && Array.isArray(pr.attachments) && pr.attachments.length > 0 && (
                              <span 
                                title={`มีเอกสารแนบจากผู้ขาย ${pr.attachments.length} ไฟล์`}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold"
                              >
                                <Paperclip size={10} className="text-red-500" />
                                {pr.attachments.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Project */}
                        <td className="px-4 py-3.5 text-gray-800 font-medium max-w-[200px] truncate" title={pr.projectName || ''}>
                          {normalizedProject || '-'}
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3.5 text-gray-600 max-w-[260px] truncate" title={pr.itemList || ''}>
                          {pr.itemList || '-'}
                        </td>

                        {/* Requested By */}
                        <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                          {pr.requestedBy || '-'}
                        </td>

                        {/* Linked POs */}
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {hasPo ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {pr.purchaseOrders.map((po: any) => {
                                const isCancelled = po.receiveStatus === 'Cancelled';
                                const isReceived = po.receiveStatus === 'Received';
                                const badgeStyle = isCancelled
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                                  : isReceived
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200';
                                const statusLabel = isCancelled ? 'ยกเลิก' : (isReceived ? 'รับแล้ว' : 'รอรับ');

                                return (
                                  <Link
                                    key={po.poNumber}
                                    href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                                    title={`ไปที่ ${po.poNumber} (${statusLabel})`}
                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono border font-medium hover:opacity-80 transition-opacity ${badgeStyle}`}
                                  >
                                    <span>{po.poNumber}</span>
                                    <span className="text-[9px] opacity-75">({statusLabel})</span>
                                    <ExternalLink size={10} className="shrink-0 ml-0.5 opacity-60" />
                                  </Link>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => openLinkPoModal(pr)}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition-colors font-medium"
                                title="ผูก / ดึง PO เพิ่มเติม"
                              >
                                <Plus size={10} /> ผูกเพิ่ม
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                                <Clock size={11} /> รอดำเนินการ
                              </span>
                              <button
                                type="button"
                                onClick={() => openLinkPoModal(pr)}
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 px-2 py-0.5 rounded-md font-semibold transition-all shadow-2xs"
                                title="ดึงหรือใส่เลขที่ PO ที่เปิดตามหลัง"
                              >
                                <Link2 size={11} /> ดึง PO
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openLinkPoModal(pr)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all font-medium shadow-2xs"
                              title="ดึง / เชื่อมโยงใบสั่งซื้อ (PO)"
                            >
                              <Link2 size={13} />
                              ดึง PO
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintingPr(pr)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-gray-700 hover:text-white bg-gray-50 hover:bg-gray-800 border border-gray-200 hover:border-gray-800 rounded-lg transition-all font-medium shadow-2xs"
                              title="พิมพ์ / ดาวน์โหลด PDF ใบขอซื้อ (Express Format)"
                            >
                              <Printer size={13} />
                              พิมพ์
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(pr)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg transition-all font-medium shadow-2xs"
                              title="แก้ไขข้อมูล PR"
                            >
                              <Edit3 size={13} />
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              disabled={isDeletingId === pr.id}
                              onClick={() => handleDeletePR(pr)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all font-medium shadow-2xs"
                              title="ลบใบขอซื้อ (PR)"
                            >
                              <Trash2 size={13} />
                              {isDeletingId === pr.id ? 'กำลังลบ...' : 'ลบ'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detail Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/30 border-b border-blue-100/60">
                          <td colSpan={8} className="p-4 md:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
                              {/* Left: Full Items List */}
                              <div className="md:col-span-5 space-y-1.5 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4">
                                <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                  <FileText size={14} className="text-blue-600" />
                                  รายการสินค้า / สเปกทั้งหมด:
                                </div>
                                <div className="text-xs text-gray-800 bg-gray-50/80 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
                                  {pr.itemList || 'ไม่มีข้อมูลระบุรายการสินค้า'}
                                </div>
                              </div>

                              {/* Center: Linked POs Details */}
                              <div className="md:col-span-4 space-y-1.5 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4">
                                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                  <div className="flex items-center gap-1.5">
                                    <ShoppingBag size={14} className="text-emerald-600" />
                                    ใบสั่งซื้อ (PO) ที่ออกสำหรับ PR นี้:
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openLinkPoModal(pr)}
                                    className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-md font-medium transition-all shadow-2xs"
                                  >
                                    <Link2 size={11} /> ดึง / แก้ไข PO
                                  </button>
                                </div>
                                {hasPo ? (
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {pr.purchaseOrders.map((po: any) => (
                                      <div 
                                        key={po.poNumber} 
                                        className="p-2.5 rounded-lg border border-gray-200/80 bg-gray-50/50 hover:bg-white transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <Link
                                            href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                                            className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1"
                                          >
                                            {po.poNumber}
                                            <ExternalLink size={11} />
                                          </Link>
                                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                                            po.receiveStatus === 'Cancelled'
                                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                                              : po.receiveStatus === 'Received'
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }`}>
                                            {po.receiveStatus === 'Cancelled' ? 'ยกเลิก' : (po.receiveStatus === 'Received' ? 'รับสินค้าแล้ว' : 'รอรับสินค้า')}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-gray-600 mt-1 flex justify-between">
                                          <span>ผู้ขาย: <strong className="text-gray-800">{po.vendorName || '-'}</strong></span>
                                          {po.totalAmount !== null && po.totalAmount !== undefined && (
                                            <span className="font-semibold text-emerald-700">
                                              ฿{Number(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-amber-800 bg-amber-50/80 p-3 rounded-lg border border-amber-200/60 flex items-start gap-2">
                                    <Clock size={15} className="shrink-0 mt-0.5 text-amber-600" />
                                    <div className="flex-1">
                                      ยังไม่มีการออกใบสั่งซื้อ (PO) ให้กับ PR รายการนี้
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => openLinkPoModal(pr)}
                                          className="inline-flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-medium transition-colors shadow-2xs"
                                        >
                                          <Link2 size={12} /> ดึง PO มาผูกที่นี่
                                        </button>
                                        <Link
                                          href={`/admin/procurement/po?search=${encodeURIComponent(pr.prNumber)}`}
                                          className="text-amber-900 font-semibold underline hover:text-amber-950 text-[11px]"
                                        >
                                          ตรวจสอบหน้า PO →
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right: Metadata & Audit Note */}
                              <div className="md:col-span-3 space-y-2 text-xs">
                                <div>
                                  <span className="text-gray-500 font-medium">โครงการ:</span>
                                  <p className="font-semibold text-gray-900 mt-0.5">{pr.projectName || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 font-medium">ผู้ขอซื้อ:</span>
                                  <p className="font-semibold text-gray-900 mt-0.5">{pr.requestedBy || '-'}</p>
                                </div>
                                {pr.orderId && (
                                  <div>
                                    <span className="text-gray-500 font-medium">เชื่อมโยงออเดอร์ผลิต:</span>
                                    <p className="font-mono text-blue-700 font-semibold mt-0.5">{pr.orderId}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-500 font-medium">หมายเหตุ / Audit Log:</span>
                                  <div className="mt-0.5 text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px]">
                                    {pr.note || '-'}
                                  </div>
                                </div>
                              </div>

                              {/* Attached Supplier Documents (Full width 12 cols) */}
                              {pr.attachments && Array.isArray(pr.attachments) && pr.attachments.length > 0 && (
                                <div className="md:col-span-12 pt-3 border-t border-gray-100 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-red-700 flex items-center gap-1.5">
                                      <Paperclip size={14} className="text-red-600" />
                                      เอกสารแนบจากผู้ขาย / ซัพพลายเออร์ ({pr.attachments.length} ไฟล์):
                                    </span>
                                    <span className="text-[11px] text-gray-400">คลิกเพื่อเปิดดูไฟล์ต้นฉบับในแท็บใหม่</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {pr.attachments.map((file: any, fIdx: number) => {
                                      const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
                                      const isPdf = ext === 'pdf';
                                      const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
                                      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
                                      return (
                                        <a
                                          key={file.id || fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-red-50/40 hover:border-red-300 transition-all group shadow-2xs"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                              <FileText size={15} className={isPdf ? 'text-red-500' : isExcel ? 'text-emerald-600' : isImage ? 'text-purple-600' : 'text-blue-500'} />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-semibold text-gray-900 group-hover:text-red-600 text-xs truncate">
                                                {file.name || 'เอกสารแนบ'}
                                              </p>
                                              <p className="text-[10px] text-gray-400">
                                                {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ext.toUpperCase()}
                                              </p>
                                            </div>
                                          </div>
                                          <ExternalLink size={13} className="text-gray-400 group-hover:text-red-600 shrink-0" />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
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
          {paginatedPrs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 text-gray-300 stroke-1" />
              <p className="text-sm font-medium">ไม่พบข้อมูล PR</p>
            </div>
          ) : (
            paginatedPrs.map((pr) => {
              const company = getCompanyFromPR(pr.prNumber);
              const dateStr = pr.recordedAt 
                ? new Date(pr.recordedAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                : (pr.createdAt ? new Date(pr.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
              const hasPo = pr.purchaseOrders && pr.purchaseOrders.length > 0;

              return (
                <div key={pr.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {pr.prNumber}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${company.badgeClass}`}>
                          {company.key}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openLinkPoModal(pr)}
                        className="text-xs px-2 py-1 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg font-medium inline-flex items-center gap-1"
                        title="ดึง PO"
                      >
                        <Link2 size={12} /> ดึง PO
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(pr)}
                        className="text-xs px-2.5 py-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg font-medium inline-flex items-center gap-1"
                      >
                        <Edit3 size={12} /> แก้ไข
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingId === pr.id}
                        onClick={() => handleDeletePR(pr)}
                        className="text-xs px-2.5 py-1 text-red-600 bg-red-50 border border-red-200 rounded-lg font-medium inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> ลบ
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1">
                    <div><span className="text-gray-500">โครงการ:</span> <strong>{normalizeProjectName(pr.projectName) || '-'}</strong></div>
                    <div><span className="text-gray-500">ผู้ขอซื้อ:</span> {pr.requestedBy || '-'}</div>
                    <div className="text-gray-600 line-clamp-2">{pr.itemList || '-'}</div>
                  </div>

                  {/* PO Status Badge */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {hasPo ? (
                        <div className="flex flex-wrap gap-1">
                          {pr.purchaseOrders.map((po: any) => (
                            <Link
                              key={po.poNumber}
                              href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {po.poNumber} <ExternalLink size={9} />
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
                          <Clock size={11} /> รอดำเนินการเปิด PO
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openLinkPoModal(pr)}
                      className="shrink-0 text-xs px-2 py-1 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg font-medium inline-flex items-center gap-1 hover:bg-indigo-100"
                    >
                      <Link2 size={12} /> ดึง PO
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 bg-gray-50/50">
            <div>
              แสดงรายการที่ <span className="font-semibold text-gray-900">{((currentPage - 1) * pageSize) + 1}</span> ถึง{' '}
              <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filteredPrs.length)}</span> จากทั้งหมด{' '}
              <span className="font-semibold text-gray-900">{filteredPrs.length.toLocaleString()}</span> รายการ
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent font-medium"
              >
                « หน้าแรก
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent font-medium"
              >
                ‹ ก่อนหน้า
              </button>

              <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold shadow-2xs">
                หน้า {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent font-medium"
              >
                ถัดไป ›
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent font-medium"
              >
                หน้าสุดท้าย »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit PR Modal */}
      {editingPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto flex flex-col border border-gray-200/80">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/80 sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>แก้ไขข้อมูลใบขอซื้อ (PR)</span>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    {editingPR.prNumber}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบบจะบันทึกเขียนทับข้อมูลเดิมในฐานข้อมูลทันที พร้อมบันทึกประวัติผู้แก้ไข
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPR(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    เลขที่ PR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.prNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, prNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    placeholder="เช่น PR69-E010101"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    วันที่ขอซื้อ (Date)
                  </label>
                  <input
                    type="date"
                    value={editForm.recordedAt}
                    onChange={(e) => setEditForm(prev => ({ ...prev, recordedAt: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    ผู้ขอจัดซื้อ
                  </label>
                  <input
                    type="text"
                    value={editForm.requestedBy}
                    onChange={(e) => setEditForm(prev => ({ ...prev, requestedBy: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    placeholder="ชื่อผู้ขอซื้อ"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  ชื่อโครงการ / โปรเจกต์
                </label>
                <input
                  type="text"
                  value={editForm.projectName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, projectName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  placeholder="เช่น งานกรมการข้าว, งานโซลาร์ตรอน"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  รายการสินค้า / สินค้าที่ขอซื้อ
                </label>
                <textarea
                  rows={3}
                  value={editForm.itemList}
                  onChange={(e) => setEditForm(prev => ({ ...prev, itemList: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  placeholder="ระบุรายการสินค้า"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              {/* Linked POs in Edit Modal */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block font-semibold text-gray-700 mb-1">
                  ใบสั่งซื้อ (PO) ที่เชื่อมโยง ({editForm.poNumbers?.length || 0} ฉบับ)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editForm.newPoInput || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, newPoInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = editForm.newPoInput?.trim().toUpperCase();
                        if (val && !editForm.poNumbers.includes(val)) {
                          setEditForm(prev => ({
                            ...prev,
                            poNumbers: [...prev.poNumbers, val],
                            newPoInput: ''
                          }));
                        }
                      }
                    }}
                    placeholder="พิมพ์เลขที่ PO เช่น PO69-0123 แล้วกดเพิ่ม"
                    className="flex-1 px-3 py-2 border rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = editForm.newPoInput?.trim().toUpperCase();
                      if (val && !editForm.poNumbers.includes(val)) {
                        setEditForm(prev => ({
                          ...prev,
                          poNumbers: [...prev.poNumbers, val],
                          newPoInput: ''
                        }));
                      }
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shrink-0 text-xs"
                  >
                    + เพิ่ม PO
                  </button>
                </div>
                {editForm.poNumbers && editForm.poNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    {editForm.poNumbers.map((poNum: string) => (
                      <span
                        key={poNum}
                        className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-900 font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-2xs"
                      >
                        {poNum}
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            poNumbers: prev.poNumbers.filter(p => p !== poNum)
                          }))}
                          className="text-gray-400 hover:text-red-500 ml-1"
                          title="ลบ PO นี้"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">ยังไม่มี PO ผูกอยู่ (สถานะจะแสดงเป็น "รอดำเนินการ")</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-amber-800 flex items-start gap-2 text-[11px]">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  หากมีการเปลี่ยนเลขที่ PR ระบบจะทำการ<b>อัพเดตใบสั่งซื้อ (PO) ที่เกี่ยวข้องให้โดยอัตโนมัติ</b>เพื่อป้องกันข้อมูลสูญหาย
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPR(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกข้อมูล'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link PO Modal */}
      {linkingPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto flex flex-col border border-gray-200/80">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 via-indigo-50 to-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Link2 className="text-indigo-600" size={18} />
                  <span>ดึง / เชื่อมโยงใบสั่งซื้อ (PO)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  เชื่อมโยง PO ที่เปิดตามหลัง เข้ากับ PR <span className="font-mono font-bold text-blue-700">{linkingPr.prNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingPr(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* PR Info Summary */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/70 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">เลขที่ PR:</span>
                  <span className="font-mono font-bold text-gray-900">{linkingPr.prNumber}</span>
                </div>
                {linkingPr.projectName && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-500 shrink-0">โครงการ:</span>
                    <span className="font-medium text-gray-800 text-right truncate max-w-[260px]">{linkingPr.projectName}</span>
                  </div>
                )}
                {linkingPr.itemList && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-500 shrink-0">รายการ:</span>
                    <span className="text-gray-600 text-right truncate max-w-[260px]">{linkingPr.itemList}</span>
                  </div>
                )}
              </div>

              {/* 1. Direct PO Number Input */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1.5">
                  1. พิมพ์ระบุเลขที่ PO ที่ต้องการผูก
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPoInput}
                    onChange={(e) => setNewPoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPoNumber(newPoInput);
                      }
                    }}
                    placeholder="เช่น PO69-0123 หรือ PO69-E001"
                    className="flex-1 px-3 py-2 border rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPoNumber(newPoInput)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shrink-0 inline-flex items-center gap-1"
                  >
                    <Plus size={14} /> เพิ่ม PO
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  * หากเปิด PO ใน Express แล้ว สามารถพิมพ์เลข PO แล้วกดเพิ่มได้ทันที แม้ระบบยังไม่ได้ซิงค์
                </p>
              </div>

              {/* 2. Currently Linked PO Chips */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1.5">
                  รายการ PO ที่ผูกกับ PR นี้ ({linkedPoNumbers.length} ฉบับ)
                </label>
                {linkedPoNumbers.length === 0 ? (
                  <div className="p-3 text-center text-amber-700 bg-amber-50 rounded-xl border border-amber-200/80">
                    <Clock size={16} className="mx-auto mb-1 opacity-70" />
                    <p className="font-medium">ยังไม่มี PO ผูกอยู่ (สถานะจะแสดงเป็น "รอดำเนินการ / ค้างรับ")</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200/70">
                    {linkedPoNumbers.map(poNum => (
                      <span
                        key={poNum}
                        className="inline-flex items-center gap-1.5 bg-white border border-blue-300 text-blue-900 font-mono font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs"
                      >
                        <FileText size={12} className="text-blue-600" />
                        {poNum}
                        <button
                          type="button"
                          onClick={() => handleRemovePoNumber(poNum)}
                          className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                          title="ลบการผูก PO นี้"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Search & Pick from Existing POs */}
              <div className="space-y-2 border-t pt-4">
                <label className="block font-semibold text-gray-800">
                  2. หรือค้นหาและเลือกจากใบสั่งซื้อในระบบ
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={poSearchQuery}
                    onChange={(e) => handleSearchPos(e.target.value)}
                    placeholder="ค้นหาเลขที่ PO, ชื่อผู้ขาย, ชื่อโครงการ..."
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {isSearchingPos && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Suggestions List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-gray-50/50 divide-y divide-gray-100">
                  {displayedPos.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-[11px]">
                      {poSearchQuery ? 'ไม่พบใบสั่งซื้อที่ตรงกับคำค้นหา' : 'ไม่มีรายการ PO แนะนำ'}
                    </div>
                  ) : (
                    displayedPos.map((po: any) => {
                      const isAlreadyLinked = linkedPoNumbers.includes(po.poNumber);
                      return (
                        <div
                          key={po.id || po.poNumber}
                          className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 hover:bg-white p-1.5 rounded-lg transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-700 text-xs">{po.poNumber}</span>
                              {po.receiveStatus && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                  po.receiveStatus === 'Received' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {po.receiveStatus === 'Received' ? 'รับแล้ว' : po.receiveStatus}
                                </span>
                              )}
                              {po.prNumber && po.prNumber !== linkingPr.prNumber && (
                                <span className="text-[9px] text-gray-400 font-mono">
                                  (ผูกอยู่กับ {po.prNumber})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-600 truncate">
                              {po.vendorName ? `ผู้ขาย: ${po.vendorName}` : ''}
                              {po.jobName ? ` • ${po.jobName}` : ''}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isAlreadyLinked}
                            onClick={() => handleAddPoNumber(po.poNumber)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                              isAlreadyLinked
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200'
                            }`}
                          >
                            {isAlreadyLinked ? 'เลือกแล้ว' : '+ เลือก'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Help tip */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-indigo-900 text-[11px] flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-indigo-600" />
                <span>
                  เมื่อผูก PO เรียบร้อยแล้ว รายการ PR นี้จะไม่ขึ้นเป็น "ค้างรับ" อีกต่อไป และจะซิงค์สถานะการรับของไปยังหน้ารายการจัดซื้อและออเดอร์โครงการโดยอัตโนมัติ
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setLinkingPr(null)}
                disabled={isSavingPoLink}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSavePoLink}
                disabled={isSavingPoLink}
                className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingPoLink ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึกการผูก PO'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Express PR Modal */}
      {printingPr && (
        <PrintablePurchaseRequisitionModal
          isOpen={!!printingPr}
          onClose={() => setPrintingPr(null)}
          prData={{
            prNumber: printingPr.prNumber || '',
            projectName: printingPr.projectName || '',
            itemList: printingPr.itemList || '',
            requestedBy: printingPr.requestedBy || '',
            recordedAt: printingPr.recordedAt,
            note: printingPr.note,
            attachments: printingPr.attachments,
          }}
        />
      )}
    </div>
  );
}
