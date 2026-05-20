'use server'

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

/**
 * Updates a quotation's status during Kanban board drag-and-drop operations.
 * Implements strict authorization:
 * - Managers can update any quotation.
 * - Sales representatives can only update their own.
 */
export async function updateQuotationStatus(id: string, newStatus: string) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      select: { salespersonId: true }
    });

    if (!quotation) {
      return { success: false, error: "ไม่พบใบเสนอราคา (Quotation not found)" };
    }

    // Authorization validation: only owner or a manager can edit
    if (user.role !== "ผู้จัดการ" && quotation.salespersonId !== user.id) {
      return { success: false, error: "ปฏิเสธการเข้าถึง: คุณสามารถแก้ไขเฉพาะดีลของคุณเองเท่านั้น" };
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: newStatus },
      include: {
        company: true
      }
    });

    // Revalidate affected pages to refresh cache
    revalidatePath("/pipeline");
    revalidatePath("/sales");
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating quotation status:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะดีล" };
  }
}
