'use server'

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function createPurchaseRequest(data: {
  prNumber: string;
  projectName: string;
  itemList: string;
  note?: string;
  orderId?: string;
  requestedBy?: string;
  recordedAt?: string | null;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const cleanPrNumber = data.prNumber.trim().toUpperCase();
    const existing = await prisma.purchaseRequest.findUnique({
      where: { prNumber: cleanPrNumber }
    });

    const requester = data.requestedBy?.trim() || user.fullName || user.email || 'Unknown';
    const docDate = data.recordedAt ? new Date(data.recordedAt) : new Date();

    if (existing) {
      // In-place overwrite existing PR instead of failing or creating duplicate entries
      const updated = await prisma.purchaseRequest.update({
        where: { id: existing.id },
        data: {
          projectName: data.projectName,
          itemList: data.itemList,
          note: data.note ? (existing.note ? `${existing.note}\n${data.note}` : data.note) : existing.note,
          requestedBy: requester || existing.requestedBy || 'Unknown',
          orderId: data.orderId || existing.orderId,
          recordedAt: data.recordedAt ? docDate : (existing.recordedAt || docDate)
        }
      });

      if (data.orderId) {
        await prisma.order.update({
          where: { id: data.orderId },
          data: { prFulfilledAt: new Date() }
        });
      }

      revalidatePath("/admin/procurement/pr");
      revalidatePath("/admin/procurement/dashboard");
      return { success: true, data: updated, isOverwritten: true };
    }

    const pr = await prisma.purchaseRequest.create({
      data: {
        prNumber: cleanPrNumber,
        projectName: data.projectName,
        itemList: data.itemList,
        note: data.note,
        requestedBy: requester,
        orderId: data.orderId || null,
        recordedAt: docDate
      }
    });

    // If orderId is provided, mark order prFulfilledAt
    if (data.orderId) {
      await prisma.order.update({
        where: { id: data.orderId },
        data: { prFulfilledAt: new Date() }
      });
    }

    revalidatePath("/admin/procurement/pr");
    
    return { success: true, data: pr };
  } catch (error) {
    console.error("Error creating PR:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้าง PR" };
  }
}

export async function cancelPurchaseOrder(poNumber: string, reason?: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์ยกเลิก PO" };
  }

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { poNumber }
    });

    if (!po) {
      return { success: false, error: "ไม่พบข้อมูล PO นี้ในระบบ" };
    }

    const cancelReasonText = reason?.trim() ? `เหตุผล: ${reason.trim()}` : "ยกเลิกใน Express/ระบบ";
    const cancelLog = `[ยกเลิกใน CRM: ${cancelReasonText} โดย ${user.fullName || user.email} ณ ${new Date().toLocaleString('th-TH')}]`;
    const newNote = po.note ? `${po.note}\n${cancelLog}` : cancelLog;
    const cancelReceivedBy = `ยกเลิกโดย ${user.fullName || user.email}${reason?.trim() ? ` (${reason.trim()})` : ''}`;

    const updated = await prisma.purchaseOrder.update({
      where: { poNumber },
      data: {
        receiveStatus: 'Cancelled',
        receivedBy: cancelReceivedBy,
        note: newNote
      }
    });

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error cancelling PO:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการยกเลิก PO" };
  }
}

export async function restorePurchaseOrder(poNumber: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์คืนสถานะ PO" };
  }

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { poNumber }
    });

    if (!po) {
      return { success: false, error: "ไม่พบข้อมูล PO นี้ในระบบ" };
    }

    const restoreLog = `[คืนสถานะใน CRM โดย ${user.fullName || user.email} ณ ${new Date().toLocaleString('th-TH')}]`;
    const newNote = po.note ? `${po.note}\n${restoreLog}` : restoreLog;

    const updated = await prisma.purchaseOrder.update({
      where: { poNumber },
      data: {
        receiveStatus: null,
        receivedBy: null,
        note: newNote
      }
    });

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error restoring PO:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการคืนสถานะ PO" };
  }
}

