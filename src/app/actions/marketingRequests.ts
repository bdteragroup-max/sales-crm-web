'use server';

import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/app/lib/pushNotification';
import {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  RequestTypeCode,
  RequestStatusCode,
  PriorityCode
} from '@/constants/marketingRequests';
import {
  pushMarketingNotification,
  marketingRequestCreatedFlexMessage,
  marketingRequestAssignedFlexMessage,
  marketingRequestStatusChangedFlexMessage,
  getLineUserIdByCrmUserId,
  pushLineMessage
} from '@/app/lib/lineNotify';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Safe fallback when running outside request store (e.g. CLI test scripts)
  }
}

/**
 * Infer MIME type and attachment category ('image' | 'video' | 'general')
 * from fileName and existing fileType.
 */
function inferMarketingAttachmentMeta(
  fileName: string,
  providedFileType?: string | null
): { fileType: string; attachmentType: 'image' | 'video' | 'general' } {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';

  const isImg =
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
    providedFileType?.startsWith('image/');
  if (isImg) {
    const mime = providedFileType?.startsWith('image/')
      ? providedFileType
      : ext === 'png'
      ? 'image/png'
      : ext === 'gif'
      ? 'image/gif'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'svg'
      ? 'image/svg+xml'
      : ext === 'bmp'
      ? 'image/bmp'
      : 'image/jpeg';
    return { fileType: mime, attachmentType: 'image' };
  }

  const isVid =
    ['mp4', 'mov', 'm4v', 'avi', 'wmv', 'flv', 'mkv', 'webm'].includes(ext) ||
    providedFileType?.startsWith('video/');
  if (isVid) {
    const mime = providedFileType?.startsWith('video/')
      ? providedFileType
      : ext === 'mp4'
      ? 'video/mp4'
      : ext === 'mov'
      ? 'video/quicktime'
      : ext === 'webm'
      ? 'video/webm'
      : ext === 'm4v'
      ? 'video/x-m4v'
      : ext === 'avi'
      ? 'video/x-msvideo'
      : 'video/mp4';
    return { fileType: mime, attachmentType: 'video' };
  }

  const mime =
    providedFileType ||
    (ext === 'pdf'
      ? 'application/pdf'
      : ext === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : ext === 'xls'
      ? 'application/vnd.ms-excel'
      : ext === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : ext === 'doc'
      ? 'application/msword'
      : ext === 'zip'
      ? 'application/zip'
      : ext === 'csv'
      ? 'text/csv'
      : 'application/octet-stream');

  return { fileType: mime, attachmentType: 'general' };
}

/**
 * Synchronize attachments from a MarketingRequest into KanbanAttachment on a KanbanCard.
 * Ensures images, videos, and general files are visible in the Marketing Board CardModal.
 */
async function syncMarketingRequestAttachmentsToCard(
  db: any,
  cardId: string,
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType?: string | null;
    fileSize?: number | null;
  }>,
  uploaderId?: string | null
) {
  if (!cardId || !attachments || attachments.length === 0) return;

  try {
    const existingCardAtts = await db.kanbanAttachment.findMany({
      where: { cardId },
      select: { fileUrl: true }
    });
    const existingUrlSet = new Set(existingCardAtts.map((a: any) => a.fileUrl));

    const missing = attachments.filter(
      att => att.fileUrl && !existingUrlSet.has(att.fileUrl)
    );
    if (missing.length === 0) return;

    const toCreate = missing.map(att => {
      const meta = inferMarketingAttachmentMeta(att.fileName, att.fileType);
      return {
        cardId,
        userId: uploaderId || null,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: meta.fileType,
        fileSize: att.fileSize || null,
        attachmentType: meta.attachmentType
      };
    });

    await db.kanbanAttachment.createMany({
      data: toCreate
    });
  } catch (err) {
    console.warn('Error syncing marketing attachments to Kanban card:', err);
  }
}

export interface CreateMarketingRequestInput {
  requesterName: string;
  requesterDepartment: string;
  requesterBranch: string;
  requesterPhone: string;
  requestType: RequestTypeCode;
  title: string;
  description: string;
  requiredDate: string; // ISO date string
  usageLocationType: string;
  usageBranch?: string;
  usageProvince?: string;
  usageLocationName?: string;
  usageLocationDetails?: string;
  typeDetails?: any;
  shippingMethod?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientCompanyBranch?: string;
  deliveryAddress?: string;
  deliveryProvince?: string;
  deliveryPostalCode?: string;
  requestedDeliveryDate?: string;
  shippingRemarks?: string;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
  }[];
}

