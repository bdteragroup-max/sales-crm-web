import prisma from './src/app/lib/db';

async function main() {
    const users = await prisma.user.findMany({
        where: { fullName: { in: ['นางสาววิชุดา พืชผักหวาน', 'นางสาวกมลฉัตร เจริญสุข', 'นายชญตว์ สีทะโน'] } }
    });
    
    console.log("Users:", users.map(u => ({ id: u.id, name: u.fullName })));
    
    const userIds = users.map(u => u.id);
    
    const quotes = await prisma.quotation.findMany({
        where: { salespersonId: { in: userIds } },
        select: { id: true, salespersonId: true, status: true, createdAt: true, actualClosingAmount: true, totalAmountBeforeVat: true }
    });
    
    console.log(`Found ${quotes.length} total quotes for these 3 users.`);
    
    for (const u of users) {
        const uQuotes = quotes.filter(q => q.salespersonId === u.id);
        console.log(`User ${u.fullName} has ${uQuotes.length} quotes:`, uQuotes.map(q => q.status));
    }
}
main().finally(() => process.exit(0));
