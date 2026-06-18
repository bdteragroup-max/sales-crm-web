import prisma from './src/app/lib/db';

async function main() {
  const lineUserId = "Ue73ef471a8a45b0931353f9045a6d25d";
  const emp = await prisma.employees.findUnique({
    where: { line_user_id: lineUserId }
  });
  console.log("Employee in DB:", emp?.name, emp?.emp_id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
