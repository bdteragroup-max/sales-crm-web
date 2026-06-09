"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

function getBkkBeYear() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return (now.getFullYear() + 543).toString().slice(-2);
}

// Manually or Automatically created
export async function createRepairDelivery(jobId?: string, autoData?: any) {
  try {
    const session = await getUser();
    
    let prefill = { ...autoData };

    if (jobId && !autoData) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { quotation: true }
      });
      if (job) {
        // Find company manually since relation isn't explicitly defined in Prisma schema
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

    const beYear = getBkkBeYear();
    const lastRecord = await prisma.repairDelivery.findFirst({
      where: { deliveryNumber: { startsWith: `DN${beYear}-` } },
      orderBy: { deliveryNumber: 'desc' },
    });
    
    let nextNumber = 1;
    if (lastRecord && lastRecord.deliveryNumber) {
      const parts = lastRecord.deliveryNumber.split('-');
      if (parts.length === 2) {
        nextNumber = parseInt(parts[1], 10) + 1;
      }
    }
    const deliveryNumber = `DN${beYear}-${String(nextNumber).padStart(4, "0")}`;

    const newDelivery = await prisma.repairDelivery.create({
      data: {
        deliveryNumber,
        deliveryDate: new Date(),
        status: "Draft",
        ...prefill,
      } as any,
    });

    return { success: true, repairDeliveryId: newDelivery.id };
  } catch (error: any) {
    console.error("Failed to create delivery note:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRepairDelivery(id: string, data: any) {
  try {
    await prisma.repairDelivery.update({
      where: { id },
      data,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update delivery note:", error);
    return { success: false, error: error.message };
  }
}

export async function getRepairDeliveries(filters?: any) {
  try {
    const data = await prisma.repairDelivery.findMany({
      where: filters,
      include: {
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to get delivery notes:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRepairDelivery(id: string) {
  try {
    await prisma.repairDelivery.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete delivery note:", error);
    return { success: false, error: error.message };
  }
}

export async function searchSalespeople(query: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        fullName: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        employeeSale: { select: { position: true, nickname: true } },
      },
      take: 10,
      orderBy: { fullName: "asc" },
    });
    return { success: true, data: users };
  } catch (error: any) {
    console.error("Failed to search salespeople:", error);
    return { success: false, error: error.message, data: [] };
  }
}
