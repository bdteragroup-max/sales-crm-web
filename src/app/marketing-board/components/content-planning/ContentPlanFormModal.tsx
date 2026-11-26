'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Save,
  Loader2,
  Calendar,
  Clock,
  Users,
  UserCheck,
  FileText,
  MessageSquareText,
  Sparkles,
  Copy,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  CONTENT_PLANNING_CHANNELS,
  CONTENT_PLAN_CHANNEL_STYLE,
  filterMarketingPlanMembers,
  formatIsoDateToSlashThai,
  formatTime24Dot,
  parseSlashDateToIso,
  parseTime24Input,
  type ContentPlanItem,
  type ContentPlanningChannel,
  type MarketingPlanMember,
} from '@/app/lib/contentPlanningTypes';
import {
  createContentPlanItem,
  updateContentPlanItem,
} from '@/app/actions/contentPlanning';

interface ContentPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: MarketingPlanMember[];
  currentUserId: string;
  defaultYear: number;
  defaultMonth: number;
  defaultPrimaryOwnerId: string;
  editItem: ContentPlanItem | null;
  duplicateFrom?: ContentPlanItem | null;
  onSaved: (saved: ContentPlanItem, isEdit: boolean) => Promise<void> | void;
}

function getDefaultPostDate(year: number, month: number): string {
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

const HOURS_24 = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0'));
const MINUTES_STEP_24 = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
  '59',
];
const TIME_24_PRESETS = ['00.00', '09.00', '12.00', '18.00', '23.59'];

