import prisma from './src/app/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    select: { fullName: true, role: true }
  });
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
