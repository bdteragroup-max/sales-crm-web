"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export interface CreateClaimInput {
  department: "WAREHOUSE" | "QC" | "STORE" | "PRODUCTION" | "OTHER";
  reporterName: string;
  reporterPhone?: string;
  brand?: string;
  model: string;
  serialNumber?: string;
  nameplatePhotoUrl: string; // รูปเนมเพลทข้างตัวเครื่อง (S/N)
  symptoms: string; // อาการเสีย
  defectPhotos?: string[]; // รูปภาพความเสียหาย
  defectVideoUrl?: string; // วีดีโออาการเสีย
  equipmentType?: "INVERTER" | "CONTROL_CABINET" | "MOTOR" | "PUMP" | "OTHER";
  urgency?: "NORMAL" | "URGENT" | "CRITICAL";
  companyCode?: string;
  serviceNotes?: string;
}

// Generate Running Number e.g. CLM67-0001
export async function generateClaimNumber(dateInput?: Date | string): Promise<string> {
  const d = dateInput
    ? new Date(dateInput)
    : new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

  const beYear = (d.getFullYear() + 543).toString().slice(-2); // e.g. "67" or "69"
  const prefix = `CLM${beYear}-`;

  const existing = await prisma.serviceClaim.findMany({
    where: {
      claimNumber: {
        startsWith: prefix,
      },
    },
    select: { claimNumber: true },
    orderBy: { claimNumber: "desc" },
  });

  let maxSeq = 0;
  for (const item of existing) {
    const match = item.claimNumber.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

export async function createServiceClaim(input: CreateClaimInput) {
  try {
    const session = await getUser();
    const claimNumber = await generateClaimNumber();

    const claim = await prisma.serviceClaim.create({
      data: {
        claimNumber,
        department: input.department,
        reporterName: input.reporterName || session?.fullName || "เจ้าหน้าที่",
        reporterPhone: input.reporterPhone || "",
        brand: input.brand || "INVT",
        model: input.model.trim(),
        serialNumber: input.serialNumber?.trim() || "",
        nameplatePhotoUrl: input.nameplatePhotoUrl,
        symptoms: input.symptoms.trim(),
        defectPhotos: input.defectPhotos || [],
        defectVideoUrl: input.defectVideoUrl || null,
        equipmentType: input.equipmentType || "INVERTER",
        urgency: input.urgency || "NORMAL",
        companyCode: input.companyCode || "TG",
        status: "PENDING",
      },
    });

    revalidatePath("/service/claims");
    revalidatePath("/service/dashboard");

    return { success: true, data: claim };
  } catch (error: any) {
    console.error("Error creating ServiceClaim:", error);
    return { success: false, error: error.message || "Failed to create claim" };
  }
}

export async function getServiceClaims(params?: {
  search?: string;
  department?: string;
  status?: string;
  equipmentType?: string;
  urgency?: string;
}) {
  try {
    const where: any = {};

    if (params?.department && params.department !== "ALL") {
      where.department = params.department;
    }

    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params?.equipmentType && params.equipmentType !== "ALL") {
      where.equipmentType = params.equipmentType;
    }

    if (params?.urgency && params.urgency !== "ALL") {
      where.urgency = params.urgency;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { claimNumber: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { reporterName: { contains: q, mode: "insensitive" } },
        { symptoms: { contains: q, mode: "insensitive" } },
        { linkedCrNumber: { contains: q, mode: "insensitive" } },
        { linkedRoNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const claims = await prisma.serviceClaim.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: claims };
  } catch (error: any) {
    console.error("Error fetching ServiceClaims:", error);
    return { success: false, error: error.message || "Failed to fetch claims", data: [] };
  }
}

export async function getServiceClaimById(id: string) {
  try {
    const claim = await prisma.serviceClaim.findFirst({
      where: {
        OR: [{ id }, { claimNumber: id }],
      },
    });

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    return { success: true, data: claim };
  } catch (error: any) {
    console.error("Error fetching ServiceClaim by ID:", error);
    return { success: false, error: error.message || "Failed to fetch claim" };
  }
}

export async function updateServiceClaimStatus(
  id: string,
  update: {
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "ACCEPTED"
      | "REJECTED"
      | "CONVERTED_CR"
      | "CONVERTED_RO"
      | "CLOSED";
    serviceNotes?: string;
    serviceHandledBy?: string;
  }
) {
  try {
    const session = await getUser();
    const handledBy =
      update.serviceHandledBy || session?.fullName || session?.employeeId || "Service Technician";

    const updated = await prisma.serviceClaim.update({
      where: { id },
      data: {
        status: update.status,
        serviceNotes: update.serviceNotes,
        serviceHandledBy: handledBy,
        handledAt: new Date(),
      },
    });

    revalidatePath("/service/claims");
    revalidatePath(`/service/claims/${id}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating ServiceClaim status:", error);
    return { success: false, error: error.message || "Failed to update claim status" };
  }
}

export async function updateServiceClaim(id: string, data: Partial<CreateClaimInput>) {
  try {
    const updated = await prisma.serviceClaim.update({
      where: { id },
      data: {
        ...(data.department && { department: data.department }),
        ...(data.reporterName && { reporterName: data.reporterName }),
        ...(data.reporterPhone !== undefined && { reporterPhone: data.reporterPhone }),
        ...(data.brand && { brand: data.brand }),
        ...(data.model && { model: data.model.trim() }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber?.trim() }),
        ...(data.nameplatePhotoUrl && { nameplatePhotoUrl: data.nameplatePhotoUrl }),
        ...(data.symptoms && { symptoms: data.symptoms.trim() }),
        ...(data.defectPhotos && { defectPhotos: data.defectPhotos }),
        ...(data.defectVideoUrl !== undefined && { defectVideoUrl: data.defectVideoUrl }),
        ...(data.equipmentType && { equipmentType: data.equipmentType }),
        ...(data.urgency && { urgency: data.urgency }),
        ...(data.companyCode && { companyCode: data.companyCode }),
        ...(data.serviceNotes !== undefined && { serviceNotes: data.serviceNotes }),
      },
    });

    revalidatePath("/service/claims");
    revalidatePath(`/service/claims/${id}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating ServiceClaim:", error);
    return { success: false, error: error.message || "Failed to update claim" };
  }
}

export async function deleteServiceClaim(id: string) {
  try {
    await prisma.serviceClaim.delete({
      where: { id },
    });

    revalidatePath("/service/claims");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting ServiceClaim:", error);
    return { success: false, error: error.message || "Failed to delete claim" };
  }
}

// Convert Claim to InverterCheckReport (CR)
export async function convertClaimToCheckReport(claimId: string) {
  try {
    const claim = await prisma.serviceClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    const { generateCrNumber } = await import("@/app/actions/inverterCheckReports");
    const crNumber = await generateCrNumber();

    const photos: Record<string, string[]> = {
      nameplate: claim.nameplatePhotoUrl ? [claim.nameplatePhotoUrl] : [],
      inside: Array.isArray(claim.defectPhotos) ? (claim.defectPhotos as string[]) : [],
    };

    const cr = await prisma.inverterCheckReport.create({
      data: {
        crNumber,
        checkDate: new Date(),
        customerCompany: `แจ้งเคลมภายใน (${claim.department === "WAREHOUSE" ? "คลังสินค้า" : "ฝ่าย QC"})`,
        customerName: claim.reporterName,
        customerPhone: claim.reporterPhone || "",
        inverterBrand: claim.brand || "INVT",
        inverterModel: claim.model,
        serialNumber: claim.serialNumber || "",
        equipmentType: claim.equipmentType || "INVERTER",
        companyCode: claim.companyCode || "TG",
        symptoms: `[รับเรื่องจากแจ้งเคลม ${claim.claimNumber}]: ${claim.symptoms}`,
        photos,
        status: "PENDING",
      },
    });

    // Update claim status to CONVERTED_CR
    await prisma.serviceClaim.update({
      where: { id: claimId },
      data: {
        status: "CONVERTED_CR",
        linkedCrId: cr.id,
        linkedCrNumber: cr.crNumber,
        handledAt: new Date(),
      },
    });

    revalidatePath("/service/claims");
    revalidatePath(`/service/claims/${claimId}`);
    revalidatePath("/service/check-reports");

    return {
      success: true,
      data: {
        claimId,
        crId: cr.id,
        crNumber: cr.crNumber,
      },
    };
  } catch (error: any) {
    console.error("Error converting claim to Check Report:", error);
    return { success: false, error: error.message || "Failed to convert claim to CR" };
  }
}

export async function getPendingServiceClaimCount(): Promise<number> {
  try {
    const count = await prisma.serviceClaim.count({
      where: {
        status: { in: ["PENDING", "UNDER_REVIEW"] },
      },
    });
    return count;
  } catch (error) {
    console.error("Error fetching pending service claim count:", error);
    return 0;
  }
}

