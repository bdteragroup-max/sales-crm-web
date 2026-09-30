"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Plus,
  Search,
  FileText,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  User,
  Phone,
  Calendar,
  ArrowUpDown,
  Download,
  LayoutGrid,
  List,
  RotateCcw,
  Eye,
  ExternalLink,
  Copy,
  Check,
  X,
  AlertCircle,
  Cpu,
  ChevronDown,
  Layers,
  MapPin,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { deleteOutsourceRepair } from "@/app/actions/outsourceRepairs";

interface OutsourceRepairsClientPageProps {
  initialData: any[];
  currentUser: any;
}

export default function OutsourceRepairsClientPage({
  initialData,
  currentUser,
}: OutsourceRepairsClientPageProps) {
  const router = useRouter();
  const [data, setData] = useState<any[]>(initialData || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [vendorFilter, setVendorFilter] = useState<string>("ALL");
  const [datePeriod, setDatePeriod] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<"sentDate" | "outsourceNumber" | "vendorName" | "status">("sentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Slide-over quick view drawer
  const [drawerItem, setDrawerItem] = useState<any | null>(null);

  // Unique vendors for dropdown
  const uniqueVendors = useMemo(() => {
    const list = data
      .map((d) => d.vendorName)
      .filter((v): v is string => Boolean(v && v.trim()));
    return Array.from(new Set(list)).sort();
  }, [data]);

  // Overall KPI counts
  const totalCount = data.length;
  const sentCount = data.filter((d) => d.status === "SENT").length;
  const returnedCount = data.filter((d) => d.status === "RETURNED").length;
  const totalItemsCount = useMemo(() => {
    return data.reduce((acc, curr) => {
      const itemsList = Array.isArray(curr.items) ? curr.items : [];
      return (
        acc +
        itemsList.reduce(
          (sum: number, it: any) => sum + (parseInt(it.qty, 10) || 1),
          0
        )
      );
    }, 0);
  }, [data]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete item with SweetAlert2
  const handleDelete = async (id: string, outsourceNumber?: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบเอกสาร?",
      text: `คุณต้องการลบใบส่งซ่อม ${outsourceNumber || ""} หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบเอกสาร",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteOutsourceRepair(id);
        if (res.success) {
          setData((prev) => prev.filter((d) => d.id !== id));
          if (drawerItem?.id === id) setDrawerItem(null);
          Swal.fire({
            title: "ลบสำเร็จ",
            text: "เอกสารใบส่งซ่อมถูกลบออกจากระบบแล้ว",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: "เกิดข้อผิดพลาด",
            text: res.error || "ไม่สามารถลบเอกสารได้",
            icon: "error",
            confirmButtonColor: "#ff2301",
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
          icon: "error",
          confirmButtonColor: "#ff2301",
        });
      }
    }
  };

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Status Tab
      if (statusTab !== "ALL" && item.status !== statusTab) {
        return false;
      }

      // 2. Vendor Dropdown
      if (vendorFilter !== "ALL" && item.vendorName !== vendorFilter) {
        return false;
      }

      // 3. Date Period
      if (datePeriod !== "ALL" && item.sentDate) {
        const itemDate = new Date(item.sentDate);
        const now = new Date();
        if (datePeriod === "THIS_MONTH") {
          if (
            itemDate.getMonth() !== now.getMonth() ||
            itemDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        } else if (datePeriod === "LAST_MONTH") {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (
            itemDate.getMonth() !== lastMonth.getMonth() ||
            itemDate.getFullYear() !== lastMonth.getFullYear()
          ) {
            return false;
          }
        } else if (datePeriod === "THIS_YEAR") {
          if (itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      // 4. Search Full-text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const itemsStr = Array.isArray(item.items)
          ? item.items
              .map((i: any) => `${i.type || ""} ${i.model || ""} ${i.brand || ""} ${i.serial || ""}`)
              .join(" ")
              .toLowerCase()
          : "";

        const match =
          (item.outsourceNumber?.toLowerCase() || "").includes(term) ||
          (item.vendorName?.toLowerCase() || "").includes(term) ||
          (item.vendorPhone?.toLowerCase() || "").includes(term) ||
          (item.customerName?.toLowerCase() || "").includes(term) ||
          (item.customerPhone?.toLowerCase() || "").includes(term) ||
          (item.job?.jobNumber?.toLowerCase() || "").includes(term) ||
          (item.sender?.toLowerCase() || "").includes(term) ||
          (item.symptoms?.toLowerCase() || "").includes(term) ||
          (item.remark?.toLowerCase() || "").includes(term) ||
          itemsStr.includes(term);

        if (!match) return false;
      }

      return true;
    });
  }, [data, statusTab, vendorFilter, datePeriod, searchTerm]);

  // Sort Logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "sentDate") {
        valA = a.sentDate ? new Date(a.sentDate).getTime() : 0;
        valB = b.sentDate ? new Date(b.sentDate).getTime() : 0;
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Toggle sort handler
  const handleSort = (field: "sentDate" | "outsourceNumber" | "vendorName" | "status") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusTab("ALL");
    setVendorFilter("ALL");
    setDatePeriod("ALL");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusTab !== "ALL" ||
    vendorFilter !== "ALL" ||
    datePeriod !== "ALL";

  // Excel Export Handler
  const handleExportExcel = () => {
    if (sortedData.length === 0) {
      Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลสำหรับส่งออก",
        text: "ไม่พบรายการส่งซ่อมตามเงื่อนไขที่เลือก",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const exportRows = sortedData.map((item, index) => {
      const itemsList = Array.isArray(item.items) ? item.items : [];
      const itemsSummary = itemsList
        .map(
          (it: any) =>
            `${it.type || ""} ${it.brand || ""} ${it.model || ""} (${it.qty || 1} ตัว)`
        )
        .join("; ");

      return {
        ลำดับ: index + 1,
        เลขที่ใบส่งซ่อม: item.outsourceNumber || "-",
        เลขที่งานSales: item.job?.jobNumber || "-",
        ซัพพลายเออร์: item.vendorName || "-",
        เบอร์โทรซัพพลายเออร์: item.vendorPhone || "-",
        ลูกค้า: item.customerName || "-",
        เบอร์โทรลูกค้า: item.customerPhone || "-",
        วันที่ส่งซ่อม: item.sentDate
          ? new Date(item.sentDate).toLocaleDateString("th-TH")
          : "-",
        กำหนดรับคืน: item.expectedReturnDate
          ? new Date(item.expectedReturnDate).toLocaleDateString("th-TH")
          : "-",
        รายการสินค้า: itemsSummary || "-",
        อาการเสีย: item.symptoms || "-",
        ผู้ส่งซ่อม: item.sender || "-",
        สถานะ: item.status === "RETURNED" ? "รับคืนแล้ว" : "ส่งซ่อมแล้ว",
        หมายเหตุ: item.remark || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ใบส่งซ่อมภายนอก");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `ใบส่งซ่อมภายนอก_${dateStr}.xlsx`);
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
                <Truck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  ใบส่งซ่อมภายนอก
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                  {totalCount} รายการ
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                <span>OUTSOURCE REPAIRS & VENDOR MANAGEMENT</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-normal">
                  ระบบบันทึกและติดตามการส่งซ่อมภายนอก
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
              href="/outsource-repairs/new"
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">สร้างใบส่งซ่อมภายนอก</span>
              <span className="sm:hidden">ส่งซ่อมภายนอก</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Strip (4 Symmetrical Interactive Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Orders */}
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
          <div className="text-2xl sm:text-3xl font-black tracking-tight">{totalCount}</div>
          <div
            className={`text-xs mt-1.5 font-medium ${
              statusTab === "ALL" ? "text-gray-400" : "text-gray-400"
            }`}
          >
            รายการส่งซ่อมทั้งหมดในระบบ
          </div>
          <div className="w-full bg-gray-200/50 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#ff2301] h-full w-full rounded-full" />
          </div>
        </div>

        {/* Card 2: Sent Orders (In Progress) */}
        <div
          onClick={() => setStatusTab("SENT")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
            statusTab === "SENT"
              ? "bg-red-50 text-red-950 border-red-300 ring-2 ring-red-500/20"
              : "bg-white text-gray-800 border-gray-200 hover:border-red-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              อยู่ระหว่างส่งซ่อม
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#ff2301] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#ff2301]">
            {sentCount}
          </div>
          <div className="text-xs mt-1.5 font-medium text-red-600/80">
            {totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0}% ของรายการทั้งหมด
          </div>
          <div className="w-full bg-red-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#ff2301] h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (sentCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Returned Orders (Completed) */}
        <div
          onClick={() => setStatusTab("RETURNED")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
            statusTab === "RETURNED"
              ? "bg-gray-100 text-gray-900 border-gray-400 ring-2 ring-gray-900/10"
              : "bg-white text-gray-800 border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              รับคืนเรียบร้อย
            </span>
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            {returnedCount}
          </div>
          <div className="text-xs mt-1.5 font-medium text-gray-500">
            {totalCount > 0 ? Math.round((returnedCount / totalCount) * 100) : 0}% ปิดงานรับสินค้าแล้ว
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gray-800 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (returnedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Equipment Items Count */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              อุปกรณ์ที่ส่งซ่อม
            </span>
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            {totalItemsCount}{" "}
            <span className="text-sm font-semibold text-gray-400">ชิ้น</span>
          </div>
          <div className="text-xs mt-1.5 font-medium text-gray-400">
            รวมจำนวนสินค้าทุกรายการ
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-gray-400 h-full w-full rounded-full" />
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
              { id: "SENT", label: "อยู่ระหว่างส่งซ่อม", count: sentCount, dot: "bg-[#ff2301]" },
              { id: "RETURNED", label: "รับคืนแล้ว", count: returnedCount, dot: "bg-gray-800" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
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

        {/* Row 2: Search Input & Multi-Drop Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Universal Search (md:col-span-5) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่เอกสาร, ซัพพลายเออร์, ลูกค้า, Job No..."
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

          {/* Vendor Filter (md:col-span-3) */}
          <div className="md:col-span-3">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-700"
            >
              <option value="ALL">ซัพพลายเออร์ทั้งหมด ({uniqueVendors.length} ราย)</option>
              {uniqueVendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
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
              <option value="THIS_MONTH">ส่งซ่อมเดือนนี้</option>
              <option value="LAST_MONTH">ส่งซ่อมเดือนก่อน</option>
              <option value="THIS_YEAR">ส่งซ่อมปีนี้</option>
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
              <option value="sentDate-desc">วันที่ล่าสุดก่อน</option>
              <option value="sentDate-asc">วันที่เก่าสุดก่อน</option>
              <option value="outsourceNumber-asc">เลขที่เอกสาร A-Z</option>
              <option value="vendorName-asc">ซัพพลายเออร์ A-Z</option>
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
                    onClick={() => handleSort("outsourceNumber")}
                    className="px-5 py-4 text-left cursor-pointer hover:text-gray-900 transition-colors min-w-[170px] whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>เลขที่ใบส่งซ่อม / Job</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("vendorName")}
                    className="px-5 py-4 text-left cursor-pointer hover:text-gray-900 transition-colors min-w-[200px] whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ซัพพลายเออร์ (Vendor)</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left min-w-[180px] whitespace-nowrap">
                    ลูกค้า (Customer)
                  </th>
                  <th className="px-5 py-4 text-left min-w-[170px] whitespace-nowrap">
                    รายการอุปกรณ์
                  </th>
                  <th
                    onClick={() => handleSort("sentDate")}
                    className="px-4 py-4 text-center cursor-pointer hover:text-gray-900 transition-colors min-w-[130px] whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>วันที่ส่งซ่อม</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
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
                  <th className="px-4 py-4 text-center min-w-[140px] whitespace-nowrap">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sortedData.map((item) => {
                  const itemsList = Array.isArray(item.items) ? item.items : [];
                  const firstItem = itemsList[0];
                  const extraCount = itemsList.length > 1 ? itemsList.length - 1 : 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-red-50/20 transition-colors group"
                    >
                      {/* เอกสาร / Job No */}
                      <td className="px-5 py-4 text-left align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          {item.outsourceNumber ? (
                            item.outsourceNumber.includes(",") ? (
                              <div className="flex flex-col gap-1">
                                {item.outsourceNumber.split(",").map((num: string, idx: number) => {
                                  const cleanNum = num.trim();
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleCopy(cleanNum, `${item.id}-${idx}`)}
                                      className="font-mono font-bold text-gray-900 hover:text-[#ff2301] transition-colors flex items-center gap-1.5 text-xs bg-gray-100/80 hover:bg-red-50 px-2 py-0.5 rounded-lg border border-gray-200/80 whitespace-nowrap"
                                      title="คลิกเพื่อคัดลอกเลขเอกสาร"
                                    >
                                      <span>{cleanNum}</span>
                                      {copiedId === `${item.id}-${idx}` ? (
                                        <Check className="w-3 h-3 text-[#ff2301]" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-gray-400 opacity-60" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCopy(item.outsourceNumber, item.id)}
                                className="font-mono font-bold text-gray-900 hover:text-[#ff2301] transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap"
                                title="คลิกเพื่อคัดลอกเลขเอกสาร"
                              >
                                <span>{item.outsourceNumber}</span>
                                {copiedId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-[#ff2301]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            )
                          ) : (
                            <span className="text-gray-400 text-xs font-mono">-</span>
                          )}

                          {item.job?.jobNumber && (
                            <div className="mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                Job: {item.job.jobNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ซัพพลายเออร์ */}
                      <td className="px-5 py-4 text-left align-middle min-w-[200px]">
                        <div className="font-bold text-gray-900 flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{item.vendorName || "-"}</span>
                        </div>
                        {item.vendorPhone && (
                          <div className="text-xs text-gray-500 mt-1 pl-6 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{item.vendorPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* ลูกค้า */}
                      <td className="px-5 py-4 text-left align-middle min-w-[180px]">
                        <div className="font-semibold text-gray-800 leading-snug">
                          {item.customerName || "-"}
                        </div>
                        {item.customerPhone && (
                          <div className="text-xs text-gray-400 mt-1">
                            {item.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* รายการอุปกรณ์ */}
                      <td className="px-5 py-4 text-left align-middle min-w-[170px]">
                        {firstItem ? (
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-gray-800 block leading-snug">
                              {firstItem.type || firstItem.model || "อุปกรณ์"}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {firstItem.brand && (
                                <span className="text-[11px] text-gray-500 font-mono">
                                  {firstItem.brand}
                                </span>
                              )}
                              {extraCount > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                  +{extraCount} รายการ
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      {/* วันที่ส่งซ่อม */}
                      <td className="px-4 py-4 text-center align-middle whitespace-nowrap min-w-[130px]">
                        <div className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800">
                            {item.sentDate
                              ? new Date(item.sentDate).toLocaleDateString("th-TH")
                              : "-"}
                          </span>
                        </div>
                        {item.expectedReturnDate && item.status !== "RETURNED" && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            กำหนดคืน: {new Date(item.expectedReturnDate).toLocaleDateString("th-TH")}
                          </div>
                        )}
                      </td>

                      {/* สถานะ */}
                      <td className="px-4 py-4 text-center align-middle whitespace-nowrap min-w-[130px]">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm whitespace-nowrap shrink-0 ${
                            item.status === "RETURNED"
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-red-50 text-[#ff2301] border-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.status === "RETURNED"
                                ? "bg-white"
                                : "bg-[#ff2301] animate-pulse"
                            }`}
                          />
                          <span className="whitespace-nowrap">
                            {item.status === "RETURNED" ? "รับคืนแล้ว" : "ส่งซ่อมแล้ว"}
                          </span>
                        </span>
                      </td>

                      {/* จัดการ Action Buttons */}
                      <td className="px-4 py-4 text-center align-middle whitespace-nowrap min-w-[140px]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDrawerItem(item)}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                            title="ดูรายละเอียดด่วน"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/outsource-repairs/${item.id}/pdf`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-[#ff2301] hover:bg-red-50 rounded-xl transition-colors"
                            title="พิมพ์ใบส่งซ่อม (PDF)"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/outsource-repairs/${item.id}/edit`}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                            title="แก้ไขเอกสาร"
                          >
                            <Wrench className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.outsourceNumber)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 mb-4">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">
                        ไม่พบข้อมูลใบส่งซ่อมภายนอก
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        {hasActiveFilters
                          ? "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก"
                          : "ยังไม่มีการสร้างใบส่งซ่อมภายนอกในระบบ"}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-xl transition-colors"
                        >
                          ล้างตัวกรองทั้งหมด
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ──── Symmetrical Grid Cards View ──── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedData.map((item) => {
            const itemsList = Array.isArray(item.items) ? item.items : [];

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Card Header: Outsource No. & Status */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.outsourceNumber, item.id)}
                      className="font-mono font-bold text-gray-900 hover:text-[#ff2301] text-sm flex items-center gap-1.5"
                      title="คัดลอกเลขที่เอกสาร"
                    >
                      <span>{item.outsourceNumber || "ไม่ระบุเลข"}</span>
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-[#ff2301]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm ${
                        item.status === "RETURNED"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-red-50 text-[#ff2301] border-red-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === "RETURNED" ? "bg-white" : "bg-[#ff2301]"
                        }`}
                      />
                      {item.status === "RETURNED" ? "รับคืนแล้ว" : "ส่งซ่อมแล้ว"}
                    </span>
                  </div>

                  {/* Vendor Info */}
                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase block mb-0.5">
                        ซัพพลายเออร์ (Vendor)
                      </span>
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{item.vendorName || "-"}</span>
                      </div>
                      {item.vendorPhone && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{item.vendorPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase block mb-0.5">
                        ลูกค้า / Job
                      </span>
                      <div className="font-semibold text-gray-800 text-xs">
                        {item.customerName || "-"}
                      </div>
                      {item.job?.jobNumber && (
                        <div className="mt-1 font-mono text-[11px] text-[#ff2301] font-bold">
                          Job: {item.job.jobNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Equipment summary & Dates */}
                  <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>อุปกรณ์:</span>
                      </span>
                      <span className="font-bold text-gray-800">
                        {itemsList.length} รายการ
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>วันที่ส่งซ่อม:</span>
                      </span>
                      <span className="font-medium text-gray-800">
                        {item.sentDate
                          ? new Date(item.sentDate).toLocaleDateString("th-TH")
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
                      href={`/outsource-repairs/${item.id}/pdf`}
                      target="_blank"
                      className="p-1.5 text-gray-400 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                      title="พิมพ์ใบส่งซ่อม (PDF)"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>

                    <Link
                      href={`/outsource-repairs/${item.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="แก้ไขเอกสาร"
                    >
                      <Wrench className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.outsourceNumber)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบเอกสาร"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 font-mono">
                      {drawerItem.outsourceNumber || "ไม่ระบุเลขที่"}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        drawerItem.status === "RETURNED"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-red-50 text-[#ff2301] border-red-200"
                      }`}
                    >
                      {drawerItem.status === "RETURNED" ? "รับคืนแล้ว" : "ส่งซ่อมแล้ว"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">รายละเอียดใบส่งซ่อมภายนอก</p>
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
                    {drawerItem.job.companyCode || "TERA"}
                  </span>
                </div>
              )}

              {/* Vendor & Customer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                    ซัพพลายเออร์ (Vendor)
                  </span>
                  <div className="font-bold text-gray-900 text-sm">
                    {drawerItem.vendorName || "-"}
                  </div>
                  {drawerItem.vendorPhone && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{drawerItem.vendorPhone}</span>
                    </div>
                  )}
                  {drawerItem.vendorAddress && (
                    <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {drawerItem.vendorAddress}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                    ลูกค้า (Customer)
                  </span>
                  <div className="font-bold text-gray-900 text-sm">
                    {drawerItem.customerName || "-"}
                  </div>
                  {drawerItem.customerPhone && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{drawerItem.customerPhone}</span>
                    </div>
                  )}
                  {drawerItem.customerAddress && (
                    <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {drawerItem.customerAddress}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="text-xs font-bold text-gray-700 block mb-2">
                  รายการอุปกรณ์ที่ส่งซ่อม ({Array.isArray(drawerItem.items) ? drawerItem.items.length : 0} รายการ)
                </span>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2.5">รายการ</th>
                        <th className="px-3 py-2.5">โมเดล / S/N</th>
                        <th className="px-3 py-2.5 text-center w-16">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(Array.isArray(drawerItem.items) ? drawerItem.items : []).map(
                        (it: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-gray-900">{it.type || "-"}</div>
                              {it.brand && <div className="text-gray-400">{it.brand}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-mono text-gray-800">{it.model || "-"}</div>
                              {it.serial && (
                                <div className="font-mono text-[10px] text-gray-400">
                                  S/N: {it.serial}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-gray-900">
                              {it.qty || 1}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Symptoms & Remark */}
              {drawerItem.symptoms && (
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">
                    อาการเสียที่ส่งซ่อม
                  </span>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {drawerItem.symptoms}
                  </div>
                </div>
              )}

              {drawerItem.remark && (
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">
                    หมายเหตุเพิ่มเติม
                  </span>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {drawerItem.remark}
                  </div>
                </div>
              )}

              {/* Timeline Dates */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">วันที่ส่งซ่อม</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {drawerItem.sentDate
                      ? new Date(drawerItem.sentDate).toLocaleDateString("th-TH")
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">กำหนดรับคืน</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {drawerItem.expectedReturnDate
                      ? new Date(drawerItem.expectedReturnDate).toLocaleDateString("th-TH")
                      : "-"}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200/80">
                  <span className="text-gray-400 font-semibold">ผู้ส่งซ่อม: </span>
                  <span className="font-bold text-gray-900">{drawerItem.sender || "-"}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
              <Link
                href={`/outsource-repairs/${drawerItem.id}/pdf`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ PDF</span>
              </Link>

              <Link
                href={`/outsource-repairs/${drawerItem.id}/edit`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
              >
                <Wrench className="w-4 h-4" />
                <span>แก้ไขเอกสาร</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
