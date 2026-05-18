import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import DashboardUI from '@/app/components/DashboardUI';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await getUser();
  if (!user) redirect('/');

  const searchParams = await props.searchParams;
  const rawSalespersonId = typeof searchParams.salespersonId === 'string' ? searchParams.salespersonId : undefined;
  const salespersonIds = rawSalespersonId ? rawSalespersonId.split(',') : [];
  const province = typeof searchParams.province === 'string' ? searchParams.province : undefined;
  const atRiskDays = typeof searchParams.atRiskDays === 'string' ? parseInt(searchParams.atRiskDays) : 60;

  const today = new Date();

  // Bangkok timezone offset helper (UTC+7)
  const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
  // Converts a YYYY-MM-DD string to Bangkok midnight in UTC
  const bkkStartOfDay = (dateStr: string) => new Date(`${dateStr}T00:00:00+07:00`);
  const bkkEndOfDay = (dateStr: string) => new Date(`${dateStr}T23:59:59.999+07:00`);
  // Converts a UTC Date to YYYY-MM-DD in Bangkok timezone (for display)
  const toBkkDateStr = (d: Date) => {
    const bkk = new Date(d.getTime() + BKK_OFFSET_MS);
    return bkk.toISOString().split('T')[0];
  };

  // Date Filtering Logic (Range or Month/Year)
  let filterStart: Date;
  let filterEnd: Date;

  if (typeof searchParams.startDate === 'string' && typeof searchParams.endDate === 'string') {
    filterStart = bkkStartOfDay(searchParams.startDate);
    filterEnd = bkkEndOfDay(searchParams.endDate);
  } else {
    const month = typeof searchParams.month === 'string' ? parseInt(searchParams.month) : today.getMonth() + 1;
    const year = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : today.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');
    
    // Default to Month-To-Date (MTD) if viewing current month/year
    const isCurrentMonth = month === (today.getMonth() + 1) && year === today.getFullYear();
    const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
    
    filterStart = bkkStartOfDay(`${year}-${pad(month)}-01`);
    filterEnd = bkkEndOfDay(`${year}-${pad(month)}-${pad(lastDay)}`);
  }

  const isManager = user.role === 'ผู้จัดการ';
  const thirtyDaysAgoFilter = new Date(filterEnd.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  // 1. Calculate relative date ranges
  const refDate = filterEnd;
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  
  // QTD
  const qStartMonth = Math.floor(refMonth / 3) * 3;
  const qtdStart = new Date(refYear, qStartMonth, 1);
  // YTD
  const ytdStart = new Date(refYear, 0, 1);
  
  // Previous Period (MoM or based on current filter duration)
  const durationMs = filterEnd.getTime() - filterStart.getTime();
  const prevPeriodStart = new Date(filterStart.getTime() - durationMs - 1);
  const prevPeriodEnd = new Date(filterEnd.getTime() - durationMs - 1);
  
  // Same Period Last Year (YoY)
  const yoyStart = new Date(filterStart); yoyStart.setFullYear(yoyStart.getFullYear() - 1);
  const yoyEnd = new Date(filterEnd); yoyEnd.setFullYear(yoyEnd.getFullYear() - 1);

  // 0. Fetch only subordinates
  const salesReps = isManager ? await prisma.user.findMany({
    select: { 
      id: true, 
      fullName: true, 
      role: true,
      employeeSale: {
        select: {
          branch: true,
          position: true
        }
      }
    },
    where: {
      employeeSale: { teamLeader: user.fullName },
      id: { not: user.id },
      isActive: true
    }
  }) : [];

  const subordinateIds = salesReps.map((r: { id: string }) => r.id);
  const filterIds = isManager 
    ? (salespersonIds.length > 0 ? salespersonIds : subordinateIds) 
    : [user.id];

  // Centralized Probabilities Configuration for Pipeline Stages
  const PIPELINE_PROBABILITIES = {
    target: 0.1,       // ความสนใจ
    quotation: 0.2,    // ใบเสนอราคา
    negotiation: 0.6,  // เจรจาต่อรอง
    closing: 1.0       // ปิดการขาย
  };

  // TODO: Change to actual data when the accounting system is ready.
  const PRODUCT_MARGINS: Record<string, number> = {
    'Solar Roof': 15,       // Solar Roof has low margin e.g. 15% due to hardware/panel costs
    'Inverter Veichi': 38,   // Veichi Inverter has high margin e.g. 38%
    'Motor': 30,             // Motor has 30%
    'Pump': 22,              // Pump has moderate margin e.g. 22%
    'อื่นๆ': 25,              // Others default is 25%
  };

  // Parallel data fetching for all metrics
  const [
    quotationSummary,
    pendingAgg,
    prevPeriodAgg,
    yoyPeriodAgg,
    qtdAgg,
    ytdAgg,
    recentQ,
    nextM,
    allUsersCount,
    monthlyTargetResult,
    historyQuotations,
    historyTelesales,
    productMix,
    analyticalData,
    allProvinces,
    prevPeriodQuotations,
    allTimeWonQuotations,
    sixMonthTargets,
    prevPeriodHistoryQuotations
  ] = await Promise.all([
    // 1. Grouped Quotation Metrics (Filtered Range)
    prisma.quotation.groupBy({
      by: ['status'],
      _sum: { actualClosingAmount: true, totalAmountBeforeVat: true },
      _count: { id: true },
      where: { 
        salespersonId: { in: filterIds }, 
        createdAt: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : undefined
      }
    }),
    // 2. Pending > 30 days
    prisma.quotation.aggregate({
      _sum: { totalAmountBeforeVat: true },
      _count: { id: true },
      where: {
        salespersonId: { in: filterIds },
        status: { notIn: ['เปิดบิลแล้ว', 'ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ปฏิเสธ-อื่นๆ', 'ยกเลิก-Revise'] },
        createdAt: { lt: thirtyDaysAgoFilter },
        company: province ? { province } : undefined
      },
    }),
    // 3. Previous Period for MoM
    prisma.quotation.aggregate({
      _sum: { actualClosingAmount: true, totalAmountBeforeVat: true },
      where: { 
        salespersonId: { in: filterIds }, 
        OR: [
          { status: 'เปิดบิลแล้ว' },
          { status: { startsWith: 'PO' } }
        ],
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
        company: province ? { province } : undefined
      },
    }),
    // 4. Same Period Last Year for YoY
    prisma.quotation.aggregate({
      _sum: { actualClosingAmount: true, totalAmountBeforeVat: true },
      where: { 
        salespersonId: { in: filterIds }, 
        OR: [
          { status: 'เปิดบิลแล้ว' },
          { status: { startsWith: 'PO' } }
        ],
        createdAt: { gte: yoyStart, lte: yoyEnd },
        company: province ? { province } : undefined
      },
    }),
    // 5. QTD Revenue
    prisma.quotation.aggregate({
      _sum: { actualClosingAmount: true, totalAmountBeforeVat: true },
      where: { 
        salespersonId: { in: filterIds }, 
        OR: [
          { status: 'เปิดบิลแล้ว' },
          { status: { startsWith: 'PO' } }
        ],
        createdAt: { gte: qtdStart, lte: filterEnd },
        company: province ? { province } : undefined
      },
    }),
    // 6. YTD Revenue
    prisma.quotation.aggregate({
      _sum: { actualClosingAmount: true, totalAmountBeforeVat: true },
      where: { 
        salespersonId: { in: filterIds }, 
        OR: [
          { status: 'เปิดบิลแล้ว' },
          { status: { startsWith: 'PO' } }
        ],
        createdAt: { gte: ytdStart, lte: filterEnd },
        company: province ? { province } : undefined
      },
    }),
    // 7. Recent activities
    prisma.quotation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { 
        salespersonId: { in: filterIds }, 
        createdAt: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : undefined
      },
      include: { company: true },
    }),
    // 8. Next meetings
    prisma.telesale.findMany({
      where: { 
        userId: { in: filterIds }, 
        lastMeetingDate: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : undefined
      },
      take: 4,
      orderBy: { lastMeetingDate: 'asc' },
      include: { company: true },
    }),
    // 9. Users count
    isManager ? prisma.user.count({ where: { employeeSale: { teamLeader: user.fullName }, id: { not: user.id } } }) : Promise.resolve(1),
    // 10. Monthly Targets (Fetch for entire year to calculate QTD/YTD targets)
    (prisma as any)['monthlyTarget'] ? (prisma as any)['monthlyTarget'].findMany({
      where: { year: refYear, userId: { in: filterIds } }
    }) : Promise.resolve([]),
    // 11. History Quotations
    prisma.quotation.findMany({
      where: { 
        salespersonId: { in: filterIds }, 
        createdAt: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : undefined
      },
      select: { createdAt: true, status: true, actualClosingAmount: true, totalAmountBeforeVat: true, salespersonId: true }
    }),
    // 12. History Telesales
    prisma.telesale.findMany({
      where: { 
        userId: { in: filterIds }, 
        createdAt: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : undefined
      },
      select: { createdAt: true, lastMeetingDate: true, userId: true }
    }),
    // 13. Product Mix
    prisma.quotation.groupBy({
      by: ['productType'],
      _sum: { actualClosingAmount: true, totalAmountBeforeVat: true },
      _count: { id: true },
      where: { 
        salespersonId: { in: filterIds }, 
        OR: [
          { status: 'เปิดบิลแล้ว' },
          { status: { startsWith: 'PO' } }
        ],
        createdAt: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : undefined
      }
    }),
    // 14. Detailed Analytical Data
    prisma.quotation.findMany({
      where: { 
        salespersonId: { in: filterIds }, 
        createdAt: { gte: filterStart, lte: filterEnd },
        company: province ? { province } : { province: { not: null } }
      },
      include: { 
        company: true, 
        contact: true,
        salesperson: {
          include: {
            employeeSale: true
          }
        }
      }
    }),
    // 15. Count of companies grouped by province for potential and filter list
    prisma.company.groupBy({
      by: ['province'],
      _count: { id: true },
      where: { province: { not: null } }
    }),
    // 16. Previous Period Quotations for Sales Cycle & Flow Benchmarks
    prisma.quotation.findMany({
      where: {
        salespersonId: { in: filterIds },
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
        company: province ? { province } : undefined
      },
      select: { createdAt: true, status: true, billingDate: true, poDate: true, updatedAt: true, totalAmountBeforeVat: true, quotationDate: true }
    }),
    // 17. All-time Won Quotations for Customer Lifetime Analytics (CLV, At-Risk, New vs Existing)
    prisma.quotation.findMany({
      where: {
        salespersonId: { in: filterIds },
        OR: [
          { status: 'เปิดบิลแล้ว' },
          { status: { startsWith: 'PO' } }
        ],
      },
      select: {
        id: true,
        companyId: true,
        actualClosingAmount: true,
        totalAmountBeforeVat: true,
        billingDate: true,
        createdAt: true,
        productType: true,
        salespersonId: true,
        company: { select: { companyName: true, province: true } }
      },
      orderBy: { createdAt: 'asc' }
    }),
    // 18. MonthlyTargets for last 6 months (Forecast Accuracy)
    (prisma as any)['monthlyTarget'] ? (prisma as any)['monthlyTarget'].findMany({
      where: {
        year: { in: [refYear, refYear - 1] },
        userId: { in: filterIds }
      }
    }) : Promise.resolve([]),
    // 19. Previous Period daily quotations for MoM overlay
    prisma.quotation.findMany({
      where: {
        salespersonId: { in: filterIds },
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
        company: province ? { province } : undefined
      },
      select: { createdAt: true, status: true, actualClosingAmount: true, totalAmountBeforeVat: true }
    })
  ]);

  // --- Processing Logic ---
  
  const wonGroup = (quotationSummary as any[]).find(g => g.status === 'เปิดบิลแล้ว');
  const wonVal = wonGroup?._sum.actualClosingAmount ?? wonGroup?._sum.totalAmountBeforeVat ?? 0;
  const wonCount = wonGroup?._count.id ?? 0;

  const pipelineGroups = (quotationSummary as any[]).filter(g =>
    !['เปิดบิลแล้ว', 'ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ปฏิเสธ-อื่นๆ', 'ยกเลิก-Revise'].includes(g.status || '')
  );
  const pipelineVal = pipelineGroups.reduce((acc, g) => acc + (g._sum.totalAmountBeforeVat ?? 0), 0);
  const pipelineCount = pipelineGroups.reduce((acc, g) => acc + (g._count.id ?? 0), 0);

  const lostGroups = (quotationSummary as any[]).filter(g => g.status?.startsWith('ปฏิเสธ') || g.status?.startsWith('ยกเลิก'));
  const lostVal = lostGroups.reduce((acc, g) => acc + (g._sum.totalAmountBeforeVat ?? 0), 0);
  const lostCount = lostGroups.reduce((acc, g) => acc + (g._count.id ?? 0), 0);

  // Growth Calculations
  const prevVal = prevPeriodAgg._sum.actualClosingAmount ?? prevPeriodAgg._sum.totalAmountBeforeVat ?? 0;
  const momGrowth = prevVal > 0 ? ((wonVal - prevVal) / prevVal) * 100 : 0;

  const yoyVal = yoyPeriodAgg._sum.actualClosingAmount ?? yoyPeriodAgg._sum.totalAmountBeforeVat ?? 0;
  const yoyGrowth = yoyVal > 0 ? ((wonVal - yoyVal) / yoyVal) * 100 : 0;

  // QTD/YTD Revenue
  const qtdRevenue = qtdAgg._sum.actualClosingAmount ?? qtdAgg._sum.totalAmountBeforeVat ?? 0;
  const ytdRevenue = ytdAgg._sum.actualClosingAmount ?? ytdAgg._sum.totalAmountBeforeVat ?? 0;

  // Target Achievement
  const currentMonth = refMonth + 1;
  const currentQuarterMonths = [qStartMonth + 1, qStartMonth + 2, qStartMonth + 3];
  
  const targetMTD = (monthlyTargetResult as any[])
    .filter(t => t.month === currentMonth)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const targetQTD = (monthlyTargetResult as any[])
    .filter(t => currentQuarterMonths.includes(t.month))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const achMTD = targetMTD > 0 ? (wonVal / targetMTD) * 100 : 0;
  const achQTD = targetQTD > 0 ? (qtdRevenue / targetQTD) * 100 : 0;

  // Funnel & Conversion Rates
  const totalLeads = historyTelesales.length;
  const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
  const avgTicketSize = wonCount > 0 ? wonVal / wonCount : 0;

  // Categorical Data Processing & Enriched Aggregations
  const lostReasonMap: Record<string, { name: string, value: number, lostValue: number }> = {};
  const regionalMetrics: Record<string, { name: string, value: number, activeCompanies: Set<string> }> = {};
  const bizTypePipelineMap: Record<string, number> = {};
  const bizTypeWonMap: Record<string, number> = {};
  const segmentMap: Record<string, number> = {};
  let lostDealsWithoutReasonCount = 0;

  // Loss Reason Breakdowns
  const lostReasonsByProduct: Record<string, Record<string, number>> = {};
  const lostReasonsBySalesperson: Record<string, Record<string, number>> = {};

  // Initialize all known provinces from allProvinces with 0 active customer stats
  allProvinces.forEach(p => {
    if (p.province) {
      regionalMetrics[p.province] = { name: p.province, value: 0, activeCompanies: new Set() };
    }
  });

  analyticalData.forEach((q: any) => {
    const isLost = q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก');
    
    if (isLost) {
      const reasonCategory = q.winLossReason || 'ไม่ระบุเหตุผล';
      if (!q.winLossReason || !q.winLossReason.trim()) {
        lostDealsWithoutReasonCount += 1;
      }
      
      // Top Lost Reasons
      if (!lostReasonMap[reasonCategory]) {
        lostReasonMap[reasonCategory] = { name: reasonCategory, value: 0, lostValue: 0 };
      }
      lostReasonMap[reasonCategory].value += 1;
      lostReasonMap[reasonCategory].lostValue += (q.totalAmountBeforeVat || 0);

      // By Product
      const pType = q.productType || 'อื่นๆ';
      if (!lostReasonsByProduct[pType]) lostReasonsByProduct[pType] = {};
      lostReasonsByProduct[pType][reasonCategory] = (lostReasonsByProduct[pType][reasonCategory] || 0) + 1;

      // By Salesperson
      const seller = salesReps.find(r => r.id === q.salespersonId)?.fullName || user.fullName;
      if (!lostReasonsBySalesperson[seller]) lostReasonsBySalesperson[seller] = {};
      lostReasonsBySalesperson[seller][reasonCategory] = (lostReasonsBySalesperson[seller][reasonCategory] || 0) + 1;
    }

    const region = q.company?.province;
    if (region) { // Filter province !== null
      if (!regionalMetrics[region]) {
        regionalMetrics[region] = { name: region, value: 0, activeCompanies: new Set() };
      }
      
      if (q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')) {
        regionalMetrics[region].value += (q.actualClosingAmount || q.totalAmountBeforeVat || 0);
        if (q.companyId) {
          regionalMetrics[region].activeCompanies.add(q.companyId);
        }
      }
    }
    
    const segment = q.company?.customerStatus || 'ลูกค้าใหม่';
    segmentMap[segment] = (segmentMap[segment] || 0) + 1;

    const biz = q.company?.businessType || 'ไม่ระบุ';
    if (q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')) bizTypeWonMap[biz] = (bizTypeWonMap[biz] || 0) + (q.actualClosingAmount || q.totalAmountBeforeVat || 0);
    else bizTypePipelineMap[biz] = (bizTypePipelineMap[biz] || 0) + (q.totalAmountBeforeVat || 0);
  });

  const totalCompaniesMap = Object.fromEntries(
    allProvinces.map(c => [c.province || 'ไม่ระบุ', c._count.id])
  );

  const enrichedRegions = Object.entries(regionalMetrics).map(([name, data]) => {
    const activeCusts = data.activeCompanies.size;
    const totalCusts = totalCompaniesMap[name] || activeCusts;
    const penetrationRate = totalCusts > 0 ? (activeCusts / totalCusts) * 100 : 0;
    const salesPerCustomer = activeCusts > 0 ? data.value / activeCusts : 0;

    return {
      name,
      value: data.value, // Total Sales (Performance)
      activeCustomers: activeCusts,
      potentialCustomers: totalCusts,
      penetrationRate,
      salesPerCustomer,
    };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  // Daily Trend & Activity Rate calculations + Previous Period Overlay
  const dailyTrend: any[] = [];
  const diffDays = Math.max(1, Math.ceil((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyTarget = targetMTD > 0 ? targetMTD / 30 : 0;
  let cumSales = 0;
  let prevCumSales = 0;

  // Pre-calculate previous period daily target
  const prevMonthIdx = refMonth === 0 ? 11 : refMonth - 1;
  const prevMonthYear = refMonth === 0 ? refYear - 1 : refYear;
  const prevTargetMTD = (monthlyTargetResult as any[])
    .filter(t => t.month === (prevMonthIdx + 1) && t.year === prevMonthYear)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const prevDailyTarget = prevTargetMTD > 0 ? prevTargetMTD / 30 : 0;

  for (let i = 0; i < diffDays; i++) {
    const dStr = toBkkDateStr(new Date(filterStart.getTime() + i * 24 * 60 * 60 * 1000));
    const dayQuotes = (historyQuotations as any[]).filter(q => toBkkDateStr(new Date(q.createdAt)) === dStr);
    const dayTelesales = (historyTelesales as any[]).filter(t => toBkkDateStr(new Date(t.createdAt)) === dStr);
    const dayMeetings = (historyTelesales as any[]).filter(t => t.lastMeetingDate && toBkkDateStr(new Date(t.lastMeetingDate)) === dStr);
    
    const daySales = dayQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).reduce((s, q) => s + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
    cumSales += daySales;

    // Previous period overlay: map day i of previous period
    const prevDStr = toBkkDateStr(new Date(prevPeriodStart.getTime() + i * 24 * 60 * 60 * 1000));
    const prevDayQuotes = (prevPeriodHistoryQuotations as any[]).filter(q => toBkkDateStr(new Date(q.createdAt)) === prevDStr);
    const prevDaySales = prevDayQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).reduce((s, q) => s + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
    prevCumSales += prevDaySales;
    
    dailyTrend.push({ 
      date: dStr, 
      sales: daySales, 
      cumulativeSales: cumSales, 
      calls: dayTelesales.length, 
      meetings: dayMeetings.length,
      quotes: dayQuotes.length,
      hitTarget: dailyTarget > 0 ? daySales >= dailyTarget : false,
      cumulativeTarget: dailyTarget > 0 ? (i + 1) * dailyTarget : 0,
      prevCumulativeSales: prevCumSales,
      prevCumulativeTarget: prevDailyTarget > 0 ? (i + 1) * prevDailyTarget : 0
    });
  }

  // --- Strict Win vs. Lose Cycle & dynamic thresholding ---
  
  const getDiffDaysHelper = (start: Date | null, end: Date | null) => {
    if (!start || !end) return null;
    const diffMs = end.getTime() - start.getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);
    return days >= 0 ? days : 0;
  };

  // Safe Cycle Win Averages (Exclude updatedAt fallback entirely)
  const wonDealsWithCycles = analyticalData.filter(q => 
    (q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')) && (q.billingDate || q.poDate)
  ).map(q => {
    const closeDate = q.billingDate || q.poDate;
    return {
      ...q,
      cycleDays: getDiffDaysHelper(q.quotationDate || q.createdAt, closeDate)
    };
  }).filter(q => q.cycleDays !== null);

  const teamAvgTimeToWin = wonDealsWithCycles.length > 0 
    ? wonDealsWithCycles.reduce((sum, q) => sum + (q.cycleDays as number), 0) / wonDealsWithCycles.length 
    : 0;

  // Safe Cycle Lose Averages
  const lostDealsWithCycles = analyticalData.filter(q => 
    (q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก'))
  ).map(q => ({
    ...q,
    cycleDays: getDiffDaysHelper(q.quotationDate || q.createdAt, q.updatedAt)
  })).filter(q => q.cycleDays !== null);

  const teamAvgTimeToLose = lostDealsWithCycles.length > 0 
    ? lostDealsWithCycles.reduce((sum, q) => sum + (q.cycleDays as number), 0) / lostDealsWithCycles.length 
    : 0;

  // Previous Period Benchmarks for Win/Lose Cycle
  const prevWonDeals = prevPeriodQuotations.filter(q => 
    (q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')) && (q.billingDate || q.poDate)
  ).map(q => {
    const closeDate = q.billingDate || q.poDate;
    return getDiffDaysHelper(q.quotationDate || q.createdAt, closeDate);
  }).filter(c => c !== null) as number[];

  const prevAvgTimeToWin = prevWonDeals.length > 0 
    ? prevWonDeals.reduce((sum, c) => sum + c, 0) / prevWonDeals.length 
    : 0;

  const prevLostDeals = prevPeriodQuotations.filter(q => 
    (q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก'))
  ).map(q => getDiffDaysHelper(q.quotationDate || q.createdAt, q.updatedAt))
  .filter(c => c !== null) as number[];

  const prevAvgTimeToLose = prevLostDeals.length > 0 
    ? prevLostDeals.reduce((sum, c) => sum + c, 0) / prevLostDeals.length 
    : 0;

  // Product Type Cycle Breakdown & Dynamic Thresholding Setup
  const productTypes = Array.from(new Set(analyticalData.map(q => q.productType || 'อื่นๆ')));
  const productCycleTimes = productTypes.map(pType => {
    const pWonDeals = wonDealsWithCycles.filter(q => (q.productType || 'อื่นๆ') === pType);
    const pAvgTimeToWin = pWonDeals.length > 0 
      ? pWonDeals.reduce((sum, q) => sum + (q.cycleDays as number), 0) / pWonDeals.length 
      : 0;
    
    const pLostDeals = lostDealsWithCycles.filter(q => (q.productType || 'อื่นๆ') === pType);
    const pAvgTimeToLose = pLostDeals.length > 0 
      ? pLostDeals.reduce((sum, q) => sum + (q.cycleDays as number), 0) / pLostDeals.length 
      : 0;

    return {
      productType: pType,
      avgTimeToWin: pAvgTimeToWin,
      avgTimeToLose: pAvgTimeToLose,
      wonCount: pWonDeals.length
    };
  });

  // Stale Pipeline / Aging Deals Identification (Two-Layer Dynamic Thresholds + 30-Day Absolute Hard Cap)
  const now = new Date();
  const agingDeals = analyticalData.filter(q => 
    ['เสนอราคา', 'รอใบประเมินราคา', 'รอจัดทำ PO', 'PO แล้วรอสินค้า', 'PO แล้วรอมัดจำ', 'PO แล้วรอเงินโอน'].includes(q.status || '')
  ).map(q => {
    const pType = q.productType || 'อื่นๆ';
    const pStats = productCycleTimes.find(pct => pct.productType === pType);
    
    const daysStuck = getDiffDaysHelper(q.updatedAt, now) || 0;
    const daysSinceBidding = q.quotationDate ? (getDiffDaysHelper(q.quotationDate, now) || 0) : (getDiffDaysHelper(q.createdAt, now) || 0);
    const isHardCapExceeded = daysSinceBidding > 30;
    
    let threshold = 14; // Fallback default
    let isDynamic = false;
    
    if (pStats && pStats.wonCount >= 3 && pStats.avgTimeToWin > 0) {
      threshold = pStats.avgTimeToWin * 1.5;
      isDynamic = true;
    } else {
      // Stage specific fallback
      if (['เสนอราคา', 'รอใบประเมินราคา'].includes(q.status || '')) {
        threshold = 14;
      } else {
        threshold = 7;
      }
    }

    const finalDaysStuck = isHardCapExceeded ? Math.max(daysStuck, daysSinceBidding) : daysStuck;
    const finalThreshold = isHardCapExceeded ? 30 : threshold;
    const salespersonName = salesReps.find(r => r.id === q.salespersonId)?.fullName || user.fullName;

    return {
      id: q.id,
      companyName: q.company?.companyName || 'ไม่ระบุ',
      productType: pType,
      status: q.status || 'ไม่ระบุ',
      value: q.totalAmountBeforeVat || 0,
      daysStuck: Math.round(finalDaysStuck * 10) / 10,
      threshold: Math.round(finalThreshold * 10) / 10,
      isDynamic: isHardCapExceeded ? false : isDynamic,
      isAbsoluteAging: isHardCapExceeded,
      salespersonName,
      salespersonStatus: q.salesperson?.isActive ? 'ใช้งานอยู่' : 'ปิดใช้งาน',
      managerStatus: q.salesperson?.employeeSale?.teamLeader || 'ไม่ระบุ'
    };
  }).filter(deal => deal.daysStuck > deal.threshold || deal.isAbsoluteAging)
    .sort((a, b) => b.value - a.value); // Sorted by Value (Impact) descending!

  // --- Funnel Counts, Values and Weighted Values ---
  
  const avgWonValue = wonCount > 0 ? wonVal / wonCount : 50000;
  
  // 1. Target (ความสนใจ) - Since telesales may be 0, all quotations also enter the pipeline as target leads
  const targetCount = historyTelesales.length + historyQuotations.length;
  const targetValue = (historyTelesales.length * avgWonValue) + historyQuotations.reduce((s, q) => s + (q.totalAmountBeforeVat || 0), 0);
  const targetWeighted = targetValue * PIPELINE_PROBABILITIES.target;

  // 2. Quotation (ใบเสนอราคา) - All active/won non-lost quotes
  const activeQuotes = historyQuotations.filter(q => 
    !['ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ปฏิเสธ-อื่นๆ', 'ยกเลิก-Revise'].includes(q.status || '')
  );
  const quotationCount = activeQuotes.length;
  const quotationValue = activeQuotes.reduce((s, q) => s + (q.totalAmountBeforeVat || 0), 0);
  const quotationWeighted = activeQuotes.reduce((s, q) => s + ((q.totalAmountBeforeVat || 0) * PIPELINE_PROBABILITIES.quotation), 0);

  // 3. Negotiation (เจรจาต่อรอง) - Pending active pipeline
  const negotiationQuotes = historyQuotations.filter(q => 
    ['เสนอราคา', 'รอใบประเมินราคา', 'รอจัดทำ PO', 'PO แล้วรอสินค้า', 'PO แล้วรอมัดจำ', 'PO แล้วรอเงินโอน'].includes(q.status || '')
  );
  const negotiationCount = negotiationQuotes.length;
  const negotiationValue = negotiationQuotes.reduce((s, q) => s + (q.totalAmountBeforeVat || 0), 0);
  const negotiationWeighted = negotiationQuotes.reduce((s, q) => s + ((q.totalAmountBeforeVat || 0) * PIPELINE_PROBABILITIES.negotiation), 0);

  // 4. Closing (ปิดการขาย) - Won quotations
  const closingCount = wonCount;
  const closingValue = wonVal;
  const closingWeighted = closingValue * PIPELINE_PROBABILITIES.closing;

  const funnelStagesData = [
    { name: 'ความสนใจ', count: targetCount, value: targetValue, weighted: targetWeighted, conversionRate: 100 },
    { name: 'ใบเสนอราคา', count: quotationCount, value: quotationValue, weighted: quotationWeighted, conversionRate: targetCount > 0 ? (quotationCount / targetCount) * 100 : 0 },
    { name: 'เจรจาต่อรอง', count: negotiationCount, value: negotiationValue, weighted: negotiationWeighted, conversionRate: quotationCount > 0 ? (negotiationCount / quotationCount) * 100 : 0 },
    { name: 'ปิดการขาย', count: closingCount, value: closingValue, weighted: closingWeighted, conversionRate: negotiationCount > 0 ? (closingCount / negotiationCount) * 100 : 0 }
  ];

  // --- Pipeline Flow / Movement (MoM & Net Change) ---
  
  const curNew = historyQuotations.length;
  const curWon = wonCount;
  const curLost = lostCount;
  const curNet = curNew - curWon - curLost;

  const prevNew = prevPeriodQuotations.length;
  const prevWon = prevPeriodQuotations.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).length;
  const prevLost = prevPeriodQuotations.filter(q => q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก')).length;
  const prevNet = prevNew - prevWon - prevLost;

  const momNewPct = prevNew > 0 ? ((curNew - prevNew) / prevNew) * 100 : 0;
  const momWonPct = prevWon > 0 ? ((curWon - prevWon) / prevWon) * 100 : 0;
  const momLostPct = prevLost > 0 ? ((curLost - prevLost) / prevLost) * 100 : 0;
  const momNetPct = prevNet !== 0 ? ((curNet - prevNet) / Math.abs(prevNet)) * 100 : 0;

  const pipelineFlow = {
    current: { newDeals: curNew, wonDeals: curWon, lostDeals: curLost, netChange: curNet },
    previous: { newDeals: prevNew, wonDeals: prevWon, lostDeals: prevLost, netChange: prevNet },
    mom: { newPct: momNewPct, wonPct: momWonPct, lostPct: momLostPct, netPct: momNetPct }
  };

  // --- Win Rate & Total Sample size (Invoiced or PO / All filtered items) ---
  const teamWonQuotesCount = historyQuotations.filter(q => 
    q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')
  ).length;
  const teamLostQuotesCount = historyQuotations.filter(q => 
    q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก')
  ).length;
  const teamClosedCount = historyQuotations.length;
  const teamWinRate = teamClosedCount > 0 ? (teamWonQuotesCount / teamClosedCount) * 100 : 0;

  // Forecast / Weighted Pipeline: Forecast = Σ (Deal Value × Probability of that stage)
  const forecastValue = analyticalData.reduce((sum, q) => {
    let prob = 0.1;
    let val = q.totalAmountBeforeVat || 0;
    if (q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')) {
      prob = 1.0;
      val = q.actualClosingAmount || q.totalAmountBeforeVat || 0;
    } else if (['เสนอราคา', 'รอใบประเมินราคา'].includes(q.status || '')) {
      prob = PIPELINE_PROBABILITIES.quotation; // 0.2
    } else if (['รอจัดทำ PO'].includes(q.status || '')) {
      prob = PIPELINE_PROBABILITIES.negotiation; // 0.6
    }
    return sum + (val * prob);
  }, 0);

  // --- FORECAST ACCURACY: Last 6 months Target vs Actual ---
  const forecastAccuracyData: any[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    let mIdx = refMonth - offset;
    let mYear = refYear;
    if (mIdx < 0) { mIdx += 12; mYear -= 1; }
    const monthNum = mIdx + 1;
    const monthLabel = `${mYear}-${String(monthNum).padStart(2, '0')}`;

    const monthTarget = (sixMonthTargets as any[]).filter(t => t.month === monthNum && t.year === mYear)
      .reduce((s, t) => s + (t.amount || 0), 0);

    const monthActual = (allTimeWonQuotations as any[]).filter(q => {
      const d = q.billingDate || q.createdAt;
      return d && new Date(d).getMonth() === mIdx && new Date(d).getFullYear() === mYear;
    }).reduce((s, q) => s + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);

    let accuracy = 0;
    let direction: 'over' | 'under' | 'accurate' = 'accurate';
    if (monthTarget > 0) {
      if (monthActual >= monthTarget) {
        accuracy = (monthTarget / monthActual) * 100;
        direction = monthActual > monthTarget * 1.1 ? 'under' : 'accurate'; // under-forecast = sold more
      } else {
        accuracy = (monthActual / monthTarget) * 100;
        direction = monthActual < monthTarget * 0.9 ? 'over' : 'accurate'; // over-forecast = sold less
      }
    }

    forecastAccuracyData.push({
      month: monthLabel,
      forecast: monthTarget,
      actual: monthActual,
      accuracy: Math.round(accuracy * 10) / 10,
      direction,
    });
  }

  // --- CUSTOMER LIFETIME ANALYTICS ---
  const companyLifetimeMap: Record<string, {
    companyId: string;
    companyName: string;
    province: string;
    totalValue: number;
    dealCount: number;
    firstWinDate: Date;
    lastWinDate: Date;
    lastProductType: string;
    lastDealValue: number;
    salespersonId: string;
  }> = {};

  (allTimeWonQuotations as any[]).forEach(q => {
    const cid = q.companyId;
    const val = q.actualClosingAmount || q.totalAmountBeforeVat || 0;
    const closeDate = q.billingDate || q.createdAt;
    if (!companyLifetimeMap[cid]) {
      companyLifetimeMap[cid] = {
        companyId: cid,
        companyName: q.company?.companyName || 'ไม่ระบุ',
        province: q.company?.province || 'ไม่ระบุ',
        totalValue: 0,
        dealCount: 0,
        firstWinDate: closeDate,
        lastWinDate: closeDate,
        lastProductType: q.productType || 'อื่นๆ',
        lastDealValue: val,
        salespersonId: q.salespersonId || '',
      };
    }
    companyLifetimeMap[cid].totalValue += val;
    companyLifetimeMap[cid].dealCount += 1;
    if (new Date(closeDate) < new Date(companyLifetimeMap[cid].firstWinDate)) {
      companyLifetimeMap[cid].firstWinDate = closeDate;
    }
    if (new Date(closeDate) > new Date(companyLifetimeMap[cid].lastWinDate)) {
      companyLifetimeMap[cid].lastWinDate = closeDate;
      companyLifetimeMap[cid].lastProductType = q.productType || 'อื่นๆ';
      companyLifetimeMap[cid].lastDealValue = val;
      companyLifetimeMap[cid].salespersonId = q.salespersonId || '';
    }
  });

  const allCustomerData = Object.values(companyLifetimeMap);

  // Top Customers by Value
  const topCustomers = [...allCustomerData].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10).map(c => ({
    companyName: c.companyName,
    province: c.province,
    totalValue: c.totalValue,
    dealCount: c.dealCount,
    avgDealSize: c.dealCount > 0 ? c.totalValue / c.dealCount : 0,
    tier: c.totalValue >= 500000 ? 'Platinum' : c.totalValue >= 200000 ? 'Gold' : 'Silver',
  }));

  // CLV Tiers Summary
  const clvTiers = {
    platinum: { count: 0, totalValue: 0 },
    gold: { count: 0, totalValue: 0 },
    silver: { count: 0, totalValue: 0 },
  };
  allCustomerData.forEach(c => {
    if (c.totalValue >= 500000) { clvTiers.platinum.count++; clvTiers.platinum.totalValue += c.totalValue; }
    else if (c.totalValue >= 200000) { clvTiers.gold.count++; clvTiers.gold.totalValue += c.totalValue; }
    else { clvTiers.silver.count++; clvTiers.silver.totalValue += c.totalValue; }
  });

  // New vs Existing Customer (based on first win date vs filter range)
  let newCustomerRevenue = 0;
  let existingCustomerRevenue = 0;
  let newCustomerCount = 0;
  let existingCustomerCount = 0;
  allCustomerData.forEach(c => {
    // Check if this company has any revenue in the filtered period
    const companyFilteredRevenue = (allTimeWonQuotations as any[]).filter(q =>
      q.companyId === c.companyId &&
      new Date(q.billingDate || q.createdAt) >= filterStart &&
      new Date(q.billingDate || q.createdAt) <= filterEnd
    ).reduce((s, q) => s + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);

    if (companyFilteredRevenue > 0) {
      if (new Date(c.firstWinDate) >= filterStart) {
        newCustomerRevenue += companyFilteredRevenue;
        newCustomerCount++;
      } else {
        existingCustomerRevenue += companyFilteredRevenue;
        existingCustomerCount++;
      }
    }
  });

  const newVsExisting = {
    newRevenue: newCustomerRevenue,
    existingRevenue: existingCustomerRevenue,
    newCount: newCustomerCount,
    existingCount: existingCustomerCount,
    totalRevenue: newCustomerRevenue + existingCustomerRevenue,
  };

  // At-Risk Customers
  const atRiskCustomers = allCustomerData.filter(c => {
    const daysSinceLastPurchase = getDiffDaysHelper(new Date(c.lastWinDate), now) || 0;
    return daysSinceLastPurchase > atRiskDays;
  }).map(c => {
    const daysSinceLastPurchase = Math.round(getDiffDaysHelper(new Date(c.lastWinDate), now) || 0);
    const ownerName = salesReps.find(r => r.id === c.salespersonId)?.fullName || user.fullName;
    return {
      companyName: c.companyName,
      province: c.province,
      lifetimeValue: c.totalValue,
      daysSinceLastPurchase,
      lastProductType: c.lastProductType,
      lastDealValue: c.lastDealValue,
      ownerName,
    };
  }).sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 15);

  // --- PRIORITIZED ALERTS ---
  type AlertItem = {
    id: string;
    type: 'deal_stuck' | 'low_activity' | 'below_target' | 'forecast_shift';
    priority: 'critical' | 'warning';
    title: string;
    detail: string;
    value: number;
  };
  const alerts: AlertItem[] = [];

  // 1. Stuck Deals (from agingDeals)
  agingDeals.forEach(deal => {
    alerts.push({
      id: `deal-${deal.id}`,
      type: 'deal_stuck',
      priority: deal.value > 500000 ? 'critical' : 'warning',
      title: `ดีลค้าง: ${deal.companyName}`,
      detail: `${deal.productType} • ค้าง ${deal.daysStuck} วัน (เกณฑ์ ${deal.threshold}) • ${deal.salespersonName}`,
      value: deal.value,
    });
  });

  // 2. Employee Low Activity — will be populated after employeePerformance is computed below

  // 3. Below Weekly Target Sales
  const weeklyTarget = targetMTD > 0 ? targetMTD / 4.3 : 0; // ~4.3 weeks per month
  if (weeklyTarget > 0) {
    const last7Days = dailyTrend.slice(-7);
    const thisWeekSales = last7Days.reduce((s, d) => s + (d.sales || 0), 0);
    if (thisWeekSales < weeklyTarget * 0.5) {
      alerts.push({
        id: 'below-weekly-target',
        type: 'below_target',
        priority: 'critical' as const,
        title: 'ยอดขายสัปดาห์นี้ต่ำกว่าเป้า > 50%',
        detail: `ยอดสัปดาห์นี้: ฿${thisWeekSales.toLocaleString()} / เป้า: ฿${Math.round(weeklyTarget).toLocaleString()}`,
        value: weeklyTarget - thisWeekSales,
      });
    }
  }

  // 4. Forecast Shift (compare current vs previous period forecast value)
  const prevForecast = prevPeriodQuotations.reduce((sum, q) => {
    if (q.status === '\u0e40\u0e1b\u0e34\u0e14\u0e1a\u0e34\u0e25\u0e41\u0e25\u0e49\u0e27') return sum;
    let prob = 0.1;
    if (['\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32', '\u0e23\u0e2d\u0e43\u0e1a\u0e1b\u0e23\u0e30\u0e40\u0e21\u0e34\u0e19\u0e23\u0e32\u0e04\u0e32'].includes(q.status || '')) prob = PIPELINE_PROBABILITIES.quotation;
    else if (['\u0e23\u0e2d\u0e08\u0e31\u0e14\u0e17\u0e33 PO', 'PO \u0e41\u0e25\u0e49\u0e27\u0e23\u0e2d\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32', 'PO \u0e41\u0e25\u0e49\u0e27\u0e23\u0e2d\u0e21\u0e31\u0e14\u0e08\u0e33', 'PO \u0e41\u0e25\u0e49\u0e27\u0e23\u0e2d\u0e40\u0e07\u0e34\u0e19\u0e42\u0e2d\u0e19'].includes(q.status || '')) prob = PIPELINE_PROBABILITIES.negotiation;
    return sum + ((q.totalAmountBeforeVat || 0) * prob);
  }, 0) + prevVal;

  if (prevForecast > 0) {
    const forecastShift = Math.abs(forecastValue - prevForecast) / prevForecast;
    if (forecastShift > 0.15) {
      alerts.push({
        id: 'forecast-shift',
        type: 'forecast_shift' as const,
        priority: 'warning' as const,
        title: `\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e41\u0e1b\u0e25\u0e07\u0e21\u0e32\u0e01 (${forecastValue > prevForecast ? '+' : '-'}${(forecastShift * 100).toFixed(0)}%)`,
        detail: `\u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19: \u0e3f${Math.round(forecastValue).toLocaleString()} / \u0e23\u0e2d\u0e1a\u0e01\u0e48\u0e2d\u0e19: \u0e3f${Math.round(prevForecast).toLocaleString()}`,
        value: Math.abs(forecastValue - prevForecast),
      });
    }
  }

  // Sort: Critical first, then by value desc
  alerts.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'critical' ? -1 : 1;
    return b.value - a.value;
  });

  // --- Activity Metrics Division Safeguard (Min 7 days) ---
  const weeks = Math.max(1, diffDays / 7);

  // Employee Performance Mapping (Enriched with win rates, sample sizes, and weekly activity trends)
  const todayBkkStr = toBkkDateStr(new Date());
  const employeePerformance = isManager ? salesReps.map((rep: any) => {
    const repQuotes = (historyQuotations as any[]).filter(q => q.salespersonId === rep.id);
    const repWon = repQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).reduce((s, q) => s + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
    const repTarget = (monthlyTargetResult as any[]).find(t => t.userId === rep.id && t.month === currentMonth)?.amount || 0;
    
    // Won count and Total count for Win Rate calculation (Invoiced or PO / All filtered items)
    const repWinningCount = repQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).length;
    const repLostCount = repQuotes.filter(q => q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก')).length;
    const repClosedCount = repQuotes.length;
    const repWinRate = repClosedCount > 0 ? (repWinningCount / repClosedCount) * 100 : 0;

    // Weekly Activity rates
    const repTelesales = (historyTelesales as any[]).filter(t => t.userId === rep.id);
    const weeklyCalls = repTelesales.length / weeks;
    const weeklyMeetings = repTelesales.filter(t => t.lastMeetingDate).length / weeks;

    // Individual Sales Win cycle
    const repWonDeals = wonDealsWithCycles.filter(q => q.salespersonId === rep.id);
    const repAvgTimeToWin = repWonDeals.length > 0 
      ? repWonDeals.reduce((sum, q) => sum + (q.cycleDays as number), 0) / repWonDeals.length 
      : 0;

    return { 
      id: rep.id, 
      fullName: rep.fullName, 
      won: repWon, 
      target: repTarget, 
      achievementPct: repTarget > 0 ? (repWon / repTarget) * 100 : 0,
      branch: rep.employeeSale?.branch || 'ไม่ระบุ',
      position: rep.employeeSale?.position || rep.role || 'ไม่ระบุ',
      wonCount: repWinningCount,
      lostCount: repLostCount,
      winRate: repWinRate,
      resolvedSample: `${repWinningCount}/${repClosedCount}`,
      weeklyCalls,
      weeklyMeetings,
      avgTimeToWin: repAvgTimeToWin
    };
  }).sort((a, b) => b.won - a.won) : [];

  // 2. Employee Low Activity Alerts (now that employeePerformance is available)
  if (isManager && employeePerformance.length > 0) {
    const teamAvgCalls = employeePerformance.reduce((s, e) => s + (e.weeklyCalls || 0), 0) / employeePerformance.length;
    employeePerformance.forEach(emp => {
      if (teamAvgCalls > 0 && emp.weeklyCalls < teamAvgCalls * 0.7) {
        alerts.push({
          id: `activity-${emp.id}`,
          type: 'low_activity' as const,
          priority: 'warning' as const,
          title: `กิจกรรมต่ำ: ${emp.fullName}`,
          detail: `โทร ${emp.weeklyCalls.toFixed(1)}/สัปดาห์ (ค่าเฉลี่ยทีม: ${teamAvgCalls.toFixed(1)})`,
          value: emp.won || 0,
        });
      }
    });
    // Re-sort after adding employee alerts
    alerts.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'critical' ? -1 : 1;
      return b.value - a.value;
    });
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/dashboard" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      <DashboardUI
        userFullName={user.fullName}
        userRole={user.role}
        metrics={{
          actualSales: { value: wonVal, target: targetMTD, pct: achMTD, short: Math.max(targetMTD - wonVal, 0) },
          revenue: { mtd: wonVal, qtd: qtdRevenue, ytd: ytdRevenue },
          targetAch: { mtd: achMTD, qtd: achQTD },
          growth: { mom: momGrowth, yoy: yoyGrowth },
          avgTicketSize: { value: avgTicketSize },
          pipeline: { value: pipelineVal, count: pipelineCount },
          won: { value: wonVal, count: teamWonQuotesCount },
          lost: { value: lostVal, count: teamLostQuotesCount },
          conversionRate: { pct: conversionRate },
          forecast: { value: forecastValue },
          provinces: allProvinces.map(p => p.province),
          
          // Enhanced enterprise metrics
          teamWinRate,
          teamResolvedCount: teamClosedCount,
          funnelStages: funnelStagesData,
          salesCycle: {
            avgTimeToWin: teamAvgTimeToWin,
            avgTimeToLose: teamAvgTimeToLose,
            prevAvgTimeToWin,
            prevAvgTimeToLose,
            productBreakdown: productCycleTimes
          },
          agingDeals,
          pipelineFlow
        } as any}
        recentActivities={recentQ}
        nextMeetings={nextM}
        dailyTrend={dailyTrend}
        salesReps={salesReps}
        salespersonIds={salespersonIds}
        filterMonth={currentMonth}
        filterYear={refYear}
        filterStartDate={toBkkDateStr(filterStart)}
        filterEndDate={toBkkDateStr(filterEnd)}
        productMix={productMix.map(p => {
          const name = p.productType || 'อื่นๆ';
          const val = p._sum.actualClosingAmount || p._sum.totalAmountBeforeVat || 0;
          const marginPct = PRODUCT_MARGINS[name] || PRODUCT_MARGINS['อื่นๆ'];
          const grossProfit = val * (marginPct / 100);
          return {
            name,
            value: val,
            volume: p._count.id,
            marginPct,
            grossProfit,
          };
        })}
        productWinRates={productTypes.map(pType => {
          const pQuotes = (analyticalData as any[]).filter(q => (q.productType || 'อื่นๆ') === pType);
          const pWinningCount = pQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status?.startsWith('PO')).length;
          const pLostCount = pQuotes.filter(q => q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก')).length;
          const pClosedCount = pQuotes.length;
          const pWinRate = pClosedCount > 0 ? (pWinningCount / pClosedCount) * 100 : 0;

          return {
            productType: pType,
            wonCount: pWinningCount,
            closedCount: pClosedCount,
            winRate: pWinRate,
          };
        }).sort((a, b) => b.winRate - a.winRate)}
        lostReasons={Object.values(lostReasonMap).sort((a, b) => b.lostValue - a.lostValue)}
        lostReasonsAnalysis={{
          byProduct: lostReasonsByProduct,
          bySalesperson: lostReasonsBySalesperson
        }}
        regions={enrichedRegions}
        customerSegments={Object.entries(segmentMap).map(([name, value]) => ({ name, value }))}
        bizTypePipeline={Object.entries(bizTypePipelineMap).map(([name, value]) => ({ name, value }))}
        bizTypeWon={Object.entries(bizTypeWonMap).map(([name, value]) => ({ name, value }))}
        employeePerformance={employeePerformance}
        dailyTarget={dailyTarget}
        lostDealsWithoutReasonCount={lostDealsWithoutReasonCount}
        forecastAccuracy={forecastAccuracyData}
        topCustomers={topCustomers}
        clvTiers={clvTiers}
        newVsExisting={newVsExisting}
        atRiskCustomers={atRiskCustomers}
        atRiskDays={atRiskDays}
        alerts={alerts}
      />
    </div>
  );
}
