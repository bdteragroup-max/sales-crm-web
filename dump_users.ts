import prisma from './src/app/lib/db';

async function main() {
  const startDate = new Date('2026-06-30T17:00:00.000Z');
  const endDate = new Date('2026-07-31T16:59:59.999Z');
  
  const users = await prisma.user.findMany({
    where: { 
      OR: [
        { fullName: { contains: 'เณศรา' } },
        { fullName: { contains: 'ผกามาศ' } },
        { fullName: { contains: 'อาบูบากัส' } }
      ]
    },
    include: {
      quotations: {
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { status: true, actualClosingAmount: true, totalAmountBeforeVat: true }
      },
      telesales: { 
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { id: true } 
      }
    }
  });

  for (const u of users) {
    const totalQ = u.quotations.length;
    const wonQ = u.quotations.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
    const sales = wonQ.reduce((sum, q) => sum + (q.actualClosingAmount || 0), 0);
    const winRate = totalQ > 0 ? (wonQ.length / totalQ) * 100 : 0;
    console.log(`${u.fullName}:`);
    console.log(`  Telesales: ${u.telesales.length}`);
    console.log(`  Total Quotes: ${totalQ}`);
    console.log(`  Won Quotes: ${wonQ.length}`);
    console.log(`  Win Rate: ${winRate.toFixed(2)}%`);
    console.log(`  Sales (actualClosingAmount): ${sales}`);
  }
}
main().finally(() => process.exit(0));
