import React, { useState } from "react";
import {
  Package,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  CalendarClock,
  Landmark,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Check,
} from "lucide-react";
import {
  SupplierPaymentTask,
  CompanyBadge,
  GoodsReceiptBadge,
  extractCompany,
  formatDate,
  formatCurrency,
  isValidDate,
  getTaskLegTitle,
  GoodsReceivedFilter,
  PaymentTypeFilter,
  CompanyFilterType,
  StatusTabType,
} from "./payablesTypes";

interface TasksTableProps {
  tasks: SupplierPaymentTask[];
  allTasks: SupplierPaymentTask[];
  onOpenPoDetail: (poNumber: string) => void;
  onOpenPaymentModal: (task: SupplierPaymentTask) => void;
  onOpenEditModal: (task: SupplierPaymentTask) => void;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  goodsReceivedFilter?: GoodsReceivedFilter;
  onChangeGoodsReceivedFilter?: (gr: GoodsReceivedFilter) => void;
  paymentTypeFilter?: PaymentTypeFilter;
  onChangePaymentTypeFilter?: (pt: PaymentTypeFilter) => void;
  companyFilter?: CompanyFilterType;
  onChangeCompanyFilter?: (co: CompanyFilterType) => void;
  activeStatusTab?: StatusTabType;
  onChangeStatusTab?: (status: StatusTabType) => void;
}

