import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import Sidebar from "@/app/components/Sidebar"
import FatClientPage from "./FatClientPage"

export const dynamic = 'force-dynamic'

export default async function FatPage() {
  const session = await getUser()
  
  if (!session || !session.id) {
    redirect('/login')
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id }
  })

  // Fetch jobs that have completed QC (Passed) and are ready for FAT
  const jobsForFat = await prisma.cabinetAssemblyJob.findMany({
    where: {
      status: 'COMPLETED',
      qcReport: {
        qcStatus: 'Passed'
      }
    },
    include: {
      order: {
        include: { company: true }
      },
      technician: true,
      qcReport: true,
      fatReport: true,
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/production/fat" 
        userFullName={currentUser?.fullName || undefined} 
        userId={currentUser?.id || undefined} 
        userRole={currentUser?.role || undefined} 
        theme="red"
      />
      <main className="flex-1 overflow-y-auto">
        <FatClientPage jobs={jobsForFat} currentUser={currentUser} />
      </main>
    </div>
  )
}
