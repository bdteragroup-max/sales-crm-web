'use server'

import { getUser } from '@/app/lib/dal'
import prisma from '@/app/lib/db'
import { isSamePersonName } from '@/app/lib/personName'
import { getPreviousCalendarMonthBangkok } from '@/app/lib/cronAuth'

const evaluatedMonthsCache = new Set<string>()
let inflightMonthlyCatchup: Promise<any> | null = null

function getBangkokMonthRange(year: number, month: number) {
  const mm = String(month).padStart(2, '0')
  const nextYear = month === 12 ? year + 1 : year
  const nextMm = String(month === 12 ? 1 : month + 1).padStart(2, '0')
  const monthStart = new Date(`${year}-${mm}-01T00:00:00.000+07:00`)
  const monthEnd = new Date(`${nextYear}-${nextMm}-01T00:00:00.000+07:00`)
  const monthKey = `${year}-${mm}`
  return { monthStart, monthEnd, monthKey }
}

async function getActiveMonthlyEmployee(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, employeeId: true, fullName: true, isActive: true, role: true }
  })
  if (!user || !user.isActive || !user.employeeId) return null

  const emp = await prisma.employees.findUnique({
    where: { emp_id: user.employeeId },
    select: { emp_id: true, is_active: true, resignation_date: true }
  })
  if (!emp || emp.is_active === false || emp.resignation_date !== null) return null

  return user
}

async function awardMonthlyTierDelta(
  tx: any,
  params: {
    prefix: string
    empId: string
    monthKey: string
    targetTierGold: number
    description: string
  }
): Promise<{ newlyAwarded: number; totalAwarded: number }> {
  const { prefix, empId, monthKey, targetTierGold, description } = params
  if (targetTierGold <= 0) {
    return { newlyAwarded: 0, totalAwarded: 0 }
  }

  const goldCoinTypeId = 'GOLD'
  const existingLedgers = await tx.coin_ledgers.findMany({
    where: { source_key: { startsWith: `${prefix}:${empId}:${monthKey}:` } },
    select: { amount: true, source_key: true }
  })

  const alreadyAwarded = existingLedgers.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0)
  const delta = targetTierGold - alreadyAwarded
  if (delta <= 0) {
    return { newlyAwarded: 0, totalAwarded: alreadyAwarded }
  }

  const sourceKey = `${prefix}:${empId}:${monthKey}:${targetTierGold}`
  const exactExists = existingLedgers.some((l: any) => l.source_key === sourceKey)
  if (exactExists) {
    return { newlyAwarded: 0, totalAwarded: alreadyAwarded }
  }

  await tx.employee_coins.upsert({
    where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: goldCoinTypeId } },
    update: { balance: { increment: delta } },
    create: { emp_id: empId, coin_type_id: goldCoinTypeId, balance: delta }
  })

  await tx.coin_ledgers.create({
    data: {
      emp_id: empId,
      coin_type_id: goldCoinTypeId,
      amount: delta,
      transaction_type: 'EARN',
      source_key: sourceKey,
      description
    }
  })

  return { newlyAwarded: delta, totalAwarded: alreadyAwarded + delta }
}

