import prisma from './src/app/lib/db';

async function main() {
  const ceYear = 2026;
  const startDate = new Date(`${ceYear}-01-01T00:00:00+07:00`);
  const endDate = new Date(`${ceYear}-06-30T23:59:59+07:00`);
  
  const wonQuotations = await prisma.quotation.count({
    where: {
      status: { in: ["เปิดบิลแล้ว", "PO แล้วรอเงินโอน"] },
      OR: [
        { quotationDate: { gte: startDate, lte: endDate } },
        { poDate: { gte: startDate, lte: endDate } },
        { billingDate: { gte: startDate, lte: endDate } }
      ]
    }
  });
  console.log(`Won quotations in Round 1 (Jan-Jun) 2026: ${wonQuotations}`);
}

main().catch(console.error).finally(() => process.exit(0));
