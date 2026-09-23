'use server';

import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';

import { 
  ProductGroupType, 
  AnnouncementType, 
  PriorityType, 
  StatusType,
  BoardFilters,
  SalesMaterialsFilter,
  computeDynamicStatus
} from '@/app/lib/marketingBoardTypes';

// User role check
export async function getMarketingPermissions() {
  const user = await getUser();
  if (!user) return null;

  const roleStr = (user.role || '').toLowerCase();
  const isSuperAdmin = ['super_admin', 'super admin'].includes(roleStr);
  const isExecutive = ['executive', 'ผู้บริหาร'].includes(roleStr);
  const isMarketingManager = ['marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด'].includes(roleStr);
  const isMarketingStaff = roleStr.includes('marketing') || roleStr.includes('การตลาด');
  const isBranchManager = ['ผู้จัดการ', 'manager', 'sales manager'].includes(roleStr);
  const isTelesalesOrSales = ['ตัวแทนฝ่ายขาย', 'telesales', 'sales representative'].includes(roleStr);

  const canManage = isSuperAdmin || isMarketingManager || isMarketingStaff;
  const canApprove = isSuperAdmin || isMarketingManager;
  const canPublish = isSuperAdmin || isMarketingManager;
  const isMarketingAdmin = isSuperAdmin || isMarketingManager;

  const userBranch = user.employeeSale?.branch || null;

  return {
    user,
    role: user.role,
    userBranch,
    isSuperAdmin,
    isExecutive,
    isMarketingAdmin,
    isMarketingStaff,
    isBranchManager,
    isTelesalesOrSales,
    canManage,
    canApprove,
    canPublish
  };
}

