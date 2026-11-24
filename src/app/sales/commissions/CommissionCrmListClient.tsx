'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Filter,
  Loader2,
  CheckSquare,
  FileText,
  Coins,
  RotateCcw,
  X,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  COMMISSION_STATUS_LABELS,
  CommissionRecipientOption,
  CommissionSplitInput,
  EvaluatedCrmCommissionRow,
  normalizeAndValidateCommissionSplits,
} from '@/app/lib/salesCommission';
import SearchableSelect from '@/app/components/SearchableSelect';
import CommissionNavHeader from './components/CommissionNavHeader';
import CommissionSplitEditor from './components/CommissionSplitEditor';
import {
  CommissionStatusBadge,
  CompanyCodeBadge,
  formatRatePct,
  formatThaiDate,
  formatThaiDateTime,
  formatThb,
} from './components/CommissionUiHelpers';

type CrmListRow = Omit<EvaluatedCrmCommissionRow, 'crmSnapshot'>;

type Props = {
  initialRows: CrmListRow[];
  initialFetchedAt: string;
  initialError?: string | null;
  isSuperAdmin: boolean;
  pendingApprovalCount?: number;
  recipientOptions?: CommissionRecipientOption[];
};

const ALL_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'ทุกสถานะ (ทั้งหมด)' },
  { value: 'READY', label: COMMISSION_STATUS_LABELS.READY },
  { value: 'NOT_ELIGIBLE', label: COMMISSION_STATUS_LABELS.NOT_ELIGIBLE },
  { value: 'IN_PROGRESS', label: 'อยู่ระหว่างดำเนินการ (ทั้งหมด)' },
  { value: 'SUBMITTED', label: COMMISSION_STATUS_LABELS.SUBMITTED },
  { value: 'PENDING_PROFIT_REVIEW', label: COMMISSION_STATUS_LABELS.PENDING_PROFIT_REVIEW },
  { value: 'PENDING_APPROVAL', label: COMMISSION_STATUS_LABELS.PENDING_APPROVAL },
  { value: 'APPROVED', label: COMMISSION_STATUS_LABELS.APPROVED },
  { value: 'REJECTED', label: COMMISSION_STATUS_LABELS.REJECTED },
  { value: 'PAID', label: COMMISSION_STATUS_LABELS.PAID },
];

