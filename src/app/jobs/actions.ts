"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";

export type UpdateJobPayload = {
  jobType?: string;
  poNumber?: string;
  dateClosed?: string; // ISO string
  customerName?: string;
  item?: string;
  sellerName?: string;
  companyCode?: string;
  quotationNumber?: string;
  currentStep?: string;
  deliveryDate?: string | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
};

export async function updateJob(jobId: string, data: UpdateJobPayload) { 
  const previousJob = data.customerName !== undefined
    ? await prisma.job.findUnique({ where: { id: jobId }, select: { customerName: true } })
    : null;

  const { dateClosed, deliveryDate, paymentDate, ...rest } = data;
  const updated = await prisma.job.update({ 
    where: { id: jobId }, 
    data: { 
      ...rest, 
      ...(dateClosed && { dateClosed: new Date(dateClosed) }), 
      ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
      ...(paymentDate !== undefined && { paymentDate: paymentDate ? new Date(paymentDate) : null }),
    }, 
  }); 

  const existingProject = await prisma.project.findFirst({ where: { jobId } });
  if (existingProject && data.customerName !== undefined && data.customerName.trim()) {
    const newCustomerName = data.customerName.trim();
    if (existingProject.clientName !== newCustomerName) {
      await prisma.project.update({
        where: { id: existingProject.id },
        data: { clientName: newCustomerName },
      });
      revalidatePath(`/projects/${existingProject.id}`);
      revalidatePath(`/projects/${existingProject.id}/edit`);
      revalidatePath("/projects/dashboard");
    }
  }

  if (previousJob?.customerName && data.customerName && previousJob.customerName.trim() !== data.customerName.trim()) {
    try {
      const oldTrimmed = previousJob.customerName.trim();
      const newTrimmed = data.customerName.trim();
      const remaining = await prisma.job.count({
        where: { customerName: { equals: oldTrimmed, mode: "insensitive" } },
      });
      if (remaining === 0) {
        const existingNew = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM customer_credit_settings WHERE LOWER(TRIM(customer_name)) = LOWER($1) LIMIT 1`,
          newTrimmed
        );
        if (!existingNew || existingNew.length === 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE customer_credit_settings SET customer_name = $1, updated_at = NOW() WHERE LOWER(TRIM(customer_name)) = LOWER($2)`,
            newTrimmed,
            oldTrimmed
          );
        }
      }
    } catch (err) {
      console.error("Failed to sync customer_credit_settings on updateJob:", err);
    }
  }

  if (data.jobType && ["งานโปรเจค", "งานติดตั้ง", "งานขาย + ติดตั้ง"].includes(data.jobType)) {
    if (!existingProject) {
      try {
        const { createProject } = await import("@/app/actions/projects");
        const manager = await prisma.user.findFirst({ where: { role: { contains: 'manager', mode: 'insensitive' } } });
        await createProject({
          name: `Project: ${updated.customerName || updated.jobNumber}`,
          clientName: updated.customerName || undefined,
          jobId: updated.id,
          managerId: manager?.id,
        });
      } catch (err) {
        console.error("Failed to auto-create project", err);
      }
    }
  }

  // Sync changes to Quotation to keep Sales & Pipeline pages in sync
  if (updated.quotationId) {
    const quotationUpdate: any = {};
    if (data.jobType !== undefined) quotationUpdate.productType = data.jobType;
    if (data.poNumber !== undefined) quotationUpdate.poNumber = data.poNumber;
    if (data.quotationNumber !== undefined) quotationUpdate.quotationNumber = data.quotationNumber;
    
    if (Object.keys(quotationUpdate).length > 0) {
      await prisma.quotation.update({
        where: { id: updated.quotationId },
        data: quotationUpdate
      });
      revalidatePath("/sales");
      revalidatePath("/pipeline");
    }
  }

  revalidatePath("/jobs"); 
  revalidatePath("/projects");
  revalidatePath("/accounting");
  revalidatePath("/accounting/dashboard");
  revalidatePath("/accounting/credit-settings");
  return updated;
}

export async function deleteJob(jobId: string) { 
  await prisma.job.delete({ where: { id: jobId } }); 
  revalidatePath("/jobs");
}

export async function createStandaloneJob(data: { customerName: string; item: string; companyCode: string; jobType: string }) {
  const { generateJobNumber } = await import("@/app/lib/job-utils");
  const { getSteps, getNextStep } = await import("@/app/lib/job-workflow");
  const closedDate = new Date();
  const jobNumber = await generateJobNumber(closedDate);

  const firstStep = getSteps(data.jobType)[0]?.key ?? "service_receive";

  let job = await prisma.job.create({
    data: {
      jobNumber,
      companyCode: data.companyCode,
      jobType: data.jobType,
      month: closedDate.getMonth() + 1,
      yearBe: (closedDate.getFullYear() + 543) % 100,
      dateClosed: closedDate,
      customerName: data.customerName,
      item: data.item,
      currentStep: firstStep,
    }
  });

  if (firstStep === 'sales') {
    const nextStep = getNextStep(data.jobType, 'sales');
    if (nextStep) {
      await prisma.jobStepLog.create({
        data: {
          jobId: job.id,
          step: 'sales',
          completedBy: "System",
          department: "sales",
          note: "ดำเนินการอัตโนมัติเมื่อสร้างงานด่วน",
        }
      });
      job = await prisma.job.update({
        where: { id: job.id },
        data: { currentStep: nextStep.key },
      });
    }
  }

  if (["งานโปรเจค", "งานติดตั้ง", "งานขาย + ติดตั้ง"].includes(data.jobType)) {
    try {
      const { createProject } = await import("@/app/actions/projects");
      const manager = await prisma.user.findFirst({ where: { role: { contains: 'manager', mode: 'insensitive' } } });
      await createProject({
        name: `Project: ${job.customerName || job.jobNumber}`,
        clientName: job.customerName || undefined,
        jobId: job.id,
        managerId: manager?.id,
      });
    } catch (err) {
      console.error("Failed to auto-create project", err);
    }
  }

  // Auto-create Order for Container Jobs (so they show on Orders board immediately)
  if (["งานตู้", "งานตู้ + ติดตั้ง", "Cabinet Work", "Cabinet Work + Installation"].includes(data.jobType)) {
    try {
      const { generateOrderNumber } = await import("@/app/actions/orderHelper");
      const orderNumber = await generateOrderNumber();
      await prisma.order.create({
        data: {
          orderNumber,
          status: 'รอยืนยัน',
          value: 0,
        }
      });
    } catch (err) {
      console.error("Failed to auto-create order", err);
    }
  }

  revalidatePath("/jobs");
  revalidatePath("/projects");
  return job;
}
