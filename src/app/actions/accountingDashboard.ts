"use server";
import prisma from "@/app/lib/db";

function extractSearchKeywords(project: any) {
  const terms = new Set<string>();

  if (project.projectNumber && project.projectNumber.length >= 3) {
    terms.add(project.projectNumber);
    terms.add(project.projectNumber.replace(/[^a-zA-Z0-9]/g, ""));
  }

  if (project.job?.jobNumber && project.job.jobNumber.length >= 3) {
    terms.add(project.job.jobNumber);
    terms.add(project.job.jobNumber.replace(/[^a-zA-Z0-9]/g, ""));
  }

  if (project.contractNumber && project.contractNumber.length >= 4) {
    terms.add(project.contractNumber);
  }

  let primaryKeyword = "";
  if (project.name) {
    terms.add(project.name);
    // Strip common Thai & English prefixes like "โครงการ", "งาน", "Project:"
    const clean = project.name
      .replace(/^(Project|PJ|โครงการ|งานติดตั้ง|ติดตั้งระบบ|งาน|ก่อสร้าง|ระบบ)\s*[:\-\s]*/gi, "")
      .replace(/\s*(จำกัด|มหาชน|\(มหาชน\))\s*$/gi, "")
      .trim();
    if (clean.length >= 3) {
      terms.add(clean);
      primaryKeyword = clean;
    }
  }

  if (!primaryKeyword && project.name) {
    primaryKeyword = project.name;
  }

  if (project.clientName) {
    terms.add(project.clientName);
    const cleanClient = project.clientName
      .replace(/^(บริษัท|บจก\.|หจก\.|ห้างหุ้นส่วนจำกัด)\s*/gi, "")
      .replace(/\s*(จำกัด|มหาชน|\(มหาชน\))\s*$/gi, "")
      .trim();
    if (cleanClient.length >= 4) {
      terms.add(cleanClient);
    }
  }

  return {
    keywords: Array.from(terms).filter((t) => t && t.length >= 3),
    primaryKeyword: primaryKeyword || project.name || "",
  };
}

