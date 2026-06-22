import { getAssignedLeads } from "@/app/actions/marketing"
import SalesLeadsClient from "./SalesLeadsClient"
import { redirect } from "next/navigation"
import { getUser } from "@/app/lib/dal"

export default async function SalesLeadsPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const { success, data: leads } = await getAssignedLeads(user.id)

  return (
    <main className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <SalesLeadsClient leads={success ? leads : []} />
    </main>
  )
}
