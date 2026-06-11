"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createProject, addProjectMember, createTask } from '@/app/actions/projects';

export default function NewProjectClient({ users, jobs, currentUserId, initialJobId }: { users: any[], jobs: any[], currentUserId: string, initialJobId?: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialJob = jobs.find((j: any) => j.id === initialJobId);
  const [formData, setFormData] = useState({
    name: initialJob ? (initialJob.item || '') : '',
    description: '',
    clientName: initialJob ? initialJob.customerName : '',
    siteAddress: '',
    managerId: currentUserId,
    jobId: initialJobId || '',
    startDate: '',
    endDate: '',
    budget: initialJob && initialJob.quotation
      ? (initialJob.quotation.actualClosingAmount || initialJob.quotation.totalAmountBeforeVat || '').toString() 
      : '',
    externalTechnicians: '',
  });

  // Section 2: Team (Manager is already in info)
  const [engineers, setEngineers] = useState<string[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [engineerSearch, setEngineerSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // Section 3: Tasks
  const [tasks, setTasks] = useState<any[]>([]);

  const handleAddTask = () => {
    setTasks([...tasks, { title: '', category: '', assigneeId: '', planStart: '', planEnd: '', weight: 1 }]);
  };

  const handleTaskChange = (index: number, field: string, value: any) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleRemoveTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("กรุณากรอกชื่อโครงการ (Project Name is required)");
    
    setIsSubmitting(true);
    try {
      // 1. Create Project
      const project = await createProject({
        name: formData.name,
        description: formData.description,
        clientName: formData.clientName,
        siteAddress: formData.siteAddress,
        managerId: formData.managerId,
        jobId: formData.jobId || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        externalTechnicians: formData.externalTechnicians || undefined,
      });

      // 2. Add Team Members
      const memberPromises: Promise<any>[] = [];
      engineers.forEach(userId => {
        if (userId) memberPromises.push(addProjectMember(project.id, userId, 'engineer'));
      });
      admins.forEach(userId => {
        if (userId) memberPromises.push(addProjectMember(project.id, userId, 'admin'));
      });
      await Promise.all(memberPromises);

      // 3. Add Initial Tasks
      if (tasks.length > 0) {
        const taskPromises = tasks.map(t => {
          if (!t.title) return Promise.resolve();
          return createTask(project.id, {
            title: t.title,
            category: t.category,
            assigneeId: t.assigneeId || undefined,
            planStart: t.planStart ? new Date(t.planStart) : undefined,
            planEnd: t.planEnd ? new Date(t.planEnd) : undefined,
            weight: t.weight ? parseFloat(t.weight) : 1,
          });
        });
        await Promise.all(taskPromises);
      }

      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">สร้างโครงการใหม่ (New Project)</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">กรอกข้อมูลโครงการ ทีมงาน และกำหนดงานเริ่มต้น</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">1. ข้อมูลโครงการ (Project Information)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ชื่อโครงการ *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ลูกค้า (Client)</label>
              <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">สถานที่ (Site Location)</label>
              <input type="text" value={formData.siteAddress} onChange={e => setFormData({...formData, siteAddress: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">วันที่เริ่ม (Start Date)</label>
              <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">วันที่สิ้นสุด (End Date)</label>
              <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">งบประมาณ (Budget)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">฿</span>
                <input type="number" step="0.01" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
              </div>
              <p className="text-[10px] text-gray-400">ระบุยอดเงินจากใบเสนอราคา (Actual Closing Amount)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เชื่อมโยงกับ Job (Link to Job)</label>
              <select 
                value={formData.jobId} 
                onChange={e => {
                  const newJobId = e.target.value;
                  const selectedJob = jobs.find(j => j.id === newJobId);
                  
                  setFormData(prev => ({
                    ...prev, 
                    jobId: newJobId,
                    // Auto-fill budget if not set, or override it to match the new job's quotation
                    budget: selectedJob?.quotation 
                      ? (selectedJob.quotation.actualClosingAmount || selectedJob.quotation.totalAmountBeforeVat || '').toString() || prev.budget
                      : prev.budget,
                    name: selectedJob?.item || prev.name,
                    clientName: selectedJob?.customerName || prev.clientName
                  }));
                }} 
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
              >
                <option value="">ไม่เชื่อมโยง (None)</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.jobNumber} - {j.customerName}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">รายละเอียดเพิ่มเติม (Description)</label>
              <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
          </div>
        </div>

        {/* Section 2: Team */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">2. ทีมงาน (Team)</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-900">ผู้จัดการโครงการ (Project Manager)</label>
                <select value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-gray-900 bg-gray-50/50">
                  <option value="">เลือกผู้จัดการโครงการ (Select PM)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-gray-900">วิศวกร (Engineers)</label>
                  <span className="text-[10px] font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full">
                    {engineers.length} Selected
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    type="text" 
                    placeholder="ค้นหาวิศวกร (Search...)" 
                    value={engineerSearch}
                    onChange={e => setEngineerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:ring-1 focus:ring-brand-red focus:border-brand-red outline-none bg-gray-50/50"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                {users.filter(u => u.fullName.toLowerCase().includes(engineerSearch.toLowerCase())).map(u => {
                  const isSelected = engineers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) setEngineers(engineers.filter(id => id !== u.id));
                        else setEngineers([...engineers, u.id]);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-brand-red text-white border-brand-red shadow-sm' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {u.fullName}
                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 ml-0.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-gray-900">แอดมิน (Admins)</label>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {admins.length} Selected
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    type="text" 
                    placeholder="ค้นหาแอดมิน (Search...)" 
                    value={adminSearch}
                    onChange={e => setAdminSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none bg-gray-50/50"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                {users.filter(u => u.fullName.toLowerCase().includes(adminSearch.toLowerCase())).map(u => {
                  const isSelected = admins.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) setAdmins(admins.filter(id => id !== u.id));
                        else setAdmins([...admins, u.id]);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-purple-500 text-white border-purple-500 shadow-sm' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {u.fullName}
                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 ml-0.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-sm font-bold text-gray-700">ช่างภายนอก (External Technicians)</label>
              <textarea 
                rows={2} 
                value={formData.externalTechnicians} 
                onChange={e => setFormData({...formData, externalTechnicians: e.target.value})} 
                placeholder="ระบุชื่อช่างภายนอก (Enter names of external technicians, separated by commas)"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Section 3: Initial Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h2 className="text-lg font-bold text-gray-900">3. งานเริ่มต้น (Initial Tasks)</h2>
            <button type="button" onClick={handleAddTask} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors">
              <Plus size={14} /> เพิ่มงาน (Add Task)
            </button>
          </div>
          
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="w-full md:w-1/4 lg:flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">ชื่องาน (Title) *</label>
                    <input type="text" required value={task.title} onChange={e => handleTaskChange(index, 'title', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-1/2 md:w-32 lg:w-40 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">หมวดหมู่ (Category)</label>
                    <input type="text" value={task.category} onChange={e => handleTaskChange(index, 'category', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-1/2 md:w-40 lg:w-48 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">ผู้รับผิดชอบ</label>
                    <select value={task.assigneeId} onChange={e => handleTaskChange(index, 'assigneeId', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none">
                      <option value="">ไม่มี (None)</option>
                      {users.filter(u => [formData.managerId, ...engineers, ...admins].includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </div>
                  <div className="w-1/2 md:w-32 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">เริ่ม (Start)</label>
                    <input type="date" value={task.planStart} onChange={e => handleTaskChange(index, 'planStart', e.target.value)} className="w-full px-3 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-1/2 md:w-32 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">จบ (End)</label>
                    <input type="date" value={task.planEnd} onChange={e => handleTaskChange(index, 'planEnd', e.target.value)} className="w-full px-3 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-full md:w-auto space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Weight</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0.1" step="0.1" value={task.weight} onChange={e => handleTaskChange(index, 'weight', e.target.value)} className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                      <button type="button" onClick={() => handleRemoveTask(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              ยังไม่มีการเพิ่มงาน (No tasks added yet)
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pb-8">
          <Link href="/projects" className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
            ยกเลิก (Cancel)
          </Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-brand-red text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200 disabled:opacity-50">
            <Save size={18} />
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโครงการ (Save Project)'}
          </button>
        </div>
      </form>
    </div>
  );
}
