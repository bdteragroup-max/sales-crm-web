import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import ClientsClientPage from '@/app/clients/ClientsClientPage';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const user = await getUser();

  const [companies, contacts, salesReps, businessTypes, provinces] = await Promise.all([
    prisma.company.findMany({
      orderBy: { companyName: 'asc' },
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
    prisma.contact.findMany({
      orderBy: { contactName: 'asc' },
      include: { company: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ตัวแทนฝ่ายขาย', 'ผู้จัดการ'] }, isActive: true },
      select: { id: true, fullName: true, role: true, employeeSale: { select: { position: true } } }
    }),
    prisma.businessType.findMany({ orderBy: { name: 'asc' } }),
    prisma.postalData.findMany({
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' }
    })
  ]);

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/clients" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-10">
        <ClientsClientPage
          initialCompanies={JSON.parse(JSON.stringify(companies))}
          initialContacts={JSON.parse(JSON.stringify(contacts))}
          salesReps={JSON.parse(JSON.stringify(salesReps))}
          businessTypes={JSON.parse(JSON.stringify(businessTypes))}
          provinces={JSON.parse(JSON.stringify(provinces.map((p: any) => p.province)))}
        />
      </main>
    </div>
  );
}
