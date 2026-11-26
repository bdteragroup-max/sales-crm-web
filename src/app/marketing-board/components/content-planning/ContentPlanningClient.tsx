'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  CONTENT_PLANNING_CHANNELS,
  CONTENT_PLAN_CHANNEL_STYLE,
  THAI_MONTH_NAMES,
  canUserModifyContentPlan,
  doesPlanBelongToMemberSheet,
  formatIsoDateToSlashThai,
  formatThaiMonthYear,
  formatTime24Dot,
  sortContentPlansChronologically,
  type ContentPlanItem,
  type ContentPlanningChannel,
  type ContentPlanningPermissions,
  type MarketingPlanMember,
} from '@/app/lib/contentPlanningTypes';
import {
  deleteContentPlanItem,
  getContentPlanningWorkspace,
} from '@/app/actions/contentPlanning';
import { exportContentPlanningToExcel } from '@/app/lib/exportContentPlanningExcel';
import ContentPlanFormModal from './ContentPlanFormModal';

interface ContentPlanningClientProps {
  initialData: {
    year: number;
    month: number;
    permissions: ContentPlanningPermissions | null;
    members: MarketingPlanMember[];
    plans: ContentPlanItem[];
  };
}

function getMemberShortTabLabel(member: MarketingPlanMember): string {
  const clean = member.fullName
    .replace(/^(นาย|นางสาว|นาง|คุณ|ดร\.)\s*/g, '')
    .trim();
  const firstName = clean.split(/\s+/)[0] || clean;
  return member.nickname ? `${firstName} (${member.nickname})` : firstName;
}

