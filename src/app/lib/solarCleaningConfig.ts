export const CLEANING_PROJECT_TYPES = [
  'บ้านพักอาศัย',
  'โรงพยาบาล',
  'บริษัท',
  'โรงงาน',
  'โรงเรียน',
  'อื่นๆ',
] as const;

export const CLEANING_JOB_TYPES = [
  'ล้างแผง',
  'ตรวจเช็คระบบ',
  'ล้างแผง และตรวจเช็คระบบ',
  'อื่นๆ',
] as const;

export const SOLAR_CLEANING_STATUS_META: Record<
  string,
  { label: string; badgeClass: string; pdfBg: string; pdfColor: string }
> = {
  Draft: {
    label: 'เตรียมเอกสาร (Draft)',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    pdfBg: '#f3f4f6',
    pdfColor: '#374151',
  },
  'Precheck Ready': {
    label: 'พร้อมเข้าหน้างาน (รอลูกค้าเซ็น)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    pdfBg: '#fffbeb',
    pdfColor: '#92400e',
  },
  'Customer Signed': {
    label: 'ลูกค้าเซ็นแล้ว (รอทำ Report)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    pdfBg: '#eff6ff',
    pdfColor: '#1d4ed8',
  },
  'Report Drafting': {
    label: 'กำลังจัดทำ Report',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pdfBg: '#eef2ff',
    pdfColor: '#4338ca',
  },
  'Pending Manager Sign': {
    label: 'รอ MGR โปรเจค/เซอร์วิสเซ็น',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    pdfBg: '#fff7ed',
    pdfColor: '#c2410c',
  },
  Completed: {
    label: 'เสร็จสมบูรณ์ (อนุมัติเรียบร้อย)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pdfBg: '#ecfdf5',
    pdfColor: '#047857',
  },
};

export function getSolarCleaningStatusMeta(status?: string | null) {
  return (
    SOLAR_CLEANING_STATUS_META[status || 'Draft'] || {
      label: status || 'Draft',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      pdfBg: '#f3f4f6',
      pdfColor: '#374151',
    }
  );
}

export interface CleaningWorkItem {
  no: number;
  detail: string;
  remark: string;
}

export interface PhotoNoteSection {
  photos: string[];
  photoNotes?: string[];
  remark: string;
}

export type InspectionPassStatus = 'PASS' | 'NOT_PASS';

export type VisualCheckCondition = 'NORMAL' | 'ABNORMAL' | '';

export interface VisualCheckTableItem {
  no: string;
  label: string;
  wiringStatus: VisualCheckCondition;
  cabinetStatus: VisualCheckCondition;
}

export interface VisualInspectionSection {
  equipmentList: string[];
  visualCheckItems?: VisualCheckTableItem[];
  photos: string[];
  photoNotes?: string[];
  status: InspectionPassStatus;
  remark: string;
}

export interface AcVoltageInverterEntry {
  inverterName: string;
  voltRS: string;
  voltRT: string;
  voltST: string;
  photos: string[];
  photoNotes?: string[];
  status: InspectionPassStatus;
  remark: string;
}

export interface DcStringMeasurement {
  label: string;
  value: string;
}

export interface DcChannelInverterEntry {
  inverterName: string;
  strings: DcStringMeasurement[];
  photos: string[];
  photoNotes?: string[];
  status: InspectionPassStatus;
  remark: string;
}

export interface ThermoCheckpointEntry {
  title: string;
  photos: string[];
  photoNotes?: string[];
  status: InspectionPassStatus;
  remark: string;
}

export interface ThermoScanSection {
  netaDescription: string;
  cameraModel: string;
  checkpoints: ThermoCheckpointEntry[];
}

export type ElectricalCheckMode = 'BOTH' | 'AC' | 'DC';

export function resolveElectricalChecks(mode?: ElectricalCheckMode | string | null): {
  mode: ElectricalCheckMode;
  includeAc: boolean;
  includeDc: boolean;
} {
  const m = String(mode || '').toUpperCase().trim();
  const normalized: ElectricalCheckMode = m === 'AC' ? 'AC' : m === 'DC' ? 'DC' : 'BOTH';
  return {
    mode: normalized,
    includeAc: normalized !== 'DC',
    includeDc: normalized !== 'AC',
  };
}

export type ManagerSignMode = 'BOTH' | 'ANY' | 'PM' | 'SM';

