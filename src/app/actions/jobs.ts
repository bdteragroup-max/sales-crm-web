"use server";

import prisma from "@/app/lib/db";
import {
  extractCompanyCode,
  generateJobNumber,
  mapProductTypeToJobType,
} from "@/app/lib/job-utils";
import { revalidatePath } from "next/cache";

export type CreateJobInput = {
  quotationId: string;
  jobType?: string; // If not submitted → use default from QT
  poNumber?: string;
  closedDate?: Date; // If not submitted → use now()
};

// ================================================
// createJobFromQuotation
// Called when QT is moved to "Invoice Opened" or "PO"
// ================================================
export async function createJobFromQuotation(input: CreateJobInput) {
  const { quotationId, jobType, poNumber } = input;
  const closedDate = input.closedDate ?? new Date();

  // 1. Retrieve Quotation data along with customer and creator
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      company: true, // customer
      salesperson: true, // seller
    },
  });

  if (!quotation) throw new Error(`Quotation ${quotationId} not found`);

  // Verify no job exists yet for this quotation to prevent duplicates 
  // if called multiple times
  const existingJob = await prisma.job.findFirst({
    where: { quotationId: quotation.id }
  });
  if (existingJob) return existingJob;

  // 2. Extract company code from QT number
  const companyCode = extractCompanyCode(quotation.quotationNumber ?? "");

  // 3. jobType: Use the one sent or the default from productType in QT
  const resolvedJobType =
    jobType ?? mapProductTypeToJobType(quotation.productType);

  // 4. Generate atomic Job Number
  const jobNumber = await generateJobNumber(closedDate);

  // 5. Save Job 
  const job = await prisma.job.create({ 
    data: { 
      jobNumber, 
      companyCode, 
      jobType: resolvedJobType, 
      month: closedDate.getMonth() + 1, 
      yearBe: (closedDate.getFullYear() + 543) % 100, 
      dateClosed: closedDate, 
      customerName: quotation.company?.companyName ?? "", 
      item: quotation.subject ?? quotation.productType ?? "", 
      quotationNumber: quotation.quotationNumber ?? "", 
      poNumber: poNumber ?? null, 
      sellerName: quotation.salesperson?.fullName ?? "", 
      quotationId, 
    }, 
  }); 

  revalidatePath("/jobs"); 
  return job;
}

// ================================================
// updateJob — Change jobType or poNumber later
// ================================================
export async function updateJob(
  jobId: string,
  data: { jobType?: string; poNumber?: string }
) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data,
  });
  revalidatePath("/jobs");
  return job;
}

// ── กด confirm step ──────────────────────────────────────────
export async function confirmJobStep(payload: {
  jobId:       string
  stepKey:     string
  completedBy: string
  department:  string
  note?:       string
  variant?:    string   // ส่งมาตอน step แรก ถ้ามี variantQuestion
}) {
  const { jobId, stepKey, completedBy, department, note, variant } = payload

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error("Job not found")

  // บันทึก step log
  await prisma.jobStepLog.create({
    data: { jobId, step: stepKey, completedBy, department, note: note ?? null },
  })

  // อัปเดต currentStep → step ถัดไป
  const { getNextStep } = await import("@/app/lib/job-workflow")
  const resolvedVariant = variant ?? job.flowVariant ?? undefined
  const nextStep = getNextStep(job.jobType, stepKey, resolvedVariant)

  await prisma.job.update({
    where: { id: jobId },
    data: {
      currentStep: nextStep?.key ?? stepKey, // ถ้าไม่มี next = จบแล้ว
      ...(variant ? { flowVariant: variant } : {}),
    },
  })

  revalidatePath("/jobs")
}

// ── ดึง step logs ของ job ──────────────────────────────────────
export async function getJobStepLogs(jobId: string) {
  return prisma.jobStepLog.findMany({
    where:   { jobId },
    orderBy: { completedAt: "asc" },
  })
}

// ================================================
// getJobs — list with filter
// ================================================
export async function getJobs(filters?: { 
  companyCode?: string; 
  month?: number; 
  yearBe?: number; 
  jobType?: string;
}) { 
  return prisma.job.findMany({ 
    where: { 
      ...(filters?.companyCode && { companyCode: filters.companyCode }), 
      ...(filters?.month && { month: filters.month }), 
      ...(filters?.yearBe && { yearBe: filters.yearBe }),
      ...(filters?.jobType && { jobType: filters.jobType }),
    },
    include: { quotation: true },
    orderBy: { dateClosed: "desc" },
  });
}
