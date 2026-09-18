"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Landmark,
  ShieldAlert,
  FileCheck2,
  Loader2,
} from "lucide-react";
import {
  SupplierPaymentTask,
  formatCurrency,
} from "./payablesTypes";
import Swal from "sweetalert2";

interface PaymentRecordModalProps {
  task: SupplierPaymentTask | null;
  onClose: () => void;
  onConfirmPayment: (details: {
    paidAmount: number;
    paidDate: string;
    paidFromBankCode: string;
    bankRefNumber: string;
    whtCertNumber: string;
    paymentNote: string;
    allowBypassGR: boolean;
  }) => void;
  isPending: boolean;
}

export default function PaymentRecordModal({
  task,
  onClose,
  onConfirmPayment,
  isPending,
}: PaymentRecordModalProps) {
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidFromBankCode, setPaidFromBankCode] = useState("KBANK");
  const [bankRefNumber, setBankRefNumber] = useState("");
  const [whtCertNumber, setWhtCertNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [allowBypassGR, setAllowBypassGR] = useState(false);

  useEffect(() => {
    if (task) {
      setPaidAmount(task.netPayableAmount ? Number(task.netPayableAmount).toString() : "0");
      setPaidDate(new Date().toISOString().slice(0, 10));
      setPaidFromBankCode(task.paidFromBankCode || "KBANK");
      setBankRefNumber(task.bankReferenceNumber || "");
      setWhtCertNumber(task.whtCertNumber || "");
      setPaymentNote("");
      setAllowBypassGR(false);
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      Swal.fire({
        icon: "error",
        title: "ยอดเงินไม่ถูกต้อง",
        text: "กรุณาระบุจำนวนเงินที่จ่ายจริง",
      });
      return;
    }

    if (task.paymentType === "FINAL_BALANCE" && !task.isGoodsReceived && !allowBypassGR) {
      Swal.fire({
        icon: "warning",
        title: "ยังไม่ผ่านการตรวจรับของ",
        text: "กรุณาทำเครื่องหมายยินยอมจ่ายเงินล่วงหน้าโดยไม่ต้องตรวจรับของ (Bypass GR)",
      });
      return;
    }

    onConfirmPayment({
      paidAmount: amount,
      paidDate,
      paidFromBankCode,
      bankRefNumber,
      whtCertNumber,
      paymentNote,
      allowBypassGR,
    });
  };

  const isHoldOnGR = task.paymentType === "FINAL_BALANCE" && !task.isGoodsReceived;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative border border-slate-200/80 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200/60 shadow-xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              บันทึกการจ่ายเงินให้เจ้าหนี้
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              PO: <span className="font-bold text-slate-700 font-mono">{task.poNumber}</span> | ผู้ขาย:{" "}
              <span className="font-bold text-slate-800">
                {task.purchaseOrder?.vendorName || "-"}
              </span>
            </p>
          </div>
        </div>

        {/* 3-Way Match Warning */}
        {isHoldOnGR && (
          <div className="mb-4 p-4 bg-red-50/70 border border-red-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-950">
              <div className="font-bold">คำเตือน 3-Way Match: ยังไม่พบการตรวจรับสินค้า</div>
              <div className="mt-1 text-red-800 leading-relaxed">
                ระบบคลังยังไม่ได้บันทึกรับมอบสินค้า (Goods Receipt) สำหรับ PO นี้ หากต้องการจ่ายเงินล่วงหน้า
                กรุณาทำเครื่องหมายข้อยกเว้นด้านล่าง
              </div>
              <label className="flex items-center gap-2 mt-2.5 cursor-pointer font-bold text-red-950 select-none">
                <input
                  type="checkbox"
                  checked={allowBypassGR}
                  onChange={(e) => setAllowBypassGR(e.target.checked)}
                  className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span>ข้อยกเว้น: ยืนยันจ่ายเงินล่วงหน้าโดยยังไม่ได้รับของ</span>
              </label>
            </div>
          </div>
        )}

        {/* Financial Breakdown Box */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400 font-medium text-[11px]">ยอดตาม PO (Gross)</span>
            <div className="font-bold text-slate-700 mt-0.5 tabular-nums">
              {formatCurrency(task.grossAmount)}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium text-[11px]">
              หักภาษี ({Number(task.whtPercent)}%)
            </span>
            <div className="font-bold text-red-600 mt-0.5 tabular-nums">
              -{formatCurrency(task.whtAmount)}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium text-[11px]">ยอดสุทธิที่ต้องโอน</span>
            <div className="font-black text-slate-900 mt-0.5 text-sm tabular-nums">
              {formatCurrency(task.netPayableAmount)}
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ยอดเงินที่จ่ายจริง (บาท) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-black text-slate-900 bg-white tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                วันที่โอนเงินจริง *
              </label>
              <input
                type="date"
                required
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-semibold text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                จ่ายจากบัญชีธนาคาร *
              </label>
              <select
                value={paidFromBankCode}
                onChange={(e) => setPaidFromBankCode(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-semibold text-slate-800 bg-white"
              >
                <option value="KBANK">KBANK - กสิกรไทย</option>
                <option value="SCB">SCB - ไทยพาณิชย์</option>
                <option value="BBL">BBL - กรุงเทพ</option>
                <option value="KTB">KTB - กรุงไทย</option>
                <option value="TTB">TTB - ทหารไทยธนชาต</option>
                <option value="BAY">BAY - กรุงศรี</option>
                <option value="CASH">CASH - เงินสดย่อย / ทดรอง</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                เลขที่อ้างอิงสลิป / ธนาคาร
              </label>
              <input
                type="text"
                value={bankRefNumber}
                onChange={(e) => setBankRefNumber(e.target.value)}
                placeholder="เช่น TRF-889104"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs text-slate-800 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              เลขที่หนังสือรับรองหัก ณ ที่จ่าย 50 ทวิ (ถ้ามี)
            </label>
            <input
              type="text"
              value={whtCertNumber}
              onChange={(e) => setWhtCertNumber(e.target.value)}
              placeholder="เช่น 50ทวิ-69/0412"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-mono text-slate-800 bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">หมายเหตุการจ่าย</label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="บันทึกเพิ่มเติม..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs text-slate-800 bg-white"
            />
          </div>

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
              disabled={isPending || (isHoldOnGR && !allowBypassGR)}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20 cursor-pointer active:scale-95"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileCheck2 className="w-4 h-4 text-white" />
              )}
              <span>ยืนยันตัดจ่ายเงิน</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
