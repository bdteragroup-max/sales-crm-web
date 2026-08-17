import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { getCompanyWhereClause } from '@/app/lib/visibility';
import { teraDb } from '@/app/lib/teraDb';
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
    where: { id: payload.userId },
    include: { employeeSale: true }
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  const roleStr = (user.role || '').toLowerCase();
  const isMarketingManager = roleStr.includes('marketing manager') || roleStr.includes('ผู้จัดการฝ่ายการตลาด') || roleStr.includes('ผู้จัดการการตลาด') || roleStr.includes('ผู้การจัดการตลาด');
  const isSalesManager = user.role === 'ผู้จัดการ' || roleStr.includes('sales manager') || isMarketingManager;
  const isServiceManager = roleStr.includes('service engineer mgr');

  const teraEmployee = await teraDb.employees.findUnique({
    where: { emp_id: user.employeeId },
    include: { departments: true }
  });
  
  const resolvedDept = user.employeeSale?.department || teraEmployee?.departments?.name || "sales";
  const isSalesDept = resolvedDept.toLowerCase().includes('sale') || resolvedDept.toLowerCase().includes('ขาย') || resolvedDept.includes('เซลส์') || resolvedDept.includes('เซลล์');
  const isSalesRole = roleStr.includes('sale') || roleStr.includes('ขาย') || roleStr.includes('เซลส์') || roleStr.includes('เซลล์');
  const isSales = isSalesDept || isSalesRole;

  let teamMembers: { id: string; fullName: string }[] = []
  if (isSalesManager) {
    if (isMarketingManager) {
      // Marketing Managers see everyone
      teamMembers = await prisma.user.findMany({
        where: {
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
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' }
      })
    } else {
      // Fetch manager's direct subordinates from HR database
      let subEmpIds: string[] = [];
      try {
        const subordinates = await teraDb.employees.findMany({
          where: { supervisor_id: user.employeeId, is_active: true },
          select: { emp_id: true }
        });
        subEmpIds = subordinates.map((s) => s.emp_id);
      } catch (err) {
        console.warn("Failed to fetch subordinates from HR database:", err);
      }

      teamMembers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { employeeId: { in: subEmpIds } },
            { id: user.id }
          ]
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' }
      })
    }
  } else {
    teamMembers = [{ id: user.id, fullName: user.fullName }]
  }

  // Managers see their subordinates' records + their own; Reps see their own; Non-sales see everything
  let whereClause: any = {};
  if (isSalesManager) {
    if (isMarketingManager) {
      // Marketing Manager can see everything (like SUPER_ADMIN), and UI handles branch filtering
      whereClause = {};
    } else {
      const userBranch = user.employeeSale?.branch;
      if (userBranch) {
        // strictly lock to their subordinates
        whereClause = {
          OR: [
            { salespersonId: { in: teamMembers.map(t => t.id) } },
            {
              AND: [
                { salespersonId: null },
                {
                  OR: [
                    { company: { assignedUserId: { in: teamMembers.map(t => t.id) } } }
                  ]
                }
              ]
            }
          ]
        };
      } else {
        whereClause = { OR: [{ salespersonId: { in: teamMembers.map(t => t.id) } }, { salespersonId: null }] };
      }
    }
  } else if (isSales && !isServiceManager) {
    whereClause = { OR: [{ salespersonId: user.id }, { salespersonId: null }] };
  }
  
  // Apply company-level visibility to all quotations (Except Managers/Marketing which need full pipeline access to match Admin totals)
  if (!isSalesManager) {
    whereClause.company = getCompanyWhereClause(user as any);
  }

  // Parse Date Filters
  const dateField = (resolvedParams.dateField as string) || 'updatedAt'
  const preset = resolvedParams.preset as string | undefined
  const dateFromParam = resolvedParams.dateFrom as string | undefined
  const dateToParam = resolvedParams.dateTo as string | undefined
  const searchParam = resolvedParams.search as string | undefined

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
          role: true,
          employeeSale: {
            select: { branch: true }
          }
        }
      },
      company: {
        select: {
          id: true,
          companyName: true,
          businessType: true,
          assignedUser: {
            select: {
              employeeSale: {
                select: { branch: true }
              }
            }
          }
        }
      },
      jobs: {
        include: {
          paymentTasks: true
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
        initialSearchTerm={searchParam || ''}
      />
    </main>
  )
}
