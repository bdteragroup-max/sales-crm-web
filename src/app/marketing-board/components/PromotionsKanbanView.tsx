'use client';

import React from 'react';
import AnnouncementCard, { AnnouncementItem } from './AnnouncementCard';
import { Sparkles, Zap, Droplets, Sun, Info } from 'lucide-react';

interface PromotionsKanbanViewProps {
  announcements: AnnouncementItem[];
  onOpenDetail: (item: AnnouncementItem) => void;
  onRefresh: () => void;
  userPermissions?: any;
}

interface ColumnConfig {
  id: string;
  title: string;
  subtitle: string;
  badgeCode: string;
  icon: React.ElementType;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'Marketing Headquarters',
    title: 'การตลาดส่วนกลาง',
    subtitle: 'Marketing Headquarters (HQ)',
    badgeCode: 'HQ',
    icon: Sparkles
  },
  {
    id: 'Inverter',
    title: 'อินเวอร์เตอร์',
    subtitle: 'AC Drive • VFD / VSD Automation',
    badgeCode: 'INV',
    icon: Zap
  },
  {
    id: 'BLDC / Solar Pump',
    title: 'ปั๊มน้ำโซล่าเซลล์',
    subtitle: 'BLDC & Solar Agricultural Pump',
    badgeCode: 'BLDC',
    icon: Droplets
  },
  {
    id: 'Solar Roof',
    title: 'โซลาร์รูฟ',
    subtitle: 'Residential & Factory Solar Rooftop',
    badgeCode: 'ROOF',
    icon: Sun
  }
];

export default function PromotionsKanbanView({
  announcements,
  onOpenDetail,
  onRefresh,
  userPermissions
}: PromotionsKanbanViewProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6">
      {/* 4 Symmetrical Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {COLUMNS.map(col => {
          const colItems = announcements.filter(a => a.productGroup === col.id);
          const Icon = col.icon;
          const hasItems = colItems.length > 0;

          return (
            <div 
              key={col.id}
              className="bg-slate-100/60 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 flex flex-col min-h-[560px] shadow-2xs relative"
            >
              {/* Symmetrical Top Red Accent Strip */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-t-2xl" />

              {/* Column Header */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Icon size={16} className="text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-sm text-slate-950 truncate leading-tight">
                        {col.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                        {col.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Symmetrical Count Pill */}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border transition-all ${
                    hasItems 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {colItems.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-4 flex-1 overflow-y-auto">
                {hasItems ? (
                  colItems.map(item => (
                    <AnnouncementCard
                      key={item.id}
                      item={item}
                      onOpenDetail={onOpenDetail}
                      onRefresh={onRefresh}
                    />
                  ))
                ) : (
                  <div className="py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/60 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <Icon size={18} />
                    </div>
                    <p className="text-xs font-bold text-slate-500">ไม่มีประกาศในหมวดนี้</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">รอประกาศหรือโปรโมชั่นใหม่จากทีมการตลาด</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Symmetrical Footer Info Row */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>ระบบคัดกรองโปรโมชั่นและเอกสารตามสิทธิ์การเข้าถึงของสาขาคุณโดยอัตโนมัติ</span>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <span>การจัดเรียงแคมเปญทำได้โดยฝ่ายการตลาด (Marketing Admin)</span>
          <span>•</span>
          <button 
            onClick={onRefresh}
            className="text-red-600 hover:text-red-700 font-bold hover:underline"
          >
            รีเฟรชข้อมูล (Refresh)
          </button>
        </div>
      </div>
    </div>
  );
}
