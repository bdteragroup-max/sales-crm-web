'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Building2,
  Paperclip,
  MessageSquare,
  History,
  CheckCircle2,
  RotateCcw,
  Send,
  ExternalLink,
  Copy,
  Download,
  Edit3,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Globe,
  Ban,
  Video,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  submitBranchContentForReview,
  branchReviewContent,
  reviewBranchContent,
  approveBranchContent,
  markBranchContentPublished,
  addBranchContentComment,
  cancelBranchContent,
} from '@/app/actions/branchContent';
import type {
  BranchContentItem,
  BranchContentPermissions,
} from '@/app/lib/branchContentTypes';
import { CONTENT_TYPES, TARGET_CHANNELS } from '@/app/lib/branchContentTypes';

interface BranchContentDetailModalProps {
  item: BranchContentItem | null;
  onClose: () => void;
  onUpdate: (updated: BranchContentItem) => void;
  onEditClick: (item: BranchContentItem) => void;
  permissions: BranchContentPermissions | null;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  BACKLOG: { label: 'Backlog (ไอเดีย)', className: 'bg-slate-100 text-slate-800 border-slate-300' },
  IN_PROGRESS: { label: 'In Progress (กำลังผลิต)', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  PENDING_REVIEW: { label: 'Pending Review (รอ ผจก.สาขาตรวจ)', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  APPROVE_1: { label: 'Approve - 1 (รอการตลาดตรวจ)', className: 'bg-purple-100 text-purple-900 border-purple-300' },
  REVISE: { label: 'Revise (ส่งกลับแก้ไข)', className: 'bg-orange-100 text-orange-900 border-orange-300' },
  APPROVED: { label: 'Approved (อนุมัติแล้ว)', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  PUBLISHED: { label: 'Published (เผยแพร่แล้ว)', className: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  CANCELLED: { label: 'Cancelled (ยกเลิก)', className: 'bg-rose-100 text-rose-900 border-rose-300' },
};

export default function BranchContentDetailModal({
  item,
  onClose,
  onUpdate,
  onEditClick,
  permissions,
}: BranchContentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'publish' | 'history'>('overview');
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [versionFilter, setVersionFilter] = useState<number | 'ALL'>('ALL');

  // Review & Comment states
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [submissionNoteInput, setSubmissionNoteInput] = useState('');

  // Publish states
  const [actualChannel, setActualChannel] = useState(
    item?.actualChannel || item?.targetChannels?.[0] || TARGET_CHANNELS[0]
  );
  const [actualPublishDate, setActualPublishDate] = useState(
    item?.actualPublishDate
      ? item.actualPublishDate.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [publishedUrl, setPublishedUrl] = useState(item?.publishedUrl || '');

  const [isProcessing, setIsProcessing] = useState(false);

  if (!item) return null;

  const statusInfo = STATUS_BADGE[item.status] || STATUS_BADGE.BACKLOG;
  const contentTypeLabel =
    CONTENT_TYPES.find(t => t.value === item.contentType)?.label || item.contentType;

  const filteredMedia =
    versionFilter === 'ALL'
      ? item.media
      : item.media.filter(m => m.version === versionFilter);

  const activeMedia = filteredMedia[selectedMediaIdx] || filteredMedia[0] || null;

  const canEditContent =
    permissions?.canViewAllBranches ||
    (item.status !== 'PENDING_REVIEW' &&
      item.status !== 'PUBLISHED' &&
      item.status !== 'CANCELLED');

  const formatDateTime = (dStr?: string | null) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dStr?: string | null) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCopyCaption = () => {
    if (!item.caption) return;
    navigator.clipboard.writeText(item.caption);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอก Caption แล้ว',
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const handleSubmitForReview = async () => {
    setIsProcessing(true);
    try {
      const res = await submitBranchContentForReview(item.id, submissionNoteInput);
      if (res.success && res.data) {
        onUpdate(res.data);
        setSubmissionNoteInput('');
        Swal.fire({
          icon: 'success',
          title: 'ส่งให้ผู้จัดการสาขาตรวจสอบแล้ว',
          text: `ล็อกเวอร์ชัน V${res.data.currentVersion} เรียบร้อยแล้ว`,
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'warning', title: 'ไม่สามารถส่งตรวจได้', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBranchManagerAction = async (
    action: 'APPROVE_TO_MARKETING' | 'REQUEST_REVISION'
  ) => {
    if (action === 'REQUEST_REVISION' && !reviewFeedbackInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุสิ่งที่ต้องการให้พนักงานสาขาแก้ไข',
        text: 'พนักงานสาขาจะเห็นข้อความนี้เพื่อนำไปปรับแก้งานก่อนส่งตรวจใหม่',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await branchReviewContent(item.id, action, reviewFeedbackInput);
      if (res.success && res.data) {
        onUpdate(res.data);
        setReviewFeedbackInput('');
        Swal.fire({
          icon: 'success',
          title:
            action === 'REQUEST_REVISION'
              ? 'ส่งกลับให้พนักงานสาขาแก้ไขแล้ว'
              : 'ผจก.สาขาตรวจผ่าน • ย้ายไปที่ Approve - 1 เพื่อให้การตลาดตรวจแล้ว',
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'error', title: 'ทำรายการไม่สำเร็จ', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewerAction = async (action: 'REQUEST_REVISION' | 'ENDORSE_FOR_APPROVAL') => {
    if (action === 'REQUEST_REVISION' && !reviewFeedbackInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุสิ่งที่ต้องการให้แก้ไข (Feedback)',
        text: 'สาขาจะเห็นข้อความนี้เพื่อนำไปปรับแก้ให้ตรงจุด',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await reviewBranchContent(item.id, action, reviewFeedbackInput);
      if (res.success && res.data) {
        onUpdate(res.data);
        setReviewFeedbackInput('');
        Swal.fire({
          icon: 'success',
          title:
            action === 'REQUEST_REVISION'
              ? 'ส่งกลับให้สาขาแก้ไขแล้ว'
              : 'ตรวจผ่านเบื้องต้น • เสนอผู้จัดการการตลาดอนุมัติแล้ว',
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'error', title: 'ทำรายการไม่สำเร็จ', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproverAction = async () => {
    setIsProcessing(true);
    try {
      const res = await approveBranchContent(item.id, reviewFeedbackInput);
      if (res.success && res.data) {
        onUpdate(res.data);
        setReviewFeedbackInput('');
        Swal.fire({
          icon: 'success',
          title: 'อนุมัติคอนเทนต์เรียบร้อยแล้ว (Approved)',
          text: 'สาขาสามารถนำคอนเทนต์ไปโพสต์เผยแพร่และกลับมาแนบลิงก์ได้ทันที',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'error', title: 'ไม่สามารถอนุมัติได้', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPublished = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishedUrl.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุลิงก์โพสต์จริง (Published URL)',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await markBranchContentPublished(item.id, {
        actualChannel,
        actualPublishDate,
        publishedUrl,
      });
      if (res.success && res.data) {
        onUpdate(res.data);
        Swal.fire({
          icon: 'success',
          title: 'บันทึกผลการเผยแพร่สำเร็จ (Published)',
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setIsProcessing(true);
    try {
      const res = await addBranchContentComment(item.id, commentInput);
      if (res.success && res.data) {
        onUpdate(res.data);
        setCommentInput('');
      } else {
        Swal.fire({ icon: 'error', title: 'ส่งความคิดเห็นไม่สำเร็จ', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelContent = async () => {
    const { value: reason } = await Swal.fire({
      title: 'ยืนยันการยกเลิกคอนเทนต์?',
      input: 'textarea',
      inputLabel: 'กรุณาระบุเหตุผลในการยกเลิก (ข้อมูล Audit History จะยังคงถูกเก็บไว้)',
      inputPlaceholder: 'ระบุเหตุผล...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันยกเลิกงาน',
      cancelButtonText: 'ปิด',
    });

    if (!reason) return;
    setIsProcessing(true);
    try {
      const res = await cancelBranchContent(item.id, reason);
      if (res.success && res.data) {
        onUpdate(res.data);
        Swal.fire({
          icon: 'success',
          title: 'ยกเลิกรายการแล้ว',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'error', title: 'ไม่สามารถยกเลิกได้', text: res.error });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[93vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-start justify-between gap-4 sticky top-0 z-10">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                {item.contentNo}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-extrabold">
                สาขา{item.branchName}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                Version {item.currentVersion}
              </span>
              {item.revisionCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 text-[11px] font-bold">
                  แก้ไขแล้ว {item.revisionCount} รอบ
                </span>
              )}
              {item.isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-bold animate-pulse">
                  <AlertTriangle size={12} /> เกินกำหนดเวลา
                </span>
              )}
            </div>

            <h2 className="text-lg font-extrabold text-slate-900 leading-snug pt-0.5">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEditContent && (
              <button
                type="button"
                onClick={() => onEditClick(item)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-bold transition-all"
              >
                <Edit3 size={14} /> แก้ไขเนื้อหา/ไฟล์
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip size={14} />
            1. เนื้อหาและสื่อพรีวิว ({item.media.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={14} />
            2. การตรวจ • คอมเมนต์ • อนุมัติ ({item.comments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('publish')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'publish'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe size={14} />
            3. บันทึกผลเผยแพร่จริง (Published URL)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-red-600 text-red-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={14} />
            4. ประวัติ Audit Log ({item.logs.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* TAB 1: OVERVIEW & MEDIA PREVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 Cols: Interactive Media Preview */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Video size={16} className="text-red-600" />
                    พรีวิวภาพ / วิดีโอ ({filteredMedia.length} ไฟล์)
                  </span>

                  {item.currentVersion > 1 && (
                    <select
                      value={versionFilter}
                      onChange={e => {
                        setVersionFilter(
                          e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                        );
                        setSelectedMediaIdx(0);
                      }}
                      className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="ALL">ทุกเวอร์ชัน</option>
                      {Array.from({ length: item.currentVersion }, (_, i) => i + 1).map(v => (
                        <option key={v} value={v}>
                          เฉพาะ Version {v}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {activeMedia ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center min-h-[280px] max-h-[420px]">
                      {activeMedia.fileType === 'VIDEO' ||
                      activeMedia.mimeType?.startsWith('video/') ? (
                        <video
                          key={activeMedia.fileUrl}
                          src={activeMedia.fileUrl}
                          controls
                          className="max-h-[400px] w-full object-contain"
                        />
                      ) : activeMedia.fileType === 'IMAGE' ? (
                        <img
                          src={activeMedia.fileUrl}
                          alt={activeMedia.fileName}
                          className="max-h-[400px] w-full object-contain"
                        />
                      ) : (
                        <div className="p-8 text-center text-white space-y-2">
                          <FileText size={40} className="mx-auto text-slate-400" />
                          <p className="font-semibold">{activeMedia.fileName}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">
                          {activeMedia.fileName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Version {activeMedia.version} • อัปโหลดโดย {activeMedia.uploadedByName || '-'}
                        </p>
                      </div>
                      <a
                        href={activeMedia.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={activeMedia.fileName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition-colors"
                      >
                        <Download size={13} /> ดาวน์โหลดไฟล์ต้นฉบับ
                      </a>
                    </div>

                    {/* Thumbnails Selector */}
                    {filteredMedia.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {filteredMedia.map((m, idx) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMediaIdx(idx)}
                            className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                              idx === selectedMediaIdx
                                ? 'border-red-600 ring-2 ring-red-200'
                                : 'border-slate-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            {m.fileType === 'VIDEO' ? (
                              <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                                <Video size={18} />
                              </div>
                            ) : (
                              <img
                                src={m.fileUrl}
                                alt={m.fileName}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/70 text-white text-[9px] rounded">
                              V{m.version}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <ImageIcon size={36} className="mb-2 stroke-1" />
                    <p className="font-bold text-slate-600">ยังไม่มีไฟล์ภาพหรือวิดีโอแนบ</p>
                    <p className="text-[11px] mt-0.5">
                      สามารถกดปุ่ม &ldquo;แก้ไขเนื้อหา/ไฟล์&rdquo; ด้านบนเพื่ออัปโหลดสื่อได้
                    </p>
                  </div>
                )}
              </div>

              {/* Right 6 Cols: Caption & Metadata */}
              <div className="lg:col-span-6 space-y-4">
                {/* Latest Review Alert Box */}
                {item.reviewFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl border space-y-1 ${
                      item.status === 'REVISE'
                        ? 'bg-orange-50 border-orange-200 text-orange-950'
                        : 'bg-purple-50 border-purple-200 text-purple-950'
                    }`}
                  >
                    <div className="font-extrabold flex items-center justify-between">
                      <span>
                        ความเห็นจากฝ่ายการตลาด ({item.reviewerName || 'Marketing'}):
                      </span>
                      <span className="text-[10px] opacity-75">
                        {formatDateTime(item.reviewedAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {item.reviewFeedback}
                    </p>
                  </div>
                )}

                {/* Caption Box */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      ข้อความโพสต์ / Caption
                    </span>
                    {item.caption && (
                      <button
                        type="button"
                        onClick={handleCopyCaption}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] shadow-2xs"
                      >
                        <Copy size={12} /> คัดลอก Caption
                      </button>
                    )}
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto text-slate-800">
                    {item.caption || 'ยังไม่ได้ระบุข้อความ Caption'}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-medium block">ประเภทคอนเทนต์</span>
                    <span className="font-bold text-slate-900">{contentTypeLabel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">กลุ่มสินค้า</span>
                    <span className="font-bold text-red-700">{item.productGroup}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">วัตถุประสงค์</span>
                    <span className="font-semibold text-slate-800">{item.objective || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">สัดส่วนสื่อ (Format)</span>
                    <span className="font-semibold text-slate-800">{item.mediaFormat || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">ผู้สร้าง / ผู้รับผิดชอบ</span>
                    <span className="font-semibold text-slate-800">
                      {item.assigneeName || item.createdByName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Call to Action (CTA)</span>
                    <span className="font-semibold text-slate-800">{item.callToAction || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">กำหนดส่งตรวจ</span>
                    <span className="font-bold text-slate-800">
                      {formatDateOnly(item.submissionDueDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">วันที่วางแผนเผยแพร่</span>
                    <span className="font-bold text-blue-700">
                      {formatDateOnly(item.plannedPublishDate)}
                    </span>
                  </div>
                </div>

                {/* Channels & Reference */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">ช่องทางเป้าหมาย:</span>
                    {item.targetChannels.map((ch, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>

                  {item.referenceUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold">ลิงก์อ้างอิง / ไฟล์สำรอง:</span>
                      <a
                        href={item.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1 truncate max-w-xs"
                      >
                        {item.referenceUrl} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {item.description && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        คำอธิบายเพิ่มเติม / บรีฟจากสาขา:
                      </span>
                      <p className="text-slate-600 whitespace-pre-wrap">{item.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REVIEW, FEEDBACK & APPROVAL WORKSPACE */}
          {activeTab === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 Cols: Workflow Action Panel based on Role */}
              <div className="lg:col-span-6 space-y-4">
                {/* Current Approval & Review Status Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-red-600" />
                    สถานะการตรวจและอนุมัติปัจจุบัน
                  </h4>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">
                        ผู้ตรวจเนื้อหา (Marketing Reviewer)
                      </span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {item.reviewerName || 'รอการตรวจสอบ'}
                      </p>
                      {item.reviewedAt && (
                        <span className="text-[10px] text-slate-500">
                          {formatDateTime(item.reviewedAt)}
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">
                        ผู้อนุมัติ (ผู้จัดการการตลาด)
                      </span>
                      <p className="font-bold text-emerald-700 mt-0.5">
                        {item.approvedByName || 'รออนุมัติ'}
                      </p>
                      {item.approvedAt && (
                        <span className="text-[10px] text-slate-500">
                          {formatDateTime(item.approvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Branch Staff Submission Box */}
                {(item.status === 'BACKLOG' ||
                  item.status === 'IN_PROGRESS' ||
                  item.status === 'REVISE') && (
                  <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-3">
                    <h4 className="font-extrabold text-red-900 text-sm flex items-center gap-1.5">
                      <Send size={15} />
                      ขั้นตอนที่ 1: ส่งงานให้ผู้จัดการสาขาตรวจก่อน (Submit for Branch Review)
                    </h4>
                    <textarea
                      rows={2}
                      value={submissionNoteInput}
                      onChange={e => setSubmissionNoteInput(e.target.value)}
                      placeholder="ระบุหมายเหตุถึงผู้จัดการสาขา / ทีมการตลาด (เช่น แก้ไขแคปชั่นและเปลี่ยนภาพหน้าปกเรียบร้อยแล้วครับ)..."
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleSubmitForReview}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      {item.status === 'REVISE'
                        ? `ส่งให้ ผจก.สาขาตรวจรอบใหม่ (เป็น Version ${item.currentVersion + 1})`
                        : `ยืนยันส่งให้ ผจก.สาขาตรวจ (Version ${item.currentVersion})`}
                    </button>
                  </div>
                )}

                {/* Step 2: Branch Manager Review Workspace (Pending Review -> Approve - 1) */}
                {permissions?.canBranchApprove &&
                  (item.status === 'PENDING_REVIEW' || item.status === 'IN_PROGRESS') && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                          <Building2 size={15} className="text-amber-700" />
                          ขั้นตอนที่ 2: สำหรับผู้จัดการสาขาตรวจ (ย้ายไป Approve - 1)
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          ผจก.สาขาตรวจก่อนส่งการตลาด
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        เมื่อผู้จัดการสาขาตรวจสอบเนื้อหาและสื่อแล้ว หากไม่มีแก้ไขเพิ่มเติม กดปุ่ม{' '}
                        <strong>&ldquo;ผจก.สาขาตรวจผ่าน • ย้ายไป Approve - 1&rdquo;</strong>{' '}
                        เพื่อส่งเข้า Loop การตลาดสำนักงานใหญ่
                      </p>

                      <textarea
                        rows={2}
                        value={reviewFeedbackInput}
                        onChange={e => setReviewFeedbackInput(e.target.value)}
                        placeholder="ความเห็นจากผู้จัดการสาขา (ระบุสิ่งที่ต้องแก้หากส่งกลับ หรือหมายเหตุถึงทีมการตลาด)..."
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleBranchManagerAction('REQUEST_REVISION')}
                          className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <RotateCcw size={14} />
                          ส่งกลับให้สาขาแก้ไข (Revise)
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleBranchManagerAction('APPROVE_TO_MARKETING')}
                          className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
                        >
                          <CheckCircle2 size={14} />
                          ผจก.สาขาผ่าน • ย้ายไป Approve - 1
                        </button>
                      </div>
                    </div>
                  )}

                {/* Step 3: HQ Marketing Reviewer & Marketing Manager Workspace (At Approve - 1) */}
                {permissions?.canReview && (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5">
                        <Sparkles size={15} className="text-indigo-600" />
                        ขั้นตอนที่ 3: สำหรับฝ่ายการตลาดตรวจที่ Approve - 1 (HQ Marketing Loop)
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        สิทธิ์ของคุณ: {permissions.roleLabel}
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={reviewFeedbackInput}
                      onChange={e => setReviewFeedbackInput(e.target.value)}
                      placeholder="พิมพ์ Feedback จุดที่ต้องให้สาขาแก้ไข หรือหมายเหตุประกอบการเสนอขออนุมัติ/การอนุมัติ..."
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Request Revision Button (Both Marketing Reviewer & Approver can do this) */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReviewerAction('REQUEST_REVISION')}
                        className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <RotateCcw size={14} />
                        ส่งกลับให้สาขาแก้ไข (Revise)
                      </button>

                      {/* Endorse for Manager Approval (For Marketing Staff) */}
                      {!permissions.canApprove ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReviewerAction('ENDORSE_FOR_APPROVAL')}
                          className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <ShieldCheck size={14} />
                          Marketing ตรวจผ่าน • เสนอ ผจก.การตลาดอนุมัติ
                        </button>
                      ) : (
                        /* Official Approve Button (Only Marketing Manager / System Admin) */
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleApproverAction}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <CheckCircle2 size={15} />
                          อนุมัติให้เผยแพร่ (Final Approve)
                        </button>
                      )}
                    </div>

                    {permissions.canApprove &&
                      item.reviewSubStatus !== 'ENDORSED_FOR_MARKETING_MANAGER' &&
                      (item.status === 'APPROVE_1' || item.status === 'PENDING_REVIEW') && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReviewerAction('ENDORSE_FOR_APPROVAL')}
                          className="w-full py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-[11px] transition-colors"
                        >
                          หรือบันทึกสถานะเป็น &ldquo;Marketing ตรวจเนื้อหาผ่านแล้ว • รอผู้จัดการการตลาดอนุมัติ&rdquo;
                        </button>
                      )}
                  </div>
                )}
              </div>

              {/* Right 6 Cols: Comment History with Version Number */}
              <div className="lg:col-span-6 flex flex-col h-full space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-red-600" />
                  ประวัติความคิดเห็นและข้อเสนอแนะ ({item.comments.length})
                </h4>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder={`แสดงความคิดเห็นเพิ่มเติมสำหรับ Version ${item.currentVersion}...`}
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !commentInput.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shrink-0 disabled:opacity-50"
                  >
                    ส่งข้อความ
                  </button>
                </form>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {item.comments.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/70">
                      ยังไม่มีความคิดเห็นในรายการนี้
                    </div>
                  ) : (
                    item.comments.map(c => {
                      const isRev = c.commentType === 'REVISION_REQUEST';
                      const isEndorse = c.commentType === 'ENDORSEMENT';
                      const isApp = c.commentType === 'APPROVAL_NOTE';
                      return (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-2xl border space-y-1 ${
                            isRev
                              ? 'bg-orange-50/80 border-orange-200'
                              : isApp
                              ? 'bg-emerald-50/80 border-emerald-200'
                              : isEndorse
                              ? 'bg-purple-50/80 border-purple-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{c.userName}</span>
                              {c.userRole && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {c.userRole}
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                                V{c.version}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed pt-0.5">
                            {c.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PUBLISHING PROOF */}
          {activeTab === 'publish' && (
            <div className="max-w-xl mx-auto space-y-5 py-2">
              {item.status === 'PUBLISHED' && item.publishedUrl && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-indigo-600" />
                      เผยแพร่คอนเทนต์จริงเรียบร้อยแล้ว
                    </span>
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      โพสต์เมื่อ {formatDateOnly(item.actualPublishDate)}
                    </span>
                  </div>
                  <p className="text-indigo-900">
                    ช่องทาง: <strong>{item.actualChannel}</strong> • บันทึกโดย{' '}
                    <strong>{item.publishedByName || '-'}</strong>
                  </p>
                  <div className="pt-1">
                    <a
                      href={item.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors"
                    >
                      เปิดดูโพสต์จริงบนโซเชียลมีเดีย <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleMarkPublished}
                className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    บันทึกหลักฐานการเผยแพร่จริง (Mark as Published)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เมื่อคอนเทนต์ได้รับการอนุมัติ (Approved) และสาขานำไปโพสต์จริงแล้ว กรุณากรอก URL โพสต์จริงเพื่อปิดงาน
                  </p>
                </div>

                {item.status !== 'APPROVED' &&
                  item.status !== 'PUBLISHED' &&
                  !permissions?.canApprove && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                      <span>
                        คอนเทนต์นี้ยังอยู่ในสถานะ <strong>{item.status}</strong> ต้องได้รับการอนุมัติ (Approved) จากผู้จัดการการตลาดก่อนจึงจะบันทึกผลเผยแพร่ได้
                      </span>
                    </div>
                  )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ช่องทางที่เผยแพร่จริง <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={actualChannel}
                    onChange={e => setActualChannel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                  >
                    {TARGET_CHANNELS.map(ch => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    วันที่เผยแพร่จริง <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={actualPublishDate}
                    onChange={e => setActualPublishDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ลิงก์โพสต์จริง (Published URL) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={publishedUrl}
                    onChange={e => setPublishedUrl(e.target.value)}
                    placeholder="https://www.facebook.com/... หรือ https://www.tiktok.com/..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    (item.status !== 'APPROVED' &&
                      item.status !== 'PUBLISHED' &&
                      !permissions?.canApprove)
                  }
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
                >
                  บันทึกผลการเผยแพร่จริง (Mark as Published)
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY & CANCEL */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <History size={16} className="text-red-600" />
                  ประวัติการดำเนินการทั้งหมด (Immutable Audit Trail)
                </h4>

                {item.status !== 'CANCELLED' && item.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCancelContent}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold text-xs transition-colors"
                  >
                    <Ban size={13} /> ยกเลิกคอนเทนต์นี้
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {item.logs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                          V{log.version}
                        </span>
                        <span className="font-extrabold text-slate-900">{log.action}</span>
                        {log.fromStatus && log.toStatus && (
                          <span className="text-[11px] text-slate-500">
                            ({log.fromStatus} → <strong>{log.toStatus}</strong>)
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700">{log.details}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 shrink-0">
                      <div className="font-semibold text-slate-800">{log.userName || '-'}</div>
                      <div>{formatDateTime(log.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

