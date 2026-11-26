/**
 * Shared pure helpers for material requisition returnability rules and labels.
 *
 * Business rules:
 * - CLAIM (เบิกเคลม) and PROJECT (เบิกของงานโครงการ) do not return items to the store.
 * - BORROW_EQUIPMENT (เบิกยืมสโตร์) requires store return tracking.
 */

export function isNonReturnableRequisitionType(
  requisitionType?: string | null
): boolean {
  return requisitionType === 'CLAIM' || requisitionType === 'PROJECT';
}

export function getCompletedStatusLabel(
  requisitionType?: string | null,
  variant: 'STORE' | 'SUMMARY' = 'STORE'
): string {
  if (requisitionType === 'CLAIM') {
    return variant === 'SUMMARY'
      ? 'ส่งมอบเคลมแล้ว (ไม่ต้องคืน)'
      : 'ส่งมอบเคลมแล้ว (ไม่คืนของ)';
  }
  if (requisitionType === 'PROJECT') {
    return variant === 'SUMMARY'
      ? 'ส่งมอบโครงการแล้ว (ไม่ต้องคืน)'
      : 'ส่งมอบโครงการแล้ว (ไม่คืนของ)';
  }
  return variant === 'SUMMARY'
    ? 'ส่งมอบแล้ว / รอคืน'
    : 'ส่งมอบแล้ว (รอคืน/ใช้งาน)';
}

export function getNonReturnableLabel(
  requisitionType?: string | null,
  compact = false
): string {
  if (requisitionType === 'CLAIM') {
    return compact ? 'ไม่ต้องคืน (เคลม)' : 'ไม่ต้องคืน (เบิกเคลม)';
  }
  if (requisitionType === 'PROJECT') {
    return compact ? 'ไม่ต้องคืน (โครงการ)' : 'ไม่ต้องคืน (เบิกโครงการ)';
  }
  return 'ไม่ต้องคืน';
}

export function getNonReturnableErrorMessage(
  requisitionType?: string | null
): string {
  if (requisitionType === 'PROJECT') {
    return 'รายการเบิกโครงการไม่มีการคืนสินค้าเข้าคลัง';
  }
  return 'รายการเบิกเคลมไม่มีการคืนสินค้าเข้าคลัง';
}

export function getNonReturnableBadgeClass(
  requisitionType?: string | null
): string {
  if (requisitionType === 'CLAIM') {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

export interface EditableRequisitionItem {
  detail: string;
  assetCode?: string;
  quantity: number | string;
  unit: string;
  condition?: string;
  job?: string;
  remark?: string;
  returnedQuantity?: number;
  returnDate?: string;
  returnCondition?: string;
  returnRemark?: string;
  returnReceiver?: string;
  returnerName?: string;
}

const STORE_ROLE_KEYWORDS = [
  'store',
  'สโตร์',
  'คลังสินค้า',
  'warehouse',
  'admin',
  'ซุปเปอร์แอดมิน',
];

const PURCHASING_ROLE_KEYWORDS = [
  'purchasing',
  'purchase',
  'procurement',
  'จัดซื้อ',
];

const TRANSPORT_ROLE_KEYWORDS = [
  'ขนส่ง',
  'shipping',
  'transport',
  'logistics',
  'โลจิสติกส์',
  'driver',
  'จัดส่ง',
];

const ACCOUNTING_REQUISITION_ROLE_KEYWORDS = [
  'บัญชี',
  'accounting',
  'accountant',
  'finance',
  'การเงิน',
];

/** Checks whether the given role belongs to Store / Warehouse / Admin operations. */
export function isStoreRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return STORE_ROLE_KEYWORDS.some((kw) => r.includes(kw));
}

/** Checks whether the given role belongs to the Purchasing / Procurement team (จัดซื้อ). */
export function isPurchasingRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return PURCHASING_ROLE_KEYWORDS.some((kw) => r.includes(kw));
}

/** Checks whether the given role belongs to Transport / Logistics (ขนส่ง). */
export function isTransportRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return TRANSPORT_ROLE_KEYWORDS.some((kw) => r.includes(kw));
}

/** Checks whether the given role belongs to Accounting / Finance (แผนกบัญชี). */
export function isAccountingRequisitionRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return ACCOUNTING_REQUISITION_ROLE_KEYWORDS.some((kw) => r.includes(kw));
}

