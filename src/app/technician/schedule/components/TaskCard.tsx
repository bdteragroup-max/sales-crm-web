"use client";

import React from 'react';
import { Clock, MapPin, Wrench, Sun, FileText, CheckCircle2, User, ShieldCheck, ShieldAlert, Camera, Layers } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: any;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  let badgeColor = 'bg-gray-100 text-gray-700';
  let Icon = Wrench;

  if (task.taskType === 'SERVICE') {
    badgeColor = 'bg-red-50 text-red-700 border-red-200';
    Icon = Wrench;
  } else if (task.taskType === 'PANEL_CLEANING') {
    badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
    Icon = Sun;
  } else if (task.taskType === 'STANDALONE') {
    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    Icon = FileText;
  } else if (task.taskType === 'PRODUCTION') {
    badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
    Icon = Wrench;
  }

  const isDone = task.status === 'DONE';

  return (
    <div 
      onClick={onClick}
      className={`relative bg-white border ${isDone ? 'border-green-200 bg-green-50/30' : 'border-gray-200'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
    >
      {isDone && (
        <div className="absolute top-3 right-3 text-green-500">
          <CheckCircle2 size={24} />
        </div>
      )}

      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mb-4 ${badgeColor}`}>
        <Icon size={14} />
        {task.job?.jobNumber || task.project?.name || task.title}
      </div>

      <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {task.title}
      </h4>
      
      <div className="space-y-2 mt-4">
        {task.job?.customerName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} className="text-gray-400" />
            <span className="truncate">{task.job.customerName}</span>
          </div>
        )}
        
        {task.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} className="text-gray-400" />
            <span className="truncate">{task.location}</span>
          </div>
        )}

        {task.panelCount && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers size={16} className="text-gray-400" />
            <span>จำนวน: {task.panelCount} แผง</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600">
          {task.isWarranty ? (
            <><ShieldCheck size={16} className="text-green-500" /> <span className="text-green-600 font-bold">อยู่ในประกัน</span></>
          ) : (
            <><ShieldAlert size={16} className="text-orange-500" /> <span className="text-orange-600 font-bold">ไม่อยู่ในประกัน (มีค่าใช้จ่าย)</span></>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User size={16} className="text-gray-400" />
          <span>มอบหมายโดย: {task.assigner?.fullName} ({task.assignedByRole})</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={16} className="text-gray-400" />
          <span>
            {format(new Date(task.scheduledDate), 'dd MMM yyyy')} 
            {task.startTime && task.endTime ? ` • ${task.startTime} - ${task.endTime}` : ''}
          </span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-medium">
          ช่างเทคนิค: {task.technicianIds?.length || 0} คน
        </p>
      </div>
    </div>
  );
}
