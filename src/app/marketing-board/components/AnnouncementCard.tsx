'use client';

import React, { useState } from 'react';
import { 
  Calendar, Users, Paperclip, CheckCircle2, CircleDot, 
  ExternalLink, Download, Clock, AlertTriangle, Sparkles, FileText, Eye
} from 'lucide-react';
import { acknowledgeAnnouncement } from '@/app/actions/marketingBoard';

export interface AnnouncementItem {
  id: string;
  announcementType: string;
  productGroup: string;
  campaignName: string;
  shortDescription: string;
  campaignDetails: string;
  termsConditions?: string | null;
  startAt: Date | string;
  endAt?: Date | string | null;
  branchScope: string;
  priority: string;
  status: string;
  version: number;
  coverImageUrl?: string | null;
  contactPerson?: string | null;
  publishedAt?: Date | string | null;
  displayOrder: number;
  isFeatured: boolean;
  dynamicStatus: string;
  daysRemaining: number | null;
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt: Date | string | null;
  isBranchApplicable: boolean;
  branches?: Array<{ branchId: string }>;
  assets?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    documentType: string;
    version: string;
  }>;
}

interface AnnouncementCardProps {
  item: AnnouncementItem;
  onOpenDetail: (item: AnnouncementItem) => void;
  onRefresh?: () => void;
}

