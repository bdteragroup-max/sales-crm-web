"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyUsers } from "@/app/lib/pushNotification";

let extendedSchemaV2Initialized = false;

export async function ensureServiceCallExtendedSchema() {
  if (extendedSchemaV2Initialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ServiceCallLog"
        ADD COLUMN IF NOT EXISTS "internalCompany" TEXT DEFAULT 'TG',
        ADD COLUMN IF NOT EXISTS "siteAddress" TEXT,
        ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
        ADD COLUMN IF NOT EXISTS "onsiteDate" DATE,
        ADD COLUMN IF NOT EXISTS "onsiteResult" TEXT,
        ADD COLUMN IF NOT EXISTS "onsiteResultNote" TEXT,
        ADD COLUMN IF NOT EXISTS "partsUsed" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "photosBefore" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "photosAfter" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "sigTechnicianUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "nameTechnician" TEXT,
        ADD COLUMN IF NOT EXISTS "technicianPhone" TEXT,
        ADD COLUMN IF NOT EXISTS "sigCustomerUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "nameCustomer" TEXT,
        ADD COLUMN IF NOT EXISTS "customerPosition" TEXT,
        ADD COLUMN IF NOT EXISTS "assignedSalesId" TEXT,
        ADD COLUMN IF NOT EXISTS "assignedSalesName" TEXT,
        ADD COLUMN IF NOT EXISTS "assignedSalesAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "linkedQuotationId" TEXT,
        ADD COLUMN IF NOT EXISTS "linkedQuotationNo" TEXT,
        ADD COLUMN IF NOT EXISTS "linkedDeliveryId" TEXT,
        ADD COLUMN IF NOT EXISTS "linkedDeliveryNo" TEXT;
    `);
    extendedSchemaV2Initialized = true;
  } catch (err) {
    console.warn("[ServiceCallLog] ensureServiceCallExtendedSchema warning:", err);
  }
}

const serviceCallSchema = z.object({
  receivedDate: z.string().or(z.date()),
  companyName: z.string().min(1, "Company Name is required"),
  contactName: z.string().min(1, "Contact Name is required"),
  contactPhone: z.string().optional().nullable(),
  inverterModel: z.string().min(1, "Inverter Model is required"),
  reportedIssue: z.string().min(1, "Reported Issue is required"),
  responsibleId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalCompany: z.string().optional().nullable(),
  siteAddress: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
});

const serviceCallUpdateSchema = z.object({
  status: z.string().optional(),
  analyzedCause: z.string().optional().nullable(),
  recommendedSolution: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalCompany: z.string().optional().nullable(),
  siteAddress: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  onsiteDate: z.string().optional().nullable(),
  onsiteResult: z.string().optional().nullable(),
  onsiteResultNote: z.string().optional().nullable(),
  partsUsed: z.any().optional(),
  photosBefore: z.any().optional(),
  photosAfter: z.any().optional(),
  sigTechnicianUrl: z.string().optional().nullable(),
  nameTechnician: z.string().optional().nullable(),
  technicianPhone: z.string().optional().nullable(),
  sigCustomerUrl: z.string().optional().nullable(),
  nameCustomer: z.string().optional().nullable(),
  customerPosition: z.string().optional().nullable(),
  assignedSalesId: z.string().optional().nullable(),
  assignedSalesName: z.string().optional().nullable(),
});

export async function createServiceCallLog(data: z.infer<typeof serviceCallSchema>) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  await ensureServiceCallExtendedSchema();

  // Generate SV-YYYYMMDD-NNN
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  const latestCall = await prisma.serviceCallLog.findFirst({
    where: {
      caseNumber: {
        startsWith: `SV-${dateStr}-`,
      },
    },
    orderBy: {
      caseNumber: "desc",
    },
  });

  let nextNum = 1;
  if (latestCall) {
    const parts = latestCall.caseNumber.split("-");
    if (parts.length === 3) {
      nextNum = parseInt(parts[2], 10) + 1;
    }
  }
  const caseNumber = `SV-${dateStr}-${String(nextNum).padStart(3, "0")}`;

  const validated = serviceCallSchema.parse(data);

  const result = await prisma.serviceCallLog.create({
    data: {
      caseNumber,
      receivedDate: new Date(validated.receivedDate),
      companyName: validated.companyName,
      contactName: validated.contactName,
      contactPhone: validated.contactPhone,
      inverterModel: validated.inverterModel,
      reportedIssue: validated.reportedIssue,
      responsibleId: validated.responsibleId || null,
      notes: validated.notes,
      createdBy: user.id,
      status: "Received notification",
    },
  });

  // Save extended fields via raw SQL so even cached Prisma client works
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "ServiceCallLog"
       SET "internalCompany" = $1,
           "siteAddress" = $2,
           "serialNumber" = $3
       WHERE "id" = $4`,
      validated.internalCompany || "TG",
      validated.siteAddress || null,
      validated.serialNumber || null,
      result.id
    );
  } catch (e) {
    console.warn("[ServiceCallLog] Failed to update extended fields on create:", e);
  }

  // Notify Service Team & Responsible Person when a case is created
  try {
    const serviceUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: "service", mode: "insensitive" } },
          { role: { contains: "บริการ", mode: "insensitive" } },
          { role: { contains: "ซ่อม", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    const targetIds = new Set<string>(serviceUsers.map((u) => u.id));
    if (validated.responsibleId) {
      targetIds.add(validated.responsibleId);
    }
    targetIds.delete(user.id);

    if (targetIds.size > 0) {
      await notifyUsers(Array.from(targetIds), {
        title: `แจ้งปัญหาลูกค้าใหม่ (${caseNumber})`,
        body: `${validated.companyName} • รุ่น ${validated.inverterModel}: ${validated.reportedIssue} (แจ้งโดย ${user.fullName})`,
        url: `/service/calls/${result.id}`,
        category: "SERVICE_CALL_NEW",
      });
    }
  } catch (notifyErr) {
    console.warn("[ServiceCallLog] Failed to notify service team:", notifyErr);
  }

  revalidatePath("/service/calls");
  revalidatePath("/service-mgr/calls");
  return result;
}

