const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.quotation.findMany({
    where: {
      totalAmountBeforeVat: {
        gte: 766000,
        lte: 767000
      }
    }
  });
  console.log(JSON.stringify(qs, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
