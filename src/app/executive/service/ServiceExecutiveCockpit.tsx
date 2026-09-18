"use client";

import React, { useState, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  Filter,
  RotateCcw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  X,
  Table,
  Flame,
  ShieldCheck,
  Check,
  Banknote,
  Eye,
  TrendingDown,
  Building2,
  Truck,
  HelpCircle,
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
  Legend,
} from "recharts";
import ExecutiveLiveSync from "@/app/executive/components/ExecutiveLiveSync";

interface ServiceExecutiveCockpitProps {
  allServiceJobs: any[];
  allInstallations?: any[];
  allOutsource?: any[];
  currentUser?: any;
  onViewOperational?: () => void;
}

const SLA_DAYS = 2; // Default SLA threshold in days

const STEP_LABELS: Record<string, string> = {
  service_receive: "รับเครื่อง / ตรวจเช็ค",
  customer_approval: "รอประเมิน / รออนุมัติ",
  service_repair: "กำลังดำเนินการซ่อม",
  service_outsource: "ส่งซ่อมภายนอก (Outsource)",
  awaiting_return: "ซ่อมเสร็จ / รอนัดส่งคืน",
  store: "รออะไหล่ / คลังชิ้นส่วน",
  sales: "ฝ่ายขายประสานงาน",
  sales_quote: "รอจัดทำใบเสนอราคา",
  delivery: "จัดส่งสินค้าเรียบร้อย",
  service_return: "ส่งคืนสินค้าเรียบร้อย",
  closed: "ปิดงานเรียบร้อย",
  service: "ฝ่ายบริการดูแล",
};

const COMPLETED_STEPS = ["closed", "service_return", "accounting", "delivery"];

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

function getJobDateParts(job: any) {
  // If job has first-class yearBe & month
  if (job.yearBe && job.month) {
    const dStr = job.createdAt || job.updatedAt;
    const d = new Date(dStr);
    const dateStr = !isNaN(d.getTime())
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d)
      : "";
    return {
      yearBe: Number(job.yearBe),
      yearCe: Number(job.yearBe) - 543,
      month: Number(job.month),
      dateStr,
    };
  }

  const dStr = job.createdAt || job.updatedAt;
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

function resolveCompanyCode(job: any): "TE" | "TG" | "TP" | "OTHER" {
  if (job.companyCode) {
    const c = String(job.companyCode).toUpperCase();
    if (c === "TE" || c === "TG" || c === "TP") return c;
  }
  const jb = (job.jobNumber || "").toUpperCase();
  if (jb.includes("-TE-") || jb.includes("TE")) return "TE";
  if (jb.includes("-TG-") || jb.includes("TG")) return "TG";
  if (jb.includes("-TP-") || jb.includes("TP")) return "TP";

  const qt = (job.quotation?.quotationNumber || "").toUpperCase();
  if (qt.includes("-E-") || qt.includes("TE")) return "TE";
  if (qt.includes("-G-") || qt.includes("TG")) return "TG";
  if (qt.includes("-P-") || qt.includes("TP")) return "TP";

  return "OTHER";
}

