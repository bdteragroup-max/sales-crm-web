"use client";

import React, { useState, useEffect } from "react";
import { translateReportData } from "@/app/actions/translateReport";
import { Sparkles, Loader2 } from "lucide-react";

interface InverterFaultReportPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function InverterFaultReportPaper({
  report,
  lang = "TH",
  className = "",
}: InverterFaultReportPaperProps) {
  const isEn = lang === "EN";

  // Auto-translate state for English report
  const [translatedData, setTranslatedData] = useState<{
    causeOfFault?: string;
    symptoms?: string;
    customerName?: string;
    customerCompany?: string;
    inspectorName?: string;
    recommendations?: string;
    applicationLoad?: string;
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
    report?.recommendations,
    report?.applicationLoad,
    report?.requireParts,
  ]);

  const displayCauseOfFault =
    isEn && translatedData?.causeOfFault
      ? translatedData.causeOfFault
      : report?.causeOfFault || "-";

  const displaySymptoms =
    isEn && translatedData?.symptoms
      ? translatedData.symptoms
      : report?.symptoms || "-";

  const displayAppLoad =
    isEn && translatedData?.applicationLoad
      ? translatedData.applicationLoad
      : report?.applicationLoad || "-";

  const displayCustomer =
    isEn
      ? translatedData?.customerCompany ||
      translatedData?.customerName ||
      report?.customerCompany ||
      report?.customerName ||
      "-"
      : report?.customerCompany || report?.customerName || "-";

  const displayReporter =
    isEn && translatedData?.inspectorName
      ? translatedData.inspectorName
      : report?.inspectorName || report?.reportBy || "-";

  const displayParts =
    isEn && translatedData?.requireParts
      ? translatedData.requireParts
      : report?.requireParts || [];

  const partsText =
    Array.isArray(displayParts) && displayParts.length > 0
      ? displayParts.map((p: any) => p.partName || "-").join(", ")
      : "-";

  const partsTotalQty =
    Array.isArray(displayParts) && displayParts.length > 0
      ? displayParts.reduce((sum: number, p: any) => sum + (Number(p.qty) || 1), 0)
      : 1;

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "-";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString(isEn ? "en-GB" : "th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return String(dateVal);
    }
  };

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

  const warrantyText = isEn
    ? report?.warrantyStatus === "VALID" ||
      report?.warrantyStatus === "รับประกัน" ||
      report?.warrantyStatus === "IN_WARRANTY"
      ? "In Warranty"
      : report?.warrantyStatus === "EXPIRED" ||
        report?.warrantyStatus === "หมดประกัน" ||
        report?.warrantyStatus === "OUT_OF_WARRANTY"
        ? "Out of Warranty"
        : report?.warrantyStatus || "In Warranty"
    : report?.warrantyStatus === "VALID" ||
      report?.warrantyStatus === "รับประกัน" ||
      report?.warrantyStatus === "IN_WARRANTY"
      ? "รับประกัน"
      : report?.warrantyStatus === "EXPIRED" ||
        report?.warrantyStatus === "หมดประกัน" ||
        report?.warrantyStatus === "OUT_OF_WARRANTY"
        ? "หมดประกัน"
        : report?.warrantyStatus || "รับประกัน";

  const photos = report?.photos || {};
  const diode = report?.diodeMeasurement || {};

  // Photo 1: ด้านหน้า (Front)
  const frontPhoto = photos.front?.[0] || photos.side?.[0];
  // Photo 2: เนมเพลท (Nameplate)
  const nameplatePhoto = photos.nameplate?.[0];
  // Photo 3: ความเสียหายของบอร์ด (Board Damage)
  const damagePhotosList: string[] =
    Array.isArray(photos.damage) && photos.damage.filter(Boolean).length > 0
      ? photos.damage.filter(Boolean)
      : photos.inside?.[0]
        ? [photos.inside[0]]
        : photos.terminal?.[0]
          ? [photos.terminal[0]]
          : diode.meterPhotoDiode
            ? [diode.meterPhotoDiode]
            : [];
  const damagePhotoCount = damagePhotosList.length;

  const rawModel = (report?.inverterModel || diode.inverterModel || "-").trim();
  const brand = (report?.inverterBrand || diode.inverterBrand || "").trim();
  const modelText =
    brand && rawModel.toLowerCase().startsWith(brand.toLowerCase())
      ? rawModel.slice(brand.length).trim()
      : rawModel;

  const serialText = report?.serialNumber || diode.inverterSerial || "-";
  const powerText = report?.motorKw || diode.inverterKw || "-";

  return (
    <div
      className={`inverter-fault-report-container w-full max-w-[1020px] mx-auto text-black font-['Sarabun',sans-serif] ${className}`}
    >
      <div
        className="inverter-fault-report-page print-page-sheet bg-white border-2 border-black p-5 text-[11px] leading-snug flex flex-col justify-between box-border min-h-[960px] shadow-sm print:border-none print:p-0 print:shadow-none print:min-h-0 print:h-auto print:block"
        style={{ boxSizing: "border-box" }}
      >
        <div>
          {/* Header Row: Company Title & Document Number */}
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
                    ? "Inverter & Drive System Division — Pre-Inspection & Fault Report"
                    : "ฝ่ายบริการและตรวจเช็คอินเวอร์เตอร์ — รายงานสาเหตุการชำรุดเสียหาย"}
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

          {/* Centered Title Matching Screenshot 1 */}
          <div className="text-center my-2 print:my-1">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-black print:text-[13px] print:leading-tight">
              INVERTER & SOFTSTATER FAULT REPORT
            </h1>
            <div className="text-[11px] text-gray-600 font-medium print:text-[9px]">
              {isEn
                ? "(Inverter & Soft Starter Inspection and Faulty Report)"
                : "(รายงานการตรวจเช็คและสาเหตุการชำรุดเสียหายของอินเวอร์เตอร์และซอฟต์สตาร์ทเตอร์)"}
            </div>

            {/* Translation status badge */}
            {isEn && (
              <div className="mt-1 print:hidden flex items-center justify-center">
                {isTranslating ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    กำลังแปลข้อมูลภาษาไทยเป็นภาษาอังกฤษอัตโนมัติ...
                  </span>
                ) : translatedData ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    แปลข้อมูลภาษาอังกฤษอัตโนมัติเรียบร้อยแล้ว
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* 15-Column Table Matching Screenshot 1 */}
          <div className="overflow-x-auto mb-2 print:mb-1.5">
            <table className="w-full border-collapse border border-black text-[9px] print:text-[7.5px] leading-tight text-center">
              <thead>
                <tr className="bg-neutral-100 font-bold">
                  {/* 1 */}
                  <th className="border border-black p-1 print:p-0.5 w-[3%]">
                    {isEn ? "No." : "ลำดับ"}
                  </th>
                  {/* 2 */}
                  <th className="border border-black p-1 print:p-0.5 w-[6%]">
                    {isEn ? "Purchase Date" : "วันที่ซื้อมา"}
                  </th>
                  {/* 3 */}
                  <th className="border border-black p-1 print:p-0.5 w-[6%]">
                    {isEn ? "Sale Date" : "วันที่ขาย"}
                  </th>
                  {/* 4 */}
                  <th className="border border-black p-1 print:p-0.5 w-[6%]">
                    {isEn ? "Fault Date" : "วันที่เสีย"}
                  </th>
                  {/* 5 */}
                  <th className="border border-black p-1 print:p-0.5 w-[8%]">
                    {isEn ? "Model" : "รุ่น"}
                  </th>
                  {/* 6 */}
                  <th className="border border-black p-1 print:p-0.5 w-[8%]">
                    {isEn ? "Serial No." : "หมายเลขเครื่อง"}
                  </th>
                  {/* 7 */}
                  <th className="border border-black p-1 print:p-0.5 w-[6%]">
                    {isEn ? "Warranty" : "สถานะประกัน"}
                  </th>
                  {/* 8 */}
                  <th className="border border-black p-1 print:p-0.5 w-[6%]">
                    {isEn ? "Motor Size" : "ขนาดมอเตอร์"}
                  </th>
                  {/* 9 */}
                  <th className="border border-black p-1 print:p-0.5 w-[11%]">
                    {isEn
                      ? "Application & Load"
                      : "ลักษณะการใช้งาน โหลด"}
                  </th>
                  {/* 10 */}
                  <th className="border border-black p-1 print:p-0.5 w-[12%]">
                    {isEn
                      ? "Cause of Fault"
                      : "สาเหตุการเสีย ช่วงที่เสีย"}
                  </th>
                  {/* 11 */}
                  <th className="border border-black p-1 print:p-0.5 w-[9%]">
                    {isEn
                      ? "Damaged Parts"
                      : "ส่วนที่ต้องการเปลี่ยน"}
                  </th>
                  {/* 12 */}
                  <th className="border border-black p-1 print:p-0.5 w-[4%]">
                    {isEn ? "Qty" : "จำนวน"}
                  </th>
                  {/* 13 */}
                  <th className="border border-black p-1 print:p-0.5 w-[8%]">
                    {isEn
                      ? "Attached Photos"
                      : "รูปถ่ายแนบด้านล่าง"}
                  </th>
                  {/* 14 */}
                  <th className="border border-black p-1 print:p-0.5 w-[8%]">
                    {isEn ? "Customer" : "ลูกค้า"}
                  </th>
                  {/* 15 */}
                  <th className="border border-black p-1 print:p-0.5 w-[5%]">
                    {isEn ? "Report By" : "ผู้ทำรายงาน"}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  {/* 1 */}
                  <td className="border border-black p-1 print:p-0.5 font-bold">1</td>
                  {/* 2 */}
                  <td className="border border-black p-1 print:p-0.5 font-mono text-[8.5px] print:text-[7.5px]">
                    {formatDate(report?.purchaseDate)}
                  </td>
                  {/* 3 */}
                  <td className="border border-black p-1 print:p-0.5 font-mono text-[8.5px] print:text-[7.5px]">
                    {formatDate(report?.saleDate)}
                  </td>
                  {/* 4 */}
                  <td className="border border-black p-1 print:p-0.5 font-mono text-[8.5px] print:text-[7.5px]">
                    {formatDate(report?.faultDate)}
                  </td>
                  {/* 5 */}
                  <td className="border border-black p-1 print:p-0.5 font-bold break-words text-[9px] print:text-[7.5px]">
                    {modelText}
                  </td>
                  {/* 6 */}
                  <td className="border border-black p-1 print:p-0.5 font-mono text-[8.5px] print:text-[7.5px] break-words">
                    {serialText}
                  </td>
                  {/* 7 */}
                  <td className="border border-black p-1 print:p-0.5 font-semibold text-[8.5px] print:text-[7.5px]">
                    {warrantyText}
                  </td>
                  {/* 8 */}
                  <td className="border border-black p-1 print:p-0.5 font-semibold text-[8.5px] print:text-[7.5px]">
                    {powerText}
                  </td>
                  {/* 9 */}
                  <td className="border border-black p-1 print:p-0.5 text-left break-words text-[8.5px] print:text-[7.5px] leading-tight">
                    {displayAppLoad}
                  </td>
                  {/* 10 */}
                  <td className="border border-black p-1 print:p-0.5 text-left break-words text-[8.5px] print:text-[7.5px] leading-tight">
                    {displayCauseOfFault}
                  </td>
                  {/* 11 */}
                  <td className="border border-black p-1 print:p-0.5 text-left break-words text-[8.5px] print:text-[7.5px] leading-tight">
                    {partsText}
                  </td>
                  {/* 12 */}
                  <td className="border border-black p-1 print:p-0.5 font-bold">
                    {partsTotalQty}
                  </td>
                  {/* 13 */}
                  <td className="border border-black p-1 print:p-0.5 text-[8px] print:text-[7.5px] leading-tight text-gray-700">
                    {isEn
                      ? damagePhotoCount > 1
                        ? `${(frontPhoto ? 1 : 0) + (nameplatePhoto ? 1 : 0) + damagePhotoCount} photos attached`
                        : "3 photos attached below"
                      : damagePhotoCount > 1
                        ? `แนบ ${(frontPhoto ? 1 : 0) + (nameplatePhoto ? 1 : 0) + damagePhotoCount} รูปด้านล่าง`
                        : "แนบ 3 รูปด้านล่าง"}
                  </td>
                  {/* 14 */}
                  <td className="border border-black p-1 print:p-0.5 text-left break-words text-[8.5px] print:text-[7.5px] font-medium leading-tight">
                    {displayCustomer}
                  </td>
                  {/* 15 */}
                  <td className="border border-black p-1 print:p-0.5 text-[8.5px] print:text-[7.5px] font-semibold">
                    {displayReporter}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Red Text Symptoms Row Matching Screenshot 1 */}
          <div className="border border-black p-2 print:p-1.5 mb-3 print:mb-2 bg-white text-[10.5px] print:text-[9.5px] leading-snug">
            <span className="font-bold text-red-600">
              {isEn ? "Symptoms : From inspection " : "อาการ : จากการตรวจเช็ค "}
            </span>
            <span className="text-black font-medium">{displaySymptoms}</span>
          </div>

          {/* 3 Photos Section Matching Screenshot 2 */}
          <div className="grid grid-cols-3 gap-3 mb-3 print:mb-1.5 print:gap-2.5 print:break-inside-avoid">
            {/* Photo 1: ด้านหน้า */}
            <div className="flex flex-col items-center print:break-inside-avoid">
              <div
                className="inverter-photo-frame w-full border border-black bg-white flex items-center justify-center p-1"
                style={{ height: "140px", maxHeight: "140px", overflow: "hidden" }}
              >
                {frontPhoto ? (
                  <img
                    src={frontPhoto}
                    alt="Front View"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "130px", maxWidth: "100%", width: "auto", height: "auto" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[10px] block font-semibold">
                      {isEn ? "(No Front Photo)" : "(ไม่มีรูปถ่ายด้านหน้า)"}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isEn ? "Front View Photo" : "รูปถ่ายด้านหน้าเครื่อง"}
                    </span>
                  </div>
                )}
              </div>
              <div className="border border-black px-3 py-0.5 mt-1 text-center font-bold text-[10px] print:text-[9px] bg-white min-w-[110px]">
                {isEn ? "Front" : "ด้านหน้า"}
              </div>
            </div>

            {/* Photo 2: เนมเพลท */}
            <div className="flex flex-col items-center print:break-inside-avoid">
              <div
                className="inverter-photo-frame w-full border border-black bg-white flex items-center justify-center p-1"
                style={{ height: "140px", maxHeight: "140px", overflow: "hidden" }}
              >
                {nameplatePhoto ? (
                  <img
                    src={nameplatePhoto}
                    alt="Nameplate"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "130px", maxWidth: "100%", width: "auto", height: "auto" }}
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[10px] block font-semibold">
                      {isEn ? "(No Nameplate Photo)" : "(ไม่มีรูปเนมเพลท)"}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isEn ? "Nameplate & S/N" : "รูปป้ายชื่อและสเปกเครื่อง"}
                    </span>
                  </div>
                )}
              </div>
              <div className="border border-black px-3 py-0.5 mt-1 text-center font-bold text-[10px] print:text-[9px] bg-white min-w-[110px]">
                {isEn ? "Nameplate" : "เนมเพลท"}
              </div>
            </div>

            {/* Photo 3: ความเสียหายของบอร์ด (แสดงครบทุกรูปในตาราง 2x2) */}
            <div className="flex flex-col items-center print:break-inside-avoid">
              <div
                className="inverter-photo-frame w-full border border-black bg-white flex items-center justify-center p-0.5"
                style={{ height: "140px", maxHeight: "140px", overflow: "hidden" }}
              >
                {damagePhotoCount === 0 ? (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[10px] block font-semibold">
                      {isEn ? "(No Board Damage Photo)" : "(ไม่มีรูปความเสียหายของบอร์ด)"}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isEn ? "Damaged Components / PCB" : "รูปความเสียหายของบอร์ด/IGBT"}
                    </span>
                  </div>
                ) : damagePhotoCount === 1 ? (
                  <img
                    src={damagePhotosList[0]}
                    alt="Board Damage"
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "130px", maxWidth: "100%", width: "auto", height: "auto" }}
                  />
                ) : damagePhotoCount === 2 ? (
                  <div
                    className="w-full h-full grid grid-cols-2 gap-1 p-0.5"
                    style={{ height: "100%", maxHeight: "100%" }}
                  >
                    {damagePhotosList.map((url, idx) => (
                      <div
                        key={idx}
                        className="inverter-grid-cell relative w-full border border-gray-300 bg-neutral-50 flex items-center justify-center"
                        style={{ height: "130px", maxHeight: "130px", overflow: "hidden" }}
                      >
                        <img
                          src={url}
                          alt={`Board Damage #${idx + 1}`}
                          className="max-h-full max-w-full object-contain"
                          style={{ maxHeight: "124px", maxWidth: "100%", width: "auto", height: "auto" }}
                        />
                        <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/75 text-white text-[8px] font-bold font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-0.5"
                    style={{ height: "100%", maxHeight: "100%" }}
                  >
                    {damagePhotosList.slice(0, 4).map((url, idx) => {
                      const isFourthAndMore = idx === 3 && damagePhotoCount > 4;
                      return (
                        <div
                          key={idx}
                          className="inverter-grid-cell relative w-full border border-gray-300 bg-neutral-50 flex items-center justify-center"
                          style={{ height: "64px", maxHeight: "64px", overflow: "hidden" }}
                        >
                          <img
                            src={url}
                            alt={`Board Damage #${idx + 1}`}
                            className="max-h-full max-w-full object-contain"
                            style={{ maxHeight: "58px", maxWidth: "100%", width: "auto", height: "auto" }}
                          />
                          <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-black/75 text-white text-[7.5px] font-bold font-mono leading-none">
                            #{idx + 1}
                          </span>
                          {isFourthAndMore && (
                            <div className="absolute inset-0 bg-black/60 text-white flex items-center justify-center font-bold text-[9px]">
                              +{damagePhotoCount - 3}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border border-black px-3 py-0.5 mt-1 text-center font-bold text-[10px] print:text-[9px] bg-white min-w-[110px]">
                {isEn
                  ? damagePhotoCount > 1
                    ? `Board Damage (${damagePhotoCount})`
                    : "Board Damage"
                  : damagePhotoCount > 1
                    ? `ความเสียหายของบอร์ด (${damagePhotoCount} รูป)`
                    : "ความเสียหายของบอร์ด"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info (No signature block as requested) */}
        <div className="border-t border-gray-300 pt-1 text-[9.5px] print:text-[8.5px] text-gray-500 flex justify-between items-center">
          <span>{companyTitle} — Service & Quality Control</span>
          <span>
            {isEn
              ? "Inverter & Drive System Inspection Report"
              : "เอกสารรายงานการตรวจเช็คอินเวอร์เตอร์"}
          </span>
        </div>
      </div>

      {/* Embedded Print Style to ensure exact 1-page fit and prevent overflowing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .inverter-fault-report-page {
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
          .inverter-photo-frame {
            height: 135px !important;
            max-height: 135px !important;
            overflow: hidden !important;
          }
          .inverter-photo-frame img {
            max-height: 125px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          .inverter-grid-cell {
            height: 62px !important;
            max-height: 62px !important;
            overflow: hidden !important;
          }
          .inverter-grid-cell img {
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
