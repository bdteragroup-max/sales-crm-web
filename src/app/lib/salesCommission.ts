import { isCompleted, getSteps } from '@/app/lib/job-workflow';
import { isSalesRepOrSalesManagerRole, isSuperUser } from '@/app/lib/roleHelper';
import { buildThaiPersonNameVariants } from '@/app/lib/personName';
import { extractCompanyCode } from '@/utils/company-utils';
import {
  AccountingTaxDocument,
  evaluateAccountingAmountReconciliation,
  parseAccountingTaxDocuments,
} from '@/app/lib/accounting-reconciliation';

export type CommissionStatus =
  | 'NOT_ELIGIBLE'
  | 'READY'
  | 'SUBMITTED'
  | 'PENDING_PROFIT_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  NOT_ELIGIBLE: 'ไม่เข้าเงื่อนไขการยื่น',
  READY: 'พร้อมยื่นคำขอ',
  SUBMITTED: 'ยื่นคำขอแล้ว',
  PENDING_PROFIT_REVIEW: 'รอตรวจสอบ / ยืนยันกำไร',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  PAID: 'จ่ายแล้ว',
};

export const COMMISSION_STATUS_BADGE_CLASSES: Record<CommissionStatus, string> = {
  NOT_ELIGIBLE: 'bg-slate-100 text-slate-600 border-slate-200',
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUBMITTED: 'bg-sky-50 text-sky-700 border-sky-200',
  PENDING_PROFIT_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  PAID: 'bg-green-100 text-green-800 border-green-300',
};

export const COMMISSION_HIGH_PROFIT_THRESHOLD_PCT = 20;
export const COMMISSION_HIGH_TIER_RATE_PCT = 0.5;
export const COMMISSION_LOW_TIER_BASE_RATE_PCT = 0.25;

export function roundCurrency2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate6(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function calculateCommissionFromProfit(
  salesAmountExVat: number,
  confirmedProfitPct: number | null | undefined
): {
  ratePct: number | null;
  amount: number | null;
  awaitingProfitReview: boolean;
} {
  if (
    confirmedProfitPct === null ||
    confirmedProfitPct === undefined ||
    !Number.isFinite(confirmedProfitPct)
  ) {
    return {
      ratePct: null,
      amount: null,
      awaitingProfitReview: true,
    };
  }

  const safeSales = Number.isFinite(salesAmountExVat) && salesAmountExVat > 0 ? salesAmountExVat : 0;
  if (confirmedProfitPct <= 0 || safeSales <= 0) {
    return {
      ratePct: 0,
      amount: 0,
      awaitingProfitReview: false,
    };
  }

  const rawRate =
    confirmedProfitPct >= COMMISSION_HIGH_PROFIT_THRESHOLD_PCT
      ? COMMISSION_HIGH_TIER_RATE_PCT
      : (confirmedProfitPct * COMMISSION_LOW_TIER_BASE_RATE_PCT) /
        COMMISSION_HIGH_PROFIT_THRESHOLD_PCT;

  const ratePct = roundRate6(rawRate);
  const amount = roundCurrency2(safeSales * (rawRate / 100));

  return {
    ratePct,
    amount,
    awaitingProfitReview: false,
  };
}

export function deriveProfitPctFromCost(
  salesAmountExVat: number,
  costAmount: number
): number | null {
  if (!Number.isFinite(salesAmountExVat) || salesAmountExVat <= 0 || !Number.isFinite(costAmount)) {
    return null;
  }
  const pct = ((salesAmountExVat - costAmount) / salesAmountExVat) * 100;
  return Math.round((pct + Number.EPSILON) * 10000) / 10000;
}

export function deriveCostFromProfitPct(
  salesAmountExVat: number,
  profitPct: number
): number | null {
  if (!Number.isFinite(salesAmountExVat) || salesAmountExVat <= 0 || !Number.isFinite(profitPct)) {
    return null;
  }
  return roundCurrency2(salesAmountExVat * (1 - profitPct / 100));
}

export function resolveCostAndProfitInputs(
  salesAmountExVat: number,
  rawCostAmount: unknown,
  rawProfitPct: unknown
): { costAmount: number | null; profitPct: number } | { error: string } {
  let nextCostAmount: number | null = null;
  let nextProfitPct: number | null = null;

  if (rawProfitPct !== undefined && rawProfitPct !== null && rawProfitPct !== '') {
    const parsedProfit = Number(rawProfitPct);
    if (!Number.isFinite(parsedProfit)) {
      return { error: 'ตัวเลข % กำไรไม่ถูกต้อง' };
    }
    nextProfitPct = Math.round((parsedProfit + Number.EPSILON) * 10000) / 10000;
    if (rawCostAmount !== undefined && rawCostAmount !== null && rawCostAmount !== '') {
      const parsedCost = Number(rawCostAmount);
      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        return { error: 'ตัวเลขต้นทุนไม่ถูกต้อง' };
      }
      nextCostAmount = roundCurrency2(parsedCost);
    } else {
      nextCostAmount = deriveCostFromProfitPct(salesAmountExVat, nextProfitPct);
    }
  } else if (rawCostAmount !== undefined && rawCostAmount !== null && rawCostAmount !== '') {
    const parsedCost = Number(rawCostAmount);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      return { error: 'ตัวเลขต้นทุนไม่ถูกต้อง' };
    }
    nextCostAmount = roundCurrency2(parsedCost);
    nextProfitPct = deriveProfitPctFromCost(salesAmountExVat, nextCostAmount);
  } else {
    return { error: 'กรุณาระบุต้นทุนหรือ % กำไรเพื่อยืนยันความถูกต้อง' };
  }

  if (nextProfitPct === null || !Number.isFinite(nextProfitPct)) {
    return { error: 'ไม่สามารถคำนวณ % กำไรจากยอดขายได้' };
  }

  return { costAmount: nextCostAmount, profitPct: nextProfitPct };
}

