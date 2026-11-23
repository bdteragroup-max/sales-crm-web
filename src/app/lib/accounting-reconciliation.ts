export type AccountingDocType = 'TAX_INVOICE' | 'RECEIPT' | 'TAX_INVOICE_RECEIPT';

export type AccountingTaxDocument = {
  id: string;
  docType: AccountingDocType;
  docNumber: string;
  docDate?: string | null;
  note?: string | null;
};

export type QuotationAmountLike = {
  totalAmountBeforeVat?: number | null;
  actualClosingAmount?: number | null;
  salesBeforeVat?: number | null;
} | null | undefined;

export type AccountingAmountReconciliation = {
  hasAccountingVerifiedAmount: boolean;
  accountingBeforeVat: number | null;
  quotationBeforeVat: number | null;
  differenceAmount: number | null;
  isMatched: boolean;
  hasMismatch: boolean;
  authoritativeBeforeVat: number | null;
  isAccountingClosed: boolean;
  mismatchMessage: string | null;
};

const VALID_DOC_TYPES = new Set<AccountingDocType>([
  'TAX_INVOICE',
  'RECEIPT',
  'TAX_INVOICE_RECEIPT',
]);

export function formatAccountingDocTypeLabel(docType: string): string {
  if (docType === 'RECEIPT') return 'ใบเสร็จรับเงิน';
  if (docType === 'TAX_INVOICE_RECEIPT') return 'ใบกำกับภาษี / ใบเสร็จรับเงิน';
  return 'ใบกำกับภาษี';
}

export function normalizeAccountingDocDateString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() >= 2500) {
    d.setUTCFullYear(d.getUTCFullYear() - 543);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Safely normalizes unlimited accounting tax invoice / receipt document entries stored in JSONB.
 */
export function parseAccountingTaxDocuments(raw: unknown): AccountingTaxDocument[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  } else {
    return [];
  }

  const normalized: AccountingTaxDocument[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const docNumber = typeof obj.docNumber === 'string' ? obj.docNumber.trim() : '';
    if (!docNumber) continue;

    const rawType = typeof obj.docType === 'string' ? obj.docType.trim().toUpperCase() : 'TAX_INVOICE';
    const docType: AccountingDocType = VALID_DOC_TYPES.has(rawType as AccountingDocType)
      ? (rawType as AccountingDocType)
      : 'TAX_INVOICE';

    const dedupeKey = `${docType}:${docNumber.toUpperCase()}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const docDate = normalizeAccountingDocDateString(
      typeof obj.docDate === 'string' ? obj.docDate : null
    );
    const note = typeof obj.note === 'string' && obj.note.trim() ? obj.note.trim() : null;
    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : `doc-${i}-${docNumber}`;

    normalized.push({ id, docType, docNumber, docDate, note });
  }

  return normalized;
}

function roundMoney2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves the authoritative pre-VAT amount from a Sales Quotation.
 * Uses `actualClosingAmount` ("ยอดปิดงานจริง (ก่อน VAT)") when provided and not a legacy 1.07x VAT-inclusive copy;
 * otherwise falls back cleanly to `totalAmountBeforeVat` / `salesBeforeVat`.
 */
export function resolveQuotationAmountBeforeVat(quotation: QuotationAmountLike): number | null {
  if (!quotation) return null;

  const totalBefore = Number(quotation.totalAmountBeforeVat);
  const salesBefore = Number(quotation.salesBeforeVat);
  const actualClosing = Number(quotation.actualClosingAmount);

  const hasValidTotal = Number.isFinite(totalBefore) && totalBefore > 0;
  const hasValidSales = Number.isFinite(salesBefore) && salesBefore > 0;
  const hasValidClosing = Number.isFinite(actualClosing) && actualClosing > 0;

  if (hasValidClosing) {
    // Guard legacy cases where VAT-inclusive (1.07x) was stored into actualClosingAmount
    if (hasValidTotal && Math.abs(actualClosing - totalBefore * 1.07) <= 2) {
      return roundMoney2(totalBefore);
    }
    return roundMoney2(actualClosing);
  }
  if (hasValidTotal) return roundMoney2(totalBefore);
  if (hasValidSales) return roundMoney2(salesBefore);
  return null;
}

/**
 * Compares Accounting's verified pre-VAT amount against the Sales Quotation pre-VAT amount.
 * When they do not match, Accounting's amount is treated as authoritative and Job closing / Commission request are blocked
 * until Sales updates the Quotation amount to match Accounting.
 */
export function evaluateAccountingAmountReconciliation(params: {
  accountingVerifiedBeforeVat?: number | null;
  accountingClosedAt?: Date | string | null;
  quotation?: QuotationAmountLike;
}): AccountingAmountReconciliation {
  const rawAcct = params.accountingVerifiedBeforeVat;
  const acctNum =
    rawAcct !== null && rawAcct !== undefined && Number.isFinite(Number(rawAcct))
      ? roundMoney2(Number(rawAcct))
      : null;

  const hasAccountingVerifiedAmount = acctNum !== null && acctNum > 0;
  const quotationBeforeVat = resolveQuotationAmountBeforeVat(params.quotation);
  const hasQuotation = params.quotation !== null && params.quotation !== undefined;

  let differenceAmount: number | null = null;
  let hasMismatch = false;
  let isMatched = false;

  if (hasAccountingVerifiedAmount && hasQuotation) {
    const compareQt = quotationBeforeVat ?? 0;
    differenceAmount = roundMoney2(acctNum - compareQt);
    if (Math.abs(differenceAmount) <= 0.01) {
      isMatched = true;
      hasMismatch = false;
      differenceAmount = 0;
    } else {
      isMatched = false;
      hasMismatch = true;
    }
  } else if (hasAccountingVerifiedAmount && !hasQuotation) {
    isMatched = true;
    hasMismatch = false;
  }

  const authoritativeBeforeVat = hasAccountingVerifiedAmount ? acctNum : quotationBeforeVat;
  const isAccountingClosed = Boolean(params.accountingClosedAt);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const mismatchMessage =
    hasMismatch && acctNum !== null
      ? `ยอดก่อน VAT ไม่ตรงกัน: ฝ่ายบัญชี ${fmt(acctNum)} บาท ≠ ใบเสนอราคา ${fmt(quotationBeforeVat ?? 0)} บาท (ยึดยอดบัญชีเป็นหลัก กรุณาให้เซลล์แก้ไขยอดให้ตรงกันก่อนปิด Job / ขอค่าคอมมิชชั่น)`
      : null;

  return {
    hasAccountingVerifiedAmount,
    accountingBeforeVat: acctNum,
    quotationBeforeVat,
    differenceAmount,
    isMatched,
    hasMismatch,
    authoritativeBeforeVat,
    isAccountingClosed,
    mismatchMessage,
  };
}
