export type LogisticsTripStatus =
  | 'PLANNED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type LogisticsStopStatus =
  | 'PENDING'
  | 'PICKED_UP'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED';

export type LogisticsStopSourceType =
  | 'JOB'
  | 'REQUISITION'
  | 'REPAIR_DELIVERY'
  | 'MANUAL';

export type LogisticsExpenseCategory =
  | 'TOLL'
  | 'FUEL'
  | 'ACCOMMODATION'
  | 'OTHER';

export interface LogisticsTripExpenseItem {
  id: string;
  category: LogisticsExpenseCategory;
  label: string;
  amount: number;
  receiptUrl?: string | null;
}

export interface LogisticsVehicleOption {
  id: number;
  assetId: string;
  name: string;
  vehicleModel: string | null;
  vehicleType: string | null;
  companyOwner: string | null;
  status: string;
  mainUser?: string | null;
  mainUserNickname?: string | null;
  activeTripsOnSelectedDate?: string[];
}

export interface LogisticsCrewMember {
  userId: string;
  employeeId: string;
  fullName: string;
  nickname: string | null;
  role: string;
  position: string | null;
  isManager: boolean;
  isTransportTeam?: boolean;
  isCustom?: boolean;
}

export interface LogisticsBranchOption {
  code: string;
  name: string;
  aliases?: string[];
  isCustom?: boolean;
}

export interface LogisticsQueueItem {
  queueKey: string;
  sourceType: Exclude<LogisticsStopSourceType, 'MANUAL'>;
  sourceId: string;
  referenceNumber: string;
  customerName: string;
  destination: string;
  province: string;
  contactName: string;
  contactPhone: string;
  itemSummary: string;
  targetDate: string | null;
  isReadyNow: boolean;
  readinessLabel: string;
  requiresPickupSign: boolean;
  isPickupSigned: boolean;
  deliveryMethodHint: 'in-house' | 'courier';
  companyCode: string;
  isOverdue: boolean;
  activeTripNumber?: string | null;
  activeTripId?: string | null;
}

export interface LogisticsTripStopItem {
  id: string;
  tripId: string;
  stopOrder: number;
  sourceType: LogisticsStopSourceType;
  jobId: string | null;
  requisitionId: string | null;
  repairDeliveryId: string | null;
  referenceNumber: string | null;
  customerName: string;
  destination: string | null;
  province: string | null;
  contactName: string | null;
  contactPhone: string | null;
  itemSummary: string | null;
  targetDate: string | null;
  status: LogisticsStopStatus;
  deliveryMethod: string;
  courierCompany: string | null;
  trackingNumber: string | null;
  checkedInAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  deliveredAt: string | null;
  receiverName: string | null;
  receiverSignatureUrl: string | null;
  podPhotoUrls: string[];
  podNote: string | null;
  failReason: string | null;
  requisitionSignedTransport?: boolean;
  requisitionTransportName?: string | null;
  requisitionNumber?: string | null;
}

export interface LogisticsTripRecord {
  id: string;
  tripNumber: string;
  tripDate: string;
  departureTime: string | null;
  status: LogisticsTripStatus;
  transportType: 'INTERNAL' | 'EXTERNAL';
  vehicleAssetId: number | null;
  vehiclePlate: string | null;
  vehicleName: string | null;
  courierName: string | null;
  driverUserId: string | null;
  driverEmployeeId: string | null;
  driverName: string;
  helperNames: string | null;
  routeZone: string | null;
  originBranch: string | null;
  planNote: string | null;
  startMileage: number | null;
  endMileage: number | null;
  startedAt: string | null;
  closedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  closeNote: string | null;
  allowancePerDay: number;
  allowanceDays: number;
  crewCount: number;
  allowanceTotal: number;
  overnightNights: number;
  accommodationAmount: number;
  tollAmount: number;
  fuelAmount: number;
  otherExpenseAmount: number;
  expenseItems: LogisticsTripExpenseItem[];
  totalExpenseAmount: number;
  expenseReceipts: string[];
  expenseApprovedStatus: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  stops: LogisticsTripStopItem[];
}

export interface LogisticsGoldSummary {
  month: number;
  yearCe: number;
  myValidJobDeliveries: number;
  myValidRepairDeliveries: number;
  myTotalDeliveries: number;
  myTripStopsCompleted: number;
  myGoldCurrent: number;
  myGoldNextThreshold: number | null;
  myGoldRemaining: number;
  teamTotalDeliveries: number;
  teamDelayedDeliveries: number;
  teamSuccessfulDeliveries: number;
  teamDelayRatePct: number;
  managerSlaPassed: boolean;
  managerGoldCurrent: number;
  managerGoldNextThreshold: number | null;
}

