"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ListTodo,
  Users,
  LayoutDashboard,
  Plus,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Wrench,
  DollarSign,
  FileText,
  CheckCircle2,
  Loader2,
  Pencil,
  Briefcase,
  FolderOpen,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Building2,
  Trash2,
  Tag,
  FileSpreadsheet,
  Check,
  X,
  UserCheck,
  CheckSquare,
  Link2,
  Sparkles,
  ArrowUpRight,
  Coins,
  ChevronRight,
  Receipt,
  FileCheck,
  Percent,
  Copy,
  Phone,
  Mail,
  User,
  Info,
} from "lucide-react";
import {
  updateTaskStatus,
  updateProject,
  updateTaskProgress,
  createTask,
  deleteTask,
} from "@/app/actions/projects";
import GanttChart from "./GanttChart";
import DailyLogTab from "./DailyLogTab";
import WeeklyReportTab from "./WeeklyReportTab";
import EquipmentTab from "./EquipmentTab";
import SolarChecklistTab from "../components/SolarChecklistTab";
import { calculateProjectProgress } from "@/app/lib/project-utils";

interface ProjectDetailClientProps {
  project: any;
  currentUser: any;
  isManager: boolean;
  allUsers: any[];
  pos?: any[];
  prs?: any[];
  searchKeywords?: string[];
  primarySearchKeyword?: string;
}

