'use server'

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/client";
import {
  parseCreditTermDays,
  inferWhtPercent,
  calculateNetPayment,
  normalizePOPaymentAmounts,
  isValidBusinessDate,
  sanitizeBusinessDate
} from "@/app/lib/supplierPaymentUtils";

async function getCurrentUser() {
  try {
    const { getUser } = await import("@/app/lib/dal");
    const u = await getUser();
    if (u) return u;
  } catch {}

  if (process.env.IS_CLI_TEST === "true") {
    return await prisma.user.findFirst({ where: { isActive: true } });
  }
  return null;
}

/**
 * Synchronize Supplier Payment Tasks for a Purchase Order (Two-Leg AP Engine)
 * - Leg 1: Deposit (if depositAmount > 0)
 * - Leg 2: Remaining Balance (held in AWAITING_GR until 3-way matched)
 */
export async function syncSupplierPaymentsForPO(poNumber: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { poNumber },
    include: {
      goodsReceipts: true,
      supplierPaymentTasks: true,
    }
  });

  if (!po) return { success: false, error: "PO not found" };

  // If PO is cancelled, cancel all pending supplier payment tasks
  if (po.receiveStatus === 'Cancelled') {
    await prisma.supplierPaymentTask.updateMany({
      where: {
        poNumber,
        status: { in: ['PENDING', 'AWAITING_GR', 'APPROVED'] }
      },
      data: { status: 'CANCELLED' }
    });
    return { success: true, cancelled: true };
  }

  const totalAmount = Number(po.totalAmount) || 0;
  if (totalAmount <= 0) return { success: true, skipped: true, reason: "Zero amount" };

  const rawDeposit = po.depositAmount !== null && po.depositAmount !== undefined ? po.depositAmount : po.payment1;
  const { depositAmount, remainingAmount } = normalizePOPaymentAmounts(
    totalAmount,
    rawDeposit,
    po.remainingAmount
  );

  const whtRate = inferWhtPercent(po.jobName, po.itemList, po.note);
  const creditDays = parseCreditTermDays(po.creditTerm);

  // Check 3-Way Match delivery status
  const completeGR = po.goodsReceipts.find(g => g.isCompleteDelivery) || po.goodsReceipts[0];
  const isGoodsReceived = po.receiveStatus === 'Received' || Boolean(completeGR && completeGR.receivedAt);
  const goodsReceiptDate = po.receivedAt || completeGR?.receivedAt || null;

  const results = [];

  // ==========================================
  // LEG 1: Upfront Deposit Task (if applicable)
  // ==========================================
  if (depositAmount > 0) {
    const depCalculated = calculateNetPayment(depositAmount, whtRate);
    
    // Deposit due date: Upfront deposit is due when the PO is issued (recordedAt or createdAt), NOT on delivery date
    const baseDepositDate = isValidBusinessDate(po.recordedAt)
      ? po.recordedAt!
      : isValidBusinessDate(po.createdAt)
        ? po.createdAt!
        : new Date();
    const depositDueDate = sanitizeBusinessDate(baseDepositDate, new Date());

    const existingDeposit = po.supplierPaymentTasks.find(t => t.paymentType === 'DEPOSIT');

    if (existingDeposit) {
      // Update if not yet paid
      if (existingDeposit.status !== 'PAID_VERIFIED') {
        const hasManualDeferredDate = existingDeposit.note?.includes('[เลื่อนชำระ') && isValidBusinessDate(existingDeposit.dueDate);
        const targetDueDate = hasManualDeferredDate ? existingDeposit.dueDate : depositDueDate;

        const updated = await prisma.supplierPaymentTask.update({
          where: { id: existingDeposit.id },
          data: {
            grossAmount: depCalculated.grossAmount,
            whtPercent: depCalculated.whtPercent,
            whtAmount: depCalculated.whtAmount,
            netPayableAmount: depCalculated.netPayableAmount,
            dueDate: targetDueDate,
          }
        });
        results.push(updated);
      }
    } else {
      const created = await prisma.supplierPaymentTask.create({
        data: {
          poNumber,
          paymentType: 'DEPOSIT',
          sequenceNo: 1,
          grossAmount: depCalculated.grossAmount,
          whtPercent: depCalculated.whtPercent,
          whtAmount: depCalculated.whtAmount,
          netPayableAmount: depCalculated.netPayableAmount,
          dueDate: depositDueDate,
          paymentMethod: po.creditTerm?.toLowerCase().includes('pdc') ? 'CHEQUE_PDC' : 'BANK_TRANSFER',
          isGoodsReceived: false,
          status: 'PENDING',
          note: `มัดจำผู้ขาย PO ${poNumber}`
        }
      });
      results.push(created);
    }
  } else {
    // If deposit is 0, clean up any stale pending deposit task
    const staleDeposit = po.supplierPaymentTasks.find(t => t.paymentType === 'DEPOSIT');
    if (staleDeposit && staleDeposit.status !== 'PAID_VERIFIED') {
      await prisma.supplierPaymentTask.delete({ where: { id: staleDeposit.id } });
    }
  }

  // ==========================================
  // LEG 2: Balance / Final Credit Task
  // ==========================================
  const balanceGross = depositAmount > 0 ? remainingAmount : totalAmount;

  if (balanceGross > 0) {
    // Check if custom split installments already exist for balance (PROGRESS and/or multiple tasks)
    const nonDepositTasks = po.supplierPaymentTasks.filter(t => t.paymentType !== 'DEPOSIT');
    if (nonDepositTasks.length > 1) {
      // User has custom split installment plan! Preserve it and only sync GR status if needed
      for (const task of nonDepositTasks) {
        if (task.status !== 'PAID_VERIFIED') {
          const shouldUpdateGR = isGoodsReceived !== task.isGoodsReceived;
          const nextStatus = isGoodsReceived && task.status === 'AWAITING_GR' ? 'PENDING' : task.status;
          if (shouldUpdateGR || nextStatus !== task.status) {
            const updated = await prisma.supplierPaymentTask.update({
              where: { id: task.id },
              data: {
                isGoodsReceived,
                goodsReceiptId: completeGR?.id || task.goodsReceiptId,
                status: nextStatus,
              }
            });
            results.push(updated);
          } else {
            results.push(task);
          }
        } else {
          results.push(task);
        }
      }
      return { success: true, tasks: results };
    }

    const balCalculated = calculateNetPayment(balanceGross, whtRate);
    
    // Determine balance due date based on 3-Way Match
    let balanceDueDate: Date;
    let balanceStatus = 'PENDING';

    if (isGoodsReceived && goodsReceiptDate) {
      // Due Date = Goods Receipt Date + Credit Term Days
      const validGRDate = isValidBusinessDate(goodsReceiptDate)
        ? goodsReceiptDate
        : (isValidBusinessDate(po.recordedAt) ? po.recordedAt! : new Date());
      const d = new Date(validGRDate);
      d.setDate(d.getDate() + creditDays);
      d.setHours(23, 59, 59, 999);
      balanceDueDate = sanitizeBusinessDate(d, new Date());
      balanceStatus = 'PENDING'; // Ready for review / payment
    } else {
      // Goods NOT received: Blocked on 3-Way Match
      balanceStatus = 'AWAITING_GR';
      const validDelivery =
        isValidBusinessDate(po.deliveryDate) && (!po.recordedAt || po.deliveryDate! >= po.recordedAt)
          ? po.deliveryDate!
          : null;
      const validRecorded = isValidBusinessDate(po.recordedAt) ? po.recordedAt : null;
      const fallback = validDelivery || validRecorded || po.createdAt || new Date();
      const d = new Date(fallback);
      d.setDate(d.getDate() + creditDays);
      d.setHours(23, 59, 59, 999);
      balanceDueDate = sanitizeBusinessDate(d, new Date());
    }

    const existingBalance = po.supplierPaymentTasks.find(t => t.paymentType === 'FINAL_BALANCE');

    if (existingBalance) {
      if (existingBalance.status !== 'PAID_VERIFIED') {
        const hasManualDeferredDate = existingBalance.note?.includes('[เลื่อนชำระ') && isValidBusinessDate(existingBalance.dueDate);
        const targetDueDate = hasManualDeferredDate ? existingBalance.dueDate : balanceDueDate;

        const updated = await prisma.supplierPaymentTask.update({
          where: { id: existingBalance.id },
          data: {
            grossAmount: balCalculated.grossAmount,
            whtPercent: balCalculated.whtPercent,
            whtAmount: balCalculated.whtAmount,
            netPayableAmount: balCalculated.netPayableAmount,
            dueDate: targetDueDate,
            isGoodsReceived,
            goodsReceiptId: completeGR?.id || null,
            status: existingBalance.status === 'APPROVED' ? 'APPROVED' : balanceStatus,
          }
        });
        results.push(updated);
      }
    } else {
      const created = await prisma.supplierPaymentTask.create({
        data: {
          poNumber,
          paymentType: 'FINAL_BALANCE',
          sequenceNo: depositAmount > 0 ? 2 : 1,
          grossAmount: balCalculated.grossAmount,
          whtPercent: balCalculated.whtPercent,
          whtAmount: balCalculated.whtAmount,
          netPayableAmount: balCalculated.netPayableAmount,
          dueDate: balanceDueDate,
          paymentMethod: po.creditTerm?.toLowerCase().includes('pdc') ? 'CHEQUE_PDC' : 'BANK_TRANSFER',
          isGoodsReceived,
          goodsReceiptId: completeGR?.id || null,
          status: balanceStatus,
          note: isGoodsReceived ? `จ่ายตามกำหนดรับของ (เครดิต ${creditDays} วัน)` : `รอยืนยันตรวจรับสินค้า (AWAITING_GR)`
        }
      });
      results.push(created);
    }
  } else {
    // If balance is 0, clean up any stale pending balance task
    const staleBalance = po.supplierPaymentTasks.find(t => t.paymentType === 'FINAL_BALANCE');
    if (staleBalance && staleBalance.status !== 'PAID_VERIFIED') {
      await prisma.supplierPaymentTask.delete({ where: { id: staleBalance.id } });
    }
  }

  return { success: true, tasks: results };
}

