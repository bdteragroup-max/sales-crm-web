export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import { getUser } from '@/app/lib/dal';
import { canEditSolarCleaningRole } from '@/app/lib/solarCleaningConfig';
import {
  getSolarCleaningSelectableCustomers,
  getSolarCleaningSelectableProjects,
} from '@/app/actions/solarCleaning';
import SolarCleaningFormClient from '../components/SolarCleaningFormClient';

export const metadata = {
  title: 'สร้างใบตรวจเช็คระบบล้างแผงโซลาร์ | TERA CRM',
};

export default async function NewSolarCleaningPage() {
  const user = await getUser();
  if (!user) {
    redirect('/');
  }

  if (!canEditSolarCleaningRole(user.role)) {
    redirect('/projects/solar-cleaning');
  }

  const [projects, customers] = await Promise.all([
    getSolarCleaningSelectableProjects(),
    getSolarCleaningSelectableCustomers(),
  ]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        activeRoute="/projects/solar-cleaning"
        userFullName={user.fullName}
        userId={user.employeeId}
        userRole={user.role}
      />
      <main className="flex-1 overflow-hidden relative custom-scrollbar flex flex-col h-full bg-gray-50/50 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto">
          <SolarCleaningFormClient
            projects={projects}
            customers={customers}
            currentUser={{
              id: user.id,
              fullName: user.fullName,
              role: user.role,
            }}
          />
        </div>
      </main>
    </div>
  );
}

