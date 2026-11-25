'use client';

import React, { useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  XCircle,
  Banknote,
  Loader2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import {
  calculateCommissionFromProfit,
  CommissionRecipientOption,
  CommissionSplitInput,
  CommissionSplitItem,
  deriveCostFromProfitPct,
  deriveProfitPctFromCost,
  normalizeAndValidateCommissionSplits,
  resolveEffectiveCommissionSplits,
} from '@/app/lib/salesCommission';
import { formatRatePct, formatThb } from './CommissionUiHelpers';
import CommissionSplitEditor from './CommissionSplitEditor';

export type CommissionRequestActionTarget = {
  id: string;
  requestNo: string;
  jobNumber: string;
  customerName: string;
  salespersonId?: string | null;
  salespersonName?: string;
  salesAmountExVat: number;
  costAmount: number | null;
  sourceProfitPct: number | null;
  confirmedProfitPct: number | null;
  profitEditReason: string | null;
  commissionRatePct: number | null;
  commissionAmount: number | null;
  hasGoodsReturn: boolean;
  status: string;
  splits?: CommissionSplitItem[];
};

export function ProfitVerificationForm({
  item,
  onCompleted,
  onCancel,
}: {
  item: CommissionRequestActionTarget;
  onCompleted: () => void;
  onCancel?: () => void;
}) {
  const [costInput, setCostInput] = useState<string>(
    item.costAmount !== null && item.costAmount !== undefined ? String(item.costAmount) : ''
  );
  const [profitInput, setProfitInput] = useState<string>(
    item.confirmedProfitPct !== null && item.confirmedProfitPct !== undefined
      ? String(item.confirmedProfitPct)
      : ''
  );
  const [reason, setReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRevision = item.confirmedProfitPct !== null;
  const isApprovedRevision = item.status === 'APPROVED';

  const handleCostChange = (val: string) => {
    setCostInput(val);
    if (val.trim() === '') {
      setProfitInput('');
      return;
    }
    const num = Number(val);
    if (Number.isFinite(num) && item.salesAmountExVat > 0) {
      const derivedPct = deriveProfitPctFromCost(item.salesAmountExVat, num);
      setProfitInput(derivedPct !== null ? String(derivedPct) : '');
    }
  };

  const handleProfitChange = (val: string) => {
    setProfitInput(val);
    if (val.trim() === '') {
      setCostInput('');
      return;
    }
    const num = Number(val);
    if (Number.isFinite(num) && item.salesAmountExVat > 0) {
      const derivedCost = deriveCostFromProfitPct(item.salesAmountExVat, num);
      setCostInput(derivedCost !== null ? String(derivedCost) : '');
    }
  };

  const previewCalc = useMemo(() => {
    const parsedPct = profitInput.trim() === '' ? null : Number(profitInput);
    return calculateCommissionFromProfit(
      item.salesAmountExVat,
      parsedPct !== null && Number.isFinite(parsedPct) ? parsedPct : null
    );
  }, [item.salesAmountExVat, profitInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (profitInput.trim() === '' && costInput.trim() === '') {
      setError('กรุณากรอกต้นทุน หรือ % กำไร อย่างน้อย 1 ช่อง');
      return;
    }
    if (isRevision && !reason.trim()) {
      setError('กรุณาระบุเหตุผลในการแก้ไขตัวเลขกำไร');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/sales/commissions/${item.id}/profit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costAmount: costInput.trim() === '' ? null : Number(costInput),
          profitPct: profitInput.trim() === '' ? null : Number(profitInput),
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกการยืนยันกำไรไม่สำเร็จ');
      }
      onCompleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const parsedPctNum = profitInput.trim() === '' ? null : Number(profitInput);
  const formulaDesc =
    parsedPctNum === null || !Number.isFinite(parsedPctNum)
      ? 'กรอก % กำไรเพื่อคำนวณอัตโนมัติ'
      : parsedPctNum >= 20
      ? 'กำไร ≥ 20% → ใช้อัตรา 0.5000% ทันที'
      : parsedPctNum > 0
      ? `กำไร < 20% → (${parsedPctNum}% × 0.25%) ÷ 20%`
      : 'กำไร ≤ 0% → ค่าคอมมิชชั่น 0.00 บาท';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isApprovedRevision && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-900">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <div className="font-bold">คำขอนี้ได้รับการอนุมัติแล้ว (APPROVED)</div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              การแก้ไขต้นทุน / % กำไรจะคงสถานะ <strong>อนุมัติแล้ว</strong> คำนวณค่าคอมมิชชั่นและสัดส่วนผู้รับใหม่ให้อัตโนมัติ พร้อมบันทึกประวัติแก้ไข (Audit Log)
            </div>
          </div>
        </div>
      )}

      {item.hasGoodsReturn && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-center gap-2 text-xs font-bold text-orange-800">
          <AlertTriangle size={15} className="shrink-0" />
          <span>คำเตือน: Job นี้มีรายการคืนสินค้า (GoodsReturn) โปรดตรวจสอบยอดสุทธิและต้นทุนก่อนยืนยัน</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-col">
          <div className="text-[11px] font-medium text-slate-500">ยอดขายไม่รวม VAT</div>
          <div className="font-black text-slate-900 mt-1 tabular-nums">
            {formatThb(item.salesAmountExVat)} บาท
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-col">
          <div className="text-[11px] font-medium text-slate-500">% กำไรเดิม (อ้างอิง)</div>
          <div className="font-bold text-slate-700 mt-1 tabular-nums">
            {item.sourceProfitPct !== null ? `${item.sourceProfitPct.toFixed(2)}%` : '—'}
          </div>
        </div>
        <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 flex flex-col">
          <div className="text-[11px] font-medium text-slate-500">% กำไรที่ยืนยันล่าสุด</div>
          <div className="font-bold text-indigo-700 mt-1 tabular-nums">
            {item.confirmedProfitPct !== null ? `${item.confirmedProfitPct.toFixed(2)}%` : 'ยังไม่ยืนยัน'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ต้นทุนรวม (บาท - ไม่รวม VAT)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={costInput}
            onChange={(e) => handleCostChange(e.target.value)}
            placeholder="กรอกต้นทุน (ระบบคำนวณ % กำไรให้)"
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            % กำไรที่ยืนยัน (หรือแก้ไขตรงนี้)
          </label>
          <input
            type="number"
            step="0.0001"
            value={profitInput}
            onChange={(e) => handleProfitChange(e.target.value)}
            placeholder="เช่น 25, 20, 15, 10..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
          />
        </div>
      </div>

      <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <Calculator size={15} />
            <span>พรีวิวการคำนวณค่าคอมมิชชั่น</span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 bg-white/90 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
            {formulaDesc}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/90 border border-indigo-200/70 p-3">
            <div className="text-[11px] text-indigo-700">อัตราค่าคอมฯ</div>
            <div className="text-base font-black text-indigo-900 mt-0.5 tabular-nums">
              {previewCalc.awaitingProfitReview ? '—' : formatRatePct(previewCalc.ratePct)}
            </div>
          </div>
          <div className="rounded-xl bg-white/90 border border-indigo-200/70 p-3">
            <div className="text-[11px] text-indigo-700">ค่าคอมมิชชั่นที่คำนวณได้</div>
            <div className="text-base font-black text-emerald-700 mt-0.5 tabular-nums">
              {previewCalc.awaitingProfitReview ? 'รอตรวจสอบกำไร' : `${formatThb(previewCalc.amount)} บาท`}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          เหตุผลการยืนยัน / แก้ไขกำไร {isRevision ? <span className="text-red-600">*</span> : '(ไม่บังคับ)'}
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="บันทึกที่มาของต้นทุน หรือเหตุผลการปรับ % กำไร..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <div className={onCancel ? 'grid grid-cols-2 gap-3 pt-1' : 'pt-1'}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {isApprovedRevision ? 'บันทึกแก้ไขกำไร (คงสถานะอนุมัติ)' : 'บันทึก & ยืนยันกำไร'}
        </button>
      </div>
    </form>
  );
}

export function ApprovalDecisionForm({
  item,
  onCompleted,
  onCancel,
}: {
  item: CommissionRequestActionTarget;
  onCompleted: () => void;
  onCancel?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove =
    item.confirmedProfitPct !== null &&
    item.commissionRatePct !== null &&
    item.commissionAmount !== null;

  const submitDecision = async (decision: 'APPROVE' | 'REJECT') => {
    setError(null);
    if (decision === 'REJECT' && !reason.trim()) {
      setError('กรุณาระบุเหตุผลกรณีไม่อนุมัติ');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sales/commissions/${item.id}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกผลการพิจารณาไม่สำเร็จ');
      }
      onCompleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'บันทึกผลการพิจารณาไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-[11px] font-medium text-slate-500">% กำไรที่ยืนยัน</div>
          <div className="font-bold text-slate-900 mt-1 tabular-nums">
            {item.confirmedProfitPct !== null ? `${item.confirmedProfitPct.toFixed(2)}%` : 'ยังไม่ยืนยัน'}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-[11px] font-medium text-slate-500">% ค่าคอมฯ</div>
          <div className="font-bold text-slate-900 mt-1 tabular-nums">
            {item.commissionRatePct !== null ? formatRatePct(item.commissionRatePct) : '—'}
          </div>
        </div>
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3">
          <div className="text-[11px] font-medium text-slate-500">ยอดค่าคอมมิชชั่น</div>
          <div className="font-black text-emerald-700 mt-1 tabular-nums">
            {item.commissionAmount !== null ? `${formatThb(item.commissionAmount)} บาท` : 'รอตรวจกำไร'}
          </div>
        </div>
      </div>

      <SplitBreakdownPreview item={item} />

      {!canApprove && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-800">
          กรุณายืนยันตัวเลขกำไรใน Step 4 ก่อน จึงจะกดอนุมัติได้ (หรือสามารถกดปฏิเสธพร้อมระบุเหตุผล)
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          หมายเหตุอนุมัติ / เหตุผลกรณีไม่อนุมัติ
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ระบุเหตุผล (บังคับกรอกเมื่อกดไม่อนุมัติ)..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <div className={onCancel ? 'grid grid-cols-3 gap-2.5 pt-1' : 'grid grid-cols-2 gap-2.5 pt-1'}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ปิด
          </button>
        )}
        <button
          type="button"
          onClick={() => submitDecision('REJECT')}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold disabled:opacity-50 transition-colors"
        >
          <XCircle size={14} />
          ไม่อนุมัติ
        </button>
        <button
          type="button"
          onClick={() => submitDecision('APPROVE')}
          disabled={isSubmitting || !canApprove}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-40 transition-colors"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          อนุมัติคำขอ
        </button>
      </div>
    </div>
  );
}

export function PayoutRecordForm({
  item,
  onCompleted,
  onCancel,
}: {
  item: CommissionRequestActionTarget;
  onCompleted: () => void;
  onCancel?: () => void;
}) {
  const todayBangkok = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [payoutDate, setPayoutDate] = useState(todayBangkok);
  const [payoutAmount, setPayoutAmount] = useState(
    item.commissionAmount !== null ? String(item.commissionAmount) : ''
  );
  const [payoutRefNo, setPayoutRefNo] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!payoutDate || !payoutRefNo.trim() || payoutAmount.trim() === '') {
      setError('กรุณาระบุวันที่จ่าย ยอดเงิน และเลขที่อ้างอิงการจ่ายให้ครบถ้วน');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/sales/commissions/${item.id}/payout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutDate,
          payoutAmount: Number(payoutAmount),
          payoutRefNo: payoutRefNo.trim(),
          payoutNote: payoutNote.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกการจ่ายเงินไม่สำเร็จ');
      }
      onCompleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'บันทึกการจ่ายเงินไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">วันที่จ่ายเงิน *</label>
          <input
            type="date"
            value={payoutDate}
            onChange={(e) => setPayoutDate(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">ยอดเงินที่จ่ายจริง (บาท) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          เลขที่อ้างอิงการจ่าย / เลขที่โอน / ใบสำคัญจ่าย *
        </label>
        <input
          type="text"
          value={payoutRefNo}
          onChange={(e) => setPayoutRefNo(e.target.value)}
          placeholder="เช่น PV-6911-0012 หรือเลข Reference ธนาคาร"
          required
          className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/30"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุการจ่าย (ถ้ามี)</label>
        <textarea
          rows={2}
          value={payoutNote}
          onChange={(e) => setPayoutNote(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
        />
      </div>

      <SplitBreakdownPreview item={item} />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <div className={onCancel ? 'grid grid-cols-2 gap-3 pt-1' : 'pt-1'}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-1.5 w-full h-10 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
          บันทึกจ่ายเงินแล้ว
        </button>
      </div>
    </form>
  );
}

function SplitBreakdownPreview({ item }: { item: CommissionRequestActionTarget }) {
  const splits = resolveEffectiveCommissionSplits({
    salespersonId: item.salespersonId,
    salespersonName: item.salespersonName || '-',
    commissionAmount: item.commissionAmount,
    splits: item.splits,
  });

  if (splits.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-indigo-900">
          <Users size={13} className="text-indigo-600" />
          สัดส่วนผู้รับค่าคอมมิชชั่น ({splits.length} คน)
        </span>
        {splits.length > 1 && (
          <span className="text-[10px] font-semibold text-indigo-600">
            รวม 100% ของคำขอ
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {splits.map((s, idx) => (
          <div
            key={`${idx}-${s.userId || s.recipientName}`}
            className="flex items-center justify-between gap-2 bg-white/90 border border-indigo-100 rounded-lg px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-800 truncate">{s.recipientName}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                    s.isOwner
                      ? 'bg-red-50 text-[#ff2301] border-red-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {s.isOwner ? 'เจ้าของงาน' : 'ผู้ร่วมแบ่ง'}
                </span>
              </div>
              {(s.employeeId || s.recipientRole) && (
                <div className="text-[10px] text-slate-400">
                  {[s.employeeId, s.recipientRole].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>

            <div className="text-right tabular-nums shrink-0">
              <div className="font-black text-indigo-700">{s.splitPct.toFixed(2)}%</div>
              <div className="text-[11px] font-bold text-emerald-700">
                {s.allocatedAmount !== null && s.allocatedAmount !== undefined
                  ? `${formatThb(s.allocatedAmount)} ฿`
                  : 'รอตรวจกำไร'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SplitEditForm({
  item,
  recipientOptions,
  onCompleted,
  onCancel,
}: {
  item: CommissionRequestActionTarget;
  recipientOptions: CommissionRecipientOption[];
  onCompleted: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const initialSplits: CommissionSplitInput[] = resolveEffectiveCommissionSplits({
    salespersonId: item.salespersonId,
    salespersonName: item.salespersonName || 'เจ้าของงาน',
    commissionAmount: item.commissionAmount,
    splits: item.splits,
  }).map((s) => ({
    userId: s.userId,
    employeeId: s.employeeId,
    recipientName: s.recipientName,
    recipientRole: s.recipientRole,
    splitPct: s.splitPct,
    isOwner: s.isOwner,
  }));

  const [splits, setSplits] = useState<CommissionSplitInput[]>(initialSplits);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = item.status !== 'APPROVED' && item.status !== 'PAID';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canEdit) {
      setError('ไม่สามารถปรับสัดส่วนของคำขอที่อนุมัติหรือจ่ายเงินแล้วได้');
      return;
    }

    const validated = normalizeAndValidateCommissionSplits(splits, item.commissionAmount);
    if ('error' in validated) {
      setError(validated.error);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/sales/commissions/${item.id}/splits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splits: validated.splits,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกสัดส่วนการแบ่งค่าคอมมิชชั่นไม่สำเร็จ');
      }
      await onCompleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <CommissionSplitEditor
        splits={splits}
        onChange={setSplits}
        recipientOptions={recipientOptions}
        totalCommissionAmount={item.commissionAmount}
        defaultOwner={{
          userId: item.salespersonId,
          recipientName: item.salespersonName || 'เจ้าของงาน',
        }}
        disabled={!canEdit || isSaving}
      />

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          เหตุผล / หมายเหตุการแก้ไขสัดส่วน (ถ้ามี)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={!canEdit || isSaving}
          placeholder="เช่น แบ่งทีมผู้ประสานงานโครงการ หรือปรับตามข้อตกลงฝ่ายขาย"
          className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <div className={onCancel ? 'grid grid-cols-2 gap-3 pt-1' : 'pt-1'}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={!canEdit || isSaving}
          className="inline-flex items-center justify-center gap-1.5 w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
          บันทึกสัดส่วนแบ่งค่าคอมฯ
        </button>
      </div>
    </form>
  );
}
