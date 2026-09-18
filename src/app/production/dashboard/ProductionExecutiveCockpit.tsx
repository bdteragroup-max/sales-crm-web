"use client";

import React, { useState, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ShieldCheck,
  Receipt,
  FileText,
  Building2,
  Wallet,
  Banknote,
  RotateCcw,
  Maximize2,
  Monitor,
  CalendarDays,
  Layers,
  Award,
  ExternalLink,
  X,
  Table,
  Users,
  Percent,
  TrendingUp,
  Activity,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import ExecutiveLiveSync from "@/app/executive/components/ExecutiveLiveSync";

interface ProductionExecutiveCockpitProps {
  orders: any[];
  prs: any[];
  pos: any[];
  cabinetJobs: any[];
  onViewOperational: () => void;
}

// ── Smart Number & Currency Formatters ──
function formatCurrency(val: number | string | null | undefined): string {
  const n = Number(val) || 0;
  if (n >= 1_000_000_000) return `฿${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(0)}k`;
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function formatSmart(val: number | string | null | undefined): string {
  const n = Number(val) || 0;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function formatDateThai(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  } catch {
    return "-";
  }
}

const THAI_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const THAI_SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function getOrderDateParts(order: any) {
  const dStr = order.createdAt || order.updatedAt;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) {
    return {
      yearBe: 2569,
      yearCe: 2026,
      month: 1,
      dateStr: "",
    };
  }

  try {
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
    const [ceYearStr, moStr] = dateStr.split("-");
    const ceYear = parseInt(ceYearStr, 10);
    const beYear = ceYear + 543;
    const month = parseInt(moStr, 10);

    return {
      yearBe: beYear,
      yearCe: ceYear,
      month,
      dateStr,
    };
  } catch {
    const ceYear = d.getFullYear();
    const beYear = ceYear + 543;
    const month = d.getMonth() + 1;
    const dateStr = d.toISOString().split("T")[0];
    return {
      yearBe: beYear,
      yearCe: ceYear,
      month,
      dateStr,
    };
  }
}

// Company code resolver from linked quotation jobs or order number
function resolveCompanyCode(order: any): "TE" | "TG" | "TP" | "OTHER" {
  const job = order.quotation?.jobs?.[0];
  if (job?.companyCode) {
    const c = job.companyCode.toUpperCase();
    if (c === "TE" || c === "TG" || c === "TP") return c;
  }
  const jb = (job?.jobNumber || "").toUpperCase();
  if (jb.includes("-TE-") || jb.includes("TE")) return "TE";
  if (jb.includes("-TG-") || jb.includes("TG")) return "TG";
  if (jb.includes("-TP-") || jb.includes("TP")) return "TP";

  const ord = (order.orderNumber || "").toUpperCase();
  if (ord.includes("TE")) return "TE";
  if (ord.includes("TG")) return "TG";
  if (ord.includes("TP")) return "TP";

  const qt = (order.quotation?.quotationNumber || "").toUpperCase();
  if (qt.includes("-E-") || qt.includes("TE")) return "TE";
  if (qt.includes("-G-") || qt.includes("TG")) return "TG";
  if (qt.includes("-P-") || qt.includes("TP")) return "TP";

  return "OTHER";
}

// ── RAG Evaluator for Production Orders ──
function evaluateOrderRAG(order: any, today: Date) {
  const deadline = order.productionDeadline ? new Date(order.productionDeadline) : null;
  const diffDays = deadline ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const isCompleted = order.status === "เสร็จสิ้น";
  const isOverdue = deadline ? diffDays < 0 && !isCompleted : false;
  const isFailedQC = order.qcStatus === "FAIL";

  if (isOverdue || isFailedQC) {
    return {
      status: "red" as const,
      label: isFailedQC ? "QC ไม่ผ่าน" : "วิกฤต",
      subLabel: isFailedQC ? "ต้องแก้ไขตู้ (Rework)" : `เกินกำหนด ${Math.abs(diffDays)} วัน`,
      badgeClass: "bg-red-600 text-white shadow-xs",
      dotClass: "bg-red-500 animate-pulse",
      borderClass: "border-red-200 bg-red-50/30",
      isOverdue,
      daysRemaining: diffDays,
    };
  }

  if (diffDays <= 14 && !isCompleted) {
    return {
      status: "yellow" as const,
      label: "เฝ้าระวัง",
      subLabel: `เหลือ ${diffDays} วัน`,
      badgeClass: "bg-amber-500 text-white shadow-xs",
      dotClass: "bg-amber-400",
      borderClass: "border-amber-200 bg-amber-50/20",
      isOverdue: false,
      daysRemaining: diffDays,
    };
  }

  if (isCompleted) {
    return {
      status: "green" as const,
      label: "เสร็จสิ้น",
      subLabel: "ผลิตและตรวจรับแล้ว",
      badgeClass: "bg-emerald-600 text-white shadow-xs",
      dotClass: "bg-emerald-500",
      borderClass: "border-slate-200/80 bg-white",
      isOverdue: false,
      daysRemaining: diffDays,
    };
  }

  return {
    status: "green" as const,
    label: "ปกติ",
    subLabel: order.status || "ตามแผนงาน",
    badgeClass: "bg-emerald-600 text-white shadow-xs",
    dotClass: "bg-emerald-500",
    borderClass: "border-slate-200/80 bg-white",
    isOverdue: false,
    daysRemaining: diffDays,
  };
}

export default function ProductionExecutiveCockpit({
  orders,
  prs,
  pos,
  cabinetJobs,
  onViewOperational,
}: ProductionExecutiveCockpitProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"cockpit" | "expanded">("cockpit");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_production" | "pending_qc" | "pending_po" | "completed">("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [stageMetric, setStageMetric] = useState<"value" | "count">("value");
  const [leftBottomTab, setLeftBottomTab] = useState<"companies" | "qcQuality" | "technicians">("companies");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  const today = useMemo(() => new Date(), []);
  const currentCEYear = today.getFullYear();
  const currentBEYear = currentCEYear + 543;
  const currentMonthNum = today.getMonth() + 1;

  const todayDateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }, []);

  // ── Date, Month, Year Filter State & URL Sync ──
  const initialPeriod = (searchParams?.get("period") as "all" | "year" | "month" | "date") || "all";
  const initialYear = parseInt(searchParams?.get("year") || "", 10) || currentBEYear;
  const initialMonth = parseInt(searchParams?.get("month") || "", 10) || currentMonthNum;
  const initialDate = searchParams?.get("date") || todayDateStr;

  const [period, setPeriod] = useState<"all" | "year" | "month" | "date">(initialPeriod);
  const [selectedYearBe, setSelectedYearBe] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    try {
      const [yStr, mStr, dStr] = selectedDate.split("-");
      const day = parseInt(dStr, 10);
      const monthIdx = parseInt(mStr, 10) - 1;
      const yearBe = parseInt(yStr, 10) + 543;
      const shortYear = yearBe % 100;
      return `${day} ${THAI_SHORT_MONTHS[monthIdx] || ""} ${shortYear}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const updateUrlParams = (newPeriod: string, newYear: number, newMonth: number, newDate: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (newPeriod === "all") {
        params.delete("period");
        params.delete("year");
        params.delete("month");
        params.delete("date");
      } else {
        params.set("period", newPeriod);
        if (newPeriod === "year") {
          params.set("year", newYear.toString());
          params.delete("month");
          params.delete("date");
        } else if (newPeriod === "month") {
          params.set("year", newYear.toString());
          params.set("month", newMonth.toString());
          params.delete("date");
        } else if (newPeriod === "date") {
          params.set("date", newDate);
          params.delete("year");
          params.delete("month");
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handlePeriodChange = (newPeriod: "all" | "year" | "month" | "date") => {
    setPeriod(newPeriod);
    updateUrlParams(newPeriod, selectedYearBe, selectedMonth, selectedDate);
  };

  const handlePrevStep = () => {
    if (period === "year") {
      const nextY = selectedYearBe - 1;
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, selectedMonth, selectedDate);
    } else if (period === "month") {
      let nextM = selectedMonth - 1;
      let nextY = selectedYearBe;
      if (nextM < 1) {
        nextM = 12;
        nextY -= 1;
      }
      setSelectedMonth(nextM);
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, nextM, selectedDate);
    } else if (period === "date") {
      const d = new Date(selectedDate + "T12:00:00");
      d.setDate(d.getDate() - 1);
      const nextDate = d.toISOString().split("T")[0];
      setSelectedDate(nextDate);
      updateUrlParams(period, selectedYearBe, selectedMonth, nextDate);
    }
  };

  const handleNextStep = () => {
    if (period === "year") {
      const nextY = selectedYearBe + 1;
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, selectedMonth, selectedDate);
    } else if (period === "month") {
      let nextM = selectedMonth + 1;
      let nextY = selectedYearBe;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      setSelectedMonth(nextM);
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, nextM, selectedDate);
    } else if (period === "date") {
      const d = new Date(selectedDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split("T")[0];
      setSelectedDate(nextDate);
      updateUrlParams(period, selectedYearBe, selectedMonth, nextDate);
    }
  };

  const handleDateSelect = (dateVal: string) => {
    if (!dateVal) return;
    setSelectedDate(dateVal);
    updateUrlParams("date", selectedYearBe, selectedMonth, dateVal);
  };

  const periodLabel = useMemo(() => {
    if (period === "year") return `ปี ${selectedYearBe}`;
    if (period === "month") return `${THAI_MONTH_NAMES[selectedMonth - 1] || ""} ${selectedYearBe}`;
    if (period === "date") return `วันที่ ${formattedSelectedDate}`;
    return "สะสมทั้งหมด";
  }, [period, selectedYearBe, selectedMonth, formattedSelectedDate]);

  // ── 1. Filtered Orders Dataset (by Date/Month/Year, Status, Company) ──
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Date / Period Filter
      if (period !== "all") {
        const parts = getOrderDateParts(o);
        if (period === "year") {
          const matchesBe = parts.yearBe === selectedYearBe || parts.yearCe === selectedYearBe - 543;
          if (!matchesBe) return false;
        } else if (period === "month") {
          const matchesBe = parts.yearBe === selectedYearBe || parts.yearCe === selectedYearBe - 543;
          const matchesMonth = parts.month === selectedMonth;
          if (!matchesBe || !matchesMonth) return false;
        } else if (period === "date") {
          if (parts.dateStr !== selectedDate) return false;
        }
      }

      // Status Filter
      if (statusFilter === "in_production" && o.status !== "กำลังผลิต") return false;
      if (statusFilter === "pending_qc" && o.status !== "ตรวจสอบคุณภาพ") return false;
      if (statusFilter === "pending_po" && o.status !== "รอยืนยัน" && o.status) return false;
      if (statusFilter === "completed" && o.status !== "เสร็จสิ้น") return false;

      // Company Filter
      if (selectedCompany !== "all") {
        const comp = resolveCompanyCode(o);
        if (comp !== selectedCompany) return false;
      }

      return true;
    });
  }, [orders, period, selectedYearBe, selectedMonth, selectedDate, statusFilter, selectedCompany]);

  // ── 2. High-Level Production & Financial Aggregates ──
  const totalPipelineValue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  }, [filteredOrders]);

  const pendingPoOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "รอยืนยัน" || !o.status);
  }, [filteredOrders]);

  const pendingPoValue = useMemo(() => {
    return pendingPoOrders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  }, [pendingPoOrders]);

  const inProductionOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "กำลังผลิต");
  }, [filteredOrders]);

  const inProductionValue = useMemo(() => {
    return inProductionOrders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  }, [inProductionOrders]);

  const qcOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "ตรวจสอบคุณภาพ");
  }, [filteredOrders]);

  const qcValue = useMemo(() => {
    return qcOrders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  }, [qcOrders]);

  const completedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "เสร็จสิ้น");
  }, [filteredOrders]);

  const completedValue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  }, [completedOrders]);

  // ── 3. Overdue & Delivery SLA Tracking ──
  const overdueOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => {
        if (!o.productionDeadline) return false;
        if (o.status === "เสร็จสิ้น") return false;
        const dl = new Date(o.productionDeadline);
        return dl < today;
      })
      .map((o) => {
        const dl = new Date(o.productionDeadline);
        const diffDays = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...o,
          daysOverdue: Math.abs(diffDays),
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [filteredOrders, today]);

  const overdueValue = useMemo(() => {
    return overdueOrders.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  }, [overdueOrders]);

  const onTimeRate = useMemo(() => {
    if (filteredOrders.length === 0) return 100;
    const activeCount = filteredOrders.filter((o) => o.status !== "เสร็จสิ้น").length;
    if (activeCount === 0) return 100;
    return Math.max(0, ((activeCount - overdueOrders.length) / activeCount) * 100);
  }, [filteredOrders, overdueOrders]);

  // ── 4. Total Procurement / PO Expense ──
  const totalPoExpense = useMemo(() => {
    return pos.reduce((acc, po) => acc + (Number(po.totalAmount) || 0), 0);
  }, [pos]);

  // ── 5. Production Pipeline Stages Breakdown (Quadrant 1 BarChart) ──
  const stageBreakdown = useMemo(() => {
    return [
      {
        stage: "รอเปิด PO",
        count: pendingPoOrders.length,
        value: pendingPoValue,
        fill: "#64748b", // slate
        desc: "คำสั่งผลิตที่รออนุมัติจัดซื้อ/จัดสรรวัตถุดิบ",
      },
      {
        stage: "กำลังผลิต",
        count: inProductionOrders.length,
        value: inProductionValue,
        fill: "#2563eb", // blue
        desc: "อยู่ระหว่างการประกอบตู้หน้างานโรงงาน",
      },
      {
        stage: "รอ QC",
        count: qcOrders.length,
        value: qcValue,
        fill: "#7c3aed", // violet
        desc: "ประกอบเสร็จ รอการตรวจรับคุณภาพ",
      },
      {
        stage: "เสร็จสิ้น",
        count: completedOrders.length,
        value: completedValue,
        fill: "#059669", // emerald
        desc: "ผ่าน QC และส่งมอบเข้าโครงการเรียบร้อย",
      },
    ];
  }, [pendingPoOrders, pendingPoValue, inProductionOrders, inProductionValue, qcOrders, qcValue, completedOrders, completedValue]);

  // ── 6. Company Code Breakdown (TE / TG / TP) ──
  const companyCodeBreakdown = useMemo(() => {
    const map: Record<string, { code: string; name: string; count: number; value: number }> = {
      TE: { code: "TE", name: "Tera Energy (วิศวกรรมพลังงาน)", count: 0, value: 0 },
      TG: { code: "TG", name: "Tera Group (กลุ่มธุรกิจหลัก)", count: 0, value: 0 },
      TP: { code: "TP", name: "Tera Power (โซลาร์ & พลังงานสะอาด)", count: 0, value: 0 },
      OTHER: { code: "OTHER", name: "โครงการภายนอก/ทั่วไป", count: 0, value: 0 },
    };

    filteredOrders.forEach((o) => {
      const c = resolveCompanyCode(o);
      map[c].count += 1;
      map[c].value += Number(o.value) || 0;
    });

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  // ── 7. Quality Control First-Pass Yield Breakdown ──
  const qcStats = useMemo(() => {
    let passCount = 0;
    let failCount = 0;
    let pendingCount = 0;

    filteredOrders.forEach((o) => {
      if (o.qcStatus === "PASS") passCount++;
      else if (o.qcStatus === "FAIL") failCount++;
      else pendingCount++;
    });

    const evaluated = passCount + failCount;
    const firstPassYield = evaluated > 0 ? (passCount / evaluated) * 100 : 100;

    return {
      passCount,
      failCount,
      pendingCount,
      firstPassYield,
    };
  }, [filteredOrders]);

  // ── 8. Technician Cumulative Output Summary ──
  const technicianStats = useMemo(() => {
    const map: Record<string, { name: string; completed: number; inProgress: number; total: number }> = {};

    cabinetJobs.forEach((job) => {
      const name = job.technician?.fullName || "ไม่ได้ระบุช่าง";
      if (!map[name]) {
        map[name] = { name, completed: 0, inProgress: 0, total: 0 };
      }
      map[name].total += 1;
      if (job.status === "COMPLETED") map[name].completed += 1;
      else map[name].inProgress += 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [cabinetJobs]);

  // ── 9. Strategic High-Value Orders Watchlist ──
  const filteredStrategicOrders = useMemo(() => {
    const list = [...filteredOrders].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();

    return list.filter((o) => {
      const ordNum = (o.orderNumber || "").toLowerCase();
      const qtNum = (o.quotation?.quotationNumber || "").toLowerCase();
      const job = o.quotation?.jobs?.[0];
      const cust = (job?.customerName || "").toLowerCase();
      const proj = (job?.project?.name || "").toLowerCase();
      const sales = (o.salesperson?.fullName || "").toLowerCase();

      return (
        ordNum.includes(q) ||
        qtNum.includes(q) ||
        cust.includes(q) ||
        proj.includes(q) ||
        sales.includes(q)
      );
    });
  }, [filteredOrders, searchQuery]);

  return (
    <div
      className={`flex-1 h-screen flex flex-col ${
        viewMode === "cockpit" ? "overflow-hidden" : "overflow-y-auto"
      } bg-slate-50 font-ibm-thai relative select-none`}
    >
      {/* ── Compact Executive Top Header Bar (Unified Standard h-13) ── */}
      <header className="h-13 px-3 sm:px-4 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-20 shadow-xs gap-2">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 font-mono">
            Executive
          </span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
            <Package size={15} className="text-red-600 shrink-0" />
            <span>Production &amp; Factory Cockpit</span>
          </h1>

          <div className="hidden min-[1600px]:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs shrink-0">
            <span className="text-slate-400 font-medium">คำสั่งผลิต ({periodLabel}):</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{filteredOrders.length} งาน</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-medium">มูลค่างานผลิต:</span>
            <span className="font-bold text-red-600 font-mono text-sm">{formatCurrency(totalPipelineValue)}</span>
          </div>
        </div>

        {/* Center: Symmetrical Date / Month / Year Filter Command Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 1. Date / Month / Year Granularity Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-xs shrink-0">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "year", label: "รายปี" },
              { id: "month", label: "รายเดือน" },
              { id: "date", label: "รายวัน" },
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id as any)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-red-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  title={`กรองแบบ${p.label}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* 2. Dynamic Navigator Stepper */}
          {period === "all" ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-700 shadow-2xs font-medium whitespace-nowrap shrink-0">
              <CalendarDays size={13} className="text-red-500 shrink-0" />
              <span>ข้อมูลสะสมทั้งหมด</span>
            </div>
          ) : (
            <div className="flex items-center bg-white border border-slate-200/90 rounded-xl p-0.5 text-xs shadow-2xs shrink-0">
              <button
                onClick={handlePrevStep}
                className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer shrink-0"
                title="ก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Dynamic Period Content */}
              {period === "year" && (
                <span className="text-xs font-bold text-slate-800 px-2 min-w-[65px] text-center tracking-tight font-mono whitespace-nowrap shrink-0">
                  ปี {selectedYearBe}
                </span>
              )}

              {period === "month" && (
                <div className="relative flex items-center shrink-0">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setSelectedMonth(m);
                      updateUrlParams("month", selectedYearBe, m, selectedDate);
                    }}
                    className="text-xs font-bold text-slate-800 px-2 py-0.5 bg-transparent border-0 focus:outline-none cursor-pointer tracking-tight whitespace-nowrap"
                  >
                    {THAI_MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name} {selectedYearBe}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {period === "date" && (
                <div className="flex items-center gap-1 px-1 shrink-0">
                  <span className="text-xs font-bold text-slate-800 px-1 min-w-[90px] text-center tracking-tight whitespace-nowrap shrink-0">
                    {formattedSelectedDate}
                  </span>
                  {selectedDate === todayDateStr && (
                    <span className="px-1.5 py-0.2 rounded-md bg-red-50 text-red-600 font-bold text-[10px] whitespace-nowrap shrink-0">
                      วันนี้
                    </span>
                  )}
                  {/* Native Date Picker trigger */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="เลือกวันที่จากปฏิทิน"
                    >
                      <CalendarDays size={13} />
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateSelect(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-auto"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleNextStep}
                className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer shrink-0"
                title="ถัดไป"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* 3. Status Filter Dropdown */}
          <div className="hidden lg:flex items-center bg-white border border-slate-200/90 rounded-xl px-2 py-0.5 text-xs shadow-2xs shrink-0">
            <span className="text-slate-400 text-[10px] mr-1">สถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer tracking-tight whitespace-nowrap"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending_po">รอเปิด PO ({pendingPoOrders.length})</option>
              <option value="in_production">กำลังผลิต ({inProductionOrders.length})</option>
              <option value="pending_qc">รอ QC ({qcOrders.length})</option>
              <option value="completed">เสร็จสิ้น ({completedOrders.length})</option>
            </select>
          </div>

          {/* 4. Company Dropdown Filter */}
          <div className="hidden md:flex items-center bg-white border border-slate-200/90 rounded-xl px-2 py-0.5 text-xs shadow-2xs shrink-0">
            <span className="text-slate-400 text-[10px] mr-1">บริษัท:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer tracking-tight whitespace-nowrap"
            >
              <option value="all">ทุกกลุ่มธุรกิจ</option>
              <option value="TE">TE (Tera Energy)</option>
              <option value="TG">TG (Tera Group)</option>
              <option value="TP">TP (Tera Power)</option>
              <option value="OTHER">อื่นๆ / ทั่วไป</option>
            </select>
          </div>

          {/* 5. Results Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 border border-slate-200/60 text-xs whitespace-nowrap shrink-0">
            <span className="text-slate-500 font-medium">พบ:</span>
            <span className="font-bold text-slate-900 font-mono">{filteredOrders.length}</span>
            <span className="text-slate-400 text-[10px]">งาน</span>
          </div>

          {/* 6. Reset Button */}
          {(period !== "all" || statusFilter !== "all" || selectedCompany !== "all") && (
            <button
              onClick={() => {
                setPeriod("all");
                setStatusFilter("all");
                setSelectedCompany("all");
                updateUrlParams("all", currentBEYear, currentMonthNum, todayDateStr);
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
              title="ล้างตัวกรองทั้งหมด"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Right: Header Actions & Mode Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ExecutiveLiveSync />

          {/* View Switcher: Cockpit vs Operational Workshop Dashboard */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode("cockpit")}
              className={`px-2 py-1 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                viewMode === "cockpit"
                  ? "bg-white text-red-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="โหมด Cockpit (Zero-Scroll)"
            >
              <Monitor size={13} className="shrink-0" />
              <span className="text-[11px]">Cockpit</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === "expanded" ? "cockpit" : "expanded")}
              className={`p-1 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${
                viewMode === "expanded"
                  ? "bg-white text-red-600 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title={viewMode === "expanded" ? "ย่อเป็น Cockpit" : "โหมดขยายเต็มจอ"}
            >
              <Maximize2 size={13} />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-0.5" />

            <button
              onClick={onViewOperational}
              className="px-2 py-1 rounded-lg text-xs transition-all flex items-center gap-1 text-slate-700 hover:text-red-600 hover:bg-white font-semibold cursor-pointer whitespace-nowrap"
              title="สลับไปแดชบอร์ดปฏิบัติการช่าง (Operational Workshop Dashboard)"
            >
              <Table size={13} className="shrink-0" />
              <span className="hidden sm:inline text-[11px]">แดชบอร์ดช่างโรงงาน</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Symmetrical 6-Card Executive Metric Strip (h-[90px] Identical Height) ── */}
      <div className="px-3 sm:px-4 pt-2.5 pb-1 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Tile 1: Total Production Pipeline Value */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                มูลค่างานผลิต ({periodLabel})
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Wallet size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                {formatCurrency(totalPipelineValue)}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono shrink-0">
                {filteredOrders.length} งาน
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              คำสั่งประกอบตู้ในระบบ ({periodLabel})
            </span>
          </div>

          {/* Tile 2: Pending PO Bottleneck */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-amber-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                คอขวดรอเปิด PO
              </span>
              <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono tracking-tight leading-none">
                {formatCurrency(pendingPoValue)}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono shrink-0">
                {pendingPoOrders.length} รายการ (
                {totalPipelineValue > 0 ? ((pendingPoValue / totalPipelineValue) * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              คำสั่งผลิตรออนุมัติเปิดจัดซื้อวัตถุดิบ
            </span>
          </div>

          {/* Tile 3: On-Time Delivery SLA */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                ส่งมอบตรงตามกำหนด
              </span>
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight leading-none">
                {onTimeRate.toFixed(1)}%
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono shrink-0">
                {filteredOrders.length - overdueOrders.length} งานปกติ
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              อัตราส่งมอบตู้ตามแผนงานโรงงาน
            </span>
          </div>

          {/* Tile 4: Quality Control WIP & First-Pass Yield */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-purple-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                งานรอตรวจ QC &amp; คุณภาพ
              </span>
              <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono tracking-tight leading-none">
                {formatCurrency(qcValue)}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono shrink-0">
                {qcOrders.length} ตู้รอตรวจ
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              First-Pass Yield ผ่าน {qcStats.firstPassYield.toFixed(0)}% (ตก {qcStats.failCount})
            </span>
          </div>

          {/* Tile 5: Overdue Orders & Production Risk */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                ความเสี่ยงงานเกินกำหนด
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${
                  overdueOrders.length > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatCurrency(overdueValue)}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                  overdueOrders.length > 0
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {overdueOrders.length} งานล่าช้า
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              {overdueOrders.length > 0 ? "เสี่ยงกระทบกำหนดการติดตั้งหน้างาน" : "ไม่มีงานผลิตที่เกินกำหนดเวลา"}
            </span>
          </div>

          {/* Tile 6: Material & PO Expense */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                ต้นทุนจัดซื้อ PO รวม
              </span>
              <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Banknote size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono tracking-tight leading-none">
                {formatCurrency(totalPoExpense)}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono shrink-0">
                {pos.length} ใบสั่งซื้อ
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              ต้นทุนอุปกรณ์และชิ้นส่วนหลักที่เปิดสั่งซื้อ
            </span>
          </div>
        </div>
      </div>

      {/* ── COCKPIT MODE: Balanced 50 / 50 Dual Column Grid (Zero-Scroll on Desktop) ── */}
      {viewMode === "cockpit" ? (
        <main className="flex-1 min-h-0 px-3 sm:px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* ════════ LEFT COLUMN (6 Cols = 50% Symmetry): Pipeline Stage Distribution & Business Mix ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* Left Top Card: Production Pipeline Stages BarChart with Value/Count Toggle */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[49%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5">
                  <Layers size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    การกระจายมูลค่าตามขั้นตอนการผลิต ({periodLabel})
                  </h2>
                </div>

                {/* Metric Toggle: Value in THB vs Order Count */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-[10px]">
                  <button
                    onClick={() => setStageMetric("value")}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      stageMetric === "value"
                        ? "bg-red-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    มูลค่าสัญญา (THB)
                  </button>
                  <button
                    onClick={() => setStageMetric("count")}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      stageMetric === "count"
                        ? "bg-red-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    จำนวนคำสั่งผลิต (งาน)
                  </button>
                </div>
              </div>

              {/* BarChart */}
              <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageBreakdown} margin={{ top: 18, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: "#475569", fontSize: 9, fontWeight: 600 }}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 9 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (stageMetric === "value" ? formatSmart(val) : val)}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const sharePct = totalPipelineValue > 0 ? (data.value / totalPipelineValue) * 100 : 0;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800 text-[11px] font-ibm-thai">
                              <p className="font-bold text-xs mb-1 text-white">{label}</p>
                              <div className="space-y-1 text-slate-300">
                                <div className="flex items-center justify-between gap-3">
                                  <span>มูลค่ารวม:</span>
                                  <span className="font-mono text-red-400 font-bold">{formatCurrency(data.value)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>สัดส่วนในโรงงาน:</span>
                                  <span className="font-mono text-emerald-400 font-bold">{sharePct.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>จำนวนคำสั่งผลิต:</span>
                                  <span className="font-mono text-white font-bold">{data.count} งาน</span>
                                </div>
                                <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-800">{data.desc}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey={stageMetric}
                      name={stageMetric === "value" ? "มูลค่าสัญญา (THB)" : "จำนวนคำสั่งผลิต"}
                      radius={[5, 5, 0, 0]}
                      barSize={32}
                      label={{
                        position: "top",
                        fill: "#475569",
                        fontSize: 9,
                        fontWeight: 700,
                        formatter: (val: any) => (stageMetric === "value" ? formatCurrency(val) : `${val} งาน`),
                      }}
                    >
                      {stageBreakdown.map((entry, index) => (
                        <Cell key={`cell-stage-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Left Bottom Card: Multi-Perspective Strategic Engine (Company Code, QC Quality, Workshop Capacity) */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs overflow-x-auto custom-scrollbar">
                  <button
                    onClick={() => setLeftBottomTab("companies")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      leftBottomTab === "companies"
                        ? "bg-red-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 size={11} />
                    <span>กลุ่มธุรกิจ (Company Code)</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab("qcQuality")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      leftBottomTab === "qcQuality"
                        ? "bg-red-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ShieldCheck size={11} />
                    <span>คุณภาพ QC ({qcStats.firstPassYield.toFixed(0)}% Yield)</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab("technicians")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      leftBottomTab === "technicians"
                        ? "bg-red-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users size={11} />
                    <span>กำลังผลิตช่าง ({technicianStats.length} ทีม)</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-mono font-medium hidden sm:inline">
                  {leftBottomTab === "companies" && `${companyCodeBreakdown.length} รหัสบริษัท`}
                  {leftBottomTab === "qcQuality" && `ตรวจสอบแล้ว ${qcStats.passCount + qcStats.failCount} ตู้`}
                  {leftBottomTab === "technicians" && `${cabinetJobs.length} งานประกอบ`}
                </span>
              </div>

              {/* Tab 1: Company Code Mix */}
              {leftBottomTab === "companies" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {companyCodeBreakdown.map((item, idx) => {
                    const share = totalPipelineValue > 0 ? (item.value / totalPipelineValue) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="p-1.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold font-mono">
                              {item.code}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800">{item.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-900 font-mono">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden my-0.5">
                          <div
                            className="bg-red-600 h-1 rounded-full"
                            style={{ width: `${Math.max(3, Math.min(100, share))}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>
                            คำสั่งผลิต: <strong className="text-slate-800 font-mono">{item.count} งาน</strong> (
                            {share.toFixed(1)}% ของมูลค่าโรงงาน)
                          </span>
                          <span>
                            เฉลี่ย/ตู้:{" "}
                            <span className="font-mono font-bold text-slate-700">
                              {formatSmart(item.count > 0 ? item.value / item.count : 0)}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Quality Control First-Pass Yield */}
              {leftBottomTab === "qcQuality" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200/80 text-[10px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-purple-700 shrink-0" />
                      <span className="text-purple-950 font-semibold">
                        First-Pass Yield: อัตราการตรวจรับคุณภาพผ่านในรอบแรกของแผนกประกอบตู้
                      </span>
                    </div>
                    <span className="font-mono font-black text-purple-950 bg-purple-200/70 px-2 py-0.5 rounded-md shrink-0">
                      {qcStats.firstPassYield.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[9px] text-emerald-700 font-semibold block">PASS (ผ่าน)</span>
                      <span className="text-sm font-black text-emerald-900 font-mono block">
                        {qcStats.passCount} ตู้
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-red-50 border border-red-200">
                      <span className="text-[9px] text-red-700 font-semibold block">FAIL (ตีกลับ/แก้ไข)</span>
                      <span className="text-sm font-black text-red-900 font-mono block">
                        {qcStats.failCount} ตู้
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[9px] text-amber-700 font-semibold block">PENDING (รอตรวจ)</span>
                      <span className="text-sm font-black text-amber-900 font-mono block">
                        {qcStats.pendingCount} ตู้
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[9px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>คำสั่งผลิตที่ผ่านการตรวจ QC แล้ว:</span>
                      <strong className="text-slate-800 font-mono">{qcStats.passCount} งาน</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>คำสั่งผลิตที่ต้องแก้ไขงาน (Rework):</span>
                      <strong className="text-red-600 font-mono">{qcStats.failCount} งาน</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Technician Workshop Capacity */}
              {leftBottomTab === "technicians" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {technicianStats.map((tech, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-800">{tech.name}</span>
                        <div className="flex items-center gap-2 font-mono text-[9px]">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                            เสร็จ: {tech.completed}
                          </span>
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded">
                            ทำอยู่: {tech.inProgress}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden my-1">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${tech.total > 0 ? (tech.completed / tech.total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>รวม {tech.total} งานประกอบ</span>
                        <span>ความสำเร็จ {tech.total > 0 ? ((tech.completed / tech.total) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ════════ RIGHT COLUMN (6 Cols = 50% Symmetry): Strategic Watchlist & Bottleneck Radar ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* Right Top Card: Strategic High-Value Cabinet Orders Watchlist */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[49%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5">
                  <Award size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    คำสั่งผลิตยุทธศาสตร์มูลค่าสูงสุด ({periodLabel})
                  </h2>
                </div>

                {/* Search */}
                <div className="relative w-28 sm:w-36">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาคำสั่งผลิต..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-6 pr-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Orders Scrollable List with RAG Status Pills */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {filteredStrategicOrders.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    ไม่พบคำสั่งผลิตที่ตรงกับช่วงเวลาหรือการค้นหา ({periodLabel})
                  </div>
                ) : (
                  filteredStrategicOrders.slice(0, 15).map((order) => {
                    const rag = evaluateOrderRAG(order, today);
                    const job = order.quotation?.jobs?.[0];

                    return (
                      <div
                        key={order.id}
                        onClick={() => setDetailOrder(order)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer group ${rag.borderClass} hover:border-red-300 hover:shadow-2xs`}
                      >
                        {/* Top Line: RAG + Order Number + Customer + Value */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[9px] font-black font-mono shrink-0 flex items-center gap-1 ${rag.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${rag.dotClass}`} />
                              <span>{rag.label}</span>
                            </span>

                            <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[9px] font-bold font-mono shrink-0">
                              {order.orderNumber}
                            </span>
                            <span className="text-[11px] font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                              {job?.customerName || order.company?.companyName || "ไม่ระบุลูกค้า"}
                            </span>
                          </div>

                          <span className="text-[11px] font-black text-red-600 font-mono shrink-0">
                            {formatCurrency(order.value)}
                          </span>
                        </div>

                        {/* Middle Line: Project Name / Quotation & Deadline */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                          <span className="truncate max-w-[220px]" title={job?.project?.name || order.quotation?.quotationNumber || "-"}>
                            {job?.project?.name || `QT: ${order.quotation?.quotationNumber || "-"}`}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-slate-500 font-mono">
                              ฝ่ายขาย: {order.salesperson?.fullName || "ไม่ระบุ"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {order.productionDeadline ? `ส่งมอบ: ${formatDateThai(order.productionDeadline)}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Line: Status Tags & PR/PO Count */}
                        <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between gap-2 text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                              สถานะ: {order.status || "รอเปิด PO"}
                            </span>
                            <span className="bg-purple-50 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                              QC: {order.qcStatus || "PENDING"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-slate-500">
                            <span>PR: {order.purchaseRequests?.length || 0}</span>
                            <span>•</span>
                            <span className="text-slate-400 truncate">{rag.subLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Bottom Card: Production Bottleneck Radar & Overdue Control */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {overdueOrders.length > 0 ? (
                    <AlertTriangle size={15} className="text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  )}
                  <h2 className="text-xs font-bold text-slate-900 truncate">
                    {overdueOrders.length > 0
                      ? "เรดาร์ตรวจจับงานเกินกำหนด & คอขวด (Bottleneck Radar)"
                      : "กำหนดส่งมอบงานประกอบตู้ (Production Delivery Schedule)"}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono shrink-0 ${
                      overdueOrders.length > 0
                        ? "text-red-700 bg-red-50 border-red-200"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    {overdueOrders.length > 0
                      ? `เกินกำหนด ${overdueOrders.length} คำสั่งผลิต`
                      : "ส่งมอบตรงเวลา 100%"}
                  </span>
                </div>
              </div>

              {/* Overdue Orders or Clean Delivery Health Banner */}
              {overdueOrders.length === 0 ? (
                <div className="flex-1 min-h-0 flex flex-col justify-between py-1 space-y-1.5 overflow-hidden">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-emerald-950 block leading-tight">
                        คำสั่งผลิตทั้งหมดตรงตามกำหนดเวลา 100% ({periodLabel})
                      </span>
                      <span className="text-[9px] text-emerald-700 block leading-tight">
                        ไม่มีงานผลิตค้างเกินกำหนด • แสดงรายการคำสั่งผลิตที่ต้องเฝ้าระวังคอขวดรอเปิด PO
                      </span>
                    </div>
                  </div>

                  {/* Pending PO Bottleneck Quick Watchlist */}
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pb-1 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-amber-600" />
                        <span>คำสั่งผลิตที่ติดค้างรอเปิด PO (Pending PO Queue)</span>
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">มูลค่างานที่รอจัดซื้อ</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                      {pendingPoOrders.slice(0, 5).map((o) => (
                        <div
                          key={o.id}
                          onClick={() => setDetailOrder(o)}
                          className="p-1.5 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:border-amber-300 hover:bg-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-slate-900 font-mono text-[10px]">
                                {o.orderNumber}
                              </span>
                              <span className="text-[11px] font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                                {o.quotation?.jobs?.[0]?.customerName || o.company?.companyName || "ไม่ระบุลูกค้า"}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-amber-700 font-mono shrink-0">
                              {formatCurrency(o.value)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
                            <span className="truncate max-w-[200px]">
                              {o.quotation?.jobs?.[0]?.project?.name || `QT: ${o.quotation?.quotationNumber || "-"}`}
                            </span>
                            <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              รอเปิด PO
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {overdueOrders.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setDetailOrder(o)}
                      className="p-2 rounded-xl border border-red-300 bg-red-50/50 hover:bg-red-50/80 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-900 font-mono text-[10px]">
                            {o.orderNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                            {o.quotation?.jobs?.[0]?.customerName || o.company?.companyName || "ไม่ระบุลูกค้า"}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono bg-red-600 text-white shadow-2xs">
                          เกินกำหนด +{o.daysOverdue} วัน
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[9px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">
                            กำหนดส่งมอบ: <strong className="text-slate-800">{formatDateThai(o.productionDeadline)}</strong>
                          </span>
                          <span className="font-black text-red-600 font-mono">
                            {formatCurrency(o.value)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-mono">
                            ฝ่ายขาย: {o.salesperson?.fullName || "ไม่ระบุ"}
                          </span>
                          <span className="font-bold text-red-600 bg-white border border-red-200 px-1.5 py-0.2 rounded-md shadow-2xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                            เร่งรัดผลิต
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        /* ── EXPANDED REPORT VIEW ── */
        <main className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                รายงานภาพรวมงานผลิตตู้ทั้งหมดแบบขยายเต็ม ({periodLabel})
              </h2>
              <p className="text-xs text-slate-500">วิเคราะห์ขั้นตอนการผลิต คุณภาพ QC และการจัดสรรทรัพยากรช่างประกอบ</p>
            </div>
            <button
              onClick={onViewOperational}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Table size={14} />
              <span>เปิดแดชบอร์ดช่างโรงงาน (Operational Workshop)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Layers size={16} className="text-red-600" />
                การกระจายมูลค่าตามขั้นตอนการผลิต ({periodLabel})
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => formatSmart(v)} />
                    <RechartsTooltip />
                    <Bar dataKey={stageMetric} name={stageMetric === "value" ? "มูลค่าสัญญา" : "จำนวนงาน"} radius={[6, 6, 0, 0]}>
                      {stageBreakdown.map((entry, index) => (
                        <Cell key={`cell-exp-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Award size={16} className="text-red-600" />
                คำสั่งผลิตมูลค่าสูงสุด (Top 5 Orders)
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-56 custom-scrollbar pr-1">
                {filteredStrategicOrders.slice(0, 5).map((o, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-900 block truncate">{o.orderNumber}</span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {o.quotation?.jobs?.[0]?.customerName || o.company?.companyName || "-"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-red-600 shrink-0">{formatCurrency(o.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── Executive Order Detail Modal ── */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold shrink-0">
                  {detailOrder.orderNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {detailOrder.quotation?.jobs?.[0]?.customerName || detailOrder.company?.companyName || "รายละเอียดคำสั่งผลิต"}
                </h3>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Project & Quotation Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">โครงการ / งาน</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {detailOrder.quotation?.jobs?.[0]?.project?.name || detailOrder.quotation?.jobs?.[0]?.jobNumber || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ใบเสนอราคา (Quotation)</span>
                  <span className="font-bold text-slate-900 block font-mono truncate">
                    {detailOrder.quotation?.quotationNumber || "-"}
                  </span>
                </div>
              </div>

              {/* Financial & Production Snapshot */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 text-center">
                  <span className="text-[9px] text-red-600 block font-semibold">มูลค่างานผลิต</span>
                  <span className="text-sm font-black text-slate-900 font-mono block">
                    {formatCurrency(detailOrder.value)}
                  </span>
                </div>
                <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 text-center">
                  <span className="text-[9px] text-purple-700 block font-semibold">สถานะ QC</span>
                  <span className="text-sm font-black text-purple-900 font-mono block">
                    {detailOrder.qcStatus || "PENDING"}
                  </span>
                </div>
                <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                  <span className="text-[9px] text-blue-700 block font-semibold">จำนวนตู้</span>
                  <span className="text-sm font-black text-slate-900 font-mono block">
                    {detailOrder.cabinetCount || 1} ตู้
                  </span>
                </div>
              </div>

              {/* Purchase Requests & Orders */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  รายการจัดซื้อที่เชื่อมโยง (Linked PR / PO)
                </span>
                {detailOrder.purchaseRequests && detailOrder.purchaseRequests.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {detailOrder.purchaseRequests.map((pr: any) => (
                      <div key={pr.id} className="bg-white p-2 rounded-xl border border-slate-200 text-[10px] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900 font-mono">{pr.prNumber}</span>
                          <span className="text-slate-400 block text-[9px]">{pr.projectName || "อุปกรณ์ประกอบตู้"}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">
                          PO: {pr.purchaseOrders?.length || 0} ฉบับ
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-[10px] text-slate-400">ยังไม่มีการเปิด PR/PO ในคำสั่งผลิตนี้</div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">วันที่เริ่มบันทึก:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatDateThai(detailOrder.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">กำหนดเสร็จ (Deadline):</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatDateThai(detailOrder.productionDeadline)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] text-slate-400">
                สถานะปัจจุบัน: <strong className="text-slate-800">{detailOrder.status || "รอเปิด PO"}</strong>
              </span>
              <button
                onClick={() => setDetailOrder(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
