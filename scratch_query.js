const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adCampaignStatuses = await prisma.adCampaign.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });
  console.log("AdCampaign Statuses:", adCampaignStatuses);
  
  const quotationStatuses = await prisma.quotation.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });
  console.log("Quotation Statuses:", quotationStatuses);
}

main().finally(() => prisma.$disconnect());
