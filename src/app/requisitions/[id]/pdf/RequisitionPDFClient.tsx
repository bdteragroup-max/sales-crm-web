"use client"

import React, { useState } from "react"
import RequisitionPrintToolbar from "./RequisitionPrintToolbar"

interface RequisitionItem {
  detail?: string
  quantity?: number | string
  unit?: string
  job?: string
  remark?: string
  returnedQuantity?: number | string
  returnDate?: string
  returnCondition?: string
  returnRemark?: string
}

interface RequisitionPDFClientProps {
  requisition: any
  project: any
}

const companyInfoMap: Record<
  string,
  {
    th: string
    en: string
    short: string
    taxId: string
    address: string
    telFax: string
    branchTitle: string
    logoUrl: string
  }
> = {
  TG: {
    th: "บริษัท เทอรา กรุ๊ป จำกัด",
    en: "TERA GROUP CO., LTD.",
    short: "เทอรา กรุ๊ป (TG)",
    taxId: "0105552112716",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
    telFax: "โทรศัพท์: 02-328-0801-3  โทรสาร: 02-328-0804",
    branchTitle: "สำนักงานใหญ่ (Head Office)",
    logoUrl: "/4.png",
  },
  TE: {
    th: "บริษัท เทอรา อิเล็คทริค จำกัด",
    en: "TERA ELECTRIC CO., LTD.",
    short: "เทอรา อิเล็คทริค (TE)",
    taxId: "0105557159958",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
    telFax: "โทรศัพท์: 02-328-0801-3  โทรสาร: 02-328-0804",
    branchTitle: "สำนักงานใหญ่ (Head Office)",
    logoUrl: "/6.png",
  },
  TP: {
    th: "บริษัท เทอรา เพาเวอร์ จำกัด",
    en: "TERA POWER CO., LTD.",
    short: "เทอรา เพาเวอร์ (TP)",
    taxId: "0105564011223",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
    telFax: "โทรศัพท์: 02-328-0801-3  โทรสาร: 02-328-0804",
    branchTitle: "สำนักงานใหญ่ (Head Office)",
    logoUrl: "/7.png",
  },
}

