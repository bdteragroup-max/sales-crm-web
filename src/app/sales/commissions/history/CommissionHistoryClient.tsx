'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Search,
  Download,
  FileSpreadsheet,
  Eye,
  FileText,
  Clock,
  Coins,
  Banknote,
  Users,
} from 'lucide-react';
import {
  allocateCommissionAmountsBySplits,
  COMMISSION_STATUS_LABELS,
  CommissionRecipientOption,
  CommissionSplitItem,
  CommissionStatus,
  formatCommissionSplitsSummary,
  resolveEffectiveCommissionSplits,
  roundCurrency2,
} from '@/app/lib/salesCommission';
import SearchableSelect from '@/app/components/SearchableSelect';
import CommissionNavHeader from '../components/CommissionNavHeader';
import {
  CommissionStatusBadge,
  CompanyCodeBadge,
  formatRatePct,
  formatThaiDate,
  formatThb,
} from '../components/CommissionUiHelpers';

export type CommissionHistoryRow = {
  id: string;
  requestNo: string;
  jobNumber: string;
  companyCode: string;
  customerName: string;
  productSold: string | null;
  salespersonId?: string | null;
  salespersonName: string;
  splits?: CommissionSplitItem[];
  requestedByName: string;
  requestedAt: string;
  taxInvoiceNumbers: string | null;
  taxInvoiceDate: string | null;
  receiptNumbers: string | null;
  jobClosedStatus: string;
  salesAmountExVat: number;
  costAmount: number | null;
  sourceProfitPct: number | null;
  confirmedProfitPct: number | null;
  commissionRatePct: number | null;
  commissionAmount: number | null;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  payoutDate: string | null;
  payoutAmount: number | null;
  payoutRefNo: string | null;
  payoutRecordedByName: string | null;
};

type PersonCommissionSummary = {
  key: string;
  employeeId: string | null;
  recipientName: string;
  recipientRole: string | null;
  jobCount: number;
  inReviewCount: number;
  approvedPendingPayout: number;
  paidAmount: number;
  totalConfirmedAmount: number;
};

function getRowEffectiveSplits(r: CommissionHistoryRow): CommissionSplitItem[] {
  return resolveEffectiveCommissionSplits({
    salespersonId: r.salespersonId,
    salespersonName: r.salespersonName,
    commissionAmount: r.commissionAmount,
    splits: r.splits,
  });
}

