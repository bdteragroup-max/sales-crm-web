'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@/generated/client';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { getUser } from '@/app/lib/dal';
import {
  isSuperUser,
  isReadOnlyExecutive,
  isTransportStaff,
  isLogisticsManager,
} from '@/app/lib/roleHelper';
import {
  isStoreRole,
  isPurchasingRole,
} from '@/app/lib/requisitionUtils';
import { isSamePersonName } from '@/app/lib/personName';
import { getSteps, getNextStep } from '@/app/lib/job-workflow';
import { stringToAdvisoryLockIds } from '@/app/lib/job-utils';
import {
  evaluateAccountingAmountReconciliation,
  evaluatePrepaidDeliveryBlockReason,
} from '@/app/lib/accounting-reconciliation';
import { sendPushToUser } from '@/app/lib/pushNotification';
import {
  recordTransportPickup,
  recordSiteHandover,
} from '@/app/actions/requisitions';
import { updateRepairDelivery } from '@/app/actions/repairDeliveries';
import {
  calculateTripAllowanceAndExpenses,
  combineBangkokDateAndTime,
  DEFAULT_LOGISTICS_BRANCHES,
  evaluateLogisticsGoldTiers,
  LOGISTICS_BRANCH_ALIASES,
  parseLogisticsTime24,
  parseSlashDateToIso,
  type LogisticsBranchOption,
  type LogisticsCrewMember,
  type LogisticsExpenseCategory,
  type LogisticsGoldSummary,
  type LogisticsPermissions,
  type LogisticsQueueItem,
  type LogisticsStopSourceType,
  type LogisticsTripExpenseItem,
  type LogisticsTripRecord,
  type LogisticsTripStatus,
  type LogisticsTripStopItem,
  type LogisticsStopStatus,
  type LogisticsVehicleOption,
  type LogisticsWorkspaceData,
} from '@/app/lib/logisticsTypes';

type GlobalLogisticsState = typeof globalThis & {
  __logisticsSchemaReady?: boolean;
  __logisticsSchemaPromise?: Promise<void> | null;
  __logisticsHrCache?: {
    rows: Array<{
      emp_id: string;
      name: string;
      nickname: string | null;
      departments: { name: string } | null;
      job_positions: { title: string } | null;
    }>;
    expiresAt: number;
  } | null;
};

const globalLogState = globalThis as GlobalLogisticsState;
const HR_CACHE_TTL_MS = 2 * 60 * 1000;

