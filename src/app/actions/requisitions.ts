"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

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
          requesterId: session.id,
          approverId: data.approverId || null,
          requesterSignatureUrl: data.requesterSignatureUrl,
          status: "PENDING_APPROVAL",
        },
      });
    });

    if (data.approverId) {
      // Optional: Send a notification to the approver
      await prisma.notification.create({
        data: {
          userId: data.approverId,
          type: 'REQUISITION_APPROVAL',
          title: 'รออนุมัติใบเบิก/ยืมของ',
          message: `มีใบเบิก/ยืมของใหม่หมายเลข ${requisition.requisitionNumber} รอการอนุมัติจากคุณ`,
          isRead: false,
          linkUrl: `/requisitions/${requisition.id}/approve`,
        }
      });
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
        approverId: data.approverId || null,
        ...(data.requesterSignatureUrl ? { requesterSignatureUrl: data.requesterSignatureUrl } : {}),
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

      await prisma.notification.create({
        data: {
          userId: data.approverId,
          type: 'REQUISITION_APPROVAL',
          title: 'รออนุมัติใบเบิก/ยืมของ',
          message: `มีใบเบิก/ยืมของหมายเลข ${existingReq.requisitionNumber} รอการอนุมัติจากคุณ (แก้ไขใหม่)`,
          isRead: false,
          linkUrl: `/requisitions/${id}/approve`,
        }
      });
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
      const notifications = warehouseUsers.map(u => ({
        userId: u.id,
        type: 'REQUISITION_FULFILL',
        title: 'ใบเบิก/ยืมของรอจัดเตรียม',
        message: `มีใบเบิก/ยืมของหมายเลข ${requisition.requisitionNumber} ได้รับการอนุมัติแล้ว รอการจัดเตรียมของ`,
        isRead: false,
        linkUrl: `/store/requisitions/${requisition.id}`,
      }));
      await prisma.notification.createMany({ data: notifications });
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

    revalidatePath("/requisitions");
    revalidatePath("/store/requisitions");
    revalidatePath(`/store/requisitions/${id}`);
    return { success: true, id: requisition.id };
  } catch (error: any) {
    console.error("Error updating requisition status:", error);
    return { success: false, error: error.message };
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
