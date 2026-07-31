"use server";

import prisma from '@/app/lib/db';
import { reclaimCoinsOnInactive } from '@/lib/coinReclaim';

export async function setEmployeeInactive(empId: string) {
  try {
    const previous = await prisma.employees.findUnique({
      where: { emp_id: empId },
      select: { is_active: true }
    });

    // Prevent reclaiming if already inactive
    if (!previous?.is_active) {
      return { success: false, reason: "already_inactive" };
    }

    await prisma.employees.update({
      where: { emp_id: empId },
      data: { is_active: false }
    });

    await reclaimCoinsOnInactive(empId);
    return { success: true };
  } catch (error: any) {
    console.error("Error setting employee inactive:", error);
    return { success: false, reason: error.message };
  }
}
