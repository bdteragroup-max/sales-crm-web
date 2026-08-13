import prisma from './src/app/lib/db';

async function findUser() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Teerawat', mode: 'insensitive' } },
        { fullName: { contains: 'ธีรวัฒน์', mode: 'insensitive' } }
      ]
    }
  });
  console.log(users);
}

findUser().finally(() => prisma.$disconnect());
