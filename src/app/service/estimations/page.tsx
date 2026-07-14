import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import EstimationsClientPage from './EstimationsClientPage'; // force ts update

export const metadata = {
  title: 'ประเมินราคา - TERA CRM',
};

export default async function EstimationsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const employee = user?.employeeId
    ? await prisma.employees.findUnique({ where: { emp_id: user.employeeId } })
    : null;

  const currentUser = {
    ...user,
    fullName: employee?.name || user?.fullName || 'ผู้ใช้งานระบบ',
  };

  // Fetch service team members for assignment (MGR role only)
  let serviceTeamMembers: any[] = [];
  const isManager = (currentUser.role || '').toLowerCase().includes('service engineer mgr') || 
                    (currentUser.role || '').toLowerCase().includes('project manager') ||
                    (currentUser.role || '').toLowerCase().includes('ผู้จัดการโครงการ') ||
                    currentUser.role === 'ผู้จัดการ';
  console.log('[EstimationsPage] User role:', currentUser.role, 'isManager:', isManager);
  
  if (isManager) {
    serviceTeamMembers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: "service", mode: "insensitive" } },
          { role: { contains: "บริการ", mode: "insensitive" } },
          { role: { contains: "ช่าง", mode: "insensitive" } },
          { role: { contains: "project", mode: "insensitive" } },
          { role: { contains: "โปรเจค", mode: "insensitive" } },
          { role: { contains: "design", mode: "insensitive" } },
          { role: { contains: "ออกแบบ", mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        fullName: true,
        role: true,
      },
      orderBy: { fullName: 'asc' }
    });
  }

  // Fetch only requirements that are sent to service
  // MGR sees all. Non-MGR sees only unassigned or assigned to them.
  const records = await prisma.customerRequirement.findMany({
    where: { 
      isSentToService: true,
      ...(isManager ? {} : {
        OR: [
          { assignedToUserId: null }, // Still show unassigned ones just in case? Or only assigned?
          { assignedToUserId: currentUser.id }
        ]
      })
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <EstimationsClientPage
      currentUser={currentUser}
      initialRecords={records}
      serviceTeamMembers={serviceTeamMembers}
      isManager={isManager}
    />
  );
}
