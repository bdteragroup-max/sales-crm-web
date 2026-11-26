'use server';

import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  isMarketingManager,
  isMarketingStaff,
  isReadOnlyExecutive,
  isSuperUser,
} from '@/app/lib/roleHelper';
import {
  canUserModifyContentPlan,
  normalizePostDateAndTime,
  sanitizeContentPlanChannels,
  sortContentPlansChronologically,
  type ContentPlanItem,
  type ContentPlanningPermissions,
  type MarketingPlanMember,
} from '@/app/lib/contentPlanningTypes';

type CachedHrEmp = {
  emp_id: string;
  name: string;
  nickname: string | null;
  email: string | null;
  departments: { name: string } | null;
};

type GlobalPlanningState = typeof globalThis & {
  __contentPlanningSchemaReady?: boolean;
  __contentPlanningSchemaPromise?: Promise<void> | null;
  __hrEmployeesCache?: {
    data: {
      rows: CachedHrEmp[];
      byEmpId: Map<string, CachedHrEmp>;
      byEmail: Map<string, CachedHrEmp>;
      byCleanName: Map<string, CachedHrEmp>;
    };
    expiresAt: number;
  } | null;
};

const globalState = globalThis as GlobalPlanningState;
const HR_CACHE_TTL_MS = 2 * 60 * 1000;

function cleanPersonTitle(n?: string | null): string {
  return (n || '').replace(/^(นาย|นางสาว|นาง|คุณ|ดร\.)\s*/g, '').trim();
}

async function getHrLookupCached() {
  const now = Date.now();
  const cached = globalState.__hrEmployeesCache;
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const rows = await teraDb.employees.findMany({
      where: { is_active: true },
      select: {
        emp_id: true,
        name: true,
        nickname: true,
        email: true,
        departments: { select: { name: true } },
      },
    });
    const byEmpId = new Map<string, CachedHrEmp>();
    const byEmail = new Map<string, CachedHrEmp>();
    const byCleanName = new Map<string, CachedHrEmp>();
    for (const h of rows) {
      if (h.emp_id) byEmpId.set(h.emp_id.toUpperCase(), h);
      if (h.email) byEmail.set(h.email.toLowerCase(), h);
      const cleanName = cleanPersonTitle(h.name);
      if (cleanName && !byCleanName.has(cleanName)) byCleanName.set(cleanName, h);
    }
    const data = { rows, byEmpId, byEmail, byCleanName };
    globalState.__hrEmployeesCache = {
      data,
      expiresAt: Date.now() + HR_CACHE_TTL_MS,
    };
    return data;
  } catch {
    if (cached?.data) return cached.data;
    return {
      rows: [] as CachedHrEmp[],
      byEmpId: new Map<string, CachedHrEmp>(),
      byEmail: new Map<string, CachedHrEmp>(),
      byCleanName: new Map<string, CachedHrEmp>(),
    };
  }
}

function findHrMatch(
  hrData: Awaited<ReturnType<typeof getHrLookupCached>>,
  user: { employeeId?: string | null; email?: string | null; fullName?: string | null }
): CachedHrEmp | undefined {
  if (user.employeeId) {
    const m = hrData.byEmpId.get(user.employeeId.toUpperCase());
    if (m) return m;
  }
  if (user.email) {
    const m = hrData.byEmail.get(user.email.toLowerCase());
    if (m) return m;
  }
  const cleanName = cleanPersonTitle(user.fullName);
  if (cleanName) {
    return hrData.byCleanName.get(cleanName);
  }
  return undefined;
}

/**
 * Checks whether a user belongs to the Marketing department (by CRM role, position, sale dept, or HR dept).
 * Distinguishes pure non-Marketing Super Admins from Marketing managers/staff when building team sheets.
 */
function hasMarketingIdentity(
  user: {
    role?: string | null;
    position?: string | null;
    employeeSale?: { department?: string | null } | null;
  },
  hrDepartmentName?: string | null
): boolean {
  const roleOnly = (user.role || '').toLowerCase().trim();
  if (
    !isSuperUser(user.role) &&
    (isMarketingStaff(user.role) || roleOnly.includes('market') || roleOnly.includes('การตลาด'))
  ) {
    return true;
  }
  const metaText = [user.role, user.position, user.employeeSale?.department]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/marketing|การตลาด|content|กราฟิก|graphic/.test(metaText)) {
    return true;
  }
  const hrDept = (hrDepartmentName || '').trim().toLowerCase();
  return hrDept === 'marketing' || hrDept === 'การตลาด' || hrDept === 'ฝ่ายการตลาด';
}

