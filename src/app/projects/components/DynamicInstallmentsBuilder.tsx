"use client";

import React, { useId } from 'react';
import { Plus, Trash2, Calculator, CheckCircle2, AlertTriangle, AlertCircle, Coins, Layers, ArrowRight } from 'lucide-react';

export interface DepositConfig {
  hasDeposit: boolean;
  percent: string;
  amount: string;
  dueDate: string;
  title: string;
}

export interface InstallmentItem {
  id: string;
  no: number;
  title: string;
  amount: string;
  percent: string;
  dueDate: string;
}

interface DynamicInstallmentsBuilderProps {
  projectValue: string | number;
  deposit: DepositConfig;
  onDepositChange: (deposit: DepositConfig) => void;
  installments: InstallmentItem[];
  onInstallmentsChange: (items: InstallmentItem[]) => void;
  disabled?: boolean;
}

export default function DynamicInstallmentsBuilder({
  projectValue,
  deposit,
  onDepositChange,
  installments,
  onInstallmentsChange,
  disabled = false,
}: DynamicInstallmentsBuilderProps) {
  const compId = useId();
  const numericProjectValue = Number(projectValue) || 0;

  // Financial calculations
  const depositAmount = deposit.hasDeposit ? (Number(deposit.amount) || 0) : 0;
  const depositPercent = deposit.hasDeposit
    ? (Number(deposit.percent) || (numericProjectValue > 0 ? (depositAmount / numericProjectValue) * 100 : 0))
    : 0;

  // Work balance to be divided across progress installments
  const targetWorkValue = Math.max(0, numericProjectValue - depositAmount);
  const targetWorkPercent = numericProjectValue > 0 ? (targetWorkValue / numericProjectValue) * 100 : 0;

  // Total of progress installments
  const totalInstallmentsAmount = installments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalInstallmentsPercent = installments.reduce((sum, item) => sum + (Number(item.percent) || 0), 0);

  // Grand total allocated
  const grandTotalAllocated = depositAmount + totalInstallmentsAmount;
  const grandTotalPercent = depositPercent + totalInstallmentsPercent;
  const remainingAmount = numericProjectValue - grandTotalAllocated;

  const isBalanced = numericProjectValue > 0 && Math.abs(remainingAmount) < 0.05;
  const isUnder = numericProjectValue > 0 && remainingAmount >= 0.05;
  const isOver = numericProjectValue > 0 && remainingAmount <= -0.05;

  // ── Deposit Handlers ──
  const handleToggleDeposit = (hasDeposit: boolean) => {
    if (!hasDeposit) {
      onDepositChange({
        ...deposit,
        hasDeposit: false,
        amount: '',
        percent: '',
      });
    } else {
      const defaultPct = 20;
      const defaultAmt = numericProjectValue > 0 ? ((numericProjectValue * defaultPct) / 100).toFixed(2) : '';
      onDepositChange({
        ...deposit,
        hasDeposit: true,
        percent: defaultPct.toString(),
        amount: defaultAmt,
        title: deposit.title || 'เงินมัดจำเมื่อเซ็นสัญญา',
      });
    }
  };

  const handleDepositPreset = (pct: number) => {
    const amt = numericProjectValue > 0 ? ((numericProjectValue * pct) / 100).toFixed(2) : '';
    onDepositChange({
      ...deposit,
      hasDeposit: true,
      percent: pct.toString(),
      amount: amt,
      title: deposit.title || 'เงินมัดจำเมื่อเซ็นสัญญา',
    });
  };

  const handleDepositFieldChange = (field: keyof DepositConfig, value: any) => {
    const updated = { ...deposit, [field]: value };
    if (field === 'percent') {
      const pct = parseFloat(value);
      if (!isNaN(pct) && numericProjectValue > 0) {
        updated.amount = ((numericProjectValue * pct) / 100).toFixed(2);
      } else if (!value) {
        updated.amount = '';
      }
    }
    if (field === 'amount') {
      const amt = parseFloat(value);
      if (!isNaN(amt) && numericProjectValue > 0) {
        updated.percent = ((amt / numericProjectValue) * 100).toFixed(2);
      } else if (!value) {
        updated.percent = '';
      }
    }
    onDepositChange(updated);
  };

  // ── Progress Installments Handlers ──
  const handleAddInstallment = () => {
    const nextNo = installments.length + 1;
    const suggestedAmount = remainingAmount > 0 ? remainingAmount.toFixed(2) : '';
    const suggestedPercent = numericProjectValue > 0 && remainingAmount > 0
      ? ((remainingAmount / numericProjectValue) * 100).toFixed(1)
      : '';

    const defaultTitle = nextNo === 1
      ? 'ส่งมอบอุปกรณ์ / ดำเนินการขั้นที่ 1'
      : (nextNo === installments.length + 1 && remainingAmount > 0 ? 'ส่งมอบงานขั้นสุดท้าย' : `งวดงานที่ ${nextNo}`);

    const newItem: InstallmentItem = {
      id: `${compId}-inst-${Date.now()}-${nextNo}`,
      no: nextNo,
      title: defaultTitle,
      amount: suggestedAmount,
      percent: suggestedPercent,
      dueDate: '',
    };

    onInstallmentsChange([...installments, newItem]);
  };

  const handleRemoveInstallment = (index: number) => {
    if (installments.length <= 1) return;
    const updated = installments.filter((_, idx) => idx !== index).map((item, idx) => ({
      ...item,
      no: idx + 1,
    }));
    onInstallmentsChange(updated);
  };

  const handleInstallmentFieldChange = (index: number, field: keyof InstallmentItem, value: string) => {
    const updated = [...installments];
    const item = { ...updated[index], [field]: value };

    if (field === 'amount') {
      const amt = parseFloat(value);
      if (!isNaN(amt) && numericProjectValue > 0) {
        item.percent = ((amt / numericProjectValue) * 100).toFixed(2);
      } else if (!value) {
        item.percent = '';
      }
    }

    if (field === 'percent') {
      const pct = parseFloat(value);
      if (!isNaN(pct) && numericProjectValue > 0) {
        item.amount = ((numericProjectValue * pct) / 100).toFixed(2);
      } else if (!value) {
        item.amount = '';
      }
    }

    updated[index] = item;
    onInstallmentsChange(updated);
  };

  const handleSplitWorkEvenly = () => {
    if (installments.length === 0 || targetWorkValue <= 0) return;
    const count = installments.length;
    const equalAmount = Math.floor((targetWorkValue / count) * 100) / 100;

    const updated = installments.map((item, idx) => {
      const isLast = idx === count - 1;
      const amt = isLast ? (targetWorkValue - (equalAmount * (count - 1))).toFixed(2) : equalAmount.toFixed(2);
      const pct = numericProjectValue > 0 ? ((Number(amt) / numericProjectValue) * 100).toFixed(2) : '';
      return {
        ...item,
        amount: amt,
        percent: pct,
      };
    });

    onInstallmentsChange(updated);
  };

  const handleFillRemainderToLast = () => {
    if (installments.length === 0 || numericProjectValue <= 0 || !isUnder) return;
    const updated = [...installments];
    const lastIdx = updated.length - 1;
    const currentLast = Number(updated[lastIdx].amount) || 0;
    const newLastAmount = (currentLast + remainingAmount).toFixed(2);

    updated[lastIdx] = {
      ...updated[lastIdx],
      amount: newLastAmount,
      percent: ((Number(newLastAmount) / numericProjectValue) * 100).toFixed(2),
    };
    onInstallmentsChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* ── PART 1: Contract Signing Deposit (เงินมัดจำสัญญา) ── */}
      <div className={`p-4 rounded-2xl border transition-all ${deposit.hasDeposit
        ? 'bg-gradient-to-br from-amber-50/60 to-orange-50/30 border-amber-200'
        : 'bg-gray-50/70 border-gray-200/80'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/70">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${deposit.hasDeposit ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'
              }`}>
              <Coins size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>1. เงินมัดจำ / เงินรับล่วงหน้าเมื่อเซ็นสัญญา (Deposit / Advance)</span>
                {deposit.hasDeposit && (
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                    ไม่นับเป็นงวดส่งมอบงาน
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-gray-500">
                เงินที่เก็บเมื่อเซ็นสัญญาเพื่อสั่งซื้อของ/เริ่มงาน (บางโครงการมี บางโครงการไม่มี)
              </p>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center p-1 bg-white rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleToggleDeposit(true)}
              disabled={disabled}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${deposit.hasDeposit
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              มีเงินมัดจำ
            </button>
            <button
              type="button"
              onClick={() => handleToggleDeposit(false)}
              disabled={disabled}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${!deposit.hasDeposit
                ? 'bg-gray-700 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              ไม่มีมัดจำ (0%)
            </button>
          </div>
        </div>

        {/* Deposit Inputs */}
        {deposit.hasDeposit ? (
          <div className="pt-3.5 space-y-3">
            {/* Quick Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-gray-500 font-semibold mr-1">ปุ่มลัด:</span>
              {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleDepositPreset(pct)}
                  disabled={disabled}
                  className={`px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${Number(deposit.percent) === pct
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:bg-amber-50'
                    }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Description */}
              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] font-bold text-gray-700">คำอธิบาย</label>
                <input
                  type="text"
                  value={deposit.title}
                  onChange={(e) => handleDepositFieldChange('title', e.target.value)}
                  placeholder="เงินมัดจำเมื่อเซ็นสัญญา"
                  disabled={disabled}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Percentage */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">อัตรามัดจำ (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={deposit.percent}
                    onChange={(e) => handleDepositFieldChange('percent', e.target.value)}
                    placeholder="20.00"
                    disabled={disabled}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-right font-mono font-bold text-amber-900"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">จำนวนเงินมัดจำ (฿)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={deposit.amount}
                    onChange={(e) => handleDepositFieldChange('amount', e.target.value)}
                    placeholder="0.00"
                    disabled={disabled}
                    className="w-full pl-6 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-right font-mono font-black text-amber-950 text-sm"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold pointer-events-none">
                    ฿
                  </span>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">วันที่คาดว่าจะเก็บเงินมัดจำ</label>
                <input
                  type="date"
                  value={deposit.dueDate}
                  onChange={(e) => handleDepositFieldChange('dueDate', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-gray-800 font-mono"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <span>โครงการนี้ไม่มีการเรียกเก็บเงินมัดจำล่วงหน้า มูลค่าสัญญาเต็ม 100% จะถูกนำไปแบ่งตามงวดส่งมอบงาน</span>
          </div>
        )}
      </div>

      {/* ── PART 2: Progress Installments (งวดส่งมอบงานจริง) ── */}
      <div className="space-y-3.5">
        {/* Subheader & Balance available for work milestones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>2. การแบ่งชำระตามงวดงานจริง (Progress Milestones)</span>
                <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {installments.length} งวด
                </span>
              </h4>
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span>ยอดเงินสำหรับแบ่งงวดงาน:</span>
                <span className="font-bold text-blue-800 font-mono">
                  {targetWorkValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                </span>
                {numericProjectValue > 0 && (
                  <span className="text-gray-400 font-mono">({targetWorkPercent.toFixed(1)}% ของสัญญา)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {targetWorkValue > 0 && (
              <button
                type="button"
                onClick={handleSplitWorkEvenly}
                disabled={disabled}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                title="คำนวณแบ่งยอดเงินหลังหักมัดจำให้ทุกงวดเท่ากันโดยอัตโนมัติ"
              >
                <Calculator size={13} className="text-slate-600" />
                <span>แบ่งเท่ากันทุกงวด</span>
              </button>
            )}

            {isUnder && (
              <button
                type="button"
                onClick={handleFillRemainderToLast}
                disabled={disabled}
                className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                title="เติมยอดคงเหลือที่ยังไม่ได้จัดสรรเข้างวดสุดท้าย"
              >
                <span>+ เติมยอดคงเหลือเข้างวดสุดท้าย</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddInstallment}
              disabled={disabled}
              className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>+ เพิ่มงวดงาน</span>
            </button>
          </div>
        </div>

        {/* Progress Installments List */}
        <div className="space-y-2.5">
          {installments.map((inst, index) => (
            <div
              key={inst.id || `inst-${index}`}
              className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 transition-all flex flex-col md:flex-row md:items-center gap-3"
            >
              {/* Installment Badge & Index */}
              <div className="flex items-center justify-between md:justify-start gap-2 min-w-[90px]">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {inst.no}
                </span>
                <span className="text-xs font-bold text-gray-800 whitespace-nowrap">
                  งวดที่ {inst.no}
                </span>
              </div>

              {/* Title / Description */}
              <div className="flex-1 min-w-[160px]">
                <input
                  type="text"
                  value={inst.title}
                  onChange={(e) => handleInstallmentFieldChange(index, 'title', e.target.value)}
                  placeholder="คำอธิบาย เช่น ส่งมอบอุปกรณ์, ติดตั้งโครงสร้าง..."
                  disabled={disabled}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-gray-800 placeholder:text-gray-400"
                />
              </div>

              {/* Percentage (%) */}
              <div className="w-full md:w-24 relative">
                <input
                  type="number"
                  step="0.01"
                  value={inst.percent}
                  onChange={(e) => handleInstallmentFieldChange(index, 'percent', e.target.value)}
                  placeholder="%"
                  disabled={disabled}
                  className="w-full pl-2.5 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-right font-mono"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold pointer-events-none">
                  %
                </span>
              </div>

              {/* Amount (฿) */}
              <div className="w-full md:w-44 relative">
                <input
                  type="number"
                  step="0.01"
                  value={inst.amount}
                  onChange={(e) => handleInstallmentFieldChange(index, 'amount', e.target.value)}
                  placeholder="0.00"
                  disabled={disabled}
                  className="w-full pl-6 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-right font-mono font-bold text-gray-900"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold pointer-events-none">
                  ฿
                </span>
              </div>

              {/* Due Date */}
              <div className="w-full md:w-36">
                <input
                  type="date"
                  value={inst.dueDate}
                  onChange={(e) => handleInstallmentFieldChange(index, 'dueDate', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-gray-700 font-mono"
                  title="กำหนดส่งมอบงาน / กำหนดชำระ"
                />
              </div>

              {/* Delete button */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveInstallment(index)}
                  disabled={disabled || installments.length <= 1}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent cursor-pointer"
                  title={installments.length <= 1 ? 'ต้องมีอย่างน้อย 1 งวด' : 'ลบงวดนี้'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PART 3: Total Amount & Reconciliation Bar ── */}
      <div className="p-4 rounded-2xl border bg-gradient-to-br from-slate-50 to-gray-50/80 border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Card 1: Project Value */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-gray-500 block text-[11px] font-semibold mb-0.5">
              มูลค่าโครงการรวม VAT
            </span>
            <span className="font-mono font-bold text-gray-900 text-sm">
              {numericProjectValue > 0
                ? Number(numericProjectValue).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })
                : 'ไม่ได้ระบุ'}
            </span>
          </div>

          {/* Card 2: Deposit */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold mb-0.5">
              <span>เงินมัดจำสัญญา</span>
              {depositAmount > 0 && (
                <span className="text-amber-800 font-mono font-bold">
                  {depositPercent.toFixed(1)}%
                </span>
              )}
            </div>
            <span className="font-mono font-bold text-amber-800 text-sm">
              {deposit.hasDeposit && depositAmount > 0
                ? depositAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })
                : 'ไม่มีมัดจำ (0%)'}
            </span>
          </div>

          {/* Card 3: Total Progress Installments */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold mb-0.5">
              <span>รวมค่างวดงาน ({installments.length} งวด)</span>
              {totalInstallmentsPercent > 0 && (
                <span className="text-blue-700 font-mono font-bold">
                  {totalInstallmentsPercent.toFixed(1)}%
                </span>
              )}
            </div>
            <span className="font-mono font-bold text-blue-700 text-sm">
              {totalInstallmentsAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
            </span>
          </div>

          {/* Card 4: Reconciliation Status */}
          <div className={`p-3 rounded-xl border ${isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : isOver
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}>
            <span className="block text-[11px] font-semibold mb-0.5 opacity-80">
              {isBalanced ? 'ความสอดคล้องยอดเงิน' : (isOver ? 'ยอดจัดสรรเกินสัญญา' : 'ยอดคงเหลือที่ยังไม่จัดสรร')}
            </span>
            <span className="font-mono font-bold text-sm">
              {numericProjectValue > 0
                ? (isBalanced ? '✓ ครบ 100% ตรงตามสัญญา' : Math.abs(remainingAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }))
                : '-'}
            </span>
          </div>
        </div>

        {/* Visual Confirmation Banner */}
        {numericProjectValue > 0 && (
          <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${isBalanced
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : isOver
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
            {isBalanced ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium">
                  ยอดจัดสรรครบถ้วน 100%: <b>เงินมัดจำ ({depositAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })})</b> + <b>ค่างวดงาน {installments.length} งวด ({totalInstallmentsAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })})</b> = <b>{numericProjectValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</b>
                </span>
              </>
            ) : isOver ? (
              <>
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span className="font-medium">
                  ยอดจัดสรรรวม (มัดจำ + ค่างวดงาน) เกินมูลค่าสัญญาอยู่ <b>{Math.abs(remainingAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</b> กรุณาปรับลดยอดเงิน
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span className="font-medium">
                  ยังมียอดคงเหลือที่ยังไม่ได้จัดสรรอีก <b>{remainingAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</b> ({((remainingAmount / numericProjectValue) * 100).toFixed(1)}%)
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
