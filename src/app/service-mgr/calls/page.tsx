import { Suspense } from 'react';
import { getServiceCallLogs, getServiceCallDashboardStats, getServiceUsers } from '@/app/actions/service-calls';
import { getUser } from '@/app/lib/dal';
import ServiceMgrCallsClient from './ServiceMgrCallsClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'แดชบอร์ดจัดการแจ้งปัญหาลูกค้า (Service Manager)',
  description: 'ระบบกำกับดูแล มอบหมายงานช่าง และติดตามเคสแจ้งปัญหาลูกค้าฝ่ายบริการ',
};

export const dynamic = 'force-dynamic';

export default async function ServiceMgrCallsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const [statsData, logsData, usersData] = await Promise.all([
    getServiceCallDashboardStats().catch(() => ({ openCount: 0, closedCount: 0, totalCount: 0 })),
    getServiceCallLogs({}).catch(() => []),
    getServiceUsers().catch(() => []),
  ]);

  const initialLogs = JSON.parse(JSON.stringify(logsData));
  const initialUsers = JSON.parse(JSON.stringify(usersData));

  return (
    <main className="w-full min-h-full bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense
          fallback={
            <div className="p-12 text-center text-gray-400 font-medium">
              กำลังโหลดข้อมูลแดชบอร์ด...
            </div>
          }
        >
          <ServiceMgrCallsClient
            initialStats={statsData}
            initialLogs={initialLogs}
            initialUsers={initialUsers}
            currentUser={user}
          />
        </Suspense>
      </div>
    </main>
  );
}
