'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  History,
  FileText,
  DollarSign,
  Package,
  Clock,
  Users,
} from 'lucide-react';
import {
  CommissionRecipientOption,
  CommissionSplitItem,
  resolveEffectiveCommissionSplits,
} from '@/app/lib/salesCommission';
import CommissionNavHeader from '../components/CommissionNavHeader';
import {
  CommissionStatusBadge,
  CompanyCodeBadge,
  formatRatePct,
  formatThaiDate,
  formatThaiDateTime,
  formatThb,
} from '../components/CommissionUiHelpers';
import {
  ApprovalDecisionForm,
  PayoutRecordForm,
  ProfitVerificationForm,
  SplitEditForm,
} from '../components/CommissionActionForms';

export type CommissionDetailRecord = {
  id: string;
  requestNo: string;
  jobId: string;
  jobNumber: string;
  companyCode: string;
  customerName: string;
  productSold: string | null;
  jobType: string | null;
  salespersonId?: string | null;
  salespersonName: string;
  splits?: CommissionSplitItem[];
  requestedByName: string;
  requestedAt: string;
  taxInvoiceNumbers: string | null;
  taxInvoiceDate: string | null;
  receiptNumbers: string | null;
  jobClosedStatus: string;
  isJobClosed: boolean;
  salesAmountExVat: number;
  paidAmountRecorded: number;
  isPayment100Pct: boolean;
  isAccountingDone: boolean;
  hasGoodsReturn: boolean;
  crmFetchedAt: string;
  job?: {
    paymentMethod?: string | null;
    paymentStatus?: string | null;
    paymentTasks?: Array<{
      id: string;
      installmentNo: number | null;
      installmentTotal: number | null;
      status: string;
      creditType: string | null;
      installmentAmount: number | null;
      paidAmount: number | null;
      dueDate?: string | null;
      invoiceNumber: string | null;
      invoiceDate: string | null;
      paidDate: string | null;
      note: string | null;
    }>;
  } | null;
  crmSnapshot: {
    quotationNumber?: string | null;
    projectNumber?: string | null;
    paymentMethod?: string | null;
    salesSourceLabel?: string;
    paymentTasks?: Array<{
      id: string;
      installmentNo: number | null;
      installmentTotal: number | null;
      status: string;
      creditType: string | null;
      installmentAmount: number | null;
      paidAmount: number | null;
      dueDate?: string | null;
      invoiceNumber: string | null;
      invoiceDate: string | null;
      paidDate: string | null;
      note: string | null;
    }>;
    accountingLogs?: Array<{
      completedBy: string;
      completedAt: string;
      note: string | null;
    }>;
    goodsReturnNumbers?: string[];
  } | null;
  costAmount: number | null;
  sourceProfitPct: number | null;
  confirmedProfitPct: number | null;
  profitConfirmedByName: string | null;
  profitConfirmedAt: string | null;
  profitEditReason: string | null;
  commissionRatePct: number | null;
  commissionAmount: number | null;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  payoutDate: string | null;
  payoutAmount: number | null;
  payoutRefNo: string | null;
  payoutNote: string | null;
  payoutRecordedByName: string | null;
  payoutRecordedAt: string | null;
  remarks: string | null;
  logs: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorName: string;
    previousProfitPct: number | null;
    newProfitPct: number | null;
    previousCost: number | null;
    newCost: number | null;
    previousCommissionRate: number | null;
    newCommissionRate: number | null;
    previousCommissionAmount: number | null;
    newCommissionAmount: number | null;
    reason: string | null;
    createdAt: string;
  }>;
};

