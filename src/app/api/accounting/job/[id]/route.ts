import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { syncProjectInstallmentsToPaymentTasks } from "@/app/actions/projects";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Only initialize payment tasks from linked project when the job has no structured tasks yet
    // (never overwrite or delete payment rounds already configured/updated by Accounting)
    const linkedProject = await prisma.project.findFirst({
      where: { jobId: id },
      select: {
        id: true,
        firstPayment: true,
        installment1: true,
        installmentsData: true,
      }
    });
    if (linkedProject) {
      const existingTasks = await prisma.paymentTask.findMany({
        where: { jobId: id },
        select: {
          id: true,
          installmentNo: true,
          installmentAmount: true,
          paidAmount: true,
          status: true,
          creditType: true,
          invoiceNumber: true,
          note: true,
        }
      });
      const isUntouchedPlaceholderOnly =
        existingTasks.length === 0 ||
        (existingTasks.length === 1 &&
          existingTasks[0].installmentNo === null &&
          !existingTasks[0].installmentAmount &&
          (!existingTasks[0].paidAmount || existingTasks[0].paidAmount === 0) &&
          existingTasks[0].status === 'รอดำเนินการ' &&
          !existingTasks[0].creditType &&
          !existingTasks[0].invoiceNumber &&
          !existingTasks[0].note);

      if (isUntouchedPlaceholderOnly) {
        await syncProjectInstallmentsToPaymentTasks(linkedProject.id);
      }
    }

    const job = await prisma.job.findUnique({
      where: { id: id },
      include: {
        quotation: {
          include: {
            company: true,
            salesperson: true,
          }
        },
        paymentTasks: {
          orderBy: { installmentNo: 'asc' }
        },
        stepLogs: {
          orderBy: { completedAt: "asc" }
        },
        project: {
          include: {
            manager: true
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let awardedGold = 0;
    if (job.quotationId) {
      const ledger = await prisma.coin_ledgers.findFirst({
        where: { source_key: `deal_closed:${job.quotationId}:sales` }
      });
      if (ledger) {
        awardedGold = ledger.amount;
      }
    }

    return NextResponse.json({
      job: job,
      quotation: job.quotation,
      company: job.quotation?.company,
      paymentTasks: job.paymentTasks,
      stepLogs: job.stepLogs,
      project: job.project,
      awardedGold: awardedGold,
    });
  } catch (error) {
    console.error("Failed to fetch job details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
