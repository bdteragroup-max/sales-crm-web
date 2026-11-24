"use server";

import prisma from "@/app/lib/db";
import type { Prisma } from "@/generated/client/client";
import { revalidatePath } from "next/cache";
import { getUser } from "@/app/lib/dal";
import { isReadOnlyExecutive, isSuperUser } from "@/app/lib/roleHelper";
import { translateSunwaysBundle } from "@/app/actions/translateReport";
import {
  createDefaultMpptRows,
  extractTextBundleFromRecord,
  normalizeTextBundle,
  type SunwaysBilingualData,
  type SunwaysCompanyOption,
  type SunwaysLang,
  type SunwaysMpptRow,
  type SunwaysReportPayload,
  type SunwaysTextBundle,
} from "@/app/lib/sunwaysReportConfig";

const VALID_STATUSES = new Set(["DRAFT", "COMPLETED", "SUBMITTED"]);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function canWriteSunwaysReport(role: string | null | undefined): boolean {
  if (!role) return false;
  if (isReadOnlyExecutive(role)) return false;
  if (isSuperUser(role)) return true;

  const r = role.toLowerCase().trim();
  return [
    "service",
    "บริการ",
    "ซ่อม",
    "เซอร์วิส",
    "technician",
    "ช่าง",
    "project",
    "โปรเจค",
    "โปรเจกต์",
    "engineering",
    "วิศวกร",
    "manager",
    "ผู้จัดการ",
    "admin",
    "อื่นๆ",
  ].some((kw) => r.includes(kw));
}

function canDeleteSunwaysReport(
  role: string | null | undefined,
  userId: string,
  createdById: string | null
): boolean {
  if (!role) return false;
  if (isSuperUser(role)) return true;
  const r = role.toLowerCase();
  if (
    r.includes("service") &&
    (r.includes("mgr") || r.includes("manager") || r.includes("ผู้จัดการ"))
  ) {
    return true;
  }
  return Boolean(createdById && createdById === userId);
}

function normalizeMpptRows(rows: unknown): SunwaysMpptRow[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return createDefaultMpptRows(12);
  }
  return rows.map((rawRow, idx: number) => {
    const row = (rawRow && typeof rawRow === "object" ? rawRow : {}) as Record<string, unknown>;
    return {
      mppt:
        typeof row.mppt === "string" && row.mppt.trim()
          ? row.mppt
          : `MPPT ${idx + 1}`,
      dcVoltage: typeof row.dcVoltage === "string" ? row.dcVoltage : "",
      dcCurrent: typeof row.dcCurrent === "string" ? row.dcCurrent : "",
      stringsPv: typeof row.stringsPv === "string" ? row.stringsPv : "",
    };
  });
}

function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function normalizePayload(payload: SunwaysReportPayload) {
  const defaultLang: SunwaysLang = payload.defaultLang === "EN" ? "EN" : "TH";
  const th = normalizeTextBundle(
    payload.bilingualData?.th || (defaultLang === "TH" ? payload.active : undefined)
  );
  const en = normalizeTextBundle(
    payload.bilingualData?.en || (defaultLang === "EN" ? payload.active : undefined)
  );
  const active = normalizeTextBundle(
    payload.active || (defaultLang === "EN" ? en : th)
  );

  // Ensure the active language slot in bilingualData stays synchronized with active fields
  if (defaultLang === "TH") {
    Object.assign(th, active);
  } else {
    Object.assign(en, active);
  }

  const bilingualData: SunwaysBilingualData = {
    th,
    en,
    portalImages: normalizeStringArray(payload.bilingualData?.portalImages),
    backupImages: normalizeStringArray(payload.bilingualData?.backupImages),
  };

  const mpptRows = normalizeMpptRows(payload.mpptRows);
  const installationImages = normalizeStringArray(payload.installationImages);
  const status = VALID_STATUSES.has(payload.status) ? payload.status : "DRAFT";

  return {
    defaultLang,
    status,
    active,
    bilingualData,
    mpptRows,
    installationImages,
  };
}

/**
 * Generate Sunways Report Number: SW{BE_YY}-{MM}{DD} or SW{BE_YY}-{MM}{DD}-01...
 */
