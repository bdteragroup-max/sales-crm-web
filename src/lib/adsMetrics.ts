

export type MetricInput = {
  spend: number
  budget: number
  impressions: number | null
  reach: number | null
  linkClicks: number | null
  messageInbox: number | null
  results: number | null
  leads: number | null
  qualifiedLeads: number | null
  closedSales: number | null
  sale: number | null
}

export type FormatMode = 'thb' | 'pct' | 'ratio' | 'int' | 'decimal'

export type LeadForQualification = { isForwarded: boolean; isContacted: boolean; [key: string]: any }

/**
 * Marketing must define this rule to determine what constitutes a "Qualified Lead".
 * Until defined, this remains null and the UI will display "N/A".
 */
export const QUALIFIED_RULE: ((lead: LeadForQualification) => boolean) | null = null

/**
 * Exhaustive list of known statuses from the Quotation table.
 * Separated into closed and not closed for exhaustive testing.
 * 
 * pending confirmation from Marketing (2026-08-27)
 */
export const CLOSED_SALE_STATUSES: readonly string[] = [
  'เปิดบิลแล้ว',
  'PO แล้วรอเงินโอน',
  'PO แล้วรอสินค้า',
  'รอจัดทำ PO',
]

// pending confirmation from Marketing (2026-08-27)
export const NOT_CLOSED_STATUSES: readonly string[] = [
  '', // pending confirmation
  'ความสนใจ',
  'ช่วงนี้ยังไม่ได้ใช้',
  'ชะลอโครงการ',
  'ปฏิเสธ-ได้ที่อื่นแล้ว',
  'ปฏิเสธ-ยกเลิกสินค้า',
  'ปฏิเสธ-อื่นๆ',
  'ยกเลิก-Revise',
  'รอใบประเมินราคา',
  'สินค้าฝากขาย', // pending confirmation
  'เสนอราคา',
]

// Test data row to be ignored in the exhaustive check
export const IGNORED_STATUSES: readonly string[] = [
  'WON', 
]

/**
 * Normal division rule:
 * - If denominator is 0 or null -> return null
 * - If numerator is null -> return null
 * - If numerator is 0 and denominator > 0 -> return 0
 */
function safeDiv(numerator: number | null, denominator: number | null): number | null {
  if (denominator == null || denominator === 0) return null
  if (numerator == null) return null
  return numerator / denominator
}

/**
 * Cost calculation rule:
 * - Same as safeDiv, but explicitly returns null if spend is 0.
 * - Used to prevent artificially perfect "$0.00 Cost Per X" when there is no spend.
 */
function costPer(spend: number | null, denominator: number | null): number | null {
  if (spend === 0) return null
  return safeDiv(spend, denominator)
}

function pct(numerator: number | null, denominator: number | null): number | null {
  const result = safeDiv(numerator, denominator)
  return result != null ? result * 100 : null
}

export function calculateAdsMetrics(totals: MetricInput) {
  return {
    remainingBudget: totals.budget - totals.spend, 
    budgetUsedPct: pct(totals.spend, totals.budget), 
    cpc: costPer(totals.spend, totals.linkClicks), 
    cpm: (() => { const v = costPer(totals.spend, totals.impressions); return v != null ? v * 1000 : null })(), 
    ctr: pct(totals.linkClicks, totals.impressions), 
    costPerResult: costPer(totals.spend, totals.results), 
    cpl: costPer(totals.spend, totals.leads), 
    costPerQualifiedLead: costPer(totals.spend, totals.qualifiedLeads),
    costPerSale: costPer(totals.spend, totals.closedSales),
    qualifiedRate: pct(totals.qualifiedLeads, totals.leads),
    closingRate: pct(totals.closedSales, totals.qualifiedLeads),
    roas: safeDiv(totals.sale, totals.spend)
  }
}

export function formatMetric(value: number | null, mode: FormatMode): string {
  if (value == null) return 'N/A'
  
  switch (mode) {
    case 'thb':
      return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'pct':
      return `${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    case 'ratio':
      return `${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`
    case 'int':
      return value.toLocaleString('th-TH', { maximumFractionDigits: 0 })
    case 'decimal':
      return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
}

export function buildDedupeKey(data: {
  dateFrom: string, // YYYY-MM-DD
  dateTo: string, // YYYY-MM-DD
  channelId: string,
  campaignId: string, 
  adSetId?: string | null, 
  adId?: string | null
}) {
  return [
    data.dateFrom,
    data.dateTo,
    data.channelId,
    data.campaignId,
    data.adSetId ?? '',
    data.adId ?? '',
  ].join('|')
}

export function lastDayOfMonth(year: number, month: number): number {
  if (month === 2) {
    return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
