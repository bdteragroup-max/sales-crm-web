const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: { jobNumber: { startsWith: 'RO' } },
    orderBy: { jobNumber: 'desc' }
  });
  console.log("Found RO Jobs:", jobs.map(j => j.jobNumber));
  
  const ro = await prisma.repairOrder.findMany();
  console.log("Repair Orders count:", ro.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
