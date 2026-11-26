"use server";

import crypto from 'crypto';
import { Prisma } from '@/generated/client';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { ParsedBankTransactionRow } from '@/app/lib/bank-statement-parser';
import {
  extractAccountingDocsFromPaymentTasks,
  parseAccountingTaxDocuments,
} from '@/app/lib/accounting-reconciliation';
import {
  getBangkokDayDiff,
  getPaymentTaskBilledAmount,
  isScheduleTaskSettled,
  matchesCompanyEntity,
} from '@/app/lib/accounting-schedule';
import { recordPaymentDeposit, updatePaymentTaskStatus } from '@/app/actions/accounting';
import { markSupplierPaymentPaid } from '@/app/actions/supplierPayment';

async function requireAccountingOrExecutiveUser() {
  const user = await getUser();
  if (!user || !user.isActive) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่ก่อนดำเนินการ');
  }
  const roleStr = (user.role || '').toLowerCase();
  const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน'].some((r) => roleStr.includes(r));
  const isExecutive = ['ผู้บริหาร', 'executive', 'super_admin'].some((r) => roleStr.includes(r));
  if (!isAccounting && !isExecutive) {
    throw new Error('ไม่มีสิทธิ์จัดการ Bank Statement (เฉพาะฝ่ายบัญชี/ผู้บริหาร)');
  }
  return user;
}

