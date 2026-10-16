"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { getUser } from "@/app/lib/dal";
import { checkAndAwardServiceGold } from "@/app/actions/coins";

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


    // Determine company code & DB company name (TP, TG, TE)
    const rawCompany = (formData.company || "").trim().toUpperCase();
    let compCode: "TP" | "TG" | "TE" = "TG";
    let dbCompany = "TERA GROUP";

    if (rawCompany === "TP" || rawCompany.includes("POWER") || rawCompany.includes("พาวเวอร์")) {
      compCode = "TP";
      dbCompany = "TERA POWER";
    } else if (
      rawCompany === "TE" ||
      rawCompany.includes("ELECTRIC") ||
      rawCompany.includes("อิเล็คทริค") ||
      rawCompany.includes("อิเลคทริค") ||
      rawCompany.includes("ENERGY")
    ) {
      compCode = "TE";
      dbCompany = "TERA ELECTRIC";
    } else {
      compCode = "TG";
      dbCompany = "TERA GROUP";
    }

    // If no jobId is provided, we need to create a standalone job first
    if (!jobId) {
      const newJobNumber = await generateRepairOrderNumber();
      const closedDate = new Date();

      const job = await prisma.job.create({
        data: {
          jobNumber: newJobNumber,
          companyCode: compCode,
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
    } else {
      // Also update job companyCode if existing
      await prisma.job.update({
        where: { id: jobId },
        data: { companyCode: compCode },
      }).catch((e) => console.warn("Could not sync companyCode to job:", e));
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
      company: dbCompany,
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
        if (techUser) {
          try {
            const { sendPushToUser } = await import('@/app/lib/pushNotification');
            const orderWithJob = await prisma.repairOrder.findUnique({ where: { id: result.id }, include: { job: true } });
            if (orderWithJob) {
              await sendPushToUser(techUser.id, {
                title: "คุณได้รับมอบหมายงานซ่อม",
                body: `งานซ่อม ${orderWithJob.job.jobNumber}`,
                url: `/repair-orders/${orderWithJob.job.id}/edit`,
                category: 'JOB'
              });
            }
          } catch (pushErr) {
            console.error("Push notify error (Repair assigned):", pushErr);
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
    const userId = session?.id;

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
        completedByUserId: userId,
        department: "Service",
        note: "อัปเดตสถานะจากหน้ารายการใบรับซ่อม",
      },
    });

    if (userId && newStep === "ซ่อมเสร็จ") {
      await checkAndAwardServiceGold(userId);
    }

    if (newStep === "closed" && job.sellerName) {
      try {
        const { getLineUserIdByEmpId, pushLineMessage, customRepairClosedMessage } = await import('@/app/lib/lineNotify');
        const user = await prisma.user.findFirst({ where: { fullName: job.sellerName } });
        
        if (user) {
          try {
            const { sendPushToUser } = await import('@/app/lib/pushNotification');
            await sendPushToUser(user.id, {
              title: "งานซ่อมถูกปิดแล้ว",
              body: `งานซ่อม ${job.jobNumber} ถูกเปลี่ยนสถานะเป็น Closed`,
              url: `/repair-orders/${job.id}/edit`,
              category: 'JOB'
            });
          } catch (pushErr) {
            console.error("Push notify error (Repair closed):", pushErr);
          }
          
          if (user.employeeId) {
            const lineId = await getLineUserIdByEmpId(user.employeeId);
            if (lineId) {
              await pushLineMessage(lineId, [customRepairClosedMessage(job)]);
            }
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

    try {
      const { sendPushToUser } = await import('@/app/lib/pushNotification');
      const user = await prisma.user.findFirst({ where: { fullName: technicianName } });
      if (user) {
        await sendPushToUser(user.id, {
          title: "มีการมอบหมายงานซ่อมให้คุณ",
          body: `งานซ่อม ${job.jobNumber}`,
          url: `/repair-orders/${job.id}/edit`,
          category: 'JOB'
        });
      }
    } catch (e) {
      console.error("Push notify error:", e);
    }

    revalidatePath("/repair-orders");
    revalidatePath("/service/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating repair order technician:", error);
    return { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตผู้ซ่อม" };
  }
}

export async function updateRepairOrderCompany(repairOrderIdOrJobId: string, companyInput: string) {
  try {
    const raw = (companyInput || "").trim().toUpperCase();
    let compCode: "TP" | "TG" | "TE" = "TG";
    let dbCompany = "TERA GROUP";

    if (raw === "TP" || raw.includes("POWER") || raw.includes("พาวเวอร์")) {
      compCode = "TP";
      dbCompany = "TERA POWER";
    } else if (
      raw === "TE" ||
      raw.includes("ELECTRIC") ||
      raw.includes("อิเล็คทริค") ||
      raw.includes("อิเลคทริค") ||
      raw.includes("ENERGY")
    ) {
      compCode = "TE";
      dbCompany = "TERA ELECTRIC";
    } else {
      compCode = "TG";
      dbCompany = "TERA GROUP";
    }

    // Try finding by id first, then by jobId
    let order = await prisma.repairOrder.findFirst({
      where: {
        OR: [
          { id: repairOrderIdOrJobId },
          { jobId: repairOrderIdOrJobId }
        ]
      }
    });

    if (!order) {
      throw new Error("Repair order not found");
    }

    await prisma.repairOrder.update({
      where: { id: order.id },
      data: { company: dbCompany },
    });

    if (order.jobId) {
      await prisma.job.update({
        where: { id: order.jobId },
        data: { companyCode: compCode },
      }).catch((e) => console.warn("Could not sync companyCode to job:", e));
    }

    revalidatePath("/repair-orders");
    revalidatePath("/service/dashboard");
    revalidatePath("/jobs");
    return { success: true, company: dbCompany, companyCode: compCode };
  } catch (error: unknown) {
    console.error("Error updating repair order company:", error);
    return { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตสังกัดบริษัท" };
  }
}

export interface InverterQcItemData {
  inverterBrand?: string;
  inverterModel?: string;
  serialNumber?: string;

  // 1. POWER INPUT VOLTAGE หลังซ่อมเสร็จ
  inputVoltage?: {
    dcSinglePhase?: { checked: boolean; value: string };
    acSinglePhase?: { checked: boolean; value: string };
    acThreePhase?: { checked: boolean; rs: string; rt: string; st: string };
  };

  // 2. POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ
  outputVoltage?: {
    singlePhaseLN?: { checked: boolean; value: string };
    threePhase220?: { checked: boolean; uv: string; uw: string; vw: string };
    threePhase380?: { checked: boolean; uv: string; uw: string; vw: string };
  };

  // 3. CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ
  controlCircuit?: {
    control24Vdc?: {
      checked: boolean;
      x1: string;
      x2: string;
      x3: string;
      x4: string;
      x5: string;
    };
    testAcDuration?: { checked: boolean; minutes: string };
    testDcDuration?: { checked: boolean; minutes: string };
    testAcDcDuration?: { checked: boolean; minutes: string };
  };

  // 4. การ Set ค่า Parameter
  parameterSetting?: {
    keepCustomerOriginal: boolean;
    setNewForCustomer: boolean;
  };

  // 5. ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า
  visualChecks?: {
    screwsAndPartsComplete: boolean;
    fanExhaustDirectionCorrect: boolean;
    controlWiringNormal: boolean;
    diodeConversionCorrect: boolean;
  };

  // 6. บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ
  parameterRows?: string[];

  // 7. หมายเหตุ:
  notes?: string;
}

export interface InverterQcData extends InverterQcItemData {
  receiveDate?: string;
  workType?: string;
  customerName?: string;

  // 8. Signatures:
  inspectorName?: string;
  inspectorSignatureUrl?: string;
  inspectorDate?: string;
  reviewerName?: string;
  reviewerSignatureUrl?: string;
  reviewerDate?: string;

  formRev?: string;
  updatedAt?: string;

  // Multi-item QC support
  itemsQc?: InverterQcItemData[];
}

export async function saveInverterQc(
  repairOrderId: string,
  qcData: InverterQcData,
  advanceStepToQc: boolean = false
) {
  try {
    const user = await getUser();
    const repairOrder = await prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { job: true },
    });
    if (!repairOrder) throw new Error("Repair order not found");

    const updated = await prisma.repairOrder.update({
      where: { id: repairOrderId },
      data: {
        inverterQc: qcData as any,
      },
    });

    if (advanceStepToQc && repairOrder.jobId) {
      await prisma.job.update({
        where: { id: repairOrder.jobId },
        data: { currentStep: "service_qc" },
      });
      await prisma.jobStepLog.create({
        data: {
          jobId: repairOrder.jobId,
          step: "service_qc",
          completedBy: user?.fullName || "Technician",
          completedByUserId: user?.id,
          department: "Service",
          note: "บันทึกผลการตรวจสอบ QC ของ INVERTER (QC-EN-01/Rev.00)",
        },
      });
    }

    revalidatePath("/repair-orders");
    revalidatePath("/service/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error("Error saving Inverter QC:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล QC",
    };
  }
}

export async function getPendingRepairOrderCount() {
  try {
    return await prisma.repairOrder.count({
      where: {
        job: {
          currentStep: {
            in: ["service_receive", "sales_quote", "customer_approval"]
          }
        }
      }
    });
  } catch (error) {
    console.error("Failed to get pending repair order count:", error);
    return 0;
  }
}


