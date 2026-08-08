import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import Sidebar from "@/app/components/Sidebar"
import QcClientPage from "./QcClientPage"

export const dynamic = 'force-dynamic'

export default async function QcPage() {
  const session = await getUser()
  
  if (!session || !session.id) {
    redirect('/login')
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id }
  })

  // Fetch jobs that are completed and pending inspection
  const pendingJobs = await prisma.cabinetAssemblyJob.findMany({
    where: {
      status: 'COMPLETED',
      qcReport: {
        isNot: null
      }
    },
    include: {
      order: {
        include: { company: true }
      },
      technician: true,
      qcReport: true,
      timeLogs: { orderBy: { timestamp: 'asc' } }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/production/qc" 
        userFullName={currentUser?.fullName || undefined} 
        userId={currentUser?.id || undefined} 
        userRole={currentUser?.role || undefined} 
        theme="red"
      />
      <main className="flex-1 overflow-y-auto">
        <QcClientPage jobs={pendingJobs} currentUser={currentUser} />
      </main>
    </div>
  )
}
