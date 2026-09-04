import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import prisma from '@/app/lib/db'
import MarketingDashboardClient from './MarketingDashboardClient'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export const getThaiBranchName = (branch: string | null | undefined): string => {
  if (!branch) return 'ไม่ระบุสาขา'
  const map: Record<string, string> = {
    'BKK-HQ': 'สำนักงานใหญ่ (BKK-HQ)',
    'KK01': 'ขอนแก่น (KK01)',
    'PSNL01': 'พิษณุโลก (PSNL01)',
    'CMI01': 'เชียงใหม่ (CMI01)',
    'KRI01': 'กาญจนบุรี (KRI01)',
    'UB01': 'อุบลราชธานี (UB01)',
    'SRT01': 'สุราษฎร์ธานี (SRT01)',
    'UDN01': 'อุดรธานี (UDN01)',
    'SRN01': 'สุรินทร์ (SRN01)',
    'ROI01': 'ร้อยเอ็ด (ROI01)',
    'SN01': 'สกลนคร (SN01)',
    'NRT': 'นครราชสีมา (NRT)',
    'BKK-WH': 'Tera Warehouse 62',
    'SMK': 'สมุทรสาคร (SMK)'
  }
  return map[branch] || branch
}

export const normalizeProductType = (type: string | null | undefined): string => {
  if (!type) return 'Other'
  const trimmed = type.trim()
  const lower = trimmed.toLowerCase()
  if (lower === 'inverter veichi' || lower.includes('veichi')) return 'Inverter Veichi'
  if (lower === 'inverter other' || lower === 'inverter' || lower === 'inverter powtran') return 'Inverter Other'
  if (lower === 'solar pump' || lower.includes('solar pump')) return 'Solar Pump'
  if (lower === 'solar roof' || lower.includes('solar roof')) return 'Solar Roof'
  if (lower === 'motor') return 'Motor'
  if (lower === 'pump') return 'Pump'
  if (lower.includes('mdb') || lower.includes('db') || lower === 'control') return 'MDB/DB'
  if (lower === 'part') return 'Part'
  if (lower === 'อื่นๆ' || lower === 'other') return 'Other'
  return trimmed
}

export const normalizeChannel = (ch: string | null | undefined): string => {
  if (!ch) return 'ไม่ระบุ'
  const lower = ch.toLowerCase()
  if (lower.includes('facebook') || lower.includes('เฟส')) return 'Facebook'
  if (lower.includes('line') || lower.includes('ไลน์')) return 'LINE'
  if (lower.includes('google') || lower.includes('กูเกิล')) return 'Google'
  if (lower.includes('tiktok') || lower.includes('ติ๊กต็อก')) return 'TikTok'
  if (lower.includes('walk') || lower.includes('หน้าร้าน')) return 'Walk-in'
  if (lower.includes('website') || lower.includes('เว็บ')) return 'Website'
  if (lower.includes('telesale') || lower.includes('เทเล')) return 'Telesale'
  return ch.split('|')[0].trim()
}

