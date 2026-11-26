"use server";
import prisma from "@/app/lib/db";
import {
  getBangkokYearMonth,
  getPaymentTaskBilledAmount,
  getPaymentTaskEffectivePaidDate,
  isScheduleTaskSettled,
  matchesCompanyEntity,
  toBangkokDateString,
} from "@/app/lib/accounting-schedule";
import {
  buildAvailableMonthOptions,
  buildRealReceiptForecast,
  computeArSnapshotAt,
  formatThaiMonthLabel,
  getBangkokMonthBounds,
  shiftYearMonth,
} from "@/app/lib/accounting-dashboard-calc";

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
    const clean = project.name
      .replace(/^(Project|PJ|โครงการ|งานติดตั้ง|ติดตั้งระบบ|งาน|ก่อสร้าง|ระบบ)\s*[:\-\s]*/gi, "")
      .replace(/\s*(จำกัด|มหาชน|\(มหาชน\))\s*$/gi, "")
      .trim();
    if (clean.length >= 3) {
      terms.add(clean);
      primaryKeyword = clean;

      const tokens = clean
        .split(/[-/:\(\)]+/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length >= 3);

      tokens.forEach((tok: string) => {
        terms.add(tok);
        const sub = tok.replace(/\s*(SYSTEM|PROJECT|ระบบ)$/gi, "").trim();
        if (sub.length >= 3 && sub !== tok) {
          terms.add(sub);
        }
      });
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

  const combinedText = `${project.name || ""} ${project.clientName || ""}`.toLowerCase();
  if (combinedText.includes("water treatment") || combinedText.includes("egat")) {
    terms.add("Water Treatment");
    terms.add("EGAT");
  }
  if (combinedText.includes("กรมการข้าว")) terms.add("กรมการข้าว");
  if (combinedText.includes("เซนิธ") || combinedText.includes("zenith")) {
    terms.add("เซนิธ");
    terms.add("Zenith");
  }
  if (combinedText.includes("อินโนเวชั่น") || combinedText.includes("innovation")) {
    terms.add("อินโนเวชั่น");
    terms.add("Innovation");
  }
  if (combinedText.includes("ชลบุรี ไฮท์")) terms.add("ชลบุรี ไฮท์");
  if (combinedText.includes("นวรรณ") || combinedText.includes("หนองตาคง")) {
    terms.add("นวรรณ");
    terms.add("หนองตาคง");
  }
  if (combinedText.includes("พัฒนาที่ดินเลย")) {
    terms.add("พัฒนาที่ดินเลย");
    terms.add("พด.เลย");
  } else if (combinedText.includes("พัฒนาที่ดิน")) {
    terms.add("พัฒนาที่ดิน");
  }
  if (combinedText.includes("บาดาล") || combinedText.includes("dgr")) {
    terms.add("บาดาล");
    terms.add("DGR");
  }
  if (combinedText.includes("ชลประทาน")) terms.add("ชลประทาน");
  if (combinedText.includes("เรือนจำลำปาง")) terms.add("เรือนจำลำปาง");
  if (combinedText.includes("เรือนจำแม่สอด")) terms.add("เรือนจำแม่สอด");

  return {
    keywords: Array.from(terms).filter((t) => t && t.length >= 3),
    primaryKeyword: primaryKeyword || project.name || "",
  };
}

function formatThaiDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;

  const bangkokStr = toBangkokDateString(date);
  if (!bangkokStr) return null;
  const [yStr, mStr, dStr] = bangkokStr.split('-');
  const y = Number(yStr);
  const beYear = y >= 2400 ? y : y + 543;
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${Number(dStr)} ${monthNames[Number(mStr) - 1]} ${beYear}`;
}

function formatThaiDateTime(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  const [datePart, timePart] = formatted.split(' ');
  const [yStr, mStr, dStr] = datePart.split('-');
  const y = Number(yStr);
  const beYear = y >= 2400 ? y : y + 543;
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${Number(dStr)} ${monthNames[Number(mStr) - 1]} ${beYear} ${timePart}`;
}

function formatSignedMillionDiff(diff: number): string {
  const m = (diff / 1_000_000).toFixed(2);
  return `${diff >= 0 ? '+' : '-'}฿${Math.abs(Number(m)).toFixed(2)} ลบ.`;
}

function formatSignedCountDiff(diff: number): string {
  return `${diff >= 0 ? '+' : ''}${diff}`;
}

