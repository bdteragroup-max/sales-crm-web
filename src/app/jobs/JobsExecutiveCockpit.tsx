'use client';

import React, { useState, useMemo, useTransition, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Layers,
  Flame,
  User,
  Calendar,
  CalendarDays,
  Filter,
  ExternalLink,
  ShieldAlert,
  Award,
  FolderOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Table,
  Monitor,
  Maximize2,
  DollarSign,
  AlertOctagon,
  Wrench,
  Truck,
  Package,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import ExecutiveLiveSync from '@/app/executive/components/ExecutiveLiveSync';

export interface JobQuotation {
  id?: string;
  quotationNumber?: string;
  totalAmountBeforeVat?: number;
  actualClosingAmount?: number;
  orders?: any[];
}

export interface JobProject {
  id?: string;
  name?: string;
  status?: string;
  budget?: number;
}

export interface JobItem {
  id: string;
  jobNumber: string;
  companyCode: string;
  jobType: string;
  month: number;
  yearBe: number;
  dateClosed?: string | Date;
  customerName: string;
  item?: string | null;
  quotationNumber?: string | null;
  poNumber?: string | null;
  sellerName?: string | null;
  currentStep: string;
  flowVariant?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deliveryDate?: string | Date | null;
  requiredDeliveryDate?: string | Date | null;
  quotation?: JobQuotation | null;
  project?: JobProject | null;
  repairOrder?: any;
  stepLogs?: any[];
}

export interface CockpitDateFilterState {
  period: 'all' | 'year' | 'month' | 'date';
  yearBe: number;
  month: number;
  date: string;
}

interface JobsExecutiveCockpitProps {
  jobs: JobItem[];
  currentUser: string;
  userRole: string;
  onViewTable: (filterState?: CockpitDateFilterState) => void;
  onSelectJob: (jobId: string) => void;
}

const COMPLETED_STEPS = ['closed', 'service_return', 'accounting', 'delivery'];

const STEP_LABELS: Record<string, string> = {
  sales: 'ฝ่ายขายประสานงาน',
  sales_quote: 'รอจัดทำใบเสนอราคา',
  sales_pr: 'ขออนุมัติ PR จัดซื้อ',
  store: 'รอเบิกอะไหล่ / จัดเตรียมชิ้นส่วน',
  store_receive: 'รับสินค้าเข้าคลัง',
  service_receive: 'รับเครื่อง / ตรวจเช็ค',
  service_repair: 'กำลังดำเนินการซ่อมแซม',
  service_outsource: 'ส่งซ่อมภายนอก',
  customer_approval: 'รอลูกค้าอนุมัติ',
  production: 'ฝ่ายผลิตดำเนินการ',
  project: 'ฝ่ายโปรเจกต์ดำเนินงาน',
  service: 'ฝ่ายบริการดูแล',
  awaiting_return: 'ซ่อมเสร็จ / รอนัดส่งคืน',
  delivery: 'จัดส่งสินค้า',
  service_return: 'ส่งคืนสินค้า',
  closed: 'ปิดงานเรียบร้อย',
};

const STEP_SLA: Record<string, number> = {
  sales: 3,
  sales_quote: 2,
  sales_pr: 3,
  store: 2,
  store_receive: 2,
  service_receive: 2,
  service_repair: 5,
  service_outsource: 14,
  customer_approval: 3,
  production: 7,
  project: 7,
  service: 5,
  awaiting_return: 2,
  delivery: 2,
};

const getJobDepartment = (step: string) => {
  if (['sales', 'sales_quote', 'customer_approval'].includes(step)) return 'ฝ่ายขาย';
  if (['sales_pr'].includes(step)) return 'ฝ่ายจัดซื้อ (PR)';
  if (['store', 'store_receive'].includes(step)) return 'คลังสินค้า / สโตร์';
  if (['production'].includes(step)) return 'ฝ่ายผลิต';
  if (['project'].includes(step)) return 'ฝ่ายโปรเจกต์';
  if (['awaiting_return', 'delivery'].includes(step)) return 'จัดส่ง / ติดตั้ง';
  return 'ฝ่ายบริการ / ช่าง';
};

const DEPT_ORDER = [
  'ฝ่ายขาย',
  'ฝ่ายจัดซื้อ (PR)',
  'คลังสินค้า / สโตร์',
  'ฝ่ายผลิต',
  'จัดส่ง / ติดตั้ง',
  'ฝ่ายบริการ / ช่าง',
];

const DEPT_COLORS: Record<string, string> = {
  'ฝ่ายขาย': '#dc2626',
  'ฝ่ายจัดซื้อ (PR)': '#ea580c',
  'คลังสินค้า / สโตร์': '#475569',
  'ฝ่ายผลิต': '#b91c1c',
  'จัดส่ง / ติดตั้ง': '#2563eb',
  'ฝ่ายบริการ / ช่าง': '#0d9488',
};

const formatSmart = (val: number) => {
  if (!val || val === 0) return '0฿';
  if (val < 1000) return `${val.toLocaleString()}฿`;
  if (val < 1000000) return (val / 1000).toFixed(1) + 'k฿';
  return (val / 1000000).toFixed(2) + 'M฿';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const getJobDateParts = (job: JobItem) => {
  const d = new Date(job.createdAt);
  if (isNaN(d.getTime())) {
    const fallbackYearBe = job.yearBe >= 2500 ? job.yearBe : (job.yearBe > 0 ? 2500 + job.yearBe : 2569);
    return {
      yearBe: fallbackYearBe,
      yearCe: fallbackYearBe - 543,
      month: job.month || 1,
      dateStr: '',
    };
  }

  try {
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
    const [ceYearStr, moStr] = dateStr.split('-');
    const ceYear = parseInt(ceYearStr, 10);
    const beYear = ceYear + 543;
    const month = parseInt(moStr, 10);

    const resolvedBeYear = job.yearBe 
      ? (job.yearBe < 100 ? 2500 + job.yearBe : job.yearBe) 
      : beYear;
    const resolvedMonth = job.month || month;

    return {
      yearBe: resolvedBeYear,
      yearCe: ceYear,
      month: resolvedMonth,
      dateStr,
    };
  } catch {
    const ceYear = d.getFullYear();
    const beYear = ceYear + 543;
    const month = d.getMonth() + 1;
    const dateStr = d.toISOString().split('T')[0];
    return {
      yearBe: beYear,
      yearCe: ceYear,
      month,
      dateStr,
    };
  }
};

export default function JobsExecutiveCockpit({
  jobs = [],
  currentUser,
  userRole,
  onViewTable,
  onSelectJob,
}: JobsExecutiveCockpitProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Mode: 'cockpit' (Zero-Scroll 1 Screen) vs 'expanded' (Full-height scrollable report)
  const [viewMode, setViewMode] = useState<'cockpit' | 'expanded'>('cockpit');

  // Left Bottom Sub-Tab: 'types' | 'companies'
  const [leftBottomTab, setLeftBottomTab] = useState<'types' | 'companies'>('types');

  // Right Top Search
  const [strategicSearch, setStrategicSearch] = useState('');

  const now = useMemo(() => new Date(), []);
  const currentCEYear = now.getFullYear();
  const currentBEYear = currentCEYear + 543;
  const currentMonthNum = now.getMonth() + 1;

  // Local today string in Bangkok time (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Initialize filter state from searchParams if present, else default to 'all'
  const initialPeriod = (searchParams.get('period') as 'all' | 'year' | 'month' | 'date') || 'all';
  const initialYear = parseInt(searchParams.get('year') || '', 10) || currentBEYear;
  const initialMonth = parseInt(searchParams.get('month') || '', 10) || currentMonthNum;
  const initialDate = searchParams.get('date') || todayDateStr;

  const [period, setPeriod] = useState<'all' | 'year' | 'month' | 'date'>(initialPeriod);
  const [selectedYearBe, setSelectedYearBe] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Hidden date input ref for opening calendar picker
  const dateInputRef = useRef<HTMLInputElement>(null);

  // URL searchParams sync
  const updateUrlParams = (newPeriod: string, newYear: number, newMonth: number, newDate: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPeriod === 'all') {
        params.delete('period');
        params.delete('year');
        params.delete('month');
        params.delete('date');
      } else {
        params.set('period', newPeriod);
        if (newPeriod === 'year') {
          params.set('year', newYear.toString());
          params.delete('month');
          params.delete('date');
        } else if (newPeriod === 'month') {
          params.set('year', newYear.toString());
          params.set('month', newMonth.toString());
          params.delete('date');
        } else if (newPeriod === 'date') {
          params.set('date', newDate);
          params.delete('year');
          params.delete('month');
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handlePeriodChange = (newPeriod: 'all' | 'year' | 'month' | 'date') => {
    setPeriod(newPeriod);
    updateUrlParams(newPeriod, selectedYearBe, selectedMonth, selectedDate);
  };

  const handlePrevStep = () => {
    if (period === 'year') {
      const nextY = selectedYearBe - 1;
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, selectedMonth, selectedDate);
    } else if (period === 'month') {
      let nextM = selectedMonth - 1;
      let nextY = selectedYearBe;
      if (nextM < 1) {
        nextM = 12;
        nextY -= 1;
      }
      setSelectedMonth(nextM);
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, nextM, selectedDate);
    } else if (period === 'date') {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const nextDate = d.toISOString().split('T')[0];
      setSelectedDate(nextDate);
      updateUrlParams(period, selectedYearBe, selectedMonth, nextDate);
    }
  };

  const handleNextStep = () => {
    if (period === 'year') {
      const nextY = selectedYearBe + 1;
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, selectedMonth, selectedDate);
    } else if (period === 'month') {
      let nextM = selectedMonth + 1;
      let nextY = selectedYearBe;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      setSelectedMonth(nextM);
      setSelectedYearBe(nextY);
      updateUrlParams(period, nextY, nextM, selectedDate);
    } else if (period === 'date') {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];
      setSelectedDate(nextDate);
      updateUrlParams(period, selectedYearBe, selectedMonth, nextDate);
    }
  };

  const handleDateSelect = (val: string) => {
    if (!val) return;
    setSelectedDate(val);
    updateUrlParams(period, selectedYearBe, selectedMonth, val);
  };

  const handleResetToAll = () => {
    setPeriod('all');
    updateUrlParams('all', selectedYearBe, selectedMonth, selectedDate);
  };

  // Formatted Thai display for selected date in daily mode
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const [y, m, d] = selectedDate.split('-');
      const ceYear = parseInt(y, 10);
      const beYear = ceYear + 543;
      const monthIdx = parseInt(m, 10) - 1;
      const dayNum = parseInt(d, 10);
      return `${dayNum} ${THAI_SHORT_MONTHS[monthIdx] || ''} ${beYear}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Contextual Title for Tile 5 (Completed Jobs Throughput)
  const completedTileTitle = useMemo(() => {
    if (period === 'all') return 'งานปิดสมบูรณ์สะสม';
    if (period === 'year') return `งานปิดสำเร็จปี ${selectedYearBe}`;
    if (period === 'month') return `งานปิดสำเร็จ (${THAI_SHORT_MONTHS[selectedMonth - 1] || ''} ${selectedYearBe})`;
    if (period === 'date') return `งานปิดสำเร็จประจำวัน`;
    return 'งานปิดสำเร็จ';
  }, [period, selectedYearBe, selectedMonth]);

  // 1. Filter Jobs by Period (All, Year, Month, Date)
  const filteredJobs = useMemo(() => {
    if (period === 'all') return jobs;

    return jobs.filter((job) => {
      const parts = getJobDateParts(job);

      if (period === 'year') {
        const matchesBeYear =
          parts.yearBe === selectedYearBe ||
          job.yearBe === selectedYearBe ||
          job.yearBe === (selectedYearBe % 100) ||
          parts.yearCe === (selectedYearBe - 543);
        return matchesBeYear;
      }

      if (period === 'month') {
        const matchesBeYear =
          parts.yearBe === selectedYearBe ||
          job.yearBe === selectedYearBe ||
          job.yearBe === (selectedYearBe % 100) ||
          parts.yearCe === (selectedYearBe - 543);
        const matchesMonth = parts.month === selectedMonth || parts.month === selectedMonth;
        return matchesBeYear && matchesMonth;
      }

      if (period === 'date') {
        return parts.dateStr === selectedDate;
      }

      return true;
    });
  }, [jobs, period, selectedYearBe, selectedMonth, selectedDate]);

  // 2. Compute Active Jobs with SLA & Overdue Status from filteredJobs
  const processedJobs = useMemo(() => {
    return filteredJobs.map((job) => {
      const isCompleted = COMPLETED_STEPS.includes(job.currentStep);
      const updatedDate = new Date(job.updatedAt);
      const createdDate = new Date(job.createdAt);

      const daysInStatus = Math.max(
        0,
        Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const threshold = STEP_SLA[job.currentStep] || 5;
      const delayDays = Math.max(0, daysInStatus - threshold);
      const isBreached = !isCompleted && daysInStatus > threshold;

      let severity: 'critical' | 'high' | 'warning' | 'normal' = 'normal';
      if (isBreached) {
        if (delayDays >= 7 || daysInStatus >= threshold * 2) {
          severity = 'critical';
        } else if (delayDays >= 3) {
          severity = 'high';
        } else {
          severity = 'warning';
        }
      }

      const val =
        job.quotation?.totalAmountBeforeVat ||
        job.quotation?.actualClosingAmount ||
        job.project?.budget ||
        0;

      const isStrategic =
        val >= 500000 ||
        job.jobType === 'งานโปรเจค' ||
        job.jobType === 'งานตู้' ||
        !!job.project;

      const department = getJobDepartment(job.currentStep);

      return {
        ...job,
        isCompleted,
        daysInStatus,
        threshold,
        delayDays,
        isBreached,
        severity,
        val,
        isStrategic,
        department,
      };
    });
  }, [filteredJobs, now]);

  // Active vs Completed
  const activeJobs = useMemo(
    () => processedJobs.filter((j) => !j.isCompleted),
    [processedJobs]
  );
  const completedJobs = useMemo(
    () => processedJobs.filter((j) => j.isCompleted),
    [processedJobs]
  );

  // New jobs in past 7 days
  const newJobsPast7Days = useMemo(() => {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return activeJobs.filter((j) => new Date(j.createdAt) >= sevenDaysAgo).length;
  }, [activeJobs, now]);

  // On-track vs Delayed
  const delayedJobs = useMemo(
    () => activeJobs.filter((j) => j.isBreached).sort((a, b) => b.delayDays - a.delayDays),
    [activeJobs]
  );
  const onTrackJobs = useMemo(
    () => activeJobs.filter((j) => !j.isBreached),
    [activeJobs]
  );
  const onTrackPercent =
    activeJobs.length > 0 ? (onTrackJobs.length / activeJobs.length) * 100 : 100;
  const criticalDelayedCount = delayedJobs.filter((j) => j.severity === 'critical').length;

  // Strategic Projects
  const strategicJobs = useMemo(() => {
    return activeJobs
      .filter((j) => j.isStrategic)
      .sort((a, b) => b.val - a.val);
  }, [activeJobs]);

  const totalStrategicValue = strategicJobs.reduce((sum, j) => sum + j.val, 0);

  // Filtered Strategic Watchlist
  const filteredStrategicJobs = useMemo(() => {
    if (!strategicSearch.trim()) return strategicJobs;
    const q = strategicSearch.toLowerCase();
    return strategicJobs.filter(
      (j) =>
        j.customerName?.toLowerCase().includes(q) ||
        j.jobNumber?.toLowerCase().includes(q) ||
        j.sellerName?.toLowerCase().includes(q) ||
        j.item?.toLowerCase().includes(q)
    );
  }, [strategicJobs, strategicSearch]);

  // Completed jobs this month
  const currentMonthCompletedCount = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return completedJobs.filter((j) => {
      const d = new Date(j.dateClosed || j.updatedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [completedJobs, now]);

  // Department Workload Lifecycle
  const departmentWorkload = useMemo(() => {
    const map: Record<
      string,
      { department: string; count: number; delayedCount: number; criticalCount: number; totalDays: number }
    > = {};

    DEPT_ORDER.forEach((dept) => {
      map[dept] = { department: dept, count: 0, delayedCount: 0, criticalCount: 0, totalDays: 0 };
    });

    activeJobs.forEach((j) => {
      const dept = map[j.department] ? j.department : 'ฝ่ายบริการ / ช่าง';
      if (!map[dept]) {
        map[dept] = { department: dept, count: 0, delayedCount: 0, criticalCount: 0, totalDays: 0 };
      }
      map[dept].count += 1;
      map[dept].totalDays += j.daysInStatus;
      if (j.isBreached) map[dept].delayedCount += 1;
      if (j.severity === 'critical') map[dept].criticalCount += 1;
    });

    return Object.values(map).map((d) => ({
      ...d,
      avgDays: d.count > 0 ? Math.round(d.totalDays / d.count) : 0,
      fill: DEPT_COLORS[d.department] || '#64748b',
    }));
  }, [activeJobs]);

  // Top Bottleneck Department
  const topBottleneckDept = useMemo(() => {
    const sorted = [...departmentWorkload].sort((a, b) => b.delayedCount - a.delayedCount);
    return sorted.length > 0 && sorted[0].delayedCount > 0 ? sorted[0] : null;
  }, [departmentWorkload]);

  // Top Workload Department (overall count)
  const topWorkloadDept = useMemo(() => {
    const sorted = [...departmentWorkload].sort((a, b) => b.count - a.count);
    return sorted.length > 0 && sorted[0].count > 0 ? sorted[0] : null;
  }, [departmentWorkload]);

  // Upcoming Handover Jobs (active on-track jobs sorted by threshold usage)
  const upcomingDueJobs = useMemo(() => {
    return onTrackJobs
      .map((j) => ({
        ...j,
        remainingDays: Math.max(0, j.threshold - j.daysInStatus),
        ratio: j.threshold > 0 ? j.daysInStatus / j.threshold : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio);
  }, [onTrackJobs]);

  // Job Type Breakdown
  const jobTypesBreakdown = useMemo(() => {
    const map: Record<string, { type: string; count: number; value: number }> = {};
    activeJobs.forEach((j) => {
      const t = j.jobType || 'อื่นๆ';
      if (!map[t]) map[t] = { type: t, count: 0, value: 0 };
      map[t].count += 1;
      map[t].value += j.val;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [activeJobs]);

  // Company Code Breakdown
  const companyCodeBreakdown = useMemo(() => {
    const map: Record<string, { code: string; count: number; value: number }> = {};
    activeJobs.forEach((j) => {
      const c = j.companyCode || 'OTHER';
      if (!map[c]) map[c] = { code: c, count: 0, value: 0 };
      map[c].count += 1;
      map[c].value += j.val;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [activeJobs]);

  return (
    <div
      className={`flex-1 h-screen flex flex-col ${
        viewMode === 'cockpit' ? 'overflow-hidden' : 'overflow-y-auto'
      } bg-slate-50 font-ibm-thai relative select-none`}
    >
      {/* ── Compact Executive Top Header Bar (Unified Standard h-13) ── */}
      <header className="h-13 px-3 sm:px-4 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-20 shadow-xs gap-2">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 font-mono">
            Executive
          </span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
            <Briefcase size={15} className="text-red-600 shrink-0" />
            <span>Master Jobs Cockpit</span>
          </h1>

          <div className="hidden min-[1600px]:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs shrink-0">
            <span className="text-slate-400 font-medium">งานดำเนินงาน:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{activeJobs.length} งาน</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-medium">มูลค่าโครงการ:</span>
            <span className="font-bold text-red-600 font-mono text-sm">{formatSmart(totalStrategicValue)}</span>
          </div>
        </div>

        {/* Center: Symmetrical Date / Month / Year Filter Command Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 1. Period Granularity Segmented Pill */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-xs shrink-0">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'year', label: 'รายปี' },
              { id: 'month', label: 'รายเดือน' },
              { id: 'date', label: 'รายวัน' },
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id as any)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title={`กรองแบบ${p.label}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* 2. Unified Stepper / Navigator */}
          {period === 'all' ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-700 shadow-2xs font-medium whitespace-nowrap shrink-0">
              <Layers size={13} className="text-red-500 shrink-0" />
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
              {period === 'year' && (
                <span className="text-xs font-bold text-slate-800 px-2 min-w-[65px] text-center tracking-tight font-mono whitespace-nowrap shrink-0">
                  ปี {selectedYearBe}
                </span>
              )}

              {period === 'month' && (
                <div className="relative flex items-center shrink-0">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setSelectedMonth(m);
                      updateUrlParams('month', selectedYearBe, m, selectedDate);
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

              {period === 'date' && (
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

          {/* 3. Filtered Results Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 border border-slate-200/60 text-xs whitespace-nowrap shrink-0">
            <span className="text-slate-500 font-medium">พบ:</span>
            <span className="font-bold text-slate-900 font-mono">
              {filteredJobs.length}
            </span>
            <span className="text-slate-400 text-[10px]">งาน</span>
          </div>

          {/* 4. Reset Button (Only when filtered) */}
          {period !== 'all' && (
            <button
              onClick={handleResetToAll}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
              title="ล้างตัวกรอง (ดูงานทั้งหมด)"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Right: Header Actions & Mode Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Real-time Live Sync Engine */}
          <ExecutiveLiveSync />

          {/* View Switcher: Cockpit vs Expanded vs Operational Table */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('cockpit')}
              className={`px-2 py-1 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                viewMode === 'cockpit'
                  ? 'bg-white text-red-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="โหมดหน้าจอเดียว (Cockpit Zero-Scroll)"
            >
              <Monitor size={13} className="shrink-0" />
              <span className="text-[11px]">Cockpit</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'expanded' ? 'cockpit' : 'expanded')}
              className={`p-1 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${
                viewMode === 'expanded'
                  ? 'bg-white text-red-600 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={viewMode === 'expanded' ? 'ย่อเป็น Cockpit' : 'โหมดขยายเต็มจอ'}
            >
              <Maximize2 size={13} />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-0.5" />

            <button
              onClick={() =>
                onViewTable({
                  period,
                  yearBe: selectedYearBe,
                  month: selectedMonth,
                  date: selectedDate,
                })
              }
              className="px-2 py-1 rounded-lg text-xs transition-all flex items-center gap-1 text-slate-700 hover:text-red-600 hover:bg-white font-semibold cursor-pointer whitespace-nowrap"
              title="สลับไปดูตารางปฏิบัติการ (Operational Table)"
            >
              <Table size={13} className="shrink-0" />
              <span className="hidden sm:inline text-[11px]">ตารางปฏิบัติการ</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Symmetrical 6-Card Executive Metric Strip (3 Left + 3 Right) ── */}
      <div className="px-3 sm:px-4 pt-2.5 pb-1 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Tile 1: Active Jobs */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                งานที่ดำเนินงานทั้งหมด
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Briefcase size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                {activeJobs.length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono shrink-0">
                {period === 'date'
                  ? 'ประจำวันนี้'
                  : period === 'month'
                  ? `${THAI_SHORT_MONTHS[selectedMonth - 1] || ''}`
                  : `+${newJobsPast7Days} ใหม่/สัปดาห์`}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              {period === 'all'
                ? `จากทะเบียนงานทั้งหมด ${jobs.length} งาน`
                : `ช่วงเวลาที่เลือก: ${filteredJobs.length} งาน (ทั้งหมด ${jobs.length})`}
            </span>
          </div>

          {/* Tile 2: On-Track Execution */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                ดำเนินงานตรงเวลา
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
                {onTrackJobs.length} งานปกติ
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              ความเร็วและประสิทธิภาพตรงตามเกณฑ์ SLA
            </span>
          </div>

          {/* Tile 3: Delayed / At Risk */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                งานเกินเกณฑ์ / ล่าช้า
              </span>
              <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono tracking-tight leading-none">
                {delayedJobs.length}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${
                  criticalDelayedCount > 0
                    ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse font-black'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                วิกฤต {criticalDelayedCount} งาน
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              สัดส่วนล่าช้า {activeJobs.length > 0 ? ((delayedJobs.length / activeJobs.length) * 100).toFixed(1) : 0}% ของงานดำเนินงาน
            </span>
          </div>

          {/* Tile 4: Strategic Projects */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                โครงการยุทธศาสตร์
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Award size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {strategicJobs.length}
                </span>
                <span className="text-[10px] text-slate-500 font-normal">โครงการ</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-mono shrink-0">
                {formatSmart(totalStrategicValue)}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              ดีลขนาดใหญ่ & โครงการหลักขององค์กร
            </span>
          </div>

          {/* Tile 5: Monthly / Period Completed Throughput */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate" title={completedTileTitle}>
                {completedTileTitle}
              </span>
              <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                {completedJobs.length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono shrink-0">
                {filteredJobs.length > 0
                  ? `${((completedJobs.length / filteredJobs.length) * 100).toFixed(0)}% เสร็จสิ้น`
                  : '0%'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              {period === 'all'
                ? `รวมปิดสะสมทั้งสิ้น ${completedJobs.length} งาน`
                : `ปิดสำเร็จ ${completedJobs.length} จาก ${filteredJobs.length} งาน`}
            </span>
          </div>

          {/* Tile 6: Peak Workload / Bottleneck Department */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-[90px] hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                {topBottleneckDept ? 'แผนกที่คั่งค้างสูงสุด' : 'ภาระงานสูงสุดตามแผนก'}
              </span>
              <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Flame size={12} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {topBottleneckDept ? topBottleneckDept.delayedCount : topWorkloadDept ? topWorkloadDept.count : 0}
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {topBottleneckDept ? 'งานล่าช้า' : 'งานกำลังทำ'}
                </span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono shrink-0 truncate max-w-[90px]" title={topBottleneckDept?.department || topWorkloadDept?.department || 'ปกติ'}>
                {topBottleneckDept?.department || topWorkloadDept?.department || 'ปกติ'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 truncate leading-tight">
              {topBottleneckDept
                ? `เกินกำหนด ${topBottleneckDept.delayedCount} งาน (ค้างเฉลี่ย ${topBottleneckDept.avgDays} วัน)`
                : 'ทุกขั้นตอนดำเนินงานตามเกณฑ์มาตรฐาน SLA ปกติ'}
            </span>
          </div>
        </div>
      </div>

      {/* ── COCKPIT MODE: Balanced 50 / 50 Dual Column Grid (Zero-Scroll on Desktop) ── */}
      {viewMode === 'cockpit' ? (
        <main className="flex-1 min-h-0 px-4 py-2 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* ════════ LEFT COLUMN (6 Cols = 50% Symmetry): Workload Lifecycle & Product Mix ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* Left Top Card: Department Workload Pipeline BarChart */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[49%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Layers size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    การกระจายภาระงานตามแผนก (Department Workload Pipeline)
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
                  รวม {activeJobs.length} งานกำลังดำเนินงาน
                </span>
              </div>

              {/* BarChart */}
              <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentWorkload}
                    margin={{ top: 16, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800 text-[11px] font-ibm-thai">
                              <p className="font-bold text-xs mb-1 text-white">{label}</p>
                              <div className="space-y-1 text-slate-300">
                                <div className="flex items-center justify-between gap-3">
                                  <span>งานทั้งหมด:</span>
                                  <span className="font-mono text-white font-bold">{data.count} งาน</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>งานเกินเกณฑ์ SLA:</span>
                                  <span className="font-mono text-red-400 font-bold">{data.delayedCount} งาน</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>ระยะเวลาเฉลี่ยในสถานะ:</span>
                                  <span className="font-mono text-amber-300 font-bold">{data.avgDays} วัน</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="จำนวนงาน"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                      label={{ position: 'top', fill: '#475569', fontSize: 10, fontWeight: 700 }}
                    >
                      {departmentWorkload.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Left Bottom Card: Job Types & Company Mix */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0 gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setLeftBottomTab('types')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftBottomTab === 'types'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Package size={11} />
                    <span>สัดส่วนประเภทงาน (Job Types)</span>
                  </button>

                  <button
                    onClick={() => setLeftBottomTab('companies')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                      leftBottomTab === 'companies'
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FolderOpen size={11} />
                    <span>บริษัทในเครือ (Company Code)</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-mono font-medium">
                  {leftBottomTab === 'types'
                    ? `${jobTypesBreakdown.length} หมวดหมู่งาน`
                    : `${companyCodeBreakdown.length} รหัสบริษัท`}
                </span>
              </div>

              {/* Content Tab 1: Job Types */}
              {leftBottomTab === 'types' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {jobTypesBreakdown.map((item, idx) => {
                    const share = activeJobs.length > 0 ? (item.count / activeJobs.length) * 100 : 0;
                    return (
                      <div key={idx} className="p-1.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center font-mono shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">{item.type}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              ({item.count} งาน)
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-900 font-mono">
                            {formatSmart(item.value)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden my-0.5">
                          <div
                            className="bg-red-600 h-1 rounded-full"
                            style={{ width: `${Math.max(3, Math.min(100, share))}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>สัดส่วนงาน: {share.toFixed(1)}%</span>
                          <span>เฉลี่ย/งาน: <span className="font-mono font-bold text-slate-700">{formatSmart(item.count > 0 ? item.value / item.count : 0)}</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Content Tab 2: Company Codes */}
              {leftBottomTab === 'companies' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {companyCodeBreakdown.map((item, idx) => {
                    const share = activeJobs.length > 0 ? (item.count / activeJobs.length) * 100 : 0;
                    return (
                      <div key={idx} className="p-1.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold font-mono">
                              {item.code}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800">
                              {item.code === 'TP'
                                ? 'Tera Power (โซลาร์ & พลังงาน)'
                                : item.code === 'TG'
                                ? 'Tera Group (กลุ่มธุรกิจหลัก)'
                                : item.code === 'TE'
                                ? 'Tera Energy (วิศวกรรมพลังงาน)'
                                : 'บริษัททั่วไป'}
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
                          <span>จำนวน: <span className="font-bold text-slate-800 font-mono">{item.count} งาน</span> ({share.toFixed(1)}%)</span>
                          <span>เฉลี่ย/โครงการ: <span className="font-mono font-bold text-slate-700">{formatSmart(item.count > 0 ? item.value / item.count : 0)}</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ════════ RIGHT COLUMN (6 Cols = 50% Symmetry): Strategic Watchlist & Stalled Jobs ════════ */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">
            {/* Right Top Card: Strategic Projects Watchlist */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col h-[49%] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5">
                  <Award size={15} className="text-red-600" />
                  <h2 className="text-xs font-bold text-slate-900">
                    โครงการยุทธศาสตร์ที่ต้องติดตาม (Strategic Projects)
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

              {/* Strategic Projects Scrollable List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {filteredStrategicJobs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    ไม่พบโครงการยุทธศาสตร์ที่ตรงกับการค้นหา
                  </div>
                ) : (
                  filteredStrategicJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => onSelectJob(job.id)}
                      className="p-1.5 rounded-xl border border-slate-200/80 hover:border-red-300 hover:bg-red-50/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[9px] font-bold font-mono">
                            {job.jobNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                            {job.customerName}
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-red-600 font-mono shrink-0">
                          {formatCurrency(job.val)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                        <span className="truncate max-w-[200px]" title={job.item || job.jobType}>
                          {job.item || job.jobType}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {STEP_LABELS[job.currentStep] || job.currentStep}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            ผู้ดูแล: {job.sellerName || 'ไม่ระบุ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Bottom Card: Stalled Jobs & Escalation Action / SLA Watchlist */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1 shrink-0 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {delayedJobs.length > 0 ? (
                    <AlertTriangle size={15} className="text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  )}
                  <h2 className="text-xs font-bold text-slate-900 truncate">
                    {delayedJobs.length > 0
                      ? 'งานที่ค้างนานผิดปกติ (Stalled Jobs & Urgent Action)'
                      : 'การควบคุมเวลา & งานส่งมอบถัดไป (SLA Watchlist)'}
                  </h2>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono shrink-0 ${
                    delayedJobs.length > 0
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}
                >
                  {delayedJobs.length > 0 ? `เกินกำหนด ${delayedJobs.length} งาน` : 'SLA ปกติ 100%'}
                </span>
              </div>

              {/* Stalled Jobs or Proactive Handover Watchlist */}
              {delayedJobs.length === 0 ? (
                <div className="flex-1 min-h-0 flex flex-col justify-between py-1 space-y-1.5 overflow-hidden">
                  {/* SLA Health Banner */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-emerald-950 block leading-tight">
                        การควบคุมเวลาตาม SLA มีประสิทธิภาพ 100%
                      </span>
                      <span className="text-[9px] text-emerald-700 block leading-tight">
                        ไม่มีงานคั่งค้างเกินกำหนด • เฝ้าระวังงานที่ใกล้ถึงกำหนดส่งมอบตามแผน
                      </span>
                    </div>
                  </div>

                  {/* Proactive Handover Watchlist */}
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pb-1 shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-blue-600" />
                        <span>งานที่กำลังดำเนินงานและใกล้ครบกำหนด (Upcoming Due)</span>
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        เหลือเวลาตามเกณฑ์ SLA
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                      {upcomingDueJobs.slice(0, 4).map((job) => (
                        <div
                          key={job.id}
                          onClick={() => onSelectJob(job.id)}
                          className="p-1.5 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:border-slate-300 hover:bg-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-slate-900 font-mono text-[10px]">
                                {job.jobNumber}
                              </span>
                              <span className="text-[11px] font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                                {job.customerName}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 font-mono bg-blue-50 text-blue-700 border border-blue-100">
                              เหลือ {job.remainingDays} วัน (ทำมา {job.daysInStatus} วัน)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-700 font-medium">{job.department}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{STEP_LABELS[job.currentStep] || job.currentStep}</span>
                            </div>
                            <span className="font-mono text-slate-500">{job.sellerName || 'ไม่ระบุผู้ดูแล'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {delayedJobs.slice(0, 12).map((job) => (
                    <div
                      key={job.id}
                      onClick={() => onSelectJob(job.id)}
                      className="p-1.5 rounded-xl border border-red-100/90 bg-red-50/30 hover:border-red-300 hover:bg-red-50/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-900 font-mono text-[10px]">
                            {job.jobNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors">
                            {job.customerName}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 font-mono ${
                            job.severity === 'critical'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          +{job.delayDays} วัน (ค้าง {job.daysInStatus} วัน)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700 font-medium">{job.department}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{STEP_LABELS[job.currentStep] || job.currentStep}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-mono">{job.sellerName || 'ไม่ระบุผู้ดูแล'}</span>
                          <span className="font-bold text-red-600 bg-white border border-red-200 px-1.5 py-0.2 rounded-md shadow-2xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                            เร่งรัดด่วน
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
              <h2 className="text-base font-bold text-slate-900">รายงานภาพรวมงานทั้งหมดแบบขยายเต็ม</h2>
              <p className="text-xs text-slate-500">แสดงข้อมูลวิเคราะห์งานและโครงการเชิงลึกครบทุกมิติ</p>
            </div>
            <button
              onClick={() =>
                onViewTable({
                  period,
                  yearBe: selectedYearBe,
                  month: selectedMonth,
                  date: selectedDate,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Table size={14} />
              <span>เปิดตารางปฏิบัติการ (Operational Table)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Workload Lifecycle */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Layers size={16} className="text-red-600" />
                การกระจายภาระงานตามลำดับขั้นตอน (Workflow Lifecycle Distribution)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentWorkload}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="department" tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="งานทั้งหมด" radius={[6, 6, 0, 0]}>
                      {departmentWorkload.map((entry, index) => (
                        <Cell key={`cell-exp-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Job Types */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Package size={16} className="text-red-600" />
                สัดส่วนงานตามประเภท
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-56 custom-scrollbar pr-1">
                {jobTypesBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50">
                    <span className="font-semibold text-slate-800">{item.type}</span>
                    <span className="font-mono font-bold text-slate-900">{item.count} งาน ({formatSmart(item.value)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