export async function updatePurchaseOrder(
  poId: number,
  data: {
    poNumber?: string;
    prNumber?: string;
    vendorName?: string;
    totalAmount?: number | null;
    creditTerm?: string;
    jobName?: string;
    deliveryDate?: string | null;
    note?: string;
  }
) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขข้อมูล PO" };
  }

  try {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: poId }
    });

    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูล PO นี้ในระบบ" };
    }

    const cleanNewPoNumber = data.poNumber ? data.poNumber.trim().toUpperCase() : existing.poNumber;

    // If PO number is being changed, verify it doesn't conflict with another PO
    if (cleanNewPoNumber !== existing.poNumber) {
      const duplicate = await prisma.purchaseOrder.findUnique({
        where: { poNumber: cleanNewPoNumber }
      });
      if (duplicate && duplicate.id !== poId) {
        return { success: false, error: `เลขที่ PO ${cleanNewPoNumber} มีอยู่ในระบบแล้ว` };
      }

      // Update related GoodsReceipt records to maintain relational integrity
      await prisma.goodsReceipt.updateMany({
        where: { poNumber: existing.poNumber },
        data: { poNumber: cleanNewPoNumber }
      });
    }

    // If PR number is provided, ensure PR exists to avoid foreign key constraint error
    if (data.prNumber && data.prNumber.trim()) {
      const cleanPr = data.prNumber.trim().toUpperCase();
      await prisma.purchaseRequest.upsert({
        where: { prNumber: cleanPr },
        update: {},
        create: { prNumber: cleanPr }
      });
    }

    // Build audit log
    const changes: string[] = [];
    if (cleanNewPoNumber !== existing.poNumber) changes.push(`เลข PO: ${existing.poNumber} -> ${cleanNewPoNumber}`);
    if (data.totalAmount !== undefined && Number(data.totalAmount) !== Number(existing.totalAmount)) {
      changes.push(`ยอดรวม: ${existing.totalAmount ?? 0} -> ${data.totalAmount ?? 0}`);
    }
    if (data.vendorName !== undefined && data.vendorName !== existing.vendorName) {
      changes.push(`ผู้ขาย: ${existing.vendorName || '-'} -> ${data.vendorName || '-'}`);
    }

    const editLog = changes.length > 0 
      ? `[แก้ไขโดย ${user.fullName || user.email} ณ ${new Date().toLocaleString('th-TH')}: ${changes.join(', ')}]`
      : `[แก้ไขข้อมูลโดย ${user.fullName || user.email} ณ ${new Date().toLocaleString('th-TH')}]`;
      
    const finalNote = data.note !== undefined 
      ? (data.note ? `${data.note}\n${editLog}` : editLog)
      : (existing.note ? `${existing.note}\n${editLog}` : editLog);

    const parsedDeliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : (data.deliveryDate === null ? null : existing.deliveryDate);

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        poNumber: cleanNewPoNumber,
        prNumber: data.prNumber !== undefined ? (data.prNumber ? data.prNumber.trim().toUpperCase() : null) : existing.prNumber,
        vendorName: data.vendorName !== undefined ? data.vendorName : existing.vendorName,
        totalAmount: data.totalAmount !== undefined ? (data.totalAmount !== null ? Number(data.totalAmount) : null) : existing.totalAmount,
        creditTerm: data.creditTerm !== undefined ? data.creditTerm : existing.creditTerm,
        jobName: data.jobName !== undefined ? data.jobName : existing.jobName,
        deliveryDate: parsedDeliveryDate,
        note: finalNote,
      }
    });

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/admin/procurement/pr");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");

    return { 
      success: true, 
      data: {
        ...updated,
        totalAmount: updated.totalAmount ? Number(updated.totalAmount) : null,
        depositAmount: updated.depositAmount ? Number(updated.depositAmount) : null,
        remainingAmount: updated.remainingAmount ? Number(updated.remainingAmount) : null,
        payment1: updated.payment1 ? Number(updated.payment1) : null,
      } 
    };
  } catch (error: any) {
    console.error("Error updating PO:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล PO" };
  }
}

