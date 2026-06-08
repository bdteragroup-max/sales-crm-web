import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import InstallationDashboardClient from "./InstallationDashboardClient"

export default async function ServiceInstallationPage() {
  const session = await getUser()

  // Fetch all existing installation orders
  const existingOrders = await prisma.installationOrder.findMany({
    include: { job: true },
    orderBy: { createdAt: 'desc' }
  })

  // Fetch all jobs that involve installation (e.g., jobType contains "ติดตั้ง")
  const installationJobs = await prisma.job.findMany({
    where: {
      jobType: {
        contains: 'ติดตั้ง'
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Map existing orders by jobId for fast lookup
  const orderMap = new Map(existingOrders.map(o => [o.jobId, o]))

  // Merge them: Start with existing orders, then add jobs that don't have an order yet
  const mergedOrders = [...existingOrders]

  for (const job of installationJobs) {
    if (!orderMap.has(job.id)) {
      // Mock an order object for the dashboard
      mergedOrders.push({
        id: `mock-${job.id}`,
        jobId: job.id,
        installationNo: `-รอสร้างใบงาน-`,
        installationDate: job.createdAt, // Fallback date
        company: job.customerName || "ไม่ระบุ",
        jobName: job.item || job.jobNumber,
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
      <InstallationDashboardClient orders={mergedOrders} users={users} currentUser={session} />
    </div>
  )
}
