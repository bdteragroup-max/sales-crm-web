"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { parseThaiDate } from "@/app/lib/thaiDate";

function getBkkBeYearMonth() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const beYear = (now.getFullYear() + 543).toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${beYear}${month}`;
}

/**
 * Generate auto case number: DMG-[COMPANY]-[YYMM]-[XXX]
 * Example: DMG-TG-6910-001
 */
export async function generateDamageCaseNumber(companyCode: string = "TG"): Promise<string> {
  const code = (companyCode || "TG").toUpperCase();
  const ym = getBkkBeYearMonth();
  const prefix = `DMG-${code}-${ym}-`;

  try {
    const existing = await prisma.damageReport.findMany({
      where: {
        caseNumber: {
          startsWith: prefix,
        },
      },
      select: { caseNumber: true },
      orderBy: { caseNumber: "desc" },
      take: 100,
    });

    let maxSeq = 0;
    for (const item of existing) {
      const parts = item.caseNumber.split("-");
      const last = parts[parts.length - 1];
      const num = parseInt(last, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, "0");
    return `${prefix}${nextSeq}`;
  } catch (err) {
    console.error("Failed to generate case number, fallback:", err);
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${rand}`;
  }
}

/**
 * 1. Create a new Damage Report (User / Reporter)
 */
export async function createDamageReport(formData: any) {
  try {
    const user = await getUser();
    const reporterName = user?.fullName || formData.reporterName || "ผู้แจ้งไม่ระบุชื่อ";
    const reporterId = user?.id || null;

    const companyCode = formData.company || "TG";
    const caseNumber = await generateDamageCaseNumber(companyCode);

    const initialTimeline = [
      {
        timestamp: new Date().toISOString(),
        actorName: reporterName,
        action: "แจ้งสินค้า/ทรัพย์สินชำรุดเสียหาย",
        notes: `สร้างเคสเลขที่ ${caseNumber} โดย ${reporterName}`,
      },
    ];

    const report = await prisma.damageReport.create({
      data: {
        caseNumber,
        status: "REPORTED",

        // 1. บริษัทและสินค้า
        company: companyCode,
        otherOwner: formData.otherOwner || null,
        itemType: formData.itemType || "PRODUCT",
        itemName: formData.itemName || "ไม่ระบุชื่อสินค้า",
        itemCode: formData.itemCode || null,
        itemModel: formData.itemModel || null,
        serialOrLot: formData.serialOrLot || null,
        quantity: Number(formData.quantity) || 1,
        unit: formData.unit || "ชิ้น",
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
        actualCost: null,

        // 2. สถานที่และเวลา
        incidentDate: parseThaiDate(formData.incidentDate),
        discoveredDate: parseThaiDate(formData.discoveredDate) || new Date(),
        branch: formData.branch || null,
        warehouse: formData.warehouse || null,
        siteLocation: formData.siteLocation || "รอตรวจสอบ",
        currentLocation: formData.currentLocation || formData.warehouse || "รอตรวจสอบ",

        // 3. ลักษณะความเสียหาย
        damageType: formData.damageType || "ชำรุด/ใช้งานไม่ได้",
        damagePosition: formData.damagePosition || null,
        damagedQuantity: Number(formData.damagedQuantity) || Number(formData.quantity) || 1,

        // 4. บุคคล
        reporterId,
        reporterName,
        reporterDepartment:
          formData.reporterDepartment?.trim() ||
          (user as any)?.employeeSale?.department ||
          (user as any)?.employeeSale?.position ||
          (user as any)?.position ||
          user?.role ||
          null,
        operatorName: formData.operatorName || null,
        operatorType: formData.operatorType || "EMPLOYEE",
        contractorName: formData.contractorName || null,
        discovererName: formData.discovererName || reporterName,
        witnesses: formData.witnesses || null,
        assignerName: formData.assignerName || null,
        supervisorName: formData.supervisorName || null,
        supervisorId: formData.supervisorId || null,

        // 5. การดูแลเบื้องต้น
        initialStorage: formData.initialStorage || formData.currentLocation || "จุดกักกันชั่วคราว",
        custodian: formData.custodian || reporterName,
        isQuarantined: formData.isQuarantined !== undefined ? Boolean(formData.isQuarantined) : true,
        reportedToSupervisorAt: parseThaiDate(formData.reportedToSupervisorAt) || new Date(),

        // 6. เล่าเหตุการณ์ 3 คำถาม
        beforeIncident: formData.beforeIncident || null,
        duringIncident: formData.duringIncident || null,
        afterIncident: formData.afterIncident || null,
        suspectedCause: formData.suspectedCause || null,

        // 7. เอกสารและรูป
        photosFull: formData.photosFull || [],
        photosDamage: formData.photosDamage || [],
        photosSerial: formData.photosSerial || [],
        photosScene: formData.photosScene || [],
        photosToolPackaging: formData.photosToolPackaging || [],
        attachedDocs: formData.attachedDocs || [],

        // Pending task initial
        pendingTaskDescription: "หัวหน้างานตรวจสอบข้อเท็จจริงและส่งผลสอบสวน",
        pendingTaskAssignee: formData.supervisorName || "หัวหน้างาน",
        lastFollowUpDate: new Date(),

        timeline: initialTimeline,
      },
    });

    // Notify Supervisor / Management if supervisorId or general managers
    try {
      if (formData.supervisorId) {
        await prisma.notification.create({
          data: {
            userId: formData.supervisorId,
            title: `มีเคสแจ้งสินค้าชำรุดใหม่: ${caseNumber}`,
            message: `${reporterName} แจ้งสินค้าชำรุด: ${report.itemName} (${report.company}) โปรดเข้าตรวจสอบและสืบสวนสาเหตุ`,
            linkUrl: `/damage-reports/${report.id}`,
            type: "DAMAGE_REPORT",
          },
        });
      }
    } catch (notifErr) {
      console.warn("Failed to create notification:", notifErr);
    }

    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, id: report.id, caseNumber: report.caseNumber };
  } catch (error: any) {
    console.error("createDamageReport error:", error);
    return { success: false, error: error.message || "Failed to create damage report" };
  }
}

