import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';
import ExpenseManager from './components/ExpenseManager';
import { getExpenses } from '@/app/actions/expenseActions';

import { isSuperUser, isMarketingManager as checkMarketingManager, isSalesOrMarketingManager } from '@/app/lib/roleHelper';
import { getRecursiveSubordinateEmpIds } from '@/app/lib/subordinates';
import { teraDb } from '@/app/lib/teraDb';

export const metadata = {
  title: 'Expense Tracking | Sales CRM',
};

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch initial expenses using the server action to ensure correct access control
  const initialExpenses = await getExpenses();

  const roleStr = (user.role || '').toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isMarketingManager = checkMarketingManager(user.role);
  const isManager = isSuperAdmin || isSalesOrMarketingManager(user.role) || roleStr === 'admin';
  
  let userWhereClause: any = { id: user.id };

  if (isSuperAdmin || isMarketingManager) {
    // Collect any salesperson IDs present in initialExpenses to ensure inactive or cross-department users are resolved
    const expenseUserIds = Array.from(new Set(initialExpenses.map((e: any) => e.salespersonId).filter(Boolean))) as string[];
    userWhereClause = {
      OR: [
        { isActive: true },
        ...(expenseUserIds.length > 0 ? [{ id: { in: expenseUserIds } }] : [])
      ]
    };
  } else if (isManager && user.employeeId) {
    let filterIds = [user.id];
    const subEmpIds = await getRecursiveSubordinateEmpIds(user.employeeId);
    
    if (subEmpIds.length > 0) {
      const subUsers = await prisma.user.findMany({
        where: { employeeId: { in: subEmpIds }, isActive: true },
        select: { id: true }
      });
      filterIds = [user.id, ...subUsers.map(u => u.id)];
    }
    userWhereClause = { id: { in: filterIds } };
  }

  // Fetch sales reps for the manager dropdown and table name display
  const salesRepsRaw = await prisma.user.findMany({
    where: userWhereClause,
    select: {
      id: true,
      fullName: true,
      role: true,
      employeeSale: {
        select: {
          branch: true
        }
      }
    },
    orderBy: { fullName: 'asc' }
  });

  const salesReps = salesRepsRaw.map((r: any) => ({
    id: r.id,
    fullName: r.fullName,
    role: r.role,
    hrBranch: r.employeeSale?.branch || 'Head Office'
  }));

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/80 pb-24 md:pb-12 relative custom-scrollbar h-full">
      <ExpenseManager 
        initialExpenses={JSON.parse(JSON.stringify(initialExpenses))} 
        currentUser={JSON.parse(JSON.stringify(user))} 
        salesReps={salesReps} 
      />
    </main>
  );
}
