import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import SalesClientPage from './SalesClientPage';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    prefill?: string;
    companyId?: string;
    contactId?: string;
  }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect('/login');

  const isManager = user.role === 'ผู้จัดการ';

  // Manager sees all; rep sees only their own
  const whereClause = isManager ? {} : { salespersonId: user.id };

  // Fetch prefill details if requested
  let prefillData: any = null;
  if (params.prefill === 'true' && params.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
      include: {
        contacts: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (company) {
      let contact = null;
      if (params.contactId) {
        contact = company.contacts.find(c => c.id === params.contactId) || null;
      }
      if (!contact && company.contacts.length > 0) {
        contact = company.contacts[0];
      }
      prefillData = {
        company: JSON.parse(JSON.stringify(company)),
        contact: contact ? JSON.parse(JSON.stringify(contact)) : null
      };
    }
  }

  const [quotations, currentUserWithSale, businessTypesData] = await Promise.all([
    prisma.quotation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        contact: true,
        salesperson: { include: { employeeSale: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      include: { employeeSale: true },
    }),
    prisma.businessType.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const businessTypes = businessTypesData.map(bt => bt.name);

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/sales" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
        <SalesClientPage
          initialQuotations={JSON.parse(JSON.stringify(quotations))}
          businessTypes={businessTypes}
          currentUserSale={currentUserWithSale?.employeeSale}
          prefillData={prefillData}
        />
      </main>
    </div>
  );
}