/**
 * Fetch list of Supplier Payment Tasks with filters
 */
export async function getSupplierPaymentTasks(filters?: {
  status?: string;
  paymentType?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  isGoodsReceived?: boolean;
  limit?: number;
}) {
  const where: Prisma.SupplierPaymentTaskWhereInput = {};

  if (filters?.isGoodsReceived !== undefined) {
    where.isGoodsReceived = filters.isGoodsReceived;
  }

  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters?.paymentType && filters.paymentType !== 'ALL') {
    where.paymentType = filters.paymentType;
  }
  if (filters?.company && filters.company !== 'ALL') {
    const code = filters.company.toUpperCase();
    where.OR = [
      { goodsReceipt: { company: code } },
      { poNumber: { contains: `-${code[1] || code}` } },
      { poNumber: { contains: code } }
    ];
  }
  if (filters?.startDate || filters?.endDate) {
    where.dueDate = {};
    if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.dueDate.lte = end;
    }
  }
  if (filters?.search) {
    const s = filters.search.trim();
    where.OR = [
      { poNumber: { contains: s, mode: 'insensitive' } },
      { purchaseOrder: { vendorName: { contains: s, mode: 'insensitive' } } },
      { purchaseOrder: { jobName: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const tasks = await prisma.supplierPaymentTask.findMany({
    where,
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          vendorName: true,
          jobName: true,
          creditTerm: true,
          totalAmount: true,
          depositAmount: true,
          remainingAmount: true,
          deliveryDate: true,
          receiveStatus: true,
          receivedAt: true,
          receivedBy: true,
          reportedBy: true,
          accountNumber: true,
          itemList: true,
          note: true,
          recordedAt: true,
          createdAt: true,
          purchaseRequest: {
            select: {
              prNumber: true,
              projectName: true,
              requestedBy: true,
              note: true,
            }
          }
        }
      },
      goodsReceipt: {
        select: {
          id: true,
          company: true,
          deliveryNoteNumber: true,
          receivedAt: true,
          recipient: true,
          isCompleteDelivery: true,
          status: true,
        }
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ],
    take: filters?.limit !== undefined ? filters.limit : undefined,
  });

  return tasks;
}

/**
 * Retrieve high-level AP dashboard summary metrics
 */
export async function getSupplierPaymentDashboardSummary(providedTasks?: any[]) {
  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  in7Days.setHours(23, 59, 59, 999);

  const allTasks = (providedTasks && Array.isArray(providedTasks)) ? providedTasks : await prisma.supplierPaymentTask.findMany({
    select: {
      id: true,
      status: true,
      paymentType: true,
      grossAmount: true,
      whtAmount: true,
      netPayableAmount: true,
      paidAmount: true,
      dueDate: true,
      isGoodsReceived: true,
      poNumber: true,
      goodsReceipt: {
        select: { company: true }
      }
    }
  });

  let totalPendingGross = 0;
  let totalPendingNet = 0;
  let pendingCount = 0;

  let awaitingGrCount = 0;
  let awaitingGrAmount = 0;

  let readyToPayCount = 0;
  let readyToPayAmount = 0;

  let overdueCount = 0;
  let overdueAmount = 0;

  let dueIn7DaysCount = 0;
  let dueIn7DaysAmount = 0;

  let paidCount = 0;
  let paidAmount = 0;

  const companyCounts: Record<string, number> = { ALL: allTasks.length, TP: 0, TG: 0, TE: 0, OTHER: 0 };

  for (const t of allTasks) {
    const net = Number(t.netPayableAmount) || 0;
    const gross = Number(t.grossAmount) || 0;
    const isPaid = t.status === 'PAID_VERIFIED';
    const isCancelled = t.status === 'CANCELLED';

    // Company breakdown
    const co = t.goodsReceipt?.company || (t.poNumber.includes('-P') ? 'TP' : t.poNumber.includes('-G') ? 'TG' : t.poNumber.includes('-E') ? 'TE' : 'OTHER');
    if (companyCounts[co] !== undefined) {
      companyCounts[co]++;
    } else {
      companyCounts.OTHER++;
    }

    if (isPaid) {
      paidCount++;
      paidAmount += Number(t.paidAmount) || net;
      continue;
    }

    if (isCancelled) continue;

    // Active pending tasks
    totalPendingGross += gross;
    totalPendingNet += net;
    pendingCount++;

    if (t.status === 'AWAITING_GR') {
      awaitingGrCount++;
      awaitingGrAmount += net;
    } else if (t.status === 'PENDING' || t.status === 'APPROVED') {
      readyToPayCount++;
      readyToPayAmount += net;
    }

    // Overdue check
    if (t.dueDate && new Date(t.dueDate) < now) {
      overdueCount++;
      overdueAmount += net;
    } else if (t.dueDate && new Date(t.dueDate) <= in7Days) {
      dueIn7DaysCount++;
      dueIn7DaysAmount += net;
    }
  }

  return {
    totalTasks: allTasks.length,
    totalPendingGross,
    totalPendingNet,
    pendingCount,
    awaitingGrCount,
    awaitingGrAmount,
    readyToPayCount,
    readyToPayAmount,
    overdueCount,
    overdueAmount,
    dueIn7DaysCount,
    dueIn7DaysAmount,
    paidCount,
    paidAmount,
    companyCounts,
  };
}

/**
 * Update Supplier Payment Task status (e.g. approve for payment)
 */
export async function updateSupplierPaymentStatus(taskId: string, status: string, note?: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const task = await prisma.supplierPaymentTask.findUnique({
    where: { id: taskId },
    select: { poNumber: true, paymentType: true }
  });

  const updated = await prisma.supplierPaymentTask.update({
    where: { id: taskId },
    data: {
      status,
      note: note ? note : undefined,
    }
  });

  if (task) {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear() + 543}`;
    const statusText = status === 'APPROVED' ? 'อนุมัติจ่ายเงินแล้ว' : (status === 'CANCELLED' ? 'ยกเลิกรายการจ่าย' : status);
    const legText = task.paymentType === 'DEPOSIT' ? 'เงินมัดจำ' : 'ยอดคงเหลือ';
    const statusLog = `[การเงินเปลี่ยนสถานะ ${todayStr}: ${legText} เป็น "${statusText}"${note ? ` เหตุผล: ${note}` : ''} โดย ${user.fullName || 'การเงิน'}]`;
    const po = await prisma.purchaseOrder.findUnique({ where: { poNumber: task.poNumber }, select: { note: true } });
    if (po) {
      const newPoNote = po.note ? `${po.note}\n${statusLog}` : statusLog;
      await prisma.purchaseOrder.update({
        where: { poNumber: task.poNumber },
        data: { note: newPoNote }
      });
    }
  }

  try {
    revalidatePath('/accounting/payables');
    revalidatePath('/accounting/dashboard');
    revalidatePath('/admin/procurement/po');
    revalidatePath('/admin/procurement/dashboard');
  } catch {}
  return { success: true, task: updated };
}

/**
 * Edit Supplier Payment Task information, including installment due date, payment date, and deferral notes
 */
export async function updateSupplierPaymentSchedule(taskId: string, data: {
  dueDate?: string;
  deferralReason?: string;
  paidDate?: string;
  paymentMethod?: string;
  chequeDueDate?: string;
  chequeNumber?: string;
  note?: string;
  grossAmount?: number;
  whtPercent?: number;
  vendorName?: string;
  accountNumber?: string;
  creditTerm?: string;
  jobName?: string;
  editorReason?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const task = await prisma.supplierPaymentTask.findUnique({
    where: { id: taskId },
    include: {
      purchaseOrder: true,
    },
  });

  if (!task) return { success: false, error: "Task not found" };

  const updateData: Prisma.SupplierPaymentTaskUpdateInput = {};
  const poUpdateData: Prisma.PurchaseOrderUpdateInput = {};
  const accountingChanges: string[] = [];

  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear() + 543}`;

  // 1. Due date & Deferrals
  let deferralLog = "";
  if (data.dueDate) {
    const newDueDate = new Date(data.dueDate);
    newDueDate.setHours(23, 59, 59, 999);

    const oldDueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isDateChanged =
      !oldDueDate ||
      oldDueDate.toISOString().slice(0, 10) !== newDueDate.toISOString().slice(0, 10);

    if (isDateChanged) {
      updateData.dueDate = newDueDate;
      const oldStr = oldDueDate
        ? `${oldDueDate.getDate().toString().padStart(2, "0")}/${(oldDueDate.getMonth() + 1).toString().padStart(2, "0")}/${oldDueDate.getFullYear() + 543}`
        : "-";
      const newStr = `${newDueDate.getDate().toString().padStart(2, "0")}/${(newDueDate.getMonth() + 1).toString().padStart(2, "0")}/${newDueDate.getFullYear() + 543}`;
      const reason = data.deferralReason ? ` [เหตุผล: ${data.deferralReason}]` : "";
      deferralLog = `[เลื่อนชำระ ${todayStr}: จาก ${oldStr} เป็น ${newStr}${reason} โดย ${user.fullName || "บัญชี"}]`;
      accountingChanges.push(`เลื่อนกำหนดชำระจาก ${oldStr} เป็น ${newStr}${data.deferralReason ? ` (${data.deferralReason})` : ""}`);
    }
  }

  // 2. Paid date
  if (data.paidDate !== undefined) {
    updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null;
  }

  // 3. Payment method
  if (data.paymentMethod && data.paymentMethod !== task.paymentMethod) {
    updateData.paymentMethod = data.paymentMethod;
    const methodNames: Record<string, string> = {
      BANK_TRANSFER: "โอนเงินผ่านธนาคาร",
      CHEQUE_PDC: "เช็คสั่งจ่ายล่วงหน้า (PDC)",
      CASH: "เงินสด",
    };
    accountingChanges.push(`วิธีจ่ายเงิน: ${methodNames[data.paymentMethod] || data.paymentMethod}`);
  }

  // 4. Cheque PDC info
  if (data.chequeDueDate !== undefined) {
    updateData.chequeDueDate = data.chequeDueDate ? new Date(data.chequeDueDate) : null;
  }
  if (data.chequeNumber !== undefined) {
    updateData.chequeNumber = data.chequeNumber || null;
  }

  // 5. Financial Amounts (Gross & WHT)
  if (data.grossAmount !== undefined || data.whtPercent !== undefined) {
    const gross = data.grossAmount !== undefined ? data.grossAmount : Number(task.grossAmount);
    const whtPercent = data.whtPercent !== undefined ? data.whtPercent : Number(task.whtPercent);
    const calculated = calculateNetPayment(gross, whtPercent);
    updateData.grossAmount = calculated.grossAmount;
    updateData.whtPercent = calculated.whtPercent;
    updateData.whtAmount = calculated.whtAmount;
    updateData.netPayableAmount = calculated.netPayableAmount;

    if (data.whtPercent !== undefined && Number(data.whtPercent) !== Number(task.whtPercent)) {
      accountingChanges.push(
        `ปรับหัก ณ ที่จ่ายจาก ${Number(task.whtPercent)}% เป็น ${data.whtPercent}% (หัก ${Number(calculated.whtAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ., ยอดจ่ายสุทธิ ${Number(calculated.netPayableAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.)`
      );
    }
    if (data.grossAmount !== undefined && Number(data.grossAmount) !== Number(task.grossAmount)) {
      accountingChanges.push(
        `ปรับยอดเงินงวดจาก ${Number(task.grossAmount).toLocaleString("th-TH")} บ. เป็น ${data.grossAmount.toLocaleString("th-TH")} บ.`
      );
    }
  }

  // 6. Vendor & Account Info on PurchaseOrder
  if (
    data.vendorName !== undefined &&
    data.vendorName.trim() &&
    data.vendorName.trim() !== (task.purchaseOrder?.vendorName || "")
  ) {
    poUpdateData.vendorName = data.vendorName.trim();
    accountingChanges.push(
      `ผู้ขาย: ${task.purchaseOrder?.vendorName || "-"} -> ${data.vendorName.trim()}`
    );
  }
  if (
    data.accountNumber !== undefined &&
    data.accountNumber.trim() !== (task.purchaseOrder?.accountNumber || "")
  ) {
    poUpdateData.accountNumber = data.accountNumber.trim() || null;
    accountingChanges.push(
      `เลขบัญชีผู้ขาย: ${task.purchaseOrder?.accountNumber || "-"} -> ${data.accountNumber.trim() || "-"}`
    );
  }
  if (
    data.creditTerm !== undefined &&
    data.creditTerm.trim() !== (task.purchaseOrder?.creditTerm || "")
  ) {
    poUpdateData.creditTerm = data.creditTerm.trim();
    accountingChanges.push(
      `เครดิตเทอม: ${task.purchaseOrder?.creditTerm || "-"} -> ${data.creditTerm.trim()}`
    );
  }
  if (
    data.jobName !== undefined &&
    data.jobName.trim() !== (task.purchaseOrder?.jobName || "")
  ) {
    poUpdateData.jobName = data.jobName.trim();
    accountingChanges.push(
      `ชื่องาน: ${task.purchaseOrder?.jobName || "-"} -> ${data.jobName.trim()}`
    );
  }

  // 7. Audit Notes & Reason
  if (data.editorReason && data.editorReason.trim()) {
    accountingChanges.push(`เหตุผล: ${data.editorReason.trim()}`);
  }

  const editorName = user.fullName || user.email || "ฝ่ายบัญชีและการเงิน";
  let accountingAuditLog = "";
  if (accountingChanges.length > 0) {
    accountingAuditLog = `[ฝ่ายบัญชีแก้ไขข้อมูล ${todayStr} โดย ${editorName}: ${accountingChanges.join(" | ")}]`;
  }

  const noteParts: string[] = [];
  if (task.note) noteParts.push(task.note);
  if (data.note && data.note.trim()) noteParts.push(data.note.trim());
  if (deferralLog) noteParts.push(deferralLog);
  if (accountingAuditLog) noteParts.push(accountingAuditLog);

  if (noteParts.length > 0) {
    updateData.note = noteParts.join("\n");
  }

  const updated = await prisma.supplierPaymentTask.update({
    where: { id: taskId },
    data: updateData,
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          vendorName: true,
          accountNumber: true,
          jobName: true,
          creditTerm: true,
          totalAmount: true,
          depositAmount: true,
          remainingAmount: true,
          deliveryDate: true,
          receiveStatus: true,
          receivedAt: true,
          reportedBy: true,
          note: true,
          purchaseRequest: {
            select: {
              prNumber: true,
              projectName: true,
            },
          },
        },
      },
      goodsReceipt: true,
    },
  });

  // Sync audit log and modified fields to PurchaseOrder
  const poAuditParts: string[] = [];
  if (accountingAuditLog) {
    poAuditParts.push(accountingAuditLog);
  } else if (deferralLog) {
    poAuditParts.push(deferralLog);
  }
  if (data.paymentMethod === "CHEQUE_PDC" && data.chequeDueDate) {
    const chqDate = new Date(data.chequeDueDate);
    const chqStr = `${chqDate.getDate().toString().padStart(2, "0")}/${(chqDate.getMonth() + 1).toString().padStart(2, "0")}/${chqDate.getFullYear() + 543}`;
    poAuditParts.push(
      `[การเงินระบุสั่งจ่ายเช็ค PDC: เลขที่ ${data.chequeNumber || "-"} กำหนดหน้าเช็ค ${chqStr} โดย ${editorName}]`
    );
  }
  if (data.note && data.note.trim()) {
    poAuditParts.push(`[การเงินบันทึก ${todayStr}: ${data.note.trim()} โดย ${editorName}]`);
  }

  const existingPo = await prisma.purchaseOrder.findUnique({
    where: { poNumber: task.poNumber },
    select: { note: true },
  });

  if (existingPo) {
    let combinedPoNote = existingPo.note || "";
    if (poAuditParts.length > 0) {
      combinedPoNote = combinedPoNote
        ? `${combinedPoNote}\n${poAuditParts.join("\n")}`
        : poAuditParts.join("\n");
    }
    poUpdateData.note = combinedPoNote;

    await prisma.purchaseOrder.update({
      where: { poNumber: task.poNumber },
      data: poUpdateData,
    });
  }

  try {
    revalidatePath("/accounting/payables");
    revalidatePath("/accounting/dashboard");
    revalidatePath("/admin/procurement/po");
    revalidatePath("/admin/procurement/dashboard");
  } catch {}

  return { success: true, task: updated };
}

