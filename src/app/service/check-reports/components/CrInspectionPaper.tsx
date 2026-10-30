"use client";

import React from "react";
import { DEFAULT_PANEL_COMPONENTS } from "../lib/crConstants";

interface CrInspectionPaperProps {
  report: any;
  className?: string;
}

export default function CrInspectionPaper({ report, className = "" }: CrInspectionPaperProps) {
  const checkDateStr = report?.checkDate
    ? new Date(report.checkDate).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  const eqType = report?.equipmentType || "CONTROL_CABINET";
  const pInput = report?.powerInputVoltage || {};
  const pOutput = report?.powerOutputVoltage || {};
  const diode = report?.diodeMeasurement || {};

  // Check whether cabinet has an Inverter / Soft Starter
  const hasInverter = Boolean(
    report?.hasInverterInCabinet ??
    diode?.hasInverter ??
      (diode?.inverterModel ||
        diode?.inverterBrand ||
        diode?.igbtStatus ||
        diode?.meterPhotoDiode ||
        diode?.pos_to_r_black ||
        diode?.neg_to_r_red ||
        diode?.phaseShortCheck ||
        report?.inverterModel ||
        report?.inverterBrand)
  );

  // Split CR number into [ 67 ] - [ 10012 ] format matching Excel template
  const rawCr = (report?.crNumber || "").replace(/^CR[-_ ]*/i, "");
  const crParts = rawCr.split("-");
  const crPrefix = crParts[0] || (report?.crNumber ? "" : "67");
  const crSuffix = crParts.slice(1).join("-") || (report?.crNumber ? "" : "10012");

  // Ensure all 13 panel components are present
  const savedItems: any[] = report?.panelComponentsCheck || [];
  const displayPanelItems = DEFAULT_PANEL_COMPONENTS.map((defItem) => {
    const found = savedItems.find(
      (it) => it.key === defItem.key || it.name === defItem.name
    );
    if (found) return found;
    return defItem;
  });

  const photos = report?.photos || {};
  const photoSlots = [
    { key: "front", label: "ด้านหน้า", url: photos.front?.[0] },
    { key: "left", label: "ด้านซ้าย", url: photos.left?.[0] || photos.side?.[0] },
    { key: "right", label: "ด้านขวา", url: photos.right?.[0] },
    { key: "top", label: "ด้านบน", url: photos.top?.[0] },
    { key: "fan", label: "พัดลม", url: photos.fan?.[0] },
    { key: "inside", label: "ด้านใน", url: photos.inside?.[0] || photos.damage?.[0] },
    { key: "terminal", label: "น็อตเทอร์มินอล", url: photos.terminal?.[0] },
    { key: "nameplate", label: "เนมเพลท", url: photos.nameplate?.[0] },
  ];
  const hasAnyPhotos = photoSlots.some((s) => !!s.url) || Boolean(photos.other?.length);

  return (
    <div
      className={`cr-inspection-paper bg-white border-2 border-black w-full max-w-[794px] p-6 text-black text-[12px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header with Logos & Company info */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <img src="/4.png" alt="Tera Group" className="h-9 object-contain" />
            <img src="/6.png" alt="Tera Electric" className="h-9 object-contain" />
            <img src="/7.png" alt="Tera Power" className="h-9 object-contain" />
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-gray-800">
              {report?.companyCode === "TP"
                ? "บริษัท เทอรา พาวเวอร์ จำกัด"
                : report?.companyCode === "TE"
                ? "บริษัท เทอรา อิเล็คทริค จำกัด"
                : "บริษัท เทอรา กรุ๊ป จำกัด"}
            </div>
            <div className="text-[10px] text-gray-600">
              ระบบบริหารจัดการงานบริการและตรวจเช็คตู้ควบคุมระบบไฟฟ้า
            </div>
          </div>
        </div>

        {/* Top Right: เลขที่ CR [ 67 ] - [ 10012 ] matching template */}
        <div className="flex items-center justify-end my-2">
          <div className="flex items-center gap-1.5 font-bold text-[12px]">
            <span>เลขที่ CR</span>
            <span className="inline-block border border-black px-2.5 py-0.5 min-w-[40px] text-center font-mono bg-white">
              {crPrefix || "-"}
            </span>
            <span>-</span>
            <span className="inline-block border border-black px-3.5 py-0.5 min-w-[70px] text-center font-mono bg-white">
              {crSuffix || "-"}
            </span>
          </div>
        </div>

        {/* Subtitle: กรอกข้อมูลลงในตารางให้ครบถ้วน */}
        <div className="text-[12px] font-bold mb-1 text-black">
          กรอกข้อมูลลงในตารางให้ครบถ้วน
        </div>

        {/* General Info Grid - 7 Columns matching Excel template */}
        <table className="w-full border-collapse border border-black text-[11px] mb-2">
          <thead>
            <tr className="bg-neutral-100 text-center font-bold">
              <th className="border border-black p-1">วันที่ตรวจเช็ค</th>
              <th className="border border-black p-1">ชื่อบริษัทลูกค้า</th>
              <th className="border border-black p-1">
                {hasInverter ? "Inverter ยี่ห้อ" : "ยี่ห้อ / ผู้ประกอบ"}
              </th>
              <th className="border border-black p-1">Model</th>
              <th className="border border-black p-1">Serial No.</th>
              <th className="border border-black p-1">ผู้ตรวจสอบ</th>
              <th className="border border-black p-1">เซลล์ผู้ดูแล</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center font-medium">
              <td className="border border-black p-1.5">{checkDateStr}</td>
              <td className="border border-black p-1.5 font-bold text-left px-2">
                {report?.customerCompany || report?.customerName || "-"}
              </td>
              <td className="border border-black p-1.5 font-bold">
                {hasInverter
                  ? diode.inverterBrand || report?.inverterBrand || "-"
                  : report?.inverterBrand || "-"}
              </td>
              <td className="border border-black p-1.5 font-bold font-mono">
                {hasInverter
                  ? diode.inverterModel || report?.inverterModel || "-"
                  : report?.inverterModel || "-"}
              </td>
              <td className="border border-black p-1.5 font-mono">
                {report?.serialNumber || "-"}
              </td>
              <td className="border border-black p-1.5">{report?.inspectorName || "-"}</td>
              <td className="border border-black p-1.5">{report?.salesPerson || "-"}</td>
            </tr>
            {/* อาการ : */}
            <tr>
              <td className="border border-black p-1.5 font-bold bg-white text-left" colSpan={7}>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold shrink-0">อาการ :</span>
                  <span className="font-normal text-slate-800 leading-relaxed">
                    {report?.symptoms || "-"}
                  </span>
                </div>
              </td>
            </tr>
            {/* ข้อเสนอแนะ : */}
            <tr>
              <td className="border border-black p-1.5 font-bold bg-white text-left" colSpan={7}>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold shrink-0">ข้อเสนอแนะ :</span>
                  <span className="font-normal text-slate-800 leading-relaxed">
                    {report?.recommendations || "-"}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ================= YELLOW BANNER: หัวข้อการตรวจเช็ค ================= */}
        <div className="bg-[#ffff00] border-2 border-black text-center font-bold text-[13px] py-1 text-black tracking-wide my-2">
          หัวข้อการตรวจเช็ค
        </div>

        {/* ================= 1. POWER INPUT VOLTAGE ระหว่างตรวจเช็ค ================= */}
        <div className="mb-2">
          <div className="text-red-600 font-bold text-[11px] uppercase tracking-wide mb-1">
            POWER INPUT VOLTAGE ระหว่างตรวจเช็ค
          </div>
          <div className="space-y-1 text-[11px] pl-2 font-medium">
            {/* 1 Phase DC */}
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white shrink-0">
                {pInput.inputDc ? "✓" : ""}
              </span>
              <span>1 เฟส DC (+) , (-)</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[70px] text-center inline-block">
                {pInput.inputDc || "................"}
              </span>
              <span>Vdc</span>
            </div>

            {/* 1 Phase 220-230Vac L-N */}
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white shrink-0">
                {pInput.input1PhaseAc ? "✓" : ""}
              </span>
              <span>1 เฟส (220-230Vac) L-N</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[70px] text-center inline-block">
                {pInput.input1PhaseAc || "................"}
              </span>
              <span>Vac</span>
            </div>

            {/* 3 Phase 380-400Vac */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white shrink-0">
                {pInput.input3PhaseRs || pInput.input3PhaseRt || pInput.input3PhaseSt ? "✓" : ""}
              </span>
              <span>3 เฟส (380-400Vac) R-S</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pInput.input3PhaseRs || "........."}
              </span>
              <span>Vac , R-T</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pInput.input3PhaseRt || "........."}
              </span>
              <span>Vac , S-T</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pInput.input3PhaseSt || "........."}
              </span>
              <span>Vac</span>
            </div>
          </div>
        </div>

        {/* ================= 2. POWER OUTPUT VOLTAGE ระหว่างตรวจเช็ค ================= */}
        <div className="mb-2">
          <div className="text-red-600 font-bold text-[11px] uppercase tracking-wide mb-1">
            POWER OUTPUT VOLTAGE ระหว่างตรวจเช็ค
          </div>
          <div className="space-y-1 text-[11px] pl-2 font-medium">
            {/* 1 Phase Output L-N */}
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white shrink-0">
                {pOutput.output1PhaseLn ? "✓" : ""}
              </span>
              <span>1 เฟส L-N (220-230Vac)</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[70px] text-center inline-block">
                {pOutput.output1PhaseLn || "................"}
              </span>
              <span>Vac</span>
            </div>

            {/* 3 Phase Output (220-230Vac) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white shrink-0">
                {pOutput.output3Phase220Uv || pOutput.output3Phase220Uw || pOutput.output3Phase220Vw ? "✓" : ""}
              </span>
              <span>3 เฟส (220-230Vac) U-V</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pOutput.output3Phase220Uv || "........."}
              </span>
              <span>Vac , U-W</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pOutput.output3Phase220Uw || "........."}
              </span>
              <span>Vac , V-W</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pOutput.output3Phase220Vw || "........."}
              </span>
              <span>Vac</span>
            </div>

            {/* 3 Phase Output (380-400Vac) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white shrink-0">
                {pOutput.output3Phase380Uv || pOutput.output3Phase380Uw || pOutput.output3Phase380Vw ? "✓" : ""}
              </span>
              <span>3 เฟส (380-400Vac) U-V</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pOutput.output3Phase380Uv || "........."}
              </span>
              <span>Vac , U-W</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pOutput.output3Phase380Uw || "........."}
              </span>
              <span>Vac , V-W</span>
              <span className="font-mono font-bold text-black border-b border-dotted border-black min-w-[50px] text-center inline-block">
                {pOutput.output3Phase380Vw || "........."}
              </span>
              <span>Vac</span>
            </div>
          </div>
        </div>

        {/* ================= 3. ตรวจสอบสภาพ อุปกรณ์ภายในตู้ (13 รายการ) ================= */}
        <div className="mb-3">
          <div className="text-red-600 font-bold text-[11px] uppercase tracking-wide mb-1">
            ตรวจสอบสภาพ อุปกรณ์ภายในตู้
          </div>
          <div className="space-y-0.5 text-[11px] pl-2">
            {displayPanelItems.map((item: any, idx: number) => {
              const isNormal = item.status === "NORMAL";
              const isDamaged = item.status === "DAMAGED";
              const isInverterItem = item.key === "inverter" || item.name?.toUpperCase().includes("INVERTER");
              const isNA = item.status === "NOT_APPLICABLE" || (!hasInverter && isInverterItem);

              return (
                <div
                  key={item.key || idx}
                  className="flex items-center py-0.5 border-b border-dotted border-gray-300"
                >
                  <div className="w-36 font-semibold shrink-0">{item.name}</div>
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white">
                      {isNormal && !isNA ? "✓" : ""}
                    </span>
                    <span>สภาพปกติ</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold bg-white">
                      {isDamaged ? "✓" : ""}
                    </span>
                    <span className="shrink-0">ชำรุด โปรดระบุ :</span>
                    <span className="border-b border-dotted border-black flex-1 min-h-[16px] text-red-600 font-semibold px-1 text-[10.5px]">
                      {isNA
                        ? "ไม่มีในตู้นี้ (No Inverter / Soft Starter)"
                        : item.remark || ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= INVERTER & DRIVE SYSTEM FULL SECTION (WHEN HAS INVERTER) ================= */}
        {hasInverter && (
          <div className="mt-4 pt-3 border-t-2 border-black print:break-before-page">
            {/* Inverter Header Banner */}
            <div className="bg-[#ffff00] border-2 border-black text-center font-bold text-[12.5px] py-1 text-black tracking-wide mb-2">
              หัวข้อการตรวจเช็ค อินเวอร์เตอร์ / Soft Starter (Inverter & Drive System) ภายในตู้
            </div>

            {/* Inverter Spec Bar */}
            <table className="w-full border-collapse border border-black text-[11px] mb-2.5">
              <tbody>
                <tr className="bg-neutral-100">
                  <td className="border border-black p-1 font-bold w-24">Inverter ยี่ห้อ</td>
                  <td className="border border-black p-1 font-bold text-blue-900 w-1/4">
                    {diode.inverterBrand || "INVT"}
                  </td>
                  <td className="border border-black p-1 font-bold w-24">รุ่น Inverter</td>
                  <td className="border border-black p-1 font-mono font-bold text-blue-900 w-1/4">
                    {diode.inverterModel || "-"}
                  </td>
                  <td className="border border-black p-1 font-bold w-20">S/N</td>
                  <td className="border border-black p-1 font-mono text-blue-900">
                    {diode.inverterSerial || "-"} {diode.inverterKw ? `(${diode.inverterKw})` : ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 6 Checklist Items */}
            <div className="text-red-600 font-bold text-[11px] uppercase tracking-wide mb-1">
              ผลการตรวจวัดอุปกรณ์และการทำงานของ Inverter
            </div>
            <table className="w-full border-collapse border border-black text-[10.5px] mb-2.5">
              <thead>
                <tr className="bg-neutral-100 font-bold">
                  <th className="border border-black p-1 text-center w-10">ข้อ</th>
                  <th className="border border-black p-1 text-left">รายการตรวจเช็ค</th>
                  <th className="border border-black p-1 text-center w-36">ผลการตรวจเช็ค</th>
                  <th className="border border-black p-1 text-left">ค่าที่วัดได้ / รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {/* 1.1 */}
                <tr>
                  <td className="border border-black p-1 text-center font-bold">1.1</td>
                  <td className="border border-black p-1 font-medium">ตรวจเช็คไดโอด Module IGBT</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {diode.igbtStatus === "NORMAL" ? (
                      <span className="text-emerald-700">ปกติ (ใช้งานได้)</span>
                    ) : diode.igbtStatus === "ABNORMAL" ? (
                      <span className="text-red-600">ผิดปกติ (ชำรุด)</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700 font-mono text-[10px]">
                    {diode.igbtStatus === "ABNORMAL" ? "พบปัญหาที่ Module IGBT" : "ผ่านการตรวจวัดไดโอด"}
                  </td>
                </tr>
                {/* 1.2 */}
                <tr className="bg-neutral-50/60">
                  <td className="border border-black p-1 text-center font-bold">1.2</td>
                  <td className="border border-black p-1 font-medium">ตรวจสอบแต่ละเฟสถึงกันหรือไม่</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {diode.phaseShortCheck === "NORMAL" ? (
                      <span className="text-emerald-700">ปกติ (ไม่ถึงกัน)</span>
                    ) : diode.phaseShortCheck === "SHORT" ? (
                      <span className="text-red-600">ผิดปกติ (ช็อตถึงกัน)</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700 text-[10px]">
                    {diode.phaseShortCheck === "SHORT" ? "ตรวจพบเฟสลัดวงจรถึงกัน" : "ไม่พบการลัดวงจรระหว่างเฟส"}
                  </td>
                </tr>
                {/* 1.3 */}
                <tr>
                  <td className="border border-black p-1 text-center font-bold">1.3</td>
                  <td className="border border-black p-1 font-medium">ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {diode.powerBoard24VStatus === "NORMAL" ? (
                      <span className="text-emerald-700">ปกติ (มีไฟ)</span>
                    ) : diode.powerBoard24VStatus === "ABNORMAL" ? (
                      <span className="text-red-600">ผิดปกติ (ไม่มีไฟ)</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700 font-mono text-[10px]">
                    {diode.powerBoard24VValue ? `วัดได้ ${diode.powerBoard24VValue} Vdc` : "-"}
                  </td>
                </tr>
                {/* 2.1 */}
                <tr className="bg-neutral-50/60">
                  <td className="border border-black p-1 text-center font-bold">2.1</td>
                  <td className="border border-black p-1 font-medium">ตรวจเช็คไฟ 24 Vdc บอร์ดคอนโทรล (DI1/X1)</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {diode.controlBoard24VStatus === "NORMAL" ? (
                      <span className="text-emerald-700">ปกติ (มีไฟ)</span>
                    ) : diode.controlBoard24VStatus === "ABNORMAL" ? (
                      <span className="text-red-600">ผิดปกติ</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700 font-mono text-[10px]">
                    {diode.controlBoard24VValue ? `วัดได้ ${diode.controlBoard24VValue} Vdc` : "-"}
                  </td>
                </tr>
                {/* 2.2 */}
                <tr>
                  <td className="border border-black p-1 text-center font-bold">2.2</td>
                  <td className="border border-black p-1 font-medium">ตรวจเช็คไฟ 10 Vdc บอร์ดคอนโทรล (+10V)</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {diode.controlBoard10VStatus === "NORMAL" ? (
                      <span className="text-emerald-700">ปกติ (มีไฟ)</span>
                    ) : diode.controlBoard10VStatus === "ABNORMAL" ? (
                      <span className="text-red-600">ผิดปกติ</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700 font-mono text-[10px]">
                    {diode.controlBoard10VValue ? `วัดได้ ${diode.controlBoard10VValue} Vdc` : "-"}
                  </td>
                </tr>
                {/* 3 */}
                <tr className="bg-neutral-50/60">
                  <td className="border border-black p-1 text-center font-bold">3.</td>
                  <td className="border border-black p-1 font-medium">ตรวจเช็คคาปาซิเตอร์ตัวใหญ่ (Capacitor)</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {diode.capacitorStatus === "NORMAL" ? (
                      <span className="text-emerald-700">ปกติ (ไม่บวม/ไม่รั่ว)</span>
                    ) : diode.capacitorStatus === "ABNORMAL" ? (
                      <span className="text-red-600">ชำรุด (บวม/เสื่อม)</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700 text-[10px]">
                    {diode.capacitorValue || "-"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Stacked 2-Table Diode Measurement with Purple #b4a7d6 & Orange #f6b26b */}
            <div className="mb-2">
              <div className="font-bold text-[11px] text-red-600 uppercase tracking-wide mb-1">
                ผลการตรวจวัดไดโอดภายในตัวเครื่อง (Diode Measurement Drop V)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                {/* Table 1: Forward Bias (+) */}
                <div className="border border-black">
                  <div className="bg-[#b4a7d6] text-black font-bold py-1 px-2 text-center border-b border-black text-[10.5px]">
                    สายดำจับที่ (+) สายแดงจับที่ขั้ว R , S , T และ U , V , W
                  </div>
                  <table className="w-full border-collapse text-center">
                    <thead>
                      <tr className="bg-neutral-100 font-bold border-b border-black">
                        <th className="border-r border-black p-0.5 w-1/4">ขั้วต่อ</th>
                        <th className="border-r border-black p-0.5 w-1/4">ค่าที่วัดได้</th>
                        <th className="border-r border-black p-0.5 w-1/4">ขั้วต่อ</th>
                        <th className="p-0.5 w-1/4">ค่าที่วัดได้</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-0.5 font-bold bg-[#b4a7d6]/30">R</td>
                        <td className="border-r border-black p-0.5 font-mono">{diode.pos_to_r_black || "-"}</td>
                        <td className="border-r border-black p-0.5 font-bold bg-[#b4a7d6]/30">U</td>
                        <td className="p-0.5 font-mono">{diode.pos_to_u_red || "-"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-0.5 font-bold bg-[#b4a7d6]/30">S</td>
                        <td className="border-r border-black p-0.5 font-mono">{diode.pos_to_s_black || "-"}</td>
                        <td className="border-r border-black p-0.5 font-bold bg-[#b4a7d6]/30">V</td>
                        <td className="p-0.5 font-mono">{diode.pos_to_v_red || "-"}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5 font-bold bg-[#b4a7d6]/30">T</td>
                        <td className="border-r border-black p-0.5 font-mono">{diode.pos_to_t_black || "-"}</td>
                        <td className="border-r border-black p-0.5 font-bold bg-[#b4a7d6]/30">W</td>
                        <td className="p-0.5 font-mono">{diode.pos_to_w_red || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: Reverse Bias (-) */}
                <div className="border border-black">
                  <div className="bg-[#f6b26b] text-black font-bold py-1 px-2 text-center border-b border-black text-[10.5px]">
                    สายแดงจับที่ (-) สายดำจับที่ขั้ว R , S , T และ U , V , W
                  </div>
                  <table className="w-full border-collapse text-center">
                    <thead>
                      <tr className="bg-neutral-100 font-bold border-b border-black">
                        <th className="border-r border-black p-0.5 w-1/4">ขั้วต่อ</th>
                        <th className="border-r border-black p-0.5 w-1/4">ค่าที่วัดได้</th>
                        <th className="border-r border-black p-0.5 w-1/4">ขั้วต่อ</th>
                        <th className="p-0.5 w-1/4">ค่าที่วัดได้</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-0.5 font-bold bg-[#f6b26b]/30">R</td>
                        <td className="border-r border-black p-0.5 font-mono">{diode.neg_to_r_red || "-"}</td>
                        <td className="border-r border-black p-0.5 font-bold bg-[#f6b26b]/30">U</td>
                        <td className="p-0.5 font-mono">{diode.neg_to_u_black || "-"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-0.5 font-bold bg-[#f6b26b]/30">S</td>
                        <td className="border-r border-black p-0.5 font-mono">{diode.neg_to_s_red || "-"}</td>
                        <td className="border-r border-black p-0.5 font-bold bg-[#f6b26b]/30">V</td>
                        <td className="p-0.5 font-mono">{diode.neg_to_v_black || "-"}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5 font-bold bg-[#f6b26b]/30">T</td>
                        <td className="border-r border-black p-0.5 font-mono">{diode.neg_to_t_red || "-"}</td>
                        <td className="border-r border-black p-0.5 font-bold bg-[#f6b26b]/30">W</td>
                        <td className="p-0.5 font-mono">{diode.neg_to_w_black || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {diode.parameterNotes && (
              <div className="border border-black p-1.5 text-[10px] mb-2 bg-neutral-50">
                <b>บันทึกค่าพารามิเตอร์ Inverter:</b> {diode.parameterNotes}
              </div>
            )}
          </div>
        )}

        {/* ================= 8 PHOTOS ATTACHMENT ================= */}
        {hasAnyPhotos && (
          <div className="mt-4 mb-2 print:break-before-page">
            <div className="font-bold text-[12px] bg-[#d9e1f2] border border-black text-center py-1 mb-3">
              รูปสินค้า
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                [photoSlots[0], photoSlots[1]], // ด้านหน้า | ด้านซ้าย
                [photoSlots[2], photoSlots[3]], // ด้านขวา | ด้านบน
                [photoSlots[4], photoSlots[5]], // พัดลม | ด้านใน
                [photoSlots[6], photoSlots[7]], // น็อตเทอร์มินอล | เนมเพลท
              ].map((row, rIdx) => (
                <React.Fragment key={rIdx}>
                  {row.map((slot) => (
                    <div key={slot.key} className="flex flex-col items-center">
                      <div className="w-full h-44 sm:h-48 border border-black bg-white flex items-center justify-center p-1.5 overflow-hidden">
                        {slot.url ? (
                          <img
                            src={slot.url}
                            alt={slot.label}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono">
                            (ไม่มีรูปภาพ)
                          </span>
                        )}
                      </div>
                      <div className="border border-black text-center py-0.5 px-6 font-bold text-[11px] bg-white mt-1.5 min-w-[130px] max-w-[200px]">
                        {slot.label}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Section - Typed names */}
      <div className="border border-black grid grid-cols-2 text-center text-[11px] mt-4 print:break-inside-avoid">
        <div className="border-r border-black p-3 flex flex-col justify-between min-h-[90px]">
          <div className="font-bold">ผู้ทำรายงาน / ช่างผู้ตรวจเช็ค (Inspector)</div>
          <div className="my-auto py-1">
            <div className="font-bold">
              ( {report?.inspectorName || "......................................................"} )
            </div>
            <div className="text-[10.5px] mt-1 text-gray-800">วันที่ {checkDateStr}</div>
          </div>
        </div>
        <div className="p-3 flex flex-col justify-between min-h-[90px]">
          <div className="font-bold">ผู้ตรวจสอบ / หัวหน้างาน (Approved By)</div>
          <div className="my-auto py-1">
            <div className="font-bold">
              ( {report?.approvedByName || report?.reportBy || "......................................................"} )
            </div>
            <div className="text-[10.5px] mt-1 text-gray-800">
              {report?.approvedDate
                ? new Date(report.approvedDate).toLocaleDateString("th-TH")
                : "วันที่ ........ / ........ / ................"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
