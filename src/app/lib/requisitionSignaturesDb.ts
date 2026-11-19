import type { PrismaClient } from '@/generated/client';

export const REQUISITION_TRANSPORT_FIELDS = [
  'transportId',
  'transportName',
  'transportType',
  'transportCompany',
  'transportSignatureUrl',
  'transportSignedAt',
] as const;

export const REQUISITION_ACCOUNTING_FIELDS = [
  'accountingId',
  'accountingName',
  'accountingSignatureUrl',
  'accountingSignedAt',
] as const;

export const REQUISITION_EXTENDED_FIELDS = [
  ...REQUISITION_TRANSPORT_FIELDS,
  ...REQUISITION_ACCOUNTING_FIELDS,
] as const;

export interface RequisitionExtendedFieldsValues {
  transportId: string | null;
  transportName: string | null;
  transportType: string | null;
  transportCompany: string | null;
  transportSignatureUrl: string | null;
  transportSignedAt: Date | null;
  accountingId: string | null;
  accountingName: string | null;
  accountingSignatureUrl: string | null;
  accountingSignedAt: Date | null;
}

export interface UserRequisitionSavedSignatures {
  fallbackSignatureUrl: string | null;
  savedAccountingSignatureUrl: string | null;
  savedTransportSignatureUrl: string | null;
  savedStoreSignatureUrl: string | null;
}

interface RuntimeFieldEntry {
  name?: string;
}

interface ClientWithRuntimeModel {
  _runtimeDataModel?: {
    models?: {
      MaterialRequisition?: {
        fields?: RuntimeFieldEntry[];
      };
    };
  };
}

interface RawSqlClient {
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  $queryRaw: <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
}

/**
 * Checks whether the in-memory PrismaClient runtime datamodel exposes the
 * Transport & Accounting signature fields on MaterialRequisition.
 */
export function hasRequisitionExtendedFieldsInRuntime(client: unknown): boolean {
  const fields = (client as ClientWithRuntimeModel | null | undefined)
    ?._runtimeDataModel?.models?.MaterialRequisition?.fields;
  if (!Array.isArray(fields)) return false;
  return REQUISITION_EXTENDED_FIELDS.every((name) =>
    fields.some((field) => field?.name === name)
  );
}

/**
 * Hydrates Transport & Accounting signature columns onto a single requisition record
 * when the in-memory Next.js dev PrismaClient module predates the latest schema generation.
 */
export async function hydrateRequisitionExtendedSingle<T extends { id: string }>(
  client: unknown,
  record: T | null
): Promise<(T & Partial<RequisitionExtendedFieldsValues>) | null> {
  if (!record) return null;
  if (
    hasRequisitionExtendedFieldsInRuntime(client) &&
    'accountingSignatureUrl' in record &&
    'transportSignatureUrl' in record
  ) {
    return record as T & Partial<RequisitionExtendedFieldsValues>;
  }

  const sqlClient = client as RawSqlClient;
  const rows = await sqlClient.$queryRaw<RequisitionExtendedFieldsValues[]>`
    SELECT
      "transportId",
      "transportName",
      "transportType",
      "transportCompany",
      "transportSignatureUrl",
      "transportSignedAt",
      "accountingId",
      "accountingName",
      "accountingSignatureUrl",
      "accountingSignedAt"
    FROM "material_requisitions"
    WHERE "id" = ${record.id}
    LIMIT 1
  `;

  const row = rows?.[0];
  if (!row) {
    return record as T & Partial<RequisitionExtendedFieldsValues>;
  }

  return {
    ...record,
    transportId: row.transportId ?? null,
    transportName: row.transportName ?? null,
    transportType: row.transportType ?? null,
    transportCompany: row.transportCompany ?? null,
    transportSignatureUrl: row.transportSignatureUrl ?? null,
    transportSignedAt: row.transportSignedAt ?? null,
    accountingId: row.accountingId ?? null,
    accountingName: row.accountingName ?? null,
    accountingSignatureUrl: row.accountingSignatureUrl ?? null,
    accountingSignedAt: row.accountingSignedAt ?? null,
  };
}

/**
 * Batch-hydrates Transport & Accounting signature columns onto a list of requisitions
 * in a single parameterized query when the active Prisma runtime datamodel is stale.
 */