export async function generateSunwaysReportNumber(dateInput?: string): Promise<string> {
  const d = dateInput
    ? new Date(dateInput)
    : new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const beYear = (validDate.getFullYear() + 543).toString().slice(-2);
  const month = String(validDate.getMonth() + 1).padStart(2, "0");
  const day = String(validDate.getDate()).padStart(2, "0");
  const baseNumber = `SW${beYear}-${month}${day}`;

  const existing = await prisma.sunwaysReport.findMany({
    where: {
      reportNumber: { startsWith: baseNumber },
    },
    select: { reportNumber: true },
  });

  if (!existing || existing.length === 0) {
    return baseNumber;
  }

  let maxSeq = 0;
  for (const item of existing) {
    if (item.reportNumber === baseNumber && maxSeq === 0) {
      maxSeq = 1;
    }
    const match = item.reportNumber.match(new RegExp(`^${baseNumber}-(\\d+)$`));
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  return `${baseNumber}-${String(maxSeq + 1).padStart(2, "0")}`;
}

export async function getSunwaysReports(params?: {
  search?: string;
  status?: string;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Unauthorized", data: [] };
    }

    const where: Prisma.SunwaysReportWhereInput = {};
    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { reportNumber: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { plantName: { contains: q, mode: "insensitive" } },
        { inverterModel: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { communicationPerson: { contains: q, mode: "insensitive" } },
        { faultObserved: { contains: q, mode: "insensitive" } },
        { inspectorName: { contains: q, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.sunwaysReport.findMany({
      where,
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(reports)),
    };
  } catch (error: unknown) {
    console.error("Error fetching SunwaysReports:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch Sunways reports"),
      data: [],
    };
  }
}

export async function getSunwaysReportById(id: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const report = await prisma.sunwaysReport.findFirst({
      where: {
        OR: [{ id }, { reportNumber: id }],
      },
    });

    if (!report) {
      return { success: false, error: "Sunways report not found" };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(report)),
    };
  } catch (error: unknown) {
    console.error("Error fetching SunwaysReport:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch report"),
    };
  }
}

export async function createSunwaysReport(payload: SunwaysReportPayload) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }
    if (!canWriteSunwaysReport(user.role)) {
      return { success: false, error: "คุณไม่มีสิทธิ์สร้างรายงานตรวจเช็ค Sunways" };
    }

    const normalized = normalizePayload(payload);
    let reportNumber = payload.reportNumber?.trim();
    if (!reportNumber) {
      reportNumber = await generateSunwaysReportNumber(payload.reportDate);
    }

    const duplicate = await prisma.sunwaysReport.findUnique({
      where: { reportNumber },
      select: { id: true },
    });
    if (duplicate) {
      return {
        success: false,
        error: `เลขที่เอกสาร ${reportNumber} มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น`,
      };
    }

    const { active, bilingualData, mpptRows, installationImages, status, defaultLang } = normalized;
    const reportDate = payload.reportDate ? new Date(payload.reportDate) : new Date();

    const created = await prisma.sunwaysReport.create({
      data: {
        reportNumber,
        reportDate: Number.isNaN(reportDate.getTime()) ? new Date() : reportDate,
        status,
        defaultLang,
        companyName: active.companyName || null,
        communicationPerson: active.communicationPerson || null,
        contactDetail: active.contactDetail || null,
        plantName: active.plantName || null,
        country: active.country || null,
        plantCapacity: active.plantCapacity || null,
        inverterModel: active.inverterModel || null,
        serialNumber: active.serialNumber || null,
        firmwareVersion: active.firmwareVersion || null,
        countryCode: active.countryCode || null,
        dataloggerSn: active.dataloggerSn || null,
        externalDataloggerDetails: active.externalDataloggerDetails || null,
        faultObserved: active.faultObserved || null,
        installationImages: installationImages as unknown as Prisma.InputJsonValue,
        dataloggerSoftwareVersion: active.dataloggerSoftwareVersion || null,
        portalFaultObserved: active.portalFaultObserved || null,
        inspectionItems: {
          cablesSpec: active.cablesSpec,
          acMeasurement: active.acMeasurement,
          pvModuleWp: active.pvModuleWp,
          results: active.inspectionResults,
        } as unknown as Prisma.InputJsonValue,
        mpptRows: mpptRows as unknown as Prisma.InputJsonValue,
        fanCheck: active.fanCheck as unknown as Prisma.InputJsonValue,
        backupDataObservation: active.backupDataObservation || null,
        otherRemarks: active.otherRemarks || null,
        bilingualData: bilingualData as unknown as Prisma.InputJsonValue,
        inspectorName: active.inspectorName || user.fullName || null,
        createdById: user.id,
        createdByName: user.fullName || null,
        updatedByName: user.fullName || null,
      },
    });

    revalidatePath("/service/sunways-reports");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(created)),
    };
  } catch (error: unknown) {
    console.error("Error creating SunwaysReport:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create report"),
    };
  }
}