async function ensureLogisticsSchema() {
  if (globalLogState.__logisticsSchemaReady) return;
  if (globalLogState.__logisticsSchemaPromise) {
    return globalLogState.__logisticsSchemaPromise;
  }

  const runInit = async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS logistics_trips (
          id TEXT PRIMARY KEY,
          trip_number VARCHAR(40) UNIQUE NOT NULL,
          trip_date TIMESTAMPTZ(6) NOT NULL,
          departure_time VARCHAR(10),
          status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
          transport_type VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
          vehicle_asset_id INTEGER,
          vehicle_plate VARCHAR(60),
          vehicle_name VARCHAR(180),
          courier_name VARCHAR(150),
          driver_user_id TEXT,
          driver_employee_id VARCHAR(40),
          driver_name VARCHAR(150) NOT NULL,
          helper_names TEXT,
          route_zone VARCHAR(200),
          origin_branch VARCHAR(80) DEFAULT 'BKK-HQ',
          plan_note TEXT,
          start_mileage INTEGER,
          end_mileage INTEGER,
          started_at TIMESTAMPTZ(6),
          closed_at TIMESTAMPTZ(6),
          closed_by_id TEXT,
          closed_by_name VARCHAR(150),
          close_note TEXT,
          allowance_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0,
          allowance_days NUMERIC(6, 2) NOT NULL DEFAULT 1,
          crew_count INTEGER NOT NULL DEFAULT 1,
          allowance_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
          overnight_nights INTEGER NOT NULL DEFAULT 0,
          accommodation_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          toll_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          fuel_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          other_expense_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          expense_items JSONB NOT NULL DEFAULT '[]'::jsonb,
          total_expense_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          expense_receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
          expense_approved_status VARCHAR(30) NOT NULL DEFAULT 'NONE',
          created_by_id TEXT NOT NULL,
          created_by_name VARCHAR(150) NOT NULL,
          created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_logistics_trips_date ON logistics_trips(trip_date);
        CREATE INDEX IF NOT EXISTS idx_logistics_trips_status ON logistics_trips(status);
        CREATE INDEX IF NOT EXISTS idx_logistics_trips_driver ON logistics_trips(driver_user_id);
        CREATE INDEX IF NOT EXISTS idx_logistics_trips_vehicle ON logistics_trips(vehicle_asset_id);
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS logistics_trip_stops (
          id TEXT PRIMARY KEY,
          trip_id TEXT NOT NULL REFERENCES logistics_trips(id) ON DELETE CASCADE,
          stop_order INTEGER NOT NULL DEFAULT 1,
          source_type VARCHAR(30) NOT NULL DEFAULT 'JOB',
          job_id TEXT,
          requisition_id TEXT,
          repair_delivery_id TEXT,
          reference_number VARCHAR(80),
          customer_name VARCHAR(255) NOT NULL,
          destination TEXT,
          province VARCHAR(100),
          contact_name VARCHAR(150),
          contact_phone VARCHAR(60),
          item_summary TEXT,
          target_date TIMESTAMPTZ(6),
          status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          delivery_method VARCHAR(30) NOT NULL DEFAULT 'in-house',
          courier_company VARCHAR(120),
          tracking_number VARCHAR(120),
          checked_in_at TIMESTAMPTZ(6),
          gps_lat DOUBLE PRECISION,
          gps_lng DOUBLE PRECISION,
          delivered_at TIMESTAMPTZ(6),
          receiver_name VARCHAR(150),
          receiver_signature_url TEXT,
          pod_photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
          pod_note TEXT,
          fail_reason TEXT,
          created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_logistics_trip_stops_trip ON logistics_trip_stops(trip_id, stop_order);
        CREATE INDEX IF NOT EXISTS idx_logistics_trip_stops_job ON logistics_trip_stops(job_id);
        CREATE INDEX IF NOT EXISTS idx_logistics_trip_stops_req ON logistics_trip_stops(requisition_id);
        CREATE INDEX IF NOT EXISTS idx_logistics_trip_stops_rd ON logistics_trip_stops(repair_delivery_id);
        CREATE INDEX IF NOT EXISTS idx_logistics_trip_stops_status ON logistics_trip_stops(status);
      `);
      globalLogState.__logisticsSchemaReady = true;
    } finally {
      globalLogState.__logisticsSchemaPromise = null;
    }
  };

  globalLogState.__logisticsSchemaPromise = runInit();
  return globalLogState.__logisticsSchemaPromise;
}

async function getHrEmployeesCached() {
  const now = Date.now();
  if (globalLogState.__logisticsHrCache && globalLogState.__logisticsHrCache.expiresAt > now) {
    return globalLogState.__logisticsHrCache.rows;
  }
  try {
    const rows = await teraDb.employees.findMany({
      where: { is_active: true },
      select: {
        emp_id: true,
        name: true,
        nickname: true,
        departments: { select: { name: true } },
        job_positions: { select: { title: true } },
      },
    });
    globalLogState.__logisticsHrCache = { rows, expiresAt: now + HR_CACHE_TTL_MS };
    return rows;
  } catch {
    return globalLogState.__logisticsHrCache?.rows ?? [];
  }
}

function getBangkokCurrentMonthYear(): { month: number; yearCe: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date());
  const month = Number(parts.find((p) => p.type === 'month')?.value || new Date().getMonth() + 1);
  const yearCe = Number(parts.find((p) => p.type === 'year')?.value || new Date().getFullYear());
  return { month, yearCe };
}

function getBangkokMonthBounds(yearCe: number, month: number): { monthStart: Date; monthEnd: Date } {
  const mm = String(month).padStart(2, '0');
  const nextYear = month === 12 ? yearCe + 1 : yearCe;
  const nextMm = String(month === 12 ? 1 : month + 1).padStart(2, '0');
  return {
    monthStart: new Date(`${yearCe}-${mm}-01T00:00:00.000+07:00`),
    monthEnd: new Date(`${nextYear}-${nextMm}-01T00:00:00.000+07:00`),
  };
}

export async function resolveLogisticsPermissions(): Promise<{
  user: Awaited<ReturnType<typeof getUser>>;
  permissions: LogisticsPermissions | null;
}> {
  const user = await getUser();
  if (!user) return { user: null, permissions: null };

  const role = user.role || '';
  const roleLower = role.toLowerCase().trim();
  const sysAdmin = isSuperUser(role);
  const readOnlyExec = isReadOnlyExecutive(role);

  let isTransportTeam = isTransportStaff(role);
  let isMgr = isLogisticsManager(role);
  const isWarehouseOrPurchase = isStoreRole(role) || isPurchasingRole(role);

  if (!isTransportTeam && !sysAdmin && !readOnlyExec && !isWarehouseOrPurchase) {
    const hrRows = await getHrEmployeesCached();
    const hrMatch = hrRows.find(
      (h) =>
        (user.employeeId && h.emp_id.toUpperCase() === user.employeeId.toUpperCase()) ||
        isSamePersonName(h.name, user.fullName)
    );
    const deptTitle = `${hrMatch?.departments?.name || ''} ${hrMatch?.job_positions?.title || ''}`.toLowerCase();
    if (['ขนส่ง', 'จัดส่ง', 'ขับรถ', 'logistic', 'transport', 'shipping'].some((k) => deptTitle.includes(k))) {
      isTransportTeam = true;
      if (['ผู้จัดการ', 'หัวหน้า', 'manager', 'mgr'].some((k) => deptTitle.includes(k))) {
        isMgr = true;
      }
    }
  }

  const canAccess =
    sysAdmin ||
    readOnlyExec ||
    isMgr ||
    isTransportTeam ||
    isWarehouseOrPurchase ||
    roleLower === 'admin' ||
    roleLower.includes('ผู้ดูแลระบบ');

  const canPlanTrips =
    !readOnlyExec &&
    (sysAdmin || isMgr || isTransportTeam || isWarehouseOrPurchase || roleLower === 'admin');

  const canManageAllTrips =
    !readOnlyExec &&
    (sysAdmin || isMgr || isWarehouseOrPurchase || roleLower === 'admin');

  return {
    user,
    permissions: {
      userId: user.id,
      employeeId: user.employeeId || '',
      fullName: user.fullName,
      role,
      isManager: isMgr || sysAdmin,
      isTransportTeam,
      canAccess,
      canPlanTrips,
      canManageAllTrips,
    },
  };
}

type DbStopRow = Prisma.LogisticsTripStopGetPayload<Record<string, never>>;
type DbTripWithStops = Prisma.LogisticsTripGetPayload<{ include: { stops: true } }>;

interface ReqLookupRow {
  id: string;
  requisitionNumber: string;
  transportSignatureUrl: string | null;
  transportName: string | null;
}

interface CompanyAddressSlice {
  address?: string | null;
  province?: string | null;
  district?: string | null;
  subDistrict?: string | null;
  postalCode?: string | null;
  shippingAddress?: string | null;
  shippingSubDistrict?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;
  shippingPostalCode?: string | null;
}

interface JobDeliveryGoldSlice {
  id: string;
  trackingPhotoUrl: string | null;
  trackingNumber: string | null;
  deliveryDate: Date | null;
  updatedAt: Date;
  requiredDeliveryDate: Date | null;
}

function getErrMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function serializeStop(s: DbStopRow, reqLookup?: Map<string, ReqLookupRow>): LogisticsTripStopItem {
  const req = s.requisitionId && reqLookup ? reqLookup.get(s.requisitionId) : null;
  const photos = Array.isArray(s.podPhotoUrls)
    ? s.podPhotoUrls.map((v: unknown) => String(v)).filter(Boolean)
    : [];
  return {
    id: s.id,
    tripId: s.tripId,
    stopOrder: Number(s.stopOrder || 1),
    sourceType: (s.sourceType || 'JOB') as LogisticsStopSourceType,
    jobId: s.jobId ?? null,
    requisitionId: s.requisitionId ?? null,
    repairDeliveryId: s.repairDeliveryId ?? null,
    referenceNumber: s.referenceNumber ?? null,
    customerName: s.customerName,
    destination: s.destination ?? null,
    province: s.province ?? null,
    contactName: s.contactName ?? null,
    contactPhone: s.contactPhone ?? null,
    itemSummary: s.itemSummary ?? null,
    targetDate: s.targetDate ? new Date(s.targetDate).toISOString() : null,
    status: (s.status || 'PENDING') as LogisticsStopStatus,
    deliveryMethod: s.deliveryMethod || 'in-house',
    courierCompany: s.courierCompany ?? null,
    trackingNumber: s.trackingNumber ?? null,
    checkedInAt: s.checkedInAt ? new Date(s.checkedInAt).toISOString() : null,
    gpsLat: s.gpsLat !== null && s.gpsLat !== undefined ? Number(s.gpsLat) : null,
    gpsLng: s.gpsLng !== null && s.gpsLng !== undefined ? Number(s.gpsLng) : null,
    deliveredAt: s.deliveredAt ? new Date(s.deliveredAt).toISOString() : null,
    receiverName: s.receiverName ?? null,
    receiverSignatureUrl: s.receiverSignatureUrl ?? null,
    podPhotoUrls: photos,
    podNote: s.podNote ?? null,
    failReason: s.failReason ?? null,
    requisitionSignedTransport: req ? Boolean(req.transportSignatureUrl) : undefined,
    requisitionTransportName: req?.transportName ?? undefined,
    requisitionNumber: req?.requisitionNumber ?? undefined,
  };
}

function serializeTrip(t: DbTripWithStops, reqLookup?: Map<string, ReqLookupRow>): LogisticsTripRecord {
  const rawItems = Array.isArray(t.expenseItems) ? t.expenseItems : [];
  const expenseItems: LogisticsTripExpenseItem[] = rawItems.map((raw, idx) => {
    const it = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      id: String(it.id || `exp-${idx}`),
      category: (String(it.category || 'OTHER')) as LogisticsExpenseCategory,
      label: String(it.label || ''),
      amount: Number(it.amount || 0),
      receiptUrl: it.receiptUrl ? String(it.receiptUrl) : null,
    };
  });
  const expenseReceipts = Array.isArray(t.expenseReceipts)
    ? t.expenseReceipts.map((v: unknown) => String(v)).filter(Boolean)
    : [];

  return {
    id: t.id,
    tripNumber: t.tripNumber,
    tripDate: new Date(t.tripDate).toISOString(),
    departureTime: t.departureTime ?? null,
    status: (t.status || 'PLANNED') as LogisticsTripStatus,
    transportType: t.transportType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
    vehicleAssetId: t.vehicleAssetId ?? null,
    vehiclePlate: t.vehiclePlate ?? null,
    vehicleName: t.vehicleName ?? null,
    courierName: t.courierName ?? null,
    driverUserId: t.driverUserId ?? null,
    driverEmployeeId: t.driverEmployeeId ?? null,
    driverName: t.driverName,
    helperNames: t.helperNames ?? null,
    routeZone: t.routeZone ?? null,
    originBranch: t.originBranch ?? null,
    planNote: t.planNote ?? null,
    startMileage: t.startMileage ?? null,
    endMileage: t.endMileage ?? null,
    startedAt: t.startedAt ? new Date(t.startedAt).toISOString() : null,
    closedAt: t.closedAt ? new Date(t.closedAt).toISOString() : null,
    closedById: t.closedById ?? null,
    closedByName: t.closedByName ?? null,
    closeNote: t.closeNote ?? null,
    allowancePerDay: Number(t.allowancePerDay || 0),
    allowanceDays: Number(t.allowanceDays || 1),
    crewCount: Number(t.crewCount || 1),
    allowanceTotal: Number(t.allowanceTotal || 0),
    overnightNights: Number(t.overnightNights || 0),
    accommodationAmount: Number(t.accommodationAmount || 0),
    tollAmount: Number(t.tollAmount || 0),
    fuelAmount: Number(t.fuelAmount || 0),
    otherExpenseAmount: Number(t.otherExpenseAmount || 0),
    expenseItems,
    totalExpenseAmount: Number(t.totalExpenseAmount || 0),
    expenseReceipts,
    expenseApprovedStatus: t.expenseApprovedStatus || 'NONE',
    createdById: t.createdById,
    createdByName: t.createdByName,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
    stops: (t.stops || [])
      .map((s) => serializeStop(s, reqLookup))
      .sort((a, b) => a.stopOrder - b.stopOrder),
  };
}

function formatCompanyShippingAddress(c?: CompanyAddressSlice | null): { destination: string; province: string } {
  if (!c) return { destination: '', province: '' };
  const primary = (c.shippingAddress || c.address || '').trim();
  const sub = c.shippingSubDistrict || c.subDistrict || '';
  const dist = c.shippingDistrict || c.district || '';
  const prov = c.shippingProvince || c.province || '';
  const zip = c.shippingPostalCode || c.postalCode || '';
  const parts = [primary, sub, dist, prov, zip].map((p) => String(p || '').trim()).filter(Boolean);
  return {
    destination: parts.join(' '),
    province: String(prov || '').trim(),
  };
}

function summarizeReqItems(itemsJson: Prisma.JsonValue): string {
  if (!Array.isArray(itemsJson) || itemsJson.length === 0) return '';
  return itemsJson
    .slice(0, 4)
    .map((raw) => {
      const it = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const name = String(it.detail || it.name || '').trim();
      const qty = it.quantity !== undefined && it.quantity !== '' ? ` x${String(it.quantity)}` : '';
      const unit = it.unit ? ` ${String(it.unit)}` : '';
      return `${name}${qty}${unit}`.trim();
    })
    .filter(Boolean)
    .join(', ') + (itemsJson.length > 4 ? ` (+${itemsJson.length - 4} รายการ)` : '');
}

async function buildLogisticsGoldSummary(
  userId: string,
  fullName: string
): Promise<LogisticsGoldSummary> {
  const { month, yearCe } = getBangkokCurrentMonthYear();
  const { monthStart, monthEnd } = getBangkokMonthBounds(yearCe, month);

  const [allDeliveryLogs, allRepairDeliveries, myTripStopsCompleted] = await Promise.all([
    prisma.jobStepLog.findMany({
      where: {
        completedAt: { gte: monthStart, lt: monthEnd },
        step: { in: ['delivery', 'store_send', 'service_return', 'complete'] },
      },
      include: {
        job: {
          select: {
            id: true,
            trackingPhotoUrl: true,
            trackingNumber: true,
            deliveryDate: true,
            updatedAt: true,
            requiredDeliveryDate: true,
          },
        },
      },
    }),
    prisma.repairDelivery.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      select: {
        id: true,
        sigReceiverUrl: true,
        nameSender: true,
        sender: true,
      },
    }),
    prisma.logisticsTripStop.count({
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: monthStart, lt: monthEnd },
        trip: {
          OR: [
            { driverUserId: userId },
            ...(fullName ? [{ driverName: fullName }] : []),
          ],
        },
      },
    }),
  ]);

  const teamJobMap = new Map<string, JobDeliveryGoldSlice>();
  const myJobMap = new Map<string, JobDeliveryGoldSlice>();

  for (const log of allDeliveryLogs) {
    if (!log.job) continue;
    if (!teamJobMap.has(log.jobId)) {
      teamJobMap.set(log.jobId, log.job);
    }
    if (isSamePersonName(log.completedBy, fullName) && !myJobMap.has(log.jobId)) {
      myJobMap.set(log.jobId, log.job);
    }
  }

  let myValidJobDeliveries = 0;
  myJobMap.forEach((job) => {
    const hasProof =
      (job.trackingPhotoUrl && job.trackingPhotoUrl.trim() !== '') ||
      (job.trackingNumber && job.trackingNumber.trim() !== '');
    const actualDate = job.deliveryDate || job.updatedAt;
    const isOnTime = !job.requiredDeliveryDate || (actualDate && actualDate <= job.requiredDeliveryDate);
    if (hasProof && isOnTime) myValidJobDeliveries++;
  });

  const myValidRepairDeliveries = allRepairDeliveries.filter(
    (rd) =>
      Boolean(rd.sigReceiverUrl) &&
      (isSamePersonName(rd.nameSender, fullName) || isSamePersonName(rd.sender, fullName))
  ).length;

  const myTotalDeliveries = myValidJobDeliveries + myValidRepairDeliveries;

  let teamJobDeliveries = 0;
  let teamDelayedDeliveries = 0;
  teamJobMap.forEach((job) => {
    teamJobDeliveries++;
    const actualDate = job.deliveryDate || job.updatedAt;
    if (job.requiredDeliveryDate && actualDate && actualDate > job.requiredDeliveryDate) {
      teamDelayedDeliveries++;
    }
  });
  const teamTotalDeliveries = teamJobDeliveries + allRepairDeliveries.length;

  const tiers = evaluateLogisticsGoldTiers({
    myTotalDeliveries,
    teamTotalDeliveries,
    teamDelayedDeliveries,
  });

  return {
    month,
    yearCe,
    myValidJobDeliveries,
    myValidRepairDeliveries,
    myTotalDeliveries,
    myTripStopsCompleted,
    myGoldCurrent: tiers.myGoldCurrent,
    myGoldNextThreshold: tiers.myGoldNextThreshold,
    myGoldRemaining: tiers.myGoldRemaining,
    teamTotalDeliveries,
    teamDelayedDeliveries,
    teamSuccessfulDeliveries: tiers.teamSuccessfulDeliveries,
    teamDelayRatePct: tiers.teamDelayRatePct,
    managerSlaPassed: tiers.managerSlaPassed,
    managerGoldCurrent: tiers.managerGoldCurrent,
    managerGoldNextThreshold: tiers.managerGoldNextThreshold,
  };
}

export async function getPendingLogisticsCount(): Promise<number> {
  try {
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canAccess) return 0;

    const activeTripsPromise = prisma.logisticsTrip
      .count({
        where: {
          status: { in: ['PLANNED', 'LOADING', 'IN_TRANSIT'] },
          ...(permissions.canManageAllTrips
            ? {}
            : {
                OR: [
                  { driverUserId: user.id },
                  { driverName: user.fullName },
                ],
              }),
        },
      })
      .catch(() => 0);

    const deliveryJobsPromise = prisma.job.findMany({
      where: { currentStep: { in: ['delivery', 'service_return'] } },
      select: {
        id: true,
        currentStep: true,
        stepLogs: { select: { step: true } },
      },
      take: 150,
    });

    const pendingReqsPromise = prisma.materialRequisition.count({
      where: {
        status: { in: ['APPROVED', 'IN_PROGRESS', 'DISPENSED'] },
        receivedAt: null,
      },
    });

    const [activeTripsCount, deliveryJobs, pendingReqsCount] = await Promise.all([
      activeTripsPromise,
      deliveryJobsPromise,
      pendingReqsPromise,
    ]);

    const openDeliveryJobsCount = deliveryJobs.filter(
      (j) => !j.stepLogs.some((l) => l.step === j.currentStep)
    ).length;

    return activeTripsCount + openDeliveryJobsCount + pendingReqsCount;
  } catch (err) {
    console.warn('[getPendingLogisticsCount] warning:', err);
    return 0;
  }
}

export async function getLogisticsWorkspaceData(): Promise<LogisticsWorkspaceData | null> {
  await ensureLogisticsSchema();
  const { user, permissions } = await resolveLogisticsPermissions();
  if (!user || !permissions) return null;

  if (!permissions.canAccess) {
    return {
      permissions,
      vehicles: [],
      crewMembers: [],
      branches: [],
      queueItems: [],
      trips: [],
      goldSummary: {
        ...getBangkokCurrentMonthYear(),
        myValidJobDeliveries: 0,
        myValidRepairDeliveries: 0,
        myTotalDeliveries: 0,
        myTripStopsCompleted: 0,
        myGoldCurrent: 0,
        myGoldNextThreshold: 50,
        myGoldRemaining: 50,
        teamTotalDeliveries: 0,
        teamDelayedDeliveries: 0,
        teamSuccessfulDeliveries: 0,
        teamDelayRatePct: 0,
        managerSlaPassed: true,
        managerGoldCurrent: 0,
        managerGoldNextThreshold: 100,
      },
    };
  }

  const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

  const [
    rawAssets,
    allUsers,
    hrEmployees,
    rawTrips,
  ] = await Promise.all([
    prisma.assets.findMany({
      where: {
        OR: [
          { category: 'Car' },
          { vehicle_model: { not: null } },
          { vehicle_type: { not: null } },
        ],
      },
      orderBy: [{ status: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        asset_id: true,
        name: true,
        vehicle_model: true,
        vehicle_type: true,
        company_owner: true,
        main_user: true,
        status: true,
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        role: true,
        position: true,
        employeeSale: { select: { nickname: true, department: true } },
      },
    }),
    getHrEmployeesCached(),
    prisma.logisticsTrip.findMany({
      where: {
        OR: [
          { status: { in: ['PLANNED', 'LOADING', 'IN_TRANSIT'] } },
          { tripDate: { gte: fortyFiveDaysAgo } },
        ],
      },
      include: {
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
      orderBy: [{ tripDate: 'desc' }, { createdAt: 'desc' }],
      take: 180,
    }),
  ]);

  const [
    candidateJobs,
    candidateReqs,
    candidateRds,
    rawBranches,
    goldSummary,
  ] = await Promise.all([
    prisma.job.findMany({
      where: {
        currentStep: {
          in: [
            'delivery',
            'service_return',
            'accounting',
            'store',
            'production',
            'service',
            'service_qc',
            'project',
          ],
        },
      },
      orderBy: [{ requiredDeliveryDate: 'asc' }, { updatedAt: 'desc' }],
      take: 150,
      select: {
        id: true,
        jobNumber: true,
        companyCode: true,
        jobType: true,
        flowVariant: true,
        currentStep: true,
        customerName: true,
        item: true,
        requiredDeliveryDate: true,
        deliveryDate: true,
        deliveryMethod: true,
        stepLogs: { select: { step: true } },
        quotation: {
          select: {
            company: {
              select: {
                address: true,
                province: true,
                district: true,
                subDistrict: true,
                postalCode: true,
                shippingAddress: true,
                shippingSubDistrict: true,
                shippingDistrict: true,
                shippingProvince: true,
                shippingPostalCode: true,
              },
            },
            contact: {
              select: {
                contactName: true,
                mobilePhone: true,
              },
            },
          },
        },
      },
    }),
    prisma.materialRequisition.findMany({
      where: {
        status: { in: ['APPROVED', 'IN_PROGRESS', 'DISPENSED'] },
        receivedAt: null,
      },
      orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        requisitionNumber: true,
        company: true,
        items: true,
        projectName: true,
        branch: true,
        destinationSite: true,
        deliveryDate: true,
        transportSignatureUrl: true,
        transportName: true,
        requester: { select: { fullName: true, phoneNumber: true } },
      },
    }),
    prisma.repairDelivery.findMany({
      where: {
        sigReceiverUrl: null,
        status: { not: 'Cancelled' },
      },
      orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'desc' }],
      take: 80,
      select: {
        id: true,
        deliveryNumber: true,
        company: true,
        customer: true,
        address: true,
        siteAddress: true,
        jobName: true,
        deliveryDate: true,
        internalCompany: true,
        senderPhone: true,
        technicianPhone: true,
      },
    }),
    prisma.branches
      .findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true },
      })
      .catch(() => []),
    buildLogisticsGoldSummary(user.id, user.fullName),
  ]);

  const hrByEmpId = new Map(hrEmployees.map((h) => [h.emp_id.toUpperCase(), h]));
  const matchedEmpIds = new Set<string>();

  const crewMembers: LogisticsCrewMember[] = allUsers.map((u) => {
    const empKey = (u.employeeId || '').toUpperCase();
    if (empKey) matchedEmpIds.add(empKey);
    const hr = empKey ? hrByEmpId.get(empKey) : undefined;
    const hay = `${u.role || ''} ${u.position || ''} ${u.employeeSale?.department || ''} ${hr?.departments?.name || ''} ${hr?.job_positions?.title || ''}`.toLowerCase();
    const isTransport =
      isTransportStaff(u.role) ||
      isStoreRole(u.role) ||
      ['ขนส่ง', 'จัดส่ง', 'ขับรถ', 'คลังสินค้า', 'logistic', 'transport', 'shipping'].some((k) =>
        hay.includes(k)
      );
    return {
      userId: u.id,
      employeeId: u.employeeId,
      fullName: u.fullName,
      nickname: u.employeeSale?.nickname || hr?.nickname || null,
      role: u.role,
      position: u.position || hr?.job_positions?.title || hr?.departments?.name || null,
      isManager: isLogisticsManager(u.role),
      isTransportTeam: isTransport,
    };
  });

  // Include active HR employees who may not have logged in / synced to User table yet
  for (const h of hrEmployees) {
    const empKey = h.emp_id.toUpperCase();
    if (matchedEmpIds.has(empKey)) continue;
    if (crewMembers.some((c) => isSamePersonName(c.fullName, h.name))) continue;
    const deptPos = `${h.departments?.name || ''} ${h.job_positions?.title || ''}`.toLowerCase();
    const isTransport = ['ขนส่ง', 'จัดส่ง', 'ขับรถ', 'คลังสินค้า', 'logistic', 'transport', 'shipping'].some((k) =>
      deptPos.includes(k)
    );
    crewMembers.push({
      userId: `hr:${h.emp_id}`,
      employeeId: h.emp_id,
      fullName: h.name,
      nickname: h.nickname || null,
      role: h.departments?.name || 'พนักงาน',
      position: h.job_positions?.title || h.departments?.name || null,
      isManager: ['ผู้จัดการ', 'หัวหน้า', 'manager', 'mgr'].some((k) => deptPos.includes(k)),
      isTransportTeam: isTransport,
    });
  }

  // Merge custom driver / helper names from historical trips so newly added people remain searchable
  const pushCustomCrewName = (rawEntry: string) => {
    const cleaned = (rawEntry || '').trim();
    if (!cleaned) return;
    const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const fullName = parenMatch ? parenMatch[1].trim() : cleaned;
    const nickname = parenMatch ? parenMatch[2].trim() : null;
    if (!fullName) return;
    if (
      crewMembers.some(
        (c) =>
          isSamePersonName(c.fullName, fullName) ||
          (nickname && c.nickname && c.nickname.toLowerCase() === nickname.toLowerCase() && isSamePersonName(c.fullName, fullName))
      )
    ) {
      return;
    }
    crewMembers.push({
      userId: `custom:${fullName}`,
      employeeId: '',
      fullName,
      nickname,
      role: 'รายชื่อเพิ่มเติม',
      position: null,
      isManager: false,
      isTransportTeam: true,
      isCustom: true,
    });
  };

  for (const t of rawTrips) {
    if (t.transportType !== 'EXTERNAL' && t.driverName) pushCustomCrewName(t.driverName);
    if (t.helperNames) {
      for (const hPart of t.helperNames.split(/[,/]+/)) {
        pushCustomCrewName(hPart);
      }
    }
  }

  crewMembers.sort((a, b) => {
    const aTrans = a.isTransportTeam ? 0 : 1;
    const bTrans = b.isTransportTeam ? 0 : 1;
    if (aTrans !== bTrans) return aTrans - bTrans;
    const aCust = a.isCustom ? 1 : 0;
    const bCust = b.isCustom ? 1 : 0;
    if (aCust !== bCust) return aCust - bCust;
    if (a.isManager !== b.isManager) return a.isManager ? 1 : -1;
    return a.fullName.localeCompare(b.fullName, 'th');
  });

  // Track which queue sources are already on an active (non-completed/cancelled) trip
  const activeJobStopMap = new Map<string, { tripId: string; tripNumber: string }>();
  const activeReqStopMap = new Map<string, { tripId: string; tripNumber: string }>();
  const activeRdStopMap = new Map<string, { tripId: string; tripNumber: string }>();

  const reqIdsInTrips = new Set<string>();
  for (const t of rawTrips) {
    const isActiveTrip = ['PLANNED', 'LOADING', 'IN_TRANSIT'].includes(t.status);
    for (const st of t.stops) {
      if (st.requisitionId) reqIdsInTrips.add(st.requisitionId);
      if (isActiveTrip && st.status !== 'FAILED' && st.status !== 'RESCHEDULED') {
        if (st.jobId) activeJobStopMap.set(st.jobId, { tripId: t.id, tripNumber: t.tripNumber });
        if (st.requisitionId) activeReqStopMap.set(st.requisitionId, { tripId: t.id, tripNumber: t.tripNumber });
        if (st.repairDeliveryId) activeRdStopMap.set(st.repairDeliveryId, { tripId: t.id, tripNumber: t.tripNumber });
      }
    }
  }

  const tripReqs =
    reqIdsInTrips.size > 0
      ? await prisma.materialRequisition.findMany({
          where: { id: { in: Array.from(reqIdsInTrips) } },
          select: {
            id: true,
            requisitionNumber: true,
            transportSignatureUrl: true,
            transportName: true,
          },
        })
      : [];
  const reqLookup = new Map(tripReqs.map((r) => [r.id, r]));

  const now = new Date();
  const queueItems: LogisticsQueueItem[] = [];

  for (const j of candidateJobs) {
    const steps = getSteps(j.jobType, j.flowVariant);
    const hasCompletedLastStep =
      j.currentStep === steps[steps.length - 1]?.key &&
      j.stepLogs.some((l) => l.step === j.currentStep);
    if (hasCompletedLastStep) continue;

    const hasDeliveryAhead = steps.some((s) => s.key === 'delivery' || s.key === 'service_return');
    const isAtDeliveryStep = j.currentStep === 'delivery' || j.currentStep === 'service_return';
    if (!isAtDeliveryStep && !hasDeliveryAhead) continue;

    const targetDt = j.requiredDeliveryDate || j.deliveryDate;
    const addr = formatCompanyShippingAddress(j.quotation?.company);
    const activeTrip = activeJobStopMap.get(j.id);

    queueItems.push({
      queueKey: `JOB:${j.id}`,
      sourceType: 'JOB',
      sourceId: j.id,
      referenceNumber: j.jobNumber,
      customerName: j.customerName,
      destination: addr.destination,
      province: addr.province,
      contactName: j.quotation?.contact?.contactName || '',
      contactPhone: j.quotation?.contact?.mobilePhone || '',
      itemSummary: j.item || j.jobType,
      targetDate: targetDt ? new Date(targetDt).toISOString() : null,
      isReadyNow: isAtDeliveryStep,
      readinessLabel: isAtDeliveryStep ? 'พร้อมจัดส่งทันที' : `เตรียมของ (${j.currentStep})`,
      requiresPickupSign: false,
      isPickupSigned: false,
      deliveryMethodHint: j.deliveryMethod === 'courier' ? 'courier' : 'in-house',
      companyCode: j.companyCode,
      isOverdue: Boolean(targetDt && new Date(targetDt) < now),
      activeTripId: activeTrip?.tripId ?? null,
      activeTripNumber: activeTrip?.tripNumber ?? null,
    });
  }

  for (const r of candidateReqs) {
    const activeTrip = activeReqStopMap.get(r.id);
    const signedTransport = Boolean(r.transportSignatureUrl);
    queueItems.push({
      queueKey: `REQUISITION:${r.id}`,
      sourceType: 'REQUISITION',
      sourceId: r.id,
      referenceNumber: r.requisitionNumber,
      customerName: r.projectName || `ใบเบิก (${r.company})`,
      destination: r.destinationSite || r.projectName || r.branch || '',
      province: '',
      contactName: r.requester?.fullName || '',
      contactPhone: r.requester?.phoneNumber || '',
      itemSummary: summarizeReqItems(r.items) || 'รายการวัสดุ/อุปกรณ์ตามใบเบิก',
      targetDate: r.deliveryDate ? new Date(r.deliveryDate).toISOString() : null,
      isReadyNow: true,
      readinessLabel: signedTransport ? 'ขนส่งรับของแล้ว · รอส่งหน้างาน' : 'รอขนส่งเซ็นรับออกจากสโตร์',
      requiresPickupSign: !signedTransport,
      isPickupSigned: signedTransport,
      deliveryMethodHint: 'in-house',
      companyCode: r.company,
      isOverdue: Boolean(r.deliveryDate && new Date(r.deliveryDate) < now),
      activeTripId: activeTrip?.tripId ?? null,
      activeTripNumber: activeTrip?.tripNumber ?? null,
    });
  }

  for (const rd of candidateRds) {
    const activeTrip = activeRdStopMap.get(rd.id);
    queueItems.push({
      queueKey: `REPAIR_DELIVERY:${rd.id}`,
      sourceType: 'REPAIR_DELIVERY',
      sourceId: rd.id,
      referenceNumber: rd.deliveryNumber,
      customerName: rd.company || rd.customer || rd.jobName || rd.deliveryNumber,
      destination: rd.siteAddress || rd.address || '',
      province: '',
      contactName: rd.customer || '',
      contactPhone: rd.senderPhone || rd.technicianPhone || '',
      itemSummary: rd.jobName || 'ส่งมอบงานซ่อม/สินค้า',
      targetDate: rd.deliveryDate ? new Date(rd.deliveryDate).toISOString() : null,
      isReadyNow: true,
      readinessLabel: 'รอส่งมอบและเซ็นรับ (DN)',
      requiresPickupSign: false,
      isPickupSigned: false,
      deliveryMethodHint: 'in-house',
      companyCode: rd.internalCompany || 'TE',
      isOverdue: Boolean(rd.deliveryDate && new Date(rd.deliveryDate) < now),
      activeTripId: activeTrip?.tripId ?? null,
      activeTripNumber: activeTrip?.tripNumber ?? null,
    });
  }

  // Sort queue: ready items first, unassigned first, overdue/earliest deadline first
  queueItems.sort((a, b) => {
    if (a.isReadyNow !== b.isReadyNow) return a.isReadyNow ? -1 : 1;
    const aAssigned = Boolean(a.activeTripId);
    const bAssigned = Boolean(b.activeTripId);
    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const aTime = a.targetDate ? new Date(a.targetDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.targetDate ? new Date(b.targetDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const vehiclePriority = (vType?: string | null) => {
    const t = (vType || '').toLowerCase();
    if (t.includes('เฮี้ยบ')) return 0;
    if (t.includes('กระบะ') || t.includes('ตู้ทึบ')) return 1;
    if (t.includes('รถตู้')) return 2;
    return 3;
  };

  const findNicknameForPerson = (rawName?: string | null): string | null => {
    const clean = (rawName || '').trim();
    if (!clean) return null;
    const match = crewMembers.find(
      (c) =>
        isSamePersonName(c.fullName, clean) ||
        clean.toLowerCase().includes(c.fullName.toLowerCase()) ||
        (c.nickname && clean.toLowerCase() === c.nickname.toLowerCase())
    );
    if (match?.nickname) return match.nickname;
    const paren = clean.match(/\(([^)]+)\)/);
    return paren ? paren[1].trim() : null;
  };

  const vehicles: LogisticsVehicleOption[] = rawAssets
    .map((a) => ({
      id: a.id,
      assetId: String(a.asset_id || '').trim(),
      name: a.name,
      vehicleModel: a.vehicle_model ?? null,
      vehicleType: a.vehicle_type ?? null,
      companyOwner: a.company_owner ?? null,
      mainUser: a.main_user ?? null,
      mainUserNickname: findNicknameForPerson(a.main_user),
      status: a.status,
    }))
    .sort((a, b) => {
      const aAvail = a.status === 'available' ? 0 : a.status === 'borrowed' ? 1 : 2;
      const bAvail = b.status === 'available' ? 0 : b.status === 'borrowed' ? 1 : 2;
      if (aAvail !== bAvail) return aAvail - bAvail;
      return vehiclePriority(a.vehicleType) - vehiclePriority(b.vehicleType);
    });

  const branchMap = new Map<string, LogisticsBranchOption>();
  const seedBranches =
    rawBranches.length > 0
      ? rawBranches.map((b) => ({
          code: b.id,
          name: b.name,
          aliases: LOGISTICS_BRANCH_ALIASES[b.id] || [],
        }))
      : DEFAULT_LOGISTICS_BRANCHES;

  for (const b of seedBranches) {
    branchMap.set(b.code.toUpperCase(), b);
  }
  for (const def of DEFAULT_LOGISTICS_BRANCHES) {
    if (!branchMap.has(def.code.toUpperCase())) {
      branchMap.set(def.code.toUpperCase(), def);
    }
  }
  for (const t of rawTrips) {
    const ob = (t.originBranch || '').trim();
    if (!ob) continue;
    const obLower = ob.toLowerCase();
    const exists = Array.from(branchMap.values()).some(
      (b) =>
        b.code.toLowerCase() === obLower ||
        b.name.toLowerCase() === obLower ||
        (b.aliases || []).some((a) => a.toLowerCase() === obLower)
    );
    if (!exists) {
      branchMap.set(ob.toUpperCase(), { code: ob, name: ob, aliases: [], isCustom: true });
    }
  }
  const branches = Array.from(branchMap.values());

  const trips = rawTrips.map((t) => serializeTrip(t, reqLookup));

  return {
    permissions,
    vehicles,
    crewMembers,
    branches,
    queueItems,
    trips,
    goldSummary,
  };
}

export async function quickCreateLogisticsVehicle(input: {
  plate: string;
  name?: string;
  vehicleType?: string;
  vehicleModel?: string;
  mainUser?: string;
}): Promise<{
  success: boolean;
  vehicle?: LogisticsVehicleOption;
  error?: string;
}> {
  try {
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เพิ่มรถเข้าทะเบียนกลาง' };
    }

    const plate = (input.plate || '').trim();
    if (!plate) {
      return { success: false, error: 'กรุณาระบุทะเบียนรถ' };
    }

    const existing = await prisma.assets.findFirst({
      where: { asset_id: { equals: plate, mode: 'insensitive' } },
      select: {
        id: true,
        asset_id: true,
        name: true,
        vehicle_model: true,
        vehicle_type: true,
        company_owner: true,
        main_user: true,
        status: true,
      },
    });

    if (existing) {
      return {
        success: true,
        vehicle: {
          id: existing.id,
          assetId: existing.asset_id,
          name: existing.name,
          vehicleModel: existing.vehicle_model ?? null,
          vehicleType: existing.vehicle_type ?? null,
          companyOwner: existing.company_owner ?? null,
          mainUser: existing.main_user ?? null,
          status: existing.status,
        },
      };
    }

    const cleanName = (input.name || '').trim() || `รถขนส่ง (${plate})`;
    const created = await prisma.assets.create({
      data: {
        asset_id: plate,
        name: cleanName,
        category: 'Car',
        vehicle_type: (input.vehicleType || '').trim() || 'รถขนส่ง',
        vehicle_model: (input.vehicleModel || '').trim() || null,
        main_user: (input.mainUser || '').trim() || null,
        status: 'available',
        stock: 1,
      },
      select: {
        id: true,
        asset_id: true,
        name: true,
        vehicle_model: true,
        vehicle_type: true,
        company_owner: true,
        main_user: true,
        status: true,
      },
    });

    revalidatePath('/logistics');

    return {
      success: true,
      vehicle: {
        id: created.id,
        assetId: created.asset_id,
        name: created.name,
        vehicleModel: created.vehicle_model ?? null,
        vehicleType: created.vehicle_type ?? null,
        companyOwner: created.company_owner ?? null,
        mainUser: created.main_user ?? null,
        status: created.status,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: getErrMessage(err, 'เพิ่มทะเบียนรถใหม่ไม่สำเร็จ'),
    };
  }
}

export async function getLogisticsTripById(tripId: string): Promise<{
  permissions: LogisticsPermissions | null;
  trip: LogisticsTripRecord | null;
}> {
  await ensureLogisticsSchema();
  const { user, permissions } = await resolveLogisticsPermissions();
  if (!user || !permissions || !permissions.canAccess) {
    return { permissions, trip: null };
  }

  const rawTrip = await prisma.logisticsTrip.findUnique({
    where: { id: tripId },
    include: { stops: { orderBy: { stopOrder: 'asc' } } },
  });
  if (!rawTrip) return { permissions, trip: null };

  const reqIds = rawTrip.stops
    .map((s) => s.requisitionId)
    .filter((id): id is string => Boolean(id));
  const reqRows =
    reqIds.length > 0
      ? await prisma.materialRequisition.findMany({
          where: { id: { in: reqIds } },
          select: {
            id: true,
            requisitionNumber: true,
            transportSignatureUrl: true,
            transportName: true,
          },
        })
      : [];
  const reqLookup = new Map(reqRows.map((r) => [r.id, r]));

  return { permissions, trip: serializeTrip(rawTrip, reqLookup) };
}

export interface CreateLogisticsTripStopInput {
  sourceType: LogisticsStopSourceType;
  jobId?: string | null;
  requisitionId?: string | null;
  repairDeliveryId?: string | null;
  referenceNumber?: string | null;
  customerName: string;
  destination?: string | null;
  province?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  itemSummary?: string | null;
  targetDate?: string | null;
  deliveryMethod?: string | null;
}

export interface CreateLogisticsTripInput {
  tripDate: string;
  departureTime?: string;
  transportType: 'INTERNAL' | 'EXTERNAL';
  vehicleAssetId?: number | null;
  vehiclePlate?: string;
  vehicleName?: string;
  courierName?: string;
  driverUserId?: string | null;
  driverEmployeeId?: string | null;
  driverName?: string;
  helperNames?: string;
  routeZone?: string;
  originBranch?: string;
  planNote?: string;
  startMileage?: number | null;
  stops: CreateLogisticsTripStopInput[];
}

interface LinkedJobSyncRef {
  sourceType: string;
  jobId: string | null;
  repairDeliveryId: string | null;
}

async function resolveLinkedJobIdsForStops(
  tx: Prisma.TransactionClient,
  stops: LinkedJobSyncRef[]
): Promise<{ jobIds: string[]; repairDeliveryIds: string[] }> {
  const jobIdSet = new Set<string>();
  const rdIdSet = new Set<string>();

  for (const st of stops) {
    if (st.jobId) jobIdSet.add(st.jobId);
    if (st.repairDeliveryId) rdIdSet.add(st.repairDeliveryId);
  }

  const repairDeliveryIds = Array.from(rdIdSet);
  if (repairDeliveryIds.length > 0) {
    const rds = await tx.repairDelivery.findMany({
      where: { id: { in: repairDeliveryIds } },
      select: { id: true, jobId: true },
    });
    for (const rd of rds) {
      if (rd.jobId) jobIdSet.add(rd.jobId);
    }
  }

  return { jobIds: Array.from(jobIdSet), repairDeliveryIds };
}

async function syncScheduledTripToLinkedJobs(
  tx: Prisma.TransactionClient,
  stops: LinkedJobSyncRef[],
  opts: {
    scheduledAt: Date;
    deliveryMethod: 'in-house' | 'courier';
    courierCompany?: string | null;
  }
): Promise<void> {
  const { jobIds, repairDeliveryIds } = await resolveLinkedJobIdsForStops(tx, stops);

  if (repairDeliveryIds.length > 0) {
    await tx.repairDelivery.updateMany({
      where: {
        id: { in: repairDeliveryIds },
        status: { not: 'Completed' },
      },
      data: {
        deliveryDate: opts.scheduledAt,
      },
    });
  }

  if (jobIds.length === 0) return;

  const jobs = await tx.job.findMany({
    where: { id: { in: jobIds } },
    select: {
      id: true,
      courierCompany: true,
      stepLogs: { select: { step: true } },
    },
  });

  const cleanCourier = (opts.courierCompany || '').trim();
  for (const job of jobs) {
    const alreadyDeliveredLog = job.stepLogs.some(
      (l) => l.step === 'delivery' || l.step === 'service_return'
    );
    if (alreadyDeliveredLog) continue;

    await tx.job.update({
      where: { id: job.id },
      data: {
        deliveryDate: opts.scheduledAt,
        deliveryMethod: opts.deliveryMethod,
        ...(opts.deliveryMethod === 'courier' && cleanCourier
          ? { courierCompany: cleanCourier }
          : {}),
      },
    });
  }
}

export async function createLogisticsTrip(input: CreateLogisticsTripInput): Promise<{
  success: boolean;
  trip?: LogisticsTripRecord;
  error?: string;
}> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'คุณไม่มีสิทธิ์จัดคิวรถ/สร้างทริปขนส่ง' };
    }

    const isExternal = input.transportType === 'EXTERNAL';
    const cleanCourierName = (input.courierName || '').trim();
    const cleanDriverName = (input.driverName || '').trim();

    if (isExternal && !cleanCourierName) {
      return { success: false, error: 'กรุณาระบุชื่อบริษัทขนส่งนอก / รถร่วม' };
    }
    if (!isExternal && !cleanDriverName) {
      return { success: false, error: 'กรุณาระบุชื่อพนักงานขับรถหลัก' };
    }

    if (!input.stops || input.stops.length === 0) {
      return { success: false, error: 'กรุณาเลือกจุดส่งสินค้าอย่างน้อย 1 จุด' };
    }

    const tripDate = new Date(input.tripDate);
    if (Number.isNaN(tripDate.getTime())) {
      return { success: false, error: 'วันที่วิ่งรถไม่ถูกต้อง' };
    }

    const parsedDepTime = parseLogisticsTime24(input.departureTime);
    if (!parsedDepTime.ok) {
      return { success: false, error: parsedDepTime.error };
    }
    const normalizedDepartureTime = parsedDepTime.dot24;
    const scheduledDeliveryAt = combineBangkokDateAndTime(tripDate, normalizedDepartureTime);

    const beParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(tripDate);
    const yearCe = Number(beParts.find((p) => p.type === 'year')?.value || new Date().getFullYear());
    const monthNum = Number(beParts.find((p) => p.type === 'month')?.value || new Date().getMonth() + 1);
    const beShort = String(yearCe + 543).slice(-2);
    const mm = String(monthNum).padStart(2, '0');
    const prefix = `TRP${beShort}-${mm}`;

    const vehicleAssetId = isExternal ? null : input.vehicleAssetId ?? null;
    let vehiclePlate = (input.vehiclePlate || '').trim() || null;
    let vehicleName = (input.vehicleName || '').trim() || null;

    if (!isExternal && vehicleAssetId) {
      const asset = await prisma.assets.findUnique({
        where: { id: vehicleAssetId },
        select: { id: true, asset_id: true, name: true, vehicle_type: true },
      });
      if (asset) {
        vehiclePlate = String(asset.asset_id || '').trim() || vehiclePlate;
        vehicleName = `${asset.name}${asset.vehicle_type ? ` (${asset.vehicle_type})` : ''}`;
      }
    }

    const [lock1, lock2] = stringToAdvisoryLockIds(`logistics-trip:${prefix}`);

    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lock1}::int, ${lock2}::int)`;

      const existing = await tx.logisticsTrip.findMany({
        where: { tripNumber: { startsWith: prefix } },
        select: { tripNumber: true },
      });
      let maxSeq = 0;
      for (const row of existing) {
        const suffix = row.tripNumber.slice(prefix.length);
        const parsed = parseInt(suffix, 10);
        if (!Number.isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
      }
      const tripNumber = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;

      const helperText = isExternal ? '' : (input.helperNames || '').trim();
      const autoCrewCount = isExternal
        ? 0
        : helperText
        ? 1 + helperText.split(/[,/]+/).map((s) => s.trim()).filter(Boolean).length
        : 1;

      const cleanDriverUserId =
        !isExternal &&
        input.driverUserId &&
        !input.driverUserId.startsWith('hr:') &&
        !input.driverUserId.startsWith('custom:')
          ? input.driverUserId
          : null;

      const tripCreated = await tx.logisticsTrip.create({
        data: {
          tripNumber,
          tripDate,
          departureTime: normalizedDepartureTime,
          status: 'PLANNED',
          transportType: isExternal ? 'EXTERNAL' : 'INTERNAL',
          vehicleAssetId,
          vehiclePlate,
          vehicleName,
          courierName: cleanCourierName || null,
          driverUserId: cleanDriverUserId,
          driverEmployeeId: isExternal ? null : input.driverEmployeeId || null,
          driverName: isExternal ? cleanDriverName : cleanDriverName,
          helperNames: helperText || null,
          routeZone: (input.routeZone || '').trim() || null,
          originBranch: (input.originBranch || '').trim() || 'BKK-HQ',
          planNote: (input.planNote || '').trim() || null,
          startMileage:
            !isExternal && input.startMileage !== undefined && input.startMileage !== null
              ? Number(input.startMileage)
              : null,
          crewCount: autoCrewCount,
          allowanceDays: 1,
          allowancePerDay: 200,
          createdById: user.id,
          createdByName: user.fullName,
          stops: {
            create: input.stops.map((st, idx) => ({
              stopOrder: idx + 1,
              sourceType: st.sourceType,
              jobId: st.jobId || null,
              requisitionId: st.requisitionId || null,
              repairDeliveryId: st.repairDeliveryId || null,
              referenceNumber: (st.referenceNumber || '').trim() || null,
              customerName: (st.customerName || '').trim() || 'ลูกค้า/หน้างาน',
              destination: (st.destination || '').trim() || null,
              province: (st.province || '').trim() || null,
              contactName: (st.contactName || '').trim() || null,
              contactPhone: (st.contactPhone || '').trim() || null,
              itemSummary: (st.itemSummary || '').trim() || null,
              targetDate: st.targetDate ? new Date(st.targetDate) : null,
              deliveryMethod:
                input.transportType === 'EXTERNAL' ? 'courier' : st.deliveryMethod || 'in-house',
            })),
          },
        },
        include: {
          stops: { orderBy: { stopOrder: 'asc' } },
        },
      });

      await syncScheduledTripToLinkedJobs(tx, tripCreated.stops, {
        scheduledAt: scheduledDeliveryAt,
        deliveryMethod: tripCreated.transportType === 'EXTERNAL' ? 'courier' : 'in-house',
        courierCompany: tripCreated.courierName,
      });

      return tripCreated;
    });

    if (created.driverUserId && created.driverUserId !== user.id) {
      sendPushToUser(created.driverUserId, {
        title: `จัดทริปวิ่งรถใหม่ (${created.tripNumber})`,
        body: `${created.vehiclePlate ? `รถ ${created.vehiclePlate} · ` : ''}${created.stops.length} จุดส่ง${created.routeZone ? ` (${created.routeZone})` : ''}`,
        url: `/logistics/trips/${created.id}`,
        category: 'LOGISTICS_TRIP',
      }).catch(console.warn);
    }

    revalidatePath('/logistics');
    revalidatePath('/jobs');
    revalidatePath('/repair-deliveries');
    return { success: true, trip: serializeTrip(created) };
  } catch (err: unknown) {
    console.error('[createLogisticsTrip] error:', err);
    return { success: false, error: getErrMessage(err, 'ไม่สามารถสร้างทริปวิ่งรถได้') };
  }
}