export async function hydrateRequisitionExtendedList<T extends { id: string }>(
  client: unknown,
  records: T[]
): Promise<Array<T & Partial<RequisitionExtendedFieldsValues>>> {
  if (!records || records.length === 0) return records;
  if (
    hasRequisitionExtendedFieldsInRuntime(client) &&
    'accountingSignatureUrl' in records[0] &&
    'transportSignatureUrl' in records[0]
  ) {
    return records as Array<T & Partial<RequisitionExtendedFieldsValues>>;
  }

  const ids = records.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return records;

  const sqlClient = client as RawSqlClient;
  const rows = await sqlClient.$queryRaw<
    Array<{ id: string } & RequisitionExtendedFieldsValues>
  >`
    SELECT
      "id",
      "transportId",
      "transportName",
      "transportType",
      "transportCompany",
      "transportSignatureUrl",
      "transportSignedAt",
      "accountingId",
      "accountingName",
      "accountingSignatureUrl",
      "accountingSignedAt"
    FROM "material_requisitions"
    WHERE "id" = ANY(${ids}::text[])
  `;

  const byId = new Map<string, RequisitionExtendedFieldsValues>();
  rows.forEach((row) => {
    byId.set(row.id, row);
  });

  return records.map((rec) => {
    const ext = byId.get(rec.id);
    if (!ext) return rec;
    return {
      ...rec,
      transportId: ext.transportId ?? null,
      transportName: ext.transportName ?? null,
      transportType: ext.transportType ?? null,
      transportCompany: ext.transportCompany ?? null,
      transportSignatureUrl: ext.transportSignatureUrl ?? null,
      transportSignedAt: ext.transportSignedAt ?? null,
      accountingId: ext.accountingId ?? null,
      accountingName: ext.accountingName ?? null,
      accountingSignatureUrl: ext.accountingSignatureUrl ?? null,
      accountingSignedAt: ext.accountingSignedAt ?? null,
    };
  });
}

interface UserSigLookupRow {
  accountingId: string | null;
  accountingSignatureUrl: string | null;
  transportId: string | null;
  transportSignatureUrl: string | null;
  storeStaffId: string | null;
  storeStaffSignatureUrl: string | null;
  approverId: string | null;
  approverSignatureUrl: string | null;
  requesterId: string | null;
  requesterSignatureUrl: string | null;
}

/**
 * Fetches a user's most recent signature URLs across all requisition signature roles.
 * Uses native Prisma when schema fields are present in memory, falling back to
 * parameterized raw SQL if Next.js dev HMR still holds a stale PrismaClient instance.
 */
