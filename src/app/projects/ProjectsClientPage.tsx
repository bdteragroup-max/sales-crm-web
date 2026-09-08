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
  ArrowUp,
  ArrowDown,
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
  ExternalLink,
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
    client: true,
    contract: true,
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
        const endA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const endB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        comparison = endA - endB;
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
    { key: "client", label: "ลูกค้า (Client)" },
    { key: "contract", label: "เลขที่สัญญา (Contract)" },
    { key: "value", label: "มูลค่า (Value)" },
    { key: "manager", label: "ผู้จัดการ (Manager)" },
    { key: "timeline", label: "ระยะเวลา (Timeline)" },
    { key: "progress", label: "ความคืบหน้า (%)" },
    { key: "status", label: "สถานะ (Status)" },
  ];

  // Helper for deadline status
  const getDeadlineBadge = (endDateStr?: string, status?: string) => {
    if (status === "Completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
          <CheckCircle2 size={10} /> เสร็จสิ้นแล้ว
        </span>
      );
    }
    if (!endDateStr) {
      return (
        <span className="text-[11px] text-gray-400 font-medium">ไม่ระบุ</span>
      );
    }
    const endDate = new Date(endDateStr);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle size={10} /> เกินกำหนด {Math.abs(diffDays)} วัน
        </span>
      );
    }
    if (diffDays <= 14) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={10} /> เหลืออีก {diffDays} วัน
        </span>
      );
    }
    return (
      <span className="text-[11px] text-gray-600 font-medium">
        {endDate.toLocaleDateString("th-TH")}
      </span>
    );
  };

  // Helper for status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 size={12} /> เสร็จสมบูรณ์
          </span>
        );
      case "In progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <Clock size={12} /> กำลังดำเนินการ
          </span>
        );
      case "Planning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Layers size={12} /> วางแผนงาน
          </span>
        );
      case "Paused":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <AlertCircle size={12} /> ระงับชั่วคราว
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
            <X size={12} /> ยกเลิกโครงการ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
            {status || "ไม่ระบุ"}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* 1. Header & Quick Actions Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Link
              href="/"
              className="hover:text-brand-red transition-colors flex items-center gap-1"
            >
              หน้าหลัก
            </Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">โครงการ (Projects)</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">ทะเบียนโครงการ</span>
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
              <ShieldCheck size={11} className="text-brand-red" />
              {isManager ? "ผู้จัดการโครงการ (Manager)" : "สมาชิก (Member)"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center text-white shadow-md shadow-red-200">
              <FolderOpen size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {isManager ? "ทะเบียนโครงการทั้งหมด" : "โครงการที่ฉันรับผิดชอบ"}
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                {isManager
                  ? "ควบคุม ติดตามความคืบหน้า และบริหารจัดการโครงการแบบเรียลไทม์"
                  : "รายการโครงการและภาระงานที่ได้รับมอบหมาย"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Dashboard Link */}
          <Link
            href="/projects/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-all shadow-sm"
          >
            <Activity size={16} className="text-brand-red" />
            <span>แดชบอร์ดโครงการ</span>
          </Link>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-bold rounded-xl border border-emerald-200 transition-all shadow-sm"
            title="ส่งออกไฟล์ Excel"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>ส่งออก Excel</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "table"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
                }`}
            >
              <Table2 size={14} />
              <span className="hidden sm:inline">ตาราง</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "grid"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
                }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">การ์ด</span>
            </button>
          </div>

          {/* Column Toggle (Table view only) */}
          {viewMode === "table" && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Settings2 size={16} className="text-gray-500" />
                <span className="hidden sm:inline">คอลัมน์</span>
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-1.5 border-b border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
                      แสดง / ซ่อน คอลัมน์
                    </p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1">
                    {columnsList.map((col) => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-700">
                          {col.label}
                        </span>
                        {visibleColumns[col.key] && (
                          <Check size={16} className="text-brand-red font-bold" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Project Button */}
          {isManager && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>สร้างโครงการใหม่</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Interactive KPI Stat Cards (Click to filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Projects */}
        <div
          onClick={() => handleKpiFilter("all")}
          className={`cursor-pointer bg-white p-5 rounded-3xl border transition-all relative overflow-hidden group shadow-sm ${selectedStatus === "all"
            ? "border-brand-red ring-2 ring-brand-red/10 shadow-md"
            : "border-gray-100 hover:border-gray-300 hover:shadow"
            }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span>โครงการทั้งหมด</span>
                {selectedStatus === "all" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {stats.total.toLocaleString()}
                <span className="text-xs font-bold text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs font-semibold text-gray-500 mt-1">
                มูลค่ารวม{" "}
                <span className="font-bold text-gray-800">
                  ฿{(stats.totalValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
              <FolderOpen size={22} />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => handleKpiFilter("in_progress")}
          className={`cursor-pointer bg-white p-5 rounded-3xl border transition-all relative overflow-hidden group shadow-sm ${selectedStatus === "in_progress"
            ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md"
            : "border-gray-100 hover:border-blue-200 hover:shadow"
            }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span>กำลังดำเนินการ</span>
                {selectedStatus === "in_progress" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {stats.inProgress.toLocaleString()}
                <span className="text-xs font-bold text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs font-semibold text-blue-600 mt-1">
                มูลค่างาน{" "}
                <span className="font-bold text-gray-800">
                  ฿{(stats.inProgressValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Clock size={22} />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => handleKpiFilter("completed")}
          className={`cursor-pointer bg-white p-5 rounded-3xl border transition-all relative overflow-hidden group shadow-sm ${selectedStatus === "completed"
            ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md"
            : "border-gray-100 hover:border-emerald-200 hover:shadow"
            }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span>เสร็จสิ้นสมบูรณ์</span>
                {selectedStatus === "completed" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {stats.completed.toLocaleString()}
                <span className="text-xs font-bold text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                ส่งมอบแล้ว{" "}
                <span className="font-bold text-gray-800">
                  ฿{(stats.completedValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => handleKpiFilter("overdue")}
          className={`cursor-pointer bg-white p-5 rounded-3xl border transition-all relative overflow-hidden group shadow-sm ${selectedStatus === "overdue"
            ? "border-rose-500 ring-2 ring-rose-500/10 shadow-md"
            : "border-gray-100 hover:border-rose-200 hover:shadow"
            }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span>เกินกำหนดส่งมอบ</span>
                {selectedStatus === "overdue" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {stats.overdue.toLocaleString()}
                <span className="text-xs font-bold text-gray-400 ml-1.5">
                  โครงการ
                </span>
              </h3>
              <p className="text-xs font-semibold text-rose-600 mt-1">
                มูลค่างานเสี่ยง{" "}
                <span className="font-bold text-gray-800">
                  ฿{(stats.overdueValue / 1_000_000).toFixed(2)}M
                </span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Status Tabs / Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: "all", label: "ทั้งหมด", count: stats.total },
          {
            id: "in_progress",
            label: "กำลังดำเนินการ",
            count: stats.inProgress,
          },
          {
            id: "planning",
            label: "วางแผนงาน",
            count: projects.filter((p) => p.status === "Planning").length,
          },
          {
            id: "completed",
            label: "เสร็จสิ้น",
            count: stats.completed,
          },
          {
            id: "overdue",
            label: "เกินกำหนด",
            count: stats.overdue,
          },
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
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${isActive
                ? "bg-gray-900 text-white border-gray-900 shadow-sm scale-100"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive
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

      {/* 4. Unified Search & Multi-Faceted Filter Bar */}
      <div className="bg-white p-4 md:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ, รหัส PJ, ลูกค้า, จังหวัด, PM..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="all">หมวดหมู่ทั้งหมด</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedManager}
              onChange={(e) => {
                setSelectedManager(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="all">ผู้จัดการ (ทุกคน)</option>
              {managerNames.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Province Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="all">จังหวัดทั้งหมด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium text-gray-700 transition-all cursor-pointer"
            >
              <option value="latest">เรียง: ล่าสุด</option>
              <option value="projectNumber">เรียง: รหัสโครงการ (PJ No.)</option>
              <option value="name">เรียง: ชื่อโครงการ (ก-ฮ)</option>
              <option value="value">เรียง: มูลค่าโครงการ</option>
              <option value="progress">เรียง: ความคืบหน้า (%)</option>
              <option value="endDate">เรียง: กำหนดส่งมอบ</option>
            </select>
          </div>
        </div>

        {/* Active Filter Strip & Reset Button */}
        {isFilterActive && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <Filter size={13} className="text-brand-red" />
              <span>
                กำลังกรองข้อมูล (พบ {sortedProjects.length} จาก {projects.length}{" "}
                โครงการ):
              </span>
              {searchTerm && (
                <span className="bg-red-50 text-brand-red font-bold px-2 py-0.5 rounded-lg border border-red-100">
                  คำค้น: {searchTerm}
                </span>
              )}
              {selectedStatus !== "all" && (
                <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-lg">
                  สถานะ: {selectedStatus}
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-lg">
                  หมวดหมู่: {selectedCategory}
                </span>
              )}
              {selectedManager !== "all" && (
                <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-lg">
                  PM: {selectedManager}
                </span>
              )}
              {selectedProvince !== "all" && (
                <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-lg">
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

      {/* 5. Main Content: Table View or Grid View */}
      {viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px] font-black">
                  {visibleColumns.sequence && (
                    <th className="py-3.5 px-4 sticky left-0 z-20 bg-gray-50/95 backdrop-blur w-[60px] text-center">
                      #
                    </th>
                  )}
                  {visibleColumns.projectNumber && (
                    <th
                      className="py-3.5 px-4 sticky z-20 bg-gray-50/95 backdrop-blur w-[130px] cursor-pointer hover:text-gray-900 transition-colors"
                      style={{ left: visibleColumns.sequence ? "60px" : "0" }}
                      onClick={() => handleHeaderSort("projectNumber")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>รหัส (PJ No.)</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.name && (
                    <th
                      className="py-3.5 px-4 sticky z-20 bg-gray-50/95 backdrop-blur min-w-[260px] cursor-pointer hover:text-gray-900 transition-colors"
                      style={{
                        left:
                          (visibleColumns.sequence ? 60 : 0) +
                          (visibleColumns.projectNumber ? 130 : 0) +
                          "px",
                      }}
                      onClick={() => handleHeaderSort("name")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ชื่อโครงการ & ลูกค้า</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.category && (
                    <th className="py-3.5 px-4">หมวดหมู่</th>
                  )}
                  {visibleColumns.province && (
                    <th className="py-3.5 px-4">จังหวัด</th>
                  )}
                  {visibleColumns.value && (
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors text-right"
                      onClick={() => handleHeaderSort("value")}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>มูลค่าโครงการ</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.manager && (
                    <th className="py-3.5 px-4">ผู้จัดการ (PM)</th>
                  )}
                  {visibleColumns.timeline && (
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors"
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
                      className="py-3.5 px-4 cursor-pointer hover:text-gray-900 transition-colors min-w-[140px]"
                      onClick={() => handleHeaderSort("progress")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ความคืบหน้า (%)</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                  )}
                  <th className="py-3.5 px-4 text-right sticky right-0 z-20 bg-gray-50/95 backdrop-blur w-[140px]">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {paginatedProjects.length > 0 ? (
                  paginatedProjects.map((project, idx) => {
                    const overallProgress = calculateProjectProgress(project);
                    const isProjectOverdue =
                      project.endDate &&
                      new Date(project.endDate) < today &&
                      project.status !== "Completed" &&
                      project.status !== "Cancelled";
                    const itemSeq =
                      (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-red-50/30 transition-colors group cursor-pointer bg-white"
                        onClick={() =>
                          (window.location.href = `/projects/${project.id}`)
                        }
                      >
                        {/* Sequence */}
                        {visibleColumns.sequence && (
                          <td className="py-3.5 px-4 text-center sticky left-0 z-10 bg-white group-hover:bg-red-50/30 transition-colors w-[60px]">
                            <span className="text-xs font-bold text-gray-400">
                              {itemSeq}
                            </span>
                          </td>
                        )}

                        {/* PJ Number */}
                        {visibleColumns.projectNumber && (
                          <td
                            className="py-3.5 px-4 sticky z-10 bg-white group-hover:bg-red-50/30 transition-colors w-[130px]"
                            style={{
                              left: visibleColumns.sequence ? "60px" : "0",
                            }}
                          >
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-black text-xs">
                              <FileText size={11} className="text-gray-400" />
                              {project.projectNumber}
                            </span>
                          </td>
                        )}

                        {/* Name & Client */}
                        {visibleColumns.name && (
                          <td
                            className="py-3.5 px-4 min-w-[260px] sticky z-10 bg-white group-hover:bg-red-50/30 transition-colors"
                            style={{
                              left:
                                (visibleColumns.sequence ? 60 : 0) +
                                (visibleColumns.projectNumber ? 130 : 0) +
                                "px",
                            }}
                          >
                            <p className="font-bold text-gray-900 group-hover:text-brand-red transition-colors line-clamp-1">
                              {project.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                              {project.clientName && (
                                <span className="font-medium text-gray-600">
                                  {project.clientName}
                                </span>
                              )}
                              {project.job && (
                                <Link
                                  href={`/jobs?search=${project.job.jobNumber}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Briefcase size={10} />
                                  <span>Job: {project.job.jobNumber}</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Category */}
                        {visibleColumns.category && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
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
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <span className="font-black text-gray-900 text-sm">
                              {project.projectValue
                                ? `฿${Number(
                                  project.projectValue
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                                : "-"}
                            </span>
                          </td>
                        )}

                        {/* Manager */}
                        {visibleColumns.manager && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-red-50 text-brand-red font-bold text-xs flex items-center justify-center border border-red-100">
                                {project.manager?.fullName?.charAt(0) || "?"}
                              </div>
                              <span className="text-xs font-bold text-gray-700">
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
                          <td className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${overallProgress === 100
                                    ? "bg-emerald-500"
                                    : overallProgress >= 50
                                      ? "bg-blue-600"
                                      : "bg-brand-red"
                                    }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, overallProgress)
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-black text-gray-700 w-9 text-right">
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
                        <td className="py-3.5 px-4 whitespace-nowrap text-right sticky right-0 z-10 bg-white group-hover:bg-red-50/30 transition-colors">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/projects/${project.id}`}
                              className="p-1.5 text-gray-600 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                              title="ดูรายละเอียด"
                            >
                              <Eye size={15} />
                            </Link>

                            {isManager && (
                              <>
                                <Link
                                  href={`/projects/${project.id}/edit`}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                  title="แก้ไขโครงการ"
                                >
                                  <Pencil size={15} />
                                </Link>

                                {!project.jobId && (
                                  <button
                                    onClick={() =>
                                      setGenerateJobProject(project)
                                    }
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                                    title="สร้าง Job เชื่อมระบบ"
                                  >
                                    <Briefcase size={15} />
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    setDeleteConfirmProject(project)
                                  }
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
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
                      colSpan={13}
                      className="py-16 text-center text-gray-400 text-sm"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderOpen size={36} className="text-gray-300" />
                        <p className="font-bold text-gray-600 text-base">
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
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginatedProjects.length > 0 ? (
            paginatedProjects.map((project) => {
              const overallProgress = calculateProjectProgress(project);
              const isProjectOverdue =
                project.endDate &&
                new Date(project.endDate) < today &&
                project.status !== "Completed" &&
                project.status !== "Cancelled";

              return (
                <div
                  key={project.id}
                  onClick={() =>
                    (window.location.href = `/projects/${project.id}`)
                  }
                  className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  {/* Card Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-black text-xs">
                        <FileText size={11} className="text-gray-400" />
                        {project.projectNumber}
                      </span>
                      <div>{renderStatusBadge(project.status)}</div>
                    </div>

                    <div>
                      <h3 className="font-black text-gray-900 text-base group-hover:text-brand-red transition-colors line-clamp-2 leading-snug">
                        {project.name}
                      </h3>
                      {project.clientName && (
                        <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">
                          ลูกค้า: {project.clientName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50/70 p-3 rounded-2xl border border-gray-100 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        หมวดหมู่งาน
                      </span>
                      <p className="font-bold text-gray-800 line-clamp-1">
                        {project.projectCategory || "ไม่ระบุ"}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        สถานที่ / จังหวัด
                      </span>
                      <p className="font-bold text-gray-800 line-clamp-1 flex items-center gap-1">
                        <MapPin size={11} className="text-brand-red shrink-0" />
                        <span>{project.province || "-"}</span>
                      </p>
                    </div>

                    <div className="space-y-0.5 col-span-2 pt-1 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        มูลค่าโครงการ
                      </span>
                      <span className="font-black text-brand-red text-sm">
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
                      <span className="font-bold text-gray-500">ความคืบหน้า</span>
                      <span className="font-black text-gray-900">
                        {overallProgress}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${overallProgress === 100
                          ? "bg-emerald-500"
                          : overallProgress >= 50
                            ? "bg-blue-600"
                            : "bg-brand-red"
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

                  {/* Card Footer: PM & Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {project.manager?.fullName?.charAt(0) || "?"}
                      </div>
                      <span className="text-xs font-bold text-gray-700 truncate">
                        {project.manager?.fullName || "ยังไม่ระบุ PM"}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.job ? (
                        <Link
                          href={`/jobs?search=${project.job.jobNumber}`}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                          title="ไปที่ Job"
                        >
                          <Briefcase size={11} />
                          <span>Job</span>
                        </Link>
                      ) : (
                        isManager && (
                          <button
                            onClick={() => setGenerateJobProject(project)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                            title="สร้าง Job"
                          >
                            <Plus size={11} />
                            <span>Job</span>
                          </button>
                        )
                      )}

                      {isManager && (
                        <>
                          <Link
                            href={`/projects/${project.id}/edit`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirmProject(project)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
            <div className="col-span-full py-16 bg-white rounded-3xl border border-gray-100 text-center text-gray-400">
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

      {/* 6. Client-Side Pagination Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 px-6 rounded-3xl border border-gray-100 shadow-sm text-sm">
        <div className="flex items-center gap-3 text-gray-500 font-medium text-xs">
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
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-red cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={9999}>ทั้งหมด</option>
            </select>
          </div>
        </div>

        {/* Pagination Buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum
                        ? "bg-brand-red text-white shadow-md shadow-red-200"
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
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="ถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 7. Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteConfirmProject(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">
                  ยืนยันการลบโครงการ
                </h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  คุณแน่ใจหรือไม่ว่าต้องการลบโครงการ{" "}
                  <span className="font-bold text-gray-800">
                    "{deleteConfirmProject.name}"
                  </span>{" "}
                  ({deleteConfirmProject.projectNumber})?
                  การดำเนินการนี้จะลบงานย่อยและข้อมูลทั้งหมดที่เกี่ยวข้องอย่างถาวร
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>ยืนยันการลบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Generate Job Modal */}
      {generateJobProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isGeneratingJob && setGenerateJobProject(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  สร้าง Job เชื่อมโยงระบบ
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  ลงทะเบียนใบงานเพื่อประสานงานขาย บัญชี และคลัง
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-1 text-xs">
              <p className="font-bold text-gray-800">
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
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-gray-800 cursor-pointer"
              >
                <option value="">-- กรุณาเลือกรหัสบริษัท --</option>
                <option value="TP">TP (Tera Power)</option>
                <option value="TG">TG (Tera Group)</option>
                <option value="TE">TE (Tera Energy)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setGenerateJobProject(null);
                  setGenerateJobCompanyCode("");
                }}
                disabled={isGeneratingJob}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleGenerateJob}
                disabled={isGeneratingJob || !generateJobCompanyCode}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingJob ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังสร้าง Job...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
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