export default function ContentPlanningClient({ initialData }: ContentPlanningClientProps) {
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData.month);
  const [permissions, setPermissions] = useState<ContentPlanningPermissions | null>(
    initialData.permissions
  );
  const [members, setMembers] = useState<MarketingPlanMember[]>(initialData.members || []);
  const [plans, setPlans] = useState<ContentPlanItem[]>(initialData.plans || []);

  // 'ALL' = ภาพรวมทั้งทีม | otherwise member userId
  const [activeSheetId, setActiveSheetId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [channelFilter, setChannelFilter] = useState<'ALL' | ContentPlanningChannel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentPlanItem | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<ContentPlanItem | null>(null);
  const [modalSeedDate, setModalSeedDate] = useState<string | null>(null);

  const loadMonthData = async (nextYear: number, nextMonth: number) => {
    setIsLoadingMonth(true);
    try {
      const fresh = await getContentPlanningWorkspace(nextYear, nextMonth);
      if (fresh.success) {
        setSelectedYear(fresh.year);
        setSelectedMonth(fresh.month);
        setPermissions(fresh.permissions);
        setMembers(fresh.members);
        setPlans(fresh.plans);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'โหลดข้อมูลไม่สำเร็จ',
          text: fresh.error || 'กรุณาลองใหม่อีกครั้ง',
        });
      }
    } finally {
      setIsLoadingMonth(false);
    }
  };

  const handleStepMonth = (delta: -1 | 1) => {
    let nextMonth = selectedMonth + delta;
    let nextYear = selectedYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    void loadMonthData(nextYear, nextMonth);
  };

  const handleJumpToday = () => {
    const now = new Date();
    void loadMonthData(now.getFullYear(), now.getMonth() + 1);
  };

  const sheetCountByMember = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      counts.set(m.userId, 0);
    }
    for (const p of plans) {
      const seen = new Set<string>();
      seen.add(p.primaryOwnerId);
      for (const co of p.coOwners) seen.add(co.userId);
      for (const uid of seen) {
        counts.set(uid, (counts.get(uid) || 0) + 1);
      }
    }
    return counts;
  }, [members, plans]);

  const activeMember = useMemo(
    () => (activeSheetId === 'ALL' ? null : members.find(m => m.userId === activeSheetId) || null),
    [activeSheetId, members]
  );

  // Filter rows inside the selected sheet (`ALL` or specific member)
  const visiblePlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = plans.filter(item => {
      if (activeSheetId !== 'ALL' && !doesPlanBelongToMemberSheet(item, activeSheetId)) {
        return false;
      }
      if (channelFilter !== 'ALL' && !item.channels.includes(channelFilter)) {
        return false;
      }
      if (q) {
        const text = [
          item.title,
          item.contentDetail || '',
          item.caption || '',
          item.primaryOwnerName,
          ...item.coOwners.map(c => c.userName),
          ...item.channels,
        ]
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
    return sortContentPlansChronologically(filtered);
  }, [plans, activeSheetId, channelFilter, searchQuery]);

  const channelSummary = useMemo(() => {
    const counts: Record<ContentPlanningChannel, number> = {
      Facebook: 0,
      YouTube: 0,
      TikTok: 0,
      LINE: 0,
      Instagram: 0,
    };
    for (const item of visiblePlans) {
      for (const ch of item.channels) {
        counts[ch]++;
      }
    }
    return counts;
  }, [visiblePlans]);

  const yearOptions = useMemo(() => {
    const currentCe = new Date().getFullYear();
    const minY = Math.min(currentCe - 1, selectedYear);
    const maxY = Math.max(currentCe + 3, selectedYear);
    const list: number[] = [];
    for (let y = minY; y <= maxY; y++) list.push(y);
    return list;
  }, [selectedYear]);

  const openCreateModal = (seedDateStr?: string) => {
    setEditingItem(null);
    setDuplicateSource(null);
    setModalSeedDate(seedDateStr || null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ContentPlanItem) => {
    setDuplicateSource(null);
    setModalSeedDate(null);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openDuplicateModal = (item: ContentPlanItem) => {
    setEditingItem(null);
    setModalSeedDate(null);
    setDuplicateSource(item);
    setIsModalOpen(true);
  };

  const handleSavedPlan = async (saved: ContentPlanItem, isEdit: boolean) => {
    // If saved postDate belongs to another month/year, switch there so the user sees their item immediately
    if (saved.planYear !== selectedYear || saved.planMonth !== selectedMonth) {
      await loadMonthData(saved.planYear, saved.planMonth);
      return;
    }

    setPlans(prev => {
      const next = isEdit
        ? prev.map(p => (p.id === saved.id ? saved : p))
        : [...prev, saved];
      return sortContentPlansChronologically(next);
    });
  };

  const handleDelete = async (item: ContentPlanItem) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'ลบรายการแพลนคอนเทนต์?',
      html: `<div class="text-sm text-slate-600">คุณต้องการลบ <strong>"${item.title}"</strong> (${formatIsoDateToSlashThai(item.postDate)}) ใช่หรือไม่?</div>`,
      showCancelButton: true,
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    const res = await deleteContentPlanItem(item.id);
    if (!res.success) {
      Swal.fire({
        icon: 'error',
        title: 'ลบรายการไม่สำเร็จ',
        text: res.error || 'กรุณาลองใหม่อีกครั้ง',
      });
      return;
    }

    setPlans(prev => prev.filter(p => p.id !== item.id));
    Swal.fire({
      icon: 'success',
      title: 'ลบรายการแล้ว',
      timer: 1300,
      showConfirmButton: false,
    });
  };

  const handleCopyCaption = (captionText: string) => {
    navigator.clipboard.writeText(captionText);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกแคปชั่นแล้ว',
      timer: 1100,
      showConfirmButton: false,
    });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportContentPlanningToExcel({
        year: selectedYear,
        month: selectedMonth,
        plans,
        members,
      });
      Swal.fire({
        icon: 'success',
        title: 'ส่งออกไฟล์ Excel สำเร็จ',
        text: `สร้างไฟล์ ${members.length + 1} ชีต (รวมทั้งทีม + ชีตรายบุคคล) เรียบร้อยแล้ว`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: 'error',
        title: 'ส่งออก Excel ไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Calendar grid helper (Sun..Sat)
  const calendarCells = useMemo(() => {
    const firstDayIdx = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDayIdx; i++) cells.push({ day: null, dateStr: null });
    const mm = String(selectedMonth).padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateStr: `${selectedYear}-${mm}-${String(d).padStart(2, '0')}`,
      });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });
    return cells;
  }, [selectedYear, selectedMonth]);

  const effectiveSeedDate = modalSeedDate
    ? { year: Number(modalSeedDate.split('-')[0]), month: Number(modalSeedDate.split('-')[1]) }
    : { year: selectedYear, month: selectedMonth };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f8fafc] text-slate-900">
      {/* ─── ROW 1: SYMMETRICAL HEADER BAR ─── */}
      <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
            <CalendarDays size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg text-gray-900 leading-tight whitespace-nowrap">
              วางแผนคอนเทนต์ (Content Planning)
            </h1>
            <p className="text-[11px] text-gray-500 font-medium leading-tight whitespace-nowrap hidden xl:block">
              วางแผนรายเดือนแยกชีตทีมการตลาด • {formatThaiMonthYear(selectedYear, selectedMonth)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* View Mode Toggle */}
          <div className="hidden sm:flex h-10 bg-gray-100 p-1 rounded-xl items-center shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table2 size={14} /> ตารางชีต
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar size={14} /> ปฏิทิน
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block" />

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || isLoadingMonth}
            className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
            title="ส่งออกเป็นไฟล์ Excel แยกชีตตามรายชื่อทุกคนในทีม + ชีตรวมทั้งทีม"
          >
            {isExporting ? (
              <Download size={15} className="animate-bounce" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            <span className="hidden md:inline">Export Excel (.xlsx)</span>
            <span className="md:hidden">Excel</span>
          </button>

          {permissions?.canCreate && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="h-10 px-4 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs md:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">เพิ่มคอนเทนต์</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void loadMonthData(selectedYear, selectedMonth)}
            disabled={isLoadingMonth}
            className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={isLoadingMonth ? 'animate-spin text-[#ff2301]' : ''} />
          </button>
        </div>
      </header>

      {/* ─── ROW 2: SYMMETRICAL MONTH/YEAR PICKER + CHANNEL FILTERS + SEARCH (Uniform h-9 controls) ─── */}
      <div className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 flex-wrap">
        {/* Left: Month/Year Tray + Channel Filter Tray */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 h-9">
            <button
              type="button"
              onClick={() => handleStepMonth(-1)}
              disabled={isLoadingMonth}
              className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft size={14} />
            </button>

            <select
              value={selectedMonth}
              onChange={e => void loadMonthData(selectedYear, Number(e.target.value))}
              disabled={isLoadingMonth}
              className="h-7 px-2.5 rounded-lg bg-white border border-slate-200/80 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {THAI_MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => void loadMonthData(Number(e.target.value), selectedMonth)}
              disabled={isLoadingMonth}
              className="h-7 px-2.5 rounded-lg bg-white border border-slate-200/80 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleStepMonth(1)}
              disabled={isLoadingMonth}
              className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight size={14} />
            </button>

            <div className="w-px h-4 bg-slate-300/80 mx-0.5" />

            <button
              type="button"
              onClick={handleJumpToday}
              disabled={isLoadingMonth}
              className="h-7 px-2.5 rounded-lg bg-white hover:bg-red-50 border border-slate-200/80 text-[11px] font-bold text-slate-700 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              เดือนนี้
            </button>
          </div>

          {/* Channel Segmented Filter Tray */}
          <div className="inline-flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 min-h-9">
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={`h-7 px-3 rounded-lg text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                channelFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/70 hover:text-slate-900 hover:bg-white'
              }`}
            >
              ทุกช่องทาง
            </button>
            {CONTENT_PLANNING_CHANNELS.map(ch => {
              const active = channelFilter === ch;
              const style = CONTENT_PLAN_CHANNEL_STYLE[ch];
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(active ? 'ALL' : ch)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? `${style.activeBtn} shadow-2xs`
                      : 'bg-white text-slate-700 border-slate-200/70 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-white' : style.dot}`}
                  />
                  <span>{ch}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Search & Filter Reset */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="relative w-56 sm:w-64 lg:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาหัวข้อ, แคปชั่น, ผู้รับผิดชอบ..."
              className="w-full h-9 pl-8 pr-7 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                aria-label="ล้างคำค้นหา"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {(channelFilter !== 'ALL' || searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setChannelFilter('ALL');
                setSearchQuery('');
              }}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* ─── ROW 3: PERSON SHEET SWITCHER (Wrap-friendly Pill Strip, No Scrollbar) ─── */}
      <div className="bg-slate-50/90 border-b border-gray-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSheetId('ALL')}
          className={`h-8 px-3 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSheetId === 'ALL'
              ? 'bg-red-50 text-[#ff2301] border-red-300 ring-1 ring-red-200/80 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/80'
          }`}
        >
          <Users size={13} className={activeSheetId === 'ALL' ? 'text-[#ff2301]' : 'text-slate-500'} />
          <span>รวมทั้งทีม (All)</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
              activeSheetId === 'ALL'
                ? 'bg-[#ff2301] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {plans.length}
          </span>
        </button>

        {members.map(member => {
          const isSelected = activeSheetId === member.userId;
          const isMe = member.userId === permissions?.userId;
          const count = sheetCountByMember.get(member.userId) || 0;
          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => setActiveSheetId(member.userId)}
              title={`${member.fullName}${member.position ? ` · ${member.position}` : ''}`}
              className={`h-8 px-3 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-red-50 text-[#ff2301] border-red-300 ring-1 ring-red-200/80 shadow-2xs font-extrabold'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/80'
              }`}
            >
              <span>{getMemberShortTabLabel(member)}</span>
              {isMe && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black leading-none">
                  ฉัน
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                  isSelected
                    ? 'bg-[#ff2301] text-white'
                    : count > 0
                    ? 'bg-slate-200/80 text-slate-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── MAIN WORKSPACE BODY (Same Horizontal Gutter as Header/Toolbar) ─── */}
      <main className="flex-1 px-4 sm:px-6 py-4 w-full space-y-4">
        {/* Info & Permission Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>
                  {activeMember
                    ? `ชีตงาน: ${activeMember.fullName}${activeMember.nickname ? ` (${activeMember.nickname})` : ''}`
                    : 'ชีตภาพรวมทีมการตลาด (ทุกบุคคล)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                  {formatThaiMonthYear(selectedYear, selectedMonth)} • {visiblePlans.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-indigo-600 shrink-0" />
                <span>
                  {permissions?.canManageAll
                    ? `${permissions.roleLabel}: เพิ่ม แก้ไข และลบได้ทุกชีต`
                    : `${permissions?.roleLabel || 'Marketing'}: เพิ่มรายการได้ทุกชีต • แก้ไข/ลบได้เฉพาะงานที่คุณเป็นผู้รับผิดชอบหลักหรือร่วม`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {CONTENT_PLANNING_CHANNELS.map(ch => (
              <span
                key={ch}
                className={`h-7 px-2.5 rounded-lg border inline-flex items-center ${CONTENT_PLAN_CHANNEL_STYLE[ch].badge}`}
              >
                {ch}: {channelSummary[ch]}
              </span>
            ))}
          </div>
        </div>

        {/* Sheet Table View */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-3 font-bold text-center w-12">#</th>
                    <th className="py-3 px-3.5 font-bold w-32 whitespace-nowrap">
                      วัน / เวลาโพสต์
                    </th>
                    <th className="py-3 px-3.5 font-bold w-44">ช่องทางโพสต์</th>
                    <th className="py-3 px-3.5 font-bold min-w-[230px]">
                      หัวข้อ &amp; รายละเอียดเนื้อหา
                    </th>
                    <th className="py-3 px-3.5 font-bold min-w-[220px]">แคปชั่น (Caption)</th>
                    <th className="py-3 px-3.5 font-bold w-56">ผู้รับผิดชอบหลัก / ร่วม</th>
                    <th className="py-3 px-3.5 font-bold text-center w-28">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {visiblePlans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 px-6 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-2">
                          <CalendarDays size={32} className="mx-auto text-slate-300" />
                          <p className="font-bold text-slate-600 text-sm">
                            ยังไม่มีรายการคอนเทนต์ในชีตนี้สำหรับเดือน{' '}
                            {formatThaiMonthYear(selectedYear, selectedMonth)}
                          </p>
                          <p className="text-xs text-slate-400">
                            กดปุ่ม &ldquo;+ เพิ่มคอนเทนต์&rdquo; เพื่อวางแผนหัวข้อ วันเวลา ช่องทาง และแคปชั่นได้ทันที
                          </p>
                          {permissions?.canCreate && (
                            <button
                              type="button"
                              onClick={() => openCreateModal()}
                              className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-bold shadow-xs"
                            >
                              <Plus size={14} /> เพิ่มคอนเทนต์รายการแรก
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visiblePlans.map((item, idx) => {
                      const canModify = canUserModifyContentPlan(item, permissions);
                      const isPrimaryOnActiveSheet =
                        activeSheetId !== 'ALL' && item.primaryOwnerId === activeSheetId;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/90 align-top transition-colors"
                        >
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>

                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <div className="font-extrabold text-slate-900">
                              {formatIsoDateToSlashThai(item.postDate)}
                            </div>
                            <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                              {item.postTime ? `${formatTime24Dot(item.postTime)} น.` : 'ยังไม่ระบุเวลา'}
                            </div>
                          </td>

                          <td className="py-3.5 px-3.5">
                            <div className="flex flex-wrap gap-1">
                              {item.channels.map(ch => (
                                <span
                                  key={ch}
                                  className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${CONTENT_PLAN_CHANNEL_STYLE[ch].badge}`}
                                >
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-3.5 space-y-1">
                            <div className="font-extrabold text-slate-900 leading-snug">
                              {item.title}
                            </div>
                            {item.contentDetail && (
                              <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-4">
                                {item.contentDetail}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5">
                            {item.caption ? (
                              <div className="space-y-1">
                                <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4 bg-slate-50 border border-slate-200/70 rounded-lg p-2">
                                  {item.caption}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCaption(item.caption!)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900"
                                >
                                  <Copy size={10} /> คัดลอกแคปชั่น
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-[10px] font-extrabold">
                                หลัก: {item.primaryOwnerName}
                              </span>
                              {activeSheetId !== 'ALL' && !isPrimaryOnActiveSheet && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-black">
                                  ร่วมในชีตนี้
                                </span>
                              )}
                            </div>

                            {item.coOwners.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.coOwners.map(co => (
                                  <span
                                    key={co.userId}
                                    className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-semibold"
                                  >
                                    ร่วม: {co.userName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5">
                            <div className="flex items-center justify-center gap-1">
                              {permissions?.canCreate && (
                                <button
                                  type="button"
                                  onClick={() => openDuplicateModal(item)}
                                  title="คัดลอกเป็นรายการใหม่"
                                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                                >
                                  <Copy size={12} />
                                </button>
                              )}

                              {canModify ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(item)}
                                    title="แก้ไขรายการ"
                                    className="w-7 h-7 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white flex items-center justify-center transition-colors"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDelete(item)}
                                    title="ลบรายการ"
                                    className="w-7 h-7 rounded-lg border border-red-200 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white flex items-center justify-center transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <span
                                  className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center"
                                  title="แก้ไข/ลบได้เฉพาะผู้รับผิดชอบหลัก ผู้รับผิดชอบร่วม หรือ ผจก.การตลาด"
                                >
                                  <Lock size={11} />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Monthly Calendar View */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-900 text-white text-xs font-bold text-center py-2.5">
              {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
              {calendarCells.map((cell, idx) => {
                if (!cell.day || !cell.dateStr) {
                  return <div key={idx} className="min-h-[120px] bg-slate-50/70" />;
                }
                const dayPlans = visiblePlans.filter(p => p.postDate === cell.dateStr);
                return (
                  <div
                    key={cell.dateStr}
                    className="min-h-[132px] p-2 bg-white flex flex-col gap-1.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700">{cell.day}</span>
                      {permissions?.canCreate && (
                        <button
                          type="button"
                          onClick={() => openCreateModal(cell.dateStr!)}
                          title={`เพิ่มคอนเทนต์วันที่ ${cell.day}`}
                          className="w-5 h-5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 flex-1">
                      {dayPlans.map(p => {
                        const canModify = canUserModifyContentPlan(p, permissions);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (canModify) openEditModal(p);
                            }}
                            title={`${p.postTime ? `${formatTime24Dot(p.postTime)} ` : ''}${p.title} (${p.primaryOwnerName})`}
                            className={`w-full text-left p-1.5 rounded-lg border text-[10px] transition-all ${
                              canModify
                                ? 'bg-red-50/70 border-red-200 hover:bg-red-100/80 cursor-pointer'
                                : 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 font-extrabold text-slate-900">
                              <span className="truncate">{p.title}</span>
                              {p.postTime && (
                                <span className="text-[9px] text-red-700 shrink-0">
                                  {formatTime24Dot(p.postTime)}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-500 truncate mt-0.5">
                              {p.channels.join(', ')} • {p.primaryOwnerName}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && permissions && (
        <ContentPlanFormModal
          key={editingItem?.id || duplicateSource?.id || modalSeedDate || `new-${activeSheetId}`}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
            setDuplicateSource(null);
            setModalSeedDate(null);
          }}
          members={members}
          currentUserId={permissions.userId}
          defaultYear={effectiveSeedDate.year}
          defaultMonth={effectiveSeedDate.month}
          defaultPrimaryOwnerId={activeSheetId === 'ALL' ? permissions.userId : activeSheetId}
          editItem={editingItem}
          duplicateFrom={duplicateSource}
          onSaved={handleSavedPlan}
        />
      )}
    </div>
  );
}