export default function ProjectDetailClient({
  project,
  currentUser,
  isManager,
  allUsers,
  pos = [],
  prs = [],
  searchKeywords = [],
  primarySearchKeyword = "",
}: ProjectDetailClientProps) {
  const router = useRouter();

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "tasks"
    | "team_equipment"
    | "procurement"
    | "reports"
    | "checklist"
  >("dashboard");

  // Task View & Filter States
  const [tasks, setTasks] = useState(project.tasks || []);
  const [taskView, setTaskView] = useState<"list" | "gantt">("list");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");

  // Procurement Search Filter States
  const [poSearch, setPoSearch] = useState("");
  const [prSearch, setPrSearch] = useState("");

  // Copy Feedback State
  const [copiedFolder, setCopiedFolder] = useState(false);

  // Filtered POs and PRs
  const filteredPos = useMemo(() => {
    if (!poSearch.trim()) return pos;
    const q = poSearch.toLowerCase();
    return pos.filter(
      (po: any) =>
        po.poNumber?.toLowerCase().includes(q) ||
        po.jobName?.toLowerCase().includes(q) ||
        po.vendorName?.toLowerCase().includes(q) ||
        po.company?.toLowerCase().includes(q)
    );
  }, [pos, poSearch]);

  const filteredPrs = useMemo(() => {
    if (!prSearch.trim()) return prs;
    const q = prSearch.toLowerCase();
    return prs.filter(
      (pr: any) =>
        pr.prNumber?.toLowerCase().includes(q) ||
        pr.projectName?.toLowerCase().includes(q) ||
        pr.requestedBy?.toLowerCase().includes(q) ||
        pr.status?.toLowerCase().includes(q)
    );
  }, [prs, prSearch]);

  // Reports Sub-tab State
  const [reportSubTab, setReportSubTab] = useState<"daily" | "weekly">("daily");

  // Status Updating State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    category: "",
    assigneeId: "",
    planStart: "",
    planEnd: "",
    weight: 1,
  });

  const today = useMemo(() => new Date(), []);

  // Calculate overall progress based on tasks and checklists
  const overallProgress = calculateProjectProgress({ ...project, tasks });

  // Task Status Options with Red/Gray Theme
  const statusOptions = [
    { id: "Pending", label: "รอทำ (Pending)", badgeClass: "bg-gray-100 text-gray-700 border-gray-200" },
    { id: "In progress", label: "กำลังทำ (In Progress)", badgeClass: "bg-red-50 text-red-700 border-red-200" },
    { id: "Problematic", label: "ติดปัญหา (Problematic)", badgeClass: "bg-rose-50 text-rose-800 border-rose-200" },
    { id: "Completed", label: "เสร็จสิ้น (Completed)", badgeClass: "bg-gray-900 text-white border-gray-800" },
  ];

  // Financial aggregates & fallbacks to Job/Quotation
  const totalExpenditures = useMemo(
    () => pos.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0),
    [pos]
  );

  const projectRevenue = Number(
    project.amountIncludingVat ||
    project.projectValue ||
    project.job?.quotation?.actualClosingAmount ||
    project.job?.quotation?.totalAmountBeforeVat ||
    0
  );

  const revenueExVat = projectRevenue > 0 ? (projectRevenue * 100) / 107 : 0;
  const internalBudget = Number(project.budget || 0);
  const profit = projectRevenue - totalExpenditures;
  const profitMargin =
    projectRevenue > 0 ? Math.round((profit / projectRevenue) * 100) : 0;

  // Effective Delivery and Start Dates (Project fields fallback to Job fields)
  const effectiveDeliveryDate = useMemo(() => {
    return project.deliveryDate || project.endDate || project.job?.deliveryDate || null;
  }, [project.deliveryDate, project.endDate, project.job?.deliveryDate]);

  const effectiveStartDate = useMemo(() => {
    return project.startDate || project.job?.salesOrderDate || project.job?.dateClosed || null;
  }, [project.startDate, project.job?.salesOrderDate, project.job?.dateClosed]);

  // Deadline calculations
  const deadlineInfo = useMemo(() => {
    if (!effectiveDeliveryDate) return null;
    const end = new Date(effectiveDeliveryDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      date: end.toLocaleDateString("th-TH"),
      diffDays,
      isOverdue: diffDays < 0 && project.status !== "Completed",
      isNear: diffDays >= 0 && diffDays <= 14 && project.status !== "Completed",
    };
  }, [effectiveDeliveryDate, project.status, today]);

  // Copy folder path handler
  const handleCopyFolderPath = (pathStr: string) => {
    if (!pathStr) return;
    navigator.clipboard.writeText(pathStr);
    setCopiedFolder(true);
    setTimeout(() => setCopiedFolder(false), 2000);
  };

  // Group team members by roles cleanly
  const { engineersList, adminsList, otherMembersList } = useMemo(() => {
    const members = project.members || [];
    const eng: any[] = [];
    const adm: any[] = [];
    const oth: any[] = [];

    members.forEach((m: any) => {
      const roleLower = (m.role || "").toLowerCase();
      if (roleLower === "engineer" || roleLower.includes("วิศวกร")) {
        eng.push(m);
      } else if (roleLower === "admin" || roleLower.includes("แอดมิน") || roleLower.includes("ธุรการ")) {
        adm.push(m);
      } else if (roleLower !== "manager" && m.userId !== project.managerId) {
        oth.push(m);
      }
    });

    return { engineersList: eng, adminsList: adm, otherMembersList: oth };
  }, [project.members, project.managerId]);

  // Mark Project as Completed
  const handleMarkAsCompleted = async () => {
    setIsUpdatingStatus(true);
    try {
      await updateProject(project.id, { status: "Completed" });
      setShowCompleteModal(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถเปลี่ยนสถานะโครงการได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Task Status Change
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const previousTasks = [...tasks];
    const newTasks = tasks.map((t: any) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          actualPct: newStatus === "Completed" ? 100 : t.actualPct,
        };
      }
      return t;
    });
    setTasks(newTasks);

    try {
      await updateTaskStatus(taskId, newStatus);
      if (newStatus === "Completed") {
        await updateTaskProgress(taskId, 100);
      }
    } catch (error) {
      console.error(error);
      setTasks(previousTasks);
      alert("ไม่สามารถบันทึกสถานะงานได้");
    }
  };

  // Task Progress Slider Change
  const handleProgressChange = async (taskId: string, newPct: number) => {
    const clampedPct = Math.min(100, Math.max(0, newPct));
    const previousTasks = [...tasks];
    const newTasks = tasks.map((t: any) => {
      if (t.id === taskId) {
        return {
          ...t,
          actualPct: clampedPct,
          status: clampedPct === 100 ? "Completed" : t.status === "Completed" ? "In progress" : t.status,
        };
      }
      return t;
    });
    setTasks(newTasks);

    try {
      await updateTaskProgress(taskId, clampedPct);
    } catch (error) {
      console.error(error);
      setTasks(previousTasks);
    }
  };

  // Create New Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title.trim()) return;

    setIsCreatingTask(true);
    try {
      const created = await createTask(project.id, {
        title: newTaskData.title.trim(),
        category: newTaskData.category || null,
        assigneeId: newTaskData.assigneeId || null,
        planStart: newTaskData.planStart ? new Date(newTaskData.planStart) : null,
        planEnd: newTaskData.planEnd ? new Date(newTaskData.planEnd) : null,
        weight: Number(newTaskData.weight) || 1,
        status: "Pending",
        actualPct: 0,
      });
      setTasks((prev: any[]) => [...prev, created]);
      setShowNewTaskModal(false);
      setNewTaskData({
        title: "",
        category: "",
        assigneeId: "",
        planStart: "",
        planEnd: "",
        weight: 1,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถสร้างงานได้");
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) return;
    const prev = [...tasks];
    setTasks(tasks.filter((t: any) => t.id !== taskId));
    try {
      await deleteTask(taskId);
      router.refresh();
    } catch (err) {
      console.error(err);
      setTasks(prev);
      alert("ไม่สามารถลบงานได้");
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (taskSearch.trim() !== "") {
        const q = taskSearch.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchCat = t.category?.toLowerCase().includes(q);
        const matchAssignee = t.assignee?.fullName?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchAssignee) return false;
      }
      if (taskStatusFilter !== "all" && t.status !== taskStatusFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, taskSearch, taskStatusFilter]);

  // Is Solar Project
  const isSolar =
    project.projectCategory === "Solar Roof" ||
    project.projectCategory === "Solar Pump" ||
    project.projectCategory === "Solar" ||
    (project.job?.item && project.job.item.toLowerCase().includes("solar"));

  return (
    <div className="p-4 md:p-8 pb-24 max-w-[1680px] w-full mx-auto space-y-6">
      {/* ── 1. Symmetrical Executive Header Bar ── */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        {/* Navigation Breadcrumbs & Top Meta (Symmetrically Balanced) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2 text-gray-400 font-semibold">
            <Link
              href="/projects"
              className="hover:text-red-600 transition-colors inline-flex items-center gap-1.5 font-bold text-gray-700 bg-gray-50 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-gray-200/80"
            >
              <ArrowLeft size={13} className="text-red-600" />
              <span>ทะเบียนโครงการ</span>
            </Link>
            <ChevronRight size={13} className="text-gray-300" />
            <span className="font-mono font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
              {project.projectNumber}
            </span>
            {(project.projectCategory || project.job?.jobType) && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                <Tag size={11} className="text-gray-400" />
                {project.projectCategory || project.job?.jobType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                project.status === "Completed"
                  ? "bg-gray-900 text-white border-gray-800"
                  : project.status === "In progress"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : project.status === "Planning"
                  ? "bg-gray-100 text-gray-800 border-gray-300"
                  : project.status === "Paused"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              {project.status === "Completed" ? (
                <CheckCircle2 size={12} className="text-emerald-400" />
              ) : (
                <Clock size={12} className="text-current" />
              )}
              <span>{project.status || "กำลังดำเนินการ"}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
              <ShieldCheck size={13} className="text-red-600" />
              <span>{isManager ? "ผู้จัดการโครงการ (Manager)" : "สมาชิกโครงการ (Member)"}</span>
            </span>
          </div>
        </div>

        {/* Project Title, Badges & Action Buttons (Symmetrical 2-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-1">
          {/* Left Column: Project Identity & Key Metadata */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-200 mt-0.5">
                <Briefcase size={24} />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-gray-900 text-white">
                    {project.projectNumber}
                  </span>
                  {project.province && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                      <MapPin size={11} className="text-red-600" />
                      {project.province} {project.district ? `(${project.district})` : ""}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
                  {project.name}
                </h1>
              </div>
            </div>

            {/* Symmetrical 2-Tile Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-0.5">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200/80">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                  <Building2 size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">ลูกค้า (Client)</span>
                  <p className="font-bold text-gray-900 truncate" title={project.clientName || project.job?.customerName || "-"}>
                    {project.clientName || project.job?.customerName || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200/80">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">ผู้ขาย (Sales Rep)</span>
                  <p className="font-bold text-gray-900 truncate" title={project.job?.sellerName || "-"}>
                    {project.job?.sellerName || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Symmetrical Action Buttons & Quick Summary Tile */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Top: Symmetrical Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
              {/* Folder link / copy if exists */}
              {project.pathFolder && (
                <div className="flex items-center">
                  <a
                    href={project.pathFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 inline-flex items-center gap-2 px-3.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-l-xl transition-all shadow-xs"
                    title="เปิดโฟลเดอร์"
                  >
                    <FolderOpen size={14} className="text-gray-600" />
                    <span>โฟลเดอร์</span>
                    <ExternalLink size={11} className="text-gray-400" />
                  </a>
                  <button
                    onClick={() => handleCopyFolderPath(project.pathFolder)}
                    className="h-10 px-2.5 bg-gray-50 border-y border-r border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-r-xl transition-all"
                    title="คัดลอกที่อยู่โฟลเดอร์ (Windows Explorer)"
                  >
                    {copiedFolder ? <Check size={14} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>
              )}

              {/* Link to Accounting Dashboard */}
              <Link
                href="/accounting/dashboard"
                className="h-10 inline-flex items-center gap-2 px-3.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs"
                title="ดูภาพรวมการเงินและกำไรในแดชบอร์ดบัญชี"
              >
                <TrendingUp size={14} className="text-gray-600" />
                <span>แดชบอร์ดบัญชี</span>
                <ExternalLink size={12} className="text-gray-400" />
              </Link>

              {/* Manager: Edit Project */}
              {isManager && (
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="h-10 inline-flex items-center gap-2 px-4 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Pencil size={14} />
                  <span>แก้ไขข้อมูล</span>
                </Link>
              )}

              {/* Manager: Complete Project */}
              {isManager && project.status !== "Completed" && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  disabled={isUpdatingStatus}
                  className="h-10 inline-flex items-center gap-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-red-200 disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>จบโครงการ</span>
                </button>
              )}
            </div>

            {/* Bottom: Symmetrical Quick Context Tile (Balances Left Metadata Tiles) */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs">
              <div className="p-1 text-center sm:text-left border-r border-gray-200/80 pr-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">รหัส Job</span>
                {project.job?.jobNumber ? (
                  <Link
                    href={`/jobs?search=${project.job.jobNumber}`}
                    className="font-mono font-bold text-gray-900 hover:text-red-600 truncate block transition-colors"
                  >
                    {project.job.jobNumber}
                  </Link>
                ) : (
                  <span className="font-mono text-gray-400">-</span>
                )}
              </div>

              <div className="p-1 text-center sm:text-left border-r border-gray-200/80 pr-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">ใบเสนอราคา</span>
                <span className="font-mono font-bold text-gray-900 truncate block" title={project.job?.quotationNumber || project.contractNumber || "-"}>
                  {project.job?.quotationNumber || project.contractNumber || "-"}
                </span>
              </div>

              <div className="p-1 text-center sm:text-left">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">กำหนดส่งมอบ</span>
                <span className="font-mono font-bold text-red-600 truncate block">
                  {effectiveDeliveryDate
                    ? new Date(effectiveDeliveryDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Symmetrical 4-Card Hero Metrics Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Metric 1: Profit / Loss (กำไร / ขาดทุนที่คาดการณ์) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              {profit >= 0 ? (
                <TrendingUp size={13} className="text-red-600" />
              ) : (
                <TrendingDown size={13} className="text-rose-600" />
              )}
              {profit >= 0 ? "กำไรที่คาดการณ์" : "ขาดทุนที่คาดการณ์"}
            </span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full font-mono border ${
                profit >= 0
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {profit >= 0 ? `+${profitMargin}%` : `${profitMargin}%`}
            </span>
          </div>
          <p
            className={`text-xl font-black font-mono tracking-tight ${
              profit >= 0 ? "text-gray-900" : "text-rose-600"
            }`}
          >
            {profit >= 0 ? "+" : "-"}฿{Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-0.5 border-t border-gray-100">
            <span>อัตรากำไร (Margin):</span>
            <span className="font-bold text-gray-900 font-mono">
              {profitMargin}% ของมูลค่า
            </span>
          </div>
        </div>

        {/* Metric 2: Timeline & Handover Countdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-500" />
              กำหนดส่งมอบงาน
            </span>
            {deadlineInfo ? (
              deadlineInfo.isOverdue ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                  <AlertTriangle size={10} /> เกิน {Math.abs(deadlineInfo.diffDays)} วัน
                </span>
              ) : deadlineInfo.isNear ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  <Clock size={10} /> เหลือ {deadlineInfo.diffDays} วัน
                </span>
              ) : (
                <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                  ตามแผน
                </span>
              )
            ) : (
              <span className="text-gray-400 text-xs">ยังไม่กำหนด</span>
            )}
          </div>
          <p className="text-lg font-black text-gray-900 tracking-tight font-mono">
            {effectiveDeliveryDate
              ? new Date(effectiveDeliveryDate).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "ยังไม่กำหนดวันส่งมอบ"}
          </p>
          <p className="text-[11px] text-gray-500 font-medium flex items-center justify-between">
            <span>
              เริ่ม: {effectiveStartDate ? new Date(effectiveStartDate).toLocaleDateString("th-TH") : "-"}
            </span>
            <span className="font-bold text-gray-700 font-mono">
              {project.projectDuration ? `${project.projectDuration} ${project.projectDurationUnit || "วัน"}` : "-"}
            </span>
          </p>
        </div>

        {/* Metric 3: Project Value & Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt size={13} className="text-gray-500" />
              มูลค่าโครงการ (รวม VAT)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
              VAT 7%
            </span>
          </div>
          <p className="text-xl font-black text-gray-900 font-mono">
            {projectRevenue > 0
              ? `฿${projectRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : "ไม่ระบุ"}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-0.5">
            <span>ก่อน VAT:</span>
            <span className="font-bold text-gray-700 font-mono">
              {revenueExVat > 0 ? `฿${revenueExVat.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
            </span>
          </div>
        </div>

        {/* Metric 4: Purchase Expenditures & Cost Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} className="text-red-600" />
              ยอดจัดซื้อสะสม (POs)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
              {pos.length} ฉบับ
            </span>
          </div>
          <p className="text-xl font-black text-red-600 font-mono">
            ฿{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-0.5 border-t border-gray-100">
            <span>สัดส่วนต้นทุน:</span>
            <span className="font-bold text-gray-700 font-mono">
              {projectRevenue > 0 ? Math.round((totalExpenditures / projectRevenue) * 100) : 0}% ของมูลค่า
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Symmetrical Tab Navigation Bar ── */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto custom-scrollbar pt-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <LayoutDashboard size={16} />
          <span>ภาพรวม & สัญญา</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "tasks"
              ? "border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <ListTodo size={16} />
          <span>แผนงานและงานย่อย</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "tasks" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("team_equipment")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "team_equipment"
              ? "border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Users size={16} />
          <span>ทีมงาน & อุปกรณ์</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "team_equipment" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {(project.members?.length || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("procurement")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "procurement"
              ? "border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <DollarSign size={16} />
          <span>การจัดซื้อ & PO</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "procurement" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {pos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "reports"
              ? "border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <ClipboardList size={16} />
          <span>บันทึก & รายงานสนาม</span>
        </button>

        {isSolar && (
          <button
            onClick={() => setActiveTab("checklist")}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "checklist"
                ? "border-red-600 text-red-600 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <FileCheck size={16} />
            <span>แบบฟอร์มโซลาร์</span>
          </button>
        )}
      </div>

      {/* ── 4. TAB 1: ภาพรวมและข้อมูลสัญญา (Overview & Contract) ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Symmetrical 4-Card Balanced Architecture (2x2 Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: ข้อมูลทั่วไปและสถานที่ตั้ง (General & Site Information) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">
                    ข้อมูลทั่วไปและสถานที่ตั้ง (General & Location)
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    รายละเอียดลูกค้า แผนก หมวดหมู่ และสถานที่หน้างาน
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ชื่อลูกค้า (Client Name)
                  </span>
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {project.clientName || project.job?.customerName || "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    แผนกที่รับผิดชอบ (Department)
                  </span>
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {project.department || "วิศวกรรม"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    หมวดหมู่โครงการ (Category)
                  </span>
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {project.projectCategory || project.job?.jobType || "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    จังหวัด / อำเภอ (Location)
                  </span>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-1 truncate">
                    <MapPin size={13} className="text-red-600 shrink-0" />
                    <span>
                      {project.province || "-"} {project.district ? `(${project.district})` : ""}
                    </span>
                  </p>
                </div>

                {project.job?.item && (
                  <div className="sm:col-span-2 space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      รายการสินค้า / ขอบเขตงานตาม Job (Item)
                    </span>
                    <p className="font-bold text-gray-800 text-xs">
                      {project.job.item}
                    </p>
                  </div>
                )}

                <div className="sm:col-span-2 space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    สถานที่ติดตั้ง / ที่อยู่หน้างาน (Site Location)
                  </span>
                  <p className="font-medium text-gray-700 leading-relaxed text-xs">
                    {project.siteAddress || "ไม่ระบุที่อยู่หน้างาน"}
                  </p>
                </div>

                {project.description && (
                  <div className="sm:col-span-2 space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      คำอธิบาย / ขอบเขตงาน (Scope of Work)
                    </span>
                    <p className="text-gray-600 leading-relaxed text-xs">
                      {project.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: สัญญาและเงื่อนไขการเงิน (Contract Terms & Security Deposit) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center border border-gray-200">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">
                    สัญญาและเงื่อนไขการเงิน (Contract Terms)
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    เลขที่สัญญา ผู้ลงนาม ค่าปรับ และเงินค้ำประกันผลงาน
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    เลขที่สัญญา (Contract No.)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {project.contractNumber || (project.job?.quotationNumber ? `อ้างอิง QT: ${project.job.quotationNumber}` : "-")}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ผู้ลงนามสัญญา (Signatory)
                  </span>
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {project.contractSignatory || project.manager?.fullName || "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    วันที่ลงนามสัญญา (Signing Date)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {project.contractSigningDate
                      ? new Date(project.contractSigningDate).toLocaleDateString("th-TH")
                      : project.job?.salesOrderDate
                      ? new Date(project.job.salesOrderDate).toLocaleDateString("th-TH")
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    งบประมาณภายใน (Internal Budget)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {internalBudget > 0 ? `฿${internalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ค่าปรับล่าช้า / วัน (Penalty/Day)
                  </span>
                  <p className="font-bold text-red-600 text-sm font-mono truncate">
                    {project.penaltyPerDay
                      ? `฿${Number(project.penaltyPerDay).toLocaleString()}`
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    สถานะการคืนสัญญา (Return Status)
                  </span>
                  <p className="font-bold text-gray-700 text-sm truncate">
                    {project.contractReturnStatus || "ยังไม่คืนสัญญา"}
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1 p-3.5 rounded-xl bg-gray-50/70 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      เงินค้ำประกันผลงาน (5% Security Deposit)
                    </span>
                    {project.depositCollectionSchedule && (
                      <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">
                        กำหนดคืน: {new Date(project.depositCollectionSchedule).toLocaleDateString("th-TH")}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-gray-900 text-base font-mono">
                    {project.securityDeposit
                      ? `฿${Number(project.securityDeposit).toLocaleString()}`
                      : "-"}
                  </p>
                  {project.depositRefundRequestNo && (
                    <p className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-200/60 mt-1">
                      เลขที่ขอคืนเงินค้ำ: <span className="font-bold font-mono text-gray-800">{project.depositRefundRequestNo}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: แผนการชำระเงินค่างวดและเงินมัดจำ (Payment Milestones & Deposit) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                    <CheckSquare size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">
                      การแบ่งชำระเงินค่างวดและเงินมัดจำ (Payment Milestones)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      เงินมัดจำสัญญาและงวดงานตามความก้าวหน้าโครงการ
                    </p>
                  </div>
                </div>
              </div>

              {(() => {
                let depositInfo: { amount: number; percent?: number; dueDate?: any; title?: string } | null = null;
                let milestones: Array<{ no: number; title?: string; amount: any; dueDate?: any; percent?: any }> = [];

                let rawData = project.installmentsData;
                if (typeof rawData === "string") {
                  try {
                    rawData = JSON.parse(rawData);
                  } catch (e) {}
                }

                if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
                  if (rawData.hasDeposit && rawData.deposit && Number(rawData.deposit.amount) > 0) {
                    depositInfo = {
                      amount: Number(rawData.deposit.amount),
                      percent: rawData.deposit.percent ? Number(rawData.deposit.percent) : undefined,
                      dueDate: rawData.deposit.dueDate,
                      title: rawData.deposit.title || "เงินมัดจำเมื่อเซ็นสัญญา",
                    };
                  }
                  if (Array.isArray(rawData.installments)) {
                    milestones = rawData.installments.map((item: any, idx: number) => ({
                      no: item.no || idx + 1,
                      title: item.title,
                      amount: item.amount,
                      percent: item.percent,
                      dueDate: item.dueDate,
                    }));
                  }
                } else if (Array.isArray(rawData) && rawData.length > 0) {
                  milestones = rawData.map((item: any, idx: number) => ({
                    no: item.no || idx + 1,
                    title: item.title,
                    amount: item.amount,
                    percent: item.percent,
                    dueDate: item.dueDate,
                  }));
                }

                // Fallback to project.firstPayment if deposit not found in installmentsData
                if (!depositInfo && project.firstPayment && Number(project.firstPayment) > 0) {
                  depositInfo = {
                    amount: Number(project.firstPayment),
                    dueDate: project.paymentDate || project.job?.paymentDate,
                    title: "เงินมัดจำเมื่อเซ็นสัญญา",
                  };
                }

                // Fallback to individual installment1..12 columns
                if (milestones.length === 0) {
                  for (let i = 1; i <= 12; i++) {
                    const val = (project as any)[`installment${i}`];
                    if (val !== undefined && val !== null && String(val).trim() !== "" && Number(val) > 0) {
                      milestones.push({
                        no: i,
                        title: `งวดที่ ${i}`,
                        amount: val,
                      });
                    }
                  }
                }

                return (
                  <div className="space-y-4">
                    {/* Contract Signing Deposit Banner */}
                    {depositInfo && (
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0">
                            <Coins size={18} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-gray-900 text-xs sm:text-sm">
                                {depositInfo.title || "เงินมัดจำเมื่อเซ็นสัญญา"}
                              </h4>
                              <span className="text-[10px] font-bold bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                                ไม่นับเป็นงวดงาน (Deposit)
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {depositInfo.percent ? `${depositInfo.percent}% ของมูลค่า • ` : ""}
                              {depositInfo.dueDate
                                ? `กำหนดชำระ: ${new Date(depositInfo.dueDate).toLocaleDateString("th-TH")}`
                                : "ชำระเมื่อเซ็นสัญญา"}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border border-gray-200 sm:border-0">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">
                            ยอดมัดจำ
                          </span>
                          <span className="text-sm sm:text-base font-black text-gray-900 font-mono">
                            ฿{depositInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Progress Installments Grid */}
                    {milestones.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                            งวดส่งมอบงานจริง ({milestones.filter((m) => Number(m.amount) > 0).length} งวด)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {milestones.map((inst) => {
                            const val = Number(inst.amount) || 0;
                            const hasVal = val > 0;
                            return (
                              <div
                                key={inst.no}
                                className={`p-3 rounded-xl border transition-all ${
                                  hasVal
                                    ? "bg-white border-gray-200 hover:border-red-300"
                                    : "bg-gray-50/60 border-gray-100 opacity-60"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] mb-1 gap-1">
                                  <span
                                    className="font-bold text-gray-800 truncate"
                                    title={inst.title || `งวดที่ ${inst.no}`}
                                  >
                                    {inst.title || `งวดที่ ${inst.no}`}
                                  </span>
                                  {hasVal && (
                                    <CheckCircle2 size={12} className="text-red-600 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm font-black text-gray-900 font-mono">
                                  {hasVal ? `฿${val.toLocaleString()}` : "-"}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 font-mono">
                                  {inst.percent && <span>{inst.percent}%</span>}
                                  {inst.dueDate && (
                                    <span>{new Date(inst.dueDate).toLocaleDateString("th-TH")}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      !depositInfo && (
                        <p className="text-xs text-gray-400 text-center py-6">
                          ยังไม่ได้ระบุงวดการชำระเงิน
                        </p>
                      )
                    )}

                    {/* Quotation / Job Payment Terms Note */}
                    {project.job?.percentageTerms && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-1">
                        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block">
                          เงื่อนไขตามใบเสนอราคา / Job
                        </span>
                        <p className="font-semibold text-gray-800">
                          {project.job.percentageTerms}
                        </p>
                        {project.job?.paymentMethod && (
                          <p className="text-[11px] text-gray-500 font-medium">
                            วิธีชำระเงิน: <strong className="text-gray-700">{project.job.paymentMethod}</strong>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Card 4: กำหนดส่งมอบและเอกสารราชการ (Timeline & Handover Milestones) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center border border-gray-200">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">
                    กำหนดส่งมอบและเอกสารราชการ (Timeline & Handover)
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    วันที่ส่งมอบ รหัส JB เลขที่ใบส่งมอบ และการขอใบรับรอง
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    วันที่ส่งมอบจริง (Delivery Date)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {effectiveDeliveryDate
                      ? new Date(effectiveDeliveryDate).toLocaleDateString("th-TH")
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    รหัส JB (JB Number)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {project.jbNumber || project.job?.jobNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    เลขที่เอกสารโครงการ (Doc No.)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {project.documentNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    เลขที่เอกสารส่งมอบ (Delivery Doc No.)
                  </span>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {project.deliveryDocNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ใบขอรับรองงานเสร็จ (Completion Cert)
                  </span>
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {project.certCompletionRequestNo || "-"}
                    {project.certRequestStatus && ` (${project.certRequestStatus})`}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    อัปเดตประวัติผลงาน (Profile Update)
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.updateCompanyProfile ? "ใช่ (Updateแล้ว)" : "ยังไม่อัปเดต"}
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    โฟลเดอร์โครงการ (Project Storage Path)
                  </span>
                  {project.pathFolder ? (
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p className="font-mono text-xs text-gray-700 truncate font-medium flex-1" title={project.pathFolder}>
                        {project.pathFolder}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopyFolderPath(project.pathFolder)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                          title="คัดลอกที่อยู่โฟลเดอร์เพื่อเปิดใน Windows Explorer"
                        >
                          {copiedFolder ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedFolder ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                        </button>
                        <a
                          href={project.pathFolder}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                        >
                          <span>เปิด</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">ยังไม่ได้ระบุโฟลเดอร์จัดเก็บเอกสาร</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 5: ข้อมูลเชื่อมโยงกับ Job และใบสั่งขาย (Linked Job & Sales Order Information) */}
            {project.job && (
              <div className="sm:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 tracking-tight">
                        ข้อมูลเชื่อมโยงกับ Job และฝ่ายขาย (Linked Sales Order & Job)
                      </h3>
                      <p className="text-[11px] text-gray-400 font-medium">
                        รายละเอียดใบสั่งขาย ใบเสนอราคา และข้อตกลงจากระบบ Job
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/jobs?search=${project.job.jobNumber}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                  >
                    <span>เปิดดูในระบบ Job</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      รหัส Job
                    </span>
                    <p className="font-bold text-gray-900 text-xs font-mono truncate">
                      {project.job.jobNumber}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      ใบเสนอราคา
                    </span>
                    <p className="font-bold text-gray-900 text-xs font-mono truncate">
                      {project.job.quotationNumber || "-"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      พนักงานขาย
                    </span>
                    <p className="font-bold text-gray-900 text-xs truncate">
                      {project.job.sellerName || "-"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      ส่งมอบตาม Job
                    </span>
                    <p className="font-bold text-gray-900 text-xs font-mono truncate">
                      {project.job.deliveryDate
                        ? new Date(project.job.deliveryDate).toLocaleDateString("th-TH")
                        : "-"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      วิธีชำระเงิน
                    </span>
                    <p className="font-bold text-gray-900 text-xs truncate">
                      {project.job.paymentMethod || "-"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      กำหนดชำระเงิน
                    </span>
                    <p className="font-bold text-gray-900 text-xs font-mono truncate">
                      {project.job.paymentDate
                        ? new Date(project.job.paymentDate).toLocaleDateString("th-TH")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. TAB 2: แผนงานและงานย่อย (Tasks & Gantt) ── */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          {/* Symmetrical Task Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="ค้นหางาน, หมวดหมู่, ผู้รับผิดชอบ..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 font-medium transition-all text-gray-900"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
                {[
                  { id: "all", label: "ทั้งหมด" },
                  { id: "Pending", label: "รอทำ" },
                  { id: "In progress", label: "กำลังทำ" },
                  { id: "Problematic", label: "ติดปัญหา" },
                  { id: "Completed", label: "เสร็จสิ้น" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTaskStatusFilter(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      taskStatusFilter === s.id
                        ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: View Switcher & Add Task */}
            <div className="flex items-center gap-2.5 shrink-0 justify-end">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setTaskView("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    taskView === "list"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  ตารางงาน
                </button>
                <button
                  onClick={() => setTaskView("gantt")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    taskView === "gantt"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Gantt Chart
                </button>
              </div>

              {isManager && (
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Plus size={15} />
                  <span>เพิ่มงานใหม่</span>
                </button>
              )}
            </div>
          </div>

          {/* Task View: List vs Gantt */}
          {taskView === "list" ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[920px]">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase tracking-wider text-[11px] font-black">
                      <th className="py-3.5 px-5">ชื่องาน (Task Title)</th>
                      <th className="py-3.5 px-4">ผู้รับผิดชอบ</th>
                      <th className="py-3.5 px-4">ระยะเวลาตามแผน</th>
                      <th className="py-3.5 px-4">สถานะ</th>
                      <th className="py-3.5 px-5 text-right">ความคืบหน้า (%)</th>
                      {isManager && <th className="py-3.5 px-4 text-center w-[60px]">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task: any) => {
                        const isTaskOverdue =
                          task.planEnd &&
                          new Date(task.planEnd) < today &&
                          task.status !== "Completed";

                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-gray-50/70 transition-colors"
                          >
                            {/* Title & Category */}
                            <td className="py-3.5 px-5">
                              <p className="font-bold text-gray-900 leading-snug">
                                {task.title}
                              </p>
                              {task.category && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold border border-gray-200">
                                  <Tag size={10} />
                                  {task.category}
                                </span>
                              )}
                            </td>

                            {/* Assignee */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center border border-gray-200">
                                  {task.assignee?.fullName?.charAt(0) || "?"}
                                </div>
                                <span className="text-xs font-bold text-gray-700">
                                  {task.assignee?.fullName || "ยังไม่ระบุ"}
                                </span>
                              </div>
                            </td>

                            {/* Timeline */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                              <div className="flex flex-col gap-0.5 font-mono">
                                <span>
                                  {task.planStart
                                    ? new Date(task.planStart).toLocaleDateString("th-TH")
                                    : "?"}{" "}
                                  -{" "}
                                  {task.planEnd
                                    ? new Date(task.planEnd).toLocaleDateString("th-TH")
                                    : "?"}
                                </span>
                                {isTaskOverdue && (
                                  <span className="text-red-600 font-bold text-[10px]">
                                    เกินกำหนดแผนงาน
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status Selector */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleStatusChange(task.id, e.target.value)
                                }
                                className="text-xs font-bold border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50/60 hover:bg-white focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all cursor-pointer text-gray-800"
                              >
                                {statusOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Progress % */}
                            <td className="py-3.5 px-5 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-3">
                                <span className="text-xs font-black text-gray-800 w-9 font-mono">
                                  {task.actualPct || 0}%
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={task.actualPct || 0}
                                  onChange={(e) =>
                                    handleProgressChange(
                                      task.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-24 accent-red-600 cursor-pointer"
                                />
                              </div>
                            </td>

                            {/* Delete Task */}
                            {isManager && (
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="ลบงานนี้"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-gray-400 text-xs"
                        >
                          ไม่พบรายการงานในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 overflow-hidden">
              <GanttChart
                project={project}
                currentUser={currentUser}
                isManager={isManager}
              />
            </div>
          )}
        </div>
      )}

      {/* ── 6. TAB 3: ทีมงานและอุปกรณ์ (Team & Equipment) ── */}
      {activeTab === "team_equipment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Project Manager & External Technicians */}
            <div className="space-y-6">
              {/* Project Manager Card */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">
                      ผู้จัดการโครงการ (Project Manager)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      ผู้รับผิดชอบหลักในการควบคุมและบริหารจัดการโครงการ
                    </p>
                  </div>
                </div>

                {project.manager ? (
                  <div className="flex items-start gap-3.5 bg-red-50/50 p-4 rounded-xl border border-red-200/60">
                    <div className="w-12 h-12 rounded-xl bg-red-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                      {project.manager.fullName?.charAt(0) || "PM"}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {project.manager.fullName}
                        </h4>
                        {project.manager.employeeId && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-200 font-mono">
                            {project.manager.employeeId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-red-700 font-semibold truncate">
                        {project.manager.role || "Project Manager"}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-600 font-medium">
                        {project.manager.phoneNumber && (
                          <a
                            href={`tel:${project.manager.phoneNumber}`}
                            className="inline-flex items-center gap-1 hover:text-red-600 transition-colors"
                          >
                            <Phone size={11} className="text-gray-400" />
                            <span>{project.manager.phoneNumber}</span>
                          </a>
                        )}
                        {project.manager.email && (
                          <a
                            href={`mailto:${project.manager.email}`}
                            className="inline-flex items-center gap-1 hover:text-red-600 transition-colors"
                          >
                            <Mail size={11} className="text-gray-400" />
                            <span>{project.manager.email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-4 text-center">
                    ยังไม่ได้ระบุผู้จัดการโครงการ
                  </p>
                )}
              </div>

              {/* External Technicians Card */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center border border-gray-200">
                    <Wrench size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">
                      ช่างภายนอก (External Technicians)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      ผู้รับเหมาช่วงหรือทีมช่างภายนอกที่ร่วมปฏิบัติงาน
                    </p>
                  </div>
                </div>

                {project.externalTechnicians ? (
                  <p className="text-xs font-bold text-gray-800 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 leading-relaxed">
                    {project.externalTechnicians}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic py-4 text-center">
                    ไม่มีการระบุช่างภายนอก
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Team Members List (Grouped by Role) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center border border-gray-200">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">
                      สมาชิกทีมโครงการ (Team Members)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      วิศวกรและฝ่ายประสานงานแอดมินที่ได้รับมอบหมาย
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                  {project.members?.length || 0} คน
                </span>
              </div>

              <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                {/* 1. Engineers Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">
                    วิศวกรประจำโครงการ ({engineersList.length} คน)
                  </span>
                  {engineersList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {engineersList.map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border bg-red-50 text-red-700 border-red-200">
                            {member.user?.fullName?.charAt(0) || "E"}
                          </div>
                          <div className="space-y-0.5 truncate flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {member.user?.fullName}
                            </p>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border bg-red-50 text-red-700 border-red-200">
                              Engineer
                            </span>
                            {member.user?.phoneNumber && (
                              <a
                                href={`tel:${member.user.phoneNumber}`}
                                className="text-[10px] text-gray-500 hover:text-red-600 block truncate font-mono"
                              >
                                {member.user.phoneNumber}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-2 pl-1">ยังไม่ได้ระบุวิศวกร</p>
                  )}
                </div>

                {/* 2. Admins Section */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 block">
                    ฝ่ายสนับสนุนและแอดมิน ({adminsList.length} คน)
                  </span>
                  {adminsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {adminsList.map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border bg-gray-900 text-white border-gray-900">
                            {member.user?.fullName?.charAt(0) || "A"}
                          </div>
                          <div className="space-y-0.5 truncate flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {member.user?.fullName}
                            </p>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border bg-gray-100 text-gray-800 border-gray-200">
                              Admin & Support
                            </span>
                            {member.user?.phoneNumber && (
                              <a
                                href={`tel:${member.user.phoneNumber}`}
                                className="text-[10px] text-gray-500 hover:text-gray-900 block truncate font-mono"
                              >
                                {member.user.phoneNumber}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-2 pl-1">ยังไม่ได้ระบุฝ่ายแอดมิน</p>
                  )}
                </div>

                {/* 3. Other Members (if any) */}
                {otherMembersList.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                      สมาชิกทีมอื่นๆ ({otherMembersList.length} คน)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {otherMembersList.map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-200"
                        >
                          <div className="w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border bg-gray-100 text-gray-700 border-gray-200">
                            {member.user?.fullName?.charAt(0) || "?"}
                          </div>
                          <div className="space-y-0.5 truncate flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {member.user?.fullName}
                            </p>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border bg-gray-100 text-gray-600 border-gray-200">
                              {member.role || "Member"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Width Bottom: Embedded Equipment Registry */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                <Wrench size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight">
                  ทะเบียนเครื่องจักรและอุปกรณ์หน้างาน (Equipment Registry)
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  บันทึกการจัดสรรยานพาหนะ เครื่องมือช่าง และอุปกรณ์ประจำโครงการ
                </p>
              </div>
            </div>
            <EquipmentTab project={project} isManager={isManager} />
          </div>
        </div>
      )}

      {/* ── 7. TAB 4: การจัดซื้อและพัสดุ (Procurement & POs) ── */}
      {activeTab === "procurement" && (
        <div className="space-y-6">
          {/* Symmetrical 3-Card Financial Metric Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                งบประมาณโครงการ (Revenue)
              </span>
              <p className="text-2xl font-black text-gray-900 font-mono">
                ฿{projectRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                ยอดจัดซื้อสะสม (PO Total)
              </span>
              <p className="text-2xl font-black text-red-600 font-mono">
                ฿{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                กำไรขั้นต้นคาดการณ์ (Estimated Margin)
              </span>
              <p className="text-2xl font-black text-gray-900 font-mono">
                ฿{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                <span className="text-xs font-bold text-gray-500">({profitMargin}%)</span>
              </p>
            </div>
          </div>

          {/* Smart Linkage & Semantic Matching Banner in Red/Gray */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                    <Link2 size={16} />
                  </div>
                  <h4 className="text-sm font-black text-gray-900">
                    เชื่อมโยงข้อมูลกับระบบจัดซื้อ (Procurement & PO System)
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                    <Sparkles size={11} className="text-red-600" />
                    จับคู่คำใกล้เคียงอัตโนมัติ
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  ระบบค้นหาและจับคู่ใบสั่งซื้อ (PO) และใบขอซื้อ (PR) อัจฉริยะตามรหัสโครงการ ชื่องาน และชื่อลูกค้า
                </p>
              </div>

              {/* Direct Navigation Links to Admin Procurement */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href={`/admin/procurement/po?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <FileSpreadsheet size={14} />
                  <span>เปิดหน้าระบบจัดซื้อ PO</span>
                  <ArrowUpRight size={13} />
                </Link>
                <Link
                  href={`/admin/procurement/pr?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <FileText size={14} className="text-gray-500" />
                  <span>เปิดระบบ PR</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            {/* Extracted search keywords display */}
            {searchKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
                <span className="text-[11px] font-bold text-gray-400 mr-1">
                  คำสำคัญที่ใช้ตรวจจับ ({searchKeywords.length}):
                </span>
                {searchKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                      kw === primarySearchKeyword
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {kw}
                    {kw === primarySearchKeyword && (
                      <span className="ml-1 text-[9px] opacity-90 font-normal">(คำหลัก)</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Symmetrical 2-Column Split: POs vs PRs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Orders (PO) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">
                      ใบสั่งซื้อ (Purchase Orders)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      รายการใบสั่งซื้อที่ตรงกับโครงการ
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 font-mono ml-1">
                    {pos.length} ฉบับ
                  </span>
                </div>

                <Link
                  href={`/admin/procurement/po?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  <span>ดูทั้งหมด</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Search filter within matched POs */}
              {pos.length > 0 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาเลขที่ PO, ชื่องาน, ผู้จำหน่าย..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-red-500 transition-all text-gray-900"
                  />
                  {poSearch && (
                    <button
                      onClick={() => setPoSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {filteredPos.length > 0 ? (
                <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredPos.map((po: any) => (
                    <div
                      key={po.id}
                      className="p-3.5 rounded-xl bg-gray-50/60 hover:bg-white border border-gray-200 hover:border-red-200 transition-all flex flex-col gap-2 group shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                              target="_blank"
                              className="font-black text-red-600 text-sm hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              <span>{po.poNumber}</span>
                              <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            {po.company && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700">
                                {po.company}
                              </span>
                            )}
                          </div>
                          {po.jobName && (
                            <p className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1.5">
                              <Briefcase size={12} className="text-red-600 shrink-0" />
                              <span className="truncate">ชื่องาน: {po.jobName}</span>
                            </p>
                          )}
                          <p className="text-xs text-gray-500 truncate">
                            ผู้ขาย: {po.vendorName || "ไม่ระบุผู้จำหน่าย"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <span className="font-black text-gray-900 text-sm block font-mono">
                            ฿{Number(po.totalAmount || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <Link
                            href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-red-600 transition-colors"
                          >
                            <span>เปิดดูใน PO</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-200/60 font-mono">
                        <span>
                          วันที่: {po.recordedAt ? new Date(po.recordedAt).toLocaleDateString("th-TH") : (po.createdAt ? new Date(po.createdAt).toLocaleDateString("th-TH") : "-")}
                        </span>
                        {po.purchaseRequest?.prNumber && (
                          <span className="font-bold text-gray-600">
                            อ้างอิง PR: {po.purchaseRequest.prNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : pos.length > 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  ไม่พบใบสั่งซื้อที่ตรงกับ "{poSearch}"
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">
                  ยังไม่มีข้อมูลใบสั่งซื้อที่เชื่อมโยงกับโครงการนี้
                </div>
              )}
            </div>

            {/* Purchase Requests (PR) */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center border border-gray-200">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight">
                      ใบขอซื้อ (Purchase Requests)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      รายการใบขอซื้อที่เกี่ยวข้อง
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 font-mono ml-1">
                    {prs.length} ฉบับ
                  </span>
                </div>

                <Link
                  href={`/admin/procurement/pr?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span>ดูทั้งหมด</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Search filter within matched PRs */}
              {prs.length > 0 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาเลขที่ PR, โครงการ, ผู้ขอ..."
                    value={prSearch}
                    onChange={(e) => setPrSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-gray-900 transition-all text-gray-900"
                  />
                  {prSearch && (
                    <button
                      onClick={() => setPrSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {filteredPrs.length > 0 ? (
                <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredPrs.map((pr: any) => (
                    <div
                      key={pr.id}
                      className="p-3.5 rounded-xl bg-gray-50/60 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all flex flex-col gap-2 group shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/procurement/pr?search=${encodeURIComponent(pr.prNumber)}`}
                              target="_blank"
                              className="font-black text-gray-900 text-sm hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              <span>{pr.prNumber}</span>
                              <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </div>
                          {pr.projectName && (
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              โครงการ: {pr.projectName}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 truncate">
                            ผู้ขอ: {pr.requestedBy || "ไม่ระบุ"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 block">
                            {pr.status || "บันทึกแล้ว"}
                          </span>
                          <Link
                            href={`/admin/procurement/pr?search=${encodeURIComponent(pr.prNumber)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-gray-900 transition-colors"
                          >
                            <span>เปิดดูใน PR</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-200/60 font-mono">
                        <span>
                          วันที่สร้าง: {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString("th-TH") : "-"}
                        </span>
                        {pr.purchaseOrders?.length > 0 && (
                          <span className="font-bold text-gray-700">
                            ออก PO แล้ว {pr.purchaseOrders.length} ฉบับ
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : prs.length > 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  ไม่พบใบขอซื้อที่ตรงกับ "{prSearch}"
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">
                  ยังไม่มีข้อมูลใบขอซื้อที่เชื่อมโยงกับโครงการนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 8. TAB 5: บันทึกประจำวัน & รายงานสนาม (Field Logs & Reports) ── */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-gray-100 p-1.5 rounded-xl w-fit border border-gray-200">
            <button
              onClick={() => setReportSubTab("daily")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                reportSubTab === "daily"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <ClipboardList size={14} className="text-red-600" />
              <span>บันทึกประจำวัน (Daily Field Log)</span>
            </button>
            <button
              onClick={() => setReportSubTab("weekly")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                reportSubTab === "weekly"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <TrendingUp size={14} className="text-gray-700" />
              <span>รายงานประจำสัปดาห์ (Weekly Report)</span>
            </button>
          </div>

          {/* Sub-tab Content Container */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-6">
            {reportSubTab === "daily" ? (
              <DailyLogTab
                project={project}
                currentUser={currentUser}
                isManager={isManager}
              />
            ) : (
              <WeeklyReportTab project={project} isManager={isManager} />
            )}
          </div>
        </div>
      )}

      {/* ── 9. TAB 6: แบบฟอร์มโซลาร์ (Solar Checklist) ── */}
      {activeTab === "checklist" && isSolar && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-6">
          <SolarChecklistTab project={project} />
        </div>
      )}

      {/* ── MODAL: Complete Project Confirmation ── */}
      {showCompleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isUpdatingStatus && setShowCompleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-5 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  ยืนยันเสร็จสิ้นโครงการ
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  ปรับสถานะโครงการเป็นเสร็จสมบูรณ์ (Completed)
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
              คุณกำลังจะตั้งค่าโครงการ{" "}
              <strong className="text-gray-900 font-black">"{project.name}"</strong>{" "}
              เป็นเสร็จสิ้นสมบูรณ์ ยืนยันการดำเนินการนี้หรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleMarkAsCompleted}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>ยืนยันเสร็จสิ้น</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create New Task ── */}
      {showNewTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isCreatingTask && setShowNewTaskModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-5 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    เพิ่มงานใหม่ในโครงการ
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    กำหนดชื่องาน ผู้รับผิดชอบ และกรอบเวลา
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">
                  ชื่องาน (Task Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ติดตั้งแผงโซลาร์, เดินท่อร้อยสาย..."
                  value={newTaskData.title}
                  onChange={(e) =>
                    setNewTaskData({ ...newTaskData, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-medium transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700">
                    หมวดหมู่งาน (Category)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น โครงสร้าง, ไฟฟ้า..."
                    value={newTaskData.category}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, category: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700">
                    ผู้รับผิดชอบ (Assignee)
                  </label>
                  <select
                    value={newTaskData.assigneeId}
                    onChange={(e) =>
                      setNewTaskData({
                        ...newTaskData,
                        assigneeId: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none cursor-pointer font-medium transition-all"
                  >
                    <option value="">-- เลือกผู้รับผิดชอบ --</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role || "พนักงาน"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700">
                    วันที่เริ่มตามแผน
                  </label>
                  <input
                    type="date"
                    value={newTaskData.planStart}
                    onChange={(e) =>
                      setNewTaskData({
                        ...newTaskData,
                        planStart: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none cursor-pointer font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700">
                    วันที่สิ้นสุดตามแผน
                  </label>
                  <input
                    type="date"
                    value={newTaskData.planEnd}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, planEnd: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none cursor-pointer font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  disabled={isCreatingTask}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask || !newTaskData.title.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isCreatingTask ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>กำลังสร้าง...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>สร้างงาน</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
