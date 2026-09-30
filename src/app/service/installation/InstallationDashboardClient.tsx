"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import {
  Wrench,
  ClipboardList,
  Building2,
  Users,
  FileSignature,
  CheckCircle2,
  Clock,
  CalendarPlus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Search,
  X,
  RotateCcw,
  ShieldCheck,
  ArrowUpRight,
  Filter,
  Calendar,
  ChevronDown,
  Check,
  Loader2,
  Phone,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { updateInstallationOrder } from "@/app/actions/installationOrders";
import SearchableSelect from "@/app/components/SearchableSelect";

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

export default function InstallationDashboardClient({
  orders,
  users,
  currentUser,
}: {
  orders: any[];
  users?: any[];
  currentUser: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilterDropdown, setStatusFilterDropdown] = useState<string>("all");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab("all");
    }
  }, [searchParams]);

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

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

  // KPIs
  const isCompleted = (status: string) =>
    status === "Completed" ||
    status === "เสร็จสิ้น" ||
    status === "ปิด Job - ติดตั้งเสร็จสิ้น" ||
    status === "ปิด Job - ตรวจเช็คเสร็จสิ้น";

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => isCompleted(o.status)).length;
  const inProgressOrders = totalOrders - completedOrders;

  const outstandingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        !isCompleted(o.status) &&
        o.status !== "ยกเลิก - PO" &&
        (!o.technician || !o.plannedStartDate)
    );
  }, [orders]);

  // Exclude Return Repair Jobs for summary lists
  const validListOrders = useMemo(() => {
    return orders.filter((o) => !o.jobName?.startsWith("[ส่งคืนงานซ่อม]"));
  }, [orders]);

  // Tab 2: By Company Data
  const companyData = useMemo(() => {
    const companyMap = validListOrders.reduce((acc, order) => {
      const comp = order.company || "ไม่ระบุบริษัท";
      if (!acc[comp]) acc[comp] = [];
      acc[comp].push(order);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.keys(companyMap)
      .map((key) => ({
        company: key,
        count: companyMap[key].length,
        orders: companyMap[key],
      }))
      .sort((a, b) => b.count - a.count);
  }, [validListOrders]);

  // Tab 3: Technician Data
  const techData = useMemo(() => {
    const techMap = validListOrders.reduce((acc, order) => {
      const tech = order.technician || "ยังไม่ระบุช่าง";
      if (!acc[tech]) acc[tech] = [];
      acc[tech].push(order);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.keys(techMap)
      .map((key) => ({
        technician: key,
        count: techMap[key].length,
        orders: techMap[key],
      }))
      .sort((a, b) => b.count - a.count);
  }, [validListOrders]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Technician change handler
  const handleTechnicianChange = async (
    orderId: string,
    newTechnician: string
  ) => {
    if (orderId.startsWith("mock-")) {
      Swal.fire({
        icon: "info",
        title: "กรุณาสร้างใบงานติดตั้งก่อน",
        text: "คลิกที่ '-รอสร้างใบงาน-' เพื่อเปิดใบงานติดตั้งก่อนมอบหมายช่าง",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsUpdating(orderId);
    try {
      await updateInstallationOrder(orderId, {
        technician: newTechnician,
        sender: currentUser?.fullName,
      });

      await Swal.fire({
        icon: "success",
        title: "มอบหมายช่างสำเร็จ",
        text: `มอบหมายงานให้ ${newTechnician || "ไม่ระบุ"} เรียบร้อยแล้ว`,
        timer: 1200,
        showConfirmButton: false,
      });

      router.refresh();
    } catch (error: any) {
      console.error("Failed to update technician:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "ไม่สามารถอัปเดตช่างผู้รับผิดชอบได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ปิด Job - ติดตั้งเสร็จสิ้น":
      case "ปิด Job - ตรวจเช็คเสร็จสิ้น":
      case "Completed":
      case "เสร็จสิ้น":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: status,
        };
      case "กำลังติดตั้ง":
      case "กำลังตรวจเช็ค":
        return {
          bg: "bg-red-50 text-[#ff2301] border-red-200 font-bold",
          dot: "bg-[#ff2301]",
          label: status,
        };
      case "มีปัญหา":
      case "ยกเลิก - PO":
        return {
          bg: "bg-red-100 text-red-800 border-red-300 font-bold",
          dot: "bg-red-600",
          label: status,
        };
      case "เปิด Job - ยังไม่เริ่มติดตั้ง":
      case "เปิด Job - ยังไม่เริ่มตรวจเช็ค":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          label: status,
        };
      case "รอดำเนินการ":
      default:
        return {
          bg: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
          label: status || "รอดำเนินการ",
        };
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (orderId.startsWith("mock-")) return;
    setIsUpdating(orderId);
    try {
      await updateInstallationOrder(orderId, { status: newStatus });
      await Swal.fire({
        icon: "success",
        title: "อัปเดตสถานะสำเร็จ",
        text: `เปลี่ยนสถานะเป็น ${newStatus} แล้ว`,
        timer: 1200,
        showConfirmButton: false,
      });
      router.refresh();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "ไม่สามารถอัปเดตสถานะได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const isOwnerOrAdmin = (order: any) => {
    const roleStr = (currentUser?.role || "").toLowerCase();
    return (
      order.technician === currentUser?.fullName ||
      roleStr === "admin" ||
      roleStr === "ผู้ดูแลระบบ" ||
      roleStr.includes("service engineer mgr")
    );
  };

  const canViewSchedule = () => {
    const roleStr = (currentUser?.role || "").toLowerCase();
    return (
      roleStr === "admin" ||
      roleStr === "ผู้ดูแลระบบ" ||
      roleStr.includes("service") ||
      roleStr.includes("บริการ") ||
      roleStr.includes("ซ่อม") ||
      roleStr.includes("ช่าง") ||
      roleStr === "ผู้จัดการ" ||
      roleStr.includes("manager") ||
      roleStr.includes("ผู้จัดการ") ||
      roleStr.includes("sales") ||
      roleStr.includes("marketing") ||
      roleStr.includes("ตัวแทนฝ่ายขาย")
    );
  };

  const canEditInstallation = () => {
    const roleStr = (currentUser?.role || "").toLowerCase();
    return (
      roleStr === "admin" ||
      roleStr === "ผู้ดูแลระบบ" ||
      roleStr.includes("service") ||
      roleStr.includes("บริการ") ||
      roleStr.includes("ซ่อม") ||
      roleStr.includes("ช่าง")
    );
  };

  // Filtered orders for Tab 1
  const filteredOrders = useMemo(() => {
    const urlStatusFilter = searchParams.get("status") || "all";
    const currentStatus =
      statusFilterDropdown !== "all" ? statusFilterDropdown : urlStatusFilter;

    return orders.filter((o) => {
      // Exclude return repair jobs from main list
      if (o.jobName?.startsWith("[ส่งคืนงานซ่อม]")) return false;

      // Status filters
      if (currentStatus === "completed" && !isCompleted(o.status)) return false;
      if (currentStatus === "in-progress" && isCompleted(o.status)) return false;
      if (currentStatus === "outstanding" && !outstandingOrders.includes(o))
        return false;
      if (
        currentStatus !== "all" &&
        currentStatus !== "completed" &&
        currentStatus !== "in-progress" &&
        currentStatus !== "outstanding" &&
        o.status !== currentStatus
      ) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = o.installationNo?.toLowerCase().includes(q);
        const matchCompany = o.company?.toLowerCase().includes(q);
        const matchJob = o.jobName?.toLowerCase().includes(q);
        const matchTech = o.technician?.toLowerCase().includes(q);
        const matchSeller = o.job?.sellerName?.toLowerCase().includes(q);
        const matchSender = o.sender?.toLowerCase().includes(q);
        const matchJobNo = o.job?.jobNumber?.toLowerCase().includes(q);
        return (
          matchNo ||
          matchCompany ||
          matchJob ||
          matchTech ||
          matchSeller ||
          matchSender ||
          matchJobNo
        );
      }

      return true;
    });
  }, [
    orders,
    searchParams,
    statusFilterDropdown,
    searchQuery,
    outstandingOrders,
  ]);

  return (
    <div className="space-y-8">
      {/* ── Top Hero Header Card (Red, White & Gray Symmetrical Modern Design) ── */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          {/* Left: Branded Squircle Icon & Titles */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
                <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  แดชบอร์ดงานติดตั้งและตรวจเช็ค
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                  FIELD INSTALLATION &amp; SERVICE
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                <span>INSTALLATION MANAGEMENT</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-normal">
                  ติดตามสถานะ วางแผนงาน และมอบหมายงานช่างติดตั้งหน้างาน
                </span>
              </p>
            </div>
          </div>

          {/* Right: Symmetrical Action Buttons (Unified h-10 Heights) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap w-full lg:w-auto justify-start lg:justify-end overflow-x-auto pb-1 lg:pb-0">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap disabled:opacity-50"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RotateCcw
                className={`w-4 h-4 text-gray-500 ${
                  isRefreshing ? "animate-spin text-[#ff2301]" : ""
                }`}
              />
              <span>รีเฟรช</span>
            </button>

            {/* Quick Switch to Schedule Calendar */}
            {canViewSchedule() && (
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`inline-flex items-center gap-2 px-4 h-10 rounded-xl border text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap ${
                  activeTab === "schedule"
                    ? "border-[#ff2301] bg-red-50 text-[#ff2301]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                }`}
              >
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <span>ตารางคิวงาน</span>
              </button>
            )}

            {/* Link to Service Calls */}
            <Link
              href="/service/calls"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              <span>ใบแจ้งซ่อม/บริการ</span>
            </Link>
          </div>
        </div>

        {/* Mini Meta Info Strip */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
              <span>
                งานทั้งหมดในระบบ:{" "}
                <strong className="text-gray-900">{totalOrders} รายการ</strong>
              </span>
            </div>
            <span className="text-gray-300">•</span>
            <span>
              งานที่รอจัดสรรช่าง/วัน:{" "}
              <strong
                className={
                  outstandingOrders.length > 0
                    ? "text-[#ff2301]"
                    : "text-emerald-600"
                }
              >
                {outstandingOrders.length} รายการ
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>
              เดือนปัจจุบัน:{" "}
              <strong className="text-gray-900">
                {MONTH_NAMES[new Date().getMonth()]}{" "}
                {new Date().getFullYear() + 543}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Strip (Symmetrical 4-Card Responsive Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: All Orders */}
        <Link
          href="?tab=all&status=all"
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            searchParams.get("status") === "all" || !searchParams.get("status")
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-100 text-gray-800 rounded-2xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                งานติดตั้งทั้งหมด
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {totalOrders}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-xl">
            ทั้งหมด
          </span>
        </Link>

        {/* KPI 2: In Progress */}
        <Link
          href="?tab=all&status=in-progress"
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            searchParams.get("status") === "in-progress"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-red-50 text-[#ff2301] rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                กำลังดำเนินการ
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {inProgressOrders}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#ff2301] bg-red-50 px-2.5 py-1 rounded-xl">
            กำลังทำ
          </span>
        </Link>

        {/* KPI 3: Completed */}
        <Link
          href="?tab=all&status=completed"
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            searchParams.get("status") === "completed"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                เสร็จสิ้นแล้ว
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {completedOrders}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
            เสร็จสิ้น
          </span>
        </Link>

        {/* KPI 4: Outstanding */}
        <Link
          href="?tab=all&status=outstanding"
          className={`p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            searchParams.get("status") === "outstanding"
              ? "ring-2 ring-red-500/20"
              : ""
          } ${
            outstandingOrders.length > 0
              ? "bg-red-50/70 border-red-200 shadow-sm shadow-red-100/50"
              : "bg-emerald-50/60 border-emerald-200 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                outstandingOrders.length > 0
                  ? "bg-red-100 text-[#ff2301]"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {outstandingOrders.length > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  outstandingOrders.length > 0
                    ? "text-[#ff2301]"
                    : "text-emerald-700"
                }`}
              >
                งานค้าง (รอช่าง/วันที่)
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  outstandingOrders.length > 0
                    ? "text-[#ff2301]"
                    : "text-emerald-700"
                }`}
              >
                {outstandingOrders.length}
              </p>
            </div>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${
              outstandingOrders.length > 0
                ? "bg-red-100 text-[#ff2301]"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {outstandingOrders.length > 0 ? "ต้องจัดการ" : "ครบถ้วน"}
          </span>
        </Link>
      </div>

      {/* ── Main Workspace Card with Search, Tabs & Content ── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="px-6 pt-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "all"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>ประวัติงานติดตั้งทั้งหมด</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "all"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("company")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "company"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>แยกตามลูกค้า/บริษัท</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "company"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {companyData.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("technician")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "technician"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>รายงานตามช่าง</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "technician"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {techData.length}
              </span>
            </button>

            {canViewSchedule() && (
              <button
                onClick={() => setActiveTab("schedule")}
                className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "schedule"
                    ? "border-[#ff2301] text-[#ff2301]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>ตารางคิวงานประจำเดือน</span>
              </button>
            )}
          </div>

          {/* Quick Search on Top (for Tab 1) */}
          {activeTab === "all" && (
            <div className="flex items-center gap-2.5 pb-2 md:pb-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขที่, ลูกค้า, ช่าง, เซลล์..."
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilterDropdown}
                  onChange={(e) => setStatusFilterDropdown(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] cursor-pointer"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="in-progress">กำลังดำเนินการ</option>
                  <option value="completed">เสร็จสิ้นแล้ว</option>
                  <option value="outstanding">งานค้าง (รอช่าง/วัน)</option>
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-6 bg-gray-50/40 min-h-[460px]">
          {/* ── TAB 1: ALL INSTALLATIONS ── */}
          {activeTab === "all" && (
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-5 py-3.5 whitespace-nowrap w-28">
                        หมายเลขติดตั้ง
                      </th>
                      <th className="px-4 py-3.5 whitespace-nowrap w-28">
                        วันที่
                      </th>
                      <th className="px-4 py-3.5 min-w-[170px]">บริษัทลูกค้า</th>
                      <th className="px-4 py-3.5 min-w-[220px]">
                        ชื่องาน / อุปกรณ์
                      </th>
                      <th className="px-4 py-3.5 whitespace-nowrap w-[220px]">
                        วิศวกร / ช่าง
                      </th>
                      <th className="px-4 py-3.5 whitespace-nowrap w-36">
                        เซลล์รับผิดชอบ
                      </th>
                      <th className="px-4 py-3.5 whitespace-nowrap w-32">
                        ผู้บันทึก
                      </th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap w-36">
                        แผนงาน
                      </th>
                      <th className="px-5 py-3.5 text-right whitespace-nowrap w-44">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                              <ClipboardList className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-gray-700">
                              ไม่พบข้อมูลงานติดตั้ง
                            </p>
                            <p className="text-xs text-gray-400">
                              ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองสถานะ
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const statusBadge = getStatusBadge(order.status);
                        const isMock = order.id.startsWith("mock-");

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-red-50/20 transition-colors group"
                          >
                            {/* Installation No */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <Link
                                href={`/jobs/${order.jobId}/manage-installation-order`}
                                className="text-xs font-mono font-bold text-[#ff2301] hover:text-[#d81900] hover:underline flex items-center gap-1"
                              >
                                <span>{order.installationNo}</span>
                                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                              {order.installationDate
                                ? new Date(
                                    order.installationDate
                                  ).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "-"}
                            </td>

                            {/* Company */}
                            <td className="px-4 py-3.5">
                              <div
                                className="font-bold text-gray-900 text-xs line-clamp-1"
                                title={order.company}
                              >
                                {order.company}
                              </div>
                              {order.job?.jobNumber && (
                                <div className="text-[11px] text-gray-400 font-mono">
                                  {order.job.jobNumber}
                                </div>
                              )}
                            </td>

                            {/* Job Name */}
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/jobs/${order.jobId}`}
                                className="line-clamp-2 text-xs text-gray-700 hover:text-[#ff2301] transition-colors font-medium flex items-center gap-1"
                                title={`ดูรายละเอียด Job: ${order.jobName}`}
                              >
                                <span>{order.jobName}</span>
                              </Link>
                            </td>

                            {/* Technician Select */}
                            <td className="px-4 py-3.5 min-w-[220px] relative">
                              {canEditInstallation() ? (
                                <SearchableSelect
                                  value={order.technician || ""}
                                  onChange={(val) =>
                                    handleTechnicianChange(order.id, val)
                                  }
                                  disabled={isUpdating === order.id || isMock}
                                  options={
                                    users?.map((u) => ({
                                      label: `${u.fullName}`,
                                      value: u.fullName,
                                    })) || []
                                  }
                                  placeholder="- เลือกช่างผู้รับผิดชอบ -"
                                  className="text-xs"
                                  inputClassName="rounded-xl border-gray-200 py-1.5 text-xs font-medium"
                                />
                              ) : (
                                <div className="text-gray-900 text-xs font-bold flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-gray-400" />
                                  <span>
                                    {order.technician || (
                                      <span className="text-gray-400 italic font-normal">
                                        ยังไม่ระบุช่าง
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Seller Name */}
                            <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                              {order.job?.sellerName || "-"}
                            </td>

                            {/* Recorder / Sender */}
                            <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                              {order.sender || "-"}
                            </td>

                            {/* Schedule / Plan */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              {!isMock && (
                                <div className="flex flex-col items-center gap-1">
                                  {isOwnerOrAdmin(order) ? (
                                    <Link
                                      href={`/jobs/${order.jobId}/installation-schedule`}
                                      className={`px-3 py-1 flex items-center gap-1.5 rounded-full text-[11px] font-bold transition-all shadow-sm active:scale-95 ${
                                        order.plannedStartDate
                                          ? "bg-red-50 text-[#ff2301] border border-red-200 hover:bg-red-100"
                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                                      }`}
                                    >
                                      {order.plannedStartDate ? (
                                        <>
                                          <FileSignature className="w-3 h-3" />
                                          <span>แก้ไขแผน</span>
                                        </>
                                      ) : (
                                        <>
                                          <CalendarPlus className="w-3 h-3" />
                                          <span>เพิ่มแผนงาน</span>
                                        </>
                                      )}
                                    </Link>
                                  ) : order.plannedStartDate ? (
                                    <Link
                                      href={`/jobs/${order.jobId}/installation-plan`}
                                      className="px-3 py-1 flex items-center gap-1.5 rounded-full text-[11px] font-bold transition-all bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm"
                                    >
                                      <ClipboardList className="w-3 h-3" />
                                      <span>ดูแผนงาน</span>
                                    </Link>
                                  ) : (
                                    <span className="px-3 py-1 flex items-center gap-1.5 rounded-full text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-200/60 cursor-not-allowed">
                                      <CalendarPlus className="w-3 h-3" />
                                      <span>รอเพิ่มแผน</span>
                                    </span>
                                  )}
                                  {order.plannedStartDate && (
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {new Date(
                                        order.plannedStartDate
                                      ).toLocaleDateString("th-TH", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              {isMock ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                  <span>รอดำเนินการ</span>
                                </span>
                              ) : canEditInstallation() ? (
                                <div className="inline-flex relative">
                                  <select
                                    value={
                                      STATUS_OPTIONS.includes(order.status)
                                        ? order.status
                                        : "เปิด Job - ยังไม่เริ่มติดตั้ง"
                                    }
                                    onChange={(e) =>
                                      handleStatusChange(order.id, e.target.value)
                                    }
                                    disabled={isUpdating === order.id}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-full outline-none cursor-pointer border shadow-sm transition-all ${statusBadge.bg}`}
                                    style={{ textAlignLast: "center" }}
                                  >
                                    {!STATUS_OPTIONS.includes(order.status) && (
                                      <option
                                        value={order.status}
                                        className="bg-white text-gray-900"
                                      >
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
                                </div>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${statusBadge.bg}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}
                                  />
                                  <span>{order.status || "รอดำเนินการ"}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  แสดงผล{" "}
                  <strong className="text-gray-900">
                    {filteredOrders.length}
                  </strong>{" "}
                  จากทั้งหมด {orders.length} รายการ
                </span>
                <span className="font-mono text-gray-400">
                  INSTALLATION RECORDS
                </span>
              </div>
            </div>
          )}

          {/* ── TAB 2: BY COMPANY / CUSTOMER ── */}
          {activeTab === "company" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companyData.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-200">
                  ยังไม่มีข้อมูลแยกตามบริษัท
                </div>
              ) : (
                companyData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-2">
                            {item.company}
                          </h3>
                        </div>
                        <span className="bg-red-50 text-[#ff2301] border border-red-200/80 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                          {item.count} งาน
                        </span>
                      </div>

                      <div className="space-y-2.5 pt-3 border-t border-gray-100">
                        {item.orders.slice(0, 3).map((o: any, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-gray-50/80 hover:bg-red-50/30 border border-gray-100 transition-colors"
                          >
                            <Link
                              href={`/jobs/${o.jobId}/manage-installation-order`}
                              className="text-xs font-mono font-bold text-[#ff2301] hover:underline block"
                            >
                              {o.installationNo}
                            </Link>
                            <span className="text-gray-600 text-xs truncate block mt-0.5">
                              {o.jobName || "-"}
                            </span>
                            <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                              <span>ช่าง: {o.technician || "ยังไม่ระบุ"}</span>
                              <span className="font-medium text-gray-600">
                                {o.status || "รอดำเนินการ"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {item.count > 3 && (
                      <div className="text-xs text-gray-400 pt-3 text-center border-t border-gray-50 mt-3 font-medium">
                        และอีก {item.count - 3} รายการ...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB 3: BY TECHNICIAN ── */}
          {activeTab === "technician" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {techData.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-200">
                  ยังไม่มีข้อมูลแยกตามช่าง
                </div>
              ) : (
                techData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-red-500/20 shrink-0">
                            {item.technician.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                              {item.technician}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-medium">
                              ช่างเทคนิคผู้รับผิดชอบ
                            </p>
                          </div>
                        </div>
                        <span className="bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                          {item.count} งาน
                        </span>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-100">
                        {item.orders.slice(0, 4).map((o: any, i: number) => {
                          const badge = getStatusBadge(o.status);
                          return (
                            <div
                              key={i}
                              className="flex justify-between items-center text-xs p-2 rounded-xl bg-gray-50 border border-gray-100"
                            >
                              <div className="min-w-0 mr-2">
                                <p className="font-bold text-gray-900 truncate text-[11px]">
                                  {o.company}
                                </p>
                                <p className="text-gray-400 truncate text-[10px] font-mono">
                                  {o.installationNo}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold shrink-0 text-[10px] border ${badge.bg}`}
                              >
                                {o.status || "รอดำเนินการ"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {item.count > 4 && (
                      <div className="text-xs text-gray-400 pt-3 text-center border-t border-gray-50 mt-3 font-medium">
                        ดูเพิ่มเติมอีก {item.count - 4} งาน...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB 4: MONTHLY SCHEDULE CALENDAR ── */}
          {activeTab === "schedule" && canViewSchedule() && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200/90 p-6 overflow-x-auto min-w-[850px]">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      {MONTH_NAMES[month]} {year + 543}
                    </h2>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Monthly Schedule &amp; Field Dispatch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentMonth(new Date(year, month - 1))}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-4 py-2 text-xs font-bold bg-[#ff2301] text-white rounded-xl hover:bg-[#d81900] transition-colors shadow-sm shadow-red-500/25"
                  >
                    เดือนปัจจุบัน
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(year, month + 1))}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"].map(
                  (dayName, i) => (
                    <div
                      key={dayName}
                      className={`p-3 text-center text-xs font-bold uppercase tracking-wider ${
                        i === 0
                          ? "bg-red-50 text-[#ff2301]"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {dayName}
                    </div>
                  )
                )}

                {/* Empty cells before month start */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="bg-white min-h-[140px] opacity-40 border-t border-gray-100"
                  />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayOrders = getOrdersForDay(day);
                  const isToday =
                    new Date().getDate() === day &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;

                  return (
                    <div
                      key={day}
                      className={`bg-white min-h-[140px] p-2 flex flex-col gap-1 transition-colors hover:bg-red-50/20 group border-t border-gray-100`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                            isToday
                              ? "bg-[#ff2301] text-white shadow-md shadow-red-500/30 scale-110"
                              : "text-gray-600 group-hover:text-gray-900"
                          }`}
                        >
                          {day}
                        </span>
                        {dayOrders.length > 0 && (
                          <span className="text-[10px] font-bold text-[#ff2301] bg-red-50 border border-red-200/80 px-1.5 py-0.5 rounded-full">
                            {dayOrders.length} งาน
                          </span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[120px] custom-scrollbar pb-1">
                        {dayOrders.map((order) => {
                          const isDone = isCompleted(order.status);
                          return (
                            <Link
                              href={`/jobs/${order.jobId}/manage-installation-order`}
                              key={order.id}
                              className={`block p-2 rounded-xl border text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                                isDone
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                                  : "bg-red-50/50 border-red-200/80 text-gray-900"
                              }`}
                            >
                              <div className="text-[11px] font-bold truncate">
                                {order.company}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                <Users className="w-2.5 h-2.5 shrink-0" />
                                <span>{order.technician || "ยังไม่ระบุช่าง"}</span>
                              </div>
                              <div className="mt-1">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 inline-block rounded-md border ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                      : "bg-red-100 text-[#ff2301] border-red-200"
                                  }`}
                                >
                                  {order.status || "รอดำเนินการ"}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Empty cells after month end */}
                {Array.from({
                  length: (7 - ((firstDay + daysInMonth) % 7)) % 7,
                }).map((_, i) => (
                  <div
                    key={`empty-end-${i}`}
                    className="bg-white min-h-[140px] border-t border-gray-100 opacity-40"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
