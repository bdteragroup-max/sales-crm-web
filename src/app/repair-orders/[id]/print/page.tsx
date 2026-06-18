"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";

export default function RepairOrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const jobId = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/repair-order`);
        if (res.ok) {
          const fetched = await res.json();
          setData(fetched);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</div>;

  // ── Helpers ──
  const toThaiDate = (v?: string) => {
    if (!v) return '';
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return v;
    const d2 = ('0' + dt.getDate()).slice(-2);
    const m2 = ('0' + (dt.getMonth() + 1)).slice(-2);
    const y2 = dt.getFullYear();
    return d2 + '/' + m2 + '/' + (y2 < 2500 ? y2 + 543 : y2);
  };

  const dp = (v?: string) => {
    const s = toThaiDate(v);
    if (!s) return { d: '...', m: '...', y: '......' };
    const p = s.split('/');
    return { d: p[0] || '...', m: p[1] || '...', y: p[2] || '......' };
  };

  const repairReceivedDate = data?.receivedDate || '';
  const returnSentDate = data?.sentDate || '';

  const rP = dp(repairReceivedDate);
  const sP = dp(repairReceivedDate);
  const stP = dp(returnSentDate);
  const rrP = dp(returnSentDate);

  const CHECKLIST_DEF = [
    { key: 'Front', label: 'ด้านหน้า' },
    { key: 'Top', label: 'ด้านบน' },
    { key: 'SideLeft', label: 'ด้านข้าง (ซ้าย)' },
    { key: 'SideRight', label: 'ด้านข้าง (ขวา)' },
    { key: 'Inside', label: 'ด้านใน' },
    { key: 'Nameplate', label: 'Nameplate' },
    { key: 'Bottom', label: 'ด้านล่าง' },
    { key: 'TerminalNut', label: 'Terminal / Nut' },
    { key: 'TermCover', label: 'Term. cover' },
    { key: 'Cover', label: 'ฝาครอบ / Cover' },
    { key: 'Video', label: 'Video' }
  ];

  const items = data?.items || [];
  const productCount = items.length || 0;
  const checkedItems = CHECKLIST_DEF.map(def => {
    const imgs = data?.checklistImages?.[def.key] || [];
    let filledCount = 0;
    for (let pi = 0; pi < productCount; pi++) {
      const hasImg = !!(imgs[pi]);
      const hasCheck = (pi === 0) && (data?.checklist?.[def.key] === true);
      if (hasImg || hasCheck) filledCount++;
    }
    return { label: def.label, filled: filledCount, total: productCount };
  });

  // Use items as-is without padding empty rows
  const displayItems = [...items];

  // Collect attached images
  const attachedImages: { url: string; label: string }[] = [];
  const seenFileNames = new Set<string>();

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1]; // e.g. 1234-5678-my_image.jpg
      const match = last.match(/^\d+-\d+-(.+)$/);
      return match ? match[1] : last;
    } catch {
      return url;
    }
  };

  if (data?.checklistImages) {
    Object.entries(data.checklistImages).forEach(([key, urls]) => {
      if (Array.isArray(urls)) {
        urls.forEach((url, idx) => {
          if (url && typeof url === 'string') {
            const fileName = getFileName(url);
            if (!seenFileNames.has(fileName)) {
              seenFileNames.add(fileName);
              const def = CHECKLIST_DEF.find(c => c.key === key);
              attachedImages.push({
                url: url,
                label: def?.label?.split('/')[0] || key
              });
            }
          }
        });
      }
    });
  }

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
            <span className="ro-lbl">วันที่: </span>{toThaiDate(repairReceivedDate)}<br/>
            <span className="ro-lbl">บริษัท: </span>{data?.company || 'TERA GROUP'}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="ro-title">ใบรับซ่อม</div>

      {/* Info Grid */}
      <div className="ro-info-grid">
        <div className="ro-info-row"><span className="ro-lbl">เลขที่เอกสาร:</span><span className="ro-val">{data?.job?.jobNumber || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">เบอร์โทร:</span><span className="ro-val">{data?.phoneNumber || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ชื่อลูกค้า:</span><span className="ro-val">{data?.customerCompany || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">รูปแบบงาน:</span><span className="ro-val">{data?.workType || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">เลขที่ JOB:</span><span className="ro-val">
          {data?.deliveryNoteNo?.toUpperCase().startsWith('JB') 
            ? data.deliveryNoteNo 
            : (data?.job?.jobNumber && !data.job.jobNumber.startsWith('RO') ? data.job.jobNumber : '-')}
        </span></div>
        <div className="ro-info-row"><span className="ro-lbl">เลขที่ใบส่งสินค้า:</span><span className="ro-val">
          {data?.deliveryNoteNo?.toUpperCase().startsWith('JB') 
            ? '-' 
            : (data?.deliveryNoteNo || '-')}
        </span></div>
        <div className="ro-info-row"><span className="ro-lbl">เลขที่ Invoice:</span><span className="ro-val">{data?.invoiceNo || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ผู้รับซ่อม:</span><span className="ro-val">{data?.receiverName || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">ส่งซ่อมโดย:</span><span className="ro-val">{data?.senderName || '-'}</span></div>
        <div className="ro-info-row"><span className="ro-lbl">เซลล์ที่รับผิดชอบ:</span><span className="ro-val">{data?.salesPerson || '-'}</span></div>
        <div className="ro-info-row ro-full"><span className="ro-lbl">ที่อยู่:</span><span className="ro-val">{data?.customerAddress || '-'}</span></div>
      </div>

      {/* Product Table */}
      <table className="ro-table">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>ลำดับ</th>
            <th style={{ width: '14%' }}>ประเภทสินค้า</th>
            <th style={{ width: '10%' }}>ยี่ห้อ</th>
            <th style={{ width: '14%' }}>รุ่น/โมเดล</th>
            <th style={{ width: '8%' }}>ขนาด</th>
            <th style={{ width: '28%' }}>Serial No.</th>
            <th style={{ width: '6%' }}>จำนวน</th>
            <th style={{ width: '14%' }}>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((p: any, i: number) => (
            <tr key={i}>
              <td className="ro-center">{i + 1}</td>
              <td>{p.type || '\u00A0'}</td>
              <td>{p.brand || '\u00A0'}</td>
              <td>{p.model || '\u00A0'}</td>
              <td className="ro-center">{p.size || '\u00A0'}</td>
              <td>{p.serial || '\u00A0'}</td>
              <td className="ro-center">{p.qty || '\u00A0'}</td>
              <td>{p.remark || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes */}
      <div className="ro-notes">
        <div className="ro-notes-line">
          <span className="ro-notes-label">อาการเสีย: </span>
          <span className="ro-notes-value">{data?.symptoms || '-'}</span>
        </div>
        <div className="ro-notes-line">
          <span className="ro-notes-label">การตั้งค่า: </span>
          <span className="ro-notes-value">{data?.settings || '-'}</span>
        </div>
      </div>

      {/* Checklist */}
      <div className="ro-checklist-section">
        <div className="ro-checklist-title">รายการตรวจสอบสภาพ</div>
        <div className="ro-check-grid">
          {checkedItems.map((row, ri) => {
            const isFullCheck = (row.total > 0 && row.filled === row.total);
            const isPartial   = (row.filled > 0 && row.filled < row.total);
            const countLabel  = row.total > 0 ? `(${row.filled}/${row.total})` : '';
            return (
              <div className="ro-check-item" key={ri}>
                <div className={`ro-check-box ${isFullCheck ? 'ro-checked' : (isPartial ? 'ro-partial' : '')}`}>
                  {isFullCheck ? '✓' : (isPartial ? '!' : '')}
                </div>
                <span className="ro-check-label">{row.label}</span>
                {row.total > 0 && <span className="ro-check-count">{countLabel}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attached Images */}
      {attachedImages.length > 0 && (
        <div className="ro-images-section">
          <div className="ro-images-title">รูปภาพแนบ:</div>
          <div className="ro-images-grid">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="ro-img-item">
                <img src={img.url} className="ro-img-thumb" alt={img.label} />
                <span className="ro-img-label">{img.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="ro-divider" />

      {/* Signatures */}
      <div className="ro-sign-section">
        <div className="ro-sign-row">
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้รับซ่อม</div>
            <div className="ro-sign-sub">(บริษัท)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              <span>(</span><span className="ro-name-line">{data?.receiverName || ''}</span><span>)</span>
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่:</span>
              <span className="ro-date-part">{rP.d}</span><span>/</span>
              <span className="ro-date-part">{rP.m}</span><span>/</span>
              <span className="ro-date-part">{rP.y}</span>
            </div>
          </div>
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้ส่งคืน</div>
            <div className="ro-sign-sub">(บริษัท)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              <span>(</span><span className="ro-name-line"></span><span>)</span>
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่:</span>
              <span className="ro-date-part">{stP.d}</span><span>/</span>
              <span className="ro-date-part">{stP.m}</span><span>/</span>
              <span className="ro-date-part">{stP.y}</span>
            </div>
          </div>
        </div>
        <div className="ro-sign-row">
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้ส่งซ่อม</div>
            <div className="ro-sign-sub">(ลูกค้า)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              <span>(</span><span className="ro-name-line">{data?.senderName || ''}</span><span>)</span>
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่:</span>
              <span className="ro-date-part">{sP.d}</span><span>/</span>
              <span className="ro-date-part">{sP.m}</span><span>/</span>
              <span className="ro-date-part">{sP.y}</span>
            </div>
          </div>
          <div className="ro-sign-block">
            <div className="ro-sign-role">ผู้รับคืน</div>
            <div className="ro-sign-sub">(ลูกค้า)</div>
            <div className="ro-sig-space"></div>
            <div className="ro-name-line-wrap">
              <span>(</span><span className="ro-name-line"></span><span>)</span>
            </div>
            <div className="ro-date-row">
              <span className="ro-date-label">วันที่:</span>
              <span className="ro-date-part">{rrP.d}</span><span>/</span>
              <span className="ro-date-part">{rrP.m}</span><span>/</span>
              <span className="ro-date-part">{rrP.y}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="ro-footer">
        <div className="ro-footnote">
          <div className="ro-footnote-head">หมายเหตุ:</div>
          1. โปรดตรวจสอบสินค้าก่อนรับคืน หากรับคืนแล้วบริษัทจะไม่รับผิดชอบความเสียหายหรือการสูญหายภายหลัง<br/>
          2. หากไม่มารับคืนภายใน 90 วัน บริษัทขอสงวนสิทธิ์ในการดำเนินการ<br/>
          3. กรุณาเก็บใบรับซ่อมไว้เพื่อเป็นหลักฐานในการรับคืนสินค้า
        </div>
        <div className="ro-code">FO-EN-03/REV.00</div>
      </div>
    </div>
  );

  return (
    <div className="ro-print-wrapper w-full h-full overflow-y-auto print:overflow-visible print:h-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

        /* ── Page setup ── */
        @page {
          size: A4;
          margin: 0mm;
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
          min-height: 297mm;
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
        
        .ro-sheet:last-child {
          page-break-after: auto;
        }

        /* ── Print overrides ── */
        @media print {
          .ro-print-wrapper { background: #fff; padding: 0; }
          .ro-sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 10mm 14mm;
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

        /* ── Product Table ── */
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

        /* ── Attached Images ── */
        .ro-images-section {
          margin-bottom: 1.5mm;
          flex-shrink: 0;
        }

        .ro-images-title {
          font-weight: 700;
          font-size: 12px;
          margin-bottom: 1mm;
          text-decoration: underline;
        }

        .ro-images-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 2mm;
        }

        .ro-img-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 16mm;
        }

        .ro-img-thumb {
          width: 16mm;
          height: 16mm;
          object-fit: cover;
          border: 0.25mm solid #ccc;
        }

        .ro-img-label {
          font-size: 8px;
          color: #666;
          text-align: center;
          margin-top: 0.5mm;
          max-width: 16mm;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

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
          background: #ff2301;
          color: #fff;
          box-shadow: 0 4px 12px rgba(255,35,1,.3);
        }
        .ro-fab-print:hover { background: #dc2020; }
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
