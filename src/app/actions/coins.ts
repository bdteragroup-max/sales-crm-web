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