export async function getUserCoins() {
  try {
    const user = await getUser()
    if (!user || !user.employeeId) {
      return { success: false, error: 'Unauthorized or missing employee ID' }
    }

    // Self-healing catch-up: ensure previous calendar month gold coins were evaluated
    // even if the scheduled 1st-of-month cron was skipped or delayed.
    ensurePreviousMonthGoldEvaluated().catch((err) =>
      console.error('Background monthly gold catch-up failed:', err)
    )

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

      // Medal system only applies to sales made from June 2026 onwards
      const june2026Start = new Date('2026-06-01T00:00:00+07:00');
      if (quotation.billingDate && quotation.billingDate < june2026Start) return;

      // Gate at Earning: Verify that accounting has verified full payment for all installments
      const job = await tx.job.findFirst({
        where: { quotationId },
        include: { paymentTasks: true }
      });

      if (!job) {
        result.message = 'ยังไม่พบข้อมูลงวดการชำระเงินของงาน (Job) ในระบบ จึงยังไม่สามารถแจกเหรียญได้';
        return;
      }

      const tasks = job.paymentTasks || [];
      const hasPaymentTasks = tasks.length > 0;
      const allInstallmentsVerified = hasPaymentTasks && tasks.every(t => t.status === 'ตรวจสอบและบันทึกแล้ว');
      const isPaymentComplete = job.paymentStatus === 'paid' && allInstallmentsVerified;

      if (!isPaymentComplete) {
        result.message = 'ยังไม่สามารถแจกเหรียญได้ เนื่องจากฝ่ายบัญชียังไม่ได้ตรวจสอบและบันทึกการชำระเงินครบทุกงวด';
        return;
      }

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
          description: `ปิดการขายสำเร็จ (เงินเข้าครบแล้ว - ${job.jobNumber || quotation.quotationNumber}) - ยอดขาย ${quotation.totalAmountBeforeVat} บาท`
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
            description: `ลูกทีมปิดการขายสำเร็จ (เงินเข้าครบแล้ว - ${job.jobNumber || quotation.quotationNumber})`
          }
        });
      }

      result = {
        success: true,
        awardedGold: salesGold,
        message: `คุณได้รับ ${salesGold} เหรียญทอง จากยอดขาย ${quotation.totalAmountBeforeVat?.toLocaleString() || 0} บาท (ฝ่ายบัญชีตรวจสอบการชำระเงินครบถ้วนแล้ว)`
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
    const manager = await getActiveMonthlyEmployee(managerUserId);
    if (!manager || !manager.employeeId) return { success: false, error: 'Active manager or employeeId not found' };

    const managerEmpId = manager.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

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
          qcReport: {
            OR: [
              { qcStatus: { equals: 'Passed', mode: 'insensitive' } },
              { qcStatus: { contains: 'Completed', mode: 'insensitive' } }
            ]
          },
          fatReport: {
            OR: [
              { fatStatus: { equals: 'Passed', mode: 'insensitive' } },
              { fatStatus: { contains: 'Completed', mode: 'insensitive' } }
            ]
          }
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
      const qcPassRate = totalCabinets > 0 ? passedCabinets / totalCabinets : 1.0;

      // 5. Evaluate Gates: Delay quota <= 10%, QC/FAT Pass rate >= 95%
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

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'production_manager_tier',
        empId: managerEmpId,
        monthKey,
        targetTierGold,
        description: `Production Manager milestone: ${totalTasks} tasks this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(accountingUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active accounting user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      // 1. Count Verified Payment Tasks
      const verifiedPayments = await tx.paymentTask.count({
        where: {
          status: 'ตรวจสอบและบันทึกแล้ว',
          paidDate: { gte: monthStart, lt: monthEnd }
        }
      });

      // 2. Count Verified Fuel/Disbursement Expenses
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

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'accounting_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Accounting milestone: ${totalTasks} tasks verified this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(bdUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active BD user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

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
        if (task.dueDate && task.completedAt && task.completedAt > task.dueDate) {
          continue;
        }

        if (task.checklistState) {
          try {
            const checklist = task.checklistState as Array<{ label: string; checked: boolean; id: string }>;
            if (Array.isArray(checklist) && checklist.length > 0) {
              const allChecked = checklist.every(item => item.checked === true);
              if (!allChecked) {
                continue;
              }
            }
          } catch {
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

      // 3. Fetch Resolved / Closed Support Tickets from /bd/tickets
      const resolvedTickets = await tx.supportTicket.count({
        where: {
          assigneeId: bdUserId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          OR: [
            { resolvedAt: { gte: monthStart, lt: monthEnd } },
            { resolvedAt: null, updatedAt: { gte: monthStart, lt: monthEnd } }
          ]
        }
      });

      const totalValidTasks = validTaskCount + tasklessProjects + resolvedTickets;

      // 4. Calculate Medals based on tasks & tickets
      let targetTierGold = 0;
      if (totalValidTasks >= 50) targetTierGold = 3;
      else if (totalValidTasks >= 30) targetTierGold = 2;
      else if (totalValidTasks >= 10) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'bd_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `ผลงานฝ่ายพัฒนาธุรกิจ (BD): ปฏิบัติงานและแก้ไขปัญหาสำเร็จ ${totalValidTasks} รายการประจำเดือน ได้รับระดับ ${targetTierGold}`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
        stats: { totalValidTasks, validTaskCount, tasklessProjects, resolvedTickets }
      };
    });
  } catch (error) {
    console.error('Error evaluating BD monthly gold:', error);
    return { success: false, error: 'Failed to process BD gold' };
  }
}

export async function evaluateProjectMemberMonthlyGold(memberUserId: string, month: number, year: number) {
  try {
    const user = await getActiveMonthlyEmployee(memberUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      // 1. Gantt Tasks completed this month
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

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'project_member_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Project Member milestone: ${totalItems} items completed this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(adminUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      const portfolioWhere = {
        OR: [
          { managerId: adminUserId },
          { members: { some: { userId: adminUserId } } }
        ]
      };

      // Quality Gate: No projects in the portfolio are overdue at month end
      const overdueProjects = await tx.project.count({
        where: {
          ...portfolioWhere,
          status: { notIn: ['Completed', 'Cancelled'] },
          endDate: { lt: monthEnd }
        }
      });

      if (overdueProjects > 0) {
        return { success: true, awardedGold: 0, reason: `Quality Gate failed: ${overdueProjects} overdue projects` };
      }

      // Count financial milestones (PaymentTask verified/paid within the month)
      const validMilestones = await tx.paymentTask.count({
        where: {
          status: { in: ['ตรวจสอบและบันทึกแล้ว', 'Paid', 'Pay', 'ชำระแล้ว'] },
          OR: [
            { paidDate: { gte: monthStart, lt: monthEnd } },
            { paidDate: null, updatedAt: { gte: monthStart, lt: monthEnd } }
          ],
          job: {
            project: portfolioWhere
          }
        }
      });

      let targetTierGold = 0;
      if (validMilestones >= 10) targetTierGold = 3;
      else if (validMilestones >= 6) targetTierGold = 2;
      else if (validMilestones >= 3) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'project_admin_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Project Admin milestone: ${validMilestones} milestones completed this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(staffUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      const leads = await tx.marketingLead.findMany({
        where: {
          createdByUserId: staffUserId,
          isForwarded: true,
          forwardedAt: { gte: monthStart, lt: monthEnd }
        }
      });

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

      let targetTierGold = 0;
      if (validForwards >= 150) targetTierGold = 3;
      else if (validForwards >= 100) targetTierGold = 2;
      else if (validForwards >= 50) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'marketing_staff_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Marketing Staff milestone: ${validForwards} leads successfully forwarded this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(managerUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      const forwardedLeads = await tx.marketingLead.findMany({
        where: {
          isForwarded: true,
          forwardedAt: { gte: monthStart, lt: monthEnd }
        }
      });

      const totalForwarded = forwardedLeads.length;
      let totalContacted = 0;
      for (const lead of forwardedLeads) {
        if (lead.isContacted || lead.quotationId) {
          totalContacted++;
        }
      }

      let conversionRate = 0;
      if (totalForwarded > 0) {
        conversionRate = (totalContacted / totalForwarded) * 100;
      }

      if (totalForwarded > 0 && conversionRate < 20) {
        return { success: true, awardedGold: 0, reason: `Quality Gate failed: Conversion rate is ${conversionRate.toFixed(1)}% (below 20%)` };
      }

      let targetTierGold = 0;
      if (totalContacted >= 60) targetTierGold = 3;
      else if (totalContacted >= 40) targetTierGold = 2;
      else if (totalContacted >= 20) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'marketing_manager_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Marketing Manager milestone: ${totalContacted} contacted leads (conversion ${conversionRate.toFixed(1)}%) this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(staffUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      // 1. Find all Jobs where this user submitted a delivery step this month (normalized Thai name match)
      const allMonthDeliveryLogs = await tx.jobStepLog.findMany({
        where: {
          completedAt: { gte: monthStart, lt: monthEnd },
          step: { in: ['store_send', 'service_return', 'complete'] }
        },
        include: { job: true }
      });

      const deliveryLogs = allMonthDeliveryLogs.filter(log => isSamePersonName(log.completedBy, user.fullName));

      const uniqueJobs = new Map();
      for (const log of deliveryLogs) {
        if (!uniqueJobs.has(log.jobId)) {
          uniqueJobs.set(log.jobId, log.job);
        }
      }

      let validJobDeliveries = 0;
      uniqueJobs.forEach((job) => {
        const hasProof = (job.trackingPhotoUrl && job.trackingPhotoUrl.trim() !== '') ||
          (job.trackingNumber && job.trackingNumber.trim() !== '');
        const actualDate = job.deliveryDate || job.updatedAt;
        const isOnTime = !job.targetDeliveryDate || (actualDate <= job.targetDeliveryDate);

        if (hasProof && isOnTime) {
          validJobDeliveries++;
        }
      });

      // 2. Find all Repair Deliveries (Delivery Notes) where this user was the sender (normalized Thai name match)
      const allMonthRepairDeliveries = await tx.repairDelivery.findMany({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
          sigReceiverUrl: { not: null }
        },
        select: { id: true, nameSender: true, sender: true }
      });

      const validRepairDeliveries = allMonthRepairDeliveries.filter(
        rd => isSamePersonName(rd.nameSender, user.fullName) || isSamePersonName(rd.sender, user.fullName)
      ).length;

      const totalValidDeliveries = validJobDeliveries + validRepairDeliveries;

      let targetTierGold = 0;
      if (totalValidDeliveries >= 150) targetTierGold = 3;
      else if (totalValidDeliveries >= 100) targetTierGold = 2;
      else if (totalValidDeliveries >= 50) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'transport_staff_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Transport Staff milestone: ${totalValidDeliveries} successful on-time deliveries this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(managerUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
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

      const repairDeliveries = await tx.repairDelivery.findMany({
        where: { createdAt: { gte: monthStart, lt: monthEnd } }
      });
      totalDeliveries += repairDeliveries.length;

      let delayRate = 0;
      if (totalDeliveries > 0) {
        delayRate = (delayedDeliveries / totalDeliveries) * 100;
      }

      if (totalDeliveries > 0 && delayRate > 5) {
        return { success: true, awardedGold: 0, reason: `SLA failed: Delay rate is ${delayRate.toFixed(1)}% (exceeds 5% tolerance)` };
      }

      const successfulDeliveries = totalDeliveries - delayedDeliveries;

      let targetTierGold = 0;
      if (successfulDeliveries >= 300) targetTierGold = 6;
      else if (successfulDeliveries >= 200) targetTierGold = 3;
      else if (successfulDeliveries >= 100) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'logistics_manager_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Logistics Manager milestone: ${successfulDeliveries} successful team deliveries (SLA delay ${delayRate.toFixed(1)}%) this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(staffUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      const purchaseOrders = await tx.purchaseOrder.findMany({
        where: {
          receivedAt: { gte: monthStart, lt: monthEnd }
        },
        include: { purchaseRequest: true }
      });

      let validPOCount = 0;
      let delayedPOCount = 0;
      let slowConversionCount = 0;

      for (const po of purchaseOrders) {
        let passedSpeed = true;
        if (po.purchaseRequest && po.purchaseRequest.createdAt && po.createdAt) {
          const hoursDiff = (po.createdAt.getTime() - po.purchaseRequest.createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 48) {
            passedSpeed = false;
            slowConversionCount++;
          }
        }

        let passedOnTime = true;
        if (po.deliveryDate && po.receivedAt) {
          if (po.receivedAt > po.deliveryDate) {
            passedOnTime = false;
            delayedPOCount++;
          }
        }

        if (passedSpeed && passedOnTime) {
          validPOCount++;
        }
      }

      let targetTierGold = 0;
      if (validPOCount >= 90) targetTierGold = 3;
      else if (validPOCount >= 60) targetTierGold = 2;
      else if (validPOCount >= 30) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'purchasing_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `ผลงานทีมฝ่ายจัดซื้อ: ผ่านเกณฑ์ SLA ใบสั่งซื้อ (PO) คุณภาพ ${validPOCount} รายการประจำเดือน ได้รับระดับ ${targetTierGold}`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(staffUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      // 1. Issuance (MaterialRequisition): match storeStaffId or normalized storeStaffName
      const completedRequisitions = await tx.materialRequisition.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { dispensedAt: { gte: monthStart, lt: monthEnd } },
            { dispensedAt: null, updatedAt: { gte: monthStart, lt: monthEnd } }
          ]
        },
        select: { storeStaffId: true, storeStaffName: true }
      });

      const materialRequisitions = completedRequisitions.filter(
        mr => mr.storeStaffId === user.id || isSamePersonName(mr.storeStaffName, user.fullName)
      ).length;

      // 2. Incoming Goods Receipt (GoodsReceipt): normalized Thai name matching on recipient
      const completedReceipts = await tx.goodsReceipt.findMany({
        where: {
          isCompleteDelivery: true,
          receivedAt: { gte: monthStart, lt: monthEnd }
        },
        select: { recipient: true }
      });

      const goodsReceipts = completedReceipts.filter(
        gr => isSamePersonName(gr.recipient, user.fullName)
      ).length;

      const totalValidItems = materialRequisitions + goodsReceipts;

      // Medals Threshold: 50, 100, 150
      let targetTierGold = 0;
      if (totalValidItems >= 150) targetTierGold = 3;
      else if (totalValidItems >= 100) targetTierGold = 2;
      else if (totalValidItems >= 50) targetTierGold = 1;

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'warehouse_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Warehouse milestone: ${totalValidItems} valid items this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
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
    const user = await getActiveMonthlyEmployee(staffUserId);
    if (!user || !user.employeeId) return { success: false, error: 'Active user or employeeId not found' };

    const empId = user.employeeId;
    const { monthStart, monthEnd, monthKey } = getBangkokMonthRange(year, month);

    return await prisma.$transaction(async (tx) => {
      // 1. Cabinet Assembly Jobs (QC Passed or Completed)
      const cabinetJobs = await tx.cabinetAssemblyJob.count({
        where: {
          technicianId: user.id,
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd },
          qcReport: {
            OR: [
              { qcStatus: { equals: 'Passed', mode: 'insensitive' } },
              { qcStatus: { contains: 'Completed', mode: 'insensitive' } }
            ]
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

      const award = await awardMonthlyTierDelta(tx, {
        prefix: 'technician_tier',
        empId,
        monthKey,
        targetTierGold,
        description: `Technician milestone: ${totalTasks} valid tasks this month (tier ${targetTierGold})`
      });

      return {
        success: true,
        awardedGold: award.newlyAwarded,
        totalMonthGold: award.totalAwarded,
        stats: { totalTasks, cabinetJobs, assignedTasks }
      };
    });
  } catch (error) {
    console.error('Error evaluating technician monthly gold:', error);
    return { success: false, error: 'Failed to process technician gold' };
  }
}

export async function runAllMonthlyGoldEvaluations(
  month: number,
  year: number,
  triggerSource: string = 'CRON'
) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const summary: Record<string, Array<{ user: string; employeeId: string; role: string; awardedGold: number; totalMonthGold?: number; stats?: any }>> = {
    accounting: [],
    bd: [],
    purchasing: [],
    warehouse: [],
    marketing: [],
    transport: [],
    project: [],
    technician: [],
    production: []
  };

  let totalUsersAwarded = 0;
  let totalGoldAwarded = 0;

  const recordResult = (dept: keyof typeof summary, user: { fullName: string; employeeId: string; role: string }, res: any) => {
    const awarded = Number(res?.awardedGold) || 0;
    if (awarded > 0) {
      totalUsersAwarded++;
      totalGoldAwarded += awarded;
    }
    summary[dept].push({
      user: user.fullName,
      employeeId: user.employeeId,
      role: user.role,
      awardedGold: awarded,
      totalMonthGold: res?.totalMonthGold,
      stats: res?.stats
    });
  };

  // 1. Accounting
  const acctUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'accounting', mode: 'insensitive' } },
        { role: { contains: 'บัญชี', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of acctUsers) {
    const res = await evaluateAccountingMonthlyGold(u.id, month, year);
    recordResult('accounting', u, res);
  }

  // 2. BD
  const bdUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'business development', mode: 'insensitive' } },
        { role: { contains: 'bd', mode: 'insensitive' } },
        { position: { contains: 'business development', mode: 'insensitive' } },
        { position: { contains: 'bd', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of bdUsers) {
    const res = await evaluateBDMonthlyGold(u.id, month, year);
    recordResult('bd', u, res);
  }

  // 3. Purchasing
  const purchUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'purchasing', mode: 'insensitive' } },
        { role: { contains: 'procurement', mode: 'insensitive' } },
        { role: { contains: 'จัดซื้อ', mode: 'insensitive' } },
        { position: { contains: 'purchasing', mode: 'insensitive' } },
        { position: { contains: 'procurement', mode: 'insensitive' } },
        { position: { contains: 'จัดซื้อ', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of purchUsers) {
    const res = await evaluatePurchasingMonthlyGold(u.id, month, year);
    recordResult('purchasing', u, res);
  }

  // 4. Warehouse
  const warehouseUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'warehouse', mode: 'insensitive' } },
        { role: { contains: 'store', mode: 'insensitive' } },
        { role: { contains: 'คลังสินค้า', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of warehouseUsers) {
    const res = await evaluateWarehouseMonthlyGold(u.id, month, year);
    recordResult('warehouse', u, res);
  }

  // 5. Marketing
  const marketingUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'marketing', mode: 'insensitive' } },
        { role: { contains: 'การตลาด', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of marketingUsers) {
    const roleLower = (u.role || '').toLowerCase();
    const isManager = roleLower.includes('manager') || roleLower.includes('ผู้จัดการ') || u.role === 'Admin';
    const res = isManager
      ? await evaluateMarketingManagerMonthlyGold(u.id, month, year)
      : await evaluateMarketingStaffMonthlyGold(u.id, month, year);
    recordResult('marketing', u, res);
  }

  // 6. Transport / Logistics
  const transportUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'logistics', mode: 'insensitive' } },
        { role: { contains: 'shipping', mode: 'insensitive' } },
        { role: { contains: 'transport', mode: 'insensitive' } },
        { role: { contains: 'จัดส่ง', mode: 'insensitive' } },
        { role: { contains: 'ขนส่ง', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of transportUsers) {
    const roleLower = (u.role || '').toLowerCase();
    const isManager = roleLower.includes('manager') || roleLower.includes('ผู้จัดการ') || roleLower.includes('หัวหน้า') || u.role === 'Admin';
    const res = isManager
      ? await evaluateLogisticsManagerMonthlyGold(u.id, month, year)
      : await evaluateTransportStaffMonthlyGold(u.id, month, year);
    recordResult('transport', u, res);
  }

  // 7. Project
  const projectUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'project', mode: 'insensitive' } },
        { role: { contains: 'engineer', mode: 'insensitive' } },
        { role: { contains: 'โปรเจค', mode: 'insensitive' } },
        { role: { contains: 'วิศวกร', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of projectUsers) {
    const roleLower = (u.role || '').toLowerCase();
    const isProjectAdmin = roleLower.includes('admin project') || roleLower.includes('project admin') || roleLower.includes('admin') || u.role === 'Admin';
    const res = isProjectAdmin
      ? await evaluateProjectAdminMonthlyGold(u.id, month, year)
      : await evaluateProjectMemberMonthlyGold(u.id, month, year);
    recordResult('project', u, res);
  }

  // 8. Technician
  const technicianUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      OR: [
        { role: { contains: 'technician', mode: 'insensitive' } },
        { role: { contains: 'ช่าง', mode: 'insensitive' } },
        { role: { contains: 'service', mode: 'insensitive' } },
        { role: { contains: 'installation', mode: 'insensitive' } }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of technicianUsers) {
    const res = await evaluateTechnicianMonthlyGold(u.id, month, year);
    recordResult('technician', u, res);
  }

  // 9. Production Manager
  const productionManagers = await prisma.user.findMany({
    where: {
      isActive: true,
      employeeId: { not: '' },
      AND: [
        {
          OR: [
            { role: { contains: 'ผลิต', mode: 'insensitive' } },
            { role: { contains: 'production', mode: 'insensitive' } },
            { role: { contains: 'โรงงาน', mode: 'insensitive' } }
          ]
        },
        {
          OR: [
            { role: { contains: 'manager', mode: 'insensitive' } },
            { role: { contains: 'mgr', mode: 'insensitive' } },
            { role: { contains: 'ผู้จัดการ', mode: 'insensitive' } },
            { role: { contains: 'หัวหน้า', mode: 'insensitive' } }
          ]
        }
      ]
    },
    select: { id: true, fullName: true, employeeId: true, role: true }
  });
  for (const u of productionManagers) {
    const res = await evaluateProductionManagerMonthlyGold(u.id, month, year);
    recordResult('production', u, res);
  }

  await prisma.auditLog.create({
    data: {
      userId: triggerSource,
      action: 'MONTHLY_GOLD_EVALUATED',
      resource: 'MONTHLY_GOLD',
      resourceId: monthKey,
      details: JSON.stringify({
        month,
        year,
        monthKey,
        triggerSource,
        totalUsersAwarded,
        totalGoldAwarded
      })
    }
  });

  evaluatedMonthsCache.add(monthKey);

  return {
    success: true,
    month,
    year,
    monthKey,
    totalUsersAwarded,
    totalGoldAwarded,
    summary
  };
}

export async function ensurePreviousMonthGoldEvaluated() {
  const { month, year, monthKey } = getPreviousCalendarMonthBangkok();
  if (monthKey < '2026-10') {
    return { skipped: true, monthKey };
  }

  if (evaluatedMonthsCache.has(monthKey)) {
    return { alreadyEvaluated: true, monthKey };
  }

  const existingMarker = await prisma.auditLog.findFirst({
    where: {
      action: 'MONTHLY_GOLD_EVALUATED',
      resourceId: monthKey
    },
    select: { id: true }
  });

  if (existingMarker) {
    evaluatedMonthsCache.add(monthKey);
    return { alreadyEvaluated: true, monthKey };
  }

  if (!inflightMonthlyCatchup) {
    inflightMonthlyCatchup = runAllMonthlyGoldEvaluations(month, year, 'AUTO_CATCHUP').finally(() => {
      inflightMonthlyCatchup = null;
    });
  }

  return await inflightMonthlyCatchup;
}


