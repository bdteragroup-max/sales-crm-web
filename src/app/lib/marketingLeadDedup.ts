import prisma from '@/app/lib/db';

/**
 * Normalizes Thai & international phone numbers to digits-only format for reliable duplicate checks.
 */
export function normalizeLeadPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('066') && digits.length >= 12) {
    digits = '0' + digits.substring(3);
  } else if (digits.startsWith('66') && digits.length === 11) {
    digits = '0' + digits.substring(2);
  } else if (digits.length === 11 && (digits.startsWith('068') || digits.startsWith('069'))) {
    digits = '0' + digits.substring(2);
  }

  if (digits.length >= 9 && digits.length <= 15) {
    return digits;
  }
  return digits.length >= 7 ? digits : null;
}

export function getLeadPhoneSuffix(normalizedPhone: string): string {
  return normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone;
}

export type DuplicateLeadOrContactMatch = {
  sourceType: 'LEAD' | 'CUSTOMER';
  id: string;
  name: string;
  companyName: string | null;
  phoneNumber: string | null;
  salesRepName: string | null;
  isForwarded?: boolean;
  createdAt?: Date | string | null;
};

type TxLike = Pick<typeof prisma, '$queryRawUnsafe'>;

/**
 * Finds an existing MarketingLead or Contact sharing the same normalized phone number (or last 9 digits).
 */
export async function findDuplicateLeadOrContactByPhone(
  phoneNumber: string | null | undefined,
  opts?: { excludeLeadId?: string; db?: TxLike }
): Promise<DuplicateLeadOrContactMatch | null> {
  const normalized = normalizeLeadPhoneNumber(phoneNumber);
  if (!normalized) return null;

  const suffix = getLeadPhoneSuffix(normalized);
  const queryRunner = opts?.db ?? prisma;

  // 1. Check existing MarketingLead records first
  const leadSql = opts?.excludeLeadId
    ? `
      SELECT
        ml.id,
        ml."customerName" as name,
        ml."companyName",
        ml."phoneNumber",
        ml."isForwarded",
        ml."createdAt",
        u."fullName" as "salesRepName"
      FROM "MarketingLead" ml
      LEFT JOIN "User" u ON ml."assignedToId" = u.id
      WHERE ml.id <> $3
        AND (
          regexp_replace(COALESCE(ml."phoneNumber", ''), '[^0-9]', '', 'g') = $1
          OR (length(regexp_replace(COALESCE(ml."phoneNumber", ''), '[^0-9]', '', 'g')) >= 9
              AND right(regexp_replace(COALESCE(ml."phoneNumber", ''), '[^0-9]', '', 'g'), 9) = $2)
        )
      ORDER BY ml."createdAt" ASC
      LIMIT 1
    `
    : `
      SELECT
        ml.id,
        ml."customerName" as name,
        ml."companyName",
        ml."phoneNumber",
        ml."isForwarded",
        ml."createdAt",
        u."fullName" as "salesRepName"
      FROM "MarketingLead" ml
      LEFT JOIN "User" u ON ml."assignedToId" = u.id
      WHERE regexp_replace(COALESCE(ml."phoneNumber", ''), '[^0-9]', '', 'g') = $1
         OR (length(regexp_replace(COALESCE(ml."phoneNumber", ''), '[^0-9]', '', 'g')) >= 9
             AND right(regexp_replace(COALESCE(ml."phoneNumber", ''), '[^0-9]', '', 'g'), 9) = $2)
      ORDER BY ml."createdAt" ASC
      LIMIT 1
    `;

  const leadMatches = opts?.excludeLeadId
    ? await queryRunner.$queryRawUnsafe<
        Array<{
          id: string;
          name: string;
          companyName: string | null;
          phoneNumber: string | null;
          isForwarded: boolean;
          createdAt: Date;
          salesRepName: string | null;
        }>
      >(leadSql, normalized, suffix, opts.excludeLeadId)
    : await queryRunner.$queryRawUnsafe<
        Array<{
          id: string;
          name: string;
          companyName: string | null;
          phoneNumber: string | null;
          isForwarded: boolean;
          createdAt: Date;
          salesRepName: string | null;
        }>
      >(leadSql, normalized, suffix);

  if (leadMatches.length > 0) {
    const m = leadMatches[0];
    return {
      sourceType: 'LEAD',
      id: m.id,
      name: m.name,
      companyName: m.companyName,
      phoneNumber: m.phoneNumber,
      salesRepName: m.salesRepName,
      isForwarded: m.isForwarded,
      createdAt: m.createdAt,
    };
  }

  // 2. Check existing CRM Contact records
  const contactMatches = await queryRunner.$queryRawUnsafe<
    Array<{
      id: string;
      name: string | null;
      companyName: string | null;
      phoneNumber: string | null;
      salesRepName: string | null;
    }>
  >(
    `
      SELECT
        c.id,
        c."contactName" as name,
        comp."companyName" as "companyName",
        c."mobilePhone" as "phoneNumber",
        u."fullName" as "salesRepName"
      FROM "Contact" c
      LEFT JOIN "Company" comp ON c."companyId" = comp.id
      LEFT JOIN "User" u ON comp."assignedUserId" = u.id
      WHERE regexp_replace(COALESCE(c."mobilePhone", ''), '[^0-9]', '', 'g') = $1
         OR (length(regexp_replace(COALESCE(c."mobilePhone", ''), '[^0-9]', '', 'g')) >= 9
             AND right(regexp_replace(COALESCE(c."mobilePhone", ''), '[^0-9]', '', 'g'), 9) = $2)
      LIMIT 1
    `,
    normalized,
    suffix
  );

  if (contactMatches.length > 0) {
    const c = contactMatches[0];
    return {
      sourceType: 'CUSTOMER',
      id: c.id,
      name: c.name || c.companyName || 'ลูกค้าเดิมในระบบ',
      companyName: c.companyName || 'ลูกค้าเดิมในระบบ',
      phoneNumber: c.phoneNumber,
      salesRepName: c.salesRepName,
    };
  }

  return null;
}

export function formatDuplicateLeadErrorMessage(
  match: DuplicateLeadOrContactMatch,
  inputPhone?: string | null
): string {
  const phoneLabel = inputPhone?.trim() || match.phoneNumber || '';
  if (match.sourceType === 'LEAD') {
    const rep = match.salesRepName ? ` • ผู้ดูแล: ${match.salesRepName}` : '';
    return `ห้ามลงซ้ำ: เบอร์ ${phoneLabel} มีข้อมูล Lead ในระบบแล้ว ("${match.name}"${rep})`;
  }
  const rep = match.salesRepName ? ` • เซลส์: ${match.salesRepName}` : '';
  return `ห้ามลงซ้ำ: เบอร์ ${phoneLabel} ตรงกับลูกค้าเดิมในระบบ ("${match.name}"${
    match.companyName && match.companyName !== match.name ? ` - ${match.companyName}` : ''
  }${rep})`;
}
