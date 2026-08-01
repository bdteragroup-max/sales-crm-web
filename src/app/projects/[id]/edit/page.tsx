import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import EditProjectClient from "./EditProjectClient";

export const dynamic = 'force-dynamic';

export default async function EditProjectPage(props: { params?: Promise<any> | any, searchParams?: Promise<any> | any }) { 
  const params = props.params ? await props.params : {};
  const id = params.id;
  
  if (!id) redirect('/projects');

  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user || !user.isActive) redirect('/')

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: true,
      tasks: {
        orderBy: { createdAt: 'asc' }
      },
      job: {
        select: { 
          id: true, 
          jobNumber: true, 
          customerName: true, 
          item: true,
          quotation: { select: { actualClosingAmount: true, totalAmountBeforeVat: true } }
        }
      }
    }
  });

  if (!project) redirect('/projects');

  // Serialize project to avoid Decimal issues
  const serializedProject = JSON.parse(JSON.stringify(project));

  // Get all users for team assignment
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true }
  });

  // Get jobs that can be linked
  let jobs = await prisma.job.findMany({
    select: { 
      id: true, 
      jobNumber: true, 
      customerName: true, 
      item: true,
      quotation: { select: { actualClosingAmount: true, totalAmountBeforeVat: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Ensure initialJob is in the list
  if (project.jobId && !jobs.some(j => j.id === project.jobId)) {
    if (project.job) {
      jobs = [project.job, ...jobs];
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeRoute="/projects" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 overflow-hidden relative custom-scrollbar flex flex-col h-full bg-gray-50/50 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto">
          <EditProjectClient users={JSON.parse(JSON.stringify(users))} jobs={JSON.parse(JSON.stringify(jobs))} currentUserId={user.id} project={serializedProject} currentUserRole={user.role} />
        </div>
      </main>
    </div>
  )
}
