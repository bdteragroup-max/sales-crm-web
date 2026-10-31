"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  ShieldAlert, Plus, Search, FileText, ArrowRight,
  Clock, AlertTriangle, CheckCircle2, Building2, MapPin,
  Calendar, User, Package, DollarSign, LayoutGrid, List,
  RotateCcw, X, ChevronRight, CheckCircle, ArrowUpRight,
  Trash2
} from "lucide-react";
import { deleteDamageReport } from "@/app/actions/damageReports";
import { formatThaiDateTime } from "@/app/lib/thaiDate";

type Props = {
  reports: any[];
  currentUser: any;
};

export default function DamageReportsClient({ reports, currentUser }: Props) {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteItem = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();

    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบเคส?",
      text: `ต้องการลบเคส ${item.caseNumber} (${item.itemName}) ออกจากระบบหรือไม่?`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    try {
      setDeletingId(item.id);
      const res = await deleteDamageReport(item.id);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "ลบเคสสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // Status Definitions & Meta
  const statusMeta: Record<string, { label: string; badge: string; color: string; border: string; bg: string }> = {
    REPORTED: {
      label: "รอหัวหน้าตรวจ",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
      color: "text-blue-600",
      border: "border-blue-300",
      bg: "bg-blue-50",
    },
    INVESTIGATING: {
      label: "อยู่ระหว่างสืบสวน",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      color: "text-amber-600",
      border: "border-amber-300",
      bg: "bg-amber-50",
    },
    PENDING_APPROVAL: {
      label: "รออนุมัติ",
      badge: "bg-purple-100 text-purple-800 border-purple-200",
      color: "text-purple-600",
      border: "border-purple-300",
      bg: "bg-purple-50",
    },
    ACTION_REQUIRED: {
      label: "รอดำเนินการคลัง/HR",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
      color: "text-rose-600",
      border: "border-rose-300",
      bg: "bg-rose-50",
    },
    ACCOUNTING_REVIEW: {
      label: "บัญชีตรวจติดตาม",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
      color: "text-indigo-600",
      border: "border-indigo-300",
      bg: "bg-indigo-50",
    },
    CLOSED: {
      label: "ปิดเคสแล้ว",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      color: "text-emerald-600",
      border: "border-emerald-300",
      bg: "bg-emerald-50",
    },
    CANCELLED: {
      label: "ยกเลิก",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
      color: "text-gray-500",
      border: "border-gray-300",
      bg: "bg-gray-50",
    },
  };

  // Pre-calculate counts for each status & company
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {
      ALL: reports.length,
      REPORTED: 0,
      INVESTIGATING: 0,
      PENDING_APPROVAL: 0,
      ACTION_REQUIRED: 0,
      ACCOUNTING_REVIEW: 0,
      CLOSED: 0,
    };
    const byCompany: Record<string, number> = {
      ALL: reports.length,
      TG: 0,
      TE: 0,
      TP: 0,
    };

    reports.forEach((r) => {
      if (byStatus[r.status] !== undefined) byStatus[r.status]++;
      if (byCompany[r.company] !== undefined) byCompany[r.company]++;
    });

    return { byStatus, byCompany };
  }, [reports]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (selectedCompany !== "ALL" && r.company !== selectedCompany) return false;
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCase = (r.caseNumber || "").toLowerCase().includes(q);
        const matchItem = (r.itemName || "").toLowerCase().includes(q);
        const matchLoc = (r.currentLocation || r.siteLocation || "").toLowerCase().includes(q);
        const matchReporter = (r.reporterName || "").toLowerCase().includes(q);
        const matchTask = (r.pendingTaskDescription || "").toLowerCase().includes(q);
        if (!matchCase && !matchItem && !matchLoc && !matchReporter && !matchTask) return false;
      }
      return true;
    });
  }, [reports, selectedCompany, selectedStatus, search]);

  const resetFilters = () => {
    setSelectedCompany("ALL");
    setSelectedStatus("ALL");
    setSearch("");
  };

  const isFiltered = selectedCompany !== "ALL" || selectedStatus !== "ALL" || search.trim() !== "";

  return (
    <div className="space-y-6 pb-20">
      {/* ===================== 1. SYMMETRICAL MODERN HEADER BANNER ===================== */}
      <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-red-900/15 border border-red-500/20 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title & System Badge */}
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-bold tracking-wider backdrop-blur-sm">
              <ShieldAlert className="w-3.5 h-3.5 text-white" />
              <span>DAMAGE &amp; ASSET DEFECT SYSTEM</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>ระบบแจ้งและติดตามสินค้าและทรัพย์สินชำรุดเสียหาย</span>
            </h1>

            {/* Workflow Sequential Step Badges */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-rose-100 font-medium">
              <span className="bg-white/15 px-2 py-0.5 rounded-md text-white font-semibold">๑. แจ้งเหตุ &amp; รูป</span>
              <span>→</span>
              <span className="bg-white/15 px-2 py-0.5 rounded-md text-white font-semibold">๒. หัวหน้าตรวจ</span>
              <span>→</span>
              <span className="bg-white/15 px-2 py-0.5 rounded-md text-white font-semibold">๓. ผู้อนุมัติ</span>
              <span>→</span>
              <span className="bg-white/15 px-2 py-0.5 rounded-md text-white font-semibold">๔. คลังดูแล/HR</span>
              <span>→</span>
              <span className="bg-white/15 px-2 py-0.5 rounded-md text-white font-semibold">๕. บัญชีตรวจปิดเคส</span>
            </div>
          </div>

          {/* Right Symmetrical Action Button */}
          <div className="shrink-0">
            <Link
              href="/damage-reports/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 h-[42px] rounded-xl bg-white text-red-600 hover:bg-red-50 font-black text-xs shadow-lg shadow-black/10 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-red-600 stroke-[3]" />
              <span>แจ้งสินค้าชำรุด</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ===================== 2. SYMMETRICAL 6-KPI SUMMARY CARDS ===================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            key: "ALL",
            label: "เคสทั้งหมด",
            count: counts.byStatus.ALL,
            color: "text-slate-900",
            bg: "bg-white",
            border: selectedStatus === "ALL" ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200/80",
            icon: ShieldAlert,
          },
          {
            key: "REPORTED",
            label: "รอหัวหน้าตรวจ",
            count: counts.byStatus.REPORTED,
            color: "text-blue-700",
            bg: "bg-blue-50/50",
            border: selectedStatus === "REPORTED" ? "border-blue-600 ring-2 ring-blue-600/20" : "border-blue-100",
            icon: Clock,
          },
          {
            key: "INVESTIGATING",
            label: "อยู่ระหว่างสืบสวน",
            count: counts.byStatus.INVESTIGATING,
            color: "text-amber-700",
            bg: "bg-amber-50/50",
            border: selectedStatus === "INVESTIGATING" ? "border-amber-600 ring-2 ring-amber-600/20" : "border-amber-100",
            icon: AlertTriangle,
          },
          {
            key: "ACTION_REQUIRED",
            label: "รอดำเนินการคลัง/HR",
            count: counts.byStatus.ACTION_REQUIRED,
            color: "text-rose-700",
            bg: "bg-rose-50/50",
            border: selectedStatus === "ACTION_REQUIRED" ? "border-rose-600 ring-2 ring-rose-600/20" : "border-rose-100",
            icon: Package,
          },
          {
            key: "ACCOUNTING_REVIEW",
            label: "บัญชีตรวจติดตาม",
            count: counts.byStatus.ACCOUNTING_REVIEW,
            color: "text-indigo-700",
            bg: "bg-indigo-50/50",
            border: selectedStatus === "ACCOUNTING_REVIEW" ? "border-indigo-600 ring-2 ring-indigo-600/20" : "border-indigo-100",
            icon: FileText,
          },
          {
            key: "CLOSED",
            label: "ปิดเคสแล้ว",
            count: counts.byStatus.CLOSED,
            color: "text-emerald-700",
            bg: "bg-emerald-50/50",
            border: selectedStatus === "CLOSED" ? "border-emerald-600 ring-2 ring-emerald-600/20" : "border-emerald-100",
            icon: CheckCircle2,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          const isSelected = selectedStatus === kpi.key;
          return (
            <button
              key={kpi.key}
              onClick={() => setSelectedStatus(kpi.key)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between hover:shadow-md ${kpi.bg} ${kpi.border}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold text-slate-500 line-clamp-1">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color} shrink-0 opacity-80`} />
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-2xl font-black ${kpi.color}`}>{kpi.count}</span>
                {isSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">เลือกอยู่</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===================== 3. BALANCED FILTER CONTROLS ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm space-y-3">
        {/* Row 1: Company Selector & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Company Pills with Counts */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-gray-500 mr-1 shrink-0 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>บริษัท:</span>
            </span>
            {[
              { key: "ALL", label: "ทุกบริษัท" },
              { key: "TG", label: "TG" },
              { key: "TE", label: "TE" },
              { key: "TP", label: "TP" },
            ].map((comp) => {
              const active = selectedCompany === comp.key;
              const count = counts.byCompany[comp.key] || 0;
              return (
                <button
                  key={comp.key}
                  onClick={() => setSelectedCompany(comp.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    active
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span>{comp.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Search Box & View Mode Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเลขเคส, สินค้า, สถานที่, ผู้แจ้ง..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-800"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid vs Table View Mode */}
            <div className="flex items-center border border-gray-200 rounded-xl p-0.5 bg-gray-50 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="มุมมองการ์ด"
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-red-600 font-bold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="มุมมองตาราง"
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === "table"
                    ? "bg-white shadow-sm text-red-600 font-bold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Status Filter Tabs Bar with Badges */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { key: "ALL", label: "ทั้งหมด" },
              { key: "REPORTED", label: "รอหัวหน้าตรวจ" },
              { key: "INVESTIGATING", label: "อยู่ระหว่างสืบสวน" },
              { key: "PENDING_APPROVAL", label: "รออนุมัติ" },
              { key: "ACTION_REQUIRED", label: "รอดำเนินการคลัง/HR" },
              { key: "ACCOUNTING_REVIEW", label: "บัญชีตรวจติดตาม" },
              { key: "CLOSED", label: "ปิดเคสแล้ว" },
            ].map((tab) => {
              const active = selectedStatus === tab.key;
              const count = counts.byStatus[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reset Filters Shortcut */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 shrink-0 ml-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== 4. DATA PRESENTATION (GRID OR TABLE) ===================== */}
      {filtered.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/90 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-base font-bold text-gray-800">
            {isFiltered ? "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา" : "ยังไม่มีรายการแจ้งสินค้าชำรุด"}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {isFiltered
              ? "ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูรายการทั้งหมดในระบบ"
              : "เริ่มสร้างรายงานเพื่อติดตามสินค้าหรือทรัพย์สินที่ชำรุดเสียหายและดำเนินการตามขั้นตอน"}
          </p>

          <div className="flex items-center justify-center gap-3 mt-5">
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>แสดงทุกรายการ</span>
              </button>
            )}
            <Link
              href="/damage-reports/new"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>แจ้งสินค้าชำรุดใหม่</span>
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ===================== GRID VIEW (CARDS) ===================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const meta = statusMeta[item.status] || {
              label: item.status,
              badge: "bg-gray-100 text-gray-700 border-gray-200",
              color: "text-gray-600",
              border: "border-gray-200",
              bg: "bg-gray-50",
            };

            return (
              <Link
                key={item.id}
                href={`/damage-reports/${item.id}`}
                className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm hover:shadow-md hover:border-red-300 transition-all flex flex-col justify-between group space-y-4 relative"
              >
                {/* Header: Company + Case No + Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
                        {item.company}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                        {item.caseNumber}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Item Name & Specs */}
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
                    {item.itemName}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>
                      จำนวน: <strong className="text-red-600 font-bold">{item.damagedQuantity}</strong> {item.unit}
                    </span>
                    {item.itemModel && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="truncate">รุ่น: {item.itemModel}</span>
                      </>
                    )}
                  </div>

                  {/* Key Metadata Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{item.currentLocation || item.siteLocation || "รอตรวจสอบ"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">ผู้แจ้ง: {item.reporterName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                      <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>แจ้งเมื่อ: {formatThaiDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Pending Task & Quick Action */}
                <div className="pt-3 border-t border-gray-100 flex items-end justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">งานที่ค้าง:</div>
                    <div className="text-xs font-semibold text-rose-600 truncate mt-0.5">
                      {item.pendingTaskDescription || "รอติดตามงาน"}
                    </div>
                    {item.pendingTaskAssignee && (
                      <div className="text-[10px] text-gray-400 truncate">
                        ผู้รับผิดชอบ: {item.pendingTaskAssignee}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleDeleteItem(e, item)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="ลบเคสนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 group-hover:text-red-600 transition-colors">
                      <span>เปิดดู</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ===================== TABLE VIEW ===================== */
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-slate-700 font-bold text-[11px]">
                  <th className="py-3 px-4">เลขที่เคส</th>
                  <th className="py-3 px-3">บริษัท</th>
                  <th className="py-3 px-4">สินค้า / ทรัพย์สิน</th>
                  <th className="py-3 px-3 text-center">จำนวนชำรุด</th>
                  <th className="py-3 px-4">สถานที่จัดเก็บ/เกิดเหตุ</th>
                  <th className="py-3 px-3">ผู้แจ้งเหตุ</th>
                  <th className="py-3 px-3">สถานะ</th>
                  <th className="py-3 px-4">งานที่ค้างอยู่</th>
                  <th className="py-3 px-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const meta = statusMeta[item.status] || {
                    label: item.status,
                    badge: "bg-gray-100 text-gray-700 border-gray-200",
                    color: "text-gray-600",
                    border: "border-gray-200",
                    bg: "bg-gray-50",
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <Link href={`/damage-reports/${item.id}`} className="hover:text-red-600 hover:underline">
                          {item.caseNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                          {item.company}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 line-clamp-1">{item.itemName}</div>
                        {item.itemModel && <div className="text-[10px] text-gray-400">รุ่น: {item.itemModel}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-red-600">
                        {item.damagedQuantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-gray-600 truncate max-w-[160px]">
                        {item.currentLocation || item.siteLocation || "-"}
                      </td>
                      <td className="py-3 px-3 text-gray-700 truncate max-w-[120px]">
                        {item.reporterName}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-rose-600 font-semibold line-clamp-1">
                          {item.pendingTaskDescription || "-"}
                        </div>
                        {item.pendingTaskAssignee && (
                          <div className="text-[10px] text-gray-400">โดย: {item.pendingTaskAssignee}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/damage-reports/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 font-bold text-[11px] text-slate-700 transition-colors shadow-sm"
                          >
                            <span>เปิดดู</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          <button
                            onClick={(e) => handleDeleteItem(e, item)}
                            disabled={deletingId === item.id}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="ลบเคสนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
