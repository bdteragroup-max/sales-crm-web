"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Wrench,
  ClipboardList,
  CheckCircle2,
  Clock,
  CalendarPlus,
  CalendarDays,
  Calendar,
  AlertTriangle,
  Search,
  X,
  RotateCcw,
  MapPin,
  Phone,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Briefcase,
  Building2,
  User,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  Eye,
  FileText,
  Navigation,
  Check,
  XCircle,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import { updateInstallationOrder } from "@/app/actions/installationOrders";

const STATUS_OPTIONS = [
  "เปิด Job - ยังไม่เริ่มติดตั้ง",
  "กำลังติดตั้ง",
  "มีปัญหา",
  "ปิด Job - ติดตั้งเสร็จสิ้น",
  "ยกเลิก - PO",
  "ปิด Job - ตรวจเช็คเสร็จสิ้น",
  "กำลังตรวจเช็ค",
  "เปิด Job - ยังไม่เริ่มตรวจเช็ค",
];

const MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const WEEK_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function MyTasksClient({
  orders,
  currentUser,
}: {
  orders: any[];
  currentUser: any;
}) {
  const router = useRouter();

  // Active view & filter states
  const [viewMode, setViewMode] = useState<"cards" | "table" | "calendar">("cards");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "ISSUES" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month" | "unscheduled">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Date Formatting Helpers
  const formatThaiDate = (dateVal?: string | Date | null, includeTime = true) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    const dateStr = d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!includeTime) return dateStr;
    const timeStr = d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} เวลา ${timeStr} น.`;
  };

  const formatShortDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
  };

  // Status helper
  const getStatusMeta = (status: string) => {
    switch (status) {
      case "กำลังติดตั้ง":
      case "กำลังตรวจเช็ค":
        return {
          label: status,
          badgeClass: "bg-red-50 text-[#ff2301] border-red-200/80 ring-2 ring-red-500/10 font-bold",
          dotClass: "bg-[#ff2301] animate-ping",
          dotColor: "bg-[#ff2301]",
          icon: Wrench,
        };
      case "มีปัญหา":
        return {
          label: status,
          badgeClass: "bg-red-600 text-white border-red-700 shadow-sm shadow-red-600/30 font-black",
          dotClass: "bg-white",
          dotColor: "bg-red-600",
          icon: AlertTriangle,
        };
      case "ปิด Job - ติดตั้งเสร็จสิ้น":
      case "ปิด Job - ตรวจเช็คเสร็จสิ้น":
      case "Completed":
      case "เสร็จสิ้น":
        return {
          label: status,
          badgeClass: "bg-gray-900 text-white border-gray-800 font-bold",
          dotClass: "bg-emerald-400",
          dotColor: "bg-gray-900",
          icon: CheckCircle2,
        };
      case "ยกเลิก - PO":
        return {
          label: status,
          badgeClass: "bg-gray-100 text-gray-400 border-gray-200 line-through font-medium",
          dotClass: "bg-gray-400",
          dotColor: "bg-gray-400",
          icon: XCircle,
        };
      case "เปิด Job - ยังไม่เริ่มติดตั้ง":
      case "เปิด Job - ยังไม่เริ่มตรวจเช็ค":
      case "รอดำเนินการ":
      default:
        return {
          label: status || "รอดำเนินการ",
          badgeClass: "bg-gray-100 text-gray-700 border-gray-200/90 font-semibold",
          dotClass: "bg-gray-400",
          dotColor: "bg-gray-500",
          icon: Clock,
        };
    }
  };

  const getInitials = (name?: string, nickname?: string | null) => {
    if (nickname && nickname.trim()) return nickname.trim().slice(0, 2);
    const clean = (name || "")
      .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|ดร\.)\s*/, "")
      .trim();
    return clean.slice(0, 2) || (name || "ช่าง").slice(0, 2);
  };

  // Status Change Handler with SweetAlert2
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (orderId.startsWith("mock-")) return;

    const result = await Swal.fire({
      title: "ยืนยันการเปลี่ยนสถานะ?",
      text: `ต้องการปรับสถานะงานเป็น "${newStatus}" หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันการเปลี่ยนแปลง",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsUpdating(orderId);
    try {
      await updateInstallationOrder(orderId, { status: newStatus });
      await Swal.fire({
        icon: "success",
        title: "อัปเดตสถานะสำเร็จ",
        text: `ปรับสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`,
        timer: 1100,
        showConfirmButton: false,
      });
      router.refresh();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error?.message || "ไม่สามารถอัปเดตสถานะงานได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 450);
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => {
      const s = o.status || "";
      return (
        s.includes("ปิด Job") ||
        s === "Completed" ||
        s === "เสร็จสิ้น"
      );
    }).length;

    const inProgress = orders.filter((o) => {
      const s = o.status || "";
      return s.includes("กำลังติดตั้ง") || s.includes("กำลังตรวจเช็ค");
    }).length;

    const issues = orders.filter((o) => o.status === "มีปัญหา").length;

    const pending = total - completed - inProgress - issues;

    const unscheduled = orders.filter((o) => !o.plannedStartDate).length;

    return { total, completed, inProgress, issues, pending, unscheduled };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Week boundaries (Sunday to Saturday)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);

    // Month boundaries
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return orders.filter((order) => {
      const s = order.status || "";
      const isDone = s.includes("ปิด Job") || s === "Completed" || s === "เสร็จสิ้น";
      const isInProg = s.includes("กำลังติดตั้ง") || s.includes("กำลังตรวจเช็ค");
      const isIssue = s === "มีปัญหา";

      // 1. Tab match
      if (activeTab === "PENDING" && (isDone || isInProg || isIssue)) return false;
      if (activeTab === "IN_PROGRESS" && !isInProg) return false;
      if (activeTab === "ISSUES" && !isIssue) return false;
      if (activeTab === "COMPLETED" && !isDone) return false;

      // 2. Specific Status filter dropdown
      if (statusFilter !== "all" && s !== statusFilter) return false;

      // 3. Date range filter
      if (dateFilter === "unscheduled" && order.plannedStartDate) return false;
      if (dateFilter !== "all" && dateFilter !== "unscheduled") {
        if (!order.plannedStartDate) return false;
        const pDate = new Date(order.plannedStartDate);
        if (dateFilter === "today") {
          if (pDate < startOfToday || pDate > endOfToday) return false;
        } else if (dateFilter === "this_week") {
          if (pDate < startOfWeek || pDate > endOfWeek) return false;
        } else if (dateFilter === "this_month") {
          if (pDate < startOfMonth || pDate > endOfMonth) return false;
        }
      }

      // 4. Search Query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = order.installationNo?.toLowerCase().includes(q);
        const matchComp = order.company?.toLowerCase().includes(q);
        const matchJob = order.jobName?.toLowerCase().includes(q);
        const matchCust = order.customer?.toLowerCase().includes(q);
        const matchLoc = (order.workLocation || order.siteAddress || order.address)?.toLowerCase().includes(q);
        const matchNote = order.technicianNote?.toLowerCase().includes(q);
        if (!matchNo && !matchComp && !matchJob && !matchCust && !matchLoc && !matchNote) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, statusFilter, dateFilter, searchQuery]);

  // Calendar calculations
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCalendarMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(year, month + 1, 1));
  };

  const todayMonth = () => {
    setCalendarMonth(new Date());
  };

  const getOrdersForDay = (day: number) => {
    return orders.filter((o) => {
      const targetDate = o.plannedStartDate || o.installationDate;
      if (!targetDate) return false;
      const d = new Date(targetDate);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      {/* ── Page Header (Symmetrical Red/White/Gray) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative subtle gradient background */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />

        {/* Left: Branding & Technician Identity */}
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-gray-900/15 shrink-0 relative">
            <Wrench className="w-7 h-7 text-[#ff2301]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2301] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff2301]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                งานของฉัน
              </h1>
              <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/80">
                FIELD TECHNICIAN WORKBENCH
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-gray-500">
              <span className="font-medium">
                รายการงานติดตั้งและตรวจเช็คที่ได้รับมอบหมาย
              </span>
              <span className="text-gray-300">•</span>
              <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-xl text-gray-800 font-semibold">
                <div className="w-5 h-5 rounded-md bg-[#ff2301] text-white flex items-center justify-center text-[10px] font-bold">
                  {getInitials(currentUser?.fullName, currentUser?.nickname)}
                </div>
                <span>
                  {currentUser?.fullName || "ช่างผู้รับผิดชอบ"}
                  {currentUser?.nickname ? ` (${currentUser.nickname})` : ""}
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  ({currentUser?.role || "ช่างบริการ"})
                </span>
              </div>
            </div>
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
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all ${
                viewMode === "calendar"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="มุมมองปฏิทิน"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ปฏิทิน</span>
            </button>
          </div>

          {/* Quick link to installation dashboard */}
          <Link
            href="/service/installation"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <span>แดชบอร์ดงานติดตั้ง</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Strip (Symmetrical 4 Columns) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: All Tasks */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("ALL");
            if (viewMode === "calendar") setViewMode("cards");
          }}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "ALL" && viewMode !== "calendar"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                งานทั้งหมด
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {kpis.total}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-xl">
            งานทั้งหมด
          </span>
        </button>

        {/* KPI 2: Pending / Need Schedule */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("PENDING");
            if (viewMode === "calendar") setViewMode("cards");
          }}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "PENDING" && viewMode !== "calendar"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-100 text-gray-800 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                รอดำเนินการ
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {kpis.pending}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl">
              รอเริ่มงาน
            </span>
            {kpis.unscheduled > 0 && (
              <span className="text-[10px] text-[#ff2301] font-bold mt-1">
                รอระบุแผน {kpis.unscheduled}
              </span>
            )}
          </div>
        </button>

        {/* KPI 3: In Progress */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("IN_PROGRESS");
            if (viewMode === "calendar") setViewMode("cards");
          }}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "IN_PROGRESS" && viewMode !== "calendar"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-red-50 text-[#ff2301] rounded-2xl flex items-center justify-center shrink-0 relative">
              <Wrench className="w-6 h-6" />
              {kpis.inProgress > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ff2301] animate-ping" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                กำลังดำเนินการ
              </p>
              <p className="text-2xl font-black text-[#ff2301] mt-0.5">
                {kpis.inProgress}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#ff2301] bg-red-50 px-2.5 py-1 rounded-xl border border-red-100">
            ติดตั้ง/ตรวจเช็ค
          </span>
        </button>

        {/* KPI 4: Completed */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("COMPLETED");
            if (viewMode === "calendar") setViewMode("cards");
          }}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "COMPLETED" && viewMode !== "calendar"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                ปิด Job แล้วเสร็จ
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {kpis.completed}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-white bg-gray-900 px-2.5 py-1 rounded-xl">
            เสร็จสมบูรณ์
          </span>
        </button>
      </div>

      {/* ── Main Content Workspace Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="px-6 pt-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => {
                setActiveTab("ALL");
                if (viewMode === "calendar") setViewMode("cards");
              }}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "ALL" && viewMode !== "calendar"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>ทั้งหมด</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "ALL" && viewMode !== "calendar"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.total}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("PENDING");
                if (viewMode === "calendar") setViewMode("cards");
              }}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "PENDING" && viewMode !== "calendar"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>รอดำเนินการ</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "PENDING" && viewMode !== "calendar"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.pending}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("IN_PROGRESS");
                if (viewMode === "calendar") setViewMode("cards");
              }}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "IN_PROGRESS" && viewMode !== "calendar"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>กำลังทำ</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "IN_PROGRESS" && viewMode !== "calendar"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.inProgress}
              </span>
            </button>

            {kpis.issues > 0 && (
              <button
                onClick={() => {
                  setActiveTab("ISSUES");
                  if (viewMode === "calendar") setViewMode("cards");
                }}
                className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "ISSUES" && viewMode !== "calendar"
                    ? "border-[#ff2301] text-[#ff2301]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-600">มีปัญหา</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                  {kpis.issues}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab("COMPLETED");
                if (viewMode === "calendar") setViewMode("cards");
              }}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "COMPLETED" && viewMode !== "calendar"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ปิด Job แล้ว</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "COMPLETED" && viewMode !== "calendar"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.completed}
              </span>
            </button>

            <button
              onClick={() => setViewMode("calendar")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                viewMode === "calendar"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>ปฏิทินงาน</span>
            </button>
          </div>

          {/* Quick Search on top right */}
          <div className="pb-3.5 md:pb-3 w-full md:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่, บริษัท, ชื่องาน, สถานที่..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Filters Bar (When not in calendar view) */}
        {viewMode !== "calendar" && (
          <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff2301]" />
                <span>ตัวกรอง:</span>
              </span>

              {/* Status Specific Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                >
                  <option value="all">สถานะงานทั้งหมด</option>
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                >
                  <option value="all">ทุกช่วงเวลา</option>
                  <option value="today">วันนี้</option>
                  <option value="this_week">สัปดาห์นี้</option>
                  <option value="this_month">เดือนนี้</option>
                  <option value="unscheduled">ยังไม่มีแผนวันเริ่มงาน</option>
                </select>
              </div>

              {(statusFilter !== "all" || dateFilter !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setDateFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-xs font-bold text-[#ff2301] hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-gray-500 font-medium">
              แสดง <span className="font-bold text-gray-900">{filteredOrders.length}</span> จากทั้งหมด{" "}
              <span className="font-bold text-gray-900">{orders.length}</span> รายการ
            </div>
          </div>
        )}

        {/* ── View 1: Cards View ── */}
        {viewMode === "cards" && (
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50/70 rounded-3xl border border-gray-200 border-dashed">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-200 text-gray-400">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  ไม่พบรายการงานที่ตรงกับเงื่อนไข
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูงานที่ได้รับมอบหมายทั้งหมด
                </p>
                {(searchQuery || statusFilter !== "all" || dateFilter !== "all" || activeTab !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setDateFilter("all");
                      setActiveTab("ALL");
                    }}
                    className="mt-4 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 rounded-xl shadow-sm transition-all"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map((order: any) => {
                  const statusMeta = getStatusMeta(order.status);
                  const StatusIcon = statusMeta.icon;
                  const isUpdatingThis = isUpdating === order.id;

                  return (
                    <div
                      key={order.id}
                      className="group bg-white rounded-2xl border border-gray-200 hover:border-red-300 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 relative"
                    >
                      {/* Top Red Gradient Line on Hover */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff2301] to-[#e01f01] opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="p-5 sm:p-6 space-y-4">
                        {/* Header Row: Status Switcher & Installation Number */}
                        <div className="flex items-start justify-between gap-2">
                          {/* Status Dropdown Pill */}
                          <div className="relative inline-flex items-center">
                            <select
                              value={order.status || "เปิด Job - ยังไม่เริ่มติดตั้ง"}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              disabled={isUpdatingThis || order.id.startsWith("mock-")}
                              className={`pl-3 pr-7 py-1.5 rounded-full text-[11px] border cursor-pointer appearance-none outline-none transition-all hover:shadow-sm ${
                                statusMeta.badgeClass
                              } ${isUpdatingThis ? "opacity-50" : ""}`}
                              style={{ textAlignLast: "left" }}
                            >
                              {!STATUS_OPTIONS.includes(order.status) && (
                                <option value={order.status} className="bg-white text-gray-900">
                                  {order.status}
                                </option>
                              )}
                              {STATUS_OPTIONS.map((opt) => (
                                <option
                                  key={opt}
                                  value={opt}
                                  className="bg-white text-gray-900 font-normal"
                                >
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                              {isUpdatingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-current opacity-70" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-current opacity-70" />
                              )}
                            </div>
                          </div>

                          {/* Order Number Badge */}
                          <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200/80 shrink-0">
                            {order.installationNo}
                          </span>
                        </div>

                        {/* Company & Job Details */}
                        <div>
                          <h3 className="text-base font-black text-gray-900 leading-snug group-hover:text-[#ff2301] transition-colors line-clamp-2">
                            {order.company || "ไม่ระบุบริษัท"}
                          </h3>
                          <p className="text-xs text-gray-600 line-clamp-2 font-medium mt-1">
                            {order.jobName || "งานติดตั้ง/ตรวจเช็ค"}
                          </p>

                          {/* Customer Contact */}
                          {(order.customer || order.senderPhone) && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                              {order.customer && (
                                <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span>{order.customer}</span>
                                </span>
                              )}
                              {order.senderPhone && (
                                <a
                                  href={`tel:${order.senderPhone}`}
                                  className="inline-flex items-center gap-1 text-[#ff2301] hover:underline font-bold"
                                  title="โทรหาลูกค้า"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{order.senderPhone}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Scheduled Plan Box */}
                        {order.plannedStartDate ? (
                          <div className="bg-gray-50/70 border border-gray-200/70 p-3.5 rounded-2xl space-y-2.5 group-hover:bg-red-50/20 transition-colors">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 font-bold text-gray-800">
                                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0 border border-red-100">
                                  <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                    วันเริ่มงานตามแผน
                                  </p>
                                  <p className="text-xs font-bold text-gray-900">
                                    {formatThaiDate(order.plannedStartDate)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {order.plannedEndDate && (
                              <div className="text-[11px] text-gray-500 pl-9 flex items-center gap-1.5">
                                <span>ถึง:</span>
                                <span className="font-semibold text-gray-700">
                                  {formatThaiDate(order.plannedEndDate)}
                                </span>
                              </div>
                            )}

                            {/* Location / Site */}
                            {(order.workLocation || order.siteAddress || order.address) && (
                              <div className="flex items-start gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">
                                  {order.workLocation || order.siteAddress || order.address}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-red-50/60 border border-red-100 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-xs text-[#ff2301] font-bold">
                              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#ff2301] shadow-sm shrink-0 border border-red-200">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="leading-tight">ยังไม่ได้ระบุวันเริ่มงาน</p>
                                <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                                  โปรดกดปุ่มกำหนดแผนงานด้านล่าง
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Technician Note Preview if present */}
                        {order.technicianNote && (
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <p className="line-clamp-2 italic">"{order.technicianNote}"</p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-4 pt-0 mt-auto border-t border-gray-100/80 bg-gray-50/30 flex items-center gap-2">
                        {/* Primary Button: Edit or Add Schedule */}
                        {order.jobId ? (
                          <Link
                            href={`/jobs/${order.jobId}/installation-schedule`}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 ${
                              order.plannedStartDate
                                ? "bg-gray-900 hover:bg-[#ff2301] text-white"
                                : "bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white shadow-red-500/20"
                            }`}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>
                              {order.plannedStartDate ? "แก้ไขแผนงาน" : "กำหนดแผนงาน"}
                            </span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl bg-gray-900 text-white hover:bg-[#ff2301] transition-all"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>ดูแผนงาน</span>
                          </button>
                        )}

                        {/* View Details Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                          title="ดูรายละเอียดเพิ่มเติม"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>

                        {/* Manage Job Link if jobId exists */}
                        {order.jobId && (
                          <Link
                            href={`/jobs/${order.jobId}/manage-installation-order`}
                            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:border-gray-400 hover:text-[#ff2301] transition-all shadow-sm"
                            title="จัดการใบงานติดตั้ง (Manage Job)"
                          >
                            <FileCheck className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── View 2: Table View ── */}
        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4">เลขที่ติดตั้ง</th>
                  <th className="py-3.5 px-4">บริษัท / ลูกค้า</th>
                  <th className="py-3.5 px-4">ชื่องาน / รายละเอียด</th>
                  <th className="py-3.5 px-4">กำหนดเริ่มงาน</th>
                  <th className="py-3.5 px-4">สถานที่</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order: any) => {
                    const statusMeta = getStatusMeta(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={order.status || "เปิด Job - ยังไม่เริ่มติดตั้ง"}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={isUpdating === order.id}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${statusMeta.badgeClass}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-white text-gray-900 font-normal">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Installation No */}
                        <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {order.installationNo}
                        </td>

                        {/* Company & Customer */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <p className="font-bold text-gray-900 truncate">
                            {order.company || "ไม่ระบุบริษัท"}
                          </p>
                          {order.customer && (
                            <p className="text-[11px] text-gray-500 truncate">
                              {order.customer}
                            </p>
                          )}
                        </td>

                        {/* Job Name */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <p className="font-medium text-gray-800 line-clamp-1">
                            {order.jobName || "งานติดตั้ง"}
                          </p>
                        </td>

                        {/* Planned Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {order.plannedStartDate ? (
                            <span className="font-bold text-gray-900">
                              {formatShortDate(order.plannedStartDate)}{" "}
                              <span className="text-[10px] text-gray-500 font-normal">
                                {new Date(order.plannedStartDate).toLocaleTimeString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })} น.
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#ff2301] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                              ยังไม่มีแผน
                            </span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4 max-w-[180px] truncate text-gray-500">
                          {order.workLocation || order.siteAddress || order.address || "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {order.jobId && (
                              <Link
                                href={`/jobs/${order.jobId}/installation-schedule`}
                                className="p-1.5 text-gray-600 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                                title="แก้ไขแผนงาน"
                              >
                                <CalendarPlus className="w-4 h-4" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.jobId && (
                              <Link
                                href={`/jobs/${order.jobId}/manage-installation-order`}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="จัดการใบงาน"
                              >
                                <FileCheck className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── View 3: Calendar View ── */}
        {viewMode === "calendar" && (
          <div className="p-6 space-y-6">
            {/* Calendar Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    {MONTH_NAMES[month]} {year + 543}
                  </h2>
                  <p className="text-xs text-gray-400">
                    ปฏิทินงานติดตั้งและตรวจเช็คประจำเดือน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={todayMonth}
                  className="px-3 h-9 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                >
                  เดือนนี้
                </button>
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 7-Days Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
              {/* Day headers */}
              {WEEK_DAYS.map((wd, i) => (
                <div
                  key={wd}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl ${
                    i === 0 || i === 6 ? "bg-red-50/60 text-[#ff2301]" : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {wd}
                </div>
              ))}

              {/* Blank offset days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`blank-${i}`}
                  className="min-h-[90px] sm:min-h-[110px] p-2 bg-gray-50/30 rounded-2xl border border-dashed border-gray-100 opacity-40"
                />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayOrders = getOrdersForDay(day);
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;

                return (
                  <div
                    key={`day-${day}`}
                    className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                      isToday
                        ? "bg-red-50/30 border-[#ff2301] shadow-sm"
                        : dayOrders.length > 0
                        ? "bg-white border-gray-200 hover:border-red-300 shadow-sm"
                        : "bg-white border-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isToday
                            ? "bg-[#ff2301] text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {day}
                      </span>
                      {dayOrders.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded-md">
                          {dayOrders.length}
                        </span>
                      )}
                    </div>

                    {/* Task Pills on this day */}
                    <div className="mt-1.5 space-y-1 overflow-y-auto max-h-20 scrollbar-none">
                      {dayOrders.map((o: any) => {
                        const statusMeta = getStatusMeta(o.status);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="w-full text-left p-1 rounded-lg bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors text-[10px] block truncate"
                            title={`${o.installationNo} - ${o.company}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dotColor}`} />
                              <span className="font-bold text-gray-900 truncate">
                                {o.company}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Task Details Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-md">
                  <Wrench className="w-5 h-5 text-[#ff2301]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-gray-900">
                      รายละเอียดงานติดตั้ง / ตรวจเช็ค
                    </h2>
                    <span className="text-[11px] font-mono font-bold text-[#ff2301] bg-red-100/70 px-2 py-0.5 rounded-md">
                      {selectedOrder.installationNo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedOrder.company}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
              {/* Status & Timing Highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    สถานะปัจจุบัน
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        getStatusMeta(selectedOrder.status).badgeClass
                      }`}
                    >
                      {selectedOrder.status || "รอดำเนินการ"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    กำหนดเวลาเริ่มงาน
                  </span>
                  <p className="text-xs font-bold text-gray-900 mt-1">
                    {formatThaiDate(selectedOrder.plannedStartDate)}
                  </p>
                  {selectedOrder.plannedEndDate && (
                    <p className="text-[11px] text-gray-500">
                      ถึง: {formatThaiDate(selectedOrder.plannedEndDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Company & Customer Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#ff2301]" />
                  <span>ข้อมูลบริษัทและผู้ติดต่อ</span>
                </h4>
                <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">ชื่อบริษัท:</span>
                    <strong className="text-gray-900">{selectedOrder.company || "—"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">ชื่องาน:</span>
                    <strong className="text-gray-900">{selectedOrder.jobName || "—"}</strong>
                  </div>
                  {selectedOrder.customer && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">ผู้ติดต่อ:</span>
                      <strong className="text-gray-900">
                        {selectedOrder.customer}{" "}
                        {selectedOrder.customerPosition ? `(${selectedOrder.customerPosition})` : ""}
                      </strong>
                    </div>
                  )}
                  {selectedOrder.senderPhone && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">เบอร์โทรศัพท์:</span>
                      <a
                        href={`tel:${selectedOrder.senderPhone}`}
                        className="font-bold text-[#ff2301] hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedOrder.senderPhone}</span>
                      </a>
                    </div>
                  )}
                  {selectedOrder.quotationNo && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">เลขที่ใบเสนอราคา (Quotation):</span>
                      <span className="font-mono text-gray-700">{selectedOrder.quotationNo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Site Location & Google Maps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#ff2301]" />
                  <span>สถานที่ปฏิบัติงาน (Work Site)</span>
                </h4>
                <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-gray-700 font-medium">
                    {selectedOrder.workLocation ||
                      selectedOrder.siteAddress ||
                      selectedOrder.address ||
                      "ยังไม่ได้ระบุสถานที่"}
                  </p>
                  {(selectedOrder.workLocation || selectedOrder.siteAddress || selectedOrder.address) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedOrder.workLocation || selectedOrder.siteAddress || selectedOrder.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-red-300 text-xs font-bold text-gray-700 hover:text-[#ff2301] rounded-xl transition-all shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#ff2301]" />
                      <span>เปิดนำทางใน Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>

              {/* Notes & Instructions */}
              {(selectedOrder.note || selectedOrder.technicianNote || selectedOrder.workPlan) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ff2301]" />
                    <span>บันทึกและแผนงาน</span>
                  </h4>
                  <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-2">
                    {selectedOrder.workPlan && (
                      <div>
                        <span className="font-bold text-gray-700">แผนการทำงาน:</span>
                        <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{selectedOrder.workPlan}</p>
                      </div>
                    )}
                    {selectedOrder.technicianNote && (
                      <div>
                        <span className="font-bold text-gray-700">บันทึกช่าง:</span>
                        <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{selectedOrder.technicianNote}</p>
                      </div>
                    )}
                    {selectedOrder.note && (
                      <div>
                        <span className="font-bold text-gray-700">หมายเหตุทั่วไป:</span>
                        <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{selectedOrder.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 h-10 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
              >
                ปิดหน้าต่าง
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.jobId && (
                  <Link
                    href={`/jobs/${selectedOrder.jobId}/manage-installation-order`}
                    className="px-4 h-10 text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:border-gray-400 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>จัดการใบงาน</span>
                  </Link>
                )}

                {selectedOrder.jobId && (
                  <Link
                    href={`/jobs/${selectedOrder.jobId}/installation-schedule`}
                    className="px-5 h-10 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>แก้ไขแผนงาน</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
