'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'
import fs from 'fs'
import path from 'path'
import { getActiveAdsWithPerformance } from './ads-performance'

export interface CrmResultSnapshot {
  id: string
  snapshotId: string // e.g. "SNP-CRM-20260831-001"
  adId: string
  adName?: string
  campaignId: string
  campaignName?: string
  adSetId: string
  adSetName?: string
  creativeId?: string
  creativeFile?: string
  creativeVersion?: string
  creativeUrl?: string
  periodStart?: string
  periodEnd?: string
  capturedAt: string // Datetime string
  // Performance values pulled from Section 2
  spend: number
  messageInbox: number
  // CRM figures entered by team
  leads: number
  qualifiedLeads: number
  appointments: number
  quotations: number
  closedSales: number
  sale: number
  notes?: string
  enteredBy: string
  updateType: 'Regular Update' | 'Correction'
  correctionReason?: string | null
  status: 'SAVED' | 'DRAFT'
  createdAt: string
}

export interface ActiveAdCrmItem {
  adId: string
  adName: string
  adSetId: string
  adSetName: string
  campaignId: string
  campaignName: string
  channel: string
  productCategory: string
  status: 'Active' | 'Paused' | 'Archived' | 'Draft'
  format: 'Image' | 'Video' | 'Carousel'
  creativeFile: string
  creativeVersion: string
  creativeUrl: string
  thumbnailUrl: string
  // Pulled from Performance Snapshot
  spend: number
  messageInbox: number
  // Latest CRM Snapshot Data
  latestSnapshot: CrmResultSnapshot | null
  previousSnapshot: CrmResultSnapshot | null
  // CRM Values
  leads: number
  qualifiedLeads: number
  appointments: number
  quotations: number
  closedSales: number
  sale: number
  notes: string
  lastUpdated: string
  // Auto-calculated rates
  leadRate: number | null // Leads / Message Inbox * 100
  qualifiedRate: number | null // Qualified Leads / Leads * 100
  quotationCloseRate: number | null // Closed Sales / Quotations * 100
  costPerLead: number | null // Spend / Leads
  costPerSale: number | null // Spend / Closed Sales
  roi: number | null // (Sale - Spend) / Spend * 100
  // Deltas (compared to previous snapshot)
  deltaLeads: number
  deltaQualified: number
  deltaAppointments: number
  deltaQuotations: number
  deltaClosedSales: number
  deltaSale: number
}

const LOCAL_CRM_SNAPSHOTS_PATH = path.join(process.cwd(), 'data', 'ad_crm_snapshots.json')

