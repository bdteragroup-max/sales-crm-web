"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Printer,
  Eye,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  List,
  Copy,
  Check,
  AlertCircle,
  Building2,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Phone,
  Cpu,
  Package,
  CheckSquare,
  ChevronDown,
  MapPin,
  FileSpreadsheet,
  HelpCircle,
  Tag,
  ClipboardCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import InverterQcModal from "./components/InverterQcModal";
import {
  deleteRepairOrder,
  updateRepairOrderStatus,
  updateRepairOrderTechnician
} from "@/app/actions/repairOrders";

interface RepairOrdersClientPageProps {
  initialRepairOrders?: any[];
  companies?: any[];
  users?: any[];
  userRole?: string;
  currentUserName?: string;
}

// ── Status Step Definitions & Aesthetic Styling ──
export const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; group: "pending" | "repair" | "outsource" | "completed" }
> = {
  service_receive: {
    label: "รอรับซ่อม / รอรีพอต",
    badge: "bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100/70",
    dot: "bg-[#ff2301]",
    group: "pending",
  },
  service_check: {
    label: "กำลังตรวจสอบ",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-600",
    group: "repair",
  },
  service_repair: {
    label: "กำลังดำเนินการซ่อม",
    badge: "bg-red-50 text-red-800 border-red-300 hover:bg-red-100/70",
    dot: "bg-[#ff2301]",
    group: "repair",
  },
  sales_quote: {
    label: "รอการเสนอราคา",
    badge: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-500",
    group: "pending",
  },
  customer_approval: {
    label: "รอลูกค้าอนุมัติซ่อม",
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/70",
    dot: "bg-[#ff2301]",
    group: "pending",
  },
  service_outsource: {
    label: "ส่งซ่อมภายนอก",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-700",
    group: "outsource",
  },
  purchase_followup: {
    label: "จัดซื้อติดตามอะไหล่",
    badge: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    dot: "bg-gray-500",
    group: "repair",
  },
  service_receive_back: {
    label: "รับกลับจากซ่อมนอก",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-600",
    group: "repair",
  },
  service_qc: {
    label: "ตรวจสอบ QC หลังซ่อม",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/60",
    dot: "bg-gray-600",
    group: "repair",
  },
  awaiting_return: {
    label: "รอส่งคืนลูกค้า",
    badge: "bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100",
    dot: "bg-gray-700",
    group: "completed",
  },
  service_return: {
    label: "ส่งมอบสินค้าเรียบร้อย",
    badge: "bg-gray-900 text-white border-gray-800 hover:bg-black",
    dot: "bg-white",
    group: "completed",
  },
  closed: {
    label: "ปิดงานสมบูรณ์",
    badge: "bg-gray-900 text-white border-gray-800 hover:bg-black",
    dot: "bg-white",
    group: "completed",
  },
};

const CHECKLIST_LABELS: Record<string, string> = {
  frontPanel: "ด้านหน้า / Front",
  topPanel: "ด้านบน / Top",
  leftSide: "ด้านข้าง (ซ้าย) / Left",
  rightSide: "ด้านข้าง (ขวา) / Right",
  inside: "ด้านใน / Inside",
  nameplate: "Nameplate",
  bottom: "ด้านล่าง / Bottom",
  terminalNut: "Terminal / Nut",
  termCover: "Term. cover",
  cover: "ฝาครอบ / Cover",
  video: "Video",
  Front: "ด้านหน้า",
  Top: "ด้านบน",
  SideLeft: "ด้านข้าง (ซ้าย)",
  SideRight: "ด้านข้าง (ขวา)",
  Inside: "ด้านใน",
  Nameplate: "Nameplate",
  Bottom: "ด้านล่าง",
  TerminalNut: "Terminal / Nut",
  TermCover: "Term. cover",
  Cover: "ฝาครอบ",
  Video: "Video",
};

