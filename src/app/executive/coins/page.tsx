import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';
import CoinsClient from './CoinsClient';

// Helper to get start and end of month if no date is provided
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export default async function ExecutiveCoinsDashboard(props: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    coinType?: string;
    department?: string;
    transactionType?: string;
  }>
}) {
  const searchParams = await props.searchParams;
  const session = await getUser();
  
  const roleStr = (session?.role || '').toLowerCase();
  const isExecutive = roleStr === 'ผู้บริหาร' || roleStr === 'executive' || roleStr === 'super_admin';
  const isAdmin = roleStr === 'admin';
  
  if (!isExecutive && !isAdmin) {
    redirect('/');
  }

  // Parse filters
  const defaultRange = getMonthRange();
  const from = searchParams.from ? new Date(searchParams.from) : defaultRange.start;
  let to = searchParams.to ? new Date(searchParams.to) : defaultRange.end;
  // If 'to' date is exactly at midnight (from YYYY-MM-DD string), set it to the end of the day
  if (searchParams.to && to.getHours() === 0) {
    to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
  }

  const dept = searchParams.department;
  const coinType = searchParams.coinType;

  // Department filter for employee relations
  const employeeFilter = dept ? { department_id: Number(dept) } : undefined;

  // 1. Total Coins by Type (overall picture - usually not filtered by time, but can be filtered by dept/coinType)
  // The user wants total circulation. Should this be filtered by date? Usually circulation is a point-in-time (current).
  // We'll filter only by department and coinType if selected.
  const allEmployeeCoins = await prisma.employee_coins.findMany({
    where: {
      ...(coinType && { coin_type_id: coinType }),
      ...(dept && { employees: { department_id: Number(dept) } })
    },
    include: { coin_types: true, employees: true }
  });

  const coinTypeSums: Record<string, { name: string; code: string; amount: number }> = {};
  allEmployeeCoins.forEach(coin => {
    const code = coin.coin_types?.id || 'UNKNOWN';
    if (!coinTypeSums[code]) {
      coinTypeSums[code] = { name: coin.coin_types?.name || code, code, amount: 0 };
    }
    coinTypeSums[code].amount += coin.balance;
  });

  const totalCirculation = Object.values(coinTypeSums).reduce((acc, curr) => acc + curr.amount, 0);

  // Top Coin Holders (Leaderboard) - based on current balance
  const userBalances: Record<string, { empId: string; name: string; totalBalance: number }> = {};
  allEmployeeCoins.forEach(coin => {
    const empId = coin.emp_id;
    if (!userBalances[empId]) {
      const userName = coin.employees?.name || empId;
      userBalances[empId] = { empId, name: userName, totalBalance: 0 };
    }
    userBalances[empId].totalBalance += coin.balance;
  });

  const leaderboard = Object.values(userBalances)
    .sort((a, b) => b.totalBalance - a.totalBalance)
    .slice(0, 10);

  // 2. Issued and Redeemed this period
  const ledgerBaseWhere = {
    created_at: { gte: from, lte: to },
    ...(coinType && { coin_type_id: coinType }),
    ...(dept && { employees: { department_id: Number(dept) } })
  };

  const issuedThisPeriod = await prisma.coin_ledgers.aggregate({
    where: {
      ...ledgerBaseWhere,
      transaction_type: { not: "WHEEL_REDEEM" },
      amount: { gt: 0 } // Extra safety: issued should be positive
    },
    _sum: { amount: true }
  });

  // For redeemed, the user explicitly asked to use the `coin_ledgers` negative amounts or `REDEMPTION` type.
  // We'll use SPEND or REDEMPTION as negative amounts.
  const redeemedThisPeriod = await prisma.coin_ledgers.aggregate({
    where: {
      ...ledgerBaseWhere,
      amount: { lt: 0 }
    },
    _sum: { amount: true }
  });

  // Recent Transactions
  const recentTransactionsRaw = await prisma.coin_ledgers.findMany({
    where: ledgerBaseWhere,
    include: { coin_types: true, employees: true },
    orderBy: { created_at: 'desc' },
    take: 50
  });

  const recentTransactions = recentTransactionsRaw.map(tx => ({
    id: tx.id,
    emp_id: tx.emp_id,
    amount: tx.amount,
    transaction_type: tx.transaction_type,
    source_key: tx.source_key,
    description: tx.description,
    created_at: tx.created_at.toISOString(),
    employees: { name: tx.employees?.name },
    coin_types: tx.coin_types ? { id: tx.coin_types.id, name: tx.coin_types.name } : null
  }));

  // 3. Reward Redemptions
  const redemptionWhere = {
    redeemed_at: { gte: from, lte: to },
    ...(dept && { employees_reward_redemptions_emp_idToemployees: { department_id: Number(dept) } })
  };

  const redemptionsRaw = await prisma.reward_redemptions.findMany({
    where: redemptionWhere,
    include: {
      employees_reward_redemptions_emp_idToemployees: {
        include: { departments: true }
      },
      rewards: true
    },
    orderBy: { redeemed_at: 'desc' },
    take: 100
  });

  // Fetch coin types to map names in the redemptions table
  const allCoinTypes = await prisma.coin_types.findMany();
  const coinTypeMap = new Map(allCoinTypes.map(c => [c.id, c.name]));

  const mappedRedemptions = redemptionsRaw.map(r => ({
    id: r.id,
    emp_id: r.emp_id,
    points_spent: r.points_spent,
    redeemed_at: r.redeemed_at,
    employeeName: r.employees_reward_redemptions_emp_idToemployees?.name || r.emp_id,
    rewardName: r.rewards?.name || 'Unknown Reward',
    coinTypeId: r.coin_type_id || undefined,
    coinTypeName: r.coin_type_id ? coinTypeMap.get(r.coin_type_id) : undefined,
  }));

  const totalRedeemedAgg = await prisma.reward_redemptions.aggregate({
    where: redemptionWhere,
    _sum: { points_spent: true },
    _count: true
  });

  // 5. Reclaimed Coins
  const reclaimedCoinsRaw = await prisma.coin_ledgers.findMany({
    where: {
      transaction_type: "RECLAIM_INACTIVE",
      created_at: { gte: from, lte: to },
      ...(dept && { employees: { department_id: Number(dept) } })
    },
    include: { coin_types: true, employees: true },
    orderBy: { created_at: 'desc' }
  });

  const reclaimedCoins = reclaimedCoinsRaw.map(tx => ({
    id: tx.id,
    emp_id: tx.emp_id,
    amount: Math.abs(tx.amount), // Show as positive amount reclaimed
    description: tx.description,
    created_at: tx.created_at.toISOString(),
    employees: { name: tx.employees?.name },
    coin_types: tx.coin_types ? { id: tx.coin_types.id, name: tx.coin_types.name } : null
  }));

  // 6. Dropdown options
  const departments = await prisma.departments.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return (
    <CoinsClient 
      totalCirculation={totalCirculation}
      issuedThisPeriod={issuedThisPeriod._sum.amount || 0}
      redeemedThisPeriod={Math.abs(redeemedThisPeriod._sum.amount || 0)}
      totalRedemptionsCount={totalRedeemedAgg._count || 0}
      totalRedemptionsPoints={totalRedeemedAgg._sum.points_spent || 0}
      coinTypeSums={coinTypeSums}
      leaderboard={leaderboard}
      recentTransactions={recentTransactions}
      redemptions={mappedRedemptions}
      reclaimedCoins={reclaimedCoins}
      departments={departments}
      coinTypes={allCoinTypes.map(c => ({ id: c.id, name: c.name }))}
      currentFilters={{
        from: searchParams.from || from.toISOString().split('T')[0],
        to: searchParams.to || to.toISOString().split('T')[0],
        coinType: searchParams.coinType || '',
        department: searchParams.department || '',
        transactionType: searchParams.transactionType || ''
      }}
    />
  );
}
