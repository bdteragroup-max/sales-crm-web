'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  CheckSquare,
  Banknote,
  Eye,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import {
  calculateCommissionFromProfit,
  deriveCostFromProfitPct,
  deriveProfitPctFromCost,
} from '@/app/lib/salesCommission';
import CommissionNavHeader from '../components/CommissionNavHeader';
import {
  CommissionStatusBadge,
  CompanyCodeBadge,
  formatRatePct,
  formatThaiDateTime,
  formatThb,
} from '../components/CommissionUiHelpers';
import {
  ApprovalDecisionForm,
  CommissionRequestActionTarget,
  PayoutRecordForm,
} from '../components/CommissionActionForms';

export type CommissionApprovalRow = CommissionRequestActionTarget & {
  companyCode: string;
  productSold: string | null;
  salespersonName: string;
  requestedByName: string;
  requestedAt: string;
  taxInvoiceNumbers: string | null;
  receiptNumbers: string | null;
  jobClosedStatus: string;
  rejectedReason: string | null;
  payoutRefNo: string | null;
  payoutAmount: number | null;
};

type ActiveModalState =
  | { type: 'decision'; item: CommissionApprovalRow }
  | { type: 'payout'; item: CommissionApprovalRow }
  | null;

type InlineProfitDraft = {
  cost: string;
  profitPct: string;
  saving?: boolean;
  error?: string | null;
};

function getSavedInlineValues(row: CommissionApprovalRow) {
  return {
    cost:
      row.costAmount !== null && row.costAmount !== undefined
        ? String(row.costAmount)
        : '',
    profitPct:
      row.confirmedProfitPct !== null && row.confirmedProfitPct !== undefined
        ? String(row.confirmedProfitPct)
        : '',
  };
}

