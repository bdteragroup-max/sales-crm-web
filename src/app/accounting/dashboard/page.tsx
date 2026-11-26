import { decrypt } from '@/app/lib/session';
import { cookies } from 'next/headers';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import AccountingDashboardClient from './AccountingDashboardClient';
import { getAccountingDashboardData } from '@/app/actions/accountingDashboard';
import { getBankReconciliationData } from '@/app/actions/bankReconciliation';
import { getBangkokMonthBounds } from '@/app/lib/accounting-dashboard-calc';

export const dynamic = 'force-dynamic';

export default async function AccountingDashboardPage(props: { searchParams: any }) {
  const session = (await cookies()).get('session')?.value;
  const payload = await decrypt(session);
  if (!payload?.userId) redirect('/');

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) redirect('/');

  const roleStr = (user.role || '').toLowerCase();
  const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน'].some((r) => roleStr.includes(r));
  const isExecutive = ['ผู้บริหาร', 'executive', 'super_admin'].some((r) => roleStr.includes(r));

  if (!isAccounting && !isExecutive) redirect('/dashboard');

  const sp = await props.searchParams;
  const month = typeof sp?.month === 'string' ? sp.month : undefined;
  let startDate = typeof sp?.startDate === 'string' ? sp.startDate : undefined;
  let endDate = typeof sp?.endDate === 'string' ? sp.endDate : undefined;
  const entity = typeof sp?.entity === 'string' ? sp.entity : 'ALL';

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const bounds = getBangkokMonthBounds(month);
    startDate = bounds.startYmd;
    endDate = bounds.endYmd;
  }

  const [data, bankReconciliation] = await Promise.all([
    getAccountingDashboardData(startDate, endDate, entity, month),
    getBankReconciliationData({
      entity,
      startDate,
      endDate,
    }).catch(() => ({
      batches: [],
      transactions: [],
      summary: {
        totalCreditCount: 0,
        totalCreditAmount: 0,
        matchedCreditCount: 0,
        matchedCreditAmount: 0,
        suggestedCreditCount: 0,
        unmatchedCreditCount: 0,
        unmatchedCreditAmount: 0,
        ignoredCreditCount: 0,
        totalDebitCount: 0,
        totalDebitAmount: 0,
        matchedDebitCount: 0,
        unmatchedDebitCount: 0,
        lastImportedAt: null,
      },
    })),
  ]);

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/dashboard"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <AccountingDashboardClient
          data={JSON.parse(JSON.stringify(data))}
          bankReconciliation={JSON.parse(JSON.stringify(bankReconciliation))}
        />
      </main>
    </div>
  );
}
