"use client";

import React, { useState, useEffect } from "react";
import { EQUIPMENT_TYPE_CONFIG } from "../lib/crConstants";
import { translateReportData } from "@/app/actions/translateReport";
import { Sparkles, Loader2 } from "lucide-react";

interface FaultReportPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function FaultReportPaper({
  report,
  lang = "TH",
  className = "",
}: FaultReportPaperProps) {
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
      approvedByName: report?.approvedByName,
      reportBy: report?.reportBy,
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
    report?.recommendations,
    report?.applicationLoad,
    report?.requireParts,
  ]);

  const displayCustomer = isEn
    ? translatedData?.customerCompany ||
      translatedData?.customerName ||
      report?.customerCompany ||
      report?.customerName ||
      "-"
    : report?.customerCompany || report?.customerName || "-";

  const displaySymptoms = isEn && translatedData?.symptoms ? translatedData.symptoms : report?.symptoms;
  const displayCause = isEn && translatedData?.causeOfFault ? translatedData.causeOfFault : report?.causeOfFault;
  const displayAppLoad = isEn && translatedData?.applicationLoad ? translatedData.applicationLoad : report?.applicationLoad;
  const displayParts = isEn && translatedData?.requireParts ? translatedData.requireParts : (report?.requireParts || []);
  const displayReporter = isEn && translatedData?.inspectorName ? translatedData.inspectorName : (report?.inspectorName || report?.reportBy || "-");
  const displayApprover = isEn && (translatedData?.approvedByName || translatedData?.reportBy) ? (translatedData.approvedByName || translatedData.reportBy) : (report?.approvedByName || report?.reportBy || "......................................................");

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString(isEn ? "en-GB" : "th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;

  const diode = report?.diodeMeasurement || {};
  const hasInverter = Boolean(
    diode?.hasInverter ??
      (diode?.inverterModel ||
        diode?.igbtStatus ||
        diode?.meterPhotoDiode ||
        diode?.pos_to_r_black ||
        diode?.phaseShortCheck)
  );
  const hasDiodeValues = Boolean(
    diode.pos_to_r_black || diode.pos_to_s_black || diode.pos_to_t_black ||
    diode.neg_to_r_red || diode.neg_to_s_red || diode.neg_to_t_red ||
    diode.igbtStatus
  );

  const rawModel = (report?.inverterModel || diode?.inverterModel || "").trim();
  const brand = (report?.inverterBrand || diode?.inverterBrand || "").trim();
  const cleanModel =
    brand && rawModel.toLowerCase().startsWith(brand.toLowerCase())
      ? rawModel.slice(brand.length).trim()
      : rawModel || report?.inverterModel || "-";

  const motor = report?.motorMeasurement || {};
  const hasMotorValues = Boolean(
    motor?.windingU1U2 ||
      motor?.windingV1V2 ||
      motor?.windingW1W2 ||
      motor?.insulationUGround ||
      motor?.insulationVGround ||
      motor?.insulationWGround
  );
  const showMotorSection = eqType === "MOTOR" || hasMotorValues;
  const showDiodeSection = (eqType === "INVERTER" || (eqType === "CONTROL_CABINET" && hasInverter && hasDiodeValues)) && !showMotorSection;

  const parts: any[] = report?.requireParts || [];
  const photos = report?.photos || {};
  const photoSlots = [
    { key: "front", label: isEn ? "Front" : "ด้านหน้า", url: photos.front?.[0] },
    { key: "left", label: isEn ? "Left Side" : "ด้านซ้าย", url: photos.left?.[0] || photos.side?.[0] },
    { key: "right", label: isEn ? "Right Side" : "ด้านขวา", url: photos.right?.[0] },
    { key: "top", label: isEn ? "Top" : "ด้านบน", url: photos.top?.[0] },
    { key: "fan", label: isEn ? "Fan" : "พัดลม", url: photos.fan?.[0] },
    { key: "inside", label: isEn ? "Inside" : "ด้านใน", url: photos.inside?.[0] || photos.damage?.[0] },
    { key: "terminal", label: isEn ? "Terminal Block" : "บล็อคเทอร์มินอล", url: photos.terminal?.[0] },
    { key: "nameplate", label: isEn ? "Nameplate" : "เนมเพลท", url: photos.nameplate?.[0] },
  ];
  const hasAnyPhotos = photoSlots.some((s) => !!s.url) || Boolean(photos.other?.length);

  return (
    <div
      className={`fault-report-paper bg-white border-2 border-black w-full max-w-[794px] p-6 text-black text-[11px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header with Logos */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
          <div className="flex items-center gap-2">
            <img src="/4.png" alt="Tera Group" className="h-8 object-contain" />
            <img src="/6.png" alt="Tera Electric" className="h-8 object-contain" />
            <img src="/7.png" alt="Tera Power" className="h-8 object-contain" />
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-gray-800">
              {report?.companyCode === "TP"
                ? "TERA POWER CO., LTD."
                : report?.companyCode === "TE"
                ? "TERA ELECTRIC CO., LTD."
                : "TERA GROUP CO., LTD."}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              Ref CR: {report?.crNumber || "-"}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-2">
          <h2 className="text-base font-black tracking-wide text-black uppercase">
            {isEn ? eqConfig.faultReportTitleEn : eqConfig.faultReportTitleTh}
          </h2>
          {isEn && (
            <div className="mt-1 print:hidden flex items-center justify-center">
              {isTranslating ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  กำลังแปลข้อมูลเป็นภาษาอังกฤษอัตโนมัติ...
                </span>
              ) : translatedData ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  แปลข้อมูลภาษาไทยเป็นภาษาอังกฤษอัตโนมัติแล้ว
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Spec & Fault Details Table */}
        <table className="w-full border-collapse border border-black text-[10.5px] mb-3">
          <tbody>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-24">
                {isEn ? "Customer" : "ลูกค้า"}
              </td>
              <td className="border border-black p-1.5 w-1/3">
                {displayCustomer}
              </td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-28">
                {isEn
                  ? "Model"
                  : eqType === "CONTROL_CABINET"
                  ? "รุ่นตู้คอนโทรล"
                  : eqType === "MOTOR"
                  ? "รุ่นมอเตอร์"
                  : eqType === "PUMP"
                  ? "รุ่นปั๊ม"
                  : "รุ่น"}
              </td>
              <td className="border border-black p-1.5 font-bold">
                {eqType === "CONTROL_CABINET" && report?.inverterBrand
                  ? `${report.inverterBrand} ${cleanModel}`
                  : cleanModel}
                {eqType === "CONTROL_CABINET" && hasInverter && diode?.inverterModel && (
                  <div className="text-[10px] text-blue-800 font-normal mt-0.5">
                    Inverter ในตู้: {diode.inverterBrand || "INVT"} {diode.inverterModel} {diode.inverterSerial ? `(S/N: ${diode.inverterSerial})` : ""}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn
                  ? "Serial Number"
                  : eqType === "CONTROL_CABINET"
                  ? "Cabinet ID / S/N"
                  : eqType === "MOTOR"
                  ? "S/N มอเตอร์"
                  : eqType === "PUMP"
                  ? "S/N ปั๊ม"
                  : "หมายเลขเครื่อง"}
              </td>
              <td className="border border-black p-1.5 font-mono font-bold">
                {report?.serialNumber || "-"}
              </td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn
                  ? eqType === "MOTOR"
                    ? "kW of Motor"
                    : eqType === "PUMP"
                    ? "kW of Pump"
                    : eqType === "CONTROL_CABINET"
                    ? "Rated Power (kW)"
                    : "kW of motor"
                  : eqType === "MOTOR"
                  ? "ขนาดมอเตอร์"
                  : eqType === "PUMP"
                  ? "ขนาดปั๊ม"
                  : eqType === "CONTROL_CABINET"
                  ? "พิกัดตู้"
                  : "ขนาดมอเตอร์"}
              </td>
              <td className="border border-black p-1.5">
                {report?.motorKw ? `${report.motorKw} kW` : "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Date of purchase" : "วันที่ซื้อมา"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.purchaseDate)}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Date of sale" : "วันที่ขาย"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.saleDate)}</td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Fault Date" : "วันที่เสีย"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.faultDate)}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Status" : "สถานะการรับประกัน"}
              </td>
              <td className="border border-black p-1.5 font-semibold">
                {report?.warrantyStatus === "IN_WARRANTY"
                  ? isEn
                    ? "In warranty"
                    : "อยู่ในประกัน"
                  : report?.warrantyStatus === "OUT_OF_WARRANTY"
                  ? isEn
                    ? "Out of warranty"
                    : "นอกประกัน"
                  : isEn
                  ? "Pending check"
                  : "รอตรวจสอบ"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">
                {isEn ? "Application & Load" : "ลักษณะการใช้งาน / โหลด"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                {displayAppLoad || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">
                {isEn ? "Fault Description" : "อธิบายสาเหตุการเสีย"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                <div className="font-semibold text-red-950">{displaySymptoms || "-"}</div>
                {displayCause && (
                  <div className="text-gray-700 text-[10px] mt-0.5">
                    {isEn ? "Cause: " : "สาเหตุที่พบ: "} {displayCause}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">
                {isEn ? "Required parts" : "ส่วนที่ต้องการเปลี่ยน"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                {displayParts.length === 0
                  ? "-"
                  : displayParts.map((p: any) => `${p.partName || "-"} (${p.qty || 1} ${isEn ? "pcs" : "ชิ้น"})`).join(", ")}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Report By" : "ผู้ทำรายงาน"}
              </td>
              <td className="border border-black p-1.5">{displayReporter}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Check Date" : "วันที่ตรวจเช็ค"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.checkDate)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section: MOTOR MEASUREMENT TABLE (Shown for Motor or when Motor is tested) */}
        {showMotorSection && (
          <div className="mb-3">
            <div className="font-bold text-[11px] bg-neutral-200 border border-black px-2 py-1 mb-1 flex items-center justify-between">
              <span>
                {isEn
                  ? "ELECTRIC MOTOR ELECTRICAL MEASUREMENT RESULTS"
                  : "ผลการตรวจวัดค่าทางไฟฟ้าของมอเตอร์ (Winding & Insulation)"}
              </span>
              <span className="text-[9.5px] font-normal text-gray-700">
                {isEn ? "Units: Resistance (Ω), Megger (MΩ)" : "หน่วย: ความต้านทาน (Ω), เมกะโอห์ม (MΩ)"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 1. Winding Resistance Table */}
              <div>
                <div className="font-bold text-[10px] bg-neutral-100 border border-black px-1.5 py-0.5">
                  {isEn
                    ? "1. Winding Resistance Table (Multimeter Ω)"
                    : "1. ตารางวัดค่าความต้านทานขดลวด (Winding Resistance)"}
                </div>
                <div className="text-[8.5px] text-gray-600 italic border-x border-black px-1.5 py-0.5 bg-neutral-50/50">
                  {isEn
                    ? "* Multimeter Ω (Disconnect power & isolate motor before test)"
                    : "* ใช้มัลติมิเตอร์ย่าน Ω โดยตัดแหล่งจ่ายไฟและแยกมอเตอร์ก่อนวัด"}
                </div>
                <table className="w-full border-collapse border border-black text-[10.5px]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1 text-left">{isEn ? "Point" : "จุดวัด"}</th>
                      <th className="border border-black p-1 text-center w-28">
                        {isEn ? "Measured (Ω)" : "ค่าที่วัดได้ (Ω)"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-1 font-bold">U1–U2</td>
                      <td className="border border-black p-1 text-center font-mono font-bold">
                        {motor?.windingU1U2 ? `${motor.windingU1U2} Ω` : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 font-bold">V1–V2</td>
                      <td className="border border-black p-1 text-center font-mono font-bold">
                        {motor?.windingV1V2 ? `${motor.windingV1V2} Ω` : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 font-bold">W1–W2</td>
                      <td className="border border-black p-1 text-center font-mono font-bold">
                        {motor?.windingW1W2 ? `${motor.windingW1W2} Ω` : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Insulation Resistance Table */}
              <div>
                <div className="font-bold text-[10px] bg-neutral-100 border border-black px-1.5 py-0.5">
                  {isEn
                    ? "2. Insulation Resistance Table (Megger MΩ)"
                    : "2. ตารางวัดฉนวนขดลวดลงกราวด์ (Insulation Resistance)"}
                </div>
                <div className="text-[8.5px] text-gray-600 italic border-x border-black px-1.5 py-0.5 bg-neutral-50/50">
                  {isEn
                    ? "* Use Insulation Tester (Megger), not standard multimeter"
                    : "* ใช้เครื่อง Insulation Tester (Megger) ไม่ใช่มัลติมิเตอร์ธรรมดา"}
                </div>
                <table className="w-full border-collapse border border-black text-[10.5px]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black p-1 text-left">{isEn ? "Point" : "จุดวัด"}</th>
                      <th className="border border-black p-1 text-center w-28">
                        {isEn ? "Megger (MΩ)" : "ค่า Megger (MΩ)"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-1 font-bold">
                        {isEn ? "U – Motor Frame" : "U – โครงมอเตอร์"}
                      </td>
                      <td className="border border-black p-1 text-center font-mono font-bold">
                        {motor?.insulationUGround ? `${motor.insulationUGround} MΩ` : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 font-bold">
                        {isEn ? "V – Motor Frame" : "V – โครงมอเตอร์"}
                      </td>
                      <td className="border border-black p-1 text-center font-mono font-bold">
                        {motor?.insulationVGround ? `${motor.insulationVGround} MΩ` : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 font-bold">
                        {isEn ? "W – Motor Frame" : "W – โครงมอเตอร์"}
                      </td>
                      <td className="border border-black p-1 text-center font-mono font-bold">
                        {motor?.insulationWGround ? `${motor.insulationWGround} MΩ` : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {motor?.notes && (
              <div className="border border-black p-1.5 text-[10px] mt-1 bg-neutral-50">
                <b>{isEn ? "Motor Inspection Note: " : "หมายเหตุการตรวจเช็คมอเตอร์: "}</b>
                {motor.notes}
              </div>
            )}
          </div>
        )}

        {/* Section: DIODE MEASUREMENT TABLE (Shown for Inverter or when Diode is tested) */}
        {showDiodeSection && (
          <>
            <div className="font-bold text-[11px] bg-neutral-200 border border-black px-2 py-1 mb-1 flex items-center justify-between">
              <span>
                {isEn
                  ? "MEASUREMENT RESULT OF THE DIODE INSIDE THE INVERTER"
                  : "ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์"}
              </span>
              <span className="text-[9.5px] font-normal text-gray-700">
                {isEn ? "Unit: Voltage drop (V)" : "หน่วย: โวลต์ (V drop)"}
              </span>
            </div>

            <table className="w-full border-collapse border border-black text-center text-[10.5px] mb-3">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Black (-) to (+)" : "สายดำที่ (+) / สายแดงที่เฟส"}
                  </th>
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Red (+) to (+)" : "สายแดงที่ (+) / สายดำที่เฟส"}
                  </th>
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Red (+) to (-)" : "สายแดงที่ (-) / สายดำที่เฟส"}
                  </th>
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Black (-) to (-)" : "สายดำที่ (-) / สายแดงที่เฟส"}
                  </th>
                </tr>
                <tr className="bg-neutral-50 text-[10px] font-bold">
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ R</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_r_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ R</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_r_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- R</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_r_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- R</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_r_black || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ S</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_s_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ S</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_s_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- S</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_s_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- S</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_s_black || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ T</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_t_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ T</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_t_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- T</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_t_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- T</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_t_black || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ U</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_u_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ U</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_u_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- U</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_u_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- U</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_u_red || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ V</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_v_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ V</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_v_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- V</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_v_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- V</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_v_red || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ W</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_w_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ W</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_w_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- W</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_w_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- W</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_w_red || "-"}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Section: PHOTOS ATTACHMENT (รูปสินค้า 8 ด้าน) */}
        {hasAnyPhotos && (
          <div className="mt-4 mb-2 print:break-before-page">
            <div className="font-bold text-[12px] bg-[#d9e1f2] border border-black text-center py-1 mb-3">
              {isEn ? "PRODUCT PHOTOS" : "รูปสินค้า"}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                [photoSlots[0], photoSlots[1]], // ด้านหน้า | ด้านซ้าย
                [photoSlots[2], photoSlots[3]], // ด้านขวา | ด้านบน
                [photoSlots[4], photoSlots[5]], // พัดลม | ด้านใน
                [photoSlots[6], photoSlots[7]], // บล็อคเทอร์มินอล | เนมเพลท
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
                            {isEn ? "(No photo)" : "(ไม่มีรูปภาพ)"}
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

      {/* Signature Section - Typed Name only, matching Image 3 */}
      <div className="border-2 border-black grid grid-cols-2 text-center text-[10.5px] mt-4 print:break-inside-avoid">
        <div className="border-r-2 border-black p-3 flex flex-col justify-between min-h-[95px]">
          <div className="font-bold text-[11px]">{isEn ? "Reported By (Technician)" : "ผู้ทำรายงาน / ช่างผู้ตรวจเช็ค"}</div>
          <div className="my-auto py-1.5">
            <div className="font-bold text-[11px]">
              ( {displayReporter} )
            </div>
            <div className="text-[10px] mt-1 text-gray-800">
              {isEn ? "Date: " : "วันที่ "}
              {report?.checkDate ? formatDate(report.checkDate) : "........ / ........ / ................"}
            </div>
          </div>
        </div>

        <div className="p-3 flex flex-col justify-between min-h-[95px]">
          <div className="font-bold text-[11px]">{isEn ? "Approved By (Manager / Engineer)" : "ผู้ตรวจสอบ / หัวหน้างาน"}</div>
          <div className="my-auto py-1.5">
            <div className="font-bold text-[11px]">
              ( {displayApprover} )
            </div>
            <div className="text-[10px] mt-1 text-gray-800">
              {isEn ? "Date: " : "วันที่ "}
              {report?.approvedDate ? formatDate(report.approvedDate) : "........ / ........ / ................"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
