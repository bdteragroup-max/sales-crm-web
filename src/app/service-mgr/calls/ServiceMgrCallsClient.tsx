"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Headphones,
  RotateCcw,
  Upload,
  Plus,
  Search,
  FileSpreadsheet,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX,
  UserPlus,
  Building2,
  Phone,
  Cpu,
  Calendar,
  ArrowUpDown,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  SlidersHorizontal,
  ShieldCheck,
  Copy,
  Check,
  FolderOpen,
  AlertCircle,
  Wrench,
  CheckCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import {
  getServiceCallLogs,
  getServiceCallDashboardStats,
  getServiceUsers,
  updateServiceCallLog,
  deleteServiceCallLog,
} from "@/app/actions/service-calls";

interface UserItem {
  id: string;
  fullName: string;
  role: string;
  nickname?: string | null;
}

interface ServiceMgrCallsClientProps {
  initialStats?: { openCount: number; closedCount: number; totalCount: number };
  initialLogs?: any[];
  initialUsers?: UserItem[];
  currentUser?: any;
}

// ── Status Helpers ──
export function getCallStatusMeta(status?: string | null) {
  const s = status || "Received notification";

  const isClosed =
    s.includes("smoothly") ||
    s.includes("ปกติ") ||
    s.includes("ปิดเคส") ||
    s.includes("ระบบเดินได้เรียบร้อย");

  const isCustomerPending =
    s.includes("Customer has not yet made changes") ||
    s.includes("ลูกค้ายังไม่แก้ไข");

  const isHardwareIssue =
    s.includes("Machine broken") ||
    s.includes("broken") ||
    s.includes("เครื่องเสีย") ||
    s.includes("ส่งซ่อม");

  const isInvestigating =
    s.includes("issues") ||
    s.includes("ปัญหา") ||
    s.includes("Waiting for on-site inspection");

  if (isClosed) {
    return {
      label: s === "System running smoothly" ? "ปิดเคสแล้ว (ระบบปกติ)" : s,
      badgeClass: "bg-gray-900 text-white border-gray-800",
      dotClass: "bg-white",
      type: "closed" as const,
    };
  }

  if (isCustomerPending) {
    return {
      label: s === "Customer has not yet made changes" ? "รอติดตาม (ลูกค้ายังไม่แก้ไข)" : s,
      badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
      dotClass: "bg-gray-500",
      type: "customer_pending" as const,
    };
  }

  if (isHardwareIssue) {
    return {
      label: s === "Machine broken" ? "เครื่องเสีย (ส่งซ่อม/เปลี่ยน)" : s,
      badgeClass: "bg-red-100 text-red-800 border-red-300 font-bold",
      dotClass: "bg-[#ff2301]",
      type: "hardware" as const,
    };
  }

  if (isInvestigating) {
    return {
      label:
        s === "Waiting for on-site inspection"
          ? "รอนัดหมายเข้าตรวจ"
          : s === "System still has issues"
          ? "กำลังดำเนินการ (ยังมีปัญหา)"
          : s,
      badgeClass: "bg-red-50 text-red-800 border-red-200/90 font-semibold",
      dotClass: "bg-[#ff2301]",
      type: "in_progress" as const,
    };
  }

  // Pending / Received
  return {
    label: s === "Received notification" ? "เปิดเคส (รับแจ้งแล้ว)" : s,
    badgeClass: "bg-red-50 text-red-700 border-red-200/90 font-medium",
    dotClass: "bg-[#ff2301]",
    type: "pending" as const,
  };
}

