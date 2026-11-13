import React from 'react';
import { redirect } from 'next/navigation';
import { getStockDashboardData, getStockTransactions } from '@/app/actions/stock';
import StockClient from './StockClient';

export const dynamic = 'force-dynamic';

export default async function StockPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const dashboard = await getStockDashboardData(resolved.category);

  if (!dashboard.success) {
    redirect('/login');
  }

  const activeCategory =
    dashboard.categories.find((c) => c.code === dashboard.activeCategoryCode) ??
    dashboard.categories[0] ??
    null;

  const initialTxPage = await getStockTransactions({
    categoryId: activeCategory?.id || 'ALL',
    page: 1,
    pageSize: 50,
  });

  return (
    <StockClient
      initialCategories={dashboard.categories}
      initialActiveCategoryCode={dashboard.activeCategoryCode}
      initialItems={dashboard.items}
      initialSummary={dashboard.summary}
      initialTransactions={initialTxPage.rows}
      initialTransactionsTotal={initialTxPage.totalCount}
      users={dashboard.users}
      permissions={dashboard.permissions}
      currentUser={dashboard.currentUser}
    />
  );
}

