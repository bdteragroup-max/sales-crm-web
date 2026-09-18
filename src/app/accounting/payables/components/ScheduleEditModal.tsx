"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CalendarClock,
  Calendar,
  Split,
  History,
  Loader2,
  Percent,
  Building2,
  CreditCard,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  SupplierPaymentTask,
  formatDate,
  formatCurrency,
  getTaskLegTitle,
} from "./payablesTypes";
import Swal from "sweetalert2";

export interface ScheduleEditModalDetails {
  dueDate: string;
  deferralReason: string;
  paidDate?: string;
  paymentMethod: string;
  chequeDueDate?: string;
  chequeNumber?: string;
  note: string;
  // Accounting enhancements:
  whtPercent?: number;
  grossAmount?: number;
  vendorName?: string;
  accountNumber?: string;
  creditTerm?: string;
  jobName?: string;
  editorReason?: string;
}

interface ScheduleEditModalProps {
  task: SupplierPaymentTask | null;
  onClose: () => void;
  onSaveScheduleEdit: (details: ScheduleEditModalDetails) => void;
  onOpenSplitModal: (task: SupplierPaymentTask) => void;
  allTasks: SupplierPaymentTask[];
  isPending: boolean;
}

const WHT_PRESETS = [
  { percent: 0, label: "0%", desc: "สินค้าทั่วไป / ไม่หัก" },
  { percent: 1, label: "1%", desc: "ค่าขนส่ง (ม.3 เตรส)" },
  { percent: 2, label: "2%", desc: "ค่าโฆษณา" },
  { percent: 3, label: "3%", desc: "ค่าบริการ / จ้างทำของ" },
  { percent: 5, label: "5%", desc: "ค่าเช่าทรัพย์สิน" },
];

const REASON_PRESETS = [
  "จัดซื้อไม่ได้ระบุหัก ณ ที่จ่าย 3% (งานบริการ/รับจ้าง)",
  "จัดซื้อไม่ได้ระบุหัก ณ ที่จ่าย 1% (ค่าขนส่ง)",
  "ปรับปรุงยอดเงินตามใบแจ้งหนี้/ใบกำกับภาษีจริง",
  "ปรับปรุงเลขบัญชีรับเงินของผู้ขาย",
  "เจรจาขอขยายเครดิตกับคู่ค้า",
  "รอบตัดจ่ายประจำสัปดาห์ถัดไป",
];

