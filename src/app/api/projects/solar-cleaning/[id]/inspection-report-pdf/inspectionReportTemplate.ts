import {
  DEFAULT_REPORT_TITLE,
  DEFAULT_VISUAL_CHECK_ITEMS,
  countReportPhotos,
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

function renderPassStamp(
  status?: InspectionPassStatus | string | null,
  onDark = false
): string {
  const isPass = String(status || 'PASS').toUpperCase() !== 'NOT_PASS';
  if (onDark) {
    return isPass
      ? `<span class="status-stamp dark-pass">&#10003; RESULT: PASS</span>`
      : `<span class="status-stamp dark-fail">&#10007; RESULT: NOT PASS</span>`;
  }
  return isPass
    ? `<span class="status-stamp pass">&#10003; RESULT: PASS</span>`
    : `<span class="status-stamp fail">&#10007; RESULT: NOT PASS</span>`;
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
  const totalPhotos = countReportPhotos(report);
  const isOverallPass = String(r.overallResult || 'PASS').toUpperCase() !== 'NOT_PASS';

  const { includeAc, includeDc } = resolveElectricalChecks(report.electricalCheckMode);
  let nextSecNo = 3;
  const acSecNo = includeAc ? String(nextSecNo++).padStart(2, '0') : '';
  const dcVoltSecNo = includeDc ? String(nextSecNo++).padStart(2, '0') : '';
  const dcCurrSecNo = includeDc ? String(nextSecNo++).padStart(2, '0') : '';
  const thermoSecNo = String(nextSecNo++).padStart(2, '0');
  const finalSecNo = String(nextSecNo++).padStart(2, '0');

  const electricalModeSummary =
    includeAc && includeDc
      ? 'AC &amp; DC Systems'
      : includeAc
      ? 'AC Output System'
      : 'DC String System';
  const inverterCount = Math.max(
    includeAc ? report.acVoltageSystems.length : 0,
    includeDc ? report.dcVoltageSystems.length : 0,
    includeDc ? report.dcCurrentSystems.length : 0
  );

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
    ? `<div class="cover-logo-frame"><img src="${selectedLogoUri}" class="logo" alt="${esc(companyMeta.enName)} Logo" /></div>`
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
        <span class="sub-head-title">
          <span class="sub-dot"></span>
          <span>${esc(title)}</span>
        </span>
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
        <div class="sec-num-badge">${esc(secNo)}</div>
        <div>
          <div class="banner-eyebrow">SECTION ${esc(secNo)} &bull; TECHNICAL INSPECTION RECORD</div>
          <div class="banner-title">${esc(category)} <span class="banner-sub">&mdash; ${esc(subtitle)}</span></div>
        </div>
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
      margin: 11mm 12mm 15mm 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      color: #111827;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, Arial, sans-serif;
      font-size: 12.2px;
      line-height: 1.44;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Formal Corporate Cover Page (Red / White / Gray / Black ONLY) ── */
    .cover-page {
      min-height: 256mm;
      position: relative;
      border: 1.5px solid #111827;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 14mm 14mm 12mm 22mm;
      page-break-after: always;
      break-after: page;
      background: #ffffff;
    }
    .cover-stripe-black {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 8.5mm;
      background: #e5e7eb;
    }
    .cover-stripe-red {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 8.5mm;
      width: 3mm;
      background: #b91c1c;
    }

    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      border-bottom: 2px solid #111827;
      padding-bottom: 11px;
    }
    .cover-division-tag {
      display: inline-block;
      padding: 3.5px 10px;
      background: #f3f4f6;
      color: #111827;
      border: 1px solid #d1d5db;
      border-left: 3.5px solid #b91c1c;
      font-size: 9.2px;
      font-weight: 700;
      letter-spacing: 0.7px;
      text-transform: uppercase;
    }
    .cover-doc-table {
      margin-top: 8px;
      border-collapse: collapse;
      border: 1px solid #111827;
      font-size: 10.5px;
      background: #ffffff;
    }
    .cover-doc-table td {
      padding: 3.5px 9px;
      border: 1px solid #9ca3af;
      background: #ffffff;
    }
    .cover-doc-table td.lbl {
      font-weight: 700;
      color: #374151;
    }
    .cover-doc-table td.val {
      font-weight: 700;
      color: #111827;
    }
    .cover-logo-frame {
      padding: 6px 10px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .logo {
      height: 82px;
      width: auto;
      max-width: 185px;
      object-fit: contain;
      display: block;
    }
    .logo-fallback {
      width: 64px;
      height: 54px;
      background: #f3f4f6;
      border: 1px solid #9ca3af;
      color: #111827;
      font-weight: 700;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cover-center {
      margin: auto 0;
      padding: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 13px;
    }
    .cover-hero-box {
      padding: 14px 16px;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      border-left: 5px solid #b91c1c;
    }
    .cover-project-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }
    .cover-project-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #b91c1c;
      letter-spacing: 0.9px;
      text-transform: uppercase;
    }
    .cover-kwp-tag {
      padding: 2px 9px;
      border: 1px solid #111827;
      background: #ffffff;
      color: #111827;
      font-size: 10.5px;
      font-weight: 700;
      white-space: nowrap;
    }
    .cover-main-title {
      font-size: 21px;
      font-weight: 700;
      color: #111827;
      line-height: 1.32;
      margin: 0 0 8px;
    }
    .cover-title-rule {
      width: 85px;
      height: 3px;
      background: #b91c1c;
      margin-bottom: 6px;
    }
    .cover-eng-subtitle {
      font-size: 10px;
      font-weight: 700;
      color: #4b5563;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    /* Plain Formal Summary Table on Cover */
    table.plain-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.2px solid #111827;
      background: #ffffff;
    }
    table.plain-table th,
    table.plain-table td {
      border: 1px solid #9ca3af;
      padding: 6px 10px;
      background: #ffffff;
      color: #111827;
      vertical-align: top;
      font-size: 11.5px;
    }
    table.plain-table thead th {
      font-weight: 700;
      color: #111827;
      border-bottom: 1.5px solid #111827;
      text-align: left;
      background: #ffffff;
    }
    table.plain-table td.lbl {
      font-weight: 700;
      color: #374151;
      width: 23%;
      white-space: nowrap;
    }
    table.plain-table td.val:not([colspan]) {
      width: 27%;
    }
    .cover-client-big {
      font-size: 15.5px;
      font-weight: 700;
      color: #111827;
    }
    .summary-pass-txt {
      font-weight: 700;
      color: #15803d;
    }
    .summary-fail-txt {
      font-weight: 700;
      color: #b91c1c;
    }

    .cover-bottom {
      border-top: 2px solid #111827;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .cover-corp-name {
      font-size: 12.8px;
      font-weight: 700;
      color: #111827;
    }
    .cover-corp-addr {
      font-size: 9.8px;
      color: #4b5563;
    }
    .cover-qa-tag {
      margin-top: 3px;
      font-size: 8.8px;
      font-weight: 700;
      color: #b91c1c;
      letter-spacing: 0.4px;
    }

    /* ── Formal Section Banners (Light Gray + White + Red border, NO solid black fill) ── */
    .report-section {
      margin-bottom: 13px;
    }
    .section-banner {
      background: #f3f4f6;
      color: #111827;
      border: 1px solid #d1d5db;
      border-left: 5px solid #b91c1c;
      padding: 7.5px 12px;
      margin-bottom: 9px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .section-banner-left {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }
    .sec-num-badge {
      width: 26px;
      height: 26px;
      border: 1.2px solid #9ca3af;
      background: #ffffff;
      color: #b91c1c;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11.5px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .banner-eyebrow {
      font-size: 8.5px;
      letter-spacing: 0.7px;
      color: #b91c1c;
      font-weight: 700;
    }
    .banner-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
    }
    .banner-sub {
      font-weight: 400;
      color: #4b5563;
      font-size: 11.5px;
    }

    .status-stamp {
      display: inline-block;
      padding: 2px 9px;
      font-size: 9.8px;
      font-weight: 700;
      letter-spacing: 0.4px;
      white-space: nowrap;
      border: 1.5px solid;
    }
    .status-stamp.pass,
    .status-stamp.dark-pass {
      background: #ecfdf5;
      color: #15803d;
      border-color: #16a34a;
    }
    .status-stamp.fail,
    .status-stamp.dark-fail {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #dc2626;
    }

    /* Sub-block Frame */
    .sub-block {
      border: 1.2px solid #374151;
      margin-bottom: 10px;
      background: #ffffff;
    }
    .sub-block.keep-together {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sub-head {
      background: #f3f4f6;
      border-bottom: 1.2px solid #374151;
      padding: 5.5px 10px;
      font-size: 11.5px;
      font-weight: 700;
      color: #111827;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sub-head-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .sub-dot {
      width: 7px;
      height: 7px;
      background: #b91c1c;
      flex-shrink: 0;
    }
    .sub-count {
      font-size: 9.2px;
      color: #374151;
      background: #ffffff;
      border: 1px solid #9ca3af;
      padding: 1px 7px;
      font-weight: 700;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    .sub-body {
      padding: 8px 10px;
    }

    /* Photo Documentation Plates */
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
      border: 1px solid #9ca3af;
      padding: 5px;
      background: #ffffff;
    }
    .photo-thumb {
      width: 100%;
      height: 170px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
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
      font-size: 9.2px;
      font-weight: 700;
      color: #374151;
      background: #f3f4f6;
      text-align: center;
      margin-top: 4px;
      padding: 3px 6px;
      border-top: 1px solid #e5e7eb;
      letter-spacing: 0.2px;
    }
    .photo-note {
      margin-top: 4px;
      padding: 4px 7px;
      background: #ffffff;
      border-top: 1px solid #e5e7eb;
      border-left: 3px solid #b91c1c;
      font-size: 10.2px;
      line-height: 1.38;
      color: #111827;
      word-break: break-word;
      text-align: left;
    }
    .empty-photo-box {
      padding: 10px;
      border: 1px dashed #9ca3af;
      background: #f9fafb;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 7px;
    }

    /* Remarks & Equipment Lists */
    .remark-box {
      border: 1px solid #d1d5db;
      border-left: 3.5px solid #b91c1c;
      background: #f9fafb;
      padding: 5.5px 9px;
      font-size: 11px;
    }
    .remark-title {
      font-size: 9px;
      font-weight: 700;
      color: #4b5563;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }
    .remark-text {
      color: #111827;
      word-break: break-word;
    }
    .equip-list {
      margin: 0 0 8px;
      padding: 7px 10px 7px 26px;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      border-left: 3px solid #374151;
      font-size: 11px;
      color: #111827;
    }
    .equip-list li {
      margin-bottom: 2px;
    }

    /* Plain Visual Inspection & Electrical Tables (No color fills in table cells) */
    table.visual-check-table,
    table.meas-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.2px solid #111827;
      margin-bottom: 9px;
      font-size: 10.8px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table.visual-check-table th,
    table.visual-check-table td,
    table.meas-table th,
    table.meas-table td {
      border: 1px solid #9ca3af;
      padding: 4.5px 7px;
      vertical-align: middle;
      background: #ffffff;
      color: #111827;
    }
    table.visual-check-table thead tr.vc-head-top th,
    table.meas-table thead th {
      font-weight: 700;
      color: #111827;
      text-align: center;
      border-bottom: 1.5px solid #111827;
      background: #ffffff;
    }
    table.visual-check-table thead tr.vc-head-sub td {
      font-weight: 700;
      color: #111827;
      text-align: center;
      border-bottom: 1.3px solid #111827;
      background: #ffffff;
    }
    table.visual-check-table thead tr.vc-head-sub td.vc-sub-title {
      text-align: left;
    }
    table.visual-check-table td.vc-no {
      width: 44px;
      text-align: center;
      font-weight: 700;
      color: #374151;
    }
    table.visual-check-table td.vc-status {
      width: 56px;
      text-align: center;
      font-weight: 700;
    }
    table.visual-check-table td.vc-ok {
      color: #15803d;
    }
    table.visual-check-table td.vc-bad {
      color: #b91c1c;
    }
    table.meas-table td.m-lbl {
      font-weight: 700;
      color: #374151;
    }
    table.meas-table td.m-val {
      font-weight: 700;
      color: #111827;
      text-align: right;
      white-space: nowrap;
    }

    /* NETA Standard Box */
    .neta-box {
      border: 1px solid #9ca3af;
      border-left: 4px solid #b91c1c;
      background: #f9fafb;
      padding: 8px 10px;
      margin-bottom: 9px;
      font-size: 10.8px;
      color: #111827;
      break-inside: avoid;
    }
    .neta-cam {
      margin-top: 4px;
      font-weight: 700;
      color: #111827;
    }

    /* Overall Certification & Dual Executive Sign-off */
    .final-block {
      border: 1.5px solid #111827;
      margin-top: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
      background: #ffffff;
    }
    .result-banner {
      padding: 10px 14px;
      background: #f9fafb;
      border-bottom: 1.2px solid #111827;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
    }
    .result-main { flex: 1; min-width: 0; }
    .result-heading {
      font-weight: 700;
      font-size: 13px;
      color: #111827;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .result-heading-th {
      font-weight: 400;
      font-size: 11px;
      color: #4b5563;
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
      color: #374151;
    }
    .result-check-item.is-checked-pass { color: #15803d; }
    .result-check-item.is-checked-fail { color: #b91c1c; }
    .check-sq {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border: 1.5px solid #111827;
      background: #ffffff;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    }
    .check-sq.checked-pass {
      border-color: #16a34a;
      background: #16a34a;
      color: #ffffff;
    }
    .check-sq.checked-fail {
      border-color: #b91c1c;
      background: #b91c1c;
      color: #ffffff;
    }
    .result-remark {
      font-size: 11px;
      color: #111827;
      margin-top: 7px;
      padding: 5px 8px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-left: 3px solid #b91c1c;
    }
    .result-big {
      padding: 6px 18px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.6px;
      border: 2px solid;
      white-space: nowrap;
      text-align: center;
    }
    .result-big.pass {
      background: #15803d;
      color: #ffffff;
      border-color: #15803d;
    }
    .result-big.fail {
      background: #b91c1c;
      color: #ffffff;
      border-color: #b91c1c;
    }

    table.sign-table-2 {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      background: #ffffff;
    }
    table.sign-table-2 th {
      background: #ffffff;
      border-bottom: 1.5px solid #111827;
      border-right: 1px solid #9ca3af;
      padding: 6px 10px;
      font-size: 11.2px;
      font-weight: 700;
      color: #111827;
      text-align: center;
    }
    table.sign-table-2 th:last-child,
    table.sign-table-2 td:last-child { border-right: none; }
    table.sign-table-2 td {
      border-right: 1px solid #9ca3af;
      padding: 10px 14px 12px;
      text-align: center;
      vertical-align: bottom;
      font-size: 11px;
      background: #ffffff;
    }
    .sign-role-sub {
      font-size: 9.5px;
      font-weight: 700;
      color: #6b7280;
    }
    .sign-img-wrap {
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 4px auto 2px;
    }
    .sign-img {
      max-width: 185px;
      max-height: 54px;
      object-fit: contain;
    }
    .sign-prefix-row {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      width: 82%;
      margin: 38px auto 4px;
      font-size: 10.5px;
      color: #374151;
    }
    .sign-prefix-line {
      flex: 1;
      border-bottom: 1px dotted #4b5563;
    }
    .sign-line {
      width: 78%;
      border-bottom: 1px dotted #4b5563;
      margin: 4px auto 4px;
    }

    .doc-footer {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      font-size: 9.2px;
      color: #6b7280;
    }
  </style>
</head>
<body>

  <!-- ═══ FORMAL CORPORATE COVER PAGE ═══ -->
  <div class="cover-page">
    <div class="cover-stripe-black"></div>
    <div class="cover-stripe-red"></div>

    <div class="cover-top">
      <div>
        <span class="cover-division-tag">${esc(companyMeta.enName)} &bull; O&amp;M ENGINEERING DIVISION</span>
        <table class="cover-doc-table">
          <tr>
            <td class="lbl">เลขที่เอกสาร / Doc No.</td>
            <td class="val">${esc(r.docNumber || '-')}</td>
          </tr>
          <tr>
            <td class="lbl">วันที่ออกรายงาน (พ.ศ.)</td>
            <td class="val">${esc(coverDateSlash)}</td>
          </tr>
          <tr>
            <td class="lbl">รอบการตรวจเช็ค / Cycle</td>
            <td class="val">${esc(r.inspectionRound || '-')}</td>
          </tr>
        </table>
      </div>
      ${logoHtml}
    </div>

    <div class="cover-center">
      <div class="cover-hero-box">
        <div class="cover-project-row">
          <span class="cover-project-label">${esc(report.coverSubtitle || 'PROJECT: SOLAR ROOFTOP')}</span>
          ${r.systemSizeKwp ? `<span class="cover-kwp-tag">CAPACITY: ${esc(r.systemSizeKwp)}</span>` : ''}
        </div>
        <h1 class="cover-main-title">${esc(reportTitle)}</h1>
        <div class="cover-title-rule"></div>
        <div class="cover-eng-subtitle">
          PREVENTIVE MAINTENANCE, CLEANING, ELECTRICAL TESTING &amp; THERMOGRAPHY REPORT
        </div>
      </div>

      <table class="plain-table">
        <thead>
          <tr>
            <th colspan="4">ข้อมูลโครงการและสรุปผลการตรวจสอบ (PROJECT &amp; INSPECTION SPECIFICATION)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="lbl">ชื่อลูกค้า / บริษัท</td>
            <td colspan="3" class="val"><span class="cover-client-big">${esc(r.customerName || '-')}</span></td>
          </tr>
          <tr>
            <td class="lbl">ชื่อโครงการ</td>
            <td colspan="3" class="val"><strong>${esc(r.projectName || '-')}</strong></td>
          </tr>
          <tr>
            <td class="lbl">สถานที่ติดตั้ง</td>
            <td colspan="3" class="val">${escMultiline(r.location)}</td>
          </tr>
          <tr>
            <td class="lbl">กำลังการผลิตรวม</td>
            <td class="val"><strong>${esc(r.systemSizeKwp || '-')}</strong></td>
            <td class="lbl">วันที่เข้าดำเนินการ</td>
            <td class="val">${esc(coverDateLong)}</td>
          </tr>
          <tr>
            <td class="lbl">ขอบเขตตรวจระบบไฟฟ้า</td>
            <td class="val">${electricalModeSummary}${inverterCount > 0 ? ` (${inverterCount} เครื่อง)` : ''}</td>
            <td class="lbl">จำนวนภาพประกอบ</td>
            <td class="val">${totalPhotos} รูปถ่าย</td>
          </tr>
          <tr>
            <td class="lbl">Visual Inspection</td>
            <td class="val">
              <span class="${report.visualInspection.status === 'NOT_PASS' ? 'summary-fail-txt' : 'summary-pass-txt'}">
                ${report.visualInspection.status === 'NOT_PASS' ? 'NOT PASS' : 'PASS (ปกติ)'}
              </span>
            </td>
            <td class="lbl">สรุปผลโดยรวม</td>
            <td class="val">
              <span class="${isOverallPass ? 'summary-pass-txt' : 'summary-fail-txt'}">
                ${isOverallPass ? 'PASS (ผ่านเกณฑ์)' : 'NOT PASS (ไม่ผ่าน)'}
              </span>
            </td>
          </tr>
          <tr>
            <td class="lbl">คณะผู้เข้าตรวจเช็ค</td>
            <td colspan="3" class="val">${esc(r.inspectorNames || '-')}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="cover-bottom">
      <div>
        <div class="cover-corp-name">${esc(companyMeta.thName)} (${esc(companyMeta.enName)})</div>
        <div class="cover-corp-addr">${esc(companyMeta.address)}</div>
        <div class="cover-corp-addr">โทรศัพท์: ${esc(companyMeta.phone)} &nbsp;|&nbsp; เลขประจำตัวผู้เสียภาษี: ${esc(companyMeta.taxId)}</div>
        <div class="cover-qa-tag">OFFICIAL ENGINEERING SERVICE REPORT &bull; PREPARED FOR CLIENT SUBMISSION</div>
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
    ${renderSectionBanner('02', 'Visual Inspection', 'ตรวจสอบสภาพโดยรวมของอุปกรณ์ในระบบไฟฟ้า', renderPassStamp(report.visualInspection.status, true))}
    <div class="sub-block ${report.visualInspection.photos.length <= 4 ? 'keep-together' : ''}">
      <div class="sub-head">
        <span class="sub-head-title">
          <span class="sub-dot"></span>
          <span>รายการอุปกรณ์ที่ตรวจสอบและสภาพความเรียบร้อย</span>
        </span>
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
                    <td class="vc-status ${row.wiringStatus === 'ABNORMAL' ? 'vc-bad' : ''}">${row.wiringStatus === 'ABNORMAL' ? '&#10007;' : ''}</td>
                    <td class="vc-status ${row.cabinetStatus === 'NORMAL' ? 'vc-ok' : ''}">${row.cabinetStatus === 'NORMAL' ? '&#10003;' : ''}</td>
                    <td class="vc-status ${row.cabinetStatus === 'ABNORMAL' ? 'vc-bad' : ''}">${row.cabinetStatus === 'ABNORMAL' ? '&#10007;' : ''}</td>
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
          <span class="sub-head-title">
            <span class="sub-dot"></span>
            <span>Check Voltage Output from ${esc(inv.inverterName || `INVERTER NO.${idx + 1}`)}</span>
          </span>
          ${renderPassStamp(inv.status)}
        </div>
        <div class="sub-body">
          <table class="meas-table">
            <thead>
              <tr>
                <th>Volt AC (R-S)</th>
                <th>Volt AC (R-T)</th>
                <th>Volt AC (S-T)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center; font-weight: 700;">${esc(inv.voltRS || '-')} VAC</td>
                <td style="text-align: center; font-weight: 700;">${esc(inv.voltRT || '-')} VAC</td>
                <td style="text-align: center; font-weight: 700;">${esc(inv.voltST || '-')} VAC</td>
              </tr>
            </tbody>
          </table>
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
          <span class="sub-head-title">
            <span class="sub-dot"></span>
            <span>Check DC Voltage Input to ${esc(inv.inverterName || `INVERTER NO.${idx + 1}`)}</span>
          </span>
          ${renderPassStamp(inv.status)}
        </div>
        <div class="sub-body">
          <table class="meas-table">
            <thead>
              <tr>
                <th style="text-align: left;">ชุดสายสตริง (String)</th>
                <th style="text-align: right;">ค่าแรงดันไฟฟ้า (VDC)</th>
              </tr>
            </thead>
            <tbody>
              ${inv.strings
                .map(
                  (st) =>
                    `<tr><td class="m-lbl">Volt DC ${esc(st.label)}</td><td class="m-val">${esc(st.value || '-')} VDC</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
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
          <span class="sub-head-title">
            <span class="sub-dot"></span>
            <span>Check DC Current Input from ${esc(inv.inverterName || `INVERTER NO.${idx + 1}`)}</span>
          </span>
          ${renderPassStamp(inv.status)}
        </div>
        <div class="sub-body">
          <table class="meas-table">
            <thead>
              <tr>
                <th style="text-align: left;">ชุดสายสตริง (String)</th>
                <th style="text-align: right;">ค่ากระแสไฟฟ้า (A)</th>
              </tr>
            </thead>
            <tbody>
              ${inv.strings
                .map(
                  (st) =>
                    `<tr><td class="m-lbl">Current DC ${esc(st.label)}</td><td class="m-val">${esc(st.value || '-')} A</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
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
          <span class="sub-head-title">
            <span class="sub-dot"></span>
            <span>ตรวจเช็คภาพความร้อน Thermo Scan (${esc(cp.title)})</span>
          </span>
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
        <div class="sec-num-badge">${finalSecNo}</div>
        <div>
          <div class="banner-eyebrow">SECTION ${finalSecNo} &bull; SYSTEM TEST RESULTS &amp; CERTIFICATION</div>
          <div class="banner-title">System test results &mdash; สรุปผลการตรวจสอบระบบและลงนามรับรอง</div>
        </div>
      </div>
      ${renderPassStamp(r.overallResult, true)}
    </div>

    <div class="result-banner">
      <div class="result-main">
        <div class="result-heading">
          System test results <span class="result-heading-th">(ผลการตรวจสอบระบบโดยรวม)</span>
        </div>
        <div class="result-checks">
          <span class="result-check-item ${isOverallPass ? 'is-checked-pass' : ''}">
            <span class="check-sq ${isOverallPass ? 'checked-pass' : ''}">${isOverallPass ? '&#10003;' : ''}</span>
            <span>Pass</span>
          </span>
          <span class="result-check-item ${!isOverallPass ? 'is-checked-fail' : ''}">
            <span class="check-sq ${!isOverallPass ? 'checked-fail' : ''}">${!isOverallPass ? '&#10007;' : ''}</span>
            <span>Not Pass</span>
          </span>
        </div>
        ${
          report.overallRemark
            ? `<div class="result-remark"><strong>ข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม:</strong> ${escMultiline(report.overallRemark)}</div>`
            : ''
        }
      </div>
      <div class="result-big ${isOverallPass ? 'pass' : 'fail'}">
        ${isOverallPass ? 'PASS' : 'NOT PASS'}
      </div>
    </div>

    ${(() => {
      const { mode: signMode } = resolveManagerSignConfig(report.managerSignMode);
      const pmCol = `<th>ผู้จัดการฝ่ายโปรเจค (Project Manager)</th>`;
      const smCol = `<th>ผู้จัดการฝ่ายเซอร์วิส (Service Manager)</th>`;
      const pmCell = `
        <td>
          <div class="sign-role-sub">Engineering &amp; Project Reviewer</div>
          ${
            resolveImg(r.projectMgrSignUrl)
              ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImg(r.projectMgrSignUrl))}" alt="ลายเซ็นผู้จัดการโปรเจค" /></div><div class="sign-line"></div>`
              : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
          }
          <div style="font-weight: 700; color: #111827;">(&nbsp;${esc(r.projectMgrName || '................................................')}&nbsp;)</div>
          <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">
            วันที่: ${esc(r.projectMgrSignedAt ? formatCleaningDateSlashBe(r.projectMgrSignedAt) : '........ / ........ / ............')}
          </div>
        </td>
      `;
      const smCell = `
        <td>
          <div class="sign-role-sub">Service &amp; Maintenance Reviewer</div>
          ${
            resolveImg(r.serviceMgrSignUrl)
              ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImg(r.serviceMgrSignUrl))}" alt="ลายเซ็นผู้จัดการเซอร์วิส" /></div><div class="sign-line"></div>`
              : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
          }
          <div style="font-weight: 700; color: #111827;">(&nbsp;${esc(r.serviceMgrName || '................................................')}&nbsp;)</div>
          <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">
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
    <span>${esc(companyMeta.thName)} &bull; เอกสารรายงานการตรวจเช็คและบำรุงรักษาระบบโซลาร์ &bull; เลขที่ ${esc(r.docNumber || '-')}</span>
    <span>พิมพ์เอกสารเมื่อ: ${esc(printTime)}</span>
  </div>
</body>
</html>`;
}
