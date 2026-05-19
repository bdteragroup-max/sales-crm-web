import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import ClientsClientPage from '@/app/clients/ClientsClientPage';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getProvincesFromDb() {
  return await prisma.postalData.findMany({
    select: { province: true },
    distinct: ['province'],
    orderBy: { province: 'asc' }
  });
}

// Resilient caching wrapper for provinces
export async function getProvinces() {
  try {
    const cached = await unstable_cache(
      async () => {
        const res = await getProvincesFromDb();
        return res.map((p: any) => p.province);
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
    return res.map((p: any) => p.province);
  }
}

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; tab?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const user = await getUser();
  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const search = (params.search || '').trim();
  
  const limit = 10;
  const skip = (page - 1) * limit;

  // Build database search filters
  const companySearchFilter = search
    ? {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { taxId: { contains: search, mode: 'insensitive' as const } },
          { businessType: { contains: search, mode: 'insensitive' as const } },
          { province: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

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

  // Parallel database execution
  const tStartQueries = performance.now();
  const [
    companies,
    companiesCount,
    contacts,
    contactsCount,
    salesReps,
    businessTypes,
    provinces,
    allCompaniesMinimal
  ] = await Promise.all([
    // 1. Paginated Companies
    prisma.company.findMany({
      where: companySearchFilter,
      orderBy: { companyName: 'asc' },
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
          select: { createdAt: true, callDate: true }
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            quotationDate: true,
            salesperson: {
              select: {
                id: true,
                fullName: true,
                role: true,
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
      orderBy: { contactName: 'asc' },
      take: limit,
      skip: skip,
      include: { company: true },
    }),
    // 4. Count for Contacts matching search filter
    prisma.contact.count({ where: contactSearchFilter }),

    // 5. Active Sales Representatives & Managers for dropdown
    prisma.user.findMany({
      where: { role: { in: ['ตัวแทนฝ่ายขาย', 'ผู้จัดการ'] }, isActive: true },
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
  const tEndQueries = performance.now();
  const dbTime = tEndQueries - tStartQueries;
  console.log(`[PERF] ClientsPage Initial DB Queries Promise.all took: ${dbTime.toFixed(2)}ms`);

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/clients" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
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
        />
      </main>
    </div>
  );
}
