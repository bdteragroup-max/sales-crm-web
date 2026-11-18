export const SURVEY_COMPANY_CODES = ['TP', 'TG', 'TE'] as const;
export type SurveyCompanyCode = (typeof SURVEY_COMPANY_CODES)[number];

export interface SurveyCompanyMeta {
  code: SurveyCompanyCode;
  shortName: string;
  thName: string;
  enName: string;
  address: string;
  phone: string;
  taxId: string;
  logoFile: string;
  logoUrl: string;
  badgeClass: string;
}

export const SURVEY_COMPANY_OPTIONS: SurveyCompanyMeta[] = [
  {
    code: 'TP',
    shortName: 'เทอรา พาวเวอร์',
    thName: 'บริษัท เทอรา พาวเวอร์ จำกัด',
    enName: 'TERA Power Co., Ltd.',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
    phone: '+66(0) 2328-0801-3',
    taxId: '0105564011223',
    logoFile: '7.png',
    logoUrl: '/7.png',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    code: 'TG',
    shortName: 'เทอรา กรุ้ป',
    thName: 'บริษัท เทอรา กรุ้ป จำกัด',
    enName: 'TERA Group Co., Ltd.',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
    phone: '+66(0) 2328-0801-3',
    taxId: '0105552112716',
    logoFile: '4.png',
    logoUrl: '/4.png',
    badgeClass: 'bg-red-50 text-[#ff2301] border-red-200',
  },
  {
    code: 'TE',
    shortName: 'เทอรา อิเล็กทริค',
    thName: 'บริษัท เทอรา อิเล็กทริค จำกัด',
    enName: 'TERA Electric Co., Ltd.',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
    phone: '+66(0) 2328-0801-3',
    taxId: '0105557159958',
    logoFile: '6.png',
    logoUrl: '/6.png',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
];

export function normalizeSurveyCompanyCode(code?: string | null): SurveyCompanyCode {
  const upper = (code || '').trim().toUpperCase();
  if (upper === 'TP' || upper === 'TG' || upper === 'TE') return upper;
  return 'TE';
}

export function getSurveyCompanyMeta(code?: string | null): SurveyCompanyMeta {
  const normalized = normalizeSurveyCompanyCode(code);
  return SURVEY_COMPANY_OPTIONS.find((item) => item.code === normalized) || SURVEY_COMPANY_OPTIONS[2];
}

export const SURVEY_SECTIONS = [
  { id: 'project', number: 1, shortTitle: 'โครงการ & ลูกค้า', label: '1. โครงการและผู้ติดต่อ' },
  { id: 'behavior', number: 2, shortTitle: 'พฤติกรรมใช้ไฟ', label: '2. พฤติกรรมการใช้ไฟ' },
  { id: 'electrical', number: 3, shortTitle: 'ระบบไฟฟ้า', label: '3. ระบบไฟฟ้าและหม้อแปลง' },
  { id: 'tariff', number: 4, shortTitle: 'อัตราค่าไฟ', label: '4. อัตราค่าไฟ (TOU/TOD)' },
  { id: 'structure', number: 5, shortTitle: 'โครงสร้างหลังคา', label: '5. โครงสร้างหลังคา' },
  { id: 'qa', number: 6, shortTitle: 'คำถาม Q&A', label: '6. คำถามเพิ่มเติม (Q&A)' },
  { id: 'media', number: 7, shortTitle: 'เอกสาร & รูปถ่าย', label: '7. Checklist บิลและรูปถ่าย' },
] as const;

export type SurveySectionId = (typeof SURVEY_SECTIONS)[number]['id'];

export const SURVEY_STATUS_OPTIONS = [
  {
    value: 'Draft',
    label: 'ฉบับร่าง (Draft)',
    shortLabel: 'ฉบับร่าง',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    pdfBg: '#f3f4f6',
    pdfColor: '#374151',
    description: 'เซลส์กำลังกรอกข้อมูลเบื้องต้น',
  },
  {
    value: 'In Progress',
    label: 'กำลังสำรวจ (In Progress)',
    shortLabel: 'กำลังสำรวจ',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    pdfBg: '#e0f2fe',
    pdfColor: '#0369a1',
    description: 'อยู่ระหว่างลงพื้นที่เก็บข้อมูลเพิ่มเติม',
  },
  {
    value: 'Pending Estimate',
    label: 'รอโปรเจคประเมิน (Pending Estimate)',
    shortLabel: 'รอโปรเจคประเมิน',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    pdfBg: '#fef3c7',
    pdfColor: '#92400e',
    description: 'ส่งข้อมูลให้ทีมโปรเจคตรวจสอบและประเมินราคาแล้ว',
  },
  {
    value: 'Need Info',
    label: 'ขอข้อมูลเพิ่มเติม (Need Info)',
    shortLabel: 'ขอข้อมูลเพิ่ม',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    pdfBg: '#ffedd5',
    pdfColor: '#9a3412',
    description: 'ทีมโปรเจคต้องการข้อมูล/ภาพถ่ายเพิ่มเติมจากเซลส์',
  },
  {
    value: 'Estimated',
    label: 'ประเมินราคาแล้ว (Estimated)',
    shortLabel: 'ประเมินราคาแล้ว',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pdfBg: '#d1fae5',
    pdfColor: '#065f46',
    description: 'ทีมโปรเจคคำนวณราคาเบื้องต้นและส่งกลับให้เซลส์แล้ว',
  },
  {
    value: 'Completed',
    label: 'เสร็จสมบูรณ์ (Completed)',
    shortLabel: 'เสร็จสมบูรณ์',
    badgeClass: 'bg-green-100 text-green-800 border-green-300',
    pdfBg: '#dcfce7',
    pdfColor: '#166534',
    description: 'ข้อมูลครบถ้วน พร้อมนำไปจัดทำใบเสนอราคา',
  },
] as const;

export const ESTIMATION_STATUS_OPTIONS = [
  {
    value: 'Pending',
    label: 'รอทีมโปรเจคประเมิน',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    pdfBg: '#fef3c7',
    pdfColor: '#92400e',
  },
  {
    value: 'Draft',
    label: 'กำลังคำนวณราคา (ร่าง)',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    pdfBg: '#f3f4f6',
    pdfColor: '#374151',
  },
  {
    value: 'Need Info',
    label: 'ขอข้อมูลหน้างานเพิ่มเติม',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    pdfBg: '#ffedd5',
    pdfColor: '#9a3412',
  },
  {
    value: 'Estimated',
    label: 'ประเมินราคาแล้ว',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pdfBg: '#d1fae5',
    pdfColor: '#065f46',
  },
] as const;

export const TARIFF_OPTIONS = [
  {
    group: 'ประเภทที่ 1 บ้านอยู่อาศัย และ ประเภทที่ 2 กิจการขนาดเล็ก',
    subgroups: [
      {
        subgroup: 'อัตราปกติ (TOD)',
        options: [
          {
            id: '1.2.1_2.1.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 1.2.1 และ 2.1.2 (ต่ำกว่า 12 kV)',
            tiers: [
              { name: 'หน่วยที่ 1 - 150', rate: 3.2484 },
              { name: 'หน่วยที่ 151 - 400', rate: 4.2218 },
              { name: 'หน่วยที่ 400 ขึ้นไป', rate: 4.4217 },
            ],
          },
          {
            id: '2.1.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 2.1.1 : 12 - 24 kV',
            tiers: [{ name: 'อัตราปกติ', rate: 3.9086 }],
          },
        ],
      },
      {
        subgroup: 'อัตราตามช่วงเวลาของการใช้ (TOU)',
        options: [
          {
            id: '1.2.1_2.2.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 1.2.1 และ 2.2.1 : 12 - 24 kV',
            tiers: [
              { name: 'On - Peak', rate: 5.1135 },
              { name: 'Off - Peak', rate: 2.6037 },
            ],
          },
          {
            id: '1.2.2_2.2.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 1.2.2 และ 2.2.2 : ต่ำกว่า 12 kV',
            tiers: [
              { name: 'On - Peak', rate: 5.7982 },
              { name: 'Off - Peak', rate: 2.6369 },
            ],
          },
        ],
      },
    ],
  },
  {
    group: 'ประเภทที่ 3 กิจการขนาดกลาง และ ประเภทที่ 4 กิจการขนาดใหญ่',
    subgroups: [
      {
        subgroup: 'อัตราปกติ (TOD)',
        options: [
          {
            id: '3.1.1_4.1.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.1.1 และ 4.1.1 : 69 kV ขึ้นไป',
            tiers: [{ name: 'อัตราปกติ', rate: 3.1097 }],
          },
          {
            id: '3.1.2_4.1.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.1.2 และ 4.1.2 : 12 - 24 kV',
            tiers: [{ name: 'อัตราปกติ', rate: 3.1471 }],
          },
          {
            id: '3.1.3_4.1.3',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.1.3 และ 4.1.3 : ต่ำกว่า 12 kV',
            tiers: [{ name: 'อัตราปกติ', rate: 3.1751 }],
          },
        ],
      },
      {
        subgroup: 'อัตราตามช่วงเวลาของการใช้ (TOU)',
        options: [
          {
            id: '3.2.1_4.2.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.2.1 และ 4.2.1 : 69 kV ขึ้นไป',
            tiers: [
              { name: 'On - Peak', rate: 4.1025 },
              { name: 'Off - Peak', rate: 2.5849 },
            ],
          },
          {
            id: '3.2.2_4.2.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.2.2 และ 4.2.2 : 12 - 24 kV',
            tiers: [
              { name: 'On - Peak', rate: 4.1839 },
              { name: 'Off - Peak', rate: 2.6037 },
            ],
          },
          {
            id: '3.2.3_4.2.3',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.2.3 และ 4.2.3 : ต่ำกว่า 12 kV',
            tiers: [
              { name: 'On - Peak', rate: 4.3297 },
              { name: 'Off - Peak', rate: 2.6369 },
            ],
          },
        ],
      },
    ],
  },
];

export const ROOF_TYPES = [
  'กระเบื้องลอนคู่',
  'กระเบื้องเซรามิคแบบลอนต่ำ',
  'กระเบื้องหลังคาเซรามิคแบบเรียบ',
  'สแลปคอนกรีต',
  'เมทัลชีท',
] as const;

export const ROOF_PATTERN_LABELS: Record<string, string> = {
  Gable: 'ทรงจั่ว (Gable)',
  Hip: 'ทรงปั้นหยา (Hip)',
  Shed: 'เพิงหมาแหงน (Shed)',
  Flat: 'ดาดฟ้า (Flat)',
  'Mono-pitch': 'จั่วพิง (Mono-pitch)',
  'Lean-to': 'เพิงข้าง (Lean-to)',
  Gambrel: 'ทรงจั่วหักมุม (Gambrel)',
  Mansard: 'ทรงปั้นหยาหักมุม (Mansard)',
  Butterfly: 'ทรงผีเสื้อ (Butterfly)',
  'Dutch Gable': 'จั่วผสมปั้นหยา (Dutch Gable)',
  'A-Frame': 'ทรงเอเฟรม (A-Frame)',
  Curved: 'ทรงโค้ง (Curved)',
};

export const SOLAR_REASONS = [
  'ลดค่าไฟ (Reduce Bill)',
  'สำรองไฟ (Backup Power)',
  'ขายไฟ (Sell to Grid)',
  'เพื่อสิ่งแวดล้อม (Environmental)',
] as const;

export const REQUIRED_CHECKLIST_ITEMS = [
  {
    value: 'Load Profile',
    label: 'Load Profile (กราฟ/ไฟล์ข้อมูลการใช้ไฟ)',
    fileField: 'loadProfileFileUrl',
  },
  {
    value: 'AMR',
    label: 'AMR (Customer Code / Username & Password)',
    isAmr: true,
  },
  {
    value: 'ละติจูด (Latitude), ลองจิจูด (Longitude)',
    label: 'พิกัดหน้างาน (Latitude / Longitude)',
    showLatLng: true,
  },
  {
    value: 'แบบโครงสร้างหลังคา',
    label: 'แบบโครงสร้างหลังคา (Roof Structure Drawing)',
    fileField: 'roofStructureFileUrl',
  },
  {
    value: 'แบบอาคาร',
    label: 'แบบอาคาร (Building Plan)',
    fileField: 'buildingPlanFileUrl',
  },
  {
    value: 'แบบไฟฟ้าอาคาร',
    label: 'แบบไฟฟ้าอาคาร (Building Electrical Plan)',
    fileField: 'buildingElectricalFileUrl',
  },
  {
    value: 'แบบตู้ไฟฟ้า',
    label: 'แบบตู้ไฟฟ้า (MDB / Electrical Cabinet)',
    fileField: 'electricalCabinetFileUrl',
  },
] as const;

export const SURVEY_PHOTO_PRESETS = [
  'ภาพมุมกว้างหน้างาน / หลังคา',
  'โครงสร้างหลังคา / แป / จันทัน',
  'ตู้เมนไฟฟ้า (MDB)',
  'หม้อแปลงไฟฟ้า',
  'มิเตอร์ไฟฟ้า',
  'พื้นที่ติดตั้ง Inverter',
  'แนวเดินสายไฟ / ร้อยท่อ',
  'อื่นๆ',
];

export const SURVEY_DOC_PRESETS = [
  'Single Line Diagram (SLD)',
  'Load Profile / AMR Excel',
  'แบบแปลนอาคาร / หลังคา',
  'สำเนาบิลค่าไฟย้อนหลัง',
  'เอกสารขออนุญาตขนานไฟ',
  'อื่นๆ',
];

export function isSurveyProjectRole(role?: string | null): boolean {
  const r = (role || '').trim().toLowerCase();
  return r.includes('project') || r.includes('engineering');
}

export function canEstimateSurveyRole(role?: string | null): boolean {
  const r = (role || '').trim().toLowerCase();
  return (
    isSurveyProjectRole(role) ||
    r === 'super_admin' ||
    r.includes('ผู้บริหาร')
  );
}

export function canEditSalesSurveyRole(role?: string | null): boolean {
  const r = (role || '').trim().toLowerCase();
  if (isSurveyProjectRole(role) && r !== 'super_admin' && !r.includes('ผู้บริหาร')) {
    return false;
  }
  return true;
}

export function getSurveyStatusMeta(status?: string | null) {
  return (
    SURVEY_STATUS_OPTIONS.find((s) => s.value === status) || {
      value: status || 'Draft',
      label: status || 'Draft',
      shortLabel: status || 'Draft',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      pdfBg: '#f3f4f6',
      pdfColor: '#374151',
      description: '',
    }
  );
}

export function getEstimationStatusMeta(estimationStatus?: string | null) {
  const norm = estimationStatus || 'Pending';
  return (
    ESTIMATION_STATUS_OPTIONS.find((s) => s.value.toLowerCase() === norm.toLowerCase()) || {
      value: norm,
      label: norm,
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      pdfBg: '#f3f4f6',
      pdfColor: '#374151',
    }
  );
}

export function parseNullableFloat(raw: string): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseNullableInt(raw: string): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function formatThaiDate(dateInput?: string | Date | null, withTime = false): string {
  if (!dateInput) return '-';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  if (withTime) {
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatNum(val?: number | null, suffix = '', digits = 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '-';
  const formatted = Number.isInteger(val)
    ? val.toLocaleString('en-US')
    : val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function getElectricityBillUrl(bill: any): string {
  if (!bill) return '';
  if (typeof bill === 'string') return bill;
  return bill.fileUrl || '';
}

export function isImageAttachmentUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean) return false;
  if (/^data:image\//i.test(clean)) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic)(\?|#|$)/i.test(clean);
}

export function isPdfAttachmentUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean) return false;
  if (/^data:application\/pdf/i.test(clean)) return true;
  return /\.pdf(\?|#|$)/i.test(clean);
}

export function isSpreadsheetAttachmentUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean) return false;
  if (/^data:(text\/csv|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml)/i.test(clean)) {
    return true;
  }
  return /\.(xlsx|xls|xlsm|csv|ods)(\?|#|$)/i.test(clean);
}

export function isTextAttachmentUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean) return false;
  if (/^data:text\/plain/i.test(clean)) return true;
  return /\.(txt|json|log|md)(\?|#|$)/i.test(clean);
}

