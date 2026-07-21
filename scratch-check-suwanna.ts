import prisma from './src/app/lib/db';

async function main() {
  const suwanna = await prisma.user.findFirst({
    where: { fullName: { contains: 'สุวรรณา' } }
  });
  if (suwanna) {
    console.log(`\nSuwanna ID: ${suwanna.id}, Role: "${suwanna.role}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