export async function getUserLatestRequisitionSignatures(
  client: unknown,
  userId: string
): Promise<UserRequisitionSavedSignatures> {
  let rows: UserSigLookupRow[] = [];

  if (hasRequisitionExtendedFieldsInRuntime(client)) {
    const typedClient = client as PrismaClient;
    rows = await typedClient.materialRequisition.findMany({
      where: {
        OR: [
          { accountingId: userId, accountingSignatureUrl: { not: null } },
          { transportId: userId, transportSignatureUrl: { not: null } },
          { storeStaffId: userId, storeStaffSignatureUrl: { not: null } },
          { approverId: userId, approverSignatureUrl: { not: null } },
          { requesterId: userId, requesterSignatureUrl: { not: null } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
      select: {
        accountingId: true,
        accountingSignatureUrl: true,
        transportId: true,
        transportSignatureUrl: true,
        storeStaffId: true,
        storeStaffSignatureUrl: true,
        approverId: true,
        approverSignatureUrl: true,
        requesterId: true,
        requesterSignatureUrl: true,
      },
    });
  } else {
    const sqlClient = client as RawSqlClient;
    rows = await sqlClient.$queryRaw<UserSigLookupRow[]>`
      SELECT
        "accountingId",
        "accountingSignatureUrl",
        "transportId",
        "transportSignatureUrl",
        "storeStaffId",
        "storeStaffSignatureUrl",
        "approverId",
        "approverSignatureUrl",
        "requesterId",
        "requesterSignatureUrl"
      FROM "material_requisitions"
      WHERE ("accountingId" = ${userId} AND "accountingSignatureUrl" IS NOT NULL)
         OR ("transportId" = ${userId} AND "transportSignatureUrl" IS NOT NULL)
         OR ("storeStaffId" = ${userId} AND "storeStaffSignatureUrl" IS NOT NULL)
         OR ("approverId" = ${userId} AND "approverSignatureUrl" IS NOT NULL)
         OR ("requesterId" = ${userId} AND "requesterSignatureUrl" IS NOT NULL)
      ORDER BY "updatedAt" DESC
      LIMIT 15
    `;
  }

  let accountingSig: string | null = null;
  let transportSig: string | null = null;
  let storeSig: string | null = null;
  let fallbackSig: string | null = null;

  for (const r of rows) {
    if (!accountingSig && r.accountingId === userId && r.accountingSignatureUrl) {
      accountingSig = r.accountingSignatureUrl;
    }
    if (!transportSig && r.transportId === userId && r.transportSignatureUrl) {
      transportSig = r.transportSignatureUrl;
    }
    if (!storeSig && r.storeStaffId === userId && r.storeStaffSignatureUrl) {
      storeSig = r.storeStaffSignatureUrl;
    }
    if (!fallbackSig) {
      fallbackSig =
        (r.storeStaffId === userId && r.storeStaffSignatureUrl) ||
        (r.accountingId === userId && r.accountingSignatureUrl) ||
        (r.transportId === userId && r.transportSignatureUrl) ||
        (r.approverId === userId && r.approverSignatureUrl) ||
        (r.requesterId === userId && r.requesterSignatureUrl) ||
        null;
    }
  }

  return {
    fallbackSignatureUrl: fallbackSig,
    savedAccountingSignatureUrl: accountingSig || fallbackSig,
    savedTransportSignatureUrl: transportSig || fallbackSig,
    savedStoreSignatureUrl: storeSig || fallbackSig,
  };
}

export async function persistRequisitionTransportSignature(
  client: unknown,
  id: string,
  payload: {
    transportId: string | null;
    transportName: string;
    transportType: string;
    transportCompany: string | null;
    transportSignatureUrl: string;
    transportSignedAt: Date;
    storeStaffId?: string;
    storeStaffName?: string;
    storeStaffSignatureUrl?: string;
    dispensedAt?: Date;
  }
): Promise<void> {
  if (hasRequisitionExtendedFieldsInRuntime(client)) {
    const typedClient = client as PrismaClient;
    await typedClient.materialRequisition.update({
      where: { id },
      data: {
        transportId: payload.transportId,
        transportName: payload.transportName,
        transportType: payload.transportType,
        transportCompany: payload.transportCompany,
        transportSignatureUrl: payload.transportSignatureUrl,
        transportSignedAt: payload.transportSignedAt,
        ...(payload.storeStaffSignatureUrl
          ? {
              storeStaffId: payload.storeStaffId,
              storeStaffName: payload.storeStaffName,
              storeStaffSignatureUrl: payload.storeStaffSignatureUrl,
              dispensedAt: payload.dispensedAt,
            }
          : {}),
      },
    });
    return;
  }

  const sqlClient = client as RawSqlClient;
  const applyStore = Boolean(payload.storeStaffSignatureUrl);
  await sqlClient.$executeRaw`
    UPDATE "material_requisitions"
    SET
      "transportId" = ${payload.transportId}::text,
      "transportName" = ${payload.transportName}::text,
      "transportType" = ${payload.transportType}::text,
      "transportCompany" = ${payload.transportCompany}::text,
      "transportSignatureUrl" = ${payload.transportSignatureUrl}::text,
      "transportSignedAt" = ${payload.transportSignedAt}::timestamptz,
      "storeStaffId" = CASE WHEN ${applyStore}::boolean THEN ${payload.storeStaffId ?? null}::text ELSE "storeStaffId" END,
      "storeStaffName" = CASE WHEN ${applyStore}::boolean THEN ${payload.storeStaffName ?? null}::text ELSE "storeStaffName" END,
      "storeStaffSignatureUrl" = CASE WHEN ${applyStore}::boolean THEN ${payload.storeStaffSignatureUrl ?? null}::text ELSE "storeStaffSignatureUrl" END,
      "dispensedAt" = CASE WHEN ${applyStore}::boolean THEN ${payload.dispensedAt ?? null}::timestamptz ELSE "dispensedAt" END,
      "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}

export async function persistRequisitionAccountingSignature(
  client: unknown,
  id: string,
  payload: {
    accountingId: string;
    accountingName: string;
    accountingSignatureUrl: string;
    accountingSignedAt: Date;
  }
): Promise<void> {
  if (hasRequisitionExtendedFieldsInRuntime(client)) {
    const typedClient = client as PrismaClient;
    await typedClient.materialRequisition.update({
      where: { id },
      data: {
        accountingId: payload.accountingId,
        accountingName: payload.accountingName,
        accountingSignatureUrl: payload.accountingSignatureUrl,
        accountingSignedAt: payload.accountingSignedAt,
      },
    });
    return;
  }

  const sqlClient = client as RawSqlClient;
  await sqlClient.$executeRaw`
    UPDATE "material_requisitions"
    SET
      "accountingId" = ${payload.accountingId}::text,
      "accountingName" = ${payload.accountingName}::text,
      "accountingSignatureUrl" = ${payload.accountingSignatureUrl}::text,
      "accountingSignedAt" = ${payload.accountingSignedAt}::timestamptz,
      "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}
