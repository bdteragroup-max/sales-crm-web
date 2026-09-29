"use server";

import prisma from '@/app/lib/db';
import { reclaimCoinsOnInactive } from '@/lib/coinReclaim';

export async function setEmployeeInactive(empId: string) {
  try {
    await prisma.employees.updateMany({
      where: { emp_id: empId },
      data: { is_active: false }
    });

    await prisma.user.updateMany({
      where: { employeeId: empId, isActive: true },
      data: { isActive: false }
    });

    const res = await reclaimCoinsOnInactive(empId);
    return { success: true, ...res };
  } catch (error: any) {
    console.error("Error setting employee inactive:", error);
    return { success: false, reason: error.message };
  }
}