export default function CommissionCrmListClient({
  initialRows,
  initialFetchedAt,
  initialError = null,
  isSuperAdmin,
  pendingApprovalCount = 0,
  recipientOptions = [],
}: Props) {
  const [rows, setRows] = useState<CrmListRow[]>(initialRows);
  const [fetchedAt, setFetchedAt] = useState<string>(initialFetchedAt);
  const [isFetchingCrm, setIsFetchingCrm] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(initialError);
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('ALL');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitMode, setSplitMode] = useState<'NONE' | 'SHARED' | 'PER_JOB'>('NONE');
  const [sharedSplits, setSharedSplits] = useState<CommissionSplitInput[]>([]);
  const [jobSplitsMap, setJobSplitsMap] = useState<Record<string, CommissionSplitInput[]>>({});
  const [expandedSplitJobIds, setExpandedSplitJobIds] = useState<Set<string>>(new Set());
  const [submitModalError, setSubmitModalError] = useState<string | null>(null);

  const recipientUserById = useMemo(
    () => new Map(recipientOptions.map((u) => [u.id, u])),
    [recipientOptions]
  );

  const buildOwnerSplitForRow = (row: CrmListRow): CommissionSplitInput[] => {
    const matched =
      (row.salespersonId ? recipientUserById.get(row.salespersonId) : undefined) ||
      recipientOptions.find(
        (u) => u.fullName.trim().toLowerCase() === row.salespersonName.trim().toLowerCase()
      );
    return [
      {
        userId: matched?.id ?? row.salespersonId ?? null,
        employeeId: matched?.employeeId ?? null,
        recipientName: matched?.fullName ?? (row.salespersonName !== '-' ? row.salespersonName : ''),
        recipientRole: matched ? matched.department || matched.role : null,
        splitPct: 100,
        isOwner: true,
      },
    ];
  };

  const salespersonOptions = useMemo(() => {
    if (!isSuperAdmin) return [];
    const set = new Set<string>();
    for (const r of rows) {
      if (r.salespersonName && r.salespersonName !== '-') {
        set.add(r.salespersonName);
      }
      for (const sp of r.existingRequest?.splits || []) {
        if (sp.recipientName && sp.recipientName !== '-') {
          set.add(sp.recipientName);
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [rows, isSuperAdmin]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (companyFilter !== 'ALL' && r.companyCode !== companyFilter) return false;
      if (statusFilter === 'IN_PROGRESS') {
        if (
          r.derivedStatus === 'READY' ||
          r.derivedStatus === 'NOT_ELIGIBLE' ||
          r.derivedStatus === 'PAID'
        ) {
          return false;
        }
      } else if (statusFilter !== 'ALL' && r.derivedStatus !== statusFilter) {
        return false;
      }
      if (isSuperAdmin && salespersonFilter !== 'ALL') {
        const matchesPrimary = r.salespersonName === salespersonFilter;
        const matchesSplit = (r.existingRequest?.splits || []).some(
          (s) => s.recipientName === salespersonFilter
        );
        if (!matchesPrimary && !matchesSplit) return false;
      }
      if (q) {
        const hay = [
          r.jobNumber,
          r.customerName,
          r.productSold,
          r.taxInvoiceNumbers,
          r.receiptNumbers,
          r.salespersonName,
          r.existingRequest?.requestNo || '',
          ...(r.existingRequest?.splits || []).map((s) => s.recipientName),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, companyFilter, salespersonFilter, isSuperAdmin]);

  const stats = useMemo(() => {
    let ready = 0;
    let notEligible = 0;
    let submitted = 0;
    let paid = 0;
    for (const r of rows) {
      if (r.derivedStatus === 'READY') ready++;
      else if (r.derivedStatus === 'NOT_ELIGIBLE') notEligible++;
      else if (r.derivedStatus === 'PAID') paid++;
      else submitted++;
    }
    return { total: rows.length, ready, notEligible, submitted, paid };
  }, [rows]);

  const eligibleVisibleIds = useMemo(
    () => filteredRows.filter((r) => r.isEligibleToSubmit).map((r) => r.jobId),
    [filteredRows]
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedJobIds.has(r.jobId) && r.isEligibleToSubmit),
    [rows, selectedJobIds]
  );

  const selectedTotalSalesExVat = useMemo(
    () => selectedRows.reduce((s, r) => s + r.salesAmountExVat, 0),
    [selectedRows]
  );

  const splitValidationError = useMemo(() => {
    if (splitMode === 'SHARED') {
      const res = normalizeAndValidateCommissionSplits(sharedSplits, null);
      return 'error' in res ? res.error : null;
    }
    if (splitMode === 'PER_JOB') {
      for (const row of selectedRows) {
        const list = jobSplitsMap[row.jobId];
        if (!list) continue;
        const res = normalizeAndValidateCommissionSplits(list, null);
        if ('error' in res) {
          return `${row.jobNumber}: ${res.error}`;
        }
      }
    }
    return null;
  }, [splitMode, sharedSplits, jobSplitsMap, selectedRows]);

  const openSubmitModal = () => {
    if (selectedRows.length === 0) return;
    setSplitMode('NONE');
    setSharedSplits(buildOwnerSplitForRow(selectedRows[0]));
    setJobSplitsMap({});
    setExpandedSplitJobIds(
      selectedRows.length === 1 ? new Set([selectedRows[0].jobId]) : new Set()
    );
    setSubmitModalError(null);
    setIsSubmitModalOpen(true);
  };

  const handlePullFromCrm = async () => {
    setIsFetchingCrm(true);
    setCrmError(null);
    setActionBanner(null);
    try {
      const res = await fetch('/api/sales/commissions/crm-jobs', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถเชื่อมต่อข้อมูลจาก CRM ได้');
      }
      setRows(data.jobs || []);
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      setSelectedJobIds(new Set());
      setActionBanner({
        type: 'success',
        message: `ดึงข้อมูลล่าสุดจาก CRM สำเร็จ (${(data.jobs || []).length} รายการ)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ดึงข้อมูลจาก CRM ไม่สำเร็จ';
      setCrmError(msg);
    } finally {
      setIsFetchingCrm(false);
    }
  };

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSelectAllVisibleReady = () => {
    const allSelected =
      eligibleVisibleIds.length > 0 &&
      eligibleVisibleIds.every((id) => selectedJobIds.has(id));
    if (allSelected) {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        eligibleVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        eligibleVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleConfirmSubmit = async () => {
    if (selectedRows.length === 0 || isSubmitting) return;
    if (splitValidationError) {
      setSubmitModalError(splitValidationError);
      return;
    }

    setSubmitModalError(null);
    setIsSubmitting(true);
    setActionBanner(null);
    try {
      const payload: {
        jobIds: string[];
        remarks: string | null;
        defaultSplits?: CommissionSplitInput[];
        jobSplits?: Record<string, CommissionSplitInput[]>;
      } = {
        jobIds: selectedRows.map((r) => r.jobId),
        remarks: submitRemarks.trim() || null,
      };

      if (splitMode === 'SHARED') {
        payload.defaultSplits = sharedSplits;
      } else if (splitMode === 'PER_JOB') {
        const customEntries: Record<string, CommissionSplitInput[]> = {};
        for (const r of selectedRows) {
          if (jobSplitsMap[r.jobId] && jobSplitsMap[r.jobId].length > 0) {
            customEntries[r.jobId] = jobSplitsMap[r.jobId];
          }
        }
        if (Object.keys(customEntries).length > 0) {
          payload.jobSplits = customEntries;
        }
      }

      const res = await fetch('/api/sales/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ยื่นคำขอค่าคอมมิชชั่นไม่สำเร็จ');
      }

      const reqNos = (data.requests || [])
        .map((r: { requestNo: string }) => r.requestNo)
        .join(', ');
      setIsSubmitModalOpen(false);
      setSubmitRemarks('');
      setSelectedJobIds(new Set());

      await handlePullFromCrm();
      setActionBanner({
        type: 'success',
        message: `ยื่นคำขอค่าคอมมิชชั่นสำเร็จ ${data.count} รายการ (${reqNos})`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ยื่นคำขอค่าคอมมิชชั่นไม่สำเร็จ';
      setSubmitModalError(msg);
      setActionBanner({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    companyFilter !== 'ALL' ||
    (isSuperAdmin && salespersonFilter !== 'ALL');

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCompanyFilter('ALL');
    setSalespersonFilter('ALL');
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70 min-w-0">
      <CommissionNavHeader
        isSuperAdmin={isSuperAdmin}
        pendingApprovalCount={pendingApprovalCount}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Pull CRM bar + Timestamp */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>เชื่อมต่อ CRM / Job Online ปกติ</span>
            </span>
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-50 text-slate-600 font-medium border border-slate-200 tabular-nums">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <span>
                ดึงข้อมูลล่าสุด:{' '}
                <strong className="text-slate-800">{formatThaiDateTime(fetchedAt)}</strong>
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto lg:min-w-[420px]">
            <button
              type="button"
              onClick={handlePullFromCrm}
              disabled={isFetchingCrm}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw size={15} className={isFetchingCrm ? 'animate-spin shrink-0' : 'shrink-0'} />
              <span className="truncate">
                {isFetchingCrm ? 'กำลังดึงข้อมูลจาก CRM...' : 'ดึงข้อมูลจาก CRM'}
              </span>
            </button>

            <button
              type="button"
              onClick={openSubmitModal}
              disabled={selectedRows.length === 0}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed tabular-nums"
            >
              <Send size={15} className="shrink-0" />
              <span className="truncate">ยื่นคำขอค่าคอมมิชชั่น ({selectedRows.length})</span>
            </button>
          </div>
        </div>

        {/* CRM Error or Action Banner */}
        {crmError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold">
            <AlertTriangle size={18} className="shrink-0 text-red-600" />
            <span>{crmError}</span>
          </div>
        )}

        {actionBanner && (
          <div
            className={`rounded-2xl p-4 border flex items-center justify-between gap-3 text-xs font-bold ${
              actionBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionBanner.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              <span>{actionBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionBanner(null)}
              className="underline opacity-75 hover:opacity-100"
            >
              ปิด
            </button>
          </div>
        )}

        {/* KPI Cards - Symmetrical 4-Column Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            className={`bg-white rounded-2xl border p-4 shadow-xs h-full flex flex-col justify-between transition-all ${
              statusFilter === 'ALL'
                ? 'border-slate-400 ring-2 ring-slate-200/70'
                : statusFilter === 'NOT_ELIGIBLE'
                ? 'border-red-300 ring-2 ring-red-100'
                : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="text-left w-full group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                  งานทั้งหมดจาก CRM
                </span>
                <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {stats.total}
                </span>
                <span className="text-xs font-semibold text-slate-400">งาน</span>
              </div>
            </button>
            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 font-medium">ยังไม่เข้าเงื่อนไข</span>
              <button
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === 'NOT_ELIGIBLE' ? 'ALL' : 'NOT_ELIGIBLE'))
                }
                className={`px-2 py-0.5 rounded-full font-bold tabular-nums border transition-colors ${
                  statusFilter === 'NOT_ELIGIBLE'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                }`}
              >
                {stats.notEligible} งาน
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === 'READY' ? 'ALL' : 'READY'))}
            className={`text-left bg-white rounded-2xl border p-4 shadow-xs h-full flex flex-col justify-between transition-all hover:bg-emerald-50/30 ${
              statusFilter === 'READY'
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-emerald-200'
            }`}
          >
            <div className="w-full">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-emerald-800">พร้อมยื่นคำขอ</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-emerald-700 tabular-nums">
                  {stats.ready}
                </span>
                <span className="text-xs font-semibold text-emerald-600/70">งาน</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-emerald-100/80 w-full flex items-center justify-between text-[11px] text-emerald-700/80 font-medium">
              <span>ชำระ 100% + บัญชีปิดขั้นตอน</span>
              {statusFilter === 'READY' && <span className="font-bold">กำลังกรอง</span>}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS'))
            }
            className={`text-left bg-white rounded-2xl border p-4 shadow-xs h-full flex flex-col justify-between transition-all hover:bg-amber-50/30 ${
              statusFilter === 'IN_PROGRESS'
                ? 'border-amber-500 ring-2 ring-amber-500/20'
                : 'border-amber-200'
            }`}
          >
            <div className="w-full">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-amber-800">อยู่ระหว่างดำเนินการ</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-amber-700 tabular-nums">
                  {stats.submitted}
                </span>
                <span className="text-xs font-semibold text-amber-600/70">งาน</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-amber-100/80 w-full flex items-center justify-between text-[11px] text-amber-700/80 font-medium">
              <span>รอตรวจกำไร / อนุมัติ / รอจ่าย</span>
              {statusFilter === 'IN_PROGRESS' && <span className="font-bold">กำลังกรอง</span>}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === 'PAID' ? 'ALL' : 'PAID'))}
            className={`text-left bg-white rounded-2xl border p-4 shadow-xs h-full flex flex-col justify-between transition-all hover:bg-green-50/30 ${
              statusFilter === 'PAID'
                ? 'border-green-500 ring-2 ring-green-500/20'
                : 'border-green-200'
            }`}
          >
            <div className="w-full">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-green-800">จ่ายแล้ว</span>
                <span className="w-8 h-8 rounded-xl bg-green-50 text-green-600 border border-green-100 flex items-center justify-center shrink-0">
                  <Coins size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-green-700 tabular-nums">
                  {stats.paid}
                </span>
                <span className="text-xs font-semibold text-green-600/70">งาน</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-green-100/80 w-full flex items-center justify-between text-[11px] text-green-700/80 font-medium">
              <span>โอนจ่ายค่าคอมฯ เรียบร้อย</span>
              {statusFilter === 'PAID' && <span className="font-bold">กำลังกรอง</span>}
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            <div className={`relative sm:col-span-2 ${isSuperAdmin ? 'lg:col-span-5' : 'lg:col-span-6'}`}>
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา Job, ลูกค้า, ใบกำกับ, ใบเสร็จ, เลขคำขอ..."
                className="w-full h-10 pl-9 pr-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30 focus:border-[#ff2301]"
              />
            </div>

            <div className="relative flex items-center lg:col-span-3">
              <Filter size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
              >
                {ALL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={isSuperAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
              >
                <option value="ALL">ทุกบริษัท (TP / TG / TE)</option>
                <option value="TG">TG</option>
                <option value="TE">TE</option>
                <option value="TP">TP</option>
              </select>
            </div>

            {isSuperAdmin && (
              <div className="lg:col-span-2">
                <SearchableSelect
                  compact
                  value={salespersonFilter}
                  onChange={(val) => setSalespersonFilter(val || 'ALL')}
                  placeholder="พิมพ์ชื่อ / ชื่อเล่นพนักงาน..."
                  emptyText="ไม่พบพนักงานขาย"
                  options={[
                    { value: 'ALL', label: 'พนักงานขายทุกคน' },
                    ...salespersonOptions.map((name) => {
                      const matched = recipientOptions.find(
                        (u) => u.fullName.trim().toLowerCase() === name.trim().toLowerCase()
                      );
                      return {
                        value: name,
                        label: matched?.nickname ? `${name} (${matched.nickname})` : name,
                        searchText: matched
                          ? [matched.nickname, matched.fullName, matched.employeeId]
                              .filter(Boolean)
                              .join(' ')
                          : name,
                      };
                    }),
                  ]}
                />
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-500 font-medium tabular-nums">
              แสดงผล <strong className="text-slate-800">{filteredRows.length}</strong> จากทั้งหมด{' '}
              <strong className="text-slate-800">{rows.length}</strong> รายการ
              {eligibleVisibleIds.length > 0 && (
                <span className="ml-2 text-emerald-700 font-semibold">
                  (พร้อมยื่น {eligibleVisibleIds.length} งาน)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  <RotateCcw size={12} />
                  ล้างตัวกรอง
                </button>
              )}
              {eligibleVisibleIds.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllVisibleReady}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors"
                >
                  <CheckSquare size={12} />
                  {eligibleVisibleIds.every((id) => selectedJobIds.has(id))
                    ? 'ยกเลิกเลือกทั้งหมด'
                    : `เลือกงานที่พร้อมยื่นทั้งหมด (${eligibleVisibleIds.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky selection summary bar */}
        {selectedRows.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-red-900">
              <CheckSquare size={16} className="text-[#ff2301]" />
              <span>
                เลือกแล้ว {selectedRows.length} งาน • ยอดขายไม่รวม VAT รวม{' '}
                {formatThb(selectedTotalSalesExVat)} บาท
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedJobIds(new Set())}
                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                ล้างที่เลือก
              </button>
              <button
                type="button"
                onClick={openSubmitModal}
                className="px-4 py-1.5 rounded-lg bg-[#ff2301] text-white text-xs font-bold hover:bg-red-600 shadow-xs"
              >
                ตรวจสอบ & ยื่นคำขอ
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                  <th className="py-3.5 px-3 w-11 text-center">
                    <input
                      type="checkbox"
                      aria-label="เลือกงานที่พร้อมยื่นทั้งหมด"
                      checked={
                        eligibleVisibleIds.length > 0 &&
                        eligibleVisibleIds.every((id) => selectedJobIds.has(id))
                      }
                      disabled={eligibleVisibleIds.length === 0}
                      onChange={toggleSelectAllVisibleReady}
                      className="rounded border-slate-300 text-[#ff2301] focus:ring-[#ff2301]"
                    />
                  </th>
                  <th className="py-3.5 px-3 w-[240px]">Job / ลูกค้า</th>
                  <th className="py-3.5 px-3 w-[155px]">ใบกำกับ / ใบเสร็จ</th>
                  <th className="py-3.5 px-3">สินค้าที่ขาย</th>
                  <th className="py-3.5 px-3 w-[120px] text-center">ปิด Job</th>
                  <th className="py-3.5 px-3 pr-4 w-[115px] text-right">ยอด (ไม่รวม VAT)</th>
                  <th className="py-3.5 px-3 pl-3 w-[135px]">ผู้ขาย</th>
                  <th className="py-3.5 px-3 pr-4 w-[105px] text-right">อัตรา / ค่าคอมฯ</th>
                  <th className="py-3.5 px-3 w-[245px]">เงื่อนไข &amp; สถานะคำขอ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-400 font-medium">
                      ไม่พบข้อมูลงานขายที่ตรงตามเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isChecked = selectedJobIds.has(row.jobId);
                    const reqStatus = row.existingRequest?.status;
                    const isConfirmedAmount =
                      reqStatus === 'PENDING_APPROVAL' ||
                      reqStatus === 'APPROVED' ||
                      reqStatus === 'PAID' ||
                      (isSuperAdmin && row.commissionAmount !== null);

                    const hasTaxInv = Boolean(row.taxInvoiceNumbers && row.taxInvoiceNumbers !== '-');
                    const hasReceipt = Boolean(row.receiptNumbers && row.receiptNumbers !== '-');
                    const extraIneligibleReasons = row.ineligibleReasons.filter(
                      (r) =>
                        r !== 'ยังชำระเงินไม่ครบ 100%' &&
                        r !== 'รอฝ่ายบัญชียืนยันปิดงาน'
                    );

                    return (
                      <tr
                        key={row.jobId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isChecked ? 'bg-red-50/35' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            disabled={!row.isEligibleToSubmit}
                            checked={isChecked}
                            onChange={() => toggleSelectJob(row.jobId)}
                            title={
                              row.isEligibleToSubmit
                                ? 'เลือกรายการเพื่อยื่นคำขอ'
                                : row.ineligibleReasons.join(', ')
                            }
                            className="rounded border-slate-300 text-[#ff2301] focus:ring-[#ff2301] disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                            <CompanyCodeBadge code={row.companyCode} />
                            <span className="font-black text-slate-900 truncate">{row.jobNumber}</span>
                          </div>
                          <div
                            className="text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-2 leading-snug"
                            title={row.customerName}
                          >
                            {row.customerName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {row.jobType}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 align-middle tabular-nums">
                          {!hasTaxInv && !hasReceipt ? (
                            <span className="text-slate-300 font-medium">—</span>
                          ) : (
                            <div className="space-y-0.5 text-[11px] leading-snug break-words">
                              {hasTaxInv && (
                                <div className="font-semibold text-slate-800">
                                  IV: {row.taxInvoiceNumbers}
                                  {row.taxInvoiceDate ? (
                                    <span className="text-slate-400 font-normal ml-1 whitespace-nowrap">
                                      ({formatThaiDate(row.taxInvoiceDate)})
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              {hasReceipt && (
                                <div className="text-slate-500 font-medium">
                                  RE: {row.receiptNumbers}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <div
                            className="text-slate-700 line-clamp-2 text-[11px] leading-relaxed"
                            title={row.productSold}
                          >
                            {row.productSold}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 align-middle text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              title={row.accountingMismatchMessage || undefined}
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border text-center leading-tight ${
                                row.hasAccountingMismatch
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : row.isJobClosed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {row.jobClosedStatus}
                            </span>
                            {isSuperAdmin && row.hasGoodsReturn && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                                <AlertTriangle size={10} /> มีใบคืน
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 pr-4 align-middle text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          <div>{formatThb(row.salesAmountExVat)}</div>
                          {row.accountingVerifiedBeforeVat !== null &&
                            row.accountingVerifiedBeforeVat !== undefined && (
                              <div
                                className={`text-[10px] font-semibold mt-0.5 ${
                                  row.hasAccountingMismatch ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                (ยึดยอดบัญชี)
                              </div>
                            )}
                        </td>

                        <td className="py-3.5 px-3 pl-3 align-middle">
                          {(() => {
                            const splits = row.existingRequest?.splits ?? [];
                            const hasMultiSplit = splits.length > 1;
                            const splitTooltip = hasMultiSplit
                              ? splits
                                  .map(
                                    (s) =>
                                      `${s.recipientName} ${s.splitPct}%${
                                        s.allocatedAmount !== null && s.allocatedAmount !== undefined
                                          ? ` (${formatThb(s.allocatedAmount)} ฿)`
                                          : ''
                                      }`
                                  )
                                  .join(' • ')
                              : row.salespersonName;
                            return (
                              <div title={splitTooltip}>
                                <div className="text-slate-700 font-medium truncate">
                                  {row.salespersonName}
                                </div>
                                {hasMultiSplit && (
                                  <div className="text-[10px] font-semibold text-indigo-700 truncate mt-0.5">
                                    แบ่ง {splits.length} คน:{' '}
                                    {splits
                                      .map((s) => `${s.recipientName.split(' ')[0]} ${s.splitPct}%`)
                                      .join(' / ')}
                                  </div>
                                )}
                                {row.mySplit && (!row.isJobOwner || hasMultiSplit) && (
                                  <div className="mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                      {row.isJobOwner ? 'ส่วนของฉัน' : 'ร่วมรับค่าคอมฯ'}{' '}
                                      {row.mySplit.splitPct}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-3 pr-4 align-middle text-right whitespace-nowrap tabular-nums">
                          {(() => {
                            const splits = row.existingRequest?.splits ?? [];
                            const hasMultiSplit = splits.length > 1;
                            if (isConfirmedAmount && row.commissionAmount !== null) {
                              return (
                                <div>
                                  <div className="font-black text-emerald-700">
                                    {formatThb(row.commissionAmount)}
                                  </div>
                                  {row.commissionRatePct !== null && (
                                    <div className="text-[10px] text-slate-500">
                                      {formatRatePct(row.commissionRatePct)}
                                    </div>
                                  )}
                                  {hasMultiSplit &&
                                    row.mySplit &&
                                    row.mySplit.allocatedAmount !== null && (
                                      <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
                                        ของฉัน: {formatThb(row.mySplit.allocatedAmount)}
                                      </div>
                                    )}
                                  {hasMultiSplit && !row.mySplit && (
                                    <div
                                      className="text-[10px] font-semibold text-indigo-600 mt-0.5"
                                      title={splits
                                        .map(
                                          (s) =>
                                            `${s.recipientName} ${s.splitPct}%${
                                              s.allocatedAmount != null
                                                ? ` (${formatThb(s.allocatedAmount)})`
                                                : ''
                                            }`
                                        )
                                        .join(' • ')}
                                    >
                                      แบ่ง {splits.length} คน
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            if (row.existingRequest) {
                              return (
                                <div className="inline-flex flex-col items-end gap-0.5">
                                  <span className="inline-flex text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    รอตรวจกำไร
                                  </span>
                                  {hasMultiSplit && (
                                    <span className="text-[10px] font-semibold text-indigo-600">
                                      แบ่ง {splits.length} คน
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return <span className="text-slate-300 font-medium">—</span>;
                          })()}
                        </td>

                        <td className="py-3.5 px-3 align-middle min-w-[195px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CommissionStatusBadge status={row.derivedStatus} />
                            {isSuperAdmin && row.existingRequest && (
                              <Link
                                href={`/sales/commissions/${row.existingRequest.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline tabular-nums whitespace-nowrap"
                              >
                                <Eye size={12} /> {row.existingRequest.requestNo}
                              </Link>
                            )}
                            {!isSuperAdmin && row.existingRequest && (
                              <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
                                ({row.existingRequest.requestNo})
                              </span>
                            )}
                          </div>

                          {/* Compact Checklist pills */}
                          <div className="flex items-center flex-wrap gap-1 mt-1.5 text-[10px] font-semibold whitespace-nowrap">
                            <span
                              title={
                                row.isPayment100Pct
                                  ? 'ชำระเงินครบ 100% และยืนยันแล้ว'
                                  : 'ยังชำระเงินไม่ครบ 100%'
                              }
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md tabular-nums ${
                                row.isPayment100Pct
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {row.isPayment100Pct ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                              ชำระ ({row.settledTaskCount}/{row.paymentTaskCount})
                            </span>
                            <span
                              title={
                                row.isAccountingDone
                                  ? 'ฝ่ายบัญชีปิดขั้นตอนแล้ว'
                                  : 'รอฝ่ายบัญชียืนยันปิดงาน'
                              }
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                                row.isAccountingDone
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {row.isAccountingDone ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                              บัญชีปิดงาน
                            </span>
                            <span
                              title={
                                row.isJobClosed
                                  ? 'ปิด Job สมบูรณ์แล้ว'
                                  : row.hasAccountingMismatch
                                  ? 'รอเซลล์แก้ยอดใบเสนอราคาให้ตรงบัญชีเพื่อปิด Job'
                                  : 'รอปิดสถานะ Job'
                              }
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                                row.isJobClosed
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {row.isJobClosed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                              ปิด Job
                            </span>
                          </div>

                          {row.hasAccountingMismatch && !row.existingRequest && (
                            <div className="mt-1.5 rounded-md border border-rose-200 bg-rose-50/80 p-1.5 text-[10px] text-rose-800 space-y-1">
                              <div className="font-bold">
                                บัญชี {formatThb(row.accountingVerifiedBeforeVat)} ≠ QT {formatThb(row.quotationBeforeVat)}
                              </div>
                              {row.quotationId && (
                                <Link
                                  href={`/sales?editId=${row.quotationId}`}
                                  className="inline-flex items-center font-bold text-rose-700 underline hover:text-rose-900"
                                >
                                  แก้ไขยอดใบเสนอราคา →
                                </Link>
                              )}
                            </div>
                          )}

                          {extraIneligibleReasons.length > 0 && !row.existingRequest && (
                            <div className="mt-1 space-y-0.5">
                              {extraIneligibleReasons.map((reason) => (
                                <div key={reason} className="text-[11px] text-red-600 font-medium">
                                  • {reason}
                                </div>
                              ))}
                            </div>
                          )}

                          {row.latestRejectedRequest && (
                            <div className="mt-1 text-[11px] text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                              คำขอก่อนหน้า ({row.latestRejectedRequest.requestNo}) ไม่อนุมัติ:{' '}
                              {row.latestRejectedRequest.rejectedReason || '-'} — ยื่นใหม่ได้
                            </div>
                          )}

                          {row.existingRequest?.payoutRefNo && (
                            <div className="mt-1 text-[11px] text-green-700 font-semibold tabular-nums">
                              จ่ายแล้ว {formatThb(row.existingRequest.payoutAmount)} • อ้างอิง{' '}
                              {row.existingRequest.payoutRefNo}
                            </div>
                          )}
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

      {/* Step 3 Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#ff2301]" />
                <h2 className="text-base font-black text-slate-900">
                  ยืนยันการยื่นคำขอค่าคอมมิชชั่น ({selectedRows.length} รายการ)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium">
                หลังส่งคำขอ ระบบจะบันทึกวันที่ยื่น เลขที่คำขอ และส่งต่อให้{' '}
                <strong>SUPER_ADMIN</strong> ตรวจสอบต้นทุน/ยืนยัน % กำไร และคำนวณค่าคอมมิชชั่นตามสัดส่วนแบ่ง
              </div>

              {/* Split Commission Mode Selector */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <Users size={15} className="text-[#ff2301]" />
                    <span>การแบ่งค่าคอมมิชชั่นให้ผู้ร่วมงาน (%)</span>
                  </div>
                  <div className="inline-flex flex-wrap p-1 rounded-xl bg-white border border-slate-200 gap-1">
                    {[
                      { key: 'NONE' as const, label: 'เจ้าของงานรับ 100%' },
                      {
                        key: 'SHARED' as const,
                        label:
                          selectedRows.length > 1
                            ? 'แบ่ง % เหมือนกันทุกงาน'
                            : 'แบ่งค่าคอมฯ กับผู้ร่วมงาน',
                      },
                      ...(selectedRows.length > 1
                        ? [{ key: 'PER_JOB' as const, label: 'กำหนดแยกตามราย Job' }]
                        : []),
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setSplitMode(opt.key);
                          setSubmitModalError(null);
                          if (opt.key === 'SHARED' && sharedSplits.length === 0 && selectedRows[0]) {
                            setSharedSplits(buildOwnerSplitForRow(selectedRows[0]));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                          splitMode === opt.key
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {splitMode === 'SHARED' && (
                  <div className="space-y-2 pt-1">
                    {selectedRows.length > 1 && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        รายชื่อและสัดส่วนด้านล่างนี้จะถูกนำไปใช้กับทั้ง{' '}
                        <strong>{selectedRows.length} งาน</strong> ที่เลือกยื่นพร้อมกัน
                      </p>
                    )}
                    <CommissionSplitEditor
                      splits={sharedSplits}
                      onChange={setSharedSplits}
                      recipientOptions={recipientOptions}
                      defaultOwner={
                        selectedRows[0]
                          ? {
                              userId: selectedRows[0].salespersonId,
                              recipientName: selectedRows[0].salespersonName,
                            }
                          : undefined
                      }
                      disabled={isSubmitting}
                      compact
                    />
                  </div>
                )}

                {splitMode === 'PER_JOB' && (
                  <p className="text-[11px] text-slate-600 font-medium">
                    กดปุ่ม <strong>&ldquo;แบ่งค่าคอมฯ&rdquo;</strong> ในแต่ละรายการด้านล่างเพื่อระบุรายชื่อและสัดส่วน % เฉพาะงานนั้น (งานที่ไม่ได้แก้ไขจะรับ 100% ในชื่อเจ้าของงาน)
                  </p>
                )}
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedRows.map((item) => {
                  const customSplits = jobSplitsMap[item.jobId];
                  const isJobExpanded = expandedSplitJobIds.has(item.jobId);
                  const currentJobSplits = customSplits || buildOwnerSplitForRow(item);

                  return (
                    <div key={item.jobId} className="p-3.5 bg-white space-y-2.5 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>
                              {item.jobNumber} • {item.customerName}
                            </span>
                            {splitMode === 'PER_JOB' && customSplits && customSplits.length > 1 && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                แบ่ง {customSplits.length} คน
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            เจ้าของงาน: <strong className="text-slate-700">{item.salespersonName}</strong> | สินค้า:{' '}
                            {item.productSold} | ใบกำกับ: {item.taxInvoiceNumbers}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right tabular-nums">
                            <div className="font-black text-slate-900">
                              {formatThb(item.salesAmountExVat)} บาท
                            </div>
                            <div className="text-[11px] text-slate-500">ยอดไม่รวม VAT</div>
                          </div>

                          {splitMode === 'PER_JOB' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!jobSplitsMap[item.jobId]) {
                                  setJobSplitsMap((prev) => ({
                                    ...prev,
                                    [item.jobId]: buildOwnerSplitForRow(item),
                                  }));
                                }
                                setExpandedSplitJobIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.jobId)) next.delete(item.jobId);
                                  else next.add(item.jobId);
                                  return next;
                                });
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition-colors"
                            >
                              <Users size={12} />
                              <span>แบ่งค่าคอมฯ</span>
                              {isJobExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {splitMode === 'PER_JOB' && isJobExpanded && (
                        <div className="pt-2 border-t border-slate-100">
                          <CommissionSplitEditor
                            splits={currentJobSplits}
                            onChange={(nextSplits) =>
                              setJobSplitsMap((prev) => ({ ...prev, [item.jobId]: nextSplits }))
                            }
                            recipientOptions={recipientOptions}
                            defaultOwner={{
                              userId: item.salespersonId,
                              recipientName: item.salespersonName,
                            }}
                            disabled={isSubmitting}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  หมายเหตุประกอบคำขอ (ไม่บังคับ)
                </label>
                <textarea
                  value={submitRemarks}
                  onChange={(e) => setSubmitRemarks(e.target.value)}
                  rows={2}
                  placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
                />
              </div>

              {(submitModalError || splitValidationError) && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
                  {submitModalError || splitValidationError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting || selectedRows.length === 0 || Boolean(splitValidationError)}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                ยืนยันยื่นคำขอค่าคอมมิชชั่น
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
