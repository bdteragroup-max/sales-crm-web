import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { isSuperUser } from '@/app/lib/roleHelper';
import prisma from '@/app/lib/db';
import { getMarketingRequests, getMarketingBoardRequests } from '@/app/actions/marketingRequests';
import MarketingRequestsListClient from './MarketingRequestsListClient';

export const dynamic = 'force-dynamic';

export default async function MarketingRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const roleStr = (user.role || '').toLowerCase();
  const isMarketingOrAdmin = isSuperUser(user.role) || [
    'marketing',
    'การตลาด',
    'ผู้จัดการฝ่ายการตลาด',
    'ผู้จัดการการตลาด'
  ].some(r => roleStr.includes(r));

  // For roles other than Marketing or Marketing Manager, redirect to /marketing/requests/new with status view
  if (!isMarketingOrAdmin) {
    redirect('/marketing/requests/new?tab=status');
  }

  const resolvedParams = await searchParams;
  const initialTab = typeof resolvedParams.tab === 'string' ? (resolvedParams.tab as 'my' | 'all') : undefined;
  const initialStatus = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined;
  const initialType = typeof resolvedParams.type === 'string' ? resolvedParams.type : undefined;
  const initialBranch = typeof resolvedParams.branch === 'string' ? resolvedParams.branch : undefined;
  const initialSearch = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined;

  const [requestsRes, boardRes, rawBranches] = await Promise.all([
    getMarketingRequests({
      tab: initialTab,
      status: initialStatus,
      type: initialType,
      branch: initialBranch,
      search: initialSearch
    }),
    getMarketingBoardRequests(),
    prisma.branches.findMany({ select: { name: true }, orderBy: { name: 'asc' } })
  ]);

  const branches = rawBranches.map(b => b.name);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <MarketingRequestsListClient
        initialRequests={requestsRes.data || []}
        initialCounts={requestsRes.counts || {}}
        isMarketingOrAdmin={requestsRes.isMarketingOrAdmin || false}
        currentUserId={user.id}
        branches={branches}
        initialBoardData={boardRes.data || {}}
      />
    </div>
  );
}
