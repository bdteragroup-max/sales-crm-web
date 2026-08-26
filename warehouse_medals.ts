import prisma from './src/app/lib/db';

async function checkMedals() {
  const month = 8;
  const year = 2026;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  
  try {
    const warehouseUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'warehouse', mode: 'insensitive' } },
          { role: { contains: 'store', mode: 'insensitive' } },
          { role: { contains: 'คลังสินค้า', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of warehouseUsers) {
      // 1. Issuance (MaterialRequisition)
      const materialRequisitions = await prisma.materialRequisition.count({
        where: {
          approverId: user.id,
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // 2. Incoming Goods Receipt (GoodsReceipt)
      const goodsReceipts = await prisma.goodsReceipt.count({
        where: {
          recipient: user.fullName,
          isCompleteDelivery: true,
          receivedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalValidItems = materialRequisitions + goodsReceipts;

      let targetTierGold = 0;
      if (totalValidItems >= 150) targetTierGold = 3;
      else if (totalValidItems >= 100) targetTierGold = 2;
      else if (totalValidItems >= 50) targetTierGold = 1;

      results.push({
        name: user.fullName,
        role: user.role,
        materialRequisitions,
        goodsReceipts,
        totalValidItems,
        medals: targetTierGold
      });
    }
    
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMedals();
