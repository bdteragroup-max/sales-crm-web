'use server'

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function createPurchaseRequest(data: {
  prNumber: string;
  projectName: string;
  itemList: string;
  note?: string;
  orderId?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.purchaseRequest.findUnique({
      where: { prNumber: data.prNumber }
    });

    if (existing) {
      return { success: false, error: "เลขที่ PR นี้มีในระบบแล้ว" };
    }

    const pr = await prisma.purchaseRequest.create({
      data: {
        prNumber: data.prNumber,
        projectName: data.projectName,
        itemList: data.itemList,
        note: data.note,
        requestedBy: user.fullName || user.email || 'Unknown',
        orderId: data.orderId || null,
        recordedAt: new Date()
      }
    });

    // If orderId is provided, mark order prFulfilledAt
    if (data.orderId) {
      await prisma.order.update({
        where: { id: data.orderId },
        data: { prFulfilledAt: new Date() }
      });
    }

    revalidatePath("/admin/procurement/pr");
    
    return { success: true, data: pr };
  } catch (error) {
    console.error("Error creating PR:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้าง PR" };
  }
}