export async function getAccountingDashboardData(
  startDate?: string,
  endDate?: string,
  entity?: string,
  monthParam?: string
) {
  const now = new Date();
  const currentBangkokYm =
    getBangkokYearMonth(now) || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  // Normalize selectedMonth & period range
  let selectedMonth = 'ALL';
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam.trim())) {
    selectedMonth = monthParam.trim();
  } else if (monthParam && monthParam.trim().toUpperCase() === 'ALL') {
    selectedMonth = 'ALL';
  } else if (startDate && endDate) {
    const sm = startDate.slice(0, 7);
    const em = endDate.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(sm) && sm === em) {
      selectedMonth = sm;
    } else {
      selectedMonth = 'CUSTOM';
    }
  }

  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  if (/^\d{4}-\d{2}$/.test(selectedMonth)) {
    const bounds = getBangkokMonthBounds(selectedMonth);
    periodStart = bounds.start;
    periodEnd = bounds.end;
  } else if (startDate || endDate) {
    periodStart = startDate ? new Date(`${startDate}T00:00:00.000+07:00`) : null;
    periodEnd = endDate ? new Date(`${endDate}T23:59:59.999+07:00`) : null;
  }

  const isPeriodFiltered = Boolean(periodStart || periodEnd);
  const referenceMonthKey = /^\d{4}-\d{2}$/.test(selectedMonth)
    ? selectedMonth
    : endDate && /^\d{4}-\d{2}/.test(endDate)
    ? endDate.slice(0, 7)
    : currentBangkokYm;
  const prevMonthKey = shiftYearMonth(referenceMonthKey, -1);

  // For past months, compute point-in-time AR snapshot as of end of that period; otherwise use now
  const asOfDate =
    isPeriodFiltered && periodEnd && periodEnd.getTime() < now.getTime()
      ? periodEnd
      : now;

  const targetEntity = (entity || 'ALL').toUpperCase();

  // Fetch ALL entity-scoped tasks so historical snapshots, MoM, 6-month trend & point-in-time AR are 100% real
  const allPaymentTasks = await prisma.paymentTask.findMany({
    include: {
      job: {
        include: {
          quotation: true,
          project: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const filteredPaymentTasks =
    targetEntity === 'ALL'
      ? allPaymentTasks
      : allPaymentTasks.filter((pt) => matchesCompanyEntity(pt.job?.companyCode, targetEntity));

  // Fetch customer credit settings configured by accounting
  let creditSettingsList: any[] = [];
  try {
    if ((prisma as any).customerCreditSetting?.findMany) {
      creditSettingsList = await (prisma as any).customerCreditSetting.findMany();
    } else {
      creditSettingsList =
        (await prisma.$queryRawUnsafe<any[]>(`
          SELECT
            id,
            customer_name as "customerName",
            tax_id as "taxId",
            company_id as "companyId",
            credit_limit as "creditLimit",
            credit_terms_days as "creditTermsDays",
            credit_status as "creditStatus",
            billing_cycle_rule as "billingCycleRule",
            notes,
            risk_grade as "riskGrade",
            reviewed_by as "reviewedBy"
          FROM customer_credit_settings
        `)) || [];
    }
  } catch (err) {
    console.warn("Failed to load customer_credit_settings:", err);
    creditSettingsList = [];
  }

  const creditSettingsMap = new Map<string, any>();
  for (const cs of creditSettingsList) {
    if (cs.customerName) {
      creditSettingsMap.set(cs.customerName.trim().toLowerCase(), cs);
    }
  }

  // Real Bank Statement Batches & Transactions
  let bankBatches: any[] = [];
  let bankTransactions: any[] = [];
  try {
    const entityWhere = targetEntity !== 'ALL' ? { companyCode: targetEntity } : {};
    [bankBatches, bankTransactions] = await Promise.all([
      prisma.bankStatementBatch.findMany({
        where: entityWhere,
        orderBy: { importedAt: 'desc' },
        take: 25,
      }),
      prisma.bankStatementTransaction.findMany({
        where: entityWhere,
        orderBy: [{ transactionDate: 'desc' }, { rowNumber: 'asc' }],
      }),
    ]);
  } catch (err) {
    console.warn("Failed to load bank statement records:", err);
  }

  const availableMonths = buildAvailableMonthOptions(
    filteredPaymentTasks,
    bankTransactions.map((tx) => tx.transactionDate),
    now
  );

  // Per-month real cash inflows, billed sales, and bank inflows (across all time in DB)
  const monthlyReceivedStats: Record<string, number> = {};
  const monthlySalesStats: Record<string, number> = {};
  const monthlyBankInflowStats: Record<string, number> = {};

  let totalRevenue = 0;
  let totalSales = 0;
  let totalDue = 0;

  const inSelectedPeriod = (d: Date | string | null | undefined): boolean => {
    if (!isPeriodFiltered) return true;
    if (!d) return false;
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return false;
    if (periodStart && parsed.getTime() < periodStart.getTime()) return false;
    if (periodEnd && parsed.getTime() > periodEnd.getTime()) return false;
    return true;
  };

  for (const pt of filteredPaymentTasks) {
    const billed = getPaymentTaskBilledAmount(pt);
    const settled = isScheduleTaskSettled(pt);
    const paid = settled
      ? Number(pt.paidAmount) > 0
        ? Number(pt.paidAmount)
        : billed
      : Number(pt.paidAmount) || 0;
    const effPaidDate = paid > 0 ? getPaymentTaskEffectivePaidDate(pt) : null;

    if (pt.createdAt) {
      const cYm = getBangkokYearMonth(pt.createdAt);
      if (cYm) monthlySalesStats[cYm] = (monthlySalesStats[cYm] || 0) + billed;
    }
    if (paid > 0 && effPaidDate) {
      const pYm = getBangkokYearMonth(effPaidDate);
      if (pYm) monthlyReceivedStats[pYm] = (monthlyReceivedStats[pYm] || 0) + paid;
    }

    if (inSelectedPeriod(pt.createdAt)) {
      totalSales += billed;
    }
    if (pt.dueDate && inSelectedPeriod(pt.dueDate)) {
      totalDue += billed;
    }
    if (paid > 0 && inSelectedPeriod(effPaidDate || pt.createdAt)) {
      totalRevenue += paid;
    }
  }

  // Bank transactions aggregation (scoped by selected period for strip stats + monthly series)
  let periodBankCreditCount = 0;
  let periodBankCreditAmount = 0;
  let periodBankMatchedCount = 0;
  let periodBankMatchedAmount = 0;
  let periodBankSuggestedCount = 0;
  let periodBankUnmatchedCount = 0;
  let periodBankUnmatchedAmount = 0;

  for (const btx of bankTransactions) {
    const amt = Number(btx.amount || 0);
    if (btx.txType === 'CREDIT') {
      const bYm = getBangkokYearMonth(btx.transactionDate);
      if (bYm) monthlyBankInflowStats[bYm] = (monthlyBankInflowStats[bYm] || 0) + amt;

      if (inSelectedPeriod(btx.transactionDate)) {
        periodBankCreditCount++;
        periodBankCreditAmount += amt;
        if (btx.matchStatus === 'MATCHED') {
          periodBankMatchedCount++;
          periodBankMatchedAmount += amt;
        } else if (btx.matchStatus === 'SUGGESTED') {
          periodBankSuggestedCount++;
          periodBankUnmatchedCount++;
          periodBankUnmatchedAmount += amt;
        } else if (btx.matchStatus === 'UNMATCHED') {
          periodBankUnmatchedCount++;
          periodBankUnmatchedAmount += amt;
        }
      }
    }
  }

  // Point-in-time Accounts Receivable snapshot as of `asOfDate`
  const activeSnap = computeArSnapshotAt(filteredPaymentTasks, asOfDate);
  const {
    totalAR,
    overdueAmount,
    overdueCount,
    aging,
    agingCounts,
    deliveredNotPaidTasks,
    overdueTasksList,
    upcomingTasksList,
    customers: snapshotCustomers,
  } = activeSnap;

  const collectionRate =
    totalRevenue + totalAR > 0 ? (totalRevenue / (totalRevenue + totalAR)) * 100 : 0;

  // Expenses (POs, Branch Expenses, AP Tasks) scoped to period when selected
  const periodDateRange: any = {};
  if (periodStart) periodDateRange.gte = periodStart;
  if (periodEnd) periodDateRange.lte = periodEnd;
  const hasRangeQuery = Object.keys(periodDateRange).length > 0;

  const [pos, allPosForProjects, branchExpenses, apTasks] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: hasRangeQuery ? { createdAt: periodDateRange } : undefined,
      select: {
        totalAmount: true,
        createdAt: true,
        jobName: true,
        poNumber: true,
        purchaseRequest: { select: { projectName: true, note: true } },
      },
    }),
    hasRangeQuery
      ? prisma.purchaseOrder.findMany({
          select: {
            totalAmount: true,
            poNumber: true,
            jobName: true,
            purchaseRequest: { select: { projectName: true, note: true } },
          },
        })
      : Promise.resolve(null),
    prisma.branchExpense.findMany({
      where: hasRangeQuery ? { date: periodDateRange } : undefined,
      select: { amount: true, date: true },
    }),
    prisma.supplierPaymentTask.findMany({
      where: hasRangeQuery ? { dueDate: periodDateRange } : undefined,
      include: {
        purchaseOrder: {
          select: { vendorName: true, jobName: true, poNumber: true },
        },
      },
    }),
  ]);

  const resolvedAllPos = allPosForProjects ?? pos;
  let totalExpenses = 0;
  pos.forEach((po) => {
    if (po.totalAmount) totalExpenses += Number(po.totalAmount);
  });
  branchExpenses.forEach((exp) => {
    if (exp.amount) totalExpenses += Number(exp.amount);
  });

  let totalAP = 0;
  let overdueAP = 0;
  let awaitingGrAP = 0;
  let paidAP = 0;
  let overdueAPCount = 0;

  apTasks.forEach((apt) => {
    const net = Number(apt.netPayableAmount) || 0;
    if (apt.status === 'PAID_VERIFIED') {
      paidAP += Number(apt.paidAmount) || net;
    } else if (apt.status !== 'CANCELLED') {
      totalAP += net;
      if (apt.status === 'AWAITING_GR') awaitingGrAP += net;
      if (apt.dueDate && new Date(apt.dueDate) < asOfDate) {
        overdueAP += net;
        overdueAPCount++;
      }
    }
  });

  // A. Data Status (Real Bank Statement sync + AR reconciliation state)
  const latestBatch = bankBatches[0] || null;
  const latestTaskUpdated = filteredPaymentTasks[0]?.updatedAt || null;
  const lastBankSyncTime = latestBatch?.importedAt
    ? `${formatThaiDateTime(latestBatch.importedAt)} น. (${latestBatch.bankName} • ${latestBatch.fileName})`
    : latestTaskUpdated
    ? `ยังไม่เคยนำเข้า Bank Statement (ข้อมูลระบบบัญชีอัปเดตล่าสุด ${formatThaiDateTime(latestTaskUpdated)} น.)`
    : 'ยังไม่เคยนำเข้า Bank Statement';

  const dataStatus = {
    lastBankSyncTime,
    hasBankStatement: Boolean(latestBatch),
    bankStatementBatchCount: bankBatches.length,
    pendingReconciliationCount: activeSnap.activeUnsettledCount,
    pendingReconciliationAmount: totalAR,
    unmatchedIncomingCount: periodBankUnmatchedCount,
    unmatchedIncomingAmount: periodBankUnmatchedAmount,
    suggestedIncomingCount: periodBankSuggestedCount,
    matchedIncomingCount: periodBankMatchedCount,
    matchedIncomingAmount: periodBankMatchedAmount,
    totalBankInflowCount: periodBankCreditCount,
    totalBankInflowAmount: periodBankCreditAmount,
    isSufficientForDecision: true,
  };

  // B. Cash Sales & Delivered Goods without Full Payment
  const sortedDelivered = [...deliveredNotPaidTasks].sort(
    (a, b) => b.outstandingAmount - a.outstandingAmount
  );
  const deliveredWithoutFullPaymentItems = sortedDelivered.slice(0, 20);
  const cashJobs = filteredPaymentTasks.filter((pt) => {
    const m = (pt.job?.paymentMethod || '').toLowerCase();
    return (m.includes('เงินสด') || m.includes('สด') || pt.installmentTotal === 1) && inSelectedPeriod(pt.createdAt);
  });

  const cashSalesSummary = {
    totalCashJobs: cashJobs.length,
    totalCashAmount: cashJobs.reduce((sum, pt) => sum + getPaymentTaskBilledAmount(pt), 0),
    deliveredWithoutFullPaymentCount: sortedDelivered.length,
    deliveredWithoutFullPaymentAmount: activeSnap.deliveredNotPaidAmount,
    deliveredWithoutFullPaymentItems,
  };

  // C. Trade Credit & Aging
  const tradeCreditSummary = {
    totalCreditLimit: totalSales,
    totalCreditUsed: totalAR,
    availableCredit: Math.max(0, totalSales - totalAR),
    overdueCount,
    overdueAmount,
    agingBuckets: {
      current: aging.current,
      days1to30: aging.days1to30,
      days31to60: aging.days31to60,
      days61to90: aging.days61to90,
      days90plus: aging.days90plus,
    },
    creditExceededCustomers: snapshotCustomers
      .map((c) => {
        const cs = creditSettingsMap.get(c.customerName.trim().toLowerCase());
        const approvedLimit = cs ? cs.creditLimit : 0;
        const isExceeded = cs ? c.totalExposure > approvedLimit : false;
        const exceededAmount = cs && isExceeded ? c.totalExposure - approvedLimit : c.overdueAmount;
        const hasWarning = isExceeded || c.overdueAmount > 0;
        return {
          companyName: c.customerName,
          taxId: cs?.taxId || c.taxId || '-',
          approvedLimit,
          totalExposure: c.totalExposure,
          exceededAmount,
          creditTermsDays: cs ? cs.creditTermsDays : 30,
          isConfigured: !!cs,
          hasWarning,
          status: (c.maxOverdueDays > 60 || cs?.creditStatus === 'SUSPENDED' || cs?.creditStatus === 'BLOCKED'
            ? 'SUSPEND'
            : 'WARNING') as 'SUSPEND' | 'WARNING',
        };
      })
      .filter((c) => c.hasWarning)
      .sort((a, b) => b.exceededAmount - a.exceededAmount)
      .slice(0, 5)
      .map((c, idx) => ({
        id: `c-exc-${idx}`,
        companyName: c.companyName,
        taxId: c.taxId,
        approvedLimit: c.approvedLimit,
        totalExposure: c.totalExposure,
        exceededAmount: c.exceededAmount,
        creditTermsDays: c.creditTermsDays,
        status: c.status,
      })),
  };

  // D. Receipt Forecast (Real risk-classified upcoming payments — zero hardcoded multipliers)
  const receiptForecast = buildRealReceiptForecast(
    upcomingTasksList,
    snapshotCustomers,
    creditSettingsMap
  );

  // E. Follow-up Action Tasks Today
  const sortedOverdue = [...overdueTasksList].sort((a, b) => b.outstanding - a.outstanding);
  const followUpTasksToday = sortedOverdue.slice(0, 25).map((item) => {
    const pt = item.pt;
    const diffDays = item.diffDays;
    let priority = 5;
    let priorityLabel = 'ระดับ 5: เกินกำหนด 1-30 วัน (เตือนชำระ)';
    let priorityBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';

    if (diffDays > 90 || item.outstanding >= 1000000) {
      priority = 1;
      priorityLabel = 'ระดับ 1: ยอดค้างสูง เกินกำหนดนาน (เสนอคดี/มาตรการเข้ม)';
      priorityBadgeClass = 'bg-red-50 text-red-700 border-red-200';
    } else if (diffDays > 60) {
      priority = 2;
      priorityLabel = 'ระดับ 2: ค้างชำระเกิน 60 วัน (เร่งรัด/ปรับแผน)';
      priorityBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (pt.job?.deliveryDate) {
      priority = 3;
      priorityLabel = 'ระดับ 3: ส่งมอบของแล้วยังไม่ได้เงิน';
      priorityBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
    } else if (diffDays > 30) {
      priority = 4;
      priorityLabel = 'ระดับ 4: เกินกำหนด 31-60 วัน (ติดตามวางบิล)';
      priorityBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
    }

    return {
      id: pt.id,
      jobId: pt.job?.id || pt.jobId,
      customerName: pt.job?.customerName || 'ลูกค้าโครงการทั่วไป',
      companyCode: pt.job?.companyCode || 'TG',
      amount: item.outstanding,
      overdueDays: diffDays,
      reason: `ค้างชำระ ${diffDays} วัน ${pt.note ? `(${pt.note})` : ''} ครบกำหนดเมื่อ ${pt.dueDate ? formatThaiDate(pt.dueDate) : '-'}`,
      lastContactDate: pt.updatedAt ? formatThaiDate(pt.updatedAt) : '-',
      nextFollowUpDate: formatThaiDate(asOfDate) || 'วันนี้',
      personInCharge: pt.job?.sellerName || pt.assignedTo || 'ฝ่ายขาย/การเงิน',
      priority,
      priorityLabel,
      priorityBadgeClass,
      contractOrJobNo: pt.job?.jobNumber || 'JB-PENDING',
      paymentMethod: pt.job?.paymentMethod || pt.creditType || 'เครดิต',
      bankStatus: pt.status === 'ชำระมัดจำแล้ว' ? 'ชำระมัดจำแล้วบางส่วน' : 'ยังไม่พบยอดโอน',
    };
  });

  // F. 5 Notification Priorities
  const p1Items = sortedOverdue.filter((x) => x.diffDays > 90 || x.outstanding >= 1000000);
  const p2Items = sortedOverdue.filter((x) => x.diffDays > 60 && x.diffDays <= 90 && x.outstanding < 1000000);
  const p3Items = sortedDelivered;
  const p4Items = sortedOverdue.filter((x) => x.diffDays > 30 && x.diffDays <= 60 && x.outstanding < 1000000);
  const p5Items = upcomingTasksList.filter((x) => x.daysUntilDue <= 7);

  const priorityNotifications = [
    {
      priority: 1,
      title: "ยอดค้างชำระสูงและเกินกำหนดเวลานาน (High-Value, Long-Overdue)",
      count: p1Items.length,
      amount: p1Items.reduce((sum, x) => sum + x.outstanding, 0),
      severity: 'danger' as const,
      description: "ลูกหนี้ค้างเกิน 90 วัน หรือยอดค้างเกิน 1 ล้านบาท แนะนำฝ่ายบริหารเร่งรัดหรือส่งดำเนินคดี",
    },
    {
      priority: 2,
      title: "ลูกหนี้ค้างชำระเกิน 60–90 วัน (Overdue 60–90 Days)",
      count: p2Items.length,
      amount: p2Items.reduce((sum, x) => sum + x.outstanding, 0),
      severity: 'danger' as const,
      description: "ยอดค้างชำระเริ่มเสี่ยงเป็นหนี้สูญ ต้องนัดเจรจาหรือระงับการส่งมอบสินค้าเพิ่มเติม",
    },
    {
      priority: 3,
      title: "งานที่ส่งมอบของแล้วแต่ยังไม่ได้รับเงินครบ (Delivered But Not Paid)",
      count: p3Items.length,
      amount: p3Items.reduce((sum, x) => sum + x.outstandingAmount, 0),
      severity: 'warning' as const,
      description: "งานส่งมอบหน้างานเรียบร้อยแต่ยังไม่ได้รับเงินครบ เสี่ยงต่อการหน่วงเหนี่ยวเงินสด",
    },
    {
      priority: 4,
      title: "ลูกหนี้ค้างชำระ 31–60 วัน (Overdue 31–60 Days)",
      count: p4Items.length,
      amount: p4Items.reduce((sum, x) => sum + x.outstanding, 0),
      severity: 'warning' as const,
      description: "ลูกหนี้เกินกำหนดรอบบิลปกติ ต้องติดตามทวงถามเซลล์และลูกค้าประจำสัปดาห์",
    },
    {
      priority: 5,
      title: "รายการที่ครบกำหนดชำระเร็วๆ นี้ / ใน 7 วัน (Due Soon / Next 7 Days)",
      count: p5Items.length,
      amount: p5Items.reduce((sum, x) => sum + x.outstanding, 0),
      severity: 'info' as const,
      description: "รายการลูกหนี้ที่จะถึงกำหนดรอบชำระประจำสัปดาห์ ต้องยืนยันยอดและติดตามรับโอน",
    },
  ];

  // 4. Section 2: Real Debtor Risk & Credit Management
  const topRiskDebtors = [...snapshotCustomers]
    .sort((a, b) => b.totalExposure - a.totalExposure)
    .slice(0, 20);

  const overdueGte60Debtors = snapshotCustomers.filter((c) => c.maxOverdueDays > 60);
  const overdueGte90Debtors = snapshotCustomers.filter((c) => c.maxOverdueDays > 90);

  const corporateLoans = {
    activeContracts: activeSnap.activeUnsettledCount,
    normalContracts: agingCounts.current + agingCounts.days1to30,
    watchlistContracts: agingCounts.days31to60 + agingCounts.days61to90 + agingCounts.days90plus,
    totalPrincipalOutstanding: totalAR,
    principalDueThisMonth: totalDue,
    principalDueCollectedRate: totalDue > 0 ? (totalRevenue / totalDue) * 100 : collectionRate,
    principalCollectedActual: totalRevenue,
    principalCollectedVariance: totalRevenue - totalDue,
    interestExpected: 0,
    interestActual: 0,
    interestActualRate: 0,
    interestOverdue: 0,
    principalOverdue: overdueAmount,
    principalOverdueContracts: overdueCount,
    defaultOver3InstallmentsContracts: overdueGte60Debtors.length,
    defaultOver3InstallmentsPrincipal: overdueGte60Debtors.reduce((sum, c) => sum + c.overdueAmount, 0),
    overdueGte3InstallmentsContracts: overdueGte90Debtors.length,
    overdueGte3InstallmentsPrincipal: overdueGte90Debtors.reduce((sum, c) => sum + c.overdueAmount, 0),
    debtRestructuringContracts: sortedDelivered.length,
    debtRestructuringAmount: activeSnap.deliveredNotPaidAmount,
    collateralForfeitureAmount: 0,
    collateralForfeiturePercent: 0,
    riskContracts: topRiskDebtors.map((c, idx) => {
      let status: 'LEGAL' | 'RESTRUCTURE' | 'FOLLOWUP' | 'NORMAL' = 'NORMAL';
      let statusLabel = 'ติดตามปกติ';
      let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

      if (c.maxOverdueDays > 90 || c.overdueAmount >= 1000000) {
        status = 'LEGAL';
        statusLabel = 'เสนอดำเนินคดี / ระงับเครดิต';
        statusBadgeClass = 'bg-red-50 text-red-700 border-red-200';
      } else if (c.maxOverdueDays > 60) {
        status = 'RESTRUCTURE';
        statusLabel = 'เจรจาปรับแผนชำระ';
        statusBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
      } else if (c.maxOverdueDays > 30) {
        status = 'FOLLOWUP';
        statusLabel = 'ติดตามเร่งรัด';
        statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      }

      return {
        id: c.latestJobId || `debtor-${idx}`,
        jobId: c.latestJobId,
        customerName: c.customerName,
        contractNumber: `${c.latestJobNumber} (${c.jobCount} งาน)`,
        principalOutstanding: c.totalExposure,
        overdueInstallments:
          c.maxOverdueDays > 90 ? 4 : c.maxOverdueDays > 60 ? 3 : c.maxOverdueDays > 30 ? 2 : 1,
        overdueDays: c.maxOverdueDays,
        collateral:
          c.jobCount > 1
            ? `ค้าง ${c.jobCount} งาน (TG: ฿${(c.tg / 1000).toFixed(0)}k, TE: ฿${(c.te / 1000).toFixed(0)}k, TP: ฿${(c.tp / 1000).toFixed(0)}k)`
            : 'เครดิตการค้า',
        lastClosedDate: c.latestSettledYm ? formatThaiMonthLabel(c.latestSettledYm, true) : '-',
        status,
        statusLabel,
        statusBadgeClass,
      };
    }),
    riskStructure: {
      normal: aging.current,
      overdue1: aging.days1to30,
      overdue2: aging.days31to60,
      overdue3Plus: aging.days61to90 + aging.days90plus,
    },
    executiveInsights: `ลูกหนี้ที่มียอดค้างชำระรวมมี ${topRiskDebtors.length} รายหลัก รวมมูลค่าหนี้คงค้าง ฿${(totalAR / 1000000).toFixed(2)} ล้านบาท โดยมีลูกหนี้เกิน 60 วันจำนวน ${overdueGte60Debtors.length} ราย ควรควบคุมวงเงินและเร่งรัดการจัดเก็บ`,
  };

  // 5. Cross-Entity Group Customer Exposure
  const crossEntityCustomers = [...snapshotCustomers]
    .sort((a, b) => b.totalExposure - a.totalExposure)
    .slice(0, 15)
    .map((c, idx) => {
      const cs = creditSettingsMap.get(c.customerName.trim().toLowerCase());
      const isConfigured = !!cs;
      const approvedLimit = cs ? cs.creditLimit : 0;
      const creditTermsDays = cs ? cs.creditTermsDays : 30;
      const remainingLimit = isConfigured ? cs.creditLimit - c.totalExposure : -c.totalExposure;

      let status: 'NORMAL' | 'WATCHLIST' | 'HIGH_RISK' | 'SUSPENDED' | 'LEGAL' | 'UNCONFIGURED' = 'NORMAL';
      let statusLabel = 'วงเงินปกติ';
      let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

      if (!isConfigured) {
        status = 'UNCONFIGURED';
        statusLabel = 'ยังไม่ตั้งค่าวงเงิน';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
      } else if (cs.creditStatus === 'BLOCKED' || cs.creditStatus === 'SUSPENDED') {
        status = 'SUSPENDED';
        statusLabel = cs.creditStatus === 'BLOCKED' ? 'บล็อกเครดิต' : 'ระงับชั่วคราว';
        statusBadgeClass = 'bg-red-50 text-red-700 border-red-200';
      } else if (c.maxOverdueDays > 90) {
        status = 'LEGAL';
        statusLabel = 'ระงับส่งของ / ดำเนินคดี';
        statusBadgeClass = 'bg-red-50 text-red-700 border-red-200';
      } else if (c.maxOverdueDays > 60 || remainingLimit < 0) {
        status = 'HIGH_RISK';
        statusLabel = remainingLimit < 0 ? 'เกินวงเงินที่อนุมัติ' : 'ความเสี่ยงสูง (เกิน 60 วัน)';
        statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      } else if (c.maxOverdueDays > 30 || cs.creditStatus === 'WATCHLIST') {
        status = 'WATCHLIST';
        statusLabel = 'เฝ้าระวัง';
        statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      }

      return {
        id: `cross-c-${idx}`,
        customerName: c.customerName,
        taxId: cs?.taxId || c.taxId || '-',
        tgExposure: c.tg,
        teExposure: c.te,
        tpExposure: c.tp,
        totalExposure: c.totalExposure,
        approvedLimit,
        remainingLimit,
        creditTermsDays,
        isConfigured,
        billingCycleRule: cs?.billingCycleRule || '',
        notes: cs?.notes || '',
        status,
        statusLabel,
        statusBadgeClass,
      };
    });

  // 6. Section 2: 100% Real Month-over-Month & 6-Month Historical Snapshot Trend
  const sixMonthTrend: Array<{
    month: string;
    monthKey: string;
    outstandingDebt: number;
    overdueDebt: number;
    cashReceived: number;
    bankInflow: number;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const ym = shiftYearMonth(referenceMonthKey, -i);
    const bounds = getBangkokMonthBounds(ym);
    const snapEnd = bounds.end.getTime() > now.getTime() ? now : bounds.end;
    const snap = computeArSnapshotAt(filteredPaymentTasks, snapEnd);
    sixMonthTrend.push({
      month: formatThaiMonthLabel(ym, true),
      monthKey: ym,
      outstandingDebt: Number((snap.totalAR / 1_000_000).toFixed(2)),
      overdueDebt: Number((snap.overdueAmount / 1_000_000).toFixed(2)),
      cashReceived: Number(((monthlyReceivedStats[ym] || 0) / 1_000_000).toFixed(2)),
      bankInflow: Number(((monthlyBankInflowStats[ym] || 0) / 1_000_000).toFixed(2)),
    });
  }

  const refBounds = getBangkokMonthBounds(referenceMonthKey);
  const prevBounds = getBangkokMonthBounds(prevMonthKey);
  const refSnapEnd = refBounds.end.getTime() > now.getTime() ? now : refBounds.end;
  const prevSnapEnd = prevBounds.end.getTime() > now.getTime() ? now : prevBounds.end;

  const curMoMSnap = computeArSnapshotAt(filteredPaymentTasks, refSnapEnd);
  const prevMoMSnap = computeArSnapshotAt(filteredPaymentTasks, prevSnapEnd);

  const thisMonthReceived = monthlyReceivedStats[referenceMonthKey] || 0;
  const lastMonthReceived = monthlyReceivedStats[prevMonthKey] || 0;
  const diffReceived = thisMonthReceived - lastMonthReceived;
  const diffReceivedPercent =
    lastMonthReceived > 0 ? Number(((diffReceived / lastMonthReceived) * 100).toFixed(1)) : 0;

  const curMonthRate =
    thisMonthReceived + curMoMSnap.totalAR > 0
      ? (thisMonthReceived / (thisMonthReceived + curMoMSnap.totalAR)) * 100
      : 0;
  const prevMonthRate =
    lastMonthReceived + prevMoMSnap.totalAR > 0
      ? (lastMonthReceived / (lastMonthReceived + prevMoMSnap.totalAR)) * 100
      : 0;
  const diffCollectionRate = Number((curMonthRate - prevMonthRate).toFixed(1));

  const diffOutstandingDebt = curMoMSnap.totalAR - prevMoMSnap.totalAR;
  const diffOutstandingPercent =
    prevMoMSnap.totalAR > 0
      ? Number(((diffOutstandingDebt / prevMoMSnap.totalAR) * 100).toFixed(1))
      : 0;

  const diffOverdueDebt = curMoMSnap.overdueAmount - prevMoMSnap.overdueAmount;
  const diffOverduePercent =
    prevMoMSnap.overdueAmount > 0
      ? Number(((diffOverdueDebt / prevMoMSnap.overdueAmount) * 100).toFixed(1))
      : 0;

  const diffDays90Plus = curMoMSnap.aging.days90plus - prevMoMSnap.aging.days90plus;
  const diffDeliveredNotPaid =
    curMoMSnap.deliveredNotPaidCount - prevMoMSnap.deliveredNotPaidCount;
  const diffOverdueCount = curMoMSnap.overdueCount - prevMoMSnap.overdueCount;
  const diffAvgOverdueDays = curMoMSnap.avgOverdueDays - prevMoMSnap.avgOverdueDays;

  const top3OverdueDebtors = topRiskDebtors.filter((c) => c.overdueAmount > 0).slice(0, 3);
  const keyCauses = [
    `หนี้เกินกำหนดรวม ฿${(curMoMSnap.overdueAmount / 1_000_000).toFixed(2)} ล้านบาท (${curMoMSnap.overdueCount} รายการ)${
      top3OverdueDebtors.length > 0
        ? ` โดยมีลูกหนี้รายใหญ่ ${top3OverdueDebtors.map((c) => c.customerName).join(', ')} คิดเป็นยอดค้างหลัก`
        : ''
    }`,
    `ยอดลูกหนี้คงเหลือรวม ณ สิ้นรอบ ฿${(curMoMSnap.totalAR / 1_000_000).toFixed(2)} ล้านบาท (${diffOutstandingDebt >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${formatSignedMillionDiff(diffOutstandingDebt)} เทียบเดือนก่อน)`,
    `งานส่งมอบแล้วรอรับชำระมี ${curMoMSnap.deliveredNotPaidCount} งาน มูลค่ารวม ฿${(curMoMSnap.deliveredNotPaidAmount / 1_000_000).toFixed(2)} ล้านบาท`,
  ];

  const referenceMonthLabel = formatThaiMonthLabel(referenceMonthKey, false);
  const prevMonthLabel = formatThaiMonthLabel(prevMonthKey, false);

  const monthOverMonth = {
    referenceMonthKey,
    referenceMonthLabel,
    prevMonthKey,
    prevMonthLabel,
    cashReceived: {
      current: thisMonthReceived,
      previous: lastMonthReceived,
      diff: diffReceived,
      diffPercent: diffReceivedPercent,
    },
    collectionRate: {
      current: Number(curMonthRate.toFixed(1)),
      previous: Number(prevMonthRate.toFixed(1)),
      diff: diffCollectionRate,
    },
    outstandingDebt: {
      current: curMoMSnap.totalAR,
      previous: prevMoMSnap.totalAR,
      diff: diffOutstandingDebt,
      diffPercent: diffOutstandingPercent,
      note: curMoMSnap.totalAR > 160000000 ? "สูงกว่าเป้า" : diffOutstandingDebt <= 0 ? "ลดลงจากเดือนก่อน" : "ตามเกณฑ์",
    },
    overdueDebt: {
      current: curMoMSnap.overdueAmount,
      previous: prevMoMSnap.overdueAmount,
      diff: diffOverdueDebt,
      diffPercent: diffOverduePercent,
    },
    sixMonthTrend,
    keyCauses,
    kpiComparisonTable: [
      {
        kpi: "เงินรับจริงประจำเดือน",
        thisMonth: `฿${(thisMonthReceived / 1_000_000).toFixed(2)} ลบ.`,
        lastMonth: `฿${(lastMonthReceived / 1_000_000).toFixed(2)} ลบ.`,
        variance: formatSignedMillionDiff(diffReceived),
        isFavorable: diffReceived >= 0,
        target: "≥ ฿5.00 ลบ.",
        signal: thisMonthReceived >= 5000000 ? "ตามเป้า" : diffReceived >= 0 ? "ดีขึ้น" : "ต่ำกว่าเป้า",
        signalColor: thisMonthReceived >= 5000000 ? ("green" as const) : ("amber" as const),
      },
      {
        kpi: "อัตราจัดเก็บประจำเดือน (Collection Rate)",
        thisMonth: `${curMonthRate.toFixed(1)}%`,
        lastMonth: `${prevMonthRate.toFixed(1)}%`,
        variance: `${diffCollectionRate >= 0 ? '+' : ''}${diffCollectionRate.toFixed(1)} จุด`,
        isFavorable: diffCollectionRate >= 0,
        target: "≥ 15.0%",
        signal: curMonthRate >= 15 ? "ตามเป้า" : diffCollectionRate >= 0 ? "ปรับตัวดีขึ้น" : "เฝ้าระวัง",
        signalColor: curMonthRate >= 15 ? ("green" as const) : ("amber" as const),
      },
      {
        kpi: "ลูกหนี้คงเหลือรวม ณ สิ้นงวด",
        thisMonth: `฿${(curMoMSnap.totalAR / 1_000_000).toFixed(2)} ลบ.`,
        lastMonth: `฿${(prevMoMSnap.totalAR / 1_000_000).toFixed(2)} ลบ.`,
        variance: formatSignedMillionDiff(diffOutstandingDebt),
        isFavorable: diffOutstandingDebt <= 0,
        target: "≤ ฿160 ลบ.",
        signal: curMoMSnap.totalAR <= 160000000 ? "ตามเกณฑ์" : "สูงกว่าเป้า",
        signalColor: curMoMSnap.totalAR <= 160000000 ? ("green" as const) : ("red" as const),
      },
      {
        kpi: "หนี้เกินกำหนดชำระ ณ สิ้นงวด",
        thisMonth: `฿${(curMoMSnap.overdueAmount / 1_000_000).toFixed(2)} ลบ.`,
        lastMonth: `฿${(prevMoMSnap.overdueAmount / 1_000_000).toFixed(2)} ลบ.`,
        variance: formatSignedMillionDiff(diffOverdueDebt),
        isFavorable: diffOverdueDebt <= 0,
        target: "≤ ฿45 ลบ.",
        signal: curMoMSnap.overdueAmount <= 45000000 ? "ตามเกณฑ์" : diffOverdueDebt <= 0 ? "ลดลง" : "เฝ้าระวัง",
        signalColor: curMoMSnap.overdueAmount <= 45000000 ? ("green" as const) : ("red" as const),
      },
      {
        kpi: "หนี้เกิน 90 วัน ณ สิ้นงวด",
        thisMonth: `฿${(curMoMSnap.aging.days90plus / 1_000_000).toFixed(2)} ลบ.`,
        lastMonth: `฿${(prevMoMSnap.aging.days90plus / 1_000_000).toFixed(2)} ลบ.`,
        variance: formatSignedMillionDiff(diffDays90Plus),
        isFavorable: diffDays90Plus <= 0,
        target: "≤ ฿10 ลบ.",
        signal: curMoMSnap.aging.days90plus <= 10000000 ? "ตามเกณฑ์" : "เร่งดำเนินการ",
        signalColor: curMoMSnap.aging.days90plus <= 10000000 ? ("green" as const) : ("red" as const),
      },
      {
        kpi: "งานส่งมอบแล้วรอรับชำระ",
        thisMonth: `${curMoMSnap.deliveredNotPaidCount} งาน`,
        lastMonth: `${prevMoMSnap.deliveredNotPaidCount} งาน`,
        variance: `${formatSignedCountDiff(diffDeliveredNotPaid)} งาน`,
        isFavorable: diffDeliveredNotPaid <= 0,
        target: "ลดลง",
        signal: curMoMSnap.deliveredNotPaidCount === 0 ? "ปกติ" : diffDeliveredNotPaid <= 0 ? "ลดลง" : "เร่งติดตามเงินหน้างาน",
        signalColor: curMoMSnap.deliveredNotPaidCount === 0 || diffDeliveredNotPaid < 0 ? ("green" as const) : ("amber" as const),
      },
      {
        kpi: "จำนวนรายการเกินกำหนด",
        thisMonth: `${curMoMSnap.overdueCount} รายการ`,
        lastMonth: `${prevMoMSnap.overdueCount} รายการ`,
        variance: `${formatSignedCountDiff(diffOverdueCount)} รายการ`,
        isFavorable: diffOverdueCount <= 0,
        target: "ลดลง",
        signal: diffOverdueCount <= 0 ? "ดีขึ้น" : "เฝ้าระวัง",
        signalColor: diffOverdueCount <= 0 ? ("green" as const) : ("amber" as const),
      },
      {
        kpi: "วันเกินหนี้เฉลี่ย",
        thisMonth: `${curMoMSnap.avgOverdueDays} วัน`,
        lastMonth: `${prevMoMSnap.avgOverdueDays} วัน`,
        variance: `${formatSignedCountDiff(diffAvgOverdueDays)} วัน`,
        isFavorable: diffAvgOverdueDays <= 0,
        target: "≤ 45 วัน",
        signal: curMoMSnap.avgOverdueDays <= 45 ? "ตามเกณฑ์" : diffAvgOverdueDays <= 0 ? "ดีขึ้น" : "ชะลอตัว",
        signalColor: curMoMSnap.avgOverdueDays <= 45 ? ("green" as const) : ("amber" as const),
      },
    ],
    executiveCommentary: `สำหรับรอบเปรียบเทียบ ${referenceMonthLabel} vs ${prevMonthLabel}: มียอดเงินรับจริง ฿${(thisMonthReceived / 1_000_000).toFixed(2)} ล้านบาท (${diffReceived >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${formatSignedMillionDiff(diffReceived)} จากเดือนก่อน) ยอดลูกหนี้คงเหลือ ณ สิ้นงวด ฿${(curMoMSnap.totalAR / 1_000_000).toFixed(2)} ล้านบาท และหนี้เกินกำหนด ฿${(curMoMSnap.overdueAmount / 1_000_000).toFixed(2)} ล้านบาท (${curMoMSnap.totalAR > 0 ? ((curMoMSnap.overdueAmount / curMoMSnap.totalAR) * 100).toFixed(1) : '0'}% ของลูกหนี้คงเหลือ)`,
  };

  // 7. Real Monthly Trend (Revenue vs Expenses)
  const monthlyDataMap = new Map<string, { revenue: number; expenses: number }>();
  for (const [mKey, rev] of Object.entries(monthlyReceivedStats)) {
    if (!monthlyDataMap.has(mKey)) monthlyDataMap.set(mKey, { revenue: 0, expenses: 0 });
    monthlyDataMap.get(mKey)!.revenue += rev;
  }
  pos.forEach((po) => {
    if (po.totalAmount && po.createdAt) {
      const k = getBangkokYearMonth(po.createdAt);
      if (k) {
        if (!monthlyDataMap.has(k)) monthlyDataMap.set(k, { revenue: 0, expenses: 0 });
        monthlyDataMap.get(k)!.expenses += Number(po.totalAmount);
      }
    }
  });
  branchExpenses.forEach((exp) => {
    if (exp.amount && exp.date) {
      const k = getBangkokYearMonth(exp.date);
      if (k) {
        if (!monthlyDataMap.has(k)) monthlyDataMap.set(k, { revenue: 0, expenses: 0 });
        monthlyDataMap.get(k)!.expenses += Number(exp.amount);
      }
    }
  });

  const monthlyTrend = Array.from(monthlyDataMap.entries())
    .map(([month, d]) => ({ month, revenue: d.revenue, expenses: d.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Real Cash vs Credit breakdown (zero hardcoded fallbacks)
  let cashJobCount = 0;
  let creditJobCount = 0;
  filteredPaymentTasks.forEach((pt) => {
    if (!inSelectedPeriod(pt.createdAt)) return;
    const method = (pt.job?.paymentMethod || '').toLowerCase();
    if (method.includes('เครดิต') || method.includes('ผ่อน') || (pt.installmentTotal && pt.installmentTotal > 1)) {
      creditJobCount++;
    } else {
      cashJobCount++;
    }
  });

  const paymentMethods = [
    { name: 'เงินสด/โอนเต็มจำนวน', value: cashJobCount },
    { name: 'เครดิต/ผ่อนชำระ', value: creditJobCount },
  ];

  // Ongoing Projects
  const activeProjectsData = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      job: {
        include: { paymentTasks: true },
      },
    },
  });

  const ongoingProjects = activeProjectsData
    .filter((p) => targetEntity === 'ALL' || matchesCompanyEntity(p.job?.companyCode, targetEntity))
    .map((project) => {
      let income = 0;
      if (project.job?.paymentTasks) {
        project.job.paymentTasks.forEach((pt) => {
          if (pt.status === 'ตรวจสอบและบันทึกแล้ว') {
            const ptAmount = Number(pt.paidAmount) || Number(pt.installmentAmount) || Number(project.projectValue) || 0;
            income += ptAmount;
          }
        });
      }

      const { keywords, primaryKeyword } = extractSearchKeywords(project);
      let expense = 0;
      let poCount = 0;

      resolvedAllPos.forEach((po) => {
        if (po.totalAmount) {
          const hasValidPoNumber = Boolean(project.job?.poNumber && project.job.poNumber.length > 0);
          const matchesPO = hasValidPoNumber && po.poNumber === project.job?.poNumber;
          let matchesKeywords = false;
          const jn = (po.jobName || "").toLowerCase();
          const prProj = (po.purchaseRequest?.projectName || "").toLowerCase();

          if (keywords.length > 0) {
            const prNote = (po.purchaseRequest?.note || "").toLowerCase();
            matchesKeywords = keywords.some((kw) => {
              const lower = kw.toLowerCase();
              return jn.includes(lower) || prProj.includes(lower) || prNote.includes(lower);
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
        status: project.status,
      };
    });

  // Top Overdue
  const topOverdue = [...sortedOverdue]
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 50)
    .map((x) => x.pt);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    selectedMonth,
    periodLabel:
      selectedMonth === 'ALL'
        ? 'ภาพรวมทั้งหมด (ถึงปัจจุบัน)'
        : selectedMonth === 'CUSTOM'
        ? `${formatThaiDate(periodStart) || startDate} - ${formatThaiDate(periodEnd) || endDate}`
        : formatThaiMonthLabel(selectedMonth, false),
    availableMonths,
    totalRevenue,
    totalAR,
    overdueAmount,
    overdueCount: sortedOverdue.length,
    totalExpenses,
    netProfit,
    profitMargin,
    totalAP,
    overdueAP,
    overdueAPCount,
    awaitingGrAP,
    paidAP,
    monthlyTrend,
    paymentMethods,
    topOverdue,
    ongoingProjects,
    dataStatus,
    dailyCashReceipts: {
      totalSales,
      totalDue,
      totalReceived: totalRevenue,
      collectionRate,
    },
    cashSalesSummary,
    tradeCreditSummary,
    receiptForecast,
    followUpTasksToday,
    priorityNotifications,
    corporateLoans,
    monthOverMonth,
    crossEntityCustomers,
  };
}

export async function getFinancialDrilldownDetails(query: {
  jobId?: string;
  jobNumber?: string;
  customerName?: string;
  paymentTaskId?: string;
}) {
  try {
    let job: any = null;

    if (query.jobId && query.jobId.length > 5 && !query.jobId.startsWith('debtor-')) {
      job = await prisma.job.findUnique({
        where: { id: query.jobId },
        include: {
          quotation: { include: { company: true, salesperson: true } },
          project: true,
          paymentTasks: { orderBy: { installmentNo: 'asc' } },
          stepLogs: { orderBy: { completedAt: 'desc' } },
          documents: { orderBy: { createdAt: 'desc' } },
        },
      });
    }

    if (!job && query.paymentTaskId) {
      const pt = await prisma.paymentTask.findUnique({
        where: { id: query.paymentTaskId },
        select: { jobId: true },
      });
      if (pt?.jobId) {
        job = await prisma.job.findUnique({
          where: { id: pt.jobId },
          include: {
            quotation: { include: { company: true, salesperson: true } },
            project: true,
            paymentTasks: { orderBy: { installmentNo: 'asc' } },
            stepLogs: { orderBy: { completedAt: 'desc' } },
            documents: { orderBy: { createdAt: 'desc' } },
          },
        });
      }
    }

    if (!job && query.jobNumber) {
      const cleanJobNo = query.jobNumber.split(' ')[0].trim();
      if (cleanJobNo) {
        job = await prisma.job.findFirst({
          where: {
            OR: [
              { jobNumber: cleanJobNo },
              { jobNumber: { contains: cleanJobNo, mode: 'insensitive' } },
            ],
          },
          include: {
            quotation: { include: { company: true, salesperson: true } },
            project: true,
            paymentTasks: { orderBy: { installmentNo: 'asc' } },
            stepLogs: { orderBy: { completedAt: 'desc' } },
            documents: { orderBy: { createdAt: 'desc' } },
          },
        });
      }
    }

    if (!job && query.customerName) {
      job = await prisma.job.findFirst({
        where: {
          customerName: { contains: query.customerName.trim(), mode: 'insensitive' },
        },
        include: {
          quotation: { include: { company: true, salesperson: true } },
          project: true,
          paymentTasks: { orderBy: { installmentNo: 'asc' } },
          stepLogs: { orderBy: { completedAt: 'desc' } },
          documents: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!job) {
      return {
        found: false,
        job: null,
        installments: [],
        auditLogs: [],
        documents: [],
        bankTransactions: [],
      };
    }

    const now = new Date();
    const taskIds = (job.paymentTasks || []).map((pt: any) => pt.id);
    let matchedBankRows: any[] = [];
    try {
      matchedBankRows = await prisma.bankStatementTransaction.findMany({
        where: {
          OR: [
            { matchedJobId: job.id },
            ...(taskIds.length > 0 ? [{ matchedPaymentTaskId: { in: taskIds } }] : []),
          ],
          matchStatus: 'MATCHED',
        },
        orderBy: { transactionDate: 'desc' },
      });
    } catch {}

    const installments = (job.paymentTasks || []).map((pt: any, idx: number) => {
      const amt = Number(pt.installmentAmount) || getPaymentTaskBilledAmount({ ...pt, job }) || 0;
      const paid = Number(pt.paidAmount) || 0;
      let status: 'PAID' | 'OVERDUE' | 'PENDING' | 'PARTIAL' = 'PENDING';
      let overdueDays = 0;

      if (isScheduleTaskSettled(pt) || (amt > 0 && paid >= amt)) {
        status = 'PAID';
      } else if (paid > 0) {
        status = 'PARTIAL';
      } else if (pt.dueDate) {
        const d = new Date(pt.dueDate);
        if (!Number.isNaN(d.getTime()) && d.getTime() < now.getTime()) {
          overdueDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (overdueDays > 0) status = 'OVERDUE';
        }
      }

      return {
        id: pt.id,
        no: pt.installmentNo || idx + 1,
        dueDate: formatThaiDate(pt.dueDate),
        amount: amt,
        paid,
        status,
        overdueDays,
        paidDate: formatThaiDate(pt.paidDate),
        invoiceNumber: pt.invoiceNumber || null,
        note: pt.note || null,
      };
    });

    const auditLogs = (job.stepLogs || []).map((l: any) => ({
      id: l.id,
      date: formatThaiDateTime(l.completedAt) || '-',
      author: l.completedBy || 'เจ้าหน้าที่ระบบ',
      department: l.department || 'ฝ่ายปฏิบัติการ',
      step: l.step || 'ขั้นตอนงาน',
      note: l.note || `ดำเนินการขั้นตอน: ${l.step}`,
    }));

    const documents = (job.documents || [])
      .filter((d: any) => !String(d.type || "").startsWith("PROCUREMENT_"))
      .map((d: any) => ({
        id: d.id,
        type: d.type || 'เอกสารทั่วไป',
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        createdAt: formatThaiDate(d.createdAt) || '-',
      }));

    return {
      found: true,
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        companyCode: job.companyCode,
        jobType: job.jobType,
        deliveryDate: formatThaiDate(job.deliveryDate),
        paymentMethod: job.paymentMethod || 'เครดิต',
        paymentStatus: job.paymentStatus || 'pending',
        sellerName: job.sellerName || job.quotation?.salesperson?.fullName || 'ฝ่ายขาย',
        courierCompany: job.courierCompany,
        trackingNumber: job.trackingNumber,
        trackingPhotoUrl: job.trackingPhotoUrl,
        creditTerms: job.creditTerms,
        creditDocsUrl: job.creditDocsUrl,
        billingRegulations: job.billingRegulations,
        billingDocsUrl: job.billingDocsUrl,
        additionalInformation: job.additionalInformation,
      },
      installments,
      auditLogs,
      documents,
      bankTransactions: matchedBankRows.map((b) => ({
        id: b.id,
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        date: formatThaiDate(b.transactionDate),
        amount: Number(b.amount || 0),
        referenceNo: b.referenceNo,
        description: b.description,
        matchedBy: b.matchedBy,
      })),
    };
  } catch (error) {
    console.error('getFinancialDrilldownDetails error:', error);
    return {
      found: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ',
      job: null,
      installments: [],
      auditLogs: [],
      documents: [],
      bankTransactions: [],
    };
  }
}

export async function addJobFollowUpNote(params: {
  jobId: string;
  note: string;
  authorName?: string;
  department?: string;
  promisedDate?: string;
}) {
  try {
    if (!params.jobId || !params.note.trim()) {
      return { success: false, error: 'กรุณากรอกข้อความบันทึก' };
    }

    const extra = params.promisedDate ? ` [นัดชำระวันที่: ${params.promisedDate}]` : '';
    const noteContent = params.note.trim() + extra;

    const created = await prisma.jobStepLog.create({
      data: {
        jobId: params.jobId,
        step: 'ติดตามหนี้/บัญชี',
        completedBy: params.authorName || 'ฝ่ายบัญชีและการเงิน',
        department: params.department || 'บัญชีและการเงิน',
        note: noteContent,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      log: {
        id: created.id,
        date: formatThaiDateTime(created.completedAt) || '-',
        author: created.completedBy,
        department: created.department,
        step: created.step,
        note: created.note || noteContent,
      },
    };
  } catch (error: any) {
    console.error('addJobFollowUpNote error:', error);
    return { success: false, error: error.message || 'ไม่สามารถบันทึกได้' };
  }
}