export function extractAttachmentFilename(url?: string | null, fallback = 'attachment'): string {
  const clean = (url || '').trim();
  if (!clean || clean.startsWith('data:')) return fallback;
  try {
    const withoutHash = clean.split('#')[0].split('?')[0];
    const lastSeg = withoutHash.split('/').filter(Boolean).pop() || '';
    const decoded = decodeURIComponent(lastSeg);
    // Strip /api/upload prefix "<epoch>-<rand>-" if present
    const stripped = decoded.replace(/^\d{10,}-\d+-/, '');
    if (stripped && stripped.replace(/[_.-]/g, '').length > 0) {
      return stripped;
    }
  } catch {
    // ignore URL decode issues
  }
  return fallback;
}

export function extractAttachmentExt(url?: string | null, mime?: string | null): string {
  const name = extractAttachmentFilename(url, '');
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx >= 0 && dotIdx < name.length - 1) {
    return name.slice(dotIdx + 1).toLowerCase();
  }
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf')) return 'pdf';
  if (m.includes('csv')) return 'csv';
  if (m.includes('spreadsheetml')) return 'xlsx';
  if (m.includes('ms-excel')) return 'xls';
  if (m.includes('wordprocessingml')) return 'docx';
  if (m.includes('msword')) return 'doc';
  if (m.includes('text/plain')) return 'txt';
  if (m.includes('json')) return 'json';
  return '';
}

