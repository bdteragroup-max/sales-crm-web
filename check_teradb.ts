import { teraDb } from './src/app/lib/teraDb';

async function main() {
    const hrEmp = await teraDb.employees.findFirst({
        where: { emp_id: 'TP69027' }
    });
    console.log("HR Emp TP69027:", hrEmp);

    const allHrBranches = await teraDb.employees.findMany({
        select: { branch_id: true },
        distinct: ['branch_id']
    });
    console.log("All HR branches:", allHrBranches);
}
main().finally(() => process.exit(0));
