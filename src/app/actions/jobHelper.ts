import prisma from "@/app/lib/db";

export async function createAutoJob(quotation: any, user: any, newStatus: string) {
  // Only create Job if status is Billed/PO
  if (!(newStatus === 'เปิดบิลแล้ว' || newStatus.startsWith('PO'))) {
    return;
  }

  try {
    const existingJob = await prisma.job.findFirst({
      where: { quotationId: quotation.id }
    });
    if (existingJob) return;

    // Fetch full quotation to ensure relations are present
    const fullQuotation = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      include: { company: true, salesperson: true }
    });
    if (!fullQuotation) return;

    // 1. Company Code Extraction
    // QT68-P-T1155 -> parts[2] = 'T1155' -> 'T'
    let char = '';
    const qtNumber = fullQuotation.quotationNumber || '';
    const parts = qtNumber.split('-');
    if (parts.length >= 3) {
      char = parts[2]?.[0]?.toUpperCase() || '';
    } else {
      // Fallback
      char = qtNumber.charAt(4)?.toUpperCase() || '';
    }
    
    const companyMap: Record<string, string> = { T: 'TP', G: 'TG', E: 'TE' };
    const companyCode = companyMap[char] || 'UNKNOWN';

    // 2. Year and Month logic
    const now = new Date();
    const yearBe = now.getFullYear() + 543;
    const shortYearBe = yearBe.toString().slice(-2); // e.g. 69
    const month = now.getMonth() + 1;
    const strMonth = month.toString().padStart(2, '0'); // e.g. 04

    // 3. Atomic Running Number Generation
    const sequenceRecord = await prisma.jobRunningNumber.upsert({
      where: {
        yearBe_month: {
          yearBe,
          month
        }
      },
      update: {
        lastNumber: { increment: 1 }
      },
      create: {
        yearBe,
        month,
        lastNumber: 1
      }
    });

    const sequence = sequenceRecord.lastNumber.toString().padStart(4, '0');
    const jobNumber = `JB${shortYearBe}-${strMonth}${sequence}`;

    // 4. Create Job
    await prisma.job.create({
      data: {
        jobNumber,
        companyCode,
        jobType: "", // Manual select
        month,
        yearBe,
        dateClosed: new Date(),
        customerName: fullQuotation.company?.companyName || "Unknown Customer",
        item: fullQuotation.subject || fullQuotation.productType || "",
        quotationNumber: qtNumber,
        poNumber: fullQuotation.poNumber || null,
        sellerName: user?.fullName || fullQuotation.salesperson?.fullName || "Unknown Seller",
        quotationId: fullQuotation.id
      }
    });

  } catch (error) {
    console.error("Error creating auto job:", error);
  }
}
