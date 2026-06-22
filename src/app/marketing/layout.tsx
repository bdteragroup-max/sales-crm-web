import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import prisma from '@/app/lib/db'
import Sidebar from '@/app/components/Sidebar'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  const roleStr = (user.role || '').toLowerCase();
  
  // Only allow marketing roles or managers
  const isMarketing = ['marketing', 'การตลาด'].some(r => roleStr.includes(r));
  const isManager = ['ผู้จัดการ', 'manager', 'sales manager', 'marketing manager'].some(r => roleStr.includes(r));
  
  if (!isMarketing && !isManager) {
    redirect('/dashboard') // Or some unauthorized page
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/marketing" userFullName={user.fullName} userId={user.employeeId || user.id} userRole={user.role} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