export default function AnnouncementCard({
  item,
  onOpenDetail,
  onRefresh
}: AnnouncementCardProps) {
  const [isAcknowledged, setIsAcknowledged] = useState(item.isAcknowledged);
  const [isAckLoading, setIsAckLoading] = useState(false);

  const formatDateRange = (start: Date | string, end?: Date | string | null) => {
    try {
      const s = new Date(start);
      const sStr = s.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      if (!end) return `ตั้งแต่ ${sStr}`;
      const e = new Date(end);
      const eStr = e.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${eStr}`;
    } catch {
      return 'ต่อเนื่องตลอด';
    }
  };

  const handleQuickAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAcknowledged || isAckLoading) return;

    try {
      setIsAckLoading(true);
      await acknowledgeAnnouncement(item.id);
      setIsAcknowledged(true);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsAckLoading(false);
    }
  };

  const handleDownloadFirst = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.assets && item.assets.length > 0) {
      window.open(item.assets[0].fileUrl, '_blank');
    } else {
      onOpenDetail(item);
    }
  };

  const formatAnnouncementType = (type: string) => {
    switch (type) {
      case 'Promotion': return 'โปรโมชั่น (Promotion)';
      case 'Marketing Update': return 'ข่าวการตลาด (Update)';
      case 'Product Update': return 'สินค้า/ราคา (Product)';
      case 'Event': return 'กิจกรรม (Event)';
      case 'Urgent Notice': return 'ประกาศด่วน (Urgent)';
      default: return type;
    }
  };

  const getProductGroupLabel = (group: string) => {
    switch (group) {
      case 'Marketing Headquarters': return 'การตลาดส่วนกลาง (Marketing HQ)';
      case 'Inverter': return 'อินเวอร์เตอร์ (Inverter)';
      case 'BLDC / Solar Pump': return 'ปั๊มน้ำโซล่าเซลล์ (BLDC / Solar Pump)';
      case 'Solar Roof': return 'โซลาร์รูฟ (Solar Roof)';
      default: return group;
    }
  };

  const fileCount = item.assets?.length || 0;
  const branchText = item.branchScope === 'ALL'
    ? 'ทุกสาขาทั่วประเทศ'
    : `เฉพาะบางสาขา (${item.branches?.length || 0})`;

  const isEndingSoon = item.dynamicStatus === 'Ending Soon';
  const isScheduled = item.dynamicStatus === 'Scheduled';
  const isDraft = item.dynamicStatus === 'Draft';
  const isPending = item.dynamicStatus === 'Pending Approval';
  const isUrgent = item.priority === 'Urgent';
  const isImportant = item.priority === 'Important';
  const isNewVersion = item.version > 1;

  return (
    <div 
      onClick={() => onOpenDetail(item)}
      className={`group bg-white rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col relative ${
        isUrgent 
          ? 'border-red-300 ring-2 ring-red-500/10 shadow-xs' 
          : 'border-slate-200/90 shadow-2xs hover:border-red-200'
      }`}
    >
      {/* Top Banner / Cover Image */}
      <div className="relative h-44 w-full bg-slate-900 overflow-hidden shrink-0">
        {item.coverImageUrl ? (
          <img 
            src={item.coverImageUrl} 
            alt={item.campaignName} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-2 shadow-inner">
              <Sparkles size={24} />
            </div>
            <span className="text-xs font-bold text-slate-300 tracking-wide">
              {getProductGroupLabel(item.productGroup)}
            </span>
          </div>
        )}

        {/* Subtle Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Symmetrical Top Left Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {item.dynamicStatus === 'Active' && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
              กำลังใช้งาน
            </span>
          )}
          {isEndingSoon && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-amber-300 border border-amber-500/40 shadow-xs animate-pulse">
              ใกล้หมดอายุ
            </span>
          )}
          {isScheduled && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700 text-white shadow-xs">
              ตั้งเวลาล่วงหน้า
            </span>
          )}
          {isDraft && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500 text-white shadow-xs">
              แบบร่าง
            </span>
          )}
          {isPending && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white shadow-xs">
              รออนุมัติ
            </span>
          )}

          {isUrgent && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs animate-pulse ring-1 ring-white/50">
              ด่วนมาก
            </span>
          )}
          {isImportant && !isUrgent && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white shadow-xs border border-white/20">
              สำคัญ
            </span>
          )}
          {isNewVersion && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-900 shadow-xs">
              V{item.version}
            </span>
          )}
        </div>

        {/* Symmetrical Top Right Days Remaining */}
        {item.daysRemaining !== null && item.daysRemaining <= 5 && item.daysRemaining > 0 && (
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded-md text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-xs border border-amber-500/30">
            <Clock size={11} />
            <span>เหลืออีก {item.daysRemaining} วัน</span>
          </div>
        )}

        {/* Symmetrical Bottom Left Announcement Type */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[11px] font-semibold text-white/95 drop-shadow-sm bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
            {formatAnnouncementType(item.announcementType)}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-black text-sm text-slate-900 line-clamp-1 group-hover:text-red-600 transition-colors">
            {item.campaignName}
          </h3>

          {/* Short description with uniform min height for symmetry */}
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed min-h-[34px]">
            {item.shortDescription}
          </p>

          {/* Symmetrical Metadata Container in Soft Gray */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1.5 text-[11px] text-slate-600">
            {/* Dates */}
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{formatDateRange(item.startAt, item.endAt)}</span>
            </div>

            {/* Branches & Files */}
            <div className="flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Users size={13} className="text-slate-400 shrink-0" />
                <span className="truncate font-medium">{branchText}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Paperclip size={12} className="text-slate-400" />
                <span className="font-bold text-slate-700">{fileCount} ไฟล์</span>
              </div>
            </div>
          </div>
        </div>

        {/* Symmetrical Action Buttons & Acknowledge Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
          {/* Twin Buttons Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(item);
              }}
              className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:border-slate-300"
            >
              <Eye size={13} />
              <span>ดูรายละเอียด</span>
            </button>

            <button
              onClick={handleDownloadFirst}
              className="w-full py-2 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs"
            >
              <Download size={13} />
              <span>ดาวน์โหลด</span>
            </button>
          </div>

          {/* Full-width Symmetrical Acknowledge Button / Badge */}
          <div>
            {isAcknowledged ? (
              <div className="w-full py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={15} className="fill-emerald-100 text-emerald-600 shrink-0" />
                <span>รับทราบแล้ว</span>
              </div>
            ) : (
              <button
                onClick={handleQuickAcknowledge}
                disabled={isAckLoading}
                className="w-full py-1.5 px-3 text-xs font-bold text-red-700 bg-red-50/70 hover:bg-red-100 border border-red-200/80 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
              >
                <CircleDot size={13} className={isAckLoading ? 'animate-spin' : 'text-red-500'} />
                <span>{isAckLoading ? 'กำลังบันทึก...' : 'กดรับทราบประกาศนี้'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
