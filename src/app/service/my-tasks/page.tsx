import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import MyTasksClient from "./MyTasksClient"

export const dynamic = 'force-dynamic'

export default async function MyTasksPage() {
  const session = await getUser()
  if (!session) {
    redirect("/login")
  }

  // Get only orders assigned to this user
  const orders = await prisma.installationOrder.findMany({
    where: { technician: session.fullName },
    orderBy: { createdAt: 'desc' }
  })

  return <MyTasksClient orders={orders} currentUser={session} />
}
