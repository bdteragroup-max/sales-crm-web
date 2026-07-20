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
    // Check if there are other incomplete tasks
    const pendingTasks = await prisma.paymentTask.count({
      where: {
        jobId: task.jobId,
        status: { not: 'ตรวจสอบและบันทึกแล้ว' }
      }
    });

    if (pendingTasks === 0) {
      await prisma.job.update({
        where: { id: task.jobId },
        data: { paymentStatus: 'paid' }
      });

      if (task.job.quotationId) {
        const { awardGoldOnDealClosed } = await import('@/app/actions/coins');
        await awardGoldOnDealClosed(task.job.quotationId);
      }
    }
  }

  revalidatePath('/accounting');
  revalidatePath('/jobs');
  return task;
}

export async function recordPaymentDeposit(taskId: string, depositAmount: number, note?: string) {
  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: {
      status: 'ชำระมัดจำแล้ว',
      paidAmount: depositAmount,
      note,
    },
    include: { job: true }
  });

  revalidatePath('/accounting');
  revalidatePath('/jobs');
  return task;
}

export async function updatePaymentTaskCreditType(taskId: string, creditType: string) {
  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: { creditType }
  });
  revalidatePath('/accounting');
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
