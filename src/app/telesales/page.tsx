import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';

import TelesalesClientPage from './TelesalesClientPage';

export default async function TelesalesPage() {
  const user = await getUser();
  
  const whereClause = user?.role === 'ผู้จัดการ' ? {} : { userId: user?.id };
  
  const telesales = await prisma.telesale.findMany({
    where: whereClause,
    take: 100,
    include: {
      company: true,
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/telesales" userFullName={user?.fullName} userId={user?.id} userRole={user?.role} />
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-10">
        <TelesalesClientPage 
          userFullName={user?.fullName} 
          initialRecords={JSON.parse(JSON.stringify(telesales))} 
        />
      </main>
    </div>
  );
}
