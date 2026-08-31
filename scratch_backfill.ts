import prisma from './src/app/lib/db'

// Copy the exact same buildDedupeKey function used in the app
function buildDedupeKey(params: {
  dateFrom: string;
  dateTo: string;
  channelId: string;
  campaignId: string;
  adSetId?: string | null;
  adId?: string | null;
}) {
  const parts = [
    params.dateFrom,
    params.dateTo,
    params.channelId,
    params.campaignId,
  ]
  if (params.adSetId) parts.push(params.adSetId)
  if (params.adId) parts.push(params.adId)

  return parts.join('|')
}

// Same as in adsAggregate.ts
function toDateString(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function main() {
  const mode = process.argv[2] || 'dry-run'
  console.log(`Running in ${mode} mode...`)

  const rows = await prisma.adPerformance.findMany({
    include: { campaign: true }
  })
  console.log(`Found ${rows.length} rows.`)

  let changedCount = 0
  let skippedCount = 0
  const collisions = []
  
  // Track keys to find collisions within the new format
  const newKeyMap = new Map<string, string>() // newKey -> oldId

  for (const row of rows) {
    const oldKey = row.dedupeKey
    const newKey = buildDedupeKey({
      dateFrom: toDateString(row.dateFrom),
      dateTo: toDateString(row.dateTo),
      channelId: row.campaign.channelId,
      campaignId: row.campaignId,
      adSetId: row.adSetId,
      adId: row.adId
    })

    if (oldKey !== newKey) {
      changedCount++
      console.log(`Row ${row.id}: ${oldKey} -> ${newKey}`)
      
      // Check collision
      if (newKeyMap.has(newKey)) {
        collisions.push({
          newKey,
          row1: newKeyMap.get(newKey),
          row2: row.id
        })
      } else {
        newKeyMap.set(newKey, row.id)
      }

      if (mode === 'commit') {
        try {
          await prisma.adPerformance.update({
            where: { id: row.id },
            data: { dedupeKey: newKey }
          })
        } catch (e: any) {
          console.error(`Error updating row ${row.id}: ${e.message}`)
        }
      }
    } else {
      skippedCount++
    }
  }

  console.log(`\nSummary:`)
  console.log(`Changed rows: ${changedCount}`)
  console.log(`Unchanged rows: ${skippedCount}`)
  console.log(`Collisions found: ${collisions.length}`)
  if (collisions.length > 0) {
    console.log(collisions)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
