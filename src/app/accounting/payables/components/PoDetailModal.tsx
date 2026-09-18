"use client";

import React from "react";
import {
  Package,
  X,
  Building2,
  CreditCard,
  FileText,
  AlertCircle,
  Landmark,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCheck,
  Split,
  CalendarClock,
  Pencil,
  History,
} from "lucide-react";
import {
  ConsolidatedPO,
  SupplierPaymentTask,
  CompanyBadge,
  GoodsReceiptBadge,
  formatDate,
  formatCurrency,
  isValidDate,
  getTaskLegTitle,
} from "./payablesTypes";

interface PoDetailModalProps {
  po: ConsolidatedPO | null;
  onClose: () => void;
  onOpenPaymentModal: (task: SupplierPaymentTask) => void;
  onOpenEditModal: (task: SupplierPaymentTask) => void;
  onOpenSplitModal: (task: SupplierPaymentTask) => void;
  onMergeTasks: (poNumber: string) => void;
}

export default function PoDetailModal({
  po,
  onClose,
  onOpenPaymentModal,
  onOpenEditModal,
  onOpenSplitModal,
  onMergeTasks,
}: PoDetailModalProps) {
  if (!po) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative border border-slate-200/80 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-sm shadow-red-600/20 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CompanyBadge code={po.company} />
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-mono">
                  {po.poNumber}
                </h2>
                {po.prNumber && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-mono">
                    PR: {po.prNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ผู้ขาย:{" "}
                <span className="font-bold text-slate-800">
                  {po.purchaseOrder?.vendorName || "-"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status Badge */}
            {po.overallStatus === "PAID_VERIFIED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                <CheckCircle2 className="w-4 h-4 text-slate-700" />
                <span>ชำระครบถ้วนแล้ว (100%)</span>
              </span>
            ) : po.overallStatus === "PARTIALLY_PAID" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                <History className="w-4 h-4 text-slate-600" />
                <span>ชำระแล้วบางส่วน</span>
              </span>
            ) : po.overallStatus === "OVERDUE" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>มีงวดเกินกำหนดชำระ</span>
              </span>
            ) : po.overallStatus === "AWAITING_GR" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>รอตรวจรับของ (3-Way Match)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>รอการเบิกจ่าย</span>
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. 4 Financial KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                ยอดรวม PO ทั้งหมด
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                {formatCurrency(po.totalGross)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">ก่อนหักภาษี (Gross)</div>
            </div>

            <div className="p-4 bg-red-50/40 border border-red-100 rounded-2xl">
              <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                ภาษีหัก ณ ที่จ่ายรวม
              </div>
              <div className="text-xl font-black text-red-600 mt-1 tabular-nums">
                {po.totalWht > 0 ? `-${formatCurrency(po.totalWht)}` : "฿0.00"}
              </div>
              <div className="text-[11px] text-red-600/80 mt-0.5">WHT ทั้งหมด</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                ชำระแล้วจริง
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                {formatCurrency(po.totalPaid)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {po.totalNet > 0
                  ? `${Math.round((po.totalPaid / po.totalNet) * 100)}% ของยอดสุทธิ`
                  : "-"}
              </div>
            </div>

            <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-2xl">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                ยอดคงค้างรอจ่าย
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                {formatCurrency(po.totalPendingNet)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">สุทธิ (Net Remaining)</div>
            </div>
          </div>

          {/* 2. Procurement & Vendor Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor & Bank Details */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-slate-600" />
                <span>ข้อมูลคู่ค้า & บัญชีรับเงิน</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ชื่อบริษัท / ผู้ขาย:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {po.purchaseOrder?.vendorName || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">เลขที่บัญชีธนาคาร:</span>
                  <span className="font-bold font-mono text-slate-900 text-right flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    {po.purchaseOrder?.accountNumber || "ไม่ได้ระบุใน PO"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">เงื่อนไขเครดิต:</span>
                  <span className="font-bold text-slate-700 text-right">
                    {po.purchaseOrder?.creditTerms || "เงินสด"}
                  </span>
                </div>
              </div>
            </div>

            {/* Job & Delivery Details */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Package className="w-4 h-4 text-slate-600" />
                <span>ข้อมูลงาน & การจัดส่ง</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ชื่องาน:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {po.purchaseOrder?.jobName || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">โครงการ (Project):</span>
                  <span className="font-bold text-slate-700 text-right">
                    {po.purchaseOrder?.purchaseRequest?.projectName || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">กำหนดส่งของ / ระยะเวลา:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {po.purchaseOrder?.deliveryDate || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                  <span className="text-slate-500">สถานะตรวจรับ (3-Way Match):</span>
                  <div className="text-right">
                    <GoodsReceiptBadge item={po} />
                  </div>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">ผู้ขอซื้อ / ผู้บันทึก:</span>
                  <span className="font-medium text-slate-700 text-right">
                    {po.purchaseOrder?.requestedBy ||
                      po.purchaseOrder?.purchaseRequest?.requestedBy ||
                      "-"}
                    {po.purchaseOrder?.receivedBy
                      ? ` (บันทึก: ${po.purchaseOrder.receivedBy})`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Items Ordered if present */}
          {po.purchaseOrder?.itemList && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>รายการสินค้าที่สั่งซื้อ (Item List)</span>
              </div>
              <div className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed max-h-36 overflow-y-auto">
                {po.purchaseOrder.itemList}
              </div>
            </div>
          )}

          {/* 4. Notes if present */}
          {po.purchaseOrder?.note && (
            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800">
                <span className="font-bold">หมายเหตุจัดซื้อ: </span>
                <span className="whitespace-pre-wrap">{po.purchaseOrder.note}</span>
              </div>
            </div>
          )}

          {/* 5. Installment Payment Plan & Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Landmark className="w-4 h-4 text-slate-700" />
                <span>แผนและสถานะการจ่ายเงินแต่ละงวด ({po.tasks.length} งวด)</span>
              </h4>
              <div className="flex items-center gap-2">
                {po.tasks.filter((t) => t.paymentType !== "DEPOSIT").length > 1 &&
                  !po.tasks.some(
                    (t) => t.paymentType !== "DEPOSIT" && t.status === "PAID_VERIFIED"
                  ) && (
                    <button
                      type="button"
                      onClick={() => onMergeTasks(po.poNumber)}
                      className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="ยุบรวมงวดแบ่งชำระกลับเป็นยอดคงเหลืองวดเดียว"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-600" />
                      <span>รวมงวดกลับเป็นงวดเดียว</span>
                    </button>
                  )}
                <span className="text-[11px] text-slate-400">ควบคุม 3-Way Match & หนังสือ 50 ทวิ</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {po.tasks.map((task) => {
                const isPaid = task.status === "PAID_VERIFIED";
                const isDeposit = task.paymentType === "DEPOSIT";
                const isTaskAwaitingGR = task.status === "AWAITING_GR";
                const now = new Date();
                const isOverdue =
                  !isPaid &&
                  !isTaskAwaitingGR &&
                  task.dueDate &&
                  isValidDate(task.dueDate) &&
                  new Date(task.dueDate) < now;

                let daysLeft = null;
                if (!isPaid && task.dueDate && isValidDate(task.dueDate)) {
                  const diff = new Date(task.dueDate).getTime() - now.getTime();
                  daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                }

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPaid
                        ? "bg-slate-50/50 border-slate-200"
                        : isOverdue
                        ? "bg-red-50/25 border-red-200 ring-1 ring-red-200"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    {/* Leg Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {getTaskLegTitle(task, po.tasks)}
                      </span>

                      <div>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                            <span>จ่ายเรียบร้อย</span>
                          </span>
                        ) : task.status === "AWAITING_GR" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>รอตรวจรับของ</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>เกินกำหนดชำระ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>รอจ่ายเงิน</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="py-3 grid grid-cols-3 gap-2 text-xs border-b border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400">ยอดงวด (Gross)</div>
                        <div className="font-bold text-slate-700 mt-0.5 tabular-nums">
                          {formatCurrency(task.grossAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">
                          หักภาษี ({Number(task.whtPercent)}%)
                        </div>
                        <div className="font-bold text-red-600 mt-0.5 tabular-nums">
                          {Number(task.whtAmount) > 0 ? `-${formatCurrency(task.whtAmount)}` : "฿0.00"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">ยอดจ่ายสุทธิ</div>
                        <div className="font-black text-slate-900 mt-0.5 tabular-nums">
                          {formatCurrency(task.netPayableAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Dates & Logistics */}
                    <div className="py-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">วันครบกำหนด:</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          {formatDate(task.dueDate)}
                          {!isPaid && daysLeft !== null && (
                            <span
                              className={`text-[10px] ml-1 font-semibold ${
                                daysLeft < 0
                                  ? "text-red-600 font-bold"
                                  : daysLeft <= 7
                                  ? "text-slate-700 font-bold"
                                  : "text-slate-400"
                              }`}
                            >
                              ({daysLeft < 0 ? `เกิน ${Math.abs(daysLeft)} วัน` : `เหลือ ${daysLeft} วัน`})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 3-Way Match / Goods Receipt Status */}
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">การตรวจรับ (3-Way Match):</span>
                        <div className="text-right">
                          <GoodsReceiptBadge item={task} />
                        </div>
                      </div>

                      {/* Paid details */}
                      {isPaid && (
                        <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>วันที่จ่ายจริง:</span>
                            <span className="font-bold text-slate-800">{formatDate(task.paidDate)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>ธนาคาร / เลขอ้างอิง:</span>
                            <span className="font-bold text-slate-800">
                              {task.paidFromBankCode || "-"}
                              {task.bankReferenceNumber ? ` (${task.bankReferenceNumber})` : ""}
                            </span>
                          </div>
                          {task.whtCertNumber && (
                            <div className="flex justify-between text-slate-800 font-mono">
                              <span>เลขที่ 50 ทวิ:</span>
                              <span className="font-bold">{task.whtCertNumber}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {task.note && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {task.note}
                        </div>
                      )}
                    </div>

                    {/* Actions on this Leg */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      {!isPaid ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenPaymentModal(task)}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 bg-red-600 hover:bg-red-700"
                          >
                            <Landmark className="w-3.5 h-3.5" />
                            <span>บันทึกจ่ายเงิน</span>
                          </button>

                          {!isDeposit && (
                            <button
                              type="button"
                              onClick={() => onOpenSplitModal(task)}
                              className="py-2 px-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
                              title="แบ่งงวดชำระยอดนี้เพิ่ม"
                            >
                              <Split className="w-3.5 h-3.5" />
                              <span>แบ่งงวด</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenEditModal(task)}
                            className="py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="แก้ไข / เลื่อนนัดชำระ"
                          >
                            <CalendarClock className="w-3.5 h-3.5 text-slate-600" />
                            <span>เลื่อนนัด/แก้ไข</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(task)}
                          className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>แก้ไขข้อมูล / ประวัติชำระ</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
