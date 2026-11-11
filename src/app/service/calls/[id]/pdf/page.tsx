import { getUser } from "@/app/lib/dal";
import { getServiceCallLogById } from "@/app/actions/service-calls";
import { notFound } from "next/navigation";
import { Sarabun } from "next/font/google";
import PrintButton from "./PrintButton";

const sarabun = Sarabun({
  weight: ["400", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata = {
  title: "ใบรายงานการตรวจสอบและบริการหน้างาน (Service Call Report) | Sales CRM",
};

const ONSITE_RESULT_LABELS: Record<string, string> = {
  RESOLVED_ONSITE: "แก้ไขสำเร็จหน้างาน ระบบทำงานได้ตามปกติ",
  BRING_BACK_REPAIR: "นำเครื่องกลับเข้าศูนย์บริการเพื่อตรวจซ่อม",
  WAITING_PARTS_QUOTE: "รอเสนอราคาอะไหล่ / รออะไหล่เข้าเปลี่ยน",
  FOLLOW_UP_NEEDED: "รอติดตามอาการ / ลูกค้าปรับปรุงระบบหน้างาน",
  OTHER: "อื่นๆ",
};

export default async function ServiceCallReportPDF({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getUser();
  if (!session) return notFound();

  const resolvedParams = await params;
  const id = resolvedParams.id;

  let callLog: any = null;
  try {
    callLog = await getServiceCallLogById(id);
  } catch {
    return notFound();
  }

  if (!callLog) return notFound();

  const companyInfoMap: Record<
    string,
    {
      thName: string;
      name: string;
      address: string;
      phone: string;
      logo: string;
    }
  > = {
    TG: {
      thName: "บริษัท เทอรา กรุ้ป จำกัด",
      name: "TERA GROUP CO., LTD.",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
      phone: "+66(0) 2328-0801-3",
      logo: "/logos/tg.png",
    },
    TP: {
      thName: "บริษัท เทอรา พาวเวอร์ จำกัด",
      name: "TERA POWER CO., LTD.",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
      phone: "+66(0) 2328-0801-3",
      logo: "/logos/tp.png",
    },
    TE: {
      thName: "บริษัท เทอรา อิเล็คทริค จำกัด",
      name: "TERA ELECTRIC CO., LTD.",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
      phone: "+66(0) 2328-0801-3",
      logo: "/logos/te.png",
    },
  };

  const compCode =
    callLog.internalCompany && companyInfoMap[callLog.internalCompany]
      ? callLog.internalCompany
      : "TG";
  const currentCompany = companyInfoMap[compCode];

  const normalizePhotos = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val))
      return val
        .map((v: any) => (typeof v === "string" ? v : v?.url || ""))
        .filter(Boolean);
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed))
          return parsed
            .map((v: any) => (typeof v === "string" ? v : v?.url || ""))
            .filter(Boolean);
      } catch {
        return [val];
      }
    }
    return [];
  };

  const normalizeParts = (
    val: any
  ): Array<{ name: string; qty: string | number; unit: string; note?: string }> => {
    if (!val) return [];
    let arr: any[] = [];
    if (Array.isArray(val)) arr = val;
    else if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        arr = [];
      }
    }
    return arr.filter((p) => p && String(p.name || "").trim() !== "");
  };

  const beforePhotos = normalizePhotos(callLog.photosBefore).slice(0, 2);
  const afterPhotos = normalizePhotos(callLog.photosAfter).slice(0, 2);
  const partsUsed = normalizeParts(callLog.partsUsed);

  const receivedDateFormatted = callLog.receivedDate
    ? new Date(callLog.receivedDate).toLocaleDateString("th-TH")
    : callLog.createdAt
    ? new Date(callLog.createdAt).toLocaleDateString("th-TH")
    : "";

  const onsiteDateFormatted = callLog.onsiteDate
    ? new Date(callLog.onsiteDate).toLocaleDateString("th-TH")
    : receivedDateFormatted;

  const techDisplayName =
    callLog.nameTechnician ||
    callLog.responsible?.fullName ||
    callLog.responsibleName ||
    "";
  const techDisplayPhone =
    callLog.technicianPhone || callLog.responsible?.phoneNumber || "";
  const customerDisplayName = callLog.nameCustomer || callLog.contactName || "";

  const activeResultKey =
    callLog.onsiteResult ||
    (callLog.status === "System running smoothly" ? "RESOLVED_ONSITE" : "");

  return (
    <div
      className={`${sarabun.className} bg-gray-100 w-full h-full min-h-screen overflow-y-auto text-black pb-28 sm:pb-10 print:bg-white print:p-0 print:m-0`}
    >
      <style type="text/css">
        {`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');

          .service-call-pdf-container,
          .service-call-pdf-container * {
            font-family: 'TH Sarabun New', 'TH SarabunPSK', ${sarabun.style.fontFamily}, 'Sarabun', sans-serif !important;
          }

          @media screen {
            .pdf-scale-outer {
              width: 100%;
              overflow-x: auto;
              padding: 0 8px;
              box-sizing: border-box;
            }
            .pdf-scale-outer.is-scaled {
              height: var(--pdf-scaled-height, auto);
              overflow: hidden;
              display: flex;
              justify-content: center;
            }
            .pdf-scale-stage.is-scaled {
              transform: scale(var(--pdf-scale, 1));
              transform-origin: top center;
              width: 210mm;
              flex-shrink: 0;
            }
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm 10mm 6mm 10mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              background: #fff !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .pdf-scale-outer,
            .pdf-scale-stage {
              width: 100% !important;
              height: auto !important;
              transform: none !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
            }
            .service-call-pdf-container {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>

      <PrintButton backHref={`/service/calls/${callLog.id}`}>
        <div
          className="service-call-pdf-container bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden"
        style={{
          width: "210mm",
          minHeight: "297mm",
          maxHeight: "297mm",
          padding: "7mm 12mm 6mm 12mm",
          fontSize: "10.5pt",
          lineHeight: 1.2,
          color: "#000",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* 1. Header: Logo + Company Name + Case Number */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1.5px solid #000",
              paddingBottom: "2mm",
              marginBottom: "2mm",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "3.5mm" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentCompany.logo}
                alt={currentCompany.name}
                style={{ height: "13.5mm", width: "auto", objectFit: "contain" }}
              />
              <div>
                <div
                  style={{
                    fontSize: "13pt",
                    fontWeight: "bold",
                    lineHeight: 1.15,
                    color: "#000",
                  }}
                >
                  {currentCompany.thName}
                </div>
                <div
                  style={{
                    fontSize: "10pt",
                    fontWeight: "bold",
                    lineHeight: 1.15,
                    color: "#333",
                  }}
                >
                  {currentCompany.name}
                </div>
                <div style={{ fontSize: "8.8pt", color: "#555", lineHeight: 1.15 }}>
                  {currentCompany.address} | โทร: {currentCompany.phone}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  border: "1.5px solid #000",
                  padding: "1mm 3mm",
                  background: "#f8fafc",
                  borderRadius: "3px",
                }}
              >
                <span style={{ fontSize: "9pt", fontWeight: "bold" }}>เลขที่เคส : </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10.5pt",
                    fontWeight: "bold",
                    color: "#b91c1c",
                  }}
                >
                  {callLog.caseNumber || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Document Title & Service Date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "2mm",
            }}
          >
            <div style={{ width: "26%", fontSize: "9.5pt" }}>
              <span style={{ fontWeight: "bold" }}>วันที่รับแจ้ง : </span>
              <span>{receivedDateFormatted || "____/____/____"}</span>
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: "15.5pt",
                fontWeight: "bold",
                color: "#000",
                flex: 1,
                letterSpacing: "0.3px",
              }}
            >
              ใบรายงานการตรวจสอบและบริการหน้างาน
            </div>
            <div style={{ width: "26%", textAlign: "right", fontSize: "9.5pt" }}>
              <span style={{ fontWeight: "bold" }}>วันที่เข้าบริการ : </span>
              <span>{onsiteDateFormatted || "____/____/____"}</span>
            </div>
          </div>

          {/* 3. Customer & Hardware Details Box */}
          <div
            style={{
              border: "1px solid #000",
              borderRadius: "2px",
              padding: "2mm 3mm",
              marginBottom: "2mm",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: "10pt",
                marginBottom: "0.8mm",
              }}
            >
              <span style={{ fontWeight: "bold", minWidth: "22mm", flexShrink: 0 }}>
                ลูกค้า / บริษัท :
              </span>
              <span style={{ flex: 1, fontWeight: "bold", color: "#111" }}>
                {callLog.companyName || "-"}
              </span>
              <span
                style={{
                  fontWeight: "bold",
                  marginLeft: "4mm",
                  marginRight: "1.5mm",
                  flexShrink: 0,
                }}
              >
                ผู้ติดต่อ :
              </span>
              <span>{callLog.contactName || "-"}</span>
              <span
                style={{
                  fontWeight: "bold",
                  marginLeft: "4mm",
                  marginRight: "1.5mm",
                  flexShrink: 0,
                }}
              >
                โทร :
              </span>
              <span>{callLog.contactPhone || "-"}</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: "10pt",
                marginBottom: "0.8mm",
              }}
            >
              <span style={{ fontWeight: "bold", minWidth: "22mm", flexShrink: 0 }}>
                สถานที่หน้างาน :
              </span>
              <span style={{ flex: 1 }}>
                {callLog.siteAddress || "ตามที่อยู่บริษัทลูกค้า"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: "10pt",
                marginBottom: "0.8mm",
              }}
            >
              <span style={{ fontWeight: "bold", minWidth: "22mm", flexShrink: 0 }}>
                รุ่นอุปกรณ์ :
              </span>
              <span style={{ flex: 1, fontWeight: "bold", color: "#b91c1c" }}>
                {callLog.inverterModel || "-"}
              </span>
              <span
                style={{
                  fontWeight: "bold",
                  marginLeft: "4mm",
                  marginRight: "1.5mm",
                  flexShrink: 0,
                }}
              >
                Serial No. :
              </span>
              <span style={{ minWidth: "35mm" }}>
                {callLog.serialNumber || "____________________"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "6mm", fontSize: "10pt" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "baseline" }}>
                <span style={{ fontWeight: "bold", minWidth: "22mm", flexShrink: 0 }}>
                  ผู้รับแจ้งเรื่อง :
                </span>
                <span style={{ flex: 1 }}>{callLog.creator?.fullName || "-"}</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "baseline" }}>
                <span
                  style={{
                    fontWeight: "bold",
                    flexShrink: 0,
                    marginRight: "1.5mm",
                  }}
                >
                  ช่าง/วิศวกรผู้เข้าตรวจ :
                </span>
                <span style={{ flex: 1 }}>{techDisplayName || "-"}</span>
                {techDisplayPhone && (
                  <>
                    <span
                      style={{
                        fontWeight: "bold",
                        marginLeft: "2mm",
                        marginRight: "1mm",
                        flexShrink: 0,
                      }}
                    >
                      โทร :
                    </span>
                    <span>{techDisplayPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 4. Technical Inspection & Troubleshooting Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "2mm",
              fontSize: "10pt",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "1mm 2.5mm",
                    textAlign: "center",
                    fontSize: "10.5pt",
                    fontWeight: "bold",
                    width: "28%",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  หัวข้อการตรวจสอบและบริการ
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "1mm 2.5mm",
                    textAlign: "center",
                    fontSize: "10.5pt",
                    fontWeight: "bold",
                    width: "72%",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  รายละเอียดผลการตรวจสอบและการแก้ไขหน้างาน
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    fontWeight: "bold",
                    verticalAlign: "top",
                    background: "#fafafa",
                  }}
                >
                  1. อาการที่รับแจ้ง / ปัญหาที่พบ
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {callLog.reportedIssue || "-"}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    fontWeight: "bold",
                    verticalAlign: "top",
                    background: "#fafafa",
                  }}
                >
                  2. สาเหตุที่ตรวจวิเคราะห์พบ
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {callLog.analyzedCause || "-"}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    fontWeight: "bold",
                    verticalAlign: "top",
                    background: "#fafafa",
                  }}
                >
                  3. การแก้ไขและคำแนะนำ
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {callLog.recommendedSolution || "-"}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "1.2mm 2.5mm",
                    fontWeight: "bold",
                    verticalAlign: "top",
                    background: "#fafafa",
                  }}
                >
                  4. สรุปผลการเข้าหน้างาน
                </td>
                <td style={{ border: "1px solid #000", padding: "1.2mm 2.5mm" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1mm 3mm",
                      fontSize: "9.5pt",
                    }}
                  >
                    {[
                      {
                        key: "RESOLVED_ONSITE",
                        label: ONSITE_RESULT_LABELS.RESOLVED_ONSITE,
                      },
                      {
                        key: "BRING_BACK_REPAIR",
                        label: ONSITE_RESULT_LABELS.BRING_BACK_REPAIR,
                      },
                      {
                        key: "WAITING_PARTS_QUOTE",
                        label: ONSITE_RESULT_LABELS.WAITING_PARTS_QUOTE,
                      },
                      {
                        key: "FOLLOW_UP_NEEDED",
                        label: ONSITE_RESULT_LABELS.FOLLOW_UP_NEEDED,
                      },
                    ].map((opt) => {
                      const checked = activeResultKey === opt.key;
                      return (
                        <div
                          key={opt.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1.5mm",
                            fontWeight: checked ? "bold" : "normal",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "3.6mm",
                              height: "3.6mm",
                              border: "1px solid #000",
                              fontSize: "8.5pt",
                              fontWeight: "bold",
                              background: checked ? "#111" : "#fff",
                              color: checked ? "#fff" : "transparent",
                            }}
                          >
                            ✓
                          </span>
                          <span>{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {callLog.onsiteResultNote && (
                    <div
                      style={{
                        marginTop: "1mm",
                        paddingTop: "0.8mm",
                        borderTop: "1px dashed #cbd5e1",
                        fontSize: "9.5pt",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>รายละเอียดสรุปผล : </span>
                      <span>{callLog.onsiteResultNote}</span>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 5. Parts / Materials Used Table */}
          <div style={{ marginBottom: "2mm" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "9.5pt",
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "0.8mm 2mm",
                      textAlign: "center",
                      width: "8%",
                      fontWeight: "bold",
                    }}
                  >
                    ลำดับ
                  </th>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "0.8mm 2mm",
                      textAlign: "left",
                      width: "48%",
                      fontWeight: "bold",
                    }}
                  >
                    รายการอะไหล่ / อุปกรณ์ที่เปลี่ยนหรือใช้แก้ไขหน้างาน
                  </th>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "0.8mm 2mm",
                      textAlign: "center",
                      width: "12%",
                      fontWeight: "bold",
                    }}
                  >
                    จำนวน
                  </th>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "0.8mm 2mm",
                      textAlign: "center",
                      width: "12%",
                      fontWeight: "bold",
                    }}
                  >
                    หน่วย
                  </th>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "0.8mm 2mm",
                      textAlign: "left",
                      width: "20%",
                      fontWeight: "bold",
                    }}
                  >
                    หมายเหตุ
                  </th>
                </tr>
              </thead>
              <tbody>
                {partsUsed.length > 0 ? (
                  partsUsed.slice(0, 4).map((part, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "0.8mm 2mm",
                          textAlign: "center",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "0.8mm 2mm",
                        }}
                      >
                        {part.name}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "0.8mm 2mm",
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {part.qty || "1"}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "0.8mm 2mm",
                          textAlign: "center",
                        }}
                      >
                        {part.unit || "ชิ้น"}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          padding: "0.8mm 2mm",
                        }}
                      >
                        {part.note || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        border: "1px solid #000",
                        padding: "1.2mm 2mm",
                        textAlign: "center",
                        color: "#555",
                      }}
                    >
                      - ไม่มีการเปลี่ยนอะไหล่ในการเข้าตรวจสอบ/บริการครั้งนี้ -
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Before & After Photos Section */}
          <div style={{ marginBottom: "2mm" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3.5mm",
              }}
            >
              {/* Before Photos */}
              <div
                style={{
                  border: "1px solid #000",
                  padding: "1.8mm",
                  background: "#fafafa",
                  borderRadius: "2px",
                }}
              >
                <div
                  style={{
                    fontSize: "9.5pt",
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: "1.2mm",
                    color: "#b91c1c",
                  }}
                >
                  [1] ภาพถ่ายก่อนแก้ไข / จุดที่พบปัญหา (Before)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      beforePhotos.length === 1 ? "1fr" : "1fr 1fr",
                    gap: "2mm",
                  }}
                >
                  {(beforePhotos.length > 0 ? beforePhotos : ["", ""])
                    .slice(0, 2)
                    .map((url, idx) => (
                      <div
                        key={`before-${idx}`}
                        style={{
                          height: "42mm",
                          border: "1px dashed #94a3b8",
                          background: "#fff",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          borderRadius: "3px",
                        }}
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={`ก่อนแก้ไข #${idx + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: "8.5pt",
                              color: "#94a3b8",
                              textAlign: "center",
                              padding: "4px",
                            }}
                          >
                            (ภาพก่อนแก้ไข #{idx + 1})
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* After Photos */}
              <div
                style={{
                  border: "1px solid #000",
                  padding: "1.8mm",
                  background: "#fafafa",
                  borderRadius: "2px",
                }}
              >
                <div
                  style={{
                    fontSize: "9.5pt",
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: "1.2mm",
                    color: "#15803d",
                  }}
                >
                  [2] ภาพถ่ายหลังแก้ไข / ทดสอบการทำงาน (After)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      afterPhotos.length === 1 ? "1fr" : "1fr 1fr",
                    gap: "2mm",
                  }}
                >
                  {(afterPhotos.length > 0 ? afterPhotos : ["", ""])
                    .slice(0, 2)
                    .map((url, idx) => (
                      <div
                        key={`after-${idx}`}
                        style={{
                          height: "42mm",
                          border: "1px dashed #94a3b8",
                          background: "#fff",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          borderRadius: "3px",
                        }}
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={`หลังแก้ไข #${idx + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: "8.5pt",
                              color: "#94a3b8",
                              textAlign: "center",
                              padding: "4px",
                            }}
                          >
                            (ภาพหลังแก้ไข #{idx + 1})
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* 7. Additional Notes Box */}
          <div
            style={{
              border: "1px solid #000",
              padding: "1.5mm 3mm",
              marginBottom: "2mm",
              background: "#fff",
              borderRadius: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontWeight: "bold",
                  fontSize: "9.8pt",
                  color: "#000",
                  whiteSpace: "nowrap",
                }}
              >
                หมายเหตุเพิ่มเติม (Remarks) :
              </span>
              <span
                style={{
                  fontSize: "9.5pt",
                  color: "#111",
                  flex: 1,
                  minHeight: "5mm",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {callLog.notes || "- ได้เข้าตรวจสอบและชี้แจงรายละเอียดแก่ลูกค้าเรียบร้อยแล้ว -"}
              </span>
            </div>
          </div>
        </div>

        {/* 8. Symmetrical Signatures Block (Bottom) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10mm",
            paddingTop: "1mm",
          }}
        >
          {/* Service Engineer */}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              border: "1px solid #999",
              borderRadius: "3px",
              padding: "2mm 3mm",
              background: "#fdfdfd",
            }}
          >
            <div
              style={{
                height: "12.5mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {callLog.sigTechnicianUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={callLog.sigTechnicianUrl}
                  alt="Technician Sig"
                  style={{
                    maxHeight: "11.5mm",
                    maxWidth: "80%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <span style={{ color: "#aaa", fontSize: "9pt" }}>
                  ....................................................................
                </span>
              )}
            </div>
            <div style={{ fontSize: "10pt", marginTop: "0.8mm", lineHeight: 1.25 }}>
              ลงชื่อตัวบรรจง ({" "}
              {techDisplayName
                ? techDisplayName
                : "................................................"}{" "}
              )
            </div>
            <div
              style={{
                fontSize: "10.5pt",
                fontWeight: "bold",
                color: "#000",
                marginTop: "0.5mm",
              }}
            >
              ช่าง/วิศวกรผู้ให้บริการ (Service Engineer)
            </div>
            <div style={{ fontSize: "9pt", color: "#555", marginTop: "0.5mm" }}>
              วันที่{" "}
              {callLog.sigTechnicianUrl && onsiteDateFormatted
                ? onsiteDateFormatted
                : "............ / ............ / ............"}
            </div>
          </div>

          {/* Customer */}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              border: "1px solid #999",
              borderRadius: "3px",
              padding: "2mm 3mm",
              background: "#fdfdfd",
            }}
          >
            <div
              style={{
                height: "12.5mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {callLog.sigCustomerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={callLog.sigCustomerUrl}
                  alt="Customer Sig"
                  style={{
                    maxHeight: "11.5mm",
                    maxWidth: "80%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <span style={{ color: "#aaa", fontSize: "9pt" }}>
                  ....................................................................
                </span>
              )}
            </div>
            <div style={{ fontSize: "10pt", marginTop: "0.8mm", lineHeight: 1.25 }}>
              ลงชื่อตัวบรรจง ({" "}
              {customerDisplayName
                ? customerDisplayName
                : "................................................"}{" "}
              )
            </div>
            <div
              style={{
                fontSize: "10.5pt",
                fontWeight: "bold",
                color: "#000",
                marginTop: "0.5mm",
              }}
            >
              ลูกค้า/ผู้รับบริการ{" "}
              {callLog.customerPosition ? `(${callLog.customerPosition})` : ""}
            </div>
            <div style={{ fontSize: "9pt", color: "#555", marginTop: "0.5mm" }}>
              วันที่{" "}
              {callLog.sigCustomerUrl && onsiteDateFormatted
                ? onsiteDateFormatted
                : "............ / ............ / ............"}
            </div>
          </div>
        </div>
      </div>
      </PrintButton>
    </div>
  );
}

