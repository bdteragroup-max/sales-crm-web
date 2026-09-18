import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import SupplierPaymentClient from './SupplierPaymentClient';
import { getSupplierPaymentTasks, getSupplierPaymentDashboardSummary } from '@/app/actions/supplierPayment';

export const dynamic = 'force-dynamic';

export default async function PayablesPage() {
  const user = await getUser();
  if (!user || !user.isActive) {
    redirect('/');
  }

  // Role check: Accounting, Finance, Management, Executive
  const roleStr = (user.role || '').toLowerCase();
  const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน', 'ผู้จัดการ'].some(r => roleStr.includes(r));
  const isExecutive = ['ผู้บริหาร', 'executive', 'super_admin'].some(r => roleStr.includes(r));

  if (!isAccounting && !isExecutive) {
    redirect('/dashboard');
  }

  let initialTasks: any[] = [];
  let summary: any = {
    totalTasks: 0,
    totalPendingGross: 0,
    totalPendingNet: 0,
    pendingCount: 0,
    awaitingGrCount: 0,
    awaitingGrAmount: 0,
    readyToPayCount: 0,
    readyToPayAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    dueIn7DaysCount: 0,
    dueIn7DaysAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    companyCounts: { ALL: 0, TP: 0, TG: 0, TE: 0, OTHER: 0 },
  };

  try {
    initialTasks = await getSupplierPaymentTasks();
    summary = await getSupplierPaymentDashboardSummary(initialTasks);
  } catch (err) {
    console.error('[PayablesPage] Error loading supplier payment data:', err);
  }

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/payables"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <SupplierPaymentClient
          initialTasks={JSON.parse(JSON.stringify(initialTasks))}
          initialSummary={JSON.parse(JSON.stringify(summary))}
          currentUser={{ id: user.id, fullName: user.fullName, role: user.role }}
        />
      </main>
    </div>
  );
}
