import React from "react";
import { CheckCircle2, Clock, ShieldAlert, CreditCard } from "lucide-react";

export interface SupplierPaymentTask {
  id: string;
  poNumber: string;
  paymentType: "DEPOSIT" | "FINAL_BALANCE" | string;
  sequenceNo?: number | null;
  grossAmount: any;
  whtPercent: any;
  whtAmount: any;
  netPayableAmount: any;
  dueDate: any;
  status: "PENDING" | "AWAITING_GR" | "APPROVED" | "PAID_VERIFIED" | "CANCELLED" | "OVERDUE" | string;
  paidAmount?: any;
  paidDate?: any;
  paidFromBankCode?: string | null;
  bankReferenceNumber?: string | null;
  whtCertNumber?: string | null;
  paymentMethod?: string | null;
  chequeNumber?: string | null;
  chequeDueDate?: any;
  deferralReason?: string | null;
  note?: string | null;
  isGoodsReceived?: boolean | null;
  goodsReceiptId?: string | null;
  purchaseOrderId?: string | null;
  purchaseOrder?: any;
  goodsReceipt?: any;
  [key: string]: any;
}

export interface ConsolidatedPO {
  poNumber: string;
  prNumber: string | null;
  company: string;
  purchaseOrder: any;
  goodsReceipt: any;
  tasks: SupplierPaymentTask[];
  depositTask?: SupplierPaymentTask;
  balanceTask?: SupplierPaymentTask;
  totalGross: number;
  totalWht: number;
  totalNet: number;
  totalPaid: number;
  totalPendingNet: number;
  overallStatus: "PAID_VERIFIED" | "PARTIALLY_PAID" | "OVERDUE" | "AWAITING_GR" | "PENDING";
  earliestDueDate: string | null;
  earliestDaysLeft: number | null;
  isAllGoodsReceived: boolean;
}

export interface DashboardSummary {
  totalTasks: number;
  totalPendingGross: number;
  totalPendingNet: number;
  pendingCount: number;
  awaitingGrCount: number;
  awaitingGrAmount: number;
  readyToPayCount: number;
  readyToPayAmount: number;
  overdueCount: number;
  overdueAmount: number;
  dueIn7DaysCount: number;
  dueIn7DaysAmount: number;
  paidCount: number;
  paidAmount: number;
  companyCounts: { ALL: number; TP: number; TG: number; TE: number; OTHER: number };
}

export type StatusTabType = "ALL" | "AWAITING_GR" | "PENDING" | "OVERDUE" | "PAID_VERIFIED";
export type CompanyFilterType = "ALL" | "TP" | "TG" | "TE";
export type PaymentTypeFilter = "ALL" | "DEPOSIT" | "FINAL_BALANCE";
export type GoodsReceivedFilter = "ALL" | "RECEIVED" | "AWAITING";
export type DateFieldType = "DUE_DATE" | "PAID_DATE" | "PO_DATE";
export type ViewModeType = "CONSOLIDATED" | "TASKS";

export interface GoodsReceiptInfo {
  status: "RECEIVED" | "PARTIAL" | "AWAITING" | "DEPOSIT_ONLY";
  isReceived: boolean;
  label: string;
  subLabel?: string | null;
  receivedAt?: string | null;
  receivedBy?: string | null;
  deliveryNoteNumber?: string | null;
}