export default function CommissionDetailClient({
  initialRecord,
  pendingApprovalCount = 0,
  recipientOptions = [],
}: {
  initialRecord: CommissionDetailRecord;
  pendingApprovalCount?: number;
  recipientOptions?: CommissionRecipientOption[];
}) {
  const [record, setRecord] = useState<CommissionDetailRecord>(initialRecord);
  const [isEditingSplits, setIsEditingSplits] = useState(false);

  const reloadDetail = async () => {
    const res = await fetch(`/api/sales/commissions/${record.id}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.request) {
      setRecord(data.request);
      setIsEditingSplits(false);
    }
  };

  const liveTasks = record.job?.paymentTasks;
  const tasks =
    liveTasks && liveTasks.length > 0
      ? liveTasks
      : record.crmSnapshot?.paymentTasks || [];
  const paymentMethodLabel =
    record.job?.paymentMethod || record.crmSnapshot?.paymentMethod || null;
  const acctLogs = record.crmSnapshot?.accountingLogs || [];
  const canEditProfit = record.status !== 'APPROVED' && record.status !== 'PAID';
  const canDecide =
    record.status === 'PENDING_PROFIT_REVIEW' ||
    record.status === 'PENDING_APPROVAL' ||
    record.status === 'SUBMITTED' ||
    record.status === 'REJECTED';
  const canRecordPayout = record.status === 'APPROVED';

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70 min-w-0">
      <CommissionNavHeader
        isSuperAdmin
        pendingApprovalCount={pendingApprovalCount}
        subtitle={`รายละเอียดคำขอ ${record.requestNo} • ข้อมูลหลักฐานการรับชำระ กำไร และประวัติสถานะ`}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/sales/commissions/approvals"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={15} /> กลับหน้ารายการตรวจสอบและอนุมัติ
          </Link>
        </div>

        {/* Request Top Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black text-slate-900">{record.requestNo}</span>
                <CommissionStatusBadge status={record.status} />
                <CompanyCodeBadge code={record.companyCode} />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Job: <strong className="text-slate-800">{record.jobNumber}</strong> • ลูกค้า:{' '}
                <strong className="text-slate-800">{record.customerName}</strong>
              </div>
            </div>
            <div className="text-left md:text-right text-xs text-slate-500">
              <div>
                ผู้ยื่นคำขอ: <strong className="text-slate-800">{record.requestedByName}</strong>
              </div>
              <div>
                พนักงานขายผู้รับผิดชอบ:{' '}
                <strong className="text-slate-800">{record.salespersonName}</strong>
              </div>
              <div>วันที่ยื่นคำขอ: {formatThaiDateTime(record.requestedAt)}</div>
            </div>
          </div>

          {record.hasGoodsReturn && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3.5 flex items-center gap-2.5 text-xs font-bold text-orange-800">
              <AlertTriangle size={18} className="shrink-0" />
              <span>
                Job นี้มีรายการใบคืนสินค้า (Goods Return):{' '}
                {(record.crmSnapshot?.goodsReturnNumbers || []).join(', ') || 'มีใบคืนสินค้าในระบบ'}
              </span>
            </div>
          )}

          {record.status === 'REJECTED' && record.rejectedReason && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800">
              <strong>เหตุผลที่ไม่อนุมัติ:</strong> {record.rejectedReason} (โดย{' '}
              {record.approvedByName || '-'})
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 h-full flex flex-col">
              <div className="text-[11px] font-semibold text-slate-500">มูลค่างานไม่รวม VAT</div>
              <div className="text-base font-black text-slate-900 mt-1.5 tabular-nums">
                {formatThb(record.salesAmountExVat)} บาท
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">
                {record.crmSnapshot?.salesSourceLabel || 'CRM'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 h-full flex flex-col">
              <div className="text-[11px] font-semibold text-slate-500">ต้นทุนที่บันทึก</div>
              <div className="text-base font-bold text-slate-800 mt-1.5 tabular-nums">
                {record.costAmount !== null ? `${formatThb(record.costAmount)} บาท` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">ไม่รวมภาษีมูลค่าเพิ่ม</div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 h-full flex flex-col">
              <div className="text-[11px] font-semibold text-slate-500">% กำไรที่ยืนยัน</div>
              <div className="text-base font-black text-indigo-700 mt-1.5 tabular-nums">
                {record.confirmedProfitPct !== null
                  ? `${record.confirmedProfitPct.toFixed(2)}%`
                  : 'รอตรวจกำไร'}
              </div>
              <div className="text-[10px] text-indigo-500/80 mt-1">
                {record.profitConfirmedByName ? `โดย ${record.profitConfirmedByName}` : 'รอผู้ดูแลยืนยัน'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 h-full flex flex-col">
              <div className="text-[11px] font-semibold text-slate-500">อัตราค่าคอมฯ</div>
              <div className="text-base font-bold text-slate-900 mt-1.5 tabular-nums">
                {record.commissionRatePct !== null ? formatRatePct(record.commissionRatePct) : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">เรทคำนวณตาม % กำไร</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 h-full flex flex-col">
              <div className="text-[11px] font-semibold text-slate-500">ยอดค่าคอมมิชชั่น</div>
              <div className="text-base font-black text-emerald-700 mt-1.5 tabular-nums">
                {record.commissionAmount !== null
                  ? `${formatThb(record.commissionAmount)} บาท`
                  : 'รอตรวจกำไร'}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-1">สุทธิ 2 ตำแหน่ง</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 h-full flex flex-col">
              <div className="text-[11px] font-semibold text-slate-500">สถานะปิด Job</div>
              <div className="mt-1.5">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                    record.isJobClosed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {record.jobClosedStatus}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">สถานะงานใน CRM</div>
            </div>
          </div>

          {/* Commission Splits Panel */}
          {(() => {
            const effectiveSplits = resolveEffectiveCommissionSplits({
              salespersonId: record.salespersonId,
              salespersonName: record.salespersonName,
              commissionAmount: record.commissionAmount,
              splits: record.splits,
            });
            return (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/35 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
                    <Users size={15} className="text-indigo-600" />
                    <span>
                      สัดส่วนผู้รับและแบ่งค่าคอมมิชชั่น ({effectiveSplits.length} คน)
                    </span>
                  </div>
                  {canEditProfit && (
                    <button
                      type="button"
                      onClick={() => setIsEditingSplits((prev) => !prev)}
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors self-start sm:self-auto"
                    >
                      <Users size={13} />
                      {isEditingSplits ? 'ปิดหน้าต่างแก้ไขสัดส่วน' : 'ปรับสัดส่วน / ผู้ร่วมแบ่ง %'}
                    </button>
                  )}
                </div>

                {isEditingSplits && canEditProfit ? (
                  <div className="bg-white rounded-xl border border-indigo-100 p-4">
                    <SplitEditForm
                      item={record}
                      recipientOptions={recipientOptions}
                      onCancel={() => setIsEditingSplits(false)}
                      onCompleted={reloadDetail}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    {effectiveSplits.map((split, idx) => (
                      <div
                        key={`${idx}-${split.userId || split.recipientName}`}
                        className="rounded-xl bg-white border border-indigo-100 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 truncate">
                              {split.recipientName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                split.isOwner
                                  ? 'bg-red-50 text-[#ff2301] border-red-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {split.isOwner ? 'เจ้าของงาน' : 'ผู้ร่วมแบ่ง'}
                            </span>
                          </div>
                          {(split.employeeId || split.recipientRole) && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {[split.employeeId, split.recipientRole].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <div className="font-black text-indigo-700">
                            {split.splitPct.toFixed(2)}%
                          </div>
                          <div className="text-xs font-bold text-emerald-700 mt-0.5">
                            {split.allocatedAmount !== null && split.allocatedAmount !== undefined
                              ? `${formatThb(split.allocatedAmount)} บาท`
                              : 'รอตรวจกำไร'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Row 1: CRM Reference (Left 7 cols) & Workflow Actions (Right 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 cols: CRM Evidence & Payment Verification */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Receipt size={17} className="text-[#ff2301]" />
                  <span>ข้อมูลอ้างอิงจาก CRM และหลักฐานการรับชำระเงิน</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div>
                  <div className="text-[11px] text-slate-500">สินค้า / งานที่ขาย</div>
                  <div className="font-bold text-slate-800 mt-0.5">{record.productSold || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">ใบเสนอราคา / โครงการอ้างอิง</div>
                  <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                    QT: {record.crmSnapshot?.quotationNumber || '—'} | Project:{' '}
                    {record.crmSnapshot?.projectNumber || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">เลขที่ใบกำกับภาษี</div>
                  <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                    {record.taxInvoiceNumbers && record.taxInvoiceNumbers !== '-'
                      ? record.taxInvoiceNumbers
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">วันที่ใบกำกับภาษี</div>
                  <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                    {formatThaiDate(record.taxInvoiceDate)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">เลขที่ใบเสร็จรับเงิน</div>
                  <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                    {record.receiptNumbers && record.receiptNumbers !== '-'
                      ? record.receiptNumbers
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">การตรวจสอบสิทธิ์ ณ วันยื่น</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                      <CheckCircle2 size={11} /> ชำระเงินครบ 100%
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                      <CheckCircle2 size={11} /> บัญชีปิดขั้นตอนแล้ว
                    </span>
                  </div>
                </div>
              </div>

              {/* PaymentTask Breakdown - Styled like CRM Payment Tasks */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span>รายการงวดชำระเงิน &amp; รอบส่งมอบ (Payment Tasks)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {tasks.length} รายการ
                  </span>
                </div>

                {tasks.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-400">
                    ไม่มีข้อมูลรายการงวดชำระ
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {tasks.map((pt, i) => {
                      const ptIsCompleted = pt.status === 'ตรวจสอบและบันทึกแล้ว';
                      const isDeliveryItem =
                        pt.creditType === 'DELIVERY' ||
                        Boolean(
                          pt.note && (pt.note.includes('ส่งมอบ') || pt.note.includes('ล็อต'))
                        );

                      const installmentTitle = isDeliveryItem ? (
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                            <Package size={11} /> รอบส่งมอบที่ {pt.installmentNo || i + 1}
                          </span>
                          {pt.installmentAmount ? (
                            <span className="tabular-nums">{formatThb(pt.installmentAmount)} บาท</span>
                          ) : null}
                        </span>
                      ) : pt.installmentNo !== undefined && pt.installmentNo !== null ? (
                        pt.installmentNo === 0 || pt.creditType === 'DEPOSIT' ? (
                          `เงินมัดจำ${
                            pt.installmentAmount ? ` - ${formatThb(pt.installmentAmount)} บาท` : ''
                          }`
                        ) : (
                          `งวดที่ ${pt.installmentNo}/${pt.installmentTotal || '-'}${
                            pt.installmentAmount ? ` - ${formatThb(pt.installmentAmount)} บาท` : ''
                          }`
                        )
                      ) : (
                        paymentMethodLabel || pt.creditType || 'ทั้งก้อน'
                      );

                      const showCreditType =
                        Boolean(pt.creditType) &&
                        !isDeliveryItem &&
                        pt.creditType !== 'DEPOSIT' &&
                        paymentMethodLabel !== 'เงินสด' &&
                        paymentMethodLabel !== 'จ่ายแล้ว';

                      return (
                        <div
                          key={pt.id || i}
                          className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium mb-0.5">
                                {isDeliveryItem ? 'รอบส่งมอบสินค้า' : 'งวดการชำระ'}
                              </div>
                              <div className="font-bold text-slate-900 text-sm">
                                {installmentTitle}
                              </div>
                              {pt.note && (
                                <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                                  {isDeliveryItem && (
                                    <span className="text-slate-400 font-normal mr-1">
                                      รายการสินค้า:
                                    </span>
                                  )}
                                  {pt.note}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-[11px] text-slate-400 font-medium mb-0.5">
                                วันครบกำหนด
                              </div>
                              <div className="font-bold text-slate-800 text-sm tabular-nums">
                                {pt.dueDate ? formatThaiDate(pt.dueDate) : '—'}
                              </div>
                            </div>
                          </div>

                          {showCreditType && (
                            <div className="text-[11px]">
                              <span className="text-slate-400 font-medium">รูปแบบการให้เครดิต: </span>
                              <span className="font-bold text-slate-800">{pt.creditType}</span>
                            </div>
                          )}

                          <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium mb-1">
                                สถานะงวดนี้
                              </div>
                              {ptIsCompleted ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] font-bold">
                                  <CheckCircle2 size={12} /> ตรวจสอบและบันทึกแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px] font-bold">
                                  <Clock size={12} /> {pt.status}
                                </span>
                              )}
                            </div>

                            {(pt.paidAmount || pt.paidDate) && (
                              <div className="text-right text-[11px] text-slate-600 tabular-nums">
                                {pt.paidAmount ? (
                                  <div>
                                    ยอดรับชำระ:{' '}
                                    <strong className="text-slate-900">
                                      {formatThb(pt.paidAmount)} บาท
                                    </strong>
                                  </div>
                                ) : null}
                                {pt.paidDate ? (
                                  <div>วันที่บันทึกจ่าย: {formatThaiDate(pt.paidDate)}</div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {(pt.invoiceNumber || pt.invoiceDate) && (
                            <div
                              className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                                ptIsCompleted
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                  : isDeliveryItem
                                  ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                                  : 'bg-blue-50/70 border-blue-200 text-blue-950'
                              }`}
                            >
                              <div>
                                <div
                                  className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1 ${
                                    ptIsCompleted
                                      ? 'text-emerald-800'
                                      : isDeliveryItem
                                      ? 'text-purple-800'
                                      : 'text-blue-800'
                                  }`}
                                >
                                  <FileText size={11} />
                                  {isDeliveryItem
                                    ? 'เลขที่ใบส่งของ (DO) / ใบแจ้งหนี้'
                                    : 'เลขที่เอกสาร / ใบแจ้งหนี้ / ใบกำกับ'}
                                </div>
                                <div className="text-sm font-black font-mono tabular-nums">
                                  {pt.invoiceNumber || '—'}
                                </div>
                              </div>

                              <div>
                                <div
                                  className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                                    ptIsCompleted
                                      ? 'text-emerald-800'
                                      : isDeliveryItem
                                      ? 'text-purple-800'
                                      : 'text-blue-800'
                                  }`}
                                >
                                  {isDeliveryItem ? 'วันที่ส่งมอบสินค้า' : 'วันที่ในเอกสาร'}
                                </div>
                                <div className="text-sm font-bold tabular-nums">
                                  {pt.invoiceDate ? formatThaiDate(pt.invoiceDate) : '—'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {acctLogs.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2">
                    บันทึกปิดขั้นตอนฝ่ายบัญชี (Job Step Log)
                  </h3>
                  <div className="space-y-1.5">
                    {acctLogs.map((l, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2"
                      >
                        <span>
                          ดำเนินการโดย <strong>{l.completedBy}</strong>
                          {l.note ? ` • หมายเหตุ: ${l.note}` : ''}
                        </span>
                        <span className="text-slate-500 tabular-nums whitespace-nowrap">
                          {formatThaiDateTime(l.completedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {record.remarks && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <FileText size={13} /> หมายเหตุจากผู้ยื่นคำขอ
                  </div>
                  <div>{record.remarks}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right 5 cols: Workflow Progress + Step 4, Step 5, Step 6 Actions */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Compact 4-Step Progress Strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-black text-slate-800 mb-3">
                สถานะขั้นตอนการอนุมัติคำขอ
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                {[
                  { label: '1. ยื่นคำขอ', done: true },
                  { label: '2. ตรวจกำไร', done: record.confirmedProfitPct !== null },
                  {
                    label: '3. อนุมัติ',
                    done: record.status === 'APPROVED' || record.status === 'PAID',
                  },
                  { label: '4. จ่ายเงิน', done: record.status === 'PAID' },
                ].map((step) => (
                  <div
                    key={step.label}
                    className={`py-2 px-1.5 rounded-xl border font-bold ${
                      step.done
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="truncate">{step.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {canEditProfit && (
              <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-3 flex-1">
                <h2 className="text-sm font-black text-indigo-950">
                  Step 4: ตรวจสอบต้นทุน &amp; ยืนยัน % กำไร
                </h2>
                <ProfitVerificationForm item={record} onCompleted={reloadDetail} />
              </div>
            )}

            {canDecide && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 flex-1">
                <h2 className="text-sm font-black text-slate-900">
                  Step 5: พิจารณาอนุมัติคำขอ
                </h2>
                <ApprovalDecisionForm item={record} onCompleted={reloadDetail} />
              </div>
            )}

            {canRecordPayout && (
              <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-xs space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <h2 className="text-sm font-black text-green-900">
                    Step 6: บันทึกการจ่ายค่าคอมมิชชั่น
                  </h2>
                  <PayoutRecordForm item={record} onCompleted={reloadDetail} />
                </div>
              </div>
            )}

            {record.status === 'PAID' && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-5 space-y-3 text-xs text-green-900 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="text-sm font-black flex items-center gap-2">
                    <CheckCircle2 size={17} className="text-green-600" />
                    <span>บันทึกจ่ายค่าคอมมิชชั่นเรียบร้อย</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-white/80 border border-green-200/70">
                      <div className="text-[11px] text-green-700/80">วันที่จ่ายเงิน</div>
                      <div className="font-bold mt-0.5 tabular-nums">
                        {formatThaiDate(record.payoutDate)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/80 border border-green-200/70">
                      <div className="text-[11px] text-green-700/80">ยอดเงินที่จ่าย</div>
                      <div className="font-black text-sm mt-0.5 tabular-nums">
                        {formatThb(record.payoutAmount)} บาท
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/80 border border-green-200/70">
                      <div className="text-[11px] text-green-700/80">เลขที่อ้างอิง</div>
                      <div className="font-bold mt-0.5 tabular-nums">{record.payoutRefNo}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/80 border border-green-200/70">
                      <div className="text-[11px] text-green-700/80">ผู้บันทึกการจ่าย</div>
                      <div className="font-bold mt-0.5 truncate" title={record.payoutRecordedByName || '-'}>
                        {record.payoutRecordedByName}
                      </div>
                    </div>
                  </div>
                  {record.payoutNote && (
                    <div className="p-2.5 rounded-xl bg-white/80 border border-green-200/70">
                      <span className="font-semibold">หมายเหตุ:</span> {record.payoutNote}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Full-Width Symmetrical Audit Log */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <History size={17} className="text-[#ff2301]" />
              <span>ประวัติสถานะและการแก้ไข (Audit Log)</span>
            </div>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {record.logs.length} รายการ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {record.logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs flex flex-col justify-between gap-2 h-full"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-black text-slate-900">
                      {log.action}
                      {log.toStatus
                        ? ` (${log.fromStatus ? `${log.fromStatus} → ` : ''}${log.toStatus})`
                        : ''}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {formatThaiDateTime(log.createdAt)} • โดย {log.actorName}
                    </span>
                  </div>
                  {log.reason && <div className="text-slate-700">{log.reason}</div>}
                </div>
                {(log.newProfitPct !== null || log.newCommissionAmount !== null) && (
                  <div className="text-[11px] text-indigo-700 font-semibold pt-2 border-t border-slate-200/70 tabular-nums">
                    กำไร:{' '}
                    {log.previousProfitPct !== null ? `${log.previousProfitPct}% → ` : ''}
                    {log.newProfitPct !== null ? `${log.newProfitPct}%` : '-'} • ค่าคอมฯ:{' '}
                    {log.newCommissionAmount !== null
                      ? `${formatThb(log.newCommissionAmount)} บาท (${formatRatePct(
                          log.newCommissionRate
                        )})`
                      : '-'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
