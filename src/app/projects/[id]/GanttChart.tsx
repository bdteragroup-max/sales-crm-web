"use client";

import React, { useState, useMemo } from 'react';
import { format, differenceInDays, addDays, min, max, isAfter, startOfDay, isBefore } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { updateTask } from '@/app/actions/projects';
import { Loader2 } from 'lucide-react';

type GanttView = 'day' | 'week' | 'month';

interface GanttChartProps {
  project: any;
  currentUser: any;
  isManager: boolean;
}

export default function GanttChart({ project, currentUser, isManager }: GanttChartProps) {
  const [view, setView] = useState<GanttView>('day');
  const [tasks, setTasks] = useState(project.tasks || []);
  const [isSaving, setIsSaving] = useState(false);
  const [dragging, setDragging] = useState<{
    taskId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Group tasks by category and structure subtasks
  const structuredTasks = useMemo(() => {
    // Only get top-level tasks (no parentTaskId)
    const rootTasks = tasks.filter((t: any) => !t.parentTaskId);
    
    return rootTasks.map((parent: any) => {
      // Find subtasks for this parent
      const subtasks = tasks.filter((t: any) => t.parentTaskId === parent.id);
      
      // Calculate parent dynamic dates if it has subtasks
      let displayStart = new Date(parent.planStart);
      let displayEnd = new Date(parent.planEnd);
      
      if (subtasks.length > 0) {
        const validStarts = subtasks.map((s: any) => new Date(s.planStart)).filter((d: Date) => !isNaN(d.getTime()));
        const validEnds = subtasks.map((s: any) => new Date(s.planEnd)).filter((d: Date) => !isNaN(d.getTime()));
        
        if (validStarts.length > 0) displayStart = startOfDay(min(validStarts));
        if (validEnds.length > 0) displayEnd = startOfDay(max(validEnds));
      }
      
      return {
        ...parent,
        displayStart,
        displayEnd,
        subtasks,
        isParent: subtasks.length > 0
      };
    });
  }, [tasks]);

  // Determine Gantt Chart date range
  const dateRange = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    
    if (tasks.length > 0) {
      const starts = tasks.map((t: any) => new Date(t.planStart));
      const ends = tasks.map((t: any) => new Date(t.planEnd));
      minDate = min(starts);
      maxDate = max(ends);
    }
    
    // Add padding
    minDate = addDays(startOfDay(minDate), -7);
    maxDate = addDays(startOfDay(maxDate), 14);
    
    const days = differenceInDays(maxDate, minDate);
    return {
      minDate,
      maxDate,
      days,
      dates: Array.from({ length: days }).map((_, i) => addDays(minDate, i))
    };
  }, [tasks]);

  const dayWidth = view === 'day' ? 35 : view === 'week' ? 20 : 10;
  
  // Calculate S-Curve Data
  const sCurveData = useMemo(() => {
    if (tasks.length === 0) return [];
    
    const totalWeight = tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0);
    if (totalWeight === 0) return [];

    return dateRange.dates.map(date => {
      let planPct = 0;
      let actualPct = 0;

      tasks.forEach((task: any) => {
        const weight = (task.weight || 1) / totalWeight;
        const taskStart = new Date(task.planStart);
        const taskEnd = new Date(task.planEnd);
        const duration = Math.max(1, differenceInDays(taskEnd, taskStart));
        
        // Plan % up to this date
        if (isAfter(date, taskEnd)) {
          planPct += weight * 100;
        } else if (isAfter(date, taskStart)) {
          const daysCompleted = differenceInDays(date, taskStart);
          planPct += weight * (daysCompleted / duration) * 100;
        }

        // Actual % (simplified: assumes actual progress is reported on or before this date)
        // In a real scenario, you'd track progress history. Here we just use current actualPct if the task started.
        const actualStart = task.actualStart ? new Date(task.actualStart) : taskStart;
        if (isAfter(date, actualStart)) {
           // We'll just show the full current actualPct from the day it started for simplicity.
           actualPct += weight * (task.actualPct || 0);
        }
      });

      return {
        date: format(date, 'dd/MM'),
        planPct: Number(planPct.toFixed(1)),
        actualPct: Number(actualPct.toFixed(1)),
        fullDate: date
      };
    });
  }, [tasks, dateRange.dates]);

  // Handle Dragging
  React.useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragging.startX;
      const daysShift = Math.round(deltaX / dayWidth);
      
      setTasks((prev: any) => prev.map((t: any) => {
        if (t.id === dragging.taskId) {
          if (dragging.type === 'move') {
            return {
              ...t,
              planStart: addDays(dragging.originalStart, daysShift),
              planEnd: addDays(dragging.originalEnd, daysShift),
            };
          } else if (dragging.type === 'resize-left') {
            const newStart = addDays(dragging.originalStart, daysShift);
            if (!isAfter(newStart, t.planEnd)) {
              return { ...t, planStart: newStart };
            }
          } else if (dragging.type === 'resize-right') {
            const newEnd = addDays(dragging.originalEnd, daysShift);
            if (!isBefore(newEnd, t.planStart)) {
              return { ...t, planEnd: newEnd };
            }
          }
        }
        return t;
      }));
    };

    const handlePointerUp = async () => {
      if (!dragging) return;
      const task = tasks.find((t: any) => t.id === dragging.taskId);
      setDragging(null);
      if (task) {
        setIsSaving(true);
        try {
          await updateTask(task.id, { planStart: task.planStart, planEnd: task.planEnd });
        } catch (err) {
          console.error(err);
          alert("Failed to update schedule");
        } finally {
          setIsSaving(false);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, dayWidth, tasks]);

  const handlePointerDown = (e: React.PointerEvent, taskId: string, type: 'move' | 'resize-left' | 'resize-right', start: Date, end: Date) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({
      taskId,
      type,
      startX: e.clientX,
      originalStart: new Date(start),
      originalEnd: new Date(end)
    });
  };

  const handleSaveProgress = async (pct: number) => {
    if (!editingTask) return;
    try {
      const updated = { ...editingTask, actualPct: pct };
      setTasks((prev: any) => prev.map((t: any) => t.id === editingTask.id ? updated : t));
      setEditingTask(null);
      await updateTask(editingTask.id, { actualPct: pct });
    } catch (err) {
      console.error(err);
      alert("Failed to update progress");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Gantt Chart</h2>
          <p className="text-sm text-gray-500">Interactive Timeline & S-Curve</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={view} 
            onChange={(e) => setView(e.target.value as GanttView)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Gantt Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Task List) */}
        <div className="w-1/3 min-w-[250px] max-w-[400px] border-r border-gray-200 bg-white flex flex-col z-10">
          <div className="h-10 border-b border-gray-200 bg-gray-100 flex items-center px-4 font-bold text-xs text-gray-600">
            Task Name
          </div>
          <div className="flex-1 overflow-y-auto">
            {structuredTasks.map((parent: any) => (
              <React.Fragment key={parent.id}>
                {/* Parent Row */}
                <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-sm hover:bg-gray-50">
                  {parent.title}
                </div>
                {/* Subtask Rows */}
                {parent.subtasks.map((sub: any) => (
                  <div key={sub.id} className="h-10 border-b border-gray-50 flex items-center px-4 pl-8 text-sm text-gray-700 hover:bg-gray-50 relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-300"></div>
                    <div className="absolute left-4 top-1/2 w-3 h-px bg-gray-300"></div>
                    {sub.title}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Timeline Grid */}
        <div className="flex-1 overflow-auto bg-white flex flex-col relative" id="gantt-scroll-area">
          {/* Timeline Header */}
          <div className="h-10 border-b border-gray-200 bg-gray-100 flex sticky top-0 z-10" style={{ width: dateRange.days * dayWidth }}>
            {dateRange.dates.map((date, i) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div 
                  key={i} 
                  className={`h-full border-r border-gray-200 flex flex-col items-center justify-center text-[10px] ${isWeekend ? 'bg-gray-200/50' : ''}`}
                  style={{ width: dayWidth, minWidth: dayWidth }}
                >
                  <span className="font-semibold text-gray-600">{format(date, view === 'day' ? 'dd' : 'dd')}</span>
                  {view === 'day' && <span className="text-gray-400">{format(date, 'EEE')}</span>}
                </div>
              );
            })}
          </div>

          {/* Timeline Rows */}
          <div className="relative" style={{ width: dateRange.days * dayWidth }}>
            {/* Grid Background Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
               {dateRange.dates.map((date, i) => (
                 <div key={i} className={`h-full border-r border-gray-100 ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-50/50' : ''}`} style={{ width: dayWidth, minWidth: dayWidth }} />
               ))}
            </div>

            {/* Today Line */}
            {(() => {
              const todayOffset = differenceInDays(startOfDay(new Date()), dateRange.minDate);
              if (todayOffset >= 0 && todayOffset <= dateRange.days) {
                return (
                  <div 
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-brand-red z-20 pointer-events-none"
                    style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                  >
                    <div className="absolute -top-3 -left-6 bg-brand-red text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                      Today
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Task Bars */}
            {structuredTasks.map((parent: any) => (
              <React.Fragment key={`bar-${parent.id}`}>
                {/* Parent Bar */}
                <div className="h-10 border-b border-transparent relative flex items-center">
                  <div 
                    className="absolute h-2 border-t-2 border-l-2 border-r-2 border-gray-400 rounded-t-sm opacity-60 pointer-events-none"
                    style={{
                      left: Math.max(0, differenceInDays(parent.displayStart, dateRange.minDate)) * dayWidth,
                      width: Math.max(1, differenceInDays(parent.displayEnd, parent.displayStart)) * dayWidth,
                      top: '50%'
                    }}
                  />
                </div>

                {/* Subtask Bars */}
                {parent.subtasks.map((sub: any) => {
                  const startOffset = Math.max(0, differenceInDays(new Date(sub.planStart), dateRange.minDate));
                  const duration = Math.max(1, differenceInDays(new Date(sub.planEnd), new Date(sub.planStart)));
                  return (
                    <div key={`bar-${sub.id}`} className="h-10 border-b border-transparent relative flex items-center group">
                      <div 
                        onPointerDown={(e) => handlePointerDown(e, sub.id, 'move', sub.planStart, sub.planEnd)}
                        className="absolute h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-md cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg hover:ring-2 ring-indigo-300 group-hover:z-30"
                        style={{
                          left: startOffset * dayWidth,
                          width: duration * dayWidth,
                        }}
                      >
                         {/* Actual Progress Overlay */}
                         <div 
                           className="absolute top-0 bottom-0 left-0 bg-white/20 rounded-l-full pointer-events-none"
                           style={{ width: `${sub.actualPct || 0}%` }}
                         />
                         
                         {/* Text and interaction area to update progress */}
                         <div 
                           onClick={(e) => { e.stopPropagation(); setEditingTask(sub); }}
                           className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md overflow-hidden whitespace-nowrap px-1 cursor-pointer"
                           title={`${sub.title}\nStart: ${format(new Date(sub.planStart), 'dd/MM/yyyy')}\nEnd: ${format(new Date(sub.planEnd), 'dd/MM/yyyy')}\nActual: ${sub.actualPct || 0}%`}
                         >
                           {sub.actualPct || 0}%
                         </div>

                         {/* Left Drag Handle */}
                         <div 
                           onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, sub.id, 'resize-left', sub.planStart, sub.planEnd); }}
                           className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded-l-full" 
                         />
                         {/* Right Drag Handle */}
                         <div 
                           onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, sub.id, 'resize-right', sub.planStart, sub.planEnd); }}
                           className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded-r-full" 
                         />
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* S-Curve Chart */}
      <div className="h-[250px] border-t border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">S-Curve (% Plan vs % Actual)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sCurveData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{fontSize: 10}} tickMargin={10} stroke="#9CA3AF" />
            <YAxis tick={{fontSize: 10}} stroke="#9CA3AF" domain={[0, 100]} />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="planPct" name="% Plan" stroke="#3B82F6" fillOpacity={0.2} fill="#3B82F6" strokeWidth={3} activeDot={{ r: 6 }} />
            <Area type="monotone" dataKey="actualPct" name="% Actual" stroke="#10B981" fillOpacity={0.2} fill="#10B981" strokeWidth={3} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Progress Popup */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">อัปเดตความคืบหน้า (Update Progress)</h3>
            <p className="text-sm text-gray-500 mb-4">{editingTask.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% เสร็จสิ้น (Actual %)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  defaultValue={editingTask.actualPct || 0}
                  id="actualPctInput"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-brand-red focus:ring-brand-red"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  ยกเลิก (Cancel)
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('actualPctInput') as HTMLInputElement;
                    if (el) handleSaveProgress(Number(el.value));
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-red hover:bg-red-700 rounded-md shadow-sm"
                >
                  บันทึก (Save)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
