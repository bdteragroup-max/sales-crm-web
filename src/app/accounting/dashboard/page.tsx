import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation"
import Sidebar from '@/app/components/Sidebar'
import AccountingDashboardClient from "./AccountingDashboardClient"
import { getAccountingDashboardData } from '@/app/actions/accountingDashboard'

export const dynamic = 'force-dynamic'

export default async function AccountingDashboardPage(props: { searchParams: any }) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  if (!payload?.userId) redirect('/')

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) redirect('/')

  // Role check: Accounting and Executive
  const roleStr = (user.role || '').toLowerCase()
  const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน'].some(r => roleStr.includes(r))
  const isExecutive = ['ผู้บริหาร', 'executive', 'super_admin'].some(r => roleStr.includes(r))
  
  if (!isAccounting && !isExecutive) redirect('/dashboard') // Redirect non-authorized roles

  const sp = await props.searchParams;
  const startDate = sp?.startDate;
  const endDate = sp?.endDate;

  // Fetch Dashboard Data
  const data = await getAccountingDashboardData(startDate, endDate)

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/accounting/dashboard" 
        userFullName={user.fullName} 
        userId={user.id} 
        userRole={user.role} 
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <AccountingDashboardClient data={JSON.parse(JSON.stringify(data))} />
      </main>
    </div>
  )
}
