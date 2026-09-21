'use server'

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { syncSupplierPaymentsForPO } from "./supplierPayment";

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

    // Sync AP supplier payment tasks upon cancellation
    await syncSupplierPaymentsForPO(poNumber).catch(e => console.error("Error syncing AP on cancel:", e));

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");
    revalidatePath("/accounting/payables");

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

    // Sync AP supplier payment tasks upon restoration
    await syncSupplierPaymentsForPO(poNumber).catch(e => console.error("Error syncing AP on restore:", e));

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");
    revalidatePath("/accounting/payables");

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

    // Sync AP supplier payment tasks upon update
    await syncSupplierPaymentsForPO(cleanNewPoNumber).catch(e => console.error("Error syncing AP on update:", e));

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/admin/procurement/pr");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");
    revalidatePath("/accounting/payables");

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

/**
 * Record Store-In / Goods Receipt for a PO directly by the Purchasing team
 * Handles direct-to-site, labor/service, and warehouse receipts, with automatic AP unlock.
 */
export async function recordPurchaseOrderReceipt(data: {
  poNumber: string;
  receiptType: 'DIRECT_SITE' | 'LABOR_SERVICE' | 'WAREHOUSE' | 'OTHER';
  receivedBy: string;
  receivedAt?: string | null;
  note?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'store', 'สโตร์', 'คลังสินค้า', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์บันทึกการรับสินค้าเข้าสโตร์/หน้างาน" };
  }

  try {
    const cleanPoNumber = data.poNumber.trim();
    const po = await prisma.purchaseOrder.findUnique({
      where: { poNumber: cleanPoNumber }
    });

    if (!po) {
      return { success: false, error: "ไม่พบข้อมูล PO นี้ในระบบ" };
    }

    if (po.receiveStatus === 'Cancelled') {
      return { success: false, error: "PO นี้ถูกยกเลิกแล้ว ไม่สามารถรับสินค้าได้" };
    }

    const typeLabels: Record<string, string> = {
      DIRECT_SITE: 'ส่งมอบตรงหน้างาน (Direct-to-Site)',
      LABOR_SERVICE: 'ค่าแรง/ค่าบริการ (Labor & Service)',
      WAREHOUSE: 'รับเข้าสโตร์/คลังสินค้า (Warehouse)',
      OTHER: 'อื่นๆ (Other)'
    };

    const typeLabel = typeLabels[data.receiptType] || data.receiptType;
    const finalReceivedBy = data.receivedBy.trim() || user.fullName || user.email || 'ฝ่ายจัดซื้อ';
    const parsedReceivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();

    const timestampStr = new Date().toLocaleString('th-TH');
    let auditLog = `[บันทึกรับของโดยฝ่ายจัดซื้อ (${typeLabel}) ผู้ตรวจรับ: ${finalReceivedBy} ณ ${timestampStr}`;
    if (data.note?.trim()) {
      auditLog += ` - หมายเหตุ: ${data.note.trim()}`;
    }
    auditLog += ` โดยบัญชีผู้ใช้ ${user.fullName || user.email}]`;

    const finalNote = po.note ? `${po.note}\n${auditLog}` : auditLog;
    const storedReceivedBy = `[${typeLabel.split(' ')[0]}] ${finalReceivedBy}`;

    const updated = await prisma.purchaseOrder.update({
      where: { poNumber: cleanPoNumber },
      data: {
        receiveStatus: 'Received',
        receivedBy: storedReceivedBy,
        receivedAt: parsedReceivedAt,
        note: finalNote
      }
    });

    // Automatically trigger AP synchronization to unlock supplier payment tasks (AWAITING_GR -> PENDING)
    await syncSupplierPaymentsForPO(cleanPoNumber).catch(e => console.error("Error syncing AP on receipt:", e));

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/admin/procurement/pr");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");
    revalidatePath("/accounting/payables");

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
    console.error("Error recording PO receipt:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการบันทึกการรับสินค้า" };
  }
}

/**
 * Revert Store-In status back to pending
 */
export async function revertPurchaseOrderReceipt(poNumber: string, reason?: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'store', 'สโตร์', 'คลังสินค้า', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์ยกเลิกสถานะการรับสินค้า" };
  }

  try {
    const cleanPoNumber = poNumber.trim();
    const po = await prisma.purchaseOrder.findUnique({
      where: { poNumber: cleanPoNumber }
    });

    if (!po) {
      return { success: false, error: "ไม่พบข้อมูล PO นี้ในระบบ" };
    }

    const timestampStr = new Date().toLocaleString('th-TH');
    const revertLog = `[ยกเลิกสถานะรับสินค้ากลับเป็นรอรับของ โดย ${user.fullName || user.email} ณ ${timestampStr}${reason?.trim() ? ` เหตุผล: ${reason.trim()}` : ''}]`;
    const finalNote = po.note ? `${po.note}\n${revertLog}` : revertLog;

    const updated = await prisma.purchaseOrder.update({
      where: { poNumber: cleanPoNumber },
      data: {
        receiveStatus: null,
        receivedBy: null,
        receivedAt: null,
        note: finalNote
      }
    });

    // Re-sync AP
    await syncSupplierPaymentsForPO(cleanPoNumber).catch(e => console.error("Error syncing AP on revert receipt:", e));

    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
    revalidatePath("/admin/procurement/pr");
    revalidatePath("/store/receive");
    revalidatePath("/store/dashboard");
    revalidatePath("/accounting/payables");

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
    console.error("Error reverting PO receipt:", error);
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการยกเลิกสถานะการรับสินค้า" };
  }
}

/**
 * Batch Store-In for multiple POs (e.g. multiple labor/direct-to-site deliveries)
 */
export async function batchRecordPurchaseOrderReceipt(data: {
  poNumbers: string[];
  receiptType: 'DIRECT_SITE' | 'LABOR_SERVICE' | 'WAREHOUSE' | 'OTHER';
  receivedBy: string;
  receivedAt?: string | null;
  note?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const userRoleStr = (user.role || '').toLowerCase();
  const isAuthorized = ['admin', 'purchasing', 'จัดซื้อ', 'ผู้จัดการ', 'manager', 'director', 'store', 'สโตร์', 'คลังสินค้า', 'superadmin'].some(r => userRoleStr.includes(r));
  if (!isAuthorized) {
    return { success: false, error: "คุณไม่มีสิทธิ์บันทึกการรับสินค้าเข้าสโตร์/หน้างาน" };
  }

  if (!data.poNumbers || data.poNumbers.length === 0) {
    return { success: false, error: "กรุณาเลือกรายการ PO อย่างน้อย 1 รายการ" };
  }

  const results = [];
  const errors = [];

  for (const poNumber of data.poNumbers) {
    const res = await recordPurchaseOrderReceipt({
      poNumber,
      receiptType: data.receiptType,
      receivedBy: data.receivedBy,
      receivedAt: data.receivedAt,
      note: data.note
    });

    if (res.success) {
      results.push(poNumber);
    } else {
      errors.push(`${poNumber}: ${res.error}`);
    }
  }

  return {
    success: errors.length === 0,
    processedCount: results.length,
    failedCount: errors.length,
    errors
  };
}
