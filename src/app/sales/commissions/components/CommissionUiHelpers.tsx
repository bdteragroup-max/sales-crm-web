'use client';

import React from 'react';
import {
  COMMISSION_STATUS_BADGE_CLASSES,
  COMMISSION_STATUS_LABELS,
  CommissionStatus,
} from '@/app/lib/salesCommission';

export function formatThb(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRatePct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${value.toFixed(4)}%`;
}

export function formatThaiDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  if (d.getUTCFullYear() >= 2500) {
    d.setUTCFullYear(d.getUTCFullYear() - 543);
  }
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatThaiDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  if (d.getUTCFullYear() >= 2500) {
    d.setUTCFullYear(d.getUTCFullYear() - 543);
  }
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function CommissionStatusBadge({ status }: { status: string }) {
  const key = status as CommissionStatus;
  const label = COMMISSION_STATUS_LABELS[key] || status;
  const cls =
    COMMISSION_STATUS_BADGE_CLASSES[key] ||
    'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

export function CompanyCodeBadge({ code }: { code: string }) {
  const styles: Record<string, string> = {
    TP: 'bg-blue-50 text-blue-700 border-blue-200',
    TG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TE: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${
        styles[code] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {code}
    </span>
  );
}
