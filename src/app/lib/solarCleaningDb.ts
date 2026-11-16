import crypto from 'node:crypto';
import prisma from '@/app/lib/db';
import { Prisma } from '@/generated/client';
import {
  getNeededManagerSigners,
  normalizeReportData,
  normalizeWorkItems,
  type SolarCleaningRecord,
} from '@/app/lib/solarCleaningConfig';

type PrismaDelegateClient = typeof prisma;

export interface SolarCleaningWritePayload {
  docNumber?: string;
  companyCode: string;
  status: string;
  projectId: string | null;
  projectName: string;
  location: string | null;
  customerName: string;
  customerPhone: string | null;
  inspectorNames: string | null;
  systemSizeKwp: string | null;
  inspectionRound: string | null;
  inspectionDate: Date;
  reportDate: Date | null;

  projectTypes: string[];
  projectTypeOther: string | null;
  jobTypes: string[];
  jobTypeOther: string | null;
  workItems: unknown;
  additionalDetail: string | null;
  checkInCustomerSignUrl: string | null;
  checkInCustomerName: string | null;
  checkInAt: Date | null;
  checkOutCustomerSignUrl: string | null;
  checkOutCustomerName: string | null;
  checkOutAt: Date | null;
  inspectorSignUrl: string | null;
  inspectorSignerName: string | null;

  reportTitle: string;
  reportData: unknown;
  overallResult: string;
  projectMgrSignUrl: string | null;
  projectMgrId: string | null;
  projectMgrName: string | null;
  projectMgrSignedAt: Date | null;
  serviceMgrSignUrl: string | null;
  serviceMgrId: string | null;
  serviceMgrName: string | null;
  serviceMgrSignedAt: Date | null;
  createdById?: string;
  updatedById: string;
}

interface RawInspectionRow {
  id: string;
  doc_number: string;
  company_code: string;
  status: string;
  project_id: string | null;
  project_name: string;
  location: string | null;
  customer_name: string;
  customer_phone: string | null;
  inspector_names: string | null;
  system_size_kwp: string | null;
  inspection_round: string | null;
  inspection_date: Date | string;
  report_date: Date | string | null;
  project_types: string[] | null;
  project_type_other: string | null;
  job_types: string[] | null;
  job_type_other: string | null;
  work_items: unknown;
  additional_detail: string | null;
  checkin_customer_sign_url: string | null;
  checkin_customer_name: string | null;
  checkin_at: Date | string | null;
  checkout_customer_sign_url: string | null;
  checkout_customer_name: string | null;
  checkout_at: Date | string | null;
  inspector_sign_url: string | null;
  inspector_signer_name: string | null;
  report_title: string | null;
  report_data: unknown;
  overall_result: string;
  project_mgr_sign_url: string | null;
  project_mgr_id: string | null;
  project_mgr_name: string | null;
  project_mgr_signed_at: Date | string | null;
  service_mgr_sign_url: string | null;
  service_mgr_id: string | null;
  service_mgr_name: string | null;
  service_mgr_signed_at: Date | string | null;
  created_by_id: string;
  updated_by_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  creator_full_name?: string | null;
  creator_role?: string | null;
  pm_full_name?: string | null;
  pm_role?: string | null;
  sm_full_name?: string | null;
  sm_role?: string | null;
  proj_number?: string | null;
  proj_name?: string | null;
  proj_client_name?: string | null;
  proj_site_address?: string | null;
}

function hasDelegate(client: PrismaDelegateClient = prisma): boolean {
  return Boolean(
    client &&
      typeof (client as unknown as Record<string, unknown>).solarCleaningInspection === 'object' &&
      (client as unknown as Record<string, unknown>).solarCleaningInspection !== null
  );
}

function toIsoString(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? String(val) : parsed.toISOString();
}

