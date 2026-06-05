import { getRepairDeliveries } from "@/app/actions/repairDeliveries"
import RepairDeliveriesClientPage from "./RepairDeliveriesClientPage"
import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Outsource Repairs (ส่งซ่อมนอก) | Sales CRM",
}

export default async function RepairDeliveriesPage() {
  const session = await getUser()
  if (!session) {
    redirect("/login")
  }

  // default filters if any
  const res = await getRepairDeliveries()
  const deliveries = res.success ? res.data : []

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-6">
      <RepairDeliveriesClientPage initialDeliveries={deliveries as any} currentUser={session} />
    </main>
  )
}
