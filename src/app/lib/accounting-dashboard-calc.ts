import {
  getBangkokDayDiff,
  getBangkokYearMonth,
  getPaymentTaskBilledAmount,
  getPaymentTaskEffectivePaidDate,
  isDepositScheduleTask,
  toBangkokDateString,
} from '@/app/lib/accounting-schedule';

const BANGKOK_OFFSET = '+07:00';

export const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function formatThaiMonthLabel(yearMonth: string, short = false): string {
  const [yStr, mStr] = yearMonth.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return yearMonth;
  const be = y >= 2400 ? y : y + 543;
  return short
    ? `${THAI_MONTH_SHORT[m - 1]} ${be % 100}`
    : `${THAI_MONTH_FULL[m - 1]} ${be}`;
}

export function getBangkokMonthBounds(yearMonth: string): {
  start: Date;
  end: Date;
  startYmd: string;
  endYmd: string;
} {
  const [yStr, mStr] = yearMonth.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startYmd = `${yStr}-${mStr}-01`;
  const endYmd = `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`;
  return {
    start: new Date(`${startYmd}T00:00:00.000${BANGKOK_OFFSET}`),
    end: new Date(`${endYmd}T23:59:59.999${BANGKOK_OFFSET}`),
    startYmd,
    endYmd,
  };
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  const d = new Date(Date.UTC(Number(yStr), Number(mStr) - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildAvailableMonthOptions(
  tasks: Array<{ createdAt?: Date | string | null; paidDate?: Date | string | null }>,
  bankTxDates: Array<Date | string | null | undefined>,
  now: Date = new Date()
): Array<{ value: string; label: string }> {
  const currentYm = getBangkokYearMonth(now) || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const months = new Set<string>();

  for (let i = 0; i < 6; i++) {
    months.add(shiftYearMonth(currentYm, -i));
  }
  for (const t of tasks) {
    const cYm = getBangkokYearMonth(t.createdAt);
    if (cYm && cYm <= currentYm) months.add(cYm);
    const pYm = getBangkokYearMonth(t.paidDate);
    if (pYm && pYm <= currentYm) months.add(pYm);
  }
  for (const d of bankTxDates) {
    const bYm = getBangkokYearMonth(d);
    if (bYm && bYm <= currentYm) months.add(bYm);
  }

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 18)
    .map((ym) => ({ value: ym, label: formatThaiMonthLabel(ym, false) }));
}

export interface SnapshotCustomerEntry {
  customerName: string;
  taxId: string;
  tg: number;
  te: number;
  tp: number;
  totalExposure: number;
  overdueAmount: number;
  maxOverdueDays: number;
  jobCount: number;
  latestJobId: string;
  latestJobNumber: string;
  responsiblePerson: string;
  latestSettledYm: string | null;
}

export interface SnapshotDeliveredItem {
  id: string;
  jobId: string;
  jobNumber: string;
  customerName: string;
  companyCode: string;
  deliveryDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  paymentMethod: string;
  responsiblePerson: string;
}

export interface ArSnapshotResult {
  asOfDate: Date;
  totalAR: number;
  overdueAmount: number;
  overdueCount: number;
  activeUnsettledCount: number;
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
  agingCounts: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
  avgOverdueDays: number;
  deliveredNotPaidCount: number;
  deliveredNotPaidAmount: number;
  deliveredNotPaidTasks: SnapshotDeliveredItem[];
  overdueTasksList: Array<{ pt: any; amount: number; paid: number; outstanding: number; diffDays: number }>;
  upcomingTasksList: Array<{ pt: any; amount: number; paid: number; outstanding: number; daysUntilDue: number }>;
  customers: SnapshotCustomerEntry[];
}

export function isTaskSettledAsOf(pt: any, asOfDate: Date): boolean {
  const statusSettled =
    pt.status === 'ตรวจสอบและบันทึกแล้ว' ||
    (pt.status === 'ชำระมัดจำแล้ว' && isDepositScheduleTask(pt));
  if (!statusSettled) return false;
  const effPaidDate = getPaymentTaskEffectivePaidDate(pt);
  if (!effPaidDate) return true;
  return effPaidDate.getTime() <= asOfDate.getTime();
}

export function getTaskPaidAmountAsOf(pt: any, billedAmount: number, asOfDate: Date): number {
  if (isTaskSettledAsOf(pt, asOfDate)) {
    const p = Number(pt.paidAmount || 0);
    return p > 0 ? p : billedAmount;
  }
  const partialPaid = Number(pt.paidAmount || 0);
  if (partialPaid <= 0) return 0;
  const effPaidDate = getPaymentTaskEffectivePaidDate(pt);
  if (!effPaidDate || effPaidDate.getTime() <= asOfDate.getTime()) {
    return partialPaid;
  }
  return 0;
}

/**
 * Computes a deterministic Point-in-Time Accounts Receivable & Aging snapshot as of `asOfDate`.
 */
export function computeArSnapshotAt(tasks: any[], asOfDate: Date): ArSnapshotResult {
  const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 };
  const agingCounts = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 };
  const customerMap = new Map<string, SnapshotCustomerEntry>();
  const latestSettledByCustomer = new Map<string, string>();
  const deliveredNotPaidTasks: SnapshotDeliveredItem[] = [];
  const overdueTasksList: Array<{ pt: any; amount: number; paid: number; outstanding: number; diffDays: number }> = [];
  const upcomingTasksList: Array<{ pt: any; amount: number; paid: number; outstanding: number; daysUntilDue: number }> = [];

  let totalAR = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let activeUnsettledCount = 0;
  let overdueDaysSum = 0;

  for (const pt of tasks) {
    if (pt.createdAt) {
      const created = new Date(pt.createdAt);
      if (!Number.isNaN(created.getTime()) && created.getTime() > asOfDate.getTime()) {
        continue;
      }
    }

    const billed = getPaymentTaskBilledAmount(pt);
    const settled = isTaskSettledAsOf(pt, asOfDate);
    const paid = getTaskPaidAmountAsOf(pt, billed, asOfDate);
    const outstanding = settled ? 0 : Math.max(0, billed - paid);

    if (pt.job?.customerName) {
      const cName = pt.job.customerName.trim();
      const settledYm = settled ? getBangkokYearMonth(getPaymentTaskEffectivePaidDate(pt)) : null;
      if (settledYm) {
        const prevYm = latestSettledByCustomer.get(cName);
        if (!prevYm || settledYm > prevYm) {
          latestSettledByCustomer.set(cName, settledYm);
        }
      }
    }

    if (settled) continue;
    activeUnsettledCount++;
    if (outstanding <= 0) continue;

    totalAR += outstanding;

    const dayDiff = pt.dueDate ? getBangkokDayDiff(pt.dueDate, asOfDate) : null;
    let diffDays = 0;

    if (dayDiff !== null && dayDiff < 0) {
      diffDays = -dayDiff;
      overdueAmount += outstanding;
      overdueCount++;
      overdueDaysSum += diffDays;

      if (diffDays <= 30) {
        aging.days1to30 += outstanding;
        agingCounts.days1to30++;
      } else if (diffDays <= 60) {
        aging.days31to60 += outstanding;
        agingCounts.days31to60++;
      } else if (diffDays <= 90) {
        aging.days61to90 += outstanding;
        agingCounts.days61to90++;
      } else {
        aging.days90plus += outstanding;
        agingCounts.days90plus++;
      }

      overdueTasksList.push({ pt, amount: billed, paid, outstanding, diffDays });
    } else {
      aging.current += outstanding;
      agingCounts.current++;
      if (dayDiff !== null) {
        upcomingTasksList.push({ pt, amount: billed, paid, outstanding, daysUntilDue: dayDiff });
      }
    }

    if (pt.job?.deliveryDate) {
      const delivDate = new Date(pt.job.deliveryDate);
      if (!Number.isNaN(delivDate.getTime()) && delivDate.getTime() <= asOfDate.getTime()) {
        deliveredNotPaidTasks.push({
          id: pt.id,
          jobId: pt.job?.id || pt.jobId || pt.id,
          jobNumber: pt.job?.jobNumber || 'JB-PENDING',
          customerName: pt.job?.customerName || 'ลูกค้าทั่วไป',
          companyCode: pt.job?.companyCode || 'TG',
          deliveryDate: toBangkokDateString(delivDate) || delivDate.toISOString().slice(0, 10),
          totalAmount: billed,
          paidAmount: paid,
          outstandingAmount: outstanding,
          status: paid > 0 ? 'ส่งมอบแล้ว (ชำระบางส่วน)' : 'ส่งมอบแล้ว (รอชำระ)',
          paymentMethod: pt.job?.paymentMethod || pt.creditType || 'เครดิต',
          responsiblePerson: pt.job?.sellerName || pt.assignedTo || 'ฝ่ายขาย',
        });
      }
    }

    if (pt.job?.customerName) {
      const cName = pt.job.customerName.trim();
      if (!customerMap.has(cName)) {
        customerMap.set(cName, {
          customerName: cName,
          taxId: '',
          tg: 0,
          te: 0,
          tp: 0,
          totalExposure: 0,
          overdueAmount: 0,
          maxOverdueDays: 0,
          jobCount: 0,
          latestJobId: pt.job?.id || '',
          latestJobNumber: pt.job?.jobNumber || '',
          responsiblePerson: pt.job?.sellerName || pt.assignedTo || 'ฝ่ายขาย',
          latestSettledYm: null,
        });
      }
      const cEntry = customerMap.get(cName)!;
      cEntry.totalExposure += outstanding;
      cEntry.jobCount++;
      if (pt.job?.id) {
        cEntry.latestJobId = pt.job.id;
        cEntry.latestJobNumber = pt.job.jobNumber || cEntry.latestJobNumber;
      }
      const cCode = (pt.job?.companyCode || '').toUpperCase();
      if (cCode.includes('TG') || cCode.includes('GROUP')) cEntry.tg += outstanding;
      else if (cCode.includes('TE') || cCode.includes('ELECTRIC')) cEntry.te += outstanding;
      else if (cCode.includes('TP') || cCode.includes('POWER')) cEntry.tp += outstanding;
      else cEntry.tg += outstanding;

      if (diffDays > 0) {
        cEntry.overdueAmount += outstanding;
        if (diffDays > cEntry.maxOverdueDays) cEntry.maxOverdueDays = diffDays;
      }
    }
  }

  return {
    asOfDate,
    totalAR,
    overdueAmount,
    overdueCount,
    activeUnsettledCount,
    aging,
    agingCounts,
    avgOverdueDays: overdueCount > 0 ? Math.round(overdueDaysSum / overdueCount) : 0,
    deliveredNotPaidCount: deliveredNotPaidTasks.length,
    deliveredNotPaidAmount: deliveredNotPaidTasks.reduce((s, d) => s + d.outstandingAmount, 0),
    deliveredNotPaidTasks,
    overdueTasksList,
    upcomingTasksList,
    customers: Array.from(customerMap.values()).map((c) => ({
      ...c,
      latestSettledYm: latestSettledByCustomer.get(c.customerName) || c.latestSettledYm,
    })),
  };
}

