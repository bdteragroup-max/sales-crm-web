"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { DollarSign, Wallet, ListTodo, ClipboardList, ChevronRight, LayoutDashboard, Clock, CheckCircle2, AlertCircle, ShieldAlert, FileWarning, Users, CalendarClock, HardHat, ShieldCheck, Banknote, AlertTriangle, PieChart, Hourglass, Search, Filter, Download, Printer } from 'lucide-react';
import DashboardCharts from './DashboardCharts';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';

interface ProjectDashboardClientProps {
  projects: any[];
}

export default function ProjectDashboardClient({ projects }: ProjectDashboardClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [provinceFilter, setProvinceFilter] = useState('All');
  
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });

  // Derive unique options for filters
  const allStatuses = Array.from(new Set(projects.map(p => p.status))).filter(Boolean);
  const allManagers = Array.from(new Set(projects.map(p => p.manager?.fullName))).filter(Boolean);
  const allProvinces = Array.from(new Set(projects.map(p => p.province))).filter(Boolean);

  const filteredProjects = projects.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (managerFilter !== 'All' && p.manager?.fullName !== managerFilter) return false;
    if (provinceFilter !== 'All' && p.province !== provinceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchNumber = p.projectNumber?.toLowerCase().includes(q);
      if (!matchName && !matchNumber) return false;
    }
    return true;
  });

  const exportToExcel = () => {
    const data = filteredProjects.map(p => ({
      'รหัสโครงการ (Code)': p.projectNumber,
      'ชื่อโครงการ (Name)': p.name,
      'สถานะ (Status)': p.status,
      'หมวดหมู่ (Category)': p.projectCategory || 'ไม่ระบุ',
      'ผู้ดูแล (PM)': p.manager?.fullName || 'ไม่ระบุ',
      'จังหวัด (Province)': p.province || 'ไม่ระบุ',
      'วันเริ่มต้น (Start Date)': p.startDate ? new Date(p.startDate).toLocaleDateString('th-TH') : '',
      'วันสิ้นสุด (End Date)': p.endDate ? new Date(p.endDate).toLocaleDateString('th-TH') : '',
      'ระยะเวลา (Period)': p.projectDuration ? `${p.projectDuration} ${p.projectDurationUnit || ''}` : '',
      'มูลค่าโครงการ (Project Value)': Number(p.projectValue) || 0,
      'งบประมาณ (Budget)': Number(p.budget) || 0,
      'เงินประกันผลงาน (Deposit)': Number(p.securityDeposit) || 0,
      'ค่างวด 1 (Installment 1)': Number(p.installment1) || 0,
      'ค่างวด 2 (Installment 2)': Number(p.installment2) || 0,
      'ค่างวด 3 (Installment 3)': Number(p.installment3) || 0,
      'ค่างวด 4 (Installment 4)': Number(p.installment4) || 0,
      'ค่าปรับต่อวัน (Penalty)': Number(p.penaltyPerDay) || 0,
      'งานทั้งหมด (All Tasks)': p.tasks?.length || 0,
      'งานที่ค้าง (Pending Tasks)': p.tasks?.filter((t: any) => t.status !== 'Completed').length || 0,
      'ความคืบหน้า (Progress %)': (p.tasks?.length > 0) ? Math.round((p.tasks.filter((t: any) => t.status === 'Completed').length / p.tasks.length) * 100) : 0,
      'อุปกรณ์ทั้งหมด (Total Equipment)': p.equipment?.length || 0,
      'อุปกรณ์ใช้งาน (In Use)': p.equipment?.filter((e: any) => e.status === 'ใช้งาน').length || 0,
      'อุปกรณ์ซ่อม (Repairing)': p.equipment?.filter((e: any) => e.status === 'ซ่อม').length || 0,
      'อุปกรณ์ชำรุด (Damaged)': p.equipment?.filter((e: any) => e.status === 'ชำรุด').length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard Data");
    XLSX.writeFile(wb, "Project_Dashboard_Export.xlsx");
  };

  // Global Status KPIs
  const total = filteredProjects.length;
  const inProgress = filteredProjects.filter(p => p.status === 'In progress').length;
  const completed = filteredProjects.filter(p => p.status === 'Completed').length;
  const overdue = filteredProjects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return false;
    if (!p.endDate) return false;
    return new Date(p.endDate) < new Date();
  }).length;

  // Section 1: Financial & Key KPIs
  const totalValue = filteredProjects.reduce((sum, p) => sum + (Number(p.projectValue) || 0), 0);
  const totalBudget = filteredProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const pendingTasksCount = filteredProjects.reduce((sum, p) => sum + (p.tasks?.filter((t: any) => t.status !== 'Completed').length || 0), 0);
  
  const totalSecurityDeposit = filteredProjects.reduce((sum, p) => sum + (Number(p.securityDeposit) || 0), 0);
  const totalOutstandingInstallments = filteredProjects.reduce((sum, p) => sum + (Number(p.installment1) || 0) + (Number(p.installment2) || 0) + (Number(p.installment3) || 0) + (Number(p.installment4) || 0), 0);
  const totalPenalties = filteredProjects.reduce((sum, p) => sum + (Number(p.penaltyPerDay) || 0), 0);

  // Section 2: Notifications (Alerts)
  const today = new Date();
  const projectsNearDeadline = filteredProjects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled' || !p.endDate) return false;
    const end = new Date(p.endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const projectsMissingLogs = filteredProjects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return false;
    const logs = p.dailyLogs || [];
    if (logs.length === 0) return true;
    const lastLogDate = new Date(logs[0].date); // assuming sorted by desc
    const diffTime = today.getTime() - lastLogDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  });

  // Section 4: Team Workload
  const pmWorkload = filteredProjects.reduce((acc, p) => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return acc;
    const pmName = p.manager?.fullName || 'ไม่ระบุ';
    if (!acc[pmName]) {
      acc[pmName] = { name: pmName, projectCount: 0, totalTasks: 0, completedTasks: 0 };
    }
    acc[pmName].projectCount += 1;
    acc[pmName].totalTasks += p.tasks?.length || 0;
    acc[pmName].completedTasks += p.tasks?.filter((t: any) => t.status === 'Completed').length || 0;
    return acc;
  }, {} as Record<string, { name: string, projectCount: number, totalTasks: number, completedTasks: number }>);
  
  const pmWorkloadArray = Object.values(pmWorkload).sort((a: any, b: any) => b.projectCount - a.projectCount);

  // Section 5: Feeds
  const recentReports = filteredProjects.flatMap(p => 
    (p.dailyLogs || []).map((log: any) => ({ ...log, projectNumber: p.projectNumber, projectName: p.name, projectId: p.id }))
  )
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 10);

  const recentlyUpdatedProjects = [...filteredProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .reverse()
    .slice(0, 5);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `฿${(val / 1000000).toFixed(2)}M`;
    return `฿${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-8" ref={contentRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">ภาพรวมโครงการ</h1>
          <p className="text-gray-500 font-medium">สรุปข้อมูลการเงิน โครงการ อุปกรณ์ และทีมงาน</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <Download size={16} /> Excel
          </button>
          <button 
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Printer size={16} /> Print PDF
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end print:hidden">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Search size={14}/> ค้นหาโครงการ</label>
          <input 
            type="text" 
            placeholder="ค้นหาชื่อหรือรหัสโครงการ..." 
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-auto min-w-[160px]">
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Filter size={14}/> สถานะ</label>
          <select 
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">ทุกสถานะ</option>
            {allStatuses.map((s: any) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="w-full md:w-auto min-w-[160px]">
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Users size={14}/> ผู้ดูแล (PM)</label>
          <select 
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-white"
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
          >
            <option value="All">ทุกคน</option>
            {allManagers.map((m: any) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="w-full md:w-auto min-w-[160px]">
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><LayoutDashboard size={14}/> จังหวัด</label>
          <select 
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-white"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
          >
            <option value="All">ทุกจังหวัด</option>
            {allProvinces.map((p: any) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Display applied filters count */}
      {filteredProjects.length !== projects.length && (
        <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl inline-flex items-center gap-2 print:hidden">
          <Filter size={16} />
          แสดงผล {filteredProjects.length} จาก {projects.length} โครงการ
          <button onClick={() => { setSearch(''); setStatusFilter('All'); setManagerFilter('All'); setProvinceFilter('All'); }} className="ml-2 text-xs text-blue-800 underline hover:text-blue-900">ล้างตัวกรอง</button>
        </div>
      )}

      {/* SECTION 1: Key KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 rounded-3xl border border-gray-800 shadow-xl flex items-center justify-between text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <DollarSign size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><DollarSign size={14} /> มูลค่าโครงการรวม</p>
            <p className="text-3xl font-black">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><PieChart size={14} /> งบประมาณรวม</p>
            <p className="text-3xl font-black text-gray-900">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors relative z-10">
            <Wallet size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-brand-red/30 transition-all relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-black text-brand-red uppercase tracking-widest mb-1 flex items-center gap-1.5"><Hourglass size={14} /> งานที่ค้างอยู่</p>
            <p className="text-3xl font-black text-gray-900">{pendingTasksCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-brand-red group-hover:bg-red-100 transition-colors relative z-10">
            <ListTodo size={24} />
          </div>
        </div>

        {/* New Financial KPIs */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
          <div>
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ShieldCheck size={14} /> เงินประกันผลงานรวม</p>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(totalSecurityDeposit)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
          <div>
            <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Banknote size={14} /> ค่างวดค้างรับรวม (1-4)</p>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(totalOutstandingInstallments)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
          <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertTriangle size={14} /> ค่าปรับรวม (ต่อวัน)</p>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(totalPenalties)}</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        <div className="bg-orange-50 border border-orange-200 p-5 rounded-3xl">
          <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-4">
            <CalendarClock size={20} />
            โครงการใกล้กำหนดส่ง (≤ 30 วัน)
          </h3>
          <div className="space-y-3">
            {projectsNearDeadline.length > 0 ? (
              projectsNearDeadline.map(p => {
                const diffTime = new Date(p.endDate).getTime() - today.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <Link href={`/projects/${p.id}`} key={p.id} className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{p.projectNumber}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{p.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-white bg-orange-500 px-2 py-1 rounded-lg shadow-sm">
                        เหลือ {daysLeft} วัน
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-orange-600/60 font-medium">ไม่มีโครงการที่ใกล้กำหนดส่ง</p>
            )}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-5 rounded-3xl">
          <h3 className="font-bold text-red-800 flex items-center gap-2 mb-4">
            <FileWarning size={20} />
            โครงการขาดรายงาน (ไม่มี Daily Log &gt; 7 วัน)
          </h3>
          <div className="space-y-3">
            {projectsMissingLogs.length > 0 ? (
              projectsMissingLogs.map(p => (
                <Link href={`/projects/${p.id}?tab=reports`} key={p.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.projectNumber}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-red-600">PM: {p.manager?.fullName || 'ไม่ระบุ'}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-red-600/60 font-medium">ทุกโครงการอัปเดตรายงานครบถ้วน</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Charts */}
      <div>
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
          <LayoutDashboard className="text-gray-400" /> แผนภาพสรุปข้อมูล
        </h2>
        <DashboardCharts projects={filteredProjects} />
      </div>

      {/* SECTION 4: Team Workload */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-6">
          <Users className="text-gray-400" /> ภาระงานของทีม
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-4 text-sm font-bold text-gray-500">ผู้จัดการโครงการ (PM)</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-500">จำนวนโครงการ</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-500">งานที่ค้าง</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-500">ความคืบหน้างานรวม</th>
              </tr>
            </thead>
            <tbody>
              {pmWorkloadArray.map((pm: any, idx: number) => {
                const progress = pm.totalTasks > 0 ? Math.round((pm.completedTasks / pm.totalTasks) * 100) : 0;
                return (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{pm.name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-xs">{pm.projectCount}</span>
                    </td>
                    <td className="py-3 px-4 text-brand-red font-bold">{pm.totalTasks - pm.completedTasks} งาน</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-8">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pmWorkloadArray.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">ยังไม่มีข้อมูลภาระงาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        {/* Recent Reports */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-gray-400" size={18} />
              รายงานล่าสุด
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {recentReports.length > 0 ? (
              recentReports.map((report, idx) => (
                <Link href={`/projects/${report.projectId}?tab=reports`} key={idx} className="block p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 line-clamp-1">
                        {report.projectNumber} • {report.projectName}
                      </p>
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        <span className="font-semibold text-gray-800">{report.reporter?.fullName || report.reportedBy}:</span> {report.workSummary}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {new Date(report.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">ยังไม่มีรายงาน</div>
            )}
          </div>
        </div>

        {/* Recently Updated Projects */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <HardHat className="text-gray-400" size={18} />
              อัปเดตล่าสุด
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {recentlyUpdatedProjects.length > 0 ? (
              recentlyUpdatedProjects.map((p, idx) => (
                <Link href={`/projects/${p.id}`} key={idx} className="block p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-emerald-100 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 line-clamp-1">
                        {p.projectNumber} • {p.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        สถานะ: <span className="font-semibold text-gray-700">{p.status}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {new Date(p.updatedAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">ยังไม่มีโครงการ</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
