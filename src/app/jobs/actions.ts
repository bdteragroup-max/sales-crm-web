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
};

export async function updateJob(jobId: string, data: UpdateJobPayload) { 
  const updated = await prisma.job.update({ 
    where: { id: jobId }, 
    data: { 
      ...data, 
      ...(data.dateClosed && { dateClosed: new Date(data.dateClosed) }), 
    }, 
  }); 
  revalidatePath("/jobs"); 
  return updated;
}

export async function deleteJob(jobId: string) { 
  await prisma.job.delete({ where: { id: jobId } }); 
  revalidatePath("/jobs");
}

export async function createStandaloneJob(data: { customerName: string; item: string; companyCode: string; jobType: string }) {
  const { generateJobNumber } = await import("@/app/lib/job-utils");
  const closedDate = new Date();
  const jobNumber = await generateJobNumber(closedDate);

  const job = await prisma.job.create({
    data: {
      jobNumber,
      companyCode: data.companyCode,
      jobType: data.jobType,
      month: closedDate.getMonth() + 1,
      yearBe: (closedDate.getFullYear() + 543) % 100,
      dateClosed: closedDate,
      customerName: data.customerName,
      item: data.item,
      currentStep: "service_receive", // Default to service step so they can confirm it
    }
  });
  revalidatePath("/jobs");
  return job;
}