export interface ResolvedManagerSignConfig {
  mode: ManagerSignMode;
  showProjectMgr: boolean;
  showServiceMgr: boolean;
  requiresBoth: boolean;
}

/** Resolves which manager signature(s) are active/displayed for a report. */
export function resolveManagerSignConfig(
  mode?: ManagerSignMode | string | null
): ResolvedManagerSignConfig {
  const m = String(mode || '').toUpperCase().trim();
  const normalized: ManagerSignMode =
    m === 'PM' || m === 'SM' || m === 'ANY' || m === 'BOTH' ? (m as ManagerSignMode) : 'BOTH';
  return {
    mode: normalized,
    showProjectMgr: normalized !== 'SM',
    showServiceMgr: normalized !== 'PM',
    requiresBoth: normalized === 'BOTH',
  };
}

/** Returns true when required manager signature(s) under the selected mode are present. */
export function areManagerSignaturesComplete(params: {
  mode?: ManagerSignMode | string | null;
  projectMgrSignUrl?: string | null;
  serviceMgrSignUrl?: string | null;
}): boolean {
  const hasPm = Boolean(params.projectMgrSignUrl);
  const hasSm = Boolean(params.serviceMgrSignUrl);
  const { mode } = resolveManagerSignConfig(params.mode);
  if (mode === 'PM') return hasPm;
  if (mode === 'SM') return hasSm;
  if (mode === 'ANY') return hasPm || hasSm;
  return hasPm && hasSm;
}

/** Returns which manager roles are still needed to approve or notify for a document. */
export function getNeededManagerSigners(params: {
  mode?: ManagerSignMode | string | null;
  projectMgrSignUrl?: string | null;
  serviceMgrSignUrl?: string | null;
}): { needProjectMgr: boolean; needServiceMgr: boolean } {
  const hasPm = Boolean(params.projectMgrSignUrl);
  const hasSm = Boolean(params.serviceMgrSignUrl);
  const { mode } = resolveManagerSignConfig(params.mode);
  if (mode === 'PM') {
    return { needProjectMgr: !hasPm, needServiceMgr: false };
  }
  if (mode === 'SM') {
    return { needProjectMgr: false, needServiceMgr: !hasSm };
  }
  if (mode === 'ANY') {
    const done = hasPm || hasSm;
    return { needProjectMgr: !done, needServiceMgr: !done };
  }
  return { needProjectMgr: !hasPm, needServiceMgr: !hasSm };
}

export interface SolarCleaningReportData {
  coverSubtitle: string;
  electricalCheckMode?: ElectricalCheckMode;
  managerSignMode?: ManagerSignMode;
  cleaningBefore: PhotoNoteSection;
  cleaningDuring: PhotoNoteSection;
  cleaningAfter: PhotoNoteSection;
  visualInspection: VisualInspectionSection;
  acVoltageSystems: AcVoltageInverterEntry[];
  dcVoltageSystems: DcChannelInverterEntry[];
  dcCurrentSystems: DcChannelInverterEntry[];
  thermoScan: ThermoScanSection;
  overallRemark: string;
}

export interface SolarCleaningRecord {
  id: string;
  docNumber: string;
  companyCode: string;
  status: string;
  projectId?: string | null;
  projectName: string;
  location?: string | null;
  customerName: string;
  customerPhone?: string | null;
  inspectorNames?: string | null;
  systemSizeKwp?: string | null;
  inspectionRound?: string | null;
  inspectionDate: string | Date;
  reportDate?: string | Date | null;

  projectTypes: string[];
  projectTypeOther?: string | null;
  jobTypes: string[];
  jobTypeOther?: string | null;
  workItems: CleaningWorkItem[];
  additionalDetail?: string | null;
  checkInCustomerSignUrl?: string | null;
  checkInCustomerName?: string | null;
  checkInAt?: string | Date | null;
  checkOutCustomerSignUrl?: string | null;
  checkOutCustomerName?: string | null;
  checkOutAt?: string | Date | null;
  inspectorSignUrl?: string | null;
  inspectorSignerName?: string | null;

  reportTitle?: string | null;
  reportData: SolarCleaningReportData;
  overallResult: InspectionPassStatus | string;
  projectMgrSignUrl?: string | null;
  projectMgrId?: string | null;
  projectMgrName?: string | null;
  projectMgrSignedAt?: string | Date | null;
  serviceMgrSignUrl?: string | null;
  serviceMgrId?: string | null;
  serviceMgrName?: string | null;
  serviceMgrSignedAt?: string | Date | null;

