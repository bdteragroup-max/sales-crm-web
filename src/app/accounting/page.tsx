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
  const isExecutive = ['ผู้บริหาร', 'executive', 'super_admin'].some(r => roleStr.includes(r))
  
  if (!isAccounting && !isExecutive) redirect('/dashboard')

  // Fetch Payment Tasks with optimized field selection (omits heavy checklist image blobs & unneeded JSONs)
  const paymentTasks = await prisma.paymentTask.findMany({
    select: {
      id: true,
      jobId: true,
      status: true,
      creditType: true,
      installmentNo: true,
      installmentTotal: true,
      installmentAmount: true,
      paidAmount: true,
      dueDate: true,
      paidDate: true,
      invoiceNumber: true,
      invoiceDate: true,
      note: true,
      createdAt: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          customerName: true,
          companyCode: true,
          item: true,
          sellerName: true,
          paymentMethod: true,
          jobType: true,
          month: true,
          yearBe: true,
          deliveryDate: true,
          creditTerms: true,
          createdAt: true,
          quotationNumber: true,
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
              quotationDate: true,
              subject: true,
              totalAmountBeforeVat: true,
              actualClosingAmount: true,
              salesperson: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              projectNumber: true,
              name: true,
              projectValue: true,
              contractSignatory: true,
            },
          },
        },
      },
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
