import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import ScheduleClientPage from './ScheduleClientPage'
import { getStaffSchedules } from '@/app/actions/schedule'

export default async function SchedulePage() {
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

  // Parallel fetch staff list and schedules
  const [schedulesResponse, staff, businessTypesData] = await Promise.all([
    getStaffSchedules(user),
    user.role === 'ผู้จัดการ' 
      ? prisma.user.findMany({
          where: { 
            isActive: true,
            OR: [
              { employeeSale: { teamLeader: user.fullName } },
              { id: user.id }
            ]
          },
          select: { id: true, fullName: true }
        })
      : Promise.resolve([{ id: user.id, fullName: user.fullName }]),
    prisma.businessType.findMany({ orderBy: { name: 'asc' } })
  ]);

  const initialSchedules: any[] = schedulesResponse?.success && Array.isArray(schedulesResponse?.data) ? schedulesResponse.data : []
  const businessTypes = businessTypesData.map((bt: any) => bt.name);

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/schedule" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 overflow-hidden p-6 bg-white">
        <ScheduleClientPage
          initialSchedules={initialSchedules}
          staffList={staff}
          businessTypes={businessTypes}
          userRole={user.role}
          currentUserId={user.id}
        />
      </main>
    </div>
  )
}
