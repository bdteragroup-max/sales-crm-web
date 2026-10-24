'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Bell,
  RotateCcw,
  Wrench,
  Building2,
  Calendar,
  MapPin,
  Briefcase,
  Layers,
  Copy,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import RequisitionListActions from './RequisitionListActions';

export interface Requisition {
  id: string;
  requisitionNumber: string;
  date: string | Date;
  company: string;
  items: any;
  requesterId?: string | null;
  requester?: { fullName: string } | null;
  approverId?: string | null;
  approver?: { fullName: string } | null;
  requesterSignatureUrl?: string | null;
  status: string;
  requisitionType: 'PROJECT' | 'BORROW_EQUIPMENT' | string;
  projectId?: string | null;
  projectName?: string | null;
  branch?: string | null;
  destinationSite?: string | null;
  deliveryDate?: string | Date | null;
  deliveryNote?: string | null;
  receiverSignatureUrl?: string | null;
  receiverName?: string | null;
  deliveryPhotos?: any;
  returnRequestedAt?: string | Date | null;
  returnRequestNote?: string | null;
  returnRequestPhotos?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface Props {
  initialRequisitions: Requisition[];
  currentUserId: string;
  currentUserFullName?: string;
}

export default function RequisitionsClient({
  initialRequisitions,
  currentUserId,
  currentUserFullName
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'PROJECT' | 'BORROW_EQUIPMENT'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 text-xs rounded-full font-medium shadow-xs">
            <Clock size={12} className="text-amber-500" />
            <span>รออนุมัติ</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 text-xs rounded-full font-medium shadow-xs">
            <Clock size={12} className="text-blue-500" />
            <span>อนุมัติแล้ว (รอจัดของ)</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 text-xs rounded-full font-medium shadow-xs">
            <Truck size={12} className="text-purple-500" />
            <span>อยู่ระหว่างจัดส่ง</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs rounded-full font-medium shadow-xs">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>รับของแล้ว</span>
          </span>
        );
      case 'RETURN_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs rounded-full font-bold shadow-xs animate-pulse">
            <Bell size={12} className="text-amber-700" />
            <span>รอสโตร์ตรวจรับคืน</span>
          </span>
        );
      case 'PARTIALLY_RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs rounded-full font-medium shadow-xs">
            <RotateCcw size={12} className="text-indigo-500" />
            <span>คืนของบางส่วน</span>
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200/80 text-xs rounded-full font-medium shadow-xs">
            <CheckCircle2 size={12} className="text-teal-500" />
            <span>คืนสโตร์ครบแล้ว</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/80 text-xs rounded-full font-medium shadow-xs">
            <XCircle size={12} className="text-rose-500" />
            <span>ไม่อนุมัติ</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs rounded-full font-medium">
            {status}
          </span>
        );
    }
  };

  // Company Badge
  const getCompanyBadge = (comp: string) => {
    switch (comp?.toUpperCase()) {
      case 'GROUP':
        return { label: 'Group', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ELECTRIC':
        return { label: 'Electric', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'POWER':
        return { label: 'Power', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: comp || 'General', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Format Thai Date
  const formatThaiDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // KPI Counts
  const counts = useMemo(() => {
    const total = initialRequisitions.length;
    const pendingApproval = initialRequisitions.filter(r => r.status === 'PENDING_APPROVAL').length;
    const approved = initialRequisitions.filter(r => r.status === 'APPROVED' || r.status === 'DISPATCHED').length;
    const completed = initialRequisitions.filter(r => r.status === 'COMPLETED').length;
    const returnPending = initialRequisitions.filter(r => r.status === 'RETURN_PENDING').length;
    const returned = initialRequisitions.filter(r => r.status === 'RETURNED' || r.status === 'PARTIALLY_RETURNED').length;

    return {
      ALL: total,
      PENDING_APPROVAL: pendingApproval,
      APPROVED: approved,
      COMPLETED: completed,
      RETURN_PENDING: returnPending,
      RETURNED: returned,
      // Aggregates for stat cards
      pendingTotal: pendingApproval + approved,
      returnTotal: returnPending + returned
    };
  }, [initialRequisitions]);

  // Filtered List
  const filteredRequisitions = useMemo(() => {
    return initialRequisitions.filter(req => {
      // Type filter
      if (selectedType !== 'ALL' && req.requisitionType !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PENDING_APPROVAL' && req.status !== 'PENDING_APPROVAL') return false;
        if (selectedStatus === 'APPROVED' && req.status !== 'APPROVED' && req.status !== 'DISPATCHED') return false;
        if (selectedStatus === 'COMPLETED' && req.status !== 'COMPLETED') return false;
        if (selectedStatus === 'RETURN_PENDING' && req.status !== 'RETURN_PENDING') return false;
        if (selectedStatus === 'RETURNED' && req.status !== 'RETURNED' && req.status !== 'PARTIALLY_RETURNED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (req.requisitionNumber || '').toLowerCase();
        const comp = (req.company || '').toLowerCase();
        const project = (req.projectName || '').toLowerCase();
        const site = (req.destinationSite || '').toLowerCase();
        const branch = (req.branch || '').toLowerCase();
        const approver = (req.approver?.fullName || '').toLowerCase();
        const requester = (req.requester?.fullName || '').toLowerCase();

        return (
          num.includes(q) ||
          comp.includes(q) ||
          project.includes(q) ||
          site.includes(q) ||
          branch.includes(q) ||
          approver.includes(q) ||
          requester.includes(q)
        );
      }

      return true;
    });
  }, [initialRequisitions, selectedType, selectedStatus, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header (Symmetrical 2-Column Balance) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                เบิก / ยืมวัสดุและอุปกรณ์
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {filteredRequisitions.length} รายการ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              รายการขอเบิกวัสดุโครงการและยืมเครื่องมืออุปกรณ์สำหรับพนักงาน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Link
            href="/requisitions/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-md shadow-red-600/20 text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>สร้างใบเบิก/ยืมใหม่</span>
          </Link>
        </div>
      </div>

      {/* Symmetrical KPI Stat Cards Grid (4 Equal Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total */}
        <button
          onClick={() => { setSelectedStatus('ALL'); setSelectedType('ALL'); }}
          className={`p-4 sm:p-5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
            selectedStatus === 'ALL' && selectedType === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedStatus === 'ALL' && selectedType === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              ใบเบิกทั้งหมด
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              selectedStatus === 'ALL' && selectedType === 'ALL' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">{counts.ALL}</div>
            <div className={`text-[11px] mt-0.5 truncate ${selectedStatus === 'ALL' && selectedType === 'ALL' ? 'text-slate-400' : 'text-slate-400'}`}>
              โครงการ & เบิกยืมอุปกรณ์
            </div>
          </div>
        </button>

        {/* Card 2: Pending Approval & Fulfillment */}
        <button
          onClick={() => setSelectedStatus(selectedStatus === 'PENDING_APPROVAL' ? 'APPROVED' : 'PENDING_APPROVAL')}
          className={`p-4 sm:p-5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
            selectedStatus === 'PENDING_APPROVAL' || selectedStatus === 'APPROVED'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white hover:bg-amber-50/50 text-slate-800 border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedStatus === 'PENDING_APPROVAL' || selectedStatus === 'APPROVED' ? 'text-amber-100' : 'text-slate-500'}`}>
              รออนุมัติ / จัดของ
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              selectedStatus === 'PENDING_APPROVAL' || selectedStatus === 'APPROVED' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">{counts.pendingTotal}</div>
            <div className={`text-[11px] mt-0.5 truncate ${selectedStatus === 'PENDING_APPROVAL' || selectedStatus === 'APPROVED' ? 'text-amber-100' : 'text-amber-700 font-medium'}`}>
              {counts.PENDING_APPROVAL} รออนุมัติ • {counts.APPROVED} รอจัดของ
            </div>
          </div>
        </button>

        {/* Card 3: In Use / Completed */}
        <button
          onClick={() => setSelectedStatus('COMPLETED')}
          className={`p-4 sm:p-5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
            selectedStatus === 'COMPLETED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
              : 'bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedStatus === 'COMPLETED' ? 'text-emerald-100' : 'text-slate-500'}`}>
              รับของแล้ว / ใช้งาน
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              selectedStatus === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">{counts.COMPLETED}</div>
            <div className={`text-[11px] mt-0.5 truncate ${selectedStatus === 'COMPLETED' ? 'text-emerald-100' : 'text-emerald-700 font-medium'}`}>
              ส่งมอบของหน้างานแล้ว
            </div>
          </div>
        </button>

        {/* Card 4: Returns */}
        <button
          onClick={() => setSelectedStatus(counts.RETURN_PENDING > 0 ? 'RETURN_PENDING' : 'RETURNED')}
          className={`p-4 sm:p-5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
            selectedStatus === 'RETURN_PENDING' || selectedStatus === 'RETURNED'
              ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-600/20'
              : 'bg-white hover:bg-teal-50/50 text-slate-800 border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedStatus === 'RETURN_PENDING' || selectedStatus === 'RETURNED' ? 'text-teal-100' : 'text-slate-500'}`}>
              คืนสโตร์ / ตรวจรับ
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              selectedStatus === 'RETURN_PENDING' || selectedStatus === 'RETURNED' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
            }`}>
              <RotateCcw size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">{counts.returnTotal}</div>
            <div className={`text-[11px] mt-0.5 truncate ${selectedStatus === 'RETURN_PENDING' || selectedStatus === 'RETURNED' ? 'text-teal-100' : 'text-teal-700 font-medium'}`}>
              {counts.RETURN_PENDING > 0 ? `${counts.RETURN_PENDING} รอตรวจรับ • ` : ''}
              {counts.RETURNED} คืนครบแล้ว
            </div>
          </div>
        </button>
      </div>

      {/* Symmetrical Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Row 1: Search & Type Toggle (Evenly Balanced) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่ใบเบิก, โครงการ, สาขา, ไซต์งาน, ผู้อนุมัติ..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Requisition Type Segmented Control */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 self-stretch sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทุกประเภท
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('PROJECT')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === 'PROJECT'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 size={13} className="text-blue-600" />
              <span>งานโครงการ</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('BORROW_EQUIPMENT')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === 'BORROW_EQUIPMENT'
                  ? 'bg-white text-amber-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench size={13} className="text-amber-600" />
              <span>เบิกยืมสโตร์</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Filter Tabs (Symmetrical Horizontal Bar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3 no-scrollbar text-xs">
          <span className="text-slate-400 font-medium shrink-0 mr-1 hidden sm:inline">สถานะ:</span>
          
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            ทั้งหมด ({counts.ALL})
          </button>

          <button
            onClick={() => setSelectedStatus('PENDING_APPROVAL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
              selectedStatus === 'PENDING_APPROVAL'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Clock size={12} />
            <span>รออนุมัติ ({counts.PENDING_APPROVAL})</span>
          </button>

          <button
            onClick={() => setSelectedStatus('APPROVED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
              selectedStatus === 'APPROVED'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Clock size={12} />
            <span>รอจัดของ ({counts.APPROVED})</span>
          </button>

          <button
            onClick={() => setSelectedStatus('COMPLETED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
              selectedStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>รับของแล้ว ({counts.COMPLETED})</span>
          </button>

          {counts.RETURN_PENDING > 0 && (
            <button
              onClick={() => setSelectedStatus('RETURN_PENDING')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                selectedStatus === 'RETURN_PENDING'
                  ? 'bg-amber-600 text-white shadow-xs animate-none'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 animate-pulse'
              }`}
            >
              <Bell size={12} />
              <span>รอตรวจรับคืน ({counts.RETURN_PENDING})</span>
            </button>
          )}

          <button
            onClick={() => setSelectedStatus('RETURNED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
              selectedStatus === 'RETURNED'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <RotateCcw size={12} />
            <span>คืนสโตร์แล้ว ({counts.RETURNED})</span>
          </button>

          {(searchQuery || selectedType !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('ALL');
                setSelectedStatus('ALL');
              }}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-[11px] shrink-0"
            >
              <X size={12} />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Desktop Table View (Hidden on mobile / tablet < 1024px) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="w-[20%] py-4 px-5">เลขที่ใบเบิก</th>
                <th className="w-[14%] py-4 px-4">ประเภท</th>
                <th className="w-[24%] py-4 px-4">โครงการ & ปลายทาง</th>
                <th className="w-[12%] py-4 px-4">วันที่เบิก</th>
                <th className="w-[16%] py-4 px-4">สถานะ</th>
                <th className="w-[14%] py-4 px-5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRequisitions.length > 0 ? (
                filteredRequisitions.map((req) => {
                  const compBadge = getCompanyBadge(req.company);
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. Requisition Number & Company */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/requisitions/${req.id}`}
                              className="font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate"
                            >
                              {req.requisitionNumber}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber(req.requisitionNumber)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                              title="คัดลอกเลขที่ใบเบิก"
                            >
                              <Copy size={11} />
                            </button>
                            {copiedId === req.requisitionNumber && (
                              <span className="text-[10px] text-emerald-600 font-bold">คัดลอกแล้ว</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}>
                              {compBadge.label}
                            </span>
                            {req.approver?.fullName && (
                              <span className="text-[11px] text-slate-400 truncate" title={`ผู้อนุมัติ: ${req.approver.fullName}`}>
                                ผู้อนุมัติ: {req.approver.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Type */}
                      <td className="py-4 px-4">
                        {req.requisitionType === 'BORROW_EQUIPMENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/90 text-xs rounded-lg font-bold shadow-xs">
                            <Wrench size={12} className="text-amber-600" />
                            <span>เบิกยืมสโตร์</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200/90 text-xs rounded-lg font-bold shadow-xs">
                            <Building2 size={12} className="text-blue-600" />
                            <span>เบิกของโครงการ</span>
                          </span>
                        )}
                      </td>

                      {/* 3. Project & Destination */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate" title={req.projectName || '-'}>
                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{req.projectName || req.destinationSite || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {req.branch && (
                              <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium">
                                <MapPin size={10} className="text-slate-400" />
                                {req.branch}
                              </span>
                            )}
                            {req.destinationSite && req.projectName && (
                              <span className="text-slate-400 truncate">• {req.destinationSite}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Date */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{formatThaiDate(req.date || req.createdAt)}</span>
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-4 px-4">
                        {getStatusBadge(req.status)}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-4 px-5 text-right">
                        <RequisitionListActions req={req} currentUserId={currentUserId} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-sm mx-auto text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Package size={24} />
                      </div>
                      <div className="font-bold text-slate-700 text-sm">ไม่พบข้อมูลใบเบิกที่ตรงกับเงื่อนไข</div>
                      <p className="text-xs text-slate-400">
                        ลองปรับคำค้นหา หรือเลือกตัวกรองสถานะเป็น &quot;ทั้งหมด&quot; เพื่อดูรายการทั้งหมด
                      </p>
                      {(searchQuery || selectedType !== 'ALL' || selectedStatus !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedType('ALL');
                            setSelectedStatus('ALL');
                          }}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
                        >
                          ล้างตัวกรองทั้งหมด
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Responsive Cards (< 1024px) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredRequisitions.length > 0 ? (
            filteredRequisitions.map((req) => {
              const compBadge = getCompanyBadge(req.company);
              return (
                <div key={req.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                  {/* Top Bar: Requisition Number, Company, Type, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/requisitions/${req.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-red-600 transition-colors"
                        >
                          {req.requisitionNumber}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${compBadge.badge}`}>
                          {compBadge.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          req.requisitionType === 'BORROW_EQUIPMENT'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {req.requisitionType === 'BORROW_EQUIPMENT' ? 'เบิกยืมสโตร์' : 'งานโครงการ'}
                        </span>
                      </div>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  {/* Project & Branch */}
                  {(req.projectName || req.destinationSite || req.branch) && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Briefcase size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{req.projectName || req.destinationSite || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {req.branch && (
                          <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium">
                            <MapPin size={10} className="text-slate-400" />
                            {req.branch}
                          </span>
                        )}
                        {req.destinationSite && req.projectName && (
                          <span className="truncate">• {req.destinationSite}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date, Approver, and Actions Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        <span>{formatThaiDate(req.date || req.createdAt)}</span>
                      </div>
                      {req.approver?.fullName && (
                        <div className="text-slate-400">
                          ผู้อนุมัติ: {req.approver.fullName}
                        </div>
                      )}
                    </div>

                    <div>
                      <RequisitionListActions req={req} currentUserId={currentUserId} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Package size={24} />
              </div>
              <div className="font-bold text-slate-700 text-sm">ไม่พบข้อมูลใบเบิกที่ตรงกับเงื่อนไข</div>
              <p className="text-xs text-slate-400 mt-1">
                ลองปรับคำค้นหา หรือเลือกตัวกรองสถานะเป็น &quot;ทั้งหมด&quot;
              </p>
            </div>
          )}
        </div>

        {/* Footer Info Counter (Symmetrical Bottom Bar) */}
        {filteredRequisitions.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              แสดง <strong>{filteredRequisitions.length}</strong> จากทั้งหมด <strong>{initialRequisitions.length}</strong> รายการ
            </span>
            <span className="text-[11px] text-slate-400">
              อัปเดตข้อมูลล่าสุดเมื่อเข้าสู่ระบบ
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
