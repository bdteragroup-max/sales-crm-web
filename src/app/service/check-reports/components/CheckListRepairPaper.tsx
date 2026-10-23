"use client";

import React, { useState, useEffect } from "react";
import { translateReportData } from "@/app/actions/translateReport";
import { Sparkles, Loader2 } from "lucide-react";

interface CheckListRepairPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function CheckListRepairPaper({
  report,
  lang = "TH",
  className = "",
}: CheckListRepairPaperProps) {
  const isEn = lang === "EN";

  // Auto-translate state for English checklist report
  const [translatedData, setTranslatedData] = useState<{
    causeOfFault?: string;
    symptoms?: string;
    customerName?: string;
    customerCompany?: string;
    inspectorName?: string;
    salesPerson?: string;
    approvedByName?: string;
    reportBy?: string;
    recommendations?: string;
    applicationLoad?: string;
    parameterNotes?: string;
    capacitorValue?: string;
    requireParts?: any[];
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!isEn) {
      setTranslatedData(null);
      return;
    }

    let isMounted = true;
    setIsTranslating(true);

    translateReportData({
      causeOfFault: report?.causeOfFault,
      symptoms: report?.symptoms,
      customerName: report?.customerName,
      customerCompany: report?.customerCompany,
      inspectorName: report?.inspectorName,
      salesPerson: report?.salesPerson,
      approvedByName: report?.approvedByName,
      reportBy: report?.reportBy,
      recommendations: report?.recommendations,
      applicationLoad: report?.applicationLoad,
      parameterNotes: report?.diodeMeasurement?.parameterNotes,
      capacitorValue: report?.diodeMeasurement?.capacitorValue,
      requireParts: report?.requireParts,
    })
      .then((res) => {
        if (isMounted) {
          setTranslatedData(res);
          setIsTranslating(false);
        }
      })
      .catch((err) => {
        console.error("Auto translation error in CheckListRepairPaper:", err);
        if (isMounted) setIsTranslating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    isEn,
    report?.causeOfFault,
    report?.symptoms,
    report?.customerName,
    report?.customerCompany,
    report?.inspectorName,
    report?.salesPerson,
    report?.approvedByName,
    report?.reportBy,
    report?.recommendations,
    report?.applicationLoad,
    report?.diodeMeasurement?.parameterNotes,
    report?.diodeMeasurement?.capacitorValue,
    report?.requireParts,
  ]);

  const checkDateStr = report?.checkDate
    ? new Date(report.checkDate).toLocaleDateString(isEn ? "en-GB" : "th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";

  const diode = report?.diodeMeasurement || {};
  const brandVal = (diode.inverterBrand || report?.inverterBrand || "").trim();
  const rawModelVal = (diode.inverterModel || report?.inverterModel || "").trim();
  const cleanModelVal =
    brandVal && rawModelVal.toLowerCase().startsWith(brandVal.toLowerCase())
      ? rawModelVal.slice(brandVal.length).trim()
      : rawModelVal;
  const pInput = report?.powerInputVoltage || {};
  const pOutput = report?.powerOutputVoltage || {};
  const hasPowerVoltage = Boolean(
    pInput.inputDc ||
      pInput.input1PhaseAc ||
      pInput.input3PhaseRs ||
      pOutput.output1PhaseLn ||
      pOutput.output3Phase220Uv ||
      pOutput.output3Phase380Uv
  );

  const compCode = (report?.companyCode || "TG").toUpperCase();
  const logoSrc =
    compCode === "TE"
      ? "/6.png"
      : compCode === "TP"
      ? "/7.png"
      : "/4.png";

  const companyTitle = isEn
    ? compCode === "TP"
      ? "TERA POWER CO., LTD."
      : compCode === "TE"
      ? "TERA ELECTRIC CO., LTD."
      : "TERA GROUP CO., LTD."
    : compCode === "TP"
      ? "บริษัท เทอรา พาวเวอร์ จำกัด"
      : compCode === "TE"
      ? "บริษัท เทอรา อิเล็คทริค จำกัด"
      : "บริษัท เทอรา กรุ๊ป จำกัด";

  const displayCustomer = isEn
    ? translatedData?.customerCompany ||
      translatedData?.customerName ||
      report?.customerCompany ||
      report?.customerName ||
      "-"
    : report?.customerCompany || report?.customerName || "-";

  const displayInspector = isEn
    ? translatedData?.inspectorName || report?.inspectorName || "-"
    : report?.inspectorName || "-";

  const displaySalesPerson = isEn
    ? translatedData?.salesPerson || report?.salesPerson || "-"
    : report?.salesPerson || "-";

  const displaySymptoms = isEn
    ? translatedData?.symptoms || report?.symptoms || "No symptoms specified"
    : report?.symptoms || "ไม่ระบุอาการเสีย";

  const displayCauseOfFault = isEn
    ? translatedData?.causeOfFault || report?.causeOfFault || "-"
    : report?.causeOfFault || "-";

  const displayRecommendations = isEn
    ? translatedData?.recommendations || report?.recommendations || "-"
    : report?.recommendations || "-";

  const displayParts = isEn && translatedData?.requireParts
    ? translatedData.requireParts
    : report?.requireParts || [];

  return (
    <div
      className={`check-list-repair-paper w-full max-w-[1020px] text-black text-[11px] leading-snug font-['Sarabun',sans-serif] mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      {/* SHEET 1: CHECK LIST & METER PHOTOS */}
      <div className="check-list-sheet-1 print-page-sheet bg-white border-2 border-black p-6 flex flex-col justify-between box-border min-h-[960px] shadow-sm print:border-none print:p-0 print:shadow-none print:min-h-0 print:h-auto print:block">
        <div>
          {/* Translation Banner (Screen Only) */}
          {isEn && (
            <div className="print:hidden mb-2.5">
            {isTranslating ? (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 py-1 px-3 rounded-lg">
                <Loader2 size={13} className="animate-spin" />
                <span>กำลังแปลข้อมูลภาษาอังกฤษอัตโนมัติ...</span>
              </div>
            ) : translatedData ? (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 py-0.5 px-3 rounded-lg">
                <Sparkles size={13} />
                <span>แปลข้อมูล Check List ภาษาอังกฤษอัตโนมัติเรียบร้อยแล้ว</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Header Row: Company Title & Document Number (Identical across all forms) */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 flex items-center justify-start shrink-0">
              <img
                src={logoSrc}
                alt={compCode}
                className="max-h-10 max-w-full object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-[13px]">{companyTitle}</div>
              <div className="text-[10px] text-gray-600">
                {isEn
                  ? "Inverter & Drive System Division — Check List Repair & Inspection"
                  : "ฝ่ายบริการและตรวจเช็คอินเวอร์เตอร์ — รายงานการตรวจเช็คและการซ่อม (Check List Repair)"}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono font-bold text-[12px] text-black">
              CR: {report?.crNumber || "-"}
            </div>
            {report?.convertedJobNumber && (
              <div className="text-[10px] font-bold text-gray-700 font-mono">
                Ref RO: {report.convertedJobNumber}
              </div>
            )}
          </div>
        </div>

        {/* Title Matching Screenshot 4 */}
        <div className="text-center mb-1">
          <h2 className="text-base font-bold uppercase tracking-wide">
            CHECK LIST REPAIR
          </h2>
          <div className="text-xs text-gray-700">
            {isEn ? "(Inverter Inspection Report)" : "(รายงานการตรวจเช็คอินเวอร์เตอร์)"}
          </div>
        </div>

        {/* Subtext Matching Screenshot 4 */}
        <div className="text-[11px] text-gray-800 mb-1 font-medium">
          {isEn
            ? "Please fill in the complete information in the table"
            : "กรอกข้อมูลลงในตารางให้ครบถ้วน"}
        </div>

        {/* Top Summary Table matching Screenshot 4 */}
        <table className="w-full border-collapse border border-black text-[9.5px] print:text-[8px] text-center mb-1.5 print:mb-1">
          <thead>
            <tr className="bg-neutral-100 font-bold">
              <th className="border border-black p-1 print:p-0.5 w-[14%]">
                {isEn ? "Inspection Date" : "วันที่ตรวจเช็ค"}
              </th>
              <th className="border border-black p-1 print:p-0.5 w-[22%]">
                {isEn ? "Customer Name" : "ชื่อบริษัทลูกค้า"}
              </th>
              <th className="border border-black p-1 print:p-0.5 w-[14%]">
                {isEn ? "Inverter Brand" : "Inverter ยี่ห้อ"}
              </th>
              <th className="border border-black p-1 print:p-0.5 w-[16%]">Model</th>
              <th className="border border-black p-1 print:p-0.5 w-[16%]">Serial No.</th>
              <th className="border border-black p-1 print:p-0.5 w-[9%]">
                {isEn ? "Inspector" : "ผู้ตรวจสอบ"}
              </th>
              <th className="border border-black p-1 print:p-0.5 w-[9%]">
                {isEn ? "Sales Person" : "เซลล์ผู้ดูแล"}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 print:p-0.5 font-mono">{checkDateStr}</td>
              <td className="border border-black p-1 print:p-0.5 font-medium text-left px-1.5">
                {displayCustomer}
              </td>
              <td className="border border-black p-1 print:p-0.5 font-bold uppercase">
                {brandVal || "-"}
              </td>
              <td className="border border-black p-1 print:p-0.5 font-bold font-mono">
                {cleanModelVal || "-"}
              </td>
              <td className="border border-black p-1 print:p-0.5 font-mono text-[9px] print:text-[7.5px]">
                {diode.inverterSerial || report?.serialNumber || "-"}
              </td>
              <td className="border border-black p-1 print:p-0.5">
                {displayInspector}
              </td>
              <td className="border border-black p-1 print:p-0.5">
                {displaySalesPerson}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Symptoms Row matching Screenshot 4 */}
        <div className="border border-black p-1.5 print:p-1 mb-1.5 print:mb-1 bg-white text-[10.5px] print:text-[8.5px] leading-tight">
          <span className="font-bold">
            {isEn ? "Symptoms / Fault Description: " : "อาการเสีย : "}
          </span>
          <span className="font-medium text-gray-900">
            {displaySymptoms}
          </span>
        </div>

        {/* หัวข้อการตรวจเช็ค Section Header matching Screenshot 5 */}
        <div className="font-bold text-[11px] print:text-[9.5px] bg-white border border-black text-center py-0.5 mb-1.5 print:mb-1">
          {isEn ? "INSPECTION CHECKLIST" : "หัวข้อการตรวจเช็ค"}
        </div>

        {/* 1. ตรวจเช็คพาวเวอร์บอร์ด */}
        <div className="mb-1.5 print:mb-1">
          <div className="font-bold text-[10px] print:text-[8.5px] mb-0.5">
            {isEn ? "1. Power Board Inspection" : "1. ตรวจเช็คพาวเวอร์บอร์ด"}
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-1 print:mb-0.5">
            {/* 1.1 ตรวจเช็คไดโอด Module IGBT */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[8.5px] print:text-[7.5px] mb-0.5 text-center w-full min-h-[16px] flex items-center justify-center leading-tight">
                {isEn ? "1.1 Check Diode / IGBT Module" : "1.1 ตรวจเช็คไดโอด Module IGBT"}
              </div>
              <div
                className="meter-photo-box-1 w-full border border-black bg-white flex items-center justify-center p-0.5 overflow-hidden"
                style={{ height: "90px", maxHeight: "90px" }}
              >
                {diode.meterPhotoDiode ? (
                  <img
                    src={diode.meterPhotoDiode}
                    alt="Meter 1.1 Diode IGBT"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "84px" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-1">
                    <span className="text-[8px] font-mono block">
                      {isEn ? "(No meter photo 1.1)" : "(ไม่มีรูปถ่ายมิเตอร์ 1.1)"}
                    </span>
                    <span className="text-[7.5px] text-gray-400">
                      {isEn
                        ? "Meter reading for Diode Module IGBT"
                        : "ภาพมิเตอร์วัดไดโอด Module IGBT"}
                    </span>
                  </div>
                )}
              </div>
              {/* Box matching Screenshot 5: Module IGBT ใช้งานได้ปกติ/ไม่ปกติ */}
              <div className="border border-black text-center py-0.5 px-1 font-bold text-[8.5px] print:text-[7.5px] bg-white mt-0.5 w-full leading-tight">
                {isEn ? "Module IGBT: " : "Module IGBT: "}
                {diode.igbtStatus === "NORMAL" ? (
                  <>
                    <span className="text-[#008000] font-black underline ml-1">
                      {isEn ? "Normal" : "ปกติ"}
                    </span>
                    <span className="text-gray-400 font-normal">
                      {isEn ? " / Abnormal" : "/ไม่ปกติ"}
                    </span>
                  </>
                ) : diode.igbtStatus === "ABNORMAL" ? (
                  <>
                    <span className="text-gray-400 font-normal ml-1">
                      {isEn ? "Normal / " : "ปกติ/"}
                    </span>
                    <span className="text-rose-600 font-black underline">
                      {isEn ? "Abnormal" : "ไม่ปกติ"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[#008000] font-bold ml-1">
                      {isEn ? "Normal" : "ปกติ"}
                    </span>
                    <span className="text-gray-600">
                      {isEn ? " / Abnormal" : "/ไม่ปกติ"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 1.2 ตรวจสอบแต่ละเฟสถึงกันหรือไม่ */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[8.5px] print:text-[7.5px] mb-0.5 text-center w-full min-h-[16px] flex items-center justify-center leading-tight">
                {isEn
                  ? "1.2 Check Phase Short Circuit"
                  : "1.2 ตรวจสอบแต่ละเฟสถึงกันหรือไม่"}
              </div>
              <div
                className="meter-photo-box-1 w-full border border-black bg-white flex items-center justify-center p-0.5 overflow-hidden"
                style={{ height: "90px", maxHeight: "90px" }}
              >
                {diode.meterPhotoPhase ? (
                  <img
                    src={diode.meterPhotoPhase}
                    alt="Meter 1.2 Phase Short"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "84px" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-1">
                    <span className="text-[8px] font-mono block">
                      {isEn ? "(No meter photo 1.2)" : "(ไม่มีรูปถ่ายมิเตอร์ 1.2)"}
                    </span>
                    <span className="text-[7.5px] text-gray-400">
                      {isEn
                        ? "Meter reading for Phase Short"
                        : "ภาพมิเตอร์วัดแต่ละเฟสถึงกัน"}
                    </span>
                  </div>
                )}
              </div>
              {/* Box matching Screenshot 5: เฟสถึงกัน/ไม่ถึงกัน */}
              <div className="border border-black text-center py-0.5 px-1 font-bold text-[8.5px] print:text-[7.5px] bg-white mt-0.5 w-full leading-tight">
                {diode.phaseShortCheck === "SHORT" ? (
                  <>
                    <span className="text-rose-600 font-black underline">
                      {isEn ? "Phase Shorted" : "เฟสถึงกัน"}
                    </span>
                    <span className="text-gray-400 font-normal">
                      {isEn ? " / Not Shorted" : "/ไม่ถึงกัน"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500 font-normal">
                      {isEn ? "Short / " : "เฟสถึงกัน/"}
                    </span>
                    <span className="text-[#008000] font-black underline">
                      {isEn ? "Not Shorted" : "ไม่ถึงกัน"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่ */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[8.5px] print:text-[7.5px] mb-0.5 text-center w-full min-h-[16px] flex items-center justify-center leading-tight">
                {isEn
                  ? "1.3 Check 24 Vdc Board Supply"
                  : "1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่"}
              </div>
              <div
                className="meter-photo-box-1 w-full border border-black bg-white flex items-center justify-center p-0.5 overflow-hidden"
                style={{ height: "90px", maxHeight: "90px" }}
              >
                {diode.meterPhotoPower24V ? (
                  <img
                    src={diode.meterPhotoPower24V}
                    alt="Meter 1.3 Power 24V"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "84px" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-1">
                    <span className="text-[8px] font-mono block">
                      {isEn ? "(No meter photo 1.3)" : "(ไม่มีรูปถ่ายมิเตอร์ 1.3)"}
                    </span>
                    <span className="text-[7.5px] text-gray-400">
                      {isEn
                        ? "Meter reading for 24 Vdc Board"
                        : "ภาพมิเตอร์ไฟ 24 Vdc บอร์ด"}
                    </span>
                  </div>
                )}
              </div>
              <div className="border border-black text-center py-0.5 px-1 font-bold text-[8.5px] print:text-[7.5px] bg-white mt-0.5 w-full truncate leading-tight">
                {diode.powerBoard24VStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    {isEn
                      ? `Normal (${diode.powerBoard24VValue ? `${diode.powerBoard24VValue}` : "24 Vdc"})`
                      : `ปกติ (มีไฟ ${diode.powerBoard24VValue ? `${diode.powerBoard24VValue}` : "24 Vdc"})`}
                  </span>
                ) : diode.powerBoard24VStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    {isEn ? "Abnormal (No Power)" : "ผิดปกติ (ไม่มีไฟ)"}
                  </span>
                ) : (
                  <span className="text-gray-700 font-medium">
                    {isEn
                      ? "Board 24 Vdc: Normal / Abnormal"
                      : "ไฟ 24 Vdc: มีไฟ / ไม่มีไฟ"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. ตรวจเช็คบอร์ดคอนโทรล */}
        <div className="mb-1.5 print:mb-1">
          <div className="font-bold text-[10px] print:text-[8.5px] mb-0.5">
            {isEn ? "2. Control Board Inspection" : "2. ตรวจเช็คบอร์ดคอนโทรล"}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-1 print:mb-0.5">
            {/* 2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น DI1 X1 */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[8.5px] print:text-[7.5px] mb-0.5 text-center w-full min-h-[16px] flex items-center justify-center leading-tight">
                {isEn
                  ? "2.1 Check 24 Vdc Terminals (e.g. DI1, X1)"
                  : "2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอล เช่น DI1 X1"}
              </div>
              <div
                className="meter-photo-box-2 w-full border border-black bg-white flex items-center justify-center p-0.5 overflow-hidden"
                style={{ height: "82px", maxHeight: "82px" }}
              >
                {diode.meterPhotoControl24V ? (
                  <img
                    src={diode.meterPhotoControl24V}
                    alt="Meter 2.1 Control 24V"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "76px" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-1">
                    <span className="text-[8px] font-mono block">
                      {isEn ? "(No meter photo 2.1)" : "(ไม่มีรูปถ่ายมิเตอร์ 2.1)"}
                    </span>
                    <span className="text-[7.5px] text-gray-400">
                      {isEn
                        ? "Meter reading for 24 Vdc Terminal"
                        : "ภาพมิเตอร์ไฟ 24 Vdc เทอร์มินอล"}
                    </span>
                  </div>
                )}
              </div>
              <div className="border border-black text-center py-0.5 px-1 font-bold text-[8.5px] print:text-[7.5px] bg-white mt-0.5 w-full truncate leading-tight">
                {diode.controlBoard24VStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    {isEn
                      ? `Normal (${diode.controlBoard24VValue ? `${diode.controlBoard24VValue}` : "24 Vdc"})`
                      : `ปกติ (มีไฟ ${diode.controlBoard24VValue ? `${diode.controlBoard24VValue}` : "24 Vdc"})`}
                  </span>
                ) : diode.controlBoard24VStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    {isEn ? "Abnormal (No Power)" : "ผิดปกติ (ไม่มีไฟ)"}
                  </span>
                ) : (
                  <span className="text-gray-700 font-medium">
                    {isEn
                      ? "Terminal 24 Vdc: Normal / Abnormal"
                      : "ไฟ 24 Vdc: มีไฟ / ไม่มีไฟ"}
                  </span>
                )}
              </div>
            </div>

            {/* 2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น +10V เทียบ GND */}
            <div className="flex flex-col items-center">
              <div className="font-bold text-[8.5px] print:text-[7.5px] mb-0.5 text-center w-full min-h-[16px] flex items-center justify-center leading-tight">
                {isEn
                  ? "2.2 Check 10 Vdc Terminals (e.g. +10V to GND)"
                  : "2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอล เช่น +10V เทียบ GND"}
              </div>
              <div
                className="meter-photo-box-2 w-full border border-black bg-white flex items-center justify-center p-0.5 overflow-hidden"
                style={{ height: "82px", maxHeight: "82px" }}
              >
                {diode.meterPhotoControl10V ? (
                  <img
                    src={diode.meterPhotoControl10V}
                    alt="Meter 2.2 Control 10V"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "76px" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-1">
                    <span className="text-[8px] font-mono block">
                      {isEn ? "(No meter photo 2.2)" : "(ไม่มีรูปถ่ายมิเตอร์ 2.2)"}
                    </span>
                    <span className="text-[7.5px] text-gray-400">
                      {isEn
                        ? "Meter reading for 10 Vdc (+10V-GND)"
                        : "ภาพมิเตอร์ไฟ 10 Vdc (+10V-GND)"}
                    </span>
                  </div>
                )}
              </div>
              <div className="border border-black text-center py-0.5 px-1 font-bold text-[8.5px] print:text-[7.5px] bg-white mt-0.5 w-full truncate leading-tight">
                {diode.controlBoard10VStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    {isEn
                      ? `Normal (${diode.controlBoard10VValue ? `${diode.controlBoard10VValue}` : "10 Vdc"})`
                      : `ปกติ (มีไฟ ${diode.controlBoard10VValue ? `${diode.controlBoard10VValue}` : "10 Vdc"})`}
                  </span>
                ) : diode.controlBoard10VStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    {isEn ? "Abnormal (No Power)" : "ผิดปกติ (ไม่มีไฟ)"}
                  </span>
                ) : (
                  <span className="text-gray-700 font-medium">
                    {isEn
                      ? "Terminal 10 Vdc: Normal / Abnormal"
                      : "ไฟ 10 Vdc: มีไฟ / ไม่มีไฟ"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่ */}
        <div className="mb-1.5 print:mb-1">
          <div className="font-bold text-[10px] print:text-[8.5px] mb-0.5">
            {isEn
              ? "3. Main DC Bus Capacitor Inspection"
              : "3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่"}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-1 print:mb-0.5">
            <div className="border border-black p-1 bg-white flex flex-col justify-between">
              <div className="space-y-0.5 text-[8.5px] print:text-[7.5px] leading-tight">
                <div>
                  <span className="font-bold">
                    {isEn ? "Capacitor Condition: " : "สภาพคาปาซิเตอร์: "}
                  </span>
                  {diode.capacitorStatus === "NORMAL" ? (
                    <span className="font-bold text-[#008000]">
                      {isEn ? "Normal (No bulging / No leakage)" : "ปกติ (ไม่บวม / ไม่รั่วซึม)"}
                    </span>
                  ) : diode.capacitorStatus === "ABNORMAL" ? (
                    <span className="font-bold text-rose-600">
                      {isEn
                        ? "Abnormal (Bulging / Leaking / Degraded)"
                        : "ผิดปกติ (บวม / รั่วซึม / เสื่อมสภาพ)"}
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      {isEn ? "Not specified" : "ยังไม่ได้ระบุ"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-bold">
                    {isEn ? "Capacitance / Details: " : "ค่าความจุ / รายละเอียด: "}
                  </span>
                  <span>
                    {isEn
                      ? translatedData?.capacitorValue ||
                        (diode.capacitorValue
                          ? diode.capacitorValue
                          : "Good condition, no electrolyte leakage or bulging")
                      : diode.capacitorValue || "สภาพสมบูรณ์ ไม่พบคราบน้ำยาหรือรอยบวม"}
                  </span>
                </div>
              </div>
              <div className="border border-black text-center py-0.5 px-2 font-bold text-[8.5px] print:text-[7.5px] bg-white mt-0.5 leading-tight">
                {isEn ? "Main Capacitor: " : "คาปาซิเตอร์ตัวใหญ่: "}
                {diode.capacitorStatus === "NORMAL" ? (
                  <span className="text-[#008000] font-black underline">
                    {isEn ? "Normal" : "ปกติ"}
                  </span>
                ) : diode.capacitorStatus === "ABNORMAL" ? (
                  <span className="text-rose-600 font-black underline">
                    {isEn ? "Abnormal" : "ไม่ปกติ"}
                  </span>
                ) : (
                  <span className="text-gray-600 font-normal">
                    {isEn ? "Normal / Abnormal" : "ปกติ / ไม่ปกติ"}
                  </span>
                )}
              </div>
            </div>

            <div
              className="capacitor-photo-box w-full border border-black bg-white flex items-center justify-center p-0.5 overflow-hidden"
              style={{ height: "70px", maxHeight: "70px" }}
            >
              {diode.photoCapacitor ? (
                <img
                  src={diode.photoCapacitor}
                  alt="3. Capacitors"
                  className="max-h-full max-w-full object-contain"
                  style={{ maxHeight: "64px" }}
                />
              ) : (
                <div className="text-center text-gray-400 p-1">
                  <span className="text-[8px] font-mono block">
                    {isEn ? "(No capacitor photo 3)" : "(ไม่มีรูปถ่ายคาปาซิเตอร์ 3)"}
                  </span>
                  <span className="text-[7.5px] text-gray-400">
                    {isEn
                      ? "Main DC Bus Capacitor Photo"
                      : "ภาพคาปาซิเตอร์ตัวใหญ่ DC Bus"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. ทำการบันทึกค่าพารามิเตอร์(ให้พิมพ์เอา) */}
        <div className="mb-1 print:mb-0.5">
          <div className="font-bold text-[10px] print:text-[8.5px] mb-0.5">
            {isEn
              ? "4. Parameter Backup / Settings Record"
              : "4. ทำการบันทึกค่าพารามิเตอร์(ให้พิมพ์เอา)"}
          </div>
          <div className="border border-black p-1 bg-white min-h-[22px] font-mono text-[9px] print:text-[8px] whitespace-pre-wrap leading-tight">
            {isEn ? (
              translatedData?.parameterNotes || diode.parameterNotes ? (
                translatedData?.parameterNotes || diode.parameterNotes
              ) : (
                <span className="text-gray-400 font-sans italic">
                  - No parameters specified / backed up -
                </span>
              )
            ) : diode.parameterNotes ? (
              diode.parameterNotes
            ) : (
              <span className="text-gray-400 font-sans italic">
                - ไม่ได้ระบุหรือสำรองค่าพารามิเตอร์ -
              </span>
            )}
          </div>
        </div>

        {/* Footer for Sheet 1 */}
        <div className="border-t border-gray-300 pt-0.5 text-[8.5px] print:text-[7.5px] text-gray-500 flex justify-between items-center mt-1">
          <span>{companyTitle} — Service & Quality Control</span>
          <span>
            {isEn
              ? "Inverter Inspection & Checklist (Sheet 1/2)"
              : "เอกสารตรวจเช็คอินเวอร์เตอร์และภาพมิเตอร์ (แผ่นที่ 1/2)"}
          </span>
        </div>
      </div>
    </div>
    {/* End of Sheet 1 */}

      {/* ================= SHEET 2: ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์ (Screenshot 3) ================= */}
      <div className="check-list-sheet-2 print-page-sheet bg-white border-2 border-black p-6 flex flex-col justify-between box-border min-h-[960px] shadow-sm mt-6 pt-4 print:border-none print:p-0 print:shadow-none print:min-h-0 print:h-auto print:mt-0 print:pt-0 print:block">
        <div>
          {/* Header Row for Sheet 2 */}
          <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-20 flex items-center justify-start shrink-0">
                <img
                  src={logoSrc}
                  alt={compCode}
                  className="max-h-8 max-w-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-[12px]">{companyTitle}</div>
                <div className="text-[9.5px] text-gray-600">
                  {isEn
                    ? "Inverter & Drive System Division — Internal Diode & IGBT Inspection"
                    : "ฝ่ายบริการและตรวจเช็คอินเวอร์เตอร์ — ผลการตรวจวัดไดโอดและไอจีบีที"}
                </div>
              </div>
            </div>

            <div className="text-right text-[10px]">
              <div className="font-mono font-bold text-[11px] text-black">
                CR: {report?.crNumber || "-"}
              </div>
              <div className="text-[9px] text-gray-600">
                {brandVal} {cleanModelVal}
              </div>
            </div>
          </div>

          <div className="text-center font-bold text-[12px] mb-1.5">
            {isEn
              ? "Inverter Internal Diode & IGBT Measurement Results"
              : "ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์"}
          </div>

          {/* TABLE 1: ขั้ว (+) Matching Top Table in Screenshot 3 */}
          <table className="w-full border-collapse border-2 border-black text-[9.5px] text-center mb-2">
            <thead>
              <tr className="border-b border-black">
                {/* Left Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  {isEn ? "Probe (-) Black" : "สายมิเตอร์ลบ (ดำ)"}
                </th>
                <th className="border-r-2 border-black p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  {isEn ? "Probe (+) Red" : "สายมิเตอร์บวก (แดง)"}
                </th>
                {/* Right Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  {isEn ? "Probe (+) Red" : "สายมิเตอร์บวก (แดง)"}
                </th>
                <th className="p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  {isEn ? "Probe (-) Black" : "สายมิเตอร์ลบ (ดำ)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: R & U */}
              <tr className="border-b border-black">
                {/* Left (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_r_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="border-r-2 border-black font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_u_red || "-"}
                </td>

                {/* Right (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_r_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="font-mono p-1 w-[11%] bg-white">
                  {diode.pos_to_u_black || "-"}
                </td>
              </tr>

              {/* Row 2: S & V */}
              <tr className="border-b border-black">
                {/* Left (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_s_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.pos_to_v_red || "-"}
                </td>

                {/* Right (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_s_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.pos_to_v_black || "-"}
                </td>
              </tr>

              {/* Row 3: T & W */}
              <tr>
                {/* Left (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_t_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.pos_to_w_red || "-"}
                </td>

                {/* Right (+) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  +
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.pos_to_t_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.pos_to_w_black || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLE 2: ขั้ว (-) Matching Bottom Table in Screenshot 3 */}
          <table className="w-full border-collapse border-2 border-black text-[9.5px] text-center mb-2">
            <thead>
              <tr className="border-b border-black">
                {/* Left Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  {isEn ? "Probe (+) Red" : "สายมิเตอร์บวก (แดง)"}
                </th>
                <th className="border-r-2 border-black p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  {isEn ? "Probe (-) Black" : "สายมิเตอร์ลบ (ดำ)"}
                </th>
                {/* Right Header */}
                <th className="border-r border-black p-1 font-bold w-[12%] bg-white" rowSpan={1}>
                  {isEn ? "Probe (-) Black" : "สายมิเตอร์ลบ (ดำ)"}
                </th>
                <th className="p-1 font-bold w-[38%] bg-white" colSpan={4}>
                  {isEn ? "Probe (+) Red" : "สายมิเตอร์บวก (แดง)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: R & U */}
              <tr className="border-b border-black">
                {/* Left (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_r_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="border-r-2 border-black font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_u_black || "-"}
                </td>

                {/* Right (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#b4a7d6]">
                  R
                </td>
                <td className="border-r border-black font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_r_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 w-[8%] bg-[#f6b26b]">
                  U
                </td>
                <td className="font-mono p-1 w-[11%] bg-white">
                  {diode.neg_to_u_red || "-"}
                </td>
              </tr>

              {/* Row 2: S & V */}
              <tr className="border-b border-black">
                {/* Left (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_s_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.neg_to_v_black || "-"}
                </td>

                {/* Right (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  S
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_s_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  V
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.neg_to_v_red || "-"}
                </td>
              </tr>

              {/* Row 3: T & W */}
              <tr>
                {/* Left (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_t_red || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="border-r-2 border-black font-mono p-1 bg-white">
                  {diode.neg_to_w_black || "-"}
                </td>

                {/* Right (-) */}
                <td className="border-r border-black font-bold text-center text-xs bg-white">
                  -
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#b4a7d6]">
                  T
                </td>
                <td className="border-r border-black font-mono p-1 bg-white">
                  {diode.neg_to_t_black || "-"}
                </td>
                <td className="border-r border-black font-bold p-1 bg-[#f6b26b]">
                  W
                </td>
                <td className="font-mono p-1 bg-white">
                  {diode.neg_to_w_red || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* POWER VOLTAGE SECTION (ถ้ามีค่าหรือบันทึกหลัง QC) */}
          {hasPowerVoltage && (
            <div className="mb-2">
              <div className="font-bold text-[10.5px] mb-0.5">
                {isEn
                  ? "Power Voltage Measurement (Post-QC Test)"
                  : "การตรวจวัดแรงดันไฟฟ้า (Power Voltage Measurement - หลัง QC ทดสอบเครื่อง)"}
              </div>
              <table className="w-full border-collapse border border-black text-[9.5px] mb-1.5">
                <tbody>
                  <tr className="bg-neutral-100">
                    <td className="border border-black p-1 font-bold" colSpan={2}>
                      {isEn
                        ? "POWER INPUT VOLTAGE (Pre/During Installation)"
                        : "POWER INPUT VOLTAGE (ก่อน/ระหว่างติดตั้ง)"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 w-1/2">
                      {isEn ? "1 Phase DC (+) , (-) :" : "1 เฟส DC (+) , (-) :"} <b>{pInput.inputDc ? `${pInput.inputDc} Vdc` : "-"}</b>
                    </td>
                    <td className="border border-black p-1 w-1/2">
                      {isEn ? "1 Phase (220-230Vac) L-N :" : "1 เฟส (220-230Vac) L-N :"} <b>{pInput.input1PhaseAc ? `${pInput.input1PhaseAc} Vac` : "-"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1" colSpan={2}>
                      {isEn ? "3 Phase (380-400Vac) R-S :" : "3 เฟส (380-400Vac) R-S :"} <b>{pInput.input3PhaseRs ? `${pInput.input3PhaseRs} Vac` : "-"}</b> , 
                      R-T : <b>{pInput.input3PhaseRt ? `${pInput.input3PhaseRt} Vac` : "-"}</b> , 
                      S-T : <b>{pInput.input3PhaseSt ? `${pInput.input3PhaseSt} Vac` : "-"}</b>
                    </td>
                  </tr>
                  <tr className="bg-neutral-100">
                    <td className="border border-black p-1 font-bold" colSpan={2}>
                      {isEn
                        ? "POWER OUTPUT VOLTAGE (During Inspection)"
                        : "POWER OUTPUT VOLTAGE (ระหว่างตรวจเช็ค)"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1">
                      {isEn ? "1 Phase L-N (220-230Vac) :" : "1 เฟส L-N (220-230Vac) :"} <b>{pOutput.output1PhaseLn ? `${pOutput.output1PhaseLn} Vac` : "-"}</b>
                    </td>
                    <td className="border border-black p-1">
                      {isEn ? "3 Phase (220-230Vac) U-V:" : "3 เฟส (220-230Vac) U-V:"} <b>{pOutput.output3Phase220Uv || "-"}</b>, U-W: <b>{pOutput.output3Phase220Uw || "-"}</b>, V-W: <b>{pOutput.output3Phase220Vw || "-"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1" colSpan={2}>
                      {isEn ? "3 Phase (380-400Vac) U-V :" : "3 เฟส (380-400Vac) U-V :"} <b>{pOutput.output3Phase380Uv ? `${pOutput.output3Phase380Uv} Vac` : "-"}</b> , 
                      U-W : <b>{pOutput.output3Phase380Uw ? `${pOutput.output3Phase380Uw} Vac` : "-"}</b> , 
                      V-W : <b>{pOutput.output3Phase380Vw ? `${pOutput.output3Phase380Vw} Vac` : "-"}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Findings & Required Parts */}
          <div className="mb-2 border border-black p-1.5 text-[9.5px] space-y-0.5 bg-white">
            <div>
              <span className="font-bold">
                {isEn ? "Cause of Fault / Diagnosis: " : "สาเหตุความเสียหาย / ข้อวินิจฉัย: "}
              </span>
              <span>{displayCauseOfFault}</span>
            </div>
            <div>
              <span className="font-bold">
                {isEn ? "Recommendations / Corrective Action: " : "ข้อเสนอแนะในการซ่อมแซม: "}
              </span>
              <span>{displayRecommendations}</span>
            </div>
            <div>
              <span className="font-bold">
                {isEn ? "Damaged Parts & Required Replacement: " : "อะไหล่ที่ต้องเปลี่ยน: "}
              </span>
              <span>
                {Array.isArray(displayParts) && displayParts.length > 0
                  ? displayParts
                      .map((p: any) => `${p.partName || "-"} (${p.qty || 1} ${isEn ? "pcs" : "ชิ้น"})`)
                      .join(", ")
                  : isEn ? "None / Board-level repair" : "ไม่มี / ซ่อมระดับบอร์ด"}
              </span>
            </div>
          </div>

          {/* Signature Block matching company standard */}
          <div className="border-2 border-black grid grid-cols-2 text-center text-[10px] mt-2 mb-1 print:break-inside-avoid">
            <div className="border-r-2 border-black p-1.5 flex flex-col justify-between min-h-[64px]">
              <div className="font-bold text-[10px]">
                {isEn ? "Inspected By (Technician)" : "ผู้ทำรายงาน / ช่างผู้ตรวจเช็ค"}
              </div>
              <div className="my-auto py-0.5">
                <div className="font-bold text-[10.5px]">
                  ( {displayInspector} )
                </div>
                <div className="text-[9px] mt-0.5 text-gray-700">
                  {isEn ? "Date: " : "วันที่ "}
                  {checkDateStr}
                </div>
              </div>
            </div>

            <div className="p-1.5 flex flex-col justify-between min-h-[64px]">
              <div className="font-bold text-[10px]">
                {isEn ? "Approved By (Engineer / Supervisor)" : "ผู้ตรวจสอบ / หัวหน้างาน"}
              </div>
              <div className="my-auto py-0.5">
                <div className="font-bold text-[10.5px]">
                  ( {report?.approvedByName || (isEn ? "Authorized Signer" : "ผู้มีอำนาจลงนาม")} )
                </div>
                <div className="text-[9px] mt-0.5 text-gray-700">
                  {isEn ? "Date: " : "วันที่ "}
                  {checkDateStr}
                </div>
              </div>
            </div>
          </div>

          {/* Footer info Sheet 2 */}
          <div className="border-t border-gray-300 pt-1 text-[9px] print:text-[8px] text-gray-500 flex justify-between items-center">
            <span>{companyTitle} — Service & Quality Control</span>
            <span>
              {isEn
                ? "Inverter Diode & IGBT Inspection (Sheet 2/2)"
                : "ผลการตรวจวัดไดโอดภายในเครื่องอินเวอร์เตอร์ (แผ่นที่ 2/2)"}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Scoped Print Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .check-list-repair-paper {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-sizing: border-box !important;
            display: block !important;
          }
          .check-list-sheet-1,
          .check-list-sheet-2 {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            display: block !important;
          }
          .meter-photo-box-1 {
            height: 75px !important;
            max-height: 75px !important;
            overflow: hidden !important;
          }
          .meter-photo-box-1 img {
            max-height: 70px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          .meter-photo-box-2 {
            height: 68px !important;
            max-height: 68px !important;
            overflow: hidden !important;
          }
          .meter-photo-box-2 img {
            max-height: 62px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          .capacitor-photo-box {
            height: 62px !important;
            max-height: 62px !important;
            overflow: hidden !important;
          }
          .capacitor-photo-box img {
            max-height: 56px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
