/**
 * Utilities for normalizing, deduplicating, and matching Thai/English person names
 * without mutating or deleting underlying historical database records.
 *
 * Handles common variations found across historical imports and HR records:
 * - Space vs. no-space after Thai prefixes: "นางสาว กรกนก โภคสวัสดิ์" vs "นางสาวกรกนก โภคสวัสดิ์"
 * - Title changes / abbreviations: "นางเกศินี ธนะวัฒน์" vs "นางสาวเกศินี ธนะวัฒน์" vs "น.ส.เกศินี ธนะวัฒน์"
 * - Trailing parenthetical nicknames: "นางสาว ศยามล ปานมณี (วิ)" vs "นางสาวศยามล ปานมณี"
 * - Extra internal whitespace
 */

const PLACEHOLDER_NAMES = new Set([
  "",
  "-",
  "—",
  "–",
  "ไม่ระบุ",
  "ไม่ระบุผู้ดูแล",
  "ไม่ระบุพนักงาน",
  "unknown",
  "unknown seller",
  "n/a",
]);

// Matches leading Thai/English honorifics only when followed by a valid name start character
// (Thai consonants ก-ฮ, Thai leading vowels เ-ไ, or Latin A-Z), preventing false stripping on names like "คุณากร" or "นายิกา".
const LEADING_HONORIFIC_REGEX =
  /^(?:ว่าที่\s*ร้อยตรีหญิง|ว่าที่\s*ร้อยตรี|ว่าที่\s*ร\.?ต\.?\s*หญิง|ว่าที่\s*ร\.?ต\.?|นางสาว|น\.?ส\.?|นาง|นาย|ด\.?ช\.?|ด\.?ญ\.?|คุณ\s+|mr\.?\s+|mrs\.?\s+|ms\.?\s+|miss\s+)\s*(?=[\u0E01-\u0E2E\u0E40-\u0E44A-Za-z])/i;

function hasLeadingHonorific(name: string): boolean {
  return LEADING_HONORIFIC_REGEX.test(name.trim());
}

/**
 * Extracts a canonical identity key (e.g. "กรกนก โภคสวัสดิ์", "เกศินี ธนะวัฒน์")
 * used to group and match records belonging to the same person.
 */
export function getPersonIdentityKey(rawName: string | null | undefined): string {
  if (!rawName) return "";

  const normalized = rawName.trim().replace(/\s+/g, " ");
  if (!normalized || PLACEHOLDER_NAMES.has(normalized.toLowerCase())) {
    return "";
  }

  let core = normalized.replace(LEADING_HONORIFIC_REGEX, "").trim();

  // Strip trailing "(nickname)" only when First + Last name still remain
  const withoutTrailingParen = core.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (/\S+\s+\S+/.test(withoutTrailingParen)) {
    core = withoutTrailingParen;
  }

  return core.replace(/\s+/g, " ").toLowerCase();
}

/**
 * Formats a Thai person name with consistent prefix spacing for clean UI display
 * (e.g. "นางสาว กรกนก โภคสวัสดิ์" -> "นางสาวกรกนก โภคสวัสดิ์", "น.ส. กรกนก โภคสวัสดิ์" -> "นางสาวกรกนก โภคสวัสดิ์").
 */
export function formatCanonicalPersonName(rawName: string | null | undefined): string {
  if (!rawName) return "";
  let s = rawName.trim().replace(/\s+/g, " ");
  if (!s) return "";

  // Standardize common Thai prefixes without space between prefix and given name
  s = s
    .replace(/^(?:นางสาว|น\.?ส\.?)\s+(?=[\u0E01-\u0E2E\u0E40-\u0E44])/i, "นางสาว")
    .replace(/^น\.?ส\.?(?=[\u0E01-\u0E2E\u0E40-\u0E44])/i, "นางสาว")
    .replace(/^นาง\s+(?=[\u0E01-\u0E2E\u0E40-\u0E44])/i, "นาง")
    .replace(/^นาย\s+(?=[\u0E01-\u0E2E\u0E40-\u0E44])/i, "นาย");

  // Strip trailing "(nickname)" when full First + Last name is present
  const withoutParen = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (/\S+\s+\S+/.test(withoutParen.replace(LEADING_HONORIFIC_REGEX, "").trim())) {
    s = withoutParen;
  }

  return s;
}

export interface DeduplicatedPersonOption {
  /** Canonical identity key (used for matching all variants) */
  key: string;
  /** Clean display label shown in dropdowns */
  label: string;
}

/**
 * Deduplicates an array of raw person names (assumed ordered newest-first if from sorted records)
 * into unique person options while keeping the most up-to-date prefix/display name.
 */
export function deduplicatePersonNames(
  rawNames: Array<string | null | undefined>
): DeduplicatedPersonOption[] {
  const map = new Map<string, string>();

  for (const raw of rawNames) {
    const key = getPersonIdentityKey(raw);
    if (!key) continue;

    const formatted = formatCanonicalPersonName(raw);
    if (!formatted) continue;

    if (!map.has(key)) {
      map.set(key, formatted);
    } else {
      const existing = map.get(key)!;
      // Upgrade bare name to prefixed name if earlier record lacked a prefix
      if (!hasLeadingHonorific(existing) && hasLeadingHonorific(formatted)) {
        map.set(key, formatted);
      }
    }
  }

  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "th"));
}

/**
 * Checks whether two raw person name strings (or a raw name and a filter value/key)
 * refer to the same person across spacing/prefix variations.
 */
export function isSamePersonName(
  nameA: string | null | undefined,
  nameB: string | null | undefined
): boolean {
  const keyA = getPersonIdentityKey(nameA);
  const keyB = getPersonIdentityKey(nameB);
  if (!keyA || !keyB) return false;
  return keyA === keyB;
}

/**
 * Generates common stored string variants of a Thai full name for Prisma `in` queries
 * so historical records with/without prefix spaces or title changes remain accessible.
 */
export function buildThaiPersonNameVariants(
  fullName: string | null | undefined
): string[] {
  if (!fullName) return [];
  const trimmed = fullName.trim();
  if (!trimmed) return [];

  const singleSpace = trimmed.replace(/\s+/g, " ");
  const variants = new Set<string>([
    fullName,
    trimmed,
    singleSpace,
    singleSpace.replace(/\s+/g, "  "),
  ]);

  // Core name without leading honorific or trailing nickname
  let core = singleSpace.replace(LEADING_HONORIFIC_REGEX, "").trim();
  const coreNoParen = core.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (/\S+\s+\S+/.test(coreNoParen)) {
    core = coreNoParen;
  }

  if (core) {
    variants.add(core);
    const isMale = /^นาย(?:\s|$|[\u0E01-\u0E2E\u0E40-\u0E44])/.test(singleSpace) && !/^นาง/.test(singleSpace);
    if (isMale) {
      variants.add(`นาย${core}`);
      variants.add(`นาย ${core}`);
    } else {
      variants.add(`นางสาว${core}`);
      variants.add(`นางสาว ${core}`);
      variants.add(`นาง${core}`);
      variants.add(`นาง ${core}`);
      variants.add(`น.ส.${core}`);
      variants.add(`น.ส. ${core}`);
      variants.add(`นาย${core}`);
      variants.add(`นาย ${core}`);
    }
  }

  return Array.from(variants);
}

