"use client";

import React, { useState } from "react";
import {
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Camera,
  Cpu,
  Activity,
  FileText,
  Sliders,
} from "lucide-react";
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
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showDetailedTable, setShowDetailedTable] = useState(false);

  const updateField = (field: keyof DiodeMeasurement, val: any) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  const handleUpload = async (
    field: keyof DiodeMeasurement,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    setIsUploading(field);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const file = files[0];
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const filename = `cr-meter-${String(field)}-${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { data, error } = await supabase.storage
        .from("uploadsService")
        .upload(filename, file, { contentType: file.type, upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("uploadsService").getPublicUrl(data.path);

      updateField(field, publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("อัปโหลดไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setIsUploading(null);
    }
  };

  // Reusable photo uploader box
  const renderPhotoUploader = (
    field: keyof DiodeMeasurement,
    label: string,
    photoUrl?: string
  ) => {
    return (
      <div className="w-full">
        {photoUrl ? (
          <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-4/3 flex items-center justify-center">
            <img
              src={photoUrl}
              alt={label}
              className="max-h-full max-w-full object-contain p-1"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-white/90 text-xs font-semibold text-slate-800 rounded-md hover:bg-white shadow"
              >
                ดูรูปเต็ม
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => updateField(field, "")}
                  className="px-2.5 py-1 bg-red-600 text-xs font-semibold text-white rounded-md hover:bg-red-700 shadow"
                >
                  ลบ
                </button>
              )}
            </div>
          </div>
        ) : (
          <label
            className={`border-2 border-dashed rounded-xl aspect-4/3 flex flex-col items-center justify-center gap-1.5 p-3 text-center transition-all ${
              disabled
                ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
                : "border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 cursor-pointer"
            }`}
          >
            {isUploading === field ? (
              <>
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-[11px] text-slate-500 font-medium">กำลังอัปโหลด...</span>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                  <Camera className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-[11px] font-semibold text-slate-700">
                  {label}
                </div>
                <span className="text-[10px] text-slate-400">
                  คลิกเพื่อถ่ายภาพ / แนบรูปมิเตอร์
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={disabled}
                  className="hidden"
                  onChange={(e) => handleUpload(field, e.target.files)}
                />
              </>
            )}
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800">
                ผลการตรวจวัดไดโอดภายในตัวเครื่อง (Diode Measurement)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Check list repair
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              รายการตรวจเช็ค 6 รายการ และบันทึกค่าพารามิเตอร์ ตามแบบฟอร์มตรวจสอบอินเวอร์เตอร์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Cold Test ตรวจวัดความต้านทานและวงจรไดโอดก่อนจ่ายไฟทดสอบ</span>
        </div>
      </div>

      {/* SECTION 1: 1. ตรวจเช็คพาวเวอร์บอร์ด */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center border border-indigo-200">
            1
          </span>
          <h4 className="font-bold text-sm text-slate-900">
            1. ตรวจเช็คพาวเวอร์บอร์ด (Power Board Check)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1.1 ตรวจเช็คไดโอด Module IGBT */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800">
                  1.1 ตรวจเช็คไดโอด Module IGBT
                </span>
                {value.igbtStatus === "NORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> ปกติ
                  </span>
                ) : value.igbtStatus === "ABNORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3" /> ผิดปกติ
                  </span>
                ) : null}
              </div>

              {renderPhotoUploader("meterPhotoDiode", "รูปมิเตอร์ 1.1 ไดโอด IGBT", value.meterPhotoDiode)}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-600 block">
                สถานะ Module IGBT:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("igbtStatus", value.igbtStatus === "NORMAL" ? "" : "NORMAL")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    value.igbtStatus === "NORMAL"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ใช้งานได้ปกติ
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("igbtStatus", value.igbtStatus === "ABNORMAL" ? "" : "ABNORMAL")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    value.igbtStatus === "ABNORMAL"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-rose-500 hover:text-rose-600"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ไม่ปกติ (ชำรุด)
                </button>
              </div>
            </div>
          </div>

          {/* 1.2 ตรวจสอบแต่ละเฟสถึงกัน หรือไม่ */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800">
                  1.2 ตรวจสอบแต่ละเฟสถึงกันหรือไม่
                </span>
                {value.phaseShortCheck === "NORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> ไม่ถึงกัน
                  </span>
                ) : value.phaseShortCheck === "SHORT" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3" /> ช็อตถึงกัน
                  </span>
                ) : null}
              </div>

              {renderPhotoUploader("meterPhotoPhase", "รูปมิเตอร์ 1.2 วัดแต่ละเฟส", value.meterPhotoPhase)}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-600 block">
                การตรวจสอบแต่ละเฟส:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("phaseShortCheck", value.phaseShortCheck === "NORMAL" ? "" : "NORMAL")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    value.phaseShortCheck === "NORMAL"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ปกติ (ไม่ถึงกัน)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("phaseShortCheck", value.phaseShortCheck === "SHORT" ? "" : "SHORT")}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    value.phaseShortCheck === "SHORT"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-rose-500 hover:text-rose-600"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ผิดปกติ (ถึงกัน)
                </button>
              </div>
            </div>
          </div>

          {/* 1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่ */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800">
                  1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่
                </span>
                {value.powerBoard24VStatus === "NORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> มีไฟ 24V
                  </span>
                ) : value.powerBoard24VStatus === "ABNORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3" /> ไม่มีไฟ
                  </span>
                ) : null}
              </div>

              {renderPhotoUploader("meterPhotoPower24V", "รูปมิเตอร์ 1.3 ไฟ 24V บอร์ด", value.meterPhotoPower24V)}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("powerBoard24VStatus", value.powerBoard24VStatus === "NORMAL" ? "" : "NORMAL")}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    value.powerBoard24VStatus === "NORMAL"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ปกติ (มีไฟ)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("powerBoard24VStatus", value.powerBoard24VStatus === "ABNORMAL" ? "" : "ABNORMAL")}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    value.powerBoard24VStatus === "ABNORMAL"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-rose-500 hover:text-rose-600"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ไม่มีไฟ
                </button>
              </div>

              <div>
                <input
                  type="text"
                  disabled={disabled}
                  value={value.powerBoard24VValue || ""}
                  onChange={(e) => updateField("powerBoard24VValue", e.target.value)}
                  placeholder="ค่าแรงดัน เช่น 24.2 Vdc"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expandable 12-point Bias Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setShowDetailedTable(!showDetailedTable)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600" />
              <span>ตารางวัดค่าไดโอด Forward / Reverse Bias 12 จุด (+ / - DC Bus) (คลิกเพื่อบันทึกค่าละเอียด)</span>
            </div>
            {showDetailedTable ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showDetailedTable && (
            <div className="p-4 space-y-4">
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange({
                      ...value,
                      pos_to_r_black: "0.520",
                      pos_to_s_black: "0.521",
                      pos_to_t_black: "0.520",
                      pos_to_u_red: "0.532",
                      pos_to_v_red: "0.531",
                      pos_to_w_red: "0.533",
                      pos_to_r_red: "OL",
                      pos_to_s_red: "OL",
                      pos_to_t_red: "OL",
                      pos_to_u_black: "OL",
                      pos_to_v_black: "OL",
                      pos_to_w_black: "OL",
                      neg_to_r_red: "0.518",
                      neg_to_s_red: "0.519",
                      neg_to_t_red: "0.520",
                      neg_to_u_black: "0.530",
                      neg_to_v_black: "0.532",
                      neg_to_w_black: "0.531",
                      neg_to_r_black: "OL",
                      neg_to_s_black: "OL",
                      neg_to_t_black: "OL",
                      neg_to_u_red: "OL",
                      neg_to_v_red: "OL",
                      neg_to_w_red: "OL",
                      igbtStatus: "NORMAL",
                      phaseShortCheck: "NORMAL",
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  เติมค่าตัวอย่าง (ปกติ)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const cleared: any = { ...value };
                    [
                      "pos_to_r_black", "pos_to_s_black", "pos_to_t_black", "pos_to_u_red", "pos_to_v_red", "pos_to_w_red",
                      "pos_to_r_red", "pos_to_s_red", "pos_to_t_red", "pos_to_u_black", "pos_to_v_black", "pos_to_w_black",
                      "neg_to_r_red", "neg_to_s_red", "neg_to_t_red", "neg_to_u_black", "neg_to_v_black", "neg_to_w_black",
                      "neg_to_r_black", "neg_to_s_black", "neg_to_t_black", "neg_to_u_red", "neg_to_v_red", "neg_to_w_red",
                    ].forEach((k) => delete cleared[k]);
                    onChange(cleared);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold"
                >
                  ล้างค่าตาราง
                </button>
              </div>

              {/* Stacked Bias Tables Matching Screenshot 3 */}
              <div className="space-y-4">
                <div className="text-center font-bold text-xs text-slate-800">
                  ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์
                </div>

                {/* TABLE 1: ขั้ว (+) */}
                <div className="overflow-x-auto border-2 border-black rounded-lg">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="border-b border-black bg-slate-50 font-bold">
                        <th className="border-r border-black p-1.5 w-[14%] text-slate-800">
                          สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                        </th>
                        <th className="border-r-2 border-black p-1.5 w-[36%] text-slate-800" colSpan={4}>
                          สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                        </th>
                        <th className="border-r border-black p-1.5 w-[14%] text-slate-800">
                          สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                        </th>
                        <th className="p-1.5 w-[36%] text-slate-800" colSpan={4}>
                          สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row 1: R & U */}
                      <tr className="border-b border-black">
                        <td className="border-r border-black font-bold text-sm bg-white" rowSpan={3}>
                          +
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6] text-slate-900">
                          R
                        </td>
                        <td className="border-r border-black p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_r_black || ""}
                            onChange={(e) => updateField("pos_to_r_black", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b] text-slate-900">
                          U
                        </td>
                        <td className="border-r-2 border-black p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_u_red || ""}
                            onChange={(e) => updateField("pos_to_u_red", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        {/* Right (+) */}
                        <td className="border-r border-black font-bold text-sm bg-white" rowSpan={3}>
                          +
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6] text-slate-900">
                          R
                        </td>
                        <td className="border-r border-black p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_r_red || ""}
                            onChange={(e) => updateField("pos_to_r_red", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b] text-slate-900">
                          U
                        </td>
                        <td className="p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_u_black || ""}
                            onChange={(e) => updateField("pos_to_u_black", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      </tr>

                      {/* Row 2: S & V */}
                      <tr className="border-b border-black">
                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          S
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_s_black || ""}
                            onChange={(e) => updateField("pos_to_s_black", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          V
                        </td>
                        <td className="border-r-2 border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_v_red || ""}
                            onChange={(e) => updateField("pos_to_v_red", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          S
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_s_red || ""}
                            onChange={(e) => updateField("pos_to_s_red", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          V
                        </td>
                        <td className="p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_v_black || ""}
                            onChange={(e) => updateField("pos_to_v_black", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      </tr>

                      {/* Row 3: T & W */}
                      <tr>
                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          T
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_t_black || ""}
                            onChange={(e) => updateField("pos_to_t_black", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          W
                        </td>
                        <td className="border-r-2 border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_w_red || ""}
                            onChange={(e) => updateField("pos_to_w_red", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          T
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_t_red || ""}
                            onChange={(e) => updateField("pos_to_t_red", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          W
                        </td>
                        <td className="p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.pos_to_w_black || ""}
                            onChange={(e) => updateField("pos_to_w_black", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* TABLE 2: ขั้ว (-) */}
                <div className="overflow-x-auto border-2 border-black rounded-lg">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="border-b border-black bg-slate-50 font-bold">
                        <th className="border-r border-black p-1.5 w-[14%] text-slate-800">
                          สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                        </th>
                        <th className="border-r-2 border-black p-1.5 w-[36%] text-slate-800" colSpan={4}>
                          สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                        </th>
                        <th className="border-r border-black p-1.5 w-[14%] text-slate-800">
                          สายมัลติมิเตอร์ขั้วลบ (สีดำ)
                        </th>
                        <th className="p-1.5 w-[36%] text-slate-800" colSpan={4}>
                          สายมัลติมิเตอร์ขั้วบวก (สีแดง)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row 1: R & U */}
                      <tr className="border-b border-black">
                        <td className="border-r border-black font-bold text-sm bg-white" rowSpan={3}>
                          -
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6] text-slate-900">
                          R
                        </td>
                        <td className="border-r border-black p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_r_red || ""}
                            onChange={(e) => updateField("neg_to_r_red", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b] text-slate-900">
                          U
                        </td>
                        <td className="border-r-2 border-black p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_u_black || ""}
                            onChange={(e) => updateField("neg_to_u_black", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        {/* Right (-) */}
                        <td className="border-r border-black font-bold text-sm bg-white" rowSpan={3}>
                          -
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6] text-slate-900">
                          R
                        </td>
                        <td className="border-r border-black p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_r_black || ""}
                            onChange={(e) => updateField("neg_to_r_black", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b] text-slate-900">
                          U
                        </td>
                        <td className="p-1 w-[10%] bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_u_red || ""}
                            onChange={(e) => updateField("neg_to_u_red", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      </tr>

                      {/* Row 2: S & V */}
                      <tr className="border-b border-black">
                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          S
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_s_red || ""}
                            onChange={(e) => updateField("neg_to_s_red", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          V
                        </td>
                        <td className="border-r-2 border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_v_black || ""}
                            onChange={(e) => updateField("neg_to_v_black", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          S
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_s_black || ""}
                            onChange={(e) => updateField("neg_to_s_black", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          V
                        </td>
                        <td className="p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_v_red || ""}
                            onChange={(e) => updateField("neg_to_v_red", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      </tr>

                      {/* Row 3: T & W */}
                      <tr>
                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          T
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_t_red || ""}
                            onChange={(e) => updateField("neg_to_t_red", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          W
                        </td>
                        <td className="border-r-2 border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_w_black || ""}
                            onChange={(e) => updateField("neg_to_w_black", e.target.value)}
                            placeholder="~0.5"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        <td className="border-r border-black font-bold p-1 bg-[#b4a7d6] text-slate-900">
                          T
                        </td>
                        <td className="border-r border-black p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_t_black || ""}
                            onChange={(e) => updateField("neg_to_t_black", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="border-r border-black font-bold p-1 bg-[#f6b26b] text-slate-900">
                          W
                        </td>
                        <td className="p-1 bg-white">
                          <input
                            type="text"
                            disabled={disabled}
                            value={value.neg_to_w_red || ""}
                            onChange={(e) => updateField("neg_to_w_red", e.target.value)}
                            placeholder="OL"
                            className="w-full text-center py-1 px-0.5 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: 2. ตรวจเช็คบอร์ดคอนโทรล */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-200">
            2
          </span>
          <h4 className="font-bold text-sm text-slate-900">
            2. ตรวจเช็คบอร์ดคอนโทรล (Control Board Check)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น DI1 X1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800">
                  2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอล (เช่น DI1, X1)
                </span>
                {value.controlBoard24VStatus === "NORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> ปกติ (มีไฟ 24V)
                  </span>
                ) : value.controlBoard24VStatus === "ABNORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3" /> ไม่มีไฟ
                  </span>
                ) : null}
              </div>

              {renderPhotoUploader("meterPhotoControl24V", "รูปมิเตอร์ 2.1 ไฟ 24V คอนโทรล", value.meterPhotoControl24V)}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("controlBoard24VStatus", value.controlBoard24VStatus === "NORMAL" ? "" : "NORMAL")}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    value.controlBoard24VStatus === "NORMAL"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ปกติ (มีไฟ)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("controlBoard24VStatus", value.controlBoard24VStatus === "ABNORMAL" ? "" : "ABNORMAL")}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    value.controlBoard24VStatus === "ABNORMAL"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-rose-500 hover:text-rose-600"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ไม่มีไฟ
                </button>
              </div>

              <input
                type="text"
                disabled={disabled}
                value={value.controlBoard24VValue || ""}
                onChange={(e) => updateField("controlBoard24VValue", e.target.value)}
                placeholder="ค่าแรงดันเทอร์มินอล เช่น 24.0 Vdc"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* 2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น +10V เทียบ GND */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800">
                  2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอล (+10V เทียบ GND)
                </span>
                {value.controlBoard10VStatus === "NORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> ปกติ (มีไฟ 10V)
                  </span>
                ) : value.controlBoard10VStatus === "ABNORMAL" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3" /> ไม่มีไฟ
                  </span>
                ) : null}
              </div>

              {renderPhotoUploader("meterPhotoControl10V", "รูปมิเตอร์ 2.2 ไฟ 10V คอนโทรล", value.meterPhotoControl10V)}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("controlBoard10VStatus", value.controlBoard10VStatus === "NORMAL" ? "" : "NORMAL")}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    value.controlBoard10VStatus === "NORMAL"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ปกติ (มีไฟ)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateField("controlBoard10VStatus", value.controlBoard10VStatus === "ABNORMAL" ? "" : "ABNORMAL")}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    value.controlBoard10VStatus === "ABNORMAL"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:border-rose-500 hover:text-rose-600"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ไม่มีไฟ
                </button>
              </div>

              <input
                type="text"
                disabled={disabled}
                value={value.controlBoard10VValue || ""}
                onChange={(e) => updateField("controlBoard10VValue", e.target.value)}
                placeholder="ค่าแรงดันเทอร์มินอล เช่น 10.1 Vdc"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: 3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่ */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 font-bold text-xs flex items-center justify-center border border-purple-200">
            3
          </span>
          <h4 className="font-bold text-sm text-slate-900">
            3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่ (DC Bus Bulk Capacitors)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">
                สถานะภาพคาปาซิเตอร์ตัวใหญ่:
              </span>
              {value.capacitorStatus === "NORMAL" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> ปกติ ไม่บวม/ไม่รั่ว
                </span>
              ) : value.capacitorStatus === "ABNORMAL" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <AlertTriangle className="w-3 h-3" /> ผิดปกติ (บวม/รั่ว)
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => updateField("capacitorStatus", value.capacitorStatus === "NORMAL" ? "" : "NORMAL")}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  value.capacitorStatus === "NORMAL"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                ปกติ (ไม่บวม / ไม่รั่ว)
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => updateField("capacitorStatus", value.capacitorStatus === "ABNORMAL" ? "" : "ABNORMAL")}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  value.capacitorStatus === "ABNORMAL"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:border-rose-500 hover:text-rose-600"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                ผิดปกติ (บวม / รั่ว / เสื่อม)
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                ค่าความจุ หรือ รายละเอียดสภาพคาปาซิเตอร์:
              </label>
              <input
                type="text"
                disabled={disabled}
                value={value.capacitorValue || ""}
                onChange={(e) => updateField("capacitorValue", e.target.value)}
                placeholder="เช่น ไม่บวม ไม่รั่วซึม, ค่าความจุ 2200 µF ปกติ"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
            {renderPhotoUploader("photoCapacitor", "รูปถ่ายคาปาซิเตอร์ตัวใหญ่", value.photoCapacitor)}
          </div>
        </div>
      </div>

      {/* SECTION 4: 4. ทำการบันทึกค่าพารามิเตอร์ (ให้พิมพ์เอา) */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 font-bold text-xs flex items-center justify-center border border-teal-200">
              4
            </span>
            <h4 className="font-bold text-sm text-slate-900">
              4. ทำการบันทึกค่าพารามิเตอร์ (ให้พิมพ์เอา)
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const sample = `F0.01 (Control Mode): 0 (V/F Control)\nF0.03 (Max Frequency): 50.00 Hz\nF0.04 (Upper Frequency): 50.00 Hz\nF0.11 (Accel Time): 10.0 s\nF0.12 (Decel Time): 10.0 s\nMotor kW: 7.5 kW / 380V`;
                updateField("parameterNotes", (value.parameterNotes ? value.parameterNotes + "\n" : "") + sample);
              }}
              className="text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-md transition-colors"
            >
              + ตัวอย่างพารามิเตอร์
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <textarea
            disabled={disabled}
            rows={4}
            value={value.parameterNotes || ""}
            onChange={(e) => updateField("parameterNotes", e.target.value)}
            placeholder="พิมพ์ค่าพารามิเตอร์ที่บันทึกไว้ เช่น F0.00, F0.01, พารามิเตอร์มอเตอร์, โหมดการควบคุม (V/F, Sensorless Vector), ความถี่, ฟังก์ชัน Terminal ฯลฯ"
            className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono leading-relaxed"
          />
          <p className="text-[11px] text-slate-400">
            พิมพ์ข้อความบันทึกค่าพารามิเตอร์ตามที่ช่างตรวจสอบหรือสำรองข้อมูลไว้จากตัวเครื่อง
          </p>
        </div>
      </div>
    </div>
  );
}
