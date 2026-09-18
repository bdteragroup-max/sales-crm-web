"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Split,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  SupplierPaymentTask,
  formatCurrency,
  isValidDate,
} from "./payablesTypes";
import Swal from "sweetalert2";

interface SplitInstallmentModalProps {
  task: SupplierPaymentTask | null;
  onClose: () => void;
  onConfirmSplit: (
    installments: Array<{
      grossAmount: number;
      dueDate: string;
      note: string;
      whtPercent: number;
    }>
  ) => void;
  isPending: boolean;
}

export default function SplitInstallmentModal({
  task,
  onClose,
  onConfirmSplit,
  isPending,
}: SplitInstallmentModalProps) {
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitMode, setSplitMode] = useState<"EQUAL" | "CUSTOM">("EQUAL");
  const [splitRows, setSplitRows] = useState<
    Array<{
      grossAmount: number | string;
      dueDate: string;
      note: string;
      whtPercent: number;
    }>
  >([]);

  useEffect(() => {
    if (task) {
      const count = 2;
      setSplitCount(count);
      setSplitMode("EQUAL");

      const totalGross = Number(task.grossAmount) || 0;
      const whtRate = Number(task.whtPercent) || 0;
      const half = Math.round((totalGross / count) * 100) / 100;
      const remainder = Math.round((totalGross - half * (count - 1)) * 100) / 100;
      const baseDate =
        task.dueDate && isValidDate(task.dueDate) ? new Date(task.dueDate) : new Date();

      const rows = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i * 30);
        rows.push({
          grossAmount: i === count - 1 ? remainder : half,
          dueDate: d.toISOString().slice(0, 10),
          note: `งวดแบ่งชำระ (${i + 1}/${count})`,
          whtPercent: whtRate,
        });
      }
      setSplitRows(rows);
    }
  }, [task]);

  if (!task) return null;

  const handleSplitCountChange = (newCount: number) => {
    if (newCount < 2 || newCount > 12) return;
    setSplitCount(newCount);

    const totalGross = Number(task.grossAmount) || 0;
    const whtRate = Number(task.whtPercent) || 0;
    const part = Math.round((totalGross / newCount) * 100) / 100;
    const remainder = Math.round((totalGross - part * (newCount - 1)) * 100) / 100;
    const baseDate =
      task.dueDate && isValidDate(task.dueDate) ? new Date(task.dueDate) : new Date();

    const rows = [];
    for (let i = 0; i < newCount; i++) {
      const existingRow = splitRows[i];
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 30);
      rows.push({
        grossAmount:
          splitMode === "EQUAL"
            ? i === newCount - 1
              ? remainder
              : part
            : existingRow
            ? existingRow.grossAmount
            : 0,
        dueDate: existingRow?.dueDate || d.toISOString().slice(0, 10),
        note: existingRow?.note || `งวดแบ่งชำระ (${i + 1}/${newCount})`,
        whtPercent:
          existingRow?.whtPercent !== undefined ? existingRow.whtPercent : whtRate,
      });
    }
    setSplitRows(rows);
  };

  const handleAutoBalanceSplit = () => {
    if (splitRows.length === 0) return;
    const totalGross = Number(task.grossAmount) || 0;
    const othersSum = splitRows
      .slice(0, splitRows.length - 1)
      .reduce((sum, r) => sum + (Number(r.grossAmount) || 0), 0);
    const remainingForLast = Math.round((totalGross - othersSum) * 100) / 100;

    setSplitRows((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        grossAmount: Math.max(0, remainingForLast),
      };
      return copy;
    });
  };

  const originalGross = Math.round(Number(task.grossAmount) * 100) / 100;
  const currentTotal =
    Math.round(splitRows.reduce((sum, r) => sum + (Number(r.grossAmount) || 0), 0) * 100) / 100;
  const diff = Math.round((currentTotal - originalGross) * 100) / 100;
  const isValid = Math.abs(diff) <= 0.05;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      Swal.fire({
        icon: "warning",
        title: "ยอดเงินไม่ตรงกับยอดเดิม",
        text: `ยอดรวมของงวดใหม่ (${formatCurrency(
          currentTotal
        )}) ต้องเท่ากับยอดเดิม (${formatCurrency(originalGross)}) กรุณาเกลี่ยยอดให้ถูกต้อง`,
      });
      return;
    }

    const installments = splitRows.map((r) => ({
      grossAmount: Number(r.grossAmount),
      dueDate: r.dueDate,
      note: r.note,
      whtPercent: Number(r.whtPercent),
    }));

    onConfirmSplit(installments);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-sm shadow-red-600/20 shrink-0">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>แบ่งงวดชำระ: {task.poNumber}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold tabular-nums">
                  ยอดคงเหลือ {formatCurrency(task.grossAmount)}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดจำนวนงวด วันครบกำหนด และยอดเงินของแต่ละงวดที่ต้องการแบ่งจ่าย
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Step 1: Choose Number of Installments */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-bold text-slate-800">
                  1. เลือกจำนวนงวดที่ต้องการแบ่ง:
                </label>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSplitCountChange(num)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                        splitCount === num
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {num} งวด
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 flex-wrap gap-2">
                <span className="text-slate-600">วิธีกระจายยอดเงิน:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode("EQUAL");
                      handleSplitCountChange(splitCount);
                    }}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      splitMode === "EQUAL"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    หารเท่ากันทุกงวด (Equal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode("CUSTOM")}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      splitMode === "CUSTOM"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    กำหนดเอง (Custom)
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Installments Detail Table/List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800">
                  2. กำหนดรายละเอียดของแต่ละงวด ({splitRows.length} งวด):
                </h4>
                <button
                  type="button"
                  onClick={handleAutoBalanceSplit}
                  className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  title="คำนวณยอดงวดสุดท้ายให้อัตโนมัติ เพื่อให้ยอดรวมเท่ากับยอดเดิมพอดี"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>เกลี่ยยอดคงเหลือลงงวดสุดท้าย</span>
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {splitRows.map((row, idx) => {
                  const isLast = idx === splitRows.length - 1;
                  const gAmount = Number(row.grossAmount) || 0;
                  const whtPct = Number(row.whtPercent) || 0;
                  const whtAmt = Math.round(gAmount * (whtPct / 100) * 100) / 100;
                  const netAmt = Math.round((gAmount - whtAmt) * 100) / 100;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span>
                            งวดที่ {idx + 1} {isLast ? "(งวดสุดท้าย)" : ""}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          หักภาษี ({whtPct}%):{" "}
                          <span className="text-red-600 font-bold tabular-nums">
                            -{formatCurrency(whtAmt)}
                          </span>{" "}
                          | สุทธิ:{" "}
                          <span className="font-black text-slate-900 tabular-nums">
                            {formatCurrency(netAmt)}
                          </span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            ยอดงวด (Gross บาท)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={row.grossAmount}
                            onChange={(e) => {
                              setSplitMode("CUSTOM");
                              const val = e.target.value;
                              setSplitRows((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], grossAmount: val };
                                return copy;
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            วันครบกำหนดชำระ
                          </label>
                          <input
                            type="date"
                            value={row.dueDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitRows((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], dueDate: val };
                                return copy;
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            หมายเหตุงวดนี้
                          </label>
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitRows((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], note: val };
                                return copy;
                              });
                            }}
                            placeholder="เช่น งวด 1 เก็บงาน"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation Summary Bar */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                isValid
                  ? "bg-slate-50 border-slate-200 text-slate-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-slate-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold tabular-nums">
                    ยอดรวมทุกงวด: {formatCurrency(currentTotal)} / เดิม {formatCurrency(originalGross)}
                  </div>
                  <div className="text-[11px] opacity-85 mt-0.5">
                    {isValid
                      ? "ยอดเงินถูกต้องครบถ้วน พร้อมบันทึก"
                      : diff > 0
                      ? `ยอดรวมเกินยอดเดิมอยู่ ${formatCurrency(diff)} บาท`
                      : `ยอดรวมยังขาดอยู่อีก ${formatCurrency(Math.abs(diff))} บาท`}
                  </div>
                </div>
              </div>

              {!isValid && (
                <button
                  type="button"
                  onClick={handleAutoBalanceSplit}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  ปรับงวดสุดท้ายให้พอดี
                </button>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50/70">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending || !isValid}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20 cursor-pointer active:scale-95"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Split className="w-4 h-4 text-white" />
              )}
              <span>บันทึกการแบ่งงวดชำระ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
