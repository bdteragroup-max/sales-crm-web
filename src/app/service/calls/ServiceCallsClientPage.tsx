"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Download,
  RotateCcw,
  LayoutGrid,
  List,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  ExternalLink,
  Building2,
  User,
  Cpu,
  Calendar,
  Phone,
  Wrench,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  FileSignature,
  SlidersHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import ServiceCallSignatureModal from "./ServiceCallSignatureModal";
import MobileSafeSelect from "@/app/components/MobileSafeSelect";
import { deleteServiceCallLog } from "@/app/actions/service-calls";

interface ServiceCallsClientPageProps {
  initialLogs?: any[];
  users?: any[];
  userRole?: string;
}

// ── Status Configurations & Helpers ──
export const CALL_STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; group: "pending" | "in_progress" | "completed" }
> = {
  "Received notification": {
    label: "เปิดเคส (รับแจ้งแล้ว)",
    badge: "bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100/70",
    dot: "bg-[#ff2301]",
    group: "pending",
  },
  "Waiting for on-site inspection": {
    label: "รอนัดหมายเข้าตรวจ",
    badge: "bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100/70",
    dot: "bg-[#ff2301]",
    group: "pending",
  },
  "System still has issues": {
    label: "กำลังดำเนินการ (ยังมีปัญหา)",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-600",
    group: "in_progress",
  },
  "Machine broken": {
    label: "ส่งซ่อม/เปลี่ยน (เครื่องเสีย)",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-700",
    group: "in_progress",
  },
  "Motor problem": {
    label: "ปัญหามอเตอร์",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-600",
    group: "in_progress",
  },
  "Low water level in the well": {
    label: "ปัญหาสภาพแวดล้อม (น้ำน้อย)",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-500",
    group: "in_progress",
  },
  "Customer has not yet made changes": {
    label: "รอติดตาม (ลูกค้ายังไม่แก้ไข)",
    badge: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-500",
    group: "in_progress",
  },
  "System running smoothly": {
    label: "ปิดเคสแล้ว (ระบบปกติ)",
    badge: "bg-gray-900 text-white border-gray-800 hover:bg-black",
    dot: "bg-white",
    group: "completed",
  },
};

