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

  // Check List Repair items (from Excel template - 6 inspection items + parameter notes)
  // 1. ตรวจเช็คพาวเวอร์บอร์ด
  // 1.1 ตรวจเช็คไดโอด Module IGBT
  igbtStatus?: "NORMAL" | "ABNORMAL" | ""; // Module IGBT ใช้งานได้ปกติ / ไม่ปกติ
  meterPhotoDiode?: string; // รูปถ่ายมิเตอร์ 1.1 ตรวจเช็คไดโอด Module IGBT

  // 1.2 ตรวจสอบแต่ละเฟสถึงกัน หรือไม่
  phaseShortCheck?: "NORMAL" | "SHORT" | ""; // ตรวจสอบแต่ละเฟสถึงกันหรือไม่ (ปกติ ไม่ถึงกัน / ผิดปกติ ถึงกัน)
  meterPhotoPhase?: string; // รูปถ่ายมิเตอร์ 1.2

  // 1.3 ตรวจเช็คไฟ 24 Vdc ออกจากบอร์ดหรือไม่
  powerBoard24VStatus?: "NORMAL" | "ABNORMAL" | ""; // ปกติ (มีไฟ 24 Vdc) / ผิดปกติ (ไม่มีไฟ)
  powerBoard24VValue?: string; // ค่าแรงดันที่วัดได้ (Vdc)
  meterPhotoPower24V?: string; // รูปถ่ายมิเตอร์ 1.3

  // 2. ตรวจเช็คบอร์ดคอนโทรล
  // 2.1 ตรวจเช็คไฟ 24 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น DI1 X1
  controlBoard24VStatus?: "NORMAL" | "ABNORMAL" | ""; // ปกติ (มีไฟ 24 Vdc) / ผิดปกติ (ไม่มีไฟ)
  controlBoard24VValue?: string; // ค่าแรงดันที่วัดได้ (Vdc)
  meterPhotoControl24V?: string; // รูปถ่ายมิเตอร์ 2.1

  // 2.2 ตรวจเช็คไฟ 10 Vdc ออกจากเทอร์มินอลหรือไม่ เช่น +10V เทียบ GND
  controlBoard10VStatus?: "NORMAL" | "ABNORMAL" | ""; // ปกติ (มีไฟ 10 Vdc) / ผิดปกติ (ไม่มีไฟ)
  controlBoard10VValue?: string; // ค่าแรงดันที่วัดได้ (Vdc)
  meterPhotoControl10V?: string; // รูปถ่ายมิเตอร์ 2.2

  // 3. ตรวจเช็คคาปาซิเตอร์ตัวใหญ่
  capacitorStatus?: "NORMAL" | "ABNORMAL" | ""; // ปกติ (ไม่บวม/ไม่รั่ว) / ผิดปกติ (บวม/รั่ว/เสื่อม)
  capacitorValue?: string; // ค่าความจุ หรือ รายละเอียดสภาพ
  photoCapacitor?: string; // รูปถ่ายคาปาซิเตอร์

  // 4. ทำการบันทึกค่าพารามิเตอร์(ให้พิมพ์เอา)
  parameterNotes?: string;

  // สำหรับตู้คอนโทรล (CONTROL_CABINET): บันทึกว่าตู้นี้มี Inverter / Soft Starter หรือไม่ และสเปก Inverter ในตู้
  hasInverter?: boolean;
  inverterBrand?: string;
  inverterModel?: string;
  inverterSerial?: string;
  inverterKw?: string;
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
  status: "NORMAL" | "DAMAGED" | "NOT_SPECIFIED" | "NOT_APPLICABLE";
  remark?: string;
}

export interface MotorMeasurement {
  // 1. ตารางวัดค่าความต้านทานขดลวด (Winding Resistance)
  // ใช้มัลติมิเตอร์ย่าน Ω โดยต้องตัดแหล่งจ่ายไฟและแยกมอเตอร์ออกจากวงจรควบคุมก่อนวัด
  windingU1U2?: string;
  windingV1V2?: string;
  windingW1W2?: string;

  // ไวร์ริ่งสีสายตามแบบฟอร์มมอเตอร์ (Brown-Black, Black-Grey, Brown-Grey)
  windingBrownBlack?: string;
  windingBlackGrey?: string;
  windingBrownGrey?: string;

  // 2. ตารางวัดฉนวนขดลวดลงกราวด์ (Insulation Resistance)
  // ใช้เครื่อง Insulation Tester (Megger) ไม่ใช่มัลติมิเตอร์ธรรมดา
  insulationUGround?: string;
  insulationVGround?: string;
  insulationWGround?: string;

