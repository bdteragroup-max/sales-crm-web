"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getAllTickets, getTicketStats, acceptTicket } from '@/app/actions/tickets';
import {
  LifeBuoy,
  Ticket,
  Clock,
  Activity,
  CheckCircle2,
  Zap,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ArrowUpRight,
  Download,
  RefreshCw,
  MonitorPlay,
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  BarChart3,
  ChevronRight,
  ChevronDown,
  User,
  Users,
  Flame,
  AlertTriangle,
  Bug,
  Sparkles,
  HelpCircle,
  KeyRound,
  Table,
  LayoutGrid,
  Copy,
  Check,
  ExternalLink,
  X,
  ShieldAlert,
  Eye,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// Clean emojis from strings to guarantee pure icon rendering
function stripEmojis(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{200D}]|[\u{FE0E}-\u{FE0F}]/gu, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim();
}

interface Props {
  currentUser?: any;
}

export default function TicketsManageClient({ currentUser }: Props) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters & Controls
  const [statusTab, setStatusTab] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'MY_TICKETS' | 'URGENT'>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'URGENCY' | 'PROGRESS'>('NEWEST');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        getAllTickets(),
        getTicketStats()
      ]);

      if (ticketsRes.success && ticketsRes.data) setTickets(ticketsRes.data);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
    } catch (e) {
      console.error("fetchData error:", e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleCopyTicketNumber = (e: React.MouseEvent, ticketNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(ticketNumber);
    setCopiedId(ticketNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAccept = async (e: React.MouseEvent, id: string, ticketNumber: string) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await Swal.fire({
      title: 'ยืนยันการรับงาน',
      text: `คุณต้องการรับเรื่อง ${ticketNumber} ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, รับงานเลย',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'rounded-xl font-bold px-4 py-2 text-sm',
        cancelButton: 'rounded-xl font-semibold px-4 py-2 text-sm'
      }
    });

    if (result.isConfirmed) {
      const res = await acceptTicket(id);
      if (res.success) {
        Swal.fire({
          title: 'รับงานสำเร็จ!',
          text: 'ระบบได้บันทึกคุณเป็นผู้ดูแลงานนี้เรียบร้อยแล้ว',
          icon: 'success',
          confirmButtonColor: '#dc2626',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-2xl'
          }
        });
        fetchData();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'เกิดข้อผิดพลาดในการรับงาน',
          icon: 'error',
          confirmButtonColor: '#dc2626',
          customClass: {
            popup: 'rounded-2xl'
          }
        });
      }
    }
  };

  const handleExportExcel = () => {
    if (!filteredTickets || filteredTickets.length === 0) return;

    const exportData = filteredTickets.map(t => ({
      'Ticket Number': t.ticketNumber,
      'Title': stripEmojis(t.title),
      'Category': t.category,
      'Urgency': t.urgency,
      'Status': t.status,
      'Progress (%)': t.progressPercent || 0,
      'Reporter': stripEmojis(t.reporter?.fullName ?? t.reporterName ?? 'Unknown'),
      'Reporter Role/Email': t.reporter?.role ?? t.reporterEmail ?? '',
      'Assignee': stripEmojis(t.assignee?.fullName || 'Unassigned'),
      'Created Date': new Date(t.createdAt).toLocaleDateString('th-TH'),
      'Resolved Date': t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString('th-TH') : '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Support Tickets");
    XLSX.writeFile(wb, `BD_Tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Counts for tabs & badges
  const counts = useMemo(() => {
    const total = tickets.length;
    const submitted = tickets.filter(t => t.status === 'SUBMITTED').length;
    const inProgress = tickets.filter(t => t.status === 'ACKNOWLEDGED' || t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter(t => t.status === 'RESOLVED').length;
    const myTickets = currentUser?.id ? tickets.filter(t => t.assigneeId === currentUser.id).length : 0;
    const urgent = tickets.filter(t => t.urgency === 'CRITICAL' || t.urgency === 'HIGH').length;

    return { total, submitted, inProgress, resolved, myTickets, urgent };
  }, [tickets, currentUser]);

  // Filtered & Sorted Tickets
  const filteredTickets = useMemo(() => {
    const result = tickets.filter(t => {
      // 1. Status Tab
      if (statusTab === 'NEW' && t.status !== 'SUBMITTED') return false;
      if (statusTab === 'IN_PROGRESS' && t.status !== 'ACKNOWLEDGED' && t.status !== 'IN_PROGRESS') return false;
      if (statusTab === 'RESOLVED' && t.status !== 'RESOLVED') return false;
      if (statusTab === 'MY_TICKETS') {
        if (!currentUser?.id || t.assigneeId !== currentUser.id) return false;
      }
      if (statusTab === 'URGENT') {
        if (t.urgency !== 'CRITICAL' && t.urgency !== 'HIGH') return false;
      }

      // 2. Urgency Dropdown
      if (urgencyFilter !== 'ALL' && t.urgency !== urgencyFilter) return false;

      // 3. Category Dropdown
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (t.ticketNumber || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const reporter = (t.reporter?.fullName ?? t.reporterName ?? '').toLowerCase();
        const assignee = (t.assignee?.fullName ?? '').toLowerCase();

        return num.includes(q) || title.includes(q) || desc.includes(q) || reporter.includes(q) || assignee.includes(q);
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'PROGRESS') {
        return (b.progressPercent || 0) - (a.progressPercent || 0);
      }
      if (sortBy === 'URGENCY') {
        const weights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (weights[b.urgency] || 0) - (weights[a.urgency] || 0);
      }
      return 0;
    });

    return result;
  }, [tickets, statusTab, urgencyFilter, categoryFilter, searchQuery, sortBy, currentUser]);

  const hasActiveFilters = statusTab !== 'ALL' || urgencyFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setStatusTab('ALL');
    setUrgencyFilter('ALL');
    setCategoryFilter('ALL');
    setSearchQuery('');
    setSortBy('NEWEST');
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>รอดำเนินการ</span>
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/70 shadow-2xs">
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>รับเรื่องแล้ว</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>กำลังแก้ไข</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>ปิดงานแล้ว</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Category Badge Helper
  const renderCategoryBadge = (category: string) => {
    switch (category) {
      case 'BUG':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
            <Bug className="w-3 h-3 text-rose-500" />
            <span>Bug</span>
          </span>
        );
      case 'FEATURE_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Feature</span>
          </span>
        );
      case 'QUESTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <HelpCircle className="w-3 h-3 text-emerald-500" />
            <span>Question</span>
          </span>
        );
      case 'ACCOUNT_ACCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
            <KeyRound className="w-3 h-3 text-purple-500" />
            <span>Access</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200/60">
            <Layers className="w-3 h-3 text-slate-500" />
            <span>Other</span>
          </span>
        );
    }
  };

  // Urgency Badge Helper
  const renderUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Critical</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Flame className="w-3 h-3 text-amber-600" />
            <span>High</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>Medium</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Check className="w-3 h-3 text-slate-500" />
            <span>Low</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 md:p-8 space-y-6">
      {/* 1. Executive Hero Header */}
      <header className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Area */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-red-500/20 text-white flex items-center justify-center shrink-0">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Link href="/bd/dashboard" className="hover:text-red-600 transition-colors">Business Development</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800">ระบบรับแจ้งปัญหา (Support & Helpdesk)</span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  จัดการปัญหาระบบ BD
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Support Hub
                </span>
              </div>
            </div>
          </div>

          {/* Action Links & Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Navigation Pill Strip */}
            <div className="h-9 inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 shadow-2xs">
              <Link
                href="/bd/dashboard"
                title="แดชบอร์ด"
                className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">แดชบอร์ด</span>
              </Link>
              <Link
                href="/bd/kanban"
                title="กระดานงาน"
                className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                <KanbanSquare className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">กระดานงาน</span>
              </Link>
              <Link
                href="/bd/my-work"
                title="งานของฉัน"
                className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">งานของฉัน</span>
              </Link>
              <Link
                href="/bd/reports"
                title="รายงานและสถิติ"
                className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">รายงาน</span>
              </Link>
            </div>

            {/* TV Mode Link */}
            <Link
              href="/bd/tickets/tv"
              target="_blank"
              title="เปิด TV Mode แสดงผลหน้าจอแดชบอร์ด"
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all active:scale-95"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TV Mode</span>
            </Link>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              title="รีเฟรชข้อมูล"
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-slate-500 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              title="ส่งออกรายงาน Excel"
              className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Interactive KPI Executive Stat Cards (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1. Total Tickets */}
        <button
          onClick={() => setStatusTab('ALL')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 shadow-2xs flex flex-col justify-between ${statusTab === 'ALL'
            ? 'ring-2 ring-red-500/30 border-red-500 bg-red-50/10'
            : 'border-slate-200/80 hover:border-slate-300'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">ปัญหาทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {stats ? stats.total : counts.total}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">รายการทั้งหมดในระบบ</div>
        </button>

        {/* 2. New / Submitted */}
        <button
          onClick={() => setStatusTab('NEW')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 shadow-2xs flex flex-col justify-between ${statusTab === 'NEW'
            ? 'ring-2 ring-amber-500/40 border-amber-500 bg-amber-50/20'
            : 'border-slate-200/80 hover:border-amber-200'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700">รอดำเนินการ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-700 tracking-tight">
            {stats ? stats.new : counts.submitted}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">ยังไม่มีผู้รับเรื่อง</div>
        </button>

        {/* 3. In Progress */}
        <button
          onClick={() => setStatusTab('IN_PROGRESS')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 shadow-2xs flex flex-col justify-between ${statusTab === 'IN_PROGRESS'
            ? 'ring-2 ring-blue-500/40 border-blue-500 bg-blue-50/20'
            : 'border-slate-200/80 hover:border-blue-200'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700">กำลังแก้ไข</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">
            {stats ? stats.inProgress : counts.inProgress}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">กำลังดำเนินการอยู่</div>
        </button>

        {/* 4. Resolved */}
        <button
          onClick={() => setStatusTab('RESOLVED')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 shadow-2xs flex flex-col justify-between ${statusTab === 'RESOLVED'
            ? 'ring-2 ring-emerald-500/40 border-emerald-500 bg-emerald-50/20'
            : 'border-slate-200/80 hover:border-emerald-200'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700">ปิดงานแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
            {stats ? stats.resolved : counts.resolved}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">แก้ไขปัญหาเสร็จสมบูรณ์</div>
        </button>

        {/* 5. Avg Resolution Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700">เวลาเฉลี่ยปิดงาน</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-700 tracking-tight">
            {stats?.avgResolutionHours ?? '0'} <span className="text-sm font-semibold text-purple-500">ชม.</span>
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">เวลาแก้ไขปัญหาเฉลี่ย</div>
        </div>
      </div>

      {/* 3. Modern Filter & Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3.5">
        {/* Row 1: Status Filter Tabs & View Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setStatusTab('ALL')}
              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${statusTab === 'ALL'
                ? 'bg-white text-red-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>ทั้งหมด</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-700">{counts.total}</span>
            </button>

            <button
              onClick={() => setStatusTab('NEW')}
              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${statusTab === 'NEW'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Clock className="w-3 h-3 text-amber-600" />
              <span>รอดำเนินการ</span>
              {counts.submitted > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">{counts.submitted}</span>
              )}
            </button>

            <button
              onClick={() => setStatusTab('IN_PROGRESS')}
              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${statusTab === 'IN_PROGRESS'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Activity className="w-3 h-3 text-blue-600" />
              <span>กำลังแก้ไข</span>
              {counts.inProgress > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">{counts.inProgress}</span>
              )}
            </button>

            <button
              onClick={() => setStatusTab('RESOLVED')}
              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${statusTab === 'RESOLVED'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>ปิดงานแล้ว</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100/70 text-emerald-800 font-bold">{counts.resolved}</span>
            </button>

            {currentUser && (
              <button
                onClick={() => setStatusTab('MY_TICKETS')}
                className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${statusTab === 'MY_TICKETS'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <User className="w-3 h-3 text-purple-600" />
                <span>งานของฉัน</span>
                {counts.myTickets > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">{counts.myTickets}</span>
                )}
              </button>
            )}

            <button
              onClick={() => setStatusTab('URGENT')}
              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${statusTab === 'URGENT'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Flame className="w-3 h-3 text-rose-600" />
              <span>ด่วนพิเศษ</span>
              {counts.urgent > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">{counts.urgent}</span>
              )}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="h-9 inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 shadow-2xs">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${viewMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Table View"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all ${viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Grid / Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">การ์ด</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search, Category, Urgency, Sort */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหา Ticket ID, หัวข้อปัญหา, ผู้แจ้ง, ผู้รับผิดชอบ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl pl-8 pr-7 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer shadow-2xs appearance-none"
            >
              <option value="ALL">ทุกหมวดหมู่ (Category)</option>
              <option value="BUG">Bug (ข้อผิดพลาด)</option>
              <option value="FEATURE_REQUEST">Feature (ขอฟังก์ชันเพิ่ม)</option>
              <option value="QUESTION">Question (คำถามการใช้งาน)</option>
              <option value="ACCOUNT_ACCESS">Account Access (สิทธิ์เข้าถึง)</option>
              <option value="OTHER">Other (อื่น ๆ)</option>
            </select>
            <Layers className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Urgency Dropdown */}
          <div className="relative">
            <select
              value={urgencyFilter}
              onChange={e => setUrgencyFilter(e.target.value)}
              className="h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl pl-8 pr-7 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer shadow-2xs appearance-none"
            >
              <option value="ALL">ทุกระดับความสำคัญ (Urgency)</option>
              <option value="CRITICAL">Critical (ฉุกเฉินที่สุด)</option>
              <option value="HIGH">High (เร่งด่วน)</option>
              <option value="MEDIUM">Medium (ปานกลาง)</option>
              <option value="LOW">Low (ปกติ)</option>
            </select>
            <ShieldAlert className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl pl-8 pr-7 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer shadow-2xs appearance-none"
            >
              <option value="NEWEST">เรียง: ล่าสุด (Newest)</option>
              <option value="OLDEST">เรียง: เก่าสุด (Oldest)</option>
              <option value="URGENCY">เรียง: ความสำคัญ (Urgency)</option>
              <option value="PROGRESS">เรียง: ความก้าวหน้า (Progress)</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition-all shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Ticket Content (Table View or Grid View) */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm mx-auto mb-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">กำลังโหลดข้อมูลรายการปัญหา...</h3>
          <p className="text-xs text-slate-500 mt-1">ระบบกำลังซิงก์ข้อมูลสถานะและภาระงานล่าสุด</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">ไม่พบรายการ Ticket ที่ตรงกับเงื่อนไข</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ไม่พบข้อมูลตามตัวกรองหรือคำค้นหาที่คุณระบุ ลองเปลี่ยนเงื่อนไขหรือกดปุ่มด้านล่างเพื่อล้างตัวกรอง
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-500/20 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      ) : viewMode === 'TABLE' ? (
        /* ============================================================== */
        /* VIEW: DENSE TABLE                                              */
        /* ============================================================== */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Ticket ID</th>
                  <th className="px-5 py-3.5 min-w-[280px]">หัวข้อปัญหา</th>
                  <th className="px-5 py-3.5">ผู้แจ้ง</th>
                  <th className="px-4 py-3.5 text-center">หมวดหมู่ / ความเร่งด่วน</th>
                  <th className="px-4 py-3.5 text-center">สถานะ</th>
                  <th className="px-5 py-3.5">ผู้รับผิดชอบ</th>
                  <th className="px-5 py-3.5 text-right">แอคชั่น</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTickets.map(ticket => {
                  const isAssignedToMe = currentUser?.id && ticket.assigneeId === currentUser.id;
                  const isUnassigned = ticket.status === 'SUBMITTED';

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ticket Number & Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-red-600 bg-red-50/80 px-2 py-0.5 rounded-md border border-red-100">
                            {ticket.ticketNumber}
                          </span>
                          <button
                            onClick={e => handleCopyTicketNumber(e, ticket.ticketNumber)}
                            title="คัดลอก Ticket ID"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            {copiedId === ticket.ticketNumber ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(ticket.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>

                      {/* Title & Description & Progress */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/bd/tickets/${ticket.id}`}
                          className="font-bold text-slate-900 hover:text-red-600 transition-colors line-clamp-1 text-xs"
                        >
                          {stripEmojis(ticket.title)}
                        </Link>
                        {ticket.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {stripEmojis(ticket.description)}
                          </div>
                        )}
                        {ticket.progressPercent > 0 && ticket.status !== 'RESOLVED' && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${ticket.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-blue-600">{ticket.progressPercent}%</span>
                          </div>
                        )}
                      </td>

                      {/* Reporter */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10.5px] shrink-0 border border-slate-200">
                            {stripEmojis(ticket.reporter?.fullName ?? ticket.reporterName ?? 'U').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                              <span>{stripEmojis(ticket.reporter?.fullName ?? ticket.reporterName ?? 'Unknown')}</span>
                              {!ticket.reporterId && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  External
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-400">
                              {ticket.reporter?.role ?? ticket.reporterEmail ?? ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Urgency */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          {renderCategoryBadge(ticket.category)}
                          {renderUrgencyBadge(ticket.urgency)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        {renderStatusBadge(ticket.status)}
                      </td>

                      {/* Assignee */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {ticket.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-red-200">
                              {stripEmojis(ticket.assignee.fullName).charAt(0)}
                            </div>
                            <div className="font-medium text-slate-800 text-xs">
                              {stripEmojis(ticket.assignee.fullName)}
                              {isAssignedToMe && (
                                <span className="ml-1 text-[10px] font-bold text-red-600">(คุณ)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50/70 border border-dashed border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>ยังไม่มีผู้รับ</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-medium">
                        {isUnassigned ? (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/bd/tickets/${ticket.id}`}
                              className="h-8 inline-flex items-center gap-1 px-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-2xs"
                            >
                              <span>รายละเอียด</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={e => handleAccept(e, ticket.id, ticket.ticketNumber)}
                              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-sm shadow-red-500/20 transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>รับงาน</span>
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/bd/tickets/${ticket.id}`}
                            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/70 transition-all shadow-2xs"
                          >
                            <span>จัดการงาน</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VIEW: CARD / GRID                                              */
        /* ============================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.map(ticket => {
            const isAssignedToMe = currentUser?.id && ticket.assigneeId === currentUser.id;
            const isUnassigned = ticket.status === 'SUBMITTED';

            return (
              <div
                key={ticket.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                {/* Card Header: Ticket Number, Urgency, Category */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-red-600 bg-red-50/80 px-2 py-0.5 rounded-md border border-red-100">
                        {ticket.ticketNumber}
                      </span>
                      <button
                        onClick={e => handleCopyTicketNumber(e, ticket.ticketNumber)}
                        title="คัดลอก Ticket ID"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {copiedId === ticket.ticketNumber ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {renderCategoryBadge(ticket.category)}
                      {renderUrgencyBadge(ticket.urgency)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <Link
                    href={`/bd/tickets/${ticket.id}`}
                    className="font-bold text-sm text-slate-900 hover:text-red-600 transition-colors line-clamp-2 block"
                  >
                    {stripEmojis(ticket.title)}
                  </Link>

                  {ticket.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {stripEmojis(ticket.description)}
                    </p>
                  )}

                  {/* Progress Bar (if in progress) */}
                  {ticket.progressPercent > 0 && ticket.status !== 'RESOLVED' && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-600">ความคืบหน้า</span>
                        <span className="text-blue-600 font-bold">{ticket.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${ticket.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Meta & Footer */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  {/* Reporter & Assignee Rows */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {/* Reporter */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200">
                        {stripEmojis(ticket.reporter?.fullName ?? ticket.reporterName ?? 'U').charAt(0)}
                      </div>
                      <div className="truncate max-w-[130px]">
                        <div className="font-semibold text-slate-800 truncate text-[11px]">
                          {stripEmojis(ticket.reporter?.fullName ?? ticket.reporterName ?? 'Unknown')}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">ผู้แจ้ง</div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {renderStatusBadge(ticket.status)}
                    </div>
                  </div>

                  {/* Assignee Row */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">ผู้รับผิดชอบ:</span>
                      {ticket.assignee ? (
                        <span className="font-semibold text-slate-700 text-[11px]">
                          {stripEmojis(ticket.assignee.fullName)}
                          {isAssignedToMe && <span className="text-red-600 font-bold ml-1">(คุณ)</span>}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold text-[11px]">ยังไม่มีผู้รับ</span>
                      )}
                    </div>

                    <div className="text-[10.5px] text-slate-400">
                      {new Date(ticket.createdAt).toLocaleDateString('th-TH', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    {isUnassigned ? (
                      <>
                        <Link
                          href={`/bd/tickets/${ticket.id}`}
                          className="h-9 flex-1 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-2xs"
                        >
                          <span>ดูรายละเอียด</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={e => handleAccept(e, ticket.id, ticket.ticketNumber)}
                          className="h-9 flex-1 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-sm shadow-red-500/20 transition-all active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>รับงาน</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/bd/tickets/${ticket.id}`}
                        className="h-9 w-full inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/70 transition-all shadow-2xs"
                      >
                        <span>จัดการงานและอัปเดต</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
