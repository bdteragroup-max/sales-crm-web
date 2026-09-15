'use client';

import React, { useState } from 'react';
import { Search, Archive, Calendar, Users, Paperclip, Eye, RotateCcw } from 'lucide-react';
import AnnouncementCard, { AnnouncementItem } from './AnnouncementCard';

interface ArchiveTabProps {
  archiveItems: AnnouncementItem[];
  onOpenDetail: (item: AnnouncementItem) => void;
  onRefresh: () => void;
  userPermissions?: any;
}

const PRODUCT_GROUPS = [
  { value: 'All Product Groups', label: 'ทุกกลุ่มสินค้า' },
  { value: 'Marketing Headquarters', label: 'การตลาดส่วนกลาง (Headquarters)' },
  { value: 'Inverter', label: 'อินเวอร์เตอร์ (Inverter)' },
  { value: 'BLDC / Solar Pump', label: 'ปั๊มน้ำโซล่าเซลล์ (BLDC / Solar Pump)' },
  { value: 'Solar Roof', label: 'โซลาร์รูฟ (Solar Roof)' }
];

export default function ArchiveTab({
  archiveItems,
  onOpenDetail,
  onRefresh,
  userPermissions
}: ArchiveTabProps) {
  const [search, setSearch] = useState('');
  const [selectedProductGroup, setSelectedProductGroup] = useState('All Product Groups');

  const getProductGroupLabel = (group: string) => {
    switch (group) {
      case 'Marketing Headquarters': return 'การตลาดส่วนกลาง (HQ)';
      case 'Inverter': return 'อินเวอร์เตอร์';
      case 'BLDC / Solar Pump': return 'ปั๊มน้ำโซล่าเซลล์';
      case 'Solar Roof': return 'โซลาร์รูฟ';
      default: return group;
    }
  };

  const filtered = archiveItems.filter(item => {
    if (search.trim() !== '') {
      const q = search.toLowerCase().trim();
      if (!item.campaignName.toLowerCase().includes(q) && !item.shortDescription.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedProductGroup !== 'All Product Groups' && item.productGroup !== selectedProductGroup) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 space-y-6 pb-12">
      {/* Symmetrical Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาแคมเปญในคลังเอกสารประวัติ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition-all"
            />
          </div>

          <select
            value={selectedProductGroup}
            onChange={(e) => setSelectedProductGroup(e.target.value)}
            className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
          >
            {PRODUCT_GROUPS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          แสดง <span className="font-bold text-slate-900">{filtered.length}</span> รายการในคลังประวัติ
        </div>
      </div>

      {/* Symmetrical 4-Column Grid of Archived Announcements */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(item => (
            <div 
              key={item.id}
              onClick={() => onOpenDetail(item)}
              className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-red-200 transition-all cursor-pointer overflow-hidden flex flex-col opacity-90 hover:opacity-100 hover:-translate-y-1"
            >
              {/* Cover Banner */}
              <div className="relative h-40 bg-slate-900 overflow-hidden">
                {item.coverImageUrl ? (
                  <img 
                    src={item.coverImageUrl} 
                    alt={item.campaignName} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-600">
                    <Archive size={30} className="text-slate-500 mb-1" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                    item.dynamicStatus === 'Cancelled' ? 'bg-red-700' : 'bg-slate-700'
                  }`}>
                    {item.dynamicStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : 'หมดอายุ'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/10">
                    {getProductGroupLabel(item.productGroup)}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm line-clamp-1 group-hover:text-red-600 transition-colors">
                    {item.campaignName}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed min-h-[34px]">
                    {item.shortDescription}
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.assets?.length || 0} ไฟล์แนบ
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(item);
                    }}
                    className="py-1.5 px-3 text-xs font-bold text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1 border border-slate-200 shadow-2xs transition-colors"
                  >
                    <Eye size={13} />
                    <span>ดูประวัติ</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Archive size={28} />
          </div>
          <p className="text-sm font-bold text-slate-700">ไม่มีรายการในคลังเอกสารประวัติ</p>
          <p className="text-xs text-slate-400 mt-1">แคมเปญที่หมดอายุหรือถูกยกเลิกจะถูกเก็บประวัติไว้ที่นี่</p>
        </div>
      )}
    </div>
  );
}
