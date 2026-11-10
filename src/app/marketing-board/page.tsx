export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { getMarketingBoardData, getSalesMaterials, getArchiveAnnouncements } from '@/app/actions/marketingBoard';
import { getBranchContentBoardData } from '@/app/actions/branchContent';
import MarketingBoardClient from './components/MarketingBoardClient';

export default async function MarketingBoardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessionUser = await getUser();
  if (!sessionUser) {
    redirect('/login');
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const initialTabParam =
    resolvedParams.tab === 'branch-content' || resolvedParams.tab === 'branch_content'
      ? 'branch_content'
      : resolvedParams.tab === 'materials'
      ? 'materials'
      : resolvedParams.tab === 'archive'
      ? 'archive'
      : 'kanban';

  const [boardData, salesMaterials, archiveData, branchContentData] = await Promise.all([
    getMarketingBoardData(),
    getSalesMaterials(),
    getArchiveAnnouncements(),
    getBranchContentBoardData(),
  ]);

  return (
    <MarketingBoardClient 
      initialBoardData={boardData}
      initialSalesMaterials={salesMaterials}
      initialArchiveData={archiveData}
      initialBranchContentData={branchContentData}
      initialTab={initialTabParam}
      currentUser={sessionUser}
    />
  );
}
