import { calculateAdsMetrics, CLOSED_SALE_STATUSES, NOT_CLOSED_STATUSES, IGNORED_STATUSES, formatMetric, lastDayOfMonth } from './adsMetrics'
import assert from 'assert'

function testAdsMetrics() {
  console.log("Running verify-adsMetrics...")
  
  // 1. Quotation Exhaustive Test
  // Ensure the DB list matches these constants exactly (with trim)
  const dbStatuses = [
    '', 'WON', 'ความสนใจ', 'ช่วงนี้ยังไม่ได้ใช้', 'ชะลอโครงการ', 
    'ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ปฏิเสธ-อื่นๆ', 
    'ยกเลิก-Revise', 'รอจัดทำ PO', 'รอใบประเมินราคา', 'สินค้าฝากขาย', 
    'เสนอราคา', 'เปิดบิลแล้ว', 'PO แล้วรอสินค้า', 'PO แล้วรอเงินโอน'
  ];
  
  for (const status of dbStatuses) {
    const trimmed = status.trim();
    const isKnown = CLOSED_SALE_STATUSES.includes(trimmed) || NOT_CLOSED_STATUSES.includes(trimmed) || IGNORED_STATUSES.includes(trimmed);
    assert(isKnown, `Unknown status found: '${status}'`);
  }
  assert(!CLOSED_SALE_STATUSES.includes('')) // Ensure blank is not a closed status
  console.log("  ✅ Quotation arrays configured exhaustively")

  // 2. Division Zero Rule (clicks = 0, impressions > 0)
  const metrics1 = calculateAdsMetrics({
    spend: 100, budget: 1000, impressions: 500, reach: null,
    linkClicks: 0, messageInbox: 0, results: 0, leads: 0, qualifiedLeads: 0,
    closedSales: 0, sale: 0
  })
  assert.strictEqual(metrics1.ctr, 0, "CTR should be 0 when clicks are 0")

  // 2b. Divisor Null Rule (spend = 100, impressions = null)
  const metricsNullDiv = calculateAdsMetrics({
    spend: 100, budget: 1000, impressions: null, reach: null,
    linkClicks: 0, messageInbox: 0, results: 0, leads: 0, qualifiedLeads: 0,
    closedSales: 0, sale: 0
  })
  assert.strictEqual(metricsNullDiv.cpm, null, "CPM should be null when spend is > 0 but divisor (impressions) is null")
  console.log("  ✅ Division Zero & Null Rules passed")

  // 3. CPL Null Rule (spend = 0, leads > 0)
  const metrics2 = calculateAdsMetrics({
    spend: 0, budget: 1000, impressions: 500, reach: null,
    linkClicks: 10, messageInbox: 0, results: 0, leads: 5, qualifiedLeads: 0,
    closedSales: 0, sale: 0
  })
  assert.strictEqual(metrics2.cpl, null, "CPL should be null when spend is 0")
  console.log("  ✅ Cost Null Rule passed")

  // 4. Budget Used Pct
  const metrics3 = calculateAdsMetrics({
    spend: 250, budget: 1000, impressions: 500, reach: null,
    linkClicks: 10, messageInbox: 0, results: 0, leads: 5, qualifiedLeads: 0,
    closedSales: 0, sale: 0
  })
  assert.strictEqual(metrics3.budgetUsedPct, 25, "budgetUsedPct should be 25")
  console.log("  ✅ Budget Used Pct Rule passed")

  // 5. formatMetric Null Rule
  assert.strictEqual(formatMetric(null, 'thb'), 'N/A')
  assert.strictEqual(formatMetric(null, 'pct'), 'N/A')
  console.log("  ✅ formatMetric Null Rule passed")

  // 6. lastDayOfMonth cases
  assert.strictEqual(lastDayOfMonth(2028, 2), 29, "Feb 2028 should have 29 days")
  assert.strictEqual(lastDayOfMonth(2026, 12), 31, "Dec should have 31 days")
  assert.strictEqual(lastDayOfMonth(2026, 8), 31, "Aug should have 31 days")
  console.log("  ✅ lastDayOfMonth Rule passed")

  console.log("All adsMetrics verifications passed!\n")
}

testAdsMetrics()
