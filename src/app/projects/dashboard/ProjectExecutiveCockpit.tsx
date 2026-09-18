"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Building2,
  Wallet,
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RotateCcw,
  Maximize2,
  Monitor,
  CalendarDays,
  Layers,
  Award,
  Briefcase,
  ExternalLink,
  X,
  Table,
  Users,
  Percent,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Zap,
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
import { calculateProjectProgress } from "@/app/lib/project-utils";

interface ProjectExecutiveCockpitProps {
  projects: any[];
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

// Company code resolver from linked job or project number
function resolveCompanyCode(p: any): "TE" | "TG" | "TP" | "OTHER" {
  if (p.job?.companyCode) {
    const c = p.job.companyCode.toUpperCase();
    if (c === "TE" || c === "TG" || c === "TP") return c;
  }
  const jb = (p.jbNumber || p.job?.jobNumber || "").toUpperCase();
  if (jb.includes("-TE-") || jb.includes("TE")) return "TE";
  if (jb.includes("-TG-") || jb.includes("TG")) return "TG";
  if (jb.includes("-TP-") || jb.includes("TP")) return "TP";

  const num = (p.projectNumber || "").toUpperCase();
  if (num.includes("TE")) return "TE";
  if (num.includes("TG")) return "TG";
  if (num.includes("TP")) return "TP";
  return "OTHER";
}

const CATEGORY_COLORS: Record<string, string> = {
  "งานโซลาร์": "#e11d48", // crimson
  "งานตู้": "#2563eb", // blue
  "งานอาคาร": "#0d9488", // teal
  "งานติดตั้ง": "#d97706", // amber
  "งานวิศวกรรม": "#7c3aed", // violet
  "ทั่วไป": "#475569", // slate
  "อื่นๆ": "#64748b",
};

// ── RAG Status Evaluator ──
function evaluateProjectRAG(p: any, today: Date) {
  const end = p.endDate ? new Date(p.endDate) : null;
  const diffDays = end ? Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const isOverdue = diffDays < 0;
  const hasPenalty = Number(p.penaltyPerDay) > 0;

  const actualProgress = calculateProjectProgress(p);

  // Planned progress calculation based on timeline elapsed
  let plannedProgress = 0;
  const startDateStr = p.startDate || p.createdAt;
  if (startDateStr && p.endDate) {
    const s = new Date(startDateStr).getTime();
    const e = new Date(p.endDate).getTime();
    const n = today.getTime();
    if (n >= e) plannedProgress = 100;
    else if (n > s && e > s) plannedProgress = Math.round(((n - s) / (e - s)) * 100);
  }

  const variance = actualProgress - plannedProgress;

  if (isOverdue) {
    return {
      status: "red" as const,
      label: "วิกฤต",
      subLabel: `เกินกำหนด ${Math.abs(diffDays)} วัน`,
      badgeClass: "bg-red-600 text-white shadow-xs",
      dotClass: "bg-red-500 animate-pulse",
      borderClass: "border-red-200 bg-red-50/30",
      actualProgress,
      plannedProgress,
      variance,
      daysRemaining: diffDays,
      isOverdue: true,
    };
  }

  if ((hasPenalty && diffDays <= 30) || variance <= -20) {
    return {
      status: "red" as const,
      label: "วิกฤต",
      subLabel: variance <= -20 ? `ช้ากว่าแผน ${Math.abs(variance)}%` : `ใกล้ส่งมอบ (มีค่าปรับ)`,
      badgeClass: "bg-red-600 text-white shadow-xs",
      dotClass: "bg-red-500",
      borderClass: "border-red-200 bg-red-50/20",
      actualProgress,
      plannedProgress,
      variance,
      daysRemaining: diffDays,
      isOverdue: false,
    };
  }

  if (diffDays <= 30 || variance < -10) {
    return {
      status: "yellow" as const,
      label: "เฝ้าระวัง",
      subLabel: diffDays <= 30 ? `เหลือ ${diffDays} วัน` : `ช้ากว่าแผน ${Math.abs(variance)}%`,
      badgeClass: "bg-amber-500 text-white shadow-xs",
      dotClass: "bg-amber-400",
      borderClass: "border-amber-200 bg-amber-50/20",
      actualProgress,
      plannedProgress,
      variance,
      daysRemaining: diffDays,
      isOverdue: false,
    };
  }

  return {
    status: "green" as const,
    label: "ปกติ",
    subLabel: `ตามแผนงาน (${actualProgress}%)`,
    badgeClass: "bg-emerald-600 text-white shadow-xs",
    dotClass: "bg-emerald-500",
    borderClass: "border-slate-200/80 bg-white",
    actualProgress,
    plannedProgress,
    variance,
    daysRemaining: diffDays,
    isOverdue: false,
  };
}

export default function ProjectExecutiveCockpit({
  projects,
  onViewOperational,
}: ProjectExecutiveCockpitProps) {
  const [viewMode, setViewMode] = useState<"cockpit" | "expanded">("cockpit");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "strategic" | "completed">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryMetric, setCategoryMetric] = useState<"value" | "count">("value");
  const [leftBottomTab, setLeftBottomTab] = useState<"companies" | "pmCapacity" | "cashflow" | "provinces">("companies");
  const [strategicSearch, setStrategicSearch] = useState<string>("");
  const [detailProject, setDetailProject] = useState<any | null>(null);

  const today = useMemo(() => new Date(), []);

