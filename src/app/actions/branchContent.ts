'use server';

import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  isSuperUser,
  isMarketingManager,
  isMarketingStaff,
  isReadOnlyExecutive,
  isSupervisorOrManager,
  matchBranch,
} from '@/app/lib/roleHelper';
import type {
  BranchContentItem,
  BranchContentKPI,
  BranchContentPermissions,
  BranchContentStatus,
  BranchMasterItem,
  BranchStatRow,
} from '@/app/lib/branchContentTypes';

const REQUIRED_11_BRANCHES = [
  { id: 'KK01', name: 'ขอนแก่น', lat: 16.4322, lon: 102.8236 },
  { id: 'SRN01', name: 'สุรินทร์', lat: 14.8818, lon: 103.4936 },
  { id: 'SRT01', name: 'สุราษฎร์ธานี', lat: 9.1382, lon: 99.3217 },
  { id: 'ROI01', name: 'ร้อยเอ็ด', lat: 16.0538, lon: 103.6520 },
  { id: 'UB01', name: 'อุบลราชธานี', lat: 15.2287, lon: 104.8564 },
  { id: 'UDN01', name: 'อุดรธานี', lat: 17.4138, lon: 102.7872 },
  { id: 'KRI01', name: 'กาญจนบุรี', lat: 14.0228, lon: 99.5328 },
  { id: 'PSNL01', name: 'พิษณุโลก', lat: 16.8211, lon: 100.2659 },
  { id: 'SN01', name: 'สกลนคร', lat: 17.1546, lon: 104.1348 },
  { id: 'NMA01', name: 'นครราชสีมา', lat: 14.9799, lon: 102.0978 },
  { id: 'NRT01', name: 'นครศรีธรรมราช', lat: 8.4304, lon: 99.9631 },
];

let schemaInitialized = false;

/**
 * Ensures database tables and the 11 required branches in Branch Master Data exist.
 */
