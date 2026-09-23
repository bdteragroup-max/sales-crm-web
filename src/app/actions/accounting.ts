"use server";
import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle when called outside Next.js request context
  }
}

export async function syncFinancialAdjustments(jobId: string) {
  try {
    // 1. Fetch all PaymentTasks for this job
    const allTasks = await prisma.paymentTask.findMany({
      where: { jobId },
      orderBy: [
        { installmentNo: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (allTasks.length === 0) return;

    // 2. Identify deposit task vs progress tasks
    const depositTask = allTasks.find(t => t.installmentNo === 0 || t.creditType === 'DEPOSIT');
    const progressTasks = allTasks.filter(t => t.id !== depositTask?.id);

    const totalProgressCount = progressTasks.length;

    // 3. Update deposit task if present
    if (depositTask) {
      await prisma.paymentTask.update({
        where: { id: depositTask.id },
        data: {
          installmentNo: 0,
          installmentTotal: totalProgressCount,
          creditType: depositTask.creditType || 'DEPOSIT',
        }
      });
    }

    // 4. Re-sequence progress tasks (1..N) and update installmentTotal
    for (let i = 0; i < progressTasks.length; i++) {
      const task = progressTasks[i];
      const newNo = i + 1;
      await prisma.paymentTask.update({
        where: { id: task.id },
        data: {
          installmentNo: newNo,
          installmentTotal: totalProgressCount,
          creditType: task.creditType || 'PROGRESS',
        }
      });
    }

    // 5. Update Job payment status, payment method, and next due date
    const updatedTasks = await prisma.paymentTask.findMany({
      where: { jobId },
      orderBy: [{ installmentNo: 'asc' }, { dueDate: 'asc' }]
    });

    const allCompleted = updatedTasks.every(t => t.status === 'ตรวจสอบและบันทึกแล้ว');
    const hasAnyPaid = updatedTasks.some(t => (t.paidAmount && t.paidAmount > 0) || t.status === 'ชำระมัดจำแล้ว' || t.status === 'ตรวจสอบและบันทึกแล้ว');
    const nextPendingTask = updatedTasks.find(t => t.status !== 'ตรวจสอบและบันทึกแล้ว' && t.dueDate);

    const jobUpdateData: any = {
      paymentStatus: allCompleted ? 'paid' : (hasAnyPaid ? 'partial' : 'unpaid'),
    };
    if (progressTasks.length > 1 || (depositTask && progressTasks.length > 0)) {
      jobUpdateData.paymentMethod = 'ผ่อนชำระ';
    }
    if (nextPendingTask?.dueDate) {
      jobUpdateData.paymentDate = nextPendingTask.dueDate;
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: jobUpdateData
    });

    if (allCompleted && job.quotationId) {
      try {
        const { awardGoldOnDealClosed } = await import('@/app/actions/coins');
        await awardGoldOnDealClosed(job.quotationId);
      } catch (coinErr) {
        console.error("Coin award error on financial sync:", coinErr);
      }
    }

    // 6. Check if Job is linked to a Project
    const linkedProject = await prisma.project.findFirst({
      where: { jobId }
    });

    if (linkedProject) {
      // Reconstruct installmentsData matching Project standard structure
      const installmentsData: any = {
        hasDeposit: !!depositTask,
        deposit: depositTask ? {
          amount: Number(depositTask.installmentAmount || depositTask.paidAmount || 0),
          dueDate: depositTask.dueDate ? depositTask.dueDate.toISOString() : undefined,
          title: depositTask.note || "เงินมัดจำเมื่อเซ็นสัญญา",
        } : null,
        installments: progressTasks.map((t, idx) => ({
          no: idx + 1,
          title: t.note || `งวดที่ ${idx + 1}`,
          amount: Number(t.installmentAmount || 0),
          dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
        }))
      };

      const projectUpdateData: any = {
        installmentsData,
        firstPayment: depositTask ? Number(depositTask.installmentAmount || depositTask.paidAmount || 0) : null,
        depositCollectionSchedule: depositTask?.dueDate || null,
      };

      // Update installment1..12 columns
      for (let i = 1; i <= 12; i++) {
        const pTask = progressTasks[i - 1];
        projectUpdateData[`installment${i}`] = pTask ? Number(pTask.installmentAmount || 0) : null;
      }

      await prisma.project.update({
        where: { id: linkedProject.id },
        data: projectUpdateData
      });

      safeRevalidatePath('/projects');
      safeRevalidatePath(`/projects/${linkedProject.id}`);
      safeRevalidatePath('/projects/dashboard');
    }

    safeRevalidatePath('/accounting');
    safeRevalidatePath('/accounting/dashboard');
    safeRevalidatePath('/jobs');
  } catch (err) {
    console.error("Error syncing financial adjustments:", err);
    throw err;
  }
}

export type SavePaymentScheduleItemInput = {
  id?: string;
  jobId: string;
  type: 'DEPOSIT' | 'PROGRESS' | 'DELIVERY';
  installmentNo?: number;
  installmentAmount: number;
  dueDate?: string | Date | null;
  note?: string;
  creditType?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | Date | null;
};

export async function savePaymentScheduleItem(input: SavePaymentScheduleItemInput) {
  const { id, jobId, type, installmentNo, installmentAmount, dueDate, note, creditType, invoiceNumber, invoiceDate } = input;

  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const parsedInvoiceDate = invoiceDate ? new Date(invoiceDate) : null;
  const numAmount = Number(installmentAmount) || 0;

  if (id) {
    // Edit existing task
    const existing = await prisma.paymentTask.findUnique({
      where: { id }
    });
    if (!existing) throw new Error("ไม่พบงวดชำระที่ต้องการแก้ไข");

    await prisma.paymentTask.update({
      where: { id },
      data: {
        installmentAmount: numAmount,
        dueDate: parsedDueDate,
        note: note !== undefined ? note : existing.note,
        creditType: creditType !== undefined ? creditType : (type === 'DEPOSIT' ? 'DEPOSIT' : type === 'DELIVERY' ? 'DELIVERY' : existing.creditType || 'PROGRESS'),
        installmentNo: type === 'DEPOSIT' ? 0 : (installmentNo !== undefined ? Number(installmentNo) : existing.installmentNo),
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber ? invoiceNumber.trim() : null) : existing.invoiceNumber,
        invoiceDate: invoiceDate !== undefined ? parsedInvoiceDate : existing.invoiceDate,
      }
    });
  } else {
    // Add new task
    if (type === 'DEPOSIT') {
      const existingDeposit = await prisma.paymentTask.findFirst({
        where: {
          jobId,
          OR: [
            { installmentNo: 0 },
            { creditType: 'DEPOSIT' }
          ]
        }
      });

      if (existingDeposit) {
        await prisma.paymentTask.update({
          where: { id: existingDeposit.id },
          data: {
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || existingDeposit.note || "เงินมัดจำเมื่อเซ็นสัญญา",
            creditType: creditType || 'DEPOSIT',
            installmentNo: 0,
            invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber ? invoiceNumber.trim() : null) : existingDeposit.invoiceNumber,
            invoiceDate: invoiceDate !== undefined ? parsedInvoiceDate : existingDeposit.invoiceDate,
          }
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: 'รอดำเนินการ',
            installmentNo: 0,
            installmentAmount: numAmount,
            dueDate: parsedDueDate,
            note: note || "เงินมัดจำเมื่อเซ็นสัญญา",
            creditType: creditType || 'DEPOSIT',
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            invoiceDate: parsedInvoiceDate,
          }
        });
      }
    } else if (type === 'DELIVERY') {
      let nextNo = installmentNo;
      if (!nextNo) {
        const maxTask = await prisma.paymentTask.findFirst({
          where: { jobId, installmentNo: { gt: 0 } },
          orderBy: { installmentNo: 'desc' }
        });
        nextNo = (maxTask?.installmentNo || 0) + 1;
      }

      await prisma.paymentTask.create({
        data: {
          jobId,
          status: 'รอดำเนินการ',
          installmentNo: Number(nextNo),
          installmentAmount: numAmount,
          dueDate: parsedDueDate,
          note: note || `ส่งมอบสินค้า รอบที่ ${nextNo}`,
          creditType: creditType || 'DELIVERY',
          invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
          invoiceDate: parsedInvoiceDate,
        }
      });
    } else {
      let nextNo = installmentNo;
      if (!nextNo) {
        const maxTask = await prisma.paymentTask.findFirst({
          where: { jobId, installmentNo: { gt: 0 } },
          orderBy: { installmentNo: 'desc' }
        });
        nextNo = (maxTask?.installmentNo || 0) + 1;
      }

      await prisma.paymentTask.create({
        data: {
          jobId,
          status: 'รอดำเนินการ',
          installmentNo: Number(nextNo),
          installmentAmount: numAmount,
          dueDate: parsedDueDate,
          note: note || `งวดที่ ${nextNo}`,
          creditType: creditType || 'PROGRESS',
          invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
          invoiceDate: parsedInvoiceDate,
        }
      });
    }
  }

  // Synchronize database across all tasks, job, and linked project
  await syncFinancialAdjustments(jobId);

  const updatedTasks = await prisma.paymentTask.findMany({
    where: { jobId },
    orderBy: [
      { installmentNo: 'asc' },
      { dueDate: 'asc' }
    ]
  });

  return { success: true, paymentTasks: updatedTasks };
}

