"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  DollarSign,
  Wallet,
  Banknote,
  ListTodo,
  AlertTriangle,
  CalendarClock,
  FileWarning,
  Users,
  CheckCircle2,
  Clock,
  HardHat,
  Download,
  Printer,
  Search,
  Filter,
  RotateCcw,
  FolderOpen,
  Plus,
  ChevronRight,
  ShieldCheck,
  Building2,
  X,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import DashboardCharts from "./DashboardCharts";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { calculateProjectProgress } from "@/app/lib/project-utils";

interface ProjectDashboardClientProps {
  projects: any[];
}

export default function ProjectDashboardClient({
  projects,
}: ProjectDashboardClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [managerFilter, setManagerFilter] = useState("All");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [quickTab, setQuickTab] = useState<string>("all");

  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });

  const today = useMemo(() => new Date(), []);

  // Unique filter lists
  const allStatuses = useMemo(
    () => Array.from(new Set(projects.map((p) => p.status))).filter(Boolean),
    [projects]
  );
  const allCategories = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.projectCategory))).filter(
        Boolean
      ),
    [projects]
  );
  const allManagers = useMemo(
    () =>
      Array.from(
        new Set(projects.map((p) => p.manager?.fullName))
      ).filter(Boolean),
    [projects]
  );
  const allProvinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))).filter(Boolean),
    [projects]
  );

  // Quick Tab counts
  const totalAllCount = projects.length;
  const inProgressCount = projects.filter(
    (p) => p.status === "In progress"
  ).length;
  const completedCount = projects.filter(
    (p) => p.status === "Completed"
  ).length;
  const overdueCount = projects.filter((p) => {
    if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
      return false;
    return new Date(p.endDate) < today;
  }).length;

  const deadlineWarningCount = projects.filter((p) => {
    if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
      return false;
    const diffTime = new Date(p.endDate).getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  const missingLogsCount = projects.filter((p) => {
    if (p.status === "Completed" || p.status === "Cancelled") return false;
    const logs = p.dailyLogs || [];
    if (logs.length === 0) return true;
    const lastLogDate = new Date(logs[0].date);
    const diffTime = today.getTime() - lastLogDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  }).length;

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Quick Tab
      if (quickTab === "in_progress" && p.status !== "In progress") return false;
      if (quickTab === "completed" && p.status !== "Completed") return false;
      if (quickTab === "overdue") {
        if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
          return false;
        if (new Date(p.endDate) >= today) return false;
      }
      if (quickTab === "warning") {
        if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
          return false;
        const diffTime = new Date(p.endDate).getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 30) return false;
      }
      if (quickTab === "missing_logs") {
        if (p.status === "Completed" || p.status === "Cancelled") return false;
        const logs = p.dailyLogs || [];
        if (logs.length > 0) {
          const lastLogDate = new Date(logs[0].date);
          const diffDays = Math.ceil(
            (today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays <= 7) return false;
        }
      }

      // Dropdown filters
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (categoryFilter !== "All" && p.projectCategory !== categoryFilter)
        return false;
      if (managerFilter !== "All" && p.manager?.fullName !== managerFilter)
        return false;
      if (provinceFilter !== "All" && p.province !== provinceFilter)
        return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchNumber = (p.projectNumber || "").toLowerCase().includes(q);
        const matchProv = (p.province || "").toLowerCase().includes(q);
        const matchManager = (p.manager?.fullName || "")
          .toLowerCase()
          .includes(q);
        if (!matchName && !matchNumber && !matchProv && !matchManager)
          return false;
      }

      return true;
    });
  }, [
    projects,
    quickTab,
    statusFilter,
    categoryFilter,
    managerFilter,
    provinceFilter,
    search,
    today,
  ]);

  // Financial aggregates
  const totalValue = useMemo(
    () =>
      filteredProjects.reduce(
        (sum, p) => sum + (Number(p.projectValue) || 0),
        0
      ),
    [filteredProjects]
  );
  const totalBudget = useMemo(
    () =>
      filteredProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0),
    [filteredProjects]
  );
  const totalSecurityDeposit = useMemo(
    () =>
      filteredProjects.reduce(
        (sum, p) => sum + (Number(p.securityDeposit) || 0),
        0
      ),
    [filteredProjects]
  );
  const totalOutstandingInstallments = useMemo(
    () =>
      filteredProjects.reduce(
        (sum, p) =>
          sum +
          (Number(p.installment1) || 0) +
          (Number(p.installment2) || 0) +
          (Number(p.installment3) || 0) +
          (Number(p.installment4) || 0),
        0
      ),
    [filteredProjects]
  );
  const totalPenalties = useMemo(
    () =>
      filteredProjects.reduce(
        (sum, p) => sum + (Number(p.penaltyPerDay) || 0),
        0
      ),
    [filteredProjects]
  );
  const pendingTasksCount = useMemo(
    () =>
      filteredProjects.reduce(
        (sum, p) =>
          sum +
          (p.tasks?.filter((t: any) => t.status !== "Completed").length || 0),
        0
      ),
    [filteredProjects]
  );

  // Alerts
  const projectsNearDeadline = useMemo(() => {
    return filteredProjects.filter((p) => {
      if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
        return false;
      const end = new Date(p.endDate);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });
  }, [filteredProjects, today]);

  const projectsMissingLogs = useMemo(() => {
    return filteredProjects.filter((p) => {
      if (p.status === "Completed" || p.status === "Cancelled") return false;
      const logs = p.dailyLogs || [];
      if (logs.length === 0) return true;
      const lastLogDate = new Date(logs[0].date);
      const diffTime = today.getTime() - lastLogDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 7;
    });
  }, [filteredProjects, today]);

  // Team Workload
  const pmWorkloadArray = useMemo(() => {
    const workload = filteredProjects.reduce((acc, p) => {
      if (p.status === "Completed" || p.status === "Cancelled") return acc;
      const pmName = p.manager?.fullName || "ไม่ระบุผู้ดูแล";
      if (!acc[pmName]) {
        acc[pmName] = {
          name: pmName,
          projectCount: 0,
          totalTasks: 0,
          completedTasks: 0,
          totalValue: 0,
        };
      }
      acc[pmName].projectCount += 1;
      acc[pmName].totalValue += Number(p.projectValue) || 0;
      acc[pmName].totalTasks += p.tasks?.length || 0;
      acc[pmName].completedTasks +=
        p.tasks?.filter((t: any) => t.status === "Completed").length || 0;
      return acc;
    }, {} as Record<string, { name: string; projectCount: number; totalTasks: number; completedTasks: number; totalValue: number }>);

    return Object.values(workload).sort(
      (a: any, b: any) => b.projectCount - a.projectCount
    );
  }, [filteredProjects]);

  // Feeds
  const recentReports = useMemo(() => {
    return filteredProjects
      .flatMap((p) =>
        (p.dailyLogs || []).map((log: any) => ({
          ...log,
          projectNumber: p.projectNumber,
          projectName: p.name,
          projectId: p.id,
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [filteredProjects]);

  const recentlyUpdatedProjects = useMemo(() => {
    return [...filteredProjects]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 6);
  }, [filteredProjects]);

  const exportToExcel = () => {
    const data = filteredProjects.map((p) => ({
      "รหัสโครงการ": p.projectNumber,
      "ชื่อโครงการ": p.name,
      "สถานะ": p.status,
      "หมวดหมู่": p.projectCategory || "ไม่ระบุ",
      "ผู้จัดการโครงการ (PM)": p.manager?.fullName || "ไม่ระบุ",
      "จังหวัด": p.province || "ไม่ระบุ",
      "วันเริ่มต้น": p.startDate
        ? new Date(p.startDate).toLocaleDateString("th-TH")
        : "-",
      "วันสิ้นสุด": p.endDate
        ? new Date(p.endDate).toLocaleDateString("th-TH")
        : "-",
      "มูลค่าโครงการ (บาท)": Number(p.projectValue) || 0,
      "งบประมาณ (บาท)": Number(p.budget) || 0,
      "เงินประกันผลงาน (บาท)": Number(p.securityDeposit) || 0,
      "ค่างวด 1": Number(p.installment1) || 0,
      "ค่างวด 2": Number(p.installment2) || 0,
      "ค่างวด 3": Number(p.installment3) || 0,
      "ค่างวด 4": Number(p.installment4) || 0,
      "ค่าปรับต่อวัน": Number(p.penaltyPerDay) || 0,
      "จำนวนงานทั้งหมด": p.tasks?.length || 0,
      "งานที่ยังค้าง":
        p.tasks?.filter((t: any) => t.status !== "Completed").length || 0,
      "ความคืบหน้า (%)": calculateProjectProgress(p),
      "อุปกรณ์ทั้งหมด": p.equipment?.length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Project Dashboard");
    XLSX.writeFile(
      wb,
      `Project_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `฿${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
    return `฿${val.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  };

  const isFiltered = Boolean(
    quickTab !== "all" ||
      statusFilter !== "All" ||
      categoryFilter !== "All" ||
      managerFilter !== "All" ||
      provinceFilter !== "All" ||
      search
  );

  const resetFilters = () => {
    setQuickTab("all");
    setStatusFilter("All");
    setCategoryFilter("All");
    setManagerFilter("All");
    setProvinceFilter("All");
    setSearch("");
  };

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* ── 1. Header & Navigation Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="space-y-1.5 min-w-0">
          {/* Breadcrumb Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-medium">ระบบบริหารโครงการ (Projects)</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">
              ภาพรวมและการวิเคราะห์โครงการ (Project Dashboard)
            </span>
          </div>

          {/* Title + Subtitle */}
          <div className="flex items-center gap-3 pt-0.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                ภาพรวมโครงการ{" "}
                <span className="text-slate-400 font-medium text-base sm:text-lg">
                  (Project Dashboard)
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                สรุปข้อมูลการเงิน โครงการ ความคืบหน้า อุปกรณ์หน้างาน และประสิทธิภาพทีมงาน
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 lg:justify-end shrink-0 pt-2 lg:pt-0 print:hidden">
          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
          >
            <FolderOpen size={14} className="text-indigo-600" />
            <span>ทะเบียนโครงการ</span>
          </Link>

          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
          >
            <Plus size={14} />
            <span>สร้างโครงการใหม่</span>
          </Link>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
          >
            <Printer size={14} />
            <span>Print PDF</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ── 2. Quick Status Pills (Interactive Filter Tabs) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
        <button
          onClick={() => setQuickTab("all")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
            quickTab === "all"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <span>ทั้งหมด</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] ${
              quickTab === "all"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {totalAllCount}
          </span>
        </button>

        <button
          onClick={() => setQuickTab("in_progress")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
            quickTab === "in_progress"
              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <Clock size={13} className={quickTab === "in_progress" ? "text-white" : "text-blue-500"} />
          <span>กำลังดำเนินการ</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] ${
              quickTab === "in_progress"
                ? "bg-white/20 text-white"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {inProgressCount}
          </span>
        </button>

        <button
          onClick={() => setQuickTab("warning")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
            quickTab === "warning"
              ? "bg-amber-500 text-white border-amber-500 shadow-xs"
              : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <CalendarClock size={13} className={quickTab === "warning" ? "text-white" : "text-amber-500"} />
          <span>ใกล้ส่งมอบ (≤ 30 วัน)</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] ${
              quickTab === "warning"
                ? "bg-white/20 text-white"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {deadlineWarningCount}
          </span>
        </button>

        <button
          onClick={() => setQuickTab("missing_logs")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
            quickTab === "missing_logs"
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <FileWarning size={13} className={quickTab === "missing_logs" ? "text-white" : "text-rose-500"} />
          <span>ขาดรายงาน (&gt; 7 วัน)</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] ${
              quickTab === "missing_logs"
                ? "bg-white/20 text-white"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {missingLogsCount}
          </span>
        </button>

        <button
          onClick={() => setQuickTab("completed")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
            quickTab === "completed"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <CheckCircle2 size={13} className={quickTab === "completed" ? "text-white" : "text-emerald-500"} />
          <span>เสร็จสมบูรณ์</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[11px] ${
              quickTab === "completed"
                ? "bg-white/20 text-white"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {completedCount}
          </span>
        </button>

        {overdueCount > 0 && (
          <button
            onClick={() => setQuickTab("overdue")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              quickTab === "overdue"
                ? "bg-red-600 text-white border-red-600 shadow-xs"
                : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle size={13} className={quickTab === "overdue" ? "text-white" : "text-red-500"} />
            <span>เกินกำหนด</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] ${
                quickTab === "overdue"
                  ? "bg-white/20 text-white"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {overdueCount}
            </span>
          </button>
        )}
      </div>

      {/* ── 3. Filters & Search Controls ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5 print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ, รหัส, จังหวัด, ผู้จัดการ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Clear Button if active */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-1 shrink-0"
            >
              <RotateCcw size={12} />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>

        {/* Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500 mr-1">
            <Filter size={13} className="text-slate-400" />
            <span>ตัวกรอง:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">ทุกสถานะ</option>
            {allStatuses.map((s: any) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">ทุกหมวดหมู่โครงการ</option>
            {allCategories.map((c: any) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">ผู้ดูแล (PM ทุกคน)</option>
            {allManagers.map((m: any) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">ทุกจังหวัด</option>
            {allProvinces.map((p: any) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <span className="text-xs font-semibold text-slate-500 ml-auto bg-slate-100 px-2.5 py-1 rounded-lg">
            แสดง {filteredProjects.length} จาก {projects.length} โครงการ
          </span>
        </div>
      </div>

      {/* ── 4. Primary Financial & Progress KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Project Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              มูลค่าโครงการรวม
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              จากทั้งหมด {filteredProjects.length} โครงการ
            </p>
          </div>
        </div>

        {/* Card 2: Total Budget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              งบประมาณรวม
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalBudget)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalValue > 0
                ? `คิดเป็น ${Math.round((totalBudget / totalValue) * 100)}% ของมูลค่ารวม`
                : "ยังไม่มีข้อมูล"}
            </p>
          </div>
        </div>

        {/* Card 3: Uncollected Installments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              ค่างวดค้างรับ (งวด 1-4)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Banknote size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-600 tracking-tight">
              {formatCurrency(totalOutstandingInstallments)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              ประกันผลงาน: {formatCurrency(totalSecurityDeposit)}
            </p>
          </div>
        </div>

        {/* Card 4: Pending Tasks & Penalty Risk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              งานค้าง & ค่าปรับ
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ListTodo size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-600 tracking-tight">
              {pendingTasksCount} งาน
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              ค่าปรับรวม: {formatCurrency(totalPenalties)}/วัน
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Urgency & Operational Alerts Hub ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:hidden">
        {/* Box A: Projects Near Deadline */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 text-sm">
              <CalendarClock size={16} className="text-amber-600" />
              <span>โครงการใกล้กำหนดส่ง (≤ 30 วัน)</span>
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
              {projectsNearDeadline.length} โครงการ
            </span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {projectsNearDeadline.length > 0 ? (
              projectsNearDeadline.map((p) => {
                const diffTime =
                  new Date(p.endDate).getTime() - today.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <Link
                    href={`/projects/${p.id}`}
                    key={p.id}
                    className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs flex justify-between items-center hover:border-amber-300 transition-all group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate">
                        {p.projectNumber} • {p.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PM: {p.manager?.fullName || "ไม่ระบุ"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500 text-white shadow-xs">
                        เหลือ {daysLeft} วัน
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-amber-700/60 font-medium">
                ไม่มีโครงการที่ใกล้กำหนดส่งใน 30 วันนี้
              </div>
            )}
          </div>
        </div>

        {/* Box B: Projects Missing Daily Logs */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-bold text-rose-900 flex items-center gap-2 text-sm">
              <FileWarning size={16} className="text-rose-600" />
              <span>โครงการขาดรายงาน (ไม่มี Daily Log &gt; 7 วัน)</span>
            </h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
              {projectsMissingLogs.length} โครงการ
            </span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {projectsMissingLogs.length > 0 ? (
              projectsMissingLogs.map((p) => {
                const logs = p.dailyLogs || [];
                const lastDate =
                  logs.length > 0
                    ? new Date(logs[0].date).toLocaleDateString("th-TH")
                    : "ยังไม่เคยส่ง";
                return (
                  <Link
                    href={`/projects/${p.id}?tab=reports`}
                    key={p.id}
                    className="bg-white p-3 rounded-xl border border-rose-100 shadow-2xs flex justify-between items-center hover:border-rose-300 transition-all group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-rose-700 truncate">
                        {p.projectNumber} • {p.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ล่าสุด: {lastDate}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        {p.manager?.fullName || "ไม่ระบุ PM"}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-rose-700/60 font-medium">
                ทุกโครงการส่งรายงานประจำวันอย่างสม่ำเสมอ
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. Visual Analytics (Charts Section) ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" />
            <span>แผนภาพวิเคราะห์ภาพรวมโครงการ (Visual Analytics)</span>
          </h2>
        </div>
        <DashboardCharts projects={filteredProjects} />
      </div>

      {/* ── 7. Team Workload & PM Leaderboard ── */}
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            <span>ภาระงานของผู้จัดการโครงการ (PM Workload)</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {pmWorkloadArray.length} ผู้จัดการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">ผู้จัดการโครงการ (PM)</th>
                <th className="py-3 px-4">จำนวนโครงการ</th>
                <th className="py-3 px-4">มูลค่ารวมที่ดูแล</th>
                <th className="py-3 px-4">งานที่ยังค้าง</th>
                <th className="py-3 px-4 w-48">ความคืบหน้างานรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pmWorkloadArray.map((pm: any, idx: number) => {
                const progress =
                  pm.totalTasks > 0
                    ? Math.round((pm.completedTasks / pm.totalTasks) * 100)
                    : 0;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {pm.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-xs">
                        {pm.projectCount} โครงการ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {formatCurrency(pm.totalValue)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          pm.totalTasks - pm.completedTasks > 5
                            ? "text-rose-600 font-bold"
                            : "text-slate-600"
                        }`}
                      >
                        {pm.totalTasks - pm.completedTasks} งาน
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 w-8">
                          {progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pmWorkloadArray.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-slate-400 font-medium"
                  >
                    ยังไม่มีข้อมูลภาระงานในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 8. Feeds: Field Reports & Recent Updates ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print:hidden">
        {/* Feed A: Recent Field Reports */}
        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ClipboardList className="text-indigo-600" size={16} />
              <span>บันทึกประจำวันล่าสุด (Recent Field Logs)</span>
            </h3>
            <span className="text-xs text-slate-400">10 รายการล่าสุด</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-2.5">
            {recentReports.length > 0 ? (
              recentReports.map((report, idx) => (
                <Link
                  href={`/projects/${report.projectId}?tab=reports`}
                  key={idx}
                  className="block p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-2xs transition-all group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                        {report.projectNumber} • {report.projectName}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                        <span className="font-semibold text-slate-800">
                          {report.reporter?.fullName || report.reportedBy}:
                        </span>{" "}
                        {report.workSummary}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {new Date(report.date).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีบันทึกรายงานหน้างาน
              </div>
            )}
          </div>
        </div>

        {/* Feed B: Recently Updated Projects */}
        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <HardHat className="text-emerald-600" size={16} />
              <span>โครงการที่มีความเคลื่อนไหว (Recent Activity)</span>
            </h3>
            <span className="text-xs text-slate-400">อัปเดตล่าสุด</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-2.5">
            {recentlyUpdatedProjects.length > 0 ? (
              recentlyUpdatedProjects.map((p, idx) => (
                <Link
                  href={`/projects/${p.id}`}
                  key={idx}
                  className="block p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-2xs transition-all group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 truncate">
                        {p.projectNumber} • {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {p.status}
                        </span>
                        {p.province && (
                          <span className="text-[10px] text-slate-400">
                            {p.province}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {new Date(p.updatedAt).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลโครงการ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