async function ensureBranchContentSchema() {
  if (schemaInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS branch_contents (
        id TEXT PRIMARY KEY,
        content_no VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        branch_id VARCHAR(30) NOT NULL,
        branch_name VARCHAR(150) NOT NULL,
        created_by_id TEXT NOT NULL,
        created_by_name VARCHAR(150) NOT NULL,
        assignee_id TEXT,
        assignee_name VARCHAR(150),
        content_type VARCHAR(50) NOT NULL DEFAULT 'SINGLE_IMAGE',
        product_group VARCHAR(100) NOT NULL DEFAULT 'General',
        objective VARCHAR(100),
        target_channels JSONB DEFAULT '[]'::jsonb,
        media_format VARCHAR(50),
        caption TEXT,
        description TEXT,
        call_to_action VARCHAR(255),
        reference_url TEXT,
        submission_due_date TIMESTAMPTZ,
        planned_publish_date TIMESTAMPTZ,
        status VARCHAR(30) NOT NULL DEFAULT 'BACKLOG',
        review_sub_status VARCHAR(30),
        current_version INTEGER NOT NULL DEFAULT 1,
        revision_count INTEGER NOT NULL DEFAULT 0,
        submitted_at TIMESTAMPTZ,
        reviewer_id TEXT,
        reviewer_name VARCHAR(150),
        reviewed_at TIMESTAMPTZ,
        review_feedback TEXT,
        approved_by_id TEXT,
        approved_by_name VARCHAR(150),
        approved_at TIMESTAMPTZ,
        approval_note TEXT,
        actual_channel VARCHAR(100),
        actual_publish_date TIMESTAMPTZ,
        published_url TEXT,
        published_by_name VARCHAR(150),
        cancel_reason TEXT,
        cancelled_by_name VARCHAR(150),
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_branch_contents_branch_id ON branch_contents(branch_id);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_branch_name ON branch_contents(branch_name);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_status ON branch_contents(status);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_product_group ON branch_contents(product_group);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_planned_date ON branch_contents(planned_publish_date);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_due_date ON branch_contents(submission_due_date);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_creator ON branch_contents(created_by_id);
      CREATE INDEX IF NOT EXISTS idx_branch_contents_assignee ON branch_contents(assignee_id);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS branch_content_media (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL REFERENCES branch_contents(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        file_type VARCHAR(30) NOT NULL DEFAULT 'IMAGE',
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        mime_type VARCHAR(100),
        uploaded_by_id TEXT,
        uploaded_by_name VARCHAR(150),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_branch_content_media_cid ON branch_content_media(content_id);
      CREATE INDEX IF NOT EXISTS idx_branch_content_media_ver ON branch_content_media(version);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS branch_content_comments (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL REFERENCES branch_contents(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        user_name VARCHAR(150) NOT NULL,
        user_role VARCHAR(100),
        version INTEGER NOT NULL DEFAULT 1,
        comment_type VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_branch_content_comments_cid ON branch_content_comments(content_id);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS branch_content_logs (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL REFERENCES branch_contents(id) ON DELETE CASCADE,
        user_id TEXT,
        user_name VARCHAR(150),
        user_role VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        from_status VARCHAR(30),
        to_status VARCHAR(30),
        version INTEGER NOT NULL DEFAULT 1,
        details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_branch_content_logs_cid ON branch_content_logs(content_id);
    `);

    // Ensure the 11 branches exist in branches Master Data table
    const existingBranches = await prisma.branches.findMany({
      select: { id: true, name: true },
    });

    for (const reqBranch of REQUIRED_11_BRANCHES) {
      const exists = existingBranches.some(
        b =>
          b.id.toUpperCase() === reqBranch.id.toUpperCase() ||
          b.name.includes(reqBranch.name) ||
          matchBranch(b.name, reqBranch.name)
      );
      if (!exists) {
        await prisma.branches
          .create({
            data: {
              id: reqBranch.id,
              name: reqBranch.name,
              center_lat: reqBranch.lat,
              center_lon: reqBranch.lon,
              radius_m: 200,
            },
          })
          .catch(() => {});
      }
    }

    schemaInitialized = true;
  } catch (err) {
    console.error('[BranchContent] ensureBranchContentSchema error:', err);
  }
}

/**
 * Fetches the active regional branches from Master Data (excluding HQ / Warehouse).
 */
export async function getBranchMasterData(): Promise<BranchMasterItem[]> {
  await ensureBranchContentSchema();

  const rawBranches = await prisma.branches.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  // Filter out HQ / Warehouse / Chiangmai / Samutsakhon to keep strictly the 11 active regional branches
  const excludedKeywords = [
    'สำนักงานใหญ่',
    'headquarter',
    'hq',
    'warehouse',
    'wh62',
    'bkk',
    'เชียงใหม่',
    'chiangmai',
    'cmi',
    'สมุทรสาคร',
    'samutsakhon',
    'smk',
  ];
  const activeBranches = rawBranches.filter(b => {
    const lowerName = b.name.toLowerCase();
    const lowerId = b.id.toLowerCase();
    return !excludedKeywords.some(kw => lowerName.includes(kw) || lowerId.includes(kw));
  });

  // Sort following standard 11-branch priority first, then any additional dynamic branches from Master Data
  const orderNames = REQUIRED_11_BRANCHES.map(b => b.name);
  const sorted = activeBranches.sort((a, b) => {
    const idxA = orderNames.findIndex(n => a.name.includes(n) || matchBranch(a.name, n));
    const idxB = orderNames.findIndex(n => b.name.includes(n) || matchBranch(b.name, n));
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name, 'th');
  });

  return sorted.map(b => ({
    id: b.id,
    name: b.name.replace(/^สาขา\s*/, '').trim(),
    code: b.id.toUpperCase(),
  }));
}

/**
 * Resolves user role & branch permissions on the backend.
 */
export async function resolveUserBranchPermissions(): Promise<{
  user: any | null;
  permissions: BranchContentPermissions | null;
  branches: BranchMasterItem[];
}> {
  const user = await getUser();
  const branches = await getBranchMasterData();

  if (!user) {
    return { user: null, permissions: null, branches };
  }

  const role = user.role || '';
  const sysAdmin = isSuperUser(role);
  const approver = isMarketingManager(role) || sysAdmin;
  const reviewer = isMarketingStaff(role) || isReadOnlyExecutive(role) || approver;
  const branchMgr = isSupervisorOrManager(role) && !reviewer;

  const findMatchingBranch = (candidate?: string | null): BranchMasterItem | undefined => {
    if (!candidate) return undefined;
    return branches.find(
      b =>
        matchBranch(b.name, candidate) ||
        matchBranch(b.id, candidate) ||
        b.name.includes(candidate) ||
        candidate.includes(b.name)
    );
  };

  let rawUserBranch: string | null = user.employeeSale?.branch || null;
  let matchedBranch: BranchMasterItem | undefined = findMatchingBranch(rawUserBranch);

  // 1. Check HR database (`teraDb.employees` and `prisma.employees`) if not matched yet
  if (!matchedBranch) {
    try {
      const cleanFullName = (user.fullName || '')
        .replace(/^(นาย|นางสาว|นาง|คุณ|ดร\.)\s*/g, '')
        .trim();

      const hrEmp = await teraDb.employees
        .findFirst({
          where: {
            OR: [
              ...(user.employeeId ? [{ emp_id: user.employeeId }] : []),
              ...(user.email ? [{ email: user.email }] : []),
              ...(cleanFullName ? [{ name: { contains: cleanFullName } }] : []),
            ],
          },
          select: {
            emp_id: true,
            branch_id: true,
          },
        })
        .catch(() => null);

      if (hrEmp) {
        const candidate = hrEmp.branch_id || null;
        const found = findMatchingBranch(candidate);
        if (found) {
          matchedBranch = found;
          rawUserBranch = found.name;
        } else if (!rawUserBranch && candidate) {
          rawUserBranch = candidate;
        }
      }
    } catch {
      // ignore HR lookup errors
    }
  }

  // 2. If user is a Branch Manager and still hasn't matched one of the 11 branches,
  // check their subordinates in HR (`teraDb.employees`) and CRM (`prisma.user.employeeSale`)
  if (!matchedBranch && branchMgr) {
    try {
      if (user.employeeId) {
        const subEmps = await teraDb.employees
          .findMany({
            where: {
              OR: [
                { supervisor_id: user.employeeId },
                { secondary_supervisor_id: user.employeeId },
              ],
              is_active: true,
            },
            select: {
              emp_id: true,
              branch_id: true,
            },
          })
          .catch(() => []);

        for (const sub of subEmps) {
          const found = findMatchingBranch(sub.branch_id);
          if (found) {
            matchedBranch = found;
            rawUserBranch = found.name;
            break;
          }
        }
      }

      if (!matchedBranch && user.fullName) {
        const subSales = await prisma.user
          .findMany({
            where: {
              isActive: true,
              employeeSale: { teamLeader: user.fullName },
            },
            select: {
              employeeSale: { select: { branch: true } },
            },
          })
          .catch(() => []);

        for (const s of subSales) {
          const found = findMatchingBranch(s.employeeSale?.branch);
          if (found) {
            matchedBranch = found;
            rawUserBranch = found.name;
            break;
          }
        }
      }
    } catch {
      // ignore subordinate lookup errors
    }
  }

  // Fallback for branch users whose branch string isn't matched yet
  const userBranchId = matchedBranch?.id || null;
  const userBranchName =
    matchedBranch?.name ||
    (rawUserBranch ? rawUserBranch.replace(/^สาขา\s*/, '').trim() : null);

  let roleLabel = 'Branch Staff (พนักงานสาขา)';
  if (sysAdmin) roleLabel = 'System Admin (ผู้ดูแลระบบ)';
  else if (approver) roleLabel = 'Marketing Approver (ผู้จัดการการตลาด)';
  else if (reviewer) roleLabel = 'Marketing Reviewer (เจ้าหน้าที่การตลาด)';
  else if (branchMgr) roleLabel = 'Branch Manager (ผู้จัดการ/หัวหน้าสาขา)';

  // Strictly restrict all-branch view to HQ Marketing, Executive, and System Admin only!
  // Branch Manager (`ผู้จัดการสาขา`) and Branch Staff (`พนักงานสาขา`) MUST only see their own branch.
  const canViewAllBranches = sysAdmin || approver || reviewer;

  return {
    user,
    branches,
    permissions: {
      userId: user.id,
      userName: user.fullName || user.email || 'Unknown',
      userRole: role,
      roleLabel,
      userBranchId,
      userBranchName,
      canViewAllBranches,
      canBranchApprove: branchMgr || sysAdmin || approver,
      canReview: reviewer,
      canApprove: approver,
      isSystemAdmin: sysAdmin,
      isBranchManager: branchMgr,
    },
  };
}

function checkIsOverdue(item: {
  status: string;
  submissionDueDate?: Date | string | null;
  plannedPublishDate?: Date | string | null;
}): boolean {
  if (item.status === 'PUBLISHED' || item.status === 'CANCELLED') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (
    (item.status === 'BACKLOG' || item.status === 'IN_PROGRESS' || item.status === 'REVISE') &&
    item.submissionDueDate
  ) {
    const due = new Date(item.submissionDueDate);
    if (due < now) return true;
  }

  if (item.plannedPublishDate) {
    const pubDue = new Date(item.plannedPublishDate);
    if (pubDue < now) return true;
  }

  return false;
}

function serializeContentItem(raw: any): BranchContentItem {
  const isOverdue = checkIsOverdue(raw);
  let channels: string[] = [];
  if (Array.isArray(raw.targetChannels)) {
    channels = raw.targetChannels.map(String);
  } else if (typeof raw.targetChannels === 'string') {
    try {
      const parsed = JSON.parse(raw.targetChannels);
      if (Array.isArray(parsed)) channels = parsed.map(String);
    } catch {
      channels = [raw.targetChannels];
    }
  }

  return {
    id: raw.id,
    contentNo: raw.contentNo,
    title: raw.title,
    branchId: raw.branchId,
    branchName: raw.branchName,
    createdById: raw.createdById,
    createdByName: raw.createdByName,
    assigneeId: raw.assigneeId,
    assigneeName: raw.assigneeName,
    contentType: raw.contentType,
    productGroup: raw.productGroup,
    objective: raw.objective,
    targetChannels: channels,
    mediaFormat: raw.mediaFormat,
    caption: raw.caption,
    description: raw.description,
    callToAction: raw.callToAction,
    referenceUrl: raw.referenceUrl,
    submissionDueDate: raw.submissionDueDate ? new Date(raw.submissionDueDate).toISOString() : null,
    plannedPublishDate: raw.plannedPublishDate ? new Date(raw.plannedPublishDate).toISOString() : null,
    status: (raw.status || 'BACKLOG') as BranchContentStatus,
    reviewSubStatus: raw.reviewSubStatus || null,
    currentVersion: raw.currentVersion || 1,
    revisionCount: raw.revisionCount || 0,
    submittedAt: raw.submittedAt ? new Date(raw.submittedAt).toISOString() : null,
    reviewerId: raw.reviewerId,
    reviewerName: raw.reviewerName,
    reviewedAt: raw.reviewedAt ? new Date(raw.reviewedAt).toISOString() : null,
    reviewFeedback: raw.reviewFeedback,
    approvedById: raw.approvedById,
    approvedByName: raw.approvedByName,
    approvedAt: raw.approvedAt ? new Date(raw.approvedAt).toISOString() : null,
    approvalNote: raw.approvalNote,
    actualChannel: raw.actualChannel,
    actualPublishDate: raw.actualPublishDate ? new Date(raw.actualPublishDate).toISOString() : null,
    publishedUrl: raw.publishedUrl,
    publishedByName: raw.publishedByName,
    cancelReason: raw.cancelReason,
    cancelledByName: raw.cancelledByName,
    cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt).toISOString() : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    isOverdue,
    media: (raw.media || []).map((m: any) => ({
      id: m.id,
      contentId: m.contentId,
      version: m.version || 1,
      fileType: m.fileType || 'IMAGE',
      fileName: m.fileName,
      fileUrl: m.fileUrl,
      thumbnailUrl: m.thumbnailUrl,
      fileSize: Number(m.fileSize || 0),
      mimeType: m.mimeType,
      uploadedById: m.uploadedById,
      uploadedByName: m.uploadedByName,
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    })),
    comments: (raw.comments || []).map((c: any) => ({
      id: c.id,
      contentId: c.contentId,
      userId: c.userId,
      userName: c.userName,
      userRole: c.userRole,
      version: c.version || 1,
      commentType: c.commentType || 'GENERAL',
      message: c.message,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    })),
    logs: (raw.logs || []).map((l: any) => ({
      id: l.id,
      contentId: l.contentId,
      userId: l.userId,
      userName: l.userName,
      userRole: l.userRole,
      action: l.action,
      fromStatus: l.fromStatus,
      toStatus: l.toStatus,
      version: l.version || 1,
      details: l.details,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    })),
  };
}

/**
 * Generates an automatic Content ID e.g. BC69-KK01-0001
 */
async function generateContentNo(branchId: string): Promise<string> {
  const thaiYear = (new Date().getFullYear() + 543).toString().slice(-2);
  const cleanCode = (branchId || 'BR').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  const prefix = `BC${thaiYear}-${cleanCode}-`;

  const latest = await prisma.branchContent.findFirst({
    where: { contentNo: { startsWith: prefix } },
    orderBy: { contentNo: 'desc' },
    select: { contentNo: true },
  });

  let nextNum = 1;
  if (latest?.contentNo) {
    const parts = latest.contentNo.split('-');
    const lastPart = parts[parts.length - 1];
    const parsed = parseInt(lastPart, 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Computes real-time KPI & Analytics from actual database records (no mock numbers).
 */
function computeBranchContentKPI(
  contents: BranchContentItem[],
  branches: BranchMasterItem[]
): BranchContentKPI {
  let backlog = 0;
  let inProgress = 0;
  let pendingReview = 0;
  let approve1 = 0;
  let endorsedForApproval = 0;
  let revise = 0;
  let approved = 0;
  let published = 0;
  let cancelled = 0;
  let overdue = 0;
  let totalRevisionSum = 0;
  let reviewedItemsCount = 0;
  let totalReviewDurationHours = 0;
  let reviewDurationSamples = 0;

  const branchMap = new Map<string, BranchStatRow>();
  branches.forEach(b => {
    branchMap.set(b.id, {
      branchId: b.id,
      branchName: b.name,
      total: 0,
      backlog: 0,
      inProgress: 0,
      pendingReview: 0,
      approve1: 0,
      endorsed: 0,
      revise: 0,
      approved: 0,
      published: 0,
      cancelled: 0,
      overdue: 0,
      totalRevisions: 0,
      avgRevisionCount: 0,
    });
  });

  const channelMap = new Map<string, { count: number; publishedCount: number }>();
  const monthlyMap = new Map<string, { label: string; created: number; published: number }>();

  contents.forEach(item => {
    if (item.status === 'BACKLOG') backlog++;
    else if (item.status === 'IN_PROGRESS') inProgress++;
    else if (item.status === 'PENDING_REVIEW') {
      pendingReview++;
    } else if (item.status === 'APPROVE_1') {
      approve1++;
      if (item.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER') endorsedForApproval++;
    } else if (item.status === 'REVISE') revise++;
    else if (item.status === 'APPROVED') approved++;
    else if (item.status === 'PUBLISHED') published++;
    else if (item.status === 'CANCELLED') cancelled++;

    if (item.isOverdue) overdue++;

    if (item.revisionCount > 0 || ['PENDING_REVIEW', 'APPROVE_1', 'REVISE', 'APPROVED', 'PUBLISHED'].includes(item.status)) {
      totalRevisionSum += item.revisionCount || 0;
      reviewedItemsCount++;
    }

    if (item.submittedAt && (item.reviewedAt || item.approvedAt)) {
      const subTime = new Date(item.submittedAt).getTime();
      const revTime = new Date((item.reviewedAt || item.approvedAt)!).getTime();
      if (revTime > subTime) {
        const hrs = (revTime - subTime) / (1000 * 60 * 60);
        totalReviewDurationHours += hrs;
        reviewDurationSamples++;
      }
    }

    // Match branch row
    let bRow = branchMap.get(item.branchId);
    if (!bRow) {
      for (const [, row] of branchMap.entries()) {
        if (matchBranch(row.branchName, item.branchName) || matchBranch(row.branchId, item.branchId)) {
          bRow = row;
          break;
        }
      }
    }
    if (!bRow) {
      bRow = {
        branchId: item.branchId,
        branchName: item.branchName,
        total: 0,
        backlog: 0,
        inProgress: 0,
        pendingReview: 0,
        approve1: 0,
        endorsed: 0,
        revise: 0,
        approved: 0,
        published: 0,
        cancelled: 0,
        overdue: 0,
        totalRevisions: 0,
        avgRevisionCount: 0,
      };
      branchMap.set(item.branchId, bRow);
    }

    bRow.total++;
    if (item.status === 'BACKLOG') bRow.backlog++;
    else if (item.status === 'IN_PROGRESS') bRow.inProgress++;
    else if (item.status === 'PENDING_REVIEW') {
      bRow.pendingReview++;
    } else if (item.status === 'APPROVE_1') {
      bRow.approve1++;
      if (item.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER') bRow.endorsed++;
    } else if (item.status === 'REVISE') bRow.revise++;
    else if (item.status === 'APPROVED') bRow.approved++;
    else if (item.status === 'PUBLISHED') bRow.published++;
    else if (item.status === 'CANCELLED') bRow.cancelled++;

    if (item.isOverdue) bRow.overdue++;
    bRow.totalRevisions += item.revisionCount || 0;

    // Channel stats
    const itemChannels = item.targetChannels?.length ? item.targetChannels : (item.actualChannel ? [item.actualChannel] : ['ไม่ระบุช่องทาง']);
    itemChannels.forEach(ch => {
      const curr = channelMap.get(ch) || { count: 0, publishedCount: 0 };
      curr.count++;
      if (item.status === 'PUBLISHED') curr.publishedCount++;
      channelMap.set(ch, curr);
    });

    // Monthly stats
    const d = new Date(item.plannedPublishDate || item.createdAt);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;
      const label = d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
      const mCurr = monthlyMap.get(monthKey) || { label, created: 0, published: 0 };
      mCurr.created++;
      if (item.status === 'PUBLISHED') mCurr.published++;
      monthlyMap.set(monthKey, mCurr);
    }
  });

  const branchStats = Array.from(branchMap.values()).map(r => ({
    ...r,
    avgRevisionCount: r.total > 0 ? Number((r.totalRevisions / r.total).toFixed(2)) : 0,
  }));

  const channelBreakdown = Array.from(channelMap.entries())
    .map(([channel, stats]) => ({ channel, ...stats }))
    .sort((a, b) => b.count - a.count);

  const monthlyBreakdown = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, stats]) => ({ monthKey, ...stats }));

  return {
    total: contents.length,
    backlog,
    inProgress,
    pendingReview,
    approve1,
    endorsedForApproval,
    revise,
    approved,
    published,
    cancelled,
    overdue,
    avgRevisionRate: reviewedItemsCount > 0 ? Number((totalRevisionSum / reviewedItemsCount).toFixed(2)) : 0,
    avgReviewHours: reviewDurationSamples > 0 ? Number((totalReviewDurationHours / reviewDurationSamples).toFixed(1)) : 0,
    branchStats,
    channelBreakdown,
    monthlyBreakdown,
  };
}

/**
 * Fetches Branch Content Board data with strict backend access control.
 */
export async function getBranchContentBoardData() {
  await ensureBranchContentSchema();

  const { user, permissions, branches } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return {
      success: false,
      error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
      contents: [] as BranchContentItem[],
      branches,
      staffOptions: [] as { id: string; name: string; branch: string | null }[],
      permissions: null,
      kpi: computeBranchContentKPI([], branches),
    };
  }

  try {
    const rawContents = await prisma.branchContent.findMany({
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    // Strict Backend Access Control:
    // If user is NOT Marketing/Admin, filter strictly to their assigned branch!
    const authorizedContents = rawContents.filter(c => {
      if (permissions.canViewAllBranches) return true;
      if (c.createdById === user.id || c.assigneeId === user.id) return true;
      if (!permissions.userBranchName && !permissions.userBranchId) return false;
      return (
        matchBranch(c.branchId, permissions.userBranchId) ||
        matchBranch(c.branchName, permissions.userBranchName) ||
        matchBranch(c.branchName, permissions.userBranchId)
      );
    });

    const serialized = authorizedContents.map(serializeContentItem);

    // Fetch active staff for assignee selector (combining CRM Users + HR Employees for accurate branch & nickname)
    const [usersWithBranch, hrEmployees] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          employeeSale: { select: { branch: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      teraDb.employees
        .findMany({
          where: { is_active: true },
          select: {
            emp_id: true,
            name: true,
            nickname: true,
            branch_id: true,
            email: true,
          },
        })
        .catch(() => []),
    ]);

    const cleanPersonName = (n?: string | null) =>
      (n || '').replace(/^(นาย|นางสาว|นาง|คุณ|ดร\.)\s*/g, '').trim();

    const matchedEmpIds = new Set<string>();
    const staffOptions: {
      id: string;
      name: string;
      nickname?: string | null;
      branch: string | null;
    }[] = [];

    for (const u of usersWithBranch) {
      const cleanedU = cleanPersonName(u.fullName);
      const hrEmp = hrEmployees.find(
        h =>
          (u.employeeId && h.emp_id === u.employeeId) ||
          (u.email && h.email && u.email.toLowerCase() === h.email.toLowerCase()) ||
          (cleanedU && cleanPersonName(h.name) === cleanedU)
      );

      if (hrEmp?.emp_id) matchedEmpIds.add(hrEmp.emp_id);

      const rawBranch = hrEmp?.branch_id || u.employeeSale?.branch || null;
      const matchedB = rawBranch
        ? branches.find(
            b =>
              matchBranch(b.id, rawBranch) ||
              matchBranch(b.name, rawBranch) ||
              b.name.includes(rawBranch) ||
              rawBranch.includes(b.name)
          )
        : undefined;

      const nickname = hrEmp?.nickname?.trim() || null;
      const hasNickInName = nickname && u.fullName.includes(`(${nickname})`);
      const formattedName =
        nickname && !hasNickInName ? `${u.fullName} (${nickname})` : u.fullName;

      staffOptions.push({
        id: u.id,
        name: formattedName,
        nickname,
        branch: matchedB ? matchedB.id : rawBranch,
      });
    }

    // Also include active HR branch employees who may not have a separate CRM user row yet
    for (const h of hrEmployees) {
      if (matchedEmpIds.has(h.emp_id)) continue;
      if (!h.branch_id) continue;
      const matchedB = branches.find(
        b => matchBranch(b.id, h.branch_id) || matchBranch(b.name, h.branch_id)
      );
      if (!matchedB) continue;

      const nickname = h.nickname?.trim() || null;
      const hasNickInName = nickname && h.name.includes(`(${nickname})`);
      const formattedName =
        nickname && !hasNickInName ? `${h.name} (${nickname})` : h.name;

      staffOptions.push({
        id: h.emp_id,
        name: formattedName,
        nickname,
        branch: matchedB.id,
      });
    }

    staffOptions.sort((a, b) => a.name.localeCompare(b.name, 'th'));

    // Strict Branch Scope for KPI and Branch Master list:
    // Branch Manager & Branch Staff (`!permissions.canViewAllBranches`) MUST ONLY see their own branch!
    const visibleBranches = permissions.canViewAllBranches
      ? branches
      : branches.filter(
          b =>
            (permissions.userBranchId && matchBranch(b.id, permissions.userBranchId)) ||
            (permissions.userBranchName && matchBranch(b.name, permissions.userBranchName))
        );

    const kpi = computeBranchContentKPI(serialized, visibleBranches);

    return {
      success: true,
      contents: serialized,
      branches: visibleBranches,
      staffOptions,
      permissions,
      kpi,
    };
  } catch (error: any) {
    console.error('[BranchContent] getBranchContentBoardData error:', error);
    return {
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล Branch Content Board',
      contents: [] as BranchContentItem[],
      branches,
      staffOptions: [] as { id: string; name: string; branch: string | null }[],
      permissions,
      kpi: computeBranchContentKPI([], branches),
    };
  }
}

/**
 * Create a new Branch Content card (Draft / Backlog / Submit directly).
 */
export async function createBranchContent(input: {
  title: string;
  branchId: string;
  assigneeId?: string;
  assigneeName?: string;
  contentType: string;
  productGroup: string;
  objective?: string;
  targetChannels: string[];
  mediaFormat?: string;
  caption?: string;
  description?: string;
  callToAction?: string;
  referenceUrl?: string;
  submissionDueDate?: string | null;
  plannedPublishDate?: string | null;
  initialStatus?: 'BACKLOG' | 'IN_PROGRESS' | 'PENDING_REVIEW';
  mediaFiles?: {
    fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    fileName: string;
    fileUrl: string;
    thumbnailUrl?: string;
    fileSize: number;
    mimeType?: string;
  }[];
}) {
  await ensureBranchContentSchema();

  const { user, permissions, branches } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  if (!input.title?.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อคอนเทนต์ / หัวข้องาน' };
  }

  // Enforce Branch Access Control on creation
  let targetBranch = branches.find(
    b => b.id === input.branchId || matchBranch(b.name, input.branchId) || matchBranch(b.id, input.branchId)
  );

  if (!permissions.canViewAllBranches) {
    // Branch Staff / Branch Manager can only create for their own branch
    if (permissions.userBranchId) {
      const userBranchObj = branches.find(
        b => b.id === permissions.userBranchId || matchBranch(b.name, permissions.userBranchName)
      );
      if (userBranchObj) {
        if (targetBranch && targetBranch.id !== userBranchObj.id) {
          return {
            success: false,
            error: `คุณสังกัดสาขา${userBranchObj.name} ไม่สามารถสร้างงานข้ามสาขาได้`,
          };
        }
        targetBranch = userBranchObj;
      }
    }
  }

  if (!targetBranch) {
    return { success: false, error: 'กรุณาเลือกสาขาที่ถูกต้องจากระบบ Master Data' };
  }

  const status = input.initialStatus || 'IN_PROGRESS';

  // Validate if submitting directly for review
  if (status === 'PENDING_REVIEW') {
    if (!input.caption?.trim() && (!input.mediaFiles || input.mediaFiles.length === 0)) {
      return {
        success: false,
        error: 'ก่อนส่งตรวจ (Submit for Review) กรุณากรอก Caption หรือแนบไฟล์สื่ออย่างน้อย 1 รายการ',
      };
    }
    if (!input.plannedPublishDate) {
      return {
        success: false,
        error: 'กรุณาระบุวันที่วางแผนเผยแพร่ (Planned Publish Date) ก่อนกดส่งตรวจ',
      };
    }
  }

  try {
    const contentNo = await generateContentNo(targetBranch.id);

    const created = await prisma.branchContent.create({
      data: {
        contentNo,
        title: input.title.trim(),
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        createdById: user.id,
        createdByName: permissions.userName,
        assigneeId: input.assigneeId || user.id,
        assigneeName: input.assigneeName || permissions.userName,
        contentType: input.contentType || 'SINGLE_IMAGE',
        productGroup: input.productGroup || 'General / ความรู้ทั่วไป',
        objective: input.objective || null,
        targetChannels: input.targetChannels || [],
        mediaFormat: input.mediaFormat || null,
        caption: input.caption || null,
        description: input.description || null,
        callToAction: input.callToAction || null,
        referenceUrl: input.referenceUrl || null,
        submissionDueDate: input.submissionDueDate ? new Date(input.submissionDueDate) : null,
        plannedPublishDate: input.plannedPublishDate ? new Date(input.plannedPublishDate) : null,
        status,
        reviewSubStatus: status === 'PENDING_REVIEW' ? 'WAITING_BRANCH_MANAGER' : null,
        currentVersion: 1,
        revisionCount: 0,
        submittedAt: status === 'PENDING_REVIEW' ? new Date() : null,
        media:
          input.mediaFiles && input.mediaFiles.length > 0
            ? {
                create: input.mediaFiles.map(m => ({
                  version: 1,
                  fileType: m.fileType,
                  fileName: m.fileName,
                  fileUrl: m.fileUrl,
                  thumbnailUrl: m.thumbnailUrl || null,
                  fileSize: m.fileSize || 0,
                  mimeType: m.mimeType || null,
                  uploadedById: user.id,
                  uploadedByName: permissions.userName,
                })),
              }
            : undefined,
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: status === 'PENDING_REVIEW' ? 'CREATED_AND_SUBMITTED' : 'CREATED',
            fromStatus: null,
            toStatus: status,
            version: 1,
            details:
              status === 'PENDING_REVIEW'
                ? `สร้างคอนเทนต์ ${contentNo} และส่งให้ผู้จัดการสาขาตรวจ (V1)`
                : `สร้างการ์ดคอนเทนต์ ${contentNo} สถานะ ${status}`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(created) };
  } catch (error: any) {
    console.error('[BranchContent] createBranchContent error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถสร้างคอนเทนต์ได้' };
  }
}

/**
 * Update existing Branch Content card details & media.
 */
export async function updateBranchContent(
  contentId: string,
  input: {
    title?: string;
    branchId?: string;
    assigneeId?: string;
    assigneeName?: string;
    contentType?: string;
    productGroup?: string;
    objective?: string;
    targetChannels?: string[];
    mediaFormat?: string;
    caption?: string;
    description?: string;
    callToAction?: string;
    referenceUrl?: string;
    submissionDueDate?: string | null;
    plannedPublishDate?: string | null;
    status?: BranchContentStatus;
    newMediaFiles?: {
      fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      fileName: string;
      fileUrl: string;
      thumbnailUrl?: string;
      fileSize: number;
      mimeType?: string;
    }[];
    removedMediaIds?: string[];
  }
) {
  await ensureBranchContentSchema();

  const { user, permissions, branches } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้ในระบบ' };
  }

  // Strict Backend Access Check
  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName) ||
      existing.createdById === user.id ||
      existing.assigneeId === user.id;

    if (!isSameBranch) {
      return {
        success: false,
        error: '403 Forbidden: คุณไม่มีสิทธิ์แก้ไขคอนเทนต์ของสาขาอื่น',
      };
    }

    // Lock version when in PENDING_REVIEW or APPROVE_1 for branch staff
    if (
      (existing.status === 'PENDING_REVIEW' || existing.status === 'APPROVE_1') &&
      input.status !== 'IN_PROGRESS' &&
      !permissions.canBranchApprove
    ) {
      return {
        success: false,
        error: 'คอนเทนต์นี้อยู่ระหว่างรอตรวจสอบ (ล็อกเวอร์ชัน) ไม่สามารถแก้ไขเนื้อหาได้จนกว่าจะส่งกลับแก้ไข',
      };
    }
  }

  try {
    let branchId = existing.branchId;
    let branchName = existing.branchName;
    if (input.branchId && permissions.canViewAllBranches) {
      const foundB = branches.find(b => b.id === input.branchId || matchBranch(b.name, input.branchId));
      if (foundB) {
        branchId = foundB.id;
        branchName = foundB.name;
      }
    }

    if (input.removedMediaIds && input.removedMediaIds.length > 0) {
      await prisma.branchContentMedia.deleteMany({
        where: {
          id: { in: input.removedMediaIds },
          contentId,
        },
      });
    }

    if (input.newMediaFiles && input.newMediaFiles.length > 0) {
      await prisma.branchContentMedia.createMany({
        data: input.newMediaFiles.map(m => ({
          contentId,
          version: existing.currentVersion,
          fileType: m.fileType,
          fileName: m.fileName,
          fileUrl: m.fileUrl,
          thumbnailUrl: m.thumbnailUrl || null,
          fileSize: m.fileSize || 0,
          mimeType: m.mimeType || null,
          uploadedById: user.id,
          uploadedByName: permissions.userName,
        })),
      });
    }

    const nextStatus = input.status || (existing.status as BranchContentStatus);

    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        title: input.title !== undefined ? input.title.trim() : existing.title,
        branchId,
        branchName,
        assigneeId: input.assigneeId !== undefined ? input.assigneeId : existing.assigneeId,
        assigneeName: input.assigneeName !== undefined ? input.assigneeName : existing.assigneeName,
        contentType: input.contentType !== undefined ? input.contentType : existing.contentType,
        productGroup: input.productGroup !== undefined ? input.productGroup : existing.productGroup,
        objective: input.objective !== undefined ? input.objective : existing.objective,
        targetChannels: input.targetChannels !== undefined ? input.targetChannels : (existing.targetChannels as any),
        mediaFormat: input.mediaFormat !== undefined ? input.mediaFormat : existing.mediaFormat,
        caption: input.caption !== undefined ? input.caption : existing.caption,
        description: input.description !== undefined ? input.description : existing.description,
        callToAction: input.callToAction !== undefined ? input.callToAction : existing.callToAction,
        referenceUrl: input.referenceUrl !== undefined ? input.referenceUrl : existing.referenceUrl,
        submissionDueDate:
          input.submissionDueDate !== undefined
            ? input.submissionDueDate
              ? new Date(input.submissionDueDate)
              : null
            : existing.submissionDueDate,
        plannedPublishDate:
          input.plannedPublishDate !== undefined
            ? input.plannedPublishDate
              ? new Date(input.plannedPublishDate)
              : null
            : existing.plannedPublishDate,
        status: nextStatus,
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: nextStatus !== existing.status ? 'STATUS_CHANGED' : 'UPDATED',
            fromStatus: existing.status,
            toStatus: nextStatus,
            version: existing.currentVersion,
            details:
              nextStatus !== existing.status
                ? `อัปเดตข้อมูลและเปลี่ยนสถานะจาก ${existing.status} เป็น ${nextStatus}`
                : `บันทึกการแก้ไขรายละเอียดคอนเทนต์ (V${existing.currentVersion})`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] updateBranchContent error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถอัปเดตคอนเทนต์ได้' };
  }
}

/**
 * Branch Staff submits content for Marketing Review (locks version & increments version if coming from REVISE).
 */
export async function submitBranchContentForReview(contentId: string, submissionNote?: string) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
    include: { media: true },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  // Verify branch access
  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName) ||
      existing.createdById === user.id ||
      existing.assigneeId === user.id;

    if (!isSameBranch) {
      return { success: false, error: '403 Forbidden: คุณไม่มีสิทธิ์ส่งตรวจงานของสาขาอื่น' };
    }
  }

  // Validate required fields before submitting for review
  if (!existing.caption?.trim() && existing.media.length === 0) {
    return {
      success: false,
      error: 'กรุณาระบุเนื้อหา Caption หรือแนบไฟล์สื่อ (ภาพ/วิดีโอ) อย่างน้อย 1 รายการก่อนส่งตรวจ',
    };
  }

  if (!existing.plannedPublishDate) {
    return {
      success: false,
      error: 'กรุณากำหนดวันที่วางแผนเผยแพร่ (Planned Publish Date) ก่อนกดส่งตรวจ',
    };
  }

  const nextVersion = existing.status === 'REVISE' ? existing.currentVersion + 1 : existing.currentVersion;

  try {
    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: 'PENDING_REVIEW',
        reviewSubStatus: 'WAITING_BRANCH_MANAGER',
        currentVersion: nextVersion,
        submittedAt: new Date(),
        comments: submissionNote?.trim()
          ? {
              create: {
                userId: user.id,
                userName: permissions.userName,
                userRole: permissions.roleLabel,
                version: nextVersion,
                commentType: 'GENERAL',
                message: `[ส่งให้ ผจก.สาขาตรวจ V${nextVersion}] ${submissionNote.trim()}`,
              },
            }
          : undefined,
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: 'SUBMITTED_FOR_BRANCH_REVIEW',
            fromStatus: existing.status,
            toStatus: 'PENDING_REVIEW',
            version: nextVersion,
            details: `ส่งงานให้ผู้จัดการสาขาตรวจสอบก่อน (Version ${nextVersion})${submissionNote ? `: ${submissionNote}` : ''}`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] submitBranchContentForReview error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถส่งตรวจได้' };
  }
}

/**
 * Step 1 Review: Branch Manager (ผจก.สาขา) reviews the branch content first.
 * - 'APPROVE_TO_MARKETING': Moves card from PENDING_REVIEW -> APPROVE_1 (Approve - 1) so HQ Marketing can inspect.
 * - 'REQUEST_REVISION': Sends back to Branch Staff (status -> REVISE, increments revisionCount).
 */
export async function branchReviewContent(
  contentId: string,
  action: 'APPROVE_TO_MARKETING' | 'REQUEST_REVISION',
  feedback?: string
) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  if (!permissions.canBranchApprove) {
    return {
      success: false,
      error: '403 Forbidden: เฉพาะผู้จัดการสาขา (Branch Manager) หรือผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ตรวจอนุมัติขั้นต้น (Approve - 1)',
    };
  }

  if (action === 'REQUEST_REVISION' && !feedback?.trim()) {
    return {
      success: false,
      error: 'กรุณาระบุสิ่งที่ต้องการให้พนักงานสาขาแก้ไขก่อนส่งกลับ',
    };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName);
    if (!isSameBranch) {
      return {
        success: false,
        error: '403 Forbidden: คุณสามารถตรวจอนุมัติได้เฉพาะงานในสาขาของตนเองเท่านั้น',
      };
    }
  }

  try {
    const isRevise = action === 'REQUEST_REVISION';
    const nextStatus: BranchContentStatus = isRevise ? 'REVISE' : 'APPROVE_1';
    const nextSubStatus = isRevise ? null : 'WAITING_MARKETING_REVIEWER';

    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: nextStatus,
        reviewSubStatus: nextSubStatus,
        revisionCount: isRevise ? existing.revisionCount + 1 : existing.revisionCount,
        reviewFeedback: isRevise
          ? `[ผจก.สาขา ส่งแก้ไข] ${feedback?.trim()}`
          : feedback?.trim()
          ? `[ผจก.สาขา ส่งต่อการตลาด] ${feedback.trim()}`
          : existing.reviewFeedback,
        comments: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            version: existing.currentVersion,
            commentType: isRevise ? 'REVISION_REQUEST' : 'BRANCH_APPROVAL',
            message: isRevise
              ? `[ผจก.สาขา ส่งกลับแก้ไข] ${feedback?.trim()}`
              : `[ผจก.สาขา ส่งต่อการตลาด] ${
                  feedback?.trim() || 'ตรวจสอบเนื้อหาภายในสาขาเรียบร้อยแล้ว ไม่มีแก้ไขเพิ่มเติม ส่งต่อให้ทีมการตลาดตรวจสอบ'
                }`,
          },
        },
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: isRevise ? 'BRANCH_REQUEST_REVISION' : 'BRANCH_APPROVED_TO_APPROVE_1',
            fromStatus: existing.status,
            toStatus: nextStatus,
            version: existing.currentVersion,
            details: isRevise
              ? `ผู้จัดการสาขาส่งกลับให้แก้ไข (รอบที่ ${existing.revisionCount + 1}): ${feedback?.trim()}`
              : `ผู้จัดการสาขาตรวจผ่านแล้ว ส่งต่อการตลาดเพื่อตรวจสอบ${
                  feedback?.trim() ? ` (${feedback.trim()})` : ''
                }`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] branchReviewContent error:', error);
    return { success: false, error: error?.message || 'เกิดข้อผิดพลาดในการบันทึกผลตรวจของผู้จัดการสาขา' };
  }
}

/**
 * Step 2 Review: HQ Marketing Reviewer action (at APPROVE_1):
 * - 'REQUEST_REVISION': Sends back to Branch Staff (status -> REVISE, increments revisionCount)
 * - 'ENDORSE_FOR_APPROVAL': Marketing Staff screens at Approve - 1 and endorses content to Marketing Manager for final approval
 */
export async function reviewBranchContent(
  contentId: string,
  action: 'REQUEST_REVISION' | 'ENDORSE_FOR_APPROVAL',
  feedback: string
) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  if (!permissions.canReview) {
    return {
      success: false,
      error: '403 Forbidden: เฉพาะเจ้าหน้าที่ฝ่ายการตลาด (Marketing Reviewer) หรือผู้จัดการการตลาดเท่านั้นที่มีสิทธิ์ตรวจงานในขั้น Approve - 1',
    };
  }

  if (action === 'REQUEST_REVISION' && !feedback?.trim()) {
    return {
      success: false,
      error: 'กรุณาระบุรายละเอียดสิ่งที่ต้องแก้ไข (Feedback) เพื่อให้สาขาปรับปรุงงานได้ถูกต้อง',
    };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  try {
    const isRevise = action === 'REQUEST_REVISION';
    const nextStatus: BranchContentStatus = isRevise ? 'REVISE' : 'APPROVE_1';
    const nextSubStatus = isRevise ? null : 'ENDORSED_FOR_MARKETING_MANAGER';

    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: nextStatus,
        reviewSubStatus: nextSubStatus,
        revisionCount: isRevise ? existing.revisionCount + 1 : existing.revisionCount,
        reviewerId: user.id,
        reviewerName: permissions.userName,
        reviewedAt: new Date(),
        reviewFeedback: feedback?.trim() || (isRevise ? '' : 'Marketing ตรวจสอบเนื้อหาที่ Approve - 1 ผ่านแล้ว เสนอผู้จัดการการตลาดอนุมัติ'),
        comments: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            version: existing.currentVersion,
            commentType: isRevise ? 'REVISION_REQUEST' : 'ENDORSEMENT',
            message:
              feedback?.trim() ||
              'ตรวจสอบเนื้อหาและสื่อในขั้น Approve - 1 เรียบร้อยแล้ว เสนอให้ผู้จัดการการตลาดพิจารณาอนุมัติขั้นสุดท้าย',
          },
        },
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: isRevise ? 'MARKETING_REQUEST_REVISION' : 'ENDORSED_FOR_MARKETING_MANAGER',
            fromStatus: existing.status,
            toStatus: nextStatus,
            version: existing.currentVersion,
            details: isRevise
              ? `ฝ่ายการตลาดส่งกลับแก้ไข (รอบที่ ${existing.revisionCount + 1}): ${feedback.trim()}`
              : `Marketing ตรวจผ่านในขั้น Approve - 1 และเสนอให้ผู้จัดการการตลาดอนุมัติ${feedback ? ` (${feedback.trim()})` : ''}`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] reviewBranchContent error:', error);
    return { success: false, error: error?.message || 'เกิดข้อผิดพลาดในการบันทึกผลตรวจ' };
  }
}

/**
 * Marketing Approver (Marketing Manager / Superadmin) approves content for publishing.
 */
export async function approveBranchContent(contentId: string, approvalNote?: string) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  // Strict Role Check: Only Marketing Manager or System Admin can approve!
  if (!permissions.canApprove) {
    return {
      success: false,
      error:
        '403 Forbidden: สิทธิ์การอนุมัติคอนเทนต์ (Approve) สงวนไว้สำหรับ "ผู้จัดการการตลาด (Marketing Manager)" เท่านั้น (เจ้าหน้าที่การตลาดสามารถกด "ตรวจผ่าน/เสนอขออนุมัติ" เพื่อส่งต่อให้ผู้จัดการอนุมัติได้)',
    };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  try {
    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: 'APPROVED',
        reviewSubStatus: 'APPROVED',
        approvedById: user.id,
        approvedByName: permissions.userName,
        approvedAt: new Date(),
        approvalNote: approvalNote?.trim() || 'อนุมัติให้เผยแพร่ได้',
        reviewerId: existing.reviewerId || user.id,
        reviewerName: existing.reviewerName || permissions.userName,
        reviewedAt: existing.reviewedAt || new Date(),
        comments: approvalNote?.trim()
          ? {
              create: {
                userId: user.id,
                userName: permissions.userName,
                userRole: permissions.roleLabel,
                version: existing.currentVersion,
                commentType: 'APPROVAL_NOTE',
                message: `[อนุมัติเผยแพร่] ${approvalNote.trim()}`,
              },
            }
          : undefined,
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: 'APPROVED',
            fromStatus: existing.status,
            toStatus: 'APPROVED',
            version: existing.currentVersion,
            details: `อนุมัติคอนเทนต์อย่างเป็นทางการโดย ${permissions.userName} (V${existing.currentVersion})${
              approvalNote ? `: ${approvalNote.trim()}` : ''
            }`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] approveBranchContent error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถอนุมัติคอนเทนต์ได้' };
  }
}

/**
 * Branch Staff / Marketing records actual publication proof (URL + Channel + Date).
 */
export async function markBranchContentPublished(
  contentId: string,
  data: {
    actualChannel: string;
    actualPublishDate: string;
    publishedUrl: string;
  }
) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  if (!data.publishedUrl?.trim()) {
    return { success: false, error: 'กรุณาระบุลิงก์โพสต์จริง (Published URL) เพื่อเป็นหลักฐานการเผยแพร่' };
  }

  if (!data.actualChannel?.trim()) {
    return { success: false, error: 'กรุณาระบุช่องทางที่เผยแพร่จริง' };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName) ||
      existing.createdById === user.id ||
      existing.assigneeId === user.id;

    if (!isSameBranch) {
      return { success: false, error: '403 Forbidden: คุณไม่มีสิทธิ์บันทึกข้อมูลของสาขาอื่น' };
    }
  }

  if (existing.status !== 'APPROVED' && existing.status !== 'PUBLISHED' && !permissions.canApprove) {
    return {
      success: false,
      error: 'คอนเทนต์ต้องได้รับการอนุมัติ (Approved) จากผู้จัดการการตลาดก่อน จึงจะเปลี่ยนสถานะเป็น Published ได้',
    };
  }

  try {
    const pubDate = data.actualPublishDate ? new Date(data.actualPublishDate) : new Date();

    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: 'PUBLISHED',
        actualChannel: data.actualChannel.trim(),
        actualPublishDate: pubDate,
        publishedUrl: data.publishedUrl.trim(),
        publishedByName: permissions.userName,
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: 'PUBLISHED',
            fromStatus: existing.status,
            toStatus: 'PUBLISHED',
            version: existing.currentVersion,
            details: `บันทึกการเผยแพร่จริงบนช่องทาง ${data.actualChannel} URL: ${data.publishedUrl.trim()}`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] markBranchContentPublished error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถบันทึกผลการเผยแพร่ได้' };
  }
}

/**
 * Add a comment to a Branch Content card (preserves version tag).
 */
export async function addBranchContentComment(contentId: string, message: string) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  if (!message?.trim()) {
    return { success: false, error: 'กรุณาพิมพ์ข้อความความคิดเห็น' };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName) ||
      existing.createdById === user.id ||
      existing.assigneeId === user.id;

    if (!isSameBranch) {
      return { success: false, error: '403 Forbidden: คุณไม่มีสิทธิ์แสดงความคิดเห็นในงานของสาขาอื่น' };
    }
  }

  try {
    await prisma.branchContentComment.create({
      data: {
        contentId,
        userId: user.id,
        userName: permissions.userName,
        userRole: permissions.roleLabel,
        version: existing.currentVersion,
        commentType: permissions.canReview ? 'FEEDBACK' : 'GENERAL',
        message: message.trim(),
      },
    });

    const updated = await prisma.branchContent.findUnique({
      where: { id: contentId },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] addBranchContentComment error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถบันทึกความคิดเห็นได้' };
  }
}

/**
 * Cancel a Branch Content card without deleting audit history.
 */
export async function cancelBranchContent(contentId: string, reason: string) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  if (!reason?.trim()) {
    return { success: false, error: 'กรุณาระบุเหตุผลในการยกเลิกคอนเทนต์' };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลคอนเทนต์นี้' };
  }

  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName) ||
      existing.createdById === user.id;

    if (!isSameBranch) {
      return { success: false, error: '403 Forbidden: คุณไม่มีสิทธิ์ยกเลิกงานของสาขาอื่น' };
    }
  }

  try {
    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: 'CANCELLED',
        cancelReason: reason.trim(),
        cancelledByName: permissions.userName,
        cancelledAt: new Date(),
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: 'CANCELLED',
            fromStatus: existing.status,
            toStatus: 'CANCELLED',
            version: existing.currentVersion,
            details: `ยกเลิกงานคอนเทนต์ เหตุผล: ${reason.trim()}`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    revalidatePath('/marketing-board/branch-content');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] cancelBranchContent error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถยกเลิกคอนเทนต์ได้' };
  }
}

/**
 * Returns sidebar visibility and actionable badge count for Branch Content Board.
 * Only employees belonging to one of the 11 regional branches (or Marketing / Executive / SuperAdmin)
 * should see the Branch Content Board menu in the sidebar.
 */
export async function getBranchContentSidebarAccess(): Promise<{
  canAccess: boolean;
  pendingCount: number;
}> {
  try {
    await ensureBranchContentSchema();
    const { user, permissions } = await resolveUserBranchPermissions();
    if (!user || !permissions) {
      return { canAccess: false, pendingCount: 0 };
    }

    const canAccess = Boolean(permissions.userBranchId) || Boolean(permissions.canViewAllBranches);
    if (!canAccess) {
      return { canAccess: false, pendingCount: 0 };
    }

    const pendingCount = await getPendingBranchContentCount();
    return { canAccess: true, pendingCount };
  } catch {
    return { canAccess: false, pendingCount: 0 };
  }
}

/**
 * Returns the number of actionable Branch Content items for the current user's sidebar badge.
 */
export async function getPendingBranchContentCount(): Promise<number> {
  try {
    await ensureBranchContentSchema();
    const { user, permissions } = await resolveUserBranchPermissions();
    if (!user || !permissions) return 0;

    if (permissions.canViewAllBranches) {
      // Marketing Reviewer / Marketing Approver / System Admin: count items waiting in Approve - 1 or Pending Review
      return await prisma.branchContent.count({
        where: {
          status: { in: ['APPROVE_1', 'PENDING_REVIEW'] },
        },
      });
    }

    const rawContents = await prisma.branchContent.findMany({
      where: {
        status: {
          in: permissions.isBranchManager ? ['PENDING_REVIEW', 'REVISE'] : ['REVISE'],
        },
      },
      select: {
        branchId: true,
        branchName: true,
        createdById: true,
        assigneeId: true,
      },
    });

    return rawContents.filter(
      c =>
        c.createdById === user.id ||
        c.assigneeId === user.id ||
        matchBranch(c.branchId, permissions.userBranchId) ||
        matchBranch(c.branchName, permissions.userBranchName)
    ).length;
  } catch {
    return 0;
  }
}

/**
 * Drag-and-Drop / Quick Status Move for Branch Content Kanban Board (like /marketing/kanban)
 * Enforces role-based transitions:
 * - Moving to PENDING_REVIEW: submits for Branch Manager review
 * - Moving to APPROVE_1: requires Branch Manager / Marketing / Admin (canBranchApprove or canReview)
 * - Moving to APPROVED: requires Marketing Approver (canApprove)
 * - Moving to REVISE: requires Branch Manager or Marketing Reviewer
 */
export async function moveBranchContentCardStatus(
  contentId: string,
  targetStatus: BranchContentStatus
) {
  await ensureBranchContentSchema();

  const { user, permissions } = await resolveUserBranchPermissions();
  if (!user || !permissions) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
  }

  const existing = await prisma.branchContent.findUnique({
    where: { id: contentId },
  });

  if (!existing) {
    return { success: false, error: 'ไม่พบการ์ดงานนี้' };
  }

  if (existing.status === targetStatus) {
    const full = await prisma.branchContent.findUnique({
      where: { id: contentId },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });
    return { success: true, data: serializeContentItem(full) };
  }

  // Branch Access Check
  if (!permissions.canViewAllBranches) {
    const isSameBranch =
      matchBranch(existing.branchId, permissions.userBranchId) ||
      matchBranch(existing.branchName, permissions.userBranchName) ||
      existing.createdById === user.id ||
      existing.assigneeId === user.id;

    if (!isSameBranch) {
      return { success: false, error: '403 Forbidden: คุณไม่มีสิทธิ์ย้ายงานของสาขาอื่น' };
    }
  }

  // Role Transition Guards
  if (targetStatus === 'APPROVE_1' && !permissions.canBranchApprove && !permissions.canReview) {
    return {
      success: false,
      error: 'เฉพาะผู้จัดการสาขา หรือฝ่ายการตลาดเท่านั้นที่สามารถย้ายงานเข้าสู่คอลัมน์ Approve - 1 ได้',
    };
  }

  if (targetStatus === 'APPROVED' && !permissions.canApprove) {
    return {
      success: false,
      error: 'เฉพาะผู้จัดการการตลาด (Marketing Manager) เท่านั้นที่สามารถอนุมัติงานเข้าสู่คอลัมน์ Approved ได้',
    };
  }

  if (targetStatus === 'REVISE' && !permissions.canBranchApprove && !permissions.canReview) {
    return {
      success: false,
      error: 'เฉพาะผู้จัดการสาขา หรือฝ่ายการตลาดเท่านั้นที่สามารถส่งกลับแก้ไข (Revise) ได้',
    };
  }

  try {
    let nextSubStatus = existing.reviewSubStatus;
    let nextVersion = existing.currentVersion;
    let nextRevisionCount = existing.revisionCount;

    if (targetStatus === 'PENDING_REVIEW') {
      nextSubStatus = 'WAITING_BRANCH_MANAGER';
      if (existing.status === 'REVISE') {
        nextVersion = existing.currentVersion + 1;
      }
    } else if (targetStatus === 'APPROVE_1') {
      nextSubStatus = 'WAITING_MARKETING_REVIEWER';
    } else if (targetStatus === 'APPROVED') {
      nextSubStatus = 'APPROVED';
    } else if (targetStatus === 'REVISE') {
      nextSubStatus = null;
      nextRevisionCount = existing.revisionCount + 1;
    } else if (targetStatus === 'BACKLOG' || targetStatus === 'IN_PROGRESS') {
      nextSubStatus = null;
    }

    const updated = await prisma.branchContent.update({
      where: { id: contentId },
      data: {
        status: targetStatus,
        reviewSubStatus: nextSubStatus,
        currentVersion: nextVersion,
        revisionCount: nextRevisionCount,
        submittedAt: targetStatus === 'PENDING_REVIEW' ? new Date() : existing.submittedAt,
        approvedById: targetStatus === 'APPROVED' ? user.id : existing.approvedById,
        approvedByName: targetStatus === 'APPROVED' ? permissions.userName : existing.approvedByName,
        approvedAt: targetStatus === 'APPROVED' ? new Date() : existing.approvedAt,
        logs: {
          create: {
            userId: user.id,
            userName: permissions.userName,
            userRole: permissions.roleLabel,
            action: 'MOVED_COLUMN',
            fromStatus: existing.status,
            toStatus: targetStatus,
            version: nextVersion,
            details: `ย้ายการ์ดงานจาก ${existing.status} ไปยัง ${targetStatus}`,
          },
        },
      },
      include: {
        media: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    revalidatePath('/marketing-board');
    revalidatePath('/marketing-board/branch-content');
    return { success: true, data: serializeContentItem(updated) };
  } catch (error: any) {
    console.error('[BranchContent] moveBranchContentCardStatus error:', error);
    return { success: false, error: error?.message || 'ไม่สามารถย้ายสถานะการ์ดได้' };
  }
}