/**
 * Mark a Supplier Payment Task as PAID with bank transaction details & 50 ทวิ certificate
 */
export async function markSupplierPaymentPaid(taskId: string, data: {
  paidAmount: number;
  paidDate?: string;
  paidFromBankCode: string;
  bankReferenceNumber?: string;
  whtCertNumber?: string;
  note?: string;
  allowBypassGR?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const task = await prisma.supplierPaymentTask.findUnique({
    where: { id: taskId },
    include: { purchaseOrder: true }
  });

  if (!task) return { success: false, error: "Task not found" };

  // 3-Way Match Check
  if (task.paymentType === 'FINAL_BALANCE' && !task.isGoodsReceived && !data.allowBypassGR) {
    return {
      success: false,
      error: "รายการนี้ยังไม่ผ่านการตรวจรับสินค้า (3-Way Match) หากได้รับสินค้าแล้วให้รอฝ่ายคลังบันทึกตรวจรับ หรือระบุข้อยกเว้นการจ่ายก่อนรับของ"
    };
  }

  const paidDate = data.paidDate ? new Date(data.paidDate) : new Date();
  const paidDateStr = `${paidDate.getDate().toString().padStart(2, '0')}/${(paidDate.getMonth() + 1).toString().padStart(2, '0')}/${paidDate.getFullYear() + 543}`;
  const legName = task.paymentType === 'DEPOSIT' ? 'เงินมัดจำ' : 'ยอดคงเหลือ';
  const paidLog = `[การเงินจ่ายเงินแล้ว ${paidDateStr}: ${legName} ยอด ฿${Number(data.paidAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ผ่าน ${data.paidFromBankCode || 'ธนาคาร'}${data.bankReferenceNumber ? ` (Ref: ${data.bankReferenceNumber})` : ''}${data.whtCertNumber ? ` (50 ทวิ: ${data.whtCertNumber})` : ''} โดย ${user.fullName || 'การเงิน'}]`;

  const updated = await prisma.supplierPaymentTask.update({
    where: { id: taskId },
    data: {
      status: 'PAID_VERIFIED',
      paidAmount: new Prisma.Decimal(data.paidAmount.toFixed(2)),
      paidDate,
      paidFromBankCode: data.paidFromBankCode,
      bankReferenceNumber: data.bankReferenceNumber || null,
      whtCertNumber: data.whtCertNumber || null,
      note: data.note ? (task.note ? `${task.note}\n${data.note}` : data.note) : task.note,
      approvedById: user.id,
    }
  });

  // Append payment log to PurchaseOrder.note so purchasing team immediately sees payment details
  const po = await prisma.purchaseOrder.findUnique({ where: { poNumber: task.poNumber }, select: { note: true } });
  if (po) {
    const newPoNote = po.note ? `${po.note}\n${paidLog}` : paidLog;
    await prisma.purchaseOrder.update({
      where: { poNumber: task.poNumber },
      data: { note: newPoNote }
    });
  }

  try {
    revalidatePath('/accounting/payables');
    revalidatePath('/accounting/dashboard');
    revalidatePath('/admin/procurement/po');
    revalidatePath('/admin/procurement/dashboard');
  } catch {}

  return { success: true, task: updated };
}

/**
 * Batch backfill Supplier Payment Tasks for existing Purchase Orders
 */
export async function backfillSupplierPayments(limit: number = 2000) {
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      supplierPaymentTasks: { none: {} },
      totalAmount: { gt: 0 },
      OR: [
        { receiveStatus: null },
        { receiveStatus: { not: 'Cancelled' } }
      ]
    },
    select: { poNumber: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  let synced = 0;
  for (const po of pos) {
    try {
      const res = await syncSupplierPaymentsForPO(po.poNumber);
      if (res.success) synced++;
    } catch (e) {
      console.error(`Error backfilling PO ${po.poNumber}:`, e);
    }
  }

  try {
    revalidatePath('/accounting/payables');
    revalidatePath('/accounting/dashboard');
  } catch {}

  return { success: true, totalTargeted: pos.length, totalSynced: synced };
}

/**
 * Split a Supplier Payment Task (e.g. Installment 2: Remaining Balance) into multiple custom installments
 */
export async function splitSupplierPaymentTask(
  taskId: string,
  installments: Array<{
    grossAmount: number;
    dueDate: string;
    note?: string;
    whtPercent?: number;
    paymentMethod?: string;
  }>
) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (!installments || installments.length < 2) {
    return { success: false, error: "ต้องระบุอย่างน้อย 2 งวดสำหรับการแบ่งจ่าย" };
  }

  const targetTask = await prisma.supplierPaymentTask.findUnique({
    where: { id: taskId },
    include: { purchaseOrder: true }
  });

  if (!targetTask) return { success: false, error: "ไม่พบข้อมูลรายการชำระนี้" };

  if (targetTask.status === 'PAID_VERIFIED') {
    return { success: false, error: "ไม่สามารถแบ่งงวดรายการที่จ่ายเงินเรียบร้อยแล้วได้" };
  }

  const totalGross = Math.round(installments.reduce((sum, inst) => sum + Number(inst.grossAmount), 0) * 100) / 100;
  const originalGross = Math.round(Number(targetTask.grossAmount) * 100) / 100;

  if (Math.abs(totalGross - originalGross) > 0.05) {
    return {
      success: false,
      error: `ยอดรวมของงวดที่แบ่ง (฿${totalGross.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) ไม่ตรงกับยอดเดิม (฿${originalGross.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`
    };
  }

  // Find existing tasks to preserve sequence numbers
  const allPoTasks = await prisma.supplierPaymentTask.findMany({
    where: { poNumber: targetTask.poNumber },
    orderBy: { sequenceNo: 'asc' }
  });

  const hasDeposit = allPoTasks.some(t => t.paymentType === 'DEPOSIT');
  const baseSeq = targetTask.sequenceNo || (hasDeposit ? 2 : 1);

  // Execute in transaction
  const createdTasks = await prisma.$transaction(async (tx) => {
    // Delete target task
    await tx.supplierPaymentTask.delete({ where: { id: taskId } });

    const newTasks = [];
    for (let i = 0; i < installments.length; i++) {
      const inst = installments[i];
      const isLast = i === installments.length - 1;
      const seq = baseSeq + i;
      const whtRate = inst.whtPercent !== undefined ? inst.whtPercent : Number(targetTask.whtPercent);
      const calc = calculateNetPayment(inst.grossAmount, whtRate);
      const due = new Date(inst.dueDate);
      due.setHours(23, 59, 59, 999);

      const created = await tx.supplierPaymentTask.create({
        data: {
          poNumber: targetTask.poNumber,
          paymentType: isLast ? 'FINAL_BALANCE' : 'PROGRESS',
          sequenceNo: seq,
          grossAmount: calc.grossAmount,
          whtPercent: calc.whtPercent,
          whtAmount: calc.whtAmount,
          netPayableAmount: calc.netPayableAmount,
          dueDate: sanitizeBusinessDate(due, new Date()),
          paymentMethod: inst.paymentMethod || targetTask.paymentMethod || 'BANK_TRANSFER',
          isGoodsReceived: targetTask.isGoodsReceived,
          goodsReceiptId: targetTask.goodsReceiptId,
          status: targetTask.status === 'APPROVED' ? 'APPROVED' : (targetTask.isGoodsReceived ? 'PENDING' : 'AWAITING_GR'),
          note: inst.note && inst.note.trim() ? inst.note.trim() : `งวดแบ่งชำระ (${i + 1}/${installments.length})`
        }
      });
      newTasks.push(created);
    }
    return newTasks;
  });

  // Write audit note to PO
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear() + 543}`;
  const splitDetails = installments.map((inst, idx) => {
    const d = new Date(inst.dueDate);
    const dStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543}`;
    return `งวด ${idx + 1}: ฿${Number(inst.grossAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} (ครบกำหนด ${dStr})`;
  }).join(', ');

  const auditLog = `[การเงินแบ่งงวดชำระ ${todayStr}: ยอด ฿${originalGross.toLocaleString('th-TH', { minimumFractionDigits: 2 })} แบ่งเป็น ${installments.length} งวด (${splitDetails}) โดย ${user.fullName || 'การเงิน'}]`;

  const po = await prisma.purchaseOrder.findUnique({ where: { poNumber: targetTask.poNumber }, select: { note: true } });
  if (po) {
    const newPoNote = po.note ? `${po.note}\n${auditLog}` : auditLog;
    await prisma.purchaseOrder.update({
      where: { poNumber: targetTask.poNumber },
      data: { note: newPoNote }
    });
  }

  try {
    revalidatePath('/accounting/payables');
    revalidatePath('/accounting/dashboard');
    revalidatePath('/admin/procurement/po');
    revalidatePath('/admin/procurement/dashboard');
  } catch {}

  return { success: true, tasks: createdTasks };
}

