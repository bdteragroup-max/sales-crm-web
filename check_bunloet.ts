import prisma from './src/app/lib/db';

async function main() {
  const user = await prisma.user.findFirst({
    where: { employeeId: "TP57001" }
  });
  console.log("Bunloet:", user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