export async function getAccountingDashboardData(startDate?: string, endDate?: string) {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Fetch all payment tasks with their job info
  const paymentTasks = await prisma.paymentTask.findMany({
    where: hasDateFilter ? { createdAt: dateFilter } : undefined,
    include: {
      job: {
        include: {
          quotation: true,
          project: true
        }
      }
    }
  });

  // Calculate Revenue (Collections)
  let totalRevenue = 0;
  // Calculate Pending AR
  let totalAR = 0;
  // Calculate Overdue
  let overdueAmount = 0;

  const now = new Date();

  // Aggregate Payment Tasks
  paymentTasks.forEach((pt: any) => {
    const isCompleted = pt.status === 'ตรวจสอบและบันทึกแล้ว';
    const amount = Number(pt.installmentAmount) || Number(pt.job?.project?.projectValue) || Number(pt.job?.quotation?.actualClosingAmount) || Number(pt.job?.quotation?.totalAmountBeforeVat) || 0;

    // Revenue
    if (isCompleted) {
      totalRevenue += amount;
    } else {
      // Partial payments count towards revenue
      if (pt.paidAmount && Number(pt.paidAmount) > 0) {
        totalRevenue += Number(pt.paidAmount);
      }
    }

    // Pending AR (Remaining balance)
    if (!isCompleted) {
      const remaining = amount - (Number(pt.paidAmount) || 0);
      if (remaining > 0) totalAR += remaining;

      // Overdue
      if (pt.dueDate && new Date(pt.dueDate) < now) {
        overdueAmount += remaining;
      }
    }
  });

  // Calculate Expenses
  let totalExpenses = 0;

  // 1. Purchase Orders
  const pos = await prisma.purchaseOrder.findMany({
    where: hasDateFilter ? { createdAt: dateFilter } : undefined,
    select: {
      totalAmount: true,
      createdAt: true,
      jobName: true,
      poNumber: true,
      purchaseRequest: {
        select: { projectName: true }
      }
    }
  });
  pos.forEach(po => {
    if (po.totalAmount) {
      totalExpenses += Number(po.totalAmount);
    }
  });

  // For project performance lifecycle matching, ensure all POs are accessible
  const allPosForProjects = hasDateFilter
    ? await prisma.purchaseOrder.findMany({
        select: {
          totalAmount: true,
          poNumber: true,
          jobName: true,
          purchaseRequest: {
            select: { projectName: true }
          }
        }
      })
    : pos;

  // 2. Branch Expenses (Sales Staff Claims)
  const branchExpenses = await prisma.branchExpense.findMany({
    where: hasDateFilter ? { date: dateFilter } : undefined,
    select: { amount: true, date: true }
  });
  branchExpenses.forEach(exp => {
    if (exp.amount) {
      totalExpenses += Number(exp.amount);
    }
  });

  // Monthly Collection Trend
  const monthlyDataMap = new Map<string, { revenue: number, expenses: number }>();
  const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  paymentTasks.forEach(pt => {
    const isCompleted = pt.status === 'ตรวจสอบและบันทึกแล้ว';
    const dateToUse = pt.paidDate || (isCompleted ? pt.updatedAt : null);

    if (dateToUse) {
      const d = new Date(dateToUse);
      const key = getMonthKey(d);
      const amount = isCompleted
        ? (Number(pt.installmentAmount) || Number(pt.job?.project?.projectValue) || Number(pt.job?.quotation?.actualClosingAmount) || Number(pt.job?.quotation?.totalAmountBeforeVat) || 0)
        : (Number(pt.paidAmount) || 0);

      if (amount > 0) {
        if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { revenue: 0, expenses: 0 });
        monthlyDataMap.get(key)!.revenue += amount;
      }
    }
  });

  pos.forEach(po => {
    if (po.totalAmount && po.createdAt) {
      const key = getMonthKey(new Date(po.createdAt));
      if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { revenue: 0, expenses: 0 });
      monthlyDataMap.get(key)!.expenses += Number(po.totalAmount);
    }
  });

  branchExpenses.forEach(exp => {
    if (exp.amount && exp.date) {
      const key = getMonthKey(new Date(exp.date));
      if (!monthlyDataMap.has(key)) monthlyDataMap.set(key, { revenue: 0, expenses: 0 });
      monthlyDataMap.get(key)!.expenses += Number(exp.amount);
    }
  });

  const monthlyTrend = Array.from(monthlyDataMap.entries())
    .map(([month, data]) => ({ month, revenue: data.revenue, expenses: data.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month)) // sort chronologically
    .slice(-12); // Keep last 12 months only

  // Cash vs Credit breakdown (based on job count)
  let cashJobs = 0;
  let creditJobs = 0;

  paymentTasks.forEach(pt => {
    if (pt.installmentTotal === 1) {
      cashJobs++;
    } else if (pt.installmentTotal && pt.installmentTotal > 1) {
      creditJobs++;
    }
  });

  const paymentMethods = [
    { name: 'เงินสด/โอนเต็มจำนวน', value: cashJobs },
    { name: 'เครดิต/ผ่อนชำระ', value: creditJobs }
  ].filter(m => m.value > 0);

  // All Projects (Income & Expense)
  const activeProjectsData = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      job: {
        include: {
          paymentTasks: true
        }
      }
    }
  });

  const ongoingProjects = activeProjectsData.map(project => {
    let income = 0;
    if (project.job && project.job.paymentTasks) {
      project.job.paymentTasks.forEach(pt => {
        if (pt.status === 'ตรวจสอบและบันทึกแล้ว') {
          const ptAmount = Number(pt.paidAmount) || Number(pt.installmentAmount) || Number(project.projectValue) || 0;
          income += ptAmount;
        }
      });
    }

    const { keywords, primaryKeyword } = extractSearchKeywords(project);
    let expense = 0;
    let poCount = 0;

    allPosForProjects.forEach(po => {
      if (po.totalAmount) {
        const hasValidPoNumber = project.job && project.job.poNumber && project.job.poNumber.length > 0;
        const matchesPO = hasValidPoNumber && po.poNumber === project.job?.poNumber;

        let matchesKeywords = false;
        const jn = (po.jobName || "").toLowerCase();
        const prProj = (po.purchaseRequest?.projectName || "").toLowerCase();

        if (keywords.length > 0) {
          matchesKeywords = keywords.some(kw => {
            const lower = kw.toLowerCase();
            return jn.includes(lower) || prProj.includes(lower);
          });
        }

        if (matchesPO || matchesKeywords) {
          expense += Number(po.totalAmount);
          poCount++;
        }
      }
    });

    return {
      id: project.id,
      projectName: project.name,
      projectNumber: project.projectNumber,
      clientName: project.clientName || project.job?.customerName || '-',
      budget: Number(project.projectValue) || Number(project.amountIncludingVat) || 0,
      income,
      expense,
      poCount,
      primaryKeyword,
      status: project.status
    };
  });

  // Top Overdue (up to 50 items for complete review)
  const overdueTasks = paymentTasks
    .filter(pt => pt.status !== 'ตรวจสอบและบันทึกแล้ว' && pt.dueDate && new Date(pt.dueDate) < now);

  const topOverdue = overdueTasks
    .sort((a: any, b: any) => {
      const remainA = (Number(a.installmentAmount) || Number(a.job?.project?.projectValue) || Number(a.job?.quotation?.actualClosingAmount) || Number(a.job?.quotation?.totalAmountBeforeVat) || 0) - (Number(a.paidAmount) || 0);
      const remainB = (Number(b.installmentAmount) || Number(b.job?.project?.projectValue) || Number(b.job?.quotation?.actualClosingAmount) || Number(b.job?.quotation?.totalAmountBeforeVat) || 0) - (Number(b.paidAmount) || 0);
      return remainB - remainA; // sort descending by amount
    })
    .slice(0, 50);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalAR,
    overdueAmount,
    overdueCount: overdueTasks.length,
    totalExpenses,
    netProfit,
    profitMargin,
    monthlyTrend,
    paymentMethods,
    topOverdue,
    ongoingProjects
  };
}
