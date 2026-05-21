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
export async function updateQuotationStatus(
  id: string, 
  newStatus: string, 
  extra?: { 
    quotationNumber?: string, 
    poNumber?: string, 
    poDate?: string,
    appointmentDate?: string,
    appointmentNote?: string,
    jobType?: string
  }
) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!quotation) {
      return { success: false, error: "ไม่พบใบเสนอราคา (Quotation not found)" };
    }

    // Authorization validation: only owner or a manager can edit
    if (user.role !== "ผู้จัดการ" && quotation.salespersonId !== user.id) {
      return { success: false, error: "ปฏิเสธการเข้าถึง: คุณสามารถแก้ไขเฉพาะดีลของคุณเองเท่านั้น" };
    }

    const updateData: any = { 
      status: newStatus,
      updatedAt: new Date()
    };

    // Auto-update dates based on pipeline stage
    if (newStatus === 'เสนอราคา') {
      updateData.quotationDate = new Date();
    } else if (newStatus === 'เปิดบิลแล้ว') {
      updateData.billingDate = new Date();
    } else if (newStatus.startsWith('PO')) {
      updateData.poDate = new Date();
    }

    if (extra?.quotationNumber) updateData.quotationNumber = extra.quotationNumber;
    if (extra?.poNumber) updateData.poNumber = extra.poNumber;
    if (extra?.poDate) updateData.poDate = new Date(extra.poDate);
    if (extra?.appointmentDate) updateData.appointmentDate = new Date(extra.appointmentDate);
    if (extra?.appointmentNote) updateData.appointmentNote = extra.appointmentNote;

    const updated = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        company: true
      }
    });

    // ถ้ามี appointmentDate → สร้าง Schedule อัตโนมัติ
    if (extra?.appointmentDate && quotation.companyId) {
      await prisma.schedule.create({
        data: {
          userId: quotation.salespersonId || user.id,
          companyId: quotation.companyId,
          title: `นัดหมายเข้าพบลูกค้า: ${quotation.company?.companyName || ''}`,
          description: `วัตถุประสงค์: ${extra.appointmentNote || ''}\nดีล/ใบเสนอราคา: ${quotation.quotationNumber || id}`,
          date: new Date(extra.appointmentDate),
          status: 'Planned',
        }
      });
    }

    // Auto-create an Order if status is closed (เปิดบิลแล้ว / PO...)
    if (newStatus === 'เปิดบิลแล้ว' || newStatus.startsWith('PO')) {
      const existingOrder = await prisma.order.findFirst({
        where: { quotationId: quotation.id }
      });
      if (!existingOrder && quotation.companyId) {
        const baseOrderNumber = updateData.poNumber || updateData.quotationNumber || quotation.quotationNumber || `ORD-${quotation.id.slice(0, 8)}`;
        let finalOrderNumber = baseOrderNumber;
        let c = 0;
        while (await prisma.order.findUnique({ where: { orderNumber: finalOrderNumber } })) {
          c++;
          finalOrderNumber = `${baseOrderNumber}-${c}`;
        }
        const newOrder = await prisma.order.create({
          data: {
            orderNumber: finalOrderNumber,
            companyId: quotation.companyId,
            quotationId: quotation.id,
            salespersonId: quotation.salespersonId || user.id,
            value: quotation.actualClosingAmount || quotation.totalAmountBeforeVat || 0,
            status: 'รอยืนยัน',
          }
        });
        await prisma.orderStatusLog.create({
          data: {
            orderId: newOrder.id,
            userId: user.id,
            fromStatus: 'System',
            toStatus: 'รอยืนยัน'
          }
        });
        revalidatePath("/orders");
      }
      
      // Auto-create Job
      const { createJobFromQuotation } = await import('@/app/actions/jobs');
      await createJobFromQuotation({
        quotationId: quotation.id,
        poNumber: updateData.poNumber,
        jobType: extra?.jobType,
        closedDate: new Date(),
      });
    }

    // Revalidate affected pages to refresh cache
    revalidatePath("/pipeline");
    revalidatePath("/schedule");
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating quotation status:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะดีล" };
  }
}
