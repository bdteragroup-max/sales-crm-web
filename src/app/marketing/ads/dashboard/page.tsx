import prisma from '@/app/lib/db'
import AdsDashboardClient from './AdsDashboardClient'

export default async function AdsDashboardPage() {
  const channels = await prisma.adChannel.findMany({ where: { isActive: true } })
  const _products = await prisma.products.findMany({ select: { id: true, product_name: true } })
  const products = _products.map(p => ({ id: p.id, name: p.product_name }))
  const branches = await prisma.branches.findMany({ select: { id: true, name: true } })
  const campaigns = await prisma.adCampaign.findMany({ 
    where: { deletedAt: null },
    select: { id: true, name: true, channelId: true }
  })
  const objectives = await prisma.adObjective.findMany({ select: { id: true, name: true } })
  const accounts = await prisma.adAccount.findMany({ select: { id: true, name: true } })

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">สรุปผลโฆษณา TERA</h1>
          <p className="text-gray-500 font-medium mt-1">แดชบอร์ดการตลาดผู้บริหาร</p>
        </div>
      </div>
      
      <AdsDashboardClient 
        channels={channels}
        products={products}
        branches={branches}
        campaigns={campaigns}
        objectives={objectives}
        accounts={accounts}
      />
    </div>
  )
}
