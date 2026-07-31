const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
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
check().finally(() => prisma.$disconnect());