  notes?: string;
}

export interface CheckReportPhotos {
  front?: string[];
  left?: string[];
  right?: string[];
  top?: string[];
  fan?: string[];
  inside?: string[];
  terminal?: string[];
  nameplate?: string[];
  // legacy/fallback compatibility:
  side?: string[];
  damage?: string[];
  other?: string[];
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
  motorMeasurement?: MotorMeasurement;
  photos?: CheckReportPhotos;
  reportBy?: string;
  approvedByName?: string;
  approvedDate?: string;
  status?: string; // PENDING | CONVERTED_TO_RO | WARRANTY_CLAIM | CLOSED_NO_REPAIR
  companyCode?: string; // TG | TP | TE
  equipmentType?: string; // INVERTER | CONTROL_CABINET | MOTOR | PUMP
  hasInverterInCabinet?: boolean; // For CONTROL_CABINET: whether cabinet contains an Inverter/Soft Starter
  convertedJobId?: string;
  convertedJobNumber?: string;
  convertedRepairOrderId?: string;
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

    const enrichedReports = reports.map((r) => {
      const diodeMeta = (r.diodeMeasurement as any) || {};
      return {
        ...r,
        approvedByName: diodeMeta.approvedByName || r.reportBy || null,
        approvedDate: diodeMeta.approvedDate || null,
      };
    });

    return { success: true, data: enrichedReports };
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

    const diodeMeta = (report.diodeMeasurement as any) || {};
    const enriched = {
      ...report,
      approvedByName: diodeMeta.approvedByName || report.reportBy || null,
      approvedDate: diodeMeta.approvedDate || null,
    };

    return { success: true, data: enriched };
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
        diodeMeasurement: {
          ...(formData.diodeMeasurement || {}),
          approvedByName: formData.approvedByName || formData.reportBy || undefined,
          approvedDate: formData.approvedDate || undefined,
          ...(formData.hasInverterInCabinet !== undefined
            ? { hasInverter: formData.hasInverterInCabinet }
            : {}),
        } as any,
        powerInputVoltage: (formData.powerInputVoltage || {}) as any,
        powerOutputVoltage: (formData.powerOutputVoltage || {}) as any,
        panelComponentsCheck: (formData.panelComponentsCheck || []) as any,
        motorMeasurement: (formData.motorMeasurement || {}) as any,
        photos: (formData.photos || {}) as any,
        reportBy: formData.approvedByName || formData.reportBy || user?.fullName,
        status: formData.status || (formData.convertedJobNumber ? "CONVERTED_TO_RO" : "PENDING"),
        companyCode: formData.companyCode || "TG",
        equipmentType: formData.equipmentType || "INVERTER",
        convertedJobId: formData.convertedJobId || null,
        convertedJobNumber: formData.convertedJobNumber || null,
        convertedRepairOrderId: formData.convertedRepairOrderId || null,
      },
    });

    revalidatePath("/service/check-reports");
    revalidatePath("/service/dashboard");
    const createdDiodeMeta = (report.diodeMeasurement as any) || {};
    return {
      success: true,
      data: {
        ...report,
        approvedByName: createdDiodeMeta.approvedByName || report.reportBy || null,
        approvedDate: createdDiodeMeta.approvedDate || null,
      },
    };
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
        diodeMeasurement: {
          ...((formData.diodeMeasurement || existing.diodeMeasurement || {}) as any),
          approvedByName: formData.approvedByName !== undefined ? formData.approvedByName : ((existing.diodeMeasurement as any)?.approvedByName || existing.reportBy),
          approvedDate: formData.approvedDate !== undefined ? formData.approvedDate : (existing.diodeMeasurement as any)?.approvedDate,
          ...(formData.hasInverterInCabinet !== undefined
            ? { hasInverter: formData.hasInverterInCabinet }
            : {}),
        } as any,
        powerInputVoltage: (formData.powerInputVoltage || {}) as any,
        powerOutputVoltage: (formData.powerOutputVoltage || {}) as any,
        panelComponentsCheck: (formData.panelComponentsCheck || []) as any,
        motorMeasurement: (formData.motorMeasurement || {}) as any,
        photos: (formData.photos || {}) as any,
        reportBy: formData.approvedByName !== undefined ? formData.approvedByName : (formData.reportBy || existing.reportBy),
        status: formData.status || existing.status,
        companyCode: formData.companyCode || existing.companyCode,
        equipmentType: formData.equipmentType || existing.equipmentType || "INVERTER",
        convertedJobId: formData.convertedJobId !== undefined ? formData.convertedJobId : existing.convertedJobId,
        convertedJobNumber: formData.convertedJobNumber !== undefined ? formData.convertedJobNumber : existing.convertedJobNumber,
        convertedRepairOrderId: formData.convertedRepairOrderId !== undefined ? formData.convertedRepairOrderId : existing.convertedRepairOrderId,
      },
    });

    revalidatePath("/service/check-reports");
    revalidatePath(`/service/check-reports/${id}`);
    revalidatePath("/service/dashboard");
    const updatedDiodeMeta = (updated.diodeMeasurement as any) || {};
    return {
      success: true,
      data: {
        ...updated,
        approvedByName: updatedDiodeMeta.approvedByName || updated.reportBy || null,
        approvedDate: updatedDiodeMeta.approvedDate || null,
      },
    };
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

