import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation"
import Sidebar from '@/app/components/Sidebar'
import AccountingClientPage from "./AccountingClientPage"

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
  
  if (!isAccounting) redirect('/dashboard')

  // --- TEMPORARY BACKFILL FOR PROJECT JOBS WITHOUT PAYMENT TASKS ---
  const projectJobsWithoutTasks = await prisma.job.findMany({
    where: {
      jobType: 'งานโปรเจค',
      paymentTasks: { none: {} }
    },
    include: { project: true }
  })
  
  if (projectJobsWithoutTasks.length > 0) {
    for (const job of projectJobsWithoutTasks) {
      const p = job.project
      if (p) {
        const installments = []
        if (p.installment1) installments.push({ amount: p.installment1 })
        if (p.installment2) installments.push({ amount: p.installment2 })
        if (p.installment3) installments.push({ amount: p.installment3 })
        if (p.installment4) installments.push({ amount: p.installment4 })

        if (installments.length > 0) {
          const startDate = p.startDate ? new Date(p.startDate) : new Date(job.createdAt);
          const endDate = p.endDate ? new Date(p.endDate) : (job.deliveryDate ? new Date(job.deliveryDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
          const totalDurationMs = endDate.getTime() - startDate.getTime();

          await prisma.paymentTask.createMany({
            data: installments.map((inst, idx) => {
              let newDate = endDate;
              if (installments.length > 1) {
                const fraction = idx / (installments.length - 1);
                newDate = new Date(startDate.getTime() + (totalDurationMs * fraction));
              }
              return {
                jobId: job.id,
                status: 'รอดำเนินการ',
                dueDate: newDate,
                installmentNo: idx + 1,
                installmentTotal: installments.length,
                installmentAmount: Number(inst.amount)
              };
            })
          })
        } else {
          await prisma.paymentTask.create({
            data: {
              jobId: job.id,
              status: 'รอดำเนินการ',
              dueDate: p.endDate ? new Date(p.endDate) : (job.deliveryDate ? new Date(job.deliveryDate) : null)
            }
          })
        }
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId: job.id,
            status: 'รอดำเนินการ',
            dueDate: job.deliveryDate ? new Date(job.deliveryDate) : null
          }
        })
      }
    }
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
          quotation: true
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
