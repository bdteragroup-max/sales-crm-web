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

  if (data.jobType && ["งานโปรเจค", "งานติดตั้ง", "งานขาย + ติดตั้ง"].includes(data.jobType)) {
    const existingProject = await prisma.project.findFirst({ where: { jobId } });
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

  revalidatePath("/jobs");
  revalidatePath("/projects");
  return job;
}
