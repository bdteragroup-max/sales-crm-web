import React from 'react'
import { getUser } from '@/app/lib/dal'
import prisma from '@/app/lib/db'
import SettingsClientPage from './SettingsClientPage'
import { redirect } from 'next/navigation'
import { getMonthlyTargets, getTelesalesKPIs } from '@/app/actions/settings'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const isManager = user.role === 'ผู้จัดการ'

  const [staffList, initialTargets, initialTelesalesKPIs] = await Promise.all([
    prisma.user.findMany({
      where: isManager ? { 
        employeeSale: { teamLeader: user.fullName },
        id: { not: user.id },
        isActive: true
      } : {
        id: user.id,
        isActive: true
      },
      select: { id: true, fullName: true, position: true }
    }),
    getMonthlyTargets(currentMonth, currentYear),
    getTelesalesKPIs(currentMonth, currentYear)
  ])

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 pb-24 md:pb-0">
      <SettingsClientPage 
        staffList={staffList}
        initialTargets={initialTargets}
        initialTelesalesKPIs={JSON.parse(JSON.stringify(initialTelesalesKPIs))}
        isManager={isManager}
      />
    </main>
  )
}
