import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
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

  const isMarketingManager = (user.role || '').toLowerCase() === 'marketing manager' || (user.role || '').toLowerCase() === 'ผู้จัดการฝ่ายการตลาด' || (user.role || '').toLowerCase() === 'ผู้จัดการการตลาด' || (user.role || '').toLowerCase() === 'ผู้การจัดการตลาด';
  const isManager = user.role === 'ผู้จัดการ' || (user.role || '').toLowerCase() === 'sales manager' || isMarketingManager;

  let teamMembers: { id: string; fullName: string }[] = []
  if (isManager) {
    const subordinates = await teraDb.employees.findMany({
      where: { supervisor_id: user.employeeId, is_active: true },
      select: { emp_id: true }
    })
    const subEmpIds = subordinates.map(s => s.emp_id)

    teamMembers = await prisma.user.findMany({
      where: isMarketingManager ? {
        isActive: true,
        NOT: {
          OR: [
            { role: 'อื่นๆ' },
            { role: { contains: 'accounting' } },
            { role: { contains: 'บัญชี' } },
            { role: { contains: 'purchasing' } },
            { role: { contains: 'จัดซื้อ' } },
            { role: { contains: 'warehouse' } },
            { role: { contains: 'คลังสินค้า' } },
            { role: { contains: 'service' } },
            { role: { contains: 'บริการ' } }
          ]
        }
      } : {
        OR: [
          { employeeId: { in: subEmpIds } },
          { employeeSale: { teamLeader: user.fullName } },
          { id: user.id }
        ]
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' }
    })
  } else {
    teamMembers = [{ id: user.id, fullName: user.fullName }]
  }

  // Managers see their team's records + unassigned; Reps see their own + any unassigned
  const whereClause = isManager
    ? { OR: [{ salespersonId: { in: teamMembers.map(t => t.id) } }, { salespersonId: null }] }
    : { OR: [{ salespersonId: user.id }, { salespersonId: null }] }

  // Parse Date Filters
  const dateField = (resolvedParams.dateField as string) || 'updatedAt'
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
    const [fromYear, fromMonth, fromDay] = dateFromParam.split('-').map(Number)
    const [toYear, toMonth, toDay] = dateToParam.split('-').map(Number)
    from = new Date(fromYear, fromMonth - 1, fromDay)
    to = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999)
  }

  const dateFilter = from && to ? {
    [dateField]: { gte: from, lte: to }
  } : {}

  const finalWhereClause = { ...whereClause, ...dateFilter }

  console.log("PIPELINE PAGE FILTER:", JSON.stringify(finalWhereClause, null, 2))

  const quotations = await prisma.quotation.findMany({
    where: finalWhereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      salesperson: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      },
      company: {
        select: {
          id: true,
          companyName: true,
          businessType: true
        }
      }
    }
  })

  // Sanitize bad salesperson names from legacy data
  quotations.forEach(q => {
    if (q.salesperson?.fullName) {
      q.salesperson.fullName = q.salesperson.fullName.replace(/u?undefined/ig, '').trim()
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
