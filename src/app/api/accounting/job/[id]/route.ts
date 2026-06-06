import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";

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
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: job,
      quotation: job.quotation,
      company: job.quotation?.company,
      paymentTasks: job.paymentTasks,
      stepLogs: job.stepLogs,
    });
  } catch (error) {
    console.error("Failed to fetch job details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
