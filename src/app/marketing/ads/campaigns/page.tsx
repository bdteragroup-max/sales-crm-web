import prisma from '@/app/lib/db'
import CampaignsClient from './CampaignsClient'
import { getUser } from '@/app/lib/dal'

export default async function CampaignsPage() {
  const user = await getUser()
  if (!user) return <div>Unauthorized</div>
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

  const channels = await prisma.adChannel.findMany({ where: { isActive: true } })
  const objectives = await prisma.adObjective.findMany({ where: { isActive: true } })
  const products = await prisma.products.findMany()
  const branchesData = await prisma.branches.findMany()
  const accounts = await prisma.adAccount.findMany({ where: { isActive: true } })
  const resultTypes = await prisma.adResultType.findMany({ where: { isActive: true } })
  
  const performances = (await prisma.adPerformance.findMany({
    include: { campaign: true, resultType: true },
    orderBy: { createdAt: 'desc' },
    take: 50 // limit for basic display
  })).map(p => ({ 
    ...p, 
    spend: p.spend ? p.spend.toNumber() : 0,
    campaign: p.campaign ? { ...p.campaign, budget: p.campaign.budget ? p.campaign.budget.toNumber() : 0 } : null
  }))

  const branches = branchesData.map(b => ({
    ...b,
    center_lat: b.center_lat ? b.center_lat.toNumber() : null,
    center_lon: b.center_lon ? b.center_lon.toNumber() : null
  }))

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <CampaignsClient 
        initialCampaigns={campaigns} 
        channels={channels}
        objectives={objectives}
        products={products}
        branches={branches}
        accounts={accounts}
        resultTypes={resultTypes}
        initialPerformances={performances}
        userRole={user.role}
      />
    </div>
  )
}