/**
 * 2. Get list of Damage Reports with filtering
 */
export async function getDamageReports(filters?: {
  company?: string;
  status?: string;
  search?: string;
  warehouseStatus?: string;
  hrStatus?: string;
  accountingStatus?: string;
  branch?: string;
}) {
  try {
    const where: any = {};

    if (filters?.company && filters.company !== "ALL") {
      where.company = filters.company;
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.warehouseStatus && filters.warehouseStatus !== "ALL") {
      where.warehouseStatus = filters.warehouseStatus;
    }

    if (filters?.hrStatus && filters.hrStatus !== "ALL") {
      where.hrStatus = filters.hrStatus;
    }

    if (filters?.accountingStatus && filters.accountingStatus !== "ALL") {
      where.accountingStatus = filters.accountingStatus;
    }

    if (filters?.branch && filters.branch !== "ALL") {
      where.branch = { contains: filters.branch, mode: "insensitive" };
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { caseNumber: { contains: q, mode: "insensitive" } },
        { itemName: { contains: q, mode: "insensitive" } },
        { itemCode: { contains: q, mode: "insensitive" } },
        { serialOrLot: { contains: q, mode: "insensitive" } },
        { reporterName: { contains: q, mode: "insensitive" } },
        { currentLocation: { contains: q, mode: "insensitive" } },
        { pendingTaskAssignee: { contains: q, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.damageReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: reports };
  } catch (error: any) {
    console.error("getDamageReports error:", error);
    return { success: false, error: error.message || "Failed to get damage reports" };
  }
}

/**
 * 3. Get single Damage Report by ID
 */
export async function getDamageReportById(id: string) {
  try {
    const report = await prisma.damageReport.findFirst({
      where: {
        OR: [{ id }, { caseNumber: id }],
      },
    });

    if (!report) {
      return { success: false, error: "ไม่พบเคสความเสียหายดังกล่าว" };
    }

    return { success: true, data: report };
  } catch (error: any) {
    console.error("getDamageReportById error:", error);
    return { success: false, error: error.message || "Failed to fetch damage report" };
  }
}

/**
 * 4. Supervisor Investigation Update
 * Actions: "NEED_MORE_INFO" | "IN_PROGRESS" | "SUBMITTED" | "RETURNED"
 */
export async function updateSupervisorInvestigation(id: string, payload: {
  action: "NEED_MORE_INFO" | "IN_PROGRESS" | "SUBMITTED" | "RETURNED";
  statements?: any[];
  provenFacts?: string;
  rootCause?: string;
  unresolvedIssues?: string;
  involvedPartiesAssessment?: string;
  preventiveAction?: string;
  preventiveOwner?: string;
  preventiveFollowUpDate?: string | null;
  investigationEvidence?: any[];
  actionReason?: string;
}) {
  try {
    const user = await getUser();
    const actorName = user?.fullName || "หัวหน้างาน";

    const current = await prisma.damageReport.findUnique({ where: { id } });
    if (!current) throw new Error("ไม่พบข้อมูลเคส");

    let newStatus = current.status;
    let newPendingTask = current.pendingTaskDescription;
    let newPendingAssignee = current.pendingTaskAssignee;

    if (payload.action === "SUBMITTED") {
      newStatus = "PENDING_APPROVAL";
      newPendingTask = "ผู้มีอำนาจพิจารณาและอนุมัติแนวทางจัดการ";
      newPendingAssignee = "ผู้มีอำนาจอนุมัติ (ฝ่ายบริหาร)";
    } else if (payload.action === "NEED_MORE_INFO") {
      newStatus = "INVESTIGATING";
      newPendingTask = `ขอข้อมูลเพิ่มเติม: ${payload.actionReason || "รอข้อมูลจากผู้แจ้ง"}`;
      newPendingAssignee = current.reporterName;
    } else if (payload.action === "RETURNED") {
      newStatus = "REPORTED";
      newPendingTask = `ส่งกลับแก้ไขรายงาน: ${payload.actionReason || "รอแก้ไขข้อมูล"}`;
      newPendingAssignee = current.reporterName;
    } else {
      newStatus = "INVESTIGATING";
      newPendingTask = "อยู่ระหว่างการสืบสวนและรวบรวมหลักฐาน";
      newPendingAssignee = actorName;
    }

    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorName,
      action: `หัวหน้างานสืบสวน: ${payload.action}`,
      notes: payload.actionReason || `ปรับสถานะเป็น ${payload.action}`,
    });

    const updated = await prisma.damageReport.update({
      where: { id },
      data: {
        status: newStatus,
        investigatedBy: actorName,
        investigatedAt: new Date(),
        investigationStatus: payload.action,
        statements: (payload.statements !== undefined ? payload.statements : current.statements) as any,
        provenFacts: payload.provenFacts !== undefined ? payload.provenFacts : current.provenFacts,
        rootCause: payload.rootCause !== undefined ? payload.rootCause : current.rootCause,
        unresolvedIssues: payload.unresolvedIssues !== undefined ? payload.unresolvedIssues : current.unresolvedIssues,
        involvedPartiesAssessment: payload.involvedPartiesAssessment !== undefined ? payload.involvedPartiesAssessment : current.involvedPartiesAssessment,
        preventiveAction: payload.preventiveAction !== undefined ? payload.preventiveAction : current.preventiveAction,
        preventiveOwner: payload.preventiveOwner !== undefined ? payload.preventiveOwner : current.preventiveOwner,
        preventiveFollowUpDate: parseThaiDate(payload.preventiveFollowUpDate) || current.preventiveFollowUpDate,
        investigationEvidence: (payload.investigationEvidence !== undefined ? payload.investigationEvidence : current.investigationEvidence) as any,
        pendingTaskDescription: newPendingTask,
        pendingTaskAssignee: newPendingAssignee,
        lastFollowUpDate: new Date(),
        timeline,
      },
    });

    revalidatePath(`/damage-reports/${id}`);
    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateSupervisorInvestigation error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. Executive / Management Approval
 */
export async function approveDamageReport(id: string, payload: {
  decision: "APPROVED" | "REQUEST_CHANGE" | "REJECTED";
  productResolution: string; // "โอนแยกสินค้าชำรุด" | "ตัดออกจากสต็อก" | "ขายมือสอง" | "ส่งซ่อม" | "เคลมประกัน/ซัพพลายเออร์" | "ไม่กระทบสต็อก"
  personnelResolution: string; // "บริษัทรับผิดชอบ" | "พนักงานชดใช้" | "ผู้รับเหมาจ่าย" | "ไม่เรียกชดใช้"
  sendToWarehouse: boolean;
  sendToHr: boolean;
  comments?: string;
  estimatedCost?: number | null;
}) {
  try {
    const user = await getUser();
    const actorName = user?.fullName || "ผู้มีอำนาจอนุมัติ";

    const current = await prisma.damageReport.findUnique({ where: { id } });
    if (!current) throw new Error("ไม่พบข้อมูลเคส");

    let newStatus = current.status;
    let newWarehouseStatus = current.warehouseStatus;
    let newHrStatus = current.hrStatus;
    let pendingTasks = [];
    let pendingAssignees = [];

    if (payload.decision === "APPROVED") {
      newStatus = "ACTION_REQUIRED";
      if (payload.sendToWarehouse) {
        newWarehouseStatus = "PENDING";
        pendingTasks.push("คลังดำเนินการสต็อก");
        pendingAssignees.push("แผนกคลังสินค้า/สโตร์");
      }
      if (payload.sendToHr) {
        newHrStatus = "PENDING_REVIEW";
        pendingTasks.push("HR พิจารณาและจัดทำหนังสือยินยอม/รับทราบ");
        pendingAssignees.push("ฝ่ายบุคคล (HR)");
      }
      if (pendingTasks.length === 0) {
        pendingTasks.push("บัญชีตรวจรับรองผล");
        pendingAssignees.push("ฝ่ายบัญชี");
      }
    } else if (payload.decision === "REQUEST_CHANGE") {
      newStatus = "INVESTIGATING";
      pendingTasks.push(`ขอให้สืบสวน/แก้ไขเพิ่มเติม: ${payload.comments || "-"}`);
      pendingAssignees.push(current.investigatedBy || current.supervisorName || "หัวหน้างาน");
    } else {
      newStatus = "CANCELLED";
      pendingTasks.push(`ไม่อนุมัติ: ${payload.comments || "-"}`);
      pendingAssignees.push("-");
    }

    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorName,
      action: `พิจารณาอนุมัติ: ${payload.decision}`,
      notes: `สินค้า: ${payload.productResolution} | บุคคล: ${payload.personnelResolution}${payload.comments ? ` | ความเห็น: ${payload.comments}` : ""}`,
    });

    const updated = await prisma.damageReport.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: actorName,
        approvedAt: new Date(),
        approvalDecision: payload.decision,
        productResolution: payload.productResolution,
        personnelResolution: payload.personnelResolution,
        approvalComments: payload.comments || null,
        sentToWarehouse: payload.sendToWarehouse,
        sentToWarehouseAt: payload.sendToWarehouse ? new Date() : current.sentToWarehouseAt,
        sentToHr: payload.sendToHr,
        sentToHrAt: payload.sendToHr ? new Date() : current.sentToHrAt,
        warehouseStatus: newWarehouseStatus,
        hrStatus: newHrStatus,
        estimatedCost: payload.estimatedCost !== undefined ? payload.estimatedCost : current.estimatedCost,
        pendingTaskDescription: pendingTasks.join(" และ "),
        pendingTaskAssignee: pendingAssignees.join(", "),
        lastFollowUpDate: new Date(),
        timeline,
      },
    });

    revalidatePath(`/damage-reports/${id}`);
    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("approveDamageReport error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. Warehouse / Store Stock Handling
 */
export async function updateWarehouseAction(id: string, payload: {
  warehouseStatus: "PENDING" | "INSPECTING" | "NEED_INFO" | "COMPLETED" | "RETURNED";
  stockActionType: string; // "โอนแยกสินค้าชำรุด" | "ตัดออกจากสต็อก" | "ขาย" | "ส่งซ่อม" | "ไม่เกี่ยวข้อง"
  stockActionDate?: string | null;
  stockQuantity?: number;
  stockSystemUsed?: string; // "Express" | "CRM" | "Manual"
  stockDocNumber?: string;
  stockEvidence?: any[];
  stockDestination?: string;
  stockSenderName?: string;
  stockReceiverName?: string;
  stockHandoverDate?: string | null;
  stockNotes?: string;
}) {
  try {
    const user = await getUser();
    const actorName = user?.fullName || "เจ้าหน้าที่คลังสินค้า";

    const current = await prisma.damageReport.findUnique({ where: { id } });
    if (!current) throw new Error("ไม่พบข้อมูลเคส");

    let newCurrentLocation = current.currentLocation;
    if (payload.stockDestination) {
      newCurrentLocation = payload.stockDestination;
    } else if (payload.stockActionType === "ตัดออกจากสต็อก") {
      newCurrentLocation = "ตัดสต็อกแล้ว";
    } else if (payload.stockActionType === "ขาย") {
      newCurrentLocation = "ขายแล้ว";
    } else if (payload.stockActionType === "ส่งซ่อม") {
      newCurrentLocation = "ส่งซ่อมภายนอก";
    }

    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorName,
      action: `คลังบันทึกสต็อก: ${payload.warehouseStatus} (${payload.stockActionType})`,
      notes: `เลขเอกสาร: ${payload.stockDocNumber || "-"} | ปลายทาง: ${payload.stockDestination || "-"}`,
    });

    // Check if HR is done or not applicable, advance to accounting review
    let newReportStatus = current.status;
    let newPendingTask = current.pendingTaskDescription;
    let newPendingAssignee = current.pendingTaskAssignee;

    if (payload.warehouseStatus === "COMPLETED") {
      const hrDone = !current.sentToHr || ["FULL_PAID", "WAIVED", "NOT_APPLICABLE"].includes(current.hrStatus);
      if (hrDone) {
        newReportStatus = "ACCOUNTING_REVIEW";
        newPendingTask = "บัญชีตรวจรับรองและลงบันทึก Express";
        newPendingAssignee = "ฝ่ายบัญชี";
      } else {
        newPendingTask = "รอฝ่ายบุคคล (HR) ดำเนินการชดใช้";
        newPendingAssignee = "ฝ่ายบุคคล (HR)";
      }
    }

    const updated = await prisma.damageReport.update({
      where: { id },
      data: {
        status: newReportStatus,
        warehouseStatus: payload.warehouseStatus,
        stockActionType: payload.stockActionType,
        stockActionDate: parseThaiDate(payload.stockActionDate) || new Date(),
        stockQuantity: payload.stockQuantity !== undefined ? payload.stockQuantity : current.stockQuantity,
        stockRecordedBy: actorName,
        stockSystemUsed: payload.stockSystemUsed || "Express",
        stockDocNumber: payload.stockDocNumber || null,
        stockEvidence: (payload.stockEvidence !== undefined ? payload.stockEvidence : current.stockEvidence) as any,
        stockDestination: payload.stockDestination || null,
        stockSenderName: payload.stockSenderName || null,
        stockReceiverName: payload.stockReceiverName || null,
        stockHandoverDate: parseThaiDate(payload.stockHandoverDate),
        stockNotes: payload.stockNotes || null,
        currentLocation: newCurrentLocation,
        pendingTaskDescription: newPendingTask,
        pendingTaskAssignee: newPendingAssignee,
        lastFollowUpDate: new Date(),
        timeline,
      },
    });

    revalidatePath(`/damage-reports/${id}`);
    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateWarehouseAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 7. HR Compensation & Employee Agreement Update
 */
export async function updateHrAction(id: string, payload: {
  hrStatus: "PENDING_REVIEW" | "IN_REVIEW" | "AWAITING_SIGNATURE" | "AWAITING_PAYMENT" | "PARTIAL_PAID" | "FULL_PAID" | "WAIVED" | "NOT_APPLICABLE";
  hrApprovedAmount?: number | null;
  hrCompensationMethod?: string; // "SALARY_DEDUCTION" | "CASH_TRANSFER" | "CONTRACTOR_INVOICE" | "OTHER"
  hrInstallments?: number;
  hrDueDate?: string | null;
  hrSigneeName?: string;
  hrAckDocUrl?: string | null;
  hrConsentDocUrl?: string | null;
  newPayment?: {
    date: string;
    amount: number;
    installment: number;
    slipUrl?: string;
    notes?: string;
  };
  hrWaiveReason?: string;
  hrNotes?: string;
}) {
  try {
    const user = await getUser();
    const actorName = user?.fullName || "เจ้าหน้าที่บุคคล (HR)";

    const current = await prisma.damageReport.findUnique({ where: { id } });
    if (!current) throw new Error("ไม่พบข้อมูลเคส");

    let history: any[] = Array.isArray(current.hrPaymentHistory) ? [...current.hrPaymentHistory] : [];
    let totalPaid = current.hrActualPaidTotal || 0;

    if (payload.newPayment && payload.newPayment.amount > 0) {
      history.push({
        date: payload.newPayment.date || new Date().toISOString(),
        amount: Number(payload.newPayment.amount),
        installment: payload.newPayment.installment || history.length + 1,
        slipUrl: payload.newPayment.slipUrl || null,
        notes: payload.newPayment.notes || null,
        recordedBy: actorName,
      });
      totalPaid += Number(payload.newPayment.amount);
    }

    let determinedHrStatus = payload.hrStatus;
    const targetAmount = payload.hrApprovedAmount !== undefined ? payload.hrApprovedAmount : current.hrApprovedAmount;
    if (targetAmount && totalPaid >= targetAmount && payload.hrStatus !== "WAIVED" && payload.hrStatus !== "NOT_APPLICABLE") {
      determinedHrStatus = "FULL_PAID";
    } else if (totalPaid > 0 && targetAmount && totalPaid < targetAmount) {
      determinedHrStatus = "PARTIAL_PAID";
    }

    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorName,
      action: `HR บันทึกการชดใช้: ${determinedHrStatus}`,
      notes: `ยอดชดใช้: ${targetAmount || 0} บาท | รับจริงแล้ว: ${totalPaid} บาท${payload.newPayment ? ` (+${payload.newPayment.amount})` : ""}`,
    });

    // Check if warehouse is also done, advance to accounting review
    let newReportStatus = current.status;
    let newPendingTask = current.pendingTaskDescription;
    let newPendingAssignee = current.pendingTaskAssignee;

    const warehouseDone = !current.sentToWarehouse || current.warehouseStatus === "COMPLETED";
    if (["FULL_PAID", "WAIVED", "NOT_APPLICABLE"].includes(determinedHrStatus) && warehouseDone) {
      newReportStatus = "ACCOUNTING_REVIEW";
      newPendingTask = "บัญชีตรวจรับรองและลงบันทึก Express";
      newPendingAssignee = "ฝ่ายบัญชี";
    } else if (!warehouseDone) {
      newPendingTask = "รอดำเนินการสต็อกสินค้าชำรุด";
      newPendingAssignee = "แผนกคลังสินค้า/สโตร์";
    } else {
      newPendingTask = `รอการชำระเงินชดใช้ (คงค้าง ${(targetAmount || 0) - totalPaid} บาท)`;
      newPendingAssignee = payload.hrSigneeName || current.operatorName || "ผู้ชดใช้";
    }

    const updated = await prisma.damageReport.update({
      where: { id },
      data: {
        status: newReportStatus,
        hrStatus: determinedHrStatus,
        hrApprovedAmount: targetAmount,
        hrCompensationMethod: payload.hrCompensationMethod || current.hrCompensationMethod,
        hrInstallments: payload.hrInstallments !== undefined ? payload.hrInstallments : current.hrInstallments,
        hrDueDate: parseThaiDate(payload.hrDueDate) || current.hrDueDate,
        hrSigneeName: payload.hrSigneeName || current.hrSigneeName,
        hrAckDocUrl: payload.hrAckDocUrl !== undefined ? payload.hrAckDocUrl : current.hrAckDocUrl,
        hrConsentDocUrl: payload.hrConsentDocUrl !== undefined ? payload.hrConsentDocUrl : current.hrConsentDocUrl,
        hrActualPaidTotal: totalPaid,
        hrPaymentHistory: history,
        hrWaiveReason: payload.hrWaiveReason !== undefined ? payload.hrWaiveReason : current.hrWaiveReason,
        hrNotes: payload.hrNotes || current.hrNotes,
        pendingTaskDescription: newPendingTask,
        pendingTaskAssignee: newPendingAssignee,
        lastFollowUpDate: new Date(),
        timeline,
      },
    });

    revalidatePath(`/damage-reports/${id}`);
    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateHrAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 8. Accounting Verification & Follow-up
 */
export async function updateAccountingAction(id: string, payload: {
  accountingStatus: "PENDING" | "COST_VERIFIED" | "RECORDED" | "NEED_DOCS" | "CERTIFIED";
  actualCost?: number | null;
  accountingCostVerified?: boolean;
  accountingExpressDocNo?: string | null;
  accountingInvoiceNo?: string | null;
  accountingNotes?: string;
  pendingTaskDescription?: string;
  pendingTaskAssignee?: string;
  pendingTaskDueDate?: string | null;
  delayReason?: string;
}) {
  try {
    const user = await getUser();
    const actorName = user?.fullName || "เจ้าหน้าที่บัญชี";

    const current = await prisma.damageReport.findUnique({ where: { id } });
    if (!current) throw new Error("ไม่พบข้อมูลเคส");

    const isCertified = payload.accountingStatus === "CERTIFIED";

    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorName,
      action: `บัญชีตรวจติดตาม: ${payload.accountingStatus}`,
      notes: `ต้นทุนจริง: ${payload.actualCost || current.actualCost || "-"} | Express: ${payload.accountingExpressDocNo || "-"} | บิล: ${payload.accountingInvoiceNo || "-"}`,
    });

    const updated = await prisma.damageReport.update({
      where: { id },
      data: {
        accountingStatus: payload.accountingStatus,
        actualCost: payload.actualCost !== undefined ? payload.actualCost : current.actualCost,
        accountingCostVerified: payload.accountingCostVerified !== undefined ? payload.accountingCostVerified : current.accountingCostVerified,
        accountingCostVerifiedAt: payload.accountingCostVerified ? new Date() : current.accountingCostVerifiedAt,
        accountingExpressDocNo: payload.accountingExpressDocNo !== undefined ? payload.accountingExpressDocNo : current.accountingExpressDocNo,
        accountingInvoiceNo: payload.accountingInvoiceNo !== undefined ? payload.accountingInvoiceNo : current.accountingInvoiceNo,
        accountingCertifiedBy: isCertified ? actorName : current.accountingCertifiedBy,
        accountingCertifiedAt: isCertified ? new Date() : current.accountingCertifiedAt,
        accountingNotes: payload.accountingNotes !== undefined ? payload.accountingNotes : current.accountingNotes,
        pendingTaskDescription: payload.pendingTaskDescription !== undefined ? payload.pendingTaskDescription : current.pendingTaskDescription,
        pendingTaskAssignee: payload.pendingTaskAssignee !== undefined ? payload.pendingTaskAssignee : current.pendingTaskAssignee,
        pendingTaskDueDate: parseThaiDate(payload.pendingTaskDueDate) || current.pendingTaskDueDate,
        delayReason: payload.delayReason !== undefined ? payload.delayReason : current.delayReason,
        lastFollowUpDate: new Date(),
        timeline,
      },
    });

    revalidatePath(`/damage-reports/${id}`);
    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateAccountingAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 9. Case Closure (Checklist Verification & Final Closure)
 */
export async function closeDamageReport(id: string, payload: {
  checklist: {
    checkReportAndPhotos: boolean;
    checkInvestigationApproved: boolean;
    checkHandoverEvidence: boolean;
    checkStockResult: boolean;
    checkAccountingResult: boolean;
    checkHrResult: boolean;
    checkPreventiveMeasure: boolean;
    checkFinalApproval: boolean;
  };
  closeReason?: string;
}) {
  try {
    const user = await getUser();
    const actorName = user?.fullName || "ผู้อนุมัติปิดเคส";

    const current = await prisma.damageReport.findUnique({ where: { id } });
    if (!current) throw new Error("ไม่พบข้อมูลเคส");

    // All 8 checks must be true
    const {
      checkReportAndPhotos,
      checkInvestigationApproved,
      checkHandoverEvidence,
      checkStockResult,
      checkAccountingResult,
      checkHrResult,
      checkPreventiveMeasure,
      checkFinalApproval,
    } = payload.checklist;

    const allPassed =
      checkReportAndPhotos &&
      checkInvestigationApproved &&
      checkHandoverEvidence &&
      checkStockResult &&
      checkAccountingResult &&
      checkHrResult &&
      checkPreventiveMeasure &&
      checkFinalApproval;

    if (!allPassed) {
      throw new Error("ไม่สามารถปิดเคสได้ เนื่องจากรายการตรวจสอบตามเกณฑ์ยังไม่ครบถ้วนทั้ง 8 ข้อ (หากข้อใดไม่เกี่ยวข้องให้ระบุรับรองว่าไม่เกี่ยวข้อง)");
    }

    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorName,
      action: "อนุมัติปิดเคสเรียบร้อย (Closed)",
      notes: payload.closeReason || "ตรวจสอบความครบถ้วนทุกขั้นตอนแล้ว อนุมัติปิดเคส",
    });

    const updated = await prisma.damageReport.update({
      where: { id },
      data: {
        status: "CLOSED",
        checkReportAndPhotos,
        checkInvestigationApproved,
        checkHandoverEvidence,
        checkStockResult,
        checkAccountingResult,
        checkHrResult,
        checkPreventiveMeasure,
        checkFinalApproval,
        closedBy: actorName,
        closedAt: new Date(),
        closeReason: payload.closeReason || "ปิดเคสตามเกณฑ์ครบถ้วน",
        pendingTaskDescription: "ปิดเคสเรียบร้อย",
        pendingTaskAssignee: "-",
        lastFollowUpDate: new Date(),
        timeline,
      },
    });

    revalidatePath(`/damage-reports/${id}`);
    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("closeDamageReport error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 10. Accounting Tracking Dashboard Query & Metrics
 * Tailored precisely to the user's required tracking table:
 * [ เลขที่เคส | สินค้า | อยู่ที่ไหน | สต็อก | บัญชี | HR / เงินชดใช้ | งานที่ค้าง ]
 */
export async function getAccountingTrackingDashboard(filters?: {
  company?: string;
  branch?: string;
  status?: string;
  search?: string;
}) {
  try {
    const where: any = {};

    if (filters?.company && filters.company !== "ALL") {
      where.company = filters.company;
    }

    if (filters?.branch && filters.branch !== "ALL") {
      where.branch = { contains: filters.branch, mode: "insensitive" };
    }

    if (filters?.status && filters.status !== "ALL") {
      if (filters.status === "OPEN") {
        where.status = { notIn: ["CLOSED", "CANCELLED"] };
      } else {
        where.status = filters.status;
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { caseNumber: { contains: q, mode: "insensitive" } },
        { itemName: { contains: q, mode: "insensitive" } },
        { currentLocation: { contains: q, mode: "insensitive" } },
        { pendingTaskAssignee: { contains: q, mode: "insensitive" } },
        { pendingTaskDescription: { contains: q, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.damageReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Compute Metrics across all reports
    const allActive = await prisma.damageReport.findMany({
      where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
      select: {
        id: true,
        company: true,
        status: true,
        warehouseStatus: true,
        hrStatus: true,
        accountingStatus: true,
        hrApprovedAmount: true,
        hrActualPaidTotal: true,
        pendingTaskDueDate: true,
        currentLocation: true,
      },
    });

    const now = new Date();
    const metrics = {
      totalOpenCases: allActive.length,
      pendingSupervisor: allActive.filter((r) => ["REPORTED", "INVESTIGATING"].includes(r.status)).length,
      pendingWarehouse: allActive.filter((r) => ["PENDING", "INSPECTING", "NEED_INFO"].includes(r.warehouseStatus)).length,
      pendingHr: allActive.filter((r) => ["PENDING_REVIEW", "IN_REVIEW", "AWAITING_SIGNATURE", "AWAITING_PAYMENT", "PARTIAL_PAID"].includes(r.hrStatus)).length,
      pendingAccounting: allActive.filter((r) => r.accountingStatus !== "CERTIFIED").length,
      totalUncollectedAmount: allActive.reduce((sum, r) => {
        const approved = r.hrApprovedAmount || 0;
        const paid = r.hrActualPaidTotal || 0;
        return sum + Math.max(0, approved - paid);
      }, 0),
      unknownLocationCount: allActive.filter((r) => !r.currentLocation || r.currentLocation.includes("รอตรวจ") || r.currentLocation.includes("ไม่ทราบ")).length,
      overdueCount: allActive.filter((r) => r.pendingTaskDueDate && new Date(r.pendingTaskDueDate) < now).length,
    };

    return {
      success: true,
      data: reports,
      metrics,
    };
  } catch (error: any) {
    console.error("getAccountingTrackingDashboard error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 7. Delete Damage Report
 */
export async function deleteDamageReport(id: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const report = await prisma.damageReport.findFirst({
      where: { OR: [{ id }, { caseNumber: id }] },
    });

    if (!report) return { success: false, error: "ไม่พบข้อมูลเคสที่ต้องการลบ" };

    await prisma.damageReport.delete({
      where: { id: report.id },
    });

    revalidatePath("/damage-reports");
    revalidatePath("/damage-reports/accounting");
    return { success: true };
  } catch (error: any) {
    console.error("deleteDamageReport error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 8. Append photos to an existing damage report
 */
export async function appendDamageReportPhotos(
  reportId: string,
  category: "photosFull" | "photosDamage" | "photosSerial" | "photosScene" | "photosToolPackaging" | "attachedDocs",
  newUrls: string[]
) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const report = await prisma.damageReport.findUnique({
      where: { id: reportId },
    });
    if (!report) return { success: false, error: "ไม่พบข้อมูลเคส" };

    const existing = Array.isArray((report as any)[category]) ? (report as any)[category] : [];
    const updated = [...existing, ...newUrls];

    await prisma.damageReport.update({
      where: { id: reportId },
      data: {
        [category]: updated,
      },
    });

    revalidatePath(`/damage-reports/${reportId}`);
    return { success: true, count: updated.length };
  } catch (error: any) {
    console.error("appendDamageReportPhotos error:", error);
    return { success: false, error: error.message };
  }
}
