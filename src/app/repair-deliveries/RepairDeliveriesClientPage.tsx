"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import {
  FileCheck2,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Printer,
  Edit2,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  List,
  LayoutGrid,
  Building2,
  User,
  Calendar,
  Check,
  Copy,
  Eye,
  ArrowUpDown,
  Wrench,
  GraduationCap,
  Hammer,
  HelpCircle,
  MapPin,
  Phone,
  FileSignature,
} from "lucide-react";
import { deleteRepairDelivery } from "@/app/actions/repairDeliveries";

interface RepairDeliveryItem {
  id: string;
  deliveryNumber: string;
  note?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  address?: string | null;
  company?: string | null;
  customer?: string | null;
  customerPosition?: string | null;
  deliveryDate?: string | Date | null;
  jobId?: string | null;
  jobName?: string | null;
  nameReceiver?: string | null;
  nameSender?: string | null;
  pdfUrl?: string | null;
  quotationNo?: string | null;
  sender?: string | null;
  senderPhone?: string | null;
  sigReceiverUrl?: string | null;
  sigSenderUrl?: string | null;
  siteAddress?: string | null;
  technician?: string | null;
  technicianPhone?: string | null;
  workInspect: boolean;
  workInstall: boolean;
  workOther?: string | null;
  workRepair: boolean;
  workTraining: boolean;
  status: string;
  workInspectDetails?: string | null;
  workInstallDetails?: string | null;
  workRepairDetails?: string | null;
  workTrainingDetails?: string | null;
  internalCompany?: string | null;
  job?: {
    id: string;
    jobNumber?: string | null;
    customerName?: string | null;
    companyCode?: string | null;
    sellerName?: string | null;
  } | null;
}

interface Props {
  initialDeliveries: RepairDeliveryItem[];
  currentUser: any;
}

