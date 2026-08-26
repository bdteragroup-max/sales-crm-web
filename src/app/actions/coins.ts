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
  if (dealValue <= 150000) return 0;
  if (dealValue <= 250000) return 1;
  if (dealValue <= 350000) return 2;
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

function getTierGold(jobCount: number): number {
  if (jobCount >= 30) return 3;
  if (jobCount >= 20) return 2;
  if (jobCount >= 10) return 1;
  return 0;
}

export async function checkAndAwardServiceGold(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true, role: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const now = new Date();
    // Start and end of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await prisma.$transaction(async (tx) => {
      // 1. Repair Orders via JobStepLog
      const repairCount = await tx.jobStepLog.count({
        where: {
          completedByUserId: userId,
          step: { contains: 'ซ่อมเสร็จ' }, // Using 'ซ่อมเสร็จ' or similar completed step
          completedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // 2. Estimations via CustomerRequirement
      const estimationCount = await tx.customerRequirement.count({
        where: {
          estimatedByUserId: userId,
          estimationStatus: "ESTIMATED",
          estimatedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // 3. Installations via InstallationOrder
      const installationCount = await tx.installationOrder.count({
        where: {
          technicianUserId: userId,
          status: "Completed",
          updatedAt: { gte: monthStart, lt: monthEnd } // Using updatedAt as proxy for completed time
        }
      });

      // 4. Cabinet Assembly Jobs (QC Passed)
      const cabinetAssemblyCount = await tx.cabinetAssemblyJob.count({
        where: {
          technicianId: userId,
          status: "COMPLETED",
          updatedAt: { gte: monthStart, lt: monthEnd },
          qcReport: {
            qcStatus: "Passed"
          }
        }
      });

      // 5. Technician Tasks (Done)
      const technicianTaskCount = await tx.technicianTask.count({
        where: {
          technicianIds: { has: userId },
          status: "DONE",
          completedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // Determine total jobs based on user role
      const roleStr = (user.role || '').toLowerCase();
      const isTechnician = roleStr.includes('technician') || roleStr.includes('ช่าง') || roleStr.includes('ซ่อม');
      const isServiceEng = roleStr.includes('service engineer');

      let totalJobs = 0;
      if (isServiceEng) {
        // Service Engineers: count all 3 categories (Repairs + Estimations + Installations)
        totalJobs = repairCount + estimationCount + installationCount;
      } else if (isTechnician) {
        // Technicians: count Cabinet Assembly Jobs + Assigned Tasks (with QC passed)
        totalJobs = cabinetAssemblyCount + technicianTaskCount;
      } else {
        totalJobs = repairCount + estimationCount + installationCount; // Fallback
      }

      const targetTierGold = getTierGold(totalJobs);

      // Check existing awarded tier
      const existingAward = await tx.coin_ledgers.findFirst({
        where: {
          emp_id: empId,
          source_key: { startsWith: `service_tier:${empId}:${monthKey}:` }
        },
        orderBy: { amount: 'desc' }
      });

      let alreadyAwardedTier = 0;
      if (existingAward && existingAward.source_key) {
        const parts = existingAward.source_key.split(':');
        if (parts.length >= 4) {
          alreadyAwardedTier = parseInt(parts[3], 10) || 0;
        }
      }

      if (targetTierGold > alreadyAwardedTier) {
        const delta = targetTierGold - alreadyAwardedTier;

        await tx.employee_coins.upsert({
          where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
          update: { balance: { increment: delta } },
          create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: delta }
        });

        await tx.coin_ledgers.create({
          data: {
            emp_id: empId,
            coin_type_id: goldCoinTypeId,
            amount: delta,
            transaction_type: "EARN",
            source_key: `service_tier:${empId}:${monthKey}:${targetTierGold}`,
            description: `Service jobs milestone: ${totalJobs} jobs this month (tier ${targetTierGold})`
          }
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in checkAndAwardServiceGold:', error);
    return { success: false, error: 'Failed to process service gold awards' };
  }
}

export async function evaluateProductionManagerMonthlyGold(managerUserId: string, month: number, year: number) {
  try {
    const manager = await prisma.user.findUnique({
      where: { id: managerUserId },
      select: { employeeId: true }
    });
    if (!manager || !manager.employeeId) return { success: false, error: 'Manager or employeeId not found' };

    const managerEmpId = manager.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    // 1. Find supervised technicians (team members)
    const teamMembers = await prisma.employees.findMany({
      where: { supervisor_id: managerEmpId }
    });

    // Add manager's own empId in case they do tasks directly
    const teamMemberEmpIds = [...teamMembers.map(e => e.emp_id), managerEmpId];
    const teamUsers = await prisma.user.findMany({
      where: { employeeId: { in: teamMemberEmpIds } }
    });
    const teamUserIds = teamUsers.map(u => u.id);

    return await prisma.$transaction(async (tx) => {
      // 2. Count Total Completed Cabinet Assembly Jobs
      const totalCabinets = await tx.cabinetAssemblyJob.count({
        where: {
          technicianId: { in: teamUserIds },
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // Count QC/FAT Passed Cabinets for Quality Gate
      const passedCabinets = await tx.cabinetAssemblyJob.count({
        where: {
          technicianId: { in: teamUserIds },
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd },
          qcReport: { qcStatus: 'Passed' },
          fatReport: { fatStatus: 'Passed' }
        }
      });

      // 3. Count Completed Inventory Orders (Produce To Stock)
      const completedInventoryOrders = await tx.order.count({
        where: {
          isProduceToStock: true,
          status: 'เสร็จสิ้น',
          updatedAt: { gte: monthStart, lt: monthEnd },
          assignedTechnicians: {
            some: { id: { in: teamUserIds } }
          }
        }
      });

      // 4. Calculate Delay Rate for all supervised completed orders
      const allSupervisedOrdersCompleted = await tx.order.findMany({
        where: {
          status: 'เสร็จสิ้น',
          updatedAt: { gte: monthStart, lt: monthEnd },
          assignedTechnicians: {
            some: { id: { in: teamUserIds } }
          }
        },
        select: { updatedAt: true, productionDeadline: true }
      });

      let delayedCount = 0;
      for (const order of allSupervisedOrdersCompleted) {
        if (order.productionDeadline && order.updatedAt > order.productionDeadline) {
          delayedCount++;
        }
      }

      const totalOrdersCompleted = allSupervisedOrdersCompleted.length;
      const delayRate = totalOrdersCompleted > 0 ? delayedCount / totalOrdersCompleted : 0;
      const qcPassRate = totalCabinets > 0 ? passedCabinets / totalCabinets : 1.0; // If no cabinets, pass rate is nominally 100%

      // 5. Evaluate Gates
      // Delay quota <= 10%, QC/FAT Pass rate >= 95%
      const meetsDelayGate = delayRate <= 0.10;
      const meetsQCGate = qcPassRate >= 0.95;

      const totalTasks = totalCabinets + completedInventoryOrders;

      if (!meetsDelayGate || !meetsQCGate) {
        return {
          success: true,
          awardedGold: 0,
          message: 'Quality or Delay gates not met.',
          stats: { totalTasks, qcPassRate, delayRate }
        };
      }

      // 6. Calculate Medals based on tasks
      let targetTierGold = 0;
      if (totalTasks >= 90) targetTierGold = 3;
      else if (totalTasks >= 60) targetTierGold = 2;
      else if (totalTasks >= 30) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `production_manager_tier:${managerEmpId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        // Ensure we don't award exactly this tier again for this month
        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: managerEmpId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: managerEmpId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: managerEmpId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Production Manager milestone: ${totalTasks} tasks this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalTasks, qcPassRate, delayRate }
      };
    });
  } catch (error) {
    console.error('Error evaluating production manager monthly gold:', error);
    return { success: false, error: 'Failed to process production manager gold' };
  }
}

export async function evaluateAccountingMonthlyGold(accountingUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: accountingUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'Accounting user or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Count Verified Payment Tasks
      const verifiedPayments = await tx.paymentTask.count({
        where: {
          status: 'ตรวจสอบและบันทึกแล้ว',
          paidDate: { gte: monthStart, lt: monthEnd }
        }
      });

      // 2. Count Verified Fuel/Disbursement Expenses
      // Assuming all BranchExpense records created in this month are verified for now
      const verifiedExpenses = await tx.branchExpense.count({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalTasks = verifiedPayments + verifiedExpenses;

      // 3. Calculate Medals based on tasks
      let targetTierGold = 0;
      if (totalTasks >= 60) targetTierGold = 3;
      else if (totalTasks >= 40) targetTierGold = 2;
      else if (totalTasks >= 20) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `accounting_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        // Ensure we don't award exactly this tier again for this month
        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Accounting milestone: ${totalTasks} tasks verified this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalTasks, verifiedPayments, verifiedExpenses }
      };
    });
  } catch (error) {
    console.error('Error evaluating accounting monthly gold:', error);
    return { success: false, error: 'Failed to process accounting gold' };
  }
}

export async function evaluateBDMonthlyGold(bdUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: bdUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'BD user or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Completed Tasks for the given user in the target month
      const completedTasks = await tx.bDTask.findMany({
        where: {
          assigneeId: bdUserId,
          status: 'COMPLETED',
          completedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      let validTaskCount = 0;

      for (const task of completedTasks) {
        // SLA Check: No due date = automatic pass. If due date exists, completedAt must be <= dueDate
        if (task.dueDate && task.completedAt && task.completedAt > task.dueDate) {
          continue; // Failed SLA
        }

        // Standardization Check: Verify all checklist items are completed
        if (task.checklistState) {
          try {
            const checklist = task.checklistState as Array<{ label: string; checked: boolean; id: string }>;
            if (Array.isArray(checklist) && checklist.length > 0) {
              const allChecked = checklist.every(item => item.checked === true);
              if (!allChecked) {
                continue; // Failed Standardization
              }
            }
          } catch (e) {
            // Bad JSON state, assume failure
            continue;
          }
        }

        validTaskCount++;
      }

      // 2. Fetch Completed "Taskless" Projects
      const tasklessProjects = await tx.bDProject.count({
        where: {
          OR: [
            { ownerId: bdUserId },
            { members: { some: { id: bdUserId } } },
            { ownerId: null, requesterId: bdUserId }
          ],
          status: 'COMPLETED',
          tasks: { none: {} },
          subProjects: { none: {} },
          completedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalValidTasks = validTaskCount + tasklessProjects;

      // 3. Calculate Medals based on tasks
      let targetTierGold = 0;
      if (totalValidTasks >= 50) targetTierGold = 3;
      else if (totalValidTasks >= 30) targetTierGold = 2;
      else if (totalValidTasks >= 10) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `bd_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        // Ensure we don't award exactly this tier again for this month
        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Business Development milestone: ${totalValidTasks} items completed within SLA this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalValidTasks, validTaskCount, tasklessProjects }
      };
    });
  } catch (error) {
    console.error('Error evaluating BD monthly gold:', error);
    return { success: false, error: 'Failed to process BD gold' };
  }
}

export async function evaluateProjectMemberMonthlyGold(memberUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: memberUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Gantt Tasks completed this month
      // timeline Quality Gate: updated <= planEnd or planEnd is null
      const tasks = await tx.projectTask.findMany({
        where: {
          assigneeId: memberUserId,
          status: 'Completed',
          actualPct: 100,
          updatedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const validTasks = tasks.filter(t => !t.planEnd || t.updatedAt <= t.planEnd).length;

      // 2. Daily Logs with complete signatures
      const validLogs = await tx.projectDailyLog.count({
        where: {
          reportedBy: memberUserId,
          date: { gte: monthStart, lt: monthEnd },
          reporterSigUrl: { not: null },
          supervisorSigUrl: { not: null }
        }
      });

      // 3. Solar/HV Checklists approved by client
      const validChecklists = await tx.project.count({
        where: {
          members: { some: { userId: memberUserId } },
          customerSignUrl: { not: null },
          updatedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalItems = validTasks + validLogs + validChecklists;

      // Quality Gate thresholds: 30, 60, 90
      let targetTierGold = 0;
      if (totalItems >= 90) targetTierGold = 3;
      else if (totalItems >= 60) targetTierGold = 2;
      else if (totalItems >= 30) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `project_member_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Project Member milestone: ${totalItems} items completed this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalItems, validTasks, validLogs, validChecklists }
      };
    });
  } catch (error) {
    console.error('Error evaluating project member monthly gold:', error);
    return { success: false, error: 'Failed to process project member gold' };
  }
}

export async function evaluateProjectAdminMonthlyGold(adminUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // Quality Gate: No projects in the portfolio are overdue
      const overdueProjects = await tx.project.count({
        where: {
          managerId: adminUserId,
          status: { not: 'Completed' },
          endDate: { lt: new Date() }
        }
      });

      if (overdueProjects > 0) {
        return { success: true, awardedGold: 0, reason: `Quality Gate failed: ${overdueProjects} overdue projects` };
      }

      // Count financial milestones (PaymentTask paid within the month)
      const validMilestones = await tx.paymentTask.count({
        where: {
          status: { in: ['Paid', 'Pay', 'ชำระแล้ว'] },
          updatedAt: { gte: monthStart, lt: monthEnd },
          job: {
            project: { managerId: adminUserId }
          }
        }
      });

      let targetTierGold = 0;
      if (validMilestones >= 10) targetTierGold = 3;
      else if (validMilestones >= 6) targetTierGold = 2;
      else if (validMilestones >= 3) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `project_admin_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Project Admin milestone: ${validMilestones} milestones completed this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { validMilestones, overdueProjects }
      };
    });
  } catch (error) {
    console.error('Error evaluating project admin monthly gold:', error);
    return { success: false, error: 'Failed to process project admin gold' };
  }
}

export async function evaluateMarketingStaffMonthlyGold(staffUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: staffUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // Find all leads created by this staff and forwarded within this month
      const leads = await tx.marketingLead.findMany({
        where: {
          createdByUserId: staffUserId,
          isForwarded: true,
          forwardedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // Quality Gate check: Complete info and not duplicate
      let validForwards = 0;
      for (const lead of leads) {
        const hasCompleteInfo = lead.customerName && lead.customerName.trim() !== '' &&
          lead.phoneNumber && lead.phoneNumber.trim() !== '' &&
          ((lead.productOfInterest && lead.productOfInterest.trim() !== '') ||
            (lead.productType && lead.productType.trim() !== ''));

        const isDuplicate = lead.matchedCompanyId !== null || lead.matchedContactId !== null;

        if (hasCompleteInfo && !isDuplicate) {
          validForwards++;
        }
      }

      // Quality Gate thresholds: 50, 100, 150
      let targetTierGold = 0;
      if (validForwards >= 150) targetTierGold = 3;
      else if (validForwards >= 100) targetTierGold = 2;
      else if (validForwards >= 50) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `marketing_staff_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Marketing Staff milestone: ${validForwards} leads successfully forwarded this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalForwarded: leads.length, validForwards }
      };
    });
  } catch (error) {
    console.error('Error evaluating marketing staff monthly gold:', error);
    return { success: false, error: 'Failed to process marketing staff gold' };
  }
}

export async function evaluateMarketingManagerMonthlyGold(managerUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: managerUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // Find ALL leads forwarded within this month
      const forwardedLeads = await tx.marketingLead.findMany({
        where: {
          isForwarded: true,
          forwardedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalForwarded = forwardedLeads.length;

      // Calculate how many of those were successfully contacted or quoted
      let totalContacted = 0;
      for (const lead of forwardedLeads) {
        if (lead.isContacted || lead.quotationId) {
          totalContacted++;
        }
      }

      // Quality Gate: Conversion rate must be >= 20%
      let conversionRate = 0;
      if (totalForwarded > 0) {
        conversionRate = (totalContacted / totalForwarded) * 100;
      }

      if (totalForwarded > 0 && conversionRate < 20) {
        return { success: true, awardedGold: 0, reason: `Quality Gate failed: Conversion rate is ${conversionRate.toFixed(1)}% (below 20%)` };
      }

      // Targets: 20, 40, 60 successfully contacted
      let targetTierGold = 0;
      if (totalContacted >= 60) targetTierGold = 3;
      else if (totalContacted >= 40) targetTierGold = 2;
      else if (totalContacted >= 20) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `marketing_manager_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Marketing Manager milestone: ${totalContacted} contacted leads (conversion ${conversionRate.toFixed(1)}%) this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalForwarded, totalContacted, conversionRate }
      };
    });
  } catch (error) {
    console.error('Error evaluating marketing manager monthly gold:', error);
    return { success: false, error: 'Failed to process marketing manager gold' };
  }
}

export async function evaluateTransportStaffMonthlyGold(staffUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: staffUserId },
      select: { employeeId: true, fullName: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Find all Jobs where this user submitted a delivery step this month
      const deliveryLogs = await tx.jobStepLog.findMany({
        where: {
          completedBy: user.fullName, // Strict tracking: only those who click "Submit" during handover
          completedAt: { gte: monthStart, lt: monthEnd },
          step: { in: ['store_send', 'service_return', 'complete'] }
        },
        include: { job: true }
      });

      // Deduplicate jobs (in case they logged multiple steps on the same job)
      const uniqueJobs = new Map();
      for (const log of deliveryLogs) {
        if (!uniqueJobs.has(log.jobId)) {
          uniqueJobs.set(log.jobId, log.job);
        }
      }

      let validJobDeliveries = 0;
      uniqueJobs.forEach((job) => {
        // Quality Gate: Proof of delivery
        const hasProof = (job.trackingPhotoUrl && job.trackingPhotoUrl.trim() !== '') ||
          (job.trackingNumber && job.trackingNumber.trim() !== '');

        // Quality Gate: SLA / Punctuality
        const actualDate = job.deliveryDate || job.updatedAt;
        // If targetDeliveryDate is null, automatically pass SLA
        const isOnTime = !job.targetDeliveryDate || (actualDate <= job.targetDeliveryDate);

        if (hasProof && isOnTime) {
          validJobDeliveries++;
        }
      });

      // 2. Find all Repair Deliveries (Delivery Notes) where this user was the sender
      const repairDeliveries = await tx.repairDelivery.findMany({
        where: {
          OR: [{ nameSender: user.fullName }, { sender: user.fullName }],
          createdAt: { gte: monthStart, lt: monthEnd },
          // Proof of delivery
          sigReceiverUrl: { not: null }
        }
      });

      let validRepairDeliveries = 0;
      for (const rd of repairDeliveries) {
        // If we want to check SLA on repair deliveries, we'd need a target. Assuming none, it passes.
        validRepairDeliveries++;
      }

      const totalValidDeliveries = validJobDeliveries + validRepairDeliveries;

      // Quality Gate thresholds: 50, 100, 150
      let targetTierGold = 0;
      if (totalValidDeliveries >= 150) targetTierGold = 3;
      else if (totalValidDeliveries >= 100) targetTierGold = 2;
      else if (totalValidDeliveries >= 50) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `transport_staff_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Transport Staff milestone: ${totalValidDeliveries} successful on-time deliveries this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { validJobDeliveries, validRepairDeliveries, totalValidDeliveries }
      };
    });
  } catch (error) {
    console.error('Error evaluating transport staff monthly gold:', error);
    return { success: false, error: 'Failed to process transport staff gold' };
  }
}

export async function evaluateLogisticsManagerMonthlyGold(managerUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: managerUserId },
      select: { employeeId: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // Get all deliveries across the company for the month
      // 1. Jobs with delivery steps
      const allDeliveryLogs = await tx.jobStepLog.findMany({
        where: {
          completedAt: { gte: monthStart, lt: monthEnd },
          step: { in: ['store_send', 'service_return', 'complete'] }
        },
        include: { job: true }
      });

      const uniqueJobs = new Map();
      for (const log of allDeliveryLogs) {
        if (!uniqueJobs.has(log.jobId)) {
          uniqueJobs.set(log.jobId, log.job);
        }
      }

      let totalDeliveries = 0;
      let delayedDeliveries = 0;

      uniqueJobs.forEach((job) => {
        totalDeliveries++;

        const actualDate = job.deliveryDate || job.updatedAt;
        const isDelayed = job.targetDeliveryDate && actualDate > job.targetDeliveryDate;

        if (isDelayed) {
          delayedDeliveries++;
        }
      });

      // 2. All repair deliveries this month
      const repairDeliveries = await tx.repairDelivery.findMany({
        where: { createdAt: { gte: monthStart, lt: monthEnd } }
      });
      // Assuming repair deliveries are generally on-time unless tracking proves otherwise
      totalDeliveries += repairDeliveries.length;

      // SLA Rule: Delay rate must not exceed 5%
      let delayRate = 0;
      if (totalDeliveries > 0) {
        delayRate = (delayedDeliveries / totalDeliveries) * 100;
      }

      if (totalDeliveries > 0 && delayRate > 5) {
        return { success: true, awardedGold: 0, reason: `SLA failed: Delay rate is ${delayRate.toFixed(1)}% (exceeds 5% tolerance)` };
      }

      // Successful, on-time deliveries by the entire team
      const successfulDeliveries = totalDeliveries - delayedDeliveries;

      // Targets: 100, 200, 300
      let targetTierGold = 0;
      if (successfulDeliveries >= 300) targetTierGold = 6; // 1 + 2 + 3
      else if (successfulDeliveries >= 200) targetTierGold = 3; // 1 + 2
      else if (successfulDeliveries >= 100) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `logistics_manager_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Logistics Manager milestone: ${successfulDeliveries} successful team deliveries (SLA delay ${delayRate.toFixed(1)}%) this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return {
        success: true,
        awardedGold: targetTierGold,
        stats: { totalDeliveries, successfulDeliveries, delayedDeliveries, delayRate }
      };
    });
  } catch (error) {
    console.error('Error evaluating logistics manager monthly gold:', error);
    return { success: false, error: 'Failed to process logistics manager gold' };
  }
}

export async function evaluatePurchasingMonthlyGold(staffUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: staffUserId },
      select: { employeeId: true, fullName: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // Find all POs received in the specified month and reported by this user
      const purchaseOrders = await tx.purchaseOrder.findMany({
        where: {
          reportedBy: user.fullName,
          receivedAt: { gte: monthStart, lt: monthEnd }
        },
        include: { purchaseRequest: true }
      });

      let validPOCount = 0;
      let delayedPOCount = 0;
      let slowConversionCount = 0;

      for (const po of purchaseOrders) {
        // SLA Gate 1: Speed (PR -> PO within 48 hours)
        let passedSpeed = true;
        if (po.purchaseRequest && po.purchaseRequest.createdAt && po.createdAt) {
          const hoursDiff = (po.createdAt.getTime() - po.purchaseRequest.createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 48) {
            passedSpeed = false;
            slowConversionCount++;
          }
        }

        // SLA Gate 2: On-time delivery
        let passedOnTime = true;
        if (po.deliveryDate && po.receivedAt) {
          // Compare dates (ignoring time components if we just want the day, but direct date comparison works)
          // If they received it AFTER the expected delivery date
          if (po.receivedAt > po.deliveryDate) {
            passedOnTime = false;
            delayedPOCount++;
          }
        }

        if (passedSpeed && passedOnTime) {
          validPOCount++;
        }
      }

      // Medals Threshold: 30, 60, 90
      let targetTierGold = 0;
      if (validPOCount >= 90) targetTierGold = 3;
      else if (validPOCount >= 60) targetTierGold = 2;
      else if (validPOCount >= 30) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `purchasing_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Purchasing milestone: ${validPOCount} valid POs this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return { 
        success: true, 
        awardedGold: targetTierGold,
        stats: { totalReceivedPOs: purchaseOrders.length, validPOCount, delayedPOCount, slowConversionCount }
      };
    });
  } catch (error) {
    console.error('Error evaluating purchasing monthly gold:', error);
    return { success: false, error: 'Failed to process purchasing gold' };
  }
}

export async function evaluateWarehouseMonthlyGold(staffUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: staffUserId },
      select: { employeeId: true, fullName: true, id: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Issuance (MaterialRequisition)
      const materialRequisitions = await tx.materialRequisition.count({
        where: {
          approverId: user.id,
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      // 2. Incoming Goods Receipt (GoodsReceipt)
      const goodsReceipts = await tx.goodsReceipt.count({
        where: {
          recipient: user.fullName,
          isCompleteDelivery: true,
          receivedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalValidItems = materialRequisitions + goodsReceipts;

      // Medals Threshold: 50, 100, 150
      let targetTierGold = 0;
      if (totalValidItems >= 150) targetTierGold = 3;
      else if (totalValidItems >= 100) targetTierGold = 2;
      else if (totalValidItems >= 50) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `warehouse_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Warehouse milestone: ${totalValidItems} valid items this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return { 
        success: true, 
        awardedGold: targetTierGold,
        stats: { totalValidItems, materialRequisitions, goodsReceipts }
      };
    });
  } catch (error) {
    console.error('Error evaluating warehouse monthly gold:', error);
    return { success: false, error: 'Failed to process warehouse gold' };
  }
}

export async function evaluateTechnicianMonthlyGold(staffUserId: string, month: number, year: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: staffUserId },
      select: { employeeId: true, fullName: true, id: true }
    });
    if (!user || !user.employeeId) return { success: false, error: 'User or employeeId not found' };

    const empId = user.employeeId;
    const goldCoinTypeId = "GOLD";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Cabinet Assembly Jobs
      const cabinetJobs = await tx.cabinetAssemblyJob.count({
        where: {
          technicianId: user.id,
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd },
          qcReport: {
            qcStatus: { contains: 'Completed', mode: 'insensitive' }
          }
        }
      });

      // 2. Assigned Tasks (TechnicianTask)
      const assignedTasks = await tx.technicianTask.count({
        where: {
          technicianIds: { has: user.id },
          AND: [
            {
              OR: [
                { status: { contains: 'Completed', mode: 'insensitive' } },
                { status: 'DONE' },
                { completedAt: { not: null } }
              ]
            },
            {
              OR: [
                { completedAt: { gte: monthStart, lt: monthEnd } },
                { updatedAt: { gte: monthStart, lt: monthEnd } }
              ]
            }
          ]
        }
      });

      const totalTasks = cabinetJobs + assignedTasks;

      // Medals Threshold: 10, 20, 30
      let targetTierGold = 0;
      if (totalTasks >= 30) targetTierGold = 3;
      else if (totalTasks >= 20) targetTierGold = 2;
      else if (totalTasks >= 10) targetTierGold = 1;

      if (targetTierGold > 0) {
        const sourceKey = `technician_tier:${empId}:${monthKey}:${targetTierGold}`;
        const existingAward = await tx.coin_ledgers.findFirst({
          where: { source_key: sourceKey }
        });

        if (!existingAward) {
          await tx.employee_coins.upsert({
            where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
            update: { balance: { increment: targetTierGold } },
            create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: targetTierGold }
          });

          await tx.coin_ledgers.create({
            data: {
              emp_id: empId,
              coin_type_id: goldCoinTypeId,
              amount: targetTierGold,
              transaction_type: "EARN",
              source_key: sourceKey,
              description: `Technician milestone: ${totalTasks} valid tasks this month (tier ${targetTierGold})`
            }
          });
        }
      }

      return { 
        success: true, 
        awardedGold: targetTierGold,
        stats: { totalTasks, cabinetJobs, assignedTasks }
      };
    });
  } catch (error) {
    console.error('Error evaluating technician monthly gold:', error);
    return { success: false, error: 'Failed to process technician gold' };
  }
}

