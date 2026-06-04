import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import TelesalesClientPage from './TelesalesClientPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; tab?: string }>;
}

export default async function TelesalesPage({ searchParams }: PageProps) {
  const user = await getUser();
  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const search = (params.search || '').trim();
  const tab = params.tab || 'list';

  const limit = 10;
  const skip = (page - 1) * limit;

  // Base where clause based on role
  let roleWhere: any = { OR: [{ userId: user?.id }, { userId: null }] };
  if (user?.role === 'ผู้จัดการ') {
    let subEmpIds: string[] = [];
    try {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true },
        select: { emp_id: true }
      });
      subEmpIds = subordinates.map(s => s.emp_id);
    } catch (err) {
      console.warn("Failed to fetch subordinates from HR database:", err);
    }

    const teamUsers = await prisma.user.findMany({
      where: { 
        OR: [
          { employeeId: { in: subEmpIds } },
          { employeeSale: { teamLeader: user.fullName } }
        ]
      },
      select: { id: true }
    });
    const subUserIds = teamUsers.map(u => u.id);

    roleWhere = {
      OR: [
        { userId: { in: subUserIds } },
        { userId: user.id },
        { userId: null }
      ]
    };
  }

  // Calculate timezone-safe "Today" boundaries for Bangkok timezone
  const nowBkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const todayStart = new Date(nowBkk);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(nowBkk);
  todayEnd.setHours(23, 59, 59, 999);

  // Parallel database execution for KPIs and records
  const [
    todayCallsCount,
    todayInterestedCount,
    todayCallbacksCount
  ] = await Promise.all([
    // 1. Today calls count
    prisma.telesale.count({
      where: {
        ...roleWhere,
        createdAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    // 2. Today interested count
    prisma.telesale.count({
      where: {
        ...roleWhere,
        createdAt: { gte: todayStart, lte: todayEnd },
        callOutcome: { in: ['สนใจ', 'นัดหมายสำเร็จ'] }
      }
    }),
    // 3. Today callbacks count
    prisma.telesale.count({
      where: {
        ...roleWhere,
        callbackAt: { gte: todayStart, lte: todayEnd }
      }
    })
  ]);

  // Determine active query search filter
  let searchFilter: any = { ...roleWhere };
  if (tab === 'callbacks') {
    searchFilter.callbackAt = { not: null };
  }

  if (search) {
    searchFilter.OR = [
      { company: { companyName: { contains: search, mode: 'insensitive' as const } } },
      { user: { fullName: { contains: search, mode: 'insensitive' as const } } }
    ];
  }

  // Fetch paginated records and counts
  const [telesales, totalCount] = await Promise.all([
    prisma.telesale.findMany({
      where: searchFilter,
      take: limit,
      skip: skip,
      include: {
        company: {
          include: {
            contacts: {
              take: 1,
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        user: true,
      },
      orderBy: tab === 'callbacks' 
        ? { callbackAt: 'asc' } 
        : { createdAt: 'desc' }
    }),
    prisma.telesale.count({
      where: searchFilter
    })
  ]);

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
      <TelesalesClientPage 
        userFullName={user?.fullName} 
        initialRecords={JSON.parse(JSON.stringify(telesales))}
        totalCount={totalCount}
        currentPage={page}
        limit={limit}
        todayCallsCount={todayCallsCount}
        todayInterestedCount={todayInterestedCount}
        todayCallbacksCount={todayCallbacksCount}
      />
    </main>
  );
}
