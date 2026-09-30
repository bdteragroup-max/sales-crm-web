export const dynamic = "force-dynamic";

import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import InstallationDashboardClient from "./InstallationDashboardClient";
import { Suspense } from "react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "แดชบอร์ดงานติดตั้งและตรวจเช็ค | Sales CRM",
  description: "ภาพรวมการทำงานและสถิติงานติดตั้งและตรวจเช็คหน้างาน",
};

export default async function ServiceInstallationPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  // Fetch all existing installation orders
  const existingOrders = await prisma.installationOrder.findMany({
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all jobs that involve installation (e.g., jobType contains "ติดตั้ง"),
  // OR jobs that have a completed repair order (sentDate is not null)
  const installationJobs = await prisma.job.findMany({
    where: {
      OR: [
        { jobType: { contains: "ติดตั้ง" } },
        { jobType: { contains: "ตรวจเช็ค" } },
        {
          repairOrder: {
            sentDate: { not: null },
          },
        },
      ],
    },
    include: {
      repairOrder: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Map existing orders by jobId for fast lookup
  const orderMap = new Map(existingOrders.map((o) => [o.jobId, o]));

  // Merge them: Start with existing orders, then add jobs that don't have an order yet
  const mergedOrders = [...existingOrders];

  for (const job of installationJobs) {
    if (!orderMap.has(job.id)) {
      let fallbackDate = job.createdAt;
      let jobName = job.item || job.jobNumber;

      // If it's a completed repair order, use sentDate as the target date and add a prefix
      if (job.repairOrder && job.repairOrder.sentDate) {
        fallbackDate = job.repairOrder.sentDate;
        jobName = `[ส่งคืนงานซ่อม] ${jobName}`;
      }

      // Mock an order object for the dashboard
      mergedOrders.push({
        id: `mock-${job.id}`,
        jobId: job.id,
        installationNo: `-รอสร้างใบงาน-`,
        installationDate: fallbackDate,
        company: job.customerName || "ไม่ระบุ",
        jobName: jobName,
        technician: "",
        sender: "",
        status: "รอดำเนินการ",
        job: job,
      } as any);
    }
  }

  // Sort merged orders by date descending
  mergedOrders.sort(
    (a, b) =>
      new Date(b.installationDate || 0).getTime() -
      new Date(a.installationDate || 0).getTime()
  );

  // Fetch all users to populate the technician dropdown
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <Suspense fallback={null}>
          <InstallationDashboardClient
            orders={mergedOrders}
            users={users}
            currentUser={session}
          />
        </Suspense>
      </div>
    </main>
  );
}
