import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import { decrypt } from '@/app/lib/session';
import { cookies } from 'next/headers';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';

export default async function DepartmentFuelReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await cookies()).get('session')?.value;
  if (!session) redirect('/login');
  
  const payload = await decrypt(session);
  if (!payload?.userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || !user.isActive) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/department/fuel-report" 
        userFullName={user.fullName} 
        userId={user.id} 
        userRole={user.role} 
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-[#fafbfc]">
        {children}
      </main>
    </div>
  );
}
