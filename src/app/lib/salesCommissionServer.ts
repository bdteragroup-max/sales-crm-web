import 'server-only';
import type { Prisma } from '@/generated/client';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { getUser } from '@/app/lib/dal';
import { stringToAdvisoryLockIds } from '@/app/lib/job-utils';
import { buildThaiPersonNameVariants } from '@/app/lib/personName';
import {
  canAccessCommissionRequestList,
  CommissionDuplicateCandidate,
  CommissionRecipientOption,
  CrmJobInvoiceCandidate,
  CrmJobSourceInput,
  doesJobBelongToSalesUser,
  doesUserMatchSplit,
  EvaluatedCrmCommissionRow,
  evaluateJobForCommission,
  extractJobAccountingDocumentSummary,
  findTaxInvoiceDuplicates,
  isCommissionSuperAdmin,
  parseTaxInvoiceTokens,
  sanitizeCrmCommissionRowForRole,
} from '@/app/lib/salesCommission';

type DbTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type CommissionActor = {
  id: string;
  fullName: string;
  role: string;
  employeeId: string;
  isSuperAdmin: boolean;
  canAccessCrmList: boolean;
  employeeSaleName: string | null;
  teraEmployeeName: string | null;
};

export async function getCommissionActor(): Promise<CommissionActor | null> {
  const user = await getUser();
  if (!user) return null;

  let teraEmp: { name: string | null; departments: { name: string } | null } | null = null;
  if (user.employeeId) {
    try {
      teraEmp = await teraDb.employees.findUnique({
        where: { emp_id: user.employeeId },
        select: { name: true, departments: { select: { name: true } } },
      });
    } catch (e) {
      console.warn('[Commission] teraDb lookup warning:', e);
    }
  }

  const department = user.employeeSale?.department || teraEmp?.departments?.name || null;
  const isSuperAdmin = isCommissionSuperAdmin(user.role);
  const employeeSaleName = user.employeeSale?.fullName ?? null;
  const teraEmployeeName = teraEmp?.name ?? null;

  let canAccessCrmList = canAccessCommissionRequestList({
    role: user.role,
    department,
  });

  // Also allow any non-sales employee who has been allocated a commission split to view their shares.
  if (!canAccessCrmList) {
    const nameVariants = buildThaiPersonNameVariants(
      user.fullName,
      employeeSaleName,
      teraEmployeeName
    );
    const hasSplit = await prisma.salesCommissionSplit.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(nameVariants.length > 0 ? [{ recipientName: { in: nameVariants } }] : []),
        ],
      },
      select: { id: true },
    });
    if (hasSplit) {
      canAccessCrmList = true;
    }
  }

  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    employeeId: user.employeeId,
    isSuperAdmin,
    canAccessCrmList,
    employeeSaleName,
    teraEmployeeName,
  };
}

