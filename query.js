const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.quotation.findFirst({
    where: { actualClosingAmount: { not: null }, totalAmountBeforeVat: { not: null } },
    select: { actualClosingAmount: true, totalAmountBeforeVat: true, status: true, rejectReason: true, winLossReason: true, billingDate: true, statusChangedAt: true }
  });
  console.log('Quotation sample:', q);
  
  if (q && q.actualClosingAmount && q.totalAmountBeforeVat) {
    console.log('Ratio (actual / beforeVat):', q.actualClosingAmount / q.totalAmountBeforeVat);
  }

  const lead = await prisma.marketingLead.findFirst({
    where: { OR: [{ companyName: { not: null } }, { customerName: { not: null } }] },
    select: { customerName: true, companyName: true }
  });
  console.log('Lead sample:', lead);
}

main().catch(console.error).finally(() => prisma.$disconnect());
