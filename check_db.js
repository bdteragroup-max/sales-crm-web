const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ro = await prisma.repairOrder.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(ro);
}
main().catch(console.error).finally(() => prisma.$disconnect());
