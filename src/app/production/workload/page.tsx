import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import Sidebar from "@/app/components/Sidebar"
import WorkloadClientPage from "./WorkloadClientPage"

export const dynamic = 'force-dynamic'

export default async function WorkloadPage() {
  const session = await getUser()
  
  if (!session || !session.id) {
    redirect('/login')
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id }
  })

  // Ensure only Production related roles can access this
  const roleStr = (currentUser?.role || '').toLowerCase()
  const isProduction = ['admin', 'super_admin', 'ฝ่ายผลิต', 'production', 'ผู้จัดการ'].some(r => roleStr.includes(r))

  if (!isProduction) {
    redirect('/')
  }

  // Fetch active technicians
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true }
  })
  
  const validRoles = ['technician', 'ช่าง', 'ช่างประกอบ', 'ช่างตู้']
  const technicians = users.filter(u => validRoles.some(role => (u.role || '').toLowerCase().includes(role)))

  // Set start of today for fetching today's completed jobs
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // Fetch all active jobs and today's completed jobs
  const allJobs = await prisma.cabinetAssemblyJob.findMany({
    where: {
      OR: [
        {
          status: {
            in: ['PENDING', 'IN_PROGRESS', 'PAUSED', 'QC_FAILED']
          }
        },
        {
          status: 'COMPLETED',
          updatedAt: { gte: startOfToday }
        }
      ]
    },
    include: {
      order: {
        include: { company: true }
      },
      technician: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/production/workload" 
        userFullName={currentUser?.fullName || undefined} 
        userId={currentUser?.id || undefined} 
        userRole={currentUser?.role || undefined} 
        theme="red"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50/30">
        <WorkloadClientPage 
          jobs={allJobs} 
          technicians={technicians} 
          currentUser={currentUser} 
        />
      </main>
    </div>
  )
}