function readLocalCrmSnapshots(): CrmResultSnapshot[] {
  try {
    if (fs.existsSync(LOCAL_CRM_SNAPSHOTS_PATH)) {
      const data = fs.readFileSync(LOCAL_CRM_SNAPSHOTS_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Error reading local CRM snapshots:', e)
  }
  return []
}

function writeLocalCrmSnapshots(items: CrmResultSnapshot[]) {
  try {
    const dir = path.dirname(LOCAL_CRM_SNAPSHOTS_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(LOCAL_CRM_SNAPSHOTS_PATH, JSON.stringify(items, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing local CRM snapshots:', e)
  }
}

let isCrmSnapshotsTableReady = false
async function ensureCrmSnapshotsTable() {
  if (isCrmSnapshotsTableReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ad_crm_snapshots" (
        "id" TEXT PRIMARY KEY,
        "snapshotId" TEXT UNIQUE NOT NULL,
        "adId" TEXT NOT NULL,
        "campaignId" TEXT NOT NULL,
        "adSetId" TEXT NOT NULL,
        "creativeId" TEXT,
        "creativeFile" TEXT,
        "creativeVersion" TEXT,
        "creativeUrl" TEXT,
        "periodStart" DATE,
        "periodEnd" DATE,
        "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "spend" DECIMAL(12, 2) NOT NULL DEFAULT 0,
        "messageInbox" INTEGER DEFAULT 0,
        "leads" INTEGER DEFAULT 0,
        "qualifiedLeads" INTEGER DEFAULT 0,
        "appointments" INTEGER DEFAULT 0,
        "quotations" INTEGER DEFAULT 0,
        "closedSales" INTEGER DEFAULT 0,
        "sale" DECIMAL(14, 2) NOT NULL DEFAULT 0,
        "notes" TEXT,
        "enteredBy" TEXT,
        "updateType" TEXT DEFAULT 'Regular Update',
        "correctionReason" TEXT,
        "status" TEXT DEFAULT 'SAVED',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "idx_ad_crm_snaps_ad" ON "ad_crm_snapshots"("adId");
      CREATE INDEX IF NOT EXISTS "idx_ad_crm_snaps_camp" ON "ad_crm_snapshots"("campaignId");
      CREATE INDEX IF NOT EXISTS "idx_ad_crm_snaps_date" ON "ad_crm_snapshots"("capturedAt" DESC);
    `)
    isCrmSnapshotsTableReady = true
  } catch (err) {
    console.error('ensureCrmSnapshotsTable warning:', err)
  }
}

// Default Demo CRM Snapshots matching user mockup
const DEFAULT_DEMO_CRM_SNAPSHOTS: CrmResultSnapshot[] = [
  // AD-SP-001 (Water Strong V1) Previous
  {
    id: 'crm_snp_001_prev',
    snapshotId: 'SNP-CRM-20260830-001',
    adId: 'AD-SP-001',
    adName: 'Water Strong V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-001',
    adSetName: '01 Agriculture Broad',
    creativeFile: 'SP_WaterStrong_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    capturedAt: '2026-08-30T16:00:00Z',
    spend: 62700,
    messageInbox: 1140,
    leads: 300,
    qualifiedLeads: 165,
    appointments: 50,
    quotations: 35,
    closedSales: 11,
    sale: 495000,
    notes: 'Initial closing wave from agricultural broad audience.',
    enteredBy: 'Sales Lead',
    updateType: 'Regular Update',
    status: 'SAVED',
    createdAt: '2026-08-30T16:00:00Z'
  },
  // AD-SP-001 (Water Strong V1) Latest
  {
    id: 'crm_snp_001_latest',
    snapshotId: 'SNP-CRM-20260831-001',
    adId: 'AD-SP-001',
    adName: 'Water Strong V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-001',
    adSetName: '01 Agriculture Broad',
    creativeFile: 'SP_WaterStrong_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    capturedAt: '2026-08-31T17:00:00Z',
    spend: 65350,
    messageInbox: 1204,
    leads: 320,
    qualifiedLeads: 176,
    appointments: 54,
    quotations: 38,
    closedSales: 12,
    sale: 540000,
    notes: '12 sales closed; follow up remaining quotations.',
    enteredBy: 'Sales Lead',
    updateType: 'Regular Update',
    status: 'SAVED',
    createdAt: '2026-08-31T17:00:00Z'
  },
  // AD-SP-002 (No Electricity V2) Latest
  {
    id: 'crm_snp_002_latest',
    snapshotId: 'SNP-CRM-20260831-002',
    adId: 'AD-SP-002',
    adName: 'No Electricity V2',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-001',
    adSetName: '01 Agriculture Broad',
    creativeFile: 'SP_NoElec_V2.mp4',
    creativeVersion: 'V2',
    creativeUrl: '/uploads/creatives/SP_NoElec_V2.mp4',
    capturedAt: '2026-08-31T16:45:00Z',
    spend: 32480,
    messageInbox: 685,
    leads: 185,
    qualifiedLeads: 102,
    appointments: 32,
    quotations: 21,
    closedSales: 7,
    sale: 325000,
    notes: 'Video demonstrates remote pump working without electric grid.',
    enteredBy: 'Sales Lead',
    updateType: 'Regular Update',
    status: 'SAVED',
    createdAt: '2026-08-31T16:45:00Z'
  },
  // AD-SP-003 (Installation Review V1) Latest
  {
    id: 'crm_snp_003_latest',
    snapshotId: 'SNP-CRM-20260831-003',
    adId: 'AD-SP-003',
    adName: 'Installation Review V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-003',
    adSetName: '03 Retargeting',
    creativeFile: 'SP_Review_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_Review_V1.jpg',
    capturedAt: '2026-08-31T16:20:00Z',
    spend: 18900,
    messageInbox: 498,
    leads: 115,
    qualifiedLeads: 63,
    appointments: 22,
    quotations: 15,
    closedSales: 5,
    sale: 255000,
    notes: 'High conversion rate from warm retargeting audience.',
    enteredBy: 'Sales Lead',
    updateType: 'Regular Update',
    status: 'SAVED',
    createdAt: '2026-08-31T16:20:00Z'
  },
  // AD-SP-004 (Compare Electricity V1) Latest
  {
    id: 'crm_snp_004_latest',
    snapshotId: 'SNP-CRM-20260831-004',
    adId: 'AD-SP-004',
    adName: 'Compare Electricity V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-002',
    adSetName: '02 Cost Reduction Focus',
    creativeFile: 'SP_Compare_V1.jpg',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_Compare_V1.jpg',
    capturedAt: '2026-08-31T15:10:00Z',
    spend: 15200,
    messageInbox: 340,
    leads: 85,
    qualifiedLeads: 48,
    appointments: 16,
    quotations: 10,
    closedSales: 3,
    sale: 145000,
    notes: 'Focus on monthly diesel vs solar electricity savings.',
    enteredBy: 'Sales Lead',
    updateType: 'Regular Update',
    status: 'SAVED',
    createdAt: '2026-08-31T15:10:00Z'
  },
  // AD-SP-005 (Customer Testimonial V1) Latest
  {
    id: 'crm_snp_005_latest',
    snapshotId: 'SNP-CRM-20260831-005',
    adId: 'AD-SP-005',
    adName: 'Customer Testimonial V1',
    campaignId: 'CMP-202608-SP-001',
    campaignName: 'SP Aug Lead',
    adSetId: 'AS-SP-003',
    adSetName: '03 Retargeting',
    creativeFile: 'SP_Testimonial_V1.mp4',
    creativeVersion: 'V1',
    creativeUrl: '/uploads/creatives/SP_Testimonial_V1.mp4',
    capturedAt: '2026-08-31T14:30:00Z',
    spend: 9850,
    messageInbox: 210,
    leads: 52,
    qualifiedLeads: 28,
    appointments: 10,
    quotations: 6,
    closedSales: 2,
    sale: 95000,
    notes: 'Real user interview in Chiang Mai.',
    enteredBy: 'Sales Lead',
    updateType: 'Regular Update',
    status: 'SAVED',
    createdAt: '2026-08-31T14:30:00Z'
  }
]

/**
 * Fetch all Active Ads with their latest CRM results and auto-calculated metrics
 */
export async function getActiveAdsWithCrm(filters?: {
  channel?: string
  campaignId?: string
  adSetId?: string
  status?: string
  search?: string
}) {
  try {
    await ensureCrmSnapshotsTable()

    // 1. Fetch active ads with their latest Performance data from Section 2
    const perfResult = await getActiveAdsWithPerformance({
      channel: filters?.channel,
      campaignId: filters?.campaignId,
      adSetId: filters?.adSetId,
      status: filters?.status,
      search: filters?.search
    })
    const perfAds = (perfResult && 'ads' in perfResult) ? perfResult.ads : []

    // 2. Fetch all CRM snapshots from DB (with local fallback)
    let dbSnapshots: any[] = []
    try {
      dbSnapshots = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "ad_crm_snapshots" ORDER BY "capturedAt" DESC
      `)
    } catch (e) {
      console.warn('Could not query ad_crm_snapshots from Postgres, using local store:', e)
    }

    let allSnapshots: CrmResultSnapshot[] = []
    if (dbSnapshots && dbSnapshots.length > 0) {
      allSnapshots = dbSnapshots.map(s => ({
        id: s.id,
        snapshotId: s.snapshotId,
        adId: s.adId,
        adName: s.adName,
        campaignId: s.campaignId,
        campaignName: s.campaignName,
        adSetId: s.adSetId,
        adSetName: s.adSetName,
        creativeId: s.creativeId,
        creativeFile: s.creativeFile,
        creativeVersion: s.creativeVersion,
        creativeUrl: s.creativeUrl,
        periodStart: s.periodStart ? new Date(s.periodStart).toISOString().slice(0, 10) : undefined,
        periodEnd: s.periodEnd ? new Date(s.periodEnd).toISOString().slice(0, 10) : undefined,
        capturedAt: s.capturedAt ? new Date(s.capturedAt).toISOString() : new Date().toISOString(),
        spend: Number(s.spend || 0),
        messageInbox: Number(s.messageInbox || 0),
        leads: Number(s.leads || 0),
        qualifiedLeads: Number(s.qualifiedLeads || 0),
        appointments: Number(s.appointments || 0),
        quotations: Number(s.quotations || 0),
        closedSales: Number(s.closedSales || 0),
        sale: Number(s.sale || 0),
        notes: s.notes || undefined,
        enteredBy: s.enteredBy || 'System',
        updateType: (s.updateType as any) || 'Regular Update',
        correctionReason: s.correctionReason || null,
        status: (s.status as any) || 'SAVED',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString()
      }))
    } else {
      allSnapshots = readLocalCrmSnapshots()
      if (allSnapshots.length === 0) {
        allSnapshots = DEFAULT_DEMO_CRM_SNAPSHOTS
        writeLocalCrmSnapshots(allSnapshots)
      }
    }

    // 3. Map CRM snapshots to active ads
    const items: ActiveAdCrmItem[] = perfAds.map(ad => {
      // Find snapshots for this ad, scoped strictly to its campaign
      const adSnaps = allSnapshots
        .filter(s => s.adId === ad.adId && (!s.campaignId || s.campaignId === ad.campaignId))
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())

      const latest = adSnaps[0] || null
      const previous = adSnaps[1] || null

      // Always pull live spend and messageInbox from the latest Performance snapshot (Section 2)
      const currentSpend = typeof ad.spend === 'number' ? ad.spend : (latest?.spend || 0)
      const currentInbox = typeof ad.messageInbox === 'number' ? ad.messageInbox : (latest?.messageInbox || 0)

      const currentLeads = latest?.leads || 0
      const currentQualified = latest?.qualifiedLeads || 0
      const currentAppointments = latest?.appointments || 0
      const currentQuotations = latest?.quotations || 0
      const currentClosedSales = latest?.closedSales || 0
      const currentSale = latest?.sale || 0

      // Zero-division rule: whenever denominator is 0, metric is null (displayed as '—')
      const leadRate = currentInbox > 0 ? (currentLeads / currentInbox) * 100 : null
      const qualifiedRate = currentLeads > 0 ? (currentQualified / currentLeads) * 100 : null
      const quotationCloseRate = currentQuotations > 0 ? (currentClosedSales / currentQuotations) * 100 : null
      const costPerLead = currentLeads > 0 ? currentSpend / currentLeads : null
      const costPerSale = currentClosedSales > 0 ? currentSpend / currentClosedSales : null
      const roi = currentSpend > 0 ? ((currentSale - currentSpend) / currentSpend) * 100 : null

      const deltaLeads = previous ? currentLeads - previous.leads : 0
      const deltaQualified = previous ? currentQualified - previous.qualifiedLeads : 0
      const deltaAppointments = previous ? currentAppointments - previous.appointments : 0
      const deltaQuotations = previous ? currentQuotations - previous.quotations : 0
      const deltaClosedSales = previous ? currentClosedSales - previous.closedSales : 0
      const deltaSale = previous ? currentSale - previous.sale : 0

      return {
        adId: ad.adId,
        adName: ad.adName,
        adSetId: ad.adSetId,
        adSetName: ad.adSetName,
        campaignId: ad.campaignId,
        campaignName: ad.campaignName,
        channel: ad.channel,
        productCategory: ad.productCategory,
        status: ad.status,
        format: ad.format,
        creativeFile: ad.creativeFile,
        creativeVersion: ad.creativeVersion,
        creativeUrl: ad.creativeUrl,
        thumbnailUrl: ad.thumbnailUrl,
        spend: currentSpend,
        messageInbox: currentInbox,
        latestSnapshot: latest,
        previousSnapshot: previous,
        leads: currentLeads,
        qualifiedLeads: currentQualified,
        appointments: currentAppointments,
        quotations: currentQuotations,
        closedSales: currentClosedSales,
        sale: currentSale,
        notes: latest?.notes || '',
        lastUpdated: latest?.capturedAt || new Date().toISOString(),
        leadRate,
        qualifiedRate,
        quotationCloseRate,
        costPerLead,
        costPerSale,
        roi,
        deltaLeads,
        deltaQualified,
        deltaAppointments,
        deltaQuotations,
        deltaClosedSales,
        deltaSale
      }
    })

    return items
  } catch (error) {
    console.error('Error in getActiveAdsWithCrm:', error)
    return []
  }
}

/**
 * Save a new CRM Snapshot for an ad
 */
export async function saveCrmSnapshot(payload: {
  adId: string
  adName?: string
  campaignId: string
  campaignName?: string
  adSetId: string
  adSetName?: string
  creativeFile?: string
  creativeVersion?: string
  creativeUrl?: string
  dataAsOf: string
  spend: number
  messageInbox: number
  leads: number
  qualifiedLeads: number
  appointments: number
  quotations: number
  closedSales: number
  sale: number
  notes?: string
  updateType?: 'Regular Update' | 'Correction'
  correctionReason?: string
  status?: 'SAVED' | 'DRAFT'
}) {
  try {
    const user = await getUser()
    const enteredBy = (user as any)?.fullName || (user as any)?.name || user?.email || 'Marketing Team'

    await ensureCrmSnapshotsTable()

    // 1. Generate unique snapshot ID: SNP-CRM-YYYYMMDD-XXX
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randSuffix = Math.floor(100 + Math.random() * 900)
    const snapshotId = `SNP-CRM-${dateStr}-${randSuffix}`
    const id = `crm_snp_${Date.now()}_${randSuffix}`

    const newSnapshot: CrmResultSnapshot = {
      id,
      snapshotId,
      adId: payload.adId,
      adName: payload.adName,
      campaignId: payload.campaignId,
      campaignName: payload.campaignName,
      adSetId: payload.adSetId,
      adSetName: payload.adSetName,
      creativeFile: payload.creativeFile,
      creativeVersion: payload.creativeVersion,
      creativeUrl: payload.creativeUrl,
      capturedAt: payload.dataAsOf || now.toISOString(),
      spend: Number(payload.spend || 0),
      messageInbox: Number(payload.messageInbox || 0),
      leads: Math.round(Number(payload.leads || 0)),
      qualifiedLeads: Math.round(Number(payload.qualifiedLeads || 0)),
      appointments: Math.round(Number(payload.appointments || 0)),
      quotations: Math.round(Number(payload.quotations || 0)),
      closedSales: Math.round(Number(payload.closedSales || 0)),
      sale: Number(payload.sale || 0),
      notes: payload.notes || '',
      enteredBy,
      updateType: payload.updateType || 'Regular Update',
      correctionReason: payload.correctionReason || null,
      status: payload.status || 'SAVED',
      createdAt: now.toISOString()
    }

    // 2. Persist to Postgres
    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "ad_crm_snapshots" (
          "id", "snapshotId", "adId", "campaignId", "adSetId",
          "creativeFile", "creativeVersion", "creativeUrl",
          "capturedAt", "spend", "messageInbox",
          "leads", "qualifiedLeads", "appointments", "quotations", "closedSales", "sale",
          "notes", "enteredBy", "updateType", "correctionReason", "status", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `,
        newSnapshot.id,
        newSnapshot.snapshotId,
        newSnapshot.adId,
        newSnapshot.campaignId,
        newSnapshot.adSetId,
        newSnapshot.creativeFile || null,
        newSnapshot.creativeVersion || null,
        newSnapshot.creativeUrl || null,
        new Date(newSnapshot.capturedAt),
        newSnapshot.spend,
        newSnapshot.messageInbox,
        newSnapshot.leads,
        newSnapshot.qualifiedLeads,
        newSnapshot.appointments,
        newSnapshot.quotations,
        newSnapshot.closedSales,
        newSnapshot.sale,
        newSnapshot.notes || null,
        newSnapshot.enteredBy,
        newSnapshot.updateType,
        newSnapshot.correctionReason || null,
        newSnapshot.status,
        new Date(newSnapshot.createdAt)
      )
    } catch (dbErr) {
      console.warn('Could not insert CRM snapshot into Postgres, fallback to local file:', dbErr)
    }

    // 3. Persist to local JSON file for resiliency
    const local = readLocalCrmSnapshots()
    local.unshift(newSnapshot)
    writeLocalCrmSnapshots(local)

    revalidatePath('/marketing/ads/crm')
    revalidatePath('/marketing/ads/dashboard')

    return { success: true, snapshot: newSnapshot }
  } catch (error: any) {
    console.error('Error saving CRM snapshot:', error)
    return { success: false, error: error.message || 'Failed to save CRM snapshot' }
  }
}

/**
 * Bulk save multiple CRM snapshots
 */
export async function saveBulkCrmSnapshots(updates: Array<{
  adId: string
  adName?: string
  campaignId: string
  campaignName?: string
  adSetId: string
  adSetName?: string
  creativeFile?: string
  creativeVersion?: string
  creativeUrl?: string
  dataAsOf: string
  spend: number
  messageInbox: number
  leads: number
  qualifiedLeads: number
  appointments: number
  quotations: number
  closedSales: number
  sale: number
  notes?: string
}>) {
  try {
    const results = []
    for (const item of updates) {
      const res = await saveCrmSnapshot(item)
      if (res.success) results.push(res.snapshot)
    }
    revalidatePath('/marketing/ads/crm')
    revalidatePath('/marketing/ads/dashboard')
    return { success: true, count: results.length }
  } catch (err: any) {
    console.error('Error in saveBulkCrmSnapshots:', err)
    return { success: false, error: err.message || 'Failed to save bulk CRM updates' }
  }
}

/**
 * Fetch full audit history of CRM snapshots for an ad
 */
export async function getCrmAdHistory(adId: string): Promise<CrmResultSnapshot[]> {
  try {
    await ensureCrmSnapshotsTable()
    let dbSnaps: any[] = []
    try {
      dbSnaps = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ad_crm_snapshots" WHERE "adId" = $1 ORDER BY "capturedAt" DESC`,
        adId
      )
    } catch (e) {
      console.warn('Could not query CRM snapshots history from DB:', e)
    }

    if (dbSnaps && dbSnaps.length > 0) {
      return dbSnaps.map(s => ({
        id: s.id,
        snapshotId: s.snapshotId,
        adId: s.adId,
        adName: s.adName,
        campaignId: s.campaignId,
        campaignName: s.campaignName,
        adSetId: s.adSetId,
        adSetName: s.adSetName,
        creativeId: s.creativeId,
        creativeFile: s.creativeFile,
        creativeVersion: s.creativeVersion,
        creativeUrl: s.creativeUrl,
        periodStart: s.periodStart ? new Date(s.periodStart).toISOString().slice(0, 10) : undefined,
        periodEnd: s.periodEnd ? new Date(s.periodEnd).toISOString().slice(0, 10) : undefined,
        capturedAt: s.capturedAt ? new Date(s.capturedAt).toISOString() : new Date().toISOString(),
        spend: Number(s.spend || 0),
        messageInbox: Number(s.messageInbox || 0),
        leads: Number(s.leads || 0),
        qualifiedLeads: Number(s.qualifiedLeads || 0),
        appointments: Number(s.appointments || 0),
        quotations: Number(s.quotations || 0),
        closedSales: Number(s.closedSales || 0),
        sale: Number(s.sale || 0),
        notes: s.notes || undefined,
        enteredBy: s.enteredBy || 'System',
        updateType: (s.updateType as any) || 'Regular Update',
        correctionReason: s.correctionReason || null,
        status: (s.status as any) || 'SAVED',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString()
      }))
    }

    const local = readLocalCrmSnapshots()
    const filtered = local.filter(s => s.adId === adId)
    if (filtered.length > 0) return filtered

    return DEFAULT_DEMO_CRM_SNAPSHOTS.filter(s => s.adId === adId)
  } catch (err) {
    console.error('Error in getCrmAdHistory:', err)
    return []
  }
}

/* ========================================================================= */
/* Legacy Lead Binding Functions (Maintained for Backwards Compatibility)     */
/* ========================================================================= */

const CLOSED_SALE_STATUSES = ['Open Billing', 'Invoiced', 'Paid']

export async function getMarketingLeads(
  page: number = 1,
  pageSize: number = 25,
  filters: any = {}
) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const where: any = {}

  if (filters.unbound) {
    where.adCampaignId = null
  }

  if (filters.dateFrom && filters.dateTo) {
    where.createdAt = {
      gte: new Date(filters.dateFrom),
      lte: new Date(filters.dateTo)
    }
  }

  if (filters.campaignId) {
    where.adCampaignId = filters.campaignId
  }

  if (filters.productCategory) {
    where.adCampaign = {
      ...(where.adCampaign || {}),
      productCategory: filters.productCategory
    }
  }

  if (filters.status) {
    if (filters.status === 'WITH_QUOTATION') {
      where.quotationId = { not: null }
    } else if (filters.status === 'WITHOUT_QUOTATION') {
      where.quotationId = null
    } else {
      where.quotation = {
        status: filters.status
      }
    }
  }

  const [total, leads] = await Promise.all([
    prisma.marketingLead.count({ where }),
    prisma.marketingLead.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        quotation: true,
        adCampaign: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  ])

  const cleanedLeads = leads.map(lead => {
    let plainQ = null
    if (lead.quotation) {
      plainQ = {
        ...lead.quotation,
        salesBeforeVat: lead.quotation.salesBeforeVat ?? null,
        transportationFee: lead.quotation.transportationFee ?? null,
        installationFee: lead.quotation.installationFee ?? null,
        totalAmountBeforeVat: lead.quotation.totalAmountBeforeVat ?? null,
        actualClosingAmount: lead.quotation.actualClosingAmount ?? null,
      }
    }
    return {
      ...lead,
      quotation: plainQ,
      adCampaign: lead.adCampaign ? {
        ...lead.adCampaign,
        budget: lead.adCampaign.budget ? Number(lead.adCampaign.budget) : 0
      } : null
    }
  })

  return { total, data: cleanedLeads, totalPages: Math.ceil(total / pageSize) }
}

