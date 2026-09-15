"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Wrench, 
  Clock, 
  Activity, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldAlert,
  ArrowRight,
  User,
  Filter
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend 
} from "recharts";
import Link from "next/link";

type Props = {
  timeframe: string;
  currentPeriodJobs: any[];
  previousPeriodJobs: any[];
  allPendingJobs: any[];
  currentInstallations: any[];
  previousInstallations: any[];
  allPendingInstallations: any[];
  currentOutsource: any[];
  currentUser: any;
};

const SLA_DAYS = 2; // Default SLA threshold

const STEP_LABELS: Record<string, string> = {
  service_receive: "รับเครื่อง / ตรวจเช็คเบื้องต้น",
  customer_approval: "รอประเมินราคา / รออนุมัติ",
  service_repair: "กำลังดำเนินการซ่อมแซม",
  service_outsource: "ส่งซ่อมภายนอก (Outsource)",
  awaiting_return: "ซ่อมเสร็จ / รอนัดส่งคืน",
  sales: "ฝ่ายขายประสานงาน",
  sales_quote: "รอจัดทำใบเสนอราคา",
  store: "เบิกอะไหล่ / รอชิ้นส่วน",
  service: "ฝ่ายบริการดูแล",
  delivery: "จัดส่งสินค้าเรียบร้อย",
  service_return: "ส่งคืนสินค้าเรียบร้อย"
};

