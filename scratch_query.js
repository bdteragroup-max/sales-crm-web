const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.job.findUnique({
    where: { jobNumber: 'JB69-060041' },
    include: { quotation: true }
  });
  console.log(JSON.stringify(job, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
