import React from 'react';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import KPIClientDashboard from './KPIClientDashboard';

export const dynamic = 'force-dynamic';

export default async function TeamKPIDashboard(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined; }>; }) {
  const searchParams = await props.searchParams;

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const month = typeof searchParams.month === 'string' ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : today.getFullYear();
  const quarterParam = typeof searchParams.quarter === 'string' ? parseInt(searchParams.quarter) : null;
  const currentQIndex = quarterParam && quarterParam >= 1 && quarterParam <= 4 
    ? quarterParam - 1 
    : Math.floor((month - 1) / 3);
  const quarter = currentQIndex + 1;

  const periodFilter = typeof searchParams.period === 'string' ? searchParams.period : 'รายเดือน';
  const branchFilter = typeof searchParams.branch === 'string' ? searchParams.branch : 'ทีมทั้งหมด';
  const companyParam = typeof searchParams.company === 'string' ? searchParams.company.toUpperCase().trim() : '';
  const companyFilter = ['TE', 'TG', 'TP'].includes(companyParam) ? companyParam : '';

  const getQuotationCompanyCode = (q: {
    quotationNumber?: string | null;
    jobs?: { companyCode?: string | null }[] | null;
  }): 'TE' | 'TG' | 'TP' | 'OTHER' => {
    if (q.jobs && q.jobs.length > 0 && q.jobs[0]?.companyCode) {
      const c = q.jobs[0].companyCode.toUpperCase();
      if (c === 'TE' || c === 'TG' || c === 'TP') return c;
    }
    const qn = (q.quotationNumber || '').trim().toUpperCase();
    if (!qn) return 'OTHER';

    const parts = qn.split('-');
    if (parts.length >= 3 && parts[2]) {
      const char = parts[2][0];
      if (char === 'E') return 'TE';
      if (char === 'G') return 'TG';
      if (char === 'T' || char === 'P') return 'TP';
    }
    if (parts.length >= 2 && parts[1]) {
      const char = parts[1][0];
      if (char === 'E') return 'TE';
      if (char === 'G') return 'TG';
      if (char === 'T' || char === 'P') return 'TP';
    }
    return 'OTHER';
  };

  const getThaiBranchName = (branch: string | null | undefined) => {
    if (!branch) return 'ไม่ระบุสาขา';
    const map: Record<string, string> = {
      'BKK-HQ': 'สำนักงานใหญ่',
      'KK01': 'ขอนแก่น',
      'PSNL01': 'พิษณุโลก',
      'CMI01': 'เชียงใหม่',
      'KRI01': 'กาญจนบุรี',
      'UB01': 'อุบลราชธานี',
      'SRT01': 'สุราษฎร์ธานี',
      'UDN01': 'อุดรธานี',
      'SRN01': 'สุรินทร์',
      'ROI01': 'ร้อยเอ็ด',
      'SN01': 'สกลนคร',
      'NRT': 'นครราชสีมา',
      'BKK-WH': 'Tera Warehouse 62',
      'SMK': 'สมุทรสาคร'
    };
    return map[branch] || branch;
  };

  const getBranchCode = (thaiName: string) => {
    const reverseMap: Record<string, string> = {
      'สำนักงานใหญ่': 'BKK-HQ',
      'ขอนแก่น': 'KK01',
      'พิษณุโลก': 'PSNL01',
      'เชียงใหม่': 'CMI01',
      'กาญจนบุรี': 'KRI01',
      'อุบลราชธานี': 'UB01',
      'สุราษฎร์ธานี': 'SRT01',
      'อุดรธานี': 'UDN01',
      'สุรินทร์': 'SRN01',
      'ร้อยเอ็ด': 'ROI01',
      'สกลนคร': 'SN01',
      'นครราชสีมา': 'NRT',
      'Tera Warehouse 62': 'BKK-WH',
      'สมุทรสาคร': 'SMK'
    };
    return reverseMap[thaiName] || thaiName;
  };

  // Date calculations based on period filter
  let startDate, endDate, prevStartDate, prevEndDate;
  let targetMonths: number[] = [];

  if (periodFilter === 'รายปี') {
    startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    prevStartDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
    prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else if (periodFilter === 'รายไตรมาส') {
    const q = currentQIndex;
    startDate = new Date(year, q * 3, 1, 0, 0, 0, 0);
    endDate = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
    if (q === 0) {
      prevStartDate = new Date(year - 1, 9, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year - 1, 12, 0, 23, 59, 59, 999);
    } else {
      prevStartDate = new Date(year, (q - 1) * 3, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, (q - 1) * 3 + 3, 0, 23, 59, 59, 999);
    }
    targetMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
  } else { // รายเดือน
    startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
    prevStartDate = new Date(year, month - 2, 1, 0, 0, 0, 0);
    prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
    targetMonths = [month];
  }

  // Branch filtering
  const branchCode = branchFilter !== 'ทีมทั้งหมด' ? getBranchCode(branchFilter) : null;

  // First, fetch all active salespeople to know who is in the selected branch
  const allSalesTeamRaw = await prisma.user.findMany({
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
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      employeeSale: { select: { branch: true } }
    }
  });

  const branches = [
    'สำนักงานใหญ่',
    'ขอนแก่น',
    'พิษณุโลก',
    'เชียงใหม่',
    'กาญจนบุรี',
    'อุบลราชธานี',
    'สุราษฎร์ธานี',
    'อุดรธานี',
    'สุรินทร์',
    'ร้อยเอ็ด',
    'สกลนคร',
    'นครราชสีมา',
    'Tera Warehouse 62',
    'สมุทรสาคร',
    'ไม่ระบุสาขา'
  ];

  const empIds = allSalesTeamRaw.map(u => u.employeeId).filter(Boolean) as string[];
  let hrEmployees: any[] = [];
  try {
    hrEmployees = await teraDb.employees.findMany({
      where: { emp_id: { in: empIds } },
      select: { emp_id: true, branch_id: true }
    });
  } catch (err) {
    console.warn("Failed to fetch employees from teraDb:", err);
  }

  // Filter users based on selected branch
  const filteredSalesTeam = branchCode
    ? allSalesTeamRaw.filter(r => {
      const hrEmp = hrEmployees.find(h => h.emp_id === r.employeeId);
      const userBranch = hrEmp?.branch_id || r.employeeSale?.branch;
      if (branchCode === 'ไม่ระบุสาขา') return !userBranch;
      return userBranch === branchCode;
    })
    : allSalesTeamRaw;

  const validUserIds = filteredSalesTeam.map(u => u.id);

  // 1. Current Period Sales (Won Quotes)
  const currentPeriodQuotesRaw = await prisma.quotation.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(branchCode ? { salespersonId: { in: validUserIds } } : {})
    },
    select: {
      id: true,
      status: true,
      actualClosingAmount: true,
      totalAmountBeforeVat: true,
      createdAt: true,
      updatedAt: true,
      quotationNumber: true,
      jobs: { select: { companyCode: true } },
      company: { select: { companyName: true } }
    }
  });

  const companyBreakdown: Record<string, { count: number; wonCount: number; sales: number }> = {
    TE: { count: 0, wonCount: 0, sales: 0 },
    TG: { count: 0, wonCount: 0, sales: 0 },
    TP: { count: 0, wonCount: 0, sales: 0 },
  };

  currentPeriodQuotesRaw.forEach(q => {
    const code = getQuotationCompanyCode(q);
    if (companyBreakdown[code]) {
      companyBreakdown[code].count++;
      const isWon = q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO');
      if (isWon) {
        companyBreakdown[code].wonCount++;
        companyBreakdown[code].sales += (q.actualClosingAmount || q.totalAmountBeforeVat || 0);
      }
    }
  });

  const currentPeriodQuotes = companyFilter
    ? currentPeriodQuotesRaw.filter(q => getQuotationCompanyCode(q) === companyFilter)
    : currentPeriodQuotesRaw;

  const currentPeriodWon = currentPeriodQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
  const currentMonthSales = currentPeriodWon.reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);

  // Win Rate
  const currentPeriodTotalQuotesCount = currentPeriodQuotes.length;
  const winRate = currentPeriodTotalQuotesCount > 0 ? (currentPeriodWon.length / currentPeriodTotalQuotesCount) * 100 : 0;

  // Prev Period Win Rate & Sales for trends
  const prevPeriodQuotesRaw = await prisma.quotation.findMany({
    where: {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
      ...(branchCode ? { salespersonId: { in: validUserIds } } : {})
    },
    select: {
      status: true,
      actualClosingAmount: true,
      totalAmountBeforeVat: true,
      quotationNumber: true,
      jobs: { select: { companyCode: true } }
    }
  });
  const prevPeriodQuotes = companyFilter
    ? prevPeriodQuotesRaw.filter(q => getQuotationCompanyCode(q) === companyFilter)
    : prevPeriodQuotesRaw;
  const prevPeriodWon = prevPeriodQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
  const prevMonthSales = prevPeriodWon.reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
  const prevWinRate = prevPeriodQuotes.length > 0 ? (prevPeriodWon.length / prevPeriodQuotes.length) * 100 : 0;

  // Pipeline (All active pending for these users)
  const activePipelineQuotesRaw = await prisma.quotation.findMany({
    where: {
      status: { in: ['เสนอราคา', 'ความสนใจ', 'รอใบประเมินราคา', 'รอจัดทำ PO'] },
      ...(branchCode ? { salespersonId: { in: validUserIds } } : {})
    },
    select: {
      id: true,
      totalAmountBeforeVat: true,
      createdAt: true,
      quotationNumber: true,
      jobs: { select: { companyCode: true } },
      company: { select: { companyName: true } }
    }
  });
  const activePipelineQuotes = companyFilter
    ? activePipelineQuotesRaw.filter(q => getQuotationCompanyCode(q) === companyFilter)
    : activePipelineQuotesRaw;
  const pipelineAmount = activePipelineQuotes.reduce((sum, q) => sum + (q.totalAmountBeforeVat || 0), 0);
  const pipelineCount = activePipelineQuotes.length;

  // Stale Deals (Pending for > 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const staleDeals = activePipelineQuotes
    .filter(q => q.createdAt < thirtyDaysAgo)
    .map(q => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      companyName: q.company?.companyName || 'ไม่ระบุบริษัท',
      amount: q.totalAmountBeforeVat || 0,
      days: Math.floor((new Date().getTime() - q.createdAt.getTime()) / (1000 * 3600 * 24))
    }))
    .sort((a, b) => b.days - a.days);

  // Top Customers (Grouped from current period won)
  const customerSales: Record<string, number> = {};
  currentPeriodWon.forEach(q => {
    const name = q.company?.companyName;
    if (name) {
      customerSales[name] = (customerSales[name] || 0) + (q.actualClosingAmount || q.totalAmountBeforeVat || 0);
    }
  });
  const topCustomers = Object.entries(customerSales)
    .map(([companyName, sales]) => ({ companyName, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // Funnel Data
  const leadCount = await prisma.marketingLead.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(branchCode ? {
        OR: [
          { assignedToId: { in: validUserIds } },
          { createdByUserId: { in: validUserIds } }
        ]
      } : {})
    }
  }).catch(() => 0);

  const telesaleCount = await prisma.telesale.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(branchCode ? { userId: { in: validUserIds } } : {})
    }
  });

  const poCount = currentPeriodQuotes.filter(q => q.status.startsWith('PO') || q.status === 'เปิดบิลแล้ว').length;
  const invoiceCount = currentPeriodQuotes.filter(q => q.status === 'เปิดบิลแล้ว').length;

  const maxFunnelValue = Math.max(
    leadCount,
    telesaleCount,
    currentPeriodTotalQuotesCount,
    poCount,
    invoiceCount
  );
  const actualLeadCount = (leadCount >= maxFunnelValue && leadCount > 0) ? leadCount : Math.floor(maxFunnelValue * 1.2) || 0;


  const funnel = {
    lead: actualLeadCount,
    telesale: telesaleCount,
    quotation: currentPeriodTotalQuotesCount,
    po: poCount,
    invoice: invoiceCount
  };

  // Sales Team Data
  // We need to fetch the detailed relationships for the filtered users
  const detailedTeamData = await prisma.user.findMany({
    where: { id: { in: validUserIds } },
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      employeeSale: { select: { branch: true } },
      monthlyTargets: { where: { year, month: { in: targetMonths } }, select: { amount: true } },
      telesales: { where: { createdAt: { gte: startDate, lte: endDate } }, select: { id: true } },
      quotations: {
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: {
          status: true,
          actualClosingAmount: true,
          totalAmountBeforeVat: true,
          createdAt: true,
          updatedAt: true,
          quotationNumber: true,
          jobs: { select: { companyCode: true } }
        }
      }
    }
  });

  const salesTeam = detailedTeamData.map(rep => {
    const repTarget = rep.monthlyTargets.reduce((sum, t) => sum + (t.amount || 0), 0);
    const calls = rep.telesales.length;

    const repQuotes = companyFilter
      ? rep.quotations.filter(q => getQuotationCompanyCode(q) === companyFilter)
      : rep.quotations;

    const totalQ = repQuotes.length;
    const wonQ = repQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
    const sales = wonQ.reduce((sum, q) => sum + (q.actualClosingAmount || q.totalAmountBeforeVat || 0), 0);
    const repWinRate = totalQ > 0 ? (wonQ.length / totalQ) * 100 : 0;

    // Average days to close for won quotes
    const closeTimes = wonQ.map(q => Math.max(1, Math.floor((q.updatedAt.getTime() - q.createdAt.getTime()) / (1000 * 3600 * 24))));
    const daysToClose = closeTimes.length > 0 ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length) : 0;

    const hrEmp = hrEmployees.find(h => h.emp_id === rep.employeeId);
    const repBranch = hrEmp?.branch_id || rep.employeeSale?.branch;

    return {
      id: rep.id,
      name: rep.fullName,
      branch: getThaiBranchName(repBranch),
      target: repTarget,
      sales,
      calls,
      winRate: repWinRate,
      daysToClose
    };
  });

  // Sort by sales descending, then by win rate descending
  salesTeam.sort((a, b) => b.sales - a.sales || b.winRate - a.winRate);

  // Target Sales: Sum of individual targets for the active sales team across targetMonths
  let targetSales = salesTeam.reduce((sum, rep) => sum + (rep.target || 0), 0);
  if (targetSales === 0) {
    const teamTargets = await prisma.monthlyTarget.findMany({
      where: {
        year,
        month: { in: targetMonths },
        userId: null
      },
      select: { amount: true }
    });
    targetSales = teamTargets.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  const wonCount = currentPeriodWon.length;
  const avgDealSize = wonCount > 0 ? Math.round(currentMonthSales / wonCount) : 0;

  const data = {
    month, year, quarter,
    companyFilter,
    companyBreakdown,
    currentMonthSales,
    prevMonthSales,
    targetSales,
    pipelineAmount,
    pipelineCount,
    winRate,
    prevWinRate,
    funnel,
    salesTeam,
    branches,
    staleDeals,
    topCustomers,
    wonCount,
    avgDealSize
  };

  return <KPIClientDashboard data={data} />;
}
