import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import StockProductionClient from './StockProductionClient';

export const dynamic = 'force-dynamic';

export default async function StockProductionPage() {
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

  // Ensure only Production related roles can access this
  const roleStr = (user.role || '').toLowerCase()
  const isProduction = ['admin', 'super_admin', 'ฝ่ายผลิต', 'production', 'ผู้จัดการ'].some(r => roleStr.includes(r))

  if (!isProduction) {
    redirect('/') // Redirect unauthorized users
  }

  // Fetch initial stock orders
  const orders = await prisma.order.findMany({
    where: { isProduceToStock: true },
    orderBy: { createdAt: 'desc' },
    include: {
      statusLogs: true,
      purchaseRequests: {
        include: {
          purchaseOrders: true
        }
      }
    }
  })

  // Fetch active technicians
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true }
  })
  
  const validRoles = ['technician', 'ช่าง', 'ช่างประกอบ', 'ช่างตู้', 'ซ่อม']
  const technicians = users.filter(u => validRoles.some(role => (u.role || '').toLowerCase().includes(role)))

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/production/stock" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      
      <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:px-10 lg:px-14 md:py-8 bg-gray-50/30 pb-24 md:pb-8">
        <StockProductionClient 
          initialOrders={JSON.parse(JSON.stringify(orders))} 
          technicians={technicians}
        />
      </main>
    </div>
  )
}
