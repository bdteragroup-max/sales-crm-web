import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import ProjectsClientPage from "./ProjectsClientPage";

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() { 
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  const roleLower = (user.role || '').toLowerCase();
  const isManager = user.role === 'ผู้จัดการ' || roleLower.includes('manager') || roleLower.includes('mgr') || user.role === 'Admin' || roleLower.includes('admin');

  const whereClause = isManager ? {} : {
    OR: [
      { managerId: user.id },
      { members: { some: { userId: user.id } } }
    ]
  };

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      manager: true,
      members: {
        include: { user: true }
      },
      tasks: true,
      job: true,
      dailyLogs: {
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          reporter: { select: { fullName: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const serializedProjects = JSON.parse(JSON.stringify(projects));
  const serializedUser = JSON.parse(JSON.stringify(user));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeRoute="/projects" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 overflow-hidden relative custom-scrollbar flex flex-col h-full bg-gray-50/50 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto">
          <ProjectsClientPage currentUser={serializedUser} projects={serializedProjects} isManager={isManager} />
        </div>
      </main>
    </div>
  )
}
