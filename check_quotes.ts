import prisma from './src/app/lib/db';
async function main() {
    const quotes = await prisma.quotation.findMany({
        select: { id: true, salespersonId: true, status: true }
    });
    console.log("Quotes:", quotes.length);
    const users = await prisma.user.findMany({
        where: { id: { in: quotes.map(q => q.salespersonId).filter(Boolean) as string[] } },
        select: { id: true, fullName: true, role: true, isActive: true }
    });
    console.log("Users with quotes:", users);
}
main().finally(() => process.exit(0));
