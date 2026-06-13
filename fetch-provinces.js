const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function run() {
  const companies = await prisma.company.groupBy({
    by: ['province'],
    _count: { id: true },
    where: { province: { not: null } }
  });
  console.log(companies.map(c => c.province));
}

run().catch(console.error).finally(() => prisma.$disconnect());
