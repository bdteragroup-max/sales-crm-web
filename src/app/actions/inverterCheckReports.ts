"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { getUser } from "@/app/lib/dal";
import { createRepairOrder } from "@/app/actions/repairOrders";

export interface DiodeMeasurement {
  // Positive (+) probe to phase terminals
  pos_to_r_black?: string;
  pos_to_s_black?: string;
  pos_to_t_black?: string;
  pos_to_u_red?: string;
  pos_to_v_red?: string;
  pos_to_w_red?: string;

  pos_to_r_red?: string;
  pos_to_s_red?: string;
  pos_to_t_red?: string;
  pos_to_u_black?: string;
  pos_to_v_black?: string;
  pos_to_w_black?: string;

  // Negative (-) probe to phase terminals
  neg_to_r_red?: string;
  neg_to_s_red?: string;
  neg_to_t_red?: string;
  neg_to_u_black?: string;
  neg_to_v_black?: string;
  neg_to_w_black?: string;

  neg_to_r_black?: string;
  neg_to_s_black?: string;
  neg_to_t_black?: string;
  neg_to_u_red?: string;
  neg_to_v_red?: string;
  neg_to_w_red?: string;

  notes?: string;
}

export interface PowerVoltageCheck {
  inputDc?: string;
  input1PhaseAc?: string;
  input3PhaseRs?: string;
  input3PhaseRt?: string;
  input3PhaseSt?: string;

  output1PhaseLn?: string;
  output3Phase220Uv?: string;
  output3Phase220Uw?: string;
  output3Phase220Vw?: string;
  output3Phase380Uv?: string;
  output3Phase380Uw?: string;
  output3Phase380Vw?: string;
}

export interface PanelComponentItem {
  key: string;
  name: string;
  status: "NORMAL" | "DAMAGED" | "NOT_SPECIFIED";
  remark?: string;
}

export interface InverterCheckReportFormData {
  id?: string;
  crNumber?: string;
  checkDate?: string;
  customerName?: string;
  customerCompany?: string;
  customerPhone?: string;
  customerAddress?: string;
  inspectorName?: string;
  salesPerson?: string;
  inverterBrand?: string;
  inverterModel?: string;
  serialNumber?: string;
  motorKw?: string;
  applicationLoad?: string;
  purchaseDate?: string;
  saleDate?: string;
  faultDate?: string;
  warrantyStatus?: string; // IN_WARRANTY | OUT_OF_WARRANTY | PENDING
  symptoms?: string;
  causeOfFault?: string;
  recommendations?: string;
  requireParts?: { partName: string; qty: number }[];
  diodeMeasurement?: DiodeMeasurement;
  powerInputVoltage?: Partial<PowerVoltageCheck>;
  powerOutputVoltage?: Partial<PowerVoltageCheck>;
  panelComponentsCheck?: PanelComponentItem[];
  photos?: {
    nameplate?: string[];
    front?: string[];
    side?: string[];
    damage?: string[];
    other?: string[];
  };
  reportBy?: string;
  status?: string; // PENDING | CONVERTED_TO_RO | WARRANTY_CLAIM | CLOSED_NO_REPAIR
  companyCode?: string; // TG | TP | TE
  equipmentType?: string; // INVERTER | CONTROL_CABINET | MOTOR | PUMP
}

/**
 * Generate CR Document Number
 * Format: CR{YY}-{MM}{DD} e.g. CR69-1019
 * If already exists for the day: CR69-1019-01, CR69-1019-02, ...
 */
