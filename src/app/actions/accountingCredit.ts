"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/app/lib/session";

export interface CustomerCreditSettingDTO {
  id: string;
  customerName: string;
  taxId: string;
  companyId?: string | null;
  creditLimit: number;
  creditTermsDays: number;
  creditStatus: "ACTIVE" | "WATCHLIST" | "SUSPENDED" | "BLOCKED" | string;
  billingCycleRule?: string | null;
  notes?: string | null;
  riskGrade?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Live exposure metrics
  tgExposure: number;
  teExposure: number;
  tpExposure: number;
  totalExposure: number;
  remainingLimit: number;
  utilizationPercent: number;
  maxOverdueDays: number;
  jobCount: number;
  isConfigured: boolean;
}

export interface CreditSettingsSummary {
  totalApprovedLimit: number;
  totalConfiguredExposure: number;
  totalAllExposure: number;
  totalRemainingLimit: number;
  configuredCount: number;
  unconfiguredCount: number;
  exceededCount: number;
  watchlistCount: number;
  suspendedCount: number;
}

export interface SaveCreditSettingInput {
  id?: string;
  customerName: string;
  taxId?: string;
  companyId?: string;
  creditLimit: number;
  creditTermsDays: number;
  creditStatus?: string;
  billingCycleRule?: string;
  notes?: string;
  riskGrade?: string;
}

async function getCurrentUserName(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return "เจ้าหน้าที่ฝ่ายบัญชี";
    const payload = await decrypt(session);
    if (!payload?.userId) return "เจ้าหน้าที่ฝ่ายบัญชี";
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { fullName: true }
    });
    return user?.fullName || "เจ้าหน้าที่ฝ่ายบัญชี";
  } catch {
    return "เจ้าหน้าที่ฝ่ายบัญชี";
  }
}

