export interface SolarChecklistItemDef {
  key: string;
  label: string;
}

export interface SolarUserBasic {
  id?: string | null;
  fullName?: string | null;
}

export interface SolarProjectMemberRecord {
  role?: string | null;
  user?: SolarUserBasic | null;
}

export interface SolarProjectJobRecord {
  jobNumber?: string | null;
  quotationNumber?: string | null;
  companyCode?: string | null;
  sellerName?: string | null;
  item?: string | null;
}

export interface SolarProjectRecord {
  id: string;
  projectNumber?: string | null;
  name?: string | null;
  clientName?: string | null;
  projectCategory?: string | null;
  siteAddress?: string | null;
  jbNumber?: string | null;
  companyCode?: string | null;
  externalTechnicians?: string | null;
  siteCheckInTime?: string | Date | null;
  siteCheckOutTime?: string | Date | null;
  siteTeamMembers?: string | null;
  siteSupervisor?: string | null;
  preChecklist?: unknown;
  photoChecklist?: unknown;
  checklistImages?: unknown;
  isHighVoltage?: boolean | null;
  hvChecklist?: unknown;
  workSummary?: unknown;
  siteProblems?: unknown;
  remainingWork?: string | null;
  supervisorSignUrl?: string | null;
  customerSignUrl?: string | null;
  manager?: SolarUserBasic | null;
  members?: SolarProjectMemberRecord[];
  job?: SolarProjectJobRecord | null;
  _formattedTeamMembers?: string;
}

export interface SolarChecklistFormState {
  projectCategory?: string | null;
  siteCheckInTime: string;
  siteTeamMembers: string;
  siteSupervisor: string;
  preChecklist: Record<string, boolean>;
  photoChecklist: Record<string, boolean>;
  checklistImages: Record<string, string[]>;
  isHighVoltage: boolean;
  hvChecklist: Record<string, boolean>;
  siteCheckOutTime: string;
  workSummary: string[];
  siteProblems: string[];
  remainingWork: string;
  supervisorSignUrl: string | null;
  customerSignUrl: string | null;
}

export const PRE_WORK_CHECKLIST: SolarChecklistItemDef[] = [
  { key: 'verify_site', label: '1. ตรวจสอบพื้นที่ทำงานตรงตามแบบติดตั้ง' },
  { key: 'photos_before', label: '2. ถ่ายรูปสถานที่ก่อนทำการติดตั้ง' },
  { key: 'ppe_check', label: '3. ตรวจสอบชุดทำงาน PPE ครบถ้วน' },
  { key: 'toolbox_talk', label: '4. ประชุม Toolbox Talk ก่อนเริ่มงาน' },
  { key: 'tools_crane', label: '5. ตรวจสอบเครื่องมือ / รถเครน / นั่งร้าน' },
];

export const POST_INSTALL_PHOTOS: SolarChecklistItemDef[] = [
  { key: 'install_site', label: '1. รูปสถานที่ติดตั้ง' },
  { key: 'pv_panel', label: '2. แผง PV (Nameplate + มุมกว้าง)' },
  { key: 'inverter', label: '3. อินเวอร์เตอร์ (Nameplate + จุดติดตั้ง)' },
  { key: 'ac_cabinet', label: '4. ตู้ AC (เบรกเกอร์, SPD)' },
  { key: 'connection_points', label: '5. จุดเชื่อมต่อ (เบรกเกอร์, CT)' },
  { key: 'zero_export', label: '6. อุปกรณ์กันย้อน (Zero Export)' },
  { key: 'protection_devices', label: '7. อุปกรณ์กันไฟรั่ว (RCCB, RCBO, CB)' },
  { key: 'overall', label: '8. รูปภาพรวมจุดติดตั้ง (มุมกว้าง)' },
];

export const HV_CHECKLIST: SolarChecklistItemDef[] = [
  { key: 'main_bus_bar', label: '1. จุดต่อเข้า Main Bus Bar / MDB' },
  { key: 'zero_export_hv', label: '2. กันย้อน High Voltage' },
  { key: 'transformer', label: '3. หม้อแปลง (Nameplate + kVA)' },
  { key: 'relay_breaker', label: '4. Relay + Circuit Breaker + CT/PT/UPS' },
];

export function parseChecklistRecord(val: unknown): Record<string, boolean> {
  if (!val) return {};
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof val === 'object' && !Array.isArray(val) ? (val as Record<string, boolean>) : {};
}

export function parseChecklistImages(val: unknown): Record<string, string[]> {
  let obj: unknown = val;
  if (typeof val === 'string') {
    try {
      obj = JSON.parse(val);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};

  const cleaned: Record<string, string[]> = {};
  Object.entries(obj as Record<string, unknown>).forEach(([key, arr]) => {
    if (Array.isArray(arr)) {
      const urls = arr.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
      if (urls.length > 0) cleaned[key] = urls;
    }
  });
  return cleaned;
}

export function parseChecklistStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((item) => (typeof item === 'string' ? item : String(item || ''))).filter((s) => s.trim() !== '');
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item : String(item || ''))).filter((s) => s.trim() !== '');
      }
    } catch {
      return val.trim() ? [val.trim()] : [];
    }
  }
  return [];
}

export function formatSolarDateTimeBkk(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSolarDateBkk(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatSolarTimeBkk(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats an ISO/Date value as YYYY-MM-DDTHH:mm in Asia/Bangkok timezone
 * for <input type="datetime-local" /> without host timezone drift.
 */
export function toBkkDateTimeLocalValue(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const hh = getPart('hour') === '24' ? '00' : getPart('hour');
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${hh}:${getPart('minute')}`;
}

export function computeSolarChecklistProgress(project: {
  preChecklist?: unknown;
  photoChecklist?: unknown;
  hvChecklist?: unknown;
  checklistImages?: unknown;
  isHighVoltage?: boolean | null;
}) {
  const pre = parseChecklistRecord(project?.preChecklist);
  const post = parseChecklistRecord(project?.photoChecklist);
  const hv = parseChecklistRecord(project?.hvChecklist);
  const images = parseChecklistImages(project?.checklistImages);

  const preDone = PRE_WORK_CHECKLIST.filter((i) => Boolean(pre[i.key])).length;
  const postDone = POST_INSTALL_PHOTOS.filter((i) => Boolean(post[i.key])).length;
  const hvDone = project?.isHighVoltage
    ? HV_CHECKLIST.filter((i) => Boolean(hv[i.key])).length
    : 0;

  const totalItems =
    PRE_WORK_CHECKLIST.length +
    POST_INSTALL_PHOTOS.length +
    (project?.isHighVoltage ? HV_CHECKLIST.length : 0);
  const totalChecked = preDone + postDone + hvDone;
  const percent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  const activeKeys = new Set<string>([
    ...PRE_WORK_CHECKLIST.map((i) => i.key),
    ...POST_INSTALL_PHOTOS.map((i) => i.key),
    ...(project?.isHighVoltage ? HV_CHECKLIST.map((i) => i.key) : []),
  ]);
  const photoCount = Array.from(activeKeys).reduce(
    (sum, key) => sum + (images[key]?.length || 0),
    0
  );

  return {
    pre,
    post,
    hv,
    images,
    preDone,
    preTotal: PRE_WORK_CHECKLIST.length,
    postDone,
    postTotal: POST_INSTALL_PHOTOS.length,
    hvDone,
    hvTotal: HV_CHECKLIST.length,
    totalChecked,
    totalItems,
    percent,
    photoCount,
  };
}