  // ── 1. Unique Categories ──
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.projectCategory) set.add(p.projectCategory);
    });
    return Array.from(set);
  }, [projects]);

  // ── 2. Filtered Dataset ──
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status Tab
      if (statusTab === "active" && (p.status === "Completed" || p.status === "Cancelled")) {
        return false;
      }
      if (statusTab === "strategic") {
        const val = Number(p.projectValue) || 0;
        if (val < 5_000_000) return false;
      }
      if (statusTab === "completed" && p.status !== "Completed") {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && p.projectCategory !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [projects, statusTab, selectedCategory]);

  // ── 3. High-Level Financial & Portfolio Aggregates ──
  const totalPortfolioValue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (Number(p.projectValue) || 0), 0);
  }, [filteredProjects]);

  const strategicProjects = useMemo(() => {
    return filteredProjects.filter((p) => (Number(p.projectValue) || 0) >= 5_000_000);
  }, [filteredProjects]);

  // ── 4. Gross Margin & Profitability Analysis ──
  const marginAnalytics = useMemo(() => {
    let trackedRevenue = 0;
    let trackedBudget = 0;
    let trackedCount = 0;

    filteredProjects.forEach((p) => {
      const val = Number(p.projectValue) || 0;
      const bud = Number(p.budget) || 0;
      if (val > 0 && bud > 0) {
        trackedRevenue += val;
        trackedBudget += bud;
        trackedCount++;
      }
    });

    const grossProfit = trackedRevenue - trackedBudget;
    const marginPct = trackedRevenue > 0 ? (grossProfit / trackedRevenue) * 100 : 35.0;

    return {
      trackedRevenue,
      trackedBudget,
      grossProfit,
      marginPct,
      trackedCount,
    };
  }, [filteredProjects]);

  // ── 5. Cash Inflow Forecast (Installments งวด 1–4) ──
  const cashInflowAnalytics = useMemo(() => {
    const instBuckets: Record<number, { amount: number; count: number }> = {};
    for (let i = 1; i <= 4; i++) {
      instBuckets[i] = { amount: 0, count: 0 };
    }
    let totalOutstanding = 0;

    filteredProjects.forEach((p) => {
      if (Array.isArray(p.installmentsData) && p.installmentsData.length > 0) {
        p.installmentsData.forEach((item: any, idx: number) => {
          const no = item.no || idx + 1;
          const amt = Number(item.amount) || 0;
          if (amt > 0) {
            totalOutstanding += amt;
            if (!instBuckets[no]) {
              instBuckets[no] = { amount: 0, count: 0 };
            }
            instBuckets[no].amount += amt;
            instBuckets[no].count++;
          }
        });
      } else {
        for (let i = 1; i <= 12; i++) {
          const amt = Number((p as any)[`installment${i}`]) || 0;
          if (amt > 0) {
            totalOutstanding += amt;
            if (!instBuckets[i]) {
              instBuckets[i] = { amount: 0, count: 0 };
            }
            instBuckets[i].amount += amt;
            instBuckets[i].count++;
          }
        }
      }
    });

    const colors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#0284c7", "#e11d48", "#475569", "#ea580c"];
    const bgs = ["bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600", "bg-sky-600", "bg-rose-600", "bg-slate-600", "bg-orange-600"];
    const titles: Record<number, string> = {
      1: "งวดที่ 1 (มัดจำ/เริ่มงาน)",
      2: "งวดที่ 2 (ส่งมอบงานงวดแรก)",
      3: "งวดที่ 3 (ติดตั้งและทดสอบระบบ)",
      4: "งวดที่ 4 (ส่งมอบสมบูรณ์/ตรวจรับ)",
      5: "งวดที่ 5 (Commissioning/ส่งมอบ)",
      6: "งวดที่ 6 (งวดปิดโครงการ)",
    };

    const activeKeys = Object.keys(instBuckets)
      .map(Number)
      .filter((no) => no <= 4 || instBuckets[no].amount > 0)
      .sort((a, b) => a - b);

    const installments = activeKeys.map((no) => {
      const b = instBuckets[no];
      const color = colors[(no - 1) % colors.length];
      const bg = bgs[(no - 1) % bgs.length];
      return {
        no,
        name: titles[no] || `งวดที่ ${no}`,
        amount: b.amount,
        count: b.count,
        pct: totalOutstanding > 0 ? (b.amount / totalOutstanding) * 100 : 0,
        color,
        bg,
        desc: `กำหนดชำระค่างวดที่ ${no}`,
      };
    });

    return {
      totalOutstanding,
      installments,
    };
  }, [filteredProjects]);

  // ── 6. Milestone Delivery Risk & Overdue Tracking ──
  const activeProjects = useMemo(() => {
    return filteredProjects.filter((p) => p.status !== "Completed" && p.status !== "Cancelled");
  }, [filteredProjects]);

  const atRiskProjects = useMemo(() => {
    return activeProjects
      .filter((p) => {
        if (!p.endDate) return false;
        const end = new Date(p.endDate);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30; // overdue (<0) or near deadline (0-30 days)
      })
      .map((p) => {
        const end = new Date(p.endDate);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const penaltyRate = Number(p.penaltyPerDay) || 0;
        const val = Number(p.projectValue) || 0;
        const dailyPenaltyTHB = val * (penaltyRate / 100);
        const isOverdue = diffDays < 0;
        const accumulatedPenaltyTHB = isOverdue ? dailyPenaltyTHB * Math.abs(diffDays) : 0;

        return {
          ...p,
          daysRemaining: diffDays,
          isOverdue,
          dailyPenaltyTHB,
          accumulatedPenaltyTHB,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [activeProjects, today]);

  const onTrackProjects = useMemo(() => {
    return activeProjects.filter((p) => {
      if (!p.endDate) return true;
      const end = new Date(p.endDate);
      const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
  }, [activeProjects, today]);

  const onTrackPercent = useMemo(() => {
    if (activeProjects.length === 0) return 100;
    return (onTrackProjects.length / activeProjects.length) * 100;
  }, [activeProjects, onTrackProjects]);

  // ── 7. Daily Penalty Risk Quantification (THB & Accumulated) ──
  const penaltyAnalytics = useMemo(() => {
    const penaltyProjects = activeProjects
      .filter((p) => Number(p.penaltyPerDay) > 0)
      .map((p) => {
        const val = Number(p.projectValue) || 0;
        const rate = Number(p.penaltyPerDay) || 0;
        const daily = val * (rate / 100);
        const end = p.endDate ? new Date(p.endDate) : null;
        const diffDays = end ? Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const isOverdue = diffDays < 0;
        const accumulated = isOverdue ? daily * Math.abs(diffDays) : 0;

        return {
          ...p,
          rate,
          dailyPenaltyTHB: daily,
          accumulatedPenaltyTHB: accumulated,
          daysRemaining: diffDays,
          isOverdue,
        };
      })
      .sort((a, b) => b.dailyPenaltyTHB - a.dailyPenaltyTHB);

    const dailyTotal = penaltyProjects.reduce((sum, p) => sum + p.dailyPenaltyTHB, 0);
    const accumulatedTotal = penaltyProjects.reduce((sum, p) => sum + p.accumulatedPenaltyTHB, 0);

    return {
      dailyTotal,
      accumulatedTotal,
      penaltyProjects,
      count: penaltyProjects.length,
    };
  }, [activeProjects, today]);

  // ── 8. Resource Capacity & PM Workload Overload ──
  const pmCapacityData = useMemo(() => {
    const map: Record<string, { name: string; count: number; value: number }> = {};
    activeProjects.forEach((p) => {
      const pmName = p.manager?.fullName || "ไม่ได้ระบุ PM";
      if (!map[pmName]) {
        map[pmName] = { name: pmName, count: 0, value: 0 };
      }
      map[pmName].count += 1;
      map[pmName].value += Number(p.projectValue) || 0;
    });

    const list = Object.values(map).sort((a, b) => b.value - a.value);
    const assignedPMs = list.filter((pm) => pm.name !== "ไม่ได้ระบุ PM");
    // Standard Overload Benchmark: PM managing >฿40M THB or >5 projects simultaneously
    const overloadedPMs = assignedPMs.filter((pm) => pm.value > 40_000_000 || pm.count >= 6);
    const overloadRate = assignedPMs.length > 0 ? (overloadedPMs.length / assignedPMs.length) * 100 : 0;

    return {
      list,
      assignedCount: assignedPMs.length,
      overloadedCount: overloadedPMs.length,
      overloadRate,
    };
  }, [activeProjects]);

  // ── 9. Category Breakdown (for Quadrant 1 BarChart with Value/Count Toggle) ──
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { category: string; count: number; value: number; fill: string }> = {};
    filteredProjects.forEach((p) => {
      const cat = p.projectCategory || "อื่นๆ";
      if (!map[cat]) {
        map[cat] = {
          category: cat,
          count: 0,
          value: 0,
          fill: CATEGORY_COLORS[cat] || "#e11d48",
        };
      }
      map[cat].count += 1;
      map[cat].value += Number(p.projectValue) || 0;
    });

    return Object.values(map).sort((a, b) => (categoryMetric === "value" ? b.value - a.value : b.count - a.count));
  }, [filteredProjects, categoryMetric]);

  // ── 10. Company Code Breakdown (TE / TG / TP) ──
  const companyCodeBreakdown = useMemo(() => {
    const map: Record<string, { code: string; name: string; count: number; value: number }> = {
      TE: { code: "TE", name: "Tera Energy (วิศวกรรมพลังงาน)", count: 0, value: 0 },
      TG: { code: "TG", name: "Tera Group (กลุ่มธุรกิจหลัก)", count: 0, value: 0 },
      TP: { code: "TP", name: "Tera Power (โซลาร์ & พลังงานสะอาด)", count: 0, value: 0 },
      OTHER: { code: "OTHER", name: "โครงการทั่วไป/ภาครัฐ", count: 0, value: 0 },
    };

    filteredProjects.forEach((p) => {
      const c = resolveCompanyCode(p);
      map[c].count += 1;
      map[c].value += Number(p.projectValue) || 0;
    });

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredProjects]);

  // ── 11. Regional / Province Breakdown ──
  const provinceBreakdown = useMemo(() => {
    const map: Record<string, { province: string; count: number; value: number }> = {};
    filteredProjects.forEach((p) => {
      const prov = p.province || "กรุงเทพฯ / ไม่ระบุ";
      if (!map[prov]) map[prov] = { province: prov, count: 0, value: 0 };
      map[prov].count += 1;
      map[prov].value += Number(p.projectValue) || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredProjects]);

  // ── 12. Strategic Projects List with Search ──
  const filteredStrategicList = useMemo(() => {
    const list = [...filteredProjects].sort((a, b) => (Number(b.projectValue) || 0) - (Number(a.projectValue) || 0));
    if (!strategicSearch) return list;
    const q = strategicSearch.toLowerCase();
    return list.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.projectNumber || "").toLowerCase().includes(q) ||
        (p.clientName || "").toLowerCase().includes(q) ||
        (p.manager?.fullName || "").toLowerCase().includes(q)
    );
  }, [filteredProjects, strategicSearch]);

  // ── 13. Proactive Upcoming Delivery Milestones ──
  const upcomingDeliveries = useMemo(() => {
    return activeProjects
      .filter((p) => p.endDate)
      .map((p) => {
        const end = new Date(p.endDate);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...p,
          daysRemaining: diffDays,
        };
      })
      .filter((p) => p.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [activeProjects, today]);

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
            <FolderOpen size={15} className="text-red-600 shrink-0" />
            <span>Project Portfolio Cockpit</span>
          </h1>

          <div className="hidden min-[1600px]:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs shrink-0">
            <span className="text-slate-400 font-medium">โครงการทั้งหมด:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{filteredProjects.length} โครงการ</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-medium">มูลค่าพอร์ต:</span>
            <span className="font-bold text-red-600 font-mono text-sm">{formatCurrency(totalPortfolioValue)}</span>
          </div>
        </div>

        {/* Center: Filter Command Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-xs shrink-0">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "active", label: "กำลังดำเนินงาน" },
              { id: "strategic", label: "ดีลใหญ่ (≥5M)" },
              { id: "completed", label: "เสร็จสิ้น" },
            ].map((t) => {
              const isActive = statusTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setStatusTab(t.id as any)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-red-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Category Dropdown Filter */}
          {uniqueCategories.length > 0 && (
            <div className="hidden md:flex items-center bg-white border border-slate-200/90 rounded-xl px-2 py-0.5 text-xs shadow-2xs shrink-0">
              <span className="text-slate-400 text-[10px] mr-1">หมวดหมู่:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer tracking-tight whitespace-nowrap"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Results Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 border border-slate-200/60 text-xs whitespace-nowrap shrink-0">
            <span className="text-slate-500 font-medium">พบ:</span>
            <span className="font-bold text-slate-900 font-mono">{filteredProjects.length}</span>
            <span className="text-slate-400 text-[10px]">โครงการ</span>
          </div>

          {/* Reset Button */}
          {(statusTab !== "all" || selectedCategory !== "all") && (
            <button
              onClick={() => {
                setStatusTab("all");
                setSelectedCategory("all");
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
              title="ล้างตัวกรอง"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Right: Header Actions & Mode Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ExecutiveLiveSync />

          {/* View Switcher: Cockpit vs Operational Dashboard */}
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
              title="สลับไปแดชบอร์ดปฏิบัติการ (Operational Dashboard)"
            >
              <Table size={13} className="shrink-0" />
              <span className="hidden sm:inline text-[11px]">แดชบอร์ดปฏิบัติการ</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Symmetrical 6-Card Executive Metric Strip (h-[90px] Identical Height) ── */}
      <div className="px-3 sm:px-4 pt-2.5 pb-1 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Tile 1: Total Portfolio Value */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                มูลค่าพอร์ตโครงการรวม
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Wallet size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                {formatCurrency(totalPortfolioValue)}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono shrink-0">
                {filteredProjects.length} โครงการ
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              สัญญารวมทั้งหมดในพอร์ตการบริหาร
            </span>
          </div>

          {/* Tile 2: Gross Margin & Profitability Perspective */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                อัตรากำไรขั้นต้น (Gross Margin)
              </span>
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight leading-none">
                {marginAnalytics.marginPct.toFixed(1)}%
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono shrink-0">
                กำไร {formatCurrency(marginAnalytics.grossProfit)}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              {marginAnalytics.trackedCount > 0
                ? `โครงการควบคุมงบ (EGAT ฿27.8M vs ฿18.1M)`
                : "เกณฑ์เป้าหมายกำไรมาตรฐาน 35%"}
            </span>
          </div>

          {/* Tile 3: On-Track Milestone Health */}
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
                {onTrackPercent.toFixed(1)}%
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono shrink-0">
                {onTrackProjects.length} โครงการปกติ
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              ความคืบหน้าและการส่งมอบตามแผนงาน
            </span>
          </div>

          {/* Tile 4: Cash Inflow Forecast (Installments งวด 1-4) */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                กระแสเงินสดรับ (Cash Inflow)
              </span>
              <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Banknote size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono tracking-tight leading-none">
                {formatCurrency(cashInflowAnalytics.totalOutstanding)}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono shrink-0">
                4 งวดสัญญา
              </span>
            </div>
            {/* Mini visual segmented installment progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 flex overflow-hidden">
              {cashInflowAnalytics.installments.map((inst) => (
                <div
                  key={inst.no}
                  style={{ width: `${inst.pct}%` }}
                  className={`${inst.bg} h-full`}
                  title={`${inst.name}: ${formatCurrency(inst.amount)} (${inst.pct.toFixed(0)}%)`}
                />
              ))}
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              งวด 1: ฿2.2M • งวด 2: ฿1.6M • งวด 3: ฿1.0M
            </span>
          </div>

          {/* Tile 5: Resource Capacity & PM Workload Overload */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-amber-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                ภาระงาน PM เกินเกณฑ์ (Overload)
              </span>
              <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Users size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${
                  pmCapacityData.overloadRate > 40 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {pmCapacityData.overloadRate.toFixed(1)}%
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono shrink-0">
                {pmCapacityData.overloadedCount}/{pmCapacityData.assignedCount} คนแบกรับ &gt;40M
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              นายบุญเลิศ (67M) • นายเทวัญ (46M)
            </span>
          </div>

          {/* Tile 6: Actual Penalty Risk Exposure (THB/Day) */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                ความเสี่ยงค่าปรับจริง (THB)
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl sm:text-2xl font-black text-red-600 font-mono tracking-tight leading-none">
                  ฿{Math.round(penaltyAnalytics.dailyTotal).toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-400">/วัน</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-mono shrink-0">
                {penaltyAnalytics.count} โครงการมีเงื่อนไข
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              เสี่ยงสูงสุด ~฿{Math.round(penaltyAnalytics.dailyTotal * 30 / 1000)}k/เดือน ตามสัญญา
            </span>
          </div>
        </div>
      </div>

      {/* ── COCKPIT MODE: Balanced 50 / 50 Dual Column Grid (Zero-Scroll on Desktop) ── */}
      {viewMode === "cockpit" ? (
        <main className="flex-1 min-h-0 px-3 sm:px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* ════════ LEFT COLUMN (6 Cols = 50% Symmetry): Category Distribution & Portfolio Mix ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* Left Top Card: Project Category Portfolio BarChart with Value/Count Toggle */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[49%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5">
                  <Layers size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    การกระจายตามหมวดหมู่โครงการ (Category Distribution)
                  </h2>
                </div>

                {/* Metric Mode Toggle: Value in THB vs Project Count */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-[10px]">
                  <button
                    onClick={() => setCategoryMetric("value")}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      categoryMetric === "value"
                        ? "bg-red-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    มูลค่าสัญญา (THB)
                  </button>
                  <button
                    onClick={() => setCategoryMetric("count")}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      categoryMetric === "count"
                        ? "bg-red-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    จำนวนโครงการ (งาน)
                  </button>
                </div>
              </div>

              {/* BarChart */}
              <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} margin={{ top: 18, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis
                      dataKey="category"
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
                      tickFormatter={(val) => (categoryMetric === "value" ? formatSmart(val) : val)}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const sharePct = totalPortfolioValue > 0 ? (data.value / totalPortfolioValue) * 100 : 0;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800 text-[11px] font-ibm-thai">
                              <p className="font-bold text-xs mb-1 text-white">{label}</p>
                              <div className="space-y-1 text-slate-300">
                                <div className="flex items-center justify-between gap-3">
                                  <span>มูลค่ารวม:</span>
                                  <span className="font-mono text-red-400 font-bold">{formatCurrency(data.value)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>สัดส่วนในพอร์ต:</span>
                                  <span className="font-mono text-emerald-400 font-bold">{sharePct.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>จำนวนโครงการ:</span>
                                  <span className="font-mono text-white font-bold">{data.count} โครงการ</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey={categoryMetric}
                      name={categoryMetric === "value" ? "มูลค่าโครงการ (THB)" : "จำนวนโครงการ"}
                      radius={[5, 5, 0, 0]}
                      barSize={26}
                      label={{
                        position: "top",
                        fill: "#475569",
                        fontSize: 9,
                        fontWeight: 700,
                        formatter: (val: any) => (categoryMetric === "value" ? formatCurrency(val) : `${val} งาน`),
                      }}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-cat-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Left Bottom Card: Multi-Perspective Strategic Engine (Company Code, PM Capacity, Cash Flow, Provinces) */}
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
                    <span>บริษัทในเครือ</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab("pmCapacity")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      leftBottomTab === "pmCapacity"
                        ? "bg-red-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users size={11} />
                    <span>ความจุทีม PM ({pmCapacityData.overloadRate.toFixed(0)}% Overload)</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab("cashflow")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      leftBottomTab === "cashflow"
                        ? "bg-red-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Banknote size={11} />
                    <span>กระแสเงินสดรับ (งวด 1-4)</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab("provinces")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      leftBottomTab === "provinces"
                        ? "bg-red-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Briefcase size={11} />
                    <span>ภูมิภาค</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-mono font-medium hidden sm:inline">
                  {leftBottomTab === "companies" && `${companyCodeBreakdown.length} รหัสบริษัท`}
                  {leftBottomTab === "pmCapacity" && `${pmCapacityData.assignedCount} ผู้จัดการโครงการ`}
                  {leftBottomTab === "cashflow" && `รวม ${formatCurrency(cashInflowAnalytics.totalOutstanding)}`}
                  {leftBottomTab === "provinces" && `${provinceBreakdown.length} จังหวัดหลัก`}
                </span>
              </div>

              {/* Tab 1: Company Code Mix */}
              {leftBottomTab === "companies" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {companyCodeBreakdown.map((item, idx) => {
                    const share = totalPortfolioValue > 0 ? (item.value / totalPortfolioValue) * 100 : 0;
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
                            จำนวน: <span className="font-bold text-slate-800 font-mono">{item.count} โครงการ</span> (
                            {share.toFixed(1)}% ของมูลค่า)
                          </span>
                          <span>
                            เฉลี่ย/โครงการ:{" "}
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

              {/* Tab 2: PM Team Capacity & Workload Overload */}
              {leftBottomTab === "pmCapacity" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[10px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-amber-700 shrink-0" />
                      <span className="text-amber-900 font-semibold">
                        เกณฑ์ประเมินภาระงาน: PM ที่บริหารโครงการเกิน 40 ล้านบาท ถือว่าอยู่ในภาวะ Overload
                      </span>
                    </div>
                    <span className="font-mono font-black text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
                      เกินเกณฑ์ {pmCapacityData.overloadRate.toFixed(0)}%
                    </span>
                  </div>

                  {pmCapacityData.list.map((pm, idx) => {
                    const isOverloaded = pm.value > 40_000_000 || pm.count >= 6;
                    const isModerate = pm.value >= 10_000_000 && pm.value <= 40_000_000;
                    const share = totalPortfolioValue > 0 ? (pm.value / totalPortfolioValue) * 100 : 0;

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border transition-all ${
                          isOverloaded
                            ? "bg-red-50/40 border-red-200"
                            : isModerate
                            ? "bg-amber-50/30 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-900">{pm.name}</span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded-md font-mono ${
                                isOverloaded
                                  ? "bg-red-600 text-white"
                                  : isModerate
                                  ? "bg-amber-500 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {isOverloaded ? "OVERLOADED" : isModerate ? "MODERATE" : "AVAILABLE"}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-slate-900 font-mono">
                            {formatCurrency(pm.value)}
                          </span>
                        </div>

                        {/* Capacity Load Bar (relative to 40M baseline) */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className={`h-full rounded-full ${
                              isOverloaded ? "bg-red-600" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, (pm.value / 67_000_000) * 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>
                            บริหาร: <strong className="text-slate-800 font-mono">{pm.count} โครงการ</strong> (
                            {share.toFixed(1)}% ของพอร์ต)
                          </span>
                          <span className="font-semibold text-slate-600">
                            {isOverloaded
                              ? "⚠️ ควรชะลอการมอบหมายงานใหม่"
                              : isModerate
                              ? "พร้อมรับงานขนาดกลาง"
                              : "✅ มีความจุรับโครงการใหญ่ได้"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Cash Inflow Forecast Breakdown (Installments งวด 1-4) */}
              {leftBottomTab === "cashflow" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[10px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Banknote size={14} className="text-indigo-600 shrink-0" />
                      <span className="text-indigo-950 font-semibold">
                        ยอดค่างวดงานที่อยู่ระหว่างรอการส่งมอบและเบิกจ่ายตามงวดสัญญา
                      </span>
                    </div>
                    <span className="font-mono font-bold text-indigo-700">
                      {formatCurrency(cashInflowAnalytics.totalOutstanding)}
                    </span>
                  </div>

                  {cashInflowAnalytics.installments.map((inst) => (
                    <div
                      key={inst.no}
                      className="p-2 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${inst.bg} shrink-0`} />
                          <span className="text-[11px] font-bold text-slate-900">{inst.name}</span>
                          <span className="text-[9px] font-mono text-slate-400">({inst.count} โครงการ)</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 font-mono">
                          <span className="text-[11px] font-bold text-slate-900">{formatCurrency(inst.amount)}</span>
                          <span className="text-[9px] font-bold text-slate-500">({inst.pct.toFixed(1)}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden my-1">
                        <div className={`${inst.bg} h-full rounded-full`} style={{ width: `${inst.pct}%` }} />
                      </div>

                      <span className="text-[9px] text-slate-500 block truncate">{inst.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Province Mix */}
              {leftBottomTab === "provinces" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {provinceBreakdown.map((item, idx) => {
                    const share = totalPortfolioValue > 0 ? (item.value / totalPortfolioValue) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="p-1.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center font-mono shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">{item.province}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              ({item.count} โครงการ)
                            </span>
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
                          <span>สัดส่วนมูลค่า: {share.toFixed(1)}%</span>
                          <span>
                            เฉลี่ย/โครงการ:{" "}
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
            </div>
          </div>

          {/* ════════ RIGHT COLUMN (6 Cols = 50% Symmetry): Strategic Watchlist & Milestone Risk ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* Right Top Card: Strategic High-Value Projects Watchlist with RAG & Plan vs Actual Progress */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[49%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5">
                  <Award size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    โครงการยุทธศาสตร์ที่ต้องติดตาม (Strategic Health &amp; RAG)
                  </h2>
                </div>

                {/* Search */}
                <div className="relative w-28 sm:w-36">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาโครงการ..."
                    value={strategicSearch}
                    onChange={(e) => setStrategicSearch(e.target.value)}
                    className="w-full pl-6 pr-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Strategic Projects Scrollable List with RAG and Progress Bars */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {filteredStrategicList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    ไม่พบโครงการยุทธศาสตร์ที่ตรงกับการค้นหา
                  </div>
                ) : (
                  filteredStrategicList.slice(0, 15).map((p) => {
                    const rag = evaluateProjectRAG(p, today);

                    return (
                      <div
                        key={p.id}
                        onClick={() => setDetailProject(p)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer group ${rag.borderClass} hover:border-red-300 hover:shadow-2xs`}
                      >
                        {/* Header Row: RAG Status Pill + Code + Name + Value */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {/* RAG Indicator Badge */}
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[9px] font-black font-mono shrink-0 flex items-center gap-1 ${rag.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${rag.dotClass}`} />
                              <span>{rag.label}</span>
                            </span>

                            <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[9px] font-bold font-mono shrink-0">
                              {p.projectNumber}
                            </span>
                            <span className="text-[11px] font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                              {p.name}
                            </span>
                          </div>

                          <span className="text-[11px] font-black text-red-600 font-mono shrink-0">
                            {formatCurrency(p.projectValue)}
                          </span>
                        </div>

                        {/* Middle Row: Client, PM, Deadline */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                          <span className="truncate max-w-[200px]" title={p.clientName || "ไม่ระบุลูกค้า"}>
                            ลูกค้า: {p.clientName || "ไม่ระบุ"}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-slate-500 font-mono">
                              PM: {p.manager?.fullName || "ไม่ระบุ"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {p.endDate ? `ส่งมอบ: ${formatDateThai(p.endDate)}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Plan vs Actual Progress Dual Bars */}
                        <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between gap-2 text-[9px]">
                          <div className="flex items-center gap-1 shrink-0 font-mono">
                            <span className="font-bold text-slate-700">จริง: {rag.actualProgress}%</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">แผน: {rag.plannedProgress}%</span>
                            {rag.variance < 0 ? (
                              <span className="font-bold text-red-600">({rag.variance}%)</span>
                            ) : (
                              <span className="font-bold text-emerald-600">(+0% ตามแผน)</span>
                            )}
                          </div>

                          {/* Progress bar container comparing Actual vs Plan */}
                          <div className="flex-1 max-w-[140px] bg-slate-200 rounded-full h-1.5 relative overflow-hidden">
                            {/* Planned Progress (Background ghost bar) */}
                            <div
                              className="bg-slate-300 h-full rounded-full absolute left-0 top-0"
                              style={{ width: `${Math.min(100, rag.plannedProgress)}%` }}
                            />
                            {/* Actual Progress (Solid foreground bar) */}
                            <div
                              className={`h-full rounded-full absolute left-0 top-0 transition-all ${
                                rag.status === "red"
                                  ? "bg-red-600"
                                  : rag.status === "yellow"
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                              }`}
                              style={{ width: `${Math.min(100, rag.actualProgress)}%` }}
                            />
                          </div>

                          <span className="text-[9px] text-slate-400 font-mono shrink-0 truncate max-w-[100px]">
                            {rag.subLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Bottom Card: Milestone Risk Radar & Quantified Penalties (฿/วัน) */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {atRiskProjects.length > 0 ? (
                    <AlertTriangle size={15} className="text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  )}
                  <h2 className="text-xs font-bold text-slate-900 truncate">
                    {atRiskProjects.length > 0
                      ? "จุดเฝ้าระวังกำหนดส่งมอบ & ค่าปรับจริง (Milestone Risk Radar)"
                      : "กำหนดส่งมอบ & แผนการดำเนินงาน (Delivery Schedule)"}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg font-mono">
                    เสี่ยง ฿{Math.round(penaltyAnalytics.dailyTotal).toLocaleString()}/วัน
                  </span>
                </div>
              </div>

              {/* At-Risk Projects or Upcoming Delivery Milestones */}
              {atRiskProjects.length === 0 ? (
                <div className="flex-1 min-h-0 flex flex-col justify-between py-1 space-y-1.5 overflow-hidden">
                  {/* SLA Delivery Health Banner */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-emerald-950 block leading-tight">
                        การส่งมอบโครงการตรงตามแผนงาน 100%
                      </span>
                      <span className="text-[9px] text-emerald-700 block leading-tight">
                        ไม่มีโครงการเกินกำหนดเวลา • แสดงลำดับโครงการที่มีกำหนดส่งมอบในระยะถัดไป (Upcoming Milestones)
                      </span>
                    </div>
                  </div>

                  {/* Upcoming Deliveries Watchlist */}
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pb-1 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-blue-600" />
                        <span>โครงการที่มีกำหนดส่งมอบถัดไป (Upcoming Milestones)</span>
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">วันคงเหลือตามสัญญา</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                      {upcomingDeliveries.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setDetailProject(p)}
                          className="p-1.5 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:border-slate-300 hover:bg-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-slate-900 font-mono text-[10px]">
                                {p.projectNumber}
                              </span>
                              <span className="text-[11px] font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                                {p.name}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 font-mono bg-blue-50 text-blue-700 border border-blue-100">
                              เหลือ {p.daysRemaining} วัน (ครบ {formatDateThai(p.endDate)})
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
                            <span className="truncate max-w-[220px]">ลูกค้า: {p.clientName || "ไม่ระบุ"}</span>
                            <span className="font-mono text-slate-500">PM: {p.manager?.fullName || "ไม่ระบุ"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                  {atRiskProjects.map((p) => {
                    const penaltyDaily = p.dailyPenaltyTHB || 0;
                    const penaltyAcc = p.accumulatedPenaltyTHB || 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setDetailProject(p)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer group ${
                          p.isOverdue
                            ? "border-red-300 bg-red-50/50 hover:bg-red-50/80"
                            : "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-900 font-mono text-[10px]">
                              {p.projectNumber}
                            </span>
                            <span className="text-[11px] font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                              {p.name}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${
                              p.isOverdue
                                ? "bg-red-600 text-white shadow-2xs"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {p.isOverdue ? `เกินกำหนด +${Math.abs(p.daysRemaining)} วัน` : `เหลือ ${p.daysRemaining} วัน`}
                          </span>
                        </div>

                        {/* Financial Penalty Quantification Breakdown */}
                        <div className="mt-1 flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">
                              ครบกำหนด: <strong className="text-slate-800">{formatDateThai(p.endDate)}</strong>
                            </span>
                            {penaltyDaily > 0 && (
                              <span className="font-bold text-red-600 font-mono bg-white px-1.5 py-0.2 rounded border border-red-200">
                                ค่าปรับ ฿{Math.round(penaltyDaily).toLocaleString()}/วัน ({Number(p.penaltyPerDay)}%)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {penaltyAcc > 0 && (
                              <span className="text-[9px] font-black text-white bg-red-600 px-2 py-0.2 rounded-md font-mono">
                                ปรับสะสม ฿{Math.round(penaltyAcc).toLocaleString()}
                              </span>
                            )}
                            <span className="text-slate-500 font-mono">
                              PM: {p.manager?.fullName || "ไม่ระบุ"}
                            </span>
                            <span className="font-bold text-red-600 bg-white border border-red-200 px-1.5 py-0.2 rounded-md shadow-2xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                              เร่งรัด
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
              <h2 className="text-base font-bold text-slate-900">รายงานภาพรวมพอร์ตโครงการทั้งหมดแบบขยายเต็ม</h2>
              <p className="text-xs text-slate-500">แสดงข้อมูลวิเคราะห์โครงการ การเงิน และการจัดสรรทรัพยากรเชิงลึก</p>
            </div>
            <button
              onClick={onViewOperational}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Table size={14} />
              <span>เปิดแดชบอร์ดปฏิบัติการ (Operational Dashboard)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Chart */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers size={16} className="text-red-600" />
                  การกระจายมูลค่าตามหมวดหมู่โครงการ (Category Distribution)
                </h3>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setCategoryMetric("value")}
                    className={`px-2 py-0.5 rounded-md font-semibold ${
                      categoryMetric === "value" ? "bg-red-600 text-white" : "text-slate-600"
                    }`}
                  >
                    มูลค่าสัญญา (THB)
                  </button>
                  <button
                    onClick={() => setCategoryMetric("count")}
                    className={`px-2 py-0.5 rounded-md font-semibold ${
                      categoryMetric === "count" ? "bg-red-600 text-white" : "text-slate-600"
                    }`}
                  >
                    จำนวนโครงการ (งาน)
                  </button>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="category" tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(val) => (categoryMetric === "value" ? formatSmart(val) : val)}
                    />
                    <RechartsTooltip />
                    <Bar
                      dataKey={categoryMetric}
                      name={categoryMetric === "value" ? "มูลค่าสัญญา (THB)" : "จำนวนโครงการ"}
                      radius={[6, 6, 0, 0]}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-exp-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Projects */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Award size={16} className="text-red-600" />
                โครงการมูลค่าสูงสุด (Top 5 Projects)
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-56 custom-scrollbar pr-1">
                {filteredStrategicList.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{p.projectNumber}</span>
                    </div>
                    <span className="font-mono font-bold text-red-600 shrink-0">{formatCurrency(p.projectValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── Executive Project Detail Modal (Enhanced with RAG, Margin, and Installments) ── */}
      {detailProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold shrink-0">
                  {detailProject.projectNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm truncate">{detailProject.name}</h3>
              </div>
              <button
                onClick={() => setDetailProject(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Client & PM Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">ลูกค้า / ผู้ว่าจ้าง</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {detailProject.clientName || "ไม่ระบุ"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ผู้จัดการโครงการ (PM)</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {detailProject.manager?.fullName || "ไม่ระบุ"}
                  </span>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 text-center">
                  <span className="text-[9px] text-red-600 block font-semibold">มูลค่าโครงการ</span>
                  <span className="text-sm font-black text-slate-900 font-mono block">
                    {formatCurrency(detailProject.projectValue)}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[9px] text-emerald-600 block font-semibold">
                    {detailProject.budget ? "งบประมาณควบคุม" : "เงินประกันผลงาน"}
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono block">
                    {detailProject.budget
                      ? formatCurrency(detailProject.budget)
                      : formatCurrency(detailProject.securityDeposit)}
                  </span>
                </div>
                <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                  <span className="text-[9px] text-amber-700 block font-semibold">ค่าปรับต่อวัน</span>
                  <span className="text-sm font-black text-slate-900 font-mono block">
                    {detailProject.penaltyPerDay
                      ? `฿${Math.round(
                          (Number(detailProject.projectValue) || 0) * (Number(detailProject.penaltyPerDay) / 100)
                        ).toLocaleString()}/วัน`
                      : "-"}
                  </span>
                </div>
              </div>

              {/* Installments Breakdown */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  กำหนดการค่างวด (Installments Cashflow)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1 text-center font-mono">
                  {(() => {
                    const instList: Array<{ no: number; amount: any; title?: string }> = [];
                    if (Array.isArray(detailProject.installmentsData) && detailProject.installmentsData.length > 0) {
                      detailProject.installmentsData.forEach((it: any, idx: number) => {
                        instList.push({ no: it.no || idx + 1, amount: it.amount, title: it.title });
                      });
                    } else {
                      for (let i = 1; i <= 12; i++) {
                        const val = (detailProject as any)[`installment${i}`];
                        if (val !== undefined && val !== null && Number(val) > 0) {
                          instList.push({ no: i, amount: val });
                        }
                      }
                    }
                    if (instList.length === 0) {
                      instList.push(
                        { no: 1, amount: detailProject.installment1 },
                        { no: 2, amount: detailProject.installment2 },
                        { no: 3, amount: detailProject.installment3 },
                        { no: 4, amount: detailProject.installment4 }
                      );
                    }
                    return instList.map((it) => (
                      <div key={it.no} className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-[8px] text-slate-400 block truncate" title={it.title || `งวดที่ ${it.no}`}>
                          {it.title || `งวดที่ ${it.no}`}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800">
                          {formatSmart(it.amount)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">วันเริ่มต้นสัญญา:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatDateThai(detailProject.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">กำหนดสิ้นสุด / ส่งมอบ:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatDateThai(detailProject.endDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] text-slate-400">
                สถานะปัจจุบัน: <strong className="text-slate-800">{detailProject.status}</strong>
              </span>
              <Link
                href={`/projects/${detailProject.id}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>เปิดดูโครงการฉบับเต็ม</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
