import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { redirect } from 'next/navigation'
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

  let staffPromise;
  if (user.role === 'ผู้จัดการ') {
    staffPromise = async () => {
      let subEmpIds: string[] = [];
      try {
        const subordinates = await teraDb.employees.findMany({
          where: { supervisor_id: user.employeeId, is_active: true },
          select: { emp_id: true }
        });
        subEmpIds = subordinates.map(s => s.emp_id);
      } catch (err) {
        console.warn("Failed to fetch subordinates from HR database:", err);
      }
      return prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { employeeId: { in: subEmpIds } },
            { id: user.id }
          ]
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' }
      });
    };
    staffPromise = staffPromise();
  } else {
    staffPromise = Promise.resolve([{ id: user.id, fullName: user.fullName }]);
  }

  // Parallel fetch staff list and schedules
  const [schedulesResponse, staff, businessTypesData] = await Promise.all([
    getStaffSchedules(user),
    staffPromise,
    prisma.businessType.findMany({ orderBy: { name: 'asc' } })
  ]);

  const initialSchedules: any[] = schedulesResponse?.success && Array.isArray(schedulesResponse?.data) ? schedulesResponse.data : []
  const businessTypes = businessTypesData.map((bt: any) => bt.name);

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
      <ScheduleClientPage
        initialSchedules={initialSchedules}
        staffList={staff}
        businessTypes={businessTypes}
        userRole={user.role}
        currentUserId={user.id}
      />
    </main>
  );
}