/** Checks whether the given role can manage Store requisition workflows (Store or Purchasing). */
export function isStoreOrPurchasingRole(role?: string | null): boolean {
  return isStoreRole(role) || isPurchasingRole(role);
}

/** Checks whether the given role should view all requisitions across departments (Store, Purchasing, Transport, Accounting). */
export function canViewAllRequisitionsRole(role?: string | null): boolean {
  return (
    isStoreOrPurchasingRole(role) ||
    isTransportRole(role) ||
    isAccountingRequisitionRole(role)
  );
}

/** Checks whether the given role can record Accounting release acknowledgment on requisitions (strictly Accounting roles only). */
export function canSignAccountingRequisitionRole(role?: string | null): boolean {
  return isAccountingRequisitionRole(role);
}

export type RequisitionTransportMode = 'INTERNAL' | 'EXTERNAL';

/** Normalizes transport mode value to INTERNAL (ขนส่งบริษัท) or EXTERNAL (ขนส่งนอก). */
export function normalizeRequisitionTransportType(
  value?: string | null
): RequisitionTransportMode {
  return String(value || '').toUpperCase().trim() === 'EXTERNAL'
    ? 'EXTERNAL'
    : 'INTERNAL';
}

/** Builds a human-readable position/channel label for the Transport pickup signature box. */
export function formatTransportRoleSubtitle(
  transportType?: string | null,
  transportCompany?: string | null
): string {
  const mode = normalizeRequisitionTransportType(transportType);
  const company = (transportCompany || '').trim();
  if (mode === 'EXTERNAL') {
    return company ? `ขนส่งนอก (${company})` : 'ขนส่งนอก / ผู้เข้ารับสินค้า';
  }
  return company ? `ขนส่งบริษัท (${company})` : 'ขนส่งบริษัท / ผู้เข้ารับสินค้า';
}

/** Normalizes and filters requisition item rows before persisting to the database. */
export function sanitizeRequisitionItemsForSave(
  items: EditableRequisitionItem[]
): EditableRequisitionItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const detail = String(item?.detail ?? '').trim();
      const rawQty = Number(item?.quantity);
      const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
      const unit = String(item?.unit ?? '').trim() || 'ชิ้น';
      const cleaned: EditableRequisitionItem = {
        ...item,
        detail,
        quantity,
        unit,
      };
      if (item?.assetCode !== undefined) cleaned.assetCode = String(item.assetCode).trim();
      if (item?.condition !== undefined) cleaned.condition = String(item.condition).trim();
      if (item?.job !== undefined) cleaned.job = String(item.job).trim();
      if (item?.remark !== undefined) cleaned.remark = String(item.remark).trim();
      return cleaned;
    })
    .filter((item) => item.detail.length > 0);
}

/** Creates a default empty row matching the requisition type schema. */
export function createEmptyRequisitionItem(
  requisitionType?: string | null,
  defaultJob?: string | null
): EditableRequisitionItem {
  if (requisitionType === 'BORROW_EQUIPMENT') {
    return {
      detail: '',
      assetCode: '',
      quantity: 1,
      unit: 'เครื่อง',
      condition: 'ปกติ',
      remark: '',
    };
  }
  if (requisitionType === 'CLAIM') {
    return {
      detail: '',
      assetCode: '',
      quantity: 1,
      unit: 'ชิ้น',
      job: (defaultJob || '').trim(),
      remark: '',
    };
  }
  return {
    detail: '',
    quantity: 1,
    unit: 'ชิ้น',
    job: (defaultJob || '').trim(),
    remark: '',
  };
}

/** Returns common unit options matching the requisition type for autocomplete datalists. */
export function getUnitSuggestionsForRequisitionType(
  requisitionType?: string | null
): string[] {
  if (requisitionType === 'BORROW_EQUIPMENT') {
    return ['เครื่อง', 'ตัว', 'ชุด', 'กล่อง', 'อัน', 'ปาก', 'ชิ้น'];
  }
  return ['ชิ้น', 'เมตร', 'ม้วน', 'เส้น', 'EA', 'กล่อง', 'ถุง', 'ชุด', 'ท่อน', 'อัน'];
}

export const REQUISITION_COMPANIES = ['Group', 'Electric', 'Power'] as const;
export type RequisitionCompanyName = (typeof REQUISITION_COMPANIES)[number];
export type RequisitionCompanyCode = 'TG' | 'TE' | 'TP';

