"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { sendPushToUser } from "@/app/lib/pushNotification";

export async function createMaterialRequisition(data: any) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    // Generate Requisition Number: REQ-YYMM-XXXX
    const now = new Date();
    const yearBe = now.getFullYear() + 543;
    const year2Digit = yearBe.toString().slice(-2);
    const month = now.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');

    // Run transaction to get next running number safely
    const requisition = await prisma.$transaction(async (tx) => {
      const runningNum = await tx.requisitionRunningNumber.upsert({
        where: {
          yearBe_month: {
            yearBe: yearBe,
            month: month,
          },
        },
        update: {
          lastNumber: { increment: 1 },
        },
        create: {
          yearBe: yearBe,
          month: month,
          lastNumber: 1,
        },
      });

      const reqNumber = `REQ-${year2Digit}${monthStr}-${runningNum.lastNumber.toString().padStart(4, '0')}`;

      // Create MaterialRequisition
      return await tx.materialRequisition.create({
        data: {
          requisitionNumber: reqNumber,
          date: new Date(data.date),
          company: data.company,
          items: data.items,
          ...(session.id ? { requester: { connect: { id: session.id } } } : {}),
          ...(data.approverId ? { approver: { connect: { id: data.approverId } } } : {}),
          requesterSignatureUrl: data.requesterSignatureUrl,
          status: "PENDING_APPROVAL",
          requisitionType: data.requisitionType || "BORROW_EQUIPMENT",
          projectId: data.projectId || null,
          projectName: data.projectName || null,
          branch: data.branch || "BKK-HQ",
          destinationSite: data.destinationSite || null,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          deliveryNote: data.deliveryNote || null,
        },
      });
    });

    if (data.approverId) {
      // Optional: Send a notification to the approver
      sendPushToUser(data.approverId, {
        title: 'รออนุมัติใบเบิก/ยืมของ',
        body: `มีใบเบิก/ยืมของใหม่หมายเลข ${requisition.requisitionNumber} รอการอนุมัติจากคุณ`,
        url: `/requisitions/${requisition.id}/approve`,
        category: 'REQUISITION_APPROVAL'
      }).catch(console.error);
    }

    revalidatePath("/requisitions");
    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error creating material requisition:", error);
    return { success: false, error: error.message || "Failed to create requisition" };
  }
}

export async function updateMaterialRequisition(id: string, data: any) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const existingReq = await prisma.materialRequisition.findUnique({
      where: { id },
      select: { requesterId: true, status: true, approverId: true, requisitionNumber: true },
    });

    if (!existingReq) return { success: false, error: "Requisition not found" };
    if (existingReq.requesterId !== session.id) return { success: false, error: "Forbidden" };
    if (existingReq.status !== "PENDING_APPROVAL") return { success: false, error: "Cannot edit approved/completed requisition" };

    const updated = await prisma.materialRequisition.update({
      where: { id },
      data: {
        date: new Date(data.date),
        company: data.company,
        items: data.items,
        ...(data.approverId !== undefined
          ? data.approverId
            ? { approver: { connect: { id: data.approverId } } }
            : { approver: { disconnect: true } }
          : {}),
        ...(data.requesterSignatureUrl ? { requesterSignatureUrl: data.requesterSignatureUrl } : {}),
        requisitionType: data.requisitionType || undefined,
        projectId: data.projectId !== undefined ? data.projectId : undefined,
        projectName: data.projectName !== undefined ? data.projectName : undefined,
        branch: data.branch !== undefined ? data.branch : undefined,
        destinationSite: data.destinationSite !== undefined ? data.destinationSite : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : (data.deliveryDate === null ? null : undefined),
        deliveryNote: data.deliveryNote !== undefined ? data.deliveryNote : undefined,
      },
    });

    // If approver changed, delete old notification and create new one
    if (data.approverId && data.approverId !== existingReq.approverId) {
      if (existingReq.approverId) {
        await prisma.notification.deleteMany({
          where: {
            userId: existingReq.approverId,
            type: 'REQUISITION_APPROVAL',
            linkUrl: `/requisitions/${id}/approve`
          }
        });
      }

      sendPushToUser(data.approverId, {
        title: 'รออนุมัติใบเบิก/ยืมของ',
        body: `มีใบเบิก/ยืมของหมายเลข ${existingReq.requisitionNumber} รอการอนุมัติจากคุณ (แก้ไขใหม่)`,
        url: `/requisitions/${id}/approve`,
        category: 'REQUISITION_APPROVAL'
      }).catch(console.error);
    }

    revalidatePath("/requisitions");
    return { success: true, id: updated.id };
  } catch (error: any) {
    console.error("Error updating material requisition:", error);
    return { success: false, error: error.message || "Failed to update requisition" };
  }
}