export function isCommissionSuperAdmin(role: string | null | undefined): boolean {
  return isSuperUser(role);
}

export function canAccessCommissionRequestList(params: {
  role: string | null | undefined;
  department?: string | null | undefined;
}): boolean {
  if (isSuperUser(params.role)) return true;
  if (isSalesRepOrSalesManagerRole(params.role)) return true;
  const dept = (params.department || '').toLowerCase().trim();
  const r = (params.role || '').toLowerCase().trim();
  if (!r || r.includes('executive') || r.includes('ผู้บริหาร')) return false;
  if (['accounting', 'บัญชี', 'finance', 'การเงิน', 'marketing', 'การตลาด', 'store', 'สโตร์', 'purchasing', 'จัดซื้อ', 'service', 'บริการ', 'technician', 'ช่าง', 'hr', 'บุคคล'].some(k => r.includes(k) || dept.includes(k))) {
    return false;
  }
  return ['sale', 'ขาย', 'เซลล์', 'เซลส์'].some(k => dept.includes(k));
}

export function doesJobBelongToSalesUser(
  job: {
    sellerName?: string | null;
    quotation?: {
      salespersonId?: string | null;
      salesperson?: { id?: string | null; fullName?: string | null } | null;
    } | null;
  },
  user: {
    id: string;
    fullName?: string | null;
    employeeSaleName?: string | null;
    teraEmployeeName?: string | null;
  }
): boolean {
  if (job.quotation?.salespersonId && job.quotation.salespersonId === user.id) {
    return true;
  }
  const userVariants = new Set(
    buildThaiPersonNameVariants(
      user.fullName,
      user.employeeSaleName,
      user.teraEmployeeName
    ).map((n) => n.toLowerCase())
  );
  if (userVariants.size === 0) return false;

  const jobSellerVariants = buildThaiPersonNameVariants(
    job.sellerName,
    job.quotation?.salesperson?.fullName
  ).map((n) => n.toLowerCase());

  return jobSellerVariants.some((name) => userVariants.has(name));
}

const NON_INVOICE_STEP_NOTES = new Set([
  'ปิดงานสมบูรณ์',
  'ตรวจสอบเอกสาร ปิดงานเสร็จสมบูรณ์ (Completed)',
  'ชำระเงินโอน',
]);

function normalizeDocDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() >= 2500) {
    d.setUTCFullYear(d.getUTCFullYear() - 543);
  }
  return d;
}