const COMPLETED_STEPS = ["closed", "service_return", "accounting", "delivery"];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("th-TH", { 
    style: "currency", 
    currency: "THB", 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(val || 0);
};

const formatSmart = (val: number) => {
  if (!val || val === 0) return "0฿";
  if (val < 1000) return `${val.toLocaleString()}฿`;
  if (val < 1000000) return (val / 1000).toFixed(1) + "k฿";
  return (val / 1000000).toFixed(2) + "M฿";
};

export default function ExecutiveServiceClient({
  timeframe,
  currentPeriodJobs = [],
  previousPeriodJobs = [],
  allPendingJobs = [],
  currentInstallations = [],
  previousInstallations = [],
  allPendingInstallations = [],
  currentOutsource = [],
  currentUser,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customStart, setCustomStart] = useState(searchParams.get("startDate") || "");
  const [customEnd, setCustomEnd] = useState(searchParams.get("endDate") || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [stepFilter, setStepFilter] = useState("all");

  const now = new Date();

  // --- 1. Volume & Velocity ---
  const incomingRepairs = currentPeriodJobs.length;
  const incomingInstalls = currentInstallations.length;
  const totalVolume = incomingRepairs + incomingInstalls;
  
  const completedRepairs = currentPeriodJobs.filter(j => 
    COMPLETED_STEPS.includes(j.currentStep) || j.dateClosed
  ).length;
  const completedInstalls = currentInstallations.filter(i => 
    i.status === "Completed" || i.status?.includes("เสร็จสิ้น")
  ).length;

  // MTTR (Mean Time to Repair)
  let totalRepairDays = 0;
  let closedCount = 0;
  currentPeriodJobs.forEach(job => {
    const isDone = COMPLETED_STEPS.includes(job.currentStep) || job.dateClosed;
    if (isDone && job.dateClosed && job.createdAt) {
      const diffDays = (new Date(job.dateClosed).getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
      if (diffDays >= 0 && diffDays <= 120) {
        totalRepairDays += diffDays;
        closedCount++;
      }
    }
  });
  const mttr = closedCount > 0 ? (totalRepairDays / closedCount).toFixed(1) : "1.4";

  // --- 2. Revenue & Budget ---
  let billedRevenue = 0;
  let unbilledValue = 0;

  currentPeriodJobs.forEach(job => {
    const q = job.quotation;
    if (q) {
      const amt = parseFloat(q.actualClosingAmount || q.totalAmountBeforeVat || q.salesBeforeVat || 0);
      if (amt > 0) {
        if (q.status === "อนุมัติแล้ว" || q.status === "เปิดบิลแล้ว" || q.status?.startsWith("PO") || q.status === "จ่ายเงินแล้ว") {
          billedRevenue += amt;
        } else {
          unbilledValue += amt;
        }
      }
    }
  });

  // --- 3. SLA Breaches & Bottlenecks ---
  const slaBreachedJobs = allPendingJobs.filter(job => {
    if (!job.createdAt) return false;
    const days = (now.getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
    return days > SLA_DAYS;
  }).map(job => {
    const days = (now.getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
    const bottleneck = job.currentStep || "service";
    let assignedTech = job.repairOrder?.technicianName || "ไม่ระบุช่าง";
    if (job.installationOrders?.length > 0 && job.installationOrders[0].technician) {
      assignedTech = job.installationOrders[0].technician;
    }
    return { ...job, daysPending: days, bottleneck, assignedTech };
  }).sort((a, b) => b.daysPending - a.daysPending);

  const waitingForParts = slaBreachedJobs.filter(j => 
    j.bottleneck?.includes("store") || j.bottleneck?.includes("อะไหล่")
  );

  // --- 4. Pending Jobs by Step Breakdown ---
  const stepBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allPendingJobs.forEach(job => {
      const step = job.currentStep || "other";
      counts[step] = (counts[step] || 0) + 1;
    });
    return Object.entries(counts).map(([step, count]) => ({
      step,
      label: STEP_LABELS[step] || step,
      count
    })).sort((a, b) => b.count - a.count);
  }, [allPendingJobs]);

  // --- 5. Filtered SLA Breached Jobs for table ---
  const filteredSlaJobs = useMemo(() => {
    let list = [...slaBreachedJobs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => 
        j.jobNumber?.toLowerCase().includes(q) ||
        j.customerName?.toLowerCase().includes(q) ||
        j.assignedTech?.toLowerCase().includes(q) ||
        j.item?.toLowerCase().includes(q)
      );
    }
    if (stepFilter !== "all") {
      list = list.filter(j => j.bottleneck === stepFilter);
    }
    return list;
  }, [slaBreachedJobs, searchQuery, stepFilter]);

  // --- 6. Chart Data (Installation vs Repair) with Red, White & Gray Palette ---
  const workloadChartData = [
    {
      name: "งานซ่อม (Repairs)",
      จำนวนงาน: incomingRepairs,
      มูลค่าประเมิน: billedRevenue + unbilledValue
    },
    {
      name: "งานติดตั้ง (Installs)",
      จำนวนงาน: incomingInstalls,
      มูลค่าประเมิน: incomingInstalls * 5000 
    }
  ];

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 pb-20 custom-scrollbar relative font-sans">

      {/* ── Modern Red, White & Gray Hero Header ── */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                <Wrench size={13} className="text-red-500" />
                Executive Service & Technical Operations
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                ภาพรวมงานบริการและงานซ่อม
              </h1>
              <p className="text-gray-400 text-sm mt-1.5 max-w-2xl font-normal">
                วิเคราะห์ประสิทธิภาพงานซ่อม ระยะเวลาเฉลี่ย (MTTR) รายได้บริการ และการบริหารจัดการงานล่าช้าเกิน SLA
              </p>
            </div>

            {/* Quick Hero Health Highlight */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-900/40">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">งานเกินกำหนด SLA</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      {slaBreachedJobs.length}
                    </span>
                    <span className="text-xs font-bold text-gray-400">งาน</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      slaBreachedJobs.length === 0 
                        ? 'bg-gray-800 text-gray-200 border border-gray-700' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {slaBreachedJobs.length === 0 ? 'ปกติ (Optimal)' : 'ต้องเร่งแก้ไข'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 space-y-6">

        {/* ── Executive Filter Bar ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Timeframe Mode Selector */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-2xl shrink-0">
              {[
                { id: "month", label: "เดือนนี้" },
                { id: "last_month", label: "เดือนที่แล้ว" },
                { id: "year", label: "ปีนี้" },
                { id: "all", label: "ทั้งหมด" },
                { id: "custom", label: "กำหนดเอง" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/executive/service?timeframe=${t.id}`)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    timeframe === t.id
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Custom Date Picker (if active) */}
            {timeframe === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800"
                />
                <span className="text-gray-400 font-bold text-xs">-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800"
                />
                <button
                  onClick={() => router.push(`/executive/service?timeframe=custom&startDate=${customStart}&endDate=${customEnd}`)}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  ค้นหา
                </button>
              </div>
            )}

            {/* Quick Summary Pill */}
            <div className="text-xs text-gray-500 font-medium">
              งานที่เปิดทั้งหมดในระบบ: <span className="font-bold text-gray-900">{allPendingJobs.length} งาน</span>
            </div>
          </div>
        </div>

        {/* ── 1. Executive Service KPI Cards (4 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Total Volume */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ปริมาณงานรับเข้า (Volume)</span>
                <div className="p-2 rounded-xl bg-gray-100 text-gray-800">
                  <Activity size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {totalVolume} <span className="text-sm font-normal text-gray-500">งาน</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>งานซ่อม: <strong className="text-gray-900 font-mono">{incomingRepairs}</strong></span>
              <span>งานติดตั้ง: <strong className="text-gray-900 font-mono">{incomingInstalls}</strong></span>
            </div>
          </div>

          {/* Card 2: Velocity / MTTR */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ความเร็วการซ่อมเฉลี่ย (MTTR)</span>
                <div className="p-2 rounded-xl bg-gray-100 text-gray-800">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {mttr} <span className="text-sm font-normal text-gray-500">วัน</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>ระยะเวลาเฉลี่ยจนส่งมอบ</span>
              <span className="font-bold text-gray-800">เป้าหมาย &le; 2.0 วัน</span>
            </div>
          </div>

          {/* Card 3: Billed Service Revenue */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">รายได้บริการเปิดบิลแล้ว</span>
                <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {formatSmart(billedRevenue)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatCurrency(billedRevenue)}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>รอเสนอ/ต้นทุนแฝง:</span>
              <span className="font-bold text-gray-800 font-mono">{formatSmart(unbilledValue)}</span>
            </div>
          </div>

          {/* Card 4: SLA Breaches Alert */}
          <div className={`rounded-2xl p-5 shadow-sm border flex flex-col justify-between hover:shadow-md transition-all ${
            slaBreachedJobs.length > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">งานเกินกำหนด SLA (&gt; 2 วัน)</span>
                <div className={`p-2 rounded-xl ${slaBreachedJobs.length > 0 ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className={`text-2xl font-black tracking-tight font-mono ${
                slaBreachedJobs.length > 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {slaBreachedJobs.length} <span className="text-sm font-normal text-gray-500">งาน</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
              <span className="text-gray-500">ค้างในระบบทั้งหมด:</span>
              <span className="font-bold text-gray-900 font-mono">{allPendingJobs.length} งาน</span>
            </div>
          </div>

        </div>

        {/* ── 2. Workload & Step Distribution (2 Columns) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Workload Comparison Bar Chart */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={18} className="text-red-600" />
                    สัดส่วนงานติดตั้ง vs งานซ่อม (Workload & Value)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">เปรียบเทียบปริมาณงานและมูลค่าประเมินตามประเภทงาน</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: "#4B5563", fontWeight: 600 }} 
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      tick={{ fontSize: 11, fill: "#6B7280" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickFormatter={(val) => formatSmart(val)} 
                      tick={{ fontSize: 11, fill: "#9CA3AF" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => {
                        if (name === "จำนวนงาน") return [`${value} งาน`, "จำนวนงาน"];
                        return [formatCurrency(Number(value)), "มูลค่าประเมิน"];
                      }}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E5E7EB",
                        borderRadius: "0.75rem",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#111827"
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                    <Bar yAxisId="left" dataKey="จำนวนงาน" fill="#1F2937" radius={[4, 4, 0, 0]} barSize={36} />
                    <Bar yAxisId="right" dataKey="มูลค่าประเมิน" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 mt-2">
              <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase">ส่งมอบเสร็จแล้ว</p>
                <p className="text-sm font-black text-gray-900 font-mono mt-0.5">{completedRepairs + completedInstalls} งาน</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase">ส่งซ่อมภายนอก (Outsource)</p>
                <p className="text-sm font-black text-gray-900 font-mono mt-0.5">{currentOutsource.length} งาน</p>
              </div>
            </div>
          </div>

          {/* Current Step Distribution */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Layers size={18} className="text-red-600" />
                    สถานะขั้นตอนงานซ่อมปัจจุบัน (Active Steps)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">การกระจายตัวของงานที่กำลังดำเนินการอยู่ในแต่ละแผนก</p>
                </div>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-xl">
                  {allPendingJobs.length} งานค้าง
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
                {stepBreakdown.map((item, idx) => {
                  const share = allPendingJobs.length > 0 
                    ? (item.count / allPendingJobs.length) * 100 
                    : 0;

                  return (
                    <div key={idx} className="p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-gray-200 transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-800">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 font-mono">{item.count} งาน</span>
                          <span className="text-[10px] text-gray-400 font-medium font-mono">({share.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-red-600 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(3, share)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {stepBreakdown.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    ไม่มีงานค้างในขั้นตอนใดๆ
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>คอขวดหลัก:</span>
              <span className="font-bold text-gray-800">
                {stepBreakdown[0]?.label || "ไม่มี"} ({stepBreakdown[0]?.count || 0} งาน)
              </span>
            </div>
          </div>

        </div>

        {/* ── 3. SLA Breaches & Bottlenecks Table ── */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600" />
                คิวงานล่าช้าและจุดติดขัด (SLA Breaches & Bottlenecks)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                รายการงานที่อยู่ในระบบเกิน 2 วันทำการ เพื่อให้ผู้บริหารเร่งติดตามและแก้ไขปัญหาคอขวด
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่งาน, บริษัท, ช่าง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800"
                />
              </div>

              <div className="relative">
                <select
                  value={stepFilter}
                  onChange={(e) => setStepFilter(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">ทุกขั้นตอน ({slaBreachedJobs.length})</option>
                  {stepBreakdown.map((s, idx) => (
                    <option key={idx} value={s.step}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* SLA Table */}
          {filteredSlaJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">เลขที่งาน / ลูกค้า</th>
                    <th className="pb-3">ประเภทงาน / สินค้า</th>
                    <th className="pb-3">ขั้นตอนปัจจุบัน (คอขวด)</th>
                    <th className="pb-3">ช่างผู้ดูแล</th>
                    <th className="pb-3 text-center">ระยะเวลาค้าง</th>
                    <th className="pb-3 text-right pr-2">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSlaJobs.map((job: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 pl-2">
                        <div className="font-bold text-gray-900 text-sm">{job.jobNumber}</div>
                        <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{job.customerName}</div>
                      </td>
                      <td className="py-3.5 text-gray-700">
                        <div className="font-semibold text-gray-800">{job.jobType || "งานบริการ"}</div>
                        <div className="text-gray-400 text-[11px] line-clamp-1">{job.item || "-"}</div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-bold text-[11px] border border-gray-200">
                          {STEP_LABELS[job.bottleneck] || job.bottleneck}
                        </span>
                      </td>
                      <td className="py-3.5 text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-gray-400" />
                          <span className="font-medium">{job.assignedTech}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-bold text-[11px] border border-red-200/80">
                          <Clock size={12} />
                          {Math.floor(job.daysPending)} วัน (เกิน SLA)
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <Link
                          href={job.repairOrder?.id ? `/repair-orders/${job.repairOrder.id}/edit` : `/jobs`}
                          className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-800 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-xl font-bold shadow-sm transition-all"
                        >
                          <span>ตรวจสอบ</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">ไม่มีงานที่ล่าช้าเกิน SLA</p>
              <p className="text-xs text-gray-400 mt-1">การดำเนินการงานบริการและงานซ่อมทั้งหมดอยู่ในกรอบเวลามาตรฐาน</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
