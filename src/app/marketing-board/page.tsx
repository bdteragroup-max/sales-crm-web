export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { getMarketingBoardData, getSalesMaterials, getArchiveAnnouncements } from '@/app/actions/marketingBoard';
import MarketingBoardClient from './components/MarketingBoardClient';

export default async function MarketingBoardPage() {
  const sessionUser = await getUser();
  if (!sessionUser) {
    redirect('/login');
  }

  const [boardData, salesMaterials, archiveData] = await Promise.all([
    getMarketingBoardData(),
    getSalesMaterials(),
    getArchiveAnnouncements()
  ]);

  return (
    <MarketingBoardClient 
      initialBoardData={boardData}
      initialSalesMaterials={salesMaterials}
      initialArchiveData={archiveData}
      currentUser={sessionUser}
    />
  );
}
