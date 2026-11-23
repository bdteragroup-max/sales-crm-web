import 'server-only';
import type { Prisma } from '@/generated/client';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { getUser } from '@/app/lib/dal';
import { stringToAdvisoryLockIds } from '@/app/lib/job-utils';
import {
  canAccessCommissionRequestList,
  CrmJobSourceInput,
  doesJobBelongToSalesUser,
  EvaluatedCrmCommissionRow,
  evaluateJobForCommission,
  isCommissionSuperAdmin,
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
  const canAccessCrmList = canAccessCommissionRequestList({
    role: user.role,
    department,
  });

  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    employeeId: user.employeeId,
    isSuperAdmin,
    canAccessCrmList,
    employeeSaleName: user.employeeSale?.fullName ?? null,
    teraEmployeeName: teraEmp?.name ?? null,
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
    },
  },
} satisfies Prisma.JobSelect;

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

  const evaluated: Array<Omit<EvaluatedCrmCommissionRow, 'crmSnapshot'>> = [];

  for (const job of jobs) {
    if (!actor.isSuperAdmin) {
      const ownsJob = doesJobBelongToSalesUser(job, {
        id: actor.id,
        fullName: actor.fullName,
        employeeSaleName: actor.employeeSaleName,
        teraEmployeeName: actor.teraEmployeeName,
      });
      if (!ownsJob) continue;
    }

    const row = evaluateJobForCommission(job as unknown as CrmJobSourceInput);
    const sanitized = sanitizeCrmCommissionRowForRole(row, actor.isSuperAdmin);

    if (companyFilter && companyFilter !== 'ALL' && sanitized.companyCode !== companyFilter) {
      continue;
    }

    if (statusFilter && statusFilter !== 'ALL' && sanitized.derivedStatus !== statusFilter) {
      continue;
    }

    if (
      actor.isSuperAdmin &&
      salespersonFilter &&
      salespersonFilter !== 'ALL' &&
      sanitized.salespersonName !== salespersonFilter
    ) {
      continue;
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

export async function generateNextCommissionRequestNo(tx: DbTransactionClient): Promise<string> {
  const bangkokNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  );
  const yearBe = bangkokNow.getFullYear() + 543;
  const month = bangkokNow.getMonth() + 1;

  const seq = await tx.commissionRunningNumber.upsert({
    where: { yearBe_month: { yearBe, month } },
    create: { yearBe, month, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const yy = String(yearBe).slice(-2);
  const mm = String(month).padStart(2, '0');
  const num = String(seq.lastNumber).padStart(4, '0');
  return `CM${yy}${mm}-${num}`;
}

export async function acquireCommissionJobLock(tx: DbTransactionClient, jobId: string) {
  const [k1, k2] = stringToAdvisoryLockIds(`comm_req:${jobId}`);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k1}::int, ${k2}::int)`;
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
  if (filters?.salespersonName && filters.salespersonName !== 'ALL') {
    where.salespersonName = filters.salespersonName;
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

  const items = await prisma.salesCommissionRequest.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
    },
  });

  const q = (filters?.search || '').trim().toLowerCase();
  const filtered = q
    ? items.filter((item) =>
        [
          item.requestNo,
          item.jobNumber,
          item.customerName,
          item.productSold || '',
          item.taxInvoiceNumbers || '',
          item.receiptNumbers || '',
          item.salespersonName,
          item.payoutRefNo || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    : items;

  return filtered;
}

export async function fetchCommissionRequestDetailAdmin(id: string) {
  const reqRecord = await prisma.salesCommissionRequest.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
      },
      job: {
        select: CRM_JOB_COMMISSION_SELECT,
      },
    },
  });
  return reqRecord;
}
