'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'

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
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  const allowedRoles = ['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor', 'Editor', 'ผู้จัดการฝ่ายการตลาด', 'การตลาด', 'แอดมิน'];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to create campaigns")
  }

  if (data.endDate < data.startDate) {
    throw new Error("End date cannot be before start date")
  }

  if (data.budget < 0) {
    throw new Error("Budget cannot be negative")
  }

  // Duplicate checks
  const existingPlatform = await prisma.adCampaign.findUnique({ where: { campaignId: data.campaignId } })
  if (existingPlatform) throw new Error("Platform Campaign ID already exists")

  if (data.internalCode) {
    const existingInternal = await prisma.adCampaign.findUnique({ where: { internalCode: data.internalCode } })
    if (existingInternal) throw new Error("Internal Campaign Code already exists")
  }

  const campaign = await prisma.adCampaign.create({
    data: {
      campaignId: data.campaignId,
      name: data.name,
      channelId: data.channelId,
      productCategory: data.productCategory,
      branchId: data.branchId,
      objectiveId: data.objectiveId,
      accountId: data.accountId,
      internalCode: data.internalCode,
      budget: data.budget,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'ACTIVE',
      targetAudience: data.targetAudience,
      artworkUrl: data.artworkUrl,
      notes: data.notes,
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
}

export async function updateCampaign(id: string, data: Partial<any>) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  const allowedRoles = ['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor', 'Editor', 'ผู้จัดการฝ่ายการตลาด', 'การตลาด', 'แอดมิน'];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to edit campaigns")
  }

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    throw new Error("End date cannot be before start date")
  }

  if (data.campaignId) {
    const existingPlatform = await prisma.adCampaign.findFirst({ where: { campaignId: data.campaignId, id: { not: id } } })
    if (existingPlatform) throw new Error("Platform Campaign ID already exists")
  }

  if (data.internalCode) {
    const existingInternal = await prisma.adCampaign.findFirst({ where: { internalCode: data.internalCode, id: { not: id } } })
    if (existingInternal) throw new Error("Internal Campaign Code already exists")
  }

  const campaign = await prisma.adCampaign.update({
    where: { id },
    data: {
      ...data,
      updatedBy: user.id
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
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
  const allowedRoles = ['Admin', 'SUPER_ADMIN', 'Marketing Manager', 'Marketing Editor', 'Editor', 'ผู้จัดการฝ่ายการตลาด', 'การตลาด', 'แอดมิน'];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient privileges to delete campaigns")
  }

  const campaign = await prisma.adCampaign.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: user.id
    }
  })

  revalidatePath('/marketing/ads/campaigns')
  return { success: true }
}
