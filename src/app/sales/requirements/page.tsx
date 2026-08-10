export const dynamic = 'force-dynamic';
import React, { Suspense } from 'react';
import CustomerRequirementClient from './CustomerRequirementClient';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';

export default async function CustomerRequirementPage() {
  const user = await getUser();
  if (!user) redirect('/');

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isMarketingManager = (user.role || '').toLowerCase() === 'marketing manager' || (user.role || '').toLowerCase() === 'ผู้จัดการฝ่ายการตลาด' || (user.role || '').toLowerCase() === 'ผู้จัดการการตลาด' || (user.role || '').toLowerCase() === 'ผู้การจัดการตลาด';
  const isManager = user.role === 'ผู้จัดการ' || (user.role || '').toLowerCase() === 'sales manager' || isMarketingManager;

  let teamMembers: { id: string; fullName: string }[] = [];
  if (!isSuperAdmin) {
    if (isManager) {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true },
        select: { emp_id: true }
      });
      const subEmpIds = subordinates.map(s => s.emp_id);

      teamMembers = await prisma.user.findMany({
        where: isMarketingManager ? {
          isActive: true,
          NOT: {
            OR: [
              { role: 'อื่นๆ' },
              { role: { contains: 'accounting' } },
              { role: { contains: 'บัญชี' } },
              { role: { contains: 'purchasing' } },
              { role: { contains: 'จัดซื้อ' } },
              { role: { contains: 'warehouse' } },
              { role: { contains: 'คลังสินค้า' } },
              { role: { contains: 'service' } },
              { role: { contains: 'บริการ' } }
            ]
          }
        } : {
          OR: [
            { employeeId: { in: subEmpIds } },
            { employeeSale: { teamLeader: user.fullName } },
            { id: user.id }
          ]
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' }
      });
    } else {
      teamMembers = [{ id: user.id, fullName: user.fullName }];
    }
  }

  const whereClause = isSuperAdmin
    ? {}
    : isManager
      ? { OR: [{ userId: { in: teamMembers.map(t => t.id) } }, { userId: null }] }
      : { OR: [{ userId: user.id }, { userId: null }] };

  // Fetch history for this user or team
  const rawHistory = await prisma.customerRequirement.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
  });

  const reqNumbers = rawHistory.map(h => h.requirementNumber).filter(Boolean) as string[];
  const relatedQuotations = await prisma.quotation.findMany({
    where: { requirementNumber: { in: reqNumbers } },
    select: { requirementNumber: true, status: true, quotationNumber: true }
  });
  
  const quotationMap = new Map(relatedQuotations.map(q => [q.requirementNumber, q]));

  const history = rawHistory.map(h => ({
    ...h,
    hasQuotation: h.requirementNumber ? quotationMap.has(h.requirementNumber) : false,
    quotationStatus: h.requirementNumber ? quotationMap.get(h.requirementNumber)?.status || null : null,
    quotationDocNumber: h.requirementNumber ? quotationMap.get(h.requirementNumber)?.quotationNumber || null : null,
  }));

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
      <Suspense fallback={<div>Loading...</div>}>
        <CustomerRequirementClient currentUser={user} history={history} />
      </Suspense>
    </main>
  );
}