export async function createMarketingRequest(input: CreateMarketingRequestInput) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
    }

    // 1. Validation
    if (!input.requesterName?.trim()) return { success: false, error: 'กรุณาระบุชื่อ-นามสกุลผู้ขอ' };
    if (!input.requesterDepartment?.trim()) return { success: false, error: 'กรุณาระบุฝ่าย / แผนก' };
    if (!input.requesterBranch?.trim()) return { success: false, error: 'กรุณาระบุสาขาที่สังกัด' };
    if (!input.requesterPhone?.trim()) return { success: false, error: 'กรุณาระบุเบอร์โทรติดต่อ' };
    if (!input.requestType) return { success: false, error: 'กรุณาเลือกประเภทคำขอ' };
    if (!input.title?.trim()) return { success: false, error: 'กรุณาระบุชื่องาน / เรื่อง' };
    if (!input.description?.trim()) return { success: false, error: 'กรุณาระบุรายละเอียดที่ต้องการ' };
    if (!input.requiredDate) return { success: false, error: 'กรุณาระบุวันที่ต้องการนำไปใช้งานจริง' };
    if (!input.usageLocationType) return { success: false, error: 'กรุณาระบุสถานที่นำไปใช้งาน' };

    const reqDate = new Date(input.requiredDate);
    if (isNaN(reqDate.getTime())) {
      return { success: false, error: 'วันที่ต้องการใช้งานไม่ถูกต้อง' };
    }

    // Shipping date validation if delivery is requested
    let deliveryDate: Date | null = null;
    if (input.shippingMethod === 'DELIVERY') {
      if (!input.recipientName?.trim()) return { success: false, error: 'กรุณาระบุชื่อผู้รับสินค้า' };
      if (!input.recipientPhone?.trim()) return { success: false, error: 'กรุณาระบุเบอร์โทรผู้รับสินค้า' };
      if (!input.deliveryAddress?.trim()) return { success: false, error: 'กรุณาระบุที่อยู่จัดส่ง' };
      if (!input.deliveryProvince?.trim()) return { success: false, error: 'กรุณาระบุจังหวัดปลายทาง' };
      if (!input.deliveryPostalCode?.trim()) return { success: false, error: 'กรุณาระบุรหัสไปรษณีย์' };
      if (!input.requestedDeliveryDate) return { success: false, error: 'กรุณาระบุวันที่ต้องการให้จัดส่งถึง' };

      deliveryDate = new Date(input.requestedDeliveryDate);
      if (isNaN(deliveryDate.getTime())) {
        return { success: false, error: 'วันที่ต้องการให้จัดส่งถึงไม่ถูกต้อง' };
      }

      if (deliveryDate > reqDate) {
        return { success: false, error: 'วันที่ต้องการให้จัดส่งถึงต้องไม่ช้ากว่าวันที่ต้องการนำไปใช้งานจริง' };
      }
    }

    // 2. Transaction for atomic running number generation & saving
    const result = await prisma.$transaction(async (tx) => {
      // Find latest request number for format MKT-REQ-000001
      const lastRequests = await tx.$queryRaw<{ requestNo: string }[]>`
        SELECT "requestNo" FROM "MarketingRequest" 
        WHERE "requestNo" LIKE 'MKT-REQ-%'
        ORDER BY "requestNo" DESC 
        LIMIT 1 
        FOR UPDATE
      `;

      let nextNum = 1;
      if (lastRequests && lastRequests.length > 0) {
        const lastNo = lastRequests[0].requestNo;
        const match = lastNo.match(/MKT-REQ-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      const requestNo = `MKT-REQ-${String(nextNum).padStart(6, '0')}`;

      // Insert MarketingRequest
      const newRequest = await tx.marketingRequest.create({
        data: {
          requestNo,
          requesterId: user.id,
          requesterName: input.requesterName.trim(),
          requesterDepartment: input.requesterDepartment.trim(),
          requesterBranch: input.requesterBranch.trim(),
          requesterPhone: input.requesterPhone.trim(),
          requestType: input.requestType,
          title: input.title.trim(),
          description: input.description.trim(),
          requiredDate: reqDate,
          usageLocationType: input.usageLocationType,
          usageBranch: input.usageBranch?.trim() || null,
          usageProvince: input.usageProvince?.trim() || null,
          usageLocationName: input.usageLocationName?.trim() || null,
          usageLocationDetails: input.usageLocationDetails?.trim() || null,
          typeDetails: input.typeDetails || null,
          shippingMethod: input.shippingMethod || null,
          recipientName: input.recipientName?.trim() || null,
          recipientPhone: input.recipientPhone?.trim() || null,
          recipientCompanyBranch: input.recipientCompanyBranch?.trim() || null,
          deliveryAddress: input.deliveryAddress?.trim() || null,
          deliveryProvince: input.deliveryProvince?.trim() || null,
          deliveryPostalCode: input.deliveryPostalCode?.trim() || null,
          requestedDeliveryDate: deliveryDate,
          shippingRemarks: input.shippingRemarks?.trim() || null,
          status: 'BACKLOG',
          priority: 'NORMAL',
          attachments: input.attachments && input.attachments.length > 0 ? {
            create: input.attachments.map(att => ({
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              fileType: att.fileType || null,
              fileSize: att.fileSize || null,
              uploadedById: user.id
            }))
          } : undefined,
          logs: {
            create: {
              userId: user.id,
              actionType: 'CREATED',
              details: `สร้างคำขอ ${requestNo} โดย ${input.requesterName} (${input.requesterDepartment})`
            }
          }
        }
      });

      // 3. Automatically create Card in Marketing Board > Backlog
      try {
        let marketingBoard = await tx.kanbanBoard.findFirst({
          where: { name: { contains: 'Marketing', mode: 'insensitive' } },
          include: { lists: { orderBy: { position: 'asc' } } }
        });

        if (!marketingBoard) {
          marketingBoard = await tx.kanbanBoard.create({
            data: {
              name: 'Marketing Board',
              ownerId: user.id,
              lists: {
                create: [
                  { name: 'Backlog (Todo)', position: 1000 },
                  { name: 'Assigned to Team', position: 2000 },
                  { name: 'Product & Service Review', position: 3000 },
                  { name: 'Approval / Revise', position: 4000 },
                  { name: 'Done', position: 5000 },
                ]
              }
            },
            include: { lists: { orderBy: { position: 'asc' } } }
          });
        }

        // Target backlog list (either name includes 'backlog' or first list)
        const backlogList = marketingBoard.lists.find(l =>
          l.name.toLowerCase().includes('backlog')
        ) || marketingBoard.lists[0];

        if (backlogList) {
          const highestCard = await tx.kanbanCard.findFirst({
            where: { listId: backlogList.id },
            orderBy: { position: 'desc' }
          });
          const newPos = (highestCard?.position || 0) + 1000;

          const typeConfig = REQUEST_TYPES[input.requestType];
          const typeLabel = typeConfig ? typeConfig.title : input.requestType;
          const formattedUsageDate = reqDate.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          const kanbanCard = await tx.kanbanCard.create({
            data: {
              listId: backlogList.id,
              title: `[${requestNo}] ${input.title.trim()}`,
              description: `[${typeLabel}] [${input.requesterBranch}]\nผู้ขอ: ${input.requesterName} | ${input.requesterDepartment}\nวันที่ใช้งาน: ${formattedUsageDate}\n\n${input.description.trim()}`,
              dueDate: reqDate,
              position: newPos,
              color: '#3b82f6'
            }
          });

          await tx.marketingRequest.update({
            where: { id: newRequest.id },
            data: { kanbanCardId: kanbanCard.id }
          });

          // Sync request attachments directly into Kanban card so images, videos & files show immediately
          if (input.attachments && input.attachments.length > 0) {
            await syncMarketingRequestAttachmentsToCard(
              tx,
              kanbanCard.id,
              input.attachments,
              user.id
            );
          }
        }
      } catch (kanbanErr) {
        console.warn('Could not create kanban card on Marketing Board:', kanbanErr);
      }

      return newRequest;
    });

    // 4. Outside transaction: Send TERA Bot & In-App Notification
    try {
      const typeConfig = REQUEST_TYPES[input.requestType];
      const typeLabel = typeConfig ? typeConfig.title : input.requestType;

      const flexMsg = marketingRequestCreatedFlexMessage({
        requestNo: result.requestNo,
        title: result.title,
        requestTypeLabel: typeLabel,
        requesterName: result.requesterName,
        requesterDepartment: result.requesterDepartment,
        requesterBranch: result.requesterBranch,
        requiredDate: result.requiredDate,
        statusLabel: 'Backlog'
      });

      await pushMarketingNotification(flexMsg);

      // In-app notification to marketing staff & managers
      const marketingUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { contains: 'MARKETING', mode: 'insensitive' } },
            { role: { contains: 'การตลาด', mode: 'insensitive' } },
            { role: { contains: 'MANAGER', mode: 'insensitive' } },
            { role: { contains: 'ผู้จัดการ', mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      });

      await Promise.allSettled(
        marketingUsers
          .filter(m => m.id !== user.id)
          .map(mUser =>
            notifyUser(mUser.id, {
              title: `มีคำขอการตลาดใหม่: ${result.requestNo}`,
              body: `${result.title} (${result.requesterName} - ${result.requesterDepartment})`,
              category: 'MARKETING_REQUEST',
              url: `/marketing/requests/${result.requestNo}`
            }).catch(() => { })
          )
      );
    } catch (notifErr) {
      console.warn('Failed to send TERA bot notification:', notifErr);
    }

    safeRevalidate('/marketing/requests');
    safeRevalidate('/marketing/kanban');

    return {
      success: true,
      requestNo: result.requestNo,
      id: result.id
    };
  } catch (error: any) {
    console.error('Error creating marketing request:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการส่งคำขอ' };
  }
}

