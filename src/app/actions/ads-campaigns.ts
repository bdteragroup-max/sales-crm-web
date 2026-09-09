'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'

function isAllowedCampaignRole(role: string | null | undefined): boolean {
  if (!role) return false
  const r = role.toUpperCase().trim()
  const allowedKeywords = [
    'ADMIN',
    'SUPER_ADMIN',
    'MARKETING',
    'MANAGER',
    'EDITOR',
    'PROJECT',
    'SERVICE',
    'SALES',
    'SALE',
    'SELLER',
    'USER',
    'ผู้จัดการ',
    'การตลาด',
    'แอดมิน',
    'โปรเจค',
    'โครงการ',
    'ตัวแทนฝ่ายขาย',
    'ฝ่ายขาย',
    'บริการ',
    'ช่าง',
    'BD',
    'BUSINESS DEVELOPMENT'
  ]
  return allowedKeywords.some(keyword => r.includes(keyword))
}

export async function createCampaign(data: {
  campaignId: string
  name: string
  channelId: string
  productCategory?: string
  branchId?: string
  objectiveId?: string
  accountId?: string
  internalCode?: string
  budget: number
  startDate: Date
  endDate: Date
  status?: string
  targetAudience?: string
  artworkUrl?: string
  notes?: string
}) {
  try {
    const user = await getUser()
    if (!user) return { success: false, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ" }
    if (!isAllowedCampaignRole(user.role)) {
      return { success: false, error: "Forbidden: สิทธิ์การใช้งานของคุณไม่สามารถสร้างแคมเปญได้" }
    }

    if (data.endDate < data.startDate) {
      return { success: false, error: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น (End date cannot be before start date)" }
    }

    if (data.budget < 0) {
      return { success: false, error: "งบประมาณต้องไม่ติดลบ (Budget cannot be negative)" }
    }

    const trimmedCampaignId = data.campaignId.trim()
    const trimmedInternalCode = data.internalCode?.trim() || undefined

    // Duplicate checks against active (non-deleted) campaigns
    const existingPlatform = await prisma.adCampaign.findFirst({
      where: { campaignId: trimmedCampaignId, deletedAt: null }
    })
    if (existingPlatform) {
      return { success: false, error: `รหัสแคมเปญบนแพลตฟอร์ม (Platform ID) "${trimmedCampaignId}" มีอยู่ในระบบแล้ว` }
    }

    if (trimmedInternalCode) {
      const existingInternal = await prisma.adCampaign.findFirst({
        where: { internalCode: trimmedInternalCode, deletedAt: null }
      })
      if (existingInternal) {
        return { success: false, error: `รหัสแคมเปญภายใน (Internal Code) "${trimmedInternalCode}" มีอยู่ในระบบแล้ว` }
      }
    }

    // Clean up soft-deleted campaigns that might still occupy the unique constraints
    const deletedOccupiers = await prisma.adCampaign.findMany({
      where: {
        deletedAt: { not: null },
        OR: [
          { campaignId: trimmedCampaignId },
          ...(trimmedInternalCode ? [{ internalCode: trimmedInternalCode }] : [])
        ]
      }
    })
    for (const del of deletedOccupiers) {
      const ts = Date.now()
      await prisma.adCampaign.update({
        where: { id: del.id },
        data: {
          campaignId: del.campaignId === trimmedCampaignId ? `${del.campaignId}__del_${ts}` : del.campaignId,
          internalCode: (trimmedInternalCode && del.internalCode === trimmedInternalCode) ? `${del.internalCode}__del_${ts}` : del.internalCode
        }
      })
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        campaignId: trimmedCampaignId,
        name: data.name.trim(),
        channelId: data.channelId,
        productCategory: data.productCategory || null,
        branchId: data.branchId || null,
        objectiveId: data.objectiveId || null,
        accountId: data.accountId || null,
        internalCode: trimmedInternalCode || null,
        budget: data.budget,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status || 'ACTIVE',
        targetAudience: data.targetAudience || null,
        artworkUrl: data.artworkUrl || null,
        notes: data.notes || null,
        createdBy: user.id
      },
      include: {
        channel: true,
        objective: true,
        product: true,
        branch: true,
        account: true
      }
    })

    const plainCampaign = {
      ...campaign,
      budget: campaign.budget ? campaign.budget.toNumber() : 0,
      branch: campaign.branch ? {
        ...campaign.branch,
        center_lat: campaign.branch.center_lat ? campaign.branch.center_lat.toNumber() : null,
        center_lon: campaign.branch.center_lon ? campaign.branch.center_lon.toNumber() : null
      } : null
    }

    revalidatePath('/marketing/ads/campaigns')
    return { success: true, data: plainCampaign }
  } catch (err: any) {
    console.error("createCampaign error:", err)
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการสร้างแคมเปญ" }
  }
}

