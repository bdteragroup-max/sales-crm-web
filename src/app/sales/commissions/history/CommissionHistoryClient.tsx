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
} from 'lucide-react';
import { COMMISSION_STATUS_LABELS, CommissionStatus } from '@/app/lib/salesCommission';
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
  salespersonName: string;
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

export default function CommissionHistoryClient({
  initialItems,
  pendingApprovalCount = 0,
}: {
  initialItems: CommissionHistoryRow[];
  pendingApprovalCount?: number;
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
      if (salespersonFilter !== 'ALL' && r.salespersonName !== salespersonFilter) return false;

      const reqMs = new Date(r.requestedAt).getTime();
      if (fromMs !== null && Number.isFinite(fromMs) && reqMs < fromMs) return false;
      if (toMs !== null && Number.isFinite(toMs) && reqMs > toMs) return false;

      if (q) {
        const hay = [
          r.requestNo,
          r.jobNumber,
          r.customerName,
          r.salespersonName,
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

  const summary = useMemo(() => {
    let totalSales = 0;
    let totalApprovedOrPaidCommission = 0;
    let totalPaidAmount = 0;
    let pendingPayoutAmount = 0;

    for (const r of filtered) {
      totalSales += r.salesAmountExVat || 0;
      if (r.status === 'APPROVED') {
        totalApprovedOrPaidCommission += r.commissionAmount || 0;
        pendingPayoutAmount += r.commissionAmount || 0;
      } else if (r.status === 'PAID') {
        totalApprovedOrPaidCommission += r.commissionAmount || 0;
        totalPaidAmount += r.payoutAmount ?? (r.commissionAmount || 0);
      }
    }
    return {
      count: filtered.length,
      totalSales,
      totalApprovedOrPaidCommission,
      totalPaidAmount,
      pendingPayoutAmount,
    };
  }, [filtered]);

  const buildExportRows = () =>
    filtered.map((r) => ({
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
      'พนักงานขาย': r.salespersonName,
      'ยอดขายไม่รวม VAT (บาท)': r.salesAmountExVat,
      'ต้นทุน (บาท)': r.costAmount ?? '',
      '% กำไรที่ยืนยัน': r.confirmedProfitPct ?? '',
      '% ค่าคอมมิชชั่น': r.commissionRatePct ?? '',
      'ยอดค่าคอมมิชชั่น (บาท)': r.commissionAmount ?? '',
      'สถานะคำขอ': COMMISSION_STATUS_LABELS[r.status as CommissionStatus] || r.status,
      'ผู้อนุมัติ': r.approvedByName || '-',
      'เหตุผลไม่อนุมัติ': r.rejectedReason || '-',
      'วันที่จ่ายเงิน': formatThaiDate(r.payoutDate),
      'ยอดเงินที่จ่าย (บาท)': r.payoutAmount ?? '',
      'เลขที่อ้างอิงการจ่าย': r.payoutRefNo || '-',
      'ผู้บันทึกการจ่าย': r.payoutRecordedByName || '-',
    }));

  const handleExportExcel = () => {
    const exportRows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CommissionHistory');
    XLSX.writeFile(wb, `commission_history_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCsv = () => {
    const exportRows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csvContent = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commission_history_${new Date().toISOString().slice(0, 10)}.csv`;
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
              รอโอนจ่ายค่าคอมมิชชั่น
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
              บันทึกการโอนจ่ายเรียบร้อย
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
                placeholder="พิมพ์หาชื่อพนักงานขาย..."
                emptyText="ไม่พบพนักงานขาย"
                options={[
                  { value: 'ALL', label: 'พนักงานขายทุกคน' },
                  ...salespersonOptions.map((name) => ({ value: name, label: name })),
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
                  filtered.map((r) => (
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

                      <td className="py-3.5 px-3 align-middle max-w-[140px]">
                        <div
                          className="font-medium text-slate-700 truncate"
                          title={r.salespersonName}
                        >
                          {r.salespersonName}
                        </div>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
