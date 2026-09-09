import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'
import { getTeraAdsDashboardData } from '@/app/actions/ads-dashboard'
import AdsDashboardClient from './AdsDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdsDashboardPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const currentUser = await getUser()
  const searchParams = props.searchParams ? await props.searchParams : {}

  const from = typeof searchParams?.from === 'string' ? searchParams.from : undefined
  const to = typeof searchParams?.to === 'string' ? searchParams.to : undefined
  const channel = typeof searchParams?.channel === 'string' ? searchParams.channel : undefined
  const campaign = typeof searchParams?.campaign === 'string' ? searchParams.campaign : undefined
  const adSet = typeof searchParams?.adSet === 'string' ? searchParams.adSet : undefined
  const status = typeof searchParams?.status === 'string' ? searchParams.status : undefined
  const compareWith = typeof searchParams?.compareWith === 'string' ? searchParams.compareWith : undefined
  const compareFrom = typeof searchParams?.compareFrom === 'string' ? searchParams.compareFrom : undefined
  const compareTo = typeof searchParams?.compareTo === 'string' ? searchParams.compareTo : undefined

  let reportingPeriod = '01-31 Aug 2026'
  if (from === '2026-09-01' && to === '2026-09-30') {
    reportingPeriod = '01-30 Sep 2026'
  } else if (from && to) {
    reportingPeriod = `${from} to ${to}`
  }

  const channels = await prisma.adChannel.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  })

  const campaigns = await prisma.adCampaign.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      campaignId: true,
      name: true,
      channelId: true,
      budget: true,
      status: true,
      productCategory: true
    }
  })

  // Safe Decimal normalization
  const safeCampaigns = campaigns.map(c => ({
    ...c,
    budget: Number(c.budget || 0)
  }))

  let initialData = null
  try {
    initialData = await getTeraAdsDashboardData({
      dateFrom: from,
      dateTo: to,
      reportingPeriod,
      compareWith,
      compareDateFrom: compareFrom,
      compareDateTo: compareTo,
      channel: channel || 'All',
      campaignId: campaign || 'All',
      adSetId: adSet || 'All',
      status: status || 'Active'
    })
  } catch (err) {
    console.error('getTeraAdsDashboardData server load error:', err)
  }

  const plainCampaigns = JSON.parse(JSON.stringify(safeCampaigns))
  const plainChannels = JSON.parse(JSON.stringify(channels))
  const plainInitialData = initialData ? JSON.parse(JSON.stringify(initialData)) : null
  const plainUser = currentUser ? JSON.parse(JSON.stringify({
    id: currentUser.id,
    fullName: currentUser.fullName,
    email: currentUser.email,
    role: currentUser.role
  })) : null

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <AdsDashboardClient
        campaigns={plainCampaigns}
        channels={plainChannels}
        initialData={plainInitialData}
        currentUser={plainUser}
      />
    </div>
  )
}

