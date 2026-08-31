import prisma from '../app/lib/db'
import { buildDedupeKey } from './adsMetrics'
import { toDateString } from './adsAggregate'

async function run() {
  console.log("Running DedupeKey dry run...")
  
  const perfs = await prisma.adPerformance.findMany({
    include: { campaign: true }
  })
  
  const explicitTestDate = new Date('2026-08-31T00:00:00Z');
  console.log(`Explicit Date test (2026-08-31T00:00:00Z) -> toDateString: ${toDateString(explicitTestDate)}`);

  let mismatchCount = 0;

  for (const perf of perfs) {
    const expectedKey = buildDedupeKey({
      dateFrom: toDateString(perf.dateFrom),
      dateTo: toDateString(perf.dateTo),
      channelId: perf.campaign.channelId || '', // Depending on how channelId is populated
      campaignId: perf.campaignId,
      adSetId: perf.adSetId,
      adId: perf.adId
    })

    if (perf.dedupeKey !== expectedKey) {
      console.log(`Mismatch found! ID: ${perf.id}`)
      console.log(`  Current:  ${perf.dedupeKey}`)
      console.log(`  Expected: ${expectedKey}`)
      mismatchCount++
    }
  }

  console.log(`\nTotal mismatches: ${mismatchCount} out of ${perfs.length}`)
  
  if (process.argv.includes('--fix')) {
    console.log("Fixing...")
    // In a real script, you'd fix them here
  }
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
