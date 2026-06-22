import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { getAssignedLeads } from "@/app/actions/marketing"
import SalesLeadsClient from "./SalesLeadsClient"
import { redirect } from "next/navigation"

export default async function SalesLeadsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  if (!token) {
    redirect("/login")
  }

  let userId = ""
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret")
    const { payload } = await jwtVerify(token, secret)
    userId = payload.userId as string
  } catch (error) {
    redirect("/login")
  }

  const { success, data: leads } = await getAssignedLeads(userId)

  return <SalesLeadsClient leads={success ? leads : []} />
}
