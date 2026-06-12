import prisma from '../src/app/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { employeeSale: true }
  });

  const branchList = ['Head Office', 'ชลบุรี', 'ระยอง', 'ขอนแก่น', 'เชียงใหม่'];
  const expenseTypes = ['Travel', 'Meals', 'Operations', 'Marketing', 'Allowance', 'Fuel'];

  // Delete all existing to avoid duplicates if rerun
  await prisma.branchExpense.deleteMany({});

  for (const user of users) {
    const branch = user.employeeSale?.branch || branchList[Math.floor(Math.random() * branchList.length)];
    
    // Generate expenses for the last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const numExpenses = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numExpenses; j++) {
        await prisma.branchExpense.create({
          data: {
            branch,
            salespersonId: user.id,
            expenseType: expenseTypes[Math.floor(Math.random() * expenseTypes.length)],
            amount: Math.floor(Math.random() * 8000) + 500, // random amount 500 - 8500
            date: date,
            notes: 'Mock expense record'
          }
        });
      }
    }
  }

  // Also create some generic branch expenses without a specific salesperson
  for (const branch of branchList) {
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      await prisma.branchExpense.create({
        data: {
          branch,
          expenseType: 'Office Rent & Utilities',
          amount: Math.floor(Math.random() * 20000) + 30000, // 30k - 50k
          date: date,
          notes: 'Fixed monthly operational cost'
        }
      });
    }
  }

  console.log('Successfully seeded BranchExpenses for users and branches.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
