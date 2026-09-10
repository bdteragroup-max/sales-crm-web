import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { getMarketingRequestByIdOrNo } from '@/app/actions/marketingRequests';
import MarketingRequestDetailClient from './MarketingRequestDetailClient';

export const dynamic = 'force-dynamic';

export default async function MarketingRequestDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const res = await getMarketingRequestByIdOrNo(id);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <MarketingRequestDetailClient
        request={res.data}
        isMarketingOrAdmin={res.isMarketingOrAdmin}
        isRequester={res.isRequester}
        currentUserId={user.id}
        marketingUsers={res.marketingUsers || []}
      />
    </div>
  );
}
