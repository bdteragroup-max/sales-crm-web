/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { parseGoodsReturnData, ReturnItem, getInternalCompanyMeta } from "../types";

interface Props {
  data: any;
  mode?: "half" | "full"; // "half" = 2-in-1 on 1 A4 sheet (matching the physical photo), "full" = 2 full pages
}

export default function GoodsReturnPrintPaper({ data, mode = "half" }: Props) {
  const { items, reason, settings, phoneNumber, internalCompany } = parseGoodsReturnData(data);
  const compMeta = getInternalCompanyMeta(internalCompany);

  // Thai Date Formatter (พ.ศ.)
  const toThaiDate = (val?: string | Date | null) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const beYear = d.getFullYear() + 543;
    // e.g. 28/10/67 or 28/10/2569
    return `${day}/${month}/${beYear.toString().slice(-2)}`;
  };

  const dateStr = toThaiDate(data?.date || data?.createdAt);
  const senderDateStr = toThaiDate(data?.senderDate || data?.date);
  const receiverDateStr = toThaiDate(data?.receiverDate);

  const customerName = data?.customer || data?.company?.companyName || "-";
  const address = data?.deliveryLocation || data?.company?.address || "-";
  const phone = phoneNumber || data?.company?.phoneNumber || "-";
  const docNo = data?.documentNo || "-";
  const refNo = data?.reference || data?.job?.jobNumber || data?.quotation?.quotationNumber || "";

  // Render a single form slip (half or full)
  const renderSlip = (copyTitle: string, isHalf: boolean = true) => {
    // Render only the actual items entered (display rows strictly according to item count)
    // Fallback to 1 empty row only if no items were entered
    const displayRows: ReturnItem[] =
      items.length > 0
        ? items
        : [
            {
              no: 1,
              type: "",
              brand: "",
              model: "",
              size: "",
              serialNumber: "",
              quantity: 0,
              unit: "",
              remark: "",
            },
          ];

    return (
      <div className={`grp-slip ${isHalf ? "grp-slip-half" : "grp-slip-full"}`}>
        {/* Header */}
        <div className="grp-header">
          <div className="grp-logo-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compMeta.logoUrl || (compMeta.code === "TP" ? "/logos/tp.png" : compMeta.code === "TE" ? "/logos/te.png" : "/logos/tg.png")}
              alt={`${compMeta.label} Logo`}
              className="grp-logo-img"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes("7.png") && !img.src.includes("4.png") && !img.src.includes("6.png")) {
                  img.src = compMeta.code === "TP" ? "/7.png" : compMeta.code === "TE" ? "/6.png" : "/4.png";
                }
              }}
            />
          </div>
          <div className="grp-company-col">
            <h1 className="grp-company-name">{compMeta.fullName}</h1>
            <p className="grp-company-addr">
              {compMeta.address}
            </p>
            <p className="grp-company-tel">
              โทร: {compMeta.phone} แฟกซ์: {compMeta.fax}
            </p>
          </div>
          <div className="grp-copy-box">
            <span>{copyTitle}</span>
          </div>
        </div>

        {/* Title */}
        <div className="grp-title-wrap">
          <h2 className="grp-title">ใบส่งคืนสินค้า</h2>
        </div>

        {/* Info Grid */}
        <div className="grp-info-box">
          <div className="grp-info-row">
            <div className="grp-info-item flex-1">
              <span className="grp-lbl">บริษัท:</span>
              <span className="grp-val font-semibold">{customerName}</span>
            </div>
            <div className="grp-info-item w-[150px] justify-end">
              <span className="grp-lbl">วันที่:</span>
              <span className="grp-val text-center font-semibold">{dateStr}</span>
            </div>
          </div>
          <div className="grp-info-row">
            <div className="grp-info-item flex-1">
              <span className="grp-lbl">ที่อยู่:</span>
              <span className="grp-val truncate">{address}</span>
            </div>
            <div className="grp-info-item w-[190px]">
              <span className="grp-lbl">เบอร์โทร:</span>
              <span className="grp-val">{phone}</span>
            </div>
            <div className="grp-info-item w-[190px]">
              <span className="grp-lbl">เลขที่ใบส่งคืน:</span>
              <span className="grp-val font-mono font-bold text-gray-900">{docNo}</span>
            </div>
          </div>
          {refNo && (
            <div className="grp-info-row" style={{ marginTop: "1px" }}>
              <div className="grp-info-item flex-1">
                <span className="grp-lbl">อ้างถึง (JOB/PO/Ref):</span>
                <span className="grp-val font-mono">{refNo}</span>
              </div>
            </div>
          )}
        </div>

        {/* Product Table */}
        <table className="grp-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>ลำดับ</th>
              <th style={{ width: "16%" }}>ประเภทสินค้า</th>
              <th style={{ width: "14%" }}>ยี่ห้อ</th>
              <th style={{ width: "22%" }}>รุ่น / โมเดล</th>
              <th style={{ width: "9%" }}>ขนาด</th>
              <th style={{ width: "16%" }}>Serial No.</th>
              <th style={{ width: "6%" }}>จำนวน</th>
              <th style={{ width: "12%" }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const hasContent = Boolean(
                row.type || row.brand || row.model || row.size || row.serialNumber || (Number(row.quantity) > 0) || row.remark
              );
              return (
                <tr key={idx}>
                  <td className="text-center">{hasContent ? (row.no || idx + 1) : "\u00A0"}</td>
                  <td>{row.type || "\u00A0"}</td>
                  <td>{row.brand || "\u00A0"}</td>
                  <td className="grp-model-cell">{row.model || "\u00A0"}</td>
                  <td className="text-center">{row.size || "\u00A0"}</td>
                  <td>{row.serialNumber || "\u00A0"}</td>
                  <td className="text-center font-bold">
                    {Number(row.quantity) > 0 ? row.quantity : (hasContent && row.quantity === 0 ? "0" : "\u00A0")}
                  </td>
                  <td>{row.remark || "\u00A0"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Additional Notes */}
        <div className="grp-notes-box">
          <div className="grp-note-line">
            <span className="grp-note-lbl">การตั้งค่า :</span>
            <span className="grp-note-val">{settings || ""}</span>
          </div>
          <div className="grp-note-line">
            <span className="grp-note-lbl">อาการเสีย / สาเหตุการส่งคืน :</span>
            <span className="grp-note-val font-semibold">{reason || "-"}</span>
          </div>
        </div>

        {/* Signature Box */}
        <table className="grp-sig-table">
          <thead>
            <tr>
              <th style={{ width: "50%" }}>ผู้ส่งคืนสินค้า (ลูกค้า / ซับคอนแทรคเตอร์)</th>
              <th style={{ width: "50%" }}>ผู้รับคืนสินค้า (เจ้าหน้าที่คลังสินค้า)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="grp-sig-row">
                  <span className="grp-sig-role">ลงชื่อ</span>
                  <span className="grp-sig-line font-medium">
                    {data?.senderName || "\u00A0"}
                  </span>
                  <span className="grp-sig-date-lbl">ว.ด.ป.</span>
                  <span className="grp-sig-date">{senderDateStr || ".../.../..."}</span>
                </div>
              </td>
              <td>
                <div className="grp-sig-row">
                  <span className="grp-sig-role">ลงชื่อ</span>
                  <span className="grp-sig-line font-medium">
                    {data?.receiverName || "\u00A0"}
                  </span>
                  <span className="grp-sig-date-lbl">ว.ด.ป.</span>
                  <span className="grp-sig-date">{receiverDateStr || ".../.../..."}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Notes & Code */}
        <div className="grp-footer">
          <div className="grp-terms">
            <div>หมายเหตุ : 1. โปรดตรวจเช็คเครื่อง และอุปกรณ์ก่อนรับเครื่อง บริษัทฯ จะไม่รับผิดชอบหากท่านรับเครื่องไปแล้วทุกกรณี</div>
            <div>2. หากไม่มารับเครื่องกลับภายใน 90 วัน บริษัทฯ จะถือว่าท่านสละสิทธิ์</div>
          </div>
          <div className="grp-doc-code">FO-EN-03/Rev.00</div>
        </div>
      </div>
    );
  };

  return (
    <div className="grp-wrapper">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');

        @page {
          size: A4 portrait;
          margin: 0;
        }

        .grp-wrapper * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .grp-wrapper {
          font-family: 'TH Sarabun New', 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #000;
          font-size: 13.5px;
          line-height: 1.25;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #525659;
          padding: 20px 0;
        }

        .grp-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 4px 18px rgba(0,0,0,0.25);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        @media print {
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .grp-wrapper {
            background: #fff !important;
            padding: 0 !important;
          }
          .grp-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always;
            overflow: hidden !important;
          }
          .grp-no-print {
            display: none !important;
          }
        }

        /* ── Half Page Mode (2 slips per A4 sheet) ── */
        .grp-page-half-container {
          padding: 7mm 10mm 5mm 10mm;
          display: flex;
          flex-direction: column;
          height: 297mm;
          justify-content: space-between;
        }

        .grp-slip {
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .grp-slip-half {
          height: 138mm;
          justify-content: flex-start;
        }

        .grp-slip-full {
          min-height: 275mm;
          padding: 12mm 15mm;
        }
        .grp-slip-full .grp-header {
          min-height: 70px;
          margin-bottom: 8px;
        }
        .grp-slip-full .grp-logo-col {
          width: 145px;
          height: 70px;
        }
        .grp-slip-full .grp-logo-img {
          max-width: 140px;
          max-height: 65px;
        }
        .grp-slip-full .grp-company-col {
          padding: 0 150px;
        }
        .grp-slip-full .grp-info-box {
          margin-bottom: 12px;
        }
        .grp-slip-full .grp-table {
          margin-bottom: 12px;
        }
        .grp-slip-full .grp-table th,
        .grp-slip-full .grp-table td {
          padding: 7px 8px;
        }
        .grp-slip-full .grp-notes-box {
          margin-bottom: 14px;
        }
        .grp-slip-full .grp-sig-table th,
        .grp-slip-full .grp-sig-table td {
          padding: 7px 10px;
        }

        /* Divider line between slips */
        .grp-cut-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #888;
          font-size: 10.5px;
          margin: 1.5mm 0;
          user-select: none;
        }
        .grp-cut-line {
          flex: 1;
          border-top: 1px dashed #999;
          height: 0;
        }

        /* Header (Logo left, Copy box right, Company info truly dead-centered) */
        .grp-header {
          position: relative;
          width: 100%;
          min-height: 52px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .grp-logo-col {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 110px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        .grp-logo-img {
          max-width: 110px;
          max-height: 50px;
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
        }
        .grp-company-col {
          width: 100%;
          text-align: center;
          padding: 0 115px;
          line-height: 1.25;
        }
        .grp-company-name {
          font-size: 17px;
          font-weight: 700;
          color: #000;
          margin-bottom: 2px;
        }
        .grp-company-addr {
          font-size: 11.5px;
          color: #222;
        }
        .grp-company-tel {
          font-size: 11px;
          color: #333;
        }
        .grp-copy-box {
          position: absolute;
          right: 0;
          top: 0;
          border: 1.5px solid #000;
          padding: 3px 10px;
          font-weight: 700;
          font-size: 13.5px;
          border-radius: 2px;
          background: #fff;
          white-space: nowrap;
        }

        /* Title */
        .grp-title-wrap {
          text-align: center;
          margin: 4px 0 7px 0;
        }
        .grp-title {
          font-size: 18.5px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        /* Info Box */
        .grp-info-box {
          border-top: 1px solid #ccc;
          padding-top: 5px;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .grp-info-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 4px;
        }
        .grp-info-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
          min-width: 0;
        }
        .grp-lbl {
          font-weight: 700;
          flex-shrink: 0;
          color: #111;
          font-size: 13px;
        }
        .grp-val {
          flex: 1;
          min-width: 0;
          border-bottom: 1px dotted #888;
          padding-bottom: 2px;
        }

        /* Product Table */
        .grp-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 12.5px;
        }
        .grp-table th,
        .grp-table td {
          border: 1px solid #000;
          padding: 5.5px 6px;
          line-height: 1.35;
          vertical-align: middle;
        }
        .grp-table th {
          background-color: #f7f7f7;
          font-weight: 700;
          text-align: center;
          font-size: 12.5px;
          padding: 5px 4px;
        }
        .grp-model-cell {
          word-break: break-word;
        }

        /* Notes Box */
        .grp-notes-box {
          font-size: 12.5px;
          margin-bottom: 8px;
          line-height: 1.35;
        }
        .grp-note-line {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 4px;
        }
        .grp-note-lbl {
          font-weight: 700;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .grp-note-val {
          flex: 1;
          border-bottom: 1px dotted #888;
          min-height: 18px;
          padding-bottom: 2px;
        }

        /* Signature Table */
        .grp-sig-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 12.5px;
        }
        .grp-sig-table th,
        .grp-sig-table td {
          border: 1px solid #000;
          padding: 8px 10px;
          vertical-align: middle;
        }
        .grp-sig-table th {
          text-align: center;
          font-weight: 700;
          background: #f7f7f7;
          font-size: 12.5px;
          padding: 5px 8px;
        }
        .grp-sig-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin: 2px 0;
        }
        .grp-sig-role {
          font-weight: 700;
          width: 36px;
          flex-shrink: 0;
          color: #111;
        }
        .grp-sig-line {
          flex: 1;
          text-align: center;
          font-size: 12.5px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border-bottom: 1px dotted #888;
          min-height: 20px;
          padding-bottom: 1px;
        }
        .grp-sig-date-lbl {
          font-weight: 700;
          margin-left: 10px;
          flex-shrink: 0;
          color: #111;
        }
        .grp-sig-date {
          width: 80px;
          text-align: center;
          border-bottom: 1px dotted #888;
          flex-shrink: 0;
          min-height: 20px;
          padding-bottom: 1px;
          font-size: 12px;
        }

        /* Footer */
        .grp-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 10px;
          line-height: 1.2;
          color: #222;
          margin-top: auto;
          padding-top: 1px;
        }
        .grp-terms {
          flex: 1;
        }
        .grp-doc-code {
          font-weight: 600;
          color: #444;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
      `,
        }}
      />

      {mode === "half" ? (
        /* ── 2-in-1 on single A4 sheet (matching the physical paper) ── */
        <div className="grp-page grp-page-half-container">
          {/* Top Half: ส่วนของลูกค้า / ซับคอนแทรคเตอร์ */}
          {renderSlip("ส่วนของลูกค้า", true)}

          {/* Dotted Cut Line */}
          <div className="grp-cut-divider">
            <span className="grp-cut-line" />
            <span>✂ ตัดตามรอยประ (Customer Copy / Company Copy) ✂</span>
            <span className="grp-cut-line" />
          </div>

          {/* Bottom Half: ส่วนของบริษัท / คลังสินค้า */}
          {renderSlip("ส่วนของบริษัท", true)}
        </div>
      ) : (
        /* ── 2 Full Pages Mode ── */
        <>
          <div className="grp-page">
            {renderSlip("ส่วนของลูกค้า (Customer Copy)", false)}
          </div>
          <div className="grp-page" style={{ marginTop: "20px" }}>
            {renderSlip("ส่วนของบริษัท (Company Copy)", false)}
          </div>
        </>
      )}
    </div>
  );
}
