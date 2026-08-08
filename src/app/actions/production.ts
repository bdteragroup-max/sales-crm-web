'use server'

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function logProductionTime(orderId: string, action: 'START' | 'STOP', stepName?: string, note?: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    if (action === 'START') {
      const activeLog = await prisma.productionTimeLog.findFirst({
        where: { orderId, userId: user.id, endTime: null }
      });
      if (activeLog) {
        return { success: false, error: "มีงานที่กำลังจับเวลาอยู่แล้ว" };
      }
      const newLog = await prisma.productionTimeLog.create({
        data: {
          orderId,
          userId: user.id,
          stepName,
          note,
          startTime: new Date()
        }
      });
      revalidatePath("/technician/production");
      return { success: true, data: newLog };
    } else {
      const activeLog = await prisma.productionTimeLog.findFirst({
        where: { orderId, userId: user.id, endTime: null },
        orderBy: { startTime: 'desc' }
      });
      if (!activeLog) {
        return { success: false, error: "ไม่พบงานที่กำลังจับเวลา" };
      }
      
      const endTime = new Date();
      const durationMins = Math.round((endTime.getTime() - activeLog.startTime.getTime()) / 60000);
      
      const updatedLog = await prisma.productionTimeLog.update({
        where: { id: activeLog.id },
        data: {
          endTime,
          durationMins,
          note: note || activeLog.note
        }
      });
      revalidatePath("/technician/production");
      return { success: true, data: updatedLog };
    }
  } catch (error) {
    console.error("Error logging production time:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกเวลา" };
  }
}

export async function toggleProductionStep(stepId: string, isCompleted: boolean) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const step = await prisma.productionStep.update({
      where: { id: stepId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? user.fullName : null
      }
    });

    // Recalculate progressPct
    const allSteps = await prisma.productionStep.findMany({
      where: { orderId: step.orderId }
    });
    
    const completedCount = allSteps.filter(s => s.isCompleted).length;
    const progressPct = allSteps.length > 0 ? (completedCount / allSteps.length) * 100 : 0;

    await prisma.order.update({
      where: { id: step.orderId },
      data: { progressPct }
    });

    revalidatePath("/technician/production");
    revalidatePath("/orders");
    
    return { success: true, progressPct };
  } catch (error) {
    console.error("Error completing production step:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตขั้นตอน" };
  }
}