export default function CommissionApprovalsClient({
  initialItems,
}: {
  initialItems: CommissionApprovalRow[];
}) {
  const [items, setItems] = useState<CommissionApprovalRow[]>(initialItems);
  const [statusTab, setStatusTab] = useState<string>('ACTIONABLE');
  const [search, setSearch] = useState('');
  const [activeModal, setActiveModal] = useState<ActiveModalState>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, InlineProfitDraft>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isRowSelectableForBulkApprove = (row: CommissionApprovalRow): boolean => {
    if (row.status === 'APPROVED' || row.status === 'PAID') return false;
    const draft = drafts[row.id];
    if (draft) {
      const costTrim = draft.cost.trim();
      const profitTrim = draft.profitPct.trim();
      if (!costTrim && !profitTrim) return false;
      const costOk =
        costTrim === '' || (Number.isFinite(Number(costTrim)) && Number(costTrim) >= 0);
      const profitOk = profitTrim === '' || Number.isFinite(Number(profitTrim));
      return costOk && profitOk && (profitTrim !== '' || row.salesAmountExVat > 0);
    }
    return (
      row.confirmedProfitPct !== null &&
      row.commissionAmount !== null &&
      row.commissionRatePct !== null
    );
  };

  const getRowProjectedCommission = (row: CommissionApprovalRow): number => {
    const draft = drafts[row.id];
    if (draft) {
      const pctTrim = draft.profitPct.trim();
      if (pctTrim !== '' && Number.isFinite(Number(pctTrim))) {
        return calculateCommissionFromProfit(row.salesAmountExVat, Number(pctTrim)).amount ?? 0;
      }
      const costTrim = draft.cost.trim();
      if (costTrim !== '' && Number.isFinite(Number(costTrim)) && row.salesAmountExVat > 0) {
        const derivedPct = deriveProfitPctFromCost(row.salesAmountExVat, Number(costTrim));
        return calculateCommissionFromProfit(row.salesAmountExVat, derivedPct).amount ?? 0;
      }
      return 0;
    }
    return row.commissionAmount ?? 0;
  };

  const reloadItems = async () => {
    setIsReloading(true);
    try {
      const res = await fetch('/api/sales/commissions/reports', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.items) {
        setItems(data.items);
        setDrafts({});
        setSelectedIds(new Set());
      }
    } finally {
      setIsReloading(false);
    }
  };

  const handleInlineCostChange = (row: CommissionApprovalRow, val: string) => {
    const saved = getSavedInlineValues(row);
    const current = drafts[row.id] ?? saved;
    let nextProfit = current.profitPct;
    if (val.trim() === '') {
      nextProfit = '';
    } else {
      const num = Number(val);
      if (Number.isFinite(num) && row.salesAmountExVat > 0) {
        const derivedPct = deriveProfitPctFromCost(row.salesAmountExVat, num);
        if (derivedPct !== null) {
          nextProfit = String(derivedPct);
        }
      }
    }
    setDrafts((prev) => ({
      ...prev,
      [row.id]: { cost: val, profitPct: nextProfit, error: null },
    }));
    if (val.trim() === '' && nextProfit.trim() === '') {
      setSelectedIds((prev) => {
        if (!prev.has(row.id)) return prev;
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const handleInlineProfitChange = (row: CommissionApprovalRow, val: string) => {
    const saved = getSavedInlineValues(row);
    const current = drafts[row.id] ?? saved;
    let nextCost = current.cost;
    if (val.trim() === '') {
      nextCost = '';
    } else {
      const num = Number(val);
      if (Number.isFinite(num) && row.salesAmountExVat > 0) {
        const derivedCost = deriveCostFromProfitPct(row.salesAmountExVat, num);
        if (derivedCost !== null) {
          nextCost = String(derivedCost);
        }
      }
    }
    setDrafts((prev) => ({
      ...prev,
      [row.id]: { cost: nextCost, profitPct: val, error: null },
    }));
    if (val.trim() === '' && nextCost.trim() === '') {
      setSelectedIds((prev) => {
        if (!prev.has(row.id)) return prev;
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const saveInlineProfit = async (
    row: CommissionApprovalRow
  ): Promise<CommissionApprovalRow | null> => {
    const saved = getSavedInlineValues(row);
    const draft = drafts[row.id] ?? saved;
    const costTrim = draft.cost.trim();
    const profitTrim = draft.profitPct.trim();

    if (!costTrim && !profitTrim) {
      setDrafts((prev) => ({
        ...prev,
        [row.id]: { ...draft, error: 'กรอกต้นทุน หรือ % กำไร' },
      }));
      return null;
    }

    const parsedCost = costTrim === '' ? null : Number(costTrim);
    const parsedProfit = profitTrim === '' ? null : Number(profitTrim);
    if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      setDrafts((prev) => ({
        ...prev,
        [row.id]: { ...draft, error: 'ตัวเลขต้นทุนไม่ถูกต้อง' },
      }));
      return null;
    }
    if (parsedProfit !== null && !Number.isFinite(parsedProfit)) {
      setDrafts((prev) => ({
        ...prev,
        [row.id]: { ...draft, error: 'ตัวเลข % กำไรไม่ถูกต้อง' },
      }));
      return null;
    }

    setDrafts((prev) => ({
      ...prev,
      [row.id]: { ...draft, saving: true, error: null },
    }));

    try {
      const res = await fetch(`/api/sales/commissions/${row.id}/profit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costAmount: parsedCost,
          profitPct: parsedProfit,
          inlineQuickSave: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.request) {
        throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      }

      const updatedRow: CommissionApprovalRow = {
        ...row,
        costAmount: data.request.costAmount ?? null,
        sourceProfitPct: data.request.sourceProfitPct ?? row.sourceProfitPct,
        confirmedProfitPct: data.request.confirmedProfitPct ?? null,
        profitEditReason: data.request.profitEditReason ?? row.profitEditReason,
        commissionRatePct: data.request.commissionRatePct ?? null,
        commissionAmount: data.request.commissionAmount ?? null,
        status: data.request.status ?? row.status,
      };

      setItems((prev) => prev.map((r) => (r.id === row.id ? updatedRow : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      return updatedRow;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ';
      setDrafts((prev) => ({
        ...prev,
        [row.id]: { ...draft, saving: false, error: msg },
      }));
      return null;
    }
  };

  const handleOpenDecisionModal = async (row: CommissionApprovalRow) => {
    const saved = getSavedInlineValues(row);
    const draft = drafts[row.id];
    const hasUnsavedChanges =
      Boolean(draft) && (draft.cost !== saved.cost || draft.profitPct !== saved.profitPct);
    const hasValidInput =
      Boolean(draft) && (draft.cost.trim() !== '' || draft.profitPct.trim() !== '');

    if (hasUnsavedChanges && hasValidInput) {
      const updated = await saveInlineProfit(row);
      if (!updated) return;
      setActiveModal({ type: 'decision', item: updated });
      return;
    }
    setActiveModal({ type: 'decision', item: row });
  };

  const counts = useMemo(() => {
    let profitReview = 0;
    let pendingApproval = 0;
    let approved = 0;
    let rejected = 0;
    let paid = 0;
    for (const r of items) {
      if (r.status === 'PENDING_PROFIT_REVIEW' || r.status === 'SUBMITTED') profitReview++;
      else if (r.status === 'PENDING_APPROVAL') pendingApproval++;
      else if (r.status === 'APPROVED') approved++;
      else if (r.status === 'REJECTED') rejected++;
      else if (r.status === 'PAID') paid++;
    }
    return {
      profitReview,
      pendingApproval,
      approved,
      rejected,
      paid,
      actionable: profitReview + pendingApproval + approved,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (statusTab === 'ACTIONABLE') {
        if (
          !['SUBMITTED', 'PENDING_PROFIT_REVIEW', 'PENDING_APPROVAL', 'APPROVED'].includes(
            r.status
          )
        ) {
          return false;
        }
      } else if (statusTab !== 'ALL' && r.status !== statusTab) {
        return false;
      }

      if (q) {
        const hay = [
          r.requestNo,
          r.jobNumber,
          r.customerName,
          r.salespersonName,
          r.taxInvoiceNumbers || '',
          r.receiptNumbers || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusTab, search]);

  const selectableVisibleIds = filteredItems
    .filter((row) => isRowSelectableForBulkApprove(row))
    .map((row) => row.id);

  const selectedRows = items.filter(
    (row) => selectedIds.has(row.id) && isRowSelectableForBulkApprove(row)
  );
  const selectedTotalSalesExVat = selectedRows.reduce(
    (sum, r) => sum + (Number(r.salesAmountExVat) || 0),
    0
  );
  const selectedTotalCommission = selectedRows.reduce(
    (sum, r) => sum + getRowProjectedCommission(r),
    0
  );

  const toggleSelectRow = (id: string) => {
    setBulkMessage(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setBulkMessage(null);
    const allSelected =
      selectableVisibleIds.length > 0 &&
      selectableVisibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectableVisibleIds.forEach((id) => next.delete(id));
      } else {
        selectableVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedRows.length === 0 || isBulkApproving) return;
    setBulkMessage(null);
    setIsBulkApproving(true);

    try {
      const payloadItems = selectedRows.map((row) => {
        const saved = getSavedInlineValues(row);
        const draft = drafts[row.id];
        const hasInlineDraft =
          Boolean(draft) &&
          (draft.cost !== saved.cost || draft.profitPct !== saved.profitPct);
        return {
          id: row.id,
          hasInlineDraft,
          costAmount:
            hasInlineDraft && draft?.cost.trim() !== '' ? Number(draft.cost) : row.costAmount,
          profitPct:
            hasInlineDraft && draft?.profitPct.trim() !== ''
              ? Number(draft.profitPct)
              : row.confirmedProfitPct,
        };
      });

      const res = await fetch('/api/sales/commissions/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadItems }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.requests)) {
        throw new Error(data.error || 'อนุมัติคำขอหลายรายการไม่สำเร็จ');
      }

      const updatedById = new Map<string, Partial<CommissionApprovalRow>>();
      for (const reqRow of data.requests) {
        updatedById.set(reqRow.id, {
          costAmount: reqRow.costAmount ?? null,
          sourceProfitPct: reqRow.sourceProfitPct ?? null,
          confirmedProfitPct: reqRow.confirmedProfitPct ?? null,
          profitEditReason: reqRow.profitEditReason ?? null,
          commissionRatePct: reqRow.commissionRatePct ?? null,
          commissionAmount: reqRow.commissionAmount ?? null,
          status: reqRow.status ?? 'APPROVED',
        });
      }

      setItems((prev) =>
        prev.map((row) => {
          const patch = updatedById.get(row.id);
          return patch ? { ...row, ...patch } : row;
        })
      );
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of updatedById.keys()) {
          delete next[id];
        }
        return next;
      });
      setSelectedIds(new Set());
      setBulkMessage({
        type: 'success',
        text: `อนุมัติคำขอค่าคอมมิชชั่น ${data.approvedCount ?? selectedRows.length} รายการเรียบร้อยแล้ว`,
      });
    } catch (err: unknown) {
      setBulkMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'อนุมัติหลายรายการไม่สำเร็จ',
      });
    } finally {
      setIsBulkApproving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70 min-w-0">
      <CommissionNavHeader
        isSuperAdmin
        pendingApprovalCount={counts.profitReview + counts.pendingApproval}
        subtitle="ตรวจสอบต้นทุน แก้ไขและยืนยัน % กำไร อนุมัติคำขอ และบันทึกการจ่ายค่าคอมมิชชั่น (เฉพาะ SUPER_ADMIN)"
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'ACTIONABLE', label: `ค้างดำเนินการ (${counts.actionable})` },
              { id: 'PENDING_PROFIT_REVIEW', label: `รอตรวจกำไร (${counts.profitReview})` },
              { id: 'PENDING_APPROVAL', label: `รออนุมัติ (${counts.pendingApproval})` },
              { id: 'APPROVED', label: `อนุมัติแล้ว (${counts.approved})` },
              { id: 'REJECTED', label: `ไม่อนุมัติ (${counts.rejected})` },
              { id: 'ALL', label: `ทั้งหมด (${items.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                className={`h-9 px-3 rounded-xl text-xs font-bold border transition-all inline-flex items-center justify-center truncate tabular-nums ${
                  statusTab === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium tabular-nums">
              แสดงผล <strong className="text-slate-800">{filteredItems.length}</strong> จากทั้งหมด{' '}
              <strong className="text-slate-800">{items.length}</strong> คำขอ
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาเลขคำขอ, Job, ลูกค้า, เซลล์..."
                  className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30 focus:border-[#ff2301]"
                />
              </div>
              <button
                type="button"
                onClick={reloadItems}
                disabled={isReloading}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 shrink-0 disabled:opacity-50"
                title="รีเฟรชรายการ"
              >
                <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
                <span>รีเฟรช</span>
              </button>
            </div>
          </div>
        </div>

        {bulkMessage && (
          <div
            className={`rounded-2xl border p-3.5 text-xs font-bold flex items-center justify-between gap-3 ${
              bulkMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <span>{bulkMessage.text}</span>
            <button
              type="button"
              onClick={() => setBulkMessage(null)}
              className="text-current/70 hover:text-current"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {selectedRows.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 flex-wrap">
              <CheckSquare size={16} className="text-emerald-600 shrink-0" />
              <span>
                เลือกแล้ว {selectedRows.length} รายการ • ยอดขายไม่รวม VAT รวม{' '}
                {formatThb(selectedTotalSalesExVat)} บาท • ค่าคอมฯ รวม{' '}
                <strong className="text-emerald-700">
                  {formatThb(selectedTotalCommission)} บาท
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isBulkApproving}
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                ล้างที่เลือก
              </button>
              <button
                type="button"
                disabled={isBulkApproving}
                onClick={() => void handleBulkApprove()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isBulkApproving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>อนุมัติที่เลือกทั้งหมด ({selectedRows.length})</span>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                  <th className="py-3.5 px-3 w-11 text-center">
                    <input
                      type="checkbox"
                      aria-label="เลือกทุกรายการที่กรอกกำไรแล้ว"
                      checked={
                        selectableVisibleIds.length > 0 &&
                        selectableVisibleIds.every((id) => selectedIds.has(id))
                      }
                      disabled={selectableVisibleIds.length === 0}
                      onChange={toggleSelectAllVisible}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                    />
                  </th>
                  <th className="py-3.5 px-3">เลขคำขอ / Job</th>
                  <th className="py-3.5 px-3">ลูกค้า / สินค้า</th>
                  <th className="py-3.5 px-3">พนักงานขาย / ผู้ยื่น</th>
                  <th className="py-3.5 px-3 text-right">ยอด (ไม่รวม VAT)</th>
                  <th className="py-3.5 px-3 text-right">ต้นทุน / % กำไร</th>
                  <th className="py-3.5 px-3 text-right">ค่าคอมฯ</th>
                  <th className="py-3.5 px-3 text-center">สถานะ</th>
                  <th className="py-3.5 px-3 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-400 font-medium">
                      ไม่มีคำขอในสถานะที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const isEditableProfit =
                      row.status !== 'APPROVED' && row.status !== 'PAID';
                    const canSelectForBulk = isRowSelectableForBulkApprove(row);
                    const isChecked = selectedIds.has(row.id) && canSelectForBulk;
                    const savedInline = getSavedInlineValues(row);
                    const draft = drafts[row.id];
                    const effectiveDraft = draft ?? savedInline;
                    const hasUnsavedChanges =
                      Boolean(draft) &&
                      (draft.cost !== savedInline.cost ||
                        draft.profitPct !== savedInline.profitPct);
                    const hasAnyInput =
                      effectiveDraft.cost.trim() !== '' ||
                      effectiveDraft.profitPct.trim() !== '';
                    const parsedProfitPct =
                      effectiveDraft.profitPct.trim() === ''
                        ? null
                        : Number(effectiveDraft.profitPct);
                    const liveCalc = hasUnsavedChanges
                      ? calculateCommissionFromProfit(
                          row.salesAmountExVat,
                          parsedProfitPct !== null && Number.isFinite(parsedProfitPct)
                            ? parsedProfitPct
                            : null
                        )
                      : null;
                    const displayRatePct = liveCalc
                      ? liveCalc.ratePct
                      : row.commissionRatePct;
                    const displayAmount = liveCalc
                      ? liveCalc.amount
                      : row.commissionAmount;

                    return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-3 align-middle text-center">
                        <input
                          type="checkbox"
                          aria-label={`เลือก ${row.requestNo}`}
                          checked={isChecked}
                          disabled={!canSelectForBulk}
                          title={
                            canSelectForBulk
                              ? 'เลือกเพื่ออนุมัติหลายรายการพร้อมกัน'
                              : row.status === 'APPROVED' || row.status === 'PAID'
                              ? 'รายการนี้อนุมัติหรือจ่ายเงินแล้ว'
                              : 'กรุณากรอกต้นทุน หรือ % กำไรก่อนจึงจะเลือกอนุมัติได้'
                          }
                          onChange={() => toggleSelectRow(row.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3.5 px-3 align-middle tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <CompanyCodeBadge code={row.companyCode} />
                          <span className="font-black text-slate-900">{row.requestNo}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          {row.jobNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatThaiDateTime(row.requestedAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle max-w-[185px]">
                        <div
                          className="font-bold text-slate-800 truncate"
                          title={row.customerName}
                        >
                          {row.customerName}
                        </div>
                        <div
                          className="text-[11px] text-slate-500 truncate mt-0.5"
                          title={row.productSold || '-'}
                        >
                          {row.productSold || '-'}
                        </div>
                        {row.hasGoodsReturn && (
                          <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold whitespace-nowrap">
                            <AlertTriangle size={10} /> มีใบคืนสินค้า
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle max-w-[140px]">
                        <div
                          className="font-semibold text-slate-800 truncate"
                          title={row.salespersonName}
                        >
                          {row.salespersonName}
                        </div>
                        <div
                          className="text-[11px] text-slate-400 truncate mt-0.5"
                          title={`ยื่นโดย: ${row.requestedByName}`}
                        >
                          {row.requestedByName === row.salespersonName
                            ? 'ยื่นโดยผู้ขาย'
                            : `ยื่นแทน: ${row.requestedByName}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatThb(row.salesAmountExVat)}
                      </td>

                      <td className="py-3 px-3 align-middle text-right tabular-nums whitespace-nowrap">
                        {isEditableProfit ? (
                          <div className="inline-flex flex-col items-end gap-1 min-w-[160px]">
                            <div className="flex items-center justify-end gap-1.5 w-full">
                              <span className="w-8 text-right text-[10px] font-semibold text-slate-400 shrink-0">
                                ทุน
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={effectiveDraft.cost}
                                disabled={Boolean(draft?.saving)}
                                onChange={(e) => handleInlineCostChange(row, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void saveInlineProfit(row);
                                  }
                                }}
                                placeholder="กรอกต้นทุน"
                                aria-label={`ต้นทุน ${row.requestNo}`}
                                className={`w-[118px] h-7 px-2 text-right text-[11px] font-semibold rounded-lg border tabular-nums outline-none transition-colors ${
                                  hasUnsavedChanges
                                    ? 'border-indigo-300 bg-indigo-50/40 text-slate-900 focus:ring-2 focus:ring-indigo-500/20'
                                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                                }`}
                              />
                            </div>
                            <div className="flex items-center justify-end gap-1.5 w-full">
                              <span className="w-8 text-right text-[10px] font-semibold text-slate-400 shrink-0">
                                กำไร%
                              </span>
                              <div className="flex items-center gap-1 w-[118px]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={effectiveDraft.profitPct}
                                  disabled={Boolean(draft?.saving)}
                                  onChange={(e) => handleInlineProfitChange(row, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      void saveInlineProfit(row);
                                    }
                                  }}
                                  placeholder={
                                    row.sourceProfitPct !== null && row.confirmedProfitPct === null
                                      ? row.sourceProfitPct.toFixed(1)
                                      : '% กำไร'
                                  }
                                  aria-label={`% กำไร ${row.requestNo}`}
                                  className={`w-[70px] h-7 px-1.5 text-right text-[11px] font-black rounded-lg border tabular-nums outline-none transition-colors ${
                                    hasUnsavedChanges
                                      ? 'border-indigo-300 bg-indigo-50/40 text-indigo-700 focus:ring-2 focus:ring-indigo-500/20'
                                      : 'border-slate-200 bg-slate-50 text-indigo-700 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                                  }`}
                                />
                                <button
                                  type="button"
                                  disabled={Boolean(draft?.saving) || !hasUnsavedChanges || !hasAnyInput}
                                  onClick={() => void saveInlineProfit(row)}
                                  title="บันทึกต้นทุน / % กำไร"
                                  className={`inline-flex items-center justify-center w-[44px] h-7 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                                    hasUnsavedChanges && hasAnyInput
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  }`}
                                >
                                  {draft?.saving ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    'บันทึก'
                                  )}
                                </button>
                              </div>
                            </div>
                            {draft?.error && (
                              <div className="text-[10px] text-red-600 font-semibold max-w-[160px] text-right whitespace-normal">
                                {draft.error}
                              </div>
                            )}
                          </div>
                        ) : row.confirmedProfitPct !== null ? (
                          <div>
                            <div className="font-black text-indigo-700">
                              {row.confirmedProfitPct.toFixed(2)}%
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ทุน: {row.costAmount !== null ? formatThb(row.costAmount) : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-semibold">
                            รอตรวจกำไร
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right tabular-nums whitespace-nowrap">
                        {displayAmount !== null ? (
                          <div>
                            <div
                              className={`font-black ${
                                hasUnsavedChanges ? 'text-indigo-700' : 'text-emerald-700'
                              }`}
                            >
                              {formatThb(displayAmount)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              ({formatRatePct(displayRatePct)})
                            </div>
                            {hasUnsavedChanges && (
                              <div className="text-[10px] font-semibold text-amber-600 mt-0.5">
                                พรีวิว • กดบันทึก
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-center">
                        <div className="flex flex-col items-center">
                          <CommissionStatusBadge status={row.status} />
                          {row.status === 'REJECTED' && row.rejectedReason && (
                            <div
                              className="text-[11px] text-red-600 mt-1 max-w-[140px] truncate"
                              title={row.rejectedReason}
                            >
                              {row.rejectedReason}
                            </div>
                          )}
                          {row.status === 'PAID' && row.payoutRefNo && (
                            <div className="text-[11px] text-green-700 mt-1 tabular-nums whitespace-nowrap">
                              อ้างอิง: {row.payoutRefNo}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                          {(row.status === 'PENDING_PROFIT_REVIEW' ||
                            row.status === 'PENDING_APPROVAL' ||
                            row.status === 'SUBMITTED' ||
                            row.status === 'REJECTED') && (
                            <button
                              type="button"
                              onClick={() => void handleOpenDecisionModal(row)}
                              className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 whitespace-nowrap transition-colors"
                            >
                              <CheckCircle2 size={12} /> พิจารณา
                            </button>
                          )}

                          {row.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => setActiveModal({ type: 'payout', item: row })}
                              className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold whitespace-nowrap transition-colors"
                            >
                              <Banknote size={12} /> บันทึกจ่าย
                            </button>
                          )}

                          <Link
                            href={`/sales/commissions/${row.id}`}
                            title="ดูรายละเอียดคำขอ"
                            aria-label="ดูรายละเอียดคำขอ"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shrink-0"
                          >
                            <Eye size={14} />
                          </Link>
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
      </div>

      {/* Inline Action Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeModal.type === 'decision'
                    ? 'Step 5: พิจารณาอนุมัติคำขอค่าคอมมิชชั่น'
                    : 'Step 6: บันทึกการจ่ายค่าคอมมิชชั่น'}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {activeModal.item.requestNo} • {activeModal.item.jobNumber} •{' '}
                  {activeModal.item.customerName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="ปิดหน้าต่าง"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {activeModal.type === 'decision' && (
                <ApprovalDecisionForm
                  item={activeModal.item}
                  onCancel={() => setActiveModal(null)}
                  onCompleted={async () => {
                    setActiveModal(null);
                    await reloadItems();
                  }}
                />
              )}
              {activeModal.type === 'payout' && (
                <PayoutRecordForm
                  item={activeModal.item}
                  onCancel={() => setActiveModal(null)}
                  onCompleted={async () => {
                    setActiveModal(null);
                    await reloadItems();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