  createdById: string;
  updatedById?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;

  createdBy?: { id: string; fullName: string; role?: string } | null;
  projectMgrUser?: { id: string; fullName: string; role?: string } | null;
  serviceMgrUser?: { id: string; fullName: string; role?: string } | null;
  project?: {
    id: string;
    projectNumber: string;
    name: string;
    clientName?: string | null;
    siteAddress?: string | null;
  } | null;
}

export interface SelectableProjectOption {
  id: string;
  projectNumber: string;
  name: string;
  clientName?: string | null;
  siteAddress?: string | null;
  projectCategory?: string | null;
  siteTeamMembers?: string | null;
  siteSupervisor?: string | null;
  job?: {
    companyCode?: string | null;
  } | null;
}

export interface SelectableCustomerOption {
  id: string;
  companyName: string;
  customerType?: string | null;
  taxId?: string | null;
  fullAddress: string;
  phone: string;
  contactName: string;
}

export const DEFAULT_REPORT_TITLE =
  'รายงานการบำรุงรักษาและตรวจเช็คระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์';

export const DEFAULT_THERMO_CAMERA = 'Ponpe Instruments Thermal Imaging Camera';

export const DEFAULT_NETA_STATEMENT =
  'ตามข้อกำหนดของ International Electrical Testing Association (NETA) ได้เสนอแนะให้พิจารณาดำเนินการแก้ไขจุดที่เกิดความร้อนสูง เมื่ออุณหภูมิที่เกิดขึ้นมีค่าแตกต่าง (ΔT) สูงกว่า 15 องศาเซลเซียส เมื่อเทียบกับจุดอื่นๆ ที่ทำงานในลักษณะเดียวกันในสภาวะแวดล้อมและโหลดใกล้เคียงกัน หรือ เมื่อ ΔT บริเวณส่วนประกอบไฟฟ้าต่างๆ มีอุณหภูมิสูงกว่า 60 องศาเซลเซียส หรือมากกว่าพิกัดอุณหภูมิใช้งานของอุปกรณ์ประเภทนั้นๆ ตามที่กำหนดใน Data sheet ของตัวอุปกรณ์ ซึ่งจากการตรวจเช็คไม่พบจุดที่มีความร้อนสูงผิดปกติ';

export const STANDARD_CLEANING_WORK_PRESET: CleaningWorkItem[] = [
  { no: 1, detail: 'ทำความสะอาดแผงโซลาร์เซลล์และตรวจสอบสภาพภายนอก (PV Panel Cleaning)', remark: '' },
  { no: 2, detail: 'ตรวจสอบสภาพอุปกรณ์ไฟฟ้า ตู้ AC / DC Box และจุดเชื่อมต่อ (Visual Inspection)', remark: '' },
  { no: 3, detail: 'ตรวจวัดค่าแรงดันไฟฟ้า AC Output ของ Inverter (R-S, R-T, S-T)', remark: '' },
  { no: 4, detail: 'ตรวจวัดค่าแรงดันไฟฟ้า DC และกระแสไฟฟ้า DC ของแต่ละ String', remark: '' },
  { no: 5, detail: 'ตรวจเช็คภาพความร้อนด้วยอุปกรณ์ Thermo Scan (AC Box / DC Box / ตู้ควบคุม)', remark: '' },
];

export function createEmptyWorkItems(): CleaningWorkItem[] {
  return [1, 2, 3, 4, 5].map((no) => ({ no, detail: '', remark: '' }));
}

export function createDefaultAcInverter(index = 1): AcVoltageInverterEntry {
  return {
    inverterName: `INVERTER NO.${index}`,
    voltRS: '',
    voltRT: '',
    voltST: '',
    photos: [],
    photoNotes: [],
    status: 'PASS',
    remark: '',
  };
}

export function createDefaultDcInverter(index = 1): DcChannelInverterEntry {
  return {
    inverterName: `INVERTER NO.${index}`,
    strings: [1, 2, 3, 4].map((s) => ({ label: `STRING NO.${s}`, value: '' })),
    photos: [],
    photoNotes: [],
    status: 'PASS',
    remark: '',
  };
}