export default async function MarketingDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const resolvedParams = await searchParams
  
  // Default to current month
  const today = new Date()
  const defaultStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const defaultEnd = format(endOfMonth(today), 'yyyy-MM-dd')
  
  const startDateStr = typeof resolvedParams.startDate === 'string' ? resolvedParams.startDate : defaultStart
  const endDateStr = typeof resolvedParams.endDate === 'string' ? resolvedParams.endDate : defaultEnd
  const selectedBranch = typeof resolvedParams.branch === 'string' ? resolvedParams.branch : ''
  const selectedSalespersonId = typeof resolvedParams.salespersonId === 'string' ? resolvedParams.salespersonId : ''
  const selectedProductGroup = typeof resolvedParams.productGroup === 'string' ? resolvedParams.productGroup : ''

  const startDate = new Date(`${startDateStr}T00:00:00+07:00`)
  const endDate = new Date(`${endDateStr}T23:59:59.999+07:00`)

  // Fetch quotations within date range
  const rawQuotations = await prisma.quotation.findMany({
    where: {
      salespersonId: {
        not: 'cmq7iv42y000004l496tyrofk' // Exclude test account Mr. Teerawat Pokphet
      },
      OR: [
        { quotationDate: { gte: startDate, lte: endDate } },
        { quotationDate: null, createdAt: { gte: startDate, lte: endDate } }
      ]
    },
    include: {
      salesperson: {
        select: {
          id: true,
          fullName: true
        }
      },
      company: {
        select: {
          customerAccessChannel: true
        }
      }
    }
  })

  // Build filter options list
  const branchMap: Record<string, string> = {
    'BKK-HQ': 'สำนักงานใหญ่ (BKK-HQ)',
    'KK01': 'ขอนแก่น (KK01)',
    'PSNL01': 'พิษณุโลก (PSNL01)',
    'CMI01': 'เชียงใหม่ (CMI01)',
    'KRI01': 'กาญจนบุรี (KRI01)',
    'UB01': 'อุบลราชธานี (UB01)',
    'SRT01': 'สุราษฎร์ธานี (SRT01)',
    'UDN01': 'อุดรธานี (UDN01)',
    'SRN01': 'สุรินทร์ (SRN01)',
    'ROI01': 'ร้อยเอ็ด (ROI01)',
    'SN01': 'สกลนคร (SN01)',
    'NRT': 'นครราชสีมา (NRT)',
    'SMK': 'สมุทรสาคร (SMK)'
  }
  const salespersonMap: Record<string, string> = {}
  const productGroupSet = new Set<string>([
    'Inverter Veichi',
    'Inverter Other',
    'Solar Pump',
    'Solar Roof',
    'Motor',
    'Pump',
    'MDB/DB',
    'Part',
    'Other'
  ])

  rawQuotations.forEach(q => {
    if (q.salesBranch && !branchMap[q.salesBranch]) {
      branchMap[q.salesBranch] = getThaiBranchName(q.salesBranch)
    }
    if (q.salesperson?.id && q.salesperson?.fullName) {
      salespersonMap[q.salesperson.id] = q.salesperson.fullName
    }
    if (q.productType) {
      productGroupSet.add(normalizeProductType(q.productType))
    }
  })

  const availableBranches = Object.entries(branchMap)
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'th'))

  const availableSalespeople = Object.entries(salespersonMap)
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))

  const availableProductGroups = Array.from(productGroupSet).sort((a, b) => a.localeCompare(b))

  // Apply filters
  const quotations = rawQuotations.filter(q => {
    if (selectedBranch && q.salesBranch !== selectedBranch) return false
    if (selectedSalespersonId && q.salespersonId !== selectedSalespersonId) return false
    if (selectedProductGroup && normalizeProductType(q.productType) !== selectedProductGroup) return false
    return true
  })

  // Group and count by customerAccessChannel and status
  const sourceStats: Record<string, { count: number; sales: number }> = {}
  const statusStats: Record<string, { count: number; sales: number }> = {}
  
  quotations.forEach(quotation => {
    const channel = normalizeChannel(quotation.company?.customerAccessChannel)
    const amount = quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0

    if (!sourceStats[channel]) sourceStats[channel] = { count: 0, sales: 0 }
    sourceStats[channel].count += 1
    sourceStats[channel].sales += amount

    const status = quotation.status || 'Unknown'
    if (!statusStats[status]) statusStats[status] = { count: 0, sales: 0 }
    statusStats[status].count += 1
    statusStats[status].sales += amount
  })

  const chartData = Object.entries(sourceStats)
    .map(([name, stats]) => ({ name, value: stats.count, sales: stats.sales }))
    .sort((a, b) => b.value - a.value)

  const statusData = Object.entries(statusStats)
    .map(([name, stats]) => ({ name, value: stats.count, sales: stats.sales }))
    .sort((a, b) => b.sales - a.sales)

  // 1. Channel vs Status Matrix
  const crossStats: Record<string, Record<string, { count: number; sales: number }>> = {}
  quotations.forEach(quotation => {
    const channel = normalizeChannel(quotation.company?.customerAccessChannel)
    const status = quotation.status || 'Unknown'
    const amount = quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0

    if (!crossStats[channel]) crossStats[channel] = {}
    if (!crossStats[channel][status]) crossStats[channel][status] = { count: 0, sales: 0 }
    crossStats[channel][status].count += 1
    crossStats[channel][status].sales += amount
  })

  const allStatuses: string[] = Array.from(new Set<string>(quotations.map(q => q.status || 'Unknown'))).sort()
  const crossData = Object.entries(crossStats).map(([channel, statusObj]) => ({
    channel,
    statuses: statusObj
  })).sort((a, b) => a.channel.localeCompare(b.channel))

  // 2. Channel vs Branch Matrix (Reconciliation between Ads Channels & Branches)
  const channelBranchStats: Record<string, Record<string, { count: number; sales: number }>> = {}
  const branchTotals: Record<string, { count: number; sales: number }> = {}

  quotations.forEach(quotation => {
    const channel = normalizeChannel(quotation.company?.customerAccessChannel)
    const branchCode = quotation.salesBranch || 'UNSPECIFIED'
    const amount = quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0

    if (!channelBranchStats[channel]) channelBranchStats[channel] = {}
    if (!channelBranchStats[channel][branchCode]) channelBranchStats[channel][branchCode] = { count: 0, sales: 0 }
    channelBranchStats[channel][branchCode].count += 1
    channelBranchStats[channel][branchCode].sales += amount

    if (!branchTotals[branchCode]) branchTotals[branchCode] = { count: 0, sales: 0 }
    branchTotals[branchCode].count += 1
    branchTotals[branchCode].sales += amount
  })

  // Distinct branches present in filtered quotations
  const activeBranchCodes = Object.keys(branchTotals).sort((a, b) => {
    const labelA = a === 'UNSPECIFIED' ? 'ไม่ระบุสาขา' : getThaiBranchName(a)
    const labelB = b === 'UNSPECIFIED' ? 'ไม่ระบุสาขา' : getThaiBranchName(b)
    return labelA.localeCompare(labelB, 'th')
  })

  const channelBranchData = Object.entries(channelBranchStats).map(([channel, bObj]) => {
    let channelTotalCount = 0
    let channelTotalSales = 0
    Object.values(bObj).forEach(val => {
      channelTotalCount += val.count
      channelTotalSales += val.sales
    })
    return {
      channel,
      branches: bObj,
      totalCount: channelTotalCount,
      totalSales: channelTotalSales
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  // 3. Channel vs Product Group Matrix (Which product groups from each channel)
  const channelProductStats: Record<string, Record<string, { count: number; sales: number }>> = {}
  const productTotals: Record<string, { count: number; sales: number }> = {}

  quotations.forEach(quotation => {
    const channel = normalizeChannel(quotation.company?.customerAccessChannel)
    const pGroup = normalizeProductType(quotation.productType)
    const amount = quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0

    if (!channelProductStats[channel]) channelProductStats[channel] = {}
    if (!channelProductStats[channel][pGroup]) channelProductStats[channel][pGroup] = { count: 0, sales: 0 }
    channelProductStats[channel][pGroup].count += 1
    channelProductStats[channel][pGroup].sales += amount

    if (!productTotals[pGroup]) productTotals[pGroup] = { count: 0, sales: 0 }
    productTotals[pGroup].count += 1
    productTotals[pGroup].sales += amount
  })

  const activeProductGroups = Object.keys(productTotals).sort((a, b) => (productTotals[b].sales - productTotals[a].sales))

  const channelProductData = Object.entries(channelProductStats).map(([channel, pObj]) => {
    let channelTotalCount = 0
    let channelTotalSales = 0
    Object.values(pObj).forEach(val => {
      channelTotalCount += val.count
      channelTotalSales += val.sales
    })
    return {
      channel,
      productGroups: pObj,
      totalCount: channelTotalCount,
      totalSales: channelTotalSales
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  const totalSales = chartData.reduce((acc, curr) => acc + curr.sales, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">แดชบอร์ดการตลาด</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            ภาพรวมช่องทางการเข้าถึงลูกค้า, การกระจายตัวตามสาขา และกลุ่มสินค้า
          </p>
        </div>
      </div>

      <MarketingDashboardClient 
        initialData={chartData} 
        statusData={statusData}
        crossData={crossData}
        allStatuses={allStatuses}
        channelBranchData={channelBranchData}
        activeBranchCodes={activeBranchCodes}
        branchTotals={branchTotals}
        channelProductData={channelProductData}
        activeProductGroups={activeProductGroups}
        productTotals={productTotals}
        availableBranches={availableBranches}
        availableSalespeople={availableSalespeople}
        availableProductGroups={availableProductGroups}
        selectedBranch={selectedBranch}
        selectedSalespersonId={selectedSalespersonId}
        selectedProductGroup={selectedProductGroup}
        startDate={startDateStr}  
        endDate={endDateStr} 
        totalCompanies={quotations.length}
        totalSales={totalSales}
      />
    </div>
  )
}
