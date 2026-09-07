import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'
import PerformanceClient from './PerformanceClient'
import { getActiveAdsWithPerformance } from '@/app/actions/ads-performance'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  const user = await getUser()
  if (!user) return <div className="p-8">Unauthorized</div>

  const campaigns = (await prisma.adCampaign.findMany({
    where: { deletedAt: null },
    include: {
      channel: true,
      objective: true,
      product: true,
      branch: true
    },
    orderBy: { createdAt: 'desc' }
  })).map(c => ({
    ...c,
    budget: c.budget ? c.budget.toNumber() : 0,
    branch: c.branch ? {
      ...c.branch,
      center_lat: c.branch.center_lat ? c.branch.center_lat.toNumber() : null,
      center_lon: c.branch.center_lon ? c.branch.center_lon.toNumber() : null
    } : null
  }))

  const adsRes = await getActiveAdsWithPerformance()
  const activeAds = adsRes.success ? adsRes.ads : []
  const initialSnapshots = adsRes.success ? adsRes.snapshots : []

  return (
    <div className="bg-slate-50 min-h-screen">
      <PerformanceClient
        campaigns={campaigns}
        initialActiveAds={activeAds}
        initialSnapshots={initialSnapshots}
        currentUser={{
          name: user.fullName || user.email || 'Marketing Specialist',
          role: user.role || 'MARKETING'
        }}
      />
    </div>
  )
}