export async function updatePurchaseRequest(
  prId: number,
  data: {
    prNumber?: string;
    projectName?: string;
    itemList?: string;
    requestedBy?: string;
    recordedAt?: string | null;
    note?: string;
  }
) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขข้อมูล PR" };
  }

  try {
    const existing = await prisma.purchaseRequest.findUnique({
      where: { id: prId }
    });

    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูล PR นี้ในระบบ" };
    }

    const cleanNewPrNumber = data.prNumber ? data.prNumber.trim().toUpperCase() : existing.prNumber;

    // If PR number is being changed, verify it doesn't conflict with another PR
    if (cleanNewPrNumber !== existing.prNumber) {
      const duplicate = await prisma.purchaseRequest.findUnique({
        where: { prNumber: cleanNewPrNumber }
      });
      if (duplicate && duplicate.id !== prId) {
        return { success: false, error: `เลขที่ PR ${cleanNewPrNumber} มีอยู่ในระบบแล้ว` };
      }

      // Update related PurchaseOrder records to maintain relational integrity
      await prisma.purchaseOrder.updateMany({
        where: { prNumber: existing.prNumber },
        data: { prNumber: cleanNewPrNumber }
      });
    }

    // Build audit log
    const changes: string[] = [];
    if (cleanNewPrNumber !== existing.prNumber) changes.push(`เลข PR: ${existing.prNumber} -> ${cleanNewPrNumber}`);
    if (data.projectName !== undefined && data.projectName !== existing.projectName) {
      changes.push(`โครงการ: ${existing.projectName || '-'} -> ${data.projectName || '-'}`);
    }
    if (data.requestedBy !== undefined && data.requestedBy !== existing.requestedBy) {
      changes.push(`ผู้ขอซื้อ: ${existing.requestedBy || '-'} -> ${data.requestedBy || '-'}`);
    }
    if (data.recordedAt !== undefined) {
      const oldDateStr = existing.recordedAt ? new Date(existing.recordedAt).toLocaleDateString('th-TH') : '-';
      const newDateStr = data.recordedAt ? new Date(data.recordedAt).toLocaleDateString('th-TH') : '-';
      if (oldDateStr !== newDateStr) {
        changes.push(`วันที่: ${oldDateStr} -> ${newDateStr}`);
      }
    }

    const editLog = changes.length > 0 
      ? `[แก้ไขโดย ${user.fullName || user.email} ณ ${new Date().toLocaleString('th-TH')}: ${changes.join(', ')}]`
      : `[แก้ไขข้อมูลโดย ${user.fullName || user.email} ณ ${new Date().toLocaleString('th-TH')}]`;
      
    const finalNote = data.note !== undefined 
      ? (data.note ? `${data.note}\n${editLog}` : editLog)
      : (existing.note ? `${existing.note}\n${editLog}` : editLog);

    const parsedRecordedAt = data.recordedAt !== undefined
      ? (data.recordedAt ? new Date(data.recordedAt) : null)
      : existing.recordedAt;

    const updated = await prisma.purchaseRequest.update({
      where: { id: prId },
      data: {
        prNumber: cleanNewPrNumber,
        projectName: data.projectName !== undefined ? data.projectName : existing.projectName,
        itemList: data.itemList !== undefined ? data.itemList : existing.itemList,
        requestedBy: data.requestedBy !== undefined ? data.requestedBy : existing.requestedBy,
        recordedAt: parsedRecordedAt,
        note: finalNote,
      },
      include: {
        purchaseOrders: {
          select: { poNumber: true, receiveStatus: true }
        }
      }
    });

    revalidatePath("/admin/procurement/pr");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/admin/procurement/po");
    revalidatePath("/orders");

    return { 
      success: true, 
      data: updated
    };
  } catch (error: any) {
    console.error("Error updating PR:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล PR" };
  }
}
