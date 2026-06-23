import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  const types = await prisma.coin_types.findMany();
  console.log(JSON.stringify(types, null, 2));
}

main().catch(console.error);
