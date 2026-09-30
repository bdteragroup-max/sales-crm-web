"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  User,
  X,
  Printer,
  Building2,
  Users,
  CalendarDays,
  Paperclip,
  RotateCcw,
  Phone,
  Wrench,
  Filter,
  UserCheck,
  Calendar,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Check,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { submitEstimation, assignEstimation } from "@/app/actions/estimations";

export interface ServiceTeamMember {
  id: string;
  fullName: string;
  role: string;
  nickname?: string | null;
}

interface EstimationsClientPageProps {
  currentUser: any;
  initialRecords: any[];
  serviceTeamMembers?: ServiceTeamMember[];
  isManager?: boolean;
}

const getTechnicianInitials = (fullName: string, nickname?: string | null) => {
  if (nickname && nickname.trim()) {
    return nickname.trim().slice(0, 2);
  }
  const clean = (fullName || "")
    .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|ดร\.)\s*/, "")
    .trim();
  return clean.slice(0, 2) || (fullName || "").slice(0, 2);
};

export default function EstimationsClientPage({
  currentUser,
  initialRecords,
  serviceTeamMembers,
  isManager,
}: EstimationsClientPageProps) {
  const [activeTab, setActiveTab] = useState<
    "PENDING" | "ESTIMATED" | "COMPANY" | "TECHNICIAN" | "MONTHLY"
  >("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // MGR Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterTechnician, setFilterTechnician] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Price Estimation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | "">("");
  const [estimationNote, setEstimationNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignReq, setSelectedAssignReq] = useState<any>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const techDropdownRef = useRef<HTMLDivElement>(null);
  const [assignDueDate, setAssignDueDate] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Close technician dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        techDropdownRef.current &&
        !techDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTechDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter service team members based on typing query (matching fullName, nickname, or role)
  const filteredServiceTeamMembers = useMemo(() => {
    if (!serviceTeamMembers) return [];
    if (!assignSearchQuery.trim()) return serviceTeamMembers;
    const q = assignSearchQuery.toLowerCase().trim();
    return serviceTeamMembers.filter(
      (m) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.nickname?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q)
    );
  }, [serviceTeamMembers, assignSearchQuery]);

  // Helper to format assigned name with nickname
  const getAssignedDisplayName = (
    assignedTo?: string | null,
    assignedToUserId?: string | null
  ) => {
    if (!assignedTo) return "";
    if (assignedTo.includes("(") && assignedTo.includes(")")) return assignedTo;
    const member = serviceTeamMembers?.find(
      (m) => m.id === assignedToUserId || m.fullName === assignedTo
    );
    if (member?.nickname) {
      return `${assignedTo} (${member.nickname})`;
    }
    return assignedTo;
  };

  // KPI Calculations
  const totalPending = useMemo(() => {
    return initialRecords.filter(
      (r) => (r.estimationStatus || "PENDING") === "PENDING"
    ).length;
  }, [initialRecords]);

  const totalEstimated = useMemo(() => {
    return initialRecords.filter((r) => r.estimationStatus === "ESTIMATED")
      .length;
  }, [initialRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return initialRecords.filter((item) => {
      let statusMatch = true;
      const effStatus = item.estimationStatus || "PENDING";

      if (activeTab === "PENDING") statusMatch = effStatus === "PENDING";
      if (activeTab === "ESTIMATED") statusMatch = effStatus === "ESTIMATED";

      if (
        activeTab === "MONTHLY" ||
        activeTab === "COMPANY" ||
        activeTab === "TECHNICIAN"
      ) {
        if (filterStatus) {
          statusMatch = effStatus === filterStatus;
        } else {
          statusMatch = true;
        }
      }

      const q = searchTerm.toLowerCase().trim();
      const searchMatch =
        !q ||
        item.companyName?.toLowerCase().includes(q) ||
        item.salesperson?.toLowerCase().includes(q) ||
        item.boqNumber?.toLowerCase().includes(q) ||
        item.requirementNumber?.toLowerCase().includes(q) ||
        item.contactName?.toLowerCase().includes(q);

      let dateMatch = true;
      const itemDate = new Date(item.createdAt || item.date);
      if (filterDate) {
        const fd = new Date(filterDate);
        if (
          itemDate.getFullYear() !== fd.getFullYear() ||
          itemDate.getMonth() !== fd.getMonth() ||
          itemDate.getDate() !== fd.getDate()
        ) {
          dateMatch = false;
        }
      }
      if (filterMonth) {
        const [y, m] = filterMonth.split("-");
        if (
          itemDate.getFullYear() !== parseInt(y) ||
          itemDate.getMonth() !== parseInt(m) - 1
        ) {
          dateMatch = false;
        }
      }

      let techMatch = true;
      if (filterTechnician) {
        if (
          item.assignedToUserId !== filterTechnician &&
          item.assignedTo !== filterTechnician &&
          !item.assignedTo?.includes(filterTechnician)
        ) {
          techMatch = false;
        }
      }

      return statusMatch && searchMatch && dateMatch && techMatch;
    });
  }, [
    initialRecords,
    activeTab,
    searchTerm,
    filterDate,
    filterMonth,
    filterTechnician,
    filterStatus,
  ]);

  // Tab 4: Company Data
  const companyData = useMemo(() => {
    const companyMap = initialRecords.reduce((acc, record) => {
      const comp = record.companyName || "ไม่ระบุบริษัท";
      if (!acc[comp]) acc[comp] = [];
      acc[comp].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.keys(companyMap)
      .map((key) => ({
        company: key,
        count: companyMap[key].length,
        records: companyMap[key],
      }))
      .sort((a, b) => b.count - a.count);
  }, [initialRecords]);

  // Tab 5: Technician Data
  const techData = useMemo(() => {
    const techMap = initialRecords.reduce((acc, record) => {
      let tech = record.assignedTo || "ยังไม่ระบุช่าง";
      if (tech !== "ยังไม่ระบุช่าง" && !tech.includes("(")) {
        const member = serviceTeamMembers?.find(
          (m) =>
            m.id === record.assignedToUserId || m.fullName === record.assignedTo
        );
        if (member?.nickname) {
          tech = `${tech} (${member.nickname})`;
        }
      }
      if (!acc[tech]) acc[tech] = [];
      acc[tech].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.keys(techMap)
      .map((key) => ({
        technician: key,
        count: techMap[key].length,
        records: techMap[key],
      }))
      .sort((a, b) => b.count - a.count);
  }, [initialRecords, serviceTeamMembers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleOpenModal = (req: any) => {
    setSelectedReq(req);
    setEstimatedPrice(
      req.estimatedPrice !== null && req.estimatedPrice !== undefined
        ? req.estimatedPrice
        : ""
    );
    setEstimationNote(req.estimationNote || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || estimatedPrice === "") {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุราคาประเมิน",
        text: "โปรดระบุจำนวนเงินค่าประเมินราคา",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEstimation(
        selectedReq.id,
        {
          estimatedPrice: Number(estimatedPrice),
          estimationNote: estimationNote,
        },
        currentUser.fullName
      );

      setIsModalOpen(false);
      await Swal.fire({
        icon: "success",
        title: "บันทึกราคาประเมินสำเร็จ",
        text: `บันทึกราคา ฿${Number(estimatedPrice).toLocaleString()} เรียบร้อยแล้ว`,
        timer: 1200,
        showConfirmButton: false,
      });

      window.location.reload();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกราคาประเมินได้",
        confirmButtonColor: "#ff2301",
      });
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignModal = (req: any) => {
    setSelectedAssignReq(req);
    setAssignUserId(req.assignedToUserId || "");
    const member = serviceTeamMembers?.find(
      (m) =>
        m.id === req.assignedToUserId ||
        m.fullName === req.assignedTo ||
        (m.nickname && req.assignedTo?.includes(m.nickname))
    );
    const initialQuery = member
      ? member.nickname
        ? `${member.fullName} (${member.nickname})`
        : member.fullName
      : req.assignedTo || "";
    setAssignSearchQuery(initialQuery);
    setIsTechDropdownOpen(false);
    setAssignDueDate(
      req.estimationDueDate
        ? new Date(req.estimationDueDate).toISOString().split("T")[0]
        : ""
    );
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalUserId = assignUserId;
    let member = serviceTeamMembers?.find((m) => m.id === finalUserId);

    if (!finalUserId && assignSearchQuery.trim()) {
      const q = assignSearchQuery.trim().toLowerCase();
      member = serviceTeamMembers?.find((m) => {
        const full = m.fullName.toLowerCase();
        const nick = (m.nickname || "").toLowerCase();
        const combined = (
          m.nickname ? `${m.fullName} (${m.nickname})` : m.fullName
        ).toLowerCase();
        return full === q || combined === q || (nick && nick === q);
      });
      if (member) finalUserId = member.id;
    }

    if (!selectedAssignReq || !finalUserId || !assignDueDate) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุข้อมูลให้ครบ",
        text: "โปรดเลือกหรือพิมพ์ระบุผู้รับผิดชอบ และกำหนดส่งมอบงาน",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsAssigning(true);
    try {
      const assignedName = member
        ? member.nickname
          ? `${member.fullName} (${member.nickname})`
          : member.fullName
        : assignSearchQuery;

      await assignEstimation(
        selectedAssignReq.id,
        finalUserId,
        assignedName,
        new Date(assignDueDate),
        currentUser.fullName
      );

      setIsAssignModalOpen(false);
      await Swal.fire({
        icon: "success",
        title: "มอบหมายงานสำเร็จ",
        text: `มอบหมายงานให้ ${assignedName} เรียบร้อยแล้ว`,
        timer: 1200,
        showConfirmButton: false,
      });

      window.location.reload();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถมอบหมายงานได้",
        confirmButtonColor: "#ff2301",
      });
      setIsAssigning(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterDate("");
    setFilterMonth("");
    setFilterTechnician("");
    setFilterStatus("");
  };

  const hasActiveFilters = Boolean(
    searchTerm || filterDate || filterMonth || filterTechnician || filterStatus
  );

  return (
    <div className="space-y-8">
      {/* ── Top Hero Header Card (Red, White & Gray Symmetrical Modern Design) ── */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          {/* Left: Branded Squircle Icon & Titles */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
                <Calculator className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  ประเมินราคางานซ่อมและประกอบ
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                  PRICE ESTIMATIONS &amp; BOQ
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                <span>SERVICE ESTIMATION MANAGEMENT</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-normal">
                  ตรวจสอบความต้องการ ประเมินราคาค่าบริการ และมอบหมายงานช่าง
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

            {/* Quick Link to Service Calls */}
            <Link
              href="/service/calls"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Phone className="w-4 h-4 text-gray-500" />
              <span>ใบแจ้งบริการ</span>
            </Link>

            {/* Quick Link to Installation */}
            <Link
              href="/service/installation"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Wrench className="w-4 h-4" />
              <span>งานติดตั้ง</span>
            </Link>
          </div>
        </div>

        {/* Mini Meta Info Strip */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
              <span>
                ความต้องการทั้งหมด:{" "}
                <strong className="text-gray-900">
                  {initialRecords.length} รายการ
                </strong>
              </span>
            </div>
            <span className="text-gray-300">•</span>
            <span>
              รอประเมิน:{" "}
              <strong className="text-[#ff2301]">{totalPending} รายการ</strong>
            </span>
            <span className="text-gray-300">•</span>
            <span>
              ประเมินแล้ว:{" "}
              <strong className="text-emerald-600">
                {totalEstimated} รายการ
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <span>
              สถานะสิทธิ์:{" "}
              <strong className="text-gray-900">
                {isManager ? "ผู้จัดการ / ผู้ดูแลระบบ (MGR)" : "ผู้ใช้งานระบบ"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Strip (Symmetrical 4-Card Responsive Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pending Estimations */}
        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "PENDING"
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
                รอประเมินราคา
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {totalPending}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#ff2301] bg-red-50 px-2.5 py-1 rounded-xl">
            รอทำ
          </span>
        </button>

        {/* KPI 2: Completed Estimations */}
        <button
          type="button"
          onClick={() => setActiveTab("ESTIMATED")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "ESTIMATED"
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
                ประเมินราคาแล้ว
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {totalEstimated}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
            เสร็จสิ้น
          </span>
        </button>

        {/* KPI 3: By Company */}
        <button
          type="button"
          onClick={() => setActiveTab("COMPANY")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "COMPANY"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-100 text-gray-800 rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                แยกตามบริษัทลูกค้า
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {companyData.length}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xl">
            บริษัท
          </span>
        </button>

        {/* KPI 4: By Technician */}
        <button
          type="button"
          onClick={() => setActiveTab("TECHNICIAN")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "TECHNICIAN"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-red-50 text-[#ff2301] rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                ช่างผู้รับผิดชอบ
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {techData.length}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#ff2301] bg-red-50 px-2.5 py-1 rounded-xl">
            ทีมช่าง
          </span>
        </button>
      </div>

      {/* ── Main Workspace Card with Search, Tabs & Content ── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="px-6 pt-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "PENDING"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>รอประเมินราคา</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "PENDING"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {totalPending}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ESTIMATED")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "ESTIMATED"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ประเมินราคาแล้ว</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "ESTIMATED"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {totalEstimated}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("MONTHLY")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "MONTHLY"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>สรุปรายเดือน</span>
            </button>

            <button
              onClick={() => setActiveTab("COMPANY")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "COMPANY"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>แยกตามลูกค้า/บริษัท</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "COMPANY"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {companyData.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("TECHNICIAN")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "TECHNICIAN"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>รายงานตามช่าง</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "TECHNICIAN"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {techData.length}
              </span>
            </button>
          </div>

          {/* Quick Search on Top */}
          <div className="flex items-center gap-2.5 pb-2 md:pb-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาบริษัท, เลข BOQ, เซลล์..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Manager Advanced Filter Bar */}
        {isManager && (
          <div className="px-6 py-3.5 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Filter className="w-3.5 h-3.5 text-[#ff2301]" />
                <span>ตัวกรองผู้จัดการ (MGR Filters):</span>
              </span>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setFilterMonth("");
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                  title="กรองตามวันที่ระบุ"
                />
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5">
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    setFilterDate("");
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                  title="กรองตามเดือน"
                />
              </div>

              {/* Technician Filter */}
              <div>
                <select
                  value={filterTechnician}
                  onChange={(e) => setFilterTechnician(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                >
                  <option value="">ช่าง/วิศวกรทั้งหมด</option>
                  {serviceTeamMembers?.map((member) => (
                    <option key={member.id} value={member.fullName}>
                      {member.fullName}
                      {member.nickname ? ` (${member.nickname})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter for Monthly */}
              {activeTab === "MONTHLY" && (
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                  >
                    <option value="">ทุกสถานะ</option>
                    <option value="PENDING">รอประเมิน</option>
                    <option value="ESTIMATED">ประเมินแล้ว</option>
                  </select>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-[#ff2301] hover:text-[#d81900] underline"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 bg-gray-50/40 min-h-[460px]">
          {/* ── TAB 1, 2, 3: CARDS GRID (PENDING, ESTIMATED, MONTHLY) ── */}
          {(activeTab === "PENDING" ||
            activeTab === "ESTIMATED" ||
            activeTab === "MONTHLY") && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record: any) => {
                  const products = [];
                  if (record.formData?.["สินค้า_INVERTER"])
                    products.push("INVERTER");
                  if (record.formData?.["สินค้า_MOTOR"]) products.push("MOTOR");
                  if (record.formData?.["สินค้า_PUMP"]) products.push("PUMP");
                  if (record.formData?.["สินค้า_MDB"]) products.push("MDB");
                  if (record.formData?.["สินค้า_DB"]) products.push("DB");
                  if (record.formData?.["สินค้า_CONTROL"])
                    products.push("CONTROL");
                  if (record.formData?.["สินค้า_SOLAR_ROOF"])
                    products.push("SOLAR ROOF");
                  if (record.formData?.["สินค้า_SOLAR_PUMP"])
                    products.push("SOLAR PUMP");

                  const isEstimated =
                    record.estimationStatus === "ESTIMATED";

                  return (
                    <div
                      key={record.id}
                      className="bg-white rounded-3xl border border-gray-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                    >
                      {/* Card Header */}
                      <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold text-xs shadow-sm">
                            <FileText className="w-3.5 h-3.5 text-[#ff2301]" />
                            {record.boqNumber ? (
                              <span className="text-[#ff2301] font-mono">
                                {record.boqNumber}
                              </span>
                            ) : (
                              record.requirementNumber || (
                                <span className="text-gray-400 italic">
                                  ไม่มีข้อมูล
                                </span>
                              )
                            )}
                          </span>
                          {record.boqNumber && record.requirementNumber && (
                            <span className="text-[10px] text-gray-400 font-medium pl-1">
                              Ref: {record.requirementNumber}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                            วันที่รับเรื่อง
                          </span>
                          <span className="text-xs font-bold text-gray-900 font-mono">
                            {new Date(
                              record.date || record.createdAt
                            ).toLocaleDateString("th-TH", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        {/* Company & Contacts */}
                        <div>
                          <h3 className="text-base font-black text-gray-900 line-clamp-1 mb-2">
                            {record.companyName}
                          </h3>
                          <div className="flex flex-col gap-1 text-xs text-gray-600 font-medium">
                            <span className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>ผู้ติดต่อ: {record.contactName || "—"}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>เซลล์: {record.salesperson || "—"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Product Tags */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            สิ่งที่ต้องการประเมิน
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {products.length > 0 ? (
                              products.map((p) => (
                                <span
                                  key={p}
                                  className="px-2.5 py-1 bg-red-50 border border-red-200/80 text-[#ff2301] text-[10px] font-bold rounded-lg"
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </div>

                        {/* Detailed specifications */}
                        {record.formData && (
                          <div className="space-y-2">
                            {record.formData["สินค้า_INVERTER"] && (
                              <div className="text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 text-gray-700">
                                <strong className="text-gray-900">
                                  INVERTER:
                                </strong>
                                {record.formData["INVERTER_ยี่ห้อ"] &&
                                  ` ยี่ห้อ ${record.formData["INVERTER_ยี่ห้อ"]}`}
                                {record.formData["INVERTER_ขนาดเครื่อง_kW"] &&
                                  ` ขนาด ${record.formData["INVERTER_ขนาดเครื่อง_kW"]}kW`}
                                {record.formData["INVERTER_ขนาดเครื่อง_HP"] &&
                                  ` ${record.formData["INVERTER_ขนาดเครื่อง_HP"]}HP`}
                                {record.formData["INVERTER_Input_220V_1P"] &&
                                  ` (Input 220V 1P)`}
                                {record.formData["INVERTER_Input_220V_3P"] &&
                                  ` (Input 220V 3P)`}
                                {record.formData["INVERTER_Input_380V_3P"] &&
                                  ` (Input 380V 3P)`}
                              </div>
                            )}

                            {record.formData["สินค้า_MOTOR"] && (
                              <div className="text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 text-gray-700">
                                <strong className="text-gray-900">MOTOR:</strong>
                                {record.formData["MOTOR_ยี่ห้อ"] &&
                                  ` ยี่ห้อ ${record.formData["MOTOR_ยี่ห้อ"]}`}
                                {record.formData["MOTOR_ขนาด_kW"] &&
                                  ` ขนาด ${record.formData["MOTOR_ขนาด_kW"]}kW`}
                                {record.formData["MOTOR_ขนาด_HP"] &&
                                  ` ${record.formData["MOTOR_ขนาด_HP"]}HP`}
                              </div>
                            )}

                            {record.formData["สินค้า_PUMP"] && (
                              <div className="text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 text-gray-700">
                                <strong className="text-gray-900">PUMP:</strong>
                                {record.formData["PUMP_ยี่ห้อ"] &&
                                  ` ยี่ห้อ ${record.formData["PUMP_ยี่ห้อ"]}`}
                                {record.formData["PUMP_รุ่น"] &&
                                  ` รุ่น ${record.formData["PUMP_รุ่น"]}`}
                              </div>
                            )}

                            {record.note && (
                              <div className="text-xs bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80 text-amber-900">
                                <strong>โน้ตจากฝ่ายขาย:</strong> {record.note}
                              </div>
                            )}

                            {record.formData["งบประมาณลูกค้า"] && (
                              <div className="text-xs bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/80 text-emerald-800">
                                <strong>งบประมาณลูกค้า:</strong>{" "}
                                {record.formData["งบประมาณลูกค้า"]}
                              </div>
                            )}

                            {/* Render Attachments */}
                            {record.formData.attachments &&
                              record.formData.attachments.length > 0 && (
                                <div className="pt-2 border-t border-gray-100">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    ไฟล์แนบ ({record.formData.attachments.length}
                                    )
                                  </p>
                                  <div className="flex flex-col gap-1.5">
                                    {record.formData.attachments.map(
                                      (file: any, idx: number) => (
                                        <a
                                          key={idx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl hover:border-red-200 hover:bg-red-50/50 transition-colors text-xs text-gray-700 hover:text-[#ff2301]"
                                        >
                                          <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                          <span className="truncate">
                                            {file.name}
                                          </span>
                                        </a>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Assignment Info */}
                        {record.assignedTo && (
                          <div className="text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-gray-700 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">ผู้รับผิดชอบ:</span>
                              <strong className="text-gray-900">
                                {getAssignedDisplayName(
                                  record.assignedTo,
                                  record.assignedToUserId
                                )}
                              </strong>
                            </div>
                            {record.estimationDueDate && (
                              <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                                <span>กำหนดส่งมอบ:</span>
                                <span className="font-bold text-[#ff2301]">
                                  {new Date(
                                    record.estimationDueDate
                                  ).toLocaleDateString("th-TH")}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Show Result if Estimated */}
                        {isEstimated && (
                          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                ราคาประเมิน
                              </span>
                              <span className="text-base font-black text-emerald-950 font-mono">
                                ฿{record.estimatedPrice?.toLocaleString()}
                              </span>
                            </div>
                            {record.estimationNote && (
                              <p className="text-xs text-emerald-900 mt-1.5">
                                <strong>หมายเหตุ:</strong>{" "}
                                {record.estimationNote}
                              </p>
                            )}
                            <p className="text-[10px] text-emerald-700/80 mt-2 text-right">
                              ประเมินโดย {record.estimatedBy}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/sales/requirements/print/${record.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-white text-gray-700 border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 hover:text-[#ff2301] hover:border-red-200 shadow-sm transition-all active:scale-95"
                          title="ดาวน์โหลดหรือพิมพ์ PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </Link>

                        <div className="flex items-center gap-2">
                          {/* Manager Assign Button */}
                          {(!isEstimated || activeTab === "MONTHLY") &&
                            isManager && (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(record)}
                                className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-white text-[#ff2301] border border-red-200 text-xs font-bold rounded-xl hover:bg-red-50 hover:border-[#ff2301] shadow-sm transition-all active:scale-95"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>มอบหมาย</span>
                              </button>
                            )}

                          {/* Submit Price Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenModal(record)}
                            className="inline-flex items-center gap-1.5 px-4 h-9 bg-gradient-to-r from-[#ff2301] to-[#e01f01] text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all active:scale-95"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>
                              {isEstimated ? "แก้ไขราคา" : "ประเมินราคา"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-gray-200/90 shadow-sm">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                      <Calculator className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">
                      {searchTerm
                        ? "ไม่พบข้อมูลที่ค้นหา"
                        : activeTab === "PENDING"
                        ? "ไม่มีข้อมูลรายการที่รอประเมินราคา"
                        : "ไม่มีข้อมูลรายการที่ประเมินราคาแล้ว"}
                    </p>
                    <p className="text-xs text-gray-400">
                      เมื่อมีรายการความต้องการส่งเข้ามา จะแสดงผลที่นี่โดยอัตโนมัติ
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: BY CUSTOMER / COMPANY ── */}
          {activeTab === "COMPANY" && (
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
                          {item.count} รายการ
                        </span>
                      </div>

                      <div className="space-y-2.5 pt-3 border-t border-gray-100">
                        {item.records.slice(0, 3).map((o: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-gray-50/80 border border-gray-100"
                          >
                            <span className="text-xs font-mono font-bold text-[#ff2301] block">
                              {o.boqNumber ||
                                o.requirementNumber ||
                                "ไม่มีหมายเลข"}
                            </span>
                            <span className="text-gray-600 text-xs truncate block mt-0.5">
                              เซลล์: {o.salesperson || "-"}
                            </span>
                            <div className="flex items-center justify-between mt-1.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  (o.estimationStatus || "PENDING") ===
                                  "PENDING"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {(o.estimationStatus || "PENDING") === "PENDING"
                                  ? "รอประเมิน"
                                  : "ประเมินแล้ว"}
                              </span>
                              {o.estimatedPrice && (
                                <span className="text-xs font-black text-gray-900 font-mono">
                                  ฿{o.estimatedPrice.toLocaleString()}
                                </span>
                              )}
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

          {/* ── TAB 5: BY TECHNICIAN ── */}
          {activeTab === "TECHNICIAN" && (
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
                              ผู้รับผิดชอบงานประเมินราคา
                            </p>
                          </div>
                        </div>
                        <span className="bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                          {item.count} งาน
                        </span>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-100">
                        {item.records.slice(0, 4).map((o: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-gray-50 border border-gray-100"
                          >
                            <div className="min-w-0 mr-2">
                              <p className="font-bold text-gray-900 truncate text-[11px]">
                                {o.companyName || "ไม่ระบุบริษัท"}
                              </p>
                              <p className="text-gray-400 truncate text-[10px] font-mono">
                                กำหนดส่ง:{" "}
                                {o.estimationDueDate
                                  ? new Date(
                                      o.estimationDueDate
                                    ).toLocaleDateString("th-TH")
                                  : "-"}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold shrink-0 text-[10px] border ${
                                (o.estimationStatus || "PENDING") === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {(o.estimationStatus || "PENDING") === "PENDING"
                                ? "รอประเมิน"
                                : "เสร็จสิ้น"}
                            </span>
                          </div>
                        ))}
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
        </div>
      </div>

      {/* ── Price Estimation Modal (Redesigned Red/White/Gray) ── */}
      {isModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff2301] to-[#d81900] text-white flex items-center justify-center shadow-md shadow-red-500/20">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">
                    ประเมินราคาค่าบริการ
                  </h2>
                  <p className="text-[11px] font-mono text-[#ff2301]">
                    {selectedReq.boqNumber || selectedReq.requirementNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-900">
                  {selectedReq.companyName}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  พนักงานขาย: {selectedReq.salesperson || "—"}
                </p>
              </div>

              {/* Attachments */}
              {selectedReq.formData?.attachments &&
                selectedReq.formData.attachments.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      ไฟล์แนบความต้องการ
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                      {selectedReq.formData.attachments.map(
                        (file: any, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl hover:border-red-200 hover:bg-red-50/50 transition-colors text-xs text-gray-700 hover:text-[#ff2301]"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Price Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  ราคาประเมิน (บาท) <span className="text-[#ff2301]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={estimatedPrice}
                  onChange={(e) =>
                    setEstimatedPrice(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full px-4 py-3 text-sm font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] bg-white transition-all text-gray-900"
                  placeholder="เช่น 15000"
                />
              </div>

              {/* Note Textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={3}
                  value={estimationNote}
                  onChange={(e) => setEstimationNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] bg-white resize-none transition-all text-gray-900"
                  placeholder="ระบุรายละเอียดอุปกรณ์ที่ต้องใช้หรือข้อจำกัด..."
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 h-10 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || estimatedPrice === ""}
                  className="px-6 h-10 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-red-500/25 transition-all active:scale-95"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกราคาประเมิน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assignment Modal (MGR Role) ── */}
      {isAssignModalOpen && selectedAssignReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-md">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">
                    มอบหมายงานประเมินราคา
                  </h2>
                  <p className="text-[11px] font-mono text-[#ff2301]">
                    {selectedAssignReq.boqNumber ||
                      selectedAssignReq.requirementNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-5">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-900">
                  {selectedAssignReq.companyName}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  พนักงานขาย: {selectedAssignReq.salesperson || "—"}
                </p>
              </div>

              {/* Technician Typing-Searchable Dropdown */}
              <div className="relative" ref={techDropdownRef}>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span>
                    เลือกผู้รับผิดชอบ <span className="text-[#ff2301]">*</span>
                  </span>
                  {assignUserId && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>เลือกแล้ว</span>
                    </span>
                  )}
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={assignSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignSearchQuery(val);
                      setIsTechDropdownOpen(true);
                      const q = val.toLowerCase().trim();
                      const exact = serviceTeamMembers?.find((m) => {
                        const full = m.fullName.toLowerCase();
                        const nick = (m.nickname || "").toLowerCase();
                        const combined = (
                          m.nickname
                            ? `${m.fullName} (${m.nickname})`
                            : m.fullName
                        ).toLowerCase();
                        return (
                          full === q || combined === q || (nick && nick === q)
                        );
                      });
                      setAssignUserId(exact ? exact.id : "");
                    }}
                    onFocus={() => setIsTechDropdownOpen(true)}
                    placeholder="พิมพ์ชื่อหรือชื่อเล่นเพื่อค้นหาช่าง / วิศวกร..."
                    className="w-full pl-10 pr-10 py-3 text-sm font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] bg-white transition-all text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
                  />
                  {assignSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignSearchQuery("");
                        setAssignUserId("");
                        setIsTechDropdownOpen(true);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff2301] transition-colors"
                      title="ล้างข้อมูล"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  )}
                </div>

                {/* Dropdown Menu List */}
                {isTechDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 max-h-56 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                    {filteredServiceTeamMembers.length === 0 ? (
                      <div className="p-4 text-xs text-center text-gray-400">
                        ไม่พบรายชื่อหรือชื่อเล่นช่าง/วิศวกรที่ตรงกับ "{assignSearchQuery}"
                      </div>
                    ) : (
                      filteredServiceTeamMembers.map((member) => {
                        const isSelected = assignUserId === member.id;
                        const initials = getTechnicianInitials(
                          member.fullName,
                          member.nickname
                        );
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setAssignUserId(member.id);
                              setAssignSearchQuery(
                                member.nickname
                                  ? `${member.fullName} (${member.nickname})`
                                  : member.fullName
                              );
                              setIsTechDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                              isSelected
                                ? "bg-red-50 text-[#ff2301] font-bold"
                                : "hover:bg-gray-50 text-gray-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                  isSelected
                                    ? "bg-[#ff2301] text-white shadow-sm"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-xs ${
                                      isSelected
                                        ? "font-black text-[#ff2301]"
                                        : "font-bold text-gray-900"
                                    }`}
                                  >
                                    {member.fullName}
                                  </span>
                                  {member.nickname && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                        isSelected
                                          ? "bg-white text-[#ff2301] border-red-200"
                                          : "bg-red-50 text-[#ff2301] border-red-100"
                                      }`}
                                    >
                                      ({member.nickname})
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                  {member.role}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#ff2301] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  กำหนดส่งมอบงาน <span className="text-[#ff2301]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] bg-white transition-all text-gray-900 font-mono"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-5 h-10 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !assignUserId || !assignDueDate}
                  className="px-6 h-10 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-red-500/25 transition-all active:scale-95"
                >
                  {isAssigning ? "กำลังบันทึก..." : "ยืนยันการมอบหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
