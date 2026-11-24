import {
  CLEANING_JOB_TYPES,
  CLEANING_PROJECT_TYPES,
  formatCleaningDateSlashBe,
  formatCleaningDateTimeBkk,
  normalizeWorkItems,
  type SolarCleaningRecord,
} from '@/app/lib/solarCleaningConfig';
import { getSurveyCompanyMeta, type SurveyCompanyCode } from '@/app/lib/surveyMetadata';

export type SystemCheckPdfAssets = {
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
  return s ? s.replace(/\r?\n/g, '<br/>') : '';
}

function formatDateOnlyAndTimeBkk(dateInput?: string | Date | null): { date: string; time: string } {
  if (!dateInput) {
    return { date: '........ / ........ / ............', time: '........ : ........ น.' };
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return { date: '........ / ........ / ............', time: '........ : ........ น.' };
  }
  return {
    date: formatCleaningDateSlashBe(d),
    time:
      d.toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' น.',
  };
}

export function generateSystemCheckPdfHtml(
  record: Partial<SolarCleaningRecord>,
  assets: SystemCheckPdfAssets = {}
): string {
  const r = record || {};
  const companyMeta = getSurveyCompanyMeta(r.companyCode);
  const selectedLogoUri = assets.companyLogos?.[companyMeta.code] ?? assets.logoDataUri ?? null;
  const resolveImg = (url?: string | null) => {
    const clean = (url || '').trim();
    if (!clean) return '';
    return assets.resolvedImageDataUris?.[clean] || clean;
  };

  const projectTypesSet = new Set(r.projectTypes || []);
  const jobTypesSet = new Set(r.jobTypes || []);
  const workItemsRaw = normalizeWorkItems(r.workItems);
  const minRows = Math.max(5, workItemsRaw.length);
  const workItems = Array.from({ length: minRows }, (_, idx) => {
    const found = workItemsRaw[idx];
    return {
      no: found?.no || idx + 1,
      detail: found?.detail || '',
      remark: found?.remark || '',
    };
  });

  const checkInFmt = formatDateOnlyAndTimeBkk(r.checkInAt);
  const checkOutFmt = formatDateOnlyAndTimeBkk(r.checkOutAt);
  const inspectionDateStr = r.inspectionDate
    ? formatCleaningDateSlashBe(r.inspectionDate)
    : '........ / ........ / ............';
  const printTime = formatCleaningDateTimeBkk(new Date());

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

  const renderCheckOption = (label: string, checked: boolean, otherVal?: string | null) => {
    const isOther = label === 'อื่นๆ';
    const extraText = isOther && checked && otherVal ? ` (${esc(otherVal)})` : '';
    return `
      <div class="chk-item">
        <span class="chk-box ${checked ? 'is-checked' : ''}">${checked ? '&#10003;' : ''}</span>
        <span class="chk-label ${checked ? 'is-checked-text' : ''}">${esc(label)}${extraText}</span>
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>แบบฟอร์มการตรวจเช็คระบบ - ${esc(r.docNumber || '')}</title>
  <style>
    ${fontFaceCss}
    * { box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.38;
      background: #ffffff;
    }

    /* ── Official Corporate Letterhead & Document Control ── */
    .letterhead {
      display: table;
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .lh-left {
      display: table-cell;
      vertical-align: middle;
      padding-right: 12px;
    }
    .lh-company-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo {
      height: 74px;
      width: auto;
      max-width: 165px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .logo-fallback {
      width: 54px;
      height: 48px;
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .corp-th {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      line-height: 1.25;
    }
    .corp-en {
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 2px;
      letter-spacing: 0.2px;
    }
    .corp-addr {
      font-size: 9.6px;
      color: #475569;
      margin: 0;
      line-height: 1.32;
    }
    .lh-right {
      display: table-cell;
      vertical-align: middle;
      width: 222px;
    }
    .doc-control-box {
      width: 100%;
      border: 1.4px solid #0f172a;
      border-collapse: collapse;
    }
    .doc-control-title {
      background: #0f172a;
      color: #ffffff;
      text-align: center;
      padding: 5px 8px;
      border-bottom: 1.4px solid #0f172a;
    }
    .doc-control-title-th {
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
      line-height: 1.2;
    }
    .doc-control-title-en {
      font-size: 8.2px;
      font-weight: 700;
      letter-spacing: 0.6px;
      color: #cbd5e1;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .doc-control-row td {
      border-top: 1px solid #cbd5e1;
      padding: 3.5px 7px;
      font-size: 10.5px;
      line-height: 1.25;
    }
    .doc-control-lbl {
      width: 44%;
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      border-right: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    .doc-control-val {
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }

    .header-divider {
      border-top: 2px solid #0f172a;
      border-bottom: 1px solid #b91c1c;
      height: 4px;
      margin: 5px 0 9px;
    }

    /* ── Official Architectural Sections (Zero rounded web pills) ── */
    .form-section {
      border: 1.2px solid #0f172a;
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sec-bar {
      background: #f1f5f9;
      border-bottom: 1.2px solid #0f172a;
      border-left: 4px solid #0f172a;
      padding: 4px 9px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sec-bar-en {
      font-size: 9.2px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* ── Metadata Key-Value Grid ── */
    table.kv {
      width: 100%;
      border-collapse: collapse;
    }
    table.kv td {
      padding: 4.5px 8px;
      border-bottom: 1px solid #cbd5e1;
      font-size: 11.2px;
      vertical-align: top;
    }
    table.kv tr:last-child td {
      border-bottom: none;
    }
    table.kv td.k {
      width: 18%;
      font-weight: 700;
      color: #1e293b;
      background: #f8fafc;
      border-right: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    table.kv td.v {
      width: 32%;
      color: #0f172a;
    }
    table.kv td.k2 {
      border-left: 1px solid #cbd5e1;
    }

    /* ── Unified Dual Checkbox Grid ── */
    .scope-table {
      width: 100%;
      border-collapse: collapse;
    }
    .scope-table th {
      width: 50%;
      background: #f1f5f9;
      border-bottom: 1.2px solid #0f172a;
      padding: 4px 9px;
      font-size: 11.2px;
      font-weight: 700;
      color: #0f172a;
      text-align: left;
    }
    .scope-table th + th,
    .scope-table td + td {
      border-left: 1.2px solid #0f172a;
    }
    .scope-table td {
      padding: 6.5px 10px;
      vertical-align: top;
    }
    .chk-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4.5px 10px;
    }
    .chk-grid-1 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4.5px;
    }
    .chk-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    .chk-box {
      width: 12px;
      height: 12px;
      border: 1.3px solid #0f172a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      flex-shrink: 0;
      background: #ffffff;
      color: #0f172a;
    }
    .chk-box.is-checked {
      background: #0f172a;
      color: #ffffff;
    }
    .chk-label {
      color: #334155;
    }
    .chk-label.is-checked-text {
      color: #0f172a;
      font-weight: 700;
    }

    /* ── Work Details Table ── */
    table.work-grid {
      width: 100%;
      border-collapse: collapse;
    }
    table.work-grid th,
    table.work-grid td {
      border-bottom: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-size: 11px;
      vertical-align: top;
    }
    table.work-grid th:last-child,
    table.work-grid td:last-child {
      border-right: none;
    }
    table.work-grid tr:last-child td {
      border-bottom: none;
    }
    table.work-grid th {
      background: #f8fafc;
      border-bottom: 1.2px solid #0f172a;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      font-size: 10.8px;
    }
    .work-row-empty td {
      height: 24px;
    }

    /* ── Additional Remarks ── */
    .notes-body {
      padding: 7px 10px 8px;
      min-height: 48px;
      font-size: 11px;
      color: #0f172a;
    }
    .ruled-lines {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding-top: 8px;
    }
    .ruled-line {
      border-bottom: 1px dotted #94a3b8;
      width: 100%;
    }

    /* ── Official 3-Column Acknowledgement & Signature Block ── */
    .attestation-bar {
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      padding: 3.5px 9px;
      font-size: 10px;
      color: #334155;
      text-align: center;
      font-weight: 700;
    }
    table.sign-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.sign-table th {
      background: #f1f5f9;
      border-bottom: 1.2px solid #0f172a;
      border-right: 1px solid #94a3b8;
      padding: 4.5px 6px;
      font-size: 10.8px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }
    table.sign-table th:last-child,
    table.sign-table td:last-child {
      border-right: none;
    }
    table.sign-table td {
      border-right: 1px solid #94a3b8;
      padding: 6px 8px 7px;
      text-align: center;
      vertical-align: bottom;
      font-size: 10.4px;
      color: #1e293b;
    }
    .sign-pad-area {
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }
    .sign-pad-img {
      max-width: 145px;
      max-height: 50px;
      object-fit: contain;
    }
    .sign-prefix-row {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      margin: 34px auto 4px;
      width: 90%;
      font-size: 10.2px;
    }
    .sign-prefix-line {
      flex: 1;
      border-bottom: 1px dotted #475569;
    }
    .sign-line-signed {
      width: 86%;
      border-bottom: 1px dotted #475569;
      margin: 0 auto 4px;
    }
    .sign-name-row {
      font-weight: 700;
      color: #0f172a;
      font-size: 10.5px;
      margin-bottom: 4px;
      word-break: break-word;
    }
    .sign-datetime-box {
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 9.8px;
      color: #475569;
      line-height: 1.4;
      text-align: center;
    }

    /* ── Footer ── */
    .doc-footer {
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.2px;
      color: #475569;
    }
  </style>
</head>
<body>
  <!-- Official Letterhead & Controlled Header -->
  <div class="letterhead">
    <div class="lh-left">
      <div class="lh-company-row">
        ${logoHtml}
        <div>
          <div class="corp-th">${esc(companyMeta.thName)}</div>
          <div class="corp-en">${esc(companyMeta.enName)}</div>
          <div class="corp-addr">${esc(companyMeta.address)}</div>
          <div class="corp-addr">โทรศัพท์: ${esc(companyMeta.phone)} &nbsp;|&nbsp; เลขประจำตัวผู้เสียภาษี: ${esc(companyMeta.taxId)}</div>
        </div>
      </div>
    </div>
    <div class="lh-right">
      <table class="doc-control-box">
        <tr>
          <td colspan="2" class="doc-control-title">
            <div class="doc-control-title-th">แบบฟอร์มการตรวจเช็คระบบ</div>
            <div class="doc-control-title-en">SYSTEM INSPECTION CHECK SHEET</div>
          </td>
        </tr>
        <tr class="doc-control-row">
          <td class="doc-control-lbl">เลขที่เอกสาร</td>
          <td class="doc-control-val">${esc(r.docNumber || '-')}</td>
        </tr>
        <tr class="doc-control-row">
          <td class="doc-control-lbl">วันที่ (พ.ศ.)</td>
          <td class="doc-control-val">${esc(inspectionDateStr)}</td>
        </tr>
      </table>
    </div>
  </div>
  <div class="header-divider"></div>

  <!-- Section 1: Project & Customer Info -->
  <div class="form-section">
    <div class="sec-bar">
      <span>1. ข้อมูลโครงการและผู้รับบริการ</span>
      <span class="sec-bar-en">PROJECT &amp; CLIENT INFORMATION</span>
    </div>
    <table class="kv">
      <tr>
        <td class="k">ชื่อโครงการ</td>
        <td class="v"><strong>${esc(r.projectName || '-')}</strong></td>
        <td class="k k2">กำลังการผลิต</td>
        <td class="v">${esc(r.systemSizeKwp || '-')}</td>
      </tr>
      <tr>
        <td class="k">ชื่อลูกค้า / บริษัท</td>
        <td class="v"><strong>${esc(r.customerName || '-')}</strong></td>
        <td class="k k2">เบอร์โทรติดต่อ</td>
        <td class="v">${esc(r.customerPhone || '-')}</td>
      </tr>
      <tr>
        <td class="k">รอบการตรวจเช็ค</td>
        <td class="v">${esc(r.inspectionRound || '-')}</td>
        <td class="k k2">วันที่เข้าปฏิบัติงาน</td>
        <td class="v">${esc(inspectionDateStr)}</td>
      </tr>
      <tr>
        <td class="k">สถานที่ปฏิบัติงาน</td>
        <td class="v" colspan="3">${escMultiline(r.location) || '-'}</td>
      </tr>
      <tr>
        <td class="k">ทีมผู้เข้าตรวจเช็ค</td>
        <td class="v" colspan="3">${escMultiline(r.inspectorNames) || '-'}</td>
      </tr>
    </table>
  </div>

  <!-- Section 2: Project Type & Scope of Service -->
  <div class="form-section">
    <table class="scope-table">
      <thead>
        <tr>
          <th>2. ลักษณะโครงการ (PROJECT TYPE)</th>
          <th>3. ลักษณะงานบริการ (SERVICE SCOPE)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="chk-grid-2">
              ${CLEANING_PROJECT_TYPES.map((pt) =>
                renderCheckOption(pt, projectTypesSet.has(pt), r.projectTypeOther)
              ).join('')}
            </div>
          </td>
          <td>
            <div class="chk-grid-1">
              ${CLEANING_JOB_TYPES.map((jt) =>
                renderCheckOption(jt, jobTypesSet.has(jt), r.jobTypeOther)
              ).join('')}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Section 4: Work Details Table -->
  <div class="form-section">
    <div class="sec-bar">
      <span>4. รายละเอียดการปฏิบัติงานและรายการตรวจเช็ค</span>
      <span class="sec-bar-en">WORK DESCRIPTION &amp; INSPECTION LIST</span>
    </div>
    <table class="work-grid">
      <thead>
        <tr>
          <th style="width: 48px;">ลำดับ</th>
          <th>รายละเอียดงาน (Description of Work)</th>
          <th style="width: 28%;">หมายเหตุ (Remarks)</th>
        </tr>
      </thead>
      <tbody>
        ${workItems
          .map(
            (w) => `
          <tr class="${!w.detail && !w.remark ? 'work-row-empty' : ''}">
            <td style="text-align: center; font-weight: 700; color: #334155;">${w.no}</td>
            <td>${escMultiline(w.detail) || '&nbsp;'}</td>
            <td>${escMultiline(w.remark) || '&nbsp;'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <!-- Section 5: Additional Remarks -->
  <div class="form-section">
    <div class="sec-bar">
      <span>5. บันทึกเพิ่มเติม / ข้อเสนอแนะหน้างาน</span>
      <span class="sec-bar-en">ADDITIONAL REMARKS</span>
    </div>
    <div class="notes-body">
      ${
        (r.additionalDetail || '').trim()
          ? escMultiline(r.additionalDetail)
          : `<div class="ruled-lines">
               <div class="ruled-line"></div>
               <div class="ruled-line"></div>
             </div>`
      }
    </div>
  </div>

  <!-- Section 6: Official 3-Column Sign-off Block -->
  <div class="form-section" style="margin-bottom: 0;">
    <div class="sec-bar">
      <span>6. การลงนามรับรองการเข้าปฏิบัติงานและส่งมอบหน้างาน</span>
      <span class="sec-bar-en">OFFICIAL ACKNOWLEDGEMENT &amp; SIGN-OFF</span>
    </div>
    <div class="attestation-bar">
      ข้าพเจ้าขอรับรองว่าเจ้าหน้าที่ของบริษัทฯ ได้เข้าปฏิบัติงานและตรวจเช็คระบบตามรายการข้างต้นเรียบร้อยแล้ว
    </div>
    <table class="sign-table">
      <thead>
        <tr>
          <th>ตัวแทนลูกค้า (เข้างาน / Check-in)</th>
          <th>ตัวแทนลูกค้า (เสร็จงาน / Check-out)</th>
          <th>เจ้าหน้าที่ผู้ตรวจเช็ค (Inspector)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            ${
              resolveImg(r.checkInCustomerSignUrl)
                ? `<div class="sign-pad-area"><img src="${esc(resolveImg(r.checkInCustomerSignUrl))}" class="sign-pad-img" alt="ลายเซ็นลูกค้าเข้างาน" /></div><div class="sign-line-signed"></div>`
                : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
            }
            <div class="sign-name-row">(&nbsp;${esc(r.checkInCustomerName || '....................................................')}&nbsp;)</div>
            <div>ผู้รับบริการ / ตัวแทนลูกค้า</div>
            <div class="sign-datetime-box">
              <div><strong>วันที่:</strong> ${esc(checkInFmt.date)}</div>
              <div><strong>เวลา:</strong> ${esc(checkInFmt.time)}</div>
            </div>
          </td>

          <td>
            ${
              resolveImg(r.checkOutCustomerSignUrl)
                ? `<div class="sign-pad-area"><img src="${esc(resolveImg(r.checkOutCustomerSignUrl))}" class="sign-pad-img" alt="ลายเซ็นลูกค้าส่งมอบงาน" /></div><div class="sign-line-signed"></div>`
                : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
            }
            <div class="sign-name-row">(&nbsp;${esc(r.checkOutCustomerName || '....................................................')}&nbsp;)</div>
            <div>ผู้รับบริการ / ตัวแทนลูกค้า</div>
            <div class="sign-datetime-box">
              <div><strong>วันที่:</strong> ${esc(checkOutFmt.date)}</div>
              <div><strong>เวลา:</strong> ${esc(checkOutFmt.time)}</div>
            </div>
          </td>

          <td>
            ${
              resolveImg(r.inspectorSignUrl)
                ? `<div class="sign-pad-area"><img src="${esc(resolveImg(r.inspectorSignUrl))}" class="sign-pad-img" alt="ลายเซ็นผู้เข้าตรวจเช็ค" /></div><div class="sign-line-signed"></div>`
                : `<div class="sign-prefix-row"><span>ลงชื่อ</span><span class="sign-prefix-line"></span></div>`
            }
            <div class="sign-name-row">(&nbsp;${esc(r.inspectorSignerName || r.inspectorNames || '....................................................')}&nbsp;)</div>
            <div>วิศวกร / หัวหน้าชุดปฏิบัติงาน</div>
            <div class="sign-datetime-box">
              <div><strong>วันที่:</strong> ${esc(inspectionDateStr)}</div>
              <div><strong>สถานะ:</strong> ปฏิบัติงานหน้างาน</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="doc-footer">
    <span>เอกสารควบคุมสำหรับงานบริการและวิศวกรรมโครงการ &bull; เลขที่ ${esc(r.docNumber || '-')}</span>
    <span>พิมพ์เอกสารเมื่อ: ${esc(printTime)}</span>
  </div>
</body>
</html>`;
}