export async function deleteMaterialRequisition(id: string) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const existingReq = await prisma.materialRequisition.findUnique({
      where: { id },
      select: { requesterId: true, status: true, approverId: true },
    });

    if (!existingReq) return { success: false, error: "Requisition not found" };
    if (existingReq.requesterId !== session.id) return { success: false, error: "Forbidden" };
    if (existingReq.status !== "PENDING_APPROVAL") return { success: false, error: "Cannot delete approved/completed requisition" };

    // Clean up notifications to the approver
    if (existingReq.approverId) {
      await prisma.notification.deleteMany({
        where: {
          userId: existingReq.approverId,
          type: 'REQUISITION_APPROVAL',
          linkUrl: `/requisitions/${id}/approve`
        }
      });
    }

    await prisma.materialRequisition.delete({
      where: { id },
    });

    revalidatePath("/requisitions");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting material requisition:", error);
    return { success: false, error: error.message || "Failed to delete requisition" };
  }
}

export async function approveMaterialRequisition(id: string, signatureUrl: string) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const requisition = await prisma.materialRequisition.update({
      where: { id },
      data: {
        approverSignatureUrl: signatureUrl,
        status: "APPROVED",
      },
    });

    // Notify Warehouse users
    const warehouseUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'warehouse', mode: 'insensitive' } },
          { role: { contains: 'คลังสินค้า', mode: 'insensitive' } },
          { role: { contains: 'store', mode: 'insensitive' } },
          { role: { contains: 'สโตร์', mode: 'insensitive' } },
        ]
      },
      select: { id: true }
    });

    if (warehouseUsers.length > 0) {
      Promise.all(
        warehouseUsers.map((u) =>
          sendPushToUser(u.id, {
            title: 'ใบเบิก/ยืมของรอจัดเตรียม',
            body: `มีใบเบิก/ยืมของหมายเลข ${requisition.requisitionNumber} ได้รับการอนุมัติแล้ว รอการจัดเตรียมของ`,
            url: `/store/requisitions/${requisition.id}`,
            category: 'REQUISITION_FULFILL',
          })
        )
      ).catch(console.error);
    }

    revalidatePath("/requisitions");
    revalidatePath("/store/requisitions");
    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error approving material requisition:", error);
    return { success: false, error: error.message };
  }
}

