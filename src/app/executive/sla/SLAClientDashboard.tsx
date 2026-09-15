"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Layers,
  ShieldAlert,
  ArrowRight,
  Wrench,
  Flame,
  User,
  ExternalLink,
  ChevronRight,
  Building2,
  Calendar,
  RefreshCw
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

export type BreachedOrder = {
  id: string;
  orderNumber: string;
  companyName: string;
  status: string;
  department: string;
  value: number;
  daysInStatus: number;
  threshold: number;
  delayDays: number;
  severity: "critical" | "high" | "warning";
  salespersonName: string;
  updatedAt: string;
  createdAt: string;
  targetDeliveryDate?: string | null;
};

export type BreachedJob = {
  id: string;
  jobNumber: string;
  customerName: string;
  jobType: string;
  currentStep: string;
  stepLabel: string;
  department: string;
  daysInStatus: number;
  threshold: number;
  delayDays: number;
  severity: "critical" | "high" | "warning";
  technicianName: string;
  updatedAt: string;
  createdAt: string;
};

export type DepartmentStat = {
  department: string;
  orderCount: number;
  jobCount: number;
  totalCount: number;
  criticalCount: number;
  avgDelayDays: number;
  maxDelayDays: number;
};

export type SLADashboardProps = {
  breachedOrders: BreachedOrder[];
  breachedJobs: BreachedJob[];
  totalActiveOrders: number;
  totalActiveJobs: number;
  onTimeDeliveryRate: number;
  departmentStats: DepartmentStat[];
  lastUpdatedTime: string;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function SLAClientDashboard({
  breachedOrders = [],
  breachedJobs = [],
  totalActiveOrders = 0,
  totalActiveJobs = 0,
  onTimeDeliveryRate = 0,
  departmentStats = [],
  lastUpdatedTime = "",
}: SLADashboardProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "jobs" | "matrix">("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  // Summary Metrics
  const totalBreaches = breachedOrders.length + breachedJobs.length;
  const criticalOrdersCount = breachedOrders.filter((o) => o.severity === "critical").length;
  const criticalJobsCount = breachedJobs.filter((j) => j.severity === "critical").length;
  const totalCritical = criticalOrdersCount + criticalJobsCount;

  // Top Bottleneck Department
  const topBottleneck = departmentStats.length > 0 ? departmentStats[0] : null;

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    breachedOrders.forEach((o) => set.add(o.department));
    breachedJobs.forEach((j) => set.add(j.department));
    return Array.from(set).sort();
  }, [breachedOrders, breachedJobs]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return breachedOrders.filter((order) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          order.orderNumber.toLowerCase().includes(q) ||
          order.companyName.toLowerCase().includes(q) ||
          order.salespersonName.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Department
      if (selectedDept !== "all" && order.department !== selectedDept) {
        return false;
      }
      // Severity
      if (selectedSeverity !== "all" && order.severity !== selectedSeverity) {
        return false;
      }
      return true;
    });
  }, [breachedOrders, searchQuery, selectedDept, selectedSeverity]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return breachedJobs.filter((job) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          job.jobNumber.toLowerCase().includes(q) ||
          job.customerName.toLowerCase().includes(q) ||
          job.technicianName.toLowerCase().includes(q) ||
          job.stepLabel.toLowerCase().includes(q) ||
          job.jobType.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Department
      if (selectedDept !== "all" && job.department !== selectedDept) {
        return false;
      }
      // Severity
      if (selectedSeverity !== "all" && job.severity !== selectedSeverity) {
        return false;
      }
      return true;
    });
  }, [breachedJobs, searchQuery, selectedDept, selectedSeverity]);

  const renderSeverityBadge = (severity: "critical" | "high" | "warning", delayDays: number) => {
    if (severity === "critical") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm shadow-red-950/20">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          วิกฤต (+{delayDays} วัน)
        </span>
      );
    }
    if (severity === "high") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          ล่าช้า (+{delayDays} วัน)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        เฝ้าระวัง (+{delayDays} วัน)
      </span>
    );
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 pb-20 custom-scrollbar relative font-sans">
      {/* ── Executive Hero Header ── */}
      <div className="bg-[#0f172a] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                <Clock size={13} className="text-red-500" />
                Executive SLA & Operational Bottleneck Monitor
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                SLA และการติดตามงานล่าช้า
              </h1>
              <p className="text-gray-400 text-sm mt-1.5 max-w-2xl font-normal">
                ระบบตรวจสอบสถานะคำสั่งซื้อและคิวงานบริการที่ล่าช้าเกินเกณฑ์มาตรฐาน (SLA) พร้อมระบุจุดติดขัดรายแผนกแบบเรียลไทม์
              </p>
            </div>

            {/* Quick Hero Alert Status */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-900/40">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    รายการค้างเกินกำหนดรวม
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      {totalBreaches}
                    </span>
                    <span className="text-xs font-bold text-gray-400">รายการ</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        totalCritical > 0
                          ? "bg-red-600 text-white"
                          : totalBreaches > 0
                          ? "bg-gray-800 text-red-400 border border-red-500/30"
                          : "bg-gray-800 text-gray-200 border border-gray-700"
                      }`}
                    >
                      {totalCritical > 0
                        ? `วิกฤต ${totalCritical} รายการ`
                        : totalBreaches > 0
                        ? "เฝ้าระวัง"
                        : "ปกติ (Optimal)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 space-y-6">
        {/* ── 4 Executive KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Orders Overdue */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  คำสั่งซื้อเกิน SLA
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {breachedOrders.length}{" "}
                <span className="text-xs font-normal text-gray-500">
                  / จากที่เปิดอยู่ {totalActiveOrders} ออเดอร์
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                วิกฤต:{" "}
                <strong className="text-red-600 font-mono font-bold">
                  {criticalOrdersCount}
                </strong>{" "}
                รายการ
              </span>
              <span className="text-gray-400 font-mono">
                {totalActiveOrders > 0
                  ? ((breachedOrders.length / totalActiveOrders) * 100).toFixed(0)
                  : 0}
                % เกินเกณฑ์
              </span>
            </div>
          </div>

          {/* Card 2: Jobs Overdue */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  คิวงานติดขัดเกิน SLA
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Wrench size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {breachedJobs.length}{" "}
                <span className="text-xs font-normal text-gray-500">
                  / จากคิวงาน {totalActiveJobs} งาน
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                วิกฤต:{" "}
                <strong className="text-red-600 font-mono font-bold">
                  {criticalJobsCount}
                </strong>{" "}
                งาน
              </span>
              <span className="text-gray-400 font-mono">
                {totalActiveJobs > 0
                  ? ((breachedJobs.length / totalActiveJobs) * 100).toFixed(0)
                  : 0}
                % ติดขัด
              </span>
            </div>
          </div>

          {/* Card 3: On-Time Delivery Rate */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  อัตราส่งมอบตรงเวลา (OTD)
                </span>
                <div className="p-2 rounded-xl bg-gray-100 text-gray-800">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {onTimeDeliveryRate.toFixed(1)}%
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              {/* Progress bar strictly in Red & Gray */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, onTimeDeliveryRate))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1 font-mono">
                <span>0%</span>
                <span>เป้าหมาย &gt; 90%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Top Bottleneck Department */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  จุดติดขัดหลัก (Bottleneck)
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Flame size={16} />
                </div>
              </div>
              <div className="text-xl font-black text-gray-900 tracking-tight truncate">
                {topBottleneck ? topBottleneck.department : "ไม่พบจุดติดขัด"}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                ค้างรวม:{" "}
                <strong className="text-gray-900 font-mono font-bold">
                  {topBottleneck ? topBottleneck.totalCount : 0}
                </strong>{" "}
                รายการ
              </span>
              <span className="text-gray-400 font-mono text-[11px]">
                เฉลี่ย {topBottleneck ? topBottleneck.avgDelayDays : 0} วัน
              </span>
            </div>
          </div>
        </div>

        {/* ── Control Bar: Tabs, Search, & Filters ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80 space-y-4">
          {/* Top Row: Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "orders"
                    ? "bg-red-600 text-white shadow-sm shadow-red-950/20"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                <Clock size={15} />
                คำสั่งซื้อเกิน SLA
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    activeTab === "orders"
                      ? "bg-white text-red-600 font-bold"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {breachedOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("jobs")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "jobs"
                    ? "bg-red-600 text-white shadow-sm shadow-red-950/20"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                <Wrench size={15} />
                คิวงานติดขัดเกิน SLA
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    activeTab === "jobs"
                      ? "bg-white text-red-600 font-bold"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {breachedJobs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("matrix")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "matrix"
                    ? "bg-red-600 text-white shadow-sm shadow-red-950/20"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                <Layers size={15} />
                ภาพรวมรายแผนก (Matrix)
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    activeTab === "matrix"
                      ? "bg-white text-red-600 font-bold"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {departmentStats.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1.5 self-end sm:self-auto">
              <Calendar size={13} />
              <span>ข้อมูลล่าสุด: {lastUpdatedTime || "ปัจจุบัน"}</span>
            </div>
          </div>

          {/* Bottom Row: Search & Filters (Shown for Table tabs) */}
          {activeTab !== "matrix" && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder={
                    activeTab === "orders"
                      ? "ค้นหาเลขที่คำสั่งซื้อ, บริษัทลูกค้า, พนักงานขาย, สถานะ..."
                      : "ค้นหาเลขที่งาน (Job), ชื่อลูกค้า, ช่างซ่อม, ขั้นตอนงาน..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-800 transition-all placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-bold"
                  >
                    ล้าง
                  </button>
                )}
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400 shrink-0" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer font-medium"
                >
                  <option value="all">ทุกแผนก (All Departments)</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                {/* Severity Filter */}
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer font-medium"
                >
                  <option value="all">ทุกระดับความล่าช้า</option>
                  <option value="critical">วิกฤต (&gt;7 วัน)</option>
                  <option value="high">ล่าช้า (3-7 วัน)</option>
                  <option value="warning">เฝ้าระวัง (1-2 วัน)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Tab 1: Orders Overdue Table ── */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  รายการคำสั่งซื้อที่เกินกำหนด SLA ({filteredOrders.length} รายการ)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  คำสั่งซื้อที่คงค้างในขั้นตอนนานกว่าเกณฑ์ที่กำหนด แยกตามแผนกที่รับผิดชอบ
                </p>
              </div>
              <Link
                href="/orders"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
              >
                จัดการคำสั่งซื้อทั้งหมด
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 font-semibold">
                    <th className="py-3.5 px-4 font-bold">เลขที่คำสั่งซื้อ / ลูกค้า</th>
                    <th className="py-3.5 px-4 font-bold">มูลค่า (THB)</th>
                    <th className="py-3.5 px-4 font-bold">สถานะ / แผนกรับผิดชอบ</th>
                    <th className="py-3.5 px-4 font-bold text-center">ระยะเวลาที่ค้าง (วัน)</th>
                    <th className="py-3.5 px-4 font-bold text-center">ระดับความล่าช้า</th>
                    <th className="py-3.5 px-4 font-bold">ผู้รับผิดชอบ</th>
                    <th className="py-3.5 px-4 font-bold text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-red-50/30 transition-colors group"
                    >
                      {/* Order Number & Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                          {order.orderNumber}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium truncate max-w-xs mt-0.5">
                          {order.companyName || "ไม่ระบุบริษัทลูกค้า"}
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {order.value > 0 ? formatCurrency(order.value) : "-"}
                      </td>

                      {/* Status & Department */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          {order.status}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 font-medium">
                          {order.department}
                        </div>
                      </td>

                      {/* Days in Status vs Threshold */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-red-600">
                            {order.daysInStatus}{" "}
                            <span className="text-[10px] font-normal text-gray-500">วัน</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            (เกณฑ์ SLA: {order.threshold} วัน)
                          </span>
                        </div>
                      </td>

                      {/* Severity Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {renderSeverityBadge(order.severity, order.delayDays)}
                      </td>

                      {/* Salesperson */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <User size={13} className="text-gray-400 shrink-0" />
                          <span className="font-medium truncate max-w-[140px]">
                            {order.salespersonName || "ไม่ระบุพนักงาน"}
                          </span>
                        </div>
                      </td>

                      {/* Action Link */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-800 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          ตรวจสอบ
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                            <CheckCircle2 size={24} />
                          </div>
                          <p className="text-sm font-bold text-gray-700">
                            {searchQuery || selectedDept !== "all" || selectedSeverity !== "all"
                              ? "ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา"
                              : "ยอดเยี่ยม! ไม่มีคำสั่งซื้อที่ล่าช้าเกิน SLA ในขณะนี้"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "กระบวนการส่งมอบและผลิตดำเนินไปตามมาตรฐาน"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 2: Jobs Overdue Table ── */}
        {activeTab === "jobs" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  รายการคิวงานบริการที่ติดขัดเกินกำหนด ({filteredJobs.length} งาน)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  คิวงานซ่อม งานบริการ และงานติดตั้งที่อยู่ในกระบวนการเกินเกณฑ์ SLA
                </p>
              </div>
              <Link
                href="/jobs"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
              >
                จัดการคิวงานทั้งหมด
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 font-semibold">
                    <th className="py-3.5 px-4 font-bold">เลขที่งาน (Job) / ลูกค้า</th>
                    <th className="py-3.5 px-4 font-bold">ประเภทงาน</th>
                    <th className="py-3.5 px-4 font-bold">ขั้นตอน / แผนกรับผิดชอบ</th>
                    <th className="py-3.5 px-4 font-bold text-center">ระยะเวลาที่ค้าง (วัน)</th>
                    <th className="py-3.5 px-4 font-bold text-center">ระดับความล่าช้า</th>
                    <th className="py-3.5 px-4 font-bold">ผู้รับผิดชอบ / ช่าง</th>
                    <th className="py-3.5 px-4 font-bold text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-red-50/30 transition-colors group"
                    >
                      {/* Job Number & Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                          {job.jobNumber}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium truncate max-w-xs mt-0.5">
                          {job.customerName || "ไม่ระบุชื่อลูกค้า"}
                        </div>
                      </td>

                      {/* Job Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          {job.jobType || "บริการ"}
                        </span>
                      </td>

                      {/* Current Step & Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{job.stepLabel}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                          {job.department}
                        </div>
                      </td>

                      {/* Days in Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-red-600">
                            {job.daysInStatus}{" "}
                            <span className="text-[10px] font-normal text-gray-500">วัน</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            (เกณฑ์ SLA: {job.threshold} วัน)
                          </span>
                        </div>
                      </td>

                      {/* Severity Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {renderSeverityBadge(job.severity, job.delayDays)}
                      </td>

                      {/* Technician */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <User size={13} className="text-gray-400 shrink-0" />
                          <span className="font-medium truncate max-w-[140px]">
                            {job.technicianName || "ไม่ระบุผู้รับผิดชอบ"}
                          </span>
                        </div>
                      </td>

                      {/* Action Link */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/jobs`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-800 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          ตรวจสอบ
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                            <CheckCircle2 size={24} />
                          </div>
                          <p className="text-sm font-bold text-gray-700">
                            {searchQuery || selectedDept !== "all" || selectedSeverity !== "all"
                              ? "ไม่พบคิวงานที่ตรงกับเงื่อนไขการค้นหา"
                              : "ยอดเยี่ยม! ไม่มีคิวงานที่ติดขัดเกินกำหนด"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "ทุกงานดำเนินการตามขั้นตอนได้อย่างราบรื่น"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 3: Department Bottleneck Matrix & Analytics ── */}
        {activeTab === "matrix" && (
          <div className="space-y-6">
            {/* Chart Container strictly styled in Red & Gray */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Layers size={16} className="text-red-600" />
                    การกระจายตัวของรายการติดขัดจำแนกตามแผนก (Bottleneck Distribution)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    เปรียบเทียบจำนวนคำสั่งซื้อและคิวงานบริการที่ล่าช้าในแต่ละส่วนงาน
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-red-600" />
                    <span className="text-gray-700 font-medium">คำสั่งซื้อล่าช้า</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-gray-800" />
                    <span className="text-gray-700 font-medium">คิวงานบริการติดขัด</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentStats}
                    margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                      interval={0}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const ordersVal = Number(payload[0]?.value || 0);
                          const jobsVal = Number(payload[1]?.value || 0);
                          const total = ordersVal + jobsVal;
                          return (
                            <div className="bg-gray-900 text-white rounded-2xl p-3 shadow-xl border border-gray-800 text-xs font-sans">
                              <p className="font-bold text-sm mb-2 text-white">{label}</p>
                              <div className="space-y-1 text-gray-300">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    คำสั่งซื้อ:
                                  </span>
                                  <strong className="font-mono text-white">{ordersVal}</strong>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                                    คิวงาน:
                                  </span>
                                  <strong className="font-mono text-white">{jobsVal}</strong>
                                </div>
                                <div className="pt-1.5 mt-1.5 border-t border-gray-800 flex items-center justify-between text-white font-bold">
                                  <span>รวมติดขัด:</span>
                                  <span className="font-mono text-red-400">{total} รายการ</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="orderCount"
                      name="คำสั่งซื้อ"
                      fill="#dc2626"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                    <Bar
                      dataKey="jobCount"
                      name="คิวงาน"
                      fill="#374151"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentStats.map((dept) => (
                <div
                  key={dept.department}
                  className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          แผนก / หน่วยงาน
                        </span>
                        <h4 className="text-base font-black text-gray-900 mt-0.5">
                          {dept.department}
                        </h4>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          dept.criticalCount > 0
                            ? "bg-red-600 text-white shadow-sm shadow-red-950/20"
                            : dept.totalCount > 0
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {dept.criticalCount > 0
                          ? `วิกฤต ${dept.criticalCount}`
                          : dept.totalCount > 0
                          ? "ล่าช้า"
                          : "ปกติ"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-4">
                      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                        <span className="text-[10px] text-gray-500 font-bold block">
                          คำสั่งซื้อค้าง
                        </span>
                        <span className="text-lg font-black text-gray-900 font-mono">
                          {dept.orderCount}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                        <span className="text-[10px] text-gray-500 font-bold block">
                          คิวงานค้าง
                        </span>
                        <span className="text-lg font-black text-gray-900 font-mono">
                          {dept.jobCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      ค้างนานเฉลี่ย:{" "}
                      <strong className="text-gray-900 font-mono font-bold">
                        {dept.avgDelayDays}
                      </strong>{" "}
                      วัน
                    </span>
                    <span className="text-red-600 font-mono text-[11px] font-bold">
                      สูงสุด {dept.maxDelayDays} วัน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
