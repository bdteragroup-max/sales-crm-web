/**
 * Quotation Expiration & Follow-Up Extension Utility
 * 
 * Rules:
 * 1. Base Validity:
 *    - Solar Roof and MDB products: 60 days from issuance date (quotationDate, fallback to createdAt)
 *    - All other products: 30 days from issuance date
 * 2. Follow-Up Extension:
 *    - Customer follow-up (followUp1, followUp2, followUp3, followUp4) extends validity
 *      by 30 days from that follow-up date.
 *    - If multiple follow-up dates exist, the latest follow-up date is used.
 *    - Effective expiry = max(baseExpiry, latestFollowUp + 30 days)
 * 3. Status:
 *    - Expired quotes are marked as "หมดอายุ" ("Expired") rather than "Rejected" or "Cancelled".
 *    - Expired quotes are non-destructive and never deleted.
 */

export interface QuotationDateSource {
  quotationDate?: Date | string | null;
  createdAt?: Date | string | null;
  productType?: string | null;
  followUp1?: Date | string | null;
  followUp2?: Date | string | null;
  followUp3?: Date | string | null;
  followUp4?: Date | string | null;
  status?: string | null;
}

export interface QuotationExpirationResult {
  baseDays: number;
  issuanceDate: Date | null;
  baseExpiryDate: Date | null;
  latestFollowUpDate: Date | null;
  followUpExpiryDate: Date | null;
  effectiveExpiryDate: Date | null;
  isLongValidity: boolean;
  isExtendedByFollowUp: boolean;
  isExpired: boolean;
  daysRemaining: number;
  statusText: string;
}

/**
 * Checks if the product qualifies for the extended 60-day validity (Solar Roof & MDB).
 */
export function isLongValidityProduct(productType?: string | null): boolean {
  if (!productType) return false;
  const p = productType.trim().toLowerCase();
  return (
    p.includes('solar roof') ||
    p.includes('mdb') ||
    p === 'mdb/db'
  );
}

/**
 * Checks if a status is considered closed/won/lost where auto-expiration should not apply.
 */
export function isFinalizedStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim();
  return (
    s === 'เปิดบิลแล้ว' ||
    s.startsWith('PO') ||
    s === 'รอจัดทำ PO' ||
    s.startsWith('ปฏิเสธ') ||
    s.startsWith('ยกเลิก')
  );
}

/**
 * Calculates the expiration details and follow-up extensions for a quotation.
 */
export function calculateQuotationExpiration(
  q: QuotationDateSource,
  referenceDate: Date = new Date()
): QuotationExpirationResult {
  const isLong = isLongValidityProduct(q.productType);
  const baseDays = isLong ? 60 : 30;

  // 1. Issuance Date
  let issuanceDate: Date | null = null;
  if (q.quotationDate) {
    const d = new Date(q.quotationDate);
    if (!isNaN(d.getTime())) issuanceDate = d;
  }
  if (!issuanceDate && q.createdAt) {
    const d = new Date(q.createdAt);
    if (!isNaN(d.getTime())) issuanceDate = d;
  }

  // 2. Base Expiry Date
  let baseExpiryDate: Date | null = null;
  if (issuanceDate) {
    baseExpiryDate = new Date(issuanceDate.getTime() + baseDays * 24 * 60 * 60 * 1000);
  }

  // 3. Follow-Up Dates Extension
  const followUpCandidates = [q.followUp1, q.followUp2, q.followUp3, q.followUp4];
  const validFollowUps: Date[] = [];

  for (const f of followUpCandidates) {
    if (f) {
      const d = new Date(f);
      if (!isNaN(d.getTime())) validFollowUps.push(d);
    }
  }

  let latestFollowUpDate: Date | null = null;
  let followUpExpiryDate: Date | null = null;

  if (validFollowUps.length > 0) {
    latestFollowUpDate = new Date(Math.max(...validFollowUps.map(d => d.getTime())));
    // Follow-up adds 30 days from that follow-up date
    followUpExpiryDate = new Date(latestFollowUpDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // 4. Effective Expiry Date = max(baseExpiry, followUpExpiry)
  let effectiveExpiryDate: Date | null = null;
  let isExtendedByFollowUp = false;

  if (baseExpiryDate && followUpExpiryDate) {
    if (followUpExpiryDate.getTime() > baseExpiryDate.getTime()) {
      effectiveExpiryDate = followUpExpiryDate;
      isExtendedByFollowUp = true;
    } else {
      effectiveExpiryDate = baseExpiryDate;
    }
  } else {
    effectiveExpiryDate = followUpExpiryDate || baseExpiryDate;
  }

  // 5. Expiration & Days Remaining
  let isExpired = false;
  let daysRemaining = 0;
  let statusText = 'ไม่ระบุวันหมดอายุ';

  if (effectiveExpiryDate) {
    const diffMs = effectiveExpiryDate.getTime() - referenceDate.getTime();
    daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    isExpired = diffMs < 0;

    if (isExpired) {
      const daysAgo = Math.abs(daysRemaining);
      statusText = `หมดอายุแล้ว ${daysAgo} วัน`;
    } else if (daysRemaining === 0) {
      statusText = 'หมดอายุวันนี้';
    } else {
      statusText = `เหลือเวลาอีก ${daysRemaining} วัน`;
      if (isExtendedByFollowUp) {
        statusText += ' (ขยายเวลาจากการติดตาม)';
      }
    }
  }

  return {
    baseDays,
    issuanceDate,
    baseExpiryDate,
    latestFollowUpDate,
    followUpExpiryDate,
    effectiveExpiryDate,
    isLongValidity: isLong,
    isExtendedByFollowUp,
    isExpired,
    daysRemaining,
    statusText,
  };
}
