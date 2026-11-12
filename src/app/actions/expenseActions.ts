"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import {
  isSuperUser,
  isMarketingManager as checkMarketingManager,
  isSalesOrMarketingManager,
} from "@/app/lib/roleHelper";
import { getRecursiveSubordinateEmpIds } from "@/app/lib/subordinates";

function serializeExpense(exp: any) {
  return {
    id: exp.id,
    branch: exp.branch,
    salespersonId: exp.salespersonId,
    expenseType: exp.expenseType,
    amount: Number(exp.amount || 0),
    date: exp.date instanceof Date ? exp.date.toISOString() : String(exp.date),
    notes: exp.notes || "",
    odometer: exp.odometer != null ? Number(exp.odometer) : null,
    createdAt:
      exp.createdAt instanceof Date
        ? exp.createdAt.toISOString()
        : String(exp.createdAt || ""),
    updatedAt:
      exp.updatedAt instanceof Date
        ? exp.updatedAt.toISOString()
        : String(exp.updatedAt || ""),
  };
}

export async function createExpense(formData: FormData) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  try {
    const amountStr = formData.get("amount") as string;
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) {
      return { success: false, error: "จำนวนเงินต้องมากกว่า 0 บาท" };
    }

    const dateStr = formData.get("date") as string;
    const date = dateStr ? new Date(dateStr) : new Date();

    const expenseType = ((formData.get("expenseType") as string) || "").trim();
    const notes = ((formData.get("notes") as string) || "").trim();
    if (!notes) {
      return { success: false, error: "กรุณาระบุรายละเอียดค่าใช้จ่าย" };
    }

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

    const roleStr = (user.role || "").toLowerCase();
    const isSuperAdmin = isSuperUser(user.role);
    const isManager =
      isSuperAdmin || isSalesOrMarketingManager(user.role) || roleStr === "admin";

    if (isManager) {
      const selectedUserId = formData.get("salespersonId") as string;
      if (selectedUserId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: selectedUserId },
          include: { employeeSale: true },
        });
        if (targetUser) {
          targetUserId = targetUser.id;
          targetBranch = targetUser.employeeSale?.branch || targetBranch;
        }
      }
    }

    const created = await prisma.branchExpense.create({
      data: {
        branch: targetBranch,
        salespersonId: targetUserId,
        expenseType: expenseType || "อื่นๆ (Other)",
        amount,
        date,
        notes,
        odometer,
      },
    });

    revalidatePath("/sales/expenses");
    revalidatePath("/dashboard");
    return { success: true, expense: serializeExpense(created) };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "ไม่สามารถบันทึกค่าใช้จ่ายได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function updateExpense(id: string, formData: FormData) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  try {
    const existing = await prisma.branchExpense.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "ไม่พบรายการค่าใช้จ่ายที่ต้องการแก้ไข" };
    }

    const roleStr = (user.role || "").toLowerCase();
    const isSuperAdmin = isSuperUser(user.role);
    const isManager =
      isSuperAdmin || isSalesOrMarketingManager(user.role) || roleStr === "admin";

    if (!isManager && existing.salespersonId !== user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" };
    }

    const amountStr = formData.get("amount") as string;
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) {
      return { success: false, error: "จำนวนเงินต้องมากกว่า 0 บาท" };
    }

    const dateStr = formData.get("date") as string;
    const date = dateStr ? new Date(dateStr) : existing.date;

    const expenseType = ((formData.get("expenseType") as string) || "").trim();
    const notes = ((formData.get("notes") as string) || "").trim();
    if (!notes) {
      return { success: false, error: "กรุณาระบุรายละเอียดค่าใช้จ่าย" };
    }

    let odometer: number | null = null;
    if (expenseType && expenseType.toLowerCase().includes("travel")) {
      const odoStr = formData.get("odometer") as string;
      if (odoStr && !isNaN(parseFloat(odoStr))) {
        odometer = parseFloat(odoStr);
      }
    }

    let targetUserId = existing.salespersonId || user.id;
    let targetBranch = existing.branch || user.employeeSale?.branch || "Head Office";

    if (isManager) {
      const selectedUserId = formData.get("salespersonId") as string;
      if (selectedUserId && selectedUserId !== existing.salespersonId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: selectedUserId },
          include: { employeeSale: true },
        });
        if (targetUser) {
          targetUserId = targetUser.id;
          targetBranch = targetUser.employeeSale?.branch || targetBranch;
        }
      }
    }

    const updated = await prisma.branchExpense.update({
      where: { id },
      data: {
        branch: targetBranch,
        salespersonId: targetUserId,
        expenseType: expenseType || existing.expenseType,
        amount,
        date,
        notes,
        odometer,
      },
    });

    revalidatePath("/sales/expenses");
    revalidatePath("/dashboard");
    return { success: true, expense: serializeExpense(updated) };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { success: false, error: "ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function getExpenses() {
  const user = await getUser();
  if (!user) return [];

  try {
    const roleStr = (user.role || "").toLowerCase();
    const isSuperAdmin = isSuperUser(user.role);
    const isMarketingManager = checkMarketingManager(user.role);
    const isManager =
      isSuperAdmin || isSalesOrMarketingManager(user.role) || roleStr === "admin";

    let filterIds = [user.id];
    let whereClause: any = { salespersonId: user.id };

    if (isSuperAdmin || isMarketingManager) {
      // Super Admin, Head of Sales & Marketing, and Marketing Manager see all expenses
      whereClause = {};
    } else if (isManager && user.employeeId) {
      const subEmpIds = await getRecursiveSubordinateEmpIds(user.employeeId);

      if (subEmpIds.length > 0) {
        const subUsers = await prisma.user.findMany({
          where: { employeeId: { in: subEmpIds }, isActive: true },
          select: { id: true },
        });
        filterIds = [user.id, ...subUsers.map((u) => u.id)];
      }
      whereClause = { salespersonId: { in: filterIds } };
    }

    const expenses = await prisma.branchExpense.findMany({
      where: whereClause,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return expenses.map(serializeExpense);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function deleteExpense(id: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  try {
    const expense = await prisma.branchExpense.findUnique({ where: { id } });
    if (!expense) return { success: false, error: "ไม่พบรายการค่าใช้จ่าย" };

    const roleStr = (user.role || "").toLowerCase();
    const isSuperAdmin = isSuperUser(user.role);
    const isManager =
      isSuperAdmin || isSalesOrMarketingManager(user.role) || roleStr === "admin";

    if (!isManager && expense.salespersonId !== user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ลบรายการนี้" };
    }

    await prisma.branchExpense.delete({ where: { id } });

    revalidatePath("/sales/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง" };
  }
}
