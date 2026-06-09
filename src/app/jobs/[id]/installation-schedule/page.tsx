import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import ScheduleForm from "./ScheduleForm"
import Sidebar from "@/app/components/Sidebar"

export const dynamic = "force-dynamic"

export default async function InstallationSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getUser()
  if (!session) {
    redirect("/login")
  }

  const { id: jobId } = await params

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { quotation: true }
  })

  if (!job) {
    redirect("/service/installation")
  }

  const installationOrder = await prisma.installationOrder.findFirst({
    where: { jobId },
    include: { job: true }
  })

  if (!installationOrder) {
    redirect("/service/installation")
  }

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/service/installation" 
        userFullName={session.fullName || ""} 
        userId={session.id} 
        userRole={session.role} 
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
          <ScheduleForm 
            order={installationOrder} 
            currentUser={session} 
          />
        </div>
      </main>
    </div>
  )
}
