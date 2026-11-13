import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import PaymentRequestsClient from './PaymentRequestsClient';
import {
  getPaymentRequests,
  getPaymentRequestDashboardStats,
  getSystemBranches,
} from '@/app/actions/paymentRequests';

import { canManageAllPaymentRequests, normalizePersonName } from '@/app/lib/roleHelper';

export const dynamic = 'force-dynamic';

export default async function PaymentRequestsPage() {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  let requests: any[] = [];
  let stats: any = {};
  let branches: any[] = [];
  let isSupervisor = false;

  if (user.employeeId && !canManageAllPaymentRequests(user.role)) {
    try {
      const { teraDb } = await import('@/app/lib/teraDb');
      const subCount = await teraDb.employees.count({
        where: {
          OR: [
            { supervisor_id: user.employeeId },
            { secondary_supervisor_id: user.employeeId },
          ],
          is_active: true,
        },
      });
      if (subCount > 0) {
        isSupervisor = true;
      }
    } catch (e) {
      console.warn('Error checking supervisor status in PaymentRequestsPage:', e);
    }
  }

  try {
    const [fetchedRequests, fetchedStats, fetchedBranches] = await Promise.all([
      getPaymentRequests(),
      getPaymentRequestDashboardStats(),
      getSystemBranches(),
    ]);
    requests = fetchedRequests;
    stats = fetchedStats;
    branches = fetchedBranches;

    if (!isSupervisor && !canManageAllPaymentRequests(user.role)) {
      const cleanUserFullName = normalizePersonName(user.fullName);
      if (
        requests.some(
          (r: any) =>
            (user.employeeId && r.assigned_supervisor_id && r.assigned_supervisor_id.trim().toUpperCase() === user.employeeId.trim().toUpperCase()) ||
            (cleanUserFullName && normalizePersonName(r.assigned_supervisor_name) === cleanUserFullName)
        )
      ) {
        isSupervisor = true;
      }
    }
  } catch (err) {
    console.error('Error fetching payment requests:', err);
  }

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/payment-requests"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto overflow-x-hidden bg-[#fafbfc]">
        <PaymentRequestsClient
          initialRequests={JSON.parse(JSON.stringify(requests))}
          initialStats={JSON.parse(JSON.stringify(stats))}
          branches={branches}
          userRole={user.role}
          userFullName={user.fullName}
          isSupervisor={isSupervisor}
        />
      </main>
    </div>
  );
}
