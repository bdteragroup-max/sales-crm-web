import prisma from '../app/lib/db'

async function run() {
  const users = await prisma.user.groupBy({ by: ['role'], _count: true });
  console.log(users);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
