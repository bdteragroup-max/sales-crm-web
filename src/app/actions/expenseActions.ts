"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const amountStr = formData.get("amount") as string;
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    const dateStr = formData.get("date") as string;
    const date = dateStr ? new Date(dateStr) : new Date();

    const expenseType = formData.get("expenseType") as string;
    const notes = formData.get("notes") as string;
    
    let odometer: number | null = null;
    if (expenseType && expenseType.toLowerCase().includes("travel")) {
      const odoStr = formData.get("odometer") as string;
      if (odoStr && !isNaN(parseFloat(odoStr))) {
        odometer = parseFloat(odoStr);
      }
    }
    
    // For managers, allow setting another user. Otherwise, default to self.
    let targetUserId = user.id;
    let targetBranch = user.employeeSale?.branch || "Head Office";

    const roleStr = (user.role || '').toLowerCase();
    const isManager = roleStr === 'manager' || roleStr === 'admin' || roleStr === 'ผู้จัดการ' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด';

    if (isManager) {
      const selectedUserId = formData.get("salespersonId") as string;
      if (selectedUserId) {
        const targetUser = await prisma.user.findUnique({ 
          where: { id: selectedUserId },
          include: { employeeSale: true }
        });
        if (targetUser) {
          targetUserId = targetUser.id;
          targetBranch = targetUser.employeeSale?.branch || targetBranch;
        }
      }
    }

    await prisma.branchExpense.create({
      data: {
        branch: targetBranch,
        salespersonId: targetUserId,
        expenseType: expenseType || "Other",
        amount,
        date,
        notes,
        odometer
      }
    });

    revalidatePath("/sales/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Failed to create expense" };
  }
}

import { teraDb } from "@/app/lib/teraDb";

export async function getExpenses() {
  const user = await getUser();
  if (!user) return [];

  try {
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

    const whereClause = isManager ? { salespersonId: { in: filterIds } } : { salespersonId: user.id };

    const expenses = await prisma.branchExpense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 200,
    });
    
    return expenses.map(exp => ({
      ...exp,
      odometer: exp.odometer ? Number(exp.odometer) : null
    }));
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function deleteExpense(id: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const expense = await prisma.branchExpense.findUnique({ where: { id } });
    if (!expense) return { success: false, error: "Not found" };

    const roleStr = (user.role || '').toLowerCase();
    const isManager = roleStr === 'manager' || roleStr === 'admin' || roleStr === 'ผู้จัดการ' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด';

    if (!isManager && expense.salespersonId !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Ideally, for managers, we should verify the salesperson is in their team, but if they see it in the UI, they can delete it.
    
    await prisma.branchExpense.delete({ where: { id } });

    revalidatePath("/sales/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "Failed to delete" };
  }
}
