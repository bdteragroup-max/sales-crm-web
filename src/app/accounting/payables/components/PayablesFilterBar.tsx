"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  Layers,
  Split,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  StatusTabType,
  CompanyFilterType,
  PaymentTypeFilter,
  GoodsReceivedFilter,
  DateFieldType,
  ViewModeType,
  THAI_MONTHS,
} from "./payablesTypes";

interface PayablesFilterBarProps {
  viewMode: ViewModeType;
  onChangeViewMode: (mode: ViewModeType) => void;
  consolidatedTotalCount: number;
  tasksTotalCount: number;
  activeStatusTab: StatusTabType;
  onChangeStatusTab: (status: StatusTabType) => void;
  statusCounts: {
    total: number;
    awaitingGr: number;
    readyToPay: number;
    overdue: number;
    paid: number;
  };
  companyFilter: CompanyFilterType;
  onChangeCompanyFilter: (co: CompanyFilterType) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  paymentTypeFilter: PaymentTypeFilter;
  onChangePaymentTypeFilter: (pt: PaymentTypeFilter) => void;
  goodsReceivedFilter: GoodsReceivedFilter;
  onChangeGoodsReceivedFilter: (gr: GoodsReceivedFilter) => void;
  dateFieldType: DateFieldType;
  onChangeDateFieldType: (dft: DateFieldType) => void;
  yearFilter: string;
  onChangeYearFilter: (year: string) => void;
  monthFilter: string;
  onChangeMonthFilter: (month: string) => void;
  dateFilter: string;
  onChangeDateFilter: (date: string) => void;
  availableYears: string[];
  onApplyToday: () => void;
  onApplyThisMonth: () => void;
  onApplyNextMonth: () => void;
  onClearDateFilters: () => void;
  onResetAllFilters: () => void;
  filteredCount: number;
}

