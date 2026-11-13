import prisma from "@/app/lib/db";

type JobNumberDbClient = Pick<typeof prisma, "jobRunningNumber" | "job">;

// ================================================
// Shared Job / Quotation Normalization & Lock Helpers
// ================================================

/** Return trimmed non-empty string or null so empty strings never clobber existing data. */
export function nonEmptyTrimmed(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Determine whether a Quotation status triggers / maintains a Job and Order. */
export function isClosedQuotationStatus(status?: string | null): boolean {
  const s = status?.trim();
  return s === "เปิดบิลแล้ว" || Boolean(s?.startsWith("PO"));
}

/**
 * Strip trailing revision suffixes (e.g. `_Rev.5`, `_Rev1`, `_rev.3`, `-Rev2`, ` Rev.1`)
 * and normalize case/whitespace so revisions of the same Quotation share a base key.
 */
export function extractBaseQuotationNumber(qtNo?: string | null): string | null {
  const trimmed = nonEmptyTrimmed(qtNo);
  if (!trimmed) return null;
  const base = trimmed
    .replace(/(?:[\s_-]+rev\.?\s*\d*|rev\.\s*\d+)+$/i, "")
    .trim()
    .toUpperCase();
  return base.length > 0 ? base : trimmed.toUpperCase();
}

/** Normalize a company/customer name for tolerant matching across jobs and quotations. */
export function normalizeCompanyKey(name?: string | null): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Derive two deterministic signed 32-bit integers for `pg_advisory_xact_lock(int, int)`. */
export function stringToAdvisoryLockIds(key: string): [number, number] {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return [h1 | 0, h2 | 0];
}

// Moved extractCompanyCode to src/utils/company-utils.ts
// ================================================
// Generate Job Number Atomic (Prevents race conditions)
// JB{yearBe}-{month}{seq4} e.g., JB69-040095
// ================================================
export async function generateJobNumber(
  closedDate: Date,
  tx?: JobNumberDbClient
): Promise<string> {
  const yearBe = (closedDate.getFullYear() + 543) % 100; // 2569 -> 69
  const month = closedDate.getMonth() + 1; // 1-12
  const db: JobNumberDbClient = tx ?? prisma;

  let jobNumber = "";
  let exists = true;

  const incrementCounter = async (client: JobNumberDbClient) => {
    const existing = await client.jobRunningNumber.findUnique({
      where: { yearBe_month: { yearBe, month } },
    });

    if (existing) {
      return client.jobRunningNumber.update({
        where: { yearBe_month: { yearBe, month } },
        data: { lastNumber: { increment: 1 } },
      });
    }
    return client.jobRunningNumber.create({
      data: { yearBe, month, lastNumber: 1 },
    });
  };

  while (exists) {
    // Serialize counter reads/writes on (yearBe, month) inside the transaction
    const updated = tx
      ? await incrementCounter(tx)
      : await prisma.$transaction(incrementCounter);

    // Format: JB69-040095
    const yearStr = String(yearBe).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const seqStr = String(updated.lastNumber).padStart(4, "0");

    jobNumber = `JB${yearStr}-${monthStr}${seqStr}`;

    const existingJob = await db.job.findUnique({
      where: { jobNumber },
    });

    if (!existingJob) {
      exists = false;
    }
  }

  return jobNumber;
}

// ================================================
// Map productType in QT → default jobType
// (User can modify later)
// ================================================
export function mapProductTypeToJobType(productType?: string | null): string {
  const mapping: Record<string, string> = {
    SALE: "งานขาย",
    REPAIR: "งานซ่อม",
    INSTALL: "งานติดตั้ง",
    SALE_INSTALL: "งานขาย + ติดตั้ง",
    CABINET: "งานตู้",
    PROJECT: "งานโปรเจค",
    CONSIGN: "สินค้าฝากขาย",
    SERVICE: "ค่าบริการ",
    CHECK: "งานตรวจเช็ค",
    CLAIM: "งานเคลม",
  };
  return mapping[productType?.toUpperCase() ?? ""] ?? "งานขาย";
}
