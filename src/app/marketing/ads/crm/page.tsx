import prisma from '@/app/lib/db'
import CrmClient from './CrmClient'
import { getUser } from '@/app/lib/dal'
import { getMarketingLeads, getCrmSummaryCards } from '@/app/actions/ads-crm'

export default async function CrmResultsPage() {
  const user = await getUser()
  if (!user) return <div>Unauthorized</div>

  const initialFilters = { unbound: true }

  const [initialData, summaryCards, campaigns, channels, products] = await Promise.all([
    getMarketingLeads(1, 25, initialFilters),
    getCrmSummaryCards(initialFilters),
    prisma.adCampaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.adChannel.findMany({ where: { isActive: true } }),
    prisma.products.findMany()
  ])

  // Convert Decimals to Number for Client Component
  const plainCampaigns = campaigns.map(c => ({
    ...c,
    budget: c.budget ? c.budget.toNumber() : 0
  }))

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <CrmClient 
        initialData={initialData}
        initialSummary={summaryCards}
        campaigns={plainCampaigns}
        channels={channels}
        products={products}
        userRole={user.role}
      />
    </div>
  )
}