export interface LogisticsPermissions {
  userId: string;
  employeeId: string;
  fullName: string;
  role: string;
  isManager: boolean;
  isTransportTeam: boolean;
  canAccess: boolean;
  canPlanTrips: boolean;
  canManageAllTrips: boolean;
}

export interface LogisticsWorkspaceData {
  permissions: LogisticsPermissions;
  vehicles: LogisticsVehicleOption[];
  crewMembers: LogisticsCrewMember[];
  branches: LogisticsBranchOption[];
  queueItems: LogisticsQueueItem[];
  trips: LogisticsTripRecord[];
  goldSummary: LogisticsGoldSummary;
}

export const LOGISTICS_TRIP_STATUS_META: Record<
  LogisticsTripStatus,
  { label: string; badge: string; dot: string }
> = {
  PLANNED: {
    label: 'จัดคิวรถแล้ว',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  LOADING: {
    label: 'กำลังโหลดของขึ้นรถ',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  IN_TRANSIT: {
    label: 'กำลังวิ่งจัดส่ง',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  COMPLETED: {
    label: 'ปิดทริปเรียบร้อย',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'ยกเลิกทริป',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export const LOGISTICS_STOP_STATUS_META: Record<
  LogisticsStopStatus,
  { label: string; badge: string }
> = {
  PENDING: {
    label: 'รอรับของ / ออกส่ง',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  PICKED_UP: {
    label: 'โหลดขึ้นรถแล้ว',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ARRIVED: {
    label: 'ถึงจุดส่งแล้ว',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  DELIVERED: {
    label: 'ส่งมอบสำเร็จ (POD)',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FAILED: {
    label: 'ส่งไม่สำเร็จ',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  RESCHEDULED: {
    label: 'เลื่อนนัดส่ง',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
  },
};

export const LOGISTICS_SOURCE_META: Record<
  LogisticsStopSourceType,
  { label: string; short: string; badge: string }
> = {
  JOB: {
    label: 'งานส่งสินค้า (Job)',
    short: 'JOB',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  REQUISITION: {
    label: 'ใบเบิกส่งหน้างาน (Req)',
    short: 'REQ',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  REPAIR_DELIVERY: {
    label: 'ใบส่งมอบซ่อม (DN)',
    short: 'DN',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  MANUAL: {
    label: 'จุดส่งเพิ่มเติม',
    short: 'OTHER',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const EXPENSE_CATEGORY_META: Record<
  LogisticsExpenseCategory,
  { label: string; placeholder: string; badge: string }
> = {
  TOLL: {
    label: 'ค่าทางด่วน / M-Flow',
    placeholder: 'เช่น ด่านบางนา-ชลบุรี, มอเตอร์เวย์ M6',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  FUEL: {
    label: 'ค่าน้ำมัน (เงินสด/สำรองจ่าย)',
    placeholder: 'เช่น เติมดีเซล ปตท. วังน้อย',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ACCOMMODATION: {
    label: 'ค่าที่พักค้างคืน',
    placeholder: 'เช่น โรงแรมสาขาขอนแก่น 1 คืน',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  OTHER: {
    label: 'ค่าจอดรถ / ค่ายกของ / อื่นๆ',
    placeholder: 'เช่น ค่าจอดหน้าไซต์, ค่าแรงยกของหน้างาน',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const DEFAULT_ALLOWANCE_RATE_THB = 200;

export function roundMoney2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round((n + Number.EPSILON) * 100) / 100);
}

export interface TripCloseCalculationInput {
  allowancePerDay: number;
  allowanceDays: number;
  crewCount: number;
  allowanceTotalOverride?: number | null;
  overnightNights?: number;
  accommodationAmount?: number;
  tollAmount?: number;
  fuelAmount?: number;
  otherExpenseAmount?: number;
  expenseItems?: LogisticsTripExpenseItem[];
  startMileage?: number | null;
  endMileage?: number | null;
}

export interface TripCloseCalculationResult {
  allowancePerDay: number;
  allowanceDays: number;
  crewCount: number;
  allowanceTotal: number;
  overnightNights: number;
  accommodationAmount: number;
  tollAmount: number;
  fuelAmount: number;
  otherExpenseAmount: number;
  totalExpenseAmount: number;
  distanceKm: number | null;
}

/**
 * Computes consistent allowance, itemized category totals, total trip expenses, and mileage distance.
 */
export function calculateTripAllowanceAndExpenses(
  input: TripCloseCalculationInput
): TripCloseCalculationResult {
  const allowancePerDay = roundMoney2(Number(input.allowancePerDay || 0));
  const allowanceDays = Math.max(0, Number(input.allowanceDays || 0));
  const crewCount = Math.max(0, Math.round(Number(input.crewCount || 0)));

  const computedAllowance = roundMoney2(allowancePerDay * allowanceDays * crewCount);
  const allowanceTotal =
    input.allowanceTotalOverride !== undefined &&
    input.allowanceTotalOverride !== null &&
    Number.isFinite(Number(input.allowanceTotalOverride))
      ? roundMoney2(Number(input.allowanceTotalOverride))
      : computedAllowance;

  const items = Array.isArray(input.expenseItems) ? input.expenseItems : [];
  const sumCategory = (cat: LogisticsExpenseCategory, fallbackDirect?: number): number => {
    const catItems = items.filter((it) => it.category === cat);
    if (catItems.length > 0) {
      return roundMoney2(catItems.reduce((acc, it) => acc + roundMoney2(Number(it.amount || 0)), 0));
    }
    return roundMoney2(Number(fallbackDirect || 0));
  };

  const tollAmount = sumCategory('TOLL', input.tollAmount);
  const fuelAmount = sumCategory('FUEL', input.fuelAmount);
  const accommodationAmount = sumCategory('ACCOMMODATION', input.accommodationAmount);
  const otherExpenseAmount = sumCategory('OTHER', input.otherExpenseAmount);
  const overnightNights = Math.max(0, Math.round(Number(input.overnightNights || 0)));

  const totalExpenseAmount = roundMoney2(
    allowanceTotal + accommodationAmount + tollAmount + fuelAmount + otherExpenseAmount
  );

  const startM =
    input.startMileage !== undefined && input.startMileage !== null && input.startMileage !== 0
      ? Number(input.startMileage)
      : input.startMileage === 0
      ? 0
      : null;
  const endM =
    input.endMileage !== undefined && input.endMileage !== null && input.endMileage !== 0
      ? Number(input.endMileage)
      : input.endMileage === 0
      ? 0
      : null;

  const distanceKm =
    startM !== null &&
    endM !== null &&
    Number.isFinite(startM) &&
    Number.isFinite(endM) &&
    endM >= startM
      ? endM - startM
      : null;

  return {
    allowancePerDay,
    allowanceDays,
    crewCount,
    allowanceTotal,
    overnightNights,
    accommodationAmount,
    tollAmount,
    fuelAmount,
    otherExpenseAmount,
    totalExpenseAmount,
    distanceKm,
  };
}

/**
 * Mirrors transport staff & manager monthly Gold Coin tiers defined in `actions/coins.ts`.
 */
export function evaluateLogisticsGoldTiers(params: {
  myTotalDeliveries: number;
  teamTotalDeliveries: number;
  teamDelayedDeliveries: number;
}): {
  myGoldCurrent: number;
  myGoldNextThreshold: number | null;
  myGoldRemaining: number;
  teamSuccessfulDeliveries: number;
  teamDelayRatePct: number;
  managerSlaPassed: boolean;
  managerGoldCurrent: number;
  managerGoldNextThreshold: number | null;
} {
  const myTotal = Math.max(0, params.myTotalDeliveries);
  let myGoldCurrent = 0;
  let myGoldNextThreshold: number | null = 50;
  if (myTotal >= 150) {
    myGoldCurrent = 3;
    myGoldNextThreshold = null;
  } else if (myTotal >= 100) {
    myGoldCurrent = 2;
    myGoldNextThreshold = 150;
  } else if (myTotal >= 50) {
    myGoldCurrent = 1;
    myGoldNextThreshold = 100;
  }
  const myGoldRemaining =
    myGoldNextThreshold !== null ? Math.max(0, myGoldNextThreshold - myTotal) : 0;

  const teamTotal = Math.max(0, params.teamTotalDeliveries);
  const teamDelayed = Math.max(0, Math.min(teamTotal, params.teamDelayedDeliveries));
  const teamSuccessfulDeliveries = Math.max(0, teamTotal - teamDelayed);
  const teamDelayRatePct =
    teamTotal > 0 ? Math.round(((teamDelayed / teamTotal) * 100 + Number.EPSILON) * 10) / 10 : 0;
  const managerSlaPassed = teamTotal === 0 || teamDelayRatePct <= 5;

  let managerGoldCurrent = 0;
  let managerGoldNextThreshold: number | null = 100;
  if (!managerSlaPassed) {
    managerGoldCurrent = 0;
  } else if (teamSuccessfulDeliveries >= 300) {
    managerGoldCurrent = 6;
    managerGoldNextThreshold = null;
  } else if (teamSuccessfulDeliveries >= 200) {
    managerGoldCurrent = 3;
    managerGoldNextThreshold = 300;
  } else if (teamSuccessfulDeliveries >= 100) {
    managerGoldCurrent = 1;
    managerGoldNextThreshold = 200;
  }

  return {
    myGoldCurrent,
    myGoldNextThreshold,
    myGoldRemaining,
    teamSuccessfulDeliveries,
    teamDelayRatePct,
    managerSlaPassed,
    managerGoldCurrent,
    managerGoldNextThreshold,
  };
}

export function formatThaiDateSlash(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '-';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);
  const dd = parts.find((p) => p.type === 'day')?.value || '01';
  const mm = parts.find((p) => p.type === 'month')?.value || '01';
  const yyyyCe = Number(parts.find((p) => p.type === 'year')?.value || '2026');
  return `${dd}/${mm}/${yyyyCe + 543}`;
}

export function formatThaiTime24Dot(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === 'hour')?.value || '00';
  const min = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hh}.${min}`;
}

export function toBangkokDateKey(isoOrDate?: string | Date | null): string {
  const d = isoOrDate ? (isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value || '2026';
  const m = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${y}-${m}-${day}`;
}

/**
 * Formats ISO `YYYY-MM-DD` to Thai `DD/MM/YYYY` (B.E.), e.g. `2026-11-26` -> `26/11/2569`.
 */
export function formatIsoDateToSlashThai(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || '';
  const [yStr, mStr, dStr] = isoDate.split('-');
  const yearCe = Number(yStr);
  if (!Number.isFinite(yearCe)) return isoDate;
  return `${dStr}/${mStr}/${yearCe + 543}`;
}

/**
 * Parses Thai/CE `DD/MM/YYYY` (e.g. `26/11/2569`, `26/11/2026`, `26-11-2569`) or `YYYY-MM-DD` into canonical `YYYY-MM-DD`.
 */
export function parseSlashDateToIso(raw: string): string | null {
  const clean = (raw || '').trim();
  if (!clean) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [yStr, mStr, dStr] = clean.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() === y &&
      probe.getUTCMonth() + 1 === m &&
      probe.getUTCDate() === d
    ) {
      return clean;
    }
    return null;
  }

  const m = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const rawYear = Number(m[3]);
  const yearCe =
    rawYear < 100
      ? rawYear >= 40
        ? 2500 + rawYear - 543
        : 2000 + rawYear
      : rawYear >= 2400
      ? rawYear - 543
      : rawYear;

  if (yearCe < 1900 || yearCe > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const probe = new Date(Date.UTC(yearCe, month - 1, day));
  if (
    probe.getUTCFullYear() !== yearCe ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(yearCe).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parses 24-hour time inputs (`00.00` - `23.59`, `00:00` - `23:59`, `2300`, `8.30`) into canonical dot display `HH.mm`.
 */
export function parseLogisticsTime24(
  raw?: string | null
): { ok: true; dot24: string | null } | { ok: false; error: string } {
  const stripped = (raw || '')
    .replace(/น\.?/g, '')
    .trim();
  if (!stripped) {
    return { ok: true, dot24: null };
  }

  let hour = -1;
  let minute = -1;

  const sepMatch = stripped.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (sepMatch) {
    hour = Number(sepMatch[1]);
    minute = Number(sepMatch[2]);
  } else if (/^\d{4}$/.test(stripped)) {
    hour = Number(stripped.slice(0, 2));
    minute = Number(stripped.slice(2, 4));
  } else if (/^\d{3}$/.test(stripped)) {
    hour = Number(stripped.slice(0, 1));
    minute = Number(stripped.slice(1, 3));
  } else {
    return {
      ok: false,
      error: 'กรุณาระบุเวลารูปแบบ 24 ชม. (00.00 - 23.59)',
    };
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return {
      ok: false,
      error: 'เวลาออกรถต้องอยู่ระหว่าง 00.00 ถึง 23.59 น.',
    };
  }

  return {
    ok: true,
    dot24: `${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}`,
  };
}

export const LOGISTICS_BRANCH_ALIASES: Record<string, string[]> = {
  'BKK-HQ': ['สำนักงานใหญ่', 'สนง.ใหญ่', 'กทม', 'กทม.', 'HQ', 'สำนักงานใหญ่ กทม.'],
  'BKK-WH': ['Tera Warehouse 62', 'คลัง 62', 'โกดัง 62', 'คลังสินค้า 62', 'WH62', 'Warehouse 62'],
  CMI01: ['เชียงใหม่', 'CMI', 'สาขาเชียงใหม่'],
  KK01: ['ขอนแก่น', 'KK', 'สาขาขอนแก่น'],
  KRI01: ['กาญจนบุรี', 'กาญจน์', 'KRI'],
  NRT: ['นครศรีธรรมราช', 'นครศรี', 'NRT'],
  PSNL01: ['พิษณุโลก', 'พิดโลก', 'PSNL'],
  ROI01: ['ร้อยเอ็ด', 'ROI'],
  SMK: ['สมุทรสาคร', 'มหาชัย', 'SMK'],
  SN01: ['สกลนคร', 'SN'],
  SRN01: ['สุรินทร์', 'SRN'],
  SRT01: ['สุราษฎร์ธานี', 'สุราษฎร์', 'SRT'],
  UB01: ['อุบลราชธานี', 'อุบล', 'UB'],
  UDN01: ['อุดรธานี', 'อุดร', 'UDN'],
};

export const DEFAULT_LOGISTICS_BRANCHES: LogisticsBranchOption[] = [
  { code: 'BKK-HQ', name: 'สำนักงานใหญ่', aliases: LOGISTICS_BRANCH_ALIASES['BKK-HQ'] },
  { code: 'BKK-WH', name: 'Tera Warehouse 62', aliases: LOGISTICS_BRANCH_ALIASES['BKK-WH'] },
  { code: 'SMK', name: 'สมุทรสาคร', aliases: LOGISTICS_BRANCH_ALIASES.SMK },
  { code: 'CMI01', name: 'เชียงใหม่', aliases: LOGISTICS_BRANCH_ALIASES.CMI01 },
  { code: 'KK01', name: 'ขอนแก่น', aliases: LOGISTICS_BRANCH_ALIASES.KK01 },
  { code: 'KRI01', name: 'กาญจนบุรี', aliases: LOGISTICS_BRANCH_ALIASES.KRI01 },
  { code: 'NRT', name: 'นครศรีธรรมราช', aliases: LOGISTICS_BRANCH_ALIASES.NRT },
  { code: 'PSNL01', name: 'พิษณุโลก', aliases: LOGISTICS_BRANCH_ALIASES.PSNL01 },
  { code: 'ROI01', name: 'ร้อยเอ็ด', aliases: LOGISTICS_BRANCH_ALIASES.ROI01 },
  { code: 'SN01', name: 'สกลนคร', aliases: LOGISTICS_BRANCH_ALIASES.SN01 },
  { code: 'SRN01', name: 'สุรินทร์', aliases: LOGISTICS_BRANCH_ALIASES.SRN01 },
  { code: 'SRT01', name: 'สุราษฎร์ธานี', aliases: LOGISTICS_BRANCH_ALIASES.SRT01 },
  { code: 'UB01', name: 'อุบลราชธานี', aliases: LOGISTICS_BRANCH_ALIASES.UB01 },
  { code: 'UDN01', name: 'อุดรธานี', aliases: LOGISTICS_BRANCH_ALIASES.UDN01 },
];

export function filterLogisticsVehicles(
  list: LogisticsVehicleOption[],
  query: string
): LogisticsVehicleOption[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  const tokens = q.split(/\s+/).filter(Boolean);
  return list.filter((v) => {
    const hay = [
      v.assetId,
      v.name,
      v.vehicleModel || '',
      v.vehicleType || '',
      v.companyOwner || '',
      v.mainUser || '',
      v.mainUserNickname || '',
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });
}

export function filterLogisticsCrewMembers(
  list: LogisticsCrewMember[],
  query: string
): LogisticsCrewMember[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  const tokens = q.split(/\s+/).filter(Boolean);
  return list.filter((m) => {
    const hay = [
      m.fullName,
      m.nickname || '',
      m.employeeId || '',
      m.position || '',
      m.role || '',
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });
}

export function filterLogisticsBranches(
  list: LogisticsBranchOption[],
  query: string
): LogisticsBranchOption[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  const tokens = q.split(/\s+/).filter(Boolean);
  return list.filter((b) => {
    const hay = [b.code, b.name, ...(b.aliases || [])].join(' ').toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });
}

export interface JobLogisticsLinkInfo {
  tripId: string;
  tripNumber: string;
  tripStatus: LogisticsTripStatus;
  tripDate: string;
  departureTime: string | null;
  transportType: 'INTERNAL' | 'EXTERNAL';
  vehiclePlate: string | null;
  courierName: string | null;
  driverName: string;
  stopId: string;
  stopOrder: number;
  stopStatus: LogisticsStopStatus;
  checkedInAt: string | null;
  deliveredAt: string | null;
  receiverName: string | null;
  failReason: string | null;
  trackingNumber: string | null;
}

/**
 * Combines a trip calendar date (in Asia/Bangkok) and a 24-hour `HH.mm` time string into a Date.
 */
export function combineBangkokDateAndTime(
  tripDate: string | Date,
  departureTime?: string | null
): Date {
  const baseDate = tripDate instanceof Date ? tripDate : new Date(tripDate);
  const dateKey = toBangkokDateKey(baseDate);
  const parsedTime = parseLogisticsTime24(departureTime);
  if (dateKey && parsedTime.ok && parsedTime.dot24) {
    const [hh, mm] = parsedTime.dot24.split('.');
    return new Date(`${dateKey}T${hh}:${mm}:00.000+07:00`);
  }
  return baseDate;
}

export interface RawJobLogisticsStopRow {
  id: string;
  stopOrder: number;
  sourceType: string;
  jobId: string | null;
  repairDeliveryId: string | null;
  status: string;
  checkedInAt: Date | string | null;
  deliveredAt: Date | string | null;
  receiverName: string | null;
  failReason: string | null;
  trackingNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  trip: {
    id: string;
    tripNumber: string;
    status: string;
    tripDate: Date | string;
    departureTime: string | null;
    transportType: string;
    vehiclePlate: string | null;
    courierName: string | null;
    driverName: string;
  };
}

/**
 * Picks the most relevant non-cancelled Logistics stop per jobId so `/jobs` shows live delivery progress.
 */
export function pickPrimaryJobLogisticsLinks(
  rows: RawJobLogisticsStopRow[],
  rdToJobMap?: Map<string, string>
): Map<string, JobLogisticsLinkInfo> {
  const rankStop = (r: RawJobLogisticsStopRow): number => {
    const tStatus = r.trip.status;
    const sStatus = r.status;
    const isActiveTrip = tStatus === 'PLANNED' || tStatus === 'LOADING' || tStatus === 'IN_TRANSIT';
    if (isActiveTrip && sStatus !== 'FAILED' && sStatus !== 'RESCHEDULED') {
      if (sStatus === 'DELIVERED') return 50;
      if (sStatus === 'ARRIVED') return 45;
      if (sStatus === 'PICKED_UP') return 42;
      return 40;
    }
    if (sStatus === 'DELIVERED') return 35;
    if (sStatus === 'RESCHEDULED') return 20;
    if (sStatus === 'FAILED') return 15;
    return 10;
  };

  const toTimestamp = (v?: Date | string | null) => (v ? new Date(v).getTime() || 0 : 0);

  const picked = new Map<string, { score: number; ts: number; info: JobLogisticsLinkInfo }>();

  for (const r of rows) {
    if (r.trip.status === 'CANCELLED') continue;
    const resolvedJobId =
      r.jobId || (r.repairDeliveryId && rdToJobMap ? rdToJobMap.get(r.repairDeliveryId) : undefined);
    if (!resolvedJobId) continue;

    const score = rankStop(r);
    const ts =
      toTimestamp(r.deliveredAt) ||
      toTimestamp(r.updatedAt) ||
      toTimestamp(r.createdAt);

    const prev = picked.get(resolvedJobId);
    if (prev && (prev.score > score || (prev.score === score && prev.ts >= ts))) {
      continue;
    }

    picked.set(resolvedJobId, {
      score,
      ts,
      info: {
        tripId: r.trip.id,
        tripNumber: r.trip.tripNumber,
        tripStatus: (r.trip.status || 'PLANNED') as LogisticsTripStatus,
        tripDate: new Date(r.trip.tripDate).toISOString(),
        departureTime: r.trip.departureTime ?? null,
        transportType: r.trip.transportType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
        vehiclePlate: r.trip.vehiclePlate ?? null,
        courierName: r.trip.courierName ?? null,
        driverName: r.trip.driverName,
        stopId: r.id,
        stopOrder: r.stopOrder,
        stopStatus: (r.status || 'PENDING') as LogisticsStopStatus,
        checkedInAt: r.checkedInAt ? new Date(r.checkedInAt).toISOString() : null,
        deliveredAt: r.deliveredAt ? new Date(r.deliveredAt).toISOString() : null,
        receiverName: r.receiverName ?? null,
        failReason: r.failReason ?? null,
        trackingNumber: r.trackingNumber ?? null,
      },
    });
  }

  return new Map(Array.from(picked.entries()).map(([jobId, entry]) => [jobId, entry.info]));
}

export interface JobLogisticsDisplayState {
  badgeLabel: string;
  mobileBadgeLabel: string;
  badgeClass: string;
  tooltip?: string;
  subLabel?: string | null;
  subClass?: string;
  kind: 'done' | 'mismatch' | 'waiting_payment' | 'logistics' | 'default';
}

/**
 * Resolves the status badge and compact logistics sub-status rendered in `/jobs` table and mobile cards.
 */
export function resolveJobLogisticsDisplayState(params: {
  currentStep: string;
  defaultLabel: string;
  logistics?: JobLogisticsLinkInfo | null;
  isDone: boolean;
  hasMismatch: boolean;
  mismatchMessage?: string | null;
  isWaitingPayment: boolean;
  settledTasks: number;
  totalTasks: number;
  closeBlockReason?: string | null;
}): JobLogisticsDisplayState {
  const {
    currentStep,
    defaultLabel,
    logistics,
    isDone,
    hasMismatch,
    mismatchMessage,
    isWaitingPayment,
    settledTasks,
    totalTasks,
    closeBlockReason,
  } = params;

  const tripScheduleText = logistics
    ? `${formatThaiDateSlash(logistics.tripDate)}${logistics.departureTime ? ` ${logistics.departureTime} น.` : ''}`
    : '';

  if (isDone) {
    return {
      kind: 'done',
      badgeLabel: 'เสร็จสมบูรณ์',
      mobileBadgeLabel: 'เสร็จแล้ว',
      badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      subLabel:
        logistics?.stopStatus === 'DELIVERED'
          ? `ส่งแล้ว · ${logistics.tripNumber}${logistics.deliveredAt ? ` (${formatThaiTime24Dot(logistics.deliveredAt)} น.)` : ''}`
          : null,
      subClass: 'text-emerald-600',
    };
  }

  if (hasMismatch) {
    return {
      kind: 'mismatch',
      badgeLabel: 'ปิดไม่ได้ (ยอดไม่ตรงบัญชี)',
      mobileBadgeLabel: 'ยอดไม่ตรงบัญชี',
      badgeClass: 'bg-rose-50 border-rose-200 text-rose-700',
      tooltip: mismatchMessage || undefined,
      subLabel:
        logistics?.stopStatus === 'DELIVERED' ? `ส่งมอบแล้ว (${logistics.tripNumber})` : null,
      subClass: 'text-slate-500',
    };
  }

  if (isWaitingPayment) {
    return {
      kind: 'waiting_payment',
      badgeLabel: `ปิดไม่ได้ (รอรับชำระครบ ${settledTasks}/${totalTasks})`,
      mobileBadgeLabel: `รอรับชำระครบ (${settledTasks}/${totalTasks})`,
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-800',
      tooltip: closeBlockReason || undefined,
      subLabel:
        logistics?.stopStatus === 'DELIVERED'
          ? `ส่งมอบแล้ว · ${logistics.tripNumber}${logistics.deliveredAt ? ` (${formatThaiTime24Dot(logistics.deliveredAt)} น.)` : ''}`
          : null,
      subClass: 'text-emerald-700',
    };
  }

  const responsibleLabel = logistics
    ? logistics.driverName || logistics.courierName || 'ขนส่งนอก'
    : '';

  const isDeliveryStep = currentStep === 'delivery' || currentStep === 'service_return';

  if (isDeliveryStep && logistics) {
    if (logistics.stopStatus === 'DELIVERED') {
      return {
        kind: 'logistics',
        badgeLabel: 'ส่งมอบแล้ว (POD)',
        mobileBadgeLabel: 'ส่งมอบแล้ว (POD)',
        badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        tooltip: `ทริป ${logistics.tripNumber} ปิดส่ง POD แล้ว${logistics.receiverName ? ` · ผู้รับ: ${logistics.receiverName}` : ''}`,
        subLabel: `${logistics.tripNumber}${logistics.deliveredAt ? ` · ${formatThaiTime24Dot(logistics.deliveredAt)} น.` : ''}`,
        subClass: 'text-emerald-700',
      };
    }
    if (logistics.stopStatus === 'FAILED') {
      return {
        kind: 'logistics',
        badgeLabel: 'จัดส่งไม่สำเร็จ',
        mobileBadgeLabel: 'ส่งไม่สำเร็จ',
        badgeClass: 'bg-rose-50 border-rose-200 text-rose-700',
        tooltip: logistics.failReason || `ทริป ${logistics.tripNumber}`,
        subLabel: logistics.failReason || logistics.tripNumber,
        subClass: 'text-rose-600',
      };
    }
    if (logistics.stopStatus === 'RESCHEDULED') {
      return {
        kind: 'logistics',
        badgeLabel: 'เลื่อนนัดจัดส่ง',
        mobileBadgeLabel: 'เลื่อนนัดส่ง',
        badgeClass: 'bg-orange-50 border-orange-200 text-orange-800',
        tooltip: logistics.failReason || `ทริป ${logistics.tripNumber}`,
        subLabel: logistics.failReason || logistics.tripNumber,
        subClass: 'text-orange-700',
      };
    }
    if (logistics.stopStatus === 'ARRIVED') {
      return {
        kind: 'logistics',
        badgeLabel: 'ถึงหน้างานแล้ว',
        mobileBadgeLabel: 'ถึงหน้างานแล้ว',
        badgeClass: 'bg-blue-50 border-blue-200 text-blue-700',
        tooltip: `ทริป ${logistics.tripNumber} เช็กอินถึงหน้างานแล้ว (${responsibleLabel})`,
        subLabel: `${logistics.tripNumber} · ${tripScheduleText}`,
        subClass: 'text-blue-700',
      };
    }
    if (logistics.tripStatus === 'IN_TRANSIT') {
      return {
        kind: 'logistics',
        badgeLabel: 'กำลังจัดส่ง',
        mobileBadgeLabel: 'กำลังจัดส่ง',
        badgeClass: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        tooltip: `ทริป ${logistics.tripNumber} กำลังวิ่งจัดส่ง (${responsibleLabel})`,
        subLabel: `${logistics.tripNumber} · ${tripScheduleText}`,
        subClass: 'text-indigo-700',
      };
    }
    if (logistics.tripStatus === 'LOADING' || logistics.stopStatus === 'PICKED_UP') {
      return {
        kind: 'logistics',
        badgeLabel: 'กำลังขึ้นของขึ้นรถ',
        mobileBadgeLabel: 'กำลังขึ้นของ',
        badgeClass: 'bg-amber-50 border-amber-200 text-amber-800',
        tooltip: `ทริป ${logistics.tripNumber} กำลังเตรียม/โหลดของขึ้นรถ`,
        subLabel: `${logistics.tripNumber} · ${tripScheduleText}`,
        subClass: 'text-amber-700',
      };
    }
    return {
      kind: 'logistics',
      badgeLabel: 'จัดคิวรถแล้ว',
      mobileBadgeLabel: 'จัดคิวรถแล้ว',
      badgeClass: 'bg-sky-50 border-sky-200 text-sky-700',
      tooltip: `จัดคิวรถทริป ${logistics.tripNumber} · ${tripScheduleText} (${responsibleLabel})`,
      subLabel: `${logistics.tripNumber} · ${tripScheduleText}`,
      subClass: 'text-sky-700',
    };
  }

  return {
    kind: 'default',
    badgeLabel: defaultLabel,
    mobileBadgeLabel: defaultLabel,
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-700',
    subLabel: logistics ? `จองคิวส่งล่วงหน้า: ${logistics.tripNumber} (${tripScheduleText})` : null,
    subClass: 'text-sky-700',
  };
}

const JOB_MONTH_SHORT = [
  '',
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May.',
  'Jun.',
  'Jul.',
  'Aug.',
  'Sep.',
  'Oct.',
  'Nov.',
  'Dec.',
];

/**
 * Formats delivery date (and time when a Logistics trip/POD provides it) consistently in Asia/Bangkok.
 */
export function formatJobDeliveryDateTime(
  deliveryDate?: Date | string | null,
  logistics?: JobLogisticsLinkInfo | null
): { dateText: string; timeText: string | null; isActualDelivered: boolean; isScheduledTrip: boolean } {
  const isActualDelivered = Boolean(logistics?.stopStatus === 'DELIVERED' && logistics.deliveredAt);
  const isScheduledTrip = Boolean(logistics && !isActualDelivered);
  const rawDate =
    (isActualDelivered ? logistics?.deliveredAt : null) ||
    deliveryDate ||
    logistics?.tripDate ||
    null;

  if (!rawDate) {
    return { dateText: '-', timeText: null, isActualDelivered: false, isScheduledTrip: false };
  }

  const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (Number.isNaN(d.getTime())) {
    return { dateText: '-', timeText: null, isActualDelivered: false, isScheduledTrip: false };
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(d);
  const dayNum = Number(parts.find((p) => p.type === 'day')?.value || d.getDate());
  const monthNum = Number(parts.find((p) => p.type === 'month')?.value || d.getMonth() + 1);
  const yearCe = Number(parts.find((p) => p.type === 'year')?.value || d.getFullYear());
  const dateText = `${dayNum} ${JOB_MONTH_SHORT[monthNum] || ''} ${yearCe + 543}`;

  let timeText: string | null = null;
  if (isActualDelivered && logistics?.deliveredAt) {
    const t = formatThaiTime24Dot(logistics.deliveredAt);
    if (t) timeText = `${t} น.`;
  } else if (logistics?.departureTime) {
    timeText = `${logistics.departureTime} น.`;
  }

  return { dateText, timeText, isActualDelivered, isScheduledTrip };
}
