"use client";

import React, { useState, useEffect } from "react";
import { translateReportData } from "@/app/actions/translateReport";
import { Sparkles, Loader2 } from "lucide-react";
import { EQUIPMENT_TYPE_CONFIG, STATUS_CONFIG } from "../lib/crConstants";

interface CheckReportClaimPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function CheckReportClaimPaper({
  report,
  lang = "TH",
  className = "",
}: CheckReportClaimPaperProps) {
  const isEn = lang === "EN";

  // Auto-translate state for English report
  const [translatedData, setTranslatedData] = useState<{
    causeOfFault?: string;
    symptoms?: string;
    customerName?: string;
    customerCompany?: string;
    inspectorName?: string;
    approvedByName?: string;
    reportBy?: string;
    salesPerson?: string;
    recommendations?: string;
    applicationLoad?: string;
    requireParts?: any[];
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [printedDateStr, setPrintedDateStr] = useState<string>("");

  useEffect(() => {
    setPrintedDateStr(new Date().toLocaleString(isEn ? "en-GB" : "th-TH"));
  }, [isEn]);

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
      approvedByName: report?.approvedByName,
      reportBy: report?.reportBy,
      salesPerson: report?.salesPerson,
      recommendations: report?.recommendations,
      applicationLoad: report?.applicationLoad,
      requireParts: report?.requireParts,
    })
      .then((res) => {
        if (isMounted) {
          setTranslatedData(res);
          setIsTranslating(false);
        }
      })
      .catch((err) => {
        console.error("Auto translation error:", err);
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
    report?.approvedByName,
    report?.reportBy,
    report?.salesPerson,
    report?.recommendations,
    report?.applicationLoad,
    report?.requireParts,
  ]);

  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;
  const isInverter = eqType === "INVERTER";
  const isPump = eqType === "PUMP";
  const isMotor = eqType === "MOTOR";
  const isCabinet = eqType === "CONTROL_CABINET";

  const compCode = (report?.companyCode || "TG").toUpperCase();
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

  const checkDateStr = report?.checkDate
    ? new Date(report.checkDate).toLocaleDateString(isEn ? "en-GB" : "th-TH", {
        year: "numeric",
        month: isEn ? "short" : "long",
        day: "numeric",
      })
    : "-";

  const displayCustomerCompany = isEn
    ? translatedData?.customerCompany || report?.customerCompany || "-"
    : report?.customerCompany || "-";

  const displayCustomerName = isEn
    ? translatedData?.customerName || report?.customerName || "-"
    : report?.customerName || "-";

  const displaySymptoms = isEn
    ? translatedData?.symptoms || report?.symptoms || "ไม่ได้ระบุอาการเสีย"
    : report?.symptoms || "ไม่ได้ระบุอาการเสีย";

  const displayCauseOfFault = isEn
    ? translatedData?.causeOfFault || report?.causeOfFault || "-"
    : report?.causeOfFault || "-";

  const displayRecommendations = isEn
    ? translatedData?.recommendations || report?.recommendations || "-"
    : report?.recommendations || "-";

  const displayInspector = isEn
    ? translatedData?.inspectorName || report?.inspectorName || report?.reportBy || "-"
    : report?.inspectorName || report?.reportBy || "-";

  const displaySales = isEn
    ? translatedData?.salesPerson || report?.salesPerson || "-"
    : report?.salesPerson || "-";

  const displayAppLoad = isEn
    ? translatedData?.applicationLoad || report?.applicationLoad || "-"
    : report?.applicationLoad || "-";

  const displayParts: any[] = isEn
    ? translatedData?.requireParts || report?.requireParts || []
    : report?.requireParts || [];

  // Measurements & technical info
  const diode = report?.diodeMeasurement || {};
  const motor = report?.motorMeasurement || {};
  const pInput = report?.powerInputVoltage || {};
  const pOutput = report?.powerOutputVoltage || {};

  // Photos
  const photos = report?.photos || {};
  const nameplatePhoto =
    photos.nameplate?.[0] ||
    (Array.isArray(photos) ? photos.find((p: string) => typeof p === "string" && p.includes("nameplate")) : null);

  // Collect defect / damage photos ONLY (รูปจุดชำรุดเสียหาย สำหรับส่งลูกค้า)
  const candidateDefectPhotos: string[] = [];
  const addPhoto = (url: any) => {
    if (url && typeof url === "string" && !candidateDefectPhotos.includes(url) && url !== nameplatePhoto) {
      candidateDefectPhotos.push(url);
    }
  };

  // Only damage photos (จุดชำรุดเสียหาย)
  if (Array.isArray(photos.damage)) {
    photos.damage.forEach(addPhoto);
  } else if (photos.damage) {
    addPhoto(photos.damage);
  }

  // Fallback: If photos is a flat array, extract items related to damage
  if (candidateDefectPhotos.length === 0 && Array.isArray(photos)) {
    photos
      .filter((p: any) => typeof p === "string" && p.toLowerCase().includes("damage"))
      .forEach(addPhoto);
  }

  const defectPhotos = candidateDefectPhotos.slice(0, 4);

  const totalPhotoCount = Object.values(photos).reduce(
    (acc: number, val: any) => acc + (Array.isArray(val) ? val.filter(Boolean).length : val ? 1 : 0),
    0
  );

  // Warranty status
  const rawWarranty = String(report?.warrantyStatus || "").trim().toUpperCase();
  const isWarrantyValid =
    rawWarranty === "IN_WARRANTY" ||
    rawWarranty === "VALID" ||
    report?.warrantyStatus === "รับประกัน" ||
    report?.warrantyStatus === "อยู่ในประกัน";

  const isWarrantyExpired =
    rawWarranty === "OUT_OF_WARRANTY" ||
    rawWarranty === "EXPIRED" ||
    report?.warrantyStatus === "หมดประกัน" ||
    report?.warrantyStatus === "นอกประกัน";

  const isWarrantyPending = !isWarrantyValid && !isWarrantyExpired;

  // Equipment Label
  const equipmentLabel = isEn ? eqConfig.labelEn : eqConfig.label;

  return (
    <div
      className={`check-report-claim-paper print-page-sheet bg-white border-2 border-black text-black font-['Sarabun',sans-serif] text-[12px] leading-tight max-w-[794px] mx-auto p-6 box-border min-h-[960px] shadow-sm print:border-none print:p-0 print:shadow-none print:min-h-0 print:h-auto print:max-w-none print:w-full ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      {/* ───────────────────────────────────────────────────────────
          1. HEADER WITH COMPANY LOGOS & ADDRESS
      ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/4.png" alt="Tera Group" className="h-10 object-contain" />
          <img src="/6.png" alt="Tera Electric" className="h-10 object-contain" />
          <img src="/7.png" alt="Tera Power" className="h-10 object-contain" />
          <div className="border-l-2 border-slate-300 pl-3 ml-1">
            <div className="text-[13px] font-bold text-black tracking-tight leading-tight">
              {companyTitle}
            </div>
            <div className="text-[10px] text-slate-600 font-semibold tracking-tight">
              Tera Group Co., Ltd.
            </div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">
              {isEn
                ? isPump
                  ? "Water Pump Inspection & Service Division"
                  : isMotor
                  ? "Electric Motor Inspection & Service Division"
                  : "Customer Service & Technical Support Division"
                : isPump
                ? "ฝ่ายบริการและตรวจเช็คปั๊มน้ำ (Water Pump Service Division)"
                : isMotor
                ? "ฝ่ายบริการและตรวจเช็คมอเตอร์ไฟฟ้า (Motor Service Division)"
                : "ฝ่ายบริการและซ่อมบำรุง (Customer Service & Technical Support)"}
            </div>
          </div>
        </div>

        {/* Document Number Box */}
        <div className="text-right">
          <table className="border-collapse border border-black text-[11px] ml-auto">
            <tbody>
              <tr>
                <td className="bg-neutral-100 font-bold px-2.5 py-1 border border-black text-right whitespace-nowrap">
                  {isEn ? "CR Number" : "เลขที่รายงาน (CR No.)"}
                </td>
                <td className="font-mono font-bold text-red-700 px-3 py-1 border border-black text-left whitespace-nowrap">
                  {report?.crNumber || "-"}
                </td>
              </tr>
              <tr>
                <td className="bg-neutral-100 font-bold px-2.5 py-1 border border-black text-right whitespace-nowrap">
                  {isEn ? "Date" : "วันที่ตรวจเช็ค (Date)"}
                </td>
                <td className="px-3 py-1 border border-black text-left whitespace-nowrap" suppressHydrationWarning>
                  {checkDateStr}
                </td>
              </tr>
              <tr>
                <td className="bg-neutral-100 font-bold px-2.5 py-1 border border-black text-right whitespace-nowrap">
                  {isEn ? "Inspector" : "ผู้ตรวจเช็ค (Inspector)"}
                </td>
                <td className="px-3 py-1 border border-black text-left whitespace-nowrap font-medium text-slate-900">
                  {displayInspector}
                </td>
              </tr>
              {report?.convertedJobNumber && (
                <tr>
                  <td className="bg-neutral-100 font-bold px-2.5 py-1 border border-black text-right whitespace-nowrap">
                    {isEn ? "Ref RO" : "อ้างอิงใบรับซ่อม (RO)"}
                  </td>
                  <td className="font-mono font-bold text-blue-700 px-3 py-1 border border-black text-left whitespace-nowrap">
                    {report.convertedJobNumber}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          2. DOCUMENT TITLE BANNER
      ─────────────────────────────────────────────────────────── */}
      <div className="text-center my-3 py-1.5 bg-neutral-100 border border-black">
        <h1 className="text-[15px] font-bold tracking-wide uppercase text-black m-0">
          {isEn
            ? "SERVICE CLAIM & INSPECTION REPORT"
            : "ใบแจ้งเคลมและรายงานตรวจเช็คสินค้า (Service Claim & Inspection Report)"}
        </h1>
        <div className="text-[10px] text-slate-600 font-medium">
          {isEn
            ? `Official Inspection, Fault Diagnosis & Warranty Claim Assessment Form (${equipmentLabel})`
            : `แบบฟอร์มบันทึกผลการตรวจสอบ วิเคราะห์สาเหตุความเสียหาย และแจ้งเคลม/ส่งซ่อม (${equipmentLabel})`}
        </div>

        {/* Translation status badge (hidden in print) */}
        {isEn && (
          <div className="mt-1 print:hidden flex items-center justify-center">
            {isTranslating ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                Translating report data into English...
              </span>
            ) : translatedData ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                English translation ready
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          3. SECTION 1: ข้อมูลลูกค้า / ผู้ส่งเครื่อง & การรับประกัน
      ─────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>
            {isEn
              ? "1. Customer & Warranty Information"
              : "1. ข้อมูลลูกค้า / ผู้ส่งเครื่อง และการรับประกัน (Customer & Warranty Details)"}
          </span>
          <span className="text-[10px] font-normal opacity-90">
            {isEn ? "Source Information" : "ข้อมูลต้นทาง"}
          </span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                {isEn ? "Customer / Company" : "ชื่อบริษัท / ลูกค้า"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                {displayCustomerCompany !== "-"
                  ? displayCustomerCompany
                  : displayCustomerName !== "-"
                  ? displayCustomerName
                  : "-"}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                {isEn ? "Warranty Status" : "สถานะการรับประกัน"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold bg-white">
                      {isWarrantyValid ? "✓" : ""}
                    </span>
                    <span>{isEn ? "In Warranty" : "อยู่ในประกัน"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold bg-white">
                      {isWarrantyExpired ? "✓" : ""}
                    </span>
                    <span className={isWarrantyExpired ? "text-red-700" : ""}>
                      {isEn ? "Out of Warranty" : "หมดประกัน"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold bg-white">
                      {isWarrantyPending ? "✓" : ""}
                    </span>
                    <span className="text-gray-600">{isEn ? "Pending" : "รอตรวจสอบ"}</span>
                  </span>
                </span>
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Contact Person" : "ผู้ติดต่อ / ผู้ส่งเครื่อง"}
              </td>
              <td className="px-2.5 py-1.5 border border-black">
                {displayCustomerName !== "-" ? displayCustomerName : displayCustomerCompany}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Contact Phone" : "เบอร์โทรศัพท์ / ติดต่อ"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-mono">
                {report?.customerPhone || "-"}
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Site / Address" : "สถานที่ / ที่อยู่ลูกค้า"}
              </td>
              <td className="px-2.5 py-1.5 border border-black" colSpan={3}>
                <div className="flex items-center justify-between">
                  <span>{report?.customerAddress || "-"}</span>
                  {displaySales !== "-" && (
                    <span className="text-[10px] text-gray-600 font-medium">
                      {isEn ? "Sales In Charge: " : "เซลล์ผู้ดูแล: "}
                      <b className="text-gray-900 font-bold">{displaySales}</b>
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ───────────────────────────────────────────────────────────
          4. SECTION 2: ข้อมูลสินค้าและอุปกรณ์ (Equipment Specifications)
      ─────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>
            {isEn
              ? "2. Equipment & Product Details"
              : "2. ข้อมูลสินค้าและหมายเลขเครื่อง (Product & Equipment Details)"}
          </span>
          <span className="text-[10px] font-normal opacity-90">
            {isEn ? "Equipment Specs" : "ข้อมูลสเปกสินค้า"}
          </span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                {isEn ? "Equipment Type" : "ประเภทอุปกรณ์"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                {equipmentLabel}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                {isEn ? "Brand" : isPump ? "ยี่ห้อปั๊มน้ำ (Brand)" : isMotor ? "ยี่ห้อมอเตอร์ (Brand)" : isCabinet ? "แบรนด์ / ผู้ประกอบตู้" : "ยี่ห้อ (Brand)"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                {report?.inverterBrand || diode.inverterBrand || "-"}
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Model" : isPump ? "รุ่นปั๊มน้ำ (Model)" : isMotor ? "รุ่นมอเตอร์ (Model)" : isCabinet ? "รุ่นตู้ / รหัสตู้ (Model)" : "รุ่นสินค้า (Model)"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-mono font-bold text-[12px] text-slate-900">
                <div>{report?.inverterModel || diode.inverterModel || "-"}</div>
                {isCabinet && report?.hasInverterInCabinet && diode?.inverterModel && (
                  <div className="text-[9.5px] text-blue-700 font-normal font-sans mt-0.5">
                    (Inverter ในตู้: {diode.inverterBrand || "INVT"} {diode.inverterModel})
                  </div>
                )}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Serial Number (S/N)" : isCabinet ? "Cabinet ID / S/N ตู้" : "Serial Number (S/N)"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-mono font-bold text-red-700">
                {report?.serialNumber || diode.inverterSerial || "(ตามรูปถ่ายเนมเพลทข้างเครื่อง)"}
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn
                  ? "Capacity / Rating"
                  : isPump
                  ? "ขนาดของปั๊ม (Capacity)"
                  : isMotor
                  ? "ขนาดมอเตอร์ (Power)"
                  : "ขนาดกำลัง / พิกัด"}
              </td>
              <td className="px-2.5 py-1.5 border border-black font-semibold">
                {report?.motorKw
                  ? report.motorKw.toLowerCase().includes("kw") || report.motorKw.toLowerCase().includes("hp")
                    ? report.motorKw
                    : `${report.motorKw} ${eqConfig.powerUnitLabel || "kW"}`
                  : diode.inverterKw
                  ? `${diode.inverterKw} kW`
                  : "-"}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Application & Load" : "ลักษณะการใช้งาน / โหลด"}
              </td>
              <td className="px-2.5 py-1.5 border border-black">
                {displayAppLoad}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ───────────────────────────────────────────────────────────
          5. SECTION 3: รายละเอียดอาการเสีย / ปัญหาที่ตรวจพบ
      ─────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>
            {isEn
              ? "3. Symptom & Defect Description"
              : "3. รายละเอียดอาการเสีย / ปัญหาที่ตรวจพบ (Symptom & Defect Description)"}
          </span>
          <span className="text-[10px] font-normal opacity-90">
            {isEn ? "Reported Defect" : "อาการความผิดปกติ"}
          </span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="p-3 border border-black min-h-[60px] align-top bg-white">
                <div className="text-[12px] font-medium leading-relaxed whitespace-pre-wrap text-slate-900">
                  {displaySymptoms}
                </div>
              </td>
            </tr>
            <tr className="bg-neutral-50 text-[10px]">
              <td className="px-2.5 py-1 border border-black text-slate-600 flex items-center justify-between">
                <span>
                  <b>{isEn ? "Fault Occurred Date: " : "วันที่เกิดอาการเสีย: "}</b>
                  {report?.faultDate
                    ? new Date(report.faultDate).toLocaleDateString(isEn ? "en-GB" : "th-TH")
                    : "-"}
                </span>
                <span>
                  <b>{isEn ? "Attached Photos: " : "จำนวนรูปภาพแนบในระบบ: "}</b>{" "}
                  {totalPhotoCount} {isEn ? "photos" : "รูป"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ───────────────────────────────────────────────────────────
          6. SECTION 4: รูปถ่ายเนมเพลทและหลักฐานความเสียหาย
      ─────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>
            {isEn
              ? "4. Nameplate & Damage Photo Evidence"
              : "4. รูปถ่ายเนมเพลทข้างเครื่องและหลักฐานความเสียหาย (Attached Photos)"}
          </span>
          <span className="text-[10px] font-normal opacity-90">
            {isEn ? "Evidence" : "รูปถ่ายประกอบ"}
          </span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              {/* Photo 1: Nameplate */}
              <td className="p-2 border border-black text-center align-top w-1/2 bg-neutral-50/30">
                <div className="text-[10px] font-bold text-slate-700 mb-1">
                  {isEn
                    ? "[1] Equipment Nameplate & S/N Photo"
                    : "[1] รูปถ่ายเนมเพลทข้างตัวเครื่อง (S/N Nameplate)"}
                </div>
                {nameplatePhoto ? (
                  <div className="h-52 flex items-center justify-center border border-slate-300 bg-white rounded p-1">
                    <img
                      src={nameplatePhoto}
                      alt="Nameplate"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-52 flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs">
                    {isEn ? "No nameplate photo attached" : "ไม่มีรูปถ่ายเนมเพลท"}
                  </div>
                )}
              </td>

              {/* Photo 2: Defect or Machine Front (up to 4 photos) */}
              <td className="p-2 border border-black text-center align-top w-1/2 bg-neutral-50/30">
                <div className="text-[10px] font-bold text-slate-700 mb-1 flex items-center justify-between px-1">
                  <span>
                    {isEn
                      ? "[2] Defect Photo"
                      : "[2] รูปถ่ายจุดชำรุดเสียหาย (Defect Photo)"}
                  </span>
                  {candidateDefectPhotos.length > 1 && (
                    <span className="text-[9px] font-normal text-slate-500 font-mono">
                      ({defectPhotos.length}
                      {candidateDefectPhotos.length > 4 ? `/${candidateDefectPhotos.length}` : ""}{" "}
                      {isEn ? "photos" : "รูป"})
                    </span>
                  )}
                </div>
                {defectPhotos.length === 0 ? (
                  <div className="h-52 flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs">
                    {isEn ? "No defect photo attached" : "ไม่มีรูปถ่ายจุดชำรุดเสียหาย"}
                  </div>
                ) : defectPhotos.length === 1 ? (
                  <div className="h-52 flex items-center justify-center border border-slate-300 bg-white rounded p-1">
                    <img
                      src={defectPhotos[0]}
                      alt="Defect"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : defectPhotos.length === 2 ? (
                  <div className="h-52 grid grid-cols-2 gap-1.5 border border-slate-300 bg-white rounded p-1">
                    {defectPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative h-full w-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded overflow-hidden p-0.5"
                      >
                        <img
                          src={url}
                          alt={`Defect #${idx + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/70 text-white text-[8px] font-bold font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : defectPhotos.length === 3 ? (
                  <div className="h-52 grid grid-cols-2 grid-rows-2 gap-1 border border-slate-300 bg-white rounded p-1">
                    {defectPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className={`relative h-full w-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded overflow-hidden p-0.5 ${
                          idx === 2 ? "col-span-2" : ""
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Defect #${idx + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/70 text-white text-[8px] font-bold font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-52 grid grid-cols-2 grid-rows-2 gap-1 border border-slate-300 bg-white rounded p-1">
                    {defectPhotos.map((url, idx) => {
                      const isFourthAndMore = idx === 3 && candidateDefectPhotos.length > 4;
                      return (
                        <div
                          key={idx}
                          className="relative h-full w-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded overflow-hidden p-0.5"
                        >
                          <img
                            src={url}
                            alt={`Defect #${idx + 1}`}
                            className="max-h-full max-w-full object-contain"
                          />
                          <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/70 text-white text-[8px] font-bold font-mono">
                            #{idx + 1}
                          </span>
                          {isFourthAndMore && (
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-blue-600/90 text-white text-[8px] font-bold">
                              +{candidateDefectPhotos.length - 4}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ───────────────────────────────────────────────────────────
          7. SECTION 5: ผลการตรวจเช็คทางเทคนิคและวิเคราะห์สาเหตุ
      ─────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>
            {isEn
              ? "5. Technical Findings & Cause Analysis"
              : "5. ผลการตรวจเช็คทางเทคนิคและวิเคราะห์สาเหตุ (Technical Findings & Assessment)"}
          </span>
          <span className="text-[10px] font-normal opacity-90">
            {isEn ? "Inspection Results" : "ผลการตรวจเช็ค"}
          </span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            {/* Cause of fault */}
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[20%] align-top">
                {isEn ? "Cause of Fault" : "สาเหตุความเสียหาย"}
              </td>
              <td className="px-2.5 py-1.5 border border-black w-[80%] font-semibold text-slate-900 leading-relaxed">
                {displayCauseOfFault}
              </td>
            </tr>

            {/* Recommendations */}
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black align-top">
                {isEn ? "Recommendations" : "ข้อเสนอแนะ / แนวทางแก้ไข"}
              </td>
              <td className="px-2.5 py-1.5 border border-black leading-relaxed">
                {displayRecommendations}
              </td>
            </tr>

            {/* Required parts */}
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black align-top">
                {isEn ? "Required Parts" : "อะไหล่ที่ต้องใช้ / เปลี่ยน"}
              </td>
              <td className="px-2.5 py-1.5 border border-black">
                {displayParts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 py-0.5">
                    {displayParts.map((p: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-100 border border-slate-300 rounded text-[10.5px]"
                      >
                        <span className="font-medium text-slate-800">{p.partName || "-"}</span>
                        <span className="font-bold text-red-700 font-mono">
                          x{p.qty || 1}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">
                    {isEn ? "No replacement parts listed" : "-"}
                  </span>
                )}
              </td>
            </tr>

            {/* Technical Measurement Quick Summary */}
            {(diode.igbtStatus ||
              diode.pos_to_r_black ||
              motor.windingU1U2 ||
              pInput.r_s ||
              pOutput.u_v) && (
              <tr>
                <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black align-top">
                  {isEn ? "Measurement Notes" : "สรุปผลการวัดทางเทคนิค"}
                </td>
                <td className="px-2.5 py-1.5 border border-black text-[10.5px]">
                  {eqType === "INVERTER" && (
                    <div className="space-y-0.5">
                      {diode.igbtStatus && (
                        <div>
                          • <b>IGBT Status:</b>{" "}
                          <span
                            className={
                              diode.igbtStatus.includes("ปกติ") || diode.igbtStatus.includes("PASS")
                                ? "text-emerald-700 font-bold"
                                : "text-red-700 font-bold"
                            }
                          >
                            {diode.igbtStatus}
                          </span>
                        </div>
                      )}
                      {(diode.pos_to_r_black || diode.phaseShortCheck) && (
                        <div>
                          • <b>Diode Check:</b> (+)→R: {diode.pos_to_r_black || "-"} V | (+)→S:{" "}
                          {diode.pos_to_s_black || "-"} V | (+)→T: {diode.pos_to_t_black || "-"} V
                          {diode.phaseShortCheck && ` [${diode.phaseShortCheck}]`}
                        </div>
                      )}
                    </div>
                  )}

                  {eqType === "MOTOR" && (
                    <div className="space-y-0.5">
                      <div>
                        • <b>ขดลวด (Resistance):</b> U1-U2: {motor.windingU1U2 || "-"} Ω | V1-V2:{" "}
                        {motor.windingV1V2 || "-"} Ω | W1-W2: {motor.windingW1W2 || "-"} Ω
                      </div>
                      <div>
                        • <b>ฉนวน (Insulation Megger):</b> U-G: {motor.insulationUGround || "-"} MΩ |
                        V-G: {motor.insulationVGround || "-"} MΩ | W-G:{" "}
                        {motor.insulationWGround || "-"} MΩ
                      </div>
                    </div>
                  )}

                  {eqType === "CONTROL_CABINET" && (
                    <div className="space-y-0.5">
                      <div>
                        • <b>Power Input:</b> R-S: {pInput.r_s || "-"} V | S-T: {pInput.s_t || "-"} V
                        | R-T: {pInput.r_t || "-"} V
                      </div>
                      <div>
                        • <b>Power Output:</b> U-V: {pOutput.u_v || "-"} V | V-W:{" "}
                        {pOutput.v_w || "-"} V | U-W: {pOutput.u_w || "-"} V
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )}

            {/* Action / Next Step Options */}
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                {isEn ? "Action / Next Step" : "การดำเนินการ / สถานะ"}
              </td>
              <td className="px-2.5 py-1.5 border border-black">
                <div className="grid grid-cols-4 gap-2 text-[10.5px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3 bg-white">
                      {report?.status === "WARRANTY_CLAIM" ? "✓" : ""}
                    </span>
                    <span>{isEn ? "Warranty Claim" : "ส่งเคลมโรงงาน (Claim)"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3 bg-white">
                      {report?.status === "CONVERTED_TO_RO" ? "✓" : ""}
                    </span>
                    <span>{isEn ? "Open RO Repair" : "เปิดใบรับซ่อม (RO)"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3 bg-white">
                      {report?.status === "PENDING" ? "✓" : ""}
                    </span>
                    <span>{isEn ? "Pending" : "รอซ่อม / รอดำเนินการ"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3 bg-white">
                      {report?.status === "CLOSED_NO_REPAIR" ? "✓" : ""}
                    </span>
                    <span>{isEn ? "Closed" : "ปิดงาน / ไม่ต้องซ่อม"}</span>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


      {/* ───────────────────────────────────────────────────────────
          9. FOOTER INFO
      ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200">
        <div>
          {isEn
            ? "Official Document: Technical Service & Warranty Claim System (Tera Group Sales CRM)"
            : "เอกสารทางการ: ระบบบริหารจัดการงานบริการและตรวจเช็คสินค้า (Tera Group Sales CRM)"}
        </div>
        <div suppressHydrationWarning>
          {isEn ? "Printed on: " : "พิมพ์เมื่อ: "}
          <span suppressHydrationWarning>{printedDateStr}</span>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .check-report-claim-paper {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}
