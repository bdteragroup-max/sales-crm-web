'use server'

import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'
import { revalidatePath } from 'next/cache'
import { teraDb } from '@/app/lib/teraDb'

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

  const isManager = user.role === 'ผู้จัดการ'

  try {
    if (isManager) {
      // Security check: Ensure userId belongs to manager's team
      if (data.userId) {
        const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
        if (!targetUser) return { success: false, error: 'User not found' };
        
        let isTeamMember = false;
        try {
          const hrEmployee = await teraDb.employees.findUnique({ where: { emp_id: targetUser.employeeId } });
          if (hrEmployee && hrEmployee.supervisor_id === user.employeeId) {
            isTeamMember = true;
          }
        } catch (e) { console.warn(e) }

        if (!isTeamMember) {
          return { success: false, error: 'Unauthorized. This user is not in your team or is inactive.' }
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
    return { success: true, data: target }
  } catch (error) {
    console.error('Error saving target:', error)
    return { success: false, error: 'Failed to save target.' }
  }
}

export async function getMonthlyTargets(month: number, year: number) {
  const user = await getUser()
  if (!user) return []

  const isManager = user.role === 'ผู้จัดการ'

  let targetUserIds: string[] = [user.id];

  if (isManager) {
    try {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true }
      });
      const empIds = subordinates.map((s: any) => s.emp_id);
      const targetUsers = await prisma.user.findMany({
        where: { employeeId: { in: empIds }, isActive: true },
        select: { id: true }
      });
      targetUserIds = targetUsers.map((u: any) => u.id);
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

  const isManager = user.role === 'ผู้จัดการ'

  try {
    if (isManager) {
      if (data.userId) {
        const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
        if (!targetUser) return { success: false, error: 'User not found' };
        
        let isTeamMember = false;
        try {
          const hrEmployee = await teraDb.employees.findUnique({ where: { emp_id: targetUser.employeeId } });
          if (hrEmployee && hrEmployee.supervisor_id === user.employeeId) {
            isTeamMember = true;
          }
        } catch (e) { console.warn(e) }

        if (!isTeamMember) {
          return { success: false, error: 'Unauthorized. This user is not in your team or is inactive.' }
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

  const isManager = user.role === 'ผู้จัดการ'

  let targetUserIds: string[] = [user.id];

  if (isManager) {
    try {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true }
      });
      const empIds = subordinates.map((s: any) => s.emp_id);
      const targetUsers = await prisma.user.findMany({
        where: { employeeId: { in: empIds }, isActive: true },
        select: { id: true }
      });
      targetUserIds = targetUsers.map((u: any) => u.id);
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
