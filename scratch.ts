import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmphq0uj30004s4uago3lr1wu' },
  });
  console.log(user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
