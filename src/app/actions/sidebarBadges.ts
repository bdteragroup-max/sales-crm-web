'use server';

import { getUser } from '@/app/lib/dal';
import {
  canViewAllServiceCalls,
  isLogisticsManager,
  isMarketingStaff,
  isSalesOrMarketingManager,
  isSuperUser,
  isReadOnlyExecutive,
  isTransportStaff,
} from '@/app/lib/roleHelper';
import { canEstimateSurveyRole } from '@/app/lib/surveyMetadata';
import {
  canSignSolarCleaningAsProjectMgr,
  canSignSolarCleaningAsServiceMgr,
} from '@/app/lib/solarCleaningConfig';
import { getPendingPaymentTaskCount } from '@/app/actions/accounting';
import { getPendingInstallationCount } from '@/app/actions/installationOrders';
import { getPendingRepairOrderCount } from '@/app/actions/repairOrders';
import { getPendingOutsourceRepairCount } from '@/app/actions/outsourceRepairs';
import {
  getPendingAccountingDeliveryCount,
  getPendingRepairDeliveryCount,
  getPendingSalesDeliveryAckCount,
} from '@/app/actions/repairDeliveries';
import { getPendingEstimationCount } from '@/app/actions/estimations';
import { getPendingMarketingRequestCount } from '@/app/actions/marketingRequests';
import { getUnreadMarketingBoardCount } from '@/app/actions/marketingBoard';
import { getBranchContentSidebarAccess } from '@/app/actions/branchContent';
import { resolveContentPlanningPermissions } from '@/app/actions/contentPlanning';
import { getPendingServiceClaimCount } from '@/app/actions/serviceClaims';
import {
  getOpenServiceCallCount,
  getPendingServiceHandoverCount,
} from '@/app/actions/service-calls';
import { getPendingProjectSurveyCount } from '@/app/actions/siteSurveys';
import { getPendingSolarCleaningSignCount } from '@/app/actions/solarCleaning';
import { getPendingLogisticsCount } from '@/app/actions/logistics';

export interface SidebarBadgeSummary {
  unpaidCount: number;
  pendingInstallationCount: number;
  pendingRepairCount: number;
  pendingOutsourceCount: number;
  pendingEstimationCount: number;
  pendingDeliveryCount: number;
  pendingMarketingRequestCount: number;
  unreadMarketingBoardCount: number;
  canAccessBranchContent: boolean;
  canAccessContentPlanning: boolean;
  pendingBranchContentCount: number;
  pendingClaimCount: number;
  openServiceCallCount: number;
  pendingServiceHandoverCount: number;
  pendingSalesDeliveryAckCount: number;
  pendingAccountingDeliveryCount: number;
  pendingProjectSurveyCount: number;
  pendingSolarCleaningCount: number;
  pendingLogisticsCount: number;
}

const EMPTY_BADGE_SUMMARY: SidebarBadgeSummary = {
  unpaidCount: 0,
  pendingInstallationCount: 0,
  pendingRepairCount: 0,
  pendingOutsourceCount: 0,
  pendingEstimationCount: 0,
  pendingDeliveryCount: 0,
  pendingMarketingRequestCount: 0,
  unreadMarketingBoardCount: 0,
  canAccessBranchContent: false,
  canAccessContentPlanning: false,
  pendingBranchContentCount: 0,
  pendingClaimCount: 0,
  openServiceCallCount: 0,
  pendingServiceHandoverCount: 0,
  pendingSalesDeliveryAckCount: 0,
  pendingAccountingDeliveryCount: 0,
  pendingProjectSurveyCount: 0,
  pendingSolarCleaningCount: 0,
  pendingLogisticsCount: 0,
};

type GlobalBadgeState = typeof globalThis & {
  __sidebarBadgeCache?: Map<string, { data: SidebarBadgeSummary; expiresAt: number }>;
  __sidebarBadgePending?: Map<string, Promise<SidebarBadgeSummary>>;
};

const globalBadges = globalThis as GlobalBadgeState;
const SIDEBAR_BADGE_TTL_MS = 25_000;
const CONCURRENCY_CHUNK = 4;

async function runTasksInChunks(tasks: Array<() => Promise<void>>, chunkSize: number): Promise<void> {
  for (let i = 0; i < tasks.length; i += chunkSize) {
    const batch = tasks.slice(i, i + chunkSize);
    await Promise.all(batch.map((fn) => fn().catch(() => {})));
  }
}

/**
 * Fetches all sidebar notification counts in one batched request with short TTL caching
 * so navigating or mounting Sidebar does not flood DB pools with 17 concurrent POSTs.
 */
