export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { getUser } from '@/app/lib/dal';
import { canAccessSolarCleaningRole } from '@/app/lib/solarCleaningConfig';
import {
  getSolarCleaningById,
  getSolarCleaningSelectableCustomers,
  getSolarCleaningSelectableProjects,
} from '@/app/actions/solarCleaning';
import SolarCleaningFormClient from '../components/SolarCleaningFormClient';

export const metadata = {
  title: 'รายละเอียดใบตรวจเช็คระบบ & Inspection Report | TERA CRM',
};

export default async function SolarCleaningDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/');
  }

  if (!canAccessSolarCleaningRole(user.role)) {
    redirect('/projects/solar-cleaning');
  }

  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const [res, projects, customers] = await Promise.all([
    getSolarCleaningById(params.id),
    getSolarCleaningSelectableProjects(),
    getSolarCleaningSelectableCustomers(),
  ]);

  if (!res.success || !res.data) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          activeRoute="/projects/solar-cleaning"
          userFullName={user.fullName}
          userId={user.employeeId}
          userRole={user.role}
        />
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center space-y-3 shadow-xs">
            <h2 className="text-lg font-black text-gray-900">ไม่พบข้อมูลเอกสาร</h2>
            <p className="text-xs text-gray-500">{res.error || 'เอกสารอาจถูกลบไปแล้ว'}</p>
            <Link
              href="/projects/solar-cleaning"
              className="inline-flex px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold"
            >
              กลับหน้ารายการ
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const defaultTab = searchParams?.tab === 'report' ? 'report' : 'precheck';

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
            initialRecord={res.data}
            projects={projects}
            customers={customers}
            currentUser={{
              id: user.id,
              fullName: user.fullName,
              role: user.role,
            }}
            defaultTab={defaultTab}
          />
        </div>
      </main>
    </div>
  );
}

