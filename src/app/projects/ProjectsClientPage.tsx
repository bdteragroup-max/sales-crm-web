"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, FolderOpen, Clock, CheckCircle2, AlertCircle, LayoutDashboard, Search, FileText } from 'lucide-react';

interface ProjectsClientPageProps {
  currentUser: any;
  projects: any[];
  isManager: boolean;
}

export default function ProjectsClientPage({ currentUser, projects, isManager }: ProjectsClientPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // KPI stats
  const total = projects.length;
  const inProgress = projects.filter(p => p.status === 'In progress').length;
  const completed = projects.filter(p => p.status === 'Completed').length;
  const overdue = projects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return false;
    if (!p.endDate) return false;
    return new Date(p.endDate) < new Date();
  }).length;

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="text-brand-red" size={28} />
            {isManager ? 'การจัดการโครงการ (Projects)' : 'โครงการของฉัน (My Work)'}
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {isManager ? 'จัดการและติดตามความคืบหน้าของโครงการทั้งหมด' : 'ติดตามงานและโครงการที่คุณรับผิดชอบ'}
          </p>
        </div>
        {isManager && (
          <Link href="/projects/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red text-white text-sm font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all">
            <Plus size={18} />
            สร้างโครงการใหม่
          </Link>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-colors">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">โครงการทั้งหมด</p>
            <p className="text-2xl font-black text-gray-900">{total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-colors">
            <LayoutDashboard size={20} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
          <div>
            <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">กำลังดำเนินการ</p>
            <p className="text-2xl font-black text-gray-900">{inProgress}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
            <Clock size={20} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
          <div>
            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">เสร็จสิ้นแล้ว</p>
            <p className="text-2xl font-black text-gray-900">{completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle2 size={20} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-colors">
          <div>
            <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">ล่าช้ากว่ากำหนด</p>
            <p className="text-2xl font-black text-gray-900">{overdue}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อโครงการ, รหัส หรือลูกค้า..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">รหัส (PJ No.)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ชื่อโครงการ (Project Name)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ลูกค้า (Client)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ผู้จัดการ (Manager)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ระยะเวลา (Timeline)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ความคืบหน้า (%)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">สถานะ (Status)</th>
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  
                  // Calculate overall progress based on tasks
                  let overallProgress = 0;
                  if (project.tasks && project.tasks.length > 0) {
                    const totalWeight = project.tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0);
                    const weightedProgress = project.tasks.reduce((sum: number, t: any) => sum + ((t.actualPct || 0) * (t.weight || 1)), 0);
                    overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
                  }
                  
                  const isProjectOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'Completed' && project.status !== 'Cancelled';
                  
                  return (
                    <tr key={project.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/projects/${project.id}`}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-bold text-[10px]">
                          <FileText size={10} className="text-gray-400" />
                          {project.projectNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-brand-red transition-colors">{project.name}</p>
                        {project.job && (
                          <Link href={`/jobs?search=${project.job.jobNumber}`} className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline font-medium flex items-center gap-1 mt-0.5">
                            <FolderOpen size={10} />
                            โยงกับงาน: {project.job.jobNumber}
                          </Link>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-600">{project.clientName || '-'}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                            {project.manager?.fullName?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs font-medium text-gray-600">{project.manager?.fullName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[11px] text-gray-500 font-medium flex flex-col gap-0.5">
                          <span>S: {project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}</span>
                          <span className={isProjectOverdue ? 'text-red-500 font-bold' : ''}>
                            E: {project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-brand-red'}`}
                              style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-black text-gray-600 w-6 text-right">{overallProgress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                          project.status === 'In progress' ? 'bg-blue-50 text-blue-600' :
                          project.status === 'Planning' ? 'bg-gray-100 text-gray-600' :
                          project.status === 'Paused' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-brand-red hover:border-brand-red/30 hover:bg-red-50 rounded-lg text-[11px] font-bold transition-colors">
                          รายละเอียด
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                    {searchTerm ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการในระบบ'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
