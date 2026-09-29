import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import NewLeadClient from './NewLeadClient'
import prisma from '@/app/lib/db'

export default async function NewMarketingLeadPage() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const dbUsers = await prisma.user.findMany({
    where: { 
      isActive: true,
    },
    select: { 
      id: true, 
      fullName: true,
      employeeId: true
    },
    orderBy: { fullName: 'asc' }
  })

  let salesReps: any[] = []
  if (dbUsers.length > 0) {
    const { teraDb } = await import('@/app/lib/teraDb')
    const employeeIds = dbUsers.map(u => u.employeeId).filter(Boolean) as string[]
    let hrEmployeeMap = new Map<string, string>()
    
    if (employeeIds.length > 0) {
      const hrEmployees = await teraDb.employees.findMany({
        where: { emp_id: { in: employeeIds } },
        select: { emp_id: true, nickname: true }
      })
      hrEmployeeMap = new Map(hrEmployees.map(e => [e.emp_id, e.nickname || '']))
    }

    salesReps = dbUsers.map(u => ({
      id: u.id,
      fullName: u.fullName,
      nickname: u.employeeId ? hrEmployeeMap.get(u.employeeId) || null : null
    }))
  }

  const campaigns = await (prisma as any).adCampaign.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      internalCode: true,
      campaignId: true,
      targetAudience: true,
      channel: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        <NewLeadClient userId={payload.userId as string} salesReps={salesReps} campaigns={campaigns} />
      </div>
    </main>
  )
}
