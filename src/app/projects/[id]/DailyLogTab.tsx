"use client";

import React, { useState, useEffect } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { saveDailyLog, getDailyLog } from '@/app/actions/projectReports';
import { Loader2, Camera, Trash2, Save, ClipboardList, Sun, Cloud, CloudRain, CloudLightning } from 'lucide-react';
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
    imageUrls: [] as string[]
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
          imageUrls: Array.isArray(log.imageUrls) ? log.imageUrls as string[] : []
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
            imageUrls: []
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
            imageUrls: []
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

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const handleTaskProgressChange = (taskId: string, val: number) => {
    setFormData(prev => ({
      ...prev,
      taskUpdates: prev.taskUpdates.map(t => t.taskId === taskId ? { ...t, actualPct: val } : t)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveDailyLog(project.id, {
      ...formData,
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
          <h3 className="font-semibold mb-3">2. กำลังคน (Workers)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">จำนวนคนงาน (คน)</label>
              <input 
                type="number" 
                min="0"
                value={formData.workerCount}
                onChange={(e) => setFormData(prev => ({ ...prev, workerCount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">หมายเหตุ</label>
              <input 
                type="text" 
                value={formData.workerNote}
                onChange={(e) => setFormData(prev => ({ ...prev, workerNote: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="เช่น ผู้รับเหมาช่วง 3 คน"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Work summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
          <h3 className="font-semibold">3. รายละเอียดงาน (Tasks Performed)</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1">สรุปงานที่ทำวันนี้</label>
            <textarea 
              rows={3} 
              value={formData.workSummary}
              onChange={(e) => setFormData(prev => ({ ...prev, workSummary: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                    onClick={() => removeImage(idx)}
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
