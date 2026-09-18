import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation"
import Sidebar from '@/app/components/Sidebar'
import AccountingClientPage from "./AccountingClientPage"

import { syncProjectInstallmentsToPaymentTasks } from '@/app/actions/projects'

export const dynamic = 'force-dynamic'

export default async function AccountingPage() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  if (!payload?.userId) redirect('/')

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) redirect('/')

  // Role check
  const roleStr = (user.role || '').toLowerCase()
  const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน', 'ผู้จัดการ'].some(r => roleStr.includes(r))
  const isExecutive = ['ผู้บริหาร', 'executive', 'super_admin'].some(r => roleStr.includes(r))
  
  if (!isAccounting && !isExecutive) redirect('/dashboard')

  // Synchronize all projects linked to jobs with PaymentTasks
  const projectsWithJobs = await prisma.project.findMany({
    where: { jobId: { not: null } },
    select: { id: true }
  });
  for (const proj of projectsWithJobs) {
    await syncProjectInstallmentsToPaymentTasks(proj.id);
  }
  // ----------------------------------------------------------------

  // --- TEMPORARY CLEANUP FOR DUPLICATE PAYMENT TASKS ---
  const allTasksForCleanup = await prisma.paymentTask.findMany({
    orderBy: { createdAt: 'asc' }
  });
  const seenInstallments = new Set();
  const duplicateTaskIds = [];
  for (const t of allTasksForCleanup) {
    if (t.installmentNo) {
      const key = `${t.jobId}-${t.installmentNo}`;
      if (seenInstallments.has(key)) {
        duplicateTaskIds.push(t.id);
      } else {
        seenInstallments.add(key);
      }
    }
  }
  if (duplicateTaskIds.length > 0) {
    await prisma.paymentTask.deleteMany({
      where: { id: { in: duplicateTaskIds } }
    });
  }
  // ----------------------------------------------------------------

  // Fetch Payment Tasks
  const paymentTasks = await prisma.paymentTask.findMany({
    include: {
      job: {
        include: {
          quotation: true,
          project: true
        }
      }
    },
    orderBy: [
      { createdAt: 'desc' }
    ]
  })

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/accounting" 
        userFullName={user.fullName} 
        userId={user.id} 
        userRole={user.role} 
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <AccountingClientPage tasks={JSON.parse(JSON.stringify(paymentTasks))} />
      </main>
    </div>
  )
}
