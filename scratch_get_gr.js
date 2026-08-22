const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function main() {
  const ret = await prisma.goodsReturn.findFirst();
  console.log(ret?.id);
}
main().finally(() => prisma.$disconnect());
