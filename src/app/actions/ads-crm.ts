'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'

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
