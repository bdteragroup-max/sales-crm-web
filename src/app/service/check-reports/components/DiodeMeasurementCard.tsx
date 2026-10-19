"use client";

import React from "react";
import { Activity, Zap, Info, ArrowRight } from "lucide-react";
import { DiodeMeasurement } from "@/app/actions/inverterCheckReports";

interface DiodeMeasurementCardProps {
  value: DiodeMeasurement;
  onChange: (val: DiodeMeasurement) => void;
  disabled?: boolean;
}

export default function DiodeMeasurementCard({
  value,
  onChange,
  disabled = false,
}: DiodeMeasurementCardProps) {
  const updateField = (field: keyof DiodeMeasurement, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              ผลการตรวจวัดไดโอดภายในตัวเครื่อง (Diode Measurement)
            </h3>
            <p className="text-xs text-slate-500">
              ทดสอบวัดความต่อเนื่องและ Forward/Reverse Bias ของไดโอด/IGBT ด้วยมัลติมิเตอร์
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>ค่าปกติโดยทั่วไป: ทิศทางนำกระแส ~0.3 - 0.7V / ทิศทางย้อนกลับ OL (Open)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= SECTION 1: ขั้วบวก (+) ================= */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/20 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                +
              </span>
              <span className="font-bold text-slate-800 text-sm">
                ทดสอบเทียบขั้วบวก DC Bus (+)
              </span>
            </div>
            <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Rectifier & Upper Arm
            </span>
          </div>

          {/* Test 1A: ดำที่ (+) / แดงที่ R,S,T,U,V,W */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                สายดำที่ (+)
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"></span>
                สายแดงที่เฟส
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Forward Bias</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[
                { label: "R", field: "pos_to_r_black" },
                { label: "S", field: "pos_to_s_black" },
                { label: "T", field: "pos_to_t_black" },
                { label: "U", field: "pos_to_u_red" },
                { label: "V", field: "pos_to_v_red" },
                { label: "W", field: "pos_to_w_red" },
              ].map((item) => (
                <div key={item.field} className="text-center">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {item.label}
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={(value as any)[item.field] || ""}
                    onChange={(e) => updateField(item.field as any, e.target.value)}
                    placeholder="V"
                    className="w-full text-center text-xs px-1.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-mono disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Test 1B: แดงที่ (+) / ดำที่ R,S,T,U,V,W */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"></span>
                สายแดงที่ (+)
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                สายดำที่เฟส
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Reverse Bias</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[
                { label: "R", field: "pos_to_r_red" },
                { label: "S", field: "pos_to_s_red" },
                { label: "T", field: "pos_to_t_red" },
                { label: "U", field: "pos_to_u_black" },
                { label: "V", field: "pos_to_v_black" },
                { label: "W", field: "pos_to_w_black" },
              ].map((item) => (
                <div key={item.field} className="text-center">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {item.label}
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={(value as any)[item.field] || ""}
                    onChange={(e) => updateField(item.field as any, e.target.value)}
                    placeholder="OL"
                    className="w-full text-center text-xs px-1.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-mono disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: ขั้วลบ (-) ================= */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                -
              </span>
              <span className="font-bold text-slate-800 text-sm">
                ทดสอบเทียบขั้วลบ DC Bus (-)
              </span>
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Rectifier & Lower Arm
            </span>
          </div>

          {/* Test 2A: แดงที่ (-) / ดำที่ R,S,T,U,V,W */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"></span>
                สายแดงที่ (-)
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                สายดำที่เฟส
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Forward Bias</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[
                { label: "R", field: "neg_to_r_red" },
                { label: "S", field: "neg_to_s_red" },
                { label: "T", field: "neg_to_t_red" },
                { label: "U", field: "neg_to_u_black" },
                { label: "V", field: "neg_to_v_black" },
                { label: "W", field: "neg_to_w_black" },
              ].map((item) => (
                <div key={item.field} className="text-center">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {item.label}
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={(value as any)[item.field] || ""}
                    onChange={(e) => updateField(item.field as any, e.target.value)}
                    placeholder="V"
                    className="w-full text-center text-xs px-1.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Test 2B: ดำที่ (-) / แดงที่ R,S,T,U,V,W */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                สายดำที่ (-)
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"></span>
                สายแดงที่เฟส
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Reverse Bias</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[
                { label: "R", field: "neg_to_r_black" },
                { label: "S", field: "neg_to_s_black" },
                { label: "T", field: "neg_to_t_black" },
                { label: "U", field: "neg_to_u_red" },
                { label: "V", field: "neg_to_v_red" },
                { label: "W", field: "neg_to_w_red" },
              ].map((item) => (
                <div key={item.field} className="text-center">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {item.label}
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={(value as any)[item.field] || ""}
                    onChange={(e) => updateField(item.field as any, e.target.value)}
                    placeholder="OL"
                    className="w-full text-center text-xs px-1.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notes / Conclusion on Diode */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 block">
          ข้อสังเกตเพิ่มเติมเกี่ยวกับไดโอด/IGBT:
        </label>
        <input
          type="text"
          disabled={disabled}
          value={value.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="เช่น ไดโอดบริดจ์ปกติ, IGBT เฟส U ช็อตกับขั้วบวก, พบรอยไหม้ที่ขา R"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
      </div>
    </div>
  );
}