export const CRM_JOB_COMMISSION_SELECT = {
  id: true,
  jobNumber: true,
  companyCode: true,
  jobType: true,
  customerName: true,
  item: true,
  sellerName: true,
  currentStep: true,
  flowVariant: true,
  paymentMethod: true,
  paymentStatus: true,
  accountingVerifiedBeforeVat: true,
  accountingTaxDocuments: true,
  accountingClosedAt: true,
  accountingClosedBy: true,
  createdAt: true,
  quotation: {
    select: {
      id: true,
      quotationNumber: true,
      productType: true,
      subject: true,
      invoiceNumber: true,
      salesBeforeVat: true,
      totalAmountBeforeVat: true,
      actualClosingAmount: true,
      salespersonId: true,
      salesperson: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  },
  project: {
    select: {
      id: true,
      projectNumber: true,
      name: true,
      projectValue: true,
      amountBeforeVat: true,
      amountIncludingVat: true,
    },
  },
  paymentTasks: {
    orderBy: [{ installmentNo: 'asc' as const }, { dueDate: 'asc' as const }, { createdAt: 'asc' as const }],
    select: {
      id: true,
      status: true,
      creditType: true,
      installmentNo: true,
      installmentTotal: true,
      installmentAmount: true,
      paidAmount: true,
      dueDate: true,
      paidDate: true,
      invoiceDate: true,
      invoiceNumber: true,
      note: true,
    },
  },
  stepLogs: {
    orderBy: { completedAt: 'asc' as const },
    select: {
      id: true,
      step: true,
      completedBy: true,
      department: true,
      note: true,
      completedAt: true,
    },
  },
  repairDeliveries: {
    select: {
      id: true,
      deliveryNumber: true,
      accountingInvoiceNo: true,
    },
  },
  repairOrder: {
    select: {
      invoiceNo: true,
    },
  },
  goodsReturns: {
    select: {
      id: true,
      documentNo: true,
      status: true,
    },
  },
  commissionRequests: {
    orderBy: { requestedAt: 'desc' as const },
    select: {
      id: true,
      requestNo: true,
      status: true,
      requestedAt: true,
      requestedByName: true,
      confirmedProfitPct: true,
      commissionRatePct: true,
      commissionAmount: true,
      rejectedReason: true,
      payoutDate: true,
      payoutAmount: true,
      payoutRefNo: true,
      splits: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          userId: true,
          employeeId: true,
          recipientName: true,
          recipientRole: true,
          splitPct: true,
          allocatedAmount: true,
          isOwner: true,
          sortOrder: true,
        },
      },
    },
  },
} satisfies Prisma.JobSelect;

export async function fetchCommissionRecipientOptions(): Promise<CommissionRecipientOption[]> {
  const [users, hrEmployees] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        role: true,
        position: true,
        employeeSale: { select: { department: true, nickname: true } },
      },
      orderBy: [{ fullName: 'asc' }],
    }),
    teraDb.employees
      .findMany({
        where: { is_active: true },
        select: { emp_id: true, nickname: true, name: true },
      })
      .catch(() => []),
  ]);

  const hrNickByEmpId = new Map<string, string>();
  const hrNickByName = new Map<string, string>();
  for (const emp of hrEmployees) {
    const nick = emp.nickname?.trim();
    if (!nick) continue;
    if (emp.emp_id) {
      hrNickByEmpId.set(emp.emp_id.trim().toUpperCase(), nick);
    }
    if (emp.name) {
      for (const variant of buildThaiPersonNameVariants(emp.name)) {
        hrNickByName.set(variant.toLowerCase(), nick);
      }
    }
  }

  return users.map((u) => {
    const empKey = u.employeeId?.trim().toUpperCase();
    let nickname = u.employeeSale?.nickname?.trim() || null;
    if (!nickname && empKey) {
      nickname = hrNickByEmpId.get(empKey) || null;
    }
    if (!nickname && u.fullName) {
      for (const variant of buildThaiPersonNameVariants(u.fullName)) {
        const matched = hrNickByName.get(variant.toLowerCase());
        if (matched) {
          nickname = matched;
          break;
        }
      }
    }
    return {
      id: u.id,
      employeeId: u.employeeId,
      fullName: u.fullName,
      nickname,
      role: u.role,
      department: u.employeeSale?.department || u.position || null,
    };
  });
}

export async function syncRequestSplitAllocations(
  tx: DbTransactionClient,
  requestId: string,
  totalCommissionAmount: number | null,
  preloadedSplits?: Array<{
    id: string;
    splitPct: number;
    allocatedAmount: number | null;
    sortOrder: number;
  }>
) {
  const existingSplits = preloadedSplits
    ? [...preloadedSplits].sort((a, b) => a.sortOrder - b.sortOrder)
    : await tx.salesCommissionSplit.findMany({
        where: { requestId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, splitPct: true, allocatedAmount: true, sortOrder: true },
      });

  if (existingSplits.length === 0) return;

  const { allocateCommissionAmountsBySplits } = await import('@/app/lib/salesCommission');
  const nextAllocations = allocateCommissionAmountsBySplits(totalCommissionAmount, existingSplits);

  for (const split of nextAllocations) {
    if (split.allocatedAmount !== existingSplits.find((s) => s.id === split.id)?.allocatedAmount) {
      await tx.salesCommissionSplit.update({
        where: { id: split.id },
        data: { allocatedAmount: split.allocatedAmount },
      });
    }
  }
}

