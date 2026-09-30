"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  RotateCcw,
  Plus,
  Search,
  FileText,
  Download,
  Trash2,
  Pencil,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  LayoutGrid,
  ListFilter,
  Eye,
  Briefcase,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
  Package,
  User,
  Wrench,
  Truck,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  ChevronDown,
} from "lucide-react";
import { deleteGoodsReturn } from "@/app/actions/goodsReturns";

interface GoodsReturnsClientPageProps {
  initialData: any[];
  currentUser: any;
  companies: any[];
  jobs: any[];
  quotations: any[];
}

export default function GoodsReturnsClientPage({
  initialData,
  currentUser,
  companies,
  jobs,
  quotations,
}: GoodsReturnsClientPageProps) {
  const router = useRouter();
  const [data, setData] = useState<any[]>(initialData || []);

  // UI state
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_month" | "this_year">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Selected item for details modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Helpers
  const parseItems = (items: any): any[] => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const formatThaiDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getReturnTypeMeta = (type: string) => {
    switch (type) {
      case "DEFECT":
        return {
          label: "คืนของเสีย",
          badgeClass: "bg-red-50 text-[#ff2301] border-red-200/80 font-bold",
          dotColor: "bg-[#ff2301]",
        };
      case "REPAIR":
        return {
          label: "ส่งซ่อม",
          badgeClass: "bg-gray-900 text-white border-gray-800 font-bold",
          dotColor: "bg-gray-900",
        };
      case "SUPPLIER":
        return {
          label: "คืนซัพพลายเออร์",
          badgeClass: "bg-gray-100 text-gray-800 border-gray-200 font-semibold",
          dotColor: "bg-gray-500",
        };
      case "RETURN_TO_CUSTOMER":
        return {
          label: "คืนลูกค้า",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          dotColor: "bg-emerald-600",
        };
      case "RETURN_WITHOUT_REPAIR":
        return {
          label: "คืนโดยไม่ซ่อม",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
          dotColor: "bg-amber-600",
        };
      default:
        return {
          label: type || "ส่งคืน",
          badgeClass: "bg-gray-100 text-gray-700 border-gray-200 font-medium",
          dotColor: "bg-gray-400",
        };
    }
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "Completed":
      case "เสร็จสิ้น":
        return {
          label: "เสร็จสมบูรณ์",
          badgeClass: "bg-gray-900 text-white border-gray-800 font-bold",
          dotColor: "bg-emerald-400",
          icon: CheckCircle2,
        };
      case "Draft":
      default:
        return {
          label: "แบบร่าง",
          badgeClass: "bg-gray-100 text-gray-700 border-gray-200/90 font-medium",
          dotColor: "bg-gray-400",
          icon: Clock,
        };
    }
  };

  // Delete Action with SweetAlert2
  const handleDelete = async (doc: any) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบเอกสาร?",
      text: `ต้องการลบเอกสารเลขที่ "${doc.documentNo}" หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsDeleting(doc.id);
    try {
      const res = await deleteGoodsReturn(doc.id);
      if (res.success) {
        setData((prev) => prev.filter((d) => d.id !== doc.id));
        if (selectedDoc?.id === doc.id) {
          setSelectedDoc(null);
        }
        await Swal.fire({
          icon: "success",
          title: "ลบเอกสารสำเร็จ",
          text: `ลบเอกสาร ${doc.documentNo} เรียบร้อยแล้ว`,
          timer: 1100,
          showConfirmButton: false,
        });
      } else {
        throw new Error(res.error || "Failed to delete document");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถลบเอกสารได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const completed = data.filter((d) => d.status === "Completed").length;
    const draft = data.filter((d) => d.status === "Draft" || !d.status).length;
    const defectAndRepair = data.filter(
      (d) => d.returnType === "DEFECT" || d.returnType === "REPAIR"
    ).length;
    return { total, completed, draft, defectAndRepair };
  }, [data]);

  // Filtered Data
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return data.filter((d: any) => {
      // 1. Tab filter
      if (activeTab === "DRAFT" && d.status !== "Draft") return false;
      if (activeTab === "COMPLETED" && d.status !== "Completed") return false;
      if (activeTab === "DEFECT" && d.returnType !== "DEFECT") return false;
      if (activeTab === "REPAIR" && d.returnType !== "REPAIR") return false;
      if (activeTab === "SUPPLIER" && d.returnType !== "SUPPLIER") return false;
      if (activeTab === "RETURN_TO_CUSTOMER" && d.returnType !== "RETURN_TO_CUSTOMER") return false;

      // 2. Return Type dropdown filter
      if (typeFilter !== "all" && d.returnType !== typeFilter) return false;

      // 3. Status dropdown filter
      if (statusFilter !== "all" && d.status !== statusFilter) return false;

      // 4. Date filter
      if (dateFilter !== "all") {
        const docDate = d.date ? new Date(d.date) : new Date(d.createdAt);
        if (dateFilter === "today" && (docDate < startOfToday || docDate > endOfToday)) return false;
        if (dateFilter === "this_month" && docDate < startOfMonth) return false;
        if (dateFilter === "this_year" && docDate < startOfYear) return false;
      }

      // 5. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchDoc = d.documentNo?.toLowerCase().includes(q);
        const matchCust = (d.customer || d.company?.companyName || "")?.toLowerCase().includes(q);
        const matchLoc = d.deliveryLocation?.toLowerCase().includes(q);
        const matchSender = d.senderName?.toLowerCase().includes(q);
        const matchReceiver = d.receiverName?.toLowerCase().includes(q);
        const matchJob = d.job?.jobNumber?.toLowerCase().includes(q);
        const matchQuo = d.quotation?.quotationNumber?.toLowerCase().includes(q);

        if (!matchDoc && !matchCust && !matchLoc && !matchSender && !matchReceiver && !matchJob && !matchQuo) {
          return false;
        }
      }

      return true;
    });
  }, [data, activeTab, typeFilter, statusFilter, dateFilter, search]);

  return (
    <div className="space-y-8">
      {/* ── Page Header (Symmetrical Red/White/Gray) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle red gradient top bar */}
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />

        {/* Left: Branding & Title */}
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-gray-900/15 shrink-0 relative">
            <RotateCcw className="w-7 h-7 text-[#ff2301]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2301] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff2301]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                ใบส่งคืนสินค้า
              </h1>
              <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/80">
                GOODS RETURNS &amp; DEFECTS
              </span>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
              <span>SERVICE LOGISTICS</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 font-normal">
                จัดการเอกสารส่งคืนสินค้า คืนของเสีย ส่งซ่อม และคืนลูกค้า/ซัพพลายเออร์
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

          {/* Create Button */}
          <Link
            href="/service/goods-returns/new"
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-bold transition-all shadow-md shadow-red-500/25 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างใบส่งคืนสินค้า</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Strip (Symmetrical 4 Columns) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: All Documents */}
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "ALL"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                เอกสารทั้งหมด
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {kpis.total}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-xl">
            รายการทั้งหมด
          </span>
        </button>

        {/* KPI 2: Drafts */}
        <button
          type="button"
          onClick={() => setActiveTab("DRAFT")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "DRAFT"
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
                แบบร่าง
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {kpis.draft}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl">
            รอตรวจสอบ
          </span>
        </button>

        {/* KPI 3: Defect & Repair */}
        <button
          type="button"
          onClick={() => setActiveTab("DEFECT")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "DEFECT" || activeTab === "REPAIR"
              ? "border-[#ff2301] ring-2 ring-red-500/20"
              : "border-gray-200/90"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-red-50 text-[#ff2301] rounded-2xl flex items-center justify-center shrink-0 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                ของเสีย / ส่งซ่อม
              </p>
              <p className="text-2xl font-black text-[#ff2301] mt-0.5">
                {kpis.defectAndRepair}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#ff2301] bg-red-50 px-2.5 py-1 rounded-xl border border-red-100">
            เคลม / ซ่อม
          </span>
        </button>

        {/* KPI 4: Completed */}
        <button
          type="button"
          onClick={() => setActiveTab("COMPLETED")}
          className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeTab === "COMPLETED"
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
                เสร็จสมบูรณ์
              </p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {kpis.completed}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-white bg-gray-900 px-2.5 py-1 rounded-xl">
            ปิดเอกสารแล้ว
          </span>
        </button>
      </div>

      {/* ── Main Workspace Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="px-6 pt-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "ALL"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ทั้งหมด</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "ALL"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("DRAFT")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "DRAFT"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>แบบร่าง</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "DRAFT"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.draft}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("DEFECT")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "DEFECT"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-[#ff2301]" />
              <span>คืนของเสีย</span>
            </button>

            <button
              onClick={() => setActiveTab("REPAIR")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "REPAIR"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>ส่งซ่อม</span>
            </button>

            <button
              onClick={() => setActiveTab("RETURN_TO_CUSTOMER")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "RETURN_TO_CUSTOMER"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>คืนลูกค้า</span>
            </button>

            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`pb-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "COMPLETED"
                  ? "border-[#ff2301] text-[#ff2301]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>เสร็จสมบูรณ์</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "COMPLETED"
                    ? "bg-red-100 text-[#ff2301]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {kpis.completed}
              </span>
            </button>
          </div>

          {/* Quick Search on Top Right */}
          <div className="pb-3.5 md:pb-3 w-full md:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเลขที่, ลูกค้า, สถานที่..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Filter Bar */}
        <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff2301]" />
              <span>ตัวกรอง:</span>
            </span>

            {/* Return Type Dropdown */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
              >
                <option value="all">ทุกประเภทการส่งคืน</option>
                <option value="DEFECT">คืนของเสีย</option>
                <option value="REPAIR">ส่งซ่อม</option>
                <option value="SUPPLIER">คืนซัพพลายเออร์</option>
                <option value="RETURN_TO_CUSTOMER">คืนลูกค้า</option>
                <option value="RETURN_WITHOUT_REPAIR">คืนโดยไม่ซ่อม</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="Draft">แบบร่าง (Draft)</option>
                <option value="Completed">เสร็จสมบูรณ์ (Completed)</option>
              </select>
            </div>

            {/* Date Range Dropdown */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
              >
                <option value="all">ทุกช่วงเวลา</option>
                <option value="today">วันนี้</option>
                <option value="this_month">เดือนนี้</option>
                <option value="this_year">ปีนี้</option>
              </select>
            </div>

            {(typeFilter !== "all" || statusFilter !== "all" || dateFilter !== "all" || search) && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setDateFilter("all");
                  setSearch("");
                }}
                className="text-xs font-bold text-[#ff2301] hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-gray-500 font-medium">
            แสดง <span className="font-bold text-gray-900">{filtered.length}</span> จากทั้งหมด{" "}
            <span className="font-bold text-gray-900">{data.length}</span> รายการ
          </div>
        </div>

        {/* ── View 1: Cards View ── */}
        {viewMode === "cards" && (
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50/70 rounded-3xl border border-gray-200 border-dashed">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-200 text-gray-400">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  ไม่พบรายการใบส่งคืนสินค้า
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  ไม่มีเอกสารที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก
                </p>
                <Link
                  href="/service/goods-returns/new"
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-[#ff2301] to-[#e01f01] text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 hover:from-[#e01f01] hover:to-[#c81900] transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างใบส่งคืนสินค้าใหม่</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((doc: any) => {
                  const typeMeta = getReturnTypeMeta(doc.returnType);
                  const statusMeta = getStatusMeta(doc.status);
                  const itemsList = parseItems(doc.items);

                  return (
                    <div
                      key={doc.id}
                      className="group bg-white rounded-2xl border border-gray-200 hover:border-red-300 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 relative"
                    >
                      {/* Top Red Gradient Accent */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff2301] to-[#e01f01] opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="p-5 sm:p-6 space-y-4">
                        {/* Header: Document No & Status / Type */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-mono font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-xl border border-gray-200/80">
                            {doc.documentNo}
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] border ${typeMeta.badgeClass}`}
                            >
                              {typeMeta.label}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] border ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                        </div>

                        {/* Customer & Company Details */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatThaiDate(doc.date)}</span>
                          </div>
                          <h3 className="text-base font-black text-gray-900 leading-snug group-hover:text-[#ff2301] transition-colors line-clamp-2 mt-1">
                            {doc.customer || doc.company?.companyName || "ไม่ระบุชื่อลูกค้า"}
                          </h3>

                          {/* Delivery location */}
                          {doc.deliveryLocation && (
                            <p className="text-xs text-gray-500 flex items-start gap-1.5 mt-2 line-clamp-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span>{doc.deliveryLocation}</span>
                            </p>
                          )}
                        </div>

                        {/* Linked Job or Quotation badges */}
                        {(doc.job?.jobNumber || doc.quotation?.quotationNumber || doc.reference) && (
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {doc.job?.jobNumber && (
                              <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded-lg border border-gray-200 font-mono">
                                Job: {doc.job.jobNumber}
                              </span>
                            )}
                            {doc.quotation?.quotationNumber && (
                              <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded-lg border border-gray-200 font-mono">
                                Quot: {doc.quotation.quotationNumber}
                              </span>
                            )}
                            {doc.reference && (
                              <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg border border-gray-200 truncate max-w-[150px]">
                                อ้างอิง: {doc.reference}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Items Preview Box */}
                        <div className="bg-gray-50/70 border border-gray-200/70 p-3.5 rounded-2xl space-y-1.5 group-hover:bg-red-50/20 transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-[#ff2301]" />
                              <span>รายการสินค้าส่งคืน</span>
                            </span>
                            <span className="font-bold text-gray-900">
                              {itemsList.length} รายการ
                            </span>
                          </div>

                          {itemsList.length > 0 && itemsList[0]?.description && (
                            <p className="text-xs text-gray-700 font-medium line-clamp-1">
                              • {itemsList[0].description}{" "}
                              {itemsList[0].quantity && (
                                <span className="text-gray-400 font-normal">
                                  ({itemsList[0].quantity} {itemsList[0].unit || "ชิ้น"})
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Signatures / Person info */}
                        {(doc.senderName || doc.receiverName) && (
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                            <span>ผู้ส่ง: <strong className="text-gray-800">{doc.senderName || "—"}</strong></span>
                            <span>ผู้รับ: <strong className="text-gray-800">{doc.receiverName || "—"}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Symmetrical Action Buttons */}
                      <div className="p-4 pt-0 mt-auto border-t border-gray-100/80 bg-gray-50/30 flex items-center justify-between gap-2">
                        {/* View Details Modal */}
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl bg-gray-900 hover:bg-black text-white transition-all shadow-sm active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูรายละเอียด</span>
                        </button>

                        {/* Download PDF */}
                        <a
                          href={`/api/service/goods-returns/${doc.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-[#ff2301] hover:border-red-300 transition-all shadow-sm"
                          title="ดาวน์โหลด PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {/* Edit Link */}
                        <Link
                          href={`/service/goods-returns/${doc.id}/edit`}
                          className="p-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
                          title="แก้ไขเอกสาร"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          disabled={isDeleting === doc.id}
                          className="p-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                          title="ลบเอกสาร"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">เลขที่เอกสาร</th>
                  <th className="py-3.5 px-4">วันที่</th>
                  <th className="py-3.5 px-4">ลูกค้า / บริษัท</th>
                  <th className="py-3.5 px-4">ประเภท</th>
                  <th className="py-3.5 px-4">จำนวนรายการ</th>
                  <th className="py-3.5 px-4">ผู้ส่ง / ผู้รับ</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc: any) => {
                    const typeMeta = getReturnTypeMeta(doc.returnType);
                    const statusMeta = getStatusMeta(doc.status);
                    const itemsList = parseItems(doc.items);

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Document No */}
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {doc.documentNo}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-gray-600">
                          {formatThaiDate(doc.date)}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 max-w-[220px] truncate">
                          <span className="font-bold text-gray-900">
                            {doc.customer || doc.company?.companyName || "—"}
                          </span>
                        </td>

                        {/* Return Type */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${typeMeta.badgeClass}`}>
                            {typeMeta.label}
                          </span>
                        </td>

                        {/* Items Count */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900">{itemsList.length} รายการ</span>
                          {itemsList[0]?.description && (
                            <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">
                              {itemsList[0].description}
                            </span>
                          )}
                        </td>

                        {/* Sender & Receiver */}
                        <td className="py-3.5 px-4 text-gray-600">
                          <div>
                            <span className="text-[10px] text-gray-400">ส่ง: </span>
                            <span className="font-semibold text-gray-800">{doc.senderName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400">รับ: </span>
                            <span className="font-semibold text-gray-800">{doc.receiverName || "—"}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDoc(doc)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={`/api/service/goods-returns/${doc.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-600 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                              title="ดาวน์โหลด PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <Link
                              href={`/service/goods-returns/${doc.id}/edit`}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="แก้ไขเอกสาร"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc)}
                              disabled={isDeleting === doc.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="ลบเอกสาร"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* ── Details Modal ── */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-md">
                  <RotateCcw className="w-5 h-5 text-[#ff2301]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-gray-900">
                      ใบส่งคืนสินค้า
                    </h2>
                    <span className="text-[11px] font-mono font-bold text-[#ff2301] bg-red-100/70 px-2 py-0.5 rounded-md">
                      {selectedDoc.documentNo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    วันที่: {formatThaiDate(selectedDoc.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
              {/* Status and Type Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    ประเภทการส่งคืน
                  </span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${
                        getReturnTypeMeta(selectedDoc.returnType).badgeClass
                      }`}
                    >
                      {getReturnTypeMeta(selectedDoc.returnType).label}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    สถานะเอกสาร
                  </span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${
                        getStatusMeta(selectedDoc.status).badgeClass
                      }`}
                    >
                      {getStatusMeta(selectedDoc.status).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Location */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#ff2301]" />
                  <span>ข้อมูลลูกค้าและสถานที่ส่งคืน</span>
                </h4>
                <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">ชื่อลูกค้า / บริษัท:</span>
                    <strong className="text-gray-900">
                      {selectedDoc.customer || selectedDoc.company?.companyName || "—"}
                    </strong>
                  </div>
                  {selectedDoc.deliveryLocation && (
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-gray-500 shrink-0">สถานที่ส่งคืน:</span>
                      <strong className="text-gray-800 text-right">{selectedDoc.deliveryLocation}</strong>
                    </div>
                  )}
                  {selectedDoc.reference && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">เลขที่อ้างอิง:</span>
                      <span className="font-mono text-gray-700">{selectedDoc.reference}</span>
                    </div>
                  )}
                  {selectedDoc.job?.jobNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">เลขที่ Job:</span>
                      <span className="font-mono text-gray-700">{selectedDoc.job.jobNumber}</span>
                    </div>
                  )}
                  {selectedDoc.quotation?.quotationNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">เลขที่ใบเสนอราคา:</span>
                      <span className="font-mono text-gray-700">{selectedDoc.quotation.quotationNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#ff2301]" />
                  <span>รายการสินค้า ({parseItems(selectedDoc.items).length} รายการ)</span>
                </h4>

                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">ลำดับ</th>
                        <th className="py-2.5 px-3">รหัสสินค้า / รุ่น</th>
                        <th className="py-2.5 px-3">รายละเอียดสินค้า</th>
                        <th className="py-2.5 px-3">Serial No.</th>
                        <th className="py-2.5 px-3 text-right">จำนวน</th>
                        <th className="py-2.5 px-3 text-right">มูลค่ารวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parseItems(selectedDoc.items).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-400">
                            ไม่มีรายการสินค้าในเอกสารนี้
                          </td>
                        </tr>
                      ) : (
                        parseItems(selectedDoc.items).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 text-center text-gray-400">{item.no || idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-medium text-gray-800">
                              {item.itemCode || item.model || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-gray-900 font-medium">
                              {item.description || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-gray-600">
                              {item.serialNumber || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                              {item.quantity} {item.unit || "ชิ้น"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                              {item.totalAmount ? `฿${Number(item.totalAmount).toLocaleString()}` : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Representatives */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    ผู้ส่งสินค้า (Sender)
                  </span>
                  <p className="text-xs font-bold text-gray-900">
                    {selectedDoc.senderName || "—"}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    วันที่ส่ง: {formatThaiDate(selectedDoc.senderDate)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    ผู้รับสินค้า (Receiver)
                  </span>
                  <p className="text-xs font-bold text-gray-900">
                    {selectedDoc.receiverName || "—"}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    วันที่รับ: {formatThaiDate(selectedDoc.receiverDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-5 h-10 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
              >
                ปิดหน้าต่าง
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/service/goods-returns/${selectedDoc.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 h-10 text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:border-gray-400 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด PDF</span>
                </a>

                <Link
                  href={`/service/goods-returns/${selectedDoc.id}/edit`}
                  className="px-5 h-10 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Pencil className="w-4 h-4" />
                  <span>แก้ไขเอกสาร</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
