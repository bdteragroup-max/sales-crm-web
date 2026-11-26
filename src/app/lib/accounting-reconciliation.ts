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

export type AccountingStepLogLike = {
  id?: string;
  step?: string | null;
  completedBy?: string | null;
  completedAt?: Date | string | null;
  note?: string | null;
};

const NON_DOC_NOTE_SET = new Set([
  'ปิดงานสมบูรณ์',
  'ตรวจสอบเอกสาร ปิดงานเสร็จสมบูรณ์ (Completed)',
  'ชำระเงินโอน',
  'ตรวจสอบยอดและปิดงานบัญชี',
  'ยืนยันรับเงินครบถ้วนจากหน้าบัญชี',
]);

/**
 * Extracts invoice / receipt tokens (e.g. TG691121009, RE691125001) from an accounting note or document text.
 */
export function extractInvoiceTokensFromNote(raw?: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];

  const parts = String(raw)
    .split(/[,;\n•|]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '-');

  for (const part of parts) {
    if (NON_DOC_NOTE_SET.has(part)) continue;
    if (/^(ดำเนินการอัตโนมัติ|ตีกลับ|ยกเลิก|ยืนยัน|ปิดงาน|ตรวจสอบ)/.test(part)) continue;
    if (!/^[A-Za-z]{2,6}[-/]?\d{3,}[A-Za-z0-9-]*$/.test(part)) continue;
    const key = part.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      tokens.push(part);
    }
  }

  return tokens;
}

/**
 * Converts completed accounting JobStepLog notes into normalized AccountingTaxDocument entries.
 */
export function extractAccountingDocsFromStepLogs(
  stepLogs?: AccountingStepLogLike[] | null
): AccountingTaxDocument[] {
  if (!Array.isArray(stepLogs) || stepLogs.length === 0) return [];
  const extracted: AccountingTaxDocument[] = [];
  const seenNumbers = new Set<string>();

  for (let i = 0; i < stepLogs.length; i++) {
    const log = stepLogs[i];
    if (log?.step !== 'accounting') continue;
    if (typeof log.note === 'string' && log.note.startsWith('ตีกลับ')) continue;
    const tokens = extractInvoiceTokensFromNote(log.note);
    const docDate = normalizeAccountingDocDateString(log.completedAt ?? null);
    for (const token of tokens) {
      const key = token.toUpperCase();
      if (seenNumbers.has(key)) continue;
      seenNumbers.add(key);
      const isReceipt = /^RE[-/]?\d/i.test(token);
      extracted.push({
        id: `steplog-doc-${log.id || i}-${key}`,
        docType: isReceipt ? 'RECEIPT' : 'TAX_INVOICE',
        docNumber: token,
        docDate,
        note: null,
      });
    }
  }

  return extracted;
}

/**
 * Returns the latest completed (non-rejected) `accounting` step log that occurred after any rejection back to `accounting`, if any.
 */
