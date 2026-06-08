"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";

export default function PrintClient({ data }: { data: any }) {
  const router = useRouter();

  // ── Helpers ──
  const toThaiDate = (v?: string | Date) => {
    if (!v) return '';
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return v.toString();
    const d2 = ('0' + dt.getDate()).slice(-2);
    const m2 = ('0' + (dt.getMonth() + 1)).slice(-2);
    const y2 = dt.getFullYear();
    return d2 + '/' + m2 + '/' + (y2 < 2500 ? y2 + 543 : y2);
  };

  const dp = (v?: string | Date) => {
    const s = toThaiDate(v);
    if (!s) return { d: '...', m: '...', y: '......' };
    const p = s.split('/');
    return { d: p[0] || '...', m: p[1] || '...', y: p[2] || '......' };
  };

  const installationDate = data?.installationDate || '';
  const rP = dp(installationDate);

  const checklistObj = data?.checklist || {};

  // ── Render one A4 sheet ──
  const renderA4Page = (copyLabel: string) => (
    <div className="ro-sheet">
      {/* Header */}
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
            <span className="ro-lbl">วันที่: </span>{toThaiDate(installationDate)}<br/>
            <span className="ro-lbl">บริษัท: </span>{data?.company || 'TERA GROUP'}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="ro-title">ใบส่งมอบ/ติดตั้งสินค้า</div>

      {/* Info Grid */}
      <div className="ro-info-grid">
        <div className="ro-info-row"><span className="ro-lbl">เลขที่เอกสาร:</span><span className="ro-val">{data?.installationNo || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ชื่องาน:</span><span className="ro-val">{data?.jobName || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ชื่อลูกค้า:</span><span className="ro-val">{data?.customer || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">เบอร์โทร:</span><span className="ro-val">{data?.senderPhone || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">เลขที่ใบเสนอราคา:</span><span className="ro-val">{data?.quotationNo || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ช่าง/วิศวกร:</span><span className="ro-val">{data?.technician || '-'}</span></div>
        <div className="ro-info-row ro-full"><span className="ro-lbl">ที่อยู่บริษัท:</span><span className="ro-val">{data?.address || '-'}</span></div>
        <div className="ro-info-row ro-full"><span className="ro-lbl">สถานที่หน้างาน:</span><span className="ro-val">{data?.siteAddress || '-'}</span></div>
      </div>

      {/* Notes */}
      <div className="ro-notes">
        <div className="ro-notes-line">
          <span className="ro-notes-label">หมายเหตุ: </span>
          <span className="ro-notes-value">{data?.note || '-'}</span>
        </div>
        <div className="ro-notes-line">
          <span className="ro-notes-label">งานอื่นๆ: </span>
          <span className="ro-notes-value">{checklistObj.workOther || '-'}</span>
        </div>
      </div>

      {/* Checklist */}
      <div className="ro-checklist-section">
        <div className="ro-checklist-title">รายการงานที่ดำเนินการ</div>
        <div className="ro-check-grid">
          <div className="ro-check-item">
            <div className={`ro-check-box ${checklistObj.workInspect ? 'ro-checked' : ''}`}>
              {checklistObj.workInspect ? '✓' : ''}
            </div>
            <span className="ro-check-label">งานตรวจเช็ค</span>
          </div>
          <div className="ro-check-item">
            <div className={`ro-check-box ${checklistObj.workInstall ? 'ro-checked' : ''}`}>
              {checklistObj.workInstall ? '✓' : ''}
            </div>
            <span className="ro-check-label">งานติดตั้ง</span>
          </div>
          <div className="ro-check-item">
            <div className={`ro-check-box ${checklistObj.workRepair ? 'ro-checked' : ''}`}>
              {checklistObj.workRepair ? '✓' : ''}
            </div>
            <span className="ro-check-label">งานซ่อม</span>
          </div>
          <div className="ro-check-item">
            <div className={`ro-check-box ${checklistObj.workTraining ? 'ro-checked' : ''}`}>
              {checklistObj.workTraining ? '✓' : ''}
            </div>
            <span className="ro-check-label">งานอบรม</span>
          </div>
        </div>
      </div>

      <hr className="ro-divider" />

      {/* Signatures */}
      <div className="ro-sign-section">
        <div className="ro-sign-row">
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้ปฏิบัติงาน / ช่างผู้รับผิดชอบ</div>
            <div className="ro-sign-sub">(พนักงาน TERA GROUP)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              <span>(</span><span className="ro-name-line">{data?.technician || ''}</span><span>)</span>
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่:</span>
              <span className="ro-date-part">{rP.d}</span><span>/</span>
              <span className="ro-date-part">{rP.m}</span><span>/</span>
              <span className="ro-date-part">{rP.y}</span>
            </div>
          </div>
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้ตรวจรับงาน / ผู้รับการติดตั้ง</div>
            <div className="ro-sign-sub">(ลูกค้า)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              <span>(</span><span className="ro-name-line">{data?.customer || ''}</span><span>)</span>
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่:</span>
              <span className="ro-date-part">{rP.d}</span><span>/</span>
              <span className="ro-date-part">{rP.m}</span><span>/</span>
              <span className="ro-date-part">{rP.y}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="ro-footer">
        <div className="ro-footnote">
          <div className="ro-footnote-head">หมายเหตุ:</div>
          1. โปรดตรวจสอบการทำงานก่อนรับมอบงาน หากรับมอบแล้วบริษัทจะไม่รับผิดชอบความเสียหายที่เกิดจากการใช้งานผิดประเภทภายหลัง<br/>
          2. หากมีข้อสงสัยเกี่ยวกับการใช้งาน สามารถติดต่อสอบถามได้ที่เบอร์บริษัท<br/>
          3. กรุณาเก็บใบส่งมอบงาน/ใบติดตั้งไว้เพื่อเป็นหลักฐาน
        </div>
        <div className="ro-code">FO-EN-05/REV.00</div>
      </div>
    </div>
  );

  return (
    <div className="ro-print-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

        /* ── Page setup ── */
        @page {
          size: A4;
          margin: 6mm 10mm 6mm 10mm;
        }

        /* ── Reset (scoped to print wrapper) ── */
        .ro-print-wrapper * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .ro-print-wrapper {
          font-family: 'Sarabun', sans-serif;
          color: #111;
          font-size: 14px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #e0e0e0;
        }

        /* ── Sheet (one A4 page) ── */
        .ro-sheet {
          width: 210mm;
          height: 297mm;
          margin: 8mm auto;
          padding: 6mm 12mm 6mm 12mm;
          background: #fff;
          box-shadow: 0 2px 16px rgba(0,0,0,.18);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          page-break-after: always;
        }

        /* ── Print overrides ── */
        @media print {
          .ro-print-wrapper { background: #fff; }
          .ro-sheet {
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .ro-fab { display: none !important; }
        }

        /* ── Header ── */
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

        /* ── Title ── */
        .ro-title {
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          margin: 1mm 0 2mm;
          flex-shrink: 0;
        }

        /* ── Info Grid ── */
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

        /* ── Notes ── */
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

        /* ── Checklist ── */
        .ro-checklist-section {
          margin-bottom: 2mm;
          flex-shrink: 0;
        }

        .ro-checklist-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 1.5mm;
        }

        .ro-check-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5mm 3mm;
          font-size: 12px;
        }

        .ro-check-item {
          display: flex;
          align-items: center;
          gap: 1.5mm;
        }

        .ro-check-box {
          width: 4mm;
          height: 4mm;
          border: 0.3mm solid #555;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .ro-check-box.ro-checked { background: #dcfce7; color: #166534; }
        .ro-check-box.ro-partial { background: #fef9c3; color: #854d0e; }
        .ro-check-label { flex: 1; font-size: 11px; }
        .ro-check-count { font-size: 10px; color: #555; white-space: nowrap; }

        /* ── Divider ── */
        .ro-divider {
          border: none;
          border-top: 0.3mm solid #ccc;
          margin: 1.5mm 0;
          flex-shrink: 0;
        }

        /* ── Signatures ── */
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

        /* ── Footer ── */
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

        /* ── Floating Action Bar ── */
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
          background: #ea580c; /* orange-600 */
          color: #fff;
          box-shadow: 0 4px 12px rgba(234,88,12,.3);
        }
        .ro-fab-print:hover { background: #c2410c; /* orange-700 */ }
      `}} />

      {/* Floating Action Bar */}
      <div className="ro-fab">
        <button onClick={() => router.back()} className="ro-fab-btn ro-fab-back">
          <ArrowLeft size={16} /> กลับ
        </button>
        <button onClick={() => window.print()} className="ro-fab-btn ro-fab-print">
          <Printer size={16} /> สั่งพิมพ์
        </button>
      </div>

      {/* Render 2 identical A4 Pages */}
      {renderA4Page("สำหรับบริษัท (Company Copy)")}
      {renderA4Page("สำหรับลูกค้า (Customer Copy)")}
    </div>
  );
}
