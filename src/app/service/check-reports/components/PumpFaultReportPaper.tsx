import React, { useState, useEffect } from "react";
import { translateReportData } from "@/app/actions/translateReport";
import { Sparkles, Loader2, FileText } from "lucide-react";

interface PumpFaultReportPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function PumpFaultReportPaper({
  report,
  lang = "TH",
  className = "",
}: PumpFaultReportPaperProps) {
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
  const pumpBodyPhoto = photos.front?.[0] || photos.side?.[0];

  // Collect damaged parts photos
  const damagedPartPhotos: { url: string; title: string; enTitle: string }[] = [];
  if (photos.inside?.[0]) {
    damagedPartPhotos.push({
      url: photos.inside[0],
      title: "เสื้อปั๊ม / เบ้าใบพัด (Diffuser / Stage Bowl)",
      enTitle: "Diffuser / Stage Bowl",
    });
  }
  if (photos.left?.[0]) {
    damagedPartPhotos.push({
      url: photos.left[0],
      title: "ใบพัดปั๊มน้ำ (Impeller)",
      enTitle: "Impeller",
    });
  }
  if (photos.right?.[0]) {
    damagedPartPhotos.push({
      url: photos.right[0],
      title: "บูช / ปลอกเพลา / แกนเพลา / ซีล (Bushing / Sleeve / Shaft)",
      enTitle: "Bushing / Sleeve / Shaft",
    });
  }
  if (photos.top?.[0]) {
    damagedPartPhotos.push({
      url: photos.top[0],
      title: "เศษชิ้นส่วนที่แตกหัก (Broken Fragments)",
      enTitle: "Broken Fragments",
    });
  }
  if (Array.isArray(photos.damage)) {
    photos.damage.forEach((url: string, idx: number) => {
      if (url && !damagedPartPhotos.some((p) => p.url === url)) {
        damagedPartPhotos.push({
          url,
          title: `จุดชำรุดเสียหายที่ ${damagedPartPhotos.length + 1}`,
          enTitle: `Damaged Component ${damagedPartPhotos.length + 1}`,
        });
      }
    });
  }
  if (Array.isArray(photos.other)) {
    photos.other.forEach((url: string, idx: number) => {
      if (url && !damagedPartPhotos.some((p) => p.url === url)) {
        damagedPartPhotos.push({
          url,
          title: `รูปประกอบชิ้นส่วนที่ ${damagedPartPhotos.length + 1}`,
          enTitle: `Part Detail ${damagedPartPhotos.length + 1}`,
        });
      }
    });
  }

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

  const warrantyText = isEn
    ? isWarrantyValid
      ? "In Warranty"
      : isWarrantyExpired
      ? "Out of Warranty"
      : report?.warrantyStatus || "In Warranty"
    : isWarrantyValid
    ? "รับประกัน"
    : isWarrantyExpired
    ? "หมดประกัน"
    : report?.warrantyStatus || "รับประกัน";

  const isMotor = report?.equipmentType === "MOTOR";
  const mainTitle = isMotor ? "MOTOR FAULTY REPORT" : "PUMP FAULTY REPORT";
  const problemTitle = isEn ? "Problem 1" : "ปัญหา 1";
  const problemDescription =
    displayCauseOfFault ||
    displaySymptoms ||
    (isEn ? "The pump impeller is damaged." : "ใบพัดปั๊มได้รับการเสียหาย");

  return (
    <div
      className={`pump-fault-report-container w-full max-w-[840px] mx-auto text-black font-['Sarabun',sans-serif] ${className}`}
    >
      {/* ============================================================== */}
      {/* PAGE 1: MAIN REPORT (11 COLUMNS + PUMP NAMEPLATE)              */}
      {/* ============================================================== */}
      <div
        className="page-1 print-page-sheet bg-white border-2 border-black p-6 text-[11px] leading-snug flex flex-col justify-between box-border min-h-[1050px] shadow-sm mb-6 print:mb-0 print:border-none print:p-0 print:shadow-none print:min-h-0 print:block"
        style={{ boxSizing: "border-box" }}
      >
        <div>
          {/* Header Row: Company Title & Document Number */}
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
                    ? "Water Pump & Motor Inspection Division — Pre-Inspection & Fault Report"
                    : "ฝ่ายบริการและตรวจเช็คปั๊มน้ำ — รายงานสาเหตุการชำรุดเสียหาย"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[12px] text-black">
                No. {report?.crNumber || "6811024"}
              </div>
              {report?.convertedJobNumber && (
                <div className="text-[10px] font-bold text-gray-700 font-mono">
                  Ref RO: {report.convertedJobNumber}
                </div>
              )}
              <div className="text-[9px] text-gray-500 font-medium">
                {isEn ? "Page 1 of 2" : "หน้าที่ 1 จาก 2"}
              </div>
            </div>
          </div>

          {/* Title Matching Excel Template */}
          <div className="text-center my-3">
            <h1 className="text-lg font-black uppercase tracking-wider text-black">
              {mainTitle}
            </h1>
            <div className="text-[11px] text-gray-600 font-medium">
              {isEn
                ? "(Water Pump Inspection & Faulty Report)"
                : "(รายงานการตรวจเช็คและสาเหตุการชำรุดเสียหายของปั๊มน้ำ)"}
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

          {/* 11-Column Excel Table matching the user's uploaded template */}
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
                  <th className="border border-black p-1.5 w-[8%]">{isEn ? "Pump Size" : "ขนาดของปั๊ม"}</th>
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
                  <td className="border border-black p-2 font-bold">
                    {report?.motorKw || "-"}
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

          {/* Subtitle: เนมเพลทปั๊ม (PUMP NAMEPLATE) */}
          <div className="text-center font-bold text-[14px] text-[#0066cc] my-3">
            {isEn ? "PUMP NAMEPLATE" : "เนมเพลทปั๊ม"}
          </div>

          {/* Big Nameplate Photo Centered */}
          <div className="w-full flex justify-center mb-4">
            <div className="border border-black p-2 bg-white w-full max-w-[620px] flex flex-col items-center">
              <div className="pump-nameplate-frame w-full h-72 sm:h-80 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                {nameplatePhoto ? (
                  <img
                    src={nameplatePhoto}
                    alt={isEn ? "Pump Nameplate" : "เนมเพลทปั๊ม"}
                    className="max-h-full max-w-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-4">
                    <span className="text-[12px] block font-mono font-bold">
                      {isEn ? "(No Pump Nameplate Photo)" : "(ยังไม่มีรูปถ่ายเนมเพลทปั๊มน้ำ)"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {isEn
                        ? "Photo of Pump Specification & Model Nameplate"
                        : "ภาพถ่ายป้ายสเปกและหมายเลขซีเรียลปั๊มน้ำ (Nameplate)"}
                    </span>
                  </div>
                )}
              </div>
              <div className="font-bold text-[11px] mt-2 text-center text-slate-800">
                {isEn ? "Pump Specification Nameplate" : "ป้ายเนมเพลทปั๊มน้ำ (Pump Nameplate)"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info on Page 1 */}
        <div className="border-t border-gray-300 pt-2 text-[10px] text-gray-500 flex justify-between items-center">
          <span>{companyTitle} — Service & Quality Control</span>
          <span>{isEn ? "Continued on Page 2 (Damaged Parts Attachment)" : "ดูต่อหน้าที่ 2 (เอกสารแนบแสดงจุดชำรุดเสียหาย)"}</span>
        </div>
      </div>

      {/* Screen Page Break Divider (Hidden when printing) */}
      <div className="w-full my-4 py-2 border-y-2 border-dashed border-gray-300 text-center text-xs font-bold text-gray-500 print:hidden flex items-center justify-center gap-2 bg-gray-50">
        <FileText className="w-4 h-4 text-gray-500" />
        <span>หน้าที่ 2: เอกสารแนบแสดงจุดชำรุดเสียหาย (Damaged Parts Attachment)</span>
      </div>

      {/* ============================================================== */}
      {/* PAGE 2: ATTACHMENT (แนบปั๊มด้วย ว่าเสียส่วนไหน)                  */}
      {/* ============================================================== */}
      <div
        className="page-2 print-page-sheet bg-white border-2 border-black p-6 text-[11px] leading-snug flex flex-col justify-between box-border min-h-[1050px] shadow-sm print:border-none print:p-0 print:shadow-none print:min-h-0 print:block"
        style={{ boxSizing: "border-box" }}
      >
        <div>
          {/* Header Row on Page 2 */}
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
                    ? "Damaged Parts & Component Failure Attachment"
                    : "เอกสารแนบแสดงจุดชำรุดและชิ้นส่วนที่เสียหายของปั๊มน้ำ"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[12px] text-black">
                No. {report?.crNumber || "6811024"}
              </div>
              <div className="text-[9px] text-gray-500 font-medium">
                {isEn ? "Page 2 of 2" : "หน้าที่ 2 จาก 2"}
              </div>
            </div>
          </div>

          {/* Subtitle: ปัญหา 1 (Problem 1) on top-left in blue */}
          <div className="font-bold text-[14px] text-[#0066cc] mb-2">
            {problemTitle}
          </div>

          {/* Centered Border Box with Failure Description (matching Excel callout) */}
          <div className="w-full flex justify-center mb-4">
            <div className="border-2 border-black bg-white px-8 py-2.5 shadow-xs text-center max-w-lg">
              <span className="font-bold text-[13px] text-black">
                {problemDescription}
              </span>
            </div>
          </div>

          {/* Pump Photos Layout: Left = Full Pump, Right = Damaged Parts Grid */}
          <div className="grid grid-cols-12 gap-3 mb-4">
            {/* Left Column: Full Pump View (ภาพรวมตัวปั๊มน้ำ) */}
            <div className="col-span-12 sm:col-span-4 border border-black p-2 bg-white flex flex-col justify-between">
              <div className="pump-body-frame w-full h-80 sm:h-96 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                {pumpBodyPhoto ? (
                  <img
                    src={pumpBodyPhoto}
                    alt={isEn ? "Pump Body" : "รูปตัวปั๊มน้ำ"}
                    className="max-h-full max-w-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-2">
                    <span className="text-[11px] block font-mono font-bold">
                      {isEn ? "(No Pump Body Photo)" : "(ยังไม่มีรูปตัวปั๊มน้ำ)"}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-1 block">
                      {isEn ? "Full Pump Body / Casing View" : "ภาพถ่ายตัวปั๊มน้ำทั้งตัว / กระบอกปั๊ม"}
                    </span>
                  </div>
                )}
              </div>
              <div className="font-bold text-[11px] mt-2 text-center text-slate-800">
                {isEn ? "Pump Assembly / Body View" : "ภาพรวมตัวปั๊มน้ำ (Pump Body)"}
              </div>
            </div>

            {/* Right Column: Damaged Parts Grid (รูปชิ้นส่วนที่เสียหาย) */}
            <div className="col-span-12 sm:col-span-8 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2.5 h-full">
                {/* 1. Diffuser / Chamber / Bowl */}
                <div className="border border-black p-1.5 bg-white flex flex-col justify-between">
                  <div className="pump-part-frame w-full h-36 sm:h-44 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                    {damagedPartPhotos[0]?.url ? (
                      <img
                        src={damagedPartPhotos[0].url}
                        alt="Damaged Part 1"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center text-gray-400 p-2">
                        <span className="text-[10px] block font-bold">
                          {isEn ? "(Diffuser / Stage Bowl)" : "1. เสื้อปั๊ม / เบ้าใบพัด"}
                        </span>
                        <span className="text-[9px] text-gray-400">ภาพชิ้นส่วนที่เสียหาย</span>
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-[10px] mt-1 text-center text-slate-800 truncate">
                    {damagedPartPhotos[0]
                      ? isEn
                        ? damagedPartPhotos[0].enTitle
                        : damagedPartPhotos[0].title
                      : isEn
                      ? "1. Diffuser / Stage Bowl"
                      : "1. เสื้อปั๊ม / เบ้าใบพัด"}
                  </div>
                </div>

                {/* 2. Impeller */}
                <div className="border border-black p-1.5 bg-white flex flex-col justify-between">
                  <div className="pump-part-frame w-full h-36 sm:h-44 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                    {damagedPartPhotos[1]?.url ? (
                      <img
                        src={damagedPartPhotos[1].url}
                        alt="Damaged Part 2"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center text-gray-400 p-2">
                        <span className="text-[10px] block font-bold">
                          {isEn ? "(Pump Impeller)" : "2. ใบพัดปั๊มน้ำ (Impeller)"}
                        </span>
                        <span className="text-[9px] text-gray-400">ภาพใบพัดที่ชำรุด</span>
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-[10px] mt-1 text-center text-slate-800 truncate">
                    {damagedPartPhotos[1]
                      ? isEn
                        ? damagedPartPhotos[1].enTitle
                        : damagedPartPhotos[1].title
                      : isEn
                      ? "2. Pump Impeller"
                      : "2. ใบพัดปั๊มน้ำ (Impeller)"}
                  </div>
                </div>

                {/* 3. Bushing / Sleeve / Shaft / Seal */}
                <div className="border border-black p-1.5 bg-white flex flex-col justify-between">
                  <div className="pump-part-frame w-full h-36 sm:h-44 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                    {damagedPartPhotos[2]?.url ? (
                      <img
                        src={damagedPartPhotos[2].url}
                        alt="Damaged Part 3"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center text-gray-400 p-2">
                        <span className="text-[10px] block font-bold">
                          {isEn ? "(Bushing / Sleeve / Seal)" : "3. บูช / ปลอกเพลา / ซีล"}
                        </span>
                        <span className="text-[9px] text-gray-400">ภาพบูชหรือปลอกเพลา</span>
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-[10px] mt-1 text-center text-slate-800 truncate">
                    {damagedPartPhotos[2]
                      ? isEn
                        ? damagedPartPhotos[2].enTitle
                        : damagedPartPhotos[2].title
                      : isEn
                      ? "3. Bushing / Sleeve / Seal"
                      : "3. บูช / ปลอกเพลา / ซีล"}
                  </div>
                </div>

                {/* 4. Broken fragments / Other Damaged Parts */}
                <div className="border border-black p-1.5 bg-white flex flex-col justify-between">
                  <div className="pump-part-frame w-full h-36 sm:h-44 flex items-center justify-center overflow-hidden bg-slate-50 border border-neutral-200">
                    {damagedPartPhotos[3]?.url ? (
                      <img
                        src={damagedPartPhotos[3].url}
                        alt="Damaged Part 4"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center text-gray-400 p-2">
                        <span className="text-[10px] block font-bold">
                          {isEn ? "(Broken Fragments)" : "4. เศษชิ้นส่วนที่แตกหัก"}
                        </span>
                        <span className="text-[9px] text-gray-400">ภาพชิ้นส่วนที่แตกหัก</span>
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-[10px] mt-1 text-center text-slate-800 truncate">
                    {damagedPartPhotos[3]
                      ? isEn
                        ? damagedPartPhotos[3].enTitle
                        : damagedPartPhotos[3].title
                      : isEn
                      ? "4. Broken Fragments"
                      : "4. เศษชิ้นส่วนที่แตกหัก"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations & Required Spare Parts */}
          {(displayRecommendations ||
            (Array.isArray(displayRequireParts) && displayRequireParts.length > 0)) && (
            <div className="border border-black p-2.5 mb-4 text-[11px] space-y-1 bg-neutral-50/50">
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
      </div>

      {/* Embedded Scoped Print Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .pump-fault-report-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .page-1,
          .page-2 {
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
          .pump-nameplate-frame {
            height: 180px !important;
            max-height: 180px !important;
            overflow: hidden !important;
          }
          .pump-nameplate-frame img {
            max-height: 170px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          .pump-body-frame {
            height: 180px !important;
            max-height: 180px !important;
            overflow: hidden !important;
          }
          .pump-body-frame img {
            max-height: 172px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          .pump-part-frame {
            height: 80px !important;
            max-height: 80px !important;
            overflow: hidden !important;
          }
          .pump-part-frame img {
            max-height: 74px !important;
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
