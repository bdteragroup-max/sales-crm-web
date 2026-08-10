"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getBDReportData, getBDTeamOverview, getBDTeamMembers } from '@/app/actions/bd-reports';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import Link from 'next/link';

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
  }, [viewMode, selectedUserId]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'TEAM') {
        const res = await getBDTeamOverview();
        if (res.success) {
          setTeamData(res.data || []);
        } else {
          console.error("getBDTeamOverview failed:", res.error);
        }
      } else {
        const res = await getBDReportData(selectedUserId);
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

  const processedThroughput = useMemo(() => {
    if (!reportData || !reportData.charts || !reportData.charts.throughputLast6Weeks) return [];
    const tasks = reportData.charts.throughputLast6Weeks;
    
    // Create 6 buckets
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (5 - i) * 7);
      return {
        name: `W${(5-i) === 0 ? ' (This)' : `-${5-i}`}`,
        completed: 0,
        startRef: d
      };
    });

    const now = new Date().getTime();
    tasks.forEach((t: any) => {
      if (!t.completedAt) return;
      const tTime = new Date(t.completedAt).getTime();
      const weeksAgo = Math.floor((now - tTime) / (1000 * 3600 * 24 * 7));
      if (weeksAgo >= 0 && weeksAgo < 6) {
        buckets[5 - weeksAgo].completed += 1;
      }
    });

    return buckets;
  }, [reportData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานและสถิติ BD</h1>
            <p className="text-gray-500 text-sm mt-1">ติดตามผลการดำเนินงานและปัญหาที่ติดขัด</p>
          </div>

          <div className="flex items-center gap-3">
            {canViewTeam && (
              <>
                <button 
                  onClick={() => setViewMode('TEAM')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'TEAM' ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  ภาพรวมของทีม
                </button>
                <button 
                  onClick={() => setViewMode('INDIVIDUAL')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'INDIVIDUAL' ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  รายงานส่วนบุคคล
                </button>
              </>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800">ภาพรวมภาระงานของทีม</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                        <th className="p-4 font-semibold">สมาชิกในทีม</th>
                        <th className="p-4 font-semibold text-center">โครงการที่กำลังดำเนินการ</th>
                        <th className="p-4 font-semibold text-center">งานที่กำลังดำเนินการ</th>
                        <th className="p-4 font-semibold text-center">งานที่ติดปัญหา</th>
                        <th className="p-4 font-semibold text-center">งานที่เสร็จสิ้น (เดือนนี้)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teamData.map(u => (
                        <tr key={u.userId} className="hover:bg-red-50/30 transition-colors">
                          <td className="p-4 font-medium text-gray-900">{u.fullName}</td>
                          <td className="p-4 text-center">{u.activeProjects}</td>
                          <td className="p-4 text-center">{u.activeTasks}</td>
                          <td className="p-4 text-center">
                            {u.blockedTasks > 0 ? (
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                {u.blockedTasks}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="p-4 text-center text-green-600 font-medium">{u.completedThisMonth}</td>
                        </tr>
                      ))}
                      {teamData.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่พบข้อมูลทีม</td></tr>
                      )}
                    </tbody>
                  </table>
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
                    <p className="text-sm font-medium text-gray-500">งานที่เสร็จสิ้น (เดือนนี้)</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{reportData.kpi.completedThisMonth}</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Task Status */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">สถานะงาน (ภาพรวม)</h3>
                    <div className="h-64">
                      {reportData.charts.tasksByStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.charts.tasksByStatus}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {reportData.charts.tasksByStatus.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูล</div>
                      )}
                    </div>
                  </div>

                  {/* Throughput */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">ผลงานรายสัปดาห์ (ย้อนหลัง 6 สัปดาห์)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedThroughput}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                          <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Work Type */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">โครงการแยกตามประเภทงาน (กำลังดำเนินการ)</h3>
                    <div className="h-64">
                      {reportData.charts.projectsByWorkType.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.charts.projectsByWorkType}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {reportData.charts.projectsByWorkType.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">ไม่มีโครงการที่กำลังดำเนินการ</div>
                      )}
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
