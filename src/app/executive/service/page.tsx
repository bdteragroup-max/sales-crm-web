import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import ExecutiveServiceClient from "./ExecutiveServiceClient";

export const metadata = {
  title: "Service Forecast & Overview - TERA",
};

export default async function ExecutiveServicePage(props: { searchParams?: Promise<any> | any }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const timeframe = searchParams.timeframe || "month"; // month, last_month, year, all, custom
  const customStartDate = searchParams.startDate;
  const customEndDate = searchParams.endDate;

  const session = await getUser();
  if (!session) {
    redirect("/");
  }

  const roleStr = (session.role || "").toLowerCase();
  const isExecutive = roleStr === 'ผู้บริหาร' || roleStr === 'executive' || roleStr === 'super_admin';
  if (!isExecutive) {
    redirect("/dashboard");
  }

  // Calculate Date Boundaries based on timeframe
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  let previousStartDate: Date;
  let previousEndDate: Date;

  if (timeframe === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (timeframe === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
  } else if (timeframe === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
    previousEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else if (timeframe === "custom" && customStartDate && customEndDate) {
    startDate = new Date(customStartDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Previous period roughly same duration
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    previousEndDate = new Date(startDate.getTime() - 1);
    previousStartDate = new Date(previousEndDate.getTime() - diffTime);
  } else {
    // All time
    startDate = new Date(2000, 0, 1);
    previousStartDate = new Date(2000, 0, 1);
    previousEndDate = new Date(2000, 0, 1);
  }

  // Fetch all jobs in the selected timeframe (includes repair and service)
  const currentPeriodJobs = await prisma.job.findMany({
    where: {
      OR: [{ jobType: { contains: "ซ่อม" } }, { jobType: { contains: "บริการ" } }],
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      quotation: true,
      installationOrders: true,
      repairOrder: true,
      stepLogs: {
        orderBy: { completedAt: 'desc' },
        take: 1
      },
    },
  });

  const previousPeriodJobs = await prisma.job.findMany({
    where: {
      OR: [{ jobType: { contains: "ซ่อม" } }, { jobType: { contains: "บริการ" } }],
      createdAt: { gte: previousStartDate, lte: previousEndDate },
    },
    select: { id: true, currentStep: true, dateClosed: true, createdAt: true },
  });

  // Fetch all pending jobs (unclosed) regardless of start date, but for SLA we mainly care about all currently open
  const allPendingJobs = await prisma.job.findMany({
    where: {
      OR: [{ jobType: { contains: "ซ่อม" } }, { jobType: { contains: "บริการ" } }],
      currentStep: { not: "closed" },
    },
    include: {
      quotation: true,
      installationOrders: true,
      repairOrder: true,
      stepLogs: {
        orderBy: { completedAt: 'desc' },
        take: 1
      },
    },
  });

  // Fetch installations (sales + service)
  const currentInstallations = await prisma.installationOrder.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { job: true },
  });

  const previousInstallations = await prisma.installationOrder.findMany({
    where: {
      createdAt: { gte: previousStartDate, lte: previousEndDate },
    },
    include: { job: true },
  });
  
  // Pending installations (for SLA)
  const allPendingInstallations = await prisma.installationOrder.findMany({
    where: {
      status: { notIn: ["Completed", "ติดตั้งเสร็จสิ้น", "Cancelled"] },
    },
    include: { job: true },
  });

  // Fetch Outsource
  const currentOutsource = await prisma.outsourceRepair.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { job: true },
  });

  return (
    <div className="flex flex-col h-full bg-[#fafbfc]">
      <ExecutiveServiceClient
        timeframe={timeframe}
        currentPeriodJobs={currentPeriodJobs}
        previousPeriodJobs={previousPeriodJobs}
        allPendingJobs={allPendingJobs}
        currentInstallations={currentInstallations}
        previousInstallations={previousInstallations}
        allPendingInstallations={allPendingInstallations}
        currentOutsource={currentOutsource}
        currentUser={session}
      />
    </div>
  );
}
