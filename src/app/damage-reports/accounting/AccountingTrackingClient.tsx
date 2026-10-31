"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Search, RefreshCw, Eye, CheckCircle2, Clock,
  AlertTriangle, DollarSign, Building2, Package, ArrowLeft, Printer,
  Edit3, ShieldAlert, Trash2, RotateCcw, X, MapPin, CheckCircle,
  SlidersHorizontal, Plus
} from "lucide-react";
import Swal from "sweetalert2";
import { updateAccountingAction, deleteDamageReport } from "@/app/actions/damageReports";
import { formatThaiDateTime } from "@/app/lib/thaiDate";

type Props = {
  initialReports: any[];
  initialMetrics: any;
  currentUser: any;
};

export default function AccountingTrackingClient({
  initialReports,
  initialMetrics,
  currentUser,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "CLOSED" | "ALL" | "WAREHOUSE_PENDING" | "HR_PENDING" | "ACCT_PENDING">("OPEN");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal State for Accounting Verification
  const [editingCase, setEditingCase] = useState<any | null>(null);
  const [actualCost, setActualCost] = useState("");
  const [accountingStatus, setAccountingStatus] = useState("PENDING");
  const [expressDocNo, setExpressDocNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [pendingTask, setPendingTask] = useState("");
  const [pendingAssignee, setPendingAssignee] = useState("");
  const [accountingNotes, setAccountingNotes] = useState("");
  const [costVerified, setCostVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Count by company
  const companyCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: initialReports.length, TG: 0, TE: 0, TP: 0 };
    initialReports.forEach((r) => {
      if (c[r.company] !== undefined) c[r.company]++;
    });
    return c;
  }, [initialReports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return initialReports.filter((r) => {
      if (selectedCompany !== "ALL" && r.company !== selectedCompany) return false;

      if (statusFilter === "OPEN" && ["CLOSED", "CANCELLED"].includes(r.status)) return false;
      if (statusFilter === "CLOSED" && r.status !== "CLOSED") return false;
      if (statusFilter === "WAREHOUSE_PENDING" && !["PENDING", "INSPECTING", "NEED_INFO"].includes(r.warehouseStatus)) return false;
      if (statusFilter === "HR_PENDING" && !["PENDING_REVIEW", "IN_REVIEW", "AWAITING_SIGNATURE", "AWAITING_PAYMENT", "PARTIAL_PAID"].includes(r.hrStatus)) return false;
      if (statusFilter === "ACCT_PENDING" && r.accountingStatus === "CERTIFIED") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCase = (r.caseNumber || "").toLowerCase().includes(q);
        const matchItem = (r.itemName || "").toLowerCase().includes(q);
        const matchLoc = (r.currentLocation || r.siteLocation || "").toLowerCase().includes(q);
        const matchAssignee = (r.pendingTaskAssignee || "").toLowerCase().includes(q);
        const matchDesc = (r.pendingTaskDescription || "").toLowerCase().includes(q);
        const matchXp = (r.accountingExpressDocNo || "").toLowerCase().includes(q);
        if (!matchCase && !matchItem && !matchLoc && !matchAssignee && !matchDesc && !matchXp) return false;
      }

      return true;
    });
  }, [initialReports, selectedCompany, statusFilter, search]);

  const resetFilters = () => {
    setSelectedCompany("ALL");
    setStatusFilter("ALL");
    setSearch("");
  };

  const isFiltered = selectedCompany !== "ALL" || statusFilter !== "OPEN" || search.trim() !== "";

  const openAccountingModal = (report: any) => {
    setEditingCase(report);
    setActualCost(report.actualCost ? String(report.actualCost) : report.estimatedCost ? String(report.estimatedCost) : "");
    setAccountingStatus(report.accountingStatus || "PENDING");
    setExpressDocNo(report.accountingExpressDocNo || "");
    setInvoiceNo(report.accountingInvoiceNo || "");
    setPendingTask(report.pendingTaskDescription || "");
    setPendingAssignee(report.pendingTaskAssignee || "");
    setAccountingNotes(report.accountingNotes || "");
    setCostVerified(Boolean(report.accountingCostVerified));
  };

  const handleSaveAccounting = async () => {
    if (!editingCase) return;
    setIsSaving(true);
    try {
      const res = await updateAccountingAction(editingCase.id, {
        accountingStatus: accountingStatus as any,
        actualCost: actualCost ? parseFloat(actualCost) : null,
        accountingCostVerified: costVerified,
        accountingExpressDocNo: expressDocNo.trim() || null,
        accountingInvoiceNo: invoiceNo.trim() || null,
        accountingNotes: accountingNotes.trim() || undefined,
        pendingTaskDescription: pendingTask.trim() || undefined,
        pendingTaskAssignee: pendingAssignee.trim() || undefined,
      });

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "บันทึกข้อมูลบัญชีสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
        });
        setEditingCase(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกข้อมูลได้",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCase = async (e: React.MouseEvent, report: any) => {
    e.preventDefault();
    e.stopPropagation();

    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบเคส?",
      text: `ต้องการลบเคส ${report.caseNumber} (${report.itemName}) ออกจากระบบหรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยันลบเคส",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    try {
      setDeletingId(report.id);
      const res = await deleteDamageReport(report.id);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "ลบเคสสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        Swal.fire({ icon: "error", title: "ไม่สามารถลบได้", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // Helper formatting stock display text
  const getStockDisplayText = (r: any) => {
    if (!r.sentToWarehouse) return "ไม่เกี่ยวข้อง";
    if (r.warehouseStatus === "COMPLETED") {
      return r.stockActionType ? `${r.stockActionType}` : "ดำเนินการแล้ว";
    }
    if (r.warehouseStatus === "INSPECTING") return "กำลังตรวจนับ";
    if (r.warehouseStatus === "NEED_INFO") return "รอข้อมูลเพิ่ม";
    return "รอดำเนินการ";
  };

  // Helper formatting accounting display text
  const getAccountingDisplayText = (r: any) => {
    if (r.accountingStatus === "CERTIFIED") return "รับรองแล้ว";
    if (r.accountingExpressDocNo) return `Express: ${r.accountingExpressDocNo}`;
    if (r.accountingCostVerified) return "ตรวจต้นทุนแล้ว";
    if (r.accountingStatus === "RECORDED") return "บันทึกแล้ว";
    if (r.actualCost) return `ต้นทุน ${r.actualCost.toLocaleString()} บ.`;
    return "รอตรวจต้นทุน";
  };

  // Helper formatting HR / compensation display text
  const getHrDisplayText = (r: any) => {
    if (!r.sentToHr) return "ไม่เกี่ยวข้อง";
    if (r.hrStatus === "WAIVED") return "ไม่เรียกชดใช้";
    if (r.hrStatus === "FULL_PAID") return "รับครบแล้ว";
    if (r.hrStatus === "PARTIAL_PAID") {
      const remain = (r.hrApprovedAmount || 0) - (r.hrActualPaidTotal || 0);
      return `รับบางส่วน (ค้าง ${remain.toLocaleString()} บ.)`;
    }
    if (r.hrStatus === "AWAITING_PAYMENT") return `รอชำระ (${(r.hrApprovedAmount || 0).toLocaleString()} บ.)`;
    if (r.hrStatus === "AWAITING_SIGNATURE") return "รอลงนามยินยอม";
    if (r.hrStatus === "IN_REVIEW") return "HR พิจารณา";
    return "รอส่งเรื่อง HR";
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ===================== 1. SYMMETRICAL HEADER BANNER ===================== */}
      <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/20 border border-slate-800 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left Title & Breadcrumb */}
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Link
                href="/damage-reports"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้ารายการเคส</span>
              </Link>
              <span className="text-gray-600">•</span>
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                ACCOUNTING &amp; FINANCE TRACKING
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-red-600/25 rounded-2xl border border-red-500/30 text-red-400">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <span>หน้าติดตามของบัญชีและการเงิน</span>
            </h1>

            <p className="text-gray-400 text-xs sm:text-sm font-light leading-relaxed">
              ติดตามสถานะสินค้า สต็อก บัญชี และการชดใช้ค่าเสียหาย ทุกบริษัทในเครือ (TG / TE / TP)
            </p>
          </div>

          {/* Right Symmetrical Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-[40px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-gray-300" />
              <span>พิมพ์รายงาน</span>
            </button>

            <Link
              href="/damage-reports/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 h-[40px] rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>แจ้งสินค้าชำรุด</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ===================== 2. SYMMETRICAL 6-KPI SUMMARY CARDS ===================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Open Cases */}
        <button
          onClick={() => setStatusFilter("OPEN")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
            statusFilter === "OPEN"
              ? "bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/20"
              : "bg-white border-gray-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold text-slate-500">เคสที่เปิดอยู่</span>
            <span className="p-1 rounded-lg bg-blue-100/70 text-blue-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{initialMetrics?.totalOpenCases || 0}</span>
            <span className="text-[10px] text-slate-400 font-semibold">เคส</span>
          </div>
        </button>

        {/* 2. Pending Investigation */}
        <button
          onClick={() => setStatusFilter("ALL")}
          className="p-3.5 rounded-2xl border border-gray-200/90 bg-white text-left transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold text-slate-500">รอสืบสวน</span>
            <span className="p-1 rounded-lg bg-amber-100/70 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{initialMetrics?.pendingSupervisor || 0}</span>
            <span className="text-[10px] text-slate-400 font-semibold">เคส</span>
          </div>
        </button>

        {/* 3. Pending Warehouse */}
        <button
          onClick={() => setStatusFilter("WAREHOUSE_PENDING")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
            statusFilter === "WAREHOUSE_PENDING"
              ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20"
              : "bg-white border-gray-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold text-slate-500">ค้างงานคลัง</span>
            <span className="p-1 rounded-lg bg-indigo-100/70 text-indigo-700">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600">{initialMetrics?.pendingWarehouse || 0}</span>
            <span className="text-[10px] text-slate-400 font-semibold">เคส</span>
          </div>
        </button>

        {/* 4. Pending HR */}
        <button
          onClick={() => setStatusFilter("HR_PENDING")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
            statusFilter === "HR_PENDING"
              ? "bg-purple-50/80 border-purple-600 ring-2 ring-purple-600/20"
              : "bg-white border-gray-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold text-slate-500">ค้างงาน HR</span>
            <span className="p-1 rounded-lg bg-purple-100/70 text-purple-700">
              <Building2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600">{initialMetrics?.pendingHr || 0}</span>
            <span className="text-[10px] text-slate-400 font-semibold">เคส</span>
          </div>
        </button>

        {/* 5. Pending Accounting */}
        <button
          onClick={() => setStatusFilter("ACCT_PENDING")}
          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
            statusFilter === "ACCT_PENDING"
              ? "bg-rose-50/80 border-rose-600 ring-2 ring-rose-600/20"
              : "bg-white border-gray-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold text-slate-500">รอตรวจบัญชี</span>
            <span className="p-1 rounded-lg bg-rose-100/70 text-rose-700">
              <FileText className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600">{initialMetrics?.pendingAccounting || 0}</span>
            <span className="text-[10px] text-slate-400 font-semibold">เคส</span>
          </div>
        </button>

        {/* 6. Total Uncollected */}
        <div className="p-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/40 text-left relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold text-emerald-800">ยอดค้างชดใช้</span>
            <span className="p-1 rounded-lg bg-emerald-200/80 text-emerald-800">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-700">
              {(initialMetrics?.totalUncollectedAmount || 0).toLocaleString("th-TH")}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">บ.</span>
          </div>
        </div>
      </div>

      {/* ===================== 3. BALANCED FILTER CONTROLS ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Left: Company & Status Switchers with clear separation */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Company Pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>บริษัท:</span>
              </span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
                {[
                  { key: "ALL", label: "ทุกบริษัท" },
                  { key: "TG", label: "TG" },
                  { key: "TE", label: "TE" },
                  { key: "TP", label: "TP" },
                ].map((comp) => {
                  const active = selectedCompany === comp.key;
                  const count = companyCounts[comp.key] || 0;
                  return (
                    <button
                      key={comp.key}
                      onClick={() => setSelectedCompany(comp.key)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                        active
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>{comp.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-6 bg-slate-200" />

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">สถานะ:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
                {[
                  { key: "OPEN", label: `เปิดอยู่ (${initialMetrics?.totalOpenCases || 0})` },
                  { key: "CLOSED", label: "ปิดเคสแล้ว" },
                  { key: "ALL", label: "ทั้งหมด" },
                ].map((tab) => {
                  const active = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key as any)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Search Box & Reset Filter */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเลขเคส, สินค้า, สถานที่, ผู้ค้าง..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 shrink-0 transition-colors border border-rose-200"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================== 4. BALANCED ACCOUNTING TRACKING TABLE ===================== */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-slate-700 font-bold text-[11px]">
                <th className="py-3 px-3.5 border-r border-gray-200 whitespace-nowrap w-[140px]">เลขที่เคส</th>
                <th className="py-3 px-3.5 border-r border-gray-200 min-w-[170px]">สินค้า</th>
                <th className="py-3 px-3.5 border-r border-gray-200 min-w-[130px]">อยู่ที่ไหน</th>
                <th className="py-3 px-3.5 border-r border-gray-200 min-w-[130px]">สต็อก</th>
                <th className="py-3 px-3.5 border-r border-gray-200 min-w-[130px]">บัญชี</th>
                <th className="py-3 px-3.5 border-r border-gray-200 min-w-[140px]">HR / เงินชดใช้</th>
                <th className="py-3 px-3.5 border-r border-gray-200 min-w-[160px]">งานที่ค้าง</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 bg-white">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-2">
                        <FileText className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isFiltered
                          ? "ลองเปลี่ยนเงื่อนไขค้นหา หรือกดปุ่มด้านล่างเพื่อแสดงรายการทั้งหมด"
                          : "ยังไม่มีรายการเคสแจ้งสินค้าชำรุดในระบบ"}
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        {isFiltered && (
                          <button
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>แสดงทุกรายการ</span>
                          </button>
                        )}
                        <Link
                          href="/damage-reports/new"
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>แจ้งสินค้าชำรุดใหม่</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isClosed = report.status === "CLOSED";
                  return (
                    <tr
                      key={report.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isClosed ? "bg-gray-50/40 text-gray-500" : ""
                      }`}
                    >
                      {/* 1. เลขที่เคส & บริษัท */}
                      <td className="py-3 px-3.5 border-r border-gray-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                            {report.company}
                          </span>
                          <Link
                            href={`/damage-reports/${report.id}`}
                            className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            title="คลิกเพื่อดูรายละเอียด"
                          >
                            {report.caseNumber}
                          </Link>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {formatThaiDateTime(report.createdAt)}
                        </div>
                      </td>

                      {/* 2. สินค้า */}
                      <td className="py-3 px-3.5 border-r border-gray-100">
                        <div className="font-bold text-gray-900 line-clamp-1">{report.itemName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          จำนวน: <strong className="text-red-600">{report.damagedQuantity}</strong> {report.unit}
                          {report.itemModel ? ` • รุ่น: ${report.itemModel}` : ""}
                        </div>
                      </td>

                      {/* 3. อยู่ที่ไหน */}
                      <td className="py-3 px-3.5 border-r border-gray-100 text-gray-800">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{report.currentLocation || "รอตรวจสอบ"}</span>
                        </span>
                      </td>

                      {/* 4. สต็อก */}
                      <td className="py-3 px-3.5 border-r border-gray-100 text-gray-800">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                              report.warehouseStatus === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : report.warehouseStatus === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {getStockDisplayText(report)}
                          </span>
                        </div>
                        {report.stockDocNumber && (
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Doc: {report.stockDocNumber}
                          </div>
                        )}
                      </td>

                      {/* 5. บัญชี */}
                      <td className="py-3 px-3.5 border-r border-gray-100 text-gray-800">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                              report.accountingStatus === "CERTIFIED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : report.accountingExpressDocNo
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : report.accountingCostVerified
                                ? "bg-teal-50 text-teal-700 border border-teal-200"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {getAccountingDisplayText(report)}
                          </span>
                        </div>
                        {report.accountingExpressDocNo && (
                          <div className="text-[10px] text-blue-700 font-mono mt-0.5">
                            XP: {report.accountingExpressDocNo}
                          </div>
                        )}
                      </td>

                      {/* 6. HR / เงินชดใช้ */}
                      <td className="py-3 px-3.5 border-r border-gray-100 text-gray-800">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                              report.hrStatus === "FULL_PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : report.hrStatus === "PARTIAL_PAID"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : report.hrStatus === "WAIVED"
                                ? "bg-gray-100 text-gray-700"
                                : report.hrStatus === "AWAITING_PAYMENT"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {getHrDisplayText(report)}
                          </span>
                        </div>
                        {report.hrSigneeName && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            ผู้ชดใช้: {report.hrSigneeName}
                          </div>
                        )}
                      </td>

                      {/* 7. งานที่ค้าง */}
                      <td className="py-3 px-3.5 border-r border-gray-100">
                        {isClosed ? (
                          <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>ปิดเคสแล้ว</span>
                          </span>
                        ) : (
                          <div>
                            <div className="font-semibold text-rose-600 text-xs line-clamp-1">
                              {report.pendingTaskDescription || "รอติดตามความคืบหน้า"}
                            </div>
                            {report.pendingTaskAssignee && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                ผู้รับผิดชอบ: <span className="font-medium text-gray-700">{report.pendingTaskAssignee}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. จัดการ */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openAccountingModal(report)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors shadow-xs"
                            title="บันทึกข้อมูลบัญชี / เลข Express"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/damage-reports/${report.id}`}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-slate-100 text-gray-700 transition-colors shadow-xs"
                            title="ดูรายละเอียดเคสเต็ม"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={(e) => handleDeleteCase(e, report)}
                            disabled={deletingId === report.id}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors shadow-xs"
                            title="ลบเคสนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* ===================== 5. MODAL FOR UPDATING ACCOUNTING ===================== */}
      {editingCase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-red-100 text-red-700">
                    {editingCase.company}
                  </span>
                  <span>บันทึกข้อมูลบัญชี: {editingCase.caseNumber}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingCase.itemName} • จำนวน {editingCase.damagedQuantity} {editingCase.unit}
                </p>
              </div>
              <button
                onClick={() => setEditingCase(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ต้นทุนจริงตามหลักฐาน (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    placeholder="เช่น 4500"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">สถานะการตรวจบัญชี</label>
                  <select
                    value={accountingStatus}
                    onChange={(e) => setAccountingStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="PENDING">รอตรวจต้นทุน (PENDING)</option>
                    <option value="COST_VERIFIED">ตรวจต้นทุนแล้ว (COST_VERIFIED)</option>
                    <option value="RECORDED">บันทึกบัญชีแล้ว (RECORDED)</option>
                    <option value="NEED_DOCS">รอเอกสารเพิ่มเติม (NEED_DOCS)</option>
                    <option value="CERTIFIED">ตรวจรับรองความครบถ้วนแล้ว (CERTIFIED)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">เลขที่เอกสาร Express</label>
                  <input
                    type="text"
                    value={expressDocNo}
                    onChange={(e) => setExpressDocNo(e.target.value)}
                    placeholder="เช่น JV67-0982 / ตัดสต็อก"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">เลขที่ใบกำกับ/บิลชดใช้</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="เช่น IV67-1044 / ใบเสร็จ"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">งานที่ค้าง (Pending Task Description)</label>
                <input
                  type="text"
                  value={pendingTask}
                  onChange={(e) => setPendingTask(e.target.value)}
                  placeholder="เช่น รอใบแจ้งค่าซ่อม, รอหัวหน้าส่งผลสอบสวน"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ผู้รับผิดชอบงานที่ค้าง (Assignee)</label>
                <input
                  type="text"
                  value={pendingAssignee}
                  onChange={(e) => setPendingAssignee(e.target.value)}
                  placeholder="เช่น หัวหน้างาน, ฝ่ายคลัง, HR"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">บันทึกเพิ่มเติมจากบัญชี</label>
                <textarea
                  rows={3}
                  value={accountingNotes}
                  onChange={(e) => setAccountingNotes(e.target.value)}
                  placeholder="บันทึกรายละเอียดการตรวจนับ หรือการประสานงาน..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={costVerified}
                    onChange={(e) => setCostVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>ยืนยันว่าได้ตรวจสอบต้นทุนตามเอกสารหลักฐานถูกต้องแล้ว</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveAccounting}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
