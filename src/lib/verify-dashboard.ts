import prisma from '../app/lib/db'

async function main() {
  const from = '2026-08-01'
  const to = '2026-08-31'

  const campaigns = await prisma.adCampaign.findMany({
    select: { 
      id: true,
      campaignId: true,
      name: true, 
      status: true, 
      budget: true, 
      startDate: true,
      endDate: true,
    }
  }) as any[]

  const campaignUniverseCuidList = campaigns.map(c => c.id)
  const campaignUniversePlatformIds = campaigns.map(c => c.campaignId)

  const rawPerformances = await prisma.adPerformance.findMany({
    where: { campaignId: { in: campaignUniversePlatformIds } }
  })

  // Mimic the strict containment logic:
  const included = []
  for (const row of rawPerformances) {
    // Normalizing dates for comparison (ignoring timezones for this quick test)
    const dateFromStr = row.dateFrom.toISOString().split('T')[0]
    const dateToStr = row.dateTo.toISOString().split('T')[0]
    
    if (dateFromStr >= from && dateToStr <= to) {
      included.push(row)
    }
  }

  let totalSpend = 0
  for (const row of included) {
    totalSpend += Number(row.spend || 0)
  }

  console.log('--- DASHBOARD VERIFICATION ---')
  console.log(`Campaigns Count: ${campaigns.length}`)
  console.log(`Raw Performances Found: ${rawPerformances.length}`)
  console.log(`Included Performances (Strict Containment): ${included.length}`)
  console.log(`Total Spend: ${totalSpend}`)

  if (totalSpend === 0) {
    console.error('❌ BUG CAUGHT: Total Spend is 0')
  } else {
    console.log('✅ Spend is > 0')
  }

  // Visual Verification of Seed Data
  console.log('\n--- CAMPAIGNS ---')
  for (const c of campaigns) {
    const cRows = included.filter(r => r.campaignId === c.campaignId)
    const cSpend = cRows.reduce((sum, r) => sum + Number(r.spend || 0), 0)
    console.log(`[${c.name}] Spend: ${cSpend}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