export async function getMarketingRequests(params?: {
  tab?: 'my' | 'all';
  search?: string;
  status?: string;
  type?: string;
  branch?: string;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [], counts: {} };
    }

    const roleStr = (user.role || '').toUpperCase();
    const isMarketingOrAdmin = [
      'MARKETING',
      'MANAGER',
      'SUPER_ADMIN',
      'การตลาด',
      'ผู้จัดการ',
      'ผู้บริหาร',
      'EXECUTIVE'
    ].some(r => roleStr.includes(r));

    const tab = params?.tab || (isMarketingOrAdmin ? 'all' : 'my');

    const whereClause: any = {};

    if (tab === 'my') {
      whereClause.requesterId = user.id;
    }

    if (params?.status && params.status !== 'ALL') {
      whereClause.status = params.status;
    }

    if (params?.type && params.type !== 'ALL') {
      whereClause.requestType = params.type;
    }

    if (params?.branch && params.branch !== 'ALL') {
      whereClause.requesterBranch = params.branch;
    }

    if (params?.search?.trim()) {
      const q = params.search.trim();
      whereClause.OR = [
        { requestNo: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { requesterName: { contains: q, mode: 'insensitive' } },
        { requesterDepartment: { contains: q, mode: 'insensitive' } },
        { requesterBranch: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [requests, countsRaw] = await Promise.all([
      prisma.marketingRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true, role: true }
          },
          requester: {
            select: { id: true, fullName: true, employeeId: true }
          },
          _count: {
            select: { attachments: true, comments: true }
          }
        }
      }),
      prisma.marketingRequest.groupBy({
        by: ['status'],
        _count: { id: true },
        where: tab === 'my' ? { requesterId: user.id } : {}
      })
    ]);

    const counts: Record<string, number> = {
      ALL: 0,
      BACKLOG: 0,
      TO_DO: 0,
      IN_PROGRESS: 0,
      WAITING: 0,
      REVIEW: 0,
      DONE: 0,
      CANCELLED: 0
    };

    let total = 0;
    countsRaw.forEach(c => {
      counts[c.status] = c._count.id;
      total += c._count.id;
    });
    counts.ALL = total;

    return {
      success: true,
      data: requests,
      counts,
      isMarketingOrAdmin,
      currentUserId: user.id
    };
  } catch (error: any) {
    console.error('Error in getMarketingRequests:', error);
    return { success: false, error: error.message, data: [], counts: {} };
  }
}