export async function getAccountingCreditSettings(search?: string, statusFilter?: string) {
  // 1. Fetch all configured credit settings
  let settings: any[] = [];
  try {
    if ((prisma as any).customerCreditSetting?.findMany) {
      settings = await (prisma as any).customerCreditSetting.findMany({
        orderBy: { updatedAt: "desc" }
      });
    } else {
      settings = (await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          id, 
          customer_name as "customerName", 
          tax_id as "taxId", 
          company_id as "companyId", 
          credit_limit as "creditLimit", 
          credit_terms_days as "creditTermsDays", 
          credit_status as "creditStatus", 
          billing_cycle_rule as "billingCycleRule", 
          notes, 
          risk_grade as "riskGrade", 
          reviewed_by as "reviewedBy", 
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM customer_credit_settings
        ORDER BY updated_at DESC
      `)) || [];
    }
  } catch (err) {
    console.error("Error fetching credit settings:", err);
    settings = [];
  }

  const settingsMap = new Map<string, typeof settings[0]>();
  for (const s of settings) {
    settingsMap.set(s.customerName.trim().toLowerCase(), s);
  }

  // 2. Fetch all active payment tasks to compute live exposure per customer
  const activeTasks = await prisma.paymentTask.findMany({
    where: {
      status: { not: "ตรวจสอบและบันทึกแล้ว" }
    },
    include: {
      job: {
        select: {
          id: true,
          jobNumber: true,
          customerName: true,
          companyCode: true,
          quotation: {
            select: {
              actualClosingAmount: true,
              totalAmountBeforeVat: true,
              company: {
                select: {
                  taxId: true
                }
              }
            }
          },
          project: {
            select: {
              projectValue: true
            }
          }
        }
      }
    }
  });

  const now = new Date();
  interface CustomerExposure {
    customerName: string;
    taxId: string;
    tg: number;
    te: number;
    tp: number;
    totalExposure: number;
    maxOverdueDays: number;
    jobCount: number;
  }

  const exposureMap = new Map<string, CustomerExposure>();

  for (const pt of activeTasks) {
    if (!pt.job?.customerName) continue;
    const cName = pt.job.customerName.trim();
    const key = cName.toLowerCase();

    if (!exposureMap.has(key)) {
      const taxId = pt.job.quotation?.company?.taxId || "";
      exposureMap.set(key, {
        customerName: cName,
        taxId,
        tg: 0,
        te: 0,
        tp: 0,
        totalExposure: 0,
        maxOverdueDays: 0,
        jobCount: 0
      });
    }

    const exp = exposureMap.get(key)!;
    const amount = Number(pt.installmentAmount) ||
      Number(pt.job.project?.projectValue) ||
      Number(pt.job.quotation?.actualClosingAmount) ||
      Number(pt.job.quotation?.totalAmountBeforeVat) ||
      0;
    const paid = Number(pt.paidAmount) || 0;
    const outstanding = Math.max(0, amount - paid);

    exp.totalExposure += outstanding;
    exp.jobCount++;

    const code = (pt.job.companyCode || "").toUpperCase();
    if (code.includes("TG") || code.includes("GROUP")) exp.tg += outstanding;
    else if (code.includes("TE") || code.includes("ELECTRIC")) exp.te += outstanding;
    else if (code.includes("TP") || code.includes("POWER")) exp.tp += outstanding;
    else exp.tg += outstanding;

    if (pt.dueDate) {
      const dDate = new Date(pt.dueDate);
      if (dDate < now) {
        const diffDays = Math.floor((now.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > exp.maxOverdueDays) exp.maxOverdueDays = diffDays;
      }
    }
  }

  // 3. Merge configured settings with live exposure
  const configuredList: CustomerCreditSettingDTO[] = [];
  const configuredKeys = new Set<string>();

  for (const s of settings) {
    const key = s.customerName.trim().toLowerCase();
    configuredKeys.add(key);

    const exp = exposureMap.get(key) || {
      tg: 0,
      te: 0,
      tp: 0,
      totalExposure: 0,
      maxOverdueDays: 0,
      jobCount: 0
    };

    const remaining = s.creditLimit - exp.totalExposure;
    const utilization = s.creditLimit > 0 ? (exp.totalExposure / s.creditLimit) * 100 : 0;

    configuredList.push({
      id: s.id,
      customerName: s.customerName,
      taxId: s.taxId || "",
      companyId: s.companyId,
      creditLimit: s.creditLimit,
      creditTermsDays: s.creditTermsDays,
      creditStatus: s.creditStatus,
      billingCycleRule: s.billingCycleRule,
      notes: s.notes,
      riskGrade: s.riskGrade,
      reviewedBy: s.reviewedBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      tgExposure: exp.tg,
      teExposure: exp.te,
      tpExposure: exp.tp,
      totalExposure: exp.totalExposure,
      remainingLimit: remaining,
      utilizationPercent: Number(utilization.toFixed(1)),
      maxOverdueDays: exp.maxOverdueDays,
      jobCount: exp.jobCount,
      isConfigured: true
    });
  }

  // 4. Identify unconfigured debtors who have active debt in system
  const unconfiguredList: CustomerCreditSettingDTO[] = [];
  for (const [key, exp] of exposureMap.entries()) {
    if (!configuredKeys.has(key)) {
      unconfiguredList.push({
        id: `unconf-${key}`,
        customerName: exp.customerName,
        taxId: exp.taxId,
        companyId: null,
        creditLimit: 0,
        creditTermsDays: 30, // Default 30 days
        creditStatus: "PENDING_SETUP",
        billingCycleRule: null,
        notes: null,
        riskGrade: exp.maxOverdueDays > 60 ? "HIGH" : exp.maxOverdueDays > 30 ? "MEDIUM" : "LOW",
        reviewedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tgExposure: exp.tg,
        teExposure: exp.te,
        tpExposure: exp.tp,
        totalExposure: exp.totalExposure,
        remainingLimit: -exp.totalExposure,
        utilizationPercent: 100,
        maxOverdueDays: exp.maxOverdueDays,
        jobCount: exp.jobCount,
        isConfigured: false
      });
    }
  }

  // Sort unconfigured by debt amount descending
  unconfiguredList.sort((a, b) => b.totalExposure - a.totalExposure);

  // Combine for search/filter
  let allCombined = [...configuredList, ...unconfiguredList];

  // Apply Search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    allCombined = allCombined.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.taxId.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }

  // Apply Status Filter
  if (statusFilter && statusFilter !== "ALL") {
    if (statusFilter === "CONFIGURED") {
      allCombined = allCombined.filter((c) => c.isConfigured);
    } else if (statusFilter === "UNCONFIGURED") {
      allCombined = allCombined.filter((c) => !c.isConfigured);
    } else if (statusFilter === "EXCEEDED") {
      allCombined = allCombined.filter((c) => c.isConfigured && c.remainingLimit < 0);
    } else {
      allCombined = allCombined.filter((c) => c.creditStatus === statusFilter);
    }
  }

  // Calculate Summary Statistics
  const totalApprovedLimit = configuredList.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalConfiguredExposure = configuredList.reduce((sum, c) => sum + c.totalExposure, 0);
  const totalAllExposure = Array.from(exposureMap.values()).reduce((sum, c) => sum + c.totalExposure, 0);
  const totalRemainingLimit = totalApprovedLimit - totalConfiguredExposure;
  const exceededCount = configuredList.filter((c) => c.remainingLimit < 0).length;
  const watchlistCount = configuredList.filter((c) => c.creditStatus === "WATCHLIST").length;
  const suspendedCount = configuredList.filter((c) => c.creditStatus === "SUSPENDED" || c.creditStatus === "BLOCKED").length;

  const summary: CreditSettingsSummary = {
    totalApprovedLimit,
    totalConfiguredExposure,
    totalAllExposure,
    totalRemainingLimit,
    configuredCount: configuredList.length,
    unconfiguredCount: unconfiguredList.length,
    exceededCount,
    watchlistCount,
    suspendedCount
  };

  return {
    items: allCombined,
    configuredCount: configuredList.length,
    unconfiguredCount: unconfiguredList.length,
    summary
  };
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore when running outside of Next.js HTTP request lifecycle
  }
}

export async function saveCustomerCreditSetting(input: SaveCreditSettingInput) {
  if (!input.customerName || !input.customerName.trim()) {
    return { success: false, error: "กรุณาระบุชื่อลูกค้า" };
  }

  const trimmedName = input.customerName.trim();
  const reviewer = await getCurrentUserName();

  try {
    let savedItem;
    if ((prisma as any).customerCreditSetting) {
      const existing = await (prisma as any).customerCreditSetting.findUnique({
        where: { customerName: trimmedName }
      });

      if (existing) {
        savedItem = await (prisma as any).customerCreditSetting.update({
          where: { id: existing.id },
          data: {
            taxId: input.taxId?.trim() || existing.taxId,
            companyId: input.companyId || existing.companyId,
            creditLimit: Number(input.creditLimit) || 0,
            creditTermsDays: Number(input.creditTermsDays) || 30,
            creditStatus: input.creditStatus || existing.creditStatus,
            billingCycleRule: input.billingCycleRule !== undefined ? input.billingCycleRule : existing.billingCycleRule,
            notes: input.notes !== undefined ? input.notes : existing.notes,
            riskGrade: input.riskGrade || existing.riskGrade,
            reviewedBy: reviewer,
            updatedAt: new Date()
          }
        });
      } else {
        savedItem = await (prisma as any).customerCreditSetting.create({
          data: {
            customerName: trimmedName,
            taxId: input.taxId?.trim() || null,
            companyId: input.companyId || null,
            creditLimit: Number(input.creditLimit) || 0,
            creditTermsDays: Number(input.creditTermsDays) || 30,
            creditStatus: input.creditStatus || "ACTIVE",
            billingCycleRule: input.billingCycleRule || null,
            notes: input.notes || null,
            riskGrade: input.riskGrade || "LOW",
            reviewedBy: reviewer
          }
        });
      }
    } else {
      const id = input.id || "cs_" + Date.now();
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO customer_credit_settings (
          id, customer_name, tax_id, company_id, credit_limit, credit_terms_days,
          credit_status, billing_cycle_rule, notes, risk_grade, reviewed_by, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (customer_name) DO UPDATE SET
          tax_id = EXCLUDED.tax_id,
          credit_limit = EXCLUDED.credit_limit,
          credit_terms_days = EXCLUDED.credit_terms_days,
          credit_status = EXCLUDED.credit_status,
          billing_cycle_rule = EXCLUDED.billing_cycle_rule,
          notes = EXCLUDED.notes,
          risk_grade = EXCLUDED.risk_grade,
          reviewed_by = EXCLUDED.reviewed_by,
          updated_at = CURRENT_TIMESTAMP
      `,
        id,
        trimmedName,
        input.taxId?.trim() || null,
        input.companyId || null,
        Number(input.creditLimit) || 0,
        Number(input.creditTermsDays) || 30,
        input.creditStatus || "ACTIVE",
        input.billingCycleRule || null,
        input.notes || null,
        input.riskGrade || "LOW",
        reviewer
      );
      savedItem = { id, customerName: trimmedName };
    }

    safeRevalidate("/accounting/credit-settings");
    safeRevalidate("/accounting/dashboard");

    return { success: true, item: savedItem };
  } catch (error: any) {
    console.error("Error saving credit setting:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

export async function deleteCustomerCreditSetting(id: string) {
  try {
    if ((prisma as any).customerCreditSetting) {
      await (prisma as any).customerCreditSetting.delete({
        where: { id }
      });
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM customer_credit_settings WHERE id = $1`, id);
    }

    safeRevalidate("/accounting/credit-settings");
    safeRevalidate("/accounting/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting credit setting:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการลบข้อมูล" };
  }
}

export async function searchCustomerAutocomplete(query: string) {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();

  // Search jobs
  const jobs = await prisma.job.findMany({
    where: {
      customerName: {
        contains: q,
        mode: "insensitive"
      }
    },
    select: {
      customerName: true,
      quotation: {
        select: {
          company: {
            select: {
              taxId: true,
              companyName: true
            }
          }
        }
      }
    },
    take: 15
  });

  // Search companies
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { companyName: { contains: q, mode: "insensitive" } },
        { taxId: { contains: q, mode: "insensitive" } }
      ]
    },
    select: {
      companyName: true,
      taxId: true
    },
    take: 10
  });

  const resultList = new Map<string, { name: string; taxId: string }>();

  for (const j of jobs) {
    if (j.customerName) {
      const name = j.customerName.trim();
      const taxId = j.quotation?.company?.taxId || "";
      if (!resultList.has(name.toLowerCase())) {
        resultList.set(name.toLowerCase(), { name, taxId });
      }
    }
  }

  for (const c of companies) {
    if (c.companyName) {
      const name = c.companyName.trim();
      const taxId = c.taxId || "";
      if (!resultList.has(name.toLowerCase())) {
        resultList.set(name.toLowerCase(), { name, taxId });
      }
    }
  }

  return Array.from(resultList.values());
}
