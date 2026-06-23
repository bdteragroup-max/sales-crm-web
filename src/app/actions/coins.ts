'use server'

import { getUser } from '@/app/lib/dal'
import prisma from '@/app/lib/db'

export async function getUserCoins() {
  try {
    const user = await getUser()
    if (!user || !user.employeeId) {
      return { success: false, error: 'Unauthorized or missing employee ID' }
    }

    const coins = await prisma.employee_coins.findMany({
      where: { emp_id: user.employeeId },
      include: { coin_types: true }
    })

    return { success: true, data: coins }
  } catch (error) {
    console.error('Failed to get user coins:', error)
    return { success: false, error: 'Failed to fetch coins' }
  }
}

export async function getCoinTransactions(limit: number = 50) {
  try {
    const user = await getUser()
    if (!user || !user.employeeId) {
      return { success: false, error: 'Unauthorized or missing employee ID' }
    }

    const ledgers = await prisma.coin_ledgers.findMany({
      where: { emp_id: user.employeeId },
      include: { coin_types: true },
      orderBy: { created_at: 'desc' },
      take: limit
    })

    return { success: true, data: ledgers }
  } catch (error) {
    console.error('Failed to get coin ledgers:', error)
    return { success: false, error: 'Failed to fetch coin transactions' }
  }
}

function calculateSalesGold(dealValue: number): number {
  if (dealValue <= 50000) return 0;
  if (dealValue < 100000) return 1;
  if (dealValue <= 200000) return 2;
  return 3;
}

export async function awardGoldOnDealClosed(quotationId: string, goldCoinTypeId: string = "GOLD") {
  try {
    let result = { success: true, awardedGold: 0, message: '' };
    await prisma.$transaction(async (tx) => {
      // Check if already awarded to prevent double-awarding on multiple saves
      const existingLedger = await tx.coin_ledgers.findFirst({
        where: { source_key: `deal_closed:${quotationId}:sales` }
      });
      if (existingLedger) return;

      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: { salesperson: true }
      });
      
      if (!quotation || !quotation.salesperson?.employeeId) return;
      
      const salesGold = calculateSalesGold(quotation.totalAmountBeforeVat || 0);
      if (salesGold === 0) return; // Deal too small

      const empId = quotation.salesperson.employeeId;

      // Award Sales Rep
      await tx.employee_coins.upsert({
        where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
        update: { balance: { increment: salesGold } },
        create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: salesGold }
      });

      await tx.coin_ledgers.create({
        data: {
          emp_id: empId,
          coin_type_id: goldCoinTypeId,
          amount: salesGold,
          transaction_type: "EARN",
          source_key: `deal_closed:${quotationId}:sales`,
          description: `Deal closed - value ${quotation.totalAmountBeforeVat} THB`
        }
      });

      // Award Manager — Occurs only when salesGold > 0
      const salesRepEmployee = await tx.employees.findUnique({
        where: { emp_id: empId }
      });

      if (salesRepEmployee?.supervisor_id) {
        await tx.employee_coins.upsert({
          where: { emp_id_coin_type_id: { emp_id: salesRepEmployee.supervisor_id, coin_type_id: goldCoinTypeId } },
          update: { balance: { increment: 1 } },
          create: { emp_id: salesRepEmployee.supervisor_id, coin_type_id: goldCoinTypeId, balance: 1 }
        });

        await tx.coin_ledgers.create({
          data: {
            emp_id: salesRepEmployee.supervisor_id, 
            coin_type_id: goldCoinTypeId,
            amount: 1, 
            transaction_type: "EARN",
            source_key: `deal_closed:${quotationId}:manager`,
            description: `Team member closed deal ${quotationId}`
          }
        });
      }

      result = { 
        success: true, 
        awardedGold: salesGold, 
        message: `คุณได้รับ ${salesGold} เหรียญทอง จากยอดขาย ${quotation.totalAmountBeforeVat?.toLocaleString() || 0} บาท` 
      };
    });
    return result;
  } catch (error) {
    console.error('Failed to award gold on deal closed:', error);
    return { success: false, error: 'Failed to award gold' };
  }
}

export async function checkAndAwardDailyCallCoins(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

    const callCount = await prisma.telesale.count({
      where: {
        userId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    let awardedGold = 0;

    await prisma.$transaction(async (tx) => {
      if (callCount >= 60) {
        const sourceKey60 = `telesale_60_calls:${dateStr}:${userId}`;
        const existing60 = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey60 }
        });

        if (!existing60) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: 1 } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: 1 }
          });
          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: 1,
              transaction_type: "EARN",
              source_key: sourceKey60,
              description: `ครบ 60 สายประจำวันที่ ${dateStr}`
            }
          });
          awardedGold += 1;
        }
      }

      if (callCount >= 100) {
        const sourceKey100 = `telesale_100_calls:${dateStr}:${userId}`;
        const existing100 = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey100 }
        });

        if (!existing100) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: 1 } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: 1 }
          });
          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: 1,
              transaction_type: "EARN",
              source_key: sourceKey100,
              description: `ครบ 100 สายประจำวันที่ ${dateStr}`
            }
          });
          awardedGold += 1;
        }
      }
    });

    return { success: true, awardedGold, callCount };
  } catch (error) {
    console.error('Error checking/awarding daily call coins:', error);
    return { success: false, error: 'Failed to award daily call coins' };
  }
}
