import {
  HV_CHECKLIST,
  POST_INSTALL_PHOTOS,
  PRE_WORK_CHECKLIST,
  computeSolarChecklistProgress,
  formatSolarDateBkk,
  formatSolarDateTimeBkk,
  formatSolarTimeBkk,
  parseChecklistStringArray,
  type SolarProjectRecord,
} from '@/app/lib/solarChecklistConfig';
import {
  getSurveyCompanyMeta,
  type SurveyCompanyCode,
} from '@/app/lib/surveyMetadata';

export type SolarPdfAssets = {
  logoDataUri?: string | null;
  companyLogos?: Partial<Record<SurveyCompanyCode, string | null>>;
  fontRegularBase64?: string | null;
  fontBoldBase64?: string | null;
  resolvedImageDataUris?: Record<string, string>;
};

export interface SolarPhotoEntry {
  section: 'pre' | 'post' | 'hv';
  sectionLabel: string;
  itemKey: string;
  itemLabel: string;
  photoIndex: number;
  photoTotalInItem: number;
  url: string;
}

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

function kvRow(label: string, value: string, label2?: string, value2?: string): string {
  if (label2 !== undefined) {
    return `
      <tr>
        <td class="k">${esc(label)}</td>
        <td class="v">${value || '-'}</td>
        <td class="k k2">${esc(label2)}</td>
        <td class="v v2">${value2 || '-'}</td>
      </tr>
    `;
  }
  return `
    <tr>
      <td class="k">${esc(label)}</td>
      <td class="v" colspan="3">${value || '-'}</td>
    </tr>
  `;
}

export function collectSolarChecklistPhotos(project: Partial<SolarProjectRecord> | null | undefined): SolarPhotoEntry[] {
  const { images } = computeSolarChecklistProgress(project || {});
  const entries: SolarPhotoEntry[] = [];

  const groups: {
    section: 'pre' | 'post' | 'hv';
    sectionLabel: string;
    items: { key: string; label: string }[];
  }[] = [
    { section: 'pre', sectionLabel: 'ก่อนเริ่มงาน', items: PRE_WORK_CHECKLIST },
    { section: 'post', sectionLabel: 'หลังติดตั้ง', items: POST_INSTALL_PHOTOS },
  ];

  if (project?.isHighVoltage) {
    groups.push({ section: 'hv', sectionLabel: 'High Voltage', items: HV_CHECKLIST });
  }

  for (const g of groups) {
    for (const item of g.items) {
      const urls = images[item.key] || [];
      urls.forEach((url, idx) => {
        entries.push({
          section: g.section,
          sectionLabel: g.sectionLabel,
          itemKey: item.key,
          itemLabel: item.label,
          photoIndex: idx + 1,
          photoTotalInItem: urls.length,
          url,
        });
      });
    }
  }

  return entries;
}