export async function deletePaymentScheduleItem(taskId: string) {
  const task = await prisma.paymentTask.findUnique({
    where: { id: taskId }
  });
  if (!task) throw new Error("ไม่พบงวดชำระที่ต้องการลบ");

  if ((task.paidAmount && task.paidAmount > 0) || task.status === 'ตรวจสอบและบันทึกแล้ว') {
    throw new Error("ไม่สามารถลบงวดชำระที่ได้มีการบันทึกการชำระเงินหรือตรวจสอบแล้ว");
  }

  const jobId = task.jobId;
  await prisma.paymentTask.delete({
    where: { id: taskId }
  });

  // Re-sync all remaining tasks, job, and project
  await syncFinancialAdjustments(jobId);

  const updatedTasks = await prisma.paymentTask.findMany({
    where: { jobId },
    orderBy: [
      { installmentNo: 'asc' },
      { dueDate: 'asc' }
    ]
  });

  return { success: true, paymentTasks: updatedTasks };
}

export async function updatePaymentTaskStatus(taskId: string, status: string, note?: string, invoiceNumber?: string, invoiceDate?: string | Date) {
  const dataToUpdate: any = {
    status,
    note,
    ...(status === 'ตรวจสอบและบันทึกแล้ว' ? { paidDate: new Date() } : {})
  };
  
  if (invoiceNumber) {
    dataToUpdate.invoiceNumber = invoiceNumber;
  }
  if (invoiceDate) {
    dataToUpdate.invoiceDate = new Date(invoiceDate);
  }

  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: dataToUpdate,
    include: { job: true }
  });

  await syncFinancialAdjustments(task.jobId);
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

  await syncFinancialAdjustments(task.jobId);
  return task;
}

export async function updatePaymentTaskCreditType(taskId: string, creditType: string) {
  const task = await prisma.paymentTask.update({
    where: { id: taskId },
    data: { creditType }
  });
  await syncFinancialAdjustments(task.jobId);
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