function normalizeMatchText(raw: string | null | undefined): string {
  return (raw || '')
    .toLowerCase()
    .replace(/^(บริษัท|บจก\.?|หจก\.?|ห้างหุ้นส่วนจำกัด|ร้าน|คุณ|นาย|นาง|น\.ส\.?)\s*/gi, '')
    .replace(/\s*(จำกัด|\(มหาชน\)|มหาชน)\s*/gi, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDedupeHash(params: {
  companyCode: string;
  accountNumber?: string | null;
  transactionDate: string;
  transactionTime?: string | null;
  txType: string;
  amount: number;
  referenceNo?: string | null;
  description: string;
  occurrenceInBatch: number;
}): string {
  const payload = [
    params.companyCode.toUpperCase(),
    (params.accountNumber || '').replace(/[^0-9A-Za-z]/g, ''),
    params.transactionDate,
    params.transactionTime || '',
    params.txType,
    params.amount.toFixed(2),
    (params.referenceNo || '').trim().toUpperCase(),
    params.description.trim().replace(/\s+/g, ' ').toUpperCase(),
    String(params.occurrenceInBatch),
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export type ReconcileCandidate = {
  targetType: 'AR' | 'AP';
  targetId: string;
  jobId?: string | null;
  referenceNumber: string; // Job number or PO number
  counterpartyName: string;
  companyCode: string;
  billedAmount: number;
  remainingAmount: number;
  paidAmount: number;
  dueDate: string | null;
  status: string;
  invoiceNumbers: string[];
  score: number;
  matchReason: string;
};

type ArScoringRow = {
  id: string;
  jobId: string;
  jobNumber: string;
  customerName: string;
  companyCode: string;
  status: string;
  billedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date | null;
  paidDate: Date | null;
  invoiceNumbers: string[];
  isSettled: boolean;
};

type ApScoringRow = {
  id: string;
  poNumber: string;
  vendorName: string;
  jobName: string | null;
  status: string;
  netPayableAmount: number;
  paidAmount: number;
  dueDate: Date;
  paidDate: Date | null;
  isSettled: boolean;
};

function scoreArMatch(
  tx: {
    transactionDate: Date;
    amount: number;
    companyCode: string;
    description: string;
    referenceNo?: string | null;
    counterpartyName?: string | null;
  },
  candidate: ArScoringRow
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const combinedTxText = `${tx.description} ${tx.referenceNo || ''} ${tx.counterpartyName || ''}`.toUpperCase();

  // 1. Job number / tax invoice match
  if (candidate.jobNumber && candidate.jobNumber.length >= 5 && combinedTxText.includes(candidate.jobNumber.toUpperCase())) {
    score += 55;
    reasons.push(`อ้างอิง ${candidate.jobNumber}`);
  }
  const matchedInv = candidate.invoiceNumbers.find(
    (inv) => inv.length >= 5 && combinedTxText.includes(inv.toUpperCase())
  );
  if (matchedInv) {
    score += 55;
    reasons.push(`เลขบิล ${matchedInv}`);
  }

  // 2. Amount match (exact remaining, exact billed, or WHT 1%/2%/3%/5% on pre-VAT amount)
  const targetAmt = candidate.remainingAmount > 0 ? candidate.remainingAmount : candidate.billedAmount;
  const preVatBase = targetAmt > 0 ? targetAmt / 1.07 : 0;
  if (targetAmt > 0) {
    if (Math.abs(tx.amount - targetAmt) <= 1.5) {
      score += 48;
      reasons.push('ยอดโอนตรงพอดี');
    } else if (candidate.billedAmount > 0 && Math.abs(tx.amount - candidate.billedAmount) <= 1.5) {
      score += 44;
      reasons.push('ยอดโอนตรงมูลค่าบิล');
    } else {
      const whtRates = [0.03, 0.01, 0.02, 0.05];
      for (const rate of whtRates) {
        const expectedAfterWht = targetAmt - preVatBase * rate;
        if (Math.abs(tx.amount - expectedAfterWht) <= 2.5) {
          score += 40;
          reasons.push(`ยอดตรงหลังหัก ณ ที่จ่าย ${Math.round(rate * 100)}%`);
          break;
        }
      }
    }
  }

  // 3. Counterparty / customer name token overlap
  const cleanCust = normalizeMatchText(candidate.customerName);
  const cleanTx = normalizeMatchText(combinedTxText);
  if (cleanCust.length >= 4) {
    const tokens = cleanCust.split(' ').filter((t) => t.length >= 3);
    const matchedTokens = tokens.filter((t) => cleanTx.includes(t));
    if (cleanTx.includes(cleanCust) || matchedTokens.length >= 2) {
      score += 22;
      reasons.push('ชื่อผู้โอนตรงลูกค้า');
    } else if (matchedTokens.length === 1) {
      score += 12;
      reasons.push('คำสำคัญชื่อตรง');
    }
  }

  // 4. Company entity alignment
  if (matchesCompanyEntity(candidate.companyCode, tx.companyCode)) {
    score += 5;
  }

  // 5. Date proximity
  const refDate = candidate.paidDate || candidate.dueDate;
  if (refDate) {
    const diffDays = Math.abs(getBangkokDayDiff(tx.transactionDate, refDate) ?? 999);
    if (diffDays <= 3) {
      score += 10;
      reasons.push('วันที่ใกล้เคียงวันครบกำหนด/รับเงิน');
    } else if (diffDays <= 14) {
      score += 5;
    }
  }

  // Slightly prefer unsettled AR items unless already exact settled match
  if (!candidate.isSettled && score >= 40) {
    score += 3;
  }

  return { score: Math.min(100, score), reasons };
}

function scoreApMatch(
  tx: {
    transactionDate: Date;
    amount: number;
    description: string;
    referenceNo?: string | null;
    counterpartyName?: string | null;
  },
  candidate: ApScoringRow
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const combinedTxText = `${tx.description} ${tx.referenceNo || ''} ${tx.counterpartyName || ''}`.toUpperCase();

  if (candidate.poNumber && combinedTxText.includes(candidate.poNumber.toUpperCase())) {
    score += 55;
    reasons.push(`อ้างอิง ${candidate.poNumber}`);
  }

  if (candidate.netPayableAmount > 0 && Math.abs(tx.amount - candidate.netPayableAmount) <= 1.5) {
    score += 48;
    reasons.push('ยอดจ่ายตรงเจ้าหนี้');
  }

  const cleanVendor = normalizeMatchText(candidate.vendorName);
  const cleanTx = normalizeMatchText(combinedTxText);
  if (cleanVendor.length >= 4) {
    const tokens = cleanVendor.split(' ').filter((t) => t.length >= 3);
    const matchedTokens = tokens.filter((t) => cleanTx.includes(t));
    if (cleanTx.includes(cleanVendor) || matchedTokens.length >= 2) {
      score += 22;
      reasons.push('ชื่อตรงเจ้าหนี้');
    } else if (matchedTokens.length === 1) {
      score += 12;
      reasons.push('คำสำคัญเจ้าหนี้ตรง');
    }
  }

  const refDate = candidate.paidDate || candidate.dueDate;
  const diffDays = Math.abs(getBangkokDayDiff(tx.transactionDate, refDate) ?? 999);
  if (diffDays <= 3) score += 8;
  else if (diffDays <= 14) score += 4;

  if (!candidate.isSettled && score >= 40) score += 3;
  return { score: Math.min(100, score), reasons };
}

async function loadScoringPools(entity: string) {
  const [rawPaymentTasks, rawSupplierTasks, alreadyMatchedRows] = await Promise.all([
    prisma.paymentTask.findMany({
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            customerName: true,
            companyCode: true,
            accountingTaxDocuments: true,
            quotation: { select: { actualClosingAmount: true, totalAmountBeforeVat: true } },
            project: { select: { projectValue: true, amountIncludingVat: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1500,
    }),
    prisma.supplierPaymentTask.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        purchaseOrder: {
          select: { vendorName: true, jobName: true },
        },
      },
      orderBy: { dueDate: 'desc' },
      take: 800,
    }),
    prisma.bankStatementTransaction.findMany({
      where: { matchStatus: 'MATCHED' },
      select: { matchedPaymentTaskId: true, matchedSupplierTaskId: true },
    }),
  ]);

  const usedArIds = new Set(
    alreadyMatchedRows.map((r) => r.matchedPaymentTaskId).filter((x): x is string => Boolean(x))
  );
  const usedApIds = new Set(
    alreadyMatchedRows.map((r) => r.matchedSupplierTaskId).filter((x): x is string => Boolean(x))
  );

  const arPool: ArScoringRow[] = rawPaymentTasks
    .filter((pt) => !usedArIds.has(pt.id) && matchesCompanyEntity(pt.job?.companyCode, entity))
    .map((pt) => {
      const billedAmount = getPaymentTaskBilledAmount(pt);
      const paidAmount = Number(pt.paidAmount || 0);
      const settled = isScheduleTaskSettled(pt);
      const remainingAmount = settled ? 0 : Math.max(0, billedAmount - paidAmount);
      const taskDocs = extractAccountingDocsFromPaymentTasks([pt]);
      const jobDocs = parseAccountingTaxDocuments(pt.job?.accountingTaxDocuments);
      const invoiceNumbers = Array.from(
        new Set([...taskDocs, ...jobDocs].map((d) => d.docNumber).filter(Boolean))
      );

      return {
        id: pt.id,
        jobId: pt.jobId,
        jobNumber: pt.job?.jobNumber || '-',
        customerName: pt.job?.customerName || 'ลูกค้าทั่วไป',
        companyCode: pt.job?.companyCode || 'TG',
        status: pt.status,
        billedAmount,
        paidAmount,
        remainingAmount,
        dueDate: pt.dueDate,
        paidDate: pt.paidDate,
        invoiceNumbers,
        isSettled: settled,
      };
    });

  const apPool: ApScoringRow[] = rawSupplierTasks
    .filter((st) => !usedApIds.has(st.id))
    .map((st) => ({
      id: st.id,
      poNumber: st.poNumber,
      vendorName: st.purchaseOrder?.vendorName || 'ซัพพลายเออร์',
      jobName: st.purchaseOrder?.jobName || null,
      status: st.status,
      netPayableAmount: Number(st.netPayableAmount || 0),
      paidAmount: Number(st.paidAmount || 0),
      dueDate: st.dueDate,
      paidDate: st.paidDate,
      isSettled: st.status === 'PAID_VERIFIED',
    }));

  return { arPool, apPool };
}

function serializeTransaction(row: any, candidates: ReconcileCandidate[] = []) {
  return {
    id: row.id,
    batchId: row.batchId,
    companyCode: row.companyCode,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    rowNumber: row.rowNumber,
    transactionDate: row.transactionDate instanceof Date ? row.transactionDate.toISOString() : String(row.transactionDate),
    transactionTime: row.transactionTime,
    txType: row.txType as 'CREDIT' | 'DEBIT',
    amount: Number(row.amount || 0),
    balanceAfter: row.balanceAfter !== null && row.balanceAfter !== undefined ? Number(row.balanceAfter) : null,
    channel: row.channel,
    referenceNo: row.referenceNo,
    description: row.description,
    counterpartyName: row.counterpartyName,
    matchStatus: row.matchStatus as 'UNMATCHED' | 'SUGGESTED' | 'MATCHED' | 'IGNORED',
    matchConfidence: row.matchConfidence,
    matchReason: row.matchReason,
    matchedPaymentTaskId: row.matchedPaymentTaskId,
    matchedSupplierTaskId: row.matchedSupplierTaskId,
    matchedJobId: row.matchedJobId,
    matchedJobNumber: row.matchedJobNumber,
    matchedCustomerName: row.matchedCustomerName,
    matchedAt: row.matchedAt instanceof Date ? row.matchedAt.toISOString() : row.matchedAt,
    matchedBy: row.matchedBy,
    reconcileNote: row.reconcileNote,
    candidates,
  };
}

export async function importBankStatement(input: {
  companyCode: string;
  bankName: string;
  accountNumber?: string | null;
  accountName?: string | null;
  fileName: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string | null;
  autoMatchSettled?: boolean;
  rows: ParsedBankTransactionRow[];
}) {
  const user = await requireAccountingOrExecutiveUser();

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return { success: false, error: 'ไม่พบรายการธุรกรรมในไฟล์ที่นำเข้า' };
  }

  const companyCode = (input.companyCode || 'TG').trim().toUpperCase();
  const bankName = (input.bankName || 'OTHER').trim().toUpperCase();
  const accountNumber = input.accountNumber?.trim() || null;

  // Build unique hashes with per-file occurrence index so two genuine identical transfers on the same day never clash
  const baseOccurrence = new Map<string, number>();
  const preparedRows = input.rows.map((r) => {
    const baseKey = `${r.transactionDate}|${r.transactionTime || ''}|${r.txType}|${r.amount.toFixed(2)}|${r.referenceNo || ''}|${r.description.trim()}`;
    const occ = (baseOccurrence.get(baseKey) || 0) + 1;
    baseOccurrence.set(baseKey, occ);
    const dedupeHash = buildDedupeHash({
      companyCode,
      accountNumber,
      transactionDate: r.transactionDate,
      transactionTime: r.transactionTime,
      txType: r.txType,
      amount: r.amount,
      referenceNo: r.referenceNo,
      description: r.description,
      occurrenceInBatch: occ,
    });
    return { ...r, dedupeHash };
  });

  const existingHashes = new Set(
    (
      await prisma.bankStatementTransaction.findMany({
        where: { dedupeHash: { in: preparedRows.map((r) => r.dedupeHash) } },
        select: { dedupeHash: true },
      })
    ).map((x) => x.dedupeHash)
  );

  const uniqueRows = preparedRows.filter((r) => !existingHashes.has(r.dedupeHash));
  const duplicateSkippedCount = preparedRows.length - uniqueRows.length;

  if (uniqueRows.length === 0) {
    return {
      success: false,
      error: `รายการทั้งหมด (${preparedRows.length} รายการ) เคยถูกนำเข้าไว้ในระบบแล้ว (ตรวจพบซ้ำ 100%)`,
    };
  }

  const { arPool, apPool } = await loadScoringPools(companyCode);
  const autoMatchSettled = input.autoMatchSettled !== false;

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const batchCode = `STMT-${ym}-${String(now.getDate()).padStart(2, '0')}${randomSuffix}`;

  const reservedArIds = new Set<string>();
  const reservedApIds = new Set<string>();
  let matchedCount = 0;
  let suggestedCount = 0;
  let totalCreditAmount = 0;
  let totalDebitAmount = 0;
  let creditRows = 0;
  let debitRows = 0;

  const txPayloads: Prisma.BankStatementTransactionCreateWithoutBatchInput[] = uniqueRows.map((r) => {
    const txDate = new Date(`${r.transactionDate}T12:00:00+07:00`);
    if (r.txType === 'CREDIT') {
      totalCreditAmount += r.amount;
      creditRows++;
    } else {
      totalDebitAmount += r.amount;
      debitRows++;
    }

    let matchStatus = 'UNMATCHED';
    let matchConfidence: number | null = null;
    let matchReason: string | null = null;
    let matchedPaymentTaskId: string | null = null;
    let matchedSupplierTaskId: string | null = null;
    let matchedJobId: string | null = null;
    let matchedJobNumber: string | null = null;
    let matchedCustomerName: string | null = null;
    let matchedAt: Date | null = null;
    let matchedBy: string | null = null;

    if (r.txType === 'CREDIT') {
      let best: { row: ArScoringRow; score: number; reason: string } | null = null;
      for (const candidate of arPool) {
        if (reservedArIds.has(candidate.id)) continue;
        const { score, reasons } = scoreArMatch(
          {
            transactionDate: txDate,
            amount: r.amount,
            companyCode,
            description: r.description,
            referenceNo: r.referenceNo,
            counterpartyName: r.counterpartyName,
          },
          candidate
        );
        if (score >= 48 && (!best || score > best.score)) {
          best = { row: candidate, score, reason: reasons.join(' • ') };
        }
      }

      if (best) {
        matchConfidence = best.score;
        matchReason = best.reason;
        matchedPaymentTaskId = best.row.id;
        matchedJobId = best.row.jobId;
        matchedJobNumber = best.row.jobNumber;
        matchedCustomerName = best.row.customerName;

        const isExactSettledAutoMatch =
          autoMatchSettled &&
          best.row.isSettled &&
          best.score >= 88 &&
          Math.abs(r.amount - best.row.billedAmount) <= 1.5;

        if (isExactSettledAutoMatch) {
          matchStatus = 'MATCHED';
          matchedAt = now;
          matchedBy = 'จับคู่อัตโนมัติ (บิลที่ปิดรับเงินแล้ว)';
          reservedArIds.add(best.row.id);
          matchedCount++;
        } else if (best.score >= 52) {
          matchStatus = 'SUGGESTED';
          reservedArIds.add(best.row.id);
          suggestedCount++;
        } else {
          // Score too weak to suggest without false hints
          matchedPaymentTaskId = null;
          matchedJobId = null;
          matchedJobNumber = null;
          matchedCustomerName = null;
        }
      }
    } else {
      let bestAp: { row: ApScoringRow; score: number; reason: string } | null = null;
      for (const candidate of apPool) {
        if (reservedApIds.has(candidate.id)) continue;
        const { score, reasons } = scoreApMatch(
          {
            transactionDate: txDate,
            amount: r.amount,
            description: r.description,
            referenceNo: r.referenceNo,
            counterpartyName: r.counterpartyName,
          },
          candidate
        );
        if (score >= 55 && (!bestAp || score > bestAp.score)) {
          bestAp = { row: candidate, score, reason: reasons.join(' • ') };
        }
      }

      if (bestAp) {
        matchConfidence = bestAp.score;
        matchReason = bestAp.reason;
        matchedSupplierTaskId = bestAp.row.id;
        matchedJobNumber = bestAp.row.poNumber;
        matchedCustomerName = bestAp.row.vendorName;
        if (
          autoMatchSettled &&
          bestAp.row.isSettled &&
          bestAp.score >= 85 &&
          Math.abs(r.amount - bestAp.row.netPayableAmount) <= 1.5
        ) {
          matchStatus = 'MATCHED';
          matchedAt = now;
          matchedBy = 'จับคู่อัตโนมัติ (AP จ่ายแล้ว)';
          reservedApIds.add(bestAp.row.id);
          matchedCount++;
        } else {
          matchStatus = 'SUGGESTED';
          reservedApIds.add(bestAp.row.id);
          suggestedCount++;
        }
      }
    }

    return {
      companyCode,
      bankName,
      accountNumber,
      rowNumber: r.rowNumber,
      transactionDate: txDate,
      transactionTime: r.transactionTime,
      txType: r.txType,
      amount: new Prisma.Decimal(r.amount.toFixed(2)),
      balanceAfter:
        r.balanceAfter !== null && Number.isFinite(r.balanceAfter)
          ? new Prisma.Decimal(r.balanceAfter.toFixed(2))
          : null,
      channel: r.channel,
      referenceNo: r.referenceNo,
      description: r.description,
      counterpartyName: r.counterpartyName,
      dedupeHash: r.dedupeHash,
      matchStatus,
      matchConfidence,
      matchReason,
      matchedPaymentTaskId,
      matchedSupplierTaskId,
      matchedJobId,
      matchedJobNumber,
      matchedCustomerName,
      matchedAt,
      matchedBy,
    };
  });

  const createdBatch = await prisma.$transaction(async (tx) => {
    return tx.bankStatementBatch.create({
      data: {
        batchCode,
        companyCode,
        bankName,
        accountNumber,
        accountName: input.accountName?.trim() || null,
        fileName: input.fileName.slice(0, 250),
        periodStart: input.periodStart ? new Date(`${input.periodStart}T12:00:00+07:00`) : null,
        periodEnd: input.periodEnd ? new Date(`${input.periodEnd}T12:00:00+07:00`) : null,
        totalRows: uniqueRows.length,
        creditRows,
        debitRows,
        totalCreditAmount: new Prisma.Decimal(totalCreditAmount.toFixed(2)),
        totalDebitAmount: new Prisma.Decimal(totalDebitAmount.toFixed(2)),
        importedById: user.id,
        importedByName: user.fullName || 'ฝ่ายบัญชี',
        note: input.note?.trim() || null,
        transactions: {
          create: txPayloads,
        },
      },
    });
  });

  try {
    revalidatePath('/accounting/dashboard');
    revalidatePath('/accounting');
  } catch {}

  return {
    success: true,
    batchCode: createdBatch.batchCode,
    batchId: createdBatch.id,
    insertedCount: uniqueRows.length,
    duplicateSkippedCount,
    matchedCount,
    suggestedCount,
  };
}

export async function getBankReconciliationData(params?: {
  entity?: string;
  startDate?: string;
  endDate?: string;
  batchId?: string;
}) {
  await requireAccountingOrExecutiveUser();

  const targetEntity = (params?.entity || 'ALL').toUpperCase();
  const txWhere: Prisma.BankStatementTransactionWhereInput = {};
  const batchWhere: Prisma.BankStatementBatchWhereInput = {};

  if (targetEntity !== 'ALL') {
    txWhere.companyCode = targetEntity;
    batchWhere.companyCode = targetEntity;
  }
  if (params?.batchId) {
    txWhere.batchId = params.batchId;
  }
  if (params?.startDate || params?.endDate) {
    txWhere.transactionDate = {};
    if (params.startDate) txWhere.transactionDate.gte = new Date(`${params.startDate}T00:00:00+07:00`);
    if (params.endDate) txWhere.transactionDate.lte = new Date(`${params.endDate}T23:59:59+07:00`);
  }

  const [batches, transactions, { arPool, apPool }] = await Promise.all([
    prisma.bankStatementBatch.findMany({
      where: batchWhere,
      orderBy: { importedAt: 'desc' },
      take: 30,
    }),
    prisma.bankStatementTransaction.findMany({
      where: txWhere,
      orderBy: [{ transactionDate: 'desc' }, { rowNumber: 'asc' }],
      take: 500,
    }),
    loadScoringPools(targetEntity),
  ]);

  let totalCreditCount = 0;
  let totalCreditAmount = 0;
  let matchedCreditCount = 0;
  let matchedCreditAmount = 0;
  let suggestedCreditCount = 0;
  let unmatchedCreditCount = 0;
  let unmatchedCreditAmount = 0;
  let ignoredCreditCount = 0;

  let totalDebitCount = 0;
  let totalDebitAmount = 0;
  let matchedDebitCount = 0;
  let unmatchedDebitCount = 0;

  const serializedTx = transactions.map((row) => {
    const amt = Number(row.amount || 0);
    if (row.txType === 'CREDIT') {
      totalCreditCount++;
      totalCreditAmount += amt;
      if (row.matchStatus === 'MATCHED') {
        matchedCreditCount++;
        matchedCreditAmount += amt;
      } else if (row.matchStatus === 'SUGGESTED') {
        suggestedCreditCount++;
        unmatchedCreditCount++;
        unmatchedCreditAmount += amt;
      } else if (row.matchStatus === 'IGNORED') {
        ignoredCreditCount++;
      } else {
        unmatchedCreditCount++;
        unmatchedCreditAmount += amt;
      }
    } else {
      totalDebitCount++;
      totalDebitAmount += amt;
      if (row.matchStatus === 'MATCHED') matchedDebitCount++;
      else if (row.matchStatus !== 'IGNORED') unmatchedDebitCount++;
    }

    let candidates: ReconcileCandidate[] = [];
    if (row.matchStatus === 'UNMATCHED' || row.matchStatus === 'SUGGESTED') {
      if (row.txType === 'CREDIT') {
        candidates = arPool
          .map((c) => {
            const { score, reasons } = scoreArMatch(
              {
                transactionDate: row.transactionDate,
                amount: amt,
                companyCode: row.companyCode,
                description: row.description,
                referenceNo: row.referenceNo,
                counterpartyName: row.counterpartyName,
              },
              c
            );
            return {
              targetType: 'AR' as const,
              targetId: c.id,
              jobId: c.jobId,
              referenceNumber: c.jobNumber,
              counterpartyName: c.customerName,
              companyCode: c.companyCode,
              billedAmount: c.billedAmount,
              remainingAmount: c.remainingAmount,
              paidAmount: c.paidAmount,
              dueDate: c.dueDate ? c.dueDate.toISOString().slice(0, 10) : null,
              status: c.status,
              invoiceNumbers: c.invoiceNumbers,
              score,
              matchReason: reasons.join(' • ') || 'ใกล้เคียงตามเงื่อนไข',
            };
          })
          .filter((c) => c.score >= 35 || c.targetId === row.matchedPaymentTaskId)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      } else {
        candidates = apPool
          .map((c) => {
            const { score, reasons } = scoreApMatch(
              {
                transactionDate: row.transactionDate,
                amount: amt,
                description: row.description,
                referenceNo: row.referenceNo,
                counterpartyName: row.counterpartyName,
              },
              c
            );
            return {
              targetType: 'AP' as const,
              targetId: c.id,
              jobId: null,
              referenceNumber: c.poNumber,
              counterpartyName: c.vendorName,
              companyCode: row.companyCode,
              billedAmount: c.netPayableAmount,
              remainingAmount: c.isSettled ? 0 : c.netPayableAmount,
              paidAmount: c.paidAmount,
              dueDate: c.dueDate.toISOString().slice(0, 10),
              status: c.status,
              invoiceNumbers: [],
              score,
              matchReason: reasons.join(' • ') || 'ใกล้เคียงยอดเจ้าหนี้',
            };
          })
          .filter((c) => c.score >= 35 || c.targetId === row.matchedSupplierTaskId)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    return serializeTransaction(row, candidates);
  });

  return {
    batches: batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      companyCode: b.companyCode,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountName: b.accountName,
      fileName: b.fileName,
      periodStart: b.periodStart ? b.periodStart.toISOString().slice(0, 10) : null,
      periodEnd: b.periodEnd ? b.periodEnd.toISOString().slice(0, 10) : null,
      totalRows: b.totalRows,
      creditRows: b.creditRows,
      debitRows: b.debitRows,
      totalCreditAmount: Number(b.totalCreditAmount || 0),
      totalDebitAmount: Number(b.totalDebitAmount || 0),
      importedByName: b.importedByName,
      importedAt: b.importedAt.toISOString(),
      note: b.note,
    })),
    transactions: serializedTx,
    summary: {
      totalCreditCount,
      totalCreditAmount,
      matchedCreditCount,
      matchedCreditAmount,
      suggestedCreditCount,
      unmatchedCreditCount,
      unmatchedCreditAmount,
      ignoredCreditCount,
      totalDebitCount,
      totalDebitAmount,
      matchedDebitCount,
      unmatchedDebitCount,
      lastImportedAt: batches[0]?.importedAt ? batches[0].importedAt.toISOString() : null,
    },
  };
}

export async function searchReconcileTargets(params: {
  txType: 'CREDIT' | 'DEBIT';
  query: string;
  entity?: string;
}) {
  await requireAccountingOrExecutiveUser();
  const q = params.query.trim();
  const targetEntity = (params.entity || 'ALL').toUpperCase();

  if (params.txType === 'CREDIT') {
    const tasks = await prisma.paymentTask.findMany({
      where: q
        ? {
            OR: [
              { invoiceNumber: { contains: q, mode: 'insensitive' } },
              { note: { contains: q, mode: 'insensitive' } },
              { job: { jobNumber: { contains: q, mode: 'insensitive' } } },
              { job: { customerName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            customerName: true,
            companyCode: true,
            accountingTaxDocuments: true,
            quotation: { select: { actualClosingAmount: true, totalAmountBeforeVat: true } },
            project: { select: { projectValue: true, amountIncludingVat: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return tasks
      .filter((pt) => targetEntity === 'ALL' || matchesCompanyEntity(pt.job?.companyCode, targetEntity))
      .map((pt): ReconcileCandidate => {
        const billedAmount = getPaymentTaskBilledAmount(pt);
        const paidAmount = Number(pt.paidAmount || 0);
        const settled = isScheduleTaskSettled(pt);
        const remainingAmount = settled ? 0 : Math.max(0, billedAmount - paidAmount);
        const docs = extractAccountingDocsFromPaymentTasks([pt]);
        return {
          targetType: 'AR',
          targetId: pt.id,
          jobId: pt.jobId,
          referenceNumber: pt.job?.jobNumber || '-',
          counterpartyName: pt.job?.customerName || '-',
          companyCode: pt.job?.companyCode || 'TG',
          billedAmount,
          remainingAmount,
          paidAmount,
          dueDate: pt.dueDate ? pt.dueDate.toISOString().slice(0, 10) : null,
          status: pt.status,
          invoiceNumbers: docs.map((d) => d.docNumber),
          score: 0,
          matchReason: pt.note || pt.status,
        };
      });
  }

  const spTasks = await prisma.supplierPaymentTask.findMany({
    where: {
      status: { not: 'CANCELLED' },
      ...(q
        ? {
            OR: [
              { poNumber: { contains: q, mode: 'insensitive' } },
              { purchaseOrder: { vendorName: { contains: q, mode: 'insensitive' } } },
              { purchaseOrder: { jobName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      purchaseOrder: { select: { vendorName: true, jobName: true } },
    },
    orderBy: { dueDate: 'desc' },
    take: 40,
  });

  return spTasks.map((st): ReconcileCandidate => {
    const net = Number(st.netPayableAmount || 0);
    const paid = Number(st.paidAmount || 0);
    return {
      targetType: 'AP',
      targetId: st.id,
      jobId: null,
      referenceNumber: st.poNumber,
      counterpartyName: st.purchaseOrder?.vendorName || 'ซัพพลายเออร์',
      companyCode: targetEntity === 'ALL' ? 'TG' : targetEntity,
      billedAmount: net,
      remainingAmount: st.status === 'PAID_VERIFIED' ? 0 : net,
      paidAmount: paid,
      dueDate: st.dueDate.toISOString().slice(0, 10),
      status: st.status,
      invoiceNumbers: [],
      score: 0,
      matchReason: st.purchaseOrder?.jobName || st.paymentType,
    };
  });
}

export async function reconcileBankTransaction(params: {
  transactionId: string;
  targetType: 'AR' | 'AP';
  targetId: string;
  mode: 'LINK_ONLY' | 'LINK_AND_VERIFY' | 'LINK_AND_DEPOSIT';
  invoiceNumber?: string;
  invoiceDate?: string;
  note?: string;
}) {
  const user = await requireAccountingOrExecutiveUser();

  const bankTx = await prisma.bankStatementTransaction.findUnique({
    where: { id: params.transactionId },
  });
  if (!bankTx) {
    return { success: false, error: 'ไม่พบรายการเดินบัญชีธนาคารที่ต้องการกระทบยอด' };
  }

  const txAmount = Number(bankTx.amount || 0);
  const now = new Date();
  const autoNote = params.note?.trim() || `กระทบยอด Statement (${bankTx.bankName} ${bankTx.transactionDate.toISOString().slice(0, 10)})`;

  if (params.targetType === 'AR') {
    const pt = await prisma.paymentTask.findUnique({
      where: { id: params.targetId },
      include: { job: true },
    });
    if (!pt || !pt.job) {
      return { success: false, error: 'ไม่พบรายการลูกหนี้ (PaymentTask) ที่เลือก' };
    }

    if (params.mode === 'LINK_AND_VERIFY' && pt.status !== 'ตรวจสอบและบันทึกแล้ว') {
      await updatePaymentTaskStatus(
        pt.id,
        'ตรวจสอบและบันทึกแล้ว',
        autoNote,
        params.invoiceNumber?.trim() || pt.invoiceNumber || undefined,
        params.invoiceDate || bankTx.transactionDate.toISOString().slice(0, 10)
      );
    } else if (params.mode === 'LINK_AND_DEPOSIT') {
      await recordPaymentDeposit(pt.id, txAmount, autoNote);
    }

    const updated = await prisma.bankStatementTransaction.update({
      where: { id: bankTx.id },
      data: {
        matchStatus: 'MATCHED',
        matchedPaymentTaskId: pt.id,
        matchedSupplierTaskId: null,
        matchedJobId: pt.jobId,
        matchedJobNumber: pt.job.jobNumber,
        matchedCustomerName: pt.job.customerName,
        matchConfidence: 100,
        matchReason:
          params.mode === 'LINK_AND_VERIFY'
            ? 'กระทบยอดและปิดรับเงินแล้ว'
            : params.mode === 'LINK_AND_DEPOSIT'
            ? 'กระทบยอดและบันทึกเงินมัดจำแล้ว'
            : 'กระทบยอดจับคู่กับรายการลูกหนี้',
        matchedAt: now,
        matchedBy: user.fullName || 'ฝ่ายบัญชี',
        reconcileNote: params.note?.trim() || null,
      },
    });

    try {
      revalidatePath('/accounting/dashboard');
      revalidatePath('/accounting');
      revalidatePath('/jobs');
    } catch {}

    return { success: true, transaction: serializeTransaction(updated) };
  }

  // AP (Outgoing Debit)
  const spTask = await prisma.supplierPaymentTask.findUnique({
    where: { id: params.targetId },
    include: { purchaseOrder: { select: { vendorName: true } } },
  });
  if (!spTask) {
    return { success: false, error: 'ไม่พบรายการเจ้าหนี้ (AP) ที่เลือก' };
  }

  if (params.mode === 'LINK_AND_VERIFY' && spTask.status !== 'PAID_VERIFIED') {
    const paidRes = await markSupplierPaymentPaid(spTask.id, {
      paidAmount: txAmount,
      paidDate: bankTx.transactionDate.toISOString().slice(0, 10),
      paidFromBankCode: `${bankTx.bankName}${bankTx.accountNumber ? ` ${bankTx.accountNumber}` : ''}`,
      bankReferenceNumber: bankTx.referenceNo || undefined,
      note: autoNote,
      allowBypassGR: false,
    });
    if (!paidRes?.success) {
      return {
        success: false,
        error: paidRes?.error || 'ไม่สามารถปิดยอดจ่ายเจ้าหนี้ได้ (ลองเลือก "จับคู่กระทบยอดอย่างเดียว")',
      };
    }
  }

  const updatedAp = await prisma.bankStatementTransaction.update({
    where: { id: bankTx.id },
    data: {
      matchStatus: 'MATCHED',
      matchedPaymentTaskId: null,
      matchedSupplierTaskId: spTask.id,
      matchedJobId: null,
      matchedJobNumber: spTask.poNumber,
      matchedCustomerName: spTask.purchaseOrder?.vendorName || 'ซัพพลายเออร์',
      matchConfidence: 100,
      matchReason:
        params.mode === 'LINK_AND_VERIFY'
          ? 'กระทบยอดและบันทึกจ่ายเจ้าหนี้แล้ว'
          : 'กระทบยอดจับคู่กับเจ้าหนี้ (PO)',
      matchedAt: now,
      matchedBy: user.fullName || 'ฝ่ายบัญชี',
      reconcileNote: params.note?.trim() || null,
    },
  });

  try {
    revalidatePath('/accounting/dashboard');
    revalidatePath('/accounting/payables');
  } catch {}

  return { success: true, transaction: serializeTransaction(updatedAp) };
}

export async function unmatchBankTransaction(transactionId: string) {
  await requireAccountingOrExecutiveUser();
  const updated = await prisma.bankStatementTransaction.update({
    where: { id: transactionId },
    data: {
      matchStatus: 'UNMATCHED',
      matchConfidence: null,
      matchReason: null,
      matchedPaymentTaskId: null,
      matchedSupplierTaskId: null,
      matchedJobId: null,
      matchedJobNumber: null,
      matchedCustomerName: null,
      matchedAt: null,
      matchedBy: null,
      reconcileNote: null,
    },
  });
  try {
    revalidatePath('/accounting/dashboard');
  } catch {}
  return { success: true, transaction: serializeTransaction(updated) };
}

export async function ignoreBankTransaction(transactionId: string, reason?: string) {
  const user = await requireAccountingOrExecutiveUser();
  const updated = await prisma.bankStatementTransaction.update({
    where: { id: transactionId },
    data: {
      matchStatus: 'IGNORED',
      matchedPaymentTaskId: null,
      matchedSupplierTaskId: null,
      matchedJobId: null,
      matchedJobNumber: null,
      matchedCustomerName: null,
      matchReason: reason?.trim() || 'ข้ามรายการ (ค่าธรรมเนียม / โอนระหว่างบัญชี)',
      matchedAt: new Date(),
      matchedBy: user.fullName || 'ฝ่ายบัญชี',
      reconcileNote: reason?.trim() || null,
    },
  });
  try {
    revalidatePath('/accounting/dashboard');
  } catch {}
  return { success: true, transaction: serializeTransaction(updated) };
}

export async function deleteBankStatementBatch(batchId: string) {
  await requireAccountingOrExecutiveUser();
  await prisma.bankStatementBatch.delete({ where: { id: batchId } });
  try {
    revalidatePath('/accounting/dashboard');
  } catch {}
  return { success: true };
}