export async function getServiceCallLogs(filters?: { status?: string; responsibleId?: string }) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  await ensureServiceCallExtendedSchema();

  const where: any = {};
  if (filters?.status && filters.status !== "ALL") where.status = filters.status;
  if (filters?.responsibleId && filters.responsibleId !== "ALL") where.responsibleId = filters.responsibleId;

  const logs = await prisma.serviceCallLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      responsible: { select: { fullName: true } },
      creator: { select: { fullName: true } },
    },
  });

  if (logs.length === 0) return [];

  try {
    const extRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        "id",
        "internalCompany",
        "siteAddress",
        "serialNumber",
        "onsiteDate",
        "onsiteResult",
        "onsiteResultNote",
        "partsUsed",
        "photosBefore",
        "photosAfter",
        "sigTechnicianUrl",
        "nameTechnician",
        "technicianPhone",
        "sigCustomerUrl",
        "nameCustomer",
        "customerPosition",
        "assignedSalesId",
        "assignedSalesName",
        "assignedSalesAt",
        "linkedQuotationId",
        "linkedQuotationNo",
        "linkedDeliveryId",
        "linkedDeliveryNo"
      FROM "ServiceCallLog"
    `);
    const extMap = new Map<string, any>();
    for (const r of extRows) {
      extMap.set(r.id, r);
    }
    return logs.map((l) => ({
      ...l,
      ...(extMap.get(l.id) || {}),
    }));
  } catch {
    return logs;
  }
}

export async function getServiceCallLogById(id: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  await ensureServiceCallExtendedSchema();

  const log = await prisma.serviceCallLog.findUnique({
    where: { id },
    include: {
      responsible: { select: { fullName: true, id: true, phoneNumber: true } },
      creator: { select: { fullName: true, id: true } },
    },
  });

  if (!log) throw new Error("Not found");

  try {
    const extRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT
        "internalCompany",
        "siteAddress",
        "serialNumber",
        "onsiteDate",
        "onsiteResult",
        "onsiteResultNote",
        "partsUsed",
        "photosBefore",
        "photosAfter",
        "sigTechnicianUrl",
        "nameTechnician",
        "technicianPhone",
        "sigCustomerUrl",
        "nameCustomer",
        "customerPosition",
        "assignedSalesId",
        "assignedSalesName",
        "assignedSalesAt",
        "linkedQuotationId",
        "linkedQuotationNo",
        "linkedDeliveryId",
        "linkedDeliveryNo"
      FROM "ServiceCallLog"
      WHERE "id" = $1`,
      id
    );
    if (extRows && extRows[0]) {
      return {
        ...log,
        ...extRows[0],
      };
    }
  } catch (e) {
    console.warn("[ServiceCallLog] Failed to read extended fields by id:", e);
  }

  return log;
}

