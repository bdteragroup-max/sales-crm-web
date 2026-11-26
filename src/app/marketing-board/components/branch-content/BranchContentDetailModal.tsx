'use client';

import React, { useRef, useState } from 'react';
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
  Loader2,
  Eye,
  Plus,
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
  revertBranchContentStage,
} from '@/app/actions/branchContent';
import type {
  AssignedMarketingReviewerSummary,
  BranchContentCommentAttachmentItem,
  BranchContentItem,
  BranchContentPermissions,
} from '@/app/lib/branchContentTypes';
import {
  CONTENT_TYPES,
  TARGET_CHANNELS,
  getBranchContentRevertPlan,
} from '@/app/lib/branchContentTypes';
import {
  BRANCH_COMMENT_ATTACHMENT_MAX_COUNT,
  formatAttachmentFileSize,
  getCommentAttachmentKindLabel,
  normalizeAttachmentUploadFiles,
  type StagedCommentAttachmentPayload,
  validateCommentAttachmentClientFile,
} from '@/app/lib/branchContentCommentAttachments';

interface BranchContentDetailModalProps {
  item: BranchContentItem | null;
  onClose: () => void;
  onUpdate: (updated: BranchContentItem) => void;
  onEditClick: (item: BranchContentItem) => void;
  permissions: BranchContentPermissions | null;
  assignedReviewers?: AssignedMarketingReviewerSummary[];
  onOpenReviewerModal?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  BACKLOG: { label: 'Backlog (ไอเดีย)', className: 'bg-slate-100 text-slate-800 border-slate-300' },
  IN_PROGRESS: { label: 'In Progress (กำลังผลิต)', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  PENDING_REVIEW: { label: 'Pending Review (รอ ผจก.สาขาตรวจ)', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  APPROVE_1: { label: 'ส่งต่อการตลาด (รอการตลาดตรวจ)', className: 'bg-purple-100 text-purple-900 border-purple-300' },
  REVISE: { label: 'Revise (ส่งกลับแก้ไข)', className: 'bg-orange-100 text-orange-900 border-orange-300' },
  APPROVED: { label: 'Approved (อนุมัติแล้ว)', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  PUBLISHED: { label: 'Published (เผยแพร่แล้ว)', className: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  CANCELLED: { label: 'Cancelled (ยกเลิก)', className: 'bg-rose-100 text-rose-900 border-rose-300' },
};

type ComposerAttachmentDraft = {
  localId: string;
  file: File;
  fileName: string;
  fileSize: number;
  kindLabel: 'JPG' | 'PNG' | 'PDF' | 'FILE';
  status: 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
  uploaded?: StagedCommentAttachmentPayload;
};

export default function BranchContentDetailModal({
  item,
  onClose,
  onUpdate,
  onEditClick,
  permissions,
  assignedReviewers = [],
  onOpenReviewerModal,
}: BranchContentDetailModalProps) {
  const initialTab: 'overview' | 'review' | 'publish' | 'history' = (() => {
    if (!item) return 'overview';
    if (
      (item.status === 'PENDING_REVIEW' ||
        item.status === 'APPROVE_1' ||
        item.status === 'REVISE') &&
      permissions &&
      (permissions.canReview ||
        permissions.canRequestRevision ||
        permissions.canApprove ||
        permissions.canBranchApprove ||
        permissions.canComment)
    ) {
      return 'review';
    }
    if (item.status === 'APPROVED') return 'publish';
    return 'overview';
  })();

  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'publish' | 'history'>(
    initialTab
  );
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [versionFilter, setVersionFilter] = useState<number | 'ALL'>('ALL');

  // Review & Comment states
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState('');
  const [reviewAttachments, setReviewAttachments] = useState<ComposerAttachmentDraft[]>([]);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<ComposerAttachmentDraft[]>([]);
  const [isDragOverTarget, setIsDragOverTarget] = useState<'comment' | 'review' | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<BranchContentCommentAttachmentItem | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
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

  const canEditContent = Boolean(
    permissions?.isSystemAdmin ||
    permissions?.canApprove ||
    permissions?.canReview ||
    permissions?.canBranchApprove ||
    (!permissions?.isMarketingTeam &&
      !permissions?.canViewAllBranches &&
      item.status !== 'PENDING_REVIEW' &&
      item.status !== 'PUBLISHED' &&
      item.status !== 'CANCELLED')
  );

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

  const updateDraftAttachments = (
    target: 'comment' | 'review',
    updater: (prev: ComposerAttachmentDraft[]) => ComposerAttachmentDraft[]
  ) => {
    if (target === 'comment') {
      setCommentAttachments(updater);
    } else {
      setReviewAttachments(updater);
    }
  };

  const uploadSingleDraftFile = async (
    target: 'comment' | 'review',
    localId: string,
    file: File
  ) => {
    updateDraftAttachments(target, prev =>
      prev.map(att =>
        att.localId === localId
          ? { ...att, status: 'uploading', errorMessage: undefined }
          : att
      )
    );

    try {
      const formData = new FormData();
      formData.append('contentId', item.id);
      formData.append('file', file);

      const res = await fetch('/api/marketing/branch-content/comments/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.success || !json?.attachment) {
        throw new Error(json?.error || `อัปโหลด "${file.name}" ไม่สำเร็จ (HTTP ${res.status})`);
      }

      updateDraftAttachments(target, prev =>
        prev.map(att =>
          att.localId === localId
            ? { ...att, status: 'uploaded', uploaded: json.attachment }
            : att
        )
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : `อัปโหลด "${file.name}" ไม่สำเร็จ`;
      updateDraftAttachments(target, prev =>
        prev.map(att =>
          att.localId === localId
            ? { ...att, status: 'error', errorMessage: msg }
            : att
        )
      );
    }
  };

  const enqueueFilesForTarget = (target: 'comment' | 'review', rawFiles: File[]) => {
    if (rawFiles.length === 0) return;

    const currentList = target === 'comment' ? commentAttachments : reviewAttachments;
    const normalizedFiles = normalizeAttachmentUploadFiles(rawFiles);
    const remainingSlots = BRANCH_COMMENT_ATTACHMENT_MAX_COUNT - currentList.length;

    if (remainingSlots <= 0) {
      Swal.fire({
        icon: 'warning',
        title: `แนบได้สูงสุด ${BRANCH_COMMENT_ATTACHMENT_MAX_COUNT} ไฟล์ต่อ 1 รายการ`,
        text: 'กรุณาลบไฟล์เดิมออกก่อนจึงจะเพิ่มไฟล์ใหม่ได้',
      });
      return;
    }

    const filesToProcess = normalizedFiles.slice(0, remainingSlots);
    if (normalizedFiles.length > remainingSlots) {
      Swal.fire({
        icon: 'info',
        title: `เลือกได้สูงสุด ${BRANCH_COMMENT_ATTACHMENT_MAX_COUNT} ไฟล์ต่อ 1 รายการ`,
        text: `ระบบรับเฉพาะ ${remainingSlots} ไฟล์แรกที่เหลือในโควต้านี้`,
        timer: 2200,
        showConfirmButton: false,
      });
    }

    const validPairs: { draft: ComposerAttachmentDraft; file: File }[] = [];
    const invalidErrors: string[] = [];

    for (const file of filesToProcess) {
      const validationError = validateCommentAttachmentClientFile(file);
      if (validationError) {
        invalidErrors.push(validationError);
        continue;
      }
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      validPairs.push({
        file,
        draft: {
          localId,
          file,
          fileName: file.name,
          fileSize: file.size,
          kindLabel: getCommentAttachmentKindLabel(file.name, file.type),
          status: 'uploading',
        },
      });
    }

    if (invalidErrors.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'บางไฟล์ไม่สามารถแนบได้',
        text: invalidErrors.join(' | '),
      });
    }

    if (validPairs.length > 0) {
      updateDraftAttachments(target, prev => [...prev, ...validPairs.map(p => p.draft)]);
      for (const pair of validPairs) {
        void uploadSingleDraftFile(target, pair.draft.localId, pair.file);
      }
    }
  };

  const handleFileInputSelect = (
    target: 'comment' | 'review',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    enqueueFilesForTarget(target, selectedFiles);
  };

  const handlePasteFilesToTarget = (
    target: 'comment' | 'review',
    e: React.ClipboardEvent
  ) => {
    const items = Array.from(e.clipboardData?.items || []);
    const pastedFiles: File[] = [];
    for (const entry of items) {
      if (entry.kind === 'file') {
        const f = entry.getAsFile();
        if (f) pastedFiles.push(f);
      }
    }
    if (pastedFiles.length === 0 && e.clipboardData?.files?.length) {
      pastedFiles.push(...Array.from(e.clipboardData.files));
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      enqueueFilesForTarget(target, pastedFiles);
    }
  };

  const handleDropFilesToTarget = (
    target: 'comment' | 'review',
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverTarget(null);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length > 0) {
      enqueueFilesForTarget(target, droppedFiles);
    }
  };

  const handleRemoveDraftAttachment = (target: 'comment' | 'review', localId: string) => {
    updateDraftAttachments(target, prev => prev.filter(att => att.localId !== localId));
  };

  const collectReadyAttachmentPayloads = (
    list: ComposerAttachmentDraft[]
  ): StagedCommentAttachmentPayload[] | null => {
    if (list.some(a => a.status === 'uploading')) {
      Swal.fire({
        icon: 'info',
        title: 'กำลังอัปโหลดไฟล์แนบ',
        text: 'กรุณารอให้ไฟล์ที่เลือกอัปโหลดเสร็จสมบูรณ์ก่อนส่งข้อมูล',
      });
      return null;
    }

    if (list.some(a => a.status === 'error')) {
      Swal.fire({
        icon: 'error',
        title: 'มีไฟล์แนบที่อัปโหลดไม่สำเร็จ',
        text: 'กรุณากดลองใหม่หรือลบไฟล์ที่อัปโหลดไม่สำเร็จออกก่อนส่ง',
      });
      return null;
    }

    return list
      .map(a => a.uploaded)
      .filter((u): u is StagedCommentAttachmentPayload => Boolean(u));
  };

  const renderStagedAttachmentChips = (
    target: 'comment' | 'review',
    list: ComposerAttachmentDraft[]
  ) => {
    if (list.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {list.map(att => (
          <div
            key={att.localId}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold max-w-full ${att.status === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
          >
            {att.status === 'uploading' && (
              <Loader2 size={12} className="animate-spin text-red-600 shrink-0" />
            )}
            <span className="font-mono font-bold text-[10px] text-slate-500 shrink-0">
              {att.kindLabel}
            </span>
            <span className="truncate max-w-[165px]" title={att.fileName}>
              {att.fileName}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">
              ({formatAttachmentFileSize(att.fileSize)})
            </span>
            {att.status === 'error' && (
              <button
                type="button"
                onClick={() => void uploadSingleDraftFile(target, att.localId, att.file)}
                className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 shrink-0"
                title={att.errorMessage}
              >
                ลองใหม่
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRemoveDraftAttachment(target, att.localId)}
              className="text-slate-400 hover:text-red-600 font-bold pl-0.5 shrink-0"
              aria-label={`ลบไฟล์ ${att.fileName}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
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

    const uploadedPayloads = collectReadyAttachmentPayloads(reviewAttachments);
    if (!uploadedPayloads) return;

    setIsProcessing(true);
    try {
      const res = await branchReviewContent(
        item.id,
        action,
        reviewFeedbackInput,
        uploadedPayloads
      );
      if (res.success && res.data) {
        onUpdate(res.data);
        setReviewFeedbackInput('');
        setReviewAttachments([]);
        Swal.fire({
          icon: 'success',
          title:
            action === 'REQUEST_REVISION'
              ? 'ส่งกลับให้พนักงานสาขาแก้ไขแล้ว'
              : 'ผจก.สาขาตรวจผ่าน • ส่งต่อการตลาดเรียบร้อยแล้ว',
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

    const uploadedPayloads = collectReadyAttachmentPayloads(reviewAttachments);
    if (!uploadedPayloads) return;

    setIsProcessing(true);
    try {
      const res = await reviewBranchContent(
        item.id,
        action,
        reviewFeedbackInput,
        uploadedPayloads
      );
      if (res.success && res.data) {
        onUpdate(res.data);
        setReviewFeedbackInput('');
        setReviewAttachments([]);
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
    const uploadedPayloads = collectReadyAttachmentPayloads(reviewAttachments);
    if (!uploadedPayloads) return;

    setIsProcessing(true);
    try {
      const res = await approveBranchContent(
        item.id,
        reviewFeedbackInput,
        uploadedPayloads
      );
      if (res.success && res.data) {
        onUpdate(res.data);
        setReviewFeedbackInput('');
        setReviewAttachments([]);
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

  const handleRevertStage = async () => {
    const plan = getBranchContentRevertPlan(item.status, item.reviewSubStatus);
    if (!plan) return;

    const { value: reason, isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการย้อนสถานะงาน?',
      text: plan.label,
      input: 'text',
      inputPlaceholder: 'ระบุหมายเหตุสั้นๆ (ไม่บังคับ) เช่น กดผิดปุ่ม',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันย้อนสถานะ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#4f46e5',
    });

    if (!isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await revertBranchContentStage(item.id, typeof reason === 'string' ? reason : '');
      if (res.success && res.data) {
        onUpdate(res.data);
        Swal.fire({
          icon: 'success',
          title: 'ย้อนสถานะเรียบร้อยแล้ว',
          text: plan.label,
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: 'error', title: 'ไม่สามารถย้อนสถานะได้', text: res.error });
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
    if (!permissions?.canComment) return;

    const uploadedPayloads = collectReadyAttachmentPayloads(commentAttachments);
    if (!uploadedPayloads) return;

    if (!commentInput.trim() && uploadedPayloads.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await addBranchContentComment(item.id, commentInput, uploadedPayloads);
      if (res.success && res.data) {
        onUpdate(res.data);
        setCommentInput('');
        setCommentAttachments([]);
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

  const showBranchSubmit =
    item.status === 'BACKLOG' || item.status === 'IN_PROGRESS' || item.status === 'REVISE';
  const showBranchMgrReview = Boolean(
    permissions?.canBranchApprove &&
    (item.status === 'PENDING_REVIEW' ||
      item.status === 'IN_PROGRESS' ||
      item.status === 'BACKLOG')
  );
  const showHqReview = Boolean(
    permissions?.canReview || permissions?.canRequestRevision || permissions?.canApprove
  );
  const hasActiveReviewForm = showBranchSubmit || showBranchMgrReview || showHqReview;

  const step1Done = ['PENDING_REVIEW', 'APPROVE_1', 'APPROVED', 'PUBLISHED'].includes(item.status);
  const step2Done = ['APPROVE_1', 'APPROVED', 'PUBLISHED'].includes(item.status);
  const step3Done = ['APPROVED', 'PUBLISHED'].includes(item.status);

  const workflowStageMessage =
    item.status === 'PENDING_REVIEW'
      ? 'กำลังรอผู้จัดการสาขาตรวจสอบเนื้อหาและสื่อก่อนส่งต่อฝ่ายการตลาด'
      : item.status === 'APPROVE_1'
        ? 'ผู้จัดการสาขาตรวจผ่านแล้ว • กำลังรอฝ่ายการตลาดสำนักงานใหญ่ตรวจอนุมัติ'
        : item.status === 'APPROVED'
          ? 'อนุมัติเรียบร้อยแล้ว • สามารถนำลิงก์โพสต์จริงมาบันทึกได้ที่แท็บ 3'
          : item.status === 'PUBLISHED'
            ? 'เผยแพร่คอนเทนต์จริงบนโซเชียลมีเดียและปิดงานเรียบร้อยแล้ว'
            : item.status === 'CANCELLED'
              ? 'รายการคอนเทนต์นี้ถูกยกเลิกแล้ว'
              : 'กำลังอยู่ในขั้นตอนเตรียมเนื้อหาและสื่อเพื่อส่งตรวจสอบ';

  const revertPlan = permissions?.canManageReviewers
    ? getBranchContentRevertPlan(item.status, item.reviewSubStatus)
    : null;

  const isReviewAttachmentUploading = reviewAttachments.some(a => a.status === 'uploading');

  const renderReviewAttachmentToolbar = (tone: 'amber' | 'indigo') => {
    const borderClass =
      tone === 'amber'
        ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900'
        : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-800';
    return (
      <div className="space-y-1.5">
        {renderStagedAttachmentChips('review', reviewAttachments)}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => reviewFileInputRef.current?.click()}
            disabled={
              isProcessing ||
              reviewAttachments.length >= BRANCH_COMMENT_ATTACHMENT_MAX_COUNT
            }
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-bold disabled:opacity-50 transition-colors ${borderClass}`}
          >
            <Paperclip size={12} />
            <span>
              + แนบไฟล์ประกอบ
              {reviewAttachments.length > 0
                ? ` (${reviewAttachments.length}/${BRANCH_COMMENT_ATTACHMENT_MAX_COUNT})`
                : ''}
            </span>
          </button>
          <span className="text-[10px] text-slate-400">
            JPG, PNG, PDF • วางรูป Ctrl+V / ลากวางในช่องข้อความได้
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[93vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 sticky top-0 z-10">
          <div className="space-y-1.5 min-w-0 flex-1">
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
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                Version {item.currentVersion}
              </span>
              {item.revisionCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-[11px] font-bold">
                  แก้ไขแล้ว {item.revisionCount} รอบ
                </span>
              )}
              {item.isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-bold animate-pulse">
                  <AlertTriangle size={12} /> เกินกำหนดเวลา
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug truncate">
              {item.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEditContent && (
              <button
                type="button"
                onClick={() => onEditClick(item)}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-bold transition-all"
              >
                <Edit3 size={14} /> แก้ไขเนื้อหา/ไฟล์
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs — Symmetrical 4-Column Equal Grid (lg:gap-5 aligns with 2-col body split) */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`h-10 px-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === 'overview'
                ? 'border-red-300 bg-white text-red-600 shadow-xs ring-2 ring-red-500/10'
                : 'border-slate-200/90 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white hover:border-slate-300'
              }`}
          >
            <Paperclip size={14} className="shrink-0" />
            <span className="truncate">1. เนื้อหาและสื่อพรีวิว ({item.media.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`h-10 px-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === 'review'
                ? 'border-red-300 bg-white text-red-600 shadow-xs ring-2 ring-red-500/10'
                : 'border-slate-200/90 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white hover:border-slate-300'
              }`}
          >
            <MessageSquare size={14} className="shrink-0" />
            <span className="truncate">2. ตรวจ • คอมเมนต์ • อนุมัติ ({item.comments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('publish')}
            className={`h-10 px-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === 'publish'
                ? 'border-red-300 bg-white text-red-600 shadow-xs ring-2 ring-red-500/10'
                : 'border-slate-200/90 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white hover:border-slate-300'
              }`}
          >
            <Globe size={14} className="shrink-0" />
            <span className="truncate">3. บันทึกผลเผยแพร่จริง</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`h-10 px-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === 'history'
                ? 'border-red-300 bg-white text-red-600 shadow-xs ring-2 ring-red-500/10'
                : 'border-slate-200/90 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white hover:border-slate-300'
              }`}
          >
            <History size={14} className="shrink-0" />
            <span className="truncate">4. ประวัติ Audit Log ({item.logs.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* TAB 1: OVERVIEW & MEDIA PREVIEW — True Symmetrical Equal-Height Columns */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left 6 Cols: Unified Media Preview Card */}
              <div className="lg:col-span-6 h-full flex flex-col bg-slate-50/80 rounded-2xl p-4 border border-slate-200 gap-3">
                {/* Symmetrical Card Header (h-8 matches Right Caption Header) */}
                <div className="min-h-[32px] flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Video size={16} className="text-red-600 shrink-0" />
                    <span>พรีวิวภาพ / วิดีโอ ({filteredMedia.length} ไฟล์)</span>
                  </span>

                  {item.currentVersion > 1 ? (
                    <select
                      value={versionFilter}
                      onChange={e => {
                        setVersionFilter(
                          e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                        );
                        setSelectedMediaIdx(0);
                      }}
                      className="h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    >
                      <option value="ALL">ทุกเวอร์ชัน</option>
                      {Array.from({ length: item.currentVersion }, (_, i) => i + 1).map(v => (
                        <option key={v} value={v}>
                          เฉพาะ Version {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center px-2.5 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-[11px]">
                      สื่อต้นฉบับ V{item.currentVersion}
                    </span>
                  )}
                </div>

                {activeMedia ? (
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Media Stage — Stretches to keep Left & Right columns 100% flush */}
                    <div
                      className={`flex-1 rounded-xl overflow-hidden border border-slate-200/90 flex items-center justify-center min-h-[280px] ${activeMedia.fileType === 'VIDEO' ||
                          activeMedia.mimeType?.startsWith('video/')
                          ? 'bg-slate-950'
                          : 'bg-white p-3'
                        }`}
                    >
                      {activeMedia.fileType === 'VIDEO' ||
                        activeMedia.mimeType?.startsWith('video/') ? (
                        <video
                          key={activeMedia.fileUrl}
                          src={activeMedia.fileUrl}
                          controls
                          className="max-h-[380px] w-full object-contain"
                        />
                      ) : activeMedia.fileType === 'IMAGE' ? (
                        <img
                          src={activeMedia.fileUrl}
                          alt={activeMedia.fileName}
                          className="max-h-[380px] w-full object-contain"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-700 space-y-2">
                          <FileText size={40} className="mx-auto text-slate-400" />
                          <p className="font-semibold">{activeMedia.fileName}</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnails Selector */}
                    {filteredMedia.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-0.5">
                        {filteredMedia.map((m, idx) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMediaIdx(idx)}
                            className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${idx === selectedMediaIdx
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

                    {/* Bottom File Info & Download Bar (min-h-[56px] matches Right Target Channel Card) */}
                    <div className="min-h-[56px] flex items-center justify-between gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {activeMedia.fileName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          Version {activeMedia.version} • อัปโหลดโดย {activeMedia.uploadedByName || '-'}
                        </p>
                      </div>
                      <a
                        href={activeMedia.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={activeMedia.fileName}
                        className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition-colors"
                      >
                        <Download size={13} /> ดาวน์โหลดไฟล์ต้นฉบับ
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[320px] rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <ImageIcon size={36} className="mb-2 stroke-1" />
                    <p className="font-bold text-slate-600">ยังไม่มีไฟล์ภาพหรือวิดีโอแนบ</p>
                    <p className="text-[11px] mt-0.5">
                      สามารถกดปุ่ม &ldquo;แก้ไขเนื้อหา/ไฟล์&rdquo; ด้านบนเพื่ออัปโหลดสื่อได้
                    </p>
                  </div>
                )}
              </div>

              {/* Right 6 Cols: Symmetrical Stack (Caption + 2x4 Metadata + Target Channels) */}
              <div className="lg:col-span-6 h-full flex flex-col gap-3.5">
                {/* Latest Review Alert Box */}
                {item.reviewFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl border space-y-1 ${item.status === 'REVISE'
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

                {/* 1. Caption Card (Flex-1 stretches so Right Column matches Left Column height) */}
                <div className="flex-1 flex flex-col bg-slate-50/80 rounded-2xl p-4 border border-slate-200 gap-3">
                  <div className="min-h-[32px] flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <FileText size={16} className="text-red-600 shrink-0" />
                      <span>ข้อความโพสต์ / Caption</span>
                    </span>
                    {item.caption && (
                      <button
                        type="button"
                        onClick={handleCopyCaption}
                        className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] shadow-2xs transition-colors"
                      >
                        <Copy size={12} /> คัดลอก Caption
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-h-[84px] bg-white p-3.5 rounded-xl border border-slate-200/90 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto text-slate-800">
                    {item.caption || 'ยังไม่ได้ระบุข้อความ Caption'}
                  </div>
                </div>

                {/* 2. Symmetrical 2x4 Metadata Grid Card */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        ประเภทคอนเทนต์
                      </span>
                      <span className="font-bold text-slate-900 block mt-0.5 truncate">
                        {contentTypeLabel}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        กลุ่มสินค้า
                      </span>
                      <span className="font-bold text-red-700 block mt-0.5 truncate">
                        {item.productGroup}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        วัตถุประสงค์
                      </span>
                      <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                        {item.objective || '-'}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        สัดส่วนสื่อ (Format)
                      </span>
                      <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                        {item.mediaFormat || '-'}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        ผู้สร้าง / ผู้รับผิดชอบ
                      </span>
                      <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                        {item.assigneeName || item.createdByName}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Call to Action (CTA)
                      </span>
                      <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                        {item.callToAction || '-'}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        กำหนดส่งตรวจ
                      </span>
                      <span className="font-bold text-slate-800 block mt-0.5">
                        {formatDateOnly(item.submissionDueDate)}
                      </span>
                    </div>
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        วันที่วางแผนเผยแพร่
                      </span>
                      <span className="font-bold text-blue-700 block mt-0.5">
                        {formatDateOnly(item.plannedPublishDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Channels & Reference Card (Matches Left File Download Bar) */}
                <div className="min-h-[56px] bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-200 flex flex-col justify-center gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600 font-bold shrink-0">
                      ช่องทางเป้าหมาย:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.targetChannels.length > 0 ? (
                        item.targetChannels.map((ch, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]"
                          >
                            {ch}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </div>

                  {item.referenceUrl && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                      <span className="text-slate-500 font-semibold shrink-0">
                        ลิงก์อ้างอิง / ไฟล์สำรอง:
                      </span>
                      <a
                        href={item.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1 truncate max-w-xs"
                      >
                        <span className="truncate">{item.referenceUrl}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    </div>
                  )}

                  {item.description && (
                    <div className="pt-2 border-t border-slate-200/80">
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

          {/* TAB 2: REVIEW, FEEDBACK & APPROVAL WORKSPACE — Symmetrical Equal-Height Columns */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              {/* Compact Media & Caption Quick-Look Strip (Aligned flush with 2-col cards below) */}
              {(item.media.length > 0 || item.caption) && (
                <div className="min-h-[52px] bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.media.length > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.media.slice(0, 3).map((m, idx) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMediaIdx(idx);
                              setActiveTab('overview');
                            }}
                            title={`เปิดดูสื่อ: ${m.fileName}`}
                            className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 text-white flex items-center justify-center hover:ring-2 hover:ring-red-400 transition-all shrink-0"
                          >
                            {m.fileType === 'VIDEO' || m.mimeType?.startsWith('video/') ? (
                              <Video size={14} />
                            ) : (
                              <img
                                src={m.thumbnailUrl || m.fileUrl}
                                alt={m.fileName}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </button>
                        ))}
                        {item.media.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className="px-1.5 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700"
                          >
                            +{item.media.length - 3}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <span>สื่อ V{item.currentVersion} ({item.media.length} ไฟล์)</span>
                        {item.caption && (
                          <span className="text-slate-400 font-normal hidden sm:inline">•</span>
                        )}
                      </div>
                      {item.caption && (
                        <p className="text-[11px] text-slate-500 truncate">{item.caption}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.caption && (
                      <button
                        type="button"
                        onClick={handleCopyCaption}
                        className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                      >
                        <Copy size={11} /> คัดลอก Caption
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors"
                    >
                      <Eye size={11} /> ดูสื่อ/รายละเอียด
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left 6 Cols: Unified Status & Workflow Action Card */}
                <div className="lg:col-span-6 h-full flex flex-col bg-slate-50/80 rounded-2xl p-4 border border-slate-200 gap-3">
                  {/* Shared hidden input for Step 2 / Step 3 review attachments */}
                  {(showBranchMgrReview || showHqReview) && (
                    <input
                      ref={reviewFileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={e => handleFileInputSelect('review', e)}
                      className="hidden"
                    />
                  )}

                  {/* Header Row (min-h-[28px] matches Right Comment Header) */}
                  <div className="min-h-[28px] flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-red-600 shrink-0" />
                      <span>สถานะการตรวจและอนุมัติปัจจุบัน</span>
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {revertPlan && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleRevertStage}
                          title={revertPlan.label}
                          className="inline-flex items-center gap-1 px-2.5 h-6 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={11} />
                          <span>ย้อนสถานะ</span>
                        </button>
                      )}
                      <span className="inline-flex items-center px-2.5 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-[11px] shrink-0">
                        Version {item.currentVersion}
                      </span>
                    </div>
                  </div>

                  {/* Row 1: Symmetrical 2-Column Reviewer & Approver Summary (min-h-[60px] matches Right Composer Bar) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-h-[60px] bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium truncate">
                          ผู้ตรวจเนื้อหา (Marketing)
                        </span>
                        {item.reviewedAt && (
                          <span
                            className="text-[10px] text-slate-400 shrink-0"
                            title={formatDateTime(item.reviewedAt)}
                          >
                            {formatDateOnly(item.reviewedAt)}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 mt-0.5 truncate">
                        {item.reviewerName || 'รอการตรวจสอบ'}
                      </p>
                    </div>

                    <div className="min-h-[60px] bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium truncate">
                          ผู้อนุมัติ (ผจก.การตลาด)
                        </span>
                        {item.approvedAt && (
                          <span
                            className="text-[10px] text-slate-400 shrink-0"
                            title={formatDateTime(item.approvedAt)}
                          >
                            {formatDateOnly(item.approvedAt)}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-emerald-700 mt-0.5 truncate">
                        {item.approvedByName || 'รออนุมัติ'}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Flex-Fill Workflow Stage / Action Panel (Stretches flush with Right Comments Panel) */}
                  <div className="flex-1 flex flex-col gap-3">
                    {!hasActiveReviewForm && (
                      <div className="flex-1 min-h-[92px] bg-white p-3.5 rounded-xl border border-slate-200/90 flex flex-col justify-between gap-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          <div
                            className={`h-8 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 truncate ${step1Done
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-amber-50 border-amber-300 text-amber-900'
                              }`}
                          >
                            <CheckCircle2 size={12} className="shrink-0" />
                            <span className="truncate">1. สาขาส่งตรวจ</span>
                          </div>

                          <div
                            className={`h-8 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 truncate ${step2Done
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : item.status === 'PENDING_REVIEW'
                                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                          >
                            <Building2 size={12} className="shrink-0" />
                            <span className="truncate">2. ผจก.สาขาตรวจ</span>
                          </div>

                          <div
                            className={`h-8 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 truncate ${step3Done
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : item.status === 'APPROVE_1'
                                  ? 'bg-purple-50 border-purple-300 text-purple-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                          >
                            <Sparkles size={12} className="shrink-0" />
                            <span className="truncate">3. การตลาดอนุมัติ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span>{workflowStageMessage}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Step 1: Branch Staff Submission Box */}
                    {showBranchSubmit && (
                      <div className="flex-1 p-3.5 rounded-xl bg-white border border-red-200 flex flex-col justify-between gap-2.5">
                        <h4 className="font-extrabold text-red-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <Send size={15} className="text-red-600 shrink-0" />
                          <span>ขั้นตอนที่ 1: ส่งงานให้ผู้จัดการสาขาตรวจก่อน (Submit for Branch Review)</span>
                        </h4>
                        <textarea
                          rows={2}
                          value={submissionNoteInput}
                          onChange={e => setSubmissionNoteInput(e.target.value)}
                          placeholder="ระบุหมายเหตุถึงผู้จัดการสาขา / ทีมการตลาด (เช่น แก้ไขแคปชั่นและเปลี่ยนภาพหน้าปกเรียบร้อยแล้วครับ)..."
                          className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleSubmitForReview}
                          className="w-full h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <Send size={14} />
                          {item.status === 'REVISE'
                            ? `ส่งให้ ผจก.สาขาตรวจรอบใหม่ (เป็น Version ${item.currentVersion + 1})`
                            : `ยืนยันส่งให้ ผจก.สาขาตรวจ (Version ${item.currentVersion})`}
                        </button>
                      </div>
                    )}

                    {/* Step 2: Branch Manager Review Workspace (Pending Review -> Forward to Marketing) */}
                    {showBranchMgrReview && (
                      <div
                        onDragOver={e => {
                          e.preventDefault();
                          setIsDragOverTarget('review');
                        }}
                        onDragLeave={() => setIsDragOverTarget(prev => (prev === 'review' ? null : prev))}
                        onDrop={e => handleDropFilesToTarget('review', e)}
                        className={`flex-1 p-3.5 rounded-xl bg-white border flex flex-col justify-between gap-2.5 transition-all ${isDragOverTarget === 'review'
                            ? 'border-amber-500 ring-2 ring-amber-200'
                            : 'border-amber-200'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                              <Building2 size={15} className="text-amber-700 shrink-0" />
                              <span>ขั้นตอนที่ 2: สำหรับผู้จัดการสาขาตรวจ (ส่งต่อการตลาด)</span>
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                              ผจก.สาขาตรวจก่อนส่งการตลาด
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800">
                            เมื่อผู้จัดการสาขาตรวจสอบเนื้อหาและสื่อแล้ว หากไม่มีแก้ไขเพิ่มเติม กดปุ่ม{' '}
                            <strong>&ldquo;ส่งต่อการตลาด&rdquo;</strong>{' '}
                            เพื่อส่งให้ฝ่ายการตลาดสำนักงานใหญ่ตรวจสอบต่อ
                          </p>
                        </div>

                        <textarea
                          rows={2}
                          value={reviewFeedbackInput}
                          onChange={e => setReviewFeedbackInput(e.target.value)}
                          onPaste={e => handlePasteFilesToTarget('review', e)}
                          placeholder="ความเห็นจากผู้จัดการสาขา (ระบุสิ่งที่ต้องแก้หากส่งกลับ หรือวางรูปด้วย Ctrl+V)..."
                          className="w-full px-3 py-2 bg-slate-50/70 border border-amber-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />

                        {renderReviewAttachmentToolbar('amber')}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={isProcessing || isReviewAttachmentUploading}
                            onClick={() => handleBranchManagerAction('REQUEST_REVISION')}
                            className="h-10 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                          >
                            <RotateCcw size={14} />
                            ส่งกลับให้สาขาแก้ไข (Revise)
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing || isReviewAttachmentUploading}
                            onClick={() => handleBranchManagerAction('APPROVE_TO_MARKETING')}
                            className="h-10 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            ส่งต่อการตลาด
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: HQ Marketing Reviewer & Marketing Manager Workspace */}
                    {showHqReview && permissions && (
                      <div
                        onDragOver={e => {
                          e.preventDefault();
                          setIsDragOverTarget('review');
                        }}
                        onDragLeave={() => setIsDragOverTarget(prev => (prev === 'review' ? null : prev))}
                        onDrop={e => handleDropFilesToTarget('review', e)}
                        className={`flex-1 p-3.5 rounded-xl bg-white border flex flex-col justify-between gap-2.5 transition-all ${isDragOverTarget === 'review'
                            ? 'border-indigo-500 ring-2 ring-indigo-200'
                            : 'border-indigo-200'
                          }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <h4 className="font-extrabold text-indigo-950 text-xs sm:text-sm flex items-center gap-1.5">
                            <Sparkles size={15} className="text-indigo-600 shrink-0" />
                            <span>ขั้นตอนที่ 3: สำหรับฝ่ายการตลาดตรวจสอบและอนุมัติ</span>
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            สิทธิ์ของคุณ: {permissions.roleLabel}
                          </span>
                        </div>

                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                              <User size={12} className="text-indigo-600 shrink-0" />
                              <span>
                                ผู้ได้รับมอบหมายจากทีม Marketing
                                {assignedReviewers.length > 0 ? ` (${assignedReviewers.length} คน)` : ''}
                              </span>
                            </span>
                            {permissions.canManageReviewers && onOpenReviewerModal && (
                              <button
                                type="button"
                                onClick={onOpenReviewerModal}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <ShieldCheck size={12} />
                                <span>จัดการผู้ตรวจสอบ</span>
                              </button>
                            )}
                          </div>
                          {assignedReviewers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {assignedReviewers.map((rev) => {
                                const rights: string[] = [];
                                if (rev.canReviewComment) rights.push('ตรวจ/คอมเมนต์');
                                if (rev.canRequestRevision) rights.push('ส่งแก้ไข');
                                if (rev.canApprove) rights.push('Approve');
                                return (
                                  <span
                                    key={rev.userId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-[10px] font-semibold text-indigo-900"
                                    title={`${rev.employeeId} · ${rev.role}`}
                                  >
                                    <span className="font-bold">{rev.fullName}</span>
                                    {rights.length > 0 && (
                                      <span className="text-indigo-600">({rights.join(', ')})</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200 rounded px-2 py-1 font-medium">
                              ยังไม่ได้มอบหมายให้ role Marketing คนใด (สิทธิ์เริ่มต้น: ดูอย่างเดียว)
                            </p>
                          )}
                        </div>

                        <textarea
                          rows={3}
                          value={reviewFeedbackInput}
                          onChange={e => setReviewFeedbackInput(e.target.value)}
                          onPaste={e => handlePasteFilesToTarget('review', e)}
                          placeholder="พิมพ์ Feedback จุดที่ต้องให้สาขาแก้ไข หรือวางรูป/แคปหน้าจอด้วย Ctrl+V..."
                          className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-indigo-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        {renderReviewAttachmentToolbar('indigo')}

                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Request Revision Button (Requires explicit Request Revision permission) */}
                            {permissions.canRequestRevision && (
                              <button
                                type="button"
                                disabled={isProcessing || isReviewAttachmentUploading}
                                onClick={() => handleReviewerAction('REQUEST_REVISION')}
                                className="h-10 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                              >
                                <RotateCcw size={14} />
                                ส่งกลับให้สาขาแก้ไข (Revise)
                              </button>
                            )}

                            {/* Endorse for Manager Approval (For assigned Marketing Reviewer without Approve) */}
                            {permissions.canReview && !permissions.canApprove && (
                              <button
                                type="button"
                                disabled={isProcessing || isReviewAttachmentUploading}
                                onClick={() => handleReviewerAction('ENDORSE_FOR_APPROVAL')}
                                className="h-10 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                              >
                                <ShieldCheck size={14} />
                                Marketing ตรวจผ่าน • เสนออนุมัติ
                              </button>
                            )}

                            {/* Official Approve Button (Marketing Manager / Superadmin / Explicitly assigned Approver) */}
                            {permissions.canApprove && (
                              <button
                                type="button"
                                disabled={isProcessing || isReviewAttachmentUploading}
                                onClick={handleApproverAction}
                                className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 size={15} />
                                อนุมัติให้เผยแพร่ (Final Approve)
                              </button>
                            )}
                          </div>

                          {permissions.canApprove &&
                            permissions.canReview &&
                            item.reviewSubStatus !== 'ENDORSED_FOR_MARKETING_MANAGER' &&
                            (item.status === 'APPROVE_1' || item.status === 'PENDING_REVIEW') && (
                              <button
                                type="button"
                                disabled={isProcessing || isReviewAttachmentUploading}
                                onClick={() => handleReviewerAction('ENDORSE_FOR_APPROVAL')}
                                className="w-full py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-[11px] transition-colors disabled:opacity-50"
                              >
                                หรือบันทึกสถานะเป็น &ldquo;Marketing ตรวจเนื้อหาผ่านแล้ว • รอผู้จัดการการตลาดอนุมัติ&rdquo;
                              </button>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 6 Cols: Comment History Card (100% Symmetrical Frame & Flush Edges) */}
                <div className="lg:col-span-6 h-full flex flex-col bg-slate-50/80 rounded-2xl p-4 border border-slate-200 gap-3">
                  {/* Header Row (min-h-[28px] matches Left Status Header) */}
                  <div className="min-h-[28px] flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-red-600 shrink-0" />
                      <span>ประวัติความคิดเห็นและข้อเสนอแนะ</span>
                    </h4>
                    <span className="inline-flex items-center px-2.5 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-[11px] shrink-0">
                      {item.comments.length} รายการ
                    </span>
                  </div>

                  {/* Row 1: Unified Comment Composer Bar with CR-01B Attachments + Ctrl+V & Drop */}
                  {permissions?.canComment ? (
                    <form
                      onSubmit={handleAddComment}
                      onDragOver={e => {
                        e.preventDefault();
                        setIsDragOverTarget('comment');
                      }}
                      onDragLeave={() => setIsDragOverTarget(prev => (prev === 'comment' ? null : prev))}
                      onDrop={e => handleDropFilesToTarget('comment', e)}
                      className={`bg-white p-2.5 rounded-xl border space-y-2 transition-all ${isDragOverTarget === 'comment'
                          ? 'border-red-400 ring-2 ring-red-200'
                          : 'border-slate-200/90'
                        }`}
                    >
                      <input
                        ref={commentFileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        onChange={e => handleFileInputSelect('comment', e)}
                        className="hidden"
                      />

                      <input
                        type="text"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        onPaste={e => handlePasteFilesToTarget('comment', e)}
                        placeholder={`แสดงความคิดเห็น Version ${item.currentVersion}... (หรือวางรูปด้วย Ctrl+V)`}
                        className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />

                      {renderStagedAttachmentChips('comment', commentAttachments)}

                      <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => commentFileInputRef.current?.click()}
                            disabled={
                              isProcessing ||
                              commentAttachments.length >= BRANCH_COMMENT_ATTACHMENT_MAX_COUNT
                            }
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold disabled:opacity-50 transition-colors"
                          >
                            <Paperclip size={13} />
                            <span>
                              <Plus size={11} className="inline -mt-0.5" /> แนบไฟล์
                            </span>
                            {commentAttachments.length > 0 && (
                              <span className="text-[10px] text-slate-500">
                                ({commentAttachments.length}/{BRANCH_COMMENT_ATTACHMENT_MAX_COUNT})
                              </span>
                            )}
                          </button>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            JPG, PNG, PDF • สูงสุด 4 MB • Ctrl+V / ลากวางได้
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            isProcessing ||
                            commentAttachments.some(a => a.status === 'uploading') ||
                            (!commentInput.trim() &&
                              commentAttachments.filter(a => a.status === 'uploaded').length === 0)
                          }
                          className="h-9 px-4 rounded-lg bg-[#ff2301] hover:bg-red-600 text-white font-bold text-xs shrink-0 disabled:opacity-50 transition-colors"
                        >
                          ส่งความคิดเห็น
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="min-h-[52px] bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 flex items-center text-[11px] font-semibold text-slate-500">
                      บัญชีของคุณอยู่ในสิทธิ์ดูข้อมูลอย่างเดียว (ยังไม่ได้รับมอบหมายสิทธิ์คอมเมนต์และแนบไฟล์)
                    </div>
                  )}

                  {/* Row 2: Flush Comment Feed (No pr-1 offset — aligns pixel-for-pixel with Composer Bar) */}
                  <div className="flex-1 flex flex-col gap-2.5 max-h-[380px] overflow-y-auto">
                    {item.comments.length === 0 ? (
                      <div className="flex-1 min-h-[92px] flex items-center justify-center text-center p-6 text-slate-400 bg-white rounded-xl border border-slate-200/90">
                        ยังไม่มีความคิดเห็นในรายการนี้
                      </div>
                    ) : (
                      item.comments.map(c => {
                        const isRev = c.commentType === 'REVISION_REQUEST';
                        const isEndorse = c.commentType === 'ENDORSEMENT';
                        const isApp = c.commentType === 'APPROVAL_NOTE';
                        const attachments = c.attachments || [];
                        return (
                          <div
                            key={c.id}
                            className={`only:flex-1 p-3.5 rounded-xl border space-y-2 ${isRev
                                ? 'bg-orange-50/90 border-orange-200'
                                : isApp
                                  ? 'bg-emerald-50/90 border-emerald-200'
                                  : isEndorse
                                    ? 'bg-purple-50/90 border-purple-200'
                                    : 'bg-white border-slate-200/90'
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

                            {c.message && (
                              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {c.message}
                              </p>
                            )}

                            {attachments.length > 0 && (
                              <div className="pt-1 space-y-1.5">
                                {attachments.map(att => {
                                  const isImage = att.fileType === 'IMAGE';
                                  const kindLabel = getCommentAttachmentKindLabel(
                                    att.fileName,
                                    att.mimeType
                                  );
                                  return (
                                    <div
                                      key={att.id}
                                      className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-2 flex items-center justify-between gap-2.5"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {isImage ? (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewAttachment(att)}
                                            className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 hover:opacity-90 transition-opacity"
                                            title="คลิกเพื่อดูภาพขนาดเต็ม"
                                          >
                                            <img
                                              src={att.fileUrl}
                                              alt={att.fileName}
                                              className="w-full h-full object-cover"
                                            />
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewAttachment(att)}
                                            className="w-11 h-11 rounded-lg border border-red-200 bg-red-50 text-red-700 flex flex-col items-center justify-center shrink-0 hover:bg-red-100 transition-colors"
                                            title="คลิกเพื่อดู Preview PDF"
                                          >
                                            <FileText size={16} />
                                            <span className="text-[9px] font-black leading-none mt-0.5">
                                              PDF
                                            </span>
                                          </button>
                                        )}

                                        <div className="min-w-0">
                                          <div
                                            className="text-xs font-bold text-slate-800 truncate"
                                            title={att.fileName}
                                          >
                                            {att.fileName}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {kindLabel} • {formatAttachmentFileSize(att.fileSize)}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewAttachment(att)}
                                          className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
                                        >
                                          <Eye size={12} /> เปิดดู
                                        </button>
                                        <a
                                          href={`${att.fileUrl}?download=1`}
                                          download={att.fileName}
                                          className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
                                        >
                                          <Download size={12} /> โหลด
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PUBLISHING PROOF — Symmetrical 2-Column Equal-Height Workspace */}
          {activeTab === 'publish' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left 6 Cols: Publishing Readiness & Live Proof Summary */}
              <div className="lg:col-span-6 h-full flex flex-col bg-slate-50/80 rounded-2xl p-4 border border-slate-200 gap-3">
                <div className="min-h-[28px] flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Globe size={16} className="text-red-600 shrink-0" />
                    <span>สถานะความพร้อมและการเผยแพร่จริง</span>
                  </h4>
                  <span className="inline-flex items-center px-2.5 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-[11px] shrink-0">
                    Version {item.currentVersion}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-h-[60px] bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 flex flex-col justify-center">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      วันที่วางแผนเผยแพร่
                    </span>
                    <span className="font-bold text-blue-700 mt-0.5 block">
                      {formatDateOnly(item.plannedPublishDate)}
                    </span>
                  </div>

                  <div className="min-h-[60px] bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 flex flex-col justify-center">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      สถานะปัจจุบัน
                    </span>
                    <span className="font-bold text-slate-800 mt-0.5 block truncate">
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200/90 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-500 font-bold block">
                      ช่องทางเป้าหมายที่วางแผนไว้:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.targetChannels.length > 0 ? (
                        item.targetChannels.map((ch, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]"
                          >
                            {ch}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </div>

                  {item.status === 'PUBLISHED' && item.publishedUrl ? (
                    <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-indigo-600 shrink-0" />
                          เผยแพร่คอนเทนต์จริงเรียบร้อยแล้ว
                        </span>
                        <span className="text-[11px] text-indigo-700 font-semibold">
                          โพสต์เมื่อ {formatDateOnly(item.actualPublishDate)}
                        </span>
                      </div>
                      <p className="text-indigo-900 text-[11px]">
                        ช่องทาง: <strong>{item.actualChannel}</strong> • บันทึกโดย{' '}
                        <strong>{item.publishedByName || '-'}</strong>
                      </p>
                      <a
                        href={item.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors"
                      >
                        เปิดดูโพสต์จริงบนโซเชียลมีเดีย <ExternalLink size={13} />
                      </a>
                    </div>
                  ) : item.status !== 'APPROVED' && !permissions?.canApprove ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        คอนเทนต์นี้ยังอยู่ในสถานะ <strong>{item.status}</strong> ต้องได้รับการอนุมัติ (Approved) จากผู้จัดการการตลาดก่อนจึงจะบันทึกผลเผยแพร่ได้
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium flex items-start gap-2">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600 mt-0.5" />
                      <span>
                        พร้อมสำหรับบันทึกผลเผยแพร่จริง เมื่อนำสื่อและแคปชั่นไปโพสต์แล้ว กรุณากรอก URL โพสต์จริงในฟอร์มด้านขวาเพื่อปิดงาน
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 6 Cols: Mark as Published Form Card */}
              <div className="lg:col-span-6 h-full flex flex-col bg-slate-50/80 rounded-2xl p-4 border border-slate-200 gap-3">
                <div className="min-h-[28px] flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-red-600 shrink-0" />
                    <span>บันทึกหลักฐานการเผยแพร่จริง (Mark as Published)</span>
                  </h4>
                </div>

                <form
                  onSubmit={handleMarkPublished}
                  className="flex-1 bg-white p-4 rounded-xl border border-slate-200/90 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          ช่องทางที่เผยแพร่จริง <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={actualChannel}
                          onChange={e => setActualChannel(e.target.value)}
                          className="w-full h-11 px-3.5 bg-slate-50/60 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full h-11 px-3.5 bg-slate-50/60 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
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
                        className="w-full h-11 px-3.5 bg-slate-50/60 border border-slate-300 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isProcessing ||
                      (item.status !== 'APPROVED' &&
                        item.status !== 'PUBLISHED' &&
                        !permissions?.canApprove)
                    }
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
                  >
                    บันทึกผลการเผยแพร่จริง (Mark as Published)
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY & CANCEL — Matching Framed Card */}
          {activeTab === 'history' && (
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="min-h-[28px] flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <History size={16} className="text-red-600 shrink-0" />
                  <span>ประวัติการดำเนินการทั้งหมด ({item.logs.length} รายการ)</span>
                </h4>

                {canEditContent && item.status !== 'CANCELLED' && item.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCancelContent}
                    className="inline-flex items-center gap-1 px-3 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold text-xs transition-colors"
                  >
                    <Ban size={13} /> ยกเลิกคอนเทนต์นี้
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {item.logs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
                    <div className="sm:text-right text-[11px] text-slate-500 shrink-0">
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

      {/* Attachment Preview Lightbox (Image / PDF) */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {previewAttachment.fileName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {getCommentAttachmentKindLabel(
                    previewAttachment.fileName,
                    previewAttachment.mimeType
                  )}{' '}
                  • {formatAttachmentFileSize(previewAttachment.fileSize)} • แนบโดย{' '}
                  {previewAttachment.uploadedByName}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`${previewAttachment.fileUrl}?download=1`}
                  download={previewAttachment.fileName}
                  className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  <Download size={13} /> ดาวน์โหลด
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                  aria-label="ปิดหน้าต่างพรีวิวไฟล์"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center p-3 overflow-auto min-h-[300px]">
              {previewAttachment.fileType === 'IMAGE' ? (
                <img
                  src={previewAttachment.fileUrl}
                  alt={previewAttachment.fileName}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <iframe
                  src={previewAttachment.fileUrl}
                  title={previewAttachment.fileName}
                  className="w-full h-[75vh] rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}