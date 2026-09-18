"use client";

import React, { useState } from "react";
import {
  Package,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  History,
  Eye,
  CheckCheck,
  RotateCcw,
  CalendarClock,
  Split,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
} from "lucide-react";
import {
  ConsolidatedPO,
  SupplierPaymentTask,
  CompanyBadge,
  GoodsReceiptBadge,
  formatDate,
  formatCurrency,
  getTaskLegTitle,
  GoodsReceivedFilter,
  PaymentTypeFilter,
  CompanyFilterType,
  StatusTabType,
} from "./payablesTypes";

interface ConsolidatedPoTableProps {
  data: ConsolidatedPO[];
  expandedPoNumbers: Record<string, boolean>;
  onToggleExpandPO: (poNumber: string) => void;
  onOpenPoDetail: (poNumber: string) => void;
  onOpenPaymentModal: (task: SupplierPaymentTask) => void;
  onOpenEditModal: (task: SupplierPaymentTask) => void;
  onOpenSplitModal: (task: SupplierPaymentTask) => void;
  onMergeTasks: (poNumber: string) => void;
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

export default function ConsolidatedPoTable({
  data,
  expandedPoNumbers,
  onToggleExpandPO,
  onOpenPoDetail,
  onOpenPaymentModal,
  onOpenEditModal,
  onOpenSplitModal,
  onMergeTasks,
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
}: ConsolidatedPoTableProps) {
  const [grDropdownOpen, setGrDropdownOpen] = useState(false);
  const [paymentTypeDropdownOpen, setPaymentTypeDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-4 px-3 text-center w-10"></th>
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
                    className={`group inline-flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
                      companyFilter && companyFilter !== "ALL"
                        ? "bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs"
                        : "hover:bg-slate-200/60 text-slate-700 font-bold"
                    }`}
                    title="กรองตามบริษัท"
                  >
                    <span>เลขที่ PO / บริษัท</span>
                    <Filter
                      className={`w-3 h-3 ${
                        companyFilter && companyFilter !== "ALL"
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
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              companyFilter === co
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
              <th className="py-4 px-4 min-w-[190px]">ผู้ขาย & เลขบัญชี</th>
              <th className="py-4 px-4 min-w-[190px]">ชื่องาน / โครงการ</th>
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
                    className={`group inline-flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
                      paymentTypeFilter && paymentTypeFilter !== "ALL"
                        ? "bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs"
                        : "hover:bg-slate-200/60 text-slate-700 font-bold"
                    }`}
                    title="กรองตามประเภทงวดชำระ"
                  >
                    <span>งวดชำระ</span>
                    <Filter
                      className={`w-3 h-3 ${
                        paymentTypeFilter && paymentTypeFilter !== "ALL"
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            paymentTypeFilter === "ALL"
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            paymentTypeFilter === "DEPOSIT"
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            paymentTypeFilter === "FINAL_BALANCE"
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
                    className={`group inline-flex items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                      goodsReceivedFilter && goodsReceivedFilter !== "ALL"
                        ? "bg-red-50 text-red-700 border border-red-200 shadow-2xs"
                        : "hover:bg-slate-200/60 text-slate-700"
                    }`}
                    title="คลิกเพื่อกรองตามสถานะตรวจรับสินค้า (GR)"
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="flex items-center gap-1 font-bold text-xs">
                        <span>สถานะตรวจรับสินค้า</span>
                        <Filter
                          className={`w-3 h-3 transition-colors ${
                            goodsReceivedFilter && goodsReceivedFilter !== "ALL"
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
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            goodsReceivedFilter === "ALL"
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
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            goodsReceivedFilter === "RECEIVED"
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
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            goodsReceivedFilter === "AWAITING"
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
              <th className="py-4 px-4 text-right min-w-[110px]">ยอดรวม PO</th>
              <th className="py-4 px-4 text-right min-w-[100px]">หัก ณ ที่จ่าย</th>
              <th className="py-4 px-4 text-right min-w-[130px]">ยอดคงค้างรอจ่าย</th>
              <th className="py-4 px-4 min-w-[130px]">กำหนดชำระ</th>
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
                    className={`group inline-flex items-center gap-1.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
                      activeStatusTab && activeStatusTab !== "ALL"
                        ? "bg-red-50 text-red-700 font-bold border border-red-200 shadow-2xs"
                        : "hover:bg-slate-200/60 text-slate-700 font-bold"
                    }`}
                    title="กรองตามสถานะภาพรวม"
                  >
                    <span>สถานะภาพรวม</span>
                    <Filter
                      className={`w-3 h-3 ${
                        activeStatusTab && activeStatusTab !== "ALL"
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
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              activeStatusTab === s.key
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
              <th className="py-4 px-4 text-center min-w-[100px]">จัดการ</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {data.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <Package className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">
                    ไม่พบใบสั่งซื้อ (PO) ที่ตรงตามเงื่อนไข
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ลองปรับเปลี่ยนตัวกรอง หรือกดปุ่ม &quot;ซิงค์ PO ทั้งหมด&quot; เพื่อดึงข้อมูลจัดซื้อล่าสุด
                  </p>
                </td>
              </tr>
            ) : (
              data.map((po) => {
                const isExpanded = !!expandedPoNumbers[po.poNumber];
                const isFullyPaid = po.overallStatus === "PAID_VERIFIED";
                const isOverdue = po.overallStatus === "OVERDUE";

                return (
                  <React.Fragment key={po.poNumber}>
                    <tr
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOverdue ? "bg-red-50/20" : ""
                      }`}
                    >
                      {/* Chevron Expand Toggle */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleExpandPO(po.poNumber)}
                          className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
                          title={isExpanded ? "ย่อรายละเอียด" : "คลี่ดูรายการงวดชำระ"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-red-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* PO & Company */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CompanyBadge code={po.company} />
                          <span className="font-mono text-xs text-slate-900 font-bold">
                            {po.poNumber}
                          </span>
                        </div>
                        {po.prNumber && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            PR: {po.prNumber}
                          </div>
                        )}
                      </td>

                      {/* Vendor & Bank Account */}
                      <td className="py-4 px-4 max-w-[200px]">
                        <div
                          className="font-bold text-slate-800 truncate"
                          title={po.purchaseOrder?.vendorName || "-"}
                        >
                          {po.purchaseOrder?.vendorName || "-"}
                        </div>
                        {po.purchaseOrder?.accountNumber ? (
                          <div
                            className="text-[11px] text-slate-600 font-mono flex items-center gap-1 mt-0.5 truncate font-semibold"
                            title={`เลขบัญชี: ${po.purchaseOrder.accountNumber}`}
                          >
                            <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{po.purchaseOrder.accountNumber}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">ไม่ได้ระบุบัญชี</div>
                        )}
                      </td>

                      {/* Job & Project */}
                      <td className="py-4 px-4 max-w-[210px]">
                        <div
                          className="font-semibold text-slate-800 truncate"
                          title={
                            po.purchaseOrder?.jobName ||
                            po.purchaseOrder?.purchaseRequest?.projectName ||
                            "-"
                          }
                        >
                          {po.purchaseOrder?.jobName || "-"}
                        </div>
                        {po.purchaseOrder?.purchaseRequest?.projectName && (
                          <div
                            className="text-[10px] text-slate-400 truncate mt-0.5"
                            title={po.purchaseOrder.purchaseRequest.projectName}
                          >
                            โครงการ: {po.purchaseOrder.purchaseRequest.projectName}
                          </div>
                        )}
                      </td>

                      {/* Installment Chips */}
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        {po.depositTask && po.balanceTask ? (
                          <div className="flex flex-col gap-1 items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              <span>มัดจำ: {formatCurrency(po.depositTask.grossAmount)}</span>
                              {po.depositTask.status === "PAID_VERIFIED" && (
                                <CheckCheck className="w-3 h-3 text-slate-600" />
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              <span>คงเหลือ: {formatCurrency(po.balanceTask.grossAmount)}</span>
                              {po.balanceTask.status === "PAID_VERIFIED" && (
                                <CheckCheck className="w-3 h-3 text-slate-600" />
                              )}
                            </span>
                          </div>
                        ) : po.tasks.length > 1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {po.tasks.length} งวด ({formatCurrency(po.totalGross)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                            1 งวด ({formatCurrency(po.totalGross)})
                          </span>
                        )}
                      </td>

                      {/* 3-Way Match / Goods Receipt Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <GoodsReceiptBadge item={po} />
                      </td>

                      {/* Total Gross */}
                      <td className="py-4 px-4 text-right whitespace-nowrap text-slate-600 font-semibold tabular-nums">
                        {formatCurrency(po.totalGross)}
                      </td>

                      {/* Total WHT */}
                      <td className="py-4 px-4 text-right whitespace-nowrap tabular-nums">
                        {po.totalWht > 0 ? (
                          <span className="font-semibold text-red-600">
                            -{formatCurrency(po.totalWht)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>

                      {/* Net Remaining / Paid */}
                      <td className="py-4 px-4 text-right whitespace-nowrap tabular-nums">
                        {po.totalPendingNet > 0 ? (
                          <div>
                            <span className="text-sm font-black text-slate-900 tracking-tight">
                              {formatCurrency(po.totalPendingNet)}
                            </span>
                            {po.totalPaid > 0 && (
                              <div className="text-[10px] text-slate-500 font-semibold">
                                จ่ายแล้ว {formatCurrency(po.totalPaid)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-black text-slate-700">
                              ชำระครบแล้ว
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {formatCurrency(po.totalPaid)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Due Date & Countdown */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isFullyPaid ? (
                          <span className="text-slate-400 font-medium">-</span>
                        ) : (
                          <div>
                            <span className="text-slate-800 font-medium">
                              {formatDate(po.earliestDueDate)}
                            </span>
                            {po.overallStatus === "AWAITING_GR" ? (
                              <div className="text-[10px] font-bold text-red-700">
                                รอตรวจรับสินค้า
                              </div>
                            ) : po.earliestDaysLeft !== null ? (
                              <div
                                className={`text-[10px] font-bold mt-0.5 ${
                                  po.earliestDaysLeft < 0
                                    ? "text-red-600"
                                    : po.earliestDaysLeft === 0
                                    ? "text-red-700 font-black"
                                    : "text-slate-400"
                                }`}
                              >
                                {po.earliestDaysLeft < 0
                                  ? `เกิน ${Math.abs(po.earliestDaysLeft)} วัน`
                                  : po.earliestDaysLeft === 0
                                  ? "ครบกำหนดวันนี้"
                                  : `เหลือ ${po.earliestDaysLeft} วัน`}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {po.overallStatus === "PAID_VERIFIED" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <FileCheck2 className="w-3.5 h-3.5 text-slate-700" />
                            <span>จ่ายครบแล้ว</span>
                          </span>
                        ) : po.overallStatus === "PARTIALLY_PAID" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <History className="w-3.5 h-3.5 text-slate-600" />
                            <span>จ่ายบางส่วน</span>
                          </span>
                        ) : po.overallStatus === "OVERDUE" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>เกินกำหนด</span>
                          </span>
                        ) : po.overallStatus === "AWAITING_GR" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>รอตรวจรับของ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>รอจ่ายเงิน</span>
                          </span>
                        )}
                      </td>

                      {/* Action Column */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenPoDetail(po.poNumber)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          title="เปิดดูรายละเอียด PO และสั่งจ่ายเงิน"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>รายละเอียด</span>
                        </button>
                      </td>
                    </tr>

                    {/* ========================================================
                        Accordion Drawer: Executive Summary & Installments
                       ======================================================== */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-slate-200 animate-in fade-in duration-200">
                        <td colSpan={12} className="p-4 sm:p-5">
                          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                            {/* Context Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>เลขที่ PO:</span>
                                  <span className="text-red-700 font-mono bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                    {po.poNumber}
                                  </span>
                                </span>

                                {po.purchaseOrder?.creditTerms && (
                                  <span>
                                    เครดิต:{" "}
                                    <span className="font-semibold text-slate-800">
                                      {po.purchaseOrder.creditTerms}
                                    </span>
                                  </span>
                                )}

                                {po.purchaseOrder?.deliveryDate && (
                                  <span>
                                    กำหนดส่งของ:{" "}
                                    <span className="font-semibold text-slate-800">
                                      {po.purchaseOrder.deliveryDate}
                                    </span>
                                  </span>
                                )}

                                {po.purchaseOrder?.requestedBy && (
                                  <span className="text-slate-500">
                                    ผู้ขอซื้อ:{" "}
                                    <span className="text-slate-700 font-medium">
                                      {po.purchaseOrder.requestedBy}
                                    </span>
                                  </span>
                                )}

                                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                                  <span className="text-slate-500 font-medium">การตรวจรับ:</span>
                                  <GoodsReceiptBadge item={po} showSubText={false} />
                                  {po.purchaseOrder?.receivedBy && (
                                    <span className="text-[11px] text-slate-500">
                                      (รับโดย: {po.purchaseOrder.receivedBy})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onOpenPoDetail(po.poNumber)}
                                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>เปิดดูข้อมูลจัดซื้อและสินค้าฉบับเต็ม</span>
                              </button>
                            </div>

                            {/* Item List Preview if present */}
                            {po.purchaseOrder?.itemList && (
                              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                                <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                <div className="truncate">
                                  <span className="font-bold text-slate-700">รายการสินค้า: </span>
                                  <span>{po.purchaseOrder.itemList}</span>
                                </div>
                              </div>
                            )}

                            {/* Installments Grid */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Landmark className="w-4 h-4 text-slate-600" />
                                  <span>ตารางงวดการชำระเงิน ({po.tasks.length} งวด)</span>
                                </h4>
                                {po.tasks.filter((t) => t.paymentType !== "DEPOSIT").length > 1 &&
                                  !po.tasks.some(
                                    (t) =>
                                      t.paymentType !== "DEPOSIT" && t.status === "PAID_VERIFIED"
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
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                {po.tasks.map((task) => {
                                  const isTaskPaid = task.status === "PAID_VERIFIED";
                                  const isDeposit = task.paymentType === "DEPOSIT";

                                  return (
                                    <div
                                      key={task.id}
                                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                                        isTaskPaid
                                          ? "bg-slate-50/50 border-slate-200"
                                          : task.status === "AWAITING_GR"
                                          ? "bg-red-50/20 border-red-200"
                                          : "bg-slate-50/60 border-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                            {getTaskLegTitle(task, po.tasks)}
                                          </span>
                                          <span className="text-xs font-bold text-slate-800 tabular-nums">
                                            {formatCurrency(task.grossAmount)}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <GoodsReceiptBadge item={task} showSubText={false} />
                                          {isTaskPaid ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                              <CheckCircle2 className="w-3 h-3 text-slate-700" />
                                              <span>จ่ายแล้ว</span>
                                            </span>
                                          ) : task.status === "AWAITING_GR" ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                              <ShieldAlert className="w-3 h-3 text-red-600" />
                                              <span>รอตรวจรับของ</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                              <Clock className="w-3 h-3 text-slate-600" />
                                              <span>รอจ่ายเงิน</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Breakdown Details */}
                                      <div className="grid grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                                        <div>
                                          <span className="text-[10px] text-slate-400 block">
                                            หักภาษี ({Number(task.whtPercent)}%):
                                          </span>
                                          <span className="font-semibold text-red-600 tabular-nums">
                                            {Number(task.whtAmount) > 0
                                              ? `-${formatCurrency(task.whtAmount)}`
                                              : "฿0.00"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 block">
                                            ยอดจ่ายสุทธิ:
                                          </span>
                                          <span className="font-black text-slate-900 tabular-nums">
                                            {formatCurrency(task.netPayableAmount)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-slate-400 block">
                                            ครบกำหนด:
                                          </span>
                                          <span className="font-semibold text-slate-800">
                                            {formatDate(task.dueDate)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Paid details or Action buttons */}
                                      {isTaskPaid ? (
                                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                                          <span>
                                            วันที่จ่าย: {formatDate(task.paidDate)} (
                                            {task.paidFromBankCode || "-"})
                                          </span>
                                          {task.whtCertNumber && (
                                            <span className="text-slate-700 font-bold">
                                              50 ทวิ: {task.whtCertNumber}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => onOpenPaymentModal(task)}
                                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700"
                                          >
                                            <Landmark className="w-3.5 h-3.5" />
                                            <span>
                                              {task.status === "AWAITING_GR"
                                                ? "บันทึกจ่าย (เตือนรับของ)"
                                                : "บันทึกจ่ายเงิน"}
                                            </span>
                                          </button>

                                          {!isDeposit && (
                                            <button
                                              type="button"
                                              onClick={() => onOpenSplitModal(task)}
                                              className="p-2 text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                                              title="แบ่งงวดชำระยอดนี้เพิ่ม"
                                            >
                                              <Split className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => onOpenEditModal(task)}
                                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                                            title="แก้ไข / เลื่อนนัดชำระ"
                                          >
                                            <CalendarClock className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
            {Math.min(currentPage * pageSize, totalItems)} จากทั้งหมด {totalItems} ใบสั่งซื้อ (PO)
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
