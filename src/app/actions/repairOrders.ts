"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export interface RepairOrderItem {
  type?: string;
  brand?: string;
  model?: string;
  size?: string;
  serial?: string;
  qty?: number;
  remark?: string;
}

export interface RepairOrderFormData {
  id?: string;
  jobId?: string;
  invoiceNo?: string;
  deliveryMethod?: string;
  deliveryNoteNo?: string;
  receiverName?: string;
  senderName?: string;
  handoverRef?: string;
  phoneNumber?: string;
  workType?: string;
  forwardedBy?: string;
  company?: string;
  customerCompany?: string;
  customerAddress?: string;
  salesPerson?: string;
  items?: RepairOrderItem[];
  symptoms?: string;
  settings?: string;
  checklist?: Record<string, boolean>;
  checklistImages?: Record<string, string[]>;
  receivedDate?: string;
  sentDate?: string;
}

async function generateRepairOrderNumber() {
  const beYear = (new Date().getFullYear() + 543).toString().slice(-2);
  const count = await prisma.repairOrder.count();
  return `RO${beYear}-${String(count + 1).padStart(4, '0')}`;
}

export async function createRepairOrder(formData: RepairOrderFormData) {
  try {
    let jobId = formData.jobId;


    // If no jobId is provided, we need to create a standalone job first
    if (!jobId) {
      const newJobNumber = await generateRepairOrderNumber();
      const closedDate = new Date();

      const job = await prisma.job.create({
        data: {
          jobNumber: newJobNumber,
          companyCode: "TERA GROUP", // Default
          jobType: formData.workType || "ซ่อม",
          month: closedDate.getMonth() + 1,
          yearBe: (closedDate.getFullYear() + 543) % 100,
          dateClosed: closedDate,
          customerName: formData.customerCompany || "",
          item: (formData.items?.[0]?.type as string) || "งานซ่อม",
          currentStep: "service_receive", 
        }
      });
      jobId = job.id;
    }

    const dataToSave = {
      jobId,
      invoiceNo: formData.invoiceNo,
      deliveryMethod: formData.deliveryMethod,
      deliveryNoteNo: formData.deliveryNoteNo,
      receiverName: formData.receiverName,
      senderName: formData.senderName,
      handoverRef: formData.handoverRef,
      phoneNumber: formData.phoneNumber,
      workType: formData.workType,
      forwardedBy: formData.forwardedBy,
      company: formData.company,
      customerCompany: formData.customerCompany,
      customerAddress: formData.customerAddress,
      salesPerson: formData.salesPerson,
      items: (formData.items || []) as unknown as Prisma.InputJsonArray,
      symptoms: formData.symptoms,
      settings: formData.settings,
      checklist: (formData.checklist || {}) as unknown as Prisma.InputJsonObject,
      checklistImages: (formData.checklistImages || {}) as unknown as Prisma.InputJsonObject,
      receivedDate: formData.receivedDate ? new Date(formData.receivedDate) : null,
      sentDate: formData.sentDate ? new Date(formData.sentDate) : null,
    };

    const result = await prisma.repairOrder.upsert({
      where: { jobId },
      update: dataToSave,
      create: dataToSave,
    });

    revalidatePath("/repair-orders");
    return { success: true, data: result, jobId: result.jobId, repairOrderId: result.id };
  } catch (error: unknown) {
    console.error("Error saving repair order:", error);
    return { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

export async function deleteRepairOrder(id: string) {
  try {
    await prisma.repairOrder.delete({
      where: { id }
    });
    revalidatePath("/repair-orders");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting repair order:", error);
    return { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
}