export default function PayablesFilterBar({
  viewMode,
  onChangeViewMode,
  consolidatedTotalCount,
  tasksTotalCount,
  activeStatusTab,
  onChangeStatusTab,
  statusCounts,
  companyFilter,
  onChangeCompanyFilter,
  searchQuery,
  onChangeSearchQuery,
  paymentTypeFilter,
  onChangePaymentTypeFilter,
  goodsReceivedFilter,
  onChangeGoodsReceivedFilter,
  dateFieldType,
  onChangeDateFieldType,
  yearFilter,
  onChangeYearFilter,
  monthFilter,
  onChangeMonthFilter,
  dateFilter,
  onChangeDateFilter,
  availableYears,
  onApplyToday,
  onApplyThisMonth,
  onApplyNextMonth,
  onClearDateFilters,
  onResetAllFilters,
  filteredCount,
}: PayablesFilterBarProps) {
  const [showAdvancedDate, setShowAdvancedDate] = useState(false);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activeStatusTab !== "ALL" ||
    companyFilter !== "ALL" ||
    paymentTypeFilter !== "ALL" ||
    goodsReceivedFilter !== "ALL" ||
    yearFilter !== "ALL" ||
    monthFilter !== "ALL" ||
    dateFilter !== "";

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
      {/* ========================================================
          Tier 1: Symmetrical Top Row (View Switcher Left | Company Right)
         ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
        {/* Left: View Mode Segmented Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onChangeViewMode("CONSOLIDATED")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "CONSOLIDATED"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers
              className={`w-4 h-4 ${
                viewMode === "CONSOLIDATED" ? "text-red-600" : "text-slate-400"
              }`}
            />
            <span>รวมตามใบสั่งซื้อ PO</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                viewMode === "CONSOLIDATED"
                  ? "bg-red-50 text-red-700 border border-red-200/60"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {consolidatedTotalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode("TASKS")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "TASKS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Split
              className={`w-4 h-4 ${
                viewMode === "TASKS" ? "text-red-600" : "text-slate-400"
              }`}
            />
            <span>แยกตามงวดชำระ</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                viewMode === "TASKS"
                  ? "bg-red-50 text-red-700 border border-red-200/60"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {tasksTotalCount}
            </span>
          </button>
        </div>

        {/* Right: Company Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 w-full sm:w-auto justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-2.5">
            บริษัท
          </span>
          {(["ALL", "TP", "TG", "TE"] as const).map((co) => (
            <button
              key={co}
              type="button"
              onClick={() => onChangeCompanyFilter(co)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                companyFilter === co
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {co === "ALL" ? "ทั้งหมด" : co}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          Tier 2: Symmetrical Full-Width Status Grid (No Dangling Wrap!)
         ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
        <button
          type="button"
          onClick={() => onChangeStatusTab("ALL")}
          className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            activeStatusTab === "ALL"
              ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90"
          }`}
        >
          <span>ทั้งหมด</span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
              activeStatusTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {statusCounts.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeStatusTab("AWAITING_GR")}
          className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            activeStatusTab === "AWAITING_GR"
              ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>รอตรวจรับของ</span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
              activeStatusTab === "AWAITING_GR"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {statusCounts.awaitingGr}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeStatusTab("PENDING")}
          className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            activeStatusTab === "PENDING"
              ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>พร้อมจ่าย</span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
              activeStatusTab === "PENDING"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {statusCounts.readyToPay}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeStatusTab("OVERDUE")}
          className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
            activeStatusTab === "OVERDUE"
              ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>เกินกำหนด</span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
              activeStatusTab === "OVERDUE"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {statusCounts.overdue}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeStatusTab("PAID_VERIFIED")}
          className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer col-span-2 sm:col-span-1 ${
            activeStatusTab === "PAID_VERIFIED"
              ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>จ่ายแล้ว</span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
              activeStatusTab === "PAID_VERIFIED"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {statusCounts.paid}
          </span>
        </button>
      </div>

      {/* ========================================================
          Tier 3: Symmetrical Search & Filter Controls (Uniform Height)
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Bar (Span 5) */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="ค้นหาเลขที่ PO, เลข PR, ผู้ขาย, เลขบัญชี, ชื่องาน หรือโครงการ..."
            className="w-full h-11 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white focus:border-red-500 transition-all placeholder:text-slate-400 text-slate-800"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Goods Receipt Selector (Span 2) */}
        <div className="md:col-span-2">
          <select
            value={goodsReceivedFilter}
            onChange={(e) => onChangeGoodsReceivedFilter(e.target.value as GoodsReceivedFilter)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white focus:border-red-500 transition-all cursor-pointer truncate"
          >
            <option value="ALL">การรับของ: ทั้งหมด</option>
            <option value="RECEIVED">ได้รับสินค้าแล้ว (GR ผ่าน)</option>
            <option value="AWAITING">ยังไม่ได้รับของ (รอ GR)</option>
          </select>
        </div>

        {/* Payment Type Selector (Span 2) */}
        <div className="md:col-span-2">
          <select
            value={paymentTypeFilter}
            onChange={(e) => onChangePaymentTypeFilter(e.target.value as PaymentTypeFilter)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white focus:border-red-500 transition-all cursor-pointer truncate"
          >
            <option value="ALL">งวดชำระ: ทั้งหมด</option>
            <option value="DEPOSIT">งวดที่ 1: เงินมัดจำ (Deposit)</option>
            <option value="FINAL_BALANCE">งวดที่ 2+: ยอดคงเหลือ (Final)</option>
          </select>
        </div>

        {/* Quick Date Presets & Date Button (Span 3) */}
        <div className="md:col-span-3 flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={onApplyToday}
            className="h-11 px-3 rounded-2xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={onApplyThisMonth}
            className="h-11 px-3 rounded-2xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            เดือนนี้
          </button>
          <button
            type="button"
            onClick={onApplyNextMonth}
            className="h-11 px-3 rounded-2xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            เดือนถัดไป
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedDate(!showAdvancedDate)}
            className={`h-11 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              showAdvancedDate || yearFilter !== "ALL" || monthFilter !== "ALL" || dateFilter
                ? "bg-red-50 text-red-700 border-red-300 shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
            title="เปิด/ปิดตัวกรองวันที่เจาะจง"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>วันที่</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showAdvancedDate ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* ========================================================
          Collapsible Advanced Date Panel
         ======================================================== */}
      {showAdvancedDate && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Field Criterion Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>เกณฑ์วันที่:</span>
              </span>
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => onChangeDateFieldType("DUE_DATE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFieldType === "DUE_DATE"
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  วันครบกำหนดชำระ
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDateFieldType("PAID_DATE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFieldType === "PAID_DATE"
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  วันที่จ่ายจริง
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDateFieldType("PO_DATE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFieldType === "PO_DATE"
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  วันที่เอกสาร PO
                </button>
              </div>
            </div>

            {/* Clear date button */}
            {(yearFilter !== "ALL" || monthFilter !== "ALL" || dateFilter !== "") && (
              <button
                type="button"
                onClick={onClearDateFilters}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start lg:self-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ล้างตัวกรองวันที่</span>
              </button>
            )}
          </div>

          {/* Selectors Grid: Year, Month, Specific Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                ปี พ.ศ. / ค.ศ.
              </label>
              <select
                value={yearFilter}
                onChange={(e) => onChangeYearFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
              >
                <option value="ALL">ทุกปี</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y} ({parseInt(y) - 543})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                เดือน
              </label>
              <select
                value={monthFilter}
                onChange={(e) => onChangeMonthFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
              >
                <option value="ALL">ทุกเดือน</option>
                {THAI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                วันที่เจาะจง
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => onChangeDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => onChangeDateFilter("")}
                    className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          Active Filters Ribbon & Result Counters
         ======================================================== */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-2xl text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mr-1">
              กำลังกรอง:
            </span>

            {/* Active Status */}
            {activeStatusTab !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                <span>
                  สถานะ:{" "}
                  {activeStatusTab === "AWAITING_GR"
                    ? "รอตรวจรับของ"
                    : activeStatusTab === "PENDING"
                    ? "พร้อมจ่าย"
                    : activeStatusTab === "OVERDUE"
                    ? "เกินกำหนด"
                    : "จ่ายแล้ว"}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeStatusTab("ALL")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Company */}
            {companyFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                <span>บริษัท: {companyFilter}</span>
                <button
                  type="button"
                  onClick={() => onChangeCompanyFilter("ALL")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Payment Type */}
            {paymentTypeFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                <span>
                  งวด: {paymentTypeFilter === "DEPOSIT" ? "มัดจำ" : "ยอดจ่ายคงเหลือ"}
                </span>
                <button
                  type="button"
                  onClick={() => onChangePaymentTypeFilter("ALL")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Date Criteria */}
            {yearFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                <span>ปี: {yearFilter}</span>
                <button
                  type="button"
                  onClick={() => onChangeYearFilter("ALL")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {monthFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                <span>
                  เดือน: {THAI_MONTHS.find((m) => m.value === monthFilter)?.label || monthFilter}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeMonthFilter("ALL")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-200 shadow-xs">
                <span>วันที่: {dateFilter}</span>
                <button
                  type="button"
                  onClick={() => onChangeDateFilter("")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-xs">
                <span>ค้นหา: &quot;{searchQuery}&quot;</span>
                <button
                  type="button"
                  onClick={() => onChangeSearchQuery("")}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-bold">
              พบ {filteredCount} รายการ
            </span>
            <button
              type="button"
              onClick={onResetAllFilters}
              className="text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
