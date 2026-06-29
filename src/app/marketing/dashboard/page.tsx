import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import prisma from '@/app/lib/db'
import MarketingDashboardClient from './MarketingDashboardClient'
import { format, startOfMonth, endOfMonth } from 'date-fns'

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

  const startDate = new Date(`${startDateStr}T00:00:00+07:00`)
  const endDate = new Date(`${endDateStr}T23:59:59.999+07:00`)

  // Fetch quotations created within this date range
  const quotations = await prisma.quotation.findMany({
    where: {
      OR: [
        { quotationDate: { gte: startDate, lte: endDate } },
        { quotationDate: null, createdAt: { gte: startDate, lte: endDate } }
      ]
    },
    include: {
      company: {
        select: {
          customerAccessChannel: true
        }
      }
    }
  })

  // Helper function to consolidate channels
  const normalizeChannel = (ch: string | null | undefined) => {
    if (!ch) return 'ไม่ระบุ'
    const lower = ch.toLowerCase()
    if (lower.includes('facebook') || lower.includes('เฟส')) return 'Facebook'
    if (lower.includes('line') || lower.includes('ไลน์')) return 'LINE'
    if (lower.includes('google') || lower.includes('กูเกิล')) return 'Google'
    if (lower.includes('tiktok') || lower.includes('ติ๊กต็อก')) return 'TikTok'
    if (lower.includes('walk') || lower.includes('หน้าร้าน')) return 'Walk-in'
    
    // For other cases, just take the part before '|' if it exists
    return ch.split('|')[0].trim()
  }

  // Group and count by customerAccessChannel and status
  const sourceStats: Record<string, { count: number; sales: number }> = {}
  const statusStats: Record<string, { count: number; sales: number }> = {}
  
  quotations.forEach(quotation => {
    const channel = normalizeChannel(quotation.company?.customerAccessChannel)
    if (!sourceStats[channel]) sourceStats[channel] = { count: 0, sales: 0 }
    sourceStats[channel].count += 1
    sourceStats[channel].sales += (quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0)

    const status = quotation.status || 'Unknown'
    if (!statusStats[status]) statusStats[status] = { count: 0, sales: 0 }
    statusStats[status].count += 1
    statusStats[status].sales += (quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0)
  })

  const chartData = Object.entries(sourceStats)
    .map(([name, stats]) => ({ name, value: stats.count, sales: stats.sales }))
    .sort((a, b) => b.value - a.value)

  const statusData = Object.entries(statusStats)
    .map(([name, stats]) => ({ name, value: stats.count, sales: stats.sales }))
    .sort((a, b) => b.sales - a.sales)

  // Generate cross table data (Channel vs Status)
  const crossStats: Record<string, Record<string, { count: number; sales: number }>> = {}
  quotations.forEach(quotation => {
    const channel = normalizeChannel(quotation.company?.customerAccessChannel)
    const status = quotation.status || 'Unknown'
    if (!crossStats[channel]) crossStats[channel] = {}
    if (!crossStats[channel][status]) crossStats[channel][status] = { count: 0, sales: 0 }
    crossStats[channel][status].count += 1
    crossStats[channel][status].sales += (quotation.totalAmountBeforeVat || quotation.salesBeforeVat || 0)
  })

  const allStatuses = Array.from(new Set(quotations.map(q => q.status || 'Unknown'))).sort()
  const crossData = Object.entries(crossStats).map(([channel, statusObj]) => ({
    channel,
    statuses: statusObj
  })).sort((a, b) => a.channel.localeCompare(b.channel))

  const totalSales = chartData.reduce((acc, curr) => acc + curr.sales, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">แดชบอร์ดการตลาด</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            ภาพรวมช่องทางการเข้าถึงลูกค้า
          </p>
        </div>
      </div>

      <MarketingDashboardClient 
        initialData={chartData} 
        statusData={statusData}
        crossData={crossData}
        allStatuses={allStatuses}
        startDate={startDateStr}  
        endDate={endDateStr} 
        totalCompanies={quotations.length}
        totalSales={totalSales}
      />
    </div>
  )
}