// In-memory cache for recent/search company results (TTL 60s)
const companySearchCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Get recent companies for instant dropdown display in check reports (0ms wait)
 */
export async function getRecentCompaniesForCheckReport() {
  const cacheKey = "__recent_companies__";
  const cached = companySearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const companies = await prisma.company.findMany({
      take: 30,
      orderBy: { updatedAt: "desc" },
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
          take: 5,
        },
      },
    });

    companySearchCache.set(cacheKey, { data: companies, timestamp: Date.now() });
    return companies;
  } catch (err) {
    console.error("Error fetching recent companies for check report:", err);
    return [];
  }
}

/**
 * Ultra-fast search companies for check report creation & editing
 * Targets companyName, taxId, and contact phone/name with in-memory caching
 */
export async function searchCompaniesForCheckReport(query: string) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim();
  const cacheKey = q.toLowerCase();

  const cached = companySearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const cleanDigits = q.replace(/\D/g, "");
  const isOnlyDigits = /^\d+$/.test(q);
  const isPhoneQuery = cleanDigits.length >= 3;

  try {
    const searchConditions: any[] = [];

    if (isOnlyDigits) {
      // Pure numbers: search taxId and contact mobile phone
      searchConditions.push({ taxId: { contains: q } });
      searchConditions.push({
        contacts: {
          some: {
            mobilePhone: { contains: cleanDigits },
          },
        },
      });
    } else {
      // Primary: Match company name (fastest, most common)
      searchConditions.push({
        companyName: { contains: q, mode: "insensitive" as const },
      });

      // Secondary: Phone match if includes digits
      if (isPhoneQuery) {
        searchConditions.push({
          contacts: {
            some: {
              mobilePhone: { contains: cleanDigits },
            },
          },
        });
      }

      // Secondary: Contact person name if query length >= 2
      if (q.length >= 2) {
        searchConditions.push({
          contacts: {
            some: {
              contactName: { contains: q, mode: "insensitive" as const },
            },
          },
        });
      }
    }

    const companies = await prisma.company.findMany({
      where: {
        OR: searchConditions,
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
          take: 5,
        },
      },
      take: 25,
      orderBy: { updatedAt: "desc" },
    });

    if (companySearchCache.size > 200) {
      const oldestKey = companySearchCache.keys().next().value;
      if (oldestKey) companySearchCache.delete(oldestKey);
    }
    companySearchCache.set(cacheKey, { data: companies, timestamp: Date.now() });

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

/**
 * Fast search Repair Orders (RO) to link to a Check Report
 */
export async function searchRepairOrdersForCheckReport(query: string = "") {
  try {
    const q = query.trim();
    const where: any = {};
    if (q) {
      where.OR = [
        { job: { jobNumber: { contains: q, mode: "insensitive" as const } } },
        { customerCompany: { contains: q, mode: "insensitive" as const } },
        { job: { customer: { contains: q, mode: "insensitive" as const } } },
        { senderName: { contains: q, mode: "insensitive" as const } },
        { phoneNumber: { contains: q, mode: "insensitive" as const } },
      ];
    }

    const orders = await prisma.repairOrder.findMany({
      where,
      include: {
        job: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return orders;
  } catch (err) {
    console.error("Error searching repair orders for check report:", err);
    return [];
  }
}

/**
 * Get single repair order with job details for populating check report
 */
export async function getRepairOrderForCheckReport(id: string) {
  try {
    const order = await prisma.repairOrder.findFirst({
      where: {
        OR: [
          { id },
          { jobId: id },
          { job: { jobNumber: id } },
        ],
      },
      include: {
        job: true,
      },
    });

    if (!order) {
      return { success: false, error: "ไม่พบข้อมูลใบรับซ่อม" };
    }

    return { success: true, data: order };
  } catch (err: any) {
    console.error("Error fetching repair order for check report:", err);
    return { success: false, error: err.message || "Failed to fetch repair order" };
  }
}


