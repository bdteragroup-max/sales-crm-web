export const SURVEY_SIGNATURE_FIELDS = [
  'salesSignatureUrl',
  'salesSignedAt',
  'projectSignatureUrl',
  'projectSignedAt',
] as const;

export const SURVEY_EXTENDED_FIELDS = [
  'companyCode',
  ...SURVEY_SIGNATURE_FIELDS,
] as const;

export interface SurveySignatureValues {
  companyCode: string | null;
  salesSignatureUrl: string | null;
  salesSignedAt: Date | null;
  projectSignatureUrl: string | null;
  projectSignedAt: Date | null;
}

export interface SurveySignaturePatch {
  companyCode?: string | null;
  salesSignatureUrl?: string | null;
  salesSignedAt?: Date | null;
  projectSignatureUrl?: string | null;
  projectSignedAt?: Date | null;
}

interface RuntimeFieldEntry {
  name?: string;
}

interface ClientWithRuntimeModel {
  _runtimeDataModel?: {
    models?: {
      SiteSurvey?: {
        fields?: RuntimeFieldEntry[];
      };
    };
  };
}

interface RawSqlClient {
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  $queryRaw: <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
}

function hasSiteSurveyFieldsInRuntime(client: unknown, fieldNames: readonly string[]): boolean {
  const fields = (client as ClientWithRuntimeModel | null | undefined)?._runtimeDataModel?.models?.SiteSurvey?.fields;
  if (!Array.isArray(fields)) return false;
  return fieldNames.every((name) => fields.some((field) => field?.name === name));
}

/**
 * Checks whether the in-memory PrismaClient runtime datamodel knows about the
 * SiteSurvey signature columns.
 */
export function hasSurveySignatureFieldsInRuntime(client: unknown): boolean {
  return hasSiteSurveyFieldsInRuntime(client, SURVEY_SIGNATURE_FIELDS);
}

/**
 * Checks whether the in-memory PrismaClient runtime datamodel knows about
 * companyCode plus all SiteSurvey signature columns. During Next.js dev HMR,
 * an older cached PrismaClient module may lack newly added schema fields.
 */
export function hasSurveyExtendedFieldsInRuntime(client: unknown): boolean {
  return hasSiteSurveyFieldsInRuntime(client, SURVEY_EXTENDED_FIELDS);
}

/**
 * Persists SiteSurvey signature + companyCode fields via parameterized raw SQL
 * when the active PrismaClient runtime datamodel does not yet expose them.
 * Fields left `undefined` retain their existing database values.
 */
export async function persistSurveySignaturesFallback(
  tx: unknown,
  surveyId: string,
  patch: SurveySignaturePatch
): Promise<void> {
  const setCompanyCode = patch.companyCode !== undefined;
  const setSalesUrl = patch.salesSignatureUrl !== undefined;
  const setSalesDate = patch.salesSignedAt !== undefined;
  const setProjectUrl = patch.projectSignatureUrl !== undefined;
  const setProjectDate = patch.projectSignedAt !== undefined;

  if (!setCompanyCode && !setSalesUrl && !setSalesDate && !setProjectUrl && !setProjectDate) {
    return;
  }

  const sqlClient = tx as RawSqlClient;
  await sqlClient.$executeRaw`
    UPDATE "SiteSurvey"
    SET
      "companyCode" = CASE WHEN ${setCompanyCode}::boolean THEN ${patch.companyCode ?? null}::text ELSE "companyCode" END,
      "salesSignatureUrl" = CASE WHEN ${setSalesUrl}::boolean THEN ${patch.salesSignatureUrl ?? null}::text ELSE "salesSignatureUrl" END,
      "salesSignedAt" = CASE WHEN ${setSalesDate}::boolean THEN ${patch.salesSignedAt ?? null}::timestamp(3) ELSE "salesSignedAt" END,
      "projectSignatureUrl" = CASE WHEN ${setProjectUrl}::boolean THEN ${patch.projectSignatureUrl ?? null}::text ELSE "projectSignatureUrl" END,
      "projectSignedAt" = CASE WHEN ${setProjectDate}::boolean THEN ${patch.projectSignedAt ?? null}::timestamp(3) ELSE "projectSignedAt" END
    WHERE "id" = ${surveyId}
  `;
}

/**
 * Hydrates SiteSurvey companyCode + signature fields onto a query result when the
 * in-memory PrismaClient runtime datamodel lacks those columns.
 */
export async function hydrateSurveySignaturesFallback<T extends { id: string }>(
  client: unknown,
  survey: T | null
): Promise<(T & Partial<SurveySignatureValues>) | null> {
  if (!survey) return null;
  if (
    hasSurveyExtendedFieldsInRuntime(client) &&
    'companyCode' in survey &&
    'salesSignatureUrl' in survey
  ) {
    return survey as T & Partial<SurveySignatureValues>;
  }

  const sqlClient = client as RawSqlClient;
  const rows = await sqlClient.$queryRaw<SurveySignatureValues[]>`
    SELECT "companyCode", "salesSignatureUrl", "salesSignedAt", "projectSignatureUrl", "projectSignedAt"
    FROM "SiteSurvey"
    WHERE "id" = ${survey.id}
    LIMIT 1
  `;

  const row = rows?.[0];
  if (!row) {
    return survey as T & Partial<SurveySignatureValues>;
  }

  return {
    ...survey,
    companyCode: row.companyCode ?? 'TE',
    salesSignatureUrl: row.salesSignatureUrl ?? null,
    salesSignedAt: row.salesSignedAt ?? null,
    projectSignatureUrl: row.projectSignatureUrl ?? null,
    projectSignedAt: row.projectSignedAt ?? null,
  };
}

/**
 * Hydrates `companyCode` onto a list of survey summary rows when the active
 * PrismaClient runtime datamodel lacks `companyCode`.
 */
export async function hydrateSurveyListCompanyCodesFallback<T extends { id: string }>(
  client: unknown,
  surveys: T[]
): Promise<Array<T & { companyCode?: string | null }>> {
  if (!surveys || surveys.length === 0) return surveys;
  if (hasSurveyExtendedFieldsInRuntime(client) && 'companyCode' in surveys[0]) {
    return surveys as Array<T & { companyCode?: string | null }>;
  }

  const ids = surveys.map((s) => s.id).filter(Boolean);
  if (ids.length === 0) return surveys;

  const sqlClient = client as RawSqlClient;
  const rows = await sqlClient.$queryRaw<Array<{ id: string; companyCode: string | null }>>`
    SELECT "id", "companyCode"
    FROM "SiteSurvey"
    WHERE "id" = ANY(${ids}::text[])
  `;

  const codeById = new Map<string, string | null>();
  rows.forEach((r) => codeById.set(r.id, r.companyCode));

  return surveys.map((s) => ({
    ...s,
    companyCode: codeById.get(s.id) ?? 'TE',
  }));
}
