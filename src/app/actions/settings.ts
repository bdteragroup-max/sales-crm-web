'use server'

import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'
import { revalidatePath } from 'next/cache'
import { isSuperUser, isMarketingManager as checkMarketingManager, isSalesOrMarketingManager } from '@/app/lib/roleHelper'
import { getRecursiveSubordinateEmpIds } from '@/app/lib/subordinates'

export async function upsertMonthlyTarget(data: {
  userId?: string | null
  month: number
  year: number
  amount: number
}) {
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized.' }
  }

  const isManager = isSalesOrMarketingManager(user.role)

  try {
    if (isManager) {
      // Security check: Ensure userId belongs to manager's team (or company-wide for Super Admin / Head of Sales & Marketing / Marketing Manager)
      if (data.userId) {
        if (data.userId !== user.id && !isSuperUser(user.role) && !checkMarketingManager(user.role)) {
          const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
          if (!targetUser) return { success: false, error: 'User not found' };
        
          const subEmpIds = await getRecursiveSubordinateEmpIds(user.employeeId);
          const isTeamMember = subEmpIds.includes(targetUser.employeeId);

          if (!isTeamMember) {
            return { success: false, error: 'Unauthorized. This user is not in your team or is inactive.' }
          }
        }
      }
    } else {
      // Employee check: Must set target only for themselves
      if (data.userId !== user.id) {
        return { success: false, error: 'Unauthorized. You can only set your own target.' }
      }
    }

    // Manual upsert because Prisma composite unique indexes don't support null in 'where'
    const existing = await prisma.monthlyTarget.findFirst({
      where: {
        userId: data.userId || null,
        month: data.month,
        year: data.year,
      },
    })

    let target;
    if (existing) {
      target = await prisma.monthlyTarget.update({
        where: { id: existing.id },
        data: { amount: data.amount },
      })
    } else {
      target = await prisma.monthlyTarget.create({
        data: {
          userId: data.userId || null,
          month: data.month,
          year: data.year,
          amount: data.amount,
        },
      })
    }

    revalidatePath('/')
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true, data: target }
  } catch (error) {
    console.error('Error saving target:', error)
    return { success: false, error: 'Failed to save target.' }
  }
}

export async function getMonthlyTargets(month: number, year: number) {
  const user = await getUser()
  if (!user) return []

  const isManager = isSalesOrMarketingManager(user.role)

  let targetUserIds: string[] = [user.id];

  if (isManager) {
    try {
      if (isSuperUser(user.role) || checkMarketingManager(user.role)) {
        const targetUsers = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        targetUserIds = targetUsers.map((u: any) => u.id);
      } else {
        const empIds = await getRecursiveSubordinateEmpIds(user.employeeId);
        const targetUsers = await prisma.user.findMany({
          where: { employeeId: { in: empIds }, isActive: true },
          select: { id: true }
        });
        targetUserIds = targetUsers.map((u: any) => u.id);
      }
    } catch(err) {
      console.warn(err);
    }
  }

  return prisma.monthlyTarget.findMany({
    where: { 
      month, 
      year,
      OR: [
        { userId: { in: targetUserIds } },
        isManager ? { userId: null } : undefined // Only show team target for manager
      ].filter(Boolean) as any
    },
    include: { user: { select: { fullName: true, id: true } } }
  })
}

export async function upsertTelesalesKPI(data: {
  userId?: string | null
  month: number
  year: number
  weeklyCallGoal: number
  monthlyCallGoal: number
  appointmentGoal: number
  connectionRateMin: number
}) {
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized.' }
  }

  const isManager = isSalesOrMarketingManager(user.role)

  try {
    if (isManager) {
      if (data.userId) {
        if (data.userId !== user.id && !isSuperUser(user.role) && !checkMarketingManager(user.role)) {
          const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
          if (!targetUser) return { success: false, error: 'User not found' };
          
          const subEmpIds = await getRecursiveSubordinateEmpIds(user.employeeId);
          const isTeamMember = subEmpIds.includes(targetUser.employeeId);

          if (!isTeamMember) {
            return { success: false, error: 'Unauthorized. This user is not in your team or is inactive.' }
          }
        }
      }
    } else {
      if (data.userId !== user.id) {
        return { success: false, error: 'Unauthorized. You can only set your own targets.' }
      }
    }

    const existing = await prisma.telesalesKPI.findFirst({
      where: {
        userId: data.userId || null,
        month: data.month,
        year: data.year,
      },
    })

    let kpi;
    if (existing) {
      kpi = await prisma.telesalesKPI.update({
        where: { id: existing.id },
        data: {
          weeklyCallGoal: data.weeklyCallGoal,
          monthlyCallGoal: data.monthlyCallGoal,
          appointmentGoal: data.appointmentGoal,
          connectionRateMin: data.connectionRateMin,
        },
      })
    } else {
      kpi = await prisma.telesalesKPI.create({
        data: {
          userId: data.userId || null,
          month: data.month,
          year: data.year,
          weeklyCallGoal: data.weeklyCallGoal,
          monthlyCallGoal: data.monthlyCallGoal,
          appointmentGoal: data.appointmentGoal,
          connectionRateMin: data.connectionRateMin,
        },
      })
    }

    revalidatePath('/')
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true, data: kpi }
  } catch (error) {
    console.error('Error saving telesales KPI:', error)
    return { success: false, error: 'Failed to save telesales KPI.' }
  }
}

export async function getTelesalesKPIs(month: number, year: number) {
  const user = await getUser()
  if (!user) return []

  const isManager = isSalesOrMarketingManager(user.role)

  let targetUserIds: string[] = [user.id];

  if (isManager) {
    try {
      if (isSuperUser(user.role) || checkMarketingManager(user.role)) {
        const targetUsers = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        targetUserIds = targetUsers.map((u: any) => u.id);
      } else {
        const empIds = await getRecursiveSubordinateEmpIds(user.employeeId);
        const targetUsers = await prisma.user.findMany({
          where: { employeeId: { in: empIds }, isActive: true },
          select: { id: true }
        });
        targetUserIds = targetUsers.map((u: any) => u.id);
      }
    } catch(err) {
      console.warn(err);
    }
  }

  return prisma.telesalesKPI.findMany({
    where: { 
      month, 
      year,
      OR: [
        { userId: { in: targetUserIds } },
        isManager ? { userId: null } : undefined // Only show team target for manager
      ].filter(Boolean) as any
    },
    include: { user: { select: { fullName: true, id: true } } }
  })
}
