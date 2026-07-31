import React from 'react';
import prisma from '@/app/lib/db';
import PipelineDashboardClient from './PipelineDashboardClient';

export const dynamic = 'force-dynamic';

export default async function PipelineDashboard(props: {searchParams: Promise<{[key: string]: string | string[] | undefined;}>;}) {
  const searchParams = await props.searchParams;
  const filterPeriod = typeof searchParams.period === 'string' ? searchParams.period : 'รายเดือน';
  
  // Date filtering logic based on period
  // (รายเดือน, รายไตรมาส, รายปี)
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  let targetMonths = [today.getMonth() + 1];

  if (filterPeriod === 'รายไตรมาส') {
    const quarter = Math.floor(today.getMonth() / 3);
    startDate = new Date(today.getFullYear(), quarter * 3, 1);
    endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
    targetMonths = [quarter * 3 + 1, quarter * 3 + 2, quarter * 3 + 3];
  } else if (filterPeriod === 'รายปี') {
    startDate = new Date(today.getFullYear(), 0, 1);
    endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    targetMonths = Array.from({length: 12}, (_, i) => i + 1);
  }

  // 1. Fetch Target for the period
  const monthlyTargets = await prisma.monthlyTarget.aggregate({
    _sum: { amount: true },
    where: { year: today.getFullYear(), month: { in: targetMonths } }
  });
  const target = monthlyTargets._sum.amount || 0;

  // 2. Fetch Sales Closed in the period
  const closedQuotes = await prisma.quotation.findMany({
    where: {
      status: { in: ['เปิดบิลแล้ว', 'PO แล้วรอสินค้า'] },
      updatedAt: { gte: startDate, lte: endDate }
    },
    select: { actualClosingAmount: true, totalAmountBeforeVat: true }
  });
  const closedSales = closedQuotes.reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);

  // 3. Fetch All Active Quotes (for pipeline analysis)
  const allActiveQuotes = await prisma.quotation.findMany({
    where: {
      NOT: { status: { in: ['ปฏิเสธ-อื่นๆ', 'ปฏิเสธ-ได้ที่อื่นแล้ว', 'ปฏิเสธ-ยกเลิกสินค้า', 'ยกเลิก-Revise', 'ชะลอโครงการ', 'ช่วงนี้ยังไม่ได้ใช้'] } }
    },
    select: { id: true, status: true, totalAmountBeforeVat: true, createdAt: true, updatedAt: true, quotationNumber: true, company: { select: { companyName: true } }, salesperson: { select: { fullName: true } } }
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
  const now = new Date().getTime();

  allActiveQuotes.forEach(q => {
    const val = q.totalAmountBeforeVat || 0;
    
    if (['เปิดบิลแล้ว', 'PO แล้วรอสินค้า'].includes(q.status)) {
      count100++; amount100 += val;
      // Velocity calculation (Only for closed deals)
      if (q.createdAt && q.updatedAt) {
        const days = Math.max(1, Math.floor((q.updatedAt.getTime() - q.createdAt.getTime()) / (1000 * 3600 * 24)));
        totalVelocityDays += days;
        velocityCount++;
      }
    } else {
      totalPipeline += val;
      
      // Calculate age of update (Stalled deals)
      const daysStalled = Math.floor((now - q.updatedAt.getTime()) / (1000 * 3600 * 24));
      if (daysStalled > 30) {
        stalledDealsList.push({
          id: q.id,
          company: q.company?.companyName || 'Unknown',
          salesperson: q.salesperson?.fullName || 'Unknown',
          status: q.status,
          amount: val,
          daysStalled
        });
      }

      // Weighted Forecast Categories
      if (['รอจัดทำ PO'].includes(q.status)) {
        count80++; amount80 += val;
        weightedForecast += val * 0.8;
      } else if (['รอใบประเมินราคา'].includes(q.status)) {
        count60++; amount60 += val;
        weightedForecast += val * 0.6;
      } else if (['เสนอราคา'].includes(q.status)) {
        count30++; amount30 += val;
        weightedForecast += val * 0.3;
      } else if (['ความสนใจ'].includes(q.status)) {
        count10++; amount10 += val;
        weightedForecast += val * 0.1;
      }
    }
  });

  stalledDealsList.sort((a, b) => b.daysStalled - a.daysStalled);
  const velocityDays = velocityCount > 0 ? Math.round(totalVelocityDays / velocityCount) : 0;

  const gapToTarget = Math.max(0, target - closedSales);
  const coverageRatio = gapToTarget > 0 ? (totalPipeline / gapToTarget) : (totalPipeline > 0 ? 99.9 : 0);

  // Stage conversion for current period
  // We fetch actual companies that are "unassigned" as our top-of-funnel "Leads"
  // The user requested this to match the total unassigned clients pool, so we remove the date filter
  const unassignedWhere = {
    assignedUserId: null,
    quotations: { none: { salesperson: { isActive: true } } },
    telesales: { none: { userId: { not: null } } }
  };
  
  const leadsCount = await prisma.company.count({ where: unassignedWhere });
  
  const unassignedLeadsListRaw = await prisma.company.findMany({
    where: unassignedWhere,
    select: { id: true, companyName: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit to 50 for the list display
  });
  
  const unassignedLeadsList = unassignedLeadsListRaw.map(c => ({
    id: c.id,
    company: c.companyName,
    daysSinceCreated: Math.floor((now - c.createdAt.getTime()) / (1000 * 3600 * 24))
  }));
  const telesalesCount = await prisma.telesale.count({ where: { createdAt: { gte: startDate, lte: endDate } } });
  const quotesCreated = await prisma.quotation.count({ where: { createdAt: { gte: startDate, lte: endDate } } });
  const poCreated = await prisma.quotation.count({ 
    where: { 
      status: { in: ['เปิดบิลแล้ว', 'PO แล้วรอสินค้า'] },
      updatedAt: { gte: startDate, lte: endDate } 
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
      updatedAt: { gte: startDate, lte: endDate }
    },
    select: { totalAmountBeforeVat: true }
  });
  const lostAmount = lostQuotes.reduce((sum, q) => sum + (q.totalAmountBeforeVat || 0), 0);

  // startAmount approximation = current - new + won + lost
  const startAmount = Math.max(0, totalPipeline - newAdded + closedSales + lostAmount);

  const data = {
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
