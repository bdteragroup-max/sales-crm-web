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

  // Fetch Payment Tasks
  const paymentTasks = await prisma.paymentTask.findMany({
    include: {
      job: true
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
