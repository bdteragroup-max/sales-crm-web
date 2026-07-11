import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import InstallationDashboardClient from "./InstallationDashboardClient" // force ts update
import { Suspense } from "react"

export default async function ServiceInstallationPage() {
  const session = await getUser()

  // Fetch all existing installation orders
  const existingOrders = await prisma.installationOrder.findMany({
    include: { job: true },
    orderBy: { createdAt: 'desc' }
  })

  // Fetch all jobs that involve installation (e.g., jobType contains "ติดตั้ง"),
  // OR jobs that have a completed repair order (sentDate is not null)
  const installationJobs = await prisma.job.findMany({
    where: {
      OR: [
        { jobType: { contains: 'ติดตั้ง' } },
        { jobType: { contains: 'ตรวจเช็ค' } },
        {
          repairOrder: {
            sentDate: { not: null }
          }
        }
      ]
    },
    include: {
      repairOrder: true
    },
    orderBy: { createdAt: 'desc' }
  })

  // Map existing orders by jobId for fast lookup
  const orderMap = new Map(existingOrders.map(o => [o.jobId, o]))

  // Merge them: Start with existing orders, then add jobs that don't have an order yet
  const mergedOrders = [...existingOrders]

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
        installationDate: fallbackDate, // Fallback date
        company: job.customerName || "ไม่ระบุ",
        jobName: jobName,
        technician: "",
        sender: "",
        status: "รอดำเนินการ",
        job: job
      } as any)
    }
  }

  // Sort merged orders by date descending
  mergedOrders.sort((a, b) => new Date(b.installationDate || 0).getTime() - new Date(a.installationDate || 0).getTime())

  // Fetch all users to populate the technician dropdown
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: 'asc' }
  })

  return (
    <div className="container mx-auto py-8 px-4 md:px-8">
      <Suspense fallback={null}>
        <InstallationDashboardClient orders={mergedOrders} users={users} currentUser={session} />
      </Suspense>
    </div>
  )
}
