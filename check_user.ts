import prisma from './src/app/lib/db';
async function main() {
    const users = await prisma.employeeSale.findMany({
        where: { fullName: { contains: 'วรัญญา' } }
    });
    console.log("Found:", users);
}
main().finally(() => process.exit(0));