export default function RepairDeliveriesClientPage({
  initialDeliveries,
  currentUser,
}: Props) {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<RepairDeliveryItem[]>(
    initialDeliveries || []
  );

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "Draft" | "Completed">("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [datePeriod, setDatePeriod] = useState("ALL");

  // Sort State
  const [sortField, setSortField] = useState<
    "deliveryDate" | "deliveryNumber" | "customer" | "status"
  >("deliveryDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // View Mode: Table vs Grid
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Drawer (Quick View)
  const [drawerItem, setDrawerItem] = useState<RepairDeliveryItem | null>(null);

  // Copy to clipboard indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Unique list of internal companies for filter
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    deliveries.forEach((d) => {
      if (d.internalCompany) set.add(d.internalCompany);
    });
    return Array.from(set).sort();
  }, [deliveries]);

  // KPI Calculations
  const totalCount = deliveries.length;
  const draftCount = useMemo(
    () => deliveries.filter((d) => d.status === "Draft").length,
    [deliveries]
  );
  const completedCount = useMemo(
    () => deliveries.filter((d) => d.status === "Completed").length,
    [deliveries]
  );

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return deliveries.filter((d) => {
      const targetDate = d.deliveryDate ? new Date(d.deliveryDate) : new Date(d.createdAt);
      return (
        targetDate.getFullYear() === curYear && targetDate.getMonth() === curMonth
      );
    }).length;
  }, [deliveries]);

  // Copy Handler
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return deliveries.filter((item) => {
      // 1. Status Filter
      if (statusTab !== "ALL" && item.status !== statusTab) {
        return false;
      }

      // 2. Company Filter
      if (companyFilter !== "ALL" && item.internalCompany !== companyFilter) {
        return false;
      }

      // 3. Date Period Filter
      if (datePeriod !== "ALL") {
        const itemDate = item.deliveryDate ? new Date(item.deliveryDate) : new Date(item.createdAt);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        if (datePeriod === "THIS_MONTH") {
          if (
            itemDate.getFullYear() !== currentYear ||
            itemDate.getMonth() !== currentMonth
          )
            return false;
        } else if (datePeriod === "LAST_MONTH") {
          const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
          if (
            itemDate.getFullYear() !== lastMonthDate.getFullYear() ||
            itemDate.getMonth() !== lastMonthDate.getMonth()
          )
            return false;
        } else if (datePeriod === "THIS_YEAR") {
          if (itemDate.getFullYear() !== currentYear) return false;
        }
      }

      // 4. Universal Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const match =
          (item.deliveryNumber || "").toLowerCase().includes(term) ||
          (item.customer || "").toLowerCase().includes(term) ||
          (item.company || "").toLowerCase().includes(term) ||
          (item.jobName || "").toLowerCase().includes(term) ||
          (item.job?.jobNumber || "").toLowerCase().includes(term) ||
          (item.nameReceiver || "").toLowerCase().includes(term) ||
          (item.technician || "").toLowerCase().includes(term) ||
          (item.quotationNo || "").toLowerCase().includes(term);

        if (!match) return false;
      }

      return true;
    });
  }, [deliveries, statusTab, companyFilter, datePeriod, searchTerm]);

  // Sort Logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "deliveryDate") {
        valA = a.deliveryDate
          ? new Date(a.deliveryDate).getTime()
          : new Date(a.createdAt).getTime();
        valB = b.deliveryDate
          ? new Date(b.deliveryDate).getTime()
          : new Date(b.createdAt).getTime();
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Toggle Sort Header
  const handleSort = (
    field: "deliveryDate" | "deliveryNumber" | "customer" | "status"
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusTab("ALL");
    setCompanyFilter("ALL");
    setDatePeriod("ALL");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusTab !== "ALL" ||
    companyFilter !== "ALL" ||
    datePeriod !== "ALL";

  // Excel Export Handler
  const handleExportExcel = () => {
    if (sortedData.length === 0) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลสำหรับส่งออก",
        text: "ไม่พบรายการใบส่งมอบงานตามเงื่อนไขที่เลือก",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const exportRows = sortedData.map((item, index) => {
      const works = [
        item.workInspect ? "ตรวจเช็ค" : null,
        item.workInstall ? "ติดตั้ง" : null,
        item.workRepair ? "งานซ่อม" : null,
        item.workTraining ? "อบรม" : null,
        item.workOther ? `อื่นๆ (${item.workOther})` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ลำดับ: index + 1,
        เลขที่ใบส่งมอบ: item.deliveryNumber || "-",
        เลขที่งานSales: item.job?.jobNumber || "-",
        ลูกค้า: item.customer || "-",
        บริษัทลูกค้า: item.company || "-",
        สังกัดบริษัท: item.internalCompany || "-",
        ชื่องาน: item.jobName || "-",
        ประเภทงานบริการ: works || "-",
        วันที่ส่งมอบ: item.deliveryDate
          ? new Date(item.deliveryDate).toLocaleDateString("th-TH")
          : new Date(item.createdAt).toLocaleDateString("th-TH"),
        ผู้รับมอบ: item.nameReceiver || "-",
        ตำแหน่งผู้รับมอบ: item.customerPosition || "-",
        ช่างเทคนิค: item.technician || "-",
        สถานะ: item.status === "Completed" ? "ส่งมอบแล้ว" : "ร่าง / รอส่งมอบ",
        หมายเหตุ: item.note || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ใบส่งมอบงาน");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `ใบส่งมอบงาน_${dateStr}.xlsx`);
  };

  // Delete Handler with SweetAlert2
  const handleDelete = async (id: string, deliveryNumber: string) => {
    const confirm = await Swal.fire({
      title: "ยืนยันการลบใบส่งมอบงาน?",
      text: `คุณต้องการลบเอกสารเลขที่ ${deliveryNumber || id} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบเอกสาร",
      cancelButtonText: "ยกเลิก",
    });

    if (confirm.isConfirmed) {
      const res = await deleteRepairDelivery(id);
      if (res.success) {
        setDeliveries((prev) => prev.filter((d) => d.id !== id));
        Swal.fire({
          icon: "success",
          title: "ลบสำเร็จ",
          text: "ลบใบส่งมอบงานเรียบร้อยแล้ว",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถลบเอกสารได้",
          confirmButtonColor: "#ff2301",
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Top Header Card (Symmetrical & Modern Red/White/Gray) ── */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          {/* Left: Red Squircle Badge + Title + Subtitle */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
                <FileCheck2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  ใบส่งมอบงาน
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                  {totalCount} รายการ
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                <span>REPAIR DELIVERIES & SERVICE REPORTS</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-normal">
                  ระบบบันทึกและติดตามการส่งมอบงานบริการ
                </span>
              </p>
            </div>
          </div>

          {/* Right: Symmetrical Action Button Cluster (Single Row, Unified h-10 Heights) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap w-full md:w-auto justify-start md:justify-end overflow-x-auto pb-1 md:pb-0">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Export to Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
              title="ส่งออก Excel"
            >
              <Download className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">ส่งออก Excel</span>
            </button>

            {/* View Mode Toggle */}
            <div className="inline-flex items-center p-1 h-10 bg-gray-100 rounded-xl border border-gray-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="มุมมองตาราง"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Primary CTA Button */}
            <Link
              href="/repair-deliveries/new"
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">สร้างใบส่งมอบงาน</span>
              <span className="sm:hidden">ส่งมอบใหม่</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Strip (4 Symmetrical Interactive Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Deliveries */}
        <div
          onClick={() => setStatusTab("ALL")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
            statusTab === "ALL"
              ? "bg-gray-900 text-white border-gray-900 ring-2 ring-gray-900/20"
              : "bg-white text-gray-800 border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                statusTab === "ALL" ? "text-gray-300" : "text-gray-500"
              }`}
            >
              เอกสารทั้งหมด
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                statusTab === "ALL"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight">
            {totalCount}
          </div>
          <div
            className={`text-xs mt-1.5 font-medium ${
              statusTab === "ALL" ? "text-gray-400" : "text-gray-400"
            }`}
          >
            รายการส่งมอบงานทั้งหมดในระบบ
          </div>
          <div className="w-full bg-gray-200/50 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#ff2301] h-full w-full rounded-full" />
          </div>
        </div>

        {/* Card 2: Draft / Pending Deliveries */}
        <div
          onClick={() => setStatusTab("Draft")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
            statusTab === "Draft"
              ? "bg-red-50 text-red-950 border-red-300 ring-2 ring-red-500/20"
              : "bg-white text-gray-800 border-gray-200 hover:border-red-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              ร่าง / รอส่งมอบ
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#ff2301] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#ff2301]">
            {draftCount}
          </div>
          <div className="text-xs mt-1.5 font-medium text-red-600/80">
            {totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0}% ของรายการทั้งหมด
          </div>
          <div className="w-full bg-red-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#ff2301] h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (draftCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Completed Deliveries */}
        <div
          onClick={() => setStatusTab("Completed")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
            statusTab === "Completed"
              ? "bg-gray-100 text-gray-900 border-gray-400 ring-2 ring-gray-900/10"
              : "bg-white text-gray-800 border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              ส่งมอบเรียบร้อย
            </span>
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            {completedCount}
          </div>
          <div className="text-xs mt-1.5 font-medium text-gray-500">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% ปิดงานส่งมอบแล้ว
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gray-800 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Delivered This Month */}
        <div
          onClick={() => setDatePeriod(datePeriod === "THIS_MONTH" ? "ALL" : "THIS_MONTH")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
            datePeriod === "THIS_MONTH"
              ? "bg-red-50 text-red-950 border-red-300 ring-2 ring-red-500/20"
              : "bg-white text-gray-800 border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              ส่งมอบเดือนนี้
            </span>
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            {thisMonthCount}{" "}
            <span className="text-sm font-semibold text-gray-400">ใบ</span>
          </div>
          <div className="text-xs mt-1.5 font-medium text-gray-400">
            งานที่ส่งมอบในเดือนปัจจุบัน
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gray-800 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? Math.min(100, (thisMonthCount / totalCount) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Symmetrical Toolbar (Status Tabs + Filter Dropdowns + Search) ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Row 1: Status Tabs & Quick Counters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "ทั้งหมด", count: totalCount },
              {
                id: "Draft",
                label: "ร่าง / รอส่งมอบ",
                count: draftCount,
                dot: "bg-[#ff2301]",
              },
              {
                id: "Completed",
                label: "ส่งมอบแล้ว",
                count: completedCount,
                dot: "bg-gray-800",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  statusTab === tab.id
                    ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    statusTab === tab.id
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff2301] hover:underline self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>

        {/* Row 2: Search Input & Multi-Drop Filters (12 Columns Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Universal Search (md:col-span-5) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ส่งมอบ, ลูกค้า, ชื่องาน, ผู้รับมอบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Internal Company Filter (md:col-span-3) */}
          <div className="md:col-span-3">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-700"
            >
              <option value="ALL">สังกัดบริษัททั้งหมด ({uniqueCompanies.length} บริษัท)</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Period Filter (md:col-span-2) */}
          <div className="md:col-span-2">
            <select
              value={datePeriod}
              onChange={(e) => setDatePeriod(e.target.value)}
              className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-700"
            >
              <option value="ALL">ช่วงเวลาทั้งหมด</option>
              <option value="THIS_MONTH">ส่งมอบเดือนนี้</option>
              <option value="LAST_MONTH">ส่งมอบเดือนก่อน</option>
              <option value="THIS_YEAR">ส่งมอบปีนี้</option>
            </select>
          </div>

          {/* Sort By (md:col-span-2) */}
          <div className="md:col-span-2">
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split("-") as any;
                setSortField(f);
                setSortDirection(d);
              }}
              className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-700"
            >
              <option value="deliveryDate-desc">วันที่ล่าสุดก่อน</option>
              <option value="deliveryDate-asc">วันที่เก่าสุดก่อน</option>
              <option value="deliveryNumber-asc">เลขที่เอกสาร A-Z</option>
              <option value="customer-asc">ลูกค้า A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Content View (Table or Grid) ── */}
      {viewMode === "table" ? (
        /* ──── Symmetrical Table View ──── */
        <div className="bg-white border border-gray-200/90 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/90 border-b border-gray-200 sticky top-0 z-10 font-bold select-none">
                <tr>
                  <th
                    onClick={() => handleSort("deliveryDate")}
                    className="px-4 py-4 text-center cursor-pointer hover:text-gray-900 transition-colors min-w-[130px] whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>วันที่ส่งมอบ</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("deliveryNumber")}
                    className="px-5 py-4 text-left cursor-pointer hover:text-gray-900 transition-colors min-w-[170px] whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>เลขที่ส่งมอบ / Job</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("customer")}
                    className="px-5 py-4 text-left cursor-pointer hover:text-gray-900 transition-colors min-w-[210px] whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ลูกค้าและบริษัท</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left min-w-[200px] whitespace-nowrap">
                    ชื่องานและบริการ
                  </th>
                  <th className="px-5 py-4 text-left min-w-[160px] whitespace-nowrap">
                    ผู้รับมอบ
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="px-4 py-4 text-center cursor-pointer hover:text-gray-900 transition-colors min-w-[130px] whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>สถานะ</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center min-w-[150px] whitespace-nowrap">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sortedData.length > 0 ? (
                  sortedData.map((item) => {
                    const workBadges = [
                      item.workInspect ? { label: "ตรวจเช็ค", color: "bg-blue-50 text-blue-700 border-blue-200" } : null,
                      item.workInstall ? { label: "ติดตั้ง", color: "bg-emerald-50 text-emerald-700 border-emerald-200" } : null,
                      item.workRepair ? { label: "งานซ่อม", color: "bg-red-50 text-[#ff2301] border-red-200" } : null,
                      item.workTraining ? { label: "อบรม", color: "bg-purple-50 text-purple-700 border-purple-200" } : null,
                      item.workOther ? { label: "อื่นๆ", color: "bg-gray-100 text-gray-700 border-gray-200" } : null,
                    ].filter(Boolean);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-red-50/20 transition-colors group"
                      >
                        {/* วันที่ส่งมอบ */}
                        <td className="px-4 py-4 text-center align-middle whitespace-nowrap min-w-[130px]">
                          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-800">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>
                              {item.deliveryDate
                                ? new Date(item.deliveryDate).toLocaleDateString("th-TH")
                                : item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString("th-TH")
                                : "-"}
                            </span>
                          </div>
                        </td>

                        {/* เลขที่ส่งมอบ / Job No */}
                        <td className="px-5 py-4 text-left align-middle">
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              type="button"
                              onClick={() => handleCopy(item.deliveryNumber, item.id)}
                              className="font-mono font-bold text-gray-900 hover:text-[#ff2301] transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap"
                              title="คลิกเพื่อคัดลอกเลขเอกสาร"
                            >
                              <span>{item.deliveryNumber}</span>
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-[#ff2301]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>

                            {item.job?.jobNumber ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                Job: {item.job.jobNumber}
                              </span>
                            ) : item.quotationNo ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-200 whitespace-nowrap">
                                QT: {item.quotationNo}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* ลูกค้าและบริษัท */}
                        <td className="px-5 py-4 text-left align-middle min-w-[210px]">
                          <div className="font-bold text-gray-900 flex items-start gap-1.5">
                            <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">
                              {item.customer || item.company || "-"}
                            </span>
                          </div>
                          {item.company && item.customer && item.company !== item.customer && (
                            <div className="text-xs text-gray-400 pl-5.5 mt-0.5">
                              {item.company}
                            </div>
                          )}
                          {item.internalCompany && (
                            <div className="mt-1 pl-5.5">
                              <span className="inline-block px-2 py-0.5 bg-red-50 text-[#ff2301] text-[10px] font-bold rounded-md border border-red-200/80">
                                {item.internalCompany}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* ชื่องานและรายการบริการ */}
                        <td className="px-5 py-4 text-left align-middle min-w-[200px]">
                          <div className="font-semibold text-gray-800 text-xs leading-snug line-clamp-2">
                            {item.jobName || "—"}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {workBadges.map((w: any, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${w.color}`}
                              >
                                {w.label}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* ผู้รับมอบ */}
                        <td className="px-5 py-4 text-left align-middle min-w-[160px]">
                          <div className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{item.nameReceiver || "—"}</span>
                          </div>
                          {item.customerPosition && (
                            <div className="text-[11px] text-gray-400 pl-5 mt-0.5">
                              {item.customerPosition}
                            </div>
                          )}
                        </td>

                        {/* สถานะ */}
                        <td className="px-4 py-4 text-center align-middle whitespace-nowrap min-w-[130px]">
                          <span
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs whitespace-nowrap shrink-0 ${
                              item.status === "Completed"
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-red-50 text-[#ff2301] border-red-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                item.status === "Completed"
                                  ? "bg-white"
                                  : "bg-[#ff2301] animate-pulse"
                              }`}
                            />
                            <span>
                              {item.status === "Completed"
                                ? "ส่งมอบแล้ว"
                                : "ร่าง / รอส่งมอบ"}
                            </span>
                          </span>
                        </td>

                        {/* จัดการ */}
                        <td className="px-4 py-4 text-center align-middle whitespace-nowrap min-w-[150px]">
                          <div className="flex items-center justify-center gap-1">
                            {/* Quick View Drawer */}
                            <button
                              type="button"
                              onClick={() => setDrawerItem(item)}
                              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                              title="ดูรายละเอียดฉบับย่อ"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Print PDF */}
                            <Link
                              href={`/repair-deliveries/${item.id}/pdf`}
                              target="_blank"
                              className="p-2 text-gray-500 hover:text-[#ff2301] hover:bg-red-50 rounded-xl transition-colors"
                              title="พิมพ์ใบส่งมอบ (PDF)"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>

                            {/* Edit */}
                            <Link
                              href={`/repair-deliveries/${item.id}/edit`}
                              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                              title="แก้ไขเอกสาร"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(item.id, item.deliveryNumber)
                              }
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="ลบเอกสาร"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">
                          {hasActiveFilters
                            ? "ไม่พบข้อมูลที่ตรงกับตัวกรอง"
                            : "ยังไม่มีรายการใบส่งมอบงานในระบบ"}
                        </span>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-xs font-semibold text-[#ff2301] hover:underline"
                          >
                            ล้างตัวกรองทั้งหมด
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="p-4 bg-gray-50/80 border-t border-gray-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>
              แสดงข้อมูลทั้งหมด <strong className="text-gray-900">{sortedData.length}</strong> จาก{" "}
              {totalCount} รายการ
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
                <span>ร่าง / รอส่งมอบ: {draftCount}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-900" />
                <span>ส่งมอบแล้ว: {completedCount}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ──── Symmetrical Grid Cards View ──── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedData.length > 0 ? (
            sortedData.map((item) => {
              const workBadges = [
                item.workInspect ? { label: "ตรวจเช็ค", color: "bg-blue-50 text-blue-700 border-blue-200" } : null,
                item.workInstall ? { label: "ติดตั้ง", color: "bg-emerald-50 text-emerald-700 border-emerald-200" } : null,
                item.workRepair ? { label: "งานซ่อม", color: "bg-red-50 text-[#ff2301] border-red-200" } : null,
                item.workTraining ? { label: "อบรม", color: "bg-purple-50 text-purple-700 border-purple-200" } : null,
                item.workOther ? { label: "อื่นๆ", color: "bg-gray-100 text-gray-700 border-gray-200" } : null,
              ].filter(Boolean);

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    {/* Header: Delivery Number & Status */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.deliveryNumber, item.id)}
                        className="font-mono font-bold text-gray-900 hover:text-[#ff2301] text-sm flex items-center gap-1.5"
                        title="คัดลอกเลขที่เอกสาร"
                      >
                        <span>{item.deliveryNumber}</span>
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-[#ff2301]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-xs ${
                          item.status === "Completed"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-red-50 text-[#ff2301] border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === "Completed" ? "bg-white" : "bg-[#ff2301]"
                          }`}
                        />
                        {item.status === "Completed" ? "ส่งมอบแล้ว" : "ร่าง / รอส่งมอบ"}
                      </span>
                    </div>

                    {/* Customer & Company Info */}
                    <div className="space-y-3 mb-4">
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase block mb-0.5">
                          ลูกค้า / บริษัท
                        </span>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">
                            {item.customer || item.company || "-"}
                          </span>
                        </div>
                        {item.internalCompany && (
                          <div className="mt-1">
                            <span className="inline-block px-2 py-0.5 bg-red-50 text-[#ff2301] text-[10px] font-bold rounded-md border border-red-200/80">
                              {item.internalCompany}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Job & Work Details */}
                      <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase block mb-0.5">
                          ชื่องาน / รายละเอียด
                        </span>
                        <div className="font-semibold text-gray-800 text-xs line-clamp-2">
                          {item.jobName || "—"}
                        </div>
                        {item.job?.jobNumber && (
                          <div className="mt-1 font-mono text-[11px] text-[#ff2301] font-bold">
                            Job: {item.job.jobNumber}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {workBadges.map((w: any, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${w.color}`}
                            >
                              {w.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dates & Receiver */}
                    <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1 text-gray-400">
                          <User className="w-3.5 h-3.5" />
                          <span>ผู้รับมอบ:</span>
                        </span>
                        <span className="font-bold text-gray-800">
                          {item.nameReceiver || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>วันที่ส่งมอบ:</span>
                        </span>
                        <span className="font-medium text-gray-800">
                          {item.deliveryDate
                            ? new Date(item.deliveryDate).toLocaleDateString("th-TH")
                            : item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("th-TH")
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDrawerItem(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#ff2301] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียด</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/repair-deliveries/${item.id}/pdf`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                        title="พิมพ์ใบส่งมอบ (PDF)"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>

                      <Link
                        href={`/repair-deliveries/${item.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="แก้ไขเอกสาร"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.deliveryNumber)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบเอกสาร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center bg-white border border-gray-200 rounded-3xl">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600">
                {hasActiveFilters ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีรายการใบส่งมอบงาน"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Slide-Over Quick Detail Drawer ── */}
      {drawerItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerItem(null)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center border border-red-200">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 font-mono">
                      {drawerItem.deliveryNumber}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        drawerItem.status === "Completed"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-red-50 text-[#ff2301] border-red-200"
                      }`}
                    >
                      {drawerItem.status === "Completed"
                        ? "ส่งมอบแล้ว"
                        : "ร่าง / รอส่งมอบ"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">รายละเอียดใบส่งมอบงานบริการ</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerItem(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Job Reference */}
              {drawerItem.job?.jobNumber && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block font-semibold">
                      เชื่อมโยงงานขาย (Sales Job)
                    </span>
                    <span className="text-sm font-bold font-mono text-gray-900">
                      {drawerItem.job.jobNumber}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-gray-700">
                    {drawerItem.job.companyCode || drawerItem.internalCompany || "TERA"}
                  </span>
                </div>
              )}

              {/* Customer & Site Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                    ลูกค้า / บริษัท
                  </span>
                  <div className="font-bold text-gray-900 text-sm">
                    {drawerItem.customer || drawerItem.company || "-"}
                  </div>
                  {drawerItem.company && drawerItem.customer && (
                    <div className="text-xs text-gray-500 mt-1">
                      {drawerItem.company}
                    </div>
                  )}
                  {drawerItem.address && (
                    <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {drawerItem.address}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                    สถานที่ส่งมอบ / ไซต์งาน
                  </span>
                  <div className="font-bold text-gray-900 text-sm">
                    {drawerItem.siteAddress || drawerItem.address || "ตามที่อยู่บริษัท"}
                  </div>
                  {drawerItem.quotationNo && (
                    <div className="text-xs font-mono text-gray-500 mt-1">
                      QT: {drawerItem.quotationNo}
                    </div>
                  )}
                </div>
              </div>

              {/* Work Types Checklist */}
              <div>
                <span className="text-xs font-bold text-gray-700 block mb-2">
                  ขอบเขตงานบริการที่ส่งมอบ
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "ตรวจเช็ค", active: drawerItem.workInspect, icon: Wrench },
                    { label: "ติดตั้ง", active: drawerItem.workInstall, icon: Hammer },
                    { label: "งานซ่อม", active: drawerItem.workRepair, icon: CheckCircle2 },
                    { label: "อบรม", active: drawerItem.workTraining, icon: GraduationCap },
                  ].map((w, i) => {
                    const Icon = w.icon;
                    return (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                          w.active
                            ? "bg-red-50 text-[#ff2301] border-red-200"
                            : "bg-gray-50 text-gray-400 border-gray-200 opacity-60"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{w.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Work Details Text */}
              <div className="space-y-3">
                {drawerItem.workInspectDetails && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-gray-700 block mb-1">
                      รายละเอียดการตรวจเช็ค:
                    </span>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {drawerItem.workInspectDetails}
                    </p>
                  </div>
                )}
                {drawerItem.workInstallDetails && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-gray-700 block mb-1">
                      รายละเอียดการติดตั้ง:
                    </span>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {drawerItem.workInstallDetails}
                    </p>
                  </div>
                )}
                {drawerItem.workRepairDetails && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-gray-700 block mb-1">
                      รายละเอียดงานซ่อม:
                    </span>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {drawerItem.workRepairDetails}
                    </p>
                  </div>
                )}
                {drawerItem.workTrainingDetails && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-gray-700 block mb-1">
                      รายละเอียดการอบรม:
                    </span>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {drawerItem.workTrainingDetails}
                    </p>
                  </div>
                )}
                {drawerItem.workOther && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-gray-700 block mb-1">
                      บริการอื่นๆ:
                    </span>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {drawerItem.workOther}
                    </p>
                  </div>
                )}
              </div>

              {/* Note / Remarks */}
              {drawerItem.note && (
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">
                    หมายเหตุเพิ่มเติม
                  </span>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {drawerItem.note}
                  </div>
                </div>
              )}

              {/* Responsible Personnel & Signatures */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">ผู้ส่งมอบ / ช่าง</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {drawerItem.technician || drawerItem.nameSender || drawerItem.sender || "—"}
                  </span>
                  {drawerItem.technicianPhone && (
                    <span className="text-gray-500 text-[11px] block mt-0.5">
                      โทร: {drawerItem.technicianPhone}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 block font-semibold">ผู้รับมอบ (ลูกค้า)</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {drawerItem.nameReceiver || "—"}
                  </span>
                  {drawerItem.customerPosition && (
                    <span className="text-gray-500 text-[11px] block mt-0.5">
                      ตำแหน่ง: {drawerItem.customerPosition}
                    </span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">วันที่ส่งมอบ</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {drawerItem.deliveryDate
                      ? new Date(drawerItem.deliveryDate).toLocaleDateString("th-TH")
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">วันที่สร้างเอกสาร</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {drawerItem.createdAt
                      ? new Date(drawerItem.createdAt).toLocaleDateString("th-TH")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
              <Link
                href={`/repair-deliveries/${drawerItem.id}/pdf`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ PDF</span>
              </Link>

              <Link
                href={`/repair-deliveries/${drawerItem.id}/edit`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                <span>แก้ไขเอกสาร</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