export async function updateCampaign(id: string, data: Partial<any>) {
  try {
    const user = await getUser()
    if (!user) return { success: false, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ" }
    if (!isAllowedCampaignRole(user.role)) {
      return { success: false, error: "Forbidden: สิทธิ์การใช้งานของคุณไม่สามารถแก้ไขแคมเปญได้" }
    }

    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      return { success: false, error: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น (End date cannot be before start date)" }
    }

    const trimmedCampaignId = data.campaignId ? data.campaignId.trim() : undefined
    const trimmedInternalCode = data.internalCode ? data.internalCode.trim() : undefined

    if (trimmedCampaignId) {
      const existingPlatform = await prisma.adCampaign.findFirst({
        where: { campaignId: trimmedCampaignId, id: { not: id }, deletedAt: null }
      })
      if (existingPlatform) {
        return { success: false, error: `รหัสแคมเปญบนแพลตฟอร์ม (Platform ID) "${trimmedCampaignId}" มีอยู่ในระบบแล้ว` }
      }
    }

    if (trimmedInternalCode) {
      const existingInternal = await prisma.adCampaign.findFirst({
        where: { internalCode: trimmedInternalCode, id: { not: id }, deletedAt: null }
      })
      if (existingInternal) {
        return { success: false, error: `รหัสแคมเปญภายใน (Internal Code) "${trimmedInternalCode}" มีอยู่ในระบบแล้ว` }
      }
    }

    // Clean up soft-deleted campaigns that might still occupy unique constraints
    if (trimmedCampaignId || trimmedInternalCode) {
      const deletedOccupiers = await prisma.adCampaign.findMany({
        where: {
          deletedAt: { not: null },
          id: { not: id },
          OR: [
            ...(trimmedCampaignId ? [{ campaignId: trimmedCampaignId }] : []),
            ...(trimmedInternalCode ? [{ internalCode: trimmedInternalCode }] : [])
          ]
        }
      })
      for (const del of deletedOccupiers) {
        const ts = Date.now()
        await prisma.adCampaign.update({
          where: { id: del.id },
          data: {
            campaignId: (trimmedCampaignId && del.campaignId === trimmedCampaignId) ? `${del.campaignId}__del_${ts}` : del.campaignId,
            internalCode: (trimmedInternalCode && del.internalCode === trimmedInternalCode) ? `${del.internalCode}__del_${ts}` : del.internalCode
          }
        })
      }
    }

    const updatePayload: any = {
      ...data,
      updatedBy: user.id
    }
    if (trimmedCampaignId) updatePayload.campaignId = trimmedCampaignId
    if (trimmedInternalCode !== undefined) updatePayload.internalCode = trimmedInternalCode || null
    if (data.branchId !== undefined) updatePayload.branchId = data.branchId || null
    if (data.objectiveId !== undefined) updatePayload.objectiveId = data.objectiveId || null
    if (data.accountId !== undefined) updatePayload.accountId = data.accountId || null
    if (data.productCategory !== undefined) updatePayload.productCategory = data.productCategory || null

    const campaign = await prisma.adCampaign.update({
      where: { id },
      data: updatePayload,
      include: {
        channel: true,
        objective: true,
        product: true,
        branch: true,
        account: true
      }
    })

    const plainCampaign = {
      ...campaign,
      budget: campaign.budget ? campaign.budget.toNumber() : 0,
      branch: campaign.branch ? {
        ...campaign.branch,
        center_lat: campaign.branch.center_lat ? campaign.branch.center_lat.toNumber() : null,
        center_lon: campaign.branch.center_lon ? campaign.branch.center_lon.toNumber() : null
      } : null
    }

    revalidatePath('/marketing/ads/campaigns')
    return { success: true, data: plainCampaign }
  } catch (err: any) {
    console.error("updateCampaign error:", err)
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการอัปเดตแคมเปญ" }
  }
}

export async function getCampaigns(filters?: any) {
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      deletedAt: null,
      ...filters
    },
    include: {
      channel: true,
      objective: true,
      branch: true,
      account: true,
      product: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  return campaigns
}

export async function deleteCampaign(id: string) {
  try {
    const user = await getUser()
    if (!user) return { success: false, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ" }
    if (!isAllowedCampaignRole(user.role)) {
      return { success: false, error: "Forbidden: สิทธิ์การใช้งานของคุณไม่สามารถลบแคมเปญได้" }
    }

    const existing = await prisma.adCampaign.findUnique({ where: { id } })
    if (!existing) return { success: true }

    const ts = Date.now()
    const delCampaignId = existing.campaignId.includes('__del_') ? existing.campaignId : `${existing.campaignId}__del_${ts}`
    const delInternalCode = (existing.internalCode && !existing.internalCode.includes('__del_')) ? `${existing.internalCode}__del_${ts}` : existing.internalCode

    await prisma.adCampaign.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        campaignId: delCampaignId,
        internalCode: delInternalCode,
        updatedBy: user.id
      }
    })

    revalidatePath('/marketing/ads/campaigns')
    return { success: true }
  } catch (err: any) {
    console.error("deleteCampaign error:", err)
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการลบแคมเปญ" }
  }
}

