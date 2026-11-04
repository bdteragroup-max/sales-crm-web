// ── Shared Company Definitions for Repair Orders (TP, TG, TE) ──

export interface RepairCompanyOption {
  code: "TP" | "TG" | "TE";
  shortLabel: string;
  name: string;
  fullName: string;
  dbCompany: string; // Database representation in repairOrder.company
  badgeClass: string;
  badgeActive: string;
  dotClass: string;
  description: string;
}

export const REPAIR_COMPANIES: RepairCompanyOption[] = [
  {
    code: "TP",
    shortLabel: "TP",
    name: "Tera Power",
    fullName: "บจก. เทร่า พาวเวอร์",
    dbCompany: "TERA POWER",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/80",
    badgeActive: "bg-blue-600 text-white border-blue-600 shadow-sm",
    dotClass: "bg-blue-600",
    description: "โซลาร์ & พลังงานสะอาด",
  },
  {
    code: "TG",
    shortLabel: "TG",
    name: "Tera Group",
    fullName: "บจก. เทร่า กรุ้ป",
    dbCompany: "TERA GROUP",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/80",
    badgeActive: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    dotClass: "bg-emerald-600",
    description: "กลุ่มธุรกิจหลัก",
  },
  {
    code: "TE",
    shortLabel: "TE",
    name: "Tera Electric",
    fullName: "บจก. เทร่า อิเล็คทริค",
    dbCompany: "TERA ELECTRIC",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/80",
    badgeActive: "bg-purple-600 text-white border-purple-600 shadow-sm",
    dotClass: "bg-purple-600",
    description: "ระบบไฟฟ้า & อินเวอร์เตอร์",
  },
];

export const COMPANY_PRINT_MAP: Record<
  "TG" | "TE" | "TP",
  {
    th: string;
    en: string;
    short: string;
    logo: string;
    address: string;
    telFax: string;
  }
> = {
  TG: {
    th: "บริษัท เทอรา กรุ้ป จำกัด",
    en: "TERA GROUP CO., LTD.",
    short: "เทอรา กรุ้ป (TG)",
    logo: "/4.png",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
    telFax: "โทรศัพท์: 02-328-0801-3  โทรสาร: 02-328-0804",
  },
  TE: {
    th: "บริษัท เทอรา อิเล็คทริค จำกัด",
    en: "TERA ELECTRIC CO., LTD.",
    short: "เทอรา อิเล็คทริค (TE)",
    logo: "/6.png",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
    telFax: "โทรศัพท์: 02-328-0801-3  โทรสาร: 02-328-0804",
  },
  TP: {
    th: "บริษัท เทอรา เพาเวอร์ จำกัด",
    en: "TERA POWER CO., LTD.",
    short: "เทอรา เพาเวอร์ (TP)",
    logo: "/7.png",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250",
    telFax: "โทรศัพท์: 02-328-0801-3  โทรสาร: 02-328-0804",
  },
};

/**
 * Resolves any company string (code, db name, Thai full name) into a unified RepairCompanyOption.
 * Default fallback is TG (Tera Group).
 */
export function getRepairCompany(val?: string | null): RepairCompanyOption {
  if (!val) return REPAIR_COMPANIES[1]; // default TG
  const clean = val.trim().toUpperCase();

  // 1. Check Power (TP)
  if (
    clean === "TP" ||
    clean.startsWith("TP ") ||
    clean.startsWith("TP-") ||
    clean.startsWith("TP(") ||
    clean.includes("POWER") ||
    clean.includes("เพาเวอร์") ||
    clean.includes("พาวเวอร์")
  ) {
    return REPAIR_COMPANIES[0];
  }

  // 2. Check Electric (TE)
  // CRITICAL: NEVER use clean.includes("TE") because "TERA" starts with "TE"!
  if (
    clean === "TE" ||
    clean.startsWith("TE ") ||
    clean.startsWith("TE-") ||
    clean.startsWith("TE(") ||
    clean.startsWith("TE (") ||
    clean.includes("ELECTRIC") ||
    clean.includes("อิเล็คทริค") ||
    clean.includes("อิเลคทริค") ||
    clean.includes("ENERGY")
  ) {
    return REPAIR_COMPANIES[2];
  }

  // 3. Check Group (TG)
  if (
    clean === "TG" ||
    clean.startsWith("TG ") ||
    clean.startsWith("TG-") ||
    clean.startsWith("TG(") ||
    clean.startsWith("TG (") ||
    clean.includes("GROUP") ||
    clean.includes("กรุ้ป") ||
    clean.includes("กรุ๊ป")
  ) {
    return REPAIR_COMPANIES[1];
  }

  return REPAIR_COMPANIES[1];
}

/**
 * Normalizes input to standard db company name ("TERA POWER" | "TERA GROUP" | "TERA ELECTRIC")
 */
export function normalizeDbCompany(val?: string | null): string {
  return getRepairCompany(val).dbCompany;
}

/**
 * Normalizes input to standard 2-letter company code ("TP" | "TG" | "TE")
 */
export function normalizeCompanyCode(val?: string | null): "TP" | "TG" | "TE" {
  return getRepairCompany(val).code;
}

/**
 * Returns complete print-ready company metadata (Logo, Thai & English names, address, tel/fax)
 */
export function getCompanyPrintInfo(val?: string | null) {
  const comp = getRepairCompany(val);
  return COMPANY_PRINT_MAP[comp.code] || COMPANY_PRINT_MAP.TG;
}
