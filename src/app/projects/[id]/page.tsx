import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) { 
  const params = await props.params;
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user || !user.isActive) redirect('/')

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      manager: {
        select: { id: true, fullName: true, role: true }
      },
      members: {
        include: {
          user: {
            select: { id: true, fullName: true, role: true, email: true, phoneNumber: true }
          }
        }
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, fullName: true }
          },
          subtasks: true
        },
        orderBy: [{ order: 'asc' }, { planStart: 'asc' }]
      },
      job: true
    }
  });

  if (!project) redirect('/projects')

  // Check access permission
  const roleLower = (user.role || '').toLowerCase();
  const isManager = user.role === 'ผู้จัดการ' || roleLower.includes('manager') || roleLower.includes('mgr') || user.role === 'Admin' || roleLower.includes('admin');
  const isMember = project.members.some(m => m.userId === user.id) || project.managerId === user.id;

  if (!isManager && !isMember) redirect('/projects')

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true }
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeRoute="/projects" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 overflow-hidden relative custom-scrollbar flex flex-col h-full bg-gray-50/50 pt-16 md:pt-0">
        <ProjectDetailClient project={project} currentUser={user} isManager={isManager} allUsers={users} />
      </main>
    </div>
  )
}
