const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.quotation.findMany({
    select: { status: true },
    distinct: ['status']
  });
  console.log("Quotation statuses:", statuses.map(s => s.status));
}
main().finally(() => prisma.$disconnect());
