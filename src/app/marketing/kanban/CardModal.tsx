import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, AlignLeft, CheckSquare, MessageSquare, Paperclip, Send, Loader2, AlertCircle, Plus, Trash2, Download, UploadCloud, FileArchive, Pencil, Check } from 'lucide-react';
import type { TKanbanCard, TKanbanList } from './KanbanBoardClient';
import { createClient } from '@/utils/supabase/client';
import { POSTING_CHANNELS, PostingChannel } from '@/lib/marketingChannels';
import JSZip from 'jszip';

type Props = {
  card: TKanbanCard;
  users: any[];
  lists: TKanbanList[];
  currentUser: any;
  onClose: () => void;
  onUpdate: (card: TKanbanCard) => void;
  onDeleteCard?: (cardId: string) => void;
};

export default function CardModal({ card, users, lists, currentUser, onClose, onUpdate, onDeleteCard }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [assignedToId, setAssignedToId] = useState(card.assignedToId || '');
  const [startDate, setStartDate] = useState(card.startDate ? new Date(card.startDate).toISOString().split('T')[0] : '');
  const [dueDate, setDueDate] = useState(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
  const [cardColor, setCardColor] = useState(card.color || '');
  const [engineeringReviewers, setEngineeringReviewers] = useState<string[]>(card.engineeringReviewers || []);
  const [salespersonId, setSalespersonId] = useState(card.salespersonId || '');
  const [scheduledPostDate, setScheduledPostDate] = useState(card.scheduledPostDate ? new Date(card.scheduledPostDate).toISOString().split('T')[0] : '');
  const [postingChannels, setPostingChannels] = useState<string[]>(card.postingChannels || []);

  const [checklist, setChecklist] = useState<any[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [hideCompletedChecklist, setHideCompletedChecklist] = useState(false);

  const [comments, setComments] = useState<any[]>(card.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<any | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number; fileName: string } | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgressMsg, setDownloadProgressMsg] = useState<string | null>(null);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  const [attachments, setAttachments] = useState<any[]>(card.attachments || []);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  const [serviceReviewerSearch, setServiceReviewerSearch] = useState('');
  const [isServiceReviewerOpen, setIsServiceReviewerOpen] = useState(false);
  const reviewerDropdownRef = useRef<HTMLDivElement>(null);

  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [isSalespersonOpen, setIsSalespersonOpen] = useState(false);
  const salespersonDropdownRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reviewerDropdownRef.current && !reviewerDropdownRef.current.contains(event.target as Node)) {
        setIsServiceReviewerOpen(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setIsAssigneeOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target as Node)) {
        setIsSalespersonOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = async (updates: Partial<TKanbanCard>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, ...updates })
      });
      const updated = await res.json();
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevisionRequest = async () => {
    setErrorMsg(null);
    if (!newComment && comments.length === 0) {
      setErrorMsg("กรุณาระบุเหตุผลการขอแก้ไขในกล่องความคิดเห็นก่อน");
      return;
    }

    if (newComment) {
      // Add comment first
      await handleAddComment();
    }

    // Find the "To Revise" list
    const reviseList = lists.find(l => l.name.toLowerCase().includes('revise'));
    if (!reviseList) {
      setErrorMsg("ไม่พบรายการ 'To Revise' บนกระดาน");
      return;
    }

    handleSave({
      revisionStatus: 'needs_revision',
      listId: reviseList.id
    });

    onClose();
  };

  const handleResubmit = async () => {
    setErrorMsg(null);
    // Find the "Review" list
    const reviewList = lists.find(l => l.name.toLowerCase().includes('review'));
    if (!reviewList) {
      setErrorMsg("ไม่พบรายการ 'Review' บนกระดาน");
      return;
    }

    handleSave({
      revisionStatus: 'pending_review',
      listId: reviewList.id
    });

    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isAddingComment) return;
    setIsAddingComment(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/marketing/kanban/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, message: newComment.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ส่งความคิดเห็นล้มเหลว');
      }
      const newComments = [data, ...comments];
      setComments(newComments);
      setNewComment('');
      onUpdate({ ...card, comments: newComments });
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'ส่งความคิดเห็นล้มเหลว');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleStartEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.message);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim() || isSavingCommentEdit) return;
    setIsSavingCommentEdit(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/marketing/kanban/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editingCommentText.trim() })
      });
      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || 'บันทึกการแก้ไขล้มเหลว');
      }
      const updatedComments = comments.map(c => c.id === commentId ? { ...c, message: editingCommentText.trim(), updatedAt: updated.updatedAt || new Date().toISOString() } : c);
      setComments(updatedComments);
      onUpdate({ ...card, comments: updatedComments });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (e: any) {
      console.error(e);
      setErrorMsg('แก้ไขความคิดเห็นล้มเหลว: ' + e.message);
    } finally {
      setIsSavingCommentEdit(false);
    }
  };

  const handleDeleteCommentClick = (e: React.MouseEvent, comment: any) => {
    e.preventDefault();
    e.stopPropagation();
    setCommentToDelete(comment);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete || isDeletingComment) return;
    setIsDeletingComment(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/marketing/kanban/comments/${commentToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ลบความคิดเห็นล้มเหลว');
      }
      const updatedComments = comments.filter(c => c.id !== commentToDelete.id);
      setComments(updatedComments);
      onUpdate({ ...card, comments: updatedComments });
      setCommentToDelete(null);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('ลบความคิดเห็นล้มเหลว: ' + e.message);
    } finally {
      setIsDeletingComment(false);
    }
  };

  const isVideoFile = (file: { name: string; type?: string }) => {
    if (file.type && file.type.startsWith('video/')) return true;
    return /\.(mp4|mov|m4v|avi|wmv|flv|mkv|webm)$/i.test(file.name);
  };

  const getFileMimeType = (file: File) => {
    if (file.type && file.type !== 'application/octet-stream') return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      m4v: 'video/mp4',
      avi: 'video/x-msvideo',
      wmv: 'video/x-ms-wmv',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      txt: 'text/plain',
    };
    return (ext && mimeMap[ext]) || file.type || 'application/octet-stream';
  };

  const isZipFile = (file: { name: string; type?: string }) => {
    if (file.type && (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.type === 'multipart/x-zip')) return true;
    return /\.zip$/i.test(file.name);
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    setErrorMsg(null);
    setUploadStatusMsg(null);
    setUploadProgress(null);

    // Step 1: Extract any ZIP archives in the browser
    let expandedFiles: File[] = [];
    let zipExtractedCount = 0;
    setIsUploading(true);

    try {
      for (const file of rawFiles) {
        if (isZipFile(file)) {
          setUploadStatusMsg(`กำลังแตกไฟล์ ZIP "${file.name}"...`);
          try {
            // Convert to ArrayBuffer for maximum stability across browsers
            const fileData = file instanceof File ? await file.arrayBuffer() : file;
            const zip = await JSZip.loadAsync(fileData);
            const entries = Object.values(zip.files);
            let localCount = 0;

            for (const entry of entries) {
              // Ignore directories and folders (including paths ending with '/')
              if (entry.dir || entry.name.endsWith('/')) continue;
              const baseName = entry.name.split('/').filter(Boolean).pop() || entry.name;
              // Skip hidden files, system files & macOS resource forks
              if (!baseName || baseName.startsWith('.') || entry.name.includes('__MACOSX') || baseName.toLowerCase() === 'thumbs.db') {
                continue;
              }

              // Workaround for JSZip upstream bug: "uncompressed data size mismatch"
              // Filters the strict header-length check that fails on streaming/Windows/Mac archives
              try {
                const proto = (entry as any)._data?.__proto__;
                if (proto && !proto.__patchedForSizeMismatch) {
                  proto.__patchedForSizeMismatch = true;
                  const origGetContentWorker = proto.getContentWorker;
                  proto.getContentWorker = function () {
                    const worker = origGetContentWorker.call(this);
                    if (worker?._listeners?.end) {
                      worker._listeners.end = worker._listeners.end.filter((fn: any) => {
                        const fnStr = fn ? fn.toString() : '';
                        return !fnStr.includes('uncompressed data size mismatch');
                      });
                    }
                    return worker;
                  };
                }
              } catch (patchErr) {
                console.warn('Could not patch JSZip worker:', patchErr);
              }

              try {
                const blob = await entry.async('blob');
                if (!blob || blob.size === 0) continue;
                const mimeType = getFileMimeType({ name: baseName, type: '' } as any);
                const extractedFile = new File([blob], baseName, { type: mimeType });
                expandedFiles.push(extractedFile);
                localCount++;
                zipExtractedCount++;
              } catch (entryErr: any) {
                console.warn(`Failed to extract entry "${entry.name}":`, entryErr);
              }
            }

            if (localCount === 0) {
              setErrorMsg(`ไม่พบไฟล์ที่รองรับในไฟล์ ZIP "${file.name}"`);
            }
          } catch (zipErr: any) {
            console.error('ZIP extraction error:', zipErr);
            setErrorMsg(`แตกไฟล์ ZIP "${file.name}" ล้มเหลว: ${zipErr.message || 'ไฟล์อาจชำรุด'}`);
          }
        } else {
          expandedFiles.push(file);
        }
      }
    } catch (e: any) {
      setErrorMsg(`เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${e.message}`);
      setIsUploading(false);
      return;
    }

    if (expandedFiles.length === 0) {
      setIsUploading(false);
      setUploadStatusMsg(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Step 2: Validate file size limits
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (Supabase Storage standard tier)
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB for images/docs

    const validFiles: File[] = [];
    const skippedFiles: { name: string; reason: string }[] = [];

    for (const file of expandedFiles) {
      const isVideo = isVideoFile(file);
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        const sizeMb = (file.size / 1024 / 1024).toFixed(1);
        skippedFiles.push({ name: file.name, reason: `วิดีโอ (${sizeMb}MB) เกิน 50MB` });
      } else if (!isVideo && file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / 1024 / 1024).toFixed(1);
        skippedFiles.push({ name: file.name, reason: `ไฟล์ (${sizeMb}MB) เกิน 15MB` });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setIsUploading(false);
      setUploadStatusMsg(null);
      const reasons = skippedFiles.map(s => `${s.name} (${s.reason})`).join(', ');
      setErrorMsg(`ไม่สามารถอัปโหลดได้: ${reasons}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (zipExtractedCount > 0) {
      setUploadStatusMsg(`แตกไฟล์ ZIP สำเร็จ: ${zipExtractedCount} ไฟล์ — กำลังเริ่มอัปโหลด...`);
    } else {
      setUploadStatusMsg(`กำลังเตรียมอัปโหลด ${validFiles.length} ไฟล์...`);
    }

    // Step 3: Batch Upload with controlled concurrency (2 workers)
    const supabase = createClient();
    const newlyAddedAttachments: any[] = [];
    const failedUploads: string[] = [];
    let completedCount = 0;
    const totalCount = validFiles.length;

    const uploadWorker = async (file: File) => {
      setUploadProgress({
        current: Math.min(completedCount + 1, totalCount),
        total: totalCount,
        percent: Math.round((completedCount / totalCount) * 100),
        fileName: file.name
      });

      const isVideo = isVideoFile(file);
      const mimeType = getFileMimeType(file);
      const fileExt = file.name.split('.').pop() || (isVideo ? 'mp4' : 'bin');
      const storageFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `kanban/${card.id}/${storageFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketing_assets')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('exceeded the maximum allowed size') || (uploadError as any).statusCode === '413') {
          throw new Error(`ขนาดไฟล์เกิน 50MB`);
        }
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('marketing_assets')
        .getPublicUrl(filePath);

      const res = await fetch('/api/marketing/kanban/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          fileName: file.name,
          fileUrl: urlData.publicUrl,
          fileType: mimeType,
          fileSize: file.size,
          attachmentType: isVideo ? 'video' : 'general'
        })
      });

      const attachment = await res.json();
      if (!res.ok) throw new Error(attachment.error || 'บันทึกข้อมูลไฟล์แนบล้มเหลว');

      newlyAddedAttachments.push(attachment);
      // Immediately update local attachments state so user sees cards dynamically
      setAttachments(prev => [...prev, attachment]);
      completedCount++;
      setUploadProgress({
        current: completedCount,
        total: totalCount,
        percent: Math.round((completedCount / totalCount) * 100),
        fileName: file.name
      });
    };

    const queue = [...validFiles];
    const concurrency = Math.min(2, queue.length);
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const nextFile = queue.shift();
        if (!nextFile) break;
        try {
          await uploadWorker(nextFile);
        } catch (err: any) {
          console.error(`Failed to upload ${nextFile.name}:`, err);
          failedUploads.push(`${nextFile.name} (${err.message || 'ล้มเหลว'})`);
          completedCount++;
          setUploadProgress({
            current: completedCount,
            total: totalCount,
            percent: Math.round((completedCount / totalCount) * 100),
            fileName: nextFile.name
          });
        }
      }
    });

    await Promise.all(workers);

    // Sync full attachments list with parent card & board
    if (newlyAddedAttachments.length > 0) {
      const finalAttachments = [...attachments, ...newlyAddedAttachments];
      setAttachments(finalAttachments);
      onUpdate({ ...card, attachments: finalAttachments });
    }

    setIsUploading(false);
    setUploadStatusMsg(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const allErrors = [
      ...skippedFiles.map(s => `${s.name}: ${s.reason}`),
      ...failedUploads
    ];
    if (allErrors.length > 0) {
      setErrorMsg(`อัปโหลดสำเร็จ ${newlyAddedAttachments.length} ไฟล์ | ไม่สามารถอัปโหลด: ${allErrors.join(', ')}`);
    }
  };

  const handleDownloadAll = async () => {
    if (attachments.length === 0 || isDownloadingAll) return;

    setIsDownloadingAll(true);
    setErrorMsg(null);
    setDownloadProgressMsg('กำลังเตรียมดาวน์โหลด...');

    try {
      const zip = new JSZip();
      const nameCountMap: Record<string, number> = {};
      const supabase = createClient();
      let downloadedCount = 0;

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        setDownloadProgressMsg(`กำลังดาวน์โหลดไฟล์ ${i + 1} จาก ${attachments.length} (${att.fileName})...`);

        let blob: Blob | null = null;

        // Try direct fetch
        try {
          const response = await fetch(att.fileUrl);
          if (response.ok) {
            blob = await response.blob();
          }
        } catch (fetchErr) {
          console.warn(`Direct fetch failed for ${att.fileName}, attempting Supabase download:`, fetchErr);
        }

        // Fallback to Supabase SDK download
        if (!blob) {
          try {
            const urlParts = att.fileUrl.split('/marketing_assets/');
            if (urlParts.length > 1) {
              const storagePath = decodeURIComponent(urlParts[1]);
              const { data, error } = await supabase.storage
                .from('marketing_assets')
                .download(storagePath);
              if (data && !error) {
                blob = data;
              }
            }
          } catch (sdkErr) {
            console.error(`Supabase download failed for ${att.fileName}:`, sdkErr);
          }
        }

        if (!blob) {
          console.warn(`Skipping unreadable attachment: ${att.fileName}`);
          continue;
        }

        // Ensure unique file name in ZIP
        let safeName = att.fileName || `file_${i + 1}`;
        if (nameCountMap[safeName] !== undefined) {
          nameCountMap[safeName]++;
          const dotIndex = safeName.lastIndexOf('.');
          if (dotIndex !== -1) {
            safeName = `${safeName.substring(0, dotIndex)} (${nameCountMap[safeName]})${safeName.substring(dotIndex)}`;
          } else {
            safeName = `${safeName} (${nameCountMap[safeName]})`;
          }
        } else {
          nameCountMap[safeName] = 0;
        }

        zip.file(safeName, blob);
        downloadedCount++;
      }

      if (downloadedCount === 0) {
        throw new Error('ไม่สามารถดาวน์โหลดไฟล์ใดๆ ได้ กรุณาลองใหม่อีกครั้ง');
      }

      setDownloadProgressMsg('กำลังบีบอัดไฟล์ ZIP...');
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
          setDownloadProgressMsg(`กำลังบีบอัดไฟล์ ZIP ${Math.round(metadata.percent)}%...`);
        }
      );

      const cleanTitle = (card.title || 'attachments')
        .replace(/[\\/:*?"<>|]/g, '_')
        .trim()
        .substring(0, 50);
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${cleanTitle || 'attachments'}_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Download all error:', err);
      setErrorMsg('ดาวน์โหลดไฟล์ทั้งหมดล้มเหลว: ' + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgressMsg(null);
    }
  };

  const handleDownloadSingle = async (e: React.MouseEvent, att: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(att.fileUrl);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(att.fileUrl, '_blank');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteAttachment = (e: React.MouseEvent, attachment: any) => {
    e.preventDefault();
    e.stopPropagation();
    setAttachmentToDelete(attachment);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/marketing/kanban/attachments/${attachmentToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      const updatedAttachments = attachments.filter(att => att.id !== attachmentToDelete.id);
      setAttachments(updatedAttachments);
      onUpdate({ ...card, attachments: updatedAttachments });
      setAttachmentToDelete(null);
    } catch (e: any) {
      setErrorMsg("ลบไฟล์ล้มเหลว: " + e.message);
      setAttachmentToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteCard = async () => {
    setIsDeletingCard(true);
    try {
      const res = await fetch(`/api/marketing/kanban/cards/${card.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleteCard) onDeleteCard(card.id);
        onClose();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete card');
      }
    } catch (e: any) {
      setErrorMsg("ลบการ์ดล้มเหลว: " + e.message);
      setIsDeletingCard(false);
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newList = [...checklist, { id: Date.now().toString(), title: newChecklistItem.trim(), completed: false }];
    setChecklist(newList);
    setNewChecklistItem('');
    handleSave({ checklist: newList });
  };

  const toggleChecklist = (id: string) => {
    const newList = checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
    setChecklist(newList);
    handleSave({ checklist: newList });
  };

  const deleteChecklistItem = (id: string) => {
    const newList = checklist.filter(item => item.id !== id);
    setChecklist(newList);
    handleSave({ checklist: newList });
  };

  const listName = lists.find(l => l.id === card.listId)?.name || 'รายการที่ไม่รู้จัก';
  const filteredMentionUsers = users.filter(u => u.fullName?.toLowerCase().includes(mentionFilter));

  const renderCommentText = (text: string) => {
    if (!text) return null;

    const renderWithUrls = (str: string, keyPrefix: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = str.split(urlRegex);
      return parts.map((part, idx) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={`${keyPrefix}-${idx}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline break-all inline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={`${keyPrefix}-${idx}`} className="whitespace-pre-wrap">{part}</span>;
      });
    };

    if (!users || users.length === 0) return renderWithUrls(text, 'plain');

    const sortedUsers = [...users].filter(u => u.fullName).sort((a, b) => b.fullName.length - a.fullName.length);
    const namesRegexStr = sortedUsers.map(u => u.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    if (!namesRegexStr) return renderWithUrls(text, 'plain');

    const mentionRegex = new RegExp(`@(${namesRegexStr})`, 'g');
    const parts = text.split(mentionRegex);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-semibold text-xs mx-0.5 inline-block">@{part}</span>;
      }
      return renderWithUrls(part, `m-${i}`);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div className="flex-1 mr-2 md:mr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== card.title && handleSave({ title })}
              className="font-bold text-2xl text-gray-900 w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-red-100 rounded-lg px-2 py-1 -ml-2"
            />
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              ในรายการ <span className="font-semibold text-gray-700 underline underline-offset-2">{listName}</span>
              {card.revisionStatus === 'needs_revision' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">ต้องแก้ไข</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => {
                handleSave({ title, description, assignedToId, engineeringReviewers, startDate, dueDate, color: cardColor, salespersonId });
                onClose();
              }}
              className="flex items-center gap-2 bg-[#ff2301] hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              <CheckSquare size={16} />
              บันทึก (Save)
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8">

          {/* Main Column */}
          <div className="flex-1 flex flex-col gap-6 md:gap-8 pb-12 order-2 md:order-1">

            {/* Description */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <AlignLeft size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">รายละเอียด (Description)</h3>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== card.description && handleSave({ description })}
                placeholder="เพิ่มรายละเอียด..."
                className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border-2 border-transparent focus:border-red-200 outline-none rounded-xl p-4 text-sm text-gray-700 min-h-[120px] transition-colors resize-y"
              />
            </section>

            {/* Checklist */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <CheckSquare size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">รายการตรวจสอบ (Checklist)</h3>
              </div>

              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${checklist.length ? (checklist.filter(i => i.completed).length / checklist.length) * 100 : 0}%` }}
                />
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {checklist.filter(item => !item.completed).map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklist(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm flex-1 text-gray-700 font-medium">
                      {item.title}
                    </span>
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                      title="ลบรายการ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {checklist.filter(i => i.completed).length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setHideCompletedChecklist(!hideCompletedChecklist)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {hideCompletedChecklist ? `Show ${checklist.filter(i => i.completed).length} completed tasks` : 'Hide completed tasks'}
                    </button>

                    {!hideCompletedChecklist && (
                      <div className="flex flex-col gap-2 mt-3 pl-1">
                        {checklist.filter(item => item.completed).map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-3 group">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleChecklist(item.id)}
                              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <span className="text-sm flex-1 line-through text-gray-400">
                              {item.title}
                            </span>
                            <button
                              onClick={() => deleteChecklistItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                              title="ลบรายการ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  placeholder="เพิ่มรายการ..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
                />
                <button
                  onClick={addChecklistItem}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 rounded-lg text-sm transition-colors"
                >
                  เพิ่ม
                </button>
              </div>
            </section>

            {/* Attachments */}
            <section
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDragOverDropzone(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverDropzone(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processFiles(e.dataTransfer.files);
                }
              }}
              className={`transition-all duration-200 rounded-2xl p-3 -m-3 ${isDragOverDropzone ? 'bg-red-50/70 border-2 border-dashed border-red-400 ring-4 ring-red-100' : ''
                }`}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Paperclip size={20} className="text-gray-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800">ไฟล์แนบ (Attachments)</h3>
                      {attachments.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                          {attachments.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      รองรับภาพ/เอกสาร (สูงสุด 15MB), วิดีโอ (สูงสุด 50MB) และไฟล์ .ZIP (แตกไฟล์อัตโนมัติ)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {attachments.length > 0 && (
                    <button
                      onClick={handleDownloadAll}
                      disabled={isDownloadingAll || isUploading}
                      className="bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      title="ดาวน์โหลดไฟล์ทั้งหมดเป็นไฟล์ ZIP"
                    >
                      {isDownloadingAll ? (
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                      ) : (
                        <Download size={16} className="text-blue-600" />
                      )}
                      <span>ดาวน์โหลดทั้งหมด (ZIP)</span>
                    </button>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isDownloadingAll}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin text-[#ff2301]" /> : <Plus size={16} />}
                    <span>แนบไฟล์</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,application/zip,application/x-zip-compressed"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              {/* Download All Progress banner */}
              {downloadProgressMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-semibold mb-3 flex items-center gap-2.5 animate-in fade-in">
                  <Loader2 size={16} className="animate-spin shrink-0 text-blue-600" />
                  <span>{downloadProgressMsg}</span>
                </div>
              )}

              {/* Batch Upload Progress banner */}
              {uploadProgress && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-sm mb-3 animate-in fade-in">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5 truncate mr-2">
                      <Loader2 size={14} className="animate-spin shrink-0 text-[#ff2301]" />
                      <span>กำลังอัปโหลด ({uploadProgress.current}/{uploadProgress.total}): {uploadProgress.fileName}</span>
                    </span>
                    <span className="text-[#ff2301] font-bold shrink-0">{uploadProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#ff2301] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadStatusMsg && !uploadProgress && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-semibold mb-3 flex items-center gap-2 animate-in fade-in">
                  <Loader2 size={16} className="animate-spin shrink-0 text-blue-600" />
                  <span>{uploadStatusMsg}</span>
                </div>
              )}

              {/* Drag over dropzone hint */}
              {isDragOverDropzone && (
                <div className="p-4 mb-3 bg-red-50 border-2 border-dashed border-red-400 rounded-xl text-center text-red-700 text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in">
                  <UploadCloud size={20} className="animate-bounce text-[#ff2301]" />
                  <span>ปล่อยไฟล์ตรงนี้เพื่ออัปโหลดทันที (หรือแตกไฟล์ ZIP อัตโนมัติ)</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-bold mb-3 flex items-start gap-2 shadow-sm animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-tight flex-1">{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachments.map(att => {
                  const isVideo = att.fileType?.startsWith('video/') || att.attachmentType === 'video' || /\.(mp4|mov|m4v|avi|wmv|flv|mkv|webm)$/i.test(att.fileName || '');

                  return (
                    <div key={att.id} className={`relative group ${isVideo ? 'col-span-1 sm:col-span-2' : ''}`}>
                      {isVideo ? (
                        <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50 relative">
                          <video controls className="w-full rounded-lg max-h-64 bg-black" src={att.fileUrl}>
                            <track kind="captions" />
                          </video>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-bold text-gray-800 truncate mr-2">{att.fileName}</span>
                            <span className="text-xs text-gray-500 shrink-0">{((att.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      ) : (
                        <a href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors h-full">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                            {att.fileType?.includes('image') ? (
                              <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                            ) : (
                              <Paperclip size={20} />
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-gray-800 truncate">{att.fileName}</span>
                            <span className="text-xs text-gray-500">{((att.fileSize || 0) / 1024).toFixed(1)} KB</span>
                          </div>
                        </a>
                      )}

                      {/* Action buttons on hover */}
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          onClick={(e) => handleDownloadSingle(e, att)}
                          className="bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 p-1.5 rounded-full shadow-md transition-all"
                          title="ดาวน์โหลดไฟล์นี้"
                        >
                          <Download size={14} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAttachment(e, att)}
                          className="bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 p-1.5 rounded-full shadow-md transition-all"
                          title="ลบไฟล์แนบ"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Activity & Comments */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <MessageSquare size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">กิจกรรม (Activity)</h3>
              </div>

              <div className="flex flex-col gap-5 mb-8">
                {comments.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-2">ยังไม่มีความคิดเห็น</div>
                ) : (
                  comments.map(comment => {
                    const author = users.find(u => u.id === comment.userId);
                    const isEditing = editingCommentId === comment.id;
                    const isEdited = comment.updatedAt && new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() + 2000;

                    return (
                      <div key={comment.id} className="flex gap-3 group/comment relative">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 font-bold flex items-center justify-center flex-shrink-0 uppercase text-xs mt-0.5">
                          {author?.fullName?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-sm">{author?.fullName || 'ผู้ใช้ที่ไม่รู้จัก'}</span>
                              <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString('th-TH')}</span>
                              {isEdited && (
                                <span className="text-[11px] text-gray-400 font-normal italic">(แก้ไขแล้ว)</span>
                              )}
                            </div>

                            {/* Action Buttons: Edit / Delete */}
                            {!isEditing && (
                              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditComment(comment)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="แก้ไขข้อความ"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCommentClick(e, comment)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="ลบความคิดเห็น"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="bg-white border-2 border-red-300 rounded-xl p-3 shadow-sm space-y-2 mt-1">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={3}
                                className="w-full text-sm outline-none resize-y text-gray-800 focus:ring-0"
                                placeholder="แก้ไขความคิดเห็น..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={handleCancelEditComment}
                                  disabled={isSavingCommentEdit}
                                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditComment(comment.id)}
                                  disabled={isSavingCommentEdit || !editingCommentText.trim()}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#ff2301] hover:bg-red-600 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                >
                                  {isSavingCommentEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                  <span>บันทึก</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-100 shadow-sm px-4 py-3 rounded-tr-2xl rounded-b-2xl text-sm text-gray-700 inline-block min-w-[200px] max-w-full break-words">
                              {renderCommentText(comment.message)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment Input Box */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center flex-shrink-0 uppercase">
                  {currentUser?.fullName?.[0] || 'U'}
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-visible relative focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-sm">
                  <textarea
                    value={newComment}
                    disabled={isAddingComment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewComment(val);
                      const lastWordMatch = val.match(/@([\w\u0E00-\u0E7F]*)$/);
                      if (lastWordMatch) {
                        setShowMentions(true);
                        setMentionFilter(lastWordMatch[1].toLowerCase());
                      } else {
                        setShowMentions(false);
                      }
                    }}
                    placeholder="เขียนความคิดเห็นใหม่ที่นี่ (พิมพ์ @ เพื่อกล่าวถึง)..."
                    className="w-full p-4 text-sm outline-none resize-none min-h-[100px] rounded-t-xl disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />

                  {showMentions && filteredMentionUsers.length > 0 && (
                    <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50">
                      <div className="p-2 text-xs font-bold text-gray-500 bg-gray-50 border-b border-gray-100">
                        กล่าวถึงผู้ใช้ (Mention)
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredMentionUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              const newValue = newComment.replace(/@([\w\u0E00-\u0E7F]*)$/, `@${u.fullName} `);
                              setNewComment(newValue);
                              setShowMentions(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full bg-red-100 text-[#ff2301] flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                              {u.fullName?.[0] || '?'}
                            </div>
                            <span className="truncate">{u.fullName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-100 rounded-b-xl">
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={isAddingComment || !newComment.trim()}
                      className="bg-[#ff2301] hover:bg-red-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingComment ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> บันทึกความคิดเห็น...
                        </>
                      ) : (
                        <>
                          <Send size={14} /> บันทึกความคิดเห็น
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-8"></div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full md:w-48 flex-shrink-0 flex flex-col gap-4 md:gap-6 order-1 md:order-2 bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-gray-100 md:border-none">

            <div className="flex flex-col gap-2" ref={assigneeDropdownRef}>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้รับผิดชอบ</span>

              <div className="relative">
                <div
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus-within:ring-2 focus-within:ring-red-100 flex items-center justify-between cursor-text"
                  onClick={() => setIsAssigneeOpen(true)}
                >
                  {isAssigneeOpen ? (
                    <input
                      type="text"
                      autoFocus
                      className="w-full bg-transparent outline-none"
                      placeholder="ค้นหาชื่อหรือชื่อเล่น..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                    />
                  ) : (
                    <div className="w-full text-gray-700 truncate">
                      {(() => {
                        const selectedUser = users.find(u => u.id === assignedToId);
                        return selectedUser
                          ? `${selectedUser.fullName} ${selectedUser.role ? `(${selectedUser.role})` : ''}`
                          : 'ไม่ได้มอบหมาย (คลิกเพื่อค้นหา)';
                      })()}
                    </div>
                  )}
                  {assignedToId && !isAssigneeOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignedToId('');
                        handleSave({ assignedToId: null as any });
                      }}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isAssigneeOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${!assignedToId ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'}`}
                      onClick={() => {
                        setAssignedToId('');
                        handleSave({ assignedToId: null as any });
                        setIsAssigneeOpen(false);
                        setAssigneeSearch('');
                      }}
                    >
                      ไม่ได้มอบหมาย
                    </div>
                    {(() => {
                      const filteredAssignees = users.filter(u =>
                        u.fullName.toLowerCase().includes(assigneeSearch.toLowerCase())
                      );

                      return filteredAssignees.length > 0 ? (
                        filteredAssignees.map(u => (
                          <div
                            key={u.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${assignedToId === u.id ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'}`}
                            onClick={() => {
                              setAssignedToId(u.id);
                              handleSave({ assignedToId: u.id });
                              setIsAssigneeOpen(false);
                              setAssigneeSearch('');
                            }}
                          >
                            {u.fullName} {u.role ? `(${u.role})` : ''}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          ไม่พบผู้ใช้ที่ค้นหา
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2" ref={reviewerDropdownRef}>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Service Reviewers (วิศวกรบริการ)</span>

              <div className="relative">
                <div
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus-within:ring-2 focus-within:ring-red-100 flex items-center justify-between cursor-text"
                  onClick={() => setIsServiceReviewerOpen(true)}
                >
                  {isServiceReviewerOpen ? (
                    <input
                      type="text"
                      autoFocus
                      className="w-full bg-transparent outline-none"
                      placeholder="ค้นหาชื่อหรือชื่อเล่น..."
                      value={serviceReviewerSearch}
                      onChange={(e) => setServiceReviewerSearch(e.target.value)}
                    />
                  ) : (
                    <div className="w-full text-gray-700 truncate">
                      {(() => {
                        const eligibleReviewers = users.filter(u => ['SERVICE', 'SERVICE_ENGINEER', 'SERVICE_MGR', 'บริการ', 'PROJECT', 'โปรเจค', 'โปรเจกต์'].some(r => (u.role || '').toUpperCase().includes(r)));
                        const selectedReviewer = eligibleReviewers.find(u => u.id === engineeringReviewers[0]);
                        return selectedReviewer
                          ? `${selectedReviewer.fullName} ${selectedReviewer.role ? `(${selectedReviewer.role})` : ''}`
                          : 'ไม่ได้มอบหมาย (คลิกเพื่อค้นหา)';
                      })()}
                    </div>
                  )}
                  {engineeringReviewers[0] && !isServiceReviewerOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEngineeringReviewers([]);
                        handleSave({ engineeringReviewers: [] });
                      }}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isServiceReviewerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${!engineeringReviewers[0] ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'}`}
                      onClick={() => {
                        setEngineeringReviewers([]);
                        handleSave({ engineeringReviewers: [] });
                        setIsServiceReviewerOpen(false);
                        setServiceReviewerSearch('');
                      }}
                    >
                      ไม่ได้มอบหมาย
                    </div>
                    {(() => {
                      const eligibleReviewers = users.filter(u => ['SERVICE', 'SERVICE_ENGINEER', 'SERVICE_MGR', 'บริการ', 'PROJECT', 'โปรเจค', 'โปรเจกต์'].some(r => (u.role || '').toUpperCase().includes(r)));
                      const filteredReviewers = eligibleReviewers.filter(u =>
                        u.fullName.toLowerCase().includes(serviceReviewerSearch.toLowerCase())
                      );

                      return filteredReviewers.length > 0 ? (
                        filteredReviewers.map(u => (
                          <div
                            key={u.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${engineeringReviewers[0] === u.id ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'}`}
                            onClick={() => {
                              setEngineeringReviewers([u.id]);
                              handleSave({ engineeringReviewers: [u.id] });
                              setIsServiceReviewerOpen(false);
                              setServiceReviewerSearch('');
                            }}
                          >
                            {u.fullName} {u.role ? `(${u.role})` : ''}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          ไม่พบผู้ใช้ที่ค้นหา
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2" ref={salespersonDropdownRef}>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">เซลส์ (Salesperson)</span>

              <div className="relative">
                <div
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus-within:ring-2 focus-within:ring-red-100 flex items-center justify-between cursor-text"
                  onClick={() => setIsSalespersonOpen(true)}
                >
                  {isSalespersonOpen ? (
                    <input
                      type="text"
                      autoFocus
                      className="w-full bg-transparent outline-none"
                      placeholder="ค้นหาชื่อหรือชื่อเล่น..."
                      value={salespersonSearch}
                      onChange={(e) => setSalespersonSearch(e.target.value)}
                    />
                  ) : (
                    <div className="w-full text-gray-700 truncate">
                      {(() => {
                        const eligibleSales = users.filter(u => ['SALES', 'SALE', 'เซลส์', 'ขาย'].some(r => (u.role || '').toUpperCase().includes(r)));
                        const selectedSales = eligibleSales.find(u => u.id === salespersonId);
                        return selectedSales
                          ? `${selectedSales.fullName} ${selectedSales.role ? `(${selectedSales.role})` : ''}`
                          : 'ไม่ได้มอบหมาย (คลิกเพื่อค้นหา)';
                      })()}
                    </div>
                  )}
                  {salespersonId && !isSalespersonOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSalespersonId('');
                        handleSave({ salespersonId: null as any });
                      }}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isSalespersonOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${!salespersonId ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'}`}
                      onClick={() => {
                        setSalespersonId('');
                        handleSave({ salespersonId: null as any });
                        setIsSalespersonOpen(false);
                        setSalespersonSearch('');
                      }}
                    >
                      ไม่ได้มอบหมาย
                    </div>
                    {(() => {
                      const eligibleSales = users.filter(u => ['SALES', 'SALE', 'เซลส์', 'ขาย'].some(r => (u.role || '').toUpperCase().includes(r)));
                      const filteredSales = eligibleSales.filter(u =>
                        u.fullName.toLowerCase().includes(salespersonSearch.toLowerCase())
                      );

                      return filteredSales.length > 0 ? (
                        filteredSales.map(u => (
                          <div
                            key={u.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${salespersonId === u.id ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'}`}
                            onClick={() => {
                              setSalespersonId(u.id);
                              handleSave({ salespersonId: u.id });
                              setIsSalespersonOpen(false);
                              setSalespersonSearch('');
                            }}
                          >
                            {u.fullName} {u.role ? `(${u.role})` : ''}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          ไม่พบผู้ใช้ที่ค้นหา
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">วันโพสต์ (Scheduled Post Date)</span>
              <input
                type="date"
                value={scheduledPostDate}
                onChange={(e) => {
                  setScheduledPostDate(e.target.value);
                  handleSave({ scheduledPostDate: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ช่องทางการโพสต์ (Posting Channels)</span>
              <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {POSTING_CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={postingChannels.includes(channel)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const newChannels = isChecked
                          ? [...postingChannels, channel]
                          : postingChannels.filter(c => c !== channel);
                        setPostingChannels(newChannels);
                        handleSave({ postingChannels: newChannels });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{channel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">วันเริ่มงาน (Start Date)</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleSave({ startDate: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">วันครบกำหนด (End Date)</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSave({ dueDate: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">สีของการ์ด</span>
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  onClick={() => {
                    setCardColor('');
                    handleSave({ color: null });
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${!cardColor ? 'border-gray-900 bg-gray-100' : 'border-gray-200 bg-gray-50 hover:bg-gray-200'} transition-all flex items-center justify-center`}
                  title="ไม่มีสี (None)"
                >
                  {!cardColor && <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />}
                </button>
                {[
                  { name: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
                  { name: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
                  { name: 'yellow', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
                  { name: 'green', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
                  { name: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
                  { name: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
                  { name: 'gray', bg: 'bg-gray-500', hover: 'hover:bg-gray-600' },
                ].map(colorObj => (
                  <button
                    key={colorObj.name}
                    onClick={() => {
                      setCardColor(colorObj.bg);
                      handleSave({ color: colorObj.bg });
                    }}
                    className={`w-6 h-6 rounded-full ${colorObj.bg} ${colorObj.hover} transition-all border-2 ${cardColor === colorObj.bg ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    title={colorObj.name}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-200 w-full my-2" />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">การกระทำ</span>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-bold mb-1 flex items-start gap-2 shadow-sm animate-in fade-in zoom-in-95">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-tight">{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleRevisionRequest}
                className="w-full flex items-center justify-start gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <AlertCircle size={16} />
                ขอให้แก้ไข (Request Revision)
              </button>

              <button
                onClick={handleResubmit}
                className="w-full flex items-center justify-start gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <CheckSquare size={16} />
                ส่งงานอีกครั้ง (Resubmit)
              </button>
            </div>

            <div className="h-px bg-gray-200 w-full my-4" />

            <button
              onClick={() => setIsDeletingCard(true)}
              className="w-full flex items-center justify-start gap-2 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Trash2 size={16} className="text-red-500" />
              ลบการ์ด (Delete Card)
            </button>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบไฟล์แนบ (Delete Attachment)</h3>
            <p className="text-sm text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ <span className="font-semibold text-gray-900">"{attachmentToDelete.fileName}"</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setAttachmentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={confirmDeleteAttachment}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} ลบไฟล์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {commentToDelete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบความคิดเห็น (Delete Comment)</h3>
            <p className="text-xs text-gray-500 mb-3">
              คุณแน่ใจหรือไม่ว่าต้องการลบความคิดเห็นนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="text-xs text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-xl mb-6 max-h-28 overflow-y-auto break-words italic">
              "{commentToDelete.message}"
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                disabled={isDeletingComment}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={confirmDeleteComment}
                disabled={isDeletingComment}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingComment ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} ลบความคิดเห็น
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation Modal */}
      {isDeletingCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบการ์ด (Delete Card)</h3>
            <p className="text-sm text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบการ์ดนี้? การกระทำนี้ไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsDeletingCard(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={confirmDeleteCard}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> ลบการ์ด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