export async function updateServiceCallLog(id: string, data: z.infer<typeof serviceCallUpdateSchema>) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  await ensureServiceCallExtendedSchema();

  const existing = await prisma.serviceCallLog.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const validated = serviceCallUpdateSchema.parse(data);

  const coreUpdateData: any = {};
  if (validated.status !== undefined) coreUpdateData.status = validated.status;
  if (validated.analyzedCause !== undefined) coreUpdateData.analyzedCause = validated.analyzedCause;
  if (validated.recommendedSolution !== undefined) coreUpdateData.recommendedSolution = validated.recommendedSolution;
  if (validated.followUpDate !== undefined) {
    coreUpdateData.followUpDate = validated.followUpDate ? new Date(validated.followUpDate) : null;
  }
  if (validated.responsibleId !== undefined) coreUpdateData.responsibleId = validated.responsibleId || null;
  if (validated.notes !== undefined) coreUpdateData.notes = validated.notes;

  const result = await prisma.serviceCallLog.update({
    where: { id },
    data: coreUpdateData,
  });

  // Update extended on-site report fields via parameterized raw SQL
  try {
    const curRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT
        "internalCompany",
        "siteAddress",
        "serialNumber",
        "onsiteDate",
        "onsiteResult",
        "onsiteResultNote",
        "partsUsed",
        "photosBefore",
        "photosAfter",
        "sigTechnicianUrl",
        "nameTechnician",
        "technicianPhone",
        "sigCustomerUrl",
        "nameCustomer",
        "customerPosition",
        "assignedSalesId",
        "assignedSalesName",
        "assignedSalesAt",
        "linkedQuotationId",
        "linkedQuotationNo",
        "linkedDeliveryId",
        "linkedDeliveryNo"
      FROM "ServiceCallLog"
      WHERE "id" = $1`,
      id
    );
    const cur = curRows?.[0] || {};

    const nextInternalCompany =
      validated.internalCompany !== undefined ? validated.internalCompany || "TG" : cur.internalCompany || "TG";
    const nextSiteAddress =
      validated.siteAddress !== undefined ? validated.siteAddress : cur.siteAddress ?? null;
    const nextSerialNumber =
      validated.serialNumber !== undefined ? validated.serialNumber : cur.serialNumber ?? null;
    const nextOnsiteDate =
      validated.onsiteDate !== undefined
        ? validated.onsiteDate
          ? new Date(validated.onsiteDate)
          : null
        : cur.onsiteDate ?? null;
    const nextOnsiteResult =
      validated.onsiteResult !== undefined ? validated.onsiteResult : cur.onsiteResult ?? null;
    const nextOnsiteResultNote =
      validated.onsiteResultNote !== undefined ? validated.onsiteResultNote : cur.onsiteResultNote ?? null;
    const nextPartsUsed =
      validated.partsUsed !== undefined ? validated.partsUsed : cur.partsUsed ?? [];
    const nextPhotosBefore =
      validated.photosBefore !== undefined ? validated.photosBefore : cur.photosBefore ?? [];
    const nextPhotosAfter =
      validated.photosAfter !== undefined ? validated.photosAfter : cur.photosAfter ?? [];
    const nextSigTech =
      validated.sigTechnicianUrl !== undefined ? validated.sigTechnicianUrl : cur.sigTechnicianUrl ?? null;
    const nextNameTech =
      validated.nameTechnician !== undefined ? validated.nameTechnician : cur.nameTechnician ?? null;
    const nextTechPhone =
      validated.technicianPhone !== undefined ? validated.technicianPhone : cur.technicianPhone ?? null;
    const nextSigCust =
      validated.sigCustomerUrl !== undefined ? validated.sigCustomerUrl : cur.sigCustomerUrl ?? null;
    const nextNameCust =
      validated.nameCustomer !== undefined ? validated.nameCustomer : cur.nameCustomer ?? null;
    const nextCustPos =
      validated.customerPosition !== undefined ? validated.customerPosition : cur.customerPosition ?? null;

    let nextAssignedSalesId =
      validated.assignedSalesId !== undefined ? validated.assignedSalesId || null : cur.assignedSalesId ?? null;
    let nextAssignedSalesName =
      validated.assignedSalesName !== undefined ? validated.assignedSalesName || null : cur.assignedSalesName ?? null;

    if (nextAssignedSalesId && (!nextAssignedSalesName || validated.assignedSalesId !== cur.assignedSalesId)) {
      const salesUser = await prisma.user.findUnique({
        where: { id: nextAssignedSalesId },
        select: { fullName: true },
      });
      if (salesUser) {
        nextAssignedSalesName = salesUser.fullName;
      }
    } else if (!nextAssignedSalesId) {
      nextAssignedSalesName = null;
    }

    const salesNewlyAssigned = Boolean(
      nextAssignedSalesId && nextAssignedSalesId !== cur.assignedSalesId
    );
    const statusJustClosed = Boolean(
      validated.status &&
        validated.status !== existing.status &&
        (validated.status === "System running smoothly" ||
          validated.status.includes("ปิดเคส") ||
          validated.status.includes("ปกติ"))
    );

    const nextAssignedSalesAt = salesNewlyAssigned
      ? new Date()
      : nextAssignedSalesId
      ? cur.assignedSalesAt || new Date()
      : null;

    await prisma.$executeRawUnsafe(
      `UPDATE "ServiceCallLog"
       SET "internalCompany" = $1,
           "siteAddress" = $2,
           "serialNumber" = $3,
           "onsiteDate" = $4,
           "onsiteResult" = $5,
           "onsiteResultNote" = $6,
           "partsUsed" = $7::jsonb,
           "photosBefore" = $8::jsonb,
           "photosAfter" = $9::jsonb,
           "sigTechnicianUrl" = $10,
           "nameTechnician" = $11,
           "technicianPhone" = $12,
           "sigCustomerUrl" = $13,
           "nameCustomer" = $14,
           "customerPosition" = $15,
           "assignedSalesId" = $16,
           "assignedSalesName" = $17,
           "assignedSalesAt" = $18
       WHERE "id" = $19`,
      nextInternalCompany,
      nextSiteAddress,
      nextSerialNumber,
      nextOnsiteDate,
      nextOnsiteResult,
      nextOnsiteResultNote,
      JSON.stringify(nextPartsUsed || []),
      JSON.stringify(nextPhotosBefore || []),
      JSON.stringify(nextPhotosAfter || []),
      nextSigTech,
      nextNameTech,
      nextTechPhone,
      nextSigCust,
      nextNameCust,
      nextCustPos,
      nextAssignedSalesId,
      nextAssignedSalesName,
      nextAssignedSalesAt,
      id
    );

    // Notify Assigned Salesperson to open Quotation
    if (nextAssignedSalesId && (salesNewlyAssigned || statusJustClosed)) {
      try {
        await notifyUsers([nextAssignedSalesId], {
          title: `งานเซอร์วิสส่งต่อเปิดใบเสนอราคา (${existing.caseNumber})`,
          body: `${existing.companyName} • รุ่น ${existing.inverterModel} ดำเนินการหน้างานเสร็จสิ้น กรุณาเปิดดูข้อมูลและทำใบเสนอราคา`,
          url: `/sales/service-handovers?caseId=${id}`,
          category: "SERVICE_CALL_TO_SALES",
        });
      } catch (notifyErr) {
        console.warn("[ServiceCallLog] Failed to notify assigned salesperson:", notifyErr);
      }
    }

    // If a RepairDelivery is already linked, keep its photos, signatures & details synced
    if (cur.linkedDeliveryId) {
      try {
        await syncRepairDeliveryFromServiceCall(id, cur.linkedQuotationId || undefined);
      } catch (syncErr) {
        console.warn("[ServiceCallLog] Auto-sync linked RepairDelivery warning:", syncErr);
      }
    }
  } catch (extErr) {
    console.error("[ServiceCallLog] Failed to update extended fields:", extErr);
  }

  revalidatePath(`/service/calls/${id}`);
  revalidatePath(`/service/calls/${id}/pdf`);
  revalidatePath("/service/calls");
  revalidatePath("/service-mgr/calls");
  revalidatePath("/sales");
  revalidatePath("/sales/service-handovers");
  return result;
}

/**
 * Automatically creates or updates a RepairDelivery (ใบส่งมอบงาน) from a ServiceCallLog + Quotation,
 * carrying over customer info, quotation number, technical details, Before/After photos, and Digital Signatures.
 */
export async function syncRepairDeliveryFromServiceCall(
  serviceCallId: string,
  quotationId?: string
): Promise<{
  success: boolean;
  repairDeliveryId?: string;
  deliveryNumber?: string;
  error?: string;
}> {
  try {
    await ensureServiceCallExtendedSchema();

    const serviceCall: any = await getServiceCallLogById(serviceCallId);
    if (!serviceCall) {
      return { success: false, error: "Service call not found" };
    }

    const targetQuotationId = quotationId || serviceCall.linkedQuotationId || null;
    let quotation: any = null;
    if (targetQuotationId) {
      quotation = await prisma.quotation.findUnique({
        where: { id: targetQuotationId },
        include: {
          company: true,
          contact: true,
          salesperson: true,
          jobs: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
    }

    const partsArr = Array.isArray(serviceCall.partsUsed) ? serviceCall.partsUsed : [];
    const partsText =
      partsArr.length > 0
        ? partsArr
            .map((p: any) => `${p.name || "-"}${p.qty ? ` (${p.qty} ${p.unit || "ชิ้น"})` : ""}`)
            .join(", ")
        : "";

    const photosBeforeArr = Array.isArray(serviceCall.photosBefore)
      ? serviceCall.photosBefore.filter(Boolean)
      : [];
    const photosAfterArr = Array.isArray(serviceCall.photosAfter)
      ? serviceCall.photosAfter.filter(Boolean)
      : [];

    const techName =
      serviceCall.nameTechnician ||
      serviceCall.responsible?.fullName ||
      serviceCall.responsibleName ||
      "";
    const techPhone =
      serviceCall.technicianPhone || serviceCall.responsible?.phoneNumber || "";

    const senderName =
      quotation?.salesperson?.fullName ||
      serviceCall.assignedSalesName ||
      techName ||
      "";
    const senderPhone = quotation?.salesperson?.phoneNumber || techPhone || "";

    const customerContactName =
      quotation?.contact?.contactName ||
      serviceCall.nameCustomer ||
      serviceCall.contactName ||
      "";
    const customerPosition =
      serviceCall.customerPosition || quotation?.contact?.position || "";

    const companyFullAddress = quotation?.company
      ? [
          quotation.company.address,
          quotation.company.subDistrict,
          quotation.company.district,
          quotation.company.province,
          quotation.company.postalCode,
        ]
          .filter(Boolean)
          .join(" ")
      : "";

    const inspectDetailsLines: string[] = [];
    if (serviceCall.reportedIssue) {
      inspectDetailsLines.push(`อาการที่แจ้ง: ${serviceCall.reportedIssue}`);
    }
    if (serviceCall.analyzedCause) {
      inspectDetailsLines.push(`สาเหตุที่พบ: ${serviceCall.analyzedCause}`);
    }

    const repairDetailsLines: string[] = [];
    if (serviceCall.recommendedSolution) {
      repairDetailsLines.push(`การดำเนินการแก้ไข: ${serviceCall.recommendedSolution}`);
    }
    if (partsText) {
      repairDetailsLines.push(`อะไหล่/วัสดุที่ใช้: ${partsText}`);
    }

    const hasSigned = Boolean(serviceCall.sigCustomerUrl || serviceCall.sigTechnicianUrl);

    const deliveryPayload: any = {
      internalCompany: serviceCall.internalCompany || "TG",
      company: quotation?.company?.companyName || serviceCall.companyName || "",
      jobId: quotation?.jobs?.[0]?.id || undefined,
      jobName:
        quotation?.jobs?.[0]?.item ||
        quotation?.subject ||
        `งานตรวจสอบ/บริการ Inverter รุ่น ${serviceCall.inverterModel || "-"}${
          serviceCall.serialNumber ? ` (S/N: ${serviceCall.serialNumber})` : ""
        } [${serviceCall.caseNumber}]`,
      customer: customerContactName,
      customerPosition: customerPosition,
      address: companyFullAddress || serviceCall.siteAddress || "",
      siteAddress: serviceCall.siteAddress || companyFullAddress || "",
      quotationNo: quotation?.quotationNumber || serviceCall.linkedQuotationNo || "",
      salespersonId: quotation?.salespersonId || serviceCall.assignedSalesId || null,
      sender: senderName,
      senderPhone: senderPhone,
      technician: techName,
      technicianPhone: techPhone,
      workInspect: true,
      workInspectDetails: inspectDetailsLines.join(" | ") || serviceCall.reportedIssue || "",
      workRepair: Boolean(repairDetailsLines.length > 0),
      workRepairDetails: repairDetailsLines.join(" | "),
      workInstall: false,
      workInstallDetails: "",
      workTraining: false,
      workTrainingDetails: "",
      workOther: serviceCall.onsiteResultNote || "",
      note: `อ้างอิงเคสเซอร์วิส: ${serviceCall.caseNumber}${
        serviceCall.notes ? ` • ${serviceCall.notes}` : ""
      }`,
      comments: serviceCall.onsiteResultNote || serviceCall.notes || "",
      photosBefore: photosBeforeArr,
      photosAfter: photosAfterArr,
      sigSenderUrl: serviceCall.sigTechnicianUrl || null,
      nameSender: techName || senderName,
      sigReceiverUrl: serviceCall.sigCustomerUrl || null,
      nameReceiver: serviceCall.nameCustomer || customerContactName,
      status: hasSigned ? "Completed" : "Draft",
    };

    const { createRepairDelivery, updateRepairDelivery } = await import(
      "@/app/actions/repairDeliveries"
    );

    let finalDeliveryId: string | undefined = serviceCall.linkedDeliveryId || undefined;
    let finalDeliveryNo: string | undefined = serviceCall.linkedDeliveryNo || undefined;

    if (finalDeliveryId) {
      const existingDelivery = await prisma.repairDelivery.findUnique({
        where: { id: finalDeliveryId },
        select: { id: true, deliveryNumber: true },
      });
      if (existingDelivery) {
        await updateRepairDelivery(existingDelivery.id, deliveryPayload);
        finalDeliveryNo = existingDelivery.deliveryNumber;
      } else {
        finalDeliveryId = undefined;
      }
    }

    if (!finalDeliveryId) {
      const createRes = await createRepairDelivery(
        quotation?.jobs?.[0]?.id || undefined,
        deliveryPayload
      );
      if (createRes.success && createRes.repairDeliveryId) {
        finalDeliveryId = createRes.repairDeliveryId;
        const createdDoc = await prisma.repairDelivery.findUnique({
          where: { id: finalDeliveryId },
          select: { deliveryNumber: true },
        });
        finalDeliveryNo = createdDoc?.deliveryNumber || undefined;
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "ServiceCallLog"
       SET "linkedQuotationId" = COALESCE($1, "linkedQuotationId"),
           "linkedQuotationNo" = COALESCE($2, "linkedQuotationNo"),
           "linkedDeliveryId" = COALESCE($3, "linkedDeliveryId"),
           "linkedDeliveryNo" = COALESCE($4, "linkedDeliveryNo")
       WHERE "id" = $5`,
      quotation?.id || targetQuotationId || null,
      quotation?.quotationNumber || null,
      finalDeliveryId || null,
      finalDeliveryNo || null,
      serviceCallId
    );

    revalidatePath("/repair-deliveries");
    revalidatePath(`/service/calls/${serviceCallId}`);
    revalidatePath("/service/calls");
    revalidatePath("/sales");
    revalidatePath("/sales/service-handovers");

    return {
      success: true,
      repairDeliveryId: finalDeliveryId,
      deliveryNumber: finalDeliveryNo,
    };
  } catch (err: any) {
    console.error("[syncRepairDeliveryFromServiceCall] error:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function getServiceHandoversForSales(userId?: string, isManagerOrAdmin?: boolean) {
  try {
    await ensureServiceCallExtendedSchema();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        s."id",
        s."caseNumber",
        s."receivedDate",
        s."updatedAt",
        s."companyName",
        s."contactName",
        s."contactPhone",
        s."inverterModel",
        s."serialNumber",
        s."siteAddress",
        s."reportedIssue",
        s."analyzedCause",
        s."recommendedSolution",
        s."status",
        s."responsibleName",
        s."notes",
        s."internalCompany",
        s."onsiteDate",
        s."onsiteResult",
        s."onsiteResultNote",
        s."partsUsed",
        s."photosBefore",
        s."photosAfter",
        s."sigTechnicianUrl",
        s."nameTechnician",
        s."technicianPhone",
        s."sigCustomerUrl",
        s."nameCustomer",
        s."customerPosition",
        s."assignedSalesId",
        s."assignedSalesName",
        s."assignedSalesAt",
        s."linkedQuotationId",
        s."linkedQuotationNo",
        s."linkedDeliveryId",
        s."linkedDeliveryNo"
      FROM "ServiceCallLog" s
      WHERE s."assignedSalesId" IS NOT NULL
      ORDER BY
        CASE WHEN s."linkedQuotationId" IS NULL THEN 0 ELSE 1 END ASC,
        s."assignedSalesAt" DESC NULLS LAST,
        s."updatedAt" DESC
      LIMIT 100
    `);

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const normalized = rows.map((r) => ({
      ...r,
      partsUsed: parseJsonArray(r.partsUsed),
      photosBefore: parseJsonArray(r.photosBefore),
      photosAfter: parseJsonArray(r.photosAfter),
    }));

    if (isManagerOrAdmin || !userId) {
      return normalized;
    }
    return normalized.filter((r) => r.assignedSalesId === userId);
  } catch (err) {
    console.warn("[getServiceHandoversForSales] warning:", err);
    return [];
  }
}

export async function getPendingServiceCallsForSales(userId?: string, isManagerOrAdmin?: boolean) {
  const all = await getServiceHandoversForSales(userId, isManagerOrAdmin);
  return all.filter((r) => !r.linkedQuotationId).slice(0, 25);
}

export async function getPendingServiceHandoverCount(): Promise<number> {
  try {
    const user = await getUser();
    if (!user) return 0;
    const roleStr = (user.role || "").toLowerCase();
    const isSuperOrMgr =
      user.role === "SUPER_ADMIN" ||
      user.role === "ผู้จัดการ" ||
      roleStr.includes("manager") ||
      roleStr.includes("ผู้จัดการ");
    const pending = await getPendingServiceCallsForSales(user.id, isSuperOrMgr);
    return pending.length;
  } catch {
    return 0;
  }
}

export async function getOpenServiceCallCount(): Promise<number> {
  try {
    const stats = await getServiceCallDashboardStats();
    return stats.openCount || 0;
  } catch {
    return 0;
  }
}

export async function getServiceCallDashboardStats() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const allLogs = await prisma.serviceCallLog.findMany({ select: { status: true } });

  let openCount = 0;
  let closedCount = 0;

  for (const log of allLogs) {
    const isClosed =
      log.status?.includes("smoothly") ||
      log.status?.includes("Customer has not yet made changes") ||
      log.status?.includes("ปกติ") ||
      log.status?.includes("ปิดเคส") ||
      log.status?.includes("ระบบเดินได้เรียบร้อย") ||
      log.status?.includes("ลูกค้ายังไม่แก้ไข");

    if (isClosed) {
      closedCount++;
    } else {
      openCount++;
    }
  }

  const totalCount = allLogs.length;

  return { openCount, closedCount, totalCount };
}

export async function importServiceCallsPreview(records: any[]) {
  const user = await getUser();
  if (
    !user ||
    (user.role !== "Service Engineer MGR" &&
      user.role !== "Service Engineer MGR." &&
      user.role !== "SUPER_ADMIN")
  )
    throw new Error("Unauthorized");

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true },
  });

  const results = records.map((record) => {
    let matchedUser = null;
    const respName = record.responsibleName ? String(record.responsibleName).trim() : null;

    if (respName) {
      matchedUser = users.find(
        (u) =>
          u.fullName.toLowerCase().includes(respName.toLowerCase()) ||
          respName.toLowerCase().includes(u.fullName.toLowerCase())
      );
    }

    return {
      ...record,
      matchedUserId: matchedUser?.id || null,
      matchedUserName: matchedUser?.fullName || null,
    };
  });

  return results;
}

export async function importServiceCallsCommit(records: any[]) {
  const user = await getUser();
  if (
    !user ||
    (user.role !== "Service Engineer MGR" &&
      user.role !== "Service Engineer MGR." &&
      user.role !== "SUPER_ADMIN")
  )
    throw new Error("Unauthorized");

  const legacyNos = records.map((r) => Number(r.legacyNo)).filter((n) => !isNaN(n));
  const existing = await prisma.serviceCallLog.findMany({
    where: { legacyNo: { in: legacyNos } },
    select: { legacyNo: true },
  });
  const existingSet = new Set(existing.map((e) => e.legacyNo));

  const toImport = records.filter((r) => !existingSet.has(Number(r.legacyNo)));

  if (toImport.length === 0) return { count: 0 };

  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  const latestCall = await prisma.serviceCallLog.findFirst({
    where: { caseNumber: { startsWith: `SV-${dateStr}-` } },
    orderBy: { caseNumber: "desc" },
  });

  let nextNum = 1;
  if (latestCall) {
    const parts = latestCall.caseNumber.split("-");
    if (parts.length === 3) nextNum = parseInt(parts[2], 10) + 1;
  }

  const dataToInsert = toImport.map((r, idx) => {
    const caseNumber = `SV-${dateStr}-${String(nextNum + idx).padStart(3, "0")}`;

    let receivedDate = new Date();
    if (r.receivedDate) {
      const parsed = new Date(r.receivedDate);
      if (!isNaN(parsed.getTime())) receivedDate = parsed;
    }

    const isClosed = r.status?.includes("ปกติ") || r.status === "System running smoothly";

    return {
      caseNumber,
      legacyNo: Number(r.legacyNo) || null,
      receivedDate,
      companyName: r.companyName || "Unknown",
      contactName: r.contactName || "Unknown",
      contactPhone: r.contactPhone || null,
      inverterModel: r.inverterModel || "Unknown",
      reportedIssue: r.reportedIssue || "Unknown",
      analyzedCause: r.analyzedCause || null,
      recommendedSolution: r.recommendedSolution || null,
      status: r.status || "Received notification",
      responsibleId: r.matchedUserId || null,
      responsibleName: r.responsibleName || null,
      notes: r.notes || null,
      createdBy: user.id,
      followUpDate: isClosed ? null : null,
    };
  });

  const result = await prisma.serviceCallLog.createMany({
    data: dataToInsert,
    skipDuplicates: true,
  });

  revalidatePath("/service/calls");
  revalidatePath("/service-mgr/calls");

  return result;
}

export async function getServiceUsers() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  const rawUsers = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      role: true,
      employeeSale: { select: { nickname: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return rawUsers.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    role: u.role,
    nickname: u.employeeSale?.nickname || null,
  }));
}

export async function deleteServiceCallLog(id: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const roleLower = (user.role || "").toLowerCase();
  const isMgrOrAdmin =
    user.role === "Service Engineer MGR" ||
    user.role === "Service Engineer MGR." ||
    user.role === "SUPER_ADMIN" ||
    user.role === "Admin" ||
    user.role === "ADMIN" ||
    roleLower.includes("manager") ||
    roleLower.includes("ผู้จัดการ") ||
    roleLower.includes("service") ||
    roleLower.includes("บริการ");

  if (!isMgrOrAdmin) {
    throw new Error("เฉพาะฝ่ายบริการ ผู้จัดการ หรือผู้ดูแลระบบเท่านั้นที่สามารถลบเคสได้");
  }

  const result = await prisma.serviceCallLog.delete({
    where: { id },
  });

  revalidatePath("/service/calls");
  revalidatePath("/service-mgr/calls");
  return { success: true, data: result };
}
