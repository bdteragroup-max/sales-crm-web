import prisma from "@/app/lib/db"
import PrintClient from "./PrintClient"
import { redirect } from "next/navigation"

export default async function InstallationOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const data = await prisma.installationOrder.findFirst({
    where: { jobId: id },
    include: { job: true }
  })

  if (!data) {
    redirect(`/jobs/${id}`)
  }

  return <PrintClient data={data} />
}