export function findCompletedAccountingStepLog<T extends AccountingStepLogLike>(
  stepLogs?: T[] | null
): T | null {
  if (!Array.isArray(stepLogs) || stepLogs.length === 0) return null;

  let latestRejectionMs = -Infinity;
  let latestRejectionIdx = -1;
  for (let i = 0; i < stepLogs.length; i++) {
    const log = stepLogs[i];
    if (typeof log?.note === 'string' && log.note.startsWith('ตีกลับไปที่ accounting')) {
      latestRejectionIdx = i;
      if (log.completedAt) {
        const ms = new Date(log.completedAt).getTime();
        if (Number.isFinite(ms) && ms > latestRejectionMs) {
          latestRejectionMs = ms;
        }
      }
    }
  }

  const matches = stepLogs.filter((log, idx) => {
    if (log?.step !== 'accounting') return false;
    if (typeof log?.note === 'string' && log.note.startsWith('ตีกลับ')) return false;
    if (latestRejectionIdx === -1) return true;
    if (latestRejectionMs > -Infinity && log.completedAt) {
      const ms = new Date(log.completedAt).getTime();
      if (Number.isFinite(ms)) return ms >= latestRejectionMs;
    }
    return idx > latestRejectionIdx;
  });

  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

export type PaymentTaskLinkLike = {
  id?: string;
  status?: string | null;
  installmentAmount?: number | null;
  paidAmount?: number | null;
  installmentNo?: number | null;
  installmentTotal?: number | null;
  creditType?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: Date | string | null;
};

export type PaymentTasksLinkState = {
  hasPaymentTasks: boolean;
  totalTasks: number;
  settledTasks: number;
  depositTasks: number;
  pendingTasks: number;
  allTasksSettled: boolean;
  hasUnsettledPaymentTasks: boolean;
  isInstallmentJob: boolean;
  isCreditJob: boolean;
  isCreditOrInstallment: boolean;
  hasUnsettledCreditOrInstallment: boolean;
  canCloseAccounting: boolean;
  totalScheduledAmount: number;
  settledAmount: number;
  linkedDocs: AccountingTaxDocument[];
  closeBlockReason: string | null;
};

/**
 * Extracts normalized tax invoice / receipt entries stored on PaymentTasks so they link cleanly with Accounting's document list.
 */
export function extractAccountingDocsFromPaymentTasks(
  paymentTasks?: PaymentTaskLinkLike[] | null
): AccountingTaxDocument[] {
  if (!Array.isArray(paymentTasks) || paymentTasks.length === 0) return [];
  const extracted: AccountingTaxDocument[] = [];
  const seenNumbers = new Set<string>();

  for (let i = 0; i < paymentTasks.length; i++) {
    const pt = paymentTasks[i];
    const rawNum = typeof pt?.invoiceNumber === 'string' ? pt.invoiceNumber.trim() : '';
    if (!rawNum || rawNum === '-') continue;

    const parsedTokens = extractInvoiceTokensFromNote(rawNum);
    const tokens =
      parsedTokens.length > 0
        ? parsedTokens
        : rawNum
            .split(/[,;\n•|]+/)
            .map((s) => s.trim())
            .filter((s) => s && s !== '-');

    const docDate = normalizeAccountingDocDateString(pt.invoiceDate ?? null);
    for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
      const token = tokens[tIdx];
      const key = token.toUpperCase();
      if (seenNumbers.has(key)) continue;
      seenNumbers.add(key);

      const isReceipt = /^RE[-/]?\d/i.test(token);
      extracted.push({
        id: `pt-doc-${pt.id || i}${tokens.length > 1 ? `-${tIdx}` : ''}`,
        docType: isReceipt ? 'RECEIPT' : 'TAX_INVOICE',
        docNumber: token,
        docDate,
        note: null,
      });
    }
  }

  return extracted;
}

/**
 * Merges incoming tax documents (such as newly confirmed PaymentTask invoice numbers) into an existing list without creating duplicates or dropping filled entries.
 */
export function mergeAccountingTaxDocuments(
  existingDocs: AccountingTaxDocument[],
  ...incomingLists: AccountingTaxDocument[][]
): AccountingTaxDocument[] {
  const nonEmptyExisting = (existingDocs || []).filter(
    (d) => typeof d.docNumber === 'string' && d.docNumber.trim() !== ''
  );
  const existingKeys = new Set(nonEmptyExisting.map((d) => d.docNumber.trim().toUpperCase()));
  const merged = [...nonEmptyExisting];

  for (const list of incomingLists) {
    for (const doc of list || []) {
      const num = typeof doc.docNumber === 'string' ? doc.docNumber.trim() : '';
      if (!num) continue;
      const key = num.toUpperCase();
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      merged.push({
        ...doc,
        docNumber: num,
        docDate: normalizeAccountingDocDateString(doc.docDate ?? null),
      });
    }
  }

  return merged;
}