export function createDefaultThermoCheckpoint(title = 'AC BOX'): ThermoCheckpointEntry {
  return {
    title,
    photos: [],
    photoNotes: [],
    status: 'PASS',
    remark: '',
  };
}

export const DEFAULT_VISUAL_CHECK_ITEMS: VisualCheckTableItem[] = [
  { no: '1.1', label: 'SOLAR INVERTER จำนวน ... ตัว', wiringStatus: 'NORMAL', cabinetStatus: 'NORMAL' },
  { no: '1.2', label: 'AC BOX จำนวน ... ใบ', wiringStatus: 'NORMAL', cabinetStatus: 'NORMAL' },
  { no: '1.3', label: 'DC BOX จำนวน ... ใบ', wiringStatus: 'NORMAL', cabinetStatus: 'NORMAL' },
  { no: '1.4', label: 'COMMUNICATION BOX จำนวน ... ใบ', wiringStatus: 'NORMAL', cabinetStatus: 'NORMAL' },
  { no: '1.5', label: 'GROUNDING UNIT', wiringStatus: 'NORMAL', cabinetStatus: 'NORMAL' },
  { no: '1.6', label: 'SOLAR PV (สภาพแผงเซลล์แสงอาทิตย์)', wiringStatus: 'NORMAL', cabinetStatus: 'NORMAL' },
];

export function createDefaultReportData(): SolarCleaningReportData {
  return {
    coverSubtitle: 'PROJECT: SOLAR ROOFTOP',
    electricalCheckMode: 'BOTH',
    managerSignMode: 'BOTH',
    cleaningBefore: { photos: [], photoNotes: [], remark: '' },
    cleaningDuring: { photos: [], photoNotes: [], remark: '' },
    cleaningAfter: { photos: [], photoNotes: [], remark: '' },
    visualInspection: {
      equipmentList: [
        '1. INVERTER จำนวน ... ชุด',
        '2. AC BOX จำนวน ... ตู้',
        '3. DC BOX จำนวน ... ตู้',
        '4. COMMUNICATION BOX จำนวน ... ตู้',
      ],
      visualCheckItems: DEFAULT_VISUAL_CHECK_ITEMS.map((item) => ({ ...item })),
      photos: [],
      photoNotes: [],
      status: 'PASS',
      remark: '',
    },
    acVoltageSystems: [createDefaultAcInverter(1)],
    dcVoltageSystems: [createDefaultDcInverter(1)],
    dcCurrentSystems: [createDefaultDcInverter(1)],
    thermoScan: {
      netaDescription: DEFAULT_NETA_STATEMENT,
      cameraModel: DEFAULT_THERMO_CAMERA,
      checkpoints: [createDefaultThermoCheckpoint('AC BOX')],
    },
    overallRemark: '',
  };
}

export function normalizeWorkItems(raw: unknown): CleaningWorkItem[] {
  if (!Array.isArray(raw)) return createEmptyWorkItems();
  const normalized = raw
    .map((row, idx) => {
      const obj = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return {
        no: Number(obj.no) || idx + 1,
        detail: typeof obj.detail === 'string' ? obj.detail : '',
        remark: typeof obj.remark === 'string' ? obj.remark : '',
      };
    });
  return normalized.length > 0 ? normalized : createEmptyWorkItems();
}

function normalizePhotosWithNotes(
  rawPhotos: unknown,
  rawNotes: unknown
): { photos: string[]; photoNotes: string[] } {
  if (!Array.isArray(rawPhotos)) return { photos: [], photoNotes: [] };
  const notesArr = Array.isArray(rawNotes) ? rawNotes : [];
  const photos: string[] = [];
  const photoNotes: string[] = [];

  rawPhotos.forEach((rawUrl, idx) => {
    const cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!cleanUrl) return;
    photos.push(cleanUrl);
    photoNotes.push(typeof notesArr[idx] === 'string' ? notesArr[idx] : '');
  });

  return { photos, photoNotes };
}

function normalizePassStatus(val: unknown): InspectionPassStatus {
  return String(val || '').toUpperCase() === 'NOT_PASS' ? 'NOT_PASS' : 'PASS';
}

