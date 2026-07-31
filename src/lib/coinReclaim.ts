import prisma from '@/app/lib/db';

export async function reclaimCoinsOnInactive(empId: string) {
  await prisma.$transaction(async (tx) => {
    // Prevent double reclaim
    const alreadyReclaimed = await tx.coin_ledgers.count({
      where: {
        emp_id: empId,
        transaction_type: "RECLAIM_INACTIVE"
      }
    });
    
    if (alreadyReclaimed > 0) return; // Already reclaimed

    // Check if rewards have been redeemed
    const hasRedeemed = await tx.reward_redemptions.count({
      where: { emp_id: empId }
    });

    // Retrieve current balances > 0
    const coinBalances = await tx.employee_coins.findMany({
      where: {
        emp_id: empId,
        balance: { gt: 0 }
      }
    });

    if (coinBalances.length === 0) return;

    for (const coin of coinBalances) {
      // Deduct coins to 0
      await tx.employee_coins.update({
        where: { id: coin.id },
        data: { balance: 0 }
      });

      // Save to ledger
      await tx.coin_ledgers.create({
        data: {
          emp_id: empId,
          coin_type_id: coin.coin_type_id,
          amount: -coin.balance,
          transaction_type: "RECLAIM_INACTIVE",
          description: hasRedeemed > 0
            ? `Reclaim coins because employee is Inactive (has already redeemed rewards ${hasRedeemed} times)`
            : "Reclaim coins because employee is Inactive (never used)",
          created_at: new Date()
        }
      });
    }
  });
}