export async function getCrmSummaryCards(filters: any = {}) {
  const where: any = {}

  if (filters.dateFrom && filters.dateTo) {
    where.createdAt = {
      gte: new Date(filters.dateFrom),
      lte: new Date(filters.dateTo)
    }
  }

  if (filters.campaignId) {
    where.adCampaignId = filters.campaignId
  }

  if (filters.productCategory) {
    where.adCampaign = {
      ...(where.adCampaign || {}),
      productCategory: filters.productCategory
    }
  }

  const totalLeads = await prisma.marketingLead.count({ where })

  const quotationCount = await prisma.marketingLead.count({
    where: {
      ...where,
      quotationId: { not: null }
    }
  })

  const qualifiedCount = null

  const closedLeads = await prisma.marketingLead.findMany({
    where: {
      ...where,
      quotation: {
        status: { in: CLOSED_SALE_STATUSES }
      }
    },
    include: { quotation: true }
  })

  const closedWonCount = closedLeads.length
  const saleAmount = closedLeads.reduce((sum, lead) => {
    const q = lead.quotation
    if (!q) return sum
    const amt = q.actualClosingAmount ?? q.totalAmountBeforeVat ?? 0
    return sum + Number(amt)
  }, 0)

  return {
    totalLeads,
    quotationCount,
    qualifiedCount,
    closedWonCount,
    saleAmount
  }
}

export async function bindLeadsToCampaign(leadIds: string[], campaignId: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  if (!['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor'].includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to bind leads")
  }

  if (!leadIds || leadIds.length === 0) return { success: true }

  await prisma.$transaction(async (tx) => {
    await tx.marketingLead.updateMany({
      where: { id: { in: leadIds } },
      data: { adCampaignId: campaignId }
    })
  })

  revalidatePath('/marketing/ads/crm')
  revalidatePath('/marketing/ads/dashboard')
  return { success: true }
}

export async function unbindLeads(leadIds: string[]) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  if (!['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor'].includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to unbind leads")
  }

  if (!leadIds || leadIds.length === 0) return { success: true }

  await prisma.$transaction(async (tx) => {
    await tx.marketingLead.updateMany({
      where: { id: { in: leadIds } },
      data: { adCampaignId: null }
    })
  })

  revalidatePath('/marketing/ads/crm')
  revalidatePath('/marketing/ads/dashboard')
  return { success: true }
}
