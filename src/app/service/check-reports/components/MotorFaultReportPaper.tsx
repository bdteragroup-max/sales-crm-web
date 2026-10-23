import React, { useState, useEffect } from "react";
import { translateReportData } from "@/app/actions/translateReport";
import { Sparkles, Loader2 } from "lucide-react";

interface MotorFaultReportPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function MotorFaultReportPaper({
  report,
  lang = "TH",
  className = "",
}: MotorFaultReportPaperProps) {
  const isEn = lang === "EN";

  // Auto-translate state for English report
  const [translatedData, setTranslatedData] = useState<{
    causeOfFault?: string;
    symptoms?: string;
    customerName?: string;
    customerCompany?: string;
    inspectorName?: string;
    recommendations?: string;
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
    report?.requireParts,
  ]);

  const displayCauseOfFault =
    isEn && translatedData?.causeOfFault
      ? translatedData.causeOfFault
      : report?.causeOfFault;

  const displaySymptoms =
    isEn && translatedData?.symptoms
      ? translatedData.symptoms
      : report?.symptoms;

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
      : report?.inspectorName || "-";

  const displayRecommendations =
    isEn && translatedData?.recommendations
      ? translatedData.recommendations
      : report?.recommendations;

  const displayRequireParts =
    isEn && translatedData?.requireParts
      ? translatedData.requireParts
      : report?.requireParts;

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

  const photos = report?.photos || {};
  const nameplatePhoto = photos.nameplate?.[0];

  // Damage photos matching the 3 columns in the Excel template
  // Col 1: Brown - Black
  const damagePhoto1 = photos.left?.[0] || photos.damage?.[0];
  // Col 2: Black - Grey
  const damagePhoto2 = photos.front?.[0] || photos.inside?.[0] || photos.damage?.[1];
  // Col 3: Brown - Grey
  const damagePhoto3 = photos.right?.[0] || photos.top?.[0] || photos.damage?.[2];

  // Winding resistance values
  const mm = report?.motorMeasurement || {};
  const valBrownBlack =
    mm.windingBrownBlack !== undefined && mm.windingBrownBlack !== ""
      ? mm.windingBrownBlack
      : mm.windingU1U2 !== undefined && mm.windingU1U2 !== ""
      ? mm.windingU1U2
      : "0";

  const valBlackGrey =
    mm.windingBlackGrey !== undefined && mm.windingBlackGrey !== ""
      ? mm.windingBlackGrey
      : mm.windingV1V2 !== undefined && mm.windingV1V2 !== ""
      ? mm.windingV1V2
      : "0";

  const valBrownGrey =
    mm.windingBrownGrey !== undefined && mm.windingBrownGrey !== ""
      ? mm.windingBrownGrey
      : mm.windingW1W2 !== undefined && mm.windingW1W2 !== ""
      ? mm.windingW1W2
      : "0";

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

  // Insulation Megger values if recorded
  const hasInsulation =
    Boolean(mm.insulationUGround) ||
    Boolean(mm.insulationVGround) ||
    Boolean(mm.insulationWGround);

  return (
    <div
      className={`motor-fault-report-container w-full max-w-[840px] mx-auto text-black font-['Sarabun',sans-serif] ${className}`}
    >
      <div
        className="motor-fault-report-page print-page-sheet bg-white border-2 border-black p-6 text-[11px] leading-snug flex flex-col justify-between box-border min-h-[1050px] shadow-sm print:border-none print:p-0 print:shadow-none print:min-h-0 print:block"
        style={{ boxSizing: "border-box" }}
      >
        <div>
          {/* Header Row: Company Title & Document Number (matching No. 67- in Excel) */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-24 flex items-center justify-start shrink-0">
                <img
                  src={logoSrc}
                  alt={compCode}
                  className="max-h-11 max-w-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-[13px]">{companyTitle}</div>
                <div className="text-[10px] text-gray-600">
                  {isEn
                    ? "Electric Motor Inspection Division — Pre-Inspection & Fault Report"
                    : "ฝ่ายบริการและตรวจเช็คมอเตอร์ไฟฟ้า — รายงานสาเหตุการชำรุดเสียหาย"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[12px] text-black">
                No. {report?.crNumber || "67-"}
              </div>
              {report?.convertedJobNumber && (
                <div className="text-[10px] font-bold text-gray-700 font-mono">
                  Ref RO: {report.convertedJobNumber}
                </div>
              )}
            </div>
          </div>

          {/* Centered Title Matching Excel Template */}
          <div className="text-center my-3">
            <h1 className="text-lg font-black uppercase tracking-wider text-black">
              MOTOR FAULTY REPORT
            </h1>
            <div className="text-[11px] text-gray-600 font-medium">
              {isEn
                ? "(Electric Motor Inspection & Faulty Report)"
                : "(รายงานการตรวจเช็คและสาเหตุการชำรุดเสียหายของมอเตอร์ไฟฟ้า)"}
            </div>
            {isEn && (
              <div className="mt-1.5 print:hidden flex items-center justify-center">
                {isTranslating ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    กำลังแปลข้อมูลภาษาไทยเป็นภาษาอังกฤษอัตโนมัติ (Translating to English...)...
                  </span>
                ) : translatedData ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    แปลข้อมูลที่กรอกเป็นภาษาอังกฤษเรียบร้อยแล้ว (Auto-translated to English)
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* 11-Column Excel Table matching the user's uploaded MOTOR template */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-black text-[10.5px] text-center">
              <thead>
                <tr className="bg-neutral-50 font-bold">
                  <th className="border border-black p-1.5 w-[5%]">{isEn ? "No." : "ลำดับที่"}</th>
                  <th className="border border-black p-1.5 w-[8%]">{isEn ? "Purchase Date" : "วันที่ซื้อมา"}</th>
                  <th className="border border-black p-1.5 w-[8%]">{isEn ? "Sale Date" : "วันที่ขาย"}</th>
                  <th className="border border-black p-1.5 w-[8%]">{isEn ? "Fault Date" : "วันที่เสีย"}</th>
                  <th className="border border-black p-1.5 w-[12%]">{isEn ? "Model" : "รุ่น"}</th>
                  <th className="border border-black p-1.5 w-[11%]">{isEn ? "Serial No." : "หมายเลขเครื่อง"}</th>
                  <th className="border border-black p-1.5 w-[9%]">{isEn ? "Warranty Status" : "สถานะการรับประกัน"}</th>
                  <th className="border border-black p-1.5 w-[8%]">{isEn ? "Motor Size" : "ขนาดของมอเตอร์"}</th>
                  <th className="border border-black p-1.5 w-[18%]">
                    {isEn ? "Failure Cause / Stage of Failure" : "อธิบายสาเหตุการเสีย ช่วงการใช้งานที่เสีย"}
                  </th>
                  <th className="border border-black p-1.5 w-[12%]">{isEn ? "Customer" : "ลูกค้า"}</th>
                  <th className="border border-black p-1.5 w-[9%]">{isEn ? "Reporter" : "ผู้ทำรายงาน"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-mono">1</td>
                  <td className="border border-black p-2 font-mono">
                    {formatDate(report?.purchaseDate)}
                  </td>
                  <td className="border border-black p-2 font-mono">
                    {formatDate(report?.saleDate)}
                  </td>
                  <td className="border border-black p-2 font-mono">
                    {formatDate(report?.faultDate)}
                  </td>
                  <td className="border border-black p-2 font-bold font-mono text-[10px]">
                    {report?.inverterModel || report?.inverterBrand || "-"}
                  </td>
                  <td className="border border-black p-2 font-mono text-[10px]">
                    {report?.serialNumber || "-"}
                  </td>
                  <td className="border border-black p-2 font-bold">
                    {warrantyText}
                  </td>
                  <td className="border border-black p-2 font-bold font-mono">
                    {report?.motorKw || report?.powerKw || "-"}
                  </td>
                  <td className="border border-black p-2 text-left leading-relaxed">
                    {displayCauseOfFault || displaySymptoms || "-"}
                  </td>
                  <td className="border border-black p-2 text-left font-medium">
                    {displayCustomer}
                  </td>
                  <td className="border border-black p-2 font-medium">
                    {displayReporter}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subtitle: เนมเพลทมอเตอร์ (MOTOR NAMEPLATE) in Blue */}
          <div className="text-center font-bold text-[14px] text-[#0066cc] my-3">
            {isEn ? "MOTOR NAMEPLATE" : "เนมเพลทมอเตอร์"}
          </div>

          {/* Big Motor Nameplate Photo Centered */}
          <div className="w-full flex justify-center mb-5">
            <div className="border border-black p-2 bg-white w-full max-w-[620px] flex flex-col items-center">
              <div className="w-full h-64 sm:h-72 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                {nameplatePhoto ? (
                  <img
                    src={nameplatePhoto}
                    alt={isEn ? "Motor Nameplate" : "เนมเพลทมอเตอร์"}
                    className="max-h-full max-w-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-4">
                    <span className="text-[12px] block font-mono font-bold">
                      {isEn ? "(No Motor Nameplate Photo)" : "(ยังไม่มีรูปถ่ายเนมเพลทมอเตอร์)"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {isEn
                        ? "Photo of Motor Specification & Serial Nameplate"
                        : "ภาพถ่ายป้ายสเปกและหมายเลขซีเรียลมอเตอร์ไฟฟ้า (Nameplate)"}
                    </span>
                  </div>
                )}
              </div>
              <div className="font-bold text-[11px] mt-1.5 text-center text-slate-800">
                {isEn ? "Motor Specification Nameplate" : "ป้ายเนมเพลทมอเตอร์ (Motor Nameplate)"}
              </div>
            </div>
          </div>

          {/* Subtitle: การตรวจเช็คความต้านทานของขดลวด (WINDING RESISTANCE INSPECTION) in Blue */}
          <div className="text-center font-bold text-[14px] text-[#0066cc] my-3">
            {isEn ? "WINDING RESISTANCE INSPECTION" : "การตรวจเช็คความต้านทานของขดลวด"}
          </div>

          {/* 3 Columns Side-by-Side: Motor Damage Photos & Resistance Measurement */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Column 1: Brown - Black */}
            <div className="flex flex-col items-center justify-between border border-black p-2 bg-white">
              {/* Red Header */}
              <div className="font-bold text-[12px] text-red-600 mb-2 text-center">
                {isEn ? "Motor Damage" : "ความเสียหายของมอเตอร์"}
              </div>

              {/* Photo Box */}
              <div className="motor-photo-box w-full h-40 sm:h-48 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200 mb-2">
                {damagePhoto1 ? (
                  <img
                    src={damagePhoto1}
                    alt="Motor Damage 1"
                    className="max-h-full max-w-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[10px] block font-bold">
                      {isEn ? "(No Photo)" : "(ยังไม่มีรูป)"}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isEn ? "Brown - Black Winding" : "สายสี น้ำตาล กับ ดำ"}
                    </span>
                  </div>
                )}
              </div>

              {/* Measurement Text Matching Excel */}
              <div className="text-center text-[10.5px] leading-tight font-medium w-full pt-1 border-t border-gray-200">
                <div>{isEn ? "Winding resistance between" : "วัดความต้านทานของขดลวดระหว่าง"}</div>
                <div className="mt-0.5">
                  {isEn ? (
                    <>
                      Brown & Black Wire ={" "}
                      <span className="font-bold text-red-600 font-mono text-[13px]">
                        {valBrownBlack}
                      </span>{" "}
                      Ω
                    </>
                  ) : (
                    <>
                      สายสี น้ำตาล กับ ดำ เท่ากับ{" "}
                      <span className="font-bold text-red-600 font-mono text-[13px]">
                        {valBrownBlack}
                      </span>{" "}
                      Ω
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Black - Grey */}
            <div className="flex flex-col items-center justify-between border border-black p-2 bg-white">
              {/* Red Header */}
              <div className="font-bold text-[12px] text-red-600 mb-2 text-center">
                {isEn ? "Motor Damage" : "ความเสียหายของมอเตอร์"}
              </div>

              {/* Photo Box */}
              <div className="motor-photo-box w-full h-40 sm:h-48 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200 mb-2">
                {damagePhoto2 ? (
                  <img
                    src={damagePhoto2}
                    alt="Motor Damage 2"
                    className="max-h-full max-w-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[10px] block font-bold">
                      {isEn ? "(No Photo)" : "(ยังไม่มีรูป)"}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isEn ? "Black - Grey Winding" : "สายสี ดำ กับ เทา"}
                    </span>
                  </div>
                )}
              </div>

              {/* Measurement Text Matching Excel */}
              <div className="text-center text-[10.5px] leading-tight font-medium w-full pt-1 border-t border-gray-200">
                <div>{isEn ? "Winding resistance between" : "วัดความต้านทานของขดลวดระหว่าง"}</div>
                <div className="mt-0.5">
                  {isEn ? (
                    <>
                      Black & Grey Wire ={" "}
                      <span className="font-bold text-red-600 font-mono text-[13px]">
                        {valBlackGrey}
                      </span>{" "}
                      Ω
                    </>
                  ) : (
                    <>
                      สายสี ดำ กับ เทา เท่ากับ{" "}
                      <span className="font-bold text-red-600 font-mono text-[13px]">
                        {valBlackGrey}
                      </span>{" "}
                      Ω
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Brown - Grey */}
            <div className="flex flex-col items-center justify-between border border-black p-2 bg-white">
              {/* Red Header */}
              <div className="font-bold text-[12px] text-red-600 mb-2 text-center">
                {isEn ? "Motor Damage" : "ความเสียหายของมอเตอร์"}
              </div>

              {/* Photo Box */}
              <div className="motor-photo-box w-full h-40 sm:h-48 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200 mb-2">
                {damagePhoto3 ? (
                  <img
                    src={damagePhoto3}
                    alt="Motor Damage 3"
                    className="max-h-full max-w-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[10px] block font-bold">
                      {isEn ? "(No Photo)" : "(ยังไม่มีรูป)"}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isEn ? "Brown - Grey Winding" : "สายสี น้ำตาล กับ เทา"}
                    </span>
                  </div>
                )}
              </div>

              {/* Measurement Text Matching Excel */}
              <div className="text-center text-[10.5px] leading-tight font-medium w-full pt-1 border-t border-gray-200">
                <div>{isEn ? "Winding resistance between" : "วัดความต้านทานของขดลวดระหว่าง"}</div>
                <div className="mt-0.5">
                  {isEn ? (
                    <>
                      Brown & Grey Wire ={" "}
                      <span className="font-bold text-red-600 font-mono text-[13px]">
                        {valBrownGrey}
                      </span>{" "}
                      Ω
                    </>
                  ) : (
                    <>
                      สายสี น้ำตาล กับ เทา เท่ากับ{" "}
                      <span className="font-bold text-red-600 font-mono text-[13px]">
                        {valBrownGrey}
                      </span>{" "}
                      Ω
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Megger Insulation Resistance & Recommendations / Spare Parts */}
          {(hasInsulation ||
            displayRecommendations ||
            (Array.isArray(displayRequireParts) && displayRequireParts.length > 0)) && (
            <div className="border border-black p-2.5 mb-3 text-[10.5px] space-y-1.5 bg-neutral-50/50">
              {hasInsulation && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-800">
                  <span className="font-bold">
                    {isEn
                      ? "Insulation Resistance (Megger to Frame):"
                      : "การตรวจวัดค่าฉนวนขดลวดลงโครง (Megger):"}
                  </span>
                  <span>
                    U-Frame: <b className="font-mono text-cyan-800">{mm.insulationUGround || "-"} MΩ</b>
                  </span>
                  <span>
                    V-Frame: <b className="font-mono text-cyan-800">{mm.insulationVGround || "-"} MΩ</b>
                  </span>
                  <span>
                    W-Frame: <b className="font-mono text-cyan-800">{mm.insulationWGround || "-"} MΩ</b>
                  </span>
                </div>
              )}
              {displayRecommendations && (
                <div>
                  <span className="font-bold text-slate-900">
                    {isEn ? "Repair Recommendations: " : "ข้อเสนอแนะในการซ่อมแซม: "}
                  </span>
                  <span>{displayRecommendations}</span>
                </div>
              )}
              {Array.isArray(displayRequireParts) && displayRequireParts.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900">
                    {isEn ? "Required Spare Parts: " : "อะไหล่ที่ต้องเปลี่ยน: "}
                  </span>
                  <span>
                    {displayRequireParts
                      .map((p: any) => `${p.partName || "-"} (${p.qty || 1} ${isEn ? "pcs" : "ชิ้น"})`)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info (No signature box as requested) */}
        <div className="border-t border-gray-300 pt-1 text-[9.5px] print:text-[8.5px] text-gray-500 flex justify-between items-center">
          <span>{companyTitle} — Service & Quality Control</span>
          <span>{isEn ? "Electric Motor Inspection Report" : "เอกสารรายงานการตรวจเช็คมอเตอร์ไฟฟ้า"}</span>
        </div>
      </div>

      {/* Embedded Print Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .motor-fault-report-page {
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
          .motor-photo-box {
            height: 140px !important;
            max-height: 140px !important;
            overflow: hidden !important;
          }
          .motor-photo-box img {
            max-height: 132px !important;
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
