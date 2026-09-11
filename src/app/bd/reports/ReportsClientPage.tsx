"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getBDReportData, getBDTeamOverview, getBDTeamMembers } from '@/app/actions/bd-reports';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import Link from 'next/link';
import { getBdCombinedWorkload } from '@/app/actions/bd-combined';
import {
  BarChart3,
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  Download,
  RefreshCw,
  Calendar,
  ChevronRight,
  User,
  Users,
  FolderKanban,
  CheckCircle2,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  Ticket,
  MonitorPlay,
  ArrowUpRight,
  FileText,
  Percent,
  X,
  Sparkles,
  Target,
  Zap,
  Building2,
  Factory,
  ChevronDown,
  Flame,
  Search,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  currentUserId: string;
  canViewTeam: boolean;
}

// Clean emojis from strings to guarantee pure icon rendering
function stripEmojis(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{200D}]|[\u{FE0E}-\u{FE0F}]/gu, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim();
}

const PALETTE = {
  completed: '#10b981', // emerald-500
  inProgress: '#3b82f6', // blue-500
  pending: '#94a3b8',    // slate-400
  blocked: '#f43f5e',    // rose-500
  tickets: '#8b5cf6',    // violet-500
  warning: '#f59e0b',    // amber-500
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

// Custom modern tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-xl text-xs space-y-1">
        {label && <div className="font-bold text-slate-800 pb-1 border-b border-slate-100">{label}</div>}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsClientPage({ currentUserId, canViewTeam }: Props) {
  const [viewMode, setViewMode] = useState<'INDIVIDUAL' | 'TEAM'>(canViewTeam ? 'TEAM' : 'INDIVIDUAL');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [teamTaskStatus, setTeamTaskStatus] = useState<any[]>([]);
  const [ganttProjects, setGanttProjects] = useState<any[]>([]);
  const [projectProgress, setProjectProgress] = useState<any[]>([]);
  const [teamTicketSummary, setTeamTicketSummary] = useState<{
    completedThisMonth: number;
    assignedThisMonth: number;
    active: number;
  } | null>(null);

  const [liveWorkload, setLiveWorkload] = useState<any[]>([]);
  const [liveWorkloadLoading, setLiveWorkloadLoading] = useState(false);

  const [dateType, setDateType] = useState<'ASSIGNED' | 'COMPLETED'>('ASSIGNED');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    async function loadInitialData() {
      if (canViewTeam) {
        const membersRes = await getBDTeamMembers();
        if (membersRes.success && membersRes.data) {
          setTeamMembers(membersRes.data);
        }
      }
      loadReportData();
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [viewMode, selectedUserId, dateType, startDate, endDate]);

  const ganttTimeline = useMemo(() => {
    if (!ganttProjects || ganttProjects.length === 0) return null;
    const times = ganttProjects.flatMap(p => [new Date(p.startDate).getTime(), new Date(p.endDate).getTime()]);
    const minStart = Math.min(...times);
    let maxEnd = Math.max(...times);
    if (minStart === maxEnd) maxEnd = minStart + 86400000;
    return { minStart, maxEnd, totalDuration: maxEnd - minStart };
  }, [ganttProjects]);

  const loadLiveWorkload = async (filterOpts?: { startDate?: Date; endDate?: Date; dateType?: 'ASSIGNED' | 'COMPLETED' }) => {
    setLiveWorkloadLoading(true);
    try {
      const res = await getBdCombinedWorkload(filterOpts);
      if (res.success && res.data) {
        setLiveWorkload(res.data.userWorkloads);
      }
    } catch (e) {
      console.error("loadLiveWorkload exception:", e);
    }
    setLiveWorkloadLoading(false);
  };

  const loadReportData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const filterOpts = (startDate && endDate) ? {
        dateType,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      } : undefined;

      if (viewMode === 'TEAM') {
        const res = await getBDTeamOverview(filterOpts);
        if (res.success && res.data) {
          setTeamData(res.data.userStats || []);
          setTeamTaskStatus(res.data.teamTaskStatus || []);
          setGanttProjects(res.data.ganttProjects || []);
          setProjectProgress(res.data.projectProgress || []);
          setTeamTicketSummary(res.data.teamTicketSummary || null);
          loadLiveWorkload(filterOpts);
        } else {
          console.error("getBDTeamOverview failed:", res.error);
        }
      } else {
        const res = await getBDReportData(selectedUserId, undefined, undefined, filterOpts);
        if (res.success) {
          setReportData(res.data);
        } else {
          console.error("getBDReportData failed:", res.error);
        }
      }
    } catch (e) {
      console.error("loadReportData exception:", e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  // Helper for formatting local date to YYYY-MM-DD
  const formatDateToLocalISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Quick Date Presets
  const applyDatePreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'CLEAR') => {
    if (preset === 'CLEAR') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDateToLocalISO(start));
      setEndDate(formatDateToLocalISO(end));
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDateToLocalISO(start));
      setEndDate(formatDateToLocalISO(end));
    } else if (preset === 'THIS_QUARTER') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      setStartDate(formatDateToLocalISO(start));
      setEndDate(formatDateToLocalISO(end));
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (viewMode === 'TEAM') {
      if (teamData && teamData.length > 0) {
        const statsData = teamData.map((t: any) => ({
          Name: stripEmojis(t.fullName) || 'Unknown',
          'Active Projects': t.activeProjects || 0,
          'Active Tasks': t.activeTasks || 0,
          'Blocked Tasks': t.blockedTasks || 0,
          'Completed Tasks': t.completedThisMonth || 0,
          'Completed Projects': t.completedProjectsThisMonth || 0,
          'Tickets Completed (Month)': t.ticketsCompletedThisMonth || 0,
          'Tickets Assigned (Month)': t.ticketsAssignedThisMonth || 0,
          'Tickets Active': t.ticketsActive || 0,
          'Completion Rate (%)': t.completionPercentage || 0
        }));
        const wsStats = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, "Team Stats");
      }

      if (liveWorkload && liveWorkload.length > 0) {
        const liveWorkloadExportData = liveWorkload.map((bd: any) => ({
          Name: stripEmojis(bd.name) || 'Unknown',
          'Tickets Waiting': bd.tickets?.waiting || 0,
          'Tickets In Progress': bd.tickets?.inProgress || 0,
          'Tickets Completed (Month)': bd.tickets?.completedThisMonth || 0,
          'Tickets Completed (Today)': bd.tickets?.completedToday || 0,
          'Tickets Assigned (Month)': bd.tickets?.assignedThisMonth || 0,
          'Projects In Progress': bd.projects?.inProgress || 0,
          'Projects Remaining': bd.projects?.remaining || 0,
          'Project Progress (%)': bd.projects?.avgProgress || 0,
        }));
        const wsLive = XLSX.utils.json_to_sheet(liveWorkloadExportData);
        XLSX.utils.book_append_sheet(wb, wsLive, "Live Workload");
      }

      if (teamTaskStatus && teamTaskStatus.length > 0) {
        const taskStatusData = teamTaskStatus.map((ts: any) => ({
          Status: stripEmojis(ts.name) || 'Unknown',
          Count: ts.value || 0
        }));
        const wsTaskStatus = XLSX.utils.json_to_sheet(taskStatusData);
        XLSX.utils.book_append_sheet(wb, wsTaskStatus, "Task Status");
      }

      if (projectProgress && projectProgress.length > 0) {
        const projectProgressData = projectProgress.map((pp: any) => {
          const ganttData = ganttProjects?.find((g: any) => g.id === pp.id);
          const start = ganttData ? new Date(ganttData.startDate).toLocaleDateString('th-TH') : 'N/A';
          const end = ganttData ? new Date(ganttData.endDate).toLocaleDateString('th-TH') : 'N/A';
          const duration = ganttData ? Math.ceil((new Date(ganttData.endDate).getTime() - new Date(ganttData.startDate).getTime()) / (1000 * 3600 * 24)) : 0;

          return {
            'Project Name': stripEmojis(pp.name) || 'Unknown',
            'Owner': stripEmojis(pp.ownerName) || 'Unassigned',
            'Status': pp.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ',
            'Tasks': `${pp.completedTasks || 0} / ${pp.totalTasks || 0}`,
            'Sub Projects': `${pp.completedSubProjects || 0} / ${pp.totalSubProjects || 0}`,
            'Progress (%)': pp.progress || 0,
            'Start Date': start,
            'End Date': end,
            'Duration (Days)': duration
          };
        });
        const wsProjectProgress = XLSX.utils.json_to_sheet(projectProgressData);
        XLSX.utils.book_append_sheet(wb, wsProjectProgress, "Project Progress");
      }
    } else {
      if (reportData && reportData.kpi) {
        const summaryData = [{
          User: stripEmojis(reportData.targetUser?.fullName) || 'Unknown',
          'Active Projects': reportData.kpi.activeProjects || 0,
          'Active Tasks': reportData.kpi.activeTasks || 0,
          'Blocked Tasks': reportData.kpi.blockedTasks || 0,
          'Completed Tasks': reportData.kpi.completedThisMonth || 0,
          'Tickets Completed (Month)': reportData.kpi.completedTicketsThisMonth || 0,
          'Tickets Assigned (Month)': reportData.kpi.assignedTicketsThisMonth || 0,
          'Tickets Active': reportData.kpi.activeTickets || 0,
        }];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Performance Summary");

        if (reportData.charts) {
          if (reportData.charts.tasksByStatus && reportData.charts.tasksByStatus.length > 0) {
            const statusData = reportData.charts.tasksByStatus.map((ts: any) => ({
              Status: stripEmojis(ts.name) || 'Unknown',
              Count: ts.value || 0
            }));
            const wsStatus = XLSX.utils.json_to_sheet(statusData);
            XLSX.utils.book_append_sheet(wb, wsStatus, "Tasks by Status");
          }

          if (reportData.charts.competencies && reportData.charts.competencies.length > 0) {
            const compData = reportData.charts.competencies.map((c: any) => ({
              Subject: stripEmojis(c.subject) || 'Unknown',
              Count: c.A || 0,
              'Full Mark': c.fullMark || 100
            }));
            const wsComp = XLSX.utils.json_to_sheet(compData);
            XLSX.utils.book_append_sheet(wb, wsComp, "Skills & Competencies");
          }
        }
      }
    }

    if (wb.SheetNames.length === 0) {
      const wsEmpty = XLSX.utils.json_to_sheet([{ Message: "No data available for export" }]);
      XLSX.utils.book_append_sheet(wb, wsEmpty, "Data");
    }

    XLSX.writeFile(wb, `BD_Report_${viewMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const processedTrendData = useMemo(() => {
    if (!reportData || !reportData.charts || !reportData.charts.trendData) return [];
    const { completed, assigned, trendStartDate, trendEndDate } = reportData.charts.trendData;

    const start = trendStartDate ? new Date(trendStartDate) : new Date(new Date().setMonth(new Date().getMonth() - 5));
    const end = trendEndDate ? new Date(trendEndDate) : new Date();

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    const useDailyBuckets = diffDays <= 31;

    let buckets: any[] = [];

    if (useDailyBuckets) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        buckets.push({
          name: `${d.getDate()}/${d.getMonth() + 1}`,
          completed: 0,
          assigned: 0,
          dateString: d.toISOString().split('T')[0]
        });
      }
    } else {
      let d = new Date(start);
      d.setDate(1);
      while (d <= end || (d.getMonth() === end.getMonth() && d.getFullYear() === end.getFullYear())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        buckets.push({
          name: `${monthNames[d.getMonth()]} ${d.getFullYear() === new Date().getFullYear() ? '' : d.getFullYear()}`,
          completed: 0,
          assigned: 0,
          monthIndex: d.getMonth(),
          year: d.getFullYear()
        });
        d.setMonth(d.getMonth() + 1);
      }
    }

    completed.forEach((t: any) => {
      if (!t.completedAt) return;
      const tTime = new Date(t.completedAt);
      if (useDailyBuckets) {
        const dStr = tTime.toISOString().split('T')[0];
        const b = buckets.find(b => b.dateString === dStr);
        if (b) b.completed += 1;
      } else {
        const b = buckets.find(b => b.monthIndex === tTime.getMonth() && b.year === tTime.getFullYear());
        if (b) b.completed += 1;
      }
    });

    assigned.forEach((t: any) => {
      if (!t.createdAt) return;
      const tTime = new Date(t.createdAt);
      if (useDailyBuckets) {
        const dStr = tTime.toISOString().split('T')[0];
        const b = buckets.find(b => b.dateString === dStr);
        if (b) b.assigned += 1;
      } else {
        const b = buckets.find(b => b.monthIndex === tTime.getMonth() && b.year === tTime.getFullYear());
        if (b) b.assigned += 1;
      }
    });

    return buckets;
  }, [reportData]);

  const paddedCompetencies = useMemo(() => {
    if (!reportData?.charts?.competencies) return [];
    let data = [...reportData.charts.competencies].map(c => ({
      ...c,
      subject: stripEmojis(c.subject)
    }));
    if (data.length === 1) {
      data.push({ subject: ' ', A: 0, fullMark: 100 });
      data.push({ subject: '  ', A: 0, fullMark: 100 });
    } else if (data.length === 2) {
      data.push({ subject: ' ', A: 0, fullMark: 100 });
    }
    return data;
  }, [reportData]);

  const processedTeamData = useMemo(() => {
    return teamData.map(u => ({
      ...u,
      fullName: stripEmojis(u.fullName),
      firstName: stripEmojis(u.fullName).split(' ')[0]
    }));
  }, [teamData]);

  const aggregatedTeamStatus = useMemo(() => {
    if (!processedTeamData || processedTeamData.length === 0) return [];

    let totalTasks = 0;
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;

    processedTeamData.forEach((u: any) => {
      completed += u.completedThisMonth || 0;
      inProgress += u.activeTasks || 0;
      blocked += u.blockedTasks || 0;
    });

    totalTasks = completed + inProgress;

    return [
      {
        name: 'สถิติรวมของทีม',
        'งานทั้งหมด': totalTasks,
        'เสร็จสิ้น': completed,
        'กำลังดำเนินการ': inProgress,
        'ติดปัญหา': blocked
      }
    ];
  }, [processedTeamData]);

  const teamSummaryStats = useMemo(() => {
    if (!processedTeamData || processedTeamData.length === 0) return null;

    let totalTasks = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let blocked = 0;
    let sumCompletionPercentage = 0;

    processedTeamData.forEach((u: any) => {
      completed += u.completedThisMonth || 0;
      inProgress += u.inProgressTasks || 0;
      pending += u.pendingTasks || 0;
      blocked += u.blockedTasks || 0;
      sumCompletionPercentage += u.completionPercentage || 0;
    });

    totalTasks = completed + inProgress + pending;

    const avgProgress = processedTeamData.length > 0 ? Math.round(sumCompletionPercentage / processedTeamData.length) : 0;
    const completedPct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completed,
      completedPct,
      inProgress,
      remaining: inProgress + pending,
      avgProgress,
      blocked
    };
  }, [processedTeamData]);

  const selectedMemberName = useMemo(() => {
    if (viewMode === 'INDIVIDUAL') {
      const m = teamMembers.find(m => m.id === selectedUserId);
      return m ? stripEmojis(m.fullName) : reportData?.targetUser?.fullName ? stripEmojis(reportData.targetUser.fullName) : 'สมาชิกทีม';
    }
    return '';
  }, [viewMode, selectedUserId, teamMembers, reportData]);

  const activePreset = useMemo(() => {
    if (!startDate || !endDate) return null;
    const now = new Date();
    const tmStart = formatDateToLocalISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const tmEnd = formatDateToLocalISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    if (startDate === tmStart && endDate === tmEnd) return 'THIS_MONTH';

    const lmStart = formatDateToLocalISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lmEnd = formatDateToLocalISO(new Date(now.getFullYear(), now.getMonth(), 0));
    if (startDate === lmStart && endDate === lmEnd) return 'LAST_MONTH';

    const quarter = Math.floor(now.getMonth() / 3);
    const tqStart = formatDateToLocalISO(new Date(now.getFullYear(), quarter * 3, 1));
    const tqEnd = formatDateToLocalISO(new Date(now.getFullYear(), (quarter + 1) * 3, 0));
    if (startDate === tqStart && endDate === tqEnd) return 'THIS_QUARTER';

    return null;
  }, [startDate, endDate]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 md:p-8 space-y-6">
      {/* 1. Executive Hero Header */}
      <header className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Area */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-red-500/20 text-white flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Link href="/bd/dashboard" className="hover:text-red-600 transition-colors">Business Development</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800">รายงานและสถิติ (Reports & Analytics)</span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  รายงานและสถิติ BD
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Analytics Hub
                </span>
              </div>
            </div>
          </div>

          {/* Action Links & Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/bd/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">แดชบอร์ด</span>
            </Link>

            <Link
              href="/bd/kanban"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <KanbanSquare className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">กระดานงาน</span>
            </Link>

            <Link
              href="/bd/my-work"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">งานของฉัน</span>
            </Link>

            <button
              onClick={() => loadReportData()}
              disabled={refreshing}
              title="รีเฟรชข้อมูล"
              className="p-2 rounded-xl text-slate-500 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* 2. View Mode & Date Filter Controls */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left Side: View Mode & Member Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {canViewTeam ? (
              <div className="h-9 inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 shadow-2xs">
                <button
                  onClick={() => setViewMode('TEAM')}
                  className={`h-8 inline-flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'TEAM'
                      ? 'bg-white text-red-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>ภาพรวมของทีม</span>
                </button>
                <button
                  onClick={() => setViewMode('INDIVIDUAL')}
                  className={`h-8 inline-flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'INDIVIDUAL'
                      ? 'bg-white text-red-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>รายงานส่วนบุคคล</span>
                </button>
              </div>
            ) : (
              <div className="h-9 inline-flex items-center gap-1.5 px-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-200/70">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>รายงานส่วนบุคคล</span>
              </div>
            )}

            {/* Member Selector (when viewing individual and can view team) */}
            {viewMode === 'INDIVIDUAL' && canViewTeam && (
              <div className="relative h-9 inline-flex items-center">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl pl-8 pr-7 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer shadow-2xs appearance-none max-w-[190px] truncate"
                >
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{stripEmojis(m.fullName)}</option>
                  ))}
                </select>
                <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Right Side: Quick Presets & Date Inputs */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Presets */}
            <div className="h-9 hidden sm:inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 shadow-2xs">
              <button
                onClick={() => applyDatePreset(activePreset === 'THIS_MONTH' ? 'CLEAR' : 'THIS_MONTH')}
                className={`h-8 px-2.5 text-xs rounded-lg transition-all ${
                  activePreset === 'THIS_MONTH'
                    ? 'bg-white text-red-600 shadow-2xs font-bold'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                เดือนนี้
              </button>
              <button
                onClick={() => applyDatePreset(activePreset === 'LAST_MONTH' ? 'CLEAR' : 'LAST_MONTH')}
                className={`h-8 px-2.5 text-xs rounded-lg transition-all ${
                  activePreset === 'LAST_MONTH'
                    ? 'bg-white text-red-600 shadow-2xs font-bold'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                เดือนที่แล้ว
              </button>
              <button
                onClick={() => applyDatePreset(activePreset === 'THIS_QUARTER' ? 'CLEAR' : 'THIS_QUARTER')}
                className={`h-8 px-2.5 text-xs rounded-lg transition-all ${
                  activePreset === 'THIS_QUARTER'
                    ? 'bg-white text-red-600 shadow-2xs font-bold'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                ไตรมาสนี้
              </button>
            </div>

            {/* Date Inputs Box */}
            <div className="h-9 inline-flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="relative flex items-center">
                <select
                  value={dateType}
                  onChange={e => setDateType(e.target.value as any)}
                  className="text-xs font-semibold text-slate-700 bg-transparent outline-none pr-4 border-r border-slate-200 cursor-pointer appearance-none"
                >
                  <option value="ASSIGNED">วันที่มอบหมาย</option>
                  <option value="COMPLETED">กำหนดส่ง</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1 text-slate-400 pointer-events-none" />
              </div>

              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent outline-none w-[105px] cursor-pointer"
              />
              <span className="text-slate-300 text-xs select-none">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent outline-none w-[105px] cursor-pointer"
              />

              {(startDate || endDate) && (
                <button
                  onClick={() => applyDatePreset('CLEAR')}
                  title="ล้างช่วงเวลา"
                  className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm mx-auto mb-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">กำลังประมวลผลข้อมูลรายงาน...</h3>
          <p className="text-xs text-slate-500 mt-1">ระบบกำลังคำนวณสถิติและดึงข้อมูลภาระงานแบบเรียลไทม์</p>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* VIEW: TEAM OVERVIEW                                            */}
          {/* ============================================================== */}
          {viewMode === 'TEAM' ? (
            <div className="space-y-6">
              {/* Team KPI Cards (7 Metrics) */}
              {teamSummaryStats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
                  {/* 1. Total Tasks */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-500">งานทั้งหมด</span>
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FolderKanban className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {teamSummaryStats.totalTasks}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">รายการทั้งหมด</div>
                  </div>

                  {/* 2. Completed */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-emerald-700">แล้วเสร็จ</span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
                      {teamSummaryStats.completed}
                    </div>
                    <div className="text-[10.5px] font-semibold text-emerald-600 mt-0.5">
                      {teamSummaryStats.completedPct}% ของงานทั้งหมด
                    </div>
                  </div>

                  {/* 3. In Progress */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-blue-700">กำลังทำ</span>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 tracking-tight">
                      {teamSummaryStats.inProgress}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">รายการกำลังทำ</div>
                  </div>

                  {/* 4. Remaining */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-amber-700">คงเหลือ</span>
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
                      {teamSummaryStats.remaining}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">ยังไม่เริ่ม/ค้างอยู่</div>
                  </div>

                  {/* 5. Avg Progress */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">ความก้าวหน้า</span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {teamSummaryStats.avgProgress}%
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">เฉลี่ยทั้งทีม</div>
                  </div>

                  {/* 6. Blocked / Issues */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between border-b-2 border-b-rose-500">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-rose-700">ปัญหาที่พบ</span>
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-rose-600 tracking-tight">
                      {teamSummaryStats.blocked}
                    </div>
                    <div className="text-[10.5px] text-rose-600 font-medium mt-0.5">รายการติดขัด</div>
                  </div>

                  {/* 7. Tickets Completed */}
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-200/80 shadow-2xs flex flex-col justify-between border-b-2 border-b-purple-500 col-span-2 sm:col-span-3 lg:col-span-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-purple-700">Tickets ปิดงาน</span>
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <Ticket className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-purple-700 tracking-tight">
                      {teamTicketSummary?.completedThisMonth ?? 0}
                    </div>
                    <div className="text-[10.5px] text-purple-600 font-medium mt-0.5 truncate">
                      รับเข้า {teamTicketSummary?.assignedThisMonth ?? 0} งาน
                    </div>
                  </div>
                </div>
              )}

              {/* Live Workload Snapshot Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                      <MonitorPlay className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">ภาระงานแบบเรียลไทม์ (Live Workload Snapshot)</h3>
                      <p className="text-[11px] text-slate-500">สถานะงาน Tickets และ Projects ปัจจุบันของทีมงานทุกคน</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const filterOpts = (startDate && endDate) ? {
                          dateType,
                          startDate: new Date(startDate),
                          endDate: new Date(endDate)
                        } : undefined;
                        loadLiveWorkload(filterOpts);
                      }}
                      disabled={liveWorkloadLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${liveWorkloadLoading ? 'animate-spin text-red-600' : ''}`} />
                      <span>รีเฟรช</span>
                    </button>
                    <Link
                      href="/bd/tickets/tv"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all"
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      <span>View in TV Mode</span>
                    </Link>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200/80 text-xs text-slate-600 font-semibold">
                        <th className="px-5 py-3 whitespace-nowrap" rowSpan={2}>ชื่อพนักงาน</th>
                        <th className="px-4 py-2 text-center whitespace-nowrap border-l border-slate-200 bg-purple-50/50" colSpan={4}>
                          <div className="flex items-center justify-center gap-1.5 text-purple-700 font-bold">
                            <Ticket className="w-3.5 h-3.5" /> Support Tickets
                          </div>
                        </th>
                        <th className="px-4 py-2 text-center whitespace-nowrap border-l border-slate-200 bg-sky-50/50" colSpan={3}>
                          <div className="flex items-center justify-center gap-1.5 text-sky-700 font-bold">
                            <FolderKanban className="w-3.5 h-3.5" /> Projects / Tasks
                          </div>
                        </th>
                      </tr>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold">
                        <th className="px-3 py-2 text-center text-amber-700 border-l border-slate-200">รอทำ</th>
                        <th className="px-3 py-2 text-center text-blue-700">กำลังทำ</th>
                        <th className="px-3 py-2 text-center text-emerald-700">เสร็จสิ้น</th>
                        <th className="px-3 py-2 text-center text-purple-700">รับมอบ</th>
                        <th className="px-3 py-2 text-center text-blue-700 border-l border-slate-200">กำลังดำเนินการ</th>
                        <th className="px-3 py-2 text-center text-amber-700">คงเหลือ</th>
                        <th className="px-3 py-2 text-center text-slate-700">ความก้าวหน้า</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {liveWorkloadLoading && liveWorkload.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400">กำลังโหลดข้อมูลเรียลไทม์...</td>
                        </tr>
                      ) : liveWorkload.length > 0 ? (
                        liveWorkload.map((bd: any) => (
                          <tr key={bd.userId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-800 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {stripEmojis(bd.name).charAt(0) || 'U'}
                              </span>
                              <span className="truncate">{stripEmojis(bd.name)}</span>
                            </td>
                            <td className="px-3 py-3 text-center text-amber-700 font-bold border-l border-slate-100 bg-amber-50/20">{bd.tickets?.waiting || 0}</td>
                            <td className="px-3 py-3 text-center text-blue-700 font-bold bg-blue-50/20">{bd.tickets?.inProgress || 0}</td>
                            <td className="px-3 py-3 text-center font-bold bg-emerald-50/20">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-emerald-700 font-bold">{bd.tickets?.completedThisMonth || 0}</span>
                                {(bd.tickets?.completedToday || 0) > 0 && (
                                  <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap">
                                    วันนี้ +{bd.tickets.completedToday}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-purple-700 font-bold bg-purple-50/20">{bd.tickets?.assignedThisMonth || 0}</td>
                            <td className="px-3 py-3 text-center text-blue-700 font-bold border-l border-slate-100 bg-blue-50/20">{bd.projects?.inProgress || 0}</td>
                            <td className="px-3 py-3 text-center text-amber-700 font-bold bg-amber-50/20">{bd.projects?.remaining || 0}</td>
                            <td className="px-4 py-3 text-center bg-slate-50/30">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-sky-500 rounded-full transition-all"
                                    style={{ width: `${bd.projects?.avgProgress || 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 min-w-[2.2rem]">{bd.projects?.avgProgress || 0}%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400">ไม่มีข้อมูลภาระงาน</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts Row: Stacked Bar Chart & Task Status Pie */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stacked Bar Chart: ปริมาณงานรายคน */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">ปริมาณงานรายคน (Workload by Team Member)</h3>
                    </div>
                  </div>
                  <div className="h-72">
                    {processedTeamData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[...processedTeamData].sort((a, b) => ((b.completedThisMonth || 0) + (b.inProgressTasks || 0) + (b.pendingTasks || 0)) - ((a.completedThisMonth || 0) + (a.inProgressTasks || 0) + (a.pendingTasks || 0)))}
                          margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="firstName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11.5px' }} iconType="circle" align="right" />
                          <Bar dataKey="completedThisMonth" name="แล้วเสร็จ" stackId="a" fill={PALETTE.completed} barSize={32} />
                          <Bar dataKey="inProgressTasks" name="กำลังดำเนินการ" stackId="a" fill={PALETTE.inProgress} barSize={32} />
                          <Bar dataKey="pendingTasks" name="ยังไม่เริ่ม" stackId="a" fill={PALETTE.pending} radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </div>

                {/* Team Status Pie Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Percent className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">สถานะงานของทีม (Team Status)</h3>
                  </div>
                  <div className="h-72">
                    {teamTaskStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={teamTaskStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {teamTaskStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">ไม่มีข้อมูลสถานะงาน</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Ranking List & Workload Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Team List */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">PERFORMANCE ทีม (อัตราส่งงานเสร็จ)</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">เรียงตาม % สำเร็จ</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {[...processedTeamData]
                      .sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0))
                      .map((user: any, index: number) => {
                        const pct = user.completionPercentage || 0;

                        let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                        let badgeText = 'รอเริ่ม';

                        if (pct > 0 && pct < 60) {
                          badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                          badgeText = 'ต้องปรับปรุง';
                        } else if (pct >= 60 && pct < 80) {
                          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                          badgeText = 'ปานกลาง';
                        } else if (pct >= 80) {
                          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          badgeText = 'ดีมาก';
                        }

                        const initial = user.firstName ? user.firstName.charAt(0) : 'U';

                        return (
                          <div key={user.userId} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-amber-100 text-amber-800' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-amber-50 text-amber-700' : 'text-slate-400'
                                }`}>
                                {index + 1}
                              </span>
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {initial}
                              </div>
                              <div className="text-xs font-semibold text-slate-800 truncate">{user.fullName}</div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-800 min-w-[36px] text-right">{pct}%</span>
                              <span className={`px-2.5 py-0.5 text-[10.5px] font-semibold rounded-md border min-w-[76px] text-center ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    }
                    {processedTeamData.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">ไม่มีข้อมูลทีม</div>
                    )}
                  </div>
                </div>

                {/* Overall Task Status Horizontal Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">ภาพรวมสถานะงานทั้งหมด (Overall Task Status)</h3>
                  </div>
                  <div className="h-64">
                    {aggregatedTeamStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggregatedTeamStatus} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11.5, fill: '#334155', fontWeight: 600 }} />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                          <Bar dataKey="งานทั้งหมด" name="งานทั้งหมด" fill="#64748b" radius={[0, 4, 4, 0]} barSize={16} />
                          <Bar dataKey="เสร็จสิ้น" name="เสร็จสิ้น" fill={PALETTE.completed} radius={[0, 4, 4, 0]} barSize={16} />
                          <Bar dataKey="กำลังดำเนินการ" name="กำลังดำเนินการ" fill={PALETTE.inProgress} radius={[0, 4, 4, 0]} barSize={16} />
                          <Bar dataKey="ติดปัญหา" name="ติดปัญหา" fill={PALETTE.blocked} radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Progress Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">ความคืบหน้าโครงการ (Project Progress)</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    แสดง {projectProgress.length} โครงการ
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="px-4 py-3 rounded-l-xl">ชื่อโครงการ</th>
                        <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                        <th className="px-4 py-3">สถานะ</th>
                        <th className="px-4 py-3 text-center">งานย่อย</th>
                        <th className="px-4 py-3 text-center">โครงการย่อย</th>
                        <th className="px-4 py-3 rounded-r-xl min-w-[180px]">ความก้าวหน้า</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {projectProgress.length > 0 ? projectProgress.map((proj: any) => (
                        <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{stripEmojis(proj.name)}</td>
                          <td className="px-4 py-3 text-slate-600">{stripEmojis(proj.ownerName) || 'ยังไม่ระบุ'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[10.5px] rounded-md font-semibold border ${proj.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              {proj.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600">{proj.completedTasks} / {proj.totalTasks}</td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600">{proj.completedSubProjects} / {proj.totalSubProjects}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${proj.progress}%` }} />
                              </div>
                              <span className="font-bold text-slate-700 text-xs min-w-[36px] text-right">{proj.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">ไม่มีโครงการที่กำลังดำเนินการ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gantt Chart Timeline */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">ไทม์ไลน์โครงการ (Gantt Chart Timeline)</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">แผนการดำเนินงาน</span>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[700px] space-y-3">
                    {ganttProjects.length > 0 && ganttTimeline ? ganttProjects.map((proj: any) => {
                      const start = new Date(proj.startDate).getTime();
                      const end = new Date(proj.endDate).getTime();

                      const leftPercent = ((start - ganttTimeline.minStart) / ganttTimeline.totalDuration) * 100;
                      const widthPercent = Math.max(3, ((end - start) / ganttTimeline.totalDuration) * 100);

                      return (
                        <div key={proj.id} className="group">
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1 px-1">
                            <span className="font-semibold text-slate-800 truncate max-w-[320px]">
                              {stripEmojis(proj.name)}
                            </span>
                            <span className="text-slate-400 font-mono text-[10.5px]">
                              {new Date(proj.startDate).toLocaleDateString('th-TH')} - {new Date(proj.endDate).toLocaleDateString('th-TH')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-xl h-7 relative overflow-hidden border border-slate-200/60">
                            <div
                              className="absolute top-0 bottom-0 rounded-lg flex items-center px-3 text-white text-[10.5px] font-semibold whitespace-nowrap overflow-hidden transition-all shadow-xs hover:brightness-105"
                              style={{
                                backgroundColor: proj.color || '#3b82f6',
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`
                              }}
                              title={`${stripEmojis(proj.name)}\nเริ่มต้น: ${new Date(proj.startDate).toLocaleDateString('th-TH')}\nสิ้นสุด: ${new Date(proj.endDate).toLocaleDateString('th-TH')}`}
                            >
                              {widthPercent > 12 ? stripEmojis(proj.name) : ''}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-xs text-slate-400">ไม่มีข้อมูลไทม์ไลน์</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* VIEW: INDIVIDUAL MEMBER REPORT                                 */
            /* ============================================================== */
            reportData && (
              <div className="space-y-6">
                {/* Member Header Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                      {selectedMemberName.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        รายงานของ {selectedMemberName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {reportData.targetUser?.role || 'Business Development'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      ช่วงเวลา: {startDate && endDate ? `${startDate} ถึง ${endDate}` : 'เดือนปัจจุบัน'}
                    </span>
                  </div>
                </div>

                {/* 5 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* 1. Active Projects */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-500">โครงการที่รับผิดชอบ</span>
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FolderKanban className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {reportData.kpi.activeProjects}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">โครงการกำลังทำ</div>
                  </div>

                  {/* 2. Active Tasks */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-blue-700">งานที่กำลังทำ</span>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 tracking-tight">
                      {reportData.kpi.activeTasks}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">งานย่อย Active</div>
                  </div>

                  {/* 3. Blocked Tasks */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between border-b-2 border-b-rose-500">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-rose-700">งานที่ติดปัญหา</span>
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-rose-600 tracking-tight">
                      {reportData.kpi.blockedTasks}
                    </div>
                    <div className="text-[10.5px] text-rose-600 font-medium mt-0.5">รายการต้องแก้ไข</div>
                  </div>

                  {/* 4. Completed Tasks */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-emerald-700">งานที่เสร็จสิ้น</span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                      {reportData.kpi.completedThisMonth}
                    </div>
                    <div className="text-[10.5px] text-emerald-600 font-medium mt-0.5">แล้วเสร็จช่วงนี้</div>
                  </div>

                  {/* 5. Completed Tickets */}
                  <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-2xs flex flex-col justify-between border-b-2 border-b-purple-500 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-purple-700">Tickets เสร็จสิ้น</span>
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <Ticket className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 tracking-tight">
                      {reportData.kpi.completedTicketsThisMonth || 0}
                    </div>
                    <div className="text-[10.5px] text-purple-600 font-medium mt-0.5 truncate">
                      รับเข้า {reportData.kpi.assignedTicketsThisMonth || 0} งาน
                    </div>
                  </div>
                </div>

                {/* Charts Grid: Historical & Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Historical Performance */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">ผลงานย้อนหลัง (Historical Performance)</h3>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-5} />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11.5px' }} iconType="circle" />
                          <Bar dataKey="completed" name="งานที่เสร็จสิ้น" fill={PALETTE.completed} radius={[6, 6, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Growth & Trends Line Chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">แนวโน้มการส่งมอบงาน (Growth & Trends)</h3>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={processedTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-5} />
                          <RechartsTooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11.5px' }} iconType="circle" />
                          <Line type="monotone" dataKey="assigned" name="งานที่ได้รับมอบหมาย" stroke={PALETTE.inProgress} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="completed" name="งานที่เสร็จสิ้น" stroke={PALETTE.completed} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Row 2: Competencies & Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Skills & Competencies Radar Chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">ทักษะและความเชี่ยวชาญ (Skills & Competencies)</h3>
                    </div>
                    <div className="h-72">
                      {reportData.charts.competencies && reportData.charts.competencies.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={paddedCompetencies}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Radar name="งานที่ทำสำเร็จ" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                            <RechartsTooltip content={<CustomChartTooltip />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">ยังไม่มีข้อมูลผลงานที่เสร็จสมบูรณ์</div>
                      )}
                    </div>
                  </div>

                  {/* Task Status Breakdown Donut */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Percent className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">สัดส่วนสถานะงาน (Task Status Breakdown)</h3>
                    </div>
                    <div className="h-72">
                      {reportData.charts.tasksByStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.charts.tasksByStatus.map((t: any) => ({
                                ...t,
                                name: stripEmojis(t.name)
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                              nameKey="name"
                            >
                              {reportData.charts.tasksByStatus.map((_entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip content={<CustomChartTooltip />} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">ไม่มีข้อมูล</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Blocked Tasks List Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-rose-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>รายการงานที่ติดปัญหา (Blocked Tasks)</span>
                    </div>
                    <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      {reportData.blockedTasksList?.length || 0} รายการ
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="px-5 py-3">โครงการ</th>
                          <th className="px-5 py-3">งาน</th>
                          <th className="px-5 py-3">สาเหตุที่ติดปัญหา</th>
                          <th className="px-5 py-3">รอจาก</th>
                          <th className="px-5 py-3 text-right">จำนวนวันที่ติดปัญหา</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {reportData.blockedTasksList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-emerald-600 font-semibold">
                              ไม่มีงานที่ติดปัญหาในขณะนี้ ยอดเยี่ยมมาก!
                            </td>
                          </tr>
                        ) : (
                          reportData.blockedTasksList.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-3.5 font-semibold text-slate-800">{stripEmojis(t.projectName)}</td>
                              <td className="px-5 py-3.5 text-slate-700">{stripEmojis(t.name)}</td>
                              <td className="px-5 py-3.5 text-rose-600 font-medium">{stripEmojis(t.blockedReason)}</td>
                              <td className="px-5 py-3.5 text-slate-600">{stripEmojis(t.waitingOn) || '-'}</td>
                              <td className="px-5 py-3.5 text-right">
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                                  {t.daysBlocked} วัน
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
