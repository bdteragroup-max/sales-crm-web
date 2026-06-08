import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import PlanViewerClient from "./PlanViewerClient";

export default async function ViewInstallationPlanPage({ params }: { params: { id: string } }) {
  const session = await getUser()
  if (!session) {
    redirect("/login")
  }

  const { id: jobId } = params

  const installationOrder = await prisma.installationOrder.findFirst({
    where: { jobId },
    include: { job: true }
  })

  if (!installationOrder) {
    redirect("/service/installation")
  }

  return <PlanViewerClient order={installationOrder} currentUser={session} />
}
