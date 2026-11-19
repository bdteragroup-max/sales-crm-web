export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { getUser } from '@/app/lib/dal';
import {
  canAccessSolarCleaningRole,
  canEditSolarCleaningRole,
} from '@/app/lib/solarCleaningConfig';
import { listSolarCleaningInspections } from '@/app/actions/solarCleaning';
import SolarCleaningListClient from './components/SolarCleaningListClient';

export const metadata = {
  title: 'ล้างแผง & ตรวจเช็คระบบโซลาร์ | TERA CRM',
};

export default async function SolarCleaningListPage() {
  const user = await getUser();
  if (!user) {
    redirect('/');
  }

  if (!canAccessSolarCleaningRole(user.role)) {
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
            <h2 className="text-lg font-black text-gray-900">ไม่มีสิทธิ์เข้าถึงโมดูลนี้</h2>
            <p className="text-xs text-gray-500">
              โมดูลนี้เปิดใช้งานสำหรับฝ่ายโปรเจค, แอดมินโปรเจค, ผู้จัดการโปรเจค และผู้จัดการเซอร์วิส
            </p>
            <Link
              href="/dashboard"
              className="inline-flex px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const res = await listSolarCleaningInspections();
  const records = res.success && res.data ? res.data : [];

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
          <SolarCleaningListClient
            records={records}
            canCreate={canEditSolarCleaningRole(user.role)}
            currentUserId={user.id}
            userRole={user.role}
          />
        </div>
      </main>
    </div>
  );
}

