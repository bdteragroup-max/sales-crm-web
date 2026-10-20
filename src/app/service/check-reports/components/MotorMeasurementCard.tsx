"use client";

import React, { useMemo } from "react";
import { Gauge, Info, AlertTriangle, CheckCircle2, ShieldAlert, Lightbulb } from "lucide-react";
import { MotorMeasurement } from "@/app/actions/inverterCheckReports";

interface MotorMeasurementCardProps {
  value: MotorMeasurement;
  onChange: (val: MotorMeasurement) => void;
  disabled?: boolean;
}

export default function MotorMeasurementCard({
  value,
  onChange,
  disabled = false,
}: MotorMeasurementCardProps) {
  const updateField = (field: keyof MotorMeasurement, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  // Helper evaluation for winding resistance unbalance
  const windingBalance = useMemo(() => {
    const u = parseFloat(value.windingU1U2 || "");
    const v = parseFloat(value.windingV1V2 || "");
    const w = parseFloat(value.windingW1W2 || "");

    if (isNaN(u) || isNaN(v) || isNaN(w) || u <= 0 || v <= 0 || w <= 0) {
      return null;
    }

    const avg = (u + v + w) / 3;
    const maxDiff = Math.max(Math.abs(u - avg), Math.abs(v - avg), Math.abs(w - avg));
    const unbalancePercent = (maxDiff / avg) * 100;

    return {
      avg: avg.toFixed(2),
      unbalance: unbalancePercent.toFixed(1),
      isOk: unbalancePercent <= 5,
    };
  }, [value.windingU1U2, value.windingV1V2, value.windingW1W2]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              ผลการตรวจวัดมอเตอร์ไฟฟ้า (Motor Electrical Inspection)
            </h3>
            <p className="text-xs text-slate-500">
              วัดค่าความต้านทานขดลวด (Winding Resistance) และวัดฉนวนขดลวดลงกราวด์ (Insulation Resistance)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-lg text-amber-800 font-medium">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>เกณฑ์ช่าง: ขดลวด 3 เฟสควรสมดุล / ค่า Megger ฉนวนควรมากกว่า 1 MΩ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= SECTION 1: WINDING RESISTANCE ================= */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  ตารางวัดค่าความต้านทานขดลวด (Winding Resistance)
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                หน่วย: โอห์ม (Ω)
              </span>
            </div>

            {/* Warning / Caution */}
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50/90 border border-amber-200 p-2.5 rounded-lg leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <b>คำแนะนำ:</b> ใช้มัลติมิเตอร์ย่าน <b>Ω</b> โดยต้องตัดแหล่งจ่ายไฟและแยกมอเตอร์ออกจากวงจรควบคุมก่อนวัด
              </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
              <div className="grid grid-cols-2 bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                <div>จุดวัด (Test Point)</div>
                <div className="text-right">ค่าที่วัดได้ (Ω)</div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* U1-U2 */}
                <div className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>U1 – U2</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={value.windingU1U2 || ""}
                      onChange={(e) => updateField("windingU1U2", e.target.value)}
                      placeholder="0.00"
                      className="w-28 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-4">Ω</span>
                  </div>
                </div>

                {/* V1-V2 */}
                <div className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>V1 – V2</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={value.windingV1V2 || ""}
                      onChange={(e) => updateField("windingV1V2", e.target.value)}
                      placeholder="0.00"
                      className="w-28 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-4">Ω</span>
                  </div>
                </div>

                {/* W1-W2 */}
                <div className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>W1 – W2</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={value.windingW1W2 || ""}
                      onChange={(e) => updateField("windingW1W2", e.target.value)}
                      placeholder="0.00"
                      className="w-28 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-4">Ω</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Indicator */}
          {windingBalance && (
            <div
              className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border mt-2 ${
                windingBalance.isOk
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {windingBalance.isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  ความต้านทานขดลวดต่างกัน: <b>{windingBalance.unbalance}%</b> (เฉลี่ย {windingBalance.avg} Ω)
                </span>
              </div>
              <span className="text-[11px] font-bold">
                {windingBalance.isOk ? "สมดุลปกติ (<= 5%)" : "ไม่สมดุล (> 5%)"}
              </span>
            </div>
          )}
        </div>

        {/* ================= SECTION 2: INSULATION RESISTANCE (MEGGER) ================= */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  ตารางวัดฉนวนขดลวดลงกราวด์ (Insulation Resistance)
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-100/70 px-2 py-0.5 rounded">
                หน่วย: เมกะโอห์ม (MΩ)
              </span>
            </div>

            {/* Warning / Caution */}
            <div className="flex items-start gap-2 text-xs text-cyan-900 bg-cyan-50/80 border border-cyan-200 p-2.5 rounded-lg leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <span>
                <b>คำแนะนำ:</b> ใช้เครื่อง <b>Insulation Tester (Megger)</b> ไม่ใช่มัลติมิเตอร์ธรรมดา
              </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
              <div className="grid grid-cols-2 bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                <div>จุดวัด (Test Point)</div>
                <div className="text-right">ค่า Megger (MΩ)</div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* U - Frame */}
                <div className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>U – โครงมอเตอร์</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={value.insulationUGround || ""}
                      onChange={(e) => updateField("insulationUGround", e.target.value)}
                      placeholder="> 100 หรือ MΩ"
                      className="w-32 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 disabled:bg-slate-50"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-7">MΩ</span>
                  </div>
                </div>

                {/* V - Frame */}
                <div className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>V – โครงมอเตอร์</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={value.insulationVGround || ""}
                      onChange={(e) => updateField("insulationVGround", e.target.value)}
                      placeholder="> 100 หรือ MΩ"
                      className="w-32 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 disabled:bg-slate-50"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-7">MΩ</span>
                  </div>
                </div>

                {/* W - Frame */}
                <div className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>W – โครงมอเตอร์</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={value.insulationWGround || ""}
                      onChange={(e) => updateField("insulationWGround", e.target.value)}
                      placeholder="> 100 หรือ MΩ"
                      className="w-32 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 disabled:bg-slate-50"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-7">MΩ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <b>เกณฑ์ตัดสินฉนวน:</b> ค่ามากกว่า <b>1 MΩ</b> (ปลอดภัยขั้นต่ำ) / มากกว่า <b>10 MΩ</b> (ฉนวนสภาพดี) / หากต่ำกว่า 1 MΩ แสดงว่าขดลวดชื้นหรือมีไฟรั่วลงโครง
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="border-t border-slate-100 pt-4">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          หมายเหตุเพิ่มเติมการตรวจเช็คมอเตอร์ (Motor Inspection Remarks):
        </label>
        <input
          type="text"
          disabled={disabled}
          value={value.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="เช่น ใช้แรงดันทดสอบ Megger 500VDC, ลูกปืนมีเสียงดัง, ขดลวดมีคราบชื้นหรือรอยไหม้"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50"
        />
      </div>
    </div>
  );
}
