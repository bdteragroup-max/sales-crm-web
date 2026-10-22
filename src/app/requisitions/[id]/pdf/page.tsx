import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import PrintButton from "./PrintButton"

export const metadata = {
  title: "ใบเบิก/ใบยืมของ | Sales CRM",
}

export default async function RequisitionPDF({ params }: { params: Promise<{ id: string }> }) {
  const session = await getUser()
  if (!session) return notFound()

  const { id } = await params

  const requisition = await prisma.materialRequisition.findUnique({
    where: { id: id },
    include: {
      requester: true,
      approver: true,
    },
  })

  if (!requisition) return notFound()

  const items = (requisition.items as any[]) || []
  const tableRows = [...items]

  // Checkbox logic for company
  const isGroup = requisition.company === "Group"
  const isElectric = requisition.company === "Electric"
  const isPower = requisition.company === "Power"

  const requisitionDateStr = requisition.date
    ? new Date(requisition.date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"

  const CheckboxIcon = ({ checked }: { checked: boolean }) => (
    <div
      style={{
        width: "15px",
        height: "15px",
        border: "1.5px solid black",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        margin: "0 auto",
      }}
    >
      {checked && <span style={{ fontSize: "13px", lineHeight: "13px", fontWeight: "bold" }}>✓</span>}
    </div>
  )

  return (
    <div
      className="print-page-wrapper bg-gray-100 w-full min-h-screen text-black pb-10 print:pb-0 print:bg-white print:p-0 print:m-0 print:min-h-0"
      style={{ fontFamily: "'Sarabun', sans-serif" }}
    >
      <style type="text/css">
        {`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
          
          /* Top-level @page rule so Chrome and browsers reliably select Landscape A4 */
          @page {
            size: A4 landscape;
            margin: 0mm;
          }
          
          @media print {
            html, body {
              width: 297mm !important;
              height: 210mm !important;
              max-height: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-page-wrapper {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 297mm !important;
              height: 210mm !important;
              max-height: 210mm !important;
              min-height: 0 !important;
              overflow: hidden !important;
            }
            .requisition-sheet {
              width: 297mm !important;
              height: 210mm !important;
              max-height: 210mm !important;
              min-height: 210mm !important;
              padding: 8mm 10mm !important;
              margin: 0 !important;
              box-shadow: none !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .pdf-table tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .signatures-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
          
          .pdf-table th, .pdf-table td {
            border: 1px solid black;
            padding: 4px 6px;
            text-align: center;
            vertical-align: middle;
          }
          .pdf-table th {
            background-color: #f3f4f6;
            font-weight: bold;
            color: #000;
          }
          .pdf-table td {
            line-height: 1.35;
          }
        `}
      </style>

      {/* Screen Toolbar */}
      <div className="flex items-center justify-between mb-4 print:hidden max-w-[297mm] mx-auto pt-4 px-2">
        <Link
          href={`/requisitions/${requisition.id}`}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
        >
          <span>← กลับหน้ารายละเอียด</span>
        </Link>
        <PrintButton />
      </div>

      {/* A4 Landscape Sheet */}
      <div
        className="requisition-sheet bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden"
        style={{
          width: "297mm",
          height: "210mm",
          padding: "8mm 10mm",
          fontSize: "13px",
          color: "#000",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            border: "2px solid black",
            padding: "10px 14px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          {/* Header Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
            {/* Logos & Title */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "52%" }}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "6px", justifyContent: "center", alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/4.png" alt="Group" style={{ height: "42px", objectFit: "contain" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/6.png" alt="Electric" style={{ height: "42px", objectFit: "contain" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/7.png" alt="Power" style={{ height: "42px", objectFit: "contain" }} />
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#000", letterSpacing: "-0.3px", textAlign: "center" }}>
                ใบเบิก/ใบยืมของและวัสดุ-อุปกรณ์ต่างๆ
              </div>
            </div>

            {/* Date, Doc No & Company Selection */}
            <div style={{ width: "42%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "6px", fontSize: "12.5px" }}>
                {requisition.requisitionNumber && (
                  <div>
                    <span style={{ fontWeight: "bold", marginRight: "6px" }}>เลขที่:</span>
                    <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#b91c1c" }}>
                      {requisition.requisitionNumber}
                    </span>
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: "bold", marginRight: "6px" }}>วันที่:</span>
                  <span>{requisitionDateStr}</span>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "12px" }} className="pdf-table">
                <thead>
                  <tr>
                    <th style={{ width: "33.33%", padding: "2px 4px" }}>กรุ้ป</th>
                    <th style={{ width: "33.33%", padding: "2px 4px" }}>อิเล็กทริค</th>
                    <th style={{ width: "33.33%", padding: "2px 4px" }}>พาวเวอร์</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "3px 4px" }}><CheckboxIcon checked={isGroup} /></td>
                    <td style={{ padding: "3px 4px" }}><CheckboxIcon checked={isElectric} /></td>
                    <td style={{ padding: "3px 4px" }}><CheckboxIcon checked={isPower} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Main Table */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", margin: "4px 0" }}>
            <table className="pdf-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ width: "6%", padding: "5px 4px" }}>ลำดับ</th>
                  <th style={{ width: "38%", padding: "5px 6px" }}>รายการเบิก/รายละเอียด</th>
                  <th style={{ width: "8%", padding: "5px 4px" }}>จำนวน</th>
                  <th style={{ width: "8%", padding: "5px 4px" }}>หน่วย</th>
                  <th style={{ width: "18%", padding: "5px 6px" }}>งานที่ใช้</th>
                  <th style={{ width: "22%", padding: "5px 6px" }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item, index) => (
                  <tr key={index}>
                    <td>{item ? index + 1 : ""}</td>
                    <td style={{ textAlign: "left", wordBreak: "break-word" }}>{item ? item.detail : ""}</td>
                    <td>{item ? item.quantity : ""}</td>
                    <td>{item ? item.unit : ""}</td>
                    <td style={{ wordBreak: "break-word" }}>{item ? item.job : ""}</td>
                    <td style={{ wordBreak: "break-word" }}>{item ? item.remark : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="signatures-section" style={{ display: "flex", justifyContent: "space-around", marginTop: "8px", paddingBottom: "4px" }}>
            <div style={{ textAlign: "center", width: "38%" }}>
              <div style={{ height: "48px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "4px" }}>
                {requisition.requesterSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={requisition.requesterSignatureUrl} alt="Requester" style={{ maxHeight: "48px", maxWidth: "160px", objectFit: "contain" }} />
                ) : null}
              </div>
              <div style={{ borderBottom: "1px dotted black", width: "70%", margin: "0 auto 4px" }}></div>
              <div style={{ fontWeight: "bold", fontSize: "13px" }}>ผู้ขอเบิก</div>
              <div style={{ fontSize: "12.5px", marginTop: "1px" }}>({requisition.requester?.fullName || "......................................"})</div>
            </div>

            <div style={{ textAlign: "center", width: "38%" }}>
              <div style={{ height: "48px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "4px" }}>
                {requisition.approverSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={requisition.approverSignatureUrl} alt="Approver" style={{ maxHeight: "48px", maxWidth: "160px", objectFit: "contain" }} />
                ) : null}
              </div>
              <div style={{ borderBottom: "1px dotted black", width: "70%", margin: "0 auto 4px" }}></div>
              <div style={{ fontWeight: "bold", fontSize: "13px" }}>ผู้อนุมัติ</div>
              <div style={{ fontSize: "12.5px", marginTop: "1px" }}>({requisition.approver?.fullName || "......................................"})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
