import React from 'react'
import { getUser } from '@/app/lib/dal'
import prisma from '@/app/lib/db'
import Sidebar from '@/app/components/Sidebar'
import SettingsClientPage from './SettingsClientPage'
import { redirect } from 'next/navigation'
import { getMonthlyTargets } from '@/app/actions/settings'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const isManager = user.role === 'ผู้จัดการ'

  const [staffList, initialTargets] = await Promise.all([
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
    getMonthlyTargets(currentMonth, currentYear)
  ])

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/settings" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <SettingsClientPage 
          staffList={staffList}
          initialTargets={initialTargets}
          isManager={isManager}
        />
      </main>
    </div>
  )
}
