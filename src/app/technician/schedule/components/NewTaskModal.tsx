"use client";

import React, { useState } from 'react';
import { X, Calendar, MapPin, Users } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  technicians: any[];
  jobs: any[];
  projects: any[];
  department?: 'PRODUCTION' | 'PROJECT' | 'SERVICE';
}

const TimeInput = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, '');
    if (val.length === 2 && !val.includes(':') && value.length !== 3) {
      val += ':';
    }
    if (val.length > 5) return;

    // Validate HH:MM logic
    if (val.length === 5) {
      const [h, m] = val.split(':');
      if (parseInt(h) > 23 || parseInt(m) > 59) return;
    }
    onChange(val);
  };

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        placeholder="HH:MM"
        value={value}
        onChange={handleChange}
        className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
      />
    </div>
  );
};

export default function NewTaskModal({ isOpen, onClose, onSubmit, technicians, jobs, projects, department = 'SERVICE' }: NewTaskModalProps) {
  const [taskType, setTaskType] = useState('SERVICE');

  React.useEffect(() => {
    if (isOpen) {
      if (department === 'PRODUCTION') setTaskType('PRODUCTION');
      else if (department === 'PROJECT') setTaskType('STANDALONE');
      else setTaskType('SERVICE');
    }
  }, [isOpen, department]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [jobId, setJobId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isWarranty, setIsWarranty] = useState(false);
  const [panelCount, setPanelCount] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [jobSearchText, setJobSearchText] = useState('');
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const jobDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(event.target as Node)) {
        setIsJobDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        taskType,
        title,
        description,
        scheduledDate: new Date(scheduledDate),
        startTime,
        endTime,
        technicianIds: selectedTechs,
        jobId: jobId || undefined,
        projectId: projectId || undefined,
        isWarranty,
        panelCount: panelCount ? Number(panelCount) : undefined,
        location,
      });
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(`Error creating task: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTech = (id: string) => {
    setSelectedTechs(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800">สร้างงานช่างใหม่</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="newTaskForm" onSubmit={handleSubmit} className="space-y-6">

            {/* Task Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {department === 'SERVICE' && (
                <button
                  type="button"
                  onClick={() => setTaskType('SERVICE')}
                  className={`p-3 rounded-xl border font-bold text-sm transition-all bg-red-50 border-red-200 text-red-700`}
                >
                  งานช่าง/บริการ (Service)
                </button>
              )}
              {department === 'PROJECT' && (
                <>
                  <button
                    type="button"
                    onClick={() => setTaskType('PANEL_CLEANING')}
                    className={`p-3 rounded-xl border font-bold text-sm transition-all ${taskType === 'PANEL_CLEANING' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    ล้างแผง (Panel Cleaning)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType('STANDALONE')}
                    className={`p-3 rounded-xl border font-bold text-sm transition-all ${taskType === 'STANDALONE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    งานรับเหมา (Standalone)
                  </button>
                </>
              )}
              {department === 'PRODUCTION' && (
                <button
                  type="button"
                  onClick={() => setTaskType('PRODUCTION')}
                  className={`p-3 rounded-xl border font-bold text-sm transition-all bg-orange-50 border-orange-200 text-orange-700`}
                >
                  งานฝ่ายผลิต (Production)
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่องาน</label>
                <input
                  type="text" required value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="ระบุชื่องาน..."
                />
              </div>

              {/* Dynamic Fields */}
              {taskType === 'SERVICE' && (
                <div className="relative" ref={jobDropdownRef}>
                  <label className="block text-sm font-bold text-gray-700 mb-1">เลือก Order (Repair/Install)</label>
                  <input
                    type="text"
                    required={!jobId}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="-- พิมพ์เพื่อค้นหา Order --"
                    value={jobSearchText}
                    onChange={(e) => {
                      setJobSearchText(e.target.value);
                      setIsJobDropdownOpen(true);
                      setJobId('');
                    }}
                    onFocus={() => setIsJobDropdownOpen(true)}
                  />
                  {isJobDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {jobs.filter(j =>
                        (j.jobNumber + ' ' + (j.customerName || '')).toLowerCase().includes(jobSearchText.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">ไม่พบข้อมูล</div>
                      ) : (
                        jobs.filter(j =>
                          (j.jobNumber + ' ' + (j.customerName || '')).toLowerCase().includes(jobSearchText.toLowerCase())
                        ).map(j => (
                          <div
                            key={j.id}
                            className="p-3 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0"
                            onClick={() => {
                              setJobId(j.id);
                              setJobSearchText(`${j.jobNumber} - ${j.customerName || 'ไม่ระบุชื่อ'}`);
                              setIsJobDropdownOpen(false);
                            }}
                          >
                            <div className="font-bold">{j.jobNumber}</div>
                            <div className="text-gray-500">{j.customerName || 'ไม่ระบุชื่อ'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {taskType === 'PANEL_CLEANING' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">เลือก Project</label>
                    <select required value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">-- เลือก Project --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนแผง</label>
                      <input type="number" required value={panelCount} onChange={e => setPanelCount(Number(e.target.value))} className="w-full p-3 rounded-xl border border-gray-200 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">สถานที่ (Location)</label>
                      <input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 outline-none" />
                    </div>
                  </div>
                </>
              )}

              {taskType === 'STANDALONE' && (
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="warranty" checked={isWarranty} onChange={e => setIsWarranty(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="warranty" className="text-sm font-bold text-gray-700">ครอบคลุมประกัน (Insurance Coverage)</label>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">วันที่นัดหมาย</label>
                  <input type="date" required value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <TimeInput label="เวลาเริ่ม (Start)" value={startTime} onChange={setStartTime} />
                <TimeInput label="เวลาสิ้นสุด (End)" value={endTime} onChange={setEndTime} />
              </div>

              {/* Technicians */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">เลือกช่างเทคนิค</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {technicians.map(tech => (
                    <div
                      key={tech.id}
                      onClick={() => toggleTech(tech.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${selectedTechs.includes(tech.id) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedTechs.includes(tech.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                        {selectedTechs.includes(tech.id) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <div className="text-sm font-bold truncate">{tech.fullName}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 mt-auto">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
            ยกเลิก
          </button>
          <button
            type="submit" form="newTaskForm" disabled={isSubmitting || selectedTechs.length === 0}
            className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'สร้างงาน'}
          </button>
        </div>
      </div>
    </div>
  );
}
