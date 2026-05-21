import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import PipelineClientPage from './PipelineClientPage'

export const dynamic = 'force-dynamic';

export default async function PipelinePage({
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

  // Parse Date Filters
  const dateField = (resolvedParams.dateField as string) || 'quotationDate'
  const preset = resolvedParams.preset as string | undefined
  const dateFromParam = resolvedParams.dateFrom as string | undefined
  const dateToParam = resolvedParams.dateTo as string | undefined

  let from: Date | undefined
  let to: Date | undefined

  const now = new Date()
  if (preset === 'thisMonth') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  } else if (preset === '3months') {
    from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  } else if (preset === 'custom' && dateFromParam && dateToParam) {
    from = new Date(dateFromParam)
    to = new Date(dateToParam)
    to.setHours(23, 59, 59, 999) // include end of day
  }

  const dateFilter = from && to ? {
    [dateField]: { gte: from, lte: to }
  } : {}

  const finalWhereClause = { ...whereClause, ...dateFilter }

  const quotations = await prisma.quotation.findMany({
    where: finalWhereClause,
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
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
      <PipelineClientPage
        initialQuotations={JSON.parse(JSON.stringify(quotations))}
        teamMembers={JSON.parse(JSON.stringify(teamMembers))}
        userRole={user.role}
        currentUserId={user.id}
        initialDateField={dateField}
        initialPreset={preset || ''}
        initialDateFrom={dateFromParam || ''}
        initialDateTo={dateToParam || ''}
      />
    </main>
  )
}
