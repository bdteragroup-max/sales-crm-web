const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking for invalid branch_ids in employees table...");
  
  // Get all valid branch IDs
  const branches = await prisma.branches.findMany();
  const validBranchIds = branches.map(b => b.id);
  console.log(`Found ${validBranchIds.length} valid branches.`);

  // Find employees with a branch_id that is NOT in the branches table
  const invalidEmployees = await prisma.employees.findMany({
    where: {
      branch_id: {
        not: null,
        notIn: validBranchIds.length > 0 ? validBranchIds : ['dummy_so_it_works_if_empty']
      }
    }
  });

  if (invalidEmployees.length === 0) {
    // If there are no valid branches at all, maybe all branch_ids are invalid?
    if (validBranchIds.length === 0) {
      const allEmpsWithBranch = await prisma.employees.findMany({
        where: { branch_id: { not: null } }
      });
      console.log(`Found ${allEmpsWithBranch.length} employees with branch_id, but there are NO branches in the database!`);
      
      const res = await prisma.employees.updateMany({
        where: { branch_id: { not: null } },
        data: { branch_id: null }
      });
      console.log(`Fixed ${res.count} employees by setting branch_id to null.`);
    } else {
      console.log("No invalid branch_ids found. The constraint might be failing for another reason.");
    }
  } else {
    console.log(`Found ${invalidEmployees.length} employees with an invalid branch_id.`);
    
    // Set them to null so the foreign key constraint can be added
    const res = await prisma.employees.updateMany({
      where: {
        emp_id: { in: invalidEmployees.map(e => e.emp_id) }
      },
      data: {
        branch_id: null
      }
    });
    console.log(`Fixed ${res.count} employees by setting branch_id to null.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
