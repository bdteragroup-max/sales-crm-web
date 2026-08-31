'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'
import { buildDedupeKey } from '@/lib/adsMetrics'



export async function createPerformanceEntry(data: {
  campaignId: string
  adSetId?: string | null
  adId?: string | null
  dateFrom: Date
  dateTo: Date
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
    dateFrom: toDateString(data.dateFrom),
    dateTo: toDateString(data.dateTo),
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
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
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
