import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import prisma from '@/app/lib/db'
import { getMarketingLeadById } from '@/app/actions/marketing'
import LeadDetailClient from './LeadDetailClient'

export default async function MarketingLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const result = await getMarketingLeadById(resolvedParams.id)
  if (!result.success || !result.data) {
    redirect('/marketing')
  }

  const lead = result.data

  // Fetch sales representatives for forwarding
  const salesReps = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: { contains: 'sale', mode: 'insensitive' } },
        { role: { contains: 'ขาย' } },
        { role: { contains: 'เซล' } },
        { role: { contains: 'manager', mode: 'insensitive' } },
        { role: { contains: 'ผู้จัดการ' } },
        { role: { contains: 'หัวหน้า' } }
      ]
    },
    select: {
      id: true,
      fullName: true,
    },
    orderBy: { fullName: 'asc' }
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <LeadDetailClient lead={lead} salesReps={salesReps} />
    </div>
  )
}