export default function RequisitionPDFClient({
  requisition,
  project,
}: RequisitionPDFClientProps) {
  // Default to Portrait as requested by the user
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const isPortrait = orientation === "portrait"

  const items = ((requisition.items as unknown) as RequisitionItem[]) || []
  const photos = Array.isArray(requisition.deliveryPhotos)
    ? (requisition.deliveryPhotos as string[])
    : []
  const returnPhotos = Array.isArray(requisition.returnRequestPhotos)
    ? (requisition.returnRequestPhotos as string[])
    : []

  // Company detection
  const compRaw = (requisition.company || "").trim().toLowerCase()
  const isPower =
    compRaw === "power" ||
    compRaw === "tp" ||
    compRaw.includes("power") ||
    compRaw.includes("เพาเวอร์") ||
    compRaw.includes("พาวเวอร์")

  const isElectric =
    compRaw === "electric" ||
    compRaw === "te" ||
    compRaw.includes("electric") ||
    compRaw.includes("อิเล็คทริค") ||
    compRaw.includes("อิเล็กทริค")

  const isGroup = !isPower && !isElectric // default to Group if not power or electric

  const currentCompanyKey = isPower ? "TP" : isElectric ? "TE" : "TG"
  const currentCompany = companyInfoMap[currentCompanyKey]

  // Date formatting helpers
  const formatThaiDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-"
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return "-"
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "-"
    }
  }

  const formatThaiDateTime = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-"
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return "-"
      return (
        d.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) +
        " " +
        d.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " น."
      )
    } catch {
      return "-"
    }
  }

  const requisitionDateStr = formatThaiDate(requisition.date)
  const deliveryDateStr = requisition.deliveryDate ? formatThaiDate(requisition.deliveryDate) : "-"
  const dispensedDateStr = requisition.dispensedAt ? formatThaiDateTime(requisition.dispensedAt) : "-"
  const receivedDateStr = requisition.receivedAt ? formatThaiDateTime(requisition.receivedAt) : "-"

  // Requisition Type
  const isBorrow =
    requisition.requisitionType === "BORROW_EQUIPMENT" ||
    requisition.requisitionType === "BORROW" ||
    requisition.requisitionType === "EQUIPMENT"

  // Check if project is actually selected/specified
  const rawProjName = (requisition.projectName || project?.name || "").trim()
  const rawClient = (project?.clientName || "").trim()
  const rawSite = (requisition.destinationSite || project?.siteAddress || "").trim()

  const hasProject = Boolean(
    (rawProjName && rawProjName !== "-") ||
    (rawClient && rawClient !== "-") ||
    (rawSite && rawSite !== "-")
  )

  // Document Title & Subtitles based on type
  const docTitleTh = isBorrow ? "ใบยืมเครื่องมือและอุปกรณ์" : "ใบเบิกวัสดุอุปกรณ์งานโครงการ"
  const docTitleEn = isBorrow ? "EQUIPMENT BORROWING FORM" : "PROJECT MATERIAL REQUISITION FORM"
  const formCode = isBorrow ? "FM-WHS-003 Rev.01" : "FM-WHS-002 Rev.01"

  // Status mapping
  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "อนุมัติแล้ว (รอจัดของ / ส่งมอบ)"
      case "DISPATCHED":
        return "อยู่ระหว่างจัดส่ง (DISPATCHED)"
      case "DISPENSED":
      case "COMPLETED":
        return isBorrow
          ? "รับของแล้ว (อยู่ระหว่างยืม)"
          : "เบิกจ่ายสำเร็จ (COMPLETED)"
      case "RETURN_PENDING":
        return "แจ้งส่งคืนแล้ว (รอตรวจรับ)"
      case "PARTIALLY_RETURNED":
        return "คืนแล้วบางส่วน (PARTIALLY RETURNED)"
      case "RETURNED":
        return "ส่งคืนครบถ้วน (RETURNED)"
      case "REJECTED":
        return "ไม่อนุมัติ (REJECTED)"
      case "PENDING_APPROVAL":
      default:
        return "รออนุมัติ (PENDING APPROVAL)"
    }
  }

  const statusText = getStatusText(requisition.status)
  const isReqFullyReturned = requisition.status === "RETURNED"

  // Calculations for totals
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)
  const totalReturned = items.reduce((sum, item) => sum + (Number(item?.returnedQuantity) || 0), 0)
  const hasReturnedItems = items.some((item) => Number(item?.returnedQuantity) > 0)

  // Dimensions based on orientation
  const sheetWidth = isPortrait ? "210mm" : "297mm"
  const sheetHeight = isPortrait ? "297mm" : "210mm"

  return (
    <div className="requisition-pdf-root bg-slate-200/80 min-h-screen text-slate-900 pb-12 print:pb-0 print:bg-white print:p-0 print:m-0 print:min-h-0 font-['Sarabun',sans-serif]">
      <style type="text/css">
        {`
          @page {
            size: ${isPortrait ? "A4 portrait" : "A4 landscape"};
            margin: 0mm;
          }

          @media print {
            html, body {
              width: ${sheetWidth} !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .requisition-pdf-root {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }

            .requisition-sheet {
              width: ${sheetWidth} !important;
              height: ${sheetHeight} !important;
              max-height: ${sheetHeight} !important;
              margin: 0 !important;
              padding: ${isPortrait ? "8mm 9mm" : "8mm 10mm"} !important;
              box-shadow: none !important;
              border: none !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }

            .requisition-sheet:last-of-type {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            .no-print {
              display: none !important;
            }
          }

          .official-table {
            border-collapse: collapse;
            width: 100%;
          }

          .official-table th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            font-weight: 700;
            border: 1px solid #000000 !important;
          }

          .official-table td {
            border: 1px solid #000000 !important;
            vertical-align: middle;
            color: #000000;
          }
        `}
      </style>

      {/* Screen Toolbar */}
      <RequisitionPrintToolbar
        requisitionId={requisition.id}
        requisitionNumber={requisition.requisitionNumber}
        statusText={statusText}
        statusColorClass="bg-slate-800 text-white border border-slate-700"
        orientation={orientation}
        onOrientationChange={setOrientation}
        isBorrow={isBorrow}
      />

      {/* Sheet Container */}
      <div className="pt-6 print:pt-0">
        {/* PAGE 1: Official Requisition / Borrowing Document */}
        <div
          className="requisition-sheet bg-white shadow-2xl print:shadow-none mx-auto relative overflow-hidden text-black"
          style={{
            width: sheetWidth,
            height: sheetHeight,
            padding: isPortrait ? "8mm 9mm" : "8mm 10mm",
            fontSize: isPortrait ? "11px" : "12px",
            lineHeight: 1.3,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "'Sarabun', 'TH Sarabun New', Tahoma, sans-serif",
          }}
        >
          {/* Formal Outer Frame (Single Solid 1.5px Black Border) */}
          <div
            style={{
              border: "1.5px solid #000000",
              padding: isPortrait ? "8px 10px" : "10px 14px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            {/* 1. TOP HEADER & METADATA SECTION */}
            <div>
              {/* 1.1 Header Row: Company Header (Left) & Document Title / Meta Box (Right) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "6px",
                  marginBottom: "6px",
                  gap: "12px",
                }}
              >
                {/* Left: Logo & Formal Company Profile */}
                <div style={{ flex: 1, display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      height: isPortrait ? "50px" : "56px",
                      minWidth: isPortrait ? "54px" : "62px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentCompany.logoUrl}
                      alt={currentCompany.en}
                      style={{
                        maxHeight: isPortrait ? "48px" : "54px",
                        maxWidth: isPortrait ? "85px" : "95px",
                        objectFit: "contain",
                      }}
                    />
                  </div>

                  <div style={{ lineHeight: 1.25 }}>
                    <div
                      style={{
                        fontSize: isPortrait ? "15px" : "16px",
                        fontWeight: "bold",
                        color: "#000000",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {currentCompany.th}
                    </div>
                    <div
                      style={{
                        fontSize: isPortrait ? "10px" : "10.5px",
                        fontWeight: 600,
                        color: "#333333",
                        marginBottom: "1px",
                      }}
                    >
                      {currentCompany.en}
                    </div>
                    <div style={{ fontSize: isPortrait ? "8.5px" : "9px", color: "#444444" }}>
                      {currentCompany.address}
                    </div>
                    <div style={{ fontSize: isPortrait ? "8.5px" : "9px", color: "#444444" }}>
                      {currentCompany.telFax}
                    </div>
                    <div style={{ fontSize: isPortrait ? "8.5px" : "9px", color: "#000000", fontWeight: 600, marginTop: "1px" }}>
                      เลขประจำตัวผู้เสียภาษีอากร: <span>{currentCompany.taxId}</span> ({currentCompany.branchTitle})
                    </div>
                  </div>
                </div>

                {/* Right: Official Title & Structured Meta Box */}
                <div style={{ width: isPortrait ? "38%" : "36%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ textAlign: "right", marginBottom: "4px" }}>
                    <div
                      style={{
                        fontSize: isPortrait ? "16px" : "18px",
                        fontWeight: "bold",
                        color: "#000000",
                        lineHeight: 1.15,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {docTitleTh}
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: "bold",
                        color: "#444444",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {docTitleEn}
                    </div>
                    <div style={{ fontSize: "9px", fontWeight: "bold", color: "#666666" }}>
                      ต้นฉบับ / ORIGINAL
                    </div>
                  </div>

                  {/* Formal Structured Meta Table */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #000000",
                      fontSize: isPortrait ? "9.5px" : "10px",
                    }}
                  >
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #000000" }}>
                        <td
                          style={{
                            padding: "2px 5px",
                            backgroundColor: "#f1f5f9",
                            fontWeight: "bold",
                            color: "#000000",
                            width: "48%",
                            borderRight: "1px solid #000000",
                          }}
                        >
                          เลขที่เอกสาร / DOC NO.:
                        </td>
                        <td
                          style={{
                            padding: "2px 6px",
                            fontWeight: "bold",
                            fontFamily: "monospace",
                            fontSize: isPortrait ? "10.5px" : "11px",
                            color: "#000000",
                          }}
                        >
                          {requisition.requisitionNumber}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #000000" }}>
                        <td
                          style={{
                            padding: "2px 5px",
                            backgroundColor: "#f1f5f9",
                            fontWeight: "bold",
                            color: "#000000",
                            borderRight: "1px solid #000000",
                          }}
                        >
                          วันที่ / DATE:
                        </td>
                        <td style={{ padding: "2px 6px", fontWeight: 600, color: "#000000" }}>
                          {requisitionDateStr}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            padding: "2px 5px",
                            backgroundColor: "#f1f5f9",
                            fontWeight: "bold",
                            color: "#000000",
                            borderRight: "1px solid #000000",
                          }}
                        >
                          สถานะ / STATUS:
                        </td>
                        <td style={{ padding: "2px 6px", fontWeight: "bold", color: "#000000" }}>
                          {statusText}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 1.2 Formal Document Options Bar (Type & Affiliated Company) */}
              <div
                style={{
                  border: "1px solid #000000",
                  padding: "3.5px 8px",
                  marginBottom: "5px",
                  backgroundColor: "#ffffff",
                  fontSize: isPortrait ? "9.5px" : "10px",
                  display: "flex",
                  flexDirection: isPortrait ? "column" : "row",
                  justifyContent: "space-between",
                  gap: "4px",
                }}
              >
                {/* Left: Requisition Type Selection */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontWeight: "bold", color: "#000000" }}>
                    ประเภทคำขอ (TYPE):
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "12px",
                        height: "12px",
                        border: "1px solid #000000",
                        fontSize: "9px",
                        fontWeight: "bold",
                        lineHeight: 1,
                      }}
                    >
                      {isBorrow ? "✓" : ""}
                    </span>
                    <span style={{ fontWeight: isBorrow ? "bold" : "normal" }}>
                      ยืมเครื่องมือและอุปกรณ์ (Equipment Borrowing)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "12px",
                        height: "12px",
                        border: "1px solid #000000",
                        fontSize: "9px",
                        fontWeight: "bold",
                        lineHeight: 1,
                      }}
                    >
                      {!isBorrow ? "✓" : ""}
                    </span>
                    <span style={{ fontWeight: !isBorrow ? "bold" : "normal" }}>
                      เบิกวัสดุอุปกรณ์งานโครงการ (Project Requisition)
                    </span>
                  </div>
                </div>

                {/* Right: Company Affiliation Selection */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontWeight: "bold", color: "#000000" }}>
                    สังกัด (COMPANY):
                  </span>
                  {/* TG */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "12px",
                        height: "12px",
                        border: "1px solid #000000",
                        fontSize: "9px",
                        fontWeight: "bold",
                        lineHeight: 1,
                      }}
                    >
                      {isGroup ? "✓" : ""}
                    </span>
                    <span style={{ fontWeight: isGroup ? "bold" : "normal" }}>เทอรา กรุ๊ป (TG)</span>
                  </div>
                  {/* TE */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "12px",
                        height: "12px",
                        border: "1px solid #000000",
                        fontSize: "9px",
                        fontWeight: "bold",
                        lineHeight: 1,
                      }}
                    >
                      {isElectric ? "✓" : ""}
                    </span>
                    <span style={{ fontWeight: isElectric ? "bold" : "normal" }}>เทอรา อิเล็คทริค (TE)</span>
                  </div>
                  {/* TP */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "12px",
                        height: "12px",
                        border: "1px solid #000000",
                        fontSize: "9px",
                        fontWeight: "bold",
                        lineHeight: 1,
                      }}
                    >
                      {isPower ? "✓" : ""}
                    </span>
                    <span style={{ fontWeight: isPower ? "bold" : "normal" }}>เทอรา เพาเวอร์ (TP)</span>
                  </div>
                </div>
              </div>

              {/* 1.3 INFO SECTION: DYNAMICALLY SEPARATED ACCORDING TO REQUISITION TYPE & PROJECT */}
              {isBorrow && !hasProject ? (
                /* CASE 1: Equipment Borrowing WITHOUT Project -> Show ONLY Borrower Info in clean balanced layout */
                <div
                  style={{
                    border: "1px solid #000000",
                    fontSize: isPortrait ? "9.5px" : "10px",
                    lineHeight: 1.35,
                    marginBottom: "5px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      borderBottom: "1px solid #000000",
                      padding: "2px 6px",
                      fontWeight: "bold",
                      color: "#000000",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>ข้อมูลผู้ขอยืมอุปกรณ์ (BORROWER INFORMATION)</span>
                    <span style={{ fontSize: "8.5px", fontWeight: "normal", color: "#555555" }}>
                      {requisition.branch === "BKK-HQ" ? "สำนักงานใหญ่ (BKK-HQ)" : requisition.branch || "สำนักงานใหญ่"}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: "4px 8px",
                      display: "grid",
                      gridTemplateColumns: "1.1fr 0.9fr",
                      gap: "12px",
                    }}
                  >
                    {/* Left Sub-Column */}
                    <div>
                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          ผู้ขอยืมอุปกรณ์:
                        </span>
                        <span style={{ fontWeight: "bold", color: "#000000" }}>
                          {requisition.requester?.fullName || "-"}
                          {requisition.requester?.employeeId && (
                            <span style={{ fontWeight: "normal", color: "#555555", marginLeft: "4px" }}>
                              (รหัสพนักงาน: {requisition.requester.employeeId})
                            </span>
                          )}
                        </span>
                      </div>

                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          แผนก / ตำแหน่ง:
                        </span>
                        <span style={{ color: "#000000" }}>
                          {requisition.requester?.position || requisition.requester?.role || "-"}
                        </span>
                      </div>

                      <div style={{ display: "flex" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          สาขา / คลังที่ยืม:
                        </span>
                        <span style={{ color: "#000000", fontWeight: 600 }}>
                          {requisition.branch === "BKK-HQ" ? "สำนักงานใหญ่ (BKK-HQ)" : requisition.branch || "สำนักงานใหญ่"}
                        </span>
                      </div>
                    </div>

                    {/* Right Sub-Column */}
                    <div>
                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          วันที่ขอยืม:
                        </span>
                        <span style={{ color: "#000000", fontWeight: 600 }}>
                          {requisitionDateStr}
                        </span>
                      </div>

                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          วันที่ต้องการใช้งาน:
                        </span>
                        <span style={{ color: "#000000", fontWeight: 600 }}>
                          {deliveryDateStr}
                        </span>
                      </div>

                      {requisition.deliveryNote && (
                        <div style={{ display: "flex" }}>
                          <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                            หมายเหตุการยืม:
                          </span>
                          <span style={{ color: "#000000" }}>
                            {requisition.deliveryNote}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* CASE 2: Project Requisition OR Equipment Borrowing with selected Project -> Show 2 Symmetrical Boxes */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                    marginBottom: "5px",
                  }}
                >
                  {/* Left Box: ข้อมูลผู้ขอเบิก / ผู้ขอยืม */}
                  <div
                    style={{
                      border: "1px solid #000000",
                      fontSize: isPortrait ? "9.5px" : "10px",
                      lineHeight: 1.35,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f1f5f9",
                        borderBottom: "1px solid #000000",
                        padding: "2px 6px",
                        fontWeight: "bold",
                        color: "#000000",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{isBorrow ? "ข้อมูลผู้ขอยืม (BORROWER INFO)" : "ข้อมูลผู้ขอเบิก (REQUESTER INFO)"}</span>
                      <span style={{ fontSize: "8.5px", fontWeight: "normal", color: "#555555" }}>ส่วนที่ 1</span>
                    </div>

                    <div style={{ padding: "4px 6px" }}>
                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          {isBorrow ? "ผู้ขอยืมอุปกรณ์:" : "ผู้ขอเบิกวัสดุ:"}
                        </span>
                        <span style={{ fontWeight: "bold", color: "#000000" }}>
                          {requisition.requester?.fullName || "-"}
                          {requisition.requester?.employeeId && (
                            <span style={{ fontWeight: "normal", color: "#555555", marginLeft: "4px" }}>
                              (รหัสพนักงาน: {requisition.requester.employeeId})
                            </span>
                          )}
                        </span>
                      </div>

                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          แผนก / ตำแหน่ง:
                        </span>
                        <span style={{ color: "#000000" }}>
                          {requisition.requester?.position || requisition.requester?.role || "-"}
                        </span>
                      </div>

                      <div style={{ display: "flex" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          สาขา / คลังที่เบิก:
                        </span>
                        <span style={{ color: "#000000", fontWeight: 600 }}>
                          {requisition.branch === "BKK-HQ" ? "สำนักงานใหญ่ (BKK-HQ)" : requisition.branch || "สำนักงานใหญ่"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: ข้อมูลงาน / โครงการและสถานที่ */}
                  <div
                    style={{
                      border: "1px solid #000000",
                      fontSize: isPortrait ? "9.5px" : "10px",
                      lineHeight: 1.35,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f1f5f9",
                        borderBottom: "1px solid #000000",
                        padding: "2px 6px",
                        fontWeight: "bold",
                        color: "#000000",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>ข้อมูลโครงการ / สถานที่ใช้งาน (PROJECT & LOCATION)</span>
                      <span style={{ fontSize: "8.5px", fontWeight: "normal", color: "#555555" }}>ส่วนที่ 2</span>
                    </div>

                    <div style={{ padding: "4px 6px" }}>
                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          งาน / โครงการ:
                        </span>
                        <span style={{ fontWeight: "bold", color: "#000000", flex: 1, wordBreak: "break-word" }}>
                          {rawProjName || "-"}
                          {rawClient && (
                            <span style={{ fontWeight: "normal", color: "#555555", marginLeft: "4px" }}>
                              ({rawClient})
                            </span>
                          )}
                        </span>
                      </div>

                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                          สถานที่นำไปใช้:
                        </span>
                        <span style={{ color: "#000000", flex: 1, wordBreak: "break-word" }}>
                          {rawSite || "-"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ display: "flex" }}>
                          <span style={{ width: "95px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                            วันที่ใช้งาน:
                          </span>
                          <span style={{ color: "#000000", fontWeight: 600 }}>
                            {deliveryDateStr}
                          </span>
                        </div>
                        {requisition.dispensedAt && (
                          <div style={{ color: "#444444", fontSize: "8.5px" }}>
                            <span>จ่ายของเมื่อ:</span> {dispensedDateStr}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. OFFICIAL ITEMS TABLE (Shows ONLY actual items, no empty dummy rows) */}
            <div style={{ margin: "2px 0 4px" }}>
              <table
                className="official-table"
                style={{
                  fontSize: isPortrait ? "9.5px" : "10px",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "center", lineHeight: 1.2 }}>
                    <th style={{ width: "5%", padding: "4px 2px" }}>
                      ลำดับ<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>ITEM</span>
                    </th>
                    <th style={{ width: isPortrait ? "38%" : "37%", padding: "4px 6px", textAlign: "left" }}>
                      {isBorrow ? "รายการเครื่องมือและอุปกรณ์ / รายละเอียดสเปก" : "รายการเบิกวัสดุอุปกรณ์ / รายละเอียดสเปก"}<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>
                        {isBorrow ? "EQUIPMENT DESCRIPTION & SPECIFICATION" : "MATERIAL DESCRIPTION & SPECIFICATION"}
                      </span>
                    </th>
                    <th style={{ width: "8%", padding: "4px 2px" }}>
                      จำนวน<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>QTY</span>
                    </th>
                    <th style={{ width: "7%", padding: "4px 2px" }}>
                      หน่วย<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>UNIT</span>
                    </th>
                    <th style={{ width: isPortrait ? "17%" : "18%", padding: "4px 5px", textAlign: "left" }}>
                      {isBorrow ? "วัตถุประสงค์การนำไปใช้" : "งานที่นำไปใช้ / โครงการ"}<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>
                        {isBorrow ? "PURPOSE / USAGE" : "JOB / PURPOSE"}
                      </span>
                    </th>
                    <th style={{ width: isPortrait ? "10%" : "10%", padding: "4px 2px" }}>
                      สถานะการคืน<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>RETURN</span>
                    </th>
                    <th style={{ width: isPortrait ? "15%" : "16%", padding: "4px 5px", textAlign: "left" }}>
                      หมายเหตุ<br />
                      <span style={{ fontSize: "8px", fontWeight: "normal" }}>REMARK</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "16px", color: "#666666" }}>
                        {isBorrow ? "- ไม่มีรายการขอยืมอุปกรณ์ -" : "- ไม่มีรายการเบิกวัสดุ -"}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const rowNum = index + 1
                      const returnedQty = Number(item.returnedQuantity) || 0
                      const itemQty = Number(item.quantity) || 0

                      return (
                        <tr
                          key={index}
                          style={{
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {/* No. */}
                          <td style={{ textAlign: "center", color: "#000000", fontWeight: 600, padding: "5px 3px" }}>
                            {rowNum}
                          </td>

                          {/* Detail */}
                          <td style={{ padding: "5px 6px", textAlign: "left", wordBreak: "break-word" }}>
                            <span style={{ fontWeight: "bold", color: "#000000" }}>{item?.detail || "-"}</span>
                          </td>

                          {/* Quantity */}
                          <td
                            style={{
                              textAlign: "center",
                              fontWeight: "bold",
                              color: "#000000",
                              fontSize: isPortrait ? "10.5px" : "11px",
                              padding: "5px 3px",
                            }}
                          >
                            {item?.quantity ?? "-"}
                          </td>

                          {/* Unit */}
                          <td style={{ textAlign: "center", color: "#000000", padding: "5px 3px" }}>
                            {item?.unit || "-"}
                          </td>

                          {/* Job / Purpose */}
                          <td style={{ padding: "5px 5px", textAlign: "left", color: "#000000", wordBreak: "break-word" }}>
                            {item?.job || "-"}
                          </td>

                          {/* Return Status */}
                          <td style={{ textAlign: "center", fontSize: "9px", padding: "5px 3px", color: "#000000" }}>
                            {isReqFullyReturned || (returnedQty > 0 && returnedQty >= itemQty) ? (
                              <span style={{ fontWeight: "bold" }}>
                                คืนครบแล้ว ({itemQty}/{itemQty})
                              </span>
                            ) : returnedQty > 0 ? (
                              <span style={{ fontWeight: "bold" }}>
                                คืนแล้ว ({returnedQty}/{itemQty})
                              </span>
                            ) : isBorrow ? (
                              <span style={{ color: "#333333" }}>ยังไม่คืน</span>
                            ) : (
                              <span style={{ color: "#777777" }}>-</span>
                            )}
                          </td>

                          {/* Remark */}
                          <td style={{ padding: "5px 5px", textAlign: "left", color: "#333333", wordBreak: "break-word" }}>
                            {item?.remark || "-"}
                          </td>
                        </tr>
                      )
                    })
                  )}

                  {/* Formal Summary Row */}
                  <tr style={{ backgroundColor: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #000000" }}>
                    <td colSpan={2} style={{ padding: "4px 6px", textAlign: "right", color: "#000000" }}>
                      รวมทั้งสิ้น (TOTAL): {items.length} รายการ
                    </td>
                    <td style={{ textAlign: "center", color: "#000000", fontSize: "10.5px" }}>
                      {totalQuantity}
                    </td>
                    <td style={{ textAlign: "center", color: "#000000", fontSize: "9px" }}>
                      หน่วย
                    </td>
                    <td colSpan={3} style={{ padding: "4px 6px", textAlign: "left", fontSize: "9px", color: "#333333" }}>
                      {isReqFullyReturned ? (
                        <span style={{ fontWeight: "bold" }}>
                          ส่งคืนคลังครบถ้วนแล้ว: {totalQuantity} หน่วย
                        </span>
                      ) : hasReturnedItems ? (
                        <span>
                          ส่งคืนแล้ว: <strong>{totalReturned}</strong> หน่วย
                          {totalQuantity - totalReturned > 0 && (
                            <span style={{ marginLeft: "6px" }}>
                              (ค้างคืน: <strong>{totalQuantity - totalReturned}</strong> หน่วย)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>
                          {isBorrow
                            ? "ตรวจนับจำนวน ตรวจสภาพเครื่องมือและความพร้อมใช้งานให้เรียบร้อยก่อนรับมอบ"
                            : "ตรวจนับจำนวนและสภาพวัสดุอุปกรณ์ให้เรียบร้อยก่อนลงนามรับมอบ"}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1, minHeight: "6px" }}></div>

            {/* 3. FORMAL TERMS & CONDITIONS BANNER */}
            <div
              style={{
                border: "1px solid #000000",
                padding: "3px 8px",
                fontSize: "8.5px",
                color: "#222222",
                lineHeight: 1.3,
                marginBottom: "6px",
                backgroundColor: "#ffffff",
              }}
            >
              {isBorrow ? (
                <>
                  <strong style={{ color: "#000000" }}>ระเบียบและข้อกำหนดการยืมเครื่องมือและอุปกรณ์:</strong> 
                  &nbsp;1. ผู้ขอยืมต้องตรวจนับจำนวน ตรวจสอบสภาพและความพร้อมใช้งานของเครื่องมือ ณ วันที่รับมอบจากคลังสินค้า 
                  &nbsp;2. ผู้ยืมมีหน้าที่ดูแลรักษาเครื่องมือให้อยู่ในสภาพสมบูรณ์ และส่งคืนคลังสินค้าทันทีเมื่อเสร็จสิ้นภารกิจ 
                  &nbsp;3. หากเครื่องมือสูญหาย ชำรุด หรือเสียหายจากการใช้งานผิดประเภท ผู้ยืมต้องรับผิดชอบชดใช้ตามระเบียบของบริษัทฯ
                </>
              ) : (
                <>
                  <strong style={{ color: "#000000" }}>ระเบียบและข้อกำหนดการเบิกวัสดุอุปกรณ์โครงการ:</strong> 
                  &nbsp;1. ผู้ขอเบิกต้องตรวจสอบความถูกต้องและสภาพวัสดุอุปกรณ์ ณ วันที่รับมอบจากคลังสินค้า 
                  &nbsp;2. นำวัสดุอุปกรณ์ไปใช้งานตามวัตถุประสงค์ของโครงการที่ระบุไว้ในใบเบิกนี้เท่านั้น 
                  &nbsp;3. กรณีมีวัสดุเหลือใช้ ให้ประสานงานส่งคืนคลังสินค้าเพื่อบันทึกตัดยอดตามระเบียบของบริษัทฯ
                </>
              )}
            </div>

            {/* 4. FORMAL SIGNATURES AUDIT SECTION:
                - If isBorrow: ONLY 2 Signatures (Requester & Approver)
                - If !isBorrow: 4 Signatures (Requester, Approver, Storekeeper, Receiver)
            */}
            {isBorrow ? (
              /* Equipment Borrowing: Exactly 2 Signatures (Borrower & Approver) */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: isPortrait ? "14px" : "18px",
                  marginTop: "1px",
                }}
              >
                {/* Signer 1: ผู้ขอยืมอุปกรณ์ */}
                <div
                  style={{
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "2.5px 6px",
                      fontSize: isPortrait ? "9.5px" : "10px",
                      fontWeight: "bold",
                      color: "#000000",
                      borderBottom: "1px solid #000000",
                    }}
                  >
                    1. ผู้ขอยืมอุปกรณ์ (Borrower / Requester)
                  </div>

                  <div
                    style={{
                      height: isPortrait ? "42px" : "48px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      margin: "2px 0",
                    }}
                  >
                    {requisition.requesterSignatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={requisition.requesterSignatureUrl}
                        alt="Borrower Signature"
                        style={{ maxHeight: isPortrait ? "40px" : "46px", maxWidth: "130px", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ height: "20px" }}></div>
                    )}
                  </div>

                  <div style={{ borderBottom: "1px dotted #000000", width: "80%", margin: "0 auto 3px" }}></div>

                  <div style={{ padding: "0 4px 4px" }}>
                    <div style={{ fontSize: isPortrait ? "9.5px" : "10px", fontWeight: "bold", color: "#000000" }}>
                      ( {requisition.requester?.fullName || "...................................................."} )
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#444444", marginTop: "1px" }}>
                      ตำแหน่ง: {requisition.requester?.position || "พนักงานขอยืมอุปกรณ์"}
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#444444" }}>
                      วันที่ขอยืม: {requisitionDateStr}
                    </div>
                  </div>
                </div>

                {/* Signer 2: ผู้อนุมัติการยืม */}
                <div
                  style={{
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "2.5px 6px",
                      fontSize: isPortrait ? "9.5px" : "10px",
                      fontWeight: "bold",
                      color: "#000000",
                      borderBottom: "1px solid #000000",
                    }}
                  >
                    2. ผู้อนุมัติการยืม (Approver)
                  </div>

                  <div
                    style={{
                      height: isPortrait ? "42px" : "48px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      margin: "2px 0",
                    }}
                  >
                    {requisition.approverSignatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={requisition.approverSignatureUrl}
                        alt="Approver Signature"
                        style={{ maxHeight: isPortrait ? "40px" : "46px", maxWidth: "130px", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ height: "20px" }}></div>
                    )}
                  </div>

                  <div style={{ borderBottom: "1px dotted #000000", width: "80%", margin: "0 auto 3px" }}></div>

                  <div style={{ padding: "0 4px 4px" }}>
                    <div style={{ fontSize: isPortrait ? "9.5px" : "10px", fontWeight: "bold", color: "#000000" }}>
                      ( {requisition.approver?.fullName || "...................................................."} )
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#444444", marginTop: "1px" }}>
                      ตำแหน่ง: {requisition.approver?.position || requisition.approver?.role || "ผู้จัดการ / ผู้อนุมัติ"}
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#444444" }}>
                      วันที่อนุมัติ: {requisition.approverSignatureUrl ? formatThaiDate(requisition.updatedAt) : "...../...../........."}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Project Material Requisition: Exactly 4 Signatures */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "5px",
                  marginTop: "1px",
                }}
              >
                {/* Box 1: ผู้ขอเบิก */}
                <div
                  style={{
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "2px 4px",
                      fontSize: isPortrait ? "9px" : "9.5px",
                      fontWeight: "bold",
                      color: "#000000",
                      borderBottom: "1px solid #000000",
                    }}
                  >
                    1. ผู้ขอเบิก (Requester)
                  </div>

                  <div
                    style={{
                      height: isPortrait ? "38px" : "44px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      margin: "1px 0",
                    }}
                  >
                    {requisition.requesterSignatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={requisition.requesterSignatureUrl}
                        alt="Requester Signature"
                        style={{ maxHeight: isPortrait ? "36px" : "42px", maxWidth: "95px", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ height: "18px" }}></div>
                    )}
                  </div>

                  <div style={{ borderBottom: "1px dotted #000000", width: "88%", margin: "0 auto 2px" }}></div>

                  <div style={{ padding: "0 2px 3px" }}>
                    <div style={{ fontSize: isPortrait ? "9px" : "9.5px", fontWeight: "bold", color: "#000000" }}>
                      ( {requisition.requester?.fullName || "...................................."} )
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444", marginTop: "1px" }}>
                      ตำแหน่ง: {requisition.requester?.position || "พนักงานขอเบิก"}
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444" }}>
                      วันที่: {requisitionDateStr}
                    </div>
                  </div>
                </div>

                {/* Box 2: ผู้อนุมัติ */}
                <div
                  style={{
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "2px 4px",
                      fontSize: isPortrait ? "9px" : "9.5px",
                      fontWeight: "bold",
                      color: "#000000",
                      borderBottom: "1px solid #000000",
                    }}
                  >
                    2. ผู้อนุมัติ (Approver)
                  </div>

                  <div
                    style={{
                      height: isPortrait ? "38px" : "44px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      margin: "1px 0",
                    }}
                  >
                    {requisition.approverSignatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={requisition.approverSignatureUrl}
                        alt="Approver Signature"
                        style={{ maxHeight: isPortrait ? "36px" : "42px", maxWidth: "95px", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ height: "18px" }}></div>
                    )}
                  </div>

                  <div style={{ borderBottom: "1px dotted #000000", width: "88%", margin: "0 auto 2px" }}></div>

                  <div style={{ padding: "0 2px 3px" }}>
                    <div style={{ fontSize: isPortrait ? "9px" : "9.5px", fontWeight: "bold", color: "#000000" }}>
                      ( {requisition.approver?.fullName || "...................................."} )
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444", marginTop: "1px" }}>
                      ตำแหน่ง: {requisition.approver?.position || requisition.approver?.role || "ผู้จัดการ / ผู้อนุมัติ"}
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444" }}>
                      วันที่: {requisition.approverSignatureUrl ? formatThaiDate(requisition.updatedAt) : "...../...../........."}
                    </div>
                  </div>
                </div>

                {/* Box 3: ผู้จ่ายของ ฝ่ายคลัง */}
                <div
                  style={{
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "2px 4px",
                      fontSize: isPortrait ? "9px" : "9.5px",
                      fontWeight: "bold",
                      color: "#000000",
                      borderBottom: "1px solid #000000",
                    }}
                  >
                    3. ผู้จ่ายของ (Storekeeper)
                  </div>

                  <div
                    style={{
                      height: isPortrait ? "38px" : "44px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      margin: "1px 0",
                    }}
                  >
                    {requisition.storeStaffSignatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={requisition.storeStaffSignatureUrl}
                        alt="Store Staff Signature"
                        style={{ maxHeight: isPortrait ? "36px" : "42px", maxWidth: "95px", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ height: "18px" }}></div>
                    )}
                  </div>

                  <div style={{ borderBottom: "1px dotted #000000", width: "88%", margin: "0 auto 2px" }}></div>

                  <div style={{ padding: "0 2px 3px" }}>
                    <div style={{ fontSize: isPortrait ? "9px" : "9.5px", fontWeight: "bold", color: "#000000" }}>
                      ( {requisition.storeStaffName || "...................................."} )
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444", marginTop: "1px" }}>
                      ตำแหน่ง: เจ้าหน้าที่คลังสินค้า
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444" }}>
                      วันที่จ่าย: {requisition.dispensedAt ? formatThaiDate(requisition.dispensedAt) : "...../...../........."}
                    </div>
                  </div>
                </div>

                {/* Box 4: ผู้รับของ / ผู้รับมอบอุปกรณ์ */}
                <div
                  style={{
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "2px 4px",
                      fontSize: isPortrait ? "9px" : "9.5px",
                      fontWeight: "bold",
                      color: "#000000",
                      borderBottom: "1px solid #000000",
                    }}
                  >
                    4. ผู้รับของ (Receiver)
                  </div>

                  <div
                    style={{
                      height: isPortrait ? "38px" : "44px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      margin: "1px 0",
                    }}
                  >
                    {requisition.receiverSignatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={requisition.receiverSignatureUrl}
                        alt="Receiver Signature"
                        style={{ maxHeight: isPortrait ? "36px" : "42px", maxWidth: "95px", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ height: "18px" }}></div>
                    )}
                  </div>

                  <div style={{ borderBottom: "1px dotted #000000", width: "88%", margin: "0 auto 2px" }}></div>

                  <div style={{ padding: "0 2px 3px" }}>
                    <div style={{ fontSize: isPortrait ? "9px" : "9.5px", fontWeight: "bold", color: "#000000" }}>
                      ( {requisition.receiverName || "...................................."} )
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444", marginTop: "1px" }}>
                      ตำแหน่ง: ผู้รับมอบอุปกรณ์หน้างาน
                    </div>
                    <div style={{ fontSize: "8px", color: "#444444" }}>
                      วันที่รับ: {requisition.receivedAt ? formatThaiDate(requisition.receivedAt) : "...../...../........."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. FORM FOOTER & ISO AUDIT CODE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "7.5px",
                color: "#666666",
                marginTop: "4px",
                borderTop: "1px solid #dddddd",
                paddingTop: "2px",
              }}
            >
              <span>{formCode} | เอกสารควบคุมภายใน {currentCompany.th}</span>
              <span>พิมพ์เมื่อ: {formatThaiDateTime(new Date())} | หน้า 1 จาก 1</span>
            </div>
          </div>
        </div>

        {/* PAGE 2: Photos & Handover Proof (Only if photos or delivery notes exist) */}
        {(photos.length > 0 || returnPhotos.length > 0 || requisition.deliveryNote) && (
          <div
            className="requisition-sheet bg-white shadow-2xl print:shadow-none mx-auto relative overflow-hidden mt-8 print:mt-0 text-black"
            style={{
              width: sheetWidth,
              height: sheetHeight,
              padding: isPortrait ? "8mm 9mm" : "8mm 10mm",
              fontSize: isPortrait ? "11px" : "12px",
              lineHeight: 1.3,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "'Sarabun', 'TH Sarabun New', Tahoma, sans-serif",
            }}
          >
            <div
              style={{
                border: "1.5px solid #000000",
                padding: isPortrait ? "8px 10px" : "10px 14px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              {/* Photo Page Header */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1.5px solid #000000",
                    paddingBottom: "5px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentCompany.logoUrl} alt={currentCompany.en} style={{ height: "30px", objectFit: "contain" }} />
                    <div>
                      <div style={{ fontSize: isPortrait ? "13px" : "14px", fontWeight: "bold", color: "#000000" }}>
                        {isBorrow
                          ? "เอกสารแนบ: ภาพถ่ายการส่งมอบและการส่งคืนอุปกรณ์ (ATTACHMENT: PROOF OF HANDOVER & RETURN)"
                          : "เอกสารแนบ: ภาพถ่ายการส่งมอบและตรวจรับวัสดุอุปกรณ์ (ATTACHMENT: PROOF OF DELIVERY)"}
                      </div>
                      <div style={{ fontSize: "9px", color: "#555555" }}>
                        {currentCompany.th} — แผนกคลังสินค้าและจัดส่งอุปกรณ์
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "10px" }}>
                    <div>
                      เอกสารแนบเลขที่:{" "}
                      <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#000000" }}>
                        {requisition.requisitionNumber}
                      </span>
                    </div>
                    {rawProjName && rawProjName !== "-" && (
                      <div style={{ fontSize: "9px", color: "#444444" }}>
                        โครงการ: {rawProjName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Note if any */}
                {requisition.deliveryNote && (
                  <div
                    style={{
                      marginBottom: "8px",
                      padding: "5px 8px",
                      border: "1px solid #000000",
                      fontSize: "10px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <strong style={{ color: "#000000" }}>หมายเหตุการส่งมอบ / สถานที่วางของ:</strong>{" "}
                    {requisition.deliveryNote}
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: "8px" }}>
                {/* Delivery Photos */}
                {photos.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", marginBottom: "4px" }}>
                      {isBorrow
                        ? `ภาพถ่ายการส่งมอบอุปกรณ์ (${photos.length} รูป):`
                        : `ภาพถ่ายการส่งมอบวัสดุอุปกรณ์หน้างาน (${photos.length} รูป):`}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isPortrait ? "repeat(2, 1fr)" : `repeat(${Math.min(photos.length, 4)}, 1fr)`,
                        gap: "8px",
                      }}
                    >
                      {photos.slice(0, 4).map((pUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #000000",
                            padding: "4px",
                            backgroundColor: "#ffffff",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              height: isPortrait ? "130px" : "140px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              backgroundColor: "#f1f5f9",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={pUrl}
                              alt={`Delivery ${idx + 1}`}
                              style={{ maxHeight: isPortrait ? "130px" : "140px", maxWidth: "100%", objectFit: "contain" }}
                            />
                          </div>
                          <div style={{ fontSize: "9px", color: "#000000", marginTop: "3px", fontWeight: 600 }}>
                            ภาพส่งมอบที่ {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Return Request Photos if any */}
                {returnPhotos.length > 0 && (
                  <div style={{ marginTop: "4px" }}>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", marginBottom: "4px" }}>
                      ภาพถ่ายการส่งคืนอุปกรณ์เข้าคลัง ({returnPhotos.length} รูป):
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isPortrait ? "repeat(2, 1fr)" : `repeat(${Math.min(returnPhotos.length, 4)}, 1fr)`,
                        gap: "8px",
                      }}
                    >
                      {returnPhotos.slice(0, 4).map((rUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #000000",
                            padding: "4px",
                            backgroundColor: "#ffffff",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              height: isPortrait ? "130px" : "140px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              backgroundColor: "#f1f5f9",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={typeof rUrl === "string" ? rUrl : String(rUrl)}
                              alt={`Return Proof ${idx + 1}`}
                              style={{ maxHeight: isPortrait ? "130px" : "140px", maxWidth: "100%", objectFit: "contain" }}
                            />
                          </div>
                          <div style={{ fontSize: "9px", color: "#000000", marginTop: "3px", fontWeight: 600 }}>
                            ภาพส่งคืนที่ {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Footer on Photo Page */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "8px",
                  color: "#666666",
                  borderTop: "1px solid #000000",
                  paddingTop: "3px",
                  marginTop: "4px",
                }}
              >
                <span>ระบบบริหารจัดการคลังสินค้าและใบเบิก-ยืม — {currentCompany.th}</span>
                <span>พิมพ์เมื่อ: {formatThaiDateTime(new Date())}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
