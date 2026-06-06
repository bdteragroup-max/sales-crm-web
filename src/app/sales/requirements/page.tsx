import React from 'react';
import CustomerRequirementClient from './CustomerRequirementClient';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';

export default async function CustomerRequirementPage() {
  const user = await getUser();
  if (!user) redirect('/');

  // Fetch history for this user
  const history = await prisma.customerRequirement.findMany({
    orderBy: { date: 'desc' },
  });

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
      <CustomerRequirementClient currentUser={user} history={history} />
    </main>
  );
}
