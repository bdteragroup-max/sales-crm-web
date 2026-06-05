import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import ClientsClientPage from '@/app/clients/ClientsClientPage';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getProvincesFromDb() {
  const result = await teraDb.$queryRaw<{ province: string | null }[]>`
    SELECT DISTINCT "province" 
    FROM "PostalData" 
    WHERE "province" IS NOT NULL 
    ORDER BY "province" ASC
  `;
  return result.filter(r => r.province).map(r => ({ province: r.province as string }));
}

// Resilient caching wrapper for provinces
export async function getProvinces() {
  try {
    const cached = await unstable_cache(
      async () => {
        const res = await getProvincesFromDb();
        return res.map((p: { province: string }) => p.province);
      },
      ['thai-provinces-list'],
      { revalidate: 3600, tags: ['thai-provinces-list'] }
    )();

    if (cached && Array.isArray(cached)) {
      return cached;
    }
    throw new Error("Invalid cache structure returned");
  } catch (e) {
    console.error("Next.js unstable_cache failed, falling back to direct DB query:", e);
    const res = await getProvincesFromDb();
    return res.map((p: { province: string }) => p.province);
  }
}

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; tab?: string; handler?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const user = await getUser();
  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const search = (params.search || '').trim();
  const handler = (params.handler || '').trim();
  
  const limit = 10;
  const skip = (page - 1) * limit;

  let roleWhere: any = { OR: [{ assignedUserId: user?.id }, { assignedUserId: null }] };
  if (user?.role === 'ผู้จัดการ' || (user?.role || '').toLowerCase() === 'sales manager' || (user?.role || '').toLowerCase() === 'marketing manager' || (user?.role || '').toLowerCase() === 'ผู้จัดการฝ่ายการตลาด' || (user?.role || '').toLowerCase() === 'ผู้จัดการการตลาด' || (user?.role || '').toLowerCase() === 'ผู้การจัดการตลาด') {
    roleWhere = {}; // Managers can see all clients
  }

  // Build database search filters
  const companySearchFilter: any = {
    AND: [
      roleWhere,
      ...(search ? [{
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { taxId: { contains: search, mode: 'insensitive' as const } },
          { businessType: { contains: search, mode: 'insensitive' as const } },
          { province: { contains: search, mode: 'insensitive' as const } },
        ],
      }] : []),
      ...(handler === 'unassigned' 
        ? [{
            assignedUserId: null,
            quotations: { none: { salesperson: { isActive: true } } },
            telesales: { none: { userId: { not: null } } }
          }] 
        : handler 
          ? [{
              OR: [
                { assignedUserId: handler },
                { quotations: { some: { salespersonId: handler, salesperson: { isActive: true } } } },
                { telesales: { some: { userId: handler } } }
              ]
            }] 
          : [])
    ]
  };

  const contactSearchFilter = search
    ? {
        OR: [
          { contactName: { contains: search, mode: 'insensitive' as const } },
          { mobilePhone: { contains: search, mode: 'insensitive' as const } },
          { position: { contains: search, mode: 'insensitive' as const } },
          { company: { companyName: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  // Parallel database execution (wrapped in try/catch to surface DB errors and fallback)
  const tStartQueries = performance.now();
  let companies: { companyName?: string }[] = [];
  let companiesCount = 0;
  let contacts: unknown[] = [];
  let contactsCount = 0;
  let salesReps: unknown[] = [];
  let businessTypes: unknown[] = [];
  let provinces: string[] = [];
  let allCompaniesMinimal: unknown[] = [];

  let salesRepsWhere: any = { role: { in: ['ตัวแทนฝ่ายขาย', 'ผู้จัดการ', 'sales manager', 'Sales Manager'] }, isActive: true };
  if (user?.role === 'ผู้จัดการ' || (user?.role || '').toLowerCase() === 'sales manager') {
    salesRepsWhere = { role: { in: ['ตัวแทนฝ่ายขาย', 'ผู้จัดการ', 'sales manager', 'Sales Manager'] }, isActive: true };
  } else if (user?.role === 'ตัวแทนฝ่ายขาย') {
    salesRepsWhere = { id: user.id, isActive: true };
  }

  try {
    // -1. Sync active status from HR database
    try {
      const resignedInHr = await teraDb.employees.findMany({
        where: { is_active: false },
        select: { emp_id: true }
      });
      const resignedEmpIds = resignedInHr.map((e: any) => e.emp_id).filter(Boolean);
      if (resignedEmpIds.length > 0) {
        await prisma.user.updateMany({
          where: { employeeId: { in: resignedEmpIds }, isActive: true },
          data: { isActive: false }
        });
      }
    } catch (e) {
      console.warn('Failed to sync inactive users from HR DB', e);
    }

    // 0. Auto-unassign resigned/inactive administrators from companies
    const inactiveUsers = await prisma.user.findMany({
      where: { isActive: false },
      select: { id: true }
    });
    const inactiveUserIds = inactiveUsers.map((u: { id: string }) => u.id);
    if (inactiveUserIds.length > 0) {
      const hasInactiveAssignment = await prisma.company.findFirst({
        where: {
          assignedUserId: { in: inactiveUserIds }
        },
        select: { id: true }
      });
      if (hasInactiveAssignment) {
        await prisma.company.updateMany({
          where: {
            assignedUserId: { in: inactiveUserIds }
          },
          data: {
            assignedUserId: null
          }
        });
        console.log(`[clients] Auto-unassigned inactive users: ${inactiveUserIds.join(', ')}`);
      }
    }

    const results = await Promise.all([
    // 1. Paginated Companies
    prisma.company.findMany({
      where: companySearchFilter,
      orderBy: { updatedAt: 'desc' as const },
      take: limit,
      skip: skip,
      include: {
        contacts: true,
        assignedUser: {
          include: { employeeSale: true }
        },
        telesales: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { 
            createdAt: true, 
            callDate: true,
            user: {
              select: {
                id: true,
                fullName: true,
                isActive: true,
                employeeSale: { select: { position: true } }
              }
            }
          }
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            quotationDate: true,
            status: true,
            salesperson: {
              select: {
                id: true,
                fullName: true,
                role: true,
                isActive: true,
                employeeSale: {
                  select: {
                    position: true
                  }
                }
              }
            }
          }
        },
        _count: { select: { quotations: true, telesales: true } },
      },
    }),
    // 2. Count for Companies matching search filter
    prisma.company.count({ where: companySearchFilter }),

    // 3. Paginated Contacts
    prisma.contact.findMany({
      where: contactSearchFilter,
      orderBy: { updatedAt: 'desc' as const },
      take: limit,
      skip: skip,
      include: { company: true },
    }),
    // 4. Count for Contacts matching search filter
    prisma.contact.count({ where: contactSearchFilter }),

    // 5. Active Sales Representatives & Managers for dropdown
    prisma.user.findMany({
      where: salesRepsWhere,
      select: { id: true, fullName: true, role: true, employeeSale: { select: { position: true } } }
    }),

    // 6. Business Types
    prisma.businessType.findMany({ orderBy: { name: 'asc' } }),

    // 7. Provinces list (cached resiliently)
    getProvinces(),

    // 8. Lightweight minimal companies list for the "Add Contact" selection modal
    prisma.company.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' }
    })
    ]);

    [
      companies,
      companiesCount,
      contacts,
      contactsCount,
      salesReps,
      businessTypes,
      provinces,
      allCompaniesMinimal
    ] = results as [
      { companyName?: string }[],
      number,
      unknown[],
      number,
      unknown[],
      unknown[],
      string[],
      unknown[]
    ];

    try {
      console.log('[clients] query results', {
        companiesCount: companies.length,
        companiesCountFromCount: companiesCount,
        contactsCount: contacts.length,
        contactsCountFromCount: contactsCount,
        firstCompany: companies[0]?.companyName
      });
    } catch {}

    const tEndQueries = performance.now();
    const dbTime = tEndQueries - tStartQueries;
    console.log(`[PERF] ClientsPage Initial DB Queries Promise.all took: ${dbTime.toFixed(2)}ms`);
  } catch (err) {
    console.error('[clients] DB query error in ClientsPage:', err);
    // Leave fallback empty data so the page renders and the client can see an empty state.
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
      <ClientsClientPage
        initialCompanies={JSON.parse(JSON.stringify(companies))}
        initialContacts={JSON.parse(JSON.stringify(contacts))}
        companiesCount={companiesCount}
        contactsCount={contactsCount}
        allCompanies={JSON.parse(JSON.stringify(allCompaniesMinimal))}
        salesReps={JSON.parse(JSON.stringify(salesReps))}
        businessTypes={JSON.parse(JSON.stringify(businessTypes))}
        provinces={provinces}
        currentPage={page}
        limit={limit}
        currentUser={user ? { id: user.id, fullName: user.fullName, role: user.role } : null}
      />
    </main>
  );
}