/**
 * Single source of truth linking PaymentTasks (`งวดชำระเงิน & รอบส่งมอบ`) to Accounting verification close & Job completion:
 * - Credit / Installment jobs, or any job with unsettled PaymentTasks, cannot close Accounting or mark the Job completed until all PaymentTasks reach `'ตรวจสอบและบันทึกแล้ว'`.
 */
export function evaluatePaymentTasksLinkState(params: {
  paymentTasks?: PaymentTaskLinkLike[] | null;
  paymentMethod?: string | null;
  creditTerms?: string | null;
}): PaymentTasksLinkState {
  const tasks = Array.isArray(params.paymentTasks) ? params.paymentTasks : [];
  const totalTasks = tasks.length;
  const hasPaymentTasks = totalTasks > 0;
  const settledTasks = tasks.filter((t) => t?.status === 'ตรวจสอบและบันทึกแล้ว').length;
  const depositTasks = tasks.filter((t) => t?.status === 'ชำระมัดจำแล้ว').length;
  const pendingTasks = totalTasks - settledTasks;
  const allTasksSettled = hasPaymentTasks && settledTasks === totalTasks;
  const hasUnsettledPaymentTasks = hasPaymentTasks && settledTasks < totalTasks;

  const methodLower = String(params.paymentMethod || '').toLowerCase().trim();
  const creditTermsLower = String(params.creditTerms || '').toLowerCase().trim();

  const isInstallmentJob =
    methodLower.includes('ผ่อน') ||
    methodLower.includes('แบ่ง') ||
    methodLower.includes('installment') ||
    totalTasks > 1 ||
    tasks.some(
      (t) =>
        (t.installmentTotal ?? 0) > 1 ||
        t.creditType === 'DELIVERY' ||
        t.creditType === 'DEPOSIT' ||
        (t.installmentNo !== null &&
          t.installmentNo !== undefined &&
          t.installmentNo > 0 &&
          Number(t.installmentAmount || 0) > 0)
    );

  const isCreditJob =
    methodLower.includes('เครดิต') ||
    methodLower.includes('credit') ||
    creditTermsLower !== '' ||
    tasks.some((t) => {
      const ct = String(t.creditType || '').trim().toUpperCase();
      return Boolean(ct && ct !== 'PROGRESS' && ct !== 'DELIVERY' && ct !== 'DEPOSIT' && ct !== 'CASH');
    });

  const isCreditOrInstallment = isInstallmentJob || isCreditJob;
  const hasUnsettledCreditOrInstallment =
    (isCreditOrInstallment && !allTasksSettled) || (depositTasks > 0 && hasUnsettledPaymentTasks);
  const canCloseAccounting = !hasUnsettledPaymentTasks && !(isCreditOrInstallment && !allTasksSettled);

  const totalScheduledAmount = roundMoney2(
    tasks.reduce((sum, t) => sum + (Number(t.installmentAmount) || 0), 0)
  );
  const settledAmount = roundMoney2(
    tasks.reduce((sum, t) => {
      if (t?.status === 'ตรวจสอบและบันทึกแล้ว') {
        const inst = Number(t.installmentAmount) || 0;
        const paid = Number(t.paidAmount) || 0;
        return sum + (inst > 0 ? inst : paid);
      }
      if (t?.status === 'ชำระมัดจำแล้ว') {
        return sum + (Number(t.paidAmount) || 0);
      }
      return sum;
    }, 0)
  );

  const linkedDocs = extractAccountingDocsFromPaymentTasks(tasks);

  let closeBlockReason: string | null = null;
  if (!canCloseAccounting) {
    if (isInstallmentJob) {
      closeBlockReason = `งานผ่อนชำระยังตรวจสอบการรับเงินไม่ครบทุกงวด (ครบแล้ว ${settledTasks}/${totalTasks} งวด) — ยังไม่สามารถปิดงานได้`;
    } else if (isCreditJob) {
      closeBlockReason = hasPaymentTasks
        ? `งานเครดิตยังไม่ได้รับชำระเงินครบ (${settledTasks}/${totalTasks} รายการ) — ยังไม่สามารถปิดงานได้จนกว่าจะยืนยันรับเงินครบ`
        : 'งานเครดิตยังไม่มีรายการตรวจสอบการรับเงิน — ยังไม่สามารถปิดงานได้';
    } else if (depositTasks > 0) {
      closeBlockReason = `ชำระมัดจำบางส่วนแล้ว (รอชำระส่วนที่เหลืออีก ${pendingTasks} รายการ) — ยังไม่สามารถปิดงานได้`;
    } else {
      closeBlockReason = `ยังมีรายการงวดชำระเงินรอตรวจสอบ ${pendingTasks} รายการ — กรุณายืนยันรับเงินใน Payment Tasks ก่อนปิดงาน`;
    }
  }

  return {
    hasPaymentTasks,
    totalTasks,
    settledTasks,
    depositTasks,
    pendingTasks,
    allTasksSettled,
    hasUnsettledPaymentTasks,
    isInstallmentJob,
    isCreditJob,
    isCreditOrInstallment,
    hasUnsettledCreditOrInstallment,
    canCloseAccounting,
    totalScheduledAmount,
    settledAmount,
    linkedDocs,
    closeBlockReason,
  };
}

