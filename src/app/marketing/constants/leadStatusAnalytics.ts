import { normalizeProductGroup } from './productOccupations'

export type LeadDateFilterMode = 'all' | 'day' | 'month' | 'year' | 'range'

export interface LeadDateFilterState {
  mode: LeadDateFilterMode
  date: string // YYYY-MM-DD (Gregorian / CE)
  month: number // 1-12
  year: number // CE year (e.g. 2026 => 2569 B.E.)
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export type LeadStatusBucketKey =
  | 'new'
  | 'waiting_contact'
  | 'in_progress'
  | 'won'
  | 'lost'

export interface AnalyticsLeadLike {
  id: string
  createdAt: Date | string
  isForwarded?: boolean | null
  assignedToId?: string | null
  isContacted?: boolean | null
  productType?: string | null
  productOfInterest?: string | null
  leadSource?: string | null
  campaignSource?: string | null
  adCampaign?: {
    channel?: { name?: string | null } | null
  } | null
  quotation?: {
    status?: string | null
    salesperson?: { fullName?: string | null } | null
  } | null
  latestTelesale?: {
    callOutcome?: string | null
    result?: string | null
    conversationSummary?: string | null
    salesPerson?: string | null
    createdAt?: Date | string | null
  } | null
}

export const THAI_MONTH_OPTIONS = [
  { value: 1, label: 'มกราคม', short: 'ม.ค.' },
  { value: 2, label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { value: 3, label: 'มีนาคม', short: 'มี.ค.' },
  { value: 4, label: 'เมษายน', short: 'เม.ย.' },
  { value: 5, label: 'พฤษภาคม', short: 'พ.ค.' },
  { value: 6, label: 'มิถุนายน', short: 'มิ.ย.' },
  { value: 7, label: 'กรกฎาคม', short: 'ก.ค.' },
  { value: 8, label: 'สิงหาคม', short: 'ส.ค.' },
  { value: 9, label: 'กันยายน', short: 'ก.ย.' },
  { value: 10, label: 'ตุลาคม', short: 'ต.ค.' },
  { value: 11, label: 'พฤศจิกายน', short: 'พ.ย.' },
  { value: 12, label: 'ธันวาคม', short: 'ธ.ค.' },
] as const

export const LEAD_STATUS_META: Record<
  LeadStatusBucketKey,
  {
    key: LeadStatusBucketKey
    label: string
    shortLabel: string
    stageFilter: 'new' | 'forwarded' | 'contacted' | 'won' | 'lost'
    color: string
    badgeClass: string
  }
> = {
  new: {
    key: 'new',
    label: 'Lead ใหม่ / รอส่งต่อฝ่ายขาย',
    shortLabel: 'รอส่งต่อ',
    stageFilter: 'new',
    color: '#ff2301',
    badgeClass: 'bg-red-50 text-[#ff2301] border-red-200',
  },
  waiting_contact: {
    key: 'waiting_contact',
    label: 'ส่งต่อแล้ว / รอฝ่ายขายติดต่อ',
    shortLabel: 'รอติดต่อ',
    stageFilter: 'forwarded',
    color: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  in_progress: {
    key: 'in_progress',
    label: 'ติดต่อแล้ว / กำลังติดตาม-เสนอราคา',
    shortLabel: 'กำลังติดตาม',
    stageFilter: 'contacted',
    color: '#2563eb',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  won: {
    key: 'won',
    label: 'ปิดการขายสำเร็จ (Won)',
    shortLabel: 'ปิดการขาย (Won)',
    stageFilter: 'won',
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  lost: {
    key: 'lost',
    label: 'ไม่สนใจ / ปิดไม่สำเร็จ (Lost)',
    shortLabel: 'ไม่สนใจ (Lost)',
    stageFilter: 'lost',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
}

export const LEAD_STATUS_ORDER: LeadStatusBucketKey[] = [
  'new',
  'waiting_contact',
  'in_progress',
  'won',
  'lost',
]

export function toThaiBuddhistYear(ceYear: number): number {
  return ceYear + 543
}

/**
 * Extract Bangkok calendar components (`YYYY-MM-DD`, year, month, day) safely without UTC shift.
 */
export function getBkkDateParts(
  input: Date | string | null | undefined
): { dateStr: string; year: number; month: number; day: number } | null {
  if (!input) return null
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null

  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

  const [yStr, mStr, dStr] = formatted.split('-')
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)
  if (!year || !month || !day) return null

  return { dateStr: formatted, year, month, day }
}

export function getBkkTodayString(): string {
  return (
    getBkkDateParts(new Date())?.dateStr || new Date().toISOString().slice(0, 10)
  )
}

export function shiftIsoDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return dt.toISOString().slice(0, 10)
}

export function createDefaultLeadDateFilter(todayBkk?: string): LeadDateFilterState {
  const baseDate = todayBkk || getBkkTodayString()
  const [y, m] = baseDate.split('-').map(Number)
  const year = y || new Date().getFullYear()
  const month = m || new Date().getMonth() + 1
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  return {
    mode: 'all',
    date: baseDate,
    month,
    year,
    startDate: `${monthPrefix}-01`,
    endDate: baseDate,
  }
}

export function matchesLeadDateFilter(
  createdAt: Date | string | null | undefined,
  filter: LeadDateFilterState
): boolean {
  if (filter.mode === 'all') return true
  const parts = getBkkDateParts(createdAt)
  if (!parts) return false

  if (filter.mode === 'day') {
    return Boolean(filter.date) && parts.dateStr === filter.date
  }
  if (filter.mode === 'month') {
    return parts.year === filter.year && parts.month === filter.month
  }
  if (filter.mode === 'year') {
    return parts.year === filter.year
  }
  if (filter.mode === 'range') {
    if (filter.startDate && parts.dateStr < filter.startDate) return false
    if (filter.endDate && parts.dateStr > filter.endDate) return false
    return true
  }
  return true
}

export function formatLeadDateFilterSummary(filter: LeadDateFilterState): string {
  if (filter.mode === 'all') return 'ทุกช่วงเวลา (ทั้งหมด)'
  if (filter.mode === 'day') {
    if (!filter.date) return 'รายวัน'
    const [y, m, d] = filter.date.split('-').map(Number)
    const mName = THAI_MONTH_OPTIONS.find((item) => item.value === m)?.short || String(m)
    return `วันที่ ${d} ${mName} ${toThaiBuddhistYear(y)}`
  }
  if (filter.mode === 'month') {
    const mName = THAI_MONTH_OPTIONS.find((item) => item.value === filter.month)?.label || String(filter.month)
    return `เดือน ${mName} ${toThaiBuddhistYear(filter.year)}`
  }
  if (filter.mode === 'year') {
    return `ปี พ.ศ. ${toThaiBuddhistYear(filter.year)}`
  }
  const startLabel = filter.startDate
    ? (() => {
        const [y, m, d] = filter.startDate.split('-').map(Number)
        const mShort = THAI_MONTH_OPTIONS.find((i) => i.value === m)?.short || String(m)
        return `${d} ${mShort} ${String(toThaiBuddhistYear(y)).slice(-2)}`
      })()
    : '...'
  const endLabel = filter.endDate
    ? (() => {
        const [y, m, d] = filter.endDate.split('-').map(Number)
        const mShort = THAI_MONTH_OPTIONS.find((i) => i.value === m)?.short || String(m)
        return `${d} ${mShort} ${String(toThaiBuddhistYear(y)).slice(-2)}`
      })()
    : '...'
  return `${startLabel} – ${endLabel}`
}

/**
 * Canonical product group resolver normalizing values such as `"Solar Roof"` / `"SOLAR ROOFTOP"` -> `"Solar Rooftop"`.
 */
export function resolveLeadProductGroup(lead: {
  productType?: string | null
  productOfInterest?: string | null
}): string {
  const fromType = normalizeProductGroup(lead.productType)
  if (fromType) return fromType
  const fromInterest = normalizeProductGroup(lead.productOfInterest)
  if (fromInterest) return fromInterest
  return 'ไม่ระบุกลุ่มสินค้า'
}

export function matchesLeadProductGroupFilter(
  lead: { productType?: string | null; productOfInterest?: string | null },
  selectedProductGroup: string
): boolean {
  if (!selectedProductGroup) return true
  const selectedNorm = normalizeProductGroup(selectedProductGroup) || selectedProductGroup.trim()
  const leadGroup = resolveLeadProductGroup(lead)
  if (leadGroup.toLowerCase() === selectedNorm.toLowerCase()) return true

  const rawType = (lead.productType || '').toLowerCase()
  const pgLower = selectedProductGroup.toLowerCase()
  return rawType.includes(pgLower)
}

export function evaluateMarketingLeadStatus(lead: AnalyticsLeadLike) {
  const status = lead.quotation?.status || ''
  const telesaleOutcome = lead.latestTelesale?.callOutcome || lead.latestTelesale?.result || ''
  const telesaleSummary = lead.latestTelesale?.conversationSummary || ''
  const isTelesaleNotInterested =
    telesaleOutcome === 'ไม่สนใจ' ||
    lead.latestTelesale?.result === 'ไม่สนใจ' ||
    telesaleSummary.includes('ไม่สนใจ') ||
    telesaleSummary.includes('ไม่สะดวกคุย ไม่สนใจ')

  const isQuotationLost = status.includes('ไม่สำเร็จ') || status.includes('ปฏิเสธ')
  const isLost = isQuotationLost || isTelesaleNotInterested
  const isWon = ['รอติดตั้ง', 'ปิดการขาย', 'รอส่งมอบ', 'เปิดบิลแล้ว'].includes(status)
  const isForwarded = Boolean(lead.isForwarded || lead.assignedToId)
  const isContacted = Boolean(lead.isContacted) || Boolean(lead.latestTelesale)

  let currentStage = 0 // 0: New Lead
  if (isForwarded) currentStage = 1 // 1: Forwarded
  if (status || isContacted) currentStage = 2 // 2: In progress / Quotation
  if (isWon || isLost) currentStage = 3 // 3: Finished (Won / Lost)

  let bucketKey: LeadStatusBucketKey = 'new'
  if (isWon) bucketKey = 'won'
  else if (isLost) bucketKey = 'lost'
  else if (!isForwarded) bucketKey = 'new'
  else if (isContacted || Boolean(status)) bucketKey = 'in_progress'
  else bucketKey = 'waiting_contact'

  let detailedStatusLabel = 'Lead ใหม่ (รอส่งต่อ)'
  if (status) {
    detailedStatusLabel = status
  } else if (isTelesaleNotInterested) {
    detailedStatusLabel = 'ไม่สนใจ (จากฝ่ายขาย/Telesale)'
  } else if (isContacted) {
    detailedStatusLabel = telesaleOutcome ? `ติดต่อแล้ว: ${telesaleOutcome}` : 'ติดต่อลูกค้าแล้ว'
  } else if (isForwarded) {
    detailedStatusLabel = 'ส่งต่อแล้ว (รอฝ่ายขายติดต่อ)'
  }

  return {
    isLost,
    isWon,
    isForwarded,
    isContacted,
    currentStage,
    bucketKey,
    detailedStatusLabel,
    status,
    telesaleOutcome,
    isTelesaleNotInterested,
    telesaleSummary,
    telesaleSalesPerson: lead.latestTelesale?.salesPerson || null,
    telesaleDate: lead.latestTelesale?.createdAt || null,
  }
}

export function getAvailableLeadYears(
  leads: { createdAt: Date | string }[],
  fallbackYear: number
): number[] {
  const years = new Set<number>([fallbackYear])
  for (const lead of leads) {
    const parts = getBkkDateParts(lead.createdAt)
    if (parts) years.add(parts.year)
  }
  return Array.from(years).sort((a, b) => b - a)
}

function resolveSimpleChannel(lead: AnalyticsLeadLike): string {
  const raw =
    lead.adCampaign?.channel?.name ||
    lead.leadSource ||
    lead.campaignSource ||
    ''
  const lower = raw.toLowerCase().trim()
  if (!lower) return 'ไม่ระบุช่องทาง'
  if (lower.includes('facebook') || lower.includes('fb')) return 'Facebook'
  if (lower.includes('tiktok')) return 'TikTok'
  if (lower.includes('google')) return 'Google Ads'
  if (lower.includes('line')) return 'LINE'
  if (lower.includes('website') || lower.includes('web')) return 'Website'
  if (lower.includes('หน้าร้าน') || lower.includes('walk')) return 'หน้าร้าน'
  if (lower.includes('แนะนำ') || lower.includes('referral')) return 'แนะนำ'
  return raw.split('|')[0].trim() || 'อื่นๆ'
}

export interface ProductStatusBreakdownRow {
  productGroup: string
  total: number
  newCount: number
  waitingCount: number
  inProgressCount: number
  wonCount: number
  lostCount: number
  winRate: string
}

export interface TrendBucketRow {
  sortKey: string
  label: string
  total: number
  newCount: number
  waitingCount: number
  inProgressCount: number
  wonCount: number
  lostCount: number
}

export interface LeadStatusAnalyticsResult {
  summary: {
    total: number
    newLeads: number
    forwardedLeads: number
    waitingContactLeads: number
    contactedLeads: number
    inProgressLeads: number
    wonLeads: number
    notInterestedLeads: number
    conversionRate: string
  }
  statusDistribution: {
    key: LeadStatusBucketKey
    label: string
    shortLabel: string
    stageFilter: 'new' | 'forwarded' | 'contacted' | 'won' | 'lost'
    count: number
    percentage: number
    color: string
    badgeClass: string
  }[]
  productBreakdown: ProductStatusBreakdownRow[]
  detailedStatuses: {
    label: string
    bucketKey: LeadStatusBucketKey
    count: number
    percentage: number
  }[]
  channelBreakdown: {
    channel: string
    total: number
    wonCount: number
    inProgressCount: number
    lostCount: number
  }[]
  trendData: TrendBucketRow[]
  trendGranularity: 'day' | 'month'
}

export function buildLeadStatusAnalytics(
  leads: AnalyticsLeadLike[],
  dateMode: LeadDateFilterMode = 'all'
): LeadStatusAnalyticsResult {
  const total = leads.length
  let newLeads = 0
  let forwardedLeads = 0
  let waitingContactLeads = 0
  let contactedLeads = 0
  let inProgressLeads = 0
  let wonLeads = 0
  let notInterestedLeads = 0

  const bucketCounts: Record<LeadStatusBucketKey, number> = {
    new: 0,
    waiting_contact: 0,
    in_progress: 0,
    won: 0,
    lost: 0,
  }

  const productMap = new Map<string, ProductStatusBreakdownRow>()
  const detailedMap = new Map<string, { bucketKey: LeadStatusBucketKey; count: number }>()
  const channelMap = new Map<
    string,
    { total: number; wonCount: number; inProgressCount: number; lostCount: number }
  >()
  const trendMap = new Map<string, TrendBucketRow>()

  const trendGranularity: 'day' | 'month' =
    dateMode === 'day' || dateMode === 'month' || dateMode === 'range' ? 'day' : 'month'

  for (const lead of leads) {
    const evalRes = evaluateMarketingLeadStatus(lead)
    bucketCounts[evalRes.bucketKey] += 1

    if (evalRes.isLost || evalRes.isTelesaleNotInterested) {
      notInterestedLeads++
    }
    if (!evalRes.isForwarded) {
      newLeads++
    } else if (evalRes.isWon) {
      wonLeads++
      forwardedLeads++
    } else {
      forwardedLeads++
      if (evalRes.isContacted) contactedLeads++
    }
    if (evalRes.bucketKey === 'waiting_contact') waitingContactLeads++
    if (evalRes.bucketKey === 'in_progress') inProgressLeads++

    // Product group aggregation
    const pGroup = resolveLeadProductGroup(lead)
    let prodRow = productMap.get(pGroup)
    if (!prodRow) {
      prodRow = {
        productGroup: pGroup,
        total: 0,
        newCount: 0,
        waitingCount: 0,
        inProgressCount: 0,
        wonCount: 0,
        lostCount: 0,
        winRate: '0.0',
      }
      productMap.set(pGroup, prodRow)
    }
    prodRow.total += 1
    if (evalRes.bucketKey === 'new') prodRow.newCount += 1
    else if (evalRes.bucketKey === 'waiting_contact') prodRow.waitingCount += 1
    else if (evalRes.bucketKey === 'in_progress') prodRow.inProgressCount += 1
    else if (evalRes.bucketKey === 'won') prodRow.wonCount += 1
    else if (evalRes.bucketKey === 'lost') prodRow.lostCount += 1

    // Granular status breakdown
    const prevDetail = detailedMap.get(evalRes.detailedStatusLabel)
    if (prevDetail) {
      prevDetail.count += 1
    } else {
      detailedMap.set(evalRes.detailedStatusLabel, {
        bucketKey: evalRes.bucketKey,
        count: 1,
      })
    }

    // Channel breakdown
    const ch = resolveSimpleChannel(lead)
    let chRow = channelMap.get(ch)
    if (!chRow) {
      chRow = { total: 0, wonCount: 0, inProgressCount: 0, lostCount: 0 }
      channelMap.set(ch, chRow)
    }
    chRow.total += 1
    if (evalRes.bucketKey === 'won') chRow.wonCount += 1
    else if (evalRes.bucketKey === 'lost') chRow.lostCount += 1
    else if (evalRes.bucketKey === 'in_progress' || evalRes.bucketKey === 'waiting_contact') {
      chRow.inProgressCount += 1
    }

    // Trend bucket aggregation
    const parts = getBkkDateParts(lead.createdAt)
    if (parts) {
      const sortKey =
        trendGranularity === 'day'
          ? parts.dateStr
          : `${parts.year}-${String(parts.month).padStart(2, '0')}`
      const mShort = THAI_MONTH_OPTIONS.find((m) => m.value === parts.month)?.short || String(parts.month)
      const label =
        trendGranularity === 'day'
          ? `${parts.day} ${mShort}`
          : `${mShort} ${String(toThaiBuddhistYear(parts.year)).slice(-2)}`

      let tRow = trendMap.get(sortKey)
      if (!tRow) {
        tRow = {
          sortKey,
          label,
          total: 0,
          newCount: 0,
          waitingCount: 0,
          inProgressCount: 0,
          wonCount: 0,
          lostCount: 0,
        }
        trendMap.set(sortKey, tRow)
      }
      tRow.total += 1
      if (evalRes.bucketKey === 'new') tRow.newCount += 1
      else if (evalRes.bucketKey === 'waiting_contact') tRow.waitingCount += 1
      else if (evalRes.bucketKey === 'in_progress') tRow.inProgressCount += 1
      else if (evalRes.bucketKey === 'won') tRow.wonCount += 1
      else if (evalRes.bucketKey === 'lost') tRow.lostCount += 1
    }
  }

  const productBreakdown = Array.from(productMap.values())
    .map((row) => ({
      ...row,
      winRate: row.total > 0 ? ((row.wonCount / row.total) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.total - a.total)

  const statusDistribution = LEAD_STATUS_ORDER.map((key) => {
    const meta = LEAD_STATUS_META[key]
    const count = bucketCounts[key]
    return {
      ...meta,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }
  })

  const detailedStatuses = Array.from(detailedMap.entries())
    .map(([label, info]) => ({
      label,
      bucketKey: info.bucketKey,
      count: info.count,
      percentage: total > 0 ? Math.round((info.count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const channelBreakdown = Array.from(channelMap.entries())
    .map(([channel, stats]) => ({ channel, ...stats }))
    .sort((a, b) => b.total - a.total)

  const trendData = Array.from(trendMap.values()).sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey)
  )

  return {
    summary: {
      total,
      newLeads,
      forwardedLeads,
      waitingContactLeads,
      contactedLeads,
      inProgressLeads,
      wonLeads,
      notInterestedLeads,
      conversionRate: total > 0 ? ((wonLeads / total) * 100).toFixed(1) : '0.0',
    },
    statusDistribution,
    productBreakdown,
    detailedStatuses,
    channelBreakdown,
    trendData,
    trendGranularity,
  }
}
