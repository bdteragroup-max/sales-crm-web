export type DashboardFilters = {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
  channelId?: string
  branchId?: string
  productId?: string
  objective?: string
  accountId?: string
  campaignIds?: string[]
}

export type DashboardMeta = {
  excludedRowCount: number
  orphanRowCount: number
  partialLifetimeCampaignCount: number
}

export type WarningFlag = {
  type: 'REACH_COMBINED' | 'ORPHAN_ROWS' | 'PARTIAL_LIFETIME'
  message: string
}

export type DashboardData = {
  kpiMetrics: {
    budget: number
    spend: number
    impressions: number | null
    reach: { value: number | null, isCombined: boolean }
    linkClicks: number | null
    messageInbox: number | null
    results: number | null
    leads: number | null
    qualifiedLeads: number | null
    closedSales: number | null
    sale: number | null
    remainingBudget: number
    budgetUsedPct: number | null
    cpc: number | null
    cpm: number | null
    ctr: number | null
    costPerResult: number | null
    cpl: number | null
    costPerQualifiedLead: number | null
    costPerSale: number | null
    qualifiedRate: number | null
    closingRate: number | null
    roas: number | null
  }
  tableRows: {
    internalId: string
    platformCampaignId: string
    campaignName: string
    status: string
    channelName: string
    budget: number
    spend: number
    impressions: number | null
    reach: number | null
    linkClicks: number | null
    messageInbox: number | null
    results: number | null
    leads: number | null
    qualifiedLeads: number | null
    closedSales: number | null
    sale: number | null
    cpc: number | null
    cpm: number | null
    ctr: number | null
    costPerResult: number | null
    cpl: number | null
    costPerQualifiedLead: number | null
    costPerSale: number | null
    roas: number | null
  }[]
  meta: DashboardMeta
  warnings: WarningFlag[]
  lastUpdatedAt: string
  isEmpty: boolean
  chartData: {
    spendByChannel: { channel: string; spend: number; budget: number; leads: number }[]
    spendAndLeadsTrend: { date: string; spend: number; leads: number }[]
    spendByProduct: { product: string; spend: number }[]
  }
}
