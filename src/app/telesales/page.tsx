import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import TelesalesClientPage from './TelesalesClientPage';
import { Suspense } from 'react';
import { isSuperUser } from '@/app/lib/roleHelper';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    search?: string; 
    tab?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    outcome?: string;
    salespersonId?: string;
  }>;
}

export default async function TelesalesPage({ searchParams }: PageProps) {
  const user = await getUser();
  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const search = (params.search || '').trim();
  const tab = params.tab || 'list';
  const startDateStr = params.startDate;
  const endDateStr = params.endDate;
  const status = params.status;
  const outcome = params.outcome;
  const salespersonId = params.salespersonId;

  const limit = 10;
  const skip = (page - 1) * limit;

  // Base where clause based on role
  let roleWhere: any = { OR: [{ userId: user?.id }, { userId: null }] };
  let members: any[] = [];
  let salesReps: { id: string; fullName: string; role: string }[] = [];
  const roleLower = (user?.role || '').toLowerCase();
  const isSuperAdmin = isSuperUser(user?.role);
  const isManager = ['ผู้จัดการ', 'manager', 'sales manager', 'marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด'].includes(roleLower);
  
  const isMarketingManager = ['marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด'].includes(roleLower);
  
  if (isSuperAdmin || isManager) {
    let subEmpIds: string[] = [];
    if (user && user.employeeId) {
      try {
        const subordinates = await teraDb.employees.findMany({
          where: { supervisor_id: user.employeeId, is_active: true },
          select: { emp_id: true }
        });
        subEmpIds = subordinates.map(s => s.emp_id);
      } catch (err) {
        console.warn("Failed to fetch subordinates from HR database:", err);
      }
    }

    if (isSuperAdmin || isMarketingManager) {
      // Super admin or Marketing manager sees everyone
      const teamUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, role: true }
      });
      salesReps = teamUsers;
      const subUserIds = teamUsers.map(u => u.id);
      roleWhere = {
        OR: [
          { userId: { in: subUserIds } },
          { userId: user?.id || 'NO_USER' },
          { userId: null }
        ]
      };
      if (isSuperAdmin) {
        roleWhere = {}; // see all
      }
    } else {
      const teamUsers = await prisma.user.findMany({
        where: { 
          OR: [
            { employeeId: { in: subEmpIds } },
            { employeeSale: { teamLeader: user?.fullName || '' } }
          ]
        },
        select: { id: true, fullName: true, role: true }
      });
      salesReps = teamUsers;
      const subUserIds = teamUsers.map(u => u.id);
      roleWhere = {
        OR: [
          { userId: { in: subUserIds } },
          { userId: user?.id || 'NO_USER' },
          { userId: null }
        ]
      };
    }
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

  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    searchFilter.createdAt = { gte: start, lte: end };
  }

  if (status) {
    searchFilter.callStatus = status;
  }

  if (outcome) {
    searchFilter.callOutcome = outcome;
  }

  if (isManager && salespersonId) {
    searchFilter.userId = salespersonId === 'unassigned' ? null : salespersonId;
  }

  if (search) {
    searchFilter.OR = [
      { company: { companyName: { contains: search, mode: 'insensitive' as const } } },
      { user: { fullName: { contains: search, mode: 'insensitive' as const } } },
      { company: { contacts: { some: { mobilePhone: { contains: search } } } } }
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
      <Suspense fallback={null}>
        <TelesalesClientPage 
          userFullName={user?.fullName} 
          initialRecords={JSON.parse(JSON.stringify(telesales))}
          totalCount={totalCount}
          currentPage={page}
          limit={limit}
          todayCallsCount={todayCallsCount}
          todayInterestedCount={todayInterestedCount}
          todayCallbacksCount={todayCallbacksCount}
          isManager={isManager}
          salesReps={salesReps}
        />
      </Suspense>
    </main>
  );
}
