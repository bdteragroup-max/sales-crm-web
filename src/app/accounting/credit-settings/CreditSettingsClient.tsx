"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  LayoutDashboard,
  AlertCircle,
  TrendingUp,
  Percent,
  RefreshCw,
  SlidersHorizontal,
  Banknote,
  Scale,
  ShieldAlert,
  ArrowRight,
  Check,
  Eye,
  Rows,
  TableProperties
} from "lucide-react";
import {
  CustomerCreditSettingDTO,
  CreditSettingsSummary,
  deleteCustomerCreditSetting,
  getAccountingCreditSettings
} from "@/app/actions/accountingCredit";
import CreditSettingModal from "./components/CreditSettingModal";
import Swal from "sweetalert2";

interface CreditSettingsClientProps {
  initialItems: CustomerCreditSettingDTO[];
  initialSummary: CreditSettingsSummary;
  initialSearch?: string;
  initialCustomerParam?: string;
}

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return "฿0";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatMillions(amount: number | null | undefined) {
  const val = amount ?? 0;
  return (val / 1000000).toFixed(2);
}

export default function CreditSettingsClient({
  initialItems,
  initialSummary,
  initialSearch = "",
  initialCustomerParam = ""
}: CreditSettingsClientProps) {
  const [items, setItems] = useState<CustomerCreditSettingDTO[]>(initialItems);
  const [summary, setSummary] = useState<CreditSettingsSummary>(initialSummary);
  const [searchTerm, setSearchTerm] = useState(initialSearch || initialCustomerParam || "");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"LIMIT_DESC" | "EXPOSURE_DESC" | "UTIL_DESC" | "NAME_ASC">("EXPOSURE_DESC");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Drawer / Inspector states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerCreditSettingDTO | null>(null);

  // Auto-open modal if initialCustomerParam was passed and matches an item
  React.useEffect(() => {
    if (initialCustomerParam) {
      const match = items.find(
        (i) => i.customerName.toLowerCase() === initialCustomerParam.toLowerCase()
      );
      if (match) {
        setEditingItem(match);
        setSelectedCustomerId(match.id);
        setIsModalOpen(true);
      } else {
        const dummy: CustomerCreditSettingDTO = {
          id: "",
          customerName: initialCustomerParam,
          taxId: "",
          companyId: null,
          creditLimit: 1000000,
          creditTermsDays: 30,
          creditStatus: "ACTIVE",
          createdAt: "",
          updatedAt: "",
          tgExposure: 0,
          teExposure: 0,
          tpExposure: 0,
          totalExposure: 0,
          remainingLimit: 1000000,
          utilizationPercent: 0,
          maxOverdueDays: 0,
          jobCount: 0,
          isConfigured: false
        };
        setEditingItem(dummy);
        setIsModalOpen(true);
      }
    }
  }, [initialCustomerParam]);

  const reloadData = async () => {
    startTransition(async () => {
      try {
        const res = await getAccountingCreditSettings();
        setItems(res.items);
        setSummary(res.summary);
      } catch (err) {
        console.error("Failed to reload credit settings:", err);
      }
    });
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setSelectedCustomerId(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (item: CustomerCreditSettingDTO) => {
    setSelectedCustomerId(item.id);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, item: CustomerCreditSettingDTO) => {
    e.stopPropagation();
    if (!item.isConfigured) return;

    const result = await Swal.fire({
      title: "ยืนยันการลบการตั้งค่าวงเงิน?",
      text: `คุณต้องการลบการตั้งค่าวงเงินของ "${item.customerName}" หรือไม่? ข้อมูลบนแดชบอร์ดจะกลับไปเป็นสถานะยังไม่ได้ตั้งค่า`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบการตั้งค่า",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteCustomerCreditSetting(item.id);
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "ลบสำเร็จ",
            timer: 1500,
            showConfirmButton: false
          });
          if (selectedCustomerId === item.id) {
            setIsModalOpen(false);
            setSelectedCustomerId(null);
          }
          reloadData();
        } else {
          Swal.fire({
            icon: "error",
            title: "ไม่สามารถลบได้",
            text: res.error
          });
        }
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: err.message
        });
      }
    }
  };

  // Filter & Sort Logic
  const filteredItems = items
    .filter((item) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.customerName.toLowerCase().includes(q) ||
          item.taxId.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q)) ||
          (item.billingCycleRule && item.billingCycleRule.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter === "CONFIGURED") return item.isConfigured;
      if (statusFilter === "UNCONFIGURED") return !item.isConfigured;
      if (statusFilter === "EXCEEDED") return item.isConfigured && item.remainingLimit < 0;
      if (statusFilter === "ACTIVE") return item.creditStatus === "ACTIVE";
      if (statusFilter === "WATCHLIST") return item.creditStatus === "WATCHLIST";
      if (statusFilter === "SUSPENDED") return item.creditStatus === "SUSPENDED" || item.creditStatus === "BLOCKED";

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "LIMIT_DESC") return b.creditLimit - a.creditLimit;
      if (sortBy === "EXPOSURE_DESC") return b.totalExposure - a.totalExposure;
      if (sortBy === "UTIL_DESC") return b.utilizationPercent - a.utilizationPercent;
      if (sortBy === "NAME_ASC") return a.customerName.localeCompare(b.customerName, "th");
      return 0;
    });

  return (
    <div className="space-y-5 w-full max-w-[1700px] mx-auto pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Accounting Credit Module
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-medium text-slate-500">
              ควบคุมการปล่อยสินเชื่อและการแสดงผลหน้าแดชบอร์ด
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-blue-600" />
            ตั้งค่าวงเงินเครดิตลูกค้า (Customer Credit Settings)
          </h1>
          <p className="text-xs text-slate-500">
            กำหนดวงเงินอนุมัติ เครดิตเทอม และเงื่อนไขการวางบิลของลูกค้าแต่ละราย เพื่อบริหารความเสี่ยงหนี้กลุ่ม TG, TE, TP และแสดงผลบนแดชบอร์ดตามจริง
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={reloadData}
            disabled={isPending}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            href="/accounting/dashboard"
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            กลับแดชบอร์ดบัญชี
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            กำหนดวงเงินลูกค้าใหม่
          </button>
        </div>
      </div>

      {/* 2. Symmetrical 4-Card Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: วงเงินเครดิตที่อนุมัติรวม */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                วงเงินเครดิตอนุมัติรวม
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ฿{formatMillions(summary.totalApprovedLimit)} ลบ.
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">ลูกค้าที่ตั้งค่าแล้ว:</span>
            <span className="font-bold text-blue-700">{summary.configuredCount} ราย</span>
          </div>
        </div>

        {/* Card 2: ยอดภาระหนี้ใช้งานจริงรวม */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                ภาระหนี้ใช้งานจริงรวม
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ฿{formatMillions(summary.totalAllExposure)} ลบ.
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">ในกลุ่มที่ตั้งค่าแล้ว:</span>
            <span className="font-bold text-indigo-700">฿{formatMillions(summary.totalConfiguredExposure)} ลบ.</span>
          </div>
        </div>

        {/* Card 3: วงเงินเครดิตคงเหลือรวม */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                วงเงินเครดิตคงเหลือรวม
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                summary.totalRemainingLimit < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black tracking-tight ${
              summary.totalRemainingLimit < 0 ? "text-rose-600" : "text-emerald-700"
            }`}>
              ฿{formatMillions(summary.totalRemainingLimit)} ลบ.
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">เกินวงเงินที่อนุมัติ:</span>
            <span className={`font-bold ${summary.exceededCount > 0 ? "text-rose-600" : "text-slate-600"}`}>
              {summary.exceededCount} ราย
            </span>
          </div>
        </div>

        {/* Card 4: สัดส่วนการตั้งค่าวงเงิน */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                สัดส่วนลูกหนี้ที่ควบคุมวงเงิน
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.configuredCount} / {summary.configuredCount + summary.unconfiguredCount} ราย
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">ลูกหนี้รอตั้งค่าวงเงิน:</span>
            <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
              {summary.unconfiguredCount} ราย
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search, Filter & Density Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, Tax ID, หรือเงื่อนไขวางบิล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter("CONFIGURED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                statusFilter === "CONFIGURED"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              ตั้งค่าแล้ว ({summary.configuredCount})
            </button>
            <button
              onClick={() => setStatusFilter("UNCONFIGURED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                statusFilter === "UNCONFIGURED"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              ยังไม่ตั้งค่า ({summary.unconfiguredCount})
            </button>
            <button
              onClick={() => setStatusFilter("EXCEEDED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                statusFilter === "EXCEEDED"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              เกินวงเงิน ({summary.exceededCount})
            </button>
            <button
              onClick={() => setStatusFilter("SUSPENDED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                statusFilter === "SUSPENDED"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ระงับเครดิต ({summary.suspendedCount})
            </button>
          </div>

          {/* View Density & Sort */}
          <div className="flex items-center gap-2.5 self-end lg:self-auto">
            {/* Density switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  density === "comfortable"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="แสดงแถวขนาดปกติ"
              >
                <TableProperties className="w-3.5 h-3.5" />
                ปกติ
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  density === "compact"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="แสดงแบบกะทัดรัด (เห็นได้หลายแถวพร้อมกัน)"
              >
                <Rows className="w-3.5 h-3.5" />
                กะทัดรัด
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="text-xs font-semibold py-1.5 px-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXPOSURE_DESC">เรียงตาม: ภาระหนี้มากสุด</option>
                <option value="LIMIT_DESC">เรียงตาม: วงเงินอนุมัติมากสุด</option>
                <option value="UTIL_DESC">เรียงตาม: % ใช้วงเงินมากสุด</option>
                <option value="NAME_ASC">เรียงตาม: ชื่อลูกค้า (ก-ฮ)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Customer Credit Settings Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
              <tr>
                <th className={`px-4 ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  ลูกค้า / Tax ID
                </th>
                <th className={`px-3 text-center ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  สถานะการตั้งค่า
                </th>
                <th className={`px-3.5 text-right ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  วงเงินที่อนุมัติ
                </th>
                <th className={`px-3 text-center ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  เครดิตเทอม
                </th>
                <th className={`px-3.5 text-right ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  หนี้จริงแยกบริษัท (TG/TE/TP)
                </th>
                <th className={`px-4 text-center min-w-44 ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  การใช้วงเงิน / วงเงินคงเหลือ
                </th>
                <th className={`px-3.5 ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  เงื่อนไขรอบวางบิล / บันทึกบัญชี
                </th>
                <th className={`px-3.5 text-center ${density === "compact" ? "py-2.5" : "py-3.5"}`}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600 text-sm">ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่ค้นหา</p>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;+ กำหนดวงเงินลูกค้าใหม่&quot;</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const isExceeded = cust.isConfigured && cust.remainingLimit < 0;
                  const utilColor =
                    cust.utilizationPercent > 100
                      ? "bg-rose-500"
                      : cust.utilizationPercent > 80
                      ? "bg-amber-500"
                      : "bg-emerald-500";

                  const rowPadding = density === "compact" ? "py-2 px-3" : "py-3.5 px-3.5";

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => handleRowClick(cust)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/90 ring-1 ring-inset ring-blue-500/50"
                          : !cust.isConfigured
                          ? "bg-amber-50/20 hover:bg-amber-50/50"
                          : "hover:bg-blue-50/30"
                      }`}
                    >
                      {/* Customer Info */}
                      <td className={`${density === "compact" ? "py-2 px-4" : "py-3.5 px-4"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-slate-900 ${density === "compact" ? "text-xs" : "text-sm"}`}>
                            {cust.customerName}
                          </span>
                          {cust.jobCount > 0 && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-semibold">
                              {cust.jobCount} งาน
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {cust.taxId ? `Tax ID: ${cust.taxId}` : "ไม่ระบุ Tax ID"}
                        </div>
                      </td>

                      {/* Configuration & Risk Status */}
                      <td className={`${rowPadding} text-center`}>
                        {cust.isConfigured ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              cust.creditStatus === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : cust.creditStatus === "WATCHLIST"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : cust.creditStatus === "SUSPENDED"
                                ? "bg-orange-50 text-orange-800 border-orange-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}>
                              {cust.creditStatus === "ACTIVE"
                                ? "วงเงินปกติ"
                                : cust.creditStatus === "WATCHLIST"
                                ? "เฝ้าระวัง"
                                : cust.creditStatus === "SUSPENDED"
                                ? "ระงับชั่วคราว"
                                : "บล็อกเครดิต"}
                            </span>
                            <span className="text-[9px] text-slate-400">ตั้งค่าแล้ว</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              ยังไม่ตั้งค่า
                            </span>
                            <span className="text-[9px] text-amber-700/80 font-medium">รอกำหนดวงเงิน</span>
                          </div>
                        )}
                      </td>

                      {/* Approved Limit */}
                      <td className={`${rowPadding} text-right font-mono`}>
                        {cust.isConfigured ? (
                          <span className={`font-black text-slate-900 ${density === "compact" ? "text-xs" : "text-sm"}`}>
                            ฿{cust.creditLimit.toLocaleString("th-TH")}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold italic text-xs">ยังไม่กำหนด</span>
                        )}
                      </td>

                      {/* Credit Terms */}
                      <td className={`${rowPadding} text-center`}>
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {cust.creditTermsDays} วัน
                        </span>
                        {cust.maxOverdueDays > 0 && (
                          <div className="text-[9px] text-rose-600 font-bold mt-0.5">
                            เกิน {cust.maxOverdueDays} วัน
                          </div>
                        )}
                      </td>

                      {/* Live Exposure Breakdown */}
                      <td className={`${rowPadding} text-right`}>
                        <div className={`font-black text-slate-900 ${density === "compact" ? "text-xs" : "text-sm"}`}>
                          ฿{cust.totalExposure.toLocaleString("th-TH")}
                        </div>
                        {cust.totalExposure > 0 && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 space-x-1">
                            {cust.tgExposure > 0 && <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px]">TG: {formatMillions(cust.tgExposure)}M</span>}
                            {cust.teExposure > 0 && <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px]">TE: {formatMillions(cust.teExposure)}M</span>}
                            {cust.tpExposure > 0 && <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px]">TP: {formatMillions(cust.tpExposure)}M</span>}
                          </div>
                        )}
                      </td>

                      {/* Utilization & Remaining Limit */}
                      <td className={`${density === "compact" ? "py-2 px-4" : "py-3.5 px-4"} min-w-44`}>
                        {cust.isConfigured ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className={`font-bold ${isExceeded ? "text-rose-600 font-black" : "text-slate-700"}`}>
                                {isExceeded
                                  ? `เกิน ฿${Math.abs(cust.remainingLimit).toLocaleString()}`
                                  : `เหลือ ฿${cust.remainingLimit.toLocaleString()}`}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {cust.utilizationPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${utilColor}`}
                                style={{ width: `${Math.min(100, cust.utilizationPercent)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[11px] text-amber-800 font-semibold">
                            (ต้องตั้งค่าก่อนคำนวณ)
                          </div>
                        )}
                      </td>

                      {/* Rules & Notes */}
                      <td className={`${rowPadding} max-w-xs`}>
                        <div className="text-xs text-slate-800 font-medium truncate">
                          {cust.billingCycleRule || cust.notes || "-"}
                        </div>
                        {cust.reviewedBy && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            โดย: {cust.reviewedBy}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={`${rowPadding} text-center whitespace-nowrap`}>
                        {cust.isConfigured ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(cust);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="แก้ไขวงเงินและเงื่อนไข"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, cust)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="ลบการตั้งค่า"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(cust);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 transition-all flex items-center gap-1 mx-auto"
                          >
                            <Plus className="w-3 h-3" />
                            ตั้งค่าวงเงิน
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Setting Slide-Over Drawer */}
      <CreditSettingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomerId(null);
        }}
        initialData={editingItem}
        onSuccess={reloadData}
      />
    </div>
  );
}
