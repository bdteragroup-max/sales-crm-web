'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

const THAI_WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

function getBkkTodayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '01';
  return `${g('year')}-${g('month')}-${g('day')}`;
}

export function isoToBeSlash(iso: string): string {
  const clean = (iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return '';
  const [y, m, d] = clean.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
}

export function parseBeSlashToIso(raw: string): string | null {
  const clean = (raw || '').trim();
  if (!clean) return null;

  let day = 0;
  let month = 0;
  let year = 0;

  const sepMatch = clean.match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})$/);
  if (sepMatch) {
    day = Number(sepMatch[1]);
    month = Number(sepMatch[2]);
    year = Number(sepMatch[3]);
  } else {
    const digitsMatch = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (!digitsMatch) return null;
    day = Number(digitsMatch[1]);
    month = Number(digitsMatch[2]);
    year = Number(digitsMatch[3]);
  }

  const ceYear = year >= 2400 ? year - 543 : year;
  if (ceYear < 1900 || ceYear > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const probe = new Date(Date.UTC(ceYear, month - 1, day));
  if (
    probe.getUTCFullYear() !== ceYear ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return `${ceYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface ThaiBeDateInputProps {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

type PopoverCoords = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

export default function ThaiBeDateInput({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'วว/ดด/ปปปป (พ.ศ.)',
  allowClear = false,
  className = '',
}: ThaiBeDateInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState('');

  const todayIso = useMemo(() => getBkkTodayIso(), []);
  const anchorIso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso;
  const [viewYearCe, setViewYearCe] = useState(() => Number(anchorIso.slice(0, 4)));
  const [viewMonthIdx, setViewMonthIdx] = useState(() => Number(anchorIso.slice(5, 7)) - 1);

  const updateCoords = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const edgeGap = 8;
    const popWidth = Math.min(308, vw - edgeGap * 2);
    const clampedLeft = Math.max(edgeGap, Math.min(rect.left, vw - popWidth - edgeGap));
    const spaceBelow = vh - rect.bottom - edgeGap;
    const spaceAbove = rect.top - edgeGap;
    const estimatedPopHeight = 328;
    const openUp = spaceBelow < estimatedPopHeight && spaceAbove > spaceBelow;

    setCoords({
      left: clampedLeft,
      width: popWidth,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? vh - rect.top + 6 : undefined,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsOpen(false);
    };
    const handleScrollOrResize = () => updateCoords();

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  const formattedBe = isoToBeSlash(value);
  const displayValue = isEditing ? draftText : formattedBe;

  const yearOptionsCe = useMemo(() => {
    const baseCe = Number(todayIso.slice(0, 4));
    const years: number[] = [];
    for (let y = baseCe - 10; y <= baseCe + 10; y += 1) {
      years.push(y);
    }
    if (!years.includes(viewYearCe)) {
      years.push(viewYearCe);
      years.sort((a, b) => a - b);
    }
    return years;
  }, [todayIso, viewYearCe]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYearCe, viewMonthIdx, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYearCe, viewMonthIdx + 1, 0)).getUTCDate();
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = `${viewYearCe}-${String(viewMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso });
    }
    return cells;
  }, [viewYearCe, viewMonthIdx]);

  const openCalendar = () => {
    if (disabled) return;
    if (!isOpen) {
      const target = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso;
      setViewYearCe(Number(target.slice(0, 4)));
      setViewMonthIdx(Number(target.slice(5, 7)) - 1);
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelectIso = (iso: string) => {
    onChange(iso);
    setIsEditing(false);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonthIdx === 0) {
      setViewMonthIdx(11);
      setViewYearCe((y) => y - 1);
    } else {
      setViewMonthIdx((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIdx === 11) {
      setViewMonthIdx(0);
      setViewYearCe((y) => y + 1);
    } else {
      setViewMonthIdx((m) => m + 1);
    }
  };

  const handleInputChange = (nextRaw: string) => {
    setDraftText(nextRaw);
    const parsedIso = parseBeSlashToIso(nextRaw);
    if (parsedIso) {
      onChange(parsedIso);
      setViewYearCe(Number(parsedIso.slice(0, 4)));
      setViewMonthIdx(Number(parsedIso.slice(5, 7)) - 1);
    }
  };

  const handleInputBlur = () => {
    const trimmed = draftText.trim();
    if (!trimmed && allowClear) {
      onChange('');
    } else {
      const parsed = parseBeSlashToIso(trimmed);
      if (parsed) {
        onChange(parsed);
      }
    }
    setIsEditing(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          required={required}
          disabled={disabled}
          value={displayValue}
          onFocus={() => {
            if (disabled) return;
            setDraftText(formattedBe);
            setIsEditing(true);
          }}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const parsed = parseBeSlashToIso(draftText);
              if (parsed) {
                onChange(parsed);
                setIsEditing(false);
              }
            }
          }}
          placeholder={placeholder}
          className={`w-full min-h-[42px] pl-3.5 ${
            allowClear && value && !disabled ? 'pr-16' : 'pr-10'
          } py-2 border border-gray-300 rounded-xl text-base sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none disabled:bg-gray-100 disabled:text-gray-600`}
        />

        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsEditing(false);
            }}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 cursor-pointer"
            title="ล้างวันที่"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={openCalendar}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-[#ff2301] hover:bg-red-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="เลือกวันที่จากปฏิทิน พ.ศ."
        >
          <Calendar size={16} />
        </button>
      </div>

      {isOpen &&
        !disabled &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            }}
            className="z-[9999] bg-white rounded-2xl border border-gray-200 shadow-2xl p-3 space-y-2.5"
          >
          {/* Month / B.E. Year Header */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonthIdx}
                onChange={(e) => setViewMonthIdx(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-900 outline-none cursor-pointer"
              >
                {THAI_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={viewYearCe}
                onChange={(e) => setViewYearCe(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-900 outline-none cursor-pointer"
              >
                {yearOptionsCe.map((ceY) => (
                  <option key={ceY} value={ceY}>
                    พ.ศ. {ceY + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400">
            {THAI_WEEKDAYS_SHORT.map((wd) => (
              <div key={wd} className="py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectIso(cell.iso!)}
                  className={`h-8 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#ff2301] text-white shadow-xs'
                      : isToday
                      ? 'bg-red-50 text-[#ff2301] border border-red-200 hover:bg-red-100'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Footer */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => handleSelectIso(todayIso)}
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#ff2301] font-bold cursor-pointer"
            >
              วันนี้ ({isoToBeSlash(todayIso)})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-100 font-bold cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
