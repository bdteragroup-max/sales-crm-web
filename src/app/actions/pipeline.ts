'use server'

import prisma from "@/app/lib/db";
import { generateOrderNumber } from "./orderHelper";
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
    jobType?: string,
    paymentMethod?: string,
    installments?: any[],
    salesOrderDate?: string,
    creditTerms?: string,
    creditDocsUrl?: string,
    billingRegulations?: string,
    billingDocsUrl?: string,
    percentageTerms?: string,
    workName?: string,
    deliveryDate?: string,
    paymentDate?: string,
    companyId?: string,
    companyCode?: string
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
    if (user.role !== "ผู้จัดการ" && (user.role || '').toLowerCase() !== "sales manager" && quotation.salespersonId !== user.id) {
      return { success: false, error: "ปฏิเสธการเข้าถึง: คุณสามารถแก้ไขเฉพาะดีลของคุณเองเท่านั้น" };
    }

    const statusChanged = quotation.status !== newStatus;

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
    if (extra?.companyId) updateData.companyId = extra.companyId;

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

    let awardedGold = 0;
    let awardMessage = '';
    // Auto-create an Order if status is closed (เปิดบิลแล้ว / PO...)
    if (newStatus === 'เปิดบิลแล้ว' || newStatus.startsWith('PO')) {
      const existingOrder = await prisma.order.findFirst({
        where: { quotationId: quotation.id }
      });
      if (!existingOrder && quotation.companyId) {
        const finalOrderNumber = await generateOrderNumber();
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
        companyCode: extra?.companyCode,
        jobType: extra?.jobType,
        closedDate: updated.billingDate || updated.poDate || new Date(),
        paymentMethod: extra?.paymentMethod,
        installments: extra?.installments,
        salesOrderDate: extra?.salesOrderDate ? new Date(extra.salesOrderDate) : undefined,
        creditTerms: extra?.creditTerms,
        creditDocsUrl: extra?.creditDocsUrl,
        billingRegulations: extra?.billingRegulations,
        billingDocsUrl: extra?.billingDocsUrl,
        percentageTerms: extra?.percentageTerms,
        workName: extra?.workName,
        deliveryDate: extra?.deliveryDate ? new Date(extra.deliveryDate) : undefined,
        paymentDate: extra?.paymentDate ? new Date(extra.paymentDate) : undefined,
      });
    }

    // Revalidate affected pages to refresh cache
    revalidatePath("/pipeline");
    revalidatePath("/schedule");
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    
    // Notification for Salesperson when quotation status changes
    if (statusChanged && updated.salespersonId && updated.salespersonId !== user.id) {
      try {
        const { sendPushToUser } = await import('@/app/lib/pushNotification');
        await sendPushToUser(updated.salespersonId, {
          title: `สถานะใบเสนอราคาเปลี่ยนแปลง`,
          body: `ใบเสนอราคา ${updated.quotationNumber || 'ไม่ระบุเลขที่'} เปลี่ยนสถานะเป็น: ${newStatus}`,
          url: `/pipeline`,
          category: `QUOTATION_STATUS`,
        });
      } catch (e) {
        console.error("Failed to send push notification for quotation status:", e);
      }
    }

    return { success: true, data: updated, awardedGold, awardMessage };
  } catch (error: any) {
    console.error("Error updating quotation status:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะดีล" };
  }
}
