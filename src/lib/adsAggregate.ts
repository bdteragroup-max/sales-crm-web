import { Prisma } from '../generated/client'
import { lastDayOfMonth } from './adsMetrics'

export type RawPerformanceRow = {
  dateFrom: string // YYYY-MM-DD
  dateTo: string   // YYYY-MM-DD
  campaignId: string
  spend: number | Prisma.Decimal
  impressions: number | null
  reach: number | null
  linkClicks: number | null
  messageInbox: number | null
  results: number | null
}

export type CampaignRow = {
  id: string
  budget: number | Prisma.Decimal | null
}

/**
 * Converts a Prisma @db.Date (which returns UTC midnight) to a local YYYY-MM-DD string.
 * This ONLY works correctly for @db.Date fields. Do not use for Timestamptz.
 * This avoids time zone shift bugs caused by using local `.getFullYear()` on UTC boundaries.
 */
export function toDateString(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Converts a Prisma @db.Timestamptz (or normal DateTime) into a Bangkok (UTC+7) YYYY-MM-DD string.
 * Used for fields like MarketingLead.createdAt to accurately map to local days.
 */
export function toBangkokDateString(d: Date): string {
  // Add 7 hours to shift the UTC time to Bangkok time
  const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const yyyy = bkk.getUTCFullYear()
  const mm = String(bkk.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(bkk.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function nextDay(dateStr: string): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10);
  let day = parseInt(dStr, 10);

  const lastDay = lastDayOfMonth(year, month);
  
  if (day < lastDay) {
    day += 1;
  } else {
    day = 1;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Ensures a performance row's date range is STRICTLY contained within the filter range.
 * dateFrom >= filter.from && dateTo <= filter.to
 * Pure string comparison is used to avoid UTC shifting.
 */
export function resolveRowsInRange(
  rows: RawPerformanceRow[],
  filterFrom: string, // YYYY-MM-DD
  filterTo: string    // YYYY-MM-DD
) {
  let excludedRowCount = 0
  const included: RawPerformanceRow[] = []

  for (const row of rows) {
    if (row.dateFrom >= filterFrom && row.dateTo <= filterTo) {
      included.push(row)
    } else {
      excludedRowCount++
    }
  }

  return { included, excludedRowCount }
}

/**
 * Calculates raw sums across all included performance rows and safely dedupes the budget.
 * Decimal values are safely summed using Prisma.Decimal to avoid floating point errors,
 * then converted back to standard numbers.
 */
export function sumRawValues(
  performanceRows: RawPerformanceRow[],
  campaignsInUniverse: CampaignRow[]
) {
  let spend = new Prisma.Decimal(0)
  let budget = new Prisma.Decimal(0)
  let impressions = 0
  let linkClicks = 0
  let messageInbox = 0
  let results = 0

  // 1. Sum performance metrics across rows
  for (const row of performanceRows) {
    spend = spend.add(row.spend || 0)
    impressions += row.impressions || 0
    linkClicks += row.linkClicks || 0
    messageInbox += row.messageInbox || 0
    results += row.results || 0
  }

  // 2. Sum budget deduplicated per campaign
  for (const campaign of campaignsInUniverse) {
    budget = budget.add(campaign.budget || 0)
  }

  return {
    spend: spend.toNumber(),
    budget: budget.toNumber(),
    impressions: impressions === 0 && performanceRows.length > 0 ? 0 : (impressions || null),
    linkClicks: linkClicks === 0 && performanceRows.length > 0 ? 0 : (linkClicks || null),
    messageInbox: messageInbox === 0 && performanceRows.length > 0 ? 0 : (messageInbox || null),
    results: results === 0 && performanceRows.length > 0 ? 0 : (results || null),
  }
}

/**
 * Reach cannot be summed. It can only be displayed if there is exactly 1 row of data.
 * Even if there is 1 campaign, but 2 time periods, Reach cannot be aggregated accurately.
 */
export function aggregateReach(rows: { campaignId: string, reach: number | null }[]) {
  if (rows.length === 0) {
    return { value: null, isCombined: false }
  }
  
  if (rows.length === 1) {
    return { value: rows[0].reach, isCombined: false }
  }

  // Multiple rows mean we cannot safely sum or represent the reach.
  return { value: null, isCombined: true }
}
