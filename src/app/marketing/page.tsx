import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import { getMarketingLeads } from '@/app/actions/marketing'
import MarketingLeadsClient from './components/MarketingLeadsClient'

export const metadata = {
  title: 'Marketing Leads | ระบบจัดการลูกค้ามุ่งหวัง',
  description: 'ศูนย์จัดการและติดตามข้อมูลลูกค้ามุ่งหวัง (Marketing Leads) ที่มาของโฆษณา และการส่งต่องานฝ่ายขาย'
}

export default async function MarketingDashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  if (payload?.userId) {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    const roleStr = (user?.role || '').toUpperCase()
    const isServiceOrProjectOnly =
      ['SERVICE', 'SERVICE_ENGINEER', 'SERVICE_MGR', 'PROJECT', 'บริการ', 'โปรเจค', 'โครงการ'].some((r) =>
        roleStr.includes(r)
      ) &&
      !['MARKETING', 'MANAGER', 'SUPER_ADMIN', 'การตลาด', 'ผู้จัดการ'].some((r) =>
        roleStr.includes(r)
      )
    if (isServiceOrProjectOnly) {
      redirect('/marketing/kanban')
    }
  }

  const resolvedParams = await searchParams
  const searchQuery = typeof resolvedParams?.search === 'string' ? resolvedParams.search : ''
  const selectedChannel = typeof resolvedParams?.channel === 'string' ? resolvedParams.channel : ''
  const selectedStage = typeof resolvedParams?.stage === 'string' ? resolvedParams.stage : 'all'

  const result = await getMarketingLeads()
  const leads = result.data || []

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <MarketingLeadsClient
        initialLeads={leads}
        initialSearch={searchQuery}
        initialChannel={selectedChannel}
        initialStage={selectedStage}
      />
    </main>
  )
}