/**
 * Shared guard ensuring pre-paid jobs whose Accounting step has not yet confirmed
 * still wait for PaymentTask verification before closing the delivery step.
 */
export function evaluatePrepaidDeliveryBlockReason(params: {
  steps: Array<{ key: string }>;
  currentStepKey: string;
  stepLogs: Array<{ step: string }>;
  paymentTasks?: Array<
    PaymentTaskLinkLike & {
      paymentMethod?: string | null;
      job?: { paymentMethod?: string | null } | null;
    }
  > | null;
  paymentMethod?: string | null;
  creditTerms?: string | null;
}): string | null {
  if (!['store_send', 'delivery', 'complete'].includes(params.currentStepKey)) {
    return null;
  }

  const accountingIdx = params.steps.findIndex((s) => s.key === 'accounting');
  const currentIdx = params.steps.findIndex((s) => s.key === params.currentStepKey);
  const hasAccountingConfirmed =
    accountingIdx !== -1 &&
    currentIdx > accountingIdx &&
    params.stepLogs.some((l) => l.step === 'accounting');

  if (hasAccountingConfirmed) return null;

  const tasks = Array.isArray(params.paymentTasks) ? params.paymentTasks : [];
  const incompleteTask = tasks.find((pt) => pt?.status !== 'ตรวจสอบและบันทึกแล้ว');
  if (!incompleteTask) return null;

  const resolvedMethod = String(
    params.paymentMethod ||
      tasks[0]?.job?.paymentMethod ||
      tasks[0]?.paymentMethod ||
      ''
  ).toLowerCase();
  const resolvedCreditTerms = String(params.creditTerms || '').toLowerCase();
  const hasCreditTask = tasks.some(
    (pt) => Boolean(pt.creditType) || Boolean(pt.installmentTotal && pt.installmentTotal > 1)
  );

  const isInstallment =
    resolvedMethod.includes('ผ่อน') ||
    resolvedMethod.includes('แบ่ง') ||
    resolvedMethod.includes('installment');
  const isCredit =
    resolvedMethod.includes('เครดิต') ||
    resolvedMethod.includes('credit') ||
    resolvedCreditTerms !== '' ||
    hasCreditTask;
  const isCOD =
    resolvedMethod.includes('เก็บเงินหน้างาน') ||
    resolvedMethod.includes('หน้างาน') ||
    resolvedMethod.includes('cod');

  if (isInstallment || isCredit || isCOD) {
    return null;
  }

  const status = tasks[0]?.status || 'รอดำเนินการ';
  return `ระงับการดำเนินการชั่วคราว: รอฝ่ายบัญชีตรวจสอบการชำระเงิน (สถานะ: ${status})`;
}