export async function getMaterialRequisitions(filters?: any) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const data = await prisma.materialRequisition.findMany({
      where: filters,
      include: {
        requester: {
          select: { fullName: true }
        },
        approver: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching material requisitions:", error);
    return { success: false, error: error.message };
  }
}

export async function getMyRequisitions() {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const data = await prisma.materialRequisition.findMany({
      where: {
        OR: [
          { requesterId: session.id },
          { approverId: session.id }
        ]
      },
      include: {
        requester: {
          select: { fullName: true }
        },
        approver: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching my requisitions:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRequisitionStatus(id: string, status: string) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const requisition = await prisma.materialRequisition.update({
      where: { id },
      data: { status },
    });

    if (requisition.requesterId) {
      const statusText = status === 'FULFILLED' || status === 'COMPLETED' ? 'จัดเตรียมและส่งมอบของเรียบร้อยแล้ว' 
                       : status === 'RETURNED' ? 'บันทึกรับคืนอุปกรณ์เข้าสโตร์เรียบร้อยแล้ว'
                       : status === 'PARTIALLY_RETURNED' ? 'บันทึกรับคืนอุปกรณ์เข้าสโตร์บางส่วนแล้ว'
                       : status === 'REJECTED' ? 'ถูกปฏิเสธการจ่ายของ' 
                       : `ถูกเปลี่ยนสถานะเป็น ${status}`;

      sendPushToUser(requisition.requesterId, {
        title: 'อัปเดตสถานะใบเบิก/ยืมของ',
        body: `ใบเบิก/ยืมของหมายเลข ${requisition.requisitionNumber} ${statusText}`,
        url: `/requisitions/${id}`,
        category: 'REQUISITION_UPDATE',
      }).catch(console.error);
    }

    revalidatePath("/requisitions");
    revalidatePath(`/requisitions/${id}`);
    revalidatePath("/store/requisitions");
    revalidatePath(`/store/requisitions/${id}`);
    revalidatePath("/store/dashboard");
    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error updating requisition status:", error);
    return { success: false, error: error.message };
  }
}

export async function returnMaterialRequisition(
  id: string,
  data: {
    status?: 'RETURNED' | 'PARTIALLY_RETURNED' | 'COMPLETED';
    returnedItems?: Array<{
      index: number;
      returnedQuantity: number;
      returnDate?: string;
      returnCondition?: string;
      returnRemark?: string;
    }>;
    returnNote?: string;
    returnerName?: string;
    receiverName?: string;
  }
) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const existingReq = await prisma.materialRequisition.findUnique({
      where: { id },
    });
    if (!existingReq) return { success: false, error: "Requisition not found" };

    const currentItems = Array.isArray(existingReq.items) ? (existingReq.items as any[]) : [];
    const nowIso = new Date().toISOString();

    // Map items with return info
    const updatedItems = currentItems.map((item, idx) => {
      const returnInfo = data.returnedItems?.find(ri => ri.index === idx);
      if (returnInfo) {
        return {
          ...item,
          returnedQuantity: Number(returnInfo.returnedQuantity) || 0,
          returnDate: returnInfo.returnDate || nowIso,
          returnCondition: returnInfo.returnCondition || 'NORMAL',
          returnRemark: returnInfo.returnRemark || '',
          returnReceiver: data.receiverName || session.fullName || 'เจ้าหน้าที่สโตร์',
          returnerName: data.returnerName || '',
        };
      }
      return item;
    });

    const targetStatus = data.status || 'RETURNED';

    const requisition = await prisma.materialRequisition.update({
      where: { id },
      data: {
        status: targetStatus,
        items: updatedItems,
      },
    });

    if (requisition.requesterId) {
      const statusText = targetStatus === 'RETURNED'
        ? 'สโตร์ได้รับคืนอุปกรณ์ครบถ้วนเรียบร้อยแล้ว'
        : targetStatus === 'PARTIALLY_RETURNED'
        ? 'สโตร์ได้รับคืนอุปกรณ์บางส่วนแล้ว'
        : 'ได้อัปเดตข้อมูลการคืนของ';

      sendPushToUser(requisition.requesterId, {
        title: 'บันทึกรับคืนอุปกรณ์เข้าสโตร์',
        body: `ใบเบิก/ยืมของหมายเลข ${requisition.requisitionNumber} ${statusText}`,
        url: `/requisitions/${id}`,
        category: 'REQUISITION_UPDATE',
      }).catch(console.error);
    }

    revalidatePath("/requisitions");
    revalidatePath(`/requisitions/${id}`);
    revalidatePath("/store/requisitions");
    revalidatePath(`/store/requisitions/${id}`);
    revalidatePath("/store/dashboard");

    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error returning material requisition:", error);
    return { success: false, error: error.message || "Failed to process return" };
  }
}

export async function submitReturnRequest(
  id: string,
  data: {
    returnedItems: Array<{
      index: number;
      returnQuantity: number;
      condition?: string;
      remark?: string;
    }>;
    returnNote?: string;
    photos?: string[];
  }
) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const req = await prisma.materialRequisition.findUnique({
      where: { id },
      include: { requester: { select: { fullName: true } } },
    });
    if (!req) return { success: false, error: "Requisition not found" };

    // Update Requisition status to RETURN_PENDING
    const updated = await prisma.materialRequisition.update({
      where: { id },
      data: {
        status: "RETURN_PENDING",
        returnRequestedAt: new Date(),
        returnRequestNote: data.returnNote || null,
        returnRequestPhotos: data.photos && data.photos.length > 0 ? data.photos : undefined,
      },
    });

    // Notify all warehouse users
    const warehouseUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'warehouse', mode: 'insensitive' } },
          { role: { contains: 'คลังสินค้า', mode: 'insensitive' } },
          { role: { contains: 'store', mode: 'insensitive' } },
          { role: { contains: 'สโตร์', mode: 'insensitive' } },
        ]
      },
      select: { id: true }
    });

    if (warehouseUsers.length > 0) {
      Promise.all(
        warehouseUsers.map((u) =>
          sendPushToUser(u.id, {
            title: 'แจ้งส่งคืนอุปกรณ์เข้าสโตร์',
            body: `คุณ ${session.fullName || req.requester?.fullName || 'พนักงาน'} ได้แจ้งขอส่งคืนอุปกรณ์ใบเบิก ${req.requisitionNumber} กำลังนำมาส่ง`,
            url: `/store/requisitions/${id}`,
            category: 'REQUISITION_UPDATE',
          })
        )
      ).catch(console.error);
    }

    revalidatePath("/requisitions");
    revalidatePath(`/requisitions/${id}`);
    revalidatePath("/store/requisitions");
    revalidatePath(`/store/requisitions/${id}`);
    revalidatePath("/store/dashboard");

    return { success: true, id: updated.id };
  } catch (error: any) {
    console.error("Error submitting return request:", error);
    return { success: false, error: error.message || "Failed to submit return request" };
  }
}

