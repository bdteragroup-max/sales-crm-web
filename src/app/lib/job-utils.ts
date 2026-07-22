import prisma from "@/app/lib/db";

// Moved extractCompanyCode to src/utils/company-utils.ts// ================================================
// Generate Job Number Atomic (Prevents race conditions)
// JB{yearBe}-{month}{seq4} e.g., JB69-040095
// ================================================
export async function generateJobNumber(closedDate: Date): Promise<string> {
  const yearBe = (closedDate.getFullYear() + 543) % 100; // 2569 → 69
  const month = closedDate.getMonth() + 1; // 1-12

  let jobNumber = "";
  let exists = true;

  while (exists) {
    // Atomic upsert: If there is no row → Create new lastNumber=1 
    // If already exists → increment 
    const updated = await prisma.$transaction(async (tx) => { 
      const existing = await tx.jobRunningNumber.findUnique({ 
        where: { yearBe_month: { yearBe, month } }, 
      }); 

      if (existing) { 
        return tx.jobRunningNumber.update({ 
          where: { yearBe_month: { yearBe, month } }, 
          data: { lastNumber: { increment: 1 } }, 
        }); 
      } else { 
        return tx.jobRunningNumber.create({ 
          data: { yearBe, month, lastNumber: 1 }, 
        }); 
      } 
    }); 

    // Format: JB69-040095 
    const yearStr = String(yearBe).padStart(2, "0"); 
    const monthStr = String(month).padStart(2, "0");
    const seqStr = String(updated.lastNumber).padStart(4, "0");

    jobNumber = `JB${yearStr}-${monthStr}${seqStr}`;

    const existingJob = await prisma.job.findUnique({
      where: { jobNumber }
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
