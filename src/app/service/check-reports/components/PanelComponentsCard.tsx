"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Layers, Check, X, Zap, ArrowRight, Ban } from "lucide-react";
import { PanelComponentItem } from "@/app/actions/inverterCheckReports";

interface PanelComponentsCardProps {
  items: PanelComponentItem[];
  onChange: (items: PanelComponentItem[]) => void;
  disabled?: boolean;
  hasInverter?: boolean;
  onNavigateToInverter?: () => void;
}

export default function PanelComponentsCard({
  items,
  onChange,
  disabled = false,
  hasInverter = true,
  onNavigateToInverter,
}: PanelComponentsCardProps) {
  const updateStatus = (index: number, status: "NORMAL" | "DAMAGED" | "NOT_APPLICABLE") => {
    const next = [...items];
    next[index] = { ...next[index], status };
    onChange(next);
  };

  const updateRemark = (index: number, remark: string) => {
    const next = [...items];
    next[index] = { ...next[index], remark };
    onChange(next);
  };

  const markAllNormal = () => {
    const next = items.map((it) => {
      if (it.key === "inverter" && !hasInverter) {
        return { ...it, status: "NOT_APPLICABLE" as const, remark: "ไม่มีในตู้นี้ (No Inverter / Soft Starter)" };
      }
      return { ...it, status: "NORMAL" as const };
    });
    onChange(next);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800">
                ตรวจสอบสภาพอุปกรณ์ภายในตู้ควบคุม (13 รายการ)
              </h3>
              {hasInverter ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> ตู้นี้มี Inverter / Soft Starter
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <Ban className="w-3 h-3 text-slate-400" /> ตู้ไม่มี Inverter / Soft Starter
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจสอบความสมบูรณ์และจุดชำรุดของอุปกรณ์แต่ละชิ้นส่วนภายในตู้
            </p>
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={markAllNormal}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            เลือก &quot;สภาพปกติ&quot; ทั้งหมด
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const isInverterItem = item.key === "inverter";
          const isNotApplicable = item.status === "NOT_APPLICABLE" || (isInverterItem && !hasInverter && item.status !== "DAMAGED");
          const isNormal = item.status === "NORMAL" && !isNotApplicable;
          const isDamaged = item.status === "DAMAGED";

          return (
            <div
              key={item.key || idx}
              className={`rounded-xl border p-3 transition-all ${
                isDamaged
                  ? "border-rose-300 bg-rose-50/40"
                  : isNotApplicable
                  ? "border-slate-200 bg-slate-100/60 opacity-80"
                  : isNormal
                  ? "border-slate-200 bg-slate-50/40 hover:bg-slate-50/80"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{item.name}</span>

                  {isInverterItem && !hasInverter && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                      ไม่มีในตู้นี้
                    </span>
                  )}
                  {isInverterItem && hasInverter && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> Inverter
                    </span>
                  )}
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {isInverterItem && !hasInverter ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => updateStatus(idx, "NOT_APPLICABLE")}
                      className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-200 text-slate-700 flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      ไม่มี (N/A)
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => updateStatus(idx, "NORMAL")}
                        className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isNormal
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        ปกติ
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => updateStatus(idx, "DAMAGED")}
                        className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isDamaged
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-rose-600"
                        }`}
                      >
                        <X className="w-3 h-3" />
                        ชำรุด
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Extra helper for Inverter when cabinet has inverter */}
              {isInverterItem && hasInverter && onNavigateToInverter && (
                <div className="mb-2 p-1.5 rounded-lg bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-blue-800 font-medium">
                    มีการตรวจเช็ค Diode, Module IGBT และบอร์ดคอนโทรล
                  </span>
                  <button
                    type="button"
                    onClick={onNavigateToInverter}
                    className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>ตรวจละเอียด</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Remark input if damaged or custom info */}
              <div>
                <input
                  type="text"
                  disabled={disabled}
                  value={item.remark || ""}
                  onChange={(e) => updateRemark(idx, e.target.value)}
                  placeholder={isDamaged ? "โปรดระบุอาการชำรุด เช่น ไหม้, แตก, ขาด..." : "หมายเหตุ (ถ้ามี)..."}
                  className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                    isDamaged
                      ? "border-rose-300 bg-white text-rose-900 focus:ring-1 focus:ring-rose-500 placeholder-rose-300"
                      : "border-slate-200 bg-white text-slate-700 focus:ring-1 focus:ring-purple-500"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