export async function fetchCrmCommissionJobs(params: {
  actor: CommissionActor;
  search?: string;
  statusFilter?: string;
  companyFilter?: string;
  salespersonFilter?: string;
}): Promise<{
  rows: Array<Omit<EvaluatedCrmCommissionRow, 'crmSnapshot'>>;
  fetchedAt: string;
}> {
  const { actor, search, statusFilter, companyFilter, salespersonFilter } = params;

  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    select: CRM_JOB_COMMISSION_SELECT,
  });

  const fetchedAt = new Date().toISOString();
  const normalizedSearch = (search || '').trim().toLowerCase();

  const actorUser = {
    id: actor.id,
    fullName: actor.fullName,
    employeeSaleName: actor.employeeSaleName,
    teraEmployeeName: actor.teraEmployeeName,
  };

  const evaluated: Array<Omit<EvaluatedCrmCommissionRow, 'crmSnapshot'>> = [];

  for (const job of jobs) {
    const ownsJob = actor.isSuperAdmin || doesJobBelongToSalesUser(job, actorUser);
    const row = evaluateJobForCommission(job as unknown as CrmJobSourceInput);
    const activeSplits = row.existingRequest?.splits || [];
    const viewerSplit = activeSplits.find((s) => doesUserMatchSplit(s, actorUser)) || null;

    if (!actor.isSuperAdmin && !ownsJob && !viewerSplit) {
      continue;
    }

    row.isJobOwner = ownsJob;
    row.mySplit = viewerSplit;

    const sanitized = sanitizeCrmCommissionRowForRole(row, actor.isSuperAdmin);

    if (companyFilter && companyFilter !== 'ALL' && sanitized.companyCode !== companyFilter) {
      continue;
    }

    if (statusFilter && statusFilter !== 'ALL' && sanitized.derivedStatus !== statusFilter) {
      continue;
    }

    if (actor.isSuperAdmin && salespersonFilter && salespersonFilter !== 'ALL') {
      const matchesOwner = sanitized.salespersonName === salespersonFilter;
      const matchesSplit = activeSplits.some((s) => s.recipientName === salespersonFilter);
      if (!matchesOwner && !matchesSplit) continue;
    }

    if (normalizedSearch) {
      const haystack = [
        sanitized.jobNumber,
        sanitized.customerName,
        sanitized.productSold,
        sanitized.taxInvoiceNumbers,
        sanitized.receiptNumbers,
        sanitized.salespersonName,
        sanitized.existingRequest?.requestNo || '',
        ...activeSplits.map((s) => s.recipientName),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) continue;
    }

    const { crmSnapshot: _omitSnapshot, ...rowWithoutSnapshot } = sanitized;
    void _omitSnapshot;
    evaluated.push(rowWithoutSnapshot);
  }

  return { rows: evaluated, fetchedAt };
}

export async function generateCommissionRequestNoRange(
  tx: DbTransactionClient,
  count: number
): Promise<string[]> {
  if (count <= 0) return [];

  const bangkokNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  );
  const yearBe = bangkokNow.getFullYear() + 543;
  const month = bangkokNow.getMonth() + 1;

  const seq = await tx.commissionRunningNumber.upsert({
    where: { yearBe_month: { yearBe, month } },
    create: { yearBe, month, lastNumber: count },
    update: { lastNumber: { increment: count } },
  });

  const yy = String(yearBe).slice(-2);
  const mm = String(month).padStart(2, '0');
  const startNumber = seq.lastNumber - count + 1;

  return Array.from({ length: count }, (_, idx) => {
    const num = String(startNumber + idx).padStart(4, '0');
    return `CM${yy}${mm}-${num}`;
  });
}

