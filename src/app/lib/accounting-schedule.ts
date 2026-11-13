export interface ScheduleTaskLike {
  id?: string;
  status?: string | null;
  creditType?: string | null;
  installmentNo?: number | null;
  installmentTotal?: number | null;
  installmentAmount?: number | string | null;
  paidAmount?: number | string | null;
  dueDate?: Date | string | null;
  paidDate?: Date | string | null;
  invoiceNumber?: string | null;
  note?: string | null;
}

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns true when a payment task represents a dedicated deposit round (installment #0 or creditType 'DEPOSIT').
 */
export function isDepositScheduleTask(task: ScheduleTaskLike | null | undefined): boolean {
  if (!task) return false;
  return task.installmentNo === 0 || task.creditType === 'DEPOSIT';
}

/**
 * Returns true when a payment round is settled for overdue and next-round scheduling checks.
 * A dedicated DEPOSIT round marked 'ชำระมัดจำแล้ว' is settled so remaining installments govern due dates,
 * whereas partial deposits on regular/single-task bills remain open until fully verified.
 */
export function isScheduleTaskSettled(task: ScheduleTaskLike | null | undefined): boolean {
  if (!task) return false;
  if (task.status === 'ตรวจสอบและบันทึกแล้ว') return true;
  if (task.status === 'ชำระมัดจำแล้ว' && isDepositScheduleTask(task)) return true;
  return false;
}

/**
 * Normalizes a Date/string (including Buddhist Era years >= 2400) to an Asia/Bangkok calendar date ('YYYY-MM-DD').
 */
export function toBangkokDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (parsed.getUTCFullYear() >= 2400) {
    parsed.setUTCFullYear(parsed.getUTCFullYear() - 543);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

/**
 * Returns integer calendar days (targetDate - referenceDate) in Asia/Bangkok timezone.
 * Positive values mean targetDate is in the future; 0 means due today; negative values mean overdue.
 */
export function getBangkokDayDiff(
  targetDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  const targetYmd = toBangkokDateString(targetDate);
  const refYmd = toBangkokDateString(referenceDate);
  if (!targetYmd || !refYmd) return null;

  const [ty, tm, td] = targetYmd.split('-').map(Number);
  const [ry, rm, rd] = refYmd.split('-').map(Number);
  const targetUtcDay = Date.UTC(ty, tm - 1, td);
  const refUtcDay = Date.UTC(ry, rm - 1, rd);
  return Math.round((targetUtcDay - refUtcDay) / MS_PER_DAY);
}

/**
 * Returns positive calendar days overdue in Asia/Bangkok, or 0 if settled, missing dueDate, due today, or in the future.
 */
export function getTaskOverdueDays(
  task: ScheduleTaskLike | null | undefined,
  referenceDate: Date = new Date()
): number {
  if (!task || isScheduleTaskSettled(task) || !task.dueDate) return 0;
  const diffFromToday = getBangkokDayDiff(task.dueDate, referenceDate);
  if (diffFromToday === null || diffFromToday >= 0) return 0;
  return -diffFromToday;
}

/**
 * Returns true only when the payment task is unsettled and its Asia/Bangkok due date is strictly before today.
 */
export function isTaskOverdue(
  task: ScheduleTaskLike | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  return getTaskOverdueDays(task, referenceDate) > 0;
}

/**
 * Returns remaining unpaid amount for a payment round; settled rounds always return 0.
 */
export function getTaskRemainingAmount(
  task: ScheduleTaskLike | null | undefined,
  fallbackBilledAmount: number = 0
): number {
  if (!task || isScheduleTaskSettled(task)) return 0;
  const billed = Number(task.installmentAmount) || Number(fallbackBilledAmount) || 0;
  const paid = Number(task.paidAmount) || 0;
  return Math.max(0, billed - paid);
}

/**
 * Orders payment tasks by round sequence (installmentNo ascending, then dueDate ascending) and picks the first unsettled round.
 */
export function getNextPendingScheduleTask<T extends ScheduleTaskLike>(
  tasks: T[] | null | undefined,
  options?: { requireDueDate?: boolean }
): T | undefined {
  if (!tasks || tasks.length === 0) return undefined;
  const sorted = [...tasks].sort((a, b) => {
    const noA = a.installmentNo ?? Number.MAX_SAFE_INTEGER;
    const noB = b.installmentNo ?? Number.MAX_SAFE_INTEGER;
    if (noA !== noB) return noA - noB;
    const dateA = toBangkokDateString(a.dueDate) ?? '9999-12-31';
    const dateB = toBangkokDateString(b.dueDate) ?? '9999-12-31';
    return dateA.localeCompare(dateB);
  });

  return sorted.find((task) => {
    if (isScheduleTaskSettled(task)) return false;
    if (options?.requireDueDate && !task.dueDate) return false;
    return true;
  });
}

/**
 * Formats a concise Thai round label (e.g. 'เงินมัดจำ', 'รอบส่งมอบที่ 1', or 'งวดที่ 3/12').
 */
export function formatTaskRoundLabel(
  task: ScheduleTaskLike | null | undefined,
  options?: { short?: boolean }
): string {
  if (!task) return '-';
  if (isDepositScheduleTask(task)) return 'เงินมัดจำ';
  const isDelivery =
    task.creditType === 'DELIVERY' ||
    Boolean(task.note && (task.note.includes('ส่งมอบ') || task.note.includes('ล็อต')));
  if (isDelivery) {
    return `รอบส่งมอบที่ ${task.installmentNo || 1}`;
  }
  if (task.installmentNo !== undefined && task.installmentNo !== null) {
    if (options?.short || !task.installmentTotal) {
      return `งวดที่ ${task.installmentNo}`;
    }
    return `งวดที่ ${task.installmentNo}/${task.installmentTotal}`;
  }
  return 'รอบชำระหลัก';
}

/**
 * Returns true if Accounting has already recorded an invoice, partial deposit, or verified payment on this task.
 */
export function hasAccountingInvoiceOrPayment(task: ScheduleTaskLike | null | undefined): boolean {
  if (!task) return false;
  if (task.status === 'ตรวจสอบและบันทึกแล้ว' || task.status === 'ชำระมัดจำแล้ว') return true;
  if (Number(task.paidAmount || 0) > 0) return true;
  if (task.invoiceNumber && task.invoiceNumber.trim() !== '') return true;
  if (task.paidDate) return true;
  return false;
}

/**
 * Returns true if the task is still a single untouched default placeholder row not yet customized by Accounting.
 */
export function isPlaceholderPaymentTask(task: ScheduleTaskLike | null | undefined): boolean {
  if (!task) return false;
  if (task.status !== 'รอดำเนินการ') return false;
  if (hasAccountingInvoiceOrPayment(task)) return false;
  if (task.installmentNo !== null && task.installmentNo !== undefined) return false;
  if (task.creditType && task.creditType.trim() !== '') return false;
  if (task.note && task.note.trim() !== '') return false;
  return true;
}

/**
 * Returns true when Accounting or installment scheduling already manages the job's payment tasks.
 */
export function hasAccountingManagedSchedule(tasks: ScheduleTaskLike[] | null | undefined): boolean {
  if (!tasks || tasks.length === 0) return false;
  if (tasks.length > 1) return true;
  return tasks.some((t) => !isPlaceholderPaymentTask(t));
}

/**
 * Computes the default payment due date from a base date and payment method label.
 */
export function computeDefaultDueDateByPaymentMethod(
  baseDate: Date | string | null | undefined,
  paymentMethod?: string | null
): Date {
  const dueDate = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(dueDate.getTime())) {
    return new Date();
  }
  if (paymentMethod?.includes('เครดิต 30 วัน') || paymentMethod === 'เครดิต') {
    dueDate.setDate(dueDate.getDate() + 30);
  } else if (paymentMethod?.includes('เครดิต 60 วัน')) {
    dueDate.setDate(dueDate.getDate() + 60);
  } else if (paymentMethod === 'เก็บเงินหน้างาน' || paymentMethod === 'จ่ายแล้ว') {
    dueDate.setDate(dueDate.getDate() + 7);
  }
  return dueDate;
}

