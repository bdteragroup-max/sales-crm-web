export type SunwaysLang = "TH" | "EN";
export type SunwaysPrintLang = "EN" | "TH" | "BILINGUAL";
export type SunwaysReportStatus = "DRAFT" | "COMPLETED" | "SUBMITTED";

export interface SunwaysCableSpecs {
  acCables: string;
  acCableType: string;
  dcCables: string;
  dcCableType: string;
}

export interface SunwaysAcMeasurement {
  phaseA: string;
  phaseB: string;
  phaseC: string;
  frequency: string;
}

export interface SunwaysMpptRow {
  mppt: string;
  dcVoltage: string;
  dcCurrent: string;
  stringsPv: string;
}

export interface SunwaysFanCheck {
  fansWorking: "YES" | "NO" | "";
  fansWorkingNote: string;
  nothingStuck: "YES" | "NO" | "";
  nothingStuckNote: string;
  restartNoiseCheck: "YES" | "NO" | "";
  fanNoiseNote: string;
  summaryResult: string;
  summarySuggestion: string;
}

export interface SunwaysInspectionItemValue {
  result: string;
  suggestion: string;
}

export type SunwaysInspectionKey =
  | "appearance"
  | "cables"
  | "insulation"
  | "body_earthing"
  | "grounding"
  | "ac_measurement"
  | "pv_module"
  | "lcd_display";

export interface SunwaysTextBundle {
  companyName: string;
  communicationPerson: string;
  contactDetail: string;
  plantName: string;
  country: string;
  plantCapacity: string;
  inverterModel: string;
  serialNumber: string;
  firmwareVersion: string;
  countryCode: string;
  dataloggerSn: string;
  externalDataloggerDetails: string;
  faultObserved: string;
  dataloggerSoftwareVersion: string;
  portalFaultObserved: string;
  cablesSpec: SunwaysCableSpecs;
  acMeasurement: SunwaysAcMeasurement;
  pvModuleWp: string;
  inspectionResults: Record<SunwaysInspectionKey, SunwaysInspectionItemValue>;
  fanCheck: SunwaysFanCheck;
  backupDataObservation: string;
  otherRemarks: string;
  inspectorName: string;
}

export interface SunwaysBilingualData {
  th: SunwaysTextBundle;
  en: SunwaysTextBundle;
  portalImages?: string[];
  backupImages?: string[];
}

export interface SunwaysCompanyContactOption {
  id: string;
  contactName: string;
  position?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
}

export interface SunwaysCompanyOption {
  id: string;
  companyName: string;
  taxId?: string | null;
  address?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  contacts: SunwaysCompanyContactOption[];
}