export async function getMarketingRequestByIdOrNo(idOrNo: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const trimmed = (idOrNo || '').trim();
    const upper = trimmed.toUpperCase();

    const request = await prisma.marketingRequest.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { requestNo: trimmed },
          { requestNo: upper },
          { requestNo: { equals: trimmed, mode: 'insensitive' } }
        ]
      },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true, phoneNumber: true, employeeId: true, role: true }
        },
        assignedTo: {
          select: { id: true, fullName: true, employeeId: true, role: true, email: true }
        },
        assignedBy: {
          select: { id: true, fullName: true }
        },
        attachments: {
          orderBy: { createdAt: 'desc' }
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, fullName: true, role: true, employeeId: true }
            }
          }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    if (!request) {
      return { success: false, error: 'ไม่พบรายการคำขอที่ระบุ', data: null };
    }

    // Auto-sync attachments to Kanban card if missing
    if (request.kanbanCardId && request.attachments && request.attachments.length > 0) {
      syncMarketingRequestAttachmentsToCard(
        prisma,
        request.kanbanCardId,
        request.attachments,
        user.id
      ).catch(() => {});
    }

    const roleStr = (user.role || '').toUpperCase();
    const isMarketingOrAdmin = [
      'MARKETING',
      'MANAGER',
      'SUPER_ADMIN',
      'การตลาด',
      'ผู้จัดการ',
      'ผู้บริหาร',
      'EXECUTIVE'
    ].some(r => roleStr.includes(r));

    const isRequester = request.requesterId === user.id;

    // Filter out internal comments for non-marketing users
    let visibleComments = request.comments;
    if (!isMarketingOrAdmin) {
      visibleComments = request.comments.filter(c => !c.isInternal);
    }

    // Fetch marketing users list for assignee dropdown
    let marketingUsers: any[] = [];
    if (isMarketingOrAdmin) {
      marketingUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { contains: 'MARKETING', mode: 'insensitive' } },
            { role: { contains: 'การตลาด', mode: 'insensitive' } },
            { role: { contains: 'MANAGER', mode: 'insensitive' } },
            { role: { contains: 'SUPER_ADMIN', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          fullName: true,
          role: true,
          employeeId: true,
          employeeSale: { select: { nickname: true } }
        }
      });
    }

    return {
      success: true,
      data: {
        ...request,
        comments: visibleComments
      },
      isMarketingOrAdmin,
      isRequester,
      currentUserId: user.id,
      marketingUsers
    };
  } catch (error: any) {
    console.error('Error in getMarketingRequestByIdOrNo:', error);
    return { success: false, error: error.message, data: null };
  }
}

