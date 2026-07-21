import prisma from './src/app/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    where: { fullName: { contains: 'สุวรรณา' } }
  });
  console.log('Users with สุวรรณา:', users.map(u => ({ id: u.id, name: u.fullName, role: u.role })));
  
  const users2 = await prisma.user.findMany({
    where: { fullName: { contains: 'ศิริกิจ' } }
  });
  console.log('Users with ศิริกิจ:', users2.map(u => ({ id: u.id, name: u.fullName, role: u.role })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
