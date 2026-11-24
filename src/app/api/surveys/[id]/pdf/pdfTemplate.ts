import {
  REQUIRED_CHECKLIST_ITEMS,
  ROOF_PATTERN_LABELS,
  collectSurveyAttachments,
  extractAttachmentFilename,
  formatBytesCompact,
  formatNum,
  formatThaiDate,
  getElectricityBillUrl,
  getEstimationStatusMeta,
  getSurveyCompanyMeta,
  getSurveyStatusMeta,
  type SurveyCompanyCode,
  type SurveyFilePreview,
} from '@/app/lib/surveyMetadata';

export type SurveyPdfAssets = {
  logoDataUri?: string | null;
  companyLogos?: Partial<Record<SurveyCompanyCode, string | null>>;
  fontRegularBase64?: string | null;
  fontBoldBase64?: string | null;
  mimeTypesByUrl?: Record<string, string>;
  filePreviews?: SurveyFilePreview[];
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

function yesNoLabel(val?: string | null): string {
  if (!val) return '-';
  if (val === 'Yes') return 'มี / ใช่ (Yes)';
  if (val === 'No') return 'ไม่มี / ไม่ (No)';
  return esc(val);
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

export function generateSurveyPdfHtml(survey: any, assets: SurveyPdfAssets = {}): string {
  const s = survey || {};
  const usage = s.usageBehavior || {};
  const elec = s.electricalProfile || {};
  const tariff = s.tariffSelection || {};
  const tiers: any[] = Array.isArray(tariff.tiers) ? tariff.tiers : [];
  const struct = s.structure || {};
  const roofAges: any[] = Array.isArray(struct.roofAges) ? struct.roofAges : [];
  const qa = s.qa || {};
  const { visualAttachments, fileAttachments } = collectSurveyAttachments(s, assets.mimeTypesByUrl || {});
  const resolvedFiles: SurveyFilePreview[] =
    assets.filePreviews && assets.filePreviews.length > 0 ? assets.filePreviews : fileAttachments;
  const resolveImgSrc = (url?: string | null): string => {
    const clean = (url || '').trim();
    if (!clean) return '';
    return assets.resolvedImageDataUris?.[clean] || clean;
  };
  const photoPairs: (typeof visualAttachments)[] = [];
  for (let i = 0; i < visualAttachments.length; i += 2) {
    photoPairs.push(visualAttachments.slice(i, i + 2));
  }
  const documents: any[] = Array.isArray(s.documents)
    ? s.documents.filter((d: any) => d.documentType || d.fileUrl || d.note)
    : [];
  const checklist: string[] = Array.isArray(s.requiredInfoChecklist) ? s.requiredInfoChecklist : [];
  const billUrl = getElectricityBillUrl(s.electricityBill);
  const billCount = typeof s.electricityBill === 'object' ? s.electricityBill?.billCount : null;
  const billNote = typeof s.electricityBill === 'object' ? s.electricityBill?.note : null;

  const companyMeta = getSurveyCompanyMeta(s.companyCode);
  const statusMeta = getSurveyStatusMeta(s.status);
  const estMeta = getEstimationStatusMeta(s.estimationStatus);

  const hasCoords =
    typeof s.latitude === 'number' &&
    Number.isFinite(s.latitude) &&
    typeof s.longitude === 'number' &&
    Number.isFinite(s.longitude);
  const mapUrl = hasCoords ? `https://maps.google.com/?q=${s.latitude},${s.longitude}` : '';

  // Compute tariff totals
  const totalTariffKwh = tiers.reduce((acc, t) => acc + (Number(t.qtyKwhPerMonth) || 0), 0);
  const totalTariffCost = tiers.reduce(
    (acc, t) => acc + (Number(t.ratePerKwh) || 0) * (Number(t.qtyKwhPerMonth) || 0),
    0
  );
  const blendedRate = totalTariffKwh > 0 ? totalTariffCost / totalTariffKwh : null;

  // Merge roof type and age map
  const roofAgeMap = new Map<string, number>();
  roofAges.forEach((ra: any) => {
    if (ra?.roofType) roofAgeMap.set(ra.roofType, ra.ageYear);
  });
  const roofTypesList: string[] = Array.isArray(struct.roofType) ? struct.roofType : [];
  const roofDisplay =
    roofTypesList.length > 0
      ? roofTypesList
          .map((rt) => {
            const lookupKey = rt.startsWith('อื่นๆ:') ? 'อื่นๆ' : rt;
            const age = roofAgeMap.get(lookupKey) ?? roofAgeMap.get(rt);
            return age !== undefined && age !== null ? `${esc(rt)} (อายุ ${age} ปี)` : esc(rt);
          })
          .join(', ')
      : '-';

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

  const selectedLogoUri = assets.companyLogos?.[companyMeta.code] ?? assets.logoDataUri ?? null;
  const logoHtml = selectedLogoUri
    ? `<img src="${selectedLogoUri}" class="logo" alt="${esc(companyMeta.enName)} Logo" />`
    : `<div class="logo-fallback">${esc(companyMeta.code)}</div>`;

  const checklistRowsHtml = REQUIRED_CHECKLIST_ITEMS.map((item) => {
    const checked = checklist.includes(item.value);
    let extra = '';
    if ('fileField' in item && item.fileField) {
      const url = s[item.fileField];
      if (url) {
        const fname = extractAttachmentFilename(url, 'ไฟล์แนบ');
        extra = `<a class="doc-link" href="${esc(url)}" target="_blank">${esc(fname)}</a>`;
      }
    } else if ('isAmr' in item && item.isAmr) {
      const amrParts: string[] = [];
      if (s.amrCustomerCode) amrParts.push(`รหัสผู้ใช้: ${esc(s.amrCustomerCode)}`);
      if (elec.amrUsernameEncrypted || elec.amrPasswordEncrypted) {
        amrParts.push('บันทึกข้อมูลบัญชี AMR ในระบบแล้ว');
      }
      extra = amrParts.join(' | ');
    } else if ('showLatLng' in item && item.showLatLng && hasCoords) {
      extra = `${s.latitude}, ${s.longitude}`;
    }

    return `
      <tr>
        <td style="width: 28px; text-align: center; font-weight: 700; color: ${checked ? '#059669' : '#9ca3af'};">
          ${checked ? '☑' : '☐'}
        </td>
        <td style="font-weight: ${checked ? '700' : '400'}; color: ${checked ? '#111827' : '#6b7280'};">
          ${esc(item.label)}
        </td>
        <td style="width: 40%; text-align: right;">${extra || '<span class="muted">-</span>'}</td>
      </tr>
    `;
  }).join('');

  const printDateStr = formatThaiDate(new Date(), true);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>Site Survey Report - ${esc(s.surveyNumber || '')}</title>
  <style>
    ${fontFaceCss}
    * { box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 11mm 12mm 13mm 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      color: #111827;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      background: #ffffff;
    }

    /* Header */
    .header-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding-bottom: 10px;
      border-bottom: 2.5px solid #ff2301;
      margin-bottom: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    .logo {
      height: 68px;
      width: auto;
      object-fit: contain;
    }
    .logo-fallback {
      width: 56px;
      height: 52px;
      background: #ff2301;
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }
    .corp-name {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 2px;
    }
    .corp-line {
      font-size: 11px;
      color: #4b5563;
      margin: 0;
    }
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 700;
      color: #ff2301;
      margin: 0;
    }
    .doc-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #374151;
      margin: 1px 0 4px;
    }
    .doc-meta-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: ${statusMeta.pdfBg};
      color: ${statusMeta.pdfColor};
      border: 1px solid #e5e7eb;
    }

    /* Quick Top Summary Strip */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-card {
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 6px;
      padding: 6px 9px;
      break-inside: avoid;
    }
    .stat-card.highlight {
      border-color: #fecaca;
      background: #fff5f5;
    }
    .stat-label {
      font-size: 10px;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
    }
    .stat-value {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin-top: 1px;
    }
    .stat-card.highlight .stat-value {
      color: #dc2626;
    }

    /* Section */
    .sec {
      margin-bottom: 11px;
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
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sec-body {
      padding: 6px 10px;
    }

    /* Key-Value Grid Table */
    table.kv {
      width: 100%;
      border-collapse: collapse;
    }
    table.kv td {
      padding: 3.5px 6px;
      vertical-align: top;
      border-bottom: 1px solid #f3f4f6;
      font-size: 12px;
    }
    table.kv tr:last-child td {
      border-bottom: none;
    }
    table.kv td.k {
      width: 21%;
      font-weight: 700;
      color: #374151;
      white-space: nowrap;
    }
    table.kv td.v {
      width: 29%;
      color: #111827;
      word-break: break-word;
    }
    table.kv td.k2 {
      width: 21%;
      padding-left: 12px;
      border-left: 1px solid #f3f4f6;
    }
    table.kv td.v2 {
      width: 29%;
    }

    /* Data Grid Table */
    table.grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    table.grid th,
    table.grid td {
      border: 1px solid #e5e7eb;
      padding: 4px 7px;
      font-size: 11.5px;
      text-align: left;
      vertical-align: top;
    }
    table.grid th {
      background: #f9fafb;
      font-weight: 700;
      color: #374151;
    }
    .num { text-align: right !important; font-variant-numeric: tabular-nums; }
    .muted { color: #9ca3af; }
    .doc-link { color: #b91c1c; text-decoration: underline; font-size: 11px; word-break: break-all; }

    /* Estimation Box */
    .est-box {
      border: 1.5px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 11px;
      break-inside: avoid;
    }
    .est-head {
      background: #111827;
      color: #ffffff;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .est-badge {
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 11px;
      background: ${estMeta.pdfBg};
      color: ${estMeta.pdfColor};
    }

    /* Photos Grid */
    .keep-together {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .photo-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      padding: 8px 10px 2px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .photo-row:last-child {
      padding-bottom: 10px;
    }
    .photo-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 7px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .photo-card img {
      width: 100%;
      height: 210px;
      object-fit: contain;
      background: #f9fafb;
      border-radius: 4px;
      display: block;
    }
    .photo-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      margin-top: 6px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .photo-badge.bill { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .photo-badge.checklist { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .photo-badge.document { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .photo-cap {
      margin-top: 3px;
      font-size: 11.5px;
      font-weight: 700;
      color: #111827;
    }
    .photo-desc {
      font-size: 11px;
      color: #4b5563;
      margin-top: 1px;
    }

    /* Sign-off */
    .sign-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sign-box {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px 12px;
      text-align: center;
      font-size: 12px;
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
    /* File attachments & spreadsheet previews */
    .file-kind-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .file-kind-pill.pdf { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .file-kind-pill.spreadsheet { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .file-kind-pill.text { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .sheet-block {
      margin-top: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .sheet-title {
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      color: #1f2937;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    table.sheet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    table.sheet-table th,
    table.sheet-table td {
      border: 1px solid #e5e7eb;
      padding: 2px 4px;
      text-align: left;
      word-break: break-word;
      vertical-align: top;
    }
    table.sheet-table th {
      background: #f3f4f6;
      font-weight: 700;
      color: #111827;
    }
    .sheet-note {
      padding: 3px 8px;
      font-size: 10px;
      color: #6b7280;
      background: #fafafa;
      border-top: 1px solid #e5e7eb;
    }
    .text-preview-box {
      margin-top: 6px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 7px 9px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      line-height: 1.4;
      color: #1f2937;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .doc-footer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <!-- Official Letterhead -->
  <div class="header-box">
    <div class="header-left">
      ${logoHtml}
      <div>
        <p class="corp-name">${esc(companyMeta.thName)} (${esc(companyMeta.enName)})</p>
        <p class="corp-line">${esc(companyMeta.address)}</p>
        <p class="corp-line">โทร: ${esc(companyMeta.phone)} | เลขประจำตัวผู้เสียภาษี ${esc(companyMeta.taxId)}</p>
      </div>
    </div>
    <div class="header-right">
      <p class="doc-title">แบบรายงานสำรวจไซต์งาน</p>
      <p class="doc-subtitle">SITE SURVEY & ESTIMATION REPORT</p>
      <span class="doc-meta-pill">${esc(statusMeta.label)}</span>
    </div>
  </div>

  <!-- Top Highlight Strip -->
  <div class="summary-strip">
    <div class="stat-card">
      <div class="stat-label">เลขที่เอกสาร / เวอร์ชัน</div>
      <div class="stat-value">${esc(s.surveyNumber || '-')} (v.${s.version || 1})</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">วันที่สำรวจ</div>
      <div class="stat-value">${esc(formatThaiDate(s.surveyDate))}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">ค่าไฟเฉลี่ย / หม้อแปลง</div>
      <div class="stat-value">
        ${usage.avgBillThbPerMonth ? `฿${formatNum(usage.avgBillThbPerMonth)}` : '-'}
        / ${elec.transformerKva ? `${formatNum(elec.transformerKva)} kVA` : '-'}
      </div>
    </div>
    <div class="stat-card highlight">
      <div class="stat-label">ราคาประเมินทีมโปรเจค</div>
      <div class="stat-value">
        ${s.estimatedPrice ? `฿${formatNum(s.estimatedPrice, 'บาท')}` : esc(estMeta.label)}
      </div>
    </div>
  </div>

  <!-- Section 1: Project & Customer Info -->
  <div class="sec">
    <div class="sec-head">
      <span>1. ข้อมูลโครงการ ลูกค้า และผู้ประสานงาน (Project & Customer Details)</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow('ชื่อลูกค้า / บริษัท', esc(s.customerName || s.company?.companyName || '-'), 'ชื่อโครงการ', esc(s.projectName || '-'))}
        ${kvRow('ผู้ประสานงาน', esc(s.coordinatorName || '-'), 'เบอร์โทรผู้ประสานงาน', esc(s.coordinatorPhone || '-'))}
        ${kvRow('เซลส์ผู้รับผิดชอบ', esc(s.salesperson?.fullName || '-'), 'ผู้สำรวจหน้างาน', esc(s.surveyorName || '-'))}
        ${kvRow('สถานที่ตั้งโครงการ', escMultiline(s.projectLocation || '-'))}
        ${kvRow(
          'พิกัด GPS (Lat / Lng)',
          hasCoords
            ? `${s.latitude}, ${s.longitude} &nbsp;<a class="doc-link" href="${esc(mapUrl)}" target="_blank">(เปิด Google Maps)</a>`
            : '-'
        )}
      </table>
    </div>
  </div>

  <!-- Section 2: Usage Behavior -->
  <div class="sec">
    <div class="sec-head">
      <span>2. พฤติกรรมการใช้พลังงาน (Usage Behavior)</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow('เวลาทำงานของกิจการ', esc(usage.workingHours || '-'), 'สัดส่วน กลางวัน/กลางคืน', esc(usage.dayNightRatio || '-'))}
        ${kvRow('วันทำงาน / สัปดาห์', formatNum(usage.workingDaysPerWeek, 'วัน'), 'วันหยุด / สัปดาห์', formatNum(usage.nonWorkingDaysPerWeek, 'วัน'))}
        ${kvRow('วันทำงาน / ปี', formatNum(usage.workingDaysPerYear, 'วัน'), 'วันหยุด / ปี', formatNum(usage.nonWorkingDaysPerYear, 'วัน'))}
        ${kvRow('ค่าไฟเฉลี่ยต่อเดือน', usage.avgBillThbPerMonth !== null && usage.avgBillThbPerMonth !== undefined ? `${formatNum(usage.avgBillThbPerMonth, 'บาท/เดือน')}` : '-', 'เครื่องจักร / โหลดหลัก', escMultiline(usage.mainEquipment || '-'))}
      </table>
    </div>
  </div>

  <!-- Section 3: Electrical Profile & Tariff -->
  <div class="sec">
    <div class="sec-head">
      <span>3. ข้อมูลระบบไฟฟ้าและอัตราค่าไฟ (Electrical Profile & Tariff)</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow('การไฟฟ้า (Grid Provider)', esc(elec.gridProvider || '-'), 'ประเภทผู้ใช้ไฟฟ้า', esc(elec.userType || '-'))}
        ${kvRow('ระดับแรงดันไฟฟ้า', esc((elec.voltageLevel || []).join(', ') || '-'), 'ขนาดมิเตอร์', esc((elec.meterSize || []).join(', ') || '-'))}
        ${kvRow('จำนวนหน่วยที่ใช้ (kWh/ด.)', formatNum(elec.kwhQty, 'kWh'), 'อัตราค่าไฟเฉลี่ย', formatNum(elec.rateThbPerKwh, 'บาท/kWh', 4))}
        ${kvRow('Peak วันธรรมดา (จ.-ศ.)', formatNum(elec.peakKwWeekday, 'kW'), 'Peak วันหยุด (ส.-อา.)', formatNum(elec.peakKwWeekend, 'kW'))}
        ${kvRow('จำนวนหม้อแปลง / ขนาด', `${formatNum(elec.transformerCount, 'ลูก')} (${formatNum(elec.transformerKva, 'kVA')})`, 'ยี่ห้อ / รุ่นหม้อแปลง', `${esc(elec.transformerBrand || '-')} / ${esc(elec.transformerModel || '-')}`)}
        ${kvRow('พิกัดเมนเบรกเกอร์ (AT)', formatNum(elec.breakerAmp, 'A'), 'ระยะสายถึงตู้เมน (MDB)', formatNum(elec.mainPanelCableLengthM, 'เมตร'))}
        ${kvRow('แบบไฟฟ้า (Single Line)', s.hasSingleLineDiagram ? 'มี (Available)' : 'ไม่มี (None)', 'หมวดอัตราค่าไฟฟ้า', esc(tariff.tariffCategory || '-'))}
      </table>

      ${
        tiers.length > 0
          ? `
        <table class="grid" style="margin-top: 6px;">
          <thead>
            <tr>
              <th>ช่วงอัตราค่าไฟ (Tariff Tier)</th>
              <th class="num" style="width: 24%;">อัตรา (บาท/kWh)</th>
              <th class="num" style="width: 24%;">ปริมาณการใช้ (kWh/เดือน)</th>
              <th class="num" style="width: 24%;">ประมาณการค่าไฟ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${tiers
              .map((t: any) => {
                const lineTotal = (Number(t.ratePerKwh) || 0) * (Number(t.qtyKwhPerMonth) || 0);
                return `
                  <tr>
                    <td>${esc(t.tierName || '-')}</td>
                    <td class="num">${formatNum(t.ratePerKwh, '', 4)}</td>
                    <td class="num">${formatNum(t.qtyKwhPerMonth, '', 2)}</td>
                    <td class="num">${formatNum(lineTotal, '', 2)}</td>
                  </tr>
                `;
              })
              .join('')}
            <tr style="background: #f9fafb; font-weight: 700;">
              <td>รวมทั้งหมด / ค่าไฟเฉลี่ยก่อน VAT</td>
              <td class="num">${blendedRate !== null ? formatNum(blendedRate, 'บ./หน่วย', 4) : '-'}</td>
              <td class="num">${formatNum(totalTariffKwh, 'kWh', 2)}</td>
              <td class="num">${formatNum(totalTariffCost, 'บาท', 2)}</td>
            </tr>
          </tbody>
        </table>
      `
          : ''
      }
    </div>
  </div>

  <!-- Section 4: Roof Structure -->
  <div class="sec">
    <div class="sec-head">
      <span>4. โครงสร้างหลังคาและพื้นที่ติดตั้ง (Roof Structure)</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow('ประเภทหลังคาและอายุ', roofDisplay)}
        ${kvRow('อายุหลังคาโดยรวม', formatNum(struct.roofAgeYear, 'ปี'), 'ขนาดพื้นที่หลังคา (W×L)', esc(struct.roofDimWxlM || '-'))}
        ${kvRow('ความสูงอาคาร', formatNum(struct.buildingHeightM, 'เมตร'), 'รูปแบบหลังคา (Pattern)', esc(struct.roofPattern ? (ROOF_PATTERN_LABELS[struct.roofPattern] || struct.roofPattern) : '-'))}
        ${kvRow('ลอน Metal Sheet', esc(struct.metalSheetType || '-'), 'ความชันหลังคา (Slope)', formatNum(struct.roofSlopeDeg, '°'))}
        ${kvRow('Azimuth / Tilt (Solar)', `${formatNum(struct.azimuthDeg, '°')} / ${formatNum(struct.tiltDeg, '°')}`, 'ระยะแป ถึง แป (Purlin)', formatNum(struct.purlinToPurlinM, 'ม.'))}
        ${kvRow('ระยะจันทัน ถึง จันทัน', formatNum(struct.rafterToRafterM, 'ม.'), 'ระยะเสา ถึง เสา (Column)', formatNum(struct.columnToColumnM, 'ม.'))}
        ${kvRow('ระยะช่องแสง (Skylight)', formatNum(struct.skylightToSkylightM, 'ม.'), 'ระยะ Jack Roof (W×L)', esc(struct.jackRoofDimM || '-'))}
        ${kvRow('ระยะลูกหมุน (Ventilation)', esc(struct.ventilationDimM || '-'), 'ระบบป้องกันฟ้าผ่า', formatNum(struct.lightningProtectionM, 'ม.'))}
        ${kvRow('บันไดลิง / ทางขึ้นหลังคา', formatNum(struct.serviceLadderM, 'ม.'), 'หมายเหตุโครงสร้าง', escMultiline(struct.otherNotes || '-'))}
      </table>
    </div>
  </div>

  <!-- Section 5: Q&A -->
  <div class="sec">
    <div class="sec-head">
      <span>5. ข้อมูลวิศวกรรมและความต้องการเพิ่มเติม (Technical Q&A)</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow('การใช้ไฟกลางวัน/กลางคืน', `${esc(qa.dayNightUsage || '-')} ${qa.dayNightUsageDetail ? `(${esc(qa.dayNightUsageDetail)})` : ''}`)}
        ${kvRow('โหลดช่วงกลางวัน (Day Load)', esc(qa.dayLoad || '-'), 'โหลดช่วงกลางคืน (Night Load)', esc(qa.nightLoad || '-'))}
        ${kvRow('โหลดที่ต้องการสำรองไฟ', `${esc(qa.backupLoad || '-')} ${qa.backupLoadDetail ? `(${esc(qa.backupLoadDetail)})` : ''}`, 'โหมดการชาร์จแบตเตอรี่', `${esc(qa.batteryChargeMode || '-')} ${qa.batteryChargeDetail ? `(${esc(qa.batteryChargeDetail)})` : ''}`)}
        ${kvRow('ชาร์จจาก Grid กลางคืน', `${yesNoLabel(qa.gridChargeAtNight)} ${qa.gridChargeAtNightDetail ? `(${esc(qa.gridChargeAtNightDetail)})` : ''}`, 'Inverter สำรองไฟเมื่อไฟดับ', `${yesNoLabel(qa.inverterBackupOnOutage)} ${qa.inverterBackupOnOutageDetail ? `(${esc(qa.inverterBackupOnOutageDetail)})` : ''}`)}
        ${kvRow('ปัญหาคุณภาพไฟฟ้า', `${yesNoLabel(qa.powerQualityIssue)} ${qa.powerQualityIssueDetail ? `(${esc(qa.powerQualityIssueDetail)})` : ''}`, 'จุดประสงค์ในการติดตั้งโซลาร์', esc((qa.solarReasons || []).join(', ') || '-'))}
        ${kvRow('รายละเอียดเพิ่มเติม (Q&A)', escMultiline(qa.solarReasonsDetail || '-'))}
      </table>
    </div>
  </div>

  <!-- Section 6: Checklist, Documents, Bill, Remark -->
  <div class="sec allow-break">
    <div class="sec-head">
      <span>6. รายการเอกสารที่เตรียม, บิลค่าไฟ และหมายเหตุเพิ่มเติม (Checklist & Documents)</span>
    </div>
    <div class="sec-body">
      <table class="grid">
        <thead>
          <tr>
            <th style="width: 28px; text-align: center;">มี</th>
            <th>รายการข้อมูลที่ต้องเตรียม (Required Checklist)</th>
            <th style="text-align: right;">รายละเอียด / ลิงก์เอกสารแนบ</th>
          </tr>
        </thead>
        <tbody>
          ${checklistRowsHtml}
        </tbody>
      </table>

      <table class="kv" style="margin-top: 6px;">
        ${kvRow(
          'บิลค่าไฟฟ้า (Electricity Bill)',
          billUrl
            ? `${billCount ? `จำนวน ${billCount} เดือน — ` : ''}<a class="doc-link" href="${esc(billUrl)}" target="_blank">เปิดดูไฟล์บิลค่าไฟ</a>${billNote ? ` (${esc(billNote)})` : ''}`
            : '<span class="muted">ยังไม่มีไฟล์บิลค่าไฟ</span>'
        )}
        ${kvRow('หมายเหตุเพิ่มเติม (Sales Remark)', escMultiline(s.additionalRemark || '-'))}
      </table>

      ${
        documents.length > 0
          ? `
        <table class="grid" style="margin-top: 6px;">
          <thead>
            <tr>
              <th>ประเภทเอกสารเพิ่มเติม</th>
              <th style="width: 18%;">ผู้จัดเตรียม</th>
              <th style="width: 32%;">หมายเหตุ</th>
              <th style="width: 24%;">ไฟล์แนบ</th>
            </tr>
          </thead>
          <tbody>
            ${documents
              .map(
                (d: any) => `
              <tr>
                <td>${esc(d.documentType || '-')}</td>
                <td>${d.customerProvided ? 'ลูกค้าเตรียมให้' : 'ทีมงานจัดเตรียม'}</td>
                <td>${escMultiline(d.note || '-')}</td>
                <td>${d.fileUrl ? `<a class="doc-link" href="${esc(d.fileUrl)}" target="_blank">เปิดไฟล์แนบ</a>` : '<span class="muted">-</span>'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
          : ''
      }
    </div>
  </div>

  <!-- Section 7: Project Estimation Result -->
  <div class="est-box">
    <div class="est-head">
      <span>7. สรุปผลการตรวจสอบและประเมินราคา (Project & Engineering Estimation)</span>
      <span class="est-badge">${esc(estMeta.label)}</span>
    </div>
    <div class="sec-body">
      <table class="kv">
        ${kvRow(
          'ราคาประเมินเบื้องต้น',
          s.estimatedPrice !== null && s.estimatedPrice !== undefined
            ? `<strong style="color:#dc2626; font-size: 13.5px;">฿${formatNum(s.estimatedPrice, 'บาท')}</strong>`
            : '-',
          'สถานะการประเมิน',
          esc(estMeta.label)
        )}
        ${kvRow('ผู้ประเมิน (ทีมโปรเจค)', esc(s.estimatedByUser?.fullName || '-'), 'วันที่ประเมินราคา', esc(formatThaiDate(s.estimatedAt, true)))}
        ${kvRow('รายละเอียด / ข้อเสนอแนะจากทีมโปรเจค', escMultiline(s.estimationNote || '-'))}
      </table>
    </div>
  </div>

  <!-- Section 8: Site Photos & Attached Images -->
  ${
    visualAttachments.length > 0
      ? `
    <div class="sec allow-break">
      <div class="keep-together">
        <div class="sec-head">
          <span>8. รูปถ่ายหน้างานและรูปเอกสารแนบทั้งหมด (Site Photos &amp; Attached Images - ${visualAttachments.length} ภาพ)</span>
        </div>
        ${
          photoPairs.length > 0
            ? `<div class="photo-row">
                ${photoPairs[0]
                  .map(
                    (att, idx) => `
                  <div class="photo-card">
                    <img src="${esc(resolveImgSrc(att.fileUrl))}" alt="${esc(att.title)}" />
                    <span class="photo-badge ${esc(att.category)}">${esc(att.categoryLabel)}</span>
                    <div class="photo-cap">${idx + 1}. ${esc(att.title)}</div>
                    ${att.subtitle ? `<div class="photo-desc">${esc(att.subtitle)}</div>` : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>
      ${photoPairs
        .slice(1)
        .map(
          (pair, pIdx) => `
        <div class="photo-row">
          ${pair
            .map(
              (att, idx) => `
            <div class="photo-card">
              <img src="${esc(resolveImgSrc(att.fileUrl))}" alt="${esc(att.title)}" />
              <span class="photo-badge ${esc(att.category)}">${esc(att.categoryLabel)}</span>
              <div class="photo-cap">${(pIdx + 1) * 2 + idx + 1}. ${esc(att.title)}</div>
              ${att.subtitle ? `<div class="photo-desc">${esc(att.subtitle)}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
        )
        .join('')}
    </div>
  `
      : ''
  }

  <!-- Section 9: Non-image Attached Files & Data Previews -->
  ${
    resolvedFiles.length > 0
      ? `
    <div class="sec allow-break">
      <div class="sec-head">
        <span>9. ไฟล์เอกสารแนบประกอบและตัวอย่างข้อมูล (Attached Files &amp; Data Preview - ${resolvedFiles.length} ไฟล์)</span>
      </div>
      <div class="sec-body">
        <table class="grid">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">#</th>
              <th style="width: 18%;">หมวดหมู่</th>
              <th>ชื่อเอกสาร / ชื่อไฟล์</th>
              <th style="width: 13%; text-align: center;">ชนิดไฟล์</th>
              <th style="width: 28%;">การแสดงผลใน PDF</th>
            </tr>
          </thead>
          <tbody>
            ${resolvedFiles
              .map((f, idx) => {
                const sizeTxt = f.byteSize ? ` (${formatBytesCompact(f.byteSize)})` : '';
                const extLabel = f.ext ? f.ext.toUpperCase() : f.kind.toUpperCase();
                let statusDesc = 'แนบลิงก์เปิดไฟล์ต้นฉบับ';
                if (f.fetchError) {
                  statusDesc = `${esc(f.fetchError)}`;
                } else if (f.kind === 'pdf') {
                  statusDesc = `รวมหน้า PDF ต่อท้ายรายงาน${f.pdfPageCount ? ` (${f.pdfPageCount} หน้า)` : ''}${f.embeddedInPdf ? ' + ฝังไฟล์' : ''}`;
                } else if (f.kind === 'spreadsheet') {
                  statusDesc = `${f.sheets && f.sheets.length > 0 ? 'แสดงตารางข้อมูลด้านล่าง' : 'แนบไฟล์ตาราง'}${f.embeddedInPdf ? ' + ฝังไฟล์ต้นฉบับ' : ''}`;
                } else if (f.kind === 'text') {
                  statusDesc = `${f.textPreview ? 'แสดงข้อความด้านล่าง' : 'แนบไฟล์ข้อความ'}${f.embeddedInPdf ? ' + ฝังไฟล์ต้นฉบับ' : ''}`;
                } else if (f.embeddedInPdf) {
                  statusDesc = 'ฝังไฟล์ต้นฉบับใน PDF Attachments + คลิกเปิดลิงก์';
                }
                return `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${esc(f.categoryLabel)}</td>
                <td>
                  <div style="font-weight: 700; color: #111827;">${esc(f.title)}</div>
                  <div style="font-size: 10.5px; color: #4b5563;">
                    <a class="doc-link" href="${esc(f.fileUrl)}" target="_blank">${esc(f.fileName)}</a>${esc(sizeTxt)}
                  </div>
                  ${f.subtitle ? `<div style="font-size: 10px; color: #6b7280;">${esc(f.subtitle)}</div>` : ''}
                </td>
                <td style="text-align: center;">
                  <span class="file-kind-pill ${esc(f.kind)}">${esc(extLabel)}</span>
                </td>
                <td style="font-size: 10.5px; color: #374151;">${statusDesc}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>

        ${resolvedFiles
          .filter((f) => (f.sheets && f.sheets.length > 0) || f.textPreview)
          .map(
            (f) => `
          <div style="margin-top: 10px;">
            ${(f.sheets || [])
              .map(
                (sh) => `
              <div class="sheet-block">
                <div class="sheet-title">
                  <span>${esc(f.title)} &mdash; ชีต: ${esc(sh.sheetName)} (${esc(f.fileName)})</span>
                  <span style="font-weight: 400; color: #6b7280;">รวม ${sh.totalRows} แถว &times; ${sh.totalCols} คอลัมน์</span>
                </div>
                <table class="sheet-table">
                  ${
                    sh.headers.length > 0
                      ? `<thead><tr>${sh.headers.map((h) => `<th>${esc(h || '-')}</th>`).join('')}</tr></thead>`
                      : ''
                  }
                  <tbody>
                    ${sh.rows
                      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
                      .join('')}
                  </tbody>
                </table>
                ${
                  sh.truncatedRows || sh.truncatedCols
                    ? `<div class="sheet-note">แสดงตัวอย่างข้อมูล ${sh.rows.length} แถว จากทั้งหมด ${sh.totalRows} แถว${sh.truncatedCols ? ` (${sh.headers.length}/${sh.totalCols} คอลัมน์)` : ''} &mdash; สามารถเปิดไฟล์ต้นฉบับจากลิงก์ด้านบนหรือ PDF Attachments</div>`
                    : ''
                }
              </div>
            `
              )
              .join('')}
            ${
              f.textPreview
                ? `
              <div class="sheet-block">
                <div class="sheet-title">
                  <span>ตัวอย่างข้อความ: ${esc(f.title)} (${esc(f.fileName)})</span>
                  ${f.textTruncated ? `<span style="font-weight: 400; color: #6b7280;">แสดงบางส่วน</span>` : ''}
                </div>
                <div class="text-preview-box">${esc(f.textPreview)}</div>
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
      : ''
  }

  <!-- Sign-off Blocks -->
  <div class="sign-grid">
    <div class="sign-box">
      <div style="font-weight: 700;">ผู้บันทึกสำรวจ / พนักงานขาย (Sales / Surveyor)</div>
      ${
        resolveImgSrc(s.salesSignatureUrl)
          ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImgSrc(s.salesSignatureUrl))}" alt="ลายเซ็นพนักงานขาย" /></div><div class="sign-line"></div>`
          : `<div class="sign-line empty"></div>`
      }
      <div>(${esc(s.surveyorName || s.salesperson?.fullName || '................................................')})</div>
      <div class="muted" style="font-size: 11px; margin-top: 2px;">วันที่: ${esc(formatThaiDate(s.salesSignedAt || s.surveyDate))}</div>
    </div>
    <div class="sign-box">
      <div style="font-weight: 700;">ฝ่ายวิศวกรรม / โปรเจค (Project & Engineering)</div>
      ${
        resolveImgSrc(s.projectSignatureUrl)
          ? `<div class="sign-img-wrap"><img class="sign-img" src="${esc(resolveImgSrc(s.projectSignatureUrl))}" alt="ลายเซ็นทีมโปรเจค" /></div><div class="sign-line"></div>`
          : `<div class="sign-line empty"></div>`
      }
      <div>(${esc(s.estimatedByUser?.fullName || (s.projectSignatureUrl ? 'ทีมวิศวกรรม / โปรเจค' : '................................................'))})</div>
      <div class="muted" style="font-size: 11px; margin-top: 2px;">วันที่: ${esc(formatThaiDate(s.projectSignedAt || s.estimatedAt))}</div>
    </div>
  </div>

  <div class="doc-footer">
    <span>เอกสารสร้างจากระบบ TERA Sales CRM &mdash; แบบสำรวจไซต์งาน ${esc(s.surveyNumber || '')} (v.${s.version || 1})</span>
    <span>พิมพ์เมื่อ: ${esc(printDateStr)}</span>
  </div>
</body>
</html>`;
}
