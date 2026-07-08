const { PrismaClient } = require('./src/generated/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { fullName: { contains: 'นายพชรพล' } }
  });
  console.log('User:', user);

  if (user?.employeeId) {
    const emp = await (prisma as any).employees.findUnique({
      where: { emp_id: user.employeeId }
    });
    console.log('Employee:', emp);
    
    const empSale = await prisma.employeeSale.findUnique({
      where: { employeeId: user.employeeId }
    });
    console.log('EmployeeSale:', empSale);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
