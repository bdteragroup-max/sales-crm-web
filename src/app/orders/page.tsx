import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import OrdersClientPage from './OrdersClientPage'

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
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

  const roleStr = (user.role || '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'ผู้จัดการ', 'manager', 'sales manager', 'marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด', 'ฝ่ายผลิต', 'production', 'คลังสินค้า', 'store', 'บัญชี', 'accounting'].some(r => roleStr.includes(r))

  const whereClause: any = {
    quotation: {
      jobs: {
        some: {
          jobType: {
            in: ['งานตู้', 'งานตู้ + ติดตั้ง', 'Cabinet Work', 'Cabinet Work + Installation']
          }
        }
      }
    }
  }

  if (!isManager) {
    whereClause.OR = [{ salespersonId: user.id }, { salespersonId: null }]
  }

  let teamMembers: { id: string; fullName: string }[] = []
  if (isManager) {
    const teamViaRelation = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { employeeSale: { teamLeader: user.fullName } },
          { id: user.id }
        ]
      },
      select: { id: true, fullName: true }
    })

    if (teamViaRelation.length <= 1) {
      teamMembers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' }
      })
    } else {
      teamMembers = teamViaRelation
    }
  } else {
    teamMembers = [{ id: user.id, fullName: user.fullName }]
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      company: true,
      quotation: {
        select: {
          quotationNumber: true,
          jobs: {
            select: {
              id: true,
              jobNumber: true,
              jobType: true,
              item: true
            }
          }
        }
      },
      salesperson: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      },
      purchaseRequests: {
        include: {
          purchaseOrders: true
        }
      }
    }
  })

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:px-10 lg:px-14 md:py-8 bg-gray-50/30 pb-24 md:pb-8">
      <OrdersClientPage
        initialOrders={JSON.parse(JSON.stringify(orders))}
        teamMembers={JSON.parse(JSON.stringify(teamMembers))}
        userRole={user.role}
        currentUserId={user.id}
      />
    </main>
  )
}
