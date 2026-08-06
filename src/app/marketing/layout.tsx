import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
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

  const headersList = await headers();
  const currentUrl = headersList.get('x-invoke-path') || headersList.get('referer') || '';
  
  const roleStr = (user.role || '').toUpperCase();
  
  const allowedRoles = ["MARKETING", "SERVICE", "SERVICE_ENGINEER", "SERVICE_MGR", "MANAGER", "SUPER_ADMIN", "PROJECT", "การตลาด", "บริการ", "ผู้จัดการ", "โปรเจค", "โครงการ"];
  const hasAccess = allowedRoles.some(r => roleStr.includes(r));
  
  if (!hasAccess) {
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
