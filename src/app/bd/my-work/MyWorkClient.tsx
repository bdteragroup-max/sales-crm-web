"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { UnifiedWorkItem } from '@/app/actions/bd-my-work';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Ticket,
  Flame,
  Search,
  ArrowUpRight,
  FolderKanban,
  LayoutGrid,
  List,
  Calendar,
  X,
  RefreshCw,
  Briefcase,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface MyWorkClientProps {
  initialData: UnifiedWorkItem[];
  error?: string;
  currentUser?: {
    id: string;
    fullName?: string | null;
    role?: string | null;
  } | null;
}

export default function MyWorkClient({ initialData, error, currentUser }: MyWorkClientProps) {
  const [data] = useState<UnifiedWorkItem[]>(initialData);
  const [filterType, setFilterType] = useState<'ALL' | 'PROJECT' | 'TASK' | 'TICKET' | 'OVERDUE' | 'URGENT'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');
  const [selectedDueStatus, setSelectedDueStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'newest' | 'title'>('priority');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-8 flex items-center justify-center">
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-sm max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-brand-red text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-2xs"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // 1. Overall KPI Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const total = data.length;
    const projectsCount = data.filter(d => d.source === 'PROJECT').length;
    const tasksCount = data.filter(d => d.source === 'TASK').length;
    const ticketsCount = data.filter(d => d.source === 'TICKET').length;

    const overdueCount = data.filter(d => d.deadline && new Date(d.deadline) < now).length;
    const dueSoonCount = data.filter(d => {
      if (!d.deadline) return false;
      const dead = new Date(d.deadline);
      return dead >= now && dead <= threeDaysFromNow;
    }).length;

    const urgentCount = data.filter(d => {
      const u = (d.urgency || '').toUpperCase();
      return u.includes('URGENT') || u.includes('HIGH') || u.includes('ด่วนมาก') || u.includes('CRITICAL');
    }).length;

    return {
      total,
      projectsCount,
      tasksCount,
      ticketsCount,
      overdueCount,
      dueSoonCount,
      urgentCount
    };
  }, [data]);

  // 2. Filtered & Sorted Data
  const filteredData = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return data.filter(item => {
      // Source / Category Filter
      if (filterType === 'PROJECT' && item.source !== 'PROJECT') return false;
      if (filterType === 'TASK' && item.source !== 'TASK') return false;
      if (filterType === 'TICKET' && item.source !== 'TICKET') return false;
      if (filterType === 'OVERDUE') {
        if (!item.deadline || new Date(item.deadline) >= now) return false;
      }
      if (filterType === 'URGENT') {
        const u = (item.urgency || '').toUpperCase();
        const isUrgent = u.includes('URGENT') || u.includes('HIGH') || u.includes('ด่วนมาก') || u.includes('CRITICAL');
        if (!isUrgent) return false;
      }

      // Urgency Filter
      if (selectedUrgency !== 'ALL') {
        const u = (item.urgency || '').toLowerCase();
        if (selectedUrgency === 'Urgent' && !u.includes('urgent') && !u.includes('ด่วนมาก') && !u.includes('critical')) return false;
        if (selectedUrgency === 'High' && !u.includes('high') && !u.includes('ด่วน') && u.includes('ด่วนมาก')) return false;
        if (selectedUrgency === 'Normal' && (u.includes('urgent') || u.includes('high') || u.includes('ด่วน'))) return false;
      }

      // Due Date Status Filter
      if (selectedDueStatus !== 'ALL') {
        if (selectedDueStatus === 'OVERDUE') {
          if (!item.deadline || new Date(item.deadline) >= now) return false;
        } else if (selectedDueStatus === 'DUE_SOON') {
          if (!item.deadline) return false;
          const dead = new Date(item.deadline);
          if (dead < now || dead > threeDaysFromNow) return false;
        } else if (selectedDueStatus === 'NO_DEADLINE') {
          if (item.deadline) return false;
        }
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchParent = item.parentName?.toLowerCase().includes(q);
        const matchStatus = item.status?.toLowerCase().includes(q);
        if (!matchTitle && !matchParent && !matchStatus) return false;
      }

      return true;
    }).sort((a, b) => {
      const nowTime = now.getTime();
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : null;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : null;

      if (sortBy === 'deadline') {
        if (!aDeadline) return 1;
        if (!bDeadline) return -1;
        return aDeadline - bDeadline;
      }

      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }

      // Default: Priority (Overdue -> Urgent -> Nearest Deadline -> Newest)
      const aIsOverdue = aDeadline && aDeadline < nowTime;
      const bIsOverdue = bDeadline && bDeadline < nowTime;
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      const urgencyScore = (u: string) => {
        const up = (u || '').toUpperCase();
        if (up.includes('URGENT') || up.includes('HIGH') || up.includes('ด่วนมาก') || up.includes('CRITICAL')) return 3;
        if (up.includes('MEDIUM') || up.includes('ด่วน')) return 2;
        return 1;
      };

      const aU = urgencyScore(a.urgency);
      const bU = urgencyScore(b.urgency);
      if (aU !== bU) return bU - aU;

      if (aDeadline && bDeadline) return aDeadline - bDeadline;
      if (aDeadline && !bDeadline) return -1;
      if (!aDeadline && bDeadline) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data, filterType, selectedUrgency, selectedDueStatus, search, sortBy]);

  // Helpers
  const renderSourceBadge = (source: UnifiedWorkItem['source']) => {
    switch (source) {
      case 'PROJECT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>โครงการ (Project)</span>
          </span>
        );
      case 'TASK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>งานย่อย (Task)</span>
          </span>
        );
      case 'TICKET':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">
            <Ticket className="w-3.5 h-3.5 text-purple-600" />
            <span>ทิคเก็ต (Ticket)</span>
          </span>
        );
      default:
        return null;
    }
  };

  const renderUrgencyBadge = (urgency: string) => {
    const u = (urgency || '').toUpperCase();
    if (u.includes('URGENT') || u.includes('HIGH') || u.includes('ด่วนมาก') || u.includes('CRITICAL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
          <Flame className="w-3.5 h-3.5 text-rose-600" />
          <span>ด่วนมาก</span>
        </span>
      );
    }
    if (u.includes('MEDIUM') || u.includes('ด่วน')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>ด่วน</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        ปกติ
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('PROGRESS') || s === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          กำลังทำ
        </span>
      );
    }
    if (s.includes('PENDING') || s.includes('REVIEW')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          รอดำเนินการ
        </span>
      );
    }
    if (s.includes('OPEN') || s.includes('WAITING')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          เปิดอยู่
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 whitespace-nowrap">
        {status}
      </span>
    );
  };

  const renderDeadlineIndicator = (deadlineStr: Date | null, createdAtStr: Date) => {
    if (!deadlineStr) {
      const createdFormatted = new Date(createdAtStr).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
      return (
        <span className="inline-flex items-center gap-1.5 text-2xs text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg whitespace-nowrap">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>เปิดเมื่อ {createdFormatted}</span>
        </span>
      );
    }

    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateFormatted = deadline.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-2xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>เลยกำหนด {Math.abs(diffDays)} วัน ({dateFormatted})</span>
        </span>
      );
    }

    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-2xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>ครบกำหนดวันนี้ ({dateFormatted})</span>
        </span>
      );
    }

    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>เหลืออีก {diffDays} วัน ({dateFormatted})</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-2xs text-slate-600 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg whitespace-nowrap">
        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
        <span>กำหนดส่ง: {dateFormatted}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800">
      
      {/* 1. Symmetrical Top Header */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Breadcrumb & Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                <CheckSquare className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span>ธุรกิจและการพัฒนา (BD)</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-700 font-semibold">งานของฉัน (My Work)</span>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                    งานของฉัน
                  </h1>
                  {currentUser?.fullName && (
                    <span className="text-xs text-slate-500">
                      ({currentUser.fullName})
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 whitespace-nowrap">
                    {metrics.total} งานในความรับผิดชอบ
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Navigation Cluster */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="inline-flex p-1 bg-slate-100/90 rounded-xl text-xs font-medium text-slate-600 border border-slate-200/50">
                <Link
                  href="/bd/dashboard"
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="แดชบอร์ดภาพรวม"
                >
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>แดชบอร์ด BD</span>
                </Link>
                <Link
                  href="/bd/kanban"
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="กระดานงาน Kanban"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
                  <span>กระดานงาน</span>
                </Link>
                <Link
                  href="/bd/tickets"
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="จัดการทิคเก็ต"
                >
                  <Ticket className="w-3.5 h-3.5 text-slate-500" />
                  <span>ทิคเก็ต</span>
                </Link>
              </div>

              <Link
                href="/bd/intake"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-sm shadow-red-500/25 hover:shadow-md transition-all whitespace-nowrap shrink-0 active:scale-95"
              >
                <span>+ สร้างบรีฟใหม่</span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 2. Symmetrical 4-Card Personal Summary KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* KPI Card 1: Total Assigned */}
          <button
            onClick={() => setFilterType('ALL')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${
              filterType === 'ALL'
                ? 'border-slate-400 ring-2 ring-slate-400/20 bg-slate-50/40'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">งานทั้งหมดที่ดูแล</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-slate-900 data">{metrics.total}</span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>

            <div className="text-2xs text-slate-500 font-medium truncate pt-1">
              <span>{metrics.projectsCount} โครงการ · {metrics.tasksCount} งานย่อย · {metrics.ticketsCount} ทิคเก็ต</span>
            </div>
          </button>

          {/* KPI Card 2: Overdue */}
          <button
            onClick={() => setFilterType('OVERDUE')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${
              filterType === 'OVERDUE'
                ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                : 'border-slate-200/80 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">เกินกำหนดส่ง</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-rose-900 data">{metrics.overdueCount}</span>
              {metrics.overdueCount > 0 && (
                <span className="text-xs font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              )}
            </div>

            <div className="text-2xs text-rose-700 font-medium truncate pt-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>เลยกำหนดแล้ว ต้องเร่งดำเนินการ</span>
            </div>
          </button>

          {/* KPI Card 3: Due Soon */}
          <button
            onClick={() => {
              setSelectedDueStatus('DUE_SOON');
              setFilterType('ALL');
            }}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${
              selectedDueStatus === 'DUE_SOON'
                ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
                : 'border-slate-200/80 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">ครบกำหนดเร็วๆ นี้</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-amber-900 data">{metrics.dueSoonCount}</span>
              <span className="text-xs text-amber-600 font-medium">ภายใน 3 วัน</span>
            </div>

            <div className="text-2xs text-amber-700 font-medium truncate pt-1">
              <span>งานที่มีกำหนดส่งในระยะใกล้</span>
            </div>
          </button>

          {/* KPI Card 4: Urgent & Critical */}
          <button
            onClick={() => setFilterType('URGENT')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${
              filterType === 'URGENT'
                ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20'
                : 'border-slate-200/80 hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">ความเร่งด่วนสูง</span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-105 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-orange-900 data">{metrics.urgentCount}</span>
              <span className="text-xs font-medium text-orange-600">ด่วนมาก</span>
            </div>

            <div className="text-2xs text-orange-700 font-medium truncate pt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>โครงการ/งานระดับด่วนมาก</span>
            </div>
          </button>

        </div>

        {/* 3. Symmetrical Toolbar & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 md:p-5 space-y-4">
          
          {/* Row 1: Source Filter Tabs & View Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ทั้งหมด</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-2xs">
                  {metrics.total}
                </span>
              </button>

              <button
                onClick={() => setFilterType('PROJECT')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'PROJECT'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>โครงการ</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-2xs">
                  {metrics.projectsCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType('TASK')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'TASK'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>งานย่อย</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-2xs">
                  {metrics.tasksCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType('TICKET')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'TICKET'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-purple-600'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>ทิคเก็ต</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-2xs">
                  {metrics.ticketsCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType('OVERDUE')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'OVERDUE'
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                <span>เกินกำหนด</span>
                {metrics.overdueCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-2xs font-bold">
                    {metrics.overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterType('URGENT')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'URGENT'
                    ? 'bg-white text-orange-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-orange-600'
                }`}
              >
                <span>ด่วนมาก</span>
                {metrics.urgentCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700 text-2xs font-bold">
                    {metrics.urgentCount}
                  </span>
                )}
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองการ์ด (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองตาราง (Table)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Row 2: Search, Urgency, Due Status, Sorter (12-Column Symmetrical Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            
            {/* Search: 5 Cols */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่องาน, โครงการหลัก, หรือสถานะ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Urgency: 2 Cols */}
            <div className="md:col-span-2">
              <select
                value={selectedUrgency}
                onChange={e => setSelectedUrgency(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer"
              >
                <option value="ALL">ทุกความเร่งด่วน</option>
                <option value="Urgent">ด่วนมาก (Urgent)</option>
                <option value="High">ด่วน (High)</option>
                <option value="Normal">ปกติ (Normal)</option>
              </select>
            </div>

            {/* Due Status: 2 Cols */}
            <div className="md:col-span-2">
              <select
                value={selectedDueStatus}
                onChange={e => setSelectedDueStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer"
              >
                <option value="ALL">ทุกสถานะกำหนดส่ง</option>
                <option value="OVERDUE">เกินกำหนดส่ง (Overdue)</option>
                <option value="DUE_SOON">ครบกำหนดใน 3 วัน</option>
                <option value="NO_DEADLINE">ไม่มีกำหนดส่ง</option>
              </select>
            </div>

            {/* Sorter & Reset: 3 Cols */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer"
              >
                <option value="priority">เรียงตามความสำคัญ (Priority)</option>
                <option value="deadline">กำหนดส่งใกล้สุด</option>
                <option value="newest">สร้างล่าสุด</option>
                <option value="title">ชื่อ ก-ฮ</option>
              </select>

              {(filterType !== 'ALL' || selectedUrgency !== 'ALL' || selectedDueStatus !== 'ALL' || search) && (
                <button
                  onClick={() => {
                    setFilterType('ALL');
                    setSelectedUrgency('ALL');
                    setSelectedDueStatus('ALL');
                    setSearch('');
                  }}
                  className="p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shrink-0"
                  title="รีเซ็ตตัวกรองทั้งหมด"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Symmetrical Result Counter */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>
              แสดง <strong className="text-slate-900 font-semibold">{filteredData.length}</strong> จาก {data.length} รายการ
            </span>
            {filterType !== 'ALL' && (
              <span className="text-brand-red font-medium text-2xs">
                กำลังกรอง: {filterType}
              </span>
            )}
          </div>

        </div>

        {/* 4. Main Content: Grid vs Table */}
        {filteredData.length === 0 ? (
          /* Empty State */
          data.length === 0 ? (
            /* Celebration: Zero tasks assigned */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
                <CheckCircle2 className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">ยอดเยี่ยมมาก! ไม่มีงานค้าง</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
                คุณจัดการงาน โครงการ และทิคเก็ตทั้งหมดในความรับผิดชอบเรียบร้อยแล้ว
              </p>
              <div className="mt-6 flex items-center justify-center gap-2.5">
                <Link
                  href="/bd/dashboard"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  ดูแดชบอร์ดโครงการทั้งหมด
                </Link>
                <Link
                  href="/bd/intake"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-red hover:bg-red-700 rounded-xl transition-colors shadow-2xs"
                >
                  + สร้างบรีฟงานใหม่
                </Link>
              </div>
            </div>
          ) : (
            /* No search results */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-10 text-center max-w-md mx-auto">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">ไม่พบงานที่ตรงกับเงื่อนไขการค้นหา</h3>
              <p className="text-2xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูงานทั้งหมด</p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setSelectedUrgency('ALL');
                  setSelectedDueStatus('ALL');
                  setSearch('');
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )
        ) : viewMode === 'grid' ? (
          /* Symmetrical Cards View (3 Columns with generous 24px-28px gap) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
            {filteredData.map((item) => {
              return (
                <div
                  key={`${item.source}-${item.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs h-full"
                >
                  {/* Card Main Body */}
                  <div className="p-5 pb-3.5 flex-1 flex flex-col justify-between space-y-3">
                    
                    {/* Row 1: Source Badge (Left) & Status Badge (Right) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {renderSourceBadge(item.source)}
                        {renderUrgencyBadge(item.urgency)}
                      </div>
                      <div className="shrink-0">
                        {renderStatusBadge(item.status)}
                      </div>
                    </div>

                    {/* Row 2: Title & Parent Context */}
                    <div>
                      <Link
                        href={item.linkUrl}
                        className="text-base font-bold text-slate-900 group-hover:text-brand-red transition-colors line-clamp-2 tracking-tight leading-snug block"
                      >
                        {item.title}
                      </Link>
                      
                      {item.parentName && (
                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                          <span className="text-slate-400 font-medium">ภายใต้:</span>
                          <span className="font-semibold text-slate-700 truncate">{item.parentName}</span>
                        </p>
                      )}
                    </div>

                    {/* Row 3: Schedule / Deadline Box */}
                    <div className="pt-1">
                      {renderDeadlineIndicator(item.deadline, item.createdAt)}
                    </div>

                  </div>

                  {/* Symmetrical Bottom Action Bar */}
                  <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                    <span className="text-2xs text-slate-400">
                      ID: {item.id.slice(-6)}
                    </span>

                    <Link
                      href={item.linkUrl}
                      className="inline-flex items-center gap-1 font-semibold text-brand-red hover:text-red-700 transition-colors group/link"
                    >
                      <span>เปิดดูงาน</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Symmetrical Data Table View */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">ชื่องานที่ได้รับมอบหมาย</th>
                    <th className="py-3.5 px-4">โครงการ / หมวดหมู่</th>
                    <th className="py-3.5 px-4">ประเภท</th>
                    <th className="py-3.5 px-4">ความเร่งด่วน</th>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4">กำหนดส่ง / สร้างเมื่อ</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredData.map((item) => {
                    return (
                      <tr
                        key={`${item.source}-${item.id}`}
                        className="hover:bg-rose-50/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <Link
                            href={item.linkUrl}
                            className="font-bold text-slate-900 group-hover:text-brand-red transition-colors block leading-snug"
                          >
                            {item.title}
                          </Link>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {item.parentName ? (
                            <span className="font-medium text-slate-700 truncate max-w-[200px] block">
                              {item.parentName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-2xs">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderSourceBadge(item.source)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderUrgencyBadge(item.urgency)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(item.status)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderDeadlineIndicator(item.deadline, item.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link
                            href={item.linkUrl}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:text-red-700 transition-colors"
                          >
                            <span>เปิดดู</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
