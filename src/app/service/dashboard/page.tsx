import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import ServiceDashboardClient from "./ServiceDashboardClient";
import { canViewAll } from "@/app/lib/roleHelper";

export const metadata = {
  title: "ภาพรวมฝ่ายบริการ - TERA",
};

export default async function ServiceDashboardPage(props: { searchParams?: Promise<any> | any }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const timeframe = searchParams.timeframe || "month"; // month, last_month, year, all, custom
  const customStartDate = searchParams.startDate;
  const customEndDate = searchParams.endDate;

  const session = await getUser();
  if (!session) {
    redirect("/");
  }

  const roleStr = (session.role || "").toLowerCase();
  const isServiceUser =
    roleStr === "อื่นๆ" ||
    roleStr.includes("service") ||
    roleStr.includes("บริการ") ||
    roleStr.includes("ซ่อม") ||
    roleStr.includes("ช่าง") ||
    roleStr === "ผู้จัดการ" ||
    roleStr.includes("manager") ||
    roleStr.includes("ผู้จัดการ");

  if (!isServiceUser && !canViewAll(roleStr)) {
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

  // Fetch all repair jobs in the selected timeframe
  const currentPeriodJobs = await prisma.job.findMany({
    where: {
      OR: [{ jobType: { contains: "ซ่อม" } }, { jobType: { contains: "บริการ" } }],
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      quotation: true,
      installationOrders: true,
      stepLogs: true,
    },
  });

  const previousPeriodJobs = await prisma.job.findMany({
    where: {
      OR: [{ jobType: { contains: "ซ่อม" } }, { jobType: { contains: "บริการ" } }],
      createdAt: { gte: previousStartDate, lte: previousEndDate },
    },
    select: { id: true, currentStep: true },
  });

  // Fetch ALL jobs that are currently pending but constrained by the timeframe for accurate reporting
  const allPendingRepairJobs = await prisma.job.findMany({
    where: {
      OR: [{ jobType: { contains: "ซ่อม" } }, { jobType: { contains: "บริการ" } }],
      currentStep: { not: "closed" },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      quotation: true,
      installationOrders: true,
      repairOrder: true,
    },
  });

  const activeOutsourceRepairs = await prisma.outsourceRepair.findMany({
    where: {
      status: { notIn: ["RETURNED", "DELIVERED", "CANCELLED"] },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      job: true,
    },
  });

  // Fetch data for the new dashboard extensions
  const currentRepairDeliveries = await prisma.repairDelivery.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { job: true },
    orderBy: { createdAt: 'desc' },
  });

  const currentInstallationOrders = await prisma.installationOrder.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { job: true },
    orderBy: { createdAt: 'desc' },
  });

  const currentOutsourceRepairs = await prisma.outsourceRepair.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { job: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex flex-col h-full bg-[#fafbfc]">
      <ServiceDashboardClient
        timeframe={timeframe}
        currentPeriodJobs={currentPeriodJobs}
        previousPeriodJobs={previousPeriodJobs}
        allPendingRepairJobs={allPendingRepairJobs}
        activeOutsourceRepairs={activeOutsourceRepairs}
        currentRepairDeliveries={currentRepairDeliveries}
        currentInstallationOrders={currentInstallationOrders}
        currentOutsourceRepairs={currentOutsourceRepairs}
        currentUser={session}
      />
    </div>
  );
}