export function normalizeReportData(raw: unknown): SolarCleaningReportData {
  const base = createDefaultReportData();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  const parsePhotoNote = (sec: unknown): PhotoNoteSection => {
    const s = sec && typeof sec === 'object' ? (sec as Record<string, unknown>) : {};
    const { photos, photoNotes } = normalizePhotosWithNotes(s.photos, s.photoNotes);
    return {
      photos,
      photoNotes,
      remark: typeof s.remark === 'string' ? s.remark : '',
    };
  };

  const viObj =
    obj.visualInspection && typeof obj.visualInspection === 'object'
      ? (obj.visualInspection as Record<string, unknown>)
      : {};
  const viMedia = normalizePhotosWithNotes(viObj.photos, viObj.photoNotes);
  const equipmentRaw = Array.isArray(viObj.equipmentList)
    ? viObj.equipmentList.map((e) => (typeof e === 'string' ? e : '')).filter((e) => e !== undefined)
    : base.visualInspection.equipmentList;

  const acRaw = Array.isArray(obj.acVoltageSystems) ? obj.acVoltageSystems : [];
  const acVoltageSystems: AcVoltageInverterEntry[] =
    acRaw.length > 0
      ? acRaw.map((item, idx) => {
          const it = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
          const media = normalizePhotosWithNotes(it.photos, it.photoNotes);
          return {
            inverterName:
              typeof it.inverterName === 'string' && it.inverterName.trim()
                ? it.inverterName
                : `INVERTER NO.${idx + 1}`,
            voltRS: typeof it.voltRS === 'string' ? it.voltRS : String(it.voltRS ?? ''),
            voltRT: typeof it.voltRT === 'string' ? it.voltRT : String(it.voltRT ?? ''),
            voltST: typeof it.voltST === 'string' ? it.voltST : String(it.voltST ?? ''),
            photos: media.photos,
            photoNotes: media.photoNotes,
            status: normalizePassStatus(it.status),
            remark: typeof it.remark === 'string' ? it.remark : '',
          };
        })
      : base.acVoltageSystems;

  const parseDcList = (arr: unknown, fallback: DcChannelInverterEntry[]): DcChannelInverterEntry[] => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr.map((item, idx) => {
      const it = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const media = normalizePhotosWithNotes(it.photos, it.photoNotes);
      const stringsRaw = Array.isArray(it.strings) ? it.strings : [];
      const strings: DcStringMeasurement[] =
        stringsRaw.length > 0
          ? stringsRaw.map((st, sIdx) => {
              const sObj = st && typeof st === 'object' ? (st as Record<string, unknown>) : {};
              return {
                label:
                  typeof sObj.label === 'string' && sObj.label.trim()
                    ? sObj.label
                    : `STRING NO.${sIdx + 1}`,
                value: typeof sObj.value === 'string' ? sObj.value : String(sObj.value ?? ''),
              };
            })
          : createDefaultDcInverter(idx + 1).strings;

      return {
        inverterName:
          typeof it.inverterName === 'string' && it.inverterName.trim()
            ? it.inverterName
            : `INVERTER NO.${idx + 1}`,
        strings,
        photos: media.photos,
        photoNotes: media.photoNotes,
        status: normalizePassStatus(it.status),
        remark: typeof it.remark === 'string' ? it.remark : '',
      };
    });
  };

  const tsObj =
    obj.thermoScan && typeof obj.thermoScan === 'object'
      ? (obj.thermoScan as Record<string, unknown>)
      : {};
  const checkpointsRaw = Array.isArray(tsObj.checkpoints) ? tsObj.checkpoints : [];
  const checkpoints: ThermoCheckpointEntry[] =
    checkpointsRaw.length > 0
      ? checkpointsRaw.map((cp, idx) => {
          const c = cp && typeof cp === 'object' ? (cp as Record<string, unknown>) : {};
          const media = normalizePhotosWithNotes(c.photos, c.photoNotes);
          return {
            title:
              typeof c.title === 'string' && c.title.trim()
                ? c.title
                : `จุดตรวจเช็ค #${idx + 1}`,
            photos: media.photos,
            photoNotes: media.photoNotes,
            status: normalizePassStatus(c.status),
            remark: typeof c.remark === 'string' ? c.remark : '',
          };
        })
      : base.thermoScan.checkpoints;

  const normalizeVisualCondition = (val: unknown): VisualCheckCondition => {
    const s = String(val || '').toUpperCase().trim();
    if (s === 'NORMAL') return 'NORMAL';
    if (s === 'ABNORMAL') return 'ABNORMAL';
    return '';
  };

  const visualCheckRaw = Array.isArray(viObj.visualCheckItems) ? viObj.visualCheckItems : [];
  const visualCheckItems: VisualCheckTableItem[] =
    visualCheckRaw.length > 0
      ? visualCheckRaw.map((row, idx) => {
          const rObj = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          return {
            no: typeof rObj.no === 'string' && rObj.no.trim() ? rObj.no : `1.${idx + 1}`,
            label: typeof rObj.label === 'string' ? rObj.label : '',
            wiringStatus: normalizeVisualCondition(rObj.wiringStatus),
            cabinetStatus: normalizeVisualCondition(rObj.cabinetStatus),
          };
        })
      : base.visualInspection.visualCheckItems || DEFAULT_VISUAL_CHECK_ITEMS.map((i) => ({ ...i }));

  return {
    coverSubtitle:
      typeof obj.coverSubtitle === 'string' && obj.coverSubtitle.trim()
        ? obj.coverSubtitle
        : base.coverSubtitle,
    electricalCheckMode: resolveElectricalChecks(
      typeof obj.electricalCheckMode === 'string' ? obj.electricalCheckMode : undefined
    ).mode,
    managerSignMode: resolveManagerSignConfig(
      typeof obj.managerSignMode === 'string' ? obj.managerSignMode : undefined
    ).mode,
    cleaningBefore: parsePhotoNote(obj.cleaningBefore),
    cleaningDuring: parsePhotoNote(obj.cleaningDuring),
    cleaningAfter: parsePhotoNote(obj.cleaningAfter),
    visualInspection: {
      equipmentList: equipmentRaw.length > 0 ? equipmentRaw : base.visualInspection.equipmentList,
      visualCheckItems,
      photos: viMedia.photos,
      photoNotes: viMedia.photoNotes,
      status: normalizePassStatus(viObj.status),
      remark: typeof viObj.remark === 'string' ? viObj.remark : '',
    },
    acVoltageSystems,
    dcVoltageSystems: parseDcList(obj.dcVoltageSystems, base.dcVoltageSystems),
    dcCurrentSystems: parseDcList(obj.dcCurrentSystems, base.dcCurrentSystems),
    thermoScan: {
      netaDescription:
        typeof tsObj.netaDescription === 'string' && tsObj.thermoScan !== null
          ? tsObj.netaDescription
          : base.thermoScan.netaDescription,
      cameraModel:
        typeof tsObj.cameraModel === 'string' && tsObj.cameraModel.trim()
          ? tsObj.cameraModel
          : base.thermoScan.cameraModel,
      checkpoints,
    },
    overallRemark: typeof obj.overallRemark === 'string' ? obj.overallRemark : '',
  };
}

