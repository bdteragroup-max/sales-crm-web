'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'
import { buildDedupeKey } from '@/lib/adsMetrics'
import fs from 'fs'
import path from 'path'

export interface PerformanceSnapshot {
  id: string
  snapshotId: string
  entityType?: 'CAMPAIGN' | 'AD_SET' | 'AD'
  entityId?: string
  version?: number
  adId?: string
  adName?: string
  campaignId: string
  campaignName?: string
  adSetId?: string
  adSetName?: string
  creativeId?: string
  creativeFile?: string
  creativeVersion?: string
  creativeUrl?: string
  periodStart?: string
  periodEnd?: string
  capturedAt: string
  updateMode: string
  spend: number
  messageInbox: number
  reach: number
  impressions: number
  clicks: number
  previousSpend?: number
  previousMessageInbox?: number
  previousReach?: number
  previousImpressions?: number
  previousClicks?: number
  source?: string
  importJobId?: string
  dataSource: string
  notes?: string
  enteredBy: string
  updateType?: 'Regular Update' | 'Correction'
  correctionReason?: string | null
  status: 'SAVED' | 'DRAFT'
  createdAt: string
}

export interface ActiveAdPerformanceItem {
  adId: string
  adName: string
  adSetId: string
  adSetName: string
  campaignId: string
  campaignName: string
  channel: string
  productCategory: string
  plannedBudget: number
  status: 'Active' | 'Paused' | 'Archived' | 'Draft'
  format: 'Image' | 'Video' | 'Carousel'
  creativeFile: string
  creativeVersion: string
  creativeUrl: string
  thumbnailUrl: string
  // Latest Snapshot Data
  latestSnapshot: PerformanceSnapshot | null
  // Previous Snapshot Data (for calculating changes)
  previousSnapshot: PerformanceSnapshot | null
  // Calculated Metrics
  spend: number
  messageInbox: number
  reach: number
  impressions: number
  clicks: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  costPerResult: number | null
  lastUpdated: string
  // Changes
  deltaSpend: number
  deltaInbox: number
  deltaReach: number
  deltaImpressions: number
  deltaClicks: number
  changePercent: number | null
  budgetStrategy?: 'ABO' | 'CBO'
  adSetSpendShare?: number
  allocatedBudget?: number | null
}

const LOCAL_SNAPSHOTS_PATH = path.join(process.cwd(), 'data', 'ad_performance_snapshots.json')

