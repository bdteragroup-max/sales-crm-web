import prisma from './src/app/lib/db';
async function main() {
    const statuses = await prisma.quotation.findMany({
        select: { status: true },
        distinct: ['status']
    });
    console.log("Statuses:", statuses);
}
main().finally(() => process.exit(0));
