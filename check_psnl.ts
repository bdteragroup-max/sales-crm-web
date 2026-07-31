import prisma from './src/app/lib/db';
async function main() {
    const users = await prisma.employeeSale.findMany({
        where: { branch: 'PSNL01' }
    });
    console.log("PSNL01 users:", users);
    
    const all = await prisma.employeeSale.findMany({
        select: { branch: true },
        distinct: ['branch']
    });
    console.log("All branches in DB:", all);
}
main().finally(() => process.exit(0));