function mapRawRowToRecord(row: RawInspectionRow): SolarCleaningRecord {
  return {
    id: row.id,
    docNumber: row.doc_number,
    companyCode: row.company_code,
    status: row.status,
    projectId: row.project_id,
    projectName: row.project_name,
    location: row.location,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    inspectorNames: row.inspector_names,
    systemSizeKwp: row.system_size_kwp,
    inspectionRound: row.inspection_round,
    inspectionDate: toIsoString(row.inspection_date) || new Date().toISOString(),
    reportDate: toIsoString(row.report_date),
    projectTypes: Array.isArray(row.project_types) ? row.project_types : [],
    projectTypeOther: row.project_type_other,
    jobTypes: Array.isArray(row.job_types) ? row.job_types : [],
    jobTypeOther: row.job_type_other,
    workItems: normalizeWorkItems(row.work_items),
    additionalDetail: row.additional_detail,
    checkInCustomerSignUrl: row.checkin_customer_sign_url,
    checkInCustomerName: row.checkin_customer_name,
    checkInAt: toIsoString(row.checkin_at),
    checkOutCustomerSignUrl: row.checkout_customer_sign_url,
    checkOutCustomerName: row.checkout_customer_name,
    checkOutAt: toIsoString(row.checkout_at),
    inspectorSignUrl: row.inspector_sign_url,
    inspectorSignerName: row.inspector_signer_name,
    reportTitle: row.report_title,
    reportData: normalizeReportData(row.report_data),
    overallResult: row.overall_result === 'NOT_PASS' ? 'NOT_PASS' : 'PASS',
    projectMgrSignUrl: row.project_mgr_sign_url,
    projectMgrId: row.project_mgr_id,
    projectMgrName: row.project_mgr_name,
    projectMgrSignedAt: toIsoString(row.project_mgr_signed_at),
    serviceMgrSignUrl: row.service_mgr_sign_url,
    serviceMgrId: row.service_mgr_id,
    serviceMgrName: row.service_mgr_name,
    serviceMgrSignedAt: toIsoString(row.service_mgr_signed_at),
    createdById: row.created_by_id,
    updatedById: row.updated_by_id,
    createdAt: toIsoString(row.created_at) || new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) || new Date().toISOString(),
    createdBy: row.creator_full_name
      ? { id: row.created_by_id, fullName: row.creator_full_name, role: row.creator_role || undefined }
      : null,
    projectMgrUser:
      row.project_mgr_id && row.pm_full_name
        ? { id: row.project_mgr_id, fullName: row.pm_full_name, role: row.pm_role || undefined }
        : null,
    serviceMgrUser:
      row.service_mgr_id && row.sm_full_name
        ? { id: row.service_mgr_id, fullName: row.sm_full_name, role: row.sm_role || undefined }
        : null,
    project:
      row.project_id && row.proj_number
        ? {
            id: row.project_id,
            projectNumber: row.proj_number,
            name: row.proj_name || row.project_name,
            clientName: row.proj_client_name ?? null,
            siteAddress: row.proj_site_address ?? null,
          }
        : null,
  };
}

function serializePrismaRow(row: {
  id: string;
  docNumber: string;
  companyCode: string;
  status: string;
  projectId: string | null;
  projectName: string;
  location: string | null;
  customerName: string;
  customerPhone: string | null;
  inspectorNames: string | null;
  systemSizeKwp: string | null;
  inspectionRound: string | null;
  inspectionDate: Date;
  reportDate: Date | null;
  projectTypes: string[];
  projectTypeOther: string | null;
  jobTypes: string[];
  jobTypeOther: string | null;
  workItems: Prisma.JsonValue | null;
  additionalDetail: string | null;
  checkInCustomerSignUrl: string | null;
  checkInCustomerName: string | null;
  checkInAt: Date | null;
  checkOutCustomerSignUrl: string | null;
  checkOutCustomerName: string | null;
  checkOutAt: Date | null;
  inspectorSignUrl: string | null;
  inspectorSignerName: string | null;
  reportTitle: string | null;
  reportData: Prisma.JsonValue | null;
  overallResult: string;
  projectMgrSignUrl: string | null;
  projectMgrId: string | null;
  projectMgrName: string | null;
  projectMgrSignedAt: Date | null;
  serviceMgrSignUrl: string | null;
  serviceMgrId: string | null;
  serviceMgrName: string | null;
  serviceMgrSignedAt: Date | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; fullName: string; role: string } | null;
  projectMgrUser?: { id: string; fullName: string; role: string } | null;
  serviceMgrUser?: { id: string; fullName: string; role: string } | null;
  project?: {
    id: string;
    projectNumber: string;
    name: string;
    clientName: string | null;
    siteAddress: string | null;
  } | null;
}): SolarCleaningRecord {
  return {
    ...row,
    inspectionDate: row.inspectionDate.toISOString(),
    reportDate: row.reportDate ? row.reportDate.toISOString() : null,
    checkInAt: row.checkInAt ? row.checkInAt.toISOString() : null,
    checkOutAt: row.checkOutAt ? row.checkOutAt.toISOString() : null,
    projectMgrSignedAt: row.projectMgrSignedAt ? row.projectMgrSignedAt.toISOString() : null,
    serviceMgrSignedAt: row.serviceMgrSignedAt ? row.serviceMgrSignedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    workItems: normalizeWorkItems(row.workItems),
    reportData: normalizeReportData(row.reportData),
    overallResult: row.overallResult === 'NOT_PASS' ? 'NOT_PASS' : 'PASS',
  };
}