export async function updateSunwaysReport(id: string, payload: SunwaysReportPayload) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }
    if (!canWriteSunwaysReport(user.role)) {
      return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขรายงานตรวจเช็ค Sunways" };
    }

    const existing = await prisma.sunwaysReport.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูลรายงานที่ต้องการแก้ไข" };
    }

    const normalized = normalizePayload(payload);
    const { active, bilingualData, mpptRows, installationImages, status, defaultLang } = normalized;
    const reportDate = payload.reportDate ? new Date(payload.reportDate) : existing.reportDate;

    const updated = await prisma.sunwaysReport.update({
      where: { id },
      data: {
        reportDate: Number.isNaN(reportDate.getTime()) ? existing.reportDate : reportDate,
        status,
        defaultLang,
        companyName: active.companyName || null,
        communicationPerson: active.communicationPerson || null,
        contactDetail: active.contactDetail || null,
        plantName: active.plantName || null,
        country: active.country || null,
        plantCapacity: active.plantCapacity || null,
        inverterModel: active.inverterModel || null,
        serialNumber: active.serialNumber || null,
        firmwareVersion: active.firmwareVersion || null,
        countryCode: active.countryCode || null,
        dataloggerSn: active.dataloggerSn || null,
        externalDataloggerDetails: active.externalDataloggerDetails || null,
        faultObserved: active.faultObserved || null,
        installationImages: installationImages as unknown as Prisma.InputJsonValue,
        dataloggerSoftwareVersion: active.dataloggerSoftwareVersion || null,
        portalFaultObserved: active.portalFaultObserved || null,
        inspectionItems: {
          cablesSpec: active.cablesSpec,
          acMeasurement: active.acMeasurement,
          pvModuleWp: active.pvModuleWp,
          results: active.inspectionResults,
        } as unknown as Prisma.InputJsonValue,
        mpptRows: mpptRows as unknown as Prisma.InputJsonValue,
        fanCheck: active.fanCheck as unknown as Prisma.InputJsonValue,
        backupDataObservation: active.backupDataObservation || null,
        otherRemarks: active.otherRemarks || null,
        bilingualData: bilingualData as unknown as Prisma.InputJsonValue,
        inspectorName: active.inspectorName || existing.inspectorName || null,
        updatedByName: user.fullName || null,
      },
    });

    revalidatePath("/service/sunways-reports");
    revalidatePath(`/service/sunways-reports/${id}/edit`);
    revalidatePath(`/service/sunways-reports/${id}/print`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error: unknown) {
    console.error("Error updating SunwaysReport:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update report"),
    };
  }
}

export async function deleteSunwaysReport(id: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }

    const existing = await prisma.sunwaysReport.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูลรายงานที่ต้องการลบ" };
    }

    if (!canDeleteSunwaysReport(user.role, user.id, existing.createdById)) {
      return {
        success: false,
        error: "เฉพาะผู้สร้างรายงาน ผู้จัดการฝ่ายบริการ หรือผู้ดูแลระบบเท่านั้นที่ลบได้",
      };
    }

    await prisma.sunwaysReport.delete({ where: { id } });
    revalidatePath("/service/sunways-reports");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting SunwaysReport:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete report"),
    };
  }
}

export async function translateSavedSunwaysReport(
  id: string,
  targetLang: SunwaysLang,
  saveToDb = true
): Promise<{ success: boolean; bundle?: SunwaysTextBundle; error?: string }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const report = await prisma.sunwaysReport.findUnique({ where: { id } });
    if (!report) {
      return { success: false, error: "Sunways report not found" };
    }

    const sourceLang: SunwaysLang = report.defaultLang === "EN" ? "EN" : "TH";
    const sourceBundle = extractTextBundleFromRecord(
      report as unknown as Record<string, unknown>,
      sourceLang
    );
    const trRes = await translateSunwaysBundle(sourceBundle, targetLang);
    if (!trRes.success || !trRes.data) {
      return { success: false, error: trRes.error || "Translation failed" };
    }

    if (saveToDb && canWriteSunwaysReport(user.role)) {
      const existingBilingual =
        (report.bilingualData as Partial<SunwaysBilingualData> | null) || {};
      const updatedBilingual: SunwaysBilingualData = {
        th:
          targetLang === "TH"
            ? trRes.data
            : normalizeTextBundle(existingBilingual.th || sourceBundle),
        en:
          targetLang === "EN"
            ? trRes.data
            : normalizeTextBundle(existingBilingual.en || sourceBundle),
        portalImages: normalizeStringArray(existingBilingual.portalImages),
        backupImages: normalizeStringArray(existingBilingual.backupImages),
      };

      await prisma.sunwaysReport.update({
        where: { id },
        data: {
          bilingualData: updatedBilingual as unknown as Prisma.InputJsonValue,
          updatedByName: user.fullName || null,
        },
      });
      revalidatePath(`/service/sunways-reports/${id}/print`);
    }

    return { success: true, bundle: trRes.data };
  } catch (error: unknown) {
    console.error("Error translating saved Sunways report:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Translation failed"),
    };
  }
}