export default function ContentPlanFormModal({
  isOpen,
  onClose,
  members,
  currentUserId,
  defaultYear,
  defaultMonth,
  defaultPrimaryOwnerId,
  editItem,
  duplicateFrom,
  onSaved,
}: ContentPlanFormModalProps) {
  const seedItem = editItem || duplicateFrom || null;
  const isEditMode = Boolean(editItem);

  const initialPrimaryId = (() => {
    if (editItem) return editItem.primaryOwnerId;
    if (duplicateFrom) {
      return defaultPrimaryOwnerId || duplicateFrom.primaryOwnerId || currentUserId;
    }
    if (defaultPrimaryOwnerId) return defaultPrimaryOwnerId;
    if (members.some(m => m.userId === currentUserId)) return currentUserId;
    return members[0]?.userId || currentUserId;
  })();

  const [primaryOwnerId, setPrimaryOwnerId] = useState<string>(initialPrimaryId);
  const [coOwnerIds, setCoOwnerIds] = useState<string[]>(() =>
    seedItem
      ? seedItem.coOwners.map(c => c.userId).filter(id => id !== initialPrimaryId)
      : []
  );
  const [title, setTitle] = useState<string>(
    editItem
      ? editItem.title
      : duplicateFrom
      ? `${duplicateFrom.title} (สำเนา)`
      : ''
  );
  const [contentDetail, setContentDetail] = useState<string>(seedItem?.contentDetail || '');
  const [caption, setCaption] = useState<string>(seedItem?.caption || '');
  const initialIsoDate = editItem?.postDate || getDefaultPostDate(defaultYear, defaultMonth);
  const [postDateDisplay, setPostDateDisplay] = useState<string>(() =>
    formatIsoDateToSlashThai(initialIsoDate)
  );
  const [postTimeDisplay, setPostTimeDisplay] = useState<string>(() => {
    if (editItem) {
      return editItem.postTime ? formatTime24Dot(editItem.postTime) : '';
    }
    return duplicateFrom?.postTime ? formatTime24Dot(duplicateFrom.postTime) : '10.00';
  });
  const [channels, setChannels] = useState<ContentPlanningChannel[]>(
    seedItem?.channels?.length ? seedItem.channels : ['Facebook']
  );
  const [isSaving, setIsSaving] = useState(false);

  // Comboboxes & Custom 24h Time Picker
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [isCoOwnerMenuOpen, setIsCoOwnerMenuOpen] = useState(false);
  const [coOwnerSearchQuery, setCoOwnerSearchQuery] = useState('');
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);

  const ownerComboboxRef = useRef<HTMLDivElement>(null);
  const ownerSearchInputRef = useRef<HTMLInputElement>(null);
  const coOwnerComboboxRef = useRef<HTMLDivElement>(null);
  const coOwnerSearchInputRef = useRef<HTMLInputElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const nativeDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ownerComboboxRef.current && !ownerComboboxRef.current.contains(target)) {
        setIsOwnerMenuOpen(false);
        setOwnerSearchQuery('');
      }
      if (coOwnerComboboxRef.current && !coOwnerComboboxRef.current.contains(target)) {
        setIsCoOwnerMenuOpen(false);
        setCoOwnerSearchQuery('');
      }
      if (timePickerRef.current && !timePickerRef.current.contains(target)) {
        setIsTimeMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOwnerMenuOpen(false);
        setOwnerSearchQuery('');
        setIsCoOwnerMenuOpen(false);
        setCoOwnerSearchQuery('');
        setIsTimeMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    if (!isOwnerMenuOpen) return;
    const t = setTimeout(() => {
      ownerSearchInputRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [isOwnerMenuOpen]);

  useEffect(() => {
    if (!isCoOwnerMenuOpen) return;
    const t = setTimeout(() => {
      coOwnerSearchInputRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [isCoOwnerMenuOpen]);

  const isoDateForNative = useMemo(
    () => parseSlashDateToIso(postDateDisplay) || '',
    [postDateDisplay]
  );

  const parsedTimeState = useMemo(() => parseTime24Input(postTimeDisplay), [postTimeDisplay]);
  const selectedHour =
    parsedTimeState.ok && parsedTimeState.time24 ? parsedTimeState.time24.slice(0, 2) : null;
  const selectedMinute =
    parsedTimeState.ok && parsedTimeState.time24 ? parsedTimeState.time24.slice(3, 5) : null;

  const activeMembers = useMemo(() => members.filter(m => m.isActive), [members]);
  const selectablePrimary = useMemo(
    () =>
      editItem && !activeMembers.some(m => m.userId === editItem.primaryOwnerId)
        ? members
        : activeMembers,
    [editItem, activeMembers, members]
  );

  const selectedPrimaryMember = useMemo(
    () => selectablePrimary.find(m => m.userId === primaryOwnerId) || null,
    [selectablePrimary, primaryOwnerId]
  );

  const filteredPrimaryMembers = useMemo(
    () => filterMarketingPlanMembers(selectablePrimary, ownerSearchQuery),
    [selectablePrimary, ownerSearchQuery]
  );

  const selectableCoOwners = useMemo(() => {
    const base = activeMembers.filter(m => m.userId !== primaryOwnerId);
    if (!editItem) return base;
    const extras = members.filter(
      m =>
        m.userId !== primaryOwnerId &&
        coOwnerIds.includes(m.userId) &&
        !base.some(b => b.userId === m.userId)
    );
    return [...base, ...extras];
  }, [activeMembers, members, primaryOwnerId, editItem, coOwnerIds]);

  const selectedCoOwnerMembers = useMemo(
    () =>
      coOwnerIds
        .map(id => members.find(m => m.userId === id))
        .filter((m): m is MarketingPlanMember => Boolean(m)),
    [coOwnerIds, members]
  );

  const filteredCoOwnerCandidates = useMemo(
    () => filterMarketingPlanMembers(selectableCoOwners, coOwnerSearchQuery),
    [selectableCoOwners, coOwnerSearchQuery]
  );

  if (!isOpen) return null;

  const toggleChannel = (ch: ContentPlanningChannel) => {
    setChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const toggleCoOwner = (uid: string) => {
    if (uid === primaryOwnerId) return;
    setCoOwnerIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handlePrimaryOwnerChange = (nextId: string) => {
    setPrimaryOwnerId(nextId);
    setCoOwnerIds(prev => prev.filter(id => id !== nextId));
    setIsOwnerMenuOpen(false);
    setOwnerSearchQuery('');
  };

  const handleCopyCaption = () => {
    if (!caption.trim()) return;
    navigator.clipboard.writeText(caption);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกแคปชั่นแล้ว',
      timer: 1100,
      showConfirmButton: false,
    });
  };

  const handlePostDateBlur = () => {
    const iso = parseSlashDateToIso(postDateDisplay);
    if (iso) {
      setPostDateDisplay(formatIsoDateToSlashThai(iso));
    }
  };

  const handleNativeDatePick = (iso: string) => {
    if (!iso) return;
    setPostDateDisplay(formatIsoDateToSlashThai(iso));
  };

  const openNativeDatePicker = () => {
    const el = nativeDateInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Fallback when showPicker is unsupported
      }
    }
    el.focus();
    el.click();
  };

  const handleTimeHourPick = (hh: string) => {
    const mm = selectedMinute || '00';
    setPostTimeDisplay(`${hh}.${mm}`);
  };

  const handleTimeMinutePick = (mm: string) => {
    const hh = selectedHour || '00';
    setPostTimeDisplay(`${hh}.${mm}`);
  };

  const handleTimeBlur = () => {
    const parsed = parseTime24Input(postTimeDisplay);
    if (parsed.ok) {
      setPostTimeDisplay(parsed.time24 ? parsed.time24.replace(':', '.') : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุหัวข้อคอนเทนต์' });
      return;
    }
    if (!postDateDisplay.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุวันที่ต้องการโพสต์' });
      return;
    }
    const parsedIsoDate = parseSlashDateToIso(postDateDisplay);
    if (!parsedIsoDate) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบวันที่ไม่ถูกต้อง',
        text: 'กรุณาระบุวันที่เป็น วัน/เดือน/ปี เช่น 25/11/2569 หรือ 25/11/2026',
      });
      return;
    }
    const parsedTime = parseTime24Input(postTimeDisplay);
    if (!parsedTime.ok) {
      Swal.fire({
        icon: 'warning',
        title: 'เวลาโพสต์ไม่ถูกต้อง',
        text: parsedTime.error,
      });
      return;
    }
    if (channels.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกช่องทางการโพสต์อย่างน้อย 1 ช่องทาง',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        primaryOwnerId,
        coOwnerIds,
        title: title.trim(),
        contentDetail,
        caption,
        postDate: parsedIsoDate,
        postTime: parsedTime.time24 || '',
        channels,
      };

      const res = isEditMode && editItem
        ? await updateContentPlanItem(editItem.id, payload)
        : await createContentPlanItem(payload);

      if (!res.success || !res.data) {
        Swal.fire({
          icon: 'error',
          title: isEditMode ? 'แก้ไขรายการไม่สำเร็จ' : 'เพิ่มรายการไม่สำเร็จ',
          text: res.error || 'กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }

      await onSaved(res.data, isEditMode);
      onClose();
      Swal.fire({
        icon: 'success',
        title: isEditMode ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรายการลงแพลนแล้ว',
        timer: 1400,
        showConfirmButton: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-[#ff2301] flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {isEditMode
                  ? 'แก้ไขรายการแพลนคอนเทนต์'
                  : duplicateFrom
                  ? 'คัดลอกและสร้างแพลนคอนเทนต์ใหม่'
                  : 'เพิ่มคอนเทนต์ลงแพลน (Content Planning)'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดผู้รับผิดชอบหลัก/ร่วม วันเวลาโพสต์ ช่องทาง รายละเอียด และแคปชั่น
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Row 1: Searchable Primary Owner + Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div ref={ownerComboboxRef} className="sm:col-span-5 space-y-1.5 relative">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck size={14} className="text-red-600" />
                <span>ผู้รับผิดชอบหลัก (ชีตบุคคล) *</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCoOwnerMenuOpen(false);
                  setIsTimeMenuOpen(false);
                  setIsOwnerMenuOpen(prev => {
                    const next = !prev;
                    if (!next) setOwnerSearchQuery('');
                    return next;
                  });
                }}
                className={`w-full h-10 px-3 bg-slate-50 border rounded-xl font-semibold text-slate-800 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                  isOwnerMenuOpen
                    ? 'bg-white ring-2 ring-red-500/25 border-red-400'
                    : 'border-slate-200 hover:bg-white'
                }`}
              >
                <span className="truncate">
                  {selectedPrimaryMember
                    ? `${selectedPrimaryMember.fullName}${
                        selectedPrimaryMember.nickname ? ` (${selectedPrimaryMember.nickname})` : ''
                      }`
                    : 'เลือกผู้รับผิดชอบหลัก...'}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 shrink-0 transition-transform ${
                    isOwnerMenuOpen ? 'rotate-180 text-red-600' : ''
                  }`}
                />
              </button>

              {isOwnerMenuOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        ref={ownerSearchInputRef}
                        type="text"
                        value={ownerSearchQuery}
                        onChange={e => setOwnerSearchQuery(e.target.value)}
                        placeholder="พิมพ์ชื่อ, ชื่อเล่น, รหัสพนักงาน..."
                        className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                      />
                      {ownerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setOwnerSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          aria-label="ล้างคำค้นหาชื่อ"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                    {filteredPrimaryMembers.length === 0 ? (
                      <div className="py-5 text-center text-[11px] text-slate-400 font-medium">
                        ไม่พบรายชื่อที่ตรงกับ &ldquo;{ownerSearchQuery}&rdquo;
                      </div>
                    ) : (
                      filteredPrimaryMembers.map(m => {
                        const isSelected = m.userId === primaryOwnerId;
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => handlePrimaryOwnerChange(m.userId)}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors ${
                              isSelected
                                ? 'bg-red-50 text-red-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">
                                {m.fullName}
                                {m.nickname ? ` (${m.nickname})` : ''}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {m.employeeId ? `${m.employeeId} • ` : ''}
                                {m.position || m.role}
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="text-red-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-red-600" />
                  <span>วันที่ต้องการโพสต์ *</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">วัน/เดือน/ปี</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={postDateDisplay}
                  onChange={e => setPostDateDisplay(e.target.value)}
                  onBlur={handlePostDateBlur}
                  placeholder="25/11/2569"
                  required
                  className={`w-full h-10 pl-3 pr-10 bg-slate-50 border rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                    postDateDisplay.trim() && !isoDateForNative
                      ? 'border-amber-400 focus:ring-amber-500/25 focus:border-amber-500'
                      : 'border-slate-200 focus:ring-red-500/25 focus:border-red-400'
                  }`}
                />
                <input
                  ref={nativeDateInputRef}
                  type="date"
                  value={isoDateForNative}
                  onChange={e => handleNativeDatePick(e.target.value)}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="absolute right-0 top-0 w-9 h-10 opacity-0 pointer-events-none"
                />
                <button
                  type="button"
                  onClick={openNativeDatePicker}
                  title="เลือกจากปฏิทิน"
                  aria-label="เลือกวันที่จากปฏิทิน"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Calendar size={14} />
                </button>
              </div>
              {postDateDisplay.trim() && !isoDateForNative && (
                <p className="text-[10px] font-medium text-amber-700">
                  ใส่รูปแบบ วัน/เดือน/ปี เช่น 25/11/2569
                </p>
              )}
            </div>

            <div ref={timePickerRef} className="sm:col-span-3 space-y-1.5 relative">
              <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-red-600" />
                  <span>เวลาโพสต์</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">00.00-23.59</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={postTimeDisplay}
                  onChange={e => setPostTimeDisplay(e.target.value)}
                  onBlur={handleTimeBlur}
                  placeholder="เช่น 09.30 หรือ 23.59"
                  title="ระบุเวลาแบบ 24 ชั่วโมง ตั้งแต่ 00.00 ถึง 23.59"
                  className={`w-full h-10 pl-3 pr-9 bg-slate-50 border rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                    !parsedTimeState.ok
                      ? 'border-amber-400 focus:ring-amber-500/25 focus:border-amber-500'
                      : 'border-slate-200 focus:ring-red-500/25 focus:border-red-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerMenuOpen(false);
                    setIsCoOwnerMenuOpen(false);
                    setIsTimeMenuOpen(prev => !prev);
                  }}
                  title="เลือกเวลา (24 ชม.)"
                  aria-label="เลือกเวลาแบบ 24 ชั่วโมง"
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isTimeMenuOpen
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Clock size={14} />
                </button>
              </div>
              {!parsedTimeState.ok && (
                <p className="text-[10px] font-medium text-amber-700">
                  ใส่เวลา 00.00 ถึง 23.59 น.
                </p>
              )}

              {isTimeMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] w-64 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">
                      เลือกเวลา 24 ชม. (00.00 - 23.59)
                    </span>
                    {postTimeDisplay && (
                      <button
                        type="button"
                        onClick={() => {
                          setPostTimeDisplay('');
                          setIsTimeMenuOpen(false);
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-red-600 cursor-pointer"
                      >
                        ล้างเวลา
                      </button>
                    )}
                  </div>

                  <div className="px-2.5 pt-2 pb-1.5 flex flex-wrap gap-1 border-b border-slate-100">
                    {TIME_24_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPostTimeDisplay(preset);
                          setIsTimeMenuOpen(false);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                          formatTime24Dot(postTimeDisplay) === preset
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-red-50 hover:border-red-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-slate-100">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 text-center py-1 bg-slate-50/70">
                        ชั่วโมง (00-23)
                      </div>
                      <div className="max-h-44 overflow-y-auto p-1 grid grid-cols-2 gap-0.5">
                        {HOURS_24.map(hh => {
                          const active = selectedHour === hh;
                          return (
                            <button
                              key={hh}
                              type="button"
                              onClick={() => handleTimeHourPick(hh)}
                              className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                active
                                  ? 'bg-red-600 text-white'
                                  : 'text-slate-700 hover:bg-red-50'
                              }`}
                            >
                              {hh}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 text-center py-1 bg-slate-50/70">
                        นาที (00-59)
                      </div>
                      <div className="max-h-44 overflow-y-auto p-1 grid grid-cols-2 gap-0.5">
                        {MINUTES_STEP_24.map(mm => {
                          const active = selectedMinute === mm;
                          return (
                            <button
                              key={mm}
                              type="button"
                              onClick={() => handleTimeMinutePick(mm)}
                              className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                active
                                  ? 'bg-red-600 text-white'
                                  : 'text-slate-700 hover:bg-red-50'
                              }`}
                            >
                              {mm}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      เวลาที่เลือก:{' '}
                      <strong className="text-slate-800">
                        {parsedTimeState.ok && parsedTimeState.time24
                          ? `${formatTime24Dot(parsedTimeState.time24)} น.`
                          : 'ไม่ระบุ'}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTimeMenuOpen(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold cursor-pointer"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              หัวข้อคอนเทนต์ (Content Topic / Title) *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น รีวิวปั๊มน้ำโซลาร์รุ่นใหม่ ประหยัดไฟ 0 บาท สำหรับเกษตรกร..."
              required
              maxLength={255}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-400"
            />
          </div>

          {/* Row 3: Channels Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-slate-700">
                ช่องทางการโพสต์ (เลือกได้มากกว่า 1 ช่องทาง) *
              </label>
              <button
                type="button"
                onClick={() =>
                  setChannels(prev =>
                    prev.length === CONTENT_PLANNING_CHANNELS.length
                      ? ['Facebook']
                      : [...CONTENT_PLANNING_CHANNELS]
                  )
                }
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                {channels.length === CONTENT_PLANNING_CHANNELS.length
                  ? 'เลือกเฉพาะช่องทางหลัก'
                  : 'เลือกครบทุก 5 ช่องทาง'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTENT_PLANNING_CHANNELS.map(ch => {
                const isSelected = channels.includes(ch);
                const style = CONTENT_PLAN_CHANNEL_STYLE[ch];
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? `${style.activeBtn} shadow-xs`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Searchable Multi-Select Co-Owners Dropdown */}
          <div className="space-y-2 rounded-2xl bg-slate-50/90 border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" />
                <span>ผู้รับผิดชอบร่วม (Co-Owners)</span>
                <span className="text-[11px] font-medium text-slate-500">
                  ({coOwnerIds.length} คน)
                </span>
              </label>
              {coOwnerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoOwnerIds([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  ล้างที่เลือกทั้งหมด
                </button>
              )}
            </div>

            <div ref={coOwnerComboboxRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsOwnerMenuOpen(false);
                  setIsTimeMenuOpen(false);
                  setIsCoOwnerMenuOpen(prev => {
                    const next = !prev;
                    if (!next) setCoOwnerSearchQuery('');
                    return next;
                  });
                }}
                className={`w-full min-h-10 px-3 py-2 bg-white border rounded-xl font-semibold text-slate-800 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                  isCoOwnerMenuOpen
                    ? 'ring-2 ring-indigo-500/25 border-indigo-400'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span className="truncate text-xs">
                  {selectedCoOwnerMembers.length === 0
                    ? 'เลือกผู้รับผิดชอบร่วม (เลือกได้หลายคน)...'
                    : `เลือกแล้ว ${selectedCoOwnerMembers.length} คน: ${selectedCoOwnerMembers
                        .map(m => m.nickname || m.fullName)
                        .join(', ')}`}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 shrink-0 transition-transform ${
                    isCoOwnerMenuOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {isCoOwnerMenuOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        ref={coOwnerSearchInputRef}
                        type="text"
                        value={coOwnerSearchQuery}
                        onChange={e => setCoOwnerSearchQuery(e.target.value)}
                        placeholder="พิมพ์ชื่อ, ชื่อเล่น, รหัสพนักงาน..."
                        className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                      {coOwnerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCoOwnerSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          aria-label="ล้างคำค้นหาผู้รับผิดชอบร่วม"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                    {filteredCoOwnerCandidates.length === 0 ? (
                      <div className="py-5 text-center text-[11px] text-slate-400 font-medium">
                        {coOwnerSearchQuery
                          ? `ไม่พบรายชื่อที่ตรงกับ "${coOwnerSearchQuery}"`
                          : 'ไม่มีรายชื่อเพิ่มเติมให้เลือก'}
                      </div>
                    ) : (
                      filteredCoOwnerCandidates.map(m => {
                        const selected = coOwnerIds.includes(m.userId);
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => toggleCoOwner(m.userId)}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-indigo-50 text-indigo-950 font-bold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  selected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {selected && <Check size={11} strokeWidth={3} />}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">
                                  {m.fullName}
                                  {m.nickname ? ` (${m.nickname})` : ''}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {m.employeeId ? `${m.employeeId} • ` : ''}
                                  {m.position || m.role}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      เลือกแล้ว {coOwnerIds.length} คน
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCoOwnerMenuOpen(false);
                        setCoOwnerSearchQuery('');
                      }}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedCoOwnerMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {selectedCoOwnerMembers.map(m => (
                  <span
                    key={m.userId}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold"
                  >
                    <span>
                      {m.fullName}
                      {m.nickname ? ` (${m.nickname})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCoOwner(m.userId)}
                      className="w-4 h-4 rounded-full hover:bg-indigo-200/80 flex items-center justify-center text-indigo-600 cursor-pointer"
                      aria-label={`ลบ ${m.fullName} ออกจากผู้รับผิดชอบร่วม`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 5: Content Detail */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-600" />
              <span>รายละเอียดเนื้อหา / แนวทางผลิต (Content Detail)</span>
            </label>
            <textarea
              rows={3}
              value={contentDetail}
              onChange={e => setContentDetail(e.target.value)}
              placeholder="อธิบายรูปแบบคลิป/ภาพ, มุมกล้อง, Key Message, สินค้าที่เน้น, โปรโมชั่นหรือลิงก์อ้างอิง..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-400"
            />
          </div>

          {/* Row 6: Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquareText size={14} className="text-slate-600" />
                <span>แคปชั่น (Caption &amp; Hashtags)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{caption.length} ตัวอักษร</span>
                {caption.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                  >
                    <Copy size={10} /> คัดลอก
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={4}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="พิมพ์ข้อความแคปชั่น, Call to Action, เบอร์ติดต่อ, และ #Hashtag..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-400"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มลงแพลนคอนเทนต์'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