const RAW_SELECT_JOIN = `
  SELECT
    s.*,
    cu."fullName" AS creator_full_name,
    cu."role" AS creator_role,
    pm."fullName" AS pm_full_name,
    pm."role" AS pm_role,
    sm."fullName" AS sm_full_name,
    sm."role" AS sm_role,
    p."projectNumber" AS proj_number,
    p."name" AS proj_name,
    p."clientName" AS proj_client_name,
    p."siteAddress" AS proj_site_address
  FROM "solar_cleaning_inspections" s
  LEFT JOIN "User" cu ON cu."id" = s."created_by_id"
  LEFT JOIN "User" pm ON pm."id" = s."project_mgr_id"
  LEFT JOIN "User" sm ON sm."id" = s."service_mgr_id"
  LEFT JOIN "Project" p ON p."id" = s."project_id"
`;

export async function dbListSolarCleaningInspections(
  client: PrismaDelegateClient = prisma
): Promise<SolarCleaningRecord[]> {
  if (hasDelegate(client)) {
    const rows = await client.solarCleaningInspection.findMany({
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        projectMgrUser: { select: { id: true, fullName: true, role: true } },
        serviceMgrUser: { select: { id: true, fullName: true, role: true } },
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            clientName: true,
            siteAddress: true,
          },
        },
      },
      orderBy: [{ inspectionDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializePrismaRow);
  }

  const rows = await client.$queryRawUnsafe<RawInspectionRow[]>(
    `${RAW_SELECT_JOIN} ORDER BY s."inspection_date" DESC, s."created_at" DESC`
  );
  return rows.map(mapRawRowToRecord);
}

export async function dbGetSolarCleaningById(
  id: string,
  client: PrismaDelegateClient = prisma
): Promise<SolarCleaningRecord | null> {
  if (hasDelegate(client)) {
    const row = await client.solarCleaningInspection.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        projectMgrUser: { select: { id: true, fullName: true, role: true } },
        serviceMgrUser: { select: { id: true, fullName: true, role: true } },
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            clientName: true,
            siteAddress: true,
          },
        },
      },
    });
    return row ? serializePrismaRow(row) : null;
  }

  const rows = await client.$queryRawUnsafe<RawInspectionRow[]>(
    `${RAW_SELECT_JOIN} WHERE s."id" = $1 LIMIT 1`,
    id
  );
  return rows[0] ? mapRawRowToRecord(rows[0]) : null;
}

export async function dbCountPendingManagerSignatures(
  opts: { needPm: boolean; needSm: boolean },
  client: PrismaDelegateClient = prisma
): Promise<number> {
  if (!opts.needPm && !opts.needSm) return 0;

  const countMatching = (
    rows: { projectMgrSignUrl?: string | null; serviceMgrSignUrl?: string | null; reportData?: unknown }[]
  ) =>
    rows.filter((row) => {
      const mode = normalizeReportData(row.reportData).managerSignMode;
      const needed = getNeededManagerSigners({
        mode,
        projectMgrSignUrl: row.projectMgrSignUrl,
        serviceMgrSignUrl: row.serviceMgrSignUrl,
      });
      return (opts.needPm && needed.needProjectMgr) || (opts.needSm && needed.needServiceMgr);
    }).length;

  if (hasDelegate(client)) {
    const rows = await client.solarCleaningInspection.findMany({
      where: { status: 'Pending Manager Sign' },
      select: {
        projectMgrSignUrl: true,
        serviceMgrSignUrl: true,
        reportData: true,
      },
    });
    return countMatching(rows);
  }

  const rows = await client.$queryRawUnsafe<
    {
      project_mgr_sign_url: string | null;
      service_mgr_sign_url: string | null;
      report_data: unknown;
    }[]
  >(
    `SELECT "project_mgr_sign_url", "service_mgr_sign_url", "report_data" FROM "solar_cleaning_inspections" WHERE "status" = 'Pending Manager Sign'`
  );
  return countMatching(
    rows.map((r) => ({
      projectMgrSignUrl: r.project_mgr_sign_url,
      serviceMgrSignUrl: r.service_mgr_sign_url,
      reportData: r.report_data,
    }))
  );
}