export async function updateLogisticsTripSchedule(
  tripId: string,
  payload: { tripDate: string; departureTime?: string | null }
): Promise<{ success: boolean; trip?: LogisticsTripRecord; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์แก้ไขกำหนดการทริป' };
    }

    const existing = await prisma.logisticsTrip.findUnique({
      where: { id: tripId },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });
    if (!existing) return { success: false, error: 'ไม่พบข้อมูลทริป' };
    if (!(await canModifyTrip(existing, user, permissions))) {
      return { success: false, error: 'แก้ไขได้เฉพาะคนขับผู้รับผิดชอบหรือหัวหน้าขนส่ง' };
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return { success: false, error: 'ไม่สามารถแก้ไขวัน/เวลาของทริปที่ปิดหรือยกเลิกแล้ว' };
    }

    const slashIso = parseSlashDateToIso(payload.tripDate);
    const nextTripDate = slashIso
      ? new Date(`${slashIso}T08:00:00.000+07:00`)
      : new Date(payload.tripDate);
    if (Number.isNaN(nextTripDate.getTime())) {
      return { success: false, error: 'รูปแบบวันที่ไม่ถูกต้อง (ระบุเป็น วัน/เดือน/ปี)' };
    }

    const parsedDepTime = parseLogisticsTime24(payload.departureTime);
    if (!parsedDepTime.ok) {
      return { success: false, error: parsedDepTime.error };
    }

    const normalizedDepartureTime = parsedDepTime.dot24;
    const scheduledDeliveryAt = combineBangkokDateAndTime(nextTripDate, normalizedDepartureTime);

    const updated = await prisma.$transaction(async (tx) => {
      const tripUpdated = await tx.logisticsTrip.update({
        where: { id: tripId },
        data: {
          tripDate: nextTripDate,
          departureTime: normalizedDepartureTime,
        },
        include: { stops: { orderBy: { stopOrder: 'asc' } } },
      });

      const pendingStops = tripUpdated.stops.filter(
        (s) => !['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(s.status)
      );
      await syncScheduledTripToLinkedJobs(tx, pendingStops, {
        scheduledAt: scheduledDeliveryAt,
        deliveryMethod: tripUpdated.transportType === 'EXTERNAL' ? 'courier' : 'in-house',
        courierCompany: tripUpdated.courierName,
      });

      return tripUpdated;
    });

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${tripId}`);
    revalidatePath('/jobs');
    revalidatePath('/repair-deliveries');
    return { success: true, trip: serializeTrip(updated) };
  } catch (err: unknown) {
    console.error('[updateLogisticsTripSchedule] error:', err);
    return { success: false, error: getErrMessage(err, 'อัปเดตวัน/เวลาทริปไม่สำเร็จ') };
  }
}

async function canModifyTrip(
  trip: {
    transportType?: string;
    driverUserId: string | null;
    driverName: string;
    createdById: string;
  },
  user: { id: string; fullName: string },
  permissions: LogisticsPermissions
): Promise<boolean> {
  if (permissions.canManageAllTrips) return true;
  if (
    trip.transportType === 'EXTERNAL' &&
    !trip.driverUserId &&
    !trip.driverName &&
    permissions.canPlanTrips
  ) {
    return true;
  }
  if (trip.driverUserId && trip.driverUserId === user.id) return true;
  if (trip.createdById === user.id) return true;
  if (trip.driverName && isSamePersonName(trip.driverName, user.fullName)) return true;
  return false;
}

export async function updateLogisticsTripState(
  tripId: string,
  action: 'START_LOADING' | 'START_TRANSIT' | 'CANCEL',
  extra?: { startMileage?: number | null; note?: string }
): Promise<{ success: boolean; trip?: LogisticsTripRecord; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์แก้ไขทริปนี้' };
    }

    const existing = await prisma.logisticsTrip.findUnique({
      where: { id: tripId },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });
    if (!existing) return { success: false, error: 'ไม่พบข้อมูลทริป' };

    if (!(await canModifyTrip(existing, user, permissions))) {
      return { success: false, error: 'แก้ไขได้เฉพาะคนขับผู้รับผิดชอบหรือหัวหน้าขนส่ง' };
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return { success: false, error: 'ทริปนี้ปิดหรือยกเลิกไปแล้ว' };
    }

    const nextStatus: LogisticsTripStatus =
      action === 'START_LOADING'
        ? 'LOADING'
        : action === 'START_TRANSIT'
        ? 'IN_TRANSIT'
        : 'CANCELLED';

    const updated = await prisma.$transaction(async (tx) => {
      const tripUpdated = await tx.logisticsTrip.update({
        where: { id: tripId },
        data: {
          status: nextStatus,
          ...(action === 'START_TRANSIT' && !existing.startedAt ? { startedAt: new Date() } : {}),
          ...(extra?.startMileage !== undefined && extra.startMileage !== null
            ? { startMileage: Number(extra.startMileage) }
            : {}),
          ...(action === 'CANCEL' && extra?.note ? { closeNote: extra.note.trim() } : {}),
        },
        include: { stops: { orderBy: { stopOrder: 'asc' } } },
      });

      if (action === 'CANCEL') {
        const undeliveredStops = existing.stops.filter((s) => s.status !== 'DELIVERED');
        const { jobIds } = await resolveLinkedJobIdsForStops(tx, undeliveredStops);
        if (jobIds.length > 0) {
          const cancelledScheduledAt = combineBangkokDateAndTime(
            existing.tripDate,
            existing.departureTime
          ).getTime();

          const [otherStops, linkedJobs] = await Promise.all([
            tx.logisticsTripStop.findMany({
              where: {
                jobId: { in: jobIds },
                tripId: { not: tripId },
                trip: { status: { not: 'CANCELLED' } },
                status: { notIn: ['FAILED', 'RESCHEDULED'] },
              },
              select: { jobId: true },
            }),
            tx.job.findMany({
              where: { id: { in: jobIds } },
              select: {
                id: true,
                deliveryDate: true,
                stepLogs: { select: { step: true } },
              },
            }),
          ]);

          const hasOtherTrip = new Set(
            otherStops.map((s) => s.jobId).filter((v): v is string => Boolean(v))
          );
          for (const j of linkedJobs) {
            if (hasOtherTrip.has(j.id)) continue;
            const hasDeliveryLog = j.stepLogs.some(
              (l) => l.step === 'delivery' || l.step === 'service_return'
            );
            if (hasDeliveryLog) continue;
            if (
              j.deliveryDate &&
              Math.abs(new Date(j.deliveryDate).getTime() - cancelledScheduledAt) <= 60_000
            ) {
              await tx.job.update({
                where: { id: j.id },
                data: { deliveryDate: null },
              });
            }
          }
        }
      }

      return tripUpdated;
    });

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${tripId}`);
    revalidatePath('/jobs');
    revalidatePath('/repair-deliveries');
    return { success: true, trip: serializeTrip(updated) };
  } catch (err: unknown) {
    console.error('[updateLogisticsTripState] error:', err);
    return { success: false, error: getErrMessage(err, 'อัปเดตสถานะทริปไม่สำเร็จ') };
  }
}