export async function generateCrNumber(dateInput?: string): Promise<string> {
  const d = dateInput
    ? new Date(dateInput)
    : new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

  const beYear = (d.getFullYear() + 543).toString().slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const baseNumber = `CR${beYear}-${month}${day}`;

  const existing = await prisma.inverterCheckReport.findMany({
    where: {
      crNumber: {
        startsWith: baseNumber,
      },
    },
    select: { crNumber: true },
  });

  if (!existing || existing.length === 0) {
    return baseNumber;
  }

  // If base exists, calculate next suffix -01, -02...
  let maxSeq = 0;
  for (const item of existing) {
    if (item.crNumber === baseNumber && maxSeq === 0) {
      maxSeq = 1;
    }
    const match = item.crNumber.match(new RegExp(`^${baseNumber}-(\\d+)$`));
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  return `${baseNumber}-${String(maxSeq + 1).padStart(2, "0")}`;
}

export async function getInverterCheckReports(params?: {
  search?: string;
  status?: string;
  companyCode?: string;
}) {
  try {
    const where: any = {};

    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params?.companyCode && params.companyCode !== "ALL") {
      where.companyCode = params.companyCode;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { crNumber: { contains: q, mode: "insensitive" } },
        { customerCompany: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { inverterBrand: { contains: q, mode: "insensitive" } },
        { inverterModel: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { inspectorName: { contains: q, mode: "insensitive" } },
        { symptoms: { contains: q, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.inverterCheckReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: reports };
  } catch (error: any) {
    console.error("Error fetching InverterCheckReports:", error);
    return { success: false, error: error.message || "Failed to fetch reports", data: [] };
  }
}

export async function getInverterCheckReportById(id: string) {
  try {
    const report = await prisma.inverterCheckReport.findFirst({
      where: {
        OR: [{ id }, { crNumber: id }],
      },
    });

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    return { success: true, data: report };
  } catch (error: any) {
    console.error("Error fetching InverterCheckReport by id:", error);
    return { success: false, error: error.message || "Failed to fetch report" };
  }
}

export async function createInverterCheckReport(formData: InverterCheckReportFormData) {
  try {
    const user = await getUser();

    // Auto-generate CR number if not supplied
    let crNumber = formData.crNumber?.trim();
    if (!crNumber) {
      crNumber = await generateCrNumber(formData.checkDate);
    }

    // Check if CR number is duplicate
    const existing = await prisma.inverterCheckReport.findUnique({
      where: { crNumber },
    });
    if (existing) {
      return { success: false, error: `เลขที่เอกสาร CR ${crNumber} มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น` };
    }

    const report = await prisma.inverterCheckReport.create({
      data: {
        crNumber,
        checkDate: formData.checkDate ? new Date(formData.checkDate) : new Date(),
        customerName: formData.customerName,
        customerCompany: formData.customerCompany,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        inspectorName: formData.inspectorName || user?.fullName,
        salesPerson: formData.salesPerson,
        inverterBrand: formData.inverterBrand,
        inverterModel: formData.inverterModel,
        serialNumber: formData.serialNumber,
        motorKw: formData.motorKw,
        applicationLoad: formData.applicationLoad,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        saleDate: formData.saleDate ? new Date(formData.saleDate) : null,
        faultDate: formData.faultDate ? new Date(formData.faultDate) : null,
        warrantyStatus: formData.warrantyStatus || "PENDING",
        symptoms: formData.symptoms,
        causeOfFault: formData.causeOfFault,
        recommendations: formData.recommendations,
        requireParts: (formData.requireParts || []) as any,
        diodeMeasurement: (formData.diodeMeasurement || {}) as any,
        powerInputVoltage: (formData.powerInputVoltage || {}) as any,
        powerOutputVoltage: (formData.powerOutputVoltage || {}) as any,
        panelComponentsCheck: (formData.panelComponentsCheck || []) as any,
        photos: (formData.photos || {}) as any,
        reportBy: formData.reportBy || user?.fullName,
        status: formData.status || "PENDING",
        companyCode: formData.companyCode || "TG",
        equipmentType: formData.equipmentType || "INVERTER",
      },
    });

    revalidatePath("/service/check-reports");
    revalidatePath("/service/dashboard");
    return { success: true, data: report };
  } catch (error: any) {
    console.error("Error creating InverterCheckReport:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกรายงาน" };
  }
}

export async function updateInverterCheckReport(id: string, formData: InverterCheckReportFormData) {
  try {
    const existing = await prisma.inverterCheckReport.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูลรายงานตรวจเช็ค" };
    }

    // Check CR number uniqueness if changed
    if (formData.crNumber && formData.crNumber !== existing.crNumber) {
      const crDuplicate = await prisma.inverterCheckReport.findUnique({
        where: { crNumber: formData.crNumber.trim() },
      });
      if (crDuplicate && crDuplicate.id !== id) {
        return { success: false, error: `เลขที่เอกสาร CR ${formData.crNumber} ซ้ำกับรายการอื่น` };
      }
    }

    const updated = await prisma.inverterCheckReport.update({
      where: { id },
      data: {
        crNumber: formData.crNumber?.trim() || existing.crNumber,
        checkDate: formData.checkDate ? new Date(formData.checkDate) : existing.checkDate,
        customerName: formData.customerName,
        customerCompany: formData.customerCompany,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        inspectorName: formData.inspectorName,
        salesPerson: formData.salesPerson,
        inverterBrand: formData.inverterBrand,
        inverterModel: formData.inverterModel,
        serialNumber: formData.serialNumber,
        motorKw: formData.motorKw,
        applicationLoad: formData.applicationLoad,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        saleDate: formData.saleDate ? new Date(formData.saleDate) : null,
        faultDate: formData.faultDate ? new Date(formData.faultDate) : null,
        warrantyStatus: formData.warrantyStatus,
        symptoms: formData.symptoms,
        causeOfFault: formData.causeOfFault,
        recommendations: formData.recommendations,
        requireParts: (formData.requireParts || []) as any,
        diodeMeasurement: (formData.diodeMeasurement || {}) as any,
        powerInputVoltage: (formData.powerInputVoltage || {}) as any,
        powerOutputVoltage: (formData.powerOutputVoltage || {}) as any,
        panelComponentsCheck: (formData.panelComponentsCheck || []) as any,
        photos: (formData.photos || {}) as any,
        reportBy: formData.reportBy,
        status: formData.status || existing.status,
        companyCode: formData.companyCode || existing.companyCode,
        equipmentType: formData.equipmentType || existing.equipmentType || "INVERTER",
      },
    });

    revalidatePath("/service/check-reports");
    revalidatePath(`/service/check-reports/${id}`);
    revalidatePath("/service/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating InverterCheckReport:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการแก้ไขรายงาน" };
  }
}

export async function deleteInverterCheckReport(id: string) {
  try {
    const existing = await prisma.inverterCheckReport.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูลรายงาน" };
    }

    if (existing.status === "CONVERTED_TO_RO") {
      return {
        success: false,
        error: `ไม่สามารถลบได้เนื่องจากรายงานนี้ได้ถูกแปลงเป็นใบรับซ่อม (${existing.convertedJobNumber || "RO"}) เรียบร้อยแล้ว`,
      };
    }

    await prisma.inverterCheckReport.delete({ where: { id } });

    revalidatePath("/service/check-reports");
    revalidatePath("/service/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting InverterCheckReport:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการลบรายงาน" };
  }
}

export async function updateCheckReportStatus(id: string, status: string) {
  try {
    const updated = await prisma.inverterCheckReport.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/service/check-reports");
    revalidatePath(`/service/check-reports/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" };
  }
}

/**
 * CONVERT TO REPAIR ORDER (แปลงเป็นใบรับซ่อม)
 * Directly transfers all customer, machine specs, symptoms, and photos into a new Repair Order!
 */
export async function convertCheckReportToRepairOrder(
  checkReportId: string,
  options?: {
    workType?: string;
    technicianName?: string;
    deliveryMethod?: string;
  }
) {
  try {
    const report = await prisma.inverterCheckReport.findUnique({
      where: { id: checkReportId },
    });

    if (!report) {
      return { success: false, error: "ไม่พบข้อมูลรายงานตรวจเช็ค" };
    }

    if (report.status === "CONVERTED_TO_RO" && report.convertedJobId) {
      return {
        success: false,
        error: `รายงานนี้เคยถูกแปลงเป็นใบรับซ่อมแล้ว (เลขที่: ${report.convertedJobNumber || "-"})`,
        jobId: report.convertedJobId,
        jobNumber: report.convertedJobNumber,
      };
    }

    // Map photos from check report into checklist images
    const photosMap: Record<string, string[]> = {};
    if (report.photos && typeof report.photos === "object") {
      const p = report.photos as Record<string, string[]>;
      if (p.nameplate?.length) photosMap["Nameplate"] = p.nameplate;
      if (p.front?.length) photosMap["Front"] = p.front;
      if (p.side?.length) photosMap["SideLeft"] = p.side;
      if (p.damage?.length) photosMap["Inside"] = p.damage;
      if (p.other?.length) photosMap["Cover"] = p.other;
    }

    // Description of symptoms combining fault cause
    let fullSymptoms = report.symptoms || "";
    if (report.causeOfFault) {
      fullSymptoms += fullSymptoms ? `\nสาเหตุที่พบ: ${report.causeOfFault}` : `สาเหตุที่พบ: ${report.causeOfFault}`;
    }
    if (report.crNumber) {
      fullSymptoms += `\n[อ้างอิงจากใบตรวจเช็ค CR: ${report.crNumber}]`;
    }

    const roPayload = {
      workType: options?.workType || "ซ่อม",
      deliveryMethod: options?.deliveryMethod || "ช่างนำเข้า",
      customerCompany: report.customerCompany || report.customerName || "ไม่ระบุชื่อลูกค้า",
      company: report.companyCode || "TG",
      customerAddress: report.customerAddress || "",
      phoneNumber: report.customerPhone || "",
      salesPerson: report.salesPerson || "",
      technicianName: options?.technicianName || report.inspectorName || "",
      forwardedBy: report.reportBy || report.inspectorName || "",
      symptoms: fullSymptoms,
      settings: report.applicationLoad || "",
      receivedDate: new Date().toISOString(),
      items: [
        {
          type: "INVERTER",
          brand: report.inverterBrand || "",
          model: report.inverterModel || "",
          size: report.motorKw ? `${report.motorKw} kW` : "",
          serial: report.serialNumber || "",
          qty: 1,
          remark: fullSymptoms,
        },
      ],
      checklist: {
        Front: !!photosMap["Front"],
        Top: false,
        SideLeft: !!photosMap["SideLeft"],
        SideRight: false,
        Inside: !!photosMap["Inside"],
        Nameplate: !!photosMap["Nameplate"],
        Bottom: false,
        TerminalNut: false,
        TermCover: false,
        Cover: !!photosMap["Cover"],
        Video: false,
      },
      checklistImages: photosMap,
    };

    const roResult = await createRepairOrder(roPayload);
    if (!roResult || !roResult.success || !roResult.jobId) {
      return {
        success: false,
        error: roResult?.error || "ไม่สามารถสร้างใบรับซ่อมได้",
      };
    }

    const createdJob = await prisma.job.findUnique({
      where: { id: roResult.jobId },
      select: { jobNumber: true },
    });
    const jobNumber = createdJob?.jobNumber || "";

    // Update Check Report status and links
    await prisma.inverterCheckReport.update({
      where: { id: checkReportId },
      data: {
        status: "CONVERTED_TO_RO",
        convertedJobId: roResult.jobId,
        convertedJobNumber: jobNumber,
        convertedRepairOrderId: roResult.repairOrderId,
      },
    });

    revalidatePath("/service/check-reports");
    revalidatePath(`/service/check-reports/${checkReportId}`);
    revalidatePath("/repair-orders");
    revalidatePath("/service/dashboard");
    revalidatePath("/jobs");

    return {
      success: true,
      jobId: roResult.jobId,
      jobNumber: jobNumber,
      repairOrderId: roResult.repairOrderId,
    };
  } catch (error: any) {
    console.error("Error converting check report to repair order:", error);
    return {
      success: false,
      error: error.message || "เกิดข้อผิดพลาดในการแปลงเป็นใบรับซ่อม",
    };
  }
}

/**
 * Fast search companies for check report creation & editing
 * Returns matching companies with contacts, assigned sales reps, and full address.
 */
export async function searchCompaniesForCheckReport(query: string) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim();
  const cleanDigits = q.replace(/\D/g, "");
  const isPhoneQuery = cleanDigits.length >= 3;

  try {
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { companyName: { contains: q, mode: "insensitive" as const } },
          { taxId: { contains: q, mode: "insensitive" as const } },
          { address: { contains: q, mode: "insensitive" as const } },
          { province: { contains: q, mode: "insensitive" as const } },
          { district: { contains: q, mode: "insensitive" as const } },
          {
            contacts: {
              some: {
                OR: [
                  { contactName: { contains: q, mode: "insensitive" as const } },
                  { mobilePhone: { contains: q, mode: "insensitive" as const } },
                  ...(isPhoneQuery
                    ? [{ mobilePhone: { contains: cleanDigits, mode: "insensitive" as const } }]
                    : []),
                ],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        companyName: true,
        taxId: true,
        address: true,
        subDistrict: true,
        district: true,
        province: true,
        postalCode: true,
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            role: true,
            employeeSale: {
              select: {
                nickname: true,
                department: true,
              },
            },
          },
        },
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
            email: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    });

    return companies;
  } catch (err) {
    console.error("Error searching companies for check report:", err);
    return [];
  }
}

/**
 * Fetch active users for sales rep selection
 */
export async function getActiveUsersForCheckReport() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        employeeSale: {
          select: {
            nickname: true,
            department: true,
            branch: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
    return users;
  } catch (err) {
    console.error("Error fetching active users:", err);
    return [];
  }
}

