import prisma from '@/app/lib/db';

export async function reclaimCoinsOnInactive(empId: string) {
  return await prisma.$transaction(async (tx) => {
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

    if (coinBalances.length === 0) return { reclaimedCount: 0, coins: [] };

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
            ? `ดึงเหรียญคืนเนื่องจากพนักงานพ้นสภาพการทำงาน (เคยแลกรางวัลแล้ว ${hasRedeemed} ครั้ง)`
            : "ดึงเหรียญคืนเนื่องจากพนักงานพ้นสภาพการทำงาน",
          created_at: new Date()
        }
      });
    }

    return { reclaimedCount: coinBalances.length, coins: coinBalances };
  });
}

/**
 * Synchronizes with HR database (teraDb) and automatically claws back coins
 * for any employee who has resigned or is marked inactive.
 */
export async function syncAndClawbackResignedEmployees() {
  try {
    const { teraDb } = await import('@/app/lib/teraDb');

    // 1. Fetch resigned / inactive in HR database
    let resignedEmpIds: string[] = [];
    try {
      const hrResigned = await teraDb.employees.findMany({
        where: {
          OR: [
            { is_active: false },
            { resignation_date: { not: null } }
          ]
        },
        select: { emp_id: true }
      });
      resignedEmpIds = hrResigned.map(e => e.emp_id).filter(Boolean);
    } catch (e) {
      console.warn('Failed to query HR database for resigned employees:', e);
    }

    // 2. Fetch inactive in CRM User table
    const crmInactive = await prisma.user.findMany({
      where: { isActive: false },
      select: { employeeId: true }
    });
    const crmInactiveIds = crmInactive.map(u => u.employeeId).filter(Boolean) as string[];

    const allInactiveEmpIds = Array.from(new Set([...resignedEmpIds, ...crmInactiveIds]));
    if (allInactiveEmpIds.length === 0) return { success: true, reclaimedCount: 0 };

    // 3. Deactivate any active CRM users who have resigned in HR
    if (resignedEmpIds.length > 0) {
      await prisma.user.updateMany({
        where: { employeeId: { in: resignedEmpIds }, isActive: true },
        data: { isActive: false }
      });

      await prisma.employees.updateMany({
        where: { emp_id: { in: resignedEmpIds }, is_active: true },
        data: { is_active: false }
      }).catch(() => null);
    }

    // 4. Find all employee_coins with balance > 0 for these employees
    const coinsToReclaim = await prisma.employee_coins.findMany({
      where: {
        emp_id: { in: allInactiveEmpIds },
        balance: { gt: 0 }
      },
      select: { emp_id: true }
    });

    const uniqueTargetEmpIds = Array.from(new Set(coinsToReclaim.map(c => c.emp_id)));
    const results = [];

    for (const empId of uniqueTargetEmpIds) {
      const res = await reclaimCoinsOnInactive(empId);
      results.push({ empId, ...res });
    }

    return { success: true, processedEmployees: uniqueTargetEmpIds.length, results };
  } catch (err) {
    console.error('Error in syncAndClawbackResignedEmployees:', err);
    return { success: false, error: err };
  }
}
