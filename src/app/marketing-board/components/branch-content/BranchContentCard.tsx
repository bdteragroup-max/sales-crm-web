'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  User,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  Send,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import type { BranchContentItem } from '@/app/lib/branchContentTypes';
import { CONTENT_TYPES } from '@/app/lib/branchContentTypes';

interface BranchContentCardProps {
  item: BranchContentItem;
  onClick: (item: BranchContentItem) => void;
}

const BRANCH_COLORS: Record<string, string> = {
  ขอนแก่น: 'bg-blue-50 text-blue-700 border-blue-200',
  สุรินทร์: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  สุราษฎร์ธานี: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  ร้อยเอ็ด: 'bg-purple-50 text-purple-700 border-purple-200',
  อุบลราชธานี: 'bg-amber-50 text-amber-800 border-amber-200',
  อุดรธานี: 'bg-rose-50 text-rose-700 border-rose-200',
  กาญจนบุรี: 'bg-teal-50 text-teal-700 border-teal-200',
  พิษณุโลก: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  สกลนคร: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  นครราชสีมา: 'bg-orange-50 text-orange-800 border-orange-200',
  นครศรีธรรมราช: 'bg-sky-50 text-sky-700 border-sky-200',
};

export default function BranchContentCard({ item, onClick }: BranchContentCardProps) {
  const branchBadgeClass =
    BRANCH_COLORS[item.branchName] || 'bg-slate-100 text-slate-700 border-slate-200';

  const contentTypeLabel =
    CONTENT_TYPES.find(t => t.value === item.contentType)?.label.split(' (')[0] ||
    item.contentType;

  // Find latest media for preview
  const latestMedia = item.media?.[0];
  const isVideo =
    latestMedia?.fileType === 'VIDEO' ||
    latestMedia?.mimeType?.startsWith('video/') ||
    item.contentType === 'SHORT_VIDEO';

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      onClick={() => onClick(item)}
      className={`group bg-white rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 flex flex-col overflow-hidden ${
        item.isOverdue
          ? 'border-red-300 ring-1 ring-red-100'
          : item.status === 'APPROVE_1'
          ? 'border-purple-300 ring-1 ring-purple-100'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Media Thumbnail Preview (if available) */}
      {latestMedia && (
        <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
          {latestMedia.fileType === 'VIDEO' || latestMedia.mimeType?.startsWith('video/') ? (
            <video
              src={latestMedia.fileUrl}
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={latestMedia.thumbnailUrl || latestMedia.fileUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Left: Branch Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/95 text-slate-900 shadow-xs">
              สาขา{item.branchName}
            </span>
          </div>

          {/* Top Right: Version & Media Count */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
              V{item.currentVersion}
            </span>
            {isVideo ? (
              <span className="p-1 rounded-md bg-rose-600/90 text-white">
                <Video size={11} />
              </span>
            ) : (
              <span className="p-1 rounded-md bg-blue-600/90 text-white">
                <ImageIcon size={11} />
              </span>
            )}
          </div>

          {/* Bottom Left: Content ID */}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
            <span className="text-[10px] font-mono font-semibold opacity-90">
              {item.contentNo}
            </span>
            {item.media.length > 1 && (
              <span className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded font-medium">
                +{item.media.length - 1} ไฟล์
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-2">
          {/* Top Row (if no media preview) */}
          {!latestMedia && (
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${branchBadgeClass}`}
              >
                สาขา{item.branchName}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400 font-semibold">
                  {item.contentNo}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  V{item.currentVersion}
                </span>
              </div>
            </div>
          )}

          {/* Review Sub-Status or Overdue Alert Banner */}
          {(item.isOverdue ||
            item.status === 'PENDING_REVIEW' ||
            item.status === 'APPROVE_1' ||
            item.status === 'REVISE') && (
            <div className="flex flex-wrap gap-1">
              {item.isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle size={11} /> เกินกำหนดส่ง
                </span>
              )}
              {item.status === 'PENDING_REVIEW' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock size={10} /> รอ ผจก.สาขาตรวจ
                </span>
              )}
              {item.status === 'APPROVE_1' &&
                item.reviewSubStatus !== 'ENDORSED_FOR_MARKETING_MANAGER' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                    <Sparkles size={10} /> ส่งต่อการตลาด • รอตรวจ
                  </span>
                )}
              {item.status === 'APPROVE_1' &&
                item.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                    <ShieldCheck size={11} /> MKT ตรวจผ่าน • รอ ผจก.การตลาดอนุมัติ
                  </span>
                )}
              {item.status === 'REVISE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                  <RotateCcw size={10} /> ส่งแก้รอบที่ {item.revisionCount}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
            {item.title}
          </h4>

          {/* Type & Product Group */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
              {contentTypeLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-medium truncate max-w-[140px]">
              {item.productGroup.split(' / ')[0]}
            </span>
          </div>

          {/* Caption Snippet */}
          {item.caption && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100">
              {item.caption}
            </p>
          )}

          {/* Review Feedback Alert if in REVISE */}
          {item.status === 'REVISE' && item.reviewFeedback && (
            <div className="p-2 rounded-lg bg-orange-50/90 border border-orange-200/80 text-[11px] text-orange-900 line-clamp-2">
              <span className="font-bold">ข้อเสนอแนะ: </span>
              {item.reviewFeedback}
            </div>
          )}

          {/* Channels */}
          {item.targetChannels && item.targetChannels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.targetChannels.slice(0, 3).map((ch, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50/80 text-indigo-700 font-medium border border-indigo-100"
                >
                  {ch.replace(' สาขา', '')}
                </span>
              ))}
              {item.targetChannels.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  +{item.targetChannels.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
          {/* Assignee & Dates */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <User size={12} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium text-slate-700">
                {item.assigneeName || item.createdByName}
              </span>
            </div>

            <div
              className={`flex items-center gap-1 shrink-0 font-medium ${
                item.isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'
              }`}
              title="วันส่งตรวจ / วันวางแผนเผยแพร่"
            >
              <Calendar size={11} />
              <span>
                {item.plannedPublishDate
                  ? `โพสต์ ${formatDate(item.plannedPublishDate)}`
                  : item.submissionDueDate
                  ? `ส่ง ${formatDate(item.submissionDueDate)}`
                  : 'ไม่ระบุวัน'}
              </span>
            </div>
          </div>

          {/* Counts & Published Link */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Paperclip size={11} />
                {item.media?.length || 0}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MessageSquare size={11} />
                {item.comments?.length || 0}
              </span>
            </div>

            {item.status === 'PUBLISHED' && item.publishedUrl ? (
              <a
                href={item.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md"
              >
                ดูโพสต์จริง <ExternalLink size={10} />
              </a>
            ) : item.status === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 size={11} /> อนุมัติแล้ว
              </span>
            ) : item.status === 'APPROVE_1' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700">
                <Sparkles size={11} /> ส่งต่อการตลาด
              </span>
            ) : item.status === 'PENDING_REVIEW' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                <Clock size={11} /> รอ ผจก.สาขา
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

