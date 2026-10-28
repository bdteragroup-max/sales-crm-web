import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import VisitReportClient from './VisitReportClient'
import { isSuperUser, isMarketingManager } from '@/app/lib/roleHelper'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function VisitReportPage({ params }: PageProps) {
  const { id } = await params
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  // Fetch the schedule details along with company and salesperson info
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          fullName: true,
          employeeId: true,
          role: true
        }
      },
      company: true
    }
  })

  if (!schedule) {
    redirect('/schedule')
  }

  // Access check: only the owner or a manager/marketing manager can view/report on this schedule
  const roleLower = (user.role || '').toLowerCase().trim();
  const isManager =
    isSuperUser(user.role) ||
    isMarketingManager(user.role) ||
    ['ผู้จัดการ', 'manager', 'sales manager', 'marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด', 'super_admin', 'super admin', 'admin'].includes(roleLower) ||
    roleLower.includes('manager') ||
    roleLower.includes('ผู้จัดการ');

  if (!isManager && schedule.userId !== user.id) {
    redirect('/schedule')
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 pb-24">
      <VisitReportClient
        schedule={JSON.parse(JSON.stringify(schedule))}
        currentUserId={user.id}
        userRole={user.role}
      />
    </main>
  )
}
