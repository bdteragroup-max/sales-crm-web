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