export type CrmJobSourceInput = {
  id: string;
  jobNumber: string;
  companyCode: string;
  jobType: string;
  customerName: string;
  item: string | null;
  sellerName: string | null;
  currentStep: string;
  flowVariant: string | null;
  paymentMethod?: string | null;
  paymentStatus: string | null;
  accountingVerifiedBeforeVat?: number | null;
  accountingTaxDocuments?: unknown;
  accountingClosedAt?: Date | string | null;
  accountingClosedBy?: string | null;
  createdAt: Date | string;
  quotation: {
    id: string;
    quotationNumber: string | null;
    productType: string | null;
    subject: string | null;
    invoiceNumber: string | null;
    salesBeforeVat: number | null;
    totalAmountBeforeVat: number | null;
    actualClosingAmount: number | null;
    salespersonId: string | null;
    salesperson: { id: string; fullName: string } | null;
  } | null;
  project: {
    id: string;
    projectNumber: string;
    name: string;
    projectValue: unknown;
  } | null;
  paymentTasks: Array<{
    id: string;
    status: string;
    creditType: string | null;
    installmentNo: number | null;
    installmentTotal: number | null;
    installmentAmount: number | null;
    paidAmount: number | null;
    dueDate: Date | string | null;
    paidDate: Date | string | null;
    invoiceDate: Date | string | null;
    invoiceNumber: string | null;
    note: string | null;
  }>;
  stepLogs: Array<{
    id: string;
    step: string;
    completedBy: string;
    department: string;
    note: string | null;
    completedAt: Date | string;
  }>;
  repairDeliveries: Array<{
    id: string;
    deliveryNumber: string;
    accountingInvoiceNo: string | null;
  }>;
  goodsReturns: Array<{
    id: string;
    documentNo: string | null;
    status: string;
  }>;
  commissionRequests: Array<{
    id: string;
    requestNo: string;
    status: string;
    requestedAt: Date | string;
    requestedByName: string;
    confirmedProfitPct: number | null;
    commissionRatePct: number | null;
    commissionAmount: number | null;
    rejectedReason: string | null;
    payoutDate: Date | string | null;
    payoutAmount: number | null;
    payoutRefNo: string | null;
  }>;
};

export type EvaluatedCrmCommissionRow = {
  jobId: string;
  jobNumber: string;
  companyCode: string;
  customerName: string;
  jobType: string;
  productSold: string;
  salespersonId: string | null;
  salespersonName: string;
  taxInvoiceNumbers: string;
  taxInvoiceDate: string | null;
  receiptNumbers: string;
  isJobClosed: boolean;
  jobClosedStatus: string;
  salesAmountExVat: number;
  salesSourceLabel: string;
  paidAmountRecorded: number;
  isPayment100Pct: boolean;
  isAccountingDone: boolean;
  hasGoodsReturn: boolean;
  goodsReturnNumbers: string[];
  hasExistingActiveRequest: boolean;
  ineligibleReasons: string[];
  isEligibleToSubmit: boolean;
  derivedStatus: CommissionStatus;
  derivedStatusLabel: string;
  existingRequest: {
    id: string;
    requestNo: string;
    status: CommissionStatus;
    requestedAt: string;
    requestedByName: string;
    rejectedReason: string | null;
    payoutDate: string | null;
    payoutAmount: number | null;
    payoutRefNo: string | null;
  } | null;
  latestRejectedRequest: {
    id: string;
    requestNo: string;
    rejectedReason: string | null;
  } | null;
  sourceProfitPct: number | null;
  confirmedProfitPct: number | null;
  commissionRatePct: number | null;
  commissionAmount: number | null;
  paymentTaskCount: number;
  settledTaskCount: number;
  quotationId?: string | null;
  quotationBeforeVat?: number | null;
  accountingVerifiedBeforeVat?: number | null;
  accountingClosedAt?: string | null;
  hasAccountingMismatch?: boolean;
  accountingMismatchMessage?: string | null;
  accountingTaxDocuments?: AccountingTaxDocument[];
  crmSnapshot: {
    quotationNumber: string | null;
    projectNumber: string | null;
    paymentMethod?: string | null;
    salesSourceLabel: string;
    paymentTasks: Array<{
      id: string;
      installmentNo: number | null;
      installmentTotal: number | null;
      status: string;
      creditType: string | null;
      installmentAmount: number | null;
      paidAmount: number | null;
      dueDate?: string | null;
      invoiceNumber: string | null;
      invoiceDate: string | null;
      paidDate: string | null;
      note: string | null;
    }>;
    accountingLogs: Array<{
      completedBy: string;
      completedAt: string;
      note: string | null;
    }>;
    goodsReturnNumbers: string[];
  };
};

