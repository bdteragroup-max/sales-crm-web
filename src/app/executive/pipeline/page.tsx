import React from 'react';
import prisma from '@/app/lib/db';
import PipelineDashboardClient from './PipelineDashboardClient';

export const dynamic = 'force-dynamic';

export default async function PipelineDashboard(props: {searchParams: Promise<{[key: string]: string | string[] | undefined;}>;}) {
  const searchParams = await props.searchParams;
  const filterPeriod = typeof searchParams.period === 'string' ? searchParams.period : 'รายเดือน';
  
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const month = typeof searchParams.month === 'string' ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : today.getFullYear();
  const quarterParam = typeof searchParams.quarter === 'string' ? parseInt(searchParams.quarter) : null;
  const currentQIndex = quarterParam && quarterParam >= 1 && quarterParam <= 4 
    ? quarterParam - 1 
    : Math.floor((month - 1) / 3);
  const quarter = currentQIndex + 1;
  
  // Date filtering logic based on period
  let startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  let endDate = new Date(year, month, 0, 23, 59, 59, 999);
  let targetMonths = [month];

  if (filterPeriod === 'รายไตรมาส') {
    const q = currentQIndex;
    startDate = new Date(year, q * 3, 1, 0, 0, 0, 0);
    endDate = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
    targetMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
  } else if (filterPeriod === 'รายปี') {
    startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    targetMonths = Array.from({length: 12}, (_, i) => i + 1);
  }

  // 1. Fetch Target for the active sales team for the period
  const activeSalesUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      NOT: {
        OR: [
          { role: 'อื่นๆ' }, { role: { contains: 'accounting' } }, { role: { contains: 'บัญชี' } },
          { role: { contains: 'purchasing' } }, { role: { contains: 'จัดซื้อ' } },
          { role: { contains: 'warehouse' } }, { role: { contains: 'คลังสินค้า' } },
          { role: { contains: 'service' } }, { role: { contains: 'บริการ' } },
          { role: { contains: 'project' } }, { role: { contains: 'โครงการ' } },
          { role: { contains: 'admin' } }, { role: { contains: 'ธุรการ' } },
          { role: { contains: 'executive' } }, { role: { contains: 'ผู้บริหาร' } }
        ]
      }
    },
    select: { id: true }
  });
  const activeUserIds = activeSalesUsers.map(u => u.id);

  const repTargets = await prisma.monthlyTarget.findMany({
    where: {
      year,
      month: { in: targetMonths },
      userId: { in: activeUserIds }
    },
    select: { amount: true }
  });
  let target = repTargets.reduce((sum, t) => sum + (t.amount || 0), 0);
  if (target === 0) {
    const teamTargets = await prisma.monthlyTarget.findMany({
      where: {
        year,
        month: { in: targetMonths },
        userId: null
      },
      select: { amount: true }
    });
    target = teamTargets.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  // 2. Fetch Sales Closed in the period (All Won quotes: เปิดบิลแล้ว or PO...)
  // Uses createdAt to match /executive/kpi
  const closedQuotes = await prisma.quotation.findMany({
    where: {
      OR: [
        { status: 'เปิดบิลแล้ว' },
        { status: { startsWith: 'PO' } }
      ],
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { actualClosingAmount: true, totalAmountBeforeVat: true }
  });
  const closedSales = closedQuotes.reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);

  // Period-over-Period (YoY / QoQ / MoM) Comparison
  let prevStartDate = new Date(startDate);
  let prevEndDate = new Date(endDate);
  let periodComparisonLabel = 'เดือนก่อน';

  if (filterPeriod === 'รายไตรมาส') {
    periodComparisonLabel = 'ไตรมาสก่อน';
    const prevQ = currentQIndex === 0 ? 3 : currentQIndex - 1;
    const prevYear = currentQIndex === 0 ? year - 1 : year;
    prevStartDate = new Date(prevYear, prevQ * 3, 1, 0, 0, 0, 0);
    prevEndDate = new Date(prevYear, prevQ * 3 + 3, 0, 23, 59, 59, 999);
  } else if (filterPeriod === 'รายปี') {
    periodComparisonLabel = 'ปีก่อน';
    prevStartDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
    prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
  } else {
    periodComparisonLabel = 'เดือนก่อน';
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    prevStartDate = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
    prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
  }

  const prevClosedQuotes = await prisma.quotation.findMany({
    where: {
      OR: [
        { status: 'เปิดบิลแล้ว' },
        { status: { startsWith: 'PO' } }
      ],
      createdAt: { gte: prevStartDate, lte: prevEndDate }
    },
    select: { actualClosingAmount: true, totalAmountBeforeVat: true }
  });
  const prevClosedSales = prevClosedQuotes.reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
  const closedGrowthPercent = prevClosedSales > 0 ? ((closedSales - prevClosedSales) / prevClosedSales) * 100 : null;

  // 3. Fetch All Active & Won Quotes (Active pipeline: รอจัดทำ PO, รอใบประเมินราคา, เสนอราคา, ความสนใจ)
  const ACTIVE_PIPELINE_STATUSES = ['รอจัดทำ PO', 'รอใบประเมินราคา', 'เสนอราคา', 'ความสนใจ'];
  const allActiveQuotes = await prisma.quotation.findMany({
    where: {
      OR: [
        { status: { in: ACTIVE_PIPELINE_STATUSES } },
        { status: 'เปิดบิลแล้ว' },
        { status: { startsWith: 'PO' } }
      ]
    },
    select: { 
      id: true, 
      status: true, 
      totalAmountBeforeVat: true, 
      actualClosingAmount: true,
      createdAt: true, 
      updatedAt: true, 
      quotationNumber: true,
      salesBranch: true,
      productType: true,
      company: { select: { companyName: true, province: true } }, 
      salesperson: { select: { fullName: true } } 
    }
  });

  let totalPipeline = 0;
  let weightedForecast = 0;
  
  let count100 = 0, amount100 = 0;
  let count80 = 0, amount80 = 0;
  let count60 = 0, amount60 = 0;
  let count30 = 0, amount30 = 0;
  let count10 = 0, amount10 = 0;

  let totalVelocityDays = 0;
  let velocityCount = 0;
  
  const stalledDealsList: any[] = [];
  const activeDealsForTop: any[] = [];
  const branchMap: Record<string, { amount: number; dealCount: number }> = {};
  const productMixMap: Record<string, { amount: number; dealCount: number }> = {};

  const now = new Date().getTime();

  const BRANCH_NAMES: Record<string, string> = {
    'BKK-HQ': 'สำนักงานใหญ่ (BKK-HQ)',
    'KK01': 'สาขาขอนแก่น (KK01)',
    'PSNL01': 'สาขาพิษณุโลก (PSNL01)',
    'CMI01': 'สาขาเชียงใหม่ (CMI01)',
    'KRI01': 'สาขากาญจนบุรี (KRI01)',
    'UB01': 'สาขาอุบลราชธานี (UB01)',
    'SRT01': 'สาขาสุราษฎร์ธานี (SRT01)',
    'UDN01': 'สาขาอุดรธานี (UDN01)',
    'SRN01': 'สาขาสุรินทร์ (SRN01)',
    'ROI01': 'สาขาร้อยเอ็ด (ROI01)',
    'SN01': 'สาขาสกลนคร (SN01)',
    'NRT': 'สาขานครราชสีมา (NRT)',
    'BKK-WH': 'คลังสินค้า Tera Warehouse 62',
    'SMK': 'สาขาสมุทรสาคร (SMK)'
  };

  const getBranchDisplayName = (code: string | null | undefined) => {
    if (!code || code.trim() === '' || code === 'ส่วนกลาง') return 'สำนักงานใหญ่ / ส่วนกลาง';
    const trimmed = code.trim();
    return BRANCH_NAMES[trimmed] || trimmed;
  };

  allActiveQuotes.forEach(q => {
    const val = q.totalAmountBeforeVat || 0;
    const isWon = q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO');
    
    if (isWon) {
      count100++; 
      amount100 += val;
      // Velocity calculation (Only for closed deals)
      if (q.createdAt && q.updatedAt) {
        const days = Math.max(1, Math.floor((q.updatedAt.getTime() - q.createdAt.getTime()) / (1000 * 3600 * 24)));
        totalVelocityDays += days;
        velocityCount++;
      }
    } else {
      totalPipeline += val;
      
      const daysStalled = Math.floor((now - q.updatedAt.getTime()) / (1000 * 3600 * 24));
      const daysInPipeline = Math.floor((now - q.createdAt.getTime()) / (1000 * 3600 * 24));

      // Active deals pool for Top Strategic Deals
      activeDealsForTop.push({
        id: q.id,
        quotationNumber: q.quotationNumber || 'ไม่ระบุเลขที่',
        company: q.company?.companyName || 'ไม่ระบุบริษัท',
        province: q.company?.province || '',
        salesperson: q.salesperson?.fullName || 'ไม่ระบุผู้ดูแล',
        branch: getBranchDisplayName(q.salesBranch),
        productType: q.productType || 'ทั่วไป',
        status: q.status,
        amount: val,
        daysInPipeline,
        daysStalled
      });

      // Stalled deals (> 30 days)
      if (daysStalled > 30 && q.status !== '' && (val > 0 || q.quotationNumber)) {
        stalledDealsList.push({
          id: q.id,
          quotationNumber: q.quotationNumber || 'ไม่ระบุเลขที่',
          company: q.company?.companyName || 'ไม่ระบุบริษัท',
          salesperson: q.salesperson?.fullName || 'ไม่ระบุผู้ดูแล',
          status: q.status,
          amount: val,
          daysStalled
        });
      }

      // Branch Aggregation
      const branchKey = getBranchDisplayName(q.salesBranch);
      if (!branchMap[branchKey]) {
        branchMap[branchKey] = { amount: 0, dealCount: 0 };
      }
      branchMap[branchKey].amount += val;
      branchMap[branchKey].dealCount += 1;

      // Product Category Normalization
      const rawProduct = (q.productType || '').trim().toLowerCase();
      let normCategory = 'สินค้าและบริการอื่นๆ';
      if (rawProduct.includes('solar') || rawProduct.includes('roof')) {
        normCategory = 'Solar Roof / พลังงานแสงอาทิตย์';
      } else if (rawProduct.includes('mdb') || rawProduct.includes('control') || rawProduct.includes('panel')) {
        normCategory = 'ตู้ MDB / Control Panel';
      } else if (rawProduct.includes('pump')) {
        normCategory = 'ระบบปั๊ม / Solar Pump';
      } else if (rawProduct.includes('service') || rawProduct.includes('บริการ') || rawProduct.includes('ซ่อม')) {
        normCategory = 'งานบริการ / Service & Maintenance';
      } else if (rawProduct.length > 0 && rawProduct !== 'other') {
        normCategory = q.productType || 'อื่นๆ';
      }

      if (!productMixMap[normCategory]) {
        productMixMap[normCategory] = { amount: 0, dealCount: 0 };
      }
      productMixMap[normCategory].amount += val;
      productMixMap[normCategory].dealCount += 1;

      // Weighted Forecast Categories
      if (q.status === 'รอจัดทำ PO') {
        count80++; amount80 += val;
        weightedForecast += val * 0.8;
      } else if (q.status === 'รอใบประเมินราคา') {
        count60++; amount60 += val;
        weightedForecast += val * 0.6;
      } else if (q.status === 'เสนอราคา') {
        count30++; amount30 += val;
        weightedForecast += val * 0.3;
      } else if (q.status === 'ความสนใจ') {
        count10++; amount10 += val;
        weightedForecast += val * 0.1;
      }
    }
  });

  stalledDealsList.sort((a, b) => b.daysStalled - a.daysStalled);
  const velocityDays = velocityCount > 0 ? Math.round(totalVelocityDays / velocityCount) : 0;

  // Top 10 Strategic Deals sorted by amount descending
  activeDealsForTop.sort((a, b) => b.amount - a.amount);
  const topStrategicDeals = activeDealsForTop.slice(0, 10);

  // Branch Breakdown sorted by amount descending
  const branchBreakdown = Object.entries(branchMap)
    .map(([branch, item]) => ({
      branch,
      amount: item.amount,
      dealCount: item.dealCount,
      sharePercent: totalPipeline > 0 ? (item.amount / totalPipeline) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Product Mix sorted by amount descending
  const productMix = Object.entries(productMixMap)
    .map(([category, item]) => ({
      category,
      amount: item.amount,
      dealCount: item.dealCount,
      sharePercent: totalPipeline > 0 ? (item.amount / totalPipeline) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const gapToTarget = Math.max(0, target - closedSales);
  const coverageRatio = gapToTarget > 0 ? (totalPipeline / gapToTarget) : (totalPipeline > 0 ? 99.9 : 0);

  // 6-Month Historical Momentum Trendline
  const THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const trendlineMonths: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const s = new Date(y, m, 1, 0, 0, 0, 0);
    const e = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const shortYear = (y + 543).toString().slice(-2);
    trendlineMonths.push({
      label: `${THAI_MONTH_SHORT[m]} ${shortYear}`,
      start: s,
      end: e
    });
  }

  const earliestTrendDate = trendlineMonths[0].start;
  const latestTrendDate = trendlineMonths[trendlineMonths.length - 1].end;

  const trendQuotes = await prisma.quotation.findMany({
    where: {
      createdAt: { gte: earliestTrendDate, lte: latestTrendDate }
    },
    select: {
      status: true,
      totalAmountBeforeVat: true,
      actualClosingAmount: true,
      createdAt: true
    }
  });

  const momentumTrendline = trendlineMonths.map(tm => {
    const quotesInMonth = trendQuotes.filter(q => q.createdAt >= tm.start && q.createdAt <= tm.end);
    const closed = quotesInMonth
      .filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'))
      .reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
    const pipelineAdded = quotesInMonth
      .filter(q => ACTIVE_PIPELINE_STATUSES.includes(q.status))
      .reduce((sum, q) => sum + (q.totalAmountBeforeVat || 0), 0);

    return {
      month: tm.label,
      closedSales: closed,
      pipelineAdded: pipelineAdded
    };
  });

  // Stage conversion for current period
  const unassignedWhere = {
    assignedUserId: null,
    quotations: { none: { salesperson: { isActive: true } } },
    telesales: { none: { userId: { not: null } } }
  };
  
  const leadsCount = await prisma.company.count({ where: unassignedWhere });
  
  const unassignedLeadsListRaw = await prisma.company.findMany({
    where: unassignedWhere,
    select: { 
      id: true, 
      companyName: true, 
      province: true,
      customerType: true,
      createdAt: true 
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  const unassignedLeadsList = unassignedLeadsListRaw.map(c => ({
    id: c.id,
    company: c.companyName,
    province: c.province || 'ไม่ระบุจังหวัด',
    customerType: c.customerType || 'ลูกค้าทั่วไป',
    daysSinceCreated: Math.floor((now - c.createdAt.getTime()) / (1000 * 3600 * 24))
  }));

  const telesalesCount = await prisma.telesale.count({ where: { createdAt: { gte: startDate, lte: endDate } } });
  const quotesCreated = await prisma.quotation.count({ where: { createdAt: { gte: startDate, lte: endDate } } });
  const poCreated = await prisma.quotation.count({ 
    where: { 
      OR: [
        { status: 'เปิดบิลแล้ว' },
        { status: { startsWith: 'PO' } }
      ],
      createdAt: { gte: startDate, lte: endDate } 
    } 
  });
  
  // Pipeline Waterfall for current period
  const quotesStartedInPeriod = await prisma.quotation.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    select: { totalAmountBeforeVat: true }
  });
  const newAdded = quotesStartedInPeriod.reduce((sum, q) => sum + (q.totalAmountBeforeVat || 0), 0);
  
  const lostQuotes = await prisma.quotation.findMany({
    where: { 
      status: { in: ['ปฏิเสธ-อื่นๆ', 'ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ยกเลิก-Revise', 'ชะลอโครงการ', 'ช่วงนี้ยังไม่ได้ใช้'] },
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { totalAmountBeforeVat: true }
  });
  const lostAmount = lostQuotes.reduce((sum, q) => sum + (q.totalAmountBeforeVat || 0), 0);

  // startAmount approximation = current - new + won + lost
  const startAmount = Math.max(0, totalPipeline - newAdded + closedSales + lostAmount);

  // Executive Action Alerts
  const executiveAlerts = {
    coverage: {
      ratio: coverageRatio,
      benchmark: 3.0,
      isRisk: coverageRatio < 3.0,
      severity: coverageRatio < 2.0 ? 'critical' : coverageRatio < 3.0 ? 'warning' : 'healthy',
      title: 'Pipeline Coverage ต่ำกว่าเกณฑ์มาตรฐาน 3.0x',
      message: 'จำเป็นต้องเร่งให้ทีมการตลาด (Marketing) สร้าง Lead ใหม่เข้าสู่ไปป์ไลน์อย่างเร่งด่วนเพื่อรองรับเป้าหมาย'
    },
    unassignedLeakage: {
      count: leadsCount,
      isCritical: leadsCount > 1000,
      title: `พบลูกค้า ${leadsCount.toLocaleString()} รายยังไม่ได้รับการมอบหมาย (จุดรั่วไหลวิกฤต)`,
      message: 'ผู้บริหารต้องตรวจสอบขั้นตอนการกระจายงาน (Lead Routing) ทันทีเพื่อไม่ให้โอกาสทางธุรกิจสูญหาย'
    }
  };

  const data = {
    month,
    year,
    quarter,
    filterPeriod,
    periodComparison: {
      label: periodComparisonLabel,
      prevClosedSales,
      growthPercent: closedGrowthPercent
    },
    executiveSummary: {
      target,
      closedSales,
      gapToTarget,
      totalPipeline,
      coverageRatio,
      weightedForecast
    },
    weightedForecast: {
      categories: [
        { name: 'Closed / Committed', probability: 100, amount: amount100, dealCount: count100 },
        { name: 'Best Case (รอ PO)', probability: 80, amount: amount80, dealCount: count80 },
        { name: 'Evaluation (รอใบประเมิน)', probability: 60, amount: amount60, dealCount: count60 },
        { name: 'Qualified (เสนอราคา)', probability: 30, amount: amount30, dealCount: count30 },
        { name: 'Interest (ความสนใจ)', probability: 10, amount: amount10, dealCount: count10 }
      ]
    },
    breakdowns: {
      branches: branchBreakdown,
      productMix: productMix
    },
    strategicDeals: topStrategicDeals,
    momentumTrendline,
    executiveAlerts,
    pipelineHealth: {
      velocityDays,
      stalledDealsCount: stalledDealsList.length,
      stalledDealsList,
      unassignedLeadsCount: leadsCount,
      unassignedLeadsList
    },
    conversionRates: {
      leads: leadsCount,
      telesales: telesalesCount,
      quotes: quotesCreated,
      po: poCreated
    },
    pipelineMovement: {
      startAmount,
      newAdded,
      won: closedSales,
      lost: lostAmount,
      currentAmount: totalPipeline
    }
  };

  return <PipelineDashboardClient data={data} />;
}
