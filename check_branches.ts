import prisma from './src/app/lib/db';
async function main() {
  const users = await prisma.user.findMany({
    select: {
      fullName: true,
      employeeSale: {
        select: { branch: true }
      }
    }
  });
  console.log(users.map(u => ({ name: u.fullName, branch: u.employeeSale?.branch })));
}
main().finally(() => process.exit(0));
