import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import JobsClientPage from "./JobsClientPage";

export const dynamic = 'force-dynamic';

export default async function JobsPage() { 
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { employeeSale: true }
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  const isManager = user.role === 'ผู้จัดการ'; 

  const jobs = await prisma.job.findMany({ 
    where: isManager 
    ? {} 
    : { sellerName: user.fullName ?? "" }, 
    include: { 
      quotation: true,
      stepLogs: { orderBy: { completedAt: "asc" } }
    }, 
    orderBy: { dateClosed: "desc" }, 
  }); 

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/jobs" 
        userFullName={user.fullName} 
        userId={user.id} 
        userRole={user.role} 
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <JobsClientPage 
          jobs={JSON.parse(JSON.stringify(jobs))} 
          isManager={isManager} 
          currentUser={user.fullName ?? ""}
          userDept={user.employeeSale?.department || "sales"} 
        />
      </main>
    </div>
  );
}
