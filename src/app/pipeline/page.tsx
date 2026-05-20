import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import PipelineClientPage from './PipelineClientPage'

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
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

  const isManager = user.role === 'ผู้จัดการ'

  // Managers see everything; Reps see their own + any unassigned (salespersonId = null)
  // Unassigned records occur from bulk-import or legacy entries without a salesperson linked
  const whereClause = isManager
    ? {}
    : { OR: [{ salespersonId: user.id }, { salespersonId: null }] }

  // For managers: first try to get team members via EmployeeSale.teamLeader relationship.
  // If that returns only 1 record (just the manager themselves) the EmployeeSale table may
  // not be fully configured — fall back to ALL active users so the pipeline is never empty.
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
      // Fallback: show all active users in the filter dropdown
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

  const quotations = await prisma.quotation.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      company: true,
      contact: true,
      salesperson: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    }
  })

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/pipeline" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
        <PipelineClientPage
          initialQuotations={JSON.parse(JSON.stringify(quotations))}
          teamMembers={JSON.parse(JSON.stringify(teamMembers))}
          userRole={user.role}
          currentUserId={user.id}
        />
      </main>
    </div>
  )
}
