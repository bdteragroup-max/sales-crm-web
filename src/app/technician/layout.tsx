import React from 'react';
import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 text-gray-900 font-sans overflow-hidden print:overflow-visible print:block">
      <Sidebar activeRoute="/technician/production" userFullName={user?.fullName || undefined} userId={user?.id || undefined} userRole={user?.role || undefined} theme="red" />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
