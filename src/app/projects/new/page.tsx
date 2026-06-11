import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import NewProjectClient from "./NewProjectClient";

export const dynamic = 'force-dynamic';

export default async function NewProjectPage(props: { searchParams?: Promise<any> | any }) { 
  const searchParams = props.searchParams ? await props.searchParams : {};
  const initialJobId = searchParams.jobId;

  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user || !user.isActive) redirect('/')

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
    take: 100 // Limit for performance, normally would have an autocomplete
  });

  // Ensure initialJob is in the list
  if (initialJobId && !jobs.some(j => j.id === initialJobId)) {
    const specificJob = await prisma.job.findUnique({
      where: { id: initialJobId },
      select: { 
        id: true, 
        jobNumber: true, 
        customerName: true, 
        item: true,
        quotation: { select: { actualClosingAmount: true, totalAmountBeforeVat: true } }
      }
    });
    if (specificJob) {
      jobs = [specificJob, ...jobs];
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeRoute="/projects" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 overflow-hidden relative custom-scrollbar flex flex-col h-full bg-gray-50/50 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto">
          <NewProjectClient users={users} jobs={jobs} currentUserId={user.id} initialJobId={initialJobId} />
        </div>
      </main>
    </div>
  )
}
