"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { 
  Clock, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  FolderKanban, 
  ArrowDownCircle
} from 'lucide-react';
import KanbanCard, { stripEmojis } from './KanbanCard';

interface Props {
  column: { id: string; title: string };
  projects: any[];
  children?: React.ReactNode;
}

interface ColumnStyle {
  icon: React.ElementType;
  badge: string;
  headerAccent: string;
  iconBg: string;
  containerBg: string;
  dropRing: string;
  emptyText: string;
  labelEn: string;
}

const COLUMN_STYLES: Record<string, ColumnStyle> = {
  PENDING_REVIEW: {
    icon: Clock,
    badge: 'bg-amber-100 text-amber-800 border-amber-200/80',
    headerAccent: 'text-amber-700',
    iconBg: 'bg-amber-100/80 text-amber-600',
    containerBg: 'bg-slate-100/60 border-slate-200/70',
    dropRing: 'ring-2 ring-amber-400/50 border-amber-400 bg-amber-50/40',
    emptyText: 'ไม่มีงานรอพิจารณา',
    labelEn: 'Pending Review',
  },
  IN_PROGRESS: {
    icon: Activity,
    badge: 'bg-blue-100 text-blue-800 border-blue-200/80',
    headerAccent: 'text-blue-700',
    iconBg: 'bg-blue-100/80 text-blue-600',
    containerBg: 'bg-slate-100/60 border-slate-200/70',
    dropRing: 'ring-2 ring-blue-400/50 border-blue-400 bg-blue-50/40',
    emptyText: 'ไม่มีงานที่กำลังดำเนินการ',
    labelEn: 'In Progress',
  },
  ON_HOLD: {
    icon: AlertCircle,
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    headerAccent: 'text-slate-700',
    iconBg: 'bg-slate-200 text-slate-600',
    containerBg: 'bg-slate-100/60 border-slate-200/70',
    dropRing: 'ring-2 ring-slate-400/50 border-slate-400 bg-slate-50/40',
    emptyText: 'ไม่มีงานที่ระงับชั่วคราว',
    labelEn: 'On Hold',
  },
  COMPLETED: {
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200/80',
    headerAccent: 'text-emerald-700',
    iconBg: 'bg-emerald-100/80 text-emerald-600',
    containerBg: 'bg-slate-100/60 border-slate-200/70',
    dropRing: 'ring-2 ring-emerald-400/50 border-emerald-400 bg-emerald-50/40',
    emptyText: 'ยังไม่มีงานที่เสร็จสิ้น',
    labelEn: 'Completed',
  },
};

const DEFAULT_STYLE: ColumnStyle = {
  icon: FolderKanban,
  badge: 'bg-slate-200 text-slate-700 border-slate-300',
  headerAccent: 'text-slate-700',
  iconBg: 'bg-slate-100 text-slate-600',
  containerBg: 'bg-slate-100/60 border-slate-200/70',
  dropRing: 'ring-2 ring-red-400/50 border-red-400 bg-red-50/40',
  emptyText: 'ไม่มีงานในส่วนนี้',
  labelEn: 'Column',
};

export default function SortableColumn({ column, projects, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'Column' },
  });

  const style = COLUMN_STYLES[column.id] || DEFAULT_STYLE;
  const IconComponent = style.icon;

  // Split title if it has parenthesis like "รอการพิจารณา (Pending)"
  const cleanTitle = stripEmojis(column.title.replace(/\s*\([^)]*\)/g, '')).trim();

  return (
    <div className="flex flex-col w-80 md:w-84 shrink-0 h-full max-h-full select-none">
      {/* Column Header Card */}
      <div className="mb-2.5 px-3 py-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <IconComponent className={`w-3.5 h-3.5 ${column.id === 'IN_PROGRESS' ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-xs tracking-tight truncate leading-tight">
              {cleanTitle}
            </h3>
            <span className="text-[10px] font-medium text-slate-400 leading-none">
              {style.labelEn}
            </span>
          </div>
        </div>

        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${style.badge}`}>
          {projects.length}
        </span>
      </div>

      {/* Column Droppable Body */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-xl p-2 transition-all duration-200 border-2 ${
          style.containerBg
        } ${
          isOver
            ? `${style.dropRing} border-dashed`
            : 'border-transparent hover:border-slate-200/60'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {projects.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200/70 p-6 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${style.iconBg}`}>
              <ArrowDownCircle className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs font-medium text-slate-600 mb-0.5">{style.emptyText}</p>
            <p className="text-[11px] text-slate-400 max-w-[180px]">
              {isOver ? 'ปล่อยการ์ดที่นี่เพื่อย้ายสถานะ' : 'ลากการ์ดมาวางในคอลัมน์นี้'}
            </p>
          </div>
        ) : children ? (
          children
        ) : (
          <div className="flex flex-col gap-3 min-h-[150px]">
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {projects.map((project) => (
                <KanbanCard key={project.id} project={project} />
              ))}
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
}
