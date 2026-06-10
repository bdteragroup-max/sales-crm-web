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
        const company = job.quotation?.companyId ? await prisma.company.findUnique({
          where: { id: job.quotation.companyId }
        }) : null;
        
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
    
    // Fetch all records for the current year to find the true maximum number
    const allRecords = await prisma.repairDelivery.findMany({
      where: { deliveryNumber: { startsWith: `DN${beYear}-` } },
      select: { deliveryNumber: true },
    });
    
    let maxNumber = 0;
    for (const record of allRecords) {
      if (record.deliveryNumber) {
        const parts = record.deliveryNumber.split('-');
        if (parts.length >= 2) {
          // Parse the last part as integer
          const numStr = parts[parts.length - 1];
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    let nextNumber = maxNumber + 1;
    let newDelivery = null;
    let attempts = 0;
    let deliveryNumber = "";

    while (!newDelivery && attempts < 10) {
      deliveryNumber = `DN${beYear}-${String(nextNumber).padStart(4, "0")}`;
      try {
        newDelivery = await prisma.repairDelivery.create({
          data: {
            deliveryNumber,
            deliveryDate: new Date(),
            status: "Draft",
            ...prefill,
          } as any,
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint failed, try the next number
          nextNumber++;
          attempts++;
        } else {
          throw error;
        }
      }
    }

    if (!newDelivery) {
      throw new Error("Failed to generate a unique delivery number after multiple attempts.");
    }

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