/**
 * Merge multiple split installments back into a single remaining balance task
 */
export async function mergeSupplierPaymentTasks(poNumber: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const allPoTasks = await prisma.supplierPaymentTask.findMany({
    where: { poNumber },
    orderBy: { sequenceNo: 'asc' }
  });

  const nonDepositTasks = allPoTasks.filter(t => t.paymentType !== 'DEPOSIT');

  if (nonDepositTasks.length <= 1) {
    return { success: false, error: "ไม่มีงวดแบ่งชำระที่สามารถรวมได้" };
  }

  if (nonDepositTasks.some(t => t.status === 'PAID_VERIFIED')) {
    return { success: false, error: "ไม่สามารถรวมงวดได้ เนื่องจากมีบางงวดชำระเงินไปแล้ว" };
  }

  const totalGross = Math.round(nonDepositTasks.reduce((sum, t) => sum + Number(t.grossAmount), 0) * 100) / 100;
  const whtRate = Number(nonDepositTasks[0]?.whtPercent || 0);
  const calc = calculateNetPayment(totalGross, whtRate);

  // Use earliest due date among the non-deposit tasks
  let earliestDue = nonDepositTasks[0].dueDate;
  for (const t of nonDepositTasks) {
    if (t.dueDate && new Date(t.dueDate) < new Date(earliestDue)) {
      earliestDue = t.dueDate;
    }
  }

  const hasDeposit = allPoTasks.some(t => t.paymentType === 'DEPOSIT');
  const isGoodsReceived = nonDepositTasks.some(t => t.isGoodsReceived);
  const goodsReceiptId = nonDepositTasks.find(t => t.goodsReceiptId)?.goodsReceiptId || null;
  const anyApproved = nonDepositTasks.some(t => t.status === 'APPROVED');
  const status = anyApproved ? 'APPROVED' : (isGoodsReceived ? 'PENDING' : 'AWAITING_GR');

  await prisma.$transaction(async (tx) => {
    // Delete all non-deposit tasks
    await tx.supplierPaymentTask.deleteMany({
      where: {
        id: { in: nonDepositTasks.map(t => t.id) }
      }
    });

    // Create single FINAL_BALANCE task
    await tx.supplierPaymentTask.create({
      data: {
        poNumber,
        paymentType: 'FINAL_BALANCE',
        sequenceNo: hasDeposit ? 2 : 1,
        grossAmount: calc.grossAmount,
        whtPercent: calc.whtPercent,
        whtAmount: calc.whtAmount,
        netPayableAmount: calc.netPayableAmount,
        dueDate: earliestDue,
        paymentMethod: nonDepositTasks[0]?.paymentMethod || 'BANK_TRANSFER',
        isGoodsReceived,
        goodsReceiptId,
        status,
        note: `ยอดจ่ายคงเหลือ (รวมงวด ${nonDepositTasks.length} งวดกลับเป็นยอดเดียว)`
      }
    });
  });

  // Write audit note to PO
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear() + 543}`;
  const auditLog = `[การเงินยุบรวมงวดชำระ ${todayStr}: รวม ${nonDepositTasks.length} งวดกลับเป็นยอดคงเหลืองวดเดียว ฿${totalGross.toLocaleString('th-TH', { minimumFractionDigits: 2 })} โดย ${user.fullName || 'การเงิน'}]`;

  const po = await prisma.purchaseOrder.findUnique({ where: { poNumber }, select: { note: true } });
  if (po) {
    const newPoNote = po.note ? `${po.note}\n${auditLog}` : auditLog;
    await prisma.purchaseOrder.update({
      where: { poNumber },
      data: { note: newPoNote }
    });
  }

  try {
    revalidatePath('/accounting/payables');
    revalidatePath('/accounting/dashboard');
    revalidatePath('/admin/procurement/po');
    revalidatePath('/admin/procurement/dashboard');
  } catch {}

  return { success: true };
}