export async function getMarketingBoardData(filters: BoardFilters = {}) {
  const perm = await getMarketingPermissions();
  if (!perm) throw new Error('ไม่มีสิทธิ์เข้าถึง (Unauthorized)');

  const { user, userBranch, isMarketingAdmin, isExecutive, isMarketingStaff } = perm;
  const isPrivileged = isMarketingAdmin || isExecutive || isMarketingStaff;

  // 1. Fetch active company branches for filters & scoping
  const allBranches = await prisma.branches.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  // 2. Fetch announcements
  const rawAnnouncements = await prisma.marketingAnnouncement.findMany({
    include: {
      branches: true,
      assets: true,
      acknowledgments: {
        where: { userId: user.id }
      },
      _count: {
        select: {
          assets: true,
          acknowledgments: true
        }
      }
    },
    orderBy: [
      { isFeatured: 'desc' },
      { displayOrder: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  // 3. Compute dynamic status & filter by branch access & archive
  const processedAnnouncements = rawAnnouncements.map(ann => {
    const dynamicStatus = computeDynamicStatus({
      status: ann.status,
      startAt: ann.startAt,
      endAt: ann.endAt
    });

    const userAck = ann.acknowledgments[0];
    const isRead = !!userAck;
    const isAcknowledged = !!userAck?.acknowledgedAt && (userAck.acknowledgedVersion === ann.version);

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (ann.endAt) {
      const now = new Date();
      const diffTime = new Date(ann.endAt).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Branch eligibility check for current user
    const isBranchApplicable = ann.branchScope === 'ALL' 
      ? true 
      : (!userBranch || ann.branches.some(b => b.branchId === userBranch));

    return {
      ...ann,
      fileSize: undefined, // ensure bigint free
      assets: ann.assets.map(a => ({
        ...a,
        fileSize: Number(a.fileSize)
      })),
      dynamicStatus,
      daysRemaining,
      isRead,
      isAcknowledged,
      acknowledgedAt: userAck?.acknowledgedAt || null,
      isBranchApplicable
    };
  });

  // Visibility logic:
  // - Branch users only see items applicable to ALL or their branch
  // - Non-privileged users do NOT see Draft / Pending Approval
  // - Expired and Cancelled items belong in the Archive tab
  const activeAnnouncements = processedAnnouncements.filter(ann => {
    if (!isPrivileged) {
      if (['Draft', 'Pending Approval'].includes(ann.dynamicStatus)) return false;
      if (!ann.isBranchApplicable) return false;
    }
    // Filter out Expired and Cancelled from active board
    if (['Expired', 'Cancelled'].includes(ann.dynamicStatus)) return false;
    return true;
  });

  // Apply search and filter parameters
  let filtered = activeAnnouncements;

  if (filters.search && filters.search.trim() !== '') {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(a => 
      a.campaignName.toLowerCase().includes(q) ||
      a.shortDescription.toLowerCase().includes(q) ||
      a.productGroup.toLowerCase().includes(q)
    );
  }

  if (filters.productGroup && filters.productGroup !== 'All Product Groups') {
    filtered = filtered.filter(a => a.productGroup === filters.productGroup);
  }

  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter(a => a.dynamicStatus === filters.status);
  }

  if (filters.branch && filters.branch !== 'All Branches') {
    filtered = filtered.filter(a => 
      a.branchScope === 'ALL' || a.branches.some(b => b.branchId === filters.branch)
    );
  }

  if (filters.dateMonth && filters.dateMonth !== 'All') {
    filtered = filtered.filter(a => {
      const annMonth = new Date(a.startAt).toISOString().substring(0, 7);
      return annMonth === filters.dateMonth;
    });
  }

  if (filters.unreadOnly) {
    filtered = filtered.filter(a => !a.isAcknowledged);
  }

  // Summary counts
  const totalActive = activeAnnouncements.filter(a => a.dynamicStatus === 'Active').length;
  const totalEndingSoon = activeAnnouncements.filter(a => a.dynamicStatus === 'Ending Soon').length;
  const totalUnread = activeAnnouncements.filter(a => !a.isAcknowledged).length;

  return {
    announcements: filtered,
    branches: allBranches,
    counts: {
      active: totalActive,
      endingSoon: totalEndingSoon,
      unread: totalUnread
    },
    userPermissions: perm
  };
}

export async function getAnnouncementDetail(id: string) {
  const perm = await getMarketingPermissions();
  if (!perm) throw new Error('ไม่มีสิทธิ์เข้าถึง (Unauthorized)');
  const { user, userBranch } = perm;

  const ann = await prisma.marketingAnnouncement.findUnique({
    where: { id },
    include: {
      branches: true,
      assets: true,
      acknowledgments: {
        where: { userId: user.id }
      },
      auditLogs: {
        orderBy: { performedAt: 'desc' }
      }
    }
  });

  if (!ann) return null;

  // Mark as read immediately
  await prisma.marketingAnnouncementAcknowledgment.upsert({
    where: {
      announcementId_userId: {
        announcementId: id,
        userId: user.id
      }
    },
    update: {
      readAt: new Date()
    },
    create: {
      announcementId: id,
      userId: user.id,
      userName: user.fullName,
      branchId: userBranch,
      readAt: new Date()
    }
  });

  const dynamicStatus = computeDynamicStatus({
    status: ann.status,
    startAt: ann.startAt,
    endAt: ann.endAt
  });

  const userAck = ann.acknowledgments[0];
  const isAcknowledged = !!userAck?.acknowledgedAt && (userAck.acknowledgedVersion === ann.version);

  const isBranchApplicable = ann.branchScope === 'ALL'
    ? true
    : (!userBranch || ann.branches.some(b => b.branchId === userBranch));

  let daysRemaining: number | null = null;
  if (ann.endAt) {
    const now = new Date();
    const diffTime = new Date(ann.endAt).getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return {
    ...ann,
    dynamicStatus,
    daysRemaining,
    isAcknowledged,
    acknowledgedAt: userAck?.acknowledgedAt || null,
    isBranchApplicable,
    assets: ann.assets.map(a => ({
      ...a,
      fileSize: Number(a.fileSize)
    }))
  };
}

export async function acknowledgeAnnouncement(announcementId: string) {
  const perm = await getMarketingPermissions();
  if (!perm) throw new Error('ไม่มีสิทธิ์เข้าถึง (Unauthorized)');
  const { user, userBranch } = perm;

  const ann = await prisma.marketingAnnouncement.findUnique({
    where: { id: announcementId },
    select: { version: true }
  });

  if (!ann) throw new Error('ไม่พบข้อมูลประกาศ');

  const ack = await prisma.marketingAnnouncementAcknowledgment.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId: user.id
      }
    },
    update: {
      acknowledgedAt: new Date(),
      acknowledgedVersion: ann.version,
      userName: user.fullName,
      branchId: userBranch
    },
    create: {
      announcementId,
      userId: user.id,
      userName: user.fullName,
      branchId: userBranch,
      readAt: new Date(),
      acknowledgedAt: new Date(),
      acknowledgedVersion: ann.version
    }
  });

  revalidatePath('/marketing-board');
  return { success: true, acknowledgedAt: ack.acknowledgedAt };
}

export async function getAcknowledgmentReport(announcementId: string) {
  const perm = await getMarketingPermissions();
  if (!perm) throw new Error('ไม่มีสิทธิ์เข้าถึง (Unauthorized)');

  const ann = await prisma.marketingAnnouncement.findUnique({
    where: { id: announcementId },
    include: {
      branches: true,
      acknowledgments: true
    }
  });

  if (!ann) throw new Error('ไม่พบข้อมูลประกาศ');

  // Get users who are in sales, telesales, or branch managers
  const eligibleUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: { contains: 'Sales', mode: 'insensitive' } },
        { role: { contains: 'ตัวแทน', mode: 'insensitive' } },
        { role: { contains: 'Telesales', mode: 'insensitive' } },
        { role: { contains: 'ผู้จัดการ', mode: 'insensitive' } },
        { role: { contains: 'Manager', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      fullName: true,
      role: true,
      employeeId: true,
      employeeSale: {
        select: { branch: true }
      }
    }
  });

  // Filter users by branch scope if specific
  const branchIds = ann.branches.map(b => b.branchId);
  const targetUsers = ann.branchScope === 'ALL'
    ? eligibleUsers
    : eligibleUsers.filter(u => u.employeeSale?.branch && branchIds.includes(u.employeeSale.branch));

  const ackMap = new Map(ann.acknowledgments.map(a => [a.userId, a]));

  const rows = targetUsers.map(u => {
    const ack = ackMap.get(u.id);
    const isAck = !!ack?.acknowledgedAt && ack.acknowledgedVersion === ann.version;
    return {
      userId: u.id,
      fullName: u.fullName,
      role: u.role,
      branch: u.employeeSale?.branch || 'HQ / Unassigned',
      isAcknowledged: isAck,
      readAt: ack?.readAt || null,
      acknowledgedAt: isAck ? ack?.acknowledgedAt : null
    };
  });

  const total = rows.length;
  const acknowledgedCount = rows.filter(r => r.isAcknowledged).length;
  const pendingCount = total - acknowledgedCount;
  const rate = total > 0 ? Math.round((acknowledgedCount / total) * 100) : 0;

  return {
    total,
    acknowledgedCount,
    pendingCount,
    rate,
    rows
  };
}

