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

export async function getCampaignBudgetHistory(campaignId: string) {
  try {
    const history = await prisma.adBudgetHistory.findMany({
      where: { campaignId },
      orderBy: { changedAt: 'desc' }
    })
    return {
      success: true,
      data: history.map(h => ({
        ...h,
        prevBudget: h.prevBudget ? h.prevBudget.toNumber() : null,
        newBudget: h.newBudget ? h.newBudget.toNumber() : null
      }))
    }
  } catch (err: any) {
    console.error("getCampaignBudgetHistory error:", err)
    return { success: false, error: err.message || "Failed to load budget history", data: [] }
  }
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
  budgetStrategy?: 'ABO' | 'CBO'
  budgetLevel?: 'CAMPAIGN' | 'AD_SET'
  budgetType?: 'DAILY' | 'LIFETIME'
  campaignBudget?: number
  currency?: string
  budgetNotes?: string
  adSets?: any[]
}) {
  try {
    const user = await getUser()
    if (!user) return { success: false, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ" }
    if (!isAllowedCampaignRole(user.role)) {
      return { success: false, error: "Forbidden: สิทธิ์การใช้งานของคุณไม่สามารถสร้างแคมเปญได้" }
    }

    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      return { success: false, error: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น (End date cannot be before start date)" }
    }

    const strategy: 'ABO' | 'CBO' = data.budgetStrategy || 'ABO'
    const budgetType: 'DAILY' | 'LIFETIME' = data.budgetType || 'DAILY'
    const budgetLevel: 'CAMPAIGN' | 'AD_SET' = strategy === 'CBO' ? 'CAMPAIGN' : 'AD_SET'
    let campaignBudget = data.campaignBudget !== undefined ? Number(data.campaignBudget) : Number(data.budget || 0)

    let parsedTargetAudience: any = null
    try {
      if (data.targetAudience && data.targetAudience.startsWith('{')) {
        parsedTargetAudience = JSON.parse(data.targetAudience)
      }
    } catch {}

    let adSetsList: any[] = Array.isArray(data.adSets) ? data.adSets : (parsedTargetAudience?.adSets || [])

    // Strategy-specific validation per Change Request
    if (strategy === 'CBO') {
      if (campaignBudget <= 0) {
        return { success: false, error: "งบประมาณแคมเปญ (Campaign Budget) ต้องมากกว่า 0 สำหรับกลยุทธ์ CBO" }
      }
      if (budgetType === 'LIFETIME' && (!data.startDate || !data.endDate)) {
        return { success: false, error: "สำหรับงบประมาณแบบ Lifetime ใน CBO จำเป็นต้องระบุทั้งวันที่เริ่มต้นและสิ้นสุด" }
      }
      // For CBO: The Ad Set's Allocated Budget value must be saved as NULL, not 0
      adSetsList = adSetsList.map(s => ({
        ...s,
        budget: null,
        allocated_budget: null,
        budgetSource: 'CAMPAIGN_AUTO',
        budgetStatus: 'INACTIVE'
      }))
    } else {
      // ABO: All active Ad Sets must have an Allocated Budget greater than 0 before saving
      const activeSets = adSetsList.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
      if (activeSets.length > 0) {
        const invalidSet = activeSets.find(s => s.budget === null || s.budget === undefined || Number(s.budget) <= 0)
        if (invalidSet) {
          return {
            success: false,
            error: `กรุณาระบุงบประมาณจัดสรรสำหรับชุดโฆษณา "${invalidSet.name || 'Active Ad Set'}" ให้มากกว่า 0 สำหรับกลยุทธ์ ABO`
          }
        }
      }
      const sumActive = activeSets.reduce((sum, s) => sum + (Number(s.budget) || 0), 0)
      if (sumActive > 0) {
        campaignBudget = sumActive
      } else if (campaignBudget <= 0) {
        return { success: false, error: "กรุณาระบุงบประมาณสำหรับชุดโฆษณาในกลยุทธ์ ABO" }
      }
      adSetsList = adSetsList.map(s => ({
        ...s,
        budgetSource: 'ADSET_MANUAL',
        budgetStatus: 'ACTIVE'
      }))
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

    const targetAudiencePayload = JSON.stringify({
      ...(parsedTargetAudience || {}),
      budgetStrategy: strategy,
      budgetLevel: budgetLevel,
      budgetType: budgetType,
      campaignBudget: campaignBudget,
      currency: data.currency || 'THB',
      budgetNotes: data.budgetNotes || '',
      adSets: adSetsList
    })

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
        budget: campaignBudget,
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(Date.now() + 30 * 86400000),
        status: data.status || 'ACTIVE',
        targetAudience: targetAudiencePayload,
        artworkUrl: data.artworkUrl || null,
        notes: data.notes || null,
        createdBy: user.id,
        budget_strategy: strategy,
        budget_level: budgetLevel,
        budget_type: budgetType,
        campaign_budget: campaignBudget,
        currency: data.currency || 'THB',
        budget_notes: data.budgetNotes || null,
        budget_strategy_effective_at: new Date(),
        budgetStrategy: strategy,
        budgetLevel: budgetLevel,
        budgetType: budgetType,
        campaignBudget: campaignBudget,
        budgetNotes: data.budgetNotes || null,
        budgetStrategyEffectiveAt: new Date()
      },
      include: {
        channel: true,
        objective: true,
        product: true,
        branch: true,
        account: true
      }
    })

    // Record initial history record
    await prisma.adBudgetHistory.create({
      data: {
        campaignId: trimmedCampaignId,
        prevStrategy: null,
        newStrategy: strategy,
        prevBudget: null,
        newBudget: campaignBudget,
        prevBudgetType: null,
        newBudgetType: budgetType,
        effectiveDate: new Date(),
        changedBy: user.id,
        changedByName: user.fullName || user.email || 'User',
        changeNotes: 'สร้างแคมเปญใหม่ (Initial Setup)'
      }
    })

    // Synchronize relational ad_sets table
    for (const s of adSetsList) {
      const sId = s.id || `set_${Date.now()}`
      await prisma.$executeRawUnsafe(`
        INSERT INTO "ad_sets" (
          "id", "adSetId", "campaignId", "name", "targeting", "budget", "allocated_budget", 
          "budget_type", "budget_source", "budget_status", "status", "updated_by", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT ("adSetId") DO UPDATE SET
          "campaignId" = EXCLUDED."campaignId",
          "name" = EXCLUDED."name",
          "targeting" = EXCLUDED."targeting",
          "budget" = EXCLUDED."budget",
          "allocated_budget" = EXCLUDED."allocated_budget",
          "budget_type" = EXCLUDED."budget_type",
          "budget_source" = EXCLUDED."budget_source",
          "budget_status" = EXCLUDED."budget_status",
          "status" = EXCLUDED."status",
          "updated_by" = EXCLUDED."updated_by",
          "updatedAt" = NOW();
      `, sId, s.platformAdSetId || (s.code ? `${trimmedCampaignId}-${s.code}` : sId), trimmedCampaignId, s.name || 'Ad Set', s.targetAudience || 'Broad',
         s.budget ? Number(s.budget) : null, s.budget ? Number(s.budget) : null,
         budgetType, strategy === 'CBO' ? 'CAMPAIGN_AUTO' : 'ADSET_MANUAL',
         strategy === 'CBO' ? 'INACTIVE' : 'ACTIVE', s.status || 'Active', user.id)
    }

    const plainCampaign = {
      ...campaign,
      budget: campaign.budget ? campaign.budget.toNumber() : 0,
      campaignBudget: campaign.campaignBudget ? campaign.campaignBudget.toNumber() : (campaign.budget ? campaign.budget.toNumber() : 0),
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

    const existing = await prisma.adCampaign.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: "ไม่พบแคมเปญที่ต้องการแก้ไข" }
    }

    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      return { success: false, error: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น (End date cannot be before start date)" }
    }

    // Previous strategy & budget baseline
    const prevStrategy = (existing.budgetStrategy || existing.budget_strategy || 'ABO') as 'ABO' | 'CBO'
    const prevBudget = existing.campaignBudget ? existing.campaignBudget.toNumber() : (existing.budget ? existing.budget.toNumber() : 0)
    const prevBudgetType = existing.budgetType || existing.budget_type || 'DAILY'

    const newStrategy: 'ABO' | 'CBO' = data.budgetStrategy || prevStrategy
    const newBudgetType: 'DAILY' | 'LIFETIME' = data.budgetType || prevBudgetType
    const newBudgetLevel: 'CAMPAIGN' | 'AD_SET' = newStrategy === 'CBO' ? 'CAMPAIGN' : 'AD_SET'

    let newBudget = data.campaignBudget !== undefined ? Number(data.campaignBudget) : (data.budget !== undefined ? Number(data.budget) : prevBudget)

    let parsedTargetAudience: any = null
    try {
      const taSource = data.targetAudience !== undefined ? data.targetAudience : existing.targetAudience
      if (taSource && taSource.startsWith('{')) {
        parsedTargetAudience = JSON.parse(taSource)
      }
    } catch {}

    let adSetsList: any[] = Array.isArray(data.adSets) ? data.adSets : (parsedTargetAudience?.adSets || [])

    // Strategy-specific validation & adjustments
    if (newStrategy === 'CBO') {
      if (newBudget <= 0) {
        return { success: false, error: "งบประมาณแคมเปญ (Campaign Budget) ต้องมากกว่า 0 สำหรับกลยุทธ์ CBO" }
      }
      const startDate = data.startDate || existing.startDate
      const endDate = data.endDate || existing.endDate
      if (newBudgetType === 'LIFETIME' && (!startDate || !endDate)) {
        return { success: false, error: "สำหรับงบประมาณแบบ Lifetime ใน CBO จำเป็นต้องระบุทั้งวันที่เริ่มต้นและสิ้นสุด" }
      }
      // When CBO: Ad Set's Allocated Budget value must be saved as NULL, not 0
      adSetsList = adSetsList.map(s => ({
        ...s,
        budget: null,
        allocated_budget: null,
        budgetSource: 'CAMPAIGN_AUTO',
        budgetStatus: 'INACTIVE'
      }))
    } else {
      // ABO Strategy: All active Ad Sets must have an Allocated Budget greater than 0
      const activeSets = adSetsList.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
      if (activeSets.length > 0) {
        const invalidSet = activeSets.find(s => s.budget === null || s.budget === undefined || Number(s.budget) <= 0)
        if (invalidSet) {
          return {
            success: false,
            error: `การเปลี่ยนเป็น ABO หรือบันทึกแคมเปญแบบ ABO จำเป็นต้องระบุงบประมาณสำหรับทุกชุดโฆษณาที่ใช้งานอยู่ (Active) โดย "${invalidSet.name || 'Active Ad Set'}" ยังไม่มีงบประมาณที่ถูกต้อง`
          }
        }
      }
      const sumActive = activeSets.reduce((sum, s) => sum + (Number(s.budget) || 0), 0)
      if (sumActive > 0) {
        newBudget = sumActive
      } else if (newBudget <= 0) {
        return { success: false, error: "กรุณาระบุงบประมาณสำหรับชุดโฆษณาในกลยุทธ์ ABO" }
      }
      adSetsList = adSetsList.map(s => ({
        ...s,
        budgetSource: 'ADSET_MANUAL',
        budgetStatus: 'ACTIVE'
      }))
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

    const targetAudiencePayload = JSON.stringify({
      ...(parsedTargetAudience || {}),
      budgetStrategy: newStrategy,
      budgetLevel: newBudgetLevel,
      budgetType: newBudgetType,
      campaignBudget: newBudget,
      currency: data.currency || existing.currency || 'THB',
      budgetNotes: data.budgetNotes !== undefined ? data.budgetNotes : (existing.budgetNotes || ''),
      adSets: adSetsList
    })

    const isStrategyChanged = newStrategy !== prevStrategy
    const isBudgetChanged = Math.abs(newBudget - prevBudget) > 0.01
    const isTypeChanged = newBudgetType !== prevBudgetType

    // Record history if strategy or budget amount changed
    if (isStrategyChanged || isBudgetChanged || isTypeChanged) {
      let changeNote = data.changeNotes || ''
      if (!changeNote) {
        if (isStrategyChanged) {
          changeNote = `เปลี่ยนกลยุทธ์จาก ${prevStrategy} เป็น ${newStrategy}`
        } else if (isBudgetChanged) {
          changeNote = `ปรับเปลี่ยนงบประมาณจาก ฿${prevBudget.toLocaleString()} เป็น ฿${newBudget.toLocaleString()}`
        } else {
          changeNote = `ปรับเปลี่ยนประเภทงบประมาณจาก ${prevBudgetType} เป็น ${newBudgetType}`
        }
      }

      await prisma.adBudgetHistory.create({
        data: {
          campaignId: trimmedCampaignId || existing.campaignId,
          prevStrategy,
          newStrategy,
          prevBudget,
          newBudget,
          prevBudgetType,
          newBudgetType,
          effectiveDate: new Date(),
          changedBy: user.id,
          changedByName: user.fullName || user.email || 'User',
          changeNotes: changeNote
        }
      })
    }

    const updatePayload: any = {
      ...data,
      budget: newBudget,
      campaignBudget: newBudget,
      campaign_budget: newBudget,
      budgetStrategy: newStrategy,
      budget_strategy: newStrategy,
      budgetLevel: newBudgetLevel,
      budget_level: newBudgetLevel,
      budgetType: newBudgetType,
      budget_type: newBudgetType,
      budgetNotes: data.budgetNotes !== undefined ? data.budgetNotes : existing.budgetNotes,
      budget_notes: data.budgetNotes !== undefined ? data.budgetNotes : existing.budgetNotes,
      targetAudience: targetAudiencePayload,
      updatedBy: user.id
    }

    if (isStrategyChanged) {
      updatePayload.budgetStrategyEffectiveAt = new Date()
      updatePayload.budget_strategy_effective_at = new Date()
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

    // Synchronize relational ad_sets table
    const currentCampId = trimmedCampaignId || existing.campaignId
    for (const s of adSetsList) {
      const sId = s.id || `set_${Date.now()}`
      await prisma.$executeRawUnsafe(`
        INSERT INTO "ad_sets" (
          "id", "adSetId", "campaignId", "name", "targeting", "budget", "allocated_budget", 
          "budget_type", "budget_source", "budget_status", "status", "updated_by", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT ("adSetId") DO UPDATE SET
          "campaignId" = EXCLUDED."campaignId",
          "name" = EXCLUDED."name",
          "targeting" = EXCLUDED."targeting",
          "budget" = EXCLUDED."budget",
          "allocated_budget" = EXCLUDED."allocated_budget",
          "budget_type" = EXCLUDED."budget_type",
          "budget_source" = EXCLUDED."budget_source",
          "budget_status" = EXCLUDED."budget_status",
          "status" = EXCLUDED."status",
          "updated_by" = EXCLUDED."updated_by",
          "updatedAt" = NOW();
      `, sId, s.platformAdSetId || (s.code ? `${currentCampId}-${s.code}` : sId), currentCampId, s.name || 'Ad Set', s.targetAudience || 'Broad',
         s.budget ? Number(s.budget) : null, s.budget ? Number(s.budget) : null,
         newBudgetType, newStrategy === 'CBO' ? 'CAMPAIGN_AUTO' : 'ADSET_MANUAL',
         newStrategy === 'CBO' ? 'INACTIVE' : 'ACTIVE', s.status || 'Active', user.id)
    }

    const plainCampaign = {
      ...campaign,
      budget: campaign.budget ? campaign.budget.toNumber() : 0,
      campaignBudget: campaign.campaignBudget ? campaign.campaignBudget.toNumber() : (campaign.budget ? campaign.budget.toNumber() : 0),
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


