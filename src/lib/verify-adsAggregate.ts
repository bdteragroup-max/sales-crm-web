import { sumRawValues, resolveRowsInRange, aggregateReach, toDateString } from './adsAggregate'
import assert from 'assert'

function testAdsAggregate() {
  console.log("Running verify-adsAggregate...")

  // 0. toDateString UTC conversion Rule
  const utcMidnight = new Date('2026-08-31T00:00:00Z')
  assert.strictEqual(toDateString(utcMidnight), '2026-08-31', "toDateString must not shift the date backward")
  console.log("  ✅ UTC Conversion Rule passed")

  const { nextDay } = require('./adsAggregate')
  assert.strictEqual(nextDay('2026-08-31'), '2026-09-01')
  assert.strictEqual(nextDay('2028-02-28'), '2028-02-29')
  assert.strictEqual(nextDay('2026-12-31'), '2027-01-01')
  console.log("  ✅ nextDay Rule passed")

  // 0.b Node Timezone Acceptance Test
  assert.strictEqual(
    new Date('2026-09-01T00:00:00+07:00').toISOString(), 
    '2026-08-31T17:00:00.000Z', 
    "Node must parse +07:00 properly"
  )
  console.log("  ✅ Node Timezone Acceptance Rule passed")

  // 1. Decimal Math Rule & Budget Dedupe Rule
  const performanceRows = [
    { dateFrom: '2026-08-01', dateTo: '2026-08-05', campaignId: '1', spend: 0.1, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
    { dateFrom: '2026-08-06', dateTo: '2026-08-10', campaignId: '1', spend: 0.2, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
    { dateFrom: '2026-08-11', dateTo: '2026-08-15', campaignId: '1', spend: 0, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
  ]
  const campaigns = [{ id: '1', budget: 100 }]
  
  const sum = sumRawValues(performanceRows, campaigns)
  assert.strictEqual(sum.spend, 0.3, "Decimal 0.1 + 0.2 should equal exactly 0.3, not 0.30000000000000004")
  assert.strictEqual(sum.budget, 100, "Budget must deduplicate per campaign even if there are 3 rows")
  console.log("  ✅ Decimal Math & Budget Dedupe Rules passed")

  // 1b. Containment Rule
  const rows = [
    { dateFrom: '2026-08-28', dateTo: '2026-09-03', campaignId: '1', spend: 100, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
    { dateFrom: '2026-08-31', dateTo: '2026-08-31', campaignId: '1', spend: 100, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
  ]
  const result = resolveRowsInRange(rows, '2026-08-01', '2026-08-31')
  assert.strictEqual(result.excludedRowCount, 1, "Cross-month row should be excluded")
  assert.strictEqual(result.included.length, 1, "End-of-month row should be included")
  console.log("  ✅ Containment Rule passed")

  // 2. Aggregate Reach rules
  assert.strictEqual(aggregateReach([]).isCombined, false)
  assert.strictEqual(aggregateReach([]).value, null)
  
  assert.strictEqual(aggregateReach([{ campaignId: 'c1', reach: null }]).isCombined, false)
  assert.strictEqual(aggregateReach([{ campaignId: 'c1', reach: null }]).value, null)
  
  assert.strictEqual(aggregateReach([{ campaignId: 'c1', reach: 500 }]).isCombined, false)
  assert.strictEqual(aggregateReach([{ campaignId: 'c1', reach: 500 }]).value, 500)
  
  assert.strictEqual(aggregateReach([{ campaignId: 'c1', reach: 500 }, { campaignId: 'c1', reach: 300 }]).isCombined, true)
  assert.strictEqual(aggregateReach([{ campaignId: 'c1', reach: 500 }, { campaignId: 'c1', reach: 300 }]).value, null)
  
  // 3. Table Sum == KPI Sum Test
  const perfRows = [
    { dateFrom: '2026-08-01', dateTo: '2026-08-10', campaignId: 'c1', spend: 50, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
    { dateFrom: '2026-08-11', dateTo: '2026-08-20', campaignId: 'c1', spend: 60, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
    { dateFrom: '2026-08-01', dateTo: '2026-08-15', campaignId: 'c2', spend: 200, impressions: null, reach: null, linkClicks: null, messageInbox: null, results: null },
  ]
  const allCampaigns = [
    { id: 'c1', budget: 1000 },
    { id: 'c2', budget: 2000 },
    { id: 'c3', budget: 500 } // Empty campaign
  ]
  
  const kpiSum = sumRawValues(perfRows, allCampaigns)
  
  const tableRowsSum = allCampaigns.reduce((acc, campaign) => {
    const campaignRows = perfRows.filter(r => r.campaignId === campaign.id)
    const sums = sumRawValues(campaignRows, [campaign])
    return {
      spend: acc.spend + Number(sums.spend),
      budget: acc.budget + Number(sums.budget)
    }
  }, { spend: 0, budget: 0 })

  assert.strictEqual(Number(kpiSum.spend), tableRowsSum.spend, "KPI spend sum must equal sum of table row spends")
  assert.strictEqual(Number(kpiSum.budget), tableRowsSum.budget, "KPI budget sum must equal sum of table row budgets")
  console.log("  ✅ Table Sum == KPI Sum Rule passed")

  console.log("All adsAggregate verifications passed!\n")
}

testAdsAggregate()