export async function generateNextCommissionRequestNo(tx: DbTransactionClient): Promise<string> {
  const [requestNo] = await generateCommissionRequestNoRange(tx, 1);
  return requestNo;
}

export async function acquireCommissionJobLocks(tx: DbTransactionClient, jobIds: string[]) {
  const uniqueIds = Array.from(new Set(jobIds.filter((id) => id.trim().length > 0)));
  if (uniqueIds.length === 0) return;

  // Sort lock keys deterministically across concurrent transactions to avoid deadlocks.
  const sortedPairs = uniqueIds
    .map((jobId) => stringToAdvisoryLockIds(`comm_req:${jobId}`))
    .sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
  const k1s = sortedPairs.map(([k1]) => k1);
  const k2s = sortedPairs.map(([, k2]) => k2);

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(k.k1, k.k2)
    FROM unnest(${k1s}::int[], ${k2s}::int[]) AS k(k1, k2)
  `;
}

export async function acquireCommissionJobLock(tx: DbTransactionClient, jobId: string) {
  await acquireCommissionJobLocks(tx, [jobId]);
}

export class CommissionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommissionConflictError';
  }
}

/**
 * Ensures activating or updating a commission request will not collide with
 * `uniq_active_commission_per_job` (one non-REJECTED request per job_id).
 */
export async function assertNoActiveCommissionConflictForJob(
  tx: DbTransactionClient,
  params: {
    requestId: string;
    jobId: string;
    jobNumber: string;
    nextStatus: string;
    actionLabel?: string;
  }
): Promise<void> {
  if (params.nextStatus === 'REJECTED') return;

  const activeSibling = await tx.salesCommissionRequest.findFirst({
    where: {
      jobId: params.jobId,
      id: { not: params.requestId },
      status: { not: 'REJECTED' },
    },
    orderBy: { requestedAt: 'desc' },
    select: { requestNo: true },
  });

  if (activeSibling) {
    const verb = params.actionLabel || 'บันทึก';
    throw new CommissionConflictError(
      `ไม่สามารถ${verb}ได้ เนื่องจาก Job ${params.jobNumber} มีคำขอค่าคอมมิชชั่นที่ใช้งานอยู่แล้ว (${activeSibling.requestNo})`
    );
  }
}

export function resolveCommissionMutationError(
  error: unknown,
  fallbackMessage: string
): { status: number; message: string } {
  if (error instanceof CommissionConflictError) {
    return { status: 400, message: error.message };
  }

  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (
    prismaCode === 'P2002' ||
    rawMessage.includes('uniq_active_commission_per_job') ||
    (rawMessage.includes('Unique constraint failed') && rawMessage.includes('job_id'))
  ) {
    return {
      status: 400,
      message: 'ไม่สามารถบันทึกได้ เนื่องจาก Job นี้มีคำขอค่าคอมมิชชั่นที่ใช้งานอยู่แล้ว',
    };
  }

  const isBusinessValidation =
    rawMessage.includes('กรุณา') ||
    rawMessage.includes('ตัวเลข') ||
    rawMessage.includes('จ่ายเงิน') ||
    rawMessage.includes('ไม่สามารถ') ||
    rawMessage.includes('ไม่พบ');

  return {
    status: isBusinessValidation ? 400 : 500,
    message: rawMessage || fallbackMessage,
  };
}

const ACCOUNTING_JOB_INVOICE_SELECT = {
  id: true,
  jobNumber: true,
  customerName: true,
  currentStep: true,
  accountingTaxDocuments: true,
  accountingClosedAt: true,
  createdAt: true,
  quotation: { select: { invoiceNumber: true } },
  paymentTasks: {
    select: {
      invoiceNumber: true,
      invoiceDate: true,
      note: true,
    },
  },
  repairDeliveries: {
    select: { accountingInvoiceNo: true },
  },
  repairOrder: {
    select: { invoiceNo: true },
  },
  stepLogs: {
    where: { step: 'accounting' },
    orderBy: { completedAt: 'asc' as const },
    select: {
      step: true,
      note: true,
      completedAt: true,
    },
  },
} satisfies Prisma.JobSelect;

async function loadInvoiceDuplicateCorpus(): Promise<{
  commissionRequests: CommissionDuplicateCandidate[];
  crmJobs: CrmJobInvoiceCandidate[];
}> {
  const [rawRequests, crmJobs] = await Promise.all([
    prisma.salesCommissionRequest.findMany({
      where: {
        status: { not: 'REJECTED' },
      },
      select: {
        id: true,
        requestNo: true,
        jobId: true,
        jobNumber: true,
        customerName: true,
        status: true,
        taxInvoiceNumbers: true,
        taxInvoiceDate: true,
        requestedAt: true,
      },
    }),
    prisma.job.findMany({
      select: ACCOUNTING_JOB_INVOICE_SELECT,
    }),
  ]);

  const crmJobById = new Map(crmJobs.map((job) => [job.id, job]));
  const commissionRequests: CommissionDuplicateCandidate[] = rawRequests.map((req) => {
    const linkedJob = crmJobById.get(req.jobId);
    if (!linkedJob) return req;
    const summary = extractJobAccountingDocumentSummary(linkedJob);
    return {
      ...req,
      taxInvoiceNumbers: summary.taxInvoices.join(', ') || null,
      taxInvoiceDate: summary.earliestInvoiceDate || req.taxInvoiceDate,
    };
  });

  return { commissionRequests, crmJobs };
}

function enrichAdminRequestWithAccountingInvoices<
  T extends {
    id: string;
    jobId: string;
    taxInvoiceNumbers: string | null;
    taxInvoiceDate: Date | null;
    receiptNumbers: string | null;
    requestedAt: Date;
    job?: Omit<CrmJobInvoiceCandidate, 'id' | 'jobNumber' | 'customerName'> | null;
  }
>(
  item: T,
  corpus: {
    commissionRequests: CommissionDuplicateCandidate[];
    crmJobs: CrmJobInvoiceCandidate[];
  }
) {
  const docSummary = item.job ? extractJobAccountingDocumentSummary(item.job) : null;
  const resolvedTaxInvoiceNumbers = item.job
    ? docSummary!.taxInvoices.join(', ') || null
    : item.taxInvoiceNumbers;
  const resolvedTaxInvoiceDate = item.job
    ? docSummary!.earliestInvoiceDate || item.taxInvoiceDate
    : item.taxInvoiceDate;
  const hasExplicitInvoiceDate = item.job
    ? docSummary!.hasExplicitDocDate
    : Boolean(item.taxInvoiceDate);
  const resolvedReceiptNumbers = item.job
    ? docSummary!.receipts.join(', ') || null
    : item.receiptNumbers;
  const candidateTokens = item.job
    ? docSummary!.taxInvoices
    : parseTaxInvoiceTokens(item.taxInvoiceNumbers);

  const invoiceDuplicates =
    candidateTokens.length > 0
      ? findTaxInvoiceDuplicates({
          candidateTokens,
          referenceDate: resolvedTaxInvoiceDate || item.requestedAt,
          excludeRequestId: item.id,
          excludeJobId: item.jobId,
          commissionRequests: corpus.commissionRequests,
          crmJobs: corpus.crmJobs,
        })
      : [];

  return {
    ...item,
    taxInvoiceNumbers: resolvedTaxInvoiceNumbers,
    taxInvoiceDate: resolvedTaxInvoiceDate,
    hasExplicitInvoiceDate,
    receiptNumbers: resolvedReceiptNumbers,
    invoiceDuplicates,
  };
}

/**
 * Syncs stored invoice columns on active SalesCommissionRequest records whenever Accounting updates a Job.
 */
export async function syncAccountingInvoicesToCommissionRequests(jobId: string): Promise<void> {
  if (!jobId) return;
  try {
    const [job, requests] = await Promise.all([
      prisma.job.findUnique({
        where: { id: jobId },
        select: ACCOUNTING_JOB_INVOICE_SELECT,
      }),
      prisma.salesCommissionRequest.findMany({
        where: {
          jobId,
          status: { not: 'REJECTED' },
        },
        select: { id: true },
      }),
    ]);
    if (!job || requests.length === 0) return;

    const summary = extractJobAccountingDocumentSummary(job);
    const nextTaxInvoices = summary.taxInvoices.join(', ') || '-';
    const nextReceipts = summary.receipts.join(', ') || '-';

    await prisma.salesCommissionRequest.updateMany({
      where: {
        jobId,
        status: { not: 'REJECTED' },
      },
      data: {
        taxInvoiceNumbers: nextTaxInvoices,
        taxInvoiceDate: summary.earliestInvoiceDate,
        receiptNumbers: nextReceipts,
      },
    });
  } catch (err) {
    console.warn('[Commission] syncAccountingInvoicesToCommissionRequests warning:', err);
  }
}

export async function fetchAllCommissionRequestsAdmin(filters?: {
  status?: string;
  search?: string;
  companyCode?: string;
  salespersonName?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters?.companyCode && filters.companyCode !== 'ALL') {
    where.companyCode = filters.companyCode;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const requestedAtRange: Record<string, Date> = {};
    if (filters.dateFrom) {
      const d = new Date(`${filters.dateFrom}T00:00:00+07:00`);
      if (!Number.isNaN(d.getTime())) requestedAtRange.gte = d;
    }
    if (filters.dateTo) {
      const d = new Date(`${filters.dateTo}T23:59:59.999+07:00`);
      if (!Number.isNaN(d.getTime())) requestedAtRange.lte = d;
    }
    if (Object.keys(requestedAtRange).length > 0) {
      where.requestedAt = requestedAtRange;
    }
  }

  const [items, corpus] = await Promise.all([
    prisma.salesCommissionRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        splits: {
          orderBy: { sortOrder: 'asc' },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
        job: {
          select: ACCOUNTING_JOB_INVOICE_SELECT,
        },
      },
    }),
    loadInvoiceDuplicateCorpus(),
  ]);

  const enrichedItems = items.map((item) =>
    enrichAdminRequestWithAccountingInvoices(item, corpus)
  );

  const targetSalesperson =
    filters?.salespersonName && filters.salespersonName !== 'ALL'
      ? filters.salespersonName
      : null;

  const q = (filters?.search || '').trim().toLowerCase();
  const filtered = enrichedItems.filter((item) => {
    if (targetSalesperson) {
      const matchesPrimary = item.salespersonName === targetSalesperson;
      const matchesSplit = item.splits.some((s) => s.recipientName === targetSalesperson);
      if (!matchesPrimary && !matchesSplit) return false;
    }

    if (q) {
      const haystack = [
        item.requestNo,
        item.jobNumber,
        item.customerName,
        item.productSold || '',
        item.taxInvoiceNumbers || '',
        item.receiptNumbers || '',
        item.salespersonName,
        item.payoutRefNo || '',
        ...item.splits.map((s) => s.recipientName),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return filtered;
}

export async function fetchCommissionRequestDetailAdmin(id: string) {
  const [reqRecord, corpus] = await Promise.all([
    prisma.salesCommissionRequest.findUnique({
      where: { id },
      include: {
        splits: {
          orderBy: { sortOrder: 'asc' },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
        },
        job: {
          select: CRM_JOB_COMMISSION_SELECT,
        },
      },
    }),
    loadInvoiceDuplicateCorpus(),
  ]);
  if (!reqRecord) return null;

  return enrichAdminRequestWithAccountingInvoices(reqRecord, corpus);
}
