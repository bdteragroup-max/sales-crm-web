"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Search,
  FileSpreadsheet,
  LayoutGrid,
  Table2,
  Settings2,
  Filter,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Eye,
  RotateCcw,
  X,
  Check,
  Building2,
  FileText,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { deleteProject, generateJobForProject } from "@/app/actions/projects";
import { calculateProjectProgress } from "@/app/lib/project-utils";

interface ProjectsClientPageProps {
  currentUser: any;
  projects: any[];
  isManager: boolean;
}

export default function ProjectsClientPage({
  currentUser,
  projects,
  isManager,
}: ProjectsClientPageProps) {
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedManager, setSelectedManager] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");

  // Sorting & View States
  const [sortBy, setSortBy] = useState<string>("latest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Column Visibility Menu
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [generateJobProject, setGenerateJobProject] = useState<any | null>(null);
  const [generateJobCompanyCode, setGenerateJobCompanyCode] = useState<string>("");
  const [isGeneratingJob, setIsGeneratingJob] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    sequence: true,
    projectNumber: true,
    name: true,
    category: true,
    province: true,
    value: true,
    manager: true,
    timeline: true,
    progress: true,
    status: true,
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = useMemo(() => new Date(), []);

  // Unique Dropdown Values
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.projectCategory) set.add(p.projectCategory.trim());
    });
    return Array.from(set).sort();
  }, [projects]);

  const managerNames = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.manager?.fullName) set.add(p.manager.fullName.trim());
    });
    return Array.from(set).sort();
  }, [projects]);

  const provinces = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.province) set.add(p.province.trim());
    });
    return Array.from(set).sort();
  }, [projects]);

  // Overall KPI metrics
  const stats = useMemo(() => {
    const totalCount = projects.length;
    const inProgressProjects = projects.filter((p) => p.status === "In progress");
    const completedProjects = projects.filter((p) => p.status === "Completed");
    const overdueProjects = projects.filter((p) => {
      if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
        return false;
      return new Date(p.endDate) < today;
    });

    const totalValue = projects.reduce(
      (sum, p) => sum + (Number(p.projectValue) || 0),
      0
    );
    const inProgressValue = inProgressProjects.reduce(
      (sum, p) => sum + (Number(p.projectValue) || 0),
      0
    );
    const completedValue = completedProjects.reduce(
      (sum, p) => sum + (Number(p.projectValue) || 0),
      0
    );
    const overdueValue = overdueProjects.reduce(
      (sum, p) => sum + (Number(p.projectValue) || 0),
      0
    );

    return {
      total: totalCount,
      totalValue,
      inProgress: inProgressProjects.length,
      inProgressValue,
      completed: completedProjects.length,
      completedValue,
      overdue: overdueProjects.length,
      overdueValue,
    };
  }, [projects, today]);

  // Handle KPI Click to filter
  const handleKpiFilter = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus("all");
    } else {
      setSelectedStatus(status);
    }
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSelectedManager("all");
    setSelectedProvince("all");
    setSelectedJobFilter("all");
    setSortBy("latest");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const isFilterActive =
    searchTerm !== "" ||
    selectedStatus !== "all" ||
    selectedCategory !== "all" ||
    selectedManager !== "all" ||
    selectedProvince !== "all" ||
    selectedJobFilter !== "all";

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchNumber = p.projectNumber?.toLowerCase().includes(q);
        const matchClient = p.clientName?.toLowerCase().includes(q);
        const matchContract = p.contractNumber?.toLowerCase().includes(q);
        const matchManager = p.manager?.fullName?.toLowerCase().includes(q);
        const matchProvince = p.province?.toLowerCase().includes(q);
        const matchJob = p.job?.jobNumber?.toLowerCase().includes(q);
        if (
          !matchName &&
          !matchNumber &&
          !matchClient &&
          !matchContract &&
          !matchManager &&
          !matchProvince &&
          !matchJob
        ) {
          return false;
        }
      }

      // Status
      if (selectedStatus === "in_progress" && p.status !== "In progress")
        return false;
      if (selectedStatus === "completed" && p.status !== "Completed")
        return false;
      if (selectedStatus === "planning" && p.status !== "Planning") return false;
      if (selectedStatus === "paused" && p.status !== "Paused") return false;
      if (selectedStatus === "cancelled" && p.status !== "Cancelled")
        return false;
      if (selectedStatus === "overdue") {
        if (p.status === "Completed" || p.status === "Cancelled" || !p.endDate)
          return false;
        if (new Date(p.endDate) >= today) return false;
      }
      if (selectedStatus === "no_job" && p.jobId) return false;

      // Category
      if (selectedCategory !== "all" && p.projectCategory !== selectedCategory)
        return false;

      // Manager
      if (selectedManager !== "all" && p.manager?.fullName !== selectedManager)
        return false;

      // Province
      if (selectedProvince !== "all" && p.province !== selectedProvince)
        return false;

      // Job Linkage
      if (selectedJobFilter === "linked" && !p.jobId) return false;
      if (selectedJobFilter === "unlinked" && p.jobId) return false;

      return true;
    });
  }, [
    projects,
    searchTerm,
    selectedStatus,
    selectedCategory,
    selectedManager,
    selectedProvince,
    selectedJobFilter,
    today,
  ]);

  // Sorted projects
  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];

    list.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "latest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateB - dateA;
      } else if (sortBy === "projectNumber") {
        comparison = (a.projectNumber || "").localeCompare(
          b.projectNumber || "",
          "th"
        );
      } else if (sortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "", "th");
      } else if (sortBy === "value") {
        const valA = Number(a.projectValue) || 0;
        const valB = Number(b.projectValue) || 0;
        comparison = valB - valA;
      } else if (sortBy === "progress") {
        const progA = calculateProjectProgress(a);
        const progB = calculateProjectProgress(b);
        comparison = progB - progA;
      } else if (sortBy === "endDate") {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        comparison = dateA - dateB;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    return list;
  }, [filteredProjects, sortBy, sortOrder]);

  // Paginated projects
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage) || 1;
  const paginatedProjects = useMemo(() => {
    if (itemsPerPage >= 9999) return sortedProjects;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProjects, currentPage, itemsPerPage]);

  const handleHeaderSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = sortedProjects.map((p, index) => {
      const overallProgress = calculateProjectProgress(p);
      return {
        "ลำดับ": index + 1,
        "รหัสโครงการ": p.projectNumber || "",
        "ชื่อโครงการ": p.name || "",
        "หมวดหมู่": p.projectCategory || "ไม่ระบุ",
        "จังหวัด": p.province || "ไม่ระบุ",
        "ลูกค้า": p.clientName || "",
        "เลขที่สัญญา": p.contractNumber || "",
        "มูลค่าโครงการ (บาท)": Number(p.projectValue) || 0,
        "งบประมาณ (บาท)": Number(p.budget) || 0,
        "ผู้จัดการโครงการ": p.manager?.fullName || "ไม่ระบุ",
        "วันเริ่มต้น": p.startDate
          ? new Date(p.startDate).toLocaleDateString("th-TH")
          : "-",
        "วันสิ้นสุด": p.endDate
          ? new Date(p.endDate).toLocaleDateString("th-TH")
          : "-",
        "ความคืบหน้า (%)": overallProgress,
        "สถานะ": p.status || "",
        "รหัส Job": p.job?.jobNumber || "ยังไม่มี Job",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "โครงการทั้งหมด");
    XLSX.writeFile(
      workbook,
      `ทะเบียนโครงการ_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Generate Job Action
  const handleGenerateJob = async () => {
    if (!generateJobProject || !generateJobCompanyCode) return;
    setIsGeneratingJob(true);
    try {
      await generateJobForProject(
        generateJobProject.id,
        generateJobCompanyCode
      );
      setGenerateJobProject(null);
      setGenerateJobCompanyCode("");
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถสร้าง Job ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsGeneratingJob(false);
    }
  };

  // Delete Action
  const confirmDelete = async () => {
    if (!deleteConfirmProject) return;
    setIsDeleting(true);
    try {
      await deleteProject(deleteConfirmProject.id);
      setDeleteConfirmProject(null);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบโครงการ");
    } finally {
      setIsDeleting(false);
    }
  };

  const columnsList = [
    { key: "sequence", label: "ลำดับ (Seq)" },
    { key: "projectNumber", label: "รหัส (PJ No.)" },
    { key: "name", label: "ชื่อโครงการ (Project Name)" },
    { key: "category", label: "หมวดหมู่ (Category)" },
    { key: "province", label: "จังหวัด (Province)" },
    { key: "value", label: "มูลค่าโครงการ (Value)" },
    { key: "manager", label: "ผู้จัดการ (PM)" },
    { key: "timeline", label: "กำหนดส่งมอบ (Timeline)" },
    { key: "progress", label: "ความคืบหน้า (%)" },
    { key: "status", label: "สถานะ (Status)" },
  ];

  // Helper for deadline status
  const getDeadlineBadge = (endDateStr?: string, status?: string) => {
    if (status === "Completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          <CheckCircle2 size={11} className="text-gray-500" />
          <span>ส่งมอบแล้ว</span>
        </span>
      );
    }
    if (!endDateStr) {
      return <span className="text-xs text-gray-400 font-medium">ไม่ระบุ</span>;
    }
    const endDate = new Date(endDateStr);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
          <AlertTriangle size={11} className="text-red-600 shrink-0" />
          <span>เกินกำหนด {Math.abs(diffDays)} วัน</span>
        </span>
      );
    }
    if (diffDays <= 14) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
          <Clock size={11} className="text-red-500 shrink-0" />
          <span>เหลืออีก {diffDays} วัน</span>
        </span>
      );
    }
    return (
      <span className="text-xs text-gray-700 font-medium">
        {endDate.toLocaleDateString("th-TH")}
      </span>
    );
  };

  // Helper for status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-gray-900 text-white shadow-xs">
            <CheckCircle2 size={11} className="text-gray-300" />
            <span>เสร็จสมบูรณ์</span>
          </span>
        );
      case "In progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-gray-900 border border-gray-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span>กำลังดำเนินการ</span>
          </span>
        );
      case "Planning":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <Layers size={11} className="text-gray-500" />
            <span>วางแผนงาน</span>
          </span>
        );
      case "Paused":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <AlertCircle size={11} className="text-gray-400" />
            <span>ระงับชั่วคราว</span>
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <X size={11} className="text-red-600" />
            <span>ยกเลิก</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            {status || "ไม่ระบุ"}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* 1. Header Toolbar (Symmetrical 2-Tier Balanced Layout) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Left: Breadcrumbs, Title & Overview */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <Link
                href="/"
                className="hover:text-red-600 transition-colors flex items-center gap-1"
              >
                หน้าหลัก
              </Link>
              <span>/</span>
              <span className="text-gray-500 font-medium">โครงการ (Projects)</span>
              <span>/</span>
              <span className="text-gray-900 font-bold">ทะเบียนโครงการ</span>
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                <ShieldCheck size={11} className="text-red-600" />
                {isManager ? "ผู้จัดการโครงการ (Manager)" : "สมาชิกโครงการ (Member)"}
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FolderOpen size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    {isManager ? "ทะเบียนโครงการทั้งหมด" : "โครงการที่ฉันรับผิดชอบ"}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                    {stats.total.toLocaleString()} รายการ
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {isManager
                    ? "ศูนย์กลางติดตามความคืบหน้า กำหนดการส่งมอบ และบริหารจัดการโครงการแบบเรียลไทม์"
                    : "รายการโครงการและภาระงานที่ได้รับมอบหมาย"}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Symmetrical Action Buttons Cluster (Fixed Single-Line Layout) */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end shrink-0">
            {/* Primary Action Button */}
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus size={15} />
              <span>สร้างโครงการใหม่</span>
            </Link>

            {/* Secondary Action: Dashboard */}
            <Link
              href="/projects/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xs transition-colors shrink-0"
            >
              <Activity size={14} className="text-red-600" />
              <span>แดชบอร์ด</span>
            </Link>

            {/* Secondary Action: Excel Export */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xs transition-colors shrink-0"
              title="ส่งออกไฟล์ Excel"
            >
              <FileSpreadsheet size={14} className="text-gray-500" />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Symmetrical 4-Card KPI Stat Row (Click to filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Card 1: All Projects */}
        <div
          onClick={() => handleKpiFilter("all")}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs ${
            selectedStatus === "all"
              ? "border-red-600 ring-2 ring-red-600/10 shadow-sm"
              : "border-gray-200 hover:border-gray-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>โครงการทั้งหมด</span>
                {selectedStatus === "all" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {stats.total.toLocaleString()}
                <span className="text-xs font-medium text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs text-gray-500 pt-0.5">
                มูลค่ารวม{" "}
                <span className="font-bold text-gray-900">
                  ฿{(stats.totalValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-100 transition-colors">
              <FolderOpen size={20} />
            </div>
          </div>
        </div>

        {/* KPI Card 2: In Progress */}
        <div
          onClick={() => handleKpiFilter("in_progress")}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs ${
            selectedStatus === "in_progress"
              ? "border-red-600 ring-2 ring-red-600/10 shadow-sm"
              : "border-gray-200 hover:border-gray-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>กำลังดำเนินการ</span>
                {selectedStatus === "in_progress" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {stats.inProgress.toLocaleString()}
                <span className="text-xs font-medium text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs text-gray-500 pt-0.5">
                มูลค่างาน{" "}
                <span className="font-bold text-gray-900">
                  ฿{(stats.inProgressValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-100 transition-colors">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* KPI Card 3: Completed */}
        <div
          onClick={() => handleKpiFilter("completed")}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs ${
            selectedStatus === "completed"
              ? "border-red-600 ring-2 ring-red-600/10 shadow-sm"
              : "border-gray-200 hover:border-gray-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>เสร็จสมบูรณ์</span>
                {selectedStatus === "completed" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {stats.completed.toLocaleString()}
                <span className="text-xs font-medium text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs text-gray-500 pt-0.5">
                ส่งมอบแล้ว{" "}
                <span className="font-bold text-gray-900">
                  ฿{(stats.completedValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-100 transition-colors">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* KPI Card 4: Overdue */}
        <div
          onClick={() => handleKpiFilter("overdue")}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs ${
            selectedStatus === "overdue"
              ? "border-red-600 ring-2 ring-red-600/10 shadow-sm bg-red-50/10"
              : "border-gray-200 hover:border-red-200 hover:shadow-xs"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>เกินกำหนดส่งมอบ</span>
                {selectedStatus === "overdue" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl font-black text-red-600 tracking-tight">
                {stats.overdue.toLocaleString()}
                <span className="text-xs font-medium text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs text-red-600/80 pt-0.5">
                มูลค่างานเสี่ยง{" "}
                <span className="font-bold text-red-700">
                  ฿{(stats.overdueValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Symmetrical Filter & View Control Panel */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        {/* Row 1: Status Filter Pills on Left, View & Column Controls on Right (Perfect Symmetrical Row) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
          {/* Left: Capsule Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0 custom-scrollbar">
            {[
              { id: "all", label: "ทั้งหมด", count: stats.total },
              { id: "in_progress", label: "กำลังดำเนินการ", count: stats.inProgress },
              {
                id: "planning",
                label: "วางแผนงาน",
                count: projects.filter((p) => p.status === "Planning").length,
              },
              { id: "completed", label: "เสร็จสิ้น", count: stats.completed },
              { id: "overdue", label: "เกินกำหนด", count: stats.overdue },
              {
                id: "paused",
                label: "ระงับชั่วคราว",
                count: projects.filter((p) => p.status === "Paused").length,
              },
              {
                id: "no_job",
                label: "ยังไม่เชื่อมโยง Job",
                count: projects.filter((p) => !p.jobId).length,
              },
            ].map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedStatus(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all border ${
                    isActive
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Symmetrical View Switcher & Column Customizer (Never Wraps Awkwardly) */}
          <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Table2 size={13} />
                <span>ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <LayoutGrid size={13} />
                <span>การ์ด</span>
              </button>
            </div>

            {/* Column Customizer (Table View Only) */}
            {viewMode === "table" && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
                  title="ปรับแต่งคอลัมน์"
                >
                  <Settings2 size={14} className="text-gray-500" />
                  <span>คอลัมน์</span>
                  <ChevronDown size={12} className="text-gray-400" />
                </button>
                {showColumnMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 pb-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">
                        แสดง/ซ่อนคอลัมน์
                      </span>
                      <button
                        onClick={() =>
                          setVisibleColumns({
                            sequence: true,
                            projectNumber: true,
                            name: true,
                            category: true,
                            province: true,
                            value: true,
                            manager: true,
                            timeline: true,
                            progress: true,
                            status: true,
                          })
                        }
                        className="text-[10px] font-bold text-red-600 hover:underline"
                      >
                        รีเซ็ต
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                      {columnsList.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs font-medium text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key] ?? true}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500/20"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Search & Multi-Faceted Filters (12-Column Balanced Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ, รหัส PJ, ลูกค้า, จังหวัด, PM..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all text-gray-900"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="all">หมวดหมู่ทั้งหมด</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={selectedManager}
              onChange={(e) => {
                setSelectedManager(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="all">ผู้จัดการ (ทุกคน)</option>
              {managerNames.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Province Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="all">จังหวัดทั้งหมด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Selector (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="latest">เรียง: ล่าสุด</option>
              <option value="projectNumber">เรียง: รหัสโครงการ</option>
              <option value="name">เรียง: ชื่อโครงการ (ก-ฮ)</option>
              <option value="value">เรียง: มูลค่าโครงการ</option>
              <option value="progress">เรียง: ความคืบหน้า (%)</option>
              <option value="endDate">เรียง: กำหนดส่งมอบ</option>
            </select>
          </div>
        </div>

        {/* Active Filter Strip */}
        {isFilterActive && (
          <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <Filter size={13} className="text-red-600" />
              <span>
                กำลังกรองข้อมูล (พบ {sortedProjects.length} จาก {projects.length} โครงการ):
              </span>
              {searchTerm && (
                <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-lg border border-red-100">
                  คำค้น: {searchTerm}
                </span>
              )}
              {selectedStatus !== "all" && (
                <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-lg border border-gray-200">
                  สถานะ: {selectedStatus}
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-lg border border-gray-200">
                  หมวดหมู่: {selectedCategory}
                </span>
              )}
              {selectedManager !== "all" && (
                <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-lg border border-gray-200">
                  PM: {selectedManager}
                </span>
              )}
              {selectedProvince !== "all" && (
                <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-lg border border-gray-200">
                  จังหวัด: {selectedProvince}
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
            >
              <RotateCcw size={12} />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Content: Table View or Grid View (Completely Clean & Immune to Overlapping Bugs) */}
      {viewMode === "table" ? (
        /* TABLE VIEW (Fluid Horizontal Scroll with Zero Colliding Sticky Columns) */
        <div className="bg-white border border-gray-200 shadow-xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1550px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                  {visibleColumns.sequence && (
                    <th className="py-3.5 px-4 w-[60px] text-center whitespace-nowrap">
                      #
                    </th>
                  )}
                  {visibleColumns.projectNumber && (
                    <th
                      className="py-3.5 px-4 w-[130px] text-center whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors"
                      onClick={() => handleHeaderSort("projectNumber")}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>รหัส (PJ No.)</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.name && (
                    <th
                      className="py-3.5 px-4 min-w-[280px] whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors"
                      onClick={() => handleHeaderSort("name")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ชื่อโครงการ & ลูกค้า</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.category && (
                    <th className="py-3.5 px-4 w-[130px] whitespace-nowrap">หมวดหมู่</th>
                  )}
                  {visibleColumns.province && (
                    <th className="py-3.5 px-4 w-[120px] whitespace-nowrap">จังหวัด</th>
                  )}
                  {visibleColumns.value && (
                    <th
                      className="py-3.5 px-4 w-[160px] whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors text-right"
                      onClick={() => handleHeaderSort("value")}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>มูลค่าโครงการ</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.manager && (
                    <th className="py-3.5 px-4 w-[170px] whitespace-nowrap">ผู้จัดการ (PM)</th>
                  )}
                  {visibleColumns.timeline && (
                    <th
                      className="py-3.5 px-4 w-[150px] whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors"
                      onClick={() => handleHeaderSort("endDate")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>กำหนดส่งมอบ</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.progress && (
                    <th
                      className="py-3.5 px-4 w-[150px] whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors"
                      onClick={() => handleHeaderSort("progress")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ความคืบหน้า</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="py-3.5 px-4 w-[140px] whitespace-nowrap text-center">สถานะ</th>
                  )}
                  <th className="py-3.5 px-4 w-[120px] whitespace-nowrap text-right">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedProjects.length > 0 ? (
                  paginatedProjects.map((project, idx) => {
                    const overallProgress = calculateProjectProgress(project);
                    const itemSeq = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-pointer bg-white"
                        onClick={() =>
                          (window.location.href = `/projects/${project.id}`)
                        }
                      >
                        {/* Sequence */}
                        {visibleColumns.sequence && (
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-gray-400">
                              {itemSeq}
                            </span>
                          </td>
                        )}

                        {/* PJ Number */}
                        {visibleColumns.projectNumber && (
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-900 font-black font-mono text-xs border border-gray-200">
                              <FileText size={11} className="text-gray-500" />
                              {project.projectNumber}
                            </span>
                          </td>
                        )}

                        {/* Name & Client */}
                        {visibleColumns.name && (
                          <td className="py-3.5 px-4 min-w-[280px]">
                            <p className="font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1 text-xs sm:text-sm">
                              {project.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                              {project.clientName && (
                                <span className="font-medium text-gray-500 line-clamp-1">
                                  {project.clientName}
                                </span>
                              )}
                              {project.job && (
                                <Link
                                  href={`/jobs?search=${project.job.jobNumber}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-1.5 py-0.5 rounded transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Briefcase size={10} className="text-red-600" />
                                  <span>Job: {project.job.jobNumber}</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Category */}
                        {visibleColumns.category && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                              {project.projectCategory || "-"}
                            </span>
                          </td>
                        )}

                        {/* Province */}
                        {visibleColumns.province && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-medium">
                              <MapPin size={12} className="text-gray-400" />
                              {project.province || "-"}
                            </span>
                          </td>
                        )}

                        {/* Value */}
                        {visibleColumns.value && (
                          <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-black text-xs sm:text-sm text-gray-900">
                            {project.projectValue
                              ? `฿${Number(
                                  project.projectValue
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "-"}
                          </td>
                        )}

                        {/* Manager */}
                        {visibleColumns.manager && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center border border-gray-200 shrink-0">
                                {project.manager?.fullName?.charAt(0) || "?"}
                              </div>
                              <span className="text-xs font-semibold text-gray-700 truncate max-w-[130px]">
                                {project.manager?.fullName || "ยังไม่ระบุ PM"}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Timeline */}
                        {visibleColumns.timeline && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getDeadlineBadge(project.endDate, project.status)}
                          </td>
                        )}

                        {/* Progress */}
                        {visibleColumns.progress && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    overallProgress === 100
                                      ? "bg-gray-900"
                                      : "bg-red-600"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, overallProgress)
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold font-mono text-gray-800 w-8 text-right">
                                {overallProgress}%
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Status */}
                        {visibleColumns.status && (
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {renderStatusBadge(project.status)}
                          </td>
                        )}

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/projects/${project.id}`}
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="ดูรายละเอียด"
                            >
                              <Eye size={15} />
                            </Link>

                            {isManager && (
                              <>
                                <Link
                                  href={`/projects/${project.id}/edit`}
                                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="แก้ไขโครงการ"
                                >
                                  <Pencil size={15} />
                                </Link>

                                {!project.jobId && (
                                  <button
                                    onClick={() => setGenerateJobProject(project)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="สร้าง Job เชื่อมระบบ"
                                  >
                                    <Briefcase size={15} />
                                  </button>
                                )}

                                <button
                                  onClick={() => setDeleteConfirmProject(project)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="ลบโครงการ"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-16 text-center text-gray-400 text-sm"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderOpen size={36} className="text-gray-300" />
                        <p className="font-bold text-gray-700 text-base">
                          ไม่พบโครงการที่ค้นหา
                        </p>
                        <p className="text-xs text-gray-400">
                          ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองด้านบน
                        </p>
                        {isFilterActive && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                          >
                            <RotateCcw size={12} />
                            <span>รีเซ็ตตัวกรอง</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARD VIEW (Symmetrical 3-Column Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginatedProjects.length > 0 ? (
            paginatedProjects.map((project) => {
              const overallProgress = calculateProjectProgress(project);

              return (
                <div
                  key={project.id}
                  onClick={() =>
                    (window.location.href = `/projects/${project.id}`)
                  }
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-red-200 transition-all cursor-pointer flex flex-col justify-between space-y-4 group h-full"
                >
                  {/* Card Header: PJ No. and Status Badge */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-900 font-black font-mono text-xs border border-gray-200">
                        <FileText size={11} className="text-gray-500" />
                        {project.projectNumber}
                      </span>
                      <div>{renderStatusBadge(project.status)}</div>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
                        {project.name}
                      </h3>
                      {project.clientName && (
                        <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">
                          ลูกค้า: {project.clientName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Box (Symmetrical Grid) */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        หมวดหมู่
                      </span>
                      <p className="font-bold text-gray-800 line-clamp-1">
                        {project.projectCategory || "ไม่ระบุ"}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        สถานที่ / จังหวัด
                      </span>
                      <p className="font-bold text-gray-800 line-clamp-1 flex items-center gap-1">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span>{project.province || "-"}</span>
                      </p>
                    </div>

                    <div className="space-y-0.5 col-span-2 pt-1 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        มูลค่าโครงการ
                      </span>
                      <span className="font-black text-gray-900 font-mono text-sm">
                        {project.projectValue
                          ? `฿${Number(project.projectValue).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2 }
                            )}`
                          : "ไม่ระบุ"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & Deadline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-500">ความคืบหน้า</span>
                      <span className="font-black font-mono text-gray-900">
                        {overallProgress}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          overallProgress === 100
                            ? "bg-gray-900"
                            : "bg-red-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, overallProgress)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-1 text-gray-400 font-medium">
                        <Calendar size={12} />
                        <span>กำหนด:</span>
                      </div>
                      {getDeadlineBadge(project.endDate, project.status)}
                    </div>
                  </div>

                  {/* Card Footer: PM Info & Quick Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 border border-gray-200">
                        {project.manager?.fullName?.charAt(0) || "?"}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                        {project.manager?.fullName || "ยังไม่ระบุ PM"}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.job ? (
                        <Link
                          href={`/jobs?search=${project.job.jobNumber}`}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-gray-200"
                          title="ไปที่ Job"
                        >
                          <Briefcase size={10} className="text-red-600" />
                          <span>Job</span>
                        </Link>
                      ) : (
                        isManager && (
                          <button
                            onClick={() => setGenerateJobProject(project)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-red-100"
                            title="สร้าง Job"
                          >
                            <Plus size={10} />
                            <span>Job</span>
                          </button>
                        )
                      )}

                      {isManager && (
                        <>
                          <Link
                            href={`/projects/${project.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirmProject(project)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 bg-white rounded-2xl border border-gray-200 text-center text-gray-400">
              <FolderOpen size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="font-bold text-gray-700 text-base">
                ไม่พบโครงการที่ค้นหา
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ลองปรับเปลี่ยนตัวกรอง หรือค้นหาใหม่อีกครั้ง
              </p>
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>รีเซ็ตตัวกรอง</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Symmetrical Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 px-6 rounded-2xl border border-gray-200 shadow-xs text-xs">
        <div className="flex items-center gap-3 text-gray-500 font-medium">
          <span>
            แสดง{" "}
            <span className="font-bold text-gray-900">
              {sortedProjects.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            -{" "}
            <span className="font-bold text-gray-900">
              {Math.min(currentPage * itemsPerPage, sortedProjects.length)}
            </span>{" "}
            จากทั้งหมด{" "}
            <span className="font-bold text-gray-900">
              {sortedProjects.length}
            </span>{" "}
            โครงการ
          </span>

          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
            <span>ต่อหน้า:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={9999}>ทั้งหมด</option>
            </select>
          </div>
        </div>

        {/* Pagination Page Number Buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="ก่อนหน้า"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                return Math.abs(p - currentPage) <= 1;
              })
              .map((pageNum, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && pageNum - prev > 1;

                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && (
                      <span className="px-1 text-gray-400 text-xs font-bold">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? "bg-red-600 text-white shadow-xs"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="ถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 6. Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteConfirmProject(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  ยืนยันการลบโครงการ
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  คุณแน่ใจหรือไม่ว่าต้องการลบโครงการ{" "}
                  <span className="font-bold text-gray-900">
                    "{deleteConfirmProject.name}"
                  </span>{" "}
                  ({deleteConfirmProject.projectNumber})?
                  การดำเนินการนี้จะลบงานย่อยและข้อมูลทั้งหมดที่เกี่ยวข้องอย่างถาวร
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>ยืนยันการลบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Generate Job Modal */}
      {generateJobProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isGeneratingJob && setGenerateJobProject(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-900 flex items-center justify-center shrink-0 border border-gray-200">
                <Briefcase size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  สร้าง Job เชื่อมโยงระบบ
                </h3>
                <p className="text-xs text-gray-500">
                  ลงทะเบียนใบงานเพื่อประสานงานขาย บัญชี และคลัง
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1 text-xs">
              <p className="font-bold text-gray-900">
                {generateJobProject.projectNumber}: {generateJobProject.name}
              </p>
              <p className="text-gray-500">
                ลูกค้า: {generateJobProject.clientName || "ไม่ระบุ"}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                เลือกรหัสบริษัท (Company Code) *
              </label>
              <select
                value={generateJobCompanyCode}
                onChange={(e) => setGenerateJobCompanyCode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-gray-800 cursor-pointer"
              >
                <option value="">-- กรุณาเลือกรหัสบริษัท --</option>
                <option value="TP">TP (Tera Power)</option>
                <option value="TG">TG (Tera Group)</option>
                <option value="TE">TE (Tera Energy)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setGenerateJobProject(null);
                  setGenerateJobCompanyCode("");
                }}
                disabled={isGeneratingJob}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleGenerateJob}
                disabled={isGeneratingJob || !generateJobCompanyCode}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingJob ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังสร้าง Job...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>สร้าง Job ทันที</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