export function collectAllReportPhotoUrls(record: Partial<SolarCleaningRecord> | null | undefined): string[] {
  if (!record) return [];
  const urls: string[] = [];
  const add = (u?: string | null) => {
    const clean = (u || '').trim();
    if (clean && !clean.startsWith('data:')) urls.push(clean);
  };

  add(record.checkInCustomerSignUrl);
  add(record.checkOutCustomerSignUrl);
  add(record.inspectorSignUrl);

  const report = normalizeReportData(record.reportData);
  const { showProjectMgr, showServiceMgr } = resolveManagerSignConfig(report.managerSignMode);
  if (showProjectMgr) add(record.projectMgrSignUrl);
  if (showServiceMgr) add(record.serviceMgrSignUrl);
  const { includeAc, includeDc } = resolveElectricalChecks(report.electricalCheckMode);
  report.cleaningBefore.photos.forEach(add);
  report.cleaningDuring.photos.forEach(add);
  report.cleaningAfter.photos.forEach(add);
  report.visualInspection.photos.forEach(add);
  if (includeAc) {
    report.acVoltageSystems.forEach((inv) => inv.photos.forEach(add));
  }
  if (includeDc) {
    report.dcVoltageSystems.forEach((inv) => inv.photos.forEach(add));
    report.dcCurrentSystems.forEach((inv) => inv.photos.forEach(add));
  }
  report.thermoScan.checkpoints.forEach((cp) => cp.photos.forEach(add));

  return Array.from(new Set(urls));
}