export async function getRequisitionById(id: string) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const data = await prisma.materialRequisition.findUnique({
      where: { id },
      include: {
        requester: {
          select: { fullName: true }
        },
        approver: {
          select: { fullName: true }
        }
      }
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching requisition:", error);
    return { success: false, error: error.message };
  }
}

export async function recordStoreFulfill(
  id: string,
  data: {
    storeStaffName?: string;
    storeStaffSignatureUrl?: string;
    deliveryDate?: string;
    deliveryNote?: string;
    status?: string; // 'DISPATCHED' (อยู่ระหว่างจัดส่ง) or 'COMPLETED' (ส่งมอบสำเร็จ)
  }
) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const requisition = await prisma.materialRequisition.update({
      where: { id },
      data: {
        storeStaffId: session.id,
        storeStaffName: data.storeStaffName || session.fullName || "เจ้าหน้าที่สโตร์",
        storeStaffSignatureUrl: data.storeStaffSignatureUrl || undefined,
        dispensedAt: new Date(),
        status: data.status || "COMPLETED",
        ...(data.deliveryDate ? { deliveryDate: new Date(data.deliveryDate) } : {}),
        ...(data.deliveryNote !== undefined ? { deliveryNote: data.deliveryNote } : {}),
      },
    });

    if (requisition.requesterId) {
      sendPushToUser(requisition.requesterId, {
        title: 'สโตร์ได้จัดส่ง/ส่งมอบของแล้ว',
        body: `ใบเบิกของ ${requisition.requisitionNumber} ได้รับการจัดเตรียมและส่งมอบเรียบร้อยแล้ว`,
        url: `/requisitions/${id}`,
        category: 'REQUISITION_UPDATE',
      }).catch(console.error);
    }

    revalidatePath("/requisitions");
    revalidatePath(`/requisitions/${id}`);
    revalidatePath("/store/requisitions");
    revalidatePath(`/store/requisitions/${id}`);
    revalidatePath("/store/dashboard");
    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error fulfilling requisition:", error);
    return { success: false, error: error.message };
  }
}

export async function recordSiteHandover(
  id: string,
  data: {
    receiverName: string;
    receiverSignatureUrl?: string;
    deliveryPhotos?: string[];
    deliveryNote?: string;
  }
) {
  try {
    const session = await getUser();
    if (!session) return { success: false, error: "Unauthorized" };

    const requisition = await prisma.materialRequisition.update({
      where: { id },
      data: {
        receiverName: data.receiverName,
        receiverSignatureUrl: data.receiverSignatureUrl || undefined,
        receivedAt: new Date(),
        deliveryPhotos: data.deliveryPhotos && data.deliveryPhotos.length > 0 ? data.deliveryPhotos : undefined,
        ...(data.deliveryNote !== undefined ? { deliveryNote: data.deliveryNote } : {}),
        status: "COMPLETED",
      },
    });

    if (requisition.requesterId) {
      sendPushToUser(requisition.requesterId, {
        title: 'บันทึกตรวจรับของหน้างานแล้ว',
        body: `ใบเบิกของ ${requisition.requisitionNumber} ได้รับการเซ็นตรวจรับหน้างานเรียบร้อยแล้ว`,
        url: `/requisitions/${id}`,
        category: 'REQUISITION_UPDATE',
      }).catch(console.error);
    }

    revalidatePath("/requisitions");
    revalidatePath(`/requisitions/${id}`);
    revalidatePath("/store/requisitions");
    revalidatePath(`/store/requisitions/${id}`);
    revalidatePath("/store/dashboard");
    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error recording site handover:", error);
    return { success: false, error: error.message };
  }
}

export async function getActiveProjectsForRequisition() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        name: true,
        clientName: true,
        siteAddress: true,
        province: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });
    return { success: true, data: projects };
  } catch (error: any) {
    console.error("Error fetching projects for requisition:", error);
    return { success: false, data: [] };
  }
}

export async function getRequisitionsByProject(projectId: string) {
  try {
    const data = await prisma.materialRequisition.findMany({
      where: {
        OR: [
          { projectId: projectId },
          { projectName: { contains: projectId, mode: 'insensitive' } }
        ]
      },
      include: {
        requester: { select: { fullName: true } },
        approver: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching requisitions by project:", error);
    return { success: false, data: [] };
  }
}

