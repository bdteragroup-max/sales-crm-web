"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function createOutsourceRepair(data: any) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    // Generate outsourceNumber if needed, or simply let it be null unless required
    // Example: EXT-2405-001 (Optional logic)
    
    const repair = await prisma.outsourceRepair.create({
      data: {
        jobId: data.jobId || null,
        outsourceNumber: data.outsourceNumber || null,
        vendorName: data.vendorName || null,
        vendorPhone: data.vendorPhone || null,
        vendorAddress: data.vendorAddress || null,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerAddress: data.customerAddress || null,
        sentDate: data.sentDate ? new Date(data.sentDate) : null,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        items: data.items || [],
        symptoms: data.symptoms || null,
        settings: data.settings || null,
        remark: data.remark || null,
        sender: data.sender || session.fullName,
        status: data.status || "SENT",
      }
    });

    revalidatePath("/outsource-repairs");
    return { success: true, id: repair.id };
  } catch (error: any) {
    console.error("Error creating outsource repair:", error);
    return { success: false, error: error.message };
  }
}

export async function getOutsourceRepairs(filters?: any) {
  try {
    const data = await prisma.outsourceRepair.findMany({
      where: filters,
      include: {
        job: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching outsource repairs:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteOutsourceRepair(id: string) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    await prisma.outsourceRepair.delete({
      where: { id }
    });

    revalidatePath("/outsource-repairs");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting outsource repair:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOutsourceRepair(id: string, data: any) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const repair = await prisma.outsourceRepair.update({
      where: { id },
      data: {
        jobId: data.jobId || null,
        outsourceNumber: data.outsourceNumber || null,
        vendorName: data.vendorName || null,
        vendorPhone: data.vendorPhone || null,
        vendorAddress: data.vendorAddress || null,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerAddress: data.customerAddress || null,
        sentDate: data.sentDate ? new Date(data.sentDate) : null,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        items: data.items || [],
        symptoms: data.symptoms || null,
        settings: data.settings || null,
        remark: data.remark || null,
        sender: data.sender || session.fullName,
        status: data.status || "SENT",
      }
    });

    revalidatePath("/outsource-repairs");
    revalidatePath(`/outsource-repairs/${id}`);
    return { success: true, id: repair.id };
  } catch (error: any) {
    console.error("Error updating outsource repair:", error);
    return { success: false, error: error.message };
  }
}

export async function getPendingOutsourceRepairCount() {
  try {
    return await prisma.outsourceRepair.count({
      where: {
        status: "SENT"
      }
    });
  } catch (error) {
    console.error("Failed to get pending outsource repair count:", error);
    return 0;
  }
}