export async function reorderLogisticsTripStop(
  tripId: string,
  stopId: string,
  direction: 'UP' | 'DOWN'
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดลำดับจุดส่ง' };
    }

    const trip = await prisma.logisticsTrip.findUnique({
      where: { id: tripId },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });
    if (!trip) return { success: false, error: 'ไม่พบทริป' };
    if (!(await canModifyTrip(trip, user, permissions))) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการทริปนี้' };
    }
    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return { success: false, error: 'ไม่สามารถแก้ไขทริปที่ปิดแล้ว' };
    }

    const idx = trip.stops.findIndex((s) => s.id === stopId);
    if (idx === -1) return { success: false, error: 'ไม่พบจุดส่ง' };
    const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= trip.stops.length) return { success: true };

    const a = trip.stops[idx];
    const b = trip.stops[swapIdx];
    await prisma.$transaction([
      prisma.logisticsTripStop.update({ where: { id: a.id }, data: { stopOrder: b.stopOrder } }),
      prisma.logisticsTripStop.update({ where: { id: b.id }, data: { stopOrder: a.stopOrder } }),
    ]);

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${tripId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: getErrMessage(err, 'สลับลำดับจุดส่งไม่สำเร็จ') };
  }
}

interface PodJobAdvanceResult {
  jobId: string;
  jobNumber: string;
  prevStepKey: string;
  completedBy: string;
  nextStep?: ReturnType<typeof getNextStep>;
}

