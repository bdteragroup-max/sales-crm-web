import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import PaymentRequestsClient from './PaymentRequestsClient';
import {
  getPaymentRequests,
  getPaymentRequestDashboardStats,
  getSystemBranches,
} from '@/app/actions/paymentRequests';

export const dynamic = 'force-dynamic';

export default async function PaymentRequestsPage() {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  let requests: any[] = [];
  let stats: any = {};
  let branches: any[] = [];

  try {
    const [fetchedRequests, fetchedStats, fetchedBranches] = await Promise.all([
      getPaymentRequests(),
      getPaymentRequestDashboardStats(),
      getSystemBranches(),
    ]);
    requests = fetchedRequests;
    stats = fetchedStats;
    branches = fetchedBranches;
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
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <PaymentRequestsClient
          initialRequests={JSON.parse(JSON.stringify(requests))}
          initialStats={JSON.parse(JSON.stringify(stats))}
          branches={branches}
          userRole={user.role}
          userFullName={user.fullName}
        />
      </main>
    </div>
  );
}