export function getGoodsReceiptInfo(
  item: ConsolidatedPO | SupplierPaymentTask
): GoodsReceiptInfo {
  // Check if it's a ConsolidatedPO
  const isPO = "tasks" in item && Array.isArray((item as any).tasks);

  if (isPO) {
    const po = item as ConsolidatedPO;
    const poObj = po.purchaseOrder;
    const grObj = po.goodsReceipt;

    const nonDepositTasks = po.tasks.filter((t) => t.paymentType !== "DEPOSIT");
    const isOnlyDeposit = po.tasks.length > 0 && nonDepositTasks.length === 0;

    if (isOnlyDeposit) {
      return {
        status: "DEPOSIT_ONLY",
        isReceived: false,
        label: "มัดจำล่วงหน้า",
        subLabel: "จ่ายก่อนตรวจรับ",
      };
    }

    const isPoReceived =
      poObj?.receiveStatus === "Received" ||
      poObj?.receiveStatus === "RECEIVED";
    const hasPoReceivedAt = Boolean(poObj?.receivedAt);
    const hasGrReceivedAt = Boolean(grObj?.receivedAt);
    const isGrComplete = grObj?.isCompleteDelivery === true;
    const isTasksReceived =
      nonDepositTasks.length > 0 &&
      nonDepositTasks.every((t) => t.isGoodsReceived);

    const isOverallReceived =
      po.isAllGoodsReceived ||
      isPoReceived ||
      hasPoReceivedAt ||
      hasGrReceivedAt ||
      isGrComplete ||
      isTasksReceived;

    const receivedBy = grObj?.recipient || poObj?.receivedBy || null;
    const rawDate = grObj?.receivedAt || poObj?.receivedAt || null;
    const receivedAt = rawDate ? formatDate(rawDate) : null;
    const deliveryNoteNumber = grObj?.deliveryNoteNumber || null;

    if (isOverallReceived) {
      let sub = "ตรวจรับครบ 3-Way Match";
      if (receivedBy && receivedAt) {
        sub = `รับโดย ${receivedBy} • ${receivedAt}`;
      } else if (receivedBy) {
        sub = `รับโดย ${receivedBy}`;
      } else if (receivedAt) {
        sub = `ตรวจรับเมื่อ ${receivedAt}`;
      } else if (deliveryNoteNumber) {
        sub = `DO: ${deliveryNoteNumber}`;
      }

      return {
        status: "RECEIVED",
        isReceived: true,
        label: "ได้รับสินค้าแล้ว",
        subLabel: sub,
        receivedAt,
        receivedBy,
        deliveryNoteNumber,
      };
    }

    const isPartial =
      poObj?.receiveStatus === "Partial" ||
      poObj?.receiveStatus === "PARTIAL" ||
      grObj?.isIncompleteDelivery === true;

    if (isPartial) {
      return {
        status: "PARTIAL",
        isReceived: false,
        label: "รับของบางส่วน",
        subLabel: "ตรวจรับยังไม่ครบ",
        receivedAt,
        receivedBy,
        deliveryNoteNumber,
      };
    }

    return {
      status: "AWAITING",
      isReceived: false,
      label: "ยังไม่ได้รับของ",
      subLabel: "รอตรวจรับ (3-Way Match)",
    };
  } else {
    // SupplierPaymentTask
    const task = item as SupplierPaymentTask;
    const poObj = task.purchaseOrder;
    const grObj = task.goodsReceipt;

    if (task.paymentType === "DEPOSIT") {
      return {
        status: "DEPOSIT_ONLY",
        isReceived: false,
        label: "มัดจำล่วงหน้า",
        subLabel: "จ่ายก่อนตรวจรับ",
      };
    }

    const isPoReceived =
      poObj?.receiveStatus === "Received" ||
      poObj?.receiveStatus === "RECEIVED";
    const hasPoReceivedAt = Boolean(poObj?.receivedAt);
    const hasGrReceivedAt = Boolean(grObj?.receivedAt);
    const isGrComplete = grObj?.isCompleteDelivery === true;
    const isTaskReceived =
      Boolean(task.isGoodsReceived) ||
      isPoReceived ||
      hasPoReceivedAt ||
      hasGrReceivedAt ||
      isGrComplete;

    const receivedBy = grObj?.recipient || poObj?.receivedBy || null;
    const rawDate = grObj?.receivedAt || poObj?.receivedAt || null;
    const receivedAt = rawDate ? formatDate(rawDate) : null;
    const deliveryNoteNumber = grObj?.deliveryNoteNumber || null;

    if (isTaskReceived) {
      let sub = "ตรวจรับครบ 3-Way Match";
      if (receivedBy && receivedAt) {
        sub = `รับโดย ${receivedBy} • ${receivedAt}`;
      } else if (receivedBy) {
        sub = `รับโดย ${receivedBy}`;
      } else if (receivedAt) {
        sub = `ตรวจรับเมื่อ ${receivedAt}`;
      } else if (deliveryNoteNumber) {
        sub = `DO: ${deliveryNoteNumber}`;
      }

      return {
        status: "RECEIVED",
        isReceived: true,
        label: "ได้รับสินค้าแล้ว",
        subLabel: sub,
        receivedAt,
        receivedBy,
        deliveryNoteNumber,
      };
    }

    const isPartial =
      poObj?.receiveStatus === "Partial" ||
      poObj?.receiveStatus === "PARTIAL" ||
      grObj?.isIncompleteDelivery === true;

    if (isPartial) {
      return {
        status: "PARTIAL",
        isReceived: false,
        label: "รับของบางส่วน",
        subLabel: "ตรวจรับยังไม่ครบ",
        receivedAt,
        receivedBy,
        deliveryNoteNumber,
      };
    }

    return {
      status: "AWAITING",
      isReceived: false,
      label: "ยังไม่ได้รับของ",
      subLabel: "รอตรวจรับ (3-Way Match)",
    };
  }
}

export function GoodsReceiptBadge({
  item,
  showSubText = true,
}: {
  item: ConsolidatedPO | SupplierPaymentTask;
  showSubText?: boolean;
}) {
  const info = getGoodsReceiptInfo(item);

  if (info.status === "RECEIVED") {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          <span>ได้รับสินค้าแล้ว</span>
        </span>
        {showSubText && (
          <span
            className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[135px] font-medium"
            title={info.subLabel || undefined}
          >
            {info.subLabel || "ตรวจรับครบถ้วน"}
          </span>
        )}
      </div>
    );
  }

  if (info.status === "PARTIAL") {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>รับของบางส่วน</span>
        </span>
        {showSubText && (
          <span className="text-[10px] text-amber-700/80 mt-0.5 font-medium">
            (ตรวจรับยังไม่ครบ)
          </span>
        )}
      </div>
    );
  }

  if (info.status === "DEPOSIT_ONLY") {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
          <span>มัดจำล่วงหน้า</span>
        </span>
        {showSubText && (
          <span className="text-[9px] text-slate-400 mt-0.5">
            (จ่ายก่อนรับของ)
          </span>
        )}
      </div>
    );
  }

  // AWAITING
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
        <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>ยังไม่ได้รับของ</span>
      </span>
      {showSubText && (
        <span className="text-[10px] text-red-600/80 mt-0.5 font-medium">
          รอตรวจรับ (3-Way Match)
        </span>
      )}
    </div>
  );
}

