"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Wrench,
  ExternalLink,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  Copy,
  Check,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Sparkles,
  FileText,
  ShieldCheck,
  Eye,
  X,
  Zap,
  Cog,
  Droplets,
  SlidersHorizontal,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { deleteInverterCheckReport } from "@/app/actions/inverterCheckReports";
import {
  STATUS_CONFIG,
  COMPANY_OPTIONS,
  EQUIPMENT_TYPE_CONFIG,
  EQUIPMENT_TYPE_OPTIONS,
  EquipmentType,
} from "./lib/crConstants";
import ConvertToRoModal from "./components/ConvertToRoModal";

interface CheckReportsClientPageProps {
  initialReports: any[];
  users: any[];
  companies: any[];
  currentUserName?: string;
  userRole?: string;
}

export default function CheckReportsClientPage({
  initialReports = [],
  users = [],
  companies = [],
  currentUserName = "",
  userRole = "",
}: CheckReportsClientPageProps) {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>(initialReports);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [equipmentFilter, setEquipmentFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Convert Modal State
  const [selectedReportForConvert, setSelectedReportForConvert] = useState<any | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Sync initialReports
  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  // Statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === "PENDING").length;
    const converted = reports.filter((r) => r.status === "CONVERTED_TO_RO").length;
    const claim = reports.filter((r) => r.status === "WARRANTY_CLAIM").length;
    const closed = reports.filter((r) => r.status === "CLOSED_NO_REPAIR").length;
    return { total, pending, converted, claim, closed };
  }, [reports]);

  // Company Counts
  const companyCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: reports.length, TG: 0, TP: 0, TE: 0 };
    reports.forEach((r) => {
      const code = (r.companyCode || "TG").toUpperCase();
      if (counts[code] !== undefined) counts[code]++;
      else counts[code] = 1;
    });
    return counts;
  }, [reports]);

  // Equipment Type Counts
  const equipmentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: reports.length,
      INVERTER: 0,
      CONTROL_CABINET: 0,
      MOTOR: 0,
      PUMP: 0,
    };
    reports.forEach((r) => {
      const type = (r.equipmentType || "INVERTER").toUpperCase();
      if (counts[type] !== undefined) counts[type]++;
      else counts[type] = 1;
    });
    return counts;
  }, [reports]);

  // Filtered List
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Status Filter
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

      // Company Filter
      if (companyFilter !== "ALL" && (r.companyCode || "TG").toUpperCase() !== companyFilter) {
        return false;
      }

      // Equipment Type Filter
      if (equipmentFilter !== "ALL") {
        const itemType = (r.equipmentType || "INVERTER").toUpperCase();
        if (itemType !== equipmentFilter) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const crNo = (r.crNumber || "").toLowerCase();
        const custComp = (r.customerCompany || "").toLowerCase();
        const custName = (r.customerName || "").toLowerCase();
        const brand = (r.inverterBrand || "").toLowerCase();
        const model = (r.inverterModel || "").toLowerCase();
        const serial = (r.serialNumber || "").toLowerCase();
        const inspector = (r.inspectorName || "").toLowerCase();
        const symptoms = (r.symptoms || "").toLowerCase();
        const roNo = (r.convertedJobNumber || "").toLowerCase();
        const eqLabel = (EQUIPMENT_TYPE_CONFIG[r.equipmentType || "INVERTER"]?.label || "").toLowerCase();
        const eqShort = (EQUIPMENT_TYPE_CONFIG[r.equipmentType || "INVERTER"]?.shortLabel || "").toLowerCase();

        return (
          crNo.includes(q) ||
          custComp.includes(q) ||
          custName.includes(q) ||
          brand.includes(q) ||
          model.includes(q) ||
          serial.includes(q) ||
          inspector.includes(q) ||
          symptoms.includes(q) ||
          roNo.includes(q) ||
          eqLabel.includes(q) ||
          eqShort.includes(q)
        );
      }

      return true;
    });
  }, [reports, search, statusFilter, companyFilter, equipmentFilter]);

  // Copy CR Number
  const copyCrNumber = (crNumber: string, id: string) => {
    navigator.clipboard.writeText(crNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredReports.map((r, idx) => {
        const eq = EQUIPMENT_TYPE_CONFIG[r.equipmentType || "INVERTER"] || EQUIPMENT_TYPE_CONFIG.INVERTER;
        return {
          ลำดับ: idx + 1,
          เลขที่_CR: r.crNumber,
          วันที่ตรวจเช็ค: r.checkDate ? new Date(r.checkDate).toLocaleDateString("th-TH") : "-",
          ประเภทอุปกรณ์: eq.shortLabel || r.equipmentType || "อินเวอร์เตอร์",
          สังกัด: r.companyCode || "TG",
          ชื่อบริษัทลูกค้า: r.customerCompany || r.customerName || "-",
          เบอร์โทรศัพท์: r.customerPhone || "-",
          ยี่ห้อ: r.inverterBrand || "-",
          รุ่น: r.inverterModel || "-",
          หมายเลขเครื่อง: r.serialNumber || "-",
          ขนาดกำลัง: r.motorKw ? `${r.motorKw} (${eq.powerUnitLabel})` : "-",
          อาการเสีย: r.symptoms || "-",
          สาเหตุที่พบ: r.causeOfFault || "-",
          ผู้ตรวจสอบ: r.inspectorName || "-",
          สถานะ: STATUS_CONFIG[r.status]?.label || r.status,
          เลขที่ใบรับซ่อม: r.convertedJobNumber || "-",
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายงานตรวจเช็ค_CR");
      XLSX.writeFile(wb, `รายงานตรวจเช็ค_CR_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Excel export error:", err);
      Swal.fire({ icon: "error", title: "ไม่สามารถส่งออก Excel ได้" });
    }
  };

  // Delete Report
  const handleDelete = (report: any) => {
    if (report.status === "CONVERTED_TO_RO") {
      Swal.fire({
        icon: "warning",
        title: "ไม่สามารถลบได้",
        text: `รายงานนี้ได้ถูกแปลงเป็นใบรับซ่อม (${report.convertedJobNumber || "RO"}) เรียบร้อยแล้ว`,
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    Swal.fire({
      title: "ยืนยันการลบรายงานตรวจเช็ค?",
      html: `คุณกำลังจะลบเอกสารเลขที่ <b class="text-[#ff2301] font-mono">${report.crNumber}</b><br><span style="font-size: 13px; color: #64748b;">ข้อมูลจะไม่สามารถกู้คืนได้</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#64748b",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await deleteInverterCheckReport(report.id);
          if (res.success) {
            setReports((prev) => prev.filter((r) => r.id !== report.id));
            Swal.fire({
              icon: "success",
              title: "ลบสำเร็จ",
              text: `ลบรายงาน ${report.crNumber} เรียบร้อยแล้ว`,
              timer: 1500,
              showConfirmButton: false,
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "ลบไม่สำเร็จ",
              text: res.error || "เกิดข้อผิดพลาดในการลบ",
            });
          }
        } catch (err: any) {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: err.message,
          });
        }
      }
    });
  };

  // Open Convert Modal
  const openConvertModal = (report: any) => {
    setSelectedReportForConvert(report);
    setIsConvertModalOpen(true);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    companyFilter !== "ALL" ||
    equipmentFilter !== "ALL";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ───────────────────────────────────────────────────────────
          1. HEADER SECTION (Symmetrical Two-Sided Header)
      ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/90 pb-5">
        {/* Left Side: Brand Icon & Titles */}
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#c71a00] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
              <ClipboardCheck size={26} className="transition-transform duration-300 group-hover:rotate-6" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                รายงานตรวจเช็ค & Fault Report (CR)
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#ff2301] border border-red-200/80">
                {reports.length} รายการ
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
              <span>PRE-INSPECTION & FAULT DIAGNOSIS</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 font-normal">
                บันทึกผลตรวจวัดทางเทคนิค แรงดันไฟ ไดโอด วิเคราะห์สาเหตุชำรุด และออกรายงานหลังรับซ่อม
              </span>
            </p>
          </div>
        </div>

        {/* Right Side: Action Button Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 justify-start md:justify-end">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="รีเฟรชข้อมูลล่าสุด"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <RotateCcw size={16} className={isRefreshing ? "animate-spin text-[#ff2301]" : ""} />
          </button>

          {/* Export to Excel Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 font-bold text-xs tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-gray-500" />
            <span>ส่งออก Excel</span>
          </button>

          {/* Primary CTA: New Check Report */}
          <Link
            href="/service/check-reports/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs tracking-wider uppercase shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>สร้างรายงานตรวจเช็คใหม่ (+ New CR)</span>
          </Link>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
          2. KPI SUMMARY STRIP (4 Symmetrical Red/Gray/White Columns)
      ─────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: "ALL",
            title: "ทั้งหมด (Total)",
            count: stats.total,
            sub: "เอกสารรายงานตรวจเช็คทั้งหมดในระบบ",
            icon: <FileText size={19} className="text-gray-600" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-400",
            active: statusFilter === "ALL",
          },
          {
            id: "PENDING",
            title: "รอซ่อม / รอดำเนินการ (Pending)",
            count: stats.pending,
            sub: "ยังไม่ได้ระบุใบรับซ่อม",
            icon: <Clock size={19} className="text-[#ff2301]" />,
            iconBg: "bg-red-50",
            borderAccent: "border-l-4 border-[#ff2301]",
            active: statusFilter === "PENDING",
          },
          {
            id: "CONVERTED_TO_RO",
            title: "เชื่อมโยงกับใบรับซ่อมแล้ว (Linked RO)",
            count: stats.converted,
            sub: "อ้างอิงใบรับซ่อมเรียบร้อย",
            icon: <Wrench size={19} className="text-gray-700" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-700",
            active: statusFilter === "CONVERTED_TO_RO",
          },
          {
            id: "WARRANTY_CLAIM",
            title: "ส่งเคลมโรงงาน (Claim)",
            count: stats.claim,
            sub: "อยู่ระหว่างทำเรื่องเคลมประกัน",
            icon: <ShieldCheck size={19} className="text-gray-900" />,
            iconBg: "bg-gray-100",
            borderAccent: "border-l-4 border-gray-900",
            active: statusFilter === "WARRANTY_CLAIM",
          },
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setStatusFilter(card.id)}
            className={`w-full text-left bg-white rounded-2xl p-5 border transition-all duration-200 shadow-xs relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${card.borderAccent} ${
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

            {card.active && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff2301]" />
            )}
          </button>
        ))}
      </section>

      {/* ───────────────────────────────────────────────────────────
          3. FILTER CONTROL CENTER (Tri-Tier Red / Gray / White)
      ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Tier 1: Equipment Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 border-b border-gray-100">
          <span className="text-[11px] font-bold uppercase text-gray-400 flex items-center gap-1 shrink-0 mr-1">
            <SlidersHorizontal size={13} /> ประเภทอุปกรณ์:
          </span>
          {[
            { id: "ALL", label: "ทุกอุปกรณ์", count: equipmentCounts.ALL || 0, icon: <SlidersHorizontal size={13} /> },
            { id: "INVERTER", label: "อินเวอร์เตอร์", count: equipmentCounts.INVERTER || 0, icon: <Zap size={13} /> },
            { id: "CONTROL_CABINET", label: "ตู้คอนโทรล", count: equipmentCounts.CONTROL_CABINET || 0, icon: <Layers size={13} /> },
            { id: "MOTOR", label: "มอเตอร์", count: equipmentCounts.MOTOR || 0, icon: <Cog size={13} /> },
            { id: "PUMP", label: "ปั๊มน้ำ", count: equipmentCounts.PUMP || 0, icon: <Droplets size={13} /> },
          ].map((tab) => {
            const isActive = equipmentFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEquipmentFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-gray-900 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200/70 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tier 2: Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {[
            { id: "ALL", label: "ทั้งหมด", count: stats.total },
            { id: "PENDING", label: "รอระบุใบรับซ่อม (Pending)", count: stats.pending },
            { id: "CONVERTED_TO_RO", label: "เชื่อมโยงใบรับซ่อม (RO)", count: stats.converted },
            { id: "WARRANTY_CLAIM", label: "ส่งเคลมโรงงาน", count: stats.claim },
            { id: "CLOSED_NO_REPAIR", label: "ปิดงาน / ไม่ต้องซ่อม", count: stats.closed },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
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

        {/* Tier 3: Symmetrical Search & Company Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          {/* Left: Search Box + Company Buttons */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px] sm:min-w-[320px] flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเลขที่ CR, ลูกค้า, ยี่ห้อ, รุ่น, S/N, อาการ, มอเตอร์, ปั๊ม..."
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] text-gray-800 placeholder-gray-400 transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Company Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase text-gray-400 flex items-center gap-1 mr-1">
                <Building2 size={13} /> สังกัด:
              </span>
              <button
                type="button"
                onClick={() => setCompanyFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  companyFilter === "ALL"
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ทั้งหมด ({companyCounts.ALL || 0})
              </button>
              {COMPANY_OPTIONS.map((c) => {
                const count = companyCounts[c.value] || 0;
                const isSelected = companyFilter === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCompanyFilter(c.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>{c.value}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Active Filters Counter & Reset */}
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-semibold text-gray-500">
              พบ <b className="text-gray-900 font-mono text-sm">{filteredReports.length}</b> รายการ
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setCompanyFilter("ALL");
                  setEquipmentFilter("ALL");
                }}
                className="inline-flex items-center gap-1 py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#ff2301] border border-red-200 text-xs font-bold transition-all cursor-pointer"
              >
                <X size={12} />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          4. MAIN DATA TABLE (Red / Gray / White Aesthetic)
      ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">เลขที่ CR</th>
                <th className="py-3.5 px-3">วันที่ตรวจ</th>
                <th className="py-3.5 px-3 text-center">สังกัด</th>
                <th className="py-3.5 px-4">ลูกค้า / บริษัท</th>
                <th className="py-3.5 px-4">ยี่ห้อ / รุ่น / S/N</th>
                <th className="py-3.5 px-4">อาการเสียที่ระบุ</th>
                <th className="py-3.5 px-3">ผู้ตรวจสอบ</th>
                <th className="py-3.5 px-3">สถานะ</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <ClipboardCheck size={28} />
                    </div>
                    <p className="font-bold text-gray-700 text-sm">ไม่พบรายการรายงานตรวจเช็ค (CR)</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง ลองรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด"
                        : "เริ่มต้นบันทึกข้อมูลการตรวจวัดอินเวอร์เตอร์หรือตู้ควบคุมด้วยการสร้างใบตรวจเช็คใหม่"}
                    </p>
                    {!hasActiveFilters && (
                      <Link
                        href="/service/check-reports/new"
                        className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] text-white font-bold text-xs shadow-md shadow-red-500/25 hover:shadow-lg transition-all"
                      >
                        <Plus size={15} />
                        <span>สร้างใบตรวจเช็คแรก</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const checkDateStr = report.checkDate
                    ? new Date(report.checkDate).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })
                    : "—";

                  const isConverted = report.status === "CONVERTED_TO_RO";
                  const statusObj = STATUS_CONFIG[report.status] || {
                    label: report.status,
                    badge: "bg-gray-100 text-gray-700 border-gray-300",
                    dot: "bg-gray-400",
                  };

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-red-50/30 transition-colors group"
                    >
                      {/* CR Number */}
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/service/check-reports/${report.id}/edit`}
                            className="text-[#ff2301] hover:text-[#c71a00] hover:underline"
                          >
                            {report.crNumber}
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyCrNumber(report.crNumber, report.id)}
                            className="text-gray-300 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                            title="คัดลอกเลขที่ CR"
                          >
                            {copiedId === report.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {checkDateStr}
                      </td>

                      {/* Company Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                          {report.companyCode || "TG"}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-bold text-gray-900 truncate">
                          {report.customerCompany || report.customerName || "—"}
                        </div>
                        {report.customerPhone && (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{report.customerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Machine Spec */}
                      <td className="py-3 px-4 max-w-[210px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              (EQUIPMENT_TYPE_CONFIG[report.equipmentType || "INVERTER"] || EQUIPMENT_TYPE_CONFIG.INVERTER).badge
                            }`}
                          >
                            {(EQUIPMENT_TYPE_CONFIG[report.equipmentType || "INVERTER"] || EQUIPMENT_TYPE_CONFIG.INVERTER).shortLabel}
                          </span>
                        </div>
                        <div className="font-bold text-gray-900 truncate">
                          {report.inverterBrand || ""} {report.inverterModel || ""}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
                          S/N: {report.serialNumber || "—"}
                          {report.motorKw && (
                            <span className="text-gray-400 font-sans"> • {report.motorKw} kW</span>
                          )}
                        </div>
                      </td>

                      {/* Symptoms */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="line-clamp-2 text-gray-700 font-medium" title={report.symptoms}>
                          {report.symptoms || "—"}
                        </p>
                      </td>

                      {/* Inspector */}
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap font-medium">
                        {report.inspectorName || "—"}
                      </td>

                      {/* Status & Linked RO */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusObj.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                            {statusObj.label}
                          </span>

                          {isConverted && report.convertedJobNumber && (
                            <div>
                              <Link
                                href={`/repair-orders/${report.convertedJobId}/edit`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:text-[#c71a00] hover:underline bg-red-50 px-2 py-0.5 rounded border border-red-200"
                                title="เปิดดูใบรับซ่อม"
                              >
                                <Wrench className="w-3 h-3" />
                                <span>{report.convertedJobNumber}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Report */}
                          <Link
                            href={`/service/check-reports/${report.id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs"
                            title="พิมพ์รายงาน (CR / Fault Report)"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>

                          {/* Convert to RO Button (if not already converted) */}
                          {!isConverted ? (
                            <button
                              type="button"
                              onClick={() => openConvertModal(report)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              title="แปลงเป็นใบรับซ่อมทันที"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>แปลงเป็น RO</span>
                            </button>
                          ) : (
                            <Link
                              href={`/repair-orders/${report.convertedJobId}/edit`}
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                              title="เปิดดูใบรับซ่อมที่เชื่อมโยง"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Edit Report */}
                          <Link
                            href={`/service/check-reports/${report.id}/edit`}
                            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs"
                            title="แก้ไขรายงาน"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Delete Report */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleDelete(report)}
                              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-[#ff2301] hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer shadow-2xs"
                              title="ลบรายงาน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          5. CONVERT TO REPAIR ORDER MODAL
      ─────────────────────────────────────────────────────────── */}
      {selectedReportForConvert && (
        <ConvertToRoModal
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            setSelectedReportForConvert(null);
          }}
          report={selectedReportForConvert}
          users={users}
          onConverted={(res) => {
            setReports((prev) =>
              prev.map((r) =>
                r.id === selectedReportForConvert.id
                  ? {
                      ...r,
                      status: "CONVERTED_TO_RO",
                      convertedJobId: res.jobId,
                      convertedJobNumber: res.jobNumber,
                      convertedRepairOrderId: res.repairOrderId,
                    }
                  : r
              )
            );
          }}
        />
      )}
    </div>
  );
}