const REQUISITION_COMPANY_DEFS: ReadonlyArray<{
  name: RequisitionCompanyName;
  code: RequisitionCompanyCode;
  codePattern: RegExp;
  nameKeywords: readonly string[];
}> = [
  {
    name: 'Group',
    code: 'TG',
    codePattern: /(?:^|[\s,(/-])tg(?:$|[\s,)/-])/i,
    nameKeywords: ['group', 'กรุ้ป', 'กรุ๊ป'],
  },
  {
    name: 'Electric',
    code: 'TE',
    codePattern: /(?:^|[\s,(/-])te(?:$|[\s,)/-])/i,
    nameKeywords: ['electric', 'อิเล็คทริค', 'อิเลคทริค', 'อิเล็กทริค'],
  },
  {
    name: 'Power',
    code: 'TP',
    codePattern: /(?:^|[\s,(/-])tp(?:$|[\s,)/-])/i,
    nameKeywords: ['power', 'เพาเวอร์', 'พาวเวอร์'],
  },
];

/**
 * Parse a requisition `company` field (single or comma-separated multi-company)
 * into canonical company names (`Group`, `Electric`, `Power`), up to 3 companies.
 */
export function parseRequisitionCompanies(
  value?: string | null
): RequisitionCompanyName[] {
  const raw = (value || '').trim();
  if (!raw) return [];

  const tokens = raw
    .split(/[,/&+|]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const matched = new Set<RequisitionCompanyName>();
  for (const token of tokens) {
    for (const def of REQUISITION_COMPANY_DEFS) {
      if (
        def.codePattern.test(token) ||
        def.nameKeywords.some((kw) => token.includes(kw))
      ) {
        matched.add(def.name);
      }
    }
  }

  return REQUISITION_COMPANIES.filter((name) => matched.has(name));
}

/** Return canonical short company codes (`TG`, `TE`, `TP`) matching the company value. */
export function getRequisitionCompanyCodes(
  value?: string | null
): RequisitionCompanyCode[] {
  const parsed = parseRequisitionCompanies(value);
  return parsed.map(
    (name) => REQUISITION_COMPANY_DEFS.find((def) => def.name === name)!.code
  );
}

/** Toggle a company inside a 1..maxCount multi-selection list, keeping canonical order. */
export function toggleRequisitionCompanySelection(
  current: readonly RequisitionCompanyName[],
  target: RequisitionCompanyName,
  maxCount = 3
): RequisitionCompanyName[] {
  const normalized = REQUISITION_COMPANIES.filter((c) => current.includes(c));
  const exists = normalized.includes(target);

  if (exists) {
    // Always keep at least 1 company selected
    if (normalized.length <= 1) return normalized;
    return normalized.filter((c) => c !== target);
  }

  if (normalized.length >= maxCount) return normalized;
  return REQUISITION_COMPANIES.filter((c) => c === target || normalized.includes(c));
}

/** Format 1..3 selected companies into the persistent DB string value. */
export function formatRequisitionCompanyValue(
  companies: readonly RequisitionCompanyName[]
): string {
  const canonical = REQUISITION_COMPANIES.filter((c) => companies.includes(c)).slice(
    0,
    3
  );
  return canonical.length > 0 ? canonical.join(', ') : 'Group';
}

/** Normalize incoming company input for server persistence, supporting up to 3 companies. */
export function normalizeRequisitionCompanyForSave(value?: string | null): string {
  const parsed = parseRequisitionCompanies(value);
  if (parsed.length > 0) {
    return formatRequisitionCompanyValue(parsed);
  }
  const trimmed = (value || '').trim();
  return trimmed || 'Group';
}

/** Format company display codes (e.g. `TG`, `TG, TE`, `TG, TE, TP`) for tables and exports. */
export function getRequisitionCompanyShortLabel(value?: string | null): string {
  const codes = getRequisitionCompanyCodes(value);
  if (codes.length > 0) return codes.join(', ');
  const trimmed = (value || '').trim();
  return trimmed || '-';
}

/**
 * Checks whether requester and approver are the same user
 * (enabling self-approval using the requester signature).
 */
export function canSelfApproveRequisition(
  requesterUserId?: string | null,
  approverId?: string | null
): boolean {
  return Boolean(requesterUserId && approverId && requesterUserId === approverId);
}
