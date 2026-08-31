import prisma from '../app/lib/db'

async function run() {
  const res = await prisma.adCampaign.groupBy({ by: ['status'], _count: true });
  console.log('AdCampaign Statuses:', res);
  
  const quotationRes = await prisma.quotation.groupBy({ by: ['status'], _count: true });
  console.log('Quotation Statuses:', quotationRes);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
