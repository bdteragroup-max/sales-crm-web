export function getCycleDateRange(yearBE: string | number, round: string | number) {
  const ceYear = Number(yearBE) - 543;
  const isRound1 = String(round) === '1';
  const startDate = new Date(`${ceYear}-${isRound1 ? '01' : '07'}-01T00:00:00+07:00`);
  const endMonth = isRound1 ? '06' : '12';
  const endDay = isRound1 ? '30' : '31';
  const endDate = new Date(`${ceYear}-${endMonth}-${endDay}T23:59:59+07:00`);
  return { startDate, endDate, ceYear, isRound1 };
}

export function getCurrentCycle() {
  const now = new Date();
  const yearBE = (now.getFullYear() + 543).toString();
  const round = now.getMonth() >= 6 ? '2' : '1';
  return { year: yearBE, round };
}

export function isQuotationInCycle(
  q: { billingDate?: Date | null; poDate?: Date | null; quotationDate?: Date | null },
  startDate: Date,
  endDate: Date
): boolean {
  const effDate = q.billingDate || q.poDate || q.quotationDate;
  if (!effDate) return false;
  const d = new Date(effDate);
  return d >= startDate && d <= endDate;
}

export type InstallationStatusType = 'COMPLETED' | 'IN_PROGRESS' | 'NO_INSTALLATION' | 'UNKNOWN';

export interface InstallationStatusInfo {
  status: InstallationStatusType;
  label: string;
  badgeText: string;
  color: 'green' | 'blue' | 'gray' | 'amber';
  technician?: string | null;
  orderNo?: string | null;
  plannedDate?: string | null;
}

const COMPLETED_STATUSES = new Set([
  'Completed',
  'เสร็จสิ้น',
  'ปิด Job - ติดตั้งเสร็จสิ้น',
  'ปิด Job - ตรวจเช็คเสร็จสิ้น'
]);

const IN_PROGRESS_STATUSES = new Set([
  'กำลังติดตั้ง',
  'กำลังตรวจเช็ค',
  'เปิด Job - ยังไม่เริ่มติดตั้ง',
  'มีปัญหา',
  'เปิด Job - ยังไม่เริ่มตรวจเช็ค',
  'รอดำเนินการ',
  'Draft'
]);

export function evaluateInstallationStatusFromData(params: {
  installationOrders?: any[];
  jobs?: any[];
}): InstallationStatusInfo {
  const orders = params.installationOrders || [];
  const jobs = params.jobs || [];

  // 1. Check completed orders
  const completedOrder = orders.find(o => COMPLETED_STATUSES.has(o.status));
  const completedProject = jobs.find(j => j.project?.status === 'Completed');

  if (completedOrder || completedProject) {
    return {
      status: 'COMPLETED',
      label: 'ติดตั้งเสร็จสมบูรณ์แล้ว',
      badgeText: 'ติดตั้งเสร็จสิ้น',
      color: 'green',
      technician: completedOrder?.technician || null,
      orderNo: completedOrder?.installationNo || null,
      plannedDate: completedOrder?.installationDate ? new Date(completedOrder.installationDate).toISOString() : null
    };
  }

  // 2. Check in-progress orders or projects
  const inProgressOrder = orders.find(o => IN_PROGRESS_STATUSES.has(o.status));
  const inProgressProject = jobs.find(j => j.project && j.project.status !== 'Completed');

  const hasInstallJob = jobs.some(j =>
    j.jobType?.includes('ติดตั้ง') ||
    j.jobType?.includes('งานโปรเจค') ||
    j.jobType?.includes('ตรวจเช็ค') ||
    j.currentStep === 'project' ||
    j.currentStep === 'service'
  );

  if (inProgressOrder || inProgressProject || hasInstallJob) {
    const activeOrder = inProgressOrder || orders[0] || null;
    return {
      status: 'IN_PROGRESS',
      label: 'กำลังติดตั้งอยู่หน้างาน',
      badgeText: 'กำลังติดตั้งหน้างาน',
      color: 'blue',
      technician: activeOrder?.technician || null,
      orderNo: activeOrder?.installationNo || null,
      plannedDate: activeOrder?.plannedStartDate || activeOrder?.installationDate
        ? new Date(activeOrder.plannedStartDate || activeOrder.installationDate).toISOString()
        : null
    };
  }

  // 3. Jobs exist but no installation
  if (jobs.length > 0) {
    return {
      status: 'NO_INSTALLATION',
      label: 'ส่งมอบสินค้าแล้ว (ไม่มีงานติดตั้ง)',
      badgeText: 'ไม่มีงานติดตั้ง',
      color: 'gray'
    };
  }

  return {
    status: 'UNKNOWN',
    label: 'ไม่มีข้อมูลงานติดตั้ง',
    badgeText: 'ไม่มีงานติดตั้ง',
    color: 'gray'
  };
}