export async function updateMarketingRequestStatus(requestId: string, newStatus: RequestStatusCode) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const roleStr = (user.role || '').toUpperCase();
    const isMarketingOrAdmin = [
      'MARKETING',
      'MANAGER',
      'SUPER_ADMIN',
      'การตลาด',
      'ผู้จัดการ',
      'ผู้บริหาร',
      'EXECUTIVE'
    ].some(r => roleStr.includes(r));

    if (!isMarketingOrAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ในการเปลี่ยนสถานะคำขอ' };
    }

    const existing = await prisma.marketingRequest.findUnique({
      where: { id: requestId },
      select: { id: true, requestNo: true, title: true, status: true, requesterId: true, kanbanCardId: true }
    });

    if (!existing) {
      return { success: false, error: 'ไม่พบรายการคำขอ' };
    }

    const oldStatusConfig = REQUEST_STATUSES[existing.status as RequestStatusCode];
    const newStatusConfig = REQUEST_STATUSES[newStatus];

    const completedAt = newStatus === 'DONE' ? new Date() : null;

    const updated = await prisma.marketingRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        completedAt: completedAt || (newStatus !== 'DONE' ? null : undefined),
        logs: {
          create: {
            userId: user.id,
            actionType: 'STATUS_CHANGED',
            details: `เปลี่ยนสถานะจาก "${oldStatusConfig?.label || existing.status}" เป็น "${newStatusConfig?.label || newStatus}"`
          }
        }
      }
    });

    // Synchronize status with KanbanCard on Marketing Board if available
    if (existing.kanbanCardId) {
      try {
        const statusToListMap: Record<string, string> = {
          BACKLOG: 'Backlog',
          TO_DO: 'To Do',
          IN_PROGRESS: 'In Progress',
          WAITING: 'Waiting',
          REVIEW: 'Review',
          DONE: 'Done',
          CANCELLED: 'Cancelled'
        };

        const targetListName = statusToListMap[newStatus];
        if (targetListName) {
          const list = await prisma.kanbanList.findFirst({
            where: {
              name: { contains: targetListName, mode: 'insensitive' }
            }
          });
          if (list) {
            await prisma.kanbanCard.update({
              where: { id: existing.kanbanCardId },
              data: {
                listId: list.id,
                isCompleted: newStatus === 'DONE'
              }
            });
          }
        }
      } catch (kErr) {
        console.warn('Could not sync kanban card status:', kErr);
      }
    }

    // Notify requester when task is accepted (TO_DO) or completed (DONE)
    if (newStatus === 'TO_DO' || newStatus === 'DONE') {
      try {
        const lineId = await getLineUserIdByCrmUserId(existing.requesterId);
        if (lineId) {
          const flex = marketingRequestStatusChangedFlexMessage({
            requestNo: existing.requestNo,
            title: existing.title,
            status: newStatus,
            statusLabel: newStatusConfig?.label || newStatus
          });
          await pushLineMessage(lineId, [flex], 'crm');
        }

        await notifyUser(existing.requesterId, {
          title: `อัปเดตสถานะคำขอ ${existing.requestNo}`,
          body: `คำขอ "${existing.title}" เปลี่ยนสถานะเป็น ${newStatusConfig?.label || newStatus}`,
          category: 'MARKETING_REQUEST',
          url: `/marketing/requests/${existing.requestNo}`
        });
      } catch (nErr) {
        console.warn('Notification to requester failed:', nErr);
      }
    }

    safeRevalidate('/marketing/requests');
    safeRevalidate(`/marketing/requests/${existing.requestNo}`);
    safeRevalidate(`/marketing/requests/${requestId}`);
    safeRevalidate('/marketing/kanban');
    safeRevalidate('/marketing-board');

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating status:', error);
    return { success: false, error: error.message };
  }
}