export function resolveJobCompanyCode(
  rawCompanyCode?: string | null,
  quotationNumber?: string | null
): string {
  const clean = (rawCompanyCode || '').trim().toUpperCase();
  if (clean === 'TP' || clean === 'TG' || clean === 'TE') {
    return clean;
  }
  if (clean.includes('POWER') || clean.includes('พาวเวอร์') || clean.includes('เพาเวอร์')) {
    return 'TP';
  }
  if (clean.includes('ELECTRIC') || clean.includes('อิเล็กทริค') || clean.includes('อิเล็คทริค')) {
    return 'TE';
  }
  if (clean.includes('GROUP') || clean.includes('กรุ๊ป')) {
    return 'TG';
  }
  if (/^TP(?:\b|[\s\-_])/.test(clean)) return 'TP';
  if (/^TE(?:\b|[\s\-_])/.test(clean)) return 'TE';
  if (/^TG(?:\b|[\s\-_])/.test(clean)) return 'TG';

  if (quotationNumber && quotationNumber.trim()) {
    return extractCompanyCode(quotationNumber.trim());
  }
  return 'TG';
}

export function evaluateJobForCommission(job: CrmJobSourceInput): EvaluatedCrmCommissionRow {
  const taxInvoiceSet = new Set<string>();
  const taxInvoices: string[] = [];
  const receiptSet = new Set<string>();
  const receipts: string[] = [];

  const pushToken = (
    raw: string | null | undefined,
    opts?: { receiptOnly?: boolean; excludeReceipt?: boolean; strictPrefix?: boolean }
  ) => {
    if (!raw) return;
    const parts = String(raw)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s && s !== '-');

    for (const part of parts) {
      if (NON_INVOICE_STEP_NOTES.has(part)) continue;
      if (/^(ดำเนินการอัตโนมัติ|ตีกลับ|ยกเลิก)/.test(part)) continue;

      const isReceipt = /^RE[-/]?\d/i.test(part);
      if (isReceipt) {
        const key = part.toUpperCase();
        if (!receiptSet.has(key)) {
          receiptSet.add(key);
          receipts.push(part);
        }
        if (opts?.excludeReceipt) continue;
      }
      if (opts?.receiptOnly && !isReceipt) continue;

      if (opts?.strictPrefix) {
        if (!/^[A-Za-z]{2,6}[-/]?\d{3,}/.test(part)) continue;
      } else {
        if (!/([A-Za-z]{1,6}[-/]?\d{3,}|\b\d{5,}\b)/.test(part)) continue;
      }

      if (!isReceipt) {
        const key = part.toUpperCase();
        if (!taxInvoiceSet.has(key)) {
          taxInvoiceSet.add(key);
          taxInvoices.push(part);
        }
      }
    }
  };

  const accountingLogs = (job.stepLogs || []).filter((l) => l.step === 'accounting');
  for (const log of accountingLogs) {
    pushToken(log.note);
  }
  for (const pt of job.paymentTasks || []) {
    pushToken(pt.invoiceNumber, { excludeReceipt: true });
    pushToken(pt.note, { receiptOnly: true });
  }
  const accountingDocs = parseAccountingTaxDocuments(job.accountingTaxDocuments);
  for (const doc of accountingDocs) {
    if (doc.docType === 'RECEIPT') {
      const key = doc.docNumber.toUpperCase();
      if (!receiptSet.has(key)) {
        receiptSet.add(key);
        receipts.push(doc.docNumber);
      }
    } else if (doc.docType === 'TAX_INVOICE_RECEIPT') {
      const key = doc.docNumber.toUpperCase();
      if (!taxInvoiceSet.has(key)) {
        taxInvoiceSet.add(key);
        taxInvoices.push(doc.docNumber);
      }
      if (!receiptSet.has(key)) {
        receiptSet.add(key);
        receipts.push(doc.docNumber);
      }
    } else {
      const key = doc.docNumber.toUpperCase();
      if (!taxInvoiceSet.has(key)) {
        taxInvoiceSet.add(key);
        taxInvoices.push(doc.docNumber);
      }
    }
  }
  for (const rd of job.repairDeliveries || []) {
    pushToken(rd.accountingInvoiceNo, { excludeReceipt: true });
  }
  if (job.quotation?.invoiceNumber) {
    pushToken(job.quotation.invoiceNumber, { excludeReceipt: true, strictPrefix: true });
  }

  // Earliest tax invoice date (prefer tax document date, then task invoiceDate, then accounting close date)
  let earliestInvoiceDate: Date | null = null;
  for (const doc of accountingDocs) {
    const d = normalizeDocDate(doc.docDate);
    if (d && (!earliestInvoiceDate || d < earliestInvoiceDate)) {
      earliestInvoiceDate = d;
    }
  }
  for (const pt of job.paymentTasks || []) {
    const d = normalizeDocDate(pt.invoiceDate);
    if (d && (!earliestInvoiceDate || d < earliestInvoiceDate)) {
      earliestInvoiceDate = d;
    }
  }
  if (!earliestInvoiceDate && job.accountingClosedAt) {
    earliestInvoiceDate = normalizeDocDate(job.accountingClosedAt);
  }
  if (!earliestInvoiceDate && accountingLogs.length > 0) {
    const sortedAcctDates = accountingLogs
      .map((l) => normalizeDocDate(l.completedAt))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());
    if (sortedAcctDates.length > 0) {
      earliestInvoiceDate = sortedAcctDates[0];
    }
  }

  const reconciliation = evaluateAccountingAmountReconciliation({
    accountingVerifiedBeforeVat: job.accountingVerifiedBeforeVat,
    accountingClosedAt: job.accountingClosedAt,
    quotation: job.quotation,
  });

  // Sales Ex-VAT valuation: Requirement 4 — always use Accounting's verified pre-VAT amount as authoritative when present
  const qTotalBeforeVat = Number(job.quotation?.totalAmountBeforeVat);
  const qSalesBeforeVat = Number(job.quotation?.salesBeforeVat);
  const projValue = Number(job.project?.projectValue);
  const qActualClosing = Number(job.quotation?.actualClosingAmount);
  const taskInstallmentSum = (job.paymentTasks || []).reduce(
    (sum, t) => sum + (Number(t.installmentAmount) || 0),
    0
  );

  let salesAmountExVat = 0;
  let salesSourceLabel = 'ไม่พบมูลค่างาน';
  if (reconciliation.hasAccountingVerifiedAmount && (reconciliation.accountingBeforeVat ?? 0) > 0) {
    salesAmountExVat = roundCurrency2(reconciliation.accountingBeforeVat!);
    salesSourceLabel = 'ยอดก่อน VAT จากใบกำกับภาษี (ฝ่ายบัญชี)';
  } else if (Number.isFinite(qTotalBeforeVat) && qTotalBeforeVat > 0) {
    salesAmountExVat = roundCurrency2(qTotalBeforeVat);
    salesSourceLabel = 'ใบเสนอราคา (ก่อน VAT)';
  } else if (Number.isFinite(qSalesBeforeVat) && qSalesBeforeVat > 0) {
    salesAmountExVat = roundCurrency2(qSalesBeforeVat);
    salesSourceLabel = 'มูลค่าขายก่อน VAT';
  } else if (Number.isFinite(projValue) && projValue > 0) {
    salesAmountExVat = roundCurrency2(projValue);
    salesSourceLabel = 'มูลค่าโครงการ (ก่อน VAT)';
  } else if (Number.isFinite(qActualClosing) && qActualClosing > 0) {
    salesAmountExVat = roundCurrency2(qActualClosing);
    salesSourceLabel = 'ยอดปิดการขาย';
  } else if (Number.isFinite(taskInstallmentSum) && taskInstallmentSum > 0) {
    salesAmountExVat = roundCurrency2(taskInstallmentSum);
    salesSourceLabel = 'ผลรวมงวดรับชำระ';
  }

  const tasks = job.paymentTasks || [];
  const settledTaskCount = tasks.filter((t) => t.status === 'ตรวจสอบและบันทึกแล้ว').length;
  const isPayment100Pct = tasks.length > 0 && settledTaskCount === tasks.length;

  let paidAmountRecorded = 0;
  if (isPayment100Pct) {
    const settledRecordedSum = tasks.reduce((sum, t) => {
      const inst = Number(t.installmentAmount) || 0;
      const paid = Number(t.paidAmount) || 0;
      return sum + (inst > 0 ? inst : paid);
    }, 0);
    paidAmountRecorded =
      settledRecordedSum > 0 ? roundCurrency2(settledRecordedSum) : salesAmountExVat;
  } else {
    paidAmountRecorded = roundCurrency2(
      tasks.reduce((sum, t) => {
        if (t.status === 'ตรวจสอบและบันทึกแล้ว') {
          const inst = Number(t.installmentAmount) || 0;
          const paid = Number(t.paidAmount) || 0;
          return sum + (inst > 0 ? inst : paid);
        }
        return sum + (Number(t.paidAmount) || 0);
      }, 0)
    );
  }

  // Accounting closed check:
  // Satisfied when either jobStepLog('accounting') exists OR Accounting saved & closed job in /accounting (`accountingClosedAt`).
  const workflowSteps = getSteps(job.jobType, job.flowVariant);
  const workflowHasAccountingStep =
    workflowSteps.length === 0 || workflowSteps.some((s) => s.key === 'accounting');
  const isWorkflowDone = isCompleted(
    job.jobType,
    job.currentStep,
    job.flowVariant,
    job.stepLogs || [],
    { hasAccountingAmountMismatch: reconciliation.hasMismatch }
  );
  const isAccountingDone = workflowHasAccountingStep
    ? accountingLogs.length > 0 || Boolean(job.accountingClosedAt)
    : isWorkflowDone || accountingLogs.length > 0 || Boolean(job.accountingClosedAt);
  const isJobClosed = isWorkflowDone;

  const jobClosedStatus = reconciliation.hasMismatch
    ? 'ปิด Job ไม่ได้ (รอยอดตรงบัญชี)'
    : isJobClosed
    ? 'ปิด Job แล้ว'
    : 'ยังไม่ปิด Job';

  const requestsSorted = [...(job.commissionRequests || [])].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
  const activeReq = requestsSorted.find((r) => r.status !== 'REJECTED') || null;
  const latestRejected = !activeReq
    ? requestsSorted.find((r) => r.status === 'REJECTED') || null
    : null;

  const hasExistingActiveRequest = Boolean(activeReq);
  const goodsReturnNumbers = (job.goodsReturns || [])
    .map((g) => g.documentNo || g.id)
    .filter(Boolean);
  const hasGoodsReturn = goodsReturnNumbers.length > 0;

  const ineligibleReasons: string[] = [];
  if (!isPayment100Pct) {
    ineligibleReasons.push('ยังชำระเงินไม่ครบ 100%');
  }
  if (!isAccountingDone) {
    ineligibleReasons.push('รอฝ่ายบัญชียืนยันปิดงาน');
  }
  if (reconciliation.hasMismatch) {
    ineligibleReasons.push('ยอดใบเสนอราคาไม่ตรงกับยอดก่อน VAT ของฝ่ายบัญชี');
  }
  if (!isJobClosed) {
    ineligibleReasons.push('รอปิดสถานะ Job ให้เสร็จสมบูรณ์');
  }
  if (hasExistingActiveRequest) {
    ineligibleReasons.push('รายการนี้มีคำขอค่าคอมมิชชั่นแล้ว');
  }
  if (salesAmountExVat <= 0) {
    ineligibleReasons.push('ไม่พบมูลค่างานไม่รวม VAT');
  }

  const isEligibleToSubmit =
    isPayment100Pct &&
    isAccountingDone &&
    !reconciliation.hasMismatch &&
    isJobClosed &&
    !hasExistingActiveRequest &&
    salesAmountExVat > 0;

  const derivedStatus: CommissionStatus = activeReq
    ? (activeReq.status as CommissionStatus)
    : isEligibleToSubmit
    ? 'READY'
    : 'NOT_ELIGIBLE';

  const productSold =
    job.item?.trim() ||
    job.quotation?.subject?.trim() ||
    job.quotation?.productType?.trim() ||
    job.project?.name?.trim() ||
    '-';

  const salespersonName =
    job.quotation?.salesperson?.fullName?.trim() || job.sellerName?.trim() || '-';

  const normalizedCompany = resolveJobCompanyCode(
    job.companyCode,
    job.quotation?.quotationNumber
  );

  return {
    jobId: job.id,
    jobNumber: job.jobNumber,
    companyCode: normalizedCompany,
    customerName: job.customerName,
    jobType: job.jobType,
    productSold,
    salespersonId: job.quotation?.salespersonId || job.quotation?.salesperson?.id || null,
    salespersonName,
    taxInvoiceNumbers: taxInvoices.join(', ') || '-',
    taxInvoiceDate: earliestInvoiceDate ? earliestInvoiceDate.toISOString() : null,
    receiptNumbers: receipts.join(', ') || '-',
    isJobClosed,
    jobClosedStatus,
    salesAmountExVat,
    salesSourceLabel,
    paidAmountRecorded,
    isPayment100Pct,
    isAccountingDone,
    hasGoodsReturn,
    goodsReturnNumbers,
    hasExistingActiveRequest,
    ineligibleReasons,
    isEligibleToSubmit,
    derivedStatus,
    derivedStatusLabel: COMMISSION_STATUS_LABELS[derivedStatus] || derivedStatus,
    existingRequest: activeReq
      ? {
          id: activeReq.id,
          requestNo: activeReq.requestNo,
          status: activeReq.status as CommissionStatus,
          requestedAt: new Date(activeReq.requestedAt).toISOString(),
          requestedByName: activeReq.requestedByName,
          rejectedReason: activeReq.rejectedReason,
          payoutDate: activeReq.payoutDate ? new Date(activeReq.payoutDate).toISOString() : null,
          payoutAmount: activeReq.payoutAmount,
          payoutRefNo: activeReq.payoutRefNo,
        }
      : null,
    latestRejectedRequest: latestRejected
      ? {
          id: latestRejected.id,
          requestNo: latestRejected.requestNo,
          rejectedReason: latestRejected.rejectedReason,
        }
      : null,
    sourceProfitPct: null,
    confirmedProfitPct: activeReq?.confirmedProfitPct ?? null,
    commissionRatePct: activeReq?.commissionRatePct ?? null,
    commissionAmount: activeReq?.commissionAmount ?? null,
    paymentTaskCount: tasks.length,
    settledTaskCount,
    quotationId: job.quotation?.id ?? null,
    quotationBeforeVat: reconciliation.quotationBeforeVat,
    accountingVerifiedBeforeVat: reconciliation.accountingBeforeVat,
    accountingClosedAt: job.accountingClosedAt ? new Date(job.accountingClosedAt).toISOString() : null,
    hasAccountingMismatch: reconciliation.hasMismatch,
    accountingMismatchMessage: reconciliation.mismatchMessage,
    accountingTaxDocuments: accountingDocs,
    crmSnapshot: {
      quotationNumber: job.quotation?.quotationNumber ?? null,
      projectNumber: job.project?.projectNumber ?? null,
      paymentMethod: job.paymentMethod ?? null,
      salesSourceLabel,
      paymentTasks: tasks.map((t) => ({
        id: t.id,
        installmentNo: t.installmentNo,
        installmentTotal: t.installmentTotal,
        status: t.status,
        creditType: t.creditType,
        installmentAmount: t.installmentAmount,
        paidAmount: t.paidAmount,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
        invoiceNumber: t.invoiceNumber,
        invoiceDate: t.invoiceDate ? new Date(t.invoiceDate).toISOString() : null,
        paidDate: t.paidDate ? new Date(t.paidDate).toISOString() : null,
        note: t.note,
      })),
      accountingLogs: accountingLogs.map((l) => ({
        completedBy: l.completedBy,
        completedAt: new Date(l.completedAt).toISOString(),
        note: l.note,
      })),
      goodsReturnNumbers,
    },
  };
}

/**
 * Strips profit, cost, and unconfirmed commission calculation fields when returning CRM rows
 * to non-SUPER_ADMIN salespersons so confidential company profit data never leaks over the wire.
 */
export function sanitizeCrmCommissionRowForRole(
  row: EvaluatedCrmCommissionRow,
  isSuperAdmin: boolean
): EvaluatedCrmCommissionRow {
  if (isSuperAdmin) return row;

  const isConfirmedCommissionVisible =
    row.derivedStatus === 'APPROVED' || row.derivedStatus === 'PAID';

  return {
    ...row,
    sourceProfitPct: null,
    confirmedProfitPct: null,
    commissionRatePct: isConfirmedCommissionVisible ? row.commissionRatePct : null,
    commissionAmount: isConfirmedCommissionVisible ? row.commissionAmount : null,
  };
}
