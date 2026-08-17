import prisma from '../src/app/lib/db';
import { teraDb } from '../src/app/lib/teraDb';

async function main() {
  console.log("Fetching CRM users...");
  const crmUsers = await prisma.user.findMany({
    include: { employeeSale: true }
  });

  console.log("Fetching HR employees...");
  const hrEmployees = await teraDb.employees.findMany({
    where: { is_active: true },
    select: { emp_id: true, branch_id: true, name: true }
  });

  const hrMap = new Map();
  for (const emp of hrEmployees) {
    if (emp.branch_id) {
      hrMap.set(emp.emp_id, emp.branch_id);
    }
  }

  let usersUpdated = 0;
  let quotesUpdated = 0;

  for (const user of crmUsers) {
    if (!user.employeeId) continue;
    
    const hrBranch = hrMap.get(user.employeeId);
    const crmBranch = user.employeeSale?.branch;

    if (hrBranch && hrBranch !== crmBranch) {
      // 1. Update Employee Sale Branch
      if (user.employeeSale) {
        await prisma.employeeSale.update({
          where: { id: user.employeeSale.id },
          data: { branch: hrBranch }
        });
        usersUpdated++;
        console.log(`[USER] Updated ${user.fullName} (${user.employeeId}) from ${crmBranch || 'NULL'} to ${hrBranch}`);
      }
      
      // 2. Update their Quotations
      // The user requested: "move them to the branch where they are located."
      // So we update ALL quotations for this user to match their new HR branch.
      const updatedQuotes = await prisma.quotation.updateMany({
        where: { salespersonId: user.id },
        data: { salesBranch: hrBranch }
      });
      
      quotesUpdated += updatedQuotes.count;
      if (updatedQuotes.count > 0) {
        console.log(`[QUOTES] Migrated ${updatedQuotes.count} quotations for ${user.fullName} to ${hrBranch}`);
      }
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total Employee Records Updated: ${usersUpdated}`);
  console.log(`Total Quotation Records Migrated: ${quotesUpdated}`);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  teraDb.$disconnect();
});
