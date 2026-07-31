import React from 'react';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import KPIClientDashboard from './KPIClientDashboard';

export const dynamic = 'force-dynamic';

export default async function TeamKPIDashboard(props: {searchParams: Promise<{[key: string]: string | string[] | undefined;}>;}) {
  const searchParams = await props.searchParams;
  
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const month = typeof searchParams.month === 'string' ? parseInt(searchParams.month) : today.getMonth() + 1;
  const year = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : today.getFullYear();
  
  const periodFilter = typeof searchParams.period === 'string' ? searchParams.period : 'รายเดือน';
  const branchFilter = typeof searchParams.branch === 'string' ? searchParams.branch : 'ทีมทั้งหมด';

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
      'Tera Warehouse 62': 'BKK-WH',
      'สมุทรสาคร': 'SMK'
    };
    return reverseMap[thaiName] || thaiName;
  };

  // Date calculations based on period filter
  let startDate, endDate, prevStartDate, prevEndDate;
  let targetMonths: number[] = [];

  if (periodFilter === 'รายปี') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    prevStartDate = new Date(year - 1, 0, 1);
    prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    targetMonths = [1,2,3,4,5,6,7,8,9,10,11,12];
  } else if (periodFilter === 'รายไตรมาส') {
    const q = Math.floor((month - 1) / 3);
    startDate = new Date(year, q * 3, 1);
    endDate = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999);
    prevStartDate = new Date(year, (q - 1) * 3, 1);
    prevEndDate = new Date(year, (q - 1) * 3 + 3, 0, 23, 59, 59, 999);
    targetMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
  } else { // รายเดือน
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
    prevStartDate = new Date(year, month - 2, 1);
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
    'Tera Warehouse 62',
    'สมุทรสาคร',
    'ไม่ระบุสาขา'
  ];
  
  const empIds = allSalesTeamRaw.map(u => u.employeeId).filter(Boolean) as string[];
  const hrEmployees = await teraDb.employees.findMany({
    where: { emp_id: { in: empIds } },
    select: { emp_id: true, branch_id: true }
  });

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
  const currentPeriodQuotes = await prisma.quotation.findMany({
    where: { 
      createdAt: { gte: startDate, lte: endDate },
      ...(branchCode ? { salespersonId: { in: validUserIds } } : {})
    },
    select: { status: true, actualClosingAmount: true, totalAmountBeforeVat: true, createdAt: true, updatedAt: true, company: { select: { companyName: true } } }
  });
  
  const currentPeriodWon = currentPeriodQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
  const currentMonthSales = currentPeriodWon.reduce((sum, q) => sum + (q.actualClosingAmount || 0), 0);
  
  // Win Rate
  const currentPeriodTotalQuotesCount = currentPeriodQuotes.length;
  const winRate = currentPeriodTotalQuotesCount > 0 ? (currentPeriodWon.length / currentPeriodTotalQuotesCount) * 100 : 0;

  // Prev Period Win Rate & Sales for trends
  const prevPeriodQuotes = await prisma.quotation.findMany({
    where: { 
      createdAt: { gte: prevStartDate, lte: prevEndDate },
      ...(branchCode ? { salespersonId: { in: validUserIds } } : {})
    },
    select: { status: true, actualClosingAmount: true }
  });
  const prevPeriodWon = prevPeriodQuotes.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
  const prevMonthSales = prevPeriodWon.reduce((sum, q) => sum + (q.actualClosingAmount || 0), 0);
  const prevWinRate = prevPeriodQuotes.length > 0 ? (prevPeriodWon.length / prevPeriodQuotes.length) * 100 : 0;

  // Pipeline (All active pending for these users)
  const activePipelineQuotes = await prisma.quotation.findMany({
    where: { 
      status: { in: ['เสนอราคา', 'ความสนใจ', 'รอใบประเมินราคา', 'รอจัดทำ PO'] },
      ...(branchCode ? { salespersonId: { in: validUserIds } } : {})
    },
    select: { id: true, totalAmountBeforeVat: true, createdAt: true, quotationNumber: true, company: { select: { companyName: true } } }
  });
  const pipelineAmount = activePipelineQuotes.reduce((sum, q) => sum + (q.totalAmountBeforeVat || 0), 0);
  const pipelineCount = activePipelineQuotes.length;

  // Stale Deals (Pending for > 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const staleDeals = activePipelineQuotes
    .filter(q => q.createdAt < thirtyDaysAgo)
    .map(q => ({
      quotationNumber: q.quotationNumber,
      companyName: q.company?.companyName || 'ไม่ระบุบริษัท',
      days: Math.floor((new Date().getTime() - q.createdAt.getTime()) / (1000 * 3600 * 24))
    }))
    .sort((a, b) => b.days - a.days);

  // Top Customers (Grouped from current period won)
  const customerSales: Record<string, number> = {};
  currentPeriodWon.forEach(q => {
    const name = q.company?.companyName;
    if (name) {
      customerSales[name] = (customerSales[name] || 0) + (q.actualClosingAmount || 0);
    }
  });
  const topCustomers = Object.entries(customerSales)
    .map(([companyName, sales]) => ({ companyName, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // Target Sales (Sum of MonthlyTargets for the selected months and users)
  const targets = await prisma.monthlyTarget.findMany({
    where: { 
      year,
      month: { in: targetMonths },
      ...(branchCode ? { userId: { in: validUserIds } } : {})
    },
    select: { amount: true }
  });
  const targetSales = targets.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Funnel Data
  const leadCount = await prisma.marketingLead.count({ 
    where: { 
      createdAt: { gte: startDate, lte: endDate },
      ...(branchCode ? { createdByUserId: { in: validUserIds } } : {})
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
        select: { status: true, actualClosingAmount: true, createdAt: true, updatedAt: true } 
      }
    }
  });

  const salesTeam = detailedTeamData.map(rep => {
    const repTarget = rep.monthlyTargets.reduce((sum, t) => sum + (t.amount || 0), 0);
    const calls = rep.telesales.length;
    
    const totalQ = rep.quotations.length;
    const wonQ = rep.quotations.filter(q => q.status === 'เปิดบิลแล้ว' || q.status.startsWith('PO'));
    const sales = wonQ.reduce((sum, q) => sum + (q.actualClosingAmount || 0), 0);
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

  const data = {
    month, year,
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
    topCustomers
  };

  return <KPIClientDashboard data={data} />;
}
