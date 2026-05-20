import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import VisitReportClient from './VisitReportClient'

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

  // Access check: only the owner or a manager can view/report on this schedule
  if (user.role !== 'ผู้จัดการ' && schedule.userId !== user.id) {
    redirect('/schedule')
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-900 font-sans overflow-y-auto">
      <Sidebar activeRoute="/schedule" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 p-4 md:p-6 bg-white pb-24 md:pb-6">
        <VisitReportClient
          schedule={JSON.parse(JSON.stringify(schedule))}
          currentUserId={user.id}
          userRole={user.role}
        />
      </main>
    </div>
  )
}
