"use client";

import React, { useState, useEffect } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { saveDailyLog, getDailyLog } from '@/app/actions/projectReports';
import { Loader2, Camera, Trash2, Save, ClipboardList, Sun, Cloud, CloudRain, CloudLightning, Plus, AlertCircle, User, Briefcase, Clock, Activity, FileText, Users, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DailyLogTab({ project, currentUser, isManager }: { project: any, currentUser: any, isManager: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    weather: 'Sunny',
    temperature: 30,
    workerCount: 0,
    workerNote: '',
    workSummary: '',
    issues: '',
    solutions: '',
    nextPlan: '',
    safetyNote: '',
    incidents: 0,
    taskUpdates: [] as { taskId: string, actualPct: number }[],
    imageUrls: [] as string[],
    delayCause: '',
    delayResponsible: '',
    delayExpectedDate: '',
    delaySeverity: 'Minor',
    tasksPerformed: [{ id: Date.now().toString(), task: '', description: '' }] as { id: string, task: string, description: string }[],
    workers: [] as { id?: string, name: string, position: string, hours: string, status: string, notes: string }[]
  });

  // Pre-fill tasks
  useEffect(() => {
    if (project && project.tasks) {
      setFormData(prev => ({
        ...prev,
        taskUpdates: project.tasks.map((t: any) => ({
          taskId: t.id,
          actualPct: t.actualPct || 0
        }))
      }));
    }
  }, [project]);

  // Load data for selected date
  useEffect(() => {
    async function loadData() {
      if (!project?.id || !currentUser?.id) return;
      setIsLoading(true);
      
      const log = await getDailyLog(project.id, date, currentUser.id);
      
      if (log) {
        setFormData(prev => ({
          ...prev,
          weather: log.weather || 'Sunny',
          temperature: log.temperature || 30,
          workerCount: log.workerCount || 0,
          workerNote: log.workerNote || '',
          workSummary: log.workSummary || '',
          issues: log.issues || '',
          solutions: log.solutions || '',
          nextPlan: log.nextPlan || '',
          safetyNote: log.safetyNote || '',
          incidents: log.incidents || 0,
          taskUpdates: Array.isArray(log.taskUpdates) ? log.taskUpdates as any : prev.taskUpdates,
          imageUrls: Array.isArray(log.imageUrls) ? log.imageUrls as string[] : [],
          delayCause: log.delayCause || '',
          delayResponsible: log.delayResponsible || '',
          delayExpectedDate: log.delayExpectedDate ? format(new Date(log.delayExpectedDate), 'yyyy-MM-dd') : '',
          delaySeverity: log.delaySeverity || 'Minor',
          tasksPerformed: (Array.isArray(log.tasksPerformed) && log.tasksPerformed.length > 0) ? log.tasksPerformed as any : [{ id: Date.now().toString(), task: '', description: '' }],
          workers: log.workers ? log.workers.map((w: any) => ({
            id: w.id,
            name: w.name,
            position: w.position,
            hours: w.hours !== null ? w.hours.toString() : '',
            status: w.status,
            notes: w.notes || ''
          })) : []
        }));
      } else {
        // Pre-fill from yesterday if no log today
        const yesterday = await getDailyLog(project.id, subDays(date, 1), currentUser.id);
        if (yesterday) {
          setFormData(prev => ({
            ...prev,
            workSummary: yesterday.nextPlan || '',
            // Reset daily counters
            workerCount: 0,
            workerNote: '',
            issues: '',
            solutions: '',
            nextPlan: '',
            incidents: 0,
            imageUrls: [],
            delayCause: '',
            delayResponsible: '',
            delayExpectedDate: '',
            delaySeverity: 'Minor',
            tasksPerformed: [{ id: Date.now().toString(), task: '', description: '' }],
            workers: prev.workers.map(w => ({ ...w, hours: '', notes: '' }))
          }));
        } else {
          // Reset all if neither exists
          setFormData(prev => ({
            ...prev,
            weather: 'Sunny',
            temperature: 30,
            workerCount: 0,
            workerNote: '',
            workSummary: '',
            issues: '',
            solutions: '',
            nextPlan: '',
            safetyNote: '',
            incidents: 0,
            imageUrls: [],
            delayCause: '',
            delayResponsible: '',
            delayExpectedDate: '',
            delaySeverity: 'Minor',
            tasksPerformed: [{ id: Date.now().toString(), task: '', description: '' }],
            workers: []
          }));
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, [date, project?.id, currentUser?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Simulate upload for now (In real app: use /api/upload)
    const newUrls = Array.from(files).map(file => URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newUrls] }));
  };

  const handleImageDelete = (index: number) => {
    setFormData(prev => {
      const newUrls = [...prev.imageUrls];
      newUrls.splice(index, 1);
      return { ...prev, imageUrls: newUrls };
    });
  };

  const handleAutoFillTeam = () => {
    const newWorkers = [...formData.workers];
    if (project.manager && !newWorkers.some(w => w.name === project.manager.fullName)) {
      newWorkers.push({ name: project.manager.fullName, position: 'Project Manager', hours: '8', status: 'มาทำงาน', notes: '' });
    }
    project.members?.forEach((m: any) => {
      if (m.user && !newWorkers.some(w => w.name === m.user.fullName)) {
        newWorkers.push({ name: m.user.fullName, position: m.role || 'Team Member', hours: '8', status: 'มาทำงาน', notes: '' });
      }
    });
    setFormData(prev => ({ ...prev, workers: newWorkers }));
  };

  const handleTaskProgressChange = (taskId: string, val: number) => {
    setFormData(prev => ({
      ...prev,
      taskUpdates: prev.taskUpdates.map(t => t.taskId === taskId ? { ...t, actualPct: val } : t)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Filter out empty tasks before saving
    const validTasks = formData.tasksPerformed.filter(t => t.task.trim() !== '');
    
    const res = await saveDailyLog(project.id, {
      ...formData,
      tasksPerformed: validTasks,
      date: startOfDay(date),
      reportedBy: currentUser.id
    });
    setIsSaving(false);
    if (res.success) {
      alert("บันทึกสำเร็จ");
      // Optional: Refresh Project data to get updated task progress
    } else {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + res.error);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-red" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <ClipboardList className="text-brand-red" size={24} /> บันทึกประจำวัน (Daily Log)
          </h2>
          <input 
            type="date" 
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => setDate(new Date(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {/* Section 1: Weather */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <h3 className="font-semibold mb-3">1. สภาพอากาศ (Weather)</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Sunny', 'Cloudy', 'Rainy', 'Storm'].map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, weather: w }))}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${formData.weather === w ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {w === 'Sunny' ? <Sun size={16} className="text-orange-500" /> : w === 'Cloudy' ? <Cloud size={16} className="text-gray-400" /> : w === 'Rainy' ? <CloudRain size={16} className="text-blue-500" /> : <CloudLightning size={16} className="text-yellow-600" />}
                  {w === 'Sunny' ? ' แดดออก' : w === 'Cloudy' ? ' มีเมฆ' : w === 'Rainy' ? ' ฝนตก' : ' พายุ'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-gray-600">อุณหภูมิ (°C):</label>
              <input 
                type="number" 
                value={formData.temperature} 
                onChange={(e) => setFormData(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                className="w-20 border border-gray-300 rounded-md px-2 py-1"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Workers */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
              <Users size={20} className="text-blue-600" /> 2. กำลังคน (Workers Tracker)
            </h3>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleAutoFillTeam}
                className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold shadow-sm"
              >
                <Plus size={14} /> ดึงรายชื่อทีม (Auto-fill)
              </button>
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, workers: [...prev.workers, { name: '', position: 'External Worker', hours: '8', status: 'มาทำงาน', notes: '' }] }))}
                className="flex items-center gap-1.5 text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm"
              >
                <Plus size={14} /> เพิ่มคนงานนอก (Add)
              </button>
            </div>
          </div>

          {formData.workers.length > 0 ? (
            <div className="space-y-3 mb-4">
              {formData.workers.map((worker, index) => (
                <div key={index} className="relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-300 transition-colors">
                  {/* Delete Button at top right of each card */}
                  <button 
                    onClick={() => {
                      const newW = formData.workers.filter((_, i) => i !== index);
                      setFormData(prev => ({ ...prev, workers: newW }));
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    title="ลบรายการ"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="flex flex-col gap-4 pr-6">
                    {/* ROW 1: Name & Position */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 font-bold mb-1.5 uppercase tracking-wide">
                          <User size={14} className="text-gray-400" /> ชื่อ (Name)
                        </label>
                        <input 
                          type="text" 
                          value={worker.name} 
                          onChange={(e) => {
                            const newW = [...formData.workers];
                            newW[index].name = e.target.value;
                            setFormData(prev => ({ ...prev, workers: newW }));
                          }}
                          className="w-full border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-gray-50/30"
                          placeholder="ระบุชื่อพนักงาน..."
                        />
                      </div>
                      
                      {/* Position */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 font-bold mb-1.5 uppercase tracking-wide">
                          <Briefcase size={14} className="text-gray-400" /> ตำแหน่ง (Position)
                        </label>
                        <input 
                          type="text" 
                          value={worker.position} 
                          onChange={(e) => {
                            const newW = [...formData.workers];
                            newW[index].position = e.target.value;
                            setFormData(prev => ({ ...prev, workers: newW }));
                          }}
                          className="w-full border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-gray-50/30"
                          placeholder="เช่น ช่าง, แอดมิน..."
                        />
                      </div>
                    </div>

                    {/* ROW 2: Hours & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hours */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 font-bold mb-1.5 uppercase tracking-wide">
                          <Clock size={14} className="text-gray-400" /> ชั่วโมงการทำงาน (Hrs)
                        </label>
                        <input 
                          type="number" 
                          step="0.5"
                          min="0"
                          value={worker.hours} 
                          onChange={(e) => {
                            const newW = [...formData.workers];
                            newW[index].hours = e.target.value;
                            setFormData(prev => ({ ...prev, workers: newW }));
                          }}
                          className="w-full border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-gray-50/30"
                          placeholder="0"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 font-bold mb-1.5 uppercase tracking-wide">
                          <Activity size={14} className="text-gray-400" /> สถานะ (Status)
                        </label>
                        <div className="flex gap-1 p-1 bg-gray-100/80 rounded-lg border border-gray-200 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              const newW = [...formData.workers];
                              newW[index].status = 'มาทำงาน';
                              setFormData(prev => ({ ...prev, workers: newW }));
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md text-xs font-bold transition-all ${
                              worker.status === 'มาทำงาน' 
                                ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                          >
                            <CheckCircle size={14} className={`shrink-0 ${worker.status === 'มาทำงาน' ? 'text-green-500' : ''}`} />
                            <span className="truncate">มาทำงาน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newW = [...formData.workers];
                              newW[index].status = 'ขาด';
                              setFormData(prev => ({ ...prev, workers: newW }));
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md text-xs font-bold transition-all ${
                              worker.status === 'ขาด' 
                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                          >
                            <XCircle size={14} className={`shrink-0 ${worker.status === 'ขาด' ? 'text-red-500' : ''}`} />
                            <span className="truncate">ขาดงาน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newW = [...formData.workers];
                              newW[index].status = 'ลา';
                              setFormData(prev => ({ ...prev, workers: newW }));
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md text-xs font-bold transition-all ${
                              worker.status === 'ลา' 
                                ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                          >
                            <AlertCircle size={14} className={`shrink-0 ${worker.status === 'ลา' ? 'text-orange-500' : ''}`} />
                            <span className="truncate">ลางาน</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ROW 3: Notes (Full Width) */}
                    <div className="w-full">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 font-bold mb-1.5 uppercase tracking-wide">
                        <FileText size={14} className="text-gray-400" /> หมายเหตุ (Notes)
                      </label>
                      <input 
                        type="text" 
                        value={worker.notes} 
                        onChange={(e) => {
                          const newW = [...formData.workers];
                          newW[index].notes = e.target.value;
                          setFormData(prev => ({ ...prev, workers: newW }));
                        }}
                        className="w-full border-gray-300 rounded-lg text-sm px-3 py-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-gray-50/50"
                        placeholder="หมายเหตุเพิ่มเติม..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-white mb-4">
              <p className="text-gray-500 text-sm mb-3">ยังไม่มีข้อมูลกำลังคนในวันนี้</p>
              <button 
                type="button" 
                onClick={handleAutoFillTeam}
                className="inline-flex items-center gap-1 text-sm bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors font-semibold"
              >
                <Plus size={16} /> ดึงรายชื่อทีมอัตโนมัติ (Auto-fill Team)
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 mt-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">สรุปจำนวนคนงานทั้งหมด (Total Headcount Summary)</label>
              <input 
                type="number" 
                min="0"
                value={formData.workerCount}
                onChange={(e) => setFormData(prev => ({ ...prev, workerCount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                placeholder="เช่น 15 คน"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">หมายเหตุภาพรวม (General Notes)</label>
              <input 
                type="text" 
                value={formData.workerNote}
                onChange={(e) => setFormData(prev => ({ ...prev, workerNote: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                placeholder="เช่น ผู้รับเหมาช่วง 3 คน"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Work summary & Tasks Performed */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">3. รายละเอียดงาน (Tasks Performed)</h3>
            <button 
              type="button" 
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                tasksPerformed: [...prev.tasksPerformed, { id: Date.now().toString(), task: '', description: '' }] 
              }))}
              className="flex items-center gap-1 text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 font-bold text-gray-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> เพิ่มรายการงาน
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.tasksPerformed.map((tp, index) => (
              <div key={tp.id} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex-1 space-y-3">
                  <div>
                    <input 
                      type="text" 
                      placeholder="ชื่องานที่ทำ (Task Name)"
                      value={tp.task}
                      onChange={(e) => {
                        const newTasks = [...formData.tasksPerformed];
                        newTasks[index].task = e.target.value;
                        setFormData(prev => ({ ...prev, tasksPerformed: newTasks }));
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="รายละเอียด/หมายเหตุ (Description/Notes)"
                      value={tp.description}
                      onChange={(e) => {
                        const newTasks = [...formData.tasksPerformed];
                        newTasks[index].description = e.target.value;
                        setFormData(prev => ({ ...prev, tasksPerformed: newTasks }));
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>
                {formData.tasksPerformed.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => {
                      const newTasks = formData.tasksPerformed.filter((_, i) => i !== index);
                      setFormData(prev => ({ ...prev, tasksPerformed: newTasks }));
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm text-gray-600 mb-1">สรุปภาพรวม (Work Summary - Optional)</label>
            <textarea 
              rows={2} 
              value={formData.workSummary}
              onChange={(e) => setFormData(prev => ({ ...prev, workSummary: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="สรุปภาพรวมการทำงานในวันนี้เพิ่มเติม..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ปัญหาที่พบ (Issues)</label>
              <textarea 
                rows={2} 
                value={formData.issues}
                onChange={(e) => setFormData(prev => ({ ...prev, issues: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">วิธีแก้ปัญหา (Solutions)</label>
              <textarea 
                rows={2} 
                value={formData.solutions}
                onChange={(e) => setFormData(prev => ({ ...prev, solutions: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">แผนงานวันพรุ่งนี้ (Plan for tomorrow)</label>
            <textarea 
              rows={2} 
              value={formData.nextPlan}
              onChange={(e) => setFormData(prev => ({ ...prev, nextPlan: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Delay Reason Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
          <h3 className="font-semibold text-orange-600 flex items-center gap-2">
            <AlertCircle size={18} /> สาเหตุที่ล่าช้า (Reason for Delay)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">สาเหตุ (Cause)</label>
              <textarea 
                rows={2} 
                value={formData.delayCause}
                onChange={(e) => setFormData(prev => ({ ...prev, delayCause: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="อธิบายสาเหตุที่ทำให้งานล่าช้า"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">ผู้รับผิดชอบ (Responsible Person)</label>
              <input 
                type="text" 
                value={formData.delayResponsible}
                onChange={(e) => setFormData(prev => ({ ...prev, delayResponsible: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="เช่น ผู้รับเหมา, ลูกค้า, หรือระบุชื่อ"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">วันที่คาดว่าจะเสร็จ (Expected Date)</label>
              <input 
                type="date" 
                value={formData.delayExpectedDate}
                onChange={(e) => setFormData(prev => ({ ...prev, delayExpectedDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">ระดับความรุนแรง (Severity)</label>
              <select 
                value={formData.delaySeverity}
                onChange={(e) => setFormData(prev => ({ ...prev, delaySeverity: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="Minor">Minor (กระทบเล็กน้อย)</option>
                <option value="Moderate">Moderate (กระทบปานกลาง)</option>
                <option value="Critical">Critical (กระทบรุนแรง/วิกฤต)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Task Progress Update */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <h3 className="font-semibold mb-3">4. อัปเดตความคืบหน้างานย่อย (Task Progress)</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {project?.tasks?.map((task: any) => {
              const currentUpdate = formData.taskUpdates.find(t => t.taskId === task.id);
              const val = currentUpdate ? currentUpdate.actualPct : (task.actualPct || 0);
              return (
                <div key={task.id} className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                  <div className="flex-1 font-medium text-sm truncate">{task.title}</div>
                  <div className="flex items-center gap-3 w-64">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={val}
                      onChange={(e) => handleTaskProgressChange(task.id, Number(e.target.value))}
                      className="w-full accent-brand-red"
                    />
                    <span className="w-12 text-right font-bold text-sm text-gray-700">{val}%</span>
                  </div>
                </div>
              );
            })}
            {(!project?.tasks || project.tasks.length === 0) && (
              <p className="text-gray-500 text-sm">ไม่มีงานย่อยในโครงการนี้</p>
            )}
          </div>
        </div>

        {/* Section 5: Safety */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <h3 className="font-semibold mb-3">5. ความปลอดภัย (Safety)</h3>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">จำนวนอุบัติเหตุ (ครั้ง)</label>
              <input 
                type="number" 
                min="0"
                value={formData.incidents}
                onChange={(e) => setFormData(prev => ({ ...prev, incidents: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">บันทึกความปลอดภัย</label>
              <input 
                type="text" 
                value={formData.safetyNote}
                onChange={(e) => setFormData(prev => ({ ...prev, safetyNote: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ระบุรายละเอียดหากมีอุบัติเหตุ"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Photos */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">6. รูปภาพหน้างาน (On-site Photos)</h3>
            <div>
              <input type="file" multiple accept="image/*" id="photo-upload" className="hidden" onChange={handleFileUpload} />
              <label htmlFor="photo-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 font-medium">
                <Camera size={16} /> อัปโหลดรูป
              </label>
            </div>
          </div>
          
          {formData.imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.imageUrls.map((url, idx) => (
                <div key={idx} className="relative group aspect-video bg-gray-200 rounded-md overflow-hidden">
                  <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleImageDelete(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-md bg-white">
              ไม่มีรูปภาพอัปโหลด
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-red text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            บันทึก Daily Log
          </button>
        </div>

      </div>
    </div>
  );
}