export function formatThaiDate(dateVal?: string | Date | null) {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ServiceMgrCallsClient({
  initialStats,
  initialLogs,
  initialUsers,
  currentUser,
}: ServiceMgrCallsClientProps) {
  const router = useRouter();

  // Data states
  const [logs, setLogs] = useState<any[]>(initialLogs || []);
  const [stats, setStats] = useState(
    initialStats || { openCount: 0, closedCount: 0, totalCount: 0 }
  );
  const [users, setUsers] = useState<UserItem[]>(initialUsers || []);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [filterResponsible, setFilterResponsible] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "case_desc" | "company_asc">("date_desc");

  // Detail Modal & Reassign Modal states
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [reassignModalLog, setReassignModalLog] = useState<any | null>(null);
  const [reassignSearch, setReassignSearch] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Check if current user is Manager or Admin
  const isManagerOrAdmin = useMemo(() => {
    const role = currentUser?.role || "";
    return (
      role === "Service Engineer MGR" ||
      role === "Service Engineer MGR." ||
      role === "SUPER_ADMIN" ||
      role === "Admin" ||
      role === "ADMIN"
    );
  }, [currentUser]);

  // If no initial data was provided, fetch it
  useEffect(() => {
    if (!initialLogs || initialLogs.length === 0) {
      fetchAllData();
    }
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, logsData] = await Promise.all([
        getServiceCallDashboardStats(),
        getServiceUsers(),
        getServiceCallLogs({}),
      ]);
      setStats(statsData);
      setUsers(usersData as UserItem[]);
      setLogs(logsData);
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Reassignment handling
  const handleOpenReassign = (log: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReassignModalLog(log);
    setReassignSearch("");
  };

  const handleConfirmReassign = async (newUserId: string | null) => {
    if (!reassignModalLog) return;
    setIsReassigning(true);

    try {
      await updateServiceCallLog(reassignModalLog.id, {
        responsibleId: newUserId || null,
      });

      // Update local logs state
      const targetUser = newUserId ? users.find((u) => u.id === newUserId) : null;
      setLogs((prev) =>
        prev.map((item) => {
          if (item.id === reassignModalLog.id) {
            return {
              ...item,
              responsibleId: newUserId,
              responsible: targetUser ? { fullName: targetUser.fullName } : null,
              responsibleName: targetUser ? targetUser.fullName : null,
            };
          }
          return item;
        })
      );

      // Update selectedLog if open
      if (selectedLog?.id === reassignModalLog.id) {
        setSelectedLog((prev: any) =>
          prev
            ? {
                ...prev,
                responsibleId: newUserId,
                responsible: targetUser ? { fullName: targetUser.fullName } : null,
                responsibleName: targetUser ? targetUser.fullName : null,
              }
            : null
        );
      }

      await Swal.fire({
        icon: "success",
        title: "เปลี่ยนช่างผู้รับผิดชอบสำเร็จ",
        text: targetUser
          ? `มอบหมายงานให้ "${targetUser.fullName}${targetUser.nickname ? ` (${targetUser.nickname})` : ""}" เรียบร้อยแล้ว`
          : "ยกเลิกการมอบหมายผู้รับผิดชอบเรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });

      setReassignModalLog(null);
    } catch (err: any) {
      console.error("Reassign error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถเปลี่ยนผู้รับผิดชอบได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Delete Call Log
  const handleDeleteLog = async (log: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const result = await Swal.fire({
      title: "ยืนยันการลบเคสแจ้งปัญหา?",
      text: `ต้องการลบเคสเลขที่ "${log.caseNumber}" (${log.companyName}) หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await deleteServiceCallLog(log.id);
      if (res.success) {
        setLogs((prev) => prev.filter((item) => item.id !== log.id));
        if (selectedLog?.id === log.id) setSelectedLog(null);

        // Update stats
        setStats((prev) => ({
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1),
        }));

        await Swal.fire({
          icon: "success",
          title: "ลบเคสสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
        });
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถลบเคสได้",
        confirmButtonColor: "#ff2301",
      });
    }
  };

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  // Count active cases per user for manager workload overview
  const userCaseCounts = useMemo(() => {
    const map: Record<string, { total: number; open: number }> = {};
    for (const log of logs) {
      if (log.responsibleId) {
        if (!map[log.responsibleId]) map[log.responsibleId] = { total: 0, open: 0 };
        map[log.responsibleId].total++;
        const meta = getCallStatusMeta(log.status);
        if (meta.type !== "closed") {
          map[log.responsibleId].open++;
        }
      }
    }
    return map;
  }, [logs]);

  // Derived KPI metrics
  const kpis = useMemo(() => {
    let unassigned = 0;
    let openCount = 0;
    let closedCount = 0;

    for (const log of logs) {
      const isUnassigned = !log.responsibleId && !log.responsibleName;
      if (isUnassigned) unassigned++;

      const meta = getCallStatusMeta(log.status);
      if (meta.type === "closed") {
        closedCount++;
      } else {
        openCount++;
      }
    }

    return {
      total: logs.length,
      open: openCount,
      unassigned,
      closed: closedCount,
    };
  }, [logs]);

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const term = search.trim().toLowerCase();

    return logs
      .filter((log) => {
        // Tab Filter
        if (activeTab === "OPEN") {
          const meta = getCallStatusMeta(log.status);
          if (meta.type === "closed") return false;
        } else if (activeTab === "UNASSIGNED") {
          const isUnassigned = !log.responsibleId && !log.responsibleName;
          if (!isUnassigned) return false;
        } else if (activeTab === "HARDWARE") {
          const meta = getCallStatusMeta(log.status);
          if (meta.type !== "hardware") return false;
        } else if (activeTab === "CLOSED") {
          const meta = getCallStatusMeta(log.status);
          if (meta.type !== "closed") return false;
        }

        // Responsible Filter
        if (filterResponsible === "UNASSIGNED") {
          const isUnassigned = !log.responsibleId && !log.responsibleName;
          if (!isUnassigned) return false;
        } else if (filterResponsible !== "ALL") {
          if (log.responsibleId !== filterResponsible) return false;
        }

        // Status Filter
        if (filterStatus !== "ALL" && log.status !== filterStatus) {
          return false;
        }

        // Date Filter
        if (dateFilter !== "all") {
          const logDate = log.receivedDate ? new Date(log.receivedDate) : new Date(log.createdAt);
          if (dateFilter === "today" && logDate < startOfToday) return false;
          if (dateFilter === "week" && logDate < sevenDaysAgo) return false;
          if (dateFilter === "month" && logDate < startOfMonth) return false;
          if (dateFilter === "year" && logDate < startOfYear) return false;
        }

        // Search Term Filter
        if (term) {
          const matchCase = log.caseNumber?.toLowerCase().includes(term);
          const matchCompany = log.companyName?.toLowerCase().includes(term);
          const matchContact = log.contactName?.toLowerCase().includes(term);
          const matchPhone = log.contactPhone?.toLowerCase().includes(term);
          const matchInverter = log.inverterModel?.toLowerCase().includes(term);
          const matchIssue = log.reportedIssue?.toLowerCase().includes(term);
          const matchSolution = log.recommendedSolution?.toLowerCase().includes(term);
          const matchResp =
            log.responsible?.fullName?.toLowerCase().includes(term) ||
            log.responsibleName?.toLowerCase().includes(term);
          const matchNotes = log.notes?.toLowerCase().includes(term);

          if (
            !matchCase &&
            !matchCompany &&
            !matchContact &&
            !matchPhone &&
            !matchInverter &&
            !matchIssue &&
            !matchSolution &&
            !matchResp &&
            !matchNotes
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          const da = new Date(a.receivedDate || a.createdAt).getTime();
          const db = new Date(b.receivedDate || b.createdAt).getTime();
          return db - da;
        }
        if (sortBy === "date_asc") {
          const da = new Date(a.receivedDate || a.createdAt).getTime();
          const db = new Date(b.receivedDate || b.createdAt).getTime();
          return da - db;
        }
        if (sortBy === "case_desc") {
          return (b.caseNumber || "").localeCompare(a.caseNumber || "");
        }
        if (sortBy === "company_asc") {
          return (a.companyName || "").localeCompare(b.companyName || "");
        }
        return 0;
      });
  }, [logs, activeTab, filterResponsible, filterStatus, dateFilter, search, sortBy]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลสำหรับส่งออก",
        text: "ไม่พบบันทึกเคสที่ตรงกับเงื่อนไขการค้นหา",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const exportRows = filteredLogs.map((log) => ({
      "เลขที่เคส (Case No)": log.caseNumber || "-",
      "เลขที่เดิม (Legacy No)": log.legacyNo || "-",
      "วันที่รับแจ้ง": log.receivedDate ? formatThaiDate(log.receivedDate) : "-",
      "บริษัท / ลูกค้า": log.companyName || "-",
      "ผู้ติดต่อ": log.contactName || "-",
      "เบอร์โทรศัพท์": log.contactPhone || "-",
      "รุ่นอินเวอร์เตอร์": log.inverterModel || "-",
      "อาการที่แจ้ง": log.reportedIssue || "-",
      "สาเหตุที่วิเคราะห์": log.analyzedCause || "-",
      "แนวทางแก้ไขที่แนะนำ": log.recommendedSolution || "-",
      "สถานะ": log.status || "-",
      "ผู้รับผิดชอบ":
        log.responsible?.fullName || log.responsibleName || "ยังไม่ระบุ",
      "ผู้บันทึก": log.creator?.fullName || "-",
      "บันทึกเพิ่มเติม": log.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ServiceCalls");
    XLSX.writeFile(
      workbook,
      `Service_Calls_MGR_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Reset filters
  const isFiltered =
    activeTab !== "ALL" ||
    search !== "" ||
    filterResponsible !== "ALL" ||
    filterStatus !== "ALL" ||
    dateFilter !== "all" ||
    sortBy !== "date_desc";

  const handleResetFilters = () => {
    setActiveTab("ALL");
    setSearch("");
    setFilterResponsible("ALL");
    setFilterStatus("ALL");
    setDateFilter("all");
    setSortBy("date_desc");
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header (Symmetrical Red/White/Gray) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />

        {/* Left: Branding & Portal Badge */}
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-gray-900/15 shrink-0 relative">
            <Headphones className="w-7 h-7 text-[#ff2301]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2301] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff2301]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                แดชบอร์ดจัดการแจ้งปัญหาลูกค้า
              </h1>
              <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/80">
                SERVICE MANAGER PORTAL
              </span>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
              <span>SERVICE OPERATIONS</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 font-normal">
                กำกับดูแล มอบหมายงานช่าง และติดตามสถานะการแก้ปัญหาลูกค้าทั้งหมด
              </span>
            </p>
          </div>
        </div>

        {/* Right: Symmetrical Action Controls (Unified h-10) */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap relative z-10 shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw
              className={`w-4 h-4 text-gray-500 ${
                isRefreshing ? "animate-spin text-[#ff2301]" : ""
              }`}
            />
            <span>รีเฟรช</span>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95"
            title="ส่งออกไฟล์ Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">ส่งออก</span>
            <span>Excel</span>
          </button>

          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 h-10">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all ${
                viewMode === "cards"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">การ์ด</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="มุมมองตาราง"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตาราง</span>
            </button>
          </div>

          {/* Import Excel Link */}
          <Link
            href="/service-mgr/calls/import"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95"
          >
            <Upload className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">นำเข้า</span>
            <span>Excel</span>
          </Link>

          {/* Create New Call */}
          <Link
            href="/service/calls/new"
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold transition-all shadow-md shadow-red-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>เปิดเคสใหม่</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Metrics Strip (Symmetrical 4-Card Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Cases */}
        <div
          onClick={() => setActiveTab("ALL")}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md ${
            activeTab === "ALL"
              ? "border-gray-900 ring-2 ring-gray-900/10"
              : "border-gray-200/90 hover:border-gray-300"
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-900" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                เคสทั้งหมด
              </p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">
                {kpis.total.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900 group-hover:scale-105 transition-transform">
              <FolderOpen className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>บันทึกทั้งหมดในระบบ</span>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Open / In Progress */}
        <div
          onClick={() => setActiveTab("OPEN")}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md ${
            activeTab === "OPEN"
              ? "border-[#ff2301] ring-2 ring-red-500/10"
              : "border-gray-200/90 hover:border-red-300"
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#ff2301]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
                กำลังดำเนินการ
              </p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">
                {kpis.open.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-[#ff2301] group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>รอนัดหมาย / กำลังเข้าตรวจ</span>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Unassigned Cases */}
        <div
          onClick={() => setActiveTab("UNASSIGNED")}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md ${
            activeTab === "UNASSIGNED"
              ? "border-amber-500 ring-2 ring-amber-500/10"
              : "border-gray-200/90 hover:border-amber-300"
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                ยังไม่มอบหมายช่าง
              </p>
              <h3 className="text-3xl font-black text-amber-700 mt-1">
                {kpis.unassigned.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <UserX className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>รอระบุช่างผู้รับผิดชอบ</span>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: Closed / Completed */}
        <div
          onClick={() => setActiveTab("CLOSED")}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md ${
            activeTab === "CLOSED"
              ? "border-emerald-600 ring-2 ring-emerald-600/10"
              : "border-gray-200/90 hover:border-emerald-300"
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                ปิดเคสแล้วเสร็จ
              </p>
              <h3 className="text-3xl font-black text-emerald-700 mt-1">
                {kpis.closed.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>ระบบปกติ / แก้ไขเสร็จสิ้น</span>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-5 space-y-4">
        {/* Status Tabs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-gray-100">
          {[
            { id: "ALL", label: "ทั้งหมด", count: kpis.total },
            { id: "OPEN", label: "กำลังดำเนินการ", count: kpis.open },
            { id: "UNASSIGNED", label: "รอระบุช่าง", count: kpis.unassigned },
            {
              id: "HARDWARE",
              label: "เครื่องเสีย/ส่งซ่อม",
              count: logs.filter((l) => getCallStatusMeta(l.status).type === "hardware").length,
            },
            { id: "CLOSED", label: "ปิดเคสแล้ว", count: kpis.closed },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive
                      ? "bg-[#ff2301] text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
          {/* Search Box (5 cols) */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่เคส, บริษัท, ผู้ติดต่อ, อาการ, รุ่น, ช่าง..."
              className="w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Responsible Technician Filter (3 cols) */}
          <div className="lg:col-span-3">
            <select
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            >
              <option value="ALL">ช่างผู้รับผิดชอบ: ทั้งหมด</option>
              <option value="UNASSIGNED">เฉพาะเคสที่ยังไม่ระบุช่าง</option>
              <optgroup label="รายชื่อช่าง/พนักงาน">
                {users.map((u) => {
                  const counts = userCaseCounts[u.id];
                  const label = `${u.fullName}${u.nickname ? ` (${u.nickname})` : ""}${
                    counts?.open ? ` [ค้าง ${counts.open} เคส]` : ""
                  }`;
                  return (
                    <option key={u.id} value={u.id}>
                      {label}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          {/* Specific Status Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            >
              <option value="ALL">สถานะ: ทั้งหมด</option>
              <option value="Received notification">Received notification</option>
              <option value="Waiting for on-site inspection">Waiting for inspection</option>
              <option value="System still has issues">System still has issues</option>
              <option value="Machine broken">Machine broken</option>
              <option value="Customer has not yet made changes">Customer has not changed</option>
              <option value="System running smoothly">System running smoothly</option>
            </select>
          </div>

          {/* Date Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            >
              <option value="all">ช่วงเวลา: ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="week">7 วันล่าสุด</option>
              <option value="month">เดือนนี้</option>
              <option value="year">ปีนี้</option>
            </select>
          </div>

          {/* Sort By (1 col) */}
          <div className="lg:col-span-1">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full h-10 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
              title="จัดเรียงลำดับ"
            >
              <option value="date_desc">ใหม่สุด</option>
              <option value="date_asc">เก่าสุด</option>
              <option value="case_desc">เลขที่</option>
              <option value="company_asc">บริษัท</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>
              พบทั้งหมด{" "}
              <strong className="text-gray-900 font-bold">
                {filteredLogs.length}
              </strong>{" "}
              เคส
            </span>
            {isFiltered && (
              <span className="text-gray-400">
                (กรองจากทั้งหมด {logs.length} เคส)
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#ff2301] hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content: Cards or Table ── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-200/90 text-center shadow-sm">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-[#ff2301] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-700">กำลังโหลดบันทึกแจ้งปัญหา...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-200/90 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">
            ไม่พบบันทึกแจ้งปัญหา
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
            ไม่พบเคสที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก
          </p>
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* ── Cards View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLogs.map((log) => {
            const statusMeta = getCallStatusMeta(log.status);
            const isUnassigned = !log.responsibleId && !log.responsibleName;
            const responsibleUser = users.find((u) => u.id === log.responsibleId);
            const displayName =
              responsibleUser?.fullName ||
              log.responsible?.fullName ||
              log.responsibleName;
            const displayNickname = responsibleUser?.nickname;

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="bg-white rounded-2xl border border-gray-200/90 hover:border-gray-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group relative"
              >
                {/* Top status accent */}
                <div
                  className={`h-1 w-full ${
                    statusMeta.type === "closed"
                      ? "bg-gray-900"
                      : statusMeta.type === "hardware"
                      ? "bg-[#ff2301]"
                      : isUnassigned
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />

                <div className="p-5 space-y-4">
                  {/* Card Header: Case No + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200/70 group-hover:border-gray-300">
                      {log.caseNumber}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border font-bold ${statusMeta.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Company & Contact */}
                  <div>
                    <h4 className="text-base font-black text-gray-900 line-clamp-1 group-hover:text-[#ff2301] transition-colors">
                      {log.companyName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {log.contactName}
                      </span>
                      {log.contactPhone && (
                        <>
                          <span className="text-gray-300">•</span>
                          <a
                            href={`tel:${log.contactPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-600 hover:text-[#ff2301] font-mono flex items-center gap-1 group/phone"
                          >
                            <Phone className="w-3 h-3 text-gray-400 group-hover/phone:text-[#ff2301]" />
                            <span>{log.contactPhone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(log.contactPhone, e)}
                            className="text-gray-400 hover:text-gray-600 ml-0.5"
                            title="คัดลอกเบอร์โทร"
                          >
                            {copiedPhone === log.contactPhone ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inverter & Date */}
                  <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <Cpu className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate max-w-[170px]" title={log.inverterModel}>
                        {log.inverterModel || "ไม่ระบุรุ่น"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{formatThaiDate(log.receivedDate)}</span>
                    </div>
                  </div>

                  {/* Reported Issue Preview */}
                  <div className="bg-red-50/40 rounded-xl p-3 border-l-3 border-[#ff2301] border-t border-r border-b border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      อาการที่แจ้ง:
                    </p>
                    <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed">
                      {log.reportedIssue}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Technician & Actions */}
                <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-3">
                  {/* Responsible Technician Info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isUnassigned
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-gray-900 text-white"
                      }`}
                    >
                      {isUnassigned ? (
                        <UserX className="w-3.5 h-3.5" />
                      ) : (
                        displayName?.slice(0, 1).toUpperCase() || "S"
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                        ผู้รับผิดชอบ
                      </p>
                      <p
                        className={`text-xs font-bold truncate mt-0.5 ${
                          isUnassigned ? "text-amber-700" : "text-gray-900"
                        }`}
                      >
                        {isUnassigned ? "ยังไม่ระบุช่าง" : displayName}
                        {displayNickname && (
                          <span className="text-gray-500 font-normal ml-1">
                            ({displayNickname})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reassign Button */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenReassign(log, e)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-bold text-gray-700 hover:text-gray-900 transition-all shadow-2xs active:scale-95 flex items-center gap-1"
                      title="เปลี่ยนช่างผู้รับผิดชอบ"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#ff2301]" />
                      <span className="hidden sm:inline">เปลี่ยนช่าง</span>
                    </button>

                    {/* View/Edit Link */}
                    <Link
                      href={`/service/calls/${log.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-white transition-all"
                      title="เปิดหน้าจัดการเต็มรูปแบบ"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    {/* Delete (if Manager/Admin) */}
                    {isManagerOrAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLog(log, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="ลบเคส"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/90 text-[11px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">เลขที่เคส / วันที่</th>
                  <th className="py-3.5 px-4">บริษัท / ผู้ติดต่อ</th>
                  <th className="py-3.5 px-4">รุ่นอินเวอร์เตอร์</th>
                  <th className="py-3.5 px-4">อาการที่แจ้ง</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4">ช่างผู้รับผิดชอบ</th>
                  <th className="py-3.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredLogs.map((log) => {
                  const statusMeta = getCallStatusMeta(log.status);
                  const isUnassigned = !log.responsibleId && !log.responsibleName;
                  const responsibleUser = users.find((u) => u.id === log.responsibleId);
                  const displayName =
                    responsibleUser?.fullName ||
                    log.responsible?.fullName ||
                    log.responsibleName;
                  const displayNickname = responsibleUser?.nickname;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-red-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Case No & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 group-hover:border-gray-300">
                          {log.caseNumber}
                        </span>
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatThaiDate(log.receivedDate)}</span>
                        </div>
                      </td>

                      {/* Company & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-gray-900 group-hover:text-[#ff2301] transition-colors">
                          {log.companyName}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{log.contactName}</span>
                          {log.contactPhone && (
                            <>
                              <span className="text-gray-300">•</span>
                              <a
                                href={`tel:${log.contactPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-600 hover:text-[#ff2301] font-mono inline-flex items-center gap-1"
                              >
                                <Phone className="w-2.5 h-2.5 text-gray-400" />
                                <span>{log.contactPhone}</span>
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Inverter Model */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 font-medium text-xs">
                          <Cpu className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.inverterModel || "—"}</span>
                        </div>
                      </td>

                      {/* Issue */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-gray-700 leading-relaxed text-xs">
                          {log.reportedIssue}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border font-bold ${statusMeta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Responsible */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isUnassigned
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-900 text-white"
                            }`}
                          >
                            {isUnassigned ? (
                              <UserX className="w-3 h-3" />
                            ) : (
                              displayName?.slice(0, 1).toUpperCase() || "S"
                            )}
                          </div>
                          <div className="text-xs">
                            <span
                              className={`font-bold ${
                                isUnassigned ? "text-amber-700" : "text-gray-900"
                              }`}
                            >
                              {isUnassigned ? "ยังไม่ระบุช่าง" : displayName}
                            </span>
                            {displayNickname && (
                              <span className="text-gray-500 font-normal ml-1">
                                ({displayNickname})
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenReassign(log, e)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition ml-1"
                            title="เปลี่ยนช่าง"
                          >
                            เปลี่ยน
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                            title="ดูรายละเอียดด่วน"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/service/calls/${log.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                            title="แก้ไขข้อมูลเคส"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>

                          {isManagerOrAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteLog(log, e)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="ลบเคส"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* ── Reassign Technician Modal ── */}
      {reassignModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-gray-200/90 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 relative bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-[#ff2301]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      มอบหมายช่างผู้รับผิดชอบ
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {reassignModalLog.caseNumber} • {reassignModalLog.companyName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReassignModalLog(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Technician Search Bar */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reassignSearch}
                  onChange={(e) => setReassignSearch(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อช่าง หรือชื่อเล่น..."
                  className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301]"
                />
              </div>
            </div>

            {/* Modal Technician List */}
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-2 flex-1">
              {/* Option to Unassign */}
              <button
                type="button"
                onClick={() => handleConfirmReassign(null)}
                disabled={isReassigning}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  !reassignModalLog.responsibleId
                    ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20"
                    : "bg-gray-50/60 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      ยังไม่ระบุช่าง (ปลดการมอบหมาย)
                    </p>
                    <p className="text-[11px] text-gray-500">
                      ย้ายเคสนี้กลับไปอยู่ในหมวดรอระบุผู้รับผิดชอบ
                    </p>
                  </div>
                </div>
                {!reassignModalLog.responsibleId && (
                  <Check className="w-4 h-4 text-amber-600" />
                )}
              </button>

              <div className="pt-2 pb-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-1">
                  รายชื่อทีมบริการ (เรียงตามตัวอักษร)
                </p>
              </div>

              {users
                .filter((u) => {
                  if (!reassignSearch.trim()) return true;
                  const term = reassignSearch.toLowerCase();
                  return (
                    u.fullName.toLowerCase().includes(term) ||
                    (u.nickname && u.nickname.toLowerCase().includes(term)) ||
                    u.role.toLowerCase().includes(term)
                  );
                })
                .map((user) => {
                  const isCurrent = reassignModalLog.responsibleId === user.id;
                  const counts = userCaseCounts[user.id];

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleConfirmReassign(user.id)}
                      disabled={isReassigning}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? "bg-red-50/60 border-[#ff2301] ring-2 ring-red-500/20"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isCurrent
                              ? "bg-[#ff2301] text-white"
                              : "bg-gray-900 text-white"
                          }`}
                        >
                          {user.fullName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-gray-900">
                              {user.fullName}
                            </span>
                            {user.nickname && (
                              <span className="text-xs font-semibold text-gray-500">
                                ({user.nickname})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            <span>{user.role}</span>
                            {counts?.open ? (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 font-medium">
                                  งานค้าง {counts.open} เคส
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <Check className="w-4 h-4 text-[#ff2301]" />
                      ) : (
                        <span className="text-xs text-gray-400 hover:text-gray-600">
                          เลือก
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setReassignModalLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Detail Modal ── */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-gray-200/90 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Top Accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />

            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gradient-to-b from-gray-50/60 to-white">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                    {selectedLog.caseNumber}
                  </span>
                  {(() => {
                    const meta = getCallStatusMeta(selectedLog.status);
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                        <span>{meta.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <h3 className="text-xl font-black text-gray-900 mt-2">
                  {selectedLog.companyName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>รับแจ้งเมื่อ {formatThaiDate(selectedLog.receivedDate)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-xs">
              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left: Customer & Contact */}
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    ข้อมูลลูกค้า &amp; สถานที่
                  </p>
                  <div>
                    <span className="text-gray-400">ผู้ติดต่อ:</span>
                    <p className="font-bold text-gray-800 text-sm mt-0.5">
                      {selectedLog.contactName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">เบอร์โทรศัพท์:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-mono font-bold text-gray-900 text-sm">
                        {selectedLog.contactPhone || "—"}
                      </p>
                      {selectedLog.contactPhone && (
                        <a
                          href={`tel:${selectedLog.contactPhone}`}
                          className="px-2 py-0.5 rounded bg-gray-200 hover:bg-[#ff2301] hover:text-white text-[11px] font-bold text-gray-700 transition"
                        >
                          โทร
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">รุ่นอินเวอร์เตอร์:</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {selectedLog.inverterModel || "—"}
                    </p>
                  </div>
                </div>

                {/* Right: Responsible & Followup */}
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    การมอบหมายงาน &amp; ติดตาม
                  </p>
                  <div>
                    <span className="text-gray-400">ช่างผู้รับผิดชอบ:</span>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-bold text-gray-900 text-sm">
                        {selectedLog.responsible?.fullName ||
                          selectedLog.responsibleName || (
                            <span className="text-amber-600 font-bold">
                              ยังไม่ระบุช่าง
                            </span>
                          )}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenReassign(selectedLog)}
                        className="px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100 text-[11px] font-bold text-gray-700 transition"
                      >
                        เปลี่ยน
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">ผู้สร้างเคส:</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {selectedLog.creator?.fullName || "—"}
                    </p>
                  </div>
                  {selectedLog.followUpDate && (
                    <div>
                      <span className="text-gray-400">กำหนดติดตามผล:</span>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {formatThaiDate(selectedLog.followUpDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reported Issue */}
              <div className="bg-red-50/40 rounded-2xl p-4 border-l-4 border-[#ff2301] border-t border-r border-b border-gray-200">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">
                  อาการที่แจ้ง (Reported Issue)
                </p>
                <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedLog.reportedIssue}
                </p>
              </div>

              {/* Analyzed Cause */}
              {selectedLog.analyzedCause && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    สาเหตุที่วิเคราะห์ (Analyzed Cause)
                  </p>
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedLog.analyzedCause}
                  </p>
                </div>
              )}

              {/* Recommended Solution */}
              {selectedLog.recommendedSolution && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    แนวทางแก้ไขที่แนะนำ (Recommended Solution)
                  </p>
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedLog.recommendedSolution}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedLog.notes && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    บันทึกเพิ่มเติม (Notes)
                  </p>
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedLog.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isManagerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(selectedLog)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ลบเคสนี้</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition"
                >
                  ปิด
                </button>

                <Link
                  href={`/service/calls/${selectedLog.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold transition shadow-md shadow-red-500/20"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>เปิดหน้าแก้ไขเต็มรูปแบบ</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
