"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { getUser } from "@/app/lib/dal";

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
  technicianName?: string;
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
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  );
  const beYear = (now.getFullYear() + 543).toString().slice(-2);
  const prefix = `RO${beYear}-`;

  const lastJob = await prisma.job.findFirst({
    where: { jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: 'desc' },
  });

  let nextNum = 1;
  if (lastJob) {
    const lastNumStr = lastJob.jobNumber.replace(prefix, '');
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  } else {
    const count = await prisma.repairOrder.count();
    nextNum = count + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
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
      technicianName: formData.technicianName,
      company: formData.company,
      customerCompany: formData.customerCompany,
      customerAddress: formData.customerAddress,
      salesPerson: formData.salesPerson,
      items: (formData.items || []) as any,
      symptoms: formData.symptoms,
      settings: formData.settings,
      checklist: (formData.checklist || {}) as any,
      checklistImages: (formData.checklistImages || {}) as any,
      receivedDate: formData.receivedDate ? new Date(formData.receivedDate) : null,
      sentDate: formData.sentDate ? new Date(formData.sentDate) : null,
    };

    const existingOrder = await prisma.repairOrder.findUnique({ where: { jobId } });
    
    const result = await prisma.repairOrder.upsert({
      where: { jobId },
      update: dataToSave,
      create: dataToSave,
    });

    const wasAssigned = !!existingOrder?.technicianName;
    const isAssigned = !!dataToSave.technicianName;
    const changedTech = existingOrder?.technicianName !== dataToSave.technicianName;

    if (isAssigned && (!wasAssigned || changedTech)) {
      try {
        const { getLineUserIdByEmpId, pushLineMessage, repairAssignedMessage } = await import('@/app/lib/lineNotify');
        const techUser = await prisma.user.findFirst({ where: { fullName: dataToSave.technicianName as string } });
        if (techUser?.employeeId) {
          const lineId = await getLineUserIdByEmpId(techUser.employeeId);
          if (lineId) {
            // Need to fetch Job to get Job details for the message
            const orderWithJob = await prisma.repairOrder.findUnique({ where: { id: result.id }, include: { job: true } });
            if (orderWithJob) {
              await pushLineMessage(lineId, [repairAssignedMessage(orderWithJob)], 'service');
            }
          }
        }
      } catch (err) {
        console.error("Line notify error (Repair assigned):", err);
      }
    }

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

export async function updateRepairOrderStatus(jobId: string, newStep: string) {
  try {
    const session = await getUser();
    const userName = session?.fullName || "System";

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    // Update the job step
    await prisma.job.update({
      where: { id: jobId },
      data: { currentStep: newStep },
    });

    // Log the step change
    await prisma.jobStepLog.create({
      data: {
        jobId,
        step: newStep,
        completedBy: userName,
        department: "Service",
        note: "อัปเดตสถานะจากหน้ารายการใบรับซ่อม",
      },
    });

    if (newStep === "closed" && job.sellerName) {
      try {
        const { getLineUserIdByEmpId, pushLineMessage, customRepairClosedMessage } = await import('@/app/lib/lineNotify');
        const user = await prisma.user.findFirst({ where: { fullName: job.sellerName } });
        if (user?.employeeId) {
          const lineId = await getLineUserIdByEmpId(user.employeeId);
          if (lineId) {
            await pushLineMessage(lineId, [customRepairClosedMessage(job)]);
          }
        }
      } catch (err) {
        console.error("Line notify error (Repair closed):", err);
      }
    }

    revalidatePath("/repair-orders");
    revalidatePath("/service/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating repair order status:", error);
    return { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตสถานะ" };
  }
}

export async function updateRepairOrderTechnician(jobId: string, technicianName: string) {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    await prisma.repairOrder.update({
      where: { jobId },
      data: { technicianName },
    });

    revalidatePath("/repair-orders");
    revalidatePath("/service/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating repair order technician:", error);
    return { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตผู้ซ่อม" };
  }
}