async function syncDeliveredPodToJobInTx(
  tx: Prisma.TransactionClient,
  params: {
    jobId: string;
    now: Date;
    method: 'in-house' | 'courier';
    courierCompany?: string | null;
    cleanTracking: string | null;
    primaryProofPhoto: string | null;
    driverName: string;
    operatorName: string;
    tripNumber: string;
    cleanReceiver: string;
    podNote?: string;
  }
): Promise<{ syncNotice?: string; advanceResult?: PodJobAdvanceResult }> {
  const job = await tx.job.findUnique({
    where: { id: params.jobId },
    include: {
      stepLogs: { select: { step: true } },
      paymentTasks: true,
      quotation: {
        select: {
          totalAmountBeforeVat: true,
          actualClosingAmount: true,
          salesBeforeVat: true,
        },
      },
    },
  });

  if (!job) return {};

  const primaryProofPhoto = params.primaryProofPhoto || job.trackingPhotoUrl || null;
  const isDeliveryStep = job.currentStep === 'delivery' || job.currentStep === 'service_return';
  const alreadyLogged = job.stepLogs.some((l) => l.step === job.currentStep);
  const steps = getSteps(job.jobType, job.flowVariant);
  const nextStep = getNextStep(job.jobType, job.currentStep, job.flowVariant);
  const reconciliation = evaluateAccountingAmountReconciliation({
    accountingVerifiedBeforeVat: job.accountingVerifiedBeforeVat,
    accountingClosedAt: job.accountingClosedAt,
    quotation: job.quotation,
  });
  const prepaidBlockReason = evaluatePrepaidDeliveryBlockReason({
    steps,
    currentStepKey: job.currentStep,
    stepLogs: job.stepLogs,
    paymentTasks: job.paymentTasks,
    paymentMethod: job.paymentMethod,
    creditTerms: job.creditTerms,
  });

  const canAdvanceJobStep =
    isDeliveryStep &&
    !alreadyLogged &&
    !(!nextStep && reconciliation.hasMismatch) &&
    !prepaidBlockReason;

  await tx.job.update({
    where: { id: job.id },
    data: {
      deliveryDate: params.now,
      deliveryMethod: params.method,
      courierCompany:
        params.method === 'courier'
          ? (params.courierCompany || '').trim() || job.courierCompany
          : job.courierCompany,
      trackingNumber: params.cleanTracking || job.trackingNumber,
      trackingPhotoUrl: primaryProofPhoto,
      ...(canAdvanceJobStep && nextStep ? { currentStep: nextStep.key } : {}),
    },
  });

  if (canAdvanceJobStep) {
    const completedBy = params.driverName || params.operatorName;
    await tx.jobStepLog.create({
      data: {
        jobId: job.id,
        step: job.currentStep,
        completedBy,
        department: 'delivery',
        note:
          (params.podNote || '').trim() ||
          `ส่งมอบผ่านทริป ${params.tripNumber}${params.cleanReceiver ? ` (ผู้รับ: ${params.cleanReceiver})` : ''}`,
      },
    });
    return {
      advanceResult: {
        jobId: job.id,
        jobNumber: job.jobNumber,
        prevStepKey: job.currentStep,
        completedBy,
        nextStep,
      },
    };
  }

  if (!isDeliveryStep) {
    return {
      syncNotice: `บันทึก POD ในทริปแล้ว (งาน ${job.jobNumber} ยังอยู่ขั้นตอน "${job.currentStep}")`,
    };
  }
  if (prepaidBlockReason) {
    return {
      syncNotice: `บันทึกหลักฐานส่งมอบแล้ว แต่ระบบยังไม่ปิดขั้นจัดส่ง Job ${job.jobNumber} (${prepaidBlockReason})`,
    };
  }
  if (reconciliation.hasMismatch) {
    return {
      syncNotice: `บันทึกหลักฐานส่งมอบแล้ว แต่ระบบยังไม่ปิด Job ${job.jobNumber} เนื่องจากรอฝ่ายขาย/บัญชีปรับยอดให้ตรงกัน`,
    };
  }
  return {};
}

