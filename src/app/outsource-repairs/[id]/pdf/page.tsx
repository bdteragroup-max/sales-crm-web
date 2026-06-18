import React from "react"
import prisma from "@/app/lib/db"
import { getUser } from "@/app/lib/dal"
import { notFound, redirect } from "next/navigation"
import PrintButton from "./PrintButton"

export const metadata = {
  title: "ใบส่งซ่อม | Sales CRM",
}

export default async function OutsourceRepairPDF({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getUser()
  if (!session) redirect('/login')

  const resolvedParams = await params
  const id = resolvedParams.id

  const data = await prisma.outsourceRepair.findUnique({
    where: { id },
    include: { job: true },
  })

  if (!data) notFound()

  // Format date helper
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-"
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, "0")
    const month = (d.getMonth() + 1).toString().padStart(2, "0")
    const year = (d.getFullYear() + 543).toString()
    return `${day}/${month}/${year}`
  }

  const items = (data.items as any[]) || []

  const renderA4Page = (copyLabel: string) => (
    <div className="ro-sheet">
      <div className="ro-header">
        <div className="ro-brand-left">
          <div className="ro-brand-logos">
            <img src="/17f3de5f-9a16-4fdd-8682-6157042b8cfd.png" alt="Logo" className="ro-logo-img" />
          </div>
          <div className="ro-brand-sub">
            39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250<br/>
            โทร: +66(0) 2328-0801-3 , +66(0)81-3152660 แฟกซ์: +66(0) 2328-0804
          </div>
        </div>
        <div className="ro-right-top">
          <div className="ro-copy-box">{copyLabel}</div>
          <div className="ro-right-meta">
            <span className="ro-lbl">วันที่: </span>{formatDate(data.sentDate || data.createdAt)}<br/>
          </div>
        </div>
      </div>

      <div className="ro-title">ใบส่งซ่อม</div>

      <div className="ro-info-grid">
        <div className="ro-info-row"><span className="ro-lbl">เลขที่เอกสาร:</span><span className="ro-val">{data.outsourceNumber || data.job?.jobNumber || "-"}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">เบอร์โทร:</span><span className="ro-val">{data.vendorPhone || "-"}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ส่งซ่อมบริษัท:</span><span className="ro-val">{data.vendorName || "-"}</span></div>
        <div className="ro-info-row ro-full"><span className="ro-lbl">ที่อยู่บริษัท:</span><span className="ro-val">{data.vendorAddress || "-"}</span></div>
      </div>

      <table className="ro-table">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>ลำดับ</th>
            <th style={{ width: '14%' }}>ประเภทสินค้า</th>
            <th style={{ width: '10%' }}>ยี่ห้อ</th>
            <th style={{ width: '14%' }}>รุ่น/โมเดล</th>
            <th style={{ width: '8%' }}>ขนาด</th>
            <th style={{ width: '18%' }}>Serial No.</th>
            <th style={{ width: '8%' }}>จำนวน</th>
            <th style={{ width: '22%' }}>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="ro-center">{item.type || item.brand ? idx + 1 : "\u00A0"}</td>
              <td>{item.type}</td>
              <td>{item.brand}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{item.model}</td>
              <td className="ro-center">{item.size}</td>
              <td>{item.serial}</td>
              <td className="ro-center">{item.qty}</td>
              <td>{item.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ro-notes">
        <div className="ro-notes-line">
          <span className="ro-notes-label">อาการเสีย:</span>
          <span className="ro-notes-value">{data.symptoms || "-"}</span>
        </div>
        <div className="ro-notes-line">
          <span className="ro-notes-label">การตั้งค่า (Settings):</span>
          <span className="ro-notes-value">{data.settings || "-"}</span>
        </div>
      </div>

      <div className="ro-sign-section">
        <div className="ro-sign-row">
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้ส่งซ่อม</div>
            <div className="ro-sign-sub">(ลงลายมือชื่อ)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              (<div className="ro-name-line"></div>)
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่</span>
              <span className="ro-date-part">{formatDate(data.sentDate || data.createdAt)}</span>
            </div>
          </div>
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้รับซ่อม</div>
            <div className="ro-sign-sub">(ลงลายมือชื่อ)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              (<div className="ro-name-line"></div>)
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่</span>
              <span className="ro-date-part">{formatDate(data.sentDate || data.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="ro-sign-row" style={{ marginTop: '24px' }}>
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้รับคืน</div>
            <div className="ro-sign-sub">(ลงลายมือชื่อ)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              (<div className="ro-name-line"></div>)
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่</span>
              <span className="ro-date-part"></span>/
              <span className="ro-date-part"></span>/
              <span className="ro-date-part"></span>
            </div>
          </div>
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้ส่งคืน</div>
            <div className="ro-sign-sub">(ลงลายมือชื่อ)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              (<div className="ro-name-line"></div>)
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่</span>
              <span className="ro-date-part"></span>/
              <span className="ro-date-part"></span>/
              <span className="ro-date-part"></span>
            </div>
          </div>
        </div>
      </div>

      <div className="ro-footer">
        <div className="ro-footnote">
          <div className="ro-footnote-head">หมายเหตุ:</div>
          1. โปรดตรวจสอบเครื่อง และอุปกรณ์ที่แนบมาเครื่อง บริษัทฯจะไม่รับผิดชอบหากท่านรับเครื่องแล้วไม่แจ้งต่อบุคคลนี้<br/>
          2. หากไม่มารับเครื่องภายใน 90 วัน บริษัทฯจะถือว่าท่านสละสิทธิ์
        </div>
        <div className="ro-code">
          FO-EN-03/REV.00
        </div>
      </div>
    </div>
  )

  return (
    <div className="ro-print-wrapper">
      <div className="ro-fab print:hidden">
        <PrintButton />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        .ro-print-wrapper {
          min-height: 100vh;
          background: #e0e0e0;
          font-family: 'Sarabun', sans-serif;
          color: #000;
          padding: 20px 0;
        }

        .ro-print-wrapper * {
          box-sizing: border-box;
        }

        .ro-print-wrapper span, 
        .ro-print-wrapper div, 
        .ro-print-wrapper td, 
        .ro-print-wrapper th {
          font-family: 'Sarabun', sans-serif;
          font-size: 14px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .ro-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 8mm auto;
          padding: 6mm 12mm 6mm 12mm;
          background: #fff;
          box-shadow: 0 2px 16px rgba(0,0,0,.18);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        @media print {
          @page {
            size: A4;
            margin: 0mm;
          }
          .ro-print-wrapper { background: #fff; padding: 0; }
          .ro-sheet {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 10mm 14mm;
            box-shadow: none;
          }
          .ro-fab { display: none !important; }
        }

        .ro-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4mm;
          margin-bottom: 1.5mm;
          flex-shrink: 0;
        }

        .ro-brand-left { flex: 1 1 auto; min-width: 0; }

        .ro-brand-logos {
          display: flex;
          align-items: center;
          gap: 2mm;
          margin-bottom: 1mm;
        }

        .ro-logo-img {
          height: 28px;
          object-fit: contain;
        }

        .ro-brand-sub {
          font-size: 12px;
          line-height: 1.4;
          color: #333;
        }

        .ro-right-top {
          width: 58mm;
          flex: 0 0 58mm;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .ro-copy-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 30mm;
          min-height: 7mm;
          padding: 0 3mm;
          border: 0.35mm solid #888;
          background: #ead3d6;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 1.5mm;
        }

        .ro-right-meta {
          font-size: 13px;
          text-align: right;
          line-height: 1.6;
        }

        .ro-lbl { font-weight: 700; }

        .ro-title {
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          margin: 1mm 0 2mm;
          flex-shrink: 0;
        }

        .ro-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5mm 6mm;
          margin-bottom: 2mm;
          font-size: 13px;
          flex-shrink: 0;
        }

        .ro-info-row {
          display: flex;
          gap: 1.5mm;
          align-items: baseline;
          padding-bottom: 0.3mm;
          border-bottom: 0.15mm dotted #ccc;
        }

        .ro-info-row.ro-full { grid-column: 1 / -1; }
        .ro-info-row .ro-lbl { white-space: nowrap; flex: 0 0 auto; }
        .ro-info-row .ro-val { flex: 1; min-height: 4mm; word-break: break-word; overflow: hidden; }

        .ro-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5mm 0 2mm;
          font-size: 12px;
          flex-shrink: 0;
        }

        .ro-table th,
        .ro-table td {
          border: 0.3mm solid #555;
          padding: 1.5mm 1.5mm;
          vertical-align: middle;
        }

        .ro-table th {
          text-align: center;
          font-weight: 700;
          background: #f2f2f2;
          font-size: 12px;
        }

        .ro-center { text-align: center; }

        .ro-notes {
          margin-bottom: 1.5mm;
          font-size: 13px;
          flex-shrink: 0;
        }

        .ro-notes-line {
          display: flex;
          gap: 1.5mm;
          align-items: baseline;
          margin-bottom: 1mm;
          padding-bottom: 0.3mm;
          border-bottom: 0.15mm dotted #ccc;
        }

        .ro-notes-label { font-weight: 700; flex: 0 0 auto; white-space: nowrap; }
        .ro-notes-value { flex: 1; word-break: break-word; overflow: hidden; max-height: 10mm; }

        .ro-sign-section {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 0;
        }

        .ro-sign-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5mm 14mm;
          margin-bottom: 2mm;
        }

        .ro-sign-block { text-align: center; }

        .ro-sign-role {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 0.5mm;
        }

        .ro-sign-sub {
          font-size: 10px;
          color: #888;
          margin-bottom: 0.5mm;
        }

        .ro-sig-space {
          height: 10mm;
        }

        .ro-name-line-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1mm;
          margin-bottom: 0.5mm;
          font-size: 13px;
        }

        .ro-name-line {
          display: inline-block;
          min-width: 45mm;
          min-height: 4.5mm;
          border-bottom: 0.25mm dotted #666;
          padding: 0 1mm 0.2mm;
          text-align: center;
        }

        .ro-date-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1mm;
          font-size: 12px;
          margin-top: 0.3mm;
        }

        .ro-date-label { font-weight: 700; }

        .ro-date-part {
          min-width: 8mm;
          min-height: 4mm;
          border-bottom: 0.25mm dotted #666;
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0 0.5mm 0.2mm;
        }

        .ro-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 6mm;
          margin-top: auto;
          font-size: 10px;
          color: #444;
          flex-shrink: 0;
        }

        .ro-footnote {
          flex: 1;
          line-height: 1.5;
        }

        .ro-footnote-head {
          font-weight: 700;
          margin-bottom: 0.3mm;
        }

        .ro-code {
          flex: 0 0 auto;
          text-align: right;
          font-size: 9px;
          color: #666;
        }

        .ro-fab {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 50;
          display: flex;
          gap: 8px;
        }

        .ro-fab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          font-family: 'Sarabun', sans-serif;
        }

        .ro-fab-back {
          background: #fff;
          color: #374151;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0,0,0,.1);
        }
        .ro-fab-back:hover { background: #f9fafb; }

        .ro-fab-print {
          background: #ff2301;
          color: #fff;
          box-shadow: 0 4px 12px rgba(255,35,1,.3);
        }
        .ro-fab-print:hover { background: #dc2020; }
      `}} />

      {renderA4Page("สำหรับบริษัท (Company Copy)")}
    </div>
  )
}
