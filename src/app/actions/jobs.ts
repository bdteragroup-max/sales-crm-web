"use server";

import prisma from "@/app/lib/db";
import {
  extractCompanyCode,
  generateJobNumber,
  mapProductTypeToJobType,
} from "@/app/lib/job-utils";
import { revalidatePath } from "next/cache";
import {
  getLineUserIdByCrmUserId,
  getLineUserIdByEmpId,
  jobStepMessage,
  pushLineMessage,
} from "@/app/lib/lineNotify";

export type CreateJobInput = {
  quotationId: string;
  jobType?: string; // If not submitted → use default from QT
  poNumber?: string;
  closedDate?: Date; // If not submitted → use now()
  paymentMethod?: string; // e.g. "จ่ายแล้ว", "เครดิต", "ผ่อน", "เก็บเงินหน้างาน"
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
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'จ่ายแล้ว' ? 'paid' : 'pending',
    }, 
  }); 

  // Auto-create PaymentTask if not paid
  if (input.paymentMethod && input.paymentMethod !== 'จ่ายแล้ว') {
    let dueDate = new Date(closedDate);
    if (input.paymentMethod.includes('เครดิต 30 วัน') || input.paymentMethod === 'เครดิต') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (input.paymentMethod.includes('เครดิต 60 วัน')) {
      dueDate.setDate(dueDate.getDate() + 60);
    } else if (input.paymentMethod === 'เก็บเงินหน้างาน') {
      dueDate.setDate(dueDate.getDate() + 7);
    }
    
    await prisma.paymentTask.create({
      data: {
        jobId: job.id,
        status: 'รอดำเนินการ',
        dueDate,
      }
    });
  }

  revalidatePath("/jobs"); 
  revalidatePath("/accounting");
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
  deliveryMethod?: string
  deliveryDate?: string | Date
  courierCompany?: string
  trackingNumber?: string
  trackingPhotoUrl?: string
}) {
  const { jobId, stepKey, completedBy, department, note, variant, deliveryMethod, deliveryDate, courierCompany, trackingNumber, trackingPhotoUrl } = payload

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
      ...(deliveryMethod ? { deliveryMethod } : {}),
      ...(deliveryDate ? { deliveryDate: new Date(deliveryDate) } : {}),
      ...(courierCompany ? { courierCompany } : {}),
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(trackingPhotoUrl ? { trackingPhotoUrl } : {}),
    },
  })

  // Trigger: Automatically create Delivery Note if the job moved to 'service_return'
  if (nextStep?.key === 'service_return') {
    const { createRepairDelivery } = await import("@/app/actions/repairDeliveries")
    await createRepairDelivery(jobId)
  }

  // Trigger LINE Notification
  const stepInfo = STEP_LABELS[stepKey] || { label: stepKey, dept: department };
  await notifyJobStepUpdate(jobId, stepKey, stepInfo.label, stepInfo.dept);

  revalidatePath("/jobs")
}

// ── บัญชีตีกลับ (Reject Step) ──────────────────────────────────────────
export async function rejectJobStep(jobId: string, targetStep: string, note: string, rejectedBy: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error("Job not found")

  // Delete logs that happened after or at the target step
  // Wait, we don't have a strict linear ordering in stepLogs if we just use string.
  // Easiest way: just update the job's currentStep, and log a note.
  await prisma.jobStepLog.create({
    data: {
      jobId,
      step: job.currentStep,
      completedBy: rejectedBy,
      department: "accounting",
      note: `ตีกลับไปที่ ${targetStep}: ${note}`,
    }
  })

  await prisma.job.update({
    where: { id: jobId },
    data: { currentStep: targetStep }
  })

  // Trigger LINE Notification for rejection
  const stepInfo = STEP_LABELS[targetStep] || { label: targetStep, dept: "Accounting" };
  await notifyJobStepUpdate(jobId, targetStep, `ตีกลับไปที่ ${stepInfo.label}`, stepInfo.dept);

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

const STEP_LABELS: Record<string, { label: string; dept: string }> = { 
  'sales': { label: '📝 Sales - Job Entry', dept: 'Sales' },
  'store_check': { label: '🏭 Store - Inventory Check', dept: 'Store' },
  'store_confirm': { label: '✅ Store - Inventory Confirmed', dept: 'Store' },
  'purchase': { label: '🛒 Purchase - Order Placed', dept: 'Purchase' },
  'manufacturing': { label: '⚙️ Manufacturing - Production', dept: 'Manufacturing' },
  'store_send': { label: '📦 Store - Shipment', dept: 'Store' },
  'accounting': { label: '💰 Accounting - Billing', dept: 'Accounting' },
  'complete': { label: '🎉 Job Completed', dept: 'System' },
  'service_receive': { label: '🔧 Service Receive', dept: 'Service' },
  'service_repair': { label: '🔨 Service Repair', dept: 'Service' },
  'service_return': { label: '📬 Service Return', dept: 'Service' },
};

export async function notifyJobStepUpdate(jobId: string, stepKey: string, stepLabel: string, dept: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      quotation: { include: { salesperson: true } }
    }
  });
  if (!job) return;

  const lineIdsToNotify = new Set<string>();

  const salespersonId = job.quotation?.salespersonId;
  if (salespersonId) {
    const salesLineId = await getLineUserIdByCrmUserId(salespersonId);
    if (salesLineId) lineIdsToNotify.add(salesLineId);

    const user = await prisma.user.findUnique({
      where: { id: salespersonId },
      select: { employeeId: true }
    });
    if (user?.employeeId) {
      const employee = await prisma.employees.findUnique({
        where: { emp_id: user.employeeId },
        select: { supervisor_id: true }
      });
      if (employee?.supervisor_id) {
        const supervisorLineId = await getLineUserIdByEmpId(employee.supervisor_id);
        if (supervisorLineId) lineIdsToNotify.add(supervisorLineId);
      }
    }
  }

  if (lineIdsToNotify.size === 0) return;

  const message = jobStepMessage(job, stepLabel, dept);

  for (const lineUserId of lineIdsToNotify) {
    await pushLineMessage(lineUserId, [message]);
  }
}