export interface SunwaysReportRecord {
  id: string;
  reportNumber: string;
  reportDate: string | Date;
  status: string;
  defaultLang: string;
  companyName?: string | null;
  communicationPerson?: string | null;
  contactDetail?: string | null;
  plantName?: string | null;
  country?: string | null;
  plantCapacity?: string | null;
  inverterModel?: string | null;
  serialNumber?: string | null;
  firmwareVersion?: string | null;
  countryCode?: string | null;
  dataloggerSn?: string | null;
  externalDataloggerDetails?: string | null;
  faultObserved?: string | null;
  installationImages?: string[] | null;
  dataloggerSoftwareVersion?: string | null;
  portalFaultObserved?: string | null;
  inspectionItems?: {
    cablesSpec?: Partial<SunwaysCableSpecs>;
    acMeasurement?: Partial<SunwaysAcMeasurement>;
    pvModuleWp?: string;
    results?: Record<string, Partial<SunwaysInspectionItemValue>>;
    inspectionResults?: Record<string, Partial<SunwaysInspectionItemValue>>;
  } | null;
  mpptRows?: SunwaysMpptRow[] | null;
  fanCheck?: Partial<SunwaysFanCheck> | null;
  backupDataObservation?: string | null;
  otherRemarks?: string | null;
  bilingualData?: Partial<SunwaysBilingualData> | null;
  inspectorName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SunwaysReportPayload {
  id?: string;
  reportNumber?: string;
  reportDate: string;
  status: SunwaysReportStatus;
  defaultLang: SunwaysLang;
  active: SunwaysTextBundle;
  bilingualData: SunwaysBilingualData;
  mpptRows: SunwaysMpptRow[];
  installationImages: string[];
}

export interface SunwaysInspectionDefinition {
  key: SunwaysInspectionKey;
  page: 2 | 3;
  titleEn: string;
  titleTh: string;
  contentEn: string;
  contentTh: string;
}

export const SUNWAYS_INSPECTION_ITEMS: SunwaysInspectionDefinition[] = [
  {
    key: "appearance",
    page: 2,
    titleEn: "Equipment appearance inspection",
    titleTh: "ตรวจสอบสภาพภายนอกของอุปกรณ์",
    contentEn: "The appearance of the equipment is not damaged or abnormal",
    contentTh: "สภาพภายนอกของอุปกรณ์ไม่ชำรุดเสียหายหรือมีลักษณะผิดปกติ",
  },
  {
    key: "cables",
    page: 2,
    titleEn:
      "Sizes of the AC and DC cables. Need to mention the SQ mm sizes with no of core of the cable used for AC and DC",
    titleTh:
      "ขนาดของสายไฟ AC และ DC (ระบุขนาดพื้นที่หน้าตัด sq.mm. และจำนวนแกนสายที่ใช้ทั้งฝั่ง AC และ DC)",
    contentEn:
      "1.) AC cables  2.) AC Cable type  3.) DC cables  4.) DC cables type",
    contentTh:
      "1.) ขนาดสาย AC  2.) ชนิดสาย AC  3.) ขนาดสาย DC  4.) ชนิดสาย DC",
  },
  {
    key: "insulation",
    page: 2,
    titleEn: "Check the insulation resistance value of String w.r.t Earth",
    titleTh: "ตรวจสอบค่าความต้านทานฉนวนของ String เทียบกับ Earth (Ground)",
    contentEn:
      "Insulation needs to check for each string w.r.t DC earth to Protect from Isolation fault.",
    contentTh:
      "ต้องตรวจวัดค่าความต้านทานฉนวนของแต่ละสตริงเทียบกับกราวด์ DC เพื่อป้องกันปัญหา Isolation Fault",
  },
  {
    key: "body_earthing",
    page: 2,
    titleEn: "Body Earthing given or not?",
    titleTh: "มีการต่อสายดินที่ตัวถัง (Body Earthing) หรือไม่?",
    contentEn: "Inverter must connect with Body Earthing",
    contentTh: "อินเวอร์เตอร์ต้องเชื่อมต่อกับสายดินตัวถัง (Body Earthing)",
  },
  {
    key: "grounding",
    page: 3,
    titleEn: "Grounding",
    titleTh: "ระบบกราวด์ (Grounding)",
    contentEn:
      "All the connection of the grounding circuit along with the structure need to be grounded.",
    contentTh:
      "จุดเชื่อมต่อของวงจรกราวด์ทั้งหมดรวมถึงโครงสร้างติดตั้งแผงจะต้องต่อลงดินอย่างครบถ้วน",
  },
  {
    key: "ac_measurement",
    page: 3,
    titleEn: "AC measurement of power grid voltage frequency",
    titleTh: "การตรวจวัดแรงดัน กระแส และความถี่ไฟฟ้าฝั่ง AC Grid",
    contentEn:
      "A phase voltage/ Current, B phase voltage/ Current, C phase voltage/ Current, frequency",
    contentTh: "แรงดัน/กระแส เฟส A, เฟส B, เฟส C และความถี่ไฟฟ้า (Hz)",
  },
  {
    key: "pv_module",
    page: 3,
    titleEn: "PV Module Details",
    titleTh: "รายละเอียดแผงโซลาร์เซลล์ (PV Module)",
    contentEn: "Module Wp",
    contentTh: "กำลังไฟฟ้าต่อแผง (Module Wp)",
  },
  {
    key: "lcd_display",
    page: 3,
    titleEn: "The LCD display function",
    titleTh: "การทำงานของหน้าจอแสดงผล (LCD)",
    contentEn:
      "The LCD is normal with clear characters. The LCD shows that the values match the actual values.",
    contentTh:
      "หน้าจอ LCD แสดงผลปกติ ตัวอักษรชัดเจน และค่าที่แสดงตรงกับค่าที่วัดได้จริง",
  },
];

export const SUNWAYS_STATUS_CONFIG: Record<
  SunwaysReportStatus,
  { labelTh: string; labelEn: string; badgeClass: string }
> = {
  DRAFT: {
    labelTh: "แบบร่าง (Draft)",
    labelEn: "Draft",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  COMPLETED: {
    labelTh: "ตรวจเช็คเสร็จสิ้น",
    labelEn: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SUBMITTED: {
    labelTh: "ส่งรายงานให้ลูกค้า/Sunways แล้ว",
    labelEn: "Submitted",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

export const SUNWAYS_FIELD_LABELS = {
  title: { en: "Inverter Check Points", th: "แบบฟอร์มตรวจเช็คอินเวอร์เตอร์ (Sunways)" },
  date: { en: "Date:", th: "วันที่:" },
  companyName: { en: "Company Name", th: "ชื่อบริษัท / ลูกค้า" },
  communicationPerson: { en: "Communication Person", th: "ผู้ติดต่อประสานงาน" },
  contactDetail: { en: "Contact Detail / Mail ID", th: "ข้อมูลติดต่อ / อีเมล" },
  plantName: { en: "Plant Name", th: "ชื่อโครงการ / โรงไฟฟ้า (Plant Name)" },
  country: { en: "Country", th: "ประเทศ" },
  plantCapacity: { en: "Plant Capacity", th: "กำลังการผลิตติดตั้ง (Plant Capacity)" },
  inverterModel: { en: "Inverter Model", th: "รุ่นอินเวอร์เตอร์ (Inverter Model)" },
  serialNumber: { en: "Inverter Serial Number", th: "หมายเลขเครื่อง (Serial Number)" },
  firmwareVersion: { en: "Inverter's Firmware Version", th: "เวอร์ชันเฟิร์มแวร์ (Firmware Version)" },
  countryCode: { en: "Inverter Country Code", th: "รหัสประเทศของเครื่อง (Country Code)" },
  dataloggerSn: {
    en: "WIFI/GPRS/ External Datalogger SN",
    th: "หมายเลข Datalogger (WIFI/GPRS/External SN)",
  },
  externalDataloggerDetails: {
    en: "External datalogger Details",
    th: "รายละเอียด External Datalogger",
  },
  faultObserved: { en: "Fault Observed", th: "อาการผิดปกติ / Fault ที่พบ" },
  installationImage: { en: "Installation Image", th: "รูปภาพหน้างานการติดตั้ง" },
  dataloggerSoftwareVersion: {
    en: "Datalogger Software Version",
    th: "เวอร์ชันซอฟต์แวร์ Datalogger",
  },
  portalFaultObserved: {
    en: "Fault Observed on Backed data or on Portal",
    th: "อาการผิดปกติจากข้อมูลสำรอง (Backup Data) หรือบน Portal",
  },
  colItem: {
    en: "Installation and commissioning and inspection items",
    th: "รายการตรวจสอบการติดตั้งและการทดสอบระบบ (Commissioning)",
  },
  colCheck: {
    en: "Technical Engineer has to go to and check the content",
    th: "รายละเอียดที่วิศวกร/ช่างเทคนิคต้องตรวจสอบ",
  },
  colResult: { en: "Inspection results", th: "ผลการตรวจสอบ" },
  colSuggestion: { en: "Suggestion", th: "ข้อเสนอแนะ / แนวทางแก้ไข" },
  cableAc: { en: "1.) AC cables", th: "1.) ขนาดสาย AC" },
  cableAcType: { en: "2.) AC Cable type", th: "2.) ชนิดสาย AC" },
  cableDc: { en: "3.) DC cables", th: "3.) ขนาดสาย DC" },
  cableDcType: { en: "4.) DC cables type", th: "4.) ชนิดสาย DC" },
  acPhaseA: { en: "A phase voltage/ Current:", th: "แรงดัน/กระแส เฟส A:" },
  acPhaseB: { en: "B phase voltage/ Current:", th: "แรงดัน/กระแส เฟส B:" },
  acPhaseC: { en: "C phase voltage/ Current:", th: "แรงดัน/กระแส เฟส C:" },
  acFreq: { en: "frequency:", th: "ความถี่ (Frequency):" },
  pvModuleWp: { en: "Module Wp", th: "กำลังวัตต์ต่อแผง (Wp)" },
  mppt: { en: "MPPT", th: "MPPT" },
  dcVoltage: { en: "DC Voltage", th: "แรงดัน DC (V)" },
  dcCurrent: { en: "DC Current", th: "กระแส DC (A)" },
  stringsPv: { en: "Strings/PV", th: "จำนวน Strings/PV" },
  fanStatusTitle: { en: "Check Fan Status :", th: "ตรวจสอบสถานะพัดลม :" },
  fanStatusDesc: {
    en: "During Working Condition of Inverter, please check Fan Operation :",
    th: "ขณะอินเวอร์เตอร์ทำงาน กรุณาตรวจสอบการทำงานของพัดลม :",
  },
  fanAllWorking: { en: "Check all fans are working", th: "พัดลมทุกตัวทำงานปกติ" },
  fanNothingStuck: {
    en: "Verify is there anything stuck inside the Fan",
    th: "ตรวจสอบสิ่งแปลกปลอมติดขัดภายในพัดลม",
  },
  fanRestartNoise: {
    en: "Please restart the Inverter and check fan noise :",
    th: "รีสตาร์ทอินเวอร์เตอร์และตรวจสอบเสียงพัดลม :",
  },
  backupObservation: {
    en: "Back up data Observation:",
    th: "ข้อสังเกตจากข้อมูลสำรอง (Back up data Observation):",
  },
  otherRemarks: {
    en: "Other Remarks or note:",
    th: "หมายเหตุหรือข้อสังเกตเพิ่มเติม (Other Remarks or note):",
  },
  inspectorName: { en: "Inspector / Technical Engineer", th: "ผู้ตรวจสอบ / วิศวกรบริการ" },
};

export function createEmptyInspectionResults(): Record<
  SunwaysInspectionKey,
  SunwaysInspectionItemValue
> {
  return {
    appearance: { result: "", suggestion: "" },
    cables: { result: "", suggestion: "" },
    insulation: { result: "", suggestion: "" },
    body_earthing: { result: "", suggestion: "" },
    grounding: { result: "", suggestion: "" },
    ac_measurement: { result: "", suggestion: "" },
    pv_module: { result: "", suggestion: "" },
    lcd_display: { result: "", suggestion: "" },
  };
}

export function createEmptyTextBundle(defaultCountry = ""): SunwaysTextBundle {
  return {
    companyName: "",
    communicationPerson: "",
    contactDetail: "",
    plantName: "",
    country: defaultCountry,
    plantCapacity: "",
    inverterModel: "",
    serialNumber: "",
    firmwareVersion: "",
    countryCode: "",
    dataloggerSn: "",
    externalDataloggerDetails: "",
    faultObserved: "",
    dataloggerSoftwareVersion: "",
    portalFaultObserved: "",
    cablesSpec: {
      acCables: "",
      acCableType: "",
      dcCables: "",
      dcCableType: "",
    },
    acMeasurement: {
      phaseA: "",
      phaseB: "",
      phaseC: "",
      frequency: "",
    },
    pvModuleWp: "",
    inspectionResults: createEmptyInspectionResults(),
    fanCheck: {
      fansWorking: "",
      fansWorkingNote: "",
      nothingStuck: "",
      nothingStuckNote: "",
      restartNoiseCheck: "",
      fanNoiseNote: "",
      summaryResult: "",
      summarySuggestion: "",
    },
    backupDataObservation: "",
    otherRemarks: "",
    inspectorName: "",
  };
}

export function createDefaultMpptRows(count = 12): SunwaysMpptRow[] {
  return Array.from({ length: count }, (_, idx) => ({
    mppt: `MPPT ${idx + 1}`,
    dcVoltage: "",
    dcCurrent: "",
    stringsPv: "",
  }));
}

export function normalizeTextBundle(
  raw: Partial<SunwaysTextBundle> | null | undefined,
  fallbackCountry = ""
): SunwaysTextBundle {
  const base = createEmptyTextBundle(fallbackCountry);
  if (!raw || typeof raw !== "object") return base;

  const normalizedResults = createEmptyInspectionResults();
  const rawResults = raw.inspectionResults as
    | Record<string, Partial<SunwaysInspectionItemValue> | undefined>
    | undefined;
  for (const item of SUNWAYS_INSPECTION_ITEMS) {
    const src = rawResults?.[item.key];
    if (src && typeof src === "object") {
      normalizedResults[item.key] = {
        result: typeof src.result === "string" ? src.result : "",
        suggestion: typeof src.suggestion === "string" ? src.suggestion : "",
      };
    }
  }

  return {
    companyName: typeof raw.companyName === "string" ? raw.companyName : "",
    communicationPerson:
      typeof raw.communicationPerson === "string" ? raw.communicationPerson : "",
    contactDetail: typeof raw.contactDetail === "string" ? raw.contactDetail : "",
    plantName: typeof raw.plantName === "string" ? raw.plantName : "",
    country: typeof raw.country === "string" ? raw.country : fallbackCountry,
    plantCapacity: typeof raw.plantCapacity === "string" ? raw.plantCapacity : "",
    inverterModel: typeof raw.inverterModel === "string" ? raw.inverterModel : "",
    serialNumber: typeof raw.serialNumber === "string" ? raw.serialNumber : "",
    firmwareVersion: typeof raw.firmwareVersion === "string" ? raw.firmwareVersion : "",
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : "",
    dataloggerSn: typeof raw.dataloggerSn === "string" ? raw.dataloggerSn : "",
    externalDataloggerDetails:
      typeof raw.externalDataloggerDetails === "string"
        ? raw.externalDataloggerDetails
        : "",
    faultObserved: typeof raw.faultObserved === "string" ? raw.faultObserved : "",
    dataloggerSoftwareVersion:
      typeof raw.dataloggerSoftwareVersion === "string"
        ? raw.dataloggerSoftwareVersion
        : "",
    portalFaultObserved:
      typeof raw.portalFaultObserved === "string" ? raw.portalFaultObserved : "",
    cablesSpec: {
      acCables: typeof raw.cablesSpec?.acCables === "string" ? raw.cablesSpec.acCables : "",
      acCableType:
        typeof raw.cablesSpec?.acCableType === "string" ? raw.cablesSpec.acCableType : "",
      dcCables: typeof raw.cablesSpec?.dcCables === "string" ? raw.cablesSpec.dcCables : "",
      dcCableType:
        typeof raw.cablesSpec?.dcCableType === "string" ? raw.cablesSpec.dcCableType : "",
    },
    acMeasurement: {
      phaseA: typeof raw.acMeasurement?.phaseA === "string" ? raw.acMeasurement.phaseA : "",
      phaseB: typeof raw.acMeasurement?.phaseB === "string" ? raw.acMeasurement.phaseB : "",
      phaseC: typeof raw.acMeasurement?.phaseC === "string" ? raw.acMeasurement.phaseC : "",
      frequency:
        typeof raw.acMeasurement?.frequency === "string" ? raw.acMeasurement.frequency : "",
    },
    pvModuleWp: typeof raw.pvModuleWp === "string" ? raw.pvModuleWp : "",
    inspectionResults: normalizedResults,
    fanCheck: {
      fansWorking:
        raw.fanCheck?.fansWorking === "YES" || raw.fanCheck?.fansWorking === "NO"
          ? raw.fanCheck.fansWorking
          : "",
      fansWorkingNote:
        typeof raw.fanCheck?.fansWorkingNote === "string"
          ? raw.fanCheck.fansWorkingNote
          : "",
      nothingStuck:
        raw.fanCheck?.nothingStuck === "YES" || raw.fanCheck?.nothingStuck === "NO"
          ? raw.fanCheck.nothingStuck
          : "",
      nothingStuckNote:
        typeof raw.fanCheck?.nothingStuckNote === "string"
          ? raw.fanCheck.nothingStuckNote
          : "",
      restartNoiseCheck:
        raw.fanCheck?.restartNoiseCheck === "YES" ||
        raw.fanCheck?.restartNoiseCheck === "NO"
          ? raw.fanCheck.restartNoiseCheck
          : "",
      fanNoiseNote:
        typeof raw.fanCheck?.fanNoiseNote === "string" ? raw.fanCheck.fanNoiseNote : "",
      summaryResult:
        typeof raw.fanCheck?.summaryResult === "string" ? raw.fanCheck.summaryResult : "",
      summarySuggestion:
        typeof raw.fanCheck?.summarySuggestion === "string"
          ? raw.fanCheck.summarySuggestion
          : "",
    },
    backupDataObservation:
      typeof raw.backupDataObservation === "string" ? raw.backupDataObservation : "",
    otherRemarks: typeof raw.otherRemarks === "string" ? raw.otherRemarks : "",
    inspectorName: typeof raw.inspectorName === "string" ? raw.inspectorName : "",
  };
}

export function extractTextBundleFromRecord(
  record: SunwaysReportRecord | Record<string, unknown> | null | undefined,
  lang?: SunwaysLang
): SunwaysTextBundle {
  const rec = (record || {}) as SunwaysReportRecord;
  const b = rec.bilingualData;
  const preferredLang = lang || (rec.defaultLang === "EN" ? "EN" : "TH");

  if (preferredLang === "EN" && b?.en) {
    return normalizeTextBundle(b.en);
  }
  if (preferredLang === "TH" && b?.th) {
    return normalizeTextBundle(b.th);
  }

  const inspectionMeta = rec.inspectionItems || {};
  return normalizeTextBundle({
    companyName: rec.companyName || "",
    communicationPerson: rec.communicationPerson || "",
    contactDetail: rec.contactDetail || "",
    plantName: rec.plantName || "",
    country: rec.country || (preferredLang === "EN" ? "Thailand" : "ประเทศไทย"),
    plantCapacity: rec.plantCapacity || "",
    inverterModel: rec.inverterModel || "",
    serialNumber: rec.serialNumber || "",
    firmwareVersion: rec.firmwareVersion || "",
    countryCode: rec.countryCode || "",
    dataloggerSn: rec.dataloggerSn || "",
    externalDataloggerDetails: rec.externalDataloggerDetails || "",
    faultObserved: rec.faultObserved || "",
    dataloggerSoftwareVersion: rec.dataloggerSoftwareVersion || "",
    portalFaultObserved: rec.portalFaultObserved || "",
    cablesSpec: inspectionMeta.cablesSpec as SunwaysCableSpecs | undefined,
    acMeasurement: inspectionMeta.acMeasurement as SunwaysAcMeasurement | undefined,
    pvModuleWp: inspectionMeta.pvModuleWp || "",
    inspectionResults: (inspectionMeta.results ||
      inspectionMeta.inspectionResults ||
      {}) as Record<SunwaysInspectionKey, SunwaysInspectionItemValue>,
    fanCheck: rec.fanCheck as SunwaysFanCheck | undefined,
    backupDataObservation: rec.backupDataObservation || "",
    otherRemarks: rec.otherRemarks || "",
    inspectorName: rec.inspectorName || rec.createdByName || "",
  });
}
