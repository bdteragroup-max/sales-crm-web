import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintDocButton from "@/app/damage-reports/PrintDocButton";
import { Sarabun } from "next/font/google";

const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata = {
  title: "หนังสือรับทราบผลการตรวจสอบข้อเท็จจริง | Damage Report",
};

interface CompanyProfile {
  thName: string;
  enName: string;
  logo: string;
  address: string;
  phone: string;
  taxId: string;
  branchName: string;
}

export default async function AcknowledgementDocPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getUser();
  if (!session) return notFound();

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const report = await prisma.damageReport.findFirst({
    where: { OR: [{ id }, { caseNumber: id }] },
  });

  if (!report) return notFound();

  const companyMap: Record<string, CompanyProfile> = {
    TG: {
      thName: "บริษัท เทอรา กรุ๊ป จำกัด",
      enName: "TERA GROUP CO., LTD.",
      logo: "/logos/tg.png",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
      phone: "+66(0) 2328-0801-3",
      taxId: "0105553093208",
      branchName: "สำนักงานใหญ่",
    },
    TP: {
      thName: "บริษัท เทอรา พาวเวอร์ จำกัด",
      enName: "TERA POWER CO., LTD.",
      logo: "/logos/tp.png",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
      phone: "+66(0) 2328-0801-3",
      taxId: "0105561008681",
      branchName: "สำนักงานใหญ่",
    },
    TE: {
      thName: "บริษัท เทอรา อิเล็คทริค จำกัด",
      enName: "TERA ELECTRIC CO., LTD.",
      logo: "/logos/te.png",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
      phone: "+66(0) 2328-0801-3",
      taxId: "0105558055410",
      branchName: "สำนักงานใหญ่",
    },
  };

  const comp = companyMap[report.company] || companyMap["TG"];

  const formatThaiDate = (dateVal?: Date | string | null, includeTime = false) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "long",
        day: "numeric",
        ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
      }) + (includeTime ? " น." : "")
    );
  };

  const docDateFormatted = formatThaiDate(report.investigatedAt || new Date());
  const reportedDateFormatted = formatThaiDate(report.discoveredDate);
  const incidentDateFormatted = report.incidentDate
    ? formatThaiDate(report.incidentDate, true)
    : "ไม่ระบุชัดเจน / รอตรวจสอบ";

  // Helper to extract image URLs
  const normalizePhotos = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map((v: any) => (typeof v === "string" ? v : v?.url || "")).filter(Boolean);
    }
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed.map((v: any) => (typeof v === "string" ? v : v?.url || "")).filter(Boolean);
        }
      } catch {
        return [val];
      }
    }
    return [];
  };

  const damagePhotos = [
    ...normalizePhotos(report.photosDamage),
    ...normalizePhotos(report.photosFull),
    ...normalizePhotos(report.photosSerial),
    ...normalizePhotos(report.photosScene),
  ].slice(0, 4);

  return (
    <div className={`bg-slate-200/80 min-h-screen py-6 text-black print:bg-white print:p-0 print:m-0 ${sarabun.className}`}>
      {/* Print Specific CSS */}
      <style type="text/css">
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 14mm 10mm 14mm;
            }
            html, body {
              background: #fff !important;
              color: #000 !important;
              font-size: 10.5pt !important;
              line-height: 1.3 !important;
            }
            .no-print {
              display: none !important;
            }
            .page-container {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            table {
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #1e293b !important;
            }
          }
        `}
      </style>

      {/* Top Action Navigation Bar (Screen Only) */}
      <div className="no-print max-w-[210mm] mx-auto mb-3 px-2 flex items-center justify-between">
        <Link
          href={`/damage-reports/${report.id}`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายละเอียดเคส ({report.caseNumber})</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/damage-reports/${report.id}/documents/agreement`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <span>หนังสือยินยอมชดใช้ค่าเสียหาย</span>
          </Link>
          <PrintDocButton />
        </div>
      </div>

      {/* A4 Document Paper Container */}
      <div
        className="page-container bg-white shadow-2xl mx-auto border border-gray-300 rounded-sm"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "12mm 16mm 12mm 16mm",
          boxSizing: "border-box",
          color: "#0f172a",
        }}
      >
        {/* ===================== 1. OFFICIAL COMPANY HEADER ===================== */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2">
          {/* Left: Logo & Company Registration */}
          <div className="flex items-start gap-3.5 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={comp.logo}
              alt={comp.enName}
              className="object-contain"
              style={{ height: "16mm", width: "auto", minWidth: "15mm" }}
            />
            <div className="leading-tight">
              <h2 className="text-[14pt] font-bold text-slate-900 tracking-tight">{comp.thName}</h2>
              <div className="text-[8pt] font-bold text-slate-600 tracking-wide uppercase">{comp.enName}</div>
              <div className="text-[7.5pt] text-slate-600 mt-0.5 leading-snug">
                {comp.address} ({comp.branchName})
              </div>
              <div className="text-[7.5pt] text-slate-600 mt-0.5">
                โทรศัพท์: <span className="font-medium">{comp.phone}</span> | เลขประจำตัวผู้เสียภาษีอากร:{" "}
                <span className="font-semibold text-slate-800">{comp.taxId}</span>
              </div>
            </div>
          </div>

          {/* Right: Formal Registry Box */}
          <div className="w-[58mm] border border-slate-900 bg-slate-50 text-[7.5pt] leading-tight flex-shrink-0">
            <div className="bg-slate-900 text-white font-bold text-center py-0.5 px-1 tracking-wider text-[7.5pt]">
              บันทึกควบคุมเอกสารภายใน
            </div>
            <div className="p-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">เลขที่เอกสาร:</span>
                <span className="font-bold text-slate-900 font-mono text-[8.5pt]">{report.caseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">วันที่ออกหนังสือ:</span>
                <span className="font-semibold text-slate-900">{docDateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">หน่วยงาน:</span>
                <span className="font-semibold text-slate-800">ฝ่ายปฏิบัติการ / สืบสวน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">สถานะเอกสาร:</span>
                <span className="font-bold text-amber-700">ควบคุม (CONFIDENTIAL)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== 2. TITLE & SALUTATION ===================== */}
        <div className="text-center my-2">
          <div className="inline-block border-b-2 border-slate-800 pb-0.5">
            <h1 className="text-[13pt] font-bold text-slate-900 tracking-tight">
              หนังสือบันทึกรับทราบผลการตรวจสอบข้อเท็จจริง
            </h1>
          </div>
          <div className="text-[8.5pt] font-bold text-slate-700 tracking-wide mt-0.5">
            (FACT-FINDING INVESTIGATION & INCIDENT ACKNOWLEDGEMENT REPORT)
          </div>
          <div className="text-[8.5pt] font-semibold text-slate-800">
            กรณี: สินค้า อุปกรณ์ หรือทรัพย์สินของบริษัทชำรุดเสียหาย
          </div>
        </div>

        {/* Salutation / References Table */}
        <div className="border border-slate-400 bg-slate-50/60 p-1.5 mb-2 text-[8pt] leading-snug">
          <div className="grid grid-cols-12 gap-0.5">
            <div className="col-span-2 font-bold text-slate-800">เรียน:</div>
            <div className="col-span-10 text-slate-900">
              กรรมการผู้จัดการ, ผู้จัดการฝ่ายทรัพยากรบุคคล (HR) และผู้บริหารสายงานที่เกี่ยวข้อง
            </div>

            <div className="col-span-2 font-bold text-slate-800">อ้างถึง:</div>
            <div className="col-span-10 text-slate-900">
              ใบแจ้งเหตุสินค้า/ทรัพย์สินชำรุดเสียหาย เลขที่{" "}
              <span className="font-bold font-mono text-slate-900">{report.caseNumber}</span> ลงวันที่{" "}
              <span>{reportedDateFormatted}</span>
            </div>

            <div className="col-span-2 font-bold text-slate-800">วัตถุประสงค์:</div>
            <div className="col-span-10 text-slate-900">
              เพื่อบันทึกผลการตรวจสอบข้อเท็จจริง สภาพความเสียหาย ลำดับเหตุการณ์ สาเหตุ และมาตรการป้องกัน
              เพื่อให้พนักงานผู้เกี่ยวข้องและคณะทำงานได้รับทราบร่วมกันอย่างเป็นทางการ
            </div>
          </div>
        </div>

        {/* ===================== SECTION 1: PRODUCT & ASSET DETAILS ===================== */}
        <div className="mb-2 avoid-break">
          <div className="bg-slate-800 text-white font-bold text-[8.5pt] px-2 py-0.5 flex items-center justify-between">
            <span>ส่วนที่ ๑: ข้อมูลสินค้าและทรัพย์สินที่ชำรุดเสียหาย (PRODUCT & ASSET DETAILS)</span>
            <span className="text-[7.5pt] font-normal opacity-90">ข้อมูลตามทะเบียนและคลังสินค้า</span>
          </div>
          <table className="w-full border-collapse border border-slate-700 text-[8pt]" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="w-[20%] bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  ชื่อสินค้า / ทรัพย์สิน
                </td>
                <td className="w-[30%] p-1 border border-slate-400 font-bold text-slate-900">
                  {report.itemName}
                </td>
                <td className="w-[20%] bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  รหัสสินค้า (Item Code)
                </td>
                <td className="w-[30%] p-1 border border-slate-400 font-mono font-semibold text-slate-800">
                  {report.itemCode || "-"}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  รุ่น / ขนาด (Model/Spec)
                </td>
                <td className="p-1 border border-slate-400 font-semibold text-slate-900">
                  {report.itemModel || "-"}
                </td>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  Serial No. / Lot No.
                </td>
                <td className="p-1 border border-slate-400 font-mono font-bold text-red-700">
                  {report.serialOrLot || "-"}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  จำนวนที่ชำรุดเสียหาย
                </td>
                <td className="p-1 border border-slate-400 font-bold text-slate-900">
                  <span className="text-red-600 font-bold">{report.damagedQuantity}</span> {report.unit} (จากทั้งหมด{" "}
                  {report.quantity} {report.unit})
                </td>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  ลักษณะความเสียหาย
                </td>
                <td className="p-1 border border-slate-400 font-semibold text-slate-900">
                  {report.damageType} {report.damagePosition ? `(บริเวณ: ${report.damagePosition})` : ""}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  สถานที่เก็บ / การกักกัน
                </td>
                <td className="p-1 border border-slate-400 text-slate-900">
                  {report.currentLocation || report.initialStorage || "-"}
                  <span className="text-slate-500 text-[7.5pt] block">
                    (สถานะการกักกัน: {report.isQuarantined ? "แยกกักกันสินค้าเสียหายแล้ว" : "ปกติ"})
                  </span>
                </td>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  มูลค่าประเมินความเสียหาย
                </td>
                <td className="p-1 border border-slate-400 font-semibold text-slate-900">
                  {report.estimatedCost ? `${report.estimatedCost.toLocaleString()} บาท` : "รอประเมินทางเทคนิค"}
                  {report.actualCost ? (
                    <span className="text-slate-600 text-[7.5pt] block">
                      (มูลค่าจริงตามบัญชี: {report.actualCost.toLocaleString()} บาท)
                    </span>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===================== SECTION 2: INCIDENT & PERSONNEL ===================== */}
        <div className="mb-2 avoid-break">
          <div className="bg-slate-800 text-white font-bold text-[8.5pt] px-2 py-0.5 flex items-center justify-between">
            <span>ส่วนที่ ๒: วัน เวลา สถานที่เกิดเหตุ และบุคคลผู้เกี่ยวข้อง (INCIDENT & PERSONNEL)</span>
            <span className="text-[7.5pt] font-normal opacity-90">ข้อมูลการสอบสวนเบื้องต้น</span>
          </div>
          <table className="w-full border-collapse border border-slate-700 text-[8pt]" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="w-[20%] bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  วัน-เวลาที่เกิดเหตุ
                </td>
                <td className="w-[30%] p-1 border border-slate-400 font-semibold text-slate-900">
                  {incidentDateFormatted}
                </td>
                <td className="w-[20%] bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  วัน-เวลาที่ตรวจพบ
                </td>
                <td className="w-[30%] p-1 border border-slate-400 font-semibold text-slate-900">
                  {formatThaiDate(report.discoveredDate, true)}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  สถานที่เกิดเหตุ / ไซต์งาน
                </td>
                <td className="p-1 border border-slate-400 font-semibold text-slate-900">
                  {report.siteLocation || report.branch || report.warehouse || "รอระบุ / อยู่ระหว่างตรวจสอบ"}
                </td>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  ผู้รายงานเหตุ (Reporter)
                </td>
                <td className="p-1 border border-slate-400 text-slate-900">
                  <span className="font-semibold">{report.reporterName}</span>{" "}
                  <span className="text-slate-500 text-[7.5pt]">({report.reporterDepartment || "ผู้รับผิดชอบ"})</span>
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  ผู้ปฏิบัติงานขณะเกิดเหตุ
                </td>
                <td className="p-1 border border-slate-400 font-bold text-slate-900">
                  {report.operatorName || "-"}
                </td>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  สถานะผู้ปฏิบัติงาน
                </td>
                <td className="p-1 border border-slate-400 font-semibold text-slate-900">
                  {report.operatorType === "CONTRACTOR"
                    ? `ผู้รับเหมาภายนอก (${report.contractorName || "ไม่ระบุบริษัท"})`
                    : "พนักงานประจำบริษัท"}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  ผู้สั่งงาน / ผู้ควบคุมงาน
                </td>
                <td className="p-1 border border-slate-400 text-slate-900 font-medium">
                  {report.assignerName || report.supervisorName || "-"}
                </td>
                <td className="bg-slate-100 font-semibold p-1 border border-slate-400 text-slate-700">
                  พยาน / ผู้เห็นเหตุการณ์
                </td>
                <td className="p-1 border border-slate-400 text-slate-900">
                  {report.witnesses || "ไม่มีพยานบุคคลในขณะเกิดเหตุ"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===================== SECTION 3: TIMELINE & INVESTIGATION ===================== */}
        <div className="mb-2 avoid-break">
          <div className="bg-slate-800 text-white font-bold text-[8.5pt] px-2 py-0.5 flex items-center justify-between">
            <span>ส่วนที่ ๓: ลำดับเหตุการณ์และสรุปผลการตรวจสอบข้อเท็จจริง (TIMELINE & INVESTIGATION)</span>
            <span className="text-[7.5pt] font-normal opacity-90">ผลการสอบสวนข้อเท็จจริง</span>
          </div>
          <div className="border border-slate-700 p-2 text-[8pt] space-y-1.5 leading-relaxed">
            {/* 3 Steps Timeline */}
            <div className="grid grid-cols-3 gap-1.5 pb-1.5 border-b border-slate-300">
              <div className="bg-slate-50 border border-slate-300 p-1.5 rounded-none">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 mb-0.5 text-[7.5pt] text-blue-900">
                  ๓.๑ สภาพการณ์ก่อนเกิดเหตุ (Pre-Incident)
                </div>
                <p className="text-slate-800 text-[7.5pt] leading-snug">
                  {report.beforeIncident || "ปฏิบัติงานตามภารกิจและขั้นตอนการทำงานที่ได้รับมอบหมายตามปกติ"}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-300 p-1.5 rounded-none">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 mb-0.5 text-[7.5pt] text-amber-900">
                  ๓.๒ เหตุการณ์ขณะเกิดเหตุ (Incident)
                </div>
                <p className="text-slate-800 text-[7.5pt] leading-snug">
                  {report.duringIncident || "เกิดเหตุการณ์ความเสียหายต่อสินค้า/อุปกรณ์ตามที่ระบุในรายการความเสียหาย"}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-300 p-1.5 rounded-none">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 mb-0.5 text-[7.5pt] text-emerald-900">
                  ๓.๓ การปฏิบัติการหลังเกิดเหตุ (Post-Incident)
                </div>
                <p className="text-slate-800 text-[7.5pt] leading-snug">
                  {report.afterIncident ||
                    "ได้ทำการระงับเหตุ ตรวจสอบสภาพเบื้องต้น แยกสินค้าไว้ และรายงานให้ผู้บังคับบัญชาทราบตามลำดับ"}
                </p>
              </div>
            </div>

            {/* Fact Findings & Root Cause */}
            <div className="space-y-1 text-[8pt]">
              <div>
                <span className="font-bold text-slate-900">๓.๔ สรุปข้อเท็จจริงที่ยุติจากการตรวจสอบ (Established Facts): </span>
                <span className="text-slate-800">
                  {report.provenFacts ||
                    "จากการตรวจสอบสภาพความเสียหายและสอบปากคำผู้เกี่ยวข้อง คณะทำงานสรุปข้อเท็จจริงได้ว่าเหตุการณ์เกิดขึ้นในระหว่างปฏิบัติงานตามคำให้การ และความเสียหายเกิดขึ้นจริงตามสภาพที่ปรากฏ"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900">๓.๕ การวิเคราะห์สาเหตุหลักแห่งความเสียหาย (Root Cause Analysis): </span>
                <span className="text-slate-800">
                  {report.rootCause || report.suspectedCause || "อยู่ระหว่างการสรุปผลการวิเคราะห์สาเหตุทางเทคนิค"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== SECTION 4: CAPA ===================== */}
        <div className="mb-2 avoid-break">
          <div className="bg-slate-800 text-white font-bold text-[8.5pt] px-2 py-0.5 flex items-center justify-between">
            <span>ส่วนที่ ๔: มาตรการแก้ไข ป้องกัน และการติดตามผล (CORRECTIVE & PREVENTIVE ACTION)</span>
            <span className="text-[7.5pt] font-normal opacity-90">แผนป้องกันการเกิดเหตุซ้ำ (CAPA)</span>
          </div>
          <table className="w-full border-collapse border border-slate-700 text-[8pt]" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="w-[62%] p-1.5 border border-slate-400 text-slate-800 align-top">
                  <div className="font-bold text-slate-900 mb-0.5">มาตรการแก้ไขและแนวทางป้องกันมิให้เกิดเหตุซ้ำ:</div>
                  <p className="leading-snug">
                    {report.preventiveAction ||
                      "เน้นย้ำและซักซ้อมขั้นตอนความปลอดภัยในการเคลื่อนย้ายสินค้า ตรวจสอบอุปกรณ์ยกและพื้นที่หน้างานก่อนปฏิบัติงานทุกครั้ง"}
                  </p>
                </td>
                <td className="w-[38%] p-1.5 border border-slate-400 text-slate-800 align-top bg-slate-50/50">
                  <div className="font-bold text-slate-900 mb-0.5">การมอบหมายและติดตามผล:</div>
                  <div className="space-y-0.5 text-[7.5pt]">
                    <div>
                      <span className="text-slate-500">ผู้รับผิดชอบ:</span>{" "}
                      <span className="font-bold text-slate-900">
                        {report.preventiveOwner || report.supervisorName || "หัวหน้างานฝ่ายปฏิบัติการ"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">กำหนดติดตาม:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {formatThaiDate(report.preventiveFollowUpDate) !== "-"
                          ? formatThaiDate(report.preventiveFollowUpDate)
                          : "ภายใน ๗ วันทำการ"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">ผู้ตรวจผล:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {report.investigatedBy || report.supervisorName || "-"}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===================== SECTION 5: EVIDENCE PHOTOS ===================== */}
        <div className="mb-2 avoid-break">
          <div className="bg-slate-800 text-white font-bold text-[8.5pt] px-2 py-0.5 flex items-center justify-between">
            <span>ส่วนที่ ๕: หลักฐานภาพถ่ายประกอบการตรวจสอบ (PHOTOGRAPHIC EVIDENCE)</span>
            <span className="text-[7.5pt] font-normal opacity-90">ภาพถ่ายจุดเสียหายและอุปกรณ์</span>
          </div>
          <div className="border border-slate-700 p-1.5 text-center">
            {damagePhotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {damagePhotos.map((url, idx) => (
                  <div key={idx} className="border border-slate-300 p-1 bg-slate-50">
                    <div className="h-[24mm] flex items-center justify-center overflow-hidden bg-white border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Evidence ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="text-[7pt] text-slate-600 font-semibold mt-0.5">
                      {idx === 0
                        ? "ภาพที่ ๑: จุดชำรุดเสียหาย"
                        : idx === 1
                        ? "ภาพที่ ๒: ภาพรวมสินค้า/Serial"
                        : `ภาพที่ ${idx + 1}: หลักฐานประกอบ`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-slate-500 text-[7.5pt] italic bg-slate-50">
                [ ได้จัดเก็บบันทึกภาพถ่ายและหลักฐานการตรวจสอบฉบับจริงในระบบฐานข้อมูล CRM เรียบร้อยแล้ว / แนบในภาคผนวกรายงาน ]
              </div>
            )}
          </div>
        </div>

        {/* ===================== LEGAL PROTECTION DECLARATION ===================== */}
        <div className="mb-2.5 p-2 border-2 border-slate-800 bg-slate-50/80 text-[7.5pt] leading-tight text-slate-800 avoid-break">
          <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5 text-[8pt]">
            <span className="w-1.5 h-1.5 bg-slate-900 inline-block rounded-full"></span>
            <span>คำรับรองและข้อสงวนสิทธิ์ตามบทบัญญัติแห่งกฎหมาย (LEGAL DECLARATION & NOTICE)</span>
          </div>
          <p className="text-justify leading-snug">
            ข้าพเจ้าพนักงานผู้มีรายนามด้านล่าง ขอรับรองว่าได้รับทราบและทำความเข้าใจข้อเท็จจริง ลำดับเหตุการณ์
            ตลอดจนผลการตรวจสอบความเสียหายที่ระบุไว้ในหนังสือฉบับนี้โดยละเอียดครบถ้วนแล้ว การลงลายมือชื่อในหนังสือฉบับนี้เป็นการลงนามเพื่อ{" "}
            <span className="font-bold underline text-slate-900">
              "รับทราบผลการตรวจสอบข้อเท็จจริงและลำดับเหตุการณ์เท่านั้น" มิใช่การยอมรับสภาพหนี้
              หรือการยินยอมให้บริษัทหักเงินเดือน ค่าจ้าง เงินได้ หรือค่าตอบแทนใดๆ ทั้งสิ้นโดยอัตโนมัติ
            </span>{" "}
            ทั้งนี้ การพิจารณาความรับผิดทางวินัยและทางแพ่ง ตลอดจนการชดใช้ค่าเสียหาย (หากมี)
            จะต้องดำเนินการตามขั้นตอนของฝ่ายทรัพยากรบุคคลและอยู่ภายใต้กรอบของพระราชบัญญัติคุ้มครองแรงงาน พ.ศ. ๒๕๔๑
            อย่างถูกต้องตามกฎหมาย
          </p>
        </div>

        {/* ===================== SIGNATURE BLOCKS (ROCK-SOLID TABLE LAYOUT) ===================== */}
        <div className="avoid-break mt-1">
          <div className="text-center font-bold text-[8.5pt] text-slate-800 mb-1.5">
            การลงนามรับทราบผลการตรวจสอบข้อเท็จจริงและรับรองเอกสาร
          </div>

          <table
            className="w-full border-collapse border border-slate-700 text-[8pt]"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr className="bg-slate-100 text-slate-900 text-[8pt] font-bold">
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๑. พนักงานผู้รับทราบ
                </th>
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๒. หัวหน้างานผู้ตรวจสอบ
                </th>
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๓. ตัวแทนฝ่ายบุคคล (HR)
                </th>
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๔. ผู้มีอำนาจอนุมัติ / ผู้บริหาร
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* 1. Employee / Acknowledger */}
                <td className="border border-slate-400 p-2 text-center align-top bg-white">
                  <div className="h-6"></div>
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] text-slate-500 whitespace-nowrap">
                    <span>ลงชื่อ</span>
                    <span className="inline-block border-b border-dotted border-slate-500 w-28"></span>
                  </div>
                  <div className="font-bold text-slate-900 text-[8pt] mt-1.5 leading-tight flex items-center justify-center gap-0.5">
                    <span>(</span>
                    <span className="truncate max-w-[34mm]">
                      {report.operatorName || report.reporterName || "........................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="text-[7pt] text-slate-600 mt-0.5 whitespace-nowrap">
                    พนักงานผู้ปฏิบัติงาน / ผู้รับทราบ
                  </div>
                  <div className="text-[7pt] text-slate-500 mt-1.5 pt-1 border-t border-slate-200 whitespace-nowrap">
                    วันที่ ..... / ..... / ...........
                  </div>
                </td>

                {/* 2. Supervisor / Investigator */}
                <td className="border border-slate-400 p-2 text-center align-top bg-white">
                  <div className="h-6"></div>
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] text-slate-500 whitespace-nowrap">
                    <span>ลงชื่อ</span>
                    <span className="inline-block border-b border-dotted border-slate-500 w-28"></span>
                  </div>
                  <div className="font-bold text-slate-900 text-[8pt] mt-1.5 leading-tight flex items-center justify-center gap-0.5">
                    <span>(</span>
                    <span className="truncate max-w-[34mm]">
                      {report.investigatedBy || report.supervisorName || "........................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="text-[7pt] text-slate-600 mt-0.5 whitespace-nowrap">
                    หัวหน้างาน / ผู้ตรวจสอบ
                  </div>
                  <div className="text-[7pt] text-slate-500 mt-1.5 pt-1 border-t border-slate-200 whitespace-nowrap">
                    วันที่ ..... / ..... / ...........
                  </div>
                </td>

                {/* 3. HR Representative */}
                <td className="border border-slate-400 p-2 text-center align-top bg-white">
                  <div className="h-6"></div>
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] text-slate-500 whitespace-nowrap">
                    <span>ลงชื่อ</span>
                    <span className="inline-block border-b border-dotted border-slate-500 w-28"></span>
                  </div>
                  <div className="font-bold text-slate-900 text-[8pt] mt-1.5 leading-tight flex items-center justify-center gap-0.5">
                    <span>(</span>
                    <span className="inline-block border-b border-dotted border-slate-400 w-28"></span>
                    <span>)</span>
                  </div>
                  <div className="text-[7pt] text-slate-600 mt-0.5 whitespace-nowrap">
                    เจ้าหน้าที่ฝ่ายทรัพยากรบุคคล
                  </div>
                  <div className="text-[7pt] text-slate-500 mt-1.5 pt-1 border-t border-slate-200 whitespace-nowrap">
                    วันที่ ..... / ..... / ...........
                  </div>
                </td>

                {/* 4. Company Authorized Management */}
                <td className="border border-slate-400 p-2 text-center align-top bg-white">
                  <div className="h-6"></div>
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] text-slate-500 whitespace-nowrap">
                    <span>ลงชื่อ</span>
                    <span className="inline-block border-b border-dotted border-slate-500 w-28"></span>
                  </div>
                  <div className="font-bold text-slate-900 text-[8pt] mt-1.5 leading-tight flex items-center justify-center gap-0.5">
                    <span>(</span>
                    <span className="truncate max-w-[34mm]">
                      {report.approvedBy || "........................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="text-[7pt] text-slate-600 mt-0.5 whitespace-nowrap">
                    กรรมการ / ผู้แทนฝ่ายบริหาร
                  </div>
                  <div className="text-[7pt] text-slate-500 mt-1.5 pt-1 border-t border-slate-200 whitespace-nowrap">
                    วันที่ ..... / ..... / ...........
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Audit Mark */}
        <div className="mt-2 pt-1 border-t border-slate-200 text-center text-[7pt] text-slate-400 flex items-center justify-between">
          <span>ระบบบันทึกความเสียหายสินค้าและทรัพย์สิน | Sales CRM & Damage Management System</span>
          <span>หน้า ๑ จาก ๑ (บันทึกข้อเท็จจริงทางการ)</span>
          <span>เอกสารควบคุม เลขที่ {report.caseNumber}</span>
        </div>
      </div>
    </div>
  );
}