export async function createAnnouncement(data: {
  announcementType: AnnouncementType;
  productGroup: ProductGroupType;
  campaignName: string;
  shortDescription: string;
  campaignDetails: string;
  termsConditions?: string;
  startAt: string;
  endAt?: string;
  branchScope: 'ALL' | 'SPECIFIC';
  specificBranchIds?: string[];
  priority: PriorityType;
  statusMode: 'draft' | 'pending' | 'publish_now' | 'schedule';
  coverImageUrl?: string;
  contactPerson?: string;
  assets?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    documentType: string;
    assetType?: string;
    version?: string;
  }>;
}) {
  const perm = await getMarketingPermissions();
  if (!perm || !perm.canManage) throw new Error('ไม่มีสิทธิ์: เฉพาะทีมการตลาดหรือผู้ดูแลระบบเท่านั้นที่สามารถสร้างประกาศได้');
  const { user } = perm;

  if (data.branchScope === 'SPECIFIC' && (!data.specificBranchIds || data.specificBranchIds.length === 0)) {
    throw new Error('กรุณาเลือกสาขาอย่างน้อย 1 สาขา เมื่อเลือกขอบเขตเฉพาะบางสาขา');
  }

  let status = 'Active';
  let publishMode = 'NOW';
  if (data.statusMode === 'draft') {
    status = 'Draft';
  } else if (data.statusMode === 'pending') {
    status = 'Pending Approval';
  } else if (data.statusMode === 'schedule') {
    status = 'Scheduled';
    publishMode = 'SCHEDULE';
  } else {
    // If not authorized to directly publish, route to Pending Approval
    if (!perm.canPublish) {
      status = 'Pending Approval';
    }
  }

  const startAtDate = new Date(data.startAt);
  const endAtDate = data.endAt ? new Date(data.endAt) : null;

  const ann = await prisma.marketingAnnouncement.create({
    data: {
      announcementType: data.announcementType,
      productGroup: data.productGroup,
      campaignName: data.campaignName,
      shortDescription: data.shortDescription,
      campaignDetails: data.campaignDetails,
      termsConditions: data.termsConditions || null,
      startAt: startAtDate,
      endAt: endAtDate,
      branchScope: data.branchScope,
      priority: data.priority,
      status,
      version: 1,
      coverImageUrl: data.coverImageUrl || null,
      contactPerson: data.contactPerson || null,
      publishMode,
      publishedAt: status === 'Active' ? new Date() : null,
      createdBy: user.id,
      branches: data.branchScope === 'SPECIFIC' && data.specificBranchIds
        ? {
            create: data.specificBranchIds.map(bId => ({ branchId: bId }))
          }
        : undefined,
      assets: data.assets && data.assets.length > 0
        ? {
            create: data.assets.map(a => ({
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileSize: BigInt(a.fileSize || 0),
              documentType: a.documentType || 'Others',
              assetType: a.assetType || (a.fileUrl.endsWith('.mp4') ? 'video' : 'document'),
              version: a.version || 'V1',
              effectiveDate: startAtDate,
              expiryDate: endAtDate,
              uploadedBy: user.fullName
            }))
          }
        : undefined,
      auditLogs: {
        create: {
          version: 1,
          action: 'CREATED',
          newValue: {
            campaignName: data.campaignName,
            productGroup: data.productGroup,
            status,
            priority: data.priority
          },
          performedBy: user.id,
          performedByName: user.fullName,
          notes: `Announcement created as ${status}`
        }
      }
    }
  });

  revalidatePath('/marketing-board');
  return { success: true, id: ann.id };
}

