'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2, Users, Percent, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import SearchableSelect from '@/app/components/SearchableSelect';
import {
  allocateCommissionAmountsBySplits,
  CommissionRecipientOption,
  CommissionSplitInput,
  normalizeAndValidateCommissionSplits,
  roundSplitPct2,
} from '@/app/lib/salesCommission';
import { formatThb } from './CommissionUiHelpers';

type Props = {
  splits: CommissionSplitInput[];
  onChange: (next: CommissionSplitInput[]) => void;
  recipientOptions: CommissionRecipientOption[];
  totalCommissionAmount?: number | null;
  defaultOwner?: {
    userId?: string | null;
    recipientName: string;
  };
  disabled?: boolean;
  compact?: boolean;
};

export default function CommissionSplitEditor({
  splits,
  onChange,
  recipientOptions,
  totalCommissionAmount = null,
  defaultOwner,
  disabled = false,
  compact = false,
}: Props) {
  const selectOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; searchText: string }>();
    for (const u of recipientOptions) {
      const deptLabel = u.department || u.role;
      const nickPart = u.nickname ? ` (${u.nickname})` : '';
      const roleSuffix = deptLabel ? ` — ${deptLabel}` : '';
      map.set(u.id, {
        value: u.id,
        label: `${u.fullName}${nickPart}${roleSuffix}`,
        searchText: [u.nickname, u.fullName, u.employeeId, deptLabel].filter(Boolean).join(' '),
      });
    }
    return Array.from(map.values());
  }, [recipientOptions]);

  const userById = useMemo(
    () => new Map(recipientOptions.map((u) => [u.id, u])),
    [recipientOptions]
  );

  const totalPct = useMemo(() => {
    return roundSplitPct2(
      splits.reduce((sum, s) => {
        const val = Number(s.splitPct);
        return Number.isFinite(val) ? sum + val : sum;
      }, 0)
    );
  }, [splits]);

  const validation = useMemo(
    () => normalizeAndValidateCommissionSplits(splits, totalCommissionAmount),
    [splits, totalCommissionAmount]
  );

  const allocatedPreviews = useMemo(() => {
    if (
      totalCommissionAmount === null ||
      totalCommissionAmount === undefined ||
      !Number.isFinite(totalCommissionAmount)
    ) {
      return splits.map(() => null);
    }
    const items = allocateCommissionAmountsBySplits(
      totalCommissionAmount,
      splits.map((s) => ({ splitPct: Number(s.splitPct) || 0 }))
    );
    return items.map((item) => item.allocatedAmount);
  }, [splits, totalCommissionAmount]);

  const handleSelectRecipient = (idx: number, selectedValue: string) => {
    const matched = userById.get(selectedValue);
    const next = splits.map((item, i) => {
      if (i !== idx) return item;
      if (matched) {
        return {
          ...item,
          userId: matched.id,
          employeeId: matched.employeeId,
          recipientName: matched.fullName,
          recipientRole: matched.department || matched.role,
        };
      }
      return {
        ...item,
        userId: null,
        employeeId: null,
        recipientName: selectedValue,
      };
    });
    onChange(next);
  };

  const handlePctChange = (idx: number, raw: string) => {
    const next = splits.map((item, i) => (i === idx ? { ...item, splitPct: raw } : item));
    onChange(next);
  };

  const handleSetOwner = (idx: number) => {
    const next = splits.map((item, i) => ({ ...item, isOwner: i === idx }));
    onChange(next);
  };

  const handleAddRecipient = () => {
    const usedIds = new Set(splits.map((s) => s.userId).filter(Boolean));
    const nextCandidate = recipientOptions.find((u) => !usedIds.has(u.id));
    const remainingPct = Math.max(0, roundSplitPct2(100 - totalPct));

    let nextSplits: CommissionSplitInput[];
    if (remainingPct > 0) {
      nextSplits = [
        ...splits,
        {
          userId: nextCandidate?.id ?? null,
          employeeId: nextCandidate?.employeeId ?? null,
          recipientName: nextCandidate?.fullName ?? '',
          recipientRole: nextCandidate ? nextCandidate.department || nextCandidate.role : null,
          splitPct: remainingPct,
          isOwner: false,
        },
      ];
    } else {
      nextSplits = [
        ...splits,
        {
          userId: nextCandidate?.id ?? null,
          employeeId: nextCandidate?.employeeId ?? null,
          recipientName: nextCandidate?.fullName ?? '',
          recipientRole: nextCandidate ? nextCandidate.department || nextCandidate.role : null,
          splitPct: 0,
          isOwner: false,
        },
      ];
    }
    onChange(nextSplits);
  };

  const handleSplitEvenly = () => {
    if (splits.length === 0) return;
    const count = splits.length;
    const base = Math.floor((10000 / count)) / 100;
    const remainder = roundSplitPct2(100 - base * count);
    const next = splits.map((s, idx) => ({
      ...s,
      splitPct: idx === 0 ? roundSplitPct2(base + remainder) : base,
    }));
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    if (splits.length <= 1) return;
    const remaining = splits.filter((_, i) => i !== idx);
    if (!remaining.some((s) => s.isOwner) && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isOwner: true };
    }
    onChange(remaining);
  };

  const handleResetOwner = () => {
    if (!defaultOwner) return;
    const matched = defaultOwner.userId ? userById.get(defaultOwner.userId) : undefined;
    onChange([
      {
        userId: matched?.id ?? defaultOwner.userId ?? null,
        employeeId: matched?.employeeId ?? null,
        recipientName: matched?.fullName ?? defaultOwner.recipientName,
        recipientRole: matched ? matched.department || matched.role : null,
        splitPct: 100,
        isOwner: true,
      },
    ]);
  };

  const isExact100 = Math.abs(totalPct - 100) <= 0.01 && !('error' in validation);

  return (
    <div className="space-y-2.5">
      <div className="space-y-2">
        {splits.map((split, idx) => {
          const selectVal = split.userId || split.recipientName || '';
          const rowOptions =
            split.userId && selectOptions.some((o) => o.value === split.userId)
              ? selectOptions
              : selectVal
              ? [
                  {
                    value: selectVal,
                    label: split.recipientRole
                      ? `${split.recipientName} (${split.recipientRole})`
                      : split.recipientName || selectVal,
                  },
                  ...selectOptions,
                ]
              : selectOptions;

          const previewAmount = allocatedPreviews[idx];

          return (
            <div
              key={`${idx}-${split.userId || split.recipientName}`}
              className={`rounded-xl border p-2.5 bg-white ${
                split.isOwner ? 'border-slate-300' : 'border-slate-200'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-6 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSetOwner(idx)}
                      title="คลิกเพื่อตั้งเป็นเจ้าของงานหลัก"
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        split.isOwner
                          ? 'bg-red-50 text-[#ff2301] border-red-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {split.isOwner ? 'เจ้าของงาน' : 'ผู้ร่วมแบ่ง'}
                    </button>
                    {split.employeeId && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {split.employeeId}
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    compact={compact || true}
                    disabled={disabled}
                    value={selectVal}
                    onChange={(val) => handleSelectRecipient(idx, val)}
                    placeholder="พิมพ์ชื่อจริง / ชื่อเล่น / รหัสพนักงาน..."
                    emptyText="ไม่พบรายชื่อพนักงาน"
                    options={rowOptions}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    สัดส่วน (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={disabled}
                      value={split.splitPct}
                      onChange={(e) => handlePctChange(idx, e.target.value)}
                      className="w-full h-9 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-right text-xs font-bold tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
                    />
                    <Percent
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 text-right tabular-nums">
                  <div className="text-[10px] font-bold text-slate-400 mb-1">ส่วนแบ่ง (บาท)</div>
                  <div className="text-xs font-black text-emerald-700 h-9 flex items-center justify-end">
                    {previewAmount !== null ? `${formatThb(previewAmount)} ฿` : 'รอตรวจกำไร'}
                  </div>
                </div>

                <div className="sm:col-span-1 flex items-end justify-end">
                  <button
                    type="button"
                    disabled={disabled || splits.length <= 1}
                    onClick={() => handleRemove(idx)}
                    aria-label="ลบรายชื่อผู้รับ"
                    title="ลบรายชื่อนี้"
                    className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls & Live 100% Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || splits.length >= 20}
            onClick={handleAddRecipient}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold disabled:opacity-40 transition-colors"
          >
            <Plus size={13} /> เพิ่มผู้ร่วมแบ่ง
          </button>
          <button
            type="button"
            disabled={disabled || splits.length < 2}
            onClick={handleSplitEvenly}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold disabled:opacity-40 transition-colors"
          >
            <Users size={13} /> แบ่งเท่าๆ กัน
          </button>
          {defaultOwner && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleResetOwner}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-bold disabled:opacity-40 transition-colors"
            >
              <RotateCcw size={12} /> เจ้าของ 100%
            </button>
          )}
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border tabular-nums ${
            isExact100
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {isExact100 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>
            รวม {totalPct.toFixed(2)}%{' '}
            {isExact100
              ? '(ครบ 100%)'
              : 'error' in validation
              ? `• ${validation.error}`
              : '• ต้องครบ 100%'}
          </span>
        </div>
      </div>
    </div>
  );
}
