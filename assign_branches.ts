import prisma from './src/app/lib/db';
async function main() {
  const users = await prisma.user.findMany({
    where: { quotations: { some: {} } },
    take: 10
  });
  
  if (users.length > 0) {
    for (const user of users.slice(0, 5)) {
      await prisma.employeeSale.upsert({
        where: { userId: user.id },
        update: { branch: 'KK01' },
        create: { userId: user.id, branch: 'KK01', fullName: user.fullName || 'Unknown' }
      });
    }
    for (const user of users.slice(5, 10)) {
      await prisma.employeeSale.upsert({
        where: { userId: user.id },
        update: { branch: 'CMI01' },
        create: { userId: user.id, branch: 'CMI01', fullName: user.fullName || 'Unknown' }
      });
    }
    console.log("Successfully assigned branches.");
  }
}
main().finally(() => process.exit(0));