export async function updateAnnouncement(id: string, data: {
  announcementType?: AnnouncementType;
  productGroup?: ProductGroupType;
  campaignName?: string;
  shortDescription?: string;
  campaignDetails?: string;
  termsConditions?: string;
  startAt?: string;
  endAt?: string;
  branchScope?: 'ALL' | 'SPECIFIC';
  specificBranchIds?: string[];
  priority?: PriorityType;
  status?: string;
  coverImageUrl?: string;
  contactPerson?: string;
  updateNotes?: string;
  resetAcknowledgment?: boolean;
  deletedAssetIds?: string[];
  newAssets?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    documentType: string;
    assetType?: string;
    version?: string;
  }>;
}) {
  const perm = await getMarketingPermissions();
  if (!perm || !perm.canManage) throw new Error('ไม่มีสิทธิ์ดำเนินการ');
  const { user } = perm;

  const current = await prisma.marketingAnnouncement.findUnique({
    where: { id },
    include: { branches: true }
  });

  if (!current) throw new Error('ไม่พบข้อมูลประกาศ');

  const newVersion = current.version + 1;

  // If reset acknowledgment is requested (e.g. key terms changed), clear previous user confirmations
  if (data.resetAcknowledgment) {
    await prisma.marketingAnnouncementAcknowledgment.updateMany({
      where: { announcementId: id },
      data: {
        acknowledgedAt: null,
        acknowledgedVersion: null
      }
    });
  }

  // Update branches if specified
  if (data.branchScope === 'SPECIFIC' && data.specificBranchIds) {
    await prisma.marketingAnnouncementBranch.deleteMany({
      where: { announcementId: id }
    });
    await prisma.marketingAnnouncementBranch.createMany({
      data: data.specificBranchIds.map(bId => ({
        announcementId: id,
        branchId: bId
      }))
    });
  } else if (data.branchScope === 'ALL') {
    await prisma.marketingAnnouncementBranch.deleteMany({
      where: { announcementId: id }
    });
  }

  // Delete removed assets if specified
  if (data.deletedAssetIds && data.deletedAssetIds.length > 0) {
    await prisma.marketingAnnouncementAsset.deleteMany({
      where: {
        id: { in: data.deletedAssetIds },
        announcementId: id
      }
    });
  }

  // Add new assets if any
  if (data.newAssets && data.newAssets.length > 0) {
    await prisma.marketingAnnouncementAsset.createMany({
      data: data.newAssets.map(a => ({
        announcementId: id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: BigInt(a.fileSize || 0),
        documentType: a.documentType || 'Others',
        assetType: a.assetType || (a.fileUrl.endsWith('.mp4') ? 'video' : 'document'),
        version: a.version || `V${newVersion}`,
        uploadedBy: user.fullName
      }))
    });
  }

  // Audit log record
  await prisma.marketingAnnouncementAuditLog.create({
    data: {
      announcementId: id,
      version: newVersion,
      action: 'UPDATED',
      previousValue: {
        campaignName: current.campaignName,
        shortDescription: current.shortDescription,
        status: current.status,
        version: current.version
      },
      newValue: {
        campaignName: data.campaignName || current.campaignName,
        shortDescription: data.shortDescription || current.shortDescription,
        status: data.status || current.status,
        version: newVersion
      },
      performedBy: user.id,
      performedByName: user.fullName,
      notes: data.updateNotes || 'Announcement updated'
    }
  });

  const updated = await prisma.marketingAnnouncement.update({
    where: { id },
    data: {
      announcementType: data.announcementType || current.announcementType,
      productGroup: data.productGroup || current.productGroup,
      campaignName: data.campaignName || current.campaignName,
      shortDescription: data.shortDescription || current.shortDescription,
      campaignDetails: data.campaignDetails || current.campaignDetails,
      termsConditions: data.termsConditions !== undefined ? data.termsConditions : current.termsConditions,
      startAt: data.startAt ? new Date(data.startAt) : current.startAt,
      endAt: data.endAt ? new Date(data.endAt) : current.endAt,
      branchScope: data.branchScope || current.branchScope,
      priority: data.priority || current.priority,
      status: data.status || current.status,
      version: newVersion,
      coverImageUrl: data.coverImageUrl !== undefined ? data.coverImageUrl : current.coverImageUrl,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson : current.contactPerson,
      updatedBy: user.id
    }
  });

  revalidatePath('/marketing-board');
  return { success: true, version: updated.version };
}

