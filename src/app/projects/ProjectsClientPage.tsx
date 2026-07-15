"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FolderOpen, Clock, CheckCircle2, AlertCircle, LayoutDashboard, Search, FileText, Download, Settings2, Check, Pencil, Trash2, X, AlertTriangle, Loader2, Briefcase } from 'lucide-react';
import { deleteProject, generateJobForProject } from '@/app/actions/projects';

interface ProjectsClientPageProps {
  currentUser: any;
  projects: any[];
  isManager: boolean;
}

export default function ProjectsClientPage({ currentUser, projects, isManager }: ProjectsClientPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [generateJobProjectId, setGenerateJobProjectId] = useState<string | null>(null);
  const [generateJobCompanyCode, setGenerateJobCompanyCode] = useState<string>('');
  const [isGeneratingJob, setIsGeneratingJob] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    sequence: true,
    projectNumber: true,
    name: true,
    category: true,
    province: true,
    client: true,
    contract: true,
    value: true,
    manager: true,
    timeline: true,
    progress: true,
    status: true,
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // KPI stats
  const total = projects.length;
  const inProgress = projects.filter(p => p.status === 'In progress').length;
  const completed = projects.filter(p => p.status === 'Completed').length;
  const overdue = projects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return false;
    if (!p.endDate) return false;
    return new Date(p.endDate) < new Date();
  }).length;

  const handleGenerateJob = async () => {
    if (!generateJobProjectId || !generateJobCompanyCode) return;
    setIsGeneratingJob(true);
    try {
      await generateJobForProject(generateJobProjectId, generateJobCompanyCode);
      setGenerateJobProjectId(null);
      setGenerateJobCompanyCode('');
    } catch (err) {
      console.error(err);
      alert('Failed to generate job');
    } finally {
      setIsGeneratingJob(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToCSV = () => {
    const headers = [
      "ลำดับ", "รหัสโครงการ", "ชื่อโครงการ", "หมวดหมู่", "จังหวัด", "ลูกค้า", "เลขที่สัญญา", "มูลค่าโครงการ", "ผู้จัดการ", "สถานะ"
    ];
    
    const data = filteredProjects.map((p, index) => [
      index + 1,
      p.projectNumber || "",
      p.name || "",
      p.projectCategory || "",
      p.province || "",
      p.clientName || "",
      p.contractNumber || "",
      p.projectValue ? Number(p.projectValue).toFixed(2) : "",
      p.manager?.fullName || "",
      p.status || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteProject(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการลบโครงการ');
    } finally {
      setIsDeleting(false);
    }
  };

  const columnsList = [
    { key: 'sequence', label: 'ลำดับ (Seq)' },
    { key: 'projectNumber', label: 'รหัส (PJ No.)' },
    { key: 'name', label: 'ชื่อโครงการ (Project Name)' },
    { key: 'category', label: 'หมวดหมู่ (Category)' },
    { key: 'province', label: 'จังหวัด (Province)' },
    { key: 'client', label: 'ลูกค้า (Client)' },
    { key: 'contract', label: 'เลขที่สัญญา (Contract No.)' },
    { key: 'value', label: 'มูลค่า (Value)' },
    { key: 'manager', label: 'ผู้จัดการ (Manager)' },
    { key: 'timeline', label: 'ระยะเวลา (Timeline)' },
    { key: 'progress', label: 'ความคืบหน้า (%)' },
    { key: 'status', label: 'สถานะ (Status)' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
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

      {/* Standard KPI Strip (Status of all projects) */}
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
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Settings2 size={16} />
                Columns
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">แสดง/ซ่อน คอลัมน์</p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1">
                    {columnsList.map(col => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-700">{col.label}</span>
                        {visibleColumns[col.key] && <Check size={16} className="text-brand-red" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto relative hidden md:block">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50/50">
                {visibleColumns.sequence && (
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap sticky left-0 z-20 bg-gray-50/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[60px]">Seq</th>
                )}
                {visibleColumns.projectNumber && (
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap sticky z-20 bg-gray-50/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[120px]" style={{ left: visibleColumns.sequence ? '60px' : '0' }}>รหัส (PJ No.)</th>
                )}
                {visibleColumns.name && (
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap sticky z-20 bg-gray-50/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style={{ left: (visibleColumns.sequence ? 60 : 0) + (visibleColumns.projectNumber ? 120 : 0) + 'px' }}>ชื่อโครงการ (Project Name)</th>
                )}
                {visibleColumns.category && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">หมวดหมู่</th>}
                {visibleColumns.province && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">จังหวัด</th>}
                {visibleColumns.client && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ลูกค้า (Client)</th>}
                {visibleColumns.contract && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">เลขที่สัญญา</th>}
                {visibleColumns.value && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">มูลค่า</th>}
                {visibleColumns.manager && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ผู้จัดการ (Manager)</th>}
                {visibleColumns.timeline && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ระยะเวลา (Timeline)</th>}
                {visibleColumns.progress && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">ความคืบหน้า (%)</th>}
                {visibleColumns.status && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">สถานะ (Status)</th>}
                <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 whitespace-nowrap text-right sticky right-0 z-20 bg-gray-50/95 backdrop-blur shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => {
                  
                  // Calculate overall progress based on tasks
                  let overallProgress = 0;
                  if (project.tasks && project.tasks.length > 0) {
                    const totalWeight = project.tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0);
                    const weightedProgress = project.tasks.reduce((sum: number, t: any) => sum + ((t.actualPct || 0) * (t.weight || 1)), 0);
                    overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
                  }
                  
                  const isProjectOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'Completed' && project.status !== 'Cancelled';
                  
                  return (
                    <tr key={project.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer bg-white" onClick={() => window.location.href = `/projects/${project.id}`}>
                      {visibleColumns.sequence && (
                        <td className="py-3 px-4 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-gray-50/80 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[60px]">
                          <span className="text-xs font-bold text-gray-500">{index + 1}</span>
                        </td>
                      )}
                      {visibleColumns.projectNumber && (
                        <td className="py-3 px-4 whitespace-nowrap sticky z-10 bg-white group-hover:bg-gray-50/80 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[120px]" style={{ left: visibleColumns.sequence ? '60px' : '0' }}>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-bold text-[10px]">
                            <FileText size={10} className="text-gray-400" />
                            {project.projectNumber}
                          </span>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="py-3 px-4 min-w-[200px] sticky z-10 bg-white group-hover:bg-gray-50/80 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style={{ left: (visibleColumns.sequence ? 60 : 0) + (visibleColumns.projectNumber ? 120 : 0) + 'px' }}>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-brand-red transition-colors line-clamp-2">{project.name}</p>
                          {project.job && (
                            <Link href={`/jobs?search=${project.job.jobNumber}`} className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline font-medium flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                              <FolderOpen size={10} />
                              โยงกับงาน: {project.job.jobNumber}
                            </Link>
                          )}
                        </td>
                      )}
                      {visibleColumns.category && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-600">{project.projectCategory || '-'}</p>
                        </td>
                      )}
                      {visibleColumns.province && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-600">{project.province || '-'}</p>
                        </td>
                      )}
                      {visibleColumns.client && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-600">{project.clientName || '-'}</p>
                        </td>
                      )}
                      {visibleColumns.contract && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-600">{project.contractNumber || '-'}</p>
                        </td>
                      )}
                      {visibleColumns.value && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-700">{project.projectValue ? `฿${Number(project.projectValue).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</p>
                        </td>
                      )}
                      {visibleColumns.manager && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                              {project.manager?.fullName?.charAt(0) || '?'}
                            </div>
                            <span className="text-xs font-medium text-gray-600">{project.manager?.fullName || 'Unassigned'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.timeline && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-[11px] text-gray-500 font-medium flex flex-col gap-0.5">
                            <span>S: {project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}</span>
                            <span className={isProjectOverdue ? 'text-red-500 font-bold' : ''}>
                              E: {project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.progress && (
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
                      )}
                      {visibleColumns.status && (
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
                      )}
                      <td className="py-3 px-4 whitespace-nowrap text-right sticky right-0 z-10 bg-white group-hover:bg-gray-50/80 transition-colors shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-brand-red hover:border-brand-red/30 hover:bg-red-50 rounded-lg text-[11px] font-bold transition-colors">
                            รายละเอียด
                          </Link>
                          {isManager && (
                            <>
                              <Link href={`/projects/${project.id}/edit`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-7 h-7 bg-white border border-gray-200 text-blue-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข (Edit)">
                                <Pencil size={12} />
                              </Link>
                              {!project.jobId && (
                                <button onClick={(e) => { e.stopPropagation(); setGenerateJobProjectId(project.id); }} className="inline-flex items-center justify-center w-7 h-7 bg-white border border-gray-200 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors" title="สร้าง Job (Create Job)">
                                  <Briefcase size={12} />
                                </button>
                              )}
                              <button onClick={(e) => handleDelete(e, project.id)} className="inline-flex items-center justify-center w-7 h-7 bg-white border border-gray-200 text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 rounded-lg transition-colors" title="ลบ (Delete)">
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-gray-500 text-sm">
                    {searchTerm ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการในระบบ'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project, index) => {
              // Calculate overall progress based on tasks
              let overallProgress = 0;
              if (project.tasks && project.tasks.length > 0) {
                const totalWeight = project.tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0);
                const weightedProgress = project.tasks.reduce((sum: number, t: any) => sum + ((t.actualPct || 0) * (t.weight || 1)), 0);
                overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
              }
              const isProjectOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'Completed' && project.status !== 'Cancelled';
              
              return (
                <div key={project.id} className="p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer space-y-4" onClick={() => window.location.href = `/projects/${project.id}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600">
                          <FileText size={10} className="text-gray-400" />
                          {project.projectNumber}
                        </span>
                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                            project.status === 'In progress' ? 'bg-blue-50 text-blue-600' :
                            project.status === 'Planning' ? 'bg-gray-100 text-gray-600' :
                            project.status === 'Paused' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {project.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{project.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                    <div className="space-y-1">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">ลูกค้า (Client)</span>
                      <p className="font-bold text-gray-800 line-clamp-1">{project.clientName || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">หมวดหมู่ (Category)</span>
                      <p className="font-medium text-gray-700 line-clamp-1">{project.projectCategory || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">ผู้จัดการ (Manager)</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 font-bold text-[9px] shrink-0">
                          {project.manager?.fullName?.charAt(0) || '?'}
                        </div>
                        <p className="font-medium text-gray-700 line-clamp-1">{project.manager?.fullName || 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">จังหวัด (Province)</span>
                      <p className="font-medium text-gray-700 line-clamp-1">{project.province || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100/50 pt-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium">
                      <Clock size={12} className={isProjectOverdue ? 'text-red-400' : 'text-gray-400'} />
                      <span className={isProjectOverdue ? 'text-red-500 font-bold' : 'text-gray-600'}>
                        {project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}
                        {' - '}
                        {project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-brand-red'}`}
                            style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-black text-gray-600 w-6 text-right">{overallProgress}%</span>
                      </div>
                      
                      {isManager && (
                        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3 ml-1">
                          <Link href={`/projects/${project.id}/edit`} onClick={(e) => e.stopPropagation()} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title="แก้ไข (Edit)">
                            <Pencil size={12} />
                          </Link>
                          {!project.jobId && (
                            <button onClick={(e) => { e.stopPropagation(); setGenerateJobProjectId(project.id); }} className="p-1.5 text-emerald-500 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors" title="สร้าง Job (Create Job)">
                              <Briefcase size={12} />
                            </button>
                          )}
                          <button onClick={(e) => handleDelete(e, project.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="ลบ (Delete)">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              {searchTerm ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการในระบบ'}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isDeleting && setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">ยืนยันการลบโครงการ</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การกระทำนี้ไม่สามารถเรียกคืนได้</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      กำลังลบ...
                    </>
                  ) : (
                    'ลบโครงการ (Delete)'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Job Modal */}
      {generateJobProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4 mx-auto">
                <Briefcase size={24} />
              </div>
              <h3 className="text-xl font-black text-center text-gray-900 mb-2">สร้าง Job ใหม่อัตโนมัติ</h3>
              <p className="text-center text-sm text-gray-500 mb-6">
                กรุณาเลือกรหัสบริษัทเพื่อใช้ในการสร้าง Job (Company Code)
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">รหัสบริษัท (Company Code) *</label>
                  <select 
                    value={generateJobCompanyCode} 
                    onChange={e => setGenerateJobCompanyCode(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">เลือกรหัสบริษัท</option>
                    <option value="TP">TP</option>
                    <option value="TG">TG</option>
                    <option value="TE">TE</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button 
                onClick={() => { setGenerateJobProjectId(null); setGenerateJobCompanyCode(''); }}
                disabled={isGeneratingJob}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors w-full sm:w-auto"
              >
                ยกเลิก (Cancel)
              </button>
              <button 
                onClick={handleGenerateJob}
                disabled={isGeneratingJob || !generateJobCompanyCode}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {isGeneratingJob ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {isGeneratingJob ? 'กำลังสร้าง...' : 'สร้าง Job'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
