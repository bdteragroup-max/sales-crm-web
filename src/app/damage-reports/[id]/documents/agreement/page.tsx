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
  title: "หนังสือยินยอมและข้อตกลงการชดใช้ค่าเสียหาย | Damage Report",
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

export default async function CompensationAgreementDocPage({
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

  const formatThaiDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const docDateFormatted = formatThaiDate(report.sentToHrAt || report.updatedAt || new Date());
  const approvedAmount = report.hrApprovedAmount || report.actualCost || report.estimatedCost || 0;
  const installments = report.hrInstallments || 1;
  const perInstallment = installments > 0 ? (approvedAmount / installments).toFixed(2) : approvedAmount.toFixed(2);

  const dueFormatted = report.hrDueDate
    ? formatThaiDate(report.hrDueDate)
    : "ตามรอบการคำนวณจ่ายเงินเดือนปกติ";

  return (
    <div className={`bg-slate-200/80 min-h-screen py-8 text-black print:bg-white print:p-0 print:m-0 ${sarabun.className}`}>
      {/* Print Specific CSS */}
      <style type="text/css">
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 12mm 15mm;
            }
            html, body {
              background: #fff !important;
              color: #000 !important;
              font-size: 11pt !important;
              line-height: 1.35 !important;
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
              border: 1px solid #111 !important;
            }
          }
        `}
      </style>

      {/* Top Action Navigation Bar (Screen Only) */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 px-3 flex items-center justify-between">
        <Link
          href={`/damage-reports/${report.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายละเอียดเคส ({report.caseNumber})</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/damage-reports/${report.id}/documents/acknowledgement`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <span>หนังสือรับทราบข้อเท็จจริง</span>
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
          padding: "16mm 18mm 16mm 18mm",
          boxSizing: "border-box",
          color: "#0f172a",
        }}
      >
        {/* ===================== 1. OFFICIAL COMPANY HEADER ===================== */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
          {/* Left: Logo & Company Registration */}
          <div className="flex items-start gap-4 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={comp.logo}
              alt={comp.enName}
              className="object-contain"
              style={{ height: "18mm", width: "auto", minWidth: "16mm" }}
            />
            <div className="leading-tight">
              <h2 className="text-[15pt] font-bold text-slate-900 tracking-tight">{comp.thName}</h2>
              <div className="text-[8.5pt] font-bold text-slate-600 tracking-wide uppercase">{comp.enName}</div>
              <div className="text-[8pt] text-slate-600 mt-1 leading-snug">
                {comp.address} ({comp.branchName})
              </div>
              <div className="text-[8pt] text-slate-600 mt-0.5">
                โทรศัพท์: <span className="font-medium">{comp.phone}</span> | เลขประจำตัวผู้เสียภาษีอากร:{" "}
                <span className="font-semibold text-slate-800">{comp.taxId}</span>
              </div>
            </div>
          </div>

          {/* Right: Formal Registry Box */}
          <div className="w-[62mm] border border-slate-900 bg-slate-50 text-[8pt] leading-tight flex-shrink-0">
            <div className="bg-slate-900 text-white font-bold text-center py-1 px-1 tracking-wider text-[8pt]">
              บันทึกข้อตกลงและสัญญาภายใน
            </div>
            <div className="p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">เลขที่เอกสารสัญญา:</span>
                <span className="font-bold text-slate-900 font-mono text-[9pt]">{report.caseNumber}-AGR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">วันที่ทำสัญญา:</span>
                <span className="font-semibold text-slate-900">{docDateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">หน่วยงาน:</span>
                <span className="font-semibold text-slate-800">ฝ่ายทรัพยากรบุคคล (HR)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">เคสอ้างอิง:</span>
                <span className="font-bold font-mono text-red-700">{report.caseNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== 2. TITLE ===================== */}
        <div className="text-center my-3">
          <div className="inline-block border-b-2 border-slate-800 pb-0.5">
            <h1 className="text-[14.5pt] font-bold text-slate-900 tracking-tight">
              หนังสือยินยอมและข้อตกลงการชดใช้ค่าเสียหาย
            </h1>
          </div>
          <div className="text-[9.5pt] font-bold text-slate-700 tracking-wide mt-0.5">
            (COMPENSATION AGREEMENT & CONSENT FOR DAMAGE INDEMNIFICATION)
          </div>
          <div className="text-[9pt] font-semibold text-slate-700 mt-0.5">
            กรณีสินค้าหรือทรัพย์สินของบริษัทชำรุดเสียหาย อ้างอิงเคสเลขที่ {report.caseNumber}
          </div>
        </div>

        {/* ===================== 3. CONTRACT PREAMBLE ===================== */}
        <div className="border border-slate-400 bg-slate-50/60 p-2.5 mb-3 text-[9pt] leading-relaxed">
          <p className="indent-8 text-justify text-slate-900">
            หนังสือยินยอมและบันทึกข้อตกลงฉบับนี้ จัดทำขึ้น ณ <strong>{comp.thName}</strong> เมื่อวันที่{" "}
            <strong>{docDateFormatted}</strong> ระหว่าง <strong>{comp.thName}</strong> (ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า{" "}
            <strong>&quot;บริษัท&quot;</strong>) ฝ่ายหนึ่ง กับ{" "}
            <strong>{report.hrSigneeName || report.operatorName || "...................................................."}</strong>{" "}
            (ซึ่งต่อไปนี้ในสัญญานี้จะเรียกว่า <strong>&quot;ผู้ให้ความยินยอม / ผู้ชดใช้&quot;</strong>) อีกฝ่ายหนึ่ง
          </p>
          <p className="mt-1 text-slate-800 text-[8.5pt]">
            โดยคู่สัญญาทั้งสองฝ่ายได้ตกลงและยินยอมผูกพันตามข้อความและเงื่อนไขแห่งสัญญานี้ดังต่อไปนี้:
          </p>
        </div>

        {/* ===================== 4. CONTRACT ARTICLES ===================== */}
        <div className="space-y-2.5 text-[8.5pt] text-slate-900 leading-relaxed mb-3">
          {/* Article 1 */}
          <div className="border border-slate-300 p-2 bg-white rounded-none">
            <div className="font-bold text-slate-900 text-[9pt] border-b border-slate-200 pb-1 mb-1">
              ข้อ ๑. มูลเหตุแห่งความเสียหายและข้อเท็จจริงที่รับทราบ
            </div>
            <p className="indent-6 text-justify text-slate-800">
              ตามที่ได้เกิดเหตุการณ์ความเสียหายต่อสินค้า/ทรัพย์สินของบริษัท ได้แก่{" "}
              <strong>{report.itemName}</strong> {report.itemCode ? `(รหัสสินค้า: ${report.itemCode})` : ""} รุ่น/สเปก:{" "}
              {report.itemModel || "-"} Serial No.: {report.serialOrLot || "-"} จำนวน{" "}
              <strong className="text-red-700">{report.damagedQuantity}</strong> {report.unit} ตามรายงานการตรวจสอบข้อเท็จจริงเลขที่{" "}
              <strong className="font-mono">{report.caseNumber}</strong> ซึ่งผู้ให้ความยินยอมได้รับทราบข้อเท็จจริง
              และยอมรับว่าความเสียหายดังกล่าวเกิดขึ้นในระหว่างการปฏิบัติงานจริง
            </p>
          </div>

          {/* Article 2 */}
          <div className="border border-slate-300 p-2 bg-white rounded-none">
            <div className="font-bold text-slate-900 text-[9pt] border-b border-slate-200 pb-1 mb-1">
              ข้อ ๒. จำนวนเงินค่าเสียหายที่ตกลงชดใช้
            </div>
            <p className="indent-6 text-justify text-slate-800">
              ผู้ให้ความยินยอมตกลงและยินยอมรับผิดชอบชดใช้ค่าเสียหายให้แก่บริษัท เป็นจำนวนเงินรวมทั้งสิ้น{" "}
              <strong className="text-red-700 text-[9.5pt]">
                {approvedAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
              </strong>{" "}
              ({/* Thai Baht text can be added here */})
              {report.hrWaiveReason ? ` (เหตุผลและเงื่อนไขการพิจารณาส่วนลด/ข้อยกเว้น: ${report.hrWaiveReason})` : ""}
            </p>
          </div>

          {/* Article 3 */}
          <div className="border border-slate-300 p-2 bg-white rounded-none">
            <div className="font-bold text-slate-900 text-[9pt] border-b border-slate-200 pb-1 mb-1">
              ข้อ ๓. วิธีการ เงื่อนไข และกำหนดระยะเวลาการชำระเงิน
            </div>
            <div className="space-y-1.5 ml-2 mt-1">
              <div
                className={`p-1.5 border ${
                  report.hrCompensationMethod === "SALARY_DEDUCTION"
                    ? "border-blue-600 bg-blue-50/40"
                    : "border-slate-200 bg-slate-50/30"
                }`}
              >
                <div className="font-bold text-slate-900">
                  [ {report.hrCompensationMethod === "SALARY_DEDUCTION" ? "✔" : "  "} ] ๓.๑ การหักจากค่าจ้าง / เงินเดือน (Salary Deduction):
                </div>
                <div className="text-slate-800 pl-4 mt-0.5 text-[8pt]">
                  ผู้ให้ความยินยอมตกลงให้บริษัทดำเนินการหักเงินจากค่าจ้างหรือเงินได้พึงประเมินในแต่ละรอบการจ่ายเงินเดือน
                  จำนวน <strong className="text-slate-900">{installments}</strong> งวด งวดละ{" "}
                  <strong className="text-slate-900">
                    {Number(perInstallment).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </strong>{" "}
                  บาท เริ่มตั้งแต่งวดบัญชีถัดไป จนกว่าจะครบถ้วนตามจำนวนเงินในข้อ ๒
                  โดยหนังสือฉบับนี้ถือเป็นความยินยอมเป็นหนังสือเฉพาะเรื่องตามนัยแห่งมาตรา ๗๖ วรรคสอง
                  พระราชบัญญัติคุ้มครองแรงงาน พ.ศ. ๒๕๔๑
                </div>
              </div>

              <div
                className={`p-1.5 border ${
                  report.hrCompensationMethod === "CASH_TRANSFER"
                    ? "border-blue-600 bg-blue-50/40"
                    : "border-slate-200 bg-slate-50/30"
                }`}
              >
                <div className="font-bold text-slate-900">
                  [ {report.hrCompensationMethod === "CASH_TRANSFER" ? "✔" : "  "} ] ๓.๒ การชำระด้วยเงินสดหรือเงินโอนเข้าบัญชีบริษัท (Direct Transfer):
                </div>
                <div className="text-slate-800 pl-4 mt-0.5 text-[8pt]">
                  ผู้ให้ความยินยอมตกลงชำระเงินสดหรือโอนเงินเข้าบัญชีเงินฝากของบริษัท ภายในวันที่{" "}
                  <strong>{dueFormatted}</strong> และส่งมอบหลักฐานใบเสร็จ/สลิปโอนเงินให้แก่ฝ่ายการเงินและฝ่ายบุคคล
                </div>
              </div>

              <div
                className={`p-1.5 border ${
                  report.hrCompensationMethod === "CONTRACTOR_INVOICE"
                    ? "border-blue-600 bg-blue-50/40"
                    : "border-slate-200 bg-slate-50/30"
                }`}
              >
                <div className="font-bold text-slate-900">
                  [ {report.hrCompensationMethod === "CONTRACTOR_INVOICE" ? "✔" : "  "} ] ๓.๓ การหักจากค่าจ้างตามบิลผู้รับเหมา (Contractor Billing Deduction):
                </div>
                <div className="text-slate-800 pl-4 mt-0.5 text-[8pt]">
                  ยินยอมให้หักกลบลบหนี้จากใบแจ้งหนี้/ค่าจ้างงวดถัดไปของผู้รับเหมา
                  พร้อมทั้งออกเอกสารใบกำกับภาษี/ใบลดหนี้ตามระเบียบบัญชีอย่างถูกต้อง
                </div>
              </div>
            </div>
          </div>

          {/* Article 4 */}
          <div className="border border-slate-300 p-2 bg-white rounded-none">
            <div className="font-bold text-slate-900 text-[9pt] border-b border-slate-200 pb-1 mb-1">
              ข้อ ๔. การรับรองความสมัครใจและความสมบูรณ์แห่งสัญญา
            </div>
            <p className="indent-6 text-justify text-slate-800">
              ผู้ให้ความยินยอมขอรับรองว่า ได้อ่าน เข้าใจข้อความ และผลผูกพันทางกฎหมายของหนังสือยินยอมฉบับนี้โดยละเอียดตลอดแล้ว
              และตกลงลงลายมือชื่อไว้ด้วยความสมัครใจ ปราศจากการบังคับ ขู่เข็ญ หลอกลวง
              หรือการใช้ดุลพินิจอันมิชอบด้วยกฎหมายแต่ประการใด
            </p>
          </div>
        </div>

        {/* ===================== 5. SIGNATURES (ROCK-SOLID TABLE LAYOUT) ===================== */}
        <div className="avoid-break mt-3">
          <div className="text-center font-bold text-[8.5pt] text-slate-800 mb-1.5">
            คู่สัญญาและพยานได้ลงลายมือชื่อไว้เป็นหลักฐานต่อหน้ากัน ณ วันที่ระบุไว้ข้างต้น
          </div>

          <table
            className="w-full border-collapse border border-slate-700 text-[8pt]"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr className="bg-slate-100 text-slate-900 text-[8pt] font-bold">
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๑. ผู้ให้ความยินยอม / ผู้ชดใช้
                </th>
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๒. พยาน / หัวหน้างาน
                </th>
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๓. เจ้าหน้าที่ฝ่ายบุคคล (HR)
                </th>
                <th className="w-1/4 border border-slate-400 py-1 px-1 text-center whitespace-nowrap">
                  ๔. กรรมการ / ผู้มีอำนาจลงนาม
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* 1. Compensator */}
                <td className="border border-slate-400 p-2 text-center align-top bg-white">
                  <div className="h-6"></div>
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] text-slate-500 whitespace-nowrap">
                    <span>ลงชื่อ</span>
                    <span className="inline-block border-b border-dotted border-slate-500 w-28"></span>
                  </div>
                  <div className="font-bold text-slate-900 text-[8pt] mt-1.5 leading-tight flex items-center justify-center gap-0.5">
                    <span>(</span>
                    <span className="truncate max-w-[34mm]">
                      {report.hrSigneeName || report.operatorName || "........................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="text-[7pt] text-slate-600 mt-0.5 whitespace-nowrap">
                    พนักงาน / ผู้ยินยอมชดใช้
                  </div>
                  <div className="text-[7pt] text-slate-500 mt-1.5 pt-1 border-t border-slate-200 whitespace-nowrap">
                    วันที่ ..... / ..... / ...........
                  </div>
                </td>

                {/* 2. Witness / Supervisor */}
                <td className="border border-slate-400 p-2 text-center align-top bg-white">
                  <div className="h-6"></div>
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] text-slate-500 whitespace-nowrap">
                    <span>ลงชื่อ</span>
                    <span className="inline-block border-b border-dotted border-slate-500 w-28"></span>
                  </div>
                  <div className="font-bold text-slate-900 text-[8pt] mt-1.5 leading-tight flex items-center justify-center gap-0.5">
                    <span>(</span>
                    <span className="truncate max-w-[34mm]">
                      {report.supervisorName || report.investigatedBy || "........................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="text-[7pt] text-slate-600 mt-0.5 whitespace-nowrap">
                    หัวหน้างานต้นสังกัด / พยาน
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
                    กรรมการ / ผู้มีอำนาจลงนาม
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
        <div className="mt-3 pt-1 border-t border-slate-200 text-center text-[7pt] text-slate-400 flex items-center justify-between">
          <span>ระบบบันทึกความเสียหายสินค้าและทรัพย์สิน | Sales CRM & HR Compliance</span>
          <span>หน้า ๑ จาก ๑ (หนังสือยินยอมและข้อตกลงฉบับทางการ)</span>
          <span>สัญญาเลขที่ {report.caseNumber}-AGR</span>
        </div>
      </div>
    </div>
  );
}
