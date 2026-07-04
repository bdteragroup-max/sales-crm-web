import prisma from './app/lib/db';

async function main() {
  const expenses = await prisma.branchExpense.findMany();
  console.log("Total expenses:", expenses.length);
  if (expenses.length > 0) {
    console.log("Sample expense:", expenses[0]);
    
    const uniqueTypes = [...new Set(expenses.map(e => e.expenseType))];
    console.log("Unique expense types:", uniqueTypes);

    const travelExp = expenses.filter(e => e.expenseType.includes('Travel') || e.expenseType.includes('เดินทาง'));
    console.log("Travel expenses count:", travelExp.length);
    if (travelExp.length > 0) {
      console.log("Sample travel exp:", travelExp[0]);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
