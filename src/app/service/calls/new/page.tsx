import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { canViewAllServiceCalls } from '@/app/lib/roleHelper';
import { getServiceCallLogs } from '@/app/actions/service-calls';
import NewServiceCallClient from './NewServiceCallClient';

export const metadata = {
  title: 'บันทึกแจ้งปัญหาลูกค้า (Service Call)',
};

export const dynamic = 'force-dynamic';

export default async function NewServiceCallPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; caseId?: string }>;
}) {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const canViewAll = canViewAllServiceCalls(currentUser.role);

  const [rawUsers, rawMyLogs] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    }),
    getServiceCallLogs({ onlyMine: true }).catch(() => []),
  ]);

  const users = JSON.parse(JSON.stringify(rawUsers));
  const myLogs = JSON.parse(JSON.stringify(rawMyLogs || []));
  const initialTab = resolvedParams?.tab === 'my-cases' ? 'my-cases' : 'form';
  const initialCaseId = resolvedParams?.caseId || null;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">
          กำลังโหลด...
        </div>
      }
    >
      <NewServiceCallClient
        users={users}
        currentUser={currentUser}
        canViewAll={canViewAll}
        initialMyLogs={myLogs}
        initialTab={initialTab}
        initialCaseId={initialCaseId}
      />
    </Suspense>
  );
}