export function getCallStatusMeta(statusStr: string | null | undefined) {
  if (!statusStr) {
    return {
      label: "เปิดเคส",
      badge: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-[#ff2301]",
      group: "pending" as const,
    };
  }
  if (CALL_STATUS_CONFIG[statusStr]) {
    return CALL_STATUS_CONFIG[statusStr];
  }

  const isPending =
    statusStr === "Received notification" ||
    statusStr === "Waiting for on-site inspection" ||
    statusStr.includes("เปิดเคส") ||
    statusStr.includes("รอนัดหมาย");

  const isCompleted =
    statusStr.includes("smoothly") ||
    statusStr.includes("ปิดเคส") ||
    statusStr.includes("ปกติ") ||
    statusStr.includes("Customer has not yet made changes") ||
    statusStr.includes("ระบบเดินได้เรียบร้อย") ||
    statusStr.includes("ลูกค้ายังไม่แก้ไข");

  if (isPending) {
    return {
      label: statusStr,
      badge: "bg-red-50 text-red-700 border-red-200/80",
      dot: "bg-[#ff2301]",
      group: "pending" as const,
    };
  }
  if (isCompleted) {
    return {
      label: statusStr,
      badge: "bg-gray-900 text-white border-gray-800",
      dot: "bg-white",
      group: "completed" as const,
    };
  }
  return {
    label: statusStr,
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-600",
    group: "in_progress" as const,
  };
}

export default function ServiceCallsClientPage({
  initialLogs = [],
  users = [],
  userRole = "",
}: ServiceCallsClientPageProps) {
  const router = useRouter();

  // ── Local State ──
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [datePeriod, setDatePeriod] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Sorting
  const [sortField, setSortField] = useState<"date" | "caseNumber" | "customer" | "model" | "status">("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // UI state
  const [copiedCaseNo, setCopiedCaseNo] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [signingCall, setSigningCall] = useState<any | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync props
  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  // ── Thai Date Helpers ──
  const formatThaiDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  const getRelativeDays = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "วันนี้";
    if (diffDays === 1) return "เมื่อวาน";
    return `${diffDays} วันก่อน`;
  };

  // ── KPI Counts ──
  const totalCount = logs.length;
  const pendingCount = useMemo(() => {
    return logs.filter((log) => getCallStatusMeta(log.status).group === "pending").length;
  }, [logs]);

  const inProgressCount = useMemo(() => {
    return logs.filter((log) => getCallStatusMeta(log.status).group === "in_progress").length;
  }, [logs]);

  const completedCount = useMemo(() => {
    return logs.filter((log) => getCallStatusMeta(log.status).group === "completed").length;
  }, [logs]);

  // Unique Inverter Models for dropdown
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.inverterModel && l.inverterModel.trim()) {
        set.add(l.inverterModel.trim());
      }
    });
    return Array.from(set).sort();
  }, [logs]);

  // ── Filtered & Sorted Logs ──
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const term = searchTerm.trim().toLowerCase();
        const caseNo = (log.caseNumber || "").toLowerCase();
        const company = (log.companyName || "").toLowerCase();
        const contact = (log.contactName || "").toLowerCase();
        const phone = (log.contactPhone || "").toLowerCase();
        const model = (log.inverterModel || "").toLowerCase();
        const issue = (log.reportedIssue || "").toLowerCase();
        const tech = (
          log.responsible?.fullName ||
          log.responsibleName ||
          ""
        ).toLowerCase();
        const creator = (log.creator?.fullName || "").toLowerCase();
        const creatorRole = (log.creator?.role || "").toLowerCase();

        const matchesSearch =
          !term ||
          caseNo.includes(term) ||
          company.includes(term) ||
          contact.includes(term) ||
          phone.includes(term) ||
          model.includes(term) ||
          issue.includes(term) ||
          tech.includes(term) ||
          creator.includes(term) ||
          creatorRole.includes(term);

        if (!matchesSearch) return false;

        const statusMeta = getCallStatusMeta(log.status);

        // Status Tab Filter
        if (activeTab === "PENDING" && statusMeta.group !== "pending") return false;
        if (activeTab === "IN_PROGRESS" && statusMeta.group !== "in_progress") return false;
        if (activeTab === "COMPLETED" && statusMeta.group !== "completed") return false;

        // Specific Status Dropdown Filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "Pending" && statusMeta.group !== "pending") return false;
          else if (statusFilter === "In Progress" && statusMeta.group !== "in_progress") return false;
          else if (statusFilter === "Completed" && statusMeta.group !== "completed") return false;
          else if (
            statusFilter !== "Pending" &&
            statusFilter !== "In Progress" &&
            statusFilter !== "Completed" &&
            log.status !== statusFilter
          ) {
            return false;
          }
        }

        // Technician Filter
        if (technicianFilter) {
          const techName = log.responsible?.fullName || log.responsibleName || "";
          if (technicianFilter === "__unassigned__") {
            if (techName.trim() !== "") return false;
          } else if (techName !== technicianFilter) {
            return false;
          }
        }

        // Model Filter
        if (modelFilter && log.inverterModel !== modelFilter) {
          return false;
        }

        // Date Period Filter
        if (datePeriod !== "ALL") {
          const dateVal = log.receivedDate || log.createdAt;
          if (!dateVal) return false;
          const recordDate = new Date(dateVal);
          const now = new Date();
          if (isNaN(recordDate.getTime())) return false;

          if (datePeriod === "TODAY") {
            if (
              recordDate.getDate() !== now.getDate() ||
              recordDate.getMonth() !== now.getMonth() ||
              recordDate.getFullYear() !== now.getFullYear()
            )
              return false;
          } else if (datePeriod === "WEEK") {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            if (recordDate < sevenDaysAgo) return false;
          } else if (datePeriod === "MONTH") {
            if (
              recordDate.getMonth() !== now.getMonth() ||
              recordDate.getFullYear() !== now.getFullYear()
            )
              return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === "date") {
          const dateA = new Date(a.receivedDate || a.createdAt || 0).getTime();
          const dateB = new Date(b.receivedDate || b.createdAt || 0).getTime();
          comparison = dateA - dateB;
        } else if (sortField === "caseNumber") {
          comparison = (a.caseNumber || "").localeCompare(b.caseNumber || "");
        } else if (sortField === "customer") {
          comparison = (a.companyName || "").localeCompare(b.companyName || "");
        } else if (sortField === "model") {
          comparison = (a.inverterModel || "").localeCompare(b.inverterModel || "");
        } else if (sortField === "status") {
          comparison = (a.status || "").localeCompare(b.status || "");
        }
        return sortAsc ? comparison : -comparison;
      });
  }, [
    logs,
    searchTerm,
    activeTab,
    statusFilter,
    technicianFilter,
    modelFilter,
    datePeriod,
    sortField,
    sortAsc,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, statusFilter, technicianFilter, modelFilter, datePeriod, pageSize]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (activeTab !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (technicianFilter) count++;
    if (modelFilter) count++;
    if (datePeriod !== "ALL") count++;
    return count;
  }, [searchTerm, activeTab, statusFilter, technicianFilter, modelFilter, datePeriod]);

  const secondaryFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count++;
    if (technicianFilter) count++;
    if (modelFilter) count++;
    if (datePeriod !== "ALL") count++;
    return count;
  }, [statusFilter, technicianFilter, modelFilter, datePeriod]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setActiveTab("ALL");
    setStatusFilter("ALL");
    setTechnicianFilter("");
    setModelFilter("");
    setDatePeriod("ALL");
  };

  const handleCopyCaseNo = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedCaseNo(text);
    setTimeout(() => setCopiedCaseNo(null), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleDeleteCall = async (log: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!log?.id || deletingId) return;

    const linkedInfo: string[] = [];
    if (log.linkedQuotationNo) linkedInfo.push(`ใบเสนอราคา ${log.linkedQuotationNo}`);
    if (log.linkedDeliveryNo) linkedInfo.push(`ใบส่งมอบ ${log.linkedDeliveryNo}`);

    const confirm = await Swal.fire({
      title: "ยืนยันการลบเคสแจ้งปัญหา?",
      html: `<div style="font-size:14px;color:#374151;line-height:1.6">ต้องการลบเคสเลขที่ <b style="color:#ff2301">${
        log.caseNumber || "-"
      }</b><br/>ลูกค้า: <b>${log.companyName || "-"}</b> ใช่หรือไม่?${
        linkedInfo.length > 0
          ? `<br/><span style="font-size:12px;color:#6b7280">(หมายเหตุ: เอกสารที่สร้างไปแล้ว ได้แก่ ${linkedInfo.join(
              ", "
            )} จะยังคงอยู่ในระบบ)</span>`
          : ""
      }<br/><span style="font-size:12px;color:#dc2626">การลบนี้ไม่สามารถย้อนกลับได้</span></div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setDeletingId(log.id);
    try {
      const res = await deleteServiceCallLog(log.id);
      if (res?.success) {
        setLogs((prev) => prev.filter((item) => item.id !== log.id));
        if (selectedCall?.id === log.id) {
          setSelectedCall(null);
        }
        router.refresh();
        Swal.fire({
          icon: "success",
          title: "ลบข้อมูลสำเร็จ",
          text: `ลบเคส ${log.caseNumber || ""} เรียบร้อยแล้ว`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถลบข้อมูลได้",
        text: err?.message || "เกิดข้อผิดพลาดในการลบเคส กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: "date" | "caseNumber" | "customer" | "model" | "status") => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      Swal.fire({
        title: "ไม่มีข้อมูลสำหรับส่งออก",
        text: "กรุณาปรับตัวกรองเพื่อค้นหาข้อมูลก่อนส่งออก",
        icon: "info",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const exportData = filteredLogs.map((log, index) => {
      const statusMeta = getCallStatusMeta(log.status);
      return {
        "ลำดับ": index + 1,
        "Case No.": log.caseNumber || "—",
        "วันที่รับแจ้ง": formatThaiDate(log.receivedDate),
        "ลูกค้า / บริษัท": log.companyName || "—",
        "ชื่อผู้ติดต่อ": log.contactName || "—",
        "เบอร์โทรติดต่อ": log.contactPhone || "—",
        "โมเดล Inverter": log.inverterModel || "—",
        "ปัญหาที่แจ้ง": log.reportedIssue || "—",
        "สถานะ": statusMeta.label,
        "ผู้รับผิดชอบ": log.responsible?.fullName || log.responsibleName || "ยังไม่ระบุ",
        "ผู้รับเรื่อง": log.creator?.fullName || "—",
        "สาเหตุที่วิเคราะห์": log.analyzedCause || "—",
        "แนวทางแก้ไข": log.recommendedSolution || "—",
        "วันที่นัดติดตาม": log.followUpDate ? formatThaiDate(log.followUpDate) : "—",
        "หมายเหตุ": log.notes || "—",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Service_Call_Logs");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Service_Calls_${dateStr}.xlsx`);
  };

  const canImport =
    userRole === "Service Engineer MGR" ||
    userRole === "Service Engineer MGR." ||
    userRole === "SUPER_ADMIN";

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-12 space-y-4 sm:space-y-6">
      {/* ───────────────────────────────────────────────────────────
          1. TOP HERO HEADER (Symmetrical & Modern Red/White/Gray)
      ─────────────────────────────────────────────────────────── */}
      <header className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 transition-all">
        {/* Left: Branded Icon & Titles */}
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
          <div className="relative group shrink-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#c71a00] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
              <PhoneCall className="w-5 h-5 sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff2301] animate-ping" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                บันทึกแจ้งปัญหาลูกค้า
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-red-50 text-[#ff2301] border border-red-200/80">
                {logs.length} เคส
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5 sm:mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>SERVICE CALL LOG</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span className="text-gray-400 font-normal hidden sm:inline">ระบบบันทึกและติดตามการแก้ปัญหา Inverter</span>
            </p>
          </div>
        </div>

        {/* Right: Symmetrical Action Button Cluster */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {/* Primary CTA on top for Mobile, on right for Desktop */}
          <Link
            href="/service/calls/new"
            className="sm:order-last inline-flex items-center justify-center gap-2 px-5 h-11 sm:h-auto sm:py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs sm:text-xs tracking-wider uppercase shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>เปิดเคสใหม่</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              title="รีเฟรชข้อมูลล่าสุด"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0"
            >
              <RotateCcw size={16} className={isRefreshing ? "animate-spin text-[#ff2301]" : ""} />
            </button>

            {/* Export to Excel */}
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 font-bold text-xs tracking-wide transition-all shadow-sm active:scale-95"
            >
              <Download size={15} className="text-gray-500 shrink-0" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Import from Excel (Manager / Admin) */}
            {canImport && (
              <Link
                href="/service-mgr/calls/import"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 font-bold text-xs tracking-wide transition-all shadow-sm active:scale-95"
              >
                <Upload size={15} className="text-gray-500 shrink-0" />
                <span>นำเข้า Excel</span>
              </Link>
            )}

            {/* View Toggle (Table / Grid) - Desktop/Tablet only */}
            <div className="hidden md:flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200/80">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="มุมมองตาราง"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
          2. KPI SUMMARY STRIP (2x2 on Mobile, 4 Columns on Desktop)
      ─────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          {
            id: "ALL",
            title: "เคสทั้งหมด (Total)",
            shortTitle: "เคสทั้งหมด",
            count: totalCount,
            sub: "บันทึกแจ้งปัญหาทั้งหมดในระบบ",
            icon: <FileText size={18} className="text-gray-600" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-400",
            active: activeTab === "ALL",
          },
          {
            id: "PENDING",
            title: "เปิดเคส / รอนัดตรวจ (Pending)",
            shortTitle: "เปิดเคส / รอนัด",
            count: pendingCount,
            sub: `${totalCount ? Math.round((pendingCount / totalCount) * 100) : 0}% ของเคสทั้งหมด`,
            icon: <Clock size={18} className="text-[#ff2301]" />,
            iconBg: "bg-red-50",
            borderAccent: "border-l-4 border-[#ff2301]",
            active: activeTab === "PENDING",
          },
          {
            id: "IN_PROGRESS",
            title: "กำลังดำเนินการ (In Progress)",
            shortTitle: "กำลังดำเนินการ",
            count: inProgressCount,
            sub: `${totalCount ? Math.round((inProgressCount / totalCount) * 100) : 0}% ของเคสทั้งหมด`,
            icon: <Wrench size={18} className="text-gray-700" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-700",
            active: activeTab === "IN_PROGRESS",
          },
          {
            id: "COMPLETED",
            title: "ปิดเคสเรียบร้อย (Completed)",
            shortTitle: "ปิดเคสเรียบร้อย",
            count: completedCount,
            sub: `${totalCount ? Math.round((completedCount / totalCount) * 100) : 0}% ของเคสทั้งหมด`,
            icon: <CheckCircle2 size={18} className="text-gray-900" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-900",
            active: activeTab === "COMPLETED",
          },
        ].map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveTab(card.id as any)}
            className={`w-full text-left bg-white rounded-2xl p-3.5 sm:p-5 border transition-all duration-200 shadow-sm relative overflow-hidden group sm:hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${card.borderAccent} ${
              card.active
                ? "ring-2 ring-[#ff2301] border-transparent"
                : "border-gray-200/90 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                <span className="sm:hidden">{card.shortTitle}</span>
                <span className="hidden sm:inline">{card.title}</span>
              </span>
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${card.iconBg}`}
              >
                {card.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {card.count}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-gray-400">เคส</span>
            </div>
            <p className="hidden sm:block text-[11px] font-medium text-gray-400 mt-1 truncate">
              {card.sub}
            </p>

            {card.active && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff2301]" />
            )}
          </button>
        ))}
      </section>

      {/* ───────────────────────────────────────────────────────────
          3. SYMMETRICAL SEARCH & MULTI-FILTER TOOLBAR
      ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-gray-200/90 shadow-sm space-y-3 sm:space-y-4">
        {/* Top Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-gray-100 custom-scrollbar -mx-1 px-1">
          {[
            { id: "ALL", label: "ทั้งหมด", count: totalCount },
            { id: "PENDING", label: "เปิดเคส / รอนัดตรวจ", count: pendingCount },
            { id: "IN_PROGRESS", label: "กำลังดำเนินการ", count: inProgressCount },
            { id: "COMPLETED", label: "ปิดเคสแล้ว", count: completedCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-[#ff2301] text-white shadow-sm shadow-red-500/20"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200/70 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center">
          {/* Universal Search Box + Mobile Filter Toggle */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="ค้นหา Case No, ชื่อลูกค้า, อาการ, รุ่น..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-base sm:text-sm font-medium border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              className={`lg:hidden inline-flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                showMobileFilters || secondaryFiltersCount > 0
                  ? "bg-red-50 border-red-200 text-[#ff2301]"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>ตัวกรอง</span>
              {secondaryFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#ff2301] text-white font-black">
                  {secondaryFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Collapsible Filter Dropdowns on Mobile, Inline on Desktop */}
          <div
            className={`${
              showMobileFilters || secondaryFiltersCount > 0 ? "grid" : "hidden"
            } lg:grid grid-cols-1 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-8 gap-2.5 lg:gap-3 items-center`}
          >
            {/* Status Dropdown (Span 2) */}
            <div className="lg:col-span-2 relative">
              <MobileSafeSelect
                size="sm"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "ALL", label: "สถานะทั้งหมด" },
                  { value: "Pending", label: "เปิดเคส / รอนัดหมาย", dotClass: "bg-[#ff2301]" },
                  { value: "In Progress", label: "กำลังดำเนินการ", dotClass: "bg-gray-600" },
                  { value: "Completed", label: "ปิดเคสแล้ว", dotClass: "bg-gray-900" },
                  ...Object.entries(CALL_STATUS_CONFIG).map(([key, val]) => ({
                    value: key,
                    label: val.label,
                    dotClass: val.dot === "bg-white" ? "bg-gray-900" : val.dot,
                  })),
                ]}
              />
            </div>

            {/* Technician Filter (Span 2) */}
            <div className="lg:col-span-2 relative">
              <MobileSafeSelect
                size="sm"
                value={technicianFilter}
                onChange={(val) => setTechnicianFilter(val)}
                searchable={(users?.length || 0) > 5}
                searchPlaceholder="ค้นหาชื่อช่าง..."
                options={[
                  { value: "", label: "ช่างผู้รับผิดชอบทั้งหมด" },
                  { value: "__unassigned__", label: "ยังไม่ได้ระบุช่าง (Unassigned)" },
                  ...(users || []).map((u: any) => ({
                    value: u.fullName,
                    label: u.fullName,
                  })),
                ]}
              />
            </div>

            {/* Model Filter (Span 2) */}
            <div className="lg:col-span-2 relative">
              <MobileSafeSelect
                size="sm"
                value={modelFilter}
                onChange={(val) => setModelFilter(val)}
                searchable={uniqueModels.length > 5}
                searchPlaceholder="ค้นหารุ่น Inverter..."
                options={[
                  { value: "", label: "โมเดล Inverter ทั้งหมด" },
                  ...uniqueModels.map((m) => ({
                    value: m,
                    label: m,
                  })),
                ]}
              />
            </div>

            {/* Date Period Filter (Span 1) */}
            <div className="lg:col-span-1 relative">
              <MobileSafeSelect
                size="sm"
                value={datePeriod}
                onChange={(val) => setDatePeriod(val as any)}
                options={[
                  { value: "ALL", label: "ทุกเวลา" },
                  { value: "TODAY", label: "วันนี้" },
                  { value: "WEEK", label: "7 วัน" },
                  { value: "MONTH", label: "เดือนนี้" },
                ]}
              />
            </div>

            {/* Clear Filter Button (Span 1) */}
            <div className="lg:col-span-1 flex items-center justify-end">
              {activeFiltersCount > 0 ? (
                <button
                  onClick={handleResetFilters}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#ff2301] border border-red-200 text-xs font-bold transition-all shadow-sm"
                  title="ล้างตัวกรองทั้งหมด"
                >
                  <RotateCcw size={13} />
                  <span>ล้าง ({activeFiltersCount})</span>
                </button>
              ) : (
                <div className="w-full text-center text-[11px] text-gray-400 font-medium py-2">
                  {filteredLogs.length} ผลลัพธ์
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          4A. MOBILE DEDICATED CARD VIEW (< md)
      ─────────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {paginatedLogs.length > 0 ? (
          <>
            {paginatedLogs.map((log) => {
              const statusMeta = getCallStatusMeta(log.status);
              const relativeDays = getRelativeDays(log.receivedDate || log.createdAt);
              const techName = log.responsible?.fullName || log.responsibleName;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedCall(log)}
                  className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-sm active:bg-gray-50/70 transition-all space-y-3"
                >
                  {/* Top Row: Case No + Date + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-[#ff2301]">
                          {log.caseNumber || "—"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCaseNo(log.caseNumber || "", e)}
                          className="p-1 text-gray-300 hover:text-gray-600 rounded-md"
                          title="คัดลอก Case No."
                        >
                          {copiedCaseNo === log.caseNumber ? (
                            <Check size={13} className="text-emerald-500" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                        รับแจ้ง {formatThaiDate(log.receivedDate)}
                        {relativeDays ? ` (${relativeDays})` : ""}
                        {log.creator?.fullName ? ` • แจ้งโดย ${log.creator.fullName}` : ""}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 max-w-[165px] ${statusMeta.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                      <span className="truncate">{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Workflow Badges (Signed / Sales / QT / Delivery) */}
                  {((log.sigTechnicianUrl || log.sigCustomerUrl) ||
                    (log.assignedSalesName && !log.linkedQuotationNo) ||
                    log.linkedQuotationNo ||
                    log.linkedDeliveryNo) && (
                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(log.sigTechnicianUrl || log.sigCustomerUrl) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <FileSignature size={10} />
                          มีลายเซ็นหน้างานแล้ว
                        </span>
                      )}
                      {log.assignedSalesName && !log.linkedQuotationNo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          ส่งต่อเซลล์: {log.assignedSalesName}
                        </span>
                      )}
                      {log.linkedQuotationNo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          QT: {log.linkedQuotationNo}
                        </span>
                      )}
                      {log.linkedDeliveryNo && (
                        <Link
                          href={`/repair-deliveries/${log.linkedDeliveryId}/pdf`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold"
                        >
                          ใบส่งมอบ: {log.linkedDeliveryNo}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Customer & One-tap Phone */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 leading-snug line-clamp-1">
                        {log.companyName || "—"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        ผู้ติดต่อ: {log.contactName || "—"}
                      </p>
                    </div>

                    {log.contactPhone && (
                      <a
                        href={`tel:${log.contactPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 text-[#ff2301] border border-red-200 text-[11px] font-bold shrink-0 active:scale-95"
                      >
                        <Phone size={12} />
                        <span className="font-mono">{log.contactPhone}</span>
                      </a>
                    )}
                  </div>

                  {/* Inverter Model & Reported Issue */}
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-800 font-mono">
                        <Cpu size={13} className="text-[#ff2301] shrink-0" />
                        <span>{log.inverterModel || "—"}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500 truncate">
                        ช่าง:{" "}
                        {techName ? (
                          <strong className="text-gray-800">{techName}</strong>
                        ) : (
                          <strong className="text-amber-600">ยังไม่ระบุ</strong>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {log.reportedIssue || "—"}
                    </p>
                  </div>

                  {/* Mobile Thumb-Friendly Action Row */}
                  <div
                    className="pt-2 border-t border-gray-100 flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCall(log)}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-10 rounded-xl bg-gray-100 active:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
                    >
                      <Eye size={14} />
                      <span>ดูย่อ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSigningCall(log)}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-10 rounded-xl bg-indigo-50 active:bg-indigo-100 border border-indigo-200/70 text-indigo-700 text-xs font-bold transition-all"
                    >
                      <FileSignature size={14} />
                      <span>เซ็นชื่อ</span>
                    </button>

                    <Link
                      href={`/service/calls/${log.id}/pdf`}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-10 rounded-xl bg-emerald-50 active:bg-emerald-100 border border-emerald-200/70 text-emerald-700 text-xs font-bold transition-all"
                    >
                      <Printer size={14} />
                      <span>PDF</span>
                    </Link>

                    <Link
                      href={`/service/calls/${log.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-10 rounded-xl bg-[#ff2301] active:bg-[#d81900] text-white text-xs font-bold shadow-sm shadow-red-500/20 transition-all"
                    >
                      <span>เปิดเคส</span>
                      <ExternalLink size={12} />
                    </Link>

                    <button
                      type="button"
                      disabled={deletingId === log.id}
                      onClick={(e) => handleDeleteCall(log, e)}
                      title="ลบเคสนี้"
                      className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-red-50 active:bg-red-100 border border-red-200/80 text-red-600 disabled:opacity-50 transition-all"
                    >
                      {deletingId === log.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Mobile Pagination */}
            <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 px-3 h-10 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 disabled:opacity-35 transition-all"
              >
                <ChevronLeft size={15} />
                <span>ก่อนหน้า</span>
              </button>

              <div className="text-center">
                <div className="text-xs font-black text-gray-900">
                  หน้า {currentPage} / {totalPages}
                </div>
                <div className="text-[11px] text-gray-400">
                  ทั้งหมด {filteredLogs.length} เคส
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 h-10 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 disabled:opacity-35 transition-all"
              >
                <span>ถัดไป</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-200/90 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
              <PhoneCall size={24} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-gray-700">
              {searchTerm || activeFiltersCount > 0
                ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"
                : "ยังไม่มีรายการบันทึกแจ้งปัญหาลูกค้า"}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
              >
                <RotateCcw size={13} />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            ) : (
              <Link
                href="/service/calls/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff2301] text-white text-xs font-bold shadow-md shadow-red-500/20"
              >
                <Plus size={14} />
                <span>เปิดเคสแจ้งปัญหาแรก</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          4B. DESKTOP/TABLET VIEW: MODERN TABLE OR GRID CARDS (md+)
      ─────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
      {viewMode === "table" ? (
        /* ──── TABLE VIEW ──── */
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[960px]">
              {/* Table Header */}
              <thead className="bg-gray-50/80 border-b border-gray-200/90 select-none">
                <tr>
                  {/* Case No. */}
                  <th
                    onClick={() => handleSort("caseNumber")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Case No.</span>
                      {sortField === "caseNumber" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Date */}
                  <th
                    onClick={() => handleSort("date")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>วันที่รับแจ้ง</span>
                      {sortField === "date" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Customer / Company */}
                  <th
                    onClick={() => handleSort("customer")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 min-w-[180px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ลูกค้า / บริษัท</span>
                      {sortField === "customer" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Model */}
                  <th
                    onClick={() => handleSort("model")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>โมเดล Inverter</span>
                      {sortField === "model" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Issue */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider min-w-[220px]">
                    ปัญหาที่แจ้ง (Reported Issue)
                  </th>

                  {/* Status */}
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>สถานะ</span>
                      {sortField === "status" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Responsible Tech */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    ผู้รับผิดชอบ
                  </th>

                  {/* Actions (Centered) */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    จัดการ
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => {
                    const statusMeta = getCallStatusMeta(log.status);
                    const relativeDays = getRelativeDays(log.receivedDate || log.createdAt);
                    const techName = log.responsible?.fullName || log.responsibleName;

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedCall(log)}
                        className="group hover:bg-red-50/30 transition-colors cursor-pointer"
                      >
                        {/* 1. Case No. */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-[#ff2301]">
                                {log.caseNumber || "—"}
                              </span>
                              <button
                                onClick={(e) => handleCopyCaseNo(log.caseNumber || "", e)}
                                className="text-gray-300 hover:text-gray-600 p-1 rounded-md transition-colors"
                                title="คัดลอก Case No."
                              >
                                {copiedCaseNo === log.caseNumber ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            {log.creator?.fullName && (
                              <span className="text-[10px] text-gray-400 font-medium truncate max-w-[160px]" title={`ผู้แจ้ง: ${log.creator.fullName}${log.creator.role ? ` (${log.creator.role})` : ""}`}>
                                แจ้งโดย: {log.creator.fullName}
                                {log.creator.role ? ` (${log.creator.role})` : ""}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Received Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">
                              {formatThaiDate(log.receivedDate)}
                            </span>
                            {relativeDays && (
                              <span className="text-[10px] font-medium text-gray-400">
                                {relativeDays}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Customer / Company */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col max-w-[200px]">
                            <p className="font-bold text-gray-900 truncate">
                              {log.companyName || "—"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                              <span className="truncate">{log.contactName || "—"}</span>
                              {log.contactPhone && (
                                <span className="font-mono text-[10px] text-gray-400 flex items-center gap-0.5 shrink-0">
                                  <Phone size={9} />
                                  <span>{log.contactPhone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Model */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Cpu size={13} className="text-gray-400 shrink-0" />
                            <span className="font-bold text-gray-800">
                              {log.inverterModel || "—"}
                            </span>
                          </div>
                        </td>

                        {/* 5. Reported Issue */}
                        <td className="py-3.5 px-4">
                          <p className="text-xs text-gray-600 line-clamp-2 max-w-[240px]" title={log.reportedIssue}>
                            {log.reportedIssue || "—"}
                          </p>
                        </td>

                        {/* 6. Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                              <span>{statusMeta.label}</span>
                            </span>
                            {(log.sigTechnicianUrl || log.sigCustomerUrl) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <FileSignature size={10} />
                                มีลายเซ็นหน้างานแล้ว
                              </span>
                            )}
                            {log.assignedSalesName && !log.linkedQuotationNo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                ส่งต่อเซลล์: {log.assignedSalesName}
                              </span>
                            )}
                            {log.linkedQuotationNo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                QT: {log.linkedQuotationNo}
                              </span>
                            )}
                            {log.linkedDeliveryNo && (
                              <Link
                                href={`/repair-deliveries/${log.linkedDeliveryId}/pdf`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold hover:bg-purple-100"
                              >
                                ใบส่งมอบ: {log.linkedDeliveryNo}
                              </Link>
                            )}
                          </div>
                        </td>

                        {/* 7. Responsible Tech */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {techName ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {techName.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-700 text-xs">
                                {techName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                              <AlertCircle size={11} className="shrink-0" />
                              <span>ยังไม่ระบุ</span>
                            </span>
                          )}
                        </td>

                        {/* 8. Symmetrical Actions Cluster */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Quick View Button */}
                            <button
                              onClick={() => setSelectedCall(log)}
                              className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              title="ดูรายละเอียดฉบับย่อ"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Sign On-site Report Button */}
                            <button
                              onClick={() => setSigningCall(log)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="สรุปผลหน้างานและลงลายมือชื่อดิจิทัล"
                            >
                              <FileSignature size={15} />
                            </button>

                            {/* Print / PDF Report Link */}
                            <Link
                              href={`/service/calls/${log.id}/pdf`}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="พิมพ์ใบรายงานการตรวจสอบและบริการหน้างาน (PDF)"
                            >
                              <Printer size={15} />
                            </Link>

                            {/* Open Document Link */}
                            <Link
                              href={`/service/calls/${log.id}`}
                              className="p-1.5 text-gray-400 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                              title="เปิดเอกสารแบบเต็ม"
                            >
                              <ExternalLink size={15} />
                            </Link>

                            {/* Delete Case Button */}
                            <button
                              type="button"
                              disabled={deletingId === log.id}
                              onClick={(e) => handleDeleteCall(log, e)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="ลบข้อมูลเคสนี้"
                            >
                              {deletingId === log.id ? (
                                <Loader2 size={15} className="animate-spin text-red-600" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  /* Empty State */
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-400 max-w-sm mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-1">
                          <PhoneCall size={28} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-bold text-gray-700">
                          {searchTerm || activeFiltersCount > 0
                            ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"
                            : "ยังไม่มีรายการบันทึกแจ้งปัญหาลูกค้า"}
                        </p>
                        <p className="text-xs text-gray-400 text-center">
                          {searchTerm || activeFiltersCount > 0
                            ? "ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูเคสทั้งหมด"
                            : "เริ่มต้นด้วยการเปิดเคสใหม่เพื่อบันทึกปัญหาที่ลูกค้าแจ้ง"}
                        </p>
                        {activeFiltersCount > 0 ? (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
                          >
                            <RotateCcw size={13} />
                            <span>ล้างตัวกรองทั้งหมด</span>
                          </button>
                        ) : (
                          <Link
                            href="/service/calls/new"
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
                          >
                            <Plus size={14} />
                            <span>เปิดเคสแจ้งปัญหาแรก</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Symmetrical Pagination & Footer */}
          <div className="p-4 sm:px-6 bg-gray-50/60 border-t border-gray-200/90 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side: Count Summary & Rows per page */}
            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
              <span>
                แสดง{" "}
                <b className="text-gray-900">
                  {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </b>{" "}
                -{" "}
                <b className="text-gray-900">
                  {Math.min(currentPage * pageSize, filteredLogs.length)}
                </b>{" "}
                จากทั้งหมด <b className="text-gray-900">{filteredLogs.length}</b> เคส
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-gray-400">แถวต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 outline-none focus:border-[#ff2301]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right side: Symmetrical Pagination Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[#ff2301] text-white shadow-sm shadow-red-500/25"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                title="หน้าถัดไป"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ──── GRID CARDS VIEW ──── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedLogs.map((log) => {
              const statusMeta = getCallStatusMeta(log.status);
              const techName = log.responsible?.fullName || log.responsibleName;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedCall(log)}
                  className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between cursor-pointer group"
                >
                  {/* Top Bar: Case No & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-[#ff2301]">
                          {log.caseNumber || "—"}
                        </span>
                        <button
                          onClick={(e) => handleCopyCaseNo(log.caseNumber || "", e)}
                          className="text-gray-300 hover:text-gray-600 p-0.5 rounded transition-colors"
                        >
                          {copiedCaseNo === log.caseNumber ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="mb-3">
                      <p className="text-sm font-black text-gray-900 line-clamp-1">
                        {log.companyName || "—"}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-0.5">
                        <span>ผู้ติดต่อ: {log.contactName || "—"}</span>
                        <span>{formatThaiDate(log.receivedDate)}</span>
                      </div>
                    </div>

                    {/* Model & Issue Box */}
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                        <Cpu size={14} className="text-gray-500" />
                        <span>{log.inverterModel || "—"}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-2">
                        {log.reportedIssue || "—"}
                      </p>
                    </div>

                    {/* Personnel Summary */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          ผู้รับเรื่อง
                        </span>
                        <span className="font-bold text-gray-700 truncate block">
                          {log.creator?.fullName || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          ผู้รับผิดชอบ
                        </span>
                        {techName ? (
                          <span className="font-bold text-gray-700 truncate block">
                            {techName}
                          </span>
                        ) : (
                          <span className="font-bold text-amber-600 text-[10px] flex items-center gap-1 mt-0.5">
                            <AlertCircle size={11} className="shrink-0" />
                            <span>ยังไม่ระบุ</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div
                    className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCall(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all"
                      >
                        <Eye size={13} />
                        <span>ดูย่อ</span>
                      </button>

                      <button
                        onClick={() => setSigningCall(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all"
                        title="สรุปผลหน้างานและลงลายเซ็น"
                      >
                        <FileSignature size={13} />
                        <span>เซ็นชื่อ</span>
                      </button>

                      <Link
                        href={`/service/calls/${log.id}/pdf`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all"
                        title="พิมพ์ใบรายงานหน้างาน PDF"
                      >
                        <Printer size={13} />
                        <span>PDF</span>
                      </Link>

                      <button
                        type="button"
                        disabled={deletingId === log.id}
                        onClick={(e) => handleDeleteCall(log, e)}
                        className="inline-flex items-center justify-center p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all disabled:opacity-50"
                        title="ลบข้อมูลเคสนี้"
                      >
                        {deletingId === log.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>

                    <Link
                      href={`/service/calls/${log.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-sm shadow-red-500/20 transition-all"
                    >
                      <span>เปิดเคส</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Symmetrical Pagination for Grid */}
          <div className="bg-white rounded-3xl p-4 sm:px-6 border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500 font-medium">
              แสดง {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, filteredLogs.length)} จากทั้งหมด{" "}
              {filteredLogs.length} เคส
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-3 py-1 text-xs font-bold text-gray-700">
                หน้า {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          5. QUICK PREVIEW SLIDE-OVER DRAWER (MODERN & SYMMETRICAL)
      ─────────────────────────────────────────────────────────── */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedCall(null)}
          />

          {/* Slide-over panel */}
          <div className="relative w-full max-w-2xl h-[100dvh] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-3 sm:gap-4 bg-gray-50/50 shrink-0">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#c71a00] flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                  <PhoneCall size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-mono font-black text-base sm:text-lg text-[#ff2301]">
                      {selectedCall.caseNumber || "—"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCallStatusMeta(selectedCall.status).badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getCallStatusMeta(selectedCall.status).dot}`} />
                      <span>{getCallStatusMeta(selectedCall.status).label}</span>
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 line-clamp-2">
                    {selectedCall.companyName || "—"}
                  </h2>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedCall(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-all shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar">
              {/* Quick Status Bar */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    สถานะปัจจุบัน
                  </span>
                  <span className="text-sm font-black text-gray-900">
                    {getCallStatusMeta(selectedCall.status).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    วันที่รับแจ้ง
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    {formatThaiDate(selectedCall.receivedDate)}
                  </span>
                </div>
              </div>

              {/* Customer & Contact Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#ff2301]" /> ข้อมูลลูกค้าและการติดต่อ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-gray-200 bg-white">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      บริษัท / ลูกค้า
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">
                      {selectedCall.companyName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      ผู้ติดต่อ
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">
                      {selectedCall.contactName || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      เบอร์โทรศัพท์ / Line
                    </span>
                    {selectedCall.contactPhone ? (
                      <a
                        href={`tel:${selectedCall.contactPhone}`}
                        className="text-xs font-bold text-[#ff2301] hover:underline mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200"
                      >
                        <Phone size={12} className="shrink-0" />
                        <span>{selectedCall.contactPhone}</span>
                      </a>
                    ) : (
                      <p className="text-xs font-medium text-gray-400 mt-0.5">—</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inverter & Reported Issue */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-[#ff2301]" /> อุปกรณ์และปัญหาที่แจ้ง
                </h3>
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      โมเดล Inverter
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">
                      {selectedCall.inverterModel || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      อาการที่พบ (ลูกค้าแจ้ง)
                    </span>
                    <p className="text-xs text-gray-800 font-medium mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {selectedCall.reportedIssue || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnosis & Solution (if available) */}
              {(selectedCall.analyzedCause || selectedCall.recommendedSolution) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench size={14} className="text-[#ff2301]" /> การวิเคราะห์และแนวทางแก้ไข
                  </h3>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                    {selectedCall.analyzedCause && (
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">
                          สาเหตุที่วิเคราะห์ได้
                        </span>
                        <p className="text-xs text-gray-800 font-medium mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                          {selectedCall.analyzedCause}
                        </p>
                      </div>
                    )}
                    {selectedCall.recommendedSolution && (
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">
                          แนวทางแก้ไข / แนะนำ
                        </span>
                        <p className="text-xs text-gray-800 font-medium mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                          {selectedCall.recommendedSolution}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Personnel */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-[#ff2301]" /> เจ้าหน้าที่ที่เกี่ยวข้อง
                </h3>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-gray-200 bg-white text-center">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">
                      ผู้รับเรื่อง (สร้างเอกสาร)
                    </span>
                    <p className="text-xs font-bold text-gray-800 mt-1">
                      {selectedCall.creator?.fullName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">
                      ช่างผู้รับผิดชอบ
                    </span>
                    {selectedCall.responsible?.fullName || selectedCall.responsibleName ? (
                      <p className="text-xs font-bold text-gray-800 mt-1">
                        {selectedCall.responsible?.fullName || selectedCall.responsibleName}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-amber-600 mt-1 flex items-center justify-center gap-1">
                        <AlertCircle size={11} className="shrink-0" />
                        <span>ยังไม่ระบุ</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:p-5 border-t border-gray-200 bg-gray-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setSelectedCall(null)}
                  className="inline-flex items-center justify-center px-4 h-10 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold transition-all"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  disabled={deletingId === selectedCall.id}
                  onClick={(e) => handleDeleteCall(selectedCall, e)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {deletingId === selectedCall.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>ลบเคส</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    const target = selectedCall;
                    setSelectedCall(null);
                    setSigningCall(target);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 h-11 sm:h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all"
                >
                  <FileSignature size={14} />
                  <span>เซ็นชื่อหน้างาน</span>
                </button>

                <Link
                  href={`/service/calls/${selectedCall.id}/pdf`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 h-11 sm:h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Printer size={14} />
                  <span>รายงาน PDF</span>
                </Link>

                <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deletingId === selectedCall.id}
                    onClick={(e) => handleDeleteCall(selectedCall, e)}
                    className="sm:hidden w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-red-50 active:bg-red-100 border border-red-200 text-red-600 transition-all disabled:opacity-50"
                    title="ลบเคสนี้"
                  >
                    {deletingId === selectedCall.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>

                  <Link
                    href={`/service/calls/${selectedCall.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 h-11 sm:h-10 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
                  >
                    <span>เปิดเอกสารแบบเต็ม</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          6. ON-SITE SIGNATURE & SUMMARY MODAL
      ─────────────────────────────────────────────────────────── */}
      {signingCall && (
        <ServiceCallSignatureModal
          callLog={signingCall}
          users={users}
          onClose={() => setSigningCall(null)}
          onSaved={() => {
            setSigningCall(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