export default function RepairOrdersClientPage({
  initialRepairOrders = [],
  companies = [],
  users = [],
  userRole,
  currentUserName,
}: RepairOrdersClientPageProps) {
  const router = useRouter();

  // ── Local State ──
  const [repairOrders, setRepairOrders] = useState<any[]>(initialRepairOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "REPAIR" | "OUTSOURCE" | "COMPLETED">("ALL");
  const [statusFilter, setStatusFilter] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [datePeriod, setDatePeriod] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Sorting
  const [sortField, setSortField] = useState<"date" | "jobNumber" | "customer" | "status">("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Interaction feedback
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isUpdatingTech, setIsUpdatingTech] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Detail Drawer State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Inverter QC Modal State
  const [qcModalOrder, setQcModalOrder] = useState<any | null>(null);

  // ── Synchronize initial props if updated ──
  useEffect(() => {
    setRepairOrders(initialRepairOrders);
  }, [initialRepairOrders]);

  // ── Helper: Format Thai Date ──
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

  // ── Safely parse JSON items ──
  const parseItems = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // ── Safely parse checklist ──
  const parseChecklist = (raw: any): Record<string, boolean> => {
    if (!raw) return {};
    if (typeof raw === "object" && !Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return {};
  };

  // ── KPI Counts ──
  const totalCount = repairOrders.length;
  const pendingCount = useMemo(() => {
    return repairOrders.filter((ro) =>
      ["service_receive", "sales_quote", "customer_approval"].includes(ro.job?.currentStep)
    ).length;
  }, [repairOrders]);

  const underRepairCount = useMemo(() => {
    return repairOrders.filter((ro) =>
      ["service_repair", "service_check", "purchase_followup", "service_receive_back", "service_qc"].includes(
        ro.job?.currentStep
      )
    ).length;
  }, [repairOrders]);

  const outsourceCount = useMemo(() => {
    return repairOrders.filter((ro) => ro.job?.currentStep === "service_outsource").length;
  }, [repairOrders]);

  const completedCount = useMemo(() => {
    return repairOrders.filter(
      (ro) =>
        ["service_return", "awaiting_return", "closed", "accounting"].includes(ro.job?.currentStep) ||
        !!ro.sentDate
    ).length;
  }, [repairOrders]);

  // ── Filtered & Sorted Records ──
  const filteredRepairs = useMemo(() => {
    return repairOrders
      .filter((ro) => {
        const term = searchTerm.trim().toLowerCase();
        const jobNum = ro.job?.jobNumber?.toLowerCase() || "";
        const company = (
          ro.customerCompany ||
          ro.company ||
          ro.job?.customerName ||
          ""
        ).toLowerCase();
        const tech = (ro.technicianName || "").toLowerCase();
        const seller = (ro.job?.sellerName || ro.salesPerson || "").toLowerCase();
        const receiver = (ro.receiverName || "").toLowerCase();
        const itemDesc = (ro.job?.item || "").toLowerCase();
        const symptoms = (ro.symptoms || "").toLowerCase();

        const itemsList = parseItems(ro.items);
        const itemsMatch = itemsList.some((it: any) =>
          (it.type || "").toLowerCase().includes(term) ||
          (it.brand || "").toLowerCase().includes(term) ||
          (it.model || "").toLowerCase().includes(term) ||
          (it.serial || "").toLowerCase().includes(term)
        );

        const matchesSearch =
          !term ||
          jobNum.includes(term) ||
          company.includes(term) ||
          tech.includes(term) ||
          seller.includes(term) ||
          receiver.includes(term) ||
          itemDesc.includes(term) ||
          symptoms.includes(term) ||
          itemsMatch;

        if (!matchesSearch) return false;

        // Status Step Filter (Dropdown)
        const currentStep = ro.job?.currentStep;
        if (statusFilter && currentStep !== statusFilter) {
          if (statusFilter === "service_return" && !!ro.sentDate) {
            // Allow match if marked as sent
          } else {
            return false;
          }
        }

        // Tab filter
        if (activeTab === "PENDING") {
          if (!["service_receive", "sales_quote", "customer_approval"].includes(currentStep)) return false;
        } else if (activeTab === "REPAIR") {
          if (
            !["service_repair", "service_check", "purchase_followup", "service_receive_back", "service_qc"].includes(
              currentStep
            )
          )
            return false;
        } else if (activeTab === "OUTSOURCE") {
          if (currentStep !== "service_outsource") return false;
        } else if (activeTab === "COMPLETED") {
          if (
            !["service_return", "awaiting_return", "closed", "accounting"].includes(currentStep) &&
            !ro.sentDate
          )
            return false;
        }

        // Technician Filter
        if (technicianFilter) {
          if (technicianFilter === "__unassigned__") {
            if (ro.technicianName && ro.technicianName.trim() !== "") return false;
          } else if (ro.technicianName !== technicianFilter) {
            return false;
          }
        }

        // Company Filter
        if (companyFilter) {
          const orderComp = ro.customerCompany || ro.company || ro.job?.customerName || "";
          if (orderComp !== companyFilter) return false;
        }

        // Date Period Filter
        if (datePeriod !== "ALL") {
          const dateVal = ro.receivedDate || ro.createdAt;
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
        } else if (sortField === "jobNumber") {
          const numA = a.job?.jobNumber || "";
          const numB = b.job?.jobNumber || "";
          comparison = numA.localeCompare(numB);
        } else if (sortField === "customer") {
          const custA = a.customerCompany || a.company || a.job?.customerName || "";
          const custB = b.customerCompany || b.company || b.job?.customerName || "";
          comparison = custA.localeCompare(custB);
        } else if (sortField === "status") {
          const stA = a.job?.currentStep || "";
          const stB = b.job?.currentStep || "";
          comparison = stA.localeCompare(stB);
        }
        return sortAsc ? comparison : -comparison;
      });
  }, [
    repairOrders,
    searchTerm,
    activeTab,
    statusFilter,
    technicianFilter,
    companyFilter,
    datePeriod,
    sortField,
    sortAsc,
  ]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredRepairs.length / pageSize));
  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRepairs.slice(start, start + pageSize);
  }, [filteredRepairs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, statusFilter, technicianFilter, companyFilter, datePeriod, pageSize]);

  // ── Active Filters Count ──
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (activeTab !== "ALL") count++;
    if (statusFilter) count++;
    if (technicianFilter) count++;
    if (companyFilter) count++;
    if (datePeriod !== "ALL") count++;
    return count;
  }, [searchTerm, activeTab, statusFilter, technicianFilter, companyFilter, datePeriod]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setActiveTab("ALL");
    setStatusFilter("");
    setTechnicianFilter("");
    setCompanyFilter("");
    setDatePeriod("ALL");
  };

  // ── Actions ──
  const handleDelete = async (id: string, jobNumber?: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบใบรับซ่อม?",
      html: `คุณกำลังจะลบใบรับซ่อม <b class="text-[#ff2301]">${jobNumber || id}</b><br><span style="font-size: 13px; color: #64748b;">การกระทำนี้จะลบข้อมูลออกจากระบบ และไม่สามารถย้อนกลับได้</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยันลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
      customClass: {
        popup: "rounded-2xl border border-gray-100 shadow-2xl",
        confirmButton: "rounded-xl px-5 py-2.5 font-bold shadow-md",
        cancelButton: "rounded-xl px-5 py-2.5 font-bold",
      },
    });

    if (result.isConfirmed) {
      setRepairOrders((prev) => prev.filter((item) => item.id !== id));
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
      try {
        const res = await deleteRepairOrder(id);
        if (!res.success) throw new Error(res.error);
        Swal.fire({
          title: "ลบสำเร็จ",
          text: "ลบรายการใบรับซ่อมเรียบร้อยแล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: "rounded-2xl" },
        });
        router.refresh();
      } catch (err: any) {
        setRepairOrders(initialRepairOrders);
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: err.message || "ไม่สามารถลบใบรับซ่อมได้",
          icon: "error",
          confirmButtonColor: "#ff2301",
          customClass: { popup: "rounded-2xl" },
        });
      }
    }
  };

  const handleStatusChange = async (jobId: string, newStep: string) => {
    if (!jobId) return;
    setIsUpdatingStatus(jobId);

    // Optimistic Update
    setRepairOrders((prev) =>
      prev.map((ro) => {
        if (ro.jobId === jobId) {
          return {
            ...ro,
            job: ro.job ? { ...ro.job, currentStep: newStep } : { currentStep: newStep },
          };
        }
        return ro;
      })
    );

    if (selectedOrder?.jobId === jobId) {
      setSelectedOrder((prev: any) =>
        prev
          ? {
              ...prev,
              job: prev.job ? { ...prev.job, currentStep: newStep } : { currentStep: newStep },
            }
          : null
      );
    }

    try {
      const res = await updateRepairOrderStatus(jobId, newStep);
      if (!res.success) throw new Error(res.error);
      router.refresh();

      // If moving to QC or completed repair, prompt technician to fill Inverter QC check form
      if (newStep === "service_qc") {
        const targetOrder = repairOrders.find((ro) => ro.jobId === jobId);
        if (targetOrder && !targetOrder.inverterQc) {
          Swal.fire({
            title: "ตรวจสอบ QC ของ INVERTER",
            text: "สถานะเปลี่ยนเป็น 'ตรวจสอบ QC หลังซ่อม' แล้ว ต้องการเปิดบันทึกผลการตรวจสอบ QC ของ INVERTER (QC-EN-01) ตอนนี้เลยหรือไม่?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#ff2301",
            cancelButtonColor: "#64748b",
            confirmButtonText: "กรอกฟอร์ม QC ทันที",
            cancelButtonText: "ไว้ภายหลัง",
          }).then((result) => {
            if (result.isConfirmed) {
              setQcModalOrder(targetOrder);
            }
          });
        }
      }
    } catch (error: any) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ: " + error.message);
      setRepairOrders(initialRepairOrders);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleTechnicianChange = async (jobId: string, techName: string) => {
    if (!jobId) return;
    setIsUpdatingTech(jobId);

    // Optimistic Update
    setRepairOrders((prev) =>
      prev.map((ro) => {
        if (ro.jobId === jobId) {
          return {
            ...ro,
            technicianName: techName,
          };
        }
        return ro;
      })
    );

    if (selectedOrder?.jobId === jobId) {
      setSelectedOrder((prev: any) =>
        prev
          ? {
              ...prev,
              technicianName: techName,
            }
          : null
      );
    }

    try {
      const res = await updateRepairOrderTechnician(jobId, techName);
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาดในการมอบหมายช่าง: " + error.message);
      setRepairOrders(initialRepairOrders);
    } finally {
      setIsUpdatingTech(null);
    }
  };

  const handleCopyJobNumber = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedJobId(text);
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleExportExcel = () => {
    if (filteredRepairs.length === 0) {
      Swal.fire({
        title: "ไม่มีข้อมูลสำหรับส่งออก",
        text: "กรุณาปรับตัวกรองเพื่อค้นหาข้อมูลก่อนส่งออก",
        icon: "info",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const exportData = filteredRepairs.map((ro, index) => {
      const itemsList = parseItems(ro.items);
      const itemsText = itemsList
        .map((it: any) => `${it.type || ""} ${it.brand || ""} ${it.model || ""}`.trim())
        .filter(Boolean)
        .join("; ");

      return {
        "ลำดับ": index + 1,
        "วันที่รับ": ro.receivedDate ? formatThaiDate(ro.receivedDate) : formatThaiDate(ro.createdAt),
        "เลขที่งาน": ro.job?.jobNumber || "—",
        "ลูกค้า": ro.customerCompany || ro.company || ro.job?.customerName || "—",
        "สินค้า/อุปกรณ์": ro.job?.item || itemsText || "—",
        "อาการเสีย": ro.symptoms || "—",
        "พนักงานขาย": ro.job?.sellerName || ro.salesPerson || "—",
        "ผู้รับซ่อม": ro.receiverName || "—",
        "ช่างซ่อมผู้รับผิดชอบ": ro.technicianName || "ยังไม่ระบุ",
        "ประเภทงาน": ro.workType || ro.job?.jobType || "ซ่อม",
        "สถานะ": STATUS_CONFIG[ro.job?.currentStep]?.label || ro.job?.currentStep || "รอรับซ่อม",
        "วันที่ส่งมอบ": ro.sentDate ? formatThaiDate(ro.sentDate) : "—",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายการใบรับซ่อม");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Repair_Orders_${dateStr}.xlsx`);
  };

  // Toggle sorting
  const handleSort = (field: "date" | "jobNumber" | "customer" | "status") => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Service technicians list
  const serviceUsers = useMemo(() => {
    return users?.filter(
      (u) =>
        u.role?.toLowerCase().includes("service") ||
        u.role?.toLowerCase().includes("ช่าง") ||
        u.role?.toLowerCase().includes("บริการ") ||
        u.role?.toLowerCase().includes("tech")
    );
  }, [users]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ───────────────────────────────────────────────────────────
          1. TOP HERO HEADER (Symmetrical & Modern Red/White/Gray)
      ─────────────────────────────────────────────────────────── */}
      <header className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
        {/* Left Side: Brand Icon & Titles */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative group">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#c71a00] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
              <Wrench size={26} className="transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                ใบรับซ่อม
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#ff2301] border border-red-200/80">
                {repairOrders.length} รายการ
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex items-center gap-2">
              <span>REPAIR ORDERS & SERVICE MANAGEMENT</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 font-normal">ระบบบันทึกงานซ่อม ตรวจเช็ค และส่งมอบ</span>
            </p>
          </div>
        </div>

        {/* Right Side: Symmetrical Action Button Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="รีเฟรชข้อมูลล่าสุด"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 transition-all shadow-sm active:scale-95"
          >
            <RotateCcw size={16} className={isRefreshing ? "animate-spin text-[#ff2301]" : ""} />
          </button>

          {/* Export to Excel Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 font-bold text-xs tracking-wide transition-all shadow-sm active:scale-95"
          >
            <Download size={15} className="text-gray-500" />
            <span>ส่งออก Excel</span>
          </button>

          {/* View Mode Toggle (Table / Grid) */}
          <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200/80">
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

          {/* Primary CTA: New Repair Order */}
          <Link
            href="/repair-orders/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs tracking-wider uppercase shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>สร้างใบรับซ่อมใหม่</span>
          </Link>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
          2. KPI SUMMARY STRIP (4 Perfectly Symmetrical Columns)
      ─────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: "ALL",
            title: "ทั้งหมด (Total)",
            count: totalCount,
            sub: "รายการซ่อมทั้งหมดในระบบ",
            icon: <FileText size={20} className="text-gray-600" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-400",
            active: activeTab === "ALL",
          },
          {
            id: "PENDING",
            title: "รอซ่อม / รอตรวจ (Pending)",
            count: pendingCount,
            sub: `${totalCount ? Math.round((pendingCount / totalCount) * 100) : 0}% ของงานทั้งหมด`,
            icon: <Clock size={20} className="text-[#ff2301]" />,
            iconBg: "bg-red-50",
            borderAccent: "border-l-4 border-[#ff2301]",
            active: activeTab === "PENDING",
          },
          {
            id: "REPAIR",
            title: "กำลังซ่อม (Under Repair)",
            count: underRepairCount,
            sub: `${totalCount ? Math.round((underRepairCount / totalCount) * 100) : 0}% ของงานทั้งหมด`,
            icon: <Wrench size={20} className="text-gray-700" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-700",
            active: activeTab === "REPAIR",
          },
          {
            id: "COMPLETED",
            title: "เสร็จสิ้น / ส่งคืน (Completed)",
            count: completedCount,
            sub: `${totalCount ? Math.round((completedCount / totalCount) * 100) : 0}% ของงานทั้งหมด`,
            icon: <CheckCircle2 size={20} className="text-gray-900" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-900",
            active: activeTab === "COMPLETED",
          },
        ].map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveTab(card.id as any)}
            className={`w-full text-left bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md ${card.borderAccent} ${
              card.active
                ? "ring-2 ring-[#ff2301] border-transparent"
                : "border-gray-200/90 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${card.iconBg}`}
              >
                {card.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {card.count}
              </span>
              <span className="text-xs font-semibold text-gray-400">รายการ</span>
            </div>
            <p className="text-[11px] font-medium text-gray-400 mt-1 truncate">
              {card.sub}
            </p>

            {/* Subtle Active Indicator Dot */}
            {card.active && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff2301]" />
            )}
          </button>
        ))}
      </section>

      {/* ───────────────────────────────────────────────────────────
          3. SYMMETRICAL SEARCH & MULTI-FILTER TOOLBAR
      ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/90 shadow-sm space-y-4">
        {/* Top Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-100 custom-scrollbar">
          {[
            { id: "ALL", label: "ทั้งหมด", count: totalCount },
            { id: "PENDING", label: "รอตรวจ / รออนุมัติ", count: pendingCount },
            { id: "REPAIR", label: "กำลังดำเนินการซ่อม", count: underRepairCount },
            { id: "OUTSOURCE", label: "ส่งซ่อมภายนอก", count: outsourceCount },
            { id: "COMPLETED", label: "ส่งมอบสำเร็จ / ปิดงาน", count: completedCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#ff2301] text-white shadow-sm shadow-red-500/20"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Universal Search Box (Span 4) */}
          <div className="lg:col-span-4 relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="ค้นหาเลขที่งาน, ชื่อลูกค้า, อาการ, ช่าง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Specific Status Selector (Span 2) */}
          <div className="lg:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all appearance-none cursor-pointer pr-8"
            >
              <option value="">สถานะทั้งหมด</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Technician Filter (Span 2) */}
          <div className="lg:col-span-2 relative">
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="w-full text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all appearance-none cursor-pointer pr-8"
            >
              <option value="">ช่างซ่อมทั้งหมด</option>
              <option value="__unassigned__">ยังไม่ได้มอบหมายช่าง (Unassigned)</option>
              {serviceUsers?.map((u: any) => (
                <option key={u.id} value={u.fullName}>
                  {u.fullName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Company / Customer Filter (Span 2) */}
          <div className="lg:col-span-2 relative">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all appearance-none cursor-pointer truncate pr-8"
            >
              <option value="">ลูกค้า/บริษัททั้งหมด</option>
              {companies?.map((c: any) => (
                <option key={c.id || c.companyName} value={c.companyName}>
                  {c.companyName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Date Period Filter (Span 1 or 2) */}
          <div className="lg:col-span-1 relative">
            <select
              value={datePeriod}
              onChange={(e) => setDatePeriod(e.target.value as any)}
              className="w-full text-xs font-semibold border border-gray-200 rounded-xl px-2.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all appearance-none cursor-pointer pr-7"
            >
              <option value="ALL">ทุกช่วงเวลา</option>
              <option value="TODAY">วันนี้</option>
              <option value="WEEK">7 วันล่าสุด</option>
              <option value="MONTH">เดือนนี้</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Reset Filters Button (Span 1) */}
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
                {filteredRepairs.length} ผลลัพธ์
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Datalist for technician autocomplete */}
      <datalist id="technician-autocomplete">
        {users?.map((u: any) => (
          <option key={u.id} value={u.fullName} />
        ))}
      </datalist>

      {/* ───────────────────────────────────────────────────────────
          4. MAIN VIEW: MODERN TABLE OR GRID CARDS
      ─────────────────────────────────────────────────────────── */}
      {viewMode === "table" ? (
        /* ──── TABLE VIEW ──── */
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[980px]">
              {/* Table Header */}
              <thead className="bg-gray-50/80 border-b border-gray-200/90 select-none">
                <tr>
                  {/* Date Column */}
                  <th
                    onClick={() => handleSort("date")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>วันที่รับซ่อม</span>
                      {sortField === "date" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Job Number Column */}
                  <th
                    onClick={() => handleSort("jobNumber")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>เลขที่งาน</span>
                      {sortField === "jobNumber" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Customer Column */}
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

                  {/* Item / Symptoms Column */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider min-w-[200px]">
                    สินค้า & อาการเสีย
                  </th>

                  {/* Sales Person Column */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    พนักงานขาย
                  </th>

                  {/* Technician Assignee */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider min-w-[170px]">
                    ช่างผู้รับผิดชอบ
                  </th>

                  {/* Status Column */}
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>สถานะงาน</span>
                      {sortField === "status" ? (
                        sortAsc ? <ArrowUp size={13} className="text-[#ff2301]" /> : <ArrowDown size={13} className="text-[#ff2301]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </div>
                  </th>

                  {/* Actions Column (Centered) */}
                  <th className="py-3.5 px-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    จัดการ
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {paginatedRepairs.length > 0 ? (
                  paginatedRepairs.map((record: any) => {
                    const statusObj = STATUS_CONFIG[record.job?.currentStep] || {
                      label: record.job?.currentStep || "รอรับซ่อม",
                      badge: "bg-gray-100 text-gray-700 border-gray-200",
                      dot: "bg-gray-400",
                    };
                    const itemsList = parseItems(record.items);
                    const mainItem = record.job?.item || itemsList[0]?.type || "งานซ่อมทั่วไป";
                    const relativeDays = getRelativeDays(record.receivedDate || record.createdAt);

                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedOrder(record)}
                        className="group hover:bg-red-50/30 transition-colors cursor-pointer"
                      >
                        {/* 1. Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">
                              {formatThaiDate(record.receivedDate || record.createdAt)}
                            </span>
                            {relativeDays && (
                              <span className="text-[10px] font-medium text-gray-400">
                                {relativeDays}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Job Number */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {record.jobId ? (
                              <Link
                                href={`/jobs?jobId=${record.jobId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono font-black text-xs text-[#ff2301] hover:underline"
                                title="เปิดหน้ารายละเอียด Job"
                              >
                                {record.job?.jobNumber || "—"}
                              </Link>
                            ) : (
                              <span className="font-mono font-black text-xs text-gray-800">
                                {record.job?.jobNumber || "—"}
                              </span>
                            )}
                            <button
                              onClick={(e) => handleCopyJobNumber(record.job?.jobNumber || "", e)}
                              className="text-gray-300 hover:text-gray-600 p-1 rounded-md transition-colors"
                              title="คัดลอกเลขที่งาน"
                            >
                              {copiedJobId === record.job?.jobNumber ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          {record.workType && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold text-gray-400 uppercase">
                              {record.workType}
                            </span>
                          )}
                        </td>

                        {/* 3. Customer / Company */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col max-w-[200px]">
                            <p className="font-bold text-gray-900 truncate">
                              {record.customerCompany || record.company || record.job?.customerName || "—"}
                            </p>
                            {record.phoneNumber && (
                              <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone size={10} className="text-gray-400 shrink-0" />
                                <span>{record.phoneNumber}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Item & Symptoms */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col max-w-[220px]">
                            <p className="font-bold text-gray-800 truncate" title={mainItem}>
                              {mainItem}
                            </p>
                            {record.symptoms ? (
                              <p
                                className="text-[11px] text-gray-500 truncate mt-0.5"
                                title={record.symptoms}
                              >
                                อาการ: {record.symptoms}
                              </p>
                            ) : itemsList.length > 0 && itemsList[0]?.model ? (
                              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                รุ่น: {itemsList[0].model}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        {/* 5. Sales Person */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {(record.job?.sellerName || record.salesPerson || "?").charAt(0)}
                            </div>
                            <span className="font-medium text-gray-700">
                              {record.job?.sellerName || record.salesPerson || "—"}
                            </span>
                          </div>
                        </td>

                        {/* 6. Technician Assignee */}
                        <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {record.jobId ? (
                            <div className="relative inline-block w-full max-w-[160px]">
                              <input
                                type="text"
                                list="technician-autocomplete"
                                defaultValue={record.technicianName || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (record.technicianName || "")) {
                                    handleTechnicianChange(record.jobId, e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                }}
                                disabled={isUpdatingTech === record.jobId}
                                placeholder="ระบุช่าง..."
                                className={`w-full px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all ${
                                  record.technicianName
                                    ? "bg-white text-gray-800 border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301]"
                                    : "bg-red-50/50 text-red-600 border-red-200 placeholder-red-300"
                                } ${isUpdatingTech === record.jobId ? "opacity-50" : ""}`}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 font-medium">
                              {record.technicianName || "—"}
                            </span>
                          )}
                        </td>

                        {/* 7. Status Column */}
                        <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {record.jobId ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative inline-block">
                                <select
                                  value={record.job?.currentStep || ""}
                                  onChange={(e) => handleStatusChange(record.jobId, e.target.value)}
                                  disabled={isUpdatingStatus === record.jobId}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border tracking-wide appearance-none cursor-pointer outline-none pr-6 transition-all ${
                                    statusObj.badge
                                  } ${isUpdatingStatus === record.jobId ? "opacity-50" : ""}`}
                                >
                                  {Object.entries(STATUS_CONFIG).map(([stepKey, val]) => (
                                    <option key={stepKey} value={stepKey}>
                                      {val.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current opacity-70">
                                  <ChevronDown size={12} />
                                </div>
                              </div>

                              {record.inverterQc ? (
                                <button
                                  type="button"
                                  onClick={() => setQcModalOrder(record)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                                  title="ตรวจ QC INVERTER แล้ว (คลิกเพื่อดู / พิมพ์ PDF)"
                                >
                                  <Check size={10} className="stroke-[3]" /> QC
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                              รอรับซ่อม
                            </span>
                          )}
                        </td>

                        {/* 8. Symmetrical Actions Cluster */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Quick View Button */}
                            <button
                              onClick={() => setSelectedOrder(record)}
                              className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="ดูรายละเอียดฉบับย่อ"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Inverter QC Button */}
                            <button
                              type="button"
                              onClick={() => setQcModalOrder(record)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                record.inverterQc
                                  ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 bg-emerald-50/70"
                                  : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                              }`}
                              title={
                                record.inverterQc
                                  ? "ใบตรวจ QC INVERTER (บันทึกแล้ว) - คลิกดู/พิมพ์ PDF (QC-EN-01)"
                                  : "ตรวจสอบ QC ของ INVERTER หลังซ่อมเสร็จ (QC-EN-01)"
                              }
                            >
                              <ClipboardCheck size={15} />
                            </button>

                            {/* Print PDF Button */}
                            <Link
                              href={`/repair-orders/${record.jobId || record.id}/print`}
                              target="_blank"
                              className="p-1.5 text-gray-400 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                              title="พิมพ์ใบรับซ่อม (PDF)"
                            >
                              <Printer size={15} />
                            </Link>

                            {/* Edit Button */}
                            <Link
                              href={`/repair-orders/${record.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="แก้ไขข้อมูลใบรับซ่อม"
                            >
                              <Edit2 size={15} />
                            </Link>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(record.id, record.job?.jobNumber)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบใบรับซ่อม"
                            >
                              <Trash2 size={15} />
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
                          <Wrench size={28} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-bold text-gray-700">
                          {searchTerm || activeFiltersCount > 0
                            ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"
                            : "ยังไม่มีรายการใบรับซ่อมในระบบ"}
                        </p>
                        <p className="text-xs text-gray-400 text-center">
                          {searchTerm || activeFiltersCount > 0
                            ? "ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูข้อมูลทั้งหมด"
                            : "เริ่มต้นด้วยการสร้างใบรับซ่อมใหม่เพื่อบันทึกงานซ่อมของลูกค้า"}
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
                            href="/repair-orders/new"
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
                          >
                            <Plus size={14} />
                            <span>สร้างใบรับซ่อมแรก</span>
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
                  {filteredRepairs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </b>{" "}
                -{" "}
                <b className="text-gray-900">
                  {Math.min(currentPage * pageSize, filteredRepairs.length)}
                </b>{" "}
                จากทั้งหมด <b className="text-gray-900">{filteredRepairs.length}</b> รายการ
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
            {paginatedRepairs.map((record: any) => {
              const statusObj = STATUS_CONFIG[record.job?.currentStep] || {
                label: record.job?.currentStep || "รอรับซ่อม",
                badge: "bg-gray-100 text-gray-700 border-gray-200",
                dot: "bg-gray-400",
              };
              const itemsList = parseItems(record.items);
              const mainItem = record.job?.item || itemsList[0]?.type || "งานซ่อมทั่วไป";

              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedOrder(record)}
                  className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between cursor-pointer group"
                >
                  {/* Card Header: Job No & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-[#ff2301]">
                          {record.job?.jobNumber || "—"}
                        </span>
                        <button
                          onClick={(e) => handleCopyJobNumber(record.job?.jobNumber || "", e)}
                          className="text-gray-300 hover:text-gray-600 p-0.5 rounded transition-colors"
                        >
                          {copiedJobId === record.job?.jobNumber ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.badge}`}
                      >
                        {statusObj.label}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="mb-3">
                      <p className="text-sm font-black text-gray-900 line-clamp-1">
                        {record.customerCompany || record.company || record.job?.customerName || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        วันที่รับ: {formatThaiDate(record.receivedDate || record.createdAt)}
                      </p>
                    </div>

                    {/* Item Box */}
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                          <Cpu size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {mainItem}
                          </p>
                          {record.symptoms && (
                            <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                              อาการ: {record.symptoms}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Personnel summary */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          พนักงานขาย
                        </span>
                        <span className="font-bold text-gray-700 truncate block">
                          {record.job?.sellerName || record.salesPerson || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          ช่างซ่อม
                        </span>
                        {record.technicianName ? (
                          <span className="font-bold text-gray-700 truncate block">
                            {record.technicianName}
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

                  {/* Card Bottom: Symmetrical Action Buttons */}
                  <div
                    className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedOrder(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>ดูรายละเอียด</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQcModalOrder(record)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          record.inverterQc
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-gray-50 text-gray-700 hover:bg-amber-50 hover:text-amber-700 border border-gray-200"
                        }`}
                        title="ตรวจสอบ QC ของ INVERTER (QC-EN-01)"
                      >
                        <ClipboardCheck
                          size={13}
                          className={record.inverterQc ? "text-emerald-600" : "text-gray-500"}
                        />
                        <span>{record.inverterQc ? "QC แล้ว" : "ตรวจ QC"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/repair-orders/${record.jobId || record.id}/print`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                        title="พิมพ์ใบรับซ่อม"
                      >
                        <Printer size={15} />
                      </Link>

                      <Link
                        href={`/repair-orders/${record.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <Edit2 size={15} />
                      </Link>

                      <button
                        onClick={() => handleDelete(record.id, record.job?.jobNumber)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Symmetrical Pagination for Grid */}
          <div className="bg-white rounded-3xl p-4 sm:px-6 border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500 font-medium">
              แสดง {filteredRepairs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, filteredRepairs.length)} จากทั้งหมด{" "}
              {filteredRepairs.length} รายการ
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

      {/* ───────────────────────────────────────────────────────────
          5. QUICK PREVIEW SLIDE-OVER DRAWER (MODERN & SYMMETRICAL)
      ─────────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Slide-over panel */}
          <div className="relative w-full max-w-2xl bg-white shadow-2xl border-l border-gray-200 flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#c71a00] flex items-center justify-center text-white shadow-md shadow-red-500/20">
                  <Wrench size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-[#ff2301]">
                      {selectedOrder.job?.jobNumber || "—"}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-200/80 text-gray-700">
                      {selectedOrder.workType || "ซ่อม"}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900 mt-0.5">
                    {selectedOrder.customerCompany ||
                      selectedOrder.company ||
                      selectedOrder.job?.customerName ||
                      "—"}
                  </h2>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Quick Status Bar */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    สถานะปัจจุบัน
                  </span>
                  <span className="text-sm font-black text-gray-900">
                    {STATUS_CONFIG[selectedOrder.job?.currentStep]?.label ||
                      selectedOrder.job?.currentStep ||
                      "รอรับซ่อม"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    วันที่รับซ่อม
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    {formatThaiDate(selectedOrder.receivedDate || selectedOrder.createdAt)}
                  </span>
                </div>
              </div>

              {/* General Information Card */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#ff2301]" /> ข้อมูลทั่วไป & ผู้ติดต่อ
                </h3>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-gray-200 bg-white">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      บริษัท / ลูกค้า
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">
                      {selectedOrder.customerCompany || selectedOrder.company || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      เบอร์โทรศัพท์
                    </span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <Phone size={12} className="text-[#ff2301] shrink-0" />
                      <span>{selectedOrder.phoneNumber || "—"}</span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      ที่อยู่ลูกค้า
                    </span>
                    <p className="text-xs font-medium text-gray-700 mt-0.5 flex items-start gap-1.5">
                      <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                      <span>{selectedOrder.customerAddress || "—"}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      เลขที่ใบส่งของ / Invoice
                    </span>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5 font-mono">
                      {selectedOrder.invoiceNo || selectedOrder.deliveryNoteNo || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      วิธีส่งมอบ
                    </span>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">
                      {selectedOrder.deliveryMethod || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List Card */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-[#ff2301]" /> รายการอุปกรณ์ที่รับซ่อม
                </h3>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-400 uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">ประเภท / สินค้า</th>
                        <th className="py-2.5 px-3">ยี่ห้อ / รุ่น</th>
                        <th className="py-2.5 px-3">Serial No.</th>
                        <th className="py-2.5 px-3 text-center">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parseItems(selectedOrder.items).length > 0 ? (
                        parseItems(selectedOrder.items).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 font-bold text-gray-900">
                              {item.type || selectedOrder.job?.item || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-mono">
                              {item.serial || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-gray-900">
                              {item.qty || 1}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-400">
                            {selectedOrder.job?.item || "ไม่มีรายละเอียดอุปกรณ์"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Symptoms & Settings */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-[#ff2301]" /> อาการเสีย & รายละเอียดเชิงเทคนิค
                </h3>
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      อาการเสียที่ลูกค้าแจ้ง
                    </span>
                    <p className="text-xs text-gray-800 font-medium mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {selectedOrder.symptoms || "ไม่ได้ระบุอาการเสีย"}
                    </p>
                  </div>
                  {selectedOrder.settings && (
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">
                        การตั้งค่า / หมายเหตุเพิ่มเติม
                      </span>
                      <p className="text-xs text-gray-800 font-medium mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                        {selectedOrder.settings}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist Items */}
              {Object.keys(parseChecklist(selectedOrder.checklist)).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-[#ff2301]" /> รายการอุปกรณ์ที่ส่งมาพร้อมเครื่อง
                  </h3>
                  <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-gray-200 bg-white">
                    {Object.entries(parseChecklist(selectedOrder.checklist)).map(([k, checked]) => {
                      if (!checked) return null;
                      const label = CHECKLIST_LABELS[k] || k;
                      return (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200"
                        >
                          <Check size={13} className="text-[#ff2301]" />
                          <span>{label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personnel */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-[#ff2301]" /> เจ้าหน้าที่ที่เกี่ยวข้อง
                </h3>
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl border border-gray-200 bg-white text-center">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">
                      ผู้รับซ่อม
                    </span>
                    <p className="text-xs font-bold text-gray-800 mt-1">
                      {selectedOrder.receiverName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">
                      พนักงานขาย
                    </span>
                    <p className="text-xs font-bold text-gray-800 mt-1">
                      {selectedOrder.job?.sellerName || selectedOrder.salesPerson || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">
                      ช่างซ่อม
                    </span>
                    {selectedOrder.technicianName ? (
                      <p className="text-xs font-bold text-gray-800 mt-1">
                        {selectedOrder.technicianName}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-amber-600 mt-1 flex items-center justify-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>ยังไม่ระบุ</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inverter QC Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck size={14} className="text-[#ff2301]" /> ตรวจสอบ QC ของ INVERTER (QC-EN-01)
                  </h3>
                  {selectedOrder.inverterQc ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check size={11} className="stroke-[3]" /> ตรวจ QC แล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      รอตรวจ QC
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-2xl border border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    {selectedOrder.inverterQc ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-800">
                          ผู้ตรวจเช็ค: {selectedOrder.inverterQc.inspectorName || selectedOrder.technicianName || "—"}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          วันที่บันทึก: {formatThaiDate(selectedOrder.inverterQc.inspectorDate || selectedOrder.inverterQc.receiveDate)} • แบบฟอร์ม QC-EN-01/Rev.00
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-gray-700">ยังไม่ได้บันทึกผลการตรวจสอบ QC</p>
                        <p className="text-[11px] text-gray-400">กรอกค่าแรงดัน, ระยะเวลาเทส และการตั้งค่าเพื่อออกเอกสาร A4</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQcModalOrder(selectedOrder)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all shadow-sm cursor-pointer"
                  >
                    <ClipboardCheck size={14} />
                    <span>{selectedOrder.inverterQc ? "ดู / พิมพ์ PDF / แก้ไข QC" : "กรอกข้อมูล QC ทันที"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                ปิด
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQcModalOrder(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  title="เปิดฟอร์ม QC INVERTER"
                >
                  <ClipboardCheck size={14} />
                  <span>ตรวจ QC INVERTER</span>
                </button>

                <Link
                  href={`/repair-orders/${selectedOrder.jobId || selectedOrder.id}/print`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold shadow-sm transition-all"
                >
                  <Printer size={14} />
                  <span>พิมพ์ PDF</span>
                </Link>

                <Link
                  href={`/repair-orders/${selectedOrder.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Edit2 size={14} />
                  <span>แก้ไขข้อมูล</span>
                </Link>

                {selectedOrder.jobId && (
                  <Link
                    href={`/jobs?jobId=${selectedOrder.jobId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
                  >
                    <span>ดู Job</span>
                    <ExternalLink size={13} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inverter QC Inspection & PDF Modal ── */}
      <InverterQcModal
        isOpen={!!qcModalOrder}
        order={qcModalOrder}
        currentUserName={currentUserName}
        users={users}
        onClose={() => setQcModalOrder(null)}
        onSaved={(updatedOrder) => {
          setRepairOrders((prev) =>
            prev.map((ro) => (ro.id === updatedOrder.id ? { ...ro, ...updatedOrder } : ro))
          );
          if (selectedOrder?.id === updatedOrder.id) {
            setSelectedOrder((prev: any) => (prev ? { ...prev, ...updatedOrder } : null));
          }
          setQcModalOrder((prev: any) => (prev ? { ...prev, ...updatedOrder } : null));
        }}
      />
    </div>
  );
}
