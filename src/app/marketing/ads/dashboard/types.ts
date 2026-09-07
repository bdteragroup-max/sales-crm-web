export type DashboardPeriodFilter = '01-31 Aug 2026' | 'This Month' | 'Last 30 Days' | 'Last 7 Days' | 'Custom'

export type DataFreshnessLevel = 'GREEN' | 'YELLOW' | 'RED'

export interface TeraDashboardFilters {
  reportingPeriod: string
  dateFrom: string
  dateTo: string
  compareWith: string // 'Previous Period' | 'None'
  channel: string     // 'All' | 'Facebook' | 'TikTok' | 'Google' | 'LINE'
  productCategory: string // 'All' | 'Solar Pump' | 'Solar Rooftop'
  campaignId: string  // 'All' | specific ID
  adSetId: string     // 'All' | specific ID
  adId: string        // 'All' | specific ID
  creative: string    // 'All' | specific file
  status: string      // 'All' | 'Active' | 'Paused'
  search?: string
}

export interface KpiMetricItem {
  key: string
  label: string
  sublabel?: string
  value: number | null
  displayValue: string
  delta?: {
    value: number
    percent: number | null
    isPositiveGood: boolean
    direction: 'up' | 'down' | 'neutral'
  }
  subtitle?: string
  format: 'currency' | 'number' | 'percent'
  badge?: string
}

export interface PrimaryBusinessKpis {
  plannedBudget: KpiMetricItem
  totalSpend: KpiMetricItem
  remainingBudget: KpiMetricItem
  budgetUsedPct: KpiMetricItem
  messageInbox: KpiMetricItem
  leads: KpiMetricItem
  qualifiedLeads: KpiMetricItem
  closedSales: KpiMetricItem
  sale: KpiMetricItem
  roi: KpiMetricItem
}

export interface DeliveryTrafficKpis {
  reach: KpiMetricItem
  impressions: KpiMetricItem
  clicks: KpiMetricItem
  ctr: KpiMetricItem
  cpc: KpiMetricItem
  cpm: KpiMetricItem
  costPerResult: KpiMetricItem
  costPerLead: KpiMetricItem
  costPerSale: KpiMetricItem
  leadConversionRate: KpiMetricItem
  salesCloseRate: KpiMetricItem
}

export interface DailyTrendPoint {
  date: string
  formattedDate: string
  spend: number
  leads: number
  messageInbox: number
  costPerResult: number | null
  reach: number
  impressions: number
}

export interface FunnelStageItem {
  stageNumber: number
  stageKey: string
  stageName: string
  count: number
  percentageFromInitial: number
  percentageFromPrevious: number | null
  colorClass: string
}

export interface CampaignBreakdownRow {
  campaignId: string
  campaignName: string
  channel: string
  budget: number
  spend: number
  messageInbox: number
  leads: number
  qualifiedLeads: number
  appointments: number
  quotations: number
  closedSales: number
  sale: number
  costPerLead: number | null
  costPerSale: number | null
  roi: number | null
  adCount: number
}

export interface AdSetBreakdownRow {
  adSetId: string
  adSetName: string
  campaignId?: string
  campaignName: string
  adCount?: number
  spend: number
  messageInbox: number
  leads: number
  closedSales: number
  sale: number
  roi: number | null
}

export interface ChannelBreakdownRow {
  channel: string
  campaignCount: number
  adCount: number
  spend: number
  messageInbox: number
  leads: number
  closedSales: number
  sale: number
  roi: number | null
}

export interface AdBreakdownRow {
  adId: string
  adName: string
  campaignId: string
  campaignName: string
  adSetId: string
  adSetName: string
  channel: string
  status: 'Active' | 'Paused' | 'Archived' | 'Draft'
  format: 'Image' | 'Video' | 'Carousel'
  creativeFile: string
  creativeVersion: string
  creativeUrl: string
  spend: number
  messageInbox: number
  reach: number
  impressions: number
  clicks: number
  ctr: number | null
  cpc: number | null
  leads: number
  qualifiedLeads: number
  appointments: number
  quotations: number
  closedSales: number
  sale: number
  costPerLead: number | null
  costPerSale: number | null
  roi: number | null
  lastUpdated: string
  hoursSinceUpdate: number
  freshness: DataFreshnessLevel
}

export interface CreativePerformanceRow {
  creativeId: string
  creativeFile: string
  creativeVersion: string
  creativeUrl: string
  format: 'Image' | 'Video' | 'Carousel'
  adCount: number
  spend: number
  messageInbox: number
  leads: number
  closedSales: number
  sale: number
  roi: number | null
  costPerLead: number | null
}

export interface TopAdInsightItem {
  adId: string
  adName: string
  creativeFile: string
  roi: number
  spend: number
  sale: number
  leads: number
  badgeText: string
}

export interface DashboardAlertItem {
  id: string
  severity: 'WARNING' | 'ALERT' | 'INFO' | 'SUCCESS'
  title: string
  description?: string
  actionLabel?: string
  actionUrl?: string
}

export interface TeraDashboardData {
  filters: TeraDashboardFilters
  lastRefreshedAt: string
  lastUpdatedBy: string
  businessKpis: PrimaryBusinessKpis
  deliveryKpis: DeliveryTrafficKpis
  trendSeries: DailyTrendPoint[]
  funnelStages: FunnelStageItem[]
  campaignBreakdown: CampaignBreakdownRow[]
  adSetBreakdown: AdSetBreakdownRow[]
  channelBreakdown: ChannelBreakdownRow[]
  adsBreakdown: AdBreakdownRow[]
  creativeBreakdown: CreativePerformanceRow[]
  topAdsByRoi: TopAdInsightItem[]
  adsNeedingImprovement: TopAdInsightItem[]
  alerts: DashboardAlertItem[]
  dataFreshnessSummary: {
    greenCount: number
    yellowCount: number
    redCount: number
    totalAds: number
  }
}

// Backward compatibility types for legacy imports if any
export type DashboardFilters = any
export type DashboardData = any
export type WarningFlag = any