export interface BatchCampaignItemInput {
  name: string
  campaignId?: string
  internalCode?: string
  channelId?: string
  channelName?: string
  accountId?: string
  accountName?: string
  branchId?: string
  branchName?: string
  productCategory?: string
  objectiveId?: string
  objectiveName?: string
  budgetStrategy?: 'ABO' | 'CBO'
  budget: number
  startDate: string | Date
  endDate: string | Date
  status?: string
  notes?: string
  adSets?: Array<{
    id?: string
    name: string
    targetAudience?: string
    location?: string
    age?: string
    budget?: number
    dailyBudget?: number
    budgetType?: 'DAILY' | 'LIFETIME'
    placement?: string
    optimization?: string
    startDate?: string
    endDate?: string
    status?: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED'
    ads?: Array<{
      id?: string
      name: string
      format?: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
      headline?: string
      primaryText?: string
      cta?: string
      creativeName?: string
      creativeUrl?: string
      status?: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED'
    }>
  }>
}

export async function importCampaignsBatch(items: BatchCampaignItemInput[]) {
  try {
    const user = await getUser()
    if (!user) return { success: false, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ" }
    if (!isAllowedCampaignRole(user.role)) {
      return { success: false, error: "Forbidden: สิทธิ์การใช้งานของคุณไม่สามารถสร้างแคมเปญได้" }
    }

    if (!items || items.length === 0) {
      return { success: false, error: "ไม่มีข้อมูลแคมเปญที่จะนำเข้า" }
    }

    // Load reference data for matching
    const [allChannels, allAccounts, allBranches, allObjectives] = await Promise.all([
      prisma.adChannel.findMany(),
      prisma.adAccount.findMany(),
      prisma.branches.findMany(),
      prisma.adObjective.findMany()
    ])

    const defaultChannel = allChannels.find(c => c.name.toLowerCase().includes('facebook') || c.name.toLowerCase().includes('fb')) || allChannels[0]

    const createdCampaigns: any[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.name || !item.name.trim()) continue

      // Resolve channel
      let resolvedChannelId = item.channelId
      if (!resolvedChannelId && item.channelName) {
        const found = allChannels.find(c => 
          c.name.toLowerCase() === item.channelName?.toLowerCase() ||
          item.channelName?.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(item.channelName?.toLowerCase() || '')
        )
        if (found) resolvedChannelId = found.id
      }
      if (!resolvedChannelId && defaultChannel) {
        resolvedChannelId = defaultChannel.id
      }

      // Resolve account
      let resolvedAccountId = item.accountId
      if (!resolvedAccountId && item.accountName) {
        const found = allAccounts.find(a => 
          a.name.toLowerCase() === item.accountName?.toLowerCase() ||
          item.accountName?.toLowerCase().includes(a.name.toLowerCase()) ||
          a.name.toLowerCase().includes(item.accountName?.toLowerCase() || '')
        )
        if (found) resolvedAccountId = found.id
      }

      // Resolve branch
      let resolvedBranchId = item.branchId
      if (!resolvedBranchId && item.branchName) {
        const found = allBranches.find(b => 
          b.name.toLowerCase() === item.branchName?.toLowerCase() ||
          item.branchName?.toLowerCase().includes(b.name.toLowerCase()) ||
          b.name.toLowerCase().includes(item.branchName?.toLowerCase() || '')
        )
        if (found) resolvedBranchId = found.id
      }

      // Resolve objective
      let resolvedObjectiveId = item.objectiveId
      if (!resolvedObjectiveId && item.objectiveName) {
        const found = allObjectives.find(o => 
          o.name.toLowerCase() === item.objectiveName?.toLowerCase() ||
          item.objectiveName?.toLowerCase().includes(o.name.toLowerCase()) ||
          o.name.toLowerCase().includes(item.objectiveName?.toLowerCase() || '')
        )
        if (found) resolvedObjectiveId = found.id
      }

      // Dates
      const start = item.startDate ? new Date(item.startDate) : new Date()
      let end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
      if (isNaN(start.getTime())) start.setTime(Date.now())
      if (isNaN(end.getTime()) || end < start) {
        end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
      }

      // Auto-generate campaignId if missing or duplicate
      let campId = (item.campaignId || '').trim()
      if (!campId) {
        campId = `CAMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      } else {
        const exists = await prisma.adCampaign.findFirst({
          where: { campaignId: campId, deletedAt: null }
        })
        if (exists) {
          campId = `${campId}_${Math.random().toString(36).substring(2, 5)}`
        }
      }

      // Auto-generate internalCode if missing or duplicate
      let internalCode = (item.internalCode || '').trim()
      if (!internalCode) {
        const yyyy = start.getFullYear()
        const mm = String(start.getMonth() + 1).padStart(2, '0')
        const prod = (item.productCategory || 'OTH').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')
        const seq = String(i + 1).padStart(3, '0')
        internalCode = `CMP-${yyyy}${mm}-${prod}-${seq}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
      } else {
        const exists = await prisma.adCampaign.findFirst({
          where: { internalCode: internalCode, deletedAt: null }
        })
        if (exists) {
          internalCode = `${internalCode}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
        }
      }

      // Process adSets and ads
      const rawAdSets = Array.isArray(item.adSets) ? item.adSets : []
      const structuredAdSets = rawAdSets.map((s, sIdx) => {
        const adSetId = s.id || `set_${Date.now()}_${sIdx}_${Math.random().toString(36).substring(2, 7)}`
        const rawAds = Array.isArray(s.ads) ? s.ads : []
        const structuredAds = rawAds.map((a, aIdx) => ({
          id: a.id || `ad_${Date.now()}_${sIdx}_${aIdx}_${Math.random().toString(36).substring(2, 7)}`,
          name: a.name || `โฆษณา ${aIdx + 1}`,
          format: a.format || 'IMAGE',
          headline: a.headline || '',
          primaryText: a.primaryText || '',
          cta: a.cta || 'ส่งข้อความ',
          creativeName: a.creativeName || '',
          creativeUrl: a.creativeUrl || '',
          status: a.status || 'ACTIVE',
          updatedAt: new Date().toISOString()
        }))

        return {
          id: adSetId,
          name: s.name || `ชุดโฆษณา ${sIdx + 1}`,
          targetAudience: s.targetAudience || '',
          location: s.location || '',
          age: s.age || '',
          placement: s.placement || 'ทุกตำแหน่ง (Advantage+ Placements)',
          optimization: s.optimization || 'การสนทนา (Conversations)',
          budgetType: s.budgetType || 'LIFETIME',
          budget: Number(s.budget) || 0,
          dailyBudget: Number(s.dailyBudget) || 0,
          startDate: s.startDate || start.toISOString().split('T')[0],
          endDate: s.endDate || end.toISOString().split('T')[0],
          status: s.status || 'ACTIVE',
          ads: structuredAds
        }
      })

      const targetAudiencePayload = JSON.stringify({
        budgetStrategy: item.budgetStrategy || 'ABO',
        adSets: structuredAdSets
      })

      // Clean up any soft-deleted campaign occupying unique constraints
      const deletedOccupiers = await prisma.adCampaign.findMany({
        where: {
          deletedAt: { not: null },
          OR: [
            { campaignId: campId },
            { internalCode: internalCode }
          ]
        }
      })
      for (const del of deletedOccupiers) {
        const ts = Date.now()
        await prisma.adCampaign.update({
          where: { id: del.id },
          data: {
            campaignId: del.campaignId === campId ? `${del.campaignId}__del_${ts}` : del.campaignId,
            internalCode: del.internalCode === internalCode ? `${del.internalCode}__del_${ts}` : del.internalCode
          }
        })
      }

      const campaign = await prisma.adCampaign.create({
        data: {
          campaignId: campId,
          name: item.name.trim(),
          channelId: resolvedChannelId || defaultChannel?.id || '',
          productCategory: item.productCategory || null,
          branchId: resolvedBranchId || null,
          objectiveId: resolvedObjectiveId || null,
          accountId: resolvedAccountId || null,
          internalCode: internalCode,
          budget: Number(item.budget) || 0,
          startDate: start,
          endDate: end,
          status: item.status || 'ACTIVE',
          targetAudience: targetAudiencePayload,
          notes: item.notes || null,
          createdBy: user.id
        },
        include: {
          channel: true,
          objective: true,
          product: true,
          branch: true,
          account: true
        }
      })

      const plainCampaign = {
        ...campaign,
        budget: campaign.budget ? campaign.budget.toNumber() : 0,
        branch: campaign.branch ? {
          ...campaign.branch,
          center_lat: campaign.branch.center_lat ? campaign.branch.center_lat.toNumber() : null,
          center_lon: campaign.branch.center_lon ? campaign.branch.center_lon.toNumber() : null
        } : null
      }

      createdCampaigns.push(plainCampaign)
    }

    revalidatePath('/marketing/ads/campaigns')
    return { success: true, count: createdCampaigns.length, data: createdCampaigns }
  } catch (err: any) {
    console.error("importCampaignsBatch error:", err)
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูลแคมเปญ" }
  }
}


