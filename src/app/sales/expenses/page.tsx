import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';
import ExpenseManager from './components/ExpenseManager';
import { getExpenses } from '@/app/actions/expenseActions';

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
  const isManager = roleStr === 'manager' || roleStr === 'admin' || roleStr === 'ผู้จัดการ' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด';
  
  let filterIds = [user.id];

  if (isManager && user.employeeId) {
    const subordinates = await teraDb.employees.findMany({
      where: { supervisor_id: user.employeeId, is_active: true },
      select: { emp_id: true }
    });
    const subEmpIds = subordinates.map((s: any) => s.emp_id).filter(Boolean);
    
    if (subEmpIds.length > 0) {
      const subUsers = await prisma.user.findMany({
        where: { employeeId: { in: subEmpIds }, isActive: true },
        select: { id: true }
      });
      filterIds = [user.id, ...subUsers.map(u => u.id)];
    }
  }

  // Fetch sales reps for the manager dropdown
  const salesRepsRaw = await prisma.user.findMany({
    where: {
      id: { in: filterIds },
      role: { in: ['sales', 'manager', 'admin', 'ผู้จัดการ', 'เซลล์', 'ตัวแทนฝ่ายขาย'] }
    },
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

  const salesReps = salesRepsRaw.map(r => ({
    id: r.id,
    fullName: r.fullName,
    role: r.role,
    hrBranch: r.employeeSale?.branch || 'Head Office'
  }));

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 md:pb-10 relative custom-scrollbar h-full">
      <ExpenseManager 
        initialExpenses={initialExpenses} 
        currentUser={user} 
        salesReps={salesReps} 
      />
    </main>
  );
}
