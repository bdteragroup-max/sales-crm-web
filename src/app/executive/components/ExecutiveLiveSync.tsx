'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Radio, Check, ChevronDown } from 'lucide-react';

interface ExecutiveLiveSyncProps {
  initialLastUpdated?: string;
  className?: string;
  defaultIntervalSeconds?: number;
}

const INTERVAL_OPTIONS = [
  { label: '30 วินาที', value: 30 },
  { label: '60 วินาที', value: 60 },
  { label: '5 นาที', value: 300 },
  { label: 'ปิด (Manual)', value: 0 },
];

const formatNowTime = () => {
  return (
    new Date().toLocaleTimeString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' น.'
  );
};

export default function ExecutiveLiveSync({
  initialLastUpdated,
  className = '',
  defaultIntervalSeconds = 60,
}: ExecutiveLiveSyncProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Hydration-safe mounted flag
  const [mounted, setMounted] = useState<boolean>(false);

  // Default to server-safe constant to prevent SSR / Client hydration mismatch
  const [intervalSec, setIntervalSec] = useState<number>(defaultIntervalSeconds);
  const [countdown, setCountdown] = useState<number>(defaultIntervalSeconds);
  const [lastSyncTime, setLastSyncTime] = useState<string>(
    initialLastUpdated || 'ล่าสุด'
  );
  const [isOpenMenu, setIsOpenMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastHiddenTimeRef = useRef<number | null>(null);

  // Sync with localStorage only after mount to guarantee 100% hydration match
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('executive_live_sync_interval');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          setIntervalSec(parsed);
          setCountdown(parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }

    if (!initialLastUpdated) {
      setLastSyncTime(formatNowTime());
    }
  }, [initialLastUpdated]);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save interval preference
  const handleSelectInterval = (val: number) => {
    setIntervalSec(val);
    setCountdown(val);
    setIsOpenMenu(false);
    try {
      localStorage.setItem('executive_live_sync_interval', val.toString());
    } catch {
      // Ignore storage write errors
    }
  };

  // Trigger manual or automated refresh
  const triggerRefresh = () => {
    startTransition(() => {
      router.refresh();
      setLastSyncTime(formatNowTime());
      if (intervalSec > 0) {
        setCountdown(intervalSec);
      }
    });
  };

  // Timer effect (runs only when mounted and intervalSec > 0)
  useEffect(() => {
    if (!mounted || intervalSec <= 0) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          triggerRefresh();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, intervalSec]);

  // Handle visibility change: if returning from background after long time, sync immediately
  useEffect(() => {
    if (!mounted) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (lastHiddenTimeRef.current && intervalSec > 0) {
          const elapsedSec = Math.floor((Date.now() - lastHiddenTimeRef.current) / 1000);
          if (elapsedSec >= intervalSec) {
            triggerRefresh();
          } else {
            setCountdown((prev) => Math.max(1, prev - elapsedSec));
          }
        }
        lastHiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mounted, intervalSec]);

  const activeInterval = mounted ? intervalSec : defaultIntervalSeconds;
  const displayCountdown = mounted ? countdown : defaultIntervalSeconds;

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`} ref={menuRef}>
      {/* Live Sync Status Pill & Dropdown Toggle */}
      <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl p-0.5 shadow-2xs hover:border-slate-300 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpenMenu(!isOpenMenu)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
          title="ตั้งค่ารอบการอัปเดตอัตโนมัติ (Live Sync)"
        >
          {activeInterval > 0 ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
          )}

          <span className="hidden sm:inline text-[11px] font-bold tracking-tight">
            {activeInterval > 0 ? 'Live Sync' : 'Manual Sync'}
          </span>

          {activeInterval > 0 && (
            <span
              className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded-md border border-slate-200/80 font-bold"
              suppressHydrationWarning
            >
              {displayCountdown}s
            </span>
          )}

          <ChevronDown size={11} className={`text-slate-400 transition-transform ${isOpenMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-200 my-auto" />

        {/* Refresh Now Button */}
        <button
          type="button"
          onClick={triggerRefresh}
          disabled={isPending}
          className={`p-1 px-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-white transition-all cursor-pointer flex items-center gap-1 ${isPending ? 'opacity-70 cursor-wait' : ''
            }`}
          title={`กดเพื่ออัปเดตข้อมูลสดทันที`}
        >
          <RefreshCw
            size={13}
            className={`transition-transform ${isPending ? 'animate-spin text-red-600' : ''}`}
          />
          <span className="hidden md:inline text-[10px] font-bold text-slate-600">
            {isPending ? 'กำลังอัปเดต...' : 'รีเฟรช'}
          </span>
        </button>
      </div>

      {/* Interval Selection Dropdown */}
      {isOpenMenu && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in-50 zoom-in-95 text-xs font-ibm-thai">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>ความถี่การอัปเดต</span>
            <Radio size={11} className="text-red-500" />
          </div>

          <div className="p-1 space-y-0.5">
            {INTERVAL_OPTIONS.map((opt) => {
              const isSelected = activeInterval === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectInterval(opt.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${isSelected
                    ? 'bg-red-50 text-red-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={13} className="text-red-600" />}
                </button>
              );
            })}
          </div>

          <div className="mt-1 pt-1.5 px-3 pb-1 border-t border-slate-100 text-[10px] text-slate-400" suppressHydrationWarning>
            อัปเดตล่าสุด: <span className="font-mono text-slate-600 font-semibold">{mounted ? lastSyncTime : (initialLastUpdated || 'ล่าสุด')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
