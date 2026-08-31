import prisma from '@/app/lib/db'
import MasterDataClient from './MasterDataClient'

export default async function MasterDataPage() {
  const channels = await prisma.adChannel.findMany({ orderBy: { createdAt: 'desc' } })
  const objectives = await prisma.adObjective.findMany()
  const resultTypes = await prisma.adResultType.findMany()
  const accounts = await prisma.adAccount.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าข้อมูลพื้นฐานโฆษณา (Ads Master Data Management)</h1>
      <MasterDataClient 
        channels={channels}
        objectives={objectives}
        resultTypes={resultTypes}
        accounts={accounts}
      />
    </div>
  )
}
