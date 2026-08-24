"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getBDReportData, getBDTeamOverview, getBDTeamMembers } from '@/app/actions/bd-reports';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import Link from 'next/link';
import { getBdCombinedWorkload } from '@/app/actions/bd-combined';
import { RefreshCw, MonitorPlay, Ticket, FolderKanban, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  currentUserId: string;
  canViewTeam: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportsClientPage({ currentUserId, canViewTeam }: Props) {
  const [viewMode, setViewMode] = useState<'INDIVIDUAL' | 'TEAM'>(canViewTeam ? 'TEAM' : 'INDIVIDUAL');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [teamTaskStatus, setTeamTaskStatus] = useState<any[]>([]);
  const [ganttProjects, setGanttProjects] = useState<any[]>([]);
  const [projectProgress, setProjectProgress] = useState<any[]>([]);

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

  const loadLiveWorkload = async () => {
    setLiveWorkloadLoading(true);
    try {
      const res = await getBdCombinedWorkload();
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
          loadLiveWorkload();
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
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (viewMode === 'TEAM') {
      if (teamData && teamData.length > 0) {
        const statsData = teamData.map((t: any) => ({
          Name: t.fullName || 'Unknown',
          'Active Projects': t.activeProjects || 0,
          'Active Tasks': t.activeTasks || 0,
          'Blocked Tasks': t.blockedTasks || 0,
          'Completed Tasks': t.completedThisMonth || 0,
          'Completed Projects': t.completedProjectsThisMonth || 0,
          'Completion Rate (%)': t.completionPercentage || 0
        }));
        const wsStats = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, "Team Stats");
      }

      if (teamTaskStatus && teamTaskStatus.length > 0) {
        const taskStatusData = teamTaskStatus.map((ts: any) => ({
          Status: ts.name || 'Unknown',
          Count: ts.value || 0
        }));
        const wsTaskStatus = XLSX.utils.json_to_sheet(taskStatusData);
        XLSX.utils.book_append_sheet(wb, wsTaskStatus, "Task Status");
      }

      if (projectProgress && projectProgress.length > 0) {
        const projectProgressData = projectProgress.map((pp: any) => {
          const ganttData = ganttProjects?.find((g: any) => g.id === pp.id);
          const startDate = ganttData ? new Date(ganttData.startDate).toLocaleDateString('th-TH') : 'N/A';
          const endDate = ganttData ? new Date(ganttData.endDate).toLocaleDateString('th-TH') : 'N/A';
          const duration = ganttData ? Math.ceil((new Date(ganttData.endDate).getTime() - new Date(ganttData.startDate).getTime()) / (1000 * 3600 * 24)) : 0;

          return {
            'Project Name': pp.name || 'Unknown',
            'Owner': pp.ownerName || 'Unassigned',
            'Status': pp.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ',
            'Tasks': `${pp.completedTasks || 0} / ${pp.totalTasks || 0}`,
            'Sub Projects': `${pp.completedSubProjects || 0} / ${pp.totalSubProjects || 0}`,
            'Progress (%)': pp.progress || 0,
            'Start Date': startDate,
            'End Date': endDate,
            'Duration (Days)': duration
          };
        });
        const wsProjectProgress = XLSX.utils.json_to_sheet(projectProgressData);
        XLSX.utils.book_append_sheet(wb, wsProjectProgress, "Project Progress");
      }
    } else {
      if (reportData && reportData.summary) {
        const summaryData = [{
          'Total Assigned Tasks': reportData.summary.totalAssignedTasks || 0,
          'Total Completed Tasks': reportData.summary.totalCompletedTasks || 0,
          'Completion Rate (%)': reportData.summary.completionRate || 0,
          'Avg Days to Complete': reportData.summary.avgCompletionDays || 0
        }];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Performance Summary");

        if (reportData.charts) {
          if (reportData.charts.tasksByStatus && reportData.charts.tasksByStatus.length > 0) {
            const statusData = reportData.charts.tasksByStatus.map((ts: any) => ({
              Status: ts.name || 'Unknown',
              Count: ts.value || 0
            }));
            const wsStatus = XLSX.utils.json_to_sheet(statusData);
            XLSX.utils.book_append_sheet(wb, wsStatus, "Tasks by Status");
          }

          if (reportData.charts.competencies && reportData.charts.competencies.length > 0) {
            const compData = reportData.charts.competencies.map((c: any) => ({
              Subject: c.subject || 'Unknown',
              Count: c.A || 0,
              'Full Mark': c.fullMark || 100
            }));
            const wsComp = XLSX.utils.json_to_sheet(compData);
            XLSX.utils.book_append_sheet(wb, wsComp, "Skills & Competencies");
          }
        }
      }

      if (liveWorkload && liveWorkload.length > 0) {
        const workload = liveWorkload.find(w => w.userId === selectedUserId);
        if (workload) {
          const wlData = [{
            'Active Projects': workload.activeProjectsCount || 0,
            'Pending Tasks': workload.pendingTasksCount || 0,
            'Support Tickets': workload.assignedTicketsCount || 0
          }];
          const wsWorkload = XLSX.utils.json_to_sheet(wlData);
          XLSX.utils.book_append_sheet(wb, wsWorkload, "Current Workload");
        }
      }

      if (processedTrendData && processedTrendData.length > 0) {
        const trendData = processedTrendData.map((t: any) => ({
          Period: t.name || 'Unknown',
          'Assigned': t.assigned || 0,
          'Completed': t.completed || 0
        }));
        const wsTrend = XLSX.utils.json_to_sheet(trendData);
        XLSX.utils.book_append_sheet(wb, wsTrend, "Trend Data");
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
      // Create daily buckets
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        buckets.push({
          name: `${d.getDate()}/${d.getMonth() + 1}`,
          completed: 0,
          assigned: 0,
          dateString: d.toISOString().split('T')[0]
        });
      }
    } else {
      // Create monthly buckets
      let d = new Date(start);
      d.setDate(1); // normalized
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
    let data = [...reportData.charts.competencies];
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
      firstName: u.fullName.split(' ')[0]
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานและสถิติ BD</h1>
            <p className="text-gray-500 text-sm mt-1">ติดตามผลการดำเนินงานและปัญหาที่ติดขัด</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-wrap lg:flex-nowrap items-start lg:items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Date Picker UI */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
              <select
                value={dateType}
                onChange={e => setDateType(e.target.value as any)}
                className="text-sm bg-transparent outline-none pl-2 pr-1 border-r border-gray-200 text-gray-700"
              >
                <option value="ASSIGNED">วันที่มอบหมาย</option>
                <option value="COMPLETED">กำหนดส่ง (Due Date)</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-sm outline-none px-2 text-gray-700 bg-transparent"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-sm outline-none px-2 text-gray-700 bg-transparent"
              />
            </div>

            {canViewTeam && (
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setViewMode('TEAM')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'TEAM' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  ภาพรวมของทีม
                </button>
                <button
                  onClick={() => setViewMode('INDIVIDUAL')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'INDIVIDUAL' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  รายงานส่วนบุคคล
                </button>
              </div>
            )}

            {viewMode === 'INDIVIDUAL' && canViewTeam && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">กำลังโหลดข้อมูลรายงาน...</div>
        ) : (
          <>
            {viewMode === 'TEAM' ? (
              <div className="space-y-6">

                {teamSummaryStats && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">งานทั้งหมด</div>
                      <div className="text-2xl font-bold text-gray-900">{teamSummaryStats.totalTasks}</div>
                      <div className="text-xs text-gray-400 mt-1">รายการ</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">แล้วเสร็จ</div>
                      <div className="text-2xl font-bold text-gray-900">{teamSummaryStats.completed}</div>
                      <div className="text-xs text-gray-400 mt-1">{teamSummaryStats.completedPct}%</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">กำลังดำเนินการ</div>
                      <div className="text-2xl font-bold text-gray-900">{teamSummaryStats.inProgress}</div>
                      <div className="text-xs text-gray-400 mt-1">รายการ</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">คงเหลือ</div>
                      <div className="text-2xl font-bold text-gray-900">{teamSummaryStats.remaining}</div>
                      <div className="text-xs text-gray-400 mt-1">รายการ</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">avg progress</div>
                      <div className="text-2xl font-bold text-gray-900">{teamSummaryStats.avgProgress}%</div>
                      <div className="text-xs text-gray-400 mt-1">เฉลี่ยทีม</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">ปัญหาที่พบ</div>
                      <div className="text-2xl font-bold text-gray-900">{teamSummaryStats.blocked}</div>
                      <div className="text-xs text-gray-400 mt-1">รายการ</div>
                    </div>
                  </div>
                )}

                {/* Live Workload Snapshot */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MonitorPlay className="w-5 h-5 text-gray-500" />
                      <h3 className="text-base font-semibold text-gray-800">ภาระงานแบบเรียลไทม์ (Live Workload Snapshot)</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={loadLiveWorkload}
                        disabled={liveWorkloadLoading}
                        className="text-gray-500 hover:text-gray-800 flex items-center gap-1.5 text-sm font-medium transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${liveWorkloadLoading ? 'animate-spin' : ''}`} />
                        รีเฟรช
                      </button>
                      <Link
                        href="/bd/tickets/tv"
                        target="_blank"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <MonitorPlay className="w-4 h-4" />
                        View in TV mode
                      </Link>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-gray-200 text-sm text-gray-500 font-medium">
                          <th className="px-6 py-4 whitespace-nowrap" rowSpan={2}>ชื่อพนักงาน</th>
                          <th className="px-6 py-4 text-center whitespace-nowrap border-l border-gray-200" colSpan={3}>
                            <div className="flex items-center justify-center gap-2 text-purple-600">
                              <Ticket className="w-4 h-4" /> Support Tickets
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center whitespace-nowrap border-l border-gray-200" colSpan={3}>
                            <div className="flex items-center justify-center gap-2 text-sky-600">
                              <FolderKanban className="w-4 h-4" /> Projects / Tasks
                            </div>
                          </th>
                        </tr>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                          <th className="px-4 py-3 text-center text-orange-600 border-l border-gray-200">รอดำเนินการ</th>
                          <th className="px-4 py-3 text-center text-blue-600">กำลังดำเนินการ</th>
                          <th className="px-4 py-3 text-center text-green-600">เสร็จสิ้นวันนี้</th>
                          <th className="px-4 py-3 text-center text-blue-600 border-l border-gray-200">กำลังดำเนินการ</th>
                          <th className="px-4 py-3 text-center text-orange-600">คงเหลือ</th>
                          <th className="px-4 py-3 text-center">ความคืบหน้า</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {liveWorkloadLoading && liveWorkload.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-500">กำลังโหลดข้อมูลเรียลไทม์...</td>
                          </tr>
                        ) : liveWorkload.length > 0 ? (
                          liveWorkload.map((bd: any) => (
                            <tr key={bd.userId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{bd.name}</td>
                              <td className="px-4 py-4 text-sm text-center text-orange-600 font-medium border-l border-gray-100 bg-orange-50/30">{bd.tickets.waiting}</td>
                              <td className="px-4 py-4 text-sm text-center text-blue-600 font-medium bg-blue-50/30">{bd.tickets.inProgress}</td>
                              <td className="px-4 py-4 text-sm text-center text-green-600 font-medium bg-green-50/30">{bd.tickets.completedToday}</td>
                              <td className="px-4 py-4 text-sm text-center text-blue-600 font-medium border-l border-gray-100 bg-blue-50/30">{bd.projects.inProgress}</td>
                              <td className="px-4 py-4 text-sm text-center text-orange-600 font-medium bg-orange-50/30">{bd.projects.remaining}</td>
                              <td className="px-4 py-4 text-center bg-gray-50/50">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-sky-500 rounded-full"
                                      style={{ width: `${bd.projects.avgProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 min-w-[2.5rem]">{bd.projects.avgProgress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-500">ไม่มีข้อมูลภาระงาน</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stacked Bar Chart: ปริมาณงานรายคน */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">ปริมาณงานรายคน</h3>
                  <div className="h-72">
                    {processedTeamData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...processedTeamData].sort((a, b) => ((b.completedThisMonth || 0) + (b.inProgressTasks || 0) + (b.pendingTasks || 0)) - ((a.completedThisMonth || 0) + (a.inProgressTasks || 0) + (a.pendingTasks || 0)))} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="firstName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px' }} iconType="square" align="right" />
                          <Bar dataKey="completedThisMonth" name="แล้วเสร็จ" stackId="a" fill="#10B981" barSize={40} />
                          <Bar dataKey="inProgressTasks" name="กำลังดำเนินการ" stackId="a" fill="#3B82F6" barSize={40} />
                          <Bar dataKey="pendingTasks" name="ยังไม่เริ่ม" stackId="a" fill="#D1D5DB" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </div>

                {/* Performance Team List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-500 mb-4 uppercase">PERFORMANCE ทีม (อัตราส่งงานเสร็จ)</h3>
                  <div className="flex flex-col">
                    {[...processedTeamData]
                      .sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0))
                      .map((user: any, index: number) => {
                        const pct = user.completionPercentage || 0;

                        let badgeColor = 'bg-blue-100 text-blue-700';
                        let badgeText = 'รอเริ่ม';

                        if (pct > 0 && pct < 60) {
                          badgeColor = 'bg-red-100 text-red-700';
                          badgeText = 'ต้องปรับปรุง';
                        } else if (pct >= 60 && pct < 80) {
                          badgeColor = 'bg-yellow-100 text-yellow-700';
                          badgeText = 'ปานกลาง';
                        } else if (pct >= 80) {
                          badgeColor = 'bg-green-100 text-green-700';
                          badgeText = 'ดีมาก';
                        }

                        const avatarColors = [
                          'bg-green-200 text-green-800',
                          'bg-blue-200 text-blue-800',
                          'bg-yellow-200 text-yellow-800',
                          'bg-pink-200 text-pink-800',
                          'bg-indigo-200 text-indigo-800',
                          'bg-purple-200 text-purple-800',
                          'bg-orange-200 text-orange-800',
                        ];
                        const avatarColor = avatarColors[index % avatarColors.length];
                        const initial = user.firstName ? user.firstName.charAt(0) : 'U';

                        return (
                          <div key={user.userId} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${avatarColor}`}>
                                {initial}
                              </div>
                              <div className="text-sm font-medium text-gray-800">{user.fullName}</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500 font-medium">{pct}%</span>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full min-w-[90px] text-center ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    }
                    {processedTeamData.length === 0 && (
                      <div className="text-center py-4 text-gray-500">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </div>


                {/* 1. Bar Chart & Pie Chart Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Task Status Pie Chart */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">สถานะงานของทีม (Team Status)</h3>
                    <div className="h-64">
                      {teamTaskStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={teamTaskStatus}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {teamTaskStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">ไม่มีข้อมูลสถานะงาน</div>
                      )}
                    </div>
                  </div>

                  {/* Workload Bar Chart */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2 overflow-hidden">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">ภาระงานแต่ละบุคคล (Workload & Distribution)</h3>
                    <div className="overflow-x-auto">
                      {processedTeamData.length > 0 ? (
                        <div style={{ height: Math.max(300, processedTeamData.length * 70), minWidth: '600px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processedTeamData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                              <YAxis dataKey="firstName" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#4B5563', fontWeight: 500 }} />
                              <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px' }} />
                              <Bar dataKey="activeProjects" name="โครงการที่กำลังดำเนินการ" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={12} />
                              <Bar dataKey="activeTasks" name="งานที่กำลังดำเนินการ" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                              <Bar dataKey="blockedTasks" name="งานที่ติดปัญหา" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                              <Bar dataKey="completedThisMonth" name={`งานที่เสร็จสิ้น ${(startDate && endDate) ? '(ช่วงเวลาที่เลือก)' : '(เดือนนี้)'}`} fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                              <Bar dataKey="completedProjectsThisMonth" name={`โครงการที่เสร็จสิ้น ${(startDate && endDate) ? '(ช่วงเวลาที่เลือก)' : '(เดือนนี้)'}`} fill="#059669" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-gray-500">ไม่พบข้อมูลทีม</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Aggregated Team Status Bar Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">ภาพรวมสถานะงานทั้งหมด (Overall Task Status)</h3>
                  <div className="h-48">
                    {aggregatedTeamStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggregatedTeamStatus} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#4B5563', fontWeight: 500 }} />
                          <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px' }} />
                          <Bar dataKey="งานทั้งหมด" name="งานทั้งหมด (Total Tasks)" fill="#6B7280" radius={[0, 4, 4, 0]} barSize={20} />
                          <Bar dataKey="เสร็จสิ้น" name={`เสร็จสิ้น ${(startDate && endDate) ? '(ช่วงเวลาที่เลือก)' : '(เดือนนี้)'}`} fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                          <Bar dataKey="กำลังดำเนินการ" name="กำลังดำเนินการ (In-Progress)" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                          <Bar dataKey="ติดปัญหา" name="ติดปัญหา (Blocked)" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </div>

                {/* 2. Performance Breakdown Table */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">สัดส่วนความสำเร็จของงาน (Performance Breakdown)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">ชื่อพนักงาน (Name)</th>
                          <th className="px-4 py-3 text-center">สัดส่วนงานที่เสร็จ (Completed %)</th>
                          <th className="px-4 py-3 text-center rounded-tr-lg">สัดส่วนงานที่ติดปัญหา (Facing Issues %)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedTeamData.map((user: any) => (
                          <tr key={user.userId} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-4 py-4 font-medium text-gray-900">{user.fullName}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3 justify-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[150px]">
                                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${user.completionPercentage || 0}%` }}></div>
                                </div>
                                <span className="font-semibold text-green-600 min-w-[40px] text-right">{user.completionPercentage || 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3 justify-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[150px]">
                                  <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${user.blockedPercentage || 0}%` }}></div>
                                </div>
                                <span className="font-semibold text-red-600 min-w-[40px] text-right">{user.blockedPercentage || 0}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Project Progress (Table/List) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">ความคืบหน้าโครงการ (Project Progress)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">ชื่อโครงการ (Project)</th>
                          <th className="px-4 py-3">สถานะ (Status)</th>
                          <th className="px-4 py-3">งานย่อย (Tasks)</th>
                          <th className="px-4 py-3">โครงการย่อย (Sub-projects)</th>
                          <th className="px-4 py-3 rounded-tr-lg min-w-[200px]">ความคืบหน้า (Progress)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectProgress.length > 0 ? projectProgress.map((proj: any) => (
                          <tr key={proj.id} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-4 py-4 font-medium text-gray-900">{proj.name}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${proj.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {proj.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                              </span>
                            </td>
                            <td className="px-4 py-4">{proj.completedTasks} / {proj.totalTasks}</td>
                            <td className="px-4 py-4">{proj.completedSubProjects} / {proj.totalSubProjects}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${proj.progress}%` }}></div>
                                </div>
                                <span className="font-semibold text-gray-700 min-w-[40px] text-right">{proj.progress}%</span>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">ไม่มีโครงการที่กำลังดำเนินการ</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Gantt Chart Timeline */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">ไทม์ไลน์โครงการ (Gantt Chart)</h3>
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[800px]">
                      {ganttProjects.length > 0 && ganttTimeline ? ganttProjects.map((proj: any) => {
                        const start = new Date(proj.startDate).getTime();
                        const end = new Date(proj.endDate).getTime();

                        const leftPercent = ((start - ganttTimeline.minStart) / ganttTimeline.totalDuration) * 100;
                        const widthPercent = Math.max(2, ((end - start) / ganttTimeline.totalDuration) * 100);

                        return (
                          <div key={proj.id} className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1 px-1">
                              <span className="font-medium text-gray-700 truncate max-w-[300px]">{proj.name}</span>
                              <span>{new Date(proj.startDate).toLocaleDateString()} - {new Date(proj.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-lg h-8 relative">
                              <div
                                className="absolute top-0 bottom-0 rounded-lg flex items-center px-3 text-white text-xs font-medium whitespace-nowrap overflow-hidden transition-all hover:opacity-90"
                                style={{
                                  backgroundColor: proj.color,
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`
                                }}
                                title={`${proj.name}\nStart: ${new Date(proj.startDate).toLocaleDateString()}\nEnd: ${new Date(proj.endDate).toLocaleDateString()}`}
                              >
                                {widthPercent > 10 ? proj.name : ''}
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-8 text-gray-500">ไม่มีข้อมูลไทม์ไลน์</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : reportData && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">รายงานของ {reportData.targetUser?.fullName}</h2>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">โครงการที่กำลังดำเนินการ</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.kpi.activeProjects}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">งานที่กำลังดำเนินการ</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{reportData.kpi.activeTasks}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-b-4 border-b-red-500">
                    <p className="text-sm font-medium text-gray-500">งานที่ติดปัญหา</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{reportData.kpi.blockedTasks}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">งานที่เสร็จสิ้น {(startDate && endDate) ? '(ช่วงเวลาที่เลือก)' : '(เดือนนี้)'}</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{reportData.kpi.completedThisMonth}</p>
                  </div>
                </div>

                {/* Advanced Charts Section */}
                <div className="space-y-6">
                  {/* Row 1: Historical Performance & Trends */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Historical Performance (Bar/Column Chart) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">ผลงานย้อนหลัง (Historical Performance)</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={processedTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} />
                            <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px' }} />
                            <Bar dataKey="completed" name="งานที่เสร็จสิ้น" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Growth & Trends (Line Chart) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">แนวโน้มการเติบโต (Growth & Trends)</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={processedTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} />
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px' }} />
                            <Line type="monotone" dataKey="assigned" name="งานที่ได้รับมอบหมาย" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="completed" name="งานที่เสร็จสิ้น" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Competencies & Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Skills & Competencies (Radar Chart) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">ทักษะและความเชี่ยวชาญ (Skills & Competencies)</h3>
                      <div className="h-72">
                        {reportData.charts.competencies && reportData.charts.competencies.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={paddedCompetencies}>
                              <PolarGrid stroke="#E5E7EB" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5563', fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                              <Radar name="จำนวนงานที่ทำสำเร็จ" dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.5} />
                              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">ยังไม่มีข้อมูลผลงานที่เสร็จสมบูรณ์</div>
                        )}
                      </div>
                    </div>

                    {/* Task Status */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">สถานะงาน (ภาพรวม)</h3>
                      <div className="h-72">
                        {reportData.charts.tasksByStatus.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={reportData.charts.tasksByStatus}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                              >
                                {reportData.charts.tasksByStatus.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูล</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blocked Tasks List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                    <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      รายการงานที่ติดปัญหา
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-gray-200 text-sm text-gray-600">
                          <th className="p-4 font-semibold">โครงการ</th>
                          <th className="p-4 font-semibold">งาน</th>
                          <th className="p-4 font-semibold">สาเหตุที่ติดปัญหา</th>
                          <th className="p-4 font-semibold">รอจาก</th>
                          <th className="p-4 font-semibold text-right">จำนวนวันที่ติดปัญหา</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportData.blockedTasksList.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่มีงานที่ติดปัญหา ยอดเยี่ยมมาก!</td></tr>
                        ) : (
                          reportData.blockedTasksList.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4 font-medium text-gray-900">{t.projectName}</td>
                              <td className="p-4 text-gray-700">{t.name}</td>
                              <td className="p-4 text-red-600 font-medium">{t.blockedReason}</td>
                              <td className="p-4 text-gray-600">{t.waitingOn}</td>
                              <td className="p-4 text-right">
                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
