"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

function getBkkBeYear() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return (now.getFullYear() + 543).toString().slice(-2);
}

export async function createInstallationOrder(jobId?: string, autoData?: any) {
  try {
    const session = await getUser();
    
    let prefill = { ...autoData };

    if (jobId && !autoData) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { quotation: true }
      });
      if (job) {
        const company = await prisma.company.findUnique({
          where: { id: job.companyCode }
        });
        
        prefill = {
          jobId: job.id,
          jobName: job.item || job.jobNumber,
          company: company?.companyName || "",
          customer: job.customerName || "",
          address: company?.address || "",
          quotationNo: job.quotationNumber || job.quotation?.quotationNumber || "",
          technician: session?.fullName || "",
        };
      }
    }

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const beYear = (now.getFullYear() + 543).toString().slice(-2);
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    
    const prefix = `JI${beYear}-${day}${month}`;

    const count = await prisma.installationOrder.count({
      where: {
        installationNo: {
          startsWith: `${prefix}-`
        }
      }
    });
    
    const installationNo = `${prefix}-${String(count + 1).padStart(2, "0")}`;

    const { workInspect, workInstall, workRepair, workTraining, workOther, ...restData } = prefill;

    const newInstallation = await prisma.installationOrder.create({
      data: {
        installationNo,
        installationDate: new Date(),
        status: "Draft",
        checklist: { workInspect, workInstall, workRepair, workTraining, workOther },
        ...restData,
      } as any,
    });

    return { success: true, installationOrderId: newInstallation.id };
  } catch (error: any) {
    console.error("Failed to create installation order:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInstallationOrder(id: string, data: any) {
  try {
    const { workInspect, workInstall, workRepair, workTraining, workOther, ...restData } = data;

    await prisma.installationOrder.update({
      where: { id },
      data: {
        ...restData,
        checklist: { workInspect, workInstall, workRepair, workTraining, workOther },
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update installation order:", error);
    return { success: false, error: error.message };
  }
}

export async function getInstallationOrders(filters?: any) {
  try {
    const data = await prisma.installationOrder.findMany({
      where: filters,
      include: {
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to get installation orders:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteInstallationOrder(id: string) {
  try {
    await prisma.installationOrder.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete installation order:", error);
    return { success: false, error: error.message };
  }
}