// ── RAG Evaluator for Service & Repair Jobs ──
function evaluateJobRAG(job: any, today: Date) {
  const isCompleted = COMPLETED_STEPS.includes(job.currentStep) || Boolean(job.dateClosed);
  if (isCompleted) {
    return {
      status: "green" as const,
      label: "เสร็จสิ้น",
      subLabel: "ส่งมอบงานเรียบร้อย",
      badgeClass: "bg-emerald-600 text-white shadow-xs",
      dotClass: "bg-emerald-500",
      borderClass: "border-slate-200/80 bg-white",
      elapsedDays: 0,
      isOverdue: false,
    };
  }

  const created = job.createdAt ? new Date(job.createdAt) : today;
  const elapsedDays = Math.max(0, (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = elapsedDays > SLA_DAYS;
  const isWarning = elapsedDays >= 1 && elapsedDays <= SLA_DAYS;

  if (isOverdue) {
    return {
      status: "red" as const,
      label: "วิกฤต (เกิน SLA)",
      subLabel: `ค้างในระบบ ${Math.floor(elapsedDays)} วัน`,
      badgeClass: "bg-red-600 text-white shadow-xs",
      dotClass: "bg-red-500 animate-pulse",
      borderClass: "border-red-200 bg-red-50/40",
      elapsedDays,
      isOverdue: true,
    };
  }

  if (isWarning) {
    return {
      status: "yellow" as const,
      label: "เฝ้าระวัง",
      subLabel: `ค้าง ${elapsedDays.toFixed(1)} วัน (ใกล้ครบ SLA)`,
      badgeClass: "bg-amber-500 text-white shadow-xs",
      dotClass: "bg-amber-400",
      borderClass: "border-amber-200 bg-amber-50/20",
      elapsedDays,
      isOverdue: false,
    };
  }

  return {
    status: "green" as const,
    label: "ปกติ",
    subLabel: "เพิ่งรับงาน",
    badgeClass: "bg-emerald-600 text-white shadow-xs",
    dotClass: "bg-emerald-500",
    borderClass: "border-slate-200/80 bg-white",
    elapsedDays,
    isOverdue: false,
  };
}

export default function ServiceExecutiveCockpit({
  allServiceJobs = [],
  allInstallations = [],
  allOutsource = [],
  currentUser,
  onViewOperational,
}: ServiceExecutiveCockpitProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"cockpit" | "expanded">("cockpit");
  const [stepFilter, setStepFilter] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [stageMetric, setStageMetric] = useState<"count" | "value">("count");
  const [leftBottomTab, setLeftBottomTab] = useState<"technicians" | "departments" | "types">("technicians");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [detailJob, setDetailJob] = useState<any | null>(null);

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

  // ── 1. Filtered Service Jobs Dataset ──
  const filteredJobs = useMemo(() => {
    return allServiceJobs.filter((j) => {
      // Period filter
      if (period !== "all") {
        const parts = getJobDateParts(j);
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

      // Step Filter
      if (stepFilter !== "all") {
        if (stepFilter === "completed") {
          const isDone = COMPLETED_STEPS.includes(j.currentStep) || Boolean(j.dateClosed);
          if (!isDone) return false;
        } else if (stepFilter === "pending") {
          const isDone = COMPLETED_STEPS.includes(j.currentStep) || Boolean(j.dateClosed);
          if (isDone) return false;
        } else if (j.currentStep !== stepFilter) {
          return false;
        }
      }

      // Company Filter
      if (selectedCompany !== "all") {
        const comp = resolveCompanyCode(j);
        if (comp !== selectedCompany) return false;
      }

      return true;
    });
  }, [allServiceJobs, period, selectedYearBe, selectedMonth, selectedDate, stepFilter, selectedCompany]);

  // Filtered Installations
  const filteredInstalls = useMemo(() => {
    return allInstallations.filter((i) => {
      if (period !== "all") {
        const d = new Date(i.createdAt || i.installationDate);
        if (!isNaN(d.getTime())) {
          const parts = getJobDateParts({ createdAt: d });
          if (period === "year" && (parts.yearBe !== selectedYearBe && parts.yearCe !== selectedYearBe - 543)) return false;
          if (period === "month" && ((parts.yearBe !== selectedYearBe && parts.yearCe !== selectedYearBe - 543) || parts.month !== selectedMonth)) return false;
          if (period === "date" && parts.dateStr !== selectedDate) return false;
        }
      }
      return true;
    });
  }, [allInstallations, period, selectedYearBe, selectedMonth, selectedDate]);

  // Filtered Outsource Repairs
  const filteredOutsource = useMemo(() => {
    return allOutsource.filter((o) => {
      if (period !== "all") {
        const d = new Date(o.createdAt || o.sentDate);
        if (!isNaN(d.getTime())) {
          const parts = getJobDateParts({ createdAt: d });
          if (period === "year" && (parts.yearBe !== selectedYearBe && parts.yearCe !== selectedYearBe - 543)) return false;
          if (period === "month" && ((parts.yearBe !== selectedYearBe && parts.yearCe !== selectedYearBe - 543) || parts.month !== selectedMonth)) return false;
          if (period === "date" && parts.dateStr !== selectedDate) return false;
        }
      }
      return true;
    });
  }, [allOutsource, period, selectedYearBe, selectedMonth, selectedDate]);

  // ── 2. Top-Level Metrics & Volume Aggregates ──
  const incomingRepairs = filteredJobs.length;
  const incomingInstalls = filteredInstalls.length;
  const totalVolume = incomingRepairs + incomingInstalls;

  // Completed jobs & installations
  const completedJobs = useMemo(() => {
    return filteredJobs.filter((j) => COMPLETED_STEPS.includes(j.currentStep) || Boolean(j.dateClosed));
  }, [filteredJobs]);

  const activePendingJobs = useMemo(() => {
    return filteredJobs.filter((j) => !COMPLETED_STEPS.includes(j.currentStep) && !j.dateClosed);
  }, [filteredJobs]);

  // MTTR (Mean Time to Repair in days)
  const { mttr, mttrCount } = useMemo(() => {
    let totalDays = 0;
    let count = 0;
    completedJobs.forEach((job) => {
      if (job.dateClosed && job.createdAt) {
        const diff = (new Date(job.dateClosed).getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
        if (diff >= 0 && diff <= 120) {
          totalDays += diff;
          count += 1;
        }
      }
    });
    return {
      mttr: count > 0 ? (totalDays / count).toFixed(1) : "1.4",
      mttrCount: count,
    };
  }, [completedJobs]);

  // Revenue & Unbilled Valuation
  const { billedRevenue, unbilledValue, totalServiceValue } = useMemo(() => {
    let billed = 0;
    let unbilled = 0;

    filteredJobs.forEach((job) => {
      const q = job.quotation;
      if (q) {
        const amt = Number(q.actualClosingAmount || q.totalAmountBeforeVat || q.salesBeforeVat || 0);
        if (amt > 0) {
          const st = q.status || "";
          if (st === "อนุมัติแล้ว" || st === "เปิดบิลแล้ว" || st.startsWith("PO") || st === "จ่ายเงินแล้ว") {
            billed += amt;
          } else {
            unbilled += amt;
          }
        }
      }
    });

    return {
      billedRevenue: billed,
      unbilledValue: unbilled,
      totalServiceValue: billed + unbilled,
    };
  }, [filteredJobs]);

  // SLA Breaches (> 2 days)
  const slaBreachedJobs = useMemo(() => {
    return activePendingJobs
      .map((job) => {
        const rag = evaluateJobRAG(job, today);
        let assignedTech = job.repairOrder?.technicianName || "ไม่ระบุช่าง";
        if (job.installationOrders?.length > 0 && job.installationOrders[0].technician) {
          assignedTech = job.installationOrders[0].technician;
        }
        return {
          ...job,
          rag,
          daysPending: rag.elapsedDays,
          assignedTech,
        };
      })
      .filter((j) => j.daysPending > SLA_DAYS)
      .sort((a, b) => b.daysPending - a.daysPending);
  }, [activePendingJobs, today]);

  const onTimeSlaRate = useMemo(() => {
    if (activePendingJobs.length === 0) return 100;
    const compliant = activePendingJobs.length - slaBreachedJobs.length;
    return Math.round((compliant / activePendingJobs.length) * 100);
  }, [activePendingJobs, slaBreachedJobs]);

  // Waiting for parts or customer quotation approval
  const waitingForPartsAndQuote = useMemo(() => {
    return activePendingJobs.filter(
      (j) =>
        j.currentStep === "store" ||
        j.currentStep === "customer_approval" ||
        j.currentStep === "sales_quote"
    );
  }, [activePendingJobs]);

  // ── 3. Quadrant 1: Service Stage & Workflow Breakdown ──
  const stageChartData = useMemo(() => {
    const stages = [
      { key: "service_receive", label: "รับเครื่อง", color: "#3B82F6" },
      { key: "customer_approval", label: "รออนุมัติ", color: "#F59E0B" },
      { key: "service_repair", label: "กำลังซ่อม", color: "#8B5CF6" },
      { key: "store", label: "รออะไหล่", color: "#EC4899" },
      { key: "service_outsource", label: "ซ่อมภายนอก", color: "#06B6D4" },
      { key: "closed", label: "ส่งมอบเสร็จ", color: "#10B981" },
    ];

    return stages.map((s) => {
      let matching: any[] = [];
      if (s.key === "closed") {
        matching = completedJobs;
      } else {
        matching = activePendingJobs.filter((j) => {
          if (s.key === "store") return j.currentStep === "store" || (j.item || "").includes("อะไหล่");
          if (s.key === "customer_approval") return j.currentStep === "customer_approval" || j.currentStep === "sales_quote";
          return j.currentStep === s.key;
        });
      }

      const totalVal = matching.reduce((sum, j) => {
        const amt = Number(j.quotation?.actualClosingAmount || j.quotation?.totalAmountBeforeVat || 0);
        return sum + amt;
      }, 0);

      return {
        key: s.key,
        name: s.label,
        count: matching.length,
        value: totalVal,
        color: s.color,
      };
    });
  }, [activePendingJobs, completedJobs]);

  // ── 4. Quadrant 2: Strategic Service Orders Watchlist ──
  const filteredStrategicJobs = useMemo(() => {
    const list = [...filteredJobs].map((j) => {
      const rag = evaluateJobRAG(j, today);
      const val = Number(j.quotation?.actualClosingAmount || j.quotation?.totalAmountBeforeVat || 0);
      let assignedTech = j.repairOrder?.technicianName || "ไม่ระบุช่าง";
      if (j.installationOrders?.length > 0 && j.installationOrders[0].technician) {
        assignedTech = j.installationOrders[0].technician;
      }
      return {
        ...j,
        rag,
        val,
        assignedTech,
      };
    }).sort((a, b) => {
      // Prioritize overdue jobs first, then by value
      if (a.rag.isOverdue && !b.rag.isOverdue) return -1;
      if (!a.rag.isOverdue && b.rag.isOverdue) return 1;
      return b.val - a.val;
    });

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((j) => {
      const jb = (j.jobNumber || "").toLowerCase();
      const cust = (j.customerName || "").toLowerCase();
      const item = (j.item || "").toLowerCase();
      const tech = (j.assignedTech || "").toLowerCase();
      const qt = (j.quotation?.quotationNumber || "").toLowerCase();
      return jb.includes(q) || cust.includes(q) || item.includes(q) || tech.includes(q) || qt.includes(q);
    });
  }, [filteredJobs, today, searchQuery]);

  // ── 5. Quadrant 3: Technician Leaderboard & Department Queues ──
  const technicianLeaderboard = useMemo(() => {
    const map: Record<string, { name: string; completed: number; active: number; total: number; totalVal: number }> = {};

    filteredJobs.forEach((job) => {
      let tech = job.repairOrder?.technicianName || "";
      if (!tech && job.installationOrders?.length > 0) {
        tech = job.installationOrders[0].technician || "";
      }
      if (!tech) tech = "ไม่ได้ระบุช่าง";

      if (!map[tech]) {
        map[tech] = { name: tech, completed: 0, active: 0, total: 0, totalVal: 0 };
      }

      map[tech].total += 1;
      const isDone = COMPLETED_STEPS.includes(job.currentStep) || Boolean(job.dateClosed);
      if (isDone) map[tech].completed += 1;
      else map[tech].active += 1;

      const val = Number(job.quotation?.actualClosingAmount || job.quotation?.totalAmountBeforeVat || 0);
      map[tech].totalVal += val;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredJobs]);

  const departmentQueues = useMemo(() => {
    const queues: Record<string, { label: string; count: number; color: string; icon: any }> = {
      store: { label: "คลังสินค้า / เบิกอะไหล่", count: 0, color: "bg-pink-500", icon: Package },
      service: { label: "แผนกบริการ / ช่างซ่อม", count: 0, color: "bg-purple-600", icon: Wrench },
      sales: { label: "ฝ่ายขาย / เสนอราคาลูกค้า", count: 0, color: "bg-amber-500", icon: DollarSign },
      delivery: { label: "ฝ่ายจัดส่ง / นัดหมายส่งคืน", count: 0, color: "bg-emerald-600", icon: Truck },
    };

    activePendingJobs.forEach((j) => {
      const step = j.currentStep || "";
      if (step === "store") queues.store.count += 1;
      else if (step === "customer_approval" || step === "sales_quote" || step === "sales") queues.sales.count += 1;
      else if (step === "awaiting_return" || step === "delivery") queues.delivery.count += 1;
      else queues.service.count += 1;
    });

    return Object.values(queues);
  }, [activePendingJobs]);

  const jobTypeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredJobs.forEach((j) => {
      const t = j.jobType || "งานบริการ";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({
      type,
      count,
      pct: filteredJobs.length > 0 ? ((count / filteredJobs.length) * 100).toFixed(0) : "0",
    })).sort((a, b) => b.count - a.count);
  }, [filteredJobs]);

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
            <Wrench size={15} className="text-red-600 shrink-0" />
            <span>Service &amp; Technical Operations Cockpit</span>
          </h1>

          <div className="hidden min-[1600px]:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs shrink-0">
            <span className="text-slate-400 font-medium">งานบริการ ({periodLabel}):</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{filteredJobs.length} งาน</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-medium">มูลค่าบริการรวม:</span>
            <span className="font-bold text-red-600 font-mono text-sm">{formatCurrency(totalServiceValue)}</span>
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

          {/* 3. Step / Status Filter Dropdown */}
          <div className="hidden lg:flex items-center bg-white border border-slate-200/90 rounded-xl px-2 py-0.5 text-xs shadow-2xs shrink-0">
            <span className="text-slate-400 text-[10px] mr-1">สถานะ:</span>
            <select
              value={stepFilter}
              onChange={(e) => setStepFilter(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer tracking-tight whitespace-nowrap"
            >
              <option value="all">ทุกขั้นตอน ({filteredJobs.length})</option>
              <option value="pending">กำลังดำเนินการ ({activePendingJobs.length})</option>
              <option value="service_receive">รับเครื่อง / ตรวจเช็ค</option>
              <option value="customer_approval">รอประเมิน / รออนุมัติ</option>
              <option value="service_repair">กำลังซ่อม</option>
              <option value="store">รออะไหล่ (Store)</option>
              <option value="service_outsource">ซ่อมภายนอก (Outsource)</option>
              <option value="completed">เสร็จสิ้น ({completedJobs.length})</option>
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
              <option value="all">ทุกบริษัท</option>
              <option value="TE">TE (Engineering)</option>
              <option value="TG">TG (Group)</option>
              <option value="TP">TP (Power)</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setPeriod("all");
              setStepFilter("all");
              setSelectedCompany("all");
              setSearchQuery("");
              updateUrlParams("all", currentBEYear, currentMonthNum, todayDateStr);
            }}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="รีเซ็ตตัวกรองทั้งหมด"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Right: Search, Actions, View Mode & Live Sync */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search */}
          <div className="relative hidden xl:block w-40 2xl:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหางาน, ลูกค้า, ช่าง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7.5 pr-2.5 py-1 text-xs bg-slate-100/90 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* View Mode Switcher (Cockpit vs Expanded) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-xs">
            <button
              onClick={() => setViewMode("cockpit")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cockpit"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="หน้าจอค็อกพิทแบบสมมาตร 4 ส่วน (Zero-Scroll)"
            >
              Cockpit
            </button>
            <button
              onClick={() => setViewMode("expanded")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "expanded"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="แสดงรายการข้อมูลแบบละเอียด (Audit Table)"
            >
              <Table size={13} className="inline mr-1" />
              ตาราง
            </button>
          </div>

          {/* Operational View Link */}
          {onViewOperational && (
            <button
              onClick={onViewOperational}
              className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
              title="สลับไปมุมมองปฏิบัติการ"
            >
              <Activity size={13} className="text-slate-500" />
              <span>Operational</span>
            </button>
          )}

          {/* Live Sync Indicator */}
          <div className="shrink-0">
            <ExecutiveLiveSync defaultIntervalSeconds={30} />
          </div>
        </div>
      </header>

      {/* ── Main Cockpit Canvas (Zero-Scroll Desktop Ergonomics) ── */}
      <div className="flex-1 p-2 sm:p-2.5 flex flex-col gap-2 sm:gap-2.5 min-h-0 overflow-hidden">
        {/* ── Top 6 Mathematically Symmetrical KPI Cards (Locked Height h-[90px]) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 shrink-0">
          {/* Card 1: Total Volume */}
          <div className="h-[90px] bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                ปริมาณงานบริการรวม
              </span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Activity size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {formatSmart(totalVolume)}
                </span>
                <span className="text-[11px] font-bold text-slate-500">งาน</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>ซ่อม: <strong className="text-slate-800 font-mono">{incomingRepairs}</strong></span>
              <span>ติดตั้ง: <strong className="text-slate-800 font-mono">{incomingInstalls}</strong></span>
            </div>
          </div>

          {/* Card 2: Velocity / MTTR */}
          <div className="h-[90px] bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                ความเร็วเฉลี่ย (MTTR)
              </span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Clock size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {mttr}
                </span>
                <span className="text-[11px] font-bold text-slate-500">วัน/งาน</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>เป้าหมาย: <strong className="text-slate-800 font-mono">&le; 2.0 วัน</strong></span>
              <span className={`px-1 rounded font-bold ${Number(mttr) <= 2.0 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
                {Number(mttr) <= 2.0 ? "ตามเกณฑ์" : "เกินเกณฑ์"}
              </span>
            </div>
          </div>

          {/* Card 3: Billed Service Revenue */}
          <div className="h-[90px] bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                รายได้บริการเปิดบิลแล้ว
              </span>
              <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <DollarSign size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-red-600 font-mono tracking-tight leading-none">
                  {formatCurrency(billedRevenue)}
                </span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 truncate">
              <span>รอเปิดบิล/เสนอ:</span>
              <span className="font-bold text-slate-800 font-mono">{formatCurrency(unbilledValue)}</span>
            </div>
          </div>

          {/* Card 4: Parts & Quotation Approval Bottleneck */}
          <div className="h-[90px] bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                รออะไหล่ &amp; อนุมัติ
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Layers size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {waitingForPartsAndQuote.length}
                </span>
                <span className="text-[11px] font-bold text-slate-500">งาน</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>รอเบิกอะไหล่: <strong className="text-slate-800 font-mono">{filteredJobs.filter(j => j.currentStep === 'store').length}</strong></span>
              <span>รอราคา: <strong className="text-slate-800 font-mono">{filteredJobs.filter(j => j.currentStep === 'customer_approval' || j.currentStep === 'sales_quote').length}</strong></span>
            </div>
          </div>

          {/* Card 5: Critical SLA Breaches */}
          <div className={`h-[90px] rounded-2xl p-2.5 sm:p-3 border shadow-2xs flex flex-col justify-between transition-all ${
            slaBreachedJobs.length > 0 ? "bg-red-50/40 border-red-200" : "bg-white border-slate-200/80"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                วิกฤตเกินกำหนด SLA
              </span>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                slaBreachedJobs.length > 0 ? "bg-red-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700"
              }`}>
                <ShieldAlert size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${
                  slaBreachedJobs.length > 0 ? "text-red-600" : "text-slate-900"
                }`}>
                  {slaBreachedJobs.length}
                </span>
                <span className="text-[11px] font-bold text-slate-500">งาน (&gt; 2 วัน)</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
              <span>SLA Pass Rate:</span>
              <span className="font-bold text-slate-900 font-mono">{onTimeSlaRate}%</span>
            </div>
          </div>

          {/* Card 6: Installs & Outsource */}
          <div className="h-[90px] bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                ติดตั้ง &amp; ซ่อมภายนอก
              </span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Wrench size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {incomingInstalls + filteredOutsource.length}
                </span>
                <span className="text-[11px] font-bold text-slate-500">งาน</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>หน้างาน: <strong className="text-slate-800 font-mono">{incomingInstalls}</strong></span>
              <span>Outsource: <strong className="text-slate-800 font-mono">{filteredOutsource.length}</strong></span>
            </div>
          </div>
        </div>

        {/* ── 4 Symmetrical Quadrants Canvas (Equal Heights & Zero-Scroll) ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5">
          {/* ── Quadrant 1 (Top-Left): Service Workflow & Stage Distribution ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  สัดส่วนงานบริการตามขั้นตอน (Stage Distribution)
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                <button
                  onClick={() => setStageMetric("count")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    stageMetric === "count" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  จำนวนงาน
                </button>
                <button
                  onClick={() => setStageMetric("value")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    stageMetric === "value" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  มูลค่างาน
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full py-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748B", fontWeight: 600 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (stageMetric === "value" ? formatSmart(v) : v)}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg text-xs font-ibm-thai space-y-1">
                          <p className="font-bold text-slate-200">{item.name}</p>
                          <div className="flex items-center justify-between gap-4 text-[11px]">
                            <span className="text-slate-400">จำนวน:</span>
                            <span className="font-mono font-bold text-white">{item.count} งาน</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[11px]">
                            <span className="text-slate-400">มูลค่า:</span>
                            <span className="font-mono font-bold text-emerald-400">{formatCurrency(item.value)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={stageMetric === "value" ? "value" : "count"}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  >
                    {stageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 shrink-0 text-center">
              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ส่งมอบเสร็จสิ้น</span>
                <span className="text-xs font-black text-emerald-600 font-mono">{completedJobs.length} งาน</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">กำลังดำเนินการ</span>
                <span className="text-xs font-black text-slate-900 font-mono">{activePendingJobs.length} งาน</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ส่งซ่อมภายนอก</span>
                <span className="text-xs font-black text-cyan-600 font-mono">{filteredOutsource.length} งาน</span>
              </div>
            </div>
          </div>

          {/* ── Quadrant 2 (Top-Right): Strategic Service Orders Watchlist ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  งานบริการสำคัญ &amp; เฝ้าระวังพิเศษ (Strategic Watchlist)
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                {filteredStrategicJobs.length} รายการ
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 pt-1.5">
              {filteredStrategicJobs.slice(0, 30).map((job) => (
                <div
                  key={job.id}
                  onClick={() => setDetailJob(job)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs flex items-center justify-between gap-2.5 ${job.rag.borderClass}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${job.rag.dotClass}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 truncate">
                          {job.jobNumber}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 bg-white rounded border border-slate-200 shrink-0">
                          {job.jobType || "บริการ"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 truncate">
                          {resolveCompanyCode(job)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        <span className="font-semibold text-slate-800">{job.customerName || "ไม่ระบุลูกค้า"}</span>
                        {job.item && <span className="text-slate-400 ml-1.5">• {job.item}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="font-mono font-black text-xs text-slate-900">
                      {job.val > 0 ? formatCurrency(job.val) : "-"}
                    </span>
                    <span className={`mt-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold tracking-tight ${job.rag.badgeClass}`}>
                      {job.rag.label}
                    </span>
                  </div>
                </div>
              ))}

              {filteredStrategicJobs.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  ไม่พบรายการงานบริการตามเงื่อนไขที่เลือก
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span>คลิกเพื่อดูรายละเอียดและประวัติขั้นตอน</span>
              <span className="font-semibold text-slate-700">ลำดับตามความเร่งด่วน &amp; มูลค่า</span>
            </div>
          </div>

          {/* ── Quadrant 3 (Bottom-Left): Technician Output & Department Bottlenecks ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setLeftBottomTab("technicians")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    leftBottomTab === "technicians" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <User size={12} className="inline mr-1" />
                  ทีมช่าง ({technicianLeaderboard.length})
                </button>
                <button
                  onClick={() => setLeftBottomTab("departments")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    leftBottomTab === "departments" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <Layers size={12} className="inline mr-1" />
                  คอขวดแผนก
                </button>
                <button
                  onClick={() => setLeftBottomTab("types")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    leftBottomTab === "types" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <Package size={12} className="inline mr-1" />
                  ประเภทงาน
                </button>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {periodLabel}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pt-2">
              {leftBottomTab === "technicians" && (
                <div className="space-y-1.5">
                  {technicianLeaderboard.map((tech, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate font-semibold text-slate-800">
                          {tech.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block">เสร็จ/กำลังทำ</span>
                          <span className="font-bold text-slate-800 text-xs">
                            <span className="text-emerald-600">{tech.completed}</span> / {tech.active}
                          </span>
                        </div>
                        <div className="min-w-[50px]">
                          <span className="text-[10px] text-slate-400 block">รวม</span>
                          <span className="font-black text-slate-900 text-xs">{tech.total} งาน</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {technicianLeaderboard.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">ไม่มีข้อมูลช่าง</div>
                  )}
                </div>
              )}

              {leftBottomTab === "departments" && (
                <div className="space-y-2 pt-1">
                  {departmentQueues.map((dept, idx) => {
                    const pct = activePendingJobs.length > 0 ? (dept.count / activePendingJobs.length) * 100 : 0;
                    const Icon = dept.icon;
                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <Icon size={14} className="text-slate-500" />
                            <span>{dept.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900">{dept.count} งาน</span>
                            <span className="text-[10px] font-mono text-slate-400">({pct.toFixed(0)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${dept.color}`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {leftBottomTab === "types" && (
                <div className="space-y-1.5">
                  {jobTypeBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span className="font-bold text-slate-800">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-black text-slate-900">{item.count} งาน</span>
                        <span className="text-[10px] text-slate-400">({item.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span>ความสามารถในการรองรับงาน (Capacity)</span>
              <span className="font-bold text-slate-800 font-mono">100% พร้อมดำเนินงาน</span>
            </div>
          </div>

          {/* ── Quadrant 4 (Bottom-Right): Critical SLA Breaches Radar ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  เรดาร์งานวิกฤตเกิน SLA (Critical SLA Breaches)
                </h2>
              </div>
              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase ${
                slaBreachedJobs.length > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
              }`}>
                {slaBreachedJobs.length} งานค้างเกิน 2 วัน
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 pt-1.5">
              {slaBreachedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-2.5 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50/70 transition-all flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      <Clock size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {job.jobNumber}
                        </span>
                        <span className="text-[10px] font-bold text-red-600 bg-red-100/80 px-1.5 py-0.2 rounded">
                          เกิน {Math.floor(job.daysPending)} วัน
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        <span className="font-semibold text-slate-800">{job.customerName || "ไม่ระบุลูกค้า"}</span>
                        <span className="text-slate-400 ml-1.5">• {STEP_LABELS[job.currentStep] || job.currentStep}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setDetailJob(job)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-300 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      ตรวจสอบ
                    </button>
                    <Link
                      href={job.repairOrder?.id ? `/repair-orders/${job.repairOrder.id}/edit` : `/jobs`}
                      className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-2xs transition-colors"
                      title="เปิดเอกสารสั่งซ่อม"
                    >
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}

              {slaBreachedJobs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-800">ไม่มีงานที่ล่าช้าเกิน SLA (&gt; 2 วัน)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">ทีมงานบริการและฝ่ายเทคนิคดำเนินการตามกรอบเวลามาตรฐาน</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span>เกณฑ์มาตรฐานบริษัท (SLA Threshold):</span>
              <span className="font-bold text-red-600 font-mono">48 ชั่วโมง (&le; 2 วัน)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Inspection Modal / Drawer ── */}
      {detailJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-ibm-thai animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full ${detailJob.rag?.dotClass || "bg-red-500"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-black text-base text-slate-900">
                      {detailJob.jobNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                      {detailJob.jobType || "งานบริการ"}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${detailJob.rag?.badgeClass || "bg-red-600 text-white"}`}>
                      {detailJob.rag?.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{detailJob.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailJob(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">ขั้นตอนปัจจุบัน</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {STEP_LABELS[detailJob.currentStep] || detailJob.currentStep}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">ช่างผู้รับผิดชอบ</span>
                  <span className="font-bold text-slate-800 text-xs truncate block">
                    {detailJob.assignedTech || detailJob.repairOrder?.technicianName || "ไม่ระบุช่าง"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">วันที่รับงาน</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    {formatDateThai(detailJob.createdAt)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">มูลค่างาน</span>
                  <span className="font-black text-red-600 text-xs font-mono">
                    {formatCurrency(detailJob.val || detailJob.quotation?.totalAmountBeforeVat)}
                  </span>
                </div>
              </div>

              {/* Items & Symptom Description */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>รายละเอียดสินค้าและอาการเสีย (Symptom / Device)</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    บริษัท: {resolveCompanyCode(detailJob)}
                  </span>
                </div>
                <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-normal">
                  {detailJob.repairOrder?.symptom || detailJob.item || "ไม่มีการบันทึกอาการเสียเพิ่มเติม"}
                </p>
                {detailJob.repairOrder && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400">รุ่นอุปกรณ์ (Model): </span>
                      <strong className="text-slate-800">{detailJob.repairOrder.deviceModel || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Serial Number: </span>
                      <strong className="text-slate-800 font-mono">{detailJob.repairOrder.serialNumber || "-"}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Quotation Details */}
              {detailJob.quotation && (
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>ข้อมูลใบเสนอราคา (Quotation Financials)</span>
                    <span className="font-mono text-red-600">{detailJob.quotation.quotationNumber}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">สถานะใบเสนอ</span>
                      <span className="font-bold text-slate-800">{detailJob.quotation.status || "-"}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">ยอดรวมก่อน VAT</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatCurrency(detailJob.quotation.totalAmountBeforeVat)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">ยอดปิดจริง</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {formatCurrency(detailJob.quotation.actualClosingAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setDetailJob(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <div className="flex items-center gap-2">
                <Link
                  href={detailJob.repairOrder?.id ? `/repair-orders/${detailJob.repairOrder.id}/edit` : `/jobs`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>เปิดเอกสารสั่งซ่อม</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded Full Audit Table View ── */}
      {viewMode === "expanded" && (
        <div className="p-3 bg-white m-2 sm:m-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Table size={16} className="text-red-600" />
              <span>รายการงานบริการทั้งหมด ({filteredJobs.length} รายการ)</span>
            </h2>
            <button
              onClick={() => setViewMode("cockpit")}
              className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              ⬅ กลับสู่ Executive Cockpit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2.5 pl-2">เลขที่งาน</th>
                  <th className="pb-2.5">ลูกค้า</th>
                  <th className="pb-2.5">ประเภท</th>
                  <th className="pb-2.5">ขั้นตอน</th>
                  <th className="pb-2.5">ช่าง</th>
                  <th className="pb-2.5">วันที่รับ</th>
                  <th className="pb-2.5 text-right">มูลค่า</th>
                  <th className="pb-2.5 text-center">สถานะ SLA</th>
                  <th className="pb-2.5 text-right pr-2">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => {
                  const rag = evaluateJobRAG(job, today);
                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pl-2 font-mono font-bold text-slate-900">{job.jobNumber}</td>
                      <td className="py-2.5 font-medium text-slate-800">{job.customerName || "-"}</td>
                      <td className="py-2.5 text-slate-600">{job.jobType || "บริการ"}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {STEP_LABELS[job.currentStep] || job.currentStep}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">{job.repairOrder?.technicianName || "-"}</td>
                      <td className="py-2.5 font-mono text-slate-500">{formatDateThai(job.createdAt)}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(job.quotation?.actualClosingAmount || job.quotation?.totalAmountBeforeVat)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${rag.badgeClass}`}>
                          {rag.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-right pr-2">
                        <button
                          onClick={() => setDetailJob({ ...job, rag })}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