export function buildRealReceiptForecast(
  upcomingTasksList: ArSnapshotResult['upcomingTasksList'],
  snapshotCustomers: SnapshotCustomerEntry[],
  creditSettingsMap: Map<string, any>
) {
  const customerLookup = new Map<string, SnapshotCustomerEntry>();
  snapshotCustomers.forEach((c) => customerLookup.set(c.customerName.trim().toLowerCase(), c));

  const classifyItem = (item: ArSnapshotResult['upcomingTasksList'][number]) => {
    const custName = (item.pt.job?.customerName || '').trim().toLowerCase();
    const custExp = customerLookup.get(custName);
    const cs = creditSettingsMap.get(custName);
    const method = (item.pt.job?.paymentMethod || '').trim();
    const isExceeded = Boolean(cs && cs.creditLimit > 0 && custExp && custExp.totalExposure > cs.creditLimit);
    const isBlocked = Boolean(
      cs && ['SUSPENDED', 'BLOCKED', 'WATCHLIST'].includes(String(cs.creditStatus || '').toUpperCase())
    );
    const hasHighOverdue = Boolean(custExp && custExp.maxOverdueDays > 30);

    if (isExceeded || isBlocked || hasHighOverdue) {
      return {
        category: 'AT_RISK' as const,
        label: 'มีความเสี่ยง (ประวัติค้าง/เกินวงเงิน)',
      };
    }

    const isCashOrDeposit =
      method.includes('เงินสด') ||
      method === 'จ่ายแล้ว' ||
      Number(item.paid || 0) > 0 ||
      (custExp ? custExp.maxOverdueDays === 0 : true);

    if (isCashOrDeposit && (!custExp || custExp.maxOverdueDays === 0)) {
      return {
        category: 'CONFIRMED' as const,
        label: item.daysUntilDue <= 7 ? 'ครบกำหนดสัปดาห์นี้ (ประวัติตรงเวลา)' : 'กำหนดชัด/ประวัติดี',
      };
    }

    return {
      category: 'PROBABLE' as const,
      label: 'ตามรอบเครดิตปกติ',
    };
  };

  const summarizeBucket = (items: ArSnapshotResult['upcomingTasksList']) => {
    let amount = 0;
    let confirmed = 0;
    let probable = 0;
    let atRisk = 0;
    for (const item of items) {
      amount += item.outstanding;
      const cls = classifyItem(item);
      if (cls.category === 'CONFIRMED') confirmed += item.outstanding;
      else if (cls.category === 'AT_RISK') atRisk += item.outstanding;
      else probable += item.outstanding;
    }
    const confirmedPct = amount > 0 ? Math.round((confirmed / amount) * 100) : 0;
    const atRiskPct = amount > 0 ? Math.round((atRisk / amount) * 100) : 0;
    const probablePct = amount > 0 ? Math.max(0, 100 - confirmedPct - atRiskPct) : 0;
    return { amount, count: items.length, confirmed, probable, atRisk, confirmedPct, probablePct, atRiskPct };
  };

  const days7 = summarizeBucket(upcomingTasksList.filter((x) => x.daysUntilDue <= 7));
  const days30 = summarizeBucket(upcomingTasksList.filter((x) => x.daysUntilDue <= 30));
  const days90 = summarizeBucket(upcomingTasksList.filter((x) => x.daysUntilDue <= 90));

  const forecastItems = [...upcomingTasksList]
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 10)
    .map((item) => {
      const cls = classifyItem(item);
      return {
        id: item.pt.id,
        customerName: item.pt.job?.customerName || 'ลูกค้าทั่วไป',
        expectedDate: item.pt.dueDate ? (toBangkokDateString(item.pt.dueDate) || '') : '',
        amount: item.outstanding,
        category: cls.category,
        categoryLabel: cls.label,
        source: `งาน ${item.pt.job?.jobNumber || ''} ${item.pt.note ? `(${item.pt.note})` : ''}`,
      };
    });

  return { days7, days30, days90, forecastItems };
}
