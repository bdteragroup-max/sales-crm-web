'use server'

import { DashboardFilters, DashboardData, WarningFlag } from '../marketing/ads/dashboard/types'
import { resolveRowsInRange, sumRawValues, aggregateReach, toDateString, nextDay } from '@/lib/adsAggregate'
import { calculateAdsMetrics, formatMetric } from '@/lib/adsMetrics'
import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  const allowedRoles = ['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor', 'Viewer/Management', 'ผู้จัดการฝ่ายการตลาด', 'Marketing ', 'ผู้จัดการ', 'Admin Project']
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden")
  }

  const { from, to, channelId, branchId, productCategory, objective, accountId, campaignIds } = filters

  // 1. Define Campaign Universe
  const campaignWhere = {
    ...(channelId ? { channelId } : {}),
    ...(productCategory ? { productCategory } : {}),
    ...(branchId ? { branchId } : {}),
    ...(objective ? { objective: { name: objective } } : {}),
    ...(accountId ? { accountId } : {}),
    ...(campaignIds?.length ? { id: { in: campaignIds } } : {}),
    deletedAt: null
  }

  const campaigns = await prisma.adCampaign.findMany({
    where: campaignWhere,
    select: { 
      id: true,
      campaignId: true,
      name: true, 
      status: true, 
      budget: true, 
      startDate: true,
      endDate: true,
      channel: { select: { name: true } },
      productCategory: true
    }
  }) as any[]

  const internalCampaignIds = campaigns.map(c => c.id)
  const platformCampaignIds = campaigns.map(c => c.campaignId)

  if (internalCampaignIds.length === 0) {
    return _buildEmptyResponse()
  }

  // 2. Fetch Performance & Leads
  const leadsPromise = prisma.marketingLead.groupBy({
    by: ['adCampaignId'],
    _count: { id: true },
    where: {
      adCampaignId: { in: internalCampaignIds },
      createdAt: { gte: new Date(from + 'T00:00:00+07:00'), lt: new Date(nextDay(to) + 'T00:00:00+07:00') }
    }
  })

  const [rawPerformances, leadsGroupBy] = await Promise.all([
    prisma.adPerformance.findMany({
      where: { campaignId: { in: platformCampaignIds } }
    }),
    leadsPromise
  ])

  const leadsMap = new Map(leadsGroupBy.map(l => [l.adCampaignId, l._count.id]))

  // Normalize date objects
  const normalizedPerformances = rawPerformances.map(row => ({
    ...row,
    dateFrom: toDateString(row.dateFrom),
    dateTo: toDateString(row.dateTo),
  }))

  const campaignByPlatformIdMap = new Map(campaigns.map(c => [c.campaignId, {
    ...c,
    startDateStr: toDateString(c.startDate),
    endDateStr: toDateString(c.endDate)
  }]))

  let orphanRowCount = 0
  const validPerformances = []
  
  for (const row of normalizedPerformances) {
    const c = campaignByPlatformIdMap.get(row.campaignId)
    if (!c) continue
    if (row.dateFrom < c.startDateStr || row.dateTo > c.endDateStr) {
      orphanRowCount++
    }
    // Include orphan rows in calculations so totals are accurate, but flag them
    validPerformances.push(row)
  }

  // 3. Resolve Containment
  const { included, excludedRowCount } = resolveRowsInRange(validPerformances, from, to)

  let partialLifetimeCampaignCount = 0
  for (const c of campaigns) {
    const cStart = toDateString(c.startDate)
    const cEnd = toDateString(c.endDate)
    if (cStart < from || cEnd > to) {
      partialLifetimeCampaignCount++
    }
  }

  // 5. Aggregate Grand Totals (KPIs)
  const totalSums = sumRawValues(included, campaigns)
  const reachAgg = aggregateReach(included.map(r => ({ campaignId: r.campaignId, reach: r.reach })))

  const kpiInput = {
    ...totalSums,
    reach: reachAgg.value,
    leads: Array.from(leadsMap.values()).reduce((a, b) => a + b, 0),
    qualifiedLeads: 0,
    closedSales: 0,
    sale: 0,
  }

  const kpiMetrics = calculateAdsMetrics(kpiInput)

  const warnings: WarningFlag[] = []
  if (reachAgg.isCombined) warnings.push({ type: 'REACH_COMBINED', message: 'Reach cannot be aggregated across multiple campaigns or periods.' })

  // 6. Build Table Rows
  const tableRows = campaigns.map(campaign => {
    const campaignRows = included.filter(r => r.campaignId === campaign.campaignId)
    const sums = sumRawValues(campaignRows, [campaign])
    const reach = aggregateReach(campaignRows.map(r => ({ campaignId: campaign.campaignId, reach: r.reach })))
    const metrics = calculateAdsMetrics({
      ...sums,
      reach: reach.value,
      leads: leadsMap.get(campaign.id) || 0,
      qualifiedLeads: 0,
      closedSales: 0,
      sale: 0
    })

    return {
      internalId: campaign.id,
      platformCampaignId: campaign.campaignId,
      campaignName: campaign.name,
      status: campaign.status,
      channelName: campaign.channel?.name || '-',
      budget: Number(campaign.budget),
      spend: Number(sums.spend),
      impressions: sums.impressions,
      reach: reach.value,
      linkClicks: sums.linkClicks,
      messageInbox: sums.messageInbox,
      results: sums.results,
      leads: leadsMap.get(campaign.id) || 0,
      qualifiedLeads: null,
      closedSales: null,
      sale: null,
      cpc: metrics.cpc,
      cpm: metrics.cpm,
      ctr: metrics.ctr,
      costPerResult: metrics.costPerResult,
      cpl: metrics.cpl,
      costPerQualifiedLead: metrics.costPerQualifiedLead,
      costPerSale: metrics.costPerSale,
      roas: metrics.roas
    }
  })

  // 7. Build Chart Data
  const channelDataMap = new Map<string, { spend: number, budget: number, leads: number }>()
  for (const row of tableRows) {
    const c = row.channelName
    const existing = channelDataMap.get(c) || { spend: 0, budget: 0, leads: 0 }
    channelDataMap.set(c, {
      spend: existing.spend + row.spend,
      budget: existing.budget + row.budget,
      leads: existing.leads + (row.leads || 0)
    })
  }
  const spendByChannel = Array.from(channelDataMap.entries()).map(([channel, data]) => ({ channel, ...data }))

  const trendMap = new Map<string, { spend: number, leads: number }>()
  for (const r of included) {
    const period = `${r.dateFrom} - ${r.dateTo}`
    const existing = trendMap.get(period) || { spend: 0, leads: 0 }
    
    const c = campaignByPlatformIdMap.get(r.campaignId)
    const leadsInPeriod = c ? await prisma.marketingLead.count({
      where: {
        adCampaignId: c.id,
        createdAt: { gte: new Date(r.dateFrom + 'T00:00:00+07:00'), lt: new Date(nextDay(r.dateTo) + 'T00:00:00+07:00') }
      }
    }) : 0

    trendMap.set(period, {
      spend: existing.spend + Number(r.spend),
      leads: existing.leads + leadsInPeriod
    })
  }
  const spendAndLeadsTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }))

  const productDataMap = new Map<string, { spend: number }>()
  for (const campaign of campaigns) {
    const p = campaign.productCategory || 'Uncategorized'
    const campaignRows = included.filter(r => r.campaignId === campaign.campaignId)
    const spend = campaignRows.reduce((sum, r) => sum + Number(r.spend), 0)
    const existing = productDataMap.get(p) || { spend: 0 }
    productDataMap.set(p, { spend: existing.spend + spend })
  }
  const spendByProduct = Array.from(productDataMap.entries()).map(([product, data]) => ({ product, ...data }))

  return {
    kpiMetrics: {
      budget: Number(kpiInput.budget),
      spend: Number(kpiInput.spend),
      impressions: kpiInput.impressions,
      reach: reachAgg,
      linkClicks: kpiInput.linkClicks,
      messageInbox: kpiInput.messageInbox,
      results: kpiInput.results,
      leads: kpiInput.leads,
      qualifiedLeads: null,
      closedSales: null,
      sale: null,
      remainingBudget: kpiMetrics.remainingBudget,
      budgetUsedPct: kpiMetrics.budgetUsedPct,
      cpc: kpiMetrics.cpc,
      cpm: kpiMetrics.cpm,
      ctr: kpiMetrics.ctr,
      costPerResult: kpiMetrics.costPerResult,
      cpl: kpiMetrics.cpl,
      costPerQualifiedLead: kpiMetrics.costPerQualifiedLead,
      costPerSale: kpiMetrics.costPerSale,
      qualifiedRate: kpiMetrics.qualifiedRate,
      closingRate: kpiMetrics.closingRate,
      roas: kpiMetrics.roas,
    },
    tableRows,
    meta: {
      excludedRowCount,
      orphanRowCount,
      partialLifetimeCampaignCount,
    },
    warnings,
    lastUpdatedAt: new Date().toISOString(),
    isEmpty: false,
    chartData: {
      spendByChannel,
      spendAndLeadsTrend,
      spendByProduct
    }
  }
}

function _buildEmptyResponse(): DashboardData {
  return {
    kpiMetrics: {
      budget: 0, spend: 0, impressions: null, reach: { value: null, isCombined: false }, linkClicks: null, messageInbox: null, results: null, leads: null, qualifiedLeads: null, closedSales: null, sale: null, remainingBudget: 0, budgetUsedPct: null, cpc: null, cpm: null, ctr: null, costPerResult: null, cpl: null, costPerQualifiedLead: null, costPerSale: null, qualifiedRate: null, closingRate: null, roas: null,
    },
    tableRows: [],
    meta: { excludedRowCount: 0, orphanRowCount: 0, partialLifetimeCampaignCount: 0 },
    warnings: [],
    lastUpdatedAt: new Date().toISOString(),
    isEmpty: true,
    chartData: {
      spendByChannel: [],
      spendAndLeadsTrend: [],
      spendByProduct: []
    }
  }
}