export function countReportPhotos(reportData: SolarCleaningReportData): number {
  const { includeAc, includeDc } = resolveElectricalChecks(reportData.electricalCheckMode);
  return (
    reportData.cleaningBefore.photos.length +
    reportData.cleaningDuring.photos.length +
    reportData.cleaningAfter.photos.length +
    reportData.visualInspection.photos.length +
    (includeAc
      ? reportData.acVoltageSystems.reduce((sum, i) => sum + i.photos.length, 0)
      : 0) +
    (includeDc
      ? reportData.dcVoltageSystems.reduce((sum, i) => sum + i.photos.length, 0) +
        reportData.dcCurrentSystems.reduce((sum, i) => sum + i.photos.length, 0)
      : 0) +
    reportData.thermoScan.checkpoints.reduce((sum, c) => sum + c.photos.length, 0)
  );
}

export const REPORT_OVERALL_REMARK_ELEMENT_ID = 'report-overall-remark';

/** Returns true when the required overall inspection summary/recommendation is blank. */
export function isOverallRemarkMissing(reportData: SolarCleaningReportData): boolean {
  return !(reportData.overallRemark || '').trim();
}

export interface MissingReportRemarkItem {
  id: string;
  label: string;
}

export function findMissingReportPhotoNotes(
  reportData: SolarCleaningReportData
): MissingReportRemarkItem[] {
  const missing: MissingReportRemarkItem[] = [];
  const checkSection = (
    sectionPrefix: string,
    sectionLabel: string,
    photos: string[],
    photoNotes?: string[]
  ) => {
    const notes = photoNotes || [];
    photos.forEach((_, photoIdx) => {
      if (!(notes[photoIdx] || '').trim()) {
        missing.push({
          id: `photo-note-${sectionPrefix}-${photoIdx}`,
          label: `${sectionLabel} รูปที่ #${photoIdx + 1}`,
        });
      }
    });
  };

  checkSection(
    'cleaningBefore',
    '1.1 ภาพก่อนล้าง',
    reportData.cleaningBefore.photos,
    reportData.cleaningBefore.photoNotes
  );
  checkSection(
    'cleaningDuring',
    '1.2 ระหว่างปฏิบัติงาน',
    reportData.cleaningDuring.photos,
    reportData.cleaningDuring.photoNotes
  );
  checkSection(
    'cleaningAfter',
    '1.3 หลังทำความสะอาด',
    reportData.cleaningAfter.photos,
    reportData.cleaningAfter.photoNotes
  );
  checkSection(
    'visualInspection',
    '2. Visual Inspection',
    reportData.visualInspection.photos,
    reportData.visualInspection.photoNotes
  );
  const { includeAc, includeDc } = resolveElectricalChecks(reportData.electricalCheckMode);
  let nextSecNo = 3;
  if (includeAc) {
    const acSec = nextSecNo++;
    reportData.acVoltageSystems.forEach((inv, idx) =>
      checkSection(
        `ac-${idx}`,
        `${acSec}. AC (${inv.inverterName || `INV#${idx + 1}`})`,
        inv.photos,
        inv.photoNotes
      )
    );
  }
  if (includeDc) {
    const dcVoltSec = nextSecNo++;
    const dcCurrSec = nextSecNo++;
    reportData.dcVoltageSystems.forEach((inv, idx) =>
      checkSection(
        `dc-volt-${idx}`,
        `${dcVoltSec}. DC Volt (${inv.inverterName || `INV#${idx + 1}`})`,
        inv.photos,
        inv.photoNotes
      )
    );
    reportData.dcCurrentSystems.forEach((inv, idx) =>
      checkSection(
        `dc-curr-${idx}`,
        `${dcCurrSec}. DC Current (${inv.inverterName || `INV#${idx + 1}`})`,
        inv.photos,
        inv.photoNotes
      )
    );
  }
  const thermoSec = nextSecNo++;
  reportData.thermoScan.checkpoints.forEach((cp, idx) =>
    checkSection(
      `thermo-${idx}`,
      `${thermoSec}. Thermo (${cp.title || `จุดที่ ${idx + 1}`})`,
      cp.photos,
      cp.photoNotes
    )
  );

  return missing;
}

// ── RBAC Permissions ──────────────────────────────────────────────
function normRole(role?: string | null): string {
  return (role || '').toLowerCase().trim();
}