export async function approveAnnouncement(id: string) {
  const perm = await getMarketingPermissions();
  if (!perm || !perm.canApprove) throw new Error('ไม่มีสิทธิ์: เฉพาะผู้อนุมัติหรือผู้ดูแลระบบเท่านั้น');
  const { user } = perm;

  const ann = await prisma.marketingAnnouncement.findUnique({ where: { id } });
  if (!ann) throw new Error('ไม่พบข้อมูลประกาศ');

  const now = new Date();
  const newStatus = ann.startAt > now ? 'Scheduled' : 'Active';

  await prisma.marketingAnnouncement.update({
    where: { id },
    data: {
      status: newStatus,
      publishedAt: now,
      updatedBy: user.id
    }
  });

  await prisma.marketingAnnouncementAuditLog.create({
    data: {
      announcementId: id,
      version: ann.version,
      action: 'APPROVED',
      newValue: { status: newStatus },
      performedBy: user.id,
      performedByName: user.fullName,
      notes: 'Approved and published announcement'
    }
  });

  revalidatePath('/marketing-board');
  return { success: true, status: newStatus };
}

export async function cancelAnnouncement(id: string, reason: string) {
  const perm = await getMarketingPermissions();
  if (!perm || !perm.canManage) throw new Error('ไม่มีสิทธิ์ดำเนินการ');
  const { user } = perm;

  const ann = await prisma.marketingAnnouncement.findUnique({ where: { id } });
  if (!ann) throw new Error('ไม่พบข้อมูลประกาศ');

  await prisma.marketingAnnouncement.update({
    where: { id },
    data: {
      status: 'Cancelled',
      updatedBy: user.id
    }
  });

  await prisma.marketingAnnouncementAuditLog.create({
    data: {
      announcementId: id,
      version: ann.version,
      action: 'CANCELLED',
      newValue: { status: 'Cancelled', reason },
      performedBy: user.id,
      performedByName: user.fullName,
      notes: `Announcement cancelled: ${reason}`
    }
  });

  revalidatePath('/marketing-board');
  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const perm = await getMarketingPermissions();
  if (!perm || !perm.canManage) throw new Error('ไม่มีสิทธิ์ดำเนินการ: เฉพาะฝ่ายการตลาดหรือผู้ดูแลระบบเท่านั้น');

  const ann = await prisma.marketingAnnouncement.findUnique({ where: { id } });
  if (!ann) throw new Error('ไม่พบข้อมูลประกาศ');

  // Cascade delete child records
  await prisma.marketingAnnouncementAuditLog.deleteMany({ where: { announcementId: id } });
  await prisma.marketingAnnouncementAcknowledgment.deleteMany({ where: { announcementId: id } });
  await prisma.marketingAnnouncementAsset.deleteMany({ where: { announcementId: id } });
  await prisma.marketingAnnouncementBranch.deleteMany({ where: { announcementId: id } });
  await prisma.marketingAnnouncement.delete({ where: { id } });

  revalidatePath('/marketing-board');
  return { success: true };
}