export async function getSidebarBadgeSummary(
  forceRefresh = false
): Promise<SidebarBadgeSummary> {
  const user = await getUser();
  if (!user) return EMPTY_BADGE_SUMMARY;

  if (!globalBadges.__sidebarBadgeCache) {
    globalBadges.__sidebarBadgeCache = new Map();
  }
  if (!globalBadges.__sidebarBadgePending) {
    globalBadges.__sidebarBadgePending = new Map();
  }

  const cacheKey = `${user.id}:${user.role || ''}`;
  const now = Date.now();
  const cached = globalBadges.__sidebarBadgeCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inflight = globalBadges.__sidebarBadgePending.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async (): Promise<SidebarBadgeSummary> => {
    const result: SidebarBadgeSummary = { ...EMPTY_BADGE_SUMMARY };
    const roleStr = (user.role || '').toLowerCase();

    const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน', 'ผู้จัดการ'].some((r) =>
      roleStr.includes(r)
    );
    const isServiceUser =
      roleStr === 'อื่นๆ' ||
      roleStr.includes('service') ||
      roleStr.includes('technician') ||
      roleStr.includes('บริการ') ||
      roleStr.includes('ซ่อม') ||
      roleStr.includes('ช่าง') ||
      isSalesOrMarketingManager(user.role) ||
      roleStr === 'ผู้บริหาร' ||
      roleStr === 'executive' ||
      roleStr === 'super_admin';
    const shouldLoadLogisticsBadge =
      isTransportStaff(user.role) ||
      isLogisticsManager(user.role) ||
      isSuperUser(user.role) ||
      ['store', 'สโตร์', 'คลังสินค้า', 'warehouse', 'purchasing', 'จัดซื้อ', 'admin'].some(
        (k) => roleStr.includes(k)
      );

    const tasks: Array<() => Promise<void>> = [
      async () => {
        result.pendingDeliveryCount = await getPendingRepairDeliveryCount();
      },
      async () => {
        result.pendingMarketingRequestCount = await getPendingMarketingRequestCount();
      },
      async () => {
        result.unreadMarketingBoardCount = await getUnreadMarketingBoardCount();
      },
      async () => {
        const res = await getBranchContentSidebarAccess();
        result.canAccessBranchContent = res.canAccess;
        result.pendingBranchContentCount = res.pendingCount;
      },
      async () => {
        if (
          isSuperUser(user.role) ||
          isReadOnlyExecutive(user.role) ||
          isMarketingStaff(user.role)
        ) {
          result.canAccessContentPlanning = true;
          return;
        }
        const { permissions } = await resolveContentPlanningPermissions();
        result.canAccessContentPlanning = Boolean(permissions?.canAccess);
      },
      async () => {
        result.pendingClaimCount = await getPendingServiceClaimCount();
      },
      async () => {
        result.pendingServiceHandoverCount = await getPendingServiceHandoverCount();
      },
      async () => {
        result.pendingSalesDeliveryAckCount = await getPendingSalesDeliveryAckCount();
      },
      async () => {
        result.pendingAccountingDeliveryCount = await getPendingAccountingDeliveryCount();
      },
    ];

    if (isAccounting) {
      tasks.push(async () => {
        result.unpaidCount = await getPendingPaymentTaskCount();
      });
    }
    if (isServiceUser) {
      tasks.push(
        async () => {
          result.pendingInstallationCount = await getPendingInstallationCount();
        },
        async () => {
          result.pendingRepairCount = await getPendingRepairOrderCount();
        },
        async () => {
          result.pendingOutsourceCount = await getPendingOutsourceRepairCount();
        },
        async () => {
          result.pendingEstimationCount = await getPendingEstimationCount();
        }
      );
    }
    if (shouldLoadLogisticsBadge) {
      tasks.push(async () => {
        result.pendingLogisticsCount = await getPendingLogisticsCount();
      });
    }
    if (canViewAllServiceCalls(user.role)) {
      tasks.push(async () => {
        result.openServiceCallCount = await getOpenServiceCallCount();
      });
    }
    if (canEstimateSurveyRole(user.role)) {
      tasks.push(async () => {
        result.pendingProjectSurveyCount = await getPendingProjectSurveyCount();
      });
    }
    if (
      canSignSolarCleaningAsProjectMgr(user.role) ||
      canSignSolarCleaningAsServiceMgr(user.role)
    ) {
      tasks.push(async () => {
        result.pendingSolarCleaningCount = await getPendingSolarCleaningSignCount();
      });
    }

    await runTasksInChunks(tasks, CONCURRENCY_CHUNK);

    globalBadges.__sidebarBadgeCache!.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + SIDEBAR_BADGE_TTL_MS,
    });
    return result;
  })().finally(() => {
    globalBadges.__sidebarBadgePending?.delete(cacheKey);
  });

  globalBadges.__sidebarBadgePending.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Lightweight endpoint for survey/solar badge refresh events.
 */
export async function getSurveyAndCleaningBadges(): Promise<{
  pendingProjectSurveyCount: number;
  pendingSolarCleaningCount: number;
}> {
  const user = await getUser();
  if (!user) {
    return { pendingProjectSurveyCount: 0, pendingSolarCleaningCount: 0 };
  }

  const [survey, solar] = await Promise.all([
    canEstimateSurveyRole(user.role)
      ? getPendingProjectSurveyCount().catch(() => 0)
      : Promise.resolve(0),
    canSignSolarCleaningAsProjectMgr(user.role) || canSignSolarCleaningAsServiceMgr(user.role)
      ? getPendingSolarCleaningSignCount().catch(() => 0)
      : Promise.resolve(0),
  ]);

  return {
    pendingProjectSurveyCount: survey,
    pendingSolarCleaningCount: solar,
  };
}