export async function assignMarketingRequest(requestId: string, assigneeId: string | null) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const roleStr = (user.role || '').toUpperCase();
    const isMarketingOrAdmin = [
      'MARKETING',
      'MANAGER',
      'SUPER_ADMIN',
      'การตลาด',
      'ผู้จัดการ',
      'ผู้บริหาร',
      'EXECUTIVE'
    ].some(r => roleStr.includes(r));

    if (!isMarketingOrAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ในการมอบหมายงาน' };
    }

    const existing = await prisma.marketingRequest.findUnique({
      where: { id: requestId },
      include: {
        attachments: true
      }
    });

    if (!existing) return { success: false, error: 'ไม่พบรายการคำขอ' };

    let assigneeUser = null;
    if (assigneeId) {
      assigneeUser = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true, fullName: true }
      });
    }

    // Requirement 22: Upon initial assignment from Backlog:
    // IF Status = Backlog AND Assignee != NULL THEN Status -> To Do
    let newStatus = existing.status;
    if (existing.status === 'BACKLOG' && assigneeId) {
      newStatus = 'TO_DO';
    }

    const updated = await prisma.marketingRequest.update({
      where: { id: requestId },
      data: {
        assignedToId: assigneeId,
        assignedById: user.id,
        assignedAt: assigneeId ? new Date() : null,
        status: newStatus,
        logs: {
          create: {
            userId: user.id,
            actionType: 'ASSIGNED',
            details: assigneeUser
              ? `มอบหมายงานให้คุณ ${assigneeUser.fullName}${existing.status === 'BACKLOG' && newStatus === 'TO_DO' ? ' (เปลี่ยนสถานะเป็น To Do)' : ''}`
              : 'ยกเลิกการมอบหมายงาน'
          }
        }
      }
    });

    // Sync kanban card & its attachments
    let kanbanCardId = existing.kanbanCardId;

    if (kanbanCardId) {
      try {
        await prisma.kanbanCard.update({
          where: { id: kanbanCardId },
          data: {
            assignedToId: assigneeId
          }
        });

        // Sync attachments from request to kanban card
        if (existing.attachments && existing.attachments.length > 0) {
          await syncMarketingRequestAttachmentsToCard(
            prisma,
            kanbanCardId,
            existing.attachments,
            user.id
          );
        }
      } catch (kErr) {
        console.warn('Could not sync kanban card assignee/attachments:', kErr);
      }
    } else {
      // If card was not linked/created earlier, create it in Marketing Board > Backlog (Todo)
      try {
        const marketingBoard = await prisma.kanbanBoard.findFirst({
          where: { name: { contains: 'Marketing', mode: 'insensitive' } },
          include: { lists: { orderBy: { position: 'asc' } } }
        });

        if (marketingBoard && marketingBoard.lists.length > 0) {
          const backlogList =
            marketingBoard.lists.find(
              l =>
                l.name.toLowerCase().includes('backlog') ||
                l.name.toLowerCase().includes('todo')
            ) || marketingBoard.lists[0];

          const highestCard = await prisma.kanbanCard.findFirst({
            where: { listId: backlogList.id },
            orderBy: { position: 'desc' }
          });
          const newPos = (highestCard?.position || 0) + 1000;

          const typeConfig = REQUEST_TYPES[existing.requestType as RequestTypeCode];
          const typeLabel = typeConfig ? typeConfig.title : existing.requestType;
          const formattedUsageDate = existing.requiredDate
            ? new Date(existing.requiredDate).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            : '-';

          const kanbanCard = await prisma.kanbanCard.create({
            data: {
              listId: backlogList.id,
              title: `[${existing.requestNo}] ${existing.title.trim()}`,
              description: `[${typeLabel}] [${existing.requesterBranch || ''}]\nผู้ขอ: ${existing.requesterName} | ${existing.requesterDepartment}\nวันที่ใช้งาน: ${formattedUsageDate}\n\n${(existing.description || '').trim()}`,
              dueDate: existing.requiredDate,
              position: newPos,
              color: '#3b82f6',
              assignedToId: assigneeId
            }
          });

          kanbanCardId = kanbanCard.id;
          await prisma.marketingRequest.update({
            where: { id: requestId },
            data: { kanbanCardId: kanbanCard.id }
          });

          // Sync attachments
          if (existing.attachments && existing.attachments.length > 0) {
            await syncMarketingRequestAttachmentsToCard(
              prisma,
              kanbanCard.id,
              existing.attachments,
              user.id
            );
          }
        }
      } catch (createErr) {
        console.warn('Could not auto-create kanban card on assign:', createErr);
      }
    }

    // Send notification to assigned person (Requirement 26)
    if (assigneeId && assigneeId !== user.id) {
      try {
        const lineId = await getLineUserIdByCrmUserId(assigneeId);
        if (lineId) {
          const flex = marketingRequestAssignedFlexMessage({
            requestNo: existing.requestNo,
            title: existing.title,
            requiredDate: existing.requiredDate
          });
          await pushLineMessage(lineId, [flex], 'crm');
        }

        await notifyUser(assigneeId, {
          title: `คุณได้รับมอบหมายงาน Marketing Request: ${existing.requestNo}`,
          body: `งาน: ${existing.title}`,
          category: 'MARKETING_REQUEST',
          url: `/marketing/requests/${existing.requestNo}`
        });
      } catch (nErr) {
        console.warn('Failed to notify assignee:', nErr);
      }
    }

    safeRevalidate('/marketing/requests');
    safeRevalidate(`/marketing/requests/${existing.requestNo}`);
    safeRevalidate(`/marketing/requests/${requestId}`);
    safeRevalidate('/marketing/kanban');
    safeRevalidate('/marketing-board');

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error assigning marketing request:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMarketingInternalFields(
  requestId: string,
  data: {
    priority?: PriorityCode;
    internalDueDate?: string | null;
    internalNote?: string | null;
  }
) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const roleStr = (user.role || '').toUpperCase();
    const isMarketingOrAdmin = [
      'MARKETING',
      'MANAGER',
      'SUPER_ADMIN',
      'การตลาด',
      'ผู้จัดการ',
      'ผู้บริหาร',
      'EXECUTIVE'
    ].some(r => roleStr.includes(r));

    if (!isMarketingOrAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลภายใน' };
    }

    const existing = await prisma.marketingRequest.findUnique({
      where: { id: requestId },
      select: { id: true, requestNo: true, priority: true }
    });
    if (!existing) return { success: false, error: 'ไม่พบรายการคำขอ' };

    const updateData: any = {};
    const logDetails: string[] = [];

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
      logDetails.push(`เปลี่ยนความสำคัญเป็น "${data.priority}"`);
    }

    if (data.internalDueDate !== undefined) {
      updateData.internalDueDate = data.internalDueDate ? new Date(data.internalDueDate) : null;
      logDetails.push(`อัปเดตกำหนดส่งภายใน`);
    }

    if (data.internalNote !== undefined) {
      updateData.internalNote = data.internalNote?.trim() || null;
      logDetails.push(`แก้ไขบันทึกภายใน`);
    }

    const updated = await prisma.marketingRequest.update({
      where: { id: requestId },
      data: {
        ...updateData,
        logs: logDetails.length > 0 ? {
          create: {
            userId: user.id,
            actionType: 'UPDATED',
            details: logDetails.join(', ')
          }
        } : undefined
      }
    });

    safeRevalidate(`/marketing/requests/${existing.requestNo}`);
    safeRevalidate(`/marketing/requests/${requestId}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating internal fields:', error);
    return { success: false, error: error.message };
  }
}

export async function addMarketingRequestComment(
  requestId: string,
  message: string,
  isInternal: boolean = false
) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!message?.trim()) return { success: false, error: 'กรุณากรอกข้อความ' };

    const roleStr = (user.role || '').toUpperCase();
    const isMarketingOrAdmin = [
      'MARKETING',
      'MANAGER',
      'SUPER_ADMIN',
      'การตลาด',
      'ผู้จัดการ',
      'ผู้บริหาร',
      'EXECUTIVE'
    ].some(r => roleStr.includes(r));

    // Only marketing/admins can make internal notes
    const actualIsInternal = isMarketingOrAdmin ? Boolean(isInternal) : false;

    const request = await prisma.marketingRequest.findUnique({
      where: { id: requestId },
      select: { id: true, requestNo: true, title: true, requesterId: true, assignedToId: true }
    });

    if (!request) return { success: false, error: 'ไม่พบรายการคำขอ' };

    const comment = await prisma.marketingRequestComment.create({
      data: {
        requestId,
        userId: user.id,
        message: message.trim(),
        isInternal: actualIsInternal
      },
      include: {
        user: { select: { id: true, fullName: true, role: true, employeeId: true } }
      }
    });

    // Notify appropriate party if not internal comment
    if (!actualIsInternal) {
      try {
        if (user.id === request.requesterId && request.assignedToId) {
          // Requester commented -> notify assignee
          await notifyUser(request.assignedToId, {
            title: `ความคิดเห็นใหม่ใน ${request.requestNo}`,
            body: `${user.fullName}: ${message.trim()}`,
            category: 'MARKETING_REQUEST',
            url: `/marketing/requests/${request.requestNo}`
          });
        } else if (user.id !== request.requesterId) {
          // Marketing commented -> notify requester
          await notifyUser(request.requesterId, {
            title: `ทีมการตลาดตอบกลับใน ${request.requestNo}`,
            body: `${user.fullName}: ${message.trim()}`,
            category: 'MARKETING_REQUEST',
            url: `/marketing/requests/${request.requestNo}`
          });
        }
      } catch (nErr) {
        console.warn('Failed to send comment notification:', nErr);
      }
    }

    safeRevalidate(`/marketing/requests/${request.requestNo}`);
    safeRevalidate(`/marketing/requests/${requestId}`);

    return { success: true, data: comment };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message };
  }
}

export async function getPendingMarketingRequestCount() {
  try {
    const user = await getUser();
    if (!user) return 0;

    const roleStr = (user.role || '').toLowerCase();
    const isMarketing = [
      'marketing',
      'การตลาด',
      'super_admin',
      'super admin',
      'manager',
      'ผู้จัดการฝ่ายการตลาด',
      'ผู้จัดการการตลาด'
    ].some(r => roleStr.includes(r));

    if (isMarketing) {
      return await prisma.marketingRequest.count({
        where: { status: 'BACKLOG' }
      });
    } else {
      // For non-marketing roles, show count of active requests submitted by the user
      return await prisma.marketingRequest.count({
        where: {
          requesterId: user.id,
          status: { in: ['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'WAITING', 'REVIEW'] }
        }
      });
    }
  } catch (error) {
    console.warn('Failed to get pending marketing request count:', error);
    return 0;
  }
}

export async function getMarketingBoardRequests() {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: {} };

    const requests = await prisma.marketingRequest.findMany({
      where: {
        status: { in: ['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE', 'CANCELLED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, employeeId: true, role: true }
        },
        requester: {
          select: { id: true, fullName: true }
        }
      }
    });

    const grouped: Record<string, any[]> = {
      BACKLOG: [],
      TO_DO: [],
      IN_PROGRESS: [],
      WAITING: [],
      REVIEW: [],
      DONE: [],
      CANCELLED: []
    };

    requests.forEach(r => {
      if (grouped[r.status]) {
        grouped[r.status].push(r);
      }
    });

    return { success: true, data: grouped };
  } catch (error: any) {
    console.error('Error in getMarketingBoardRequests:', error);
    return { success: false, error: error.message, data: {} };
  }
}
