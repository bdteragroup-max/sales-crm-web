import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import SalesClientPage from './SalesClientPage';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const isManager = user.role === 'ผู้จัดการ';

  // Manager sees all; rep sees only their own
  const whereClause = isManager ? {} : { salespersonId: user.id };

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
      <main className="flex-1 overflow-hidden p-6 bg-white">
        <SalesClientPage
          initialQuotations={JSON.parse(JSON.stringify(quotations))}
          businessTypes={businessTypes}
          currentUserSale={currentUserWithSale?.employeeSale}
        />
      </main>
    </div>
  );
}