export default function TasksTable({
  tasks,
  allTasks,
  onOpenPoDetail,
  onOpenPaymentModal,
  onOpenEditModal,
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  goodsReceivedFilter,
  onChangeGoodsReceivedFilter,
  paymentTypeFilter,
  onChangePaymentTypeFilter,
  companyFilter,
  onChangeCompanyFilter,
  activeStatusTab,
  onChangeStatusTab,
}: TasksTableProps) {
  const [grDropdownOpen, setGrDropdownOpen] = useState(false);
  const [paymentTypeDropdownOpen, setPaymentTypeDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const now = new Date();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-4 px-4 min-w-[145px]">
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDropdownOpen(!companyDropdownOpen);
                      setGrDropdownOpen(false);
                      setPaymentTypeDropdownOpen(false);
                      setStatusDropdownOpen(false);
                    }}
                    className={`group inline-flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${companyFilter && companyFilter !== "ALL"
                      ? "bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs"
                      : "hover:bg-slate-200/60 text-slate-700 font-bold"
                      }`}
                    title="กรองตามบริษัท"
                  >
                    <span>เลขที่ PO / บริษัท</span>
                    <Filter
                      className={`w-3 h-3 ${companyFilter && companyFilter !== "ALL"
                        ? "text-red-600 fill-red-600"
                        : "text-slate-400 group-hover:text-red-600"
                        }`}
                    />
                  </button>

                  {companyDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setCompanyDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 text-left font-normal normal-case">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 border-b border-slate-100 mb-1">
                          กรองตามบริษัท
                        </div>
                        {(["ALL", "TP", "TG", "TE"] as const).map((co) => (
                          <button
                            key={co}
                            type="button"
                            onClick={() => {
                              onChangeCompanyFilter?.(co);
                              setCompanyDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${companyFilter === co
                              ? "bg-red-50 text-red-700 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                              }`}
                          >
                            <span>{co === "ALL" ? "ทุกบริษัท (ALL)" : `บริษัท ${co}`}</span>
                            {companyFilter === co && (
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </th>
              <th className="py-4 px-4 min-w-[200px]">ผู้ขาย & ชื่องาน</th>
              <th className="py-4 px-4 text-center min-w-[130px]">
                <div className="relative inline-flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentTypeDropdownOpen(!paymentTypeDropdownOpen);
                      setGrDropdownOpen(false);
                      setCompanyDropdownOpen(false);
                      setStatusDropdownOpen(false);
                    }}
                    className={`group inline-flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${paymentTypeFilter && paymentTypeFilter !== "ALL"
                      ? "bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs"
                      : "hover:bg-slate-200/60 text-slate-700 font-bold"
                      }`}
                    title="กรองตามประเภทงวดชำระ"
                  >
                    <span>งวดการชำระ</span>
                    <Filter
                      className={`w-3 h-3 ${paymentTypeFilter && paymentTypeFilter !== "ALL"
                        ? "text-red-600 fill-red-600"
                        : "text-slate-400 group-hover:text-red-600"
                        }`}
                    />
                  </button>

                  {paymentTypeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setPaymentTypeDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 text-left font-normal normal-case">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 border-b border-slate-100 mb-1">
                          กรองงวดการชำระ
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onChangePaymentTypeFilter?.("ALL");
                            setPaymentTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${paymentTypeFilter === "ALL"
                            ? "bg-red-50 text-red-700 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span>ทั้งหมด (มัดจำ & คงเหลือ)</span>
                          {paymentTypeFilter === "ALL" && (
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangePaymentTypeFilter?.("DEPOSIT");
                            setPaymentTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${paymentTypeFilter === "DEPOSIT"
                            ? "bg-red-50 text-red-700 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span>งวดที่ 1: เงินมัดจำล่วงหน้า</span>
                          {paymentTypeFilter === "DEPOSIT" && (
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangePaymentTypeFilter?.("FINAL_BALANCE");
                            setPaymentTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${paymentTypeFilter === "FINAL_BALANCE"
                            ? "bg-red-50 text-red-700 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span>งวดที่ 2+: ยอดคงเหลือ</span>
                          {paymentTypeFilter === "FINAL_BALANCE" && (
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </th>
              <th className="py-4 px-4 text-center min-w-[160px]">
                <div className="relative inline-flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setGrDropdownOpen(!grDropdownOpen);
                      setPaymentTypeDropdownOpen(false);
                      setCompanyDropdownOpen(false);
                      setStatusDropdownOpen(false);
                    }}
                    className={`group inline-flex items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${goodsReceivedFilter && goodsReceivedFilter !== "ALL"
                      ? "bg-red-50 text-red-700 border border-red-200 shadow-2xs"
                      : "hover:bg-slate-200/60 text-slate-700"
                      }`}
                    title="คลิกเพื่อกรองตามสถานะตรวจรับสินค้า (GR)"
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="flex items-center gap-1 font-bold text-xs">
                        <span>สถานะตรวจรับสินค้า</span>
                        <Filter
                          className={`w-3 h-3 transition-colors ${goodsReceivedFilter && goodsReceivedFilter !== "ALL"
                            ? "text-red-600 fill-red-600"
                            : "text-slate-400 group-hover:text-red-600"
                            }`}
                        />
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        3-WAY MATCH
                        {goodsReceivedFilter && goodsReceivedFilter !== "ALL" && (
                          <span className="ml-1 text-red-600 font-bold">• กรองอยู่</span>
                        )}
                      </span>
                    </div>
                  </button>

                  {grDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setGrDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 text-left font-normal normal-case">
                        <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-100 mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            กรองสถานะตรวจรับ (GR)
                          </span>
                          {goodsReceivedFilter !== "ALL" && (
                            <button
                              type="button"
                              onClick={() => {
                                onChangeGoodsReceivedFilter?.("ALL");
                                setGrDropdownOpen(false);
                              }}
                              className="text-[10px] text-red-600 hover:underline font-bold"
                            >
                              ล้างตัวกรอง
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeGoodsReceivedFilter?.("ALL");
                            setGrDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${goodsReceivedFilter === "ALL"
                            ? "bg-red-50 text-red-700 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span>ทั้งหมด (ทุกสถานะ)</span>
                          {goodsReceivedFilter === "ALL" && (
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeGoodsReceivedFilter?.("RECEIVED");
                            setGrDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${goodsReceivedFilter === "RECEIVED"
                            ? "bg-red-50 text-red-700 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                            <span>ได้รับสินค้าแล้ว (GR ผ่าน)</span>
                          </span>
                          {goodsReceivedFilter === "RECEIVED" && (
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeGoodsReceivedFilter?.("AWAITING");
                            setGrDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${goodsReceivedFilter === "AWAITING"
                            ? "bg-red-50 text-red-700 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>ยังไม่ได้รับของ (รอ GR)</span>
                          </span>
                          {goodsReceivedFilter === "AWAITING" && (
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </th>
              <th className="py-4 px-4 text-right min-w-[110px]">ยอดตาม PO</th>
              <th className="py-4 px-4 text-right min-w-[100px]">หัก ณ ที่จ่าย</th>
              <th className="py-4 px-4 text-right min-w-[120px]">ยอดจ่ายสุทธิ</th>
              <th className="py-4 px-4 min-w-[130px]">วันครบกำหนด</th>
              <th className="py-4 px-4 text-center min-w-[130px]">
                <div className="relative inline-flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusDropdownOpen(!statusDropdownOpen);
                      setGrDropdownOpen(false);
                      setCompanyDropdownOpen(false);
                      setPaymentTypeDropdownOpen(false);
                    }}
                    className={`group inline-flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${activeStatusTab && activeStatusTab !== "ALL"
                      ? "bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs"
                      : "hover:bg-slate-200/60 text-slate-700 font-bold"
                      }`}
                    title="กรองตามสถานะ"
                  >
                    <span>สถานะ</span>
                    <Filter
                      className={`w-3 h-3 ${activeStatusTab && activeStatusTab !== "ALL"
                        ? "text-red-600 fill-red-600"
                        : "text-slate-400 group-hover:text-red-600"
                        }`}
                    />
                  </button>

                  {statusDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setStatusDropdownOpen(false)}
                      />
                      <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 text-left font-normal normal-case">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 border-b border-slate-100 mb-1">
                          กรองสถานะ
                        </div>
                        {[
                          { key: "ALL", label: "ทั้งหมด" },
                          { key: "AWAITING_GR", label: "รอตรวจรับของ" },
                          { key: "PENDING", label: "พร้อมจ่าย" },
                          { key: "OVERDUE", label: "เกินกำหนด" },
                          { key: "PAID_VERIFIED", label: "จ่ายแล้ว" },
                        ].map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => {
                              onChangeStatusTab?.(s.key as StatusTabType);
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${activeStatusTab === s.key
                              ? "bg-red-50 text-red-700 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                              }`}
                          >
                            <span>{s.label}</span>
                            {activeStatusTab === s.key && (
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </th>
              <th className="py-4 px-4 text-center min-w-[120px]">จัดการ</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <Package className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">
                    ไม่พบรายการจ่ายเงินเจ้าหนี้ที่ตรงตามเงื่อนไข
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ลองปรับเปลี่ยนตัวกรอง หรือกดปุ่ม &quot;ซิงค์ PO ทั้งหมด&quot; เพื่อดึงข้อมูลจัดซื้อล่าสุด
                  </p>
                </td>
              </tr>
            ) : (
              tasks.map((t) => {
                const isPaid = t.status === "PAID_VERIFIED";
                const isDeposit = t.paymentType === "DEPOSIT";
                const isTaskAwaitingGR = t.status === "AWAITING_GR";
                const isOverdue =
                  !isPaid &&
                  !isTaskAwaitingGR &&
                  t.dueDate &&
                  isValidDate(t.dueDate) &&
                  new Date(t.dueDate) < now;
                const co = extractCompany(t);

                let daysLeft = null;
                if (!isPaid && t.dueDate && isValidDate(t.dueDate)) {
                  const diff = new Date(t.dueDate).getTime() - now.getTime();
                  daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                }

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isOverdue ? "bg-red-50/20" : ""
                      }`}
                  >
                    {/* PO & Company */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <CompanyBadge code={co} />
                        <span className="font-mono text-xs">{t.poNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {t.purchaseOrder?.deliveryDate &&
                          isValidDate(t.purchaseOrder.deliveryDate)
                          ? `ส่งมอบ: ${formatDate(t.purchaseOrder.deliveryDate)}`
                          : "-"}
                      </div>
                    </td>

                    {/* Vendor & Job */}
                    <td className="py-4 px-4 max-w-[220px]">
                      <div
                        className="font-bold text-slate-800 truncate"
                        title={t.purchaseOrder?.vendorName || "-"}
                      >
                        {t.purchaseOrder?.vendorName || "-"}
                      </div>
                      <div
                        className="text-[11px] text-slate-500 truncate mt-0.5"
                        title={
                          t.purchaseOrder?.jobName ||
                          t.purchaseOrder?.purchaseRequest?.projectName ||
                          "-"
                        }
                      >
                        {t.purchaseOrder?.jobName ||
                          t.purchaseOrder?.purchaseRequest?.projectName ||
                          "-"}
                      </div>
                    </td>

                    {/* Leg Type */}
                    <td className="py-4 px-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {getTaskLegTitle(t, allTasks.filter((x) => x.poNumber === t.poNumber))}
                      </span>
                    </td>

                    {/* 3-Way Match / Goods Receipt Status */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <GoodsReceiptBadge item={t} />
                    </td>

                    {/* Gross Amount */}
                    <td className="py-4 px-4 text-right whitespace-nowrap text-slate-600 font-medium tabular-nums">
                      {formatCurrency(t.grossAmount)}
                    </td>

                    {/* WHT */}
                    <td className="py-4 px-4 text-right whitespace-nowrap tabular-nums">
                      {Number(t.whtAmount) > 0 ? (
                        <div>
                          <span className="font-semibold text-red-600">
                            -{formatCurrency(t.whtAmount)}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            หัก {Number(t.whtPercent)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">0%</span>
                      )}
                    </td>

                    {/* Net Payable */}
                    <td className="py-4 px-4 text-right whitespace-nowrap tabular-nums">
                      <span className="text-sm font-black text-slate-900 tracking-tight">
                        {formatCurrency(t.netPayableAmount)}
                      </span>
                    </td>

                    {/* Due Date & Relative Badges */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 font-medium">{formatDate(t.dueDate)}</span>
                        {t.note && t.note.includes("[เลื่อนชำระ") && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300"
                            title="มีประวัติการเลื่อนนัดชำระ"
                          >
                            เลื่อนนัด
                          </span>
                        )}
                      </div>
                      {isTaskAwaitingGR ? (
                        <div className="text-[10px] font-bold text-red-700">
                          รอตรวจรับสินค้า
                        </div>
                      ) : !isPaid && daysLeft !== null ? (
                        <div
                          className={`text-[10px] font-bold mt-0.5 ${daysLeft < 0
                            ? "text-red-600"
                            : daysLeft === 0
                              ? "text-red-700 font-black"
                              : "text-slate-400"
                            }`}
                        >
                          {daysLeft < 0
                            ? `เกินกำหนด ${Math.abs(daysLeft)} วัน`
                            : daysLeft === 0
                              ? "ครบกำหนดวันนี้"
                              : `เหลืออีก ${daysLeft} วัน`}
                        </div>
                      ) : null}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          <FileCheck2 className="w-3.5 h-3.5 text-slate-700" />
                          <span>จ่ายเรียบร้อย</span>
                        </span>
                      ) : t.status === "AWAITING_GR" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                          <span>รอตรวจรับของ</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span>เกินกำหนด</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          <span>รอจ่ายเงิน</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenPoDetail(t.poNumber)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 cursor-pointer"
                          title="เปิดดูรายละเอียด PO ฉบับเต็ม"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isPaid ? (
                          <div className="text-[11px] text-slate-500 text-left mr-1">
                            <div className="font-semibold text-slate-700">
                              {t.paidFromBankCode || "BANK"}
                            </div>
                            {t.whtCertNumber && (
                              <div className="text-[10px] text-slate-700 font-mono">
                                50ทวิ: {t.whtCertNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenPaymentModal(t)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1 text-white bg-red-600 hover:bg-red-700"
                          >
                            <Landmark className="w-3 h-3" />
                            <span>
                              {t.status === "AWAITING_GR"
                                ? "เตือนรับของ"
                                : "บันทึกจ่าย"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenEditModal(t)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 cursor-pointer"
                          title="แก้ไขข้อมูล / เลื่อนนัดชำระงวดนี้"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            แสดง {(currentPage - 1) * pageSize + 1} ถึง{" "}
            {Math.min(currentPage * pageSize, totalItems)} จากทั้งหมด {totalItems} รายการงวดชำระ
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              หน้า {currentPage} จาก {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
