import { Prisma } from "@/generated/client";

/**
 * Parse Thai credit terms into integer days
 */
export function parseCreditTermDays(term?: string | null): number {
  if (!term) return 30; // default 30 days
  const t = term.trim().toLowerCase();

  if (t.includes('สด') || t.includes('cash') || t === '0') return 0;

  const match = t.match(/\d+/);
  if (match) {
    const days = parseInt(match[0], 10);
    if (!isNaN(days) && days >= 0 && days <= 365) return days;
  }

  if (t.includes('15')) return 15;
  if (t.includes('45')) return 45;
  if (t.includes('60')) return 60;
  if (t.includes('90')) return 90;

  return 30;
}

/**
 * Determine default Withholding Tax (WHT) percentage based on job/item descriptions
 * - 3%: Services, Subcontractors, Labor, Installation, Repairs
 * - 1%: Transportation, Freight
 * - 0%: Physical Products, Parts, Materials
 */
export function inferWhtPercent(jobName?: string | null, itemList?: string | null, note?: string | null): number {
  const combined = `${jobName || ''} ${itemList || ''} ${note || ''}`.toLowerCase();

  if (/ขนส่ง|ค่าส่ง|ค่าระวาง|ขนย้าย|transport|freight/i.test(combined)) {
    return 1.0;
  }
  if (/ค่าจ้าง|ติดตั้ง|บริการ|เหมา|ซ่อม|แรง|ก่อสร้าง|subcontract|service|install/i.test(combined)) {
    return 3.0;
  }
  return 0.0;
}

/**
 * Calculate financial net amounts with 2-decimal satang precision
 */
export function calculateNetPayment(gross: number | Prisma.Decimal, whtPercent: number) {
  const g = typeof gross === 'number' ? gross : Number(gross);
  const wht = Math.round(g * (whtPercent / 100) * 100) / 100;
  const net = Math.round((g - wht) * 100) / 100;
  return {
    grossAmount: new Prisma.Decimal(g.toFixed(2)),
    whtPercent: new Prisma.Decimal(whtPercent.toFixed(2)),
    whtAmount: new Prisma.Decimal(wht.toFixed(2)),
    netPayableAmount: new Prisma.Decimal(net.toFixed(2)),
  };
}

/**
 * Determine high-level AP payment status for a PO to inform purchasing and management
 */
export function getPOPaymentStatus(po: any) {
  const tasks: any[] = po.supplierPaymentTasks || [];
  if (po.receiveStatus === 'Cancelled') {
    return {
      type: 'CANCELLED',
      label: 'ยกเลิกแล้ว',
      subLabel: undefined,
      badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',
      dotClass: 'bg-gray-400',
      tasks,
    };
  }

  if (tasks.length === 0) {
    return {
      type: 'NO_TASK',
      label: 'ไม่มีรายการชำระ',
      subLabel: undefined,
      badgeClass: 'bg-gray-50 text-gray-400 border-gray-200',
      dotClass: 'bg-gray-300',
      tasks: [],
    };
  }

  const allPaid = tasks.every((t) => t.status === 'PAID_VERIFIED');
  if (allPaid) {
    const latestPaid = tasks
      .map((t) => t.paidDate)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    const paidDateStr = latestPaid
      ? new Date(latestPaid).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : undefined;
    return {
      type: 'PAID',
      label: 'จ่ายเงินแล้ว',
      subLabel: paidDateStr ? `จ่าย ${paidDateStr}` : undefined,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      tasks,
    };
  }

  const hasPaidLeg = tasks.some((t) => t.status === 'PAID_VERIFIED');
  const now = new Date();
  const hasOverdue = tasks.some(
    (t) => t.status !== 'PAID_VERIFIED' && t.status !== 'CANCELLED' && t.status !== 'AWAITING_GR' && t.dueDate && isValidBusinessDate(t.dueDate) && new Date(t.dueDate) < now
  );
  const hasDeferred = tasks.some(
    (t) => (t.note && t.note.includes('[เลื่อนชำระ')) || (po.note && (po.note.includes('[เลื่อนชำระ') || po.note.includes('[การเงินเลื่อน')))
  );
  const hasAwaitingGr = tasks.some((t) => t.status === 'AWAITING_GR');

  const unpaidTasks = tasks.filter((t) => t.status !== 'PAID_VERIFIED' && t.status !== 'CANCELLED');
  const upcomingDueDate = unpaidTasks
    .map((t) => t.dueDate)
    .filter(isValidBusinessDate)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];
  const dueDateStr = upcomingDueDate
    ? new Date(upcomingDueDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : undefined;

  if (hasOverdue) {
    return {
      type: 'OVERDUE',
      label: 'เกินกำหนดชำระ',
      subLabel: dueDateStr ? `ครบ ${dueDateStr}` : undefined,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500',
      tasks,
      hasPaidLeg,
    };
  }

  if (hasDeferred) {
    return {
      type: 'DEFERRED',
      label: 'เลื่อนนัดชำระ',
      subLabel: dueDateStr ? `นัดใหม่ ${dueDateStr}` : undefined,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      tasks,
      hasPaidLeg,
    };
  }

  if (hasAwaitingGr) {
    return {
      type: 'AWAITING_GR',
      label: 'รอตรวจรับของ',
      subLabel: '3-Way Match',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      dotClass: 'bg-orange-500',
      tasks,
      hasPaidLeg,
    };
  }

  return {
    type: 'PENDING',
    label: hasPaidLeg ? 'จ่ายมัดจำแล้ว' : 'รอจ่ายเงิน',
    subLabel: dueDateStr ? `ครบ ${dueDateStr}` : undefined,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
    tasks,
    hasPaidLeg,
  };
}