export async function dbListDocNumbersByPrefix(
  prefix: string,
  client: PrismaDelegateClient = prisma
): Promise<string[]> {
  if (hasDelegate(client)) {
    const rows = await client.solarCleaningInspection.findMany({
      where: { docNumber: { startsWith: prefix } },
      select: { docNumber: true },
    });
    return rows.map((r) => r.docNumber);
  }

  const rows = await client.$queryRawUnsafe<{ doc_number: string }[]>(
    `SELECT "doc_number" FROM "solar_cleaning_inspections" WHERE "doc_number" LIKE $1`,
    `${prefix}%`
  );
  return rows.map((r) => r.doc_number);
}

export async function dbCreateSolarCleaning(
  docNumber: string,
  payload: SolarCleaningWritePayload,
  client: PrismaDelegateClient = prisma
): Promise<{ id: string; docNumber: string }> {
  if (hasDelegate(client)) {
    return client.solarCleaningInspection.create({
      data: {
        docNumber,
        companyCode: payload.companyCode,
        status: payload.status,
        projectId: payload.projectId,
        projectName: payload.projectName,
        location: payload.location,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        inspectorNames: payload.inspectorNames,
        systemSizeKwp: payload.systemSizeKwp,
        inspectionRound: payload.inspectionRound,
        inspectionDate: payload.inspectionDate,
        reportDate: payload.reportDate,
        projectTypes: payload.projectTypes,
        projectTypeOther: payload.projectTypeOther,
        jobTypes: payload.jobTypes,
        jobTypeOther: payload.jobTypeOther,
        workItems: payload.workItems as Prisma.InputJsonValue,
        additionalDetail: payload.additionalDetail,
        checkInCustomerSignUrl: payload.checkInCustomerSignUrl,
        checkInCustomerName: payload.checkInCustomerName,
        checkInAt: payload.checkInAt,
        checkOutCustomerSignUrl: payload.checkOutCustomerSignUrl,
        checkOutCustomerName: payload.checkOutCustomerName,
        checkOutAt: payload.checkOutAt,
        inspectorSignUrl: payload.inspectorSignUrl,
        inspectorSignerName: payload.inspectorSignerName,
        reportTitle: payload.reportTitle,
        reportData: payload.reportData as Prisma.InputJsonValue,
        overallResult: payload.overallResult,
        projectMgrSignUrl: payload.projectMgrSignUrl,
        projectMgrId: payload.projectMgrId,
        projectMgrName: payload.projectMgrName,
        projectMgrSignedAt: payload.projectMgrSignedAt,
        serviceMgrSignUrl: payload.serviceMgrSignUrl,
        serviceMgrId: payload.serviceMgrId,
        serviceMgrName: payload.serviceMgrName,
        serviceMgrSignedAt: payload.serviceMgrSignedAt,
        createdById: payload.createdById || payload.updatedById,
        updatedById: payload.updatedById,
      },
      select: { id: true, docNumber: true },
    });
  }

  const newId = `sc_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
  await client.$executeRawUnsafe(
    `INSERT INTO "solar_cleaning_inspections" (
      "id", "doc_number", "company_code", "status", "project_id", "project_name", "location",
      "customer_name", "customer_phone", "inspector_names", "system_size_kwp", "inspection_round",
      "inspection_date", "report_date", "project_types", "project_type_other", "job_types",
      "job_type_other", "work_items", "additional_detail", "checkin_customer_sign_url",
      "checkin_customer_name", "checkin_at", "checkout_customer_sign_url", "checkout_customer_name",
      "checkout_at", "inspector_sign_url", "inspector_signer_name", "report_title", "report_data",
      "overall_result", "project_mgr_sign_url", "project_mgr_id", "project_mgr_name",
      "project_mgr_signed_at", "service_mgr_sign_url", "service_mgr_id", "service_mgr_name",
      "service_mgr_signed_at", "created_by_id", "updated_by_id", "created_at", "updated_at"
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::text[],$16,$17::text[],$18,$19::jsonb,
      $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,NOW(),NOW()
    )`,
    newId,
    docNumber,
    payload.companyCode,
    payload.status,
    payload.projectId,
    payload.projectName,
    payload.location,
    payload.customerName,
    payload.customerPhone,
    payload.inspectorNames,
    payload.systemSizeKwp,
    payload.inspectionRound,
    payload.inspectionDate,
    payload.reportDate,
    payload.projectTypes,
    payload.projectTypeOther,
    payload.jobTypes,
    payload.jobTypeOther,
    JSON.stringify(payload.workItems || []),
    payload.additionalDetail,
    payload.checkInCustomerSignUrl,
    payload.checkInCustomerName,
    payload.checkInAt,
    payload.checkOutCustomerSignUrl,
    payload.checkOutCustomerName,
    payload.checkOutAt,
    payload.inspectorSignUrl,
    payload.inspectorSignerName,
    payload.reportTitle,
    JSON.stringify(payload.reportData || {}),
    payload.overallResult,
    payload.projectMgrSignUrl,
    payload.projectMgrId,
    payload.projectMgrName,
    payload.projectMgrSignedAt,
    payload.serviceMgrSignUrl,
    payload.serviceMgrId,
    payload.serviceMgrName,
    payload.serviceMgrSignedAt,
    payload.createdById || payload.updatedById,
    payload.updatedById
  );
  return { id: newId, docNumber };
}

export async function dbUpdateSolarCleaning(
  id: string,
  payload: SolarCleaningWritePayload,
  client: PrismaDelegateClient = prisma
): Promise<void> {
  if (hasDelegate(client)) {
    await client.solarCleaningInspection.update({
      where: { id },
      data: {
        companyCode: payload.companyCode,
        status: payload.status,
        projectId: payload.projectId,
        projectName: payload.projectName,
        location: payload.location,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        inspectorNames: payload.inspectorNames,
        systemSizeKwp: payload.systemSizeKwp,
        inspectionRound: payload.inspectionRound,
        inspectionDate: payload.inspectionDate,
        reportDate: payload.reportDate,
        projectTypes: payload.projectTypes,
        projectTypeOther: payload.projectTypeOther,
        jobTypes: payload.jobTypes,
        jobTypeOther: payload.jobTypeOther,
        workItems: payload.workItems as Prisma.InputJsonValue,
        additionalDetail: payload.additionalDetail,
        checkInCustomerSignUrl: payload.checkInCustomerSignUrl,
        checkInCustomerName: payload.checkInCustomerName,
        checkInAt: payload.checkInAt,
        checkOutCustomerSignUrl: payload.checkOutCustomerSignUrl,
        checkOutCustomerName: payload.checkOutCustomerName,
        checkOutAt: payload.checkOutAt,
        inspectorSignUrl: payload.inspectorSignUrl,
        inspectorSignerName: payload.inspectorSignerName,
        reportTitle: payload.reportTitle,
        reportData: payload.reportData as Prisma.InputJsonValue,
        overallResult: payload.overallResult,
        projectMgrSignUrl: payload.projectMgrSignUrl,
        projectMgrId: payload.projectMgrId,
        projectMgrName: payload.projectMgrName,
        projectMgrSignedAt: payload.projectMgrSignedAt,
        serviceMgrSignUrl: payload.serviceMgrSignUrl,
        serviceMgrId: payload.serviceMgrId,
        serviceMgrName: payload.serviceMgrName,
        serviceMgrSignedAt: payload.serviceMgrSignedAt,
        updatedById: payload.updatedById,
      },
    });
    return;
  }

  await client.$executeRawUnsafe(
    `UPDATE "solar_cleaning_inspections" SET
      "company_code" = $1,
      "status" = $2,
      "project_id" = $3,
      "project_name" = $4,
      "location" = $5,
      "customer_name" = $6,
      "customer_phone" = $7,
      "inspector_names" = $8,
      "system_size_kwp" = $9,
      "inspection_round" = $10,
      "inspection_date" = $11,
      "report_date" = $12,
      "project_types" = $13::text[],
      "project_type_other" = $14,
      "job_types" = $15::text[],
      "job_type_other" = $16,
      "work_items" = $17::jsonb,
      "additional_detail" = $18,
      "checkin_customer_sign_url" = $19,
      "checkin_customer_name" = $20,
      "checkin_at" = $21,
      "checkout_customer_sign_url" = $22,
      "checkout_customer_name" = $23,
      "checkout_at" = $24,
      "inspector_sign_url" = $25,
      "inspector_signer_name" = $26,
      "report_title" = $27,
      "report_data" = $28::jsonb,
      "overall_result" = $29,
      "project_mgr_sign_url" = $30,
      "project_mgr_id" = $31,
      "project_mgr_name" = $32,
      "project_mgr_signed_at" = $33,
      "service_mgr_sign_url" = $34,
      "service_mgr_id" = $35,
      "service_mgr_name" = $36,
      "service_mgr_signed_at" = $37,
      "updated_by_id" = $38,
      "updated_at" = NOW()
    WHERE "id" = $39`,
    payload.companyCode,
    payload.status,
    payload.projectId,
    payload.projectName,
    payload.location,
    payload.customerName,
    payload.customerPhone,
    payload.inspectorNames,
    payload.systemSizeKwp,
    payload.inspectionRound,
    payload.inspectionDate,
    payload.reportDate,
    payload.projectTypes,
    payload.projectTypeOther,
    payload.jobTypes,
    payload.jobTypeOther,
    JSON.stringify(payload.workItems || []),
    payload.additionalDetail,
    payload.checkInCustomerSignUrl,
    payload.checkInCustomerName,
    payload.checkInAt,
    payload.checkOutCustomerSignUrl,
    payload.checkOutCustomerName,
    payload.checkOutAt,
    payload.inspectorSignUrl,
    payload.inspectorSignerName,
    payload.reportTitle,
    JSON.stringify(payload.reportData || {}),
    payload.overallResult,
    payload.projectMgrSignUrl,
    payload.projectMgrId,
    payload.projectMgrName,
    payload.projectMgrSignedAt,
    payload.serviceMgrSignUrl,
    payload.serviceMgrId,
    payload.serviceMgrName,
    payload.serviceMgrSignedAt,
    payload.updatedById,
    id
  );
}

export async function dbUpdateSolarCleaningManagerSign(
  id: string,
  params: {
    status: string;
    roleType: 'project_manager' | 'service_manager';
    signatureUrl: string | null;
    signerId: string | null;
    signerName: string | null;
    signedAt: Date | null;
    updatedById: string;
  },
  client: PrismaDelegateClient = prisma
): Promise<void> {
  if (hasDelegate(client)) {
    await client.solarCleaningInspection.update({
      where: { id },
      data: {
        status: params.status,
        ...(params.roleType === 'project_manager'
          ? {
              projectMgrSignUrl: params.signatureUrl,
              projectMgrId: params.signerId,
              projectMgrName: params.signerName,
              projectMgrSignedAt: params.signedAt,
            }
          : {
              serviceMgrSignUrl: params.signatureUrl,
              serviceMgrId: params.signerId,
              serviceMgrName: params.signerName,
              serviceMgrSignedAt: params.signedAt,
            }),
        updatedById: params.updatedById,
      },
    });
    return;
  }

  if (params.roleType === 'project_manager') {
    await client.$executeRawUnsafe(
      `UPDATE "solar_cleaning_inspections" SET
        "status" = $1,
        "project_mgr_sign_url" = $2,
        "project_mgr_id" = $3,
        "project_mgr_name" = $4,
        "project_mgr_signed_at" = $5,
        "updated_by_id" = $6,
        "updated_at" = NOW()
      WHERE "id" = $7`,
      params.status,
      params.signatureUrl,
      params.signerId,
      params.signerName,
      params.signedAt,
      params.updatedById,
      id
    );
  } else {
    await client.$executeRawUnsafe(
      `UPDATE "solar_cleaning_inspections" SET
        "status" = $1,
        "service_mgr_sign_url" = $2,
        "service_mgr_id" = $3,
        "service_mgr_name" = $4,
        "service_mgr_signed_at" = $5,
        "updated_by_id" = $6,
        "updated_at" = NOW()
      WHERE "id" = $7`,
      params.status,
      params.signatureUrl,
      params.signerId,
      params.signerName,
      params.signedAt,
      params.updatedById,
      id
    );
  }
}

export async function dbDeleteSolarCleaning(
  id: string,
  client: PrismaDelegateClient = prisma
): Promise<void> {
  if (hasDelegate(client)) {
    await client.solarCleaningInspection.delete({ where: { id } });
    return;
  }

  await client.$executeRawUnsafe(
    `DELETE FROM "solar_cleaning_inspections" WHERE "id" = $1`,
    id
  );
}

