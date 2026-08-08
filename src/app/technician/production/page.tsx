import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import TechnicianProductionClient from "./TechnicianProductionClient"

export const dynamic = 'force-dynamic'

export default async function TechnicianProductionPage() {
  const session = await getUser()
  if (!session) {
    redirect("/login")
  }

  // Get orders in "กำลังผลิต" or "ตรวจสอบคุณภาพ" where the user is assigned
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ['กำลังผลิต', 'ตรวจสอบคุณภาพ']
      },
      assignedTechnicians: {
        some: {
          id: session.id
        }
      }
    },
    include: {
      company: true,
      quotation: true,
      salesperson: true,
      assignedTechnicians: true,
      assignments: true,
      productionSteps: {
        orderBy: { stepIndex: 'asc' }
      },
      timeLogs: {
        where: { userId: session.id },
        orderBy: { startTime: 'desc' }
      },
      cabinetAssemblyJobs: {
        where: {
          technicianId: session.id
        },
        include: {
          timeLogs: {
            orderBy: { timestamp: 'desc' }
          },
          qcReport: true
        },
        orderBy: { cabinetIndex: 'asc' }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return <TechnicianProductionClient orders={orders} currentUser={session} />
}