export async function getSalesMaterials(filters: SalesMaterialsFilter = {}) {
  const perm = await getMarketingPermissions();
  if (!perm) throw new Error('ไม่มีสิทธิ์เข้าถึง (Unauthorized)');
  const { userBranch, isMarketingAdmin, isExecutive, isMarketingStaff } = perm;
  const isPrivileged = isMarketingAdmin || isExecutive || isMarketingStaff;

  const rawAssets = await prisma.marketingAnnouncementAsset.findMany({
    include: {
      announcement: {
        select: {
          id: true,
          campaignName: true,
          productGroup: true,
          status: true,
          startAt: true,
          endAt: true,
          branchScope: true,
          branches: true
        }
      }
    },
    orderBy: { uploadedAt: 'desc' }
  });

  const processed = rawAssets.map(asset => {
    const ann = asset.announcement;
    const isExpired = ann && ann.endAt ? new Date(ann.endAt) < new Date() : false;
    const isNewVersion = asset.version.toUpperCase().includes('V2') || asset.version.toUpperCase().includes('FINAL');

    // Scoping check
    const isAllowed = isPrivileged || !ann || ann.branchScope === 'ALL' ||
      (!userBranch || ann.branches.some(b => b.branchId === userBranch));

    return {
      id: asset.id,
      fileName: asset.fileName,
      fileUrl: asset.fileUrl,
      fileSize: Number(asset.fileSize),
      mimeType: asset.mimeType,
      documentType: asset.documentType,
      productGroup: asset.productGroup || ann?.productGroup || 'Marketing Headquarters',
      relatedCampaign: ann?.campaignName || 'General Sales Material',
      relatedCampaignId: ann?.id || null,
      version: asset.version,
      effectiveDate: asset.effectiveDate || ann?.startAt || null,
      expiryDate: asset.expiryDate || ann?.endAt || null,
      downloadCount: asset.downloadCount,
      uploadedBy: asset.uploadedBy || 'Marketing Team',
      uploadedAt: asset.uploadedAt,
      isExpired,
      isNewVersion,
      isAllowed
    };
  }).filter(item => item.isAllowed);

  let filtered = processed;

  if (filters.search && filters.search.trim() !== '') {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(f => 
      f.fileName.toLowerCase().includes(q) ||
      f.relatedCampaign.toLowerCase().includes(q) ||
      f.documentType.toLowerCase().includes(q)
    );
  }

  if (filters.productGroup && filters.productGroup !== 'All Product Groups') {
    filtered = filtered.filter(f => f.productGroup === filters.productGroup);
  }

  if (filters.documentType && filters.documentType !== 'All Types') {
    filtered = filtered.filter(f => f.documentType === filters.documentType);
  }

  if (filters.campaignId && filters.campaignId !== 'All Campaigns') {
    filtered = filtered.filter(f => f.relatedCampaignId === filters.campaignId);
  }

  if (filters.latestOnly) {
    filtered = filtered.filter(f => !f.isExpired);
  }

  return filtered;
}

