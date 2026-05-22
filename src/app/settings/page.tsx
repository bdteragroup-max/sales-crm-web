import React from 'react'
import { getUser } from '@/app/lib/dal'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import SettingsClientPage from './SettingsClientPage'
import { redirect } from 'next/navigation'
import { getMonthlyTargets, getTelesalesKPIs } from '@/app/actions/settings'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const isManager = user.role === 'ผู้จัดการ'

  let staffList: { id: string; fullName: string; position: string | null }[] = [];

  if (isManager) {
    // 1. Fetch subordinates from TERA HR DB
    const subordinates = await teraDb.employees.findMany({
      where: {
        supervisor_id: user.employeeId,
        is_active: true
      },
      include: {
        job_positions: true
      }
    });
    
    const subordinateEmpIds = subordinates.map(s => s.emp_id);
    
    // 2. Fetch existing CRM Users
    const existingUsers = await prisma.user.findMany({
      where: {
        employeeId: { in: subordinateEmpIds },
      }
    });

    const existingUserEmpIds = existingUsers.map(u => u.employeeId);
    
    // 3. Auto-create stub User records for subordinates who haven't logged in yet
    // so the manager can assign them targets
    const missingSubordinates = subordinates.filter(s => !existingUserEmpIds.includes(s.emp_id));
    
    if (missingSubordinates.length > 0) {
      await prisma.user.createMany({
        data: missingSubordinates.map(s => ({
          employeeId: s.emp_id,
          fullName: s.name,
          email: s.email || `${s.emp_id}@teragroup.com`,
          role: 'Sales Representative', // Default role
          position: s.job_positions?.title || 'พนักงาน',
          password: 'PENDING_LOGIN', // Will be updated on first login
          isActive: true
        }))
      });
    }

    // 4. Fetch the complete list
    staffList = await prisma.user.findMany({
      where: {
        employeeId: { in: subordinateEmpIds },
        isActive: true
      },
      select: { id: true, fullName: true, position: true }
    });

  } else {
    staffList = await prisma.user.findMany({
      where: {
        id: user.id,
        isActive: true
      },
      select: { id: true, fullName: true, position: true }
    });
  }

  const [initialTargets, initialTelesalesKPIs] = await Promise.all([
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