export type SurveyVisualAttachment = {
  category: 'bill' | 'checklist' | 'document' | 'photo';
  categoryLabel: string;
  title: string;
  subtitle?: string;
  fileUrl: string;
};

export type SurveyPdfAttachment = {
  title: string;
  fileUrl: string;
};

export type SurveyFileKind = 'pdf' | 'spreadsheet' | 'text' | 'other';

export type SurveyFileAttachment = {
  kind: SurveyFileKind;
  category: 'bill' | 'checklist' | 'document';
  categoryLabel: string;
  title: string;
  subtitle?: string;
  fileUrl: string;
  fileName: string;
  ext: string;
};

export type SurveySpreadsheetSheetPreview = {
  sheetName: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalCols: number;
  truncatedRows: boolean;
  truncatedCols: boolean;
};

export type SurveyFilePreview = SurveyFileAttachment & {
  byteSize?: number | null;
  pdfPageCount?: number | null;
  pdfMerged?: boolean;
  embeddedInPdf?: boolean;
  sheets?: SurveySpreadsheetSheetPreview[];
  textPreview?: string | null;
  textTruncated?: boolean;
  fetchError?: string | null;
};

export function formatBytesCompact(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function collectSurveyAttachments(
  survey: any,
  mimeTypesByUrl: Record<string, string> = {}
): {
  visualAttachments: SurveyVisualAttachment[];
  pdfAttachments: SurveyPdfAttachment[];
  fileAttachments: SurveyFileAttachment[];
} {
  const visualAttachments: SurveyVisualAttachment[] = [];
  const pdfAttachments: SurveyPdfAttachment[] = [];
  const fileAttachments: SurveyFileAttachment[] = [];
  const seenVisualUrls = new Set<string>();
  const seenFileUrls = new Set<string>();

  const classifyAndAdd = (
    fileUrl: string | null | undefined,
    meta: Omit<SurveyVisualAttachment, 'fileUrl'>,
    forceVisual = false
  ) => {
    const clean = (fileUrl || '').trim();
    if (!clean) return;
    const mime = (mimeTypesByUrl[clean] || '').toLowerCase();

    if (forceVisual || isImageAttachmentUrl(clean) || mime.startsWith('image/')) {
      if (!seenVisualUrls.has(clean)) {
        seenVisualUrls.add(clean);
        visualAttachments.push({ ...meta, fileUrl: clean });
      }
      return;
    }

    if (seenFileUrls.has(clean)) return;
    seenFileUrls.add(clean);

    const fileCategory: 'bill' | 'checklist' | 'document' =
      meta.category === 'photo' ? 'document' : meta.category;
    const ext = extractAttachmentExt(clean, mime);
    const fileName = extractAttachmentFilename(clean, ext ? `${meta.title}.${ext}` : meta.title);

    let kind: SurveyFileKind = 'other';
    if (isPdfAttachmentUrl(clean) || mime.includes('pdf')) {
      kind = 'pdf';
      pdfAttachments.push({ title: meta.title, fileUrl: clean });
    } else if (
      isSpreadsheetAttachmentUrl(clean) ||
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('csv')
    ) {
      kind = 'spreadsheet';
    } else if (isTextAttachmentUrl(clean) || mime.startsWith('text/plain') || mime.includes('application/json')) {
      kind = 'text';
    }

    fileAttachments.push({
      kind,
      category: fileCategory,
      categoryLabel: meta.categoryLabel,
      title: meta.title,
      subtitle: meta.subtitle,
      fileUrl: clean,
      fileName,
      ext: ext || (kind === 'pdf' ? 'pdf' : ''),
    });
  };

  // 1. Site Photos (always treated as visual images)
  const photos: any[] = Array.isArray(survey?.photos) ? survey.photos : [];
  photos.forEach((p: any, idx: number) => {
    classifyAndAdd(
      p?.fileUrl,
      {
        category: 'photo',
        categoryLabel: 'รูปถ่ายหน้างาน',
        title: (p?.photoType || '').trim() || `รูปถ่ายหน้างาน #${idx + 1}`,
        subtitle: p?.photoDesc || '',
      },
      true
    );
  });

  // 2. Electricity Bill
  const billUrl = getElectricityBillUrl(survey?.electricityBill);
  if (billUrl) {
    const billCount =
      typeof survey?.electricityBill === 'object' ? survey.electricityBill?.billCount : null;
    const billNote =
      typeof survey?.electricityBill === 'object' ? survey.electricityBill?.note : null;
    const subParts: string[] = [];
    if (billCount) subParts.push(`จำนวน ${billCount} เดือน`);
    if (billNote) subParts.push(billNote);
    classifyAndAdd(billUrl, {
      category: 'bill',
      categoryLabel: 'บิลค่าไฟฟ้า',
      title: 'บิลค่าไฟฟ้า (Electricity Bill)',
      subtitle: subParts.join(' • '),
    });
  }

  // 3. Checklist Attachments (Load Profile, Roof Structure, Building Plan, Electrical Plan, Cabinet)
  REQUIRED_CHECKLIST_ITEMS.forEach((item) => {
    if ('fileField' in item && item.fileField) {
      const url = survey?.[item.fileField];
      if (url) {
        classifyAndAdd(url, {
          category: 'checklist',
          categoryLabel: 'เอกสาร Checklist',
          title: item.value,
          subtitle: item.label,
        });
      }
    }
  });

  // 4. Additional Documents
  const docs: any[] = Array.isArray(survey?.documents) ? survey.documents : [];
  docs.forEach((d: any, idx: number) => {
    if (d?.fileUrl) {
      const subParts: string[] = [];
      if (d.customerProvided) subParts.push('ลูกค้าเตรียมให้');
      if (d.note) subParts.push(d.note);
      classifyAndAdd(d.fileUrl, {
        category: 'document',
        categoryLabel: 'เอกสารแนบ',
        title: (d.documentType || '').trim() || `เอกสารประกอบ #${idx + 1}`,
        subtitle: subParts.join(' • '),
      });
    }
  });

  return { visualAttachments, pdfAttachments, fileAttachments };
}

export function computeSurveyCompleteness(survey: any) {
  const checks = [
    {
      id: 'project',
      label: '1. ข้อมูลโครงการ & ลูกค้า',
      done: Boolean((survey?.customerName || survey?.companyId) && survey?.projectLocation),
    },
    {
      id: 'behavior',
      label: '2. พฤติกรรมการใช้ไฟ',
      done: Boolean(
        survey?.usageBehavior?.workingHours ||
          survey?.usageBehavior?.avgBillThbPerMonth !== null && survey?.usageBehavior?.avgBillThbPerMonth !== undefined ||
          survey?.usageBehavior?.dayNightRatio
      ),
    },
    {
      id: 'electrical',
      label: '3. ระบบไฟฟ้า & หม้อแปลง',
      done: Boolean(
        survey?.electricalProfile?.gridProvider ||
          (survey?.electricalProfile?.voltageLevel && survey.electricalProfile.voltageLevel.length > 0) ||
          survey?.electricalProfile?.transformerKva
      ),
    },
    {
      id: 'tariff',
      label: '4. อัตราค่าไฟ',
      done: Boolean(survey?.tariffSelection?.tariffCategory),
    },
    {
      id: 'structure',
      label: '5. โครงสร้างหลังคา',
      done: Boolean(
        (survey?.structure?.roofType && survey.structure.roofType.length > 0) ||
          survey?.structure?.roofDimWxlM ||
          survey?.structure?.roofPattern
      ),
    },
    {
      id: 'qa',
      label: '6. คำถามหน้างาน Q&A',
      done: Boolean(
        (survey?.qa?.solarReasons && survey.qa.solarReasons.length > 0) ||
          survey?.qa?.dayNightUsage ||
          survey?.qa?.backupLoad
      ),
    },
    {
      id: 'media',
      label: '7. บิลค่าไฟ / รูปถ่าย / เอกสาร',
      done: Boolean(
        getElectricityBillUrl(survey?.electricityBill) ||
          (survey?.photos && survey.photos.some((p: any) => p.fileUrl)) ||
          (survey?.documents && survey.documents.some((d: any) => d.fileUrl)) ||
          (survey?.requiredInfoChecklist && survey.requiredInfoChecklist.length > 0)
      ),
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const percent = Math.round((completedCount / checks.length) * 100);
  const missing = checks.filter((c) => !c.done);

  return { checks, completedCount, total: checks.length, percent, missing };
}

export function isSurveyPendingForProject(
  status?: string | null,
  estimationStatus?: string | null
): boolean {
  return status === 'Pending Estimate' && estimationStatus !== 'Estimated';
}


