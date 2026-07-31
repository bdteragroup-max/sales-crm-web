import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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