export function generateSolarChecklistHTML(project: Partial<SolarProjectRecord> | null | undefined, assets: SolarPdfAssets = {}): string {
  const p: Partial<SolarProjectRecord> = project || {};
  const progress = computeSolarChecklistProgress(p);
  const workSummary = parseChecklistStringArray(p.workSummary);
  const siteProblems = parseChecklistStringArray(p.siteProblems);
  const photos = collectSolarChecklistPhotos(p);

  const companyCode = p.job?.companyCode || p.companyCode || 'TE';
  const companyMeta = getSurveyCompanyMeta(companyCode);
  const selectedLogoUri = assets.companyLogos?.[companyMeta.code] ?? assets.logoDataUri ?? null;

  const resolveImgSrc = (url?: string | null): string => {
    const clean = (url || '').trim();
    if (!clean) return '';
    return assets.resolvedImageDataUris?.[clean] || clean;
  };

  const jbNumber = p.job?.jobNumber || p.jbNumber || '-';
  const qtNumber = p.job?.quotationNumber || '';
  const refDocText = qtNumber && jbNumber !== '-' ? `${jbNumber} / ${qtNumber}` : jbNumber !== '-' ? jbNumber : qtNumber || '-';
  const supervisorName = p.siteSupervisor || p.manager?.fullName || '-';
  const teamMembersDisplay = p.siteTeamMembers || p._formattedTeamMembers || '-';
  const workStartDate = formatSolarDateBkk(p.siteCheckInTime);
  const checkInDisplay = formatSolarDateTimeBkk(p.siteCheckInTime);
  const checkOutDisplay = formatSolarDateTimeBkk(p.siteCheckOutTime);
  const checkInTimeOnly = formatSolarTimeBkk(p.siteCheckInTime);
  const checkOutTimeOnly = formatSolarTimeBkk(p.siteCheckOutTime);
  const timeRangeDisplay =
    checkInTimeOnly !== '-' || checkOutTimeOnly !== '-'
      ? `${checkInTimeOnly} - ${checkOutTimeOnly}`
      : '-';

  const voltageLabel = p.isHighVoltage ? 'High Voltage (22-33-115 kVA)' : 'Low Voltage / Standard';
  const printTimestamp = formatSolarDateTimeBkk(new Date());

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

  const splitBalancedPhotoRows = (urls: string[]): { url: string; index: number }[][] => {
    const clean = urls.filter(Boolean).map((url, idx) => ({ url, index: idx + 1 }));
    if (clean.length === 0) return [];
    if (clean.length === 1) return [[clean[0]]];
    if (clean.length === 3) return [clean];

    const rows: { url: string; index: number }[][] = [];
    for (let i = 0; i < clean.length; i += 2) {
      rows.push(clean.slice(i, i + 2));
    }
    if (rows.length >= 2 && rows[rows.length - 1].length === 1) {
      const lastSingle = rows.pop()!;
      rows[rows.length - 1] = [...rows[rows.length - 1], ...lastSingle];
    }
    return rows;
  };

  const renderChecklistCategoryBlock = (
    groupTitle: string,
    doneCount: number,
    totalCount: number,
    items: { key: string; label: string }[],
    checkedMap: Record<string, boolean>,
    sectionTone: 'pre' | 'post' | 'hv'
  ) => {
    const itemsHtml = items
      .map((item, idx) => {
        const isChecked = Boolean(checkedMap[item.key]);
        const urls = (progress.images[item.key] || []).filter(Boolean);
        const photoCount = urls.length;
        const cleanLabel = item.label.replace(/^\d+\.\s*/, '');
        const rows = splitBalancedPhotoRows(urls);
        const keepTogether = photoCount <= 4;

        const photosHtml =
          rows.length > 0
            ? `<div class="item-photos-wrap">
                ${rows
                  .map((rowEntries) => {
                    const rowColsClass =
                      rowEntries.length === 1 ? 'cols-1' : rowEntries.length === 3 ? 'cols-3' : 'cols-2';
                    return `<div class="photo-strip ${rowColsClass}">
                      ${rowEntries
                        .map(({ url, index: globalIdx }) => {
                          const resolvedSrc = resolveImgSrc(url);
                          const caption =
                            photoCount > 1 ? `รูปที่ ${globalIdx}/${photoCount}` : 'รูปภาพประกอบ';
                          return `
                            <div class="photo-slot ${rowColsClass}">
                              <div class="photo-thumb">
                                <img src="${esc(resolvedSrc)}" alt="${esc(cleanLabel)}" />
                              </div>
                              <div class="photo-slot-cap">${esc(caption)}</div>
                            </div>
                          `;
                        })
                        .join('')}
                    </div>`;
                  })
                  .join('')}
              </div>`
            : '';

        return `
          <div class="item-card ${keepTogether ? 'keep-together' : ''} ${photoCount > 0 ? 'has-photos' : 'no-photos'}">
            <div class="item-head">
              <div class="item-title-wrap">
                <span class="item-num ${sectionTone}">${idx + 1}</span>
                <span class="item-title ${isChecked ? 'checked-text' : ''}">${esc(cleanLabel)}</span>
              </div>
              <div class="item-badges">
                ${
                  photoCount > 0
                    ? `<span class="photo-count-pill">${photoCount} รูป</span>`
                    : `<span class="no-photo-tag">ไม่มีรูปแนบ</span>`
                }
                <span class="status-pill ${isChecked ? 'done' : 'pending'}">
                  ${isChecked ? '&#9745; ตรวจแล้ว' : '&#9744; ยังไม่ตรวจ'}
                </span>
              </div>
            </div>
            ${photosHtml}
          </div>
        `;
      })
      .join('');

    return `
      <div class="cat-block">
        <div class="cat-head ${sectionTone}">
          <span>${esc(groupTitle)}</span>
          <span class="group-count">${doneCount}/${totalCount} รายการ</span>
        </div>
        <div class="cat-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  };

  const renderBulletListCard = (title: string, items: string[], tone: 'emerald' | 'amber') => {
    const listHtml =
      items.length > 0
        ? `<ul class="bullet-list">${items.map((item) => `<li>${escMultiline(item)}</li>`).join('')}</ul>`
        : `<div class="empty-muted">ไม่มีข้อมูล / ไม่มีรายการบันทึก</div>`;
    return `
      <div class="note-card ${tone}">
        <div class="note-card-head">${esc(title)} (${items.length})</div>
        <div class="note-card-body">${listHtml}</div>
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>Solar Checklist - ${esc(p.projectNumber || p.name || p.id || '')}</title>
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
      color: #111827;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.42;
      background: #ffffff;
    }

    /* Header */
    .header-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 2.5px solid #ff2301;
      margin-bottom: 11px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .logo {
      height: 46px;
      width: auto;
      max-width: 84px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .logo-fallback {
      width: 52px;
      height: 46px;
      background: #ff2301;
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .corp-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 2px;
      line-height: 1.3;
    }
    .corp-line {
      font-size: 10px;
      color: #4b5563;
      margin: 0;
      line-height: 1.35;
    }
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    .doc-title {
      font-size: 14px;
      font-weight: 700;
      color: #ff2301;
      margin: 0;
      white-space: nowrap;
      line-height: 1.3;
    }
    .doc-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #374151;
      margin: 2px 0 4px;
    }
    .doc-meta-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
      background: ${p.isHighVoltage ? '#fffbeb' : '#f3f4f6'};
      color: ${p.isHighVoltage ? '#b45309' : '#374151'};
      border: 1px solid ${p.isHighVoltage ? '#fde68a' : '#d1d5db'};
    }

    /* Quick Top Summary Strip (3 symmetric cards) */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 11px;
    }
    .stat-card {
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 6px;
      padding: 6px 9px;
      break-inside: avoid;
    }
    .stat-label {
      font-size: 9.5px;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
    }
    .stat-value {
      font-size: 12.5px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
    }

    /* Section Container */
    .sec {
      margin-bottom: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sec.allow-break {
      overflow: visible;
      break-inside: auto;
      page-break-inside: auto;
    }
    .sec-head {
      background: #f3f4f6;
      border-bottom: 1px solid #e5e7eb;
      border-left: 4px solid #ff2301;
      padding: 5px 10px;
      font-size: 12.5px;
      font-weight: 700;
      color: #111827;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sec-head-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #4b5563;
    }
    .sec-body {
      padding: 6px 10px;
    }

    /* Key-Value Table */
    table.kv {
      width: 100%;
      border-collapse: collapse;
    }
    table.kv td {
      padding: 4px 6px;
      vertical-align: top;
      border-bottom: 1px solid #f3f4f6;
      font-size: 11.5px;
    }
    table.kv tr:last-child td {
      border-bottom: none;
    }
    table.kv td.k {
      width: 18%;
      font-weight: 700;
      color: #374151;
      white-space: nowrap;
    }
    table.kv td.v {
      width: 32%;
      color: #111827;
      word-break: break-word;
    }
    table.kv td.k2 {
      width: 18%;
      padding-left: 10px;
      border-left: 1px solid #f3f4f6;
    }
    table.kv td.v2 {
      width: 32%;
    }

    /* Checklist Categories & Inline Photo Blocks */
    .cat-block {
      margin-bottom: 10px;
    }
    .cat-block:last-child {
      margin-bottom: 0;
    }
    .cat-head {
      background: #fff7ed;
      color: #9a3412;
      border: 1px solid #fed7aa;
      border-radius: 5px;
      padding: 5px 10px;
      font-size: 11.5px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .cat-head.post {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .cat-head.hv {
      background: #fffbeb;
      color: #92400e;
      border-color: #fde68a;
    }
    .group-count {
      font-size: 10.5px;
      font-weight: 700;
    }
    .cat-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .item-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #ffffff;
      overflow: hidden;
    }
    .item-card.keep-together {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .item-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 9px;
      background: #f9fafb;
      break-after: avoid;
      page-break-after: avoid;
    }
    .item-card.no-photos .item-head {
      background: #ffffff;
    }
    .item-card.has-photos .item-head {
      border-bottom: 1px solid #e5e7eb;
    }
    .item-title-wrap {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      flex: 1;
    }
    .item-num {
      width: 20px;
      height: 20px;
      border-radius: 5px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 10.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .item-num.post {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    .item-num.hv {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    .item-title {
      font-size: 11.5px;
      color: #4b5563;
      font-weight: 400;
    }
    .item-title.checked-text {
      color: #111827;
      font-weight: 700;
    }
    .item-badges {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }
    .no-photo-tag {
      font-size: 10px;
      color: #9ca3af;
      padding: 1px 4px;
    }
    .status-pill {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
    }
    .status-pill.done {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .status-pill.pending {
      background: #f9fafb;
      color: #6b7280;
      border: 1px solid #e5e7eb;
    }
    .photo-count-pill {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .muted { color: #9ca3af; }

    /* Inline Photos Under Each Checklist Item */
    .item-photos-wrap {
      padding: 7px 9px;
      display: flex;
      flex-direction: column;
      gap: 7px;
      background: #ffffff;
    }
    .photo-strip {
      display: grid;
      gap: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .photo-strip.cols-1 {
      grid-template-columns: 1fr;
    }
    .photo-strip.cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }
    .photo-strip.cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    .photo-slot {
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 5px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .photo-thumb {
      width: 100%;
      height: 165px;
      background: #ffffff;
      border-radius: 4px;
      border: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .photo-slot.cols-1 .photo-thumb {
      height: 180px;
    }
    .photo-slot.cols-3 .photo-thumb {
      height: 140px;
    }
    .photo-thumb img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .photo-slot-cap {
      font-size: 10px;
      font-weight: 700;
      color: #4b5563;
      text-align: center;
    }

    /* Symmetrical 2-Column Note Cards (Checkout) */
    .note-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 6px;
    }
    .note-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
    }
    .note-card-head {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      border-bottom: 1px solid #e5e7eb;
    }
    .note-card.emerald .note-card-head {
      background: #ecfdf5;
      color: #065f46;
      border-bottom-color: #d1fae5;
    }
    .note-card.amber .note-card-head {
      background: #fffbeb;
      color: #92400e;
      border-bottom-color: #fde68a;
    }
    .note-card-body {
      padding: 6px 8px;
      font-size: 11px;
      min-height: 44px;
    }
    .bullet-list {
      margin: 0;
      padding-left: 16px;
    }
    .bullet-list li {
      margin-bottom: 2px;
    }
    .empty-muted {
      color: #9ca3af;
      font-style: italic;
      font-size: 10.5px;
    }

    /* Sign-off Grid (2-column symmetric) */
    .sign-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sign-box {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px 12px;
      text-align: center;
      font-size: 11.5px;
      background: #ffffff;
    }
    .sign-img-wrap {
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 6px auto 2px;
    }
    .sign-img {
      max-width: 190px;
      max-height: 54px;
      object-fit: contain;
      display: block;
    }
    .sign-line {
      margin: 4px auto 4px;
      width: 72%;
      border-bottom: 1px dotted #6b7280;
    }
    .sign-line.empty {
      margin-top: 40px;
    }

    .doc-footer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <!-- Letterhead Header -->
  <div class="header-box">
    <div class="header-left">
      ${logoHtml}
      <div>
        <div class="corp-name">${esc(companyMeta.thName)} (${esc(companyMeta.enName)})</div>
        <div class="corp-line">${esc(companyMeta.address)}</div>
        <div class="corp-line">โทร: ${esc(companyMeta.phone)} | เลขประจำตัวผู้เสียภาษี: ${esc(companyMeta.taxId)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">ใบตรวจสอบการเข้าหน้างานโซลาร์เซลล์</div>
      <div class="doc-subtitle">เลขที่โครงการ: ${esc(p.projectNumber || '-')}</div>
      <span class="doc-meta-pill">${esc(voltageLabel)}</span>
    </div>
  </div>

  <!-- 3-Card KPI Strip -->
  <div class="summary-strip">
    <div class="stat-card">
      <div class="stat-label">วันที่เริ่มเข้าหน้างาน</div>
      <div class="stat-value">${esc(workStartDate)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">เวลาเข้า - ออกงาน</div>
      <div class="stat-value">${esc(timeRangeDisplay)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">หลักฐานรูปถ่าย</div>
      <div class="stat-value">${photos.length} รูปภาพ</div>
    </div>
  </div>

  <!-- Section 1: Project & Check-in Info -->
  <div class="sec">
    <div class="sec-head">
      <span>1. ข้อมูลโครงการและการเข้าหน้างาน (Project & Check-in Information)</span>
      <span class="sec-head-sub">${esc(p.projectCategory || 'Solar Roof')}</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow('ชื่อโครงการ', esc(p.name || '-'), 'รหัสโครงการ', esc(p.projectNumber || '-'))}
        ${kvRow('ชื่อลูกค้า / องค์กร', esc(p.clientName || '-'), 'เลขที่อ้างอิง JB / QT', esc(refDocText))}
        ${kvRow('หัวหน้าทีมหน้างาน', esc(supervisorName), 'เวลาเข้างาน', esc(checkInDisplay))}
        ${kvRow('สถานที่ติดตั้ง', escMultiline(p.siteAddress))}
        ${kvRow('รายชื่อทีมงาน', escMultiline(teamMembersDisplay))}
      </table>
    </div>
  </div>

  <!-- Section 2: Checklist & Inline Site Photos Under Each Item -->
  <div class="sec allow-break">
    <div class="sec-head">
      <span>2. รายการตรวจสอบหน้างานและรูปถ่ายประกอบ (Checklist & Site Photos)</span>
      <span class="sec-head-sub">ตรวจแล้ว ${progress.totalChecked}/${progress.totalItems} ข้อ • รูปถ่ายรวม ${photos.length} ภาพ</span>
    </div>
    <div class="sec-body">
      ${renderChecklistCategoryBlock('หมวด A: รายการตรวจสอบก่อนเริ่มงาน (Pre-Work Checklist)', progress.preDone, progress.preTotal, PRE_WORK_CHECKLIST, progress.pre, 'pre')}
      ${renderChecklistCategoryBlock('หมวด B: รูปถ่ายหน้างานหลังติดตั้ง (Post-Installation)', progress.postDone, progress.postTotal, POST_INSTALL_PHOTOS, progress.post, 'post')}
      ${p.isHighVoltage ? renderChecklistCategoryBlock('หมวด C: จุดเชื่อมต่อ High Voltage (22-33-115 kVA)', progress.hvDone, progress.hvTotal, HV_CHECKLIST, progress.hv, 'hv') : ''}
    </div>
  </div>

  <!-- Section 3: Site Checkout & Summary -->
  <div class="sec">
    <div class="sec-head">
      <span>3. สรุปงานหลังจบงาน (Site Checkout & Work Summary)</span>
      <span class="sec-head-sub">เวลาออกงาน: ${esc(checkOutDisplay)}</span>
    </div>
    <div class="sec-body">
      <div class="note-grid">
        ${renderBulletListCard('สรุปงานที่ทำเสร็จแล้ว', workSummary, 'emerald')}
        ${renderBulletListCard('ปัญหา / อุปสรรคหน้างาน', siteProblems, 'amber')}
      </div>
      <table class="kv" style="margin-top: 6px; border-top: 1px solid #f3f4f6;">
        ${kvRow('เวลาออกหน้างาน', esc(checkOutDisplay), 'งานที่เหลือ / นัดหมายถัดไป', escMultiline(p.remainingWork))}
      </table>
    </div>
  </div>

  <!-- Sign-off Blocks -->
  <div class="sign-grid">
    <div class="sign-box">
      <div style="font-weight: 700;">ผู้ควบคุมงาน / หัวหน้าทีม (Project Supervisor)</div>
      ${
        resolveImgSrc(p.supervisorSignUrl)
          ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImgSrc(p.supervisorSignUrl))}" alt="ลายเซ็นหัวหน้าทีม" /></div><div class="sign-line"></div>`
          : `<div class="sign-line empty"></div>`
      }
      <div>(${esc(supervisorName !== '-' ? supervisorName : '................................................')})</div>
      <div class="muted" style="font-size: 10.5px; margin-top: 2px;">วันที่: ${esc(checkOutDisplay !== '-' ? checkOutDisplay : checkInDisplay)}</div>
    </div>
    <div class="sign-box">
      <div style="font-weight: 700;">ตัวแทนลูกค้า / ผู้รับมอบงาน (Customer Representative)</div>
      ${
        resolveImgSrc(p.customerSignUrl)
          ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImgSrc(p.customerSignUrl))}" alt="ลายเซ็นลูกค้า" /></div><div class="sign-line"></div>`
          : `<div class="sign-line empty"></div>`
      }
      <div>(${esc(p.clientName || '................................................')})</div>
      <div class="muted" style="font-size: 10.5px; margin-top: 2px;">วันที่: ${esc(checkOutDisplay !== '-' ? checkOutDisplay : '......./......./.............')}</div>
    </div>
  </div>

  <div class="doc-footer">
    <span>เอกสารสร้างจากระบบ TERA Sales CRM &mdash; โครงการ ${esc(p.projectNumber || p.id || '')}</span>
    <span>พิมพ์เมื่อ: ${esc(printTimestamp)}</span>
  </div>
</body>
</html>`;
}
