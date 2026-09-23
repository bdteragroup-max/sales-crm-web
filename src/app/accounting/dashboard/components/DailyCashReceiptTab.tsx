"use client";

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  ChevronRight,
  Search,
  Filter,
  Layers,
  Banknote,
  Send,
  Eye,
  CreditCard
} from 'lucide-react';
import { DrilldownItem } from './FinancialDrilldownModal';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
}

interface DailyCashReceiptTabProps {
  data: any;
  onOpenDrilldown: (item: DrilldownItem) => void;
}

export default function DailyCashReceiptTab({ data, onOpenDrilldown }: DailyCashReceiptTabProps) {
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    dataStatus,
    dailyCashReceipts,
    cashSalesSummary,
    tradeCreditSummary,
    receiptForecast,
    followUpTasksToday,
    priorityNotifications,
    corporateLoans
  } = data;

  const filteredTasks = (followUpTasksToday || []).filter((task: any) => {
    if (selectedPriority !== null && task.priority !== selectedPriority) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        task.customerName?.toLowerCase().includes(q) ||
        task.contractOrJobNo?.toLowerCase().includes(q) ||
        task.personInCharge?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Symmetrical Data Status & Reconciliation Strip */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                สถานะข้อมูลธนาคาร & บัญชี (Data Status)
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                พร้อมใช้ตัดสินใจ
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-0.5 font-medium">
              อัปเดตยอดธนาคาร & ระบบบัญชี: <span className="font-bold text-slate-900">{dataStatus?.lastBankSyncTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[11px]">รอกระทบยอด (Pending Match)</span>
            <span className="font-bold text-slate-900 text-sm">
              {dataStatus?.pendingReconciliationCount} รายการ ({formatCurrency(dataStatus?.pendingReconciliationAmount)})
            </span>
          </div>
          <div className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[11px]">เงินโอนไม่ระบุผู้จ่าย (Unmatched)</span>
            <span className="font-bold text-amber-600 text-sm">
              {dataStatus?.unmatchedIncomingCount} ยอด ({formatCurrency(dataStatus?.unmatchedIncomingAmount)})
            </span>
          </div>
        </div>
      </div>

      {/* 2. Symmetrical Priority Action Center (Priority 1 to 5) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            การแจ้งเตือนตามลำดับความสำคัญ (Notification Priority 1–5)
          </h3>
          {selectedPriority !== null && (
            <button
              onClick={() => setSelectedPriority(null)}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              แสดงทุกระดับ
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(priorityNotifications || []).map((notif: any) => {
            const isSelected = selectedPriority === notif.priority;
            const borderClass = notif.severity === 'danger'
              ? (isSelected ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/70' : 'border-slate-200 hover:border-rose-300 bg-white')
              : notif.severity === 'warning'
              ? (isSelected ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/70' : 'border-slate-200 hover:border-amber-300 bg-white')
              : (isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/70' : 'border-slate-200 hover:border-blue-300 bg-white');

            const badgeColor = notif.severity === 'danger'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : notif.severity === 'warning'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200';

            return (
              <div
                key={notif.priority}
                onClick={() => setSelectedPriority(isSelected ? null : notif.priority)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between h-full gap-3 ${borderClass}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                      ระดับ {notif.priority}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{notif.count} รายการ</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                    {notif.title}
                  </h4>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium text-[11px]">ยอดรวม</span>
                  <span className="font-bold text-slate-900">{formatCurrency(notif.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 4 Core Financial Flow KPI Cards (Strictly Symmetrical Heights & Rhythm) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ยอดขายสะสม */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">1. ยอดขายทั้งสิ้น</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(dailyCashReceipts?.totalSales)}
            </div>
            <p className="text-xs text-slate-500 mt-1">มูลค่างานและสัญญาที่ปิดการขายสะสม</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>กลุ่มบริษัท</span>
            <span className="font-semibold text-slate-800">TG • TE • TP</span>
          </div>
        </div>

        {/* Card 2: ยอดครบกำหนดชำระ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">2. ยอดครบกำหนดชำระ</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              {formatCurrency(dailyCashReceipts?.totalDue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">ยอดค่างวดและบิลครบกำหนดรอบเดือนนี้</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>หนี้เกินกำหนด</span>
            <span className="font-bold text-rose-600">{formatCurrency(tradeCreditSummary?.overdueAmount)}</span>
          </div>
        </div>

        {/* Card 3: เงินรับชำระจริง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">3. เงินรับจริง</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(dailyCashReceipts?.totalReceived)}
            </div>
            <p className="text-xs text-slate-500 mt-1">เงินเข้าบัญชีและบันทึกเรียบร้อย</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>ลูกหนี้คงค้าง (AR)</span>
            <span className="font-bold text-blue-600">{formatCurrency(tradeCreditSummary?.totalCreditUsed)}</span>
          </div>
        </div>

        {/* Card 4: อัตราจัดเก็บ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">4. อัตราจัดเก็บ</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-600 tracking-tight">
              {(dailyCashReceipts?.collectionRate || 0).toFixed(1)}%
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, dailyCashReceipts?.collectionRate || 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>เป้าหมายขั้นต่ำ: 20%</span>
            <span className="font-bold text-slate-700">
              {(dailyCashReceipts?.collectionRate || 0) < 20
                ? `ขาด ${(20 - (dailyCashReceipts?.collectionRate || 0)).toFixed(1)}%`
                : 'ตามเป้าหมาย'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Symmetrical 2-Column Operations Section (Equal Heights & Layout Harmony) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Delivered Without Full Payment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  งานส่งมอบสินค้าแล้วแต่ยังไม่ได้รับเงินครบ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ความเสี่ยงหน้างาน: มีการส่งของ/เริ่มงานแล้วแต่ยังค้างเงินหรือสลิป
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                {cashSalesSummary?.deliveredWithoutFullPaymentCount} งาน
              </span>
            </div>

            {/* List Table with consistent 4 items */}
            <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">เลขที่งาน / ลูกค้า</th>
                    <th className="py-2.5 px-3">วันส่งมอบ</th>
                    <th className="py-2.5 px-3 text-right">ยอดค้างชำระ</th>
                    <th className="py-2.5 px-3 text-center">ดูข้อมูล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(cashSalesSummary?.deliveredWithoutFullPaymentItems || []).slice(0, 4).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.jobNumber}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{item.customerName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.deliveryDate}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {formatCurrency(item.outstandingAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenDrilldown({
                            id: item.id,
                            jobId: item.jobId || item.id,
                            title: `งานส่งมอบ: ${item.jobNumber}`,
                            contractOrJobNo: item.jobNumber,
                            customerName: item.customerName,
                            companyCode: item.companyCode,
                            amount: item.totalAmount,
                            paidAmount: item.paidAmount,
                            outstandingAmount: item.outstandingAmount,
                            status: item.status,
                            personInCharge: item.responsiblePerson,
                            reason: 'งานส่งมอบแล้วยังไม่ได้รับโอนเงินครบ'
                          })}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors inline-flex"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span className="font-medium">ยอดค้างรวมงานที่ส่งมอบแล้ว ({cashSalesSummary?.deliveredWithoutFullPaymentCount} งาน):</span>
            <strong className="text-rose-700 font-black text-sm">
              {formatCurrency(cashSalesSummary?.deliveredWithoutFullPaymentAmount)}
            </strong>
          </div>
        </div>

        {/* Right Column: Trade Credit & Aging */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  เครดิตการค้า & การกระจายอายุหนี้ (AR Aging)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เช็คการใช้วงเงินเครดิตและระยะเวลาค้างชำระเพื่อควบคุมความเสี่ยง
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                ค้างเกินกำหนด: {tradeCreditSummary?.overdueCount || 0} รายการ
              </span>
            </div>

            {/* Credit Overview 3-Stat Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs mb-3.5">
              <div>
                <span className="text-slate-400 block text-[11px]">ยอดขายสะสม</span>
                <span className="font-bold text-slate-900">{formatCurrency(tradeCreditSummary?.totalCreditLimit)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ลูกหนี้คงค้าง (AR)</span>
                <span className="font-bold text-blue-600">{formatCurrency(tradeCreditSummary?.totalCreditUsed)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">หนี้เกินกำหนด</span>
                <span className="font-bold text-rose-600">{formatCurrency(tradeCreditSummary?.overdueAmount)}</span>
              </div>
            </div>

            {/* 4 Aging Distribution Cards with Visual Meters */}
            <div className="space-y-2 mb-4">
              <span className="text-slate-500 font-bold block uppercase text-[10px] tracking-wider">
                การกระจายอายุหนี้การค้า (AR Aging Buckets)
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 block font-medium">ยังไม่เกินกำหนด</span>
                  <span className="font-bold text-emerald-900 text-xs">{formatCurrency(tradeCreditSummary?.agingBuckets?.current)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[10px] text-amber-700 block font-medium">เกิน 1-30 วัน</span>
                  <span className="font-bold text-amber-900 text-xs">{formatCurrency(tradeCreditSummary?.agingBuckets?.days1to30)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-100">
                  <span className="text-[10px] text-orange-700 block font-medium">เกิน 31-90 วัน</span>
                  <span className="font-bold text-orange-900 text-xs">{formatCurrency((tradeCreditSummary?.agingBuckets?.days31to60 || 0) + (tradeCreditSummary?.agingBuckets?.days61to90 || 0))}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
                  <span className="text-[10px] text-rose-700 block font-medium">เกิน &gt; 90 วัน</span>
                  <span className="font-bold text-rose-900 text-xs">{formatCurrency(tradeCreditSummary?.agingBuckets?.days90plus)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span className="font-medium">ลูกหนี้ค้างชำระหลักที่ต้องเฝ้าระวัง:</span>
            <strong className="text-blue-900 font-bold text-sm">
              {tradeCreditSummary?.creditExceededCustomers?.length || 0} รายหลัก (ควบคุมวงเงิน)
            </strong>
          </div>
        </div>
      </div>

      {/* 5. Symmetrical Receipt Forecast (7, 30, and 90 Days) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              การคาดการณ์เงินรับล่วงหน้า (Cash Receipt Forecast)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ประเมินตามกำหนดนัดหมายและความน่าจะเป็นในการจัดเก็บ
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ยืนยันแน่นอน (70%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> น่าจะได้รับ (25%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> มีความเสี่ยง (5%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 7 Days */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">รอบ 7 วันข้างหน้า</span>
              <span className="text-xs font-black text-indigo-600">{formatCurrency(receiptForecast?.days7?.amount)}</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full flex overflow-hidden">
              <div style={{ width: '70%' }} className="bg-emerald-500" title="ยืนยันแน่นอน" />
              <div style={{ width: '30%' }} className="bg-blue-500" title="น่าจะได้รับ" />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>ยืนยัน: {formatCurrency(receiptForecast?.days7?.confirmed)}</span>
              <span>น่าจะได้รับ: {formatCurrency(receiptForecast?.days7?.probable)}</span>
            </div>
          </div>

          {/* 30 Days */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">รอบ 30 วันข้างหน้า</span>
              <span className="text-xs font-black text-indigo-600">{formatCurrency(receiptForecast?.days30?.amount)}</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full flex overflow-hidden">
              <div style={{ width: '60%' }} className="bg-emerald-500" title="ยืนยันแน่นอน" />
              <div style={{ width: '30%' }} className="bg-blue-500" title="น่าจะได้รับ" />
              <div style={{ width: '10%' }} className="bg-rose-500" title="มีความเสี่ยง" />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>ยืนยัน: {formatCurrency(receiptForecast?.days30?.confirmed)}</span>
              <span>เสี่ยง: {formatCurrency(receiptForecast?.days30?.atRisk)}</span>
            </div>
          </div>

          {/* 90 Days */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">รอบ 90 วันข้างหน้า</span>
              <span className="text-xs font-black text-indigo-600">{formatCurrency(receiptForecast?.days90?.amount)}</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full flex overflow-hidden">
              <div style={{ width: '50%' }} className="bg-emerald-500" title="ยืนยันแน่นอน" />
              <div style={{ width: '30%' }} className="bg-blue-500" title="น่าจะได้รับ" />
              <div style={{ width: '20%' }} className="bg-rose-500" title="มีความเสี่ยง" />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>ยืนยัน: {formatCurrency(receiptForecast?.days90?.confirmed)}</span>
              <span>เสี่ยง: {formatCurrency(receiptForecast?.days90?.atRisk)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Follow-up Tasks Today Table (Items Requiring Action Today) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              รายการที่ต้องดำเนินการติดตามวันนี้ (Follow-up Tasks Today)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              ระบุลูกค้า ยอดเงิน เหตุผล วันนัดหมายชำระ และผู้รับผิดชอบ (คลิกดูรายละเอียดและลงบันทึก)
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาลูกค้า, สัญญา, หรือผู้ดูแล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-3.5">ลำดับความสำคัญ</th>
                <th className="py-3 px-3.5">ลูกค้า / เลขที่อ้างอิง</th>
                <th className="py-3 px-3.5 text-right">ยอดเงินค้าง</th>
                <th className="py-3 px-3.5">เหตุผลที่ต้องติดตาม</th>
                <th className="py-3 px-3.5">กำหนดนัดหมาย</th>
                <th className="py-3 px-3.5">ผู้รับผิดชอบ</th>
                <th className="py-3 px-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    ไม่พบรายการติดตามที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t: any) => (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${t.priorityBadgeClass}`}>
                        {t.priorityLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-gray-900">{t.customerName}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.2 rounded text-gray-700">{t.contractOrJobNo}</span>
                        <span>•</span>
                        <span>{t.companyCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(t.amount)}</div>
                      <div className="text-[10px] text-rose-600 font-medium">เกิน {t.overdueDays} วัน</div>
                    </td>
                    <td className="py-3 px-3.5 max-w-[280px]">
                      <p className="text-gray-700 line-clamp-2 leading-relaxed">{t.reason}</p>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-gray-800">{t.nextFollowUpDate}</div>
                      <div className="text-[10px] text-gray-400">ติดต่อล่าสุด: {t.lastContactDate}</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="text-gray-800 font-medium">{t.personInCharge}</div>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => onOpenDrilldown({
                          id: t.id,
                          jobId: t.jobId,
                          title: `ติดตามหนี้: ${t.customerName}`,
                          contractOrJobNo: t.contractOrJobNo,
                          customerName: t.customerName,
                          companyCode: t.companyCode,
                          amount: t.amount,
                          outstandingAmount: t.amount,
                          overdueDays: t.overdueDays,
                          status: t.priorityLabel,
                          statusBadgeClass: t.priorityBadgeClass,
                          paymentMethod: t.paymentMethod,
                          reason: t.reason,
                          personInCharge: t.personInCharge,
                          bankStatus: t.bankStatus,
                          lastContactDate: t.lastContactDate,
                          nextFollowUpDate: t.nextFollowUpDate
                        })}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-medium rounded-lg transition-colors shadow-xs"
                      >
                        Drill-down
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