export function isValidDate(d: string | Date | null | undefined): boolean {
  if (!d) return false;
  const date = new Date(d);
  if (isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= 2024 && year <= 2035;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  const rawYear = date.getUTCFullYear();
  if (rawYear < 2024 || rawYear > 2035) return "-";
  try {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  } catch {
    let year = date.getFullYear();
    if (year < 2500) year += 543;
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${year}`;
  }
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "฿0.00";
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(num)) return "฿0.00";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(num);
}

export function getTaskLegTitle(task: any, allTasks: any[]): string {
  if (!task) return "-";
  if (task.paymentType === "DEPOSIT") {
    return "งวดที่ 1: เงินมัดจำ";
  }
  const tasks = Array.isArray(allTasks) ? allTasks : [];
  const hasDeposit = tasks.some((t: any) => t.paymentType === "DEPOSIT");
  const nonDepositTasks = tasks.filter((t: any) => t.paymentType !== "DEPOSIT");

  if (nonDepositTasks.length <= 1) {
    return hasDeposit ? "งวดที่ 2: ยอดจ่ายคงเหลือ" : "งวดที่ 1: ยอดจ่ายคงเหลือ";
  }

  // Multiple installments
  const sorted = [...nonDepositTasks].sort((a, b) => (a.sequenceNo || 0) - (b.sequenceNo || 0));
  const idx = sorted.findIndex((t: any) => t.id === task.id);
  const displayIdx = idx >= 0 ? idx : 0;
  const legNo = task.sequenceNo || (hasDeposit ? displayIdx + 2 : displayIdx + 1);
  const isLast = displayIdx === sorted.length - 1;
  const fractionStr = `(${displayIdx + 1}/${sorted.length})`;

  return isLast
    ? `งวดที่ ${legNo}: จ่ายคงเหลืองวดสุดท้าย ${fractionStr}`
    : `งวดที่ ${legNo}: ชำระตามงวด ${fractionStr}`;
}

export function extractCompany(task: any): string {
  if (task.goodsReceipt?.company) return task.goodsReceipt.company;
  const po = task.poNumber || "";
  if (po.includes("-P") || po.includes("PO69-P")) return "TP";
  if (po.includes("-G") || po.includes("PO69-G")) return "TG";
  if (po.includes("-E") || po.includes("PO69-E")) return "TE";
  return "OTHER";
}

export function CompanyBadge({ code }: { code: string }) {
  const styles: Record<string, string> = {
    TP: "bg-slate-100 text-slate-800 border-slate-300 shadow-xs",
    TG: "bg-slate-100 text-slate-800 border-slate-300 shadow-xs",
    TE: "bg-slate-100 text-slate-800 border-slate-300 shadow-xs",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight border whitespace-nowrap ${
        styles[code] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {code}
    </span>
  );
}

export const THAI_MONTHS = [
  { value: "1", label: "มกราคม (ม.ค.)" },
  { value: "2", label: "กุมภาพันธ์ (ก.พ.)" },
  { value: "3", label: "มีนาคม (มี.ค.)" },
  { value: "4", label: "เมษายน (เม.ย.)" },
  { value: "5", label: "พฤษภาคม (พ.ค.)" },
  { value: "6", label: "มิถุนายน (มิ.ย.)" },
  { value: "7", label: "กรกฎาคม (ก.ค.)" },
  { value: "8", label: "สิงหาคม (ส.ค.)" },
  { value: "9", label: "กันยายน (ก.ย.)" },
  { value: "10", label: "ตุลาคม (ต.ค.)" },
  { value: "11", label: "พฤศจิกายน (พ.ย.)" },
  { value: "12", label: "ธันวาคม (ธ.ค.)" },
];

export function matchDateFilters(
  targetDate: string | Date | null | undefined,
  targetYear: string,
  targetMonth: string,
  targetDateStr: string
): boolean {
  if (targetYear === "ALL" && targetMonth === "ALL" && !targetDateStr) return true;
  if (!targetDate || !isValidDate(targetDate)) return false;

  const d = new Date(targetDate);
  const yearBE = (d.getFullYear() + (d.getFullYear() < 2500 ? 543 : 0)).toString();
  const yearCE = d.getFullYear().toString();
  const monthStr = (d.getMonth() + 1).toString();
  const dateStr = d.toISOString().slice(0, 10);

  if (targetYear !== "ALL" && targetYear !== yearBE && targetYear !== yearCE) {
    return false;
  }
  if (targetMonth !== "ALL" && targetMonth !== monthStr) {
    return false;
  }
  if (targetDateStr && dateStr !== targetDateStr) {
    return false;
  }
  return true;
}