function readLocalSnapshots(): PerformanceSnapshot[] {
  try {
    if (fs.existsSync(LOCAL_SNAPSHOTS_PATH)) {
      const data = fs.readFileSync(LOCAL_SNAPSHOTS_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Error reading local snapshots:', e)
  }
  return []
}

function writeLocalSnapshots(items: PerformanceSnapshot[]) {
  try {
    const dir = path.dirname(LOCAL_SNAPSHOTS_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(LOCAL_SNAPSHOTS_PATH, JSON.stringify(items, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing local snapshots:', e)
  }
}

let isSnapshotsTableReady = false
async function ensurePerformanceSnapshotsTable() {
  if (isSnapshotsTableReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ad_performance_snapshots" (
        "id" TEXT PRIMARY KEY,
        "snapshotId" TEXT UNIQUE NOT NULL,
        "entityType" TEXT NOT NULL DEFAULT 'AD',
        "entityId" TEXT,
        "version" INTEGER NOT NULL DEFAULT 1,
        "adId" TEXT,
        "campaignId" TEXT NOT NULL,
        "adSetId" TEXT,
        "creativeId" TEXT,
        "creativeFile" TEXT,
        "creativeVersion" TEXT,
        "creativeUrl" TEXT,
        "periodStart" DATE,
        "periodEnd" DATE,
        "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updateMode" TEXT DEFAULT 'CUMULATIVE_SNAPSHOT',
        "spend" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        "messageInbox" INTEGER DEFAULT 0,
        "reach" INTEGER DEFAULT 0,
        "impressions" INTEGER DEFAULT 0,
        "clicks" INTEGER DEFAULT 0,
        "previousSpend" DECIMAL(12, 2) DEFAULT 0,
        "previousMessageInbox" INTEGER DEFAULT 0,
        "previousReach" INTEGER DEFAULT 0,
        "previousImpressions" INTEGER DEFAULT 0,
        "previousClicks" INTEGER DEFAULT 0,
        "source" TEXT DEFAULT 'Manual',
        "importJobId" TEXT,
        "dataSource" TEXT DEFAULT 'Ads Manager',
        "notes" TEXT,
        "enteredBy" TEXT,
        "updateType" TEXT DEFAULT 'Regular Update',
        "correctionReason" TEXT,
        "status" TEXT DEFAULT 'SAVED',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE "ad_performance_snapshots" 
        ALTER COLUMN "adId" DROP NOT NULL,
        ALTER COLUMN "adSetId" DROP NOT NULL;

      ALTER TABLE "ad_performance_snapshots"
        ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT 'AD',
        ADD COLUMN IF NOT EXISTS "entityId" TEXT,
        ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "previousSpend" DECIMAL(12, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "previousMessageInbox" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "previousReach" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "previousImpressions" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "previousClicks" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'Manual',
        ADD COLUMN IF NOT EXISTS "importJobId" TEXT;

      CREATE INDEX IF NOT EXISTS "idx_ad_perf_snaps_entity" ON "ad_performance_snapshots"("entityType", "entityId");
      CREATE INDEX IF NOT EXISTS "idx_ad_perf_snaps_ad" ON "ad_performance_snapshots"("adId");
      CREATE INDEX IF NOT EXISTS "idx_ad_perf_snaps_camp" ON "ad_performance_snapshots"("campaignId");
      CREATE INDEX IF NOT EXISTS "idx_ad_perf_snaps_date" ON "ad_performance_snapshots"("capturedAt" DESC);

      CREATE TABLE IF NOT EXISTS "ad_import_jobs" (
        "id" TEXT PRIMARY KEY,
        "jobId" TEXT UNIQUE NOT NULL,
        "filename" TEXT NOT NULL,
        "fileType" TEXT NOT NULL,
        "fileHash" TEXT,
        "totalRows" INTEGER NOT NULL DEFAULT 0,
        "importedRows" INTEGER NOT NULL DEFAULT 0,
        "skippedRows" INTEGER NOT NULL DEFAULT 0,
        "errorCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'COMPLETED',
        "enteredBy" TEXT,
        "details" JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "idx_ad_import_jobs_date" ON "ad_import_jobs"("createdAt" DESC);
    `)
    isSnapshotsTableReady = true
  } catch (err) {
    console.error('ensurePerformanceSnapshotsTable warning:', err)
  }
}

// Default Seed Snapshots matching user mockup
const DEFAULT_DEMO_SNAPSHOTS: PerformanceSnapshot[] = [
  {
    id: 'snp_001_prev',
    snapshotId: 'SNP-20260830-001',
    adId: 'AD-SP-001',
    adName: 'Water Strong V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-001',
    adSetName: '01 Agriculture Broad',
    creativeId: 'CR-SP-001',
    creativeFile: 'SP_WaterStrong_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-30',
    capturedAt: '2026-08-30T16:00:00Z',
    updateMode: 'CUMULATIVE_SNAPSHOT',
    spend: 62700,
    messageInbox: 1140,
    reach: 125900,
    impressions: 312000,
    clicks: 8425,
    dataSource: 'Ads Manager',
    notes: 'Initial strong performance.',
    enteredBy: 'Marketing Lead',
    updateType: 'Regular Update',
    correctionReason: null,
    status: 'SAVED',
    createdAt: '2026-08-30T16:00:00Z'
  },
  {
    id: 'snp_001_latest',
    snapshotId: 'SNP-20260831-001',
    adId: 'AD-SP-001',
    adName: 'Water Strong V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-001',
    adSetName: '01 Agriculture Broad',
    creativeId: 'CR-SP-001',
    creativeFile: 'SP_WaterStrong_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    capturedAt: '2026-08-31T16:30:00Z',
    updateMode: 'CUMULATIVE_SNAPSHOT',
    spend: 65350,
    messageInbox: 1204,
    reach: 128450,
    impressions: 347680,
    clicks: 9350,
    dataSource: 'Ads Manager',
    notes: 'Strong response after increasing budget.',
    enteredBy: 'Marketing Lead',
    updateType: 'Regular Update',
    correctionReason: null,
    status: 'SAVED',
    createdAt: '2026-08-31T16:30:00Z'
  },
  {
    id: 'snp_002_latest',
    snapshotId: 'SNP-20260831-002',
    adId: 'AD-SP-002',
    adName: 'No Electricity V2',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-001',
    adSetName: '01 Agriculture Broad',
    creativeId: 'CR-SP-002',
    creativeFile: 'SP_NoElectricity_V2.mp4',
    creativeVersion: 'V2',
    creativeUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    capturedAt: '2026-08-31T16:20:00Z',
    updateMode: 'CUMULATIVE_SNAPSHOT',
    spend: 32480,
    messageInbox: 685,
    reach: 84900,
    impressions: 203250,
    clicks: 5840,
    dataSource: 'Ads Manager',
    notes: 'Video retention higher than average.',
    enteredBy: 'Marketing Lead',
    updateType: 'Regular Update',
    correctionReason: null,
    status: 'SAVED',
    createdAt: '2026-08-31T16:20:00Z'
  },
  {
    id: 'snp_003_latest',
    snapshotId: 'SNP-20260831-003',
    adId: 'AD-SP-003',
    adName: 'Installation Review V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-003',
    adSetName: '03 Retargeting',
    creativeId: 'CR-SP-003',
    creativeFile: 'SP_Installation_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_Installation_V1.jpg',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    capturedAt: '2026-08-31T15:50:00Z',
    updateMode: 'CUMULATIVE_SNAPSHOT',
    spend: 18900,
    messageInbox: 498,
    reach: 42600,
    impressions: 108900,
    clicks: 3750,
    dataSource: 'Ads Manager',
    notes: 'Retargeting high intent customers.',
    enteredBy: 'Marketing Lead',
    updateType: 'Regular Update',
    correctionReason: null,
    status: 'SAVED',
    createdAt: '2026-08-31T15:50:00Z'
  },
  {
    id: 'snp_004_latest',
    snapshotId: 'SNP-20260831-004',
    adId: 'AD-SP-004',
    adName: 'Compare Electricity V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-002',
    adSetName: '02 Cost Reduction Focus',
    creativeId: 'CR-SP-004',
    creativeFile: 'SP_Compare_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_Compare_V1.jpg',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    capturedAt: '2026-08-31T14:10:00Z',
    updateMode: 'CUMULATIVE_SNAPSHOT',
    spend: 15200,
    messageInbox: 340,
    reach: 38500,
    impressions: 92400,
    clicks: 2980,
    dataSource: 'Ads Manager',
    notes: 'Focus on monthly saving calculation.',
    enteredBy: 'Marketing Lead',
    updateType: 'Regular Update',
    correctionReason: null,
    status: 'SAVED',
    createdAt: '2026-08-31T14:10:00Z'
  },
  {
    id: 'snp_005_latest',
    snapshotId: 'SNP-20260831-005',
    adId: 'AD-SP-005',
    adName: 'Customer Testimonial V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-003',
    adSetName: '03 Retargeting',
    creativeId: 'CR-SP-005',
    creativeFile: 'SP_Testimonial_V1.mp4',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_Testimonial_V1.mp4',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    capturedAt: '2026-08-31T13:40:00Z',
    updateMode: 'CUMULATIVE_SNAPSHOT',
    spend: 9850,
    messageInbox: 210,
    reach: 24800,
    impressions: 64500,
    clicks: 1920,
    dataSource: 'Ads Manager',
    notes: 'Real farmer user interview in Chiang Mai.',
    enteredBy: 'Marketing Lead',
    updateType: 'Regular Update',
    correctionReason: null,
    status: 'SAVED',
    createdAt: '2026-08-31T13:40:00Z'
  }
]

/**
 * Fetch all Active Ads with their latest performance snapshots and deltas
 */
export async function getActiveAdsWithPerformance(filters?: {
  channel?: string
  campaignId?: string
  adSetId?: string
  status?: string
  search?: string
}) {
  try {
    await ensurePerformanceSnapshotsTable()

    // 1. Fetch campaigns with targetAudience (which contains adSets and ads)
    const campaigns = await prisma.adCampaign.findMany({
      where: { deletedAt: null },
      include: {
        channel: true,
        objective: true,
        product: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // 2. Fetch all snapshots from DB (with local fallback)
    let dbSnapshots: any[] = []
    try {
      dbSnapshots = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "ad_performance_snapshots" ORDER BY "capturedAt" DESC
      `)
    } catch (e) {
      console.warn('Could not query ad_performance_snapshots from Postgres, using local store:', e)
    }

    let allSnapshots: PerformanceSnapshot[] = []
    if (dbSnapshots && dbSnapshots.length > 0) {
      allSnapshots = dbSnapshots.map(s => ({
        id: s.id,
        snapshotId: s.snapshotId,
        entityType: s.entityType || (s.adId ? 'AD' : (s.adSetId ? 'AD_SET' : 'CAMPAIGN')),
        entityId: s.entityId || s.adId || s.adSetId || s.campaignId,
        version: Number(s.version || 1),
        adId: s.adId || '',
        adName: s.adName || '',
        campaignId: s.campaignId,
        campaignName: s.campaignName || '',
        adSetId: s.adSetId || '',
        adSetName: s.adSetName || '',
        creativeId: s.creativeId || '',
        creativeFile: s.creativeFile || '',
        creativeVersion: s.creativeVersion || 'V1',
        creativeUrl: s.creativeUrl || '',
        periodStart: s.periodStart ? new Date(s.periodStart).toISOString().split('T')[0] : '',
        periodEnd: s.periodEnd ? new Date(s.periodEnd).toISOString().split('T')[0] : '',
        capturedAt: s.capturedAt ? new Date(s.capturedAt).toISOString() : new Date().toISOString(),
        updateMode: s.updateMode || 'CUMULATIVE_SNAPSHOT',
        spend: Number(s.spend || 0),
        messageInbox: Number(s.messageInbox || 0),
        reach: Number(s.reach || 0),
        impressions: Number(s.impressions || 0),
        clicks: Number(s.clicks || 0),
        previousSpend: Number(s.previousSpend || 0),
        previousMessageInbox: Number(s.previousMessageInbox || 0),
        previousReach: Number(s.previousReach || 0),
        previousImpressions: Number(s.previousImpressions || 0),
        previousClicks: Number(s.previousClicks || 0),
        source: s.source || 'Manual',
        importJobId: s.importJobId || undefined,
        dataSource: s.dataSource || 'Ads Manager',
        notes: s.notes || '',
        enteredBy: s.enteredBy || 'System',
        updateType: s.updateType || 'Regular Update',
        correctionReason: s.correctionReason || null,
        status: s.status || 'SAVED',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString()
      }))
    } else {
      const local = readLocalSnapshots()
      if (local.length > 0) {
        allSnapshots = local
      } else {
        allSnapshots = DEFAULT_DEMO_SNAPSHOTS
        writeLocalSnapshots(DEFAULT_DEMO_SNAPSHOTS)
      }
    }

    function normalizeAdStatus(rawStatus?: string): 'Active' | 'Paused' | 'Archived' | 'Draft' {
      const s = (rawStatus || '').toLowerCase().trim()
      if (s === 'active') return 'Active'
      if (s === 'paused') return 'Paused'
      if (s === 'archived') return 'Archived'
      if (s === 'draft') return 'Draft'
      return 'Active'
    }

    // Index snapshots by adId and by compound key `${campaignId}_${adId}` (sorted desc by capturedAt)
    const snapshotsByAd: Record<string, PerformanceSnapshot[]> = {}
    allSnapshots.forEach(snap => {
      const adId = snap.adId || (snap.entityType === 'AD' ? snap.entityId : '') || ''
      if (adId) {
        const compoundKey = `${snap.campaignId}_${adId}`
        if (!snapshotsByAd[compoundKey]) snapshotsByAd[compoundKey] = []
        snapshotsByAd[compoundKey].push(snap)

        if (!snapshotsByAd[adId]) snapshotsByAd[adId] = []
        snapshotsByAd[adId].push(snap)
      }
    })
    Object.keys(snapshotsByAd).forEach(key => {
      snapshotsByAd[key].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    })

    // 3. Extract ads from Campaign Setup targetAudience structures
    const extractedAds: ActiveAdPerformanceItem[] = []

    for (const camp of campaigns) {
      let adSets: any[] = []
      let campStrategy: 'ABO' | 'CBO' = ((camp as any).budgetStrategy || (camp as any).budget_strategy || 'ABO').toUpperCase().includes('CBO') ? 'CBO' : 'ABO'
      try {
        if (camp.targetAudience && camp.targetAudience.startsWith('{')) {
          const parsed = JSON.parse(camp.targetAudience)
          if (parsed.budgetStrategy) {
            campStrategy = parsed.budgetStrategy.toUpperCase().includes('CBO') ? 'CBO' : 'ABO'
          }
          if (Array.isArray(parsed.adSets)) adSets = parsed.adSets
        }
      } catch { }

      const plannedBudget = camp.budget ? Number(camp.budget) : 0
      const channelName = camp.channel?.name || 'Facebook'
      const productCat = camp.productCategory || ((camp.product as any)?.product_name || (camp.product as any)?.name) || 'Solar Pump'

      // If campaign has no adSets in JSON, synthesize a default one so it is visible in Performance, CRM and Dashboard
      if (adSets.length === 0) {
        adSets = [{
          id: `AS-${camp.campaignId || camp.id}-01`,
          code: `AS-${camp.campaignId || camp.id}-01`,
          name: `${camp.name} - ชุดโฆษณา 01`,
          ads: [{
            id: `AD-${camp.campaignId || camp.id}-01`,
            code: `AD-${camp.campaignId || camp.id}-01`,
            name: `${camp.name} - โฆษณา 01`,
            format: 'Image',
            creativeFile: 'SP_WaterStrong_V1.jpg',
            creativeVersion: 'V1',
            status: camp.status || 'Active'
          }]
        }]
      }

      for (const set of adSets) {
        let adsList = Array.isArray(set.ads) ? set.ads : []
        if (adsList.length === 0) {
          adsList = [{
            id: `AD-${set.code || set.id || camp.campaignId}-01`,
            code: `AD-${set.code || set.id || camp.campaignId}-01`,
            name: `${set.name || camp.name} - โฆษณา 01`,
            format: 'Image',
            creativeFile: 'SP_WaterStrong_V1.jpg',
            creativeVersion: 'V1',
            status: set.status || 'Active'
          }]
        }
        for (const ad of adsList) {
          const adCode = ad.code || ad.id
          const campKey = camp.campaignId || camp.id
          const compoundKey = `${campKey}_${adCode}`
          const adSnaps = (snapshotsByAd[compoundKey] && snapshotsByAd[compoundKey].length > 0)
            ? snapshotsByAd[compoundKey]
            : (snapshotsByAd[adCode]?.filter(s => s.campaignId === campKey || s.campaignId === camp.id || s.campaignId === camp.campaignId) || [])
          const latest = adSnaps[0] || null
          const previous = adSnaps.length > 1 ? adSnaps[1] : null

          const spend = latest ? latest.spend : 0
          const messageInbox = latest ? latest.messageInbox : 0
          const reach = latest ? latest.reach : 0
          const impressions = latest ? latest.impressions : 0
          const clicks = latest ? latest.clicks : 0

          // Calculate automatic metrics (null when divisor is 0)
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : null
          const cpc = clicks > 0 ? spend / clicks : null
          const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
          const costPerResult = messageInbox > 0 ? spend / messageInbox : null

          // Deltas
          const deltaSpend = previous ? spend - previous.spend : spend
          const deltaInbox = previous ? messageInbox - previous.messageInbox : messageInbox
          const deltaReach = previous ? reach - previous.reach : reach
          const deltaImpressions = previous ? impressions - previous.impressions : impressions
          const deltaClicks = previous ? clicks - previous.clicks : clicks
          const changePercent = (previous && previous.spend > 0)
            ? ((spend - previous.spend) / previous.spend) * 100
            : null

          const creativeFileName = ad.creativeFile || ad.creativeName || (latest ? latest.creativeFile : 'SP_WaterStrong_V1.jpg')
          const creativeVer = ad.creativeVersion || (latest ? latest.creativeVersion : 'V1')
          const creativeUrl = ad.creativeUrl || (latest ? latest.creativeUrl : `/uploads/creatives/${creativeFileName}`)
          const normalizedStatus = normalizeAdStatus(ad.status || set.status || camp.status || 'Active')

          extractedAds.push({
            adId: adCode,
            adName: ad.name || 'Ad',
            adSetId: set.code || set.id || 'AS-01',
            adSetName: set.name || 'Ad Set',
            campaignId: camp.campaignId || camp.id,
            campaignName: camp.name || 'Campaign',
            channel: channelName,
            productCategory: productCat,
            plannedBudget,
            status: normalizedStatus,
            format: ad.format || 'Image',
            creativeFile: creativeFileName,
            creativeVersion: creativeVer,
            creativeUrl,
            thumbnailUrl: (creativeUrl && !creativeUrl.includes('fb.me') && !creativeUrl.includes('adspreview'))
              ? creativeUrl
              : `/uploads/creatives/${creativeFileName}`,
            latestSnapshot: latest,
            previousSnapshot: previous,
            spend,
            messageInbox,
            reach,
            impressions,
            clicks,
            ctr,
            cpc,
            cpm,
            costPerResult,
            lastUpdated: latest ? latest.capturedAt : new Date().toISOString(),
            deltaSpend,
            deltaInbox,
            deltaReach,
            deltaImpressions,
            deltaClicks,
            changePercent,
            budgetStrategy: campStrategy,
            allocatedBudget: campStrategy === 'CBO' ? null : (set.budget ? Number(set.budget) : null)
          })
        }
      }
    }

    // Calculate campaign spend totals and ad set spend totals for spend share
    const campSpendTotal: Record<string, number> = {}
    const adSetSpendTotal: Record<string, number> = {}
    extractedAds.forEach(a => {
      campSpendTotal[a.campaignId] = (campSpendTotal[a.campaignId] || 0) + (a.spend || 0)
      const setKey = `${a.campaignId}_${a.adSetId}`
      adSetSpendTotal[setKey] = (adSetSpendTotal[setKey] || 0) + (a.spend || 0)
    })

    extractedAds.forEach(a => {
      const campTotal = campSpendTotal[a.campaignId] || 0
      const setKey = `${a.campaignId}_${a.adSetId}`
      const setTotal = adSetSpendTotal[setKey] || 0
      a.adSetSpendShare = campTotal > 0 ? (setTotal / campTotal) * 100 : 0
    })

    // Include baseline demo snapshots only if there are no campaigns in the database
    const hasRealCampaigns = campaigns.length > 0
    const hasDemoCampaign = extractedAds.some(a => a.campaignId === 'CMP-202608-SP-001')
    if (!hasDemoCampaign && !hasRealCampaigns) {
      DEFAULT_DEMO_SNAPSHOTS.filter(s => s.id.includes('latest')).forEach(s => {
        const adId = s.adId || ''
        const adSnaps = snapshotsByAd[adId] || [s]
        const latest = adSnaps[0] || s
        const previous = adSnaps.length > 1 ? adSnaps[1] : null

        const spend = latest.spend
        const messageInbox = latest.messageInbox
        const reach = latest.reach
        const impressions = latest.impressions
        const clicks = latest.clicks

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : null
        const cpc = clicks > 0 ? spend / clicks : null
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
        const costPerResult = messageInbox > 0 ? spend / messageInbox : null

        const deltaSpend = previous ? spend - previous.spend : (adId === 'AD-SP-001' ? 2650 : spend)
        const deltaInbox = previous ? messageInbox - previous.messageInbox : (adId === 'AD-SP-001' ? 64 : messageInbox)
        const deltaReach = previous ? reach - previous.reach : (adId === 'AD-SP-001' ? 2550 : reach)
        const deltaImpressions = previous ? impressions - previous.impressions : (adId === 'AD-SP-001' ? 35680 : impressions)
        const deltaClicks = previous ? clicks - previous.clicks : (adId === 'AD-SP-001' ? 925 : clicks)
        const changePercent = previous && previous.spend > 0
          ? ((spend - previous.spend) / previous.spend) * 100
          : (adId === 'AD-SP-001' ? 4.2 : null)

        extractedAds.push({
          adId,
          adName: s.adName || 'Ad',
          adSetId: s.adSetId || '',
          adSetName: s.adSetName || 'Ad Set',
          campaignId: s.campaignId,
          campaignName: s.campaignName || 'Campaign',
          channel: 'Facebook',
          productCategory: 'Solar Pump',
          plannedBudget: 110000,
          status: 'Active',
          format: s.creativeFile?.endsWith('.mp4') ? 'Video' : 'Image',
          creativeFile: s.creativeFile || 'SP_WaterStrong_V1.jpg',
          creativeVersion: s.creativeVersion || 'V1',
          creativeUrl: s.creativeUrl || `/uploads/creatives/${s.creativeFile}`,
          thumbnailUrl: s.creativeUrl || `/uploads/creatives/${s.creativeFile}`,
          latestSnapshot: latest,
          previousSnapshot: previous,
          spend,
          messageInbox,
          reach,
          impressions,
          clicks,
          ctr,
          cpc,
          cpm,
          costPerResult,
          lastUpdated: latest.capturedAt,
          deltaSpend,
          deltaInbox,
          deltaReach,
          deltaImpressions,
          deltaClicks,
          changePercent
        })
      })
    }

    return {
      success: true,
      ads: extractedAds,
      snapshots: allSnapshots
    }
  } catch (error: any) {
    console.error('getActiveAdsWithPerformance error:', error)
    return {
      success: false,
      error: error.message,
      ads: [],
      snapshots: []
    }
  }
}

/**
 * Save a new Performance Snapshot (Immutable, creates a new row every time)
 */
/**
 * Save a new Performance Snapshot (Immutable, creates a new version every time)
 */
export async function savePerformanceSnapshot(payload: {
  entityType?: 'CAMPAIGN' | 'AD_SET' | 'AD'
  entityId?: string
  adId?: string
  campaignId: string
  adSetId?: string
  creativeId?: string
  creativeFile?: string
  creativeVersion?: string
  creativeUrl?: string
  periodStart?: string
  periodEnd?: string
  capturedAt?: string
  updateMode?: string
  spend: number
  messageInbox: number
  reach: number
  impressions: number
  clicks: number
  source?: 'Manual' | 'Mass Upload' | 'API'
  importJobId?: string
  dataSource?: string
  notes?: string
  enteredBy?: string
  updateType?: 'Regular Update' | 'Correction'
  correctionReason?: string | null
  status?: 'SAVED' | 'DRAFT'
}): Promise<{ success: boolean; snapshot?: PerformanceSnapshot; error?: string }> {
  try {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    await ensurePerformanceSnapshotsTable()

    // Determine entityType and entityId
    const effectiveEntityType: 'CAMPAIGN' | 'AD_SET' | 'AD' = payload.entityType || (payload.adId ? 'AD' : (payload.adSetId ? 'AD_SET' : 'CAMPAIGN'))
    const effectiveEntityId = payload.entityId || (effectiveEntityType === 'AD' ? payload.adId : (effectiveEntityType === 'AD_SET' ? payload.adSetId : payload.campaignId)) || ''

    // Query previous snapshot for this entity to get previous metrics and version
    let previous: any = null
    try {
      const existing = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "ad_performance_snapshots" 
        WHERE ("entityType" = $1 AND "entityId" = $2)
           OR ($1 = 'AD' AND "adId" = $2)
           OR ($1 = 'AD_SET' AND "adSetId" = $2)
           OR ($1 = 'CAMPAIGN' AND "campaignId" = $2 AND ("entityType" = 'CAMPAIGN' OR ("adId" IS NULL AND "adSetId" IS NULL)))
        ORDER BY "capturedAt" DESC, "createdAt" DESC 
        LIMIT 1
      `, effectiveEntityType, effectiveEntityId)
      if (existing && existing.length > 0) previous = existing[0]
    } catch (e) {
      const local = readLocalSnapshots().filter(s =>
        (s.entityType === effectiveEntityType && s.entityId === effectiveEntityId) ||
        (effectiveEntityType === 'AD' && s.adId === effectiveEntityId) ||
        (effectiveEntityType === 'AD_SET' && s.adSetId === effectiveEntityId) ||
        (effectiveEntityType === 'CAMPAIGN' && s.campaignId === effectiveEntityId)
      )
      if (local.length > 0) previous = local[0]
    }

    const prevSpend = previous ? Number(previous.spend || 0) : 0
    const prevInbox = previous ? Number(previous.messageInbox || 0) : 0
    const prevReach = previous ? Number(previous.reach || 0) : 0
    const prevImp = previous ? Number(previous.impressions || 0) : 0
    const prevClicks = previous ? Number(previous.clicks || 0) : 0
    const nextVersion = previous ? (Number(previous.version || 1) + 1) : 1

    const now = new Date()
    const dateKey = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSeq = String(Math.floor(Math.random() * 9000) + 1000)
    const snapshotId = `SNP-${dateKey}-${randomSeq}`
    const id = `snp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const newSnapshot: PerformanceSnapshot = {
      id,
      snapshotId,
      entityType: effectiveEntityType,
      entityId: effectiveEntityId,
      version: nextVersion,
      adId: payload.adId || (effectiveEntityType === 'AD' ? effectiveEntityId : undefined),
      campaignId: payload.campaignId,
      adSetId: payload.adSetId || (effectiveEntityType === 'AD_SET' ? effectiveEntityId : undefined),
      creativeId: payload.creativeId || '',
      creativeFile: payload.creativeFile || '',
      creativeVersion: payload.creativeVersion || 'V1',
      creativeUrl: payload.creativeUrl || '',
      periodStart: payload.periodStart || undefined,
      periodEnd: payload.periodEnd || undefined,
      capturedAt: payload.capturedAt || now.toISOString(),
      updateMode: payload.updateMode || 'CUMULATIVE_SNAPSHOT',
      spend: Number(payload.spend || 0),
      messageInbox: Number(payload.messageInbox || 0),
      reach: Number(payload.reach || 0),
      impressions: Number(payload.impressions || 0),
      clicks: Number(payload.clicks || 0),
      previousSpend: prevSpend,
      previousMessageInbox: prevInbox,
      previousReach: prevReach,
      previousImpressions: prevImp,
      previousClicks: prevClicks,
      source: payload.source || 'Manual',
      importJobId: payload.importJobId || undefined,
      dataSource: payload.dataSource || 'Ads Manager',
      notes: payload.notes || '',
      enteredBy: payload.enteredBy || (user as any).fullName || user.email || 'Marketing Editor',
      updateType: payload.updateType || 'Regular Update',
      correctionReason: payload.correctionReason || null,
      status: payload.status || 'SAVED',
      createdAt: now.toISOString()
    }

    // Insert to PostgreSQL
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "ad_performance_snapshots" (
          "id", "snapshotId", "entityType", "entityId", "version", "adId", "campaignId", "adSetId", "creativeId", "creativeFile",
          "creativeVersion", "creativeUrl", "periodStart", "periodEnd", "capturedAt",
          "updateMode", "spend", "messageInbox", "reach", "impressions", "clicks",
          "previousSpend", "previousMessageInbox", "previousReach", "previousImpressions", "previousClicks",
          "source", "importJobId", "dataSource", "notes", "enteredBy", "updateType", "correctionReason", "status", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13::date, $14::date, $15::timestamptz,
          $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33, $34, $35::timestamptz
        )
      `,
        newSnapshot.id,
        newSnapshot.snapshotId,
        newSnapshot.entityType,
        newSnapshot.entityId,
        newSnapshot.version,
        newSnapshot.adId || null,
        newSnapshot.campaignId,
        newSnapshot.adSetId || null,
        newSnapshot.creativeId || null,
        newSnapshot.creativeFile || null,
        newSnapshot.creativeVersion || null,
        newSnapshot.creativeUrl || null,
        newSnapshot.periodStart || null,
        newSnapshot.periodEnd || null,
        newSnapshot.capturedAt,
        newSnapshot.updateMode,
        newSnapshot.spend,
        newSnapshot.messageInbox,
        newSnapshot.reach,
        newSnapshot.impressions,
        newSnapshot.clicks,
        newSnapshot.previousSpend,
        newSnapshot.previousMessageInbox,
        newSnapshot.previousReach,
        newSnapshot.previousImpressions,
        newSnapshot.previousClicks,
        newSnapshot.source,
        newSnapshot.importJobId || null,
        newSnapshot.dataSource,
        newSnapshot.notes || null,
        newSnapshot.enteredBy,
        newSnapshot.updateType,
        newSnapshot.correctionReason || null,
        newSnapshot.status,
        newSnapshot.createdAt
      )
    } catch (e) {
      console.warn('Postgres insert failed for ad_performance_snapshots, writing local fallback:', e)
    }

    // Sync to local file storage for reliability
    const currentLocal = readLocalSnapshots()
    writeLocalSnapshots([newSnapshot, ...currentLocal])

    revalidatePath('/marketing/ads/performance')
    revalidatePath('/marketing/ads/campaigns')
    revalidatePath('/marketing/ads/dashboard')

    return { success: true, snapshot: newSnapshot }
  } catch (error: any) {
    console.error('savePerformanceSnapshot error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Bulk save performance updates for multiple ads
 */
export async function saveBulkPerformanceSnapshots(updates: Array<{
  adId: string
  campaignId: string
  adSetId: string
  creativeFile?: string
  creativeVersion?: string
  capturedAt?: string
  spend: number
  messageInbox: number
  reach: number
  impressions: number
  clicks: number
  notes?: string
}>): Promise<{ success: boolean; count: number; snapshots: PerformanceSnapshot[]; error?: string }> {
  try {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    const results: PerformanceSnapshot[] = []
    for (const item of updates) {
      const res = await savePerformanceSnapshot({
        entityType: 'AD',
        entityId: item.adId,
        adId: item.adId,
        campaignId: item.campaignId,
        adSetId: item.adSetId,
        creativeFile: item.creativeFile,
        creativeVersion: item.creativeVersion,
        capturedAt: item.capturedAt,
        spend: item.spend,
        messageInbox: item.messageInbox,
        reach: item.reach,
        impressions: item.impressions,
        clicks: item.clicks,
        notes: item.notes,
        updateType: 'Regular Update',
        status: 'SAVED'
      })
      if (res.success && res.snapshot) {
        results.push(res.snapshot)
      }
    }

    revalidatePath('/marketing/ads/performance')
    revalidatePath('/marketing/ads/dashboard')
    return { success: true, count: results.length, snapshots: results }
  } catch (error: any) {
    console.error('saveBulkPerformanceSnapshots error:', error)
    return { success: false, count: 0, snapshots: [], error: error.message }
  }
}

/**
 * Get full chronological history of snapshots for an entity (Campaign, Ad Set, or Ad)
 */
export async function getEntitySnapshotHistory(
  entityType: 'CAMPAIGN' | 'AD_SET' | 'AD',
  entityId: string
): Promise<{ success: boolean; history: PerformanceSnapshot[]; error?: string }> {
  try {
    await ensurePerformanceSnapshotsTable()
    let dbHistory: any[] = []
    try {
      dbHistory = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "ad_performance_snapshots"
        WHERE ("entityType" = $1 AND "entityId" = $2)
           OR ($1 = 'AD' AND "adId" = $2)
           OR ($1 = 'AD_SET' AND "adSetId" = $2)
           OR ($1 = 'CAMPAIGN' AND "campaignId" = $2)
        ORDER BY "capturedAt" DESC, "createdAt" DESC
      `, entityType, entityId)
    } catch (e) {
      console.warn('Could not query entity history from postgres:', e)
    }

    if (dbHistory && dbHistory.length > 0) {
      return {
        success: true,
        history: dbHistory.map(s => ({
          id: s.id,
          snapshotId: s.snapshotId,
          entityType: s.entityType || entityType,
          entityId: s.entityId || entityId,
          version: Number(s.version || 1),
          adId: s.adId || undefined,
          adName: s.adName || undefined,
          campaignId: s.campaignId,
          campaignName: s.campaignName || undefined,
          adSetId: s.adSetId || undefined,
          adSetName: s.adSetName || undefined,
          creativeFile: s.creativeFile || undefined,
          creativeVersion: s.creativeVersion || 'V1',
          capturedAt: s.capturedAt ? new Date(s.capturedAt).toISOString() : new Date().toISOString(),
          updateMode: s.updateMode || 'CUMULATIVE_SNAPSHOT',
          spend: Number(s.spend || 0),
          messageInbox: Number(s.messageInbox || 0),
          reach: Number(s.reach || 0),
          impressions: Number(s.impressions || 0),
          clicks: Number(s.clicks || 0),
          previousSpend: Number(s.previousSpend || 0),
          previousMessageInbox: Number(s.previousMessageInbox || 0),
          previousReach: Number(s.previousReach || 0),
          previousImpressions: Number(s.previousImpressions || 0),
          previousClicks: Number(s.previousClicks || 0),
          source: s.source || 'Manual',
          importJobId: s.importJobId || undefined,
          dataSource: s.dataSource || 'Ads Manager',
          notes: s.notes || '',
          enteredBy: s.enteredBy || 'System',
          updateType: s.updateType || 'Regular Update',
          correctionReason: s.correctionReason || null,
          status: s.status || 'SAVED',
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString()
        }))
      }
    }

    const localHistory = readLocalSnapshots().filter(s =>
      (s.entityType === entityType && s.entityId === entityId) ||
      (entityType === 'AD' && s.adId === entityId) ||
      (entityType === 'AD_SET' && s.adSetId === entityId) ||
      (entityType === 'CAMPAIGN' && s.campaignId === entityId)
    )
    localHistory.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    return { success: true, history: localHistory }
  } catch (error: any) {
    return { success: false, history: [], error: error.message }
  }
}

/**
 * Backwards compatible alias for single ad history
 */
export async function getAdPerformanceHistory(adId: string) {
  return getEntitySnapshotHistory('AD', adId)
}

/**
 * Get latest cumulative snapshot values for a specific entity
 */
export async function getLatestEntitySnapshot(
  entityType: 'CAMPAIGN' | 'AD_SET' | 'AD',
  entityId: string
): Promise<{ success: boolean; snapshot: PerformanceSnapshot | null; error?: string }> {
  try {
    const res = await getEntitySnapshotHistory(entityType, entityId)
    if (res.success && res.history && res.history.length > 0) {
      return { success: true, snapshot: res.history[0] }
    }
    return { success: true, snapshot: null }
  } catch (error: any) {
    return { success: false, snapshot: null, error: error.message }
  }
}

/**
 * Return master list of Campaigns, Ad Sets, and Ads for template generation and dropdown lookups
 */
export async function getMasterLookupData(): Promise<{
  success: boolean
  campaigns: Array<{ id: string; campaignId: string; name: string; channelName: string; branchName: string; productCategory: string }>
  adSets: Array<{ adSetId: string; name: string; campaignId: string; campaignName: string; branchName: string; productCategory: string }>
  ads: Array<{ adId: string; name: string; adSetId: string; adSetName: string; campaignId: string; campaignName: string; branchName: string; productCategory: string }>
  error?: string
}> {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { deletedAt: null },
      include: {
        channel: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const campaignList: Array<any> = []
    const adSetList: Array<any> = []
    const adList: Array<any> = []

    for (const c of campaigns) {
      const campId = c.campaignId || c.id
      const bName = c.branch?.name || 'ไม่ได้ระบุสาขา'
      const pCat = c.productCategory || 'ไม่ได้ระบุกลุ่มสินค้า'
      campaignList.push({
        id: c.id,
        campaignId: campId,
        name: c.name,
        channelName: c.channel?.name || 'Facebook',
        branchName: bName,
        productCategory: pCat
      })

      let adSets: any[] = []
      try {
        if (c.targetAudience && c.targetAudience.startsWith('{')) {
          const parsed = JSON.parse(c.targetAudience)
          if (Array.isArray(parsed.adSets)) adSets = parsed.adSets
        }
      } catch { }

      if (adSets.length === 0) {
        adSets = [{
          id: `AS-${campId}-01`,
          code: `AS-${campId}-01`,
          name: `${c.name} - ชุดโฆษณา 01`,
          ads: [{
            id: `AD-${campId}-01`,
            code: `AD-${campId}-01`,
            name: `${c.name} - โฆษณา 01`
          }]
        }]
      }

      for (const s of adSets) {
        const sId = s.code || s.id
        const sName = s.name || 'Ad Set'
        adSetList.push({
          adSetId: sId,
          name: sName,
          campaignId: campId,
          campaignName: c.name,
          branchName: s.branchName || bName,
          productCategory: s.productCategory || pCat
        })

        const ads = Array.isArray(s.ads) ? s.ads : []
        for (const a of ads) {
          const aId = a.code || a.id
          adList.push({
            adId: aId,
            name: a.name || 'Ad',
            adSetId: sId,
            adSetName: sName,
            campaignId: campId,
            campaignName: c.name,
            branchName: s.branchName || bName,
            productCategory: s.productCategory || pCat
          })
        }
      }
    }

    return {
      success: true,
      campaigns: campaignList,
      adSets: adSetList,
      ads: adList
    }
  } catch (err: any) {
    console.error('getMasterLookupData error:', err)
    return {
      success: false,
      campaigns: [],
      adSets: [],
      ads: [],
      error: err.message
    }
  }
}

/**
 * Import Mass Performance Snapshots (.xlsx or .csv) with validation, preview, and error report tracking
 */
export async function importMassPerformanceSnapshots(payload: {
  filename: string
  fileType: string
  fileHash?: string
  rows: Array<{
    level?: 'Campaign' | 'AdSet' | 'Ads'
    campaignId: string
    adSetId?: string
    adId?: string
    dataAsOf?: string
    spend: number
    messageInbox: number
    reach: number
    impressions: number
    clicks: number
    notes?: string
  }>
  skipDuplicateCheck?: boolean
}): Promise<{
  success: boolean
  jobId: string
  importedCount: number
  errorCount: number
  skippedCount: number
  error?: string
  errors?: Array<{ row: number; identifier: string; reason: string }>
}> {
  try {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    await ensurePerformanceSnapshotsTable()

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSeq = String(Math.floor(Math.random() * 9000) + 1000)
    const jobId = `IMP-${dateStr}-${randomSeq}`

    const rows = payload.rows || []
    let importedCount = 0
    let errorCount = 0
    let skippedCount = 0
    const rowErrors: Array<{ row: number; identifier: string; reason: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowNum = i + 1
      const effectiveLevel = r.level || (r.adId ? 'Ads' : (r.adSetId ? 'AdSet' : 'Campaign'))
      const entityType: 'CAMPAIGN' | 'AD_SET' | 'AD' = effectiveLevel === 'Campaign' ? 'CAMPAIGN' : (effectiveLevel === 'AdSet' ? 'AD_SET' : 'AD')
      const entityId = entityType === 'AD' ? (r.adId || (r as any).entityId) : (entityType === 'AD_SET' ? (r.adSetId || (r as any).entityId) : (r.campaignId || (r as any).entityId))
      const campaignId = r.campaignId || (entityType === 'CAMPAIGN' ? entityId : '')

      if (!entityId) {
        errorCount++
        rowErrors.push({ row: rowNum, identifier: 'Unknown', reason: 'ขาดรหัสเป้าหมาย (Missing ID)' })
        continue
      }

      if (!campaignId) {
        errorCount++
        rowErrors.push({ row: rowNum, identifier: entityId, reason: 'ขาด Campaign ID' })
        continue
      }

      try {
        const res = await savePerformanceSnapshot({
          entityType,
          entityId,
          campaignId,
          adSetId: r.adSetId,
          adId: r.adId,
          capturedAt: r.dataAsOf ? new Date(r.dataAsOf).toISOString() : now.toISOString(),
          spend: Number(r.spend || 0),
          messageInbox: Number(r.messageInbox || 0),
          reach: Number(r.reach || 0),
          impressions: Number(r.impressions || 0),
          clicks: Number(r.clicks || 0),
          notes: r.notes || '',
          source: 'Mass Upload',
          importJobId: jobId,
          enteredBy: (user as any).fullName || user.email || 'Mass Upload Specialist'
        })

        if (res.success) {
          importedCount++
        } else {
          errorCount++
          rowErrors.push({ row: rowNum, identifier: entityId, reason: res.error || 'Failed to save' })
        }
      } catch (err: any) {
        errorCount++
        rowErrors.push({ row: rowNum, identifier: entityId, reason: err.message || 'Save error' })
      }
    }

    // Record the import job in Postgres
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "ad_import_jobs" (
          "id", "jobId", "filename", "fileType", "fileHash", "totalRows",
          "importedRows", "skippedRows", "errorCount", "status", "enteredBy", "details", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12::jsonb, NOW()
        )
      `,
        `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        jobId,
        payload.filename,
        payload.fileType,
        payload.fileHash || null,
        rows.length,
        importedCount,
        skippedCount,
        errorCount,
        errorCount > 0 && importedCount === 0 ? 'FAILED' : (errorCount > 0 ? 'PARTIAL' : 'COMPLETED'),
        (user as any).fullName || user.email || 'System',
        JSON.stringify({ rowErrors: rowErrors.slice(0, 50) })
      )
    } catch (e) {
      console.warn('Could not record import job in postgres:', e)
    }

    revalidatePath('/marketing/ads/performance')
    revalidatePath('/marketing/ads/dashboard')

    return {
      success: importedCount > 0 || rows.length === 0,
      jobId,
      importedCount,
      errorCount,
      skippedCount,
      errors: rowErrors
    }
  } catch (error: any) {
    console.error('importMassPerformanceSnapshots error:', error)
    return {
      success: false,
      jobId: '',
      importedCount: 0,
      errorCount: payload.rows?.length || 0,
      skippedCount: 0,
      error: error.message
    }
  }
}


export async function createPerformanceEntry(data: {
  campaignId: string
  adSetId?: string | null
  adId?: string | null
  dateFrom: string
  dateTo: string
  spend: number
  impressions?: number | null
  linkClicks?: number | null
  messageInbox?: number | null
  reach?: number | null
  results?: number | null
  resultTypeId?: string | null
}, channelId: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  if (!['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor'].includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to add performance data")
  }

  if (data.results && data.results > 0 && !data.resultTypeId) {
    throw new Error("Result Type is required when there are results.")
  }

  const { toDateString } = await import('@/lib/adsAggregate');
  const dedupeKey = buildDedupeKey({
    dateFrom: toDateString(new Date(data.dateFrom)),
    dateTo: toDateString(new Date(data.dateTo)),
    channelId,
    campaignId: data.campaignId,
    adSetId: data.adSetId,
    adId: data.adId
  })

  const existing = await prisma.adPerformance.findUnique({
    where: { dedupeKey }
  })

  if (existing) {
    return { success: false, duplicate: true, dedupeKey, existingId: existing.id }
  }

  const performance = await prisma.adPerformance.create({
    data: {
      campaignId: data.campaignId,
      adSetId: data.adSetId,
      adId: data.adId,
      dateFrom: new Date(data.dateFrom),
      dateTo: new Date(data.dateTo),
      spend: data.spend,
      impressions: data.impressions,
      linkClicks: data.linkClicks,
      messageInbox: data.messageInbox,
      reach: data.reach,
      results: data.results,
      resultTypeId: data.resultTypeId,
      dedupeKey,
      createdBy: user.id,
    }
  })

  revalidatePath('/marketing/ads/campaigns')
  return { success: true, data: performance }
}

export async function updatePerformanceEntry(id: string, data: Partial<any>) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  if (!['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor'].includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to edit performance data")
  }

  if (data.results && data.results > 0 && !data.resultTypeId) {
    throw new Error("Result Type is required when there are results.")
  }

  const performance = await prisma.adPerformance.update({
    where: { id },
    data: {
      ...data,
      updatedBy: user.id,
    }
  })

  revalidatePath('/marketing/ads/campaigns')
  return { success: true, data: performance }
}

export async function getCRMResultsForCampaign(campaignId: string) {
  const leads = await prisma.marketingLead.findMany({
    where: { adCampaignId: campaignId }, // adCampaignId here is actually the internal ID
    include: { quotation: true },
  })

  return {
    leads: leads.length,
    // Setting qualifiedLeads to null as a placeholder until the business clarifies what 'Qualified' means.
    qualifiedLeads: null,
    closedSales: leads.filter(l => l.quotation?.status === 'WON').length,
    sale: leads.reduce((sum, l) => sum + (l.quotation?.status === 'WON' ? Number(l.quotation.totalAmountBeforeVat || 0) : 0), 0),
  }
}

export async function getDistinctAdSetsAndAds(campaignId: string) {
  const adSets = await prisma.adPerformance.findMany({
    where: { campaignId, adSetId: { not: null } },
    select: { adSetId: true },
    distinct: ['adSetId']
  })
  const ads = await prisma.adPerformance.findMany({
    where: { campaignId, adId: { not: null } },
    select: { adId: true },
    distinct: ['adId']
  })

  return {
    adSets: adSets.map(a => a.adSetId as string),
    ads: ads.map(a => a.adId as string)
  }
}

export async function bulkSavePerformanceEntries(entries: any[], overwrite: boolean = false) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  if (!['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor'].includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to add performance data")
  }

  const { toDateString } = await import('@/lib/adsAggregate');

  // 1. Fetch campaigns for channelId mapping
  const campaignIds = [...new Set(entries.map(e => e.campaignId))]
  const campaigns = await prisma.adCampaign.findMany({
    where: { campaignId: { in: campaignIds } },
    select: { campaignId: true, channelId: true }
  })
  const channelMap = Object.fromEntries(campaigns.map(c => [c.campaignId, c.channelId]))

  // 2. Generate dedupeKeys and prepare data
  const preparedEntries = entries.map(data => {
    if (data.results && data.results > 0 && !data.resultTypeId) {
      throw new Error("Result Type is required when there are results.")
    }
    const channelId = channelMap[data.campaignId]
    if (!channelId) throw new Error(`Campaign ${data.campaignId} not found or missing channel`)

    const dedupeKey = buildDedupeKey({
      dateFrom: toDateString(new Date(data.dateFrom)),
      dateTo: toDateString(new Date(data.dateTo)),
      channelId,
      campaignId: data.campaignId,
      adSetId: data.adSetId || null,
      adId: data.adId || null
    })

    return { ...data, dedupeKey }
  })

  // 3. Check for DB-level conflicts if not overwriting
  if (!overwrite) {
    const dedupeKeys = preparedEntries.map(e => e.dedupeKey)
    const existing = await prisma.adPerformance.findMany({
      where: { dedupeKey: { in: dedupeKeys } },
      select: { dedupeKey: true }
    })
    if (existing.length > 0) {
      return {
        success: false,
        duplicateCount: existing.length,
        message: `${existing.length} duplicate rows found in database.`
      }
    }
  }

  // 4. Perform transaction
  await prisma.$transaction(async (tx) => {
    for (const entry of preparedEntries) {
      const { id, dedupeKey, dateFrom, dateTo, spend, impressions, linkClicks, messageInbox, reach, results, resultTypeId, campaignId, adSetId, adId, note } = entry

      const updateData = {
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        spend, impressions, linkClicks, messageInbox, reach, results, resultTypeId, campaignId,
        adSetId: adSetId || null,
        adId: adId || null,
        note: note || null,
        updatedBy: user.id
      }

      await tx.adPerformance.upsert({
        where: { dedupeKey },
        create: {
          ...updateData,
          dedupeKey,
          createdBy: user.id
        },
        update: updateData
      })
    }
  })

  revalidatePath('/marketing/ads/campaigns')
  return { success: true }
}

export async function deletePerformanceEntry(id: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  if (!['Admin', 'SUPER_ADMIN', 'Marketing Manager'].includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges")
  }

  await prisma.adPerformance.delete({ where: { id } })
  revalidatePath('/marketing/ads/campaigns')
  return { success: true }
}
