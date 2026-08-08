"use client";

import React, { useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import { User, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, ShieldAlert, Camera, Layers } from 'lucide-react';

interface CalendarViewProps {
  tasks: any[];
  technicians: any[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onTaskClick: (task: any) => void;
}

export default function CalendarView({ tasks, technicians, weekStart, onPrevWeek, onNextWeek, onTaskClick }: CalendarViewProps) {
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Pre-process tasks for the grid
  const getTasksForTechAndDay = (techId: string, day: Date) => {
    return tasks.filter(t => {
      const isSameDay = new Date(t.scheduledDate).toDateString() === day.toDateString();
      const hasTech = t.technicianIds?.includes(techId);
      return isSameDay && hasTech;
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
        <button onClick={onPrevWeek} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="text-lg font-black text-gray-800">
          {format(days[0], 'd MMM', { locale: th })} - {format(days[6], 'd MMM yyyy', { locale: th })}
        </div>
        <button onClick={onNextWeek} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className="w-48 p-4 text-left font-bold text-gray-500 bg-gray-50 border-r border-gray-200">
                ช่างเทคนิค
              </th>
              {days.map(day => (
                <th key={day.toISOString()} className="p-3 text-center border-r border-gray-200 bg-gray-50 min-w-[150px]">
                  <div className="font-bold text-gray-800">{format(day, 'EEEE', { locale: th })}</div>
                  <div className="text-sm font-medium text-gray-500">{format(day, 'd MMM', { locale: th })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {technicians.map((tech) => (
              <tr key={tech.id} className="border-t border-gray-200 hover:bg-gray-50/30 transition-colors">
                <td className="p-4 border-r border-gray-200 align-top bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm truncate w-32">{tech.fullName}</div>
                      <div className="text-xs text-gray-500">{tech.role}</div>
                    </div>
                  </div>
                </td>
                {days.map(day => {
                  const dayTasks = getTasksForTechAndDay(tech.id, day);
                  return (
                    <td key={day.toISOString()} className="p-2 border-r border-gray-200 align-top min-h-[100px]">
                      <div className="space-y-2">
                        {dayTasks.map(task => {
                          let bgColor = 'bg-gray-100 text-gray-700 border-gray-200';
                          if (task.taskType === 'SERVICE') bgColor = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
                          if (task.taskType === 'PANEL_CLEANING') bgColor = 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
                          if (task.taskType === 'STANDALONE') bgColor = 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
                          if (task.taskType === 'PRODUCTION') bgColor = 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
                          
                          const isDone = task.status === 'DONE';
                          if (isDone) bgColor = 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';

                          return (
                            <div 
                              key={task.id} 
                              onClick={() => onTaskClick(task)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors relative ${bgColor}`}
                            >
                              {isDone && <CheckCircle2 size={12} className="absolute top-2 right-2 text-green-500" />}
                              <div className="font-bold truncate pr-4">{task.title}</div>
                              <div className="opacity-80 truncate">{task.job?.jobNumber || task.project?.name || ''}</div>
                              {task.startTime && (
                                <div className="mt-1 font-medium opacity-70">
                                  {task.startTime} {task.endTime ? `- ${task.endTime}` : ''}
                                </div>
                              )}
                              <div className="flex gap-1 mt-1">
                                {task.isWarranty ? (
                                  <ShieldCheck size={12} className="text-green-600" />
                                ) : (
                                  <ShieldAlert size={12} className="text-orange-600" />
                                )}
                                {task.panelCount > 0 && <Layers size={12} className="opacity-70" />}
                                {(task.photosBefore?.length > 0 || task.photosAfter?.length > 0) && <Camera size={12} className="opacity-70" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