export async function getSunwaysCompanySuggestions(
  query?: string
): Promise<{ success: boolean; data: SunwaysCompanyOption[]; error?: string }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, data: [], error: "Unauthorized" };
    }

    const q = (query || "").trim();
    const cleanDigits = q.replace(/\D/g, "");
    const where: Prisma.CompanyWhereInput = {};

    if (q) {
      const orConditions: Prisma.CompanyWhereInput[] = [
        { companyName: { contains: q, mode: "insensitive" } },
        { taxId: { contains: q } },
        {
          contacts: {
            some: {
              contactName: { contains: q, mode: "insensitive" },
            },
          },
        },
      ];
      if (cleanDigits.length >= 3) {
        orConditions.push({
          contacts: {
            some: {
              mobilePhone: { contains: cleanDigits },
            },
          },
        });
      }
      where.OR = orConditions;
    }

    const companies = await prisma.company.findMany({
      where,
      take: 25,
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
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
            email: true,
          },
          take: 6,
        },
      },
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(companies)) as SunwaysCompanyOption[],
    };
  } catch (error: unknown) {
    console.error("Error searching companies for Sunways:", error);
    return {
      success: false,
      data: [],
      error: getErrorMessage(error, "ไม่สามารถดึงรายชื่อลูกค้าได้"),
    };
  }
}

export async function quickCreateCompanyForSunways(input: {
  companyName: string;
  contactName?: string;
  contactDetail?: string;
}): Promise<{
  success: boolean;
  data?: SunwaysCompanyOption;
  alreadyExists?: boolean;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }
    if (!canWriteSunwaysReport(user.role)) {
      return { success: false, error: "คุณไม่มีสิทธิ์เพิ่มข้อมูลลูกค้า" };
    }

    const cleanName = (input.companyName || "").trim();
    if (!cleanName) {
      return { success: false, error: "กรุณาระบุชื่อบริษัทหรือชื่อลูกค้า" };
    }

    const existing = await prisma.company.findFirst({
      where: {
        companyName: { equals: cleanName, mode: "insensitive" },
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
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
            email: true,
          },
          take: 6,
        },
      },
    });

    if (existing) {
      return {
        success: true,
        alreadyExists: true,
        data: JSON.parse(JSON.stringify(existing)) as SunwaysCompanyOption,
      };
    }

    const contactName = (input.contactName || "").trim();
    const rawDetail = (input.contactDetail || "").trim();
    const emailMatch = rawDetail.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    const extractedEmail = emailMatch ? emailMatch[0] : "";
    const extractedPhone = rawDetail
      .replace(extractedEmail, "")
      .replace(/[/,|]+/g, " ")
      .trim();

    const created = await prisma.company.create({
      data: {
        companyName: cleanName,
        assignedUserId: user.id,
        ...(contactName || rawDetail
          ? {
              contacts: {
                create: {
                  contactName: contactName || cleanName,
                  mobilePhone: extractedPhone || (!extractedEmail ? rawDetail : null),
                  email: extractedEmail || null,
                },
              },
            }
          : {}),
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
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
            email: true,
          },
          take: 6,
        },
      },
    });

    revalidatePath("/clients");
    return {
      success: true,
      alreadyExists: false,
      data: JSON.parse(JSON.stringify(created)) as SunwaysCompanyOption,
    };
  } catch (error: unknown) {
    console.error("Error quick-creating company from Sunways:", error);
    return {
      success: false,
      error: getErrorMessage(error, "ไม่สามารถบันทึกชื่อบริษัทใหม่ลงฐานข้อมูลได้"),
    };
  }
}
