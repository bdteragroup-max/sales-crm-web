import {
  DEFAULT_REPORT_TITLE,
  DEFAULT_VISUAL_CHECK_ITEMS,
  formatCleaningDateBkk,
  formatCleaningDateSlashBe,
  formatCleaningDateTimeBkk,
  normalizeReportData,
  resolveElectricalChecks,
  resolveManagerSignConfig,
  type InspectionPassStatus,
  type SolarCleaningRecord,
} from '@/app/lib/solarCleaningConfig';
import { getSurveyCompanyMeta, type SurveyCompanyCode } from '@/app/lib/surveyMetadata';

export type InspectionReportPdfAssets = {
  logoDataUri?: string | null;
  companyLogos?: Partial<Record<SurveyCompanyCode, string | null>>;
  fontRegularBase64?: string | null;
  fontBoldBase64?: string | null;
  resolvedImageDataUris?: Record<string, string>;
};

function esc(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escMultiline(val: unknown): string {
  const s = esc(val);
  return s ? s.replace(/\r?\n/g, '<br/>') : '-';
}

function splitBalancedPhotoRows(
  urls: string[],
  notes?: string[]
): { url: string; index: number; note: string }[][] {
  const safeNotes = Array.isArray(notes) ? notes : [];
  const clean = urls
    .map((url, idx) => ({
      url: (url || '').trim(),
      note: typeof safeNotes[idx] === 'string' ? safeNotes[idx].trim() : '',
    }))
    .filter((item) => Boolean(item.url))
    .map((item, idx) => ({ ...item, index: idx + 1 }));

  if (clean.length === 0) return [];
  if (clean.length === 1) return [[clean[0]]];
  if (clean.length === 3) return [clean];

  const rows: { url: string; index: number; note: string }[][] = [];
  for (let i = 0; i < clean.length; i += 2) {
    rows.push(clean.slice(i, i + 2));
  }
  if (rows.length >= 2 && rows[rows.length - 1].length === 1) {
    const lastSingle = rows.pop()!;
    rows[rows.length - 1] = [...rows[rows.length - 1], ...lastSingle];
  }
  return rows;
}

function renderPassStamp(status?: InspectionPassStatus | string | null): string {
  const isPass = String(status || 'PASS').toUpperCase() !== 'NOT_PASS';
  return isPass
    ? `<span class="status-stamp pass">RESULT: PASS</span>`
    : `<span class="status-stamp fail">RESULT: NOT PASS</span>`;
}

export function generateInspectionReportPdfHtml(
  record: Partial<SolarCleaningRecord>,
  assets: InspectionReportPdfAssets = {}
): string {
  const r = record || {};
  const report = normalizeReportData(r.reportData);
  const companyMeta = getSurveyCompanyMeta(r.companyCode);
  const selectedLogoUri = assets.companyLogos?.[companyMeta.code] ?? assets.logoDataUri ?? null;
  const resolveImg = (url?: string | null): string => {
    const clean = (url || '').trim();
    if (!clean) return '';
    return assets.resolvedImageDataUris?.[clean] || clean;
  };

  const reportTitle = (r.reportTitle || '').trim() || DEFAULT_REPORT_TITLE;
  const effectiveDate = r.reportDate || r.inspectionDate;
  const coverDateLong = effectiveDate ? formatCleaningDateBkk(effectiveDate, true) : '-';
  const coverDateSlash = effectiveDate ? formatCleaningDateSlashBe(effectiveDate) : '-';
  const printTime = formatCleaningDateTimeBkk(new Date());

  const { includeAc, includeDc } = resolveElectricalChecks(report.electricalCheckMode);
  let nextSecNo = 3;
  const acSecNo = includeAc ? String(nextSecNo++).padStart(2, '0') : '';
  const dcVoltSecNo = includeDc ? String(nextSecNo++).padStart(2, '0') : '';
  const dcCurrSecNo = includeDc ? String(nextSecNo++).padStart(2, '0') : '';
  const thermoSecNo = String(nextSecNo++).padStart(2, '0');
  const finalSecNo = String(nextSecNo++).padStart(2, '0');

  const fontFaceCss = `
    ${
      assets.fontRegularBase64
        ? `@font-face { font-family: 'Sarabun'; font-style: normal; font-weight: 400; src: url('data:font/woff2;base64,${assets.fontRegularBase64}') format('woff2'); }`
        : ''
    }
    ${
      assets.fontBoldBase64
        ? `@font-face { font-family: 'Sarabun'; font-style: normal; font-weight: 700; src: url('data:font/woff2;base64,${assets.fontBoldBase64}') format('woff2'); }`
        : ''
    }
  `;

  const logoHtml = selectedLogoUri
    ? `<img src="${selectedLogoUri}" class="logo" alt="${esc(companyMeta.enName)} Logo" />`
    : `<div class="logo-fallback">${esc(companyMeta.code)}</div>`;

  const renderPhotoRows = (urls: string[], altPrefix: string, notes?: string[]) => {
    const rows = splitBalancedPhotoRows(urls, notes);
    if (rows.length === 0) {
      return `<div class="empty-photo-box">ยังไม่มีภาพถ่ายแนบในหัวข้อนี้</div>`;
    }
    const total = urls.filter(Boolean).length;
    return rows
      .map((row) => {
        const cls = row.length === 1 ? 'cols-1' : row.length === 3 ? 'cols-3' : 'cols-2';
        return `
          <div class="photo-strip ${cls}">
            ${row
              .map(
                ({ url, index, note }) => `
              <div class="photo-slot ${cls}">
                <div class="photo-thumb">
                  <img src="${esc(resolveImg(url))}" alt="${esc(altPrefix)} #${index}" />
                </div>
                <div class="photo-cap">${total > 1 ? `FIGURE ${index} OF ${total} (ภาพที่ ${index}/${total})` : 'EVIDENCE PHOTO (ภาพประกอบ)'}</div>
                ${note ? `<div class="photo-note">${escMultiline(note)}</div>` : ''}
              </div>
            `
              )
              .join('')}
          </div>
        `;
      })
      .join('');
  };

  const renderRemarkBox = (remark?: string | null) =>
    (remark || '').trim()
      ? `
    <div class="remark-box">
      <div class="remark-title">REMARKS / หมายเหตุ</div>
      <div class="remark-text">${escMultiline(remark)}</div>
    </div>
  `
      : '';

  const renderCleaningSubBlock = (
    title: string,
    photos: string[],
    remark: string,
    photoNotes?: string[]
  ) => `
    <div class="sub-block ${photos.length <= 4 ? 'keep-together' : ''}">
      <div class="sub-head">
        <span>${esc(title)}</span>
        <span class="sub-count">${photos.length} PHOTOS</span>
      </div>
      <div class="sub-body">
        ${renderPhotoRows(photos, title, photoNotes)}
        ${renderRemarkBox(remark)}
      </div>
    </div>
  `;

  const renderSectionBanner = (
    secNo: string,
    category: string,
    subtitle: string,
    statusHtml = ''
  ) => `
    <div class="section-banner">
      <div class="section-banner-left">
        <div class="banner-eyebrow">SECTION ${esc(secNo)} &bull; TECHNICAL INSPECTION RECORD</div>
        <div class="banner-title">${esc(category)} <span class="banner-sub">&mdash; ${esc(subtitle)}</span></div>
      </div>
      ${statusHtml ? `<div class="section-banner-right">${statusHtml}</div>` : ''}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>Official Inspection Report - ${esc(r.docNumber || r.customerName || '')}</title>
  <style>
    ${fontFaceCss}
    * { box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 11mm 12mm 14mm 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.42;
      background: #ffffff;
    }

    /* ── Formal Executive Cover Page ── */
    .cover-page {
      min-height: 256mm;
      position: relative;
      border: 1.5px solid #0f172a;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 15mm 15mm 13mm 23mm;
      page-break-after: always;
      break-after: page;
      background: #ffffff;
    }
    .cover-stripe-navy {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 9mm;
      background: #0f172a;
    }
    .cover-stripe-crimson {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 9mm;
      width: 3mm;
      background: #b91c1c;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
    }
    .cover-division-tag {
      display: inline-block;
      padding: 3px 9px;
      background: #0f172a;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.7px;
      text-transform: uppercase;
    }
    .cover-doc-table {
      margin-top: 8px;
      border-collapse: collapse;
      border: 1px solid #0f172a;
      font-size: 10.5px;
    }
    .cover-doc-table td {
      padding: 3px 8px;
      border: 1px solid #cbd5e1;
    }
    .cover-doc-table td.lbl {
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
    }
    .cover-doc-table td.val {
      font-weight: 700;
      color: #0f172a;
    }
    .logo {
      height: 70px;
      width: auto;
      max-width: 190px;
      object-fit: contain;
    }
    .logo-fallback {
      width: 60px;
      height: 54px;
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cover-center {
      margin: auto 0;
      padding: 16px 0;
    }
    .cover-project-label {
      font-size: 13px;
      font-weight: 700;
      color: #b91c1c;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .cover-main-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.32;
      margin: 0 0 12px;
    }
    .cover-title-rule {
      width: 90px;
      height: 3px;
      background: #b91c1c;
      margin-bottom: 18px;
    }
    .cover-spec-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
    }
    .cover-spec-head {
      background: #f1f5f9;
      border-bottom: 1.5px solid #0f172a;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      text-align: left;
    }
    .cover-spec-table td {
      padding: 7px 11px;
      border-bottom: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      font-size: 12px;
      vertical-align: top;
    }
    .cover-spec-table tr:last-child td {
      border-bottom: none;
    }
    .cover-spec-table td:last-child {
      border-right: none;
    }
    .cover-spec-table td.sk {
      width: 23%;
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
    }
    .cover-spec-table td.sv {
      color: #0f172a;
    }
    .cover-spec-table td.sv:not([colspan]) {
      width: 27%;
    }
    .cover-client-big {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .cover-bottom {
      border-top: 2px solid #0f172a;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .cover-corp-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .cover-corp-addr {
      font-size: 10px;
      color: #475569;
    }

    /* ── Architectural Engineering Stamps & Banners ── */
    .report-section {
      margin-bottom: 13px;
    }
    .section-banner {
      background: #0f172a;
      color: #ffffff;
      border-left: 5px solid #b91c1c;
      padding: 7px 12px;
      margin-bottom: 9px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .banner-eyebrow {
      font-size: 8.8px;
      letter-spacing: 0.7px;
      color: #cbd5e1;
      font-weight: 700;
    }
    .banner-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }
    .banner-sub {
      font-weight: 400;
      color: #e2e8f0;
    }
    .status-stamp {
      display: inline-block;
      padding: 2px 9px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      white-space: nowrap;
      border: 1.5px solid;
    }
    .status-stamp.pass {
      background: #ecfdf5;
      color: #065f46;
      border-color: #059669;
    }
    .status-stamp.fail {
      background: #fef2f2;
      color: #991b1b;
      border-color: #dc2626;
    }

    /* Sub-block Sharp Engineering Frame */
    .sub-block {
      border: 1.2px solid #334155;
      margin-bottom: 10px;
      background: #ffffff;
    }
    .sub-block.keep-together {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sub-head {
      background: #f1f5f9;
      border-bottom: 1.2px solid #334155;
      padding: 5px 10px;
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sub-count {
      font-size: 9.5px;
      color: #475569;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .sub-body {
      padding: 8px 10px;
    }

    /* Crisp Photo Documentation Plates */
    .photo-strip {
      display: grid;
      gap: 8px;
      margin-bottom: 7px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .photo-strip.cols-1 { grid-template-columns: 1fr; }
    .photo-strip.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .photo-strip.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .photo-slot {
      border: 1px solid #94a3b8;
      padding: 5px;
      background: #ffffff;
    }
    .photo-thumb {
      width: 100%;
      height: 170px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .photo-slot.cols-1 .photo-thumb { height: 205px; }
    .photo-slot.cols-3 .photo-thumb { height: 140px; }
    .photo-thumb img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .photo-cap {
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
      text-align: center;
      margin-top: 4px;
      padding-top: 3px;
      border-top: 1px solid #e2e8f0;
      letter-spacing: 0.2px;
    }
    .photo-note {
      margin-top: 4px;
      padding: 4px 6px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 10.2px;
      line-height: 1.38;
      color: #0f172a;
      word-break: break-word;
      text-align: left;
    }
    .empty-photo-box {
      padding: 10px;
      border: 1px dashed #94a3b8;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 7px;
    }

    /* Formal Remarks Box */
    .remark-box {
      border: 1px solid #cbd5e1;
      border-left: 3px solid #334155;
      background: #f8fafc;
      padding: 5px 9px;
      font-size: 11px;
    }
    .remark-title {
      font-size: 9.2px;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }
    .remark-text {
      color: #0f172a;
      word-break: break-word;
    }

    /* Equipment List Table */
    .equip-list {
      margin: 0 0 8px;
      padding: 7px 10px 7px 26px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      font-size: 11px;
    }
    .equip-list li {
      margin-bottom: 2px;
    }

    /* Official Visual Inspection Checklist Table */
    table.visual-check-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.3px solid #0f172a;
      margin-bottom: 9px;
      font-size: 10.8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table.visual-check-table th,
    table.visual-check-table td {
      border: 1px solid #94a3b8;
      padding: 4.5px 7px;
      vertical-align: middle;
    }
    table.visual-check-table thead tr.vc-head-top th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      border-color: #334155;
    }
    table.visual-check-table thead tr.vc-head-sub td {
      background: #f1f5f9;
      font-weight: 700;
      color: #b91c1c;
      text-align: center;
      border-bottom: 1.3px solid #0f172a;
    }
    table.visual-check-table thead tr.vc-head-sub td.vc-sub-title {
      text-align: left;
    }
    table.visual-check-table td.vc-no {
      width: 44px;
      text-align: center;
      font-weight: 700;
      color: #334155;
    }
    table.visual-check-table td.vc-status {
      width: 56px;
      text-align: center;
      font-weight: 700;
    }
    table.visual-check-table td.vc-ok {
      color: #065f46;
      background: #f0fdf4;
    }
    table.visual-check-table td.vc-bad {
      color: #991b1b;
      background: #fef2f2;
    }

    /* Engineering Measurement Grids */
    .meas-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
      border: 1px solid #334155;
      margin-bottom: 8px;
    }
    .meas-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
      border: 1px solid #334155;
      margin-bottom: 8px;
    }
    .meas-cell {
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      padding: 5px 9px;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .meas-lbl {
      font-weight: 700;
      color: #334155;
    }
    .meas-val {
      font-weight: 700;
      color: #0f172a;
    }

    /* Formal NETA Standard Compliance Note */
    .neta-box {
      border: 1px solid #334155;
      border-left: 4px solid #b91c1c;
      background: #f8fafc;
      padding: 8px 10px;
      margin-bottom: 9px;
      font-size: 10.8px;
      color: #1e293b;
      break-inside: avoid;
    }
    .neta-cam {
      margin-top: 4px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Overall Certification & Dual Executive Sign-off */
    .final-block {
      border: 1.5px solid #0f172a;
      margin-top: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
      background: #ffffff;
    }
    .result-banner {
      padding: 10px 14px;
      background: #f8fafc;
      border-bottom: 1.2px solid #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
    }
    .result-main {
      flex: 1;
      min-width: 0;
    }
    .result-heading {
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .result-heading-th {
      font-weight: 400;
      font-size: 11px;
      color: #475569;
      text-decoration: none;
    }
    .result-checks {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-top: 6px;
    }
    .result-check-item {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .result-check-item.is-checked-pass {
      color: #065f46;
    }
    .result-check-item.is-checked-fail {
      color: #991b1b;
    }
    .check-sq {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border: 1.5px solid #0f172a;
      background: #ffffff;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    }
    .check-sq.checked-pass {
      border-color: #059669;
      background: #059669;
      color: #ffffff;
    }
    .check-sq.checked-fail {
      border-color: #dc2626;
      background: #dc2626;
      color: #ffffff;
    }
    .result-remark {
      font-size: 11px;
      color: #334155;
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px dashed #cbd5e1;
    }
    .result-big {
      padding: 5px 16px;
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
      border: 2px solid;
      white-space: nowrap;
    }
    .result-big.pass {
      background: #ecfdf5;
      color: #065f46;
      border-color: #059669;
    }
    .result-big.fail {
      background: #fef2f2;
      color: #991b1b;
      border-color: #dc2626;
    }
    table.sign-table-2 {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.sign-table-2 th {
      background: #f1f5f9;
      border-bottom: 1.2px solid #0f172a;
      border-right: 1px solid #94a3b8;
      padding: 6px 10px;
      font-size: 11.2px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }
    table.sign-table-2 th:last-child,
    table.sign-table-2 td:last-child {
      border-right: none;
    }
    table.sign-table-2 td {
      border-right: 1px solid #94a3b8;
      padding: 10px 14px 12px;
      text-align: center;
      vertical-align: bottom;
      font-size: 11px;
    }
    .sign-img-wrap {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 4px auto 2px;
    }
    .sign-img {
      max-width: 190px;
      max-height: 56px;
      object-fit: contain;
    }
    .sign-prefix-row {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      width: 82%;
      margin: 40px auto 4px;
      font-size: 10.5px;
      color: #334155;
    }
    .sign-prefix-line {
      flex: 1;
      border-bottom: 1px dotted #475569;
    }
    .sign-line {
      width: 80%;
      border-bottom: 1px dotted #475569;
      margin: 4px auto 4px;
    }

    .doc-footer {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #475569;
    }
  </style>
</head>
<body>

  <!-- ═══ EXECUTIVE COVER PAGE ═══ -->
  <div class="cover-page">
    <div class="cover-stripe-navy"></div>
    <div class="cover-stripe-crimson"></div>

    <div class="cover-top">
      <div>
        <span class="cover-division-tag">TECHNICAL SERVICE &amp; O&amp;M DIVISION &bull; OFFICIAL REPORT</span>
        <table class="cover-doc-table">
          <tr>
            <td class="lbl">เลขที่เอกสาร / Doc No.</td>
            <td class="val">${esc(r.docNumber || '-')}</td>
          </tr>
          <tr>
            <td class="lbl">วันที่ออกรายงาน (พ.ศ.)</td>
            <td class="val">${esc(coverDateSlash)}</td>
          </tr>
        </table>
      </div>
      ${logoHtml}
    </div>

    <div class="cover-center">
      <div class="cover-project-label">${esc(report.coverSubtitle || 'PROJECT: SOLAR ROOFTOP')}</div>
      <h1 class="cover-main-title">${esc(reportTitle)}</h1>
      <div class="cover-title-rule"></div>

      <table class="cover-spec-table">
        <thead>
          <tr>
            <th colspan="4" class="cover-spec-head">ข้อมูลโครงการและรายละเอียดการตรวจสอบ (PROJECT &amp; INSPECTION SPECIFICATION)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="sk">ชื่อลูกค้า / บริษัท</td>
            <td colspan="3" class="sv"><span class="cover-client-big">${esc(r.customerName || '-')}</span></td>
          </tr>
          <tr>
            <td class="sk">ชื่อโครงการ</td>
            <td colspan="3" class="sv"><strong>${esc(r.projectName || '-')}</strong></td>
          </tr>
          <tr>
            <td class="sk">สถานที่ติดตั้ง</td>
            <td colspan="3" class="sv">${escMultiline(r.location)}</td>
          </tr>
          <tr>
            <td class="sk">กำลังการผลิตรวม</td>
            <td class="sv"><strong>${esc(r.systemSizeKwp || '-')}</strong></td>
            <td class="sk">รอบการตรวจเช็ค</td>
            <td class="sv">${esc(r.inspectionRound || '-')}</td>
          </tr>
          <tr>
            <td class="sk">วันที่เข้าดำเนินการ</td>
            <td class="sv">${esc(coverDateLong)}</td>
            <td class="sk">คณะผู้เข้าตรวจเช็ค</td>
            <td class="sv">${esc(r.inspectorNames || '-')}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="cover-bottom">
      <div>
        <div class="cover-corp-name">${esc(companyMeta.thName)} (${esc(companyMeta.enName)})</div>
        <div class="cover-corp-addr">${esc(companyMeta.address)}</div>
        <div class="cover-corp-addr">โทรศัพท์: ${esc(companyMeta.phone)} &nbsp;|&nbsp; เลขประจำตัวผู้เสียภาษี: ${esc(companyMeta.taxId)}</div>
      </div>
      <div style="text-align: right;">
        ${renderPassStamp(r.overallResult)}
      </div>
    </div>
  </div>

  <!-- ═══ SECTION 1: CLEANING PV SOLAR ═══ -->
  <div class="report-section">
    ${renderSectionBanner('01', 'Cleaning PV Solar', 'ภาพถ่ายการล้างทำความสะอาดแผงโซลาร์เซลล์')}
    ${renderCleaningSubBlock('1.1 ภาพแผงก่อนดำเนินการล้างทำความสะอาด (Before Cleaning)', report.cleaningBefore.photos, report.cleaningBefore.remark, report.cleaningBefore.photoNotes)}
    ${renderCleaningSubBlock('1.2 ภาพรวมระหว่างการปฏิบัติงาน (During Cleaning)', report.cleaningDuring.photos, report.cleaningDuring.remark, report.cleaningDuring.photoNotes)}
    ${renderCleaningSubBlock('1.3 ภาพหลังจากทำความสะอาดแผง (After Cleaning)', report.cleaningAfter.photos, report.cleaningAfter.remark, report.cleaningAfter.photoNotes)}
  </div>

  <!-- ═══ SECTION 2: VISUAL INSPECTION ═══ -->
  <div class="report-section">
    ${renderSectionBanner('02', 'Visual Inspection', 'ตรวจสอบสภาพโดยรวมของอุปกรณ์ในระบบไฟฟ้า', renderPassStamp(report.visualInspection.status))}
    <div class="sub-block ${report.visualInspection.photos.length <= 4 ? 'keep-together' : ''}">
      <div class="sub-head">
        <span>รายการอุปกรณ์ที่ตรวจสอบและสภาพความเรียบร้อย</span>
        ${renderPassStamp(report.visualInspection.status)}
      </div>
      <div class="sub-body">
        ${
          report.visualInspection.equipmentList.filter(Boolean).length > 0
            ? `<ol class="equip-list">${report.visualInspection.equipmentList
                .filter(Boolean)
                .map((eq) => `<li>${esc(eq)}</li>`)
                .join('')}</ol>`
            : ''
        }
        ${(() => {
          const vcItems =
            report.visualInspection.visualCheckItems &&
            report.visualInspection.visualCheckItems.length > 0
              ? report.visualInspection.visualCheckItems
              : DEFAULT_VISUAL_CHECK_ITEMS;
          return `
            <table class="visual-check-table">
              <thead>
                <tr class="vc-head-top">
                  <th style="width: 44px;">NO.</th>
                  <th style="text-align: left;">รายการ</th>
                  <th colspan="2">สายไฟฟ้า</th>
                  <th colspan="2">อุปกรณ์ไฟฟ้าภายในตู้</th>
                </tr>
                <tr class="vc-head-sub">
                  <td>1</td>
                  <td class="vc-sub-title">ตรวจเช็คสภาพโดยทั่วไป (Visual check)</td>
                  <td style="width: 56px;">ปกติ</td>
                  <td style="width: 56px;">ไม่ปกติ</td>
                  <td style="width: 56px;">ปกติ</td>
                  <td style="width: 56px;">ไม่ปกติ</td>
                </tr>
              </thead>
              <tbody>
                ${vcItems
                  .map(
                    (row) => `
                  <tr>
                    <td class="vc-no">${esc(row.no)}</td>
                    <td>${esc(row.label || '-')}</td>
                    <td class="vc-status ${row.wiringStatus === 'NORMAL' ? 'vc-ok' : ''}">${row.wiringStatus === 'NORMAL' ? '&#10003;' : ''}</td>
                    <td class="vc-status ${row.wiringStatus === 'ABNORMAL' ? 'vc-bad' : ''}">${row.wiringStatus === 'ABNORMAL' ? '&#10003;' : ''}</td>
                    <td class="vc-status ${row.cabinetStatus === 'NORMAL' ? 'vc-ok' : ''}">${row.cabinetStatus === 'NORMAL' ? '&#10003;' : ''}</td>
                    <td class="vc-status ${row.cabinetStatus === 'ABNORMAL' ? 'vc-bad' : ''}">${row.cabinetStatus === 'ABNORMAL' ? '&#10003;' : ''}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        })()}
        ${renderPhotoRows(report.visualInspection.photos, 'Visual Inspection', report.visualInspection.photoNotes)}
        ${renderRemarkBox(report.visualInspection.remark)}
      </div>
    </div>
  </div>

  ${
    includeAc
      ? `
  <!-- ═══ SECTION ${acSecNo}: AC VOLTAGE SYSTEM ═══ -->
  <div class="report-section">
    ${renderSectionBanner(acSecNo, 'AC Voltage System', 'ผลการวัดแรงดันไฟฟ้า AC Output ของ Inverter')}
    ${report.acVoltageSystems
      .map(
        (inv, idx) => `
      <div class="sub-block ${inv.photos.length <= 4 ? 'keep-together' : ''}">
        <div class="sub-head">
          <span>Check Voltage Output from ${esc(inv.inverterName || `INVERTER NO.${idx + 1}`)}</span>
          ${renderPassStamp(inv.status)}
        </div>
        <div class="sub-body">
          <div class="meas-grid-3">
            <div class="meas-cell"><span class="meas-lbl">Volt AC (R-S)</span><span class="meas-val">${esc(inv.voltRS || '-')} VAC</span></div>
            <div class="meas-cell"><span class="meas-lbl">Volt AC (R-T)</span><span class="meas-val">${esc(inv.voltRT || '-')} VAC</span></div>
            <div class="meas-cell"><span class="meas-lbl">Volt AC (S-T)</span><span class="meas-val">${esc(inv.voltST || '-')} VAC</span></div>
          </div>
          ${renderPhotoRows(inv.photos, `AC ${inv.inverterName}`, inv.photoNotes)}
          ${renderRemarkBox(inv.remark)}
        </div>
      </div>
    `
      )
      .join('')}
  </div>`
      : ''
  }

  ${
    includeDc
      ? `
  <!-- ═══ SECTION ${dcVoltSecNo}: DC VOLTAGE SYSTEM ═══ -->
  <div class="report-section">
    ${renderSectionBanner(dcVoltSecNo, 'DC Voltage System', 'ผลการวัดแรงดันไฟฟ้า DC Input เข้าสู่ Inverter')}
    ${report.dcVoltageSystems
      .map(
        (inv, idx) => `
      <div class="sub-block ${inv.photos.length <= 4 ? 'keep-together' : ''}">
        <div class="sub-head">
          <span>Check DC Voltage Input to ${esc(inv.inverterName || `INVERTER NO.${idx + 1}`)}</span>
          ${renderPassStamp(inv.status)}
        </div>
        <div class="sub-body">
          <div class="meas-grid-2">
            ${inv.strings
              .map(
                (st) =>
                  `<div class="meas-cell"><span class="meas-lbl">Volt DC ${esc(st.label)}</span><span class="meas-val">${esc(st.value || '-')} VDC</span></div>`
              )
              .join('')}
          </div>
          ${renderPhotoRows(inv.photos, `DC Volt ${inv.inverterName}`, inv.photoNotes)}
          ${renderRemarkBox(inv.remark)}
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <!-- ═══ SECTION ${dcCurrSecNo}: DC CURRENT SYSTEM ═══ -->
  <div class="report-section">
    ${renderSectionBanner(dcCurrSecNo, 'DC Current System', 'ผลการวัดกระแสไฟฟ้า DC Input เข้าสู่ Inverter')}
    ${report.dcCurrentSystems
      .map(
        (inv, idx) => `
      <div class="sub-block ${inv.photos.length <= 4 ? 'keep-together' : ''}">
        <div class="sub-head">
          <span>Check DC Current Input from ${esc(inv.inverterName || `INVERTER NO.${idx + 1}`)}</span>
          ${renderPassStamp(inv.status)}
        </div>
        <div class="sub-body">
          <div class="meas-grid-2">
            ${inv.strings
              .map(
                (st) =>
                  `<div class="meas-cell"><span class="meas-lbl">Current DC ${esc(st.label)}</span><span class="meas-val">${esc(st.value || '-')} A</span></div>`
              )
              .join('')}
          </div>
          ${renderPhotoRows(inv.photos, `DC Current ${inv.inverterName}`, inv.photoNotes)}
          ${renderRemarkBox(inv.remark)}
        </div>
      </div>
    `
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- ═══ SECTION ${thermoSecNo}: THERMO SCAN CHECK ═══ -->
  <div class="report-section">
    ${renderSectionBanner(thermoSecNo, 'Thermo Scan Check', 'การตรวจวัดอุณหภูมิอุปกรณ์ด้วยกล้องอินฟราเรด')}
    ${
      report.thermoScan.netaDescription
        ? `<div class="neta-box">
             <div><strong>เกณฑ์มาตรฐานการประเมิน (NETA Standard):</strong> ${escMultiline(report.thermoScan.netaDescription)}</div>
             <div class="neta-cam">เครื่องมือตรวจวัด (Instrument): ${esc(report.thermoScan.cameraModel || '-')}</div>
           </div>`
        : ''
    }
    ${report.thermoScan.checkpoints
      .map(
        (cp) => `
      <div class="sub-block ${cp.photos.length <= 4 ? 'keep-together' : ''}">
        <div class="sub-head">
          <span>ตรวจเช็คภาพความร้อน Thermo Scan (${esc(cp.title)})</span>
          ${renderPassStamp(cp.status)}
        </div>
        <div class="sub-body">
          ${renderPhotoRows(cp.photos, `Thermo ${cp.title}`, cp.photoNotes)}
          ${renderRemarkBox(cp.remark)}
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <!-- ═══ SECTION ${finalSecNo}: SYSTEM TEST RESULTS & DUAL EXECUTIVE CERTIFICATION ═══ -->
  <div class="final-block">
    <div class="section-banner" style="margin-bottom: 0;">
      <div class="section-banner-left">
        <div class="banner-eyebrow">SECTION ${finalSecNo} &bull; SYSTEM TEST RESULTS &amp; CERTIFICATION</div>
        <div class="banner-title">System test results &mdash; สรุปผลการตรวจสอบระบบและลงนามรับรอง</div>
      </div>
    </div>

    <div class="result-banner">
      <div class="result-main">
        <div class="result-heading">
          System test results <span class="result-heading-th">(ผลการตรวจสอบระบบโดยรวม)</span>
        </div>
        <div class="result-checks">
          <span class="result-check-item ${r.overallResult !== 'NOT_PASS' ? 'is-checked-pass' : ''}">
            <span class="check-sq ${r.overallResult !== 'NOT_PASS' ? 'checked-pass' : ''}">${r.overallResult !== 'NOT_PASS' ? '&#10003;' : ''}</span>
            <span>Pass</span>
          </span>
          <span class="result-check-item ${r.overallResult === 'NOT_PASS' ? 'is-checked-fail' : ''}">
            <span class="check-sq ${r.overallResult === 'NOT_PASS' ? 'checked-fail' : ''}">${r.overallResult === 'NOT_PASS' ? '&#10003;' : ''}</span>
            <span>Not Pass</span>
          </span>
        </div>
        ${
          report.overallRemark
            ? `<div class="result-remark"><strong>ข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม:</strong> ${escMultiline(report.overallRemark)}</div>`
            : ''
        }
      </div>
      <span class="result-big ${r.overallResult === 'NOT_PASS' ? 'fail' : 'pass'}">
        ${r.overallResult === 'NOT_PASS' ? 'NOT PASS' : 'PASS'}
      </span>
    </div>

    ${(() => {
      const { mode: signMode } = resolveManagerSignConfig(report.managerSignMode);
      const pmCol = `
        <th>ผู้จัดการฝ่ายโปรเจค (Project Manager)</th>
      `;
      const smCol = `
        <th>ผู้จัดการฝ่ายเซอร์วิส (Service Manager)</th>
      `;
      const pmCell = `
        <td>
          <div style="font-size: 9.8px; color: #475569;">Engineering &amp; Project Reviewer</div>
          ${
            resolveImg(r.projectMgrSignUrl)
              ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImg(r.projectMgrSignUrl))}" alt="ลายเซ็นผู้จัดการโปรเจค" /></div><div class="sign-line"></div>`
              : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
          }
          <div style="font-weight: 700; color: #0f172a;">(&nbsp;${esc(r.projectMgrName || '................................................')}&nbsp;)</div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            วันที่: ${esc(r.projectMgrSignedAt ? formatCleaningDateSlashBe(r.projectMgrSignedAt) : '........ / ........ / ............')}
          </div>
        </td>
      `;
      const smCell = `
        <td>
          <div style="font-size: 9.8px; color: #475569;">Service &amp; Maintenance Reviewer</div>
          ${
            resolveImg(r.serviceMgrSignUrl)
              ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImg(r.serviceMgrSignUrl))}" alt="ลายเซ็นผู้จัดการเซอร์วิส" /></div><div class="sign-line"></div>`
              : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
          }
          <div style="font-weight: 700; color: #0f172a;">(&nbsp;${esc(r.serviceMgrName || '................................................')}&nbsp;)</div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            วันที่: ${esc(r.serviceMgrSignedAt ? formatCleaningDateSlashBe(r.serviceMgrSignedAt) : '........ / ........ / ............')}
          </div>
        </td>
      `;

      const hasPm = Boolean(r.projectMgrSignUrl);
      const hasSm = Boolean(r.serviceMgrSignUrl);
      const showPmCol =
        signMode === 'PM' ||
        signMode === 'BOTH' ||
        (signMode === 'ANY' && (hasPm || !hasSm));
      const showSmCol =
        signMode === 'SM' ||
        signMode === 'BOTH' ||
        (signMode === 'ANY' && (hasSm || !hasPm));

      const headers: string[] = [];
      const cells: string[] = [];
      if (showPmCol) {
        headers.push(pmCol);
        cells.push(pmCell);
      }
      if (showSmCol) {
        headers.push(smCol);
        cells.push(smCell);
      }

      return `
    <table class="sign-table-2">
      <thead>
        <tr>
          ${headers.join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          ${cells.join('')}
        </tr>
      </tbody>
    </table>`;
    })()}
  </div>

  <div class="doc-footer">
    <span>เอกสารรายงานการตรวจเช็คและบำรุงรักษาระบบโซลาร์ &bull; เลขที่ ${esc(r.docNumber || '-')}</span>
    <span>พิมพ์เอกสารเมื่อ: ${esc(printTime)}</span>
  </div>
</body>
</html>`;
}
