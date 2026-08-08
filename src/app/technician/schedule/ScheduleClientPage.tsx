"use client";

import React, { useState, useEffect } from 'react';
import { Plus, List as ListIcon, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { th } from 'date-fns/locale';

import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import NewTaskModal from './components/NewTaskModal';
import CompleteTaskModal from './components/CompleteTaskModal';

import { createTask, completeTask } from '@/app/actions/technicianTask';

interface ScheduleClientPageProps {
  currentUser: any;
  technicians: any[];
  jobs: any[];
  projects: any[];
}

export default function ScheduleClientPage({ currentUser, technicians, jobs, projects }: ScheduleClientPageProps) {
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskDepartment, setNewTaskDepartment] = useState<'PRODUCTION' | 'PROJECT' | 'SERVICE'>('SERVICE');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const canCreateTask = currentUser?.role ? ['SERVICE', 'SERVICE_ENGINEER', 'EXECUTIVE', 'SUPER_ADMIN', 'PRODUCTION', 'PROJECT'].some(r => (currentUser.role || '').toUpperCase().includes(r)) : false;
  
  const fetchTasks = async (start: Date) => {
    setIsLoading(true);
    try {
      const end = addDays(start, 6);
      const res = await fetch(`/api/technician/tasks?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await res.json();
      if (data.success) {
        // Filter tasks if technician (they can only see their own tasks)
        if (currentUser.role === 'TECHNICIAN') {
          setTasks(data.tasks.filter((t: any) => t.technicianIds.includes(currentUser.id)));
        } else {
          setTasks(data.tasks);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(weekStart);
  }, [weekStart]);

  const handlePrevWeek = () => setWeekStart(prev => subDays(prev, 7));
  const handleNextWeek = () => setWeekStart(prev => addDays(prev, 7));

  const handleCreateTask = async (data: any) => {
    await createTask({
      ...data,
      assignedBy: currentUser.id,
      assignedByRole: currentUser.role
    });
    fetchTasks(weekStart); // Refresh
  };

  const handleCompleteTask = async (taskId: string, data: any) => {
    await completeTask(taskId, data);
    fetchTasks(weekStart);
  };

  // For ListView, we show today's tasks
  const todayTasks = tasks.filter(t => new Date(t.scheduledDate).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-blue-600" size={28} />
            ตารางงานช่างเทคนิค
          </h1>
          <p className="text-sm text-gray-500 mt-1">จัดการคิวงาน Service, งานล้างแผง และงานรับเหมา</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ListIcon size={16} /> แบบคิวงาน
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'CALENDAR' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarIcon size={16} /> แบบปฏิทิน
            </button>
          </div>

          {canCreateTask && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setNewTaskDepartment('PRODUCTION'); setIsNewTaskModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
              >
                <Plus size={14} /> งานผลิต
              </button>
              <button
                onClick={() => { setNewTaskDepartment('PROJECT'); setIsNewTaskModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
              >
                <Plus size={14} /> งานโครงการ
              </button>
              <button
                onClick={() => { setNewTaskDepartment('SERVICE'); setIsNewTaskModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
              >
                <Plus size={14} /> งานบริการ
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={32} className="animate-spin mb-4" />
          <p className="font-bold">กำลังโหลดตารางงาน...</p>
        </div>
      ) : (
        <>
          {viewMode === 'LIST' ? (
            <div>
              <div className="mb-4 pb-2 border-b border-gray-200">
                <h2 className="text-lg font-black text-gray-800">
                  คิวงานวันนี้ — {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
                </h2>
              </div>
              <ListView tasks={todayTasks} onTaskClick={setSelectedTask} />
            </div>
          ) : (
            <CalendarView 
              tasks={tasks}
              technicians={technicians}
              weekStart={weekStart}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onTaskClick={setSelectedTask}
            />
          )}
        </>
      )}

      <NewTaskModal 
        isOpen={isNewTaskModalOpen} 
        onClose={() => setIsNewTaskModalOpen(false)} 
        onSubmit={handleCreateTask}
        technicians={technicians}
        jobs={jobs}
        projects={projects}
        department={newTaskDepartment}
      />

      <CompleteTaskModal 
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onComplete={handleCompleteTask}
      />

    </div>
  );
}