export async function signRequisitionPickupInTrip(
  stopId: string,
  data: {
    transportType: 'INTERNAL' | 'EXTERNAL';
    transportName: string;
    transportCompany?: string;
    transportSignatureUrl: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์ลงนามรับของ' };
    }

    const stop = await prisma.logisticsTripStop.findUnique({
      where: { id: stopId },
      include: { trip: true },
    });
    if (!stop || !stop.requisitionId) {
      return { success: false, error: 'จุดส่งนี้ไม่ใช่ใบเบิกสินค้าจากคลัง' };
    }
    if (!(await canModifyTrip(stop.trip, user, permissions))) {
      return { success: false, error: 'แก้ไขได้เฉพาะคนขับผู้รับผิดชอบหรือหัวหน้าขนส่ง' };
    }

    const res = await recordTransportPickup(stop.requisitionId, {
      transportType: data.transportType,
      transportName: data.transportName,
      transportCompany: data.transportCompany || stop.trip.vehiclePlate || undefined,
      transportSignatureUrl: data.transportSignatureUrl,
    });
    if (!res.success) {
      return { success: false, error: res.error || 'บันทึกลายเซ็นขนส่งไม่สำเร็จ' };
    }

    await prisma.$transaction(async (tx) => {
      if (stop.status === 'PENDING') {
        await tx.logisticsTripStop.update({
          where: { id: stop.id },
          data: { status: 'PICKED_UP' },
        });
      }
      if (stop.trip.status === 'PLANNED') {
        await tx.logisticsTrip.update({
          where: { id: stop.tripId },
          data: { status: 'LOADING' },
        });
      }
    });

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${stop.tripId}`);
    revalidatePath('/jobs');
    return { success: true };
  } catch (err: unknown) {
    console.error('[signRequisitionPickupInTrip] error:', err);
    return { success: false, error: getErrMessage(err, 'เกิดข้อผิดพลาดในการเซ็นรับสินค้า') };
  }
}

export async function checkInLogisticsStop(
  stopId: string,
  coords?: { gpsLat?: number | null; gpsLng?: number | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์เช็กอินจุดส่ง' };
    }

    const stop = await prisma.logisticsTripStop.findUnique({
      where: { id: stopId },
      include: { trip: true },
    });
    if (!stop) return { success: false, error: 'ไม่พบจุดส่ง' };
    if (!(await canModifyTrip(stop.trip, user, permissions))) {
      return { success: false, error: 'แก้ไขได้เฉพาะคนขับผู้รับผิดชอบหรือหัวหน้าขนส่ง' };
    }
    if (stop.status === 'DELIVERED') {
      return { success: false, error: 'จุดส่งนี้บันทึกส่งมอบเสร็จแล้ว' };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.logisticsTripStop.update({
        where: { id: stop.id },
        data: {
          status: 'ARRIVED',
          checkedInAt: stop.checkedInAt || now,
          ...(coords?.gpsLat !== undefined && coords?.gpsLat !== null
            ? { gpsLat: coords.gpsLat }
            : {}),
          ...(coords?.gpsLng !== undefined && coords?.gpsLng !== null
            ? { gpsLng: coords.gpsLng }
            : {}),
        },
      });
      if (stop.trip.status === 'PLANNED' || stop.trip.status === 'LOADING') {
        await tx.logisticsTrip.update({
          where: { id: stop.tripId },
          data: {
            status: 'IN_TRANSIT',
            startedAt: stop.trip.startedAt || now,
          },
        });
      }
    });

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${stop.tripId}`);
    revalidatePath('/jobs');
    revalidatePath('/repair-deliveries');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: getErrMessage(err, 'เช็กอินจุดส่งไม่สำเร็จ') };
  }
}