export function isSuperAdminRole(role?: string | null): boolean {
  const r = normRole(role);
  return ['super_admin', 'super admin', 'superadmin', 'ซุปเปอร์แอดมิน', 'ผู้ดูแลระบบ'].some((k) =>
    r.includes(k)
  );
}

export function canSignSolarCleaningAsProjectMgr(role?: string | null): boolean {
  if (!role) return false;
  if (isSuperAdminRole(role)) return true;
  const r = normRole(role);
  return (
    r === 'project manager' ||
    r === 'engineering mgr.' ||
    r === 'ผู้จัดการโปรเจค' ||
    r === 'ผู้จัดการโครงการ' ||
    (r.includes('project') && (r.includes('manager') || r.includes('mgr'))) ||
    (r.includes('engineering') && (r.includes('manager') || r.includes('mgr')))
  );
}

export function canSignSolarCleaningAsServiceMgr(role?: string | null): boolean {
  if (!role) return false;
  if (isSuperAdminRole(role)) return true;
  const r = normRole(role);
  return (
    r === 'service engineer mgr.' ||
    r === 'manager technician' ||
    r === 'ผู้จัดการเซอร์วิส' ||
    (r.includes('service') && (r.includes('manager') || r.includes('mgr')))
  );
}

export function canEditSolarCleaningRole(role?: string | null): boolean {
  if (!role) return false;
  if (
    isSuperAdminRole(role) ||
    canSignSolarCleaningAsProjectMgr(role) ||
    canSignSolarCleaningAsServiceMgr(role)
  ) {
    return true;
  }
  const r = normRole(role);
  return (
    r === 'project' ||
    r === 'admin project' ||
    r === 'project admin' ||
    r.includes('project') ||
    r.includes('โปรเจค') ||
    r.includes('โปรเจกต์') ||
    r === 'service' ||
    r === 'service engineer'
  );
}

export function canAccessSolarCleaningRole(role?: string | null): boolean {
  if (!role) return false;
  if (canEditSolarCleaningRole(role)) return true;
  const r = normRole(role);
  return r === 'executive' || r === 'ผู้บริหาร';
}

export function deriveSolarCleaningStatus(params: {
  requestedStatus?: string | null;
  checkInCustomerSignUrl?: string | null;
  checkOutCustomerSignUrl?: string | null;
  projectMgrSignUrl?: string | null;
  serviceMgrSignUrl?: string | null;
  reportData?: SolarCleaningReportData;
}): string {
  const hasProjMgr = Boolean(params.projectMgrSignUrl);
  const hasSvcMgr = Boolean(params.serviceMgrSignUrl);
  const signComplete = areManagerSignaturesComplete({
    mode: params.reportData?.managerSignMode,
    projectMgrSignUrl: params.projectMgrSignUrl,
    serviceMgrSignUrl: params.serviceMgrSignUrl,
  });

  if (signComplete) {
    return 'Completed';
  }
  const { showProjectMgr, showServiceMgr } = resolveManagerSignConfig(
    params.reportData?.managerSignMode
  );
  const hasRelevantMgr =
    (showProjectMgr && hasProjMgr) || (showServiceMgr && hasSvcMgr);
  if (hasRelevantMgr || params.requestedStatus === 'Pending Manager Sign') {
    return 'Pending Manager Sign';
  }
  if (params.requestedStatus && SOLAR_CLEANING_STATUS_META[params.requestedStatus]) {
    if (params.requestedStatus !== 'Draft') {
      return params.requestedStatus;
    }
  }

  const photoTotal = params.reportData ? countReportPhotos(params.reportData) : 0;
  if (photoTotal > 0) {
    return 'Report Drafting';
  }
  if (params.checkOutCustomerSignUrl || params.checkInCustomerSignUrl) {
    return 'Customer Signed';
  }
  return params.requestedStatus || 'Draft';
}

// ── Bangkok Date/Time Helpers ─────────────────────────────────────
export function formatCleaningDateBkk(dateInput?: string | Date | null, longMonth = false): string {
  if (!dateInput) return '-';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: longMonth ? 'long' : 'short',
    day: 'numeric',
  });
}

export function formatCleaningDateTimeBkk(dateInput?: string | Date | null): string {
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

export function toBkkDateInputValue(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatCleaningDateSlashBe(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
  }
  const iso = toBkkDateInputValue(dateInput);
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
}