export async function incrementDownloadCount(assetId: string) {
  try {
    await prisma.marketingAnnouncementAsset.update({
      where: { id: assetId },
      data: {
        downloadCount: { increment: 1 }
      }
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getArchiveAnnouncements(filters: { search?: string; productGroup?: string } = {}) {
  const perm = await getMarketingPermissions();
  if (!perm) throw new Error('ไม่มีสิทธิ์เข้าถึง (Unauthorized)');

  const raw = await prisma.marketingAnnouncement.findMany({
    include: {
      branches: true,
      assets: true,
      _count: { select: { assets: true } }
    },
    orderBy: { endAt: 'desc' }
  });

  const archived = raw.map(ann => {
    const dynamicStatus = computeDynamicStatus({
      status: ann.status,
      startAt: ann.startAt,
      endAt: ann.endAt
    });
    return {
      ...ann,
      dynamicStatus,
      assets: ann.assets.map(a => ({
        ...a,
        fileSize: Number(a.fileSize)
      }))
    };
  }).filter(a => a.dynamicStatus === 'Expired' || a.dynamicStatus === 'Cancelled');

  let filtered = archived;
  if (filters.search && filters.search.trim() !== '') {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(a => 
      a.campaignName.toLowerCase().includes(q) ||
      a.shortDescription.toLowerCase().includes(q)
    );
  }
  if (filters.productGroup && filters.productGroup !== 'All Product Groups') {
    filtered = filtered.filter(a => a.productGroup === filters.productGroup);
  }

  return filtered;
}

export async function getUnreadMarketingBoardCount(): Promise<number> {
  try {
    const user = await getUser();
    if (!user) return 0;
    const userBranch = user.employeeSale?.branch || null;
    const now = new Date();

    const unreadCount = await prisma.marketingAnnouncement.count({
      where: {
        status: { in: ['Active', 'Ending Soon'] },
        startAt: { lte: now },
        OR: [
          { endAt: null },
          { endAt: { gte: now } }
        ],
        AND: [
          userBranch
            ? {
                OR: [
                  { branchScope: 'ALL' },
                  { branches: { some: { branchId: userBranch } } }
                ]
              }
            : { branchScope: 'ALL' },
          {
            acknowledgments: {
              none: {
                userId: user.id,
                acknowledgedAt: { not: null }
              }
            }
          }
        ]
      }
    });
    return unreadCount;
  } catch {
    return 0;
  }
}
