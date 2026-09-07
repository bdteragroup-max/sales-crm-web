import prisma from '@/app/lib/db'
import CrmClient from './CrmClient'
import { getUser } from '@/app/lib/dal'
import { getMarketingLeads, getCrmSummaryCards, getActiveAdsWithCrm } from '@/app/actions/ads-crm'

export const dynamic = 'force-dynamic'

export default async function CrmResultsPage() {
  const user = await getUser()
  if (!user) return <div className="p-8">Unauthorized</div>

  const initialFilters = { unbound: true }

  const [initialData, summaryCards, rawCampaigns, channels, rawProducts, activeAdsWithCrm] = await Promise.all([
    getMarketingLeads(1, 25, initialFilters),
    getCrmSummaryCards(initialFilters),
    prisma.adCampaign.findMany({
      where: { deletedAt: null },
      include: {
        channel: true,
        objective: true,
        product: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.adChannel.findMany({ where: { isActive: true } }),
    prisma.products.findMany(),
    getActiveAdsWithCrm()
  ])

  // Convert Decimals to Number for Client Component
  const plainCampaigns = rawCampaigns.map(c => ({
    ...c,
    budget: c.budget ? Number(c.budget) : 0,
    branch: c.branch ? {
      ...c.branch,
      center_lat: c.branch.center_lat ? Number(c.branch.center_lat) : null,
      center_lon: c.branch.center_lon ? Number(c.branch.center_lon) : null
    } : null
  }))

  const safeCampaigns = JSON.parse(JSON.stringify(plainCampaigns))
  const safeChannels = JSON.parse(JSON.stringify(channels))
  const safeActiveAds = JSON.parse(JSON.stringify(activeAdsWithCrm))
  const safeProducts = JSON.parse(JSON.stringify(rawProducts))
  const safeInitialData = JSON.parse(JSON.stringify(initialData))
  const safeSummaryCards = JSON.parse(JSON.stringify(summaryCards))

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <CrmClient 
        initialActiveAds={safeActiveAds}
        campaigns={safeCampaigns}
        channels={safeChannels}
        products={safeProducts}
        initialData={safeInitialData}
        initialSummary={safeSummaryCards}
        currentUser={{
          name: (user as any).fullName || (user as any).name || user.email || 'Admin',
          role: user.role
        }}
      />
    </div>
  )
}