export async function completeLogisticsStopPod(
  stopId: string,
  payload: {
    receiverName: string;
    receiverSignatureUrl?: string | null;
    podPhotoUrls: string[];
    podNote?: string;
    deliveryMethod?: 'in-house' | 'courier';
    courierCompany?: string;
    trackingNumber?: string;
    gpsLat?: number | null;
    gpsLng?: number | null;
  }
): Promise<{ success: boolean; syncNotice?: string; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์ปิดส่งงาน POD' };
    }

    const stop = await prisma.logisticsTripStop.findUnique({
      where: { id: stopId },
      include: { trip: true },
    });
    if (!stop) return { success: false, error: 'ไม่พบข้อมูลจุดส่ง' };
    if (!(await canModifyTrip(stop.trip, user, permissions))) {
      return { success: false, error: 'บันทึก POD ได้เฉพาะคนขับผู้รับผิดชอบหรือหัวหน้าขนส่ง' };
    }
    if (stop.trip.status === 'CANCELLED' || stop.trip.status === 'COMPLETED') {
      return { success: false, error: 'ทริปนี้ปิดหรือยกเลิกไปแล้ว' };
    }

    const cleanReceiver = (payload.receiverName || '').trim();
    const cleanSig = (payload.receiverSignatureUrl || '').trim() || null;
    const photos = (payload.podPhotoUrls || []).map((u) => u.trim()).filter(Boolean);
    const cleanTracking = (payload.trackingNumber || '').trim() || null;
    const method = payload.deliveryMethod === 'courier' ? 'courier' : 'in-house';

    if (method === 'in-house' && !cleanReceiver) {
      return { success: false, error: 'กรุณาระบุชื่อผู้รับสินค้าหน้างาน' };
    }
    if (!cleanSig && photos.length === 0 && !cleanTracking) {
      return {
        success: false,
        error: 'กรุณาแนบอย่างน้อย 1 หลักฐาน (รูปถ่ายส่งมอบ, ลายเซ็นผู้รับ, หรือเลข Tracking)',
      };
    }

    const now = new Date();
    let syncNotice = '';
    let podJobAdvanceResult: PodJobAdvanceResult | undefined;

    await prisma.$transaction(async (tx) => {
      await tx.logisticsTripStop.update({
        where: { id: stop.id },
        data: {
          status: 'DELIVERED',
          deliveryMethod: method,
          courierCompany: (payload.courierCompany || '').trim() || stop.courierCompany,
          trackingNumber: cleanTracking,
          checkedInAt: stop.checkedInAt || now,
          deliveredAt: now,
          receiverName: cleanReceiver || payload.courierCompany || 'ผู้รับหน้างาน',
          receiverSignatureUrl: cleanSig,
          podPhotoUrls: photos,
          podNote: (payload.podNote || '').trim() || null,
          failReason: null,
          ...(payload.gpsLat !== undefined && payload.gpsLat !== null ? { gpsLat: payload.gpsLat } : {}),
          ...(payload.gpsLng !== undefined && payload.gpsLng !== null ? { gpsLng: payload.gpsLng } : {}),
        },
      });

      if (stop.trip.status === 'PLANNED' || stop.trip.status === 'LOADING') {
        await tx.logisticsTrip.update({
          where: { id: stop.tripId },
          data: { status: 'IN_TRANSIT', startedAt: stop.trip.startedAt || now },
        });
      }

      let resolvedJobId: string | null = stop.sourceType === 'JOB' ? stop.jobId : null;
      if (!resolvedJobId && stop.sourceType === 'REPAIR_DELIVERY' && stop.repairDeliveryId) {
        const rd = await tx.repairDelivery.findUnique({
          where: { id: stop.repairDeliveryId },
          select: { jobId: true },
        });
        resolvedJobId = rd?.jobId || null;
      }

      if (resolvedJobId) {
        const jobSyncRes = await syncDeliveredPodToJobInTx(tx, {
          jobId: resolvedJobId,
          now,
          method,
          courierCompany:
            method === 'courier'
              ? (payload.courierCompany || '').trim() || stop.trip.courierName
              : null,
          cleanTracking,
          primaryProofPhoto: photos[0] || cleanSig || null,
          driverName: stop.trip.driverName,
          operatorName: user.fullName,
          tripNumber: stop.trip.tripNumber,
          cleanReceiver,
          podNote: payload.podNote,
        });
        if (jobSyncRes.syncNotice) syncNotice = jobSyncRes.syncNotice;
        podJobAdvanceResult = jobSyncRes.advanceResult;
      }
    });

    if (podJobAdvanceResult) {
      try {
        const { notifyJobStepUpdate } = await import('@/app/actions/jobs');
        await notifyJobStepUpdate(
          podJobAdvanceResult.jobId,
          podJobAdvanceResult.prevStepKey,
          podJobAdvanceResult.nextStep?.label || podJobAdvanceResult.prevStepKey,
          'delivery'
        );

        if (podJobAdvanceResult.nextStep && podJobAdvanceResult.nextStep.department.length > 0) {
          const targetUsers = await prisma.user.findMany({
            where: {
              isActive: true,
              OR: podJobAdvanceResult.nextStep.department.map((d) => ({
                role: { contains: d, mode: 'insensitive' as const },
              })),
            },
            select: { id: true },
          });
          await Promise.all(
            targetUsers.map((u) =>
              sendPushToUser(u.id, {
                title: 'งานใหม่รอการดำเนินการ',
                body: `งาน ${podJobAdvanceResult!.jobNumber} จัดส่งเรียบร้อยและเข้าสู่ขั้นตอน ${podJobAdvanceResult!.nextStep!.label}`,
                url: '/jobs',
                category: 'JOB',
              })
            )
          );
        }
      } catch (notifyErr) {
        console.warn('[completeLogisticsStopPod] next step notify error:', notifyErr);
      }
    }

    if (stop.sourceType === 'REQUISITION' && stop.requisitionId) {
      const handoverRes = await recordSiteHandover(stop.requisitionId, {
        receiverName: cleanReceiver || 'ผู้รับหน้างาน',
        receiverSignatureUrl: cleanSig || undefined,
        deliveryPhotos: photos,
        deliveryNote:
          (payload.podNote || '').trim() ||
          `ส่งมอบจากทริปขนส่ง ${stop.trip.tripNumber} (${stop.trip.driverName})`,
      });
      if (!handoverRes.success) {
        syncNotice = `บันทึก POD ทริปแล้ว แต่ปิดใบเบิกไม่สำเร็จ: ${handoverRes.error}`;
      }
    } else if (stop.sourceType === 'REPAIR_DELIVERY' && stop.repairDeliveryId) {
      const rdRes = await updateRepairDelivery(stop.repairDeliveryId, {
        nameReceiver: cleanReceiver || 'ผู้รับสินค้า',
        sigReceiverUrl: cleanSig || undefined,
        nameSender: stop.trip.driverName || user.fullName,
        deliveryDate: now,
        status: cleanSig ? 'Completed' : undefined,
        photosAfter: photos,
        comments:
          (payload.podNote || '').trim() ||
          `จัดส่งโดยทริป ${stop.trip.tripNumber} (${stop.trip.driverName})`,
      });
      if (!rdRes.success) {
        syncNotice = `บันทึก POD ทริปแล้ว แต่อัปเดตใบส่งมอบงานไม่สำเร็จ: ${rdRes.error}`;
      }
    }

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${stop.tripId}`);
    revalidatePath('/jobs');
    revalidatePath('/department');
    revalidatePath('/store/requisitions');
    revalidatePath('/repair-deliveries');

    return { success: true, syncNotice: syncNotice || undefined };
  } catch (err: unknown) {
    console.error('[completeLogisticsStopPod] error:', err);
    return { success: false, error: getErrMessage(err, 'บันทึกการส่งมอบ POD ไม่สำเร็จ') };
  }
}

export async function markLogisticsStopIssue(
  stopId: string,
  payload: { status: 'FAILED' | 'RESCHEDULED'; failReason: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์อัปเดตสถานะจุดส่ง' };
    }

    const reason = (payload.failReason || '').trim();
    if (!reason) {
      return { success: false, error: 'กรุณาระบุเหตุผล (เช่น ติดต่อลูกค้าไม่ได้ / ไซต์งานปิด)' };
    }

    const stop = await prisma.logisticsTripStop.findUnique({
      where: { id: stopId },
      include: { trip: true },
    });
    if (!stop) return { success: false, error: 'ไม่พบจุดส่ง' };
    if (!(await canModifyTrip(stop.trip, user, permissions))) {
      return { success: false, error: 'ไม่มีสิทธิ์อัปเดตจุดส่งนี้' };
    }

    await prisma.logisticsTripStop.update({
      where: { id: stop.id },
      data: {
        status: payload.status,
        failReason: reason,
        checkedInAt: stop.checkedInAt || new Date(),
      },
    });

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${stop.tripId}`);
    revalidatePath('/jobs');
    revalidatePath('/repair-deliveries');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: getErrMessage(err, 'บันทึกสถานะจุดส่งไม่สำเร็จ') };
  }
}

