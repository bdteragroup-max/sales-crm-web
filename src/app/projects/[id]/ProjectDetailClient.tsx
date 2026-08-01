"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ListTodo, Users, BarChart3, Plus, Search, Calendar, User as UserIcon, Tag, Clock, AlertCircle, BarChart2, ClipboardList, TrendingUp, Wrench, DollarSign, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { updateTaskStatus, updateProject, updateTaskProgress } from '@/app/actions/projects';
import GanttChart from './GanttChart';
import DailyLogTab from './DailyLogTab';
import WeeklyReportTab from './WeeklyReportTab';
import EquipmentTab from './EquipmentTab';
import SolarChecklistTab from '../components/SolarChecklistTab';
import { calculateProjectProgress } from '@/app/lib/project-utils';

export default function ProjectDetailClient({ project, currentUser, isManager, allUsers, pos = [], prs = [] }: { project: any, currentUser: any, isManager: boolean, allUsers: any[], pos?: any[], prs?: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'reports' | 'checklist'>('dashboard');
  const [tasks, setTasks] = useState(project.tasks || []);
  const [showMore, setShowMore] = useState(false);
  const [taskView, setTaskView] = useState<'list' | 'gantt'>('list');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleMarkAsCompleted = async () => {
    if (!confirm('ยืนยันการตั้งค่าโครงการนี้เป็นเสร็จสิ้น? (Confirm marking this project as completed?)')) return;
    
    setIsUpdatingStatus(true);
    try {
      await updateProject(project.id, { status: 'Completed' });
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to update project status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Calculate overall progress based on tasks and checklists
  const overallProgress = calculateProjectProgress({ ...project, tasks });

  const columns = [
    { id: 'Pending', label: 'Pending (รอทำ)' },
    { id: 'In progress', label: 'In Progress (กำลังทำ)' },
    { id: 'Problematic', label: 'Problematic (ติดปัญหา)' },
    { id: 'Completed', label: 'Completed (เสร็จสิ้น)' }
  ];

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    const previousTasks = [...tasks];
    const newTasks = tasks.map((t: any) => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, actualPct: newStatus === 'Completed' ? 100 : t.actualPct };
      }
      return t;
    });
    setTasks(newTasks);

    try {
      await updateTaskStatus(taskId, newStatus);
      if (newStatus === 'Completed') {
        await updateTaskProgress(taskId, 100);
      }
    } catch (error) {
      console.error(error);
      setTasks(previousTasks);
      alert("Failed to update task status");
    }
  };

  const renderTaskList = () => {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100">
          {tasks.map((task: any) => (
            <div key={task.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-bold text-gray-900">{task.title}</div>
                  {task.category && <div className="text-[10px] text-gray-500 mt-0.5"><Tag size={10} className="inline mr-1"/>{task.category}</div>}
                </div>
                <select 
                  className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 cursor-pointer focus:ring-2 focus:ring-brand-red outline-none shrink-0"
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-[9px] shrink-0">
                    {task.assignee?.fullName?.charAt(0) || '?'}
                  </div>
                  <span className="text-xs">{task.assignee?.fullName || '-'}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {task.planStart ? new Date(task.planStart).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}) : '?'} - {task.planEnd ? new Date(task.planEnd).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}) : '?'}
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                <span className="text-xs font-bold text-gray-500 w-8">{task.actualPct || 0}%</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${task.actualPct === 100 ? 'bg-emerald-500' : 'bg-brand-red'}`} style={{ width: `${task.actualPct || 0}%` }}></div>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">ยังไม่มีงานในโครงการนี้</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/50">
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ชื่องาน (Task)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ผู้รับผิดชอบ (Assignee)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ระยะเวลา (Timeline)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">สถานะ (Status)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right">ความคืบหน้า (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tasks.map((task: any) => (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-gray-900">{task.title}</div>
                  {task.category && <div className="text-[10px] text-gray-500 mt-0.5"><Tag size={10} className="inline mr-1"/>{task.category}</div>}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-[9px] shrink-0">
                    {task.assignee?.fullName?.charAt(0) || '?'}
                  </div>
                  {task.assignee?.fullName || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {task.planStart ? new Date(task.planStart).toLocaleDateString('th-TH') : '?'} - {task.planEnd ? new Date(task.planEnd).toLocaleDateString('th-TH') : '?'}
                </td>
                <td className="py-3 px-4">
                  <select 
                    className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer focus:ring-2 focus:ring-brand-red outline-none transition-shadow"
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs font-bold text-gray-500">{task.actualPct || 0}%</span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${task.actualPct === 100 ? 'bg-emerald-500' : 'bg-brand-red'}`} style={{ width: `${task.actualPct || 0}%` }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">ยังไม่มีงานในโครงการนี้</td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTeam = () => {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden w-full h-full">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[400px]">
            <thead>
              <tr className="bg-gray-50/50">
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ชื่อ (Name)</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">บทบาท (Role)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {project.manager && (
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-bold text-gray-900">{project.manager.fullName}</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-brand-red/10 text-brand-red text-xs font-bold rounded-md">Project Manager</span></td>
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
              </tr>
            ))}
            {project.externalTechnicians && (
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-bold text-gray-900">{project.externalTechnicians}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-md bg-orange-50 text-orange-600">ช่างภายนอก</span>
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length;
    const pendingTasks = tasks.filter((t: any) => t.status === 'Pending').length;
    const progressTasks = tasks.filter((t: any) => t.status === 'In progress').length;
    
    const totalExpenditures = pos.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
    const projectRevenue = Number(project.amountIncludingVat || project.projectValue || 0);
    const profit = projectRevenue - totalExpenditures;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
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

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900">ข้อมูลทั่วไป (General Info)</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ลูกค้า (Client):</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.clientName || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">หมวดหมู่ (Category):</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.projectCategory || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">แผนก (Department):</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.department || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">สถานที่ / จังหวัด:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.siteAddress || '-'} {project.district ? `อ.${project.district}` : ''} {project.province ? `จ.${project.province}` : ''}
              </dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">เชื่อมโยงกับ Job:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.job ? `${project.job.jobNumber} - ${project.job.customerName}` : '-'}
              </dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">คำอธิบาย:</dt>
              <dd className="col-span-2 text-gray-700">{project.description || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900">สัญญาและการเงิน (Contract & Financials)</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">เลขที่สัญญา:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.contractNumber || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ผู้เซ็นสัญญา:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.contractSignatory || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">วันที่เซ็นสัญญา:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.contractSigningDate ? new Date(project.contractSigningDate).toLocaleDateString('th-TH') : '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">มูลค่าโครงการ:</dt>
              <dd className="col-span-2 font-bold text-brand-red">
                {project.projectValue ? `฿${Number(project.projectValue).toLocaleString()}` : '-'}
              </dd>
            </div>
            {(currentUser?.role?.toLowerCase().includes('account') || currentUser?.role?.includes('บัญชี') || currentUser?.role?.toLowerCase().includes('admin') || currentUser?.role?.includes('แอดมิน') || currentUser?.role?.toLowerCase().includes('manage') || currentUser?.role?.includes('ผู้จัดการ')) && (
              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2 bg-gray-50/50 p-2 rounded-lg -mx-2">
                <dt className="text-gray-500 font-medium flex items-center">มูลค่าโครงการ (ไม่รวม VAT):</dt>
                <dd className="col-span-2 font-bold text-gray-700">
                  {project.projectValue ? `฿${(Number(project.projectValue) * 100 / 107).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </dd>
              </div>
            )}
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">งบประมาณภายใน:</dt>
              <dd className="col-span-2 font-bold text-emerald-600">
                {project.budget ? `฿${Number(project.budget).toLocaleString()}` : '-'}
              </dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">เงินประกัน 5%:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.securityDeposit ? `฿${Number(project.securityDeposit).toLocaleString()}` : '-'} 
                {project.depositCollectionSchedule ? ` (กำหนดคืน: ${new Date(project.depositCollectionSchedule).toLocaleDateString('th-TH')})` : ''}
              </dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ค่าปรับ/วัน:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.penaltyPerDay ? `฿${Number(project.penaltyPerDay).toLocaleString()}` : '-'}
              </dd>
            </div>
            <div className="mt-4 pt-2 border-t border-gray-100">
              <p className="font-bold text-gray-700 mb-2">การแบ่งชำระ (Installments)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-xs">งวด 1: <span className="font-bold">{project.installment1 ? `฿${Number(project.installment1).toLocaleString()}` : '-'}</span></div>
                <div className="text-xs">งวด 2: <span className="font-bold">{project.installment2 ? `฿${Number(project.installment2).toLocaleString()}` : '-'}</span></div>
                <div className="text-xs">งวด 3: <span className="font-bold">{project.installment3 ? `฿${Number(project.installment3).toLocaleString()}` : '-'}</span></div>
                <div className="text-xs">งวด 4: <span className="font-bold">{project.installment4 ? `฿${Number(project.installment4).toLocaleString()}` : '-'}</span></div>
              </div>
            </div>
          </dl>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900">ระยะเวลาและเอกสาร (Timeline & Docs)</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">วันที่เริ่ม:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">วันที่สิ้นสุด:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ระยะเวลา:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.projectDuration ? `${project.projectDuration} ${project.projectDurationUnit || 'วัน'}` : '-'}
              </dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">วันที่ส่งมอบ:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('th-TH') : '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">JB Number:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.jbNumber || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">เอกสารส่งมอบ:</dt>
              <dd className="col-span-2 font-bold text-gray-900">{project.deliveryDocNumber || '-'}</dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">ขอรับรองงานเสร็จ:</dt>
              <dd className="col-span-2 font-bold text-gray-900">
                {project.certCompletionRequestNo || '-'}
                {project.certRequestStatus && ` (${project.certRequestStatus})`}
              </dd>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium">Path Folder:</dt>
              <dd className="col-span-2 font-bold text-blue-500">
                {project.pathFolder ? (
                  <a href={project.pathFolder} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                    เปิดโฟลเดอร์
                  </a>
                ) : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* NEW CARD: Procurement & Expenditures */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900">ข้อมูลจัดซื้อและการใช้จ่าย (Procurement & Expenditures)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-1">มูลค่าโครงการ (Project Revenue)</p>
              <p className="text-xl font-black text-gray-900">฿{projectRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-xs font-bold text-red-500 mb-1">ยอดจัดซื้อ (Total Expenditures)</p>
              <p className="text-xl font-black text-brand-red">฿{totalExpenditures.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 mb-1">กำไรเบื้องต้น (Gross Profit)</p>
              <p className="text-xl font-black text-emerald-600">฿{profit.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="font-bold text-gray-700 text-sm mb-3">ใบสั่งซื้อ (PO) ล่าสุด ({pos.length})</h4>
              {pos.length > 0 ? (
                <div className="space-y-2">
                  {pos.slice(0, 5).map((po: any) => (
                    <div key={po.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <span className="font-bold text-sm text-brand-red mr-2">{po.poNumber}</span>
                        <span className="text-xs text-gray-500 truncate block max-w-[200px]">{po.vendorName}</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">฿{Number(po.totalAmount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  {pos.length > 5 && <p className="text-xs text-center text-gray-500 mt-2">...และอีก {pos.length - 5} รายการ</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">ยังไม่มีข้อมูล PO</p>
              )}
            </div>
            <div>
              <h4 className="font-bold text-gray-700 text-sm mb-3">ใบขอซื้อ (PR) ล่าสุด ({prs.length})</h4>
              {prs.length > 0 ? (
                <div className="space-y-2">
                  {prs.slice(0, 5).map((pr: any) => (
                    <div key={pr.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <span className="font-bold text-sm text-blue-600 mr-2">{pr.prNumber}</span>
                        <span className="text-xs text-gray-500 truncate block max-w-[200px]">{pr.requestedBy}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                  ))}
                  {prs.length > 5 && <p className="text-xs text-center text-gray-500 mt-2">...และอีก {prs.length - 5} รายการ</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">ยังไม่มีข้อมูล PR</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    return (
      <div className="space-y-6">
        {renderOverview()}
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="w-full px-6 py-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-gray-900">ทีมงาน และ อุปกรณ์</h3>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 py-0.5 bg-gray-200 rounded-full">Additional</span>
            </div>
            <span className="text-brand-red font-bold text-sm bg-brand-red/10 px-3 py-1 rounded-lg">{showMore ? 'ซ่อน (Hide)' : 'แสดง (Show)'}</span>
          </button>
          
          {showMore && (
            <div className="p-6 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 flex items-center gap-2"><Users size={16}/> ทีมงาน (Team)</h4>
                {renderTeam()}
              </div>
              <div className="space-y-4 lg:col-span-2">
                <h4 className="font-bold text-gray-700 flex items-center gap-2"><Wrench size={16}/> อุปกรณ์ (Equipment)</h4>
                {/* EquipmentTab renders inside its own white box, but here we can just embed it */}
                <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                  <EquipmentTab project={project} isManager={isManager} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderReports = () => {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[700px]">
          <div className="p-6 border-b border-gray-100 shrink-0 bg-gray-50/50">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><ClipboardList size={18} className="text-brand-red"/> บันทึกประจำวัน (Daily Log)</h3>
            <p className="text-xs text-gray-500 mt-1">อัปเดตหน้างานและภาพรวมประจำวัน</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <DailyLogTab project={project} currentUser={currentUser} isManager={isManager} />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[700px]">
          <div className="p-6 border-b border-gray-100 shrink-0 bg-gray-50/50">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500"/> รายงานประจำสัปดาห์ (Weekly)</h3>
            <p className="text-xs text-gray-500 mt-1">สรุปความคืบหน้าของโครงการรายสัปดาห์</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <WeeklyReportTab project={project} isManager={isManager} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        <div className="space-y-1 w-full max-w-2xl">
          <Link href="/projects" className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-brand-red mb-2 transition-colors">
            <ArrowLeft size={14} className="mr-1" /> กลับไปหน้าโครงการ
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{project.name}</h1>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shrink-0 ${
              project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              project.status === 'In progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
              'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {project.status}
            </span>
            {isManager && project.status !== 'Completed' && (
              <button 
                onClick={handleMarkAsCompleted} 
                disabled={isUpdatingStatus}
                title="จบโครงการ (Mark as Completed)"
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                เสร็จสิ้นโครงการ
              </button>
            )}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 shrink-0 gap-4 sm:gap-0 relative">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 w-full pr-12 sm:pr-0">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex items-center gap-2 px-4 py-3 md:px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            <BarChart3 size={16} /> แดชบอร์ด
          </button>
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`flex items-center gap-2 px-4 py-3 md:px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tasks' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            <ListTodo size={16} /> งาน (Tasks)
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`flex items-center gap-2 px-4 py-3 md:px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reports' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            <ClipboardList size={16} /> รายงาน
          </button>
          {(project.projectCategory === 'Solar Roof' || project.projectCategory === 'Solar Pump') && (
            <button 
              onClick={() => setActiveTab('checklist')} 
              className={`flex items-center gap-2 px-4 py-3 md:px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'checklist' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
            >
              <FileText size={16} /> แบบฟอร์มโซลาร์
            </button>
          )}
        </div>
        
        {activeTab === 'tasks' && (
          <div className="flex items-center self-start sm:self-auto absolute right-0 top-0 sm:relative sm:top-auto sm:right-auto bg-white sm:bg-transparent pl-2 pb-1 sm:pb-0">
            {/* Desktop Toggle */}
            <div className="hidden sm:flex bg-gray-100 p-1 rounded-lg sm:mr-4 shrink-0">
              <button onClick={() => setTaskView('list')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-shadow ${taskView === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>List</button>
              <button onClick={() => setTaskView('gantt')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-shadow ${taskView === 'gantt' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Gantt</button>
            </div>
            
            {/* Mobile Toggle */}
            <div className="sm:hidden flex bg-gray-100 p-1 rounded-lg shrink-0 border border-gray-200 mt-1.5">
              <button onClick={() => setTaskView(taskView === 'list' ? 'gantt' : 'list')} className="p-1.5 bg-white shadow-sm rounded text-gray-900 flex items-center justify-center">
                {taskView === 'list' ? <BarChart2 size={16}/> : <ListTodo size={16}/>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pb-8 pt-6 custom-scrollbar pr-2 min-h-0">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'tasks' && (
          <div className="h-full min-h-[600px] md:min-h-0">
            {taskView === 'list' ? renderTaskList() : <GanttChart project={project} currentUser={currentUser} isManager={isManager} />}
          </div>
        )}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'checklist' && <SolarChecklistTab project={project} />}
      </div>
    </div>
  );
}
