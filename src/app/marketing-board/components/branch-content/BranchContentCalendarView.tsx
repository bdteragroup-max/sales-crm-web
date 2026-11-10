'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { BranchContentItem } from '@/app/lib/branchContentTypes';

interface BranchContentCalendarViewProps {
  contents: BranchContentItem[];
  onCardClick: (item: BranchContentItem) => void;
}

const STATUS_DOT: Record<string, string> = {
  BACKLOG: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_REVIEW: 'bg-amber-500',
  APPROVE_1: 'bg-purple-500',
  REVISE: 'bg-orange-500',
  APPROVED: 'bg-emerald-500',
  PUBLISHED: 'bg-indigo-600',
  CANCELLED: 'bg-rose-400',
};

export default function BranchContentCalendarView({
  contents,
  onCardClick,
}: BranchContentCalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [dateMode, setDateMode] = useState<'PUBLISH' | 'SUBMISSION'>('PUBLISH');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date | null; key: string; dayNum?: number }[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ date: null, key: `empty-start-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      cells.push({
        date: dateObj,
        key: `${yyyy}-${mm}-${dd}`,
        dayNum: d,
      });
    }

    return cells;
  }, [year, month]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, BranchContentItem[]>();
    contents.forEach(c => {
      if (c.status === 'CANCELLED') return;
      const rawDate =
        dateMode === 'PUBLISH'
          ? c.actualPublishDate || c.plannedPublishDate
          : c.submissionDueDate;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    });
    return map;
  }, [contents, dateMode]);

  const thaiMonthLabel = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Calendar Header */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              ปฏิทินคอนเทนต์สาขา ({thaiMonthLabel})
            </h3>
            <p className="text-xs text-slate-500">
              วางแผนตารางโพสต์และติดตามวันกำหนดส่งตรวจของทั้ง 11 สาขา
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Date Mode */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDateMode('PUBLISH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateMode === 'PUBLISH'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ดูตามวันเผยแพร่ (Publish Date)
            </button>
            <button
              type="button"
              onClick={() => setDateMode('SUBMISSION')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateMode === 'SUBMISSION'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ดูตามวันกำหนดส่งตรวจ (Due Date)
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> รอ ผจก.สาขา (Pending)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Approve - 1 (รอการตลาด)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Revise
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Published
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 bg-slate-100 gap-px">
        {weekDays.map(day => (
          <div
            key={day}
            className="bg-slate-50 py-2.5 text-center text-xs font-extrabold text-slate-600"
          >
            {day}
          </div>
        ))}

        {calendarDays.map(cell => {
          if (!cell.date) {
            return <div key={cell.key} className="bg-slate-50/40 min-h-[120px]" />;
          }

          const dayItems = itemsByDate.get(cell.key) || [];
          const isToday =
            cell.date.getDate() === today.getDate() &&
            cell.date.getMonth() === today.getMonth() &&
            cell.date.getFullYear() === today.getFullYear();

          return (
            <div
              key={cell.key}
              className={`bg-white min-h-[130px] p-2 flex flex-col gap-1.5 transition-colors ${
                isToday ? 'ring-2 ring-inset ring-red-500 bg-red-50/10' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-red-600 text-white' : 'text-slate-700'
                  }`}
                >
                  {cell.dayNum}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    {dayItems.length} งาน
                  </span>
                )}
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[115px] pr-0.5">
                {dayItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onCardClick(item)}
                    className="w-full text-left p-1.5 rounded-lg border border-slate-200 hover:border-red-400 bg-slate-50/80 hover:bg-white transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          STATUS_DOT[item.status] || 'bg-slate-400'
                        }`}
                      />
                      <span className="text-[10px] font-extrabold text-red-700 truncate">
                        {item.branchName}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-800 truncate group-hover:text-red-600 mt-0.5">
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