/**
 * Sanitize and normalize deposit and remaining amounts against totalAmount
 * Protects against string concatenation bugs from spreadsheet imports (e.g. "30% 7,957.91" becoming 307957.91)
 * and percentage inputs (e.g. entering 30 instead of 30% of total)
 */
export function normalizePOPaymentAmounts(
  totalAmount: number,
  rawDeposit?: number | string | Prisma.Decimal | null,
  rawRemaining?: number | string | Prisma.Decimal | null
): { depositAmount: number; remainingAmount: number } {
  if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
    return { depositAmount: 0, remainingAmount: 0 };
  }

  let deposit = Number(rawDeposit) || 0;
  let remaining = Number(rawRemaining) || 0;

  // 1. Percentage check (user typed 30 or 50 as percentage instead of amount)
  if (deposit > 0 && deposit <= 100 && totalAmount > 1000) {
    deposit = Math.round(totalAmount * (deposit / 100) * 100) / 100;
  }

  // 2. Concatenation check on deposit (e.g. "30" + "7957.91" = 307957.91 on 26526.37)
  if (deposit > totalAmount) {
    let unFused = false;
    const s = deposit.toString();
    for (const pct of [50, 30, 20, 70, 80, 25, 40, 60, 10, 100]) {
      const prefix = pct.toString();
      if (s.startsWith(prefix)) {
        const sliced = parseFloat(s.slice(prefix.length));
        if (!isNaN(sliced) && sliced > 0 && sliced <= totalAmount) {
          if (Math.abs(sliced - totalAmount * (pct / 100)) < totalAmount * 0.08) {
            deposit = Math.round(sliced * 100) / 100;
            unFused = true;
            break;
          }
        }
      }
    }
    if (!unFused) {
      if (remaining > 0 && remaining < totalAmount) {
        deposit = Math.max(0, Math.round((totalAmount - remaining) * 100) / 100);
      } else {
        deposit = totalAmount;
      }
    }
  }

  // 3. Percentage check on remaining
  if (remaining > 0 && remaining <= 100 && totalAmount > 1000) {
    remaining = Math.round(totalAmount * (remaining / 100) * 100) / 100;
  }

  // 4. Concatenation check on remaining
  if (remaining > totalAmount) {
    let unFused = false;
    const s = remaining.toString();
    for (const pct of [70, 80, 50, 30, 75, 60, 40]) {
      const prefix = pct.toString();
      if (s.startsWith(prefix)) {
        const sliced = parseFloat(s.slice(prefix.length));
        if (!isNaN(sliced) && sliced > 0 && sliced <= totalAmount) {
          if (Math.abs(sliced - totalAmount * (pct / 100)) < totalAmount * 0.08) {
            remaining = Math.round(sliced * 100) / 100;
            unFused = true;
            break;
          }
        }
      }
    }
    if (!unFused) {
      remaining = Math.max(0, Math.round((totalAmount - deposit) * 100) / 100);
    }
  }

  // 5. Accounting reconciliation: deposit + remaining must equal totalAmount
  if (deposit > 0) {
    remaining = Math.max(0, Math.round((totalAmount - deposit) * 100) / 100);
  } else {
    remaining = totalAmount;
  }

  return { depositAmount: deposit, remainingAmount: remaining };
}

/**
 * Validate that a date falls within realistic system business boundaries (2024 to 2035).
 * Prevents corrupted dates (e.g. year 2001, 2009, or negative offset conversions) from poisoning accounting calculations.
 */
export function isValidBusinessDate(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  return year >= 2024 && year <= 2035;
}

/**
 * Return date if valid business date, otherwise return fallback.
 */
export function sanitizeBusinessDate(d: Date | string | null | undefined, fallback: Date = new Date()): Date {
  if (isValidBusinessDate(d)) return typeof d === 'string' ? new Date(d) : (d as Date);
  if (isValidBusinessDate(fallback)) return fallback;
  return new Date();
}
