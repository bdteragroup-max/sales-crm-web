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
  BarChart2,
  Tag,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
  UserCheck,
  CheckSquare,
  Link2,
  Sparkles,
  ArrowUpRight,
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

  // Task Status Columns
  const statusOptions = [
    { id: "Pending", label: "รอทำ (Pending)", color: "bg-gray-100 text-gray-700" },
    { id: "In progress", label: "กำลังทำ (In Progress)", color: "bg-blue-50 text-blue-700 border border-blue-200" },
    { id: "Problematic", label: "ติดปัญหา (Problematic)", color: "bg-amber-50 text-amber-700 border border-amber-200" },
    { id: "Completed", label: "เสร็จสิ้น (Completed)", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  ];

  // Financial aggregates
  const totalExpenditures = useMemo(
    () => pos.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0),
    [pos]
  );
  const projectRevenue = Number(
    project.amountIncludingVat || project.projectValue || 0
  );
  const revenueExVat = projectRevenue > 0 ? (projectRevenue * 100) / 107 : 0;
  const internalBudget = Number(project.budget || 0);
  const profit = projectRevenue - totalExpenditures;
  const profitMargin =
    projectRevenue > 0 ? Math.round((profit / projectRevenue) * 100) : 0;

  // Deadline calculations
  const deadlineInfo = useMemo(() => {
    if (!project.endDate) return null;
    const end = new Date(project.endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      date: end.toLocaleDateString("th-TH"),
      diffDays,
      isOverdue: diffDays < 0 && project.status !== "Completed",
      isNear: diffDays >= 0 && diffDays <= 14 && project.status !== "Completed",
    };
  }, [project.endDate, project.status, today]);

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
    project.projectCategory === "Solar";

  return (
    <div className="p-4 md:p-8 pb-20 max-w-[1700px] w-full mx-auto space-y-6">
      {/* 1. Executive Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        {/* Navigation Breadcrumbs & Back Link */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-400 font-semibold">
            <Link
              href="/projects"
              className="hover:text-brand-red transition-colors inline-flex items-center gap-1 font-bold text-gray-600"
            >
              <ArrowLeft size={14} /> ทะเบียนโครงการ
            </Link>
            <span>/</span>
            <span className="text-gray-500 font-medium">{project.projectNumber}</span>
            <span>/</span>
            <span className="text-gray-900 font-bold truncate max-w-[200px] sm:max-w-none">
              {project.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
              <ShieldCheck size={12} className="text-brand-red" />
              {isManager ? "ผู้จัดการโครงการ (Manager)" : "สมาชิกโครงการ (Member)"}
            </span>
            {project.job && (
              <Link
                href={`/jobs?search=${project.job.jobNumber}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <Briefcase size={11} />
                <span>Job: {project.job.jobNumber}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Project Title, Badges & Action Buttons */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-2 border-t border-gray-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-900 text-white font-black text-xs">
                <FileText size={12} className="text-gray-400" />
                {project.projectNumber}
              </span>

              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold ${project.status === "Completed"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : project.status === "In progress"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : project.status === "Planning"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : project.status === "Paused"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-gray-100 text-gray-700"
                  }`}
              >
                {project.status === "Completed" && <CheckCircle2 size={12} />}
                {project.status === "In progress" && <Clock size={12} />}
                <span>{project.status || "กำลังดำเนินการ"}</span>
              </span>

              {project.projectCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700">
                  <Tag size={11} className="text-gray-400" />
                  {project.projectCategory}
                </span>
              )}

              {project.province && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700">
                  <MapPin size={11} className="text-brand-red" />
                  {project.province}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              {project.name}
            </h1>

            {project.clientName && (
              <p className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                <Building2 size={15} className="text-gray-400" />
                <span>ลูกค้า: {project.clientName}</span>
                {project.contractNumber && (
                  <span className="text-gray-400 font-normal">
                    (สัญญา: {project.contractNumber})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Folder link if exists */}
            {project.pathFolder && (
              <a
                href={project.pathFolder}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <FolderOpen size={14} className="text-blue-500" />
                <span>โฟลเดอร์โครงการ</span>
                <ExternalLink size={11} className="text-gray-400" />
              </a>
            )}

            {/* Link to Accounting Dashboard */}
            <Link
              href="/accounting/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition-all shadow-sm"
              title="ดูภาพรวมการเงินและกำไรในแดชบอร์ดบัญชี"
            >
              <TrendingUp size={14} className="text-emerald-600" />
              <span>แดชบอร์ดบัญชี</span>
              <ExternalLink size={11} className="text-gray-400" />
            </Link>

            {/* Manager: Edit Project */}
            {isManager && (
              <Link
                href={`/projects/${project.id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl transition-all shadow-sm"
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
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
        </div>

        {/* Hero Progress & Timeline Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-gray-100 items-center">
          {/* Progress % */}
          <div className="md:col-span-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-600">ความคืบหน้ารวม</span>
              <span className="font-black text-lg text-brand-red">
                {overallProgress}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overallProgress === 100
                  ? "bg-emerald-500"
                  : overallProgress >= 50
                    ? "bg-blue-600"
                    : "bg-brand-red"
                  }`}
                style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              คำนวณจากค่างานที่เสร็จสิ้นและแบบฟอร์มตรวจสอบ
            </p>
          </div>

          {/* Timeline & Countdown */}
          <div className="md:col-span-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-600 flex items-center gap-1">
                <Calendar size={13} className="text-gray-400" />
                <span>กำหนดส่งมอบ</span>
              </span>
              {deadlineInfo ? (
                deadlineInfo.isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    <AlertTriangle size={10} /> เกิน {Math.abs(deadlineInfo.diffDays)} วัน
                  </span>
                ) : deadlineInfo.isNear ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    <Clock size={10} /> เหลืออีก {deadlineInfo.diffDays} วัน
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ปกติ
                  </span>
                )
              ) : (
                <span className="text-gray-400 text-xs">ไม่ระบุ</span>
              )}
            </div>
            <p className="text-sm font-black text-gray-900">
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
                : "ยังไม่กำหนดวันส่งมอบ"}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">
              เริ่ม:{" "}
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString("th-TH")
                : "-"}{" "}
              ({project.projectDuration || "-"} {project.projectDurationUnit || "วัน"})
            </p>
          </div>

          {/* Quick Financial Summary */}
          <div className="md:col-span-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-600 block">
                มูลค่าโครงการ
              </span>
              <p className="text-xl font-black text-gray-900">
                {projectRevenue > 0
                  ? `฿${projectRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                  : "ไม่ระบุ"}
              </p>
              <p className="text-[11px] text-gray-500 font-medium">
                จัดซื้อแล้ว:{" "}
                <span className="font-bold text-brand-red">
                  ฿{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
            <Link
              href="/accounting/dashboard"
              title="เปิดแดชบอร์ดภาพรวมการเงิน & บัญชี"
              className="w-12 h-12 rounded-2xl bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 flex items-center justify-center text-brand-red hover:text-emerald-600 shadow-sm transition-all group"
            >
              <DollarSign size={22} className="group-hover:scale-110 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Organized Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "dashboard"
            ? "border-brand-red text-brand-red bg-white rounded-t-2xl shadow-sm"
            : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
        >
          <LayoutDashboard size={16} />
          <span>ภาพรวม & สัญญา</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "tasks"
            ? "border-brand-red text-brand-red bg-white rounded-t-2xl shadow-sm"
            : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
        >
          <ListTodo size={16} />
          <span>แผนงานและงานย่อย</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("team_equipment")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "team_equipment"
            ? "border-brand-red text-brand-red bg-white rounded-t-2xl shadow-sm"
            : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
        >
          <Users size={16} />
          <span>ทีมงาน & อุปกรณ์</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
            {(project.members?.length || 0) + 1}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("procurement")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "procurement"
            ? "border-brand-red text-brand-red bg-white rounded-t-2xl shadow-sm"
            : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
        >
          <DollarSign size={16} />
          <span>การจัดซื้อ & PO</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
            {pos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "reports"
            ? "border-brand-red text-brand-red bg-white rounded-t-2xl shadow-sm"
            : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
            }`}
        >
          <ClipboardList size={16} />
          <span>บันทึก & รายงานสนาม</span>
        </button>

        {isSolar && (
          <button
            onClick={() => setActiveTab("checklist")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "checklist"
              ? "border-brand-red text-brand-red bg-white rounded-t-2xl shadow-sm"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
              }`}
          >
            <FileText size={16} />
            <span>แบบฟอร์มโซลาร์</span>
          </button>
        )}
      </div>

      {/* 3. TAB 1: ภาพรวมและข้อมูลสัญญา (Overview & Contract) */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Executive Financial KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">
                มูลค่าโครงการรวม (Revenue)
              </span>
              <p className="text-2xl font-black text-gray-900">
                {projectRevenue > 0
                  ? `฿${projectRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                  : "-"}
              </p>
              {revenueExVat > 0 && (
                <p className="text-xs text-gray-500 font-medium">
                  ก่อน VAT: ฿{revenueExVat.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Budget */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <span className="text-xs font-black text-blue-500 uppercase tracking-wider block">
                งบประมาณภายใน (Budget)
              </span>
              <p className="text-2xl font-black text-blue-600">
                {internalBudget > 0 ? `฿${internalBudget.toLocaleString()}` : "-"}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                เพดานค่าใช้จ่ายที่อนุมัติ
              </p>
            </div>

            {/* Expenditures */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <span className="text-xs font-black text-brand-red uppercase tracking-wider block">
                ยอดจัดซื้อสะสม (POs)
              </span>
              <p className="text-2xl font-black text-brand-red">
                ฿{totalExpenditures.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                ออกใบสั่งซื้อแล้ว {pos.length} ฉบับ
              </p>
            </div>

            {/* Profit & Margin */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-600 uppercase tracking-wider block">
                  กำไรขั้นต้น (Gross Profit)
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${profit >= 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                    }`}
                >
                  {profitMargin}% Margin
                </span>
              </div>
              <p
                className={`text-2xl font-black ${profit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
              >
                ฿{profit.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                ส่วนต่างรายรับหลังหัก PO
              </p>
            </div>
          </div>

          {/* 4 Modular Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: General & Location Info */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 size={18} className="text-brand-red" />
                <h3 className="text-base font-black text-gray-900">
                  ข้อมูลทั่วไปและสถานที่ตั้ง (General & Location)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ชื่อลูกค้า
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.clientName || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    แผนกที่รับผิดชอบ
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.department || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    หมวดหมู่โครงการ
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.projectCategory || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    จังหวัด / ที่ตั้ง
                  </span>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                    <MapPin size={13} className="text-brand-red" />
                    <span>
                      {project.province || "-"} {project.district ? `(${project.district})` : ""}
                    </span>
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1 pt-2 border-t border-gray-50">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    สถานที่ติดตั้ง / ที่อยู่หน้างาน
                  </span>
                  <p className="font-medium text-gray-700 leading-relaxed">
                    {project.siteAddress || "ไม่ระบุที่อยู่หน้างาน"}
                  </p>
                </div>

                {project.description && (
                  <div className="sm:col-span-2 space-y-1 pt-2 border-t border-gray-50">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      คำอธิบาย / ขอบเขตงาน
                    </span>
                    <p className="text-gray-600 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Contract & Financial Terms */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-base font-black text-gray-900">
                  สัญญาและเงื่อนไขการเงิน (Contract Terms)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    เลขที่สัญญา
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.contractNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ผู้ลงนามสัญญา
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.contractSignatory || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    วันที่ลงนามสัญญา
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.contractSigningDate
                      ? new Date(project.contractSigningDate).toLocaleDateString("th-TH")
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ค่าปรับล่าช้า / วัน
                  </span>
                  <p className="font-bold text-rose-600 text-sm">
                    {project.penaltyPerDay
                      ? `฿${Number(project.penaltyPerDay).toLocaleString()}`
                      : "-"}
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1 pt-2 border-t border-gray-50">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    เงินค้ำประกันผลงาน (5%)
                  </span>
                  <p className="font-black text-gray-900 text-sm">
                    {project.securityDeposit
                      ? `฿${Number(project.securityDeposit).toLocaleString()}`
                      : "-"}
                    {project.depositCollectionSchedule && (
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (กำหนดคืน:{" "}
                        {new Date(
                          project.depositCollectionSchedule
                        ).toLocaleDateString("th-TH")}
                        )
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Payment Installments Tracker */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <CheckSquare size={18} className="text-emerald-600" />
                <h3 className="text-base font-black text-gray-900">
                  การแบ่งชำระเงินค่างวด (Installment Milestones)
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { no: 1, amount: project.installment1 },
                  { no: 2, amount: project.installment2 },
                  { no: 3, amount: project.installment3 },
                  { no: 4, amount: project.installment4 },
                ].map((inst) => {
                  const val = Number(inst.amount) || 0;
                  const hasVal = val > 0;
                  return (
                    <div
                      key={inst.no}
                      className={`p-3.5 rounded-2xl border transition-all ${hasVal
                        ? "bg-emerald-50/50 border-emerald-100"
                        : "bg-gray-50/50 border-gray-100"
                        }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-gray-600">งวด {inst.no}</span>
                        {hasVal && (
                          <CheckCircle2 size={12} className="text-emerald-600" />
                        )}
                      </div>
                      <p className="text-sm font-black text-gray-900">
                        {hasVal ? `฿${val.toLocaleString()}` : "-"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 4: Timeline & Handover Milestones */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Calendar size={18} className="text-amber-600" />
                <h3 className="text-base font-black text-gray-900">
                  กำหนดส่งมอบและเอกสารราชการ (Timeline & Handover)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    วันที่ส่งมอบจริง (Delivery Date)
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.deliveryDate
                      ? new Date(project.deliveryDate).toLocaleDateString("th-TH")
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    รหัส JB (JB Number)
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.jbNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    เลขที่เอกสารส่งมอบ
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.deliveryDocNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    ใบขอรับรองงานเสร็จ
                  </span>
                  <p className="font-bold text-gray-900 text-sm">
                    {project.certCompletionRequestNo || "-"}
                    {project.certRequestStatus && ` (${project.certRequestStatus})`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: แผนงานและงานย่อย (Tasks & Gantt) */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          {/* Task Controls Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="ค้นหางาน, หมวดหมู่, ผู้รับผิดชอบ..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${taskStatusFilter === s.id
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: View Switcher & Add Task */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setTaskView("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${taskView === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                  ตารางงาน
                </button>
                <button
                  onClick={() => setTaskView("gantt")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${taskView === "gantt"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                  Gantt Chart
                </button>
              </div>

              {isManager && (
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-red hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-200"
                >
                  <Plus size={15} />
                  <span>เพิ่มงานใหม่</span>
                </button>
              )}
            </div>
          </div>

          {/* Task View: List vs Gantt */}
          {taskView === "list" ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px] font-black">
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
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold">
                                  <Tag size={10} />
                                  {task.category}
                                </span>
                              )}
                            </td>

                            {/* Assignee */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-red-50 text-brand-red font-bold text-xs flex items-center justify-center border border-red-100">
                                  {task.assignee?.fullName?.charAt(0) || "?"}
                                </div>
                                <span className="text-xs font-bold text-gray-700">
                                  {task.assignee?.fullName || "ยังไม่ระบุ"}
                                </span>
                              </div>
                            </td>

                            {/* Timeline */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                              <div className="flex flex-col gap-0.5">
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
                                  <span className="text-rose-600 font-bold text-[10px]">
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
                                className="text-xs font-bold border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 hover:bg-white focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all cursor-pointer"
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
                                <span className="text-xs font-black text-gray-800 w-9">
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
                                  className="w-24 accent-brand-red cursor-pointer"
                                />
                              </div>
                            </td>

                            {/* Delete Task */}
                            {isManager && (
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                          className="py-12 text-center text-gray-400 text-sm"
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
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 overflow-hidden">
              <GanttChart
                project={project}
                currentUser={currentUser}
                isManager={isManager}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: ทีมงานและอุปกรณ์ (Team & Equipment) */}
      {activeTab === "team_equipment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Manager Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <UserCheck size={18} className="text-brand-red" />
                <h3 className="text-base font-black text-gray-900">
                  ผู้จัดการโครงการ (Project Manager)
                </h3>
              </div>

              {project.manager ? (
                <div className="flex items-center gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                  <div className="w-12 h-12 rounded-2xl bg-brand-red text-white font-black text-base flex items-center justify-center shadow-md shadow-red-200">
                    {project.manager.fullName?.charAt(0) || "PM"}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-gray-900 text-sm">
                      {project.manager.fullName}
                    </h4>
                    <p className="text-xs text-brand-red font-semibold">
                      {project.manager.role || "Project Manager"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">ยังไม่ได้ระบุผู้จัดการ</p>
              )}

              {/* External Technicians */}
              {project.externalTechnicians && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    ช่างและผู้รับเหมาภายนอก
                  </span>
                  <p className="text-xs font-bold text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {project.externalTechnicians}
                  </p>
                </div>
              )}
            </div>

            {/* Team Members List */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  <h3 className="text-base font-black text-gray-900">
                    สมาชิกทีมโครงการ (Team Members)
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {project.members?.length || 0} คน
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {project.members && project.members.length > 0 ? (
                  project.members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {member.user?.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="space-y-0.5 truncate">
                        <p className="font-bold text-gray-900 text-xs truncate">
                          {member.user?.fullName}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {member.role === "admin" ? "Project Admin" : "Engineer / Member"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-sm text-gray-400 py-4 text-center">
                    ยังไม่มีสมาชิกในโครงการ
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Embedded Equipment Registry */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Wrench size={18} className="text-brand-red" />
              <h3 className="text-base font-black text-gray-900">
                ทะเบียนเครื่องจักรและอุปกรณ์หน้างาน (Equipment Registry)
              </h3>
            </div>
            <EquipmentTab project={project} isManager={isManager} />
          </div>
        </div>
      )}

      {/* 6. TAB 4: การจัดซื้อและพัสดุ (Procurement & POs) */}
      {activeTab === "procurement" && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-gray-400">
                งบประมาณโครงการ (Revenue)
              </span>
              <p className="text-2xl font-black text-gray-900">
                ฿{projectRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-brand-red">
                ยอดจัดซื้อสะสม (PO Total)
              </span>
              <p className="text-2xl font-black text-brand-red">
                ฿{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-emerald-600">
                กำไรขั้นต้นคาดการณ์ (Margin)
              </span>
              <p className="text-2xl font-black text-emerald-600">
                ฿{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({profitMargin}%)
              </p>
            </div>
          </div>

          {/* Smart Linkage & Semantic Matching Banner */}
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                    <Link2 size={16} />
                  </div>
                  <h4 className="text-sm font-black text-gray-900">
                    เชื่อมโยงข้อมูลกับระบบจัดซื้อ (Procurement & PO System)
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Sparkles size={11} className="text-emerald-600" />
                    จับคู่คำใกล้เคียงอัจฉริยะ
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  ระบบตรวจจับและจับคู่ใบสั่งซื้อ (PO) อัตโนมัติ แม้ชื่อจะไม่ตรงกันทั้งหมด เช่น ชื่องานใน PO <strong>"งานกรมการข้าว"</strong> ตรงกับโครงการ <strong>"โครงการกรมการข้าว"</strong>
                </p>
              </div>

              {/* Direct Navigation Links to Admin Procurement */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href={`/admin/procurement/po?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-200"
                >
                  <FileSpreadsheet size={14} />
                  <span>เปิดหน้าระบบจัดซื้อ PO</span>
                  <ArrowUpRight size={13} />
                </Link>
                <Link
                  href={`/admin/procurement/pr?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <FileText size={14} className="text-blue-600" />
                  <span>เปิดระบบ PR</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            {/* Extracted search keywords display */}
            {searchKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-blue-100/70 text-xs">
                <span className="text-[11px] font-bold text-gray-500 mr-1">
                  คำสำคัญที่ใช้ตรวจจับ ({searchKeywords.length}):
                </span>
                {searchKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                      kw === primarySearchKeyword
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-200"
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

          {/* PO & PR Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Orders (PO) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-brand-red" />
                  <h3 className="text-base font-black text-gray-900">
                    ใบสั่งซื้อ (Purchase Orders)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-50 text-brand-red border border-red-100">
                    {pos.length} ฉบับ
                  </span>
                </div>

                <Link
                  href={`/admin/procurement/po?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:text-red-700 transition-colors"
                >
                  <span>ดูทั้งหมดในหน้าจัดซื้อ</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Search filter within matched POs */}
              {pos.length > 0 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาตามเลขที่ PO, ชื่องาน, หรือผู้จำหน่าย..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-red transition-all"
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
                <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredPos.map((po: any) => (
                    <div
                      key={po.id}
                      className="p-4 rounded-2xl bg-gray-50/70 hover:bg-red-50/30 border border-gray-100 hover:border-red-200 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                              target="_blank"
                              className="font-black text-brand-red text-sm hover:underline inline-flex items-center gap-1"
                            >
                              <span>{po.poNumber}</span>
                              <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            {po.company && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-200/80 text-gray-700">
                                {po.company}
                              </span>
                            )}
                          </div>
                          {po.jobName && (
                            <p className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1.5">
                              <Briefcase size={12} className="text-brand-red shrink-0" />
                              <span className="truncate">ชื่องาน: {po.jobName}</span>
                            </p>
                          )}
                          <p className="text-xs text-gray-500 truncate">
                            ผู้ขาย: {po.vendorName || "ไม่ระบุผู้จำหน่าย"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <span className="font-black text-gray-900 text-sm block">
                            ฿{Number(po.totalAmount || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <Link
                            href={`/admin/procurement/po?search=${encodeURIComponent(po.poNumber)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-brand-red transition-colors"
                          >
                            <span>เปิดดูใน PO</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                        <span>
                          วันที่บันทึก: {po.recordedAt ? new Date(po.recordedAt).toLocaleDateString("th-TH") : (po.createdAt ? new Date(po.createdAt).toLocaleDateString("th-TH") : "-")}
                        </span>
                        {po.purchaseRequest?.prNumber && (
                          <span className="font-medium text-blue-600">
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
                <div className="py-12 text-center text-gray-400 text-sm">
                  ยังไม่มีข้อมูลใบสั่งซื้อที่เชื่อมโยงกับโครงการนี้
                </div>
              )}
            </div>

            {/* Purchase Requests (PR) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  <h3 className="text-base font-black text-gray-900">
                    ใบขอซื้อ (Purchase Requests)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                    {prs.length} ฉบับ
                  </span>
                </div>

                <Link
                  href={`/admin/procurement/pr?search=${encodeURIComponent(primarySearchKeyword || project.name || "")}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span>ดูทั้งหมดในหน้าขอซื้อ</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Search filter within matched PRs */}
              {prs.length > 0 && (
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาตามเลขที่ PR, โครงการ, หรือผู้ขอ..."
                    value={prSearch}
                    onChange={(e) => setPrSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
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
                <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredPrs.map((pr: any) => (
                    <div
                      key={pr.id}
                      className="p-4 rounded-2xl bg-gray-50/70 hover:bg-blue-50/30 border border-gray-100 hover:border-blue-200 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/procurement/pr?search=${encodeURIComponent(pr.prNumber)}`}
                              target="_blank"
                              className="font-black text-blue-600 text-sm hover:underline inline-flex items-center gap-1"
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
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-700 block">
                            {pr.status || "บันทึกแล้ว"}
                          </span>
                          <Link
                            href={`/admin/procurement/pr?search=${encodeURIComponent(pr.prNumber)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-blue-600 transition-colors"
                          >
                            <span>เปิดดูใน PR</span>
                            <ArrowUpRight size={11} />
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                        <span>
                          วันที่สร้าง: {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString("th-TH") : "-"}
                        </span>
                        {pr.purchaseOrders?.length > 0 && (
                          <span className="font-medium text-emerald-600">
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
                <div className="py-12 text-center text-gray-400 text-sm">
                  ยังไม่มีข้อมูลใบขอซื้อที่เชื่อมโยงกับโครงการนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 5: บันทึกประจำวัน & รายงานสนาม (Field Logs & Reports) */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
            <button
              onClick={() => setReportSubTab("daily")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${reportSubTab === "daily"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
                }`}
            >
              <ClipboardList size={14} className="text-brand-red" />
              <span>บันทึกประจำวัน (Daily Field Log)</span>
            </button>
            <button
              onClick={() => setReportSubTab("weekly")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${reportSubTab === "weekly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
                }`}
            >
              <TrendingUp size={14} className="text-blue-600" />
              <span>รายงานประจำสัปดาห์ (Weekly Report)</span>
            </button>
          </div>

          {/* Sub-tab Content Container */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6">
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

      {/* 8. TAB 6: แบบฟอร์มโซลาร์ (Solar Checklist) */}
      {activeTab === "checklist" && isSolar && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6">
          <SolarChecklistTab project={project} />
        </div>
      )}

      {/* MODAL: Complete Project Confirmation */}
      {showCompleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isUpdatingStatus && setShowCompleteModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  ยืนยันเสร็จสิ้นโครงการ
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  ปรับสถานะโครงการเป็นเสร็จสมบูรณ์ (Completed)
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
              คุณกำลังจะตั้งค่าโครงการ{" "}
              <span className="font-bold text-gray-900">"{project.name}"</span>{" "}
              เป็นเสร็จสิ้นสมบูรณ์ ยืนยันการดำเนินการนี้หรือไม่?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={isUpdatingStatus}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleMarkAsCompleted}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>ยืนยันเสร็จสิ้น</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Task */}
      {showNewTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isCreatingTask && setShowNewTaskModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    เพิ่มงานใหม่ในโครงการ
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
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
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  disabled={isCreatingTask}
                  className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask || !newTaskData.title.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-red rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                >
                  {isCreatingTask ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>กำลังสร้าง...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
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
