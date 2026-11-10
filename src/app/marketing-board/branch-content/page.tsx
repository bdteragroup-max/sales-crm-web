export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { getBranchContentBoardData } from '@/app/actions/branchContent';
import BranchContentKanbanPageClient from '../components/branch-content/BranchContentKanbanPageClient';

export default async function BranchContentBoardDirectPage() {
  const sessionUser = await getUser();
  if (!sessionUser) {
    redirect('/login');
  }

  const branchContentData = await getBranchContentBoardData();

  if (
    !branchContentData?.permissions?.userBranchId &&
    !branchContentData?.permissions?.canViewAllBranches
  ) {
    redirect('/marketing-board');
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <BranchContentKanbanPageClient initialData={branchContentData} />
    </div>
  );
}