export default function ScheduleEditModal({
  task,
  onClose,
  onSaveScheduleEdit,
  onOpenSplitModal,
  allTasks,
  isPending,
}: ScheduleEditModalProps) {
  const [editDueDate, setEditDueDate] = useState("");
  const [editDeferralReason, setEditDeferralReason] = useState("");
  const [editPaidDate, setEditPaidDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("BANK_TRANSFER");
  const [editChequeDueDate, setEditChequeDueDate] = useState("");
  const [editChequeNumber, setEditChequeNumber] = useState("");
  const [editNote, setEditNote] = useState("");

  // Accounting fields
  const [editGrossAmount, setEditGrossAmount] = useState<number>(0);
  const [editWhtPercent, setEditWhtPercent] = useState<number>(0);
  const [editVendorName, setEditVendorName] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editCreditTerm, setEditCreditTerm] = useState("");
  const [editJobName, setEditJobName] = useState("");
  const [editEditorReason, setEditEditorReason] = useState("");
  const [showPoDetails, setShowPoDetails] = useState(false);

  useEffect(() => {
    if (task) {
      setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
      setEditDeferralReason("");
      setEditPaidDate(task.paidDate ? new Date(task.paidDate).toISOString().slice(0, 10) : "");
      setEditPaymentMethod(task.paymentMethod || "BANK_TRANSFER");
      setEditChequeDueDate(
        task.chequeDueDate ? new Date(task.chequeDueDate).toISOString().slice(0, 10) : ""
      );
      setEditChequeNumber(task.chequeNumber || "");
      setEditNote("");

      setEditGrossAmount(Number(task.grossAmount) || 0);
      setEditWhtPercent(Number(task.whtPercent) || 0);
      setEditVendorName(task.purchaseOrder?.vendorName || "");
      setEditAccountNumber(task.purchaseOrder?.accountNumber || "");
      setEditCreditTerm(task.purchaseOrder?.creditTerm || "");
      setEditJobName(task.purchaseOrder?.jobName || "");
      setEditEditorReason("");
      setShowPoDetails(false);
    }
  }, [task]);

  if (!task) return null;

  // Live Calculations
  const computedWhtAmount = Math.round(editGrossAmount * (editWhtPercent / 100) * 100) / 100;
  const computedNetPayable = Math.round((editGrossAmount - computedWhtAmount) * 100) / 100;

  const applyDeferDays = (days: number) => {
    const base = editDueDate ? new Date(editDueDate) : new Date();
    base.setDate(base.getDate() + days);
    setEditDueDate(base.toISOString().slice(0, 10));
  };

  const applyDeferMonthEnd = () => {
    const base = editDueDate ? new Date(editDueDate) : new Date();
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    setEditDueDate(lastDay.toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDueDate) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุวันครบกำหนดชำระ" });
      return;
    }

    onSaveScheduleEdit({
      dueDate: editDueDate,
      deferralReason: editDeferralReason,
      paidDate: editPaidDate || undefined,
      paymentMethod: editPaymentMethod,
      chequeDueDate: editChequeDueDate || undefined,
      chequeNumber: editChequeNumber || undefined,
      note: editNote,
      // Accounting additions
      whtPercent: editWhtPercent,
      grossAmount: editGrossAmount,
      vendorName: editVendorName.trim() || undefined,
      accountNumber: editAccountNumber.trim() || undefined,
      creditTerm: editCreditTerm.trim() || undefined,
      jobName: editJobName.trim() || undefined,
      editorReason: editEditorReason.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl relative border border-slate-200/80 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200/60 shadow-xs shrink-0">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>แก้ไขข้อมูลตั้งเบิก & ภาษีหัก ณ ที่จ่าย</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                Accounting Edit
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              PO: <span className="font-bold text-slate-700 font-mono">{task.poNumber}</span> •{" "}
              {task.purchaseOrder?.vendorName || "-"}
            </p>
          </div>
        </div>

        {/* Live Financial Summary Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 mb-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-3">
            <span className="text-[11px] font-medium text-slate-400 block">ยอดรวมก่อนหัก (Gross)</span>
            <span className="text-base font-bold tabular-nums text-white">
              {formatCurrency(editGrossAmount)}
            </span>
          </div>
          <div className="border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-3">
            <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
              <span>หัก ณ ที่จ่าย ({editWhtPercent}%)</span>
            </span>
            <span className="text-base font-bold tabular-nums text-amber-400">
              - {formatCurrency(computedWhtAmount)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-emerald-400 block">ยอดจ่ายสุทธิ (Net Payable)</span>
            <span className="text-lg font-black tabular-nums text-emerald-400">
              {formatCurrency(computedNetPayable)}
            </span>
          </div>
        </div>

        {/* Split Option Banner if applicable */}
        {task.paymentType !== "DEPOSIT" && task.status !== "PAID_VERIFIED" && (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4 flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2">
              <Split className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="text-slate-800 font-medium">ต้องการแบ่งยอดนี้ออกเป็นหลายงวด?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSplitModal(task);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition-colors shadow-xs shrink-0 cursor-pointer active:scale-95"
            >
              แบ่งงวดชำระ
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* ========================================================
              Section 1: Withholding Tax (WHT)
             ======================================================== */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Percent className="w-4 h-4 text-red-600" />
                <span>ภาษีหัก ณ ที่จ่าย (Withholding Tax - WHT)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                ปัจจุบันในระบบ: <b className="text-slate-800">{Number(task.whtPercent)}%</b>
              </span>
            </div>

            {/* WHT Preset Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {WHT_PRESETS.map((p) => {
                const isSelected = editWhtPercent === p.percent;
                return (
                  <button
                    key={p.percent}
                    type="button"
                    onClick={() => setEditWhtPercent(p.percent)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="font-black text-sm">{p.label}</div>
                    <div
                      className={`text-[10px] leading-tight truncate ${
                        isSelected ? "text-red-100" : "text-slate-400"
                      }`}
                      title={p.desc}
                    >
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom WHT & Gross Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ยอดเงินงวดนี้ก่อนหักภาษี (Gross Amount)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editGrossAmount}
                  onChange={(e) => setEditGrossAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-bold text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  กำหนดอัตราภาษีหัก ณ ที่จ่ายเอง (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editWhtPercent}
                    onChange={(e) => setEditWhtPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-bold text-slate-800 bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              Section 2: Payment Schedule & Due Date
             ======================================================== */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-red-600" />
                  <span>วันครบกำหนดชำระงวดนี้ (Due Date) *</span>
                </label>
                {task.dueDate && (
                  <span className="text-[11px] text-slate-400">
                    เดิม: {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-semibold text-slate-800 bg-white"
              />

              {/* Quick Defer Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1 font-medium">เลื่อนนัดด่วน:</span>
                <button
                  type="button"
                  onClick={() => applyDeferDays(7)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  +7 วัน
                </button>
                <button
                  type="button"
                  onClick={() => applyDeferDays(15)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  +15 วัน
                </button>
                <button
                  type="button"
                  onClick={() => applyDeferDays(30)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  +30 วัน
                </button>
                <button
                  type="button"
                  onClick={applyDeferMonthEnd}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  สิ้นเดือน
                </button>
              </div>
            </div>

            {/* Payment Method & Paid Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">รูปแบบการชำระเงิน</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-semibold text-slate-800 bg-white cursor-pointer"
                >
                  <option value="BANK_TRANSFER">โอนเงินผ่านธนาคาร (Bank Transfer)</option>
                  <option value="CHEQUE_PDC">เช็คลงวันที่ล่วงหน้า (Cheque PDC)</option>
                  <option value="CASH">เงินสด / ทดรองจ่าย (Cash)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  วันที่โอนเงินจริง (Paid Date)
                </label>
                <input
                  type="date"
                  value={editPaidDate}
                  onChange={(e) => setEditPaidDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Cheque PDC Fields */}
            {editPaymentMethod === "CHEQUE_PDC" && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    เลขที่เช็ค (Cheque No.)
                  </label>
                  <input
                    type="text"
                    value={editChequeNumber}
                    onChange={(e) => setEditChequeNumber(e.target.value)}
                    placeholder="เช่น CHQ-001928"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    วันครบกำหนดหน้าเช็ค
                  </label>
                  <input
                    type="date"
                    value={editChequeDueDate}
                    onChange={(e) => setEditChequeDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              Section 3: Collapsible PO Header Info (Vendor & Account)
             ======================================================== */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowPoDetails(!showPoDetails)}
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>ปรับปรุงข้อมูลผู้ขาย & เลขบัญชี (ข้อมูลในใบสั่งซื้อ PO)</span>
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[11px] font-normal">
                  {showPoDetails ? "ซ่อน" : "แสดง / แก้ไข"}
                </span>
                {showPoDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showPoDetails && (
              <div className="p-4 space-y-3 border-t border-slate-200 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่อผู้ขาย (Vendor Name)
                    </label>
                    <input
                      type="text"
                      value={editVendorName}
                      onChange={(e) => setEditVendorName(e.target.value)}
                      placeholder="ระบุชื่อผู้ขาย..."
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เลขที่บัญชีรับเงิน (Bank Account)
                    </label>
                    <input
                      type="text"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                      placeholder="เช่น กสิกรไทย 123-4-56789-0"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เครดิตเทอม (Credit Term)
                    </label>
                    <input
                      type="text"
                      value={editCreditTerm}
                      onChange={(e) => setEditCreditTerm(e.target.value)}
                      placeholder="เช่น 30 วัน, PDC, เงินสด"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่องาน / โครงการ (Job Name)
                    </label>
                    <input
                      type="text"
                      value={editJobName}
                      onChange={(e) => setEditJobName(e.target.value)}
                      placeholder="ระบุชื่องาน..."
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              Section 4: Audit Reason (Reason for Change)
             ======================================================== */}
          <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-2">
            <label className="block font-bold text-amber-950 text-xs">
              เหตุผลการปรับปรุงข้อมูลโดยฝ่ายบัญชี (จะซิงค์ไปแสดงที่หน้าจัดซื้อ PO เพื่อความโปร่งใส)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setEditEditorReason(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                    editEditorReason === r
                      ? "bg-amber-600 text-white font-bold"
                      : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={editEditorReason}
              onChange={(e) => setEditEditorReason(e.target.value)}
              placeholder="ระบุเหตุผล หรือคลิกเลือกข้อความด่วนด้านบน..."
              className="w-full px-3.5 py-2 border border-amber-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">บันทึกช่วยจำภายใน (Note)</label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="พิมพ์บันทึกข้อความภายใน..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs bg-white text-slate-800"
            />
          </div>

          {/* Existing History Log if any */}
          {task.note && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 text-[11px] space-y-1.5">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>ประวัติบันทึก / การแก้ไขเดิม:</span>
              </div>
              <div className="font-mono whitespace-pre-wrap text-slate-600 max-h-24 overflow-y-auto leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                {task.note}
              </div>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20 cursor-pointer active:scale-95"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 text-white" />
              )}
              <span>บันทึกการปรับปรุงข้อมูล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
