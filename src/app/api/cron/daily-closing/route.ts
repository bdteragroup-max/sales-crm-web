import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { pushLineMessage } from '@/app/lib/lineNotify';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    // 1. Fetch Sales Reps and map to HR Branches
    const salesReps = await prisma.user.findMany({ select: { id: true, employeeId: true, fullName: true, employeeSale: { select: { branch: true } } } });
    const empIds = salesReps.map(r => r.employeeId).filter(Boolean) as string[];
    const hrEmployees = await teraDb.employees.findMany({
      where: { emp_id: { in: empIds } },
      select: { emp_id: true, branch_id: true }
    });
    
    // Hardcoded branch names because teraDb client in sales-crm-web is outdated
    const branchNameMap: Record<string, string> = {
      'SN01': 'สกลนคร',
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

    const repBranchMap: Record<string, string> = {};
    salesReps.forEach(r => {
      const hrEmp = hrEmployees.find(h => h.emp_id === r.employeeId);
      const branchId = hrEmp?.branch_id || (r.employeeSale as any)?.branch;
      let branchName = branchId ? (branchNameMap[branchId] || branchId) : 'สำนักงานใหญ่';
      if (branchName === 'Head Office') branchName = 'สำนักงานใหญ่';
      repBranchMap[r.id] = branchName;
    });

    // 2. Fetch Won Quotes (YTD for Chart, MTD for Cards)
    const ytdSales = await prisma.quotation.findMany({
      where: {
        OR: [{ status: 'เปิดบิลแล้ว' }, { status: { startsWith: 'PO' } }],
        createdAt: { gte: startOfYear, lte: today }
      }
    });

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const mtdSales = await prisma.quotation.findMany({
      where: {
        OR: [{ status: 'เปิดบิลแล้ว' }, { status: { startsWith: 'PO' } }],
        createdAt: { gte: startOfMonth, lte: today }
      }
    });

    let totalYtdAmount = 0;
    const monthlySales = Array(12).fill(0);
    ytdSales.forEach(q => {
      const amt = q.actualClosingAmount || q.totalAmountBeforeVat || 0;
      totalYtdAmount += amt;
      const month = q.createdAt.getMonth();
      monthlySales[month] += amt;
    });

    const branchSalesMap: Record<string, number> = {};
    const uniqueBranchNames = Array.from(new Set(Object.values(branchNameMap)));
    uniqueBranchNames.forEach(b => {
      if (b !== 'สำนักงานใหญ่' && b !== 'Head Office') {
        branchSalesMap[b] = 0;
      }
    });

    const hqProductMap: Record<string, number> = {};
    const branchProductMap: Record<string, number> = {};
    
    mtdSales.forEach(q => {
      const amt = q.actualClosingAmount || q.totalAmountBeforeVat || 0;
      const branch = q.salespersonId ? (repBranchMap[q.salespersonId] || 'สำนักงานใหญ่') : 'สำนักงานใหญ่';
      branchSalesMap[branch] = (branchSalesMap[branch] || 0) + amt;

      const pType = q.productType || 'อื่นๆ';
      if (branch === 'Head Office' || branch === 'สำนักงานใหญ่') {
        hqProductMap[pType] = (hqProductMap[pType] || 0) + amt;
      } else {
        branchProductMap[pType] = (branchProductMap[pType] || 0) + amt;
      }
    });

    // 3. Telesales (Daily)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dailyTelesales = await prisma.telesale.findMany({
      where: { callDate: { gte: startOfDay, lte: today } },
      select: { callStatus: true, callbackAt: true }
    });
    const totalDailyCalls = dailyTelesales.length;
    const answeredCalls = dailyTelesales.filter(t => t.callStatus === 'รับสาย').length;
    const rejectedCalls = dailyTelesales.filter(t => t.callStatus === 'ไม่รับสาย' || t.callStatus === 'ปฏิเสธ').length;
    const callbackCalls = dailyTelesales.filter(t => t.callbackAt !== null).length;

    // 4. Daily P&L (Sales vs Expenses)
    const dailySales = await prisma.quotation.findMany({
      where: { 
        OR: [{ status: 'เปิดบิลแล้ว' }, { status: { startsWith: 'PO' } }], 
        createdAt: { gte: startOfDay, lte: today } 
      }
    });
    const dailyExpenses = await prisma.branchExpense.findMany({
      where: { date: { gte: startOfDay, lte: today } }
    });

    const dailyBranchMap: Record<string, { sales: number; expenses: number }> = {};
    const uniqueBranches = Array.from(new Set(Object.values(branchNameMap)));
    // Make sure Head Office is first
    const sortedBranches = ['สำนักงานใหญ่', ...uniqueBranches.filter(b => b !== 'สำนักงานใหญ่')];
    sortedBranches.forEach(bName => {
      dailyBranchMap[bName] = { sales: 0, expenses: 0 };
    });
    dailySales.forEach(q => {
      const amt = q.actualClosingAmount || q.totalAmountBeforeVat || 0;
      const branch = q.salespersonId ? (repBranchMap[q.salespersonId] || 'สำนักงานใหญ่') : 'สำนักงานใหญ่';
      if (!dailyBranchMap[branch]) dailyBranchMap[branch] = { sales: 0, expenses: 0 };
      dailyBranchMap[branch].sales += amt;
    });

    dailyExpenses.forEach(e => {
      let branchName = branchNameMap[e.branch] || e.branch || 'สำนักงานใหญ่';
      if (branchName === 'Head Office') branchName = 'สำนักงานใหญ่';
      if (!dailyBranchMap[branchName]) dailyBranchMap[branchName] = { sales: 0, expenses: 0 };
      dailyBranchMap[branchName].expenses += e.amount;
    });

    // 4. QuickChart
    // Chart 1: Daily closing by branch
    const dailyBranchLabels = Object.keys(dailyBranchMap);
    const dailyBranchSales = dailyBranchLabels.map(b => dailyBranchMap[b].sales);
    const branchChartConfig = {
      type: 'bar',
      data: {
        labels: dailyBranchLabels,
        datasets: [{
          label: 'ยอดขายวันนี้',
          data: dailyBranchSales,
          backgroundColor: '#10b981'
        }]
      },
      options: {
        plugins: { datalabels: { display: false } },
        scales: { xAxes: [{ ticks: { fontSize: 10 } }] }
      }
    };
    const branchChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(branchChartConfig))}&w=600&h=300&bkg=white`;

    // Chart 2: HQ Product Breakdown
    const hqProductLabels = Object.keys(hqProductMap);
    const hqProductSales = hqProductLabels.map(p => hqProductMap[p]);
    const hqChartConfig = {
      type: 'bar',
      data: {
        labels: hqProductLabels,
        datasets: [{
          label: 'ยอดขายสินค้า (HQ)',
          data: hqProductSales,
          backgroundColor: '#c2410c'
        }]
      },
      options: {
        plugins: { datalabels: { display: false } },
        scales: { xAxes: [{ ticks: { fontSize: 10 } }] }
      }
    };
    const hqChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(hqChartConfig))}&w=600&h=300&bkg=white`;

    // Chart 3: Branch Product Breakdown
    const branchProductLabels = Object.keys(branchProductMap);
    const branchProductSales = branchProductLabels.map(p => branchProductMap[p]);
    const branchProductChartConfig = {
      type: 'bar',
      data: {
        labels: branchProductLabels,
        datasets: [{
          label: 'ยอดขายสินค้า (สาขา)',
          data: branchProductSales,
          backgroundColor: '#047857'
        }]
      },
      options: {
        plugins: { datalabels: { display: false } },
        scales: { xAxes: [{ ticks: { fontSize: 10 } }] }
      }
    };
    const branchProductChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(branchProductChartConfig))}&w=600&h=300&bkg=white`;

    // 5. Flex Message Carousel
    // @ts-ignore
    const hqBoxes = Object.entries(hqProductMap).map(([product, amt]) => ({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: product, size: 'sm', color: '#64748b', flex: 2 },
        { type: 'text', text: `฿${amt.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#c2410c', flex: 3 }
      ]
    }));
    
    const totalHqSales = Object.values(hqProductMap).reduce((sum, amt) => sum + amt, 0);
    if (hqBoxes.length > 0) {
      hqBoxes.push({ type: 'separator', margin: 'md' } as any);
      hqBoxes.push({
        type: 'box', layout: 'horizontal', margin: 'md',
        contents: [
          { type: 'text', text: 'รวมทั้งหมด', size: 'sm', weight: 'bold', color: '#c2410c', flex: 2 },
          { type: 'text', text: `฿${totalHqSales.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#c2410c', flex: 3 }
        ]
      } as any);
    }

    // @ts-ignore
    const branchProductBoxes = Object.entries(branchProductMap).map(([product, amt]) => ({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: product, size: 'sm', color: '#64748b', flex: 2 },
        { type: 'text', text: `฿${amt.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#047857', flex: 3 }
      ]
    }));
    
    const totalBranchProductSales = Object.values(branchProductMap).reduce((sum, amt) => sum + amt, 0);
    if (branchProductBoxes.length > 0) {
      branchProductBoxes.push({ type: 'separator', margin: 'md' } as any);
      branchProductBoxes.push({
        type: 'box', layout: 'horizontal', margin: 'md',
        contents: [
          { type: 'text', text: 'รวมทั้งหมด', size: 'sm', weight: 'bold', color: '#047857', flex: 2 },
          { type: 'text', text: `฿${totalBranchProductSales.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#047857', flex: 3 }
        ]
      } as any);
    }

    // @ts-ignore
    const branchBoxes = Object.entries(branchSalesMap).filter(([b]) => b !== 'Head Office' && b !== 'สำนักงานใหญ่').map(([branch, amt]) => ({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: branch, size: 'sm', color: '#64748b', flex: 2 },
        { type: 'text', text: `฿${amt.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#10b981', flex: 3 }
      ]
    }));

    const dailyBoxes = Object.entries(dailyBranchMap).map(([branch, data]) => ({
      type: 'box', layout: 'vertical', margin: 'lg',
      contents: [
        { type: 'text', text: branch, weight: 'bold', size: 'sm', color: '#1e40af' },
        {
          type: 'box', layout: 'horizontal', margin: 'sm',
          contents: [
            { type: 'text', text: 'รายรับ', size: 'xs', color: '#64748b' },
            { type: 'text', text: `฿${data.sales.toLocaleString()}`, size: 'xs', weight: 'bold', align: 'end', color: '#10b981' }
          ]
        },
        {
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: 'รายจ่าย', size: 'xs', color: '#64748b' },
            { type: 'text', text: `฿${data.expenses.toLocaleString()}`, size: 'xs', weight: 'bold', align: 'end', color: '#ef4444' }
          ]
        }
      ]
    }));

    let totalDailySales = 0;
    let totalDailyExpenses = 0;
    Object.values(dailyBranchMap).forEach(d => {
      totalDailySales += d.sales;
      totalDailyExpenses += d.expenses;
    });

    if (dailyBoxes.length > 0) {
      dailyBoxes.push({
        type: 'box', layout: 'vertical', margin: 'xl', spacing: 'sm',
        contents: [
          { type: 'separator' },
          {
            type: 'box', layout: 'horizontal', margin: 'lg',
            contents: [
              { type: 'text', text: 'รวมทั้งหมด', weight: 'bold', size: 'sm', color: '#1e40af' }
            ]
          },
          {
            type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รายรับรวม', size: 'xs', color: '#64748b' },
              { type: 'text', text: `฿${totalDailySales.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#10b981' }
            ]
          },
          {
            type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รายจ่ายรวม', size: 'xs', color: '#64748b' },
              { type: 'text', text: `฿${totalDailyExpenses.toLocaleString()}`, size: 'sm', weight: 'bold', align: 'end', color: '#ef4444' }
            ]
          }
        ]
      } as any);
    }

    const flexMessage = {
      type: 'flex',
      altText: '📊 Daily Closing Report',
      contents: {
        type: 'carousel',
        contents: [
          // Bubble 2: HQ Product Breakdown
          {
            type: 'bubble',
            header: {
              type: 'box', layout: 'vertical', backgroundColor: '#c2410c',
              contents: [
                { type: 'text', text: '📦 สินค้า สำนักงานใหญ่', color: '#ffffff', weight: 'bold', size: 'lg' }
              ]
            },
            body: {
              type: 'box', layout: 'vertical',
              contents: [
                ...(hqBoxes.length > 0 ? hqBoxes : [{ type: 'text', text: 'ยังไม่มียอดขายเดือนนี้', size: 'sm', color: '#64748b' }]),
                ...(hqBoxes.length > 0 ? [{ type: 'image', url: hqChartUrl, size: 'full', aspectRatio: '2:1', aspectMode: 'cover', margin: 'lg' }] : [])
              ]
            }
          },
          // Bubble 3: Branch Product Breakdown
          {
            type: 'bubble',
            header: {
              type: 'box', layout: 'vertical', backgroundColor: '#047857',
              contents: [
                { type: 'text', text: '📦 สินค้า สาขาภูมิภาค', color: '#ffffff', weight: 'bold', size: 'lg' }
              ]
            },
            body: {
              type: 'box', layout: 'vertical',
              contents: [
                ...(branchProductBoxes.length > 0 ? branchProductBoxes : [{ type: 'text', text: 'ยังไม่มียอดขายเดือนนี้', size: 'sm', color: '#64748b' }]),
                ...(branchProductBoxes.length > 0 ? [{ type: 'image', url: branchProductChartUrl, size: 'full', aspectRatio: '2:1', aspectMode: 'cover', margin: 'lg' }] : [])
              ]
            }
          },
          // Bubble 4: Branches
          {
            type: 'bubble',
            header: {
              type: 'box', layout: 'vertical', backgroundColor: '#047857',
              contents: [
                { type: 'text', text: '📍 สาขาภูมิภาค (เดือนนี้)', color: '#ffffff', weight: 'bold', size: 'lg' }
              ]
            },
            body: {
              type: 'box', layout: 'vertical',
              contents: branchBoxes.length > 0 ? branchBoxes : [{ type: 'text', text: 'ยังไม่มียอดขายเดือนนี้', size: 'sm', color: '#64748b' }]
            }
          },
          // Bubble 4: Telesales
          {
            type: 'bubble',
            header: {
              type: 'box', layout: 'vertical', backgroundColor: '#0284c7',
              contents: [
                { type: 'text', text: '📞 Telesales (วันนี้)', color: '#ffffff', weight: 'bold', size: 'lg' }
              ]
            },
            body: {
              type: 'box', layout: 'vertical',
              contents: [
                {
                  type: 'box', layout: 'horizontal', margin: 'md',
                  contents: [
                    { type: 'text', text: 'ปริมาณสายทั้งหมด', size: 'sm', color: '#64748b' },
                    { type: 'text', text: `${totalDailyCalls}`, size: 'sm', weight: 'bold', align: 'end', color: '#0284c7' }
                  ]
                },
                {
                  type: 'box', layout: 'horizontal', margin: 'md',
                  contents: [
                    { type: 'text', text: 'รับสาย', size: 'sm', color: '#64748b' },
                    { type: 'text', text: `${answeredCalls}`, size: 'sm', weight: 'bold', align: 'end', color: '#10b981' }
                  ]
                },
                {
                  type: 'box', layout: 'horizontal', margin: 'md',
                  contents: [
                    { type: 'text', text: 'ไม่รับสาย / ปฏิเสธ', size: 'sm', color: '#64748b' },
                    { type: 'text', text: `${rejectedCalls}`, size: 'sm', weight: 'bold', align: 'end', color: '#ef4444' }
                  ]
                },
                {
                  type: 'box', layout: 'horizontal', margin: 'md',
                  contents: [
                    { type: 'text', text: 'นัดโทรกลับ', size: 'sm', color: '#64748b' },
                    { type: 'text', text: `${callbackCalls}`, size: 'sm', weight: 'bold', align: 'end', color: '#f59e0b' }
                  ]
                }
              ]
            }
          },
          // Bubble 5: Daily P&L
          {
            type: 'bubble',
            header: {
              type: 'box', layout: 'vertical', backgroundColor: '#8b5cf6',
              contents: [
                { type: 'text', text: '🌟 สรุปประจำวัน (P&L)', color: '#ffffff', weight: 'bold', size: 'lg' },
                { type: 'text', text: today.toLocaleDateString('th-TH'), color: '#ddd6fe', size: 'sm' }
              ]
            },
            body: {
              type: 'box', layout: 'vertical',
              contents: [
                ...(dailyBoxes.length > 0 ? dailyBoxes : [{ type: 'text', text: 'ไม่มีข้อมูลของวันนี้', size: 'sm', color: '#64748b' }]),
                { type: 'image', url: branchChartUrl, size: 'full', aspectRatio: '2:1', aspectMode: 'cover', margin: 'lg' }
              ]
            }
          }
        ]
      }
    };

    const { searchParams } = new URL(request.url);
    const targetLineId = searchParams.get('lineId') || 'Uab7c9e55fa71f2b9eabb2dc7932d312b';
    await pushLineMessage(targetLineId, [flexMessage]);

    return NextResponse.json({ success: true, message: `Report sent to ${targetLineId}.` });
  } catch (error) {
    console.error('Cron Job Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
