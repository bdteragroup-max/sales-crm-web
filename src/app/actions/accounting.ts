"use server";
import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";

export async function updatePaymentTaskStatus(taskId: string, status: string, note?: string) {
  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: { 
      status, 
      note,
      ...(status === 'ตรวจสอบและบันทึกแล้ว' ? { paidDate: new Date() } : {})
    },
    include: { job: true }
  });

  if (status === 'ตรวจสอบและบันทึกแล้ว' && task.job) {
    // If it's paid, update job payment status
    await prisma.job.update({
      where: { id: task.jobId },
      data: { paymentStatus: 'paid' }
    });
  }

  revalidatePath('/accounting');
  revalidatePath('/jobs');
  return task;
}

export async function getPendingPaymentTaskCount() {
  try {
    return await prisma.paymentTask.count({
      where: { status: { not: 'ตรวจสอบและบันทึกแล้ว' } }
    });
  } catch (err) {
    return 0;
  }
}