async function ensureContentPlanningSchema() {
  if (globalState.__contentPlanningSchemaReady) return;
  if (globalState.__contentPlanningSchemaPromise) {
    return globalState.__contentPlanningSchemaPromise;
  }

  const runInit = async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS marketing_content_plans (
          id TEXT PRIMARY KEY,
          plan_year INTEGER NOT NULL,
          plan_month INTEGER NOT NULL,
          primary_owner_id TEXT NOT NULL,
          primary_owner_name VARCHAR(150) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content_detail TEXT,
          caption TEXT,
          post_date VARCHAR(10) NOT NULL,
          post_time VARCHAR(5),
          channels JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_by_id TEXT NOT NULL,
          created_by_name VARCHAR(150) NOT NULL,
          updated_by_id TEXT,
          updated_by_name VARCHAR(150),
          created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_marketing_content_plans_ym
          ON marketing_content_plans(plan_year, plan_month);
        CREATE INDEX IF NOT EXISTS idx_marketing_content_plans_owner
          ON marketing_content_plans(primary_owner_id);
        CREATE INDEX IF NOT EXISTS idx_marketing_content_plans_post_date
          ON marketing_content_plans(post_date);
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS marketing_content_plan_co_owners (
          id TEXT PRIMARY KEY,
          plan_id TEXT NOT NULL REFERENCES marketing_content_plans(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          user_name VARCHAR(150) NOT NULL,
          employee_id VARCHAR(50),
          created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_content_plan_co_owner
          ON marketing_content_plan_co_owners(plan_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_marketing_content_plan_co_owner_uid
          ON marketing_content_plan_co_owners(user_id);
      `);

      globalState.__contentPlanningSchemaReady = true;
    } finally {
      globalState.__contentPlanningSchemaPromise = null;
    }
  };

  globalState.__contentPlanningSchemaPromise = runInit();
  return globalState.__contentPlanningSchemaPromise;
}

export async function resolveContentPlanningPermissions(): Promise<{
  user: Awaited<ReturnType<typeof getUser>>;
  permissions: ContentPlanningPermissions | null;
}> {
  const user = await getUser();
  if (!user) {
    return { user: null, permissions: null };
  }

  const role = user.role || '';
  const sysAdmin = isSuperUser(role);
  const mktManager = isMarketingManager(role) || sysAdmin;
  const readOnlyExec = isReadOnlyExecutive(role);

  let isMktMember = mktManager || isMarketingStaff(role);
  if (!isMktMember && !readOnlyExec) {
    const userDetails = await prisma.user
      .findUnique({
        where: { id: user.id },
        select: {
          position: true,
          employeeSale: { select: { department: true } },
        },
      })
      .catch(() => null);

    if (userDetails && hasMarketingIdentity({ role, ...userDetails })) {
      isMktMember = true;
    } else {
      const hrData = await getHrLookupCached();
      const hrMatch = findHrMatch(hrData, user);
      if (hrMatch && hasMarketingIdentity({ role, ...userDetails }, hrMatch.departments?.name)) {
        isMktMember = true;
      }
    }
  }

  const canAccess = Boolean(isMktMember || readOnlyExec);
  const canCreate = Boolean(isMktMember && !readOnlyExec);
  const canManageAll = Boolean(mktManager && !readOnlyExec);

  let roleLabel = 'ทีมการตลาด (Marketing)';
  if (sysAdmin) roleLabel = 'System Admin (แก้ไขได้ทุกชีต)';
  else if (mktManager) roleLabel = 'ผู้จัดการการตลาด (แก้ไขได้ทุกชีต)';
  else if (readOnlyExec) roleLabel = 'ผู้บริหาร (ดูภาพรวมอย่างเดียว)';

  return {
    user,
    permissions: {
      userId: user.id,
      userName: user.fullName || 'ผู้ใช้งาน',
      employeeId: user.employeeId || null,
      role,
      roleLabel,
      canAccess,
      canCreate,
      canManageAll,
      isReadOnly: !canCreate,
    },
  };
}

function serializePlanRow(raw: {
  id: string;
  planYear: number;
  planMonth: number;
  primaryOwnerId: string;
  primaryOwnerName: string;
  title: string;
  contentDetail: string | null;
  caption: string | null;
  postDate: string;
  postTime: string | null;
  channels: unknown;
  createdById: string;
  createdByName: string;
  updatedById: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  coOwners: Array<{
    userId: string;
    userName: string;
    employeeId: string | null;
  }>;
}): ContentPlanItem {
  return {
    id: raw.id,
    planYear: raw.planYear,
    planMonth: raw.planMonth,
    primaryOwnerId: raw.primaryOwnerId,
    primaryOwnerName: raw.primaryOwnerName,
    title: raw.title,
    contentDetail: raw.contentDetail,
    caption: raw.caption,
    postDate: raw.postDate,
    postTime: raw.postTime,
    channels: sanitizeContentPlanChannels(raw.channels),
    coOwners: (raw.coOwners || []).map(co => ({
      userId: co.userId,
      userName: co.userName,
      employeeId: co.employeeId,
    })),
    createdById: raw.createdById,
    createdByName: raw.createdByName,
    updatedById: raw.updatedById,
    updatedByName: raw.updatedByName,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

/**
 * Fetches Marketing Content Planning sheets & plans for the selected month & year.
 */
export async function getContentPlanningWorkspace(yearCe?: number, month1Based?: number): Promise<{
  success: boolean;
  error?: string;
  year: number;
  month: number;
  permissions: ContentPlanningPermissions | null;
  members: MarketingPlanMember[];
  plans: ContentPlanItem[];
}> {
  await ensureContentPlanningSchema();

  const now = new Date();
  const targetYear =
    Number.isInteger(yearCe) && (yearCe as number) >= 2020 && (yearCe as number) <= 2100
      ? (yearCe as number)
      : now.getFullYear();
  const targetMonth =
    Number.isInteger(month1Based) && (month1Based as number) >= 1 && (month1Based as number) <= 12
      ? (month1Based as number)
      : now.getMonth() + 1;

  const { user, permissions } = await resolveContentPlanningPermissions();
  if (!user || !permissions || !permissions.canAccess) {
    return {
      success: false,
      error: !user
        ? 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
        : '403 Forbidden: หน้านี้สำหรับทีมการตลาดและผู้บริหารเท่านั้น',
      year: targetYear,
      month: targetMonth,
      permissions: null,
      members: [],
      plans: [],
    };
  }

  try {
    const [activeUsers, hrData, rawPlans] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          role: true,
          position: true,
          employeeSale: { select: { department: true, nickname: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      getHrLookupCached(),
      prisma.marketingContentPlan.findMany({
        where: {
          planYear: targetYear,
          planMonth: targetMonth,
        },
        include: {
          coOwners: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: [{ postDate: 'asc' }, { postTime: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const memberMap = new Map<string, MarketingPlanMember>();
    for (const u of activeUsers) {
      const hrMatch = findHrMatch(hrData, u);
      const hrDept = hrMatch?.departments?.name || null;
      if (!hasMarketingIdentity(u, hrDept)) continue;

      const nickname = hrMatch?.nickname?.trim() || u.employeeSale?.nickname?.trim() || null;
      memberMap.set(u.id, {
        userId: u.id,
        employeeId: u.employeeId,
        fullName: u.fullName,
        nickname,
        role: u.role,
        position: u.position || null,
        isMarketingManager: isMarketingManager(u.role) && !isSuperUser(u.role),
        isActive: true,
      });
    }

    // Also include any historical owner / co-owner or Admin who already owns plans in this month
    for (const p of rawPlans) {
      if (!memberMap.has(p.primaryOwnerId)) {
        memberMap.set(p.primaryOwnerId, {
          userId: p.primaryOwnerId,
          employeeId: '',
          fullName: p.primaryOwnerName,
          nickname: null,
          role: 'Marketing',
          position: null,
          isMarketingManager: false,
          isActive: false,
        });
      }
      for (const co of p.coOwners) {
        if (!memberMap.has(co.userId)) {
          memberMap.set(co.userId, {
            userId: co.userId,
            employeeId: co.employeeId || '',
            fullName: co.userName,
            nickname: null,
            role: 'Marketing',
            position: null,
            isMarketingManager: false,
            isActive: false,
          });
        }
      }
    }

    const members = Array.from(memberMap.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.isMarketingManager !== b.isMarketingManager) return a.isMarketingManager ? 1 : -1;
      return a.fullName.localeCompare(b.fullName, 'th');
    });

    const plans = sortContentPlansChronologically(rawPlans.map(serializePlanRow));

    return {
      success: true,
      year: targetYear,
      month: targetMonth,
      permissions,
      members,
      plans,
    };
  } catch (error: unknown) {
    console.error('[ContentPlanning] getContentPlanningWorkspace error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลวางแผนคอนเทนต์ได้',
      year: targetYear,
      month: targetMonth,
      permissions,
      members: [],
      plans: [],
    };
  }
}

export interface UpsertContentPlanInput {
  primaryOwnerId: string;
  coOwnerIds: string[];
  title: string;
  contentDetail?: string | null;
  caption?: string | null;
  postDate: string;
  postTime?: string | null;
  channels: string[];
}

async function prepareValidatedPlanData(
  input: UpsertContentPlanInput,
  fallbackUser: { id: string; fullName: string }
) {
  const title = (input.title || '').trim();
  if (!title) {
    return { ok: false as const, error: 'กรุณาระบุหัวข้อคอนเทนต์' };
  }
  if (title.length > 255) {
    return { ok: false as const, error: 'หัวข้อคอนเทนต์ต้องไม่เกิน 255 ตัวอักษร' };
  }

  const scheduleCheck = normalizePostDateAndTime(input.postDate, input.postTime);
  if (!scheduleCheck.ok) {
    return { ok: false as const, error: scheduleCheck.error };
  }

  const channels = sanitizeContentPlanChannels(input.channels);
  if (channels.length === 0) {
    return { ok: false as const, error: 'กรุณาเลือกช่องทางการโพสต์อย่างน้อย 1 ช่องทาง' };
  }

  const primaryOwnerId = (input.primaryOwnerId || fallbackUser.id).trim();
  const uniqueCoOwnerIds = Array.from(
    new Set(
      (Array.isArray(input.coOwnerIds) ? input.coOwnerIds : [])
        .map(id => (typeof id === 'string' ? id.trim() : ''))
        .filter(id => Boolean(id) && id !== primaryOwnerId)
    )
  );

  const userLookupIds = Array.from(new Set([primaryOwnerId, ...uniqueCoOwnerIds]));
  const matchedUsers = await prisma.user.findMany({
    where: { id: { in: userLookupIds } },
    select: { id: true, fullName: true, employeeId: true },
  });
  const userMap = new Map(matchedUsers.map(u => [u.id, u]));

  const primaryUser = userMap.get(primaryOwnerId);
  if (!primaryUser) {
    return { ok: false as const, error: 'ไม่พบข้อมูลผู้รับผิดชอบหลักในระบบ' };
  }

  const coOwnerRows = uniqueCoOwnerIds
    .map(id => userMap.get(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map(u => ({
      userId: u.id,
      userName: u.fullName,
      employeeId: u.employeeId,
    }));

  return {
    ok: true as const,
    data: {
      planYear: scheduleCheck.planYear,
      planMonth: scheduleCheck.planMonth,
      primaryOwnerId: primaryUser.id,
      primaryOwnerName: primaryUser.fullName,
      title,
      contentDetail: (input.contentDetail || '').trim() || null,
      caption: (input.caption || '').trim() || null,
      postDate: scheduleCheck.postDate,
      postTime: scheduleCheck.postTime,
      channels,
      coOwnerRows,
    },
  };
}

export async function createContentPlanItem(input: UpsertContentPlanInput): Promise<{
  success: boolean;
  error?: string;
  data?: ContentPlanItem;
}> {
  await ensureContentPlanningSchema();

  const { user, permissions } = await resolveContentPlanningPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }
  if (!permissions.canCreate) {
    return {
      success: false,
      error: '403 Forbidden: คุณไม่มีสิทธิ์เพิ่มรายการในแพลนคอนเทนต์',
    };
  }

  const prepared = await prepareValidatedPlanData(input, {
    id: user.id,
    fullName: permissions.userName,
  });
  if (!prepared.ok) {
    return { success: false, error: prepared.error };
  }

  try {
    const created = await prisma.marketingContentPlan.create({
      data: {
        planYear: prepared.data.planYear,
        planMonth: prepared.data.planMonth,
        primaryOwnerId: prepared.data.primaryOwnerId,
        primaryOwnerName: prepared.data.primaryOwnerName,
        title: prepared.data.title,
        contentDetail: prepared.data.contentDetail,
        caption: prepared.data.caption,
        postDate: prepared.data.postDate,
        postTime: prepared.data.postTime,
        channels: prepared.data.channels,
        createdById: user.id,
        createdByName: permissions.userName,
        updatedById: user.id,
        updatedByName: permissions.userName,
        coOwners:
          prepared.data.coOwnerRows.length > 0
            ? {
                createMany: {
                  data: prepared.data.coOwnerRows,
                },
              }
            : undefined,
      },
      include: {
        coOwners: { orderBy: { createdAt: 'asc' } },
      },
    });

    revalidatePath('/marketing-board/content-planning');
    return { success: true, data: serializePlanRow(created) };
  } catch (error: unknown) {
    console.error('[ContentPlanning] createContentPlanItem error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ไม่สามารถบันทึกรายการแพลนคอนเทนต์ได้',
    };
  }
}

export async function updateContentPlanItem(
  planId: string,
  input: UpsertContentPlanInput
): Promise<{
  success: boolean;
  error?: string;
  data?: ContentPlanItem;
}> {
  await ensureContentPlanningSchema();

  const { user, permissions } = await resolveContentPlanningPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }
  if (!permissions.canCreate) {
    return {
      success: false,
      error: '403 Forbidden: คุณไม่มีสิทธิ์แก้ไขรายการแพลนคอนเทนต์',
    };
  }

  const existing = await prisma.marketingContentPlan.findUnique({
    where: { id: planId },
    include: { coOwners: true },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบรายการแพลนคอนเทนต์นี้' };
  }

  if (
    !canUserModifyContentPlan(
      {
        primaryOwnerId: existing.primaryOwnerId,
        coOwners: existing.coOwners.map(co => ({
          userId: co.userId,
          userName: co.userName,
          employeeId: co.employeeId,
        })),
      },
      permissions
    )
  ) {
    return {
      success: false,
      error:
        '403 Forbidden: สามารถแก้ไขได้เฉพาะงานที่คุณเป็นผู้รับผิดชอบหลัก หรือผู้รับผิดชอบร่วมเท่านั้น',
    };
  }

  const prepared = await prepareValidatedPlanData(input, {
    id: user.id,
    fullName: permissions.userName,
  });
  if (!prepared.ok) {
    return { success: false, error: prepared.error };
  }

  try {
    const updated = await prisma.$transaction(async tx => {
      await tx.marketingContentPlanCoOwner.deleteMany({
        where: { planId },
      });

      return tx.marketingContentPlan.update({
        where: { id: planId },
        data: {
          planYear: prepared.data.planYear,
          planMonth: prepared.data.planMonth,
          primaryOwnerId: prepared.data.primaryOwnerId,
          primaryOwnerName: prepared.data.primaryOwnerName,
          title: prepared.data.title,
          contentDetail: prepared.data.contentDetail,
          caption: prepared.data.caption,
          postDate: prepared.data.postDate,
          postTime: prepared.data.postTime,
          channels: prepared.data.channels,
          updatedById: user.id,
          updatedByName: permissions.userName,
          coOwners:
            prepared.data.coOwnerRows.length > 0
              ? {
                  createMany: {
                    data: prepared.data.coOwnerRows,
                  },
                }
              : undefined,
        },
        include: {
          coOwners: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    revalidatePath('/marketing-board/content-planning');
    return { success: true, data: serializePlanRow(updated) };
  } catch (error: unknown) {
    console.error('[ContentPlanning] updateContentPlanItem error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ไม่สามารถแก้ไขรายการแพลนคอนเทนต์ได้',
    };
  }
}

export async function deleteContentPlanItem(planId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  await ensureContentPlanningSchema();

  const { user, permissions } = await resolveContentPlanningPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }
  if (!permissions.canCreate) {
    return {
      success: false,
      error: '403 Forbidden: คุณไม่มีสิทธิ์ลบรายการแพลนคอนเทนต์',
    };
  }

  const existing = await prisma.marketingContentPlan.findUnique({
    where: { id: planId },
    include: { coOwners: true },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบรายการแพลนคอนเทนต์นี้' };
  }

  if (
    !canUserModifyContentPlan(
      {
        primaryOwnerId: existing.primaryOwnerId,
        coOwners: existing.coOwners.map(co => ({
          userId: co.userId,
          userName: co.userName,
          employeeId: co.employeeId,
        })),
      },
      permissions
    )
  ) {
    return {
      success: false,
      error:
        '403 Forbidden: สามารถลบได้เฉพาะงานที่คุณเป็นผู้รับผิดชอบหลัก หรือผู้รับผิดชอบร่วมเท่านั้น',
    };
  }

  try {
    await prisma.marketingContentPlan.delete({
      where: { id: planId },
    });

    revalidatePath('/marketing-board/content-planning');
    return { success: true };
  } catch (error: unknown) {
    console.error('[ContentPlanning] deleteContentPlanItem error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ไม่สามารถลบรายการแพลนคอนเทนต์ได้',
    };
  }
}