export default function CommissionHistoryClient({
  initialItems,
  pendingApprovalCount = 0,
  recipientOptions = [],
}: {
  initialItems: CommissionHistoryRow[];
  pendingApprovalCount?: number;
  recipientOptions?: CommissionRecipientOption[];
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [salespersonFilter, setSalespersonFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const salespersonOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of initialItems) {
      if (r.salespersonName) s.add(r.salespersonName);
      for (const split of getRowEffectiveSplits(r)) {
        if (split.recipientName) s.add(split.recipientName);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'th'));
  }, [initialItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00+07:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999+07:00`).getTime() : null;

    return initialItems.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (companyFilter !== 'ALL' && r.companyCode !== companyFilter) return false;

      const effectiveSplits = getRowEffectiveSplits(r);
      if (salespersonFilter !== 'ALL') {
        const matchesRecipient =
          r.salespersonName === salespersonFilter ||
          effectiveSplits.some((s) => s.recipientName === salespersonFilter);
        if (!matchesRecipient) return false;
      }

      const reqMs = new Date(r.requestedAt).getTime();
      if (fromMs !== null && Number.isFinite(fromMs) && reqMs < fromMs) return false;
      if (toMs !== null && Number.isFinite(toMs) && reqMs > toMs) return false;

      if (q) {
        const hay = [
          r.requestNo,
          r.jobNumber,
          r.customerName,
          r.salespersonName,
          ...effectiveSplits.map((s) => `${s.recipientName} ${s.employeeId || ''}`),
          r.taxInvoiceNumbers || '',
          r.receiptNumbers || '',
          r.payoutRefNo || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialItems, search, statusFilter, companyFilter, salespersonFilter, dateFrom, dateTo]);

  const perPersonSummary = useMemo<PersonCommissionSummary[]>(() => {
    const map = new Map<string, PersonCommissionSummary>();

    for (const r of filtered) {
      const effectiveSplits = getRowEffectiveSplits(r);
      const paidAllocations =
        r.status === 'PAID'
          ? allocateCommissionAmountsBySplits(
              r.payoutAmount ?? r.commissionAmount ?? 0,
              effectiveSplits
            )
          : null;

      effectiveSplits.forEach((s, idx) => {
        if (salespersonFilter !== 'ALL' && s.recipientName !== salespersonFilter) {
          return;
        }
        const key = s.userId ? `uid:${s.userId}` : `name:${s.recipientName.trim().toLowerCase()}`;
        let entry = map.get(key);
        if (!entry) {
          entry = {
            key,
            employeeId: s.employeeId ?? null,
            recipientName: s.recipientName,
            recipientRole: s.recipientRole ?? null,
            jobCount: 0,
            inReviewCount: 0,
            approvedPendingPayout: 0,
            paidAmount: 0,
            totalConfirmedAmount: 0,
          };
          map.set(key, entry);
        }
        if (!entry.employeeId && s.employeeId) entry.employeeId = s.employeeId;
        if (!entry.recipientRole && s.recipientRole) entry.recipientRole = s.recipientRole;

        entry.jobCount += 1;
        if (
          r.status === 'SUBMITTED' ||
          r.status === 'PENDING_PROFIT_REVIEW' ||
          r.status === 'PENDING_APPROVAL'
        ) {
          entry.inReviewCount += 1;
        } else if (r.status === 'APPROVED') {
          const share =
            s.allocatedAmount !== null && s.allocatedAmount !== undefined
              ? s.allocatedAmount
              : roundCurrency2(((r.commissionAmount || 0) * s.splitPct) / 100);
          entry.approvedPendingPayout = roundCurrency2(entry.approvedPendingPayout + share);
          entry.totalConfirmedAmount = roundCurrency2(entry.totalConfirmedAmount + share);
        } else if (r.status === 'PAID') {
          const paidShare =
            paidAllocations?.[idx]?.allocatedAmount ??
            roundCurrency2((((r.payoutAmount ?? r.commissionAmount ?? 0) * s.splitPct) / 100));
          const approvedShare =
            s.allocatedAmount !== null && s.allocatedAmount !== undefined
              ? s.allocatedAmount
              : paidShare;
          entry.paidAmount = roundCurrency2(entry.paidAmount + paidShare);
          entry.totalConfirmedAmount = roundCurrency2(entry.totalConfirmedAmount + approvedShare);
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalConfirmedAmount !== a.totalConfirmedAmount) {
        return b.totalConfirmedAmount - a.totalConfirmedAmount;
      }
      if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
      return a.recipientName.localeCompare(b.recipientName, 'th');
    });
  }, [filtered, salespersonFilter]);

  const summary = useMemo(() => {
    let totalSales = 0;
    let totalApprovedOrPaidCommission = 0;
    let totalPaidAmount = 0;
    let pendingPayoutAmount = 0;

    for (const r of filtered) {
      totalSales += r.salesAmountExVat || 0;
      if (salespersonFilter !== 'ALL') {
        const effectiveSplits = getRowEffectiveSplits(r);
        const matchingSplits = effectiveSplits.filter((s) => s.recipientName === salespersonFilter);
        const paidAllocations =
          r.status === 'PAID'
            ? allocateCommissionAmountsBySplits(
                r.payoutAmount ?? r.commissionAmount ?? 0,
                effectiveSplits
              )
            : null;
        if (r.status === 'APPROVED') {
          for (const s of matchingSplits) {
            const share =
              s.allocatedAmount !== null && s.allocatedAmount !== undefined
                ? s.allocatedAmount
                : roundCurrency2(((r.commissionAmount || 0) * s.splitPct) / 100);
            totalApprovedOrPaidCommission = roundCurrency2(totalApprovedOrPaidCommission + share);
            pendingPayoutAmount = roundCurrency2(pendingPayoutAmount + share);
          }
        } else if (r.status === 'PAID') {
          effectiveSplits.forEach((s, idx) => {
            if (s.recipientName !== salespersonFilter) return;
            const paidShare =
              paidAllocations?.[idx]?.allocatedAmount ??
              roundCurrency2(((r.payoutAmount ?? r.commissionAmount ?? 0) * s.splitPct) / 100);
            const approvedShare =
              s.allocatedAmount !== null && s.allocatedAmount !== undefined
                ? s.allocatedAmount
                : paidShare;
            totalApprovedOrPaidCommission = roundCurrency2(
              totalApprovedOrPaidCommission + approvedShare
            );
            totalPaidAmount = roundCurrency2(totalPaidAmount + paidShare);
          });
        }
      } else {
        if (r.status === 'APPROVED') {
          totalApprovedOrPaidCommission = roundCurrency2(
            totalApprovedOrPaidCommission + (r.commissionAmount || 0)
          );
          pendingPayoutAmount = roundCurrency2(pendingPayoutAmount + (r.commissionAmount || 0));
        } else if (r.status === 'PAID') {
          totalApprovedOrPaidCommission = roundCurrency2(
            totalApprovedOrPaidCommission + (r.commissionAmount || 0)
          );
          totalPaidAmount = roundCurrency2(
            totalPaidAmount + (r.payoutAmount ?? (r.commissionAmount || 0))
          );
        }
      }
    }
    return {
      count: filtered.length,
      totalSales,
      totalApprovedOrPaidCommission,
      totalPaidAmount,
      pendingPayoutAmount,
    };
  }, [filtered, salespersonFilter]);

  const buildRequestExportRows = () =>
    filtered.map((r) => {
      const effectiveSplits = getRowEffectiveSplits(r);
      return {
        'เลขที่คำขอ': r.requestNo,
        'วันที่ยื่นคำขอ': formatThaiDate(r.requestedAt),
        'บริษัท': r.companyCode,
        'เลขที่ Job': r.jobNumber,
        'ลูกค้า': r.customerName,
        'สินค้าที่ขาย': r.productSold || '-',
        'เลขที่ใบกำกับภาษี': r.taxInvoiceNumbers || '-',
        'วันที่ใบกำกับภาษี': formatThaiDate(r.taxInvoiceDate),
        'เลขที่ใบเสร็จรับเงิน': r.receiptNumbers || '-',
        'สถานะปิด Job': r.jobClosedStatus,
        'เจ้าของงานหลัก': r.salespersonName,
        'สัดส่วนแบ่งค่าคอมฯ': formatCommissionSplitsSummary(effectiveSplits),
        'ยอดขายไม่รวม VAT (บาท)': r.salesAmountExVat,
        'ต้นทุน (บาท)': r.costAmount ?? '',
        '% กำไรที่ยืนยัน': r.confirmedProfitPct ?? '',
        '% ค่าคอมมิชชั่น': r.commissionRatePct ?? '',
        'ยอดค่าคอมมิชชั่นรวม (บาท)': r.commissionAmount ?? '',
        'สถานะคำขอ': COMMISSION_STATUS_LABELS[r.status as CommissionStatus] || r.status,
        'ผู้อนุมัติ': r.approvedByName || '-',
        'เหตุผลไม่อนุมัติ': r.rejectedReason || '-',
        'วันที่จ่ายเงิน': formatThaiDate(r.payoutDate),
        'ยอดเงินที่จ่ายรวม (บาท)': r.payoutAmount ?? '',
        'เลขที่อ้างอิงการจ่าย': r.payoutRefNo || '-',
        'ผู้บันทึกการจ่าย': r.payoutRecordedByName || '-',
      };
    });

  const buildPersonSummaryExportRows = () =>
    perPersonSummary.map((p) => ({
      'รหัสพนักงาน': p.employeeId || '-',
      'ชื่อผู้รับค่าคอมฯ': p.recipientName,
      'แผนก/ตำแหน่ง': p.recipientRole || '-',
      'จำนวนงานทั้งหมด': p.jobCount,
      'รอตรวจกำไร/รออนุมัติ (งาน)': p.inReviewCount,
      'อนุมัติรอจ่าย (บาท)': p.approvedPendingPayout,
      'จ่ายแล้ว (บาท)': p.paidAmount,
      'รวมยอดที่อนุมัติ/จ่าย (บาท)': p.totalConfirmedAmount,
    }));

  const buildSplitDetailExportRows = () => {
    const rows: Array<Record<string, string | number>> = [];
    for (const r of filtered) {
      const effectiveSplits = getRowEffectiveSplits(r);
      const paidAllocations =
        r.status === 'PAID'
          ? allocateCommissionAmountsBySplits(
              r.payoutAmount ?? r.commissionAmount ?? 0,
              effectiveSplits
            )
          : null;

      effectiveSplits.forEach((s, idx) => {
        if (salespersonFilter !== 'ALL' && s.recipientName !== salespersonFilter) {
          return;
        }
        const paidShare =
          r.status === 'PAID'
            ? (paidAllocations?.[idx]?.allocatedAmount ??
              roundCurrency2(((r.payoutAmount ?? r.commissionAmount ?? 0) * s.splitPct) / 100))
            : '';
        rows.push({
          'เลขที่คำขอ': r.requestNo,
          'วันที่ยื่นคำขอ': formatThaiDate(r.requestedAt),
          'บริษัท': r.companyCode,
          'เลขที่ Job': r.jobNumber,
          'ลูกค้า': r.customerName,
          'รหัสพนักงาน': s.employeeId || '-',
          'ชื่อผู้รับค่าคอมฯ': s.recipientName,
          'บทบาทในงาน': s.isOwner ? 'เจ้าของงาน' : 'ผู้ร่วมแบ่ง',
          'แผนก/ตำแหน่ง': s.recipientRole || '-',
          'สัดส่วน (%)': s.splitPct,
          'ค่าคอมฯ รวมของคำขอ (บาท)': r.commissionAmount ?? '',
          'ส่วนแบ่งค่าคอมฯ ที่ได้รับ (บาท)': s.allocatedAmount ?? '',
          'ส่วนแบ่งยอดที่จ่าย (บาท)': paidShare,
          'สถานะคำขอ': COMMISSION_STATUS_LABELS[r.status as CommissionStatus] || r.status,
          'วันที่จ่ายเงิน': formatThaiDate(r.payoutDate),
          'เลขที่อ้างอิงการจ่าย': r.payoutRefNo || '-',
        });
      });
    }
    return rows;
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(buildPersonSummaryExportRows()),
      'สรุปยอดรายบุคคล'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(buildSplitDetailExportRows()),
      'รายละเอียดส่วนแบ่งรายคน'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(buildRequestExportRows()),
      'CommissionHistory'
    );
    XLSX.writeFile(wb, `commission_history_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCsv = () => {
    const exportRows = buildSplitDetailExportRows();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csvContent = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commission_splits_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70 min-w-0">
      <CommissionNavHeader
        isSuperAdmin
        pendingApprovalCount={pendingApprovalCount}
        subtitle="ประวัติคำขอ สถานะการอนุมัติ ยอดค่าคอมมิชชั่น สถานะการจ่ายเงิน และส่งออกข้อมูล Excel / CSV"
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Summary KPIs - Symmetrical 4-Column Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-600">จำนวนคำขอตามเงื่อนไข</span>
                <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {summary.count}
                </span>
                <span className="text-xs font-semibold text-slate-400">รายการ</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              ตามตัวกรองปัจจุบัน
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-600">ยอดขายไม่รวม VAT รวม</span>
                <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Banknote size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {formatThb(summary.totalSales)}
                </span>
                <span className="text-xs font-semibold text-slate-400">บาท</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              ฐานคำนวณค่าคอมมิชชั่นรวม
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-teal-200 p-4 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-teal-800">ยอดอนุมัติรอจ่าย</span>
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-teal-700 tabular-nums">
                  {formatThb(summary.pendingPayoutAmount)}
                </span>
                <span className="text-xs font-semibold text-teal-600/70">บาท</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-teal-100/80 text-[11px] text-teal-700/80 font-medium">
              {salespersonFilter !== 'ALL'
                ? `เฉพาะส่วนแบ่งของ ${salespersonFilter}`
                : 'รอโอนจ่ายค่าคอมมิชชั่น'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-green-200 p-4 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-green-800">ยอดจ่ายค่าคอมฯ แล้ว</span>
                <span className="w-8 h-8 rounded-xl bg-green-50 text-green-600 border border-green-100 flex items-center justify-center shrink-0">
                  <Coins size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-green-700 tabular-nums">
                  {formatThb(summary.totalPaidAmount)}
                </span>
                <span className="text-xs font-semibold text-green-600/70">บาท</span>
              </div>
            </div>
            <div className="pt-2.5 mt-3 border-t border-green-100/80 text-[11px] text-green-700/80 font-medium">
              {salespersonFilter !== 'ALL'
                ? `ยอดจ่ายส่วนแบ่งของ ${salespersonFilter}`
                : 'บันทึกการโอนจ่ายเรียบร้อย'}
            </div>
          </div>
        </div>

        {/* Filters + Export buttons */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเลขคำขอ, Job, ลูกค้า, ใบกำกับ, อ้างอิงจ่าย..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30 focus:border-[#ff2301]"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
              >
                <option value="ALL">ทุกสถานะคำขอ</option>
                <option value="PENDING_PROFIT_REVIEW">{COMMISSION_STATUS_LABELS.PENDING_PROFIT_REVIEW}</option>
                <option value="PENDING_APPROVAL">{COMMISSION_STATUS_LABELS.PENDING_APPROVAL}</option>
                <option value="APPROVED">{COMMISSION_STATUS_LABELS.APPROVED}</option>
                <option value="REJECTED">{COMMISSION_STATUS_LABELS.REJECTED}</option>
                <option value="PAID">{COMMISSION_STATUS_LABELS.PAID}</option>
              </select>
            </div>

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

            <div className="lg:col-span-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="ตั้งแต่วันที่"
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30 tabular-nums"
              />
            </div>

            <div className="lg:col-span-2">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="ถึงวันที่"
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30 tabular-nums"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl sm:w-52 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/30"
              >
                <option value="ALL">ทุกบริษัท (TP / TG / TE)</option>
                <option value="TG">TG</option>
                <option value="TE">TE</option>
                <option value="TP">TP</option>
              </select>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                แสดงผล <strong className="text-slate-800">{filtered.length}</strong> จากทั้งหมด{' '}
                <strong className="text-slate-800">{initialItems.length}</strong> รายการ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 disabled:opacity-40 transition-colors"
              >
                <Download size={14} />
                ส่งออก CSV
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filtered.length === 0}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-40 transition-colors"
              >
                <FileSpreadsheet size={14} />
                ส่งออก Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* Per-Person Commission Payout Summary */}
        {perPersonSummary.length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-200/80 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Users size={15} />
                </span>
                <div>
                  <h2 className="text-xs font-black text-indigo-950">
                    สรุปยอดค่าคอมมิชชั่นแยกตามรายชื่อพนักงาน ({perPersonSummary.length} คน)
                  </h2>
                  <p className="text-[11px] text-indigo-700/80">
                    รวมส่วนแบ่งตาม % ของแต่ละคำขอ — คลิกที่รายชื่อเพื่อกรองเฉพาะงานของคนนั้น
                  </p>
                </div>
              </div>
              {salespersonFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSalespersonFilter('ALL')}
                  className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  แสดงทุกคน
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">พนักงาน / รหัส</th>
                    <th className="py-2.5 px-3 text-right">จำนวนงาน</th>
                    <th className="py-2.5 px-3 text-right">รอดำเนินการ</th>
                    <th className="py-2.5 px-3 text-right">อนุมัติรอจ่าย (บาท)</th>
                    <th className="py-2.5 px-3 text-right">จ่ายแล้ว (บาท)</th>
                    <th className="py-2.5 px-4 text-right">รวมอนุมัติ / จ่าย (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {perPersonSummary.map((p) => {
                    const isSelected = salespersonFilter === p.recipientName;
                    return (
                      <tr
                        key={p.key}
                        onClick={() =>
                          setSalespersonFilter(isSelected ? 'ALL' : p.recipientName)
                        }
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p.recipientName}</span>
                            {p.employeeId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {p.employeeId}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                                กำลังกรอง
                              </span>
                            )}
                          </div>
                          {p.recipientRole && (
                            <div className="text-[11px] text-slate-500">{p.recipientRole}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                          {p.jobCount} งาน
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-700 font-semibold tabular-nums">
                          {p.inReviewCount > 0 ? `${p.inReviewCount} งาน` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-teal-700 tabular-nums">
                          {p.approvedPendingPayout > 0 ? formatThb(p.approvedPendingPayout) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-green-700 tabular-nums">
                          {p.paidAmount > 0 ? formatThb(p.paidAmount) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 tabular-nums">
                          {formatThb(p.totalConfirmedAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                  <th className="py-3.5 px-3">เลขคำขอ / วันที่ยื่น</th>
                  <th className="py-3.5 px-3">Job / ลูกค้า</th>
                  <th className="py-3.5 px-3">ใบกำกับ / ใบเสร็จ</th>
                  <th className="py-3.5 px-3">ผู้ขาย</th>
                  <th className="py-3.5 px-3 text-right">ยอด (ไม่รวม VAT)</th>
                  <th className="py-3.5 px-3 text-right">% กำไร (ยืนยัน)</th>
                  <th className="py-3.5 px-3 text-right">อัตรา / ค่าคอมฯ</th>
                  <th className="py-3.5 px-3 text-center">สถานะ &amp; การจ่ายเงิน</th>
                  <th className="py-3.5 px-3 text-right">ดูข้อมูล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-400 font-medium">
                      ไม่พบประวัติคำขอค่าคอมมิชชั่น
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const effectiveSplits = getRowEffectiveSplits(r);
                    const hasMultiSplit = effectiveSplits.length > 1;
                    const focusedSplit =
                      salespersonFilter !== 'ALL'
                        ? effectiveSplits.find((s) => s.recipientName === salespersonFilter)
                        : null;
                    return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 align-middle tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <CompanyCodeBadge code={r.companyCode} />
                          <span className="font-black text-slate-900">{r.requestNo}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ยื่น: {formatThaiDate(r.requestedAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle max-w-[180px]">
                        <div className="font-bold text-slate-800 whitespace-nowrap">{r.jobNumber}</div>
                        <div className="text-[11px] text-slate-600 truncate" title={r.customerName}>
                          {r.customerName}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          IV: {r.taxInvoiceNumbers || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          RE: {r.receiptNumbers || '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle max-w-[200px]">
                        <div
                          className="font-medium text-slate-700 truncate"
                          title={
                            hasMultiSplit
                              ? formatCommissionSplitsSummary(effectiveSplits)
                              : r.salespersonName
                          }
                        >
                          {r.salespersonName}
                        </div>
                        {hasMultiSplit && (
                          <div className="mt-1 space-y-0.5">
                            {effectiveSplits.map((s, idx) => (
                              <div
                                key={`${idx}-${s.userId || s.recipientName}`}
                                className="flex items-center justify-between gap-1.5 text-[10px] text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100"
                              >
                                <span className="truncate font-semibold">{s.recipientName}</span>
                                <span className="shrink-0 font-black tabular-nums">
                                  {s.splitPct}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatThb(r.salesAmountExVat)}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right font-bold text-indigo-700 tabular-nums whitespace-nowrap">
                        {r.confirmedProfitPct !== null ? `${r.confirmedProfitPct.toFixed(2)}%` : '-'}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right tabular-nums whitespace-nowrap">
                        {r.commissionAmount !== null ? (
                          <div>
                            <div className="font-black text-emerald-700">
                              {formatThb(r.commissionAmount)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatRatePct(r.commissionRatePct)}
                            </div>
                            {hasMultiSplit && focusedSplit && focusedSplit.allocatedAmount !== null && (
                              <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
                                ส่วนที่กรอง ({focusedSplit.splitPct}%):{' '}
                                {formatThb(focusedSplit.allocatedAmount)}
                              </div>
                            )}
                            {hasMultiSplit && !focusedSplit && (
                              <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
                                {effectiveSplits.map((s, idx) => (
                                  <div key={`${idx}-${s.userId || s.recipientName}`}>
                                    {s.recipientName.split(' ')[0]}:{' '}
                                    <span className="font-bold text-slate-700">
                                      {s.allocatedAmount !== null
                                        ? formatThb(s.allocatedAmount)
                                        : '-'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-center">
                        <div className="flex flex-col items-center">
                          <CommissionStatusBadge status={r.status} />
                          {r.status === 'PAID' && (
                            <div className="text-[11px] text-green-700 mt-1 tabular-nums whitespace-nowrap">
                              จ่าย: {formatThb(r.payoutAmount)} ({formatThaiDate(r.payoutDate)}) •{' '}
                              {r.payoutRefNo}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right whitespace-nowrap">
                        <Link
                          href={`/sales/commissions/${r.id}`}
                          className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition-colors"
                        >
                          <Eye size={13} /> รายละเอียด
                        </Link>
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
    </main>
  );
}