export interface CloseLogisticsTripInput {
  startMileage?: number | null;
  endMileage?: number | null;
  allowancePerDay: number;
  allowanceDays: number;
  crewCount: number;
  overnightNights: number;
  accommodationAmount: number;
  tollAmount: number;
  fuelAmount: number;
  otherExpenseAmount: number;
  expenseItems: LogisticsTripExpenseItem[];
  expenseReceipts: string[];
  closeNote?: string;
}

export async function closeLogisticsTrip(
  tripId: string,
  payload: CloseLogisticsTripInput
): Promise<{ success: boolean; trip?: LogisticsTripRecord; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canPlanTrips) {
      return { success: false, error: 'ไม่มีสิทธิ์ปิดทริปวิ่งรถ' };
    }

    const trip = await prisma.logisticsTrip.findUnique({
      where: { id: tripId },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });
    if (!trip) return { success: false, error: 'ไม่พบข้อมูลทริป' };
    if (!(await canModifyTrip(trip, user, permissions))) {
      return { success: false, error: 'ปิดทริปได้เฉพาะคนขับผู้รับผิดชอบหรือหัวหน้าขนส่ง' };
    }
    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return { success: false, error: 'ทริปนี้ปิดหรือยกเลิกไปแล้ว' };
    }

    const unresolvedStops = trip.stops.filter(
      (s) => !['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(s.status)
    );
    if (unresolvedStops.length > 0) {
      return {
        success: false,
        error: `ยังมีจุดส่งที่ยังไม่ปิดงาน ${unresolvedStops.length} จุด กรุณาบันทึก POD หรือระบุสถานะให้ครบก่อนปิดทริป`,
      };
    }

    if (
      payload.startMileage !== undefined &&
      payload.startMileage !== null &&
      payload.endMileage !== undefined &&
      payload.endMileage !== null &&
      Number(payload.endMileage) < Number(payload.startMileage)
    ) {
      return { success: false, error: 'เลขไมล์ขากลับต้องมากกว่าหรือเท่ากับเลขไมล์ขาไป' };
    }

    const calc = calculateTripAllowanceAndExpenses({
      allowancePerDay: payload.allowancePerDay,
      allowanceDays: payload.allowanceDays,
      crewCount: payload.crewCount,
      overnightNights: payload.overnightNights,
      accommodationAmount: payload.accommodationAmount,
      tollAmount: payload.tollAmount,
      fuelAmount: payload.fuelAmount,
      otherExpenseAmount: payload.otherExpenseAmount,
      expenseItems: payload.expenseItems,
      startMileage: payload.startMileage,
      endMileage: payload.endMileage,
    });

    const sanitizedItems = (payload.expenseItems || [])
      .filter((it) => (it.label || '').trim() || Number(it.amount) > 0)
      .map((it, idx) => ({
        id: it.id || `exp-${idx + 1}`,
        category: it.category || 'OTHER',
        label: (it.label || '').trim() || 'ค่าใช้จ่าย',
        amount: Number(it.amount || 0),
        receiptUrl: it.receiptUrl ? String(it.receiptUrl).trim() : null,
      }));

    const receipts = (payload.expenseReceipts || []).map((r) => r.trim()).filter(Boolean);
    const now = new Date();

    const updated = await prisma.logisticsTrip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        startedAt: trip.startedAt || now,
        closedAt: now,
        closedById: user.id,
        closedByName: user.fullName,
        closeNote: (payload.closeNote || '').trim() || null,
        startMileage:
          payload.startMileage !== undefined && payload.startMileage !== null
            ? Number(payload.startMileage)
            : trip.startMileage,
        endMileage:
          payload.endMileage !== undefined && payload.endMileage !== null
            ? Number(payload.endMileage)
            : null,
        allowancePerDay: calc.allowancePerDay,
        allowanceDays: calc.allowanceDays,
        crewCount: calc.crewCount,
        allowanceTotal: calc.allowanceTotal,
        overnightNights: calc.overnightNights,
        accommodationAmount: calc.accommodationAmount,
        tollAmount: calc.tollAmount,
        fuelAmount: calc.fuelAmount,
        otherExpenseAmount: calc.otherExpenseAmount,
        expenseItems: sanitizedItems,
        totalExpenseAmount: calc.totalExpenseAmount,
        expenseReceipts: receipts,
        expenseApprovedStatus: calc.totalExpenseAmount > 0 ? 'PENDING_REVIEW' : 'NONE',
      },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });

    if (calc.totalExpenseAmount > 0) {
      try {
        const managers = await prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              { role: { contains: 'ขนส่ง', mode: 'insensitive' } },
              { role: { contains: 'logistic', mode: 'insensitive' } },
            ],
          },
          select: { id: true, role: true },
        });
        const mgrIds = managers
          .filter((m) => isLogisticsManager(m.role) && m.id !== user.id)
          .map((m) => m.id);
        await Promise.all(
          mgrIds.map((id) =>
            sendPushToUser(id, {
              title: `ปิดทริป ${updated.tripNumber} · ค่าใช้จ่าย ฿${calc.totalExpenseAmount.toLocaleString('th-TH')}`,
              body: `${updated.driverName} ปิดทริป (${updated.stops.length} จุดส่ง) เบี้ยเลี้ยง ฿${calc.allowanceTotal.toLocaleString('th-TH')} / ทางด่วน ฿${calc.tollAmount.toLocaleString('th-TH')}`,
              url: `/logistics/trips/${updated.id}`,
              category: 'LOGISTICS_CLOSE',
            })
          )
        );
      } catch (notifyErr) {
        console.warn('[closeLogisticsTrip] notify error:', notifyErr);
      }
    }

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${tripId}`);
    revalidatePath('/jobs');
    revalidatePath('/repair-deliveries');
    return { success: true, trip: serializeTrip(updated) };
  } catch (err: unknown) {
    console.error('[closeLogisticsTrip] error:', err);
    return { success: false, error: getErrMessage(err, 'ปิดทริปไม่สำเร็จ') };
  }
}

export async function approveTripExpenses(
  tripId: string,
  status: 'APPROVED' | 'PAID'
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureLogisticsSchema();
    const { user, permissions } = await resolveLogisticsPermissions();
    if (!user || !permissions?.canManageAllTrips) {
      return { success: false, error: 'สงวนสิทธิ์อนุมัติค่าเบี้ยเลี้ยง/ค่าทางด่วนเฉพาะผู้จัดการหรือผู้ดูแลระบบ' };
    }

    const updated = await prisma.logisticsTrip.update({
      where: { id: tripId },
      data: { expenseApprovedStatus: status },
      select: { tripNumber: true, driverUserId: true, totalExpenseAmount: true },
    });

    if (updated.driverUserId && updated.driverUserId !== user.id) {
      sendPushToUser(updated.driverUserId, {
        title:
          status === 'PAID'
            ? `จ่ายค่าใช้จ่ายทริป ${updated.tripNumber} แล้ว`
            : `อนุมัติค่าใช้จ่ายทริป ${updated.tripNumber} แล้ว`,
        body: `ยอดรวม ฿${Number(updated.totalExpenseAmount || 0).toLocaleString('th-TH')} (${user.fullName})`,
        url: `/logistics/trips/${tripId}`,
        category: 'LOGISTICS_EXPENSE',
      }).catch(console.warn);
    }

    revalidatePath('/logistics');
    revalidatePath(`/logistics/trips/${tripId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: getErrMessage(err, 'อนุมัติค่าใช้จ่ายไม่สำเร็จ') };
  }
}
