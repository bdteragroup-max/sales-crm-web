"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ListTodo, Users, BarChart3, Plus, Search, Calendar, User as UserIcon, Tag, Clock, AlertCircle, BarChart2, ClipboardList, TrendingUp } from 'lucide-react';
import { updateTaskStatus, updateProject, updateTaskProgress } from '@/app/actions/projects';
import GanttChart from './GanttChart';
import DailyLogTab from './DailyLogTab';
import WeeklyReportTab from './WeeklyReportTab';

export default function ProjectDetailClient({ project, currentUser, isManager, allUsers }: { project: any, currentUser: any, isManager: boolean, allUsers: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'overview' | 'gantt' | 'daily' | 'weekly'>('tasks');
  const [tasks, setTasks] = useState(project.tasks || []);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Calculate overall progress based on tasks
  let overallProgress = 0;
  if (tasks && tasks.length > 0) {
    const totalWeight = tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0);
    const weightedProgress = tasks.reduce((sum: number, t: any) => sum + ((t.actualPct || 0) * (t.weight || 1)), 0);
    overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
  }

  const columns = [
    { id: 'Pending', label: 'Pending (รอทำ)', color: 'border-gray-200 bg-gray-50' },
    { id: 'In progress', label: 'In Progress (กำลังทำ)', color: 'border-blue-200 bg-blue-50' },
    { id: 'Problematic', label: 'Problematic (ติดปัญหา)', color: 'border-red-200 bg-red-50' },
    { id: 'Completed', label: 'Completed (เสร็จสิ้น)', color: 'border-emerald-200 bg-emerald-50' }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    // Optimistic update
    const newTasks = tasks.map((t: any) => {
      if (t.id === draggingTaskId) {
        return { ...t, status: statusId, actualPct: statusId === 'Completed' ? 100 : t.actualPct };
      }
      return t;
    });
    setTasks(newTasks);
    setDraggingTaskId(null);

    // Server update
    try {
      await updateTaskStatus(draggingTaskId, statusId);
      if (statusId === 'Completed') {
        await updateTaskProgress(draggingTaskId, 100);
      }
    } catch (error) {
      console.error(error);
      // Revert on error
      setTasks(project.tasks);
      alert("Failed to update task status");
    }
  };

  const renderKanbanBoard = () => {
    return (
      <div className="flex gap-6 h-full min-h-[500px] overflow-x-auto pb-4">
        {columns.map(col => {
          const colTasks = tasks.filter((t: any) => t.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className={`flex-shrink-0 w-80 rounded-2xl border ${col.color} flex flex-col`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-4 border-b border-black/5 font-bold text-gray-800 flex justify-between items-center">
                <span>{col.label}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded-md text-xs">{colTasks.length}</span>
              </div>
              
              <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                {colTasks.map((task: any) => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm text-gray-900">{task.title}</h4>
                      {task.priority === 'High' && <span className="bg-red-50 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">High</span>}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mb-3">
                      {task.category && (
                        <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                          <Tag size={10} /> {task.category}
                        </span>
                      )}
                      {(task.planStart || task.planEnd) && (
                        <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                          <Calendar size={10} /> 
                          {task.planStart ? new Date(task.planStart).toLocaleDateString('th-TH') : '?'} - {task.planEnd ? new Date(task.planEnd).toLocaleDateString('th-TH') : '?'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-[9px]">
                          {task.assignee?.fullName?.charAt(0) || '?'}
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">{task.assignee?.fullName || 'Unassigned'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${task.actualPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${task.actualPct || 0}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-gray-500">{task.actualPct || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center p-4 border-2 border-dashed border-black/10 rounded-xl text-xs font-medium text-gray-400">
                    ลากงานมาวางที่นี่ (Drop tasks here)
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  const renderTeam = () => {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ชื่อ (Name)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">บทบาทในโครงการ (Role)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ตำแหน่ง (System Role)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ติดต่อ (Contact)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {project.manager && (
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-bold text-gray-900">{project.manager.fullName}</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-brand-red/10 text-brand-red text-xs font-bold rounded-md">Project Manager</span></td>
                <td className="py-3 px-4 text-sm text-gray-500">{project.manager.role}</td>
                <td className="py-3 px-4 text-sm text-gray-500">{project.manager.phoneNumber || '-'}</td>
              </tr>
            )}
            {project.members.map((member: any) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-bold text-gray-900">{member.user.fullName}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-md ${member.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    {member.role === 'admin' ? 'Project Admin' : 'Engineer'}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">{member.user.role}</td>
                <td className="py-3 px-4 text-sm text-gray-500">{member.user.phoneNumber || '-'}</td>
              </tr>
            ))}
            {project.externalTechnicians && (
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-bold text-gray-900">{project.externalTechnicians}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-md bg-orange-50 text-orange-600">
                    ช่างภายนอก (External)
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">ภายนอก</td>
                <td className="py-3 px-4 text-sm text-gray-500">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOverview = () => {
    const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length;
    const pendingTasks = tasks.filter((t: any) => t.status === 'Pending').length;
    const progressTasks = tasks.filter((t: any) => t.status === 'In progress').length;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900">สรุปความคืบหน้า (Progress Summary)</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold text-gray-700">ความคืบหน้าโดยรวม (Overall Progress)</span>
                <span className="font-black text-brand-red">{overallProgress}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: `${overallProgress}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">เสร็จสิ้น</p>
                <p className="text-2xl font-black text-emerald-500">{completedTasks}</p>
              </div>
              <div className="text-center border-l border-r border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">กำลังทำ</p>
                <p className="text-2xl font-black text-blue-500">{progressTasks}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">รอเริ่ม</p>
                <p className="text-2xl font-black text-gray-500">{pendingTasks}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900">รายละเอียดโครงการ (Project Details)</h3>
          
          <dl className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ลูกค้า (Client):</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.clientName || '-'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">สถานที่ (Site):</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.siteAddress || '-'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">เชื่อมโยงกับ Job:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.job ? `${project.job.jobNumber} - ${project.job.customerName}` : '-'}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ระยะเวลา:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'} ถึง {project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">งบประมาณ:</dt>
              <dd className="col-span-2 font-bold text-emerald-600">
                {project.budget ? `฿${project.budget.toLocaleString()}` : '-'}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-gray-500 font-medium">คำอธิบาย:</dt>
              <dd className="col-span-2 text-gray-700">{project.description || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="space-y-1 w-full max-w-2xl">
          <Link href="/projects" className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-brand-red mb-2 transition-colors">
            <ArrowLeft size={14} className="mr-1" /> กลับไปหน้าโครงการ
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{project.name}</h1>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
              project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              project.status === 'In progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
              'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {project.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-bold">{project.projectNumber}</span>
            {project.clientName && <span>• {project.clientName}</span>}
          </p>
        </div>
        
        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">ความคืบหน้า</span>
            <span className="text-xl font-black text-brand-red">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-red rounded-full" style={{ width: `${overallProgress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 shrink-0">
        <button 
          onClick={() => setActiveTab('tasks')} 
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <ListTodo size={16} /> งาน (Tasks)
        </button>
        <button 
          onClick={() => setActiveTab('team')} 
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'team' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <Users size={16} /> ทีม (Team)
        </button>
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <BarChart3 size={16} /> สรุป (Overview)
        </button>
        <button 
          onClick={() => setActiveTab('gantt')} 
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'gantt' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <BarChart2 size={16} /> แผนงาน (Gantt)
        </button>
        <button 
          onClick={() => setActiveTab('daily')} 
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'daily' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <ClipboardList size={16} /> บันทึกประจำวัน (Daily Log)
        </button>
        <button 
          onClick={() => setActiveTab('weekly')} 
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'weekly' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <TrendingUp size={16} /> รายงาน (Weekly Report)
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'tasks' && renderKanbanBoard()}
        {activeTab === 'team' && (
          <div className="overflow-y-auto h-full pb-8">{renderTeam()}</div>
        )}
        {activeTab === 'overview' && (
          <div className="overflow-y-auto h-full pb-8">{renderOverview()}</div>
        )}
        {activeTab === 'gantt' && (
          <div className="h-full pb-4">
            <GanttChart project={project} currentUser={currentUser} isManager={isManager} />
          </div>
        )}
        {activeTab === 'daily' && (
          <div className="overflow-y-auto h-full pb-8">
            <DailyLogTab project={project} currentUser={currentUser} isManager={isManager} />
          </div>
        )}
        {activeTab === 'weekly' && (
          <div className="overflow-y-auto h-full pb-8">
            <WeeklyReportTab project={project} isManager={isManager} />
          </div>
        )}
      </div>
    </div>
  );
}
