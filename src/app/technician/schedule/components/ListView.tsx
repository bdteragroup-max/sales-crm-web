"use client";

import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import TaskCard from './TaskCard';

interface ListViewProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export default function ListView({ tasks, onTaskClick }: ListViewProps) {
  // Group tasks by category
  const serviceTasks = tasks.filter(t => t.taskType === 'SERVICE');
  const cleaningTasks = tasks.filter(t => t.taskType === 'PANEL_CLEANING');
  const standaloneTasks = tasks.filter(t => t.taskType === 'STANDALONE');
  const productionTasks = tasks.filter(t => t.taskType === 'PRODUCTION');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {serviceTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            งานช่างและบริการ (Service)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </section>
      )}

      {cleaningTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            งานล้างแผงโซล่าเซลล์ (Panel Cleaning)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cleaningTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </section>
      )}

      {standaloneTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            งานรับเหมา / นอกเหนือ Service (Standalone)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standaloneTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </section>
      )}

      {productionTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            งานฝ่ายผลิต (Production)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productionTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </section>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-20 text-gray-400 font-medium">
          ไม่มีคิวงานในวันที่เลือก
        </div>
      )}
    </div>
  );
}
